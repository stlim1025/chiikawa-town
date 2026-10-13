import { trySpend } from './state.js';
import { registerItems, bagOf, takeItem } from './inventory.js';
import { josa } from './weeding.js';
import { hasLicense } from './licenses.js';
import { sleepFor } from './clock.js';

/**
 * 토벌(4단계): 무기 · 몬스터 · 토벌 자격증. 몬스터는 이 게임만의 오리지널 생물이다.
 * 몬스터에게 맞으면 기운이 줄고, 기운이 0이 되면 기절해서 내 집 앞으로 옮겨진다(돈을 조금 잃고 세 시간이 지난다 · 쫓겨났으면 마을 입구).
 * 몬스터는 마을 울타리 안으로는 들어오지 않는다. 잡으면 전리품이 가방에 들어가고, 노동 접수에서 판다.
 * state.weapon = { owned: [무기 id], held: 든 무기 id | null }, state.hunted = { 종류: 잡은 수 }
 */
export const WEAPONS = {
  // 예전 기본 무기(이제 가게에서는 팔지 않는다 · 가진 사람은 그대로 쓴다)
  stick: { name: '나무 막대기', price: 300, dmg: 1, range: 1.35, cool: 0.5, note: '가벼운 막대기' },
  sword: { name: '목검', price: 1200, dmg: 2, range: 1.55, cool: 0.5, note: '다루기 쉬운 나무 검' },
  // 사스마타(가장 기본 무기): 긴 분홍 자루 끝에 가시 돋친 둥근 U자 갈래. 휘두르지 않고 앞으로 찌른다 — 폭은 좁지만 멀리 닿고 밀어낸다
  fork: { name: '사스마타', price: 200, dmg: 1, range: 2.15, cool: 0.5, knock: 1.5, thrust: true, arc: 0.66, note: '멀리서 찔러 밀어내요' },
  hammer: { name: '돌 망치', price: 4500, dmg: 3, range: 1.45, cool: 0.8, knock: 1.6, note: '느리지만 세게 밀어내요' },
  // 반짝 검: 힘은 돌 망치와 같고 빠르고 멀리 닿는다(힘 4 였을 때는 거의 다 한 방이라 돈이 너무 빨리 모였다)
  star: { name: '반짝 검', price: 12000, dmg: 3, range: 2.0, cool: 0.45, note: '가장 빠르고 멀리 닿는 반짝이는 검' }
};
/** 도구점에서 파는 무기(사스마타가 가장 기본). 나무 막대기는 예전에 산 사람만 가지고 있다. */
export const WEAPON_ORDER = ['fork', 'sword', 'hammer', 'star'];

/**
 * 몬스터 종류(구역마다 셋 + 구역 보스 + 밤 나방 + 이야기 속 왕버섯). region: 나타나는 구역(night 면 밤에만, 마을 밖 어디든).
 * hp: 몇 대 맞으면 쓰러지는지(무기 힘만큼 깎인다), dmg: 내 기운을 깎는 양, speed: 쫓아오는 빠르기, aggro: 이만큼 가까우면 쫓아온다,
 * drop: 전리품 id, size: 크기, attack: 공격 방식(world/monsters.js 의 ATK), atk: 안내서에 적는 짧은 공격 이름.
 */
