import * as THREE from 'three';
import { toonMesh, toonMaterial, toonInstances, GEO } from '../render/toon.js';
import { buildChibi, normalizeLook } from '../actors/models.js';
import { mergeUnit } from '../render/batch.js';

/**
 * 수상한 섬(사이드스토리 '수상한 섬 합숙')에만 나오는 등장인물 · 탈것 모형.
 *  - 세이렌: 하얗고 동그란 물범 같은 커다란 몸, 이마 가운데로 뾰족 내려온 검은 머리, 빨간 하트가 든 곱슬 경단 둘, 찌푸린 눈썹 · 큰 눈,
 *    고양이 입(ω)과 수염, 지느러미 손, 분홍 띠 아래 비늘 무늬 빨간 꼬리. 인어는 그 작은 아이(빨간 모자 머리 · 꼭지).
 *  - 섬사람: 회색 동그란 머리에 훌라 치마처럼 퍼진 몸(밑단 술) · 작은 손 · 점 눈 · 볼에 빗금. 한잎은 머리 위에 이파리 하나, 두잎은 둘.
 *  - 시마지로 · 오리 배 · 작은 보트 · 덩굴 · 글씨 간판.
 * 모두 THREE.Group 을 돌려준다(움직임은 world/island.js 의 update 가 맡는다).
 */
const WHITE = '#fbfaf6', INK = '#2a2226', HAIR = '#26222a', BAND = '#ec9a9a', TAIL = '#c6514f', SCALE = '#97302f', HEART = '#d9504f';
const ISLE_GREY = '#8e8990', LEAF = '#9b8f86';
const add = (g, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); g.add(m); return m; };
/**
 * 그리기 줄이기: 한 관절(그룹) 안의 부품 메시를 색을 꼭짓점에 칠한 메시 하나로 굽는다(외곽선도 굵기별로 하나). keep: 따로 움직이는 부품(입 · 눈썹 …).
 * 자식 그룹(팔 · 머리 · 눈)은 그대로 두고 그 그룹도 따로 굽는다.
 */
const VC = (m) => ({ key: 'vc', material: toonMaterial('#ffffff', { vertexColors: true }), tint: m.material.vertexColors ? null : m.material.color });
function bake(group, keep = []) {
  const parts = group.children.filter((c) => c.isMesh && !keep.includes(c));
  if (parts.length > 1) mergeUnit(group, parts, VC);
  return group;
}

