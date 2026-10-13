import assert from 'node:assert/strict';
import { test } from 'node:test';
const B = await import('../src/core/bosses.js');
const { MONSTERS, MONSTER_ORDER, DROPS, huntQuiz } = await import('../src/core/combat.js');
const Lay = await import('../src/core/layout.js');
const S = await import('../src/core/save.js');
const St = await import('../src/core/state.js');
const H = await import('../src/core/hunters.js');
const V = await import('../src/core/villagetalk.js');

const game = () => ({ ...St.createState({ name: '치이', look: {} }), clock: { day: 5, t: 0.4 } });

test('구역 보스: 동쪽 들판 · 서쪽 숲 · 남쪽 강가에 한 마리씩(북쪽은 이야기 속 왕버섯)', () => {
  assert.deepEqual([...B.LAIR_BOSSES].sort(), ['bigcrab', 'bigmole', 'elder']);
  const regions = B.LAIR_BOSSES.map((k) => MONSTERS[k].region).sort();
  assert.deepEqual(regions, ['fields', 'forest', 'river']);
  for (const k of B.LAIR_BOSSES) {
    const M = MONSTERS[k], L = Lay.BOSS_LAIRS[k];
    assert.ok(M.boss && M.attack === 'boss' && M.hp > 40 && DROPS[M.drop], `${k}: 보스 · 전리품`);
    assert.ok(MONSTER_ORDER.includes(k), `${k}: 도감 순서`);
    assert.equal(Lay.regionAt(L.x, L.z), M.region, `${k}: 자리가 제 구역 안`);
    // 마당 끝까지 같은 구역 · 마을 밖 · 길 · 물에서 떨어져 있다
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = L.x + Math.sin(a) * L.r, z = L.z + Math.cos(a) * L.r;
      assert.equal(Lay.regionAt(x, z), M.region, `${k}: 마당 가장자리도 제 구역`);
    }
    assert.ok(Lay.shoreDist(L.x, L.z) > L.r, `${k}: 마당이 물에 걸치지 않는다`);
    assert.ok(Lay.roadDist(L.x, L.z) > L.r + 1, `${k}: 마당이 길을 막지 않는다`);
    assert.ok(Math.hypot(L.x, L.z) > 60, `${k}: 마을에서 멀리(구역 끝)`);
  }
  assert.equal(MONSTERS.kingcap.region, 'boss');
});

