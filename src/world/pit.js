import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';

/**
 * 숲 속 구덩이(사이드스토리 '하치와레가 구덩이에!'): 이야기 동안만 보인다. 가운데에 하치와레가 머리만 내밀고 있다(npcs 의 sink).
 * spot: 구덩이 가운데, front: 들여다보는 자리. setOpen(on) 으로 보이기 · 숨기기.
 */
const SPOT = [-47.6, 8.6]; // 숲 속 호숫가로 가는 길 바로 옆(나무에 가리지 않게)

export function createPit(scene, village) {
  const at = village.nearestFree(SPOT[0], SPOT[1], 1.3);
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.z);
  g.visible = false;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.72, 28), new THREE.MeshBasicMaterial({ color: '#1f160f' }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.02;
  g.add(hole);
  const rim = toonMesh(new THREE.TorusGeometry(0.78, 0.13, 8, 28), '#8a6a4a', { outline: 0.02, shadow: false });
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(1, 1, 0.55);
  rim.position.y = 0.04;
  g.add(rim);
  [[0.95, 0.35], [-0.9, -0.4], [0.2, -1.0], [-0.5, 0.9]].forEach(([x, z], i) => {
    g.add(toonMesh(GEO.dot, i % 2 ? '#b9ab9a' : '#9a8a78', { position: [x, 0.05, z], scale: [0.11, 0.07, 0.09], outline: 0.012, shadow: false }));
  });
  scene.add(g);
  return {
    spot: { x: at.x, z: at.z },
    front: { x: at.x, z: at.z + 1.5 },
    setOpen(on) { g.visible = !!on; },
    get open() { return g.visible; }
  };
}
