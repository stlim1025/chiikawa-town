import * as THREE from 'three';
import { celMaterial, addOutline, addShellOutline, GEO } from '../render/toon.js';
import { EAT_ANIMS, FOOD_SHAPES, eatPose, eatWeight } from './eatmotion.js';
import { POCHETTES } from '../core/pochette.js';
import { mergeUnit } from '../render/batch.js';

const WHITE = '#fbfaf5', CHEEK = '#f5a3b5', EYE = '#2b2224', SHINE = '#ffffff', MOUTH = '#5a2b33', TEAR = '#8fd3ff';
const NAVY = '#6f94bb', USAGI = '#f6e8b6', EAR_PINK = '#f4b6c2'; // 하치와레 무늬는 원작처럼 연한 파랑
const MOMO_BLUE = '#bfe0f5', KURI_TOP = '#b8743d', KURI_BOT = '#f4dcab', RAKKO = '#fbe7c2', RAKKO_PAW = '#4a3a34', STAR_SCAR = '#bfae8c', INK = '#3a2a28';
const SHISA = '#f7cf5e', SHISA_MANE = '#e8833a', KANI = '#fbd1d8', KANI_DARK = '#f297a6', CLAW = '#ef6f7f';

/** 내 캐릭터 선택지. */
export const EAR_TYPES = [
  { id: 'round', label: '둥근 귀' }, { id: 'pointy', label: '뾰족한 귀' }, { id: 'bunny', label: '토끼 귀' }, { id: 'small', label: '작은 귀' },
  { id: 'floppy', label: '강아지 귀' }, { id: 'lop', label: '늘어진 토끼 귀' }, { id: 'mouse', label: '큰 동글 귀' }, { id: 'fox', label: '여우 귀' }
];
export const BODY_COLORS = ['#ffffff', '#f8e9b0', '#ffd6e0', '#cfe7ff', '#d8f0c8', '#e6dcff', '#f6d2b0', '#d9cfc4'];
export const PATTERNS = [{ id: 'none', label: '없음' }, { id: 'part', label: '가르마' }, { id: 'spots', label: '얼룩' }, { id: 'stripes', label: '줄무늬' }, { id: 'heart', label: '하트' }];
export const CHEEK_COLORS = ['#f5a3b5', '#f7b98c', '#d7b3f0', '#ff9b9b'];
export const EYE_TYPES = [{ id: 'dot', label: '동글' }, { id: 'sparkle', label: '반짝' }, { id: 'teary', label: '울먹' }, { id: 'smile', label: '웃는' }, { id: 'wink', label: '윙크' }, { id: 'sleepy', label: '쿨쿨' }];
export const BROW_TYPES = [{ id: 'none', label: '없음' }, { id: 'thin', label: '가는' }, { id: 'thick', label: '콩' }, { id: 'worried', label: '시무룩' }];
export const MOUTH_TYPES = [{ id: 'small', label: '방긋' }, { id: 'open', label: '벌린 입' }, { id: 'cat', label: '고양이 입' }, { id: 'grin', label: '활짝' }, { id: 'blep', label: '메롱' }];
export const BEARD_TYPES = [{ id: 'none', label: '없음' }, { id: 'whiskers', label: '고양이 수염' }, { id: 'mustache', label: '돌돌 콧수염' }, { id: 'goatee', label: '염소수염' }, { id: 'full', label: '복슬 수염' }];
export const HAIR_TYPES = [{ id: 'none', label: '없음' }, { id: 'tuft', label: '더듬이' }, { id: 'bangs', label: '앞머리' }, { id: 'bob', label: '단발' }, { id: 'bun', label: '똥머리' }, { id: 'twin', label: '양갈래' }, { id: 'curly', label: '뽀글' }];
export const HAIR_COLORS = ['#7a5236', '#3a3236', '#f3d27a', '#f6a9c4', '#9fd0f2', '#9fdcc0', '#c4b4e8', '#fbfaf5'];
export const ACCESSORIES = [{ id: 'none', label: '없음' }, { id: 'ribbon', label: '리본' }, { id: 'sprout', label: '새싹' }, { id: 'glasses', label: '안경' }, { id: 'flower', label: '꽃' }, { id: 'cap', label: '모자' }, { id: 'crown', label: '왕관' },
  { id: 'bandage', label: '반창고' }, { id: 'berrypin', label: '딸기 핀' }, { id: 'beret', label: '베레모' }, { id: 'strawhat', label: '밀짚모자' }, { id: 'sunglasses', label: '선글라스' },
  { id: 'headphones', label: '헤드폰' }, { id: 'flowercrown', label: '화관' }, { id: 'halo', label: '천사 고리' }];
/** 캐릭터 만들기에서 고를 수 있는 장식: 싼 기본 장식만(왕관 같은 비싼 것은 포셰트 가게에서 사야 한다). */
export const STARTER_ACCESSORIES = ACCESSORIES.filter((o) => ['none', 'ribbon', 'sprout', 'glasses', 'flower', 'cap'].includes(o.id));

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
/**
 * 무늬 경계가 또렷한 구(내 캐릭터 무늬): field(x, y, z) > 0 인 곳은 paint, 나머지는 base.
 * 꼭짓점마다 색을 칠하면 경계가 삼각형 모양대로 계단지니, 경계를 지나는 삼각형은 field = 0 인 자리에서 잘라 두 색 조각으로 나눈다.
 */
function paintedSphere(key, field, paint, base) {
  if (patternGeoCache.has(key)) return patternGeoCache.get(key);
  const src = new THREE.SphereGeometry(1, 96, 64), P = src.attributes.position, I = src.index;
  const pos = [], col = [], cIn = new THREE.Color(paint), cOut = new THREE.Color(base);
  const tri = (a, b, c, color) => { for (const v of [a, b, c]) { pos.push(v.x, v.y, v.z); col.push(color.r, color.g, color.b); } };
  const cut = (a, b, fa, fb) => a.clone().lerp(b, fa / (fa - fb)).normalize();
  for (let t = 0; t < I.count; t += 3) {
    const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(P, I.getX(t + k)));
    const f = v.map((p) => field(p.x, p.y, p.z)), s = f.map((x) => x > 0);
    if (s[0] === s[1] && s[1] === s[2]) { tri(v[0], v[1], v[2], s[0] ? cIn : cOut); continue; }
    // 혼자 다른 쪽에 있는 꼭짓점 쪽 작은 삼각형 하나 + 나머지 사각형(삼각형 둘), 감는 방향은 그대로
    const k = s[0] !== s[1] && s[0] !== s[2] ? 0 : s[1] !== s[0] && s[1] !== s[2] ? 1 : 2, k1 = (k + 1) % 3, k2 = (k + 2) % 3;
    const ab = cut(v[k], v[k1], f[k], f[k1]), ac = cut(v[k], v[k2], f[k], f[k2]), lone = s[k] ? cIn : cOut, rest = s[k] ? cOut : cIn;
    tri(v[k], ab, ac, lone);
    tri(ab, v[k1], v[k2], rest);
    tri(ab, v[k2], ac, rest);
  }
  src.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos, 3)); // 반지름 1 인 구라 법선 = 위치
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
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
// ---------- 내 캐릭터 무늬 ----------
/** 무늬 색: 몸 색마다 어울리는 한 톤 진한 색(하양은 하치와레 같은 연파랑). 목록에 없는 색은 같은 빛깔로 진하게. */
const PATTERN_TONES = { ffffff: '#8db3dd', f8e9b0: '#e5b35f', ffd6e0: '#f29db5', cfe7ff: '#84b2e5', d8f0c8: '#94c77f', e6dcff: '#ab96e0', f6d2b0: '#d0946a', d9cfc4: '#9c8a7c' };
function patternTone(body) {
  const c = new THREE.Color(body), hex = c.getHexString();
  if (PATTERN_TONES[hex]) return PATTERN_TONES[hex];
  const hsl = c.getHSL({}, THREE.SRGBColorSpace);
  return '#' + c.setHSL(hsl.h, Math.min(1, hsl.s * 0.6 + 0.35), Math.max(0.3, hsl.l - 0.22), THREE.SRGBColorSpace).getHexString();
}
// 얼룩: 오른쪽 이마에서 귀까지 큰 얼룩, 왼쪽 뒤통수에 큰 얼룩, 이마 왼쪽과 뒤통수 아래에 작은 얼룩. [방향 x, y, z, 크기(각)]
const SPOTS = [[0.62, 0.5, 0.6, 0.46], [-0.55, 0.15, -0.82, 0.5], [-0.42, 0.62, 0.66, 0.17], [0.38, -0.15, -0.91, 0.2]]
  .map(([x, y, z, r]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l, r]; });
const wavy = (x, y, z) => 0.05 * Math.sin(x * 9 + y * 7) + 0.035 * Math.sin(z * 11 - x * 6); // 얼룩 가장자리를 살짝 물결지게
// 줄무늬: 이마에서 정수리 너머 뒤통수까지 세 줄(가운데가 가장 길다). [x, 시작 각, 끝 각]: 각은 앞(0) → 정수리(π/2) → 뒤(π)
const STRIPES = [[0, 0.5, 2.75], [-0.25, 0.78, 2.55], [0.25, 0.78, 2.55]];
const taper = (t, a, b, k) => Math.sqrt(Math.max(0, Math.min(1, (t - a) / k, (b - t) / k))); // 끝으로 갈수록 가늘게(끝은 동글게)
const heartField = (u, v) => { const q = u * u + v * v - 1; return u * u * v * v * v - q * q * q; }; // 하트 안이면 > 0
/** 내 캐릭터 머리 무늬: [field(x, y, z) — 무늬 안이면 > 0, 무늬 색]. tone: 무늬 색, accent: 하트 색(볼 색). */
function lookPattern(kind, tone, accent) {
  switch (kind) {
    case 'part': return [(x, y, z) => y - 0.3 - (z > 0 ? Math.max(0, 0.2 - Math.abs(x) * 0.9) : 0), tone]; // 하치와레처럼 이마 가운데가 파인 모자
    case 'spots': return [(x, y, z) => Math.max(...SPOTS.map(([a, b, c, r]) => r + wavy(x, y, z) - Math.acos(Math.min(1, x * a + y * b + z * c)))), tone];
    case 'stripes': return [(x, y, z) => {
      const t = Math.atan2(y, z), side = Math.atan2(Math.abs(x), z); // side: 앞(0) → 옆(π/2)
      return Math.max(...STRIPES.map(([cx, a, b]) => 0.075 * taper(t, a, b, 0.45) - Math.abs(x - cx)),
        ...[0.14, -0.06].map((cy) => 0.045 * taper(side, 1.05, 2.0, 0.3) - Math.abs(y - cy))); // 양 볼 옆에 짧은 두 줄
    }, tone];
    case 'heart': return [(x, y, z) => (z < 0 ? heartField(x / 0.2, (2.62 - Math.atan2(y, z)) / 0.2) : -1), accent]; // 뒤통수에 큰 하트(게임에서는 뒷모습이 많이 보인다)
    default: return [() => -1, tone];
  }
}
const LOOK_PATTERNS = new Set(['part', 'spots', 'stripes', 'heart']);
// 앞(얼굴)이 트인 머리카락 껍질: theta 는 정수리에서 아래로 내려오는 정도
const CAP_OPEN = 1.9; // 앞쪽으로 트인 폭(라디안)
const CAPE_OPEN = 2.9; // 망토 앞이 트인 폭(팔은 망토 밖으로 나온다)
// 잠옷 후드: 얼굴 쪽이 동그랗게 트인 머리 껍질(뒤 · 옆 · 아래) + 이마를 덮는 앞머리 조각
const HOOD_OPEN = 1.55;
const hoodGeo = {
  back: new THREE.SphereGeometry(1, 32, 18, Math.PI / 2 + HOOD_OPEN / 2, Math.PI * 2 - HOOD_OPEN, 0, Math.PI * 0.9),
  brow: new THREE.SphereGeometry(1, 16, 8, Math.PI / 2 - HOOD_OPEN / 2, HOOD_OPEN, 0, Math.PI * 0.36)
};
/** 잠옷 색: 내 캐릭터 · 친구마다(원작 파자마 파티처럼 파스텔). */
export const PAJAMA_COLORS = { me: '#c9b3ef', chiikawa: '#f6a6bd', hachiware: '#a7d78f', usagi: '#fbfaf5' };
const hairCaps = {
  cap: new THREE.SphereGeometry(1, 36, 20, Math.PI / 2 + CAP_OPEN / 2, Math.PI * 2 - CAP_OPEN, 0, Math.PI * 0.62),
  top: new THREE.SphereGeometry(1, 36, 14, 0, Math.PI * 2, 0, Math.PI * 0.32),
  ring: new THREE.TorusGeometry(1, 0.14, 8, 28),
  // 사스마타 갈래: 반지름 1 의 둥근 U(반원보다 조금 더 감겨 끝이 안쪽으로 휜다). 꼭대기(자루와 붙는 곳)가 −z, 열린 쪽이 +z, 바닥에 눕힌 모양
  forkArc: new THREE.TorusGeometry(1, 0.13, 8, 30, Math.PI * 1.16).rotateZ(-Math.PI * 0.08).rotateX(-Math.PI / 2),
  // 랏코의 흰 망토: 머리 밑(어깨)에서 발치까지 아래로 퍼지며 늘어진 원뿔대, 앞(배 · 팔)은 트여 있다
  cape: new THREE.CylinderGeometry(0.68, 1, 1, 32, 1, true, CAPE_OPEN / 2, Math.PI * 2 - CAPE_OPEN),
  // 망토 아랫단의 선(트인 껍질은 바깥선이 아랫단에 안 생겨서 따로 긋는다). 앞은 망토처럼 트여 있다
  capeHem: new THREE.TorusGeometry(1, 0.026, 6, 48, Math.PI * 2 - CAPE_OPEN).rotateZ(Math.PI / 2 + CAPE_OPEN / 2),
  // 랏코의 두툼한 목도리
  scarf: new THREE.TorusGeometry(1, 0.25, 12, 36),
  // 네 갈래 별(랏코 이마의 흉터): 앞뒤 두께 1, 가운데가 원점
  star4: (() => {
    const s = new THREE.Shape(), tips = [[1, 0], [0, -1], [-1, 0], [0, 1]], bend = [[0.14, 0.14], [0.14, -0.14], [-0.14, -0.14], [-0.14, 0.14]];
    s.moveTo(0, 1);
    tips.forEach(([x, y], i) => s.quadraticCurveTo(bend[i][0], bend[i][1], x, y));
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.5);
  })(),
  // 하트(이마 하트 무늬): 앞뒤 두께 1, 폭 2 · 높이 2, 가운데가 원점
  heart: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, -1);
    s.bezierCurveTo(-0.35, -0.62, -1.1, -0.2, -1, 0.35);
    s.bezierCurveTo(-0.92, 0.88, -0.25, 1.02, 0, 0.55);
    s.bezierCurveTo(0.25, 1.02, 0.92, 0.88, 1, 0.35);
    s.bezierCurveTo(1.1, -0.2, 0.35, -0.62, 0, -1);
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.5);
  })()
};

