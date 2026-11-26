import { dateOf } from './calendar.js';
import { hourOf } from './clock.js';
import { isStickFest } from './stickday.js';
import { homeOf } from './home.js';
import { NOVICE } from './license.js';
import { pickFish, fishLength, FISH } from './fishing.js';

/**
 * 마을 대회(게임 오리지널, docs/Village-Contests-2026-11-26.html): 토요일 낚시 대회, 수요일 풀 뽑기 시합.
 * 오전 9시 ~ 오후 5시에 노동 갑옷 씨에게 접수해 3분 한 판(내 판 동안 시계가 멈춘다), 그날 가장 좋은 기록이 순위판에 오른다.
 * 마을 친구 여섯은 낮 동안 한 번씩 참가하고(기록은 솜씨표에서 날짜로 정해진다), 같이 놀기 손님도 주인 마을 대회에서 겨룬다.
 * 오후 5시 광장 시상식: 1등 1,000원 · 2등 600원 · 3등 400원 · 참가 150원, 그 종목에서 처음 1등이면 트로피 가구.
 *
 * state.contest = { day: 대회 날 번호, kind: 'fish' | 'weed' | null, best: { s, t } | null, rounds: 그날 한 판 수,
 *   npc: { 친구 kind: { s, t } }, rank: 정해진 등수 | null, first: 그 종목 처음 1등, got: 상품을 받았는지(안 했으면 정리됨 표시),
 *   wins: { fish: 1등 한 수, weed: 1등 한 수 } }
 * s 는 점수(낚시 마릿수 · 풀 점수), t 는 같을 때 가르는 값(가장 큰 물고기 cm · 깔끔하게 뽑은 수).
 */
export const CONTESTS = {
  fish: { id: 'fish', name: '낚시 대회', dow: 6, banner: '마을 낚시 대회' },
  weed: { id: 'weed', name: '풀 뽑기 시합', dow: 3, banner: '마을 풀 뽑기 시합' }
};
export const OPEN_HOUR = 9, CLOSE_HOUR = 17, CEREMONY_LATEST = 21, NPC_LAST_START = 16, GUEST_LAST_START = 16.5;
/** 한 판(실제 초), 들어갈 때 드는 기운, 대회가 열리기 시작하는 날(튜토리얼 뒤). */
export const ROUND_SECONDS = 180, ENTRY_STAMINA = 10, FIRST_DAY = 3;
/** 친구가 보이게 참가하는 시간(게임 안 시간): 실제 3분은 게임 안 6시간이라 시상식 전에 끝나게 1시간(실제 30초)만. */
export const NPC_PLAY_HOURS = 1;
export const PRIZE = { 1: 1000, 2: 600, 3: 400, join: 150 };
/** 3분 한 판에서 나올 수 없는 점수(손님이 보낸 값 확인). */
export const SCORE_CAP = { fish: 40, weed: 120 };
/** 풀 뽑기 날: 이만큼(초)마다 다시 자라고, 자리마다 상한을 이만큼 늘린다. */
export const WEED_BOOST = { regrow: 6, cap: 1.5 };
export const CONTEST_FRIENDS = ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'rakko', 'momonga'];
export const TROPHY = { fish: 'fishtrophy', weed: 'weedtrophy' };

/**
 * 친구 솜씨(3분 한 판의 평균 점수와 들쭉날쭉한 정도). 풀은 견습(급수 NOVICE) 기준이고 내 급수에 맞춰 WEED_GRADE_SCALE 배.
 * clean: 풀을 뽑을 때 깔끔하게 뽑는 비율(같을 때 가르는 값 어림). tests/contestbalance.test.mjs 의 사람 모델로 맞춘다.
 */
export const NPC_SKILL = {
  fish: {
    rakko: { mean: 9, sd: 1.6 }, kurimanju: { mean: 8.5, sd: 1.6 }, hachiware: { mean: 7, sd: 1.6 },
    usagi: { mean: 7, sd: 3 }, chiikawa: { mean: 5, sd: 1.6 }, momonga: { mean: 4.5, sd: 1.6 }
  },
  weed: {
    rakko: { mean: 40, sd: 6, clean: 0.85 }, usagi: { mean: 40, sd: 9, clean: 0.7 }, kurimanju: { mean: 32, sd: 6, clean: 0.75 },
    hachiware: { mean: 30, sd: 6, clean: 0.75 }, chiikawa: { mean: 22, sd: 6, clean: 0.6 }, momonga: { mean: 20, sd: 6, clean: 0.6 }
  }
};
/** 내 제초 급수에 따라 친구 풀 솜씨를 이만큼 곱한다(내 급수의 보통 사람 평균 ÷ 견습 평균). */
export const WEED_GRADE_SCALE = { [NOVICE]: 1, 5: 1, 4: 1, 3: 1, 2: 1, 1: 1 };

