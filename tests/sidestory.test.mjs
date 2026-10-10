import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Q = await import(G + 'quests.js');
const St = await import(G + 'state.js');
const F = await import(G + 'friends.js');
const R = await import(G + 'rhythm.js');
const S = await import(G + 'save.js');

const at = (day, hour) => ({ day, t: (hour - 6) / 24 });
const fresh = (day = 3, hour = 17) => ({ ...St.createState({ name: 't', look: {} }), tutorial: 'done', clock: at(day, hour) });
const withHearts = (s, kind, h) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: h * F.HEART_PTS, talk: 0, play: 0, gift: true } } });
const seen = (s, day) => ({ ...s, story: { ...(s.story || {}), usagiSeen: day } });

test('side story data is consistent', () => { assert.deepEqual(Q.checkQuestData(), []); });

test('우사기의 집: 우사기가 사라지는 걸 본 다음 날 저녁부터, 하치와레에게 이야기 표시', () => {
  let s = fresh(3, 17);
  assert.ok(!Q.canOffer(s, 'usagiHome'), '아직 못 봤다');
  assert.ok(!Q.canOffer(seen(s, 3), 'usagiHome'), '본 날 저녁에는 아직');
  s = seen(s, 2);
  assert.ok(Q.canOffer(s, 'usagiHome'));
  assert.equal(Q.markOf(s, 'hachiware'), 'story', '퀘스트 ! 와 다른 이야기 표시');
  assert.ok(!Q.canOffer({ ...s, clock: at(3, 11) }, 'usagiHome'), '낮에는 저녁이 될 때까지 기다린다');
  assert.ok(!Q.canOffer({ ...s, tutorial: 'board' }, 'usagiHome'), '첫날 안내 중에는 없다');
});

test('사이드스토리는 한 번에 하나, 끝내고 이틀은 쉰다', () => {
  let s = seen(fresh(5, 17), 4);
  s = Q.startQuest(s, 'usagiHome');
  assert.ok(Q.isActive(s, 'usagiHome'));
  assert.ok(Q.sideBusy(s), '하는 중');
  s = { ...s, quests: { ...s.quests, usagiHome: { step: 1, base: 0, done: 5 } } };
  assert.ok(Q.sideBusy({ ...s, clock: at(6, 12) }), '끝낸 다음 날은 쉰다');
  assert.ok(!Q.sideBusy({ ...s, clock: at(7, 12) }), '이틀 지나면 다음 이야기');
});

test('밤 시간대 visit: 시간 범위(자정 넘어도)와 광장 도착', () => {
  const step = Q.QUESTS.usagiHome.steps[0];
  assert.equal(step.scene, 'usagiClub');
  const plaza = { x: 0, z: 0 };
  assert.ok(Q.arrived(step, plaza, 1, 1, 21));
  assert.ok(!Q.arrived(step, plaza, 1, 1, 18), '저녁 6시는 아직');
  assert.ok(!Q.arrived(step, plaza, 9, 9, 22), '광장 밖');
  assert.ok(Q.inHours(23.5, [20, 26]) && Q.inHours(1, [20, 26]) && !Q.inHours(3, [20, 26]));
});

test('다시 클럽 가는 밤: 우사기의 집을 끝낸 뒤에만, 이야기 표시로', () => {
  let s = withHearts(fresh(9, 20), 'usagi', 2);
  assert.ok(!Q.canOffer(s, 'clubNight'), '아직 우사기의 집을 안 봤다');
  s = { ...s, quests: { usagiHome: { step: 1, base: 0, done: 2 } } };
  const day = [...Array(60).keys()].map((i) => i + 3).find((d) => Q.openWishes({ ...s, clock: at(d, 20) }).includes('clubNight'));
  assert.ok(day, '며칠 안에 한 번은 가자고 한다');
  assert.equal(Q.markOf({ ...s, clock: at(day, 20) }, 'usagi'), 'story');
  assert.equal(Q.QUESTS.clubNight.steps[0].type, 'scene');
  assert.ok(!Q.stepReady(Q.startQuest(s, 'clubNight'), 'clubNight'), '장면이 끝나야 끝난다');
});

test('보상: 같이 한 친구들 친밀도도 오른다', () => {
  let s = seen(fresh(5, 21), 4);
  s = Q.startQuest(s, 'usagiHome');
  const r = Q.completeStep(s, 'usagiHome', 5);
  assert.ok(r.finished);
  for (const k of ['hachiware', 'usagi', 'chiikawa']) assert.ok(F.friendOf(r.state, k).pts > 0, k);
  assert.ok(r.reward.parts.some((p) => p.kind === 'furniture'));
});

