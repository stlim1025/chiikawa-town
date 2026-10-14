import { registerItems, countOf, takeItem, addItem } from './inventory.js';
import { POND, LAKE, RIVER, SOUTH_SHORE, BRIDGES, riverZ } from './layout.js';

/**
 * 낚시(게임 오리지널): 도구점에서 낚싯대를 사면 물가에서 낚시를 한다.
 *  던지기(기운 FISH_STAMINA) → 찌가 퐁 잠기면 바로 행동 버튼(물고기마다 누를 틈이 다르다) → 끌어올리기 놀이(stepReel):
 *  행동 버튼을 누르고 있으면 초록 칸이 올라가고 떼면 내려온다. 이리저리 도망치는 물고기를 칸 안에 두면 게이지가 차서 낚는다.
 *  물(연못 · 시냇물 · 호수 · 바다)마다, 낮 · 밤마다 잡히는 물고기가 다르다. 물고기는 가방에 들어가고 노동 접수 '팔기'에서 판다.
 * size: 0 작은 고기 · 1 중간 · 2 큰 고기(칸이 좁고 물고기가 빠르다). day · night: 그때만 잡힌다. weight: 잘 잡히는 정도.
 * cm: 잡힐 때 크기 범위(낚시 기록 state.fishLog 에 가장 큰 것을 남긴다). junk: 쓰레기(놀이 없이 바로 올라온다).
 */
export const FISH = {
  minnow: { name: '송사리', sell: 12, waters: ['pond', 'river'], weight: 5, size: 0, cm: [3, 6], color: '#c9d6de', note: '작은 물고기. 연못과 시냇물에 많다.' },
  goldfish: { name: '금붕어', sell: 70, waters: ['pond'], weight: 1, size: 0, cm: [6, 14], color: '#f2884a', note: '마을 연못에 숨어 사는 주황빛 물고기.' },
  chub: { name: '피라미', sell: 18, waters: ['river'], weight: 5, size: 0, cm: [8, 15], color: '#a9c3cf', note: '시냇물을 재빠르게 오르내리는 물고기.' },
  crucian: { name: '붕어', sell: 30, waters: ['river', 'lake'], weight: 4, size: 1, cm: [14, 28], color: '#b8a47a', note: '둥글넓적한 민물고기.' },
  sweetfish: { name: '은어', sell: 60, waters: ['river'], weight: 1.5, size: 1, day: true, cm: [15, 25], color: '#cfe0e8', note: '맑은 낮의 시냇물에서만 잡힌다. 수박 냄새가 난다나?' },
  catfish: { name: '메기', sell: 90, waters: ['river', 'lake'], weight: 2, size: 2, night: true, cm: [35, 70], color: '#6f6a63', note: '밤에만 어슬렁거리는 수염 난 물고기.' },
  carp: { name: '잉어', sell: 45, waters: ['lake'], weight: 4, size: 1, cm: [30, 65], color: '#d8a868', note: '호수의 터줏대감.' },
  trout: { name: '송어', sell: 60, waters: ['lake'], weight: 2.5, size: 1, cm: [25, 45], color: '#9fb7a8', note: '차가운 호숫물을 좋아한다.' },
  rainbow: { name: '무지개송어', sell: 130, waters: ['lake'], weight: 0.8, size: 2, cm: [35, 60], color: '#e7a0b8', note: '옆구리에 무지개빛 줄이 있는 귀한 송어.' },
  mackerel: { name: '고등어', sell: 40, waters: ['sea'], weight: 5, size: 1, cm: [25, 40], color: '#6f94bb', note: '바다에서 떼 지어 다닌다.' },
  puffer: { name: '복어', sell: 80, waters: ['sea'], weight: 2, size: 1, cm: [12, 28], color: '#f2d27a', note: '건드리면 빵빵하게 부푼다.' },
  seabream: { name: '도미', sell: 120, waters: ['sea'], weight: 1.5, size: 2, cm: [30, 55], color: '#f08a8a', note: '분홍빛 바닷물고기. 잔칫상에 오른다.' },
  octopus: { name: '문어', sell: 180, waters: ['sea'], weight: 0.6, size: 2, night: true, cm: [40, 90], color: '#d9645a', note: '밤바다에서 다리 여덟 개로 꽉 붙잡는다.' },
  can: { name: '빈 깡통', sell: 3, waters: ['pond', 'river', 'lake', 'sea'], weight: 0.8, size: 0, junk: true, color: '#b9bec6', note: '누가 버렸담. 물이 깨끗해졌다.' }
};
registerItems(Object.fromEntries(Object.entries(FISH).map(([id, f]) => [id, { name: f.name, kind: 'fish', sell: f.sell, note: f.note }])));

