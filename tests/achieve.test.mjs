import test from 'node:test';
import assert from 'node:assert/strict';
import { ACH_GROUPS, ACHIEVEMENTS, progressOf, checkAchievements, claimAchievement, unclaimedCount, titlesOf, setTitle, titleOf, addRecord, isValidAchieve, isValidRecords, titleFromLook, ACH_BANNER_GAP, achBannerReady } from '../src/core/achieve.js';
import { seasonsSeen } from '../src/core/season.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import { FURNITURE } from '../src/core/home.js';
import { MONSTER_ORDER } from '../src/core/combat.js';
import { WEED_ORDER } from '../src/core/weeding.js';
import { DEX_FISH } from '../src/core/fishing.js';
import { HEART_AT } from '../src/core/friends.js';

const fresh = () => ({ ...createState({ name: '치이', look: {} }), clock: { day: 5, t: 0.3 } });
const done = (s, id) => progressOf(s, id).done;
const SIX = ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'rakko', 'momonga'];
const TITLES = ['몬스터 척척박사', '낚시 명인', '마을 도감 박사', '현상금 사냥꾼', '마을의 수호자', '모두의 친구', '아노코 단짝', '풀 뽑기 달인', '마을 가꾸미', '눈사람 장인', '사계절 주민', '바위산의 영웅', '이야기 수집가'];
const all = (list, v) => Object.fromEntries(list.map((k) => [k, v]));
const fullDex = (s) => ({ ...s, hunted: all(MONSTER_ORDER, 1), weedLog: all(WEED_ORDER, 1), fishLog: all(DEX_FISH, { n: 1, best: 10 }) });

test('업적: 32개, 여섯 묶음, 돈 31,700원, 칭호 13개, 기념 가구 셋(가게에서 안 판다)', () => {
  assert.equal(ACHIEVEMENTS.length, 32);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 32);
  assert.deepEqual(ACH_GROUPS.map((g) => g.name), ['도감', '토벌', '친구', '생활', '계절', '이야기']);
  for (const g of ACH_GROUPS) assert.ok(ACHIEVEMENTS.some((a) => a.group === g.id), g.id);
  assert.equal(ACHIEVEMENTS.reduce((n, a) => n + a.money, 0), 31700);
  assert.deepEqual(new Set(ACHIEVEMENTS.filter((a) => a.title).map((a) => a.title)), new Set(TITLES));
  assert.equal(ACHIEVEMENTS.filter((a) => a.title).length, 13);
  const furn = ACHIEVEMENTS.filter((a) => a.furniture).map((a) => [a.id, a.furniture]);
  assert.deepEqual(furn, [['dexAll', 'dexplaque'], ['bossAll', 'bossshield'], ['friendsAll5', 'friendframe']]);
  for (const [, f] of furn) assert.ok(FURNITURE[f] && FURNITURE[f].gift === true && FURNITURE[f].price === 0, f);
  assert.deepEqual([FURNITURE.dexplaque.name, FURNITURE.bossshield.name, FURNITURE.friendframe.name], ['반짝 도감 상패', '다섯 보스 기념 방패', '우정 사진 액자']);
  for (const a of ACHIEVEMENTS) for (const t of [a.name, a.goal, a.title || '']) assert.ok(!t.includes('·'), `${a.id}: ${t}`);
  assert.equal(ACHIEVEMENTS.find((a) => a.id === 'dexFishAll').money, 0, '낚시 도감 보상은 따로');
});

test('업적: 새 게임은 아무것도 이루지 않았다', () => {
  const s = fresh();
  for (const a of ACHIEVEMENTS) assert.equal(done(s, a.id), false, a.id);
  assert.equal(unclaimedCount(s), 0);
  assert.equal(titleOf(s), null);
});

test('업적: 몬스터 수는 허수아비를 빼고, 도감은 쓰러뜨린 종류로 센다', () => {
  const s = fresh();
  assert.equal(done({ ...s, hunted: { fluff: 9, dummy: 50 } }, 'hunt10'), false);
  assert.equal(done({ ...s, hunted: { fluff: 10, dummy: 50 } }, 'hunt10'), true);
  assert.deepEqual(progressOf({ ...s, hunted: { fluff: 9, dummy: 50 } }, 'hunt10'), { have: 9, need: 10, done: false });
  const nineteen = all(MONSTER_ORDER.filter((k) => k !== 'snowball'), 1);
  assert.equal(done({ ...s, hunted: nineteen }, 'dexMonAll'), false);
  assert.equal(done({ ...s, hunted: { ...nineteen, snowball: 1 } }, 'dexMonAll'), true);
  assert.equal(done({ ...s, hunted: { ...nineteen } }, 'dexMon10'), true);
  assert.equal(done({ ...s, weedLog: all(WEED_ORDER.slice(0, 9), 3) }, 'dexWeedAll'), false);
  assert.equal(done({ ...s, weedLog: all(WEED_ORDER, 3) }, 'dexWeedAll'), true);
  assert.equal(done(fullDex(s), 'dexFishAll'), true);
  assert.equal(done(fullDex(s), 'dexAll'), true);
  assert.equal(done({ ...fullDex(s), weedLog: {} }, 'dexAll'), false);
  assert.equal(done({ ...s, hunted: { snowball: 9 } }, 'snowball10'), false);
  assert.equal(done({ ...s, hunted: { snowball: 10 } }, 'snowball10'), true);
});

