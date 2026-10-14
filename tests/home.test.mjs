import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_SIZES, HOME_CELL, WALLPAPERS, FLOORS, createHome, homeOf, sizeOf, gridOf, nextSize, roomLayout, homeCellCenter, expandHome, placeFurniture, moveFurniture, decorOf, hasDecor, useDecor, isValidHome } from '../src/core/home.js';
import { createState } from '../src/core/state.js';
import { isValidState } from '../src/core/save.js';

const owner = (money = 100000) => ({ ...createState({ name: '나', look: {} }), money, housing: { own: true, unpaid: 0, lottery: null } });

test('집 크기: 한 단계씩 넓어지고, 방마다 칸 격자가 둥근 방 안에 들어간다', () => {
  for (let i = 1; i < HOME_SIZES.length; i++) {
    const a = HOME_SIZES[i - 1], b = HOME_SIZES[i];
    assert.ok(b.cols * b.rows > a.cols * a.rows && b.price > a.price && b.roomR > a.roomR, b.name);
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
  let s = owner(100000);
  assert.equal(sizeOf(homeOf(s)), 0);
  let r = expandHome(s);
  assert.ok(r.ok);
  s = r.state;
  assert.equal(s.money, 100000 - HOME_SIZES[1].price);
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
