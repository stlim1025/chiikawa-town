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

/** 집에서 자면 다음 날 06:30 이 된다. 하루는 06:00 에 바뀌므로 새벽 2시에 자도 다음 day 의 아침이다. */
export function sleepUntilMorning(clock) {
  return createClock(clock.day + 1, 6.5);
}
