/**
 * 박자 맞추기(우사기 클럽의 춤): 음(note)이 박자에 맞춰 다가오고, 맞는 순간에 누르면 퍼펙트 · 조금 어긋나면 굿.
 * 근처에 음이 없을 때 누르는 건 그냥 무시한다(벌점 없음). 실패해서 끝나는 일은 없고, 결과에 따라 손님들 반응만 달라진다.
 * notes: [{ at: 그 음의 시각(초, 시작부터), hit: null | 'perfect' | 'good' | 'miss' }]
 */
export const CLUB_BPM = 118;
/** 판정 폭(초): 이 안이면 퍼펙트 · 굿, 더 지나가면 놓침. */
export const PERFECT_WIN = 0.07, GOOD_WIN = 0.16;

/** 어긋난 시간(초) → 판정. */
export function judge(dt) {
  const a = Math.abs(dt);
  return a <= PERFECT_WIN ? 'perfect' : a <= GOOD_WIN ? 'good' : 'miss';
}

/**
 * 클럽 곡의 음 자리(몇 번째 박인지). 처음 4박은 준비(카운트), 그다음 8마디: 두 박마다 → 한 박마다 → 반 박 섞기 → 피버(한 박마다).
 */
export function clubChart() {
  const out = [];
  const bar = (n, beats) => beats.forEach((b) => out.push(4 + n * 4 + b));
  bar(0, [0, 2]); bar(1, [0, 2]);
  bar(2, [0, 1, 2, 3]); bar(3, [0, 1, 2, 3]);
  bar(4, [0, 1, 1.5, 2, 3]); bar(5, [0, 0.5, 1, 2, 2.5, 3]);
  bar(6, [0, 1, 2, 3]); bar(7, [0, 1, 2, 2.5, 3, 3.5]);
  return out;
}
/** 곡 길이(박): 마지막 음 뒤로 한 마디. */
export const chartBeats = (chart) => chart[chart.length - 1] + 4;

/** t(초)에 눌렀다: 아직 안 친 음 가운데 가장 가까운 것(굿 폭 안)을 친다. → { i, q, dt } | null(근처에 음이 없다) */
export function press(notes, t) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].hit) continue;
    const d = Math.abs(t - notes[i].at);
    if (d < bd) { bd = d; best = i; }
  }
  if (best < 0 || bd > GOOD_WIN) return null;
  const dt = t - notes[best].at, q = judge(dt);
  notes[best].hit = q;
  return { i: best, q, dt };
}
/** t(초)까지 지나간(굿 폭을 넘긴) 음은 놓친 것으로. → 이번에 놓친 음 번호들 */
export function sweep(notes, t) {
  const out = [];
  notes.forEach((n, i) => { if (!n.hit && t - n.at > GOOD_WIN) { n.hit = 'miss'; out.push(i); } });
  return out;
}

/** 결과: 판정별 수 · 점수(0..1) · 등급(S · A · B · C). */
export function result(notes) {
  const c = { perfect: 0, good: 0, miss: 0 };
  notes.forEach((n) => { if (n.hit) c[n.hit]++; else c.miss++; });
  const total = notes.length || 1, score = (c.perfect + c.good * 0.6) / total;
  const rank = score >= 0.9 ? 'S' : score >= 0.7 ? 'A' : score >= 0.45 ? 'B' : 'C';
  return { ...c, score, rank };
}
