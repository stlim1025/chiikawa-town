import { trySpend } from './state.js';

/**
 * 제초 검정 말고 검정소에서 딸 수 있는 자격.
 *  liquor   술 자격: 쿠리만쥬에게 위스키 강의(8강)를 듣고 → 필기(전문 지식 6문제 중 5개, 문제당 15초) + 실기(하이볼 만들기)
 *  arbeiter 슈퍼 알바이터: 필기(레시피 · 조리 규칙 6문제 중 5개, 문제당 12초) + 실기(레시피 북 없이 손님 3명에게 실수 없이) → 라멘 로우 알바
 * state.licenses = { liquor?: { day: 딴 날 }, arbeiter?: { day } }, state.ramenDay = 마지막으로 알바한 날
 */
export const LICENSES = {
  liquor: { name: '술 자격', fee: 100, questions: 6, pass: 5, seconds: 15 },
  arbeiter: { name: '슈퍼 알바이터', fee: 200, questions: 6, pass: 5, seconds: 12 }
};

/**
 * 쿠리만쥬의 위스키 강의(한 번에 하나씩 차례로). 원작에서 시험 범위가 위스키(야마자키 · 하쿠슈 · 프롬 더 배럴 등)였던 것을 따랐다.
 * 필기 문제의 hint 는 모두 여기 어딘가에 들어 있다(강의를 안 들으면 풀기 어렵다).
 */
export const LIQUOR_LESSONS = [
  ['하아~ 술 공부라… 좋지. 시험은 위스키가 범위야.', '위스키는 보리를 싹 틔워 말린 맥아로 만들어. 이 과정을 몰팅이라고 해.',
    '맥아를 말릴 때 피트(이탄)를 태우면 스모키한 연기 향이 배어.', '피트 향이 진한 위스키로 유명한 곳은 스코틀랜드의 아일라야. 스페이사이드나 로우랜드는 피트를 잘 안 쓰고.'],
  ['만드는 순서는 꼭 외워. 몰팅 → 당화 → 발효 → 증류 → 숙성.', '몰트 위스키는 단식 증류기(포트 스틸)로 보통 두 번 증류해. 그레인 위스키는 연속식 증류기를 쓰고.',
    '갓 증류한 원액은 물처럼 투명해. 뉴 메이크라고 불러. 위스키 색은 전부 통에서 나오는 거야.'],
  ['숙성 이야기를 해 볼까. 오크통 속에서 해마다 조금씩 증발해서 줄어드는데, 그걸 천사의 몫이라고 해.',
    '나무에 스며들어 사라지는 건 악마의 몫이라고 부르는 사람도 있어. 헷갈리지 마~',
    '셰리를 담았던 통에서 숙성하면 말린 과일 같은 달콤한 향이 나. 일본 참나무로 만든 미즈나라 통은 향이 독특하지.'],
  ['종류도 알아야 해. 싱글 몰트는 맥아만 써서 한 증류소에서 만든 위스키야.', '여러 증류소의 몰트와 그레인을 섞으면 블렌디드.',
    '미국 버번은 옥수수를 51% 이상 쓰고, 속을 그을린 새 오크통에서 숙성해야 버번이라고 부를 수 있어.'],
  ['규칙 시간이야. 스카치는 스코틀랜드에서 오크통에 3년 이상 숙성해야 해.', '병에 담을 때 도수는 40도 이상이어야 하고.',
    '물을 하나도 안 타고 통에서 꺼낸 도수 그대로 담으면 캐스크 스트렝스. 통 하나에서만 담으면 싱글 캐스크고.'],
  ['일본 위스키도 나와. 야마자키 증류소는 일본 최초의 몰트 위스키 증류소야. 오사카에 있지.',
    '하쿠슈 증류소는 야마나시의 숲속에 있어서 숲의 증류소라고 불려.', '홋카이도에 있는 건 요이치 증류소고. 섞지 마~'],
  ['프롬 더 배럴 알아? 도수가 51.4도인 블렌디드 위스키야. 작은 병에 진한 맛이 꽉 차 있지.',
    '블렌딩한 원액을 다시 통에 넣어 재워서 맛을 어우러지게 해. 그걸 매링이라고 해.'],
  ['마지막은 마시는 법. 위스키와 물을 1:1로 섞으면 트와이스 업. 향이 확 피어나.',
    '얼음에 그대로면 온더록, 물을 넉넉히 타면 미즈와리, 탄산수는 위스키 1에 3~4면 하이볼.',
    '술을 마실 땐 자격증을 꼭 챙겨야 해. 나도 한 번 안 들고 나갔다가 못 마셨어… 하아~']
];

/**
 * 술 자격 필기 문제(전문 지식). 보기도 진짜 용어로 헷갈리게 했다. hint 는 강의에서 배운 말.
 */
