import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_LINES, HELP_TOPICS } from '../src/core/tutorial.js';

const textOf = (line) => (typeof line === 'string' ? line : line.text);
const chipTexts = (lines) => lines.flatMap((l) => (typeof l === 'string' ? [] : (l.chips || []).map((c) => c.text)));
const chipsOf = (step) => chipTexts(TUTORIAL_LINES[step]);
/** 하치와레의 말: 짧고(30자), 마침표 없이, 딱딱하게 끊지 않는다(줄 끝이 ~ ! ♪ ? … 중 하나). */
const hachiwareSays = (lines, where) => {
  assert.ok(lines.length > 0, `빈 대사 묶음: ${where}`);
  for (const line of lines) {
    const text = textOf(line);
    assert.ok(typeof text === 'string' && text.length, `빈 대사: ${where}`);
    assert.ok(!/[^.…]\.(\s|$)/.test(text), `마침표: ${where}: ${text}`);
    assert.ok(text.length <= 30, `너무 길다(${text.length}): ${where}: ${text}`);
    assert.ok(/[~!♪?…]$/.test(text), `딱딱한 말투: ${where}: ${text}`);
  }
};

test('첫날 안내는 하치와레 말투로 짧고 깔끔하다', () => {
  assert.deepEqual(Object.keys(TUTORIAL_LINES).sort(), ['board', 'boardAgain', 'hello', 'house', 'houseTour', 'pull', 'report', 'tips']);
  for (const [step, lines] of Object.entries(TUTORIAL_LINES)) hachiwareSays(lines, step);
});

test('첫날 안내: 꼭 알아야 할 것은 꼬리표로 남긴다', () => {
  assert.ok(chipsOf('houseTour').includes('300원'));
  assert.ok(chipsOf('board').includes('PC 는 Space'));
  assert.ok(chipsOf('pull').includes('딩 소리'));
  assert.ok(chipsOf('tips').includes('동쪽 검정소'));
});

test('궁금한 거 답변도 하치와레 말투로 짧고 깔끔하다', () => {
  assert.equal(HELP_TOPICS.length, 16);
  for (const t of HELP_TOPICS) hachiwareSays(t.lines, t.q);
  assert.deepEqual(HELP_TOPICS.filter((t) => t.home).map((t) => t.q), ['우리 집이 어디였지?']);
});

test('궁금한 거 답변: 값 · 장소 같은 꼬리표는 그대로 남긴다', () => {
  const chips = new Set(HELP_TOPICS.flatMap((t) => chipTexts(t.lines)));
  for (const c of ['! 부탁', '? 다 했어', '퀘스트 앱', '도구점', '검정소 랭킹', '끝까지 들으면 하트', '지도에도 얼굴', '하트 3개', '둘 다 자격증', '둘까지',
    '풀 뽑기', '스티커', '열매', '딩 소리', '라멘 로우', '내 집', '동쪽 검정소', '보수 UP', '300원', '50,000원', '신청 500원', '당첨 15,000원',
    '부동산에서 다시 세 들기', '하트 5개', '포셰트 가게', '민트색 가게', '가위바위보', '술래잡기', '춤', '술', '슈퍼 알바이터', '토벌', '맥주집', '라멘 로우 알바']) {
    assert.ok(chips.has(c), `꼬리표 빠짐: ${c}`);
  }
});
