import { BOSS_LAIRS, KING_LAIR } from './layout.js';

export { BOSS_LAIRS, KING_LAIR };

/**
 * 구역 보스: 동쪽 들판 대왕 두더지 · 서쪽 숲 고목 거인 · 남쪽 강가 왕집게가 저마다 정해진 자리(layout.js 의 BOSS_LAIRS)에 한 마리씩 산다.
 * 처음 마주치면 도감에 모습이 드러나고, 쓰러뜨린 날에는 다시 나오지 않는다(다음 날 다시 나타난다).
 * 이야기 속 바위산 왕버섯(kingcap)은 따로 다룬다(quests.js 의 이야기 · main.js) — 도감에 드러나는지만 여기서 같이 본다.
 * state.bosses = { 종류: { seen: true, down?: 쓰러뜨린 날 } }
 */
export const LAIR_BOSSES = Object.keys(BOSS_LAIRS);

export const bossesOf = (state) => state.bosses || {};

/** 이 보스를 마주친 적이 있는지(도감에 이름 · 모습이 드러난다). 왕버섯은 이야기 기록으로 본다. */
export function bossSeen(state, species) {
  if (species === 'kingcap') return !!(state.story && state.story.bossSeen);
  const r = bossesOf(state)[species];
  return !!(r && r.seen);
}

/** 처음 마주쳤다(이미 봤으면 그대로). */
export function markBossSeen(state, species) {
  const all = bossesOf(state), r = all[species] || {};
  if (r.seen) return state;
  return { ...state, bosses: { ...all, [species]: { ...r, seen: true } } };
}

/** 쓰러뜨렸다: 그날은 다시 나오지 않는다. */
export function markBossDown(state, species, day) {
  const all = bossesOf(state);
  return { ...state, bosses: { ...all, [species]: { ...(all[species] || {}), seen: true, down: day } } };
}

/** 오늘 제자리에 있는지: 오늘(또는 그 뒤로 적힌 날) 쓰러뜨렸으면 없다. */
export function bossHome(state, species, day) {
  const r = bossesOf(state)[species];
  return !(r && typeof r.down === 'number' && r.down >= day);
}

/** 저장된 보스 기록 모양이 맞는지(save.js 검사). */
export function isValidBosses(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  return Object.entries(b).every(([k, r]) => BOSS_LAIRS[k] && r && typeof r === 'object'
    && (r.seen === undefined || typeof r.seen === 'boolean') && (r.down === undefined || (typeof r.down === 'number' && Number.isFinite(r.down))));
}
