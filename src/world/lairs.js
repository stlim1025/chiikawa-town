import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO } from '../render/toon.js';
import { WORLD_HALF, ARENAS, ARENA_WALL, CANYON, canyonLen, doorAngle, canyonMouth } from '../core/layout.js';

/**
 * 보스 마당(core/layout.js 의 ARENAS — 구역 보스 셋 + 왕버섯 굴): 높은 지형에 둘러싸인 분지 + door 쪽으로 뻗은 좁은 협곡 하나.
 *  바위산 · 강가는 절벽 바위, 들판은 풀 언덕, 숲은 고목이 빙 둘러서고, 협곡 양옆도 같은 지형이다. 협곡 바닥엔 길과 이어진 흙길(땅 색으로 칠한다, core/layout.js 의 lairPathDist · 바위산은 원래 오솔길).
 *  카메라(남쪽) 쪽 덩어리는 셋씩 묶어 집처럼 내 캐릭터를 가리면 반투명해진다(village.js 의 fader). 나머지는 마을 정적 배칭이 한 덩어리로 묶는다.
 *  덩어리 아래로 촘촘한 울타리(장애물)를 둘러 사이로 못 지나가고, 협곡 끝(입구)에 이름표.
 * 구역 보스 자리는 분지 바닥 한 장(굴밭 흙 · 숲 이끼 · 강가 진흙)과 소품 몇 개도. 공유 난수를 쓰지 않는다(앞서 지은 숲 · 들판 자리가 바뀌지 않게).
 * ctx: { zones, obstacles, labels, fader }
 */
const around = (n, from = 0) => Array.from({ length: n }, (_, i) => from + (i / n) * Math.PI * 2);
/** 정해진 흔들림(0..1): 덩어리마다 크기 · 높이를 조금씩 다르게. */
const jitter = (i, k = 1) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
/** 바닥 원판(넓어서 기본 원기둥은 각이 져 보인다 · 셋이 나눠 쓴다). */
const DISC = new THREE.CylinderGeometry(1, 1, 1, 48).translate(0, 0.5, 0);
/** 바닥 한 장(그림자를 받는 납작한 원판). */
const floor = (g, color, r) => g.add(toonMesh(DISC, color, { position: [0, 0.004, 0], scale: [r, 0.02, r], outline: false, shadow: false, receive: true }));

const DECOR = {
  // 두더지 굴밭: 흙바닥에 구멍 난 두더지 흙무더기가 빙 둘러 있다
  bigmole(g, r) {
    floor(g, '#c9a97c', r);
    around(7, 0.3).forEach((a, i) => {
      const d = r * (i % 2 ? 0.55 : 0.78), x = Math.sin(a) * d, z = Math.cos(a) * d;
      g.add(toonMesh(GEO.sphere, '#9a7552', { position: [x, -0.04, z], scale: [0.58, 0.3, 0.58], outline: 0.03, receive: true }));
      g.add(toonMesh(GEO.cylinder, '#3e2a1d', { position: [x, 0.2, z], scale: [0.2, 0.06, 0.2], outline: false, shadow: false }));
    });
  },
  // 고목 빈터: 이끼 낀 바닥과 보라 버섯 무리
  elder(g, r) {
    floor(g, '#86b562', r);
    [[-2.6, 2.2], [-2.2, 2.7], [-3.0, 2.8]].forEach(([x, z], i) => {
      g.add(toonMesh(GEO.cylinder, '#f3e6cf', { position: [x, 0, z], scale: [0.06, 0.24 - i * 0.04, 0.06], outline: 0.015, shadow: false }));
      g.add(toonMesh(GEO.sphere, '#9a6ad0', { position: [x, 0.26 - i * 0.04, z], scale: [0.17, 0.1, 0.17], outline: 0.015, shadow: false }));
    });
  },
  // 강가 진흙밭: 진흙 바닥에 물웅덩이 셋, 조약돌과 분홍 조개껍데기
  bigcrab(g, r) {
    floor(g, '#b89c78', r);
    [[-2.4, -1.2, 1.1, 0.75], [2.6, 1.6, 0.9, 0.6], [-0.6, 3.4, 0.7, 0.5]].forEach(([x, z, sx, sz]) =>
      g.add(toonMesh(DISC, '#86d3f2', { position: [x, 0.012, z], scale: [sx, 0.02, sz], outline: false, shadow: false, receive: true })));
    around(6, 0.2).forEach((a, i) => {
      const d = r * (i % 2 ? 0.62 : 0.85), s = 0.18 + (i % 3) * 0.07;
      g.add(toonMesh(GEO.sphere, i % 2 ? '#b9b2a6' : '#a39a8f', { position: [Math.sin(a) * d, 0, Math.cos(a) * d], scale: [s * 1.3, s, s * 1.1], outline: 0.02 }));
    });
    [[1.4, -2.6], [-3.4, 1.8], [3.6, -0.4]].forEach(([x, z], i) =>
      g.add(toonMesh(GEO.cone, '#ffb6c9', { position: [x, 0.02, z], rotation: [Math.PI / 2, i * 1.3, 0], scale: [0.16, 0.2, 0.16], outline: 0.015, shadow: false })));
  }
};

