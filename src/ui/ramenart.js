// 라멘 로우 주방 그림: 그릇(뇌문 띠를 두른 빨간 돈부리) · 수프 · 면 · 토핑 · 재료 통 · 냄비. 모두 SVG 문자열.
// 토핑은 한 벌의 그리기 함수(TOP)를 그릇 안과 재료 통에서 같이 써서, 통에서 집은 것이 그릇에 그대로 올라간 것처럼 보이게 한다.

const SOUP_TONE = {
  shoyu: ['#c98448', '#8f4f1d'], miso: ['#e5ad64', '#b0742f'], shio: ['#f7e9b8', '#d9bd72'], tonkotsu: ['#fcf5e6', '#e2cfac']
};
const NOODLE = { thin: ['#f6dc86', '#c99a3c'], thick: ['#f1cf68', '#b98a2c'] };
let uid = 0;

// ---------- 토핑 하나(자기 자리 0,0 둘레에 그린다) ----------
/** 정해진 흔들림(같은 그림이 매번 같게). */
const wob = (i, a) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * a;
const TOP = {
  chashu: () => `<ellipse cx="1" cy="3.5" rx="20" ry="11" fill="#3b2414" opacity=".16"/>
    <ellipse rx="20" ry="13" fill="#a35a32" stroke="#6b3a20" stroke-width="1.4"/>
    <ellipse cy="-.7" rx="16.4" ry="10" fill="#eab48d"/>
    <path d="M-9 1c0-6 9-8 13-4s1 9-5 8-6-6-1-6 5 3 3 5" fill="none" stroke="#fde6d3" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M6-6c4 1 7 4 6 8M-14-2c1-3 3-5 6-6" fill="none" stroke="#c97b55" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="-6" cy="-6.2" rx="6" ry="1.7" fill="#fff" opacity=".38"/>`,
  egg: () => `<ellipse cx="1" cy="3.5" rx="15" ry="8" fill="#3b2414" opacity=".15"/>
    <ellipse rx="15" ry="10" fill="#e6c38a" stroke="#a87b3e" stroke-width="1.3"/>
    <ellipse cy="-.6" rx="12.4" ry="7.8" fill="#fff8ea"/>
    <ellipse cy="-.4" rx="7.4" ry="4.9" fill="#ffc84a"/>
    <ellipse cy="-.2" rx="4.8" ry="3.1" fill="#f3960f"/>
    <ellipse cx="-2.4" cy="-2" rx="2.2" ry="1" fill="#fff" opacity=".75"/>`,
  nori: () => `<path d="M-10 10L-12-22L11-25L12 8Z" fill="#1d3124" stroke="#0e1a12" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M-8-14L8-16M-8-4L9-6M-7 4L10 2" stroke="#33503d" stroke-width="1.1"/>
    <path d="M-10.6-19L-9.4 6" stroke="#4c705a" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
  negi: () => [[-9, -2], [-2, -4.5], [5, -2.5], [11, 0.5], [-5, 2.5], [2, 2.5], [8.5, 4.5], [-11, 4], [0, -1]].map(([x, y]) =>
    `<ellipse cx="${x}" cy="${y}" rx="3.3" ry="2.5" fill="#ecf8db" stroke="#4f9c47" stroke-width="1.3"/><ellipse cx="${x}" cy="${y}" rx="1.4" ry="1" fill="#8fcf6e"/>`).join(''),
  moyashi: () => {
    const sp = [[-14, 2, 9, -7, 18, -2], [-10, -4, 8, 6, 17, 2], [-4, 4, 6, -8, 14, -5], [-6, -6, 9, -3, 19, 4], [0, 0, 7, 7, 15, 3],
      [2, -6, 7, -3, 13, 5], [-12, 6, 8, -3, 16, 0], [4, 3, 6, -6, 12, -8], [-2, -2, 8, -7, 14, 1]];
    return `<ellipse cx="2" cy="4" rx="19" ry="7" fill="#3b2414" opacity=".12"/>` + sp.map(([x, y, a, b, c, d]) => {
      const p = `M${x} ${y}q${a} ${b} ${c} ${d}`;
      return `<path d="${p}" stroke="#cdbf94" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="${p}" stroke="#fdf9ea" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
        + `<ellipse cx="${x + c}" cy="${y + d}" rx="2.4" ry="1.9" fill="#f2dc7c" stroke="#c4a649" stroke-width=".8"/>`;
    }).join('');
  },
  corn: () => `<ellipse cx="1" cy="3" rx="15" ry="7" fill="#3b2414" opacity=".13"/>` + Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 * 2.3, r = 3 + (i % 5) * 2.2, x = Math.cos(a) * r * 1.3 + wob(i, 2), y = Math.sin(a) * r * 0.55 + wob(i + 7, 2);
    return `<rect x="${(x - 2.4).toFixed(1)}" y="${(y - 2.2).toFixed(1)}" width="4.8" height="4.4" rx="1.5" fill="#ffd54f" stroke="#d39a1c" stroke-width=".9"/><rect x="${(x - 1.4).toFixed(1)}" y="${(y - 1.5).toFixed(1)}" width="1.6" height="1.2" rx=".6" fill="#fff6c8"/>`;
  }).join(''),
  butter: () => `<ellipse cy="5" rx="14" ry="5.5" fill="#fff3bf" opacity=".85"/>
    <path d="M-9-1L1-6L11-2L1 3Z" fill="#fff4b0" stroke="#c9a43c" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-9-1L1 3L1 9L-9 4Z" fill="#f7da78" stroke="#c9a43c" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M1 3L11-2L11 4L1 9Z" fill="#ecc85c" stroke="#c9a43c" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="-1" cy="-2.4" rx="3.2" ry="1" fill="#fff" opacity=".7"/>`,
  garlic: () => `<ellipse cx="1" cy="3" rx="13" ry="6" fill="#3b2414" opacity=".12"/>`
    + [[-7, -1], [-2, 2], [3, -2], [7, 2], [-4, -4], [1, 4], [5, -5], [-9, 3]].map(([x, y], i) =>
      `<path d="M${x - 2} ${y}l1.8-2 2.4.5.6 2.2-2 1.6-2.4-.6z" fill="#f8f0dc" stroke="#c8b48a" stroke-width=".9" transform="rotate(${i * 37} ${x} ${y})"/>`).join('')
    + `<ellipse cx="-3" cy="-5" rx="4.6" ry="3" fill="#faf3e1" stroke="#c8b48a" stroke-width="1"/><ellipse cx="-3" cy="-5" rx="2" ry="1.2" fill="none" stroke="#e3d3ad" stroke-width=".9"/>`
};
/** 토핑 하나를 (x, y) 에 크기 s 로. cls 를 주면 바깥 묶음에 붙인다(새로 올린 것 → 'drop', CSS 움직임이 자리 옮김을 덮지 않게 한 겹 더 싼다). */
export const topping = (id, x, y, s = 1, cls = '') => {
  const g = `<g transform="translate(${x} ${y}) scale(${s})">${TOP[id]()}</g>`;
  return cls ? `<g class="${cls}">${g}</g>` : g;
};
/** 재료 작은 그림(주문표 · 체크 칩): 24 × 18. */
export function ingIcon(id, kind, color) {
  let inner;
  if (kind === 'soup') inner = `<ellipse cx="12" cy="10" rx="10" ry="6" fill="${SOUP_TONE[id][0]}" stroke="${SOUP_TONE[id][1]}" stroke-width="1.6"/><ellipse cx="9" cy="8.6" rx="3" ry="1" fill="#fff" opacity=".5"/>`;
  else if (kind === 'noodle') inner = `<path d="M3 11q4.5-5 9 0t9 0M3 7q4.5-5 9 0t9 0" fill="none" stroke="${NOODLE[id][1]}" stroke-width="${id === 'thick' ? 4 : 2.6}" stroke-linecap="round"/><path d="M3 11q4.5-5 9 0t9 0M3 7q4.5-5 9 0t9 0" fill="none" stroke="${NOODLE[id][0]}" stroke-width="${id === 'thick' ? 2.6 : 1.4}" stroke-linecap="round"/>`;
  else inner = topping(id, 12, id === 'nori' ? 14 : 10, id === 'nori' ? 0.42 : 0.5);
  return `<svg viewBox="0 0 24 20" aria-hidden="true">${inner}</svg>`;
}

