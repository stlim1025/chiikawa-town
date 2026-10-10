import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../src/core/inventory.js';
import '../src/core/quests.js'; // 퀘스트 · 경품 음식이 ITEMS 에 등록된다
import '../src/core/raffle.js';
import { SHOPS } from '../src/core/shop.js';
import { EAT_STYLE, EAT_MODES, eatStyle } from '../src/core/eating.js';

const edible = [...Object.keys(ITEMS).filter((id) => ITEMS[id].eat > 0), ...Object.values(SHOPS).flatMap((s) => s.items.map((i) => i.id))];

test('먹을 수 있는 건 다 먹는 몸짓이 있다(가방 음식 · 가게 메뉴)', () => {
  assert.ok(edible.length >= 10, edible.join(','));
  for (const id of edible) {
    const st = eatStyle(id);
    assert.ok(st, `${id} 먹는 몸짓 없음`);
    assert.ok(EAT_MODES.includes(st.mode), `${id}: ${st.mode}`);
    assert.match(st.prop, /^f-[a-z]+$/, `${id} 손에 드는 것`);
    assert.ok(st.dur >= 1 && st.dur <= 4, `${id} ${st.dur}초`);
  }
});

test('라멘은 그릇 들고 후루룩, 맥주 · 하이볼은 꿀꺽, 주먹밥 · 열매는 냠냠', () => {
  assert.equal(eatStyle('ramen').mode, 'slurp');
  assert.equal(eatStyle('hotpot').mode, 'slurp');
  for (const id of ['beer', 'highball', 'bottlebeer']) assert.equal(eatStyle(id).mode, 'gulp', id);
  for (const id of ['onigiri', 'berry', 'cookies']) assert.equal(eatStyle(id).mode, 'nibble', id);
  assert.notEqual(eatStyle('beer').prop, eatStyle('highball').prop, '맥주잔과 하이볼 잔은 다르다');
});

test('모르는 것은 몸짓 없이(null), 표는 고칠 수 없다', () => {
  assert.equal(eatStyle('nope'), null);
  assert.equal(eatStyle(undefined), null);
  assert.ok(Object.isFrozen(EAT_STYLE) && Object.isFrozen(EAT_STYLE.ramen));
});
