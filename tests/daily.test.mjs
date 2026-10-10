import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS, logAct, startQuest, progressOf, stepReady, completeStep, canOffer, questsFor, checkQuestData, isValidActs } from '../src/core/quests.js';
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

test('일상 부탁은 끝내고 며칠 지나면 다시 부탁한다', () => {
  const id = daily.find((q) => QUESTS[q].steps[0].type === 'together');
  const Q = QUESTS[id];
  const base = fresh({ friends: { [Q.giver]: { pts: 99 } } });
  assert.equal(canOffer(base, id), true);
  const done = { ...base, quests: { [id]: { step: Q.steps.length, base: 0, done: 3 } } };
  assert.equal(canOffer({ ...done, clock: { day: 3, t: 0.2 } }, id), false);
  assert.equal(canOffer({ ...done, clock: { day: 3 + Q.again, t: 0.2 } }, id), true);
  assert.ok(questsFor({ ...done, clock: { day: 3 + Q.again, t: 0.2 } }, Q.giver).offer.includes(id));
  const story = { ...base, quests: { pillow: { step: 1, base: 0, done: 1 } }, clock: { day: 99, t: 0.2 } };
  assert.equal(canOffer(story, 'pillow'), false); // 보통 부탁은 한 번만
  assert.equal(canOffer({ ...base, tutorial: 'board' }, id), false); // 첫날 안내 중에는 아직
});

test('같이 한 기록 저장 모양 검사', () => {
  assert.equal(isValidActs({ weed: 3, 'weed@hachiware': 2 }), true);
  assert.equal(isValidActs({ weed: 'x' }), false);
  assert.equal(isValidActs([]), false);
});
