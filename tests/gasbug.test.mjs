import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTERS, MONSTER_ORDER, GAS_ATTACK, PLAYER_IFRAME } from '../src/core/combat.js';
import { itemInfo } from '../src/core/inventory.js';
import { sellPrice } from '../src/core/market.js';

test('줄무늬 가스벌레: 바위산 몬스터, 공격은 더듬이 독가스, 전리품은 더듬이 방울(60원)', () => {
  const M = MONSTERS.gasbug;
  assert.equal(M.region, 'mountain');
  assert.equal(M.attack, 'gas');
  assert.equal(M.atk, '더듬이 독가스');
  assert.equal(M.drop, 'antennaball');
  const i = MONSTER_ORDER.indexOf('gasbug');
  assert.ok(i > MONSTER_ORDER.indexOf('ram') && i < MONSTER_ORDER.indexOf('moth'), '도감에서 바위산 몬스터 끝에');
  assert.equal(itemInfo('antennaball').name, '더듬이 방울');
  assert.equal(sellPrice('antennaball'), 60);
});

/**
 * 반응이 react 초 늦는 사람(걸음 3.2): 몬스터는 원점, 나는 startDist 앞에 서 있다. 예고가 시작되고 react 초 뒤부터 곧장 뒤로 물러난다.
 * 가스 자리는 굳기(wind × lock) 전까지 나를 따라오고(몸에서 reach 보다 멀면 그만큼만), 예고가 끝나면 그 자리에 가스가 퍼진다.
 * 퍼지는 순간 가스 밖(반지름 + 내 몸)에 있으면 피한 것(실제로는 0.2초 뒤부터 아파서 조금 더 여유가 있다).
 */
function escapes(react, startDist) {
  const A = GAS_ATTACK, SPEED = 3.2, ME = 0.32, dt = 1 / 240, lockT = A.wind * A.lock;
  let z = startDist, spot = null;
  for (let t = 0; t < A.wind; t += dt) {
    if (spot === null && t >= lockT) spot = Math.min(z, A.reach);
    if (t >= react) z += SPEED * dt;
  }
  return z - (spot ?? Math.min(z, A.reach)) >= A.radius + ME;
}

test('더듬이 독가스: 반응이 0.2초(± 0.05) 늦어도 예고를 보고 물러나면 피하고, 가만히 있으면 맞는다', () => {
  for (const react of [0.15, 0.2, 0.25]) {
    for (const d of [0.8, 1.5, 2.5, 3.5, GAS_ATTACK.range]) assert.ok(escapes(react, d), `반응 ${react}초, 거리 ${d}`);
  }
  assert.ok(!escapes(99, 1.5), '가만히 있으면 가스 안');
  assert.ok(GAS_ATTACK.reach < GAS_ATTACK.range, '멀리서는 내 앞까지만 뿜는다');
});

test('더듬이 독가스: 가스 안에 그대로 서 있어도 세 번(15) 정도 — 한 방 공격보다 조금 아픈 정도, 매 번 무적 시간이 끝난 뒤', () => {
  const A = GAS_ATTACK, ticks = Math.ceil((A.life - 0.2) / A.tick);
  assert.ok(A.tick > PLAYER_IFRAME, '틱 사이가 무적 시간보다 길다(같으면 무적에 막혀 틱이 빠진다)');
  assert.equal(ticks * MONSTERS.gasbug.dmg, 15);
  assert.ok(ticks * MONSTERS.gasbug.dmg <= Math.max(...['turtle', 'pebble', 'ram'].map((k) => MONSTERS[k].dmg)) + 3);
});
