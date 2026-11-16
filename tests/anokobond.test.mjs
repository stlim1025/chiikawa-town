import test from 'node:test';
import assert from 'node:assert/strict';
import { BOND, UNLOCK, RACE, RIBBONS, SADDLES, FLUFF, DOLL, bondOf, bondHearts, isUnlocked, canAct, pet, feed, comb, addRun, raceFinish, setDecor, rideBoost, decorTag, parseDecorTag, decorColors, isValidBond } from '../src/core/anokobond.js';
import { createState } from '../src/core/state.js';
import { addItem, bagOf } from '../src/core/inventory.js';
import { sellPrice } from '../src/core/market.js';
import '../src/core/quests.js'; // 주먹밥(riceball) 같은 퀘스트 물건 등록

const fresh = () => ({ ...createState({ name: '치이', look: {} }), clock: { day: 5, t: 0.3 } });
/** 2장(아노코)을 끝낸 저장. pts 를 주면 그만큼 친해진 채로. */
const tamed = (pts = 0) => { const s = fresh(); return { ...s, quests: { ...(s.quests || {}), anoko: { step: 4, base: 0, done: 4 } }, anokoBond: pts ? { pts } : undefined }; };

test('아노코와 지내기: 2장 전이나 저장에 칸이 없으면 모두 0이고 아무것도 열리지 않는다', () => {
  const s = fresh();
  const b = bondOf(s);
  assert.equal(b.pts, 0);
  assert.equal(b.raceBest, null);
  assert.equal(bondHearts(s), 0);
  assert.equal(isUnlocked(s, 'greet'), false);
  assert.equal(pet(s, 5).reason, 'locked');
  assert.equal(addRun(s, 999, 5).gained, 0);
  assert.equal(canAct(s, 'pet', 5), 'locked');
});

test('아노코와 지내기: 쓰다듬기는 하루 한 번 +1', () => {
  const r = pet(tamed(), 5);
  assert.equal(r.ok, true);
  assert.equal(r.gained, 1);
  assert.equal(bondOf(r.state).pts, 1);
  assert.equal(canAct(r.state, 'pet', 5), 'done');
  assert.equal(pet(r.state, 5).reason, 'done');
});

test('아노코와 지내기: 하루에 3점까지만 쌓인다', () => {
  let s = addItem(tamed(), 'berry', 1).state;
  s = pet(s, 5).state;
  s = feed(s, 'berry', 5).state;
  const r = addRun(s, BOND.runGoal, 5);
  assert.equal(r.gained, 0);
  assert.equal(bondOf(r.state).dayPts, BOND.dayCap);
  assert.equal(bondOf(r.state).pts, 3);
});

test('아노코와 지내기: 간식은 가방에 있는 먹을 것만, 빨간 열매는 +2', () => {
  const none = feed(tamed(), 'berry', 5);
  assert.equal(none.reason, 'item');
  const notFood = feed(addItem(tamed(), 'fluffdown', 1).state, 'fluffdown', 5);
  assert.equal(notFood.reason, 'item');
  assert.equal(bagOf(notFood.state).items.fluffdown, 1);
  const berry = feed(addItem(tamed(), 'berry', 1).state, 'berry', 5);
  assert.equal(berry.gained, 2);
  assert.equal(bagOf(berry.state).items.berry || 0, 0);
  const rice = feed(addItem(tamed(), 'riceball', 1).state, 'riceball', 5);
  assert.equal(rice.gained, 1);
});

test('아노코와 지내기: 날이 바뀌면 다시 할 수 있고 하루 점수와 달린 거리는 0부터', () => {
  let s = pet(tamed(), 5).state;
  s = addRun(s, 200, 5).state;
  assert.equal(bondOf(s).runDist, 200);
  assert.equal(canAct(s, 'pet', 6), 'ok');
  const r = pet(s, 6);
  assert.equal(r.gained, 1);
  assert.equal(bondOf(r.state).dayPts, 1);
  const run = addRun(r.state, 120, 6);
  assert.equal(bondOf(run.state).runDist, 120);
  assert.equal(run.gained, 0);
});

test('아노코와 지내기: 같이 달리기는 하루 300m 를 채울 때 한 번 +1', () => {
  let r = addRun(tamed(), 150, 5);
  r = addRun(r.state, 149, 5);
  assert.equal(r.gained, 0);
  r = addRun(r.state, 1, 5);
  assert.equal(r.gained, 1);
  r = addRun(r.state, 500, 5);
  assert.equal(r.gained, 0);
  assert.equal(bondOf(r.state).pts, 1);
});