test('업적: 보스 셋과 다섯, 친구 하트, 날, 계절, 새로 세는 기록의 경계', () => {
  const s = fresh();
  const bosses = { bigmole: { seen: true, down: 3 }, elder: { seen: true, down: 4 }, bigcrab: { seen: true, down: 5 } };
  assert.equal(done({ ...s, bosses: { ...bosses, bigcrab: { seen: true } } }, 'bosses3'), false);
  assert.equal(done({ ...s, bosses }, 'bosses3'), true);
  assert.equal(done({ ...s, bosses, story: { bossSeen: true, bossDown: true } }, 'bossAll'), false, '아노코 아직');
  assert.equal(done({ ...s, bosses, story: { bossSeen: true, bossDown: true }, hunted: { anoko: 1 } }, 'bossAll'), true);
  const f = (pts) => ({ pts, talk: 0, play: 0, gift: false });
  assert.equal(done({ ...s, friends: { usagi: f(HEART_AT[3]) } }, 'friend5'), false, '하트 4');
  assert.equal(done({ ...s, friends: { usagi: f(HEART_AT[4]) } }, 'friend5'), true, '하트 5');
  assert.equal(done({ ...s, friends: { ...all(SIX.slice(0, 5), f(HEART_AT[4])) } }, 'friendsAll5'), false);
  assert.equal(done({ ...s, friends: all(SIX, f(HEART_AT[4])) }, 'friendsAll5'), true);
  assert.equal(done({ ...s, friends: all(SIX, f(HEART_AT[2])) }, 'friendsAll3'), true);
  assert.equal(done({ ...s, clock: { day: 99, t: 0.3 } }, 'days100'), false);
  assert.equal(done({ ...s, clock: { day: 100, t: 0.3 } }, 'days100'), true);
  assert.deepEqual(seasonsSeen('2026-10-01', 1), ['autumn']);
  assert.equal(seasonsSeen('2026-10-01', 243).length, 3);
  assert.equal(seasonsSeen('2026-10-01', 244).length, 4);
  assert.equal(done({ ...s, startDate: '2026-10-01', clock: { day: 243, t: 0.3 } }, 'seasons4'), false);
  assert.equal(done({ ...s, startDate: '2026-10-01', clock: { day: 244, t: 0.3 } }, 'seasons4'), true);
  assert.equal(done(addRecord(s, 'leaves', 29), 'leaves30'), false);
  assert.equal(done(addRecord(addRecord(s, 'leaves', 29), 'leaves'), 'leaves30'), true);
  assert.equal(done(addRecord(s, 'snowmen', 5), 'snowmen5'), true);
  assert.equal(done(addRecord(s, 'bounty', 4), 'bounty5'), false);
  assert.equal(done({ ...s, license: { ...s.license, grade: 2 } }, 'grade1'), false);
  assert.equal(done({ ...s, license: { ...s.license, grade: 1 } }, 'grade1'), true);
  assert.equal(done({ ...s, fishLog: { loach: { n: 1, best: 12 } } }, 'loach'), true);
});

test('업적: 이루기는 이룬 날을 적고, 새로 이룬 것이 없으면 같은 객체를 돌려준다', () => {
  const s = fresh();
  const same = checkAchievements(s);
  assert.equal(same.state, s);
  assert.deepEqual(same.newly, []);
  const r = checkAchievements(addRecord(s, 'leaves', 30));
  assert.deepEqual(r.newly, ['leaves30']);
  assert.deepEqual(r.state.achieve.leaves30, { day: 5 });
  const again = checkAchievements(r.state);
  assert.equal(again.state, r.state);
  assert.deepEqual(again.newly, []);
  assert.equal(unclaimedCount(r.state), 1);
});