test('보스 마당 넷(구역 보스 셋 + 왕버섯 굴): 서로 · 마을과 떨어져 있고, 입구는 길 쪽', () => {
  assert.deepEqual(Lay.ARENAS.map((A) => A.id).sort(), ['bigcrab', 'bigmole', 'elder', 'kingcap']);
  const wallR = (A) => A.r + Lay.ARENA_WALL + 0.8;
  for (const A of Lay.ARENAS) {
    assert.ok(Math.hypot(A.x, A.z) - wallR(A) > Lay.VILLAGE_R + 10, `${A.id}: 마을에서 멀리`);
    for (const B of Lay.ARENAS) if (A !== B) assert.ok(Math.hypot(A.x - B.x, A.z - B.z) > wallR(A) + wallR(B) + 10, `${A.id} · ${B.id} 떨어져 있다`);
    // 입구 방향 = door 쪽
    const a = Lay.doorAngle(A), want = Math.atan2(A.door.x - A.x, A.door.z - A.z);
    assert.ok(Math.abs(a - want) < 1e-9);
    assert.equal(Lay.arenaAt(A.x, A.z), A, `${A.id}: 가운데는 그 마당`);
    assert.equal(Lay.arenaAt(A.x + A.r + 0.5, A.z), null, `${A.id}: 가장자리 밖은 마당이 아니다`);
  }
  // 협곡: 분지 가장자리에서 door 쪽으로 뻗고, 입구(바깥 끝)는 길 가까이(마을에서 걸어오기 쉽게)
  for (const A of Lay.ARENAS) {
    // 입구 밖으로 흙길(lead)을 이어 깐 마당은 그 흙길 끝이 길 가까이
    const m = Lay.canyonMouth(A), a = Lay.doorAngle(A), mid = A.r + Lay.ARENA_WALL + Lay.canyonLen(A) / 2, e = Lay.canyonMouth(A, A.lead || 0);
    assert.ok(Lay.roadDist(e.x, e.z) < 6, `${A.id}: 협곡 입구(흙길 끝)가 길 가까이(${Lay.roadDist(e.x, e.z).toFixed(1)})`);
    if (A.lead) assert.ok(Lay.onLairLead((m.x + e.x) / 2, (m.z + e.z) / 2), `${A.id}: 입구 밖 흙길`);
    assert.equal(Lay.canyonAt(A.x + Math.sin(a) * mid, A.z + Math.cos(a) * mid), A, `${A.id}: 협곡 가운데`);
    assert.equal(Lay.canyonAt(A.x, A.z), null, `${A.id}: 분지 가운데는 협곡이 아니다`);
    assert.equal(Lay.regionAt(m.x, m.z), Lay.regionAt(A.x, A.z), `${A.id}: 협곡 입구도 같은 구역`);
  }
  const K = Lay.KING_LAIR;
  assert.equal(Lay.regionAt(K.x, K.z), 'mountain', '왕버섯 굴은 바위산');
  const e = Lay.canyonMouth(K, K.lead);
  assert.ok(Lay.roadDist(e.x, e.z) < 1.5, '왕버섯 굴 입구 흙길은 오솔길 끝에서 이어진다');
});

test('두더지 굴밭은 월드 동쪽 끝 너머: 입구만 맵 끝자락, 마당 · 협곡은 걸어 들어갈 수 있다', () => {
  const A = Lay.ARENAS.find((x) => x.id === 'bigmole'), m = Lay.canyonMouth(A);
  assert.ok(A.x - A.r > Lay.WORLD_HALF, '마당은 월드 끝 너머');
  assert.ok(m.x < Lay.WALK_HALF && m.x > Lay.WALK_HALF - 8, `입구는 맵 끝자락(${m.x.toFixed(1)})`);
  assert.ok(Lay.lairReach(A.x, A.z) && Lay.lairReach(Lay.WALK_HALF + 3, A.z), '마당 가운데 · 맵 끝 너머 협곡');
  assert.ok(!Lay.lairReach(Lay.WALK_HALF + 3, A.z + 10), '협곡 옆은 아니다');
});

test('왕버섯 굴은 월드 북쪽 끝 너머: 입구만 맵 끝자락, 마당 · 협곡은 걸어 들어갈 수 있다', () => {
  const K = Lay.ARENAS.find((x) => x.id === 'kingcap'), m = Lay.canyonMouth(K);
  assert.ok(K.z + K.r < -Lay.WORLD_HALF, '마당은 월드 끝 너머');
  assert.ok(m.z > -Lay.WALK_HALF && m.z < -Lay.WALK_HALF + 12, `입구는 맵 끝자락(${m.z.toFixed(1)})`);
  assert.ok(Lay.lairReach(K.x, K.z) && Lay.lairReach(K.x, -Lay.WALK_HALF - 3), '마당 가운데 · 맵 끝 너머 협곡');
  assert.ok(!Lay.lairReach(K.x + 10, -Lay.WALK_HALF - 3), '협곡 옆은 아니다');
});

test('남쪽 보스 자리는 선착장 · 절벽과 겹치지 않는다', () => {
  const L = Lay.BOSS_LAIRS.bigcrab;
  const pier = { x: Lay.PIER.x, z: Lay.SOUTH_SHORE };
  assert.ok(Math.hypot(L.x - pier.x, L.z - pier.z) - L.r > 20, '선착장에서 멀리');
  assert.ok(Math.hypot(L.x - Lay.CLIFF.log.x, L.z - Lay.CLIFF.log.z) - L.r > 12, '절벽 끝 통나무에서 멀리');
  assert.ok(L.z + L.r < Lay.SOUTH_SHORE - 3, '바닷가에 걸치지 않는다');
});

