import test from 'node:test';
import assert from 'node:assert/strict';
import { storeItem, takeOut, storageOf, storedOf, canStore, STORE_STACK, isValidStorage } from '../src/core/storage.js';
import { addItem, countOf, bagOf, registerItems, MAX_STACK } from '../src/core/inventory.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import '../src/core/combat.js';
import '../src/core/quests.js';

const fresh = () => ({ ...createState({ name: '나', look: {} }), player: { x: 0, z: 0 } });
registerItems({ testletter: { name: '시험용 편지', kind: 'quest', note: '퀘스트 물건(시험용).' } });

test('보관 상자: 주머니에서 넣고 꺼낸다(개수 그대로, 상자는 처음엔 비어 있다)', () => {
  let s = addItem(fresh(), 'berry', 5).state;
  assert.deepEqual(storageOf(s), { items: {}, clean: {} });
  const put = storeItem(s, 'berry', 3);
  assert.ok(put.ok);
  assert.equal(put.moved, 3);
  s = put.state;
  assert.equal(countOf(s, 'berry'), 2);
  assert.equal(storedOf(s, 'berry'), 3);
  const out = takeOut(s, 'berry', 2);
  assert.ok(out.ok);
  s = out.state;
  assert.equal(countOf(s, 'berry'), 4);
  assert.equal(storedOf(s, 'berry'), 1);
  s = takeOut(s, 'berry', 99).state; // 있는 만큼만
  assert.equal(storedOf(s, 'berry'), 0);
  assert.ok(!('berry' in storageOf(s).items), '다 꺼내면 칸이 비워진다');
});

test('보관 상자: 넣을 때는 덜 깔끔한 것부터, 꺼낼 때는 깔끔한 것부터(깔끔한 풀은 일감용으로)', () => {
  let s = addItem(fresh(), 'weed', 4, 1).state; // 4개 중 깔끔 1
  s = storeItem(s, 'weed', 3).state;
  assert.equal(bagOf(s).clean.weed, 1, '깔끔한 하나는 주머니에 남았다');
  assert.equal(storageOf(s).clean.weed || 0, 0);
  s = storeItem(s, 'weed', 1).state;
  assert.equal(storageOf(s).clean.weed, 1);
  s = takeOut(s, 'weed', 1).state;
  assert.equal(bagOf(s).clean.weed, 1, '깔끔한 것부터 꺼낸다');
});

test('보관 상자: 한 가지 999개까지, 주머니는 99개까지라 들어가는 만큼만 꺼낸다', () => {
  let s = { ...fresh(), storage: { items: { berry: STORE_STACK - 1 }, clean: {} } };
  s = addItem(s, 'berry', 5).state;
  const put = storeItem(s, 'berry', 5);
  assert.equal(put.moved, 1, '상자 자리만큼만');
  assert.equal(storeItem(put.state, 'berry', 1).reason, 'full');
  s = { ...fresh(), storage: { items: { berry: 50 }, clean: {} } };
  s = addItem(s, 'berry', MAX_STACK - 10).state;
  const out = takeOut(s, 'berry', 50);
  assert.equal(out.moved, 10);
  assert.equal(countOf(out.state, 'berry'), MAX_STACK);
  assert.equal(storedOf(out.state, 'berry'), 40);
  assert.equal(takeOut(out.state, 'berry', 1).reason, 'bag');
});

test('보관 상자: 퀘스트 물건 · 없는 물건은 넣지 않는다', () => {
  const s = addItem(fresh(), 'testletter', 1).state;
  assert.equal(canStore('testletter'), false);
  assert.equal(storeItem(s, 'testletter', 1).reason, 'quest');
  assert.equal(storeItem(fresh(), 'berry', 1).reason, 'none');
  assert.equal(canStore('nope'), false);
});

test('보관 상자 저장: 가방과 같은 모양만 받고, 예전 저장(상자 없음)도 그대로', () => {
  assert.ok(isValidStorage({ items: { berry: 3 }, clean: {} }));
  assert.ok(!isValidStorage({ items: { berry: -1 }, clean: {} }));
  assert.ok(!isValidStorage({ items: [] }));
  assert.ok(isValidState(fresh()));
  assert.ok(isValidState({ ...fresh(), storage: { items: { berry: 3 }, clean: { berry: 1 } } }));
  assert.ok(!isValidState({ ...fresh(), storage: 'box' }));
  assert.ok(isValidState({ ...fresh(), questPins: ['training'] }));
  assert.ok(!isValidState({ ...fresh(), questPins: 'training' }));
});
