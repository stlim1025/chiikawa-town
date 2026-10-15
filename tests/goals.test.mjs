import test from 'node:test';
import assert from 'node:assert/strict';
import { GOALS, WISHES, DONATE_STEP, goalOf, canBuy, buyGoal, npcPower, hasCar, hasLiquor, friendLook, canTryLiquor, tryLiquor, goalNews, goalPlace, CAMERA_PRICE } from '../src/core/goals.js';
import { POCHETTES } from '../src/core/pochette.js';
import { HOME_SIZES, WALLPAPERS, FLOORS } from '../src/core/home.js';
import { WORKS, workOf, workStatus } from '../src/core/works.js';
import { TOOLS } from '../src/core/tools.js';
import { chooseActivity } from '../src/core/brain.js';
import { liveOffscreen } from '../src/core/offscreen.js';
import { VILLAGERS, MAX_JOBS_PER_DAY, villagerOf, payVillager, villagerSpend, villagerTakesJob, villagerEnergy, isValidVillagers } from '../src/core/villagers.js';
import { savingLine } from '../src/core/villagetalk.js';
import { WEAPONS } from '../src/core/combat.js';
import { FURNITURE } from '../src/core/home.js';
import { LICENSES } from '../src/core/licenses.js';
import { HUNTER_PROFILES } from '../src/core/hunters.js';
import { createState } from '../src/core/state.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', ...o });
const withMoney = (s, kind, money, extra = {}) => ({ ...s, villagers: { ...(s.villagers || {}), [kind]: { ...villagerOf(s, kind, 1), money, ...extra } } });
const licensedAs = (s, kind) => ({ ...s, hunters: { ...(s.hunters || {}), [kind]: { license: 1, tries: 1, tryDay: 1, kills: 0, points: 0 } } });
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

test('친구마다 차례로 이루고 싶은 목표가 있고, 값은 가게 값 그대로다(모몽가는 훔치니까 없다)', () => {
  for (const kind of Object.keys(VILLAGERS)) {
    const list = GOALS[kind];
    if (kind === 'momonga') { assert.deepEqual(list, []); continue; }
    assert.ok(list.length >= 1, `${kind} 목표`);
    for (const g of list) {
      const want = g.kind === 'license' ? LICENSES.hunter.fee : g.kind === 'weapon' ? WEAPONS[g.item].price : g.kind === 'camera' ? CAMERA_PRICE : g.kind === 'rod' ? TOOLS.rod.price : g.kind === 'car' ? TOOLS.car.price : FURNITURE[g.item].price;
      assert.equal(g.cost, want, `${kind} ${g.label}`);
      assert.ok(g.label && g.id, `${kind} 목표 이름`);
    }
  }
  assert.equal(GOALS.rakko.at(-1).item, 'star', '랏코는 가장 센 반짝 검을 노린다');
});

test('랏코는 원작처럼 처음부터 하늘색 자동차가 있다(모으는 목표가 아니고, 다른 친구에게는 없다)', () => {
  const s = fresh();
  assert.ok(hasCar(s, 'rakko'), '새로 시작해도 랏코는 차가 있다');
  assert.ok(hasCar(withMoney(s, 'rakko', 10, { bought: ['rod'] }), 'rakko'), '예전 저장(차를 모으던 중)도');
  for (const kind of Object.keys(VILLAGERS).filter((k) => k !== 'rakko')) assert.ok(!hasCar(s, kind), kind);
  assert.ok(Object.values(GOALS).every((list) => list.every((g) => g.kind !== 'car')), '차는 목표에 없다');
});

test('쿠리만쥬는 처음부터 술 자격이 있다(위스키 강의를 하는 술꾼). 다른 친구는 시험에 붙어야 생긴다', () => {
  const s = fresh();
  assert.ok(hasLiquor(s, 'kurimanju'), '새로 시작해도');
  assert.ok(hasLiquor(withMoney(s, 'kurimanju', 10, { bought: ['f-stove'] }), 'kurimanju'), '예전 저장도');
  for (const kind of Object.keys(VILLAGERS).filter((k) => k !== 'kurimanju')) assert.ok(!hasLiquor(s, kind), kind);
  const passed = tryLiquor(withMoney(s, 'rakko', 1000), 'rakko', 1, () => 0);
  assert.ok(passed.passed && hasLiquor(passed.state, 'rakko'), '붙으면 생긴다');
});

