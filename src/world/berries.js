import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { pathDist } from './village.js';

const COUNT = 10;
const RING = [16, 26]; // 넓어진 마을의 가장자리
const REGROW_SECONDS = 35;

/** 빨간 열매가 달린 덤불 하나. berries 는 따면 숨기는 열매 묶음. */
function bushModel() {
  const g = new THREE.Group();
  [[0, 0.32, 0, 0.48], [0.4, 0.26, 0.1, 0.36], [-0.38, 0.24, 0.05, 0.34]].forEach(([x, y, z, r], i) => {
    g.add(toonMesh(GEO.sphere, i ? '#5fae62' : '#4f9f58', { position: [x, y, z], scale: [r, r * 0.85, r], outline: 0.03 }));
  });
  const berries = new THREE.Group();
  [[0.15, 0.62, 0.28], [-0.22, 0.5, 0.36], [0.42, 0.42, 0.3], [-0.05, 0.36, 0.45], [-0.45, 0.38, 0.22]].forEach(([x, y, z]) => {
    berries.add(toonMesh(GEO.sphere, '#e0384f', { position: [x, y, z], scale: [0.09, 0.09, 0.09], outline: 0.012, shadow: false }));
  });
  g.add(berries);
  return { g, berries };
}

/** 마을 가장자리에 열매 덤불을 심는다. 열매를 따면 한동안 비었다가 다시 열린다. */
export function createBerries(scene, village, random = Math.random) {
  const list = [];
  for (let i = 0; i < COUNT * 8 && list.length < COUNT; i++) {
    const spot = village.randomFreeSpot(random, RING[0], RING[1]);
    // 길을 막지 않게 흙길에서 넉넉히 떨어진 곳에만, 덤불끼리도 떨어뜨려 심는다
    if (!spot || pathDist(spot.x, spot.z) < 1.2 || list.some((b) => Math.hypot(b.x - spot.x, b.z - spot.z) < 3)) continue;
    const { g, berries } = bushModel();
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = random() * Math.PI * 2;
    scene.add(g);
    village.obstacles.push({ x: spot.x, z: spot.z, r: 0.55, soft: true }); // 지나갈 수는 있지만 풀 · 꽃이 그 자리에 나지 않게
    list.push({ x: spot.x, z: spot.z, ready: true, timer: 0, berries });
  }

  return {
    list,
    /** (x, z) 에서 maxDist 안의 열매가 달린 가장 가까운 덤불. */
    nearestReady(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const b of list) {
        const d = Math.hypot(b.x - x, b.z - z);
        if (b.ready && d < bd) { bd = d; best = b; }
      }
      return best;
    },
    /** 열매를 딴다(덤불은 비고, 한참 뒤 다시 열린다). */
    pick(b) {
      b.ready = false;
      b.timer = REGROW_SECONDS;
      b.berries.visible = false;
    },
    update(dt) {
      for (const b of list) {
        if (b.ready) continue;
        b.timer -= dt;
        if (b.timer <= 0) { b.ready = true; b.berries.visible = true; }
      }
    }
  };
}
