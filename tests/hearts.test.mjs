import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const F = await import(G + 'friends.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');

const fresh = () => St.createState({ name: '치이', look: { body: 'white' } });

test('하트 하나에 6점: 매일 이야기 + 놀기를 해도 하트 5개까지 보름은 걸린다', () => {
  assert.equal(F.HEART_PTS, 6);
  let s = fresh(), day = 1;
  for (; F.hearts(F.friendOf(s, 'chiikawa')) < F.MAX_HEARTS; day++) {
    s = F.befriend(s, 'chiikawa', 'talk', day).state;
    s = F.befriend(s, 'chiikawa', 'play', day).state;
  }
  assert.ok(day - 1 >= 15, `하트 5개까지 ${day - 1}일`);
});

test('예전 저장(하트 하나에 3점)은 불러올 때 점수를 두 배로 — 가진 하트는 그대로', () => {
  const old = { ...fresh(), version: 1, friends: { chiikawa: { pts: 9, talk: 3, play: 3, gift: true }, momonga: { pts: 2, talk: 1, play: 0, gift: false } } };
  const r = S.deserialize(S.serialize(old));
  assert.ok(r.ok);
  assert.equal(r.state.version, St.STATE_VERSION);
  assert.equal(r.state.friends.chiikawa.pts, 18);
  assert.equal(F.hearts(r.state.friends.chiikawa), 3, '하트 3개 그대로');
  assert.equal(F.hearts(r.state.friends.momonga), 0);
  assert.equal(r.state.friends.chiikawa.gift, true, '다른 기록은 그대로');
  // 다시 저장했다 불러와도 또 두 배가 되지 않는다
  assert.equal(S.deserialize(S.serialize(r.state)).state.friends.chiikawa.pts, 18);
  // 버전이 아예 없던 더 옛 저장도 예전 단위로 본다
  const older = { ...old };
  delete older.version;
  assert.equal(S.deserialize(S.serialize(older)).state.friends.chiikawa.pts, 18);
});

test('새 게임은 지금 단위라 불러와도 점수가 바뀌지 않는다', () => {
  const s = { ...fresh(), friends: { usagi: { pts: 7, talk: 1, play: 1, gift: false } } };
  assert.equal(s.version, St.STATE_VERSION);
  assert.equal(S.deserialize(S.serialize(s)).state.friends.usagi.pts, 7);
});
