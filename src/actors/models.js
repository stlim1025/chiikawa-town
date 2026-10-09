import * as THREE from 'three';
import { celMaterial, addOutline, addShellOutline, GEO } from '../render/toon.js';
import { POCHETTES } from '../core/pochette.js';

const WHITE = '#fbfaf5', CHEEK = '#f5a3b5', EYE = '#2b2224', SHINE = '#ffffff', MOUTH = '#5a2b33';
const NAVY = '#6f94bb', USAGI = '#f6e8b6', EAR_PINK = '#f4b6c2'; // 하치와레 무늬는 원작처럼 연한 파랑
const MOMO_BLUE = '#bfe0f5', KURI_TOP = '#b8743d', KURI_BOT = '#f4dcab', RAKKO = '#9b7455', RAKKO_FACE = '#efe1c9';
const SHISA = '#f7cf5e', SHISA_MANE = '#e8833a', KANI = '#fbd1d8', KANI_DARK = '#f297a6', CLAW = '#ef6f7f';

/** 내 캐릭터 선택지. */
export const EAR_TYPES = [
  { id: 'round', label: '둥근 귀' }, { id: 'pointy', label: '뾰족한 귀' }, { id: 'bunny', label: '토끼 귀' }, { id: 'small', label: '작은 귀' }
];
export const BODY_COLORS = ['#ffffff', '#f8e9b0', '#ffd6e0', '#cfe7ff', '#d8f0c8', '#e6dcff', '#f6d2b0', '#d9cfc4'];
export const PATTERNS = [{ id: 'none', label: '없음' }, { id: 'part', label: '가르마' }, { id: 'spots', label: '얼룩' }];
export const CHEEK_COLORS = ['#f5a3b5', '#f7b98c', '#d7b3f0', '#ff9b9b'];
export const EYE_TYPES = [{ id: 'dot', label: '동글' }, { id: 'sparkle', label: '반짝' }, { id: 'sleepy', label: '졸린' }, { id: 'smile', label: '웃는' }];
export const BROW_TYPES = [{ id: 'none', label: '없음' }, { id: 'thin', label: '가는' }, { id: 'thick', label: '굵은' }, { id: 'worried', label: '시무룩' }];
export const MOUTH_TYPES = [{ id: 'small', label: '작은 입' }, { id: 'open', label: '벌린 입' }, { id: 'cat', label: '고양이 입' }, { id: 'grin', label: '활짝' }];
export const BEARD_TYPES = [{ id: 'none', label: '없음' }, { id: 'whiskers', label: '고양이 수염' }, { id: 'mustache', label: '콧수염' }, { id: 'goatee', label: '염소수염' }, { id: 'full', label: '덥수룩' }];
export const HAIR_TYPES = [{ id: 'none', label: '없음' }, { id: 'tuft', label: '삐침 머리' }, { id: 'bangs', label: '앞머리' }, { id: 'bob', label: '단발' }, { id: 'bun', label: '똥머리' }, { id: 'twin', label: '양갈래' }, { id: 'curly', label: '곱슬' }];
export const HAIR_COLORS = ['#7a5236', '#3a3236', '#f3d27a', '#f6a9c4', '#9fd0f2', '#9fdcc0', '#c4b4e8', '#fbfaf5'];
export const ACCESSORIES = [{ id: 'none', label: '없음' }, { id: 'ribbon', label: '리본' }, { id: 'sprout', label: '새싹' }, { id: 'glasses', label: '안경' }, { id: 'flower', label: '꽃' }, { id: 'cap', label: '모자' }, { id: 'crown', label: '왕관' }];

/** 빠진 항목을 기본값으로 채운다(예전 저장 데이터 호환). */
export function normalizeLook(look = {}) {
  return {
    ears: look.ears || 'round', body: look.body || BODY_COLORS[0], pattern: look.pattern || 'none', cheek: look.cheek || CHEEK_COLORS[0],
    eyes: look.eyes || 'dot', brows: look.brows || 'none', mouth: look.mouth || 'small', beard: look.beard || 'none',
    hair: look.hair || 'none', hairColor: look.hairColor || HAIR_COLORS[0], accessory: look.accessory || 'none'
  };
}

