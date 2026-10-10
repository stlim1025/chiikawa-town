import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const W = await import(G + 'weeding.js');
const J = await import(G + 'jobs.js');
const Lc = await import(G + 'license.js');
const V = await import(G + 'villagers.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');

test('10 kinds, 2 per grade, all have where/tip', () => {
  assert.equal(W.WEED_ORDER.length, 10);
  for (const g of [5, 4, 3, 2, 1]) assert.equal(W.kindsOfGrade(g).length, 2, 'grade ' + g);
  for (const k of W.WEED_ORDER) { assert.ok(W.WEED_KINDS[k].where && W.WEED_KINDS[k].tip, k); }
});
test('grade gating', () => {
  assert.ok(W.canPullKind(5, 'weed'));
  assert.ok(!W.canPullKind(5, 'foxtail'));
  assert.ok(W.canPullKind(4, 'foxtail'));
  assert.ok(!W.canPullKind(4, 'thorny'));
  assert.ok(W.canPullKind(1, 'poisonweed'));
});
test('drift zone stays inside gauge and moves', () => {
  for (const k of W.WEED_ORDER) for (const r of [0, 0.5, 0.999]) {
    let p = W.startPull(k, { random: () => r });
    let min = 9, max = -9;
    for (let i = 0; i < 400; i++) { p = W.chargePull(p, 0.01); min = Math.min(min, p.greenFrom); max = Math.max(max, p.greenTo); }
    assert.ok(min >= 0.3 - 1e-9 && max <= 0.97 + 1e-9, `${k} ${min} ${max}`);
    if (W.WEED_KINDS[k].drift) assert.ok(max - min > p.width + 0.05, k + ' should drift');
    else assert.ok(Math.abs(max - min - p.width) < 1e-9, k + ' static');
  }
});
test('tired makes zone narrower and faster', () => {
  const a = W.startPull('reed', { stamina: 100, random: () => 0.5 }), b = W.startPull('reed', { stamina: 10, random: () => 0.5 });
  assert.ok(b.width < a.width && b.chargeTime < a.chargeTime);
});
test('release results', () => {
  let p = W.startPull('weed', { random: () => 0 });
  assert.equal(W.releasePull(W.chargePull(p, 0.1)), 'none');
  const mid = (p.greenFrom + p.greenTo) / 2;
  assert.equal(W.releasePull(W.chargePull(p, mid * p.chargeTime)), 'clean');
  assert.equal(W.releasePull(W.chargePull(p, 1 * p.chargeTime)), 'snapped');
});
test('multi-stage advance', () => {
  let pr = W.advanceWeed(null, 'giantweed', 'clean');
  assert.deepEqual([pr.stage, pr.done], [1, false]);
  pr = W.advanceWeed(pr, 'giantweed', 'none'); assert.equal(pr.stage, 1);
  pr = W.advanceWeed(pr, 'giantweed', 'snapped'); assert.equal(pr.done, false);
  pr = W.advanceWeed(pr, 'giantweed', 'clean'); assert.equal(pr.done, true); assert.equal(pr.final, 'snapped');
  assert.equal(W.advanceWeed(null, 'weed', 'clean').final, 'clean');
  const v1 = W.advanceWeed(null, 'vine', 'clean'), v2 = W.advanceWeed(v1, 'vine', 'clean');
  assert.equal(v2.final, 'clean');
});
test('poison stamina', () => {
  assert.equal(W.pullStamina('poisonweed', 'snapped'), W.STAMINA_PER_PULL + W.POISON_STAMINA);
  assert.equal(W.pullStamina('poisonweed', 'clean'), W.STAMINA_PER_PULL);
  assert.equal(W.pullStamina('weed', 'snapped'), W.STAMINA_PER_PULL);
  assert.equal(W.pullStamina('weed', 'none'), 0);
});
test('josa', () => {
  assert.equal(W.josa('물가 갈대', '을/를'), '물가 갈대를');
  assert.equal(W.josa('강아지풀', '을/를'), '강아지풀을');
  assert.equal(W.josa('잡초', '은/는'), '잡초는');
  assert.equal(W.josa('독풀', '은/는'), '독풀은');
});
test('jobs per grade; every weed kind has a job; old ids kept', () => {
  for (const id of ['weed8', 'sticker10', 'berry6', 'thorny3']) assert.ok(J.JOB_TYPES[id]);
  for (const k of W.WEED_ORDER) assert.ok(Object.values(J.JOB_TYPES).some((j) => j.kind === k), k);
  for (const j of Object.values(J.JOB_TYPES)) if (W.WEED_KINDS[j.kind]) assert.equal(j.needGrade, W.WEED_KINDS[j.kind].grade, j.id);
  assert.deepEqual(J.availableJobs(5).map((j) => j.id).sort(), ['berry6', 'clover6', 'sticker10', 'weed8']);
  assert.equal(J.availableJobs(1).length, Object.values(J.JOB_TYPES).filter((j) => !j.needLicense).length);
  assert.equal(J.availableJobs(1, { hunter: { day: 1 } }).length, Object.keys(J.JOB_TYPES).length);
  assert.equal(J.availableJobs(3)[0].needGrade, 3);
  for (const id of Object.keys(J.JOB_TYPES)) assert.ok(V.DAILY_JOBS[id] > 0, 'daily ' + id);
  let job = J.acceptJob('foxtail6');
  job = J.recordPull(job, 'weed', 'clean'); assert.equal(job.count, 0);
  job = J.recordPull(job, 'foxtail', 'clean'); assert.equal(job.count, 1);
});
test('xp scales with weed grade and stages', () => {
  const lic = { grade: 2, xp: 0 };
  assert.equal(Lc.gainXp(lic, 'clean', 'weed').xp, 2);
  assert.equal(Lc.gainXp(lic, 'clean', 'reed').xp, 4);
  assert.equal(Lc.gainXp(lic, 'clean', 'rockmoss').xp, 10); // 2 * 2.5 * 2
  assert.equal(Lc.gainXp(lic, 'clean').xp, 2);
  assert.equal(Lc.gainXp({ grade: 5, xp: 29 }, 'clean', 'weed').xp, 30); // capped
});
test('exam uses current-grade weeds and per-grade streak', () => {
  let e = Lc.startExam(3);
  assert.equal(e.need, 4);
  assert.ok(Lc.examCounts(e, 'thorny') && Lc.examCounts(e, 'reed') && !Lc.examCounts(e, 'weed'));
  for (let i = 0; i < 3; i++) e = Lc.examStep(e, 'clean');
  assert.equal(e.done, false);
  e = Lc.examStep(e, 'clean'); assert.ok(e.done && e.passed);
  const old = { streak: 2 }; // 예전 저장의 시험
  assert.ok(Lc.examCounts(old, 'weed') && Lc.examCounts(old, 'clover'));
  assert.equal(Lc.examStep(Lc.examStep(Lc.examStep(old, 'clean'), 'clean'), 'clean').passed, true);
  assert.equal(Lc.examStep(Lc.startExam(5), 'snapped').passed, false);
});
test('old board on same day gets new job slots', () => {
  const state = { board: { day: 3, left: { weed8: 1, sticker10: 0, berry6: 2, thorny3: 0 } } };
  const b = V.boardOf(state, 3);
  assert.equal(b.left.weed8, 1); assert.equal(b.left.sticker10, 0); assert.equal(b.left.reed5, V.DAILY_JOBS.reed5);
  assert.ok(V.takeFromBoard(state, 'reed5', 3).ok);
  assert.ok(V.isValidBoard(V.takeFromBoard(state, 'reed5', 3).state.board));
});
test('save validation accepts weedLog and old saves', () => {
  const s = St.createState({ name: '테스트', look: {} });
  assert.ok(S.isValidState(s));
  assert.ok(S.isValidState({ ...s, weedLog: { weed: 3, reed: 1 } }));
  assert.ok(!S.isValidState({ ...s, weedLog: { nope: 1 } }));
  assert.ok(!S.isValidState({ ...s, weedLog: { weed: -1 } }));
  assert.ok(S.isValidState({ ...s, exam: { streak: 1, need: 4, grade: 3, done: false, passed: false } }));
});
