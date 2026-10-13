/**
 * 사이드스토리 '검은 별똥별'(원작: 소원을 들어주지만 들어주고 나면 찜찜해진다는 검은 별똥별이 치이카와의 새 자명종에 붙어,
 * "이런 날이 계속됐으면 좋겠다"는 말 그대로 같은 날이 되풀이된다)의 되풀이 규칙. 연출은 stories/blackstar.js.
 *
 * state.story.blackLoop = { day: 되풀이되는 날, n: 몇 번 되돌아왔는지, mark: 마지막으로 이야기 장면을 본 때의 n }
 *  - 있는 동안 그날 밤 12시가 지나면(또는 그 너머까지 자고 일어나면) 그날 아침 6시 반으로 되돌아온다.
 *  - 하루는 아침 6시에 바뀌니 밤 12시는 아직 그날이다: 날짜 번호는 그대로라 집세 · 일감 · 친구 부탁 · 추첨권처럼
 *    날짜를 따르는 것도 그대로 되풀이된다. 가진 돈 · 물건은 그대로(나와 치이카와만 기억한다).
 * state.story.blackFree = 검은 별똥별을 쫓아낸 날(그다음 날 아침이 비 오는 '내일').
 */
/** 밤 12시(하루는 아침 6시에 시작하니 그날의 18/24 지점). */
export const MIDNIGHT_T = 18 / 24;
/** 되돌아오는 때: 아침 6시 반. */
export const WAKE_T = 0.5 / 24;
/** 도구점의 산소 표백제 값(없애는 법을 찾은 뒤에만 판다). */
export const BLEACH_PRICE = 100;

/** 되풀이 중이면 { day, n, mark }, 아니면 null. */
export const loopOf = (state) => (state && state.story && state.story.blackLoop) || null;
/** 지금까지 되돌아온 횟수(되풀이 중이 아니면 0). */
export const loopCount = (state) => { const L = loopOf(state); return L ? L.n : 0; };

/** 되풀이를 건다: 내일(다음 날 아침부터)이 되풀이되는 날. */
export function startLoop(state) {
  return { ...state, story: { ...(state.story || {}), blackLoop: { day: state.clock.day + 1, n: 0, mark: -1 } } };
}

/** 되돌릴 때가 됐는지: 되풀이되는 날의 밤 12시가 지났거나, 그 너머(다음 날)로 넘어갔다. clock 을 주면 그 시계로 본다(자고 일어날 때). */
export function loopDue(state, clock = state && state.clock) {
  const L = loopOf(state);
  if (!L || !clock) return false;
  return clock.day > L.day || (clock.day === L.day && clock.t >= MIDNIGHT_T);
}

/** 되돌린다: 그날 아침 6시 반으로, 횟수 +1. */
export function rewind(state) {
  const L = loopOf(state);
  if (!L) return state;
  return { ...state, clock: { day: L.day, t: WAKE_T }, story: { ...state.story, blackLoop: { ...L, n: L.n + 1 } } };
}

/** 이야기 장면을 봤다: 다음 '새로 되돌아온 날' 장면은 한 번 더 되돌아온 뒤에 열린다. */
export function markLoop(state) {
  const L = loopOf(state);
  if (!L) return state;
  return { ...state, story: { ...state.story, blackLoop: { ...L, mark: L.n } } };
}

/** 되풀이를 끝낸다(검은 별똥별을 쫓아냈다): 오늘을 적어 둔다 — 다음 날 아침이 '내일'. */
export function endLoop(state) {
  const story = { ...(state.story || {}) };
  delete story.blackLoop;
  return { ...state, story: { ...story, blackFree: state.clock.day } };
}

/**
 * 이 단계를 지금 열 수 있는지(퀘스트 단계의 표시):
 *  loop: 되풀이되는 날이어야 · newLoop: 지난 장면 뒤로 한 번 더 되돌아온 날이어야 · afterFree: 쫓아낸 다음 날부터.
 */
export function loopGate(state, step) {
  if (!step) return false;
  const L = loopOf(state);
  if ((step.loop || step.newLoop) && !(L && state.clock && state.clock.day === L.day)) return false;
  if (step.newLoop && !(L.n > L.mark)) return false;
  if (step.afterFree) {
    const f = state.story && state.story.blackFree;
    if (!(typeof f === 'number' && state.clock && state.clock.day > f)) return false;
  }
  return true;
}
