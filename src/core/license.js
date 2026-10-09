import { WEED_KINDS } from './weeding.js';

/** 급수별 보수 배율. */
export const PAY_MULT = { 5: 1.0, 4: 1.2, 3: 1.4, 2: 1.7, 1: 2.0 };
/** 다음 급 시험을 보는 데 필요한 경험치. */
export const XP_TO_EXAM = { 5: 30, 4: 60, 3: 100, 2: 150 };
/** 시험 합격에 필요한 연속 깔끔하게 뽑기 횟수(급수가 높을수록 풀이 어려워서 조금 줄어든다). */
export const EXAM_STREAK = { 5: 5, 4: 5, 3: 4, 2: 3 };
/** 뽑기 결과별 경험치. */
export const XP_PER = { clean: 2, snapped: 1 };

/**
 * 뽑기 결과로 경험치를 얻는다. kind 를 주면 어려운 풀일수록 더 많이 오른다
 * (5급 풀 ×1, 4급 ×1.5, 3급 ×2, 2급 ×2.5, 1급 ×3, 여러 번에 나눠 뽑는 풀은 단계 수만큼 더).
 */
export function gainXp(license, result, kind = 'weed') {
  if (license.grade <= 1) return license;
  const W = WEED_KINDS[kind] || WEED_KINDS.weed;
  const gain = Math.round((XP_PER[result] || 0) * (1 + (5 - W.grade) * 0.5) * (W.stages || 1));
  return { ...license, xp: Math.min(XP_TO_EXAM[license.grade], license.xp + gain) };
}

/** 승급 시험을 볼 수 있는지. */
export function canTakeExam(license) {
  return license.grade > 1 && license.xp >= XP_TO_EXAM[license.grade];
}

/** 시험 시작: 지금 급수의 풀을 깔끔하게 연속 need 번. */
export function startExam(grade = 5) {
  return { streak: 0, need: EXAM_STREAK[grade] || 5, grade, done: false, passed: false };
}

/** 시험에 세는 풀인지: 지금 급수의 풀(예전 저장의 시험은 잡초 · 토끼풀). */
export function examCounts(exam, kind) {
  return WEED_KINDS[kind] && WEED_KINDS[kind].grade === (exam.grade || 5);
}

/** 시험 중 뽑기 한 번의 결과를 반영한다. */
export function examStep(exam, result) {
  if (exam.done) return exam;
  const need = exam.need || 5;
  if (result !== 'clean') return { ...exam, done: true, passed: false };
  const streak = exam.streak + 1;
  return { ...exam, streak, done: streak >= need, passed: streak >= need };
}

/** 합격: 급수 숫자를 하나 내리고 경험치를 비운다. */
export function promote(license) {
  return { grade: Math.max(1, license.grade - 1), xp: 0 };
}
