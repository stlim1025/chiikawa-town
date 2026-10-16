import { JOB_TYPES } from './jobs.js';
import { isValidHome } from './home.js';
import { isValidHousing } from './housing.js';
import { isValidFriends, upgradeFriends, curveFriends, stretchFriends } from './friends.js';
import { STATE_VERSION } from './state.js';
import { isValidLicenses, isValidStudy } from './licenses.js';
import { isValidPantry } from './pantry.js';
import { isValidBoard, isValidVillagers } from './villagers.js';
import { isValidPochette } from './pochette.js';
import { isValidExplored } from './explore.js';
import { isValidTools } from './tools.js';
import { isValidWeedLog } from './weeding.js';
import { isValidBag } from './inventory.js';
import { isValidStorage } from './storage.js';
import { isValidGlowfluff } from './glowfluff.js';
import { isValidWardrobe } from './wardrobe.js';
import { isValidWeapon, isValidHunted } from './combat.js';
import { isValidQuests, isValidStory, isValidActs, QUESTS, shiftStoryStep, STORY_BOSSES_AT } from './quests.js';
import { isValidRaffle } from './raffle.js';
import { isValidGround } from './ground.js';
import { isValidHunters } from './hunters.js';
import { isValidStarfall } from './starfall.js';
import { isValidBosses } from './bosses.js';
import { isValidBounty } from './bounty.js';
import { isValidWorks, isValidWorkUse } from './works.js';
import { isValidFishLog, isValidFishPrize } from './fishing.js';
import { isValidSwapWallet } from './swap.js';

/** 저장 키와 형식 버전. */
export const SAVE_KEY = 'chiikawa-town-save';
export const SAVE_VERSION = 1;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** 저장된 상태의 모양이 게임이 쓰는 모양과 맞는지 검사한다. */
export function isValidState(s) {
  if (!s || typeof s !== 'object') return false;
  if (!s.profile || typeof s.profile.name !== 'string' || !s.profile.look || typeof s.profile.look !== 'object') return false;
  if (!num(s.money) || s.money < 0 || !num(s.stamina)) return false;
  if (!s.license || ![1, 2, 3, 4, 5, 6].includes(s.license.grade) || !num(s.license.xp)) return false;
  if (!s.clock || !num(s.clock.day) || !num(s.clock.t)) return false;
  if (!s.player || !num(s.player.x) || !num(s.player.z)) return false;
  if (!s.stats || !num(s.stats.pulled) || !num(s.stats.clean) || !Array.isArray(s.seenTips)) return false;
  if (s.job !== null && (!s.job || !JOB_TYPES[s.job.typeId] || !num(s.job.count) || !num(s.job.clean))) return false;
  if (s.exam !== null && (!s.exam || !num(s.exam.streak))) return false;
  if (s.tutorial !== undefined && typeof s.tutorial !== 'string') return false; // 예전 저장에는 없다
  if (s.home !== undefined && !isValidHome(s.home)) return false; // 예전 저장에는 없다
  if (s.housing !== undefined && !isValidHousing(s.housing)) return false; // 예전 저장에는 없다
  if (s.startDate !== undefined && (typeof s.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.startDate))) return false;
  if (s.friends !== undefined && !isValidFriends(s.friends)) return false; // 예전 저장에는 없다
  if (s.licenses !== undefined && !isValidLicenses(s.licenses)) return false; // 예전 저장에는 없다
  if (s.ramenDay !== undefined && !num(s.ramenDay)) return false;
  if (s.liquorLesson !== undefined && !num(s.liquorLesson)) return false;
  if (s.study !== undefined && !isValidStudy(s.study)) return false; // 시험 공부(술 강의 · 토벌 안내서 · 레시피 북)
  if (s.pantry !== undefined && !isValidPantry(s.pantry)) return false; // 친구들의 가방(선물 · 전리품)
  if (s.board !== undefined && !isValidBoard(s.board)) return false; // 예전 저장에는 없다
  if (s.villagers !== undefined && !isValidVillagers(s.villagers)) return false;
  if (s.theftDay !== undefined && !num(s.theftDay)) return false;
  if (s.pochette !== undefined && !isValidPochette(s.pochette)) return false; // 예전 저장에는 없다
  if (s.explored !== undefined && !isValidExplored(s.explored)) return false; // 예전 저장에는 없다
  if (s.tools !== undefined && !isValidTools(s.tools)) return false;
  if (s.weedLog !== undefined && !isValidWeedLog(s.weedLog)) return false; // 풀 도감(2단계부터)
  if (s.bag !== undefined && !isValidBag(s.bag)) return false; // 가방
  if (s.storage !== undefined && !isValidStorage(s.storage)) return false; // 집 보관 상자
  if (s.glowfluff !== undefined && !isValidGlowfluff(s.glowfluff)) return false; // 이번 밤에 뗀 반짝 털뭉치
  if (s.wardrobe !== undefined && !isValidWardrobe(s.wardrobe)) return false; // 꾸미기 소품
  if (s.weapon !== undefined && !isValidWeapon(s.weapon)) return false; // 무기(4단계)
  if (s.hunted !== undefined && !isValidHunted(s.hunted)) return false; // 잡은 몬스터 수
  if (s.quests !== undefined && !isValidQuests(s.quests)) return false; // 퀘스트(5단계)
  if (s.acts !== undefined && !isValidActs(s.acts)) return false; // 같이 한 일상 일(일상 부탁)
  if (s.raffle !== undefined && !isValidRaffle(s.raffle)) return false; // 경품 추첨권
  if (s.questTrack !== undefined && s.questTrack !== null && !QUESTS[s.questTrack]) return false;
  if (s.questPins !== undefined && !(Array.isArray(s.questPins) && s.questPins.every((id) => typeof id === 'string'))) return false; // 고정(압정)한 퀘스트 쪽지
  if (s.story !== undefined && !isValidStory(s.story)) return false;
  if (s.truce !== undefined && !num(s.truce)) return false;
  if (s.ground !== undefined && !isValidGround(s.ground)) return false; // 바닥에 떨어뜨린 물건
  if (s.hunters !== undefined && !isValidHunters(s.hunters)) return false; // 토벌꾼 기록 · 랭킹
  if (s.starfall !== undefined && !isValidStarfall(s.starfall)) return false; // 별똥별에 소원을 빈 날
  if (s.bosses !== undefined && !isValidBosses(s.bosses)) return false; // 구역 보스(마주침 · 쓰러뜨린 날)
  if (s.bounty !== undefined && !isValidBounty(s.bounty)) return false; // 오늘 현상금 몬스터(쓰러뜨렸는지 · 받았는지)
  if (s.works !== undefined && !isValidWorks(s.works)) return false; // 마을 가꾸기 모금(낸 돈 · 다 모인 날)
  if (s.swapWallet !== undefined && !isValidSwapWallet(s.swapWallet)) return false; // 몸이 바뀐 동안 든 지갑 · 가방(사이드스토리 '몸이 바뀌었다')
  if (s.workUse !== undefined && !isValidWorkUse(s.workUse)) return false; // 마을 가꾸기 시설로 한 일(꽃 딴 날 · 종 친 날)
  if (s.fishLog !== undefined && !isValidFishLog(s.fishLog)) return false; // 낚시 기록(잡은 수 · 가장 큰 cm)
  if (s.fishPrize !== undefined && !isValidFishPrize(s.fishPrize)) return false; // 낚시 도감 보상(받은 가짓수)
  return true;
}

