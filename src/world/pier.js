import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { PIER, SOUTH_SHORE } from '../core/layout.js';
import { buildDuckBoat } from './islandcast.js';
import { batchStatic } from '../render/batch.js';

/**
 * 남쪽 바닷가 선착장(사이드스토리 '수상한 섬 합숙'에서 섬으로 떠나는 곳): 뭍에서 바다로 뻗은 나무 판 · 기둥, 옆에 매어 둔 커다란 오리 배, '선착장' 명찰.
 * 마을 덩어리(world)가 아니라 scene 에 바로 달고, 다 지은 뒤 스스로 한 덩어리로 합친다(판 · 기둥 · 배 → 그리기 몇 번). → { spot: 모이는 자리(뭍 끝) }
 */
export function createPier(scene, village) {
  const g = new THREE.Group(), x = PIER.x;
  const m = (geo, c, o) => { const mesh = toonMesh(geo, c, o); g.add(mesh); return mesh; };
  for (let k = 0, z = SOUTH_SHORE - 1.2; z <= SOUTH_SHORE + PIER.len; z += 0.7, k++) m(GEO.box, k % 2 ? '#b38a5c' : '#c49a6c', { position: [x, 0.14, z], scale: [1.8, 0.12, 0.64], outline: 0.015, receive: true });
  [-1, 1].forEach((sd) => [1, 4, 7.5].forEach((dz) => m(GEO.cylinder, '#8a5a34', { position: [x + sd * 0.95, -1, SOUTH_SHORE + dz], scale: [0.1, 1.35, 0.1], outline: 0.012, shadow: false })));
  const boat = buildDuckBoat();
  boat.root.position.set(PIER.boat.x, 0, PIER.boat.z);
  g.add(boat.root);
  scene.add(g);
  batchStatic(g, { cell: 40 });
  village.labels.push({ x, y: 1.7, z: SOUTH_SHORE - 1.4, text: '선착장' });
  return { spot: { x, z: SOUTH_SHORE - 1.8 } };
}
