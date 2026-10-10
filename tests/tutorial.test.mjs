import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_LINES } from '../src/core/tutorial.js';

const textOf = (line) => (typeof line === 'string' ? line : line.text);
const chipsOf = (step) => TUTORIAL_LINES[step].flatMap((l) => (typeof l === 'string' ? [] : (l.chips || []).map((c) => c.text)));

test('첫날 안내는 짧고 깔끔하다', () => {
  assert.deepEqual(Object.keys(TUTORIAL_LINES).sort(), ['board', 'boardAgain', 'hello', 'house', 'houseTour', 'pull', 'report', 'tips']);
  for (const [step, lines] of Object.entries(TUTORIAL_LINES)) {
    assert.ok(lines.length > 0, `빈 단계: ${step}`);
    for (const line of lines) {
      const text = textOf(line);
      assert.ok(typeof text === 'string' && text.length, `빈 대사: ${step}`);
      assert.ok(!/[^.…]\.(\s|$)/.test(text), `마침표: ${step}: ${text}`);
      assert.ok(text.length <= 30, `너무 길다(${text.length}): ${step}: ${text}`);
    }
  }
});

test('하치와레는 딱딱하게 끊어 말하지 않는다(줄 끝이 ~ ! ♪ ? … 중 하나)', () => {
  for (const [step, lines] of Object.entries(TUTORIAL_LINES)) {
    for (const line of lines) {
      const text = textOf(line);
      assert.ok(/[~!♪?…]$/.test(text), `딱딱한 말투: ${step}: ${text}`);
    }
  }
});

test('꼭 알아야 할 것은 꼬리표로 남긴다', () => {
  assert.ok(chipsOf('houseTour').includes('300원'));
  assert.ok(chipsOf('board').includes('PC 는 Space'));
  assert.ok(chipsOf('pull').includes('딩 소리'));
  assert.ok(chipsOf('tips').includes('동쪽 검정소'));
});