// ---------- 무늬 있는 머리 도형 (정점색) ----------
const patternGeoCache = new Map();
function patternGeometry(key, fn) {
  if (patternGeoCache.has(key)) return patternGeoCache.get(key);
  const g = new THREE.SphereGeometry(1, 96, 64); // 촘촘해야 무늬 경계가 번지지 않고 또렷하다(단색 칠에서 잘 보인다)
  const p = g.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.set(fn(p.getX(i), p.getY(i), p.getZ(i)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  patternGeoCache.set(key, g);
  return g;
}
// 정수리를 모자처럼 덮는 무늬. 이마 가운데에 작은 홈이 파인다(하치와레).
function partPattern(dark, light) {
  return (x, y, z) => {
    const notch = z > 0 ? Math.max(0, 0.2 - Math.abs(x) * 0.9) : 0;
    return y > 0.3 + notch ? dark : light;
  };
}
// 앞(얼굴)이 트인 머리카락 껍질: theta 는 정수리에서 아래로 내려오는 정도
const CAP_OPEN = 1.9; // 앞쪽으로 트인 폭(라디안)
const hairCaps = {
  cap: new THREE.SphereGeometry(1, 36, 20, Math.PI / 2 + CAP_OPEN / 2, Math.PI * 2 - CAP_OPEN, 0, Math.PI * 0.62),
  top: new THREE.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI * 0.32),
  ring: new THREE.TorusGeometry(1, 0.14, 8, 28),
  // 사스마타 갈래: 반지름 1 의 둥근 U(반원보다 조금 더 감겨 끝이 안쪽으로 휜다). 꼭대기(자루와 붙는 곳)가 −z, 열린 쪽이 +z, 바닥에 눕힌 모양
  forkArc: new THREE.TorusGeometry(1, 0.13, 8, 30, Math.PI * 1.16).rotateZ(-Math.PI * 0.08).rotateX(-Math.PI / 2)
};

function geometryFor(m) {
  switch (m) {
    case 'sphere': return GEO.sphere;
    case 'dot': return GEO.dot;
    case 'cone': return GEO.cone;
    case 'box': return GEO.box;
    case 'cylinder': return GEO.cylinder;
    case 'hairCap': return hairCaps.cap;
    case 'hairTop': return hairCaps.top;
    case 'ring': return hairCaps.ring;
    case 'forkArc': return hairCaps.forkArc;
    case 'hachi': return patternGeometry('hachi', partPattern(NAVY, WHITE));
    case 'kuri': return patternGeometry('kuri', (x, y) => (y > 0.12 + Math.sin(x * 5) * 0.04 ? KURI_TOP : KURI_BOT));
    case 'rakko': return patternGeometry('rakko', (x, y, z) => (z > 0.5 && y < 0.3 ? RAKKO_FACE : RAKKO));
    case 'kani': return patternGeometry('kani', (x, y, z) => (y > 0.32 && z > 0.15 ? KANI_DARK : KANI));
    default:
      if (m.startsWith('part:')) { const [, dark, light] = m.split(':'); return patternGeometry(m, partPattern(dark, light)); }
      throw new Error('unknown part mesh ' + m);
  }
}

// ---------- 얼굴 ----------
function onHead(hc, hr, x, y, push = 0) {
  const t = 1 - (x * x) / (hr[0] * hr[0]) - (y * y) / (hr[1] * hr[1]);
  const z = hr[2] * Math.sqrt(Math.max(0.02, t));
  const n = new THREE.Vector3(x / (hr[0] * hr[0]), y / (hr[1] * hr[1]), z / (hr[2] * hr[2])).normalize();
  return { p: [hc[0] + x + n.x * push, hc[1] + y + n.y * push, hc[2] + z + n.z * push], r: [-Math.asin(n.y), Math.atan2(n.x, n.z), 0] };
}

function face(parts, hc, hr, o) {
  [-1, 1].forEach((sd) => {
    const e = onHead(hc, hr, sd * o.eyeX, o.eyeY);
    parts.push({ m: 'dot', c: EYE, p: e.p, r: e.r, s: o.eye, n: 'head', o: false });
    const sh = o.shine || 1;
    const h = onHead(hc, hr, sd * o.eyeX + 0.012, o.eyeY + o.eye[1] * 0.35, 0.012);
    parts.push({ m: 'dot', c: SHINE, p: h.p, r: h.r, s: [o.eye[0] * 0.36 * sh, o.eye[1] * 0.3 * sh, 0.008], n: 'head', o: false });
    const b = onHead(hc, hr, sd * o.cheekX, o.cheekY, -0.004);
    parts.push({ m: 'dot', c: o.cheek || CHEEK, p: b.p, r: b.r, s: [0.075, 0.034, 0.012], n: 'head', o: false });
    if (o.brows) [0.1, 0.125].forEach((dy) => {
      const bw = onHead(hc, hr, sd * o.eyeX, o.eyeY + dy, 0.002);
      parts.push({ m: 'dot', c: EYE, p: bw.p, r: bw.r, s: [0.035, 0.007, 0.006], n: 'head', o: false });
    });
  });
  const mo = onHead(hc, hr, 0, o.mouthY);
  parts.push({ m: 'dot', c: MOUTH, p: mo.p, r: mo.r, s: o.mouth, n: 'head', o: false });
  if (o.nose) {
    const no = onHead(hc, hr, 0, o.mouthY + 0.045, 0.004);
    parts.push({ m: 'dot', c: o.nose, p: no.p, r: no.r, s: [0.035, 0.022, 0.014], n: 'head', o: false });
  }
  if (o.teeth) [-1, 1].forEach((sd) => {
    const tt = onHead(hc, hr, sd * o.mouth[0] * 0.5, o.mouthY + o.mouth[1] * 0.6, 0.012);
    parts.push({ m: 'cone', c: SHINE, p: tt.p, r: [Math.PI + tt.r[0], tt.r[1], 0], s: [0.012, 0.026, 0.008], n: 'head', o: false });
  });
}

function limbs(parts, color, armY, armX) {
  [-1, 1].forEach((sd) => {
    const nm = sd < 0 ? 'L' : 'R';
    parts.push({ m: 'sphere', c: color, p: [sd * armX, armY, 0.04], r: [0, 0, sd * 0.55], s: [0.085, 0.13, 0.085], n: 'arm' + nm });
    parts.push({ m: 'sphere', c: color, p: [sd * 0.13, 0.065, 0.03], s: [0.1, 0.075, 0.12], n: 'leg' + nm });
  });
}

// ---------- 갑옷 씨 ----------
function knight(label, armor, trim, add) {
  const parts = [];
  [-1, 1].forEach((sd) => {
    const nm = sd < 0 ? 'L' : 'R';
    parts.push({ m: 'sphere', c: armor, p: [sd * 0.15, 0.3, 0], s: [0.13, 0.28, 0.14], n: 'leg' + nm });
    parts.push({ m: 'sphere', c: trim, p: [sd * 0.15, 0.07, 0.05], s: [0.14, 0.08, 0.19], n: 'leg' + nm });
    parts.push({ m: 'sphere', c: armor, p: [sd * 0.44, 0.92, 0.02], s: [0.11, 0.3, 0.11], n: 'arm' + nm });
    parts.push({ m: 'sphere', c: trim, p: [sd * 0.45, 0.62, 0.04], s: [0.1, 0.1, 0.1], n: 'arm' + nm });
    parts.push({ m: 'sphere', c: armor, p: [sd * 0.36, 1.22, 0], s: [0.17, 0.14, 0.17], n: 'body' });
  });
  parts.push({ m: 'sphere', c: armor, p: [0, 0.92, 0], s: [0.36, 0.42, 0.3], n: 'body' });
  parts.push({ m: 'sphere', c: trim, p: [0, 0.62, 0], s: [0.37, 0.07, 0.31], n: 'body' });
  parts.push({ m: 'sphere', c: armor, p: [0, 1.6, 0], s: [0.3, 0.34, 0.3], n: 'head' });
  parts.push({ m: 'box', c: '#2f2a2c', p: [0, 1.6, 0.27], s: [0.34, 0.055, 0.08], n: 'head', o: false });
  parts.push({ m: 'box', c: trim, p: [0, 1.9, -0.02], s: [0.05, 0.14, 0.4], n: 'head' });
  (add || []).forEach((p) => parts.push(p));
  return {
    label, parts, neck: [0, 1.3, 0], height: 2.05, radius: 0.55, knight: true,
    pivots: { armL: [-0.4, 1.18, 0], armR: [0.4, 1.18, 0], legL: [-0.15, 0.56, 0], legR: [0.15, 0.56, 0] }
  };
}

const DEFS = {
  chiikawa() {
    const parts = [], hc = [0, 0.74, 0], hr = [0.43, 0.37, 0.39];
    parts.push({ m: 'sphere', c: WHITE, p: [0, 0.34, 0], s: [0.34, 0.32, 0.31], n: 'body' });
    parts.push({ m: 'sphere', c: WHITE, p: [0, 0.22, -0.3], s: [0.06, 0.06, 0.06], n: 'body' });
    limbs(parts, WHITE, 0.36, 0.31);
    parts.push({ m: 'sphere', c: WHITE, p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: WHITE, p: [sd * 0.25, 1.07, -0.02], r: [0, 0, -sd * 0.3], s: [0.11, 0.1, 0.07], n: 'head' }));
    face(parts, hc, hr, { eyeX: 0.14, eyeY: 0.03, eye: [0.042, 0.058, 0.02], cheekX: 0.25, cheekY: -0.07, mouthY: -0.08, mouth: [0.026, 0.013, 0.01] });
    return { label: '치이카와', parts, neck: [0, 0.5, 0], height: 1.12, radius: 0.45 };
  },
  hachiware() {
    const parts = [], hc = [0, 0.74, 0], hr = [0.43, 0.37, 0.39];
    parts.push({ m: 'sphere', c: WHITE, p: [0, 0.34, 0], s: [0.34, 0.32, 0.31], n: 'body' });
    parts.push({ m: 'sphere', c: NAVY, p: [0, 0.24, -0.33], r: [0.6, 0, 0], s: [0.06, 0.06, 0.13], n: 'body' });
    limbs(parts, WHITE, 0.36, 0.31);
    parts.push({ m: 'hachi', c: '#ffffff', p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => parts.push({ m: 'cone', c: NAVY, p: [sd * 0.25, 0.97, -0.01], r: [0, 0, -sd * 0.38], s: [0.12, 0.21, 0.08], n: 'head' }));
    face(parts, hc, hr, { eyeX: 0.14, eyeY: 0.0, eye: [0.042, 0.058, 0.02], cheekX: 0.25, cheekY: -0.09, mouthY: -0.1, mouth: [0.055, 0.03, 0.012] });
    return { label: '하치와레', parts, neck: [0, 0.5, 0], height: 1.12, radius: 0.45 };
  },
  usagi() {
    const parts = [], hc = [0, 0.76, 0], hr = [0.39, 0.34, 0.36];
    parts.push({ m: 'sphere', c: USAGI, p: [0, 0.36, 0], s: [0.31, 0.34, 0.3], n: 'body' });
    parts.push({ m: 'sphere', c: '#fffaf0', p: [0, 0.2, -0.29], s: [0.075, 0.075, 0.075], n: 'body' });
    limbs(parts, USAGI, 0.38, 0.29);
    parts.push({ m: 'sphere', c: USAGI, p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => {
      const nm = sd < 0 ? 'earL' : 'earR';
      parts.push({ m: 'sphere', c: USAGI, p: [sd * 0.12, 1.32, -0.02], r: [0, 0, -sd * 0.12], s: [0.085, 0.3, 0.065], n: nm, par: 'head' });
      parts.push({ m: 'dot', c: EAR_PINK, p: [sd * 0.12, 1.32, 0.035], r: [0, 0, -sd * 0.12], s: [0.045, 0.22, 0.02], n: nm, par: 'head', o: false });
    });
    face(parts, hc, hr, { eyeX: 0.12, eyeY: 0.02, eye: [0.03, 0.04, 0.016], cheekX: 0.22, cheekY: -0.05, mouthY: -0.1, mouth: [0.06, 0.045, 0.014] });
    return { label: '우사기', parts, neck: [0, 0.52, 0], height: 1.6, radius: 0.42, pivots: { earL: [-0.12, 1.04, -0.02], earR: [0.12, 1.04, -0.02] } };
  },
  momonga() {
    const parts = [], hc = [0, 0.74, 0], hr = [0.42, 0.37, 0.38];
    parts.push({ m: 'sphere', c: WHITE, p: [0, 0.34, 0], s: [0.32, 0.31, 0.3], n: 'body' });
    parts.push({ m: 'sphere', c: MOMO_BLUE, p: [0, 0.58, -0.42], r: [-0.35, 0, 0], s: [0.21, 0.42, 0.16], n: 'body' });
    limbs(parts, WHITE, 0.36, 0.3);
    parts.push({ m: 'sphere', c: WHITE, p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => {
      parts.push({ m: 'sphere', c: WHITE, p: [sd * 0.25, 1.06, -0.02], r: [0, 0, -sd * 0.25], s: [0.1, 0.1, 0.07], n: 'head' });
      parts.push({ m: 'dot', c: MOMO_BLUE, p: [sd * 0.25, 1.06, 0.04], r: [0, 0, -sd * 0.25], s: [0.05, 0.055, 0.02], n: 'head', o: false });
      parts.push({ m: 'sphere', c: WHITE, p: [sd * 0.4, 0.64, 0.06], r: [0, 0, sd * 0.5], s: [0.1, 0.06, 0.08], n: 'head' });
    });
    face(parts, hc, hr, { eyeX: 0.15, eyeY: 0.02, eye: [0.052, 0.072, 0.022], shine: 1.35, cheekX: 0.26, cheekY: -0.08, mouthY: -0.1, mouth: [0.024, 0.012, 0.01], nose: MOMO_BLUE });
    return { label: '모몽가', parts, neck: [0, 0.5, 0], height: 1.12, radius: 0.47 };
  },
  kurimanju() {
    const parts = [], hc = [0, 0.72, 0], hr = [0.43, 0.36, 0.39];
    parts.push({ m: 'sphere', c: KURI_BOT, p: [0, 0.33, 0], s: [0.34, 0.31, 0.31], n: 'body' });
    limbs(parts, KURI_BOT, 0.35, 0.31);
    parts.push({ m: 'kuri', c: '#ffffff', p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: KURI_TOP, p: [sd * 0.27, 1.0, -0.03], r: [0, 0, -sd * 0.35], s: [0.09, 0.08, 0.06], n: 'head' }));
    face(parts, hc, hr, { eyeX: 0.13, eyeY: -0.04, eye: [0.034, 0.045, 0.016], cheekX: 0.24, cheekY: -0.12, mouthY: -0.14, mouth: [0.03, 0.013, 0.01] });
    return { label: '쿠리만쥬', parts, neck: [0, 0.5, 0], height: 1.1, radius: 0.46 };
  },
  rakko() {
    const parts = [], hc = [0, 0.74, 0], hr = [0.42, 0.36, 0.38];
    parts.push({ m: 'sphere', c: RAKKO, p: [0, 0.34, 0], s: [0.33, 0.32, 0.3], n: 'body' });
    parts.push({ m: 'dot', c: RAKKO_FACE, p: [0, 0.32, 0.25], s: [0.21, 0.21, 0.08], n: 'body', o: false });
    parts.push({ m: 'sphere', c: RAKKO, p: [0, 0.16, -0.3], r: [0.9, 0, 0], s: [0.08, 0.08, 0.18], n: 'body' });
    // 등에 멘 칼: 수련할 때 손에 뽑아 들면 숨는다(tag 'sheathed', buildNpc 에서 처음엔 보이게)
    parts.push({ m: 'box', c: '#dfe4ea', p: [0.1, 0.62, -0.34], r: [0, 0, 0.6], s: [0.05, 0.56, 0.02], n: 'body', tag: 'sheathed' });
    parts.push({ m: 'box', c: '#c9a24a', p: [-0.055, 0.847, -0.34], r: [0, 0, 0.6], s: [0.17, 0.035, 0.05], n: 'body', tag: 'sheathed' });
    parts.push({ m: 'box', c: '#7a5236', p: [-0.1, 0.91, -0.34], r: [0, 0, 0.6], s: [0.045, 0.15, 0.045], n: 'body', tag: 'sheathed' });
    limbs(parts, RAKKO, 0.36, 0.3);
    parts.push({ m: 'rakko', c: '#ffffff', p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: RAKKO, p: [sd * 0.31, 0.98, -0.02], s: [0.075, 0.065, 0.05], n: 'head' }));
    face(parts, hc, hr, { eyeX: 0.14, eyeY: 0.04, eye: [0.036, 0.05, 0.018], cheekX: 0.26, cheekY: -0.06, mouthY: -0.12, mouth: [0.03, 0.012, 0.01], nose: '#4a3434' });
    return { label: '랏코', parts, neck: [0, 0.5, 0], height: 1.1, radius: 0.45 };
  },
  shisa() {
    const parts = [], hc = [0, 0.74, 0], hr = [0.42, 0.37, 0.38];
    parts.push({ m: 'sphere', c: SHISA, p: [0, 0.34, 0], s: [0.33, 0.31, 0.3], n: 'body' });
    [[0, 0.3, -0.33, 0.11], [0.05, 0.42, -0.38, 0.08], [-0.04, 0.5, -0.36, 0.065]].forEach(([x, y, z, r]) => parts.push({ m: 'sphere', c: SHISA_MANE, p: [x, y, z], s: [r, r, r], n: 'body' }));
    limbs(parts, SHISA, 0.36, 0.31);
    for (let i = 0; i <= 10; i++) {
      const a = -2.3 + (i / 10) * 4.6;
      parts.push({ m: 'sphere', c: SHISA_MANE, p: [Math.sin(a) * 0.42, hc[1] + Math.cos(a) * 0.36, -0.1], s: [0.12, 0.12, 0.12], n: 'head' });
    }
    [-0.12, 0, 0.12].forEach((x) => parts.push({ m: 'sphere', c: SHISA_MANE, p: [x, 1.04, 0.16], s: [0.075, 0.07, 0.07], n: 'head' }));
    parts.push({ m: 'sphere', c: SHISA, p: hc, s: hr, n: 'head' });
    face(parts, hc, hr, { eyeX: 0.14, eyeY: 0.0, eye: [0.04, 0.055, 0.02], cheekX: 0.25, cheekY: -0.09, mouthY: -0.1, mouth: [0.055, 0.03, 0.012] });
    return { label: '시사', parts, neck: [0, 0.5, 0], height: 1.12, radius: 0.47 };
  },
  kani() {
    const parts = [], hc = [0, 0.74, 0], hr = [0.42, 0.37, 0.38];
    parts.push({ m: 'sphere', c: KANI, p: [0, 0.34, 0], s: [0.33, 0.31, 0.3], n: 'body' });
    limbs(parts, KANI, 0.36, 0.31);
    parts.push({ m: 'kani', c: '#ffffff', p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => {
      parts.push({ m: 'sphere', c: CLAW, p: [sd * 0.24, 1.08, 0], r: [0, 0, -sd * 0.25], s: [0.08, 0.12, 0.07], n: 'head' });
      parts.push({ m: 'sphere', c: CLAW, p: [sd * 0.24 - 0.04, 1.22, 0], r: [0, 0, 0.3], s: [0.035, 0.085, 0.035], n: 'head' });
      parts.push({ m: 'sphere', c: CLAW, p: [sd * 0.24 + 0.04, 1.22, 0], r: [0, 0, -0.3], s: [0.035, 0.085, 0.035], n: 'head' });
    });
    face(parts, hc, hr, { eyeX: 0.14, eyeY: 0.0, eye: [0.04, 0.055, 0.02], cheekX: 0.25, cheekY: -0.09, mouthY: -0.1, mouth: [0.06, 0.026, 0.012], brows: true, teeth: true });
    return { label: '카니', parts, neck: [0, 0.5, 0], height: 1.2, radius: 0.45 };
  },
  pochette: () => knight('포셰트 갑옷 씨', '#cdd2d8', '#9aa1aa', [
    { m: 'box', c: '#f7a8c4', p: [0.3, 0.7, 0.24], r: [0, -0.4, 0], s: [0.2, 0.16, 0.08], n: 'body' },
    { m: 'box', c: '#f7a8c4', p: [0.04, 0.98, 0.29], r: [0, 0, -0.62], s: [0.04, 0.75, 0.03], n: 'body', o: false }
  ]),
  labor: () => knight('노동 갑옷 씨', '#b3a797', '#857a6c', [{ m: 'cone', c: '#efc75e', p: [0.46, 0.4, 0.06], s: [0.09, 0.14, 0.09], n: 'armR' }]),
  ramen: () => knight('라멘 갑옷 씨', '#e3d08a', '#b49e55', [
    { m: 'sphere', c: '#ffffff', p: [0, 1.74, 0], s: [0.315, 0.06, 0.315], n: 'head' },
    { m: 'sphere', c: '#ffffff', p: [0, 1.74, -0.32], s: [0.07, 0.05, 0.05], n: 'head' }
  ]),
  captain: () => knight('대장 갑옷 씨', '#e9c24c', '#b8892b', [
    { m: 'sphere', c: '#e0524f', p: [0, 2.02, -0.05], s: [0.07, 0.2, 0.22], n: 'head' },
    { m: 'sphere', c: '#e0524f', p: [0, 0.95, -0.3], s: [0.34, 0.5, 0.04], n: 'body' }
  ])
};

/** 마을 친구 종류. */
export const NPC_KINDS = Object.keys(DEFS);

// ---------- 소품: 그 몸짓을 할 때만 보인다(맥주잔 · 책 · 빗자루 …) ----------
/**
 * 손에 쥔 소품을 적는 오른팔 자세. animateChibi 의 그 몸짓과 맞춘다.
 * 수련(train)만은 팔을 살짝 든 자세에서 칼끝이 앞을 보게 적어서, 팔을 내리면 칼끝이 조금 숙이고 내지르면 위로 선다.
 */
const HOLD = { drink: [-1.0, 0, -0.5], sweep: [-0.7, 0, 0.2], train: [-0.25, 0, -0.2], dance: [0, 0, 2.0] };

/**
 * 손에 쥔 소품 부품을 팔 마디에 단다. 부품은 pose 자세일 때 손끝에서 잰 위치 · 방향(p · r)으로 적고,
 * 여기서 팔을 내린 기본 자세 기준으로 되돌려 둔다. 그래서 팔을 움직이면 손에 쥔 채 따라 움직인다.
 */
function held(def, arm, pose, parts) {
  const a = def.parts.find((pt) => pt.n === arm && pt.m === 'sphere'); // 팔 타원체의 아래 끝이 손끝
  const az = a.r ? a.r[2] : 0;
  const tip = [a.p[0] + a.s[1] * Math.sin(az), a.p[1] - a.s[1] * Math.cos(az), a.p[2]];
  const back = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose[0], pose[1], pose[2], 'YXZ')).invert();
  return parts.map((pt) => {
    const v = new THREE.Vector3(pt.p[0], pt.p[1], pt.p[2]).applyQuaternion(back);
    const r = pt.r || [0, 0, 0];
    const q = back.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')));
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    return { ...pt, p: [tip[0] + v.x, tip[1] + v.y, tip[2] + v.z], r: [e.x, e.y, e.z], n: arm };
  });
}

