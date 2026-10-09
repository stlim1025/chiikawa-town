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
  },
  // 맥주집(마을 동쪽 노점): 저녁이면 쿠리만쥬가 와서 한 잔 한다. 같이 건배하면 친해진다
  pub: {
    name: '맥주집',
    items: [
      { id: 'beer', name: '생맥주', price: 100, stamina: 35, needs: 'liquor', note: '거품 가득 시원한 한 잔' },
      { id: 'edamame', name: '풋콩', price: 50, stamina: 12, note: '짭짤한 맥주 안주' }
    ]
  }
};
/** 쿠리만쥬와 건배: 두 잔 값 · 하트 · 기운. 쿠리만쥬가 맥주집에 있는 저녁(PUB_HOURS)에 하루 한 번. */
export const CHEERS_PRICE = 200, CHEERS_STAMINA = 30;
export const PUB_HOURS = [17, 21];
export const isPubHour = (hour) => hour >= PUB_HOURS[0] && hour < PUB_HOURS[1];

/** 상품을 산다. */
export function buy(state, shopId, itemId) {
  const item = SHOPS[shopId].items.find(i => i.id === itemId);
  if (item.needs && !hasLicense(state, item.needs)) return { ok: false, reason: 'license', state };
  if (item.stamina && state.stamina >= MAX_STAMINA) return { ok: false, reason: 'full', state };
  const paid = trySpend(state, item.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: item.stamina ? restoreStamina(paid.state, item.stamina) : paid.state };
}
