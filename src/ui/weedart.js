// 풀 도감 그림: 풀 10종을 손그림 느낌의 SVG 로(갈색 테두리, 둥근 끝). 64 × 64 칸, 바닥 그림자 위에 선다.

const L = '#5a4431';
const S = `stroke="${L}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const ground = `<ellipse cx="32" cy="57" rx="17" ry="4" fill="#e6d8b8"/>`;
/** 바닥(32, 56)에서 뻗는 잎 하나: 끝(tx, ty), 굵기 w. */
const blade = (tx, ty, w, fill) => {
  const mx = (32 + tx) / 2, my = (56 + ty) / 2;
  return `<path d="M${32 - w} 56 Q${mx - w * 1.4} ${my} ${tx} ${ty} Q${mx + w * 1.4} ${my} ${32 + w} 56 Z" fill="${fill}" ${S}/>`;
};

const ART = {
  weed: () => blade(16, 24, 4, '#6fbf5a') + blade(48, 26, 4, '#6fbf5a') + blade(30, 12, 4.5, '#8fd16a') + blade(40, 34, 3, '#8fd16a'),
  clover: () => {
    const leaf = (cx, cy) => [0, 120, 240].map((a) => {
      const r = (a * Math.PI) / 180, x = cx + Math.sin(r) * 6, y = cy - Math.cos(r) * 6;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#5fb85a" ${S}/>`;
    }).join('');
    return `<path d="M24 56 Q22 44 20 36M40 56 Q42 46 45 40M32 56 V20" fill="none" ${S}/>` + leaf(20, 34) + leaf(45, 38)
      + `<circle cx="32" cy="17" r="8" fill="#fff7fa" ${S}/><path d="M27 15q5 -4 10 0M27 19q5 -4 10 0" fill="none" stroke="#f3b6c9" stroke-width="1.8" stroke-linecap="round"/>`;
  },
  foxtail: () => {
    const head = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="5.5" ry="11" fill="#d8e27a" ${S}/><path d="M-6 -6l-3 -2M-6 0l-3 -1M-6 6l-3 0M6 -6l3 -2M6 0l3 -1M6 6l3 0" stroke="${L}" stroke-width="1.6" stroke-linecap="round"/></g>`;
    return `<path d="M32 56 Q24 40 18 24M32 56 Q36 36 34 16M32 56 Q42 42 48 30" fill="none" ${S}/>` + head(18, 20, -20) + head(34, 12, 5) + head(48, 26, 25)
      + blade(24, 44, 2.5, '#7fbe54') + blade(42, 46, 2.5, '#7fbe54');
  },
  vine: () => `<path d="M10 52 Q14 30 30 32 Q44 34 40 22 Q36 12 26 18 Q20 24 28 26" fill="none" stroke="#4b8b3b" stroke-width="5" stroke-linecap="round"/>
    <path d="M10 52 Q14 30 30 32 Q44 34 40 22 Q36 12 26 18 Q20 24 28 26" fill="none" stroke="${L}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
    <path d="M30 56 Q48 50 54 36" fill="none" stroke="#4b8b3b" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="18" cy="40" rx="7" ry="4" transform="rotate(-30 18 40)" fill="#5cae4f" ${S}/><ellipse cx="44" cy="30" rx="7" ry="4" transform="rotate(40 44 30)" fill="#6dbd5a" ${S}/>
    <ellipse cx="48" cy="48" rx="7" ry="4" transform="rotate(-20 48 48)" fill="#5cae4f" ${S}/><circle cx="31" cy="23" r="4" fill="#9a7fd8" ${S}/>`,
  thorny: () => `<path d="M32 56 L28 18 Q32 10 36 18 Z" fill="#8a6fb0" ${S}/>
    <path d="M30 44 L18 38 L30 38 M34 36 L46 28 L34 30 M30 28 L20 22 L30 24" fill="#6b4f93" ${S}/>
    <circle cx="32" cy="13" r="6" fill="#e0524f" ${S}/>`,
  reed: () => {
    const stalk = (x, top, lean) => `<path d="M${x} 56 Q${x + lean / 2} ${(56 + top) / 2} ${x + lean} ${top}" fill="none" stroke="#9fbf5a" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="${x + lean - 3.5}" y="${top + 4}" width="7" height="14" rx="3.5" fill="#7a5232" ${S}/>`;
    return `<path d="M8 50 Q32 46 56 50" fill="none" stroke="#86d3f2" stroke-width="3" stroke-linecap="round"/>` + stalk(24, 8, -4) + stalk(34, 4, 2) + stalk(43, 14, 5)
      + blade(18, 30, 2.4, '#8fb85a') + blade(48, 32, 2.4, '#a7c96a');
  },
  rockmoss: () => `<path d="M10 56 Q8 40 22 34 Q34 26 46 34 Q58 40 54 56 Z" fill="#b5afa6" ${S}/>
    <path d="M18 38 Q24 28 34 32 Q42 26 48 36 Q40 40 32 38 Q24 42 18 38Z" fill="#7fae5a" ${S}/>
    <path d="M44 48 Q48 42 54 46 Q52 52 46 52Z" fill="#93c46a" ${S}/>
    <circle cx="26" cy="31" r="2.6" fill="#fff3b0" stroke="${L}" stroke-width="1.4"/><circle cx="40" cy="29" r="2.6" fill="#fff3b0" stroke="${L}" stroke-width="1.4"/>`,
  moongrass: () => `<circle cx="32" cy="16" r="13" fill="#c9f4ff" opacity="0.45"/>` + blade(18, 28, 2.6, '#9fd8c8') + blade(46, 30, 2.6, '#bfe8dc') + blade(26, 22, 2.4, '#bfe8dc')
    + `<path d="M32 56 V22" fill="none" stroke="#a9dcc9" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="16" r="7" fill="#e6fbff" ${S}/><circle cx="29.5" cy="13.5" r="2" fill="#fff"/>`,
  giantweed: () => blade(10, 22, 5, '#5aaa4a') + blade(54, 24, 5, '#5aaa4a') + blade(20, 12, 5, '#77c35c') + blade(46, 14, 5, '#77c35c')
    + `<path d="M32 56 V12" fill="none" stroke="#6cb054" stroke-width="3.4" stroke-linecap="round"/>`
    + [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return `<ellipse cx="${(32 + Math.sin(r) * 6).toFixed(1)}" cy="${(10 - Math.cos(r) * 6).toFixed(1)}" rx="4.5" ry="3.4" fill="#ffd94a" ${S}/>`; }).join('')
    + `<circle cx="32" cy="10" r="4" fill="#e08a2e" ${S}/>`,
  poisonweed: () => blade(14, 34, 4, '#6a3f86') + blade(50, 34, 4, '#6a3f86') + blade(24, 26, 3.5, '#7f4f9e') + blade(42, 26, 3.5, '#7f4f9e')
    + `<circle cx="20" cy="40" r="2" fill="#b6e04a"/><circle cx="45" cy="38" r="2" fill="#b6e04a"/>
    <ellipse cx="32" cy="24" rx="8" ry="9" fill="#a3d14a" ${S}/><circle cx="29" cy="22" r="2" fill="#6a3f86"/><circle cx="35" cy="27" r="1.6" fill="#6a3f86"/>
    <circle cx="42" cy="10" r="3" fill="#c8f07a" ${S}/><circle cx="24" cy="8" r="2.2" fill="#c8f07a" stroke="${L}" stroke-width="1.6"/>`
};

/** 풀 그림 SVG 문자열. */
export function weedSvg(kind) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${ground}${(ART[kind] || ART.weed)()}</svg>`;
}
