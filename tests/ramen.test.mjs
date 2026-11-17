import assert from 'node:assert/strict';
import { test } from 'node:test';
const R = await import('../src/core/ramen.js');
test('quiz: 6 questions, 4 distinct choices, answer valid', () => {
  for (let seed = 0; seed < 300; seed++) {
    let x = seed * 7919 + 1; const rnd = () => { x = (x * 16807) % 2147483647; return (x % 100000) / 100000; };
    const qs = R.ramenQuiz(6, rnd);
    assert.equal(qs.length, 6, 'seed ' + seed);
    for (const q of qs) {
      assert.equal(q.choices.length, 4, q.q + ' :: ' + q.choices.join(' | '));
      assert.equal(new Set(q.choices).size, 4, 'dup ' + q.q + ' :: ' + q.choices.join(' | '));
      assert.ok(q.answer >= 0 && q.answer < 4);
    }
    assert.equal(new Set(qs.map((q) => q.q)).size, 6, 'repeat question seed ' + seed);
  }
});
test('quiz answers are actually correct', () => {
  const qs = R.ramenQuiz(6, Math.random);
  for (const q of qs) if (q.q.startsWith('로우 라멘에')) assert.equal(q.choices[q.answer], '2번');
});
test('boil question format consistent', () => {
  for (let i = 0; i < 200; i++) for (const q of R.ramenQuiz(6)) if (q.q.includes('몇 초 삶아야')) for (const c of q.choices) assert.match(c, /^\d\.\d초$/);
});

test('알바 손님 흐름: 처음 둘은 금방, 그다음은 3.5~5.5초 간격, 자리가 차면 잠깐 뒤 다시, 끝나기 10초 전부터는 안 받는다', () => {
  const D = 90, mid = () => 0.5;
  assert.deepEqual(R.ARRIVE_FIRST, [0.6, 2.5]);
  assert.deepEqual(R.arrivalTick(0.6, { arrived: 0, full: false, duration: D }, mid), { spawn: true, next: 2.5 });
  const third = R.arrivalTick(2.5, { arrived: 1, full: false, duration: D }, mid);
  assert.equal(third.spawn, true);
  assert.equal(third.next, 2.5 + 4.5);
  assert.equal(R.arrivalTick(10, { arrived: 5, full: false, duration: D }, () => 0).next, 10 + 3.5);
  assert.equal(R.arrivalTick(10, { arrived: 5, full: false, duration: D }, () => 0.9999).next.toFixed(2), (10 + 5.5).toFixed(2));
  assert.deepEqual(R.arrivalTick(30, { arrived: 6, full: true, duration: D }, mid), { spawn: false, next: 30 + R.FULL_RETRY });
  assert.deepEqual(R.arrivalTick(D - R.LAST_CALL, { arrived: 9, full: false, duration: D }, mid), { spawn: false, next: Infinity });
});

test('손님은 42초 기다려 주고, 많이 받을수록 조금씩 급해지지만 28초 아래로는 안 줄어든다', () => {
  assert.equal(R.customerWait(0), 42);
  assert.ok(R.customerWait(10) < R.customerWait(5));
  assert.equal(R.customerWait(100), 28);
});

test('고를 손님: 가장 오래 기다린 손님, 아무도 없으면 -1', () => {
  assert.equal(R.oldestSeat([null, { arrived: 5 }, { arrived: 2 }]), 2);
  assert.equal(R.oldestSeat([{ arrived: 1 }, null, { arrived: 3 }]), 0);
  assert.equal(R.oldestSeat([null, null, null]), -1);
});

