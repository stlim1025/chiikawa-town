import { MONSTER_ORDER } from './combat.js';
import { WEED_ORDER } from './weeding.js';
import { DEX_FISH, dexCount, fishLogOf } from './fishing.js';
import { friendOf, hearts } from './friends.js';
import { bossesOf } from './bosses.js';
import { tamed } from './anoko.js';
import { bondHearts } from './anokobond.js';
import { hasLicense } from './licenses.js';
import { housingOf } from './housing.js';
import { homeOf, sizeOf } from './home.js';
import { WORK_IDS, workStatus } from './works.js';
import { hasTool } from './tools.js';
import { QUESTS, isDone } from './quests.js';
import { seasonsSeen } from './season.js';
import { recordsOf, addRecord, isValidRecords } from './records.js';

export { addRecord, isValidRecords };

/**
 * 도감과 업적(설계서 docs/Dex-Achievements-2026-11-16.html, 게임 오리지널): 이미 저장된 기록으로 업적 32개를 판단하고,
 * 이룬 날 · 받았는지 · 단 칭호만 저장한다. 보상은 마을폰 '업적' 앱에서 받는다(돈 · 칭호 · 기념 가구).
 * state.achieve = { [id]: { day: 이룬 날, got?: true } }, state.title = 단 칭호의 업적 id | null,
 * state.records = 새로 세는 기록(core/records.js).
 */
export const ACH_GROUPS = [
  { id: 'dex', name: '도감' }, { id: 'hunt', name: '토벌' }, { id: 'friend', name: '친구' },
  { id: 'life', name: '생활' }, { id: 'season', name: '계절' }, { id: 'story', name: '이야기' }
];

/** 친해지는 여섯 친구(마을 친구 가운데 하트를 모으는 친구). */
const SIX = ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'rakko', 'momonga'];
const LAIR = ['bigmole', 'elder', 'bigcrab'];
const huntedOf = (s) => (s && s.hunted) || {};
const weedLogOf = (s) => (s && s.weedLog) || {};
const heartsOf = (s, k) => hearts(friendOf(s, k));
const monDex = (s) => MONSTER_ORDER.filter((k) => (huntedOf(s)[k] || 0) > 0).length;
const weedDex = (s) => WEED_ORDER.filter((k) => (weedLogOf(s)[k] || 0) > 0).length;
const kills = (s) => MONSTER_ORDER.reduce((n, k) => n + (huntedOf(s)[k] || 0), 0); // 연습용 허수아비(dummy)는 MONSTER_ORDER 에 없다
const lairDown = (s) => LAIR.filter((k) => bossesOf(s)[k] && bossesOf(s)[k].down != null).length;
const anokoDown = (s) => tamed(s) || (huntedOf(s).anoko || 0) > 0;
const REQUESTS = Object.keys(QUESTS).filter((id) => !QUESTS[id].story && !QUESTS[id].side && !QUESTS[id].daily); // 친구 부탁
const SIDES = Object.keys(QUESTS).filter((id) => QUESTS[id].side);
const count = (list, f) => list.filter(f).length;

/**
 * 업적: { id, group, name, goal(이루는 조건), need, money, title?, furniture?, progress(state) → 지금 수 }.
 * progress 가 need 에 닿으면 이룬다.
 */
