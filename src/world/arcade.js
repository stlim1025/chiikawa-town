import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { ARCADE } from '../core/layout.js';
import { SWAP_BODY, MY_BODY } from '../core/swap.js';

/**
 * 사이드스토리 '몸이 바뀌었다'(원작 애니 202 ~ 210화 「슬롯」 — stories/swap.js)의 장소와 장면.
 *  createArcadeFront: 서쪽 숲 어귀(숲길 옆)의 낡은 게임센터 겉모습 — 콘크리트 건물, 노란 글씨 '게임 센터' 간판, 금 간 유리 여닫이문, 덩굴.
 *  createArcadeStage: 게임센터 안 — 먼지 쌓인 오락기들 사이의 노란 슬롯머신(구름 모양 머리의 웃는 얼굴 · 하늘색 손 둘 · 릴 셋 · 빨간 버튼 셋 · 메달 받이),
 *    우리 넷(몸이 바뀌면 속은 그 자리에 두고 생김새만 바꿔 단다) · 끝에 들이닥치는 모몽가.
 * 게임에서 정한 부분: 건물이 선 자리, 가게 안 모습, 눈썹이 바뀌는 첫 판의 눈썹 모양, 몸이 바뀔 때의 빛과 반짝이, 모몽가가 기계를 부수는 모습.
 */
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const lerp = (a, b, u) => a + (b - a) * u;
const hideProps = (c) => Object.values(c.props || {}).flat().forEach((m) => { m.visible = false; });
const INK = '#4a3b35';

/** 릴 그림(원작 화면): 초록 화살표 둘(바꾸기) · 웃는 얼굴 · 하늘색 손 · 분홍 물음표 · 노란 번개. 0 번 칸이 바꾸기. */
export const REEL = ['swap', 'smile', 'hand', 'what', 'bolt'];
const N = REEL.length, CELL = 128, VIS = 1.5; // 칸 수 · 그림 한 칸 크기 · 창에 보이는 칸 수
/** 릴이 도는 빠르기(칸/초): 오른쪽 릴일수록 조금씩 빠르다. */
export const SPIN = [3.0, 3.3, 3.6];
/** 멈춰 버튼을 누른 때가 바꾸기 칸에서 이만큼(초) 이르거나 늦어도 바꾸기 칸에 선다(0.2초 늦게 누르는 사람도 맞게). */
export const STOP_EARLY = 0.5, STOP_LATE = 0.32;

/** 릴 그림 한 칸(가운데 cx, cy). */
function drawSymbol(g, kind, cx, cy) {
  g.save();
  g.translate(cx, cy);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = INK;
  if (kind === 'swap') { // 빙글 서로를 쫓는 초록 화살표 둘
    for (const a0 of [0, Math.PI]) {
      const a1 = a0 + Math.PI - 0.5;
      g.lineWidth = 20; g.strokeStyle = INK;
      g.beginPath(); g.arc(0, 0, 34, a0 + 0.35, a1); g.stroke();
      g.lineWidth = 11; g.strokeStyle = '#3aa65a';
      g.beginPath(); g.arc(0, 0, 34, a0 + 0.35, a1); g.stroke();
      const x = Math.cos(a1) * 34, y = Math.sin(a1) * 34, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
      g.fillStyle = '#3aa65a'; g.strokeStyle = INK; g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x + tx * 22, y + ty * 22);
      g.lineTo(x + nx * 16, y + ny * 16);
      g.lineTo(x - nx * 16, y - ny * 16);
      g.closePath(); g.fill(); g.stroke();
    }
  } else if (kind === 'smile') { // 웃는 얼굴
    g.fillStyle = '#ffe9a8'; g.lineWidth = 6;
    g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK;
    [-14, 14].forEach((x) => { g.beginPath(); g.ellipse(x, -8, 5, 7, 0, 0, Math.PI * 2); g.fill(); });
    g.lineWidth = 5;
    g.beginPath(); g.arc(0, 2, 17, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = '#f7a8b8';
    [-26, 26].forEach((x) => { g.beginPath(); g.ellipse(x, 10, 7, 4, 0, 0, Math.PI * 2); g.fill(); });
  } else if (kind === 'hand') { // 하늘색 손(엄지가 옆으로)
    g.fillStyle = '#9fd3f0'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(-25, 8, 10, 17, -0.6, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(4, 2, 26, 33, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.lineWidth = 4;
    [-6, 6, 17].forEach((x) => { g.beginPath(); g.moveTo(x, -28); g.lineTo(x, -12); g.stroke(); });
  } else if (kind === 'what') { // 분홍 물음표
    g.font = '900 100px "Arial Rounded MT Bold", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeText('?', 0, 6);
    g.fillStyle = '#f58fb4'; g.fillText('?', 0, 6);
  } else { // 노란 번개
    g.fillStyle = '#ffd43b'; g.lineWidth = 6;
    g.beginPath();
    [[6, -46], [-20, 6], [-2, 6], [-10, 46], [22, -8], [4, -8], [14, -46]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}
/** 릴 띠 그림: 칸 k 는 아래에서 k 번째(무늬 v 가 k/N ~ (k+1)/N — 릴 자리 p 가 커지면 그림이 아래로 흘러간다). */
let stripCanvas = null;
function reelStrip() {
  if (stripCanvas) return stripCanvas;
  const c = document.createElement('canvas');
  c.width = CELL; c.height = CELL * N;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf6ea';
  g.fillRect(0, 0, c.width, c.height);
  REEL.forEach((kind, k) => {
    g.strokeStyle = 'rgba(74, 59, 53, 0.2)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(10, (N - k) * CELL - 1); g.lineTo(CELL - 10, (N - k) * CELL - 1); g.stroke();
    drawSymbol(g, kind, CELL / 2, (N - k - 0.5) * CELL);
  });
  return (stripCanvas = c);
}

/** 간판: 짙은 판에 노란 글씨 '게임 센터'. */
function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d');
    g.fillStyle = '#4b4f5a';
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = 'rgba(255, 255, 255, 0.06)'; // 비에 씻긴 얼룩
    for (let i = 0; i < 18; i++) g.fillRect((i * 83) % 500, (i * 37) % 90, 18 + (i % 3) * 8, 4);
    g.font = '700 74px Gaegu, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#2e2f36'; g.strokeText('게임 센터', 256, 52);
    g.fillStyle = '#ffd54a'; g.fillText('게임 센터', 256, 52);
    t.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load('700 74px Gaegu').then(draw, () => {});
  return t;
}
/** 금 간 유리(뿌연 하늘빛에 흰 금이 사방으로). */
function glassTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 256);
  grad.addColorStop(0, '#cfe4ec'); grad.addColorStop(1, '#9fbecb');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255, 255, 255, 0.35)'; // 비친 빛
  g.beginPath(); g.moveTo(18, 0); g.lineTo(44, 0); g.lineTo(8, 90); g.lineTo(0, 90); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.9)'; g.lineWidth = 2.4; g.lineCap = 'round';
  const cx = 76, cy = 104;
  [[-0.2, 70], [0.7, 58], [1.6, 64], [2.4, 52], [3.3, 80], [4.2, 60], [5.2, 72]].forEach(([a, len]) => {
    g.beginPath(); g.moveTo(cx, cy);
    const mx = cx + Math.cos(a) * len * 0.5 + 6, my = cy + Math.sin(a) * len * 0.5 - 4;
    g.lineTo(mx, my); g.lineTo(cx + Math.cos(a + 0.12) * len, cy + Math.sin(a + 0.12) * len); g.stroke();
  });
  g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 마을: 숲 어귀의 낡은 게임센터. 이야기를 받기 전에는 없고 받은 뒤로는(끝나도) 늘 서 있다(visible). → { spot: 문 앞(이야기가 시작되는 자리), sign: 간판 자리, visible } */