const SMALL_PART = 0.09, SPECK_PART = 0.03, SHADOW_MIN = 0.06;
/** 부품 도형: 작은 구 · 점은 성긴 것으로(화면에서 몇 픽셀이라 차이가 안 보인다). size 는 가장 긴 축의 크기. */
function partGeometry(m, size) {
  if (m === 'sphere' && size < SMALL_PART) return GEO.sphereLow;
  if (m === 'dot' && size < SPECK_PART) return GEO.speck;
  return geometryFor(m);
}

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
    case 'cape': return hairCaps.cape;
    case 'capeHem': return hairCaps.capeHem;
    case 'scarf': return hairCaps.scarf;
    case 'star4': return hairCaps.star4;
    case 'heart': return hairCaps.heart;
    case 'hachi': return patternGeometry('hachi', partPattern(NAVY, WHITE));
    case 'kuri': return patternGeometry('kuri', (x, y) => (y > 0.12 + Math.sin(x * 5) * 0.04 ? KURI_TOP : KURI_BOT));
    case 'kani': return patternGeometry('kani', (x, y, z) => (y > 0.32 && z > 0.15 ? KANI_DARK : KANI));
    default:
      if (m.startsWith('pat:')) { const [, kind, tone, base, accent] = m.split(':'), [field, paint] = lookPattern(kind, tone, accent); return paintedSphere(m, field, paint, base); }
      return lookGeometry(m); // 내 캐릭터 꾸미기 도형(호 · 반달 · 머리카락 · 수염 껍질), 모르면 오류
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
    parts.push({ m: 'dot', c: EYE, p: e.p, r: e.r, s: o.eye, n: 'head', o: false, role: 'eye' });
    const sh = o.shine || 1;
    const h = onHead(hc, hr, sd * o.eyeX + 0.012, o.eyeY + o.eye[1] * 0.35, 0.012);
    parts.push({ m: 'dot', c: SHINE, p: h.p, r: h.r, s: [o.eye[0] * 0.36 * sh, o.eye[1] * 0.3 * sh, 0.008], n: 'head', o: false, role: 'shine' });
    // 우는 얼굴(setCrying)일 때만: 감은 눈 밑에 고인 눈물, 볼을 타고 흐르는 줄기, 턱 밑으로 떨어지는 방울
    const pool = onHead(hc, hr, sd * o.eyeX, o.eyeY - o.eye[1] * 0.75, 0.012);
    parts.push({ m: 'dot', c: TEAR, p: pool.p, r: pool.r, s: [o.eye[0] * 1.5, 0.018, 0.012], n: 'head', o: false, role: 'tear' });
    const flow = onHead(hc, hr, sd * (o.eyeX + 0.008), o.eyeY - o.eye[1] - 0.06, 0.01);
    parts.push({ m: 'dot', c: TEAR, p: flow.p, r: flow.r, s: [0.022, 0.075, 0.012], n: 'head', o: false, role: 'tear' });
    const drop = onHead(hc, hr, sd * (o.eyeX + 0.014), o.eyeY - o.eye[1] - 0.15, 0.03);
    parts.push({ m: 'sphere', c: TEAR, p: drop.p, s: [0.024, 0.032, 0.024], n: 'head', o: false, role: 'drop' });
    const b = onHead(hc, hr, sd * o.cheekX, o.cheekY, -0.004);
    parts.push({ m: 'dot', c: o.cheek || CHEEK, p: b.p, r: b.r, s: [0.075, 0.034, 0.012], n: 'head', o: false });
    if (o.brows) [0.1, 0.125].forEach((dy) => {
      const bw = onHead(hc, hr, sd * o.eyeX, o.eyeY + dy, 0.002);
      parts.push({ m: 'dot', c: EYE, p: bw.p, r: bw.r, s: [0.035, 0.007, 0.006], n: 'head', o: false });
    });
  });
  const mo = onHead(hc, hr, 0, o.mouthY);
  if (o.cat) [-0.027, -0.009, 0.009, 0.027].forEach((x, i) => { // ω 입
    const q = onHead(hc, hr, x, o.mouthY + 0.004, 0.002);
    parts.push({ m: 'dot', c: MOUTH, p: q.p, r: [q.r[0], q.r[1], i % 2 ? 0.6 : -0.6], s: [0.012, 0.006, 0.006], n: 'head', o: false });
  });
  else parts.push({ m: 'dot', c: MOUTH, p: mo.p, r: mo.r, s: o.mouth, n: 'head', o: false });
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
    // 원작처럼: 북슬북슬한 크림색 털 공에 작은 까만 귀 · 손발, 이마에 별 모양 흉터, ω 입.
    // 목에는 두툼한 흰 목도리, 그 아래로 등 뒤에 흰 망토가 발치까지 늘어지고, 등에 멘 갈색 칼집의 흰 손잡이가 어깨 옆으로 비죽
    const parts = [], hc = [0, 0.76, 0], hr = [0.44, 0.39, 0.4];
    parts.push({ m: 'sphere', c: RAKKO, p: [0, 0.34, 0], s: [0.34, 0.33, 0.31], n: 'body' });
    limbs(parts, RAKKO_PAW, 0.36, 0.31);
    parts.push({ m: 'cape', c: WHITE, p: [0, 0.275, -0.02], s: [0.47, 0.41, 0.44], n: 'body', ds: true });
    parts.push({ m: 'capeHem', c: INK, p: [0, 0.07, -0.02], r: [Math.PI / 2, 0, 0], s: [0.47, 0.44, 0.47], n: 'body', o: false });
    parts.push({ m: 'scarf', c: WHITE, p: [0, 0.44, 0], r: [Math.PI / 2, 0, 0], s: [0.325, 0.31, 0.32], n: 'body' });
    // 등에 멘 칼: 수련할 때 손에 뽑아 들면 숨는다(tag 'sheathed', buildNpc 에서 처음엔 보이게)
    const SW = 1.05, dir = [-Math.sin(SW), Math.cos(SW)], at = (d) => [-0.42 + dir[0] * d, 0.62 + dir[1] * d, -0.43];
    parts.push({ m: 'box', c: '#9a7552', p: [-0.056, 0.411, -0.43], r: [0, 0, SW], s: [0.1, 0.84, 0.035], n: 'body', tag: 'sheathed' });
    parts.push({ m: 'box', c: '#e9e4d8', p: at(0), r: [0, 0, SW], s: [0.2, 0.045, 0.07], n: 'body', tag: 'sheathed' });
    parts.push({ m: 'box', c: '#f4f0e8', p: at(0.12), r: [0, 0, SW], s: [0.055, 0.2, 0.055], n: 'body', tag: 'sheathed' });
    [0.07, 0.12, 0.17].forEach((d) => parts.push({ m: 'box', c: INK, p: at(d), r: [0, 0, SW], s: [0.062, 0.012, 0.062], n: 'body', tag: 'sheathed', o: false }));
    parts.push({ m: 'sphere', c: RAKKO, p: hc, s: hr, n: 'head' });
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: RAKKO_PAW, p: [sd * 0.41, 0.9, -0.03], s: [0.065, 0.075, 0.055], n: 'head' }));
    face(parts, hc, hr, { eyeX: 0.14, eyeY: 0.03, eye: [0.05, 0.042, 0.02], shine: 1.5, cheekX: 0.27, cheekY: -0.06, mouthY: -0.115, cat: true, nose: INK });
    // 코 옆 수염 점
    [-1, 1].forEach((sd) => [[0.055, -0.088], [0.072, -0.108]].forEach(([x, y]) => {
      const w = onHead(hc, hr, sd * x, y, 0.002);
      parts.push({ m: 'dot', c: INK, p: w.p, r: w.r, s: [0.006, 0.006, 0.004], n: 'head', o: false });
    }));
    // 이마(보는 쪽 왼쪽)의 별 모양 흉터: 진한 테두리 별 위에 카키색 별
    const st = onHead(hc, hr, -0.17, 0.16, 0.002), sf = onHead(hc, hr, -0.17, 0.16, 0.006);
    parts.push({ m: 'star4', c: INK, p: st.p, r: [st.r[0], st.r[1], 0.25], s: [0.088, 0.088, 0.012], n: 'head', o: false });
    parts.push({ m: 'star4', c: STAR_SCAR, p: sf.p, r: [sf.r[0], sf.r[1], 0.25], s: [0.066, 0.066, 0.012], n: 'head', o: false });
    return { label: '랏코', parts, neck: [0, 0.5, 0], height: 1.15, radius: 0.47 };
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
const HOLD = { drink: [-1.0, 0, -0.5], sweep: [-0.7, 0, 0.2], train: [-0.25, 0, -0.2], dance: [0, 0, 2.0], read: [-1.0, 0, -0.35], snap: [-1.35, 0, -0.5] };

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

/** 음식(eatmotion.js 의 FOOD_SHAPES 꼬리표 'f-…')을 그 팔들에 단다. */
function foodParts(def, tag) {
  return FOOD_SHAPES[tag].flatMap(({ arm, pose, parts }) => held(def, arm, pose, parts));
}

/**
 * 소품 꼬리표 → 부품. 손에 드는 것은 HOLD 자세에서 손끝 기준으로 적는다(+z 앞, +x 오른쪽 바깥, +y 위).
 * 긴 막대는 원기둥 대신 상자로 만든다(원기둥 외곽선은 평균 크기로 밀어서 가늘고 길면 옆 선이 거의 안 보인다).
 */
/**
 * 무기에 새긴 얼굴(토벌 랭커): 날 · 자루 위(+y 면)에 몸 색 동그라미 + 두 눈 + 볼. 얼굴 위쪽이 무기 끝(+z)을 본다.
 * body: 몸 색, z: 손끝에서 앞으로 잰 자리, y: 위로 띄울 높이, w: 반지름.
 */