/** 글씨 판 그림(캔버스 → 텍스처). 한글 손글씨체를 쓰고, 없으면 기본 글꼴. */
export function textTexture(text, { w = 256, h = 96, bg = '#f6e7c8', ink = '#5a3a22', size = 44 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = ink; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${size}px Gaegu, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  g.fillText(text, w / 2, h / 2 + 2, w - 20);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** 글씨 판(앞면만): 폭 · 높이(월드 단위). */
export function textBoard(text, width, height, opts) {
  const mat = new THREE.MeshBasicMaterial({ map: textTexture(text, opts) });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

// ---------- 세이렌 · 인어 ----------
/** 무늬 칠한 구(꼭짓점 색): fn(x, y, z) → 색. 물고기 아랫몸(분홍 띠 · 비늘)에 쓴다. */
function paintedSphere(fn, w = 48, h = 32) {
  const geo = new THREE.SphereGeometry(1, w, h), p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { c.set(fn(p.getX(i), p.getY(i), p.getZ(i))); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const fishBody = (x, y) => {
  if (y > 0.5) return WHITE;
  if (y > 0.24) return BAND;
  const row = (y + 0.07 * Math.abs(Math.sin(x * 7))) * 4.2; // 물결 모양 비늘 줄
  return row - Math.floor(row) < 0.14 ? SCALE : TAIL;
};
const GEOS = {}; // 처음 쓸 때 한 번 만든다
const MAKE = {
  hairCap: () => new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI * 0.44), // 눈 바로 위까지
  fish: () => paintedSphere(fishBody),
  cap: () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.34),
  arc: () => new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI),
  skirt: () => new THREE.CylinderGeometry(0.3, 0.42, 0.44, 22).translate(0, 0.22, 0)
};
const geo = (k) => GEOS[k] || (GEOS[k] = MAKE[k]());
const painted = () => toonMaterial('#ffffff', { vertexColors: true });

/** 세이렌의 머리 경단(곱슬곱슬한 검은 동그라미) + 속의 빨간 하트. */
function bun(head, bx, by) {
  add(head, GEO.sphere, HAIR, { position: [bx, by, -0.1], scale: [0.62, 0.58, 0.5], outline: 0.04 });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(head, GEO.sphere, HAIR, { position: [bx + Math.cos(a) * 0.55, by + Math.sin(a) * 0.5, -0.1], scale: [0.24, 0.24, 0.24], outline: 0.025 }); }
  [-1, 1].forEach((h) => add(head, GEO.sphere, HEART, { position: [bx + h * 0.12, by + 0.06, 0.38], scale: [0.16, 0.16, 0.06], outline: false }));
  add(head, GEO.cone, HEART, { position: [bx, by - 0.06, 0.38], rotation: [0, 0, Math.PI], scale: [0.25, 0.26, 0.06], outline: false });
}
/** 세이렌 얼굴: 큰 눈(흰자 · 까만 눈동자 · 반짝) · 찌푸린 눈썹 · 고양이 입(ω) 아래 벌린 입 · 수염 셋씩 · (매울 때만) 빨간 볼. */
function sirenFace(head) {
  const eyes = [-1, 1].map((sd) => {
    const e = new THREE.Group();
    e.position.set(sd * 0.62, 1.1, 1.5);
    e.rotation.y = sd * 0.36;
    add(e, GEO.sphere, '#ffffff', { scale: [0.34, 0.4, 0.1], outline: 0.025 });
    add(e, GEO.dot, INK, { position: [-sd * 0.05, -0.02, 0.06], scale: [0.2, 0.26, 0.06], outline: false });
    add(e, GEO.dot, '#ffffff', { position: [-sd * 0.05 + 0.06, 0.08, 0.11], scale: [0.06, 0.07, 0.03], outline: false });
    e.userData.sy = 1;
    head.add(bake(e));
    return e;
  });
  const brows = [-1, 1].map((sd) => add(head, GEO.box, INK, { position: [sd * 0.6, 1.6, 1.45], rotation: [0, sd * 0.3, 0], scale: [0.46, 0.07, 0.05], outline: false }));
  [-1, 1].forEach((sd) => add(head, geo('arc'), INK, { position: [sd * 0.11, 0.74, 1.57], rotation: [0, 0, Math.PI], scale: [0.11, 0.11, 0.11], outline: false }));
  const mouth = add(head, GEO.dot, '#8a2f3c', { position: [0, 0.5, 1.52], scale: [0.2, 0.06, 0.06], outline: false });
  [-1, 1].forEach((sd) => [0, 1, 2].forEach((k) => add(head, GEO.box, INK, { position: [sd * 1.15, 0.86 - k * 0.13, 1.25], rotation: [0, -sd * 0.55, sd * (0.12 - k * 0.12)], scale: [0.5, 0.025, 0.025], outline: false })));
  const blush = [-1, 1].map((sd) => add(head, GEO.dot, '#f0707f', { position: [sd * 1.05, 0.95, 1.28], scale: [0.5, 0.28, 0.06], outline: false }));
  blush.forEach((b) => { b.visible = false; });
  return { eyes, brows, mouth, blush };
}
/** 세이렌: 물 위로 내민 커다란 몸(약 6m). parts: { body, head, armL, armR, mouth, eyes, brows, blush, tail, fin } */
export function buildSiren() {
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  root.add(body);
  add(body, geo('fish'), null, { material: painted(), position: [0, 0.9, 0], scale: [1.75, 1.7, 1.6], outline: 0.06 });
  add(body, GEO.sphere, WHITE, { position: [0, 2.3, 0], scale: [1.72, 1.35, 1.55], outline: 0.06 });
  const arm = (sd) => { // 지느러미 손(끝이 물결 모양): 어깨에서 들어 올린다
    const p = new THREE.Group();
    p.position.set(sd * 1.45, 2.6, 0.15);
    add(p, GEO.sphere, WHITE, { position: [sd * 0.55, 0, 0], scale: [0.75, 0.42, 0.2], outline: 0.04 });
    [0, 1, 2].forEach((k) => add(p, GEO.sphere, WHITE, { position: [sd * (1.05 + 0.02 * k), 0.24 - k * 0.24, 0], scale: [0.22, 0.17, 0.16], outline: 0.03 }));
    body.add(p);
    return p;
  };
  const armL = arm(-1), armR = arm(1);
  head.position.set(0, 3.0, 0);
  body.add(head);
  // 하얀 머리 + 검은 머리 모자 + 이마 가운데로 뾰족 내려온 조각(경계가 매끈하게 따로 만든다)
  add(head, GEO.sphere, WHITE, { position: [0, 1.25, 0], scale: [1.85, 1.6, 1.65], outline: 0.06 });
  add(head, geo('hairCap'), HAIR, { position: [0, 1.25, 0], scale: [1.88, 1.63, 1.68], outline: 0.04 });
  add(head, GEO.cone, HAIR, { position: [0, 1.85, 1.52], rotation: [-0.22, 0, Math.PI], scale: [0.55, 0.56, 0.1], outline: 0.02 }); // 이마 곡면을 따라 살짝 눕혀 겉으로 나오게
  [-1, 1].forEach((sd) => bun(head, sd * 1.0, 2.75));
  const face = sirenFace(head);
  bake(head, [face.mouth, ...face.brows, ...face.blush]);
  bake(body);
  [armL, armR].forEach((a) => bake(a));
  // 꼬리: 물속에서 뒤로 휘어져 나간 빨간 마디 + 지느러미(휘두를 때 물 위로 솟는다)
  const tail = new THREE.Group();
  tail.position.set(0, -0.4, -0.6);
  root.add(tail);
  [[0, 0, 0, 1.2], [0.3, -0.3, -1.5, 1.0], [0.8, -0.3, -2.8, 0.8], [1.4, -0.1, -3.8, 0.6]].forEach(([x, y, z, r]) => add(tail, GEO.sphereMid, TAIL, { position: [x, y, z], scale: [r, r * 0.8, r * 1.1], outline: 0.05 }));
  const fin = new THREE.Group();
  fin.position.set(1.9, 0.2, -4.4);
  tail.add(fin);
  [-1, 1].forEach((sd) => add(fin, GEO.sphere, TAIL, { position: [sd * 0.6, 0.35, -0.4], rotation: [0, 0, sd * 0.7], scale: [0.85, 0.2, 0.55], outline: 0.04 }));
  bake(tail); bake(fin);
  return { root, parts: { body, head, armL, armR, tail, fin, ...face } };
}

/** 인어: 세이렌을 작게 줄인 아이(하얀 몸 · 빨간 모자 머리와 꼭지 · 동그랗게 벌린 입 · 지느러미 손 · 분홍 띠 아래 빨간 꼬리). */
export function buildMermaid() {
  const root = new THREE.Group();
  add(root, geo('fish'), null, { material: painted(), position: [0, 0.2, 0], scale: [0.36, 0.36, 0.34], outline: 0.02 });
  add(root, GEO.sphere, WHITE, { position: [0, 0.62, 0], scale: [0.4, 0.38, 0.37], outline: 0.025 });
  add(root, geo('cap'), TAIL, { position: [0, 0.64, -0.01], scale: [0.415, 0.395, 0.385], outline: 0.02 });
  [-1, 1].forEach((sd) => add(root, GEO.sphere, TAIL, { position: [sd * 0.035, 1.03, 0.04], rotation: [0, 0, sd * 0.45], scale: [0.05, 0.085, 0.05], outline: 0.012 })); // 머리 위 빨간 꼭지
  [-1, 1].forEach((sd) => {
    add(root, GEO.dot, INK, { position: [sd * 0.1, 0.64, 0.355], scale: [0.04, 0.055, 0.02], outline: false }); // 가까이 붙은 점 눈
    add(root, GEO.box, INK, { position: [sd * 0.11, 0.735, 0.348], rotation: [0, 0, -sd * 0.35], scale: [0.08, 0.016, 0.015], outline: false }); // 안쪽이 올라간 짧은 눈썹
    add(root, GEO.sphere, WHITE, { position: [sd * 0.44, 0.56, 0.02], rotation: [0, 0, sd * 0.5], scale: [0.16, 0.09, 0.06], outline: 0.012 });
  });
  const mouth = add(root, GEO.dot, '#7a2a36', { position: [0, 0.5, 0.36], scale: [0.042, 0.03, 0.02], outline: false }); // 동그랗게 벌린 입
  const fin = new THREE.Group();
  fin.position.set(0.1, 0.08, -0.34);
  root.add(fin);
  add(fin, GEO.sphere, TAIL, { position: [0, 0, 0], scale: [0.18, 0.15, 0.32], outline: 0.02 });
  [-1, 1].forEach((sd) => add(fin, GEO.sphere, TAIL, { position: [sd * 0.15, 0.17, -0.32], rotation: [0, 0, sd * 0.8], scale: [0.19, 0.05, 0.12], outline: 0.015 }));
  bake(root, [mouth]); bake(fin);
  return { root, mouth, fin };
}

// ---------- 꽃목걸이(친구들 · 나) ----------
function lei(chibi) {
  const ring = new THREE.Group(), body = chibi.pivots.body;
  const cols = ['#ff8fb1', '#ffd45e', '#ffffff', '#ff9e6e'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(ring, GEO.dot, cols[i % 4], { position: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.27], scale: [0.06, 0.05, 0.06], outline: 0.01 });
  }
  ring.position.set(0, 0.56 - (body ? body.position.y : 0), 0.02);
  (body || chibi.root).add(bake(ring));
  ring.visible = false;
  return ring;
}
/** 꽃목걸이를 걸 수 있게 해 둔다(나중에 chibi.lei.visible 로 켠다). */
export function giveLei(chibi) { if (!chibi.lei) chibi.lei = lei(chibi); return chibi.lei; }

