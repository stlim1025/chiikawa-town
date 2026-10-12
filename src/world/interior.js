import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi, showOnlyProp } from '../actors/models.js';
import { HOME_GRID } from '../core/home.js';

// 돔 집 안: 앞쪽 벽이 잘린 인형의 집처럼 비스듬히 위에서 들여다본다.
const CELL = 1.1;
const X0 = -(HOME_GRID.cols * CELL) / 2, Z0 = -2.9; // 칸 격자의 왼쪽 안쪽 모서리
const ROOM_R = 4.4;
/** 문간(나가기) · 옷장 자리. 깔개와 방석은 밟고 지나갈 수 있다. */
const DOOR = { x: 0, z: 2.9 };
const WARDROBE = { x: -3.2, z: -1.0 };
const WALKABLE = new Set(['rug', 'cushion']);

/** 칸 (cx, cz) 의 바닥 가운데. */
export const cellCenter = (cx, cz) => ({ x: X0 + (cx + 0.5) * CELL, z: Z0 + (cz + 0.5) * CELL });

/** 가구 모델. 한 칸(약 1 x 1) 안에 들어가는 크기. 가구점 썸네일(world/thumbs.js)도 이걸로 그린다. */
export function furnitureModel(id) {
  const g = new THREE.Group();
  const m = (geo, c, o = {}) => { const mesh = toonMesh(geo, c, { shadow: false, ...o }); g.add(mesh); return mesh; };
  switch (id) {
    case 'bed':
      m(GEO.box, '#d8b48c', { position: [0, 0.18, 0.05], scale: [0.9, 0.36, 0.95], shell: true });
      m(GEO.box, '#fff4de', { position: [0, 0.4, 0.07], scale: [0.82, 0.12, 0.88], shell: true });
      m(GEO.box, '#a8dcc8', { position: [0, 0.47, 0.2], scale: [0.84, 0.07, 0.6], shell: true });
      m(GEO.sphere, '#ffffff', { position: [0, 0.52, -0.25], scale: [0.26, 0.09, 0.15], outline: 0.02 });
      m(GEO.box, '#c49a6c', { position: [0, 0.48, -0.44], scale: [0.92, 0.62, 0.08], shell: true });
      break;
    case 'table':
      m(GEO.cylinder, '#c49a6c', { position: [0, 0, 0], scale: [0.07, 0.5, 0.07], outline: 0.02 });
      m(GEO.cylinder, '#e2b77f', { position: [0, 0.5, 0], scale: [0.42, 0.07, 0.42], outline: 0.025 });
      m(GEO.cylinder, '#ffffff', { position: [0.12, 0.57, 0.05], scale: [0.07, 0.1, 0.07], outline: 0.012 });
      break;
    case 'cushion':
      m(GEO.sphere, '#ffb7cf', { position: [0, 0.1, 0], scale: [0.38, 0.12, 0.38], outline: 0.025 });
      m(GEO.dot, '#e5788f', { position: [0, 0.22, 0], scale: [0.05, 0.03, 0.05], outline: false });
      break;
    case 'rug':
      m(GEO.cylinder, '#cdb8f0', { position: [0, 0, 0], scale: [0.5, 0.02, 0.5], outline: 0.02, receive: true });
      m(GEO.cylinder, '#e6dcff', { position: [0, 0.005, 0], scale: [0.3, 0.025, 0.3], outline: false, receive: true });
      break;
    case 'plant':
      m(GEO.cylinder, '#d8a47f', { position: [0, 0, 0], scale: [0.18, 0.3, 0.18], outline: 0.02 });
      [[0, 0.5, 0, 0.2], [0.12, 0.42, 0.05, 0.15], [-0.12, 0.44, -0.04, 0.15]].forEach(([x, y, z, r]) => m(GEO.sphere, '#6cc77e', { position: [x, y, z], scale: [r, r, r], outline: 0.02 }));
      break;
    case 'lamp':
      m(GEO.cylinder, '#8f8174', { position: [0, 0, 0], scale: [0.16, 0.05, 0.16], outline: 0.015 });
      m(GEO.cylinder, '#8f8174', { position: [0, 0.05, 0], scale: [0.025, 0.85, 0.025], outline: 0.01 });
      m(GEO.cone, '#fff1a8', { position: [0, 0.78, 0], scale: [0.26, 0.3, 0.26], outline: 0.02 });
      m(GEO.dot, '#fff6c8', { position: [0, 0.84, 0], scale: [0.09, 0.09, 0.09], outline: false });
      break;
    case 'shelf':
      m(GEO.box, '#c49a6c', { position: [0, 0.55, -0.25], scale: [0.9, 1.1, 0.34], shell: true });
      [0.32, 0.72].forEach((y) => m(GEO.box, '#a77d5a', { position: [0, y, -0.07], scale: [0.82, 0.04, 0.02], outline: false }));
      ['#e0524f', '#7fa7d9', '#f7d24a', '#8fd16a', '#ffb7cf'].forEach((c, i) => m(GEO.box, c, { position: [-0.3 + i * 0.15, i % 2 ? 0.86 : 0.46, -0.12], scale: [0.1, 0.24, 0.16], outline: 0.01 }));
      break;
    case 'stove':
      m(GEO.box, '#e0524f', { position: [0, 0.28, 0], scale: [0.5, 0.56, 0.45], shell: true });
      m(GEO.box, '#f7a84a', { position: [0, 0.24, 0.23], scale: [0.26, 0.2, 0.02], outline: false });
      m(GEO.cylinder, '#6b6470', { position: [0.12, 0.56, -0.08], scale: [0.07, 0.6, 0.07], outline: 0.015 });
      break;
    case 'djbooth':
      // 우사기 클럽의 DJ 자리: 작은 탁자 위 커다란 도토리와 나뭇잎, 옆에 동그란 스피커
      m(GEO.box, '#5b4a7a', { position: [0, 0.3, 0], scale: [0.86, 0.6, 0.46], shell: true });
      m(GEO.box, '#ff7ad9', { position: [0, 0.4, 0.235], scale: [0.7, 0.05, 0.01], outline: false });
      m(GEO.sphere, '#b9773f', { position: [-0.12, 0.7, 0], scale: [0.16, 0.13, 0.16], outline: 0.02 });
      m(GEO.sphere, '#7a5131', { position: [-0.12, 0.79, 0], scale: [0.17, 0.06, 0.17], outline: 0.015 });
      m(GEO.sphere, '#6cc77e', { position: [0.18, 0.62, 0.02], scale: [0.16, 0.025, 0.09], rotation: [0, 0.5, 0], outline: 0.015 });
      m(GEO.box, '#3a3236', { position: [0.55, 0.32, 0], scale: [0.26, 0.64, 0.3], shell: true });
      [0.2, 0.46].forEach((y) => m(GEO.cylinder, '#8f8174', { position: [0.55, y, 0.16], scale: [0.08, 0.02, 0.08], rotation: [Math.PI / 2, 0, 0], outline: 0.01 }));
      break;
    case 'doll': {
      const doll = buildNpc('chiikawa');
      doll.root.scale.setScalar(0.42);
      animateChibi(doll, 'idle', 0, {});
      g.add(doll.root);
      break;
    }
    default:
      break;
  }
  return g;
}