// ---------- 낚은 물고기 쓰기(게임 오리지널): 생선구이 · 낚시 도감 ----------
/** 생선구이: 쿠리만쥬네 화로에서 굽는다(grillFish). 먹으면 기운이 차고, 랏코 · 쿠리만쥬가 좋아한다. */
export const FISH_DISHES = { grilledfish: { name: '생선구이', kind: 'food', eat: 35, note: '쿠리만쥬네 화로에서 노릇하게 구운 생선. 고소한 냄새가 솔솔 나요.' } };
registerItems(FISH_DISHES);
/** 화로에 한 번에 올리는 생선 수(쿠리만쥬네 놀러 가서 하루 한 번). */
export const GRILL_MAX = 3;
/**
 * 가방의 생선을 굽는다: 쓰레기(빈 깡통)는 빼고 값싼 것부터(귀한 고기는 아껴 둔다) 많아야 GRILL_MAX 마리, 큰 고기는 두 접시.
 * → { ok, state, used: { id: 마리 }, made: 접시 수, reason?: 'none'(구울 생선 없음) | 'full'(가방이 꽉 찼다) }
 */
export function grillFish(s, max = GRILL_MAX) {
  const ids = Object.keys(FISH).filter((id) => !FISH[id].junk && countOf(s, id) > 0).sort((a, b) => FISH[a].sell - FISH[b].sell);
  if (!ids.length) return { ok: false, reason: 'none', state: s, used: {}, made: 0 };
  let state = s, left = max, made = 0;
  const used = {};
  for (const id of ids) {
    while (left > 0 && countOf(state, id) > 0) {
      const plates = FISH[id].size === 2 ? 2 : 1, r = addItem(takeItem(state, id, 1).state, 'grilledfish', plates);
      if (!r.added) return made ? { ok: true, state, used, made } : { ok: false, reason: 'full', state: s, used: {}, made: 0 };
      state = r.state; used[id] = (used[id] || 0) + 1; made += plates; left--;
    }
  }
  return { ok: true, state, used, made };
}

/** 낚시 도감에 올리는 물고기(빈 깡통은 빼고). */
export const DEX_FISH = Object.keys(FISH).filter((id) => !FISH[id].junk);
/** 도감 보상: 잡아 본 물고기가 n 가지가 되면 받는다(마을폰 '낚시 도감'에서 받기). */
export const DEX_PRIZES = [{ n: 4, money: 300 }, { n: 8, money: 800 }, { n: DEX_FISH.length, money: 3000 }];
/** 잡아 본 물고기 가짓수. */
export const dexCount = (s) => DEX_FISH.filter((id) => fishLogOf(s)[id]).length;
/** 받은 도감 보상(n 목록). */
export const fishPrizeOf = (s) => (Array.isArray(s.fishPrize) ? s.fishPrize : []);
export const canClaimDex = (s, n) => DEX_PRIZES.some((p) => p.n === n) && dexCount(s) >= n && !fishPrizeOf(s).includes(n);
/** 도감 보상을 받는다. → { ok, state, money } */
export function claimDex(s, n) {
  if (!canClaimDex(s, n)) return { ok: false, state: s, money: 0 };
  const money = DEX_PRIZES.find((p) => p.n === n).money;
  return { ok: true, money, state: { ...s, money: s.money + money, fishPrize: [...fishPrizeOf(s), n] } };
}
/** 저장 확인: 아는 보상만, 겹치지 않게. */
export const isValidFishPrize = (p) => Array.isArray(p) && p.every((n) => DEX_PRIZES.some((q) => q.n === n)) && new Set(p).size === p.length;

/** 한 번 던질 때 드는 기운. */
export const FISH_STAMINA = 5;
/** 찌가 잠기기까지 기다리는 시간(초) 범위. */
export const BITE_WAIT = [2.5, 7];
/**
 * 물고기 크기별: 찌가 잠긴 뒤 누를 틈(초)과 끌어올리기 놀이 game —
 * zone 초록 칸 크기(물길 전체 1 기준) · speed 물고기 빠르기(초당) · turn 방향을 바꾸는 틈(초 범위) ·
 * dart 방향을 바꿀 때 휙 내빼는 확률(그때는 REEL.dart 배 빠르게 멀리) ·
 * gain 칸 안에 있을 때 게이지가 차는 빠르기 · loss 밖일 때 빠지는 빠르기 · start 처음 게이지.
 */
export const SIZE_RULES = [
  { window: 1.0, game: { zone: 0.34, speed: 0.4, turn: [0.5, 1.2], dart: 0.06, gain: 0.42, loss: 0.18, start: 0.3 } },
  { window: 0.75, game: { zone: 0.32, speed: 0.46, turn: [0.45, 1.1], dart: 0.1, gain: 0.4, loss: 0.19, start: 0.32 } },
  { window: 0.55, game: { zone: 0.3, speed: 0.5, turn: [0.45, 1.0], dart: 0.13, gain: 0.37, loss: 0.2, start: 0.34 } }
];
/**
 * 초록 칸 움직임: 누르고 있으면 up 만큼 위로, 떼면 down 만큼 아래로 빨라진다(초당 속도 최대 max). 끝에 닿으면 bounce 만큼 튕긴다.
 * grace: 시작하고 이 시간(초) 동안은 게이지가 빠지지 않는다(손을 버튼에 올릴 틈). dart: 물고기가 내뺄 때 빠르기 배수.
 */
