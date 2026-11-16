import { registerItems, addItem } from './inventory.js';

/**
 * 계절 놀이(설계서 docs/Seasons-Weather-2026-11-16.html, 게임 오리지널): three 없이 쓰고 테스트한다.
 *  · 단풍잎 줍기(가을): 날마다 나무 밑 LEAF_SPOTS 곳에 낙엽 더미. 자리마다 하루 한 번 단풍잎 하나(20원, 치이카와가 좋아한다).
 *    state.leaves = { day, picked: [자리 번호] } — 다른 날이면 비운 것으로 본다(core/glowfluff.js 와 같은 방식).
 *  · 눈사람(겨울): state.snowmen = [{ x, z, day, face }](앞이 가장 오래된 것), SNOWMAN_MAX 개까지. 겨울이 끝나면 녹는다.
 */
export const LEAF = 'mapleleaf';
registerItems({ [LEAF]: { name: '단풍잎', kind: 'drop', sell: 20, note: '가을 나무 밑 낙엽 더미에서 주운 빨간 단풍잎. 노동 접수에서 20원에 팔린다. 치이카와가 좋아한다.' } });
export const LEAF_SPOTS = 12;
export const SNOWMAN_MAX = 5, SNOWMAN_FACES = 3;

/** 오늘 주운 낙엽 자리(다른 날 기록이면 비운다). */
export function leavesOf(state, day) {
  const l = state && state.leaves;
  return l && l.day === day ? { day, picked: [...l.picked] } : { day, picked: [] };
}
/** 가을에 낙엽 더미 id 에서 단풍잎을 줍는다(자리마다 하루 한 번). 가방이 꽉 차면 full. → { ok, state, full? } */
export function pickLeaf(state, id, day, season) {
  if (season !== 'autumn' || !Number.isInteger(id) || id < 0 || id >= LEAF_SPOTS) return { ok: false, state };
  const l = leavesOf(state, day);
  if (l.picked.includes(id)) return { ok: false, state };
  const r = addItem(state, LEAF, 1);
  if (!r.added) return { ok: false, state, full: true };
  return { ok: true, state: { ...r.state, leaves: { day, picked: [...l.picked, id] } } };
}
/**
 * 그날의 낙엽 더미 자리: 나무 밑 후보 [{ x, z }] 에서 시작 날짜와 날 번호로 섞어 앞 LEAF_SPOTS 곳 → [{ id: 0.., x, z }].
 * 같은 날은 늘 같은 자리(저장할 것이 없다), 날이 바뀌면 다른 나무 밑.
 */
export function leafSpotsFor(candidates, startISO, day) {
  let h = 0x811c9dc5;
  const key = `${startISO}#${day}#leaf`;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const next = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }; // xorshift
  const list = (candidates || []).slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list.slice(0, LEAF_SPOTS).map((c, id) => ({ id, x: c.x, z: c.z }));
}
/** 눈사람끼리 이만큼은 떨어져 세운다. */
export const SNOWMAN_GAP = 1.6;
/** (x, z) 에 눈사람을 세울 틈이 있는지(다른 눈사람과 SNOWMAN_GAP 안이면 안 된다). */
export const snowmanRoom = (snowmen, x, z) => !(snowmen || []).some((s) => Math.hypot(s.x - x, s.z - z) < SNOWMAN_GAP);
/** 눈사람을 세운다(SNOWMAN_MAX 개를 넘으면 가장 오래된 것부터 사라진다). */
export function addSnowman(state, { x, z, face }, day) {
  return { ...state, snowmen: [...(state.snowmen || []), { x, z, day, face }].slice(-SNOWMAN_MAX) };
}
/** 같이 놀기(주인): 마을 모습에 실을 눈사람 [[x, z, face]](이름표 'sm'). 없으면 undefined(싣지 않는다). */
export const snowmenToWire = (list) => (list && list.length ? list.map((s) => [s.x, s.z, s.face]) : undefined);
/** 같이 놀기(손님): 주인이 보낸 'sm' 을 눈사람 목록으로. 서버가 그대로 전한 것이라 하나라도 이상하면 아무것도 그리지 않는다. */
export function snowmenFromWire(sm) {
  if (!Array.isArray(sm)) return [];
  const list = sm.slice(0, SNOWMAN_MAX).map((s) => (Array.isArray(s) ? { x: s[0], z: s[1], day: 0, face: s[2] } : null));
  return isValidSnowmen(list) ? list : [];
}
/** 겨울이 아니면 눈사람이 모두 녹는다. */
export function meltSnowmen(state, season) {
  return season !== 'winter' && state.snowmen && state.snowmen.length ? { ...state, snowmen: [] } : state;
}

const int = (v) => Number.isInteger(v) && v >= 0;
/** 저장 검사: 낙엽 기록. */
export function isValidLeaves(l) {
  return !!l && typeof l === 'object' && int(l.day) && Array.isArray(l.picked) && l.picked.length <= LEAF_SPOTS
    && l.picked.every((id) => Number.isInteger(id) && id >= 0 && id < LEAF_SPOTS) && new Set(l.picked).size === l.picked.length;
}
/** 저장 검사: 눈사람 목록. */
export function isValidSnowmen(list) {
  return Array.isArray(list) && list.length <= SNOWMAN_MAX
    && list.every((s) => s && Number.isFinite(s.x) && Number.isFinite(s.z) && int(s.day) && Number.isInteger(s.face) && s.face >= 0 && s.face < SNOWMAN_FACES);
}
