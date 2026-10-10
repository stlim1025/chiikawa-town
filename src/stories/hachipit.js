import { isActive, isDone, pitDue, stepReady } from '../core/quests.js';

/**
 * 사이드스토리 '하치와레가 구덩이에!'(원작: 구덩이에 빠진 하치와레). 데이터(단계 · 보상)는 core/quests.js 의 hachiPit.
 *  1) 발견: 낮에 숲에서 구덩이 근처(30m)에 가면 어디선가 "살려줘~" — 구덩이 속에 하치와레가 머리만 내밀고 있다.
 *  2) 들여다보면: "헤헤… 빠져 버렸어~ 덩굴풀로 밧줄을 만들어 줄래?" → 이야기 시작(덩굴풀 3개 모으기).
 *     이야기 동안 하치와레는 구덩이 속(가까이 가면 보이고, 멀리 있으면 숨어 있다 · 밤에도 기다린다).
 *  3) 덩굴풀 3개를 들고 구덩이에서: 밧줄을 내려 "영차!" 연타(게이지가 차면 쑥) → 치이카와가 울면서 달려온다 → 보상(퀘스트).
 * ctx: { getState, npcs, village, hud, guide, sound, input, staged, pit, who(kind), narrator, fill(lines), getPlayer, regionAt,
 *        startStory(id), finishStory(id) }
 */
const NEAR = 30, FAR = 60, SINK = 0.55, MASH_GAIN = 0.11, MASH_DECAY = 0.16;
const CALLS = ['살려줘~!', '누구 없어~?', '여기야~ 여기!', '으아앙~ 못 나가겠어~'];

