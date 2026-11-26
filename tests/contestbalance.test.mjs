import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/core/contest.js';
import { pickFish, fishLength, startReel, stepReel, rulesOf, BITE_WAIT, FISH } from '../src/core/fishing.js';
import { startPull, chargePull, releasePull, advanceWeed } from '../src/core/weeding.js';
import { NOVICE } from '../src/core/license.js';

/** 시드 고정 난수. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

/** 사람: delay 초 늦게 본다. k 는 끌어올리기에서 칸의 기세를 보고 미리 떼는 정도, every 는 누를지 정하는 틈(tests/fishing.test.mjs 와 같다). antic 은 풀 게이지의 늦음을 미리 메우는 정도, walk 는 풀 사이를 오가는 초. */
export const PEOPLE = {
  usual: { delay: 0.2, k: 0.12, every: 0.08, antic: 0.8, jitter: 0.06, walk: 3.0 },
  skilled: { delay: 0.12, k: 0.22, every: 0.05, antic: 0.95, jitter: 0.04, walk: 2.6 }
};

/** 끌어올리기 놀이 한 번을 늦게 보는 사람으로 → { caught, time }. */
function reel(id, h, rnd) {
  const g = rulesOf(id).game;
  let r = startReel(id, rnd), hold = false, acc = 0;
  const seen = [];
  while (!r.done && r.t < 60) {
    seen.push(r);
    const v = seen[Math.max(0, seen.length - 1 - Math.round(h.delay * 60))];
    acc += 1 / 60;
    if (acc >= h.every) { acc = 0; hold = v.fish - (v.zone + g.zone / 2) - h.k * v.vz > 0; }
    r = stepReel(r, 1 / 60, hold, rnd);
  }
  return { caught: r.done === 'caught', time: r.t };
}
/** 3분 낚시(마을 연못 한낮): 던지기 0.6초 → 입질 → 반응(늦음 + 0.25초 + 0 ~ 0.2초)이 누를 틈 안이면 끌어올리기 → 낚으면 1초, 놓치면 0.5초 쉬고 다음. */
export function fishRound(h, rnd) {
  let t = 0, round = C.newRound('fish');
  for (;;) {
    t += 0.6 + BITE_WAIT[0] + rnd() * (BITE_WAIT[1] - BITE_WAIT[0]);
    if (t >= C.ROUND_SECONDS) break;
    const id = pickFish('pond', 12, rnd, 'sunny');
    if (FISH[id].junk) { t += 1; if (t < C.ROUND_SECONDS) round = C.roundCatch(round, { junk: true }); continue; }
    const react = h.delay + 0.25 + rnd() * 0.2;
    t += react;
    if (react > rulesOf(id).window) { t += 0.5; continue; } // 놓쳤다
    const r = reel(id, h, rnd);
    t += r.time;
    if (t >= C.ROUND_SECONDS) break;
    if (r.caught) { round = C.roundCatch(round, { cm: fishLength(id, rnd) }); t += 1; } else t += 0.5;
  }
  return round;
}
/** 3분 풀 뽑기(잡초): 풀 사이 걷기 h.walk초(마을에 흩어져 있다 — 익숙하면 다음 풀로 곧장 간다), 잡고 0.3초, 게이지를 늦게 보고 가운데쯤에서 떼기, 다 뽑고 0.4초. */
export function weedRound(h, grade, rnd) {
  let t = 0, round = C.newRound('weed');
  for (;;) {
    t += h.walk + 0.3;
    let progress = null, done = false;
    while (!done) {
      let p = startPull('weed', { grade, random: rnd });
      const speed = 1 / p.chargeTime, center = (p.greenFrom + p.greenTo) / 2;
      // 늦게 본 힘이 (가운데 − 늦음을 메운 만큼)에 오면 뗀다: 실제로는 delay 만큼 더 찬 뒤에 떨어진다
      const lead = speed * h.delay * h.antic, err = gauss(rnd) * speed * h.jitter;
      const release = Math.max(0.05, (center - lead) / speed + h.delay + err / speed);
      p = chargePull(p, release);
      t += release;
      const res = releasePull(p);
      progress = advanceWeed(progress, 'weed', res);
      done = progress.done;
      if (res === 'none') t += 0.2;
    }
    if (t >= C.ROUND_SECONDS) break;
    round = C.roundPull(round, progress.final);
    t += 0.4;
  }
  return round;
}

