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

/** 같은 보기 묶음이 겹치지 않게 서로 다른 것만 n 개. */
function distinct(list, n, key = (x) => x) {
  const seen = new Set(), out = [];
  for (const x of list) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } if (out.length >= n) break; }
  return out;
}
/** 레시피 재료를 '간장 수프 · 굵은 면 · 숙주 ×2' 처럼(늘 수프 → 면 → 토핑 순서로, 보기 순서로 답이 드러나지 않게). */
const ING_ORDER = Object.keys(INGREDIENTS);
const listOf = (items) => Object.entries(items).sort((a, b) => ING_ORDER.indexOf(a[0]) - ING_ORDER.indexOf(b[0]))
  .map(([k, n]) => (n > 1 ? `${INGREDIENTS[k].name} ×${n}` : INGREDIENTS[k].name)).join(' · ');
/** 받침에 맞는 조사. */
const ga = (w) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? '이' : '가'); };

/**
 * 슈퍼 알바이터 필기: 레시피 · 조리 규칙에서 4지선다를 만든다. 비슷한 오답(재료 하나만 다르거나 개수만 다른 것)으로 헷갈리게 한다.
 * 유형: 전체 재료 고르기 · 재료로 라멘 맞히기 · 개수 · 한 재료가 들어가는 라멘들 · 면 종류로 묶기 · 삶는 시간 · 퍼지는 시간 · 빠진 재료 찾기.
 * → [{ q, choices, answer }]
 */
