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

test('자격증 사진은 딴 그때 모습으로 남는다: 땄을 때의 모습을 자격증에 적어 둔다', async () => {
  const { grant } = await import('../src/core/licenses.js');
  const look = { body: '#ffd6e0', ears: 'bunny', accessory: 'ribbon' };
  const s = grant({ licenses: {} }, 'hunter', 5, look);
  assert.deepEqual(s.licenses.hunter, { day: 5, look });
  look.accessory = 'crown'; // 나중에 갈아입어도
  assert.equal(s.licenses.hunter.look.accessory, 'ribbon');
  assert.deepEqual(grant({}, 'liquor', 2).licenses.liquor, { day: 2 }); // 모습 없이 주면 예전처럼
  assert.deepEqual(promote({ grade: 3, xp: 1 }, 9, { body: '#fff' }), { grade: 2, xp: 0, day: 9, look: { body: '#fff' } });
});
