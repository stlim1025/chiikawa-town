/**
 * 먹는 몸짓: 무엇을 먹느냐에 따라 몸짓(mode) · 손에 드는 것(prop, models.js 의 FOOD_PARTS 꼬리표) · 길이(초).
 * - slurp: 왼손에 그릇을 들고 오른손 젓가락으로 후루룩(라멘 · 전골)
 * - gulp: 잔을 들어 고개를 젖히고 꿀꺽꿀꺽, 내려놓고 "캬~"(맥주 · 하이볼 · 병맥주)
 * - nibble: 두 손으로 입에 대고 냠냠(주먹밥 · 열매 · 과자)
 */
export const EAT_MODES = Object.freeze(['slurp', 'gulp', 'nibble']);

const DUR = { slurp: 2.8, gulp: 2.4, nibble: 1.7 };
const style = (mode, prop) => Object.freeze({ mode, prop, dur: DUR[mode] });

export const EAT_STYLE = Object.freeze({
  ramen: style('slurp', 'f-ramen'),
  shisaramen: style('slurp', 'f-ramen'),
  hotpot: style('slurp', 'f-hotpot'),
  beer: style('gulp', 'f-beer'),
  highball: style('gulp', 'f-highball'),
  bottlebeer: style('gulp', 'f-bottle'),
  onigiri: style('nibble', 'f-onigiri'),
  riceball: style('nibble', 'f-onigiri'),
  rakkobento: style('nibble', 'f-onigiri'),
  berry: style('nibble', 'f-berry'),
  edamame: style('nibble', 'f-edamame'),
  jellybake: style('nibble', 'f-jelly'),
  pizzabun: style('nibble', 'f-pizzabun'),
  katsucurry: style('slurp', 'f-hotpot'),
  shellsoup: style('slurp', 'f-hotpot'),
  fruitbasket: style('nibble', 'f-apple'),
  cookies: style('nibble', 'f-cookie'),
  candy: style('nibble', 'f-candy'),
  omurice: style('slurp', 'f-omurice'),
  rusk: style('nibble', 'f-rusk'),
  bonbon: style('nibble', 'f-bonbon')
});

/** 그 음식을 먹는 몸짓 { mode, prop, dur } (모르는 것은 null). */
export const eatStyle = (id) => (Object.hasOwn(EAT_STYLE, id) ? EAT_STYLE[id] : null);
