import { MONSTERS } from './combat.js';
import { hourOf } from './clock.js';
import { hasLicense } from './licenses.js';

/**
 * 현상금 몬스터(게임 오리지널): 어떤 날은 구역 하나에 평소 몬스터의 '황금' 대장이 한 마리 나타난다(크고 단단하고 아프게 친다, 머리에 금관).
 * 나타나면 노동 접수 게시판에 현상금 전단이 붙고 알림이 뜬다. 쓰러뜨리면 게시판에서 현상금을 받는다. 그날 밤 10시가 지나면 사라진다.
 * 그날 현상금이 붙을지 · 무엇이 · 몇 시에 나올지는 날 번호로 정해서, 다시 불러와도 같다. 토벌 자격증이 있어야 붙는다.
 * state.bounty = { day, down: 쓰러뜨렸는지, paid: 현상금을 받았는지 } — 그날 것만 쓴다.
 */
export const BOUNTY_POOL = ['fluff', 'hopper', 'mole', 'beetle', 'shroom', 'stump', 'slime', 'frog', 'crab', 'turtle', 'pebble', 'ram'];
/** 그날 현상금이 붙을 확률, 나타나는 시각 범위(시), 사라지는 시각(시). */
export const BOUNTY_CHANCE = 0.6, BOUNTY_FROM = 9, BOUNTY_TO = 16, BOUNTY_END = 22;
/** 황금 대장: 체력 · 피해 배율, 몸 크기 배율, 전리품 개수. */
export const ELITE = { hp: 6, dmg: 1.35, size: 1.45, drops: 3 };
const WHERE = { fields: '동쪽 들판', forest: '서쪽 숲', river: '남쪽 강가', mountain: '북쪽 바위산' };

/** 현상금(원): 단단한 몬스터일수록 크다(풀뭉치 430원 · 이끼 거북 730원). */
export const bountyReward = (species) => 250 + MONSTERS[species].hp * 60;

/** 날 · 이름표마다 정해진 0..1(같은 날이면 늘 같다). */
function roll(day, salt) {
  let h = 2166136261;
  for (const ch of `${day}:bounty:${salt}`) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** 그날의 현상금: null(없는 날) | { day, species, name, where, hour(나타나는 시각), end, reward }. 둘째 날부터. */
export function bountyOf(day) {
  if (!(day >= 2) || roll(day, 'on') >= BOUNTY_CHANCE) return null;
  const species = BOUNTY_POOL[Math.floor(roll(day, 'who') * BOUNTY_POOL.length) % BOUNTY_POOL.length], M = MONSTERS[species];
  return { day, species, name: `황금 ${M.name}`, where: WHERE[M.region] || '마을 밖', hour: BOUNTY_FROM + roll(day, 'at') * (BOUNTY_TO - BOUNTY_FROM), end: BOUNTY_END, reward: bountyReward(species) };
}

/** 오늘 현상금 기록(지난 날 것은 버리고 새로). */
export function bountyRecord(state) {
  const b = state.bounty, day = state.clock.day;
  return b && b.day === day ? b : { day, down: false, paid: false };
}

/**
 * 지금 현상금: null | { ...bountyOf, status }.
 * status: 'soon' 아직 안 나타남 | 'up' 나타나 있다 | 'down' 쓰러뜨렸다(받기 전) | 'paid' 받았다 | 'gone' 못 잡고 밤이 됐다.
 * 첫날 안내 중이거나 토벌 자격증이 없으면 붙지 않는다.
 */
export function bountyNow(state) {
  if (!state || !state.clock || state.tutorial !== 'done' || !hasLicense(state, 'hunter')) return null;
  const b = bountyOf(state.clock.day);
  if (!b) return null;
  const h = hourOf(state.clock), rec = bountyRecord(state);
  const status = rec.paid ? 'paid' : rec.down ? 'down' : h < b.hour ? 'soon' : h < b.end ? 'up' : 'gone';
  return { ...b, status };
}

/** 황금 대장을 쓰러뜨렸다. */
export const markBountyDown = (state) => ({ ...state, bounty: { ...bountyRecord(state), down: true } });

/** 게시판에서 현상금을 받는다. { ok, state, reward } */
export function claimBounty(state) {
  const b = bountyNow(state);
  if (!b || b.status !== 'down') return { ok: false, state, reward: 0 };
  return { ok: true, reward: b.reward, state: { ...state, money: state.money + b.reward, bounty: { ...bountyRecord(state), paid: true } } };
}

/** 저장된 모양이 맞는지(save.js). */
export function isValidBounty(b) {
  return !!b && typeof b === 'object' && Number.isFinite(b.day) && typeof b.down === 'boolean' && typeof b.paid === 'boolean';
}
