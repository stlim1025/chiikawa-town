/**
 * 사이드스토리 '스위치'(원작 애니 시즌1 「스위치」: 우사기가 바위에서 우연히 찾은 스위치를 누르자 동굴 돌문이 열리고 그 안에 작은 풍뎅이가 있었다 →
 * 며칠 같이 다니며 친구가 됐는데 이빨이 날카롭다 → 갑옷 씨에게 상담하니 의태형 같다고 한다 → 풍뎅이가 음식을 불러내 의심을 벗었다가 →
 * 갑자기 괴물로 커져 날아가며 "의태형이다!"). 데이터(부탁 · 단계 · 보상)는 core/quests.js 의 beetleSwitch, 장소와 장면은 world/switchcave.js.
 *  'switchOpen'   바위산 기슭: 우사기가 빨간 버튼을 누른다 → 돌문이 열리고 풍뎅이가 걸어 나온다 → 내가 쓰다듬는다 → 마을로 따라온다
 *  'switchFinale' 동굴 앞 소풍: 갑옷 씨가 지켜보는 가운데 풍뎅이가 음식을 불러낸다 → 다 같이 먹고 의심을 푼다 → 괴물로 커져 날아간다 → "의태형이다!"
 * 그 사이 며칠은 풍뎅이가 마을에서 나를 따라다니고(main 이 퀘스트 단계를 보고 켠다), 이빨을 처음 보는 장면은 main 의 STEP_FX.beetleTeeth.
 * 게임에서 정한 부분(원작에서 확인하지 못함): 내가 쓰다듬어 친해지는 것, 따라다니는 날수, 상담하는 갑옷 씨(노동 갑옷 씨)와 같이 지켜보러 온 것,
 *   소풍 자리와 불러낸 음식 종류, 마을로 돌아온 뒤 대사와 보상.
 * ctx: { hud, guide, sound, input, stage(장면 — 처음 들어갈 때 만든다), cam, getPlayer, who(kind), narrator, fill(lines),
 *        setMode, setCinematic, myLook, front(바위산 기슭 돌문 바위 — spot), arriveBeside(kind, x, z), letGo(kind) }
 */
const PALS = ['hachiware', 'chiikawa'];

