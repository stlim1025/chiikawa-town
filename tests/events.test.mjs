import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/core/state.js';
import { dateOf } from '../src/core/calendar.js';
import { itemInfo, countOf } from '../src/core/inventory.js';
import { FURNITURE, homeOf } from '../src/core/home.js';
import { friendOf, ptsForHearts } from '../src/core/friends.js';
import { isValidState } from '../src/core/save.js';
import { giftPoints, tasteOf } from '../src/core/gifts.js';
import { buy, SHOPS } from '../src/core/shop.js';
import { eatStyle } from '../src/core/eating.js';
import {
  STICK_SNACK, STICK_FEST, STICK_FRIENDS, stickFestOf, isStickFest, stickOf, stickNewsDue, markStickNews,
  stickGiftDue, takeStickGift, stickPartyDue
} from '../src/core/stickday.js';
import {
  HOUSEWARM_GIFTS, HOUSEWARM_ALWAYS, HOUSEWARM_HOURS, HOUSEWARM_BOND, noteHouseBought, housewarmDue, housewarmGuests, finishHousewarm,
  STICK_PARTY_BOND, STICK_PARTY_BOX, finishStickParty
} from '../src/core/events.js';

const base = () => ({ ...createState({ name: '나', look: {} }), tutorial: 'done' });
const onDay = (s, day, hour = 12) => ({ ...s, clock: { day, t: (hour - 6) / 24 } });
// 새 게임은 10월 1일에 시작한다: 41일째 11월 10일, 42일째 11월 11일, 43일째 11월 12일
const FEST = [41, 42, 43];

test('막대 과자 데이: 11월 10 ~ 12일 사흘, 파티는 11일', () => {
  const s = base();
  for (const d of FEST) assert.ok(isStickFest(s, d), `${d}일째`);
  assert.equal(isStickFest(s, 40), false);
  assert.equal(isStickFest(s, 44), false);
  assert.deepEqual(FEST.map((d) => dateOf(s.startDate, d).d), STICK_FEST.days);
  assert.equal(stickFestOf(s, 42).party, true);
  assert.equal(stickFestOf(s, 41).party, false);
  // 해마다: 다음 해 11월 11일
  const next = Array.from({ length: 400 }, (_, i) => 44 + i).find((d) => { const x = dateOf(s.startDate, d); return x.m === 11 && x.d === 11; });
  assert.ok(stickFestOf(s, next).party);
  assert.equal(stickFestOf(s, next).year, stickFestOf(s, 42).year + 1);
});

test('막대 과자: 먹을 것(기운 +15), 축제 동안만 라멘 로우에서 판다', () => {
  const info = itemInfo(STICK_SNACK);
  assert.equal(info.kind, 'food');
  assert.equal(info.eat, 15);
  assert.ok(eatStyle(STICK_SNACK), '먹는 몸짓');
  const item = SHOPS.ramen.items.find((i) => i.item === STICK_SNACK);
  assert.ok(item && item.price > 0);
  const rich = { ...base(), money: 1000 };
  assert.equal(buy(onDay(rich, 40), 'ramen', item.id).ok, false, '축제 전날은 안 판다');
  for (const d of FEST) {
    const r = buy(onDay(rich, d), 'ramen', item.id);
    assert.ok(r.ok, `${d}일째에 판다`);
    assert.equal(countOf(r.state, STICK_SNACK), 1);
  }
  assert.equal(buy(onDay(rich, 44), 'ramen', item.id).ok, false, '축제가 끝나면 안 판다');
});

test('축제 소식은 해마다 한 번', () => {
  let s = onDay(base(), 41);
  assert.ok(stickNewsDue(s));
  s = markStickNews(s);
  assert.equal(stickNewsDue(s), false);
  assert.equal(stickNewsDue(onDay(s, 42)), false, '같은 해 사흘 동안은 한 번');
  assert.equal(stickNewsDue(onDay(s, 30)), false, '축제가 아닌 날');
});

test('친구는 축제 동안 한 번 막대 과자를 건넨다', () => {
  let s = onDay(base(), 41);
  for (const k of STICK_FRIENDS) assert.ok(stickGiftDue(s, k), k);
  assert.equal(stickGiftDue(s, 'pochette'), false, '건네는 친구만');
  const r = takeStickGift(s, 'hachiware');
  assert.ok(r.ok);
  s = r.state;
  assert.equal(countOf(s, STICK_SNACK), 1);
  assert.equal(stickGiftDue(s, 'hachiware'), false);
  assert.equal(stickGiftDue(onDay(s, 43), 'hachiware'), false, '다음 날에도 다시 주지 않는다');
  assert.ok(stickGiftDue(onDay(s, 43), 'chiikawa'));
  assert.equal(stickGiftDue(onDay(s, 44), 'chiikawa'), false, '축제가 끝나면 없다');
  assert.ok(isValidState(s));
});

