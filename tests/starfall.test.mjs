import test from 'node:test';
import assert from 'node:assert/strict';
import { isStarfallNight, isStarHour, canWish, makeWish, WISHES, WISH_MONEY, WISH_STAMINA, isValidStarfall } from '../src/core/starfall.js';
import { createState } from '../src/core/state.js';
import { createClock } from '../src/core/clock.js';
import { countOf, itemInfo } from '../src/core/inventory.js';
import { raffleOf } from '../src/core/raffle.js';
import { friendOf } from '../src/core/friends.js';
import { isValidState } from '../src/core/save.js';

const night = (() => { for (let d = 2; d < 60; d++) if (isStarfallNight(d)) return d; return -1; })();
const at = (day, hour, o = {}) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', player: { x: 0, z: 0 }, clock: createClock(day, hour), ...o });

test('별똥별이 쏟아지는 밤은 둘째 날부터 며칠에 한 번(날마다 같은 답)', () => {
  assert.equal(isStarfallNight(1), false, '첫날은 아직');
  const nights = Array.from({ length: 300 }, (_, i) => i + 2).filter(isStarfallNight);
  assert.ok(nights.length > 300 * 0.2 && nights.length < 300 * 0.45, `${nights.length}/300`);
  assert.equal(isStarfallNight(night), isStarfallNight(night));
  assert.ok(night > 0);
});

test('밤 8시부터 새벽 2시까지만', () => {
  for (const h of [20, 21.5, 23.9, 0, 1.9]) assert.equal(isStarHour(h), true, String(h));
  for (const h of [19.9, 2.1, 6, 12]) assert.equal(isStarHour(h), false, String(h));
});

test('소원은 별똥별 밤 · 그 시간에만, 하룻밤에 한 번', () => {
  assert.equal(canWish(at(night, 21)), true);
  assert.equal(canWish(at(night, 15)), false, '낮에는 별똥별이 없다');
  const plain = (() => { for (let d = 2; d < 60; d++) if (!isStarfallNight(d)) return d; return -1; })();
  assert.equal(canWish(at(plain, 21)), false, '별똥별 밤이 아니면');
  assert.equal(canWish(at(night, 21, { tutorial: 'board' })), false, '첫날 안내 중에는');
  const r = makeWish(at(night, 21), 'rich');
  assert.equal(r.ok, true);
  assert.equal(canWish(r.state), false, '이미 빌었다');
  assert.equal(makeWish(r.state, 'rich').ok, false);
});

test('소원은 시시하게 조금 이루어지고, 별 조각을 남긴다', () => {
  assert.equal(WISHES.length, 4);
  assert.ok(itemInfo('starshard'), '별 조각');
  const s0 = at(night, 21, { money: 100, stamina: 90 });
  const rich = makeWish(s0, 'rich');
  assert.equal(rich.state.money, 100 + WISH_MONEY);
  assert.equal(countOf(rich.state, 'starshard'), 1);
  const full = makeWish(s0, 'full');
  assert.equal(full.state.stamina, Math.min(100, 90 + WISH_STAMINA));
  const luck = makeWish(s0, 'luck');
  assert.equal(raffleOf(luck.state).tickets, raffleOf(s0).tickets + 1);
  const pals = makeWish(s0, 'friends', ['chiikawa', 'usagi']);
  assert.ok(friendOf(pals.state, 'chiikawa').pts > friendOf(s0, 'chiikawa').pts);
  assert.ok(friendOf(pals.state, 'usagi').pts > friendOf(s0, 'usagi').pts);
  assert.deepEqual(pals.gained.sort(), ['chiikawa', 'usagi']);
  assert.equal(makeWish(s0, 'nope').ok, false, '모르는 소원');
});

test('저장 모양 검사', () => {
  assert.equal(isValidStarfall({ day: 3 }), true);
  assert.equal(isValidStarfall({ day: 'x' }), false);
  assert.equal(isValidStarfall(null), false);
  const r = makeWish(at(night, 21), 'luck');
  assert.equal(isValidState(r.state), true);
  assert.equal(isValidState({ ...r.state, starfall: { day: 'x' } }), false);
});

test('친구들은 별똥별맨을 보고 자기 말투로 놀란다', async () => {
  const { NPC_LINES } = await import('../src/core/npclines.js');
  for (const k of ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'rakko', 'momonga']) {
    assert.ok(NPC_LINES[k].starShock && NPC_LINES[k].starBye, k);
  }
  assert.notEqual(String(NPC_LINES.usagi.starShock), String(NPC_LINES.rakko.starShock));
  // 원작: 별똥별맨이 발광하면 우사기는 따라 발광하고, 치이카와 · 하치와레는 소원을 빈다
  assert.ok(NPC_LINES.chiikawa.starPray && NPC_LINES.hachiware.starPray && NPC_LINES.usagi.starCopy);
  assert.match(NPC_LINES.usagi.starCopy.replace(/\([^)]*\)/g, ''), /^[우라야하아후랏이~!?…\s]*$/, '우사기는 소리로만');
});
