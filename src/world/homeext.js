import * as THREE from 'three';
import { toonMaterial, toonMesh, GEO } from '../render/toon.js';
import { mergeUnit } from '../render/batch.js';

/**
 * 내 집 바깥 모습(게임 오리지널): 부동산에서 집을 넓힐수록 더 화려해진다(core/home.js 의 크기 번호).
 *  0 처음 방: 하얀 돔 집(마을이 처음부터 세운 그대로)
 *  1 넓은 방: 박공지붕 · 굴뚝 · 덧창 · 꽃 상자 · 작은 현관 지붕이 있는 아담한 집
 *  2 큰 방: 기둥 현관 위 발코니 · 가운데 박공과 둥근 창 · 굴뚝 둘 · 다듬은 나무와 정원 등불이 있는 2층 저택
 * 넓힌 집은 처음 보일 때 짓고(마을 정적 배칭이 끝난 뒤라 따로 합친다), 돔은 숨기고 그 장애물은 끈다.
 * 문 앞(village.spots.home)과 이름표 자리도 그 집에 맞춘다. 내 캐릭터를 가리면 마을 집처럼 반투명해진다.
 * village: buildVillage 가 돌려준 것(myHome · obstacles · group · addWindow · refreshNav · spots).
 */
const PYRAMID = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0).rotateY(Math.PI / 4); // 네모 모임지붕(면이 앞 · 옆을 본다)
const ARCH = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2); // 위쪽 반원(앞뒤 두께 1)
/** 세모 박공(밑변 w · 높이 h · 두께 d, 밑변 가운데가 원점, 뒤에서 앞(+z)으로 d 만큼). */
function gableGeo(w, h, d) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0);
  sh.lineTo(w / 2, 0);
  sh.lineTo(0, h);
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
}

