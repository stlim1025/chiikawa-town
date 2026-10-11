import assert from 'node:assert/strict';
import { test } from 'node:test';
import zlib from 'node:zlib';
const C = await import('../src/core/savecode.js');
const S = await import('../src/core/save.js');
const St = await import('../src/core/state.js');

const game = () => ({ ...St.createState({ name: '치이', look: {} }), money: 4321, clock: { day: 12, t: 0.4 } });
/** 예전(CTW1) 코드: gzip + URL 에 안전한 base64. */
const oldCode = (s) => 'CTW1.' + zlib.gzipSync(Buffer.from(S.serialize(s))).toString('base64url');

test('저장 코드: 압축해서 한글 음절로 짧게 · 풀면 같은 진행', async () => {
  const s = game();
  const code = await C.encodeSave(s);
  assert.ok(code.startsWith('CTW2.'), code.slice(0, 8));
  assert.ok(/^CTW2\.[가-힣]+$/.test(code), '복사 · 붙여 넣기에 안전한 한글 음절만');
  assert.ok(code.length * 2 < oldCode(s).length, `예전 코드의 절반보다 짧다(${code.length} / ${oldCode(s).length})`);
  const r = await C.decodeSave(code);
  assert.ok(r.ok);
  assert.deepEqual(r.state, s);
});

test('긴 소수는 넷째 자리에서 반올림해 넣는다', async () => {
  const s = { ...game(), clock: { day: 3, t: 0.4372918273 }, player: { x: 12.3456789, z: -33.987654321 } };
  const r = await C.decodeSave(await C.encodeSave(s));
  assert.deepEqual(r.state.clock, { day: 3, t: 0.4373 });
  assert.deepEqual(r.state.player, { x: 12.3457, z: -33.9877 });
  assert.equal(r.state.money, 4321);
});

test('메신저가 긴 글을 줄바꿈 · 띄어 써도 읽는다', async () => {
  const s = game(), code = await C.encodeSave(s);
  const wrapped = '  ' + code.match(/.{1,60}/g).join('\n') + ' \n';
  const r = await C.decodeSave(wrapped);
  assert.ok(r.ok);
  assert.equal(r.state.money, 4321);
  const spaced = code.slice(0, 5) + code.slice(5).match(/.{1,7}/g).join(' ');
  assert.equal((await C.decodeSave(spaced)).state?.money, 4321, '띄어 쓴 한글');
  assert.equal((await C.decodeSave(code.normalize('NFD'))).state?.money, 4321, '자모로 풀어 보낸 한글');
});

test('예전 코드(CTW1 · CTW0) · 원래 저장 글(JSON)도 읽는다', async () => {
  const s = game();
  assert.deepEqual((await C.decodeSave(oldCode(s))).state, s);
  const plain = await C.encodeSave(s, { compress: false });
  assert.ok(plain.startsWith('CTW0.'));
  assert.deepEqual((await C.decodeSave(plain)).state, s);
  assert.deepEqual((await C.decodeSave(S.serialize(s))).state, s);
});

test('잘못된 코드는 이유와 함께 거절한다', async () => {
  assert.equal((await C.decodeSave('')).reason, 'empty');
  assert.equal((await C.decodeSave('   ')).reason, 'empty');
  assert.equal((await C.decodeSave('안녕하세요')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW1.abcd')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW2.안녕하세요')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW2.')).reason, 'corrupt');
  const code = await C.encodeSave(game());
  for (const cut of [1, 2, 3, 8, 20]) assert.equal((await C.decodeSave(code.slice(0, -cut))).ok, false, `${cut}글자 잘린 코드`);
  assert.equal((await C.decodeSave(code.slice(0, 9) + '힣' + code.slice(10))).ok, false, '글자가 바뀐 코드');
  assert.equal((await C.decodeSave(JSON.stringify({ v: 999, data: game() }))).reason, 'version');
  assert.equal((await C.decodeSave(JSON.stringify({ v: S.SAVE_VERSION, data: { profile: null } }))).reason, 'corrupt');
});