/** 돈을 넉넉히 주며 목표를 차례로 이뤄 본다(자격증 · 술 자격은 붙었다 치고). → 이룬 목표들 */
function reach(kind, count, s0 = fresh()) {
  let s = s0;
  const got = [];
  for (let i = 0; i < count; i++) {
    const g = goalOf(s, kind);
    if (!g) break;
    s = withMoney(s, kind, g.cost + 5, { liquorDay: -1 });
    if (g.kind === 'license') s = licensedAs(s, kind);
    else if (g.kind === 'liquor') s = tryLiquor(s, kind, 1, () => 0).state;
    else { const r = buyGoal(s, kind, 1); assert.ok(r.ok, `${kind} ${g.id}`); s = r.state; }
    got.push(g);
  }
  return { got, state: s };
}

test('차례 목표를 다 이뤄도 바라는 것(포셰트 · 가구 · 벽지와 바닥 · 술 자격 · 무기 · 집 넓히기 · 마을 가꾸기)이 이어서 생긴다', () => {
  for (const kind of Object.keys(WISHES)) {
    const { got } = reach(kind, 40);
    assert.equal(got.length, 40, `${kind}: 목표가 끊기지 않는다`);
    const fixed = GOALS[kind].length;
    assert.deepEqual(got.slice(0, fixed).map((g) => g.id), GOALS[kind].map((g) => g.id), `${kind}: 차례 목표가 먼저`);
    const kinds = new Set(got.map((g) => g.kind));
    for (const k of ['pochette', 'furniture', 'decor', 'home', 'donate', ...(WISHES[kind].like.liquor ? ['liquor'] : [])]) assert.ok(kinds.has(k), `${kind}: ${k}`);
    // 같은 것을 두 번 이루지 않는다(마을 가꾸기 보태기만 여러 번)
    const once = got.filter((g) => g.kind !== 'donate').map((g) => g.id);
    assert.equal(new Set(once).size, once.length, `${kind}: ${once}`);
    // 값은 그 가게 값 그대로
    for (const g of got) {
      const want = { pochette: () => POCHETTES[g.item].price, decor: () => (g.part === 'wall' ? WALLPAPERS : FLOORS)[g.item].price, home: () => HOME_SIZES[g.item].price, liquor: () => LICENSES.liquor.fee, donate: () => DONATE_STEP }[g.kind];
      if (want) assert.equal(g.cost, want(), `${kind} ${g.label}`);
    }
    // 집은 넓은 방 다음에 큰 방
    const homes = got.filter((g) => g.kind === 'home').map((g) => g.item);
    assert.deepEqual(homes, [1, 2].slice(0, homes.length), `${kind} 집 넓히기 차례`);
  }
  assert.ok(!reach('kurimanju', 40).got.some((g) => g.kind === 'liquor'), '쿠리만쥬는 처음부터 술 자격이 있어 시험을 보지 않는다');
  assert.equal(goalOf(fresh(), 'momonga'), null, '모몽가는 여전히 훔친다');
});

test('바라는 것은 싼 것부터, 좋아하는 것은 조금 비싸도 먼저: 처음 몇 개는 가구 · 포셰트처럼 작은 것', () => {
  const { got } = reach('chiikawa', GOALS.chiikawa.length + 4);
  const first = got.slice(GOALS.chiikawa.length);
  assert.ok(first.every((g) => g.cost <= 400), first.map((g) => `${g.label} ${g.cost}`).join(', '));
  // 무기를 좋아하는 우사기는 가구보다 무기를 먼저 노린다
  const u = reach('usagi', GOALS.usagi.length + 20).got.slice(GOALS.usagi.length);
  assert.ok(u.findIndex((g) => g.kind === 'weapon') < u.findIndex((g) => g.kind === 'home'), u.map((g) => g.label).join(' → '));
});

