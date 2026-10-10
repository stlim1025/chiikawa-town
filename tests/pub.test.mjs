import assert from 'node:assert/strict';
import { test } from 'node:test';
const G = '../src/core/';
const Sh = await import(G + 'shop.js');
const F = await import(G + 'friends.js');
const Q = await import(G + 'quests.js');
const St = await import(G + 'state.js');
const I = await import(G + 'inventory.js');
const L = await import(G + 'layout.js');
const S = await import(G + 'save.js');

const fresh = () => ({ ...St.createState({ name: 't', look: {} }), money: 5000, stamina: 40, player: { x: 0, z: 0 } });
const licensed = (s) => ({ ...s, licenses: { ...(s.licenses || {}), liquor: { day: 1 } } });

test('pub: beer needs liquor license, edamame does not', () => {
  let s = fresh();
  assert.equal(Sh.buy(s, 'pub', 'beer').reason, 'license');
  const e = Sh.buy(s, 'pub', 'edamame');
  assert.ok(e.ok); assert.equal(e.state.money, 4950); assert.equal(e.state.stamina, 52);
  const b = Sh.buy(licensed(s), 'pub', 'beer');
  assert.ok(b.ok); assert.equal(b.state.money, 4900); assert.equal(b.state.stamina, 75);
  assert.ok(Sh.isPubHour(17) && Sh.isPubHour(20.9) && !Sh.isPubHour(21) && !Sh.isPubHour(12));
});
test('drink friendship: +2 once a day, separate from play', () => {
  let s = fresh();
  let r = F.befriend(s, 'kurimanju', 'drink', 3);
  assert.equal(r.gained, 2); s = r.state;
  assert.equal(F.friendOf(s, 'kurimanju').drink, 3);
  assert.equal(F.befriend(s, 'kurimanju', 'drink', 3).gained, 0, 'once per day');
  r = F.befriend(s, 'kurimanju', 'play', 3);
  assert.equal(r.gained, 0, '같은 날에는 하루 상한(2점)에 걸린다'); s = r.state;
  assert.equal(F.befriend(s, 'kurimanju', 'play', 4).gained, 2, '다음 날 놀기는 다시 오른다');
  assert.equal(F.befriend(s, 'kurimanju', 'drink', 4).gained, 2);
  assert.ok(F.isValidFriends(s.friends));
  assert.equal(F.isValidFriends({ kurimanju: { pts: 1, talk: 0, play: 0, gift: false, drink: 'x' } }), false);
});
test('cheers quest: needs license and 2 hearts, bring berries then evening pub visit', () => {
  assert.deepEqual(Q.checkQuestData(), []);
  let s = { ...fresh(), friends: { kurimanju: { pts: 6, talk: 0, play: 0, gift: false } } };
  assert.equal(Q.canOffer(s, 'cheers'), false, 'no license yet');
  s = licensed(s);
  assert.equal(Q.canOffer(s, 'cheers'), true);
  s = Q.startQuest(s, 'cheers');
  s = I.addItem(s, 'berry', 5).state;
  assert.ok(Q.stepReady(s, 'cheers'));
  let r = Q.completeStep(s, 'cheers', 2); s = r.state;
  assert.equal(I.countOf(s, 'berry'), 0);
  const step = Q.stepOf(s, 'cheers');
  assert.equal(step.type, 'visit');
  const pub = L.doorSpot(L.lotById('pub'));
  assert.equal(Q.arrived(step, pub, pub.x, pub.z, 12), false, 'not at noon');
  assert.equal(Q.arrived(step, pub, pub.x, pub.z, 18), true, 'evening');
  assert.equal(Q.arrived(step, pub, pub.x + 10, pub.z, 18), false, 'too far');
  r = Q.completeStep(s, 'cheers', 2);
  assert.ok(r.finished);
  assert.equal(I.countOf(r.state, 'bottlebeer'), 3);
  assert.ok(S.deserialize(S.serialize(r.state)).ok);
});
test('pub lot does not overlap other lots', () => {
  const pub = L.lotById('pub');
  for (const l of L.LOTS) if (l !== pub) assert.ok(Math.hypot(l.x - pub.x, l.z - pub.z) > L.lotRadius(l) + L.lotRadius(pub) + 1, l.id);
  assert.ok(Math.hypot(pub.x, pub.z) < L.VILLAGE_R - 3);
});
