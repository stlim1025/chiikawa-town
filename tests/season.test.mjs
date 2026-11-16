import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonOfMonth, seasonAt, WEATHER_P, WEATHER_DIM, weatherOf } from '../src/core/season.js';
import { LEAF, LEAF_SPOTS, leavesOf, pickLeaf, SNOWMAN_MAX, SNOWMAN_FACES, addSnowman, meltSnowmen, isValidLeaves, isValidSnowmen, leafSpotsFor, SNOWMAN_GAP, snowmanRoom, snowmenToWire, snowmenFromWire } from '../src/core/seasonplay.js';
import { createState } from '../src/core/state.js';
import { bagOf } from '../src/core/inventory.js';
import { sellPrice } from '../src/core/market.js';
import { isValidState } from '../src/core/save.js';
import { LIKES } from '../src/core/gifts.js';
import { dateOf } from '../src/core/calendar.js';

const START = '2026-10-01';
const fresh = () => ({ ...createState({ name: '치이', look: {} }), clock: { day: 5, t: 0.3 } });

test('계절: 달로 정한다(3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울)', () => {
  assert.deepEqual([12, 1, 2].map(seasonOfMonth), ['winter', 'winter', 'winter']);
  assert.deepEqual([3, 4, 5].map(seasonOfMonth), ['spring', 'spring', 'spring']);
  assert.deepEqual([6, 7, 8].map(seasonOfMonth), ['summer', 'summer', 'summer']);
  assert.deepEqual([9, 10, 11].map(seasonOfMonth), ['autumn', 'autumn', 'autumn']);
  assert.equal(seasonAt(START, 1), 'autumn');
  assert.equal(seasonAt(START, 62), 'winter'); // 12월 1일
  assert.equal(dateOf(START, 62).m, 12);
});

test('날씨: 같은 날은 늘 같고, 새 게임 1~2일째는 맑음', () => {
  for (let d = 1; d < 400; d++) assert.equal(weatherOf(START, d), weatherOf(START, d));
  assert.equal(weatherOf(START, 1), 'sunny');
  assert.equal(weatherOf(START, 2), 'sunny');
  assert.equal(weatherOf('2026-03-10', 1), 'sunny');
  assert.deepEqual(WEATHER_DIM, { sunny: 0, cloudy: 0.15, rain: 0.35, snow: 0.2 });
});

test('날씨: 계절마다 확률대로(±5%), 겨울엔 비가 없고 다른 계절엔 눈이 없다', () => {
  const starts = ['2026-10-01', '2025-03-01', '2027-06-15', '2024-12-20', '2026-01-07'];
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const count = { sunny: 0, cloudy: 0, rain: 0, snow: 0 };
    let n = 0;
    for (const s of starts) for (let d = 3; d < 2400 && n < 5000; d++) {
      if (seasonAt(s, d) !== season) continue;
      count[weatherOf(s, d)]++; n++;
    }
    for (const [w, p] of Object.entries(WEATHER_P[season])) assert.ok(Math.abs(count[w] / n - p) <= 0.05, `${season} ${w}: ${(count[w] / n).toFixed(3)} vs ${p}`);
    if (season === 'winter') assert.equal(count.rain, 0); else assert.equal(count.snow, 0);
  }
  assert.deepEqual(WEATHER_P.autumn, { sunny: 0.6, cloudy: 0.25, rain: 0.15 });
  assert.deepEqual(WEATHER_P.winter, { sunny: 0.45, cloudy: 0.25, snow: 0.3 });
});

test('단풍잎: 가을에 하루 한 자리 한 번, 20원, 다음 날 다시, 치이카와가 좋아한다', () => {
  assert.equal(LEAF, 'mapleleaf');
  assert.equal(LEAF_SPOTS, 12);
  const r = pickLeaf(fresh(), 3, 5, 'autumn');
  assert.equal(r.ok, true);
  assert.equal(bagOf(r.state).items[LEAF], 1);
  assert.deepEqual(leavesOf(r.state, 5).picked, [3]);
  assert.equal(pickLeaf(r.state, 3, 5, 'autumn').ok, false);
  assert.equal(pickLeaf(r.state, 4, 5, 'autumn').ok, true);
  assert.deepEqual(leavesOf(r.state, 6).picked, []);
  assert.equal(pickLeaf(r.state, 3, 6, 'autumn').ok, true);
  assert.equal(pickLeaf(fresh(), 3, 5, 'winter').ok, false);
  assert.equal(pickLeaf(fresh(), 99, 5, 'autumn').ok, false);
  assert.equal(sellPrice(LEAF), 20);
  assert.ok(LIKES.chiikawa.includes(LEAF));
});

