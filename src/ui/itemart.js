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
  pajama: `<circle cx="21" cy="12" r="5.5" fill="#c9b3ef" ${S}/><circle cx="43" cy="12" r="5.5" fill="#c9b3ef" ${S}/><path d="M16 26a16 15 0 0 1 32 0v21a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7z" fill="#c9b3ef" ${S}/><ellipse cx="32" cy="24" rx="10" ry="8.5" fill="#fbfaf5" ${S}/><circle cx="29" cy="23" r="1.4" fill="#5a4431"/><circle cx="35" cy="23" r="1.4" fill="#5a4431"/><circle cx="32" cy="38" r="1.8" fill="#fff" ${S}/><circle cx="32" cy="46" r="1.8" fill="#fff" ${S}/>`,
  crown: `<path d="M10 46L8 18l14 12 10-18 10 18 14-12-2 28z" fill="#f3c84b" ${S}/><path d="M10 46h44" ${S}/><circle cx="32" cy="36" r="5" fill="#e0524f" ${S}/><circle cx="18" cy="38" r="3" fill="#7fb6e2" ${S}/><circle cx="46" cy="38" r="3" fill="#7fb6e2" ${S}/>`
};
ACC.bandage = `<g transform="rotate(-35 32 32)"><rect x="9" y="24" width="46" height="16" rx="8" fill="#f6d2a8" ${S}/><rect x="25" y="24" width="14" height="16" fill="#eab98a" ${S}/><circle cx="29" cy="30" r="1.3" fill="#c98a5a"/><circle cx="35" cy="34" r="1.3" fill="#c98a5a"/></g>`;
ACC.berrypin = `<path d="M14 50L32 32" stroke="#b9a37a" stroke-width="4" stroke-linecap="round"/><path d="M38 18q14 0 12 14q-4 14-12 18q-8-4-12-18q-2-14 12-14z" fill="#e8455a" ${S}/><path d="M29 19q9-9 18 0q-9 5-18 0z" fill="#6fae5f" ${S}/><circle cx="34" cy="28" r="1.5" fill="#ffe08a"/><circle cx="42" cy="30" r="1.5" fill="#ffe08a"/><circle cx="38" cy="38" r="1.5" fill="#ffe08a"/>`;
ACC.beret = `<ellipse cx="31" cy="36" rx="24" ry="12" fill="#4f6b9a" ${S}/><path d="M9 39q22 9 44 0" fill="none" stroke="#3d5478" stroke-width="3" stroke-linecap="round"/><path d="M34 24v-6" ${S}/>`;
ACC.strawhat = `<ellipse cx="32" cy="42" rx="27" ry="9" fill="#f0d48a" ${S}/><path d="M18 41q0-21 14-21t14 21z" fill="#f0d48a" ${S}/><path d="M18 35q14 6 28 0v5q-14 6-28 0z" fill="#e0524f" ${S}/>`;
ACC.sunglasses = `<circle cx="20" cy="34" r="11" fill="#2b2a33" ${S}/><circle cx="44" cy="34" r="11" fill="#2b2a33" ${S}/><path d="M31 33q1-3 2 0" fill="none" ${S}/><path d="M9 32l-4-4M55 32l4-4" ${S}/><path d="M14 30l4-4M38 30l4-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;
ACC.headphones = `<path d="M12 38V32a20 20 0 0 1 40 0v6" fill="none" stroke="${L}" stroke-width="8.5" stroke-linecap="round"/><path d="M12 38V32a20 20 0 0 1 40 0v6" fill="none" stroke="#f48fb1" stroke-width="4.5" stroke-linecap="round"/><rect x="5" y="34" width="13" height="18" rx="6" fill="#f48fb1" ${S}/><rect x="46" y="34" width="13" height="18" rx="6" fill="#f48fb1" ${S}/>`;
ACC.flowercrown = `<ellipse cx="32" cy="36" rx="23" ry="10" fill="none" stroke="#7cc46a" stroke-width="5"/>` + [[9, 36, '#f6a9c4'], [20, 27, '#ffffff'], [32, 25, '#ffd66b'], [44, 27, '#c4b4e8'], [55, 36, '#f6a9c4'], [32, 46, '#ffffff'], [17, 44, '#ffd66b'], [47, 44, '#c4b4e8']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}" ${S}/>`).join('');
ACC.halo = `<ellipse cx="32" cy="32" rx="22" ry="8" fill="none" stroke="${L}" stroke-width="9"/><ellipse cx="32" cy="32" rx="22" ry="8" fill="none" stroke="#ffd84a" stroke-width="5"/><path d="M50 14l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="#fff3a0" ${S}/>`;
// 별 조각 머리핀(재료로 만드는 소품): 노란 별 + 핀
ACC.starpin = `<path d="M18 50L40 30" stroke="#b9a37a" stroke-width="4" stroke-linecap="round"/><path d="M38 8l5.4 11.2 12.4 1.7-9 8.7 2.2 12.3L38 36l-11 5.9 2.2-12.3-9-8.7 12.4-1.7z" fill="#ffd84a" ${S}/><circle cx="38" cy="24" r="4" fill="#fff3a0"/>`;
export const accessorySvg = (id) => `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="16" ry="3.5" fill="#e6d8b8"/>${ACC[id] || ''}</svg>`;

