import { trySpend } from './state.js';

/**
 * 집: 처음 사는 집은 빌린 집. 매주 월요일에 집세를 내고, 부동산에서 집을 사거나 청약을 넣을 수 있다.
 * 월요일에는 밀린 집세까지 한꺼번에 낸다. 두 번 연달아 못 내면 집에서 쫓겨난다(부동산에서 다시 세 들 수 있다).
 * 쫓겨난 동안 밤에는 친구 집에서 돈을 내고 묵거나(기운이 가득) 바닥에서 노숙한다(기운이 조금만).
 * 청약은 신청한 뒤 돌아오는 수요일에 발표되고, 당첨되면 일주일 안에 헐값에 살 수 있다.
 * state.housing = { own: 내 집인지, unpaid: 밀린 집세, lottery: null | { applied: 신청한 날 } | { won: true, until: 이날까지 },
 *   missed: 연달아 못 낸 횟수(예전 저장에는 없다), evicted: 쫓겨났는지(예전 저장에는 없다) }
 */
export const RENT = 300;
export const HOUSE_PRICE = 50000; // 내 집은 마지막 목표: 한참 모아야 산다
export const LOTTERY_FEE = 500;
export const LOTTERY_PRICE = 15000; // 당첨되면 집값의 30%
export const LOTTERY_CHANCE = 0.015; // 1.5%: 진짜 청약처럼 잘 안 된다
export const RENT_DAY = 1; // 월요일
export const ANNOUNCE_DAY = 3; // 수요일
export const EVICT_AFTER = 2; // 집세를 두 번 연달아 못 내면 쫓겨난다
export const LODGING_PRICE = 150; // 친구 집에서 하룻밤
export const ROUGH_REST = 30; // 노숙하면 다음 날 기운이 이만큼만 찬다

export function createHousing() {
  return { own: false, unpaid: 0, lottery: null };
}

/** 상태의 집 정보(예전 저장에는 없으니 빌린 집으로). */
export function housingOf(state) {
  return state.housing || createHousing();
}

const withHousing = (state, patch) => ({ ...state, housing: { ...housingOf(state), ...patch } });

/** 집에서 쫓겨났는지. */
export function isEvicted(state) {
  return !!housingOf(state).evicted;
}

/**
 * 새 날이 시작될 때. dow 는 그날 요일(0=일요일). 월요일이면 집세(밀린 것까지), 수요일이면 청약 발표.
 * events: rentPaid · rentUnpaid · evicted · lotteryWon · lotteryLost · lotteryExpired
 */
export function startDay(state, day, dow, random = Math.random) {
  let s = state;
  const events = [];
  const h = housingOf(s);
  if (!h.own && !h.evicted && dow === RENT_DAY) {
    const due = h.unpaid + RENT;
    const paid = trySpend(s, due);
    if (paid.ok) { s = withHousing(paid.state, { unpaid: 0, missed: 0 }); events.push({ type: 'rentPaid', amount: due }); }
    else {
      const missed = (h.missed || 0) + 1;
      const evicted = missed >= EVICT_AFTER;
      s = withHousing(s, { unpaid: due, missed, evicted });
      events.push({ type: evicted ? 'evicted' : 'rentUnpaid', unpaid: due });
    }
  }
  const lot = housingOf(s).lottery;
  if (lot && lot.applied !== undefined && dow === ANNOUNCE_DAY && day > lot.applied) {
    if (random() < LOTTERY_CHANCE) { s = withHousing(s, { lottery: { won: true, until: day + 7 } }); events.push({ type: 'lotteryWon' }); }
    else { s = withHousing(s, { lottery: null }); events.push({ type: 'lotteryLost' }); }
  } else if (lot && lot.won && day > lot.until) {
    s = withHousing(s, { lottery: null });
    events.push({ type: 'lotteryExpired' });
  }
  return { state: s, events };
}

/** 밀린 집세를 낸다. */
export function payRent(state) {
  const h = housingOf(state);
  if (h.unpaid <= 0) return { ok: false, reason: 'none', state };
  const paid = trySpend(state, h.unpaid);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: withHousing(paid.state, { unpaid: 0, missed: 0 }) }; // 쫓겨났으면 그대로(다시 세 들어야 한다)
}

/** 쫓겨난 뒤 다시 세 든다: 밀린 집세와 이번 주 집세를 먼저 낸다. { ok, state, reason: 'none' | 'money' } */
export function rentAgain(state) {
  const h = housingOf(state);
  if (!h.evicted) return { ok: false, reason: 'none', state };
  const paid = trySpend(state, h.unpaid + RENT);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: withHousing(paid.state, { unpaid: 0, missed: 0, evicted: false }) };
}

/** 모은 돈으로 집을 산다(밀린 집세가 없어야 한다). */
export function buyHouse(state) {
  const h = housingOf(state);
  if (h.own) return { ok: false, reason: 'own', state };
  if (h.unpaid > 0) return { ok: false, reason: 'unpaid', state };
  const paid = trySpend(state, HOUSE_PRICE);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: withHousing(paid.state, { own: true, lottery: null, missed: 0, evicted: false }) };
}

/** 청약 신청(한 번에 하나). */
export function applyLottery(state, day) {
  const h = housingOf(state);
  if (h.own) return { ok: false, reason: 'own', state };
  if (h.lottery) return { ok: false, reason: 'applied', state };
  const paid = trySpend(state, LOTTERY_FEE);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: withHousing(paid.state, { lottery: { applied: day } }) };
}

/** 청약 당첨으로 헐값에 산다(당첨 후 일주일 안). */
export function buyByLottery(state, day) {
  const h = housingOf(state);
  if (!h.lottery || !h.lottery.won || day > h.lottery.until) return { ok: false, reason: 'none', state };
  if (h.unpaid > 0) return { ok: false, reason: 'unpaid', state };
  const paid = trySpend(state, LOTTERY_PRICE);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: withHousing(paid.state, { own: true, lottery: null, missed: 0, evicted: false }) };
}

/** 저장된 집 정보 모양이 맞는지(save.js 검사). */
export function isValidHousing(h) {
  if (!h || typeof h !== 'object' || typeof h.own !== 'boolean' || typeof h.unpaid !== 'number' || h.unpaid < 0) return false;
  if (h.missed !== undefined && (typeof h.missed !== 'number' || h.missed < 0)) return false;
  if (h.evicted !== undefined && typeof h.evicted !== 'boolean') return false;
  const l = h.lottery;
  return l === null || (typeof l === 'object' && (typeof l.applied === 'number' || (l.won === true && typeof l.until === 'number')));
}
