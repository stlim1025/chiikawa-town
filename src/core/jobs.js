import { PAY_MULT } from './license.js';

/**
 * 노동 접수 일감 종류. needGrade 이하 급수(숫자)부터 받을 수 있다.
 * kind 는 어떤 작업 결과가 이 일감에 세어지는지: weed · thorny(풀 뽑기), sticker(스티커 작업대), berry(열매 덤불).
 * where 는 어디서 하는지(안내 문구용).
 */
export const JOB_TYPES = {
  weed8: { id: 'weed8', title: '잡초 8개 뽑기', kind: 'weed', target: 8, base: 120, cleanBonus: 5, needGrade: 5, where: '마을 곳곳의 풀' },
  sticker10: { id: 'sticker10', title: '과일 스티커 10장 붙이기', kind: 'sticker', target: 10, base: 110, cleanBonus: 4, needGrade: 5, where: '게시판 옆 스티커 작업대' },
  berry6: { id: 'berry6', title: '빨간 열매 6개 따기', kind: 'berry', target: 6, base: 100, cleanBonus: 4, needGrade: 5, where: '마을 가장자리 열매 덤불' },
  thorny3: { id: 'thorny3', title: '위험한 풀 3개 뽑기', kind: 'thorny', target: 3, base: 150, cleanBonus: 10, needGrade: 3, where: '마을 바깥쪽 위험한 풀' }
};

/** 지금 급수로 받을 수 있는 일감. */
export function availableJobs(grade) {
  return Object.values(JOB_TYPES).filter(j => grade <= j.needGrade);
}

/** 일감 수락. */
export function acceptJob(typeId) {
  return { typeId, count: 0, clean: 0 };
}

/** 작업 결과를 일감에 기록한다. kind 는 작업 종류, result 는 'clean'(깔끔·완벽) | 'snapped'(그럭저럭) | 'none'(실패). */
export function recordPull(job, kind, result) {
  const type = JOB_TYPES[job.typeId];
  if (type.kind !== kind || result === 'none' || job.count >= type.target) return job;
  return { ...job, count: job.count + 1, clean: job.clean + (result === 'clean' ? 1 : 0) };
}

/** 목표를 채웠는지. */
export function isComplete(job) {
  return job.count >= JOB_TYPES[job.typeId].target;
}

/** 보수 = (기본 + 깔끔 보너스) × 급수 배율. */
export function payout(job, grade) {
  const type = JOB_TYPES[job.typeId];
  return Math.round((type.base + job.clean * type.cleanBonus) * PAY_MULT[grade]);
}
