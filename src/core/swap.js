import { FRIENDS } from './friends.js';
import { HUNTER_PROFILES } from './hunters.js';
import { bodySwapped } from './quests.js';
import { villagerOf } from './villagers.js';
import { pantryOf, takeFromPantry } from './pantry.js';
import { bagOf, addItem, isValidBag } from './inventory.js';
import { josa } from './weeding.js';

/**
 * 사이드스토리 '몸이 바뀌었다'(원작 애니 202 ~ 210화 「슬롯」): 낡은 게임센터의 슬롯을 돌렸다가 넷의 속(마음)이 바뀐다.
 * 속 → 몸: 치이카와는 우사기 몸, 하치와레는 치이카와 몸(원작 그대로), 우사기는 내 몸, 나는 하치와레 몸(나를 넣느라 게임에서 정함).
 * 마을의 친구는 속대로 움직이고 말하지만(대사 · 일 · 버릇), 생김새와 이름표는 몸을 따른다.
 * 바뀐 동안 하치와레 동굴이 내 집이고(거기서 잔다), 내 집은 우사기(내 몸)가 사는 친구 집처럼 들어간다(잠 · 상자 · 꾸미기는 못 한다).
 * 지갑 · 가방도 몸을 따른다: 나는 하치와레 몸이 들고 있던 것을, 내 것은 내 몸(우사기)이 든다. 돌아오면 정산한다(wearSwapWallet · settleSwapWallet).
 * 친구들끼리는 서로를 몸의 이름으로 부른다(bodyNames).
 */
export const SWAP_QUEST = 'bodySwap';
/** 속(친구 종류) → 몸('me' 는 내 몸). */
export const SWAP_BODY = { chiikawa: 'usagi', hachiware: 'chiikawa', usagi: 'me' };
/** 내 속이 든 몸. */
export const MY_BODY = 'hachiware';
/** 슬롯을 돌려 바뀐 단계(이 단계부터 되돌리는 장면을 끝낼 때까지 바뀐 채). */
export const SWAP_FROM = 1;

/** 지금 몸이 바뀐 채인지. */
export function isSwapped(state) {
  return !!state && bodySwapped(state); // 슬롯을 돌린 단계(SWAP_FROM)부터 되돌릴 때까지 — core/quests.js
}

/** 그 친구(속)가 든 몸: 친구 종류, 내 몸이면 'me', 바뀌지 않았으면 그대로. */
export function bodyOf(kind, swapped) {
  return swapped && SWAP_BODY[kind] ? SWAP_BODY[kind] : kind;
}

// 이름표를 몸대로 바꿀 때 원래 값을 기억해 둔다(되돌릴 때 그대로)
let saved = null;
/**
 * 이름표를 몸대로(on) 또는 원래대로. 대화 상자 이름 · 알림 · 친구 앱이 FRIENDS / HUNTER_PROFILES 의 이름을 읽어서,
 * 바뀐 동안만 그 값을 몸의 것으로 바꿔 둔다. me: 내 이름표({ name, tag, ink } — 우사기가 든 내 몸).
 */
export function swapNames(on, me) {
  if (on && !saved) {
    saved = {};
    for (const kind of Object.keys(SWAP_BODY)) {
      saved[kind] = { name: FRIENDS[kind].name, tag: FRIENDS[kind].tag, ink: FRIENDS[kind].ink, hunter: HUNTER_PROFILES[kind] && HUNTER_PROFILES[kind].name };
    }
    for (const [kind, body] of Object.entries(SWAP_BODY)) {
      const look = body === 'me' ? me : saved[body];
      Object.assign(FRIENDS[kind], { name: look.name, tag: look.tag, ink: look.ink });
      if (HUNTER_PROFILES[kind]) HUNTER_PROFILES[kind].name = look.name;
    }
  } else if (!on && saved) {
    for (const [kind, s] of Object.entries(saved)) {
      Object.assign(FRIENDS[kind], { name: s.name, tag: s.tag, ink: s.ink });
      if (HUNTER_PROFILES[kind]) HUNTER_PROFILES[kind].name = s.hunter;
    }
    saved = null;
  }
}
/** 내 속이 든 몸(하치와레)의 이름표: 바뀌기 전 하치와레 값. */
export function myBodyTag() {
  const h = saved ? saved.hachiware : FRIENDS.hachiware;
  return { name: h.name, tag: h.tag, ink: h.ink };
}