/**
 * 돔(타원 반구: 반지름 R, 높이 H) 안쪽 벽면에 창 · 액자를 붙인다. a: 방위각(0 이 뒤쪽 −z, + 는 오른쪽), y: 높이,
 * inset: 벽에서 안쪽으로 띄우는 거리. 높이에 따라 벽이 안으로 좁아지므로 그만큼 당기고, 벽 기울기만큼 위를 안쪽으로 눕힌다.
 */
export function placeOnDome(obj, R, H, a, y, inset = 0.1) {
  const r = R * Math.sqrt(Math.max(0, 1 - (y * y) / (H * H))) - inset;
  const x = Math.sin(a) * r, z = -Math.cos(a) * r;
  obj.position.set(x, y, z);
  obj.rotation.set(Math.atan2(y / (H * H), (r + inset) / (R * R)), Math.atan2(-x, -z), 0, 'YXZ');
  return obj;
}

/** 집 안 장면. 밖 마을과 따로 그린다. */
export function createInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3e2c8');
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c4a5, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
  sun.position.set(2, 7, 5);
  scene.add(sun);

  // 바닥(나무)과 돔 벽(앞쪽은 보이지 않게 안쪽 면만 그린다)
  scene.add(toonMesh(GEO.cylinder, '#e2c29b', { position: [0, -0.1, 0], scale: [ROOM_R, 0.1, ROOM_R], outline: 0.04, receive: true }));
  const wall = toonMesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), '#fbfaf5', { scale: [ROOM_R, ROOM_R * 0.9, ROOM_R], outline: false });
  wall.material = wall.material.clone();
  wall.material.side = THREE.BackSide;
  scene.add(wall);
  // 안쪽 벽의 십자 창
  const win = new THREE.Group();
  placeOnDome(win, ROOM_R, ROOM_R * 0.9, -0.45, 2.1); // 돔 벽면에 딱 붙게(예전엔 벽 밖으로 파묻혀 있었다)
  win.add(toonMesh(GEO.box, '#c6e7f5', { scale: [0.9, 0.9, 0.05], shell: true, outline: 0.03 }));
  win.add(toonMesh(GEO.box, '#3a3236', { position: [0, 0, 0.03], scale: [0.06, 0.86, 0.03], outline: false }));
  win.add(toonMesh(GEO.box, '#3a3236', { position: [0, 0, 0.03], scale: [0.86, 0.06, 0.03], outline: false }));
  scene.add(win);
  // 문간 깔개(앞쪽)
  scene.add(toonMesh(GEO.box, '#e7a3b0', { position: [0, 0.01, 2.75], scale: [1.2, 0.02, 0.6], outline: 0.02, receive: true }));

  // 칸 표시(꾸미기 중에만): 칸마다 얇은 판
  const tileGeo = new THREE.PlaneGeometry(CELL * 0.92, CELL * 0.92).rotateX(-Math.PI / 2);
  const tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const hotMat = new THREE.MeshBasicMaterial({ color: 0xff8fb0, transparent: true, opacity: 0.55, depthWrite: false });
  const tiles = [];
  for (let cz = 0; cz < HOME_GRID.rows; cz++) {
    for (let cx = 0; cx < HOME_GRID.cols; cx++) {
      const c = cellCenter(cx, cz), t = new THREE.Mesh(tileGeo, tileMat);
      t.position.set(c.x, 0.02, c.z);
      t.visible = false;
      t.userData = { cx, cz };
      scene.add(t);
      tiles.push(t);
    }
  }

  const furniture = new THREE.Group();
  scene.add(furniture);
  const models = new Map(); // 'cx,cz' → 놓인 가구 모델(끌 때 움직인다)
  const cellOf = new Map(); // 모델 → 칸 { cx, cz }(가구를 눌렀을 때 어느 칸인지)
  let ghostModel = null, ghostId = null; // 목록에서 끌어 오는 가구 미리보기
  let me = null;
  // 집 안을 걷는 내 캐릭터: 자리 · 바라보는 방향 · 걸음
  const pos = { x: DOOR.x, z: DOOR.z - 0.5 };
  let yaw = Math.PI, phase = 0, moving = false;
  let mePose = null; // 잠깐 하는 몸짓(먹기) { mode, t, dur, prop }

  // 옷장(늘 왼쪽 벽에 붙어 있다): 나무 장 + 문 두 짝 + 거울
  {
    const g = new THREE.Group();
    g.position.set(WARDROBE.x, 0, WARDROBE.z);
    g.rotation.y = Math.PI / 2 - 0.35;
    g.add(toonMesh(GEO.box, '#c99a6a', { position: [0, 0.95, 0], scale: [1.3, 1.9, 0.55], shell: true, outline: 0.03 }));
    g.add(toonMesh(GEO.box, '#d8ad7d', { position: [-0.32, 0.95, 0.29], scale: [0.6, 1.72, 0.04], shell: true, outline: 0.02 }));
    g.add(toonMesh(GEO.box, '#cfe7f2', { position: [0.32, 1.05, 0.29], scale: [0.5, 1.2, 0.04], shell: true, outline: 0.02 }));
    g.add(toonMesh(GEO.box, '#ffffff', { position: [0.24, 1.3, 0.315], scale: [0.08, 0.5, 0.01], outline: false, shadow: false }));
    [-0.06, 0.06].forEach((x) => g.add(toonMesh(GEO.dot, '#8a5a30', { position: [x, 1.0, 0.33], scale: [0.04, 0.04, 0.04], outline: false })));
    g.add(toonMesh(GEO.box, '#a87b4c', { position: [0, 1.93, 0], scale: [1.4, 0.08, 0.62], shell: true, outline: 0.02 }));
    scene.add(g);
  }
  // 대상 발밑의 노란 고리(집 안 행동 안내)
  const cue = new THREE.Mesh(new THREE.RingGeometry(0.74, 1, 40), new THREE.MeshBasicMaterial({ color: 0xfcd95b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  cue.rotation.x = -Math.PI / 2;
  cue.visible = false;
  scene.add(cue);
  const blocked = (home, x, z, r) => {
    if (Math.hypot(x, z) > ROOM_R - 0.55) return true;
    if (Math.hypot(x - WARDROBE.x, z - WARDROBE.z) < 0.75 + r) return true;
    return home.placed.some((p) => {
      if (WALKABLE.has(p.id)) return false;
      const c = cellCenter(p.cx, p.cz);
      return Math.abs(x - c.x) < CELL * 0.45 + r && Math.abs(z - c.z) < CELL * 0.45 + r;
    });
  };

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 7.4, 8.6);
  camera.lookAt(0, 0.6, -0.5);
  const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();

  return {
    scene,
    camera,
    /** 놓인 가구를 다시 그린다. */
    setHome(home) {
      furniture.clear();
      models.clear();
      cellOf.clear();
      for (const p of home.placed) {
        const c = cellCenter(p.cx, p.cz), f = furnitureModel(p.id);
        f.position.set(c.x, 0, c.z);
        f.rotation.y = -p.rot * Math.PI / 2;
        furniture.add(f);
        models.set(`${p.cx},${p.cz}`, f);
        cellOf.set(f, { cx: p.cx, cz: p.cz });
      }
    },
    /** 끌고 있는 가구: 칸 cell 의 가구를 바닥 위 점 { x, z } 로 살짝 들어 옮긴다. point 가 null 이면 제자리로. */
    drag(cell, point) {
      const f = cell && models.get(`${cell.cx},${cell.cz}`);
      if (!f) return;
      const c = point || cellCenter(cell.cx, cell.cz);
      f.position.set(c.x, point ? 0.25 : 0, c.z);
    },
    /** 목록에서 끌어 오는 가구 미리보기: 칸 위에 살짝 띄워 보여 준다(id 나 cell 이 null 이면 숨긴다). */
    ghost(id, cell) {
      if (!id || !cell) { if (ghostModel) ghostModel.visible = false; return; }
      if (ghostId !== id) {
        if (ghostModel) scene.remove(ghostModel);
        ghostModel = furnitureModel(id);
        ghostId = id;
        scene.add(ghostModel);
      }
      const c = cellCenter(cell.cx, cell.cz);
      ghostModel.position.set(c.x, 0.2, c.z);
      ghostModel.visible = true;
    },
    /** 화면 좌표(-1..1)에 보이는 가구의 칸. 가구 몸통(탁자 윗면처럼 바닥보다 높이 보이는 곳)을 눌러도 그 가구로 친다. 없으면 null. */
    pickCell(nx, ny) {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      for (const h of ray.intersectObjects(furniture.children, true)) {
        let o = h.object;
        while (o && o.parent !== furniture) o = o.parent;
        if (o && cellOf.has(o)) return cellOf.get(o);
      }
      return null;
    },
    /** 화면 좌표(-1..1)가 가리키는 바닥 위 점 { x, z }(방 밖이어도). */
    pointAt(nx, ny) {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      return ray.ray.intersectPlane(floor, hit) ? { x: hit.x, z: hit.z } : null;
    },
    /** 집 안의 내 캐릭터. keep 이 아니면 문간에서 방 쪽을 보고 선다(옷을 갈아입을 때는 keep). */
    setPlayer(look, keep = false) {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      if (!keep) { pos.x = DOOR.x; pos.z = DOOR.z - 0.5; yaw = Math.PI; }
      me.root.position.set(pos.x, 0, pos.z);
      me.root.rotation.y = yaw;
      scene.add(me.root);
    },
    /** 입력 방향 v = { x, y }(y 는 화면 위가 +)로 걷는다. 벽 · 가구 · 옷장은 비켜 간다. */
    walk(dt, v, home) {
      const len = Math.min(1, Math.hypot(v.x, v.y));
      moving = false;
      if (len < 0.12) return;
      const dx = v.x / Math.hypot(v.x, v.y), dz = -v.y / Math.hypot(v.x, v.y), step = 2.6 * len * dt, r = 0.3;
      const nx = pos.x + dx * step, nz = pos.z + dz * step;
      if (!blocked(home, nx, pos.z, r)) { pos.x = nx; moving = true; }
      if (!blocked(home, pos.x, nz, r)) { pos.z = nz; moving = true; }
      let d = Math.atan2(dx, dz) - yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      yaw += Math.max(-dt * 10, Math.min(dt * 10, d));
      if (moving) phase += dt * 2.6 * len * 3.2;
    },
    /** 그 자리에 바로 선다(확인용). */
    standAt(x, z) { pos.x = x; pos.z = z; },
    /** 같이 놀기: 문간에 먼저 와 있는 사람(others [{ x, z }])과 겹치지 않게 옆 빈자리로 비켜 선다(가구 · 벽은 피한다). */
    stepAside(home, others) {
      if (!others.length) return;
      for (const [dx, dz] of [[0, 0], [1.05, 0], [-1.05, 0], [1.0, -0.8], [-1.0, -0.8], [0, -1.05], [1.9, -0.45], [-1.9, -0.45], [0, -2.0]]) {
        const x = pos.x + dx, z = pos.z + dz;
        if (blocked(home, x, z, 0.3) || !others.every((o) => Math.hypot(o.x - x, o.z - z) > 0.95)) continue;
        pos.x = x;
        pos.z = z;
        if (me) me.root.position.set(x, 0, z);
        return;
      }
    },
    /**
     * 지금 할 수 있는 일: 가까운 침대(자기) · 옷장 · 문(나가기). { type, x, z, r, label } | null
     * guest: 같이 놀기로 친구 집에 놀러 왔으면 문(나가기)만.
     */
    target(home, { guest = false } = {}) {
      const opts = [];
      if (!guest) {
        for (const p of home.placed) if (p.id === 'bed') { const c = cellCenter(p.cx, p.cz); opts.push({ type: 'bed', x: c.x, z: c.z, r: 0.75, label: '자기', reach: 1.35 }); }
        opts.push({ type: 'wardrobe', x: WARDROBE.x, z: WARDROBE.z, r: 0.85, label: '옷장', reach: 1.5 });
      }
      opts.push({ type: 'door', x: DOOR.x, z: DOOR.z, r: 0.6, label: '나가기', reach: 0.9 });
      let best = null, bd = Infinity;
      for (const o of opts) { const d = Math.hypot(o.x - pos.x, o.z - pos.z); if (d < o.reach && d < bd) { bd = d; best = o; } }
      return best;
    },
    /** 행동 안내 고리(null 이면 숨긴다). */
    setCue(t, time = 0) {
      cue.visible = !!t;
      if (!t) return;
      cue.position.set(t.x, 0.03, t.z);
      cue.scale.setScalar(t.r * (1 + 0.07 * Math.sin(time * 6)));
    },
    get playerPos() { return pos; },
    /** 집 안 내 캐릭터가 바라보는 방향 · 걷는 중인지(같이 놀기: 같이 있는 친구에게 보낸다). */
    get playerYaw() { return yaw; },
    get playerMoving() { return moving; },
    /** 옷장을 열 때: 카메라(앞) 쪽을 보고 서서 바뀐 모습이 보이게. */
    faceCamera() { yaw = 0; moving = false; },
    showGrid(on) { tiles.forEach((t) => { t.visible = on; t.material = tileMat; }); },
    /** 칸 하나를 분홍으로(null 이면 모두 원래대로). */
    highlight(cell) { tiles.forEach((t) => { t.material = cell && t.userData.cx === cell.cx && t.userData.cz === cell.cz ? hotMat : tileMat; }); },
    /** 화면 좌표(-1..1)가 가리키는 바닥 칸. 칸 밖이면 null. */
    cellAt(nx, ny) {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      if (!ray.ray.intersectPlane(floor, hit)) return null;
      const cx = Math.floor((hit.x - X0) / CELL), cz = Math.floor((hit.z - Z0) / CELL);
      return cx >= 0 && cz >= 0 && cx < HOME_GRID.cols && cz < HOME_GRID.rows ? { cx, cz } : null;
    },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 62 : 38;
      camera.updateProjectionMatrix();
    },
    /** 내 캐릭터가 잠깐 몸짓을 한다(먹기: mode 'slurp' | 'gulp' | 'nibble', prop: 그동안 손에 드는 음식). */
    pose(mode, dur, prop = null) { mePose = { mode, t: dur, dur, prop }; if (me) showOnlyProp(me, prop); },
    update(dt, t) {
      if (!me) return;
      me.root.position.set(pos.x, 0, pos.z);
      me.root.rotation.y = yaw;
      if (mePose) { mePose.t -= dt; if (mePose.t <= 0 || moving) { if (mePose.prop) showOnlyProp(me, null); mePose = null; } } // 걸어가면 그만 먹는다
      if (mePose) animateChibi(me, mePose.mode, t, { phase, eat: 1 - mePose.t / mePose.dur });
      else animateChibi(me, moving ? 'walk' : 'idle', t, { phase });
    }
  };
}
