import { trySpend } from './state.js';
import { countOf, takeItem } from './inventory.js';

/**
 * 꾸미기 소품: 머리에 다는 장식(리본 · 꽃 · 새싹 · 안경 · 모자 · 왕관). 포셰트 가게에서 사고, 집 옷장에서 바꿔 단다.
 * craft 가 있는 소품은 돈 대신 그 재료로 포셰트 갑옷 씨가 만들어 준다(별 조각 셋 → 별 조각 머리핀).
 * state.wardrobe = { owned: [소품 id], wear: 단 소품 id | 'none' }. 예전 저장은 캐릭터 만들기에서 고른 장식을 가진 것으로 친다.
 */
export const ACCESSORY_ITEMS = {
  ribbon: { name: '분홍 리본', price: 200, note: '머리 옆에 나비 리본' },
  flower: { name: '하얀 꽃 핀', price: 200, note: '들꽃 한 송이' },
  sprout: { name: '새싹 머리띠', price: 150, note: '머리 위에 새싹 둘' },
  glasses: { name: '동글 안경', price: 400, note: '똑똑해 보이는 안경' },
  cap: { name: '빨간 모자', price: 500, note: '햇빛 가리개 모자' },
  crown: { name: '반짝 왕관', price: 3000, note: '반짝이는 황금 왕관' },
  pajama: { name: '귀 달린 잠옷', price: 0, gift: true, note: '포셰트 갑옷 씨가 만든 후드 잠옷(선물). 입으면 온몸이 폭신한 연보라' },
  starpin: { name: '별 조각 머리핀', price: 0, craft: { starshard: 3 }, note: '별똥별맨의 별 조각 셋으로 만든 반짝이는 머리핀' }
};

export function wardrobeOf(state) {
  if (state.wardrobe) return state.wardrobe;
  const a = state.profile && state.profile.look && state.profile.look.accessory;
  return ACCESSORY_ITEMS[a] ? { owned: [a], wear: a } : { owned: [], wear: 'none' };
}
/** 소품을 산다(사면 바로 단다). { ok, state, reason: 'none' | 'owned' | 'money' } */
export function buyAccessory(state, id) {
  const A = ACCESSORY_ITEMS[id];
  if (!A) return { ok: false, reason: 'none', state };
  if (A.craft) return { ok: false, reason: 'craft', state }; // 재료로만 만든다(craftAccessory)
  const w = wardrobeOf(state);
  if (w.owned.includes(id)) return { ok: false, reason: 'owned', state };
  const paid = trySpend(state, A.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: { ...paid.state, wardrobe: { owned: [...w.owned, id], wear: id } } };
}
/** 재료로 소품을 만든다(재료는 가방에서 빠지고, 만들면 바로 단다). { ok, state, reason: 'none' | 'owned' | 'items' } */
export function craftAccessory(state, id) {
  const A = ACCESSORY_ITEMS[id];
  if (!A || !A.craft) return { ok: false, reason: 'none', state };
  const w = wardrobeOf(state);
  if (w.owned.includes(id)) return { ok: false, reason: 'owned', state };
  const need = Object.entries(A.craft);
  if (need.some(([it, n]) => countOf(state, it) < n)) return { ok: false, reason: 'items', state };
  const s = need.reduce((acc, [it, n]) => takeItem(acc, it, n).state, state);
  return { ok: true, state: { ...s, wardrobe: { owned: [...w.owned, id], wear: id } } };
}
/** 가진 소품을 단다('none' 이면 뗀다). */
export function wearAccessory(state, id) {
  const w = wardrobeOf(state);
  if (id !== 'none' && !w.owned.includes(id)) return state;
  return { ...state, wardrobe: { ...w, wear: id } };
}
export function isValidWardrobe(w) {
  return !!w && Array.isArray(w.owned) && w.owned.every((id) => ACCESSORY_ITEMS[id]) && (w.wear === 'none' || ACCESSORY_ITEMS[w.wear]);
}
