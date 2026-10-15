import test from 'node:test';
import assert from 'node:assert/strict';
import { WEED_START, weedOf, friendGrade, gradeAllows, friendLeaves, friendPay, pickJob, friendWorkXp, weedExamChance, canTryWeedExam, tryWeedExam } from '../src/core/friendweed.js';
import { NOVICE, XP_TO_EXAM, EXAM_FEE, PAY_MULT } from '../src/core/license.js';
import { JOB_TYPES } from '../src/core/jobs.js';
import { VILLAGERS, DAILY_JOBS, villagerOf, isValidVillagers } from '../src/core/villagers.js';
import { canDoJob } from '../src/core/goals.js';
import { createState } from '../src/core/state.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', ...o });
/** 그 친구의 제초 급수(와 지갑)를 정해 둔 상태. */
const withWeed = (s, kind, weed, money) => ({
  ...s, villagers: { ...(s.villagers || {}), [kind]: { ...villagerOf(s, kind, 1), ...(money === undefined ? {} : { money }), weed } }
});
const WORKERS = Object.keys(VILLAGERS).filter((k) => VILLAGERS[k].jobs.length);

test('처음 급수: 치이카와 하치와레는 견습, 우사기는 3급(일하는 친구는 모두 급수가 있다)', () => {
  const s = fresh();
  assert.equal(friendGrade(s, 'chiikawa'), NOVICE);
  assert.equal(friendGrade(s, 'hachiware'), NOVICE);
  assert.equal(friendGrade(s, 'usagi'), 3);
  for (const k of WORKERS) {
    assert.ok(WEED_START[k] >= 1 && WEED_START[k] <= NOVICE, `${k} 처음 급수`);
    assert.deepEqual(weedOf(s, k), { grade: WEED_START[k], xp: 0, tries: 0, tryDay: null });
  }
});

test('친구가 할 줄 아는 일감은 모두 게시판에 올라오는 일감이다', () => {
  for (const k of WORKERS) for (const id of VILLAGERS[k].jobs) {
    assert.ok(JOB_TYPES[id], `${k} ${id}`);
    assert.ok(DAILY_JOBS[id] > 0, `${k} ${id} 는 하루에 올라온다`);
  }
});

test('풀 일감은 급수가 되어야 받는다(낚시 일감은 급수와 상관없다)', () => {
  const s = fresh();
  assert.ok(gradeAllows(s, 'chiikawa', 'weed8'));
  assert.ok(!gradeAllows(s, 'chiikawa', 'clover6'), '견습은 5급 토끼풀을 못 받는다');
  assert.ok(!canDoJob(s, 'chiikawa', 'foxtail6'));
  assert.ok(gradeAllows(s, 'usagi', 'thorny3'), '우사기는 처음부터 3급 풀');
  assert.ok(!gradeAllows(s, 'usagi', 'rockmoss4'), '2급 풀은 아직');
  assert.ok(!gradeAllows(s, 'usagi', 'giant2'));
  assert.ok(gradeAllows(s, 'hachiware', 'fishMinnow'));
  const up = withWeed(s, 'chiikawa', { grade: 4, xp: 0 });
  assert.ok(canDoJob(up, 'chiikawa', 'foxtail6'), '4급이 되면 강아지풀 일감도');
  assert.ok(canDoJob(up, 'chiikawa', 'clover6'));
});

test('보수에는 그 친구 급수 배율이 붙는다(낚시 일감은 그대로)', () => {
  const s = fresh();
  assert.equal(friendPay(s, 'chiikawa', 'weed8'), JOB_TYPES.weed8.base);
  assert.equal(friendPay(s, 'usagi', 'thorny3'), Math.round(JOB_TYPES.thorny3.base * PAY_MULT[3]));
  assert.ok(friendPay(s, 'usagi', 'weed8') > JOB_TYPES.weed8.base, '3급이 뽑은 잡초는 더 받는다');
  assert.equal(friendPay(withWeed(s, 'hachiware', { grade: 2, xp: 0 }), 'hachiware', 'fishMinnow'), JOB_TYPES.fishMinnow.base);
});

test('4급부터의 풀 일감은 게시판에 하나는 내 몫으로 남긴다', () => {
  assert.ok(friendLeaves('foxtail6', { foxtail6: 1 }));
  assert.ok(!friendLeaves('foxtail6', { foxtail6: 2 }));
  assert.ok(friendLeaves('giant2', { giant2: 1 }));
  assert.ok(!friendLeaves('weed8', { weed8: 1 }), '잡초는 마지막 하나도 받아 간다');
  assert.ok(friendLeaves('weed8', { weed8: 0 }));
  assert.ok(!friendLeaves('fishMinnow', { fishMinnow: 1 }));
});

