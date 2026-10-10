import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Gr = await import(G + 'ground.js');
const C = await import(G + 'combat.js');
const I = await import(G + 'inventory.js');
const S = await import(G + 'save.js');
const St = await import(G + 'state.js');

const fresh = () => ({ ...St.createState({ name: 't', look: {} }), money: 5000, player: { x: 0, z: 0 } });

test('drop items to the ground and pick them back up', () => {
  let s = fresh();
  s = I.addItem(s, 'berry', 5).state;
  s = I.addItem(s, 'fluffdown', 3, 2).state;
  let r = Gr.dropItem(s, 'berry', 2, 1, 2);
  assert.ok(r.ok); s = r.state;
  assert.equal(I.countOf(s, 'berry'), 3);
  assert.equal(Gr.groundOf(s).length, 1);
  assert.deepEqual(Gr.groundOf(s)[0], { g: 1, id: 'berry', n: 2, clean: 0, x: 1, z: 2 });
  r = Gr.dropItem(s, 'fluffdown', 9, 3, 4); // 가진 것보다 많이 → 가진 만큼
  assert.ok(r.ok); assert.equal(r.n, 3); s = r.state;
  assert.equal(I.countOf(s, 'fluffdown'), 0);
  assert.equal(Gr.groundOf(s)[1].clean, 2);
  assert.equal(Gr.groundOf(s)[1].g, 2);
  assert.equal(Gr.dropItem(s, 'horn', 1, 0, 0).reason, 'none');
  assert.ok(Gr.isValidGround(Gr.groundOf(s)));
  r = Gr.pickUp(s, 2);
  assert.ok(r.ok); assert.equal(r.n, 3); assert.equal(r.left, 0); s = r.state;
  assert.equal(I.countOf(s, 'fluffdown'), 3);
  assert.equal(I.bagOf(s).clean.fluffdown, 2, 'clean count travels with the item');
  assert.equal(Gr.groundOf(s).length, 1);
  assert.equal(Gr.pickUp(s, 2).reason, 'gone');
  assert.equal(Gr.groundName(Gr.groundOf(s)[0]), '빨간 열매');
});
test('pick up only what fits in the bag', () => {
  let s = fresh();
  s = I.addItem(s, 'berry', 10).state;
  s = Gr.dropItem(s, 'berry', 10, 0, 0).state;
  s = I.addItem(s, 'berry', 95).state;
  let r = Gr.pickUp(s, 1);
  assert.ok(r.ok); assert.equal(r.n, 4); assert.equal(r.left, 6); s = r.state;
  assert.equal(I.countOf(s, 'berry'), 99);
  assert.equal(Gr.groundOf(s)[0].n, 6);
  assert.equal(Gr.pickUp(s, 1).reason, 'full');
});
test('drop and pick up weapons', () => {
  let s = fresh();
  s = C.buyWeapon(s, 'fork').state;
  s = C.buyWeapon(s, 'sword').state; // 목검을 든다
  let r = Gr.dropWeapon(s, 'sword', 0, 0);
  assert.ok(r.ok); s = r.state;
  assert.deepEqual(C.weaponOf(s).owned, ['fork']);
  assert.equal(C.heldWeapon(s), null, 'dropping the held weapon empties the hand');
  assert.equal(Gr.groundName(Gr.groundOf(s)[0]), '목검');
  assert.equal(Gr.dropWeapon(s, 'star', 0, 0).reason, 'none');
  r = Gr.pickUp(s, 1);
  assert.ok(r.ok); s = r.state;
  assert.deepEqual(C.weaponOf(s).owned, ['fork', 'sword']);
  assert.equal(C.heldWeapon(s), 'sword');
  // 같은 무기를 또 주우면(가게에서 다시 샀다면) 값의 1/4 을 돌려받는다
  s = Gr.dropWeapon(s, 'fork', 0, 0).state;
  s = C.buyWeapon(s, 'fork').state;
  const money = s.money;
  r = Gr.pickUp(s, Gr.groundOf(s)[0].g);
  assert.ok(r.ok); assert.equal(r.refund, 50);
  assert.equal(r.state.money, money + 50);
  assert.equal(Gr.groundOf(r.state).length, 0);
});
test('ground is capped and saved', () => {
  let s = fresh();
  s = I.addItem(s, 'berry', 60).state;
  for (let i = 0; i < Gr.MAX_GROUND; i++) s = Gr.dropItem(s, 'berry', 1, i, 0).state;
  assert.equal(Gr.groundOf(s).length, Gr.MAX_GROUND);
  assert.equal(Gr.dropItem(s, 'berry', 1, 0, 0).reason, 'full');
  const back = S.deserialize(S.serialize(s));
  assert.ok(back.ok, 'save with ground loads'); assert.equal(back.state.ground.length, Gr.MAX_GROUND);
  assert.equal(Gr.isValidGround([{ g: 1, id: 'sword', n: 1, x: 0, z: 0, weapon: true }]), true);
  assert.equal(Gr.isValidGround([{ g: 1, id: 'laser', n: 1, x: 0, z: 0, weapon: true }]), false);
  assert.equal(Gr.isValidGround([{ g: 1, id: 'berry', n: 0, x: 0, z: 0 }]), false);
  assert.equal(Gr.isValidGround('x'), false);
});
