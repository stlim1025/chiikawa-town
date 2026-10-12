import test from 'node:test';
import assert from 'node:assert/strict';
import { hubUrl, roomCode } from '../src/net/multi.js';

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

test('방 코드: 한글 · 영문 · 숫자 · - 로 1~16자, 영문은 소문자(서버와 같은 규칙)', () => {
  assert.equal(roomCode(' 치이카와 '), '치이카와');
  assert.equal(roomCode('Room-1'), 'room-1');
  assert.equal(roomCode(''), null);
  assert.equal(roomCode('a b'), null);
  assert.equal(roomCode('x'.repeat(17)), null);
});
