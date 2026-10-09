import { WORLD_HALF, VILLAGE_R, GATE_HALF, PLAZA, ROADS, LOTS, CAVE, regionAt, isWater, lotRadius } from '../core/layout.js';
import { N, CELL, cellOf, isExplored } from '../core/explore.js';

/** 바탕 그림: 월드 1칸 = 4px(640 × 640). 2px 마다 구역 · 물을 본다. */
const BASE_PPU = 4;
const BASE_SIZE = WORLD_HALF * 2 * BASE_PPU;
const BASE_STEP = 2;
/** 배율(월드 1칸이 화면 몇 px): 처음 7(폰 화면 가로에 40칸 남짓), 2.6 ~ 16. */
const SCALE_START = 7, SCALE_MIN = 2.6, SCALE_MAX = 16;
/** +/− 단추 한 번에 바뀌는 배율. */
const BTN_ZOOM = 1.35;
/** 이 배율보다 작으면 이름표를 안 그린다(너무 빽빽하다). */
const LABEL_MIN_SCALE = 4.5;
const REGION_COLORS = { village: '#b8e59a', forest: '#7cbf72', mountain: '#c9c1ae', fields: '#d6f0a6', river: '#b8e59a' };
const WATER = '#86cdee', ROAD = '#f2dca6', INK = '#5a4431', PAPER = '#efe4c6', PINK = '#f06a8f';
const FONT = '700 12px "Pretendard Variable", "Malgun Gothic", sans-serif';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let base = null; // 한 번만 그리는 바탕(구역 · 물), 모든 지도가 같이 쓴다

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const groundColor = (x, z) => (isWater(x, z) ? WATER : REGION_COLORS[regionAt(x, z)]);

/** 바탕: 구역 색과 물만. 한 줄에서 같은 색이 이어지면 한 번에 칠한다. */
function buildBase() {
  const c = document.createElement('canvas');
  c.width = c.height = BASE_SIZE;
  const g = c.getContext('2d');
  for (let py = 0; py < BASE_SIZE; py += BASE_STEP) {
    const z = (py + BASE_STEP / 2) / BASE_PPU - WORLD_HALF;
    let runStart = 0, runColor = null;
    for (let px = 0; px <= BASE_SIZE; px += BASE_STEP) {
      const color = px < BASE_SIZE ? groundColor((px + BASE_STEP / 2) / BASE_PPU - WORLD_HALF, z) : null;
      if (color === runColor) continue;
      if (runColor) { g.fillStyle = runColor; g.fillRect(runStart, py, px - runStart, BASE_STEP); }
      runStart = px;
      runColor = color;
    }
  }
  return c;
}

/**
 * 안개: 칸당 1px, 안 가 본 칸만 종이색. 테두리에 끝 칸을 한 줄 더 붙여(N + 2) 두어,
 * 부드럽게 늘려 그려도 월드 가장자리에서 안개가 흐려지지 않는다(ctx.filter 는 Safari 에서 안 된다).
 */
function buildFog(explored) {
  const seen = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) seen.push(isExplored(explored, i, j));
  const c = document.createElement('canvas');
  c.width = c.height = N + 2;
  const f = c.getContext('2d');
  f.fillStyle = PAPER;
  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      if (!seen[clamp(j, 0, N - 1) * N + clamp(i, 0, N - 1)]) f.fillRect(i + 1, j + 1, 1, 1);
    }
  }
  return c;
}

/**
 * 지도 앱의 끌기 · 확대 지도: 월드 전체가 아니라 내 주변만 크게 보여 준다.
 * 한 손가락(마우스)으로 끌면 움직이고, 휠 · 두 손가락 벌리기 · +/− 단추로 확대 · 축소, '내 위치' 로 나에게 돌아온다.
 * 바탕(구역 · 물)은 한 번 그려 두고, 길 · 울타리 · 건물 · 동굴 · 이름표 · 내 위치는 그릴 때마다 벡터로 그려 어느 배율에서도 또렷하다.
 * 안 가 본 칸은 종이색 구름으로 덮고, 이름표는 가 본 칸에 있는 것만 배율 4.5 이상에서 서로 겹치지 않게 보인다.
 * host: 빈 div. opts: { explored: 탐험 문자열, player: { x, z, yaw } | null, labels: [{ x, z, text }] }
 * → { recenter(), zoomBy(factor), destroy() }
 */