test('처음 마주치면 도감에 드러나고, 쓰러뜨린 날은 없다가 다음 날 다시 나타난다', () => {
  const s0 = game();
  assert.equal(B.bossSeen(s0, 'bigmole'), false);
  assert.equal(B.bossHome(s0, 'bigmole', 5), true);
  const s1 = B.markBossSeen(s0, 'bigmole');
  assert.notEqual(s1, s0, '새 상태');
  assert.equal(s0.bosses, undefined, '원래 상태는 그대로');
  assert.equal(B.bossSeen(s1, 'bigmole'), true);
  assert.equal(B.markBossSeen(s1, 'bigmole'), s1, '이미 봤으면 그대로');
  const s2 = B.markBossDown(s1, 'bigmole', 5);
  assert.equal(B.bossHome(s2, 'bigmole', 5), false, '쓰러뜨린 날은 없다');
  assert.equal(B.bossHome(s2, 'bigmole', 6), true, '다음 날 다시');
  assert.equal(B.bossHome(s2, 'elder', 5), true, '다른 보스는 상관없다');
  assert.equal(B.bossSeen(B.markBossDown(s0, 'elder', 3), 'elder'), true, '바로 쓰러뜨려도 본 것');
  // 왕버섯은 이야기 기록으로 본다
  assert.equal(B.bossSeen({ ...s0, story: { bossSeen: true } }, 'kingcap'), true);
});

test('보스 기록은 저장 검사를 지난다', () => {
  const s = B.markBossDown(B.markBossSeen(game(), 'elder'), 'bigcrab', 4);
  assert.ok(S.deserialize(S.serialize(s)).ok);
  assert.ok(B.isValidBosses({ bigmole: { seen: true } }));
  for (const bad of [[], { kingcap: { seen: true } }, { fluff: {} }, { bigmole: { seen: 'yes' } }, { bigmole: { down: 'x' } }, { bigmole: null }]) {
    assert.equal(B.isValidBosses(bad), false, JSON.stringify(bad));
    assert.equal(S.deserialize(S.serialize({ ...game(), bosses: bad })).ok, false);
  }
});

test('보스 점수 · 소문 · 필기 시험', () => {
  for (const k of B.LAIR_BOSSES) assert.equal(H.killPoints(k), MONSTERS[k].hp + H.BOSS_BONUS);
  assert.equal(V.gossipLine('kurimanju', { type: 'playerBoss', who: 'me', boss: '대왕 두더지' }, '승택'), '하아~ 승택이 대왕 두더지를 쓰러뜨렸대');
  assert.equal(V.praiseLine('hachiware', { type: 'playerBoss', who: 'me', boss: '고목 거인' }, '승택'), '승택! 고목 거인 잡았다며?! 대단해~!');
  // 토벌 필기에는 보스가 나오지 않는다(안내서 세 칸 몬스터만)
  const names = new Set(B.LAIR_BOSSES.map((k) => MONSTERS[k].name));
  for (let i = 0; i < 30; i++) for (const q of huntQuiz(10)) assert.ok(!q.choices.some((c) => names.has(c)), q.q);
});

test('보스 · 전리품 그림과 자리 간판 아이콘', async () => {
  const { monsterSvg, dropSvg } = await import('../src/ui/monsterart.js');
  const { hasSignIcon } = await import('../src/ui/signart.js');
  for (const k of B.LAIR_BOSSES) {
    assert.match(monsterSvg(k), /<path/, `${k} 그림`);
    assert.match(dropSvg(MONSTERS[k].drop), /<path/, `${k} 전리품 그림`);
    assert.ok(hasSignIcon(Lay.BOSS_LAIRS[k].place), `${k} 자리 간판`);
  }
});
