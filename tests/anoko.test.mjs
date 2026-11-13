import test from 'node:test';
import assert from 'node:assert/strict';
import { ANOKO_SIZE, ANOKO_SHIELD, ANOKO_TURN, ANOKO_ATK, frontGuard, inSweep, rideKind, isValidRide } from '../src/core/anoko.js';
import { MONSTERS, MONSTER_ORDER, WEAPONS } from '../src/core/combat.js';
import { bossSeen } from '../src/core/bosses.js';
import { ANOKO_LAIR, ARENAS, BOSS_LAIRS, ROADS, ARCADE, WORLD_HALF, arenaAt, canyonMouth, lairReach } from '../src/core/layout.js';

const SPEED = 3.2, ME = 0.32, REACTS = [0.15, 0.2, 0.25];
const close = (a, b) => Math.abs(a - b) < 1e-9;

test('frontGuard: 정면 60도 안은 1/3, 옆과 뒤는 그대로', () => {
  assert.ok(close(ANOKO_SHIELD.front, 1 / 3));
  assert.ok(close(ANOKO_SHIELD.arc, Math.PI / 3));
  assert.ok(close(frontGuard(0, 0, 0, 0, 2), 1 / 3), '바로 앞');
  assert.ok(close(frontGuard(0, 0, 0, 1.6, 1.0), 1 / 3), '앞 58도쯤');
  assert.equal(frontGuard(0, 0, 0, 2, 0), 1, '옆');
  assert.equal(frontGuard(0, 0, 0, 0, -2), 1, '뒤');
  assert.ok(close(frontGuard(Math.PI / 2, 5, 5, 7, 5), 1 / 3), '오른쪽(+x)을 보면 +x 쪽이 앞');
  assert.ok(ANOKO_TURN > 0 && ANOKO_TURN < 9, '다른 보스(9 ~ 10)보다 천천히 돈다');
});

test('inSweep: 꼬리 휩쓸기는 뒤쪽 반원만, 앞은 안전', () => {
  assert.equal(inSweep(0, 0, 0, 0, -2, 3.2), true);
  assert.equal(inSweep(0, 0, 0, 2, -0.1, 3.2), true);
  assert.equal(inSweep(0, 0, 0, 0, 2, 3.2), false);
  assert.equal(inSweep(0, 0, 0, 0, -3.6, 3.2), false);
});

test('rideKind: 탈것 버튼이 탈 것', () => {
  const car = { owned: ['car'], light: 'off' }, none = { owned: [], light: 'off' }, tamed = { anoko: { step: 4, base: 0, done: 53 } };
  assert.equal(rideKind({ tools: none, quests: {} }), null);
  assert.equal(rideKind({ tools: car, quests: {} }), 'car');
  assert.equal(rideKind({ tools: none, quests: tamed }), 'anoko');
  assert.equal(rideKind({ tools: car, quests: tamed, ride: 'car' }), 'car');
  assert.equal(rideKind({ tools: car, quests: tamed, ride: 'anoko' }), 'anoko');
  assert.equal(rideKind({ tools: car, quests: tamed }), 'anoko', '고르기 전에는 새로 얻은 아노코');
  assert.equal(rideKind({ tools: none, quests: tamed, ride: 'car' }), 'anoko', '자동차가 없으면 아노코');
});

test('isValidRide: car, anoko, 없음만', () => {
  for (const v of ['car', 'anoko', undefined]) assert.equal(isValidRide(v), true, String(v));
  for (const v of ['bike', 1, null]) assert.equal(isValidRide(v), false, String(v));
});