// ---------- 섬사람(한잎 · 두잎 · 다른 섬사람) ----------
/** 섬사람 얼굴 · 머리 장식: 점 눈(반짝) · 볼 빗금 넷씩 · 이파리(한잎 1 · 두잎 2) · 귀(토끼 · 동그란) · 꽃 화관. */
function islanderHead(head, shade, { leaves, ears, crown }) {
  add(head, GEO.sphere, shade, { position: [0, 0.42, 0], scale: [0.5, 0.47, 0.47], outline: 0.03 });
  [-1, 1].forEach((sd) => {
    add(head, GEO.dot, INK, { position: [sd * 0.17, 0.47, 0.43], scale: [0.035, 0.05, 0.02], outline: false });
    add(head, GEO.dot, '#ffffff', { position: [sd * 0.17 + 0.01, 0.49, 0.448], scale: [0.012, 0.016, 0.008], outline: false });
    for (let k = 0; k < 4; k++) add(head, GEO.box, '#5a3f45', { position: [sd * (0.22 + k * 0.035), 0.35, 0.42 - k * 0.02], rotation: [0, sd * 0.45, 0.45], scale: [0.009, 0.05, 0.01], outline: false });
  });
  const leaf = (x, rz) => add(head, GEO.sphere, LEAF, { position: [x, 1.0, 0], rotation: [0, 0, rz], scale: [0.075, 0.14, 0.025], outline: 0.012 });
  if (leaves === 1) leaf(0.02, -0.15);
  if (leaves === 2) { leaf(-0.07, 0.5); leaf(0.07, -0.5); }
  if (ears === 'bunny') [-1, 1].forEach((sd) => add(head, GEO.sphere, shade, { position: [sd * 0.15, 0.95, -0.02], rotation: [0, 0, -sd * 0.12], scale: [0.075, 0.2, 0.055], outline: 0.014 }));
  if (ears === 'round') [-1, 1].forEach((sd) => add(head, GEO.sphere, shade, { position: [sd * 0.31, 0.8, 0], scale: [0.1, 0.1, 0.06], outline: 0.012 }));
  if (crown) for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2; add(head, GEO.dot, ['#ff8fb1', '#ffd45e', '#ffffff', '#ff9e6e'][k % 4], { position: [Math.sin(a) * 0.33, 0.76, Math.cos(a) * 0.31], scale: [0.055, 0.045, 0.055], outline: 0.01 }); }
}
/** 섬사람 몸짓(idle · dance · hop · flail · wave · shy · talk · look · sob · pull · faint(엎드려 쓰러짐) …). */
function animateIslander(P, mode, t, ph = 0) {
  let bob = 0, rz = 0, rx = 0, hy = 0, hands = [0, 0], shake = 0;
  if (mode === 'dance' || mode === 'sway' || mode === 'spin') { rz = Math.sin(t * 3 + ph) * 0.18; bob = Math.abs(Math.sin(t * 6 + ph)) * 0.06; hands = [0.12 + Math.sin(t * 6) * 0.08, 0.12 - Math.sin(t * 6) * 0.08]; }
  else if (mode === 'hop' || mode === 'cheer') { bob = Math.abs(Math.sin(t * 7 + ph)) * 0.18; hands = [0.18, 0.18]; }
  else if (mode === 'flail') { shake = 0.05; bob = Math.abs(Math.sin(t * 12)) * 0.06; hands = [0.15 + Math.sin(t * 16) * 0.15, 0.15 - Math.sin(t * 16) * 0.15]; }
  else if (mode === 'wave') hands = [0, 0.22 + Math.sin(t * 8) * 0.06];
  else if (mode === 'shy') { rz = 0.12; hy = -0.3; hands = [0.06, 0.06]; }
  else if (mode === 'talk') bob = Math.abs(Math.sin(t * 5)) * 0.03;
  else if (mode === 'look') hy = Math.sin(t * 1.2 + ph) * 0.6;
  else if (mode === 'sob' || mode === 'hurt') { shake = 0.025; rx = 0.15; }
  else if (mode === 'pull') { rx = Math.sin(t * 3 + ph) * 0.25; hands = [0.05, 0.05]; }
  else bob = (Math.sin(t * 2.2 + ph) + 1) * 0.01;
  const down = mode === 'faint'; // 엎드려 쓰러진다(등이 위로)
  P.body.position.set(shake ? Math.sin(t * 40) * shake : 0, down ? 0.36 : bob, 0);
  P.body.rotation.set(down ? Math.PI / 2 : rx, 0, rz);
  P.head.rotation.y = hy;
  P.hands.forEach((h, i) => { h.position.y = 0.42 + hands[i]; });
}
/** 섬사람: { leaves: 0 | 1(한잎) | 2(두잎), ears: null | 'bunny' | 'round', crown, shade }. animate(mode, t, phase) 로 움직인다. */
export function buildIslander({ leaves = 0, ears = null, crown = false, shade = ISLE_GREY } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  root.add(body);
  add(body, geo('skirt'), shade, { outline: 0.025 }); // 훌라 치마처럼 아래로 퍼진 몸
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; add(body, GEO.box, INK, { position: [Math.sin(a) * 0.415, 0.07, Math.cos(a) * 0.415], rotation: [0, a, 0], scale: [0.012, 0.11, 0.012], outline: false }); } // 밑단 술
  const hands = [-1, 1].map((sd) => { const h = new THREE.Group(); h.position.set(sd * 0.33, 0.42, 0.12); add(h, GEO.sphere, shade, { scale: [0.075, 0.07, 0.07], outline: 0.012 }); body.add(h); return h; });
  head.position.set(0, 0.36, 0);
  body.add(head);
  islanderHead(head, shade, { leaves, ears, crown });
  bake(body); bake(head);
  const P = { body, head, hands };
  return { root, pivots: { body, head }, props: {}, custom: true, animate: (mode, t, ph) => animateIslander(P, mode, t, ph) };
}
/** 두잎 등의 작은 뚜껑(건전지 칸처럼 보이는). 처음엔 숨김. */
export function addBatteryLid(c) {
  const lid = add(c.pivots.body, GEO.box, '#5f5b62', { position: [0, 0.3, -0.355], scale: [0.16, 0.11, 0.02], outline: 0.01 });
  add(lid, GEO.box, '#3a3d44', { position: [0, 0, -0.6], scale: [0.5, 0.12, 0.5], outline: false });
  lid.visible = false;
  return lid;
}