test('일감 고르기: 받을 수 있는 것 가운데, 보수가 많을수록 자주', () => {
  const s = fresh();
  assert.equal(pickJob(s, 'usagi', []), null);
  assert.equal(pickJob(s, 'usagi', ['weed8', 'thorny3'], () => 0), 'weed8');
  assert.equal(pickJob(s, 'usagi', ['weed8', 'thorny3'], () => 0.9999), 'thorny3');
  let seed = 7, thorny = 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 400; i++) if (pickJob(s, 'usagi', ['weed8', 'thorny3'], random) === 'thorny3') thorny++;
  assert.ok(thorny > 200, `보수가 많은 가시풀을 더 자주(${thorny}/400)`);
});

test('풀 일감을 끝내면 경험치가 쌓이고, 다음 시험 몫에서 멈춘다(열매 스티커는 안 쌓인다)', () => {
  let s = fresh();
  s = friendWorkXp(s, 'chiikawa', 'weed8', 1);
  assert.ok(weedOf(s, 'chiikawa').xp > 0);
  for (let i = 0; i < 10; i++) s = friendWorkXp(s, 'chiikawa', 'weed8', 1);
  assert.equal(weedOf(s, 'chiikawa').xp, XP_TO_EXAM[NOVICE]);
  assert.equal(weedOf(s, 'chiikawa').grade, NOVICE, '경험치만으로는 안 오른다');
  const t = fresh();
  assert.equal(friendWorkXp(t, 'chiikawa', 'berry6', 1), t);
  assert.equal(friendWorkXp(t, 'chiikawa', 'sticker10', 1), t);
  const top = withWeed(t, 'rakko', { grade: 1, xp: 0 });
  assert.equal(friendWorkXp(top, 'rakko', 'thorny3', 1), top, '1급은 더 쌓을 게 없다');
});

test('승급 시험: 경험치가 차고 응시료가 있을 때 하루 한 번', () => {
  const s = fresh();
  assert.ok(!canTryWeedExam(s, 'chiikawa', 1), '경험치가 없다');
  const poor = withWeed(s, 'chiikawa', { grade: NOVICE, xp: XP_TO_EXAM[NOVICE] }, EXAM_FEE[NOVICE] - 1);
  assert.ok(!canTryWeedExam(poor, 'chiikawa', 1), '응시료가 모자라다');
  const ready = withWeed(s, 'chiikawa', { grade: NOVICE, xp: XP_TO_EXAM[NOVICE] }, 300);
  assert.ok(canTryWeedExam(ready, 'chiikawa', 1));

  const pass = tryWeedExam(ready, 'chiikawa', 1, () => 0);
  assert.ok(pass.passed);
  assert.equal(pass.grade, 5);
  assert.equal(pass.fee, EXAM_FEE[NOVICE]);
  assert.deepEqual(weedOf(pass.state, 'chiikawa'), { grade: 5, xp: 0, tries: 0, tryDay: 1 });
  assert.equal(villagerOf(pass.state, 'chiikawa', 1).money, 300 - EXAM_FEE[NOVICE]);
  assert.ok(gradeAllows(pass.state, 'chiikawa', 'clover6'), '5급이 되면 토끼풀 일감도');

  const fail = tryWeedExam(ready, 'chiikawa', 1, () => 0.9999);
  assert.ok(!fail.passed);
  assert.deepEqual(weedOf(fail.state, 'chiikawa'), { grade: NOVICE, xp: XP_TO_EXAM[NOVICE], tries: 1, tryDay: 1 });
  assert.ok(!canTryWeedExam(fail.state, 'chiikawa', 1), '그날은 다시 안 본다');
  assert.ok(canTryWeedExam(fail.state, 'chiikawa', 2), '다음 날 다시');
  assert.ok(weedExamChance(fail.state, 'chiikawa') > weedExamChance(ready, 'chiikawa'), '떨어질수록 조금씩 잘한다');

  assert.ok(!canTryWeedExam(withWeed(s, 'rakko', { grade: 1, xp: 999 }, 999), 'rakko', 1), '1급은 더 볼 시험이 없다');
});

test('저장된 친구 제초 급수 모양을 검사한다', () => {
  assert.ok(isValidVillagers(withWeed(fresh(), 'usagi', { grade: 3, xp: 12, tries: 1, tryDay: 4 }).villagers));
  assert.ok(!isValidVillagers(withWeed(fresh(), 'usagi', { grade: 7, xp: 0 }).villagers));
  assert.ok(!isValidVillagers(withWeed(fresh(), 'usagi', { grade: 3, xp: -1 }).villagers));
  assert.ok(!isValidVillagers(withWeed(fresh(), 'usagi', null).villagers));
});