export const ACHIEVEMENTS = [
  { id: 'dexMon10', group: 'dex', name: '몬스터 도감 10종', goal: '몬스터 도감에 10종이 오른다', need: 10, money: 500, progress: monDex },
  { id: 'dexMonAll', group: 'dex', name: '몬스터 척척박사', goal: `몬스터 도감 ${MONSTER_ORDER.length}종을 모두 채운다(보스와 눈뭉치 포함)`, need: MONSTER_ORDER.length, money: 2000, title: '몬스터 척척박사', progress: monDex },
  { id: 'dexWeed5', group: 'dex', name: '풀 도감 5종', goal: '풀 도감에 5종이 오른다', need: 5, money: 300, progress: weedDex },
  { id: 'dexWeedAll', group: 'dex', name: '풀 도감 완성', goal: `풀 도감 ${WEED_ORDER.length}종을 모두 채운다`, need: WEED_ORDER.length, money: 1500, progress: weedDex },
  { id: 'dexFishAll', group: 'dex', name: '낚시 명인', goal: `낚시 도감 ${DEX_FISH.length}종을 모두 채운다`, need: DEX_FISH.length, money: 0, title: '낚시 명인', progress: dexCount }, // 돈은 낚시 도감 보상으로 따로
  { id: 'dexAll', group: 'dex', name: '마을 도감 박사', goal: '도감 셋을 모두 채운다', need: 3, money: 0, title: '마을 도감 박사', furniture: 'dexplaque',
    progress: (s) => (monDex(s) >= MONSTER_ORDER.length) + (weedDex(s) >= WEED_ORDER.length) + (dexCount(s) >= DEX_FISH.length) },
  { id: 'hunt10', group: 'hunt', name: '첫 토벌 열 마리', goal: '몬스터 10마리를 쓰러뜨린다', need: 10, money: 200, progress: kills },
  { id: 'hunt100', group: 'hunt', name: '백 마리 토벌', goal: '몬스터 100마리를 쓰러뜨린다', need: 100, money: 1000, progress: kills },
  { id: 'hunt500', group: 'hunt', name: '오백 마리 토벌', goal: '몬스터 500마리를 쓰러뜨린다', need: 500, money: 2500, progress: kills },
  { id: 'bosses3', group: 'hunt', name: '구역 보스 셋', goal: '대왕 두더지, 고목 거인, 강가 왕집게를 한 번씩 쓰러뜨린다', need: 3, money: 1500, progress: lairDown },
  { id: 'bounty5', group: 'hunt', name: '현상금 사냥꾼', goal: '황금 대장 다섯 마리의 현상금을 받는다', need: 5, money: 1500, title: '현상금 사냥꾼', progress: (s) => recordsOf(s).bounty },
  { id: 'bossAll', group: 'hunt', name: '마을의 수호자', goal: '보스 다섯(구역 보스 셋, 바위산 왕버섯, 아노코)을 모두 쓰러뜨린다', need: 5, money: 0, title: '마을의 수호자', furniture: 'bossshield',
    progress: (s) => lairDown(s) + !!(s.story && s.story.bossDown) + anokoDown(s) },
  { id: 'friend5', group: 'friend', name: '첫 단짝', goal: '친구 한 명과 하트 5개', need: 5, money: 500, progress: (s) => Math.max(...SIX.map((k) => heartsOf(s, k))) },
  { id: 'friendsAll3', group: 'friend', name: '다 같이 친구', goal: '여섯 친구(치이카와, 하치와레, 우사기, 쿠리만쥬, 랏코, 모몽가) 모두 하트 3개', need: 6, money: 1000, progress: (s) => count(SIX, (k) => heartsOf(s, k) >= 3) },
  { id: 'friendsAll5', group: 'friend', name: '모두의 친구', goal: '여섯 친구 모두 하트 5개', need: 6, money: 0, title: '모두의 친구', furniture: 'friendframe', progress: (s) => count(SIX, (k) => heartsOf(s, k) >= 5) },
  { id: 'anokoHeart5', group: 'friend', name: '아노코 단짝', goal: '집 앞 아노코와 하트 5개', need: 5, money: 1000, title: '아노코 단짝', progress: bondHearts },
  { id: 'grade1', group: 'life', name: '풀 뽑기 달인', goal: '제초 1급이 된다', need: 1, money: 1000, title: '풀 뽑기 달인', progress: (s) => +(!!s.license && s.license.grade === 1) },
  { id: 'licenses3', group: 'life', name: '자격증 셋', goal: '술, 슈퍼 알바이터, 토벌 자격증을 모두 딴다', need: 3, money: 800, progress: (s) => count(['liquor', 'arbeiter', 'hunter'], (id) => hasLicense(s, id)) },
  { id: 'house', group: 'life', name: '내 집 마련', goal: '집을 산다', need: 1, money: 1000, progress: (s) => +!!housingOf(s).own },
  { id: 'bigHouse', group: 'life', name: '큰 집 주인', goal: '집을 큰 방까지 넓힌다', need: 2, money: 2000, progress: (s) => sizeOf(s.home) },
  { id: 'works7', group: 'life', name: '마을 가꾸미', goal: `마을 가꾸기 ${WORK_IDS.length}곳이 모두 생긴다`, need: WORK_IDS.length, money: 3000, title: '마을 가꾸미', progress: (s) => count(WORK_IDS, (id) => workStatus(s, id) === 'open') },
  { id: 'car', group: 'life', name: '하늘색 자동차', goal: '하늘색 자동차를 산다', need: 1, money: 500, progress: (s) => +hasTool(s, 'car') },
  { id: 'days100', group: 'life', name: '마을 토박이', goal: '마을에서 100일째를 맞는다', need: 100, money: 1000, progress: (s) => (s.clock ? s.clock.day : 0) },
  { id: 'snowmen5', group: 'season', name: '눈사람 장인', goal: '눈사람을 모두 다섯 번 세운다(녹은 것도 센다)', need: 5, money: 500, title: '눈사람 장인', progress: (s) => recordsOf(s).snowmen },
  { id: 'leaves30', group: 'season', name: '단풍잎 서른 장', goal: '단풍잎을 모두 30장 줍는다', need: 30, money: 500, progress: (s) => recordsOf(s).leaves },
  { id: 'loach', group: 'season', name: '비 오는 날의 손님', goal: '미꾸라지를 낚는다', need: 1, money: 300, progress: (s) => +!!fishLogOf(s).loach },
  { id: 'snowball10', group: 'season', name: '눈뭉치 열 마리', goal: '눈뭉치 10마리를 쓰러뜨린다', need: 10, money: 600, progress: (s) => huntedOf(s).snowball || 0 },
  { id: 'seasons4', group: 'season', name: '사계절 주민', goal: '봄, 여름, 가을, 겨울을 모두 마을에서 보낸다', need: 4, money: 1500, title: '사계절 주민',
    progress: (s) => (s.startDate && s.clock ? seasonsSeen(s.startDate, s.clock.day).length : 0) },
  { id: 'story1', group: 'story', name: '바위산의 영웅', goal: '메인 이야기 1장 「바위산의 수상한 기척」을 끝낸다', need: 1, money: 0, title: '바위산의 영웅', progress: (s) => +isDone(s, 'story') }, // 돈은 이야기 보상으로 따로
  { id: 'story2', group: 'story', name: '숲 너머까지', goal: '메인 이야기 2장 「숲 너머의 아노코」를 끝낸다', need: 1, money: 500, progress: (s) => +isDone(s, 'anoko') },
  { id: 'requests', group: 'story', name: '부탁 해결사', goal: `친구 부탁 ${REQUESTS.length}개를 모두 끝낸다`, need: REQUESTS.length, money: 2000, progress: (s) => count(REQUESTS, (id) => isDone(s, id)) },
  { id: 'sides', group: 'story', name: '이야기 수집가', goal: `사이드스토리 ${SIDES.length}편을 모두 끝낸다`, need: SIDES.length, money: 3000, title: '이야기 수집가', progress: (s) => count(SIDES, (id) => isDone(s, id)) }
];
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achievementOf = (id) => BY_ID[id] || null;

