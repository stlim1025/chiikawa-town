import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Q = await import(G + 'quests.js');
const St = await import(G + 'state.js');
const F = await import(G + 'friends.js');
const H = await import(G + 'home.js');
const { SIGNAL } = await import('../src/stories/nantoka.js');

const at = (day, hour) => ({ day, t: (hour - 6) / 24 });
const fresh = (day = 20, hour = 11) => ({ ...St.createState({ name: 't', look: {} }), tutorial: 'done', clock: at(day, hour) });
const withHearts = (s, kind, h) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: F.ptsForHearts(h), talk: 0, play: 0, gift: true } } });
const friendly = (s, h = 3) => ['hachiware', 'chiikawa', 'usagi'].reduce((acc, k) => withHearts(acc, k, h), s);

test('난토카바니아: 하치와레가 권하는 사이드스토리, 서쪽 숲 오솔길 장면 하나, 보상은 300원 · 친밀도 · 인형 세트', () => {
  assert.deepEqual(Q.checkQuestData(), []);
  const N = Q.QUESTS.nantoka;
  assert.equal(N.giver, 'hachiware');
  assert.ok(N.side);
  assert.equal(N.steps.length, 1);
  assert.equal(N.steps[0].place, 'dollPath');
  assert.equal(N.steps[0].scene, 'nantoka');
  assert.ok(Q.PLACES.dollPath);
  assert.deepEqual(N.reward, { bond: 3, money: 300, friends: { chiikawa: 2, usagi: 2 }, furniture: 'dollset' });
  assert.ok(H.FURNITURE.dollset && H.FURNITURE.dollset.gift, '가게에서는 안 파는 선물 가구');
});

test('난토카바니아: 스무째 날부터 오전 10시 ~ 오후 5시, 하치와레 · 치이카와 · 우사기 모두 하트 3개부터', () => {
  const s = friendly(fresh(20, 11));
  assert.ok(Q.canOffer(s, 'nantoka'));
  assert.ok(!Q.canOffer(friendly(fresh(19, 11)), 'nantoka'), '열아홉째 날은 아직');
  assert.ok(!Q.canOffer({ ...s, clock: at(20, 18) }, 'nantoka'), '저녁에는 없다(숲이라 낮에)');
  assert.ok(!Q.canOffer(withHearts(s, 'usagi', 2), 'nantoka'), '우사기와도 하트 3개부터');
  assert.ok(!Q.canOffer(withHearts(s, 'chiikawa', 2), 'nantoka'), '치이카와와도 하트 3개부터');
  assert.ok(!Q.canOffer(withHearts(s, 'hachiware', 2), 'nantoka'), '하치와레와 하트 3개부터');
  assert.ok(!Q.canOffer({ ...s, tutorial: 'board' }, 'nantoka'), '첫날 안내 중에는 없다');
});

test('난토카바니아: 받으면 서쪽 숲 오솔길에 가는 일이 생기고, 다 보면 보상(인형 세트가 집에)', () => {
  let s = Q.startQuest(friendly(fresh(20, 11)), 'nantoka');
  assert.equal(Q.stepOf(s, 'nantoka').type, 'visit');
  const money = s.money;
  s = Q.giveReward(s, 'nantoka', 20).state;
  assert.equal(s.money, money + 300);
  assert.equal(H.homeOf(s).owned.dollset, 1);
});

/**
 * 「지금!」 신호 놀이(ui/minigame.js timing 과 같은 바늘): 바늘이 초록 칸에 들어오는 걸 보고 누르는데, 반응이 0.2초(± 0.05) 늦는 사람.
 * 한 번에 맞힐 확률이 넉넉해야 하고(늦게 반응하는 사람 기준), 바로 누르는 사람은 늘 맞힌다.
 */
function trySignal(delay, jitter, seed) {
  let rnd = seed;
  const random = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const dt = 1 / 120;
  let ph = random() * Math.PI * 2, p = (1 - Math.cos(ph)) / 2, pressAt = null;
  for (let t = 0; t < 8; t += dt) {
    const prev = p;
    ph += dt * SIGNAL.speed * Math.PI;
    p = (1 - Math.cos(ph)) / 2;
    const entered = (prev < SIGNAL.zone[0] && p >= SIGNAL.zone[0]) || (prev > SIGNAL.zone[1] && p <= SIGNAL.zone[1]);
    if (pressAt == null && entered) pressAt = t + delay + (random() - 0.5) * 2 * jitter;
    if (pressAt != null && t >= pressAt) return p >= SIGNAL.zone[0] && p <= SIGNAL.zone[1];
  }
  return false;
}
test('난토카바니아 「지금!」: 반응이 0.2초 늦어도 한 번에 맞힐 때가 많고, 바로 누르면 늘 맞힌다', () => {
  const runs = 400;
  let late = 0, quick = 0;
  for (let i = 1; i <= runs; i++) { if (trySignal(0.2, 0.05, i * 7919)) late++; if (trySignal(0.05, 0.02, i * 104729)) quick++; }
  assert.ok(late / runs >= 0.6, `0.2초 늦게: ${(late / runs * 100).toFixed(0)}%`);
  assert.equal(quick, runs, '바로 누르면 다 맞힌다');
});
