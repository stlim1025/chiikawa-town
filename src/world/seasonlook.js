/**
 * 계절 풍경(설계서 docs/Seasons-Weather-2026-11-16.html, 게임 오리지널): 계절마다 나무 · 땅 · 덤불 · 언덕 색, 장식 꽃, 지붕 눈.
 * 색표와 seasonLookOf 는 three 없이 쓰고 테스트한다. 실제로 칠하는 일은 village.paintSeason(look)(나무 잎 도형 · 땅 꼭짓점 색 ·
 * 재질 색 · 숲 인스턴스 색)과 homeExterior.setRoofSnow 가 한다. 여름이 지금까지의 마을 색이다.
 */
const SUMMER = { bushes: ['#8fcd86', '#9dd394'], hills: ['#aee08f', '#95d488'] };
const PINK = '#ffb6cd';
/** 가을 잎: 나무마다 자리로 정한 하나(주황 · 빨강 · 노랑 · 갈색빛 주황 · 누런 연두). */
export const AUTUMN_LEAVES = ['#f0a040', '#e4673c', '#f2c54e', '#d9853a', '#c9c25a'];
/** 계절마다 땅 색(village.js groundColor 의 풀 · 흙길 · 모래 · 울타리 밖 구역 색). 여름은 null(지금 색 그대로). */
const GROUND = {
  spring: { grass: '#a6e283', grass2: '#cdf09c', dirt: '#f5e1b0', sand: '#f0e0b4', region: { forest: '#8fd07c', mountain: '#c9c1ae', fields: '#d2f09c', river: '#ade38e' } },
  autumn: { grass: '#c3d27e', grass2: '#ddd48c', dirt: '#efd3a0', sand: '#ecdcb0', region: { forest: '#b5b968', mountain: '#c6b79e', fields: '#e0d58e', river: '#c2d488' } },
  winter: { grass: '#eef3f6', grass2: '#ffffff', dirt: '#d8ccb6', sand: '#e6e1d6', region: { forest: '#e4ecef', mountain: '#dfe2e4', fields: '#f3f6f8', river: '#e9f0f2' } }
};
const BUSHES = { spring: ['#9fdc8a', '#aee39a'], autumn: ['#c5a24f', '#d4b25f'], winter: ['#e8eef1', '#f6f9fb'] };
const HILLS = { spring: ['#b6e696', '#9fda8f'], autumn: ['#d4cf86', '#c1b872'], winter: ['#eef3f6', '#e2eaee'] };

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** 두 색(#rrggbb)을 k(0 ~ 1)만큼 섞는다. */
export function mixHex(a, b, k) {
  const A = toRgb(a), B = toRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** 자리로 정하는 0 ~ 1(같은 나무는 늘 같은 가을 색). */
function spot(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const isPink = (leaf) => leaf.toLowerCase() === PINK;

/**
 * 그 계절에 칠할 것: { ground: 땅 색표 | null(여름), leafOf(x, z, leaf) → 잎 색, bushes: [진한, 밝은], hills: [둘],
 * flowers: 장식 꽃을 보일지(겨울엔 숨김 — 광장 꽃밭 꽃 따기는 그대로), roofSnow: 지붕 눈, snowGround: 눈 바닥(발자국) }.
 */
export function seasonLookOf(season) {
  const s = GROUND[season] ? season : 'summer';
  const leafOf = s === 'spring' ? (x, z, leaf) => (isPink(leaf) ? leaf : mixHex(leaf, '#b4e889', 0.45))
    : s === 'autumn' ? (x, z, leaf) => (isPink(leaf) ? '#e2604e' : AUTUMN_LEAVES[Math.floor(spot(x, z) * AUTUMN_LEAVES.length) % AUTUMN_LEAVES.length])
      : s === 'winter' ? (x, z, leaf) => mixHex(leaf, '#f4f7f9', 0.84)
        : (x, z, leaf) => leaf;
  return {
    season: s,
    ground: s === 'summer' ? null : GROUND[s],
    leafOf,
    bushes: BUSHES[s] || SUMMER.bushes,
    hills: HILLS[s] || SUMMER.hills,
    flowers: s !== 'winter',
    roofSnow: s === 'winter',
    snowGround: s === 'winter'
  };
}

/**
 * 계절 풍경을 마을에 칠한다. village: buildVillage 결과(paintSeason), home: world/homeext.js 의 넓힌 내 집(setRoofSnow, 없어도 된다).
 * apply(season) 은 계절이 바뀔 때만 칠한다(같은 계절로 다시 불러도 아무 일도 하지 않는다).
 */
export function createSeasonLook({ village, home }) {
  let shown = null;
  return {
    apply(season) {
      const look = seasonLookOf(season);
      if (look.season === shown) return false;
      shown = look.season;
      village.paintSeason(look);
      if (home && home.setRoofSnow) home.setRoofSnow(look.roofSnow);
      return true;
    },
    get season() { return shown; }
  };
}