test('눈사람: 다섯 개까지(여섯 번째에 가장 오래된 것), 겨울이 아니면 녹는다', () => {
  assert.equal(SNOWMAN_MAX, 5);
  assert.equal(SNOWMAN_FACES, 3);
  let s = fresh();
  for (let i = 0; i < 6; i++) s = addSnowman(s, { x: i, z: 2, face: i % 3 }, 60 + i);
  assert.equal(s.snowmen.length, 5);
  assert.equal(s.snowmen[0].x, 1);
  assert.equal(s.snowmen[4].day, 65);
  assert.equal(meltSnowmen(s, 'winter').snowmen.length, 5);
  assert.deepEqual(meltSnowmen(s, 'spring').snowmen, []);
});

test('낙엽 더미 자리: 나무 밑 후보에서 날짜로 정한 12곳(같은 날은 같고, 다른 날은 다르다)', () => {
  const cands = Array.from({ length: 40 }, (_, i) => ({ x: i, z: -i }));
  const a = leafSpotsFor(cands, START, 70), b = leafSpotsFor(cands, START, 70), c = leafSpotsFor(cands, START, 71);
  assert.equal(a.length, LEAF_SPOTS);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((s) => s.x), c.map((s) => s.x));
  assert.deepEqual(a.map((s) => s.id), [...Array(LEAF_SPOTS).keys()]);
  assert.ok(a.every((s) => cands.some((q) => q.x === s.x && q.z === s.z)));
  assert.equal(new Set(a.map((s) => s.x)).size, LEAF_SPOTS);
  assert.equal(leafSpotsFor(cands.slice(0, 5), START, 70).length, 5, '후보가 모자라면 있는 만큼');
  assert.deepEqual(leafSpotsFor([], START, 70), []);
});

test('눈사람 자리: 다른 눈사람과 SNOWMAN_GAP 안이면 세울 수 없다', () => {
  assert.equal(SNOWMAN_GAP, 1.6);
  assert.equal(snowmanRoom([], 0, 0), true);
  assert.equal(snowmanRoom(undefined, 0, 0), true);
  assert.equal(snowmanRoom([{ x: 1, z: 0, day: 1, face: 0 }], 0, 0), false);
  assert.equal(snowmanRoom([{ x: 2, z: 0, day: 1, face: 0 }], 0, 0), true);
});

test('같이 놀기 눈사람(sm): 주인이 보낸 것을 손님이 그대로 받고, 이상한 값이면 하나도 그리지 않는다', () => {
  const list = [{ x: 1.5, z: -2, day: 60, face: 2 }, { x: -3, z: 4.25, day: 61, face: 0 }];
  const wire = snowmenToWire(list);
  assert.deepEqual(wire, [[1.5, -2, 2], [-3, 4.25, 0]]);
  assert.deepEqual(snowmenFromWire(JSON.parse(JSON.stringify(wire))).map((s) => [s.x, s.z, s.face]), [[1.5, -2, 2], [-3, 4.25, 0]]);
  assert.deepEqual(snowmenFromWire(undefined), [], '보낸 것이 없으면 눈사람도 없다');
  assert.deepEqual(snowmenFromWire('x'), []);
  assert.deepEqual(snowmenFromWire([[1, 2, 7]]), [], '없는 얼굴');
  assert.deepEqual(snowmenFromWire([[1, 'a', 0]]), []);
  assert.equal(snowmenFromWire(Array.from({ length: 9 }, (_, i) => [i, 0, 0])).length, SNOWMAN_MAX, '다섯 개까지만');
  assert.equal(snowmenToWire(undefined), undefined, '눈사람이 없으면 보내지 않는다');
  assert.equal(snowmenToWire([]), undefined);
});

test('계절 놀이: 예전 저장(칸 없음)과 새 저장을 받고, 이상한 값은 거른다', () => {
  const s = fresh();
  assert.equal(isValidState(s), true);
  const ok = addSnowman(pickLeaf(s, 2, 5, 'autumn').state, { x: 3.5, z: -2, face: 1 }, 5);
  assert.equal(isValidState(ok), true);
  assert.equal(isValidLeaves({ day: 5, picked: [0, 11] }), true);
  assert.equal(isValidLeaves({ day: 5, picked: [12] }), false);
  assert.equal(isValidSnowmen([{ x: 1, z: 2, day: 3, face: 0 }]), true);
  assert.equal(isValidSnowmen([{ x: NaN, z: 2, day: 3, face: 0 }]), false);
  assert.equal(isValidSnowmen([{ x: 1, z: 2, day: 3, face: 3 }]), false);
  assert.equal(isValidState({ ...s, snowmen: [{ x: 1, z: 2, day: 3, face: 9 }] }), false);
});
