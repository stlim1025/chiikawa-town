/**
 * 장애물 공간 해시: 원 { x, z, r, soft } 과 네모 { x, z, box: { hx, hz, yaw }, soft } 를 cell 크기 칸에 나눠 담아 주변 칸만 검사한다.
 * 숲의 나무 · 바위처럼 장애물이 수천 개여도 isFree 가 빠르다. push 로 넣고, 모두 보려면 list 를 읽는다.
 * off 가 참인 장애물은 없는 것으로 친다(나중에 생기는 마을 시설처럼 보였다 숨었다 하는 것).
 * 네모는 건물 벽처럼 반듯한 것: 가운데 (x, z), 반폭 hx · 반깊이 hz, y 축으로 yaw 만큼 돌아 있다(three.js rotation.y 와 같은 방향).
 */
export function createObstacleIndex(cell = 4) {
  const buckets = new Map(), list = [];
  let maxR = 0;
  const key = (i, j) => i + ':' + j;
  function push(...items) {
    for (const o of items) {
      if (o.box) {
        // 네모: 해시용 바깥 반지름과 회전 cos · sin 을 미리
        o.r = Math.hypot(o.box.hx, o.box.hz);
        o.box.c = Math.cos(o.box.yaw || 0);
        o.box.s = Math.sin(o.box.yaw || 0);
      }
      list.push(o);
      maxR = Math.max(maxR, o.r);
      const k = key(Math.floor(o.x / cell), Math.floor(o.z / cell));
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = []));
      b.push(o);
    }
    return list.length;
  }
  /** (x, z) 둘레 reach 안에 들 수 있는 장애물마다 fn. */
  function near(x, z, reach, fn) {
    const i0 = Math.floor((x - reach) / cell), i1 = Math.floor((x + reach) / cell);
    const j0 = Math.floor((z - reach) / cell), j1 = Math.floor((z + reach) / cell);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const b = buckets.get(key(i, j));
        if (b) for (const o of b) if (fn(o) === true) return true;
      }
    }
    return false;
  }
  /**
   * 반지름 radius 원(가운데 x, z)이 장애물 o 와 얼마나 겹쳤는지 → { nx, nz: 밀어낼 방향(단위), pen: 겹친 깊이 } 또는 null.
   * 네모는 가장 가까운 점에서 재고, 원 가운데가 네모 안에 들어가 있으면 가장 얕은 쪽 면으로 민다.
   */
  function contact(o, x, z, radius) {
    const dx = x - o.x, dz = z - o.z;
    if (!o.box) {
      const d = Math.hypot(dx, dz), pen = o.r + radius - d;
      if (pen <= 0) return null;
      return d > 1e-6 ? { nx: dx / d, nz: dz / d, pen } : { nx: 1, nz: 0, pen };
    }
    const { hx, hz, c, s } = o.box;
    // 마을 → 네모 자리(돌린 것을 되돌린다)
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    const qx = Math.max(-hx, Math.min(hx, lx)), qz = Math.max(-hz, Math.min(hz, lz));
    let ex = lx - qx, ez = lz - qz, pen;
    const d = Math.hypot(ex, ez);
    if (d > 1e-6) {
      pen = radius - d;
      if (pen <= 0) return null;
      ex /= d; ez /= d;
    } else {
      const px = hx - Math.abs(lx), pz = hz - Math.abs(lz);
      if (px < pz) { ex = lx < 0 ? -1 : 1; ez = 0; pen = px + radius; } else { ex = 0; ez = lz < 0 ? -1 : 1; pen = pz + radius; }
    }
    // 네모 자리 방향 → 마을 방향
    return { nx: ex * c + ez * s, nz: -ex * s + ez * c, pen };
  }
  /** (x, z) 에 반지름 radius 인 원이 장애물과 겹치는지. soft 면 지나갈 수 있는 덤불도 장애물로 본다. */
  function hits(x, z, radius, soft = false) {
    return near(x, z, radius + maxR, (o) => (soft || !o.soft) && !o.off && !!contact(o, x, z, radius));
  }
  /**
   * 겹친 단단한 장애물에서 밀어낸 자리 { x, z } (겹친 게 없으면 null). 가장 깊이 겹친 것 하나만 민다(여러 번 부르면 모두 풀린다).
   * 가려던 자리를 이렇게 밀어내면 둥근 가로등 · 나무는 둘레를 따라, 벽은 벽을 따라 미끄러진다.
   */
  function pushOut(x, z, radius) {
    let best = null;
    near(x, z, radius + maxR, (o) => {
      if (o.soft || o.off) return;
      const k = contact(o, x, z, radius);
      if (k && (!best || k.pen > best.pen)) best = k;
    });
    return best ? { x: x + best.nx * (best.pen + 1e-3), z: z + best.nz * (best.pen + 1e-3) } : null;
  }
  return { list, push, hits, pushOut, get length() { return list.length; } };
}

/**
 * (ox, oz) 에서 (nx, nz) 로 가려 할 때 실제로 갈 자리. 막혔다고 그 자리에 서 버리지 않고 장애물을 따라 미끄러진다.
 * 1) 가려던 자리를 겹친 장애물 밖으로 밀어낸다(pushOut): 가로등 · 나무처럼 둥근 것은 둘레를 따라, 벽은 벽을 따라 돈다.
 * 2) 그래도 안 되면(물가 · 마을 끝 · 좁은 틈) 방향을 조금씩 틀어 본다(덜 튼 쪽부터, 튼 만큼 덜 간다).
 * 정면으로 들이받을 때만 멈춘다. 이미 무언가에 끼어 있으면 가장 가까운 바깥으로 빼 준다.
 * isFree(x, z, r): 설 수 있는지(물 · 마을 끝 포함), pushOut(x, z, r): 장애물 밖으로 민 자리 또는 null.
 */
export function slideMove(isFree, pushOut, ox, oz, nx, nz, radius = 0.35) {
  const step = Math.hypot(nx - ox, nz - oz);
  if (step < 1e-6 || isFree(nx, nz, radius)) return { x: nx, z: nz };
  const fx = (nx - ox) / step, fz = (nz - oz) / step, stuck = !isFree(ox, oz, radius);
  let x = nx, z = nz;
  for (let k = 0; k < 4; k++) { const p = pushOut(x, z, radius); if (!p) break; x = p.x; z = p.z; }
  // 밀어낸 자리가 비어 있고, 한 걸음보다 크게 튀거나 뒤로 밀리지 않았으면 그 자리
  if (isFree(x, z, radius) && (stuck || (Math.hypot(x - ox, z - oz) <= step * 1.2 && (x - ox) * fx + (z - oz) * fz > -1e-4))) return { x, z };
  for (const a of [0.3, 0.6, 0.9, 1.2]) {
    const L = step * Math.cos(a);
    for (const sg of [1, -1]) {
      const c = Math.cos(a * sg), s = Math.sin(a * sg), tx = ox + (fx * c - fz * s) * L, tz = oz + (fx * s + fz * c) * L;
      if (isFree(tx, tz, radius)) return { x: tx, z: tz };
    }
  }
  return { x: ox, z: oz };
}