/** 가방 물건 그림(풀 · 열매 · 이후 단계의 물건은 등록된 그림). 퀘스트에서 받는 먹을 것은 여기 바로 둔다. */
const EXTRA = {
  // 거대 오므라이스(별 세 개 레스토랑에서 구한 별똥별들의 보답): 흰 접시 위 노란 달걀 이불 · 케첩 지그재그
  omurice: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="22" ry="4" fill="#e6d8b8"/><ellipse cx="32" cy="45" rx="27" ry="9" fill="#ffffff" ${S}/><path d="M9 43c0-14 10-24 23-24s23 10 23 24c-6 4-15 6-23 6s-17-2-23-6z" fill="#ffd54f" ${S}/><path d="M17 30c4 3 6-3 10 0s6-3 10 0 6-3 10 0" fill="none" stroke="#d9433b" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 34q4-9 12-11" fill="none" stroke="#fff3c4" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  // 반짝 털뭉치(밤 노동): 민들레 씨처럼 동그란 하얀 털뭉치, 노란 빛무리
  glowfluff: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="57" rx="14" ry="3.5" fill="#e6d8b8"/><circle cx="32" cy="31" r="22" fill="#fff3b8" opacity="0.55"/><circle cx="32" cy="31" r="15" fill="#ffffff" ${S}/><g stroke="#cdbb86" stroke-width="1.6" stroke-linecap="round"><path d="M32 20v4M32 38v4M21 31h4M39 31h4M24.5 23.5l2.8 2.8M36.7 35.7l2.8 2.8M39.5 23.5l-2.8 2.8M27.3 35.7l-2.8 2.8"/></g><circle cx="32" cy="31" r="4.2" fill="#ffe27a"/><circle cx="26" cy="25" r="2" fill="#fff" opacity="0.9"/></svg>`,
  // 별 조각: 별똥별맨이 남기고 간 노란 별, 반짝
  starshard: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="15" ry="4" fill="#e6d8b8"/>
    <path d="M32 9l6.5 13.5 15 2-11 10.5 3 15-13.5-7.5-13.5 7.5 3-15-11-10.5 15-2z" fill="#ffe23a" ${S}/>
    <path d="M50 10v7M46.5 13.5h7" stroke="#f6c94a" stroke-width="2.4" stroke-linecap="round"/><circle cx="27" cy="29" r="2.4" fill="#fff8d0"/></svg>`,
  // 피자호빵: 노릇한 호빵 사이로 빨간 토마토 소스 · 치즈 · 피망, 김이 모락모락
  pizzabun: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="17" ry="4" fill="#e6d8b8"/>
    <path d="M24 13q2-3 0-6M32 13q2-3 0-6M40 13q2-3 0-6" fill="none" stroke="#d9cbb6" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M10 39q0-21 22-21t22 21q0 12-22 12T10 39z" fill="#fbd3a0" ${S}/>
    <path d="M24 20q8 4 16 0" fill="none" stroke="#e8a35a" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M14 40q18 7 36 0" fill="none" stroke="#e8573f" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="24" cy="44" r="2.4" fill="#f2c43d"/><circle cx="40" cy="44" r="2" fill="#8fbf5a"/><ellipse cx="22" cy="29" rx="4" ry="2.6" fill="#fff" opacity=".55"/></svg>`,
  // 시마지로 카츠카레: 하얀 접시에 밥 · 카레 · 바삭한 돈가스 조각
  katsucurry: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="20" ry="4" fill="#e6d8b8"/>
    <ellipse cx="32" cy="38" rx="25" ry="14" fill="#ffffff" ${S}/><path d="M14 37q4-10 16-9 2 7-3 13-9 3-13-4z" fill="#fbf7ee" ${S}/>
    <path d="M28 30q12-6 22 2 2 8-8 11-12 2-14-5z" fill="#c9802b" ${S}/><path d="M30 31l14-4 4 8-14 5z" fill="#e7a54b" ${S}/>
    <path d="M35 30l3 9M41 28l3 9" stroke="#a8743a" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="35" r="1.6" fill="#e8573f"/></svg>`,
  // 섬 조개국: 국그릇에 조개 둘 · 김
  shellsoup: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="18" ry="4" fill="#e6d8b8"/>
    <path d="M24 16q2-3 0-6M32 16q2-3 0-6M40 16q2-3 0-6" fill="none" stroke="#d9cbb6" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M10 30h44q-2 20-22 20T10 30z" fill="#e8573f" ${S}/><ellipse cx="32" cy="30" rx="22" ry="6" fill="#f6e3c4" ${S}/>
    <path d="M22 31q4-7 9 0zM34 30q4-7 9 0z" fill="#d9c2a6" ${S}/><path d="M18 42q14 5 28 0" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>`,
  // 우사기 주먹밥: 커다란 세모 주먹밥 + 김 띠
  riceball: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="18" ry="4" fill="#e6d8b8"/>
    <path d="M32 9q6 0 14 15t8 20q0 8-10 9H20q-10-1-10-9t8-20 14-15z" fill="#fffdf6" ${S}/>
    <path d="M20 40h24v13H20z" fill="#3e5a46" ${S}/><circle cx="26" cy="25" r="1.5" fill="#e3d8c2"/><circle cx="36" cy="21" r="1.5" fill="#e3d8c2"/><circle cx="38" cy="31" r="1.5" fill="#e3d8c2"/><circle cx="29" cy="33" r="1.5" fill="#e3d8c2"/></svg>`,
  // 랏코의 대나무 도시락: 펼친 대나무 잎 위에 작은 세모 주먹밥 둘(김 띠)과 단무지 한 쪽
  rakkobento: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="20" ry="4" fill="#e6d8b8"/>
    <path d="M4 44q28-20 56-4q-26 16-56 4z" fill="#7cb342" ${S}/><path d="M8 44q24-10 48-3" fill="none" stroke="#4f7f2a" stroke-width="2" stroke-linecap="round"/>
    <path d="M22 20q4 0 8 9t4 12q0 5-6 5H16q-6 0-6-5t4-12 8-9z" fill="#fffdf6" ${S}/><path d="M15 37h14v8H15z" fill="#3e5a46" ${S}/>
    <path d="M42 22q4 0 8 9t4 12q0 5-6 5H36q-6 0-6-5t4-12 8-9z" fill="#fffdf6" ${S}/><path d="M35 39h14v8H35z" fill="#3e5a46" ${S}/>
    <path d="M28 46q4-4 8 0q-4 3-8 0z" fill="#f7d24a" ${S}/></svg>`,
  // 젤리 구이: 꼬치에 꿴 파란 젤리 두 개, 노릇한 구운 자국
  jellybake: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="16" ry="4" fill="#e6d8b8"/>
    <path d="M10 54L54 10" stroke="${L}" stroke-width="5.4" stroke-linecap="round"/><path d="M10 54L54 10" stroke="#e2c49a" stroke-width="2.8" stroke-linecap="round"/>
    <rect x="16" y="32" width="17" height="17" rx="5" transform="rotate(-45 24.5 40.5)" fill="#6fb2e4" ${S}/><rect x="31" y="17" width="17" height="17" rx="5" transform="rotate(-45 39.5 25.5)" fill="#6fb2e4" ${S}/>
    <path d="M20 38l6 6M24 34l6 6M35 23l6 6M39 19l6 6" stroke="#b8743d" stroke-width="2.4" stroke-linecap="round"/><circle cx="21" cy="42" r="1.6" fill="#fff" opacity=".8"/><circle cx="36" cy="27" r="1.6" fill="#fff" opacity=".8"/></svg>`,
  // 병맥주: 갈색 병 · 금빛 뚜껑 · 흰 라벨
  bottlebeer: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="56" rx="12" ry="3.5" fill="#e6d8b8"/>
    <path d="M27 9h10v10q8 6 8 16v17q0 4-4 4H23q-4 0-4-4V35q0-10 8-16z" fill="#a8622a" ${S}/><rect x="26" y="5" width="12" height="5" rx="1.5" fill="#f6c453" ${S}/>
    <path d="M21 35h22v12H21z" fill="#fff4dc" ${S}/><path d="M26 41h12" stroke="#d9473b" stroke-width="2.4" stroke-linecap="round"/><path d="M25 22q-2.5 6-2.5 11" stroke="#ffd9b0" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`
};
// ---------- 경품 추첨 상품 ----------
Object.assign(EXTRA, {
  // 전골 세트(1등): 질냄비 가득 노란 국물에 두부 · 표고 · 파, 김이 모락모락
  hotpot: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="57" rx="22" ry="4" fill="#e6d8b8"/>
    <path d="M24 20q-3-5 0-9M32 18q-3-5 0-9M40 20q-3-5 0-9" fill="none" stroke="#cbbba2" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M4 38q-3 0-3 3.5T4 45M60 38q3 0 3 3.5T60 45" fill="none" ${S}/>
    <path d="M7 34h50q-1 19-25 19T7 34z" fill="#9a5f3e" ${S}/><path d="M12 44q20 6 40 0" fill="none" stroke="#c98a5a" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="32" cy="34" rx="26" ry="7.5" fill="#f2b45a" ${S}/>
    <rect x="15" y="29" width="9" height="7" rx="1.5" fill="#fffaf0" ${S}/><path d="M28 31q4-5 8 0z" fill="#8a5a3c" ${S}/><path d="M32 31v4" ${S}/>
    <circle cx="42" cy="32" r="2.6" fill="#8fd16a" ${S}/><circle cx="47" cy="35" r="2.2" fill="#8fd16a" ${S}/><circle cx="23" cy="38" r="2.2" fill="#e0524f" ${S}/></svg>`,
  // 과일 바구니(2등): 엮은 바구니에 사과 · 귤 · 포도 · 바나나
  fruitbasket: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="57" rx="21" ry="4" fill="#e6d8b8"/>
    <path d="M14 34q0-22 18-22t18 22" fill="none" stroke="${L}" stroke-width="6" stroke-linecap="round"/><path d="M14 34q0-22 18-22t18 22" fill="none" stroke="#d9a066" stroke-width="3" stroke-linecap="round"/>
    <path d="M30 22q12-6 18 6q-10 2-18-6z" fill="#f6d65a" ${S}/>
    <circle cx="22" cy="30" r="7" fill="#e0524f" ${S}/><circle cx="34" cy="31" r="6.5" fill="#f2a03a" ${S}/>
    <circle cx="44" cy="31" r="3" fill="#9a6ad0" ${S}/><circle cx="48" cy="34" r="3" fill="#9a6ad0" ${S}/><circle cx="43" cy="36" r="3" fill="#9a6ad0" ${S}/>
    <path d="M9 35h46l-5 18H14z" fill="#d9a066" ${S}/><path d="M12 41h40M13 47h38M22 35l-2 18M32 35v18M42 35l2 18" stroke="#b37d4a" stroke-width="2" stroke-linecap="round"/></svg>`,
  // 쿠키 상자(3등): 파란 둥근 깡통에 초코칩 버터 쿠키
  cookies: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="57" rx="21" ry="4" fill="#e6d8b8"/>
    <path d="M10 34v12q0 8 22 8t22-8V34" fill="#6fa8dc" ${S}/><ellipse cx="32" cy="34" rx="22" ry="8" fill="#9cc6ea" ${S}/>
    <circle cx="24" cy="30" r="7" fill="#e9b770" ${S}/><circle cx="38" cy="29" r="7" fill="#e9b770" ${S}/><circle cx="31" cy="36" r="7" fill="#f0c37e" ${S}/>
    <circle cx="22" cy="29" r="1.3" fill="#6b4430"/><circle cx="26" cy="32" r="1.3" fill="#6b4430"/><circle cx="37" cy="27" r="1.3" fill="#6b4430"/><circle cx="40" cy="31" r="1.3" fill="#6b4430"/><circle cx="30" cy="35" r="1.3" fill="#6b4430"/><circle cx="33" cy="38" r="1.3" fill="#6b4430"/>
    <path d="M14 46q18 6 36 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>`,
  // 막대 사탕(4등): 분홍 소용돌이
  candy: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="57" rx="12" ry="3.5" fill="#e6d8b8"/>
    <path d="M32 36v20" stroke="${L}" stroke-width="5.6" stroke-linecap="round"/><path d="M32 36v20" stroke="#fffaf0" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="24" r="15" fill="#ffb7cf" ${S}/><path d="M32 24m-2 0a2 2 0 1 1 4 0a5 5 0 1 1-9 0a8 8 0 1 1 15 0a11 11 0 1 1-21 0" fill="none" stroke="#e0527a" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="25" cy="17" r="2.4" fill="#fff" opacity=".8"/></svg>`,
  // 휴지(참가상): 꽃무늬 하늘색 상자에서 휴지가 퐁
  tissue: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="57" rx="22" ry="4" fill="#e6d8b8"/>
    <path d="M10 30h44v22H10z" fill="#cfe7ff" ${S}/><path d="M24 30q8-4 16 0" fill="none" ${S}/>
    <circle cx="18" cy="42" r="3" fill="#ffd6e2"/><circle cx="32" cy="45" r="3" fill="#fff1a8"/><circle cx="46" cy="41" r="3" fill="#ffd6e2"/>
    <path d="M26 31q-6-12 4-17q2 6 6 2q8 4 2 15z" fill="#fff" ${S}/></svg>`
});
/** 추첨권: 주황 표에 별. */
export const TICKET_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 11h30v5a4 4 0 0 0 0 8v5H5v-5a4 4 0 0 0 0-8z" fill="#ffb36b" stroke="#5a4431" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 12v16" stroke="#5a4431" stroke-width="1.6" stroke-dasharray="2.4 2.4"/><path d="M25 14.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff6c8" stroke="#5a4431" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
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
