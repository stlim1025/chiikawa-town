import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Q = await import(G + 'quests.js');
const I = await import(G + 'inventory.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');
const F = await import(G + 'friends.js');
const C = await import(G + 'combat.js');
const V = await import(G + 'villagers.js');
const L = await import(G + 'licenses.js');

const fresh = () => ({ ...St.createState({ name: 't', look: {} }), tutorial: 'done', money: 1000, player: { x: 0, z: 0 } });
const withHearts = (s, kind, h) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: F.ptsForHearts(h), talk: 0, play: 0, gift: true } } });

test('quest data consistent', () => { assert.deepEqual(Q.checkQuestData(), []); });
test('offers need hearts / license / tutorial', () => {
  let s = fresh();
  assert.ok(!Q.canOffer(s, 'pillow'));
  s = withHearts(s, 'chiikawa', 1);
  assert.ok(Q.canOffer(s, 'pillow'));
  assert.equal(Q.markOf(s, 'chiikawa'), '!');
  assert.ok(Q.canOffer(s, 'story'));
  assert.ok(!Q.canOffer({ ...s, tutorial: 'board' }, 'story'));
  const r = withHearts(s, 'rakko', 3);
  assert.ok(!Q.canOffer(r, 'training'));
  assert.ok(Q.canOffer({ ...r, licenses: { hunter: { day: 1 } } }, 'training'));
});
test('bring quest: progress, report, reward', () => {
  let s = withHearts(fresh(), 'chiikawa', 1);
  s = Q.startQuest(s, 'pillow');
  assert.equal(s.questTrack, 'pillow');
  assert.ok(!Q.canOffer(s, 'pillow'));
  assert.deepEqual(Q.progressOf(s, 'pillow'), { have: 0, need: 3 });
  assert.ok(!Q.stepReady(s, 'pillow'));
  assert.deepEqual(Q.questsFor(s, 'chiikawa').waiting, ['pillow']);
  s = I.addItem(s, 'fluffdown', 5).state;
  assert.ok(Q.stepReady(s, 'pillow'));
  assert.equal(Q.markOf(s, 'chiikawa'), '?');
  assert.equal(Q.goalText(s, 'pillow').text, '치이카와에게 갖다주자!');
  assert.equal(Q.shortGoal(s, 'pillow').goal, '치이카와에게 갖다주자!');
  const r = Q.completeStep(s, 'pillow', 3);
  assert.ok(r.finished);
  assert.equal(I.countOf(r.state, 'fluffdown'), 2);
  assert.equal(r.state.money, 1300);
  assert.ok(r.state.wardrobe.owned.includes('flower'));
  assert.equal(F.friendOf(r.state, 'chiikawa').pts, F.ptsForHearts(1) + Q.QUESTS.pillow.reward.bond); // 하트 1개 + 부탁 보상 점수
  assert.ok(Q.isDone(r.state, 'pillow'));
  assert.equal(r.state.questTrack, null);
  assert.ok(S.isValidState(r.state));
});
test('퀘스트 안내는 말하듯(…하자! · …주자!): 단어만 이어 붙인 \'…하기\' · \'토벌\' · 가운뎃점(·)으로 이은 말이 없다', () => {
  const spoken = (text, where) => {
    assert.match(text, /[!~♪]$/, `말하듯 끝나야: ${where}: ${text}`);
    assert.ok(!/ · /.test(text), `가운뎃점으로 이은 말: ${where}: ${text}`);
    assert.ok(!/(토벌|건네주기|알리기|뽑기|가기|먹기|만나기)$/.test(text.replace(/[!~♪]+$/, '')), `'…하기' 말투: ${where}: ${text}`);
  };
  // 단계마다 적어 둔 목표(괄호 속은 어디서 · 언제 꼬리표라 뺀다)
  for (const [id, QQ] of Object.entries(Q.QUESTS)) QQ.steps.forEach((st, i) => spoken(st.goal.replace(/\s*\([^)]*\)/g, '').trim(), `${id}[${i}]`));
  // 화면 쪽지 · 가운데 카드 · '부탁 다시 듣기'(토벌 · 풀 · 건네주기는 그 자리에서 만든 글)
  for (const id of Q.QUEST_ORDER) {
    const s = Q.startQuest(withHearts(fresh(), Q.QUESTS[id].giver, 5), id);
    spoken(Q.shortGoal(s, id).goal, `${id} shortGoal`);
    spoken(Q.goalText(s, id).text, `${id} goalText`);
  }
  const hunt = Q.QUEST_ORDER.find((id) => Q.QUESTS[id].steps[0].type === 'hunt');
  assert.match(Q.shortGoal(Q.startQuest(fresh(), hunt), hunt).goal, /(을|를) 잡자!$/);
});
test('hunt counts only after accepting', () => {
  let s = withHearts(fresh(), 'usagi', 1);
  s = { ...s, hunted: { fluff: 10 } };
  s = Q.startQuest(s, 'picnic');
  assert.deepEqual(Q.progressOf(s, 'picnic'), { have: 0, need: 4 });
  s = { ...s, hunted: { fluff: 13 } };
  assert.ok(!Q.stepReady(s, 'picnic'));
  s = { ...s, hunted: { fluff: 14 } };
  assert.ok(Q.stepReady(s, 'picnic'));
  const r = Q.completeStep(s, 'picnic', 2);
  assert.equal(I.countOf(r.state, 'riceball'), 3);
  assert.equal(I.eatItem({ ...r.state, stamina: 50 }, 'riceball').gain, 20);
});
test('story chain steps & visit', () => {
  let s = Q.startQuest(fresh(), 'story');
  // 먼저 검정소 토벌 안내서를 읽고 대장 갑옷 씨에게 알린다
  assert.equal(Q.stepOf(s, 'story').type, 'study');
  assert.ok(!Q.stepReady(s, 'story'));
  assert.equal(Q.shortGoal(s, 'story').n, '', '안내서 읽기는 0 / 1 을 안 보인다');
  s = L.markStudy(s, 'hunter', 1);
  assert.ok(Q.stepReady(s, 'story'));
  assert.deepEqual(Q.questsFor(s, 'captain').report, ['story']);
  s = Q.completeStep(s, 'story', 1).state;
  assert.equal(Q.stepOf(s, 'story').type, 'license');
  assert.ok(!Q.stepReady(s, 'story'));
  s = { ...s, licenses: { hunter: { day: 1 } } };
  assert.ok(Q.stepReady(s, 'story'));
  s = Q.completeStep(s, 'story', 1).state;
  assert.equal(Q.stepOf(s, 'story').type, 'hunt');
  s = { ...s, hunted: { turtle: 3 } };
  s = Q.completeStep(s, 'story', 1).state;
  assert.deepEqual(Q.questsFor(s, 'rakko').report, ['story']);
  s = Q.completeStep(s, 'story', 1).state; // rakko
  s = Q.completeStep(s, 'story', 1).state; // kani
  const st = Q.stepOf(s, 'story');
  assert.equal(st.type, 'visit');
  assert.ok(Q.arrived(st, { x: 10, z: 10 }, 12, 12, 13));
  assert.ok(!Q.arrived(st, { x: 10, z: 10 }, 30, 12, 13));
  const song = Q.QUESTS.song.steps[1];
  assert.ok(!Q.arrived(song, { x: 0, z: 0 }, 0, 0, 13), 'cave only at night');
  assert.ok(Q.arrived(song, { x: 0, z: 0 }, 0, 0, 21));
  for (let i = 0; i < 4; i++) s = Q.completeStep(s, 'story', 5).state;
  assert.ok(Q.isDone(s, 'story'));
  assert.ok(s.wardrobe.owned.includes('crown'));
  assert.ok(s.money >= 6000);
  assert.ok(S.isValidState(s));
});
test('weapon reward falls back to money', () => {
  let s = withHearts({ ...fresh(), licenses: { hunter: { day: 1 } }, weapon: { owned: ['sword'], held: 'sword' } }, 'rakko', 2);
  s = Q.startQuest(s, 'training');
  s = { ...s, hunted: { fluff: 3 } };
  const r = Q.completeStep(s, 'training', 1);
  assert.equal(r.state.money, 1000 + 300 + Math.round(C.WEAPONS.sword.price / 2));
});
test('save rejects bad quests', () => {
  assert.ok(!S.isValidState({ ...fresh(), quests: { nope: { step: 0, base: 0 } } }));
  assert.ok(!S.isValidState({ ...fresh(), questTrack: 'nope' }));
  assert.ok(S.isValidState({ ...fresh(), quests: { story: { step: 2, base: 0 } }, questTrack: 'story', story: { bossSeen: true }, truce: 4 }));
});

