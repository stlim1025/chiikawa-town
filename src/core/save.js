import { JOB_TYPES } from './jobs.js';
import { isValidHome } from './home.js';
import { isValidHousing } from './housing.js';
import { isValidFriends } from './friends.js';
import { isValidLicenses } from './licenses.js';
import { isValidBoard, isValidVillagers } from './villagers.js';
import { isValidPochette } from './pochette.js';
import { isValidExplored } from './explore.js';
import { isValidTools } from './tools.js';
import { isValidWeedLog } from './weeding.js';
import { isValidBag } from './inventory.js';
import { isValidWardrobe } from './wardrobe.js';

/** 저장 키와 형식 버전. */
export const SAVE_KEY = 'chiikawa-town-save';
export const SAVE_VERSION = 1;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** 저장된 상태의 모양이 게임이 쓰는 모양과 맞는지 검사한다. */
export function isValidState(s) {
  if (!s || typeof s !== 'object') return false;
  if (!s.profile || typeof s.profile.name !== 'string' || !s.profile.look || typeof s.profile.look !== 'object') return false;
  if (!num(s.money) || s.money < 0 || !num(s.stamina)) return false;
  if (!s.license || ![1, 2, 3, 4, 5].includes(s.license.grade) || !num(s.license.xp)) return false;
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
  if (s.board !== undefined && !isValidBoard(s.board)) return false; // 예전 저장에는 없다
  if (s.villagers !== undefined && !isValidVillagers(s.villagers)) return false;
  if (s.theftDay !== undefined && !num(s.theftDay)) return false;
  if (s.pochette !== undefined && !isValidPochette(s.pochette)) return false; // 예전 저장에는 없다
  if (s.explored !== undefined && !isValidExplored(s.explored)) return false; // 예전 저장에는 없다
  if (s.tools !== undefined && !isValidTools(s.tools)) return false;
  if (s.weedLog !== undefined && !isValidWeedLog(s.weedLog)) return false; // 풀 도감(2단계부터)
  if (s.bag !== undefined && !isValidBag(s.bag)) return false; // 가방
  if (s.wardrobe !== undefined && !isValidWardrobe(s.wardrobe)) return false; // 꾸미기 소품
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
  return { ok: true, state: parsed.data };
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
