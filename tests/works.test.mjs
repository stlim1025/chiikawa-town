import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKS, WORK_IDS, WORK_SPOTS, WORK_SIGNS, WORK_STEP, OUTER_LAMP_GAP, outerLampSpots, pavedStrips, workStatus, workOf, leftOf, donate, fundWork, dueWorks, markWorksOpen, worksView, packWorks, unpackWorks, isValidWorks, WORK_ITEMS, REST_RATE, canPickFlower, pickFlower, canRingBell, ringBell, isValidWorkUse } from '../src/core/works.js';
import { WORK_NEAR, WORK_CHAT, HOME_CHAT, BELL_HEARD, nearWorkLine, upgradeChat } from '../src/core/upgradetalk.js';
import { QUESTS, PLACES, canOffer, checkQuestData } from '../src/core/quests.js';
import { ptsForHearts } from '../src/core/friends.js';
import { loves } from '../src/core/gifts.js';
import { countOf, itemInfo } from '../src/core/inventory.js';
import { LOTS, VILLAGE_R, PLAZA, doorSpot, inDoorLane, lotById, lotRadius, roadDist, shoreDist, lairReach, lampSpots } from '../src/core/layout.js';
import { createObstacleIndex } from '../src/core/obstacles.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import * as V from '../src/core/villagetalk.js';
import { VILLAGERS } from '../src/core/villagers.js';
import '../src/core/quests.js';

const at = (day, hour) => ({ day, t: (hour - 6) / 24 });
const rich = (money = 100000, day = 5) => ({ ...createState({ name: '나', look: {} }), money, clock: at(day, 10) });

test('마을 가꾸기: 모금함 자리가 광장 북쪽에 있고, 시설 그림 · 이름 · 값이 다 있다', () => {
  const lot = lotById('donation');
  assert.ok(lot && lot.label === '마을 가꾸기');
  assert.ok(lotRadius(lot) > 0 && Number.isFinite(doorSpot(lot).z));
  for (const id of WORK_IDS) {
    const W = WORKS[id];
    assert.ok(W.name && W.note && W.price >= 3000 && W.price % WORK_STEP === 0, id);
    assert.ok(!W.name.includes('·') && !W.note.includes('·'), `가운뎃점: ${id}`);
  }
  // 값은 순서대로 오른다(작은 것부터 모은다)
  for (let k = 1; k < WORK_IDS.length; k++) assert.ok(WORKS[WORK_IDS[k]].price > WORKS[WORK_IDS[k - 1]].price);
});

test('마을 가꾸기: 나눠 내다 다 모이면 그날은 공사 중, 다음 날 아침 생긴다', () => {
  let s = rich(10000, 5);
  assert.equal(workStatus(s, 'flowers'), 'none');
  let r = donate(s, 'flowers', WORK_STEP);
  assert.ok(r.ok && !r.full && r.amount === WORK_STEP);
  s = r.state;
  assert.equal(s.money, 9000);
  assert.equal(workStatus(s, 'flowers'), 'saving');
  assert.equal(leftOf(s, 'flowers'), WORKS.flowers.price - WORK_STEP);
  // 남은 것보다 많이 내려 해도 남은 만큼만
  r = donate(s, 'flowers', 99999);
  assert.ok(r.ok && r.full && r.amount === WORKS.flowers.price - WORK_STEP);
  s = r.state;
  assert.equal(s.money, 10000 - WORKS.flowers.price);
  assert.equal(workStatus(s, 'flowers'), 'building');
  assert.deepEqual(worksView(s), { flowers: 'building' });
  assert.deepEqual(dueWorks(s), [], '그날은 아직');
  assert.equal(donate(s, 'flowers', 1000).ok, false, '다 모인 것에는 더 못 낸다');
  // 다음 날 아침 6시(하루가 바뀌는 때)
  s = { ...s, clock: at(6, 6.1) };
  assert.equal(workStatus(s, 'flowers'), 'open');
  assert.deepEqual(dueWorks(s), ['flowers']);
  s = markWorksOpen(s, dueWorks(s));
  assert.deepEqual(dueWorks(s), [], '한 번만 알린다');
  assert.equal(workOf(s, 'flowers').open, 6);
  assert.deepEqual(worksView(s), { flowers: 'open' });
  assert.ok(isValidWorks(s.works) && isValidState(s));
});

