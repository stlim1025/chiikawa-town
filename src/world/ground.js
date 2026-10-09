import * as THREE from 'three';
import { toonMaterial, addOutline, GEO } from '../render/toon.js';
import { part, mergeParts } from '../render/merge.js';

/**
 * 바닥에 떨어진 물건 그리기: 동물의 숲처럼 초록 나뭇잎 꾸러미가 발밑에서 살랑살랑. 물건 종류마다 잎 위 구슬 색이 다르다.
 * sync(state.ground) 로 목록에 맞춰 만들고 지우고, nearest 로 주울 것을 찾는다.
 */
const DOT = { herb: '#8fd16a', food: '#f0566a', drop: '#c9a8ff', quest: '#ffd94a', weapon: '#9fd3f4' };

let leafGeo = null;
function leafGeometry() {
  if (leafGeo) return leafGeo;
  const root = new THREE.Group();
  // 잎 한 장(앞뒤로 뾰족) + 가운데 잎맥 + 짧은 꼭지
  part(root, GEO.sphere, '#79c25a', { position: [0, 0.07, 0], rotation: [0.25, 0, 0], scale: [0.2, 0.05, 0.3] });
  part(root, GEO.cone, '#79c25a', { position: [0, 0.075, 0.26], rotation: [Math.PI / 2 + 0.25, 0, 0], scale: [0.09, 0.14, 0.03] });
  part(root, GEO.box, '#5aa544', { position: [0, 0.105, 0.02], rotation: [0.25, 0, 0], scale: [0.018, 0.012, 0.42] });
  part(root, GEO.cylinder, '#8a6a3c', { position: [0, 0.03, -0.27], rotation: [-1.2, 0, 0], scale: [0.018, 0.12, 0.018] });
  leafGeo = mergeParts(root, 'all');
  return leafGeo;
}
const leafMat = toonMaterial('#ffffff', { vertexColors: true });

export function createGround(scene) {
  const items = new Map(); // g → { e, root, leaf, born }
  let t = 0;

  function build(e, kind) {
    const root = new THREE.Group();
    const leaf = new THREE.Mesh(leafGeometry(), leafMat);
    leaf.castShadow = true;
    addOutline(leaf, 0.02);
    root.add(leaf);
    const dot = new THREE.Mesh(GEO.dot, toonMaterial(DOT[kind] || '#ffffff'));
    dot.position.set(0, 0.16, 0.0);
    dot.scale.setScalar(0.06);
    addOutline(dot, 0.012);
    root.add(dot);
    root.position.set(e.x, 0, e.z);
    root.rotation.y = (e.g * 2.399) % (Math.PI * 2); // 꾸러미마다 다른 방향
    scene.add(root);
    return { e, root, leaf, born: 0 };
  }

  return {
    /** 목록(state.ground)에 맞춘다. kindOf(e): 'herb' | 'food' | 'drop' | 'quest' | 'weapon' */
    sync(list, kindOf) {
      const seen = new Set();
      for (const e of list) {
        seen.add(e.g);
        const it = items.get(e.g);
        if (it) { it.e = e; continue; }
        items.set(e.g, build(e, kindOf(e)));
      }
      for (const [g, it] of items) if (!seen.has(g)) { scene.remove(it.root); items.delete(g); }
    },
    /** (x, z) 에서 maxDist 안의 가장 가까운 떨어진 물건. */
    nearest(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const it of items.values()) {
        const d = Math.hypot(it.e.x - x, it.e.z - z);
        if (d < bd) { bd = d; best = it.e; }
      }
      return best;
    },
    /** 살랑살랑 · 떨어질 때 톡 튀며 나타난다. focus 에서 먼 것은 그리지 않는다. */
    update(dt, focus) {
      t += dt;
      for (const it of items.values()) {
        const far = focus && Math.hypot(it.e.x - focus.x, it.e.z - focus.z) > 50;
        it.root.visible = !far;
        if (far) continue;
        if (it.born < 1) {
          it.born = Math.min(1, it.born + dt * 3);
          const k = it.born;
          it.root.position.y = Math.sin(k * Math.PI) * 0.45;
          it.root.scale.setScalar(0.4 + 0.6 * k);
        } else it.root.position.y = 0;
        it.leaf.rotation.z = Math.sin(t * 2.2 + it.e.g) * 0.06;
      }
    }
  };
}
