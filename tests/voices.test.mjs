import assert from 'node:assert/strict';
import { test } from 'node:test';
const { pickVoice, speak } = await import('../src/audio/voices.js');

test('우사기: 대사에서 야하! · 우라! · 하아? · 푸루루루 만 골라 높게 외친다(지문 괄호는 빼고 본다)', () => {
  assert.equal(pickVoice('usagi', '야하~!').say, '야하!');
  assert.equal(pickVoice('usagi', '(반쪽을 내밀며 같이 먹자고 한다) 야하!!').say, '야하!');
  assert.equal(pickVoice('usagi', '우라!').say, '우라!');
  assert.equal(pickVoice('usagi', '하아?!').say, '하아?');
  assert.equal(pickVoice('usagi', '후루루루~!').say, '푸루루루~');
  assert.equal(pickVoice('usagi', '(우사기가 솜사탕을 뜯어 내밀었다)').say, '우라!', '말이 없어도 우사기 소리');
  assert.equal(pickVoice('usagi', '야하!').pitch, 2, '가장 높게');
});

test('치이카와: 말 대신 헤에 · 히힛 · 흐에에 · 힛! · 에… 작은 소리만', () => {
  assert.equal(pickVoice('chiikawa', '…헤헤…').say, '히힛');
  assert.equal(pickVoice('chiikawa', '…흐에… (훌쩍)').say, '흐에에…');
  assert.equal(pickVoice('chiikawa', '…!!').say, '힛!');
  assert.equal(pickVoice('chiikawa', '…맛있어…!').say, '에…', '긴 말도 작은 소리로');
  assert.ok(pickVoice('chiikawa', '…헤에').volume < pickVoice('usagi', '야하!').volume, '작은 목소리');
});

test('하치와레 · 모몽가: 대사를 그대로 말한다(지문 · 말줄임 · 물결은 빼고) · 모몽가 흥!', () => {
  assert.equal(pickVoice('hachiware', '고마워~! (섬 소다를 받았다) 꿀꺽꿀꺽… 캬~').say, '고마워! 꿀꺽꿀꺽 캬');
  assert.ok(pickVoice('hachiware', '가'.repeat(200)).say.length <= 60, '긴 대사는 앞부분만');
  assert.equal(pickVoice('hachiware', '……'), null, '글자가 없으면 원래 말소리');
  assert.equal(pickVoice('momonga', '흥! 저리 가!').say, '흥!');
  assert.equal(pickVoice('momonga', '뭐야!! 사기잖아!!').say, '뭐야!! 사기잖아!!');
  assert.ok(pickVoice('momonga', '뭐야').pitch > pickVoice('hachiware', '뭐야').pitch, '모몽가가 더 높다');
});

test('다른 친구는 원래 톡톡 말소리 · 말하기 음성이 없는 곳(노드)에서는 false', () => {
  for (const k of ['rakko', 'kurimanju', 'shisa', 'labor', null]) assert.equal(pickVoice(k, '하아~ 맥주 맛있다'), null);
  assert.equal(speak('usagi', '야하!'), false);
});
