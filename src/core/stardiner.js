/**
 * 사이드스토리 '별 세 개 레스토랑'(원작: 레스토랑에 붙잡혀 있던 별똥별 셋을 하치와레가 구해 준다)의 구출 놀이 규칙.
 * 별똥별 셋 × 모서리 다섯마다 쇠고랑이 채워져 있다. 쇠고랑을 꾹 누르고 있으면(HOLD_SEC) 모서리가 쏙 빠진다(손을 떼면 조금씩 도로 조여든다).
 * 주방의 주인이 가끔 내다본다: 달그락(warn) → 내다봄(peek). 내다볼 때 누르고 있으면 들킬 뻔해서 그 쇠고랑이 다시 꽉 조인다.
 * 실패해서 끝나는 일은 없다(조심조심 다 빼내면 된다). 연출은 stories/stardiner.js, 장면은 world/stardiner.js.
 */
export const STARS = 3, CORNERS = 5;
/** 쇠고랑 하나를 빼내는 데 꾹 누르고 있어야 하는 시간(초). */
export const HOLD_SEC = 0.75;
/** 주방: 조용한 시간(초, 이 사이에서 무작위) → 달그락(초) → 내다봄(초). */
export const CALM_SEC = [6, 10], WARN_SEC = 1.0, PEEK_SEC = 1.4;

const calm = (random) => CALM_SEC[0] + random() * (CALM_SEC[1] - CALM_SEC[0]);

/** 새 구출 놀이: 쇠고랑 열다섯(i = 별 × 5 + 모서리). */
export function newRescue(random = Math.random) {
  return {
    clamps: Array.from({ length: STARS * CORNERS }, (_, i) => ({ i, star: Math.floor(i / CORNERS), corner: i % CORNERS, p: 0, free: false })),
    phase: 'calm', left: calm(random), caught: 0
  };
}

/** 그 별의 모서리가 다 빠졌는지. */
export const starFreed = (R, s) => R.clamps.every((c) => c.star !== s || c.free);
/** 다 구했는지. */
export const allFree = (R) => R.clamps.every((c) => c.free);
/** 다음에 뺄 쇠고랑(키보드 · 행동 버튼은 이것을 누른다). */
export const nextClamp = (R) => R.clamps.find((c) => !c.free) || null;

/**
 * dt 초 흐른다. holding: 지금 꾹 누르고 있는 쇠고랑 번호(없으면 null). R 을 바꾸고 일어난 일을 돌려준다:
 * { type: 'free', i } 모서리가 빠졌다 · { type: 'star', star } 별 하나가 다 풀렸다 · { type: 'done' } 다 구했다
 * · { type: 'caught', i } 내다볼 때 누르다 들킬 뻔(그 쇠고랑이 다시 조였다 — 손을 떼게 한다) · { type: 'warn' | 'peek' | 'calm' } 주방
 */
export function stepRescue(R, dt, holding, random = Math.random) {
  const ev = [];
  if (allFree(R)) return ev;
  R.left -= dt;
  if (R.left <= 0) {
    if (R.phase === 'calm') { R.phase = 'warn'; R.left = WARN_SEC; ev.push({ type: 'warn' }); }
    else if (R.phase === 'warn') { R.phase = 'peek'; R.left = PEEK_SEC; ev.push({ type: 'peek' }); }
    else { R.phase = 'calm'; R.left = calm(random); ev.push({ type: 'calm' }); }
  }
  for (const c of R.clamps) {
    if (c.free) continue;
    if (holding !== c.i) { c.p = Math.max(0, c.p - dt * 0.5); continue; } // 손을 떼면 천천히 도로 조인다
    if (R.phase === 'peek') { c.p = 0; R.caught++; ev.push({ type: 'caught', i: c.i }); continue; }
    c.p = Math.min(1, c.p + dt / HOLD_SEC);
    if (c.p < 1) continue;
    c.free = true;
    ev.push({ type: 'free', i: c.i });
    if (starFreed(R, c.star)) ev.push({ type: 'star', star: c.star });
    if (allFree(R)) ev.push({ type: 'done' });
  }
  return ev;
}
