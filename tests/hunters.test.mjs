import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../src/core/hunters.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import { MONSTERS } from '../src/core/combat.js';

const fresh = () => ({ ...createState({ name: '나', look: {} }), tutorial: 'done' });

test('랏코는 처음부터 자격증 있는 랭커, 나는 자격증이 있어야 랭킹에 든다', () => {
  const s = fresh();
  const r = H.ranking(s);
  assert.equal(r.length, 1);
  assert.equal(r[0].who, 'rakko');
  assert.ok(r[0].ranker);
  assert.equal(H.ranking({ ...s, licenses: { hunter: { day: 1 } } }).length, 2);
});

test('쓰러뜨리면 체력만큼 점수, 왕버섯은 덤', () => {
  let s = { ...fresh(), licenses: { hunter: { day: 1 } } };
  s = H.addKill(s, 'me', 'turtle');
  assert.equal(H.hunterOf(s, 'me').points, 8);
  s = H.addKill(s, 'me', 'kingcap');
  assert.equal(H.hunterOf(s, 'me').points, 8 + MONSTERS.kingcap.hp + H.BOSS_BONUS);
  assert.equal(H.hunterOf(s, 'me').kills, 2);
  assert.ok(isValidState(s));
});

test('친구 시험: 하루 한 번, 떨어지면 다음엔 조금 쉬워진다', () => {
  let s = fresh();
  assert.ok(H.canTryExam(s, 'chiikawa', 3));
  let r = H.tryExam(s, 'chiikawa', 3, () => 0.99);
  assert.equal(r.passed, false);
  assert.ok(!H.canTryExam(r.state, 'chiikawa', 3));
  assert.ok(H.canTryExam(r.state, 'chiikawa', 4));
  r = H.tryExam(r.state, 'chiikawa', 4, () => 0.1);
  assert.equal(r.passed, true);
  assert.ok(H.licensed(r.state, 'chiikawa'));
  assert.ok(!H.canTryExam(r.state, 'chiikawa', 5));
  assert.ok(isValidState(r.state));
  assert.ok(!H.canTryExam(s, 'momonga', 3)); // 모몽가는 토벌하지 않는다
});

test('랭커만 무기에 얼굴을 새긴다(돈 · 든 무기 필요, 한 번만)', () => {
  let s = { ...fresh(), money: 5000, licenses: { hunter: { day: 1 } }, weapon: { owned: ['sword'], held: 'sword' } };
  assert.equal(H.engrave(s).reason, 'ranker');
  for (let i = 0; i < 10; i++) s = H.addKill(s, 'me', 'turtle'); // 80점: 랏코 다음
  assert.ok(H.isRanker(s, 'me'));
  const r = H.engrave(s);
  assert.ok(r.ok);
  assert.deepEqual(H.engravedOf(r.state), ['sword']);
  assert.equal(r.state.money, 5000 - H.ENGRAVE_PRICE);
  assert.equal(H.engrave(r.state).reason, 'done');
  assert.ok(isValidState(r.state));
  assert.equal(H.engrave({ ...s, weapon: { owned: ['sword'], held: null } }).reason, 'weapon');
});
