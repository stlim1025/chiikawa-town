import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKS, WORK_IDS, WORK_SPOTS, WORK_STEP, OUTER_LAMP_GAP, outerLampSpots, workStatus, workOf, leftOf, donate, dueWorks, markWorksOpen, worksView, packWorks, unpackWorks, isValidWorks } from '../src/core/works.js';
import { LOTS, VILLAGE_R, doorSpot, inDoorLane, lotById, lotRadius, roadDist, shoreDist, lairReach, lampSpots } from '../src/core/layout.js';
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
    assert.ok(roadDist(p.x, p.z) > r * 0.6, `길: ${p.id} ${p.x},${p.z}`);
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
