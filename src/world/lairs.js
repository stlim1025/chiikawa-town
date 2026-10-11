import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { BOSS_LAIRS } from '../core/layout.js';

/**
 * 구역 보스(core/bosses.js)의 자리 꾸미기: 바닥 한 장(굴밭 흙 · 숲 이끼 · 강가 진흙) + 둘레 소품 몇 개 + 뒤쪽 가장자리에 뜬 이름표.
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
  // 고목 빈터: 이끼 낀 바닥, 가장자리에 이끼 바위 다섯과 보라 버섯 무리
  elder(g, r, obstacles, L) {
    floor(g, '#86b562', r);
    around(5, 0.6).forEach((a, i) => {
      const x = Math.sin(a) * (r - 0.5), z = Math.cos(a) * (r - 0.5), s = i % 2 ? 0.6 : 0.75;
      g.add(toonMesh(GEO.sphere, '#8f8174', { position: [x, 0, z], scale: [s, s * 0.7, s * 0.9], outline: 0.04, receive: true }));
      g.add(toonMesh(GEO.sphere, '#86b85e', { position: [x, s * 0.58, z], scale: [s * 0.7, s * 0.2, s * 0.62], outline: 0.025 }));
      obstacles.push({ x: L.x + x, z: L.z + z, r: s * 0.85 });
    });
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

export function buildLairs({ zones, obstacles, labels }) {
  for (const [id, L] of Object.entries(BOSS_LAIRS)) {
    const g = new THREE.Group();
    g.position.set(L.x, 0, L.z);
    DECOR[id](g, L.r, obstacles, L);
    // 이름표(팻말 없이): 마당 뒤쪽(북쪽) 가장자리 위 — 남쪽에서 보는 카메라에 싸움을 가리지 않고 보이고, 마을폰 지도에도 뜬다
    labels.push({ x: L.x, y: 1.6, z: L.z - L.r, text: L.place });
    zones.add(g, L.x, L.z);
  }
}
