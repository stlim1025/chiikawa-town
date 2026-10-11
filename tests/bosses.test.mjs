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