// ---------- 그릇 ----------
// 그릇 안 토핑 자리(두 번째 · 세 번째는 옆에 하나 더). 뒤쪽(작은 y)부터 그려야 겹침이 맞다.
const SPOTS = {
  nori: [[164, 50], [176, 52], [152, 48]],
  chashu: [[82, 62], [100, 57], [66, 68]],
  moyashi: [[124, 60], [138, 66], [112, 66]],
  egg: [[160, 74], [176, 68], [146, 80]],
  butter: [[96, 74], [108, 78], [84, 78]],
  corn: [[88, 84], [104, 88], [74, 86]],
  negi: [[124, 82], [140, 86], [110, 88]],
  garlic: [[150, 90], [162, 86], [138, 92]]
};
const ORDER = ['nori', 'chashu', 'moyashi', 'egg', 'corn', 'butter', 'negi', 'garlic'];
const SOUPS = ['shoyu', 'miso', 'shio', 'tonkotsu'];

/** 이차 베지어 위의 점과 법선. */
function qpt(p0, p1, p2, t) {
  const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
  const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  const len = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / len, ny: dx / len };
}
/** 그릇 띠의 뇌문(네모 물결)을 띠 곡선을 따라. */
const MEANDER = (() => {
  const p0 = [20, 92], p1 = [120, 134], p2 = [220, 92], n = 30;
  let d = '';
  for (let k = 0; k < n; k++) {
    const s = k % 2 ? -3.6 : 3.6, a = qpt(p0, p1, p2, k / n), b = qpt(p0, p1, p2, (k + 1) / n);
    d += `${k ? 'L' : 'M'}${(a.x + a.nx * s).toFixed(1)} ${(a.y + a.ny * s).toFixed(1)}L${(b.x + b.nx * s).toFixed(1)} ${(b.y + b.ny * s).toFixed(1)}`;
  }
  return d;
})();

