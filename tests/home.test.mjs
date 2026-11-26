import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_SIZES, HOME_CELL, WALLPAPERS, FLOORS, FURNITURE, createHome, homeOf, sizeOf, gridOf, nextSize, roomLayout, roomShape, homeCellCenter, expandHome, placeFurniture, moveFurniture, removeFurniture, rotateFurniture, decorOf, hasDecor, useDecor, isValidHome, isMat, MAT_SIZES, footprint, cellsOf, stackAt, resizeMat } from '../src/core/home.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';

const owner = (money = 100000) => ({ ...createState({ name: '나', look: {} }), money, housing: { own: true, unpaid: 0, lottery: null } });

test('집 크기: 한 단계씩 넓어지고, 방마다 칸 격자가 둥근 방 안에 들어간다', () => {
  for (let i = 1; i < HOME_SIZES.length; i++) {
    const a = HOME_SIZES[i - 1], b = HOME_SIZES[i];
    assert.ok(b.cols * b.rows > a.cols * a.rows && b.price > a.price && b.roomR > a.roomR && b.friendPrice > a.friendPrice && b.friendPrice < b.price, b.name); // 친구가 넓히는 값은 내 값보다 싸다
  }
  HOME_SIZES.forEach((G, size) => {
    const r = roomLayout(size), back = r.Z0, front = r.Z0 + r.rows * HOME_CELL;
    for (const [x, z] of [[r.X0, back], [-r.X0, back], [r.X0, front], [-r.X0, front]]) assert.ok(Math.hypot(x, z) < r.R - 0.35, `${G.name} 모서리 (${x}, ${z})`);
    assert.ok(r.DOOR.z > front + 1, `${G.name}: 문간은 칸 앞에 비어 있다`);
    for (const p of [r.WARDROBE, r.CHEST, r.DOOR]) assert.ok(Math.hypot(p.x, p.z) < r.R - 0.4, `${G.name}: 옷장 · 상자 · 문간은 방 안`);
    const c = homeCellCenter(size, G.cols - 1, G.rows - 1);
    assert.ok(Math.abs(c.x - (-r.X0 - HOME_CELL / 2)) < 1e-9, '마지막 칸 가운데');
  });
});

test('집 넓히기: 내 집이어야 하고, 돈을 내고 한 단계씩, 가장 크면 끝', () => {
  const renter = { ...owner(), housing: { own: false, unpaid: 0, lottery: null } };
  assert.equal(expandHome(renter).reason, 'own');
  assert.equal(expandHome(owner(HOME_SIZES[1].price - 1)).reason, 'money');
  const total = HOME_SIZES[1].price + HOME_SIZES[2].price;
  let s = owner(total);
  assert.equal(sizeOf(homeOf(s)), 0);
  let r = expandHome(s);
  assert.ok(r.ok);
  s = r.state;
  assert.equal(s.money, total - HOME_SIZES[1].price);
  assert.equal(gridOf(homeOf(s)).name, '넓은 방');
  assert.deepEqual(homeOf(s).placed, createHome().placed, '가구는 그대로');
  r = expandHome(s);
  s = r.state;
  assert.equal(sizeOf(homeOf(s)), 2);
  assert.equal(nextSize(homeOf(s)), null);
  assert.equal(expandHome(s).reason, 'max');
  assert.ok(isValidHome(homeOf(s)) && isValidState(s));
});

test('집 넓히기: 넓힌 방에서는 늘어난 칸에도 가구를 놓고 옮긴다', () => {
  const small = { ...createHome(), owned: { bed: 1, plant: 1 } };
  assert.equal(placeFurniture(small, 'plant', 5, 0).reason, 'outside');
  assert.equal(placeFurniture(small, 'plant', 0, 4).reason, 'outside');
  const big = { ...small, size: 1 };
  const placed = placeFurniture(big, 'plant', 5, 4);
  assert.ok(placed.ok);
  assert.equal(placeFurniture(big, 'plant', 6, 0).reason, 'outside');
  assert.ok(moveFurniture(placed.home, { cx: 5, cz: 4 }, { cx: 0, cz: 4 }).ok);
  assert.equal(moveFurniture(small, { cx: 2, cz: 0 }, { cx: 5, cz: 0 }).reason, 'outside');
});