/**
 * 소품 꼬리표 → 부품. 손에 드는 것은 HOLD 자세에서 손끝 기준으로 적는다(+z 앞, +x 오른쪽 바깥, +y 위).
 * 긴 막대는 원기둥 대신 상자로 만든다(원기둥 외곽선은 평균 크기로 밀어서 가늘고 길면 옆 선이 거의 안 보인다).
 */
const PROP_PARTS = {
  // 쿠리만쥬의 맥주잔: 거품이 넘칠 듯하고 손잡이는 바깥쪽
  beer: (def) => held(def, 'armR', HOLD.drink, [
    { m: 'cylinder', c: '#f2b632', p: [-0.02, -0.025, 0.075], s: [0.068, 0.15, 0.068] },
    { m: 'sphere', c: '#fffaf0', p: [-0.02, 0.125, 0.075], s: [0.078, 0.04, 0.078] },
    { m: 'box', c: '#f7dc8a', p: [0.07, 0.05, 0.075], s: [0.03, 0.09, 0.025] }
  ]),
  // 라멘 그릇(라멘 로우에서 먹을 때)
  bowl: (def) => held(def, 'armR', HOLD.drink, [
    { m: 'cylinder', c: '#e2574c', p: [-0.03, -0.01, 0.1], s: [0.085, 0.07, 0.085] },
    { m: 'sphere', c: '#f6d77a', p: [-0.03, 0.06, 0.1], s: [0.075, 0.022, 0.075] }
  ]),
  // 펼친 책: 두 손 사이 가슴 앞에서 책장이 고개 숙인 얼굴 쪽을 본다(몸 마디라 팔과 따로 논다)
  book: () => [
    { m: 'box', c: '#c0504d', p: [0, 0.36, 0.41], r: [-0.7, 0, 0], s: [0.52, 0.025, 0.26], n: 'body' },
    { m: 'box', c: '#fffaf0', p: [0, 0.375, 0.397], r: [-0.7, 0, 0], s: [0.46, 0.03, 0.22], n: 'body', o: false },
    { m: 'box', c: '#b9ab9a', p: [0, 0.388, 0.387], r: [-0.7, 0, 0], s: [0.01, 0.004, 0.2], n: 'body', o: false }
  ],
  // 빗자루: 손에서 앞아래로 비스듬히 내려 끝(짚)이 땅에 닿는다
  broom: (def) => {
    const k = 0.95, along = (d) => [0, -Math.sin(k) * d, Math.cos(k) * d];
    return held(def, 'armR', HOLD.sweep, [
      { m: 'box', c: '#9a6a3c', p: along(0.06), r: [k, 0, 0], s: [0.035, 0.035, 0.45] },
      { m: 'box', c: '#e8c36a', p: along(0.29), r: [k, 0, 0], s: [0.2, 0.06, 0.12] }
    ]);
  },
  // 랏코의 칼: 손잡이 · 코등이 · 칼날(등에 멘 칼과 같은 색). 팔을 내렸을 때 코등이가 배에 박히지 않게 살짝 바깥으로
  sword: (def) => held(def, 'armR', HOLD.train, [
    { m: 'box', c: '#7a5236', p: [0.02, 0, -0.005], s: [0.045, 0.045, 0.13] },
    { m: 'box', c: '#c9a24a', p: [0.02, 0, 0.07], s: [0.13, 0.035, 0.045] },
    { m: 'box', c: '#dfe4ea', p: [0.02, 0, 0.34], s: [0.05, 0.02, 0.5] }
  ]),
  // 우사기의 막대
  stick: (def) => held(def, 'armR', HOLD.train, [
    { m: 'box', c: '#b07a45', p: [0, 0, 0.255], s: [0.04, 0.04, 0.75] }
  ]),
  // 하치와레의 마이크: 번쩍 든 팔 끝에서 바깥 위로
  mic: (def) => held(def, 'armR', HOLD.dance, [
    { m: 'cylinder', c: '#3a3236', p: [-0.024, -0.032, 0.05], r: [0, 0, -0.64], s: [0.022, 0.15, 0.022] },
    { m: 'sphere', c: '#b9bec6', p: [0.1, 0.136, 0.05], s: [0.05, 0.05, 0.05] }
  ])
};

