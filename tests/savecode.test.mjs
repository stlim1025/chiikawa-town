import assert from 'node:assert/strict';
import { test } from 'node:test';
const C = await import('../src/core/savecode.js');
const S = await import('../src/core/save.js');
const St = await import('../src/core/state.js');

const game = () => ({ ...St.createState({ name: '치이', look: {} }), money: 4321, clock: { day: 12, t: 0.4 } });

test('저장 코드: 압축해서 짧은 글로 · 풀면 같은 진행', async () => {
  const s = game();
  const code = await C.encodeSave(s);
  assert.ok(code.startsWith('CTW1.'), code.slice(0, 8));
  assert.ok(code.length < S.serialize(s).length, '원래 저장 글보다 짧다');
  assert.ok(/^CTW1\.[A-Za-z0-9_-]+$/.test(code), '복사 · 붙여 넣기에 안전한 글자만');
  const r = await C.decodeSave(code);
  assert.ok(r.ok);
  assert.deepEqual(r.state, s);
});

test('메신저가 긴 글을 줄바꿈 · 띄어 써도 읽는다', async () => {
  const s = game(), code = await C.encodeSave(s);
  const wrapped = '  ' + code.match(/.{1,60}/g).join('\n') + ' \n';
  const r = await C.decodeSave(wrapped);
  assert.ok(r.ok);
  assert.equal(r.state.money, 4321);
});

test('압축을 못 하는 브라우저용(CTW0) · 원래 저장 글(JSON)도 읽는다', async () => {
  const s = game();
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
  const code = await C.encodeSave(game());
  assert.equal((await C.decodeSave(code.slice(0, -20))).ok, false, '잘린 코드');
  assert.equal((await C.decodeSave(JSON.stringify({ v: 999, data: game() }))).reason, 'version');
  assert.equal((await C.decodeSave(JSON.stringify({ v: S.SAVE_VERSION, data: { profile: null } }))).reason, 'corrupt');
});
