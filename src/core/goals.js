import { WEAPONS, WEAPON_ORDER } from './combat.js';
import { FURNITURE, HOME_SIZES, WALLPAPERS, FLOORS } from './home.js';
import { LICENSES } from './licenses.js';
import { HUNTER_PROFILES, licensed } from './hunters.js';
import { villagerOf, villagerSpend, updateVillager } from './villagers.js';
import { TOOLS } from './tools.js';
import { JOB_TYPES } from './jobs.js';
import { POCHETTES } from './pochette.js';
import { WORKS, WORK_IDS, WORK_STEP, workOf, workStatus, leftOf, fundWork } from './works.js';

/**
 * 친구들의 돈 모으기 목표: 저마다 차례로 이루고 싶은 것(GOALS: 토벌 자격증 · 무기 · 가구 · 카메라 · 낚싯대)이 있고, 그 값을 모으려고 꾸준히 일한다.
 * 차례 목표를 다 이루면 바라는 것(WISHES)에서 다음 목표가 하나씩 이어서 생긴다: 포셰트 · 가구 · 벽지와 바닥 · 집 넓히기 · 마을 가꾸기 보태기 · 술 자격 · 더 센 무기.
 * 모으는 동안은 라멘값도 아낀다(brain.js 의 wantsMeal: 배고플 때만 사 먹고, 같이 먹자고 불려도 그때만 낸다).
 * 토벌 자격증 · 술 자격은 돈이 모이면 검정소에서 시험을 보고(붙어야 다음 목표로), 나머지는 값이 모이면 그곳(goalPlace)에 가서 산다.
 * 산 무기는 토벌 힘이 되고(npcPower), 마을 가꾸기에 보탠 돈은 내가 내는 모금함과 같은 곳에 모인다(core/works.js). 모몽가는 일하지 않고 훔친다.
 * 랏코는 원작처럼 처음부터 하늘색 자동차가 있다(START_OWN).
 * state.villagers[kind].bought = [이룬 목표 id], .weapon = 산 무기 id, .liquorDay · .liquorTries = 술 자격 시험을 마지막으로 본 날 · 본 횟수
 */
const license = () => ({ id: 'license', kind: 'license', label: LICENSES.hunter.name, cost: LICENSES.hunter.fee });
const weapon = (item) => ({ id: `w-${item}`, kind: 'weapon', item, label: WEAPONS[item].name, cost: WEAPONS[item].price });
const furniture = (item) => ({ id: `f-${item}`, kind: 'furniture', item, label: FURNITURE[item].name, cost: FURNITURE[item].price });
/** 하치와레가 오래 갖고 싶던 카메라(원작). 도구점에서 사고, 산 날 사이드스토리 '하치와레의 카메라'가 열린다(state.story.hachiCamera = 산 날). */
export const CAMERA_PRICE = 500;
const camera = () => ({ id: 'camera', kind: 'camera', label: '카메라', cost: CAMERA_PRICE, story: 'hachiCamera' });
/** 낚싯대(게임 오리지널): 도구점에서 사면 쉬는 틈에 물가에서 낚시하고, 노동 접수 낚시 일감도 받는다(hasRod). */
const rod = () => ({ id: 'rod', kind: 'rod', item: 'rod', label: TOOLS.rod.name, cost: TOOLS.rod.price });
/** 처음부터 가진 것: 랏코의 하늘색 자동차(원작에서 랏코만 가진 차). 마을 밖 먼 길을 차로 다닌다(마을 안은 걸어서, actors/npcs.js 의 setCar). */
const START_OWN = { rakko: ['car'] };

export const GOALS = {
  chiikawa: [license(), weapon('fork'), furniture('doll'), furniture('lamp'), weapon('sword')],
  hachiware: [furniture('rug'), license(), camera(), rod(), weapon('fork'), furniture('stove'), weapon('sword')],
  usagi: [license(), weapon('sword'), weapon('hammer')],
  kurimanju: [furniture('stove'), rod(), furniture('shelf'), license(), weapon('sword')], // 안주 삼을 생선을 낚으려고
  rakko: [rod(), weapon('star')], // 해달이라 물고기는 직접 잡는다. 그다음 이름난 랭커답게 가장 센 반짝 검
  momonga: []
};

