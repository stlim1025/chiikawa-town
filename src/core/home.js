import { trySpend } from './state.js';
import { housingOf } from './housing.js';

/**
 * 집 크기(게임 오리지널): 처음 방에서, 집을 산 뒤 부동산에서 한 단계씩 넓힌다. 바닥 칸(가로 cols × 세로 rows)이 늘어
 * 가구를 더 놓을 수 있다(가구 하나가 한 칸). roomR: 둥근 방 반지름. home.size: 이 목록의 번호(예전 저장에는 없다 = 0).
 * price: 내가 부동산에서 넓히는 값(집값 50,000원 다음의 큰 목표 — 넓은 방은 집값만큼, 큰 방은 그 두 배).
 * friendPrice: 마을 친구가 돈을 모아 자기 집을 넓히는 값(하루 수백 원을 버는 친구 살림에 맞춰 예전 값 그대로 — core/goals.js).
 */
export const HOME_SIZES = [
  { name: '처음 방', cols: 5, rows: 4, price: 0, friendPrice: 0, roomR: 4.4 },
  { name: '넓은 방', cols: 6, rows: 5, price: 50000, friendPrice: 15000, roomR: 5.2 },
  { name: '큰 방', cols: 7, rows: 6, price: 100000, friendPrice: 30000, roomR: 6.0 }
];
/** 집의 크기 번호 · 칸. */
export const sizeOf = (home) => (home && Number.isInteger(home.size) && HOME_SIZES[home.size] ? home.size : 0);
export const gridOf = (home) => HOME_SIZES[sizeOf(home)];
/** 다음으로 넓힐 크기(이미 가장 크면 null). */
export const nextSize = (home) => HOME_SIZES[sizeOf(home) + 1] || null;
const inside = (home, cx, cz) => { const g = gridOf(home); return cx >= 0 && cz >= 0 && cx < g.cols && cz < g.rows; };

/** 칸 한 변(m). */
export const HOME_CELL = 1.1;
/**
 * 그 크기의 방 배치(집 안 장면 world/interior.js 가 그린다): 처음 방을 S 배로 늘린다. X0 · Z0: 칸 격자의 왼쪽 안쪽 모서리,
 * DOOR 문간(나가기) · WARDROBE 옷장(왼쪽 벽) · CHEST 보관 상자(옷장 맞은편 벽).
 */
export function roomLayout(size = 0) {
  const { cols, rows, roomR: R } = HOME_SIZES[size], S = R / HOME_SIZES[0].roomR;
  return { size, cols, rows, R, S, X0: -(cols * HOME_CELL) / 2, Z0: -2.9 * S, DOOR: { x: 0, z: 2.9 * S }, WARDROBE: { x: -3.2 * S, z: -1.0 * S }, CHEST: { x: 3.25 * S, z: -0.9 * S } };
}
/**
 * 방 모양(집 안 장면 world/interior.js 의 벽 · 걷는 곳, 게임 오리지널): 처음 방은 둥근 돔 방 { kind: 'round', R },
 * 넓힌 방부터는 네모난 집 { kind: 'rect', hx(좌우 벽까지), z0(뒤 벽), z1(앞 문간), fancy }. 넓은 방은 평범한 집, 큰 방은 화려한 집(fancy).
 * 옷장 · 보관 상자는 좌우 벽에 붙고, 칸 격자와 문간은 늘 방 안에 든다.
 */
export function roomShape(size = 0) {
  const r = roomLayout(size);
  if (!size) return { kind: 'round', R: r.R };
  return { kind: 'rect', hx: Math.max(Math.abs(r.WARDROBE.x), Math.abs(r.CHEST.x)) + 0.42, z0: r.Z0 - 0.75, z1: r.DOOR.z + 0.35, fancy: size >= 2 };
}
/** 그 크기 방의 칸 (cx, cz) 바닥 가운데. */
export function homeCellCenter(size, cx, cz) {
  const r = roomLayout(size);
  return { x: r.X0 + (cx + 0.5) * HOME_CELL, z: r.Z0 + (cz + 0.5) * HOME_CELL };
}

/** 집을 한 단계 넓힌다(내 집이어야). { ok, state, reason: 'own'(빌린 집) | 'max'(가장 큼) | 'money' } */
export function expandHome(state) {
  if (!housingOf(state).own) return { ok: false, reason: 'own', state };
  const home = homeOf(state), next = nextSize(home);
  if (!next) return { ok: false, reason: 'max', state };
  const paid = trySpend(state, next.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: { ...paid.state, home: { ...home, size: sizeOf(home) + 1 } } };
}

