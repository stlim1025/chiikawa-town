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
const withHearts = (s, kind, h) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: F.ptsForHearts(h), talk: 0, play: 0, gift: true } } });
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

test('피자호빵: 소풍 자리를 끝낸 뒤 아침에 라멘 로우 새 메뉴 소식 → 그날 우사기에게 이야기 표시', async () => {
  const noPicnic = withHearts(fresh(3, 9), 'usagi', 1);
  assert.ok(!Q.pizzaNewsDue(noPicnic), '우사기의 소풍 자리 먼저(같은 하트 1이라 겹치지 않게)');
  assert.ok(!Q.canOffer({ ...noPicnic, story: { pizzaNews: 3 } }, 'pizzaBun'), '소식을 들었어도 소풍 자리 먼저');
  let s = { ...noPicnic, quests: { picnic: { step: 1, base: 0, done: 2 } } };
  assert.ok(Q.pizzaNewsDue(s), '셋째 날 아침, 우사기와 하트 1');
  assert.ok(!Q.pizzaNewsDue({ ...s, clock: at(2, 9) }), '너무 이르다');
  assert.ok(!Q.pizzaNewsDue({ ...s, clock: at(3, 15) }), '소식은 아침에만');
  assert.ok(!Q.pizzaNewsDue(withHearts(s, 'usagi', 0)), '우사기와 조금은 친해야');
  assert.ok(!Q.canOffer(s, 'pizzaBun'), '소식 전');
  s = { ...s, story: { pizzaNews: 3 } };
  assert.ok(!Q.pizzaNewsDue(s), '소식은 한 번');
  assert.ok(Q.canOffer(s, 'pizzaBun'), '소식 들은 그날부터');
  assert.equal(Q.markOf(s, 'usagi'), 'story');
  assert.notEqual(Q.QUESTS.pizzaBun.ask, '우라?', '우사기 일상 부탁(우라?)과 같은 고를 거리가 두 번 뜨지 않게');
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

test('시사의 슈퍼 알바이터: 면 삶기 특훈 뒤 아침에 이야기 표시 → 저녁 공부 → 다음 날 검정소 → 특제 라멘', async () => {
  let s = withHearts(fresh(6, 10), 'shisa', 1);
  assert.ok(!Q.canOffer(s, 'shisaArbeiter'), '면 삶기 특훈 먼저');
  s = { ...s, quests: { noodles: { step: 1, base: 0, done: 4 } } };
  assert.ok(Q.canOffer(s, 'shisaArbeiter'));
  assert.equal(Q.markOf(s, 'shisa'), 'story');
  s = Q.startQuest(s, 'shisaArbeiter');
  assert.ok(!Q.stepReady(s, 'shisaArbeiter'), '공부는 저녁에');
  assert.equal(Q.markOf(s, 'shisa'), null, '낮에는 ? 도 안 뜬다');
  const eve = { ...s, clock: at(6, 18) };
  assert.ok(Q.stepReady(eve, 'shisaArbeiter'));
  assert.equal(Q.markOf(eve, 'shisa'), '?');
  const r1 = Q.completeStep(eve, 'shisaArbeiter', 6);
  const exam = r1.next;
  assert.equal(exam.scene, 'shisaExam');
  assert.ok(Q.arrived(exam, { x: 0, z: 0 }, 0.5, 0.5, 10) && !Q.arrived(exam, { x: 0, z: 0 }, 0.5, 0.5, 19), '시험은 낮에');
  const Sh = await import(G + 'shop.js');
  assert.ok(!Sh.buy({ ...r1.state, money: 500, stamina: 10 }, 'ramen', 'shisaramen').ok, '합격 전에는 특제 라멘이 없다');
  const r2 = Q.completeStep({ ...r1.state, clock: at(7, 10) }, 'shisaArbeiter', 7);
  assert.ok(r2.finished);
  assert.equal(r2.state.story.shisaPass, 7, '합격한 날');
  assert.ok(Sh.buy({ ...r2.state, money: 500, stamina: 10 }, 'ramen', 'shisaramen').ok, '합격 뒤에는 특제 라멘');
  assert.ok(F.friendOf(r2.state, 'ramen').pts > 0, '사부님과도 친해진다');
});

test('하치와레가 구덩이에!: 말로는 시작 안 함(숲에서 발견) · 덩굴풀 3개면 끌어올릴 수 있다', async () => {
  const I = await import(G + 'inventory.js');
  let s = withHearts(fresh(5, 12), 'hachiware', 2);
  const noSong = { ...s, license: { ...(s.license || {}), grade: 4 } };
  assert.ok(!Q.pitDue(noSong), '하치와레의 동굴 무대 먼저(같은 하트 2라 겹치지 않게)');
  const g4 = { ...noSong, quests: { song: { step: 2, base: 0, done: 4 } } };
  assert.ok(!Q.canOffer(g4, 'hachiPit'), '말 걸어서는 시작하지 않는다');
  assert.ok(!Q.questsFor(g4, 'hachiware').offer.includes('hachiPit'), '이야기 표시로 부르지 않는다(별 세 개 레스토랑은 따로)');
  assert.ok(Q.pitDue(g4), '4급 · 하트 2 · 낮 · 넷째 날부터');
  assert.ok(!Q.pitDue({ ...g4, license: { ...g4.license, grade: 5 } }), '5급이면 덩굴풀을 못 뽑는다');
  assert.ok(!Q.pitDue({ ...g4, clock: at(5, 20) }), '밤에는 아니다');
  assert.ok(!Q.pitDue({ ...g4, clock: at(3, 12) }), '넷째 날부터');
  s = Q.startQuest(g4, 'hachiPit');
  assert.ok(!Q.pitDue(s), '한 번만');
  assert.ok(!Q.questsFor(s, 'hachiware').report.includes('hachiPit'), '덩굴풀이 모자라면 아직');
  s = I.addItem(s, 'vine', 3).state;
  assert.ok(Q.questsFor(s, 'hachiware').report.includes('hachiPit'));
  assert.equal(Q.markOf(s, 'hachiware'), '?');
  const r = Q.completeStep(s, 'hachiPit', 5);
  assert.ok(r.finished);
  assert.equal(I.bagOf(r.state).items.vine || 0, 0, '밧줄로 엮었다');
  assert.ok(F.friendOf(r.state, 'chiikawa').pts > 0, '달려온 치이카와와도');
});

test('잠옷 밤나들이: 포셰트 갑옷 씨에게 이야기 표시(여섯째 날부터 낮) → 받으면 귀 달린 잠옷 → 밤에 내 집 앞', async () => {
  const W = await import(G + 'wardrobe.js');
  assert.ok(W.ACCESSORY_ITEMS.pajama && W.ACCESSORY_ITEMS.pajama.gift, '귀 달린 잠옷은 선물로만');
  let s = fresh(6, 11);
  assert.ok(Q.canOffer(s, 'pajamaNight'));
  assert.equal(Q.markOf(s, 'pochette'), 'story');
  assert.ok(!Q.canOffer({ ...s, clock: at(5, 11) }, 'pajamaNight'), '여섯째 날부터');
  assert.ok(!Q.canOffer({ ...s, clock: at(6, 21) }, 'pajamaNight'), '가게가 여는 낮에만');
  assert.deepEqual(Q.QUESTS.pajamaNight.start, { accessory: 'pajama' }, '받자마자 잠옷');
  const step = Q.QUESTS.pajamaNight.steps[0];
  assert.equal(step.scene, 'pajamaNight');
  assert.ok(Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 21) && !Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 15), '밤에 내 집 앞');
  const r = Q.completeStep(Q.startQuest(s, 'pajamaNight'), 'pajamaNight', 7);
  assert.ok(r.finished);
  for (const k of ['chiikawa', 'hachiware']) assert.ok(F.friendOf(r.state, k).pts > 0, k);
});

