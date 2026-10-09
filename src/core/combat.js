import { trySpend } from './state.js';
import { registerItems, bagOf, takeItem } from './inventory.js';
import { josa } from './weeding.js';

/**
 * 토벌(4단계): 무기 · 몬스터 · 토벌 자격증. 몬스터는 이 게임만의 오리지널 생물이다.
 * 몬스터에게 맞으면 기운이 줄고, 기운이 0이 되면 기절해서 마을 입구로 옮겨진다(돈을 조금 잃는다).
 * 몬스터는 마을 울타리 안으로는 들어오지 않는다. 잡으면 전리품이 가방에 들어가고, 노동 접수에서 판다.
 * state.weapon = { owned: [무기 id], held: 든 무기 id | null }, state.hunted = { 종류: 잡은 수 }
 */
export const WEAPONS = {
  // 예전 기본 무기(이제 가게에서는 팔지 않는다 · 가진 사람은 그대로 쓴다)
  stick: { name: '나무 막대기', price: 300, dmg: 1, range: 1.35, cool: 0.5, note: '가벼운 막대기' },
  sword: { name: '목검', price: 1200, dmg: 2, range: 1.55, cool: 0.5, note: '다루기 쉬운 나무 검' },
  // 사스마타(가장 기본 무기): 긴 분홍 자루 끝에 가시 돋친 둥근 U자 갈래. 휘두르지 않고 앞으로 찌른다 — 폭은 좁지만 멀리 닿고 밀어낸다
  fork: { name: '사스마타', price: 200, dmg: 1, range: 2.15, cool: 0.5, knock: 1.5, thrust: true, arc: 0.66, note: '멀리서 찔러 밀어내요' },
  hammer: { name: '돌 망치', price: 2600, dmg: 3, range: 1.45, cool: 0.8, knock: 1.6, note: '느리지만 세게 밀어내요' },
  star: { name: '반짝 검', price: 6000, dmg: 4, range: 1.7, cool: 0.45, note: '가장 센 반짝이는 검' }
};
/** 도구점에서 파는 무기(사스마타가 가장 기본). 나무 막대기는 예전에 산 사람만 가지고 있다. */
export const WEAPON_ORDER = ['fork', 'sword', 'hammer', 'star'];

/**
 * 몬스터 종류. region: 나타나는 구역(night 면 밤에만, 마을 밖 어디든). hp: 몇 대 맞으면 쓰러지는지(무기 힘만큼 깎인다).
 * dmg: 내 기운을 깎는 양, speed: 쫓아오는 빠르기, aggro: 이만큼 가까우면 쫓아온다, drop: 전리품 id, size: 크기.
 */
export const MONSTERS = {
  fluff: { name: '풀뭉치', region: 'fields', hp: 3, dmg: 6, speed: 2.1, aggro: 5.5, drop: 'fluffdown', size: 0.45, note: '들판의 풀이 뭉쳐 굴러다닌다. 가까이 가면 통통 튀어 부딪친다.' },
  beetle: { name: '도토리 뿔벌레', region: 'forest', hp: 4, dmg: 8, speed: 2.5, aggro: 6, drop: 'horn', size: 0.45, note: '숲속 도토리 껍데기를 쓴 벌레. 뿔로 들이받는다.' },
  slime: { name: '물방울 슬라임', region: 'river', hp: 3, dmg: 6, speed: 1.9, aggro: 5, drop: 'jelly', size: 0.42, note: '강가에서 뽀글뽀글 생긴다. 말랑하지만 끈질기다.' },
  turtle: { name: '이끼 거북', region: 'mountain', hp: 8, dmg: 11, speed: 1.3, aggro: 5, drop: 'shell', size: 0.6, note: '등에 이끼가 낀 바위 거북. 느리지만 아주 단단하다.' },
  moth: { name: '그림자 나방', region: 'night', hp: 3, dmg: 8, speed: 2.8, aggro: 7, drop: 'moondust', size: 0.45, night: true, note: '밤에만 날아다닌다. 날개에서 달빛 가루가 떨어진다.' },
  kingcap: { name: '바위산 왕버섯', region: 'boss', hp: 30, dmg: 16, speed: 1.5, aggro: 9, drop: 'kingcap', size: 1.2, boss: true, note: '바위산 깊은 곳에 사는 커다란 버섯. 이야기 속 마지막 상대.' },
  dummy: { name: '연습용 허수아비', region: 'exam', hp: 3, dmg: 0, speed: 0, aggro: 0, drop: null, size: 0.35, note: '토벌 실기용 허수아비.' }
};
export const MONSTER_ORDER = ['fluff', 'beetle', 'slime', 'turtle', 'moth', 'kingcap'];
/** 전리품: 가방(core/inventory.js 의 registerItems)과 노동 접수 매입가. */
export const DROPS = {
  fluffdown: { name: '보송 솜털', kind: 'drop', price: 30, note: '풀뭉치에게서 떨어진 보송보송한 솜털.' },
  horn: { name: '반짝 뿔', kind: 'drop', price: 45, note: '도토리 뿔벌레의 단단한 뿔.' },
  jelly: { name: '말랑 젤리', kind: 'drop', price: 35, note: '물방울 슬라임이 남긴 말랑한 젤리.' },
  shell: { name: '이끼 등껍질 조각', kind: 'drop', price: 80, note: '이끼 거북의 등껍질 조각. 묵직하다.' },
  moondust: { name: '달빛 가루', kind: 'drop', price: 60, note: '그림자 나방의 날개에서 모은 반짝이는 가루.' },
  kingcap: { name: '왕버섯 갓', kind: 'drop', price: 1500, note: '바위산 왕버섯의 커다란 갓 조각. 귀한 물건이다.' }
};
registerItems(DROPS);
/** 맞은 뒤 다시 맞지 않는 시간(초) · 밀려나는 거리. */
export const PLAYER_IFRAME = 1.0, PLAYER_KNOCK = 1.4;
/** 기절하면 잃는 돈(가진 돈의 비율, 최대) · 깨어났을 때 기운. */
export const FAINT_LOSS = 0.1, FAINT_LOSS_MAX = 300, FAINT_STAMINA = 25;

