import * as THREE from 'three';
import { toonMaterial, toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { furnitureModel } from './interior.js';

/**
 * 친구 집 · 하치와레 동굴 안(3단계). 집주인이 안에 있을 때만(낮잠 · 밤잠) 들어갈 수 있다.
 * shell: dome(하얀 돔 집) · house(박공지붕 집: 앞이 트인 네모 방) · cave(바위 동굴). items: [가구 id, x, z, 돌린 칸(0~3)].
 * prop: 집주인마다 다른 물건(마시던 머그 · 풀 다발 · 술병과 화로 · 거울 · 수련 인형 · 나뭇잎 침대).
 * 걷기 · 행동 안내는 내 집(interior.js)과 같다: 집주인 옆이면 '말 걸기', 문간이면 '나가기'.
 * act: 그 집에서만 할 수 있는 놀이 자리 [x, z, 닿는 거리, 글] — 침대에서 같이 낮잠 · 풀 다발 정리 · 화로 구이 · 거울 · 짚 인형 수련 · 악보대 노래.
 */
const ROOMS = {
  chiikawa: { shell: 'dome', wall: '#fbfaf5', floor: '#e8c9a0', items: [['bed', -1.6, -1.7, 0], ['cushion', 0.5, -0.6, 0], ['plant', 2.1, -1.8, 0], ['table', 1.0, -1.5, 0]], prop: 'mug', host: [-0.4, -0.7], act: [-1.6, -1.7, 1.35, '같이 낮잠 자기'] },
  usagi: { shell: 'house', wall: '#fbe6a6', floor: '#d9b07a', items: [['bed', -2.0, -1.7, 0], ['rug', 0.3, 0.2, 0], ['shelf', 2.0, -2.0, 0]], prop: 'grass', host: [0.4, -0.8], act: [-0.05, -2.1, 1.3, '풀 다발 정리하기'] },
  kurimanju: { shell: 'house', wall: '#f3d6b0', floor: '#c99a6a', items: [['table', 0.2, -1.0, 0], ['stove', -2.1, -2.0, 0], ['shelf', 2.1, -2.0, 0], ['rug', 0.2, 0.7, 0], ['bed', 2.2, -0.2, 3]], prop: 'bottles', host: [-0.9, -0.6], act: [-1.2, 0.6, 1.1, '안주 구워 먹기'] },
  momonga: { shell: 'house', wall: '#dcecf8', floor: '#e2c6a8', items: [['bed', -2.0, -1.7, 0], ['lamp', -0.6, -2.1, 0], ['rug', 0.6, 0.3, 0], ['cushion', 1.6, -1.2, 0]], prop: 'mirror', host: [0.2, -0.9], act: [2.4, -2.6, 1.25, '거울 보며 꾸미기'] },
  rakko: { shell: 'house', wall: '#e9dcc6', floor: '#b98c5e', items: [['shelf', -2.1, -2.1, 0], ['table', 1.7, -1.8, 0], ['bed', -2.2, -0.2, 1], ['rug', 0.4, 0.4, 0]], prop: 'dojo', host: [0.4, -1.0], act: [1.8, 0.2, 1.1, '같이 수련하기'] },
  hachiware: { shell: 'cave', wall: '#7a6f64', floor: '#9b8c7c', items: [['lamp', 1.9, -1.6, 0], ['cushion', 0.8, 0.2, 0]], prop: 'leafbed', host: [-0.2, -0.9], act: [1.0, -1.6, 1.05, '같이 노래하기'] }
};
const WALKABLE = new Set(['rug', 'cushion']);
export const ROOM_OWNERS = Object.keys(ROOMS);

export function createRooms() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c4a5, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
  sun.position.set(2, 7, 5);
  scene.add(sun);
  const room = new THREE.Group();
  scene.add(room);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 7.4, 8.6);
  camera.lookAt(0, 0.6, -0.5);
  const cue = new THREE.Mesh(new THREE.RingGeometry(0.74, 1, 40), new THREE.MeshBasicMaterial({ color: 0xfcd95b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  cue.rotation.x = -Math.PI / 2;
  cue.visible = false;
  scene.add(cue);

  let me = null, host = null, spec = null, obst = [], door = { x: 0, z: 2.6 }, hostAt = { x: 0, z: 0 };
  const pos = { x: 0, z: 2 };
  let yaw = Math.PI, phase = 0, moving = false;
  // 잠깐 하는 몸짓(휘두르기 · 춤 · 만세): { mode, t, dur }
  let mePose = null, hostPose = null;
  const add = (o, x = 0, z = 0) => { o.position.x += x; o.position.z += z; room.add(o); return o; };
  const mesh = (geo, c, o) => add(toonMesh(geo, c, { shadow: false, ...o }));

  function shell(s) {
    if (s.shell === 'house') {
      scene.background = new THREE.Color('#f3e2c8');
      mesh(GEO.box, s.floor, { position: [0, -0.1, 0], scale: [7.2, 0.2, 6], receive: true, shell: true, outline: 0.03 });
      mesh(GEO.box, s.wall, { position: [0, 1.6, -3.05], scale: [7.2, 3.2, 0.12], shell: true, outline: 0.03 });
      [-1, 1].forEach((k) => mesh(GEO.box, s.wall, { position: [k * 3.62, 1.6, -0.1], scale: [0.12, 3.2, 6], shell: true, outline: 0.03 }));
      // 뒷벽 창(밖이 보이는 하늘색)과 걸레받이
      mesh(GEO.box, '#c6e7f5', { position: [-0.9, 1.9, -2.98], scale: [1.1, 0.9, 0.04], shell: true, outline: 0.02 });
      mesh(GEO.box, '#3a3236', { position: [-0.9, 1.9, -2.95], scale: [0.05, 0.86, 0.02], outline: false });
      mesh(GEO.box, '#3a3236', { position: [-0.9, 1.9, -2.95], scale: [1.06, 0.05, 0.02], outline: false });
      mesh(GEO.box, '#b08a62', { position: [0, 0.08, -2.97], scale: [7.1, 0.16, 0.04], outline: false });
      return { kind: 'rect', hx: 3.05, z0: -2.45, z1: 2.55, door: { x: 0, z: 2.55 } };
    }
    if (s.shell === 'cave') {
      scene.background = new THREE.Color('#3d342d');
      mesh(GEO.cylinder, s.floor, { position: [0, -0.1, 0], scale: [4.2, 0.1, 4.2], receive: true, outline: 0.04 });
      const wall = toonMesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), s.wall, { scale: [4.3, 3.2, 4.3], outline: false });
      wall.material = wall.material.clone();
      wall.material.side = THREE.BackSide;
      room.add(wall);
      // 울퉁불퉁한 바위 · 바닥 돌 · 천장에 빛나는 버섯
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI, r = 3.7;
        mesh(GEO.sphere, i % 2 ? '#8f8174' : '#6f665c', { position: [Math.cos(a) * r, 0.2, Math.sin(a) * r * 0.9], scale: [0.8, 0.7 + (i % 3) * 0.25, 0.7], outline: 0.04 });
      }
      const glow = toonMaterial('#9fe0ff', { unique: true });
      glow.emissive.setRGB(0.35, 0.7, 0.9);
      [[-2.4, -2.2], [2.6, -1.4], [-2.9, 0.4]].forEach(([x, z]) => {
        mesh(GEO.cylinder, '#f3eedf', { position: [x, 0, z], scale: [0.05, 0.25, 0.05], outline: 0.015 });
        add(toonMesh(GEO.sphere, null, { material: glow, position: [x, 0.28, z], scale: [0.17, 0.1, 0.17], outline: 0.015, shadow: false }));
      });
      return { kind: 'circle', r: 3.6, door: { x: 0, z: 3.0 } };
    }
    // dome
    scene.background = new THREE.Color('#f3e2c8');
    mesh(GEO.cylinder, s.floor, { position: [0, -0.1, 0], scale: [4.0, 0.1, 4.0], receive: true, outline: 0.04 });
    const wall = toonMesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), s.wall, { scale: [4.0, 3.6, 4.0], outline: false });
    wall.material = wall.material.clone();
    wall.material.side = THREE.BackSide;
    room.add(wall);
    const win = new THREE.Group();
    win.position.set(1.5, 2.0, -3.2);
    win.rotation.y = -0.45;
    win.add(toonMesh(GEO.box, '#c6e7f5', { scale: [0.8, 0.8, 0.05], shell: true, outline: 0.03 }));
    win.add(toonMesh(GEO.box, '#3a3236', { position: [0, 0, 0.03], scale: [0.06, 0.76, 0.03], outline: false }));
    win.add(toonMesh(GEO.box, '#3a3236', { position: [0, 0, 0.03], scale: [0.76, 0.06, 0.03], outline: false }));
    room.add(win);
    return { kind: 'circle', r: 3.45, door: { x: 0, z: 2.8 } };
  }

  /** 집주인마다 다른 물건. 막히는 자리를 돌려준다. */
  function prop(p) {
    const out = [];
    if (p === 'mug') {
      mesh(GEO.cylinder, '#ffb7cf', { position: [1.1, 0.57, -1.4], scale: [0.08, 0.12, 0.08], outline: 0.01 });
    } else if (p === 'grass') {
      // 뽑아 온 풀 다발이 수북이
      for (let i = 0; i < 7; i++) mesh(GEO.cone, i % 2 ? '#6fbf5a' : '#8fd16a', { position: [-0.4 + (i % 4) * 0.25, 0, -2.2 + Math.floor(i / 4) * 0.2], rotation: [0.3, i, 0], scale: [0.12, 0.6, 0.12], outline: 0.02 });
      mesh(GEO.cylinder, '#c49a6c', { position: [1.0, 0.02, -0.9], rotation: [0, 0, 1.4], scale: [0.04, 1.0, 0.04], outline: 0.015 });
      out.push({ x: -0.05, z: -2.1, r: 0.6 });
    } else if (p === 'bottles') {
      ['#7fbf8f', '#b8743d', '#e3c47a'].forEach((c, i) => {
        mesh(GEO.cylinder, c, { position: [0.0 + i * 0.16, 0.57, -1.05], scale: [0.05, 0.22, 0.05], outline: 0.01 });
        mesh(GEO.cylinder, c, { position: [0.0 + i * 0.16, 0.79, -1.05], scale: [0.02, 0.07, 0.02], outline: 0.008 });
      });
      // 작은 화로(구이용)
      mesh(GEO.cylinder, '#5f6770', { position: [-1.2, 0, 0.6], scale: [0.35, 0.35, 0.35], outline: 0.02 });
      mesh(GEO.cylinder, '#f7a84a', { position: [-1.2, 0.35, 0.6], scale: [0.28, 0.02, 0.28], outline: false });
      out.push({ x: -1.2, z: 0.6, r: 0.45 });
    } else if (p === 'mirror') {
      mesh(GEO.box, '#f3c84b', { position: [2.4, 1.0, -2.6], scale: [0.8, 1.6, 0.08], shell: true, outline: 0.02 });
      mesh(GEO.box, '#e6f6ff', { position: [2.4, 1.0, -2.55], scale: [0.66, 1.44, 0.02], outline: false });
      ['#ffd6e2', '#fff1a8', '#cfe6f7', '#ffd6e2'].forEach((c, i) => mesh(GEO.dot, c, { position: [1.6 + i * 0.2, 0.06, -1.9 + (i % 2) * 0.2], scale: [0.08, 0.06, 0.08], outline: 0.01 }));
      out.push({ x: 2.4, z: -2.6, r: 0.5 });
    } else if (p === 'dojo') {
      // 짚 인형과 목검 걸이
      mesh(GEO.cylinder, '#a87b4c', { position: [1.8, 0, 0.2], scale: [0.06, 1.2, 0.06], outline: 0.015 });
      mesh(GEO.sphere, '#e3c47a', { position: [1.8, 0.95, 0.2], scale: [0.3, 0.4, 0.25], outline: 0.025 });
      mesh(GEO.sphere, '#e3c47a', { position: [1.8, 1.45, 0.2], scale: [0.18, 0.18, 0.18], outline: 0.02 });
      mesh(GEO.box, '#8a5a30', { position: [0.3, 1.4, -2.9], scale: [1.4, 0.08, 0.1], outline: 0.015 });
      [-0.2, 0.3, 0.8].forEach((x) => mesh(GEO.box, '#d8b48c', { position: [x, 1.55, -2.85], rotation: [0, 0, 0.1], scale: [0.06, 0.9, 0.03], outline: 0.01 }));
      out.push({ x: 1.8, z: 0.2, r: 0.45 });
    } else if (p === 'leafbed') {
      // 마른 풀과 나뭇잎을 깐 잠자리, 작은 악보대
      [[-1.9, -1.6, 0.9], [-1.5, -1.9, 0.7], [-2.2, -1.2, 0.6]].forEach(([x, z, r], i) => mesh(GEO.sphere, i % 2 ? '#8fbf6a' : '#a6cf7a', { position: [x, 0.05, z], scale: [r, 0.16, r * 0.8], outline: 0.02 }));
      mesh(GEO.cylinder, '#8a5a30', { position: [1.0, 0, -1.6], scale: [0.03, 0.8, 0.03], outline: 0.01 });
      mesh(GEO.box, '#fff8e6', { position: [1.0, 0.85, -1.6], rotation: [-0.4, 0, 0], scale: [0.45, 0.32, 0.02], outline: 0.012 });
      out.push({ x: -1.85, z: -1.55, r: 0.9 }, { x: 1.0, z: -1.6, r: 0.3 });
    }
    return out;
  }

  const blocked = (x, z, r) => {
    const b = spec.bounds;
    if (b.kind === 'rect' ? Math.abs(x) > b.hx - r || z < b.z0 + r || z > b.z1 : Math.hypot(x, z) > b.r - r) return true;
    if (host && Math.hypot(x - hostAt.x, z - hostAt.z) < 0.55 + r) return true;
    return obst.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + r);
  };

  return {
    scene,
    camera,
    /** 집주인 kind 의 방을 짓고, 내 캐릭터를 문간에, 집주인을 방 안에 세운다. */
    setRoom(kind, look) {
      room.clear();
      obst = [];
      spec = { ...ROOMS[kind] };
      spec.bounds = shell(spec);
      door = spec.bounds.door;
      for (const [id, x, z, rot] of spec.items) {
        const f = furnitureModel(id);
        f.position.set(x, 0, z);
        f.rotation.y = -rot * Math.PI / 2;
        room.add(f);
        if (!WALKABLE.has(id)) obst.push({ x, z, r: 0.55 });
      }
      obst.push(...prop(spec.prop));
      // 문간 깔개
      mesh(GEO.box, '#e7a3b0', { position: [door.x, 0.01, door.z - 0.2], scale: [1.1, 0.02, 0.5], outline: 0.02, receive: true });
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      scene.add(me.root);
      pos.x = door.x; pos.z = door.z - 0.6; yaw = Math.PI;
      if (host) scene.remove(host.root);
      host = buildNpc(kind);
      hostAt = { x: spec.host[0], z: spec.host[1] };
      host.root.position.set(hostAt.x, 0, hostAt.z);
      scene.add(host.root);
    },
    /** 옷을 갈아입었을 때 등(자리는 그대로). */
    setPlayer(look) { if (me) scene.remove(me.root); me = buildChibi(look); scene.add(me.root); },
    walk(dt, v) {
      const len = Math.min(1, Math.hypot(v.x, v.y));
      moving = false;
      if (len < 0.12 || !spec) return;
      const dx = v.x / Math.hypot(v.x, v.y), dz = -v.y / Math.hypot(v.x, v.y), step = 2.6 * len * dt, r = 0.3;
      const nx = pos.x + dx * step, nz = pos.z + dz * step;
      if (!blocked(nx, pos.z, r)) { pos.x = nx; moving = true; }
      if (!blocked(pos.x, nz, r)) { pos.z = nz; moving = true; }
      let d = Math.atan2(dx, dz) - yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      yaw += Math.max(-dt * 10, Math.min(dt * 10, d));
      if (moving) phase += dt * 2.6 * len * 3.2;
    },
    /** 그 집의 놀이 자리 { x, z, label } (없으면 null). */
    actSpot() { return spec && spec.act ? { x: spec.act[0], z: spec.act[1], label: spec.act[3] } : null; },
    /** 지금 할 수 있는 일: 집주인과 이야기 · 그 집의 놀이 · 문(나가기). */
    target() {
      const opts = [
        { type: 'host', x: hostAt.x, z: hostAt.z, r: 0.75, label: '말 걸기', reach: 1.45, y: host ? host.height + 0.35 : 1.4 },
        { type: 'door', x: door.x, z: door.z - 0.2, r: 0.6, label: '나가기', reach: 0.9, y: 1.1 }
      ];
      if (spec && spec.act) { const [x, z, reach, label] = spec.act; opts.push({ type: 'act', x, z, r: 0.7, label, reach, y: 1.3 }); }
      let best = null, bd = Infinity;
      for (const o of opts) { const d = Math.hypot(o.x - pos.x, o.z - pos.z); if (d < o.reach && d < bd) { bd = d; best = o; } }
      return best;
    },
    setCue(t, time = 0) {
      cue.visible = !!t;
      if (!t) return;
      cue.position.set(t.x, 0.03, t.z);
      cue.scale.setScalar(t.r * (1 + 0.07 * Math.sin(time * 6)));
    },
    /** 내 캐릭터 · 집주인이 잠깐 몸짓을 한다(mode: 'swing' | 'dance' | 'cheer' …). */
    pose(mode, dur) { mePose = { mode, t: dur, dur }; },
    hostPose(mode, dur) { hostPose = { mode, t: dur, dur }; },
    /** 놀이 자리 (x, z) 옆으로 옮겨 그쪽을 본다(이미 가까우면 바라보기만). 문 쪽으로 d 만큼 떨어진 빈자리. */
    moveNear(x, z, d = 0.95) {
      if (Math.hypot(pos.x - x, pos.z - z) <= d + 0.45) { yaw = Math.atan2(x - pos.x, z - pos.z); return; }
      const dx = door.x - x, dz = door.z - z, L = Math.hypot(dx, dz) || 1;
      for (const k of [d, d + 0.3, d + 0.6, d + 1]) {
        for (const a of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
          const c = Math.cos(a), s = Math.sin(a), px = x + ((dx * c - dz * s) / L) * k, pz = z + ((dx * s + dz * c) / L) * k;
          if (!blocked(px, pz, 0.3)) { pos.x = px; pos.z = pz; yaw = Math.atan2(x - px, z - pz); return; }
        }
      }
    },
    /** 내 캐릭터가 (x, z) 를 바라본다. */
    face(x, z) { yaw = Math.atan2(x - pos.x, z - pos.z); },
    /** 집주인 머리 위(하트 · 말풍선 자리). */
    hostAnchor() { return { x: hostAt.x, y: host ? host.height + 0.5 : 1.5, z: hostAt.z }; },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 62 : 38;
      camera.updateProjectionMatrix();
    },
    update(dt, t, talking) {
      if (!me) return;
      me.root.position.set(pos.x, 0, pos.z);
      me.root.rotation.y = yaw;
      if (mePose) { mePose.t -= dt; if (mePose.t <= 0) mePose = null; }
      if (hostPose) { hostPose.t -= dt; if (hostPose.t <= 0) hostPose = null; }
      if (mePose) animateChibi(me, mePose.mode, t, { phase, swing: 1 - mePose.t / mePose.dur });
      else animateChibi(me, moving ? 'walk' : 'idle', t, { phase });
      if (host) {
        host.root.rotation.y = Math.atan2(pos.x - hostAt.x, pos.z - hostAt.z); // 집주인은 나를 바라본다
        animateChibi(host, hostPose ? hostPose.mode : talking ? 'talk' : 'idle', t, {});
      }
    }
  };
}
