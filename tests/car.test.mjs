import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, buyTool, hasTool, isValidTools, toolsOf } from '../src/core/tools.js';
import { JOB_TYPES, payout } from '../src/core/jobs.js';
import { WEED_KINDS } from '../src/core/weeding.js';
import { PAY_MULT } from '../src/core/license.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';

const fresh = (money) => ({ ...createState({ name: '나', look: {} }), tutorial: 'done', money });

test('하늘색 자동차: 도구점에서 큰돈(3만 원)으로 사고, 사도 등불은 그대로이며 저장에 남는다', () => {
  const T = TOOLS.car;
  assert.equal(T.shop, 'tools');
  assert.equal(T.price, 30000);
  assert.ok(T.ride);
  assert.equal(buyTool(fresh(29999), 'car').reason, 'money', '돈이 모자라면 못 산다');
  const r = buyTool(fresh(30500), 'car');
  assert.ok(r.ok);
  assert.equal(r.state.money, 500);
  assert.ok(hasTool(r.state, 'car'));
  assert.equal(toolsOf(r.state).light, 'off', '탈것은 불처럼 바로 들지 않는다');
  assert.equal(buyTool(r.state, 'car').reason, 'owned', '두 대는 못 산다');
  assert.ok(isValidTools(toolsOf(r.state)));
  assert.ok(isValidState(r.state));
});

test('풀 일감에는 깔끔 보너스가 없다(끊어진 풀은 안 세서 늘 깔끔하다): 보수는 기본 × 급수 배율, 다른 일감 보너스는 그대로', () => {
  const weedJobs = Object.values(JOB_TYPES).filter((t) => WEED_KINDS[t.kind]);
  assert.equal(weedJobs.length, 10);
  for (const t of weedJobs) {
    assert.equal(t.cleanBonus, 0, t.id);
    for (const g of [5, 4, 3, 2, 1]) assert.equal(payout({ typeId: t.id, count: t.target, clean: t.target }, g), Math.round(t.base * PAY_MULT[g]), `${t.id} ${g}급`);
  }
  for (const id of ['sticker10', 'berry6', 'glow5', 'huntFluff']) assert.ok(JOB_TYPES[id].cleanBonus > 0, id);
});