test('수상한 섬 합숙: 친구 다섯과 하트 2개면 여덟째 날부터 오후에 게시판 전단지 → 다음 날 아침 선착장 → 섬 장면 → 시마지로의 카레 · 조개국', async () => {
  const I = await import(G + 'inventory.js');
  const PALS = ['usagi', 'chiikawa', 'hachiware', 'rakko', 'momonga'];
  const pals = (s, short) => PALS.reduce((a, k) => withHearts(a, k, k === short ? 1 : 2), s); // short: 그 친구만 하트 1개
  const s = pals(fresh(8, 14));
  assert.equal(Q.boardStory(s), 'islandCamp', '게시판에 전단지');
  assert.ok(!Q.canOffer(s, 'islandCamp') && Q.markOf(s, 'usagi') !== 'story', '우사기가 말로 권하지 않는다');
  for (const k of PALS) assert.equal(Q.boardStory(pals(fresh(8, 14), k)), null, k + '와도 하트 2개부터');
  assert.equal(Q.boardStory(pals(fresh(7, 14))), null, '여덟째 날부터');
  assert.equal(Q.boardStory({ ...s, clock: at(8, 9) }), null, '전단지는 오후에(떠나는 건 다음 날 아침)');
  assert.equal(Q.boardStory({ ...s, tutorial: 'board' }), null, '첫날 안내 중에는 없다');
  assert.equal(Q.boardStory(Q.startQuest(s, 'islandCamp')), null, '떼면 사라진다');
  assert.ok(Q.QUESTS.islandCamp.flyer.big.includes('100배'), '보수 100배 전단지');
  const step = Q.QUESTS.islandCamp.steps[0];
  assert.equal(step.place, 'pier');
  assert.equal(step.scene, 'islandCamp');
  assert.ok(Q.PLACES.pier);
  assert.ok(Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 8) && !Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 14), '아침에만 떠난다');
  const r = Q.completeStep(Q.startQuest(s, 'islandCamp'), 'islandCamp', 9);
  assert.ok(r.finished);
  assert.equal(r.state.story.islandDone, 9, '섬 합숙을 다녀온 날');
  assert.equal(I.countOf(r.state, 'katsucurry'), 2);
  assert.equal(I.countOf(r.state, 'shellsoup'), 2);
  assert.ok(I.itemInfo('katsucurry').eat > 0 && I.itemInfo('shellsoup').eat > 0, '먹을 수 있다');
  for (const k of ['chiikawa', 'hachiware', 'usagi', 'rakko']) assert.ok(F.friendOf(r.state, k).pts > 0, k);
});

