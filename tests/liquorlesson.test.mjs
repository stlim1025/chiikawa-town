import test from 'node:test';
import assert from 'node:assert/strict';
import { LIQUOR_LESSONS, LIQUOR_QUIZ, LIQUOR_MARKS } from '../src/core/licenses.js';
import { markSegments } from '../src/ui/guide.js';

const lines = LIQUOR_LESSONS.flat();
const marked = (line) => markSegments(line, LIQUOR_MARKS).filter((p) => p.mark).map((p) => p.text);

test('술 강의: 필기 문제마다 강의 속 빨간 말로 답을 찾을 수 있다', () => {
  for (const item of LIQUOR_QUIZ) {
    const hit = [item.right, item.hint].filter((w) => LIQUOR_MARKS.includes(w));
    assert.ok(hit.length, `${item.q}: 빨갛게 칠할 말이 강의에 없다`);
    assert.ok(lines.some((l) => marked(l).some((m) => hit.some((w) => m.includes(w)))), `${item.q}: 강의에서 빨갛게 보이지 않는다`);
  }
});

test('술 강의: 오답 보기는 빨갛게 칠하지 않는다(헷갈리지 않게)', () => {
  const rights = new Set(LIQUOR_QUIZ.flatMap((i) => [i.right, i.hint]));
  for (const w of LIQUOR_QUIZ.flatMap((i) => i.wrong)) if (!rights.has(w)) assert.ok(!LIQUOR_MARKS.includes(w), w);
});

test('빨간 말 나누기: 이어 붙이면 원래 글, 긴 말부터, 겹치지 않는다', () => {
  for (const l of lines) assert.equal(markSegments(l, LIQUOR_MARKS).map((p) => p.text).join(''), l);
  assert.deepEqual(markSegments('맥아만 써서 한 증류소에서 만든다', ['한 증류소', '맥아만 써서 한 증류소에서']),
    [{ text: '맥아만 써서 한 증류소에서', mark: true }, { text: ' 만든다', mark: false }]);
  assert.deepEqual(markSegments('그냥 글', []), [{ text: '그냥 글', mark: false }]);
  assert.deepEqual(markSegments('', ['x']), []);
});