/** 앞발 할퀴기(combo): 붙어 있다가(d0) 예고가 뜨고 react 초 뒤부터 뒤로 걷는다. 매번 아노코는 0.32 까지 다가와 할퀴고, 몸 + reach 안이면 맞는다(world/monsters.js 의 combo). */
function clawEscapes(react, d0) {
  const A = ANOKO_ATK.claw, dt = 1 / 240;
  let d = d0;
  for (let t = 0; t < A.wind; t += dt) if (t >= react) d += SPEED * dt;
  for (let i = 0; i < A.n; i++) {
    d -= Math.min(0.32, Math.max(0, d - ANOKO_SIZE - 0.3));
    if (d < ANOKO_SIZE + A.reach) return false;
    d += SPEED * A.gap;
  }
  return true;
}
/** 꼬리 휩쓸기(sweep): 아노코 뒤 d0 에서 예고 뒤 react 초부터 바깥으로 걸어, 예고가 끝날 때 뒤쪽 반원 밖이면 피한 것. */
function tailEscapes(react, d0) {
  const A = ANOKO_ATK.tail, d = d0 + Math.max(0, A.wind - react) * SPEED;
  return !inSweep(0, 0, 0, 0, -d, A.radius);
}
/** 뛰어 덮치기(stomp): 곧장 달아나는 나를 wind × lock 에 겨눠 굳히고, 착지(wind + air) 때 그 자리 반지름 + 내 몸 밖이면 피한 것. */
function leapEscapes(react, d0) {
  const A = ANOKO_ATK.leap, at = (t) => d0 + Math.max(0, t - react) * SPEED;
  return Math.abs(at(A.wind + A.air) - at(A.wind * A.lock)) >= A.radius + ME;
}
/**
 * 솜털 고리(shoot, ring): 예고를 보고 react 초 뒤부터 옆으로 걷던 나에게 하나가 곧장 겨눠 날아온다(탄은 몸 + 0.15 에서 나온다).
 * 고리가 내 거리까지 오는 동안 옆으로 움직여 틈 한가운데(gap/2)에 멈춘다 — 그때 양쪽 탄과 r + 내 몸보다 멀면 피한 것.
 * 두 겹(twice)은 반 칸 비틀어 와서 내가 멈춘 틈 한가운데를 노린다: 그 고리를 보고 react 초 뒤에 다시 반 칸 옮긴다.
 */
function ringEscapes(A, react, d) {
  const gap = d * A.spread, clear = A.r + ME, t1 = (d - ANOKO_SIZE - 0.15) / A.speed;
  if (Math.min(gap / 2, t1 * SPEED) < clear) return false;
  if (!A.twice) return true;
  return Math.min(gap / 2, Math.max(0, t1 - react) * SPEED) >= clear;
}

test('앞발 할퀴기: 0.2초(± 0.05) 늦게 물러나도 피한다', () => {
  for (const r of REACTS) for (const d0 of [ANOKO_SIZE + 0.3, ANOKO_ATK.claw.range]) assert.ok(clawEscapes(r, d0), `반응 ${r}, 거리 ${d0}`);
  assert.ok(!clawEscapes(99, ANOKO_SIZE + 0.3), '가만히 있으면 맞는다');
});

test('꼬리 휩쓸기: 0.2초(± 0.05) 늦게 바깥으로 걸어도 피한다', () => {
  for (const r of REACTS) for (const d0 of [ANOKO_SIZE + 0.3, 2.2, 2.6]) assert.ok(tailEscapes(r, d0), `반응 ${r}, 거리 ${d0}`);
  assert.ok(!tailEscapes(99, 2), '가만히 있으면 맞는다');
});

test('뛰어 덮치기: 0.2초(± 0.05) 늦게 달아나도 피한다', () => {
  for (const r of REACTS) for (const d0 of [0.8, 3, 6]) assert.ok(leapEscapes(r, d0), `반응 ${r}, 거리 ${d0}`);
  assert.ok(!leapEscapes(99, 3), '가만히 있으면 맞는다');
});

test('솜털 뭉치 날리기: 0.2초(± 0.05) 늦어도 틈으로 피한다(두 겹은 3.5 이상 떨어져서)', () => {
  for (const r of REACTS) {
    for (const d of [3, 4, 6]) assert.ok(ringEscapes(ANOKO_ATK.fluff, r, d), `한 겹, 반응 ${r}, 거리 ${d}`);
    for (const d of [3.5, 4, 6]) assert.ok(ringEscapes(ANOKO_ATK.fluff2, r, d), `두 겹, 반응 ${r}, 거리 ${d}`);
  }
  assert.ok(ANOKO_ATK.fluff2.twice > 0 && ANOKO_ATK.fluff2.ring && ANOKO_ATK.fluff.ring);
});

test('아노코: 최종 보스 항목(전리품 없음, 도감 맨 끝)', () => {
  const M = MONSTERS.anoko;
  assert.ok(M && M.boss && M.attack === 'boss' && M.region === 'boss');
  assert.equal(M.hp, 220);
  assert.equal(M.dmg, 18);
  assert.equal(M.size, ANOKO_SIZE);
  assert.equal(M.drop, undefined);
  assert.equal(MONSTER_ORDER[MONSTER_ORDER.length - 1], 'anoko');
  assert.equal(bossSeen({ story: { anokoSeen: 53 } }, 'anoko'), true);
  assert.equal(bossSeen({ story: {} }, 'anoko'), false);
});

