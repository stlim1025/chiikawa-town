import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/core/contest.js';
import { createState } from '../src/core/state.js';
import { isValidState, serialize, deserialize } from '../src/core/save.js';
import { homeOf } from '../src/core/home.js';

const START = '2026-10-01'; // 목요일
const fresh = (over = {}) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', ...over });

test('대회 날: 토요일 낚시, 수요일 풀, 3일째부터', () => {
  assert.equal(C.contestKindOn(START, 3), 'fish'); // 10/3(토)
  assert.equal(C.contestKindOn(START, 7), 'weed'); // 10/7(수)
  assert.equal(C.contestKindOn(START, 4), null);
  assert.equal(C.contestKindOn(START, 42), 'weed'); // 11/11(수), 막대 과자 데이와 겹쳐도 연다
  assert.equal(C.contestKindOn('2026-10-07', 1), null); // 수요일이지만 3일째 전
  assert.equal(C.contestKindOn(null, 3), null);
});

test('대회 시각: 판이 돌면 5시가 넘어도 open', () => {
  assert.equal(C.contestPhase(8.9, false), 'before');
  assert.equal(C.contestPhase(9, false), 'open');
  assert.equal(C.contestPhase(16.99, false), 'open');
  assert.equal(C.contestPhase(17, false), 'ceremony');
  assert.equal(C.contestPhase(17.2, true), 'open');
  assert.equal(C.contestPhase(21, false), 'closed');
  assert.equal(C.contestPhase(3, false), 'closed'); // 하루는 아침 6시에 바뀌니 새벽 3시는 그날의 끝
});

test('한 판 점수: 깡통 빼기, 깔끔 2점 끊김 1점, 같을 때 가르기', () => {
  let r = C.newRound('fish');
  assert.deepEqual(r, { kind: 'fish', s: 0, t: 0, clean: 0 });
  r = C.roundCatch(r, { cm: 12 });
  r = C.roundCatch(r, { junk: true, cm: null });
  r = C.roundCatch(r, { cm: 30 });
  assert.equal(r.s, 2);
  assert.equal(r.t, 30);
  let w = C.newRound('weed');
  w = C.roundPull(w, 'clean');
  w = C.roundPull(w, 'snapped');
  w = C.roundPull(w, 'none');
  w = C.roundPull(w, 'clean');
  assert.equal(w.s, 5);
  assert.equal(w.clean, 2);
  assert.equal(w.t, 2);
  assert.ok(C.better({ s: 5, t: 1 }, { s: 4, t: 9 }));
  assert.ok(C.better({ s: 5, t: 3 }, { s: 5, t: 2 }));
  assert.ok(!C.better({ s: 5, t: 2 }, { s: 5, t: 2 }));
  assert.ok(C.better({ s: 0, t: 0 }, null));
});

test('기록: 가장 좋은 판만 남고 판 수는 센다', () => {
  let s = C.beginContestDay(fresh(), 3, 'fish');
  s = C.recordRound(s, { s: 6, t: 20 });
  s = C.recordRound(s, { s: 4, t: 50 });
  const c = C.contestOf(s);
  assert.deepEqual(c.best, { s: 6, t: 20 });
  assert.equal(c.rounds, 2);
  assert.equal(c.kind, 'fish');
  assert.equal(c.day, 3);
  assert.ok(isValidState(s));
  // 같은 날 다시 begin 해도 그대로, 다음 대회 날이면 새로(우승 수는 그대로)
  assert.equal(C.contestOf(C.beginContestDay(s, 3, 'fish')).rounds, 2);
  const won = { ...s, contest: { ...C.contestOf(s), wins: { fish: 2, weed: 1 } } };
  const next = C.contestOf(C.beginContestDay(won, 7, 'weed'));
  assert.equal(next.rounds, 0);
  assert.equal(next.best, null);
  assert.deepEqual(next.wins, { fish: 2, weed: 1 });
});

