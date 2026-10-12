import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIZES, RAFFLE_PRICE } from '../src/core/raffle.js';
import '../src/core/quests.js';
import '../src/core/starfall.js';
import { sellPrice } from '../src/core/market.js';
import { tasteOf, giftPoints, giveGift, giftLine, DISLIKES, LIKES, TOSS_NOW } from '../src/core/gifts.js';
import { pantryOf, addToPantry, takeFromPantry, snackOf, shareOf, sellPantry, thanksOf, hatedOf, isValidPantry, PANTRY_STACK } from '../src/core/pantry.js';
import { FRIENDS, friendOf } from '../src/core/friends.js';
import { addItem, countOf, itemInfo } from '../src/core/inventory.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';

const fresh = () => ({ ...createState({ name: '치이', look: {} }), tutorial: 'done' });
const withItems = (items) => Object.entries(items).reduce((s, [id, n]) => addItem(s, id, n).state, fresh());

test('치이카와는 전골 세트를 좋아한다', () => {
  assert.equal(tasteOf('chiikawa', 'hotpot'), 'love');
});

test('추첨 상품: 3등까지는 한 번 돌리는 값보다 비싸게 팔리고, 평균으로는 덜 받는다', () => {
  const ranked = PRIZES.map((P) => sellPrice(P.item));
  for (let i = 0; i < 3; i++) assert.ok(ranked[i] > RAFFLE_PRICE, `${PRIZES[i].rank} ${ranked[i]}원`);
  for (let i = 3; i < ranked.length; i++) assert.ok(ranked[i] > 0 && ranked[i] < RAFFLE_PRICE, `${PRIZES[i].rank} ${ranked[i]}원`);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i] < ranked[i - 1], '좋은 상품일수록 비싸다');
  const total = PRIZES.reduce((a, P) => a + P.weight, 0);
  const avg = PRIZES.reduce((a, P) => a + (P.weight / total) * sellPrice(P.item), 0);
  assert.ok(avg < RAFFLE_PRICE, `평균 ${avg.toFixed(1)}원`);
});

test('선물 점수: 좋아하는 비싼 물건 > 좋아하는 싼 물건 > 보통 물건, 싫어하는 물건은 0', () => {
  assert.ok(giftPoints('chiikawa', 'hotpot') > giftPoints('chiikawa', 'candy'), '좋아하는 것도 비쌀수록');
  assert.ok(giftPoints('chiikawa', 'candy') > giftPoints('chiikawa', 'riceball'), '좋아하는 것 > 보통');
  assert.ok(giftPoints('hachiware', 'hotpot') > giftPoints('hachiware', 'weed'), '보통 물건도 비싸면 조금');
  assert.equal(giftPoints('hachiware', 'weed'), 0, '값싼 보통 물건은 0');
  assert.equal(giftPoints('chiikawa', 'spore'), 0, '싫어하는 것은 0');
  for (const [kind, list] of Object.entries(DISLIKES)) {
    assert.ok(FRIENDS[kind], kind);
    for (const id of list) {
      assert.ok(itemInfo(id), `${kind}: ${id}`);
      assert.ok(!(LIKES[kind] || []).includes(id), `${kind} 는 ${id} 를 좋아하면서 싫어할 수 없다`);
    }
  }
});