test('마을 가꾸기에 보태면 내 모금함과 같은 곳에 모이고, 다 모이면 다음 날 생긴다. 보탤수록 다음 보태기는 뒤로 미룬다', () => {
  const kind = 'hachiware', done = GOALS[kind].map((g) => g.id).filter((id) => id !== 'license');
  // 바라는 것도 마을 가꾸기 말고는 다 이뤘다고 치고, 꽃밭은 내가 2,500원 모아 두었다
  const other = ['p-sky', 'p-night', 'f-plant', 'f-table', 'f-bed', 'floor-grass', 'liquor', 'w-hammer', 'w-star', 'h-1', 'h-2'];
  let s = licensedAs(withMoney(fresh(), kind, 0, { bought: [...done, ...other] }), kind);
  s = { ...s, works: { flowers: { paid: 2500 } } };
  const g = goalOf(s, kind);
  assert.equal(g.kind, 'donate');
  assert.equal(g.item, 'flowers', '내가 모으던 시설을 거든다');
  assert.equal(g.cost, 500, '남은 만큼만');
  assert.equal(goalPlace(g), 'donation');
  assert.equal(goalNews(g), 'donate');
  s = withMoney(s, kind, 600);
  const r = buyGoal(s, kind, 1);
  assert.ok(r.ok && r.full, '다 모였다');
  assert.equal(workOf(r.state, 'flowers').paid, WORKS.flowers.price);
  assert.equal(workStatus(r.state, 'flowers'), 'building', '내일 아침에 생긴다');
  assert.equal(villagerOf(r.state, kind, 1).money, 100);
  const next = goalOf(r.state, kind);
  assert.equal(next.kind, 'donate', '살 것이 다 떨어지면 남은 시설에도 보탠다');
  assert.equal(next.item, 'benches', '다음은 아직 시작 안 한 시설 가운데 가장 싼 곳');
  assert.equal(next.id, 'd-2');
});

test('술 자격은 검정소 시험: 응시료가 모이면 하루 한 번 보고, 떨어질수록 붙기 쉬워진다', () => {
  const kind = 'rakko', s0 = withMoney(fresh(), kind, 0, { bought: ['rod', 'w-star', 'f-plant', 'f-lamp', 'p-mint'], weapon: 'star' });
  assert.equal(goalOf(s0, kind).kind, 'liquor');
  assert.equal(goalPlace(goalOf(s0, kind)), 'exam');
  assert.ok(!canTryLiquor(s0, kind, 1), '돈이 모자라면 못 본다');
  let s = withMoney(s0, kind, 1000);
  assert.ok(!canBuy(s, kind, 1), '가게에서 사지 않는다');
  assert.ok(canTryLiquor(s, kind, 1));
  const fail = tryLiquor(s, kind, 1, () => 0.99);
  assert.ok(!fail.passed);
  assert.equal(villagerOf(fail.state, kind, 1).money, 1000 - LICENSES.liquor.fee, '떨어져도 응시료는 낸다');
  assert.ok(!canTryLiquor(withMoney(fail.state, kind, 1000), kind, 1), '하루 한 번');
  assert.equal(goalOf(fail.state, kind).kind, 'liquor', '붙을 때까지 목표 그대로');
  s = withMoney(fail.state, kind, 1000);
  assert.ok(canTryLiquor(s, kind, 2), '다음 날 다시');
  const pass = tryLiquor(s, kind, 2, () => 0.8); // 처음엔 0.7 이라 떨어질 값이지만, 한 번 떨어졌으니 붙는다
  assert.ok(pass.passed);
  assert.notEqual(goalOf(pass.state, kind).kind, 'liquor', '붙으면 다음 목표로');
});

test('이룬 목표는 눈에 보인다: 가장 나중에 산 포셰트를 메고, 산 가구 · 벽지 · 바닥과 넓힌 방이 친구 방에', () => {
  assert.deepEqual(friendLook(fresh(), 'chiikawa'), { pochette: null, furniture: [], wall: null, floor: null, size: 0 });
  const s = withMoney(fresh(), 'chiikawa', 0, { bought: ['w-fork', 'f-doll', 'p-strawberry', 'f-rug', 'wall-pink', 'p-lemon', 'h-1', 'floor-pink', 'd-1', 'p-nope'] });
  assert.deepEqual(friendLook(s, 'chiikawa'), { pochette: 'lemon', furniture: ['doll', 'rug'], wall: 'pink', floor: 'pink', size: 1 });
  assert.equal(friendLook(withMoney(s, 'chiikawa', 0, { bought: [...villagerOf(s, 'chiikawa', 1).bought, 'h-2'] }), 'chiikawa').size, 2);
  // 바라는 가구는 그 친구 방에 아직 없는 것(사면 방에 놓인다): 치이카와 방엔 방석 · 화분이, 하치와레 동굴엔 스탠드 · 방석이 있다
  assert.ok(!WISHES.chiikawa.furniture.some((id) => ['cushion', 'plant', 'bed', 'table'].includes(id)));
  assert.ok(!WISHES.hachiware.furniture.some((id) => ['lamp', 'cushion'].includes(id)));
  assert.ok(!WISHES.hachiware.wall, '하치와레는 동굴이라 벽지는 바라지 않는다');
});

