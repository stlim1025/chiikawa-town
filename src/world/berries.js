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
    list.push({ x: spot.x, z: spot.z, ready: true, timer: 0, berries, g });
  }
  // 같이 놀기(손님): 친구 마을에 놀러 간 동안은 내 덤불을 숨기고(다시 열리지도 않는다) 주인 마을 덤불을 대신 보여 주고 따게 한다
  let guest = null; // [{ i: 주인 덤불 번호, x, z, ready, berries, g, guest: true, hold: 내가 딴 걸 믿는 시각 }]
  const HOLD_MS = 4000; // 내가 딴 덤불: 주인에게 닿기 전에 온 모습(아직 열림)보다 내가 딴 것을 믿는 시간

  return {
    list,
    /** (x, z) 에서 maxDist 안의 열매가 달린 가장 가까운 덤불(친구 마을에 놀러 간 동안은 주인 마을 덤불). */
    nearestReady(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const b of guest || list) {
        const d = Math.hypot(b.x - x, b.z - z);
        if (b.ready && d < bd) { bd = d; best = b; }
      }
      return best;
    },
    /** 열매를 딴다(덤불은 비고, 한참 뒤 다시 열린다. 친구 마을 덤불은 주인 마을에서 다시 열린다). */
    pick(b) {
      b.ready = false;
      b.timer = REGROW_SECONDS;
      b.berries.visible = false;
      if (b.guest) b.hold = performance.now() + HOLD_MS;
    },
    /** 같이 놀기(주인): 놀러 온 친구에게 보낼 덤불 [[x, z, 열렸으면 1]](순서가 덤불 번호). */
    snapshot() { return list.map((b) => [+b.x.toFixed(2), +b.z.toFixed(2), b.ready ? 1 : 0]); },
    /** 같이 놀기(손님): 내 덤불은 숨기고 주인 마을 덤불(주인이 보낸 snapshot)을 대신 보여 준다. null 이면 치우고 내 덤불을 다시 보인다. */
    showGuest(items) {
      if (!items) {
        if (!guest) return;
        for (const b of guest) scene.remove(b.g);
        guest = null;
        for (const b of list) b.g.visible = true;
        return;
      }
      const rows = items.filter((it) => Array.isArray(it) && Number.isFinite(it[0]) && Number.isFinite(it[1])).slice(0, COUNT * 2);
      if (!guest || guest.length !== rows.length) {
        // 처음(또는 덤불 수가 달라졌으면): 주인 마을 자리에 덤불을 새로 심는다
        if (guest) for (const b of guest) scene.remove(b.g);
        for (const b of list) b.g.visible = false;
        guest = rows.map(([x, z], i) => {
          const { g, berries } = bushModel();
          g.position.set(x, 0, z);
          g.rotation.y = (i * 2.399) % (Math.PI * 2);
          scene.add(g);
          return { i, x, z, ready: true, berries, g, guest: true, hold: 0 };
        });
      }
      const now = performance.now();
      rows.forEach(([, , ready], i) => {
        const b = guest[i];
        if (now < b.hold) return; // 방금 내가 땄다
        b.ready = !!ready;
        b.berries.visible = b.ready;
      });
    },
    update(dt) {
      if (guest) return; // 친구 마을에 놀러 간 동안 내 덤불은 그대로
      for (const b of list) {
        if (b.ready) continue;
        b.timer -= dt;
        if (b.timer <= 0) { b.ready = true; b.berries.visible = true; }
      }
    }
  };
}
