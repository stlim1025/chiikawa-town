import * as THREE from 'three';
import { toonMaterial, outlineMaterial, GEO } from '../render/toon.js';
import { groundY } from '../core/layout.js';

/**
 * 낙엽 더미(가을, 게임 오리지널): 주황 · 빨강 · 노랑 단풍잎이 겹겹이 쌓인 낮은 더미. 뒤적여 단풍잎을 줍는다.
 * 모든 더미의 잎은 인스턴스 메시 하나(잎마다 색), 더미 밑동(낮은 흙빛 둔덕)과 그 외곽선도 인스턴스 메시 하나씩 — 더미가 몇 개든 그리기 세 번.
 * sync(spots, pickedIds): spots = [{ id, x, z }] 자리에 더미를 두고, pickedIds(배열 · Set)에 든 더미는 숨긴다(달라진 것이 없으면 바로 돌아온다).
 * nearest(x, z, r): r 안에서 가장 가까운(아직 줍지 않은) 더미 { id, x, z } | null. update(dt, t): 잎이 살랑살랑 바스락거린다.
 * → { sync, nearest, update }
 */
const LEAVES = 10; // 더미 하나의 잎 수
const COLORS = ['#e8662e', '#d9432f', '#f2b632', '#e0892b', '#c9532a'];

let leafGeo = null;
/**
 * 단풍잎 한 장(납작한 판): 폭 1 남짓, 바닥에 누워 위(+y)를 본다. 잎자루 쪽이 −z, 잎 끝이 +z, 가운데가 원점.
 * 낙엽 더미와 가을 흩날리는 잎(seasonfx.js)이 같이 쓴다. 모양은 가방 그림(ui/itemart.js 의 mapleleaf)과 같다.
 */
export function mapleLeafGeometry() {
  if (leafGeo) return leafGeo;
  // 64 칸 그림 좌표(y 는 아래로): 오른쪽 반(잎 끝 → 잎자루). 왼쪽은 거울
  const half = [[32, 5], [36.5, 15], [42, 12], [41, 23], [52, 17], [49.5, 27], [58, 29], [50, 37], [52, 43], [40, 42], [41, 48], [33.2, 46.4], [33.2, 55]];
  const pts = [...half, ...half.slice().reverse().map(([x, y]) => [64 - x, y])].slice(0, -1); // 잎 끝 점은 한 번만
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => { const px = (x - 32) / 52, py = (30 - y) / 52; if (i) sh.lineTo(px, py); else sh.moveTo(px, py); });
  sh.closePath();
  leafGeo = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2).rotateY(Math.PI); // 판을 눕히고(위를 본다) 잎 끝을 +z 로
  return leafGeo;
}

/** 자리로 만든 고정 난수(같은 더미는 늘 같은 모양). */
function seeded(x, z) {
  let s = (Math.floor(x * 131.7) * 73856093) ^ (Math.floor(z * 97.3) * 19349663) ^ 0x9e3779b9;
  return () => { s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; };
}