export function createHomeExterior(village) {
  const H = village.myHome;
  if (!H) return { show: () => false, update() {}, signAt: () => null, tier: () => 0 };
  const { lot } = H, baseDoor = { ...H.door }, baseSign = { ...H.label };
  const built = {};
  let shown = 0;

  /** 한 채: 부품은 집마다 따로 둔 재질로 합친다(가리면 이 집만 반투명해지게). 창유리는 밤에 불이 들어온다. */
  function unit() {
    const g = new THREE.Group();
    g.position.set(lot.x, 0, lot.z);
    const vc = toonMaterial('#ffffff', { unique: true, vertexColors: true });
    const glass = toonMaterial('#cfe9f5', { unique: true });
    const gold = toonMaterial('#f2c94c', { unique: true });
    const parts = [], obs = [];
    const P = (geo, color, opts = {}) => { const m = toonMesh(geo, color, opts); g.add(m); parts.push(m); return m; };
    const G = (geo, opts = {}) => { const m = toonMesh(geo, null, { ...opts, material: glass, shadow: false }); g.add(m); parts.push(m); return m; };
    const Au = (geo, opts = {}) => { const m = toonMesh(geo, null, { ...opts, material: gold }); g.add(m); parts.push(m); return m; };
    const block = (lx, lz, hx, hz) => obs.push({ x: lot.x + lx, z: lot.z + lz, box: { hx, hz, yaw: 0 } });
    const round = (lx, lz, r) => obs.push({ x: lot.x + lx, z: lot.z + lz, r });
    return { g, vc, glass, gold, parts, obs, P, G, Au, block, round };
  }
  function finish(u, door, sign, half) {
    const own = new Set([u.glass, u.gold]);
    const meshes = mergeUnit(u.g, u.parts, (m) => (own.has(m.material) ? { key: m.material.uuid, material: m.material, tint: null } : { key: 'vc', material: u.vc, tint: m.material.color }));
    village.group.add(u.g);
    for (const o of u.obs) village.obstacles.push(o);
    village.addWindow(u.glass);
    return { g: u.g, obs: u.obs, door, sign, half, mats: [u.vc, u.glass, u.gold], meshes, fade: 1 };
  }
  /** 창 하나(벽 앞면 z0 에 붙인다, 바깥이 +z): 흰 틀 · 유리 · 십자 창살, 덧창 색이 있으면 양옆에. */
  function windowAt(u, x, y, z0, w, h, shutter) {
    u.P(GEO.box, '#ffffff', { position: [x, y, z0 + 0.02], scale: [w + 0.1, h + 0.1, 0.05], shell: true, outline: 0.02 });
    u.G(GEO.box, { position: [x, y, z0 + 0.045], scale: [w, h, 0.03], outline: false });
    u.P(GEO.box, '#5a4431', { position: [x, y, z0 + 0.065], scale: [0.03, h, 0.012], outline: false, shadow: false });
    u.P(GEO.box, '#5a4431', { position: [x, y, z0 + 0.065], scale: [w, 0.03, 0.012], outline: false, shadow: false });
    if (shutter) [-1, 1].forEach((sd) => u.P(GEO.box, shutter, { position: [x + sd * (w / 2 + 0.13), y, z0 + 0.03], scale: [0.16, h + 0.06, 0.04], shell: true, outline: 0.015, shadow: false }));
  }

  /** 1 넓은 방: 아담한 집. */
  function cottage() {
    const u = unit(), { P, Au } = u;
    const W = 2.6, D = 2.0, WH = 1.6, pitch = 0.62, over = 0.2;
    const cream = '#fbf3e4', roof = '#d9675b', wood = '#8a5a3c', brick = '#c46a4f';
    P(GEO.box, '#d6cdbf', { position: [0, 0.1, 0], scale: [W + 0.14, 0.2, D + 0.14], shell: true, outline: 0.03 });
    P(GEO.box, cream, { position: [0, 0.2 + (WH - 0.2) / 2, 0], scale: [W, WH - 0.2, D], shell: true, outline: 0.04, receive: true });
    // 박공(앞뒤 세모 벽)과 지붕 두 장 · 용마루
    const rise = (D / 2) * Math.tan(pitch), run = D / 2 + over, L = run / Math.cos(pitch);
    const gable = gableGeo(W, rise, 0.08);
    P(gable, cream, { position: [0, WH, D / 2 - 0.08], outline: 0.03 });
    P(gable, cream, { position: [0, WH, -D / 2], outline: 0.03 });
    [1, -1].forEach((sd) => P(GEO.box, roof, { position: [0, WH + rise - (run / 2) * Math.tan(pitch) + 0.06, sd * run / 2], rotation: [sd * pitch, 0, 0], scale: [W + 0.4, 0.12, L], shell: true, outline: 0.035 }));
    P(GEO.box, '#b24e44', { position: [0, WH + rise + 0.08, 0], scale: [W + 0.44, 0.1, 0.16], shell: true, outline: 0.02 });
    // 굴뚝(뒤 지붕)
    P(GEO.box, brick, { position: [0.75, WH + rise * 0.55 + 0.3, -0.42], scale: [0.32, 0.95, 0.32], shell: true, outline: 0.025 });
    P(GEO.box, '#8a4636', { position: [0.75, WH + rise * 0.55 + 0.8, -0.42], scale: [0.4, 0.08, 0.4], shell: true, outline: 0.02 });
    // 문 · 문틀 · 손잡이 · 작은 현관 지붕 · 디딤돌
    const fz = D / 2;
    P(GEO.box, '#ffffff', { position: [0, 0.2 + 0.56, fz + 0.015], scale: [0.72, 1.14, 0.04], shell: true, outline: 0.02 });
    P(GEO.box, wood, { position: [0, 0.2 + 0.52, fz + 0.04], scale: [0.56, 1.04, 0.05], shell: true, outline: 0.02 });
    Au(GEO.dot, { position: [0.18, 0.72, fz + 0.08], scale: [0.04, 0.04, 0.04], outline: 0.01 });
    P(GEO.box, roof, { position: [0, 1.42, fz + 0.24], rotation: [0.28, 0, 0], scale: [0.98, 0.07, 0.5], shell: true, outline: 0.02 });
    [-0.42, 0.42].forEach((x) => P(GEO.box, wood, { position: [x, 1.28, fz + 0.2], rotation: [0.6, 0, 0], scale: [0.05, 0.05, 0.36], outline: false, shadow: false }));
    P(GEO.box, '#e7e1d6', { position: [0, 0.05, fz + 0.38], scale: [0.95, 0.1, 0.42], shell: true, outline: 0.02, receive: true });
    // 앞 창 둘(초록 덧창 · 꽃 상자), 옆 창 하나씩
    [-0.86, 0.86].forEach((x) => {
      windowAt(u, x, 0.98, fz, 0.46, 0.46, '#7fb27a');
      P(GEO.box, wood, { position: [x, 0.66, fz + 0.1], scale: [0.6, 0.14, 0.18], shell: true, outline: 0.02 });
      ['#ffa8c6', '#ffe36e', '#ffffff', '#ff9a9a'].forEach((c, i) => P(GEO.dot, c, { position: [x - 0.21 + i * 0.14, 0.77, fz + 0.12], scale: [0.06, 0.05, 0.06], outline: 0.01, shadow: false }));
    });
    [-1, 1].forEach((sd) => {
      const s = new THREE.Group();
      s.position.set(sd * (W / 2), 0, 0);
      s.rotation.y = sd * Math.PI / 2;
      u.g.add(s);
      const su = { ...u, P: (geo, c, o) => { const m = toonMesh(geo, c, o); s.add(m); u.parts.push(m); return m; }, G: (geo, o) => { const m = toonMesh(geo, null, { ...o, material: u.glass, shadow: false }); s.add(m); u.parts.push(m); return m; } };
      windowAt(su, 0, 1.0, 0, 0.42, 0.42, null);
    });
    // 양옆 둥근 덤불
    [-1, 1].forEach((sd) => P(GEO.sphere, '#7cc46a', { position: [sd * (W / 2 + 0.22), 0.28, 0.55], scale: [0.34, 0.3, 0.34], outline: 0.025 }));
    u.block(0, 0, W / 2 + 0.2, D / 2 + 0.12);
    return finish(u, { x: lot.x, z: lot.z + D / 2 + 0.9 }, { x: lot.x, y: 2.5, z: lot.z + D / 2 + 0.25 }, { w: W / 2 + 0.4, d: D / 2, tall: 3 });
  }

  /** 2 큰 방: 2층 저택. */
  function mansion() {
    const u = unit(), { P, G, Au } = u;
    const W = 3.8, D = 2.4, F1 = 1.35, F2 = 2.6, cw = 1.6, cd = 0.35, pd = 0.85; // 몸 폭 · 깊이 · 층 높이 · 가운데 현관 동 폭 · 튀어나온 깊이 · 기둥 현관 깊이
    const ivory = '#fdf6ea', trim = '#ffffff', stone = '#cfc6b8', roofC = '#4f6b9a', wood = '#6b4226', blue = '#5b7fb0', brick = '#b8604a';
    const fz = D / 2, cz = fz + cd, pz = cz + pd; // 몸 앞면 · 현관 동 앞면 · 기둥 현관 앞끝
    // 받침 · 몸통 · 층 띠 · 처마 돌림띠 · 모임지붕 · 금 꼭지
    P(GEO.box, stone, { position: [0, 0.15, 0], scale: [W + 0.2, 0.3, D + 0.2], shell: true, outline: 0.03 });
    P(GEO.box, ivory, { position: [0, 0.3 + (F2 - 0.3) / 2, 0], scale: [W, F2 - 0.3, D], shell: true, outline: 0.045, receive: true });
    P(GEO.box, trim, { position: [0, F1, 0], scale: [W + 0.06, 0.08, D + 0.06], outline: false, shadow: false });
    P(GEO.box, trim, { position: [0, F2, 0], scale: [W + 0.24, 0.14, D + 0.24], shell: true, outline: 0.025 });
    P(PYRAMID, roofC, { position: [0, F2 + 0.07, 0], scale: [(W / 2 + 0.22) / Math.SQRT1_2, 1.15, (D / 2 + 0.22) / Math.SQRT1_2], shell: true, outline: 0.04 });
    Au(GEO.sphere, { position: [0, F2 + 1.28, 0], scale: [0.11, 0.11, 0.11], outline: 0.015 });
    // 굴뚝 둘
    [-1.3, 1.3].forEach((x) => {
      P(GEO.box, brick, { position: [x, F2 + 0.5, -0.35], scale: [0.34, 1.0, 0.34], shell: true, outline: 0.025 });
      P(GEO.box, '#8a4636', { position: [x, F2 + 1.02, -0.35], scale: [0.42, 0.08, 0.42], shell: true, outline: 0.02 });
    });
    // 가운데 현관 동: 몸보다 조금 높고 위에 세모 박공 · 금테 둥근 창
    const ch = F2 + 0.2;
    P(GEO.box, ivory, { position: [0, 0.3 + (ch - 0.3) / 2, fz + cd / 2], scale: [cw, ch - 0.3, cd], shell: true, outline: 0.035 });
    P(GEO.box, trim, { position: [0, ch, fz + cd / 2], scale: [cw + 0.16, 0.12, cd + 0.14], shell: true, outline: 0.02 });
    P(gableGeo(cw + 0.16, 0.62, cd + 0.1), ivory, { position: [0, ch + 0.06, fz - 0.03], outline: 0.03 });
    Au(GEO.cylinder, { position: [0, ch + 0.3, cz + 0.08], rotation: [Math.PI / 2, 0, 0], scale: [0.2, 0.04, 0.2], outline: 0.012 });
    G(GEO.cylinder, { position: [0, ch + 0.3, cz + 0.1], rotation: [Math.PI / 2, 0, 0], scale: [0.15, 0.03, 0.15], outline: false });
    // 기둥 현관: 돌 바닥 위 흰 기둥 넷이 2층 발코니를 받친다
    P(GEO.box, stone, { position: [0, 0.12, cz + pd / 2], scale: [2.3, 0.24, pd], shell: true, outline: 0.025, receive: true });
    [-0.95, -0.5, 0.5, 0.95].forEach((x) => {
      P(GEO.cylinder, trim, { position: [x, 0.24, pz - 0.14], scale: [0.08, F1 - 0.3, 0.08], outline: 0.02 });
      P(GEO.box, trim, { position: [x, F1 - 0.08, pz - 0.14], scale: [0.2, 0.08, 0.2], outline: false, shadow: false });
      P(GEO.box, trim, { position: [x, 0.28, pz - 0.14], scale: [0.2, 0.08, 0.2], outline: false, shadow: false });
    });
    P(GEO.box, trim, { position: [0, F1, cz + pd / 2], scale: [2.4, 0.12, pd + 0.1], shell: true, outline: 0.025 });
    // 발코니 난간(금빛 손잡이 · 흰 난간 기둥)
    Au(GEO.box, { position: [0, F1 + 0.46, pz - 0.02], scale: [2.36, 0.045, 0.05], outline: 0.01 });
    [-1, 1].forEach((sd) => Au(GEO.box, { position: [sd * 1.18, F1 + 0.46, cz + pd / 2], scale: [0.05, 0.045, pd], outline: 0.01 }));
    for (let k = 0; k < 11; k++) P(GEO.box, trim, { position: [-1.1 + k * 0.22, F1 + 0.24, pz - 0.02], scale: [0.04, 0.4, 0.04], outline: false, shadow: false });
    // 2층 발코니 문(위가 둥근 유리문) · 1층 두 짝 대문(위에 반달 창)
    P(GEO.box, trim, { position: [0, F1 + 0.5, cz + 0.015], scale: [0.78, 0.82, 0.04], shell: true, outline: 0.02 });
    G(GEO.box, { position: [0, F1 + 0.45, cz + 0.04], scale: [0.62, 0.62, 0.03], outline: false });
    G(ARCH, { position: [0, F1 + 0.76, cz + 0.025], scale: [0.31, 0.31, 0.03], outline: false });
    P(GEO.box, '#ffffff', { position: [0, 0.3 + 0.62, cz + 0.015], scale: [0.98, 1.24, 0.04], shell: true, outline: 0.02 });
    [-0.21, 0.21].forEach((x) => {
      P(GEO.box, wood, { position: [x, 0.3 + 0.55, cz + 0.04], scale: [0.4, 1.1, 0.05], shell: true, outline: 0.02 });
      Au(GEO.dot, { position: [x - Math.sign(x) * 0.12, 0.88, cz + 0.08], scale: [0.04, 0.04, 0.04], outline: 0.01 });
    });
    G(ARCH, { position: [0, 0.3 + 1.12, cz + 0.03], scale: [0.4, 0.26, 0.03], outline: false });
    // 창: 1층 · 2층 양쪽 둘씩(파란 덧창)
    for (const x of [-1.6, -1.12, 1.12, 1.6]) for (const y of [0.85, 1.95]) windowAt(u, x, y, fz, 0.32, 0.56, Math.abs(x) > 1.4 ? blue : null);
    // 계단(현관 앞)
    P(GEO.box, stone, { position: [0, 0.07, pz + 0.22], scale: [1.5, 0.14, 0.44], shell: true, outline: 0.02, receive: true });
    // 정원: 화분에 다듬은 나무 둘 · 등불 둘 · 앞 화단
    [-1, 1].forEach((sd) => {
      P(GEO.cylinder, '#c98a5a', { position: [sd * 1.55, 0, fz + 0.55], scale: [0.24, 0.32, 0.24], outline: 0.02 });
      P(GEO.cone, '#5f9e5a', { position: [sd * 1.55, 0.32, fz + 0.55], scale: [0.3, 0.95, 0.3], outline: 0.025 });
      Au(GEO.dot, { position: [sd * 1.55, 1.3, fz + 0.55], scale: [0.05, 0.05, 0.05], outline: 0.01 });
      P(GEO.cylinder, '#3a3236', { position: [sd * 1.3, 0, pz + 0.45], scale: [0.04, 1.05, 0.04], outline: 0.015 });
      P(GEO.box, '#3a3236', { position: [sd * 1.3, 1.05, pz + 0.45], scale: [0.2, 0.05, 0.2], outline: 0.012, shadow: false });
      G(GEO.sphere, { position: [sd * 1.3, 1.18, pz + 0.45], scale: [0.1, 0.12, 0.1], outline: 0.012 });
      for (let i = 0; i < 4; i++) P(GEO.dot, ['#ffa8c6', '#ffe36e', '#c9a8ff', '#ffffff'][i], { position: [sd * (1.25 + (i % 2) * 0.22), 0.16, fz + 0.12 + Math.floor(i / 2) * 0.12], scale: [0.07, 0.06, 0.07], outline: 0.01, shadow: false });
    });
    u.block(0, 0, W / 2 + 0.12, D / 2 + 0.12);
    u.block(0, fz + (cd + pd) / 2, 1.2, (cd + pd) / 2 + 0.05); // 가운데 동 · 기둥 현관(문 앞 계단에서 들어간다)
    [-1, 1].forEach((sd) => { u.round(sd * 1.55, fz + 0.55, 0.3); u.round(sd * 1.3, pz + 0.45, 0.18); });
    return finish(u, { x: lot.x, z: lot.z + pz + 0.8 }, { x: lot.x, y: 2.5, z: lot.z + cz + 0.3 }, { w: W / 2 + 0.3, d: D / 2, tall: 4.2 });
  }

  /** 집 크기(0 · 1 · 2)대로 보인다. 바뀌었으면 true. */
  function show(size) {
    const tier = Math.max(0, Math.min(2, size | 0));
    if (tier === shown) return false;
    shown = tier;
    if (tier && !built[tier]) built[tier] = tier === 1 ? cottage() : mansion();
    H.group.visible = tier === 0;
    H.obs.forEach((o) => { o.off = tier !== 0; });
    for (const k of [1, 2]) {
      const b = built[k];
      if (!b) continue;
      b.g.visible = tier === k;
      b.obs.forEach((o) => { o.off = tier !== k; });
    }
    Object.assign(village.spots.home, tier ? built[tier].door : baseDoor); // 문 앞 자리(들어가기 · 집 앞에서 깨기 …)는 그 집 문으로
    village.refreshNav();
    return true;
  }

  return {
    show,
    /** 지금 보이는 집의 크기 번호. */
    tier: () => shown,
    /** 이름표 자리 { x, y, z }(그 집 앞면 처마 언저리). */
    signAt: () => (shown ? built[shown].sign : baseSign),
    /** 매 프레임: 넓힌 집이 내 캐릭터를 가리면 마을 집처럼 반투명하게. */
    update(dt, focus) {
      const b = shown && built[shown];
      if (!b || !focus) return;
      const dz = b.g.position.z - focus.z, dx = Math.abs(b.g.position.x - focus.x);
      const hiding = dz > -0.6 && dz < b.half.d + b.half.tall + 1.5 && dx < b.half.w + 0.9;
      if (!hiding && b.fade === 1) return;
      const f = b.fade + ((hiding ? 0.3 : 1) - b.fade) * Math.min(1, dt * 8);
      b.fade = f > 0.995 ? 1 : f;
      b.mats.forEach((m) => {
        m.opacity = b.fade;
        m.depthWrite = b.fade > 0.95;
        if (m.transparent !== b.fade < 1) { m.transparent = b.fade < 1; m.needsUpdate = true; }
      });
      b.meshes.forEach((m) => { for (const c of m.children) c.visible = b.fade > 0.95; });
    }
  };
}
