import { JOB_TYPES } from './jobs.js';

/**
 * 마을 살림: 게시판 일감은 하루에 정해진 수만큼만 올라오고, 나와 마을 친구들이 나눠 받는다.
 * 친구들은 저마다 지갑이 있어서 돈이 모자라면 일감을 받아 일하고, 넉넉하면 쉬거나 라멘을 사 먹는다. 밤에는 쉰다.
 * 모몽가는 일하지 않고 하루에 한 번쯤 내 지갑을 노린다(잡으면 돌려받는다).
 * state.board = { day, left: { 일감 id: 남은 건수 } }
 * state.villagers = { kind: { money, jobs: 그날 받은 일감 수, day } }
 * state.theftDay = 모몽가가 마지막으로 소매치기를 노린 날
 */
export const DAILY_JOBS = { weed8: 4, sticker10: 3, berry6: 3, thorny3: 2 };

/** 일하는 친구들: 처음 지갑, 부지런함(일감을 받을 확률), 할 줄 아는 일감, 밥 먹으러 갈 확률. */
export const VILLAGERS = {
  chiikawa: { start: 60, diligence: 0.55, jobs: ['weed8', 'berry6', 'sticker10'], eat: 0.25 },
  hachiware: { start: 120, diligence: 0.6, jobs: ['weed8', 'sticker10', 'berry6'], eat: 0.25 },
  usagi: { start: 200, diligence: 0.7, jobs: ['weed8', 'thorny3', 'berry6'], eat: 0.35 },
  kurimanju: { start: 300, diligence: 0.3, jobs: ['sticker10', 'berry6'], eat: 0.5 },
  rakko: { start: 400, diligence: 0.45, jobs: ['thorny3', 'weed8'], eat: 0.2 },
  momonga: { start: 30, diligence: 0, jobs: [], eat: 0.3, thief: true }
};
export const MAX_JOBS_PER_DAY = 2;
export const MEAL_PRICE = 80;
/** 소매치기: 지갑에 minMoney 이상 있을 때만, min~max 원(가진 돈보다 많이는 못 가져간다). */
export const THEFT = { minMoney: 50, min: 30, max: 90 };

/** 오늘 게시판(날이 바뀌면 새 일감이 올라온다). */
export function boardOf(state, day) {
  const b = state.board;
  return b && b.day === day ? b : { day, left: { ...DAILY_JOBS } };
}
const withLeft = (state, day, id, delta) => {
  const b = boardOf(state, day);
  return { ...state, board: { day, left: { ...b.left, [id]: Math.max(0, (b.left[id] || 0) + delta) } } };
};

/** 게시판에서 일감 하나를 받는다. { ok, state, reason: 'soldout' } */
export function takeFromBoard(state, id, day) {
  if (!(boardOf(state, day).left[id] > 0)) return { ok: false, reason: 'soldout', state };
  return { ok: true, state: withLeft(state, day, id, -1) };
}
/** 그만둔 일감은 게시판에 다시 걸린다. */
export function returnToBoard(state, id, day) {
  return withLeft(state, day, id, 1);
}

/** 친구의 지갑과 오늘 받은 일감 수. */
export function villagerOf(state, kind, day) {
  const v = state.villagers && state.villagers[kind];
  return { money: v ? v.money : VILLAGERS[kind].start, jobs: v && v.day === day ? v.jobs : 0, day };
}
const setVillager = (state, kind, v) => ({ ...state, villagers: { ...(state.villagers || {}), [kind]: v } });

/**
 * 친구가 다음에 할 일: { act: 'work', typeId } | { act: 'eat' } | { act: 'rest' }.
 * 난수는 밥 → 일 → 일감 고르기 순서로 쓴다. 하치와레의 첫날 안내 중에는 일감을 받지 않는다(내 첫 일감이 남도록).
 */
export function decide(state, kind, day, hour, random = Math.random) {
  if (hour < 7 || hour >= 20) return { act: 'rest' };
  const spec = VILLAGERS[kind], v = villagerOf(state, kind, day);
  const mealtime = (hour >= 11 && hour < 14) || (hour >= 18 && hour < 20);
  if (v.money >= MEAL_PRICE && random() < spec.eat * (mealtime ? 1.4 : 0.5)) return { act: 'eat' };
  const guiding = state.tutorial && state.tutorial !== 'done';
  if (guiding || !spec.jobs.length || v.jobs >= MAX_JOBS_PER_DAY) return { act: 'rest' };
  // 돈이 모자랄수록 부지런해지고, 넉넉하면 덜 일한다
  const need = v.money < 150 ? 1.4 : v.money > 600 ? 0.4 : 1;
  if (random() >= spec.diligence * need) return { act: 'rest' };
  const left = boardOf(state, day).left, open = spec.jobs.filter((id) => left[id] > 0);
  if (!open.length) return { act: 'rest' };
  return { act: 'work', typeId: open[Math.floor(random() * open.length) % open.length] };
}

/** 친구가 게시판에서 일감을 받는다(오늘 일한 수가 하나 는다). */
export function villagerTakesJob(state, kind, id, day) {
  const r = takeFromBoard(state, id, day);
  if (!r.ok) return r;
  const v = villagerOf(r.state, kind, day);
  return { ok: true, state: setVillager(r.state, kind, { money: v.money, jobs: v.jobs + 1, day }) };
}
/** 친구가 보수를 받는다. */
export function payVillager(state, kind, amount, day) {
  const v = villagerOf(state, kind, day);
  return setVillager(state, kind, { ...v, money: v.money + amount });
}
/** 친구가 돈을 쓴다(가진 만큼만). */
export function villagerSpend(state, kind, amount, day) {
  const v = villagerOf(state, kind, day);
  return setVillager(state, kind, { ...v, money: Math.max(0, v.money - amount) });
}
/** 친구가 받을 일감의 보수(급수 배율 없이 기본 보수). */
export const villagerPay = (id) => JOB_TYPES[id].base;

/** 오늘 모몽가가 아직 노리지 않았고, 내 지갑에 가져갈 만한 돈이 있는지. */
export function canSteal(state, day) {
  return state.theftDay !== day && state.money >= THEFT.minMoney;
}
export function stealAmount(state, random = Math.random) {
  return Math.min(state.money, Math.round(THEFT.min + random() * (THEFT.max - THEFT.min)));
}
/** 훔쳐 갔다(그날은 다시 노리지 않는다). */
export function steal(state, amount, day) {
  return { ...state, money: state.money - amount, theftDay: day };
}
/** 다가오다 놓쳤어도 그날은 끝. */
export function markTheft(state, day) {
  return { ...state, theftDay: day };
}
/** 잡아서 돌려받았다. */
export function recover(state, amount) {
  return { ...state, money: state.money + amount };
}
/** 놓쳤다: 모몽가 지갑으로. */
export function thiefKeeps(state, amount, day) {
  return payVillager(state, 'momonga', amount, day);
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** 저장된 게시판 모양이 맞는지. */
export function isValidBoard(b) {
  if (!b || typeof b !== 'object' || !num(b.day) || !b.left || typeof b.left !== 'object') return false;
  return Object.entries(b.left).every(([id, n]) => DAILY_JOBS[id] !== undefined && num(n) && n >= 0);
}
/** 저장된 친구 지갑 모양이 맞는지. */
export function isValidVillagers(vs) {
  if (!vs || typeof vs !== 'object' || Array.isArray(vs)) return false;
  return Object.entries(vs).every(([kind, v]) => VILLAGERS[kind] && v && num(v.money) && v.money >= 0 && num(v.jobs) && num(v.day));
}
