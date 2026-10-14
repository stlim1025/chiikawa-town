import test from 'node:test';
import assert from 'node:assert/strict';
import { FISH, SIZE_RULES, REEL, waterAt, fishFor, pickFish, rulesOf, startReel, stepReel, fishLength, logFish, fishLogOf, isValidFishLog } from '../src/core/fishing.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
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

test('낚시: 물고기는 가방 물건이고 팔 수 있다, 큰 고기일수록 누를 틈이 짧고 끌어올리기가 어렵다', () => {
  for (const [id, f] of Object.entries(FISH)) {
    assert.equal(itemInfo(id).name, f.name);
    assert.equal(sellPrice(id), f.sell);
    assert.ok(SIZE_RULES[f.size]);
    assert.ok(f.junk || (f.cm && f.cm[0] > 0 && f.cm[1] > f.cm[0]), `${id} 크기`);
  }
  assert.ok(rulesOf('octopus').window < rulesOf('crucian').window && rulesOf('crucian').window < rulesOf('minnow').window);
  const [s, m, b] = SIZE_RULES.map((r) => r.game);
  assert.ok(s.zone > m.zone && m.zone > b.zone, '큰 고기일수록 초록 칸이 좁다');
  assert.ok(s.speed < m.speed && m.speed < b.speed, '큰 고기일수록 빠르다');
  assert.equal(TOOLS.rod.shop, 'tools');
});

// 같은 결과가 나오게 정해진 난수
const seeded = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

test('낚시 놀이: 누르면 초록 칸이 올라가고 떼면 내려오며, 물길 밖으로 나가지 않는다', () => {
  let r = startReel('crucian', () => 0.5);
  const z0 = r.zone;
  for (let k = 0; k < 20; k++) r = stepReel(r, 1 / 60, true, () => 0.5);
  assert.ok(r.zone > z0, '누르면 올라간다');
  for (let k = 0; k < 600; k++) r = stepReel({ ...r, done: null, progress: 0.5 }, 1 / 60, true, () => 0.5);
  assert.ok(r.zone <= 1 - rulesOf('crucian').game.zone + 1e-9, '위 끝에서 멈춘다');
  for (let k = 0; k < 600; k++) r = stepReel({ ...r, done: null, progress: 0.5 }, 1 / 60, false, () => 0.5);
  assert.ok(r.zone >= 0 && r.zone < 0.05, '아래 끝에서 멈춘다');
});

test('낚시 놀이: 잘 따라 누르면 낚고, 큰 고기일수록 어렵고, 손을 놓고 있으면 놓친다(처음 잠깐은 봐준다)', () => {
  // 사람처럼 누르기: delay 초 전에 본 모습으로(눈으로 보고 손이 따라가는 늦음), every 초마다 누를지 정한다.
  // k: 칸이 움직이는 기세까지 보고 미리 떼는 정도(익숙할수록 크다). 늦음 없이 보는 기계로 맞추면 사람에게는 너무 어려워진다
  const play = (id, { delay, k, every }, n = 60) => {
    const rnd = seeded(5), g = rulesOf(id).game;
    let won = 0;
    for (let i = 0; i < n; i++) {
      let r = startReel(id, rnd), hold = false, acc = 0;
      const seen = [];
      while (!r.done && r.t < 60) {
        seen.push(r);
        const v = seen[Math.max(0, seen.length - 1 - Math.round(delay * 60))];
        acc += 1 / 60;
        if (acc >= every) { acc = 0; hold = v.fish - (v.zone + g.zone / 2) - k * v.vz > 0; }
        r = stepReel(r, 1 / 60, hold, rnd);
      }
      if (r.done === 'caught') won++;
    }
    return won / n;
  };
  const ids = ['minnow', 'crucian', 'catfish'];
  const usual = ids.map((id) => play(id, { delay: 0.2, k: 0.12, every: 0.08 }));
  assert.ok(usual[0] >= 0.95 && usual[1] >= 0.9 && usual[2] >= 0.6, `보통 사람은 대부분 낚는다: ${usual}`);
  const skilled = ids.map((id) => play(id, { delay: 0.12, k: 0.22, every: 0.05 }));
  assert.ok(skilled.every((w) => w >= 0.9), `익숙하면 큰 고기도 낚는다: ${skilled}`);
  const casual = ids.map((id) => play(id, { delay: 0.25, k: 0, every: 0.12 }));
  assert.ok(casual[0] >= 0.9 && casual[0] >= casual[1] && casual[1] > casual[2], `대충 누르면 큰 고기일수록 덜 잡힌다: ${casual}`);
  assert.ok(casual[2] < 0.5, `큰 고기는 대충 눌러서는 잘 안 잡힌다: ${casual[2]}`);
  let r = startReel('catfish', () => 0.95);
  const p0 = r.progress;
  for (let k = 0; k < Math.floor(REEL.grace * 60) - 2; k++) r = stepReel(r, 1 / 60, false, () => 0.95);
  assert.ok(r.progress >= p0 - 1e-9, '처음 잠깐은 게이지가 빠지지 않는다');
  while (!r.done && r.t < 30) r = stepReel(r, 1 / 60, false, () => 0.95);
  assert.equal(r.done, 'lost');
  assert.equal(stepReel(r, 1, true).done, 'lost', '끝난 놀이는 그대로');
});

test('낚시 기록: 처음 잡은 것 · 가장 큰 것을 남기고 저장에서 확인한다', () => {
  for (let k = 0; k < 50; k++) {
    const cm = fishLength('catfish', seeded(k + 1));
    assert.ok(cm >= FISH.catfish.cm[0] && cm <= FISH.catfish.cm[1] && Number.isInteger(cm));
  }
  assert.equal(fishLength('can'), null);
  let s = createState({ name: '나', look: {} });
  let r = logFish(s, 'catfish', 40);
  assert.ok(r.first && !r.best);
  r = logFish(r.state, 'catfish', 38);
  assert.ok(!r.first && !r.best);
  r = logFish(r.state, 'catfish', 52);
  assert.ok(!r.first && r.best);
  r = logFish(r.state, 'can', null);
  s = r.state;
  assert.deepEqual(fishLogOf(s), { catfish: { n: 3, best: 52 }, can: { n: 1 } });
  assert.ok(isValidFishLog(s.fishLog) && isValidState(s));
  assert.equal(isValidFishLog({ nope: { n: 1 } }), false);
  assert.equal(isValidFishLog({ minnow: { n: 0 } }), false);
  assert.equal(isValidFishLog({ minnow: { n: 1, best: -3 } }), false);
  assert.equal(isValidState({ ...s, fishLog: [] }), false);
});
