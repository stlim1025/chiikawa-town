import assert from 'node:assert/strict';
import { test } from 'node:test';
const { talkMenu, subAsk, TALK_GROUPS, BACK } = await import('../src/core/talkmenu.js');

const keys = (list) => list.map((o) => o[0]);

test('고를 거리가 적으면 접지 않는다(묶음에 하나뿐이면 그대로)', () => {
  const { top, groups } = talkMenu([['chat', '이야기하자'], ['gift', '선물 줄게'], ['play', '같이 놀자'], ['bye', '아무것도 아니야']]);
  assert.deepEqual(keys(top), ['chat', 'play', 'gift', 'bye']);
  assert.deepEqual(groups, {});
});

test('많으면 같이 하자 · 볼일 묶음으로 접고, 부탁 · 이야기 · 그만하기는 바로 보인다', () => {
  const opts = [['qreport:pillow', '부탁한 거 가져왔어!'], ['qstop', '오늘은 여기까지 하자'], ['chat', '이야기하자'], ['gift', '선물 줄게'],
    ['unparty', '이제 돌아가도 돼'], ['play', '같이 놀자'], ['visit', '집에 놀러 가도 돼?'], ['drink', '한 잔 하자'], ['shop', '포셰트 구경할래'],
    ['lodge', '하룻밤 재워 줄래?'], ['repay', '빌린 돈 갚을게'], ['bye', '아무것도 아니야']];
  const { top, groups } = talkMenu(opts);
  assert.deepEqual(keys(top), ['qreport:pillow', 'qstop', 'chat', 'unparty', 'grp:together', 'grp:errand', 'bye']);
  assert.deepEqual(top.find(([k]) => k === 'grp:together')[1], TALK_GROUPS.together.label);
  assert.deepEqual(keys(groups['grp:together']), ['play', 'visit', 'drink'], '원래 순서대로');
  assert.deepEqual(keys(groups['grp:errand']), ['gift', 'shop', 'lodge', 'repay']);
  assert.ok(top.length <= 7);
});

test('모든 고를 거리는 한 번씩만 어딘가에 있다', () => {
  const opts = ['chat', 'help', 'gift', 'party', 'play', 'visit', 'homeact', 'snack', 'study', 'shop', 'borrow', 'bye'].map((k) => [k, k]);
  const { top, groups } = talkMenu(opts);
  const all = [...keys(top).filter((k) => !k.startsWith('grp:')), ...Object.values(groups).flatMap(keys)];
  assert.deepEqual([...all].sort(), opts.map((o) => o[0]).sort());
  assert.equal(keys(top).at(-1), 'bye', '맨 끝은 그만하기');
});

test('묶음을 고르면 친구 말투로 묻고, 되돌아가기가 있다', () => {
  assert.equal(subAsk('usagi', 'grp:together'), '야하!');
  assert.equal(subAsk('momonga', 'grp:errand'), '뭔데? 빨리 말해.');
  assert.equal(subAsk('captain', 'grp:together'), '뭐 할까?');
  assert.equal(subAsk('captain', 'grp:errand'), '응, 뭔데?');
  assert.ok(BACK.length > 0);
});