/**
 * 차례 목표를 다 이룬 뒤 바라는 것(게임 오리지널). pochette · furniture · wall · floor: 사고 싶은 것들(차례는 없다).
 * like: 종류마다 좋아하는 정도. 다음 목표는 '값 ÷ 좋아하는 정도'가 가장 작은 것이라 싼 것부터 사고, 좋아하는 것은 조금 비싸도 먼저 산다.
 * 종류: pochette 포셰트 · furniture 가구 · decor 벽지와 바닥 · home 집 넓히기(넓은 방 → 큰 방) · donate 마을 가꾸기 보태기 · liquor 술 자격 · weapon 더 센 무기.
 * like 에 없는 종류는 바라지 않는다(쿠리만쥬는 위스키 강의를 하는 쪽이라 술 자격을 바라지 않는다).
 */
export const WISHES = {
  chiikawa: { pochette: ['strawberry', 'lemon'], furniture: ['cushion', 'plant', 'rug'], wall: ['pink'], floor: ['pink'],
    like: { pochette: 1.4, furniture: 1.2, decor: 1, home: 1, donate: 1, weapon: 0.5, liquor: 0.4 } },
  hachiware: { pochette: ['sky', 'night'], furniture: ['cushion', 'lamp', 'plant'], wall: ['sky'], floor: ['grass'],
    like: { pochette: 1.2, furniture: 1, decor: 1.1, home: 0.9, donate: 1.3, weapon: 0.6, liquor: 0.8 } },
  usagi: { pochette: ['lemon', 'chestnut'], furniture: ['cushion', 'doll'], wall: ['lemon'],
    like: { pochette: 1, furniture: 0.8, decor: 0.8, home: 0.8, donate: 0.9, weapon: 1.4, liquor: 0.7 } },
  kurimanju: { pochette: ['chestnut'], furniture: ['plant', 'lamp', 'cushion'], floor: ['dark'],
    like: { pochette: 0.6, furniture: 1.2, decor: 1, home: 1.2, donate: 1, weapon: 0.6 } },
  rakko: { pochette: ['night'], furniture: ['plant', 'lamp'], floor: ['dark'],
    like: { pochette: 0.5, furniture: 0.8, decor: 0.6, home: 1, donate: 1.2, weapon: 1.3, liquor: 0.9 } }
};
/** 친구가 마을 가꾸기에 한 번에 보태는 돈: 내 모금 단위(WORK_STEP)의 절반(친구들 돈만으로 시설이 너무 빨리 생기지 않게). */
export const DONATE_STEP = WORK_STEP / 2;
/** 술 자격(검정소 필기 · 실기)에 붙을 힘. 떨어질 때마다 조금씩 붙기 쉬워진다. */
export const LIQUOR_SKILL = { chiikawa: 0.4, hachiware: 0.55, usagi: 0.5, rakko: 0.7 };

const boughtOf = (state, kind) => (state.villagers && state.villagers[kind] && state.villagers[kind].bought) || [];
/** 그 친구가 가졌는지(처음부터 가진 것이나 이룬 목표). */
const owns = (state, kind, id) => (START_OWN[kind] || []).includes(id) || boughtOf(state, kind).includes(id);
/** 그 친구가 낚싯대를 샀는지. */
export const hasRod = (state, kind) => owns(state, kind, 'rod');
/** 그 친구에게 하늘색 자동차가 있는지(랏코는 처음부터). */
export const hasCar = (state, kind) => owns(state, kind, 'car');
/** 그 친구가 그 일감을 할 수 있는지: 도구가 드는 일감(낚시)은 그 도구를 샀을 때만. */
export const canDoJob = (state, kind, id) => !JOB_TYPES[id] || JOB_TYPES[id].needTool !== 'rod' || hasRod(state, kind);

