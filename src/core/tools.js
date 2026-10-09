import { trySpend } from './state.js';

/**
 * 도구: 마을 지도(카니 헌책방), 랜턴 · 손전등(도구점). 불은 하나만 들고, 화면 버튼으로 끔 → 랜턴 → 손전등을 바꾼다.
 * state.tools = { owned: [도구 id], light: 'off' | 'lantern' | 'flashlight' }
 */
export const TOOLS = {
  map: { name: '마을 지도', price: 500, shop: 'books', note: '다녀온 곳이 다 보여요' },
  lantern: { name: '랜턴', price: 300, shop: 'tools', light: true, note: '내 둘레를 밝혀요' },
  flashlight: { name: '손전등', price: 900, shop: 'tools', light: true, note: '앞쪽을 멀리 밝혀요' }
};
export const LIGHT_ORDER = ['off', 'lantern', 'flashlight'];

/** 가진 도구와 든 불(예전 저장에는 없으니 빈 것). */
export function toolsOf(state) {
  return state.tools || { owned: [], light: 'off' };
}
export const hasTool = (state, id) => toolsOf(state).owned.includes(id);

/** 도구를 산다. 불이면 사자마자 든다. { ok, state, reason: 'none' | 'owned' | 'money' } */
export function buyTool(state, id) {
  const T = TOOLS[id];
  if (!T) return { ok: false, reason: 'none', state };
  if (hasTool(state, id)) return { ok: false, reason: 'owned', state };
  const paid = trySpend(state, T.price);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  const t = toolsOf(state);
  return { ok: true, state: { ...paid.state, tools: { owned: [...t.owned, id], light: T.light ? id : t.light } } };
}
/** 보상으로 도구를 준다. 이미 있으면 그대로 두고 already 로 알려 준다(다른 보상을 줄 수 있게). */
export function grantTool(state, id) {
  if (hasTool(state, id)) return { state, already: true };
  const t = toolsOf(state);
  return { state: { ...state, tools: { ...t, owned: [...t.owned, id] } }, already: false };
}
/** 지금 든 불(가지지 않은 불이면 꺼짐). */
export function lightOf(state) {
  const l = toolsOf(state).light;
  return l !== 'off' && hasTool(state, l) ? l : 'off';
}
/** 등불 버튼: 가진 불만 끔 → 랜턴 → 손전등 순서로 바꾼다. */
export function nextLight(state) {
  const t = toolsOf(state);
  const order = LIGHT_ORDER.filter((l) => l === 'off' || t.owned.includes(l));
  const i = order.indexOf(lightOf(state));
  return { ...state, tools: { ...t, light: order[(i + 1) % order.length] } };
}
/** 저장된 도구 모양이 맞는지(save.js 검사). */
export function isValidTools(t) {
  return !!t && typeof t === 'object' && Array.isArray(t.owned) && t.owned.every((id) => TOOLS[id]) && LIGHT_ORDER.includes(t.light);
}
