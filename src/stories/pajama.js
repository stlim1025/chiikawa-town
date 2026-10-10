import * as THREE from 'three';

/**
 * 사이드스토리 '잠옷 밤나들이'(원작 애니 10화: 갑옷 씨가 준 잠옷을 입고 셋이 밤에 밖에서 놀며 별을 올려다본다).
 * 데이터(부탁 · 보상)는 core/quests.js 의 pajamaNight. 포셰트 갑옷 씨에게 잠옷 세트(고깔모자)를 받고, 밤에 내 집 앞으로 가면:
 *  1) 고깔모자를 쓴 치이카와 · 하치와레가 달려온다 → "밤에 몰래 나와서 노는 거… 두근두근!"
 *  2) 셋이서 살금살금 마을을 빠져나와 바다가 보이는 절벽으로 → 통나무에 나란히 앉아 바다 위 하늘을 본다(카메라는 뒤에서, 별이 쏟아지는 하늘)
 *  3) 별똥별이 쓱 → 꾸벅꾸벅 졸다가 그대로 밖에서 잠든다(진짜 잠: 날이 바뀌고 집세 · 친구들 밤도 그대로)
 *  4) 아침, 셋이 나란히 일어난다 → 마무리 대사 · 보상(퀘스트)
 * ctx: { npcs, village, hud, guide, input, staged, who(kind), narrator, fill(lines), getPlayer, cam, starfall, cliff(world/cliff.js),
 *        sleepHere(after), wakeBeside(kind, x, z), wear(chibi, kind, on) }
 */
const PALS = [['chiikawa', -1.15], ['hachiware', 1.15]];

