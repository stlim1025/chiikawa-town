import { addItem, registerItems } from './inventory.js';
import { trySpend } from './state.js';

/**
 * 상점가 경품 추첨(원작에서 치이카와가 전골 세트에 당첨된 그 가라가라 추첨): 손잡이를 돌리면 구슬이 하나 툭 나오고, 구슬 색이 상품.
 * 가게에서 TICKET_MIN_PRICE 원 이상인 물건을 사면 추첨권을 한 장 받고(하루 DAILY_TICKETS 장까지, 라멘 · 맥주처럼 싼 것은 안 준다),
 * 추첨권이 없으면 RAFFLE_PRICE 원을 내고 돌린다.
 * state.raffle = { tickets: 가진 추첨권, day: 마지막으로 추첨권을 받은 날, got: 그날 받은 장수 }
 */
export const RAFFLE_PRICE = 150;
export const DAILY_TICKETS = 3;
export const TICKET_MIN_PRICE = 200;

/** 상품(좋은 것부터). weight 가 클수록 자주 나온다. */
export const PRIZES = [
  { id: 'gold', rank: '1등', ballName: '금색', ball: '#f6c453', item: 'hotpot', weight: 2 },
  { id: 'red', rank: '2등', ballName: '빨간', ball: '#e0524f', item: 'fruitbasket', weight: 7 },
  { id: 'blue', rank: '3등', ballName: '파란', ball: '#6fa8dc', item: 'cookies', weight: 16 },
  { id: 'green', rank: '4등', ballName: '초록', ball: '#7cc77a', item: 'candy', weight: 27 },
  { id: 'white', rank: '참가상', ballName: '하얀', ball: '#fbfaf5', item: 'tissue', weight: 48 }
];

/** 추첨에서만 받는 물건(먹을 것 · 휴지). */
export const RAFFLE_ITEMS = {
  hotpot: { name: '전골 세트', kind: 'food', note: '경품 추첨 1등! 냄비 가득 보글보글 끓는 전골. 먹으면 기운이 60 찬다.', eat: 60 },
  fruitbasket: { name: '과일 바구니', kind: 'food', note: '경품 추첨 2등. 반들반들한 과일이 가득. 먹으면 기운이 35 찬다.', eat: 35 },
  cookies: { name: '쿠키 상자', kind: 'food', note: '경품 추첨 3등. 바삭바삭 버터 쿠키. 먹으면 기운이 18 찬다.', eat: 18 },
  candy: { name: '막대 사탕', kind: 'food', note: '경품 추첨 4등. 달콤한 딸기 맛. 먹으면 기운이 6 찬다.', eat: 6 },
  tissue: { name: '휴지', kind: 'misc', note: '경품 추첨 참가상. 부드러운 휴지 한 팩. …어디에 쓰지?' }
};
registerItems(RAFFLE_ITEMS);

export function raffleOf(state) {
  return state.raffle || { tickets: 0, day: 0, got: 0 };
}

/** 가게에서 price 원짜리 물건을 샀다: TICKET_MIN_PRICE 원 이상이면 추첨권 한 장(그날 DAILY_TICKETS 장까지). → { state, earned } */
export function earnTicket(state, day, price) {
  if (!(price >= TICKET_MIN_PRICE)) return { state, earned: false };
  const r = raffleOf(state), got = r.day === day ? r.got : 0;
  if (got >= DAILY_TICKETS) return { state, earned: false };
  return { state: { ...state, raffle: { tickets: r.tickets + 1, day, got: got + 1 } }, earned: true };
}

/** 구슬 하나(무게대로). */
export function pickPrize(random = Math.random) {
  const total = PRIZES.reduce((a, P) => a + P.weight, 0);
  let x = random() * total;
  for (const P of PRIZES) { if ((x -= P.weight) < 0) return P; }
  return PRIZES[PRIZES.length - 1];
}

/**
 * 손잡이를 돌린다: 추첨권이 있으면 한 장, 없으면 RAFFLE_PRICE 원. 상품은 가방에 넣는다.
 * → { ok, state, prize, paid: 'ticket' | 'money', reason: 'money' | 'bag' }
 */
export function drawRaffle(state, random = Math.random) {
  const r = raffleOf(state), prize = pickPrize(random);
  let s = state, paid;
  if (r.tickets > 0) { s = { ...s, raffle: { ...r, tickets: r.tickets - 1 } }; paid = 'ticket'; }
  else {
    const pay = trySpend(s, RAFFLE_PRICE);
    if (!pay.ok) return { ok: false, reason: 'money', state };
    s = pay.state;
    paid = 'money';
  }
  const add = addItem(s, prize.item, 1);
  if (!add.added) return { ok: false, reason: 'bag', state };
  return { ok: true, state: add.state, prize, paid };
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** 저장된 추첨 모양 검사(save.js). */
export function isValidRaffle(r) {
  return !!r && typeof r === 'object' && num(r.tickets) && r.tickets >= 0 && num(r.day) && num(r.got) && r.got >= 0;
}