/** 마을 가꾸기에 보탤 곳: 모으는 중인 시설 가운데 가장 많이 모인 것(내가 모으던 것을 거든다), 없으면 아직 시작 안 한 것 가운데 가장 싼 것. */
function donateTarget(state) {
  const saving = WORK_IDS.filter((id) => workStatus(state, id) === 'saving').sort((a, b) => workOf(state, b).paid - workOf(state, a).paid);
  return saving[0] || WORK_IDS.filter((id) => workStatus(state, id) === 'none').sort((a, b) => WORKS[a].price - WORKS[b].price)[0] || null;
}
/** 바라는 것 가운데 아직 못 이룬 것들 [{ goal, rank }](rank: 값 ÷ 좋아하는 정도, 작을수록 먼저). */
function wishes(state, kind) {
  const W = WISHES[kind];
  if (!W) return [];
  const bought = boughtOf(state, kind), out = [];
  const add = (type, g, base = g.cost) => { if (W.like[type] && !bought.includes(g.id)) out.push({ goal: g, rank: base / W.like[type] }); };
  for (const item of W.pochette || []) add('pochette', { id: `p-${item}`, kind: 'pochette', item, label: POCHETTES[item].name, cost: POCHETTES[item].price });
  for (const item of W.furniture || []) add('furniture', furniture(item));
  for (const item of W.wall || []) add('decor', { id: `wall-${item}`, kind: 'decor', part: 'wall', item, label: WALLPAPERS[item].name, cost: WALLPAPERS[item].price });
  for (const item of W.floor || []) add('decor', { id: `floor-${item}`, kind: 'decor', part: 'floor', item, label: FLOORS[item].name, cost: FLOORS[item].price });
  // 집 넓히기: 한 단계씩(넓은 방 → 큰 방), 값은 내 집 넓히기와 같다
  const size = HOME_SIZES.findIndex((h, i) => i > 0 && !bought.includes(`h-${i}`));
  if (size > 0) add('home', { id: `h-${size}`, kind: 'home', item: size, label: HOME_SIZES[size].name, cost: HOME_SIZES[size].price });
  add('liquor', { id: 'liquor', kind: 'liquor', label: LICENSES.liquor.name, cost: LICENSES.liquor.fee });
  // 더 센 무기: 지금 힘보다 센 것 가운데 가장 약한 것부터 하나씩
  const next = WEAPON_ORDER.find((w) => WEAPONS[w].dmg > npcPower(state, kind) && !bought.includes(`w-${w}`));
  if (next) add('weapon', weapon(next));
  // 마을 가꾸기: 한 번에 DONATE_STEP 씩 보태고, 보탤 때마다 다음 보태기는 두 배씩 뒤로 미룬다
  // (살 것이 남아 있는 동안은 가끔만 보태서 내가 모을 몫을 남기고, 다 산 뒤로는 시설이 다 생길 때까지 보탠다)
  const work = donateTarget(state), n = bought.filter((id) => id.startsWith('d-')).length;
  if (work) add('donate', { id: `d-${n + 1}`, kind: 'donate', item: work, label: WORKS[work].name, cost: Math.min(DONATE_STEP, leftOf(state, work)) }, WORK_STEP * 2 ** n);
  return out;
}

/** 지금 모으는 목표 { id, kind, item?, label, cost } | null(차례 목표도 바라는 것도 다 이뤘거나 목표가 없다). */
export function goalOf(state, kind) {
  const bought = boughtOf(state, kind);
  const fixed = (GOALS[kind] || []).find((g) => (g.kind === 'license' ? !licensed(state, kind) : !bought.includes(g.id)));
  if (fixed) return fixed;
  const list = wishes(state, kind);
  return list.length ? list.reduce((a, b) => (b.rank < a.rank ? b : a)).goal : null;
}