/**
 * 둘러싼 지형: kind(rock 절벽 바위 · hill 풀 언덕 · tree 고목), 색 셋(번갈아), w 덩어리 반지름, h 높이 [낮게, 높게](카메라 쪽은 더 낮게),
 * cap 꼭대기 이끼(바위). 협곡 바닥 흙길은 따로 깔지 않고 땅 색으로 칠한다(core/layout.js 의 lairPathDist).
 */
const TERRAIN = {
  kingcap: { kind: 'rock', colors: ['#8f8174', '#a39486', '#b3a597'], w: 2.0, h: [3.8, 5.4] },
  bigcrab: { kind: 'rock', colors: ['#a39a8f', '#b9b2a6', '#8f8174'], w: 1.9, h: [2.8, 3.8], cap: '#86b85e' },
  bigmole: { kind: 'hill', colors: ['#95d488', '#aee08f', '#8fcd86'], bush: '#79c46c', w: 1.7, h: [1.3, 1.9] },
  elder: { kind: 'tree', colors: ['#4f9f58', '#5fb36e', '#6cc77e'], trunk: '#7a5136', w: 1.9, h: [4.6, 5.8] }
};
/** 카메라 쪽 덩어리를 이만큼씩 묶어 한 번에 반투명하게(그리기 횟수를 줄인다). */
const FADE_GROUP = 3;

/**
 * 마당 A 의 둘레 · 협곡 양옆 덩어리 자리(마당 가운데 기준): [{ x, z, ox · oz(길 · 마당에서 먼 바깥쪽 방향), k(굵기 배율), h(높이), low }].
 * 분지 남쪽(카메라 쪽) 둘레는 낮게(low — 숲은 고목 대신 덤불): 높으면 반투명해져도 화면을 덮어 싸움이 흐려 보였다. 협곡 양옆과 북 · 동 · 서는 높게(숲 협곡만 덤불).
 */
