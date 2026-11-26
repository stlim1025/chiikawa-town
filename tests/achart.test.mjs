import test from 'node:test';
import assert from 'node:assert/strict';
import { ACH_GROUPS, ACHIEVEMENTS } from '../src/core/achieve.js';
import { achTier, medalSvg, groupIconSvg, TROPHY_SVG } from '../src/ui/achart.js';

const by = (id) => ACHIEVEMENTS.find((a) => a.id === id);

test('업적 메달 등급: 칭호를 주면 금, 1,500원 이상이면 은, 나머지는 동', () => {
  assert.equal(achTier(by('dexAll')), 'gold');
  assert.equal(achTier(by('dexFishAll')), 'gold'); // 돈 없이 칭호만
  assert.equal(achTier(by('dexWeedAll')), 'silver'); // 1,500원
  assert.equal(achTier(by('hunt500')), 'silver'); // 2,500원
  assert.equal(achTier(by('hunt10')), 'bronze'); // 200원
  const n = (t) => ACHIEVEMENTS.filter((a) => achTier(a) === t).length;
  assert.equal(n('gold'), 15);
  assert.equal(n('gold') + n('silver') + n('bronze'), ACHIEVEMENTS.length);
  assert.ok(n('silver') > 0 && n('bronze') > 0);
});

test('업적 메달 그림: 묶음마다 아이콘이 있고, 잠긴 메달은 회색에 자물쇠, 등급마다 색이 다르다', () => {
  for (const g of ACH_GROUPS) {
    assert.match(groupIconSvg(g.id), /^<svg[\s\S]*<path[\s\S]*<\/svg>$/, g.id);
    const lit = medalSvg(g.id, 'gold', true), dim = medalSvg(g.id, 'gold', false);
    assert.ok(!lit.includes('ach-lock'), `${g.id}: 이룬 메달에는 자물쇠가 없다`);
    assert.ok(dim.includes('ach-lock'), `${g.id}: 잠긴 메달에는 자물쇠`);
  }
  assert.notEqual(groupIconSvg('dex'), groupIconSvg('hunt'));
  assert.notEqual(medalSvg('dex', 'gold', true), medalSvg('dex', 'silver', true));
  assert.notEqual(medalSvg('dex', 'silver', true), medalSvg('dex', 'bronze', true));
  assert.equal(medalSvg('dex', 'gold', false), medalSvg('dex', 'bronze', false), '잠긴 메달은 등급과 상관없이 같은 회색');
  assert.match(TROPHY_SVG, /^<svg[\s\S]*<\/svg>$/);
});
