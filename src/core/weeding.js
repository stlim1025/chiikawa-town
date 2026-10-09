/** 풀 종류별 힘 게이지 설정: 끝까지 차는 데 걸리는 시간(초)과 초록 구간 폭(게이지 비율). */
export const WEED_KINDS = {
  weed: { chargeTime: 1.1, width: 0.24 },
  thorny: { chargeTime: 0.85, width: 0.1 }
};
/** 풀 하나를 뽑을 때 드는 기운. */
export const STAMINA_PER_PULL = 4;

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
 * 뽑기 시작. 초록 구간 위치는 뽑을 때마다 무작위로 정해진다.
 * opts: { stamina, maxStamina, random } — random 은 0..1 을 돌려주는 함수(테스트에서 고정값을 넣는다).
 */
export function startPull(kind, { stamina = 100, maxStamina = 100, random = Math.random } = {}) {
  const k = WEED_KINDS[kind], d = pullDifficulty(stamina, maxStamina);
  const width = k.width * d.widthScale;
  const greenFrom = ZONE_MIN + random() * (ZONE_MAX - width - ZONE_MIN);
  return { kind, power: 0, chargeTime: k.chargeTime / d.speedScale, greenFrom, greenTo: greenFrom + width };
}

/** 누르고 있는 동안 힘을 채운다. */
export function chargePull(pull, seconds) {
  return { ...pull, power: Math.min(1, pull.power + seconds / pull.chargeTime) };
}

/** 손을 뗄 때 결과: 'none' 안 뽑힘, 'snapped' 끊어짐, 'clean' 깔끔하게. */
export function releasePull(pull) {
  if (pull.power < 0.25) return 'none';
  if (pull.power >= pull.greenFrom && pull.power <= pull.greenTo) return 'clean';
  return 'snapped';
}
