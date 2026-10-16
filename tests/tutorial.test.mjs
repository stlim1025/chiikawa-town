import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_LINES, HELP_TOPICS, HELP_GROUPS, HELP_ASK, helpTop, helpIn, PHONE_TOUR, phoneTourLeft } from '../src/core/tutorial.js';

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
  assert.deepEqual(Object.keys(TUTORIAL_LINES).sort(), ['board', 'boardAgain', 'hello', 'house', 'houseTour', 'phone', 'phoneTour', 'pull', 'report', 'tips']);
  for (const [step, lines] of Object.entries(TUTORIAL_LINES)) hachiwareSays(lines, step);
});

test('첫날 안내 · 궁금한 거 답변에는 꼬리표(보수 UP · 300원 같은 알약) 없이 말만 한다', () => {
  const all = [...Object.values(TUTORIAL_LINES).flat(), ...HELP_TOPICS.flatMap((t) => t.lines)];
  assert.deepEqual(chipTexts(all), []);
  for (const line of all) assert.equal(typeof line, 'string', JSON.stringify(line));
});

test('궁금한 거 답변도 하치와레 말투로 짧고 깔끔하다', () => {
  assert.equal(HELP_TOPICS.length, 17);
  for (const t of HELP_TOPICS) hachiwareSays(t.lines, t.q);
  hachiwareSays([HELP_ASK], '묶음을 골랐을 때');
  assert.deepEqual(HELP_TOPICS.filter((t) => t.home).map((t) => t.q), ['우리 집이 어디였지?']);
  assert.deepEqual(HELP_TOPICS.filter((t) => t.phone).map((t) => t.q), ['마을폰은 어떻게 써?']);
});

test('궁금한 거 목록은 주제 묶음으로 접어서 한 화면에 들어간다(처음 목록 · 묶음 안 모두 되돌아가기까지 다섯 줄 남짓)', () => {
  const ids = HELP_GROUPS.map((g) => g.id);
  for (const t of HELP_TOPICS) assert.ok(t.group == null || ids.includes(t.group), `모르는 묶음: ${t.q}`);
  const top = helpTop();
  assert.deepEqual(top.map((o) => o.label), ['일이랑 돈', '승급이랑 자격', '친구들', '몬스터랑 토벌', '집', '마을폰은 어떻게 써?']);
  assert.ok(top.length + 1 <= 7, '처음 목록(이제 괜찮아까지)이 일곱 줄 이하');
  for (const g of ids) {
    const list = helpIn(g);
    assert.ok(list.length >= 2 && list.length + 1 <= 5, `${g}: ${list.length}개(되돌아가기까지 다섯 줄 이하)`);
  }
  // 모든 질문이 처음 목록이나 어느 한 묶음에서 딱 한 번 보인다
  const seen = [...top.filter((o) => o.topic).map((o) => o.topic.q), ...ids.flatMap((g) => helpIn(g).map((t) => t.q))];
  assert.deepEqual([...seen].sort(), HELP_TOPICS.map((t) => t.q).sort());
});

test('마을폰 안내: 하치와레 말투, 짚는 앱은 홈 화면에 늘 있는 앱, 맨 끝은 닫는 법', () => {
  hachiwareSays(PHONE_TOUR.map((t) => t.line), '마을폰 안내');
  const ALWAYS = ['options', 'licenses', 'weeds', 'quests', 'friends', 'multi', 'monsters', 'home']; // ui/panels.js 홈 화면(지도 · 낚시 도감은 살 때만)
  for (const t of PHONE_TOUR) for (const a of t.apps) assert.ok(ALWAYS.includes(a), `${a}: ${t.line}`);
  assert.deepEqual(PHONE_TOUR.at(-1).apps, ['home']);
  // 다 못 보고 닫으면 남은 앱 이야기만(닫는 법 줄 빼고), 다 봤으면 없음
  assert.deepEqual(phoneTourLeft(PHONE_TOUR.length - 1), []);
  assert.deepEqual(phoneTourLeft(PHONE_TOUR.length - 2), []);
  assert.deepEqual(phoneTourLeft(0), PHONE_TOUR.slice(1, -1).map((t) => t.line));
  assert.deepEqual(phoneTourLeft(null), PHONE_TOUR.slice(1, -1).map((t) => t.line));
  assert.deepEqual(phoneTourLeft(2), PHONE_TOUR.slice(3, -1).map((t) => t.line));
});

