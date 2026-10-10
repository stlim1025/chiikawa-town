import assert from 'node:assert/strict';
import { test } from 'node:test';
const R = await import('../src/core/ramen.js');
test('quiz: 6 questions, 4 distinct choices, answer valid', () => {
  for (let seed = 0; seed < 300; seed++) {
    let x = seed * 7919 + 1; const rnd = () => { x = (x * 16807) % 2147483647; return (x % 100000) / 100000; };
    const qs = R.ramenQuiz(6, rnd);
    assert.equal(qs.length, 6, 'seed ' + seed);
    for (const q of qs) {
      assert.equal(q.choices.length, 4, q.q + ' :: ' + q.choices.join(' | '));
      assert.equal(new Set(q.choices).size, 4, 'dup ' + q.q + ' :: ' + q.choices.join(' | '));
      assert.ok(q.answer >= 0 && q.answer < 4);
    }
    assert.equal(new Set(qs.map((q) => q.q)).size, 6, 'repeat question seed ' + seed);
  }
});
test('quiz answers are actually correct', () => {
  const qs = R.ramenQuiz(6, Math.random);
  for (const q of qs) if (q.q.startsWith('로우 라멘에')) assert.equal(q.choices[q.answer], '2번');
});
test('boil question format consistent', () => {
  for (let i = 0; i < 200; i++) for (const q of R.ramenQuiz(6)) if (q.q.includes('몇 초 삶아야')) for (const c of q.choices) assert.match(c, /^\d\.\d초$/);
});
