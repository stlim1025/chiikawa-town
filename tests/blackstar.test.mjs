import test from 'node:test';
import assert from 'node:assert/strict';
import { MIDNIGHT_T, WAKE_T, loopOf, loopCount, startLoop, loopDue, rewind, markLoop, endLoop, loopGate } from '../src/core/blackstar.js';
import { QUESTS, PLACES, checkQuestData } from '../src/core/quests.js';
import { itemInfo } from '../src/core/inventory.js';
import { sleepFor } from '../src/core/clock.js';

const at = (day, hour) => ({ day, t: ((hour - 6 + 24) % 24) / 24 });
const base = (day, hour) => ({ clock: at(day, hour), story: {} });

test('검은 별똥별: 별밤 다음 날이 되풀이되는 날, 그날 밤 12시가 지나면 그날 아침 6시 반으로', () => {
  let s = startLoop(base(9, 22)); // 9일 밤 10시에 소원을 들었다 → 10일이 되풀이된다
  assert.deepEqual(loopOf(s), { day: 10, n: 0, mark: -1 });
  assert.ok(!loopDue(s), '9일 밤은 아직');
  s = { ...s, clock: at(10, 23.9) };
  assert.ok(!loopDue(s), '10일 밤 12시 전');
  s = { ...s, clock: at(10, 24.01) };
  assert.ok(Math.abs(s.clock.t - MIDNIGHT_T) < 0.01 && loopDue(s), '밤 12시 너머');
  s = rewind(s);
  assert.equal(s.clock.day, 10, '날짜 번호는 그대로');
  assert.equal(s.clock.t, WAKE_T);
  assert.equal(loopCount(s), 1);
});

test('검은 별똥별: 밤에 자서 다음 날 아침이 되어도 같은 날 아침으로(낮잠은 그대로)', () => {
  const s = { ...startLoop(base(9, 22)), clock: at(10, 22) };
  assert.ok(loopDue(s, sleepFor(s.clock)), '밤 10시에 자면 밤 12시를 넘긴다');
  const nap = { ...s, clock: at(10, 13) };
  assert.ok(!loopDue(nap, sleepFor(nap.clock)), '낮잠은 밤 12시 전에 깬다');
});

test('검은 별똥별: 단계가 열리는 때(되풀이되는 날 · 한 번 더 되돌아온 날 · 쫓아낸 다음 날)', () => {
  let s = { ...startLoop(base(9, 22)), clock: at(10, 8) };
  assert.ok(loopGate(s, { loop: true }));
  assert.ok(loopGate(s, { newLoop: true }), '처음엔 n(0) > mark(-1)');
  s = markLoop(s);
  assert.ok(!loopGate(s, { newLoop: true }), '장면을 봤으면 한 번 더 되돌아와야');
  s = rewind({ ...s, clock: at(10, 24.5) });
  assert.ok(loopGate(s, { newLoop: true }));
  assert.ok(!loopGate({ ...s, clock: at(9, 12) }, { loop: true }), '되풀이되는 날이 아니면 닫힘');
  s = endLoop({ ...s, clock: at(10, 23) });
  assert.equal(loopOf(s), null);
  assert.ok(!loopGate(s, { afterFree: true }), '쫓아낸 그날 밤은 아직');
  assert.ok(loopGate({ ...s, clock: at(11, 7) }, { afterFree: true }), '다음 날 아침');
  assert.ok(!loopGate(s, { loop: true }), '되풀이가 끝나면 loop 단계는 닫힌다');
});

test('검은 별똥별 퀘스트: 하치와레 하트 3개 사이드스토리 9단계, 표백제는 퀘스트 물건, 러스크 보상', () => {
  const Q = QUESTS.blackStar;
  assert.ok(Q && Q.side && Q.giver === 'hachiware' && Q.needHearts === 3);
  assert.equal(Q.steps.length, 9);
  assert.ok(Q.steps.filter((st) => st.place).every((st) => PLACES[st.place]));
  assert.ok(Q.steps.some((st) => st.type === 'search'));
  assert.equal(itemInfo('bleach').kind, 'quest');
  assert.ok(itemInfo('rusk').eat > 0);
  for (const st of Q.steps) for (const L of st.say) assert.ok(typeof L === 'string' ? !L.includes('·') : !L.text.includes('·'), '화면 글에 가운뎃점 없이');
  assert.deepEqual(checkQuestData(), []);
});
