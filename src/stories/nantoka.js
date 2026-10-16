/**
 * 사이드스토리 15편 「난토카바니아」(원작 애니 21 ~ 23화 「なんとかバニア」). 데이터(부탁 · 보상)는 core/quests.js 의 nantoka, 무대는 world/nantoka.js.
 *  1) 서쪽 숲 오솔길: 하치와레가 넷을 닮은 인형을 하나씩 꺼낸다 → 다 같이 인형 놀이
 *  2) 인형이 빛나기 시작하고 덤불 뒤에서 마녀가 들여다본다 → 번쩍! 영혼이 인형으로
 *  3) 마녀가 쓰러진 몸들을 그물 보따리에 싸 메고 숲 안쪽으로 → 인형은 꿈쩍 못 하고 하치와레만 조금씩 움직인다
 *  4) 하치와레가 페트병 뚜껑을 굴린다: 마녀 발이 내려올 때 내가 「지금!」(신호 놀이 — 흔들리는 바늘이 초록 칸에 올 때)
 *  5) 마녀가 뚜껑을 밟고 꽈당 → 원래 몸으로 돌아와 보따리에서 빠져나와 도망친다
 *  6) 숲 밖 강가에서 물에 얼굴을 비춰 보며 안도 → 마을 강가(마지막 대사 · 보상은 퀘스트 done)
 * 게임에서 정한 부분(원작에서 확인하지 못함): 나도 같이 인형이 된 것, 「지금!」 신호 놀이, 장소, 대사 전부.
 * ctx: { hud, guide, sound, input, minigame, stage(처음 들어갈 때 만든다), cam, getPlayer, who(kind), narrator, fill(lines),
 *        setMode, setCinematic, myLook, bank(마을 강가 — 끝나고 돌아올 자리 { x, z }), arriveBeside(kind, x, z), letGo(kind) }
 */
const WITCH = { kind: null, name: '마녀', tag: '#3b3e45', ink: '#e8f1d6' }; // 대화 상자 이름표(마을 친구가 아니라 하트는 없다)
const PALS = ['hachiware', 'chiikawa', 'usagi'];
/** 신호 놀이: 바늘이 위쪽 끝 가까이(천천히 돌아 나오는 곳)에 초록 칸 — 0.2초 늦게 누르는 사람도 들어오게(tests/nantoka.test.mjs). */
export const SIGNAL = { zone: [0.72, 0.92], speed: 0.55, grow: 0.05 };

