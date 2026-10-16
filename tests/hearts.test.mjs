import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const F = await import(G + 'friends.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');

const fresh = () => St.createState({ name: '치이', look: { body: 'white' } });
/** 매일 이야기 + 놀기를 했을 때 하트 n 개가 되는 날. */
function dayOfHearts(n) {
  let s = fresh(), day = 1;
  for (; F.hearts(F.friendOf(s, 'chiikawa')) < n; day++) {
    s = F.befriend(s, 'chiikawa', 'talk', day).state;
    s = F.befriend(s, 'chiikawa', 'play', day).state;
  }
  return day - 1;
}

test('하트는 처음엔 금방, 갈수록 오래: 하트마다 드는 점수가 늘어난다', () => {
  const gaps = F.HEART_AT.map((at, i) => at - (i ? F.HEART_AT[i - 1] : 0));
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1], `하트 ${i + 1}: ${gaps[i]}점 > ${gaps[i - 1]}점`);
  assert.equal(F.HEART_AT.length, F.MAX_HEARTS);
  assert.equal(F.ptsForHearts(0), 0);
  assert.equal(F.ptsForHearts(F.MAX_HEARTS), F.HEART_AT.at(-1));
  for (let n = 0; n <= F.MAX_HEARTS; n++) {
    assert.equal(F.hearts({ pts: F.ptsForHearts(n) }), n, `${n}개 점수면 하트 ${n}`);
    if (n) assert.equal(F.hearts({ pts: F.ptsForHearts(n) - 1 }), n - 1, `한 점 모자라면 ${n - 1}`);
  }
});

test('매일 이야기 + 놀기: 첫 하트는 이튿날, 다섯 개까지는 3주 남짓', () => {
  assert.equal(dayOfHearts(1), 2);
  assert.ok(dayOfHearts(2) <= 5, `하트 2개: ${dayOfHearts(2)}일`);
  assert.ok(dayOfHearts(F.MAX_HEARTS) >= 22, `하트 5개: ${dayOfHearts(F.MAX_HEARTS)}일`);
  const days = Array.from({ length: F.MAX_HEARTS }, (_, i) => dayOfHearts(i + 1));
  for (let i = 1; i < days.length; i++) assert.ok(days[i] - days[i - 1] >= (i > 1 ? days[i - 1] - days[i - 2] : 1), `하트 ${i + 1}까지 걸리는 날이 줄지 않는다: ${days}`);
});

test('예전 저장(하트 하나에 3점 · 6점)은 불러올 때 새 곡선으로 — 가진 하트는 그대로', () => {
  const v1 = { ...fresh(), version: 1, friends: { chiikawa: { pts: 9, talk: 3, play: 3, gift: true }, momonga: { pts: 2, talk: 1, play: 0, gift: false } } };
  const r = S.deserialize(S.serialize(v1));
  assert.ok(r.ok);
  assert.equal(r.state.version, St.STATE_VERSION);
  assert.equal(F.hearts(r.state.friends.chiikawa), 3, '하트 3개 그대로');
  assert.equal(r.state.friends.chiikawa.pts, F.ptsForHearts(3));
  assert.equal(F.hearts(r.state.friends.momonga), 0);
  assert.equal(r.state.friends.chiikawa.gift, true, '다른 기록은 그대로');
  // 다시 저장했다 불러와도 또 바뀌지 않는다
  assert.equal(S.deserialize(S.serialize(r.state)).state.friends.chiikawa.pts, r.state.friends.chiikawa.pts);
  // 버전이 아예 없던 더 옛 저장도 버전 1로 본다
  const older = { ...v1 };
  delete older.version;
  assert.equal(S.deserialize(S.serialize(older)).state.friends.chiikawa.pts, F.ptsForHearts(3));
  // 버전 2(하트 하나에 6점): 하트 개수는 그대로, 다음 하트까지 채운 만큼은 비율대로(내림)
  for (let pts = 0; pts <= 40; pts++) {
    const v2 = { ...fresh(), version: 2, friends: { usagi: { pts, talk: 1, play: 1, gift: false } } };
    const up = S.deserialize(S.serialize(v2)).state.friends.usagi.pts;
    assert.equal(F.hearts({ pts: up }), Math.min(F.MAX_HEARTS, Math.floor(pts / 6)), `6점 단위 ${pts}점 → ${up}점`);
  }
  const half = S.deserialize(S.serialize({ ...fresh(), version: 2, friends: { usagi: { pts: 15, talk: 1, play: 1, gift: false } } })).state.friends.usagi.pts;
  assert.equal(half, F.ptsForHearts(2) + Math.floor((F.ptsForHearts(3) - F.ptsForHearts(2)) / 2), '하트 2개 반 → 다음 하트까지 반');
});

test('버전 3 ~ 5 저장(2 · 6 · 12 · 20 · 30점 곡선)은 불러올 때 1.5배 곡선으로 — 가진 하트는 그대로', () => {
  const load = (pts) => S.deserialize(S.serialize({ ...fresh(), version: 5, friends: { usagi: { pts, talk: 1, play: 1, gift: false, capDay: 4, capPts: 2 } } })).state.friends.usagi;
  const oldHearts = (pts) => { let h = 0; while (h < F.MAX_HEARTS && pts >= F.CURVE_V3[h]) h++; return h; };
  for (let pts = 0; pts <= 32; pts++) assert.equal(F.hearts(load(pts)), oldHearts(pts), `예전 ${pts}점 → ${load(pts).pts}점`);
  for (let n = 0; n <= F.MAX_HEARTS; n++) assert.equal(load(n ? F.CURVE_V3[n - 1] : 0).pts, F.ptsForHearts(n), `하트 ${n}개 딱 → 새 곡선 하트 ${n}개 딱`);
  assert.equal(load(9).pts, F.ptsForHearts(2) + Math.floor((F.ptsForHearts(3) - F.ptsForHearts(2)) / 2), '하트 2개 반 → 다음 하트까지 반');
  assert.equal(load(32).pts, F.ptsForHearts(F.MAX_HEARTS) + 2, '다 채우고 남은 점수는 그대로 얹는다');
  assert.equal(load(5).capPts, 2, '그날 상한을 센 값은 그대로');
  const r = S.deserialize(S.serialize({ ...fresh(), version: 5, friends: { usagi: { pts: 13, talk: 1, play: 1, gift: true } } })).state;
  assert.equal(r.version, St.STATE_VERSION);
  assert.equal(S.deserialize(S.serialize(r)).state.friends.usagi.pts, r.friends.usagi.pts, '다시 불러와도 또 바뀌지 않는다');
});

test('새 게임은 지금 단위라 불러와도 점수가 바뀌지 않는다', () => {
  const s = { ...fresh(), friends: { usagi: { pts: 7, talk: 1, play: 1, gift: false } } };
  assert.equal(s.version, St.STATE_VERSION);
  assert.equal(S.deserialize(S.serialize(s)).state.friends.usagi.pts, 7);
});
