import { IDOL_BPM, idolChart, songAt } from '../core/idolsong.js';

/**
 * 사이드스토리 '파자마 파티즈'(원작의 아이돌 그룹) 연출. 데이터(부탁 · 보상)는 core/quests.js 의 pajamaParty, 노래는 core/idolsong.js(원곡).
 *  1) 밤 광장의 작은 무대(world/idolstage.js): 색색 파자마를 입은 넷의 첫 공연. 손님은 나 · 치이카와 · 하치와레 셋뿐이라 시무룩
 *  2) 초록이 "우리가 즐거우면 다 같이 즐거워져!" → 1절: 노래에 맞춰 응원봉 흔들기(리듬 놀이). 박자를 맞출수록 갑옷 씨들이 하나둘 모여든다
 *  3) "…이 노래 왜 이렇게 귀에 남지?" · 우사기가 "야하!" 무대로 → 치이카와 · 하치와레도 올라가 2절: 다 같이 춤(콤보가 이어지면 색종이 피버)
 *  4) 마무리 인사(점수에 따라 대사) → 마을로. 마지막 대사 · 보상은 퀘스트(done)가.
 * ctx: { hud, guide, sound, input, rhythm, stage(무대 — 처음 볼 때 만들어지니 그때그때 읽는다), cam, getPlayer, who(kind), narrator, fill(lines), setMode, setCinematic, myLook }
 */
const SPB = 60 / IDOL_BPM, EIGHTH = SPB / 2, COUNT_BEATS = 4;
const FAN_EVERY = 5; // 1절에서 박자를 이만큼 맞출 때마다 갑옷 씨가 하나씩 모여든다
const FANS_AFTER_ROUND1 = 5; // 1절이 끝나면 적어도 이만큼은 모여 있다(노래가 귀에 남아서)
const IDOL_WHO = {
  idolG: { kind: 'idolG', name: '초록', tag: '#cfeed3', ink: '#2f6b3c' },
  idolP: { kind: 'idolP', name: '분홍', tag: '#ffd6e6', ink: '#8a3b5a' },
  idolW: { kind: 'idolW', name: '하양', tag: '#eef2f7', ink: '#4a5a6a' },
  idolV: { kind: 'idolV', name: '보라', tag: '#e6dafa', ink: '#5a3f86' }
};
// 리듬 놀이 음표: 웃는 별(응원봉 끝 별)
const STAR_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4l4.7 9.6 10.6 1.5-7.7 7.5 1.8 10.5L20 28.1l-9.4 5 1.8-10.5-7.7-7.5 10.6-1.5z" fill="#ffe45f" stroke="#c9922a" stroke-width="2.4" stroke-linejoin="round"/><circle cx="16" cy="19.5" r="1.6" fill="#5a3a22"/><circle cx="24" cy="19.5" r="1.6" fill="#5a3a22"/><path d="M17.6 23.4q2.4 2 4.8 0" stroke="#5a3a22" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

