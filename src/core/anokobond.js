import { tamed } from './anoko.js';
import { HEART_AT, MAX_HEARTS } from './friends.js';
import { registerItems, addItem, takeItem, countOf, itemInfo } from './inventory.js';
import { homeOf } from './home.js';

/**
 * 아노코와 지내기(메인 이야기 2장 보상 다음 — 설계서 docs/Anoko-Bond-2026-11-16.html, 게임 오리지널): three 없이 쓰고 테스트한다.
 * 집 앞 아노코와 쓰다듬기 · 간식 주기 · 같이 달리기로 친해지고(하루 BOND.dayCap 점까지, 행동마다 하루 한 번),
 * 하트(마을 친구와 같은 HEART_AT 곡선)마다 하나씩 열린다: 1 반겨 주기, 2 털 빗기(아노코 솜털), 3 아노코 인형 선물과 경주,
 * 4 꾸미기(리본 · 안장 색), 5 아노코를 타면 BOND.speed 배.
 * state.anokoBond = { pts, day, dayPts, pet, feed, run, comb, runDist, runDay, raceBest, raceDone, raceDay, ribbon, saddle } — 없으면 0에서 시작.
 */
export const BOND = { dayCap: 3, runGoal: 300, fluffSell: 120, speed: 1.15 };
/** 하트 몇 개에서 열리는지. */
export const UNLOCK = { greet: 1, comb: 2, race: 3, decor: 4, speed: 5 };
/** 경주: limit 초가 지나면 끝(기록 없음), 첫 완주 first 원, 그 뒤 가장 빠른 기록을 margin 초 넘게 줄이면 record 원(하루 한 번). */
export const RACE = { limit: 120, first: 1000, record: 300, margin: 0.5 };
/** 꾸미기 색(번호 1 ~ 6, 0 은 없음). 화면에는 name 을 보인다. */
export const RIBBONS = [
  { name: '분홍', color: '#ff9ec4' }, { name: '빨강', color: '#ef5b5b' }, { name: '노랑', color: '#ffd45c' },
  { name: '하늘', color: '#8fd0f5' }, { name: '연두', color: '#9fdc7a' }, { name: '보라', color: '#b9a0ee' }
];
export const SADDLES = [
  { name: '갈색', color: '#b07a4f' }, { name: '빨강', color: '#d9534f' }, { name: '남색', color: '#4f6bb0' },
  { name: '초록', color: '#5f9e6e' }, { name: '분홍', color: '#f2a3bd' }, { name: '하양', color: '#f4f1ea' }
];
export const FLUFF = 'anokofluff', DOLL = 'anokodoll';

registerItems({ [FLUFF]: { name: '아노코 솜털', kind: 'drop', sell: BOND.fluffSell, note: '집 앞 아노코의 털을 빗다가 모은 보송보송한 솜털. 노동 접수에서 120원에 팔린다.' } });

const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** 저장된 아노코 몫(없는 칸은 0, 가장 빠른 기록은 null). */
export function bondOf(state) {
  const b = (state && state.anokoBond) || {};
  return {
    pts: b.pts || 0, day: b.day || 0, dayPts: b.dayPts || 0,
    pet: b.pet || 0, feed: b.feed || 0, run: b.run || 0, comb: b.comb || 0, runDist: b.runDist || 0, runDay: b.runDay || 0,
    raceBest: num(b.raceBest) ? b.raceBest : null, raceDone: !!b.raceDone, raceDay: b.raceDay || 0,
    ribbon: b.ribbon || 0, saddle: b.saddle || 0
  };
}
const heartsOf = (pts) => Math.min(MAX_HEARTS, HEART_AT.filter((p) => pts >= p).length);
/** 하트 수(0 ~ MAX_HEARTS). 2장을 끝내지 않았으면 0. */
export const bondHearts = (state) => (tamed(state) ? heartsOf(bondOf(state).pts) : 0);
/** key(UNLOCK 의 이름)가 열렸는지. */
export const isUnlocked = (state, key) => tamed(state) && bondHearts(state) >= UNLOCK[key];

const NEEDS = { pet: null, feed: null, comb: 'comb' };
/** 오늘 그 행동을 할 수 있는지: 'ok' · 'done'(오늘 했다) · 'locked'(아직 안 열렸다). */
export function canAct(state, act, day) {
  if (!tamed(state) || (NEEDS[act] && !isUnlocked(state, NEEDS[act]))) return 'locked';
  return bondOf(state)[act] === day ? 'done' : 'ok';
}

/** 그날 상한 안에서 pts 만큼 올리고(field 가 있으면 그 행동을 한 날로 적는다), 하트 3이 처음 되면 아노코 인형을 집에 넣는다. */
function gain(state, pts, day, field = null) {
  const b = bondOf(state), today = b.day === day ? b.dayPts : 0;
  const got = Math.max(0, Math.min(pts, BOND.dayCap - today));
  const next = { ...b, pts: b.pts + got, day, dayPts: today + got };
  if (field) next[field] = day;
  const before = heartsOf(b.pts), after = heartsOf(next.pts);
  const unlocks = Object.keys(UNLOCK).filter((k) => UNLOCK[k] > before && UNLOCK[k] <= after);
  let s = state;
  if (unlocks.includes('race')) {
    const home = homeOf(s);
    s = { ...s, home: { ...home, owned: { ...home.owned, [DOLL]: (home.owned[DOLL] || 0) + 1 } } };
  }
  return { ok: true, state: { ...s, anokoBond: next }, gained: got, hearts: after, up: after > before, unlocks };
}
const no = (state, reason) => ({ ok: false, state, gained: 0, hearts: bondHearts(state), up: false, unlocks: [], reason });