function faceParts(body, z, y, w = 0.045) {
  return [
    { m: 'sphere', c: body, p: [0, y, z], s: [w, 0.016, w * 1.05] },
    { m: 'dot', c: '#2b2224', p: [-w * 0.36, y + 0.014, z + w * 0.12], s: [w * 0.22, 0.008, w * 0.26], o: false },
    { m: 'dot', c: '#2b2224', p: [w * 0.36, y + 0.014, z + w * 0.12], s: [w * 0.22, 0.008, w * 0.26], o: false },
    { m: 'dot', c: '#ff8fa6', p: [-w * 0.6, y + 0.012, z - w * 0.25], s: [w * 0.22, 0.005, w * 0.16], o: false },
    { m: 'dot', c: '#ff8fa6', p: [w * 0.6, y + 0.012, z - w * 0.25], s: [w * 0.22, 0.005, w * 0.16], o: false }
  ];
}
/** 내 무기마다 얼굴을 새길 자리 [z, y, 반지름]. */
const FACE_AT = { stick: [0.32, 0.03, 0.055], sword: [0.36, 0.02, 0.058], hammer: [0.47, 0.095, 0.075], fork: [0.5, 0.03, 0.055], star: [0.38, 0.02, 0.058] };

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
  // 바느질(포셰트 갑옷 씨): 두 손을 모은 사이에 분홍 천 조각 · 반짝이는 바늘(판매대 위로 손을 내밀고 꿰맨다)
  sewing: (def) => held(def, 'armR', HOLD.read, [
    { m: 'box', c: '#f7b6cc', p: [-0.11, 0.02, 0.06], r: [0.5, 0, 0.15], s: [0.2, 0.015, 0.15] },
    { m: 'box', c: '#dfe4ea', p: [-0.06, 0.06, 0.08], r: [0.9, 0.3, 0], s: [0.008, 0.008, 0.12] }
  ]),
  // 빗자루: 손에서 앞아래로 비스듬히 내려 끝(짚)이 땅에 닿는다
  broom: (def) => {
    const k = 0.95, along = (d) => [0, -Math.sin(k) * d, Math.cos(k) * d];
    return held(def, 'armR', HOLD.sweep, [
      { m: 'box', c: '#9a6a3c', p: along(0.06), r: [k, 0, 0], s: [0.035, 0.035, 0.45] },
      { m: 'box', c: '#e8c36a', p: along(0.29), r: [k, 0, 0], s: [0.2, 0.06, 0.12] }
    ]);
  },
  // 랏코의 칼: 손잡이 · 코등이 · 칼날(등에 멘 칼과 같은 색). 팔을 내렸을 때 코등이가 배에 박히지 않게 살짝 바깥으로
  // 랏코의 칼: 이름난 토벌 랭커라 칼날에 제 얼굴을 새겼다
  sword: (def) => held(def, 'armR', HOLD.train, [
    { m: 'box', c: '#7a5236', p: [0.02, 0, -0.005], s: [0.045, 0.045, 0.13] },
    { m: 'box', c: '#c9a24a', p: [0.02, 0, 0.07], s: [0.13, 0.035, 0.045] },
    { m: 'box', c: '#dfe4ea', p: [0.02, 0, 0.34], s: [0.05, 0.02, 0.5] },
    ...faceParts(RAKKO, 0.36, 0.016, 0.034).map((pt) => ({ ...pt, p: [pt.p[0] + 0.02, pt.p[1], pt.p[2]] }))
  ]),
  // 치이카와 · 하치와레의 사스마타(토벌 나갈 때)
  fork: (def) => held(def, 'armR', HOLD.train, forkParts()),
  // 우사기의 봉: 키만 한 주황 봉, 양 끝에 하얀 마개
  stick: (def) => held(def, 'armR', HOLD.train, [
    { m: 'box', c: '#f2a65a', p: [0, 0, 0.28], s: [0.055, 0.055, 1.16] },
    { m: 'box', c: '#fffaf0', p: [0, 0, 0.88], s: [0.064, 0.064, 0.12] },
    { m: 'box', c: '#fffaf0', p: [0, 0, -0.32], s: [0.064, 0.064, 0.12] }
  ]),
  // 하치와레의 마이크: 번쩍 든 팔 끝에서 바깥 위로
  mic: (def) => held(def, 'armR', HOLD.dance, [
    { m: 'cylinder', c: '#3a3236', p: [-0.024, -0.032, 0.05], r: [0, 0, -0.64], s: [0.022, 0.15, 0.022] },
    { m: 'sphere', c: '#b9bec6', p: [0.1, 0.136, 0.05], s: [0.05, 0.05, 0.05] }
  ]),
  // 하치와레의 카메라(사이드스토리 '하치와레의 카메라'): 두 손 사이 눈앞에 든 검은 몸통 · 은색 윗판 · 앞으로 나온 렌즈 · 분홍 셔터 단추
  camera: (def) => held(def, 'armR', HOLD.snap, [
    { m: 'box', c: '#3a3a40', p: [-0.12, 0, 0.07], s: [0.27, 0.16, 0.1] },
    { m: 'box', c: '#d9d4c8', p: [-0.12, 0.06, 0.07], s: [0.272, 0.045, 0.102], o: false },
    { m: 'cylinder', c: '#2a2a30', p: [-0.12, -0.005, 0.11], r: [Math.PI / 2, 0, 0], s: [0.055, 0.07, 0.055] },
    { m: 'dot', c: '#8fc0ec', p: [-0.12, -0.005, 0.185], s: [0.036, 0.036, 0.012], o: false },
    { m: 'box', c: '#e85d75', p: [-0.215, 0.095, 0.07], s: [0.045, 0.025, 0.045], o: false }
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
  kurimanju: { drink: 'beer' }, kani: { read: 'book' }, shisa: { sweep: 'broom' }, labor: { sweep: 'broom' }, pochette: { read: 'sewing' }, // 노동 갑옷 씨: 게시판 앞 정리 · 포셰트 갑옷 씨: 바느질
  rakko: { train: 'sword', drink: 'bowl' }, usagi: { train: 'stick', drink: 'bowl' },
  hachiware: { dance: 'mic', drink: 'bowl', train: 'fork', snap: 'camera', hug: 'camera' }, chiikawa: { drink: 'bowl', train: 'fork' }, momonga: { drink: 'bowl' }
};

// 누구나 같은 것을 드는 몸짓: 라멘 로우에서 후루룩 먹을 때는 그릇과 젓가락
const EAT_PROP = { slurp: 'f-ramen' };
/** 그 친구가 그 몸짓을 할 때 드는 소품 꼬리표(없으면 null). */
export const propFor = (kind, mode) => (PROP_FOR[kind] || {})[mode] || EAT_PROP[mode] || null;

/** 그 친구가 쓰는 소품 부품에 꼬리표(tag)를 달아 덧붙인다(buildFromDef 가 숨겨 둔다). */
function withProps(kind, def) {
  new Set([...Object.values(PROP_FOR[kind] || {}), ...Object.values(EAT_PROP)]).forEach((tag) => {
    (PROP_PARTS[tag] ? PROP_PARTS[tag](def) : foodParts(def, tag)).forEach((pt) => def.parts.push({ ...pt, tag }));
  });
  return def;
}

const darken = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color('#2b2224'), k).getStyle();

/** 내 캐릭터 얼굴: 눈, 눈썹, 볼, 입, 수염. 웃는 눈 · 입 같은 선은 둥근 호(arc)로, 벌린 입은 반달(half)로 그린다. */
function playerFace(parts, hc, hr, look) {
  const eyeX = 0.135, eyeY = 0.02, mY = -0.085;
  const hairInk = darken(look.hairColor, 0.35), browInk = look.hair === 'none' ? EYE : hairInk;
  /** 얼굴 위 부품 하나(그늘 · 외곽선 없이). rz: 얼굴 면 안에서 돌리기. */
  const put = (m, c, x, y, s, rz = 0, push = 0.004) => {
    const q = onHead(hc, hr, x, y, push);
    parts.push({ m, c, p: q.p, r: [q.r[0], q.r[1], rz], s, n: 'head', o: false });
  };
  /** 반짝이는 눈동자: 까만 타원 + 큰 눈빛 · 작은 눈빛(울먹이면 아래에 물기). */
  const roundEye = (x, w, h, { teary = false, iris = null } = {}) => {
    put('dot', EYE, x, eyeY, [w, h, 0.02], 0, 0); // 눈동자는 얼굴에 붙이고 그 위로 겹겹이(묻히지 않게 조금씩 앞으로)
    if (iris) put('dot', iris, x, eyeY - h * 0.5, [w * 0.58, h * 0.26, 0.01], 0, 0.012); // 눈 아래쪽 은은한 빛
    put('dot', SHINE, x + w * 0.3, eyeY + h * 0.36, [w * 0.42, h * 0.36, 0.008], 0, 0.016);
    put('dot', SHINE, x - w * 0.34, eyeY - h * 0.3, [w * 0.2, h * 0.17, 0.008], 0, 0.016);
    if (teary) { put('dot', '#bfe6ff', x, eyeY - h * 0.6, [w * 0.66, h * 0.17, 0.01], 0, 0.014); put('dot', SHINE, x + w * 0.38, eyeY - h * 0.05, [w * 0.13, h * 0.11, 0.008], 0, 0.016); } // 글썽이는 물기
  };
  const happyEye = (x) => put('arc:2.3:0.3', EYE, x, eyeY - 0.004, [0.03, 0.03, 0.01]); // ∩ 웃는 눈
  [-1, 1].forEach((sd) => {
    const x = sd * eyeX;
    if (look.eyes === 'sleepy') put('arc:1.9:0.24', EYE, x, eyeY + 0.006, [0.032, 0.032, 0.01], Math.PI); // ∪ 쿨쿨 감은 눈
    else if (look.eyes === 'smile' || (look.eyes === 'wink' && sd > 0)) happyEye(x);
    else if (look.eyes === 'sparkle') roundEye(x, 0.056, 0.074, { iris: '#8a72c9' });
    else if (look.eyes === 'teary') roundEye(x, 0.052, 0.07, { teary: true });
    else roundEye(x, 0.044, 0.06); // 동글(예전 저장의 모르는 눈도)
    // 눈썹: 가는 · 콩(동그란 콩눈썹) · 시무룩(안쪽이 올라간)
    if (look.brows === 'thin') put('arc:1.5:0.2', browInk, x, eyeY + 0.108, [0.032, 0.032, 0.01], -sd * 0.12);
    else if (look.brows === 'thick') put('dot', browInk, x * 0.86, eyeY + 0.104, [0.026, 0.017, 0.01]);
    else if (look.brows === 'worried') put('arc:1.4:0.22', browInk, x * 0.95, eyeY + 0.1, [0.03, 0.03, 0.01], sd * 0.42);
    // 볼
    put('dot', look.cheek, sd * 0.25, -0.075, [0.07, 0.036, 0.012], 0, -0.004);
    // 수염: 고양이 수염(가는 세 가닥) · 콧수염(동글게 말린 양 끝)
    if (look.beard === 'whiskers') [-1, 0, 1].forEach((k) => put('dot', '#5a4a4e', sd * 0.335, -0.045 + k * 0.026, [0.058, 0.0045, 0.005], sd * k * 0.2));
    else if (look.beard === 'mustache') {
      put('dot', hairInk, sd * 0.03, mY + 0.03, [0.036, 0.016, 0.012], -sd * 0.28, 0.008);
      put('arc:4.2:0.42', hairInk, sd * 0.066, mY + 0.046, [0.013, 0.013, 0.008], sd * 2.2, 0.008); // 끝이 동그랗게 말린다
    }
  });
  // 입: 작은 입(∪) · 벌린 입(반달 + 혀) · 고양이 입(ω) · 활짝(큰 반달 + 혀) · 메롱(∪ + 쏙 내민 혀)
  if (look.mouth === 'open') { put('half', MOUTH, 0, mY + 0.008, [0.03, 0.03, 1]); put('half', '#f28a9b', 0, mY - 0.012, [0.018, 0.012, 1], 0, 0.006); }
  else if (look.mouth === 'grin') { put('half', MOUTH, 0, mY + 0.012, [0.05, 0.042, 1]); put('half', '#f28a9b', 0, mY - 0.017, [0.03, 0.016, 1], 0, 0.006); }
  else if (look.mouth === 'cat') [-1, 1].forEach((sd) => put('arc:2.6:0.3', MOUTH, sd * 0.0135, mY + 0.006, [0.0135, 0.0135, 0.008], Math.PI));
  else if (look.mouth === 'blep') { put('dot', '#f28a9b', 0.004, mY - 0.012, [0.013, 0.017, 0.01], 0, 0.006); put('arc:2.2:0.3', MOUTH, 0, mY + 0.006, [0.02, 0.02, 0.008], Math.PI, 0.008); }
  else put('arc:2.1:0.32', MOUTH, 0, mY + 0.004, [0.02, 0.02, 0.008], Math.PI);
  // 염소수염: 턱 밑에 작은 세모 털
  if (look.beard === 'goatee') put('cone', hairInk, 0, mY - 0.052, [0.026, 0.05, 0.012], Math.PI, 0.006);
  // 복슬 수염: 볼 아래를 감싸는 뭉게뭉게 털(머리 · 수염 색, 외곽선 있음)
  else if (look.beard === 'full') parts.push({ m: 'beard:full', c: look.hairColor, p: hc, s: [hr[0] * 1.05, hr[1] * 1.05, hr[2] * 1.06], n: 'head' });
}

