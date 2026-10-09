import { MONSTERS, WEAPONS, weaponOf } from './combat.js';
import { trySpend } from './state.js';

/**
 * 토벌꾼 기록과 랭킹(랭커). 나와 마을 친구들이 몬스터를 쓰러뜨리면 점수(그 몬스터의 체력만큼)가 쌓이고,
 * 점수가 높은 셋까지(랭커 최소 점수 이상) '랭커'가 된다. 랭커는 자기 무기에 얼굴을 새길 수 있다.
 * 친구들도 토벌 자격증이 있어야 토벌 일감을 받는다: 돈이 모이면 검정소에 가서 시험을 보고, 실력(skill)만큼 붙는다.
 *
 * state.hunters = { me?: Rec, [친구 kind]: Rec }  Rec = { license: 딴 날 | null, tries: 시험 본 수, tryDay: 마지막으로 본 날,
 *   kills: 쓰러뜨린 수, points: 점수 }
 * state.weapon.engraved = [무기 id] 얼굴을 새긴 내 무기들(없으면 [])
 */
export const HUNTER_PROFILES = {
  // 랏코는 처음부터 자격증이 있는 이름난 랭커다
  rakko: { name: '랏코', skill: 1, power: 3, want: 0.75, start: { license: 0, kills: 64, points: 236 } },
  usagi: { name: '우사기', skill: 0.75, power: 2, want: 0.6 },
  hachiware: { name: '하치와레', skill: 0.45, power: 1, want: 0.35 },
  chiikawa: { name: '치이카와', skill: 0.3, power: 1, want: 0.3 },
  kurimanju: { name: '쿠리만쥬', skill: 0.55, power: 2, want: 0.12 }
};
/** 랭커: 점수가 높은 몇 명까지, 그리고 이 점수 이상. */
export const RANKER_TOP = 3, RANKER_MIN = 60;
/** 무기에 얼굴 새기기 값. */
export const ENGRAVE_PRICE = 1000;
/** 왕버섯을 쓰러뜨리면 덤으로. */
export const BOSS_BONUS = 100;

const EMPTY = { license: null, tries: 0, tryDay: -1, kills: 0, points: 0 };
/** 그 사람의 기록(me 는 내 기록: 자격증은 state.licenses 를 따른다). */
export function hunterOf(state, who) {
  const r = state.hunters && state.hunters[who];
  if (r) return { ...EMPTY, ...r };
  const P = HUNTER_PROFILES[who];
  return P && P.start ? { ...EMPTY, ...P.start } : { ...EMPTY };
}
const setHunter = (state, who, rec) => ({ ...state, hunters: { ...(state.hunters || {}), [who]: rec } });

/** 내 토벌 자격증이 있는지(검정소 자격증). */
const meLicensed = (state) => !!(state.licenses && state.licenses.hunter);
/** 자격증이 있는지(나는 검정소 자격증, 친구는 기록). */
export function licensed(state, who) {
  return who === 'me' ? meLicensed(state) : hunterOf(state, who).license !== null;
}

/** 쓰러뜨린 몬스터 하나를 기록한다(점수 = 그 몬스터 체력, 왕버섯은 덤). */
export function addKill(state, who, species) {
  const M = MONSTERS[species];
  if (!M || species === 'dummy') return state;
  const r = hunterOf(state, who);
  return setHunter(state, who, { ...r, kills: r.kills + 1, points: r.points + M.hp + (M.boss ? BOSS_BONUS : 0) });
}

/** 오늘 시험을 볼 수 있는지(자격증이 없고, 오늘 아직 안 봤다). */
export function canTryExam(state, who, day) {
  if (!HUNTER_PROFILES[who]) return false;
  const r = hunterOf(state, who);
  return r.license === null && r.tryDay !== day;
}
/** 친구가 토벌 자격증 시험을 본다. → { state, passed } (떨어질수록 조금씩 붙기 쉬워진다) */
export function tryExam(state, who, day, random = Math.random) {
  const P = HUNTER_PROFILES[who], r = hunterOf(state, who);
  const chance = Math.min(0.95, P.skill + r.tries * 0.08);
  const passed = random() < chance;
  return { state: setHunter(state, who, { ...r, tries: r.tries + 1, tryDay: day, license: passed ? day : null }), passed };
}

/**
 * 랭킹: 자격증이 있는 사람만, 점수 높은 순(같으면 쓰러뜨린 수). → [{ who, name, points, kills, rank, ranker }]
 * names: { me: 내 이름 } (친구 이름은 HUNTER_PROFILES).
 */
export function ranking(state, myName = '나') {
  const rows = [];
  if (meLicensed(state)) { const r = hunterOf(state, 'me'); rows.push({ who: 'me', name: myName, points: r.points, kills: r.kills }); }
  for (const who of Object.keys(HUNTER_PROFILES)) {
    const r = hunterOf(state, who);
    if (r.license !== null) rows.push({ who, name: HUNTER_PROFILES[who].name, points: r.points, kills: r.kills });
  }
  rows.sort((a, b) => b.points - a.points || b.kills - a.kills || (a.who === 'me' ? -1 : b.who === 'me' ? 1 : 0));
  return rows.map((row, i) => ({ ...row, rank: i + 1, ranker: i < RANKER_TOP && row.points >= RANKER_MIN }));
}
/** 그 사람이 랭커인지. */
export function isRanker(state, who) {
  const row = ranking(state).find((r) => r.who === who);
  return !!(row && row.ranker);
}

/** 얼굴을 새긴 내 무기들. */
export const engravedOf = (state) => weaponOf(state).engraved || [];
/** 지금 든 무기에 얼굴을 새긴다(랭커만, 값을 낸다). → { ok, state, reason: 'ranker' | 'weapon' | 'done' | 'money' } */
export function engrave(state) {
  if (!isRanker(state, 'me')) return { ok: false, reason: 'ranker', state };
  const w = weaponOf(state);
  if (!w.held || !WEAPONS[w.held]) return { ok: false, reason: 'weapon', state };
  const list = engravedOf(state);
  if (list.includes(w.held)) return { ok: false, reason: 'done', state };
  const paid = trySpend(state, ENGRAVE_PRICE);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: { ...paid.state, weapon: { ...w, engraved: [...list, w.held] } } };
}

/** 저장된 기록 모양이 맞는지(save.js 검사). */
export function isValidHunters(h) {
  if (!h || typeof h !== 'object' || Array.isArray(h)) return false;
  const num = (n) => typeof n === 'number' && Number.isFinite(n) && n >= -1;
  return Object.entries(h).every(([who, r]) => (who === 'me' || HUNTER_PROFILES[who]) && r && typeof r === 'object'
    && (r.license === null || num(r.license)) && num(r.tries) && num(r.tryDay) && num(r.kills) && num(r.points));
}