test('박자 판정: 딱 맞으면 퍼펙트, 조금 어긋나면 굿, 많이 어긋나면 놓침', () => {
  assert.equal(R.judge(0), 'perfect');
  assert.equal(R.judge(0.06), 'perfect');
  assert.equal(R.judge(-0.12), 'good');
  assert.equal(R.judge(0.3), 'miss');
  const chart = R.clubChart();
  assert.ok(chart.length >= 24, '충분히 길게');
  assert.ok(chart.every((b, i) => i === 0 || b > chart[i - 1]), '박자 순서대로');
  const spb = 60 / R.CLUB_BPM;
  const notes = chart.map((b) => ({ at: b * spb, hit: null }));
  assert.equal(R.press(notes, notes[3].at + 0.02).q, 'perfect');
  assert.equal(notes[3].hit, 'perfect');
  assert.equal(R.press(notes, notes[3].at + 0.02), null, '이미 친 음은 다시 안 친다');
  assert.equal(R.press(notes, -5), null, '근처에 음이 없으면 무시(벌점 없음)');
  const res = R.result([...notes.slice(0, 10).map((n) => ({ ...n, hit: 'perfect' })), ...notes.slice(10).map((n) => ({ ...n, hit: 'miss' }))]);
  assert.equal(res.perfect, 10);
  assert.ok(['S', 'A', 'B', 'C'].includes(res.rank));
  assert.equal(R.result(notes.map((n) => ({ ...n, hit: 'perfect' }))).rank, 'S');
});

test('저장: 이야기 기록(story)은 그대로 불러온다', () => {
  const s = seen(fresh(), 2);
  const back = S.deserialize(S.serialize(s));
  assert.ok(back.ok);
  assert.equal(back.state.story.usagiSeen, 2);
});

test('피자호빵: 아침에 라멘 로우 새 메뉴 소식 → 그날 우사기에게 이야기 표시', async () => {
  let s = withHearts(fresh(3, 9), 'usagi', 1);
  assert.ok(Q.pizzaNewsDue(s), '셋째 날 아침, 우사기와 하트 1');
  assert.ok(!Q.pizzaNewsDue({ ...s, clock: at(2, 9) }), '너무 이르다');
  assert.ok(!Q.pizzaNewsDue({ ...s, clock: at(3, 15) }), '소식은 아침에만');
  assert.ok(!Q.pizzaNewsDue(withHearts(fresh(3, 9), 'usagi', 0)), '우사기와 조금은 친해야');
  assert.ok(!Q.canOffer(s, 'pizzaBun'), '소식 전');
  s = { ...s, story: { pizzaNews: 3 } };
  assert.ok(!Q.pizzaNewsDue(s), '소식은 한 번');
  assert.ok(Q.canOffer(s, 'pizzaBun'), '소식 들은 그날부터');
  assert.equal(Q.markOf(s, 'usagi'), 'story');
  s = Q.startQuest(s, 'pizzaBun');
  assert.ok(!Q.stepReady(s, 'pizzaBun'));
  const Sh = await import(G + 'shop.js');
  const I = await import(G + 'inventory.js');
  const before = Sh.buy({ ...s, story: {}, money: 500 }, 'ramen', 'pizzabun');
  assert.ok(!before.ok, '소식 전에는 안 판다');
  const r = Sh.buy({ ...s, money: 500, stamina: 100 }, 'ramen', 'pizzabun');
  assert.ok(r.ok, '배불러도 포장은 산다');
  assert.equal(I.bagOf(r.state).items.pizzabun, 1, '가방에');
  assert.ok(Q.stepReady(r.state, 'pizzaBun'));
  const done = Q.completeStep(r.state, 'pizzaBun', 3);
  assert.ok(done.finished);
  assert.equal(I.bagOf(done.state).items.pizzabun, 1, '건넨 하나 대신 우사기가 나눠 준 하나');
});

test('장면 단계에서 멈춘 퀘스트(장면 도중 새로고침)는 없던 일로: 다시 부탁받을 수 있다', () => {
  let s = { ...withHearts(fresh(9, 20), 'usagi', 2), quests: { usagiHome: { step: 1, base: 0, done: 2 } } };
  s = Q.startQuest(s, 'clubNight');
  assert.deepEqual(Q.staleScenes(s), ['clubNight']);
  const d = Q.dropQuest(s, 'clubNight');
  assert.ok(!Q.isActive(d, 'clubNight'));
  assert.notEqual(d.questTrack, 'clubNight');
  assert.ok(Q.isDone(d, 'usagiHome'), '다른 기록은 그대로');
  assert.deepEqual(Q.staleScenes(Q.startQuest(fresh(), 'pillow')), [], '장면이 아닌 단계는 그대로');
});