// ---------- 머리카락 · 수염 껍질 도형 ----------
const sstep = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
/** 앞머리 가닥 모양: 이마 폭 ±w(라디안)를 n 가닥으로 — 가닥 끝(1)은 둥글고 가닥 사이(0)는 뾰족하게 파인다. */
function lobe(a, n, w, shift = 0) {
  const u = ((a - shift + w) / (2 * w)) * n;
  if (u <= 0 || u >= n) return 0;
  return Math.sqrt(Math.sin(Math.PI * (u - Math.floor(u))));
}
/**
 * 머리에 씌우는 두께 있는 껍질(머리카락 · 수염). 단위 구 위의 a(앞 0 · 오른쪽 + · 뒤 ±π)와 t(정수리 0 ~ 아래 π)로 적는다.
 * edge(a): 아랫단의 t, from(a): 윗단의 t(없으면 정수리부터), bump(a, t): 반지름에 더할 것, span: [a0, a1](없으면 한 바퀴).
 * 바깥 · 안쪽 면과 테두리 띠로 닫힌 도형이라, 앞머리 끝 같은 아랫단에도 외곽선이 또렷하게 생긴다.
 */
function shellGeometry({ edge, from = null, bump = () => 0, span = null, inner = 0.9, nu = 72, nv = 12 }) {
  const full = !span, [a0, a1] = span || [-Math.PI, Math.PI], cols = full ? nu : nu + 1;
  const pos = [], idx = [];
  for (const layer of [0, 1]) for (let j = 0; j <= nv; j++) for (let i = 0; i < cols; i++) {
    const a = a0 + (i / nu) * (a1 - a0), t0 = from ? from(a) : 0, t = t0 + (j / nv) * (edge(a) - t0);
    const r = (1 + bump(a, t)) * (layer ? inner : 1);
    pos.push(r * Math.sin(a) * Math.sin(t), r * Math.cos(t), r * Math.cos(a) * Math.sin(t));
  }
  // 정수리(from 이 없으면 j = 0 줄은 한 점)는 꼭짓점 하나로 모아 외곽선이 갈라지지 않게, 한 바퀴면 이음매도 이어 붙인다
  const at = (layer, j, i) => layer * (nv + 1) * cols + j * cols + (!from && j === 0 ? 0 : full ? i % cols : i);
  const tri = (a, b, c) => { if (a !== b && b !== c && a !== c) idx.push(a, b, c); };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const A = at(0, j, i), B = at(0, j, i + 1), C = at(0, j + 1, i + 1), D = at(0, j + 1, i);
    tri(A, D, B); tri(B, D, C); // 바깥 면(밖을 본다)
    const a = at(1, j, i), b = at(1, j, i + 1), c = at(1, j + 1, i + 1), d = at(1, j + 1, i);
    tri(a, b, d); tri(b, c, d); // 안쪽 면
  }
  for (let i = 0; i < nu; i++) {
    const O = at(0, nv, i), O2 = at(0, nv, i + 1), I = at(1, nv, i), I2 = at(1, nv, i + 1);
    tri(O, I, O2); tri(O2, I, I2); // 아랫단 띠
    if (from) { const T = at(0, 0, i), T2 = at(0, 0, i + 1), U = at(1, 0, i), U2 = at(1, 0, i + 1); tri(T, T2, U); tri(T2, U2, U); } // 윗단 띠
  }
  if (!full) for (const [i, flip] of [[0, false], [nu, true]]) for (let j = 0; j < nv; j++) { // 양 끝 마구리
    const O = at(0, j, i), O2 = at(0, j + 1, i), I = at(1, j, i), I2 = at(1, j + 1, i);
    if (flip) { tri(O, O2, I); tri(O2, I2, I); } else { tri(O, I, O2); tri(O2, I, I2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/**
 * 머리선: 앞은 앞머리 가닥(top ~ top + deep), 옆 · 뒤는 side → back, 그 사이는 부드럽게(fade: 앞머리 폭에 곱해 옆으로 넘어가는 곳).
 * lock: 얼굴 양옆에 늘어뜨린 둥근 옆머리 가닥의 길이(0 이면 없음), ruffle: 옆 · 뒷머리 끝을 몽글몽글하게(뽀글).
 */
function hairline(a, { n = 3, w = 0.85, top = 0.27, deep = 0.09, side = 0.55, back = 0.62, shift = 0, fade = [0.75, 1.6], lock = 0.08, ruffle = 0 }) {
  const P = Math.PI, A = Math.abs(a);
  const front = (top + deep * lobe(a, n, w, shift)) * P, rest = (side + (back - side) * sstep(1.7, P, A) + ruffle * sstep(1.3, 1.9, A) * (0.5 + 0.5 * Math.cos(10 * a))) * P;
  const sideLock = lock * Math.exp(-(((A - w * 1.15) / 0.14) ** 2)) * P;
  return front + (rest - front) * sstep(w * fade[0], w * fade[1], A) + sideLock;
}
/** 헤어스타일마다의 껍질 도형(처음 쓸 때 만들어 둔다). */
const HAIR_LINES = {
  bangs: { n: 3 },
  bob: { n: 5, w: 0.8, top: 0.28, deep: 0.06, side: 0.76, back: 0.74, lock: 0 },
  bun: { n: 2, w: 0.9, top: 0.25, deep: 0.11, shift: 0.18 },
  curly: { n: 5, top: 0.27, deep: 0.08, side: 0.54, back: 0.58, lock: 0, ruffle: 0.06 }
};
/** 뽀글 머리 털 뭉치 자리(단위 구 위의 방향): 정수리 하나, 그 둘레 다섯, 옆 · 뒤 여덟. */
const CURLS = [[0, 0.12, 6], [0.22, 0.3, 5], [0.42, 0.44, 8]].flatMap(([t, off, n]) => Array.from({ length: n }, (_, i) => {
  const a = off + (i / n) * Math.PI * 2, tt = t * Math.PI;
  return [Math.sin(a) * Math.sin(tt), Math.cos(tt), Math.cos(a) * Math.sin(tt)];
})).filter((v, i, list) => list.findIndex((o) => Math.hypot(o[0] - v[0], o[1] - v[1], o[2] - v[2]) < 1e-6) === i);
const HAIR_BUMP = {
  // 단발: 옆머리는 볼록하게, 끝은 안으로 살짝 말린다
  bob: (a, t) => 0.03 * sstep(0.35 * Math.PI, 0.6 * Math.PI, t) * sstep(0.7, 1.2, Math.abs(a)) - 0.025 * sstep(hairline(a, HAIR_LINES.bob) - 0.1 * Math.PI, hairline(a, HAIR_LINES.bob), t),
  // 뽀글: 머리 위에 둥근 털 뭉치가 뭉게뭉게(가장 가까운 뭉치만큼 부푼다 — 매끈해야 외곽선이 갈라지지 않는다)
  curly: (a, t) => {
    const x = Math.sin(a) * Math.sin(t), y = Math.cos(t), z = Math.cos(a) * Math.sin(t);
    let best = 0;
    for (const [bx, by, bz] of CURLS) best = Math.max(best, Math.exp(-((1 - (x * bx + y * by + z * bz)) / 0.045)));
    return 0.035 + 0.13 * best;
  }
};
const lookGeo = new Map();
const cachedGeo = (key, make) => { if (!lookGeo.has(key)) lookGeo.set(key, make()); return lookGeo.get(key); };
function lookGeometry(m) {
  return cachedGeo(m, () => {
    const [kind, a, b] = m.split(':');
    // 호(선): 가운데가 원점에 오는 ∩ 모양 굵은 선(span 라디안, tube 굵기). rz = π 면 ∪
    if (kind === 'arc') return new THREE.TorusGeometry(1, +b, 6, Math.max(8, Math.round(+a * 8)), +a).rotateZ(Math.PI / 2 - +a / 2).translate(0, -1, 0);
    if (kind === 'ring') return new THREE.TorusGeometry(1, +a, 8, 28);
    if (kind === 'half') return new THREE.CircleGeometry(1, 20, Math.PI, Math.PI); // 아래 반달(위가 곧은 벌린 입)
    if (kind === 'hair') return shellGeometry({ edge: (x) => hairline(x, HAIR_LINES[a]), bump: HAIR_BUMP[a] });
    if (kind === 'beard') {
      // 턱 밑으로 동글하게 부푼 털: 윗단은 입 아래에서 볼 아래로, 아랫단은 몽글몽글 세 덩이, 아래로 갈수록 앞으로 부푼다
      const P = Math.PI;
      return shellGeometry({ span: [-1.05, 1.05], from: (x) => (0.625 - 0.05 * sstep(0, 1.05, Math.abs(x))) * P,
        edge: (x) => (0.68 + 0.07 * lobe(x, 3, 1.05)) * P, bump: (x, t) => 0.03 + 0.1 * sstep(0.6 * P, 0.76 * P, t) * (1 - 0.5 * sstep(0.5, 1.05, Math.abs(x))),
        nu: 64, nv: 12, inner: 0.86 });
    }
    throw new Error('unknown part mesh ' + m);
  });
}

/** 머리카락: 앞머리 가닥이 있는 한 덩어리 껍질 + 스타일마다 덧붙이는 것(똥머리 · 양갈래 · 더듬이). */
function hairParts(parts, hc, look) {
  const C = look.hairColor, shell = (style) => ({ m: 'hair:' + style, c: C, p: hc, s: [0.452, 0.39, 0.41], n: 'head' });
  switch (look.hair) {
    case 'tuft': // 정수리에 동그랗게 말린 더듬이 한 가닥
      parts.push({ m: 'arc:4.4:0.3', c: C, p: [0.015, 1.18, 0.03], r: [0, 0, -0.5], s: [0.055, 0.055, 0.055], n: 'head' });
      break;
    case 'bangs':
      parts.push(shell('bangs'));
      break;
    case 'bob':
      parts.push(shell('bob'));
      break;
    case 'bun':
      parts.push(shell('bun'));
      parts.push({ m: 'sphere', c: C, p: [0, 1.17, -0.09], s: [0.14, 0.13, 0.14], n: 'head' });
      parts.push({ m: 'ring:0.32', c: '#f48fb1', p: [0, 1.085, -0.08], r: [Math.PI / 2 - 0.25, 0, 0], s: [0.1, 0.1, 0.1], n: 'head' });
      break;
    case 'twin':
      parts.push(shell('bangs'));
      [-1, 1].forEach((sd) => {
        parts.push({ m: 'sphere', c: C, p: [sd * 0.49, 0.7, -0.07], r: [0, 0, sd * 0.32], s: [0.105, 0.165, 0.105], n: 'head' });
        parts.push({ m: 'sphere', c: '#f48fb1', p: [sd * 0.43, 0.85, -0.05], s: [0.042, 0.042, 0.042], n: 'head' });
      });
      break;
    case 'curly':
      parts.push(shell('curly'));
      break;
    default:
      break;
  }
}

/** 머리카락 위에 얹는 장식 자리: 모자 · 왕관 · 새싹은 위로, 리본 · 꽃 · 별 핀은 바깥으로(뽀글 머리는 더). */
function liftAccessory(list, look, hc) {
  if (['none', 'tuft'].includes(look.hair)) return list;
  const curly = look.hair === 'curly';
  if (['cap', 'crown', 'sprout', 'beret', 'strawhat', 'headphones', 'flowercrown', 'halo'].includes(look.accessory)) { const up = curly ? 0.1 : 0.025; return list.map((pt) => ({ ...pt, p: [pt.p[0], pt.p[1] + up, pt.p[2]] })); }
  if (['ribbon', 'flower', 'starpin', 'berrypin'].includes(look.accessory)) { const k = curly ? 1.14 : 1.05; return list.map((pt) => ({ ...pt, p: [pt.p[0] * k, hc[1] + (pt.p[1] - hc[1]) * k, pt.p[2] * k] })); }
  return list;
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
    case 'starpin': // 별 조각 머리핀(별 조각 셋으로 만든다): 오른쪽 머리 옆에 노란 별 하나(꽃 핀의 반대쪽)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        parts.push({ m: 'sphere', c: '#ffd84a', p: [0.3 + Math.sin(a) * 0.045, 1.07 + Math.cos(a) * 0.045, 0.14], r: [0, 0, -a], s: [0.024, 0.055, 0.018], n: 'head' });
      }
      parts.push({ m: 'sphere', c: '#fff3a0', p: [0.3, 1.07, 0.155], s: [0.03, 0.03, 0.02], n: 'head' });
      break;
    case 'cap':
      parts.push({ m: 'sphere', c: '#e8706a', p: [0, 1.0, 0], s: [0.33, 0.2, 0.32], n: 'head' });
      parts.push({ m: 'cylinder', c: '#e8706a', p: [0, 0.98, 0.26], s: [0.22, 0.02, 0.16], n: 'head' });
      parts.push({ m: 'sphere', c: '#ffffff', p: [0, 1.2, 0], s: [0.035, 0.035, 0.035], n: 'head' });
      break;
    case 'bandage': { // 왼쪽 볼 위에 비스듬히 붙인 반창고(가운데 패드)
      const b = onHead(hc, hr, -0.24, -0.005, 0.006), pad = onHead(hc, hr, -0.24, -0.005, 0.01);
      parts.push({ m: 'box', c: '#f6d2a8', p: b.p, r: [b.r[0], b.r[1], 0.5], s: [0.1, 0.036, 0.008], n: 'head', o: false });
      parts.push({ m: 'box', c: '#eab98a', p: pad.p, r: [pad.r[0], pad.r[1], 0.5], s: [0.032, 0.032, 0.008], n: 'head', o: false });
      break;
    }
    case 'berrypin': // 오른쪽 머리 옆에 딸기 하나(꼭지는 초록 잎)
      parts.push({ m: 'sphere', c: '#e8455a', p: [0.3, 1.05, 0.14], r: [0, 0, -0.3], s: [0.05, 0.062, 0.042], n: 'head' });
      parts.push({ m: 'cone', c: '#6fae5f', p: [0.315, 1.1, 0.14], r: [Math.PI, 0, -0.3], s: [0.05, 0.03, 0.045], n: 'head' });
      [[-0.016, 0.012], [0.014, -0.004], [-0.004, -0.024]].forEach(([dx, dy]) => parts.push({ m: 'dot', c: '#ffe08a', p: [0.3 + dx, 1.05 + dy, 0.183], s: [0.007, 0.007, 0.004], n: 'head', o: false }));
      break;
    case 'beret': // 살짝 기울여 쓴 남색 베레모 + 꼭지
      parts.push({ m: 'sphere', c: '#4f6b9a', p: [0.03, 1.07, -0.01], r: [0, 0, 0.18], s: [0.36, 0.1, 0.34], n: 'head' });
      parts.push({ m: 'cylinder', c: '#4f6b9a', p: [0.05, 1.16, -0.01], s: [0.016, 0.04, 0.016], n: 'head' });
      break;
    case 'strawhat': // 넓은 챙 + 둥근 꼭대기 + 빨간 띠
      parts.push({ m: 'cylinder', c: '#f0d48a', p: [0, 0.99, 0], r: [0.12, 0, 0], s: [0.47, 0.035, 0.47], n: 'head' }); // 앞으로 살짝 기운 챙
      parts.push({ m: 'sphere', c: '#f0d48a', p: [0, 1.05, -0.01], s: [0.28, 0.2, 0.28], n: 'head' });
      parts.push({ m: 'cylinder', c: '#e0524f', p: [0, 1.03, -0.01], s: [0.285, 0.05, 0.285], n: 'head' });
      break;
    case 'sunglasses': // 까만 동글 렌즈 + 테 + 렌즈에 비친 빛
      [-1, 1].forEach((sd) => {
        const g = onHead(hc, hr, sd * 0.14, 0.02, 0.028), sh = onHead(hc, hr, sd * 0.14 - 0.022, 0.042, 0.034);
        parts.push({ m: 'dot', c: '#2b2a33', p: g.p, r: g.r, s: [0.07, 0.064, 0.01], n: 'head', o: false });
        parts.push({ m: 'ring', c: '#3a3236', p: g.p, r: g.r, s: [0.075, 0.075, 0.075], n: 'head', o: false });
        parts.push({ m: 'dot', c: '#ffffff', p: sh.p, r: [sh.r[0], sh.r[1], 0.6], s: [0.022, 0.009, 0.004], n: 'head', o: false });
      });
      {
        const b = onHead(hc, hr, 0, 0.03, 0.03);
        parts.push({ m: 'dot', c: '#3a3236', p: b.p, r: b.r, s: [0.04, 0.008, 0.008], n: 'head', o: false });
      }
      break;
    case 'headphones': // 머리 위로 넘긴 분홍 띠(호) + 양옆 귀덮개
      parts.push({ m: 'arc:2.7:0.08', c: '#f48fb1', p: [0, 1.2, 0], s: [0.46, 0.46, 0.46], n: 'head' });
      [-1, 1].forEach((sd) => {
        parts.push({ m: 'sphere', c: '#f48fb1', p: [sd * 0.44, 0.86, 0], s: [0.06, 0.1, 0.1], n: 'head' });
        parts.push({ m: 'sphere', c: '#fff6f9', p: [sd * 0.475, 0.86, 0], s: [0.02, 0.07, 0.07], n: 'head', o: false });
      });
      break;
    case 'flowercrown': // 초록 덩굴 고리 + 둘레의 들꽃
      parts.push({ m: 'ring:0.1', c: '#7cc46a', p: [0, 1.06, 0], r: [Math.PI / 2 - 0.12, 0, 0], s: [0.32, 0.32, 0.32], n: 'head' });
      for (let i = 0; i < 8; i++) { // 꽃은 덩굴 위에 얹혀 위로 봉긋(앞쪽은 살짝 아래로 기운다)
        const a = (i / 8) * Math.PI * 2, z = Math.cos(a) * 0.33;
        parts.push({ m: 'sphere', c: ['#f6a9c4', '#ffffff', '#ffd66b', '#c4b4e8'][i % 4], p: [Math.sin(a) * 0.33, 1.11 - z * 0.12, z], s: [0.075, 0.06, 0.075], n: 'head' });
      }
      break;
    case 'halo': // 머리 위에 둥실 뜬 금빛 고리
      parts.push({ m: 'ring:0.12', c: '#ffd84a', p: [0, 1.34, 0], r: [Math.PI / 2 - 0.15, 0, 0], s: [0.2, 0.2, 0.2], n: 'head' });
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
  const tone = patternTone(body), hex = (c) => '#' + new THREE.Color(c).getHexString();
  const parts = [], hc = [0, 0.74, 0], hr = [0.43, 0.37, 0.39], pivots = {};
  parts.push({ m: 'sphere', c: body, p: [0, 0.34, 0], s: [0.34, 0.32, 0.31], n: 'body' });
  parts.push({ m: 'sphere', c: body, p: [0, 0.22, -0.3], s: [0.06, 0.06, 0.06], n: 'body' });
  limbs(parts, body, 0.36, 0.31);
  // 무늬는 머리에 직접 칠한다(몸 색마다 어울리는 무늬 색). 하트는 뒤통수에 큰 하트 + 이마에 작은 하트(볼 색)
  parts.push(LOOK_PATTERNS.has(look.pattern)
    ? { m: `pat:${look.pattern}:${hex(tone)}:${hex(body)}:${hex(look.cheek)}`, c: '#ffffff', p: hc, s: hr, n: 'head' }
    : { m: 'sphere', c: body, p: hc, s: hr, n: 'head' });
  if (look.pattern === 'heart') {
    const f = onHead(hc, hr, 0, 0.2, 0.004);
    parts.push({ m: 'heart', c: look.cheek, p: f.p, r: f.r, s: [0.034, 0.034, 0.012], n: 'head', o: false });
  }
  // 귀 색: 가르마 · 줄무늬는 두 귀 모두 무늬 색, 얼룩은 얼룩이 닿은 오른쪽 귀만
  const earColor = (sd) => (look.pattern === 'part' || look.pattern === 'stripes' || (look.pattern === 'spots' && sd > 0) ? tone : body);
  if (look.ears === 'pointy') {
    [-1, 1].forEach((sd) => parts.push({ m: 'cone', c: earColor(sd), p: [sd * 0.25, 0.97, -0.01], r: [0, 0, -sd * 0.38], s: [0.12, 0.21, 0.08], n: 'head' }));
  } else if (look.ears === 'bunny') {
    [-1, 1].forEach((sd) => {
      const nm = sd < 0 ? 'earL' : 'earR';
      parts.push({ m: 'sphere', c: body, p: [sd * 0.13, 1.3, -0.02], r: [0, 0, -sd * 0.14], s: [0.085, 0.28, 0.065], n: nm, par: 'head' });
      parts.push({ m: 'dot', c: EAR_PINK, p: [sd * 0.13, 1.3, 0.035], r: [0, 0, -sd * 0.14], s: [0.045, 0.2, 0.02], n: nm, par: 'head', o: false });
    });
    pivots.earL = [-0.13, 1.04, -0.02];
    pivots.earR = [0.13, 1.04, -0.02];
  } else if (look.ears === 'floppy' || look.ears === 'lop') {
    // 늘어진 귀: 머리 옆(강아지) · 정수리 옆(토끼)에 붙어 볼 옆으로 축 늘어진다. 토끼 귀처럼 따로 마디를 둬서 걸을 때 팔랑인다
    const lop = look.ears === 'lop', top = lop ? [0.25, 1.04] : [0.36, 0.95];
    [-1, 1].forEach((sd) => {
      const nm = sd < 0 ? 'earL' : 'earR';
      parts.push(lop
        ? { m: 'sphere', c: earColor(sd), p: [sd * 0.44, 0.76, 0], r: [0, 0, sd * 0.1], s: [0.085, 0.27, 0.06], n: nm, par: 'head' }
        : { m: 'sphere', c: earColor(sd), p: [sd * 0.41, 0.86, -0.02], r: [0, 0, sd * 0.18], s: [0.075, 0.14, 0.055], n: nm, par: 'head' });
      pivots[nm] = [sd * top[0], top[1], -0.02];
    });
  } else if (look.ears === 'mouse') { // 큰 동글 귀: 넓적한 동그라미에 분홍 속귀
    [-1, 1].forEach((sd) => {
      parts.push({ m: 'sphere', c: earColor(sd), p: [sd * 0.3, 1.1, -0.04], r: [0, 0, -sd * 0.35], s: [0.15, 0.15, 0.045], n: 'head' });
      parts.push({ m: 'dot', c: EAR_PINK, p: [sd * 0.3, 1.1, -0.0], r: [0, 0, -sd * 0.35], s: [0.095, 0.095, 0.02], n: 'head', o: false });
    });
  } else if (look.ears === 'fox') { // 여우 귀: 크고 뾰족한 세모에 분홍 속귀
    [-1, 1].forEach((sd) => {
      // 원뿔 밑면은 머리 속에 묻는다(머리 위에 떠 있으면 밑면 테두리가 귀와 머리 사이에 가로줄로 보인다)
      parts.push({ m: 'cone', c: earColor(sd), p: [sd * 0.218, 0.95, -0.03], r: [0, 0, -sd * 0.3], s: [0.17, 0.34, 0.065], n: 'head' });
      // 속귀: 원뿔은 밑면이 기준점이라 겉귀 밑동보다 살짝 위에서 시작해, 겉귀 앞면 기울기에 맞춰 뒤로 눕힌다
      parts.push({ m: 'cone', c: EAR_PINK, p: [sd * 0.249, 1.05, 0.022], r: [-0.17, 0, -sd * 0.3], s: [0.07, 0.16, 0.008], n: 'head', o: false });
    });
  } else if (look.ears === 'small') {
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: earColor(sd), p: [sd * 0.22, 1.08, -0.02], s: [0.07, 0.065, 0.05], n: 'head' }));
  } else {
    [-1, 1].forEach((sd) => parts.push({ m: 'sphere', c: earColor(sd), p: [sd * 0.25, 1.07, -0.02], r: [0, 0, -sd * 0.3], s: [0.11, 0.1, 0.07], n: 'head' }));
  }
  playerFace(parts, hc, hr, look);
  hairParts(parts, hc, look);
  const acc = [];
  accessoryParts(acc, hc, hr, look);
  parts.push(...liftAccessory(acc, look, hc)); // 머리카락이 있으면 그만큼 위 · 밖으로(묻히지 않게)
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
  // 낚싯대(core/fishing.js, 꼬리표 'rod' — player.setRod 로 보인다): 손잡이 · 릴 · 앞으로 길게 뻗은 대 끝에 빨간 끝
  held({ parts }, 'armR', HOLD.train, [
    { m: 'box', c: '#7a5136', p: [0, 0, 0.03], s: [0.05, 0.05, 0.24] },
    { m: 'cylinder', c: '#b9bec6', p: [0.055, -0.03, 0.06], r: [0, 0, Math.PI / 2], s: [0.05, 0.035, 0.05] },
    { m: 'box', c: '#d9b27a', p: [0, 0.06, 0.78], r: [-0.12, 0, 0], s: [0.026, 0.026, 1.3] },
    { m: 'dot', c: '#e0524f', p: [0, 0.14, 1.43], s: [0.03, 0.03, 0.03], o: false }
  ]).forEach((pt) => parts.push({ ...pt, n: 'weapon', par: 'armR', tag: 'rod' }));
  // 랭커가 무기에 새긴 내 얼굴(꼬리표 'wf-무기id', player.setEngraved 로 보인다)
  for (const [id, [z, y, w]] of Object.entries(FACE_AT)) held({ parts }, 'armR', HOLD.train, faceParts(body, z, y, w)).forEach((pt) => parts.push({ ...pt, n: 'weapon', par: 'armR', tag: 'wf-' + id }));
  // 먹을 때 손에 드는 음식(꼬리표 'f-…', player.eat 로 보인다): 라멘 그릇 · 맥주잔 · 하이볼 · 주먹밥 …
  for (const tag of Object.keys(FOOD_SHAPES)) foodParts({ parts }, tag).forEach((pt) => parts.push({ ...pt, tag }));
  const tall = look.ears === 'bunny' ? 0.45 : ['mouse', 'fox'].includes(look.ears) || ['bun', 'curly'].includes(look.hair) || ['cap', 'crown', 'sprout', 'pajama', 'beret', 'strawhat', 'flowercrown', 'halo'].includes(look.accessory) ? 0.15 : 0;
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
  const pivots = {}, props = {}, roles = {}; // props: 꼬리표(tag)를 단 소품(맥주잔 · 책처럼 그 몸짓을 할 때만 보이는 것), roles: 표정 부품
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
    const patterned = pt.m === 'hachi' || pt.m === 'kuri' || pt.m === 'kani' || pt.m.startsWith('pat:');
    // 2D 손그림처럼: 단색 칠(얼굴 부품은 그늘도 없이) + 붓펜 같은 외곽선
    const material = celMaterial(patterned ? '#ffffff' : pt.c, { vertexColors: patterned, doubleSide: !!pt.ds, flat: pt.o === false });
    const size = Math.max(Math.abs(pt.s[0]), Math.abs(pt.s[1]), Math.abs(pt.s[2]));
    const mesh = new THREE.Mesh(partGeometry(pt.m, size), material);
    mesh.position.set(pt.p[0] - pv[0], pt.p[1] - pv[1], pt.p[2] - pv[2]);
    const r = pt.r || [0, 0, 0];
    mesh.rotation.set(r[0], r[1], r[2], 'YXZ');
    mesh.scale.set(pt.s[0], pt.s[1], pt.s[2]);
    if (pt.o !== false) {
      mesh.castShadow = size >= SHADOW_MIN; // 손톱만 한 부품의 그림자는 보이지도 않는다
      // 무늬 구(촘촘한 1만 2천 삼각형)의 외곽선은 겉모양만 같으면 되니 보통 구로
      if (pt.m === 'box') addShellOutline(mesh, 0.02); else addOutline(mesh, 0.022, true, patterned ? GEO.sphere : mesh.geometry);
    }
    holder.add(mesh);
    if (pt.tag) { mesh.visible = false; (props[pt.tag] = props[pt.tag] || []).push(mesh); }
    if (pt.role) { // 얼굴 표정용(눈 · 눈빛 · 눈물): 원래 자리 · 크기를 기억해 둔다
      mesh.userData.base = { y: mesh.position.y, sx: mesh.scale.x, sy: mesh.scale.y, sz: mesh.scale.z };
      if (pt.role === 'tear' || pt.role === 'drop') mesh.visible = false;
      (roles[pt.role] = roles[pt.role] || []).push(mesh);
    }
  });
  mergeDetails(pivots, props, roles);
  return { root, inner, pivots, props, roles, height: def.height, radius: def.radius, label: def.label };
}