test('술 공부 부탁(쿠리만쥬): 강의 8강 → 술 자격 시험, 자격이 있으면 부탁하지 않는다', () => {
  let s = fresh();
  assert.ok(Q.canOffer(s, 'liquorStudy'), '처음부터(하트 0) 부탁한다');
  assert.ok(!Q.canOffer({ ...s, tutorial: 'board' }, 'liquorStudy'), '첫날 안내가 끝난 뒤');
  assert.ok(!Q.canOffer({ ...s, licenses: { liquor: { day: 1 } } }, 'liquorStudy'), '이미 술 자격이 있으면 안 한다');
  s = Q.startQuest(s, 'liquorStudy');
  assert.equal(Q.stepOf(s, 'liquorStudy').type, 'study');
  for (let n = 1; n < L.LIQUOR_LESSONS.length; n++) {
    s = L.markStudy({ ...s, liquorLesson: n }, 'liquor', n);
    assert.ok(!Q.stepReady(s, 'liquorStudy'), `${n}강까지`);
    assert.equal(Q.shortGoal(s, 'liquorStudy').n, `${n} / ${L.LIQUOR_LESSONS.length}`);
  }
  s = L.markStudy({ ...s, liquorLesson: 8 }, 'liquor', 8);
  assert.ok(Q.stepReady(s, 'liquorStudy'));
  assert.deepEqual(Q.questsFor(s, 'kurimanju').report, ['liquorStudy']);
  s = Q.completeStep(s, 'liquorStudy', 2).state;
  assert.equal(Q.stepOf(s, 'liquorStudy').type, 'license');
  s = { ...s, licenses: { liquor: { day: 2 } } };
  const r = Q.completeStep(s, 'liquorStudy', 2);
  assert.ok(r.finished && I.countOf(r.state, 'bottlebeer') === 2);
  assert.ok(S.isValidState(r.state));
});