test('목표마다 가는 곳: 무기 · 낚싯대는 도구점, 가구 · 벽지는 가구점, 포셰트는 포셰트 가게, 집은 부동산', () => {
  assert.equal(goalPlace({ kind: 'weapon' }), 'tools');
  assert.equal(goalPlace({ kind: 'rod' }), 'tools');
  assert.equal(goalPlace({ kind: 'furniture' }), 'furniture');
  assert.equal(goalPlace({ kind: 'decor' }), 'furniture');
  assert.equal(goalPlace({ kind: 'pochette' }), 'pochette');
  assert.equal(goalPlace({ kind: 'home' }), 'realty');
  assert.equal(goalNews({ kind: 'home' }), 'homeUp');
  assert.equal(goalNews({ kind: 'pochette' }), 'buy');
});

test('자격증을 따거나 물건을 사면 다음 목표로 넘어간다', () => {
  let s = fresh();
  assert.equal(goalOf(s, 'chiikawa').kind, 'license');
  assert.ok(!canBuy(withMoney(s, 'chiikawa', 9999), 'chiikawa', 1), '자격증은 가게에서 사지 않고 검정소 시험으로 딴다');
  s = licensedAs(s, 'chiikawa');
  const g = goalOf(s, 'chiikawa');
  assert.notEqual(g.kind, 'license');
  assert.ok(!canBuy(withMoney(s, 'chiikawa', g.cost - 1), 'chiikawa', 1), '돈이 모자라면 못 산다');
  s = withMoney(s, 'chiikawa', g.cost + 30);
  const r = buyGoal(s, 'chiikawa', 1);
  assert.ok(r.ok);
  assert.equal(villagerOf(r.state, 'chiikawa', 1).money, 30);
  assert.notEqual(goalOf(r.state, 'chiikawa').id, g.id, '다음 목표로');
  assert.equal(r.goal.id, g.id);
  assert.equal(goalOf(fresh(), 'momonga'), null);
});

test('하치와레는 토벌 자격증 다음에 오래 갖고 싶던 카메라를 모으고, 산 날 이야기가 열린다', () => {
  let s = licensedAs(withMoney(fresh(), 'hachiware', 0, { bought: ['f-rug'] }), 'hachiware');
  const g = goalOf(s, 'hachiware');
  assert.equal(g.id, 'camera');
  assert.ok(savingLine('hachiware', g, 0).includes('카메라'), '대화로 카메라를 모은다는 걸 알게 된다');
  assert.ok(!canBuy(withMoney(s, 'hachiware', CAMERA_PRICE - 1, { bought: ['f-rug'] }), 'hachiware', 3));
  const r = buyGoal(withMoney(s, 'hachiware', CAMERA_PRICE, { bought: ['f-rug'] }), 'hachiware', 3);
  assert.ok(r.ok);
  assert.equal(r.state.story.hachiCamera, 3, '산 날을 적어 둔다');
  assert.notEqual(goalOf(r.state, 'hachiware').id, 'camera', '다음 목표로');
  const other = buyGoal(withMoney(fresh(), 'kurimanju', 999), 'kurimanju', 3);
  assert.ok(other.ok && !(other.state.story || {}).hachiCamera, '다른 목표는 이야기를 적지 않는다');
});

test('무기를 사면 토벌 힘이 그만큼 세진다(원래 힘보다 약한 무기는 그대로)', () => {
  let s = licensedAs(fresh(), 'chiikawa');
  assert.equal(npcPower(s, 'chiikawa'), HUNTER_PROFILES.chiikawa.power);
  s = withMoney(s, 'chiikawa', 0, { bought: GOALS.chiikawa.filter((g) => g.kind !== 'license' && g.item !== 'sword').map((g) => g.id) });
  const sword = GOALS.chiikawa.find((g) => g.item === 'sword');
  assert.equal(goalOf(s, 'chiikawa').id, sword.id);
  s = buyGoal(withMoney(s, 'chiikawa', sword.cost, { bought: villagerOf(s, 'chiikawa', 1).bought }), 'chiikawa', 1).state;
  assert.equal(npcPower(s, 'chiikawa'), WEAPONS.sword.dmg);
  assert.equal(npcPower(fresh(), 'rakko'), HUNTER_PROFILES.rakko.power);
});

