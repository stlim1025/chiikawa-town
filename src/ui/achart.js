/**
 * 업적 앱 그림(게임 오리지널): 맨 위 트로피, 묶음 아이콘, 리본 달린 메달.
 * 메달 등급: 칭호를 주는 업적은 금, 1,500원 이상은 은, 나머지는 동. 아직 못 이룬 업적은 등급과 상관없이 회색 메달에 자물쇠.
 */

/** 묶음마다 리본 · 아이콘 바탕 색. */
export const GROUP_COLOR = { dex: '#6fa8dc', hunt: '#e8746a', friend: '#f28fb0', life: '#7cc46a', season: '#e8a93c', story: '#a58bd0' };

/** 묶음 아이콘 모양(20 × 20 칸): 도감 책, 토벌 검, 친구 하트, 생활 집, 계절 잎, 이야기 별. line 은 바탕색으로 긋는 선. */
const ICON = {
  dex: { fill: 'M2 4.2c2.9-1.5 5.9-1.4 8 .6 2.1-2 5.1-2.1 8-.6v12.1c-2.9-1.4-5.9-1.3-8 .7-2.1-2-5.1-2.1-8-.7z', line: 'M10 5v12' },
  hunt: { fill: 'M15.3 2.2h2.5v2.5L9.2 13.3 6.7 10.8z', line: null, stroke: 'M4.6 10.4l5 5M5.6 14.4l-3 3' },
  friend: { fill: 'M10 17.2S2.4 12.3 2.4 7.1a4 4 0 0 1 7.6-1.9 4 4 0 0 1 7.6 1.9c0 5.2-7.6 10.1-7.6 10.1z', line: null },
  life: { fill: 'M10 2.4l8.2 7.1h-2.4v7.9H4.2V9.5H1.8z', line: null, hole: 'M8.3 17.4v-4.6h3.4v4.6z' },
  season: { fill: 'M16.8 3.2C8.3 3.2 3.4 7.8 3.4 13.9c0 1.1.2 2 .6 2.7 6.1-.1 12.8-3.9 12.8-13.4z', line: 'M4.6 15.6l7.6-7.6' },
  story: { fill: 'M10 1.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6-5.1-2.8-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z', line: null }
};
/** 아이콘을 (x, y) 에 scale 배로: color 로 칠하고, 선 · 구멍은 back 색으로. */
function iconPaths(id, color, back, x = 0, y = 0, scale = 1) {
  const I = ICON[id] || ICON.story;
  return `<g transform="translate(${x} ${y}) scale(${scale})">`
    + `<path d="${I.fill}" fill="${color}"/>`
    + (I.stroke ? `<path d="${I.stroke}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>` : '')
    + (I.line ? `<path d="${I.line}" fill="none" stroke="${back}" stroke-width="1.4" stroke-linecap="round"/>` : '')
    + (I.hole ? `<path d="${I.hole}" fill="${back}"/>` : '')
    + '</g>';
}

/** 묶음 제목 옆 동그란 아이콘(흰 그림). */
export function groupIconSvg(id) {
  const c = GROUP_COLOR[id] || '#c9a97a';
  return `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="${c}"/>${iconPaths(id, '#fff', c, 4, 4)}</svg>`;
}

/** 업적의 메달 등급. */
export function achTier(a) {
  if (a.title) return 'gold';
  return a.money >= 1500 ? 'silver' : 'bronze';
}
/** 등급 색: 테두리(dark) · 메달 면(light) · 반짝(rim) · 아이콘(ink). 잠긴 메달은 locked. */
const TIER = {
  gold: { dark: '#d49a2a', light: '#f7cf5c', rim: '#fff0b0', ink: '#8a5a10' },
  silver: { dark: '#97a3b2', light: '#dde4ec', rim: '#ffffff', ink: '#56606c' },
  bronze: { dark: '#b5713c', light: '#e6a56c', rim: '#ffd9b0', ink: '#6e3d1a' },
  locked: { dark: '#c6bba8', light: '#e4ddcf', rim: '#f3eee4', ink: '#b2a690' }
};

/** 리본 달린 메달(48 × 56). lit: 이룬 업적(아니면 회색에 자물쇠). */
export function medalSvg(group, tier, lit) {
  const T = lit ? TIER[tier] || TIER.bronze : TIER.locked;
  const ribbon = lit ? GROUP_COLOR[group] || '#c9a97a' : '#cfc6b4', fold = lit ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)';
  return '<svg viewBox="0 0 48 56" aria-hidden="true">'
    + `<path d="M9 0h11l6 24H15z" fill="${ribbon}"/><path d="M39 0H28l-6 24h11z" fill="${ribbon}"/>`
    + `<path d="M15 24l3.4-2.2L22 24zM33 24l-3.4-2.2L26 24z" fill="${fold}"/>`
    + `<circle cx="24" cy="36" r="17" fill="${T.dark}"/><circle cx="24" cy="36" r="13.6" fill="${T.light}"/>`
    + `<circle cx="24" cy="36" r="13.6" fill="none" stroke="${T.rim}" stroke-width="1.2" stroke-dasharray="2.2 2.4" opacity="0.9"/>`
    + iconPaths(group, T.ink, T.light, 15, 27, 0.9)
    + (lit ? '<ellipse cx="17.5" cy="28.5" rx="4" ry="2.4" transform="rotate(-35 17.5 28.5)" fill="#fff" opacity="0.55"/>'
      : '<g class="ach-lock"><circle cx="37" cy="47" r="8" fill="#9a8c74"/><rect x="33" y="46" width="8" height="6" rx="1.4" fill="#fff"/>'
        + '<path d="M34.8 46v-2a2.2 2.2 0 0 1 4.4 0v2" fill="none" stroke="#fff" stroke-width="1.6"/></g>')
    + '</svg>';
}

/** 맨 위 트로피 컵. */
export const TROPHY_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true">'
  + '<path d="M19 15h-7a7.5 7.5 0 0 0 8.6 11.6M45 15h7a7.5 7.5 0 0 1-8.6 11.6" fill="none" stroke="#d49a2a" stroke-width="4" stroke-linecap="round"/>'
  + '<path d="M17 9h30v11c0 10-6.6 17-15 17s-15-7-15-17z" fill="#f7c948"/>'
  + '<path d="M17 9h30v4H17z" fill="#e0a830"/>'
  + '<path d="M22 15c0 8 3 14 7 17" fill="none" stroke="#fff3c0" stroke-width="3" stroke-linecap="round" opacity="0.8"/>'
  + '<path d="M32 15.5l2.1 4.3 4.7.6-3.4 3.3.8 4.7-4.2-2.3-4.2 2.3.8-4.7-3.4-3.3 4.7-.6z" fill="#fff8d6"/>'
  + '<path d="M28.5 37h7v8h-7z" fill="#d49a2a"/>'
  + '<rect x="20" y="45" width="24" height="10" rx="2.5" fill="#b9822a"/><rect x="24" y="48" width="16" height="4" rx="1" fill="#f6dc8c"/>'
  + '</svg>';
