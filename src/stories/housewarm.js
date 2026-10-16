import * as THREE from 'three';

/**
 * 집들이(게임 오리지널): 처음 내 집을 산 다음 날 저녁, 내 집 앞으로 가면 친구들이 선물을 들고 온다(조건 · 보상은 core/events.js).
 *  1) 손님(하치와레 · 치이카와는 늘, 나머지는 하트 1개부터)이 길 쪽에서 하나둘 걸어와 집 앞에 둥글게 선다
 *  2) 차례로 한마디씩 하며 선물(가구)을 건넨다
 *  3) 컷신: 카메라가 집을 등지고 선 우리를 앞에서 비추고, 다 같이 건배 → 색종이가 팡
 *  4) 마무리 대사 → done(온 친구 목록) 으로 main 이 보상 카드를 띄운다
 * ctx: { npcs, village, guide, input, hud, staged, who(kind), narrator, fill(lines), getPlayer, cam, confetti, sound,
 *        summon(kind, x, z): 그 친구를 하던 일에서 빼서 (x, z) 에 데려온다 → npc | null }
 */
const LINES = {
  hachiware: [['H', '{name}~! 집들이 축하해~!'], ['H', '이건 내 선물! 빨간 라디오야. 노래 듣고 싶을 때 틀어~'], ['N', '(하치와레에게 빨간 라디오를 받았다)']],
  chiikawa: [['C', '…추, 축하해…!'], ['N', '(치이카와가 해바라기 화분을 두 손으로 꼭 쥐고 내민다)']],
  usagi: [['U', '우라! 야하~!'], ['N', '(우사기가 말랑 빈백을 휙 던졌다. 폭신!)']],
  kurimanju: [['K', '하아~ 집들이엔 맛있는 게 빠질 수 없지.'], ['K', '라멘 냄비 선반이야. 따끈한 거 끓여 먹어.'], ['N', '(쿠리만쥬에게 라멘 냄비 선반을 받았다)']],
  rakko: [['R', '…축하한다.'], ['R', '푹 쉬는 것도 수련이다.'], ['N', '(랏코가 이불 깔개를 건넸다)']],
  momonga: [['M', '흥! 이거나 받아!'], ['M', '가시 조심해. 내가 골라 준 거니까 소중히 해!'], ['N', '(모몽가가 꼬마 선인장을 툭 내밀었다)']]
};
const SPEAKER = { H: 'hachiware', C: 'chiikawa', U: 'usagi', K: 'kurimanju', R: 'rakko', M: 'momonga' };

