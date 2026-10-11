import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerf, lodHide, SAVE_FPS, COVERED_FPS, OUTLINE_FAR, LOD_SLACK } from '../src/render/perf.js';

/** 화면 새로 고침(ms 간격)을 seconds 초 동안 흘려 게임이 몇 번 돌았는지. */
function ticks(perf, hz, seconds) {
  let n = 0;
  for (let i = 0; i < hz * seconds; i++) if (perf.due((i * 1000) / hz)) n++;
  return n;
}

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('절전 모드는 60Hz · 120Hz 화면에서도 초당 30번만 돈다', () => {
  assert.equal(ticks(createPerf({ coarse: true }), 60, 2), SAVE_FPS * 2);
  assert.equal(ticks(createPerf({ coarse: true }), 120, 2), SAVE_FPS * 2);
});

test('절전을 끄면 화면이 새로 고칠 때마다 돈다', () => {
  const perf = createPerf({ coarse: false });
  assert.equal(perf.powerSave, false);
  assert.equal(ticks(perf, 60, 1), 60);
});

test('휴대폰(손가락)은 절전이 기본, 고른 값은 저장해 다음에도 쓴다', () => {
  const store = memStore();
  const a = createPerf({ storage: store, coarse: true });
  assert.equal(a.powerSave, true);
  a.setPowerSave(false);
  assert.equal(createPerf({ storage: store, coarse: true }).powerSave, false);
  assert.equal(createPerf({ storage: store, coarse: false }).powerSave, false);
  a.setPowerSave(true);
  assert.equal(createPerf({ storage: store, coarse: false }).powerSave, true);
});

test('저장소가 막혀 있어도 동작한다', () => {
  const broken = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); } };
  const perf = createPerf({ storage: broken, coarse: true });
  assert.equal(perf.powerSave, true);
  perf.setPowerSave(false);
  assert.equal(perf.powerSave, false);
});

test('버벅임 판단 기준 간격은 절전이면 30fps 한 칸', () => {
  assert.ok(Math.abs(createPerf({ coarse: true }).frameMs - 1000 / 30) < 1e-9);
  assert.ok(Math.abs(createPerf({ coarse: false }).frameMs - 1000 / 60) < 1e-9);
});

test('창이 화면을 덮고 있으면 뒤 3D 는 초당 30번만 그린다, 창을 닫으면 바로 다시 매번', () => {
  assert.equal(COVERED_FPS, 30);
  const perf = createPerf({ coarse: false });
  let drawn = 0;
  for (let i = 0; i < 120; i++) if (perf.drawDue(1 / 60, true)) drawn++; // 60fps 로 2초
  assert.ok(Math.abs(drawn - COVERED_FPS * 2) <= 1, `덮인 동안 ${drawn}번`);
  let open = 0;
  for (let i = 0; i < 30; i++) if (perf.drawDue(1 / 30, false)) open++;
  assert.equal(open, 30);
});

test('먼 외곽선만 감추고, 몸통은 아무리 멀어도 그린다(멀리 선 친구 · 가로등이 사라지지 않게)', () => {
  assert.equal(lodHide({ d: OUTLINE_FAR + 5, outline: true }, false), true);
  assert.equal(lodHide({ d: OUTLINE_FAR - 5, outline: true }, false), false);
  assert.equal(lodHide({ d: 200 }, false), false);
  assert.equal(lodHide({ d: 200 }, true), false);
});

test('경계에서 깜빡이지 않게: 한 번 감춘 것은 조금 더 가까워져야 다시 보인다', () => {
  const at = OUTLINE_FAR + LOD_SLACK / 2;
  assert.equal(lodHide({ d: at, outline: true }, false), false); // 보이던 것은 경계를 넘어도 여유만큼은 그대로
  assert.equal(lodHide({ d: at, outline: true }, true), true); // 감춘 것도 경계 안쪽 여유만큼은 그대로
  assert.equal(lodHide({ d: OUTLINE_FAR - LOD_SLACK * 2, outline: true }, true), false);
});
