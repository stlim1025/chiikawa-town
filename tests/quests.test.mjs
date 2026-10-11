import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Q = await import(G + 'quests.js');
const I = await import(G + 'inventory.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');
const F = await import(G + 'friends.js');
const C = await import(G + 'combat.js');

const fresh = () => ({ ...St.createState({ name: 't', look: {} }), tutorial: 'done', money: 1000, player: { x: 0, z: 0 } });
const withHearts = (s, kind, h) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: h * F.HEART_PTS, talk: 0, play: 0, gift: true } } });

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
  assert.equal(F.hearts(F.friendOf(r.state, 'chiikawa')), 2);
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
  let s = withHearts({ ...fresh(), licenses: { hunter: { day: 1 } }, weapon: { owned: ['hammer'], held: 'hammer' } }, 'rakko', 2);
  s = Q.startQuest(s, 'training');
  s = { ...s, hunted: { fluff: 3 } };
  const r = Q.completeStep(s, 'training', 1);
  assert.equal(r.state.money, 1000 + 300 + Math.round(C.WEAPONS.hammer.price / 2));
});
test('save rejects bad quests', () => {
  assert.ok(!S.isValidState({ ...fresh(), quests: { nope: { step: 0, base: 0 } } }));
  assert.ok(!S.isValidState({ ...fresh(), questTrack: 'nope' }));
  assert.ok(S.isValidState({ ...fresh(), quests: { story: { step: 2, base: 0 } }, questTrack: 'story', story: { bossSeen: true }, truce: 4 }));
});
