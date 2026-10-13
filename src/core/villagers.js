import { JOB_TYPES } from './jobs.js';

/**
 * 마을 살림: 게시판 일감은 하루에 정해진 수만큼만 올라오고, 나와 마을 친구들이 나눠 받는다.
 * 친구들은 저마다 지갑이 있어서 돈이 모자라면 일감을 받아 일하고, 넉넉하면 쉬거나 라멘을 사 먹는다. 밤에는 쉰다.
 * 모몽가는 일하지 않고 하루에 한 번쯤 내 지갑을 노린다(잡으면 돌려받는다).
 * state.board = { day, left: { 일감 id: 남은 건수 } }
 * state.villagers = { kind: { money, jobs: 그날 받은 일감 수, day, energy?: 기운 0..100(예전 저장에는 없다 → 100) } }
 * 기운(3단계): 일하고 돌아다니면 줄고, 라멘을 먹으면 차고, 모자라면 집에 들어가 낮잠, 밤(21시~6시)에는 집에서 잔다.
 * state.theftDay = 모몽가가 마지막으로 소매치기를 노린 날
 */
export const DAILY_JOBS = {
  weed8: 5, clover6: 4, sticker10: 4, berry6: 4, // 5급(친구들도 목표를 위해 부지런히 받아 가니 넉넉히)
  foxtail6: 2, vine4: 2, glow5: 2, // 4급(반짝 털뭉치는 밤 노동)
  thorny3: 2, reed5: 2, // 3급
  rockmoss4: 2, moon3: 1, // 2급
  giant2: 1, poison3: 1, // 1급
  huntFluff: 2, huntSlime: 2, huntBeetle: 2, huntTurtle: 1, huntMoth: 1 // 토벌(토벌 자격증, 자격증을 딴 친구들도 받아 간다 · 전리품도 따로 팔리니 건수는 적게)
};

/** 일하는 친구들: 처음 지갑, 부지런함(일감을 받을 확률), 할 줄 아는 일감, 밥 먹으러 갈 확률. */
export const VILLAGERS = {
  chiikawa: { start: 60, diligence: 0.55, jobs: ['weed8', 'berry6', 'sticker10', 'clover6'], eat: 0.25 },
  hachiware: { start: 120, diligence: 0.6, jobs: ['weed8', 'sticker10', 'berry6', 'clover6'], eat: 0.25 },
  usagi: { start: 200, diligence: 0.7, jobs: ['weed8', 'thorny3', 'berry6'], eat: 0.35 },
  kurimanju: { start: 300, diligence: 0.3, jobs: ['sticker10', 'berry6'], eat: 0.5 },
  rakko: { start: 400, diligence: 0.45, jobs: ['thorny3', 'weed8'], eat: 0.2 },
  momonga: { start: 30, diligence: 0, jobs: [], eat: 0.3, thief: true }
};
export const MAX_JOBS_PER_DAY = 3;
/** 기운: 이보다 적으면 밥(돈이 있으면) 아니면 낮잠. 라멘 한 그릇 · 낮잠 · 밤잠으로 차는 양. */
export const TIRED = 25;
export const MEAL_ENERGY = 45;
export const NAP_ENERGY = 80;
/** 밤잠 시간(시): BED 시 이후 ~ WAKE 시 전. */
export const BED_HOUR = 21, WAKE_HOUR = 6.5;
export const isSleepHour = (hour) => hour >= BED_HOUR || hour < WAKE_HOUR;
export const MEAL_PRICE = 80;
/** 소매치기: 지갑에 minMoney 이상 있을 때만, min~max 원(가진 돈보다 많이는 못 가져간다). */
export const THEFT = { minMoney: 50, min: 30, max: 90 };

/** 오늘 게시판(날이 바뀌면 새 일감이 올라온다). */
export function boardOf(state, day) {
  const b = state.board;
  // 예전 저장의 게시판에는 새 일감 칸이 없으니 그날 몫으로 채운다
  return b && b.day === day ? { day, left: { ...DAILY_JOBS, ...b.left } } : { day, left: { ...DAILY_JOBS } };
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

/** 친구의 지갑과 오늘 받은 일감 수(그 밖에 적어 둔 것 — 이룬 목표 bought · 산 무기 weapon — 도 그대로). */
export function villagerOf(state, kind, day) {
  const v = state.villagers && state.villagers[kind];
  return { ...(v || {}), money: v ? v.money : VILLAGERS[kind].start, jobs: v && v.day === day ? v.jobs : 0, day, energy: v && typeof v.energy === 'number' ? v.energy : 100 };
}
const setVillager = (state, kind, v) => ({ ...state, villagers: { ...(state.villagers || {}), [kind]: v } });
/** 친구 지갑의 몇 칸을 바꾼다(core/goals.js 의 목표 · 무기). */
export const updateVillager = (state, kind, day, patch) => setVillager(state, kind, { ...villagerOf(state, kind, day), ...patch });

/** 친구의 기운을 바꾼다(0..100). */
export function villagerEnergy(state, kind, delta, day) {
  const v = villagerOf(state, kind, day);
  return setVillager(state, kind, { ...v, energy: Math.max(0, Math.min(100, v.energy + delta)) });
}

/**
 * 친구가 다음에 할 일: { act: 'work', typeId } | { act: 'eat' } | { act: 'nap' } | { act: 'sleep' } | { act: 'rest' }.
 * 밤에는 집에 가서 자고, 기운이 모자라면 돈이 있으면 라멘, 없으면 낮잠. 그 밖에는 원래대로(난수: 밥 → 일 → 일감 고르기).
 * 하치와레의 첫날 안내 중에는 일감을 받지 않는다(내 첫 일감이 남도록).
 */
export function decide(state, kind, day, hour, random = Math.random) {
  if (isSleepHour(hour)) return { act: 'sleep' };
  const spec = VILLAGERS[kind], v = villagerOf(state, kind, day);
  if (v.energy < TIRED) return v.money >= MEAL_PRICE && hour >= 7 && hour < 20 ? { act: 'eat' } : { act: 'nap' };
  if (hour < 7 || hour >= 20) return { act: 'rest' };
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
  return { ok: true, state: setVillager(r.state, kind, { ...v, jobs: v.jobs + 1, day }) };
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
  return Object.entries(vs).every(([kind, v]) => VILLAGERS[kind] && v && num(v.money) && v.money >= 0 && num(v.jobs) && num(v.day)
    && (v.bought === undefined || (Array.isArray(v.bought) && v.bought.every((id) => typeof id === 'string')))
    && (v.weapon === undefined || v.weapon === null || typeof v.weapon === 'string'));
}