/** 벽지 · 바닥(게임 오리지널, 가구점에서 산다): 한 번 사면 언제든 바꿔 붙인다. 값이 0 인 처음 것은 늘 가진 것. */
export const WALLPAPERS = {
  cream: { name: '크림 벽지', color: '#fbfaf5', price: 0 },
  pink: { name: '벚꽃 벽지', color: '#ffe1ea', price: 800 },
  sky: { name: '하늘 벽지', color: '#dceefa', price: 800 },
  mint: { name: '민트 벽지', color: '#ddf3e4', price: 800 },
  lemon: { name: '레몬 벽지', color: '#fff2bf', price: 800 },
  lavender: { name: '라벤더 벽지', color: '#ebe2fb', price: 800 }
};
export const FLOORS = {
  wood: { name: '나무 마루', color: '#e2c29b', price: 0 },
  dark: { name: '진한 마루', color: '#b98b62', price: 800 },
  tile: { name: '하얀 타일', color: '#eceff1', price: 800 },
  pink: { name: '분홍 카펫', color: '#f6c6d2', price: 800 },
  grass: { name: '풀빛 카펫', color: '#bfe3a8', price: 800 }
};
const DECOR = { wall: WALLPAPERS, floor: FLOORS };
const OWNED = { wall: 'walls', floor: 'floors' };
/** 지금 붙인 벽지 · 바닥 { wall, floor }. */
export function decorOf(home) {
  return { wall: home && Object.hasOwn(WALLPAPERS, home.wall || '') ? home.wall : 'cream', floor: home && Object.hasOwn(FLOORS, home.floor || '') ? home.floor : 'wood' };
}
/** 가진 벽지 · 바닥인지(처음 것은 늘 가졌다). kind: 'wall' | 'floor'. */
export const hasDecor = (home, kind, id) => DECOR[kind][id].price === 0 || ((home && home[OWNED[kind]]) || []).includes(id);
/** 벽지 · 바닥을 붙인다(안 가졌으면 사서). { ok, state, bought, reason: 'none' | 'money' } */
export function useDecor(state, kind, id) {
  const T = DECOR[kind];
  if (!T || !Object.hasOwn(T, id)) return { ok: false, reason: 'none', state };
  const home = homeOf(state);
  if (hasDecor(home, kind, id)) return { ok: true, bought: false, state: { ...state, home: { ...home, [kind]: id } } };
  const paid = trySpend(state, T[id].price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  const key = OWNED[kind];
  return { ok: true, bought: true, state: { ...paid.state, home: { ...home, [kind]: id, [key]: [...(home[key] || []), id] } } };
}

/** 가구점 분류(이 차례로 보인다). 가구마다 cat 이 이 중 하나. */
export const FURNITURE_CATS = [
  { id: 'rest', name: '침대와 소파' },
  { id: 'table', name: '탁자와 의자' },
  { id: 'store', name: '수납' },
  { id: 'light', name: '조명' },
  { id: 'kitchen', name: '부엌' },
  { id: 'plant', name: '식물' },
  { id: 'floor', name: '깔개와 방석' },
  { id: 'deco', name: '장식' }
];

/**
 * 살 수 있는 가구. price 는 원, cat 은 가구점 분류(FURNITURE_CATS). 하나가 한 칸이고, 같은 가구를 여러 개 살 수 있다.
 * 처음 아홉 가지(침대 ~ 인형) 다음은 게임 오리지널로 늘린 가구: 값을 100원 ~ 15,000원으로 넓게 두어 집을 넓힌 뒤에도 채울 것이 있게 했다.
 */
export const FURNITURE = {
  bed: { id: 'bed', name: '폭신 침대', price: 300, cat: 'rest' },
  table: { id: 'table', name: '동그란 탁자', price: 120, cat: 'table' },
  cushion: { id: 'cushion', name: '분홍 방석', price: 50, cat: 'floor' },
  rug: { id: 'rug', name: '동그란 러그', price: 90, cat: 'floor' },
  plant: { id: 'plant', name: '화분', price: 80, cat: 'plant' },
  lamp: { id: 'lamp', name: '스탠드', price: 140, cat: 'light' },
  shelf: { id: 'shelf', name: '책장', price: 180, cat: 'store' },
  stove: { id: 'stove', name: '작은 난로', price: 260, cat: 'kitchen' },
  doll: { id: 'doll', name: '먼작귀 인형', price: 220, cat: 'deco' },
  // 침대와 소파
  futon: { id: 'futon', name: '이불 깔개', price: 500, cat: 'rest' },
  sofa: { id: 'sofa', name: '분홍 소파', price: 1200, cat: 'rest' },
  hammock: { id: 'hammock', name: '노란 해먹', price: 2200, cat: 'rest' },
  bunkbed: { id: 'bunkbed', name: '이층 침대', price: 3500, cat: 'rest' },
  starbed: { id: 'starbed', name: '별밤 침대', price: 9000, cat: 'rest' },
  // 탁자와 의자
  stool: { id: 'stool', name: '동그란 걸상', price: 100, cat: 'table' },
  chair: { id: 'chair', name: '나무 의자', price: 150, cat: 'table' },
  lowtable: { id: 'lowtable', name: '좌식 탁자', price: 400, cat: 'table' },
  desk: { id: 'desk', name: '공부 책상', price: 900, cat: 'table' },
  teatable: { id: 'teatable', name: '찻상과 찻주전자', price: 1500, cat: 'table' },
  // 수납
  chest: { id: 'chest', name: '서랍장', price: 600, cat: 'store' },
  toybox: { id: 'toybox', name: '장난감 상자', price: 700, cat: 'store' },
  bookcase: { id: 'bookcase', name: '키 큰 책장', price: 1800, cat: 'store' },
  cabinet: { id: 'cabinet', name: '반짝이 진열장', price: 4000, cat: 'store' },
  // 조명
  candle: { id: 'candle', name: '촛대', price: 250, cat: 'light' },
  paperlamp: { id: 'paperlamp', name: '동그란 종이 등', price: 600, cat: 'light' },
  shroomlamp: { id: 'shroomlamp', name: '버섯 조명', price: 1200, cat: 'light' },
  starlamp: { id: 'starlamp', name: '별 무드등', price: 2500, cat: 'light' },
  // 부엌
  ramenpot: { id: 'ramenpot', name: '라멘 냄비 선반', price: 800, cat: 'kitchen' },
  sink: { id: 'sink', name: '개수대', price: 1500, cat: 'kitchen' },
  fridge: { id: 'fridge', name: '냉장고', price: 2000, cat: 'kitchen' },
  oven: { id: 'oven', name: '벽돌 오븐', price: 3000, cat: 'kitchen' },
  // 식물
  cactus: { id: 'cactus', name: '꼬마 선인장', price: 120, cat: 'plant' },
  sunflower: { id: 'sunflower', name: '해바라기 화분', price: 300, cat: 'plant' },
  bonsai: { id: 'bonsai', name: '분재', price: 2000, cat: 'plant' },
  tree: { id: 'tree', name: '방 안 열매나무', price: 5000, cat: 'plant' },
  // 깔개와 방석
  squarerug: { id: 'squarerug', name: '네모 러그', price: 250, cat: 'floor' },
  beanbag: { id: 'beanbag', name: '말랑 빈백', price: 900, cat: 'floor' },
  // 장식
  radio: { id: 'radio', name: '빨간 라디오', price: 450, cat: 'deco' },
  easel: { id: 'easel', name: '그림 이젤', price: 700, cat: 'deco' },
  globe: { id: 'globe', name: '지구본', price: 1100, cat: 'deco' },
  clock: { id: 'clock', name: '괘종시계', price: 2800, cat: 'deco' },
  fishtank: { id: 'fishtank', name: '어항', price: 3500, cat: 'deco' },
  trophy: { id: 'trophy', name: '황금 토벌 트로피', price: 6000, cat: 'deco' },
  piano: { id: 'piano', name: '작은 피아노', price: 8000, cat: 'deco' },
  fountain: { id: 'fountain', name: '실내 분수', price: 15000, cat: 'deco' },
  // 선물로만 받는 가구(가게에서는 안 판다)
  djbooth: { id: 'djbooth', name: '도토리 DJ 부스', price: 0, gift: true, cat: 'deco' }, // 사이드스토리 '우사기의 집' 선물
  photo: { id: 'photo', name: '흔들린 사진 액자', price: 0, gift: true, cat: 'deco' } // 사이드스토리 '하치와레의 카메라' 선물: 그날 찍은 사진(world/photoframe.js)
};

/** 새 집: 침대 하나가 안쪽 가운데에 놓여 있다. */
export function createHome() {
  return { owned: { bed: 1 }, placed: [{ id: 'bed', cx: 2, cz: 0, rot: 0 }] };
}

/** 상태의 집(예전 저장에는 없으니 새 집으로). */
export function homeOf(state) {
  return state.home || createHome();
}

/** 가지고 있지만 아직 놓지 않은 개수. */
export function spare(home, id) {
  return (home.owned[id] || 0) - home.placed.filter((p) => p.id === id).length;
}

/** 가구를 산다. { ok, state, reason: 'money' } */
export function buyFurniture(state, id) {
  const item = FURNITURE[id];
  const paid = trySpend(state, item.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  const home = homeOf(state);
  return { ok: true, state: { ...paid.state, home: { ...home, owned: { ...home.owned, [id]: (home.owned[id] || 0) + 1 } } } };
}

const at = (home, cx, cz) => home.placed.findIndex((p) => p.cx === cx && p.cz === cz);

/** 빈 칸에 가구를 놓는다. { ok, home, reason: 'none'(남은 게 없음) | 'taken'(이미 놓임) | 'outside'(방 밖) } */
export function placeFurniture(home, id, cx, cz) {
  if (!inside(home, cx, cz)) return { ok: false, reason: 'outside', home };
  if (spare(home, id) <= 0) return { ok: false, reason: 'none', home };
  if (at(home, cx, cz) >= 0) return { ok: false, reason: 'taken', home };
  return { ok: true, home: { ...home, placed: [...home.placed, { id, cx, cz, rot: 0 }] } };
}

/** 그 칸의 가구를 넣어 둔다(다시 놓을 수 있게 남는다). */
export function removeFurniture(home, cx, cz) {
  const i = at(home, cx, cz);
  if (i < 0) return home;
  return { ...home, placed: home.placed.filter((_, k) => k !== i) };
}

/** 그 칸의 가구를 90도 돌린다. */
export function rotateFurniture(home, cx, cz) {
  const i = at(home, cx, cz);
  if (i < 0) return home;
  return { ...home, placed: home.placed.map((p, k) => (k === i ? { ...p, rot: (p.rot + 1) % 4 } : p)) };
}

/**
 * 놓인 가구를 끌어서 다른 빈 칸으로 옮긴다(돌린 방향은 그대로).
 * { ok, home, reason: 'none'(그 칸에 가구가 없음) | 'same'(제자리) | 'outside'(방 밖) | 'taken'(이미 놓임) }
 */
export function moveFurniture(home, from, to) {
  const i = at(home, from.cx, from.cz);
  if (i < 0) return { ok: false, reason: 'none', home };
  if (from.cx === to.cx && from.cz === to.cz) return { ok: false, reason: 'same', home };
  if (!inside(home, to.cx, to.cz)) return { ok: false, reason: 'outside', home };
  if (at(home, to.cx, to.cz) >= 0) return { ok: false, reason: 'taken', home };
  return { ok: true, home: { ...home, placed: home.placed.map((p, k) => (k === i ? { ...p, cx: to.cx, cz: to.cz } : p)) } };
}

/** 저장된 집 모양이 맞는지(save.js 검사에서 쓴다). */
export function isValidHome(h) {
  if (!h || typeof h !== 'object' || !h.owned || typeof h.owned !== 'object' || !Array.isArray(h.placed)) return false;
  if (Object.entries(h.owned).some(([id, n]) => !FURNITURE[id] || typeof n !== 'number' || n < 0)) return false;
  // 집 크기 · 벽지 · 바닥(예전 저장에는 없다)
  if (h.size !== undefined && !(Number.isInteger(h.size) && h.size >= 0 && h.size < HOME_SIZES.length)) return false;
  if (h.wall !== undefined && !Object.hasOwn(WALLPAPERS, h.wall)) return false;
  if (h.floor !== undefined && !Object.hasOwn(FLOORS, h.floor)) return false;
  if (h.walls !== undefined && !(Array.isArray(h.walls) && h.walls.every((id) => Object.hasOwn(WALLPAPERS, id)))) return false;
  if (h.floors !== undefined && !(Array.isArray(h.floors) && h.floors.every((id) => Object.hasOwn(FLOORS, id)))) return false;
  return h.placed.every((p) => p && FURNITURE[p.id] && Number.isInteger(p.cx) && Number.isInteger(p.cz) && [0, 1, 2, 3].includes(p.rot));
}