export const LIQUOR_QUIZ = [
  { q: '맥아를 말릴 때 피트를 태우면 배는 향은?', right: '스모키한 연기 향', wrong: ['바닐라 향', '말린 과일 향'], hint: '스모키한 연기 향' },
  { q: '피트 향이 진한 위스키로 유명한 스코틀랜드 지역은?', right: '아일라', wrong: ['스페이사이드', '로우랜드'], hint: '아일라' },
  { q: '위스키를 만드는 순서로 맞는 것은?', right: '몰팅 → 당화 → 발효 → 증류 → 숙성', wrong: ['몰팅 → 발효 → 당화 → 증류 → 숙성', '당화 → 몰팅 → 증류 → 발효 → 숙성'], hint: '몰팅 → 당화 → 발효 → 증류 → 숙성' },
  { q: '몰트 위스키를 증류하는 기구는?', right: '단식 증류기(포트 스틸)', wrong: ['연속식 증류기', '감압 증류기'], hint: '포트 스틸' },
  { q: '갓 증류한 원액(뉴 메이크)의 색은?', right: '투명하다', wrong: ['연한 호박색', '진한 갈색'], hint: '투명' },
  { q: '숙성 중에 통 속 위스키가 증발해 줄어드는 것은?', right: '천사의 몫', wrong: ['악마의 몫', '요정의 잔'], hint: '천사의 몫' },
  { q: '셰리 통에서 숙성하면 주로 나는 향은?', right: '말린 과일 같은 달콤한 향', wrong: ['스모키한 연기 향', '소독약 같은 향'], hint: '말린 과일' },
  { q: '일본 참나무로 만든 위스키 통은?', right: '미즈나라', wrong: ['셰리 버트', '버번 배럴'], hint: '미즈나라' },
  { q: '싱글 몰트 위스키의 조건은?', right: '맥아만 써서 한 증류소에서', wrong: ['여러 증류소의 몰트를 섞어서', '맥아와 그레인을 섞어서'], hint: '한 증류소' },
  { q: '버번 위스키를 숙성하는 통은?', right: '속을 그을린 새 오크통', wrong: ['한 번 쓴 셰리 통', '미즈나라 통'], hint: '그을린 새 오크통' },
  { q: '버번은 옥수수를 최소 몇 % 써야 할까?', right: '51%', wrong: ['30%', '80%'], hint: '51%' },
  { q: '스카치라고 부르려면 최소 몇 년 숙성해야 할까?', right: '3년', wrong: ['1년', '5년'], hint: '3년' },
  { q: '스카치 위스키를 병에 담을 때 최소 도수는?', right: '40도', wrong: ['37도', '43도'], hint: '40도' },
  { q: '물을 타지 않고 통에서 꺼낸 도수 그대로 담은 위스키는?', right: '캐스크 스트렝스', wrong: ['싱글 캐스크', '블렌디드'], hint: '캐스크 스트렝스' },
  { q: '일본 최초의 몰트 위스키 증류소는?', right: '야마자키', wrong: ['하쿠슈', '요이치'], hint: '일본 최초' },
  { q: "'숲의 증류소' 하쿠슈 증류소가 있는 곳은?", right: '야마나시', wrong: ['오사카', '홋카이도'], hint: '야마나시' },
  { q: '프롬 더 배럴의 도수는?', right: '51.4도', wrong: ['43도', '48.2도'], hint: '51.4도' },
  { q: '블렌딩한 원액을 다시 통에 재워 어우러지게 하는 것은?', right: '매링', wrong: ['몰팅', '당화'], hint: '매링' },
  { q: '위스키와 물을 1:1로 섞어 마시는 방법은?', right: '트와이스 업', wrong: ['미즈와리', '온더록'], hint: '트와이스 업' }
];

/** 하이볼 실기: 위스키는 잔의 이만큼까지, 탄산수를 넣은 뒤 전체는 이만큼까지(넘치면 안 된다). */
export const WHISKY_BAND = [0.18, 0.32];
export const SODA_BAND = [0.82, 0.97];

export function licensesOf(state) {
  return state.licenses || {};
}
export function hasLicense(state, id) {
  return !!licensesOf(state)[id];
}

/** 응시료를 낸다. { ok, state, reason: 'owned' | 'money' } */
export function payFee(state, id) {
  if (hasLicense(state, id)) return { ok: false, reason: 'owned', state };
  const paid = trySpend(state, LICENSES[id].fee);
  if (!paid.ok) return { ok: false, reason: 'money', state };
  return { ok: true, state: paid.state };
}

/** 합격: 자격증을 준다. */
export function grant(state, id, day) {
  return { ...state, licenses: { ...licensesOf(state), [id]: { day } } };
}

function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 술 자격 필기: 문제 n 개를 골라 보기를 섞는다. → [{ q, choices, answer }] */
export function liquorQuiz(n, random = Math.random) {
  return shuffle(LIQUOR_QUIZ, random).slice(0, n).map((item) => {
    const choices = shuffle([item.right, ...item.wrong], random);
    return { q: item.q, choices, answer: choices.indexOf(item.right) };
  });
}

/** 맞힌 개수. answers[i] 는 i 번 문제에서 고른 보기 번호. */
export function gradeQuiz(questions, answers) {
  return questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
}
export function passedWritten(id, correct) {
  return correct >= LICENSES[id].pass;
}

/** 하이볼: 위스키 양(잔 대비 0..1)과 탄산수까지 부은 전체 양이 모두 선 안에 들어왔는지. */
export function pourOk(whisky, total) {
  return whisky >= WHISKY_BAND[0] && whisky <= WHISKY_BAND[1] && total >= SODA_BAND[0] && total <= SODA_BAND[1];
}

/** 라멘 로우 알바를 할 수 있는지: 자격이 있고 오늘 아직 안 했으면. { ok, reason: 'license' | 'today' } */
export function canWorkRamen(state, day) {
  if (!hasLicense(state, 'arbeiter')) return { ok: false, reason: 'license' };
  if (state.ramenDay === day) return { ok: false, reason: 'today' };
  return { ok: true };
}
export function workedRamen(state, day) {
  return { ...state, ramenDay: day };
}

/** 저장된 자격 모양이 맞는지(save.js 검사). */
export function isValidLicenses(l) {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return false;
  return Object.entries(l).every(([id, v]) => LICENSES[id] && v && typeof v.day === 'number' && Number.isFinite(v.day));
}
