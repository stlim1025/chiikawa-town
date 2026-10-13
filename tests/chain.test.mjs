import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Q = await import(G + 'quests.js');
const St = await import(G + 'state.js');
const F = await import(G + 'friends.js');
const I = await import(G + 'inventory.js');
const { BOSS_LAIRS } = await import(G + 'bosses.js');

const at = (day, hour) => ({ day, t: (hour - 6) / 24 });
const fresh = (day = 8, hour = 12) => ({ ...St.createState({ name: 't', look: {} }), tutorial: 'done', clock: at(day, hour) });
const withHearts = (s, kind, h) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: F.ptsForHearts(h), talk: 0, play: 0, gift: true } } });
const hunter = (s) => ({ ...s, licenses: { ...(s.licenses || {}), hunter: { day: 1 } } });
const done = (s, id) => ({ ...s, quests: { ...(s.quests || {}), [id]: { step: Q.QUESTS[id].steps.length, base: 0, done: 1 } } });
const CHAINS = { fieldBurrow: 'bigmole', forestElder: 'elder', riverClaw: 'bigcrab', training2: null };

test('연계 퀘스트: 여러 단계 · 여러 친구를 거치고, 구역 보스 셋은 각자 이야기의 끝에 있다', () => {
  for (const [id, boss] of Object.entries(CHAINS)) {
    const QQ = Q.QUESTS[id];
    assert.ok(QQ && QQ.chain && !QQ.side, id);
    assert.ok(QQ.steps.length >= 4, `${id}: 네 단계 이상`);
    if (boss) { // 보스 연계는 다른 친구에게도 물으러 다닌다(랏코 수련은 랏코와 둘이서)
      assert.ok(new Set(QQ.steps.map((st) => st.to || QQ.giver)).size >= 2, `${id}: 다른 친구도 거친다`);
      assert.ok(BOSS_LAIRS[boss], boss);
      assert.ok(QQ.steps.some((st) => st.type === 'hunt' && st.species === boss && st.n === 1), `${id}: ${boss} 한 마리`);
      assert.ok(QQ.steps.some((st) => st.type === 'visit' && Q.PLACES[st.place]), `${id}: 보스 마당 입구를 먼저 살펴본다`);
    }
  }
  assert.deepEqual(Q.checkQuestData(), []);
});

test('연계 퀘스트 여는 조건: 의뢰한 친구 하트 · 토벌 자격증 · 앞 부탁', () => {
  const s = hunter(withHearts(fresh(8, 12), 'usagi', 3));
  assert.ok(Q.canOffer(s, 'fieldBurrow'));
  assert.ok(!Q.canOffer(hunter(withHearts(fresh(8, 12), 'usagi', 2)), 'fieldBurrow'), '우사기 하트 3개부터');
  assert.ok(!Q.canOffer(withHearts(fresh(8, 12), 'usagi', 3), 'fieldBurrow'), '토벌 자격증이 있어야');
  const m = hunter(withHearts(fresh(8, 12), 'momonga', 3));
  assert.ok(!Q.canOffer(m, 'forestElder'), '모몽가의 보물 상자를 끝낸 뒤');
  assert.ok(Q.canOffer(done(m, 'treasure'), 'forestElder'));
  assert.ok(Q.canOffer(hunter(withHearts(fresh(8, 12), 'kani', 2)), 'riverClaw'));
  const r = hunter(withHearts(fresh(8, 12), 'rakko', 3));
  assert.ok(!Q.canOffer(r, 'training2'), '랏코의 수련을 끝낸 뒤');
  assert.ok(Q.canOffer(done(r, 'training'), 'training2'));
});

test('들판의 굴밭: 흙두더지 → 당근 → 랏코 → 굴밭 입구 → 우사기 → 대왕 두더지 → 밀짚모자', () => {
  let s = Q.startQuest(hunter(withHearts(fresh(8, 12), 'usagi', 3)), 'fieldBurrow');
  const kill = (sp, n) => { s = { ...s, hunted: { ...(s.hunted || {}), [sp]: ((s.hunted || {})[sp] || 0) + n } }; };
  const next = () => { const r = Q.completeStep(s, 'fieldBurrow', 8); s = r.state; return r; };
  kill('mole', 4);
  assert.ok(Q.stepReady(s, 'fieldBurrow'), '흙두더지 네 마리');
  next();
  s = I.addItem(s, 'sweetroot', 3).state;
  assert.ok(Q.stepReady(s, 'fieldBurrow'), '당근 세 개');
  next();
  assert.equal(Q.reportTo('fieldBurrow', Q.stepOf(s, 'fieldBurrow')), 'rakko', '랏코에게 묻는다');
  next();
  const gate = Q.stepOf(s, 'fieldBurrow');
  assert.equal(gate.type, 'visit');
  assert.ok(Q.arrived(gate, BOSS_LAIRS.bigmole.door, BOSS_LAIRS.bigmole.door.x, BOSS_LAIRS.bigmole.door.z, 12), '굴밭 입구에 오면');
  next();
  next(); // 우사기에게 이야기
  kill('bigmole', 1);
  assert.ok(Q.stepReady(s, 'fieldBurrow'), '대왕 두더지 한 마리');
  const r = next();
  assert.ok(r.finished);
  assert.ok(r.state.wardrobe.owned.includes('strawhat'));
  assert.ok(r.state.money >= 1200);
});

test('랏코의 수련 2부: 바위산 → 같이 라멘 → 저녁 수련장 대련 → 돌 망치', () => {
  let s = Q.startQuest(done(hunter(withHearts(fresh(8, 12), 'rakko', 3)), 'training'), 'training2');
  const next = () => { const r = Q.completeStep(s, 'training2', 8); s = r.state; return r; };
  s = { ...s, hunted: { pebble: 3 } };
  next();
  s = { ...s, hunted: { pebble: 3, ram: 2 } };
  assert.ok(Q.stepReady(s, 'training2'));
  next();
  const st = Q.stepOf(s, 'training2');
  assert.equal(st.type, 'together');
  assert.ok(!Q.stepReady(s, 'training2'), '혼자 먹은 라멘은 안 센다');
  s = Q.logAct(s, 'ramen', ['rakko']);
  assert.ok(Q.stepReady(s, 'training2'), '랏코랑 같이 먹었다');
  next();
  const dojo = Q.stepOf(s, 'training2');
  assert.ok(dojo.type === 'visit' && dojo.place === 'dojo' && dojo.evening);
  assert.ok(!Q.arrived(dojo, { x: 0, z: 0 }, 0, 0, 12) && Q.arrived(dojo, { x: 0, z: 0 }, 0, 0, 18), '저녁에만');
  const r = next();
  assert.ok(r.finished);
  assert.ok(r.state.weapon.owned.includes('hammer'));
});
