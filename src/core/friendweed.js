import { NOVICE, EXAM_FEE, XP_TO_EXAM, EXAM_STREAK } from './license.js';
import { JOB_TYPES, gradedJob, isWeedJob } from './jobs.js';
import { VILLAGERS, villagerOf, villagerSpend, updateVillager } from './villagers.js';

/**
 * 마을 친구들의 제초 급수(게임 오리지널): 나처럼 견습 · 5급 … 1급이 있다.
 * 풀 일감을 끝내면 경험치가 쌓이고(일감 하나에 FRIEND_JOB_XP), 경험치가 차면 응시료를 내고 검정소에서 승급 시험을 본다.
 * 급수가 오르면 그 급수의 풀 일감(친구마다 할 줄 아는 것 — core/villagers.js 의 VILLAGERS jobs)을 받는다.
 * 보수는 기본 보수 그대로(나처럼 급수 배율을 붙이면 친구 돈이 두 배 가까이 빨리 불어나, 친구 돈만으로 마을 가꾸기가 반년 안에 다 끝났다).
 * state.villagers[kind].weed = { grade, xp, tries: 이번 급수에서 떨어진 횟수, tryDay: 마지막으로 시험 본 날 }(없으면 WEED_START 급수 · 경험치 0)
 */

/** 처음 급수: 치이카와 · 하치와레는 견습, 우사기 · 랏코는 3급(처음부터 위험한 풀을 뽑는다), 쿠리만쥬는 5급. */
export const WEED_START = { chiikawa: NOVICE, hachiware: NOVICE, usagi: 3, kurimanju: 5, rakko: 3 };
/**
 * 시험 때 한 포기를 깔끔하게 뽑을 확률(친구마다 솜씨대로 — 꼼꼼한 랏코 · 힘센 우사기는 잘하고 겁 많은 치이카와는 떨린다).
 * 이번 급수에서 떨어질 때마다 조금씩 는다(EXAM_PRACTICE). 합격할 확률 = 이 확률 ^ 연속으로 깔끔하게 뽑을 수(core/license.js 의 EXAM_STREAK).
 */
export const EXAM_FOCUS = { chiikawa: 0.72, hachiware: 0.8, usagi: 0.86, kurimanju: 0.74, rakko: 0.92 };
export const EXAM_PRACTICE = 0.04;
/** 친구들이 받을 때 게시판에 하나는 남겨 두는 일감: 4급부터의 풀 일감(내 몫 — 하루 몇 건 안 올라온다). */
export const RESERVE_GRADE = 4;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** 친구의 제초 급수 { grade, xp, tries, tryDay }. */
export function weedOf(state, kind) {
  const v = state.villagers && state.villagers[kind], w = v && v.weed;
  return { grade: w ? w.grade : WEED_START[kind] ?? NOVICE, xp: w ? w.xp : 0, tries: w && num(w.tries) ? w.tries : 0, tryDay: w && num(w.tryDay) ? w.tryDay : null };
}
/** 친구의 제초 급수 숫자(6 = 견습). */
export const friendGrade = (state, kind) => weedOf(state, kind).grade;
/** 그 급수로 받을 수 있는 일감인지(토벌 · 낚시 일감은 급수와 상관없다). */
export function gradeAllows(state, kind, id) {
  const T = JOB_TYPES[id];
  return !T || !!T.needTool || !!T.hunt || friendGrade(state, kind) <= T.needGrade;
}
/** 친구들이 받으면 안 되는지: 4급부터의 풀 일감은 게시판에 하나는 남겨 둔다(left: 오늘 게시판의 남은 수). */
export function friendLeaves(id, left) {
  const T = JOB_TYPES[id];
  return (left[id] || 0) <= (T && gradedJob(T) && T.needGrade <= RESERVE_GRADE ? 1 : 0);
}

/**
 * 풀 일감 하나를 끝내면 쌓이는 경험치: 나처럼 한 포기마다 쌓으면 랏코 · 우사기가 일주일 안에 1급이 된다.
 * 일감 하나에 이만큼으로 두어 급수 하나에 몇 주 ~ 몇 달 걸리게 한다(날마다 시험을 볼 수 있으면 우사기 2급 45일쯤 · 1급 105일쯤, 치이카와 5급 20일쯤 · 4급 40일쯤).
 */
export const FRIEND_JOB_XP = 1;

/** 풀 일감을 끝냈다: 경험치 FRIEND_JOB_XP(다음 시험 몫까지만 쌓인다). 1급이면 그대로. */
export function friendWorkXp(state, kind, id, day) {
  const T = JOB_TYPES[id];
  if (!T || !isWeedJob(T) || !VILLAGERS[kind]) return state;
  const w = weedOf(state, kind);
  if (w.grade <= 1) return state;
  return updateVillager(state, kind, day, { weed: { ...w, xp: Math.min(XP_TO_EXAM[w.grade], w.xp + FRIEND_JOB_XP) } });
}

/** 지금 승급 시험에 붙을 확률. */
export function weedExamChance(state, kind) {
  const w = weedOf(state, kind), focus = Math.min(0.97, (EXAM_FOCUS[kind] || 0.75) + w.tries * EXAM_PRACTICE);
  return focus ** (EXAM_STREAK[w.grade] || 5);
}
/** 승급 시험을 보러 갈 수 있는지: 일하는 친구 · 경험치가 다 찼고 · 응시료가 있고 · 오늘 아직 안 봤다. */
export function canTryWeedExam(state, kind, day) {
  if (!VILLAGERS[kind] || !VILLAGERS[kind].jobs.length) return false;
  const w = weedOf(state, kind);
  return w.grade > 1 && w.xp >= XP_TO_EXAM[w.grade] && w.tryDay !== day && villagerOf(state, kind, day).money >= (EXAM_FEE[w.grade] || 0);
}
/**
 * 승급 시험: 응시료를 내고 본다. 붙으면 한 급 올라 경험치를 비우고, 떨어지면 경험치는 그대로 두고 다음 날 다시 본다(떨어질수록 조금씩 잘한다).
 * → { state, passed, grade: 시험 뒤 급수, fee }
 */
export function tryWeedExam(state, kind, day, random = Math.random) {
  const w = weedOf(state, kind), fee = EXAM_FEE[w.grade] || 0, passed = random() < weedExamChance(state, kind);
  const next = passed ? { grade: Math.max(1, w.grade - 1), xp: 0, tries: 0, tryDay: day } : { ...w, tries: w.tries + 1, tryDay: day };
  return { state: updateVillager(villagerSpend(state, kind, fee, day), kind, day, { weed: next }), passed, grade: next.grade, fee };
}
