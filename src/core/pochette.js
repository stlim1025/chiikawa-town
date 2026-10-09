import { trySpend } from './state.js';

/**
 * 포셰트 가게: 포셰트 갑옷 씨가 손수 만든 포셰트를 판다. 사면 바로 메고, 멘 포셰트는 내 캐릭터에 보인다.
 * 지갑을 포셰트에 넣고 다니니 소매치기(모몽가)를 당해도 절반만 빼앗긴다.
 * state.pochette = { owned: [포셰트 id], wear: 멘 포셰트 id | null }
 */
export const POCHETTES = {
  strawberry: { name: '딸기 포셰트', color: '#f7a8c4', accent: '#e5788f', price: 300, note: '포셰트 갑옷 씨의 대표작' },
  mint: { name: '민트 포셰트', color: '#a8e0cf', accent: '#5fae95', price: 300, note: '산뜻한 민트색' },
  lemon: { name: '레몬 포셰트', color: '#fbe08a', accent: '#e0b53c', price: 350, note: '해님처럼 노란색' },
  sky: { name: '하늘 포셰트', color: '#a9d4f2', accent: '#6a9ed0', price: 350, note: '맑은 하늘 같은 파랑' },
  chestnut: { name: '밤 포셰트', color: '#e6b98a', accent: '#b8743d', price: 450, note: '군밤처럼 포근한 갈색' },
  night: { name: '별밤 포셰트', color: '#4a5585', accent: '#fcd95b', price: 800, note: '밤하늘에 별 단추 하나' }
};
/** 포셰트를 메고 있으면 소매치기가 가져가는 돈이 이만큼으로 준다. */
export const THEFT_GUARD = 0.5;

/** 가진 포셰트와 멘 포셰트(예전 저장에는 없으니 빈 것). */
export function pochetteOf(state) {
  return state.pochette || { owned: [], wear: null };
}

/** 포셰트를 산다(사면 바로 멘다). { ok, state, reason: 'none' | 'owned' | 'money' } */
export function buyPochette(state, id) {
  const P = POCHETTES[id];
  if (!P) return { ok: false, reason: 'none', state };
  const pc = pochetteOf(state);
  if (pc.owned.includes(id)) return { ok: false, reason: 'owned', state };
  const paid = trySpend(state, P.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: { ...paid.state, pochette: { owned: [...pc.owned, id], wear: id } } };
}

/** 가진 포셰트를 멘다(null 이면 벗는다). 없는 포셰트는 멜 수 없다. */
export function wearPochette(state, id) {
  const pc = pochetteOf(state);
  if (id !== null && !pc.owned.includes(id)) return state;
  return { ...state, pochette: { ...pc, wear: id } };
}

/** 지금 멘 포셰트 id(안 멨으면 null). */
export function worn(state) {
  const w = pochetteOf(state).wear;
  return w && POCHETTES[w] ? w : null;
}

/** 소매치기가 가져갈 돈: 포셰트를 메고 있으면 절반(적어도 1원). */
export function guardedTheft(state, amount) {
  return worn(state) ? Math.max(1, Math.round(amount * THEFT_GUARD)) : amount;
}

/** 저장된 포셰트 모양이 맞는지(save.js 검사). */
export function isValidPochette(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.owned)) return false;
  return p.owned.every((id) => POCHETTES[id]) && (p.wear === null || p.owned.includes(p.wear));
}
