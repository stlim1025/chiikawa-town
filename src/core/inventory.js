import { WEED_KINDS } from './weeding.js';
import { JOB_TYPES } from './jobs.js';

/**
 * 가방: 일감 없이 뽑은 풀 · 딴 열매를 모아 두었다가 일감을 받으면 게시판에서 바로 낸다. 열매는 먹으면 기운이 조금 찬다.
 * state.bag = { items: { id: 개수 }, clean: { id: 그중 깔끔하게 뽑은 수 } }. 한 칸에 MAX_STACK 개까지.
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
  if (W) return { name: W.name, kind: 'herb', note: `${W.where}에서 뽑은 풀. ${W.grade}급부터 뽑을 수 있다.` };
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
    state: { ...state, bag: { items: { ...b.items, [id]: have + added }, clean: { ...b.clean, [id]: (b.clean[id] || 0) + c } } },
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
  return { state: { ...state, bag: { items, clean: cl } }, taken, clean };
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
  return !!b && ok(b.items) && ok(b.clean);
}