function massSpots(A, T) {
  const out = [], len = canyonLen(A), door = doorAngle(A), fx = Math.sin(door), fz = Math.cos(door);
  const height = (i) => T.h[0] + (T.h[1] - T.h[0]) * jitter(i, 2);
  // 분지 둘레: 협곡 자리만 비운다
  const R = A.r + ARENA_WALL + T.w * 0.75, gap = Math.asin(Math.min(1, (CANYON.half + T.w * 0.7) / R)), step = (T.w * 1.25) / R;
  const n = Math.max(3, Math.round((Math.PI * 2 - gap * 2) / step));
  for (let i = 0; i <= n; i++) {
    const a = door + gap + ((Math.PI * 2 - gap * 2) * i) / n, x = Math.sin(a) * R, z = Math.cos(a) * R;
    const low = z > A.r * 0.15;
    out.push({ x, z, ox: Math.sin(a), oz: Math.cos(a), k: 0.9 + jitter(i) * 0.3, h: height(i) * (low ? (T.kind === 'tree' ? 0.36 : 0.45) : 1), low });
  }
  // 협곡 양옆: 분지 가장자리에서 입구까지
  const side = CANYON.half + T.w * 0.75, from = A.r + ARENA_WALL + T.w * 0.4, to = A.r + ARENA_WALL + len;
  const m = Math.max(1, Math.round((to - from) / (T.w * 1.25)));
  for (const sd of [-1, 1]) {
    for (let j = 0; j <= m; j++) {
      const along = from + ((to - from) * j) / m, x = fx * along + fz * side * sd, z = fz * along - fx * side * sd, i = 100 + j * 2 + (sd > 0 ? 1 : 0);
      // 숲 협곡은 덤불 길(고목이면 큰 잎이 카메라 바로 앞을 덮는다). 동서로 뻗은 협곡(강가 · 왕버섯 굴)은 남쪽(카메라 쪽) 벽이
      // 카메라와 내 캐릭터 사이를 막아 들어가기 전부터 화면을 덮었다 → 분지 남쪽 둘레처럼 낮게
      const camSide = -fx * sd > 0.5, low = T.kind === 'tree' || camSide;
      out.push({ x, z, ox: fz * sd, oz: -fx * sd, k: 0.9 + jitter(i) * 0.3, h: height(i) * (T.kind === 'tree' ? 0.36 : camSide ? 0.45 : j === m ? 0.85 : 1), low });
    }
  }
  return out;
}

/** 덩어리 하나를 짓는다. mat(색) → 재질(반투명 묶음이면 그 묶음 전용, 아니면 함께 쓰는 재질), add(메시) → 그룹에 넣는다. */
function buildMass(T, s, i, mat, add) {
  const c = T.colors[i % T.colors.length], c2 = T.colors[(i + 1) % T.colors.length], w = T.w * s.k;
  const mesh = (geo, color, opts) => add(toonMesh(geo, null, { ...opts, material: mat(color) }));
  if (T.kind === 'hill') {
    // 풀 언덕: 작은 둔덕 셋 + 꼭대기 덤불(매끈하고 큰 둥근 언덕 하나는 봉분처럼 보였다).
    // 둔덕은 모두 길 · 마당에서 먼 바깥쪽(ox, oz)으로 밀어 두어, 안쪽 끝이 걸어 다니는 곳까지 오지 않는다(길가를 걸으면 캐릭터가 언덕에 파묻혔다)
    const c3 = T.colors[(i + 2) % T.colors.length], j = jitter(i, 5) - 0.5, tx = -s.oz, tz = s.ox; // tx · tz: 길을 따라가는 옆 방향
    const at = (out, along) => [s.x + s.ox * w * out + tx * w * along, s.z + s.oz * w * out + tz * w * along];
    const [mx, mz] = at(0.3, 0), [ax, az] = at(0.8, 0.5 + j * 0.2), [bx, bz] = at(0.75, -0.5 + j * 0.2);
    mesh(GEO.sphere, c, { position: [mx, -0.3, mz], scale: [w * 0.85, s.h + 0.3, w * 0.85], outline: 0.04, receive: true });
    mesh(GEO.sphere, c2, { position: [ax, -0.2, az], scale: [w * 0.6, s.h * 0.62 + 0.2, w * 0.6], outline: 0.035, receive: true });
    mesh(GEO.sphere, c3, { position: [bx, -0.2, bz], scale: [w * 0.55, s.h * 0.5 + 0.2, w * 0.55], outline: 0.035, receive: true });
    mesh(GEO.sphere, T.bush || c2, { position: [mx + tx * w * 0.2 * j, s.h * 0.9, mz + tz * w * 0.2 * j], scale: [w * 0.28, w * 0.2, w * 0.26], outline: 0.03 });
  } else if (T.kind === 'tree' && s.low) {
    // 남쪽 둘레: 고목 대신 낮은 덤불 둘
    mesh(GEO.sphere, c, { position: [s.x, s.h * 0.4, s.z], scale: [w * 1.05, s.h * 0.6, w], outline: 0.045 });
    mesh(GEO.sphere, c2, { position: [s.x + w * 0.6, s.h * 0.3, s.z + 0.3], scale: [w * 0.7, s.h * 0.45, w * 0.65], outline: 0.04 });
  } else if (T.kind === 'tree') {
    mesh(GEO.cylinder, T.trunk, { position: [s.x, 0, s.z], scale: [0.5 * s.k, s.h * 0.6, 0.5 * s.k], outline: 0.04 });
    mesh(GEO.sphere, c, { position: [s.x, s.h * 0.78, s.z], scale: [w, w * 0.85, w], outline: 0.05 });
    mesh(GEO.sphere, c2, { position: [s.x + w * 0.5, s.h * 0.62, s.z + 0.2], scale: [w * 0.7, w * 0.6, w * 0.7], outline: 0.045 });
  } else {
    mesh(GEO.sphereMid, c, { position: [s.x, 0, s.z], rotation: [0, i * 1.7, 0], scale: [w, s.h, w * 0.9], outline: 0.06, receive: true });
    mesh(GEO.sphereMid, c2, { position: [s.x + w * 0.55, 0, s.z + w * 0.35], rotation: [0, i * 0.9, 0], scale: [w * 0.55, s.h * 0.45, w * 0.5], outline: 0.045, receive: true });
    if (T.cap) mesh(GEO.sphere, T.cap, { position: [s.x, s.h * 0.92, s.z], scale: [w * 0.62, 0.28, w * 0.55], outline: 0.03 });
  }
}

