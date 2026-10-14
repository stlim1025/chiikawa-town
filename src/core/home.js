import { trySpend } from './state.js';
import { housingOf } from './housing.js';

/**
 * 집 크기(게임 오리지널): 처음 방에서, 집을 산 뒤 부동산에서 한 단계씩 넓힌다. 바닥 칸(가로 cols × 세로 rows)이 늘어
 * 가구를 더 놓을 수 있다(가구 하나가 한 칸). roomR: 둥근 방 반지름. home.size: 이 목록의 번호(예전 저장에는 없다 = 0).
 */
export const HOME_SIZES = [
  { name: '처음 방', cols: 5, rows: 4, price: 0, roomR: 4.4 },
  { name: '넓은 방', cols: 6, rows: 5, price: 15000, roomR: 5.2 },
  { name: '큰 방', cols: 7, rows: 6, price: 30000, roomR: 6.0 }
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

/** 살 수 있는 가구. price 는 원. */
export const FURNITURE = {
  bed: { id: 'bed', name: '폭신 침대', price: 300 },
  table: { id: 'table', name: '동그란 탁자', price: 120 },
  cushion: { id: 'cushion', name: '분홍 방석', price: 50 },
  rug: { id: 'rug', name: '동그란 러그', price: 90 },
  plant: { id: 'plant', name: '화분', price: 80 },
  lamp: { id: 'lamp', name: '스탠드', price: 140 },
  shelf: { id: 'shelf', name: '책장', price: 180 },
  stove: { id: 'stove', name: '작은 난로', price: 260 },
  doll: { id: 'doll', name: '먼작귀 인형', price: 220 },
  djbooth: { id: 'djbooth', name: '도토리 DJ 부스', price: 0, gift: true }, // 사이드스토리 '우사기의 집' 선물(가게에서는 안 판다)
  photo: { id: 'photo', name: '흔들린 사진 액자', price: 0, gift: true } // 사이드스토리 '하치와레의 카메라' 선물: 그날 찍은 사진(world/photoframe.js)
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
