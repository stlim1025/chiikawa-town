/**
 * 장애물 공간 해시: 원 { x, z, r, soft } 를 cell 크기 칸에 나눠 담아 주변 칸만 검사한다.
 * 숲의 나무 · 바위처럼 장애물이 수천 개여도 isFree 가 빠르다. push 로 넣고, 모두 보려면 list 를 읽는다.
 */
export function createObstacleIndex(cell = 4) {
  const buckets = new Map(), list = [];
  let maxR = 0;
  const key = (i, j) => i + ':' + j;
  function push(...items) {
    for (const o of items) {
      list.push(o);
      maxR = Math.max(maxR, o.r);
      const k = key(Math.floor(o.x / cell), Math.floor(o.z / cell));
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = []));
      b.push(o);
    }
    return list.length;
  }
  /** (x, z) 에 반지름 radius 인 원이 장애물과 겹치는지. soft 면 지나갈 수 있는 덤불도 장애물로 본다. */
  function hits(x, z, radius, soft = false) {
    const reach = radius + maxR;
    const i0 = Math.floor((x - reach) / cell), i1 = Math.floor((x + reach) / cell);
    const j0 = Math.floor((z - reach) / cell), j1 = Math.floor((z + reach) / cell);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const b = buckets.get(key(i, j));
        if (!b) continue;
        for (const o of b) if ((soft || !o.soft) && Math.hypot(x - o.x, z - o.z) < o.r + radius) return true;
      }
    }
    return false;
  }
  return { list, push, hits, get length() { return list.length; } };
}