const achieveOf = (s) => (s && s.achieve) || {};

/** 업적 하나의 진행: { have(need 를 넘지 않는다), need, done }. */
export function progressOf(state, id) {
  const a = BY_ID[id];
  if (!a) return { have: 0, need: 0, done: false };
  const have = Math.max(0, Math.min(a.need, Number(a.progress(state)) || 0));
  return { have, need: a.need, done: have >= a.need };
}

/** 새로 이룬 업적에 이룬 날을 적는다. 새로 이룬 것이 없으면 받은 state 그대로(1초마다 불러도 저장을 새로 만들지 않게). → { state, newly } */
export function checkAchievements(state) {
  const got = achieveOf(state), newly = [];
  for (const a of ACHIEVEMENTS) if (!got[a.id] && progressOf(state, a.id).done) newly.push(a.id);
  if (!newly.length) return { state, newly };
  const day = state.clock ? state.clock.day : 0, next = { ...got };
  for (const id of newly) next[id] = { day };
  return { state: { ...state, achieve: next }, newly };
}

/** 이뤘지만 아직 받지 않은 업적 수. */
export const unclaimedCount = (state) => Object.values(achieveOf(state)).filter((r) => !r.got).length;

/**
 * 보상을 받는다(한 번만): 돈, 칭호(달 수 있게 열린다), 기념 가구(집 상자에 하나).
 * → { ok, state, money, title, furniture, reason?: 'none' 모르는 업적 | 'notyet' 아직 못 이룸 | 'got' 이미 받음 }
 */
