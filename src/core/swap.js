import { FRIENDS } from './friends.js';
import { HUNTER_PROFILES } from './hunters.js';
import { questState } from './quests.js';

/**
 * 사이드스토리 '몸이 바뀌었다'(원작 애니 202 ~ 210화 「슬롯」): 낡은 게임센터의 슬롯을 돌렸다가 넷의 속(마음)이 바뀐다.
 * 속 → 몸: 치이카와는 우사기 몸, 하치와레는 치이카와 몸(원작 그대로), 우사기는 내 몸, 나는 하치와레 몸(나를 넣느라 게임에서 정함).
 * 마을의 친구는 속대로 움직이고 말하지만(대사 · 일 · 버릇), 생김새와 이름표는 몸을 따른다.
 * 바뀐 동안 하치와레 동굴이 내 집이고(거기서 잔다), 내 집은 우사기(내 몸)가 사는 친구 집처럼 들어간다(잠 · 상자 · 꾸미기는 못 한다).
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
  const q = state && questState(state, SWAP_QUEST);
  return !!q && !q.done && q.step >= SWAP_FROM;
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
