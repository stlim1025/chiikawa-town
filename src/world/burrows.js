import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO } from '../render/toon.js';
import { mergedGeometry } from '../render/batch.js';

/**
 * 사이드스토리 '우사기의 집'의 드나드는 곳 둘: 서쪽 숲 깊숙이 숲길 옆 커다란 나무 밑동의 구멍(원작처럼 우사기가 쏙 들어가는 곳)과
 * 남쪽 강가 덤불 굴(클럽에서 나오는 곳). 구멍은 남쪽(카메라 쪽)을 보고, 구멍 앞(front)에 서면 '따라 들어가기'.
 * spots[name]: { x, z, front: 설 자리, mark: 행동 안내 고리 · 글자 자리 { x, z, y } }
 */
// 숲: 숲길이 꺾이는 곳 북쪽 빈터(둘레 3m 넘게 다른 나무가 없어 큰 나무가 겹치지 않는다) · 강가: 남쪽 문 밖 강둑
const SPOTS = { forest: [-55, -2.6], river: [-7, 30.6] };
// 우사기 나무의 잎 덩어리 [x, y, z, 반지름, 색]
const CROWN = [[0, 3.15, 0, 1.45, '#4f9e5e'], [1.0, 2.8, 0.2, 0.95, '#5fb36e'], [-1.0, 2.85, -0.1, 1.0, '#5fb36e'], [0.1, 2.75, -0.9, 0.95, '#4f9e5e'], [0.2, 3.85, -0.1, 0.9, '#6cc77e']];

/** 우사기 나무: 굵은 줄기 · 옆뒤로 뻗은 뿌리 · 큰 잎 덩어리, 밑동 앞에 아치 모양 까만 구멍. 줄기 · 잎은 덩어리 하나씩으로 합쳐 그린다. */
function hollowTree(g, hole) {
  const bark = '#8f6545';
  const wood = mergedGeometry([
    { geometry: GEO.cylinder, scale: [0.78, 2.8, 0.78], color: bark },
    // 뿌리: 앞(구멍 쪽)은 비우고 옆 · 뒤로
    ...[1.75, -1.75, 2.6, -2.6].map((a) => ({ geometry: GEO.sphere, position: [Math.sin(a) * 0.82, 0.1, Math.cos(a) * 0.82], rotation: [0, a, 0], scale: [0.26, 0.3, 0.52], color: bark })),
    { geometry: GEO.sphere, position: [0, 0.48, 0.66], scale: [0.5, 0.68, 0.16], color: '#6b4a31' } // 구멍 둘레(안으로 패인 껍질)
  ]);
  g.add(toonMesh(wood, null, { material: toonMaterial('#ffffff', { vertexColors: true }), outline: 0.035, receive: true }));
  const crown = mergedGeometry(CROWN.map(([x, y, z, r, c]) => ({ geometry: GEO.sphereMid, position: [x, y, z], scale: [r, r * 0.92, r], color: c })));
  g.add(toonMesh(crown, null, { material: toonMaterial('#ffffff', { vertexColors: true }), outline: 0.04 }));
  // 구멍: 땅에서 아치 모양으로(아래쪽 절반은 땅속) 까맣게
  g.add(toonMesh(GEO.sphere, null, { material: hole, position: [0, 0.42, 0.74], scale: [0.38, 0.58, 0.12], outline: false, shadow: false }));
}

/** 강가 굴: 풀 덤불 둔덕 앞면에 까만 구멍(둔덕은 막혀 있다). */
function bushBurrow(g, hole) {
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
}

export function createBurrows(scene, village) {
  const spots = {};
  const hole = new THREE.MeshBasicMaterial({ color: '#21170f' });
  for (const [name, [x0, z0]] of Object.entries(SPOTS)) {
    const tree = name === 'forest';
    const at = village.nearestFree(x0, z0, tree ? 1.3 : 1.1);
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.z);
    if (tree) hollowTree(g, hole); else bushBurrow(g, hole);
    scene.add(g);
    if (tree) {
      village.obstacles.push({ x: at.x, z: at.z, r: 1.0 });
      spots[name] = { x: at.x, z: at.z, front: { x: at.x, z: at.z + 1.6 }, mark: { x: at.x, z: at.z + 1.0, y: 1.5 } };
    } else {
      village.obstacles.push({ x: at.x, z: at.z - 0.1, r: 0.75 });
      spots[name] = { x: at.x, z: at.z, front: { x: at.x, z: at.z + 1.25 }, mark: { x: at.x, z: at.z + 0.6, y: 1.3 } };
    }
  }
  return { spots };
}