test('축제 동안 막대 과자 선물은 누구에게나 좋아하는 선물', () => {
  const day = (d) => onDay(base(), d);
  assert.equal(tasteOf('rakko', STICK_SNACK, day(42)), 'love');
  assert.ok(giftPoints('rakko', STICK_SNACK, day(42)) > giftPoints('rakko', STICK_SNACK, day(30)));
  assert.equal(tasteOf('rakko', STICK_SNACK, day(30)), 'ok', '축제가 아닌 날은 보통');
});

test('광장 파티: 11월 11일 저녁 6 ~ 9시, 해마다 한 번', () => {
  const s = base();
  const [from, to] = STICK_FEST.hours;
  assert.equal(stickPartyDue(onDay(s, 42), from - 1), false);
  assert.ok(stickPartyDue(onDay(s, 42), from));
  assert.equal(stickPartyDue(onDay(s, 42), to), false);
  assert.equal(stickPartyDue(onDay(s, 41), from + 1), false, '10일은 파티가 없다');
  const r = finishStickParty(onDay(s, 42, from + 1), ['chiikawa', 'hachiware']);
  assert.equal(stickPartyDue(onDay(r.state, 42), from + 1), false);
  assert.equal(countOf(r.state, STICK_SNACK), STICK_PARTY_BOX);
  assert.equal(friendOf(r.state, 'chiikawa').pts, STICK_PARTY_BOND);
  assert.equal(friendOf(r.state, 'usagi').pts, 0, '오지 않은 친구는 그대로');
  assert.ok(r.parts.length > 0);
  assert.ok(stickOf(r.state, stickFestOf(r.state).year).party);
});

test('집들이: 선물 가구가 모두 가게 가구이고, 산 다음 날 저녁부터 한 번', () => {
  for (const [k, id] of Object.entries(HOUSEWARM_GIFTS)) assert.ok(FURNITURE[id] && !FURNITURE[id].gift, `${k}: ${id}`);
  let s = onDay(base(), 10, 19);
  assert.equal(housewarmDue(s, 19), false, '빌린 집');
  s = { ...s, housing: { ...s.housing, own: true } };
  assert.equal(housewarmDue(s, 19), false, '산 날을 아직 모른다');
  s = noteHouseBought(s, 10);
  assert.equal(housewarmDue(s, 19), false, '산 날 당일은 아니다');
  const [from, to] = HOUSEWARM_HOURS;
  assert.equal(housewarmDue(onDay(s, 11), from - 1), false);
  assert.ok(housewarmDue(onDay(s, 11), from));
  assert.equal(housewarmDue(onDay(s, 11), to), false);
  assert.ok(housewarmDue(onDay(s, 15), from + 1), '놓치면 다음 날 저녁에도');
  assert.equal(noteHouseBought(s, 12).story.houseDay, 10, '산 날은 처음 것 그대로');
});

test('집들이 손님: 하치와레 · 치이카와는 늘, 나머지는 하트 1개부터', () => {
  let s = base();
  assert.deepEqual(housewarmGuests(s).sort(), [...HOUSEWARM_ALWAYS].sort());
  s = { ...s, friends: { ...(s.friends || {}), rakko: { ...friendOf(s, 'rakko'), pts: ptsForHearts(1) } } };
  assert.ok(housewarmGuests(s).includes('rakko'));
  assert.equal(housewarmGuests(s).includes('usagi'), false);
});

test('집들이를 마치면 손님마다 가구 하나와 친밀도, 다시는 열리지 않는다', () => {
  let s = noteHouseBought({ ...onDay(base(), 10), housing: { own: true, unpaid: 0, lottery: null } }, 10);
  s = onDay(s, 11, 19);
  const guests = ['hachiware', 'chiikawa'];
  const r = finishHousewarm(s, guests);
  for (const k of guests) {
    assert.equal(homeOf(r.state).owned[HOUSEWARM_GIFTS[k]], 1, k);
    assert.equal(friendOf(r.state, k).pts, HOUSEWARM_BOND);
  }
  assert.equal(housewarmDue(r.state, 19), false);
  assert.equal(housewarmDue(onDay(r.state, 20), 19), false);
  assert.ok(r.parts.length >= guests.length);
  assert.ok(isValidState(r.state));
});
