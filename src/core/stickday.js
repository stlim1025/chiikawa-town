import { dateOf } from './calendar.js';
import { registerItems, addItem } from './inventory.js';
import { hourOf } from './clock.js';

/**
 * 막대 과자 데이(게임 오리지널): 해마다 11월 10 ~ 12일 사흘 동안 마을 축제. 11일이 막대 과자 데이이고 앞뒤로 하루씩 더 연다.
 * (실제 기념일 과자는 상품 이름이 상표라 게임에서는 '막대 과자'라고 부른다)
 *  - 사흘 동안 라멘 로우에서 막대 과자를 팔고(core/shop.js 의 fest), 광장이 꾸며진다(world/festival.js).
 *  - 친구(STICK_FRIENDS)는 축제 동안 처음 말을 걸면 막대 과자를 하나 건넨다(축제마다 한 번).
 *  - 축제 동안 막대 과자는 누구에게 줘도 좋아하는 선물이다(core/gifts.js).
 *  - 11일 저녁(STICK_FEST.hours)에 광장으로 가면 다 같이 막대 과자 파티(stories/stickday.js, 보상은 core/events.js).
 * 기록: state.story.stick = { y: 그해 달력 연도, news: 축제 소식을 띄웠는지, got: [막대 과자를 건넨 친구], party: 파티를 한 날(0 = 아직) }.
 * 해가 바뀌면 새 기록으로 센다.
 */
export const STICK_SNACK = 'sticksnack';
registerItems({ [STICK_SNACK]: { name: '막대 과자', kind: 'food', eat: 15, note: '가늘고 긴 과자 막대에 초콜릿을 입혔다. 막대 과자 데이에 서로 나눠 먹는다. 먹으면 기운이 15 찬다.' } });

export const STICK_FEST = { month: 11, days: [10, 11, 12], party: 11, hours: [18, 21] };
/** 축제 동안 막대 과자를 건네는 친구. */
export const STICK_FRIENDS = ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'rakko', 'momonga'];

/** 그날(기본은 오늘)이 축제인지 → { year, date: 며칠, party: 파티 날(11일)인지 } | null. */
export function stickFestOf(state, day = state && state.clock ? state.clock.day : 1) {
  if (!state || !state.startDate) return null;
  const d = dateOf(state.startDate, day);
  if (d.m !== STICK_FEST.month || !STICK_FEST.days.includes(d.d)) return null;
  return { year: d.y, date: d.d, party: d.d === STICK_FEST.party };
}
export const isStickFest = (state, day) => !!stickFestOf(state, day);

/** 그해 축제 기록(해가 바뀌었거나 없으면 새 기록). */
export function stickOf(state, year) {
  const s = ((state && state.story) || {}).stick;
  return s && s.y === year ? { ...s, got: Array.isArray(s.got) ? s.got : [] } : { y: year, news: false, got: [], party: 0 };
}
const withStick = (state, rec) => ({ ...state, story: { ...(state.story || {}), stick: rec } });

/** 축제 소식(아침 알림)을 띄울 때인지: 그해 축제에서 한 번. */
export function stickNewsDue(state) {
  const f = stickFestOf(state);
  return !!f && !stickOf(state, f.year).news;
}
export function markStickNews(state) {
  const f = stickFestOf(state);
  return f ? withStick(state, { ...stickOf(state, f.year), news: true }) : state;
}

/** 그 친구가 막대 과자를 건넬 차례인지(축제 동안 친구마다 한 번). */
export function stickGiftDue(state, kind) {
  const f = stickFestOf(state);
  return !!f && STICK_FRIENDS.includes(kind) && !stickOf(state, f.year).got.includes(kind);
}
/** 친구가 건넨 막대 과자를 받는다 → { ok, state, reason?: 'none'(차례가 아님) | 'bag'(가방이 꽉 찼다 — 다음에 다시 준다) }. */
export function takeStickGift(state, kind) {
  if (!stickGiftDue(state, kind)) return { ok: false, reason: 'none', state };
  const a = addItem(state, STICK_SNACK, 1);
  if (!a.added) return { ok: false, reason: 'bag', state };
  const f = stickFestOf(state), rec = stickOf(state, f.year);
  return { ok: true, state: withStick(a.state, { ...rec, got: [...rec.got, kind] }) };
}

/** 광장 파티를 열 때인지: 파티 날(11일) 저녁(STICK_FEST.hours), 그해 아직 안 했을 때. hour 를 안 주면 지금 시각. */
export function stickPartyDue(state, hour = hourOf(state.clock)) {
  const f = stickFestOf(state);
  return !!f && f.party && hour >= STICK_FEST.hours[0] && hour < STICK_FEST.hours[1] && !stickOf(state, f.year).party;
}
/** 파티를 했다고 적는다(보상은 core/events.js 의 finishStickParty). */
export function markStickParty(state) {
  const f = stickFestOf(state);
  return f ? withStick(state, { ...stickOf(state, f.year), party: state.clock.day }) : state;
}
