import * as THREE from 'three';
import { PLAZA } from '../core/layout.js';

/**
 * 막대 과자 파티(게임 오리지널): 막대 과자 데이(11월 11일) 저녁 광장에 가면 친구들이 모여 둥글게 앉아 막대 과자를 나눠 먹는다
 * (조건 · 보상은 core/stickday.js · core/events.js, 장식은 world/festival.js).
 *  1) 친구들(STICK_FRIENDS 가운데 마을에 있는 친구)이 광장 둘레에서 걸어와 광장 가운데를 두고 둥글게 앉는다(나는 남쪽 자리)
 *  2) 한마디씩 하며 막대 과자를 나눠 먹는다
 *  3) 컷신: 카메라가 둥글게 앉은 우리를 비스듬히 내려다보고, 막대 과자를 들고 건배 → 색종이가 팡
 *  4) 마무리 대사 → done(온 친구 목록)
 * ctx: housewarm.js 와 같다(npcs, village, guide, input, hud, staged, who, narrator, fill, getPlayer, cam, confetti, sound, summon).
 */
const R = 2.7; // 둥글게 앉는 반지름(광장 가운데 시계탑이 있어도 그 둘레)
const LINES = {
  chiikawa: [['C', '…(초콜릿 쪽부터 오물오물)…']],
  usagi: [['U', '야하! (두 개를 한꺼번에 입에 문다)']],
  kurimanju: [['K', '하아~ 맥주 안주로도 나쁘지 않네.']],
  rakko: [['R', '…초콜릿이 끝까지 묻은 쪽이 좋다.']],
  momonga: [['M', '내 거 더 많이 줘! 흥!']]
};
const SPEAKER = { H: 'hachiware', C: 'chiikawa', U: 'usagi', K: 'kurimanju', R: 'rakko', M: 'momonga' };

export function createStickParty(ctx) {
  const { npcs, village, guide, input, hud, staged } = ctx;
  let S = null; // { kind: 'arrive' | 'talk' | 'toast' | 'outro', t, guests, center, from, done }
  const P = () => ctx.getPlayer();
  const line = ([w, text]) => ({ who: w === 'N' ? ctx.narrator : ctx.who(SPEAKER[w]), text });
  const say = (lines, then) => guide.say(ctx.fill(lines), then, ctx.who('hachiware'));
  const has = (k) => S.guests.includes(k);

  function arrive(guests, done) {
    input.setEnabled(false);
    hud.setAction(null);
    const c = { x: PLAZA.x, z: PLAZA.z };
    // 나는 남쪽(카메라 쪽) 자리, 친구들은 나머지 둘레에 고르게
    const meSpot = village.nearestFree(c.x, c.z + R, 0.3);
    P().setPosition(meSpot.x, meSpot.z);
    P().face(c.x, c.z);
    P().act('sit', 9999);
    const came = [], n = guests.length;
    guests.forEach((k, i) => {
      const a = Math.PI * (0.32 + (1.36 * i) / Math.max(1, n - 1)) + Math.PI / 2; // 남쪽(내 자리) 양옆은 비우고 둘레를 따라
      const to = village.nearestFree(c.x + Math.cos(a) * R, c.z + Math.sin(a) * R, 0.3);
      const from = village.nearestFree(c.x + Math.cos(a) * (R + 5), c.z + Math.sin(a) * (R + 5), 0.4);
      const npc = ctx.summon(k, from.x, from.z);
      if (!npc) return;
      came.push(k);
      npcs.plan(npc, [{ do: 'wait', time: 0.2 + i * 0.35 }, { do: 'walk', x: to.x, z: to.z }, { do: 'act', anim: 'sit', time: 9999, face: c }]);
    });
    S = { kind: 'arrive', t: 0, guests: came, center: c, done };
  }
  const allHere = () => S.guests.every((k) => { const n = npcs.byKind(k); return !n || (n.task && n.task.type === 'act'); });

  function talk() {
    S.kind = 'talk';
    const lines = [line(['H', '{name}~! 막대 과자 데이 파티에 온 거 환영해~!']), line(['H', '다 같이 둘러앉아서 나눠 먹자~']),
      line(['N', '(모두 막대 과자를 하나씩 꺼내 들었다)'])];
    for (const k of ['chiikawa', 'usagi', 'kurimanju', 'rakko', 'momonga']) if (has(k)) lines.push(...LINES[k].map(line));
    lines.push(line(['H', '헤헤, 서로 하나씩 바꿔 먹자~']));
    S.guests.forEach((k) => { const n = npcs.byKind(k); if (n) npcs.act(n, 'nibble', { face: S.center, time: 9999 }); });
    say(lines, toast);
  }
  /** 컷신: 막대 과자를 들고 건배, 색종이. */
  function toast() {
    say([line(['H', '자, 막대 과자 들고~ 건배~!'])], () => {
      if (!S) return;
      const c = S.center;
      Object.assign(S, { kind: 'toast', t: 0, from: ctx.cam.poseFor(P().position.x, P().position.z) });
      S.guests.forEach((k) => { const n = npcs.byKind(k); if (n) npcs.act(n, 'hop', { face: c, time: 9999 }); });
      P().act(null, 0);
      P().cheerTime = 2.8;
      setTimeout(() => { if (S && S.kind === 'toast') { ctx.confetti.burst(c.x, 1.9, c.z, { n: 200, up: 4, spread: 2.8 }); ctx.sound.play('quest'); } }, 1400);
      setTimeout(() => { if (S && S.kind === 'toast') ctx.confetti.burst(c.x + 1.2, 2.1, c.z - 0.6, { n: 110, up: 3.6, spread: 2.2 }); }, 1800);
      setTimeout(() => {
        if (!S || S.kind !== 'toast') return;
        say([line(['N', '(막대 과자를 톡 부딪치자 색종이가 팡 터졌다)'])], outro);
      }, 1700);
    });
  }
  function outro() {
    if (!S) return;
    S.kind = 'outro';
    const lines = [line(['H', '내년 막대 과자 데이에도 꼭 같이 하자~!'])];
    if (has('usagi')) lines.push(line(['U', '우라!']));
    say(lines, () => {
      if (!S) return;
      const { guests, done } = S;
      release();
      S = null;
      input.setEnabled(true);
      done(guests);
    });
  }
  function release() {
    if (!S) return;
    P().act(null, 0);
    S.guests.forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); });
  }

  return {
    get active() { return !!S; },
    get cutscene() { return !!S && S.kind === 'toast'; },
    /** 시작: guests 는 올 친구 목록, done(온 친구) 은 보상. */
    play(guests, done) { if (!S) arrive(guests, done); },
    /** 건배 컷신 카메라(아니면 null): 둥글게 앉은 우리를 남쪽에서 비스듬히 내려다본다. */
    camPose(dt) {
      if (!S || S.kind !== 'toast' || !S.from) return null;
      S.t += dt;
      const k = Math.min(1, S.t / 1.2), e = k * k * (3 - 2 * k), c = S.center;
      const pos = S.from.pos.clone().lerp(new THREE.Vector3(c.x + 2.4, 3.6, c.z + R + 4.6), e);
      const look = S.from.look.clone().lerp(new THREE.Vector3(c.x, 0.7, c.z), e);
      return { pos, look };
    },
    update(dt) {
      if (!S || S.kind !== 'arrive') return;
      S.t += dt;
      if ((S.t > 1.2 && allHere()) || S.t > 10) talk();
    },
    reset() { release(); S = null; }
  };
}