export function createLeafPiles(scene) {
  const leafMat = toonMaterial('#ffffff', { doubleSide: true, unique: true });
  const moundMat = toonMaterial('#b8743d', { unique: true });
  let piles = []; // { id, x, z, y, picked, leaves: [{ dx, dz, h, yaw, tx, tz, s, ph, c }] }
  let leafMesh = null, mound = null, moundLine = null, cap = 0, dirty = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'XZY'), pos = new THREE.Vector3(), size = new THREE.Vector3(), col = new THREE.Color();
  const has = (picked, id) => (!picked ? false : picked.has ? picked.has(id) : picked.includes(id));

  /** 더미 수(n)를 담을 만큼 인스턴스 메시를 (다시) 만든다. */
  function ensure(n) {
    if (n <= cap) return;
    for (const m of [leafMesh, mound, moundLine]) if (m) { scene.remove(m); m.dispose(); }
    cap = Math.max(8, Math.ceil(n * 1.5));
    leafMesh = new THREE.InstancedMesh(mapleLeafGeometry(), leafMat, cap * LEAVES);
    leafMesh.setColorAt(0, col.set('#ffffff')); // 잎마다 색(인스턴스 색)을 쓴다고 처음부터 알린다
    mound = new THREE.InstancedMesh(GEO.sphereLow, moundMat, cap);
    mound.receiveShadow = true;
    moundLine = new THREE.InstancedMesh(GEO.sphereLow, outlineMaterial(0.07, true), cap);
    moundLine.instanceMatrix = mound.instanceMatrix; // 둔덕과 같은 자리(외곽선)
    for (const m of [leafMesh, mound, moundLine]) { m.frustumCulled = false; m.count = 0; m.visible = false; m.raycast = () => {}; scene.add(m); }
  }

  /** 더미 하나의 잎 배치: 가운데가 높고 가장자리로 갈수록 낮게 눕는 둔덕 모양. */
  function layout(x, z) {
    const rnd = seeded(x, z), leaves = [];
    for (let i = 0; i < LEAVES; i++) {
      const top = i === 0, a = (i / (LEAVES - 1)) * Math.PI * 2 + rnd() * 0.7, r = top ? 0.04 : 0.2 + rnd() * 0.26;
      const slope = top ? 0 : 0.12 + r * 0.7; // 바깥 잎일수록 더 기울어 둔덕을 덮는다(기울인 뒤 제자리에서 돌린다 — 오일러 순서 XZY)
      leaves.push({
        dx: Math.sin(a) * r, dz: Math.cos(a) * r, h: 0.05 + (1 - r / 0.5) * 0.2 + rnd() * 0.02,
        yaw: rnd() * Math.PI * 2, tx: Math.cos(a) * slope, tz: -Math.sin(a) * slope,
        s: 0.4 + rnd() * 0.16, ph: rnd() * Math.PI * 2, c: COLORS[Math.floor(rnd() * COLORS.length)]
      });
    }
    return leaves;
  }

  /** 보이는 더미만 앞에서부터 채운다(둔덕 · 잎 색). 잎 자리는 update 가 매번 적는다. */
  function rebuild() {
    dirty = false;
    if (!leafMesh) return;
    let n = 0;
    for (const p of piles) {
      if (p.picked) continue;
      pos.set(p.x, p.y + 0.02, p.z);
      mound.setMatrixAt(n, m4.compose(pos, q.identity(), size.set(0.42, 0.2, 0.42)));
      p.leaves.forEach((l, i) => leafMesh.setColorAt(n * LEAVES + i, col.set(l.c)));
      n++;
    }
    mound.count = moundLine.count = n;
    leafMesh.count = n * LEAVES;
    mound.visible = moundLine.visible = leafMesh.visible = n > 0;
    mound.instanceMatrix.needsUpdate = true;
    if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  }

  return {
    sync(spots, pickedIds) {
      spots = spots || [];
      let changed = spots.length !== piles.length;
      for (let i = 0; !changed && i < spots.length; i++) {
        const s = spots[i], p = piles[i];
        changed = s.id !== p.id || s.x !== p.x || s.z !== p.z || has(pickedIds, s.id) !== p.picked;
      }
      if (!changed) return;
      const old = new Map(piles.map((p) => [p.id, p]));
      piles = spots.map((s) => {
        const p = old.get(s.id);
        if (p && p.x === s.x && p.z === s.z) { p.picked = has(pickedIds, s.id); return p; }
        return { id: s.id, x: s.x, z: s.z, y: groundY(s.x, s.z), picked: has(pickedIds, s.id), leaves: layout(s.x, s.z) };
      });
      ensure(piles.length);
      dirty = true;
    },
    nearest(x, z, r) {
      let best = null, bd = r;
      for (const p of piles) {
        if (p.picked) continue;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d <= bd) { bd = d; best = p; }
      }
      return best ? { id: best.id, x: best.x, z: best.z } : null;
    },
    update(dt, t = 0) {
      if (dirty) rebuild();
      if (!leafMesh || !leafMesh.visible) return;
      let n = 0;
      for (const p of piles) {
        if (p.picked) continue;
        for (let i = 0; i < LEAVES; i++) {
          const l = p.leaves[i], w = Math.sin(t * 1.4 + l.ph), w2 = Math.sin(t * 2.3 + l.ph * 1.7);
          pos.set(p.x + l.dx, p.y + l.h + w2 * 0.006, p.z + l.dz);
          e.set(l.tx + w * 0.05, l.yaw + w2 * 0.05, l.tz + w * 0.04);
          leafMesh.setMatrixAt(n * LEAVES + i, m4.compose(pos, q.setFromEuler(e), size.setScalar(l.s)));
        }
        n++;
      }
      leafMesh.instanceMatrix.needsUpdate = true;
    }
  };
}