/** 상태를 저장 문자열로. */
export function serialize(state) {
  return JSON.stringify({ v: SAVE_VERSION, data: state });
}

/** 저장 문자열을 상태로. */
export function deserialize(text) {
  if (text == null || text === '') return { ok: false, reason: 'empty' };
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'corrupt' }; }
  if (!parsed || typeof parsed !== 'object' || !parsed.data) return { ok: false, reason: 'corrupt' };
  if (parsed.v !== SAVE_VERSION) return { ok: false, reason: 'version' };
  if (!isValidState(parsed.data)) return { ok: false, reason: 'corrupt' };
  return { ok: true, state: upgradeState(parsed.data) };
}

/**
 * 예전 모양의 상태를 지금 모양으로(state.version 이 낮으면). 하트 개수는 늘 그대로.
 * 1 → 2: 친밀도 점수를 하트 하나 6점 단위로, 2 → 3: 하트마다 점수가 다른 곡선(friends.js 의 HEART_AT)으로,
 * 3 → 4: 이야기 퀘스트 맨 앞에 '토벌 안내서 읽기' 단계가 생겨 받아 둔 이야기의 단계 번호를 한 칸 민다.
 * 4 → 5: 왕버섯 싸움 앞에 '구역 보스 셋' 단계가 생겨, 왕버섯을 이미 쓰러뜨린 이야기의 단계 번호를 한 칸 민다.
 * 5 → 6: 하트 곡선이 1.5배로 길어져(friends.js 의 CURVE_V3 → HEART_AT) 친밀도 점수를 옮긴다(버전 1 · 2 는 curveFriends 가 바로 지금 곡선으로).
 */
export function upgradeState(s) {
  const v = s.version || 1;
  if (v >= STATE_VERSION) return s;
  let friends = s.friends, quests = s.quests;
  if (friends && v < 2) friends = upgradeFriends(friends);
  if (friends && v < 3) friends = curveFriends(friends);
  else if (friends && v < 6) friends = stretchFriends(friends);
  if (quests && v < 4) quests = shiftStoryStep(quests);
  if (quests && v < 5) quests = shiftStoryStep(quests, STORY_BOSSES_AT + 1);
  return { ...s, version: STATE_VERSION, ...(friends ? { friends } : {}), ...(quests ? { quests } : {}) };
}

/** storage(getItem/setItem/removeItem) 위의 저장소. 막힌 storage 에서도 throw 하지 않는다. */
export function createStore(storage) {
  let available = true;
  try { storage.setItem(SAVE_KEY + ':probe', '1'); storage.removeItem(SAVE_KEY + ':probe'); } catch { available = false; }
  return {
    available,
    load() {
      if (!available) return { ok: false, reason: 'empty' };
      try { return deserialize(storage.getItem(SAVE_KEY)); } catch { return { ok: false, reason: 'empty' }; }
    },
    save(state) {
      if (!available) return false;
      try { storage.setItem(SAVE_KEY, serialize(state)); return true; } catch { return false; }
    },
    clear() {
      try { storage.removeItem(SAVE_KEY); } catch { /* 저장이 막혀 있으면 지울 것도 없다 */ }
    },
    /** 읽지 못한 저장을 덮어쓰기 전에 따로 남겨 둔다. */
    backup() {
      try {
        const raw = storage.getItem(SAVE_KEY);
        if (raw != null) storage.setItem(SAVE_KEY + ':backup', raw);
      } catch { /* 저장이 막혀 있으면 남길 수 없다 */ }
    }
  };
}