/** 검정소 시험으로 따는 목표(돈이 모여도 가게에서 사지 않는다). */
const EXAMS = new Set(['license', 'liquor']);
/** 가게에서 살 수 있는지(자격증 · 술 자격은 시험으로 따니 빼고, 값이 다 모였을 때). */
export function canBuy(state, kind, day) {
  const g = goalOf(state, kind);
  return !!g && !EXAMS.has(g.kind) && villagerOf(state, kind, day).money >= g.cost;
}

/**
 * 목표를 산다: 돈을 내고 이룬 목표에 적는다(무기는 들고 다닌다). 이야기가 걸린 목표(카메라)면 산 날도 적는다.
 * 마을 가꾸기 보태기는 그 시설 모금에 더한다(full: 이번에 다 모였다, 내일 아침에 생긴다). → { ok, state, goal, full }
 */
export function buyGoal(state, kind, day) {
  if (!canBuy(state, kind, day)) return { ok: false, state, goal: null };
  const g = goalOf(state, kind);
  let s = villagerSpend(state, kind, g.cost, day), full = false;
  if (g.kind === 'donate') {
    const r = fundWork(s, g.item, g.cost);
    if (!r.ok) return { ok: false, state, goal: null };
    s = r.state;
    full = r.full;
  }
  s = updateVillager(s, kind, day, { bought: [...boughtOf(s, kind), g.id], ...(g.kind === 'weapon' ? { weapon: g.item } : {}) });
  if (g.story) s = { ...s, story: { ...(s.story || {}), [g.story]: day } };
  return { ok: true, state: s, goal: g, full };
}

/** 술 자격 시험을 오늘 볼 수 있는지: 지금 목표가 술 자격이고, 응시료가 모였고, 오늘 아직 안 봤다. */
export function canTryLiquor(state, kind, day) {
  const g = goalOf(state, kind), v = villagerOf(state, kind, day);
  return !!g && g.kind === 'liquor' && v.money >= g.cost && v.liquorDay !== day;
}
/** 친구가 술 자격 시험을 본다: 응시료를 내고, 붙으면 이룬 목표에 적는다(떨어질수록 조금씩 붙기 쉬워진다). → { state, passed } */
export function tryLiquor(state, kind, day, random = Math.random) {
  const v = villagerOf(state, kind, day), tries = v.liquorTries || 0;
  const passed = random() < Math.min(0.95, (LIQUOR_SKILL[kind] ?? 0.5) + tries * 0.15);
  const paid = villagerSpend(state, kind, LICENSES.liquor.fee, day);
  const patch = { liquorDay: day, liquorTries: tries + 1, ...(passed ? { bought: [...boughtOf(paid, kind), 'liquor'] } : {}) };
  return { state: updateVillager(paid, kind, day, patch), passed };
}

/** 목표를 이뤘을 때 마을 소식 종류(core/villagetalk.js): 마을 가꾸기에 보탰다 · 집을 넓혔다 · 샀다. */
export const goalNews = (g) => (g.kind === 'donate' ? 'donate' : g.kind === 'home' ? 'homeUp' : 'buy');
/** 목표를 이루러 가는 곳(village.spots 이름): 도구점 · 가구점 · 포셰트 가게 · 부동산 · 마을 가꾸기 모금함 · 검정소. */
const PLACE = { weapon: 'tools', camera: 'tools', rod: 'tools', car: 'tools', furniture: 'furniture', decor: 'furniture', pochette: 'pochette', home: 'realty', donate: 'donation', license: 'exam', liquor: 'exam' };
export const goalPlace = (g) => (g && PLACE[g.kind]) || null;

/** 토벌할 때 한 번에 깎는 힘: 타고난 힘과 산 무기의 힘 중 큰 쪽. */
export function npcPower(state, kind) {
  const w = state.villagers && state.villagers[kind] && state.villagers[kind].weapon;
  return Math.max((HUNTER_PROFILES[kind] && HUNTER_PROFILES[kind].power) || 1, (WEAPONS[w] && WEAPONS[w].dmg) || 0);
}