test('아노코와 지내기: 하트마다 열리고, 하트 3이면 인형을 한 번 받고, 하트 5면 1.15배', () => {
  const one = pet(tamed(2), 5);
  assert.equal(one.hearts, 1);
  assert.equal(one.up, true);
  assert.deepEqual(one.unlocks, ['greet']);
  const doll = pet(tamed(17), 5);
  assert.equal(doll.hearts, 3);
  assert.deepEqual(doll.unlocks, ['race']);
  assert.equal(doll.state.home.owned[DOLL], 1);
  const again = pet({ ...doll.state, anokoBond: { ...doll.state.anokoBond, pts: 29 } }, 6);
  assert.equal(again.state.home.owned[DOLL], 1);
  assert.equal(rideBoost(tamed(44)), 1);
  assert.equal(rideBoost(tamed(45)), BOND.speed);
  assert.equal(UNLOCK.speed, 5);
});

test('아노코와 지내기: 털 빗기는 하트 2부터 하루 한 번, 아노코 솜털은 120원', () => {
  assert.equal(comb(tamed(8), 5).reason, 'locked');
  const r = comb(tamed(9), 5);
  assert.equal(r.ok, true);
  assert.equal(bagOf(r.state).items[FLUFF], 1);
  assert.equal(comb(r.state, 5).reason, 'done');
  assert.equal(sellPrice(FLUFF), BOND.fluffSell);
  assert.equal(sellPrice(FLUFF), 120);
});

test('아노코와 지내기: 경주 보상은 첫 완주 1,000원, 그 뒤 0.5초 넘게 줄이면 하루 한 번 300원', () => {
  let r = raceFinish(tamed(18), 40, 5);
  assert.equal(r.reward, RACE.first);
  assert.equal(r.first, true);
  assert.equal(bondOf(r.state).raceBest, 40);
  r = raceFinish(r.state, 39, 5);
  assert.equal(r.reward, 0);
  assert.equal(bondOf(r.state).raceBest, 39);
  r = raceFinish(r.state, 38.4, 6);
  assert.equal(r.reward, RACE.record);
  assert.equal(r.record, true);
  r = raceFinish(r.state, 30, 6);
  assert.equal(r.reward, 0);
  assert.equal(bondOf(r.state).raceBest, 30);
  r = raceFinish(r.state, 29.6, 7);
  assert.equal(r.reward, 0);
  assert.equal(bondOf(r.state).raceBest, 29.6);
  const slower = raceFinish(r.state, 50, 8);
  assert.equal(slower.reward, 0);
  assert.equal(bondOf(slower.state).raceBest, 29.6);
});

test('아노코와 지내기: 꾸미기는 하트 4부터, 같이 놀기 꼬리표는 ak-리본안장', () => {
  assert.equal(RIBBONS.length, 6);
  assert.equal(SADDLES.length, 6);
  const early = setDecor(tamed(29), 3, 5);
  assert.equal(decorTag(early), null);
  const s = setDecor(tamed(30), 3, 5);
  assert.equal(decorTag(s), 'ak-35');
  assert.match(decorTag(s), /^[a-zA-Z0-9_-]{1,20}$/);
  assert.equal(decorTag(setDecor(s, 0, 0)), null);
  assert.deepEqual(parseDecorTag(['ride-anoko', 'ak-35', 'lantern']), { ribbon: 3, saddle: 5 });
  assert.equal(parseDecorTag(['ride-anoko', 'ak-9z']), null);
  assert.equal(parseDecorTag(['ride-anoko']), null);
});

test('아노코와 지내기: 저장 검사', () => {
  assert.equal(isValidBond(undefined), true);
  assert.equal(isValidBond({ pts: 3, day: 5, dayPts: 1, ribbon: 2, saddle: 0, raceBest: 31.5, raceDone: true }), true);
  assert.equal(isValidBond({ pts: -1 }), false);
  assert.equal(isValidBond({ pts: 3, ribbon: 7 }), false);
  assert.equal(isValidBond({ pts: 3, raceBest: -2 }), false);
  assert.equal(isValidBond('x'), false);
});

test('아노코와 지내기: 저장에 넣으면 저장 검사를 거치고, 인형은 가구점에서 팔지 않는 선물 가구', async () => {
  const { isValidState } = await import('../src/core/save.js');
  const { FURNITURE } = await import('../src/core/home.js');
  const s = tamed();
  assert.equal(isValidState({ ...s, anokoBond: { pts: -1 } }), false);
  assert.equal(isValidState({ ...s, anokoBond: { pts: 4, day: 5, dayPts: 2, ribbon: 1, saddle: 2 } }), true);
  assert.equal(FURNITURE[DOLL].gift, true);
  assert.equal(FURNITURE[DOLL].name, '아노코 인형');
  const gifted = pet(tamed(17), 5).state;
  assert.equal(isValidState(gifted), true);
});

test('아노코와 지내기: 꾸미기 색 번호를 모델 색으로(0 은 없음)', () => {
  assert.deepEqual(decorColors({ ribbon: 0, saddle: 0 }), { ribbon: null, saddle: null });
  assert.deepEqual(decorColors({ ribbon: 1, saddle: 6 }), { ribbon: RIBBONS[0].color, saddle: SADDLES[5].color });
  assert.deepEqual(decorColors(null), { ribbon: null, saddle: null });
});
