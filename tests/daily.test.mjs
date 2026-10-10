import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS, logAct, startQuest, progressOf, stepReady, completeStep, canOffer, questsFor, checkQuestData, isValidActs, wishNow, openWishes, MAX_WISHES } from '../src/core/quests.js';
import { createClock } from '../src/core/clock.js';
import { createState } from '../src/core/state.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', ...o });
const daily = Object.keys(QUESTS).filter((id) => QUESTS[id].daily);

test('일상 부탁이 친구마다 있다: 같이 라멘 먹기 · 같이 풀 뽑기 같은 사소한 일', () => {
  assert.ok(daily.length >= 5, `일상 부탁 수: ${daily.length}`);
  const acts = daily.flatMap((id) => QUESTS[id].steps.map((s) => s.act || s.type));
  assert.ok(acts.includes('ramen') && acts.includes('weed'), acts.join(','));
  assert.deepEqual(checkQuestData(), []);
  for (const id of daily) assert.ok(QUESTS[id].again >= 1, `${id} 은 며칠 뒤 또 부탁한다`);
});

test('같이 하기는 그 친구가 옆에 있을 때 한 것만 센다', () => {
  const id = daily.find((q) => QUESTS[q].steps[0].type === 'together' && QUESTS[q].steps[0].act === 'weed');
  const Q = QUESTS[id], step = Q.steps[0];
  let s = startQuest(fresh(), id);
  s = logAct(s, 'weed', []); // 혼자 뽑은 건 안 센다
  assert.equal(progressOf(s, id).have, 0);
  for (let i = 0; i < step.n; i++) s = logAct(s, 'weed', [Q.giver, 'usagi']);
  assert.equal(progressOf(s, id).have, step.n);
  assert.equal(stepReady(s, id), true);
  assert.equal(s.acts.weed, step.n + 1);
  const r = completeStep(s, id, 1);
  assert.equal(r.finished, true);
});

test('부탁을 받기 전에 같이 한 것은 세지 않는다', () => {
  const id = daily.find((q) => QUESTS[q].steps[0].type === 'together');
  const Q = QUESTS[id], act = Q.steps[0].act;
  let s = fresh();
  for (let i = 0; i < 9; i++) s = logAct(s, act, [Q.giver]);
  s = startQuest(s, id);
  assert.equal(progressOf(s, id).have, 0);
});

// 모두 하트가 넉넉하고, 배고프고(기운 30) 돈도 없는(0원) 마을: 형편으로는 누구나 부탁할 만한 상태
const KINDS = ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'momonga', 'rakko'];
const needy = (o = {}) => fresh({
  friends: Object.fromEntries(KINDS.map((k) => [k, { pts: 99 }])),
  villagers: Object.fromEntries(KINDS.map((k) => [k, { money: 0, energy: 30, jobs: 0, day: 1 }])),
  ...o
});
const at = (s, day, hour) => ({ ...s, clock: createClock(day, hour) });
const midHour = (id) => (QUESTS[id].wish.hours[0] + QUESTS[id].wish.hours[1]) / 2;
/** 그 부탁을 할 마음이 드는 날(형편 · 시간대가 맞을 때)을 찾는다. */
const wishDay = (id, from = 1, s = needy()) => { for (let d = from; d < from + 500; d++) if (wishNow(at(s, d, midHour(id)), id)) return d; return -1; };

test('일상 부탁은 한꺼번에 다 뜨지 않는다: 마을 전체에 많아야 둘, 친구마다 하나', () => {
  let seen = 0;
  for (let d = 1; d <= 60; d++) for (const h of [8, 10, 12, 15, 18]) {
    const open = openWishes(at(needy(), d, h));
    assert.ok(open.length <= MAX_WISHES, `${d}일 ${h}시: ${open.join(',')}`);
    assert.equal(new Set(open.map((id) => QUESTS[id].giver)).size, open.length, '친구마다 하나');
    seen += open.length;
  }
  assert.ok(seen > 0, '가끔은 부탁이 뜬다');
  for (const id of daily) assert.ok(QUESTS[id].wish && QUESTS[id].wish.chance < 1, `${id} 은 날마다 뜨지 않는다`);
});

test('일상 부탁은 그 시간대에만, 그날 마음이 들 때만 한다', () => {
  const id = 'ramenDate', d = wishDay(id);
  assert.ok(d > 0);
  assert.equal(wishNow(at(needy(), d, midHour(id)), id), true);
  assert.equal(wishNow(at(needy(), d, 23), id), false, '밤에는 안 한다');
  const off = [...Array(60)].map((_, i) => i + 1).filter((day) => !wishNow(at(needy(), day, midHour(id)), id));
  assert.ok(off.length > 10, '마음이 안 드는 날도 있다');
});

test('형편이 맞아야 부탁한다: 배부르면 라멘, 돈이 넉넉하면 같이 일하자는 부탁을 안 한다', () => {
  const r = 'ramenDate', dr = wishDay(r);
  const full = needy({ villagers: { chiikawa: { money: 0, energy: 100, jobs: 0, day: 1 } } });
  assert.equal(wishNow(at(full, dr, midHour(r)), r), false);
  const w = 'weedPal', dw = wishDay(w);
  const rich = needy({ villagers: { hachiware: { money: 5000, energy: 30, jobs: 0, day: 1 } } });
  assert.equal(wishNow(at(rich, dw, midHour(w)), w), false);
  const t = 'restDay', dt = wishDay(t);
  const fresh2 = needy({ villagers: { rakko: { money: 0, energy: 100, jobs: 0, day: 1 } } });
  assert.equal(wishNow(at(fresh2, dt, midHour(t)), t), false, '지치지 않았으면 쉬자는 말도 안 한다');
});

test('이미 받은 일상 부탁도 자리를 차지하고, 부탁 중인 친구는 새 부탁을 안 한다', () => {
  const two = needy({ quests: { weedPal: { step: 0, base: 0 }, berryPal: { step: 0, base: 0 } } });
  for (let d = 1; d <= 30; d++) assert.deepEqual(openWishes(at(two, d, 12)), []);
  const one = needy({ quests: { ramenDate: { step: 0, base: 0 } } });
  for (let d = 1; d <= 30; d++) assert.ok(!openWishes(at(one, d, 10)).includes('weedChii'), '치이카와는 이미 부탁 중');
});

test('일상 부탁은 끝내고 며칠 지나면 다시 부탁한다(보통 부탁은 한 번만)', () => {
  const id = 'weedPal', Q = QUESTS[id];
  const done = needy({ quests: { [id]: { step: Q.steps.length, base: 0, done: 3 } } });
  for (let d = 3; d < 3 + Q.again; d++) assert.equal(canOffer(at(done, d, midHour(id)), id), false);
  const d = wishDay(id, 3 + Q.again, done);
  assert.ok(d > 0);
  assert.equal(canOffer(at(done, d, midHour(id)), id), true);
  assert.ok(questsFor(at(done, d, midHour(id)), Q.giver).offer.includes(id));
  assert.equal(canOffer(at(needy({ quests: { pillow: { step: 1, base: 0, done: 1 } } }), 99, 12), 'pillow'), false);
  assert.equal(canOffer(at(needy({ tutorial: 'board' }), d, midHour(id)), id), false, '첫날 안내 중에는 아직');
});

test('같이 한 기록 저장 모양 검사', () => {
  assert.equal(isValidActs({ weed: 3, 'weed@hachiware': 2 }), true);
  assert.equal(isValidActs({ weed: 'x' }), false);
  assert.equal(isValidActs([]), false);
});
