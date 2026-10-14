import { registerItems } from './inventory.js';
import { POND, LAKE, RIVER, SOUTH_SHORE, BRIDGES, riverZ } from './layout.js';

/**
 * 낚시(게임 오리지널): 도구점에서 낚싯대를 사면 물가에서 낚시를 한다.
 *  던지기(기운 FISH_STAMINA) → 찌가 퐁 잠기면 바로 행동 버튼(물고기마다 누를 틈이 다르다) → 큰 물고기는 '감기!' 연타로 끌어올린다.
 *  물(연못 · 시냇물 · 호수 · 바다)마다, 낮 · 밤마다 잡히는 물고기가 다르다. 물고기는 가방에 들어가고 노동 접수 '팔기'에서 판다.
 * size: 0 작은 고기(바로 올라온다) · 1 중간 · 2 큰 고기(감기 연타가 더 길다). day · night: 그때만 잡힌다. weight: 잘 잡히는 정도.
 */
export const FISH = {
  minnow: { name: '송사리', sell: 12, waters: ['pond', 'river'], weight: 5, size: 0, color: '#c9d6de', note: '작은 물고기. 연못과 시냇물에 많다.' },
  goldfish: { name: '금붕어', sell: 70, waters: ['pond'], weight: 1, size: 0, color: '#f2884a', note: '마을 연못에 숨어 사는 주황빛 물고기.' },
  chub: { name: '피라미', sell: 18, waters: ['river'], weight: 5, size: 0, color: '#a9c3cf', note: '시냇물을 재빠르게 오르내리는 물고기.' },
  crucian: { name: '붕어', sell: 30, waters: ['river', 'lake'], weight: 4, size: 1, color: '#b8a47a', note: '둥글넓적한 민물고기.' },
  sweetfish: { name: '은어', sell: 60, waters: ['river'], weight: 1.5, size: 1, day: true, color: '#cfe0e8', note: '맑은 낮의 시냇물에서만 잡힌다. 수박 냄새가 난다나?' },
  catfish: { name: '메기', sell: 90, waters: ['river', 'lake'], weight: 2, size: 2, night: true, color: '#6f6a63', note: '밤에만 어슬렁거리는 수염 난 물고기.' },
  carp: { name: '잉어', sell: 45, waters: ['lake'], weight: 4, size: 1, color: '#d8a868', note: '호수의 터줏대감.' },
  trout: { name: '송어', sell: 60, waters: ['lake'], weight: 2.5, size: 1, color: '#9fb7a8', note: '차가운 호숫물을 좋아한다.' },
  rainbow: { name: '무지개송어', sell: 130, waters: ['lake'], weight: 0.8, size: 2, color: '#e7a0b8', note: '옆구리에 무지개빛 줄이 있는 귀한 송어.' },
  mackerel: { name: '고등어', sell: 40, waters: ['sea'], weight: 5, size: 1, color: '#6f94bb', note: '바다에서 떼 지어 다닌다.' },
  puffer: { name: '복어', sell: 80, waters: ['sea'], weight: 2, size: 1, color: '#f2d27a', note: '건드리면 빵빵하게 부푼다.' },
  seabream: { name: '도미', sell: 120, waters: ['sea'], weight: 1.5, size: 2, color: '#f08a8a', note: '분홍빛 바닷물고기. 잔칫상에 오른다.' },
  octopus: { name: '문어', sell: 180, waters: ['sea'], weight: 0.6, size: 2, night: true, color: '#d9645a', note: '밤바다에서 다리 여덟 개로 꽉 붙잡는다.' },
  can: { name: '빈 깡통', sell: 3, waters: ['pond', 'river', 'lake', 'sea'], weight: 0.8, size: 0, junk: true, color: '#b9bec6', note: '누가 버렸담. 물이 깨끗해졌다.' }
};
registerItems(Object.fromEntries(Object.entries(FISH).map(([id, f]) => [id, { name: f.name, kind: 'fish', sell: f.sell, note: f.note }])));

/** 한 번 던질 때 드는 기운. */
export const FISH_STAMINA = 5;
/** 찌가 잠기기까지 기다리는 시간(초) 범위. */
export const BITE_WAIT = [2.5, 7];
/** 물고기 크기별: 찌가 잠긴 뒤 누를 틈(초), 감기 연타(한 번에 채우는 양 · 버티는 힘(초당 줄어듦) · 제한 시간). */
export const SIZE_RULES = [
  { window: 1.0, reel: null },
  { window: 0.75, reel: { tap: 0.17, drain: 0.32, time: 5 } },
  { window: 0.55, reel: { tap: 0.12, drain: 0.42, time: 6 } }
];
const NAMES = { pond: '연못', river: '시냇물', lake: '호수', sea: '바다' };
export const waterName = (w) => NAMES[w] || '물';

/** (x, z) 의 물: 'pond' 마을 연못 | 'river' 시냇물 | 'lake' 호수 | 'sea' 바다 | null(뭍). 다리 위는 뭍이다. */
export function waterAt(x, z) {
  if (Math.hypot(x - POND.x, (z - POND.z) / 0.85) < POND.r) return 'pond';
  if (Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) < 1) return 'lake';
  if (z > SOUTH_SHORE) return 'sea';
  if (Math.abs(z - riverZ(x)) < RIVER.half && !BRIDGES.some((b) => Math.abs(x - b.x) < b.half)) return 'river';
  return null;
}

const isNight = (hour) => hour >= 19 || hour < 5;
/** 그 물 · 그 시각에 잡힐 수 있는 물고기 id 들. */
export function fishFor(water, hour) {
  return Object.keys(FISH).filter((id) => {
    const f = FISH[id];
    return f.waters.includes(water) && !(f.night && !isNight(hour)) && !(f.day && isNight(hour));
  });
}
/** 그 물 · 그 시각에 무엇이 물지(잘 잡히는 정도로 고른다). random: 0..1 함수. */
export function pickFish(water, hour, random = Math.random) {
  const ids = fishFor(water, hour);
  const total = ids.reduce((a, id) => a + FISH[id].weight, 0);
  let r = random() * total;
  for (const id of ids) { r -= FISH[id].weight; if (r < 0) return id; }
  return ids[ids.length - 1];
}
/** 물고기의 크기 규칙(누를 틈 · 감기 연타). */
export const rulesOf = (id) => SIZE_RULES[FISH[id].size];
