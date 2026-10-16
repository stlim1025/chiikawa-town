import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEAPONS, MONSTERS, BOSS_EAT_COOL, bossEatWait } from '../src/core/combat.js';
import { createState } from '../src/core/state.js';
import { GAME_START_DATE, dateLabel } from '../src/core/calendar.js';
import { FURNITURE, FURNITURE_CATS } from '../src/core/home.js';

test('보스전 먹기 쿨타임: 처음엔 바로, 먹은 뒤로는 BOSS_EAT_COOL 초를 기다린다', () => {
  assert.equal(bossEatWait(null, 100), 0);
  assert.equal(bossEatWait(100, 110), BOSS_EAT_COOL - 10);
  assert.equal(bossEatWait(100, 100 + BOSS_EAT_COOL), 0);
  assert.equal(bossEatWait(100, 500), 0);
});

test('새 게임은 늘 10월 1일에 시작한다', () => {
  const s = createState({ name: '나', look: {} });
  assert.equal(s.startDate, GAME_START_DATE);
  assert.match(dateLabel(s.startDate, 1), /^10월 1일 /);
  assert.match(dateLabel(s.startDate, 42), /^11월 11일 /); // 42일째가 11월 11일
});

test('무기: 1초 힘은 목검 < 돌 망치 < 반짝 검, 한 대 힘은 반짝 검이 가장 세다(친구 무기 목표)', () => {
  const dps = (id) => WEAPONS[id].dmg / WEAPONS[id].cool;
  assert.ok(dps('sword') < dps('hammer') && dps('hammer') < dps('star'));
  assert.ok(WEAPONS.hammer.dmg < WEAPONS.star.dmg);
  assert.ok(WEAPONS.sword.price < WEAPONS.hammer.price && WEAPONS.hammer.price < WEAPONS.star.price);
});

test('구역 보스와 왕버섯은 목검 혼자서는 오래 걸린다(친구와 같이 잡도록)', () => {
  for (const sp of ['bigmole', 'elder', 'bigcrab', 'kingcap']) {
    assert.ok(MONSTERS[sp].boss);
    assert.ok(MONSTERS[sp].hp / WEAPONS.sword.dmg >= 40, `${sp}: 목검으로 40번은 쳐야`);
  }
});

test('가구: 모두 가구점 분류가 있고, 파는 가구는 값이 있고, 집 안 모양이 있다', () => {
  const cats = new Set(FURNITURE_CATS.map((c) => c.id));
  const models = readFileSync(new URL('../src/world/interior.js', import.meta.url), 'utf8');
  for (const [id, f] of Object.entries(FURNITURE)) {
    assert.equal(f.id, id);
    assert.ok(cats.has(f.cat), `${id} 분류`);
    if (!f.gift) assert.ok(f.price > 0, `${id} 값`);
    assert.ok(models.includes(`case '${id}'`), `${id} 모양(world/interior.js furnitureModel)`);
  }
  for (const c of FURNITURE_CATS) assert.ok(Object.values(FURNITURE).some((f) => f.cat === c.id && !f.gift), `${c.name} 에 파는 가구가 있다`);
  assert.ok(Object.values(FURNITURE).some((f) => f.price >= 5000), '집을 넓힌 뒤에도 모을 만한 비싼 가구');
});
