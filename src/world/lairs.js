import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { ARENAS, ARENA_WALL, ARENA_DOOR, doorAngle } from '../core/layout.js';

/**
 * 보스 마당(core/layout.js 의 ARENAS — 구역 보스 셋 + 왕버섯 굴): 둘레에 벽(들판 풀 둔덕 · 숲 덤불 · 강가 · 바위산 바위)을 두르고 길 쪽(door)으로 입구 하나.
 * 구역 보스 자리는 바닥 한 장(굴밭 흙 · 숲 이끼 · 강가 진흙) + 소품 몇 개 + 뒤쪽 가장자리에 뜬 이름표도. 벽은 낮게(남쪽에서 보는 카메라에 싸움을 가리지 않게).
 * 난수를 쓰지 않고 정해진 각도에 놓는다(앞서 지은 숲 · 들판의 난수 순서를 흐트러뜨리지 않게). 부품은 마을 정적 배칭(batchStatic)이 한 덩어리로 묶는다.
 * ctx: { zones, obstacles, labels }
 */
const around = (n, from = 0) => Array.from({ length: n }, (_, i) => from + (i / n) * Math.PI * 2);
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

/** 마당 벽 생김새: 색 둘(번갈아) · 조각 크기 · 높이. */
const WALL = {
  bigmole: { colors: ['#95d488', '#aee08f'], scale: [0.85, 0.7, 0.85], y: -0.15 }, // 풀 둔덕
  elder: { colors: ['#4f9f58', '#5fb36e'], scale: [0.85, 0.8, 0.85], y: 0 }, // 덤불
  bigcrab: { colors: ['#a39a8f', '#b9b2a6'], scale: [0.8, 0.6, 0.75], y: 0 }, // 강가 바위
  kingcap: { colors: ['#8f8174', '#a39486'], scale: [0.95, 0.8, 0.9], y: 0 } // 바위산 바위
};
/** 둘레 벽: 마당 가장자리 밖 ARENA_WALL 에 조각을 촘촘히(사이로 못 지나가게), 입구(door 쪽 폭 ARENA_DOOR × 2)만 비우고 양옆은 큰 기둥. */
function walls(g, A, obstacles) {
  const W = WALL[A.id], R = A.r + ARENA_WALL, door = doorAngle(A), half = Math.asin(Math.min(1, ARENA_DOOR / R)), step = 1.0 / R;
  const from = door + half, to = door + Math.PI * 2 - half;
  const n = Math.max(2, Math.round((to - from) / step));
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n, x = Math.sin(a) * R, z = Math.cos(a) * R, k = i === 0 || i === n ? 1.25 : 1 + (i % 3) * 0.08;
    g.add(toonMesh(GEO.sphere, W.colors[i % 2], { position: [x, W.y, z], scale: W.scale.map((v) => v * k), outline: 0.035, receive: true }));
    obstacles.push({ x: A.x + x, z: A.z + z, r: 0.78 * k });
  }
}

export function buildLairs({ zones, obstacles, labels }) {
  for (const A of ARENAS) {
    const g = new THREE.Group();
    g.position.set(A.x, 0, A.z);
    walls(g, A, obstacles);
    if (DECOR[A.id]) DECOR[A.id](g, A.r);
    // 이름표(팻말 없이): 마당 뒤쪽(북쪽) 가장자리 위 — 남쪽에서 보는 카메라에 싸움을 가리지 않고 보이고, 마을폰 지도에도 뜬다. 왕버섯 굴은 이야기 속 비밀이라 없다
    if (A.place) labels.push({ x: A.x, y: 1.6, z: A.z - A.r, text: A.place });
    zones.add(g, A.x, A.z);
  }
}
