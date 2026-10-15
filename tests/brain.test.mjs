import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../src/core/brain.js';

const base = (o = {}) => ({ kind: 'chiikawa', hour: 15, energy: 80, money: 300, fun: 0.3, social: 0.3, diligence: 0.55, appetite: 0.25, jobs: true, hunter: null, friends: [], show: null, player: null, ...o });
const mid = () => 0.5;
const tally = (ctx, n = 400) => { const c = {}; let i = 0; const r = () => ((i++ * 0.6180339) % 1); for (let k = 0; k < n; k++) { const a = B.chooseActivity(ctx, r).act; c[a] = (c[a] || 0) + 1; } return c; };

test('밤엔 자고, 지치면 돈이 있으면 라멘 없으면 낮잠', () => {
  assert.equal(B.chooseActivity(base({ hour: 22 }), mid).act, 'sleep');
  assert.equal(B.chooseActivity(base({ energy: 10 }), mid).act, 'eat');
  assert.equal(B.chooseActivity(base({ energy: 10, money: 10 }), mid).act, 'nap');
});

test('외로우면 좋아하는 친구에게 수다 떨러 간다', () => {
  const r = B.chooseActivity(base({ social: 1, fun: 0.1, jobs: false, friends: [{ kind: 'momonga', dist: 5 }, { kind: 'hachiware', dist: 12 }] }), mid);
  assert.equal(r.act, 'chat');
  assert.equal(r.with, 'hachiware');
});

test('공연이 있으면 심심한 친구들이 구경 간다', () => {
  const r = B.chooseActivity(base({ fun: 0.9, social: 0.2, jobs: false, show: { by: 'hachiware', dist: 10 } }), mid);
  assert.equal(r.act, 'watch');
  // 공연하는 본인은 구경하지 않는다
  assert.notEqual(B.chooseActivity(base({ kind: 'hachiware', fun: 0.9, show: { by: 'hachiware', dist: 0 } }), mid).act, 'watch');
});

test('일과: 랏코는 이른 아침 수련, 하치와레는 오후 공연, 치이카와는 아침에 일', () => {
  const r = tally(base({ kind: 'rakko', hour: 7, fun: 0.5, diligence: 0.45 }));
  assert.ok((r.hobby || 0) > 200, JSON.stringify(r));
  const h = tally(base({ kind: 'hachiware', hour: 15, fun: 0.6, jobs: false }));
  assert.ok((h.hobby || 0) > 200, JSON.stringify(h));
  const c = tally(base({ hour: 9, money: 100, fun: 0.2 }));
  assert.ok((c.work || 0) > 200, JSON.stringify(c));
});

test('하트가 있는 친구는 가끔 나에게 먼저 다가온다(안내 중엔 안 온다)', () => {
  const ctx = base({ kind: 'hachiware', hour: 18, social: 0.9, fun: 0.1, jobs: false, player: { dist: 6, hearts: 4, ready: true } });
  assert.equal(B.chooseActivity(ctx, mid).act, 'greet');
  assert.notEqual(B.chooseActivity({ ...ctx, guiding: true }, mid).act, 'greet');
  assert.notEqual(B.chooseActivity({ ...ctx, player: { dist: 6, hearts: 0, ready: true } }, mid).act, 'greet');
});

test('안내 중이면 일하지 않고, 밤 8시 넘으면 일 · 밥은 안 한다', () => {
  const c = tally(base({ guiding: true, hour: 9 }));
  assert.ok(!c.work, JSON.stringify(c));
  const e = tally(base({ hour: 20.3, energy: 40 }));
  assert.ok(!e.work && !e.eat, JSON.stringify(e));
});

test('라멘: 배부르면(기운 80 이상) 사 먹지 않고, 목표 값을 모으는 중이면 배고플 때만 사 먹는다', () => {
  const t = tally(base({ hour: 12, energy: 90, money: 300, appetite: 0.5, jobs: false, social: 0.9, friends: [{ kind: 'hachiware', dist: 5 }] }));
  assert.ok(!t.eat && !t.mealWith, JSON.stringify(t));
  assert.equal(B.wantsMeal(90, 300, false), false, '배부르면 안 먹는다');
  assert.equal(B.wantsMeal(70, 300, false), true);
  assert.equal(B.wantsMeal(70, 300, true), false, '모으는 중이면 배고프지 않을 때는 아낀다');
  assert.equal(B.wantsMeal(40, 300, true), true, '모으는 중이어도 배고프면 먹는다');
  assert.equal(B.wantsMeal(40, 50, false), false, '돈이 모자라면 못 먹는다');
});

test('욕구는 시간이 지나면 차고, 할 일을 하면 풀린다', () => {
  let m = { fun: 0, social: 0 };
  m = B.growNeeds(m, 'usagi', 60);
  assert.ok(m.fun > 0.7 && m.social > 0.3, JSON.stringify(m));
  m = B.satisfy(m, 'hobby');
  assert.ok(m.fun < 0.1);
  assert.deepEqual(B.satisfy({ fun: 1, social: 1 }, 'nothing'), { fun: 1, social: 1 });
});
