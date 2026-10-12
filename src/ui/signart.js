/**
 * 마을 간판 이름표(동물의 숲 명찰처럼): 크림색 둥근 판 + 왼쪽에 건물마다 다른 색 동그라미 아이콘.
 * signHtml(글, 아이콘 열쇠) → 이름표 속 HTML. 아이콘 열쇠는 간판 처음 글(내 집 → 빌린 집 · 빈집으로 바뀌어도 같은 아이콘).
 */
const G = (d) => `<svg viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
const S = 'fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="#fff"';
const HOUSE = G(`<path ${S} d="M3.5 9.5 10 4l6.5 5.5"/><path ${S} d="M5.5 8.5V16h9V8.5"/><path ${F} d="M8.6 16v-3.6h2.8V16z"/>`);
const BOSS_CROWN = G(`<path ${S} d="M4 14.5 3.5 7.5l3.8 2.8L10 5l2.7 5.3 3.8-2.8-.5 7z"/><path ${S} d="M4.5 16.5h11"/>`);
const ICONS = {
  가구점: ['#7cc4ad', G(`<path ${S} d="M4 11.5V9a2 2 0 0 1 4 0v1.5h4V9a2 2 0 0 1 4 0v2.5"/><path ${S} d="M3.5 11.5h13V15h-13zM5 15v1.5M15 15v1.5"/>`)],
  '카니 헌책방': ['#c49a6c', G(`<path ${S} d="M10 6c-1.8-1.2-4-1.5-6-1.2v10c2-.3 4.2 0 6 1.2 1.8-1.2 4-1.5 6-1.2v-10c-2-.3-4.2 0-6 1.2zM10 6v10"/>`)],
  '포셰트 가게': ['#f08fae', G(`<path ${S} d="M7 8.5V7a3 3 0 0 1 6 0v1.5"/><path ${S} d="M4.5 8.5h11l-1 7.5h-9z"/><circle ${F} cx="10" cy="12" r="1.2"/>`)],
  '변신 살롱': ['#f08fae', G(`<ellipse ${S} cx="8.5" cy="9.5" rx="4" ry="5"/><path ${S} d="M8.5 14.5v2.5M6 17h5"/><path ${S} d="M15 3.5v4M13 5.5h4"/>`)],
  부동산: ['#a993dc', G(`<circle ${S} cx="7" cy="10" r="3"/><path ${S} d="M10 10h6.5M14 10v2.5M16.5 10v2"/>`)],
  도구점: ['#6f9fd6', G(`<path ${S} d="M11 5.5 14.5 9 13 10.5 9.5 7zM11.2 8.8 5 15"/><path ${S} d="M9.5 4.5c1-.8 2.6-.9 3.5 0"/>`)],
  '라멘 로우': ['#e0645a', G(`<path ${S} d="M3.5 10h13a6.5 5.5 0 0 1-13 0zM7 16h6"/><path ${S} d="M8 4.5 12 8.5M11.5 3.5l2.5 5"/>`)],
  검정소: ['#5f92d6', G(`<circle ${S} cx="10" cy="8" r="3.8"/><path ${S} d="M7.5 11.2 6 16.5l4-1.8 4 1.8-1.5-5.3"/>`)],
  '노동 접수': ['#e3a03f', G(`<path ${S} d="M5.5 5h9v11.5h-9z"/><path ${S} d="M8 4h4v2H8zM8 10l1.5 1.5L12.5 8.5M8 14h4"/>`)],
  '스티커 작업대': ['#efc040', G(`<path ${F} d="m10 3.6 1.9 4 4.3.5-3.2 3 .9 4.3L10 13.3l-3.9 2.1.9-4.3-3.2-3 4.3-.5z"/>`)],
  '경품 추첨': ['#ec7487', G(`<path ${S} d="M4 9h12v7.5H4zM3.5 6.5h13V9h-13zM10 6.5v10"/><path ${S} d="M10 6.5C8.5 3.5 6 4.2 7 6.5M10 6.5c1.5-3 4-2.3 3 0"/>`)],
  맥주집: ['#ec9b3f', G(`<path ${S} d="M5 6.5h8V16H5zM13 8.5h1.6a1.6 1.6 0 0 1 0 3.2H13"/><path ${F} d="M4.6 4.5h8.8v2.4H4.6z"/>`)],
  '랏코 수련장': ['#a07a5f', G(`<path ${S} d="M3.5 10h13M5 7v6M7 6v8M13 6v8M15 7v6"/>`)],
  '내 집': ['#f0a93f', HOUSE],
  치이카와네: ['#f2a5bd', HOUSE],
  우사기네: ['#e8bd52', HOUSE],
  쿠리만쥬네: ['#d39558', HOUSE],
  모몽가네: ['#7fb9e0', HOUSE],
  랏코네: ['#a07a5f', HOUSE],
  '치이카와 마을': ['#f08fae', G(`<circle ${F} cx="10" cy="6.3" r="2.6"/><circle ${F} cx="13.6" cy="9.6" r="2.6"/><circle ${F} cx="6.4" cy="9.6" r="2.6"/><circle ${F} cx="8" cy="13.6" r="2.6"/><circle ${F} cx="12" cy="13.6" r="2.6"/><circle fill="#f6c84b" cx="10" cy="10.4" r="2.2"/>`)],
  '바다 절벽': ['#5fb4dc', G(`<path ${S} d="M2.5 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0M2.5 16c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/><path ${F} d="m13 3 1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z"/>`)],
  선착장: ['#4f9bd0', G(`<circle ${S} cx="10" cy="5" r="1.8"/><path ${S} d="M10 6.8V16M6.5 9.5h7M4.5 12.5a5.5 4.5 0 0 0 11 0"/>`)], // 닻(섬 합숙 오리 배가 서는 곳)
  '바위산 가는 길': ['#8d9bab', G(`<path ${S} d="M2.5 16 8 7l3 4.5 2-2.5 4.5 7z"/>`)],
  '숲 가는 길': ['#5fae6a', G(`<path ${S} d="M10 3.5 5 10h3l-3.5 4.5h11L12 10h3zM10 14.5V17"/>`)],
  '들판 가는 길': ['#8fc350', G(`<path ${S} d="M10 16.5V9M10 9c-1.2-3-4-3.5-5.5-3 0 2.5 2 4 5.5 3zM10 11c1.2-3 4-3.5 5.5-3 0 2.5-2 4-5.5 3z"/>`)],
  // 구역 보스 자리(core/layout.js 의 BOSS_LAIRS): 왕관 — 센 몬스터가 산다
  '두더지 굴밭': ['#c9824a', BOSS_CROWN],
  '고목 빈터': ['#5f9e56', BOSS_CROWN],
  '강가 진흙밭': ['#4f9bd0', BOSS_CROWN]
};
const DEFAULT = ['#c49a6c', G(`<circle ${F} cx="10" cy="10" r="3"/>`)];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 간판 이름표 HTML: 색 동그라미 아이콘 + 이름. */
export function signHtml(text, key = text) {
  const [tint, svg] = ICONS[key] || DEFAULT;
  return `<i class="sg-ico" style="--c:${tint}">${svg}</i><span>${esc(text)}</span>`;
}
/** 아이콘이 있는 간판인지(테스트용). */
export const hasSignIcon = (key) => !!ICONS[key];