test('위스키 봉봉: 쿠리만쥬(하트 2)가 새 안주 뒤 열째 날부터 낮에 소문 → 숲길 옆 초콜릿 덩굴 → 숲속 장면 → 위스키 봉봉 · 포셰트 갑옷 씨와도 친해진다', async () => {
  const I = await import(G + 'inventory.js');
  const Gf = await import(G + 'gifts.js');
  const noSnack = withHearts(fresh(10, 12), 'kurimanju', 2);
  assert.ok(!Q.canOffer(noSnack, 'whiskeyBonbon'), '쿠리만쥬의 새 안주 먼저(같은 하트 2라 겹치지 않게)');
  const s = { ...noSnack, quests: { snack: { step: 1, base: 0, done: 8 } } };
  assert.ok(Q.canOffer(s, 'whiskeyBonbon'));
  assert.equal(Q.markOf(s, 'kurimanju'), 'story', '쿠리만쥬 머리 위에 이야기 표시');
  assert.ok(!Q.canOffer(withHearts({ ...s, friends: {} }, 'usagi', 5), 'whiskeyBonbon'), '우사기 하트로는 열리지 않는다');
  assert.ok(!Q.canOffer({ ...s, clock: at(9, 12) }, 'whiskeyBonbon'), '열째 날부터');
  assert.ok(!Q.canOffer(withHearts(s, 'kurimanju', 1), 'whiskeyBonbon'), '쿠리만쥬와 하트 2개부터');
  assert.ok(!Q.canOffer({ ...s, clock: at(10, 18) }, 'whiskeyBonbon'), '낮에만');
  const step = Q.QUESTS.whiskeyBonbon.steps[0];
  assert.equal(step.place, 'bonbonVine');
  assert.equal(step.scene, 'whiskeyBonbon');
  assert.ok(Q.PLACES.bonbonVine);
  assert.ok(Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 11) && !Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 19), '낮에 덩굴 앞');
  const r = Q.completeStep(Q.startQuest(s, 'whiskeyBonbon'), 'whiskeyBonbon', 10);
  assert.ok(r.finished);
  assert.equal(r.state.story.bonbonDone, 10);
  assert.equal(I.countOf(r.state, 'bonbon'), 2);
  assert.ok(I.itemInfo('bonbon').eat > 0, '먹을 수 있다');
  assert.ok(F.friendOf(r.state, 'pochette').pts > 0, '구해 준 포셰트 갑옷 씨');
  assert.equal(Gf.tasteOf('kurimanju', 'bonbon'), 'love', '술꾼 쿠리만쥬가 좋아한다');
});