const partVolume = (m) => m.scale.x * m.scale.y * m.scale.z;
/**
 * 가볍게: 관절(몸통 · 머리 · 귀 …) 안의 작은 부품(볼 · 입 · 코 · 무늬 …)을 색을 꼭짓점에 칠해 몇 덩어리로 합친다(캐릭터마다 그리기 30여 번 → 20번 안팎).
 * 관절 안에서는 서로 움직이지 않아 합쳐도 몸짓은 그대로다. 그대로 두는 것: 팔 · 다리(잠옷이 부품마다 덧씌운다), 표정(roles: 울 때 움직인다),
 * 소품(props: 보였다 숨었다), 관절에서 가장 큰 부품(몸통 · 머리 본체: 잠옷이 크기를 잰다). 머리 위로 솟은 부품(귀)은 따로 합쳐 headTop 표시(잠옷 후드가 숨긴다).
 */
function mergeDetails(pivots, props, roles) {
  const keep = new Set([...Object.values(props), ...Object.values(roles)].flat());
  for (const [name, pivot] of Object.entries(pivots)) {
    if (/^(arm|leg)/.test(name)) continue;
    const parts = pivot.children.filter((m) => m.isMesh && !keep.has(m));
    if (parts.length < 3) continue;
    const big = parts.reduce((a, m) => (partVolume(m) > partVolume(a) ? m : a));
    const top = (m) => name === 'head' && m.position.y > big.position.y + big.scale.y * 0.55;
    const recolor = (m) => {
      const u = m.material.uniforms, flat = u.uShade.value === 0, ds = m.material.side === THREE.DoubleSide;
      return { key: [flat, ds].join('|'), material: celMaterial('#ffffff', { vertexColors: true, flat, doubleSide: ds }), tint: m.material.vertexColors ? null : u.uColor.value };
    };
    const rest = parts.filter((m) => m !== big && m.material.isShaderMaterial && m.material.uniforms && m.material.uniforms.uColor);
    for (const [list, high] of [[rest.filter(top), true], [rest.filter((m) => !top(m)), false]]) {
      if (list.length < 2) continue;
      mergeUnit(pivot, list, recolor).forEach((m) => { if (m.userData.merged) m.userData.headTop = high; });
    }
  }
}