test('선물을 주면 친구 가방에 들어간다 · 싫은 물건은 모몽가 · 우사기는 바로 버리고 착한 친구는 받아 둔다(나중에 몰래)', () => {
  let s = withItems({ hotpot: 1, spore: 1, weed: 2, tissue: 1 });
  const love = giveGift(s, 'chiikawa', 'hotpot', 3);
  assert.ok(love.ok && love.taste === 'love');
  assert.equal(pantryOf(love.state, 'chiikawa').hotpot, 1);
  assert.equal(friendOf(love.state, 'chiikawa').pts, giftPoints('chiikawa', 'hotpot'));
  const kind = giveGift(love.state, 'hachiware', 'spore', 3);
  assert.ok(kind.ok && kind.taste === 'hate' && kind.gained === 0 && !kind.tossNow, '착한 하치와레는 바로 버리지 않는다');
  assert.equal(pantryOf(kind.state, 'hachiware').spore, 1, '일단 받아 둔다');
  assert.equal(hatedOf(kind.state, 'hachiware'), 'spore', '몰래 버릴 것');
  assert.equal(countOf(kind.state, 'spore'), 0, '내 가방에서는 빠진다');
  const blunt = giveGift(kind.state, 'momonga', 'tissue', 3);
  assert.ok(blunt.ok && blunt.taste === 'hate' && blunt.tossNow, '모몽가는 그 자리에서 버린다');
  assert.equal(pantryOf(blunt.state, 'momonga').tissue, undefined);
  assert.deepEqual(TOSS_NOW.sort(), ['momonga', 'usagi']);
  for (const kind of Object.keys(FRIENDS)) for (const k of ['hate', 'toss']) assert.ok(giftLine(kind, k).length > 0, `${kind} ${k}`);
  assert.notEqual(giftLine('chiikawa', 'hate'), giftLine('momonga', 'hate'), '성격마다 다른 말');
});

test('친구 가방: 넣고 빼기 · 한 물건 상한 · 저장 검사', () => {
  let s = fresh();
  s = addToPantry(s, 'usagi', 'cookies', 20).state;
  assert.equal(pantryOf(s, 'usagi').cookies, PANTRY_STACK);
  s = takeFromPantry(s, 'usagi', 'cookies', PANTRY_STACK).state;
  assert.equal(pantryOf(s, 'usagi').cookies, undefined);
  assert.equal(addToPantry(s, 'nobody', 'cookies', 1).added, 0);
  assert.ok(isValidPantry({ chiikawa: { hotpot: 1 } }));
  assert.ok(!isValidPantry({ nobody: { hotpot: 1 } }));
  assert.ok(!isValidPantry({ chiikawa: { hotpot: -1 } }));
  assert.ok(isValidState({ ...fresh(), pantry: { chiikawa: { hotpot: 1 } } }));
  assert.ok(!isValidState({ ...fresh(), pantry: [] }));
});

test('친구가 스스로: 배고프면 먹을 것(좋아하는 건 아껴 둔다) · 나눠 줄 것 · 팔 것 · 답례할 것', () => {
  let s = fresh();
  s = addToPantry(s, 'chiikawa', 'hotpot', 1).state;
  s = addToPantry(s, 'chiikawa', 'riceball', 1).state;
  s = addToPantry(s, 'chiikawa', 'horn', 2).state; // 토벌 전리품
  assert.equal(snackOf(s, 'chiikawa'), 'riceball', '좋아하는 전골은 아껴 두고 주먹밥부터');
  assert.equal(snackOf(fresh(), 'chiikawa'), null);
  assert.equal(shareOf(s, 'chiikawa', 'rakko'), 'horn', '랏코가 좋아하는 뿔을 나눠 준다');
  assert.equal(shareOf(s, 'chiikawa', 'kani'), null);
  const sold = sellPantry(s, 'chiikawa');
  assert.equal(sold.earned, 2 * sellPrice('horn'));
  assert.equal(pantryOf(sold.state, 'chiikawa').horn, undefined);
  assert.equal(pantryOf(sold.state, 'chiikawa').hotpot, 1, '먹을 것 · 좋아하는 것은 안 판다');
  assert.equal(thanksOf(s, 'chiikawa'), 'riceball', '답례는 좋아하지도 싫어하지도 않는 것(무서운 뿔은 빼고)');
  assert.equal(thanksOf(addToPantry(fresh(), 'chiikawa', 'hotpot', 1).state, 'chiikawa'), null, '좋아하는 것만 있으면 답례는 다른 것으로');
  const hated = addToPantry(addToPantry(fresh(), 'kurimanju', 'candy', 1).state, 'kurimanju', 'spore', 1).state;
  assert.equal(snackOf(hated, 'kurimanju'), null, '싫어하는 사탕은 안 먹는다');
  assert.equal(thanksOf(hated, 'kurimanju'), 'spore', '싫은 사탕을 나에게 되돌려주지는 않는다');
});