test('마을 가꾸기: 돈이 모자라면 못 내고, 모르는 시설 · 0원도 안 된다', () => {
  const s = rich(500);
  assert.equal(donate(s, 'flowers', WORK_STEP).ok, false);
  assert.equal(donate(s, 'nope', 100).ok, false);
  assert.equal(donate(s, 'flowers', 0).ok, false);
  assert.equal(donate(rich(), 'flowers', -5).ok, false);
});

test('마을 가꾸기: 놀러 온 친구가 낸 돈은 주인 돈을 건드리지 않고 남은 만큼까지만 모금에 더한다', () => {
  let s = rich(500, 7);
  let r = fundWork(s, 'flowers', WORK_STEP);
  assert.ok(r.ok && !r.full && r.amount === WORK_STEP);
  assert.equal(r.state.money, 500, '주인 돈은 그대로');
  assert.equal(workOf(r.state, 'flowers').paid, WORK_STEP);
  s = r.state;
  r = fundWork(s, 'flowers', 99999);
  assert.ok(r.ok && r.full && r.amount === WORKS.flowers.price - WORK_STEP, '남은 만큼만');
  assert.equal(workStatus(r.state, 'flowers'), 'building', '주인 마을 날짜로 공사 중');
  assert.equal(workOf(r.state, 'flowers').day, 7);
  assert.equal(fundWork(r.state, 'flowers', WORK_STEP).ok, false, '다 모인 것에는 더 못 낸다');
  for (const bad of [['nope', 100], ['flowers', 0], ['flowers', -5], ['flowers', NaN], ['toString', 100]]) assert.equal(fundWork(rich(), ...bad).ok, false, JSON.stringify(bad));
  assert.ok(isValidState(r.state));
});

test('마을 가꾸기: 저장 확인과 같이 놀기로 보내는 모습', () => {
  assert.ok(isValidWorks({}));
  assert.ok(isValidWorks({ lamps: { paid: 4000 }, clock: { paid: WORKS.clock.price, day: 3, open: 4 } }));
  assert.equal(isValidWorks({ nope: { paid: 1 } }), false);
  assert.equal(isValidWorks({ flowers: { paid: WORKS.flowers.price + 1 } }), false);
  assert.equal(isValidWorks({ flowers: { paid: 1.5 } }), false);
  assert.equal(isValidWorks({ flowers: { paid: 100, day: 0 } }), false);
  assert.equal(isValidWorks([]), false);
  assert.equal(isValidState({ ...rich(), works: { flowers: 'x' } }), false);
  const view = { flowers: 'open', pavilion: 'building' };
  assert.deepEqual(unpackWorks(packWorks(view)), view);
  assert.deepEqual(unpackWorks([['flowers', 2], ['evil', 2], ['clock', 9], 'x', null]), { flowers: 'open' }, '모르는 것은 버린다');
  assert.deepEqual(unpackWorks('x'), {});
});

