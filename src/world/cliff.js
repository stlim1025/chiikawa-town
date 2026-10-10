import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO } from '../render/toon.js';
import { CLIFF, SOUTH_SHORE } from '../core/layout.js';

/**
 * 마을 밖 남쪽, 바다가 보이는 절벽(잠옷 밤나들이에서 셋이 통나무에 앉아 별똥별을 보는 곳).
 * 땅 높이는 그대로 두고, 절벽 앞 바다를 아래로 낮춘 작은 만(灣)을 바위 절벽이 둘러싼다 → 해안 끝이 바다를 내려다보는 절벽 위가 된다.
 * (바깥 바다는 outdoors.js 가 만 자리를 비우고 깐다.) 가장자리 가까이에 통나무 하나, '바다 절벽' 명찰.
 */
export function createCliff(scene, village) {
  const g = new THREE.Group();
  const C = CLIFF.cove, rock = '#8f8174', rock2 = '#a39584';
  const m = (geo, c, o) => { const mesh = toonMesh(geo, c, o); g.add(mesh); return mesh; };
  // 아래로 낮춘 만의 바닷물(조금 더 깊은 색)
  m(GEO.box, null, { material: toonMaterial('#5fb4dc'), position: [(C.x0 + C.x1) / 2, C.y, (SOUTH_SHORE + C.z1) / 2], scale: [C.x1 - C.x0 + 1, 0.1, C.z1 - SOUTH_SHORE + 1], outline: false, shadow: false, receive: true });
  // 둘레 바위벽: 서 · 동 · 남은 바다 수면 위로 솟은 바위, 북쪽(해안 밑)은 꼭대기가 땅보다 살짝 낮은 절벽면
  let k = 0;
  const boulder = (x, z, sx, sy, sz, top) => {
    m(GEO.sphereMid, k++ % 2 ? rock : rock2, { position: [x, top - sy, z], scale: [sx, sy, sz], outline: 0.05, receive: true });
  };
  for (let x = C.x0 + 0.6; x <= C.x1 - 0.6; x += 1.5) boulder(x, SOUTH_SHORE + 0.45, 1.05, 1.7, 0.85, -0.04);
  for (let z = SOUTH_SHORE + 1.2; z <= C.z1; z += 1.6) { boulder(C.x0, z, 1.2, 2.1, 1.3, 0.55 + (k % 3) * 0.2); boulder(C.x1, z, 1.2, 2.1, 1.3, 0.5 + (k % 3) * 0.2); }
  for (let x = C.x0 + 1.4; x <= C.x1 - 1.4; x += 1.7) boulder(x, C.z1, 1.3, 2.0, 1.1, 0.35 + (k % 2) * 0.25);
  // 절벽 위: 가장자리 풀숲 몇 개와 작은 바위
  const L = CLIFF.log;
  // (통나무 뒤쪽 = 북쪽은 비워 둔다: 별 볼 때 카메라가 그쪽에서 바다를 본다)
  [[-3.7, 0.9, 0.34], [3.9, 0.7, 0.3], [-5.6, 0.4, 0.42], [6.0, 0.2, 0.4]].forEach(([dx, dz, s]) => m(GEO.sphere, '#7ec476', { position: [L.x + dx, s * 0.3, L.z + dz], scale: [s, s * 0.6, s], outline: 0.025 }));
  m(GEO.dot, '#b9ab9a', { position: [L.x + 2.6, 0.08, L.z + 0.6], scale: [0.22, 0.14, 0.18], outline: 0.015 });
  // 통나무: 동서로 눕힌 둥근 나무 + 양 끝 나이테
  m(GEO.cylinder, '#a0703f', { position: [L.x, L.r, L.z], rotation: [0, 0, Math.PI / 2], scale: [L.r, L.len, L.r], outline: 0.03, receive: true });
  [-1, 1].forEach((sd) => {
    m(GEO.cylinder, '#e3c28e', { position: [L.x + sd * L.len / 2, L.r, L.z], rotation: [0, 0, Math.PI / 2], scale: [L.r * 0.86, 0.02, L.r * 0.86], outline: false });
    m(GEO.cylinder, '#c69a63', { position: [L.x + sd * (L.len / 2 + 0.006), L.r, L.z], rotation: [0, 0, Math.PI / 2], scale: [L.r * 0.45, 0.02, L.r * 0.45], outline: false });
  });
  scene.add(g);
  village.obstacles.push({ x: L.x - L.len / 4, z: L.z, r: L.r + 0.2 }, { x: L.x + L.len / 4, z: L.z, r: L.r + 0.2 });
  village.labels.push({ x: L.x, y: 1.6, z: L.z - 0.4, text: '바다 절벽' });
  return { log: L, seatY: L.r * 2 - 0.06 };
}