test('공부 기록: 강의는 다 들어야, 안내서 · 레시피 북은 한 번 펼치면 · 예전 저장의 강의 번호도 센다', () => {
  const s = fresh();
  for (const id of Object.keys(L.STUDY)) assert.ok(!L.isStudied(s, id), id);
  assert.ok(L.isStudied(L.markStudy(s, 'hunter', 3), 'hunter'));
  assert.ok(L.isStudied(L.markStudy(s, 'arbeiter', 3), 'arbeiter'));
  assert.deepEqual(L.studyProgress({ ...s, liquorLesson: 5 }, 'liquor'), { have: 5, need: 8 });
  assert.equal(L.markStudy(L.markStudy(s, 'hunter', 3), 'hunter', 9).study.hunter, 3, '처음 펼친 날 그대로');
  assert.equal(L.markStudy(L.markStudy(s, 'liquor', 6), 'liquor', 2).study.liquor, 6, '들은 강의 수는 줄지 않는다');
  assert.ok(S.isValidState({ ...s, study: { liquor: 8, hunter: 2 } }));
  assert.ok(!S.isValidState({ ...s, study: { cooking: 1 } }));
  assert.ok(!S.isValidState({ ...s, study: { hunter: 'yes' } }));
});

test('예전 저장(버전 3)의 이야기 퀘스트는 단계 번호를 한 칸 밀어 하던 단계 그대로', () => {
  const at = (step) => S.deserialize(S.serialize({ ...fresh(), version: 3, quests: { story: { step, base: 0 } } })).state;
  assert.equal(Q.stepOf(at(0), 'story').type, 'license', '자격증 따기 하던 사람은 그대로 자격증 따기');
  assert.equal(Q.stepOf(at(1), 'story').type, 'hunt');
  const done = S.deserialize(S.serialize({ ...fresh(), version: 3, quests: { story: { step: 8, base: 0, done: 20 } } })).state;
  assert.ok(Q.isDone(done, 'story'));
  assert.ok(S.isValidState(done));
  // 지금 버전은 그대로
  assert.equal(S.deserialize(S.serialize({ ...fresh(), quests: { story: { step: 0, base: 0 } } })).state.quests.story.step, 0);
});

test('같이 다니는 일상 부탁(같이 하기 · 같이 가기)은 잘 시간 두 시간 전부터 새로 뜨지 않는다', () => {
  const { BED_HOUR } = V;
  const buddy = Q.QUEST_ORDER.filter((id) => Q.QUESTS[id].daily && Q.QUESTS[id].steps.some((st) => st.type === 'together' || (st.type === 'visit' && st.with)));
  assert.ok(buddy.includes('ramenDate') && buddy.includes('weedPal'));
  const late = BED_HOUR - Q.BUDDY_WISH_GAP + 0.25;
  for (const id of buddy) for (let day = 1; day <= 30; day++) {
    const s = { ...fresh(), clock: { day, t: (late - 6) / 24 } };
    assert.equal(Q.wishNow(s, id), false, `${id} ${day}일 ${late}시`);
  }
});
