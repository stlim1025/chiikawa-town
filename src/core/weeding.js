/**
 * 풀 종류(10종)와 뽑기 규칙. 제초 검정 급수(5급 → 1급)가 오를수록 뽑을 수 있는 풀이 늘어난다.
 * grade: 이 급수부터 뽑을 수 있다. chargeTime: 게이지가 끝까지 차는 시간(초). width: 초록 구간 폭(게이지 비율).
 * stages: 몇 번에 나눠 뽑는지(덩굴 · 이끼 · 왕잡초는 한 번에 안 뽑힌다). drift: 누르는 동안 초록 구간이 흔들리는 폭과 빠르기.
 * poison: 끊기면(snapped) 독이 튀어 기운이 더 든다. night: 밤에만 모습을 드러낸다.
 * where: 자라는 곳(도감 · 안내 문구), tip: 뽑는 요령(도감).
 */
export const WEED_KINDS = {
  weed: { name: '잡초', grade: 5, chargeTime: 1.1, width: 0.24, where: '마을 · 들판', tip: '가장 흔한 풀. 초록 칸에서 손을 떼요.' },
  clover: { name: '토끼풀', grade: 5, chargeTime: 1.35, width: 0.2, where: '마을 · 들판 · 강가', tip: '뿌리가 옆으로 퍼져 있어 게이지가 천천히 차요.' },
  foxtail: { name: '강아지풀', grade: 4, chargeTime: 0.95, width: 0.18, drift: { amp: 0.07, speed: 3.2 }, where: '들판 · 마을 울타리 가', tip: '바람에 살랑살랑. 초록 칸도 같이 흔들려요.' },
  vine: { name: '덩굴풀', grade: 4, chargeTime: 1.0, width: 0.2, stages: 2, where: '숲', tip: '줄기가 길어서 두 번에 나눠 뽑아요.' },
  thorny: { name: '위험한 풀', grade: 3, chargeTime: 0.85, width: 0.1, where: '마을 울타리 가 · 숲', tip: '가시투성이라 초록 칸이 아주 좁아요.' },
  reed: { name: '물가 갈대', grade: 3, chargeTime: 0.9, width: 0.15, drift: { amp: 0.13, speed: 2.4 }, where: '강가 · 호숫가', tip: '물살에 흔들려서 초록 칸이 크게 오르내려요.' },
  rockmoss: { name: '바위틈 이끼풀', grade: 2, chargeTime: 0.8, width: 0.13, stages: 2, where: '바위산', tip: '바위에 꽉 붙어 있어요. 좁은 칸을 두 번 맞혀요.' },
  moongrass: { name: '달빛 풀', grade: 2, chargeTime: 0.85, width: 0.13, drift: { amp: 0.14, speed: 3.4 }, night: true, where: '숲 · 바위산 (밤에만)', tip: '밤에만 빛나며 나타나요. 랜턴을 들고 찾아봐요.' },
  giantweed: { name: '왕잡초', grade: 1, chargeTime: 1.15, width: 0.15, stages: 3, drift: { amp: 0.08, speed: 2.0 }, where: '숲 깊은 곳', tip: '어른 키만 한 잡초. 세 번에 나눠 뽑아요.' },
  poisonweed: { name: '독풀', grade: 1, chargeTime: 0.7, width: 0.1, drift: { amp: 0.1, speed: 4.0 }, poison: true, where: '바위산 깊은 곳', tip: '끊기면 독이 튀어 기운이 쭉 빠져요. 신중하게!' }
};
/** 도감 · 일감 순서(쉬운 것부터). */
export const WEED_ORDER = ['weed', 'clover', 'foxtail', 'vine', 'thorny', 'reed', 'rockmoss', 'moongrass', 'giantweed', 'poisonweed'];

/** 풀 한 번(한 단계) 뽑을 때 드는 기운. */
export const STAMINA_PER_PULL = 4;
/** 독풀이 끊겼을 때 더 드는 기운. */
export const POISON_STAMINA = 12;

/** 지금 급수로 그 풀을 뽑을 수 있는지(급수 숫자가 작을수록 높다). */
export const canPullKind = (grade, kind) => grade <= WEED_KINDS[kind].grade;
/** 몇 번에 나눠 뽑는지. */
export const stagesOf = (kind) => WEED_KINDS[kind].stages || 1;
/** 그 급수의 풀 종류들. */
export const kindsOfGrade = (grade) => WEED_ORDER.filter((k) => WEED_KINDS[k].grade === grade);

