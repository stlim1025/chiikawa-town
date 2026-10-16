import { itemInfo, bagOf, takeItem, sizesIn, withSizes } from './inventory.js';
import { FISH, sizeRate, fishPrice } from './fishing.js';
import { JOB_TYPES } from './jobs.js';
import { WEED_KINDS, WEED_ORDER } from './weeding.js';
import { DROPS } from './combat.js';

/**
 * 물건 팔기(노동 접수 '팔기' 탭): 전리품뿐 아니라 풀 · 열매 · 먹을 것 · 별 조각 · 휴지까지 가방의 물건을 판다.
 * 풀 · 열매는 일감 보수의 HERB_RATE 만큼(일감으로 내는 쪽이 늘 이득), 먹을 것은 기운 값의 FOOD_RATE 배(가게에서 사는 값보다 싸게),
 * 전리품은 원래 값, 값이 정해진 물건(sell: 추첨 상품)은 그 값, 그 밖의 것은 SPECIAL 값. 값이 0 이면 팔 수 없다(퀘스트 물건 등).
 */
export const HERB_RATE = 0.4;
export const FOOD_RATE = 1.5;
const SPECIAL = { starshard: 150 };
const KIND_ORDER = { herb: 0, food: 1, drop: 2 };

/** 물건 하나를 팔 때 받는 값(못 팔면 0). */
export function sellPrice(id) {
  if (SPECIAL[id] != null) return SPECIAL[id];
  if (DROPS[id]) return DROPS[id].price;
  const info = itemInfo(id);
  if (!info) return 0;
  if (info.sell != null) return info.sell; // 값이 정해진 물건(추첨 상품: core/raffle.js)
  const job = Object.values(JOB_TYPES).find((t) => !t.hunt && t.kind === id);
  if (job) return Math.max(2, Math.round((job.base / job.target) * HERB_RATE));
  if (info.kind === 'herb') return Math.max(2, (6 - (WEED_KINDS[id]?.grade ?? 5)) * 4); // 일감이 없는 풀
  if (info.eat) return Math.max(5, Math.round((info.eat * FOOD_RATE) / 5) * 5);
  return 0;
}

const orderOf = (id) => {
  const w = WEED_ORDER.indexOf(id);
  return w >= 0 ? w : id === 'berry' ? WEED_ORDER.length : 100 + Object.keys(DROPS).indexOf(id);
};
/** 가방에서 팔 수 있는 물건 id: 풀 → 먹을 것 → 전리품 → 그 밖의 것. */
export function sellableIds(state) {
  const items = bagOf(state).items;
  const kindOf = (id) => KIND_ORDER[itemInfo(id).kind] ?? 9;
  return Object.keys(items).filter((id) => items[id] > 0 && itemInfo(id) && sellPrice(id) > 0)
    .sort((a, b) => kindOf(a) - kindOf(b) || orderOf(a) - orderOf(b));
}

/**
 * 가방의 그 물고기를 파는 차례: 비싼(큰) 것부터 [{ cm, price }]. 크기를 모르는 것은 cm null, 값은 기본값(core/fishing.js sizeRate).
 */
export function fishQueue(state, id) {
  const b = bagOf(state), known = sizesIn(b, id), unknown = Math.max(0, (b.items[id] || 0) - known.length);
  return [...known.map((cm) => ({ cm, rate: sizeRate(id, cm) })), ...Array.from({ length: unknown }, () => ({ cm: null, rate: 1 }))]
    .sort((a, b) => b.rate - a.rate).map(({ cm }) => ({ cm, price: fishPrice(id, cm) }));
}
/** 다음에 팔 하나의 값과 크기(물고기는 큰 것부터 팔아서 하나 팔 때마다 달라진다). → { price, cm: 크기 | null } */
export function nextSale(state, id) {
  if (!FISH[id]) return { price: sellPrice(id), cm: null };
  const q = fishQueue(state, id)[0];
  return q || { price: sellPrice(id), cm: null };
}
/** n 개를 팔면 받는 값(가진 만큼만). */
export function saleTotal(state, id, n) {
  if (!FISH[id]) return Math.min(n, bagOf(state).items[id] || 0) * sellPrice(id);
  return fishQueue(state, id).slice(0, n).reduce((a, q) => a + q.price, 0);
}

/** n 개를 판다(가진 만큼만). 물고기는 큰 것부터 크기에 따른 값으로. → { state, sold, earned } */
export function sellItem(state, id, n = 1) {
  const price = sellPrice(id);
  if (!price) return { state, sold: 0, earned: 0 };
  if (FISH[id]) {
    const queue = fishQueue(state, id), t = takeItem(state, id, n, false);
    if (!t.taken) return { state, sold: 0, earned: 0 };
    const earned = queue.slice(0, t.taken).reduce((a, q) => a + q.price, 0);
    const left = queue.slice(t.taken).map((q) => q.cm).filter((cm) => cm != null); // 판 큰 것들을 빼고 남은 크기
    return { state: { ...t.state, bag: withSizes(bagOf(t.state), id, left), money: t.state.money + earned }, sold: t.taken, earned };
  }
  const t = takeItem(state, id, n, false); // 깔끔한 풀은 일감 보너스용으로 남기고 덜 깔끔한 것부터 판다
  if (!t.taken) return { state, sold: 0, earned: 0 };
  const earned = t.taken * price;
  return { state: { ...t.state, money: t.state.money + earned }, sold: t.taken, earned };
}