const int0 = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const num0 = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** 그날 대회 종목(없으면 null). 3일째부터, 토요일 낚시 · 수요일 풀. */
export function contestKindOn(startISO, day) {
  if (!startISO || !(day >= FIRST_DAY)) return null;
  const { dow } = dateOf(startISO, day);
  for (const c of Object.values(CONTESTS)) if (c.dow === dow) return c.id;
  return null;
}
/**
 * 대회 날의 때: 'before' 9시 전 · 'open' 접수(내 판이 돌면 시각과 상관없이) · 'ceremony' 5시 ~ 9시 · 'closed' 그 뒤.
 * 하루는 아침 6시에 바뀌니 자정 ~ 6시는 그날의 끝(closed).
 */
export function contestPhase(hour, roundOn) {
  if (roundOn) return 'open';
  if (hour < 6) return 'closed';
  if (hour < OPEN_HOUR) return 'before';
  if (hour < CLOSE_HOUR) return 'open';
  if (hour < CEREMONY_LATEST) return 'ceremony';
  return 'closed';
}

const EMPTY = () => ({ day: 0, kind: null, best: null, rounds: 0, npc: {}, rank: null, first: false, got: false, wins: { fish: 0, weed: 0 } });
/** 대회 기록(없으면 빈 기록). */
export function contestOf(state) {
  const c = state && state.contest;
  if (!c || typeof c !== 'object') return EMPTY();
  const e = EMPTY();
  return { ...e, ...c, npc: c.npc || {}, wins: { ...e.wins, ...(c.wins || {}) } };
}
const withContest = (state, c) => ({ ...state, contest: c });
/** 대회 날 처음: 그날 기록을 새로(우승 수는 그대로). 이미 그날이면 그대로. */
export function beginContestDay(state, day, kind) {
  const c = contestOf(state);
  if (c.day === day && c.kind === kind) return state;
  return withContest(state, { ...EMPTY(), day, kind, wins: c.wins });
}

export const newRound = (kind) => ({ kind, s: 0, t: 0, clean: 0 });
/** 낚시 한 마리(깡통은 안 친다). */
export function roundCatch(round, { junk = false, cm = null } = {}) {
  if (junk) return round;
  return { ...round, s: round.s + 1, t: Math.max(round.t, Number.isFinite(cm) ? cm : 0) };
}
/** 풀 한 포기를 다 뽑은 결과: 깔끔 2점 · 끊김 1점. */
export function roundPull(round, result) {
  if (result === 'clean') { const clean = round.clean + 1; return { ...round, s: round.s + 2, clean, t: clean }; }
  if (result === 'snapped') return { ...round, s: round.s + 1 };
  return round;
}
/** a 가 b 보다 높은지(점수, 같으면 가르는 값). */
export const better = (a, b) => !b || a.s > b.s || (a.s === b.s && a.t > b.t);
/** 끝난 한 판을 적는다(그날 가장 좋은 판만 남는다). */
export function recordRound(state, { s, t }) {
  const c = contestOf(state), r = { s: int0(s), t: num0(t) };
  return withContest(state, { ...c, rounds: c.rounds + 1, best: better(r, c.best) ? r : c.best });
}

/** 지금 판에 들어갈 수 있는지 → { ok, reason: 'day' | 'hour' | 'stamina' | 'swap' | 'late' | null }. */
export function canEnter(state, { hour, kind, swapped = false, guest = false } = {}) {
  const no = (reason) => ({ ok: false, reason });
  if (!kind) return no('day');
  if (hour < OPEN_HOUR || hour >= CLOSE_HOUR) return no('hour');
  if (guest && hour >= GUEST_LAST_START) return no('late');
  if (swapped) return no('swap');
  if (!(state.stamina >= ENTRY_STAMINA)) return no('stamina');
  return { ok: true, reason: null };
}

