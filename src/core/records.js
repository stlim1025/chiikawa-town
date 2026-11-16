/**
 * 지금까지 몇 번 했는지 저장되지 않던 기록(도감과 업적, 게임 오리지널): 눈사람을 세운 수, 주운 단풍잎 수, 현상금을 받은 황금 대장 수.
 * 이번 판부터 센다. 다른 core 모듈을 불러오지 않는다(core/seasonplay.js · core/bounty.js · core/achieve.js 가 함께 쓴다 — 서로 부르지 않게).
 * state.records = { snowmen?, leaves?, bounty? } — 없으면 0.
 */
export const RECORD_KEYS = ['snowmen', 'leaves', 'bounty'];

/** 기록(없는 칸은 0). */
export const recordsOf = (state) => ({ snowmen: 0, leaves: 0, bounty: 0, ...((state && state.records) || {}) });

/** 기록 하나를 n 만큼 늘린다. */
export function addRecord(state, key, n = 1) {
  if (!RECORD_KEYS.includes(key)) return state;
  const r = (state && state.records) || {};
  return { ...state, records: { ...r, [key]: (r[key] || 0) + n } };
}

/** 저장 검사: 아는 칸만, 음이 아닌 정수. */
export function isValidRecords(r) {
  return !!r && typeof r === 'object' && !Array.isArray(r)
    && Object.entries(r).every(([k, v]) => RECORD_KEYS.includes(k) && Number.isInteger(v) && v >= 0);
}
