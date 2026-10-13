import test from 'node:test';
import assert from 'node:assert/strict';
import { GLOW_CLEAN, GLOW_OK, glowResult, glowNight, pickedTonight, markPicked, isValidGlowfluff } from '../src/core/glowfluff.js';
import { JOB_TYPES, availableJobs, recordPull, isComplete, acceptJob } from '../src/core/jobs.js';
import { DAILY_JOBS } from '../src/core/villagers.js';
import { itemInfo } from '../src/core/inventory.js';
import { sellPrice } from '../src/core/market.js';
import { tasteOf } from '../src/core/gifts.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import '../src/core/combat.js';
import '../src/core/quests.js';

const fresh = () => ({ ...createState({ name: '나', look: {} }), player: { x: 0, z: 0 } });
// 이 게임의 하루는 아침 6시에 시작한다: at(5, 26) = 5일째 밤의 새벽 2시
const at = (day, hour) => ({ day, t: (hour - 6) / 24 });

test('반짝 털뭉치: 빛이 가장 밝을 때 깔끔하게, 적당하면 그냥, 어두우면 움찔', () => {
  assert.equal(glowResult(1), 'clean');
  assert.equal(glowResult(GLOW_CLEAN), 'clean');
  assert.equal(glowResult(GLOW_CLEAN - 0.01), 'ok');
  assert.equal(glowResult(GLOW_OK), 'ok');
  assert.equal(glowResult(GLOW_OK - 0.01), 'startle');
  assert.equal(glowResult(0), 'startle');
});

test('반짝 털뭉치: 저녁부터 다음 날 아침까지가 한 밤이고, 다음 밤에는 다시 앉는다', () => {
  assert.equal(glowNight(at(5, 21)), 5);
  assert.equal(glowNight(at(5, 26)), 5, '자정 너머 새벽 2시도 같은 밤');
  assert.equal(glowNight(at(6, 20)), 6);
  let s = { ...fresh(), clock: at(5, 21) };
  assert.deepEqual(pickedTonight(s), []);
  s = markPicked(s, 3);
  s = markPicked(s, 3);
  s = markPicked(s, 7);
  assert.deepEqual(pickedTonight(s), [3, 7], '같은 무더기는 한 번만');
  assert.deepEqual(pickedTonight({ ...s, clock: at(5, 27) }), [3, 7], '새벽까지는 그대로');
  assert.deepEqual(pickedTonight({ ...s, clock: at(6, 20) }), [], '다음 밤에는 다시 앉아 있다');
  assert.ok(isValidState(s));
  assert.ok(isValidGlowfluff(s.glowfluff));
  assert.ok(!isValidGlowfluff({ night: 1, picked: [-1] }));
  assert.ok(!isValidState({ ...s, glowfluff: { night: 'x', picked: [] } }));
});

test('반짝 털뭉치 일감: 4급부터 게시판에 하루 둘, 깔끔하게 뗀 수만큼 보너스', () => {
  const T = JOB_TYPES.glow5;
  assert.equal(T.kind, 'glowfluff');
  assert.ok(DAILY_JOBS.glow5 > 0);
  assert.ok(availableJobs(4, {}).some((j) => j.id === 'glow5'));
  assert.ok(!availableJobs(5, {}).some((j) => j.id === 'glow5'), '5급은 아직');
  let job = acceptJob('glow5');
  job = recordPull(job, 'glowfluff', 'clean');
  job = recordPull(job, 'glowfluff', 'snapped');
  job = recordPull(job, 'weed', 'clean');
  assert.equal(job.count, 2);
  assert.equal(job.clean, 1);
  for (let i = 0; i < 3; i++) job = recordPull(job, 'glowfluff', 'clean');
  assert.ok(isComplete(job));
});

test('반짝 털뭉치: 가방 물건(팔면 45원), 모몽가가 좋아한다', () => {
  assert.equal(itemInfo('glowfluff').name, '반짝 털뭉치');
  assert.equal(sellPrice('glowfluff'), 45);
  assert.equal(tasteOf('momonga', 'glowfluff'), 'love');
});