test('마을 가꾸기: 시설 자리는 길 · 물 · 가게 문 앞 · 마을 가로등을 피한다', () => {
  const fronts = LOTS.map(doorSpot), lamps = lampSpots();
  const spots = Object.entries(WORK_SPOTS).flatMap(([id, list]) => list.map((p) => ({ id, ...p })));
  const size = { flowers: 0.85, benches: 0.7, clock: 0.9, pavilion: 1.5 };
  for (const p of spots) {
    const r = size[p.id];
    // 시계탑은 광장 한가운데, 나머지는 길을 피한다
    if (p.id === 'clock') assert.ok(Math.hypot(p.x - PLAZA.x, p.z - PLAZA.z) < 0.01, `광장 한가운데: ${p.x},${p.z}`);
    else assert.ok(roadDist(p.x, p.z) > r * 0.6, `길: ${p.id} ${p.x},${p.z}`);
    assert.ok(shoreDist(p.x, p.z) > r, `물가: ${p.id}`);
    assert.ok(fronts.every((f) => !inDoorLane(f, p.x, p.z) && Math.hypot(f.x - p.x, f.z - p.z) > 2.2), `문 앞: ${p.id}`);
    assert.ok(LOTS.every((l) => Math.hypot(l.x - p.x, l.z - p.z) > lotRadius(l) + r), `건물: ${p.id}`);
    assert.ok(lamps.every((l) => Math.hypot(l.x - p.x, l.z - p.z) > r + 0.4), `가로등: ${p.id}`);
  }
  // 정자만 울타리 밖(남쪽 강가), 나머지는 마을 안
  for (const p of spots) assert.equal(Math.hypot(p.x, p.z) > VILLAGE_R, p.id === 'pavilion', p.id);
});

test('마을 가꾸기: 바깥 길 가로등은 울타리 밖 큰길 옆에 띄엄띄엄, 물 · 보스 마당은 피한다', () => {
  const spots = outerLampSpots();
  assert.ok(spots.length >= 12, `가로등 ${spots.length}개`);
  for (const p of spots) {
    assert.ok(Math.hypot(p.x, p.z) > VILLAGE_R + 2.5, '울타리 밖');
    assert.ok(roadDist(p.x, p.z) > 0.2 && roadDist(p.x, p.z) < 1.5, `길 옆: ${p.x},${p.z}`);
    assert.ok(shoreDist(p.x, p.z) > 1.2 && !lairReach(p.x, p.z));
  }
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) assert.ok(Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z) >= OUTER_LAMP_GAP);
  // 막힌 자리는 건너뛴다
  const fewer = outerLampSpots({ isFree: (x) => x < 0 });
  assert.ok(fewer.length < spots.length && fewer.every((p) => p.x < 0));
});

test('장애물: off 인 것은 없는 것으로 친다(숨긴 마을 가꾸기 시설)', () => {
  const ix = createObstacleIndex(4), o = { x: 0, z: 0, r: 1 };
  ix.push(o);
  assert.ok(ix.hits(0, 0, 0.3));
  assert.ok(ix.pushOut(0.5, 0, 0.3));
  o.off = true;
  assert.equal(ix.hits(0, 0, 0.3), false);
  assert.equal(ix.pushOut(0.5, 0, 0.3), null);
});

test('마을 가꾸기: 돌길은 마을 안 길 넷을 덮고, 돌길 · 돌담에는 공사 중 간판 자리가 있다', () => {
  const strips = pavedStrips();
  assert.ok(strips.length >= 4);
  for (const s of strips) {
    assert.ok(Math.hypot(s.x, s.z) < VILLAGE_R && s.len > 10 && s.w > 1, s.id);
    for (const k of [-0.5, 0.5]) assert.ok(Math.hypot(s.x + Math.sin(s.yaw) * s.len * k, s.z + Math.cos(s.yaw) * s.len * k) <= VILLAGE_R + 1e-6, `${s.id} 끝은 울타리 안`);
  }
  for (const id of ['roads', 'fence']) {
    assert.ok(WORKS[id] && WORK_SIGNS[id], id);
    assert.ok(Math.hypot(WORK_SIGNS[id].x, WORK_SIGNS[id].z) < VILLAGE_R - 2, `${id} 간판은 마을 안`);
  }
});

