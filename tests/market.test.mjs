import test from 'node:test';
import assert from 'node:assert/strict';
import { sellPrice, sellableIds, sellItem } from '../src/core/market.js';
import { LIKES, loves, canGift, giveGift, giftLine } from '../src/core/gifts.js';
import { ACCESSORY_ITEMS, craftAccessory, buyAccessory, wardrobeOf, isValidWardrobe } from '../src/core/wardrobe.js';
import { JOB_TYPES } from '../src/core/jobs.js';
import { DROPS } from '../src/core/combat.js';
import { FRIENDS, friendOf, DAY_CAP } from '../src/core/friends.js';
import { addItem, countOf, itemInfo } from '../src/core/inventory.js';
import { createState } from '../src/core/state.js';
import { SHOPS } from '../src/core/shop.js';
import '../src/core/raffle.js';
import '../src/core/starfall.js';
import '../src/core/quests.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), ...o });
const withItems = (map, s = fresh()) => Object.entries(map).reduce((a, [id, n]) => addItem(a, id, n).state, s);

test('팔 값: 전리품은 원래 값, 별 조각 · 휴지도 팔리고, 풀 · 열매는 일감보다 싸다', () => {
  assert.equal(sellPrice('pearl'), DROPS.pearl.price);
  assert.ok(sellPrice('starshard') > 0);
  assert.ok(sellPrice('tissue') > 0);
  for (const T of Object.values(JOB_TYPES).filter((t) => !t.hunt && itemInfo(t.kind))) {
    const p = sellPrice(T.kind);
    assert.ok(p > 0, T.kind);
    assert.ok(p < T.base / T.target, `${T.kind}: 일감으로 내는 게 더 이득이어야`);
  }
  assert.equal(sellPrice('없는물건'), 0);
});

test('먹을 것은 팔면 사는 값보다 싸다(사서 되팔아 돈 벌기 안 됨)', () => {
  const pizza = SHOPS.ramen.items.find((it) => it.item === 'pizzabun');
  assert.ok(sellPrice('pizzabun') > 0 && sellPrice('pizzabun') < pizza.price);
  for (const id of ['hotpot', 'cookies', 'candy', 'riceball', 'katsucurry']) assert.ok(sellPrice(id) > 0, id);
});

test('팔기: 고른 만큼 빼고 그만큼 돈, 가진 것보다 많이 팔 수 없다', () => {
  const s = withItems({ tissue: 3, weed: 10 });
  const r = sellItem(s, 'tissue', 2);
  assert.equal(r.sold, 2);
  assert.equal(r.earned, 2 * sellPrice('tissue'));
  assert.equal(r.state.money, s.money + r.earned);
  assert.equal(countOf(r.state, 'tissue'), 1);
  const all = sellItem(r.state, 'tissue', 99);
  assert.equal(all.sold, 1);
  assert.equal(countOf(all.state, 'tissue'), 0);
  assert.equal(sellItem(all.state, 'tissue', 1).sold, 0, '없으면 못 판다');
  assert.deepEqual(sellableIds(all.state), ['weed']);
});

test('팔기 · 선물은 덜 깔끔한 것부터 빼서 깔끔한 풀은 일감 보너스용으로 남는다', () => {
  const s = addItem(fresh(), 'reed', 4, 3).state; // 4개 중 3개가 깔끔
  const r = sellItem(s, 'reed', 2);
  assert.equal(countOf(r.state, 'reed'), 2);
  assert.equal(r.state.bag.clean.reed, 2, '덜 깔끔한 1개 + 깔끔한 1개만 빠진다');
  assert.equal(giveGift(s, 'ramen', 'reed', 1).state.bag.clean.reed, 3, '선물도 덜 깔끔한 것부터');
});

test('팔 목록: 풀 → 먹을 것 → 전리품 → 그 밖의 것 순서', () => {
  const s = withItems({ starshard: 1, pearl: 2, candy: 1, clover: 3, weed: 1 });
  assert.deepEqual(sellableIds(s), ['weed', 'clover', 'candy', 'pearl', 'starshard']);
});

test('선물: 좋아하는 물건이면 친밀도가 더 오르고, 하나만 빠진다', () => {
  assert.ok(loves('chiikawa', 'tissue'), '울보 치이카와는 휴지를 좋아한다');
  for (const kind of Object.keys(LIKES)) assert.ok(FRIENDS[kind], kind);
  const s = withItems({ tissue: 2, weed: 1 });
  const love = giveGift(s, 'chiikawa', 'tissue', 3);
  assert.ok(love.ok && love.love);
  assert.equal(love.gained, 2);
  assert.equal(countOf(love.state, 'tissue'), 1);
  assert.equal(friendOf(love.state, 'chiikawa').pts, 2);
  const plain = giveGift(s, 'hachiware', 'weed', 3);
  assert.ok(plain.ok && !plain.love);
  assert.equal(plain.gained, 1);
});

test('선물: 하루 친밀도 상한이 차면 받지 않고 물건도 그대로', () => {
  let s = withItems({ tissue: 5 });
  s = giveGift(s, 'chiikawa', 'tissue', 3).state; // +2 = DAY_CAP
  assert.equal(DAY_CAP, 2);
  const again = giveGift(s, 'chiikawa', 'tissue', 3);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'cap');
  assert.equal(countOf(again.state, 'tissue'), countOf(s, 'tissue'));
  assert.ok(giveGift(s, 'chiikawa', 'tissue', 4).ok, '다음 날은 또 받는다');
});

test('선물: 없는 물건 · 모르는 친구는 안 되고, 대사는 친구마다(없으면 기본)', () => {
  const s = fresh();
  assert.equal(giveGift(s, 'chiikawa', 'tissue', 1).reason, 'none');
  assert.equal(giveGift(withItems({ tissue: 1 }), 'nobody', 'tissue', 1).reason, 'none');
  assert.ok(canGift('tissue') && canGift('pearl'));
  for (const kind of Object.keys(FRIENDS)) for (const k of ['love', 'ok', 'cap']) assert.ok(typeof giftLine(kind, k) === 'string' && giftLine(kind, k).length > 0, `${kind} ${k}`);
});

test('별 조각 머리핀: 별 조각 셋으로 만들고(조각은 빠진다) 바로 단다 · 돈으로는 못 산다', () => {
  const A = ACCESSORY_ITEMS.starpin;
  assert.ok(A && A.craft && A.craft.starshard === 3);
  assert.equal(buyAccessory(fresh({ money: 99999 }), 'starpin').ok, false);
  assert.equal(craftAccessory(withItems({ starshard: 2 }), 'starpin').reason, 'items');
  const r = craftAccessory(withItems({ starshard: 4 }), 'starpin');
  assert.ok(r.ok);
  assert.equal(countOf(r.state, 'starshard'), 1);
  assert.deepEqual(wardrobeOf(r.state), { owned: ['starpin'], wear: 'starpin' });
  assert.ok(isValidWardrobe(wardrobeOf(r.state)));
  assert.equal(craftAccessory(withItems({ starshard: 3 }, r.state), 'starpin').reason, 'owned');
});