export const MONSTERS = {
  fluff: { name: '풀뭉치', region: 'fields', hp: 3, dmg: 7, speed: 2.3, aggro: 6, drop: 'fluffdown', size: 0.45, attack: 'bump', atk: '통통 들이받기', note: '들판의 풀이 뭉쳐 굴러다닌다. 가까이 붙어 통통 부딪친다.' },
  hopper: { name: '풀잎 메뚜기', region: 'fields', hp: 2, dmg: 8, speed: 2.8, aggro: 7.5, drop: 'leafwing', size: 0.4, attack: 'leap', atk: '멀리서 뛰어들기', note: '긴 뒷다리로 멀리서 훌쩍 뛰어든다. 내려앉을 자리를 피하자.' },
  mole: { name: '흙두더지', region: 'fields', hp: 5, dmg: 10, speed: 1.8, aggro: 6.5, drop: 'sweetroot', size: 0.48, attack: 'burrow', atk: '땅속 기습', note: '땅속으로 숨어 발밑까지 파고든다. 흙이 들썩이면 얼른 비키자.' },
  beetle: { name: '도토리 뿔벌레', region: 'forest', hp: 5, dmg: 10, speed: 2.5, aggro: 7, drop: 'horn', size: 0.45, attack: 'charge', atk: '뿔 돌진', note: '도토리 껍데기를 쓴 벌레. 뿔을 겨누고 일직선으로 돌진한다.' },
  shroom: { name: '보라 독버섯', region: 'forest', hp: 4, dmg: 7, speed: 1.7, aggro: 7.5, drop: 'spore', size: 0.5, attack: 'shoot', atk: '포자 세 갈래', note: '숲 그늘의 꼬마 버섯. 거리를 두고 포자를 세 갈래로 뿜는다.' },
  stump: { name: '그루터기 장군', region: 'forest', hp: 7, dmg: 13, speed: 1.5, aggro: 5.5, drop: 'bark', size: 0.55, attack: 'slam', atk: '쿵! 내려찍기', note: '걸어 다니는 그루터기. 펄쩍 뛰어 둘레를 쿵 내려찍는다.' },
  slime: { name: '물방울 슬라임', region: 'river', hp: 4, dmg: 8, speed: 1.9, aggro: 7, drop: 'jelly', size: 0.48, attack: 'spit', atk: '물방울 뱉기', note: '강가에서 뽀글뽀글 생긴다. 떨어져서 커다란 물방울을 뱉는다.' },
  frog: { name: '연잎 개구리', region: 'river', hp: 4, dmg: 9, speed: 2.4, aggro: 7, drop: 'lilypad', size: 0.42, attack: 'tongue', atk: '혀 채찍', note: '연잎 모자를 쓴 개구리. 긴 혀를 일직선으로 쭉 뻗는다.' },
  crab: { name: '조약돌 게', region: 'river', hp: 5, dmg: 6, speed: 2.6, aggro: 6, drop: 'pearl', size: 0.45, attack: 'combo', atk: '집게 세 번', note: '조약돌을 등에 진 게. 붙으면 집게로 세 번 연달아 꼬집는다.' },
  turtle: { name: '이끼 거북', region: 'mountain', hp: 8, dmg: 12, speed: 1.3, aggro: 6, drop: 'shell', size: 0.6, attack: 'spin', atk: '등껍질 회전', note: '이끼 낀 바위 거북. 등껍질에 숨어 빙글빙글 돌며 쫓아온다.' },
  pebble: { name: '데굴 돌멩이', region: 'mountain', hp: 6, dmg: 11, speed: 2.0, aggro: 7, drop: 'ore', size: 0.48, attack: 'roll', atk: '굴러오기', note: '바위산을 굴러다니는 돌멩이. 멀리서 데굴데굴 굴러와 튕긴다.' },
  ram: { name: '구름 산양', region: 'mountain', hp: 5, dmg: 12, speed: 2.6, aggro: 7, drop: 'wool', size: 0.52, attack: 'stomp', atk: '높이 뛰어 짓밟기', note: '구름 같은 털에 말린 뿔. 높이 뛰어올라 넓게 짓밟는다.' },
  moth: { name: '그림자 나방', region: 'night', hp: 4, dmg: 9, speed: 2.9, aggro: 8, drop: 'moondust', size: 0.45, night: true, attack: 'dive', atk: '내리꽂기', note: '밤에만 날아다닌다. 높이 떴다가 일직선으로 내리꽂는다.' },
  kingcap: { name: '바위산 왕버섯', short: '왕버섯', region: 'boss', hp: 72, dmg: 16, speed: 1.6, aggro: 9, drop: 'kingcap', size: 1.2, boss: true, attack: 'boss', atk: '내려찍기, 뛰어 덮치기, 포자 비, 부하 부르기', note: '바위산 깊은 곳에 사는 커다란 버섯. 이야기 속 마지막 상대.' },
  // 구역 보스(동 · 서 · 남): 저마다 굴 · 빈터에 한 마리씩 산다. 쓰러뜨리면 다음 날 다시 나타난다(core/bosses.js).
  bigmole: { name: '대왕 두더지', short: '대왕 두더지', region: 'fields', hp: 54, dmg: 14, speed: 1.7, aggro: 9, drop: 'goldclaw', size: 1.1, boss: true, attack: 'boss', atk: '할퀴기, 땅속 기습, 흙덩이 비, 부하 부르기', note: '동쪽 들판 굴밭의 주인. 땅속으로 숨었다가 발밑에서 솟구친다.' },
  elder: { name: '고목 거인', short: '고목 거인', region: 'forest', hp: 60, dmg: 15, speed: 1.4, aggro: 9, drop: 'bigacorn', size: 1.2, boss: true, attack: 'boss', atk: '내려찍기, 도토리 고리, 뿌리 솟구치기, 부하 부르기', note: '서쪽 숲 깊은 빈터의 오래된 나무. 땅속 뿌리를 일직선으로 솟구치게 한다.' },
  bigcrab: { name: '강가 왕집게', short: '왕집게', region: 'river', hp: 56, dmg: 14, speed: 2.0, aggro: 9, drop: 'bigclaw', size: 1.15, boss: true, attack: 'boss', atk: '집게 연타, 옆걸음 돌진, 물방울 고리, 부하 부르기', note: '강가 진흙밭의 커다란 게. 붙으면 집게로 연달아 꼬집고, 멀면 옆걸음으로 돌진한다.' },
  dummy: { name: '연습용 허수아비', region: 'exam', hp: 3, dmg: 0, speed: 0, aggro: 0, drop: null, size: 0.35, attack: null, note: '토벌 실기용 허수아비.' }
};
/** 도감 · 안내서 순서(구역별로 셋씩, 그 구역 보스가 끝에). */
export const MONSTER_ORDER = ['fluff', 'hopper', 'mole', 'bigmole', 'beetle', 'shroom', 'stump', 'elder', 'slime', 'frog', 'crab', 'bigcrab', 'turtle', 'pebble', 'ram', 'moth', 'kingcap'];
/** 구역 순서(안내서 묶음). */
export const MONSTER_REGIONS = ['fields', 'forest', 'river', 'mountain', 'night', 'boss'];
/** 전리품: 가방(core/inventory.js 의 registerItems)과 노동 접수 매입가. */
export const DROPS = {
  fluffdown: { name: '보송 솜털', kind: 'drop', price: 30, note: '풀뭉치에게서 떨어진 보송보송한 솜털.' },
  leafwing: { name: '풀잎 날개', kind: 'drop', price: 25, note: '풀잎 메뚜기의 얇은 날개.' },
  sweetroot: { name: '달콤 당근', kind: 'drop', price: 50, note: '흙두더지가 몰래 모아 둔 달콤한 당근. 우사기가 좋아한다.' },
  horn: { name: '반짝 뿔', kind: 'drop', price: 45, note: '도토리 뿔벌레의 단단한 뿔.' },
  spore: { name: '보라 포자', kind: 'drop', price: 40, note: '보라 독버섯의 반짝이는 포자 주머니.' },
  bark: { name: '단단 나무껍질', kind: 'drop', price: 60, note: '그루터기 장군의 두꺼운 껍질.' },
  jelly: { name: '말랑 젤리', kind: 'drop', price: 35, note: '물방울 슬라임이 남긴 말랑한 젤리.' },
  lilypad: { name: '동그란 연잎', kind: 'drop', price: 40, note: '연잎 개구리가 쓰고 있던 연잎.' },
  pearl: { name: '작은 진주', kind: 'drop', price: 65, note: '조약돌 게가 품고 있던 작은 진주.' },
  shell: { name: '이끼 등껍질 조각', kind: 'drop', price: 80, note: '이끼 거북의 등껍질 조각. 묵직하다.' },
  ore: { name: '반짝 원석', kind: 'drop', price: 70, note: '데굴 돌멩이 속에서 나온 반짝이는 돌.' },
  wool: { name: '구름 양털', kind: 'drop', price: 65, note: '구름 산양에게서 얻은 폭신한 털.' },
  moondust: { name: '달빛 가루', kind: 'drop', price: 60, note: '그림자 나방의 날개에서 모은 반짝이는 가루.' },
  kingcap: { name: '왕버섯 갓', kind: 'drop', price: 1000, note: '바위산 왕버섯의 커다란 갓 조각. 귀한 물건이다.' },
  goldclaw: { name: '황금 발톱', kind: 'drop', price: 600, note: '대왕 두더지의 커다란 황금빛 발톱. 귀한 물건이다.' },
  bigacorn: { name: '고목 왕도토리', kind: 'drop', price: 600, note: '고목 거인이 떨어뜨린 주먹만 한 도토리. 귀한 물건이다.' },
  bigclaw: { name: '왕집게발', kind: 'drop', price: 600, note: '강가 왕집게의 단단한 집게발. 귀한 물건이다.' }
};
registerItems(DROPS);
/** 맞은 뒤 다시 맞지 않는 시간(초) · 밀려나는 거리. */
export const PLAYER_IFRAME = 1.0, PLAYER_KNOCK = 1.4;
/** 기절하면 잃는 돈(가진 돈의 비율, 최대) · 깨어났을 때 기운 · 정신을 잃고 지나가는 시간(시). */
export const FAINT_LOSS = 0.1, FAINT_LOSS_MAX = 300, FAINT_STAMINA = 25, FAINT_HOURS = 3;

