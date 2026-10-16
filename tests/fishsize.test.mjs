import test from 'node:test';
import assert from 'node:assert/strict';
import { FISH, SIZE_RATE, sizeRate, fishPrice, fishLength, noteFishCm, fishSizesOf, grillFish } from '../src/core/fishing.js';
import { addItem, takeItem, countOf, isValidBag } from '../src/core/inventory.js';
import { sellItem, sellPrice, nextSale, saleTotal } from '../src/core/market.js';
import { storeItem, takeOut, storageOf } from '../src/core/storage.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import '../src/core/combat.js';

const fresh = () => ({ ...createState({ name: 't', look: {} }), money: 0 });
/** 낚아서 가방에 넣는다(main.js fishCatch 와 같은 순서: addItem → noteFishCm). */
const catchFish = (s, id, cm) => noteFishCm(addItem(s, id, 1).state, id, cm);
const catches = (s, id, list) => list.reduce((acc, cm) => catchFish(acc, id, cm), s);

test('물고기 크기 값: 가장 작으면 0.8배, 가장 크면 1.2배, 가운데는 1배(범위 밖은 끝값, 모르면 1배)', () => {
  assert.deepEqual(SIZE_RATE, [0.8, 1.2]);
  for (const [id, f] of Object.entries(FISH)) {
    if (f.junk) { assert.equal(sizeRate(id, 10), 1, '쓰레기는 크기가 없다'); continue; }
    assert.ok(Math.abs(sizeRate(id, f.cm[0]) - 0.8) < 1e-9, id);
    assert.ok(Math.abs(sizeRate(id, f.cm[1]) - 1.2) < 1e-9, id);
    assert.ok(Math.abs(sizeRate(id, (f.cm[0] + f.cm[1]) / 2) - 1) < 1e-9, id);
    assert.ok(Math.abs(sizeRate(id, f.cm[1] + 50) - 1.2) < 1e-9, `${id} 범위 밖`);
    assert.equal(sizeRate(id, null), 1);
    assert.equal(fishPrice(id, null), f.sell);
  }
  assert.equal(fishPrice('carp', 65), 84);
  assert.equal(fishPrice('carp', 30), 56);
});

test('물고기 크기 값: 낚이는 크기대로 팔면 평균은 예전 값(sell)과 거의 같다', () => {
  let seed = 12345;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [id, f] of Object.entries(FISH)) {
    if (f.junk) continue;
    let sum = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) sum += fishPrice(id, fishLength(id, random));
    const avg = sum / N;
    assert.ok(Math.abs(avg / f.sell - 1) < 0.01, `${id}: 평균 ${avg.toFixed(1)} / 원래 ${f.sell}`);
  }
});

test('팔 때는 큰 것부터: 다음에 팔 값 · 크기, 모두 팔기 값, 팔고 남은 크기', () => {
  let s = catches(fresh(), 'carp', [47, 30, 65]);
  assert.deepEqual(fishSizesOf(s, 'carp'), [30, 47, 65]);
  assert.deepEqual(nextSale(s, 'carp'), { price: 84, cm: 65 });
  assert.equal(saleTotal(s, 'carp', 3), 84 + fishPrice('carp', 47) + 56);
  const r = sellItem(s, 'carp', 1);
  assert.equal(r.earned, 84);
  assert.equal(r.state.money, 84);
  assert.deepEqual(fishSizesOf(r.state, 'carp'), [30, 47]);
  assert.deepEqual(nextSale(r.state, 'carp'), { price: fishPrice('carp', 47), cm: 47 });
  const all = sellItem(r.state, 'carp', 9);
  assert.equal(all.sold, 2);
  assert.equal(all.earned, fishPrice('carp', 47) + 56);
  assert.equal(countOf(all.state, 'carp'), 0);
  assert.deepEqual(fishSizesOf(all.state, 'carp'), []);
  // 물고기가 아닌 것은 예전 그대로
  const b = addItem(fresh(), 'berry', 3).state;
  assert.deepEqual(nextSale(b, 'berry'), { price: sellPrice('berry'), cm: null });
  assert.equal(saleTotal(b, 'berry', 5), 3 * sellPrice('berry'));
});