export function createSwitchStory(ctx) {
  const { hud, guide, sound, input } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const H = (text) => ({ who: ctx.who('hachiware'), text }), C = (text) => ({ who: ctx.who('chiikawa'), text });
  const U = (text) => ({ who: ctx.who('usagi'), text }), L = (text) => ({ who: ctx.who('labor'), text });
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
  /** 장면 속 움직임(버튼 · 돌문 · 걸어 나오기 · 음식 · 커지기 · 날기)이 다 끝나면 then. */
  const whenStill = (then) => { if (S) S.wait = then; };

  function begin(scene, done) {
    const finale = scene === 'switchFinale';
    S = { kind: 'intro', scene, done, wait: null, t: 0, doneCalled: false };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, finale ? '(바위산 기슭, 열린 돌문 앞… 노동 갑옷 씨도 같이 와 주었다)' : '(북쪽 바위산 기슭… 커다란 바위벽 앞)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('beetle');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.myLook(), finale ? 'finale' : 'open');
      ctx.stage.shot('wide', true);
      hud.curtain(false);
      setTimeout(() => S && (finale ? picnic() : found()), 700);
    }, 1200);
  }

  // ---------- 'switchOpen' ----------
  /** 바위벽의 돌문과 빨간 버튼. 우사기가 꾹 누른다. */
  function found() {
    S.kind = 'talk';
    scenes([
      ['wide', ['(바위벽 가운데에 커다란 돌문이 꼭 닫혀 있다)', U('우라! 우라!'), '(우사기가 옆 바위를 가리키며 방방 뛴다)']],
      ['switch', ['(바위 받침 위에 빨간 버튼이 하나 박혀 있다)', H('이거… 스위치 맞지? 누르면 뭔가 열릴 것 같은데~'), C('…(고개를 도리도리)'), H('그치? 함부로 누르면 안 되겠지~?')],
        () => ctx.stage.setMood('press')],
      ['switch', [U('…(빤히)'), U('야하!'), H('앗, 우사기 잠깐만~!!')]]
    ], () => {
      ctx.stage.press();
      sound.play('click');
      whenStill(() => {
        ctx.stage.setMood('open');
        ctx.stage.shot('door');
        ctx.stage.open();
        sound.play('thud');
        whenStill(opened);
      });
    });
  }
  /** 쿠구구궁… 어두운 돌문 안에서 조그만 풍뎅이가 걸어 나온다. */
  function opened() {
    scenes([
      ['door', ['(쿠구구구궁…!! 돌문이 양옆으로 천천히 열렸다)', C('…!! (하치와레 뒤로 쏙)'), H('아, 안이 깜깜해… 뭔가 있어…?')]]
    ], () => {
      ctx.stage.beetleOut();
      whenStill(() => {
        ctx.stage.setMood('meet');
        scenes([
          ['beetle', ['(어둠 속에서 조그만 무언가가 아장아장 걸어 나왔다)', '(갈색 머리에 하얀 얼굴… 머리 위엔 꼭지가 달렸다)', '(…작은 손을 흔든다!)']],
          ['wide', [H('귀, 귀엽다~!! 풍뎅이 같아!'), U('야하~! (같이 손을 흔든다)'), C('…(빼꼼)… 귀여워…')]]
        ], pet);
      });
    });
  }
  /** 내 발밑까지 다가온 풍뎅이를 쓰다듬는다 → 같이 마을로. */
  function pet() {
    guide.ask('(풍뎅이가 내 발밑까지 다가와 올려다본다)', ['살살 쓰다듬기'], () => {
      ctx.stage.setMood('pet');
      ctx.stage.shot('beetle');
      ctx.stage.hearts();
      sound.play('heart');
      scenes([
        ['beetle', ['(쓰다듬자 풍뎅이가 눈을 가늘게 뜨고 손바닥에 볼을 비빈다)', H('{name}한테 벌써 마음을 열었나 봐~')]],
        ['wide', [H('풍뎅이, 우리랑 같이 놀래? 마을에 맛있는 것도 많아~'), '(풍뎅이가 머리를 끄덕끄덕)', U('우라~!!'), C('…헤헤…')]]
      ], () => outside('(풍뎅이는 아장아장 우리 뒤를 따라왔다)'));
    }, ctx.narrator);
  }

  // ---------- 'switchFinale' ----------
  /** 동굴 앞 소풍: 갑옷 씨가 지켜보는 가운데 풍뎅이가 두 팔을 번쩍. */
  function picnic() {
    S.kind = 'talk';
    scenes([
      ['picnic', [L('…저 아이가 그 풍뎅이군요.'), H('응! 착한 애야~ 이빨이 좀 뾰족할 뿐이야!'), C('…(꼴깍)')]],
      ['picnic', [L('의태형은 귀여운 모습으로 다가와 마음을 놓게 만들어요. 조금만 더 지켜볼게요.'), U('…하아.')]],
      ['beetle', ['(풍뎅이가 갑자기 두 팔을 번쩍 들었다…!)']]
    ], () => {
      ctx.stage.summon();
      sound.play('poof');
      whenStill(feast);
    });
  }
  /** 뿅뿅 불러낸 음식을 다 같이 먹고, 의심을 푼다. */
  function feast() {
    scenes([
      ['picnic', ['(뿅! 뿅! 돗자리 위에 맛있는 음식이 잔뜩 나타났다!)', U('야하~!!'), H('우와~ 풍뎅이가 불러 준 거야?! 대단해~!'), C('…!! (반짝반짝)')]],
      ['picnic', [L('…음식을 내어 주는 아이라니. 제가 괜한 걱정을 했나 봐요.'), H('거봐~ 착한 애라니까!')], () => { ctx.stage.setMood('feast'); sound.play('eat'); }],
      ['picnic', ['(다 같이 배불리 먹었다)', H('의심해서 미안해, 풍뎅이~ 우리 계속 친구 하자!'), C('…(고개를 끄덕끄덕)'), '(풍뎅이가 방긋 웃었다…)']]
    ], () => {
      ctx.stage.setMood('monster');
      ctx.stage.shot('monster');
      ctx.stage.monster();
      sound.play('growl');
      whenStill(roar);
    });
  }
  /** 쿠오오: 커다란 괴물이 날개를 펴고 날아가 버린다 → "의태형이다!" */
  function roar() {
    scenes([
      ['monster', ['(…그 순간, 풍뎅이의 입이 쩍 벌어지며 몸이 부풀어 오르기 시작했다!?)', '(쿠오오오오…!!)', C('…!!!! (털썩)'), H('푸, 풍뎅이…?!'), U('하아?!')]]
    ], () => {
      // 날아오르는 모습을 보며 대사가 이어진다(다 날아갈 때까지 기다리지 않는다)
      ctx.stage.shot('sky');
      ctx.stage.fly();
      sound.play('growl');
      scenes([
        ['sky', ['(풍뎅이는 커다란 날개를 펼치고 하늘 저편으로 날아가 버렸다…)']],
        ['gone', [L('……역시.'), L('의태형이다…!!')], () => ctx.stage.setMood('gone')],
        ['gone', [H('…………'), C('…(멍하니 하늘을 올려다본다)'), U('…야하.')]]
      ], () => whenStill(() => outside('(…우리는 한참 하늘을 올려다보다가 마을로 돌아왔다)')));
    });
  }

  /** 마을로: 바위산 기슭 돌문 바위 앞, 하치와레 · 치이카와가 옆에. 마지막 대사 · 보상은 퀘스트 done. */
  function outside(text) {
    hud.curtain(true, text);
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('play');
      const p = ctx.getPlayer(), at = ctx.front.spot;
      if (p) {
        p.setPosition(at.x, at.z + 1.2);
        p.face(at.x, at.z + 4);
        ctx.cam.snap(p.position);
        PALS.forEach((k, i) => ctx.arriveBeside(k, p.position.x + (i ? -1.2 : 1.2), p.position.z + 0.3));
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
    /** 바위산 기슭 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && ['intro', 'talk'].includes(S.kind); },
    /** 지금 단계(디버그 · 테스트용): intro · talk · outro. */
    get phase() { return S ? S.kind : null; },
    /** 장면 시작. scene: 'switchOpen' | 'switchFinale', done: 다 보고 마을로 돌아오면(퀘스트 마무리 대사 · 보상). */
    play(scene, done) { if (!S) begin(scene, done); },
    /** 장면 모드에서 매 프레임: 움직임이 끝나길 기다리던 다음 대사. */
    tick(dt, t) {
      if (!S) return;
      if (S.wait && !ctx.stage.busy) { const then = S.wait; S.wait = null; then(); }
      if (!S) return;
      ctx.stage.update(dt, t);
    },
    /** 마을에서 매 프레임: 마무리 대사가 끝나면 정리. */
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.doneCalled && !guide.open && S.t > 0.3) { PALS.forEach((k) => ctx.letGo(k)); input.setEnabled(true); S = null; }
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() {
      if (S) PALS.forEach((k) => ctx.letGo(k));
      S = null;
    }
  };
}
