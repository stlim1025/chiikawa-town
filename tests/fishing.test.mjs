import test from 'node:test';
import assert from 'node:assert/strict';
import { FISH, SIZE_RULES, waterAt, fishFor, pickFish, rulesOf } from '../src/core/fishing.js';
import { POND, LAKE, BRIDGES, riverZ, isWater } from '../src/core/layout.js';
import { itemInfo } from '../src/core/inventory.js';
import { sellPrice } from '../src/core/market.js';
import { TOOLS } from '../src/core/tools.js';
import '../src/core/combat.js';

test('낚시: 물 종류를 가린다(연못 · 시냇물 · 호수 · 바다, 다리 위와 뭍은 아니다)', () => {
  assert.equal(waterAt(POND.x, POND.z), 'pond');
  assert.equal(waterAt(LAKE.x, LAKE.z), 'lake');
  assert.equal(waterAt(5, riverZ(5)), 'river');
  assert.equal(waterAt(0, 90), 'sea');
  assert.equal(waterAt(0, 0), null, '광장');
  const B = BRIDGES[0];
  assert.equal(waterAt(B.x, riverZ(B.x)), null, '다리 위');
  // 물 판정은 지형의 물(isWater)과 같은 자리
  for (const [x, z] of [[POND.x, POND.z], [LAKE.x, LAKE.z], [5, riverZ(5)], [0, 90]]) assert.ok(isWater(x, z));
});

test('낚시: 물 · 시각마다 잡히는 물고기가 다르다', () => {
  assert.ok(fishFor('river', 12).includes('sweetfish') && !fishFor('river', 12).includes('catfish'), '낮 시냇물: 은어, 메기는 없다');
  assert.ok(fishFor('river', 22).includes('catfish') && !fishFor('river', 22).includes('sweetfish'), '밤 시냇물: 메기');
  assert.ok(fishFor('sea', 23).includes('octopus') && !fishFor('sea', 12).includes('octopus'), '문어는 밤바다');
  assert.ok(fishFor('pond', 12).includes('goldfish') && !fishFor('lake', 12).includes('goldfish'), '금붕어는 연못에만');
  for (const w of ['pond', 'river', 'lake', 'sea']) for (const h of [8, 13, 21, 3]) {
    assert.ok(fishFor(w, h).length >= 2);
    assert.ok(fishFor(w, h).includes(pickFish(w, h, () => 0)) && fishFor(w, h).includes(pickFish(w, h, () => 0.9999)));
  }
});

test('낚시: 물고기는 가방 물건이고 팔 수 있다, 큰 고기일수록 누를 틈이 짧고 감기가 길다', () => {
  for (const [id, f] of Object.entries(FISH)) {
    assert.equal(itemInfo(id).name, f.name);
    assert.equal(sellPrice(id), f.sell);
    assert.ok(SIZE_RULES[f.size]);
  }
  assert.equal(rulesOf('minnow').reel, null, '작은 고기는 바로 올라온다');
  assert.ok(rulesOf('octopus').window < rulesOf('crucian').window && rulesOf('crucian').window < rulesOf('minnow').window);
  assert.ok(rulesOf('octopus').reel.drain > rulesOf('crucian').reel.drain);
  assert.equal(TOOLS.rod.shop, 'tools');
});