test('다른 데 쓸 때(선물 · 굽기 · 일감)는 작은 것부터 빠진다', () => {
  let s = catches(fresh(), 'carp', [47, 30, 65]);
  const t = takeItem(s, 'carp', 1);
  assert.deepEqual(fishSizesOf(t.state, 'carp'), [47, 65]);
  const g = grillFish(s, 2);
  assert.ok(g.ok);
  assert.deepEqual(fishSizesOf(g.state, 'carp'), [65]);
  assert.deepEqual(nextSale(g.state, 'carp'), { price: 84, cm: 65 });
  // 다 쓰고 나서 크기를 모르는 고기가 들어와도 예전 크기가 되살아나지 않는다
  const empty = takeItem(s, 'carp', 3).state, back = addItem(empty, 'carp', 1).state;
  assert.deepEqual(fishSizesOf(back, 'carp'), []);
  assert.deepEqual(nextSale(back, 'carp'), { price: FISH.carp.sell, cm: null });
});

test('예전에 낚은(크기를 모르는) 물고기는 1배로, 크기를 아는 것과 섞여도 큰 값부터 판다', () => {
  let s = addItem(fresh(), 'carp', 2).state;
  assert.deepEqual(nextSale(s, 'carp'), { price: 70, cm: null });
  s = catchFish(s, 'carp', 30);
  s = catchFish(s, 'carp', 65);
  assert.deepEqual(fishSizesOf(s, 'carp'), [30, 65]);
  const r = sellItem(s, 'carp', 2);
  assert.equal(r.earned, 84 + 70);
  assert.deepEqual(fishSizesOf(r.state, 'carp'), [30]);
  assert.equal(countOf(r.state, 'carp'), 2);
  assert.equal(saleTotal(r.state, 'carp', 2), 70 + 56);
});

test('보관 상자에 넣었다 꺼내도 크기가 그대로(넣을 때 · 꺼낼 때 작은 것부터)', () => {
  let s = catches(fresh(), 'carp', [47, 30, 65]);
  const put = storeItem(s, 'carp', 2);
  assert.ok(put.ok);
  assert.deepEqual(fishSizesOf(put.state, 'carp'), [65]);
  assert.deepEqual(storageOf(put.state).cm.carp, [30, 47]);
  const out = takeOut(put.state, 'carp', 1);
  assert.deepEqual(fishSizesOf(out.state, 'carp'), [30, 65]);
  assert.deepEqual(storageOf(out.state).cm.carp, [47]);
  const all = takeOut(out.state, 'carp', 5);
  assert.deepEqual(fishSizesOf(all.state, 'carp'), [30, 47, 65]);
  assert.equal(storageOf(all.state).cm.carp, undefined);
  assert.ok(isValidState(all.state), '저장해도 된다');
});

test('저장: 가방 · 상자의 크기 목록은 숫자 배열만 받는다', () => {
  const s = catches(fresh(), 'carp', [47, 65]);
  assert.ok(isValidBag(s.bag));
  assert.ok(isValidState(s));
  assert.ok(isValidBag({ items: {}, clean: {} }), '크기가 없는 예전 가방');
  assert.ok(!isValidBag({ items: {}, clean: {}, cm: { carp: 47 } }));
  assert.ok(!isValidBag({ items: {}, clean: {}, cm: { carp: ['47'] } }));
  assert.ok(!isValidBag({ items: {}, clean: {}, cm: [] }));
  // 쓰레기는 크기를 적지 않는다
  assert.equal(noteFishCm(addItem(fresh(), 'can', 1).state, 'can', 10).bag.cm, undefined);
});