export function createIdolStory(ctx) {
  const { hud, guide, sound, input, rhythm } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const W = (id) => IDOL_WHO[id];
  const H = () => ctx.who('hachiware'), C = () => ctx.who('chiikawa'), U = () => ctx.who('usagi');
  /** 대사 여러 묶음을 차례로(묶음 사이에 카메라를 옮긴다): [[shot, lines, who], …] → then */
  const scenes = (list, then) => {
    const next = (i) => {
      if (!S) return;
      if (i >= list.length) { then(); return; }
      const [shot, lines, who] = list[i];
      if (shot) ctx.stage.shot(shot);
      say(lines, () => next(i + 1), who);
    };
    next(0);
  };

  function begin(done) {
    S = { kind: 'intro', done, round: 0, eighth: -1, hits: 0, fever: false, res: {}, t: 0 };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, '(밤의 광장. 작은 무대가 세워져 있다…)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('idol');
      ctx.setCinematic(true);
      sound.duck(true);
      ctx.stage.start(ctx.myLook());
      ctx.stage.shot('stage', true);
      ctx.stage.setMood('idle');
      hud.curtain(false);
      setTimeout(() => S && intro(), 700);
    }, 1100);
  }
  function intro() {
    S.kind = 'talk';
    scenes([
      ['stage', ['(무대 위에서 색색 파자마를 입은 넷이 꼼지락거린다…)', { who: W('idolP'), text: '…와 준 손님이… 셋뿐이야…' },
        { who: W('idolW'), text: '첫 공연인데… (훌쩍)' }, { who: W('idolV'), text: '……(꼼지락꼼지락)' }]],
      ['crowd', ['(넓은 광장에 손님은 {name}, 치이카와, 하치와레 셋뿐…)']],
      ['stage', [{ who: W('idolG'), text: '괜찮아! 와 준 셋을 위해서 힘껏 부르자! 우리가 즐거우면 다 같이 즐거워져!' },
        { who: W('idolG'), text: '들어 주세요~! 파자마 파티즈의 노래!' }], W('idolG')],
      ['wide', [{ who: H(), text: '{name}, 우리가 첫 손님이야! 노래에 맞춰 응원봉을 흔들자~!' }, { who: C(), text: '…!! (응원봉을 꼭 쥔다)' }], H()]
    ], () => { ctx.stage.setPals('glow'); startRound(1); });
  }
  function startRound(r) {
    if (!S) return;
    Object.assign(S, { kind: 'round', round: r, eighth: -1, hits: 0, fever: false });
    ctx.stage.setMood('sing');
    ctx.stage.shot(r === 1 ? 'wide' : 'dance'); // 1절: 관객이 모여드는 게 보이게 · 2절: 무대 위 춤을 가까이
    rhythm.start({
      bpm: IDOL_BPM, chart: idolChart(r), icon: STAR_ICON, go: '파자마!',
      label: r === 1 ? '무대 응원' : '다 같이 신나게', hint: '별이 동그라미 한가운데에 올 때 <kbd>Space</kbd> 또는 탭!',
      onHit: (q, combo) => {
        ctx.stage.cheer();
        S.hits++;
        if (r === 1 && S.hits % FAN_EVERY === 0 && ctx.stage.addFan() === 1) hud.toast('노랫소리에 이끌려 갑옷 씨가 왔다!', 2200);
        if (combo === 8 || combo === 16 || combo === 24) sound.play('cheer');
        if (r === 2) { S.fever = combo >= 8; ctx.stage.setFever(S.fever); }
      },
      onMiss: () => { if (r === 2) { S.fever = false; ctx.stage.setFever(false); } },
      onEnd: (res) => roundEnd(r, res)
    });
  }
  function roundEnd(r, res) {
    if (!S) return;
    S.res[r] = res.rank;
    ctx.stage.setMood('bow');
    sound.play('cheer');
    S.kind = 'talk';
    if (r === 2) { finale(); return; }
    while (ctx.stage.fans < FANS_AFTER_ROUND1) ctx.stage.addFan(); // 노래가 귀에 남아 결국 모여든다
    scenes([
      ['wide', ['(어느새 갑옷 씨들이 하나둘 모여들었다…!)', { who: ctx.who('labor'), text: '…이 노래… 왜 이렇게 귀에 남지?' },
        { who: ctx.who('pochette'), text: '제가 만든 잠옷이 무대 위에서…! (훌쩍)' }, { who: W('idolP'), text: '손님이… 늘었어…!' }]]
    ], () => {
      ctx.stage.usagiJoin();
      scenes([
        ['stage', [{ who: U(), text: '야하~!!' }, '(우사기가 무대 위로 폴짝 뛰어올랐다!)']],
        ['wide', [{ who: H(), text: '우사기가 올라갔다~! 치이카와, 우리도 가자!' }, { who: C(), text: '…!! (끄덕끄덕)' }], H()]
      ], () => {
        ctx.stage.palsJoin();
        setTimeout(() => S && scenes([
          ['stage', [{ who: W('idolG'), text: '다 같이 한 번 더~! 파·자·마·파·티!' }, { who: H(), text: '{name}, 맨 앞에서 응원해 줘~!' }], W('idolG')]
        ], () => startRound(2)), 1700);
      });
    });
  }
  function finale() {
    const r2 = S.res[2];
    ctx.stage.setFever(r2 === 'S');
    const lines = r2 === 'S'
      ? [{ who: W('idolG'), text: '최고의 첫 공연이었어! 고마워~!' }, { who: W('idolP'), text: '손님이 이렇게 많이…! (반짝반짝)' }, { who: U(), text: '야하~!! (엄지 척)' }]
      : r2 === 'A' || r2 === 'B'
        ? [{ who: W('idolG'), text: '다 같이 춰서 너무 즐거웠어~!' }, { who: H(), text: '헤헤, 신난다~! 우리도 아이돌 같았지?' }]
        : [{ who: C(), text: '…헤헤… 어려웠지만… 즐거웠다…' }, { who: W('idolG'), text: '즐거웠으면 그걸로 최고야!' }];
    scenes([
      ['finale', [...lines, { who: W('idolW'), text: '다음 공연에도 꼭 와 줘~!' }, '(파자마 파티즈의 노래가 한동안 귀에서 떠나지 않았다… 우~ 우와와 우와~♪)']]
    ], end);
  }
  function end() {
    hud.curtain(true);
    setTimeout(() => {
      if (!S) return;
      if (rhythm.active) rhythm.stop();
      sound.duck(false);
      ctx.stage.setFever(false);
      ctx.setMode('play');
      ctx.setCinematic(false);
      const p = ctx.getPlayer();
      if (p) ctx.cam.snap(p.position);
      hud.curtain(false);
      const done = S.done;
      S = { kind: 'outro', t: 0, doneCalled: false };
      setTimeout(() => { if (!S || S.kind !== 'outro' || S.doneCalled) return; S.doneCalled = true; if (done) done(); }, 500);
    }, 900);
  }

  return {
    /** 연출 중인지(마을로 돌아와 마무리 대사가 끝날 때까지). */
    get active() { return !!S; },
    /** 무대 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && S.kind !== 'outro'; },
    /** 지금 단계(디버그 · 테스트용): intro · talk · round · outro. */
    get phase() { return S ? S.kind : null; },
    get round() { return (S && S.round) || 0; },
    /** 장면 시작. done: 다 보고 마을로 돌아오면(퀘스트 마무리 대사 · 보상). */
    play(done) { if (!S) begin(done); },
    /** 무대 모드에서 매 프레임: 장면 · 노래(칸마다) · 박자 판정. 소리 · 춤은 박자 화면의 시계에 맞춘다. */
    tick(dt, t) {
      if (!S) return;
      let beat = null;
      if (S.kind === 'round' && rhythm.active) {
        const tt = rhythm.time, e = Math.floor(tt / EIGHTH);
        if (e !== S.eighth) { S.eighth = e; sound.idolStep(S.round, e, S.fever); }
        beat = tt / SPB - COUNT_BEATS;
        const h = rhythm.hype;
        rhythm.update();
        ctx.stage.setHype(rhythm.active ? rhythm.hype : h); // 곡이 끝나도 마지막 흥은 남긴다
      }
      ctx.stage.update(dt, t, beat);
    },
    /** 무대 위 말풍선: 노래하는 동안 초록 머리 위에 지금 노랫말. */
    labels() {
      if (!S || S.kind !== 'round' || !rhythm.active) return [];
      const at = songAt(S.round, S.eighth);
      if (!at || at.count || !at.line) return [];
      const p = ctx.stage.anchor('idolG');
      return [{ id: 'idol-lyric', kind: 'bubble', text: at.line, x: p.x, y: p.y, z: p.z }];
    },
    /** 행동 버튼: 노래하는 동안이면 박자. */
    press() { if (S && S.kind === 'round' && rhythm.active) rhythm.press(); return !!S; },
    /** 마을에서 매 프레임: 돌아온 뒤 마무리 대사가 끝나면 정리(퀘스트 없이 본 테스트도 다시 움직이게). */
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.doneCalled && !guide.open) { input.setEnabled(true); S = null; } // 마무리 대사가 끝나면
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() { if (rhythm.active) rhythm.stop(); sound.duck(false); S = null; }
  };
}
