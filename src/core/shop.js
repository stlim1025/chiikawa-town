import { MAX_STAMINA, trySpend, restoreStamina } from './state.js';
import { hasLicense } from './licenses.js';

/** 가게와 상품. */
export const SHOPS = {
  ramen: {
    name: '라멘 로우',
    items: [
      { id: 'ramen', name: '라멘', price: 80, stamina: 60 },
      { id: 'onigiri', name: '주먹밥', price: 30, stamina: 25 },
      { id: 'highball', name: '하이볼', price: 90, stamina: 45, needs: 'liquor' } // 술 자격이 있어야 판다
    ]
  }
};

/** 상품을 산다. */
export function buy(state, shopId, itemId) {
  const item = SHOPS[shopId].items.find(i => i.id === itemId);
  if (item.needs && !hasLicense(state, item.needs)) return { ok: false, reason: 'license', state };
  if (item.stamina && state.stamina >= MAX_STAMINA) return { ok: false, reason: 'full', state };
  const paid = trySpend(state, item.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: item.stamina ? restoreStamina(paid.state, item.stamina) : paid.state };
}