/** 한 그릇 만드는 데 드는 초: 주문 읽기 → 수프 · 면 · 토핑 누르기(면이 삶아지는 동안 토핑) → 다 삶아지면 react 초 뒤 건지기 → 내기. */
function bowlTime(h, rid) {
  const it = R.RECIPES[rid].items, nd = it.thin ? 'thin' : 'thick';
  const others = Object.entries(it).filter(([k]) => k !== nd).reduce((a, [, n]) => a + n, 0); // 수프 + 토핑 누르는 수
  if (h.noodleFirst) return h.think + h.click + Math.max(R.BOIL[nd], others * h.click) + h.react + 2 * h.click;
  return h.think + 2 * h.click + Math.max(R.BOIL[nd], (others - 1) * h.click) + h.react + 2 * h.click; // 수프 먼저, 면, 토핑
}
/** 알바 한 번(90초)을 사람 모델로 흉내 낸다: 손님이 오면 늦게 알아채고, 저절로 골라진 손님(가장 오래 기다린 손님)부터 만든다. */
function shift(h, random, duration = 90) {
  const ids = Object.keys(R.RECIPES), seats = [null, null, null];
  let next = R.ARRIVE_FIRST[0], arrived = 0, served = 0, missed = 0, idle = 0, earned = 0, work = null;
  const dt = 0.05;
  for (let i = 0; i * dt < duration; i++) {
    const t = i * dt;
    if (t >= next) {
      const a = R.arrivalTick(t, { arrived, full: seats.every(Boolean), duration }, random);
      if (a.spawn) {
        const free = seats.map((c, k) => (c ? -1 : k)).filter((k) => k >= 0);
        seats[free[Math.floor(random() * free.length)]] = { arrived: t, wait: R.customerWait(served), order: ids[Math.floor(random() * ids.length)] };
        arrived++;
      }
      next = a.next;
    }
    seats.forEach((c, k) => { if (c && t - c.arrived >= c.wait) { seats[k] = null; missed++; if (work && work.seat === k) work = null; } });
    if (!work) { const k = R.oldestSeat(seats); if (k >= 0) work = { seat: k, done: t + h.react + bowlTime(h, seats[k].order) }; }
    if (work && t >= work.done) {
      const c = seats[work.seat];
      earned += R.servePay(1 - (t - c.arrived) / c.wait);
      served++; seats[work.seat] = null; work = null;
    }
    if (!seats.some(Boolean)) idle += dt;
  }
  return { arrived, served, missed, idle, pay: R.shiftPay({ earned }) };
}
const PEOPLE = {
  beginner: { think: 2.6, click: 1.0, react: 0.3 }, // 처음 하는 사람: 한 그릇 10초 남짓
  slow: { think: 1.8, click: 0.8, react: 0.25 },
  average: { think: 1.0, click: 0.55, react: 0.2 }, // 보통 사람(반응 0.2초 늦음): 한 그릇 7초쯤
  skilled: { think: 0.5, click: 0.35, react: 0.12, noodleFirst: true }
};
function shiftAvg(h, runs = 200) {
  let x = 12345;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const sum = { arrived: 0, served: 0, missed: 0, idle: 0, pay: 0 };
  for (let i = 0; i < runs; i++) { const r = shift(h, rnd); for (const k in sum) sum[k] += r[k] / runs; }
  return sum;
}

test('알바: 보통 사람도 익숙한 사람도 손님을 기다리며 놀지 않는다(예전 6~10초 간격에선 90초 가운데 15초, 34초를 놀았다)', () => {
  const avg = shiftAvg(PEOPLE.average), pro = shiftAvg(PEOPLE.skilled);
  assert.ok(avg.idle < 3, `보통 사람이 손님 없이 ${avg.idle.toFixed(1)}초`);
  assert.ok(pro.idle < 3, `익숙한 사람이 손님 없이 ${pro.idle.toFixed(1)}초`);
  assert.ok(avg.served >= 11.5, `보통 사람 ${avg.served.toFixed(1)}그릇(예전 10그릇 남짓)`);
  assert.ok(pro.served >= 15, `익숙한 사람 ${pro.served.toFixed(1)}그릇(예전 10그릇 남짓)`);
});

test('알바: 손님이 많아져도 처음 하는 사람과 느린 사람이 손님을 거의 놓치지 않고, 보통 사람 벌이는 크게 안 바뀐다', () => {
  for (const who of ['beginner', 'slow', 'average']) {
    const r = shiftAvg(PEOPLE[who]);
    assert.ok(r.missed < 0.5, `${who}: 놓친 손님 ${r.missed.toFixed(2)}`);
  }
  const pay = shiftAvg(PEOPLE.average).pay;
  assert.ok(pay >= 450 && pay < 950, `보통 사람 한 번 ${pay.toFixed(0)}원`);
});
