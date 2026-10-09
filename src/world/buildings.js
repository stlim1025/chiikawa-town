import * as THREE from 'three';
import { GEO } from '../render/toon.js';

/**
 * 마을 건물 모양(가게 · 친구 집마다 따로): 같은 상자 집에 간판만 얹는 대신 벽 · 지붕 · 앞면 생김새부터 다르게 짓는다.
 * 모든 건물은 남쪽(+z, 카메라 쪽)을 보고, 들어가는 곳은 앞면 가운데 근처다. 바닥 넓이는 layout 의 반지름 안.
 * 각 모양은 ctx = { s, part(geo, color, opts), block(x, z, r), glow(mesh), ROOF } 를 받아 그리고 { H: 가장 높은 곳 } 을 돌려준다.
 * part 로 만든 조각은 그 건물 전용 재질이라, 내 캐릭터를 가리면 함께 반투명해진다. glow 한 조각(재질)은 밤에 불이 들어온다.
 */

// ---------- 도형(바닥 가운데가 원점, 폭 · 깊이 · 높이 1) ----------
function tris(points) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  g.computeVertexNormals();
  return g;
}
/** 우진각 지붕: 네 면이 모두 기울고 용마루는 짧다(x 방향). */
const HIP = (() => {
  const r = 0.26, A = [-0.5, 0, 0.5], B = [0.5, 0, 0.5], C = [0.5, 0, -0.5], D = [-0.5, 0, -0.5], R1 = [-r, 1, 0], R2 = [r, 1, 0];
  return tris([A, B, R2, A, R2, R1, C, D, R1, C, R1, R2, B, C, R2, D, A, R1, A, D, C, A, C, B]);
})();
function prism(pts) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(([a, b]) => sh.lineTo(a, b));
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}
/** 꺾인 헛간 지붕(갬브럴): 이 단면이 앞(+z)을 보고, 앞뒤로 늘어난다. */
const BARN = prism([[-0.5, 0], [0.5, 0], [0.4, 0.5], [0.17, 0.82], [-0.17, 0.82], [-0.4, 0.5]]);
/** 외쪽 지붕 밑 옆벽: 뒤(-z)가 높은 쐐기. */
const WEDGE = prism([[-0.5, 0], [0.5, 0], [0.5, 1]]).rotateY(Math.PI / 2);
/** 네모뿔(시계탑 지붕). */
const PYRAMID = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
/** 앞을 보는 동그란 판(시계 · 둥근 창). */
const DISC = new THREE.CylinderGeometry(1, 1, 1, 24).rotateX(Math.PI / 2);
/** 위가 둥근 문(아래가 원점, 폭 1 · 높이 1.6 · 두께 1). */
const ARCH = (() => {
  const sh = new THREE.Shape();
  sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0.5, 1.1); sh.absarc(0, 1.1, 0.5, 0, Math.PI, false); sh.lineTo(-0.5, 0);
  return new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -0.5);
})();
const TORUS = new THREE.TorusGeometry(1, 0.22, 8, 22);
const NOOUT = { outline: false, shadow: false };

/** 앞(+z)을 보는 삼각형(박공 · 그림 지붕): 박공 지붕 도형을 돌려 쓴다. w 폭 · h 높이 · d 두께. */
function gable(ctx, c, x, y, z, w, h, d, o = NOOUT) {
  return ctx.part(ctx.ROOF, c, { position: [x, y, z], rotation: [0, Math.PI / 2, 0], scale: [d, h, w], ...o });
}
/** 김 · 연기 몽글몽글. */
function puffs(part, x, y, z, color = '#fffaf0') {
  [[0, 0, 0.13], [0.1, 0.24, 0.1], [-0.04, 0.45, 0.08]].forEach(([dx, dy, r]) => part(GEO.sphere, color, { position: [x + dx, y + dy, z], scale: [r, r, r], outline: 0.012, shadow: false }));
}
/** 둥근 벽(원기둥) 위 각도 a 자리에 붙인 둥근 창. */
function roundWindow(ctx, R, a, y, r, frame) {
  const x = Math.sin(a) * (R + 0.015), z = Math.cos(a) * (R + 0.015);
  ctx.glow(ctx.part(DISC, '#c6e7f5', { position: [x, y, z], rotation: [0, a, 0], scale: [r, r, 0.03], ...NOOUT }));
  ctx.part(TORUS, frame, { position: [x, y, z], rotation: [0, a, 0], scale: [r * 1.05, r * 1.05, 0.08], outline: 0.01, shadow: false });
}
const BOOKS = ['#c0504d', '#6f94bb', '#e0b53c', '#7fbf7f', '#b58ad6', '#f28fb0', '#e8e0cf', '#8a6240'];