export const weaponOf = (state) => state.weapon || { owned: [], held: null };
export const heldWeapon = (state) => { const w = weaponOf(state); return w.held && WEAPONS[w.held] ? w.held : null; };

/** 무기를 산다(사면 바로 든다). 토벌 자격증이 있어야 판다. → { ok, state, reason: 'none' | 'owned' | 'license' | 'money' } */
export function buyWeapon(state, id) {
  const W = WEAPONS[id];
  if (!W) return { ok: false, reason: 'none', state };
  const w = weaponOf(state);
  if (w.owned.includes(id)) return { ok: false, reason: 'owned', state };
  if (!hasLicense(state, 'hunter')) return { ok: false, reason: 'license', state };
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
/** 기절: 돈을 조금 잃고 기운이 조금 찬 채로, FAINT_HOURS 시간이 지나 있다(새벽 6시를 넘기면 다음 날). → { state, lost } */
export function faint(state) {
  const lost = Math.min(FAINT_LOSS_MAX, Math.floor(state.money * FAINT_LOSS));
  const clock = state.clock ? sleepFor(state.clock, FAINT_HOURS) : state.clock;
  return { state: { ...state, money: state.money - lost, stamina: FAINT_STAMINA, clock }, lost };
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
 * 토벌 자격증 필기: 검정소 토벌 안내서(몬스터 카드 · 규칙 카드)를 꼼꼼히 봐야 풀리는 4지선다 → [{ type, mon?, q, choices, answer }].
 * 카드에 적힌 것만 묻는다: 사는 곳 · 공격 방식 · 단단함(방패 칸) · 맞으면 줄어드는 기운 · 전리품과 그 값. 거꾸로도 묻는다(전리품 → 몬스터).
 * 오답은 같은 구역 몬스터의 것부터 골라 헷갈리게 하고, 규칙 문제의 오답도 그럴듯하게 둔다. 같은 문제는 한 번만.
 */
export function huntQuiz(n, random = Math.random) {
  const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (list) => list[Math.floor(random() * list.length) % list.length];
  const q = (type, text, right, wrong, mon = null) => { const choices = shuffle([right, ...wrong.slice(0, 3)]); return { type, mon, q: text, choices, answer: choices.indexOf(right) }; };
  const REGION = { fields: '동쪽 들판', forest: '서쪽 숲', river: '남쪽 강가', mountain: '북쪽 바위산', night: '밤에 마을 밖 어디든' };
  const field = MONSTER_ORDER.filter((k) => !MONSTERS[k].boss);
  const M = (k) => MONSTERS[k], name = (k) => M(k).name, drop = (k) => DROPS[M(k).drop];
  const pips = (k) => Math.min(5, Math.ceil(M(k).hp / 3)); // 안내서의 단단함(방패 다섯 칸)과 같은 셈
  const won = (v) => `${v.toLocaleString('ko-KR')}원`;
  const quoted = (w, pair) => `'${w}'${josa(w, pair).slice(w.length)}`; // '풀잎 날개'는 · '반짝 뿔'은
  /** 헷갈리는 오답 후보: 같은 구역 몬스터 먼저, 그다음 다른 구역. */
  const lookalikes = (k) => [...shuffle(field.filter((o) => o !== k && M(o).region === M(k).region)), ...shuffle(field.filter((o) => M(o).region !== M(k).region))];
  /** 후보들을 보기 글로 바꾸되 정답 · 서로 겹치는 글은 뺀다. */
  const texts = (list, f, right) => { const seen = new Set([right]); return list.map(f).filter((t) => !seen.has(t) && seen.add(t)); };
  const groups = Object.keys(REGION).filter((r) => field.filter((k) => M(k).region === r).length >= 3);
  const KINDS = {
    region: () => { const k = pick(field), r = REGION[M(k).region]; return q('region', `${josa(name(k), '은/는')} ${M(k).night ? '언제 어디에' : '어디에'} 나타날까?`, r, shuffle(Object.values(REGION).filter((x) => x !== r)), k); },
    drop: () => { const k = pick(field); return q('drop', `${josa(name(k), '을/를')} 잡으면 얻는 전리품은?`, drop(k).name, texts(lookalikes(k), (o) => drop(o).name, drop(k).name), k); },
    dropOf: () => { const k = pick(field); return q('dropOf', `${quoted(drop(k).name, '을/를')} 떨어뜨리는 몬스터는?`, name(k), texts(lookalikes(k), name, name(k)), k); },
    atk: () => { const k = pick(field); return q('atk', `${josa(name(k), '은/는')} 어떻게 공격할까?`, M(k).atk, texts(lookalikes(k), (o) => M(o).atk, M(k).atk), k); },
    atkOf: () => { const k = pick(field); return q('atkOf', `공격 방식이 '${M(k).atk}'인 몬스터는?`, name(k), texts(lookalikes(k), name, name(k)), k); },
    dmg: () => { const k = pick(field), t = `기운 −${M(k).dmg}`; return q('dmg', `${name(k)}에게 한 번 맞으면 기운이 얼마나 줄까?`, t, texts(lookalikes(k), (o) => `기운 −${M(o).dmg}`, t), k); },
    price: () => { const k = pick(field), t = won(drop(k).price); return q('price', `${quoted(drop(k).name, '은/는')} 노동 접수에서 얼마에 팔릴까?`, t, texts(lookalikes(k), (o) => won(drop(o).price), t), k); },
    tough: () => {
      const k = pick(field.filter((o) => field.filter((x) => pips(x) < pips(o)).length >= 3)); // 더 약한 몬스터가 셋 이상 있어야 보기 넷이 된다
      return q('tough', '다음 중 가장 단단한(방패가 많은) 몬스터는?', name(k), shuffle(field.filter((o) => pips(o) < pips(k))).map(name), k);
    },
    odd: () => {
      const r = pick(groups), k = pick(field.filter((o) => M(o).region !== r && !M(o).night)); // 밤 나방은 어디든 나오니 정답이 될 수 없다
      return q('odd', `${REGION[r]}에 살지 않는 몬스터는?`, name(k), shuffle(field.filter((o) => M(o).region === r)).map(name), k);
    }
  };
  const RULES = [
    () => q('rule', '바닥에 빨간 표시가 뜨면 어떻게 할까?', '곧 그 자리로 공격이 오니 피한다', ['몬스터가 화났다는 뜻이니 더 세게 친다', '그 안에 서 있으면 공격을 막을 수 있다', '몬스터가 곧 도망친다는 뜻이니 쫓아간다']),
    () => q('rule', '기운이 0이 되면 어떻게 될까?', '기절해서 집 앞으로 옮겨지고 돈을 조금 잃는다',
      ['기절해도 아무것도 잃지 않고 집에서 바로 일어난다', '기절해서 마을 입구로 옮겨지고 전리품을 모두 잃는다', '그 자리에서 기운이 조금 찬 채로 바로 일어난다']),
    () => q('rule', '몬스터가 들어오지 못하는 곳은?', '마을 울타리 안', ['강가의 나무다리 위', '숲속 커다란 나무 밑', '바위산 동굴 앞']),
    () => q('rule', '전리품은 어디에서 팔까?', '노동 접수', ['도구점', '검정소', '포셰트 가게']),
    () => q('rule', '무기는 어디에서 살까?', '도구점', ['노동 접수', '검정소', '가구점'])
  ];
  // 안내서 세부 문제는 종류마다 두 번씩 뽑아 두고 규칙 문제와 섞는다 → 같은 글은 빼고 n 개.
  // 숫자를 외워야 하는 문제(맞으면 줄어드는 기운 · 판매가)는 한 번씩만(너무 어렵다는 말이 많았다)
  const HARD = new Set([KINDS.dmg, KINDS.price]);
  const pool = shuffle([...Object.values(KINDS), ...Object.values(KINDS).filter((f) => !HARD.has(f)), ...RULES]).map((f) => f());
  const seen = new Set();
  return pool.filter((x) => !seen.has(x.q) && seen.add(x.q)).slice(0, n);
}

export function isValidWeapon(w) {
  return !!w && Array.isArray(w.owned) && w.owned.every((id) => WEAPONS[id]) && (w.held === null || WEAPONS[w.held])
    && (w.engraved === undefined || (Array.isArray(w.engraved) && w.engraved.every((id) => WEAPONS[id]))); // engraved: 얼굴을 새긴 무기(랭커)
}
export function isValidHunted(h) {
  return !!h && typeof h === 'object' && !Array.isArray(h) && Object.entries(h).every(([k, n]) => MONSTERS[k] && typeof n === 'number' && n >= 0);
}
