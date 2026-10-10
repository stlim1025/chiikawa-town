import assert from 'node:assert/strict';
import { test } from 'node:test';
const { pickVoice } = await import('../src/audio/voices.js');

const shape = (syl) => syl.map((s) => s.c || '') + '|' + syl.map((s) => s.v).join('');

test('우사기: 야하! · 우라! · 하아? · 푸루루 를 대사에서 골라 외친다(지문 괄호는 빼고 본다)', () => {
  assert.equal(shape(pickVoice('usagi', '야하~!')), shape(pickVoice('usagi', '(반쪽을 내밀며) 야하!!')));
  assert.notEqual(shape(pickVoice('usagi', '야하!')), shape(pickVoice('usagi', '우라!')));
  assert.equal(pickVoice('usagi', '야하!')[1].c, 'h', '야-하: 둘째 음절은 숨소리로 시작');
  assert.equal(pickVoice('usagi', '하아?')[0].c, 'h');
  assert.ok(pickVoice('usagi', '후루루루~!').length >= 5, '푸루루는 혀를 여러 번 튕긴다');
  assert.ok(pickVoice('usagi', '(우사기가 솜사탕을 뜯어 내밀었다)'), '말이 없어도 우사기 소리');
});

test('치이카와: 말 대신 헤에 · 히힣 웃음 · 흐에 울먹임 · 힛! 놀람 · 작은 소리만', () => {
  assert.equal(pickVoice('chiikawa', '…헤헤…').length, 3, '히힣 웃음은 세 번');
  assert.ok(pickVoice('chiikawa', '…흐에… (훌쩍)')[0].vib, '울먹임은 떨린다');
  assert.equal(pickVoice('chiikawa', '…!!')[0].v, 'i', '짧은 놀람은 힛!');
  assert.ok(pickVoice('chiikawa', '…맛있어…!').length <= 3, '긴 말도 옹알이가 아니라 작은 소리');
  for (const syl of [pickVoice('chiikawa', '…헤에'), pickVoice('chiikawa', '…섬… 좋다…')]) for (const s of syl) assert.ok(s.f0[0] >= 800, '작고 높은 목소리');
});

test('하치와레 · 모몽가: 글자 모음을 따라 옹알이, 물음표면 끝이 올라간다 · 모몽가는 흥!', () => {
  const q = pickVoice('hachiware', '배 타고 보러 가 보자는 거야?'), d = pickVoice('hachiware', '섬 최고다');
  assert.ok(q.length >= 2 && q.length <= 7);
  assert.ok(q.at(-1).f0[1] > q.at(-1).f0[0], '물음표: 끝이 올라간다');
  assert.ok(d.at(-1).f0[1] < d.at(-1).f0[0], '끝맺음: 끝이 내려간다');
  assert.equal(pickVoice('hachiware', '고마워~')[0].v, 'o', '고 → 오 모음');
  assert.equal(pickVoice('hachiware', '……'), null, '글자가 없으면 원래 말소리');
  assert.ok(pickVoice('momonga', '흥!')[0].nasal, '모몽가의 흥!은 코맹맹이');
  assert.ok(pickVoice('momonga', '뭐야!! 사기잖아!!')[0].f0[0] > pickVoice('hachiware', '뭐야!! 사기잖아!!')[0].f0[0], '모몽가가 더 높다');
});

test('다른 친구는 원래 톡톡 말소리', () => {
  for (const k of ['rakko', 'kurimanju', 'shisa', 'labor', null]) assert.equal(pickVoice(k, '하아~ 맥주 맛있다'), null);
});
