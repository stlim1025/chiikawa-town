import { dateOf } from './calendar.js';

/**
 * 계절과 날씨(설계서 docs/Seasons-Weather-2026-11-16.html, 게임 오리지널): three 없이 쓰고 테스트한다.
 * 계절은 게임 달력(시작 날짜 + 날 번호 → dateOf)의 달로 정한다: 3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울.
 * 날씨는 아침 6시(날 번호가 바뀔 때)에 시작 날짜와 날 번호로 만든 고정된 난수로 고른다. 저장할 것이 없고,
 * 같이 놀기 손님도 주인 마을의 시작 날짜와 날 번호로 같은 날씨를 본다. 새 게임 1~2일째는 늘 맑음(첫날 안내).
 */
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
/** 그 달의 계절. */
export const seasonOfMonth = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
/** 시작 날짜 startISO 로 day 번째 날의 계절. */
export const seasonAt = (startISO, day) => seasonOfMonth(dateOf(startISO, day).m);

/** 계절마다 날씨 확률(합 1). 겨울엔 비 대신 눈. */
export const WEATHER_P = {
  spring: { sunny: 0.55, cloudy: 0.2, rain: 0.25 },
  summer: { sunny: 0.55, cloudy: 0.15, rain: 0.3 },
  autumn: { sunny: 0.6, cloudy: 0.25, rain: 0.15 },
  winter: { sunny: 0.45, cloudy: 0.25, snow: 0.3 }
};
/** 날씨가 해와 하늘빛을 약하게 하는 정도(밤 판단과는 따로 — main 의 applySky). */
export const WEATHER_DIM = { sunny: 0, cloudy: 0.15, rain: 0.35, snow: 0.2 };

/** 시작 날짜와 날 번호로 0 ~ 1 값(FNV-1a 뒤에 섞기 — 같은 입력은 늘 같다). */
function roll(startISO, day) {
  let h = 0x811c9dc5;
  const key = `${startISO}#${day}#wx`;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** 그날 날씨: 'sunny' · 'cloudy' · 'rain' · 'snow'. */
export function weatherOf(startISO, day) {
  if (!startISO || day <= 2) return 'sunny';
  let u = roll(startISO, day);
  for (const [w, p] of Object.entries(WEATHER_P[seasonAt(startISO, day)])) {
    if (u < p) return w;
    u -= p;
  }
  return 'sunny';
}
