/**
 * '파자마 파티즈의 노래'(이 게임만의 원곡): 사이드스토리 '파자마 파티즈'의 무대 노래 · 리듬 놀이 악보 · 노랫말.
 * 원작 애니의 노래를 옮긴 게 아니라, 흔한 화음 진행(C · Am · F · G / F · G · Em · Am) 위에 새로 지은 귀에 남는 아이돌 곡이다.
 * 노랫말은 원작 무대 분위기처럼 뜻 없는 짧은 소리 내기(우 · 우와와 · 우와~)로 부른다(원곡 가사는 옮기지 않는다).
 * 한 마디 = 8분음표 8칸. mel: 칸마다 멜로디 음(MIDI, 0 은 쉼표), chord: 화음 이름(CHORDS), sec: 'verse'(노래) | 'chorus'(후렴),
 * hit: 리듬 놀이에서 치는 칸(늘 멜로디가 나오는 자리 — 노래에 맞춰 응원봉을 흔드는 느낌). 박자 소리는 audio/sound.js 의 idolStep 이 곡 자리에 맞춰 낸다.
 */
export const IDOL_BPM = 124;

/** 화음: 베이스 음과 위 세 음(MIDI). */
export const CHORDS = {
  C: { bass: 48, tones: [60, 64, 67] },
  Am: { bass: 45, tones: [57, 60, 64] },
  F: { bass: 41, tones: [57, 60, 65] },
  G: { bass: 43, tones: [55, 59, 62] },
  Em: { bass: 40, tones: [55, 59, 64] }
};

const ON = [0, 2, 4, 6]; // 정박마다(멜로디가 있는 칸만 남는다)
const bar = (sec, chord, mel, hit = ON) => ({ sec, chord, mel, hit: hit.filter((j) => mel[j] > 0) });
// 노래(1절 앞): 처음엔 두 박에 하나 → 차츰 박마다, 마지막 마디는 '솔 솔 라' 로 후렴을 부른다
const VERSE = [
  bar('verse', 'C', [67, 0, 72, 0, 72, 74, 76, 0], [0, 4]),
  bar('verse', 'Am', [76, 0, 74, 72, 69, 0, 72, 0], [0, 4]),
  bar('verse', 'F', [69, 0, 72, 0, 77, 76, 74, 0], [0, 4]),
  bar('verse', 'G', [74, 0, 72, 71, 67, 0, 0, 0], [0, 4]),
  bar('verse', 'C', [67, 0, 72, 0, 72, 74, 76, 79]),
  bar('verse', 'Am', [81, 0, 79, 76, 72, 0, 76, 0]),
  bar('verse', 'F', [77, 76, 74, 72, 74, 0, 71, 0]),
  bar('verse', 'G', [74, 0, 0, 0, 79, 79, 81, 0])
];
// 후렴: 높이 뛰어오르는 '파 · 자 · 마 · 파 · 티!'. synco 면 엇박(반 박)을 섞는다(다 같이 춤출 때 · 음끼리는 늘 한 박 이상 띄운다)
const chorus = (last, synco) => [
  bar('chorus', 'F', [84, 0, 81, 0, 79, 77, 79, 0], synco ? [0, 2, 5] : ON),
  bar('chorus', 'G', [79, 81, 83, 0, 84, 0, 79, 0]),
  bar('chorus', 'Em', [79, 0, 76, 0, 79, 76, 74, 76], synco ? [0, 2, 5] : ON),
  bar('chorus', 'Am', [72, 0, 76, 0, 81, 0, 79, 0]),
  bar('chorus', 'F', [84, 0, 81, 0, 79, 77, 79, 81], synco ? [0, 2, 5] : ON),
  bar('chorus', 'G', [83, 0, 84, 86, 84, 0, 79, 0], synco ? [0, 3, 6] : ON),
  bar('chorus', 'C', [76, 77, 79, 0, 84, 0, 83, 0], synco ? [1, 4, 6] : ON),
  last
];
const END = bar('chorus', 'C', [84, 0, 0, 0, 0, 0, 0, 0], [0]);
const AGAIN = bar('chorus', 'G', [74, 0, 0, 0, 79, 79, 81, 0], [0, 4, 6]); // 한 번 더! (후렴으로 다시 부른다)

/** 무대 두 번: 1 = 노래 + 후렴(손님이 없을 때 응원), 2 = 후렴 두 번(다 같이 춤). 노랫말은 두 마디에 한 줄. */
export const IDOL_ROUNDS = {
  1: {
    bars: [...VERSE, ...chorus(END, false)],
    lyrics: ['우~ 우와와 우와~♪', '우~ 우와와 우와~♪', '우와 우와 우와와~♪', '우와~ 우와와~♪',
      '우! 우와와! 우와~!♪', '와와 우와와 우와~♪', '우와와 우와와 우와~♪', '우와~~!♪']
  },
  2: {
    bars: [...chorus(AGAIN, true), ...chorus(END, true)],
    lyrics: ['우! 우와와! 우와~!♪', '와와 우와와 우와~♪', '우와와 우와와 우와~♪', '한 번 더~! 우와와!♪',
      '우! 우와와! 우와~!♪', '와와 우와와 우와~♪', '우와와 우와와 우와~♪', '우와~~!♪']
  }
};

/** 처음 준비 박(카운트) 수 — ui/rhythm.js 와 같다. */
const COUNT_BEATS = 4;

/** 리듬 놀이 악보(박 번호): 마디마다 정한 칸(hit). 처음 4박은 준비. */
export function idolChart(round) {
  const out = [];
  IDOL_ROUNDS[round].bars.forEach((b, i) => b.hit.forEach((j) => out.push(COUNT_BEATS + (i * 8 + j) / 2)));
  return out;
}

/**
 * 8분음표 번호 e(곡 시작부터, 준비 박 포함) → { count: 준비 중인지, bar, j(마디 안 칸), data(그 마디), line(지금 노랫말) } | null(곡이 끝났다).
 */
export function songAt(round, e) {
  if (e < COUNT_BEATS * 2) return { count: true, bar: -1, j: e, data: null, line: null };
  const R = IDOL_ROUNDS[round], k = e - COUNT_BEATS * 2, i = Math.floor(k / 8);
  if (i >= R.bars.length) return null;
  return { count: false, bar: i, j: k % 8, data: R.bars[i], line: R.lyrics[Math.floor(i / 2)] };
}
