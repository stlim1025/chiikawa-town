import test from 'node:test';
import assert from 'node:assert/strict';
import { licenseNumber } from '../src/core/licenses.js';
import { promote } from '../src/core/license.js';

test('자격증 번호는 같은 사람 · 같은 자격 · 같은 날이면 늘 같고, 모양이 일정하다', () => {
  const a = licenseNumber('하치', 'hunter', 12);
  assert.equal(a, licenseNumber('하치', 'hunter', 12));
  assert.match(a, /^H-012-\d{4}$/);
  assert.match(licenseNumber('하치', 'weed', 1), /^W-001-\d{4}$/);
  assert.match(licenseNumber('하치', 'liquor', 3), /^L-003-\d{4}$/);
  assert.match(licenseNumber('하치', 'arbeiter', 250), /^A-250-\d{4}$/);
});

test('자격증 번호는 이름이나 자격이 다르면 달라진다', () => {
  const nums = new Set(['하치', '우사기', '치이카와', '모몽가'].flatMap((n) => ['weed', 'liquor', 'arbeiter', 'hunter'].map((id) => licenseNumber(n, id, 7).slice(-4))));
  assert.ok(nums.size >= 14, `뒷자리가 거의 다 달라야 한다: ${nums.size}`);
});

test('제초 승급에 딴 날을 적어 두면 자격증에 발급일로 나온다', () => {
  assert.deepEqual(promote({ grade: 4, xp: 9 }, 6), { grade: 3, xp: 0, day: 6 });
  assert.deepEqual(promote({ grade: 4, xp: 9 }), { grade: 3, xp: 0 });
});
