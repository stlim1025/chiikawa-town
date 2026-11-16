import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonLookOf, AUTUMN_LEAVES, mixHex } from '../src/world/seasonlook.js';

const GREEN = '#6cc77e', PINK = '#ffb6cd';
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = /^#[0-9a-f]{6}$/;

test('계절 풍경: 여름은 지금까지의 색 그대로(땅 null, 잎 그대로, 꽃 보임, 지붕 눈 없음)', () => {
  const L = seasonLookOf('summer');
  assert.equal(L.ground, null);
  assert.equal(L.leafOf(3, 4, GREEN), GREEN);
  assert.equal(L.leafOf(3, 4, PINK), PINK);
  assert.deepEqual(L.bushes, ['#8fcd86', '#9dd394']);
  assert.deepEqual(L.hills, ['#aee08f', '#95d488']);
  assert.equal(L.flowers, true);
  assert.equal(L.roofSnow, false);
  assert.equal(L.snowGround, false);
});

test('계절 풍경: 가을은 나무마다 주황, 빨강, 노랑이 섞이고 분홍 나무는 붉게(같은 자리는 늘 같은 색)', () => {
  const L = seasonLookOf('autumn');
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const c = L.leafOf(i * 3.7, -i * 1.9, GREEN);
    assert.ok(AUTUMN_LEAVES.includes(c), c);
    assert.equal(L.leafOf(i * 3.7, -i * 1.9, GREEN), c);
    seen.add(c);
  }
  assert.ok(seen.size >= 3, `색 ${seen.size}가지`);
  const [r, g] = rgb(L.leafOf(1, 1, PINK));
  assert.ok(r > g + 60, '분홍 나무는 붉게');
  assert.equal(L.flowers, true);
  assert.ok(L.ground && hex.test(L.ground.grass));
});

test('계절 풍경: 겨울은 눈 덮인 흰빛, 장식 꽃 숨김, 지붕 눈과 눈 바닥', () => {
  const L = seasonLookOf('winter');
  for (const leaf of [GREEN, '#5fb36e', PINK]) assert.ok(rgb(L.leafOf(2, 5, leaf)).every((v) => v >= 0xd0), L.leafOf(2, 5, leaf));
  assert.equal(L.flowers, false);
  assert.equal(L.roofSnow, true);
  assert.equal(L.snowGround, true);
  assert.ok(rgb(L.ground.grass).every((v) => v >= 0xe0), '눈 덮인 풀밭');
  const [r, g, b] = rgb(L.ground.dirt);
  assert.ok(r > b && r < 0xf0, '길은 흐린 흙빛');
  assert.ok(L.bushes.every((c) => rgb(c).every((v) => v >= 0xd8)));
});

test('계절 풍경: 봄은 연두빛, 분홍 나무는 그대로 꽃 핀 색', () => {
  const L = seasonLookOf('spring');
  assert.equal(L.leafOf(0, 0, PINK), PINK);
  const [r0, g0] = rgb(GREEN), [r1, g1] = rgb(L.leafOf(0, 0, GREEN));
  assert.ok(r1 > r0 && g1 >= g0, '더 밝은 연두');
  assert.equal(L.flowers, true);
  assert.equal(L.roofSnow, false);
  for (const k of ['grass', 'grass2', 'dirt', 'sand']) assert.ok(hex.test(L.ground[k]), k);
  for (const k of ['forest', 'mountain', 'fields', 'river']) assert.ok(hex.test(L.ground.region[k]), k);
});

test('계절 풍경: 모르는 계절은 여름처럼, 색 섞기', () => {
  assert.equal(seasonLookOf(undefined).ground, null);
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#102030', '#102030', 0.3), '#102030');
});