/** 사스마타 부품: 자루 · 마개 · 둥근 U 갈래(forkArc) · 가시(안쪽 셋 · 바깥쪽 둘씩). */
function forkParts() {
  const PINK = '#f3a6b8', SPIKE = '#fffaf6', R = 0.3, tip = 1.0, zc = tip + R;
  const parts = [
    { m: 'cylinder', c: '#ffffff', p: [0, 0, -0.25], r: [Math.PI / 2, 0, 0], s: [0.04, 0.07, 0.04] },
    { m: 'box', c: PINK, p: [0, 0, 0.4], s: [0.042, 0.042, 1.24] },
    { m: 'dot', c: PINK, p: [0, 0, tip], s: [0.045, 0.045, 0.045] },
    { m: 'forkArc', c: PINK, p: [0, 0, zc], s: [R, R * 1.2, R] }
  ];
  // 고리 위의 점(각도 a: 0 이면 오른쪽 옆, π/2 면 자루 쪽 꼭대기)과 그 자리에서 고리 안쪽 · 바깥쪽을 향한 가시
  const spike = (a, out, len) => {
    const x = R * Math.cos(a), z = zc - R * Math.sin(a), d = out ? 1 : -1;
    const dx = d * Math.cos(a), dz = -d * Math.sin(a);
    parts.push({ m: 'cone', c: SPIKE, p: [x + dx * 0.025, 0, z + dz * 0.025], r: [Math.PI / 2, Math.atan2(dx, dz), 0], s: [0.034, len, 0.034] });
  };
  for (const a of [-0.04, 0.1, 0.24, 0.37]) { spike(a * Math.PI, false, 0.1); spike(Math.PI - a * Math.PI, false, 0.1); }
  for (const a of [0.02, 0.18]) { spike(a * Math.PI, true, 0.085); spike(Math.PI - a * Math.PI, true, 0.085); }
  return parts;
}

