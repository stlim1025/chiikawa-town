// 가방 · 옷장 그림: 열매, 꾸미기 소품, 포셰트, (풀은 weedart.js). 64 × 64 칸.
import { weedSvg } from './weedart.js';
import { WEED_KINDS } from '../core/weeding.js';

const L = '#5a4431';
const S = `stroke="${L}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;

/** 포셰트 그림: 끈(고리) · 몸통 · 덮개 · 단추. 별밤 포셰트는 별 단추. */
export function pochetteSvg(id, P) {
  const line = '#5a4431';
  const star = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R;
    return `${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const button = id === 'night'
    ? `<polygon points="${star(32, 44, 7, 3)}" fill="${P.accent}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>`
    : `<circle cx="32" cy="44" r="4.6" fill="${P.accent}" stroke="${line}" stroke-width="2.4"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M15 30Q32 -10 49 30" fill="none" stroke="${line}" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M15 30Q32 -10 49 30" fill="none" stroke="${P.accent}" stroke-width="3" stroke-linecap="round"/>
    <rect x="9" y="25" width="46" height="32" rx="13" fill="${P.color}" stroke="${line}" stroke-width="3"/>
    <path d="M9 38Q9 25 22 25H42Q55 25 55 38Q32 52 9 38Z" fill="${P.color}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 35Q32 43 50 35" fill="none" stroke="${P.accent}" stroke-width="1.8" stroke-dasharray="3 3" stroke-linecap="round"/>
    <ellipse cx="20" cy="31" rx="5" ry="2.4" fill="#fff" opacity="0.45"/>
    ${button}
  </svg>`;
}


/** 꾸미기 소품 그림. */
const ACC = {
  ribbon: `<path d="M32 32L12 20q-6 12 0 24zM32 32l20-12q6 12 0 24z" fill="#f48fb1" ${S}/><path d="M32 32l-8 18M32 32l8 18" ${S} fill="none" stroke="#e5788f"/><circle cx="32" cy="32" r="6" fill="#e5788f" ${S}/>`,
  flower: [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return `<circle cx="${(32 + Math.sin(r) * 11).toFixed(1)}" cy="${(32 - Math.cos(r) * 11).toFixed(1)}" r="9" fill="#ffffff" ${S}/>`; }).join('') + `<circle cx="32" cy="32" r="7" fill="#ffd66b" ${S}/>`,
  sprout: `<path d="M10 46q22-22 44 0" fill="none" stroke="#6fae5f" stroke-width="5" stroke-linecap="round"/><path d="M32 30v-8" ${S} fill="none"/><path d="M32 22q-14-2-16-12q12-2 16 12zM32 22q14-2 16-12q-12-2-16 12z" fill="#8fd16a" ${S}/>`,
  glasses: `<circle cx="20" cy="34" r="11" fill="#e6f4fb" ${S}/><circle cx="44" cy="34" r="11" fill="#e6f4fb" ${S}/><path d="M31 33q1-3 2 0" fill="none" ${S}/><path d="M9 32l-4-4M55 32l4-4" ${S}/><path d="M15 30l4-4M39 30l4-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  cap: `<path d="M12 40q0-26 20-26t20 26z" fill="#e8706a" ${S}/><path d="M8 40h40q10 0 10 5H8z" fill="#d45a54" ${S}/><circle cx="32" cy="13" r="4" fill="#fff" ${S}/><path d="M20 24q12-8 24 0" fill="none" stroke="#f3a19c" stroke-width="2.4" stroke-linecap="round"/>`,
  crown: `<path d="M10 46L8 18l14 12 10-18 10 18 14-12-2 28z" fill="#f3c84b" ${S}/><path d="M10 46h44" ${S}/><circle cx="32" cy="36" r="5" fill="#e0524f" ${S}/><circle cx="18" cy="38" r="3" fill="#7fb6e2" ${S}/><circle cx="46" cy="38" r="3" fill="#7fb6e2" ${S}/>`
};
export const accessorySvg = (id) => `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="16" ry="3.5" fill="#e6d8b8"/>${ACC[id] || ''}</svg>`;

/** 가방 물건 그림(풀 · 열매 · 이후 단계의 물건은 등록된 그림). */
const EXTRA = {};
export function registerItemArt(map) { Object.assign(EXTRA, map); }
export function itemSvg(id) {
  if (WEED_KINDS[id]) return weedSvg(id);
  if (id === 'berry') {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="17" ry="4" fill="#e6d8b8"/>
      <path d="M30 14q-10-6-18 0q8 8 18 0zM34 14q10-6 18 0q-8 8-18 0z" fill="#5fae62" ${S}/>
      <path d="M32 14v8M32 22l-10 10M32 22l10 10" fill="none" ${S}/>
      <circle cx="22" cy="40" r="10" fill="#e0384f" ${S}/><circle cx="42" cy="40" r="10" fill="#e0384f" ${S}/><circle cx="32" cy="30" r="9" fill="#f04a60" ${S}/>
      <circle cx="19" cy="37" r="2.6" fill="#fff" opacity=".7"/><circle cx="39" cy="37" r="2.6" fill="#fff" opacity=".7"/><circle cx="29.5" cy="27.5" r="2.4" fill="#fff" opacity=".7"/></svg>`;
  }
  if (EXTRA[id]) return EXTRA[id];
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="18" fill="#eadcb8" ${S}/><text x="32" y="40" text-anchor="middle" font-size="22" fill="${L}">?</text></svg>`;
}