test('지갑에 적어 둔 목표 · 무기 · 기운은 일하고 돈을 써도 그대로 남는다', () => {
  let s = withMoney(fresh(), 'usagi', 200, { bought: ['w-sword'], weapon: 'sword' });
  s = villagerEnergy(s, 'usagi', -40, 1);
  s = villagerTakesJob(s, 'usagi', 'weed8', 1).state;
  s = payVillager(s, 'usagi', 120, 1);
  s = villagerSpend(s, 'usagi', 80, 1);
  const v = villagerOf(s, 'usagi', 1);
  assert.deepEqual(v.bought, ['w-sword']);
  assert.equal(v.weapon, 'sword');
  assert.equal(v.energy, 60, '일감을 받아도 기운이 100으로 돌아가지 않는다');
  assert.equal(v.money, 240);
  assert.equal(v.jobs, 1);
});

test('하루에 일감을 셋까지 받고, 목표가 멀면 돈이 넉넉해도 일하며, 아침엔 서둘러 일감을 받으러 간다', () => {
  assert.ok(MAX_JOBS_PER_DAY >= 3);
  const ctx = (o) => ({ kind: 'rakko', hour: 14, energy: 80, money: 900, fun: 0.3, social: 0.3, diligence: VILLAGERS.rakko.diligence, appetite: 0.2, jobs: true, hunter: null, friends: [], show: null, player: null, ...o });
  const tally = (c, n = 600) => { const r = seeded(11); let w = 0; for (let i = 0; i < n; i++) if (chooseActivity(c, r).act === 'work') w++; return w / n; };
  const lazy = tally(ctx({})), driven = tally(ctx({ goal: { kind: 'weapon', cost: 6000 } }));
  assert.ok(driven > lazy + 0.2, `목표가 있으면 더 일한다: ${lazy.toFixed(2)} → ${driven.toFixed(2)}`);
  // 일과(랏코의 새벽 수련 같은 성격)와 따로, 일하고 싶은 정도 자체는 아침에 더 크다
  const workScore = (hour) => chooseActivity(ctx({ hour, goal: { kind: 'weapon', cost: 6000 } }), () => 0.5).scores.work;
  assert.ok(workScore(8) > workScore(15), `아침에 더 서두른다: ${workScore(15).toFixed(2)} → ${workScore(8).toFixed(2)}`);
});

test('자격증이 목표면 시험 볼 돈이 모였을 때 시험을 보러 간다', () => {
  const c = { kind: 'chiikawa', hour: 10, energy: 80, money: 400, fun: 0.3, social: 0.3, diligence: 0.55, appetite: 0.25, jobs: true, friends: [], show: null, player: null, hunter: { exam: true, hunt: false, want: 0.3 }, goal: { kind: 'license', cost: 300 } };
  const r = seeded(5); let exam = 0;
  for (let i = 0; i < 400; i++) if (chooseActivity(c, r).act === 'exam') exam++;
  assert.ok(exam / 400 > 0.5, `시험 보러 가는 비율 ${(exam / 400).toFixed(2)}`);
});

test('친구의 목표는 앱이 아니라 대화로 알게 된다: 친구 말투로, 짧고 깔끔하게, 얼마나 모았는지도', () => {
  for (const [kind, list] of Object.entries(GOALS)) {
    for (const g of list) {
      for (const have of [0, Math.floor(g.cost / 2), g.cost - 1]) {
        const line = savingLine(kind, g, have);
        assert.ok(typeof line === 'string' && line.length > 0 && line.length <= 30, `${kind} ${g.label}: ${line}`);
        assert.ok(!/[^.…]\.(\s|$)/.test(line), `마침표: ${line}`);
        if (kind !== 'usagi') assert.ok(line.includes(g.kind === 'license' ? '자격증' : g.label) || line.includes('시험'), `무엇을 모으는지 말한다: ${line}`);
      }
    }
  }
  // 차례 목표 다음에 바라는 것도: 집 넓히기는 '집', 마을 가꾸기는 그 시설 이름, 술 자격은 '술'을 말한다
  for (const kind of Object.keys(WISHES)) {
    for (const g of reach(kind, 30).got.slice(GOALS[kind].length)) {
      for (const have of [0, Math.floor(g.cost / 2), g.cost - 1]) {
        const line = savingLine(kind, g, have);
        assert.ok(typeof line === 'string' && line.length > 0 && line.length <= 30, `${kind} ${g.label}: ${line}`);
        assert.ok(!/[^.…]\.(\s|$)/.test(line) && !line.includes('·'), `문장부호: ${line}`);
        const word = g.kind === 'home' ? '집' : g.kind === 'liquor' ? '술' : g.label;
        if (kind !== 'usagi') assert.ok(line.includes(word), `무엇을 모으는지 말한다: ${line}`);
      }
    }
  }
  assert.notEqual(savingLine('chiikawa', GOALS.chiikawa[1], 0), savingLine('chiikawa', GOALS.chiikawa[1], GOALS.chiikawa[1].cost - 1), '모은 만큼 말이 달라진다');
  assert.equal(savingLine('momonga', null, 0), null);
});