export function createPajamaStory(ctx) {
  const { npcs, village, hud, guide, input, staged } = ctx;
  let S = null; // { kind: 'meet' | 'stars' | 'sleep' | 'outro', t, spot, from, done }
  const H = () => ctx.who('hachiware'), C = () => ctx.who('chiikawa'), N = () => ctx.narrator;
  const say = (lines, then, who = H()) => guide.say(ctx.fill(lines), then, who);
  const P = () => ctx.getPlayer();

  function dress(on) {
    PALS.forEach(([k]) => { const n = npcs.byKind(k); if (n) { ctx.wear(n.chibi, k, on); if (!on) n.sink = 0; } });
  }
  function meet(done) {
    S = { kind: 'meet', t: 0, done };
    input.setEnabled(false);
    hud.setAction(null);
    const p = P().position;
    PALS.forEach(([k, dx], i) => {
      const n = npcs.byKind(k);
      if (!n) return;
      staged.add(k);
      const from = village.nearestFree(p.x + 5 + i, p.z + 4.5, 0.4), to = village.nearestFree(p.x + dx, p.z + 0.9, 0.3);
      npcs.comeOut(n, from.x, from.z);
      ctx.wear(n.chibi, k, true);
      npcs.plan(n, [{ do: 'walk', x: to.x, z: to.z, run: true }, { do: 'act', anim: i ? 'hop' : 'shy', time: 9999, face: { x: p.x, z: p.z } }]);
    });
    setTimeout(() => {
      if (!S) return;
      say([{ who: H(), text: '{name}~! 짜잔, 잠옷 입고 왔어!' }, { who: C(), text: '…(귀 달린 후드를 쓰고 빙그르르 돌며 자랑한다)' },
        { who: H(), text: '밤에 몰래 나와서 노는 거… 두근두근하다~!' }, { who: H(), text: '바다가 보이는 절벽에 가서 별 보자! 거기 통나무에 앉으면 하늘이 엄청 넓어~' }], toCliff);
    }, 1900);
  }
  function toCliff() {
    hud.curtain(true, '(셋이서 살금살금 마을을 빠져나와, 바다가 보이는 절벽으로…)');
    setTimeout(() => {
      if (!S) return;
      const L = ctx.cliff.log, lift = ctx.cliff.seatY, [west, mid, east] = ctx.cliff.seats;
      // 통나무 위에 나란히(통나무 축을 따라, 바다 쪽 = 남쪽을 보고): 가운데가 나, 치이카와는 서쪽 · 하치와레는 동쪽 자리
      P().setPosition(mid.x, mid.z);
      P().face(mid.x, mid.z + 6);
      P().lift = lift;
      P().act('sit', 9999);
      PALS.forEach(([k, dx]) => {
        const n = npcs.byKind(k), seat = dx < 0 ? west : east;
        if (!n) return;
        npcs.comeOut(n, seat.x, seat.z);
        n.x = seat.x; n.z = seat.z; // comeOut 은 통나무(장애물) 밖 빈자리로 비켜 주므로 자리를 다시 박는다
        n.sink = -lift;
        ctx.wear(n.chibi, k, true);
        npcs.act(n, 'sit', { face: { x: seat.x, z: seat.z + 6 }, time: 9999 });
      });
      ctx.starfall.setSky(true);
      Object.assign(S, { kind: 'stars', t: 0, spot: { x: L.x, z: L.z }, from: ctx.cam.poseFor(L.x, L.z) });
      hud.curtain(false);
      setTimeout(() => S && stars(), 1600);
    }, 1900);
  }
  function stars() {
    say([{ who: H(), text: '우와~ 별 진짜 많다~!' }, { who: C(), text: '…반짝반짝…' }, { who: H(), text: '있잖아, 이렇게 셋이서 밤에 노는 거… 처음이다~' },
      { who: N(), text: '(별똥별 하나가 하늘을 쓱 가로질렀다)' }, { who: C(), text: '…앗…!' }, { who: H(), text: '헤헤… 소원 빌었어?' }, { who: C(), text: '…(끄덕끄덕)' },
      { who: N(), text: '(따뜻한 잠옷 덕분인지, 슬슬 눈꺼풀이 무거워진다…)' }, { who: H(), text: '…으음… 조금만… 더 보고…' }], () => {
      PALS.forEach(([k]) => { const n = npcs.byKind(k); if (n) npcs.act(n, 'sit', { face: { x: n.x, z: n.z + 6 }, time: 9999 }); });
      S.kind = 'sleep';
      setTimeout(() => {
        if (!S) return;
        ctx.starfall.setSky(false);
        ctx.sleepHere(morning);
      }, 900);
    });
  }
  function morning() {
    if (!S) return;
    // 통나무에서 내려와 바다 앞에서 일어난다(절벽 위 아침)
    P().lift = 0;
    P().act(null, 0);
    const L = ctx.cliff.log, stand = village.nearestFree(L.x, L.z - 1.3, 0.3);
    P().setPosition(stand.x, stand.z);
    P().face(stand.x, stand.z + 6);
    PALS.forEach(([k, dx]) => {
      const at = village.nearestFree(stand.x + dx, stand.z - 0.1, 0.3);
      ctx.wakeBeside(k, at.x, at.z);
      const n = npcs.byKind(k);
      if (n) { n.sink = 0; ctx.wear(n.chibi, k, true); npcs.act(n, k === 'hachiware' ? 'stretch' : 'sit', { face: { x: at.x, z: at.z + 6 }, time: 9999 }); }
    });
    input.setEnabled(false);
    setTimeout(() => {
      if (!S) return;
      say([{ who: N(), text: '(눈을 떠 보니 아침… 셋이 나란히 잠옷 차림으로 통나무 앞에서 잠들어 있었다)' }, { who: H(), text: '…으음… 앗, 아침이다~!' }, { who: C(), text: '…(쿨쿨)…' },
        { who: H(), text: '치이카와~ 일어나~! 우리 밖에서 자 버렸어!' }, { who: C(), text: '…!! (화들짝)' }], () => {
        S.kind = 'outro';
        S.t = 0;
        S.done();
      });
    }, 900);
  }
  function release() {
    dress(false);
    if (P()) { P().lift = 0; }
    PALS.forEach(([k]) => { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); });
  }

  return {
    /** 연출 중인지(잠자는 동안은 잠 연출이 붙잡는다). */
    get active() { return !!S; },
    get phase() { return S ? S.kind : null; },
    /** 시작(밤에 내 집 앞에 왔을 때). done: 마무리 대사 · 보상. */
    play(done) { if (!S) meet(done); },
    /** 별을 올려다보는 동안의 카메라(없으면 null): 앉은 자리 뒤에서 하늘로. */
    camPose(dt) {
      if (!S || S.kind !== 'stars' || !S.from) return null;
      S.t += dt;
      const k = Math.min(1, S.t / 1.6), e = k * k * (3 - 2 * k), p = S.spot;
      // 통나무 뒤(북쪽)에서: 화면 아래에 나란히 앉은 셋의 뒷모습, 그 너머 바다와 별이 쏟아지는 하늘
      const pos = S.from.pos.clone().lerp(new THREE.Vector3(p.x, 2.0, p.z - 5.6), e);
      const look = S.from.look.clone().lerp(new THREE.Vector3(p.x, 1.75, p.z + 12), e);
      return { pos, look };
    },
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.t > 0.6 && !guide.open) { release(); S = null; }
    },
    reset() { if (S && S.kind === 'stars') ctx.starfall.setSky(false); release(); S = null; }
  };
}
