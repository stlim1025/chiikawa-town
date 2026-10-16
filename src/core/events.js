import { housingOf } from './housing.js';
import { FRIENDS, friendOf, hearts } from './friends.js';
import { homeOf, FURNITURE } from './home.js';
import { bond } from './quests.js';
import { addItem, itemInfo } from './inventory.js';
import { STICK_SNACK, markStickParty } from './stickday.js';

/**
 * 마을 이벤트(게임 오리지널)의 조건과 보상. 장면은 stories/housewarm.js · stories/stickday.js.
 *
 * 집들이: 처음 내 집을 사면(청약 당첨도) 산 날을 적어 두고(story.houseDay), 그다음 날부터 저녁(HOUSEWARM_HOURS)에 집 앞으로 가면
 * 친구들이 선물을 들고 온다. 한 번만(story.housewarm = 한 날). 예전 저장에서 이미 집을 가진 사람은 main 이 처음 본 날을 산 날로 적는다.
 * 손님: 하치와레 · 치이카와는 늘, 나머지는 하트 1개부터. 손님마다 가구 하나(HOUSEWARM_GIFTS)와 친밀도 HOUSEWARM_BOND.
 *
 * 막대 과자 파티(core/stickday.js 의 11월 11일 저녁): 온 친구마다 친밀도 STICK_PARTY_BOND, 막대 과자 한 상자(STICK_PARTY_BOX 개).
 */
export const HOUSEWARM_HOURS = [18, 21];
/** 손님마다 들고 오는 집들이 선물(가구점 가구). */
export const HOUSEWARM_GIFTS = { hachiware: 'radio', chiikawa: 'sunflower', usagi: 'beanbag', kurimanju: 'ramenpot', rakko: 'futon', momonga: 'cactus' };
/** 하트가 없어도 오는 손님(처음부터 친한 둘). */
export const HOUSEWARM_ALWAYS = ['hachiware', 'chiikawa'];
export const HOUSEWARM_BOND = 2;
export const STICK_PARTY_BOND = 1, STICK_PARTY_BOX = 3;

/** 내 집을 산 날을 적는다(처음 산 날 그대로, 집들이를 이미 했으면 그대로). */
export function noteHouseBought(state, day) {
  const st = state.story || {};
  if (st.houseDay != null || st.housewarm) return state;
  return { ...state, story: { ...st, houseDay: day } };
}
/** 집들이를 열 때인지: 내 집이고, 산 다음 날부터, 저녁(HOUSEWARM_HOURS), 아직 안 했을 때. */
export function housewarmDue(state, hour) {
  const st = state.story || {};
  return !!housingOf(state).own && st.houseDay != null && !st.housewarm && state.clock.day > st.houseDay
    && hour >= HOUSEWARM_HOURS[0] && hour < HOUSEWARM_HOURS[1];
}
/** 집들이에 오는 친구(HOUSEWARM_GIFTS 순서). */
export function housewarmGuests(state) {
  return Object.keys(HOUSEWARM_GIFTS).filter((k) => HOUSEWARM_ALWAYS.includes(k) || hearts(friendOf(state, k)) >= 1);
}

/** 꼬리표(보상 카드용, core/quests.js 의 giveReward 와 같은 모양). */
const bondPart = (k, n) => ({ kind: 'bond', id: k, n, text: `${FRIENDS[k].name} +${n}`, long: `${FRIENDS[k].name} 친밀도 +${n}` });
function bondAll(state, kinds, n) {
  let s = state;
  const parts = [], gifts = [];
  for (const k of kinds) {
    const b = bond(s, k, n);
    s = b.state;
    if (b.gift) gifts.push(b.gift);
    parts.push(bondPart(k, n));
  }
  return { state: s, parts, gifts };
}

/** 집들이를 마친다: 온 친구(kinds)마다 선물 가구와 친밀도. → { state, parts, gifts(하트 3개 선물 가구) } */
export function finishHousewarm(state, kinds) {
  let s = state;
  const parts = [];
  for (const k of kinds) {
    const id = HOUSEWARM_GIFTS[k];
    if (!id) continue;
    const home = homeOf(s);
    s = { ...s, home: { ...home, owned: { ...home.owned, [id]: (home.owned[id] || 0) + 1 } } };
    parts.push({ kind: 'furniture', id, text: FURNITURE[id].name, long: `${FURNITURE[id].name}(가구)` });
  }
  const b = bondAll(s, kinds.filter((k) => HOUSEWARM_GIFTS[k]), HOUSEWARM_BOND);
  s = { ...b.state, story: { ...(b.state.story || {}), housewarm: state.clock.day } };
  return { state: s, parts: [...parts, ...b.parts], gifts: b.gifts };
}

/** 광장 막대 과자 파티를 마친다: 온 친구(kinds)마다 친밀도, 막대 과자 한 상자, 그해 파티를 했다고 적는다. → { state, parts, gifts } */
export function finishStickParty(state, kinds) {
  const b = bondAll(state, kinds.filter((k) => FRIENDS[k]), STICK_PARTY_BOND);
  let s = b.state;
  const a = addItem(s, STICK_SNACK, STICK_PARTY_BOX);
  const parts = [...b.parts];
  if (a.added) { s = a.state; parts.unshift({ kind: 'item', id: STICK_SNACK, n: STICK_PARTY_BOX, text: `${itemInfo(STICK_SNACK).name} ×${STICK_PARTY_BOX}` }); }
  return { state: markStickParty(s), parts, gifts: b.gifts };
}
