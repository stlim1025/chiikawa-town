import assert from 'node:assert/strict';
import { test } from 'node:test';
const { pickClip, playVoice, CLIPS, READY } = await import('../src/audio/voices.js');

test('우사기: 대사에서 야하! · 우라! · 하아? · 푸루루루 를 고른다(지문 괄호는 빼고 본다)', () => {
  assert.equal(pickClip('usagi', '야하~!'), 'usagi_yaha');
  assert.equal(pickClip('usagi', '(반쪽을 내밀며 같이 먹자고 한다) 야하!!'), 'usagi_yaha');
  assert.equal(pickClip('usagi', '하아?!'), 'usagi_haa');
  assert.equal(pickClip('usagi', '후루루루~!'), 'usagi_pururu');
  assert.equal(pickClip('usagi', '(우사기가 솜사탕을 뜯어 내밀었다)'), 'usagi_ura', '말이 없어도 우사기 소리');
});

test('치이카와는 말 대신 작은 소리 · 모몽가 흥! · 하치와레는 분위기에 맞는 맞장구', () => {
  assert.equal(pickClip('chiikawa', '…헤헤…'), 'chiikawa_hihi');
  assert.equal(pickClip('chiikawa', '…흐에… (훌쩍)'), 'chiikawa_hue');
  assert.equal(pickClip('chiikawa', '…!!'), 'chiikawa_hic');
  assert.equal(pickClip('chiikawa', '…맛있어…!'), 'chiikawa_e');
  assert.equal(pickClip('momonga', '흥! 저리 가!'), 'momonga_hmph');
  assert.equal(pickClip('hachiware', '배 타고 보러 가 보자는 거야?'), 'hachiware_eh');
  assert.equal(pickClip('hachiware', '섬 최고다~~!!'), 'hachiware_wow');
  assert.equal(pickClip('hachiware', '헤헤, 신난다~'), 'hachiware_hehe');
  assert.equal(pickClip('hachiware', '……'), null);
  for (const k of ['rakko', 'kurimanju', 'shisa', null]) assert.equal(pickClip(k, '하아~ 맥주 맛있다'), null, '다른 친구는 톡톡 말소리');
});

test('고를 수 있는 소리는 모두 만들 목록에 있고, 들어온 파일만 튼다(없으면 false → 톡톡 말소리)', () => {
  const lines = ['야하!', '우라!', '하아?', '후루루', '헤헤', '흐에', '헤에', '!', '…', '흥', '뭐야', '왜?', '우와!', '음…', '응'];
  for (const k of ['usagi', 'chiikawa', 'momonga', 'hachiware']) for (const l of lines) { const id = pickClip(k, l); if (id) assert.ok(CLIPS[id], id); }
  for (const id of READY) assert.ok(CLIPS[id], '들어온 파일은 목록에 있는 이름: ' + id);
  if (!READY.includes('usagi_yaha')) assert.equal(playVoice({}, null, 'usagi', '야하!'), false);
});
