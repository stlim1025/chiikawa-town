import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const C = await import(G + 'combat.js');
const I = await import(G + 'inventory.js');
const J = await import(G + 'jobs.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');
const V = await import(G + 'villagers.js');
const Lc = await import(G + 'licenses.js');

const fresh = () => ({ ...St.createState({ name: 't', look: {} }), money: 5000, player: { x: 0, z: 0 } });

test('weapons need the hunter license', () => {
  const s = fresh();
  const r = C.buyWeapon(s, 'fork');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'license');
  assert.equal(r.state.money, 5000, 'no money taken');
  assert.deepEqual(C.weaponOf(r.state).owned, []);
  assert.ok(C.buyWeapon(Lc.grant(s, 'hunter', 1), 'fork').ok);
});
test('buy and hold weapons', () => {
  let s = Lc.grant(fresh(), 'hunter', 1);
  let r = C.buyWeapon(s, 'stick');
  assert.ok(r.ok); s = r.state;
  assert.equal(s.money, 4700);
  assert.equal(C.heldWeapon(s), 'stick');
  assert.equal(C.buyWeapon(s, 'stick').reason, 'owned');
  assert.equal(C.buyWeapon({ ...s, money: 10 }, 'star').reason, 'money');
  s = C.holdWeapon(s, null); assert.equal(C.heldWeapon(s), null);
  s = C.holdWeapon(s, 'star'); assert.equal(C.heldWeapon(s), null, 'not owned');
  assert.ok(C.isValidWeapon(C.weaponOf(s)));
});
test('drops registered, sell all drops', () => {
  for (const id of Object.keys(C.DROPS)) assert.equal(I.itemInfo(id).kind, 'drop', id);
  let s = fresh();
  s = I.addItem(s, 'fluffdown', 3).state;
  s = I.addItem(s, 'shell', 1).state;
  s = I.addItem(s, 'berry', 2).state;
  const r = C.sellDrops(s);
  assert.equal(r.sold, 4);
  assert.equal(r.earned, 3 * 30 + 80);
  assert.equal(r.state.money, 5000 + 170);
  assert.equal(I.countOf(r.state, 'berry'), 2);
  assert.equal(I.countOf(r.state, 'fluffdown'), 0);
});
test('faint loses 10% capped', () => {
  assert.equal(C.faint({ ...fresh(), money: 1000 }).lost, 100);
  assert.equal(C.faint({ ...fresh(), money: 100000 }).lost, 300);
  assert.equal(C.faint({ ...fresh(), money: 5 }).lost, 0);
  assert.equal(C.faint(fresh()).state.stamina, C.FAINT_STAMINA);
});
test('기절하면 몇 시간이 지나 있다(새벽 6시를 넘기면 다음 날)', async () => {
  const { createClock, hourOf } = await import('../src/core/clock.js');
  assert.ok(C.FAINT_HOURS >= 3);
  const noon = C.faint({ ...fresh(), clock: createClock(4, 12) }).state.clock;
  assert.equal(noon.day, 4);
  assert.equal(Math.round(hourOf(noon)), 12 + C.FAINT_HOURS);
  const dawn = C.faint({ ...fresh(), clock: createClock(4, 4) }).state.clock;
  assert.equal(dawn.day, 5, '새벽 4시에 쓰러지면 깨어날 땐 다음 날');
});
test('swing cone', () => {
  assert.ok(C.inSwing(0, 0, 0, 1.4, 0, 1.2, 0.45));
  assert.ok(!C.inSwing(0, 0, 0, 1.4, 0, -1.2, 0.45), 'behind');
  assert.ok(C.inSwing(0, 0, 0, 1.4, 0.2, 0.3, 0.45), 'very close any side');
  assert.ok(!C.inSwing(0, 0, 0, 1.4, 0, 2.5, 0.45), 'too far');
  assert.ok(C.inSwing(0, 0, Math.PI / 2, 1.4, 1.2, 0, 0.45), 'facing east');
});
test('hunt quiz: 4 choices, answer valid, no dup choices', () => {
  for (let k = 0; k < 40; k++) {
    const qs = C.huntQuiz(6);
    assert.equal(qs.length, 6);
    for (const q of qs) {
      assert.equal(q.choices.length, 4, q.q);
      assert.equal(new Set(q.choices).size, 4, q.q);
      assert.ok(q.answer >= 0 && q.answer < 4);
    }
  }
});
test('hunt jobs need hunter license; payout not multiplied', () => {
  const none = J.availableJobs(5, {});
  assert.ok(!none.some((j) => j.hunt));
  const lic = J.availableJobs(5, { hunter: { day: 1 } });
  assert.equal(lic.filter((j) => j.hunt).length, 5);
  for (const j of lic.filter((j) => j.hunt)) { assert.ok(C.MONSTERS[j.kind], j.id); assert.ok(V.DAILY_JOBS[j.id] > 0, j.id); }
  const job = { ...J.acceptJob('huntFluff'), count: 4, clean: 2 };
  assert.equal(J.payout(job, 1), 320 + 40);
  assert.equal(J.payout(job, 5), 320 + 40);
  assert.ok(Lc.LICENSES.hunter);
  // 토벌 일감은 가방의 전리품을 대신 내지 않는다
  let s = { ...fresh(), job: J.acceptJob('huntFluff') };
  s = I.addItem(s, 'fluffdown', 5).state;
  assert.equal(I.submitToJob(s).moved, 0);
});
test('save validates weapon / hunted', () => {
  const base = fresh();
  assert.ok(S.isValidState({ ...base, weapon: { owned: ['stick'], held: 'stick' }, hunted: { fluff: 2 } }));
  assert.ok(!S.isValidState({ ...base, weapon: { owned: ['laser'], held: null } }));
  assert.ok(!S.isValidState({ ...base, hunted: { dragon: 1 } }));
  assert.ok(S.isValidState({ ...base, licenses: { hunter: { day: 3 } } }));
  assert.ok(S.isValidState({ ...base, board: { day: 1, left: { huntMoth: 1 } } }));
});
