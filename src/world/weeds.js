import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';

const MAX = { weed: 30, thorny: 8 };
const RING = { weed: [5, 25], thorny: [22, 26.5] }; // 넓어진 마을 안(위험한 풀은 울타리 가까이)
const REGROW_SECONDS = 20;

function weedModel(kind) {
  const g = new THREE.Group();
  if (kind === 'thorny') {
    g.add(toonMesh(GEO.cone, '#8a6fb0', { scale: [0.09, 0.55, 0.09], outline: 0.02 }));
    [[0.08, 0.2, 0.6], [-0.08, 0.32, -0.6], [0.07, 0.42, 2.2]].forEach(([x, y, rot]) => {
      const spike = toonMesh(GEO.cone, '#6b4f93', { position: [x, y, 0], scale: [0.03, 0.12, 0.03], outline: 0.012, shadow: false });
      spike.rotation.set(0, rot, x > 0 ? -1.1 : 1.1, 'YXZ');
      g.add(spike);
    });
    g.add(toonMesh(GEO.dot, '#e0524f', { position: [0, 0.6, 0], scale: [0.07, 0.07, 0.07], outline: 0.015, shadow: false }));
  } else {
    for (let i = 0; i < 4; i++) {
      const leaf = toonMesh(GEO.cone, i % 2 ? '#6fbf5a' : '#8fd16a', { scale: [0.07, 0.42 - i * 0.04, 0.07], outline: 0.018 });
      leaf.rotation.set(0.35, (i / 4) * Math.PI * 2, 0, 'YXZ');
      g.add(leaf);
    }
  }
  return g;
}

/** 잡초와 위험한 풀을 키우고 뽑힌 연출을 한다. */
export function createWeeds(scene, village, random = Math.random) {
  const list = [];
  const flying = [];
  let nextId = 1, regrow = 0;

  function spawn(kind) {
    const spot = village.randomFreeSpot(random, RING[kind][0], RING[kind][1]);
    if (!spot || list.some((w) => Math.hypot(w.x - spot.x, w.z - spot.z) < 1.0)) return;
    const mesh = weedModel(kind);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = random() * Math.PI * 2;
    mesh.scale.setScalar(0.01);
    scene.add(mesh);
    list.push({ id: nextId++, kind, x: spot.x, z: spot.z, mesh, grow: 0 });
  }

  for (let i = 0; i < MAX.weed; i++) spawn('weed');
  for (let i = 0; i < MAX.thorny; i++) spawn('thorny');
  list.forEach((w) => { w.grow = 1; w.mesh.scale.setScalar(1); });

  return {
    list,
    /** (x, z) 에서 maxDist 안의 가장 가까운 풀. */
    nearest(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const w of list) {
        const d = Math.hypot(w.x - x, w.z - z);
        if (d < bd) { bd = d; best = w; }
      }
      return best;
    },
    /** 뽑는 동안 풀이 흔들리고 늘어난다. */
    tug(weed, power) {
      if (!weed) return;
      weed.mesh.scale.set(1 - power * 0.15, 1 + power * 0.35, 1 - power * 0.15);
      weed.mesh.rotation.z = Math.sin(performance.now() / 30) * 0.08 * power;
    },
    /** 뽑힌 풀을 날려 보낸다. result: 'clean' | 'snapped' */
    remove(weed, result) {
      const i = list.indexOf(weed);
      if (i < 0) return;
      list.splice(i, 1);
      const m = weed.mesh;
      m.scale.setScalar(1);
      m.rotation.z = 0;
      if (result === 'clean') {
        const root = toonMesh(GEO.dot, '#c9a27a', { position: [0, -0.05, 0], scale: [0.12, 0.08, 0.12], outline: 0.015, shadow: false });
        m.add(root);
      }
      flying.push({ mesh: m, t: 0, vy: result === 'clean' ? 4.2 : 2.6, vx: (random() - 0.5) * 1.2, spin: (random() - 0.5) * 12 });
    },
    update(dt) {
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        f.t += dt; f.vy -= 12 * dt;
        f.mesh.position.y += f.vy * dt;
        f.mesh.position.x += f.vx * dt;
        f.mesh.rotation.z += f.spin * dt;
        f.mesh.scale.setScalar(Math.max(0.01, 1 - f.t * 1.3));
        if (f.t > 0.8) { scene.remove(f.mesh); flying.splice(i, 1); }
      }
      list.forEach((w) => {
        if (w.grow < 1) { w.grow = Math.min(1, w.grow + dt * 1.5); w.mesh.scale.setScalar(w.grow); }
      });
      regrow += dt;
      if (regrow >= REGROW_SECONDS) {
        regrow = 0;
        if (list.filter((w) => w.kind === 'weed').length < MAX.weed) spawn('weed');
        if (list.filter((w) => w.kind === 'thorny').length < MAX.thorny) spawn('thorny');
      }
    }
  };
}
