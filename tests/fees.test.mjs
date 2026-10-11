import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAM_FEE, payExamFee } from '../src/core/license.js';
import { LICENSES } from '../src/core/licenses.js';
import { createState } from '../src/core/state.js';
import { createClock, hourOf, sleepFor, SLEEP_HOURS } from '../src/core/clock.js';
import { asleepSpans } from '../src/core/offscreen.js';

const fresh = (o = {}) => ({ ...createState({ name: '나', look: {} }), ...o });

test('제초 승급 시험도 공짜가 아니다: 급수가 오를수록 비싸고, 돈이 모자라면 못 본다', () => {
  for (const g of [6, 5, 4, 3, 2]) assert.ok(EXAM_FEE[g] > 0, `${g}급 시험 값`);
  assert.ok(EXAM_FEE[6] < EXAM_FEE[5] && EXAM_FEE[5] < EXAM_FEE[4] && EXAM_FEE[4] < EXAM_FEE[3] && EXAM_FEE[3] < EXAM_FEE[2], '견습 → 5급이 가장 싸다');
  const g5 = { license: { grade: 5, xp: 0 } };
  const s = fresh({ ...g5, money: EXAM_FEE[5] + 50 });
  const r = payExamFee(s);
  assert.ok(r.ok);
  assert.equal(r.state.money, 50);
  assert.ok(!payExamFee(fresh({ ...g5, money: EXAM_FEE[5] - 1 })).ok);
  assert.equal(payExamFee(fresh({ money: EXAM_FEE[6] })).state.money, 0, '새 게임(견습)은 5급 시험 값');
});

test('술 자격 · 슈퍼 알바이터 시험은 예전보다 비싸다', () => {
  assert.ok(LICENSES.liquor.fee >= 500, `술 자격 ${LICENSES.liquor.fee}`);
  assert.ok(LICENSES.arbeiter.fee >= 700, `알바이터 ${LICENSES.arbeiter.fee}`);
});

test('자고 나면 다음 날 아침이 아니라 정해진 시간만 흐른다', () => {
  assert.ok(SLEEP_HOURS >= 6 && SLEEP_HOURS <= 10);
  const noon = createClock(3, 10), night = createClock(3, 23), dawn = createClock(3, 2);
  const a = sleepFor(noon), b = sleepFor(night), c = sleepFor(dawn);
  assert.equal(a.day, 3); assert.equal(Math.round(hourOf(a)), (10 + SLEEP_HOURS) % 24);
  assert.equal(b.day, 4); assert.equal(Math.round(hourOf(b)), (23 + SLEEP_HOURS) % 24);
  assert.equal(c.day, 4, '새벽 2시는 아직 그날(하루는 6시에 바뀐다)'); assert.equal(Math.round(hourOf(c)), 2 + SLEEP_HOURS);
});

test('자는 동안 친구들이 보내는 시간: 저녁(밤 9시까지) · 밤을 넘겼는지 · 다음 날 아침(일어나서부터)', () => {
  // 낮잠: 10시 → 18시, 밤은 안 넘긴다
  let s = asleepSpans(createClock(3, 10), createClock(3, 18));
  assert.deepEqual(s.evening, { day: 3, from: 10, to: 18 });
  assert.equal(s.night, false); assert.equal(s.morning, null);
  // 저녁에 잠들어 밤을 넘김: 15시 → 23시
  s = asleepSpans(createClock(3, 15), createClock(3, 23));
  assert.deepEqual(s.evening, { day: 3, from: 15, to: 21 });
  assert.equal(s.night, true); assert.equal(s.morning, null);
  // 밤에 잠들어 아침에 깸: 23시 → 7시
  s = asleepSpans(createClock(3, 23), createClock(4, 7));
  assert.equal(s.evening, null); assert.equal(s.night, true);
  assert.deepEqual(s.morning, { day: 4, from: 6.5, to: 7 });
  // 새벽에 잠들어 오전에 깸: 2시 → 10시(다음 day)
  s = asleepSpans(createClock(3, 2), createClock(4, 10));
  assert.equal(s.evening, null); assert.equal(s.night, true);
  assert.deepEqual(s.morning, { day: 4, from: 6.5, to: 10 });
});

test('자고 일어나면 기운이 60 찬다(60 으로 맞추는 게 아니라 더한다, 100 까지)', async () => {
  const { sleepStamina, SLEEP_GAIN, MAX_STAMINA } = await import('../src/core/state.js');
  assert.equal(SLEEP_GAIN, 60);
  assert.equal(sleepStamina(fresh({ stamina: 10 }), 'home').stamina, 70);
  assert.equal(sleepStamina(fresh({ stamina: 10 }), 'lodge').stamina, 70);
  assert.equal(sleepStamina(fresh({ stamina: 50 }), 'home').stamina, MAX_STAMINA, '넘치는 만큼은 버린다');
  assert.equal(sleepStamina(fresh({ stamina: 85 }), 'home').stamina, MAX_STAMINA);
  assert.equal(sleepStamina(fresh({ stamina: 10 }), 'rough').stamina, 40, '노숙은 30 만');
  assert.equal(sleepStamina(fresh({ stamina: 50 }), 'rough').stamina, 80);
  assert.equal(sleepStamina(fresh({ stamina: 90 }), 'rough').stamina, MAX_STAMINA);
});