export const DESIGNS = {
  // ---------- 라멘 로우: 낮고 넓은 일본식 가게. 짙은 기와 우진각 지붕, 앞이 트인 카운터 · 노렌, 격자 미닫이문, 지붕 앞 큰 나무 간판 ----------
  ramen(ctx) {
    const { s, part, block, glow } = ctx;
    const W = 2.5 * s, D = 1.7 * s, H = 1.25 * s, F = D / 2, wood = '#5a3a26';
    part(GEO.box, '#f6e8cf', { position: [0, H / 2, 0], scale: [W, H, D], receive: true, shell: true });
    part(GEO.box, '#6b4630', { position: [0, 0.16 * s, 0], scale: [W + 0.04, 0.32 * s, D + 0.04], shell: true, shadow: false });
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => part(GEO.box, wood, { position: [sx * W / 2, H / 2, sz * D / 2], scale: [0.12 * s, H, 0.12 * s], shell: true, outline: 0.015, shadow: false }));
    part(GEO.box, wood, { position: [0, H - 0.06 * s, F + 0.03], scale: [W + 0.1, 0.12 * s, 0.1], shell: true, outline: 0.015, shadow: false });
    // 기와 지붕 + 용마루
    part(HIP, '#3f4757', { position: [0, H, 0], scale: [W + 0.75, 0.8 * s, D + 0.8], shell: true, outline: 0.03 });
    part(GEO.box, '#2e3440', { position: [0, H + 0.8 * s, 0], scale: [(W + 0.75) * 0.52 + 0.1, 0.09 * s, 0.16], shell: true, outline: 0.015 });
    // 앞이 트인 카운터: 어두운 가게 안 · 나무 카운터 · 김 나는 솥 · 그릇
    const ox = W * 0.12, ow = W * 0.6;
    part(GEO.box, '#3a2a22', { position: [ox, (0.42 * s + H - 0.12 * s) / 2, F + 0.01], scale: [ow, H - 0.54 * s, 0.03], ...NOOUT });
    part(GEO.box, '#c49a6c', { position: [ox, 0.44 * s, F + 0.16], scale: [ow + 0.06, 0.1 * s, 0.36], shell: true, outline: 0.015 });
    part(GEO.cylinder, '#b9c0c9', { position: [ox - ow * 0.32, 0.49 * s, F + 0.12], scale: [0.14, 0.2, 0.14], outline: 0.012, shadow: false });
    puffs(part, ox - ow * 0.32, 0.8 * s, F + 0.12);
    [0.05, 0.25].forEach((dx) => part(GEO.sphere, '#d9473b', { position: [ox + dx, 0.52 * s, F + 0.22], scale: [0.09, 0.06, 0.09], outline: 0.01, shadow: false }));
    // 노렌(남색 천 다섯 · 가운데 흰 동그라미)
    const nw = ow / 5;
    for (let i = 0; i < 5; i++) part(GEO.box, '#34436e', { position: [ox - ow / 2 + nw * (i + 0.5), H - 0.33 * s, F + 0.08], scale: [nw * 0.9, 0.36 * s, 0.02], shell: true, outline: 0.01, shadow: false });
    part(GEO.dot, '#ffffff', { position: [ox, H - 0.3 * s, F + 0.1], scale: [0.07, 0.07, 0.01], ...NOOUT });
    // 격자 미닫이문(왼쪽): 나무틀 · 창호지 · 살
    const dx0 = -W * 0.33, dw = W * 0.22, dh = H * 0.74;
    part(GEO.box, '#c49a6c', { position: [dx0, dh / 2 + 0.02, F + 0.03], scale: [dw, dh, 0.05], shell: true, outline: 0.015, shadow: false });
    glow(part(GEO.box, '#fbf6e9', { position: [dx0, dh / 2 + 0.02, F + 0.06], scale: [dw * 0.84, dh * 0.88, 0.02], ...NOOUT }));
    [-0.25, 0, 0.25].forEach((fx) => part(GEO.box, '#8a6240', { position: [dx0 + fx * dw, dh / 2 + 0.02, F + 0.075], scale: [0.015, dh * 0.88, 0.01], ...NOOUT }));
    [0.25, 0.5, 0.75].forEach((fy) => part(GEO.box, '#8a6240', { position: [dx0, 0.02 + dh * fy, F + 0.075], scale: [dw * 0.84, 0.015, 0.01], ...NOOUT }));
    // 지붕 앞 큰 나무 간판(빨간 그릇 그림 + 글자 획)
    const ky = H + 0.4 * s, kz = F + 0.12, tilt = [-0.3, 0, 0];
    part(GEO.box, wood, { position: [ox, ky, kz], rotation: tilt, scale: [W * 0.56, 0.36 * s, 0.06], shell: true, outline: 0.02 });
    part(GEO.box, '#f0d59c', { position: [ox, ky, kz + 0.035], rotation: tilt, scale: [W * 0.5, 0.29 * s, 0.03], ...NOOUT });
    part(GEO.sphere, '#d9473b', { position: [ox - W * 0.17, ky - 0.03, kz + 0.06], rotation: tilt, scale: [0.12, 0.08, 0.04], outline: 0.01, shadow: false });
    [[-0.04, 0.03], [0.07, 0.01], [0.18, 0.03]].forEach(([dx, dy]) => part(GEO.box, '#3a2a22', { position: [ox + dx * W, ky + dy, kz + 0.06], rotation: tilt, scale: [0.04, 0.2 * s, 0.01], ...NOOUT }));
    // 처마 끝 빨간 초롱(밤에 켜진다) · 지붕 굴뚝 김
    [-1, 1].forEach((sx) => {
      part(GEO.box, '#3a2a22', { position: [sx * (W / 2 + 0.05), H * 0.88, F + 0.2], scale: [0.03, 0.12, 0.03], ...NOOUT });
      glow(part(GEO.sphere, '#ee5a4a', { position: [sx * (W / 2 + 0.05), H * 0.68, F + 0.2], scale: [0.14, 0.2, 0.14], outline: 0.018, shadow: false }));
    });
    part(GEO.cylinder, '#8a8f98', { position: [-W * 0.3, H + 0.2 * s, -D * 0.2], scale: [0.08, 0.9 * s, 0.08], outline: 0.015 });
    puffs(part, -W * 0.3, H + 1.2 * s, -D * 0.2);
    // 손님 긴 의자(왼쪽 앞) · 입간판 메뉴판(오른쪽 앞)
    const bx = -W * 0.56, bz = F + 0.55;
    part(GEO.box, '#c49a6c', { position: [bx, 0.25, bz], scale: [0.66, 0.08, 0.28], shell: true });
    [-0.26, 0.26].forEach((fx) => part(GEO.box, '#a77a52', { position: [bx + fx, 0.11, bz], scale: [0.06, 0.22, 0.22], shell: true, shadow: false }));
    block(bx, bz, 0.4);
    const mx = W * 0.5, mz = F + 0.62;
    [0.22, -0.22].forEach((rx) => part(GEO.box, '#4a3b33', { position: [mx, 0.36, mz + rx * 0.35], rotation: [rx, 0, 0], scale: [0.42, 0.72, 0.04], shell: true, outline: 0.015 }));
    [0.5, 0.4, 0.3].forEach((y) => part(GEO.box, '#f5ead2', { position: [mx, y, mz + 0.1], rotation: [0.22, 0, 0], scale: [0.26, 0.03, 0.01], ...NOOUT }));
    block(mx, mz, 0.32);
    return { H: H + 1.0 * s };
  },

  // ---------- 가구점: 꺾인 지붕의 목공 헛간. 판자벽, 빨간 헛간 문 둘(흰 X 버팀), 양쪽 진열창, 박공의 둥근 창, 앞에 소파 · 목재 더미 ----------
  furniture(ctx) {
    const { s, part, block, glow } = ctx;
    const W = 2.3 * s, D = 1.8 * s, H = 1.15 * s, F = D / 2, plank = '#e8c79a';
    part(GEO.box, plank, { position: [0, H / 2, 0], scale: [W, H, D], receive: true, shell: true });
    for (let i = 1; i < 10; i++) part(GEO.box, '#cfa775', { position: [-W / 2 + (W / 10) * i, H / 2, F + 0.005], scale: [0.02, H, 0.01], ...NOOUT });
    [-1, 1].forEach((sx) => part(GEO.box, '#ffffff', { position: [sx * (W / 2 - 0.04), H / 2, F + 0.02], scale: [0.08, H, 0.04], shell: true, outline: 0.01, shadow: false }));
    // 헛간 지붕(민트) + 앞 박공벽(판자, 지붕 테두리가 보이게 조금 작게) + 둥근 창
    const RW = W + 0.3, RH = 1.15 * s, RF = F + 0.15, k = (W - 0.12) / RW;
    part(BARN, '#7fcdb2', { position: [0, H, 0], scale: [RW, RH, D + 0.3], shell: true, outline: 0.03 });
    part(BARN, plank, { position: [0, H + 0.01, RF + 0.015], scale: [RW * k, RH * k, 0.03], ...NOOUT });
    [-0.3, 0, 0.3].forEach((fx) => part(GEO.box, '#cfa775', { position: [fx * RW * k, H + RH * k * 0.36, RF + 0.035], scale: [0.02, RH * k * 0.7, 0.01], ...NOOUT }));
    glow(part(DISC, '#c6e7f5', { position: [0, H + 0.45 * s, RF + 0.04], scale: [0.19 * s, 0.19 * s, 0.03], ...NOOUT }));
    part(TORUS, '#ffffff', { position: [0, H + 0.45 * s, RF + 0.045], scale: [0.2 * s, 0.2 * s, 0.1], outline: 0.01, shadow: false });
    // 헛간 문 둘(빨강 + 흰 테 + 흰 X 버팀)
    const dw = 0.44 * s, dh = 0.92 * s, diag = Math.atan2(dw, dh), dl = Math.hypot(dw, dh) * 0.92;
    part(GEO.box, '#ffffff', { position: [0, dh / 2 + 0.02, F + 0.02], scale: [dw * 2 + 0.08, dh + 0.06, 0.04], shell: true, outline: 0.012, shadow: false });
    [-1, 1].forEach((sx) => {
      const x = sx * (dw / 2 + 0.01);
      part(GEO.box, '#c4564a', { position: [x, dh / 2, F + 0.045], scale: [dw - 0.02, dh - 0.04, 0.03], ...NOOUT });
      [diag, -diag].forEach((rz) => part(GEO.box, '#ffffff', { position: [x, dh / 2, F + 0.065], rotation: [0, 0, rz], scale: [0.035, dl, 0.01], ...NOOUT }));
    });
    // 문 위 작은 간판(의자 그림)
    part(GEO.box, '#fff4de', { position: [0, (dh + H) / 2 + 0.02, F + 0.04], scale: [0.62 * s, (H - dh) * 0.62, 0.04], shell: true, outline: 0.012, shadow: false });
    part(GEO.box, '#b98a5e', { position: [-0.02, (dh + H) / 2 + 0.0, F + 0.065], scale: [0.12, 0.025, 0.01], ...NOOUT });
    part(GEO.box, '#b98a5e', { position: [-0.075, (dh + H) / 2 + 0.035, F + 0.065], scale: [0.025, 0.09, 0.01], ...NOOUT });
    // 양쪽 진열창(밤에 켜진다) · 창 안 작은 의자
    [-1, 1].forEach((sx) => {
      const x = sx * 0.8 * s;
      part(GEO.box, '#ffffff', { position: [x, 0.6 * s, F + 0.03], scale: [0.6 * s, 0.56 * s, 0.04], shell: true, outline: 0.012, shadow: false });
      glow(part(GEO.box, '#bfe4f2', { position: [x, 0.62 * s, F + 0.055], scale: [0.5 * s, 0.44 * s, 0.02], ...NOOUT }));
      part(GEO.box, '#b98a5e', { position: [x, 0.34 * s, F + 0.1], scale: [0.62 * s, 0.05, 0.14], shell: true, outline: 0.01, shadow: false });
      const c = sx < 0 ? '#f7a8c4' : '#9fd8c4';
      part(GEO.box, c, { position: [x, 0.47 * s, F + 0.07], scale: [0.16, 0.05, 0.02], ...NOOUT });
      part(GEO.box, c, { position: [x - 0.06, 0.55 * s, F + 0.07], scale: [0.04, 0.16, 0.02], ...NOOUT });
    });
    // 가게 앞: 오른쪽 분홍 소파 · 스탠드, 왼쪽 목재 더미 · 작업대
    const sx = W * 0.42, sz = F + 0.72;
    part(GEO.cylinder, '#cdb8f0', { position: [sx, 0.01, sz], scale: [0.62, 0.02, 0.42], outline: 0.015, receive: true, shadow: false });
    part(GEO.box, '#f7a8c4', { position: [sx, 0.24, sz], scale: [0.78, 0.22, 0.38], shell: true, outline: 0.02 });
    part(GEO.box, '#f7a8c4', { position: [sx, 0.48, sz - 0.16], scale: [0.78, 0.36, 0.1], shell: true, outline: 0.02 });
    [-0.38, 0.38].forEach((fx) => part(GEO.box, '#e5788f', { position: [sx + fx, 0.36, sz], scale: [0.1, 0.24, 0.38], shell: true, outline: 0.015, shadow: false }));
    part(GEO.cylinder, '#8f8174', { position: [sx + 0.62, 0, sz - 0.05], scale: [0.025, 0.85, 0.025], outline: 0.01, shadow: false });
    glow(part(GEO.cone, '#fff1a8', { position: [sx + 0.62, 0.78, sz - 0.05], scale: [0.2, 0.24, 0.2], outline: 0.015, shadow: false }));
    block(sx + 0.1, sz, 0.55);
    const lx = -W * 0.46, lz = F + 0.6;
    [0, 1, 2].forEach((i) => part(GEO.box, i === 1 ? '#d9b07a' : '#e6c08c', { position: [lx + (i - 1) * 0.04, 0.07 + i * 0.12, lz], scale: [0.95, 0.11, 0.2], shell: true, outline: 0.012 }));
    part(GEO.box, '#c49a6c', { position: [lx, 0.52, lz + 0.05], scale: [0.7, 0.07, 0.24], shell: true, outline: 0.012 });
    [-0.28, 0.28].forEach((fx) => part(GEO.box, '#a77a52', { position: [lx + fx, 0.4, lz + 0.05], scale: [0.05, 0.25, 0.2], shell: true, shadow: false }));
    block(lx, lz, 0.5);
    return { H: H + RH * 0.82 };
  },

  // ---------- 카니 헌책방: 앞으로 박공을 보인 2층 반목조 집(흰 벽 + 짙은 나무 뼈대), 2층이 조금 튀어나왔다. 책등이 보이는 돌출창, 초록 문, 다락 둥근 창 ----------
  books(ctx) {
    const { s, part, block, glow } = ctx;
    const wood = '#6b4a33', wall2 = '#fbf7ef';
    const W1 = 2.0 * s, D1 = 1.6 * s, H1 = 1.15 * s, F1 = D1 / 2;
    const W2 = 2.2 * s, D2 = 1.75 * s, H2 = H1 + 0.95 * s, oz = 0.06 * s, F2 = oz + D2 / 2;
    part(GEO.box, '#efe0c4', { position: [0, H1 / 2, 0], scale: [W1, H1, D1], receive: true, shell: true });
    part(GEO.box, wall2, { position: [0, (H1 + H2) / 2, oz], scale: [W2, H2 - H1, D2], shell: true });
    // 2층 앞 나무 뼈대: 위아래 보 · 기둥 넷 · 가운데 칸 X 버팀 · 바깥 칸 창(초록 덧문)
    const bz = F2 + 0.015, posts = [-0.48, -0.16, 0.16, 0.48].map((f) => f * W2), mid = (H1 + H2) / 2, ph = H2 - H1;
    [H1 + 0.04 * s, H2 - 0.04 * s].forEach((y) => part(GEO.box, wood, { position: [0, y, bz], scale: [W2, 0.08 * s, 0.03], ...NOOUT }));
    posts.forEach((x) => part(GEO.box, wood, { position: [x, mid, bz], scale: [0.07 * s, ph, 0.03], ...NOOUT }));
    const cw = posts[2] - posts[1], cr = Math.atan2(cw, ph);
    [cr, -cr].forEach((rz) => part(GEO.box, wood, { position: [0, mid, bz], rotation: [0, 0, rz], scale: [0.06 * s, Math.hypot(cw, ph) * 0.9, 0.03], ...NOOUT }));
    [(posts[0] + posts[1]) / 2, (posts[2] + posts[3]) / 2].forEach((x) => {
      glow(part(GEO.box, '#c6e7f5', { position: [x, mid, bz + 0.01], scale: [0.26 * s, 0.38 * s, 0.02], outline: 0.012, shadow: false }));
      [-1, 1].forEach((sd) => part(GEO.box, '#5f8f6a', { position: [x + sd * 0.19 * s, mid, bz + 0.015], scale: [0.11 * s, 0.4 * s, 0.03], shell: true, outline: 0.01, shadow: false }));
    });
    // 2층 받침 들보 끝(튀어나온 부분 아래)
    for (let i = 0; i < 7; i++) part(GEO.box, wood, { position: [-W2 / 2 + 0.15 + i * (W2 - 0.3) / 6, H1 - 0.03, F1 + (F2 - F1) / 2], scale: [0.07, 0.07, F2 - F1 + 0.04], outline: 0.008, shadow: false });
    // 앞으로 박공을 보이는 가파른 지붕 + 박공벽(흰 벽 · 가운데 기둥) + 다락 둥근 창
    const RW = W2 + 0.3, RH = 1.25 * s, RF = oz + (D2 + 0.4) / 2;
    gable(ctx, '#8a5a3a', 0, H2, oz, RW, RH, D2 + 0.4, { shell: true, outline: 0.03 });
    const iw = W2 - 0.1, ih = RH * iw / RW;
    gable(ctx, wall2, 0, H2 + 0.01, RF + 0.01, iw, ih, 0.02);
    part(GEO.box, wood, { position: [0, H2 + ih * 0.3, RF + 0.025], scale: [0.06 * s, ih * 0.6, 0.01], ...NOOUT });
    part(GEO.box, wood, { position: [0, H2 + 0.03, RF + 0.025], scale: [iw, 0.06 * s, 0.01], ...NOOUT });
    glow(part(DISC, '#c6e7f5', { position: [0, H2 + 0.4 * s, RF + 0.035], scale: [0.16 * s, 0.16 * s, 0.03], ...NOOUT }));
    part(TORUS, wood, { position: [0, H2 + 0.4 * s, RF + 0.04], scale: [0.17 * s, 0.17 * s, 0.08], outline: 0.01, shadow: false });
    // 1층 돌출창: 짙은 틀 안에 알록달록 책등 두 줄, 위에 작은 지붕
    const wx = W1 * 0.17, wz = F1 + 0.16;
    part(GEO.box, wood, { position: [wx, 0.6 * s, wz], scale: [0.98 * s, 0.72 * s, 0.32], shell: true, outline: 0.02 });
    part(GEO.box, '#3a2a22', { position: [wx, 0.62 * s, wz + 0.15], scale: [0.86 * s, 0.58 * s, 0.02], ...NOOUT });
    [0.46, 0.75].forEach((y, row) => {
      for (let i = 0; i < 9; i++) part(GEO.box, BOOKS[(i * 3 + row) % BOOKS.length], { position: [wx - 0.37 * s + i * 0.092 * s, y * s, wz + 0.17], scale: [0.07 * s, (0.2 + ((i + row) % 3) * 0.025) * s, 0.02], ...NOOUT });
      part(GEO.box, '#a77d5a', { position: [wx, (y - 0.12) * s, wz + 0.17], scale: [0.86 * s, 0.03, 0.03], ...NOOUT });
    });
    part(GEO.box, '#8a5a3a', { position: [wx, 1.0 * s, wz + 0.04], rotation: [0.45, 0, 0], scale: [1.04 * s, 0.05, 0.46], shell: true, outline: 0.012, shadow: false });
    // 초록 문(작은 창 · 손잡이)
    const dx = -W1 * 0.3;
    part(GEO.box, '#5f8f6a', { position: [dx, 0.45 * s, F1 + 0.03], scale: [0.5 * s, 0.9 * s, 0.05], shell: true, outline: 0.015, shadow: false });
    glow(part(GEO.box, '#e8f4fa', { position: [dx, 0.7 * s, F1 + 0.06], scale: [0.26 * s, 0.2 * s, 0.01], ...NOOUT }));
    part(GEO.dot, '#f6c453', { position: [dx + 0.16 * s, 0.45 * s, F1 + 0.07], scale: [0.035, 0.035, 0.035], outline: 0.008, shadow: false });
    // 집게발 간판: 오른쪽 모서리에서 앞으로 내민 까치발에 매단다
    const cx = W1 / 2 - 0.08, cy = H1 - 0.12;
    part(GEO.box, wood, { position: [cx, cy, F1 + 0.25], scale: [0.05, 0.05, 0.5], shell: true, shadow: false });
    part(GEO.sphere, '#e8604f', { position: [cx, cy - 0.28, F1 + 0.42], scale: [0.17, 0.2, 0.08], outline: 0.018, shadow: false });
    [-1, 1].forEach((sd) => part(GEO.sphere, '#e8604f', { position: [cx + sd * 0.09, cy - 0.1, F1 + 0.42], rotation: [0, 0, -sd * 0.5], scale: [0.065, 0.14, 0.06], outline: 0.012, shadow: false }));
    // 가게 앞 책 수레 둘
    [[-W1 * 0.62, F1 + 0.55], [W1 * 0.64, F1 + 0.7]].forEach(([bx, bz2], k) => {
      part(GEO.box, '#a77d5a', { position: [bx, 0.32, bz2], scale: [0.6, 0.06, 0.34], shell: true, outline: 0.015 });
      part(GEO.box, '#a77d5a', { position: [bx, 0.32, bz2 - 0.14], scale: [0.6, 0.56, 0.05], shell: true, outline: 0.015, shadow: false });
      [-0.27, 0.27].forEach((fx) => part(GEO.box, '#8a6240', { position: [bx + fx, 0.16, bz2], scale: [0.05, 0.32, 0.32], shell: true, outline: 0.012, shadow: false }));
      for (let i = 0; i < 6; i++) part(GEO.box, BOOKS[(i + k * 3) % BOOKS.length], { position: [bx - 0.22 + i * 0.088, 0.48 + (i % 3) * 0.015, bz2 - 0.03], scale: [0.07, 0.26 + (i % 3) * 0.03, 0.2], shell: true, outline: 0.01, shadow: false });
      block(bx, bz2, 0.36);
    });
    return { H: H2 + RH };
  },

  // ---------- 도구점: 아래는 돌, 위는 판자인 대장간. 앞으로 기운 양철 외쪽 지붕, 옆에 불 피운 돌 굴뚝, 트인 작업장 입구, 연장 걸이판 ----------
  tools(ctx) {
    const { s, part, block, glow } = ctx;
    const W = 2.3 * s, D = 1.8 * s, H = 1.3 * s, F = D / 2, SB = 0.62 * s;
    part(GEO.box, '#a9adb5', { position: [0, SB / 2, 0], scale: [W + 0.04, SB, D + 0.04], receive: true, shell: true });
    [[-0.9, 0.18, '#c4c8cf'], [-0.55, 0.42, '#959aa3'], [-0.2, 0.15, '#c4c8cf'], [0.45, 0.4, '#959aa3'], [0.75, 0.2, '#c4c8cf'], [0.95, 0.45, '#b4b8c0'], [-0.75, 0.48, '#b4b8c0'], [0.2, 0.47, '#b4b8c0']]
      .forEach(([fx, fy, c]) => part(GEO.box, c, { position: [fx * W / 2, fy * s, F + 0.03], scale: [0.26 * s, 0.14 * s, 0.03], outline: 0.008, shadow: false }));
    part(GEO.box, '#c9a27a', { position: [0, SB + (H - SB) / 2, 0], scale: [W, H - SB, D], shell: true });
    [0.25, 0.5, 0.75].forEach((f) => part(GEO.box, '#b08a62', { position: [0, SB + (H - SB) * f, F + 0.005], scale: [W, 0.015, 0.01], ...NOOUT }));
    // 외쪽 지붕(앞이 낮다) + 그 밑 옆벽 쐐기 + 골함석 줄
    const RS = 0.8 * s, tilt = Math.atan2(RS, D), L = Math.hypot(D, RS) + 0.5;
    part(WEDGE, '#c9a27a', { position: [0, H, 0], scale: [W, RS, D], shell: true, outline: 0.015 });
    part(GEO.box, '#6f8fb0', { position: [0, H + RS / 2 + 0.04, 0], rotation: [tilt, 0, 0], scale: [W + 0.4, 0.07, L], shell: true, outline: 0.025 });
    for (let i = 0; i < 9; i++) part(GEO.box, '#8fb0d0', { position: [-W / 2 - 0.1 + (i + 0.5) * (W + 0.2) / 9, H + RS / 2 + 0.085, 0], rotation: [tilt, 0, 0], scale: [0.03, 0.025, L - 0.05], ...NOOUT });
    // 옆 돌 굴뚝 · 화덕 불(밤에 더 밝다) · 연기
    const cx = -W / 2 - 0.1 * s, cz = -0.2 * s, CH = H + RS + 0.6 * s;
    part(GEO.box, '#9a9ea6', { position: [cx, CH / 2, cz], scale: [0.5 * s, CH, 0.55 * s], shell: true, outline: 0.02 });
    part(GEO.box, '#7d828b', { position: [cx, CH + 0.04, cz], scale: [0.58 * s, 0.1, 0.63 * s], shell: true, outline: 0.015 });
    [[0.3, 0.2], [0.65, -0.1], [1.0, 0.15], [1.4, -0.05]].forEach(([fy, fx]) => part(GEO.box, '#b4b8c0', { position: [cx + fx * s * 0.4, fy * s, cz + 0.28 * s], scale: [0.18 * s, 0.1 * s, 0.02], outline: 0.006, shadow: false }));
    glow(part(GEO.box, '#ff9a3c', { position: [cx, 0.3 * s, cz + 0.28 * s], scale: [0.26 * s, 0.22 * s, 0.02], outline: 0.015, shadow: false }));
    puffs(part, cx, CH + 0.25, cz, '#e9e6e1');
    // 트인 작업장 입구(어두운 안 · 나무 문틀 · 안쪽 작업대)
    const ex = -0.12 * s;
    part(GEO.box, '#3a2f2a', { position: [ex, 0.5 * s, F + 0.02], scale: [0.86 * s, 0.98 * s, 0.03], ...NOOUT });
    [-1, 1].forEach((sd) => part(GEO.box, '#8a6240', { position: [ex + sd * 0.46 * s, 0.52 * s, F + 0.04], scale: [0.08 * s, 1.04 * s, 0.07], shell: true, outline: 0.012, shadow: false }));
    part(GEO.box, '#8a6240', { position: [ex, 1.04 * s, F + 0.04], scale: [1.0 * s, 0.09 * s, 0.08], shell: true, outline: 0.012, shadow: false });
    part(GEO.box, '#a77a52', { position: [ex, 0.32 * s, F + 0.04], scale: [0.7 * s, 0.06, 0.1], ...NOOUT });
    glow(part(GEO.sphere, '#ff8a3c', { position: [ex + 0.2 * s, 0.42 * s, F + 0.04], scale: [0.07, 0.05, 0.03], ...NOOUT }));
    // 연장 걸이판(오른쪽): 망치 · 렌치 · 톱
    const px = W * 0.33, py = 0.98 * s;
    part(GEO.box, '#e2c49a', { position: [px, py, F + 0.03], scale: [0.62 * s, 0.5 * s, 0.04], shell: true, outline: 0.012, shadow: false });
    part(GEO.box, '#8a6240', { position: [px - 0.18 * s, py - 0.03, F + 0.06], rotation: [0, 0, 0.2], scale: [0.03, 0.3 * s, 0.01], ...NOOUT });
    part(GEO.box, '#5f6670', { position: [px - 0.2 * s, py + 0.12 * s, F + 0.065], rotation: [0, 0, 0.2], scale: [0.15 * s, 0.07 * s, 0.015], ...NOOUT });
    part(GEO.box, '#8e98a6', { position: [px, py - 0.02, F + 0.06], scale: [0.03, 0.28 * s, 0.01], ...NOOUT });
    part(TORUS, '#8e98a6', { position: [px, py + 0.14 * s, F + 0.065], scale: [0.05 * s, 0.05 * s, 0.03], ...NOOUT });
    part(GEO.box, '#b9c0c9', { position: [px + 0.18 * s, py, F + 0.06], rotation: [0, 0, -0.25], scale: [0.09 * s, 0.32 * s, 0.01], ...NOOUT });
    // 처마 랜턴 줄(밤에 켜진다)
    part(GEO.box, '#5a4030', { position: [0.15 * s, H - 0.02, F + 0.3], scale: [W * 0.62, 0.03, 0.03], ...NOOUT });
    [-0.5, 0.15, 0.8].forEach((fx) => {
      part(GEO.box, '#5a4030', { position: [fx * s, H - 0.1, F + 0.3], scale: [0.02, 0.14, 0.02], ...NOOUT });
      glow(part(GEO.sphere, '#ffe08a', { position: [fx * s, H - 0.23, F + 0.3], scale: [0.1, 0.13, 0.1], outline: 0.014, shadow: false }));
    });
    // 문 옆 무기 꽂힌 통 · 모루
    const bx = -W * 0.44, bz = F + 0.55;
    part(GEO.cylinder, '#a77a52', { position: [bx, 0, bz], scale: [0.22, 0.48, 0.22], outline: 0.02 });
    [0.12, 0.36].forEach((y) => part(GEO.cylinder, '#5a5560', { position: [bx, y, bz], scale: [0.23, 0.03, 0.23], ...NOOUT }));
    part(GEO.cylinder, '#f3a6b8', { position: [bx - 0.06, 0.3, bz], rotation: [0, 0, 0.15], scale: [0.03, 1.0, 0.03], outline: 0.01, shadow: false });
    part(GEO.box, '#d8b48c', { position: [bx + 0.08, 0.55, bz + 0.03], rotation: [0, 0, -0.12], scale: [0.06, 0.7, 0.03], shell: true, outline: 0.01, shadow: false });
    block(bx, bz, 0.28);
    const ax = W * 0.46, az = F + 0.62;
    part(GEO.cylinder, '#a77a52', { position: [ax, 0, az], scale: [0.22, 0.3, 0.22], outline: 0.02 });
    part(GEO.box, '#5f6670', { position: [ax, 0.38, az], scale: [0.42, 0.14, 0.22], shell: true, outline: 0.02 });
    part(GEO.box, '#5f6670', { position: [ax + 0.24, 0.41, az], scale: [0.14, 0.08, 0.14], shell: true, outline: 0.015, shadow: false });
    block(ax, az, 0.3);
    return { H: CH + 0.3 };
  },

  // ---------- 부동산: 평지붕의 하얀 현대식 사무소. 통유리 앞면에 매물 종이, 유리문 위 평 차양, 옥상 간판(집 그림), 문 옆 화분 ----------
  realty(ctx) {
    const { s, part, block, glow } = ctx;
    const W = 2.3 * s, D = 1.7 * s, H = 1.5 * s, F = D / 2, lilac = '#c4b4e8';
    part(GEO.box, '#fbfbff', { position: [0, H / 2, 0], scale: [W, H, D], receive: true, shell: true });
    part(GEO.box, lilac, { position: [0, H + 0.07 * s, 0], scale: [W + 0.25, 0.14 * s, D + 0.25], shell: true, outline: 0.025 });
    part(GEO.box, lilac, { position: [0, H - 0.14 * s, F + 0.01], scale: [W, 0.1 * s, 0.02], ...NOOUT });
    part(GEO.box, '#e8e6f2', { position: [0, 0.06 * s, F + 0.02], scale: [W + 0.02, 0.12 * s, 0.04], ...NOOUT });
    // 통유리(밤에 켜진다) + 흰 창살 + 매물 종이 넷
    const gx = -W * 0.14, gw = W * 0.58, gh = H * 0.55, gy = H * 0.47;
    part(GEO.box, '#ffffff', { position: [gx, gy, F + 0.02], scale: [gw + 0.08, gh + 0.08, 0.03], shell: true, outline: 0.012, shadow: false });
    glow(part(GEO.box, '#bfe4f2', { position: [gx, gy, F + 0.04], scale: [gw, gh, 0.02], ...NOOUT }));
    [-1 / 6, 1 / 6].forEach((f) => part(GEO.box, '#ffffff', { position: [gx + f * gw * 2, gy, F + 0.055], scale: [0.04, gh, 0.01], ...NOOUT }));
    ['#f4a091', '#9fd8c4', lilac, '#fcd95b'].forEach((c, i) => {
      const px = gx - gw * 0.36 + i * gw * 0.24, py = gy + (i % 2 ? -0.08 : 0.08) * s;
      part(GEO.box, '#ffffff', { position: [px, py, F + 0.06], scale: [0.17 * s, 0.22 * s, 0.01], outline: 0.006, shadow: false });
      gable(ctx, c, px, py + 0.01 * s, F + 0.07, 0.13 * s, 0.06 * s, 0.01);
      part(GEO.box, c, { position: [px, py - 0.025 * s, F + 0.07], scale: [0.09 * s, 0.07 * s, 0.005], ...NOOUT });
    });
    // 유리문(오른쪽) · 평 차양
    const dx = W * 0.32;
    part(GEO.box, '#5f6670', { position: [dx, 0.5 * s, F + 0.03], scale: [0.5 * s, 1.0 * s, 0.04], shell: true, outline: 0.012, shadow: false });
    glow(part(GEO.box, '#d6eef8', { position: [dx, 0.5 * s, F + 0.055], scale: [0.4 * s, 0.9 * s, 0.01], ...NOOUT }));
    part(GEO.box, '#ffffff', { position: [dx - 0.12 * s, 0.5 * s, F + 0.065], scale: [0.03, 0.26 * s, 0.02], ...NOOUT });
    part(GEO.box, lilac, { position: [dx, 1.12 * s, F + 0.22], scale: [0.78 * s, 0.05, 0.44], shell: true, outline: 0.012, shadow: false });
    // 옥상 간판: 다리 둘 위 흰 판 + 집 그림 + 글자 획
    const sy = H + 0.38 * s, sz = F - 0.12;
    [-1, 1].forEach((sd) => part(GEO.box, '#8f8aa0', { position: [sd * W * 0.22, H + 0.17 * s, sz - 0.02], scale: [0.05, 0.2 * s, 0.05], ...NOOUT }));
    part(GEO.box, '#ffffff', { position: [0, sy, sz], scale: [W * 0.62, 0.4 * s, 0.08], shell: true, outline: 0.02 });
    part(GEO.box, lilac, { position: [0, sy, sz + 0.045], scale: [W * 0.57, 0.32 * s, 0.01], ...NOOUT });
    part(GEO.box, '#ffffff', { position: [-W * 0.18, sy - 0.04 * s, sz + 0.055], scale: [0.18 * s, 0.13 * s, 0.01], ...NOOUT });
    gable(ctx, '#f4a091', -W * 0.18, sy + 0.02 * s, sz + 0.06, 0.28 * s, 0.13 * s, 0.01);
    [0, 0.1, 0.2].forEach((fx) => part(GEO.box, '#ffffff', { position: [fx * W, sy, sz + 0.055], scale: [0.035, 0.2 * s, 0.01], ...NOOUT }));
    // 문 옆 네모 화분 둘
    [dx - 0.42 * s, dx + 0.42 * s].forEach((x) => {
      part(GEO.box, '#e8e6f2', { position: [x, 0.15, F + 0.3], scale: [0.26, 0.3, 0.26], shell: true, outline: 0.012 });
      part(GEO.sphere, '#6cc77e', { position: [x, 0.42, F + 0.3], scale: [0.17, 0.2, 0.17], outline: 0.015 });
    });
    block(dx + 0.42 * s, F + 0.3, 0.2);
    // 매물 게시판(왼쪽 앞)
    const bx = -W * 0.55, bz = F + 0.55;
    [-0.3, 0.3].forEach((fx) => part(GEO.box, '#a77d5a', { position: [bx + fx, 0.42, bz], scale: [0.05, 0.84, 0.05], shell: true, outline: 0.012 }));
    part(GEO.box, '#fff8ea', { position: [bx, 0.62, bz + 0.01], scale: [0.66, 0.4, 0.04], shell: true, outline: 0.015, shadow: false });
    ['#f4a091', '#9fd8c4', lilac].forEach((c, i) => {
      part(GEO.box, '#ffffff', { position: [bx - 0.2 + i * 0.2, 0.58, bz + 0.04], scale: [0.11, 0.09, 0.01], ...NOOUT });
      gable(ctx, c, bx - 0.2 + i * 0.2, 0.62, bz + 0.045, 0.15, 0.08, 0.01);
    });
    block(bx, bz, 0.4);
    return { H: sy + 0.2 * s };
  },

  // ---------- 검정소: 하얀 관청. 기둥 넷의 현관 · 삼각 박공 · 넓은 계단, 파란 우진각 지붕 위 시계탑과 깃발 ----------
  exam(ctx) {
    const { s, part, block, glow } = ctx;
    const W = 2.4 * s, D = 1.8 * s, H = 1.45 * s, F = D / 2;
    part(GEO.box, '#fffdf7', { position: [0, H / 2, 0], scale: [W, H, D], receive: true, shell: true });
    part(GEO.box, '#dfe6f0', { position: [0, 0.08 * s, 0], scale: [W + 0.06, 0.16 * s, D + 0.06], shell: true, shadow: false });
    part(GEO.box, '#dfe6f0', { position: [0, H - 0.05 * s, F + 0.01], scale: [W + 0.04, 0.1 * s, 0.03], ...NOOUT });
    part(HIP, '#7fa7d9', { position: [0, H, 0], scale: [W + 0.4, 0.75 * s, D + 0.4], shell: true, outline: 0.03 });
    // 시계탑(지붕에서 솟는다) · 시계 · 네모뿔 지붕 · 깃발
    const tz = -0.15 * s, TB = H + 0.25 * s, TH = 1.05 * s, cy = TB + TH * 0.64, cz = tz + 0.37 * s;
    part(GEO.box, '#fffdf7', { position: [0, TB + TH / 2, tz], scale: [0.72 * s, TH, 0.72 * s], shell: true, outline: 0.02 });
    part(GEO.box, '#dfe6f0', { position: [0, TB + TH - 0.04 * s, tz], scale: [0.8 * s, 0.08 * s, 0.8 * s], shell: true, outline: 0.012, shadow: false });
    part(PYRAMID, '#5f87c0', { position: [0, TB + TH, tz], scale: [1.0 * s, 0.62 * s, 1.0 * s], shell: true, outline: 0.02 });
    part(DISC, '#ffffff', { position: [0, cy, cz], scale: [0.23 * s, 0.23 * s, 0.03], outline: 0.012, shadow: false });
    part(TORUS, '#f6c453', { position: [0, cy, cz + 0.01], scale: [0.24 * s, 0.24 * s, 0.1], outline: 0.01, shadow: false });
    part(GEO.box, '#3a3236', { position: [0, cy + 0.07 * s, cz + 0.025], scale: [0.025, 0.15 * s, 0.01], ...NOOUT });
    part(GEO.box, '#3a3236', { position: [0.05 * s, cy, cz + 0.025], scale: [0.11 * s, 0.025, 0.01], ...NOOUT });
    part(GEO.cylinder, '#b88c66', { position: [0, TB + TH + 0.55 * s, tz], scale: [0.03, 0.55 * s, 0.03], outline: 0.012, shadow: false });
    part(GEO.box, '#ffd6e2', { position: [0.18 * s, TB + TH + 0.98 * s, tz], scale: [0.34 * s, 0.2 * s, 0.02], shell: true, outline: 0.01, shadow: false });
    // 키 큰 창 둘(기둥 사이, 밤에 켜진다)
    [-1, 1].forEach((sd) => glow(part(GEO.box, '#c6e7f5', { position: [sd * 0.52 * s, 0.75 * s, F + 0.02], scale: [0.2 * s, 0.62 * s, 0.02], outline: 0.012, shadow: false })));
    // 현관: 기둥 넷 · 보 · 삼각 박공(금빛 문장) · 문 · 계단
    const pz = F + 0.36;
    [-0.78, -0.26, 0.26, 0.78].forEach((fx) => {
      part(GEO.cylinder, '#ffffff', { position: [fx * s, 0.16 * s, pz], scale: [0.08 * s, 1.04 * s, 0.08 * s], outline: 0.015 });
      part(GEO.box, '#eef2f8', { position: [fx * s, 0.2 * s, pz], scale: [0.22 * s, 0.08 * s, 0.22 * s], shell: true, outline: 0.01, shadow: false });
      part(GEO.box, '#eef2f8', { position: [fx * s, 1.16 * s, pz], scale: [0.2 * s, 0.06 * s, 0.2 * s], shell: true, outline: 0.01, shadow: false });
    });
    part(GEO.box, '#ffffff', { position: [0, 1.25 * s, F + 0.3], scale: [1.95 * s, 0.13 * s, 0.6], shell: true, outline: 0.015 });
    gable(ctx, '#ffffff', 0, 1.31 * s, F + 0.3, 2.1 * s, 0.42 * s, 0.66, { shell: true, outline: 0.015 });
    part(DISC, '#f6c453', { position: [0, 1.45 * s, F + 0.64], scale: [0.1 * s, 0.1 * s, 0.03], outline: 0.01, shadow: false });
    part(GEO.box, '#6b5a8a', { position: [0, 0.6 * s, F + 0.02], scale: [0.5 * s, 0.9 * s, 0.05], shell: true, outline: 0.015, shadow: false });
    part(GEO.box, '#4a3f66', { position: [0, 0.6 * s, F + 0.05], scale: [0.015, 0.9 * s, 0.01], ...NOOUT });
    part(GEO.box, '#e7e1d6', { position: [0, 0.05, F + 0.74], scale: [2.0 * s, 0.1, 0.44], shell: true, receive: true, shadow: false });
    part(GEO.box, '#eee9df', { position: [0, 0.14, F + 0.58], scale: [1.85 * s, 0.1, 0.3], shell: true, receive: true, shadow: false });
    [-0.78, 0.78].forEach((fx) => block(fx * s, pz, 0.12));
    // 앞 안내판(오른쪽)
    const nx = W * 0.5, nz = F + 0.95;
    [-0.32, 0.32].forEach((px) => part(GEO.box, '#a77d5a', { position: [nx + px, 0.4, nz], scale: [0.07, 0.8, 0.07], shell: true }));
    part(GEO.box, '#f5ead2', { position: [nx, 0.72, nz], scale: [0.86, 0.42, 0.06], shell: true, shadow: false });
    block(nx, nz, 0.42);
    return { H: TB + TH + 1.1 * s };
  },

  // ---------- 우사기네: 동그란 흙벽 오두막에 고깔 짚 지붕. 둥근 문 · 동그란 창, 깃발 · 당근 밭 ----------
  usagi(ctx) {
    const { s, part, block } = ctx;
    const R = 1.0 * s, H = 1.1 * s, RR = R * 1.38, RH = 1.05 * s;
    part(GEO.cylinder, '#fff1d0', { position: [0, 0, 0], scale: [R, H, R], receive: true, outline: 0.03 });
    part(GEO.cylinder, '#e8d2a6', { position: [0, 0, 0], scale: [R + 0.02, 0.16 * s, R + 0.02], outline: 0.015, shadow: false });
    part(GEO.cone, '#e9c46a', { position: [0, H - 0.05, 0], scale: [RR, RH, RR], outline: 0.03 });
    [0.28, 0.56].forEach((f) => part(GEO.cylinder, '#d6a94a', { position: [0, H - 0.05 + f * RH, 0], scale: [RR * (1 - f) + 0.012, 0.035, RR * (1 - f) + 0.012], ...NOOUT }));
    part(GEO.sphere, '#d6a94a', { position: [0, H - 0.05 + RH, 0], scale: [0.1, 0.1, 0.1], outline: 0.012, shadow: false });
    part(ARCH, '#c9874a', { position: [-0.12 * s, 0, R - 0.02], scale: [0.48 * s, 0.52 * s, 0.1], shell: true, outline: 0.015, shadow: false });
    part(GEO.dot, '#f6c453', { position: [0.03 * s, 0.42 * s, R + 0.05], scale: [0.035, 0.035, 0.035], outline: 0.008, shadow: false });
    roundWindow(ctx, R, 0.62, 0.66 * s, 0.15 * s, '#c9874a');
    // 깃발 · 당근 밭
    part(GEO.cylinder, '#b88c66', { position: [R * 1.0, 0, R * 0.75], scale: [0.03, 1.1, 0.03], outline: 0.015 });
    part(GEO.box, '#f8e7a6', { position: [R * 1.0 + 0.18, 0.95, R * 0.75], scale: [0.34, 0.22, 0.02], shell: true, shadow: false });
    const gx = -R * 1.0, gz = R * 0.85;
    part(GEO.box, '#b98a5e', { position: [gx, 0.05, gz], scale: [0.7, 0.1, 0.36], shell: true, shadow: false });
    [-0.22, 0, 0.22].forEach((fx) => {
      part(GEO.cone, '#f08a3c', { position: [gx + fx, 0.04, gz], rotation: [Math.PI, 0, 0], scale: [0.06, 0.1, 0.06], outline: 0.01, shadow: false });
      part(GEO.cone, '#5aa544', { position: [gx + fx, 0.08, gz], scale: [0.07, 0.16, 0.05], outline: 0.01, shadow: false });
    });
    block(gx, gz, 0.4);
    return { H: H + RH };
  },

  // ---------- 쿠리만쥬네: 앞으로 박공을 보인 통나무 오두막. 겹겹이 쌓은 통나무 벽과 모서리 통나무 끝, 이끼색 지붕, 돌 굴뚝 연기, 꽃상자 창, 병맥주 상자 ----------
  kurimanju(ctx) {
    const { s, part, block, glow } = ctx;
    const W = 2.1 * s, D = 1.75 * s, H = 1.2 * s, F = D / 2, n = 6, lr = H / n / 2;
    part(GEO.box, '#c48f5a', { position: [0, H / 2, 0], scale: [W, H, D], receive: true, shell: true });
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) * (H / n);
      part(GEO.cylinder, i % 2 ? '#b98250' : '#b07a4a', { position: [-W / 2, y, F + 0.01], rotation: [0, 0, -Math.PI / 2], scale: [lr + 0.01, W, lr + 0.01], outline: 0.01, shadow: false });
      [-1, 1].forEach((sx) => {
        part(GEO.cylinder, '#b07a4a', { position: [sx * (W / 2 + 0.02), y, F - 0.12], rotation: [Math.PI / 2, 0, 0], scale: [lr, 0.3, lr], outline: 0.01, shadow: false });
        part(DISC, '#e8c39a', { position: [sx * (W / 2 + 0.02), y, F + 0.185], scale: [lr * 0.8, lr * 0.8, 0.01], ...NOOUT });
      });
    }
    // 앞으로 박공을 보이는 지붕 + 통나무 박공벽 + 작은 다락 창
    const RW = W + 0.55, RH = 1.05 * s, RF = (D + 0.5) / 2;
    gable(ctx, '#6f9a5e', 0, H, 0, RW, RH, D + 0.5, { shell: true, outline: 0.03 });
    const iw = W - 0.05, ih = RH * iw / RW;
    gable(ctx, '#b98250', 0, H + 0.01, RF + 0.01, iw, ih, 0.02);
    [0.22, 0.45].forEach((f) => part(GEO.box, '#a06d40', { position: [0, H + ih * f, RF + 0.025], scale: [iw * (1 - f) * 0.95, 0.025, 0.01], ...NOOUT }));
    glow(part(GEO.box, '#ffe6a8', { position: [0, H + ih * 0.42, RF + 0.03], scale: [0.22 * s, 0.2 * s, 0.02], outline: 0.012, shadow: false }));
    // 돌 굴뚝(오른쪽 지붕을 뚫고 나온다) · 연기
    const cx = W * 0.3, cz = -D * 0.15;
    part(GEO.box, '#9a9ea6', { position: [cx, H + 0.4 * s, cz], scale: [0.32 * s, 1.0 * s, 0.32 * s], shell: true, outline: 0.02 });
    puffs(part, cx, H + 1.1 * s, cz, '#ece8e2');
    // 문 · 꽃상자 창
    const dx = -W * 0.22;
    part(GEO.box, '#7a5136', { position: [dx, 0.46 * s, F + 0.06], scale: [0.48 * s, 0.92 * s, 0.06], shell: true, outline: 0.015, shadow: false });
    [-0.08, 0.08].forEach((fx) => part(GEO.box, '#5e3c26', { position: [dx + fx * s, 0.46 * s, F + 0.095], scale: [0.015, 0.86 * s, 0.01], ...NOOUT }));
    part(GEO.dot, '#f6c453', { position: [dx + 0.16 * s, 0.46 * s, F + 0.1], scale: [0.035, 0.035, 0.035], outline: 0.008, shadow: false });
    const wx = W * 0.24, wy = H * 0.58;
    part(GEO.box, '#7a5136', { position: [wx, wy, F + 0.05], scale: [0.56 * s, 0.46 * s, 0.05], shell: true, outline: 0.012, shadow: false });
    glow(part(GEO.box, '#ffe6a8', { position: [wx, wy, F + 0.08], scale: [0.46 * s, 0.36 * s, 0.02], ...NOOUT }));
    part(GEO.box, '#7a5136', { position: [wx, wy, F + 0.095], scale: [0.03, 0.36 * s, 0.01], ...NOOUT });
    part(GEO.box, '#a76a3a', { position: [wx, wy - 0.27 * s, F + 0.15], scale: [0.6 * s, 0.12, 0.18], shell: true, outline: 0.012, shadow: false });
    ['#f7a8c4', '#fff1a8', '#ffffff', '#f7a8c4'].forEach((c, i) => part(GEO.dot, c, { position: [wx - 0.2 * s + i * 0.13 * s, wy - 0.27 * s + 0.09, F + 0.17], scale: [0.065, 0.065, 0.065], ...NOOUT }));
    // 문 옆 병맥주 상자
    const bx = W * 0.55, bz = F + 0.55;
    part(GEO.box, '#c49a6c', { position: [bx, 0.18, bz], scale: [0.5, 0.36, 0.36], shell: true });
    [[-0.12, -0.08], [0.12, -0.08], [-0.12, 0.08], [0.12, 0.08]].forEach(([ddx, ddz]) => {
      part(GEO.cylinder, '#7a4a20', { position: [bx + ddx, 0.3, bz + ddz], scale: [0.05, 0.2, 0.05], outline: 0.01, shadow: false });
      part(GEO.cylinder, '#f6c453', { position: [bx + ddx, 0.5, bz + ddz], scale: [0.025, 0.04, 0.025], ...NOOUT });
    });
    block(bx, bz, 0.32);
    return { H: H + RH };
  },

  // ---------- 모몽가네: 가늘고 높은 하늘색 탑 집. 뾰족 고깔 지붕 끝에 별, 둥근 창 두 층, 분홍 둥근 문, 별 장식 줄 ----------
  momonga(ctx) {
    const { s, part } = ctx;
    const R = 0.82 * s, H = 2.0 * s, RR = R * 1.32, RH = 1.15 * s;
    part(GEO.cylinder, '#dcecf8', { position: [0, 0, 0], scale: [R, H, R], receive: true, outline: 0.03 });
    part(GEO.cylinder, '#bcd8ef', { position: [0, 0, 0], scale: [R + 0.03, 0.22 * s, R + 0.03], outline: 0.015, shadow: false });
    part(GEO.cylinder, '#f7c6d8', { position: [0, H * 0.62, 0], scale: [R + 0.02, 0.06 * s, R + 0.02], ...NOOUT });
    part(GEO.cone, '#9fc6ea', { position: [0, H - 0.05, 0], scale: [RR, RH, RR], outline: 0.03 });
    part(GEO.cylinder, '#f7a8c4', { position: [0, H - 0.05, 0], scale: [RR * 0.97, 0.06 * s, RR * 0.97], outline: 0.012, shadow: false });
    const top = H - 0.05 + RH + 0.1;
    part(GEO.sphere, '#fcd95b', { position: [0, top, 0], scale: [0.15, 0.15, 0.06], outline: 0.015, shadow: false });
    [[0.14, 0], [-0.14, 0], [0, 0.14], [0, -0.14]].forEach(([dx, dy]) => part(GEO.sphere, '#fcd95b', { position: [dx, top + dy, 0], scale: [0.07, 0.07, 0.05], outline: 0.01, shadow: false }));
    part(ARCH, '#f7a8c4', { position: [0, 0, R - 0.03], scale: [0.46 * s, 0.5 * s, 0.1], shell: true, outline: 0.015, shadow: false });
    part(GEO.sphere, '#fcd95b', { position: [0, 0.98 * s, R + 0.03], scale: [0.11, 0.11, 0.03], outline: 0.012, shadow: false });
    roundWindow(ctx, R, 0.62, 0.9 * s, 0.14 * s, '#f7a8c4');
    roundWindow(ctx, R, -0.45, 1.5 * s, 0.14 * s, '#f7a8c4');
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.3;
      part(GEO.dot, i % 2 ? '#fcd95b' : '#f7a8c4', { position: [Math.sin(a) * (R + 0.06), H * 0.86 - (i % 2) * 0.06, Math.cos(a) * (R + 0.06)], scale: [0.07, 0.07, 0.07], outline: 0.01, shadow: false });
    }
    return { H: top + 0.15 };
  },

  // ---------- 랏코네: 도장 같은 집. 돌 받침 위 창호 미닫이 벽, 우진각 위에 박공을 얹은 기와지붕(용마루 끝이 들림), 툇마루, 칼 간판 · 짚 과녁 ----------
  rakko(ctx) {
    const { s, part, block, glow, ROOF } = ctx;
    const W = 2.3 * s, D = 1.7 * s, H = 1.2 * s, B = 0.18 * s, F = D / 2, wood = '#5a3a26', tile = '#4a4f5c';
    part(GEO.box, '#f7f2e6', { position: [0, B + H / 2, 0], scale: [W, H, D], receive: true, shell: true });
    part(GEO.box, '#9a9488', { position: [0, B / 2, 0], scale: [W + 0.1, B, D + 0.1], shell: true, shadow: false });
    const cols = [-0.5, -1 / 6, 1 / 6, 0.5].map((f) => f * (W - 0.1));
    cols.forEach((x) => part(GEO.box, wood, { position: [x, B + H / 2, F + 0.02], scale: [0.1 * s, H, 0.06], shell: true, outline: 0.012, shadow: false }));
    part(GEO.box, wood, { position: [0, B + H - 0.05 * s, F + 0.02], scale: [W + 0.06, 0.1 * s, 0.07], shell: true, outline: 0.012, shadow: false });
    // 창호 살 세 칸(가운데 칸은 미닫이문, 밤에 은은히 켜진다)
    for (let c = 0; c < 3; c++) {
      const cx = (cols[c] + cols[c + 1]) / 2, cw = cols[c + 1] - cols[c] - 0.1 * s, ch = H - 0.12 * s;
      const paper = part(GEO.box, '#fff6dc', { position: [cx, B + ch / 2, F + 0.012], scale: [cw, ch, 0.01], ...NOOUT });
      if (c === 1) glow(paper);
      [0.25, 0.5, 0.75].forEach((f) => part(GEO.box, '#8a6240', { position: [cx, B + ch * f, F + 0.022], scale: [cw, 0.015, 0.01], ...NOOUT }));
      [-0.25, 0.25].forEach((f) => part(GEO.box, '#8a6240', { position: [cx + f * cw, B + ch / 2, F + 0.022], scale: [0.015, ch, 0.01], ...NOOUT }));
    }
    // 기와 지붕: 넓은 우진각 위에 작은 박공 · 용마루 · 들린 끝
    const R0 = B + H;
    part(HIP, tile, { position: [0, R0, 0], scale: [W + 0.7, 0.55 * s, D + 0.8], shell: true, outline: 0.03 });
    part(ROOF, tile, { position: [0, R0 + 0.3 * s, 0], scale: [W * 0.62, 0.55 * s, (D + 0.8) * 0.5], shell: true, outline: 0.025 });
    const RT = R0 + 0.85 * s;
    part(GEO.box, '#2e3440', { position: [0, RT, 0], scale: [W * 0.7, 0.09 * s, 0.14], shell: true, outline: 0.015 });
    [-1, 1].forEach((sx) => part(GEO.cone, '#2e3440', { position: [sx * W * 0.35, RT - 0.03, 0], rotation: [0, 0, -sx * 0.6], scale: [0.08, 0.26 * s, 0.08], outline: 0.012, shadow: false }));
    // 툇마루
    part(GEO.box, '#b98a5e', { position: [0, B + 0.02, F + 0.22], scale: [W + 0.1, 0.06 * s, 0.4], shell: true, outline: 0.012, receive: true });
    [-0.45, 0, 0.45].forEach((fx) => part(GEO.box, '#8a6240', { position: [fx * W, B / 2, F + 0.38], scale: [0.07, B, 0.07], ...NOOUT }));
    // 문 위 나무 현판 · 벽에 건 목검 · 짚 과녁
    part(GEO.box, wood, { position: [0, R0 + 0.1 * s, F + 0.3], scale: [0.7 * s, 0.22 * s, 0.05], shell: true, outline: 0.015, shadow: false });
    part(GEO.box, '#f5ead2', { position: [0, R0 + 0.1 * s, F + 0.33], scale: [0.6 * s, 0.15 * s, 0.01], ...NOOUT });
    [-0.15, 0, 0.15].forEach((fx) => part(GEO.box, '#3a2a22', { position: [fx * s, R0 + 0.1 * s, F + 0.34], scale: [0.03, 0.1 * s, 0.01], ...NOOUT }));
    part(GEO.box, '#d8b48c', { position: [cols[3] - 0.25 * s, B + H * 0.6, F + 0.05], rotation: [0, 0, 0.6], scale: [0.05, 0.6, 0.02], shell: true, outline: 0.01, shadow: false });
    const tx = W * 0.62, tz = F + 0.6;
    part(GEO.cylinder, '#a77a52', { position: [tx, 0, tz], scale: [0.04, 0.5, 0.04], outline: 0.01 });
    part(GEO.cylinder, '#e8c36a', { position: [tx, 0.62, tz - 0.04], rotation: [Math.PI / 2, 0, 0], scale: [0.26, 0.08, 0.26], outline: 0.02 });
    part(GEO.cylinder, '#e0524f', { position: [tx, 0.62, tz + 0.045], rotation: [Math.PI / 2, 0, 0], scale: [0.15, 0.01, 0.15], ...NOOUT });
    part(GEO.cylinder, '#ffffff', { position: [tx, 0.62, tz + 0.055], rotation: [Math.PI / 2, 0, 0], scale: [0.06, 0.01, 0.06], ...NOOUT });
    block(tx, tz, 0.3);
    return { H: RT + 0.2 };
  }
};
