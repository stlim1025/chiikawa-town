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

test('첫날 안내 · 궁금한 거 답변에는 꼬리표(보수 UP · 300원 같은 알약) 없이 말만 한다', () => {
  const all = [...Object.values(TUTORIAL_LINES).flat(), ...HELP_TOPICS.flatMap((t) => t.lines)];
  assert.deepEqual(chipTexts(all), []);
  for (const line of all) assert.equal(typeof line, 'string', JSON.stringify(line));
});

test('궁금한 거 답변도 하치와레 말투로 짧고 깔끔하다', () => {
  assert.equal(HELP_TOPICS.length, 16);
  for (const t of HELP_TOPICS) hachiwareSays(t.lines, t.q);
  assert.deepEqual(HELP_TOPICS.filter((t) => t.home).map((t) => t.q), ['우리 집이 어디였지?']);
});