test('업적: 받기는 한 번만, 못 이룬 것은 못 받고, 칭호와 기념 가구가 열린다', () => {
  let s = checkAchievements(addRecord(addRecord(fresh(), 'leaves', 30), 'snowmen', 5)).state;
  const money = s.money;
  const r = claimAchievement(s, 'leaves30');
  assert.ok(r.ok && r.money === 500 && r.state.money === money + 500 && r.state.achieve.leaves30.got === true);
  assert.equal(claimAchievement(r.state, 'leaves30').reason, 'got');
  assert.equal(claimAchievement(r.state, 'hunt10').reason, 'notyet');
  assert.equal(claimAchievement(r.state, 'bogus').reason, 'none');
  assert.equal(unclaimedCount(r.state), 1);
  s = setTitle(r.state, 'snowmen5');
  assert.equal(titleOf(s), null, '받지 않은 칭호는 달 수 없다');
  const t = claimAchievement(s, 'snowmen5');
  assert.ok(t.ok && t.title === '눈사람 장인' && t.money === 500);
  assert.deepEqual(titlesOf(t.state), [{ id: 'snowmen5', title: '눈사람 장인' }]);
  s = setTitle(t.state, 'snowmen5');
  assert.equal(titleOf(s), '눈사람 장인');
  assert.equal(titleOf(setTitle(s, null)), null);
  assert.equal(titleOf(setTitle(s, 'leaves30')), '눈사람 장인', '칭호가 없는 업적은 무시');
  const d = checkAchievements(fullDex(fresh())).state;
  const g = claimAchievement(d, 'dexAll');
  assert.ok(g.ok && g.furniture === 'dexplaque' && g.title === '마을 도감 박사' && g.money === 0);
  assert.equal(g.state.home.owned.dexplaque, 1);
  assert.equal(claimAchievement(g.state, 'dexAll').ok, false);
  assert.equal(g.state.home.owned.dexplaque, 1);
});

test('업적 배너: 다른 일 중이거나 배너가 떠 있거나 앞 배너 뒤 3.4초 안이면 기다린다', () => {
  assert.equal(ACH_BANNER_GAP, 3.4);
  assert.equal(achBannerReady({ busy: false, bannerOnScreen: false, sinceLast: 10 }), true);
  assert.equal(achBannerReady({ busy: true, bannerOnScreen: false, sinceLast: 10 }), false, '대화 · 이야기 장면 · 잠 · 시험 창');
  assert.equal(achBannerReady({ busy: false, bannerOnScreen: true, sinceLast: 10 }), false, '보스를 쓰러뜨린 배너 같은 다른 배너');
  assert.equal(achBannerReady({ busy: false, bannerOnScreen: false, sinceLast: 1 }), false, '앞 업적 배너와 겹치지 않게');
  assert.equal(achBannerReady({ busy: false, bannerOnScreen: false, sinceLast: 3.4 }), true);
});

test('업적: 날 번호가 소수여도 이룬 날은 정수로 적어 저장 검사를 지난다', () => {
  const s = { ...addRecord(fresh(), 'leaves', 30), clock: { day: 5.5, t: 0.3 } };
  const r = checkAchievements(s);
  assert.deepEqual(r.state.achieve.leaves30, { day: 5 });
  assert.equal(isValidState(r.state), true);
});

test('같이 놀기 칭호: 친구가 보낸 모습의 칭호는 글자만, 12자까지', () => {
  assert.equal(titleFromLook({ title: '눈사람 장인' }), '눈사람 장인');
  assert.equal(titleFromLook({ title: '가나다라마바사아자차카타파하' }), '가나다라마바사아자차카타');
  assert.equal(titleFromLook({ title: 7 }), null);
  assert.equal(titleFromLook({ title: { x: 1 } }), null);
  assert.equal(titleFromLook({ title: '   ' }), null);
  assert.equal(titleFromLook({}), null);
  assert.equal(titleFromLook(null), null);
  assert.equal(titleFromLook(undefined), null);
});

test('업적: 저장 검사는 예전 저장과 새 저장을 받고 이상한 값은 거른다', () => {
  const s = fresh();
  assert.equal(isValidState(s), true, '칸 없는 예전 저장');
  let n = checkAchievements(addRecord(addRecord(s, 'leaves', 30), 'snowmen', 5)).state;
  n = setTitle(claimAchievement(claimAchievement(n, 'leaves30').state, 'snowmen5').state, 'snowmen5');
  assert.equal(isValidState(n), true, '새 저장');
  assert.equal(isValidState({ ...n, achieve: { ...n.achieve, bogus: { day: 1 } } }), false);
  assert.equal(isValidState({ ...n, records: { leaves: -1 } }), false);
  assert.equal(isValidState({ ...n, title: 'leaves30' }), false, '칭호가 없는 업적');
  assert.equal(isValidState({ ...n, title: 'hunt10' }), false, '받지 않은 업적');
  assert.equal(isValidState({ ...n, title: null }), true);
  assert.equal(isValidAchieve({ leaves30: { day: 3, got: true } }), true);
  assert.equal(isValidAchieve({ leaves30: { day: -1 } }), false);
  assert.equal(isValidRecords({ snowmen: 2, leaves: 0, bounty: 1 }), true);
  assert.equal(isValidRecords({ snowmen: 1.5 }), false);
  assert.equal(isValidRecords({ cats: 1 }), false);
});