/** 울타리(장애물): 덩어리 사이로 지나가지 못하게 분지 가장자리 밖 ARENA_WALL 과 협곡 양옆을 촘촘히 막는다(협곡 자리만 비운다). */
function fences(A, obstacles) {
  const R = A.r + ARENA_WALL, door = doorAngle(A), gap = Math.asin(Math.min(1, CANYON.half / R)), push = (x, z) => obstacles.push({ x: A.x + x, z: A.z + z, r: 0.78 });
  const n = Math.round((Math.PI * 2 - gap * 2) * R);
  for (let i = 0; i <= n; i++) { const a = door + gap + ((Math.PI * 2 - gap * 2) * i) / n; push(Math.sin(a) * R, Math.cos(a) * R); }
  const fx = Math.sin(door), fz = Math.cos(door), side = CANYON.half + 0.78, to = R + canyonLen(A);
  for (let along = R - 0.4; along <= to; along += 1) for (const sd of [-1, 1]) push(fx * along + fz * side * sd, fz * along - fx * side * sd);
}

/** 월드 동쪽 · 북쪽 끝(WORLD_HALF) 너머에 있는 마당(두더지 굴밭 · 왕버섯 굴): 입구만 맵 끝자락에 나와 있다. */
const beyondEdge = (A) => A.x + A.r + ARENA_WALL > WORLD_HALF || A.z - A.r - ARENA_WALL < -WORLD_HALF;
const MOUND = ['#aee08f', '#95d488'];

/**
 * 월드 끝 너머 마당 A 둘레의 큰 둔덕(월드 좌표, 아니면 빈 배열): [{ x, z, s(반지름), h(높이), wall(울타리로도 막는지) }].
 *  협곡 입구 양옆은 맵 끝 둔덕 · 절벽 바위만 하게 셋씩(outdoors.js 가 협곡 자리 맵 끝 둔덕 · 절벽을 비운다 · 그 자리 나무 · 꽃 · 바위도 이걸 보고 비운다),
 *  분지 뒤(협곡 반대쪽 반 바퀴 남짓)는 더 큰 언덕을 둘러 세워 맵 너머 빈 땅이 보이지 않게. 카메라 쪽(남쪽)은 낮게.
 */
