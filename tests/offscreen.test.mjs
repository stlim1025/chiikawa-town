import test from 'node:test';
import assert from 'node:assert/strict';
import { liveOffscreen } from '../src/core/offscreen.js';
import { WAKE, wakeHourOf } from '../src/core/brain.js';
import { VILLAGERS, WAKE_HOUR, MAX_JOBS_PER_DAY, MEAL_PRICE, villagerOf, villagerPay } from '../src/core/villagers.js';
import { JOB_TYPES } from '../src/core/jobs.js';
import { createState } from '../src/core/state.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', ...o });
/** 같은 씨앗이면 같은 하루(테스트가 매번 같게). */
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const KINDS = Object.keys(VILLAGERS);
const payOf = (title) => villagerPay(Object.values(JOB_TYPES).find((t) => t.title === title).id);

test('아침엔 저마다 다른 때 일어난다(랏코가 먼저, 쿠리만쥬는 늦잠)', () => {
  for (const k of KINDS) {
    assert.ok(wakeHourOf(k) >= WAKE_HOUR, `${k} 는 밤잠 시간에 깨지 않는다`);
    assert.ok(wakeHourOf(k) < 9, `${k} 는 너무 늦게 일어나지 않는다`);
  }
  assert.equal(Math.min(...KINDS.map(wakeHourOf)), WAKE.rakko);
  assert.equal(Math.max(...KINDS.map(wakeHourOf)), WAKE.kurimanju);
  assert.equal(wakeHourOf('labor'), WAKE_HOUR); // 모르는 친구는 보통 때
});

test('밤에 잠들면 친구들도 이미 자는 중이라 아무 일도 없다', () => {
  const s = fresh();
  for (const fromHour of [21, 23.5, 2, 6]) {
    const r = liveOffscreen(s, {}, { day: 1, fromHour, random: seeded(1) });
    assert.equal(r.state, s);
    assert.deepEqual(r.events, []);
  }
});

test('낮에 잠들면 친구들은 밤 9시까지 일하고 먹고 수다를 떤다', () => {
  const s = fresh();
  const r = liveOffscreen(s, {}, { day: 1, fromHour: 10, random: seeded(7) });
  const types = new Set(r.events.map((e) => e.type));
  assert.ok(types.has('job'), '누군가는 일했다');
  assert.ok(types.has('meal'), '누군가는 라멘을 먹었다');
  for (const e of r.events) {
    assert.ok(KINDS.includes(e.who), `친구가 한 일: ${e.who}`);
    assert.ok(e.hour >= 10 && e.hour < 21, `저녁 9시 전: ${e.hour}`);
    if (e.with) assert.ok(KINDS.includes(e.with) && e.with !== e.who);
  }
});

test('번 돈 · 쓴 돈이 지갑과 맞고, 일감은 하루 셋까지, 모몽가는 일하지 않는다', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = fresh();
    const r = liveOffscreen(s, {}, { day: 1, fromHour: 8, random: seeded(seed) });
    for (const k of KINDS) {
      const before = villagerOf(s, k, 1), after = villagerOf(r.state, k, 1);
      const jobs = r.events.filter((e) => e.type === 'job' && e.who === k);
      const meals = r.events.filter((e) => e.type === 'meal' && (e.who === k || e.with === k)).length;
      const earned = jobs.reduce((a, e) => a + payOf(e.title), 0);
      const spent = r.events.filter((e) => e.type === 'buy' && e.who === k).reduce((a, e) => a + e.cost, 0); // 목표를 산 값
      assert.ok(jobs.length <= MAX_JOBS_PER_DAY, `${k} 일감 ${jobs.length}개`);
      assert.equal(after.jobs, before.jobs + jobs.length);
      assert.ok(after.money >= 0 && after.money <= before.money + earned - spent);
      assert.ok(after.money >= before.money + earned - spent - meals * MEAL_PRICE, `${k} 지갑이 맞다`);
      assert.ok(after.energy >= 0 && after.energy <= 100);
    }
    assert.ok(!r.events.some((e) => e.type === 'job' && e.who === 'momonga'));
  }
});

test('첫날 안내 중에는 일감을 가져가지 않고, 빼 둔 친구는 끼지 않는다', () => {
  const s = fresh({ tutorial: 'board' });
  for (let seed = 1; seed <= 10; seed++) {
    const r = liveOffscreen(s, {}, { day: 1, fromHour: 9, random: seeded(seed), skip: ['hachiware'] });
    assert.ok(!r.events.some((e) => e.type === 'job'));
    assert.ok(!r.events.some((e) => e.who === 'hachiware' || e.with === 'hachiware'));
    assert.equal(r.minds.hachiware, undefined);
  }
});

test('마음(심심함 · 외로움)도 같이 지나고, 기억 같은 다른 칸은 그대로 둔다', () => {
  const mem = [{ type: 'chat' }];
  const minds = { chiikawa: { fun: 0.2, social: 0.2, mem, doing: null } };
  const r = liveOffscreen(fresh(), minds, { day: 1, fromHour: 15, random: seeded(3) });
  assert.equal(r.minds.chiikawa.mem, mem);
  assert.ok(r.minds.chiikawa.fun >= 0 && r.minds.chiikawa.fun <= 1);
  assert.equal(minds.chiikawa.fun, 0.2, '넘겨준 마음은 바꾸지 않는다');
  for (const k of KINDS) assert.ok(r.minds[k], `${k} 의 마음`);
});
