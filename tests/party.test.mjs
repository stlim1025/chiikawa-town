import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../src/core/hunters.js';
import { NPC_LINES, lineOf } from '../src/core/npclines.js';
import { createState } from '../src/core/state.js';
import { ptsForHearts } from '../src/core/friends.js';
import { isValidState } from '../src/core/save.js';

const fresh = () => ({ ...createState({ name: '나', look: {} }), tutorial: 'done' });
const withHearts = (s, kind, n) => ({ ...s, friends: { ...(s.friends || {}), [kind]: { pts: ptsForHearts(n), talk: 0, play: 0, gift: true } } });
const lic = (s, kind) => ({ ...s, hunters: { ...(s.hunters || {}), [kind]: { ...H.hunterOf(s, kind), license: 1 } } });

test('같이 잡으면 점수를 나눠 갖고 쓰러뜨린 수는 모두 하나씩', () => {
  let s = { ...fresh(), licenses: { hunter: { day: 1 } } };
  for (const who of ['me', 'rakko']) s = H.addKill(s, who, 'turtle', 2);
  assert.equal(H.hunterOf(s, 'me').points, 4);
  assert.equal(H.hunterOf(s, 'me').kills, 1);
  assert.equal(H.hunterOf(s, 'rakko').points, 236 + 4);
  assert.equal(H.killPoints('fluff', 3), 1); // 3 / 3
  assert.equal(H.killPoints('hopper', 3), 1); // 적어도 1
  assert.equal(H.killPoints('kingcap', 2), Math.round((72 + H.BOSS_BONUS) / 2));
  assert.equal(H.killPoints('dummy', 1), 0);
  assert.ok(isValidState(s));
});

test('같이 토벌 조건: 하트 → 내 자격증 → 친구 자격증 → 밤 → 기운 → 자리', () => {
  const day = 3;
  let s = fresh();
  assert.equal(H.partyCheck(s, 'momonga', { day }).reason, 'hunter');
  assert.equal(H.partyCheck(s, 'usagi', { day }).reason, 'hearts');
  s = withHearts(s, 'usagi', H.PARTY_HEARTS);
  assert.equal(H.partyCheck(s, 'usagi', { day }).reason, 'myLicense');
  s = { ...s, licenses: { hunter: { day: 1 } } };
  assert.equal(H.partyCheck(s, 'usagi', { day }).reason, 'license');
  s = lic(s, 'usagi');
  assert.equal(H.partyCheck(s, 'usagi', { day, night: true }).reason, 'night');
  assert.equal(H.partyCheck(s, 'usagi', { day, party: ['rakko', 'chiikawa'] }).reason, 'full');
  assert.equal(H.partyCheck(s, 'usagi', { day, party: ['usagi'] }).reason, 'already');
  assert.ok(H.partyCheck(s, 'usagi', { day, party: ['rakko'] }).ok);
  // 랏코는 처음부터 자격증이 있다
  assert.ok(H.partyCheck(withHearts({ ...fresh(), licenses: { hunter: { day: 1 } } }, 'rakko', 3), 'rakko', { day }).ok);
  // 기운이 모자라면
  const tired = { ...s, villagers: { ...(s.villagers || {}), usagi: { day, energy: 20, money: 100, jobs: 0 } } };
  assert.equal(H.partyCheck(tired, 'usagi', { day }).reason, 'tired');
});

const KEYS = ['jobTake', 'jobSoldOut', 'sticker', 'pull', 'berry', 'jobDone', 'jobFail', 'eat', 'napWake', 'examGo', 'examPass', 'examFail',
  'huntGo', 'huntSoldOut', 'huntCry', 'huntDone', 'huntFail', 'partyJoin', 'partyHearts', 'partyMyLicense', 'partyLicense', 'partyNight',
  'partyTired', 'partyFull', 'partyBusy', 'partyCry', 'partyLeave', 'partyTiredLeave', 'partyNightLeave', 'partyFaint'];

test('토벌하는 친구는 모든 대사가 자기 말투로 있다', () => {
  for (const kind of Object.keys(H.HUNTER_PROFILES)) for (const k of KEYS) assert.ok(NPC_LINES[kind][k] != null, `${kind}.${k}`);
});

test('대사는 짧고 · 나 마침표로 문장을 잇지 않는다', () => {
  for (const [kind, L] of Object.entries(NPC_LINES)) {
    for (const [k, v] of Object.entries(L)) {
      for (const line of [].concat(v)) {
        assert.ok(!line.includes('·'), `${kind}.${k}: ${line}`);
        assert.ok(!/[^.…]\.\s/.test(line) && !/[^.…]\.$/.test(line), `마침표: ${kind}.${k}: ${line}`);
        assert.ok(line.replace(/\{\w+\}/g, '').length <= 24, `너무 길다: ${kind}.${k}: ${line}`);
      }
    }
  }
});

test('lineOf 는 일감 이름 · 보수를 채우고, 말투가 없으면 보통 말로', () => {
  assert.equal(lineOf('rakko', 'jobDone', { pay: '+120원' }), '…받아 두지 +120원');
  assert.ok(lineOf('chiikawa', 'jobTake', { title: '잡초 8개 뽑기' }, () => 0).startsWith('잡초 8개 뽑기'));
  assert.equal(lineOf('kani', 'eat'), '라멘 맛있다~');
  assert.equal(lineOf('momonga', 'eat'), '맛있어! 더 줘!');
  assert.equal(lineOf('usagi', 'nothing'), '');
});