export function edgeMounds(A) {
  if (!beyondEdge(A)) return [];
  const out = [], door = doorAngle(A), fx = Math.sin(door), fz = Math.cos(door), mouth = A.r + ARENA_WALL + canyonLen(A);
  [1.5, 6.5, 11.5].forEach((back, j) => {
    for (const sd of [-1, 1]) {
      const i = j * 2 + (sd > 0 ? 1 : 0), cam = -fx * sd > 0.5, along = mouth - back, side = 8.6 + jitter(i, 7) * 0.8;
      out.push({ x: A.x + fx * along + fz * side * sd, z: A.z + fz * along - fx * side * sd, s: 4.6 + jitter(i, 8) * 0.6, h: cam ? 2.2 + jitter(i, 9) * 0.4 : 3.4 + jitter(i, 9) * 1.2, wall: true });
    }
  });
  const from = door + 1.1, span = Math.PI * 2 - 2.2, n = Math.round(span / 0.44);
  for (let k = 0; k <= n; k++) {
    const a = from + (span * k) / n, D = A.r + ARENA_WALL + 8 + jitter(k, 10) * 1.5, cam = Math.cos(a) > 0.3;
    out.push({ x: A.x + Math.sin(a) * D, z: A.z + Math.cos(a) * D, s: 5.5 + jitter(k, 11), h: cam ? 2.2 + jitter(k, 12) * 0.5 : 4.2 + jitter(k, 12) * 1.8, wall: false });
  }
  return out;
}

export function buildLairs({ zones, obstacles, labels, fader }) {
  for (const A of ARENAS) {
    const T = TERRAIN[A.id], g = new THREE.Group();
    g.position.set(A.x, 0, A.z);
    fences(A, obstacles);
    // 둘러싼 지형: 카메라 쪽(남쪽) 덩어리는 FADE_GROUP 개씩 반투명 묶음으로
    const spots = massSpots(A, T), south = spots.filter((s) => s.z > -A.r * 0.25), groupOf = new Map();
    for (let i = 0; fader && i < south.length; i += FADE_GROUP) {
      const part = south.slice(i, i + FADE_GROUP), cx = part.reduce((a, s) => a + s.x, 0) / part.length, cz = part.reduce((a, s) => a + s.z, 0) / part.length;
      const f = fader(A.x + cx, A.z + cz, Math.max(...part.map((s) => Math.hypot(s.x - cx, s.z - cz))) + T.w);
      part.forEach((s) => groupOf.set(s, f));
    }
    spots.forEach((s, i) => {
      const f = groupOf.get(s);
      buildMass(T, s, i, f ? (c) => f.mat(c) : (c) => toonMaterial(c), (mesh) => { g.add(mesh); if (f) f.add(mesh); return mesh; });
      obstacles.push({ x: A.x + s.x, z: A.z + s.z, r: T.w * s.k * 0.8 });
    });
    // 월드 끝 너머 마당: 입구 양옆 · 분지 뒤 큰 둔덕(들판) · 절벽 바위(바위산 — 북쪽 끝 절벽처럼)
    edgeMounds(A).forEach((m, i) => {
      if (T.kind === 'rock') g.add(toonMesh(GEO.sphereMid, T.colors[i % T.colors.length], { position: [m.x - A.x, 0, m.z - A.z], rotation: [0, i * 1.3, 0], scale: [m.s * 1.05, m.h * 1.3, m.s * 0.95], outline: 0.06, receive: true }));
      else g.add(toonMesh(GEO.sphere, MOUND[i % 2], { position: [m.x - A.x, -0.8, m.z - A.z], scale: [m.s, m.h, m.s], outline: 0.06, receive: true }));
      if (m.wall) obstacles.push({ x: m.x, z: m.z, r: m.s * 0.95 });
    });
    if (DECOR[A.id]) DECOR[A.id](g, A.r);
    // 이름표: 협곡 입구 위(어디로 들어가는지 보이게, 마을폰 지도에도 뜬다). 왕버섯 굴은 이야기 속 비밀이라 없다
    if (A.place) { const m = canyonMouth(A, 0.6); labels.push({ x: m.x, y: 2.2, z: m.z, text: A.place }); }
    zones.add(g, A.x, A.z);
  }
}
