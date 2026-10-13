import { registerItems } from './inventory.js';

/**
 * 밤 노동 '반짝 털뭉치 따기'(원작: 밤에 하얗게 빛나는 버섯 갓 위에 앉은, 민들레 씨처럼 동그랗고 반짝이는 털뭉치를 살짝 떼어 모은다).
 * 버섯 무더기(world/glowshrooms.js)는 서쪽 숲에 늘 있고, 털뭉치는 밤에만 갓 위에 앉는다. 버섯 빛이 일정한 빠르기로 밝아졌다 어두워지는데,
 * 손을 뻗을 때마다 정해지는 초록 칸 밝기(glowZone)에서 떼면 깔끔하게, 그 가까이면 그냥 떼어지고, 멀면 털뭉치가 움찔해서 못 뗀다.
 * 그 밤에 뗀 털뭉치는 다음 밤에 다시 앉는다: state.glowfluff = { night: 밤 번호, picked: [버섯 무더기 번호] }.
 */
export const GLOW_ITEMS = {
  glowfluff: { name: '반짝 털뭉치', kind: 'misc', sell: 45, note: '밤에 빛나는 버섯 갓 위에 앉아 있던 동그란 털뭉치. 민들레 씨처럼 보송보송하고 은은하게 빛난다.' }
};
registerItems(GLOW_ITEMS);

/**
 * 털뭉치마다 손을 놓아주는 빛이 다르다: 손을 뻗을 때마다 초록 칸(깔끔하게 떼어지는 밝기, 폭 GLOW_WIDTH) 자리를 새로 고른다.
 * 칸 둘레 GLOW_NEAR 안에서 떼면 그냥 떼어지고, 더 멀면 움찔해서 못 뗀다.
 * (예전엔 칸이 늘 오른쪽 끝 — 가장 밝을 때 — 이라 바늘이 끝에 머무는 동안 떼기만 하면 돼서 보수에 비해 너무 쉬웠다)
 */
export const GLOW_WIDTH = 0.13, GLOW_NEAR = 0.1;
const ZONE_MIN = 0.3, ZONE_MAX = 0.97;

/** 이번에 손을 뻗었을 때의 초록 칸 { from, to }(0~1). random: 0..1 을 돌려주는 함수(테스트에서 고정값). */
export function glowZone(random = Math.random) {
  const from = ZONE_MIN + random() * (ZONE_MAX - GLOW_WIDTH - ZONE_MIN);
  return { from, to: from + GLOW_WIDTH };
}

/** 손을 뗀 순간의 빛 세기(0~1)와 초록 칸 → 'clean' 깔끔하게 | 'ok' 떼었다 | 'startle' 움찔(못 뗐다). */
export const glowResult = (b, zone) => (b >= zone.from && b <= zone.to ? 'clean'
  : b >= zone.from - GLOW_NEAR && b <= zone.to + GLOW_NEAR ? 'ok' : 'startle');

/** 밤 번호: 이 게임의 하루는 아침 6시에 바뀌어서(core/clock.js) 저녁부터 새벽까지가 같은 날 — 그 날 번호가 곧 그 밤이다. */
export const glowNight = (clock) => clock.day;

/** 이번 밤에 이미 뗀 버섯 무더기 번호들. */
export function pickedTonight(state) {
  const g = state.glowfluff;
  return g && g.night === glowNight(state.clock) ? g.picked : [];
}

/** 이번 밤에 그 무더기의 털뭉치를 뗐다고 적는다(지난 밤 기록은 버린다). */
export function markPicked(state, id) {
  const cur = pickedTonight(state);
  return cur.includes(id) ? state : { ...state, glowfluff: { night: glowNight(state.clock), picked: [...cur, id] } };
}

/** 저장된 모양이 맞는지(save.js). */
export function isValidGlowfluff(g) {
  return !!g && typeof g === 'object' && Number.isFinite(g.night) && Array.isArray(g.picked) && g.picked.every((n) => Number.isInteger(n) && n >= 0);
}
