import test from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../src/core/villagetalk.js';
import { VILLAGERS } from '../src/core/villagers.js';

const KINDS = Object.keys(VILLAGERS);
const clean = (line, where) => {
  assert.ok(typeof line === 'string' && line.length, `빈 대사: ${where}`);
  assert.ok(!line.includes('·'), `· : ${where}: ${line}`);
  assert.ok(!/[^.…]\.(\s|$)/.test(line), `마침표: ${where}: ${line}`);
  assert.ok(line.length <= 30, `너무 길다(${line.length}): ${where}: ${line}`);
};
const TYPES = ['meal', 'chat', 'job', 'hunt', 'examPass', 'examFail', 'sing', 'watch', 'train', 'theft', 'partyHunt', 'buy'];
const evs = (who, other) => TYPES.map((type) => ({ type, who: type === 'sing' ? 'hachiware' : type === 'theft' ? 'momonga' : who, with: type === 'buy' ? null : other, title: '잡초 8개 뽑기', mon: '물방울 슬라임', n: 3, item: '먼작귀 인형' }));

test('짝 수다 · 잡담은 짧고 말하는 친구가 그 짝이다', () => {
  for (const [key, scripts] of Object.entries(V.PAIR_TALK)) {
    const pair = key.split('|');
    assert.deepEqual([...pair].sort(), pair, `이름순 키: ${key}`);
    for (const sc of scripts) for (const [k, t] of sc) { assert.ok(pair.includes(k), `${key}: ${k}`); clean(t, key); }
  }
  for (const side of ['open', 'reply']) for (const k of KINDS) for (const t of V.SMALLTALK[side][k]) clean(t, `${side}.${k}`);
});

test('이야기 · 소문 · 반응은 모든 친구가 깔끔하게 말한다', () => {
  for (const k of KINDS) {
    for (const other of KINDS.filter((o) => o !== k)) {
      for (const ev of [...evs(k, other), ...evs(other, null)]) {
        const s = V.storyLine(k, ev, '승택', () => 0);
        if (s) clean(s, `${k} ${ev.type} ${ev.who}`);
        clean(V.reactLine(k, ev, () => 0), `react ${k}`);
      }
    }
    for (const type of ['playerBoss', 'playerRanker', 'playerLicense']) {
      const ev = { type, who: 'me', lic: '토벌 자격증' };
      clean(V.praiseLine(k, ev, '승택'), `praise ${k} ${type}`);
      clean(V.gossipLine(k, ev, '승택'), `gossip ${k} ${type}`);
    }
  }
});

test('1인칭과 소문을 가린다', () => {
  assert.equal(V.storyLine('chiikawa', { type: 'meal', who: 'chiikawa', with: 'hachiware' }), '…아까 하치와레랑 라멘 먹었어…♪');
  assert.equal(V.storyLine('chiikawa', { type: 'meal', who: 'hachiware', with: 'chiikawa' }), '…아까 하치와레랑 라멘 먹었어…♪');
  assert.equal(V.storyLine('hachiware', { type: 'hunt', who: 'usagi', mon: '풀뭉치' }), '있잖아~ 우사기가 풀뭉치 잡았대!');
  assert.equal(V.storyLine('rakko', { type: 'examPass', who: 'chiikawa' }), '…치이카와가 토벌 자격증 땄다더군');
  assert.equal(V.gossipLine('kurimanju', { type: 'playerBoss', who: 'me' }, '승택'), '하아~ 승택이 왕버섯을 쓰러뜨렸대');
  assert.equal(V.praiseLine('hachiware', { type: 'playerBoss', who: 'me' }, '승택'), '승택! 왕버섯 잡았다며?! 대단해~!');
});

test('수다 대본: 소문을 전하거나 짝 수다 · 잡담', () => {
  const news = [{ type: 'hunt', who: 'rakko', mon: '이끼 거북' }];
  const a = V.conversation('hachiware', 'chiikawa', news, '나', () => 0.1);
  assert.equal(a.told, news[0]);
  assert.deepEqual(a.lines.map((l) => l[0]), ['hachiware', 'hachiware', 'chiikawa']);
  const b = V.conversation('chiikawa', 'hachiware', [], '나', () => 0.5);
  assert.ok(b.lines.every(([k]) => k === 'chiikawa' || k === 'hachiware'));
  const c = V.conversation('rakko', 'kurimanju', [], '나', () => 0.95);
  assert.equal(c.lines.length, 2);
  // 듣는 친구 자신의 일은 소문으로 전하지 않는다
  const d = V.conversation('hachiware', 'rakko', news, '나', () => 0.1);
  assert.equal(d.told, null);
});

test('마을 소식 문장', () => {
  assert.equal(V.newsLine({ type: 'meal', who: 'chiikawa', with: 'hachiware' }).text, '치이카와와 하치와레가 라멘을 같이 먹었어요');
  assert.equal(V.newsLine({ type: 'meal', who: 'chiikawa' }), null);
  assert.equal(V.newsLine({ type: 'job', who: 'usagi', title: '잡초 8개 뽑기' }).text, '우사기가 잡초 8개 뽑기를 끝냈어요');
  assert.equal(V.newsLine({ type: 'playerBoss', who: 'me' }, '승택').text, '승택이 왕버섯을 쓰러뜨렸어요');
  assert.deepEqual(V.newsLine({ type: 'comfort', who: 'hachiware', with: 'chiikawa' }).kinds, ['hachiware', 'chiikawa']);
  for (const k of Object.keys(V.HOBBY)) for (const t of V.HOBBY[k].lines) clean(t, k);
  for (const k of KINDS) { V.GREET_RUN[k].forEach((t) => clean(t, k)); clean(V.GIFT[k].line, k); clean(V.CONGRATS[k], k); clean(V.COMFORT[k], k); clean(V.FAINT_RUSH[k], k); }
});

test('갑옷 씨들 대사도 짧고 깔끔하다', () => {
  for (const [kind, T] of Object.entries(V.STAFF_TALK)) for (const [k, list] of Object.entries(T)) for (const t of list) clean(t, `${kind}.${k}`);
  for (const scripts of Object.values(V.STAFF_SCRIPTS)) for (const sc of scripts) for (const [, t] of sc) clean(t, 'script');
  for (const k of KINDS) clean(V.PRAISED[k], k);
});
