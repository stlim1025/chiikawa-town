import * as THREE from 'three';
import { lodHide } from './perf.js';

// 먼 곳은 덜 그린다: 카메라에서 먼 외곽선은 그리기 호출에서 뺀다(판단 기준은 perf.js 의 lodHide).
// 빼는 방법은 visible 대신 레이어: 게임 코드가 visible 을 따로 켜고 끄므로(가리는 나무의 외곽선 등) 서로 덮어쓰지 않게,
// 메시를 카메라가 보지 않는 레이어로 옮긴다(카메라 · 그림자는 레이어 0 만 본다).
export const LOD_LAYER = 7;
const RECHECK_MS = 250, REFRESH_MS = 2000; // 거리 다시 재기 · 메시 목록 다시 모으기(새로 생긴 몬스터 · 물건)
const MOVED = 1; // 카메라가 이만큼(m) 움직이면 바로 다시 잰다

const isOutline = (m) => m.userData.outline || (m.material && m.material.side === THREE.BackSide && m.material.isMeshBasicMaterial);

/** root(마을 장면) 아래 메시를 거리로 거른다. update(camera, now) 를 그리기 직전에 부른다. */
export function createLod(root) {
  let list = [], lastCheck = -Infinity, lastRefresh = -Infinity;
  const cam = new THREE.Vector3(), seen = new THREE.Vector3(Infinity, 0, 0), c = new THREE.Vector3();

  function collect() {
    list = [];
    root.traverse((o) => {
      // 여러 개를 한 번에 그리는 인스턴스(풀밭 · 숲)와 늘 그려야 하는 것(하늘)은 건드리지 않는다
      if (o.isMesh && !o.isInstancedMesh && o.frustumCulled && o.geometry && isOutline(o)) list.push(o);
    });
  }
  function hide(m, on) {
    if (!!m.userData.lodHidden === on) return;
    m.userData.lodHidden = on;
    m.layers.set(on ? LOD_LAYER : 0);
  }
  function judge(m) {
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const e = m.matrixWorld.elements;
    const s = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
    c.copy(g.boundingSphere.center).applyMatrix4(m.matrixWorld);
    const r = g.boundingSphere.radius * s;
    const d = Math.max(0, c.distanceTo(cam) - r);
    hide(m, lodHide({ d, outline: true }, !!m.userData.lodHidden));
  }

  let off = false;
  return {
    /** enabled 가 false 면(타이틀처럼 멀리서 내려다볼 때) 감춘 것을 모두 되돌리고 쉰다. */
    update(camera, now, enabled = true) {
      if (!enabled) { if (!off) { off = true; this.reset(); } return; }
      off = false;
      if (now - lastRefresh >= REFRESH_MS) { lastRefresh = now; collect(); lastCheck = -Infinity; }
      camera.getWorldPosition(cam);
      if (now - lastCheck < RECHECK_MS && cam.distanceToSquared(seen) < MOVED * MOVED) return;
      lastCheck = now;
      seen.copy(cam);
      for (const m of list) judge(m);
    },
    /** 모두 다시 보이게(마을을 떠날 때 등). */
    reset() { for (const m of list) hide(m, false); lastCheck = -Infinity; }
  };
}
