import test from 'node:test';
import assert from 'node:assert/strict';
import { hubUrl, roomCode, newVillageCode, isVillageCode, cleanMove, CODE_LEN, DEFAULT_SERVER } from '../src/net/multi.js';

test('바로 연결로 받은 움직임은 서버처럼 다듬는다: 숫자가 아니면 0, 몸짓 · 있는 곳은 16자까지', () => {
  assert.deepEqual(cleanMove({ x: 1.5, z: -2, yaw: 0.3, anim: 'walk', area: 'village' }), { x: 1.5, z: -2, yaw: 0.3, anim: 'walk', area: 'village' });
  assert.deepEqual(cleanMove({ x: 'a', z: NaN, yaw: Infinity, anim: '', area: 7 }), { x: 0, z: 0, yaw: 0, anim: 'idle', area: 'village' });
  assert.equal(cleanMove({ anim: 'x'.repeat(40) }).anim.length, 16);
  assert.equal(cleanMove(null), null);
  assert.equal(cleanMove('move'), null);
});

test('고정 서버 주소는 Tailscale Funnel 의 https 허브 주소가 된다', () => {
  assert.match(hubUrl(DEFAULT_SERVER), /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net\/town$/);
});

test('서버 주소를 허브 주소로: 도메인만 넣으면 https, localhost 는 http, 끝에 /town', () => {
  assert.equal(hubUrl('my-pc.tail1234.ts.net'), 'https://my-pc.tail1234.ts.net/town');
  assert.equal(hubUrl(' https://my-pc.tail1234.ts.net/ '), 'https://my-pc.tail1234.ts.net/town');
  assert.equal(hubUrl('localhost:5280'), 'http://localhost:5280/town');
  assert.equal(hubUrl('127.0.0.1:5280'), 'http://127.0.0.1:5280/town');
  assert.equal(hubUrl('wss://a.example/town'), 'https://a.example/town');
  assert.equal(hubUrl('https://a.example/other'), 'https://a.example/other', '경로를 적었으면 그대로');
  assert.equal(hubUrl(''), null);
  assert.equal(hubUrl('ftp://a.example'), null);
});

test('내 마을 코드: 대문자 6자, 헷갈리는 글자(I · L · O · 0 · 1) 없이, 서버 코드 규칙에도 맞는다', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 200; i++) {
    const code = newVillageCode(random);
    assert.equal(code.length, CODE_LEN);
    assert.match(code, /^[A-HJKMNP-Z2-9]{6}$/);
    assert.ok(isVillageCode(code));
    assert.equal(roomCode(code), code.toLowerCase(), '서버에는 소문자로 간다');
  }
  assert.equal(newVillageCode(() => 0), 'AAAAAA');
  assert.equal(newVillageCode(() => 0.999999), '999999');
});

test('저장된 마을 코드 확인: 모양이 다르면 새로 만든다', () => {
  assert.ok(isVillageCode('K7QX2M'));
  assert.equal(isVillageCode('k7qx2m'), false, '소문자는 아니다');
  assert.equal(isVillageCode('K7QX2'), false);
  assert.equal(isVillageCode('K7QX2MM'), false);
  assert.equal(isVillageCode('K7QX0M'), false, '0 은 쓰지 않는다');
  assert.equal(isVillageCode(undefined), false);
  assert.equal(isVillageCode(123456), false);
});

test('방 코드: 한글 · 영문 · 숫자 · - 로 1~16자, 영문은 소문자(서버와 같은 규칙)', () => {
  assert.equal(roomCode(' 치이카와 '), '치이카와');
  assert.equal(roomCode('Room-1'), 'room-1');
  assert.equal(roomCode(''), null);
  assert.equal(roomCode('a b'), null);
  assert.equal(roomCode('x'.repeat(17)), null);
});
