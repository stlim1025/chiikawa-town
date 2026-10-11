import assert from 'node:assert/strict';
import { test } from 'node:test';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
const C = await import('../src/core/savecode.js');
const S = await import('../src/core/save.js');
const St = await import('../src/core/state.js');
const { SAVE_DICT_1 } = await import('../src/core/savedict.js');

const game = () => ({ ...St.createState({ name: '치이', look: {} }), money: 4321, clock: { day: 12, t: 0.4 } });
/** 퀘스트 · 친구가 잔뜩 있는 후반 진행. */
const late = () => ({ ...game(), clock: { day: 40, t: 0.5 }, friends: { chiikawa: { pts: 37, talk: 39, play: 38, gift: true }, usagi: { pts: 21, talk: 40, play: 12, gift: false } },
  quests: { story: { step: 8, base: 0, done: 31 }, pillow: { step: 1, base: 0, done: 14 }, picnic: { step: 1, base: 0, done: 20 } }, hunted: { fluff: 12, hopper: 3 }, weedLog: { weed: 120, clover: 40 } });
/** 예전 코드: CTW2(사전 없는 deflate → 한글) · CTW1(gzip + URL 에 안전한 base64) · CTW0(압축 없는 base64). */
const hangul = (bytes) => {
  const pad = Math.ceil((bytes.length * 8) / 13) * 13 - bytes.length * 8;
  let out = String.fromCharCode(0xac00 + pad), acc = 0, bits = 0;
  for (const b of bytes) { acc = (acc << 8) | b; bits += 8; if (bits >= 13) { bits -= 13; out += String.fromCharCode(0xac00 + ((acc >> bits) & 8191)); acc &= (1 << bits) - 1; } }
  return bits ? out + String.fromCharCode(0xac00 + ((acc << (13 - bits)) & 8191)) : out;
};
const ctw2 = (s) => 'CTW2.' + hangul(zlib.deflateRawSync(Buffer.from(S.serialize(s))));
const ctw1 = (s) => 'CTW1.' + zlib.gzipSync(Buffer.from(S.serialize(s))).toString('base64url');
const ctw0 = (s) => 'CTW0.' + Buffer.from(S.serialize(s)).toString('base64url');

test('저장 코드: 사전을 넣어 압축해 한글 음절로 아주 짧게 · 풀면 같은 진행', async () => {
  for (const s of [game(), late()]) {
    const code = await C.encodeSave(s);
    assert.ok(/^CTW3\.[가-힣]+$/.test(code), '복사 · 붙여 넣기에 안전한 한글 음절만');
    assert.ok(code.length * 2 < ctw2(s).length, `사전 없는 한글 코드의 절반보다 짧다(${code.length} / ${ctw2(s).length})`);
    const r = await C.decodeSave(code);
    assert.ok(r.ok);
    assert.deepEqual(r.state, s);
  }
});

test('사전은 고치면 안 된다(이미 내보낸 코드를 못 풀게 된다)', () => {
  assert.equal(createHash('sha256').update(SAVE_DICT_1).digest('hex').slice(0, 16), '4f40d064537500c9');
});

test('긴 소수는 넷째 자리에서 반올림해 넣는다', async () => {
  const s = { ...game(), clock: { day: 3, t: 0.4372918273 }, player: { x: 12.3456789, z: -33.987654321 } };
  const r = await C.decodeSave(await C.encodeSave(s));
  assert.deepEqual(r.state.clock, { day: 3, t: 0.4373 });
  assert.deepEqual(r.state.player, { x: 12.3457, z: -33.9877 });
  assert.equal(r.state.money, 4321);
});

test('메신저가 긴 글을 줄바꿈 · 띄어 써도 읽는다', async () => {
  const code = await C.encodeSave(late());
  const wrapped = '  ' + code.match(/.{1,30}/g).join('\n') + ' \n';
  assert.equal((await C.decodeSave(wrapped)).state?.money, 4321);
  const spaced = code.slice(0, 5) + code.slice(5).match(/.{1,7}/g).join(' ');
  assert.equal((await C.decodeSave(spaced)).state?.money, 4321, '띄어 쓴 한글');
  assert.equal((await C.decodeSave(code.normalize('NFD'))).state?.money, 4321, '자모로 풀어 보낸 한글');
});

test('예전 코드(CTW2 · CTW1 · CTW0) · 원래 저장 글(JSON)도 읽는다', async () => {
  const s = late();
  for (const old of [ctw2(s), ctw1(s), ctw0(s), S.serialize(s)]) assert.deepEqual((await C.decodeSave(old)).state, s, old.slice(0, 5));
  const wrapped = ctw1(s).match(/.{1,60}/g).join('\n');
  assert.deepEqual((await C.decodeSave(wrapped)).state, s, '줄바꿈 넣은 CTW1');
});

test('잘못된 코드는 이유와 함께 거절한다', async () => {
  assert.equal((await C.decodeSave('')).reason, 'empty');
  assert.equal((await C.decodeSave('   ')).reason, 'empty');
  assert.equal((await C.decodeSave('안녕하세요')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW1.abcd')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW3.안녕하세요')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW3.')).reason, 'corrupt');
  assert.equal((await C.decodeSave('CTW9.가나다')).reason, 'corrupt');
  const code = await C.encodeSave(late());
  for (const cut of [1, 2, 3, 8, 20]) assert.equal((await C.decodeSave(code.slice(0, -cut))).ok, false, `${cut}글자 잘린 코드`);
  assert.equal((await C.decodeSave(code.slice(0, 9) + '힣' + code.slice(10))).ok, false, '글자가 바뀐 코드');
  assert.equal((await C.decodeSave(JSON.stringify({ v: 999, data: game() }))).reason, 'version');
  assert.equal((await C.decodeSave(JSON.stringify({ v: S.SAVE_VERSION, data: { profile: null } }))).reason, 'corrupt');
});
