import { PAY_MULT } from './license.js';
import { WEED_KINDS } from './weeding.js';

/**
 * 노동 접수 일감 종류. needGrade 이하 급수(숫자)부터 받을 수 있다(풀 일감은 그 풀을 뽑을 수 있는 급수와 같다).
 * kind 는 어떤 작업 결과가 이 일감에 세어지는지: 풀 종류(core/weeding.js 의 WEED_KINDS), sticker(스티커 작업대), berry(열매 덤불).
 * where 는 어디서 하는지(안내 문구용).
 */
export const JOB_TYPES = {
  weed8: { id: 'weed8', title: '잡초 8개 뽑기', kind: 'weed', target: 8, base: 120, cleanBonus: 5, needGrade: 5, where: '마을 곳곳의 풀' },
  clover6: { id: 'clover6', title: '토끼풀 6개 뽑기', kind: 'clover', target: 6, base: 110, cleanBonus: 5, needGrade: 5, where: '마을 · 들판 · 강가' },
  sticker10: { id: 'sticker10', title: '과일 스티커 10장 붙이기', kind: 'sticker', target: 10, base: 110, cleanBonus: 4, needGrade: 5, where: '게시판 옆 스티커 작업대' },
  berry6: { id: 'berry6', title: '빨간 열매 6개 따기', kind: 'berry', target: 6, base: 100, cleanBonus: 4, needGrade: 5, where: '마을 가장자리 열매 덤불' },
  foxtail6: { id: 'foxtail6', title: '강아지풀 6개 뽑기', kind: 'foxtail', target: 6, base: 170, cleanBonus: 8, needGrade: 4, where: '동쪽 들판' },
  vine4: { id: 'vine4', title: '덩굴풀 4개 뽑기', kind: 'vine', target: 4, base: 190, cleanBonus: 10, needGrade: 4, where: '서쪽 숲' },
  thorny3: { id: 'thorny3', title: '위험한 풀 3개 뽑기', kind: 'thorny', target: 3, base: 150, cleanBonus: 10, needGrade: 3, where: '마을 울타리 가 · 숲' },
  reed5: { id: 'reed5', title: '물가 갈대 5개 뽑기', kind: 'reed', target: 5, base: 230, cleanBonus: 12, needGrade: 3, where: '남쪽 강가 · 호숫가' },
  rockmoss4: { id: 'rockmoss4', title: '바위틈 이끼풀 4개 뽑기', kind: 'rockmoss', target: 4, base: 300, cleanBonus: 15, needGrade: 2, where: '북쪽 바위산' },
  moon3: { id: 'moon3', title: '달빛 풀 3개 뽑기', kind: 'moongrass', target: 3, base: 330, cleanBonus: 18, needGrade: 2, where: '숲 · 바위산 (밤에만)' },
  giant2: { id: 'giant2', title: '왕잡초 2개 뽑기', kind: 'giantweed', target: 2, base: 420, cleanBonus: 30, needGrade: 1, where: '서쪽 숲 깊은 곳' },
  poison3: { id: 'poison3', title: '독풀 3개 뽑기', kind: 'poisonweed', target: 3, base: 450, cleanBonus: 25, needGrade: 1, where: '북쪽 바위산 깊은 곳' }
};

/** 풀을 뽑는 일감인지. */
export const isWeedJob = (type) => !!WEED_KINDS[type.kind];

/** 지금 급수로 받을 수 있는 일감(높은 급수 일감부터, 같은 급수는 적힌 순서대로). */
export function availableJobs(grade) {
  return Object.values(JOB_TYPES).filter(j => grade <= j.needGrade).sort((a, b) => a.needGrade - b.needGrade);
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
