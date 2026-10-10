import test from 'node:test';
import assert from 'node:assert/strict';
import { createObstacleIndex, slideMove } from '../src/core/obstacles.js';

const R = 0.35;
function world(...items) {
  const ix = createObstacleIndex(4);
  ix.push(...items);
  const isFree = (x, z, r) => !ix.hits(x, z, r);
  const move = (ox, oz, nx, nz) => slideMove(isFree, ix.pushOut, ox, oz, nx, nz, R);
  /** dir 방향으로 n 걸음(한 걸음 step). */
  const walk = (p, dir, n = 60, step = 0.08) => {
    let q = { ...p };
    for (let i = 0; i < n; i++) q = move(q.x, q.z, q.x + dir[0] * step, q.z + dir[1] * step);
    return q;
  };
  return { ix, isFree, move, walk };
}

test('가로등에 살짝 걸치면 둘레를 따라 지나간다', () => {
  const w = world({ x: 0, z: 0, r: 0.22 });
  // 가로등 가운데에서 0.25 비켜서 +x 로 걸어간다(예전엔 축마다 따로 막혀서 멈췄다)
  const end = w.walk({ x: -2, z: 0.25 }, [1, 0]);
  assert.ok(end.x > 1.5, `지나가야 한다: ${end.x}`);
  assert.ok(w.isFree(end.x, end.z, R));
});

test('정면으로 들이받으면 멈춘다(뚫고 가지 않는다)', () => {
  const w = world({ x: 0, z: 0, r: 0.22 });
  const end = w.walk({ x: -2, z: 0 }, [1, 0]);
  assert.ok(end.x < 0, `넘어가면 안 된다: ${end.x}`);
  assert.ok(w.isFree(end.x, end.z, R));
});

test('비스듬히 벽에 대고 걸으면 벽을 따라 미끄러진다(돌아간 네모 벽)', () => {
  const w = world({ x: 0, z: 0, box: { hx: 2, hz: 1, yaw: 0.06 } });
  // 벽 앞(남쪽)에서 북동쪽으로 → 벽에 닿은 뒤 동쪽으로 계속 간다
  const end = w.walk({ x: -1.5, z: 1.6 }, [Math.SQRT1_2, -Math.SQRT1_2], 60);
  assert.ok(end.x > 1.2, `벽을 따라 동쪽으로 가야 한다: ${end.x}`);
  assert.ok(w.isFree(end.x, end.z, R));
});

test('네모 벽은 보이는 벽 가까이까지 다가갈 수 있다(큰 원처럼 멀리서 막지 않는다)', () => {
  const w = world({ x: 0, z: 0, box: { hx: 1.2, hz: 0.85, yaw: 0 } });
  // 앞면(z = 0.85) + 몸 반지름 0.35 = 1.2 근처까지
  const end = w.walk({ x: 0.2, z: 3 }, [0, -1], 60);
  assert.ok(end.z < 1.25 && end.z > 1.19, `벽 바로 앞에 서야 한다: ${end.z}`);
  // 모서리(1.2, 0.85) 쪽 대각선 바깥은 비어 있다(예전 원 r=1.72 이면 막혔던 자리)
  assert.ok(w.isFree(1.5, 1.15, R));
});

test('건물 모서리를 스치며 지나간다', () => {
  const w = world({ x: 0, z: 0, box: { hx: 1.2, hz: 0.85, yaw: 0 } });
  // 모서리에 0.1 겹치는 줄로 북쪽 → 모서리를 비켜 지나가야 한다
  const end = w.walk({ x: 1.45, z: 3 }, [0, -1], 90);
  assert.ok(end.z < -1.5, `지나가야 한다: ${end.z}`);
});

test('나무 사이 좁은 틈으로 들어가도 끼지 않는다', () => {
  const w = world({ x: -0.55, z: 0, r: 0.3 }, { x: 0.55, z: 0, r: 0.3 });
  const end = w.walk({ x: 0.05, z: 2 }, [0, -1], 60);
  assert.ok(w.isFree(end.x, end.z, R));
});

test('끼어 있던 자리에서는 바깥으로 빠져나온다', () => {
  const w = world({ x: 0, z: 0, r: 0.5 });
  const p = w.move(0.3, 0, 0.35, 0);
  assert.ok(w.isFree(p.x, p.z, R));
});