export function ramenQuiz(n, random = Math.random) {
  const ids = Object.keys(RECIPES);
  const toppings = Object.keys(INGREDIENTS).filter((k) => INGREDIENTS[k].kind === 'topping');
  const soups = Object.keys(INGREDIENTS).filter((k) => INGREDIENTS[k].kind === 'soup');
  const name = (k) => INGREDIENTS[k].name, rname = (r) => RECIPES[r].name;
  /** 레시피를 살짝 바꾼 오답: 토핑 하나 바꾸기 · 개수 바꾸기 · 수프나 면 바꾸기. */
  function mutate(items) {
    const m = { ...items }, keys = Object.keys(m), r = random();
    if (r < 0.4) {
      const tops = keys.filter((k) => INGREDIENTS[k].kind === 'topping'), out = toppings.filter((t) => !m[t]);
      const k = pickOne(tops, random); delete m[k]; m[pickOne(out, random)] = 1;
    } else if (r < 0.65) {
      const tops = keys.filter((k) => INGREDIENTS[k].kind === 'topping'), k = pickOne(tops, random);
      m[k] = m[k] > 1 ? 1 : 2;
    } else if (r < 0.85) {
      const s = keys.find((k) => INGREDIENTS[k].kind === 'soup'); delete m[s]; m[pickOne(soups.filter((x) => x !== s), random)] = 1;
    } else {
      const nd = m.thin ? 'thin' : 'thick'; delete m[nd]; m[nd === 'thin' ? 'thick' : 'thin'] = 1;
    }
    return m;
  }
  const same = (a, b) => listOf(a) === listOf(b);
  const makers = [
    // 1) 전체 재료 고르기(비슷한 오답 셋)
    (rid) => {
      const want = RECIPES[rid].items, wrong = [];
      for (let t = 0; t < 40 && wrong.length < 3; t++) {
        const m = mutate(want);
        if (!same(m, want) && !wrong.some((w) => same(w, m)) && !ids.some((o) => same(RECIPES[o].items, m))) wrong.push(m);
      }
      return makeQ(`${rname(rid)}의 재료로 맞는 것은?`, listOf(want), wrong.map(listOf), random);
    },
    // 2) 재료로 라멘 맞히기(수프 이름은 빼고 면 · 토핑만 보여 준다)
    (rid) => {
      const want = RECIPES[rid].items, shown = Object.fromEntries(Object.entries(want).filter(([k]) => INGREDIENTS[k].kind !== 'soup'));
      return makeQ(`면과 토핑이 '${listOf(shown)}'인 라멘은?`, rname(rid), shuffle(ids.filter((i) => i !== rid), random).slice(0, 3).map(rname), random);
    },
    // 3) 개수: 두 번 넣는 재료가 있는 라멘에서
    () => {
      const k = pickOne(['moyashi', 'chashu'], random);
      return makeQ(`로우 라멘에 ${name(k)}는 몇 번 올릴까?`, '2번', ['1번', '3번', '안 올린다'], random);
    },
    // 4) 한 토핑이 들어가는 라멘을 모두 고르기(묶음 보기)
    () => {
      const cands = toppings.filter((t) => ids.filter((i) => RECIPES[i].items[t]).length >= 2);
      const t = pickOne(cands, random), right = ids.filter((i) => RECIPES[i].items[t]);
      const rightTxt = right.map(rname).join(' · ');
      const wrong = [];
      for (let k = 0; k < 40 && wrong.length < 3; k++) {
        const pick = shuffle(ids, random).slice(0, right.length);
        const txt = ids.filter((i) => pick.includes(i)).map(rname).join(' · ');
        if (txt !== rightTxt && !wrong.includes(txt)) wrong.push(txt);
      }
      return makeQ(`${ga(name(t))} 들어가는 라멘을 모두 고르면?`, ids.filter((i) => right.includes(i)).map(rname).join(' · '), wrong, random);
    },
    // 5) 굵은 면을 쓰는 라멘끼리
    () => {
      const thick = ids.filter((i) => RECIPES[i].items.thick), right = thick.map(rname).join(' · ');
      const wrong = distinct(shuffle([['shoyu', 'miso'], ['miso', 'shio'], ['rou', 'tonkotsu'], ['shoyu', 'rou'], ['shio', 'tonkotsu']], random)
        .map((p) => ids.filter((i) => p.includes(i)).map(rname).join(' · ')).filter((t) => t !== right), 3);
      return makeQ('굵은 면을 쓰는 라멘끼리 묶은 것은?', right, wrong, random);
    },
    // 6) 삶는 시간
    () => {
      const nd = pickOne(['thin', 'thick'], random);
      const right = `${BOIL[nd].toFixed(1)}초`, pool = ['2.0초', '3.0초', '3.5초', '4.5초', '6.0초'].filter((x) => x !== right);
      return makeQ(`${name(nd)}은 몇 초 삶아야 딱 좋을까?`, right, shuffle(pool, random).slice(0, 3), random);
    },
    // 7) 퍼지는 시간
    () => makeQ('다 삶은 면을 냄비에 몇 초 넘게 두면 퍼질까?', `${SOGGY_AFTER}초`, ['2초', '6초', '8초'], random),
    // 8) 빠진 재료 찾기(하나를 빼고 보여 준다)
    (rid) => {
      const want = RECIPES[rid].items, keys = Object.keys(want).filter((k) => INGREDIENTS[k].kind === 'topping'), miss = pickOne(keys, random);
      const shown = Object.fromEntries(Object.entries(want).filter(([k]) => k !== miss));
      const wrong = shuffle(toppings.filter((t) => !want[t]), random).slice(0, 3).map(name);
      return makeQ(`${rname(rid)}: ${listOf(shown)} … 하나가 빠졌다. 무엇일까?`, name(miss), wrong, random);
    }
  ];
  const out = [], used = new Set();
  // 레시피를 통째로 묻는 문제가 적어도 둘은 나오게 앞에 둔다
  const order = [0, 0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 1, 7, 0], random)];
  for (let tries = 0; out.length < n && tries < 80; tries++) {
    const m = order[tries % order.length], rid = pickOne(ids, random);
    const key = [0, 1, 7].includes(m) ? `${m}-${rid}` : `${m}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push(makers[m](rid));
  }
  return shuffle(out, random);
}