export function createHousewarm(ctx) {
  const { npcs, village, guide, input, hud, staged } = ctx;
  let S = null; // { kind: 'arrive' | 'gifts' | 'toast' | 'outro', t, guests: [kind], spots, from, center, done }
  const P = () => ctx.getPlayer();
  const line = ([w, text]) => ({ who: w === 'N' ? ctx.narrator : ctx.who(SPEAKER[w]), text });
  const say = (lines, then) => guide.say(ctx.fill(lines), then, ctx.who('hachiware'));

  function arrive(guests, done) {
    input.setEnabled(false);
    hud.setAction(null);
    const h = village.spots.home, me = { x: h.x, z: h.z + 1.2 };
    P().setPosition(me.x, me.z);
    P().face(me.x, me.z + 6);
    // 집 앞에 반달 모양으로(내 앞 1.9m, 왼쪽에서 오른쪽으로)
    const n = guests.length, spots = guests.map((k, i) => {
      const a = n === 1 ? 0 : -1.05 + (2.1 * i) / (n - 1);
      return village.nearestFree(me.x + Math.sin(a) * 1.9, me.z + Math.cos(a) * 1.9, 0.3);
    });
    const came = [];
    guests.forEach((k, i) => {
      const from = village.nearestFree(me.x + (i - n / 2) * 0.9, me.z + 7 + (i % 2) * 0.8, 0.4);
      const npc = ctx.summon(k, from.x, from.z);
      if (!npc) return;
      came.push(k);
      npcs.plan(npc, [{ do: 'wait', time: 0.25 + i * 0.45 }, { do: 'walk', x: spots[i].x, z: spots[i].z }, { do: 'act', anim: 'idle', time: 9999, face: me }]);
    });
    S = { kind: 'arrive', t: 0, guests: came, spots, me, center: { x: me.x, z: me.z + 1.1 }, done };
  }
  /** 다 왔는지(제자리에 서서 나를 보고 있다). */
  const allHere = () => S.guests.every((k) => { const n = npcs.byKind(k); return !n || (n.task && n.task.type === 'act'); });

  function gifts() {
    S.kind = 'gifts';
    const order = ['hachiware', ...S.guests.filter((k) => k !== 'hachiware')];
    const next = (i) => {
      if (!S) return;
      if (i >= order.length) { toast(); return; }
      const k = order[i], npc = npcs.byKind(k);
      if (npc && S.guests.includes(k)) npcs.emote(npc, 'hop', 1.4);
      say(LINES[k].map(line), () => next(i + 1));
    };
    next(0);
  }
  /** 컷신: 다 같이 건배하고 색종이. */
  function toast() {
    say([line(['H', '자, 다 같이 컵 들어~!'])], () => {
      if (!S) return;
      const c = S.center;
      Object.assign(S, { kind: 'toast', t: 0, from: ctx.cam.poseFor(P().position.x, P().position.z) });
      const lens = { x: c.x + 1.1, z: c.z + 5.4 }; // 카메라 쪽으로 돌아서서(단체 사진처럼) 컵을 든다
      S.guests.forEach((k) => { const n = npcs.byKind(k); if (n) npcs.act(n, 'drink', { face: lens, time: 9999 }); });
      P().cheerTime = 2.6;
      setTimeout(() => { if (S && S.kind === 'toast') { ctx.confetti.burst(c.x, 1.4, c.z, { n: 170, up: 3.8, spread: 2.2 }); ctx.sound.play('quest'); } }, 1500);
      setTimeout(() => { if (S && S.kind === 'toast') ctx.confetti.burst(c.x - 0.8, 1.6, c.z + 0.4, { n: 110, up: 3.4, spread: 1.8 }); }, 1900);
      setTimeout(() => {
        if (!S || S.kind !== 'toast') return;
        S.guests.forEach((k) => { const n = npcs.byKind(k); if (n) npcs.act(n, 'hop', { face: lens, time: 9999 }); }); // 깡충 뛰어도 카메라 쪽 그대로
        say([line(['H', '건배~!!']), line(['N', '(색종이가 팡 터지고, 집 앞이 웃음소리로 가득 찼다)'])], outro);
      }, 1700);
    });
  }
  function outro() {
    if (!S) return;
    S.kind = 'outro';
    S.guests.forEach((k) => { const n = npcs.byKind(k); if (n) npcs.act(n, 'idle', { face: S.me, time: 9999 }); });
    const lines = [line(['H', '이제 여기가 진짜 {name} 집이구나~ 자주 놀러 올게!'])];
    if (S.guests.includes('chiikawa')) lines.push(line(['C', '…(끄덕끄덕)…!']));
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
    S.guests.forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); });
  }

  return {
    get active() { return !!S; },
    /** 건배 컷신 중인지(화면 글을 숨긴다). */
    get cutscene() { return !!S && S.kind === 'toast'; },
    /** 시작: guests 는 올 친구(core/events.js 의 housewarmGuests), done(온 친구) 은 보상. */
    play(guests, done) { if (!S) arrive(guests, done); },
    /** 건배 컷신 카메라(아니면 null): 집을 등지고 선 우리를 앞쪽 조금 오른쪽에서, 집이 뒤에 보이게. */
    camPose(dt) {
      if (!S || S.kind !== 'toast' || !S.from) return null;
      S.t += dt;
      const k = Math.min(1, S.t / 1.2), e = k * k * (3 - 2 * k), c = S.center;
      const pos = S.from.pos.clone().lerp(new THREE.Vector3(c.x + 1.1, 1.75, c.z + 5.4), e);
      const look = S.from.look.clone().lerp(new THREE.Vector3(c.x, 1.05, c.z - 1.2), e);
      return { pos, look };
    },
    update(dt) {
      if (!S || S.kind !== 'arrive') return;
      S.t += dt;
      if ((S.t > 1.2 && allHere()) || S.t > 9) gifts();
    },
    reset() { release(); S = null; }
  };
}
