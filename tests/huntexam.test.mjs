import test from 'node:test';
import assert from 'node:assert/strict';
import { huntQuiz, MONSTERS, MONSTER_ORDER, DROPS } from '../src/core/combat.js';
import { LICENSES } from '../src/core/licenses.js';

const L = LICENSES.hunter;
const field = MONSTER_ORDER.filter((k) => !MONSTERS[k].boss);
const byName = (name) => field.find((k) => MONSTERS[k].name === name);
const pips = (k) => Math.min(5, Math.ceil(MONSTERS[k].hp / 3)); // 안내서의 단단함(방패 다섯 칸)
const right = (q) => q.choices[q.answer];
const wrong = (q) => q.choices.filter((_, i) => i !== q.answer);
const many = (n = 300) => Array.from({ length: n }, () => huntQuiz(L.questions)).flat();

test('필기: 8문제 중 6개, 문제당 15초(너무 어렵다는 말에 조금 낮췄다)', () => {
  assert.ok(L.questions >= 8, `문제 수 ${L.questions}`);
  assert.equal(L.pass, L.questions - 2, `합격 ${L.pass} / ${L.questions}`);
  assert.ok(L.seconds >= 15 && L.seconds <= 20, `문제당 ${L.seconds}초`);
  const qs = huntQuiz(L.questions);
  assert.equal(qs.length, L.questions);
  assert.equal(new Set(qs.map((q) => q.q)).size, qs.length, '같은 문제가 두 번 나오지 않는다');
});

test('필기: 안내서를 꼼꼼히 봐야 푸는 문제가 고루 나온다', () => {
  const types = new Set(many().map((q) => q.type));
  for (const t of ['region', 'drop', 'dropOf', 'atk', 'atkOf', 'dmg', 'price', 'tough', 'odd', 'rule']) assert.ok(types.has(t), `문제 종류: ${t}`);
});

test('필기: 정답은 안내서와 맞고, 보기 넷은 모두 다르다', () => {
  for (const q of many()) {
    assert.equal(q.choices.length, 4, q.q);
    assert.equal(new Set(q.choices).size, 4, q.q);
    const M = q.mon && MONSTERS[q.mon];
    if (q.type === 'dmg') assert.equal(right(q), `기운 −${M.dmg}`, q.q);
    if (q.type === 'price') assert.equal(right(q), `${DROPS[M.drop].price.toLocaleString('ko-KR')}원`, q.q);
    if (q.type === 'drop') assert.equal(right(q), DROPS[M.drop].name, q.q);
    if (q.type === 'dropOf' || q.type === 'atkOf') assert.equal(right(q), M.name, q.q);
    if (q.type === 'atk') assert.equal(right(q), M.atk, q.q);
    if (q.type === 'tough') {
      const top = pips(byName(right(q)));
      for (const w of wrong(q)) assert.ok(pips(byName(w)) < top, `${q.q}: ${w} 가 더 약해야 한다`);
    }
    if (q.type === 'odd') {
      const r = MONSTERS[byName(right(q))].region, others = wrong(q).map((w) => MONSTERS[byName(w)].region);
      assert.ok(others.every((o) => o === others[0]) && r !== others[0], q.q);
      assert.notEqual(r, 'night', `${q.q}: 밤 나방은 어디든 나오니 정답이 될 수 없다`);
    }
  }
});

test('필기: 오답은 헷갈리게(같은 구역 몬스터의 것부터), 티 나는 오답은 없다', () => {
  for (const q of many()) {
    if (q.type === 'drop' || q.type === 'atk' || q.type === 'dropOf' || q.type === 'atkOf') {
      const r = MONSTERS[q.mon].region, same = field.filter((k) => k !== q.mon && MONSTERS[k].region === r);
      if (same.length < 2) continue; // 밤 나방은 혼자다
      const asMon = (c) => field.find((k) => MONSTERS[k].name === c || DROPS[MONSTERS[k].drop].name === c || MONSTERS[k].atk === c);
      const near = wrong(q).filter((w) => MONSTERS[asMon(w)].region === r).length;
      assert.ok(near >= Math.min(2, same.length), `${q.q}: 같은 구역 오답 ${near}개`);
    }
    for (const c of q.choices) assert.ok(!/보물|잠든다|아무 일도|라멘 로우|헌책방|부동산|친밀도|제초 급수/.test(c), `티 나는 보기: ${c}`);
  }
});

test('필기: 따옴표로 묶은 전리품 이름 뒤 조사도 받침에 맞다', () => {
  const batchim = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
  for (const q of many().filter((x) => x.type === 'price' || x.type === 'dropOf')) {
    const [, w, p] = q.q.match(/^'(.+)'(.)/);
    const want = q.type === 'price' ? (batchim(w) ? '은' : '는') : (batchim(w) ? '을' : '를');
    assert.equal(p, want, q.q);
  }
});

test('필기: 숫자를 외워야 하는 문제(기운 · 판매가)는 덜 나온다', () => {
  const qs = many(), hard = qs.filter((q) => q.type === 'dmg' || q.type === 'price').length, easy = qs.filter((q) => q.type === 'region' || q.type === 'atk').length;
  assert.ok(hard < easy, `숫자 문제 ${hard} · 사는 곳 · 공격 문제 ${easy}`);
});

test('실기: 허수아비 뒤에 쫓아와 공격하는 몬스터 한 마리, 세 번 맞으면 불합격', () => {
  assert.ok(Array.isArray(L.foes) && L.foes.length === 1, '몬스터는 한 마리');
  for (const k of L.foes) {
    const M = MONSTERS[k];
    assert.ok(M && !M.boss && M.attack && M.dmg > 0 && M.speed > 0 && !M.night, `${k} 는 낮에 쫓아와 공격하는 몬스터`);
  }
  assert.ok(L.hits >= 2 && L.hits <= 3, `맞으면 불합격: ${L.hits}번`);
  assert.ok(L.practical >= 70 && L.practical <= 90, `제한 시간 ${L.practical}초(몬스터가 하나씩 나오니 넉넉히)`);
  assert.ok(MONSTERS[L.foes[0]].hp <= 3 && MONSTERS[L.foes[0]].region === 'fields', '가장 쉬운 들판 몬스터');
  assert.ok(L.dummies >= 1, '허수아비가 먼저');
});