test('마을 가꾸기: 시설마다 마을 친구 여섯이 곁에서 · 이야기로 하는 말이 있고, 집 이야기도 한다', () => {
  const kinds = Object.keys(VILLAGERS);
  const clean = (line, where) => {
    assert.ok(typeof line === 'string' && line.length && line.length <= 30, `${where}: ${line}`);
    assert.ok(!line.includes('·') && !/[^.…]\.(\s|$)/.test(line), `${where}: ${line}`);
  };
  for (const id of WORK_IDS) for (const k of kinds) { clean(WORK_NEAR[id][k], `near ${id} ${k}`); clean(WORK_CHAT[id][k], `chat ${id} ${k}`); assert.equal(nearWorkLine(k, id), WORK_NEAR[id][k]); }
  for (const what of ['expand', 'decor']) for (const k of kinds) clean(HOME_CHAT[what][k], `home ${what} ${k}`);
  assert.equal(upgradeChat('hachiware', {}), null, '아무것도 없으면 할 말이 없다');
  assert.equal(upgradeChat('hachiware', { open: ['roads'] }, () => 0), WORK_CHAT.roads.hachiware);
  assert.equal(upgradeChat('rakko', { expanded: true }, () => 0), HOME_CHAT.expand.rakko);
  for (const k of kinds) for (const type of ['playerHome', 'playerDecor']) {
    const ev = { type, who: 'me', home: '넓은 방', item: '벚꽃 벽지' };
    clean(V.praiseLine(k, ev, '승택'), `praise ${type} ${k}`);
    clean(V.gossipLine(k, ev, '승택'), `gossip ${type} ${k}`);
  }
  assert.equal(V.newsLine({ type: 'playerHome', who: 'me', home: '큰 방' }, '승택').text, '승택이 집을 큰 방으로 넓혔어요');
});

test('마을 가꾸기: 친구들이 새 시설 이야기를 한다(칭찬 · 소문 · 소식)', () => {
  const ev = { type: 'playerWork', who: 'me', work: '바깥 길 가로등' };
  for (const k of Object.keys(VILLAGERS)) {
    for (const line of [V.praiseLine(k, ev, '승택'), V.gossipLine(k, ev, '승택')]) {
      assert.ok(typeof line === 'string' && line.length && line.length <= 30, `${k}: ${line}`);
      assert.ok(!line.includes('·'));
    }
  }
  assert.equal(V.praiseLine('hachiware', ev, '승택'), '바깥 길 가로등 봤어? 승택 덕분이래~ 고마워!');
  assert.equal(V.newsLine(ev, '승택').text, '승택 덕분에 마을에 바깥 길 가로등이 생겼어요');
});

// ---------- 마을 가꾸기 시설로 하는 일 · 부탁 ----------
const opened = (s, ids) => ({ ...s, works: Object.fromEntries(ids.map((id) => [id, { paid: WORKS[id].price, day: s.clock.day - 1, open: s.clock.day }])) });
const withHearts = (s, kind, h) => ({ ...s, tutorial: 'done', friends: { ...(s.friends || {}), [kind]: { pts: ptsForHearts(h), talk: 0, play: 0, gift: true } } });

test('마을 가꾸기: 광장 꽃밭마다 하루 한 송이, 다음 날 다시 핀다', () => {
  let s = rich(1000, 5);
  assert.equal(canPickFlower(s, 0), false, '꽃밭이 생기기 전');
  assert.equal(pickFlower(s, 0).ok, false);
  s = opened(s, ['flowers']);
  assert.equal(itemInfo('plazaflower').name, '광장 꽃');
  assert.ok(WORK_ITEMS.plazaflower.sell > 0 && !WORK_ITEMS.plazaflower.note.includes('·'));
  for (let i = 0; i < WORK_SPOTS.flowers.length; i++) {
    const r = pickFlower(s, i);
    assert.ok(r.ok, `꽃밭 ${i}`);
    s = r.state;
  }
  assert.equal(countOf(s, 'plazaflower'), WORK_SPOTS.flowers.length);
  assert.equal(pickFlower(s, 0).reason, 'none', '같은 날 또 못 딴다');
  assert.equal(canPickFlower(s, -1) || canPickFlower(s, WORK_SPOTS.flowers.length), false, '없는 꽃밭');
  assert.ok(isValidWorkUse(s.workUse) && isValidState(s));
  s = { ...s, clock: at(6, 8) };
  assert.ok(canPickFlower(s, 0), '다음 날');
  assert.ok(loves('chiikawa', 'plazaflower') && loves('momonga', 'plazaflower'));
});