/** 시드 난수(같은 시드면 같은 싸움). */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/**
 * 아노코와의 싸움 모형(설계서 5절). 나는 반짝 검, 기운 stamina, 먹을 것 없이 붙어서 휘두른다.
 *  · 아노코가 나를 노리면 앞에서 쳐서 솜털 방패만큼만 들어가고, 공격 뒤 쉬는 틈(rec)에만 옆으로 돌아(AROUND 초 걸어서) 그대로 들어간다.
 *    멀리서 하는 공격(뛰어 덮치기 · 솜털 고리)을 피해 달아났으면 다시 붙는 데 1.2초(4칸쯤) 걸린다.
 *    예고(wind)와 공격(act) 동안은 피하느라 휘두르지 못한다. 공격 하나는 다 피하지만, 부하 공격이 아노코 공격과 0.5초 안으로 겹치면 아노코 쪽을 맞는다.
 *  · 친구(힘 allies)는 1.05초마다 친다. 칠 때마다 30% 로 아노코가 그 친구를 노린다(그 친구는 앞에서 쳐서 방패, 나머지는 그대로). 노린 친구는 공격마다 한 대를 맞고,
 *    체력 40 이 다 떨어지면 쓰러진다 — 나는 2초 동안 깨우고(그동안 못 친다) 12 로 일어난다.
 *  · 부하는 처음 4초, 그 뒤 9초(화나면 7초)마다 나오고(마지막 단계에는 둘), 3초마다 나를 공격한다. 혼자면 12초, 친구가 있으면 6초 만에 쓰러뜨린다.
 * → { won, stamina, hpLeft(비율), time }
 */
