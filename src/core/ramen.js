/**
 * 라멘 로우 알바: 레시피대로 라멘을 만들어 손님에게 낸다.
 * 그릇 bowl = { items: { 재료 id: 개수 } }. 순서는 상관없고 재료와 개수가 레시피와 똑같아야 맞다.
 * 면은 냄비에서 삶는다: pot = { type: 'thin' | 'thick', start: 넣은 시각(초) }.
 */
export const INGREDIENTS = {
  shoyu: { name: '간장 수프', kind: 'soup', color: '#b5733a' },
  miso: { name: '된장 수프', kind: 'soup', color: '#d79a4e' },
  shio: { name: '소금 수프', kind: 'soup', color: '#efdca6' },
  tonkotsu: { name: '돈코츠 수프', kind: 'soup', color: '#f3e7d2' },
  thin: { name: '가는 면', kind: 'noodle', color: '#f4dc8a' },
  thick: { name: '굵은 면', kind: 'noodle', color: '#e9c463' },
  chashu: { name: '차슈', kind: 'topping', color: '#c98a6a' },
  negi: { name: '파', kind: 'topping', color: '#7cc46a' },
  nori: { name: '김', kind: 'topping', color: '#2f4a3a' },
  egg: { name: '반숙 달걀', kind: 'topping', color: '#f7c948' },
  moyashi: { name: '숙주', kind: 'topping', color: '#f3f0dc' },
  corn: { name: '옥수수', kind: 'topping', color: '#ffd84d' },
  butter: { name: '버터', kind: 'topping', color: '#fbe7a1' },
  garlic: { name: '마늘', kind: 'topping', color: '#f6efe2' }
};

/** 라멘 다섯 가지. 수프 · 면 · 토핑이 조금씩 다르다(로우 라멘은 숙주 · 차슈가 두 번씩). */
export const RECIPES = {
  shoyu: { name: '쇼유 라멘', items: { shoyu: 1, thin: 1, chashu: 1, negi: 1, nori: 1 } },
  miso: { name: '미소 라멘', items: { miso: 1, thick: 1, moyashi: 1, corn: 1, butter: 1 } },
  shio: { name: '시오 라멘', items: { shio: 1, thin: 1, egg: 1, negi: 1 } },
  tonkotsu: { name: '돈코츠 라멘', items: { tonkotsu: 1, thin: 1, chashu: 1, egg: 1, nori: 1 } },
  rou: { name: '로우 라멘', items: { shoyu: 1, thick: 1, moyashi: 2, chashu: 2, garlic: 1 } }
};

/** 면 삶는 시간(초)과, 다 삶은 뒤 이만큼 더 두면 퍼진다. */
export const BOIL = { thin: 3.0, thick: 4.5 };
export const SOGGY_AFTER = 4.0;

export const emptyBowl = () => ({ items: {} });

/** 그릇에 재료를 하나 더 넣는다. */
export function addToBowl(bowl, id) {
  return { items: { ...bowl.items, [id]: (bowl.items[id] || 0) + 1 } };
}

/** 그릇이 그 라멘 레시피와 꼭 맞는지(재료와 개수가 같아야 한다). */
export function bowlMatches(bowl, recipeId) {
  const want = RECIPES[recipeId].items, have = bowl.items;
  const keys = new Set([...Object.keys(want), ...Object.keys(have)]);
  for (const k of keys) if ((want[k] || 0) !== (have[k] || 0)) return false;
  return true;
}

/** 냄비 상태: 'empty' | 'boiling' | 'ready' | 'soggy'. now 는 초. */
export function potState(pot, now) {
  if (!pot) return 'empty';
  const t = now - pot.start, boil = BOIL[pot.type];
  if (t < boil) return 'boiling';
  return t < boil + SOGGY_AFTER ? 'ready' : 'soggy';
}

/** 근무 기본급과 그릇 하나의 보수(남은 인내심 0..1 에 따라 팁이 붙는다). */
export const SHIFT_BASE = 100;
export const BOWL_PAY = 30;
export const TIP_MAX = 20;
export function servePay(patience) {
  return BOWL_PAY + Math.round(TIP_MAX * Math.max(0, Math.min(1, patience)));
}
/** 근무가 끝나면: 기본급 + 그릇 보수와 팁. */
export function shiftPay(shift) {
  return SHIFT_BASE + shift.earned;
}

const pickOne = (list, random) => list[Math.floor(random() * list.length) % list.length];
function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** 보기를 섞고 정답 번호를 붙인다. */
function makeQ(q, right, wrong, random) {
  const choices = shuffle([right, ...wrong], random);
  return { q, choices, answer: choices.indexOf(right) };
}

/**
 * 슈퍼 알바이터 필기: 레시피에서 문제를 만든다(수프 · 면 · 들어가지 않는 토핑 · 산더미 라멘).
 * → [{ q, choices, answer }]
 */
export function ramenQuiz(n, random = Math.random) {
  const ids = Object.keys(RECIPES);
  const soups = Object.keys(INGREDIENTS).filter((k) => INGREDIENTS[k].kind === 'soup');
  const toppings = Object.keys(INGREDIENTS).filter((k) => INGREDIENTS[k].kind === 'topping');
  const name = (k) => INGREDIENTS[k].name;
  const makers = [
    (rid) => {
      const r = RECIPES[rid], soup = soups.find((s) => r.items[s]);
      return makeQ(`${r.name}에 들어가는 수프는?`, name(soup), shuffle(soups.filter((s) => s !== soup), random).slice(0, 2).map(name), random);
    },
    (rid) => {
      const r = RECIPES[rid], noodle = r.items.thin ? 'thin' : 'thick';
      return makeQ(`${r.name}에 들어가는 면은?`, name(noodle), [name(noodle === 'thin' ? 'thick' : 'thin')], random);
    },
    (rid) => {
      const r = RECIPES[rid], inside = toppings.filter((t) => r.items[t]), outside = toppings.filter((t) => !r.items[t]);
      return makeQ(`${r.name}에 올리지 않는 토핑은?`, name(pickOne(outside, random)), shuffle(inside, random).slice(0, 2).map(name), random);
    },
    () => makeQ('숙주와 차슈를 두 번씩 듬뿍 올리는 라멘은?', RECIPES.rou.name, shuffle(ids.filter((i) => i !== 'rou'), random).slice(0, 2).map((i) => RECIPES[i].name), random)
  ];
  const out = [], used = new Set();
  for (let tries = 0; out.length < n && tries < 60; tries++) {
    const m = Math.floor(random() * makers.length) % makers.length, rid = pickOne(ids, random);
    const key = m === 3 ? 'rou-pile' : `${m}-${rid}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push(makers[m](rid));
  }
  return out;
}