export function createArcadeFront(scene, village) {
  const { x, z } = ARCADE; // 숲길 북쪽 빈터(core/layout.js — 둘레에 숲 나무를 심지 않는다): 문(+z)이 길과 카메라 쪽을 본다
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  // 다른 집처럼 내 캐릭터를 가리면(건물 뒤로 가면) 반투명해진다(world/village.js 의 fadeBuilding)
  const f = village.fadeBuilding(x, z, 2.4);
  const m = (geo, c, o) => { const mesh = toonMesh(geo, null, { shadow: true, ...o, material: f.mat(c) }); g.add(mesh); f.add(mesh); return mesh; };
  const CON = '#b8b6ae', CON_D = '#9c9a92', VINE = '#5f9a4e', VINE_D = '#4c8040', LEAF = '#7cb85e';
  m(GEO.box, CON, { position: [0, 1.45, 0], scale: [4.6, 2.9, 3.4], outline: 0.03, shell: true });
  m(GEO.box, CON_D, { position: [0, 2.95, 0], scale: [4.8, 0.16, 3.6], outline: 0.025, shell: true }); // 납작한 지붕 테두리
  [[-1.75, 0.55, 0.5, 0.9], [1.95, 1.95, 0.4, 0.7], [-0.6, 2.75, 1.4, 0.14], [1.2, 0.35, 0.9, 0.3]] // 빗물 얼룩
    .forEach(([sx, sy, w, h]) => m(GEO.box, '#a6a49b', { position: [sx, sy, 1.705], scale: [w, h, 0.02], outline: false, shadow: false }));
  // 문 위 간판
  m(GEO.box, '#3c3f48', { position: [0, 2.42, 1.76], scale: [3.0, 0.62, 0.1], outline: 0.025, shell: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 0.52), f.own(new THREE.MeshBasicMaterial({ map: signTexture() })));
  sign.position.set(0, 2.42, 1.815);
  g.add(sign);
  // 금 간 유리 여닫이문 · 양옆 창
  const glass = f.own(new THREE.MeshBasicMaterial({ map: glassTexture() }));
  m(GEO.box, '#8d9096', { position: [0, 1.0, 1.72], scale: [1.72, 2.02, 0.06], outline: 0.02, shell: true });
  [-0.41, 0.41].forEach((dx) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.84), glass);
    p.position.set(dx, 0.98, 1.756);
    if (dx > 0) p.scale.x = -1; // 금이 거울처럼 맞은편에
    g.add(p);
    m(GEO.box, '#d8dade', { position: [dx * 0.22, 1.0, 1.77], scale: [0.04, 0.32, 0.03], outline: 0.008, shadow: false }); // 손잡이
  });
  m(GEO.box, '#6f7278', { position: [0, 1.0, 1.765], scale: [0.04, 1.86, 0.02], outline: false, shadow: false }); // 두 문 사이
  [-1.62, 1.62].forEach((dx) => {
    m(GEO.box, '#8d9096', { position: [dx, 1.4, 1.72], scale: [0.86, 0.74, 0.05], outline: 0.018, shell: true });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.62), glass);
    p.position.set(dx, 1.4, 1.75);
    g.add(p);
  });
  // 덩굴: 양 모서리를 타고 오르고, 지붕 끝에서 늘어진다(간판 글씨는 가리지 않게 가장자리만)
  [-2.25, 2.25].forEach((cx, side) => {
    m(GEO.cylinder, VINE_D, { position: [cx, 0, 1.72], rotation: [0, 0, side ? -0.06 : 0.06], scale: [0.035, 2.9, 0.035], outline: 0.008, shadow: false });
    for (let k = 0; k < 9; k++) {
      const y = 0.25 + k * 0.32, w = Math.sin(k * 1.7 + side) * 0.14;
      m(GEO.sphere, k % 3 ? LEAF : VINE, { position: [cx + w, y, 1.75], scale: [0.17, 0.12, 0.08], outline: 0.01, shadow: false });
    }
  });
  for (let i = 0; i < 12; i++) {
    const sx = (i < 6 ? -2.3 : 1.55) + (i % 6) * 0.15, len = 0.35 + ((i * 37) % 5) * 0.14;
    for (let k = 0; k < 3; k++) m(GEO.sphere, (i + k) % 2 ? LEAF : VINE, { position: [sx, 2.92 - len * (k / 2.2), 1.82], scale: [0.11, 0.1, 0.07], outline: 0.008, shadow: false });
  }
  [[-2.4, 0.2, 1.4], [2.45, 0.15, 1.2], [-2.3, 0.15, -1.2], [1.0, 0.12, 1.85]].forEach(([bx, by, bz]) => m(GEO.sphere, VINE, { position: [bx, by, bz], scale: [0.42, 0.3, 0.38], outline: 0.015 })); // 덤불
  g.visible = false;
  // 막힘: 보일 때만(soft 면 지나갈 수 있고 풀 · 꽃만 비켜 돋는다)
  const block = { x, z, box: { hx: 2.35, hz: 1.75, yaw: 0 }, soft: true };
  village.obstacles.push(block);
  return {
    spot: { x, z: z + 2.9 },
    sign: { x, y: 3.3, z: z + 1.9 },
    get visible() { return g.visible; },
    set visible(on) { if (g.visible === !!on) return; g.visible = !!on; block.soft = !on; village.refreshNav(); }
  };
}

