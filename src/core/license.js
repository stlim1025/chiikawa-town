/** 급수별 보수 배율. */
export const PAY_MULT = { 5: 1.0, 4: 1.2, 3: 1.4, 2: 1.7, 1: 2.0 };
/** 다음 급 시험을 보는 데 필요한 경험치. */
export const XP_TO_EXAM = { 5: 30, 4: 60, 3: 100, 2: 150 };
/** 시험 합격에 필요한 연속 깔끔하게 뽑기 횟수. */
export const EXAM_STREAK = 5;
/** 뽑기 결과별 경험치. */
export const XP_PER = { clean: 2, snapped: 1 };

/** 뽑기 결과로 경험치를 얻는다. */
export function gainXp(license, result) {
  if (license.grade <= 1) return license;
  const gain = XP_PER[result] || 0;
  return { ...license, xp: Math.min(XP_TO_EXAM[license.grade], license.xp + gain) };
}

/** 승급 시험을 볼 수 있는지. */
export function canTakeExam(license) {
  return license.grade > 1 && license.xp >= XP_TO_EXAM[license.grade];
}

/** 시험 시작. */
export function startExam() {
  return { streak: 0, done: false, passed: false };
}

/** 시험 중 뽑기 한 번의 결과를 반영한다. */
export function examStep(exam, result) {
  if (exam.done) return exam;
  if (result !== 'clean') return { streak: exam.streak, done: true, passed: false };
  const streak = exam.streak + 1;
  return { streak, done: streak >= EXAM_STREAK, passed: streak >= EXAM_STREAK };
}

/** 합격: 급수 숫자를 하나 내리고 경험치를 비운다. */
export function promote(license) {
  return { grade: Math.max(1, license.grade - 1), xp: 0 };
}
