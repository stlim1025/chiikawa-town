import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';

/**
 * 토끼굴 둘(사이드스토리 '우사기의 집'): 서쪽 숲길 옆 덤불 굴(우사기가 쏙 들어가는 곳)과 남쪽 강가 굴(클럽에서 나오는 곳).
 * 풀 덤불 둔덕 앞면에 까만 구멍. 둔덕은 막혀 있고, 구멍 앞(front)에 서면 '따라 들어가기'.
 */
const SPOTS = { forest: [-36.5, 3.4], river: [-7, 30.6] };

export function createBurrows(scene, village) {
  const spots = {};
  const hole = new THREE.MeshBasicMaterial({ color: '#21170f' });
  for (const [name, [x0, z0]] of Object.entries(SPOTS)) {
    const at = village.nearestFree(x0, z0, 1.1);
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.z);
    const m = (geo, c, o) => { const mesh = toonMesh(geo, c, { shadow: true, ...o }); g.add(mesh); return mesh; };
    m(GEO.sphere, '#5f9e5c', { position: [0, 0.05, -0.05], scale: [0.95, 0.62, 0.8], outline: 0.03 });
    m(GEO.sphere, '#6fb36a', { position: [-0.55, 0.32, -0.2], scale: [0.4, 0.34, 0.36], outline: 0.025 });
    m(GEO.sphere, '#6fb36a', { position: [0.5, 0.36, -0.25], scale: [0.42, 0.36, 0.38], outline: 0.025 });
    m(GEO.sphere, '#7ec476', { position: [0.05, 0.55, -0.3], scale: [0.36, 0.3, 0.32], outline: 0.025 });
    // 구멍: 앞면(남쪽 · 카메라 쪽)에 납작한 까만 타원 + 흙 테두리
    m(GEO.sphere, '#8a6a4a', { position: [0, 0.2, 0.62], scale: [0.4, 0.32, 0.08], outline: 0.02 });
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), hole);
    h.position.set(0, 0.22, 0.705);
    h.scale.set(1, 0.85, 1);
    g.add(h);
    m(GEO.dot, '#b9ab9a', { position: [0.42, 0.04, 0.62], scale: [0.09, 0.06, 0.08], outline: 0.012 });
    scene.add(g);
    village.obstacles.push({ x: at.x, z: at.z - 0.1, r: 0.75 });
    spots[name] = { x: at.x, z: at.z, front: { x: at.x, z: at.z + 1.25 } };
  }
  return { spots };
}
