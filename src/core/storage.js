import { takeItem, addItem, itemInfo, isValidBag } from './inventory.js';

/**
 * 집 보관 상자(두 번째 주머니): 집 안 상자에 물건을 넣어 두었다가 꺼낸다. 모양은 가방과 같다.
 * state.storage = { items: { id: 개수 }, clean: { id: 그중 깔끔한 수 } }. 한 가지에 STORE_STACK 개까지(주머니는 99).
 * 넣을 때는 덜 깔끔한 것부터(깔끔한 풀은 일감용으로 주머니에 남긴다), 꺼낼 때는 깔끔한 것부터.
 * 퀘스트 물건은 넣지 않는다(이야기는 주머니에 있는지 본다). 무기는 주머니에서 들고 다닌다.
 * 같이 놀기: 손님은 친구 집 상자를 열 수 없다(world/interior.js 의 target 이 손님에게 상자를 열게 하지 않는다).
 */
export const STORE_STACK = 999;

export const storageOf = (state) => state.storage || { items: {}, clean: {} };
export const storedOf = (state, id) => storageOf(state).items[id] || 0;

/** 상자에 넣을 수 있는 물건인지(퀘스트 물건 · 모르는 물건은 안 된다). */
export function canStore(id) {
  const info = itemInfo(id);
  return !!info && info.kind !== 'quest';
}

/** 주머니 → 상자 n 개. → { ok, state, moved, reason?: 'quest' | 'full' | 'none' } */
export function storeItem(state, id, n = 1) {
  if (!canStore(id)) return { ok: false, reason: 'quest', state, moved: 0 };
  const s = storageOf(state), have = s.items[id] || 0, room = STORE_STACK - have;
  if (room <= 0) return { ok: false, reason: 'full', state, moved: 0 };
  const t = takeItem(state, id, Math.min(Math.max(0, Math.floor(n)), room), false);
  if (!t.taken) return { ok: false, reason: 'none', state, moved: 0 };
  const clean = { ...s.clean };
  if (t.clean) clean[id] = (clean[id] || 0) + t.clean;
  return { ok: true, state: { ...t.state, storage: { items: { ...s.items, [id]: have + t.taken }, clean } }, moved: t.taken };
}

/** 상자 → 주머니 n 개(주머니가 한 가지 99개까지라 들어가는 만큼만). → { ok, state, moved, reason?: 'bag' | 'none' } */
export function takeOut(state, id, n = 1) {
  const s = storageOf(state), have = s.items[id] || 0, want = Math.min(Math.max(0, Math.floor(n)), have);
  if (!want) return { ok: false, reason: 'none', state, moved: 0 };
  const cleanHave = s.clean[id] || 0, a = addItem(state, id, want, Math.min(want, cleanHave));
  if (!a.added) return { ok: false, reason: 'bag', state, moved: 0 };
  const c = Math.min(a.added, cleanHave), items = { ...s.items }, clean = { ...s.clean };
  if (have - a.added > 0) items[id] = have - a.added; else delete items[id];
  if (cleanHave - c > 0) clean[id] = cleanHave - c; else delete clean[id];
  return { ok: true, state: { ...a.state, storage: { items, clean } }, moved: a.added };
}

/** 저장된 상자 모양이 맞는지(save.js). 가방과 같다. */
export const isValidStorage = (s) => isValidBag(s);