export function createMapView(host, opts = {}) {
  const { explored = '', labels = [], friends = [] } = opts;
  const p = opts.player;
  const player = p && Number.isFinite(p.x) && Number.isFinite(p.z) ? p : null;

  host.classList.add('mapview');
  const canvas = document.createElement('canvas');
  canvas.className = 'mapview-canvas';
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  const north = document.createElement('div');
  north.className = 'mapview-north';
  north.setAttribute('aria-hidden', 'true');
  north.textContent = 'N';
  const btns = document.createElement('div');
  btns.className = 'mapview-btns';
  const button = (cls, label, text, act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    if (act) b.dataset.act = act;
    b.setAttribute('aria-label', label);
    b.textContent = text;
    btns.appendChild(b);
    return b;
  };
  const inBtn = button('mapview-btn', '확대', '+', 'in');
  const outBtn = button('mapview-btn', '축소', '−', 'out');
  const meBtn = button('mapview-btn mapview-me', '내 위치로', '내 위치');
  host.append(canvas, north, btns);

  if (!base) base = buildBase();
  const fog = buildFog(explored);
  // 이름표는 가 본 칸에 있는 것만(한 번만 고른다)
  const shown = labels.filter((l) => {
    const [i, j] = cellOf(l.x, l.z);
    return isExplored(explored, i, j);
  });
  const g = canvas.getContext('2d');
  // 마을 친구들 얼굴(지금 있는 곳): SVG 를 그림으로 바꿔 두고, 다 읽히면 다시 그린다
  const faces = friends.filter((f) => Number.isFinite(f.x) && Number.isFinite(f.z)).map((f) => {
    const img = new Image();
    img.onload = () => draw();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    return { ...f, img };
  });

  // 보기 상태: 화면 가운데의 월드 좌표(cx, cz) 와 배율(CSS px / 월드 1칸). 화면 크기는 CSS px
  let cx = player ? player.x : 0, cz = player ? player.z : 0, scale = SCALE_START;
  let cssW = 0, cssH = 0, kx = 1, ky = 1, destroyed = false;
  const sx = (x) => (x - cx) * scale + cssW / 2;
  const sy = (z) => (z - cz) * scale + cssH / 2;

  /** 월드 끝 너머가 안 보이게 가운데를 붙잡는다. 화면이 월드보다 넓은 축은 0 에 둔다. */
  function clampCentre() {
    const hw = cssW / 2 / scale, hh = cssH / 2 / scale;
    cx = hw >= WORLD_HALF ? 0 : clamp(cx, -WORLD_HALF + hw, WORLD_HALF - hw);
    cz = hh >= WORLD_HALF ? 0 : clamp(cz, -WORLD_HALF + hh, WORLD_HALF - hh);
  }
  function pan(dx, dy) {
    cx -= dx / scale;
    cz -= dy / scale;
    clampCentre();
  }
  /** 화면의 (px, py) 아래 월드 지점이 그 자리에 머물도록 배율을 바꾼다. */
  function zoomAt(px, py, factor) {
    const next = clamp(scale * factor, SCALE_MIN, SCALE_MAX);
    if (!Number.isFinite(next) || next === scale) return;
    const wx = cx + (px - cssW / 2) / scale, wz = cz + (py - cssH / 2) / scale;
    scale = next;
    cx = wx - (px - cssW / 2) / scale;
    cz = wz - (py - cssH / 2) / scale;
    clampCentre();
  }

  /** host 크기에 맞춰 캔버스 화소 수를 고친다(화면 배율은 2 까지). 아직 크기가 없으면 false. */
  function fit() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    cssW = w;
    cssH = h;
    kx = bw / w;
    ky = bh / h;
    clampCentre();
    return true;
  }

  function drawGround() {
    const hw = cssW / 2 / scale, hh = cssH / 2 / scale;
    const x0 = Math.max(cx - hw, -WORLD_HALF), x1 = Math.min(cx + hw, WORLD_HALF);
    const z0 = Math.max(cz - hh, -WORLD_HALF), z1 = Math.min(cz + hh, WORLD_HALF);
    if (x1 <= x0 || z1 <= z0) return;
    g.imageSmoothingEnabled = true;
    g.drawImage(base, (x0 + WORLD_HALF) * BASE_PPU, (z0 + WORLD_HALF) * BASE_PPU, (x1 - x0) * BASE_PPU, (z1 - z0) * BASE_PPU,
      sx(x0), sy(z0), (x1 - x0) * scale, (z1 - z0) * scale);
  }

  function drawRoads() {
    g.fillStyle = ROAD;
    g.beginPath();
    g.arc(sx(PLAZA.x), sy(PLAZA.z), PLAZA.r * scale, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ROAD;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of ROADS) {
      g.lineWidth = r.w * scale;
      g.beginPath();
      r.pts.forEach(([x, z], k) => (k ? g.lineTo(sx(x), sy(z)) : g.moveTo(sx(x), sy(z))));
      g.stroke();
    }
  }

  /** 마을 울타리: 동서남북 문 자리는 비워 둔다(길이 그 사이로 들어간다). */
  function drawFence() {
    const R = VILLAGE_R + 0.5, gap = GATE_HALF / R;
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(sx(0), sy(0), R * scale, (k * Math.PI) / 2 + gap, ((k + 1) * Math.PI) / 2 - gap);
      g.stroke();
    }
  }

  function drawBuildings() {
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    for (const lot of LOTS) {
      const s = clamp(lotRadius(lot) * scale * 1.6, 8, 28), x = sx(lot.x), y = sy(lot.z);
      if (x + s < 0 || x - s > cssW || y + s < 0 || y - s > cssH) continue;
      g.fillStyle = lot.roof || (lot.kind === 'dome' ? '#fbfaf5' : '#e8c99a');
      roundRect(g, x - s / 2, y - s / 2, s, s, s * 0.28);
      g.fill();
      g.stroke();
    }
    // 하치와레네 동굴: 입구가 남쪽인 어두운 반원
    g.fillStyle = INK;
    g.beginPath();
    g.arc(sx(CAVE.x), sy(CAVE.z), clamp(CAVE.r * scale * 0.9, 6, 30), Math.PI, 0);
    g.closePath();
    g.fill();
  }

  /** 안개는 월드 사각형(+ 테두리 한 칸)에 맞춰 늘려 그려, 어느 배율에서도 안 가 본 곳을 덮는다. */
  function drawFog() {
    g.save();
    g.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
    const pad = WORLD_HALF + CELL;
    g.drawImage(fog, sx(-pad), sy(-pad), pad * 2 * scale, pad * 2 * scale);
    g.restore();
  }

  /** 이름표: 화면 가운데에 가까운 것부터, 이미 그린 이름표와 겹치면 건너뛴다. */
  function drawLabels() {
    if (scale < LABEL_MIN_SCALE || !shown.length) return;
    g.font = FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const H = 20, lift = clamp(1.7 * scale * 0.8, 4, 14) + 3, taken = [];
    const items = shown.map((l) => ({ text: l.text, x: sx(l.x), y: sy(l.z) }));
    items.sort((a, b) => Math.hypot(a.x - cssW / 2, a.y - cssH / 2) - Math.hypot(b.x - cssW / 2, b.y - cssH / 2));
    for (const it of items) {
      const w = g.measureText(it.text).width + 14, r = { x: it.x - w / 2, y: it.y - lift - H, w, h: H };
      if (r.x > cssW || r.x + w < 0 || r.y > cssH || r.y + H < 0) continue;
      const hit = taken.some((t) => r.x < t.x + t.w + 2 && t.x < r.x + r.w + 2 && r.y < t.y + t.h + 2 && t.y < r.y + r.h + 2);
      if (hit) continue;
      taken.push(r);
      g.fillStyle = 'rgba(255, 250, 235, 0.94)';
      g.strokeStyle = 'rgba(90, 68, 49, 0.28)';
      g.lineWidth = 1;
      roundRect(g, r.x, r.y, w, H, H / 2);
      g.fill();
      g.stroke();
      g.fillStyle = INK;
      g.fillText(it.text, it.x, r.y + H / 2 + 0.5);
    }
  }

  /** 친구 얼굴: 흰 동그라미 안에 얼굴, 아래로 짧은 꼬리(그 자리를 가리킨다). */
  function drawFriends() {
    for (const f of faces) {
      const x = sx(f.x), y = sy(f.z) - 14;
      if (x < -20 || x > cssW + 20 || y < -20 || y > cssH + 30) continue;
      g.beginPath();
      g.moveTo(x - 4, y + 9);
      g.lineTo(x, y + 15);
      g.lineTo(x + 4, y + 9);
      g.closePath();
      g.fillStyle = '#ffffff';
      g.fill();
      g.beginPath();
      g.arc(x, y, 11.5, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = 'rgba(90, 68, 49, 0.35)';
      g.stroke();
      if (f.img.complete && f.img.naturalWidth) {
        g.save();
        g.beginPath();
        g.arc(x, y, 10, 0, Math.PI * 2);
        g.clip();
        g.drawImage(f.img, x - 12, y - 11, 24, 24);
        g.restore();
      }
    }
  }

  /** 내 위치: 흰 테두리 분홍 점, 바라보는 쪽(월드 (sin yaw, cos yaw))으로 작은 분홍 화살표. */
  function drawPlayer() {
    if (!player) return;
    const x = sx(player.x), y = sy(player.z);
    if (Number.isFinite(player.yaw)) {
      const dx = Math.sin(player.yaw), dy = Math.cos(player.yaw), nx = -dy, ny = dx;
      g.beginPath();
      g.moveTo(x + dx * 14, y + dy * 14);
      g.lineTo(x + dx * 5 + nx * 5, y + dy * 5 + ny * 5);
      g.lineTo(x + dx * 5 - nx * 5, y + dy * 5 - ny * 5);
      g.closePath();
      g.lineJoin = 'round';
      g.lineWidth = 2;
      g.strokeStyle = '#ffffff';
      g.fillStyle = PINK;
      g.stroke();
      g.fill();
    }
    g.beginPath();
    g.arc(x, y, 6.5, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(90, 68, 49, 0.35)';
    g.stroke();
    g.beginPath();
    g.arc(x, y, 4.5, 0, Math.PI * 2);
    g.fillStyle = PINK;
    g.fill();
  }

  function draw() {
    if (destroyed || !cssW || !cssH) return;
    g.setTransform(kx, 0, 0, ky, 0, 0);
    g.fillStyle = PAPER;
    g.fillRect(0, 0, cssW, cssH);
    drawGround();
    drawRoads();
    drawFence();
    drawBuildings();
    drawFog();
    drawLabels();
    drawFriends();
    drawPlayer();
  }

  // 손가락 · 마우스: 하나면 끌기, 둘이면 벌린 만큼 확대하면서 가운데를 따라 움직인다
  const pointers = new Map(); // pointerId → { x, y } (캔버스 안 CSS px)
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (r.width ? cssW / r.width : 1), y: (e.clientY - r.top) * (r.height ? cssH / r.height : 1) };
  }
  const pinchOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) });
  function release(e) {
    if (!pointers.delete(e.pointerId)) return;
    if (!pointers.size) canvas.style.cursor = 'grab';
  }
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    pointers.set(e.pointerId, local(e));
    try { canvas.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 캔버스 위에서는 그대로 끌린다 */ }
    canvas.style.cursor = 'grabbing';
  }
  function onMove(e) {
    const cur = pointers.get(e.pointerId);
    if (!cur) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { release(e); return; } // 놓친 pointerup
    const next = local(e);
    const pts = [...pointers.values()];
    if (pts.length === 1) {
      pan(next.x - cur.x, next.y - cur.y);
      cur.x = next.x;
      cur.y = next.y;
    } else {
      const [a, b] = pts, before = pinchOf(a, b);
      cur.x = next.x;
      cur.y = next.y;
      const after = pinchOf(a, b);
      pan(after.x - before.x, after.y - before.y);
      if (before.d > 0 && after.d > 0) zoomAt(after.x, after.y, after.d / before.d);
    }
    draw();
  }
  function onWheel(e) {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * cssH : e.deltaY;
    const at = local(e);
    zoomAt(at.x, at.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015))); // ctrlKey: 터치패드 오므리기는 값이 작다
    draw();
  }
  function recenter() {
    if (destroyed) return;
    cx = player ? player.x : 0;
    cz = player ? player.z : 0;
    clampCentre();
    draw();
  }
  function zoomBy(factor) {
    if (destroyed) return;
    zoomAt(cssW / 2, cssH / 2, factor);
    draw();
  }
  const onIn = () => zoomBy(BTN_ZOOM), onOut = () => zoomBy(1 / BTN_ZOOM);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  host.addEventListener('wheel', onWheel, { passive: false }); // 단추 위에서 굴려도 확대된다
  inBtn.addEventListener('click', onIn);
  outBtn.addEventListener('click', onOut);
  meBtn.addEventListener('click', recenter);

  // host 가 아직 크기가 없을 수 있다: 크기가 생기거나 바뀔 때마다 맞추고 다시 그린다
  const ro = new ResizeObserver(() => { if (!destroyed && fit()) draw(); });
  ro.observe(host);
  if (fit()) draw();

  return {
    recenter,
    zoomBy,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
      canvas.removeEventListener('lostpointercapture', release);
      host.removeEventListener('wheel', onWheel);
      inBtn.removeEventListener('click', onIn);
      outBtn.removeEventListener('click', onOut);
      meBtn.removeEventListener('click', recenter);
      pointers.clear();
    }
  };
}
