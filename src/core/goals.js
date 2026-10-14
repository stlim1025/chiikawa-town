import { WEAPONS } from './combat.js';
import { FURNITURE } from './home.js';
import { LICENSES } from './licenses.js';
import { HUNTER_PROFILES, licensed } from './hunters.js';
import { villagerOf, villagerSpend, updateVillager } from './villagers.js';
import { TOOLS } from './tools.js';
import { JOB_TYPES } from './jobs.js';

/**
 * 친구들의 돈 모으기 목표: 저마다 차례로 이루고 싶은 것(토벌 자격증 · 무기 · 가구)이 있고, 그 값을 모으려고 꾸준히 일한다.
 * 자격증은 돈이 모이면 검정소에서 시험을 보고(붙어야 다음 목표로), 무기 · 가구는 값이 모이면 도구점 · 가구점에 가서 산다.
 * 산 무기는 토벌 힘이 되고(npcPower), 다 이루면 예전처럼 돈이 모자랄 때 위주로 일한다. 모몽가는 일하지 않고 훔친다.
 * state.villagers[kind].bought = [이룬 목표 id], .weapon = 산 무기 id
 */
const license = () => ({ id: 'license', kind: 'license', label: LICENSES.hunter.name, cost: LICENSES.hunter.fee });
const weapon = (item) => ({ id: `w-${item}`, kind: 'weapon', item, label: WEAPONS[item].name, cost: WEAPONS[item].price });
const furniture = (item) => ({ id: `f-${item}`, kind: 'furniture', item, label: FURNITURE[item].name, cost: FURNITURE[item].price });
/** 하치와레가 오래 갖고 싶던 카메라(원작). 도구점에서 사고, 산 날 사이드스토리 '하치와레의 카메라'가 열린다(state.story.hachiCamera = 산 날). */
export const CAMERA_PRICE = 500;
const camera = () => ({ id: 'camera', kind: 'camera', label: '카메라', cost: CAMERA_PRICE, story: 'hachiCamera' });
/** 낚싯대(게임 오리지널): 도구점에서 사면 쉬는 틈에 물가에서 낚시하고, 노동 접수 낚시 일감도 받는다(hasRod). */
const rod = () => ({ id: 'rod', kind: 'rod', item: 'rod', label: TOOLS.rod.name, cost: TOOLS.rod.price });

export const GOALS = {
  chiikawa: [license(), weapon('fork'), furniture('doll'), furniture('lamp'), weapon('sword')],
  hachiware: [furniture('rug'), license(), camera(), rod(), weapon('fork'), furniture('stove'), weapon('sword')],
  usagi: [license(), weapon('sword'), weapon('hammer')],
  kurimanju: [furniture('stove'), rod(), furniture('shelf'), license(), weapon('sword')], // 안주 삼을 생선을 낚으려고
  rakko: [rod(), weapon('star')], // 해달이라 물고기는 직접 잡는다. 그다음 이미 이름난 랭커답게 가장 센 반짝 검을 노린다
  momonga: []
};

const boughtOf = (state, kind) => (state.villagers && state.villagers[kind] && state.villagers[kind].bought) || [];
/** 그 친구가 낚싯대를 샀는지. */
export const hasRod = (state, kind) => boughtOf(state, kind).includes('rod');
/** 그 친구가 그 일감을 할 수 있는지: 도구가 드는 일감(낚시)은 그 도구를 샀을 때만. */
export const canDoJob = (state, kind, id) => !JOB_TYPES[id] || JOB_TYPES[id].needTool !== 'rod' || hasRod(state, kind);

/** 지금 모으는 목표 { id, kind, item?, label, cost } | null(다 이뤘거나 목표가 없다). */
export function goalOf(state, kind) {
  const bought = boughtOf(state, kind);
  return (GOALS[kind] || []).find((g) => (g.kind === 'license' ? !licensed(state, kind) : !bought.includes(g.id))) || null;
}

/** 가게에서 살 수 있는지(자격증은 시험으로 따니 빼고, 값이 다 모였을 때). */
export function canBuy(state, kind, day) {
  const g = goalOf(state, kind);
  return !!g && g.kind !== 'license' && villagerOf(state, kind, day).money >= g.cost;
}

/** 목표를 산다: 돈을 내고 이룬 목표에 적는다(무기는 들고 다닌다). 이야기가 걸린 목표(카메라)면 산 날도 적는다. → { ok, state, goal } */
export function buyGoal(state, kind, day) {
  if (!canBuy(state, kind, day)) return { ok: false, state, goal: null };
  const g = goalOf(state, kind);
  const paid = villagerSpend(state, kind, g.cost, day);
  const patch = { bought: [...boughtOf(paid, kind), g.id], ...(g.kind === 'weapon' ? { weapon: g.item } : {}) };
  let s = updateVillager(paid, kind, day, patch);
  if (g.story) s = { ...s, story: { ...(s.story || {}), [g.story]: day } };
  return { ok: true, state: s, goal: g };
}

/** 토벌할 때 한 번에 깎는 힘: 타고난 힘과 산 무기의 힘 중 큰 쪽. */
export function npcPower(state, kind) {
  const w = state.villagers && state.villagers[kind] && state.villagers[kind].weapon;
  return Math.max((HUNTER_PROFILES[kind] && HUNTER_PROFILES[kind].power) || 1, (WEAPONS[w] && WEAPONS[w].dmg) || 0);
}
