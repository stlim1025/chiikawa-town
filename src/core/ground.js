import { bagOf, takeItem, addItem, itemInfo, MAX_STACK } from './inventory.js';
import { WEAPONS, weaponOf } from './combat.js';

/**
 * 바닥에 떨어뜨린 물건(동물의 숲처럼 주머니에서 버리면 발밑에 떨어지고, 다시 주울 수 있다).
 * state.ground = [{ g: 번호, id, n, clean, weapon?: true, x, z }]. 마을 밖이든 안이든 그 자리에 남는다(저장된다).
 */
export const MAX_GROUND = 40;

export const groundOf = (state) => state.ground || [];
const nextG = (list) => list.reduce((m, e) => Math.max(m, e.g), 0) + 1;

/** 가방의 물건을 n 개 떨어뜨린다(깔끔한 수도 같이). → { ok, state, reason: 'none' | 'full' } */
export function dropItem(state, id, n, x, z) {
  const list = groundOf(state);
  if (list.length >= MAX_GROUND) return { ok: false, reason: 'full', state };
  const t = takeItem(state, id, n);
  if (!t.taken) return { ok: false, reason: 'none', state };
  return { ok: true, state: { ...t.state, ground: [...list, { g: nextG(list), id, n: t.taken, clean: t.clean, x, z }] }, n: t.taken };
}
/** 내 가방과 상관없이 물건을 바닥에 놓는다(친구가 싫어하는 선물을 버릴 때). 바닥이 꽉 찼으면 가장 오래된 것부터 치운다. */
export function placeItem(state, id, n, x, z) {
  const list = groundOf(state).slice(-(MAX_GROUND - 1));
  return { ...state, ground: [...list, { g: nextG(groundOf(state)), id, n, clean: 0, x, z }] };
}
/** 가진 무기를 떨어뜨린다(들고 있었으면 빈손이 된다). */
export function dropWeapon(state, id, x, z) {
  const list = groundOf(state), w = weaponOf(state);
  if (list.length >= MAX_GROUND) return { ok: false, reason: 'full', state };
  if (!w.owned.includes(id)) return { ok: false, reason: 'none', state };
  const weapon = { owned: w.owned.filter((o) => o !== id), held: w.held === id ? null : w.held };
  return { ok: true, state: { ...state, weapon, ground: [...list, { g: nextG(list), id, n: 1, clean: 0, weapon: true, x, z }] }, n: 1 };
}
/**
 * 떨어진 물건을 줍는다. 가방 칸이 모자라면 들어가는 만큼만 줍고 나머지는 그대로 둔다.
 * → { ok, state, n: 주운 수, left: 남은 수, reason: 'gone' | 'full' | 'owned' }
 */
export function pickUp(state, g) {
  const list = groundOf(state), e = list.find((o) => o.g === g);
  if (!e) return { ok: false, reason: 'gone', state, n: 0, left: 0 };
  if (e.weapon) {
    const w = weaponOf(state);
    const rest = list.filter((o) => o !== e);
    if (w.owned.includes(e.id)) return { ok: true, state: { ...state, money: state.money + Math.round(WEAPONS[e.id].price / 4), ground: rest }, n: 1, left: 0, refund: Math.round(WEAPONS[e.id].price / 4) };
    return { ok: true, state: { ...state, weapon: { owned: [...w.owned, e.id], held: w.held || e.id }, ground: rest }, n: 1, left: 0 };
  }
  const a = addItem(state, e.id, e.n, e.clean);
  if (!a.added) return { ok: false, reason: 'full', state, n: 0, left: e.n };
  const left = e.n - a.added;
  const ground = left > 0 ? list.map((o) => (o === e ? { ...o, n: left, clean: Math.max(0, o.clean - a.added) } : o)) : list.filter((o) => o !== e);
  return { ok: true, state: { ...a.state, ground }, n: a.added, left };
}
/** 떨어진 물건 이름(무기 포함). */
export const groundName = (e) => (e.weapon ? WEAPONS[e.id].name : (itemInfo(e.id) || { name: e.id }).name);
/** 가방이 꽉 찼는지(그 물건 한 칸이 99개). */
export const stackFull = (state, id) => (bagOf(state).items[id] || 0) >= MAX_STACK;

const num = (v) => typeof v === 'number' && Number.isFinite(v);
export function isValidGround(list) {
  return Array.isArray(list) && list.length <= MAX_GROUND * 2 && list.every((e) => e && num(e.g) && typeof e.id === 'string' && num(e.n) && e.n > 0 && num(e.x) && num(e.z) && (e.weapon ? !!WEAPONS[e.id] : true));
}