/** 내 캐릭터 모델. 빠진 항목은 기본값을 쓴다. */
export function buildChibi(look) {
  const c = buildFromDef(playerDef(look));
  if (look && look.accessory === 'pajama') wearPajama(c, true, PAJAMA_COLORS.me); // 귀 달린 잠옷은 온몸에 입힌다
  return c;
}

/** 마을 친구 모델. 몸짓 소품(PROP_FOR)은 숨겨 두고, 등에 멘 칼('sheathed')만 처음부터 보인다. */
export function buildNpc(kind) {
  const chibi = buildFromDef(withProps(kind, DEFS[kind]()));
  (chibi.props.sheathed || []).forEach((m) => { m.visible = true; });
  chibi.kind = kind;
  return chibi;
}

/**
 * 귀 달린 잠옷(잠옷 밤나들이 · 옷장의 '귀 달린 잠옷'): 몸통 · 팔다리를 잠옷 색 껍질로 감싸고, 얼굴만 트인 후드와 동그란 귀,
 * 배에 단추 셋. 원래 귀(머리 위로 솟은 부품)는 후드 속으로 숨긴다. on = false 면 벗긴다. 어떤 캐릭터 모델에나(가장 큰 부품을 기준으로).
 * ownEars: 후드 귀를 그 캐릭터 귀 모양 그대로(원래 귀를 잠옷 천으로 감싼다 — 하치와레 뾰족귀 · 우사기 긴 귀). 마을 친구들이 입을 때.
 */
export function wearPajama(chibi, on, color = PAJAMA_COLORS.me, { ownEars = false } = {}) {
  const P = chibi.pivots || {};
  if (chibi.pajama) {
    chibi.pajama.forEach((m) => m.parent && m.parent.remove(m));
    (chibi.pajamaHidden || []).forEach((m) => { m.visible = true; });
    chibi.pajama = null; chibi.pajamaHidden = null;
  }
  if (!on) return;
  const added = [], hidden = [], mat = celMaterial(color, { doubleSide: true }), white = celMaterial('#fffaf0');
  const vol = (m) => m.scale.x * m.scale.y * m.scale.z;
  const biggest = (g) => { let b = null; (g ? g.children : []).forEach((m) => { if (m.isMesh && !m.userData.merged && (!b || vol(m) > vol(b))) b = m; }); return b; }; // 합친 덩어리(크기 1)는 빼고
  const put = (parent, geo, material, pos, scale, outline = 0.022) => {
    const m = new THREE.Mesh(geo, material);
    m.position.copy(pos);
    m.scale.copy(scale);
    if (outline) addOutline(m, outline, true);
    parent.add(m);
    added.push(m);
    return m;
  };
  // 몸통 · 팔다리: 조금 크게 덮는 껍질(소매 · 바짓단까지 잠옷)
  const body = biggest(P.body);
  if (body) {
    const sh = put(P.body, body.geometry, mat, body.position, body.scale.clone().multiplyScalar(1.06));
    sh.rotation.copy(body.rotation);
    [0.22, 0, -0.22].forEach((k) => put(P.body, partGeometry('sphere', 0.03), white,
      new THREE.Vector3(body.position.x, body.position.y + body.scale.y * k, body.position.z + body.scale.z * 1.04 * Math.sqrt(1 - k * k)),
      new THREE.Vector3(0.026, 0.026, 0.018), 0.012));
  }
  // 손에 든 물건(소품 · 무기)은 잠옷을 씌우지 않는다: 물건은 제 색 그대로(전에는 소품마다 잠옷 색 껍질이 씌워져 들고 있는 무기까지 잠옷 색이 됐다)
  const held = new Set(Object.values(chibi.props || {}).flat());
  ['armL', 'armR', 'legL', 'legR'].forEach((k) => (P[k] ? P[k].children : []).filter((m) => m.isMesh && !held.has(m)).forEach((m) => {
    const sh = put(P[k], m.geometry, mat, m.position, m.scale.clone().multiplyScalar(1.16));
    sh.rotation.copy(m.rotation);
  }));
  // 귀 모양 그대로 잠옷 천을 씌운다(ownEars): 원래 귀는 숨기고, 같은 모양을 조금 크게(부품 가운데를 기준으로 — 합친 덩어리는 자리가 꼭짓점에 들어 있다)
  const earShell = (parent, m) => {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const s = 1.1, c = m.geometry.boundingBox.getCenter(new THREE.Vector3());
    const at = m.position.clone().add(c.multiply(m.scale).applyEuler(m.rotation).multiplyScalar(1 - s));
    const sh = put(parent, m.geometry, mat, at, m.scale.clone().multiplyScalar(s), 0.018);
    sh.rotation.copy(m.rotation);
  };
  // 후드: 머리 부품보다 살짝 크게, 얼굴 쪽은 트였다. 머리 위로 솟은 원래 귀는 숨기고 동그란 귀 둘(ownEars 면 그 귀 모양 그대로)
  const head = biggest(P.head);
  if (head) {
    P.head.children.forEach((m) => {
      if (m === head || !m.isMesh || !m.visible || !(m.userData.headTop || m.position.y > head.position.y + head.scale.y * 0.55)) return;
      m.visible = false;
      hidden.push(m);
      if (ownEars) earShell(P.head, m);
    });
    // 토끼 귀처럼 따로 노는 귀: 그 관절째 숨기거나(동그란 귀) 관절은 두고 귀 부품마다 잠옷을 씌운다(귀가 같이 쫑긋거린다)
    ['earL', 'earR'].forEach((k) => {
      if (!P[k] || !P[k].visible) return;
      if (!ownEars) { P[k].visible = false; hidden.push(P[k]); return; }
      P[k].children.filter((m) => m.isMesh && m.visible).forEach((m) => { m.visible = false; hidden.push(m); earShell(P[k], m); });
    });
    const sc = head.scale.clone().multiplyScalar(1.09);
    put(P.head, hoodGeo.back, mat, head.position, sc);
    put(P.head, hoodGeo.brow, mat, head.position, sc, 0);
    if (!ownEars) [-1, 1].forEach((sd) => {
      const at = new THREE.Vector3(head.position.x + sd * head.scale.x * 0.6, head.position.y + head.scale.y * 0.86, head.position.z - head.scale.z * 0.08);
      put(P.head, partGeometry('sphere', 0.1), mat, at, new THREE.Vector3(head.scale.x * 0.27, head.scale.y * 0.3, head.scale.z * 0.2));
    });
  }
  chibi.pajama = added;
  chibi.pajamaHidden = hidden;
}

/**
 * 우는 얼굴(피자호빵이 너무 맛있어서 우는 우사기): 눈을 질끈 감고(눈이 가는 선으로, 눈빛은 숨김) 눈물이 고이고 · 흐르고 · 방울이 떨어진다.
 * 매 프레임 t(초)를 넘기면 방울이 볼을 타고 내려가며 떨어진다. on = false 면 원래 얼굴로.
 */
export function setCrying(chibi, on, t = 0) {
  const R = chibi.roles || {};
  (R.eye || []).forEach((m) => { m.scale.y = m.userData.base.sy * (on ? 0.2 : 1); m.scale.x = m.userData.base.sx * (on ? 1.25 : 1); });
  (R.shine || []).forEach((m) => { m.visible = !on; });
  (R.tear || []).forEach((m, i) => { m.visible = on; if (on) m.scale.y = m.userData.base.sy * (1 + 0.12 * Math.sin(t * 9 + i)); });
  (R.drop || []).forEach((m, i) => {
    m.visible = on;
    if (!on) { m.position.y = m.userData.base.y; return; }
    const k = (t * 1.3 + i * 0.45) % 1, b = m.userData.base;
    m.position.y = b.y - k * 0.2;
    m.scale.set(b.sx * (1 - k * 0.5), b.sy * (1 + k * 0.3), b.sz * (1 - k * 0.5));
  });
}

/** 손에 든 소품을 꼬리표 tag 하나만 보이게(null 이면 모두 숨김). 집 안 내 캐릭터가 잠깐 음식을 들 때. */
export function showOnlyProp(chibi, tag) {
  for (const [k, list] of Object.entries(chibi.props || {})) list.forEach((m) => { m.visible = k === tag; });
}

