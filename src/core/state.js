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

/** 기운을 채운다(최대 100). */
export function restoreStamina(state, amount) {
  return { ...state, stamina: Math.min(MAX_STAMINA, state.stamina + amount) };
}