// ---------- 시마지로 · 탈것 · 덩굴 ----------
/** 시마지로: 정글 속 카레 · 조개 가게 주인. 웃통 벗은 큰 덩치(햇볕에 탄 몸), 머리띠 · 목에 수건 · 반바지. */
export function buildJiro() {
  const c = buildChibi(normalizeLook({ ears: 'round', body: '#d9a06b', cheek: '#e58a6e', eyes: 'dot', brows: 'thick', mouth: 'grin', hair: 'tuft', hairColor: '#3a3236' }));
  const h = c.pivots.head, b = c.pivots.body;
  if (h) add(h, GEO.cylinder, '#ffffff', { position: [0, 0.86 - h.position.y, 0], scale: [0.44, 0.07, 0.41], outline: 0.012 });
  if (b) {
    add(b, GEO.cylinder, '#3f6fb5', { position: [0, 0.06 - b.position.y, 0], scale: [0.35, 0.16, 0.32], outline: 0.014 });
    add(b, GEO.cylinder, '#f4f1e8', { position: [0, 0.5 - b.position.y, 0], scale: [0.27, 0.06, 0.25], outline: 0.012 });
  }
  c.root.scale.setScalar(1.45);
  return c;
}

/** 오리 배(원작 섬 합숙의 하얀 새 모양 배): 하얀 몸통 · 긴 목 · 노란 부리, 등에 창문 난 둥근 선실(앞 = +z, 선실은 뒤쪽). deckY: 갑판 높이(사람은 선실 앞 z > -0.5 에). */
export function buildDuckBoat() {
  const root = new THREE.Group(), W = '#fbfaf6';
  add(root, GEO.sphere, W, { position: [0, 0.1, 0], scale: [2.3, 0.85, 4.4], outline: 0.06 });
  add(root, GEO.box, '#efe9dc', { position: [0, 0.9, 0], scale: [3.3, 0.1, 6.6], outline: 0.035 });
  // 둥근 선실: 반구 + 밑동 띠 + 앞문 + 둘레 창문
  add(root, GEO.sphere, W, { position: [0, 0.95, -2.2], scale: [1.45, 1.25, 1.55], outline: 0.05 });
  add(root, GEO.cylinder, '#ddd6c8', { position: [0, 0.95, -2.2], scale: [1.48, 0.1, 1.58], outline: 0.015 });
  add(root, GEO.box, '#8f97a1', { position: [0, 1.32, -0.68], scale: [0.5, 0.66, 0.06], outline: 0.014 });
  [-1.25, -0.65, 0.65, 1.25].forEach((a) => add(root, GEO.box, '#9fb3c2', { position: [Math.sin(a) * 1.3, 1.62, -2.2 + Math.cos(a) * 1.38], rotation: [0, a, 0], scale: [0.32, 0.26, 0.05], outline: 0.012 }));
  // 긴 목(앞으로 굽었다가 위로) · 머리 · 노란 부리 · 까만 눈
  add(root, GEO.cylinder, W, { position: [0, 0.9, 3.0], rotation: [0.55, 0, 0], scale: [0.55, 1.6, 0.55], outline: 0.05 });
  add(root, GEO.cylinder, W, { position: [0, 2.15, 3.8], rotation: [-0.15, 0, 0], scale: [0.5, 1.5, 0.5], outline: 0.05 });
  add(root, GEO.sphere, W, { position: [0, 3.75, 3.75], scale: [0.75, 0.7, 0.85], outline: 0.05 });
  add(root, GEO.sphere, '#f2c14e', { position: [0, 3.62, 4.55], scale: [0.36, 0.16, 0.5], outline: 0.03 });
  [-1, 1].forEach((sd) => add(root, GEO.dot, INK, { position: [sd * 0.5, 3.88, 3.95], scale: [0.08, 0.1, 0.04], outline: false }));
  add(root, GEO.cone, W, { position: [0, 0.75, -4.0], rotation: [-0.9, 0, 0], scale: [0.8, 1.4, 0.45], outline: 0.04 }); // 꽁지
  return { root: bake(root), deckY: 0.96 };
}