export const REEL = { up: 3.4, down: 2.9, max: 1.3, bounce: 0.35, grace: 0.5, dart: 1.7 };
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
/** 물고기의 크기 규칙(누를 틈 · 끌어올리기 놀이). */
export const rulesOf = (id) => SIZE_RULES[FISH[id].size];

/** 끌어올리기 놀이 시작: zone 초록 칸 아래 끝(0 ~ 1 − 칸 크기) · fish 물고기 자리(0 ~ 1) · progress 게이지(0 ~ 1). */
export function startReel(id, random = Math.random) {
  const g = rulesOf(id).game;
  return { id, t: 0, zone: 0.5 - g.zone / 2, vz: 0, fish: 0.5, target: 0.3 + random() * 0.4, turnAt: g.turn[0], dart: false, progress: g.start, inside: true, done: null };
}
/**
 * dt 초 지나기: holding(행동 버튼을 누르고 있다)이면 초록 칸이 올라가고, 떼면 내려온다. 물고기는 정한 자리로 헤엄치다가
 * 틈마다 새 자리를 고른다. 물고기가 칸 안이면 게이지가 차고 밖이면 빠진다 → done: 'caught'(꽉 참) | 'lost'(바닥) | null.
 */
export function stepReel(r, dt, holding, random = Math.random) {
  if (r.done) return r;
  const g = rulesOf(r.id).game, top = 1 - g.zone;
  const t = r.t + dt;
  let vz = Math.max(-REEL.max, Math.min(REEL.max, r.vz + (holding ? REEL.up : -REEL.down) * dt)), zone = r.zone + vz * dt;
  if (zone < 0) { zone = 0; if (vz < 0) vz = -vz * REEL.bounce; }
  if (zone > top) { zone = top; if (vz > 0) vz = -vz * REEL.bounce; }
  let { target, turnAt, fish, dart } = r;
  if (t >= turnAt || Math.abs(target - fish) < 0.01) {
    // 새 자리: 가끔은 휙 내뺀다(지금 자리에서 먼 쪽 끝으로, 빠르게)
    dart = random() < g.dart;
    target = dart ? (fish < 0.5 ? 0.7 + random() * 0.25 : 0.05 + random() * 0.25) : 0.05 + random() * 0.9;
    turnAt = t + g.turn[0] + random() * (g.turn[1] - g.turn[0]);
  }
  const step = g.speed * (dart ? REEL.dart : 1) * dt, d = target - fish;
  fish += Math.abs(d) <= step ? d : Math.sign(d) * step;
  const inside = fish >= zone && fish <= zone + g.zone;
  const progress = Math.max(0, Math.min(1, r.progress + (inside ? g.gain : t < REEL.grace ? 0 : -g.loss) * dt));
  return { ...r, t, vz, zone, fish, target, turnAt, dart: !!dart, progress, inside, done: progress >= 1 ? 'caught' : progress <= 0 ? 'lost' : null };
}

/** 잡힌 크기(cm, 정수). 쓰레기는 null. */
export function fishLength(id, random = Math.random) {
  const c = FISH[id].cm;
  return c ? Math.round(c[0] + random() * (c[1] - c[0])) : null;
}
/** 낚시 기록 { [id]: { n: 잡은 수, best: 가장 큰 cm } }. */
export const fishLogOf = (s) => (s.fishLog && typeof s.fishLog === 'object' ? s.fishLog : {});
/** 낚은 것을 적는다. → { state, first: 처음 잡았다, best: 가장 크게 잡았다(두 번째부터) } */
export function logFish(s, id, cm) {
  const log = fishLogOf(s), old = log[id];
  const best = cm != null && (!old || old.best == null || cm > old.best);
  const entry = { n: (old ? old.n : 0) + 1, ...(cm != null ? { best: best ? cm : old.best } : {}) };
  return { state: { ...s, fishLog: { ...log, [id]: entry } }, first: !old, best: !!old && best };
}
/** 저장 확인: 아는 물고기만, 잡은 수는 1 이상, 크기는 0 보다 큰 수. */
export function isValidFishLog(l) {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return false;
  return Object.entries(l).every(([id, v]) => Object.hasOwn(FISH, id) && v && typeof v === 'object' && Number.isInteger(v.n) && v.n >= 1
    && (v.best === undefined || (Number.isFinite(v.best) && v.best > 0)));
}