/** 노란 슬롯머신(원작 그림): 앞이 +z, 바닥 가운데가 원점. → { group, top(구름 머리 — 부서질 때 떨어진다), hands, buttons, reels } */
function buildSlot() {
  const group = new THREE.Group();
  const t = (geo, c, o, parent = group) => { const mesh = toonMesh(geo, c, { shadow: false, ...o }); parent.add(mesh); return mesh; };
  const YEL = '#f5c84a', YEL_D = '#d9a63a', SILVER = '#c9ced6';
  t(GEO.box, YEL_D, { position: [0, 0.06, 0], scale: [1.62, 0.12, 0.96], outline: 0.02, shell: true });
  t(GEO.box, YEL, { position: [0, 0.78, 0], scale: [1.5, 1.32, 0.86], outline: 0.025, shell: true });
  t(GEO.box, YEL_D, { position: [0, 1.46, 0], scale: [1.56, 0.06, 0.9], outline: 0.02, shell: true });
  // 릴 창: 짙은 판에 하얀 창틀 셋, 가운데를 가로지르는 빨간 줄(맞추는 줄)
  t(GEO.box, INK, { position: [0, 1.1, 0.43], scale: [1.26, 0.52, 0.03], outline: false });
  const reels = [-0.4, 0, 0.4].map((x) => {
    t(GEO.box, '#ffffff', { position: [x, 1.1, 0.445], scale: [0.35, 0.44, 0.02], outline: 0.012, shell: true });
    const tex = new THREE.CanvasTexture(reelStrip());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, VIS / N);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), new THREE.MeshBasicMaterial({ map: tex }));
    mesh.position.set(x, 1.1, 0.458);
    group.add(mesh);
    return { mesh, tex, p: 0, v: 0, stop: null };
  });
  t(GEO.box, '#e0524f', { position: [0, 1.1, 0.462], scale: [1.18, 0.012, 0.004], outline: false });
  // 메달 넣는 곳 · 받이
  t(GEO.box, SILVER, { position: [0.58, 0.88, 0.436], scale: [0.12, 0.2, 0.02], outline: 0.008 });
  t(GEO.box, '#2e2622', { position: [0.58, 0.88, 0.448], scale: [0.03, 0.13, 0.01], outline: false });
  t(GEO.box, SILVER, { position: [0, 0.24, 0.5], scale: [0.7, 0.14, 0.2], outline: 0.015, shell: true });
  t(GEO.box, '#5b5560', { position: [0, 0.3, 0.52], scale: [0.6, 0.05, 0.14], outline: false });
  [[-0.18, 0.54], [0.05, 0.5], [0.16, 0.55]].forEach(([mx, mz]) => t(GEO.cylinder, SILVER, { position: [mx, 0.325, mz], scale: [0.045, 0.012, 0.045], outline: 0.006 }));
  // 빨간 버튼 셋(비스듬한 받침 위)
  t(GEO.box, YEL_D, { position: [0, 0.68, 0.5], rotation: [0.35, 0, 0], scale: [1.36, 0.08, 0.26], outline: 0.015, shell: true });
  const buttons = [-0.4, 0, 0.4].map((x) => {
    t(GEO.cylinder, SILVER, { position: [x, 0.7, 0.52], scale: [0.11, 0.035, 0.11], outline: 0.01 });
    const b = t(GEO.sphere, '#e0473f', { position: [x, 0.745, 0.52], scale: [0.085, 0.05, 0.085], outline: 0.012 });
    b.userData.y = b.position.y;
    return b;
  });
  // 구름 머리: 웃는 얼굴, 양옆에 하늘색 손
  const top = new THREE.Group();
  top.position.set(0, 1.49, 0);
  group.add(top);
  const W = '#fbfaf5';
  [[0, 0.42, 0, 0.62, 0.42, 0.4], [-0.5, 0.3, 0, 0.36, 0.32, 0.34], [0.5, 0.3, 0, 0.36, 0.32, 0.34], [-0.24, 0.72, -0.02, 0.36, 0.3, 0.3], [0.24, 0.72, -0.02, 0.36, 0.3, 0.3]]
    .forEach(([x, y, z, sx, sy, sz]) => t(GEO.sphere, W, { position: [x, y, z], scale: [sx, sy, sz], outline: 0.02 }, top));
  [-0.15, 0.15].forEach((x) => t(GEO.sphere, INK, { position: [x, 0.5, 0.375], scale: [0.034, 0.05, 0.02], outline: false }, top));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: INK }));
  smile.position.set(0, 0.37, 0.396);
  smile.rotation.z = Math.PI;
  top.add(smile);
  [-0.27, 0.27].forEach((x) => t(GEO.sphere, '#f7a8b8', { position: [x, 0.37, 0.352], scale: [0.06, 0.03, 0.015], outline: false }, top));
  const hands = [-1, 1].map((sd) => {
    const h = new THREE.Group();
    h.position.set(sd * 0.8, 0.32, 0.05);
    top.add(h);
    t(GEO.sphere, '#9fd3f0', { position: [sd * 0.12, 0.12, 0], rotation: [0, 0, -sd * 0.5], scale: [0.15, 0.19, 0.1], outline: 0.014 }, h);
    t(GEO.sphere, '#9fd3f0', { position: [0, 0.16, 0.06], rotation: [0, 0, sd * 0.6], scale: [0.05, 0.09, 0.05], outline: 0.01 }, h); // 엄지
    h.userData.sd = sd;
    return h;
  });
  return { group, top, hands, buttons, reels };
}

