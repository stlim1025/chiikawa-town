import test from 'node:test';
import assert from 'node:assert/strict';
import { ANOKO_SIZE, ANOKO_SHIELD, ANOKO_TURN, ANOKO_ATK, frontGuard, inSweep, rideKind, isValidRide } from '../src/core/anoko.js';

const SPEED = 3.2, ME = 0.32, REACTS = [0.15, 0.2, 0.25];
const close = (a, b) => Math.abs(a - b) < 1e-9;

test('frontGuard: 정면 60도 안은 1/3, 옆과 뒤는 그대로', () => {
  assert.ok(close(ANOKO_SHIELD.front, 1 / 3));
  assert.ok(close(ANOKO_SHIELD.arc, Math.PI / 3));
  assert.ok(close(frontGuard(0, 0, 0, 0, 2), 1 / 3), '바로 앞');
  assert.ok(close(frontGuard(0, 0, 0, 1.6, 1.0), 1 / 3), '앞 58도쯤');
  assert.equal(frontGuard(0, 0, 0, 2, 0), 1, '옆');
  assert.equal(frontGuard(0, 0, 0, 0, -2), 1, '뒤');
  assert.ok(close(frontGuard(Math.PI / 2, 5, 5, 7, 5), 1 / 3), '오른쪽(+x)을 보면 +x 쪽이 앞');
  assert.ok(ANOKO_TURN > 0 && ANOKO_TURN < 9, '다른 보스(9 ~ 10)보다 천천히 돈다');
});

test('inSweep: 꼬리 휩쓸기는 뒤쪽 반원만, 앞은 안전', () => {
  assert.equal(inSweep(0, 0, 0, 0, -2, 3.2), true);
  assert.equal(inSweep(0, 0, 0, 2, -0.1, 3.2), true);
  assert.equal(inSweep(0, 0, 0, 0, 2, 3.2), false);
  assert.equal(inSweep(0, 0, 0, 0, -3.6, 3.2), false);
});

test('rideKind: 탈것 버튼이 탈 것', () => {
  const car = { owned: ['car'], light: 'off' }, none = { owned: [], light: 'off' }, tamed = { anoko: { step: 4, base: 0, done: 53 } };
  assert.equal(rideKind({ tools: none, quests: {} }), null);
  assert.equal(rideKind({ tools: car, quests: {} }), 'car');
  assert.equal(rideKind({ tools: none, quests: tamed }), 'anoko');
  assert.equal(rideKind({ tools: car, quests: tamed, ride: 'car' }), 'car');
  assert.equal(rideKind({ tools: car, quests: tamed, ride: 'anoko' }), 'anoko');
  assert.equal(rideKind({ tools: car, quests: tamed }), 'anoko', '고르기 전에는 새로 얻은 아노코');
  assert.equal(rideKind({ tools: none, quests: tamed, ride: 'car' }), 'anoko', '자동차가 없으면 아노코');
});

test('isValidRide: car, anoko, 없음만', () => {
  for (const v of ['car', 'anoko', undefined]) assert.equal(isValidRide(v), true, String(v));
  for (const v of ['bike', 1, null]) assert.equal(isValidRide(v), false, String(v));
});

