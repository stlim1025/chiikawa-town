import { hasTool } from './tools.js';

/**
 * 최종 보스 아노코(메인 이야기 2장 — 설계서 docs/Anoko-Final-Boss-2026-11-13.html)의 규칙. three 없이 쓰고 테스트한다.
 * 아노코가 숲에 사는 것은 원작을 따르고, 싸움 방식(공격 넷 · 앞쪽 솜털 방패) · 타고 다니기는 게임에서 정했다.
 *  · 앞쪽 솜털 방패: 아노코는 노리는 상대 쪽으로 천천히(ANOKO_TURN) 몸을 돌리고, 정면 좌우 arc 안에서 맞으면 솜털에 막혀 front 배만 들어간다.
 *    혼자면 늘 앞에서 치게 되어 싸움이 아주 길어지고, 친구와 가면 한 명을 보는 사이 나머지가 옆과 뒤를 친다.
 *  · 공격(world/monsters.js 의 ATK 와 같은 모양): 가까우면 앞발 할퀴기(combo), 화나면 이어서 꼬리 휩쓸기(sweep — 뒤쪽 반원, 앞은 안전),
 *    멀면 뛰어 덮치기(stomp)나 솜털 뭉치 고리(shoot), 마지막 단계에는 고리 두 겹. 모두 0.2초 늦게 반응해도 예고를 보고 피할 수 있다(tests/anoko.test.mjs).
 *  · 탈것: 아노코를 얻으면(2장을 끝내면) 집 앞 아노코에게 말을 걸어 자동차와 아노코 가운데 고른다(state.ride).
 */
/** 몸 크기(core/combat.js 의 MONSTERS.anoko.size 와 같다): 할퀴기가 닿는 거리 · 탄이 나오는 자리가 이만큼 바깥이다. */
export const ANOKO_SIZE = 1.4;
/** 앞쪽 솜털 방패: 정면에서 좌우 arc(라디안) 안에서 맞으면 피해가 front 배. */
export const ANOKO_SHIELD = { arc: Math.PI / 3, front: 1 / 3 };
/** 노리는 상대 쪽으로 도는 빠르기(라디안/초): 다른 보스(9 ~ 10)보다 느려서 재빨리 돌아 들어가면 잠깐 옆이나 뒤를 잡는다. */
export const ANOKO_TURN = 2.4;
/**
 * 공격 값(world/monsters.js 의 ATK 와 같은 모양, 거기서 그대로 가져다 쓴다).
 *  할퀴기는 예고를 늘리고 닿는 거리를 줄였다(붙어 있다가 0.2초 늦게 물러나도 첫 할퀴기 밖으로 나가게).
 *  꼬리 휩쓸기 반지름 3 · 예고 0.85초: 뒤에 붙어 있다가 0.25초 늦게 걸어도 빠져나간다.
 *  두 겹 고리는 첫 고리와 탄 수를 같게 두어 반 칸 비튼 둘째 고리 사이로도 옮겨 설 틈이 있게 했다.
 */
export const ANOKO_ATK = {
  claw: { range: 2.4, wind: 0.7, n: 3, gap: 0.32, reach: 0.9, cool: 1.4, rec: 0.8, kind: 'combo' },
  tail: { range: 99, wind: 0.85, radius: 3.0, cool: 1.4, rec: 1.0, kind: 'sweep' },
  leap: { range: 9, wind: 0.85, lock: 0.65, air: 0.95, radius: 2.4, height: 1.6, cool: 1.8, rec: 0.9, kind: 'stomp' },
  fluff: { range: 10, wind: 0.8, n: 10, spread: (Math.PI * 2) / 10, ring: true, speed: 4.2, r: 0.34, life: 2.6, color: '#fbf7ef', dmgK: 0.7, cool: 1.6, rec: 0.6, kind: 'shoot' },
  fluff2: { range: 10, wind: 0.7, n: 10, spread: (Math.PI * 2) / 10, ring: true, twice: 0.5, speed: 4.2, r: 0.32, life: 2.6, color: '#fbf7ef', dmgK: 0.7, cool: 1.5, rec: 0.5, kind: 'shoot' }
};

/** (hx, hz) 에서 친 피해 배율: 아노코(바라보는 방향 yaw — 앞이 (sin yaw, cos yaw))의 정면 좌우 arc 안이면 front, 아니면 1. */
export function frontGuard(yaw, mx, mz, hx, hz) {
  const dx = hx - mx, dz = hz - mz, d = Math.hypot(dx, dz);
  if (d < 1e-6) return 1;
  const cos = (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d;
  return cos >= Math.cos(ANOKO_SHIELD.arc) - 1e-9 ? ANOKO_SHIELD.front : 1;
}

/** 꼬리 휩쓸기에 맞는지: 아노코 뒤쪽 반원(앞쪽 반원은 안전) 안, 반지름 + 내 몸(me). */
export function inSweep(yaw, mx, mz, px, pz, radius, me = 0.32) {
  const dx = px - mx, dz = pz - mz;
  return Math.hypot(dx, dz) < radius + me && dx * Math.sin(yaw) + dz * Math.cos(yaw) < 0;
}

/** 아노코를 얻었는지: 메인 이야기 2장(퀘스트 anoko)을 끝냈다(quests.js 를 불러오지 않는다 — combat.js 와 서로 부르는 고리를 피한다). */
const tamed = (state) => !!(state.quests && state.quests.anoko && state.quests.anoko.done);

/**
 * 탈것 버튼(C 키)이 탈 것: 아노코를 얻었으면 집 앞에서 자동차를 골랐고 자동차가 있을 때만 자동차, 그 밖에는 아노코.
 * 아노코가 없으면 자동차가 있을 때 자동차, 둘 다 없으면 null.
 */
export function rideKind(state) {
  const car = hasTool(state, 'car');
  if (tamed(state)) return state.ride === 'car' && car ? 'car' : 'anoko';
  return car ? 'car' : null;
}

/** 저장된 탈것 고르기 값이 맞는지(없거나 'car' · 'anoko'). */
export const isValidRide = (v) => v === undefined || v === 'car' || v === 'anoko';
