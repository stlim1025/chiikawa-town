// 게임 달력. 원작에 따로 정해진 달력은 없고 계절이 현실 달력을 따라가므로(1월 1일에 새해 편, 1월 22일 우사기 생일 편),
// 1일째를 정해 두고 하루가 지날 때마다 달력을 넘긴다. 새 게임은 늘 GAME_START_DATE(10월 1일)에 시작한다
// (날짜에 맞춰 일어나는 마을 일을 누구나 같은 차례로 만나게). 예전 저장은 그때 실제 날짜로 시작한 startDate 를 그대로 쓴다.

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 새 게임의 1일째 날짜(게임 오리지널). 연도는 요일만 정한다: 2026-10-01 은 목요일(화면에는 월 · 일 · 요일만 나온다). */
export const GAME_START_DATE = '2026-10-01';

/** 지금(현지 시각) 날짜 'YYYY-MM-DD'. */
export function todayISO(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** day 번째 날의 날짜 { y, m, d, dow(0=일요일) }. day 1 이 startISO. */
export function dateOf(startISO, day) {
  const [y, m, d] = startISO.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + (day - 1) * DAY_MS); // UTC 로 계산해 서머타임 영향을 받지 않는다
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
}

/** 요일(0=일요일). */
export function weekdayOf(startISO, day) {
  return dateOf(startISO, day).dow;
}

/** '10월 8일 (목)' */
export function dateLabel(startISO, day) {
  const { m, d, dow } = dateOf(startISO, day);
  return `${m}월 ${d}일 (${DOW[dow]})`;
}