const ZERO = [0, 0, 0];
/**
 * 자세를 잡는다. mode: 'idle' | 'walk' | 'pull' | 'cheer' | 'talk' | 'sweep' | 'train' | 'read' | 'drink' | 'dance'
 *   | 'swing' | 'thrust' | 'hurt'(내 캐릭터) | 쉬기 · 놀기 몸짓: 'wave' 손 흔들기 · 'clap' 박수 · 'stretch' 기지개 · 'look' 두리번
 *   · 'sway' 흥얼흥얼 · 'hop' 깡충 · 'spin' 빙글 · 'sit' 앉기 · 'think' 갸웃 · 'shy' 부끄부끄 · 'pose' 귀여운 척 · 'gaze' 하늘 보기 · 'lean' 계산대에 기대기
 *   · 먹기: 'slurp' 그릇 들고 후루룩 · 'gulp' 잔 들고 꿀꺽 · 'nibble' 두 손으로 냠냠(eatmotion.js)
 *   · 별똥별맨 소동: 'pray' 두 손 모아 소원 빌기 · 'flail' 팔다리를 마구 휘두르며 발광 · 우사기 클럽: 'dj' 도토리를 나뭇잎으로 끽끽
 *   · 파자마 파티즈 무대: 'idol' 아이돌 춤(8박 안무) · 'idolSing' 노래하며 춤 · 'glow' 응원봉 흔들기 — 셋 다 opts.beat(곡 박 번호)에 맞춘다
 * opts: { phase (걷기 위상 — 몸짓 박자도 친구마다 어긋나게), power (뽑기 힘 0..1), look (고개 돌림), hop (걷기 통통 높이),
 *   swing (휘두르기 · 찌르기 진행 0..1), moving (걸으면서 휘두르면 다리는 계속 걷는다), eat (한 번 먹기 진행 0..1 — 없으면 계속 먹는다) }
 */
export function animateChibi(chibi, mode, t, opts = {}) {
  if (mode === 'swing' || mode === 'thrust') applyPose(chibi, attackPose(mode, t, opts));
  else if (opts.eat != null && EAT_ANIMS.includes(mode)) applyPose(chibi, blendPose(basePose('idle', t, opts), basePose(mode, t, opts), eatWeight(opts.eat)));
  else applyPose(chibi, basePose(mode, t, opts));
}

/** 두 자세를 w 만큼 섞는다(0 이면 A, 1 이면 B). */
function blendPose(A, B, w) {
  const a = {};
  for (const j of new Set([...Object.keys(A.a), ...Object.keys(B.a)])) a[j] = mix(A.a[j], B.a[j], w);
  const out = { a };
  for (const c of [...TRUNK, 'waddle']) out[c] = (A[c] || 0) + ((B[c] || 0) - (A[c] || 0)) * w;
  return out;
}

/** 몸짓 하나의 자세: 마디 회전(a)과 몸통(bob 통통 · lean 숙이기 · waddle 뒤뚱 · spin 돌기 · push 앞으로 쏠리기 · squash 눌림). */
function basePose(mode, t, opts) {
  const a = {};
  const phase = opts.phase || 0, s = Math.sin(phase);
  let bob = 0, lean = 0, waddle = 0, spin = 0;
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
  } else if (mode === 'faint') {
    // 기절(같이 토벌하다 쓰러짐): 뒤로 벌러덩 누워 팔다리를 축 늘어뜨린다
    a.armL = [-0.3, 0, -1.25]; a.armR = [-0.3, 0, 1.25];
    a.legL = [-0.35, 0, -0.25]; a.legR = [-0.35, 0, 0.25];
    a.head = [-0.15, 0, Math.sin(t * 2 + phase) * 0.06];
    lean = -1.35;
    bob = 0.16;
  } else if (mode === 'lean') {
    // 계산대에 팔짱 끼고 기대기(노동 갑옷 씨): 두 팔을 앞으로 모아 포개고 몸을 살짝 숙인다
    a.armL = [-1.35, 0, 0.78]; a.armR = [-1.35, 0, -0.78];
    a.head = [0.12 + Math.sin(t * 1.3 + phase) * 0.03, 0, 0];
    lean = 0.2;
    bob = Math.sin(t * 1.6 + phase) * 0.008;
  } else if (mode === 'cheer') {
    const w = Math.sin(t * 12 + phase);
    a.armL = [0, 0, -2.3 - w * 0.2]; a.armR = [0, 0, 2.3 + w * 0.2];
    a.head = [-0.15, 0, 0];
    bob = Math.abs(Math.sin(t * 8 + phase)) * 0.12;
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
  } else if (mode === 'hurt') {
    // 맞았을 때: 뒤로 휘청
    a.armL = [0, 0, -0.9]; a.armR = [0, 0, 0.9];
    a.head = [-0.25, 0, 0];
    lean = -0.25;
  } else if (mode === 'dance') {
    // 포즈: 두 팔을 번쩍, 통통 뛰며 몸을 흔든다
    const w = Math.sin(t * 7 + phase);
    a.armL = [0, 0, -2.0 - w * 0.3]; a.armR = [0, 0, 2.0 - w * 0.3];
    a.head = [-0.1, 0, w * 0.15];
    bob = Math.abs(Math.sin(t * 7 + phase)) * 0.1;
    waddle = w * 0.12;
  } else if (mode === 'wave') {
    // 손 흔들기: 오른팔을 높이 들고 좌우로 흔든다
    const w = Math.sin(t * 10 + phase);
    a.armR = [-0.2, 0, 2.3 + w * 0.35]; a.armL = [0, 0, -0.15];
    a.head = [-0.08, 0, -0.08 + w * 0.05];
  } else if (mode === 'clap') {
    // 박수: 두 손을 가슴 앞에서 모았다 폈다
    const k = (Math.sin(t * 16 + phase) + 1) / 2;
    a.armL = [-1.05, 0, -0.1 + k * 0.6]; a.armR = [-1.05, 0, 0.1 - k * 0.6];
    a.head = [-0.06, 0, Math.sin(t * 4 + phase) * 0.06];
    bob = k * 0.025;
  } else if (mode === 'stretch') {
    // 기지개: 천천히 두 팔을 쭉 올리며 몸을 뒤로 젖혔다 내린다
    const u = (Math.sin(t * 1.8 + phase) + 1) / 2;
    a.armL = [-0.25 * u, 0, -0.35 - u * 2.35]; a.armR = [-0.25 * u, 0, 0.35 + u * 2.35];
    a.head = [-0.32 * u, 0, 0];
    lean = -0.14 * u; bob = u * 0.035;
  } else if (mode === 'look') {
    // 두리번두리번: 뒷짐을 지고 고개를 좌우로 천천히 돌려 둘러본다
    const y = Math.sin(t * 1.1 + phase);
    a.head = [Math.sin(t * 2.3 + phase) * 0.05, y * 0.85, -y * 0.06];
    a.armL = [0.35, 0, -0.18]; a.armR = [0.35, 0, 0.18];
  } else if (mode === 'sway') {
    // 흥얼흥얼: 몸을 좌우로 살랑살랑, 팔도 따라 흔든다
    const w = Math.sin(t * 2.8 + phase);
    a.armL = [0, 0, -0.35 - w * 0.25]; a.armR = [0, 0, 0.35 - w * 0.25];
    a.head = [-0.05, 0, w * 0.14];
    waddle = w * 0.13; bob = Math.abs(Math.cos(t * 2.8 + phase)) * 0.03;
  } else if (mode === 'hop') {
    // 제자리 깡충깡충: 팔을 아래로 벌리고 통통 뛴다
    const j = Math.abs(Math.sin(t * 6 + phase));
    a.armL = [0, 0, -0.55 - j * 0.35]; a.armR = [0, 0, 0.55 + j * 0.35];
    a.legL = [-0.35 * j, 0, 0]; a.legR = [-0.35 * j, 0, 0];
    a.head = [-0.1, 0, 0];
    bob = j * 0.22;
  } else if (mode === 'spin') {
    // 빙글빙글: 팔을 벌리고 제자리에서 돈다
    spin = (t * 5 + phase) % (Math.PI * 2);
    a.armL = [0, 0, -1.35]; a.armR = [0, 0, 1.35];
    a.head = [-0.12, 0, 0];
    bob = Math.abs(Math.sin(t * 10 + phase)) * 0.04;
  } else if (mode === 'sit') {
    // 털썩 앉기: 다리를 앞으로 뻗고 앉아 손은 무릎에, 가끔 고개를 돌린다
    a.legL = [-1.35, 0, 0.08]; a.legR = [-1.35, 0, -0.08];
    a.armL = [-0.55, 0, 0.12]; a.armR = [-0.55, 0, -0.12];
    a.head = [0.06 + Math.sin(t * 1.3 + phase) * 0.04, Math.sin(t * 0.6 + phase) * 0.35, 0];
    bob = -0.11;
  } else if (mode === 'think') {
    // 갸웃: 한 손을 턱에 대고 고개를 기울인다
    a.armR = [-1.45, 0, -0.5]; a.armL = [-0.55, 0, 0.45];
    a.head = [0.08 + Math.sin(t * 2 + phase) * 0.03, 0, 0.2];
  } else if (mode === 'shy') {
    // 부끄부끄: 두 손으로 얼굴을 가리고 몸을 배배 꼰다
    a.armL = [-1.5, 0, 0.55]; a.armR = [-1.5, 0, -0.55];
    a.head = [0.22, 0, Math.sin(t * 3 + phase) * 0.1];
    waddle = Math.sin(t * 3 + phase) * 0.08;
  } else if (mode === 'pose') {
    // 귀여운 척: 한 손은 볼에, 한 손은 허리에 대고 고개를 갸웃(가끔 톡 튄다)
    a.armL = [-1.3, 0, 0.6]; a.armR = [0, 0, 0.95];
    a.head = [-0.05, 0, 0.26];
    lean = 0.05; bob = Math.max(0, Math.sin(t * 3 + phase)) * 0.06;
  } else if (mode === 'gaze') {
    // 하늘 보기(별 구경): 고개를 들고 뒷짐을 진 채 천천히 둘러본다
    a.head = [-0.55, Math.sin(t * 0.5 + phase) * 0.3, 0];
    a.armL = [0.45, 0, -0.18]; a.armR = [0.45, 0, 0.18];
    lean = -0.06;
  } else if (mode === 'sob') {
    // 엉엉: 고개를 살짝 들고(얼굴이 보이게) 어깨를 들썩이며 운다, 두 팔은 옆에서 부들부들
    const sh = Math.abs(Math.sin(t * 13 + phase));
    a.armL = [0.12, 0, -0.32 + Math.sin(t * 21) * 0.06]; a.armR = [0.12, 0, 0.32 - Math.sin(t * 21) * 0.06];
    a.head = [-0.12 - sh * 0.05, 0, Math.sin(t * 2.6) * 0.06];
    bob = sh * 0.025;
  } else if (mode === 'idol' || mode === 'idolSing') {
    // 아이돌 춤(파자마 파티즈): 8박 안무를 박자(opts.beat — 곡 박 번호)에 맞춰. 오른손 위로 콕 · 왼손 위로 콕 · 두 팔 흔들기 · 머리 위 두 손 하트.
    // 박마다 통 튀었다 잦아든다. 'idolSing' 은 오른손을 입가에(노래하는 마이크 손)
    const b = opts.beat != null ? opts.beat : t * 2, k = ((b % 8) + 8) % 8, step = Math.floor(k / 2), kick = Math.pow(1 - (b - Math.floor(b)), 2), w = Math.sin(b * Math.PI);
    if (step === 0) { a.armR = [0, 0, 2.6]; a.armL = [0, 0, -0.5]; a.head = [-0.08, 0, -0.18]; waddle = 0.12; }
    else if (step === 1) { a.armL = [0, 0, -2.6]; a.armR = [0, 0, 0.5]; a.head = [-0.08, 0, 0.18]; waddle = -0.12; }
    else if (step === 2) { a.armL = [0, 0, -2.1 - w * 0.4]; a.armR = [0, 0, 2.1 - w * 0.4]; a.head = [-0.1, 0, w * 0.15]; waddle = w * 0.14; }
    else { a.armL = [-0.5, 0, -2.75]; a.armR = [-0.5, 0, 2.75]; a.head = [-0.12, 0, w * 0.08]; }
    if (mode === 'idolSing') a.armR = [-1.45, 0, -0.62];
    a.legL = [step % 2 ? 0 : -0.3 * kick, 0, 0]; a.legR = [step % 2 ? -0.3 * kick : 0, 0, 0];
    bob = kick * 0.1;
  } else if (mode === 'glow') {
    // 응원봉 흔들기(관객): 오른팔을 높이 들고 박(opts.beat)마다 좌우로, 고개도 박마다 끄덕
    const b = opts.beat != null ? opts.beat : t * 2, w = Math.sin(b * Math.PI), kick = Math.pow(1 - (b - Math.floor(b)), 2);
    a.armR = [-0.15, 0, 2.35 + w * 0.45]; a.armL = [-0.6, 0, -0.25];
    a.head = [0.06 + kick * 0.12, 0, w * 0.06];
    bob = kick * 0.05;
  } else if (mode === 'dj') {
    // DJ: 오른손은 탁자 위 도토리를 나뭇잎으로 끽끽 문지르고, 왼손은 박자(118)에 맞춰 위로 흔들고, 고개는 끄덕끄덕
    const b = Math.abs(Math.sin(t * 6.18));
    a.armR = [-1.15 + Math.sin(t * 12.4) * 0.22, 0, -0.35 + Math.sin(t * 12.4) * 0.3];
    a.armL = [0, 0, -2.2 + b * 0.5];
    a.head = [0.12 + b * 0.22, 0, Math.sin(t * 3.09) * 0.1];
    bob = b * 0.06;
    waddle = Math.sin(t * 3.09) * 0.08;
  } else if (mode === 'pray') {
    // 소원 빌기: 두 손을 가슴 앞에 꼭 모으고 고개를 숙인다(조금씩 끄덕)
    a.armL = [-1.25, 0, 0.62]; a.armR = [-1.25, 0, -0.62];
    a.head = [0.24 + Math.sin(t * 2.2 + phase) * 0.03, 0, 0];
    bob = Math.sin(t * 2.2 + phase) * 0.008;
  } else if (mode === 'snap') {
    // 사진 찍기(하치와레의 카메라): 두 손으로 카메라를 눈앞에 들고 살짝 숙여 들여다본다
    a.armL = [-1.35, 0, 0.5]; a.armR = [-1.35, 0, -0.5];
    a.head = [0.06, 0, 0];
  } else if (mode === 'hug') {
    // 카메라를 품에 꼭 안기(비에 젖지 않게): 두 팔을 가슴 앞에 모으고 웅크린 채 고개를 숙인다
    a.armL = [-0.95, 0, 0.55]; a.armR = [-0.95, 0, -0.55];
    a.head = [0.26, 0, Math.sin(t * 4 + phase) * 0.05];
    lean = 0.1; bob = -0.02;
  } else if (mode === 'peek') {
    // 우사기의 전설의 포즈(원작: 뒤돌아 다리를 벌리고 숙여 다리 사이로 내다보기). 둥근 몸에 맞게 거꾸로 서서
    // 다리를 V 자로 벌리고, 두 팔로 땅을 짚은 채 거꾸로 된 얼굴로 이쪽을 본다(등을 카메라 쪽으로 두면 얼굴이 카메라를 본다)
    a.legL = [0, 0, -0.75]; a.legR = [0, 0, 0.75];
    a.armL = [0, 0, -2.75]; a.armR = [0, 0, 2.75];
    a.head = [-0.2, 0, Math.sin(t * 5 + phase) * 0.08];
    lean = Math.PI - 0.22; bob = 1.12 + Math.sin(t * 5 + phase) * 0.02;
  } else if (mode === 'flail') {
    // 발광: 팔다리를 마구 휘두르며 들썩들썩(별똥별맨 따라 하기)
    a.armL = [-1 + Math.sin(t * 19 + phase) * 1.4, 0, -1.2 + Math.sin(t * 13 + phase) * 0.8];
    a.armR = [-1 + Math.cos(t * 17 + phase) * 1.4, 0, 1.2 + Math.sin(t * 11 + phase + 1) * 0.8];
    a.legL = [Math.sin(t * 18 + phase) * 0.7, 0, 0]; a.legR = [-Math.sin(t * 18 + phase) * 0.7, 0, 0];
    a.head = [Math.sin(t * 15 + phase) * 0.25, Math.sin(t * 9 + phase) * 0.5, Math.sin(t * 12 + phase) * 0.3];
    bob = Math.abs(Math.sin(t * 14 + phase)) * 0.22;
    waddle = Math.sin(t * 16 + phase) * 0.25;
    lean = Math.sin(t * 10 + phase) * 0.18;
  } else if (EAT_ANIMS.includes(mode)) {
    const e = eatPose(mode, t, opts);
    Object.assign(a, e.a);
    bob = e.bob || 0; lean = e.lean || 0; waddle = e.waddle || 0;
  } else {
    const br = Math.sin(t * 2 + phase) * 0.08;
    a.head = [Math.sin(t * 1.7 + phase) * 0.04, opts.look || 0, 0];
    a.armL = [0, 0, -0.1 - br]; a.armR = [0, 0, 0.1 + br];
  }
  // 손에 든 무기(내 캐릭터만): 평소에는 바깥 위로 비스듬히 든다(휘두를 때는 attackPose 가 손목까지 잡는다)
  a.weapon = mode === 'walk' ? [-0.75 + s * 0.12, 0.6, 0] : [-0.8, 0.6, 0];
  // peek(거꾸로 서기): 긴 귀가 땅에 묻히지 않게 양옆 위로 활짝 벌리고(몸을 뒤집으면 귀가 안쪽으로 모이므로 평소와 반대 방향),
  // 얼굴 쪽(카메라 쪽)으로 조금 숙여 머리 뒤에 가리지 않게 한다
  const ear = mode === 'walk' ? -0.25 - Math.abs(s) * 0.25 : mode === 'pull' ? -0.4 : mode === 'peek' ? 0.6 : -0.1;
  const spread = mode === 'peek' ? -(1.9 + Math.sin(t * 5 + phase) * 0.08) : 0.08;
  a.earL = [ear, 0, -spread]; a.earR = [ear, 0, spread];
  return { a, bob, lean, waddle, spin, push: 0, squash: 0 };
}