/** 내 무기(4단계): 꼬리표 'w-무기id'. HOLD.train 자세에서 손끝 기준(+z 앞)으로 적는다. */
const WEAPON_PARTS = {
  'w-stick': [
    { m: 'box', c: '#b07a45', p: [0, 0, 0.22], s: [0.045, 0.045, 0.62] },
    { m: 'dot', c: '#8a5a30', p: [0.022, 0, 0.3], s: [0.028, 0.028, 0.028], o: false },
    { m: 'dot', c: '#7cc25e', p: [0.045, 0.025, 0.44], r: [0, 0.4, 0.3], s: [0.06, 0.016, 0.035], o: false }
  ],
  'w-sword': [
    { m: 'box', c: '#5a3b28', p: [0, 0, -0.01], s: [0.05, 0.05, 0.15] },
    { m: 'box', c: '#3e2a1d', p: [0, 0, 0.075], s: [0.15, 0.045, 0.045] },
    { m: 'box', c: '#e3c08d', p: [0, 0, 0.37], s: [0.065, 0.026, 0.54] }
  ],
  'w-hammer': [
    { m: 'box', c: '#9a6a3c', p: [0, 0, 0.18], s: [0.045, 0.045, 0.52] },
    { m: 'box', c: '#9a948c', p: [0, 0, 0.47], s: [0.28, 0.17, 0.17] },
    { m: 'box', c: '#6f6a63', p: [0, 0, 0.47], s: [0.07, 0.185, 0.185] }
  ],
  // 사스마타: 긴 분홍 자루(끝에 하얀 마개) 끝에 둥근 U자 갈래, 갈래 안쪽 · 바깥쪽에 하얀 가시
  'w-fork': forkParts(),
  'w-star': [
    { m: 'box', c: '#3a4a7a', p: [0, 0, -0.01], s: [0.05, 0.05, 0.15] },
    { m: 'box', c: '#f2c94c', p: [0, 0, 0.075], s: [0.19, 0.045, 0.05] },
    { m: 'dot', c: '#ff7a9a', p: [0, 0.03, 0.075], s: [0.032, 0.032, 0.032], o: false },
    { m: 'box', c: '#cdeeff', p: [0, 0, 0.39], s: [0.065, 0.024, 0.58] },
    { m: 'dot', c: '#fff6c9', p: [0, 0.02, 0.7], s: [0.05, 0.05, 0.05], o: false }
  ]
};

/**
 * 친구별로 그 몸짓(animateChibi 모드)을 할 때 드는 소품 꼬리표.
 * 'drink' 는 라멘 로우에서 라멘을 먹을 때도 쓰니 그릇을 들고, 쿠리만쥬만 맥주잔을 든다.
 */
export const PROP_FOR = {
  kurimanju: { drink: 'beer' }, kani: { read: 'book' }, shisa: { sweep: 'broom' },
  rakko: { train: 'sword', drink: 'bowl' }, usagi: { train: 'stick', drink: 'bowl' },
  hachiware: { dance: 'mic', drink: 'bowl' }, chiikawa: { drink: 'bowl' }, momonga: { drink: 'bowl' }
};

/** 그 친구가 쓰는 소품 부품에 꼬리표(tag)를 달아 덧붙인다(buildFromDef 가 숨겨 둔다). */
function withProps(kind, def) {
  new Set(Object.values(PROP_FOR[kind] || {})).forEach((tag) => {
    PROP_PARTS[tag](def).forEach((pt) => def.parts.push({ ...pt, tag }));
  });
  return def;
}

const darken = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color('#2b2224'), k).getStyle();

/** 내 캐릭터 얼굴: 눈, 눈썹, 볼, 입, 수염. */
function playerFace(parts, hc, hr, look) {
  const eyeX = 0.14, eyeY = 0.02, mY = -0.09;
  const hairInk = darken(look.hairColor, 0.35);
  [-1, 1].forEach((sd) => {
    const e = onHead(hc, hr, sd * eyeX, eyeY);
    if (look.eyes === 'sleepy') {
      parts.push({ m: 'dot', c: EYE, p: e.p, r: e.r, s: [0.05, 0.012, 0.012], n: 'head', o: false });
    } else if (look.eyes === 'smile') {
      [-1, 1].forEach((k) => {
        const q = onHead(hc, hr, sd * eyeX + k * 0.017, eyeY + 0.004, 0.002);
        parts.push({ m: 'dot', c: EYE, p: q.p, r: [q.r[0], q.r[1], -k * 0.7], s: [0.026, 0.008, 0.008], n: 'head', o: false });
      });
    } else {
      const big = look.eyes === 'sparkle';
      const es = big ? [0.054, 0.072, 0.022] : [0.042, 0.058, 0.02];
      parts.push({ m: 'dot', c: EYE, p: e.p, r: e.r, s: es, n: 'head', o: false });
      const h = onHead(hc, hr, sd * eyeX + 0.012, eyeY + es[1] * 0.35, 0.012);
      parts.push({ m: 'dot', c: SHINE, p: h.p, r: h.r, s: [es[0] * 0.38, es[1] * 0.32, 0.008], n: 'head', o: false });
      if (big) {
        const h2 = onHead(hc, hr, sd * eyeX - 0.015, eyeY - es[1] * 0.3, 0.012);
        parts.push({ m: 'dot', c: SHINE, p: h2.p, r: h2.r, s: [es[0] * 0.2, es[1] * 0.18, 0.008], n: 'head', o: false });
      }
    }
    if (look.brows !== 'none') {
      const b = onHead(hc, hr, sd * eyeX, eyeY + 0.1, 0.003);
      const thick = look.brows === 'thick';
      const tilt = look.brows === 'worried' ? -sd * 0.38 : 0;
      parts.push({ m: 'dot', c: look.hair === 'none' ? EYE : hairInk, p: b.p, r: [b.r[0], b.r[1], tilt], s: thick ? [0.05, 0.017, 0.01] : [0.042, 0.008, 0.008], n: 'head', o: false });
    }
    const ck = onHead(hc, hr, sd * 0.25, -0.08, -0.004);
    parts.push({ m: 'dot', c: look.cheek, p: ck.p, r: ck.r, s: [0.075, 0.034, 0.012], n: 'head', o: false });
    if (look.beard === 'whiskers') {
      [-1, 0, 1].forEach((k) => {
        const w = onHead(hc, hr, sd * 0.33, -0.05 + k * 0.028, 0.004);
        parts.push({ m: 'dot', c: EYE, p: w.p, r: [w.r[0], w.r[1], sd * k * 0.22], s: [0.065, 0.005, 0.005], n: 'head', o: false });
      });
    } else if (look.beard === 'mustache') {
      const ms = onHead(hc, hr, sd * 0.042, mY + 0.032, 0.008);
      parts.push({ m: 'dot', c: hairInk, p: ms.p, r: [ms.r[0], ms.r[1], -sd * 0.35], s: [0.05, 0.02, 0.016], n: 'head', o: false });
    }
  });
  const mo = onHead(hc, hr, 0, mY);
  if (look.mouth === 'open') {
    parts.push({ m: 'dot', c: MOUTH, p: mo.p, r: mo.r, s: [0.045, 0.035, 0.014], n: 'head', o: false });
    const tg = onHead(hc, hr, 0, mY - 0.016, 0.004);
    parts.push({ m: 'dot', c: '#f28a9b', p: tg.p, r: tg.r, s: [0.025, 0.012, 0.01], n: 'head', o: false });
  } else if (look.mouth === 'cat') {
    [-0.027, -0.009, 0.009, 0.027].forEach((x, i) => {
      const q = onHead(hc, hr, x, mY + 0.004, 0.002);
      parts.push({ m: 'dot', c: MOUTH, p: q.p, r: [q.r[0], q.r[1], i % 2 ? 0.6 : -0.6], s: [0.012, 0.006, 0.006], n: 'head', o: false });
    });
  } else if (look.mouth === 'grin') {
    parts.push({ m: 'dot', c: MOUTH, p: mo.p, r: mo.r, s: [0.07, 0.024, 0.012], n: 'head', o: false });
  } else {
    parts.push({ m: 'dot', c: MOUTH, p: mo.p, r: mo.r, s: [0.028, 0.014, 0.01], n: 'head', o: false });
  }
  if (look.beard === 'goatee') {
    const g = onHead(hc, hr, 0, mY - 0.075, 0.008);
    parts.push({ m: 'dot', c: hairInk, p: g.p, r: g.r, s: [0.036, 0.05, 0.026], n: 'head', o: false });
  } else if (look.beard === 'full') {
    parts.push({ m: 'sphere', c: look.hairColor, p: [0, 0.6, 0.2], s: [0.3, 0.15, 0.2], n: 'head' });
  }
}

