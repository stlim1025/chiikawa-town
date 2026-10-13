import test from 'node:test';
import assert from 'node:assert/strict';
import { STARS, CORNERS, HOLD_SEC, WARN_SEC, PEEK_SEC, newRescue, stepRescue, nextClamp, starFreed, allFree } from '../src/core/stardiner.js';
import { QUESTS, PLACES, checkQuestData } from '../src/core/quests.js';
import { itemInfo } from '../src/core/inventory.js';
import { eatStyle } from '../src/core/eating.js';

const still = () => 0; // 주방이 가장 짧게 조용한 쪽(6초)으로: 시간을 정해 두고 본다

test('별 세 개 레스토랑: 별똥별 셋 × 모서리 다섯 = 쇠고랑 열다섯, 꾹 누르고 있으면 빠진다', () => {
  const R = newRescue(still);
  assert.equal(R.clamps.length, STARS * CORNERS);
  assert.equal(nextClamp(R).i, 0);
  let ev = stepRescue(R, HOLD_SEC * 0.5, 0, still);
  assert.deepEqual(ev, []);
  assert.ok(R.clamps[0].p > 0.4 && R.clamps[0].p < 0.6);
  ev = stepRescue(R, HOLD_SEC * 0.6, 0, still);
  assert.deepEqual(ev, [{ type: 'free', i: 0 }]);
  assert.equal(nextClamp(R).i, 1);
});

test('별 세 개 레스토랑: 손을 떼면 천천히 도로 조이고, 별 하나의 모서리가 다 빠지면 그 별이 풀린다', () => {
  const R = newRescue(still);
  stepRescue(R, HOLD_SEC * 0.5, 3, still);
  const p = R.clamps[3].p;
  stepRescue(R, 0.2, null, still);
  assert.ok(R.clamps[3].p < p, '떼면 줄어든다');
  const ev = [];
  for (let k = 0; k < CORNERS; k++) ev.push(...stepRescue(R, HOLD_SEC, k, still));
  assert.ok(ev.some((e) => e.type === 'star' && e.star === 0));
  assert.ok(starFreed(R, 0));
  assert.ok(!starFreed(R, 1));
});

test('별 세 개 레스토랑: 주방이 내다볼 때 누르고 있으면 들킬 뻔, 그 쇠고랑이 다시 꽉 조인다', () => {
  const R = newRescue(still);
  assert.deepEqual(stepRescue(R, 6.01, null, still).map((e) => e.type), ['warn']);
  assert.deepEqual(stepRescue(R, WARN_SEC, null, still).map((e) => e.type), ['peek']);
  stepRescue(R, 0.3, 5, still); // 내다볼 때 누른다
  assert.equal(R.caught, 1);
  assert.equal(R.clamps[5].p, 0);
  assert.deepEqual(stepRescue(R, PEEK_SEC, null, still).map((e) => e.type), ['calm']);
});

test('별 세 개 레스토랑: 다 빼내면 done 한 번, 그 뒤로는 아무 일도 없다', () => {
  const slow = () => 0.999; // 주방은 오래 조용
  const R = newRescue(slow);
  const ev = [];
  for (let i = 0; i < STARS * CORNERS; i++) ev.push(...stepRescue(R, HOLD_SEC, i, slow));
  assert.ok(allFree(R));
  assert.equal(ev.filter((e) => e.type === 'done').length, 1);
  assert.equal(ev.filter((e) => e.type === 'star').length, STARS);
  assert.deepEqual(stepRescue(R, 30, null, slow), []);
  assert.equal(nextClamp(R), null);
});

test('별 세 개 레스토랑 퀘스트: 하치와레 사이드스토리, 저녁에 가게로, 보상은 거대 오므라이스(먹는 몸짓도)', () => {
  const Q = QUESTS.starDiner;
  assert.ok(Q && Q.side && Q.giver === 'hachiware');
  assert.equal(Q.needHearts, 3, '하치와레 하트 3개부터');
  assert.equal(Q.steps[0].scene, 'starDiner');
  assert.ok(PLACES[Q.steps[0].place]);
  assert.equal(itemInfo('omurice').name, '거대 오므라이스');
  assert.ok(Q.reward.items.omurice >= 1);
  assert.ok(eatStyle('omurice'));
  assert.deepEqual(checkQuestData(), []);
});
