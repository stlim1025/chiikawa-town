import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTERS, MONSTER_ORDER, MONSTER_REGIONS, DROPS, huntQuiz, WINTER_SPAWN, winterSpawns } from '../src/core/combat.js';
import { sellPrice } from '../src/core/market.js';
import { LICENSES } from '../src/core/licenses.js';

test('눈뭉치: 겨울 몬스터, 체력 5, 기운 −9, 굴러와 부딪치기, 얼음 결정 60원', () => {
  const M = MONSTERS.snowball;
  assert.ok(M && M.name === '눈뭉치' && M.region === 'winter' && M.winter === true);
  assert.equal(M.hp, 5);
  assert.equal(M.dmg, 9);
  assert.equal(M.attack, 'roll');
  assert.equal(M.atk, '굴러와 부딪치기');
  assert.equal(M.drop, 'icecrystal');
  assert.equal(DROPS.icecrystal.name, '얼음 결정');
  assert.equal(DROPS.icecrystal.price, 60);
  assert.equal(sellPrice('icecrystal'), 60);
  const others = Object.entries(MONSTERS).filter(([k]) => k !== 'snowball');
  assert.ok(others.every(([, o]) => o.atk !== M.atk), '공격 이름이 다른 몬스터와 겹치지 않는다(필기 atkOf)');
  assert.ok(!M.note.includes('·'));
});

test('눈뭉치: 도감 순서는 밤 나방 다음, 보스들 앞, 구역 묶음 winter', () => {
  const i = MONSTER_ORDER.indexOf('snowball');
  assert.ok(i > MONSTER_ORDER.indexOf('moth') && i < MONSTER_ORDER.indexOf('kingcap'));
  assert.equal(MONSTER_ORDER.at(-1), 'anoko');
  assert.ok(MONSTER_REGIONS.indexOf('winter') > MONSTER_REGIONS.indexOf('night') && MONSTER_REGIONS.indexOf('winter') < MONSTER_REGIONS.indexOf('boss'));
});

test('눈뭉치: 겨울에만 들판과 숲에 세 마리씩, 겨울이 아니면 없다', () => {
  assert.deepEqual(WINTER_SPAWN, { species: 'snowball', regions: ['fields', 'forest'], per: 3 });
  for (const s of ['spring', 'summer', 'autumn', undefined]) assert.deepEqual(winterSpawns(s), []);
  const w = winterSpawns('winter');
  assert.equal(w.length, 6);
  assert.equal(w.filter((x) => x.region === 'fields').length, 3);
  assert.equal(w.filter((x) => x.region === 'forest').length, 3);
  assert.ok(w.every((x) => x.species === 'snowball'));
});

test('필기: 눈뭉치는 언제 어디에(겨울에 들판과 숲), 「어디 사는 몬스터가 아닌가」의 정답이 되지 않는다', () => {
  const qs = Array.from({ length: 400 }, () => huntQuiz(LICENSES.hunter.questions)).flat();
  const region = qs.filter((q) => q.type === 'region' && q.mon === 'snowball');
  assert.ok(region.length > 0);
  for (const q of region) { assert.equal(q.choices[q.answer], '겨울에 들판과 숲'); assert.ok(q.q.includes('언제 어디에')); }
  for (const q of qs.filter((x) => x.type === 'odd')) assert.notEqual(q.choices[q.answer], '눈뭉치', q.q);
});