test('들어가기: 기운 10, 시간, 몸 바뀜, 손님 4시 30분', () => {
  const s = C.beginContestDay(fresh({ stamina: 50 }), 3, 'fish');
  assert.deepEqual(C.canEnter(s, { hour: 10, kind: 'fish' }), { ok: true, reason: null });
  assert.equal(C.canEnter({ ...s, stamina: 9 }, { hour: 10, kind: 'fish' }).reason, 'stamina');
  assert.equal(C.canEnter({ ...s, stamina: 10 }, { hour: 10, kind: 'fish' }).ok, true);
  assert.equal(C.canEnter(s, { hour: 8, kind: 'fish' }).reason, 'hour');
  assert.equal(C.canEnter(s, { hour: 17.5, kind: 'fish' }).reason, 'hour');
  assert.equal(C.canEnter(s, { hour: 10, kind: null }).reason, 'day');
  assert.equal(C.canEnter(s, { hour: 10, kind: 'fish', swapped: true }).reason, 'swap');
  assert.equal(C.canEnter(s, { hour: 16.6, kind: 'fish', guest: true }).reason, 'late');
  assert.equal(C.canEnter(s, { hour: 16.6, kind: 'fish' }).ok, true);
});

test('등수와 상품: 한 번만, 참가상, 처음 1등만 트로피', () => {
  let s = C.beginContestDay(fresh({ money: 0 }), 3, 'fish');
  s = C.recordRound(s, { s: 9, t: 40 });
  s = { ...s, contest: { ...C.contestOf(s), npc: { rakko: { s: 9, t: 31 }, usagi: { s: 7, t: 28 } } } };
  s = C.settleContest(s);
  const c = C.contestOf(s);
  assert.equal(c.rank, 1);
  assert.equal(c.wins.fish, 1);
  assert.equal(c.first, true);
  assert.deepEqual(C.prizeOf(c), { money: 1000, trophy: 'fishtrophy' });
  assert.equal(C.contestOf(C.settleContest(s)).wins.fish, 1, '두 번 정리해도 한 번');
  const got = C.claimContestPrize(s);
  assert.ok(got.ok);
  assert.equal(got.money, 1000);
  assert.equal(got.trophy, 'fishtrophy');
  assert.equal(got.state.money, 1000);
  assert.equal(homeOf(got.state).owned.fishtrophy, 1);
  assert.equal(C.claimContestPrize(got.state).reason, 'done');
  // 트로피 가구가 든 저장의 검사는 트로피 가구를 정의하는 Task 3(tests/achieve.test.mjs)에서
  // 다음 낚시 대회에서 또 1등: 트로피는 없다
  let s2 = C.beginContestDay(got.state, 10, 'fish');
  s2 = C.recordRound(s2, { s: 12, t: 10 });
  s2 = C.settleContest(s2);
  assert.equal(C.contestOf(s2).wins.fish, 2);
  assert.deepEqual(C.prizeOf(C.contestOf(s2)), { money: 1000, trophy: null });
  // 4등이면 참가상
  let s3 = C.beginContestDay(fresh(), 3, 'fish');
  s3 = C.recordRound(s3, { s: 1, t: 5 });
  s3 = { ...s3, contest: { ...C.contestOf(s3), npc: { rakko: { s: 9, t: 1 }, usagi: { s: 7, t: 1 }, kurimanju: { s: 5, t: 1 } } } };
  s3 = C.settleContest(s3);
  assert.equal(C.contestOf(s3).rank, 4);
  assert.equal(C.prizeOf(C.contestOf(s3)).money, 150);
  // 2등, 3등
  assert.equal(C.prizeOf({ ...C.contestOf(s3), rank: 2, first: false }).money, 600);
  assert.equal(C.prizeOf({ ...C.contestOf(s3), rank: 3, first: false }).money, 400);
  // 안 했으면 상품 없음
  const s4 = C.settleContest(C.beginContestDay(fresh(), 3, 'fish'));
  assert.equal(C.contestOf(s4).rank, null);
  assert.equal(C.claimContestPrize(s4).reason, 'none');
  assert.equal(C.claimContestPrize(C.recordRound(C.beginContestDay(fresh(), 3, 'fish'), { s: 2, t: 2 })).reason, 'notyet');
});

