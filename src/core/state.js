import { createClock } from './clock.js';
import { todayISO } from './calendar.js';

/** 기운 최대치. */
export const MAX_STAMINA = 100;

/** 새 게임 상태. profile = { name, look }. */
export function createState(profile) {
  return {
    version: 1,
    profile: { name: profile.name, look: { ...profile.look } },
    money: 0,
    stamina: MAX_STAMINA,
    license: { grade: 5, xp: 0 },
    job: null,
    exam: null,
    clock: createClock(1, 8), // 새 게임은 맑은 아침 08:00 에 시작한다
    player: { x: 0, z: 2 },
    stats: { pulled: 0, clean: 0 },
    seenTips: [],
    tutorial: 'hello', // 하치와레의 첫날 안내(core/tutorial.js)
    home: { owned: { bed: 1 }, placed: [{ id: 'bed', cx: 2, cz: 0, rot: 0 }] }, // 집 안 가구(core/home.js 의 createHome 과 같다)
    housing: { own: false, unpaid: 0, lottery: null }, // 처음엔 빌린 집(core/housing.js)
    startDate: todayISO() // 1일째의 달력 날짜(core/calendar.js)
  };
}

/** 돈을 더한다. */
export function addMoney(state, amount) {
  return { ...state, money: state.money + amount };
}

/** 돈이 충분하면 뺀다. */
export function trySpend(state, amount) {
  if (state.money < amount) return { ok: false, state };
  return { ok: true, state: { ...state, money: state.money - amount } };
}

/** 기운이 충분하면 쓴다. */
export function useStamina(state, amount) {
  if (state.stamina < amount) return { ok: false, state };
  return { ok: true, state: { ...state, stamina: state.stamina - amount } };
}

/** 자고 일어나면 기운이 이만큼까지만 찬다(꽉 차지 않는다). 노숙은 ROUGH_GAIN 만큼만, 그래도 이보다 넘지는 않는다. */
export const SLEEP_GAIN = 60;
const ROUGH_GAIN = 30; // housing.js 의 ROUGH_REST(노숙 안내 문구)와 같은 값
/** 잔 뒤의 기운: how 'home' · 'lodge'(침대) 면 SLEEP_GAIN, 'rough'(노숙)면 ROUGH_GAIN 만큼 찬다(MAX_STAMINA 까지). */
export function sleepStamina(state, how = 'home') {
  return restoreStamina(state, how === 'rough' ? ROUGH_GAIN : SLEEP_GAIN);
}

/** 기운을 채운다(최대 100). */
export function restoreStamina(state, amount) {
  return { ...state, stamina: Math.min(MAX_STAMINA, state.stamina + amount) };
}