/** 이마를 덮는 앞머리 다섯 가닥. */
function fringe(parts, hc, C) {
  [-0.24, -0.12, 0, 0.12, 0.24].forEach((x) => {
    const f = onHead(hc, [0.43, 0.37, 0.39], x, 0.17 + Math.abs(x) * 0.12, 0.014);
    parts.push({ m: 'sphere', c: C, p: f.p, r: f.r, s: [0.085, 0.075, 0.05], n: 'head' });
  });
}

/** 머리카락. */
function hairParts(parts, hc, look) {
  const C = look.hairColor, top = { m: 'hairTop', c: C, p: hc, s: [0.445, 0.385, 0.405], n: 'head', ds: true };
  switch (look.hair) {
    case 'tuft':
      parts.push({ m: 'cone', c: C, p: [0.02, 1.06, 0.06], r: [0.3, 0, -0.5], s: [0.045, 0.17, 0.045], n: 'head' });
      parts.push({ m: 'cone', c: C, p: [-0.04, 1.07, 0.03], r: [0.2, 0, 0.45], s: [0.035, 0.12, 0.035], n: 'head' });
      break;
    case 'bangs':
      parts.push(top);
      fringe(parts, hc, C);
      break;
    case 'bob':
      parts.push(top);
      parts.push({ m: 'hairCap', c: C, p: hc, s: [0.465, 0.41, 0.425], n: 'head', ds: true });
      fringe(parts, hc, C);
      break;
    case 'bun':
      parts.push(top);
      parts.push({ m: 'sphere', c: C, p: [0, 1.17, -0.06], s: [0.13, 0.12, 0.13], n: 'head' });
      parts.push({ m: 'sphere', c: '#f48fb1', p: [0, 1.07, -0.05], s: [0.07, 0.03, 0.07], n: 'head' });
      break;
    case 'twin':
      parts.push(top);
      [-1, 1].forEach((sd) => {
        parts.push({ m: 'sphere', c: C, p: [sd * 0.46, 0.76, -0.08], r: [0, 0, sd * 0.3], s: [0.1, 0.18, 0.1], n: 'head' });
        parts.push({ m: 'sphere', c: '#f48fb1', p: [sd * 0.41, 0.92, -0.06], s: [0.045, 0.045, 0.045], n: 'head' });
      });
      break;
    case 'curly':
      parts.push(top);
      for (let i = 0; i < 11; i++) {
        const a = 0.95 + (i / 10) * (Math.PI * 2 - 1.9);
        parts.push({ m: 'sphere', c: C, p: [Math.sin(a) * 0.38, 0.93, Math.cos(a) * 0.34], s: [0.09, 0.09, 0.09], n: 'head' });
      }
      [[-0.12, 1.1, 0.05], [0.12, 1.1, 0.05], [0, 1.13, -0.08]].forEach((p) => parts.push({ m: 'sphere', c: C, p, s: [0.085, 0.085, 0.085], n: 'head' }));
      break;
    default:
      break;
  }
}

/** 머리 장식. */
function accessoryParts(parts, hc, hr, look) {
  switch (look.accessory) {
    case 'ribbon':
      [-1, 1].forEach((k) => parts.push({ m: 'sphere', c: '#f48fb1', p: [0.28 + k * 0.07, 1.08, 0.12], r: [0, 0, k * 0.45], s: [0.08, 0.05, 0.03], n: 'head' }));
      parts.push({ m: 'sphere', c: '#e5788f', p: [0.28, 1.08, 0.14], s: [0.03, 0.03, 0.03], n: 'head' });
      break;
    case 'sprout':
      parts.push({ m: 'cylinder', c: '#6fae5f', p: [0, 1.08, 0], s: [0.012, 0.12, 0.012], n: 'head' });
      [-1, 1].forEach((k) => parts.push({ m: 'sphere', c: '#8fd16a', p: [k * 0.05, 1.21, 0], r: [0, 0, -k * 0.5], s: [0.06, 0.025, 0.035], n: 'head' }));
      break;
    case 'glasses':
      [-1, 1].forEach((sd) => {
        const g = onHead(hc, hr, sd * 0.14, 0.02, 0.03);
        parts.push({ m: 'ring', c: '#3a3236', p: g.p, r: g.r, s: [0.075, 0.075, 0.075], n: 'head', o: false });
      });
      {
        const b = onHead(hc, hr, 0, 0.03, 0.03);
        parts.push({ m: 'dot', c: '#3a3236', p: b.p, r: b.r, s: [0.04, 0.008, 0.008], n: 'head', o: false });
      }
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        parts.push({ m: 'sphere', c: '#ffffff', p: [-0.3 + Math.cos(a) * 0.05, 1.06 + Math.sin(a) * 0.05, 0.14], s: [0.035, 0.035, 0.02], n: 'head' });
      }
      parts.push({ m: 'sphere', c: '#ffd66b', p: [-0.3, 1.06, 0.16], s: [0.028, 0.028, 0.02], n: 'head' });
      break;
    case 'cap':
      parts.push({ m: 'sphere', c: '#e8706a', p: [0, 1.0, 0], s: [0.33, 0.2, 0.32], n: 'head' });
      parts.push({ m: 'cylinder', c: '#e8706a', p: [0, 0.98, 0.26], s: [0.22, 0.02, 0.16], n: 'head' });
      parts.push({ m: 'sphere', c: '#ffffff', p: [0, 1.2, 0], s: [0.035, 0.035, 0.035], n: 'head' });
      break;
    case 'crown':
      parts.push({ m: 'cylinder', c: '#f3c84b', p: [0, 1.06, 0], s: [0.17, 0.07, 0.17], n: 'head' });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        parts.push({ m: 'cone', c: '#f3c84b', p: [Math.sin(a) * 0.15, 1.13, Math.cos(a) * 0.15], s: [0.035, 0.08, 0.035], n: 'head' });
      }
      parts.push({ m: 'sphere', c: '#e0524f', p: [0, 1.1, 0.17], s: [0.03, 0.03, 0.02], n: 'head' });
      break;
    default:
      break;
  }
}

/** 멘 포셰트(pochette.js 의 id): 왼쪽 어깨에서 오른쪽 옆구리로 내려오는 끈과 가방. 없으면 아무것도 붙이지 않는다. */
function pochetteParts(parts, id) {
  const P = id ? POCHETTES[id] : null;
  if (!P) return;
  const bc = [0, 0.34, 0], br = [0.34, 0.32, 0.31]; // 몸통 타원체
  for (let i = 0; i <= 14; i++) {
    const k = i / 14, q = onHead(bc, br, -0.2 + k * 0.4, 0.2 - k * 0.33, 0.004);
    parts.push({ m: 'dot', c: P.accent, p: q.p, r: q.r, s: [0.026, 0.026, 0.012], n: 'body', o: false });
  }
  parts.push({ m: 'box', c: P.color, p: [0.2, 0.2, 0.245], r: [0, 0.55, 0], s: [0.17, 0.13, 0.07], n: 'body' });
  parts.push({ m: 'box', c: P.accent, p: [0.205, 0.235, 0.254], r: [0, 0.55, 0], s: [0.18, 0.065, 0.075], n: 'body' }); // 덮개
  parts.push({ m: 'dot', c: '#fff6dc', p: [0.224, 0.21, 0.284], r: [0, 0.55, 0], s: [0.022, 0.022, 0.01], n: 'body', o: false }); // 단추
}

