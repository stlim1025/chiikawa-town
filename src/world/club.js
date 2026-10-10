import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi, EAR_TYPES, BODY_COLORS, CHEEK_COLORS, EYE_TYPES, MOUTH_TYPES, HAIR_TYPES, HAIR_COLORS, ACCESSORIES } from '../actors/models.js';

/**
 * 우사기의 클럽(사이드스토리 '우사기의 집', 원작 320화): 토끼굴 속 어두운 터널을 지나면 반짝이는 클럽이 나온다.
 * 따로 그리는 장면(친구 집 rooms.js 처럼). 무대 위 우사기가 도토리에 나뭇잎을 문질러 끽끽 DJ, 손님들이 춤춘다.
 * phase: 'tunnel'(터널을 걸어간다) → 'club'(문이 열리고 클럽). hype(0..1): 손님들이 얼마나 신났는지(박자를 잘 맞추면 오른다).
 */
const BEAT = 60 / 118;
const NEON = ['#ff7ad9', '#5fe3ff', '#ffe45f', '#8cff7a', '#b48cff'];
const TUNNEL_X = 80; // 터널은 클럽과 멀리 떨어진 곳에 짓는다(한쪽만 보이게)
const TUNNEL_LEN = 14, TUNNEL_SEC = 4.6, STAGE_Y = 0.8;
const WHITE = new THREE.Color(1, 1, 1);

const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
/** 손님 한 명의 생김새(정해진 씨앗으로: 매번 같은 손님들). */
function crowdLook(i) {
  let s = i * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return {
    ears: pick(EAR_TYPES, r()).id, body: pick(BODY_COLORS, r()), cheek: pick(CHEEK_COLORS, r()), eyes: pick(EYE_TYPES, r()).id,
    mouth: pick(MOUTH_TYPES, r()).id, hair: r() < 0.5 ? 'none' : pick(HAIR_TYPES, r()).id, hairColor: pick(HAIR_COLORS, r()),
    accessory: r() < 0.6 ? 'none' : pick(ACCESSORIES, r()).id
  };
}