function simulateFight({ allies = [], seed = 1, stamina = 100, endless = false }) {
  const M = MONSTERS.anoko, A = ANOKO_ATK, W = WEAPONS.star, rnd = rng(seed), dt = 0.05, H = M.hp;
  let t = 0, hp = H, st = stamina, target = 'me', swingCd = 0, wake = 0, summonT = 4, back = 0;
  const team = allies.map((power, i) => ({ i, power, hp: 40, down: false, cd: 0.3 + i * 0.5 }));
  const minions = [];
  let phase = 'cool', left = 1.2, atk = null, queued = null, recT = 0;
  const AROUND = (ANOKO_SHIELD.arc * (ANOKO_SIZE + 0.4)) / SPEED; // 앞에서 옆까지 몸을 돌아 걷는 시간
  const rage = () => (hp <= H * 0.5 ? 2 : hp <= H * 0.75 ? 1 : 0);
  const pick = () => {
    if (queued) { const q = queued; queued = null; return q; }
    if (target !== 'me') return A.claw;
    const r = rnd();
    return r < 0.6 ? A.claw : r < 0.8 ? A.leap : rage() >= 2 ? A.fluff2 : A.fluff;
  };
  const actLen = (a) => (a.kind === 'combo' ? a.n * a.gap : a.kind === 'stomp' ? a.air : 0);
  const land = () => { // 아노코 공격이 닿는 순간
    const dmg = Math.round(M.dmg * (atk.dmgK || 1));
    if (target === 'me') {
      if (minions.some((m) => Math.abs(m.next) < 0.5 || m.since < 0.5)) st -= dmg; // 부하와 겹쳤다
    } else {
      const a = team[target];
      a.hp -= dmg;
      if (a.hp <= 0) { a.down = true; target = 'me'; }
    }
    if (atk === A.claw && rage() >= 1 && target === 'me') queued = A.tail;
  };
  while (hp > 0 && (endless || st > 0) && t < 600) {
    t += dt;
    // 아노코
    left -= dt;
    if (left <= 0) {
      const k = rage() >= 2 ? 0.7 : 1;
      if (phase === 'cool') { atk = pick(); phase = 'wind'; left = atk.wind; }
      else if (phase === 'wind') { phase = 'act'; left = actLen(atk); }
      else if (phase === 'act') { if (target === 'me' && (atk.kind === 'stomp' || atk.kind === 'shoot')) back = 1.2; land(); phase = 'rec'; recT = 0; left = queued ? 0.15 : atk.rec * k; }
      else { phase = 'cool'; left = queued ? 0 : atk.cool * k; }
    }
    // 부하
    summonT -= dt;
    if (summonT <= 0) { summonT = rage() >= 1 ? 7 : 9; for (let n = rage() >= 2 ? 2 : 1; n > 0; n--) minions.push({ life: allies.length ? 6 : 12, next: 1.5, since: 9 }); }
    for (const m of minions) { m.life -= dt; m.next -= dt; m.since += dt; if (m.next <= 0) { m.next = 3; m.since = 0; } }
    for (let i = minions.length - 1; i >= 0; i--) if (minions[i].life <= 0) minions.splice(i, 1);
    // 나
    const downed = team.find((a) => a.down);
    if (wake > 0) { wake -= dt; if (wake <= 0 && downed) { downed.down = false; downed.hp = 12; } }
    else if (downed) wake = 2;
    else {
      swingCd -= dt;
      if (back > 0) back -= dt;
      if (phase === 'rec') recT += dt;
      const dodging = back > 0 || (target === 'me' && (phase === 'wind' || phase === 'act' || (phase === 'rec' && recT < AROUND)));
      if (swingCd <= 0 && !dodging) {
        swingCd = W.cool;
        hp -= W.dmg * (target === 'me' && phase !== 'rec' ? ANOKO_SHIELD.front : 1);
      }
    }
    // 친구들
    for (const a of team) {
      if (a.down) continue;
      a.cd -= dt;
      if (a.cd > 0) continue;
      a.cd = 1.05;
      hp -= a.power * (target === a.i ? ANOKO_SHIELD.front : 1);
      if (target !== a.i && rnd() < 0.3) target = a.i;
    }
  }
  return { won: hp <= 0, stamina: Math.max(0, st), hpLeft: Math.max(0, hp) / H, time: t };
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

test('균형: 혼자면 체력 절반쯤에서 기운이 바닥나고, 친구 둘이면 기운 30 넘게 남기고 이긴다', () => {
  const solo = SEEDS.map((seed) => simulateFight({ seed }));
  const left = median(solo.map((r) => r.hpLeft));
  assert.ok(left >= 0.35 && left <= 0.65, `혼자: 기운이 바닥날 때 아노코 체력 ${(left * 100).toFixed(0)}% 남음`);
  const party = SEEDS.map((seed) => simulateFight({ seed, allies: [2, 1] }));
  assert.ok(median(party.map((r) => (r.won ? 1 : 0))) === 1, '친구 둘이면 이긴다');
  const st = median(party.map((r) => r.stamina));
  assert.ok(st > 30, `친구 둘: 남은 기운 ${st}`);
  const soloTime = median(SEEDS.map((seed) => simulateFight({ seed, endless: true }).time));
  const partyTime = median(party.map((r) => r.time));
  assert.ok(soloTime >= partyTime * 3, `혼자 ${soloTime.toFixed(0)}초, 친구 둘 ${partyTime.toFixed(0)}초`);
});

/** 선분 (a → b) 와 점 p 의 거리. */
const segDist = (p, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0; return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)); };
/** 길(ROADS) 위에서 p 에 가장 가까운 점. */
const nearestRoad = (p) => {
  let best = null, bd = Infinity;
  for (const r of ROADS) for (let k = 1; k < r.pts.length; k++) {
    const a = { x: r.pts[k - 1][0], z: r.pts[k - 1][1] }, b = { x: r.pts[k][0], z: r.pts[k][1] }, dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
    const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0, q = { x: a.x + dx * t, z: a.z + dz * t }, d = Math.hypot(p.x - q.x, p.z - q.z);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
};

test('아노코 마당: 서쪽 월드 끝 너머, 고목 거인과 40 넘게, 오데 빈터와 게임센터와 10 넘게', () => {
  const A = ARENAS.find((a) => a.id === 'anoko');
  assert.ok(A && A === ARENAS[ARENAS.length - 1], 'ARENAS 맨 끝');
  assert.equal(A.x, ANOKO_LAIR.x);
  assert.equal(arenaAt(ANOKO_LAIR.x, ANOKO_LAIR.z).id, 'anoko');
  assert.ok(!('anoko' in BOSS_LAIRS), '구역 보스가 아니다');
  assert.ok(ANOKO_LAIR.x + ANOKO_LAIR.r < -WORLD_HALF, '월드 서쪽 끝 너머');
  assert.ok(Math.hypot(ANOKO_LAIR.x - BOSS_LAIRS.elder.x, ANOKO_LAIR.z - BOSS_LAIRS.elder.z) > 40, '고목 거인 마당과 멀리');
  const mouth = canyonMouth(A), road = nearestRoad(mouth);
  assert.ok(Math.hypot(mouth.x - BOSS_LAIRS.elder.door.x, mouth.z - BOSS_LAIRS.elder.door.z) > 20, '고목 거인 입구와 떨어진 입구');
  assert.ok(Math.hypot(road.x - BOSS_LAIRS.elder.door.x, road.z - BOSS_LAIRS.elder.door.z) > 15, '흙길이 고목 거인 입구 쪽 길로 가지 않는다');
  for (const [name, p] of [['오데 빈터', { x: -40, z: 22 }], ['게임센터', ARCADE]]) assert.ok(segDist(p, mouth, road) >= 10, `${name}와 흙길이 10 넘게`);
  assert.ok(lairReach(ANOKO_LAIR.x, ANOKO_LAIR.z) && lairReach(mouth.x - 1, mouth.z), '마당과 협곡은 걸어 들어간다');
  assert.ok(!lairReach(ANOKO_LAIR.x, ANOKO_LAIR.z + 14), '마당 밖 월드 끝 너머는 못 간다');
});