/** 낡은 오락기 하나(어두운 화면 · 빨간 막대). */
function buildCabinet(color) {
  const g = new THREE.Group();
  const t = (geo, c, o) => g.add(toonMesh(geo, c, { shadow: false, ...o }));
  t(GEO.box, color, { position: [0, 0.85, 0], scale: [0.86, 1.7, 0.7], outline: 0.02, shell: true });
  t(GEO.box, '#2b2d36', { position: [0, 1.22, 0.33], rotation: [-0.2, 0, 0], scale: [0.64, 0.5, 0.04], outline: 0.01 });
  t(GEO.box, color, { position: [0, 0.82, 0.45], scale: [0.86, 0.12, 0.3], outline: 0.015, shell: true });
  t(GEO.cylinder, '#3a3a40', { position: [-0.18, 0.88, 0.48], scale: [0.02, 0.1, 0.02], outline: false });
  t(GEO.sphere, '#e0473f', { position: [-0.18, 0.99, 0.48], scale: [0.04, 0.04, 0.04], outline: 0.008 });
  [0.08, 0.2].forEach((x) => t(GEO.sphere, '#ffd54a', { position: [x, 0.89, 0.5], scale: [0.03, 0.015, 0.03], outline: 0.006 }));
  t(GEO.box, '#e8e2d4', { position: [0, 1.6, 0.36], scale: [0.7, 0.14, 0.02], outline: 0.008 }); // 이름판(바래서 글씨가 안 보인다)
  return g;
}

const SLOT_AT = [0, -1.9];
const MID = [0, 0.25];
const KINDS = ['me', 'chiikawa', 'hachiware', 'usagi', 'momonga'];
const BODY = { me: MY_BODY, ...SWAP_BODY }; // 몸이 바뀌면: 속(서는 자리) → 몸(모델, 'me' 는 내 몸)
// 장면마다 서는 자리(속 기준) [x, z, 몸짓, 바라보는 곳('slot' | 'mid' | 'cam' | [x, z])]
const SPOTS = {
  arrive: { me: [-1.5, 1.8, 'look', 'slot'], chiikawa: [-0.55, 2.1, 'shy', 'slot'], hachiware: [0.45, 1.9, 'look', 'slot'], usagi: [1.4, 1.5, 'hop', 'slot'] },
  // 슬롯 앞: 기계(릴 창 · 투입구)가 보이게 가운데를 비우고 양옆으로
  slot: { me: [-1.2, -0.15, 'idle', 'slot'], chiikawa: [-1.05, -1.0, 'shy', 'slot'], hachiware: [1.55, -0.55, 'look', 'slot'], usagi: [1.0, -1.15, 'idle', 'slot'] },
  talk: { me: [-1.3, 0.45, 'idle', 'mid'], chiikawa: [-0.5, -0.25, 'idle', 'mid'], hachiware: [0.5, -0.2, 'talk', 'mid'], usagi: [1.3, 0.4, 'idle', 'mid'] },
  // 몸이 막 바뀌었다: 저마다 제 손 · 몸을 내려다본다
  swapped: { me: [-1.3, 0.45, 'look', 'cam'], chiikawa: [-0.5, -0.25, 'think', 'cam'], hachiware: [0.5, -0.2, 'look', 'cam'], usagi: [1.3, 0.4, 'flail', 'cam'] },
  // 릴 놀이: 카메라가 릴 창 바로 앞이라 다들 양옆으로 비켜선다
  reels: { me: [-0.95, -1.05, 'idle', 'slot'], chiikawa: [-1.5, -0.45, 'shy', 'slot'], hachiware: [1.45, -0.4, 'look', 'slot'], usagi: [0.95, -1.0, 'hop', 'slot'] },
  back: { me: [-1.3, 0.45, 'cheer', 'mid'], chiikawa: [-0.5, -0.25, 'sob', 'cam'], hachiware: [0.5, -0.2, 'hop', 'mid'], usagi: [1.3, 0.4, 'hop', 'mid'] },
  // 모몽가 · 부서지기: 넷은 가운데(카메라에서 기계까지)를 비우고 양옆으로 물러선다
  momonga: { me: [-1.6, 0.6, 'look', 'slot'], chiikawa: [-0.85, 1.2, 'shy', 'slot'], hachiware: [0.85, 1.2, 'look', 'slot'], usagi: [1.6, 0.6, 'look', 'slot'], momonga: [0.0, -0.95, 'idle', 'slot'] },
  smash: { me: [-1.6, 0.6, 'cower', 'slot'], chiikawa: [-0.85, 1.2, 'faint', 'cam'], hachiware: [0.85, 1.2, 'cower', 'slot'], usagi: [1.6, 0.6, 'look', 'slot'], momonga: [0.0, -0.95, 'flail', 'slot'] },
  gone: { me: [-1.6, 0.6, 'look', 'slot'], chiikawa: [-0.85, 1.2, 'shy', 'slot'], hachiware: [0.85, 1.2, 'look', 'slot'], usagi: [1.6, 0.6, 'think', 'slot'], momonga: [0.3, -0.4, 'pose', 'cam'] }
};
const SHOTS = {
  wide: { pos: [3.3, 2.7, 5.6], look: [-0.3, 0.9, -1.0], portrait: { pos: [3.8, 3.3, 8.2], look: [-0.3, 1.0, -1.0] } },
  slot: { pos: [0.15, 1.6, 1.9], look: [0.1, 1.15, -1.9], portrait: { pos: [0.15, 2.0, 3.6], look: [0.1, 1.2, -1.9] } },
  reels: { pos: [0, 1.14, -0.3], look: [0, 1.06, -1.9], portrait: { pos: [0, 1.2, 0.5], look: [0, 1.0, -1.9] } },
  talk: { pos: [0, 1.55, 3.5], look: [0, 0.75, -0.1], portrait: { pos: [0, 2.0, 5.6], look: [0, 0.8, -0.1] } },
  smash: { pos: [0, 2.2, 3.8], look: [0, 1.0, -1.4], portrait: { pos: [0, 2.6, 5.6], look: [0, 1.1, -1.4] } }
};