test('목표 값을 모으는 중이면 지쳐도 라멘(80원) 대신 집에서 낮잠으로 아낀다', () => {
  const c = (o) => ({ kind: 'hachiware', hour: 12, energy: 10, money: 200, fun: 0.3, social: 0.3, diligence: 0.6, appetite: 0.25, jobs: true, hunter: null, friends: [], show: null, player: null, ...o });
  assert.equal(chooseActivity(c({ goal: { kind: 'weapon', cost: 1200 } }), () => 0.5).act, 'nap');
  assert.equal(chooseActivity(c({ goal: { kind: 'furniture', cost: 90 } }), () => 0.5).act, 'eat', '목표 값이 이미 모였으면 사 먹는다');
  assert.equal(chooseActivity(c({}), () => 0.5).act, 'eat', '목표가 없으면 예전처럼');
});

test('목표가 있어도 토벌 자격증이 있으면 보수가 큰 토벌 일감을 마다하지 않는다', () => {
  const c = { kind: 'rakko', hour: 10, energy: 80, money: 400, fun: 0.3, social: 0.3, diligence: VILLAGERS.rakko.diligence, appetite: 0.2, jobs: true, friends: [], show: null, player: null,
    hunter: { exam: false, hunt: true, want: HUNTER_PROFILES.rakko.want }, goal: { kind: 'weapon', cost: 6000 } };
  const r = seeded(9); let hunt = 0, work = 0;
  for (let i = 0; i < 400; i++) { const a = chooseActivity(c, r).act; if (a === 'hunt') hunt++; if (a === 'work') work++; }
  assert.ok(hunt > work, `토벌 ${hunt} · 풀 뽑기 ${work}`);
});

test('지갑의 목표 · 무기 칸: 예전 저장(칸 없음)도, 새 저장도 불러올 수 있고 이상한 값은 막는다', () => {
  assert.ok(isValidVillagers({ chiikawa: { money: 10, jobs: 0, day: 1 } }));
  assert.ok(isValidVillagers({ chiikawa: { money: 10, jobs: 0, day: 1, bought: ['license', 'w-fork'], weapon: 'fork' } }));
  assert.ok(isValidVillagers({ rakko: { money: 10, jobs: 0, day: 1, weapon: null } }));
  assert.ok(!isValidVillagers({ chiikawa: { money: 10, jobs: 0, day: 1, bought: 'w-fork' } }));
  assert.ok(!isValidVillagers({ chiikawa: { money: 10, jobs: 0, day: 1, weapon: 3 } }));
});

test('내가 자는 동안에도 목표 값이 모이면 가게에서 산다', () => {
  let bought = 0;
  for (let seed = 1; seed <= 20; seed++) {
    let s = fresh();
    s = withMoney(s, 'kurimanju', GOALS.kurimanju[0].cost - 40);
    const r = liveOffscreen(s, {}, { day: 1, fromHour: 9, random: seeded(seed) });
    const buys = r.events.filter((e) => e.type === 'buy');
    for (const b of buys) assert.ok(VILLAGERS[b.who] && b.item, '산 물건');
    if (buys.some((b) => b.who === 'kurimanju')) {
      bought++;
      assert.notEqual(goalOf(r.state, 'kurimanju').id, GOALS.kurimanju[0].id);
    }
  }
  assert.ok(bought >= 10, `쿠리만쥬가 산 날 ${bought}/20`);
});