export function claimAchievement(state, id) {
  const a = BY_ID[id], rec = achieveOf(state)[id];
  const fail = (reason) => ({ ok: false, state, money: 0, title: null, furniture: null, reason });
  if (!a) return fail('none');
  if (!rec) return fail('notyet');
  if (rec.got) return fail('got');
  let s = { ...state, money: state.money + a.money, achieve: { ...achieveOf(state), [id]: { ...rec, got: true } } };
  if (a.furniture) { const home = homeOf(s); s = { ...s, home: { ...home, owned: { ...home.owned, [a.furniture]: (home.owned[a.furniture] || 0) + 1 } } }; }
  return { ok: true, state: s, money: a.money, title: a.title || null, furniture: a.furniture || null };
}

/** 달 수 있는 칭호(받은 업적 가운데 칭호가 있는 것) [{ id, title }]. */
export const titlesOf = (state) => ACHIEVEMENTS.filter((a) => a.title && achieveOf(state)[a.id] && achieveOf(state)[a.id].got).map((a) => ({ id: a.id, title: a.title }));

/** 칭호를 단다(받은 칭호만, null 이면 뗀다). 달 수 없는 id 면 그대로. */
export function setTitle(state, id) {
  if (id === null) return { ...state, title: null };
  return titlesOf(state).some((t) => t.id === id) ? { ...state, title: id } : state;
}

/** 단 칭호 글자 | null. */
export function titleOf(state) {
  const id = state && state.title, a = id && BY_ID[id];
  return a && a.title && achieveOf(state)[id] && achieveOf(state)[id].got ? a.title : null;
}

/** 같이 놀기: 친구가 보낸 모습(look)의 칭호(서버가 그대로 전한 값이라 글자만, 12자까지) | null. */
export function titleFromLook(look) {
  const t = look && typeof look.title === 'string' ? look.title.trim() : '';
  return t ? t.slice(0, 12) : null;
}

const day = (v) => Number.isInteger(v) && v >= 0;
/** 저장 검사: 아는 업적만, 이룬 날은 음이 아닌 정수, got 은 true 만. */
export function isValidAchieve(a) {
  return !!a && typeof a === 'object' && !Array.isArray(a)
    && Object.entries(a).every(([id, r]) => !!BY_ID[id] && !!r && typeof r === 'object' && day(r.day) && (r.got === undefined || r.got === true));
}
/** 저장 검사: 단 칭호는 받은 업적의 칭호(없으면 null). */
export const isValidTitle = (state) => state.title === undefined || state.title === null || titleOf(state) !== null;