/** 면 더미: 국물 위로 살짝 솟은 가닥들. */
function noodles(type, id) {
  const thick = type === 'thick', [c, edge] = NOODLE[type], n = thick ? 8 : 12, w = thick ? 4.6 : 2.5;
  let out = '';
  // 가운데 타원(가로 72 · 세로 15) 안에만: 둘레로 국물이 보이게
  for (let i = 0; i < n; i++) {
    const y = 57 + i * (thick ? 3.6 : 2.4), a = 2.2 + (i % 3) * 1.1, ph = i % 2 ? 1 : -1;
    const hw = 72 * Math.sqrt(Math.max(0, 1 - ((y - 70) / 16) ** 2)), seg = 16, steps = Math.max(1, Math.round((hw * 2) / seg));
    const step = (hw * 2) / steps;
    let d = `M${(120 - hw).toFixed(1)} ${y.toFixed(1)}`;
    for (let k = 0; k < steps; k++) d += `q${(step / 2).toFixed(1)} ${(-a * ph).toFixed(1)} ${step.toFixed(1)} 0`;
    out += `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${w + 1.7}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    if (i % 2 === 0) out += `<path d="${d}" fill="none" stroke="#fff6cf" stroke-width="${(w * 0.32).toFixed(1)}" stroke-linecap="round" stroke-dasharray="18 26" stroke-dashoffset="${i * 7}" opacity=".9"/>`;
  }
  // 가운데가 봉긋하게: 위에 한 번 더 접힌 면 다발
  out += `<path d="M78 60q20-14 42-4t42 0" fill="none" stroke="${edge}" stroke-width="${w + 1.7}" stroke-linecap="round"/><path d="M78 60q20-14 42-4t42 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  out += `<path d="M86 66q18-12 36-3t34-1" fill="none" stroke="${edge}" stroke-width="${w + 1.7}" stroke-linecap="round"/><path d="M86 66q18-12 36-3t34-1" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  return `<g class="${id}">${out}</g>`;
}

/**
 * 그릇 그림. bowl = { items }, drop = 방금 넣은 재료 id(그것만 위에서 톡 떨어진다), clean = 빈 그릇이면 바닥 무늬.
 * 수프를 두 가지 넣거나 두 번 넣으면 국물이 탁해진다.
 */
export function bowlSvg(bowl, drop = null) {
  const it = bowl.items, id = 'b' + uid++;
  const soups = SOUPS.filter((s) => it[s]), soup = soups[0];
  const murky = soups.length > 1 || (soup && it[soup] > 1);
  const [lite, dark] = soup ? SOUP_TONE[soup] : ['#f3e9da', '#e2d3bd'];
  let inside = `<ellipse cx="120" cy="70" rx="92" ry="23" fill="url(#${id}s)"/>`;
  if (soup) {
    inside += [[70, 64, 7, 2.4], [150, 60, 5, 1.8], [112, 78, 4, 1.5], [176, 74, 6, 2], [92, 76, 3.5, 1.3], [134, 66, 3, 1.1]].map(([x, y, rx, ry]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".28"/><ellipse cx="${x - rx * 0.3}" cy="${y - ry * 0.3}" rx="${rx * 0.35}" ry="${ry * 0.35}" fill="#fff" opacity=".6"/>`).join('');
    if (murky) inside += '<ellipse cx="120" cy="70" rx="92" ry="23" fill="#7a6a58" opacity=".42"/>';
  } else {
    inside += '<path d="M104 70q8-6 16 0t16 0" fill="none" stroke="#e0cfb4" stroke-width="2" stroke-linecap="round"/>';
  }
  for (const nd of ['thin', 'thick']) if (it[nd]) inside += noodles(nd, drop === nd ? 'drop' : '');
  let tops = '';
  for (const tid of ORDER) {
    const n = Math.min(it[tid] || 0, 3);
    for (let k = 0; k < n; k++) tops += topping(tid, ...SPOTS[tid][k], tid === 'nori' ? 1.3 : 1.3, drop === tid && k === n - 1 ? 'drop' : '');
  }
  const steam = soup ? `<g class="steam" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75">
      <path d="M92 40q-10-12 0-24t0-24"/><path d="M122 34q-10-12 0-24t0-24"/><path d="M152 40q-10-12 0-24t0-24"/></g>` : '';
  return `<svg viewBox="0 -20 240 182" aria-hidden="true">
    <defs>
      <radialGradient id="${id}s" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="${lite}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#f06a58"/><stop offset=".55" stop-color="#d9483b"/><stop offset="1" stop-color="#b8352b"/></linearGradient>
      <clipPath id="${id}c"><ellipse cx="120" cy="70" rx="92" ry="23"/></clipPath>
    </defs>
    <ellipse cx="120" cy="156" rx="86" ry="10" fill="#3b2414" opacity=".2"/>
    <ellipse cx="120" cy="152" rx="36" ry="8" fill="#9c2d25"/>
    <path d="M14 66C20 126 66 154 120 154S220 126 226 66Z" fill="url(#${id}b)" stroke="#8f2a22" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M15.5 80Q120 122 224.5 80L216 104Q120 146 24 104Z" fill="#fff6ec"/>
    <path d="${MEANDER}" fill="none" stroke="#c43d33" stroke-width="2" stroke-linejoin="round"/>
    <path d="M36 118Q60 140 96 146" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".25"/>
    <ellipse cx="120" cy="66" rx="106" ry="30" fill="#fffaf2" stroke="#8f2a22" stroke-width="2.4"/>
    <ellipse cx="120" cy="67" rx="97" ry="26" fill="#efe2cf"/>
    <g clip-path="url(#${id}c)">${inside}</g>
    ${tops}
    <path d="M24 74Q120 112 216 74" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>
    ${steam}
  </svg>`;
}

// ---------- 재료 자리 그림 ----------
const SHADOW = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.18}" fill="#3b2414" opacity=".16"/>`;
/** 수프 통(옆에서 비스듬히, 국자가 걸쳐 있다). */
export function soupPotArt(sid) {
  const [lite, dark] = SOUP_TONE[sid], id = 's' + uid++;
  return `<svg viewBox="0 0 120 92" aria-hidden="true">
    <defs><radialGradient id="${id}" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="${lite}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>
    ${SHADOW(60, 82, 50)}
    <rect x="4" y="44" width="10" height="7" rx="3" fill="#7f8b96"/><rect x="106" y="44" width="10" height="7" rx="3" fill="#7f8b96"/>
    <path d="M12 42V66Q60 90 108 66V42Z" fill="#b7c1ca" stroke="#6f7b86" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M20 70Q60 86 100 70" fill="none" stroke="#dfe5ea" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="60" cy="42" rx="48" ry="15" fill="#e3e8ec" stroke="#6f7b86" stroke-width="2.4"/>
    <ellipse cx="60" cy="43" rx="41" ry="11.5" fill="url(#${id})"/>
    <ellipse cx="46" cy="40" rx="9" ry="2.4" fill="#fff" opacity=".35"/><ellipse cx="72" cy="46" rx="5" ry="1.6" fill="#fff" opacity=".3"/>
    <path d="M80 41L112 12" stroke="#6f7b86" stroke-width="5.4" stroke-linecap="round"/><path d="M80 41L112 12" stroke="#c8d0d7" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="76" cy="43" rx="9" ry="4" fill="#c8d0d7" stroke="#6f7b86" stroke-width="2"/>
    <g class="steam" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".8"><path d="M40 28q-6-8 0-16t0-16"/><path d="M62 24q-6-8 0-16t0-16"/></g>
  </svg>`;
}
/** 대나무 채반에 담긴 면 뭉치. */
export function noodleArt(type) {
  const [c, edge] = NOODLE[type], thick = type === 'thick', w = thick ? 4.2 : 2.2;
  let coils = '';
  for (let k = 0; k < (thick ? 4 : 6); k++) {
    const rx = 30 - k * (thick ? 5 : 3.6), ry = 11 - k * (thick ? 1.6 : 1.1), cy = 48 - k * (thick ? 2.4 : 1.8);
    coils += `<ellipse cx="${60 + wob(k, 6)}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${edge}" stroke-width="${w + 1.6}"/><ellipse cx="${60 + wob(k, 6)}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
  }
  return `<svg viewBox="0 0 120 92" aria-hidden="true">
    ${SHADOW(60, 80, 52)}
    <ellipse cx="60" cy="58" rx="52" ry="20" fill="#b9874a" stroke="#7d5a32" stroke-width="2.4"/>
    <ellipse cx="60" cy="54" rx="44" ry="15" fill="#d6a86a"/>
    <path d="M22 54q38 16 76 0M26 48q34 14 68 0M30 60q30 10 60 0" fill="none" stroke="#b9874a" stroke-width="1.2" stroke-dasharray="3 3"/>
    ${coils}
    <path d="M44 40q8-4 16 0" fill="none" stroke="#fff6cf" stroke-width="${(w * 0.4).toFixed(1)}" stroke-linecap="round"/>
  </svg>`;
}
/** 토핑 통(스테인리스 바트)에 담긴 토핑. */
const PAN_FILL = {
  chashu: [[40, 50, 1.3], [80, 50, 1.3], [60, 42, 1.3]],
  egg: [[38, 50, 1.3], [82, 50, 1.3], [60, 40, 1.3]],
  negi: [[40, 44, 1.6], [80, 46, 1.6], [60, 58, 1.5]],
  moyashi: [[42, 46, 1.7], [80, 50, 1.7]],
  corn: [[40, 46, 1.8], [80, 50, 1.8]],
  butter: [[38, 44, 1.6], [62, 56, 1.6], [86, 42, 1.6]],
  garlic: [[42, 46, 1.9], [80, 50, 1.9]]
};
export function panArt(tid) {
  let fill;
  if (tid === 'nori') {
    // 김은 바트 안에 비스듬히 겹쳐 세워 둔다
    fill = [[34, 62], [52, 60], [70, 58], [88, 56]].map(([x, y]) => topping('nori', x, y, 1.2)).join('');
  } else fill = PAN_FILL[tid].map(([x, y, s]) => topping(tid, x, y, s)).join('');
  return `<svg viewBox="0 0 120 92" aria-hidden="true">
    ${SHADOW(60, 84, 54)}
    <rect x="6" y="18" width="108" height="64" rx="11" fill="#9aa6b1"/>
    <rect x="6" y="14" width="108" height="64" rx="11" fill="#e8edf1" stroke="#8e9aa5" stroke-width="2.4"/>
    <rect x="14" y="21" width="92" height="50" rx="7" fill="#cfd8df"/>
    <path d="M18 24h84" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    ${fill}
  </svg>`;
}
/** 그릇 비우기(음식물 통). */
export const TRASH_ART = `<svg viewBox="0 0 80 80" aria-hidden="true">${SHADOW(40, 74, 26)}<path d="M18 24h44l-5 46H23z" fill="#8d969f" stroke="#5f6770" stroke-width="2.6" stroke-linejoin="round"/><rect x="12" y="16" width="56" height="9" rx="4" fill="#a7b0b8" stroke="#5f6770" stroke-width="2.6"/><rect x="32" y="10" width="16" height="7" rx="3" fill="#5f6770"/><path d="M31 34v26M40 34v26M49 34v26" stroke="#6b747c" stroke-width="2.6" stroke-linecap="round"/></svg>`;

/** 위에서 본 면 냄비. st: 'empty' | 'boiling' | 'ready' | 'soggy'. 둘레의 시간 고리는 따로(ring) 돌린다. */
export function boilerArt(st, type) {
  const on = st !== 'empty';
  const water = on ? '#86c8ea' : '#bfe3f4';
  let noodle = '';
  if (type) {
    const [c, edge] = st === 'soggy' ? ['#e3d6b0', '#b9a97a'] : NOODLE[type], w = type === 'thick' ? 4.2 : 2.4;
    for (let k = 0; k < 4; k++) {
      const r = 22 - k * 4.5, d = `M${60 - r} 60a${r} ${r * 0.92} 0 1 1 ${r * 1.6} ${r * 0.6}`;
      noodle += `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${w + 1.6}" stroke-linecap="round" transform="rotate(${k * 70} 60 60)"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" transform="rotate(${k * 70} 60 60)"/>`;
    }
  }
  const bubbles = st === 'boiling' || st === 'ready'
    ? [[44, 44, 3], [78, 50, 2.4], [52, 78, 2.6], [80, 74, 3.2], [62, 36, 2]].map(([x, y, r], i) => `<circle class="bub" style="animation-delay:${i * 0.17}s" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e8f6fd" stroke-width="1.6"/>`).join('') : '';
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <rect x="2" y="54" width="14" height="12" rx="4" fill="#7f8b96"/><rect x="104" y="54" width="14" height="12" rx="4" fill="#7f8b96"/>
    <circle cx="60" cy="60" r="44" fill="#c5ced6" stroke="#6f7b86" stroke-width="3"/>
    <circle cx="60" cy="60" r="37" fill="${water}"/>
    <path d="M32 46a32 32 0 0 1 22-16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    ${noodle}${bubbles}
  </svg>`;
}
