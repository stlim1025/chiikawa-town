import * as THREE from 'three';

/**
 * 월드를 size 칸 묶음으로 나눠, 내 위치에서 view 보다 먼 묶음은 그리지 않는다(바깥의 나무 · 바위 수천 개를 가볍게).
 * add(object, x, z): (x, z) 가 속한 묶음에 넣는다. update(focus): 내가 2칸 넘게 움직였을 때만 보이기를 다시 정한다.
 */
export function createZones(parent, { size = 20, half = 80, view = 56 } = {}) {
  const n = Math.ceil((half * 2) / size), groups = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      g.userData.cx = -half + (i + 0.5) * size;
      g.userData.cz = -half + (j + 0.5) * size;
      parent.add(g);
      groups.push(g);
    }
  }
  const indexOf = (x, z) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor((x + half) / size)));
    const j = Math.min(n - 1, Math.max(0, Math.floor((z + half) / size)));
    return j * n + i;
  };
  let lastX = Infinity, lastZ = Infinity;
  return {
    size, n, groups,
    /** (x, z) 가 속한 묶음 그룹. */
    groupAt: (x, z) => groups[indexOf(x, z)],
    add(object, x, z) { groups[indexOf(x, z)].add(object); return object; },
    update(focus) {
      if (Math.abs(focus.x - lastX) < 2 && Math.abs(focus.z - lastZ) < 2) return;
      lastX = focus.x; lastZ = focus.z;
      for (const g of groups) g.visible = Math.hypot(g.userData.cx - focus.x, g.userData.cz - focus.z) < view;
    }
  };
}