/**
 * 몸이 바뀌는 순간 지갑 · 가방: 나는 하치와레 몸이 들고 있던 지갑 · 가방(친구 가방)을 그대로 들고, 내 지갑 · 가방은 내 몸(우사기가 든)이 든다.
 * state.swapWallet = { mine: { money, bag }(내 몸 — 우사기가 라멘값을 여기서 낸다), start: { money, items }(받아 든 하치와레 몸의 것 — 돌아올 때 견준다)
 * 하치와레(속)의 진짜 지갑 · 가방은 건드리지 않는다(친구 살림은 그대로 굴러가고, 돌아올 때 달라진 만큼만 정산한다).
 */
export function wearSwapWallet(state, day) {
  if (state.swapWallet) return state;
  const money = villagerOf(state, MY_BODY, day).money, items = { ...pantryOf(state, MY_BODY) };
  return { ...state, swapWallet: { mine: { money: state.money, bag: bagOf(state) }, start: { money, items } }, money, bag: { items: { ...items }, clean: {} } };
}
/**
 * 몸이 돌아오는 순간 정산: 내 지갑 · 가방을 되찾고, 하치와레 몸으로 번 돈 · 늘어난 물건은 하치와레가 돌려준다. 하치와레 지갑에서 쓴 돈은
 * 내 지갑에서 갚고(모자라면 있는 만큼), 하치와레 가방에서 꺼내 쓴 물건은 하치와레 가방에서 빠진다.
 * → { state, money: 늘어난 돈(− 면 갚은 돈), items: { 물건 id: 받은 개수 } }
 */
export function settleSwapWallet(state) {
  const w = state.swapWallet;
  if (!w) return { state, money: 0, items: {} };
  const cur = bagOf(state), money = state.money - w.start.money;
  let s = { ...state, money: Math.max(0, w.mine.money + money), bag: w.mine.bag };
  delete s.swapWallet;
  const items = {};
  for (const id of new Set([...Object.keys(cur.items), ...Object.keys(w.start.items)])) {
    const d = (cur.items[id] || 0) - (w.start.items[id] || 0);
    if (d > 0) { const r = addItem(s, id, d, Math.min(d, cur.clean[id] || 0)); s = r.state; if (r.added) items[id] = r.added; }
    else if (d < 0) s = takeFromPantry(s, MY_BODY, id, -d).state;
  }
  return { state: s, money, items };
}
/** 내 몸(바뀐 동안은 우사기가 든)의 지갑에 든 돈. */
export const myBodyMoney = (state) => (state.swapWallet ? state.swapWallet.mine.money : state.money);
/** 내 몸의 지갑에서 낸다(모자라면 못 낸다): 바뀐 동안 우사기가 내 돈으로 라멘을 사 먹을 때. → { ok, state } */
export function spendMyBody(state, amount) {
  if (myBodyMoney(state) < amount) return { ok: false, state };
  const w = state.swapWallet;
  if (!w) return { ok: true, state: { ...state, money: state.money - amount } };
  return { ok: true, state: { ...state, swapWallet: { ...w, mine: { ...w.mine, money: w.mine.money - amount } } } };
}
const num = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
/** 저장 검사: 바뀐 동안의 지갑 · 가방. */
export function isValidSwapWallet(w) {
  return !!w && typeof w === 'object' && !!w.mine && num(w.mine.money) && isValidBag(w.mine.bag)
    && !!w.start && num(w.start.money) && !!w.start.items && typeof w.start.items === 'object' && Object.values(w.start.items).every(num);
}

// 대사 속 이름 뒤 조사(원래 이름은 모두 받침 없이 끝난다) → 바꾼 이름에 맞게 다시 붙일 짝
const PARTICLE = { 랑: '이랑/랑', 는: '은/는', 가: '이/가', 를: '을/를', 와: '과/와', 야: '아/야' };
/**
 * 바뀐 동안 친구들끼리 하는 말(말풍선 · 마을 소식): 대사에 적힌 속의 이름(치이카와 · 하치와레 · 우사기)을 그 친구가 든 몸의 이름표로 바꿔 부른다.
 * 한꺼번에 바꿔 바꾼 이름이 다시 바뀌지 않고, 뒤에 붙은 조사도 받침에 맞게 고친다. 바뀌지 않았으면 그대로.
 */
export function bodyNames(text) {
  if (!saved || typeof text !== 'string') return text;
  const map = new Map(Object.keys(SWAP_BODY).map((k) => [saved[k].name, FRIENDS[k].name]));
  const re = new RegExp(`(${[...map.keys()].join('|')})(${Object.keys(PARTICLE).join('|')})?`, 'g');
  return text.replace(re, (_, name, p) => (p ? josa(map.get(name), PARTICLE[p]) : map.get(name)));
}
