/**
 * 칸 격자 위 길찾기(A*). 친구들이 집 · 나무 · 울타리에 막히지 않고 돌아서 가게 한다.
 * 8방향으로 움직이되, 막힌 칸의 모서리를 대각선으로 가로지르지는 않는다.
 * blocked(i, j): 그 칸을 지나갈 수 없는지. start · goal: [i, j]. maxNodes: 펼칠 칸 수 한도(넘으면 포기).
 * → 칸 목록([i, j], start 부터 goal 까지) | null
 */
export function astar(cols, rows, blocked, start, goal, maxNodes = Infinity) {
  const idx = (i, j) => j * cols + i;
  const inside = (i, j) => i >= 0 && j >= 0 && i < cols && j < rows;
  if (!inside(...start) || !inside(...goal) || blocked(...goal)) return null;
  const SQ2 = Math.SQRT2;
  const h = (i, j) => { const dx = Math.abs(i - goal[0]), dz = Math.abs(j - goal[1]); return dx + dz + (SQ2 - 2) * Math.min(dx, dz); };
  const g = new Float64Array(cols * rows).fill(Infinity);
  const from = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  // 작은 이진 힙: [f, 칸 번호]
  const heap = [];
  const push = (f, k) => {
    heap.push([f, k]);
    let c = heap.length - 1;
    while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  const s = idx(...start), t = idx(...goal);
  g[s] = 0;
  push(h(...start), s);
  let expanded = 0;
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue;
    if (k === t) break;
    if (++expanded > maxNodes) return null; // 너무 멀리 돌아가야 하면 포기한다(한 프레임이 멈추지 않게)
    closed[k] = 1;
    const i = k % cols, j = (k - i) / cols;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (!inside(ni, nj) || blocked(ni, nj)) continue;
        if (di && dj && (blocked(i + di, j) || blocked(i, j + dj))) continue; // 모서리 가로지르기 금지
        const nk = idx(ni, nj), cost = g[k] + (di && dj ? SQ2 : 1);
        if (cost < g[nk]) { g[nk] = cost; from[nk] = k; push(cost + h(ni, nj), nk); }
      }
    }
  }
  if (g[t] === Infinity) return null;
  const path = [];
  for (let k = t; k !== -1; k = from[k]) path.push([k % cols, Math.floor(k / cols)]);
  return path.reverse();
}

/**
 * 곧장 갈 수 있는 점은 건너뛰어 꺾이는 곳만 남긴다. clear(a, b): a 에서 b 까지 막힘없이 갈 수 있는지.
 */
export function smoothPath(points, clear) {
  if (points.length < 3) return points.slice();
  const out = [points[0]];
  let a = 0;
  while (a < points.length - 1) {
    let b = points.length - 1;
    while (b > a + 1 && !clear(points[a], points[b])) b--;
    out.push(points[b]);
    a = b;
  }
  return out;
}
