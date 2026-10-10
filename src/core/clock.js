/** 게임 속 하루의 실제 길이(초). 06:00 에 하루가 시작한다. */
export const DAY_SECONDS = 720;

const START_HOUR = 6;

/** 새 시계를 만든다. hour 는 0..24 시각. */
export function createClock(day = 1, hour = 6.5) {
  return { day, t: ((((hour - START_HOUR) % 24) + 24) % 24) / 24 };
}

/** seconds 만큼 시간을 흘린다. */
export function advance(clock, seconds) {
  let t = clock.t + seconds / DAY_SECONDS;
  let day = clock.day;
  while (t >= 1) { t -= 1; day += 1; }
  return { day, t };
}

/** 0..24 시각. */
export function hourOf(clock) {
  return (START_HOUR + clock.t * 24) % 24;
}

/** 'HH:MM' 표기. */
export function timeLabel(clock) {
  const minutes = Math.round(hourOf(clock) * 60) % 1440;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/** 시간대: 아침 6–9, 낮 9–17, 저녁 17–20, 밤 20–6. */
export function phaseOf(clock) {
  const h = hourOf(clock);
  if (h >= 6 && h < 9) return 'morning';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

/** 한 번 자면 흐르는 시간(시). 언제 자든 아침까지가 아니라 이만큼만 흐른다. */
export const SLEEP_HOURS = 8;
/** hours 시간 자고 난 시계(하루는 06:00 에 바뀌니 밤 11시에 자면 다음 day 아침 7시). */
export function sleepFor(clock, hours = SLEEP_HOURS) {
  return advance(clock, (hours / 24) * DAY_SECONDS);
}
