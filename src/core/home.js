import { trySpend } from './state.js';

/** 집 안 바닥 칸(가로 cols × 세로 rows). 가구 하나가 한 칸을 차지한다. */
export const HOME_GRID = { cols: 5, rows: 4 };

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
  doll: { id: 'doll', name: '먼작귀 인형', price: 220 }
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
  if (cx < 0 || cz < 0 || cx >= HOME_GRID.cols || cz >= HOME_GRID.rows) return { ok: false, reason: 'outside', home };
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
  if (to.cx < 0 || to.cz < 0 || to.cx >= HOME_GRID.cols || to.cz >= HOME_GRID.rows) return { ok: false, reason: 'outside', home };
  if (at(home, to.cx, to.cz) >= 0) return { ok: false, reason: 'taken', home };
  return { ok: true, home: { ...home, placed: home.placed.map((p, k) => (k === i ? { ...p, cx: to.cx, cz: to.cz } : p)) } };
}

/** 저장된 집 모양이 맞는지(save.js 검사에서 쓴다). */
export function isValidHome(h) {
  if (!h || typeof h !== 'object' || !h.owned || typeof h.owned !== 'object' || !Array.isArray(h.placed)) return false;
  if (Object.entries(h.owned).some(([id, n]) => !FURNITURE[id] || typeof n !== 'number' || n < 0)) return false;
  return h.placed.every((p) => p && FURNITURE[p.id] && Number.isInteger(p.cx) && Number.isInteger(p.cz) && [0, 1, 2, 3].includes(p.rot));
}