/** n 번 대회: 사람 한 판 점수와 친구 기록으로 등수를 매긴다 → { top3, win, mean }. */
export function compete(kind, h, { grade = NOVICE, n = 200, seed = 7 } = {}) {
  const rnd = seeded(seed);
  let top3 = 0, win = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const day = 3 + i * 7;
    const me = kind === 'fish' ? fishRound(h, rnd) : weedRound(h, grade, rnd);
    sum += me.s;
    const board = C.rankBoard([{ who: 'me', s: me.s, t: me.t }, ...C.CONTEST_FRIENDS.map((who) => ({ who, ...C.npcRecord('2026-10-01', day, kind, who, grade) }))]);
    const rank = board.find((e) => e.who === 'me').rank;
    if (rank <= 3) top3++;
    if (rank === 1) win++;
  }
  return { top3: top3 / n, win: win / n, mean: sum / n };
}
const pct = (r) => `3등 안 ${(r.top3 * 100).toFixed(0)}%, 1등 ${(r.win * 100).toFixed(0)}%, 평균 ${r.mean.toFixed(1)}`;

test('낚시 대회: 한 판만 한 보통 사람은 절반쯤 3등 안, 1등은 다섯에 하나쯤, 익숙하면 1등이 잦다', () => {
  const u = compete('fish', PEOPLE.usual), s = compete('fish', PEOPLE.skilled);
  assert.ok(u.top3 >= 0.35 && u.top3 <= 0.65 && u.win >= 0.1 && u.win <= 0.3, `보통: ${pct(u)}`);
  assert.ok(s.win >= 0.4, `익숙: ${pct(s)}`);
});

test('풀 뽑기 시합: 견습과 3급 모두 보통 사람은 절반쯤 3등 안, 익숙하면 1등이 잦다', () => {
  for (const grade of [NOVICE, 3]) {
    const u = compete('weed', PEOPLE.usual, { grade }), s = compete('weed', PEOPLE.skilled, { grade });
    assert.ok(u.top3 >= 0.35 && u.top3 <= 0.65 && u.win >= 0.1 && u.win <= 0.3, `${grade}급 보통: ${pct(u)}`);
    assert.ok(s.win >= 0.4, `${grade}급 익숙: ${pct(s)}`);
  }
});

test('친구끼리: 1등이 랏코에 몰리지 않고 셋 이상이 1등을 해 본다', () => {
  for (const kind of ['fish', 'weed']) {
    const wins = {};
    for (let i = 0; i < 200; i++) {
      const day = 3 + i * 7;
      const board = C.rankBoard(C.CONTEST_FRIENDS.map((who) => ({ who, ...C.npcRecord('2026-10-01', day, kind, who, NOVICE) })));
      for (const e of board) if (e.rank === 1) wins[e.who] = (wins[e.who] || 0) + 1;
    }
    assert.ok((wins.rakko || 0) / 200 < 0.5, `${kind}: 랏코 ${wins.rakko}`);
    assert.ok(Object.keys(wins).length >= 3, `${kind}: ${JSON.stringify(wins)}`);
  }
});

test('친구 기록은 늘 0 이상 상한 이하 정수, 풀 가르는 값은 점수의 절반 이하', () => {
  for (const kind of ['fish', 'weed']) for (const who of C.CONTEST_FRIENDS) for (const grade of [NOVICE, 5, 4, 3, 2, 1]) for (let day = 3; day < 300; day += 7) {
    const r = C.npcRecord('2026-10-01', day, kind, who, grade);
    assert.ok(Number.isInteger(r.s) && r.s >= 0 && r.s <= C.SCORE_CAP[kind], `${kind} ${who} ${r.s}`);
    if (kind === 'weed') assert.ok(r.t <= r.s / 2);
  }
});