test('마을 가꾸기: 시계탑 종은 하루 한 번, 종소리 한마디는 친구 여섯 다 있다', () => {
  let s = rich(1000, 5);
  assert.equal(canRingBell(s), false);
  s = opened(s, ['clock']);
  const r = ringBell(s);
  assert.ok(r.ok && r.state.workUse.bell === 5);
  assert.equal(ringBell(r.state).ok, false, '같은 날 두 번은 안 된다');
  assert.ok(canRingBell({ ...r.state, clock: at(6, 9) }));
  for (const k of Object.keys(VILLAGERS)) assert.ok(BELL_HEARD[k] && !BELL_HEARD[k].includes('·'), k);
  assert.ok(REST_RATE.pavilion > REST_RATE.benches && REST_RATE.benches > 0, '정자가 더 잘 쉬어진다');
});

test('마을 가꾸기: 쓰던 기록 저장 확인', () => {
  assert.ok(isValidWorkUse({}));
  assert.ok(isValidWorkUse({ flowers: [0, 3], bell: 2 }));
  assert.equal(isValidWorkUse({ flowers: [1, 1, 1, 1, 1] }), false, '꽃밭 수보다 많다');
  assert.equal(isValidWorkUse({ flowers: [1.5] }), false);
  assert.equal(isValidWorkUse({ bell: -1 }), false);
  assert.equal(isValidWorkUse([]), false);
  assert.equal(isValidState({ ...rich(), workUse: { bell: 'x' } }), false);
});

test('마을 가꾸기: 시설이 생겨야 그곳에서 하는 부탁이 열린다', () => {
  assert.deepEqual(checkQuestData(), []);
  const ids = { flowerGift: 'flowers', benchConcert: 'benches', pavilionPicnic: 'pavilion', wallPatrol: 'fence', noonBell: 'clock', lampWalk: 'lamps' };
  for (const [id, work] of Object.entries(ids)) {
    const Q = QUESTS[id];
    assert.equal(Q.needWork, work, id);
    for (const st of Q.steps) if (st.place) assert.ok(PLACES[st.place], `${id}: ${st.place}`);
    let s = { ...withHearts(rich(1000, 5), Q.giver, 5), licenses: { hunter: { day: 1 } } };
    if (Q.steps.some((st) => st.hours)) s = { ...s, clock: at(5, Q.steps.find((st) => st.hours).hours[0] + 0.5) };
    assert.equal(canOffer(s, id), false, `${id}: 시설이 생기기 전`);
    assert.ok(canOffer(opened(s, [work]), id), `${id}: 시설이 생긴 뒤`);
    const text = [Q.title, ...Q.offer, ...Q.steps.flatMap((st) => [st.goal, ...(st.say || [])])].join('');
    assert.ok(!text.includes('·'), `가운뎃점: ${id}`);
    assert.ok(Object.keys(QUESTS).every((o) => o === id || QUESTS[o].giver !== Q.giver || QUESTS[o].ask !== Q.ask), `${id}: 같은 친구의 다른 부탁과 묻는 말이 겹친다`);
  }
  assert.equal(canOffer(opened(withHearts(rich(1000, 5), 'rakko', 5), ['fence']), 'wallPatrol'), false, '돌담 순찰은 토벌 자격이 있어야');
});