export function createHachiPit(ctx) {
  const { npcs, hud, guide, sound, input, staged, pit } = ctx;
  let S = null; // { kind: 'calling' | 'waiting' | 'rescue' | 'outro', t, callT, mash }
  const H = () => ctx.who('hachiware'), C = () => ctx.who('chiikawa'), N = () => ctx.narrator;
  const hachi = () => npcs.byKind('hachiware');
  const P = () => ctx.getPlayer().position;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const say = (lines, then, who = H()) => guide.say(ctx.fill(lines), then, who);

  /** 구덩이 속에 머리만(가까이 있을 때). */
  function showInPit() {
    const n = hachi();
    if (!n) return;
    staged.add('hachiware');
    npcs.lead('hachiware', null);
    pit.setOpen(true);
    if (n.away || Math.hypot(n.x - pit.spot.x, n.z - pit.spot.z) > 0.3) npcs.comeOut(n, pit.spot.x, pit.spot.z);
    n.x = pit.spot.x; n.z = pit.spot.z;
    n.sink = SINK;
    npcs.act(n, 'look', { face: P(), time: 9999 });
  }
  /** 멀리 가면 숨긴다(구덩이 속에서 기다리는 중 — 마을에 돌아다니지 않게). */
  function hideInPit() {
    const n = hachi();
    if (n && !n.away) npcs.goIn(n);
    staged.add('hachiware');
  }
  /** 이야기가 끝나거나 접힐 때: 하치와레를 일과로. */
  function release() {
    const n = hachi();
    if (n) { n.sink = 0; if (staged.has('hachiware')) npcs.plan(n, []); }
    const c = npcs.byKind('chiikawa');
    if (c && staged.has('chiikawa')) npcs.plan(c, []);
    staged.delete('hachiware');
    staged.delete('chiikawa');
    pit.setOpen(false);
  }

  function discover() {
    S = { kind: 'calling', t: 0, callT: 0 };
    showInPit();
    npcs.say(hachi(), CALLS[0]);
    hud.toast("어디선가 '살려줘~' 하는 소리가 들려요", 3800);
  }
  function lookIn() {
    input.setEnabled(false);
    say([{ who: H(), text: '앗! {name}!!' }, { who: H(), text: '헤헤… 구덩이에 빠져 버렸어~' }, { who: H(), text: '버섯을 따다가 발을 헛디뎠는데, 너무 깊어서 혼자서는 못 나가겠어…' },
      { who: H(), text: '숲에 덩굴풀이 있잖아? 덩굴풀 3개면 튼튼한 밧줄을 엮을 수 있을 거야!' }, { who: H(), text: '끌어올려 줄래…? 기다리고 있을게~!' }], () => {
      input.setEnabled(true);
      ctx.startStory('hachiPit');
      S = { kind: 'waiting', t: 0, callT: 6 };
    });
  }
  function hint() {
    input.setEnabled(false);
    say([{ who: H(), text: '{name}! 덩굴풀 3개면 밧줄이 될 거야~' }, { who: H(), text: '숲 여기저기에 길게 자라 있어! (덩굴풀은 4급부터 뽑을 수 있어)' }], () => input.setEnabled(true));
  }
  function rescue() {
    S = { kind: 'rescue', t: 0, mash: null };
    input.setEnabled(false);
    say([{ who: N(), text: '(덩굴풀을 엮어 튼튼한 밧줄을 만들었다…!)' }, { who: N(), text: '(구덩이 속으로 밧줄을 스르륵 내려 준다)' }, { who: H(), text: '꽉 잡았어! 당겨 줘~!' }], () => {
      input.setEnabled(true);
      ctx.getPlayer().busy = true; // 당기는 동안 제자리에서
      ctx.getPlayer().face(pit.spot.x, pit.spot.z);
      S.mash = { p: 0.05, t: 0 };
      hud.setAction('영차!');
    });
  }
  function pulled() {
    const n = hachi();
    S.mash = null;
    hud.hideMeter();
    hud.setAction(null);
    ctx.getPlayer().busy = false;
    sound.play('pass');
    if (n) {
      n.sink = 0;
      const at = ctx.village.nearestFree(pit.front.x - 0.9, pit.front.z - 0.4, 0.3);
      n.x = at.x; n.z = at.z;
      npcs.act(n, 'hop', { face: P(), time: 9999, say: '나왔다~!!' });
    }
    pit.setOpen(false);
    input.setEnabled(false);
    // 치이카와가 울면서 달려온다
    const c = npcs.byKind('chiikawa'), p = P();
    if (c && !c.party && !c.follow) {
      staged.add('chiikawa');
      const from = ctx.village.nearestFree(p.x + 6, p.z + 5, 0.4), to = ctx.village.nearestFree(p.x + 1.2, p.z + 0.6, 0.3);
      npcs.comeOut(c, from.x, from.z);
      npcs.plan(c, [{ do: 'walk', x: to.x, z: to.z, run: true }, { do: 'act', anim: 'shy', time: 9999, face: n ? { x: n.x, z: n.z } : p, say: '하치와레~!! (엉엉)' }]);
    }
    setTimeout(() => {
      if (!S) return;
      say([{ who: C(), text: '…하치와레… 무사해서… 다행이야…(훌쩍)' }, { who: H(), text: '헤헤, 걱정 끼쳐서 미안~ 치이카와!' }], () => {
        S = { kind: 'outro', t: 0 };
        ctx.finishStory('hachiPit');
      });
    }, 2200);
  }

  return {
    /** 내 캐릭터를 붙잡고 있는 중(밧줄 당기기 · 마무리)인지. */
    get active() { return !!S && (S.kind === 'rescue' || S.kind === 'outro'); },
    get phase() { return S ? S.kind : null; },
    /** 0.3초마다(한가할 때): 숲에서 구덩이 근처면 "살려줘~". */
    tryDiscover() {
      const s = ctx.getState(), n = hachi(), p = P();
      // 같이 다니는 중 · 술래잡기 · 대화 중만 빼고(하던 일정은 접고 구덩이로)
      if (S || !s || !n || !pitDue(s) || n.party || n.follow || n.flee || n.talk > 0 || staged.has('hachiware')) return;
      if (ctx.regionAt(p.x, p.z) !== 'forest' || dist(p, pit.spot) > NEAR) return;
      discover();
    },
    /** 구덩이 앞이면 행동 안내. */
    target(p) {
      if (!S || S.kind === 'rescue' || S.kind === 'outro' || dist(p, pit.spot) > 2.1) return null;
      const ready = S.kind === 'waiting' && stepReady(ctx.getState(), 'hachiPit');
      return { type: 'pit', label: S.kind === 'calling' ? '구덩이 들여다보기' : ready ? '밧줄 내려 주기' : '하치와레와 이야기', x: pit.spot.x, z: pit.spot.z, r: 0.95, y: 1.0 };
    },
    press() {
      if (!S) return;
      if (S.kind === 'rescue') {
        if (!S.mash) return;
        S.mash.p = Math.min(1, S.mash.p + MASH_GAIN);
        sound.play('swing');
        ctx.getPlayer().swing(0.18);
        if (S.mash.p >= 1) pulled();
        return;
      }
      if (S.kind === 'calling') lookIn();
      else if (S.kind === 'waiting') (stepReady(ctx.getState(), 'hachiPit') ? rescue : hint)();
    },
    update(dt) {
      const s = ctx.getState();
      if (!s) return;
      // 이야기 중인데(불러온 저장 등) 연출이 없으면 이어 간다
      if (!S && isActive(s, 'hachiPit')) S = { kind: 'waiting', t: 0, callT: 0 };
      if (!S) return;
      S.t += dt;
      const p = P(), far = dist(p, pit.spot) > FAR;
      if (S.kind === 'calling' && far) { release(); S = null; return; } // 그냥 지나쳤다(다음에 숲에 오면 또)
      if (S.kind === 'calling' || S.kind === 'waiting') {
        const n = hachi();
        if (far) hideInPit(); else if (!pit.open || (n && n.away)) showInPit();
        S.callT -= dt;
        if (!far && n && S.callT <= 0) { S.callT = S.kind === 'calling' ? 4 : 9; npcs.say(n, S.kind === 'calling' ? CALLS[Math.floor(Math.random() * CALLS.length)] : '밧줄 기다릴게~!'); }
      }
      if (S.kind === 'rescue' && S.mash) {
        S.mash.t += dt;
        S.mash.p = Math.max(0, S.mash.p - MASH_DECAY * dt);
        const n = hachi();
        if (n) n.sink = SINK * (1 - S.mash.p);
        hud.showMeter(S.mash.p, { from: 0.97, to: 1 }, '영차! 연타!');
      }
      if (S.kind === 'outro' && !guide.open && S.t > 0.6) { release(); S = null; return; }
      if (isDone(s, 'hachiPit') && S.kind !== 'outro') { release(); S = null; }
    },
    reset() {
      if (S && S.mash) { hud.hideMeter(); hud.setAction(null); ctx.getPlayer().busy = false; }
      release();
      S = null;
    }
  };
}
