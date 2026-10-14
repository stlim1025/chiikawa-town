import test from 'node:test';
import assert from 'node:assert/strict';
import { FISH, DEX_FISH, DEX_PRIZES, GRILL_MAX, grillFish, dexCount, canClaimDex, claimDex, isValidFishPrize, logFish } from '../src/core/fishing.js';
import { addItem, countOf, itemInfo } from '../src/core/inventory.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import { JOB_TYPES, availableJobs, acceptJob, recordPull, isComplete, payout, isFishJob } from '../src/core/jobs.js';
import { DAILY_JOBS, VILLAGERS, villagerOf } from '../src/core/villagers.js';
import { GOALS, hasRod, canDoJob, goalOf, buyGoal } from '../src/core/goals.js';
import { TOOLS } from '../src/core/tools.js';
import { loves } from '../src/core/gifts.js';
import { addToPantry, sellablesOf } from '../src/core/pantry.js';
import { eatStyle } from '../src/core/eating.js';
import { lineOf } from '../src/core/npclines.js';
import { sellPrice } from '../src/core/market.js';

const fresh = () => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', money: 1000 });
const withFish = (s, list) => list.reduce((a, [id, n]) => addItem(a, id, n).state, s);

test('생선구이: 값싼 생선부터 세 마리까지 굽고, 큰 고기는 두 접시, 빈 깡통은 굽지 않는다', () => {
  const g = itemInfo('grilledfish');
  assert.ok(g && g.name === '생선구이' && g.eat > 0 && eatStyle('grilledfish'), '먹을 수 있고 먹는 몸짓이 있다');
  assert.equal(grillFish(fresh()).reason, 'none');
  assert.equal(grillFish(withFish(fresh(), [['can', 3]])).reason, 'none', '깡통은 안 굽는다');
  let s = withFish(fresh(), [['octopus', 1], ['minnow', 2], ['crucian', 1], ['can', 1]]);
  const r = grillFish(s);
  assert.ok(r.ok);
  assert.deepEqual(r.used, { minnow: 2, crucian: 1 }, '값싼 것부터, 귀한 문어는 아껴 둔다');
  assert.equal(r.made, 3);
  assert.equal(countOf(r.state, 'grilledfish'), 3);
  assert.equal(countOf(r.state, 'octopus'), 1);
  assert.equal(countOf(r.state, 'can'), 1);
  s = withFish(fresh(), [['catfish', 2]]);
  assert.equal(grillFish(s).made, 4, '큰 고기 하나에 두 접시');
  assert.equal(GRILL_MAX, 3);
  assert.equal(grillFish(withFish(fresh(), [['minnow', 1], ['grilledfish', 99]])).reason, 'full', '가방이 꽉 차면 굽지 않는다');
});

test('낚시 도감: 빈 깡통은 빼고, 가짓수마다 한 번씩 보상, 저장 확인', () => {
  assert.ok(!DEX_FISH.includes('can') && DEX_FISH.length === Object.keys(FISH).length - 1);
  assert.equal(DEX_PRIZES.at(-1).n, DEX_FISH.length, '마지막 보상은 모든 물고기');
  let s = fresh();
  for (const id of DEX_FISH.slice(0, 4)) s = logFish(s, id, 10).state;
  s = logFish(s, 'can', null).state;
  assert.equal(dexCount(s), 4, '깡통은 세지 않는다');
  assert.ok(canClaimDex(s, 4) && !canClaimDex(s, 8) && !canClaimDex(s, 5), '정해진 가짓수만');
  const r = claimDex(s, 4);
  assert.ok(r.ok && r.state.money === s.money + DEX_PRIZES[0].money);
  assert.deepEqual(r.state.fishPrize, [4]);
  assert.equal(claimDex(r.state, 4).ok, false, '한 번만');
  assert.ok(isValidState(r.state));
  assert.ok(isValidFishPrize([]) && isValidFishPrize([4, 8]));
  assert.equal(isValidFishPrize([4, 4]), false);
  assert.equal(isValidFishPrize([5]), false);
  assert.equal(isValidState({ ...fresh(), fishPrize: 'x' }), false);
});

