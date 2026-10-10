import test from 'node:test';
import assert from 'node:assert/strict';
import { lampSpots, inDoorLane, LAMP_GAP, LAMP_FRONT_CLEAR, LAMP_CROWD_CLEAR, RAMEN_SEATS, RAMEN_QUEUE, LOTS, ROADS, VILLAGE_R, doorSpot, lotRadius, roadDist, shoreDist, lotById } from '../src/core/layout.js';

// 건물 자리는 막혀 있다고 본다(마을의 장애물 검사 대신)
const isFree = (x, z) => LOTS.every((l) => Math.hypot(l.x - x, l.z - z) > lotRadius(l) + 0.6);
const lamps = lampSpots({ isFree });
const near = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);

test('가로등끼리 붙어 서지 않는다(광장 가운데 둘이 연달아 있던 문제)', () => {
  assert.ok(lamps.length >= 10, `가로등 ${lamps.length}개`);
  for (let i = 0; i < lamps.length; i++) for (let j = i + 1; j < lamps.length; j++) {
    assert.ok(near(lamps[i], lamps[j]) >= LAMP_GAP, `${JSON.stringify(lamps[i])} ↔ ${JSON.stringify(lamps[j])}`);
  }
});

test('가게 · 집 문 앞은 비운다(가구점 앞을 막던 문제)', () => {
  for (const lot of LOTS) {
    const f = doorSpot(lot);
    for (const p of lamps) assert.ok(near(p, f) >= LAMP_FRONT_CLEAR, `${lot.label} 앞에 가로등 ${JSON.stringify(p)}`);
  }
  const furniture = doorSpot(lotById('furniture'));
  assert.ok(lamps.every((p) => near(p, furniture) >= LAMP_FRONT_CLEAR));
});

test('문 앞에서 카메라 쪽으로 다가가는 길에도 서지 않는다(길 건너편이라도 문을 가리지 않게)', () => {
  for (const lot of LOTS) {
    const f = doorSpot(lot);
    for (const p of lamps) assert.ok(!inDoorLane(f, p.x, p.z), `${lot.label} 문 앞 길에 가로등 ${JSON.stringify(p)}`);
  }
  // 예전 자리(가구점 문 바로 남쪽 길 건너편)는 다가가는 길로 친다
  const f = doorSpot(lotById('furniture'));
  assert.ok(inDoorLane(f, f.x + 0.5, f.z + 2.9));
});

test('라멘 로우 손님 의자 · 줄 자리에도 서지 않는다', () => {
  const front = doorSpot(lotById('ramen'));
  for (const [dx, dz] of [...RAMEN_SEATS, ...RAMEN_QUEUE]) {
    for (const p of lamps) assert.ok(near(p, { x: front.x + dx, z: front.z + dz }) >= LAMP_CROWD_CLEAR, `라멘 손님 자리 ${dx},${dz} 옆 ${JSON.stringify(p)}`);
  }
});

test('가로등은 길 위 · 물 · 건물 · 마을 밖에 서지 않는다', () => {
  for (const p of lamps) {
    assert.ok(roadDist(p.x, p.z) > 0.2, `길 위: ${JSON.stringify(p)}`);
    assert.ok(shoreDist(p.x, p.z) > 1.2, `물가: ${JSON.stringify(p)}`);
    assert.ok(isFree(p.x, p.z), `건물: ${JSON.stringify(p)}`);
    assert.ok(Math.hypot(p.x, p.z) <= VILLAGE_R - 2, `마을 밖: ${JSON.stringify(p)}`);
  }
});

test('마을 안 길마다 가로등이 있다(길가를 따라 밝힌다)', () => {
  const villageRoads = ['main-ew', 'main-ns', 'shops', 'homes'];
  for (const id of villageRoads) {
    const road = ROADS.find((r) => r.id === id);
    const along = lamps.filter((p) => road.pts.some((_, k) => k > 0 && distToSeg(p, road.pts[k - 1], road.pts[k]) < road.w / 2 + 1.6));
    assert.ok(along.length >= 2, `${id}: ${along.length}개`);
  }
});

function distToSeg(p, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / L));
  return Math.hypot(p.x - (ax + dx * t), p.z - (az + dz * t));
}

test('간판 명찰: 마을 건물 · 문 간판마다 동그라미 아이콘이 있다', async () => {
  const { hasSignIcon, signHtml } = await import('../src/ui/signart.js');
  const { LOTS } = await import('../src/core/layout.js');
  const keys = [...LOTS.map((l) => l.label), '치이카와 마을', '바다 절벽', '바위산 가는 길', '숲 가는 길', '들판 가는 길'];
  assert.deepEqual(keys.filter((k) => !hasSignIcon(k)), []);
  assert.match(signHtml('빌린 집', '내 집'), /빌린 집/, '글이 바뀌어도 아이콘은 처음 간판 것');
  assert.doesNotMatch(signHtml('<b>'), /<b>/, '글은 그대로 찍지 않는다');
});