/** 내 캐릭터 정의. look 은 normalizeLook 의 모든 항목을 쓴다(멘 포셰트 pochette 는 normalizeLook 이 버리니 따로 읽는다). */
function playerDef(rawLook) {
  const pochette = rawLook && rawLook.pochette;
  const look = normalizeLook(rawLook);
  const body = look.body;
  const dark = new THREE.Color(body).lerp(new THREE.Color('#3a3550'), 0.62).getStyle();
  const parts = [], hc = [0, 0.74, 0], hr = [0.43, 0.37, 0.39], pivots = {};
  parts.push({ m: 'sphere', c: body, p: [0, 0.34, 0], s: [0.34, 0.32, 0.31], n: 'body' });
  parts.push({ m: 'sphere', c: body, p: [0, 0.22, -0.3], s: [0.06, 0.06, 0.06], n: 'body' });
  limbs(parts, body, 0.36, 0.31);
  const darkHex = '#' + new THREE.Color(dark).getHexString();
  const lightHex = '#' + new THREE.Color(body).getHexString();
  parts.push(look.pattern === 'part'
    ? { m: `part:${darkHex}:${lightHex}`, c: '#ffffff', p: hc, s: hr, n: 'head' }
    : { m: 'sphere', c: body, p: hc, s: hr, n: 'head' });
  if (look.pattern === 'spots') {
    [[-0.22, 0.2, 0.09], [0.12, 0.28, 0.07], [0.3, 0.05, 0.06]].forEach(([x, y, r]) => {
      const sp = onHead(hc, hr, x, y, -0.006);
      parts.push({ m: 'dot', c: dark, p: sp.p, r: sp.r, s: [r, r * 0.8, 0.02], n: 'head', o: false });
    });
  }
  const earColor = look.pattern === 'none' ? body : dark;
  if (look.ears === 'pointy') {
    [-1, 1].forEach((sd) => parts.push({ m: 'cone', c: earColor, p: [sd * 0.25, 0.97, -0.01], r: [0, 0, -sd * 0.38], s: [0.12, 0.21, 0.08], n: 'head' }));
  } else if (look.ears === 'bunny') {
    [-1, 1].forEach((sd) => {
      const nm = sd < 0 ? 'earL' : 'earR';
      parts.push({ m: 'sphere', c: body, p: [sd * 0.13, 1.3, -0.02], r: [0, 0, -sd * 0.14], s: [0.085, 0.28, 0.065], n: nm, par: 'head' });
      parts.push({ m: 'dot', c: EAR_PINK, p: [sd * 0.13, 1.3, 0.035], r: [0, 0, -sd * 0.14], s: [0.045, 0.2, 0.02], n: nm, par: 'head', o: false });
    });
    pivots.earL = [-0.13, 1.04, -0.02];
    pivots.earR = [0.13, 1.04, -0.02];
  } else if (look.ears === 'small') {
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: earColor, p: [sd * 0.22, 1.08, -0.02], s: [0.07, 0.065, 0.05], n: 'head' }));
  } else {
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: earColor, p: [sd * 0.25, 1.07, -0.02], r: [0, 0, -sd * 0.3], s: [0.11, 0.1, 0.07], n: 'head' }));
  }
  playerFace(parts, hc, hr, look);
  hairParts(parts, hc, look);
  accessoryParts(parts, hc, hr, look);
  pochetteParts(parts, pochette);
  // 손에 드는 불(평소엔 숨김, player.setHeld 로 켠다): 왼손에. 랜턴은 손잡이에 매단 등, 손전등은 앞을 향한 원통
  parts.push({ m: 'box', c: '#4a3f48', p: [-0.4, 0.22, 0.12], s: [0.03, 0.12, 0.03], n: 'armL', tag: 'lantern' });
  parts.push({ m: 'sphere', c: '#ffe7a3', p: [-0.4, 0.08, 0.12], s: [0.09, 0.11, 0.09], n: 'armL', tag: 'lantern', o: false });
  parts.push({ m: 'cone', c: '#4a3f48', p: [-0.4, 0.17, 0.12], s: [0.1, 0.06, 0.1], n: 'armL', tag: 'lantern' });
  parts.push({ m: 'cylinder', c: '#6f94bb', p: [-0.4, 0.2, 0.06], r: [Math.PI / 2, 0, 0], s: [0.045, 0.24, 0.045], n: 'armL', tag: 'flashlight' });
  parts.push({ m: 'sphere', c: '#fff7d6', p: [-0.4, 0.2, 0.31], s: [0.05, 0.05, 0.02], n: 'armL', tag: 'flashlight', o: false });
  // 무기(4단계, 오른손): player.setWeapon 으로 보인다. 휘두르기(swing) 자세에 맞춰 손끝에서 앞으로 뻗게 적는다
  // 무기는 손끝에 따로 마디('weapon', 팔 마디의 자식)를 두고 단다: 평소에는 비스듬히 들어 올려(뒤에서도 보이게),
  // 휘두르기 · 찌르기 때는 팔과 한 줄로(animateChibi 의 a.weapon)
  const arm = parts.find((pt) => pt.n === 'armR' && pt.m === 'sphere'), az = arm.r ? arm.r[2] : 0;
  pivots.weapon = [arm.p[0] + arm.s[1] * Math.sin(az), arm.p[1] - arm.s[1] * Math.cos(az), arm.p[2]];
  for (const [tag, list] of Object.entries(WEAPON_PARTS)) held({ parts }, 'armR', HOLD.train, list).forEach((pt) => parts.push({ ...pt, n: 'weapon', par: 'armR', tag }));
  const tall = look.ears === 'bunny' ? 0.45 : ['bun', 'curly'].includes(look.hair) || ['cap', 'crown', 'sprout'].includes(look.accessory) ? 0.15 : 0;
  return { label: '나', parts, neck: [0, 0.5, 0], height: 1.12 + tall, radius: 0.45, pivots };
}

function pivotOf(def, name, p) {
  if (def.pivots && def.pivots[name]) return def.pivots[name];
  if (name === 'head') return def.neck;
  if (name === 'body') return [0, 0, 0];
  if (name === 'armL') return [-0.26, 0.47, 0.02];
  if (name === 'armR') return [0.26, 0.47, 0.02];
  if (name === 'legL') return [-0.13, 0.14, 0];
  if (name === 'legR') return [0.13, 0.14, 0];
  return p || [0, 0, 0];
}

/** 부품 정의로 Three.js 모델을 만든다. */
function buildFromDef(def) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const pivots = {}, props = {}; // props: 꼬리표(tag)를 단 소품(맥주잔 · 책처럼 그 몸짓을 할 때만 보이는 것)
  const getPivot = (name, parName) => {
    if (pivots[name]) return pivots[name];
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const pv = pivotOf(def, name);
    if (parName) {
      const parent = getPivot(parName), ppv = pivotOf(def, parName);
      g.position.set(pv[0] - ppv[0], pv[1] - ppv[1], pv[2] - ppv[2]);
      parent.add(g);
    } else {
      g.position.set(pv[0], pv[1], pv[2]);
      inner.add(g);
    }
    pivots[name] = g;
    return g;
  };
  def.parts.forEach((pt) => {
    const holder = getPivot(pt.n, pt.par);
    const pv = pivotOf(def, pt.n, pt.p);
    const patterned = pt.m === 'hachi' || pt.m === 'kuri' || pt.m === 'rakko' || pt.m === 'kani' || pt.m.startsWith('part:');
    // 2D 손그림처럼: 단색 칠(얼굴 부품은 그늘도 없이) + 붓펜 같은 외곽선
    const material = celMaterial(patterned ? '#ffffff' : pt.c, { vertexColors: patterned, doubleSide: !!pt.ds, flat: pt.o === false });
    const mesh = new THREE.Mesh(geometryFor(pt.m), material);
    mesh.position.set(pt.p[0] - pv[0], pt.p[1] - pv[1], pt.p[2] - pv[2]);
    const r = pt.r || [0, 0, 0];
    mesh.rotation.set(r[0], r[1], r[2], 'YXZ');
    mesh.scale.set(pt.s[0], pt.s[1], pt.s[2]);
    if (pt.o !== false) {
      mesh.castShadow = true;
      if (pt.m === 'box') addShellOutline(mesh, 0.02); else addOutline(mesh, 0.022, true);
    }
    holder.add(mesh);
    if (pt.tag) { mesh.visible = false; (props[pt.tag] = props[pt.tag] || []).push(mesh); }
  });
  return { root, inner, pivots, props, height: def.height, radius: def.radius, label: def.label };
}

/** 내 캐릭터 모델. 빠진 항목은 기본값을 쓴다. */
export function buildChibi(look) {
  return buildFromDef(playerDef(look));
}