export const weaponOf = (state) => state.weapon || { owned: [], held: null };
export const heldWeapon = (state) => { const w = weaponOf(state); return w.held && WEAPONS[w.held] ? w.held : null; };

/** 무기를 산다(사면 바로 든다). */
export function buyWeapon(state, id) {
  const W = WEAPONS[id];
  if (!W) return { ok: false, reason: 'none', state };
  const w = weaponOf(state);
  if (w.owned.includes(id)) return { ok: false, reason: 'owned', state };
  const paid = trySpend(state, W.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: { ...paid.state, weapon: { owned: [...w.owned, id], held: id } } };
}
/** 가진 무기를 든다(null 이면 넣어 둔다). */
export function holdWeapon(state, id) {
  const w = weaponOf(state);
  if (id !== null && !w.owned.includes(id)) return state;
  return { ...state, weapon: { ...w, held: id } };
}
/** 기절: 돈을 조금 잃고 기운이 조금 찬 채로. → { state, lost } */
export function faint(state) {
  const lost = Math.min(FAINT_LOSS_MAX, Math.floor(state.money * FAINT_LOSS));
  return { state: { ...state, money: state.money - lost, stamina: FAINT_STAMINA }, lost };
}
/** 잡은 몬스터 기록. */
export function recordHunt(state, species) {
  const h = state.hunted || {};
  return { ...state, hunted: { ...h, [species]: (h[species] || 0) + 1 } };
}
/** 가방의 전리품을 모두 판다. → { state, earned, sold } */
export function sellDrops(state) {
  let s = state, earned = 0, sold = 0;
  for (const [id, D] of Object.entries(DROPS)) {
    const n = bagOf(s).items[id] || 0;
    if (!n) continue;
    s = takeItem(s, id, n).state;
    earned += n * D.price;
    sold += n;
  }
  return { state: { ...s, money: s.money + earned }, earned, sold };
}

/** 플레이어 공격이 몬스터에 닿는지: 바라보는 쪽 부채꼴(기본 ±60도, 찌르는 무기는 더 좁게) 안, 무기 길이 + 몬스터 크기. */
export function inSwing(px, pz, yaw, range, mx, mz, size, arc = Math.PI / 3) {
  const d = Math.hypot(mx - px, mz - pz);
  if (d > range + size * 0.6) return false;
  if (d < 0.5) return true;
  let a = Math.atan2(mx - px, mz - pz) - yaw;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return Math.abs(a) < arc;
}

/**
 * 토벌 자격증 필기: 몬스터 안내문(검정소)에서 문제를 만든다. 4지선다 → [{ q, choices, answer }].
 */
export function huntQuiz(n, random = Math.random) {
  const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const q = (text, right, wrong) => { const choices = shuffle([right, ...wrong.slice(0, 3)]); return { q: text, choices, answer: choices.indexOf(right) }; };
  const REGION = { fields: '동쪽 들판', forest: '서쪽 숲', river: '남쪽 강가', mountain: '북쪽 바위산', night: '밤에만 · 마을 밖 어디든' };
  const field = MONSTER_ORDER.filter((k) => !MONSTERS[k].boss);
  const name = (k) => MONSTERS[k].name;
  const pool = [
    ...field.map((k) => () => q(`${josa(name(k), '은/는')} ${MONSTERS[k].night ? '언제 어디에' : '어디에'} 나타날까?`, REGION[MONSTERS[k].region], shuffle(Object.values(REGION).filter((r) => r !== REGION[MONSTERS[k].region])))),
    ...field.map((k) => () => q(`${josa(name(k), '을/를')} 잡으면 얻는 전리품은?`, DROPS[MONSTERS[k].drop].name, shuffle(field.filter((o) => o !== k).map((o) => DROPS[MONSTERS[o].drop].name)))),
    () => q('가장 단단한(여러 번 때려야 하는) 몬스터는?', name('turtle'), shuffle(['fluff', 'beetle', 'slime', 'moth'].map(name))),
    () => q('몬스터에게 맞으면 무엇이 줄어들까?', '기운', ['돈', '친밀도', '제초 급수']),
    () => q('기운이 0이 되면 어떻게 될까?', '기절해서 마을 입구로 옮겨지고 돈을 조금 잃는다', ['그 자리에서 바로 다시 일어난다', '가방의 물건을 모두 잃는다', '집으로 옮겨지고 아무것도 잃지 않는다']),
    () => q('몬스터가 들어오지 못하는 곳은?', '마을 울타리 안', ['남쪽 강가', '동쪽 들판', '바위산 동굴 앞']),
    () => q('전리품은 어디에서 팔까?', '노동 접수', ['라멘 로우', '카니 헌책방', '부동산']),
    () => q('무기는 어디에서 살까?', '도구점', ['가구점', '포셰트 가게', '검정소'])
  ];
  return shuffle(pool).slice(0, n).map((f) => f());
}

export function isValidWeapon(w) {
  return !!w && Array.isArray(w.owned) && w.owned.every((id) => WEAPONS[id]) && (w.held === null || WEAPONS[w.held]);
}
export function isValidHunted(h) {
  return !!h && typeof h === 'object' && !Array.isArray(h) && Object.entries(h).every(([k, n]) => MONSTERS[k] && typeof n === 'number' && n >= 0);
}
