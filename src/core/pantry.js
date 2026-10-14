import { itemInfo } from './inventory.js';
import { sellPrice } from './market.js';
import { FRIENDS } from './friends.js';
import { tasteOf } from './gifts.js';

/**
 * 친구들의 가방(NPC 인벤토리): 내가 준 선물 · 토벌 전리품 · 다른 친구에게 받은 물건이 들어간다.
 * 친구들은 가방의 물건을 스스로 쓴다(main 의 마을 살림):
 *  배가 고프면 먹을 것을 꺼내 먹고(라멘값을 아낀다), 싫어하는 물건은 내가 없을 때 몰래 바닥에 버리고(내가 주울 수 있다),
 *  다른 친구가 좋아하는 물건은 수다 끝에 나눠 주고, 필요 없는 것(전리품 · 풀)은 노동 접수에서 팔고, 친한 나에게 답례로 준다.
 * state.pantry = { 친구 kind: { 물건 id: 개수 } }. 한 물건은 PANTRY_STACK 개까지.
 */
export const PANTRY_STACK = 9;
/** 이만큼 배고프면(기운이 이보다 적으면) 가방의 먹을 것을 꺼내 먹는다. */
export const SNACK_ENERGY = 55;

export const pantryOf = (state, kind) => (state.pantry && state.pantry[kind]) || {};
const setPantry = (state, kind, items) => ({ ...state, pantry: { ...(state.pantry || {}), [kind]: items } });

/** 가방에 넣는다(한 물건 PANTRY_STACK 개까지). → { state, added } */
export function addToPantry(state, kind, id, n = 1) {
  const p = pantryOf(state, kind), have = p[id] || 0, added = Math.max(0, Math.min(n, PANTRY_STACK - have));
  if (!added || !FRIENDS[kind]) return { state, added: 0 };
  return { state: setPantry(state, kind, { ...p, [id]: have + added }), added };
}
/** 가방에서 꺼낸다. → { state, taken } */
export function takeFromPantry(state, kind, id, n = 1) {
  const p = pantryOf(state, kind), have = p[id] || 0, taken = Math.min(n, have);
  if (!taken) return { state, taken: 0 };
  const items = { ...p };
  if (have - taken > 0) items[id] = have - taken; else delete items[id];
  return { state: setPantry(state, kind, items), taken };
}

/** 싫어하는데 받아 둔 물건(착한 친구가 나중에 몰래 버린다). → id | null */
export function hatedOf(state, kind) {
  return Object.keys(pantryOf(state, kind)).find((id) => tasteOf(kind, id) === 'hate') || null;
}

/** 배고플 때 꺼내 먹을 것: 기운이 가장 많이 차는 것(좋아하는 것은 아껴 두고 다른 것부터, 싫어하는 것은 안 먹는다). → id | null */
export function snackOf(state, kind) {
  const foods = Object.keys(pantryOf(state, kind)).filter((id) => (itemInfo(id) || {}).eat > 0 && tasteOf(kind, id) !== 'hate');
  if (!foods.length) return null;
  const rank = (id) => (tasteOf(kind, id) === 'love' ? 1000 : 0) - itemInfo(id).eat;
  return foods.sort((a, b) => rank(a) - rank(b))[0];
}

/** 나눠 줄 것: 내(from)가 좋아하지 않는데 to 는 좋아하는 물건. → id | null */
export function shareOf(state, from, to) {
  return Object.keys(pantryOf(state, from)).find((id) => tasteOf(from, id) !== 'love' && tasteOf(to, id) === 'love') || null;
}

/** 팔 것: 좋아하지 않는 전리품 · 풀 · 낚은 물고기(먹을 것과 좋아하는 것은 둔다). → [{ id, n, price }] */
export function sellablesOf(state, kind) {
  return Object.entries(pantryOf(state, kind)).filter(([id]) => {
    const info = itemInfo(id);
    return info && (info.kind === 'drop' || info.kind === 'herb' || info.kind === 'fish') && tasteOf(kind, id) !== 'love' && sellPrice(id) > 0;
  }).map(([id, n]) => ({ id, n, price: sellPrice(id) }));
}
/** 팔 것을 모두 판다(값은 earned 로 돌려준다 — 친구 지갑에 넣는 건 main). → { state, earned, sold } */
export function sellPantry(state, kind) {
  let s = state, earned = 0, sold = 0;
  for (const { id, n, price } of sellablesOf(state, kind)) { s = takeFromPantry(s, kind, id, n).state; earned += n * price; sold += n; }
  return { state: s, earned, sold };
}

/** 나에게 답례로 줄 것: 좋아하지도 싫어하지도 않는 물건 중 값이 가장 나가는 것(먹을 것도 — 내가 준 싫은 걸 되돌려주지는 않는다). → id | null */
export function thanksOf(state, kind) {
  const ids = Object.keys(pantryOf(state, kind)).filter((id) => tasteOf(kind, id) === 'ok' && itemInfo(id));
  return ids.sort((a, b) => sellPrice(b) - sellPrice(a))[0] || null;
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** 저장된 친구 가방 모양 검사(save.js). 모르는 물건이 있어도 숫자만 맞으면 받아 준다. */
export function isValidPantry(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  return Object.entries(p).every(([kind, items]) => FRIENDS[kind] && items && typeof items === 'object' && !Array.isArray(items)
    && Object.values(items).every((n) => num(n) && n >= 0));
}