/** 마을 친구 모델. 몸짓 소품(PROP_FOR)은 숨겨 두고, 등에 멘 칼('sheathed')만 처음부터 보인다. */
export function buildNpc(kind) {
  const chibi = buildFromDef(withProps(kind, DEFS[kind]()));
  (chibi.props.sheathed || []).forEach((m) => { m.visible = true; });
  chibi.kind = kind;
  return chibi;
}

const ZERO = [0, 0, 0];
/**
 * 자세를 잡는다. mode: 'idle' | 'walk' | 'pull' | 'cheer' | 'talk' | 'sweep' | 'train' | 'read' | 'drink' | 'dance'
 * opts: { phase (걷기 위상), power (뽑기 힘 0..1), look (고개 돌림), hop (걷기 통통 높이) }
 */
export function animateChibi(chibi, mode, t, opts = {}) {
  const a = {};
  const phase = opts.phase || 0, s = Math.sin(phase);
  let bob = 0, lean = 0, waddle = 0;
  if (mode === 'walk') {
    a.armL = [s * 0.7, 0, 0]; a.armR = [-s * 0.7, 0, 0];
    a.legL = [-s * 0.65, 0, 0]; a.legR = [s * 0.65, 0, 0];
    a.head = [0, 0, Math.sin(phase * 0.5) * 0.06];
    bob = Math.abs(s) * (opts.hop ?? 0.06);
    waddle = s * 0.07;
  } else if (mode === 'pull') {
    const power = opts.power || 0, strain = Math.sin(t * 34) * 0.04 * power;
    a.armL = [-1.25 - power * 0.3, 0, 0.35]; a.armR = [-1.25 - power * 0.3, 0, -0.35];
    a.head = [0.28 + strain, 0, strain];
    a.legL = [0.25, 0, 0]; a.legR = [0.25, 0, 0];
    lean = 0.32 - power * 0.38;
  } else if (mode === 'cheer') {
    const w = Math.sin(t * 12);
    a.armL = [0, 0, -2.3 - w * 0.2]; a.armR = [0, 0, 2.3 + w * 0.2];
    a.head = [-0.15, 0, 0];
    bob = Math.abs(Math.sin(t * 8)) * 0.12;
  } else if (mode === 'talk') {
    a.head = [Math.sin(t * 9) * 0.08, opts.look || 0, 0];
    a.armR = [0, 0, 0.5 + Math.sin(t * 7) * 0.15];
    a.armL = [0, 0, -0.15];
  } else if (mode === 'sweep') {
    // 빗자루질: 두 팔을 앞으로 모아 좌우로 쓱싹
    const sw = Math.sin(t * 6);
    a.armL = [-0.7, 0, -0.2 + sw * 0.45]; a.armR = [-0.7, 0, 0.2 + sw * 0.45];
    a.head = [0.15, sw * 0.12, 0];
    waddle = sw * 0.05;
  } else if (mode === 'train') {
    // 수련: 두 팔로 번갈아 힘차게 내지르기
    const p = Math.sin(t * 9);
    a.armR = [-1.5 * Math.max(0, p), 0, -0.2]; a.armL = [-1.5 * Math.max(0, -p), 0, 0.2];
    a.head = [-0.05, 0, 0];
    bob = Math.abs(p) * 0.04;
  } else if (mode === 'read') {
    // 책 읽기: 두 팔을 앞으로 모으고 고개를 숙인다
    a.armL = [-1.0, 0, 0.35]; a.armR = [-1.0, 0, -0.35];
    a.head = [0.32 + Math.sin(t * 0.8) * 0.03, 0, 0];
  } else if (mode === 'drink') {
    // 한 잔: 잔(그릇)을 든 오른팔을 가슴 앞에서 입가로 당겨 기울이며 고개를 젖힌다.
    // 손에 든 소품이 얼굴에 묻히지 않게 팔은 어깨높이까지만 올리고 안쪽으로 모은다(HOLD.drink 가 up=0 자세)
    const up = (Math.sin(t * 1.4) + 1) / 2;
    a.armR = [-1.0 - up * 0.5, -0.35 * up, -0.5]; a.armL = [0, 0, -0.12];
    a.head = [-0.3 * up, 0, 0];
  } else if (mode === 'swing') {
    // 무기 휘두르기(opts.swing 0 → 1): 번쩍 들었다가(0~0.3) 앞으로 내리치고(~0.55) 제자리로
    // 무기는 팔을 내렸을 때 칼끝이 앞을 보게 쥐고 있어서, 팔을 끝까지 내리쳐야(+) 칼끝이 앞아래를 친다
    const k = opts.swing || 0;
    const ease = (x) => 1 - (1 - x) * (1 - x);
    const ax = k < 0.3 ? -2.9 * ease(k / 0.3) : k < 0.5 ? -2.9 + 3.15 * ease((k - 0.3) / 0.2) : 0.25 * (1 - ease((k - 0.5) / 0.5));
    a.armR = [ax, 0, -0.25]; a.armL = [k < 0.5 ? -0.5 * Math.min(1, k / 0.3) : -0.5 * (1 - (k - 0.5) / 0.5), 0, 0.2];
    const slam = k > 0.3 && k < 0.75;
    a.head = [slam ? 0.18 : -0.08, 0, 0];
    lean = slam ? 0.18 : -0.06 * Math.min(1, k / 0.3);
    bob = k < 0.3 ? 0.05 * (k / 0.3) : 0;
  } else if (mode === 'thrust') {
    // 찌르기(사스마타, opts.swing 0 → 1): 뒤로 당겼다가(~0.3) 앞으로 쭉 내찌르고(~0.5) 제자리로. 몸도 앞으로 쏠린다
    const k = opts.swing || 0;
    const ease = (x) => 1 - (1 - x) * (1 - x);
    // 창끝이 수평을 유지하도록 팔은 조금만 들고, 몸 전체가 뒤로 빠졌다가 앞으로 쑥 나간다
    let ax, push;
    if (k < 0.3) { const e = ease(k / 0.3); ax = -0.25 * e; push = -0.14 * e; lean = -0.08 * e; }
    else if (k < 0.5) { const e = ease((k - 0.3) / 0.2); ax = -0.25 - 0.12 * e; push = -0.14 + 0.46 * e; lean = -0.08 + 0.28 * e; }
    else { const e = ease((k - 0.5) / 0.5); ax = -0.37 * (1 - e); push = 0.32 * (1 - e); lean = 0.2 * (1 - e); }
    a.armR = [ax, 0, -0.12]; a.armL = [-0.6 - ax, 0, 0.3];
    a.head = [k > 0.3 && k < 0.7 ? 0.1 : -0.04, 0, 0];
    chibi.inner.position.z = push;
  } else if (mode === 'hurt') {
    // 맞았을 때: 뒤로 휘청
    a.armL = [0, 0, -0.9]; a.armR = [0, 0, 0.9];
    a.head = [-0.25, 0, 0];
    lean = -0.25;
  } else if (mode === 'dance') {
    // 포즈: 두 팔을 번쩍, 통통 뛰며 몸을 흔든다
    const w = Math.sin(t * 7);
    a.armL = [0, 0, -2.0 - w * 0.3]; a.armR = [0, 0, 2.0 - w * 0.3];
    a.head = [-0.1, 0, w * 0.15];
    bob = Math.abs(Math.sin(t * 7)) * 0.1;
    waddle = w * 0.12;
  } else {
    const br = Math.sin(t * 2 + phase) * 0.08;
    a.head = [Math.sin(t * 1.7 + phase) * 0.04, opts.look || 0, 0];
    a.armL = [0, 0, -0.1 - br]; a.armR = [0, 0, 0.1 + br];
  }
  // 손에 든 무기(내 캐릭터만): 공격할 때만 팔과 한 줄, 평소에는 바깥 위로 비스듬히 든다
  if (mode !== 'swing' && mode !== 'thrust') a.weapon = mode === 'walk' ? [-0.75 + s * 0.12, 0.6, 0] : [-0.8, 0.6, 0];
  const ear = mode === 'walk' ? -0.25 - Math.abs(s) * 0.25 : mode === 'pull' ? -0.4 : -0.1;
  a.earL = [ear, 0, -0.08]; a.earR = [ear, 0, 0.08];
  for (const name in chibi.pivots) {
    const r = a[name] || ZERO;
    chibi.pivots[name].rotation.set(r[0], r[1], r[2], 'YXZ');
  }
  chibi.inner.position.y = bob;
  if (mode !== 'thrust') chibi.inner.position.z = 0;
  chibi.inner.rotation.set(lean, 0, waddle, 'YXZ');
}