export function createClub() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1030');
  scene.add(new THREE.HemisphereLight(0xd9c8ff, 0x3a2a55, 1.0));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  const light = new THREE.Color(1, 1, 1); // 캐릭터 단색 칠에 곱하는 빛(조명 색이 박자마다 바뀐다)

  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const add = (parent, geo, mat, pos, scale, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    return m;
  };
  const toon = (parent, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); parent.add(m); return m; };

  // ---------- 클럽 홀 ----------
  const hall = new THREE.Group();
  scene.add(hall);
  // 바닥: 박자마다 반짝이는 타일
  const tiles = [];
  const tileGeo = new THREE.BoxGeometry(1, 0.1, 1);
  for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 4; iz++) {
    const mat = basic('#000000');
    const t = add(hall, tileGeo, mat, [-4.6 + ix * 1.84, -0.05, -2.4 + iz * 1.8], [1.76, 1, 1.72]);
    tiles.push({ mesh: t, mat, base: new THREE.Color(NEON[(ix + iz * 2) % NEON.length]), k: (ix * 3 + iz * 5) % 7 });
  }
  add(hall, new THREE.BoxGeometry(14, 0.1, 12), basic('#140a24'), [0, -0.12, 0]);
  // 벽 · 무대
  add(hall, new THREE.BoxGeometry(13, 6, 0.3), basic('#2a1a46'), [0, 3, -5.4]);
  [-1, 1].forEach((k) => add(hall, new THREE.BoxGeometry(0.3, 6, 12), basic('#22143a'), [k * 6.2, 3, -0.4]));
  toon(hall, GEO.box, '#3a2856', { position: [0, 0.4, -4.15], scale: [9, 0.8, 2.3], shell: true, outline: 0.03 });
  const stageStrip = add(hall, new THREE.BoxGeometry(9, 0.08, 0.05), basic(NEON[0]), [0, 0.77, -2.98]);
  // 뒷벽 네온 테두리
  const frameMat = basic(NEON[1]);
  [[0, 5.2], [0, 0.9]].forEach(([x, y]) => add(hall, new THREE.BoxGeometry(11.6, 0.08, 0.05), frameMat, [x, y, -5.2]));
  [-5.8, 5.8].forEach((x) => add(hall, new THREE.BoxGeometry(0.08, 4.3, 0.05), frameMat, [x, 3.05, -5.2]));
  // DJ 탁자: 커다란 도토리 · 나뭇잎
  const desk = new THREE.Group();
  desk.position.set(0, STAGE_Y, -3.7);
  hall.add(desk);
  toon(desk, GEO.box, '#4a3a6a', { position: [0, 0.4, 0], scale: [1.7, 0.8, 0.7], shell: true, outline: 0.03 });
  const deskStrip = add(desk, new THREE.BoxGeometry(1.5, 0.08, 0.02), basic(NEON[2]), [0, 0.55, 0.36]);
  toon(desk, GEO.sphere, '#b9773f', { position: [-0.32, 0.93, 0.02], scale: [0.2, 0.16, 0.2], outline: 0.02 });
  toon(desk, GEO.sphere, '#7a5131', { position: [-0.32, 1.04, 0.02], scale: [0.21, 0.07, 0.21], outline: 0.015 });
  const leaf = toon(desk, GEO.sphere, '#6cc77e', { position: [0.18, 0.85, 0.05], scale: [0.22, 0.03, 0.12], outline: 0.015 });
  // 스피커 둘
  [-3.6, 3.6].forEach((x) => {
    toon(hall, GEO.box, '#2e2340', { position: [x, 1.15, -4.3], scale: [1, 2.3, 0.9], shell: true, outline: 0.03 });
    [0.7, 1.6].forEach((y) => toon(hall, GEO.cylinder, '#5b4a7a', { position: [x, y, -3.84], scale: [0.3, 0.04, 0.3], rotation: [Math.PI / 2, 0, 0], outline: 0.015 }));
  });
  // 미러볼과 둘레를 도는 반짝이
  const ballTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const g = c.getContext('2d');
    for (let x = 0; x < 16; x++) for (let y = 0; y < 8; y++) { const v = 150 + ((x * 53 + y * 97) % 105); g.fillStyle = `rgb(${v},${v},${Math.min(255, v + 10)})`; g.fillRect(x * 4, y * 4, 4, 4); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  })();
  const ball = add(hall, new THREE.SphereGeometry(0.45, 18, 12), basic('#ffffff', { map: ballTex }), [0, 4.3, -1.6]);
  add(hall, new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4), basic('#8a7aa8'), [0, 5.2, -1.6]);
  const SPARK = 70, sparkPos = new Float32Array(SPARK * 3), sparkSeed = [];
  for (let i = 0; i < SPARK; i++) sparkSeed.push({ a: (i * 2.39996) % (Math.PI * 2), r: 2 + ((i * 37) % 40) / 10, y: 0.2 + ((i * 53) % 45) / 10, s: 0.2 + ((i * 17) % 50) / 100 });
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  hall.add(sparks);
  // 천장에서 내려오는 조명 기둥(살랑살랑 흔들린다)
  const beams = [-3, -1.1, 1.1, 3].map((x, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 5.6, -3.4);
    hall.add(pivot);
    const mat = basic(NEON[i % NEON.length], { transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    add(pivot, new THREE.ConeGeometry(1.25, 6, 20, 1, true), mat, [0, -3, 0]);
    return { pivot, mat, k: i };
  });

  // 손님들: 무대 앞에 반원으로(앞 가운데는 나와 친구들 자리)
  const crowd = [];
  const SPOTS = [[-4.4, -1.6], [-3.3, -2.3], [-2.1, -2.5], [2.1, -2.5], [3.3, -2.3], [4.4, -1.6], [-4.8, 0.3], [-3.3, -0.4], [3.3, -0.4], [4.8, 0.3], [-4.2, 2.2], [4.2, 2.2]]; // 가운데는 비워 무대 위 우사기가 보이게
  SPOTS.forEach(([x, z], i) => {
    const c = buildChibi(crowdLook(i + 3));
    c.root.position.set(x, 0, z);
    c.root.rotation.y = Math.atan2(-x, -4 - z); // 무대 쪽을 본다
    c.root.scale.setScalar(0.9 + ((i * 37) % 10) / 50);
    hall.add(c.root);
    crowd.push({ c, phase: i * 1.3, mode: ['dance', 'hop', 'sway', 'clap'][i % 4] });
  });
  const usagi = buildNpc('usagi');
  usagi.root.position.set(0, STAGE_Y, -4.35);
  usagi.root.scale.setScalar(1.2); // 무대 위 주인공은 조금 크게
  hall.add(usagi.root);
  // 나와 친구들(클럽에 들어오면 앞 가운데에)
  let me = null;
  const pals = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware') };
  Object.values(pals).forEach((p) => hall.add(p.root));
  const HALL_SPOTS = { me: [0, 1.5], chiikawa: [-1.15, 1.85], hachiware: [1.15, 1.85] };

  // ---------- 터널 ----------
  const tunnel = new THREE.Group();
  tunnel.position.set(TUNNEL_X, 0, 0);
  scene.add(tunnel);
  add(tunnel, new THREE.BoxGeometry(3.2, 0.1, TUNNEL_LEN + 4), basic('#3b2b22'), [0, -0.05, TUNNEL_LEN / 2]);
  [-1, 1].forEach((k) => add(tunnel, new THREE.BoxGeometry(0.4, 3, TUNNEL_LEN + 4), basic('#2a1e18'), [k * 1.7, 1.5, TUNNEL_LEN / 2]));
  add(tunnel, new THREE.BoxGeometry(3.6, 0.4, TUNNEL_LEN + 4), basic('#1e1511'), [0, 3, TUNNEL_LEN / 2]);
  const shrooms = [];
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1, z = 1 + i * 1.5;
    shrooms.push(add(tunnel, new THREE.SphereGeometry(0.13, 10, 8), basic(NEON[(i + 1) % NEON.length]), [side * 1.42, 0.25 + (i % 3) * 0.35, z], [1, 0.6, 1]));
  }
  const door = add(tunnel, new THREE.PlaneGeometry(1.6, 2.3), basic('#ffd6f4'), [0, 1.15, -0.1]);
  const doorGlow = add(tunnel, new THREE.PlaneGeometry(3.2, 3.2), basic('#ff9ae3', { transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), [0, 1.3, -0.05]);
  const walkers = { usagi: buildNpc('usagi'), chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware') };
  Object.values(walkers).forEach((w) => tunnel.add(w.root));
  let tme = null;

  let phase = 'tunnel', pt = 0, hype = 0.3, jump = 0, fever = false, palMode = 'look', meMode = 'idle', meT = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  function placeHall() {
    if (me) { me.root.position.set(HALL_SPOTS.me[0], 0, HALL_SPOTS.me[1]); me.root.rotation.y = Math.PI; }
    for (const [k, p] of Object.entries(pals)) { const [x, z] = HALL_SPOTS[k]; p.root.position.set(x, 0, z); p.root.rotation.y = Math.PI + (k === 'chiikawa' ? -0.15 : 0.15); }
  }
  function updateTunnel(t, onBeat) {
    hall.visible = false; tunnel.visible = true;
    const k = Math.min(1, pt / TUNNEL_SEC), z = TUNNEL_LEN - k * (TUNNEL_LEN - 1.4);
    const step = (w, x, dz, ph) => { w.root.position.set(x, 0, z + dz); w.root.rotation.y = Math.PI; animateChibi(w, k < 1 ? 'walk' : 'idle', t, { phase: t * 8 + ph }); };
    step(walkers.usagi, 0, -1.6, 0);
    if (tme) step(tme, 0, 0.6, 1);
    step(walkers.chiikawa, -0.7, 1.4, 2);
    step(walkers.hachiware, 0.7, 1.5, 3);
    shrooms.forEach((m, i) => m.scale.setScalar(0.85 + 0.25 * Math.sin(t * 3 + i)));
    doorGlow.material.opacity = 0.25 + 0.35 * k + 0.15 * onBeat;
    door.material.color.set(k > 0.8 ? '#ffffff' : '#ffd6f4');
    camPos.set(TUNNEL_X, 2.1, z + 4.6); camLook.set(TUNNEL_X, 1.1, z - 3);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }
  function updateHall(dt, t, onBeat, ci) {
    hall.visible = true; tunnel.visible = false;
    tiles.forEach((tl) => {
      const lit = (Math.floor(t / BEAT) + tl.k) % (fever ? 2 : 3) === 0;
      tl.mat.color.copy(tl.base).multiplyScalar(lit ? 0.55 + 0.45 * onBeat : 0.14 + hype * 0.08);
    });
    stageStrip.material.color.set(NEON[ci]);
    deskStrip.material.color.set(NEON[(ci + 2) % NEON.length]);
    frameMat.color.set(NEON[(ci + 1) % NEON.length]);
    beams.forEach((b) => {
      b.pivot.rotation.z = Math.sin(t * 0.9 + b.k * 1.7) * 0.5;
      b.pivot.rotation.x = Math.sin(t * 0.7 + b.k) * 0.25 + 0.15;
      b.mat.color.set(NEON[(ci + b.k) % NEON.length]);
      b.mat.opacity = (fever ? 0.22 : 0.12) + 0.08 * onBeat;
    });
    ball.rotation.y += dt * 0.8;
    sparkSeed.forEach((s, i) => {
      const a = s.a + t * s.s;
      sparkPos[i * 3] = Math.sin(a) * s.r; sparkPos[i * 3 + 1] = s.y; sparkPos[i * 3 + 2] = -1.6 + Math.cos(a) * s.r * 0.7;
    });
    sparkGeo.attributes.position.needsUpdate = true;
    leaf.rotation.y = Math.sin(t * 12.4) * 0.6; // 끽끽 문지르는 나뭇잎
    animateChibi(usagi, 'dj', t, {});
    // 손님들: 흥이 오를수록 크게 · 잘 맞추면 펄쩍
    crowd.forEach((p) => {
      animateChibi(p.c, fever && p.mode === 'sway' ? 'dance' : p.mode, t, { phase: p.phase });
      p.c.root.position.y = jump * 0.35 * Math.abs(Math.sin(p.phase + t * 9)) + hype * 0.06 * onBeat;
    });
    // 처음 들어와서는 두리번, 춤출 때는 같이 춤
    for (const [k, p] of Object.entries(pals)) animateChibi(p, palMode, t, { phase: k === 'chiikawa' ? 0 : 1.7 });
    if (me) {
      meT = Math.max(0, meT - dt);
      animateChibi(me, meT > 0 ? meMode : palMode === 'dance' ? 'sway' : 'idle', t, { phase: 0.6 });
    }
    // 카메라: 들어서면 천천히 다가가고, 살짝 흔들린다
    const k = Math.min(1, pt / 2.5), ease = k * k * (3 - 2 * k);
    camPos.set(Math.sin(t * 0.25) * 0.5, 3.4 + (1 - ease) * 1.2, 8.4 - ease * 0.9);
    camLook.set(0, 1.55, -1.8);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  return {
    scene,
    camera,
    light,
    get phase() { return phase; },
    /** 새로 들어간다: 내 생김새 look, withTunnel 이면 터널부터(아니면 바로 클럽), pals 면 치이카와 · 하치와레도 같이. */
    start(look, { withTunnel = true, pals: withPals = true } = {}) {
      Object.values(pals).forEach((p) => { p.root.visible = withPals; });
      walkers.chiikawa.root.visible = walkers.hachiware.root.visible = withPals;
      if (me) hall.remove(me.root);
      if (tme) tunnel.remove(tme.root);
      me = buildChibi(look);
      tme = buildChibi(look);
      hall.add(me.root);
      tunnel.add(tme.root);
      placeHall();
      phase = withTunnel ? 'tunnel' : 'club';
      pt = 0; hype = 0.3; fever = false; palMode = 'look'; meMode = 'idle';
    },
    /** 터널 끝 문이 열리고 클럽으로. */
    reveal() { phase = 'club'; pt = 0; },
    /** 터널을 다 걸었는지. */
    get tunnelDone() { return phase === 'tunnel' && pt >= TUNNEL_SEC; },
    /** 손님들 흥(0..1). */
    setHype(v) { hype = Math.max(0, Math.min(1, v)); },
    get hype() { return hype; },
    /** 박자를 잘 맞췄을 때: 손님들이 펄쩍. */
    cheer(big = false) { jump = big ? 1 : 0.6; },
    setFever(on) { fever = on; },
    /** 친구들 몸짓('look' 두리번 · 'dance' 춤 · 'cheer' 만세 · 'shy' …). */
    setPals(mode) { palMode = mode; },
    meDance(sec = 0.45, mode = 'dance') { meMode = mode; meT = sec; },
    /** 우사기 · 친구 · 나의 머리 위(말풍선 자리, 클럽 좌표). */
    anchor(who) {
      if (who === 'usagi') return { x: 0, y: STAGE_Y + usagi.height * 1.2 + 0.5, z: -4.35 };
      const s = HALL_SPOTS[who] || HALL_SPOTS.me;
      return { x: s[0], y: (pals[who] ? pals[who].height : me ? me.height : 1.2) + 0.45, z: s[1] };
    },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 62 : 42;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      pt += dt;
      jump = Math.max(0, jump - dt * 2.5);
      const onBeat = Math.pow(1 - ((t / BEAT) % 1), 3); // 박자 처음에 번쩍 하고 잦아든다
      const ci = Math.floor(t / BEAT) % NEON.length;
      // 캐릭터 빛: 네온 색이 박자마다 돈다(어두운 클럽 속 알록달록)
      light.set(NEON[ci]).lerp(WHITE, 0.55 + 0.15 * onBeat).multiplyScalar(phase === 'tunnel' ? 0.55 : 0.85 + 0.15 * onBeat);
      if (phase === 'tunnel') updateTunnel(t, onBeat);
      else updateHall(dt, t, onBeat, ci);
    }
  };
}