test('낚시 일감: 낚싯대가 있어야 보이고, 그 물고기를 세며, 급수 배율 없이 일감 값이 매입가보다 낫다', () => {
  const fishJobs = Object.values(JOB_TYPES).filter(isFishJob);
  assert.equal(fishJobs.length, 3);
  for (const J of fishJobs) {
    assert.ok(FISH[J.kind] && !FISH[J.kind].junk, J.id);
    assert.ok(DAILY_JOBS[J.id] > 0);
    assert.ok(J.base / J.target > sellPrice(J.kind), `일감으로 내는 쪽이 이득: ${J.id}`);
    assert.ok(!J.title.includes('·') && !J.where.includes('·'));
  }
  assert.ok(!availableJobs(1, {}).some(isFishJob), '낚싯대가 없으면 안 보인다');
  assert.equal(availableJobs(6, {}, ['rod']).filter(isFishJob).length, 3, '견습도 낚싯대만 있으면');
  let job = acceptJob('fishCrucian');
  job = recordPull(job, 'minnow', 'snapped');
  assert.equal(job.count, 0, '다른 물고기는 안 센다');
  for (let i = 0; i < 3; i++) job = recordPull(job, 'crucian', 'snapped');
  assert.ok(isComplete(job));
  assert.equal(payout(job, 1), JOB_TYPES.fishCrucian.base, '1급이어도 배율 없이');
  assert.equal(payout(job, 6), JOB_TYPES.fishCrucian.base);
});

test('친구들의 낚싯대: 하치와레 · 쿠리만쥬 · 랏코가 모아서 도구점에서 사고, 산 뒤에만 낚시 일감을 받는다', () => {
  for (const kind of ['hachiware', 'kurimanju', 'rakko']) {
    const g = GOALS[kind].find((x) => x.kind === 'rod');
    assert.ok(g && g.cost === TOOLS.rod.price && g.label === TOOLS.rod.name, kind);
    assert.ok(VILLAGERS[kind].jobs.some((id) => isFishJob(JOB_TYPES[id])), `${kind} 낚시 일감`);
  }
  let s = fresh();
  assert.equal(goalOf(s, 'rakko').kind, 'rod', '랏코는 낚싯대부터');
  assert.ok(!hasRod(s, 'rakko') && !canDoJob(s, 'rakko', 'fishMackerel') && canDoJob(s, 'rakko', 'weed8'));
  s = { ...s, villagers: { rakko: { ...villagerOf(s, 'rakko', 1), money: TOOLS.rod.price } } };
  const r = buyGoal(s, 'rakko', 1);
  assert.ok(r.ok && hasRod(r.state, 'rakko') && canDoJob(r.state, 'rakko', 'fishMackerel'));
});

test('물고기 쓰임: 랏코 · 쿠리만쥬가 좋아하고, 친구 가방의 좋아하지 않는 물고기는 판다, 낚시하며 하는 말', () => {
  assert.ok(loves('rakko', 'mackerel') && loves('rakko', 'grilledfish') && loves('kurimanju', 'grilledfish') && loves('kurimanju', 'octopus'));
  let s = addToPantry(fresh(), 'hachiware', 'crucian', 2).state;
  s = addToPantry(s, 'rakko', 'mackerel', 1).state;
  assert.deepEqual(sellablesOf(s, 'hachiware').map((x) => x.id), ['crucian']);
  assert.deepEqual(sellablesOf(s, 'rakko'), [], '좋아하는 물고기는 두고 먹는다');
  for (const k of Object.keys(VILLAGERS)) {
    const line = lineOf(k, 'fish');
    assert.ok(line && !line.includes('·'), `${k}: ${line}`);
  }
});