export function createNantokaStory(ctx) {
  const { hud, guide, sound, input, minigame } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const H = (text) => ({ who: ctx.who('hachiware'), text }), C = (text) => ({ who: ctx.who('chiikawa'), text });
  const U = (text) => ({ who: ctx.who('usagi'), text }), W = (text) => ({ who: WITCH, text });
  /** 대사 묶음을 차례로: [[카메라, 대사, 묶음 전에 할 일?], …] → then */
  const scenes = (list, then) => {
    const next = (i) => {
      if (!S) return;
      if (i >= list.length) { then(); return; }
      const [shot, lines, before] = list[i];
      if (before) before();
      if (shot) ctx.stage.shot(shot);
      say(lines, () => next(i + 1));
    };
    next(0);
  };
  /** 장면 속 움직임(걷기 · 보따리 · 뚜껑)이 다 끝나면 then. */
  const whenStill = (then) => { if (S) S.wait = then; };
  /** 화면을 잠깐 가리고(글) 그 사이 장면을 바꾼 뒤 then. */
  const cut = (text, change, then) => {
    if (!S) return;
    hud.curtain(true, text);
    setTimeout(() => {
      if (!S) return;
      change();
      hud.curtain(false);
      setTimeout(() => S && then(), 600);
    }, 1300);
  };

  function begin(done) {
    S = { kind: 'intro', done, wait: null, mini: false, rolling: false, t: 0, doneCalled: false };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, '(서쪽 숲 오솔길… 하치와레가 작은 상자를 소중히 안고 기다리고 있었다)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('nantoka');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.myLook());
      ctx.stage.shot('gift', true);
      hud.curtain(false);
      setTimeout(() => S && gift(), 700);
    }, 1200);
  }
  /** 1) 인형 선물: 하나씩 꺼내 넷 앞에 세운다 → 다 같이 들여다본다. */
  function gift() {
    S.kind = 'talk';
    const pop = (k) => () => { ctx.stage.popDoll(k); sound.play('poof'); };
    scenes([
      ['gift', [H('짜잔~! 오늘은 다 같이 인형 놀이 하려고 가져왔어!'), H('난토카바니아! 우리랑 꼭 닮은 인형이야~')]],
      ['dolls', [H('이건 치이카와! 분홍 멜빵바지~'), C('…!! (반짝반짝) …귀여워…!')], pop('chiikawa')],
      ['dolls', [H('이건 우사기! 주황 멜빵바지~'), U('야하~!!')], pop('usagi')],
      ['dolls', [H('이건 나! 하늘색 멜빵바지야~'), H('그리고…')], pop('hachiware')],
      ['dolls', [H('{name} 것도 있어! 연두 멜빵바지~'), '(손바닥만 한 인형이 나를 꼭 닮았다)'], pop('me')],
      ['gift', ['(다 같이 인형을 세워 두고 쪼그려 앉아 들여다보았다)', H('헤헤, 꼭 우리 넷이 작아진 것 같아~'), C('…(인형이랑 눈을 맞춘다)…')], () => ctx.stage.setMood('play')]
    ], spell);
  }
  /** 2) 인형이 빛나고, 덤불 뒤에서 마녀가 → 번쩍! 영혼이 인형으로. */
  function spell() {
    scenes([
      ['dolls', ['(…그런데 인형들이 희미하게 빛나기 시작했다)', H('어, 어라…? 인형이 반짝반짝…?'), U('…하아?')], () => { ctx.stage.glow(true); sound.play('chime'); }]
    ], () => {
      ctx.stage.shot('witch');
      ctx.stage.witchPeek();
      sound.play('growl');
      whenStill(() => scenes([
        ['witch', ['(넷 뒤 덤불에서… 누군가 이쪽을 들여다보고 있다)', W('흐흐흐…')]]
      ], () => {
        ctx.stage.swapSouls();
        ctx.stage.shot('dolls');
        sound.play('poof');
        setTimeout(() => S && scenes([
          ['dolls', ['(번쩍! …눈을 떠 보니 몸이 아주 작아져 있었다)', H('어? 어어?! 내 몸이… 인형이 됐어?!'), C('…!? (덜덜)')]],
          ['bag', ['(덤불에서 나온 마녀가 쓰러져 있는 우리 몸 쪽으로 쿵쿵 다가간다)', W('좋은 몸이 넷이나… 흐흐…')]]
        ], bag), 600);
      }));
    });
  }
  /** 3) 마녀가 몸들을 보따리에 싸 메고 숲 안쪽으로. 인형은 꿈쩍 못 하고 하치와레만 조금씩. */
  function bag() {
    ctx.stage.witchBag();
    whenStill(() => {
      ctx.stage.struggle();
      scenes([
        ['leave', ['(마녀는 우리 몸을 그물 보따리에 싸 들고… 인형이 된 우리를 두고 숲 안쪽으로 걸어간다)', U('우, 우라…!'), '(몸을 움직여 보려 했지만… 손가락 하나 까딱할 수 없었다)']],
        ['leave', [H('…으으… 나는… 조금 움직일 수 있어…!'), C('…하치와레…!')]],
        ['cap', ['(하치와레가 아장아장… 길가에 떨어진 무언가 앞으로 갔다)'], () => ctx.stage.hachiToCap()]
      ], () => whenStill(() => scenes([
        ['cap', [H('페트병 뚜껑…! 이걸 굴리면…!'), H('{name}, 마녀 발이 내려올 때 「지금!」 하고 말해 줘!')]]
      ], signal)));
    });
  }
  /** 4) 신호 놀이: 흔들리는 바늘이 초록 칸에 올 때 「지금!」 → 하치와레가 뚜껑을 굴린다. 빗나가면 다시 굴려 온다(마녀는 터덜터덜 아주 조금씩만). */
  function signal() {
    if (!S) return;
    S.kind = 'signal';
    S.mini = true;
    ctx.stage.shot('roll');
    minigame.timing({
      label: '마녀 발이 내려올 때 「지금!」', button: '지금!', need: 1, ...SIGNAL,
      onHit: () => { S.rolling = true; sound.play('swing'); ctx.stage.roll(true, () => { S.rolling = false; sound.play('thud'); }); },
      onMiss: () => {
        if (S.rolling) return; // 굴러가는 중에 또 누른 건 그냥 빗나감
        S.rolling = true;
        sound.play('swing');
        ctx.stage.roll(false, () => { S.rolling = false; });
        hud.toast('빗나갔다…! 하치와레가 뚜껑을 다시 굴려 온다', 1800);
      },
      onDone: () => { S.mini = false; setTimeout(() => S && whenStill(fallen), 500); }
    });
  }
  /** 5) 꽈당 → 원래 몸으로 → 그물 보따리에서 빠져나와 도망친다. */
  function fallen() {
    S.kind = 'talk';
    ctx.stage.shot('fall');
    scenes([
      ['fall', ['(꽈당!! 마녀가 뚜껑을 밟고 뒤로 벌러덩 넘어졌다!)', W('아이고고고…!!')]]
    ], () => {
      ctx.stage.breakFree();
      ctx.stage.shot('free');
      sound.play('pass');
      whenStill(() => scenes([
        ['free', ['(번쩍! …정신을 차려 보니 원래 몸으로 그물 보따리 속에 있었다)', H('돌아왔다~!! 다들 얼른 빠져나와!'), U('우라!!'), C('…(허둥지둥)…')]],
        ['free', [H('도망치자~!!'), W('(버둥버둥) 거기 서라… 아이고 내 허리…')]]
      ], () => {
        ctx.stage.runAway();
        whenStill(() => cut('(정신없이 숲을 빠져나와… 강가까지 내달렸다)', () => { ctx.stage.setMood('river'); ctx.stage.shot('river', true); }, riverside));
      }));
    });
  }
  /** 6) 숲 밖 강가: 물에 얼굴을 비춰 보며 안도. */
  function riverside() {
    scenes([
      ['river', ['(하아… 하아… 넷은 강가에 털썩 주저앉아 물을 들여다보았다)', H('…{name}, 내 얼굴… 원래대로야?'), '(물에 비친 얼굴은… 하치와레 그대로였다)']],
      ['river', [C('…(물에 비친 자기 얼굴을 몇 번이고 들여다본다)…'), C('…진짜… 내 얼굴…'), U('…우라. (휴우)')]],
      ['river', [H('다행이다~ 다들 원래대로야…!'), '(물에 비친 넷의 얼굴이 살랑살랑 흔들렸다. 한참 동안 아무도 일어나지 않았다)']]
    ], outside);
  }
  /** 마을 강가로: 셋이 옆에. 마지막 대사 · 보상은 퀘스트 done. */
  function outside() {
    hud.curtain(true, '(…숨을 고르고, 넷은 강을 따라 천천히 마을로 걸어갔다)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('play');
      const p = ctx.getPlayer(), at = ctx.bank;
      if (p && at) {
        p.setPosition(at.x, at.z);
        p.face(at.x, at.z + 4);
        ctx.cam.snap(p.position);
        PALS.forEach((k, i) => ctx.arriveBeside(k, p.position.x + [1.2, -1.2, 2.3][i], p.position.z + [0.3, 0.3, -0.4][i]));
      }
      hud.curtain(false);
      setTimeout(() => S && finish(), 600);
    }, 1300);
  }
  function finish() {
    if (!S) return;
    const done = S.done;
    S.kind = 'outro';
    S.t = 0;
    S.doneCalled = true;
    ctx.setCinematic(false);
    if (done) done();
  }

  return {
    /** 연출 중인지(마을에서 마무리 대사가 끝날 때까지). */
    get active() { return !!S; },
    /** 숲 · 강가 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && ['intro', 'talk', 'signal'].includes(S.kind); },
    /** 지금 단계(디버그 · 테스트용): intro · talk · signal · outro. */
    get phase() { return S ? S.kind : null; },
    /** 장면 시작. done: 다 보고 마을로 돌아오면(퀘스트 마무리 대사 · 보상). */
    play(done) { if (!S) begin(done); },
    /** 장면 모드에서 매 프레임: 움직임이 끝나길 기다리던 다음 대사 · 신호 놀이 · 장면. */
    tick(dt, t) {
      if (!S) return;
      if (S.wait && !ctx.stage.busy) { const then = S.wait; S.wait = null; then(); }
      if (!S) return;
      if (S.mini) minigame.update(dt);
      ctx.stage.update(dt, t);
    },
    /** 행동 버튼: 신호 놀이 화면이 스스로 스페이스 · 탭을 받는다. */
    press() {},
    /** 마을에서 매 프레임: 마무리 대사가 끝나면 정리. */
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.doneCalled && !guide.open && S.t > 0.3) { PALS.forEach((k) => ctx.letGo(k)); input.setEnabled(true); S = null; }
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() {
      if (S && S.mini) minigame.stop();
      if (S) PALS.forEach((k) => ctx.letGo(k));
      S = null;
    }
  };
}