test('수상한 섬 합숙 대본: 원작 순서대로 장면이 이어지고, 말하는 사람 · 연출 · 놀이 · 사람 · 하늘이 모두 알려진 것', async () => {
  const { BEATS, GATHER, CHORUS, BATTLE, ROAMS } = await import('../src/stories/islandscript.js');
  const ids = BEATS.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, '장면 이름은 하나씩');
  let last = -1;
  for (const id of ['voyage', 'welcome', 'festival', 'bungalow', 'sign', 'campfire', 'row', 'grotto', 'poster', 'attack', 'search', 'cave2', 'alone', 'dive', 'rescue', 'plan', 'battle', 'memory', 'farewell', 'depart', 'far']) {
    const i = ids.indexOf(id);
    assert.ok(i > last, '원작 순서: ' + id);
    last = i;
  }
  const SPEAK = new Set(['c', 'h', 'u', 'r', 'm', 'k', 'q', 's', 'j', 't', 'f', 'i', 'z', 'me']);
  const DO = new Set(['pose', 'cast', 'hide', 'siren', 'sirenMouth', 'mer', 'tendrils', 'bind', 'unbind', 'boat', 'cam', 'fire', 'sign', 'lid', 'snd', 'shake', 'splash', 'notes', 'bubbles', 'lei', 'scale', 'wait', 'ask', 'game', 'branch', 'sleep', 'roam']);
  const KINDS = new Set(['me', 'chiikawa', 'hachiware', 'usagi', 'rakko', 'momonga', 'kani', 'kurimanju', 'shisa', 'hitoha', 'futaba', 'isl1', 'isl2', 'isl3', 'isl4', 'jiro']);
  const SKIES = new Set(['day', 'sunset', 'dawn', 'night', 'cave', 'memory', 'under']);
  const SOUNDS = new Set(['song', 'siren', 'splash', 'wave', 'thud', 'growl', 'hurt', 'pass', 'faint', 'hit', 'chime', 'can']);
  const games = [], roams = [];
  let sleeps = 0;
  const kinds = (k) => (Array.isArray(k) ? k : [k]).forEach((x) => assert.ok(KINDS.has(x), x));
  const castOk = (cast, boats, id) => Object.entries(cast).forEach(([k, e]) => { assert.ok(KINDS.has(k), id + ': ' + k); if (e[5]) assert.ok(boats && boats[e[5]], id + ': ' + k + ' 탄 배'); });
  const walk = (items, b, played) => items.forEach((L) => {
    if (typeof L === 'string') return;
    if (Array.isArray(L)) { assert.ok(SPEAK.has(L[0]) && L[1], b.id + ': ' + L[0]); return; }
    assert.ok(DO.has(L.do), b.id + ': ' + L.do);
    if (L.do === 'game') { played.add(L.game); games.push(L.game); }
    if (L.do === 'branch') { assert.ok(played.has(L.on), b.id + ': 놀이 뒤에 갈림'); walk(L.good, b, played); walk(L.bad, b, played); }
    if (L.do === 'ask') { assert.equal(L.then.length, L.choices.length); L.then.forEach((t) => walk(t, b, played)); }
    if (L.do === 'cast') castOk(L.cast, b.boats, b.id);
    if (['pose', 'hide', 'bind', 'lei', 'notes'].includes(L.do)) kinds(L.k);
    if (L.do === 'snd') assert.ok(SOUNDS.has(L.name), L.name);
    if (L.do === 'sleep') sleeps++;
    if (L.do === 'roam') { assert.ok(ROAMS[L.id], b.id + ': 걷기 ' + L.id); roams.push(L.id); }
    if (L.do === 'mer') assert.ok(L.list.length <= 2, b.id + ': 인어는 둘(하나는 먹혔다)');
  });
  for (const b of BEATS) {
    assert.ok(SKIES.has(b.sky), b.id + ' 하늘');
    assert.ok(Number.isFinite(b.at.x) && Number.isFinite(b.at.z), b.id + ' 자리');
    castOk(b.cast || {}, b.boats, b.id);
    (b.binds || []).forEach((k) => assert.ok(KINDS.has(k)));
    assert.ok(!b.mer || b.mer.length <= 2, b.id + ': 인어는 둘');
    walk(b.lines, b, new Set());
  }
  walk(GATHER, { id: 'gather' }, new Set());
  roams.length = 0; for (const b of BEATS) for (const L of b.lines) if (L && L.do === 'roam') roams.push(L.id);
  assert.deepEqual(games, ['row', 'chorus', 'swim', 'battle', 'throw'], '노 젓기 → 인어 합창 → 헤엄 → 박자 → 카레 던지기');
  assert.equal(sleeps, 1, '마지막 밤에 한 번 잔다');
  assert.deepEqual(roams, ['festival', 'jungle', 'rescue'], '축제 · 밤의 정글 · 동굴 구출은 직접 걷는다');
  for (const [id, r] of Object.entries(ROAMS)) {
    assert.ok(['beach', 'grotto'].includes(r.area) && r.me.length >= 2 && r.goal, id);
    assert.equal(new Set(r.targets.map((t) => t.id)).size, r.targets.length, id + ': 할 일 이름은 하나씩');
    for (const t of r.targets) {
      assert.ok(t.k ? KINDS.has(t.k) : Array.isArray(t.at), id + '/' + t.id + ' 자리');
      assert.ok(t.auto || t.label, id + '/' + t.id + ' 행동 이름');
      walk(t.lines || [], { id: id + '/' + t.id }, new Set());
      walk(t.again || [], { id: id + '/' + t.id }, new Set());
    }
  }
  assert.ok(ROAMS.festival.targets.some((t) => t.ask && t.k === 'hachiware'), '축제는 하치와레에게 말해서 끝낸다');
  assert.ok(ROAMS.festival.targets.filter((t) => t.eat === 'slurp' || t.eat === 'nibble').length >= 4, '포장마차 넷에서 먹기');
  assert.ok(ROAMS.rescue.targets.filter((t) => t.free).length === 7 && ROAMS.rescue.watch, '붙잡힌 일곱 · 세이렌이 뒤척이면 멈추기');
  assert.ok(ROAMS.jungle.targets.some((t) => t.end) && ROAMS.jungle.follow === 'chiikawa', '치이카와와 오두막까지');
  assert.ok(BEATS[ids.indexOf('farewell')].lines.at(-1).do === 'sleep', '모닥불 뒤에 잠');
  for (const ch of [CHORUS, BATTLE]) { assert.ok(ch[0] >= 4, '처음 4박은 준비'); for (let i = 1; i < ch.length; i++) assert.ok(ch[i] > ch[i - 1]); }
});