/** 앞발 할퀴기(combo): 붙어 있다가(d0) 예고가 뜨고 react 초 뒤부터 뒤로 걷는다. 매번 아노코는 0.32 까지 다가와 할퀴고, 몸 + reach 안이면 맞는다(world/monsters.js 의 combo). */
function clawEscapes(react, d0) {
  const A = ANOKO_ATK.claw, dt = 1 / 240;
  let d = d0;
  for (let t = 0; t < A.wind; t += dt) if (t >= react) d += SPEED * dt;
  for (let i = 0; i < A.n; i++) {
    d -= Math.min(0.32, Math.max(0, d - ANOKO_SIZE - 0.3));
    if (d < ANOKO_SIZE + A.reach) return false;
    d += SPEED * A.gap;
  }
  return true;
}
/** 꼬리 휩쓸기(sweep): 아노코 뒤 d0 에서 예고 뒤 react 초부터 바깥으로 걸어, 예고가 끝날 때 뒤쪽 반원 밖이면 피한 것. */
function tailEscapes(react, d0) {
  const A = ANOKO_ATK.tail, d = d0 + Math.max(0, A.wind - react) * SPEED;
  return !inSweep(0, 0, 0, 0, -d, A.radius);
}
/** 뛰어 덮치기(stomp): 곧장 달아나는 나를 wind × lock 에 겨눠 굳히고, 착지(wind + air) 때 그 자리 반지름 + 내 몸 밖이면 피한 것. */
function leapEscapes(react, d0) {
  const A = ANOKO_ATK.leap, at = (t) => d0 + Math.max(0, t - react) * SPEED;
  return Math.abs(at(A.wind + A.air) - at(A.wind * A.lock)) >= A.radius + ME;
}
/**
 * 솜털 고리(shoot, ring): 예고를 보고 react 초 뒤부터 옆으로 걷던 나에게 하나가 곧장 겨눠 날아온다(탄은 몸 + 0.15 에서 나온다).
 * 고리가 내 거리까지 오는 동안 옆으로 움직여 틈 한가운데(gap/2)에 멈춘다 — 그때 양쪽 탄과 r + 내 몸보다 멀면 피한 것.
 * 두 겹(twice)은 반 칸 비틀어 와서 내가 멈춘 틈 한가운데를 노린다: 그 고리를 보고 react 초 뒤에 다시 반 칸 옮긴다.
 */
function ringEscapes(A, react, d) {
  const gap = d * A.spread, clear = A.r + ME, t1 = (d - ANOKO_SIZE - 0.15) / A.speed;
  if (Math.min(gap / 2, t1 * SPEED) < clear) return false;
  if (!A.twice) return true;
  return Math.min(gap / 2, Math.max(0, t1 - react) * SPEED) >= clear;
}

test('앞발 할퀴기: 0.2초(± 0.05) 늦게 물러나도 피한다', () => {
  for (const r of REACTS) for (const d0 of [ANOKO_SIZE + 0.3, ANOKO_ATK.claw.range]) assert.ok(clawEscapes(r, d0), `반응 ${r}, 거리 ${d0}`);
  assert.ok(!clawEscapes(99, ANOKO_SIZE + 0.3), '가만히 있으면 맞는다');
});

test('꼬리 휩쓸기: 0.2초(± 0.05) 늦게 바깥으로 걸어도 피한다', () => {
  for (const r of REACTS) for (const d0 of [ANOKO_SIZE + 0.3, 2.2, 2.6]) assert.ok(tailEscapes(r, d0), `반응 ${r}, 거리 ${d0}`);
  assert.ok(!tailEscapes(99, 2), '가만히 있으면 맞는다');
});

test('뛰어 덮치기: 0.2초(± 0.05) 늦게 달아나도 피한다', () => {
  for (const r of REACTS) for (const d0 of [0.8, 3, 6]) assert.ok(leapEscapes(r, d0), `반응 ${r}, 거리 ${d0}`);
  assert.ok(!leapEscapes(99, 3), '가만히 있으면 맞는다');
});

test('솜털 뭉치 날리기: 0.2초(± 0.05) 늦어도 틈으로 피한다(두 겹은 3.5 이상 떨어져서)', () => {
  for (const r of REACTS) {
    for (const d of [3, 4, 6]) assert.ok(ringEscapes(ANOKO_ATK.fluff, r, d), `한 겹, 반응 ${r}, 거리 ${d}`);
    for (const d of [3.5, 4, 6]) assert.ok(ringEscapes(ANOKO_ATK.fluff2, r, d), `두 겹, 반응 ${r}, 거리 ${d}`);
  }
  assert.ok(ANOKO_ATK.fluff2.twice > 0 && ANOKO_ATK.fluff2.ring && ANOKO_ATK.fluff.ring);
});