/** 작은 나무 보트(앞 = +z). 세 명까지. */
export function buildRowBoat(color = '#a0703f') {
  const root = new THREE.Group();
  add(root, GEO.box, color, { position: [0, 0.18, 0], scale: [1.5, 0.36, 3.2], outline: 0.03 });
  add(root, GEO.box, '#c49a6c', { position: [0, 0.38, 0], scale: [1.3, 0.06, 2.9], outline: 0.02 });
  add(root, GEO.cone, color, { position: [0, 0.18, 1.6], rotation: [Math.PI / 2, 0, 0], scale: [0.75, 0.6, 0.18], outline: 0.02 });
  [-1, 1].forEach((sd) => add(root, GEO.cylinder, '#8a5a34', { position: [sd * 0.95, 0.45, -0.2], rotation: [0, 0, sd * 1.1], scale: [0.04, 1.6, 0.04], outline: 0.01 })); // 노
  return { root: bake(root), deckY: 0.4 };
}

/** 덩굴에 묶인 모습: 몸을 감는 초록 고리 셋 + 잎. */
export function buildVineWrap() {
  const g = new THREE.Group(), ring = new THREE.TorusGeometry(0.4, 0.05, 6, 18);
  [0.25, 0.48, 0.7].forEach((y, i) => g.add(toonMesh(ring, '#4f9a4a', { shadow: false, outline: 0.012, position: [0, y, 0], rotation: [Math.PI / 2 + (i - 1) * 0.2, 0, 0], scale: [1 - i * 0.08, 1 - i * 0.08, 1] })));
  [[0.38, 0.55, 0.1], [-0.36, 0.3, 0.12], [0.1, 0.8, 0.34]].forEach(([x, y, z]) => add(g, GEO.sphere, '#6fc767', { position: [x, y, z], scale: [0.1, 0.04, 0.07], outline: 0.01 }));
  return bake(g);
}
/**
 * 덩굴 줄기들: 물에서 솟아 꿈틀대는 마디 사슬 n 개(마디 len 개씩)를 인스턴스 하나로(외곽선도 같은 자리를 함께 쓴다 → 그리기 2번).
 * set(i, j, x, y, z, s): i 번째 줄기의 j 번째 마디 자리 · 크기. 다 놓았으면 done().
 */
export function buildTendrils(n = 6, len = 8) {
  const count = n * len, zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const group = toonInstances(GEO.sphereMid, '#ffffff', Array.from({ length: count }, () => zero), { outline: 0.02, shadow: false });
  const [mesh, line] = group.children, c = new THREE.Color(), m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) mesh.setColorAt(i, c.set(i % 2 ? '#4f9a4a' : '#5aa653'));
  [mesh, line].forEach((o) => { if (o) o.frustumCulled = false; }); // 매 장면 자리가 바뀐다
  return {
    root: group, len,
    set(i, j, x, y, z, s) { mesh.setMatrixAt(i * len + j, m4.makeScale(s, s, s).setPosition(x, y, z)); },
    done() { mesh.instanceMatrix.needsUpdate = true; }
  };
}