// 초록 구간이 놓일 수 있는 범위: 톡 누르기(0.25 미만)보다 위, 게이지 끝보다 조금 아래
const ZONE_MIN = 0.3, ZONE_MAX = 0.97;

/**
 * 기운에 따른 난이도. 기운이 낮을수록 초록 구간이 좁아지고(widthScale) 게이지가 빨리 찬다(speedScale).
 * 기운이 가득하면 { widthScale: 1, speedScale: 1 }.
 */
export function pullDifficulty(stamina, max = 100) {
  const tired = 1 - Math.max(0, Math.min(1, stamina / max));
  return { widthScale: 1 - 0.5 * tired, speedScale: 1 + 0.6 * tired };
}

/**
 * 뽑기 시작. 초록 구간 위치는 뽑을 때마다 무작위로 정해진다(흔들리는 풀은 그 둘레를 오르내린다).
 * opts: { stamina, maxStamina, random } — random 은 0..1 을 돌려주는 함수(테스트에서 고정값을 넣는다).
 */
export function startPull(kind, { stamina = 100, maxStamina = 100, random = Math.random } = {}) {
  const k = WEED_KINDS[kind], d = pullDifficulty(stamina, maxStamina);
  const width = k.width * d.widthScale;
  const amp = k.drift ? k.drift.amp : 0;
  // 흔들려도 범위를 벗어나지 않게 가운데 자리를 고른다
  const lo = ZONE_MIN + amp, hi = Math.max(lo, ZONE_MAX - width - amp);
  const base = lo + random() * (hi - lo);
  return {
    kind, power: 0, t: 0, chargeTime: k.chargeTime / d.speedScale, width, base,
    drift: k.drift ? { amp, speed: k.drift.speed, phase: random() * Math.PI * 2 } : null,
    greenFrom: base, greenTo: base + width
  };
}

/** 누르고 있는 동안 힘을 채운다. 흔들리는 풀은 초록 구간도 움직인다. */
export function chargePull(pull, seconds) {
  const t = (pull.t || 0) + seconds;
  const off = pull.drift ? pull.drift.amp * Math.sin(pull.drift.phase + t * pull.drift.speed) : 0;
  const greenFrom = (pull.base ?? pull.greenFrom) + off;
  return { ...pull, t, power: Math.min(1, pull.power + seconds / pull.chargeTime), greenFrom, greenTo: greenFrom + (pull.width ?? pull.greenTo - pull.greenFrom) };
}

/** 손을 뗄 때 결과: 'none' 안 뽑힘, 'snapped' 끊어짐, 'clean' 깔끔하게. */
export function releasePull(pull) {
  if (pull.power < 0.25) return 'none';
  if (pull.power >= pull.greenFrom && pull.power <= pull.greenTo) return 'clean';
  return 'snapped';
}

/**
 * 여러 번에 나눠 뽑는 풀의 진행. progress = { stage: 지금까지 뽑은 단계 수, flawed: 한 번이라도 끊겼는지 }.
 * 'none' 이면 그대로. 마지막 단계면 done 과 최종 결과(final: 한 번도 안 끊겼으면 'clean')를 돌려준다.
 */
export function advanceWeed(progress, kind, result) {
  const p = progress || { stage: 0, flawed: false };
  if (result === 'none') return { ...p, done: false, final: null };
  const stage = p.stage + 1, flawed = p.flawed || result === 'snapped';
  const done = stage >= stagesOf(kind);
  return { stage, flawed, done, final: done ? (flawed ? 'snapped' : 'clean') : null };
}

/** 한 번 뗄 때 드는 기운(독풀이 끊기면 더). */
export function pullStamina(kind, result) {
  if (result === 'none') return 0;
  return STAMINA_PER_PULL + (WEED_KINDS[kind].poison && result === 'snapped' ? POISON_STAMINA : 0);
}

/** 도감 기록(state.weedLog = { 종류: 뽑은 수 })이 맞는 모양인지(save.js 검사). */
export function isValidWeedLog(log) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return false;
  return Object.entries(log).every(([k, n]) => WEED_KINDS[k] && typeof n === 'number' && Number.isFinite(n) && n >= 0);
}

/** 받침에 맞춰 조사를 붙인다. josa('갈대', '을/를') → '갈대를'. */
export function josa(word, pair) {
  const [withB, without] = pair.split('/');
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withB : without);
}