/** 자세를 모델에 입힌다. */
function applyPose(chibi, p) {
  for (const name in chibi.pivots) {
    const r = p.a[name] || ZERO;
    chibi.pivots[name].rotation.set(r[0], r[1], r[2], 'YXZ');
  }
  chibi.inner.position.set(0, p.bob, p.push);
  chibi.inner.rotation.set(p.lean, p.spin, p.waddle, 'YXZ');
  chibi.inner.scale.set(1 + p.squash * 0.5, 1 - p.squash, 1 + p.squash * 0.5); // 눌리면(+) 납작, 펴지면(-) 길쭉
}

const EASE = { out: (u) => 1 - (1 - u) * (1 - u), in: (u) => u * u, io: (u) => u * u * (3 - 2 * u) };
const mix = (r1 = ZERO, r2 = ZERO, u) => [r1[0] + (r2[0] - r1[0]) * u, r1[1] + (r2[1] - r1[1]) * u, r1[2] + (r2[2] - r1[2]) * u];
const JOINTS = ['armR', 'armL', 'weapon', 'head', 'legL', 'legR'], TRUNK = ['spin', 'lean', 'bob', 'push', 'squash'];

/**
 * 공격 몸짓의 열쇠 자세(k: 진행 0 → 1, e: 그 자세로 들어가는 빠르기 — out 빨리 들어가 천천히 · in 점점 빠르게 · io 부드럽게).
 * 팔이 짧고 몸이 둥글어서 팔만 크게 휘두르면 몸에 박힌다: 크게 휘두르는 건 몸 틀기(spin)와 손목(weapon)이 맡는다.
 * 맞는 때(main.js HIT_DELAY / SWING_TIME ≈ 0.41)와 궤적(0.3 ~ 0.8)에 맞춘다.
 */
const SLASH_KEYS = [
  { k: 0, e: 'io', armR: [-0.3, 0.2, 0.15], armL: [-0.2, 0, -0.15], weapon: [-0.5, 0.3, 0] },
  // 번쩍: 무기 쪽 어깨를 뒤로 틀며 무기를 머리 옆으로 높이 치켜들고(뒤에서 봐도 칼날이 머리 위로 보이게), 반대 팔은 앞으로 겨눈다. 살짝 젖히며 앞발을 든다
  { k: 0.28, e: 'out', armR: [-2.5, 0.9, 0.5], armL: [-1.1, 0, -0.35], weapon: [0.85, -0.2, 0], head: [-0.1, -0.35, 0], legL: [-0.4, 0, 0], legR: [0.15, 0, 0], spin: 0.55, lean: -0.1, bob: 0.03, push: -0.04, squash: -0.05 },
  // 베는 순간: 몸을 반대로 틀며 앞발을 디디고 숙인다. 칼끝이 앞을 지나고 몸이 꾹 눌린다
  { k: 0.43, e: 'in', armR: [-1.1, -0.15, 0.1], armL: [0.45, 0, -0.45], weapon: [0.95, -0.45, 0], head: [0.16, 0.15, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], spin: -0.25, lean: 0.22, bob: -0.03, push: 0.1, squash: 0.08 },
  // 끝까지 베어 반대쪽 아래로
  { k: 0.6, e: 'out', armR: [-0.9, -0.3, 0.05], armL: [0.4, 0, -0.5], weapon: [0.65, -1.25, 0], head: [0.1, 0.3, 0], legL: [-0.45, 0, 0], legR: [0.35, 0, 0], spin: -0.6, lean: 0.18, bob: -0.02, push: 0.09, squash: 0.03 },
  { k: 0.78, e: 'io', armR: [-0.65, -0.2, 0.08], armL: [0.2, 0, -0.35], weapon: [0.55, -0.75, 0], head: [0.05, 0.25, 0], legL: [-0.3, 0, 0], legR: [0.25, 0, 0], spin: -0.45, lean: 0.1, push: 0.05 }
];
// 찌르기(사스마타): 웅크리며 두 손으로 자루를 뒤로 당겼다가, 앞발을 크게 디디며 몸째 쭉 내찌른다. 창끝은 수평 그대로
const THRUST_KEYS = [
  { k: 0, e: 'io', armR: [-0.2, 0, -0.1], armL: [-0.5, 0, 0.25], weapon: [-0.5, 0.4, 0] },
  { k: 0.3, e: 'out', armR: [-0.25, 0.1, -0.12], armL: [-0.75, 0.25, 0.35], head: [0.05, -0.2, 0], legL: [-0.2, 0, 0], legR: [0.2, 0, 0], spin: 0.3, lean: -0.08, bob: -0.03, push: -0.14, squash: 0.06 },
  { k: 0.48, e: 'in', armR: [-0.4, -0.05, -0.12], armL: [-0.3, -0.2, 0.3], head: [0.1, 0.1, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], spin: -0.15, lean: 0.24, bob: 0.01, push: 0.34, squash: -0.06 },
  { k: 0.7, e: 'out', armR: [-0.3, 0, -0.12], armL: [-0.35, -0.1, 0.3], head: [0.05, 0.05, 0], legL: [-0.45, 0, 0], legR: [0.35, 0, 0], spin: -0.1, lean: 0.15, push: 0.22 }
];

/** 열쇠 자세 사이를 이어 k 때의 자세를 구한다(마지막 열쇠 뒤는 그대로). */
function sampleKeys(keys, k) {
  let i = 0;
  while (i < keys.length - 2 && k > keys[i + 1].k) i++;
  const A = keys[i], B = keys[i + 1], u = EASE[B.e](Math.max(0, Math.min(1, (k - A.k) / (B.k - A.k))));
  const out = {};
  for (const j of JOINTS) out[j] = mix(A[j], B[j], u);
  for (const c of TRUNK) out[c] = (A[c] || 0) + ((B[c] || 0) - (A[c] || 0)) * u;
  return out;
}

/**
 * 휘두르기 · 찌르기: 서 있기(걷는 중이면 걷기) 자세 위에 공격 열쇠 자세를 얹는다.
 * 시작은 바로 끼어들고 끝(0.78 ~)은 원래 자세로 부드럽게 돌아온다. 걸으면서 휘두르면 다리는 계속 걷고 몸통 · 팔이 휘두른다.
 */
function attackPose(mode, t, opts) {
  const k = opts.swing || 0, moving = !!opts.moving;
  const base = basePose(moving ? 'walk' : 'idle', t, opts);
  const key = sampleKeys(mode === 'thrust' ? THRUST_KEYS : SLASH_KEYS, k);
  const w = k < 0.08 ? EASE.io(k / 0.08) : k > 0.78 ? EASE.io((1 - k) / 0.22) : 1;
  const legW = moving ? w * 0.25 : w, bodyW = moving ? w * 0.6 : w;
  const a = { ...base.a };
  for (const j of ['armR', 'armL', 'weapon', 'head']) a[j] = mix(base.a[j], key[j], w);
  for (const j of ['legL', 'legR']) { const r = mix(base.a[j], key[j], legW); a[j] = [r[0], r[1] - key.spin * w, r[2]]; } // 몸을 틀어도 발끝은 앞으로
  return {
    a,
    spin: base.spin + key.spin * w,
    lean: base.lean + (key.lean - base.lean) * w,
    waddle: base.waddle * (1 - w),
    bob: base.bob * (1 - bodyW) + key.bob * bodyW,
    push: key.push * bodyW,
    squash: key.squash * w
  };
}
