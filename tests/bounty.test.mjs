import test from 'node:test';
import assert from 'node:assert/strict';
import { BOUNTY_POOL, BOUNTY_FROM, BOUNTY_TO, BOUNTY_END, bountyOf, bountyNow, bountyReward, markBountyDown, claimBounty, isValidBounty } from '../src/core/bounty.js';
import { MONSTERS } from '../src/core/combat.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';
import '../src/core/quests.js';

// 이 게임의 하루는 아침 6시에 시작한다: at(day, hour)
const at = (day, hour) => ({ day, t: (hour - 6) / 24 });
const hunter = (day, hour) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', licenses: { hunter: { day: 1 } }, clock: at(day, hour) });
const someDay = () => { for (let d = 2; d < 400; d++) if (bountyOf(d)) return d; throw new Error('no bounty day'); };

test('현상금은 날 번호로 정해진다: 같은 날이면 늘 같고, 열흘에 예닐곱 번쯤', () => {
  let n = 0;
  for (let d = 2; d < 302; d++) {
    const b = bountyOf(d);
    assert.deepEqual(bountyOf(d), b, '다시 물어도 같다');
    if (!b) continue;
    n++;
    assert.ok(BOUNTY_POOL.includes(b.species));
    assert.ok(b.hour >= BOUNTY_FROM && b.hour < BOUNTY_TO);
    assert.equal(b.end, BOUNTY_END);
    assert.equal(b.reward, bountyReward(b.species));
    assert.equal(b.name, `황금 ${MONSTERS[b.species].name}`);
  }
  assert.ok(n > 140 && n < 220, `300일 중 ${n}일`);
  assert.equal(bountyOf(1), null, '첫날은 없다');
  assert.equal(bountyReward('fluff'), 430);
  assert.equal(bountyReward('turtle'), 730);
});

test('현상금 전단: 토벌 자격증이 있어야 붙고, 시각에 따라 나타났다가 밤 10시에 사라진다', () => {
  const d = someDay(), b = bountyOf(d);
  assert.equal(bountyNow({ ...hunter(d, 12), licenses: {} }), null, '자격증이 없으면 없다');
  assert.equal(bountyNow({ ...hunter(d, 12), tutorial: 'board' }), null, '첫날 안내 중이면 없다');
  assert.equal(bountyNow(hunter(d, b.hour - 0.5)).status, 'soon');
  assert.equal(bountyNow(hunter(d, b.hour + 0.1)).status, 'up');
  assert.equal(bountyNow(hunter(d, 22.5)).status, 'gone');
});

test('현상금: 쓰러뜨리면 게시판에서 한 번만 받고, 다음 날은 새로', () => {
  const d = someDay(), b = bountyOf(d);
  let s = hunter(d, b.hour + 0.5);
  assert.equal(claimBounty(s).ok, false, '쓰러뜨리기 전에는 못 받는다');
  s = markBountyDown(s);
  assert.equal(bountyNow(s).status, 'down');
  assert.equal(bountyNow({ ...s, clock: at(d, 23) }).status, 'down', '밤이 돼도 받을 수 있다');
  const money = s.money, r = claimBounty(s);
  assert.ok(r.ok);
  assert.equal(r.state.money, money + b.reward);
  assert.equal(bountyNow(r.state).status, 'paid');
  assert.equal(claimBounty(r.state).ok, false, '두 번은 못 받는다');
  assert.ok(isValidState(r.state));
  assert.ok(isValidBounty(r.state.bounty));
  // 다음 현상금 날은 새로
  let next = d + 1;
  while (!bountyOf(next)) next++;
  const later = { ...r.state, clock: at(next, 23.5) };
  assert.equal(bountyNow(later).status, 'gone', '지난 날 기록은 쓰지 않는다');
  assert.ok(!isValidState({ ...r.state, bounty: { day: 'x', down: true, paid: false } }));
});