/** 게임센터 안 장면(처음 들어갈 때 만든다). */
export function createArcadeStage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3a3634');
  scene.fog = new THREE.Fog('#3a3634', 10, 22);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6d6560, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3); // 깨진 창으로 드는 햇빛
  sun.position.set(-4, 8, 6);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  scene.add(camera);
  const light = new THREE.Color(0.96, 0.93, 0.88);
  const toon = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); scene.add(m); return m; };

  // ---------- 가게 안: 금 간 콘크리트 바닥 · 벽, 깨진 창으로 들어온 덩굴, 줄지어 선 낡은 오락기 ----------
  toon(GEO.box, '#a9a69e', { position: [0, -0.05, -0.5], scale: [12, 0.1, 9], outline: false });
  [[-1.8, 1.4, 1.6, 0.3], [2.2, -0.4, 1.2, -0.5], [0.6, 2.3, 0.9, 1.1], [-3.1, -1.2, 1.1, 0.8]] // 바닥 금
    .forEach(([x, z, len, a]) => toon(GEO.box, '#8c897f', { position: [x, 0.004, z], rotation: [0, a, 0], scale: [len, 0.004, 0.035], outline: false }));
  toon(GEO.box, '#c9c4b8', { position: [0, 2.0, -3.3], scale: [12, 4, 0.2], outline: 0.03, shell: true });
  [-5.4, 5.4].forEach((x) => toon(GEO.box, '#bdb8ac', { position: [x, 2.0, -0.6], scale: [0.2, 4, 5.6], outline: 0.03, shell: true }));
  toon(GEO.box, '#9a958a', { position: [0, 0.12, -3.18], scale: [12, 0.24, 0.06], outline: false }); // 걸레받이
  // 깨진 창 · 들어온 덩굴
  toon(GEO.box, '#8d9096', { position: [-3.0, 2.3, -3.19], scale: [1.6, 1.1, 0.06], outline: 0.02, shell: true });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 0.96), new THREE.MeshBasicMaterial({ map: glassTexture() }));
  win.position.set(-3.0, 2.3, -3.15);
  scene.add(win);
  for (let i = 0; i < 16; i++) {
    const a = i * 0.55, x = -3.6 + (i % 8) * 0.18, y = 2.9 - (i % 5) * 0.4 - Math.floor(i / 8) * 0.3;
    toon(GEO.sphere, i % 3 ? '#7cb85e' : '#5f9a4e', { position: [x + Math.sin(a) * 0.1, y, -3.1], scale: [0.16, 0.12, 0.07], outline: 0.008 });
  }
  toon(GEO.cylinder, '#4c8040', { position: [-2.4, 0, -3.12], rotation: [0, 0, 0.25], scale: [0.03, 3.2, 0.03], outline: false });
  // 낡은 오락기들(벽을 따라)
  [[-3.9, '#5b6fa8', 0.25], [-2.7, '#8a5fa0', 0.1], [2.6, '#4f8f8a', -0.1], [3.8, '#a8645b', -0.25]].forEach(([x, c, yaw]) => {
    const cab = buildCabinet(c);
    cab.position.set(x, 0, -2.75);
    cab.rotation.y = yaw;
    scene.add(cab);
  });
  // 먼지 쌓인 작은 의자 둘
  [[-2.1, 0.4], [2.4, 0.9]].forEach(([x, z]) => {
    toon(GEO.cylinder, '#b0473f', { position: [x, 0.38, z], scale: [0.2, 0.06, 0.2], outline: 0.012 });
    toon(GEO.cylinder, '#8a8d93', { position: [x, 0, z], scale: [0.03, 0.38, 0.03], outline: false });
  });
  const slot = buildSlot();
  slot.group.position.set(SLOT_AT[0], 0, SLOT_AT[1]);
  scene.add(slot.group);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.18, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), glowMat); // 홀로 켜진 기계의 불빛
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(SLOT_AT[0], 0.01, SLOT_AT[1] + 0.8);
  scene.add(glow);
  // 메달(넣을 때 손에서 투입구로) · 반짝이 · 연기 · 화면 번쩍
  const medal = toon(GEO.cylinder, '#d8dde4', { scale: [0.07, 0.014, 0.07], outline: 0.008 });
  medal.visible = false;
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0, depthWrite: false });
  const sparks = Array.from({ length: 24 }, (_, i) => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.05, 5), sparkMat); s.userData.a = i * 1.3; s.userData.k = i % 4; scene.add(s); return s; });
  const smoke = Array.from({ length: 12 }, () => { const s = toon(GEO.sphere, '#8f8b86', { scale: [0.2, 0.2, 0.2], outline: 0.01 }); s.visible = false; return s; });
  const bits = Array.from({ length: 8 }, (_, i) => { const s = toon(GEO.box, i % 2 ? '#f5c84a' : '#e0473f', { scale: [0.1, 0.06, 0.08], outline: 0.008 }); s.visible = false; return s; });
  const flashMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), flashMat);
  flash.position.set(0, 0, -0.2);
  flash.renderOrder = 10;
  camera.add(flash);

  // ---------- 우리 넷 · 모몽가 ----------
  const models = { me: null, chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi'), momonga: buildNpc('momonga') };
  Object.values(models).forEach((c) => { if (c) { hideProps(c); scene.add(c.root); } });
  let look = null, swapped = false;
  const browMeshes = [];
  /** 그 속(kind)이 지금 든 몸(모델). */
  const charOf = (k) => (k === 'momonga' ? models.momonga : models[swapped && BODY[k] ? BODY[k] : k]);

  let shot = SHOTS.wide, snapNext = true, mood = 'arrive', shakeT = 0, sparkT = 9, flashT = 9, spinT = -1, smashT = -1;
  const anims = {}, faces = {};
  let tweens = [];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const tween = (dur, step, end) => { tweens.push({ t: 0, dur, step, end }); };
  const faceOf = (face, x, z) => (face === 'slot' ? SLOT_AT : face === 'mid' ? MID : face === 'cam' ? [x * 0.3, z + 5] : face);
  const slotWorld = (lx, ly, lz) => new THREE.Vector3(SLOT_AT[0] + lx, ly, SLOT_AT[1] + lz);

  function place(k, x, z, anim, face) {
    const c = charOf(k);
    if (!c) return;
    c.root.position.set(x, 0, z);
    const f = faceOf(face, x, z);
    faces[k] = Math.atan2(f[0] - x, f[1] - z);
    c.root.rotation.set(0, faces[k], 0);
    c.root.visible = true;
    anims[k] = anim;
  }
  function setMe(l) {
    const old = models.me;
    models.me = buildChibi(l);
    hideProps(models.me);
    if (old) {
      models.me.root.position.copy(old.root.position);
      models.me.root.rotation.copy(old.root.rotation);
      models.me.root.visible = old.root.visible;
      scene.remove(old.root);
    }
    scene.add(models.me.root);
  }
  /** 첫 판: 저마다 눈썹이 생긴다(서로 바뀐 눈썹 — 치이카와는 치켜 올라간, 하치와레는 시무룩한, 우사기는 굵은 일자, 나는 지금과 다른 눈썹). */
  function setBrows(on) {
    browMeshes.forEach((m) => m.parent && m.parent.remove(m));
    browMeshes.length = 0;
    const tilt = { chiikawa: 0.5, hachiware: -0.45, usagi: 0 };
    if (on) for (const [k, a] of Object.entries(tilt)) {
      for (const e of (models[k].roles && models[k].roles.eye) || []) {
        const sd = Math.sign(e.position.x) || 1, q = e.quaternion.clone();
        const b = new THREE.Mesh(GEO.dot, new THREE.MeshBasicMaterial({ color: '#3a2e2e' }));
        b.position.copy(e.position).add(new THREE.Vector3(0, e.scale.y * 1.75 + 0.004, -0.006).applyQuaternion(q));
        b.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sd * a));
        b.scale.set(k === 'usagi' ? 0.04 : 0.045, k === 'usagi' ? 0.016 : 0.012, 0.01);
        e.parent.add(b);
        browMeshes.push(b);
      }
    }
    // 내 몸: 만들 때 고른 눈썹을 다른 눈썹으로 바꿔 끼운다
    if (look) setMe(on ? { ...look, brows: look.brows === 'thick' ? 'worried' : 'thick' } : look);
  }
  /** 연기가 피어오르고 부품이 튄다(모몽가가 부순 기계). */
  function burst() {
    smoke.forEach((s, i) => {
      const a = i * 0.9;
      s.visible = true;
      s.position.copy(slotWorld(Math.cos(a) * 0.4, 1.2 + (i % 3) * 0.2, Math.sin(a) * 0.3 + 0.2));
      s.userData.v = new THREE.Vector3(Math.cos(a) * 0.4, 0.8 + (i % 4) * 0.25, Math.sin(a) * 0.3 + 0.3);
      s.userData.life = 1.6 + (i % 3) * 0.3;
      s.scale.setScalar(0.12);
    });
    bits.forEach((s, i) => {
      const a = i * 0.8 - 1.2;
      s.visible = true;
      s.position.copy(slotWorld(0, 1.1, 0.5));
      s.userData.v = new THREE.Vector3(Math.sin(a) * 2.2, 2.4 + (i % 3) * 0.6, 1.2 + (i % 2));
      s.userData.spin = (i % 2 ? 1 : -1) * 8;
    });
  }

  const api = {
    scene,
    camera,
    light,
    /** 새로 들어왔다: realLook 은 바뀌기 전 내 몸(몸이 바뀌면 우사기가 든다). at: 'slot'(처음 — 멀쩡한 몸으로) · 'back'(되돌리러 — 바뀐 몸으로) */
    start(realLook, at = 'slot') {
      look = realLook;
      setBrows(false);
      setMe(look);
      swapped = at === 'back';
      tweens = []; shakeT = 0; sparkT = 9; flashT = 9; spinT = -1; smashT = -1;
      flashMat.opacity = 0;
      slot.top.position.set(0, 1.49, 0);
      slot.top.rotation.set(0, 0, 0);
      slot.group.rotation.set(0, 0, 0);
      slot.buttons.forEach((b) => { b.position.y = b.userData.y; b.visible = true; });
      slot.reels.forEach((r, i) => { r.p = [1, 3, 2][i]; r.v = 0; r.stop = null; });
      glowMat.opacity = 0.18;
      medal.visible = false;
      smoke.forEach((s) => { s.visible = false; });
      bits.forEach((s) => { s.visible = false; });
      for (const c of Object.values(models)) c.root.visible = false;
      api.setMood(at === 'back' ? 'talk' : 'arrive');
      shot = SHOTS.wide; snapNext = true;
    },
    /** 카메라: wide · slot · reels · talk · smash. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.wide; if (snap) snapNext = true; },
    /** 서는 자리 · 몸짓(그 장면에 없는 사람은 숨긴다). */
    setMood(m) {
      mood = m;
      const spots = SPOTS[m] || {};
      for (const c of Object.values(models)) c.root.visible = false;
      for (const k of KINDS) if (spots[k]) place(k, ...spots[k]);
    },
    get mood() { return mood; },
    get swapped() { return swapped; },
    /** 그 사람(속)의 몸짓을 바꾼다. */
    pose(k, anim) { anims[k] = anim; },
    /** 그 사람(속)이 바라볼 곳을 바꾼다('slot' | 'mid' | 'cam' | [x, z]). */
    turn(k, face) {
      const c = charOf(k);
      if (!c) return;
      const p = c.root.position, f = faceOf(face, p.x, p.z);
      faces[k] = Math.atan2(f[0] - p.x, f[1] - p.z);
    },
    /** 눈썹 장난(첫 판): 번쩍 하고 눈썹이 바뀐다. */
    brows(on) { if (on) { flashT = 0; sparkT = 0; } setBrows(on); },
    /** who(속)가 메달을 투입구에 넣는다(손에서 투입구까지 쏙). */
    insertMedal(who) {
      const c = charOf(who);
      if (!c) return;
      const from = c.root.position.clone().add(new THREE.Vector3(0, 0.75, 0)), to = slotWorld(0.58, 0.88, 0.47);
      medal.visible = true;
      anims[who] = 'cheer';
      tween(0.7, (u) => {
        medal.position.lerpVectors(from, to, ease(u));
        medal.position.y += Math.sin(u * Math.PI) * 0.3;
        medal.rotation.set(Math.PI / 2, 0, u * 6);
      }, () => { medal.visible = false; anims[who] = SPOTS[mood] && SPOTS[mood][who] ? SPOTS[mood][who][2] : 'idle'; });
    },
    /** 릴 셋이 돌기 시작한다. */
    spin() { slot.reels.forEach((r, i) => { r.v = SPIN[i]; r.stop = null; }); glowMat.opacity = 0.32; },
    /** i 번 버튼이 쑥 들어갔다 나온다. */
    press(i) { const b = slot.buttons[i]; if (b) tween(0.22, (u) => { b.position.y = b.userData.y - Math.sin(u * Math.PI) * 0.03; }, null); },
    /** i 번 릴이 돌고 있는지. */
    spinning(i) { const r = slot.reels[i]; return !!r && (r.v > 0 || !!r.stop); },
    /** 지금 i 번 릴 가운데 칸(REEL 이름). */
    cell(i) { const r = slot.reels[i]; return REEL[((Math.round(r.p) % N) + N) % N]; },
    /** i 번 릴을 그 그림(REEL 이름)에 세운다(앞으로 조금 미끄러지며 — 이야기로 정해진 판). */
    stopOn(i, kind) {
      const r = slot.reels[i], k = REEL.indexOf(kind);
      if (!r || k < 0) return;
      const to = k + N * Math.ceil((r.p + 0.8 - k) / N);
      r.stop = { from: r.p, to, t: 0, dur: 0.3 + (to - r.p) * 0.12 };
      r.v = 0;
      api.press(i);
    },
    /**
     * 내가 멈춰 버튼으로 i 번 릴을 세운다. 바꾸기 칸이 가운데에서 STOP_EARLY 초 앞 ~ STOP_LATE 초 뒤 안이면 바꾸기 칸에 선다(늦었으면 덜컥 한 칸 물러서며).
     * rig: 'bolt' 면 맞았어도 바꾸기 바로 앞 번개 칸에 선다(이야기로 정한 첫 실패). → { hit, kind }
     */
    tryStop(i, rig = null) {
      const r = slot.reels[i];
      if (!r || !(r.v > 0)) return { hit: false, kind: null };
      const near = N * Math.round(r.p / N), d = r.p - near, v = r.v;
      const ok = d >= -STOP_EARLY * v && d <= STOP_LATE * v;
      let to;
      if (ok && !rig) to = near;
      else if (ok) to = d <= 0.6 ? near - 1 : near + N - 1; // 번개는 바꾸기 바로 앞 칸: 한 칸 모자라게
      else { to = Math.ceil(r.p + 0.15); if (((to % N) + N) % N === 0) to += 1; } // 빗나감: 바로 다음 칸(바꾸기는 건너뛴다)
      r.stop = { from: r.p, to, t: 0, dur: 0.22 + Math.abs(to - r.p) * 0.1 };
      r.v = 0;
      api.press(i);
      const kind = REEL[((to % N) + N) % N];
      return { hit: kind === 'swap', kind };
    },
    /** 빗나간 릴만 다시 돌린다. */
    respin(i) { const r = slot.reels[i]; if (r) { r.stop = null; r.v = SPIN[i]; } },
    /** 빙글빙글 빛 속에서 몸이 바뀐다(to: true 바뀐 몸 · false 원래 몸). 한가운데에서 모델을 바꿔 단다. */
    swirl(to) {
      spinT = 0;
      sparkT = 0;
      shakeT = 0.6;
      let flipped = false;
      tween(2.2, (u) => {
        if (!flipped && u >= 0.5) { flipped = true; swapped = to; setBrows(false); api.setMood(mood); }
        flashMat.opacity = Math.max(0, 1 - Math.abs(u - 0.5) * 4.5);
      }, () => { spinT = -1; flashMat.opacity = 0; });
    },
    /** 모몽가가 문으로 들어와 슬롯 앞까지 걸어온다. */
    momongaIn() {
      const c = models.momonga, to = SPOTS.momonga.momonga, from = [3.2, 2.6];
      c.root.visible = true;
      anims.momonga = 'walk';
      faces.momonga = Math.atan2(to[0] - from[0], to[1] - from[1]);
      tween(2.0, (u) => c.root.position.set(lerp(from[0], to[0], u), 0, lerp(from[1], to[1], u)), () => { anims.momonga = 'idle'; faces.momonga = 0; }); // 다 와서는 우리 쪽으로 돌아선다
    },
    /** 쾅쾅: 기계가 흔들리다가 구름 머리가 떨어지고, 연기 · 부품이 튀고, 불이 꺼진다. */
    smash() {
      smashT = 0;
      tween(0.9, (u) => { slot.group.rotation.z = Math.sin(u * Math.PI * 9) * 0.05 * (1 - u); }, () => {
        slot.group.rotation.z = 0;
        shakeT = 0.8;
        burst();
        slot.buttons.forEach((b) => { b.visible = false; });
        slot.reels.forEach((r, i) => { r.stop = null; r.v = 0; r.p = [4, 3, 1][i] + 0.35; });
        glowMat.opacity = 0;
        tween(1.1, (u) => {
          const e = u * u;
          slot.top.position.set(lerp(0, 0.9, e), lerp(1.49, 0.05, e), lerp(0, 0.9, e));
          slot.top.rotation.set(-e * 1.2, 0, -e * 1.6);
        }, () => { shakeT = 0.5; });
      });
    },
    /** 움직임(메달 · 릴 · 바뀌기 · 부서지기)이 아직 끝나지 않았는지. */
    get busy() { return tweens.length > 0 || slot.reels.some((r) => !!r.stop); },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 64 : 42;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      const live = tweens;
      tweens = [];
      for (const w of live) {
        w.t += dt;
        const u = clamp01(w.t / w.dur);
        w.step(u);
        if (u >= 1) { if (w.end) w.end(); } else tweens.push(w);
      }
      // 릴: 돌거나, 세우는 중이면 끝에서 살짝 넘쳤다가 제자리로(덜컥)
      for (const r of slot.reels) {
        if (r.stop) {
          const s = r.stop;
          s.t += dt;
          const u = clamp01(s.t / s.dur), k = 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.06;
          r.p = lerp(s.from, s.to, k);
          if (u >= 1) { r.p = s.to; r.stop = null; }
        } else if (r.v > 0) r.p += r.v * dt;
        r.tex.offset.y = (r.p + 0.5) / N - VIS / (2 * N);
      }
      // 구름 머리의 손: 살랑살랑(릴이 돌면 신나게)
      const fast = slot.reels.some((r) => r.v > 0) ? 2.4 : 1;
      if (smashT < 0) slot.hands.forEach((h) => { h.rotation.z = h.userData.sd * (0.15 + Math.sin(t * 3 * fast + h.userData.sd) * 0.18); });
      // 반짝이(몸이 바뀔 때 · 눈썹 장난): 넷의 둘레를 빙글빙글
      sparkT += dt;
      const ring = ['me', 'chiikawa', 'hachiware', 'usagi'].map((k) => charOf(k)).filter((c) => c && c.root.visible);
      sparks.forEach((s) => {
        const c = ring[s.userData.k % Math.max(1, ring.length)];
        if (!c) return;
        const a = s.userData.a + sparkT * 6, h = 0.3 + ((s.userData.a * 7 + sparkT * 1.4) % 1.1);
        s.position.set(c.root.position.x + Math.cos(a) * 0.55, h, c.root.position.z + Math.sin(a) * 0.55);
        s.lookAt(camera.position);
      });
      sparkMat.opacity = sparkT < 2.2 ? Math.sin((sparkT / 2.2) * Math.PI) : 0;
      if (flashT < 0.6) { flashT += dt; if (spinT < 0) flashMat.opacity = flashT < 0.6 ? 0.7 * (1 - flashT / 0.6) : 0; }
      // 연기 · 튄 부품
      smoke.forEach((s) => {
        if (!s.visible) return;
        s.userData.life -= dt;
        s.position.addScaledVector(s.userData.v, dt);
        s.scale.setScalar(Math.min(0.42, s.scale.x + dt * 0.25));
        if (s.userData.life <= 0) s.visible = false;
      });
      bits.forEach((s) => {
        if (!s.visible) return;
        s.userData.v.y -= 9 * dt;
        s.position.addScaledVector(s.userData.v, dt);
        s.rotation.x += s.userData.spin * dt;
        if (s.position.y < 0.03) { s.position.y = 0.03; s.userData.v.set(0, 0, 0); s.userData.spin = 0; }
      });
      // 몸짓(몸이 바뀌는 동안은 빙글빙글 돌며 붕 뜬다)
      if (spinT >= 0) spinT += dt;
      const spinYaw = spinT >= 0 ? spinT * spinT * 9 : 0, lift = spinT >= 0 ? Math.sin(clamp01(spinT / 2.2) * Math.PI) * 0.35 : 0;
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c || !c.root.visible) continue;
        const swirling = spinT >= 0 && k !== 'momonga';
        c.root.rotation.y = (faces[k] || 0) + (swirling ? spinYaw : 0);
        c.root.position.y = swirling ? lift : 0;
        animateChibi(c, swirling ? 'spin' : anims[k] || 'idle', t, { phase: k.length });
      }
      // 카메라(쿵 하면 덜컹)
      const sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot, kk = Math.min(1, dt * 2.4);
      tmpPos.set(...sh.pos); tmpLook.set(...sh.look);
      if (snapNext) { camPos.copy(tmpPos); camLook.copy(tmpLook); snapNext = false; }
      else { camPos.lerp(tmpPos, kk); camLook.lerp(tmpLook, kk); }
      camera.position.copy(camPos);
      if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); camera.position.x += Math.sin(t * 60) * 0.05 * shakeT; camera.position.y += Math.cos(t * 50) * 0.04 * shakeT; }
      camera.lookAt(camLook);
    }
  };
  return api;
}