test('파자마 파티즈: 잠옷 밤나들이를 끝낸 뒤 여덟째 날부터 낮에 포셰트 갑옷 씨 → 밤 7시 넘어 광장 무대 → 공연', () => {
  let s = fresh(8, 11);
  assert.ok(!Q.canOffer(s, 'pajamaParty'), '잠옷 밤나들이를 끝낸 뒤에');
  s = Q.completeStep(Q.startQuest(fresh(5, 11), 'pajamaNight'), 'pajamaNight', 5).state;
  s = { ...s, clock: at(8, 11) };
  assert.ok(Q.canOffer(s, 'pajamaParty'));
  assert.equal(Q.markOf(s, 'pochette'), 'story');
  assert.ok(!Q.canOffer({ ...s, clock: at(7, 11) }, 'pajamaParty'), '여덟째 날부터');
  assert.ok(!Q.canOffer({ ...s, clock: at(8, 21) }, 'pajamaParty'), '가게가 여는 낮에만');
  const step = Q.QUESTS.pajamaParty.steps[0];
  assert.equal(step.scene, 'pajamaParty');
  assert.equal(step.place, 'plaza');
  assert.ok(Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 20) && !Q.arrived(step, { x: 0, z: 0 }, 0.5, 0.5, 15), '밤에 광장');
  const r = Q.completeStep(Q.startQuest(s, 'pajamaParty'), 'pajamaParty', 8);
  assert.ok(r.finished);
  for (const k of ['chiikawa', 'hachiware', 'usagi']) assert.ok(F.friendOf(r.state, k).pts > 0, k);
  assert.equal(r.state.story.pajamaParty, 8, '본 날을 적어 둔다');
});
