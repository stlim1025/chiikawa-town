import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIZES, RAFFLE_PRICE, DAILY_TICKETS, raffleOf, earnTicket, pickPrize, drawRaffle, isValidRaffle } from '../src/core/raffle.js';
import { itemInfo, countOf } from '../src/core/inventory.js';
import { createState } from '../src/core/state.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), ...o });

test('경품 추첨 상품: 1등 전골 세트부터 참가상 휴지까지, 모두 가방에 들어가는 물건', () => {
  assert.equal(PRIZES[0].item, 'hotpot');
  assert.equal(itemInfo('hotpot').name, '전골 세트');
  for (const P of PRIZES) assert.ok(itemInfo(P.item), P.item);
  const w = PRIZES.map((P) => P.weight);
  for (let i = 1; i < w.length; i++) assert.ok(w[i] >= w[i - 1], '좋은 상품일수록 드물다');
});

test('구슬은 무게대로 나온다: 1등은 드물고 참가상이 가장 흔하다', () => {
  assert.equal(pickPrize(() => 0).id, PRIZES[0].id);
  assert.equal(pickPrize(() => 0.9999).id, PRIZES[PRIZES.length - 1].id);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = {};
  for (let i = 0; i < 4000; i++) { const id = pickPrize(rnd).id; n[id] = (n[id] || 0) + 1; }
  assert.ok(n.gold < n.white / 5, JSON.stringify(n));
});

test('물건을 사면 추첨권을 받는다(하루에 정해진 장수까지)', () => {
  let s = fresh();
  for (let i = 0; i < DAILY_TICKETS + 2; i++) s = earnTicket(s, 4).state;
  assert.equal(raffleOf(s).tickets, DAILY_TICKETS);
  assert.equal(earnTicket(s, 4).earned, false);
  const next = earnTicket(s, 5);
  assert.equal(next.earned, true);
  assert.equal(raffleOf(next.state).tickets, DAILY_TICKETS + 1);
});

test('추첨권이 있으면 그걸로, 없으면 돈을 내고 돌린다. 상품은 가방에', () => {
  let s = earnTicket(fresh({ money: 0 }), 1).state;
  const a = drawRaffle(s, () => 0);
  assert.equal(a.ok, true);
  assert.equal(a.paid, 'ticket');
  assert.equal(raffleOf(a.state).tickets, 0);
  assert.equal(countOf(a.state, 'hotpot'), 1);
  const b = drawRaffle(a.state, () => 0.99);
  assert.deepEqual([b.ok, b.reason], [false, 'money']);
  const c = drawRaffle({ ...a.state, money: RAFFLE_PRICE + 5 }, () => 0.99);
  assert.equal(c.paid, 'money');
  assert.equal(c.state.money, 5);
  assert.equal(countOf(c.state, PRIZES[PRIZES.length - 1].item), 1);
});

test('가방이 꽉 차 상품을 못 넣으면 돌리지 않는다(추첨권 · 돈 그대로)', () => {
  const full = earnTicket(fresh(), 1).state;
  const s = { ...full, bag: { items: { hotpot: 99, fruitbasket: 99, cookies: 99, candy: 99, tissue: 99 }, clean: {} } };
  const r = drawRaffle(s, () => 0);
  assert.deepEqual([r.ok, r.reason], [false, 'bag']);
  assert.equal(raffleOf(r.state).tickets, 1);
});

test('추첨 저장 모양 검사', () => {
  assert.equal(isValidRaffle({ tickets: 2, day: 3, got: 1 }), true);
  assert.equal(isValidRaffle({ tickets: -1, day: 3, got: 1 }), false);
  assert.equal(isValidRaffle(null), false);
});

test('마을 배치: 경품 추첨 자리가 있고, 모든 건물 자리에 문 앞 · 크기가 있다', async () => {
  const { LOTS, doorSpot, lotRadius, lotById } = await import('../src/core/layout.js');
  assert.ok(lotById('raffle'), '경품 추첨 자리');
  for (const lot of LOTS) {
    const d = doorSpot(lot);
    assert.ok(Number.isFinite(d.x) && Number.isFinite(d.z), `${lot.id} 문 앞`);
    assert.ok(lotRadius(lot) > 0, `${lot.id} 크기`);
  }
});
