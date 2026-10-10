import test from 'node:test';
import assert from 'node:assert/strict';
import { NPC_LINES, PLAY_KEYS, lineOf } from '../src/core/npclines.js';
import { FRIENDS } from '../src/core/friends.js';

const players = Object.keys(FRIENDS).filter((k) => FRIENDS[k].play);

test('같이 노는 친구는 놀이 대사(가위바위보 · 술래잡기 · 춤)를 모두 자기 말투로 갖고 있다', () => {
  assert.ok(players.length >= 5, players.join(','));
  for (const k of players) for (const key of PLAY_KEYS) assert.ok(NPC_LINES[k] && NPC_LINES[k][key] != null, `${k}.${key}`);
});

test('친구마다 놀이 대사가 다르다(모두 똑같이 말하지 않는다)', () => {
  for (const key of PLAY_KEYS) {
    const all = players.map((k) => [].concat(NPC_LINES[k][key]).join('|'));
    assert.equal(new Set(all).size, players.length, `${key}: ${all.join(' / ')}`);
  }
});

test('우사기는 소리로만 말한다(뜻은 괄호 안에)', () => {
  for (const key of [...PLAY_KEYS, 'gift']) {
    for (const line of [].concat(NPC_LINES.usagi[key])) {
      const spoken = line.replace(/\([^)]*\)/g, '').replace(/\{\w+\}/g, '');
      assert.match(spoken, /^[우라야하아후랏이~!?…\s]*$/, `${key}: ${line}`);
    }
  }
});

test('선물을 주는 친구는 선물 대사도 자기 말투로', () => {
  for (const k of Object.keys(FRIENDS).filter((id) => FRIENDS[id].gift)) assert.ok(NPC_LINES[k] && NPC_LINES[k].gift, k);
  assert.notEqual(lineOf('usagi', 'gift'), lineOf('rakko', 'gift'));
});

test('가위바위보 대사는 친구가 낸 손을 말하고, 내 이름 자리({name})는 남겨 둔다', () => {
  for (const k of players) for (const l of [].concat(NPC_LINES[k].rpsShow)) assert.ok(l.includes('{hand}'), `${k}: ${l}`);
  assert.ok(lineOf('hachiware', 'rpsShow', { hand: '바위' }).includes('바위'));
  const withName = players.flatMap((k) => PLAY_KEYS.flatMap((key) => [].concat(NPC_LINES[k][key]))).filter((l) => l.includes('{name}'));
  assert.ok(withName.length > 0);
  assert.ok(lineOf('rakko', 'rpsLose', { name: '{name}' }, () => 0.99).includes('{name}'));
});