// ---------- 날짜로 정해지는 친구 기록 ----------
/** 열쇠 글로 늘 같은 0..1 수를 차례로 내는 함수(FNV-1a 로 씨앗을 만들고 mulberry32 로 잇는다). */
function seeded(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

/** 친구의 그날 기록 { s, t }(날짜 · 종목 · 친구로 늘 같다). 풀은 내 제초 급수에 맞춘다. */
export function npcRecord(startISO, day, kind, who, myGrade = NOVICE) {
  const sk = NPC_SKILL[kind] && NPC_SKILL[kind][who];
  if (!sk) return { s: 0, t: 0 };
  const rnd = seeded(`${startISO}#${day}#ct#${kind}#${who}`);
  const scale = kind === 'weed' ? WEED_GRADE_SCALE[myGrade] ?? 1 : 1;
  const s = Math.max(0, Math.min(SCORE_CAP[kind], Math.round(sk.mean * scale + gauss(rnd) * sk.sd * scale)));
  if (kind === 'weed') return { s, t: Math.min(Math.floor(s / 2), Math.round((s * sk.clean) / (1 + sk.clean))) };
  // 낚시: 그 판에 낚았을 법한 물고기들의 가장 큰 크기(마을 연못 한낮)
  let t = 0;
  for (let i = 0; i < s; i++) { const id = pickFish('pond', 12, rnd, 'sunny'); if (!FISH[id].junk) t = Math.max(t, fishLength(id, rnd) || 0); }
  return { s, t };
}
/** 친구가 그날 참가하러 가는 시각(OPEN_HOUR 이상 NPC_LAST_START 미만, 날짜와 친구로 늘 같다). */
export function npcJoinHour(startISO, day, who) {
  const rnd = seeded(`${startISO}#${day}#ctjoin#${who}`);
  return OPEN_HOUR + rnd() * (NPC_LAST_START - OPEN_HOUR) * 0.999;
}

/** 순위: 높은 순, 점수와 가르는 값이 같으면 같은 등수. entries = [{ who, s, t, … }]. */
export function rankBoard(entries) {
  const sorted = [...entries].sort((a, b) => b.s - a.s || b.t - a.t);
  let rank = 0;
  return sorted.map((e, i) => {
    if (i === 0 || sorted[i - 1].s !== e.s || sorted[i - 1].t !== e.t) rank = i + 1;
    return { ...e, rank };
  });
}
/** 시상식: 내 등수를 정한다(한 판도 안 했으면 등수 없이 끝남 표시). 이미 정했으면 그대로. guests = [{ who, s, t }]. */
export function settleContest(state, guests = []) {
  const c = contestOf(state);
  if (!c.kind || c.rank != null || c.got) return state;
  if (!c.best) return withContest(state, { ...c, got: true });
  const board = rankBoard([{ who: 'me', ...c.best }, ...Object.entries(c.npc).map(([who, r]) => ({ who, ...r })), ...guests]);
  const rank = board.find((e) => e.who === 'me').rank;
  const wins = rank === 1 ? { ...c.wins, [c.kind]: c.wins[c.kind] + 1 } : c.wins;
  return withContest(state, { ...c, rank, wins, first: rank === 1 && wins[c.kind] === 1 });
}
/** 그 기록의 상품 { money, trophy }. */
export function prizeOf(rec) {
  if (!rec || rec.rank == null) return { money: 0, trophy: null };
  return { money: PRIZE[rec.rank] || PRIZE.join, trophy: rec.rank === 1 && rec.first ? TROPHY[rec.kind] : null };
}
const addTrophy = (s, id) => { const home = homeOf(s); return { ...s, home: { ...home, owned: { ...home.owned, [id]: (home.owned[id] || 0) + 1 } } }; };
/** 상품 받기 → { ok, state, money, trophy, reason: 'none' | 'notyet' | 'done' | null }. */
export function claimContestPrize(state) {
  const c = contestOf(state);
  const fail = (reason) => ({ ok: false, state, money: 0, trophy: null, reason });
  if (!c.best) return fail('none');
  if (c.got) return fail('done');
  if (c.rank == null) return fail('notyet');
  const p = prizeOf(c);
  let s = withContest({ ...state, money: state.money + p.money }, { ...c, got: true });
  if (p.trophy) s = addTrophy(s, p.trophy);
  return { ok: true, state: s, money: p.money, trophy: p.trophy, reason: null };
}

/** 손님이 보낸 점수가 3분 한 판에서 나올 수 있는지. */
export function guestScoreOk(kind, s, t) {
  if (!Object.hasOwn(SCORE_CAP, kind) || !Number.isInteger(s) || s < 0 || s > SCORE_CAP[kind]) return false;
  if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) return false;
  return kind !== 'weed' || (Number.isInteger(t) && t <= s / 2);
}

/** 저장된 대회 기록을 정리한다(모르는 칸 · 잘못된 값은 버리고 기본값으로 — 저장을 거부하지 않는다). */
export function cleanContest(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return undefined;
  const e = EMPTY();
  const rec = (r) => (r && typeof r === 'object' && Number.isInteger(r.s) && r.s >= 0 && typeof r.t === 'number' && Number.isFinite(r.t) && r.t >= 0 ? { s: r.s, t: r.t } : null);
  const npc = {};
  if (c.npc && typeof c.npc === 'object') for (const k of CONTEST_FRIENDS) { const r = rec(c.npc[k]); if (r) npc[k] = r; }
  const w = c.wins && typeof c.wins === 'object' ? c.wins : {};
  return {
    day: Number.isInteger(c.day) && c.day >= 0 ? c.day : e.day,
    kind: Object.hasOwn(CONTESTS, c.kind) ? c.kind : null,
    best: rec(c.best),
    rounds: int0(c.rounds),
    npc,
    rank: Number.isInteger(c.rank) && c.rank >= 1 ? c.rank : null,
    first: c.first === true,
    got: c.got === true,
    wins: { fish: int0(w.fish), weed: int0(w.weed) }
  };
}

/** 광장 현수막 글: 막대 과자 데이가 먼저, 대회 날 6시 ~ 자정이면 대회 이름, 아니면 null. */
export function bannerText(state) {
  if (!state || !state.clock) return null;
  if (isStickFest(state)) return '막대 과자 데이';
  const kind = contestKindOn(state.startDate, state.clock.day);
  return kind && hourOf(state.clock) >= 6 ? CONTESTS[kind].banner : null;
}