/** 쓰다듬기: 하루 한 번 +1. */
export function pet(state, day) {
  const c = canAct(state, 'pet', day);
  return c === 'ok' ? gain(state, 1, day, 'pet') : no(state, c);
}
/** 간식 주기: 가방의 먹을 것(itemInfo(id).eat > 0) 하나를 준다. 빨간 열매 +2, 다른 먹을 것 +1. 하루 한 번. */
export function feed(state, id, day) {
  const c = canAct(state, 'feed', day);
  if (c !== 'ok') return no(state, c);
  const info = itemInfo(id);
  if (!info || !(info.eat > 0) || countOf(state, id) < 1) return no(state, 'item');
  return gain(takeItem(state, id, 1, false).state, id === 'berry' ? 2 : 1, day, 'feed');
}
/** 털 빗기(하트 2부터): 하루 한 번 아노코 솜털 하나. 점수는 오르지 않는다. 가방이 꽉 차면 'item'. */
export function comb(state, day) {
  const c = canAct(state, 'comb', day);
  if (c !== 'ok') return no(state, c);
  const r = addItem(state, FLUFF, 1);
  if (!r.added) return no(state, 'item');
  return { ...no(r.state, null), ok: true, state: { ...r.state, anokoBond: { ...bondOf(r.state), comb: day } } };
}
/** 아노코를 타고 meters 만큼 달렸다(날이 바뀌면 0부터). 그날 BOND.runGoal 을 처음 넘길 때 +1. */
export function addRun(state, meters, day) {
  if (!tamed(state) || !(meters > 0)) return no(state, null);
  const b = bondOf(state), dist = (b.runDay === day ? b.runDist : 0) + meters;
  const s = { ...state, anokoBond: { ...b, runDist: dist, runDay: day } };
  if (b.run === day || dist < BOND.runGoal) return { ...no(s, null), ok: true };
  return gain(s, 1, day, 'run');
}

/** 경주를 seconds 초에 완주했다. 첫 완주는 RACE.first 원(기록 보상은 겹치지 않는다), 그 뒤 기록을 RACE.margin 초 넘게 줄이면 하루 한 번 RACE.record 원. */
export function raceFinish(state, seconds, day) {
  const b = bondOf(state), best = b.raceBest;
  const next = { ...b, raceDone: true, raceBest: best === null ? seconds : Math.min(best, seconds) };
  let reward = 0, first = false, record = false;
  if (!b.raceDone) { reward = RACE.first; first = true; next.raceDay = day; }
  else if (best !== null && seconds < best - RACE.margin && b.raceDay !== day) { reward = RACE.record; record = true; next.raceDay = day; }
  return { state: { ...state, money: (state.money || 0) + reward, anokoBond: next }, reward, first, record };
}

const inRange = (v) => Number.isInteger(v) && v >= 0 && v <= 6;
/** 꾸미기(하트 4부터): 리본 · 안장 색 번호(0 없음, 1 ~ 6). 열리기 전이나 범위를 벗어나면 그대로. */
export function setDecor(state, ribbon, saddle) {
  if (!isUnlocked(state, 'decor') || !inRange(ribbon) || !inRange(saddle)) return state;
  return { ...state, anokoBond: { ...bondOf(state), ribbon, saddle } };
}
/** 아노코를 탈 때 빠르기 배율(하트 5면 BOND.speed). */
export const rideBoost = (state) => (isUnlocked(state, 'speed') ? BOND.speed : 1);
/** 같이 놀기 꾸미기 꼬리표('ak-리본안장', 꾸미기가 없으면 null). 받는 쪽 꼬리표 규칙(영문 · 숫자 · _ · -)에 맞춘다. */
export function decorTag(state) {
  const b = bondOf(state);
  return isUnlocked(state, 'decor') && (b.ribbon || b.saddle) ? `ak-${b.ribbon}${b.saddle}` : null;
}
/** 받은 꼬리표들에서 꾸미기를 읽는다. 없거나 모양이 틀리면 null. */
export function parseDecorTag(tags) {
  const t = Array.isArray(tags) ? tags.find((x) => typeof x === 'string' && x.startsWith('ak-')) : null;
  const m = t && /^ak-([0-6])([0-6])$/.exec(t);
  return m ? { ribbon: Number(m[1]), saddle: Number(m[2]) } : null;
}

/** 꾸미기 색 번호({ ribbon, saddle }, 0 은 없음)를 모델 색({ ribbon: '#hex' | null, saddle })으로. */
export function decorColors(d) {
  const pick = (list, i) => (Number.isInteger(i) && i >= 1 && i <= list.length ? list[i - 1].color : null);
  return { ribbon: pick(RIBBONS, d && d.ribbon), saddle: pick(SADDLES, d && d.saddle) };
}

/** 저장 검사: 없으면 괜찮다. 숫자 칸은 0 이상, 색 번호는 0 ~ 6, 기록은 null 이나 양수. */
export function isValidBond(b) {
  if (b === undefined) return true;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  for (const k of ['pts', 'day', 'dayPts', 'pet', 'feed', 'run', 'comb', 'runDist', 'runDay', 'raceDay']) if (b[k] !== undefined && !(num(b[k]) && b[k] >= 0)) return false;
  for (const k of ['ribbon', 'saddle']) if (b[k] !== undefined && !inRange(b[k])) return false;
  if (b.raceBest !== undefined && b.raceBest !== null && !(num(b.raceBest) && b.raceBest > 0)) return false;
  if (b.raceDone !== undefined && typeof b.raceDone !== 'boolean') return false;
  return true;
}