test('등수: 손님도 넣고, 점수와 가르는 값이 같으면 같은 등수', () => {
  const b = C.rankBoard([{ who: 'me', s: 5, t: 2 }, { who: 'rakko', s: 7, t: 1 }, { who: 'g1', s: 5, t: 2 }, { who: 'usagi', s: 3, t: 9 }]);
  assert.deepEqual(b.map((e) => [e.who, e.rank]), [['rakko', 1], ['me', 2], ['g1', 2], ['usagi', 4]]);
  let s = C.recordRound(C.beginContestDay(fresh(), 3, 'fish'), { s: 5, t: 2 });
  s = C.settleContest(s, [{ who: 'g1', s: 8, t: 1 }]);
  assert.equal(C.contestOf(s).rank, 2);
});

test('친구 기록과 참가 시각은 날짜로 늘 같다', () => {
  for (const k of C.CONTEST_FRIENDS) {
    assert.deepEqual(C.npcRecord(START, 3, 'fish', k, 6), C.npcRecord(START, 3, 'fish', k, 6));
    const h = C.npcJoinHour(START, 3, k);
    assert.ok(h >= C.OPEN_HOUR && h < C.NPC_LAST_START, `${k} ${h}`);
    assert.equal(h, C.npcJoinHour(START, 3, k));
  }
  assert.notDeepEqual(C.CONTEST_FRIENDS.map((k) => C.npcJoinHour(START, 3, k)), C.CONTEST_FRIENDS.map((k) => C.npcJoinHour(START, 10, k)));
});

test('손님 점수 확인', () => {
  assert.ok(C.guestScoreOk('fish', 12, 44));
  assert.ok(C.guestScoreOk('weed', 20, 8));
  for (const [k, s, t] of [['fish', 41, 10], ['weed', 121, 10], ['fish', 2.5, 10], ['fish', -1, 0], ['fish', '9', 1], ['weed', 10, 6], ['ramen', 3, 1], ['fish', 3, -1], ['fish', 3, Infinity]]) {
    assert.ok(!C.guestScoreOk(k, s, t), `${k} ${s} ${t}`);
  }
});

test('저장 정리: 예전 저장, 깨진 값, 모르는 칸', () => {
  const s = fresh();
  assert.ok(isValidState(s));
  const bad = { ...s, contest: { day: 3.5, kind: 'ramen', npc: { rakko: { s: 3, t: 1 }, goblin: { s: 1, t: 0 } }, round: { s: 5 }, wins: { fish: -1 } } };
  assert.ok(isValidState(bad));
  const c = C.cleanContest(bad.contest);
  assert.equal(c.kind, null);
  assert.equal(c.day, 0);
  assert.ok(!('round' in c));
  assert.ok(!('goblin' in c.npc));
  assert.deepEqual(c.npc.rakko, { s: 3, t: 1 });
  assert.equal(c.wins.fish, 0);
  assert.equal(C.cleanContest(undefined), undefined);
  assert.equal(C.cleanContest('x'), undefined);
  // 불러오면 정리된 값으로
  const back = deserialize(serialize(bad));
  assert.ok(back.ok);
  assert.ok(!('round' in back.state.contest));
  assert.equal(back.state.contest.kind, null);
});

test('현수막 글: 막대 과자 데이가 먼저', () => {
  const at = (day, hour) => ({ ...fresh(), startDate: START, clock: { day, t: (hour - 6) / 24 } });
  assert.equal(C.bannerText(at(42, 12)), '막대 과자 데이');
  assert.equal(C.bannerText(at(3, 12)), '마을 낚시 대회');
  assert.equal(C.bannerText(at(7, 23)), '마을 풀 뽑기 시합');
  assert.equal(C.bannerText(at(4, 12)), null);
});
