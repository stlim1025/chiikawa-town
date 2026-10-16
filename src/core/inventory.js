import { WEED_KINDS } from './weeding.js';
import { JOB_TYPES } from './jobs.js';

/**
 * 가방: 일감 없이 뽑은 풀 · 딴 열매를 모아 두었다가 일감을 받으면 게시판에서 바로 낸다. 열매는 먹으면 기운이 조금 찬다.
 * state.bag = { items: { id: 개수 }, clean: { id: 그중 깔끔하게 뽑은 수 }, cm?: { id: [낚은 물고기 크기, 작은 것부터] } }. 한 칸에 MAX_STACK 개까지.
 * id: 풀 종류(core/weeding.js), 'berry', (4단계부터) 몬스터 전리품, (5단계부터) 퀘스트 물건.
 */
export const MAX_STACK = 99;
export const ITEMS = {
  berry: { name: '빨간 열매', kind: 'food', note: '새콤달콤한 열매. 먹으면 기운이 6 찬다.', eat: 6 }
};
/** 물건 정보 { name, kind: 'herb' | 'food' | 'drop' | 'quest', note, eat? } (모르는 id 는 null). */
export function itemInfo(id) {
  if (ITEMS[id]) return ITEMS[id];
  const W = WEED_KINDS[id];
  if (W) return { name: W.name, kind: 'herb', note: `${W.where}에서 뽑은 풀. ${W.grade >= 6 ? '자격 없이도' : `${W.grade}급부터`} 뽑을 수 있다.` };
  return null;
}
/** 4단계 · 5단계에서 물건을 늘린다. */
export function registerItems(map) { Object.assign(ITEMS, map); }

export const bagOf = (state) => state.bag || { items: {}, clean: {} };
export const countOf = (state, id) => bagOf(state).items[id] || 0;

/** 가방에 넣는다. 꽉 찼으면 들어간 만큼만. → { state, added } */
export function addItem(state, id, n = 1, clean = 0) {
  const b = bagOf(state), have = b.items[id] || 0, added = Math.max(0, Math.min(n, MAX_STACK - have));
  if (!added) return { state, added: 0 };
  const c = Math.min(added, clean);
  return {
    state: { ...state, bag: { ...b, items: { ...b.items, [id]: have + added }, clean: { ...b.clean, [id]: (b.clean[id] || 0) + c } } },
    added
  };
}
/**
 * 가방에서 뺀다(일감에 낼 때는 깔끔한 것부터). cleanFirst = false 면 덜 깔끔한 것부터(팔기 · 선물: 깔끔한 풀은 일감 보너스용으로 남긴다).
 * → { state, taken, clean }
 */
export function takeItem(state, id, n = 1, cleanFirst = true) {
  const b = bagOf(state), have = b.items[id] || 0, taken = Math.min(n, have);
  if (!taken) return { state, taken: 0, clean: 0 };
  const cleanHave = b.clean[id] || 0, clean = cleanFirst ? Math.min(taken, cleanHave) : Math.max(0, taken - (have - cleanHave));
  const items = { ...b.items }, cl = { ...b.clean };
  if (have - taken > 0) items[id] = have - taken; else delete items[id];
  if (cleanHave - clean > 0) cl[id] = cleanHave - clean; else delete cl[id];
  const bag = { ...b, items, clean: cl };
  if (b.cm && b.cm[id]) bag.cm = withSizes(b, id, sizesIn(bag, id)).cm; // 크기를 아는 물고기는 작은 것부터 빠진다(파는 것만 큰 것부터: core/market.js)
  return { state: { ...state, bag }, taken, clean };
}
/**
 * 낚은 물고기 크기(cm): 가방 · 상자의 cm[id] 에 작은 것부터 적는다. 크기를 모르는 것(예전에 낚은 것 · 받은 것)은 적지 않는다.
 * 개수보다 많이 적혀 있으면 큰 것만 남긴다(다른 데 쓸 때는 작은 것부터 빠진다). → 작은 것부터 크기 목록(새 배열)
 */
export function sizesIn(pouch, id) {
  const list = (pouch.cm && pouch.cm[id]) || [], n = pouch.items[id] || 0;
  return list.slice(Math.max(0, list.length - n));
}
/** 그 물건의 크기 목록을 바꾼 주머니(작은 것부터 정리, 비면 지운다). */
export function withSizes(pouch, id, sizes) {
  const cm = { ...(pouch.cm || {}) };
  if (sizes.length) cm[id] = [...sizes].sort((a, b) => a - b); else delete cm[id];
  return { ...pouch, cm };
}
/** 먹는다(먹을 것만). → { ok, state, gain } */
export function eatItem(state, id, maxStamina = 100) {
  const info = itemInfo(id);
  if (!info || !info.eat || countOf(state, id) <= 0) return { ok: false, state, gain: 0 };
  if (state.stamina >= maxStamina) return { ok: false, reason: 'full', state, gain: 0 };
  const t = takeItem(state, id, 1).state, gain = Math.min(info.eat, maxStamina - state.stamina);
  return { ok: true, state: { ...t, stamina: state.stamina + gain }, gain };
}
/** 지금 일감에 가방의 같은 물건을 낸다(모자란 만큼만, 깔끔한 것부터). → { state, moved } */
export function submitToJob(state) {
  if (!state.job) return { state, moved: 0 };
  const T = JOB_TYPES[state.job.typeId], need = T.target - state.job.count;
  if (need <= 0 || countOf(state, T.kind) <= 0) return { state, moved: 0 };
  const t = takeItem(state, T.kind, need);
  return { state: { ...t.state, job: { ...state.job, count: state.job.count + t.taken, clean: state.job.clean + t.clean } }, moved: t.taken };
}
/** 저장된 가방 모양이 맞는지(save.js). 모르는 물건이 있어도 숫자만 맞으면 받아 준다(단계가 늘며 물건이 늘어난다). */
export function isValidBag(b) {
  const ok = (o) => o && typeof o === 'object' && !Array.isArray(o) && Object.values(o).every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0);
  const okCm = (o) => o && typeof o === 'object' && !Array.isArray(o) && Object.values(o).every((a) => Array.isArray(a) && a.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0));
  return !!b && ok(b.items) && ok(b.clean) && (b.cm === undefined || okCm(b.cm));
}