test('벽지 · 바닥: 처음 것은 늘 있고, 사면 붙고, 가진 것은 공짜로 바꿔 붙인다', () => {
  let s = owner(1000);
  const home0 = homeOf(s);
  assert.deepEqual(decorOf(home0), { wall: 'cream', floor: 'wood' });
  assert.ok(hasDecor(home0, 'wall', 'cream') && hasDecor(home0, 'floor', 'wood') && !hasDecor(home0, 'wall', 'pink'));
  let r = useDecor(s, 'wall', 'pink');
  assert.ok(r.ok && r.bought);
  s = r.state;
  assert.equal(s.money, 1000 - WALLPAPERS.pink.price);
  assert.equal(decorOf(homeOf(s)).wall, 'pink');
  assert.equal(useDecor(s, 'floor', 'dark').reason, 'money', '남은 200원으로는 못 산다');
  r = useDecor(s, 'wall', 'cream');
  assert.ok(r.ok && !r.bought && r.state.money === s.money);
  s = r.state;
  r = useDecor(s, 'wall', 'pink');
  assert.ok(r.ok && !r.bought && r.state.money === s.money, '다시 붙일 때는 공짜');
  assert.equal(useDecor(s, 'wall', 'nope').reason, 'none');
  assert.equal(useDecor(s, 'roof', 'pink').reason, 'none');
  assert.ok(isValidHome(homeOf(r.state)) && isValidState(r.state));
  for (const T of [WALLPAPERS, FLOORS]) for (const D of Object.values(T)) assert.ok(/^#[0-9a-f]{6}$/i.test(D.color) && !D.name.includes('·'));
});

test('집 저장 확인: 크기 · 벽지 · 바닥이 맞아야 한다', () => {
  const h = createHome();
  assert.ok(isValidHome({ ...h, size: 2, wall: 'mint', floor: 'tile', walls: ['mint'], floors: ['tile'] }));
  assert.equal(isValidHome({ ...h, size: 3 }), false);
  assert.equal(isValidHome({ ...h, size: 1.5 }), false);
  assert.equal(isValidHome({ ...h, wall: 'gold' }), false);
  assert.equal(isValidHome({ ...h, floor: '__proto__' }), false);
  assert.equal(isValidHome({ ...h, walls: 'pink' }), false);
  assert.equal(isValidHome({ ...h, floors: ['nope'] }), false);
});

test('집 안 모양: 처음 방은 둥근 돔, 넓힌 방은 네모난 집(큰 방은 화려한 집)이고, 칸 · 옷장 · 상자 · 문간이 다 방 안에 든다', () => {
  assert.equal(roomShape(0).kind, 'round');
  assert.equal(roomShape(1).kind, 'rect');
  assert.ok(!roomShape(1).fancy && roomShape(2).fancy, '큰 방만 화려한 집');
  for (let size = 1; size < HOME_SIZES.length; size++) {
    const r = roomLayout(size), b = roomShape(size), walk = (x, z) => Math.abs(x) <= b.hx - 0.45 && z >= b.z0 + 0.5 && z <= b.z1 - 0.12;
    for (const [cx, cz] of [[0, 0], [r.cols - 1, 0], [0, r.rows - 1], [r.cols - 1, r.rows - 1]]) {
      const c = homeCellCenter(size, cx, cz);
      assert.ok(walk(c.x, c.z), `칸 ${size}:${cx},${cz}`);
    }
    assert.ok(walk(r.DOOR.x, r.DOOR.z - 0.5), '문간에 들어서 설 수 있다');
    assert.ok(r.DOOR.z <= b.z1 - 0.12 + 0.9, '문에 손이 닿는다');
    for (const p of [r.WARDROBE, r.CHEST]) assert.ok(Math.abs(p.x) < b.hx && Math.abs(p.x) > b.hx - 0.7, `벽에 붙은 옷장 · 상자 ${size}`);
    if (size > 1) assert.ok(b.hx > roomShape(size - 1).hx && b.z0 < roomShape(size - 1).z0, '클수록 넓다');
  }
});

// 깔개(러그): 가구 밑에 깔고, 크기를 키운다
const rugHome = (owned = { rug: 2, squarerug: 1, table: 2 }) => ({ owned, placed: [] }); // 처음 방 5×4
const put = (home, id, cx, cz) => { const r = placeFurniture(home, id, cx, cz); assert.ok(r.ok, `${id} ${cx},${cz}: ${r.reason}`); return r.home; };
const spot = (p) => [p.cx, p.cz];

test('깔개: 러그 두 가지만 깔개이고, 깐 칸에 가구를 하나 더 올리거나 가구 밑으로 깐다', () => {
  assert.deepEqual(Object.keys(FURNITURE).filter(isMat), ['rug', 'squarerug']);
  let h = put(put(rugHome(), 'rug', 1, 1), 'table', 1, 1);
  assert.equal(placeFurniture(h, 'table', 1, 1).reason, 'taken', '가구는 칸마다 하나');
  assert.equal(placeFurniture(h, 'rug', 1, 1).reason, 'taken', '같은 칸에서 시작하는 깔개는 하나');
  h = put(put(rugHome({ rug: 1, table: 1 }), 'table', 2, 2), 'rug', 2, 2);
  assert.equal(h.placed.length, 2);
  assert.ok(isValidHome(h));
});

test('깔개 크기: 한 칸, 2×2, 3×2로 커졌다가 다시 작아진다', () => {
  assert.deepEqual(MAT_SIZES, [[1, 1], [2, 2], [3, 2]]);
  let h = put(rugHome(), 'squarerug', 0, 0);
  const grow = (step) => { const r = resizeMat(h, 0, 0, step); assert.ok(r.ok, r.reason); h = r.home; return footprint(h.placed[0]); };
  assert.deepEqual(footprint(h.placed[0]), { w: 1, d: 1 });
  assert.deepEqual(grow(1), { w: 2, d: 2 });
  assert.deepEqual(grow(1), { w: 3, d: 2 });
  assert.equal(resizeMat(h, 0, 0, 1).reason, 'max');
  assert.deepEqual(grow(-1), { w: 2, d: 2 });
  assert.deepEqual(grow(-1), { w: 1, d: 1 });
  assert.equal(resizeMat(h, 0, 0, -1).reason, 'min');
  assert.equal(resizeMat(h, 3, 3, 1).reason, 'none');
  assert.deepEqual(footprint({ id: 'table', cx: 0, cz: 0, rot: 1, sz: 2 }), { w: 1, d: 1 }, '가구는 늘 한 칸');
  assert.ok(isValidHome(h));
});

test('깔개 크기: 벽 쪽에서 키우면 방 안으로 밀려 들어오고, 덮는 칸은 늘 방 안이다', () => {
  let r = resizeMat(put(rugHome(), 'rug', 4, 3), 4, 3, 1); // 5×4 방의 맨 끝 칸
  assert.ok(r.ok);
  assert.deepEqual(spot(r.home.placed[0]), [3, 2]);
  r = resizeMat(r.home, 3, 2, 1);
  assert.deepEqual(spot(r.home.placed[0]), [2, 2]);
  assert.deepEqual(cellsOf(r.home.placed[0]).map((c) => `${c.cx},${c.cz}`), ['2,2', '3,2', '4,2', '2,3', '3,3', '4,3']);
});

test('깔개 크기: 밀려 들어갈 칸에서 다른 깔개가 시작하면 못 키운다', () => {
  const h = put(put(rugHome(), 'rug', 3, 2), 'squarerug', 4, 3);
  assert.equal(resizeMat(h, 4, 3, 1).reason, 'taken');
  assert.ok(resizeMat(h, 3, 2, 1).ok, '덮기만 하는 건 괜찮다(작은 깔개 위에 큰 깔개)');
});

test('깔개 돌리기: 3×2 깔개를 돌리면 2×3이 되고, 방 밖으로 나가지 않게 당겨진다', () => {
  let h = put(rugHome(), 'squarerug', 2, 2);
  h = resizeMat(resizeMat(h, 2, 2, 1).home, 2, 2, 1).home;
  assert.deepEqual(spot(h.placed[0]), [2, 2]);
  h = rotateFurniture(h, 2, 2, true);
  const p = h.placed[0];
  assert.deepEqual(footprint(p), { w: 2, d: 3 });
  assert.deepEqual(spot(p), [2, 1]);
  assert.ok(cellsOf(p).every((c) => c.cx < 5 && c.cz < 4));
});

test('한 칸에 가구와 깔개가 있으면 넣어 두기, 돌리기, 옮기기는 고른 쪽만 한다', () => {
  const h = put(put(rugHome(), 'rug', 1, 1), 'table', 1, 1);
  assert.deepEqual(removeFurniture(h, 1, 1).placed.map((p) => p.id), ['rug'], '가구 쪽');
  assert.deepEqual(removeFurniture(h, 1, 1, true).placed.map((p) => p.id), ['table'], '깔개 쪽');
  const turned = rotateFurniture(h, 1, 1, true);
  assert.deepEqual(turned.placed.map((p) => p.rot), [1, 0]);
  const m = moveFurniture(h, { cx: 1, cz: 1, mat: true }, { cx: 3, cz: 0 });
  assert.ok(m.ok);
  assert.deepEqual(m.home.placed.map((p) => [p.id, p.cx, p.cz]), [['rug', 3, 0], ['table', 1, 1]]);
  assert.ok(moveFurniture(m.home, { cx: 1, cz: 1 }, { cx: 3, cz: 0 }).ok, '가구를 깔개 위로 옮긴다');
});

test('큰 깔개 옮기기: 벽 너머로 끌면 방 안으로 당기고, 방 밖에 놓으면 안 된다', () => {
  let h = resizeMat(put(rugHome(), 'squarerug', 0, 0), 0, 0, 1).home; // 2×2
  const r = moveFurniture(h, { cx: 0, cz: 0, mat: true }, { cx: 4, cz: 3 });
  assert.ok(r.ok);
  assert.deepEqual(spot(r.home.placed[0]), [3, 2]);
  assert.equal(moveFurniture(h, { cx: 0, cz: 0, mat: true }, null).reason, 'outside');
  assert.equal(moveFurniture(h, { cx: 0, cz: 0 }, { cx: 1, cz: 1 }).reason, 'none', '그 칸에 가구는 없다');
  assert.equal(moveFurniture(h, { cx: 0, cz: 0, mat: true }, { cx: -1, cz: 0 }).reason, 'same', '당기면 제자리');
  h = put(h, 'rug', 3, 2);
  assert.equal(moveFurniture(h, { cx: 0, cz: 0, mat: true }, { cx: 3, cz: 2 }).reason, 'taken');
});

test('한 칸에 겹친 것들: 가구가 맨 위, 그다음 나중에 깐 깔개부터', () => {
  let h = resizeMat(put(rugHome(), 'squarerug', 0, 0), 0, 0, 1).home; // (0,0) ~ (1,1)
  h = put(put(h, 'rug', 1, 1), 'table', 1, 1);
  assert.deepEqual(stackAt(h, 1, 1).map((p) => p.id), ['table', 'rug', 'squarerug']);
  assert.deepEqual(stackAt(h, 0, 1).map((p) => p.id), ['squarerug']);
  assert.deepEqual(stackAt(h, 2, 2), []);
});

test('집 저장 확인: 깔개 크기 번호는 없거나 MAT_SIZES 안', () => {
  const h = { owned: { rug: 1 }, placed: [{ id: 'rug', cx: 0, cz: 0, rot: 0 }] };
  assert.ok(isValidHome(h), '예전 저장(크기 없음)');
  assert.ok(isValidHome({ ...h, placed: [{ ...h.placed[0], sz: 2 }] }));
  for (const sz of [3, -1, 1.5, '1']) assert.equal(isValidHome({ ...h, placed: [{ ...h.placed[0], sz }] }), false, String(sz));
});

test('깔개 돌리기: 돌리면 다른 깔개가 시작하는 칸으로 당겨질 때는 그대로 둔다(같은 집을 돌려준다)', () => {
  let h = put(rugHome(), 'squarerug', 2, 2);
  h = resizeMat(resizeMat(h, 2, 2, 1).home, 2, 2, 1).home; // 3×2: (2,2) ~ (4,3)
  h = put(h, 'rug', 2, 1);
  assert.equal(rotateFurniture(h, 2, 2, true), h);
});
