/**
 * 사이드스토리 '몸이 바뀌었다'(원작 애니 202 ~ 210화 「슬롯」: 낡은 게임센터의 슬롯을 돌렸다가 셋의 몸이 바뀐다 → 바뀐 몸으로 라멘을 먹고 →
 * 각자 몸의 집에서 자고 → 다음 날 우사기 몸이 된 치이카와가 운다 → 우사기가 숨긴 메달로 다시 돌려 원래대로, 「위풍당당 행진곡」이 흐른다).
 * 원작의 셋에 나도 휘말렸다: 나는 하치와레 몸, 우사기는 내 몸(core/swap.js). 데이터(부탁 · 단계 · 보상)는 core/quests.js 의 bodySwap, 장소와 장면은 world/arcade.js.
 *  'swapSlot'  게임센터: 우사기가 메달을 넣고 돌린다 → 화살표가 둘만 맞아 눈썹만 바뀐다 → 한 번 더, 이번엔 내가 버튼을 누른다 → 셋 다 맞아 넷의 몸이 바뀐다
 *  'swapRamen' 라멘 로우 앞 의자에 넷이 나란히: 우사기 몸의 치이카와가 마늘을 듬뿍, 시사가 놀란다 → 우사기(내 몸)가 내 지갑으로 계산
 *  'swapBack'  게임센터: 내가 릴을 하나씩 멈춘다(첫 판은 마지막 릴이 한 칸 모자라고, 우사기가 메달을 하나 더 꺼낸다) → 셋 다 맞아 원래대로 →
 *              「위풍당당 행진곡」 → 모몽가가 들이닥쳐 메달 없이 버튼을 누르다 기계를 부순다
 * 그 사이의 울음(STEP_FX.swapCry) · 메달 술래잡기(STEP_FX.swapChase) · 바뀐 동안의 마을(동굴이 내 집 · 우사기의 장난)은 main.
 * 게임에서 정한 부분(원작에서 확인하지 못함): 나까지 휘말린 것과 내가 든 몸, 첫 판에 눈썹만 바뀌는 것, 내가 누르는 버튼, 시사가 주문을 받는 것,
 *   우사기가 내 지갑으로 계산하는 것, 릴 멈추기 놀이와 첫 판의 실패, 모몽가가 기계를 부수는 끝, 대사 전부.
 * ctx: { hud, guide, sound, input, minigame, stage(장면 — 처음 들어갈 때 만든다), cam, getPlayer, narrator, fill(lines),
 *        setMode, setCinematic, realLook(바뀌기 전 내 모습), front(게임센터 겉모습 — spot), forceSwap(on | null), isSwapped(),
 *        arriveBeside(kind, x, z), letGo(kind), npcAct(kind, anim, face, time, at), ramenSeats(), ramenFace(), playerEat(), payMyBody() }
 */
const PALS = ['chiikawa', 'hachiware', 'usagi'];
const SIDE = ['왼쪽', '가운데', '오른쪽'];

export function createSwapStory(ctx) {
  const { hud, guide, sound, input, minigame } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  // 대사 주인은 속(친구 종류): 이름표는 대사를 띄울 때의 몸을 따른다(main 의 fillName 이 그때 이름을 읽는다)
  const C = (text) => ({ who: 'chiikawa', text }), H = (text) => ({ who: 'hachiware', text }), U = (text) => ({ who: 'usagi', text });
  const M = (text) => ({ who: 'momonga', text }), SH = (text) => ({ who: 'shisa', text });
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
  /** 장면 속 움직임(메달 · 릴 · 바뀌기 · 부서지기)이 다 끝나면 then. */
  const whenStill = (then) => { if (S) S.wait = then; };
  /** 릴이 도는 동안 따르륵 소리. */
  const rattle = (on) => {
    if (S && S.rattle) { clearInterval(S.rattle); S.rattle = null; }
    if (on && S) S.rattle = setInterval(() => sound.play('click'), 190);
  };
  /** 정해진 판: [그림, 릴] 차례로 0.45초씩 걸러 세운다 → 다 서면 then. */
  const stopSeq = (list, then) => {
    const next = (j) => {
      if (!S) return;
      if (j >= list.length) { rattle(false); whenStill(then); return; }
      const [kind, i] = list[j];
      ctx.stage.stopOn(i, kind);
      setTimeout(() => next(j + 1), 450);
    };
    next(0);
  };

  function begin(scene, done) {
    S = { kind: 'intro', scene, done, wait: null, t: 0, doneCalled: false, pals: [], rattle: null };
    input.setEnabled(false);
    hud.setAction(null);
    if (scene === 'swapRamen') { ramen(); return; }
    const back = scene === 'swapBack';
    hud.curtain(true, back ? '(메달을 꼭 쥐고, 다시 숲 어귀의 낡은 게임센터로…)' : '(숲 어귀, 덩굴이 뒤덮은 낡은 게임센터… 금 간 유리문을 밀고 들어갔다)');
    setTimeout(() => {
      if (!S) return;
      if (back && !ctx.isSwapped()) ctx.forceSwap(true); // 테스트 앱 '장면만': 바뀐 몸 이름표로
      ctx.setMode('arcade');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.realLook(), back ? 'back' : 'slot');
      ctx.stage.shot('wide', true);
      hud.curtain(false);
      setTimeout(() => S && (back ? again() : enter()), 700);
    }, 1200);
  }

  // ---------- 'swapSlot' ----------
  /** 불 꺼진 오락기들 사이에서 홀로 반짝이는 노란 슬롯머신. */
  function enter() {
    S.kind = 'talk';
    scenes([
      ['wide', ['(먼지 쌓인 오락기들이 줄지어 서 있다. 불은 다 꺼졌는데…)', '(안쪽의 노란 기계 하나만 반짝반짝 불이 들어와 있다!)', H('우와~ 아직 켜져 있는 게 있어!'), C('…(두근두근)')]],
      ['slot', ['(구름 모양 머리에 웃는 얼굴, 하늘색 손이 달린 슬롯머신이다)', H('메달을 넣고 빨간 버튼으로 하나씩 멈추는 건가 봐~'), U('우라! (메달을 번쩍 든다)')], () => ctx.stage.setMood('slot')]
    ], firstSpin);
  }
  /** 우사기가 메달을 넣고 버튼을 마구 누른다 → 화살표 둘 · 물음표 → 번쩍, 눈썹만 바뀐다. */
  function firstSpin() {
    ctx.stage.insertMedal('usagi');
    sound.play('coin');
    whenStill(() => {
      ctx.stage.spin();
      ctx.stage.shot('reels');
      rattle(true);
      say([U('야하~!! (빨간 버튼을 마구 누른다)')], () => stopSeq([['swap', 0], ['swap', 1], ['what', 2]], () => {
        ctx.stage.shot('slot');
        say(['(초록 화살표 둘… 마지막은 물음표다)', H('아깝다~ 두 개만 맞았네~')], () => {
          ctx.stage.setMood('talk');
          ctx.stage.shot('talk');
          ctx.stage.brows(true);
          sound.play('poof');
          setTimeout(() => S && browsTalk(), 700);
        });
      }));
    });
  }
  function browsTalk() {
    scenes([
      ['talk', ['(번쩍! 기계가 빛났다…!)', '(…어라? 다들 얼굴이 조금 이상하다)', H('치이카와… 눈썹이 생겼어! 엄청 화난 눈썹이야~'), C('…!? (하치와레를 가리키며 덜덜)'),
        H('어, 나도…? {name}도 눈썹이 바뀌었어~!'), U('하아?! (제 눈썹을 만지작)')]],
      ['talk', [H('눈썹만 바뀌었나 봐~ 화살표가 두 개만 맞아서 그런가?'), H('셋 다 맞으면… 뭐가 바뀌는 걸까~?'), U('우라! (주머니에서 메달을 하나 더 꺼낸다)')]]
    ], secondSpin);
  }
  /** 한 번 더: 우사기가 메달을 넣고 나를 버튼 앞에 세운다. 내가 고른 버튼부터 차례로, 셋 다 초록 화살표 → 넷의 몸이 바뀐다. */
  function secondSpin() {
    ctx.stage.setMood('reels'); // 나를 버튼 앞(왼쪽)에, 다들 양옆으로: 릴 창 앞 카메라를 가리지 않게
    ctx.stage.shot('slot');
    ctx.stage.insertMedal('usagi');
    sound.play('coin');
    whenStill(() => {
      ctx.stage.spin();
      ctx.stage.shot('reels');
      rattle(true);
      guide.ask('(우사기가 내 등을 떠밀어 버튼 앞에 세웠다. 어느 빨간 버튼을 누를까?)', SIDE.map((s) => `${s} 버튼`), (i) => {
        const order = [i, ...[0, 1, 2].filter((j) => j !== i)];
        stopSeq(order.map((j) => ['swap', j]), () => {
          sound.play('chime');
          say(['(초록 화살표가… 셋 다 나란히 섰다!)', '(기계의 구름 얼굴이 히죽 웃었다…)'], () => {
            ctx.stage.setMood('talk');
            ctx.stage.shot('talk');
            sound.play('poof');
            ctx.stage.swirl(true);
            whenStill(() => { ctx.forceSwap(true); ctx.stage.setMood('swapped'); swappedTalk(); });
          });
        });
      }, ctx.narrator);
    });
  }
  /** 정신을 차려 보니: 치이카와는 우사기 몸, 하치와레는 치이카와 몸, 우사기는 내 몸, 나는 하치와레 몸. */
  function swappedTalk() {
    scenes([
      ['talk', ['(번쩍—!! 눈앞이 새하얘졌다…)', '(…정신을 차려 보니, 뭔가 이상하다)']],
      ['talk', [C('…? …!! (제 손을 보고, 기다란 귀를 만져 본다)'), C('…우, 우사기 몸이야…?!'), H('어라~? 이 손… 치이카와 손이잖아~?!'), U('하아…? (내 몸으로 제 손을 쥐었다 폈다 한다)')]],
      ['talk', ['(…내 머리에 하치와레 무늬가 있다!?)', H('{name}, 하치와레 몸이 됐네~! 나랑 똑같이 생겼다~'), U('우라! 야하! (내 몸으로 방방 뛴다)'), C('…어, 어떡해…')]]
    ], () => outside('(…우리는 바뀐 몸 그대로 게임센터를 나왔다)'));
  }

  // ---------- 'swapRamen' ----------
  /** 라멘 로우 앞 의자에 넷이 나란히(마을 그대로 — 몸은 바뀐 채). */
  function ramen() {
    S.kind = 'ramen';
    hud.curtain(true, '(라멘 로우… 바뀐 몸 그대로 넷이 나란히 앉았다)');
    setTimeout(() => {
      if (!S) return;
      ctx.setCinematic(true);
      const seats = ctx.ramenSeats(), face = ctx.ramenFace(), p = ctx.getPlayer();
      if (p) { p.setPosition(seats[1].x, seats[1].z); p.face(face.x, face.z); ctx.cam.snap(p.position); }
      // 치이카와(우사기 몸)는 내 오른쪽, 하치와레(치이카와 몸)는 왼쪽 끝, 우사기(내 몸)는 오른쪽 끝
      [['chiikawa', 0], ['hachiware', 3], ['usagi', 2]].forEach(([k, i]) => { ctx.arriveBeside(k, seats[i].x, seats[i].z); ctx.npcAct(k, 'idle', face, 90, seats[i]); });
      S.pals = PALS;
      hud.curtain(false);
      setTimeout(() => S && order(face), 600);
    }, 1200);
  }
  function order(face) {
    scenes([
      [null, ['(시사가 주문을 받으러 왔다)', SH('어서 오세요~! 라멘 로우입니다! 뭘로 하시겠어요?')]],
      [null, [C('…라멘… 마늘… 듬뿍 넣어 주세요…!'), SH('네~ 마늘 듬뿍! …어라? 우사기 님이 말을 하셨어요!?'), H('아하하~ 사실 우리 몸이 바뀌었거든~'), SH('…네에???')]]
    ], () => {
      PALS.forEach((k) => ctx.npcAct(k, 'slurp', face, 90));
      ctx.playerEat();
      sound.play('eat');
      scenes([
        [null, ['(후루룩… 후루룩…)', U('우라~! (내 몸으로 국물까지 쭉 들이켠다)'), H('치이카와 몸으로 먹으니까 한 그릇이 엄청 커 보여~!'), C('…마늘 냄새… 우사기 입에서 나… (킁킁)')]],
        [null, ['(다 먹고 나자, 우사기(내 몸)가 내 지갑을 꺼내 계산했다…!)'], () => ctx.payMyBody()]
      ], () => { PALS.forEach((k) => ctx.npcAct(k, 'idle', face, 90)); finish(); });
    });
  }

  // ---------- 'swapBack' ----------
  /** 다시 게임센터: 메달은 하나뿐. 내가 릴을 멈춘다. */
  function again() {
    S.kind = 'talk';
    scenes([
      ['wide', ['(노란 슬롯머신은 오늘도 혼자 반짝이고 있다)', H('메달은 하나뿐이야~ 이번엔 꼭 셋 다 맞춰야 해!'), C('…(두 손을 꼭 모은다)'), U('…우라.')]],
      ['slot', [H('{name}, 부탁해~! 초록 화살표가 빨간 줄에 오면 버튼을 눌러!')], () => ctx.stage.setMood('reels')]
    ], () => {
      ctx.stage.insertMedal('me');
      sound.play('coin');
      whenStill(() => S && play(true));
    });
  }
  /** 릴 멈추기 놀이: 왼쪽부터 하나씩. first 면 마지막 릴은 꼭 빗나간다(이야기로 정한 첫 실패). 빗나간 릴은 잠깐 뒤 다시 돈다. */
  function play(first) {
    S.kind = 'game';
    S.first = first;
    S.reel = 0;
    S.lock = false;
    ctx.stage.shot('reels');
    ctx.stage.spin();
    rattle(true);
    minigame.button({ label: '초록 화살표가 빨간 줄에 오면 멈춰! (왼쪽 릴)', button: '멈춰!', need: 3, onPress: press });
  }
  function press() {
    if (!S || S.kind !== 'game' || S.lock) return null;
    const i = S.reel;
    if (i > 2 || !ctx.stage.spinning(i)) return null;
    const r = ctx.stage.tryStop(i, S.first && i === 2 ? 'bolt' : null);
    if (S.first && i === 2) { S.lock = true; rattle(false); whenStill(() => S && missFirst()); return 'miss'; }
    if (r.hit) {
      S.reel++;
      minigame.setHits(S.reel);
      sound.play('chime');
      if (S.reel > 2) { S.lock = true; rattle(false); whenStill(() => S && matched()); } else minigame.setLabel(`좋아! 이번엔 ${SIDE[S.reel]} 릴!`);
      return 'good';
    }
    S.lock = true;
    sound.play('none');
    setTimeout(() => { if (!S || S.kind !== 'game') return; ctx.stage.respin(i); S.lock = false; minigame.setLabel(`한 번 더! (${SIDE[i]} 릴)`); }, 700);
    return 'miss';
  }
  /** 첫 판: 마지막 릴이 한 칸 모자라게 섰다 → 우사기가 숨겨 둔 메달을 하나 더 꺼낸다. */
  function missFirst() {
    minigame.stop();
    S.kind = 'talk';
    const bolt = ctx.stage.cell(2) === 'bolt';
    scenes([
      ['slot', [bolt ? '(마지막 릴이… 번개에서 멈췄다! 한 칸 모자라다!)' : '(마지막 릴이… 화살표를 지나쳐 버렸다!)', H('아앗~ 아까워!'), C('…(털썩)'), U('…하아.')]],
      ['slot', ['(우사기가 주머니를 뒤적이더니… 메달을 하나 더 꺼냈다!)', H('또 숨겨 놨었어~?!'), U('야하~!')]]
    ], () => {
      ctx.stage.insertMedal('usagi');
      sound.play('coin');
      whenStill(() => S && play(false));
    });
  }
  /** 셋 다 초록 화살표: 빛 속에서 원래 몸으로 → 「위풍당당 행진곡」. */
  function matched() {
    minigame.done();
    S.kind = 'talk';
    sound.play('chime');
    scenes([['reels', ['(초록 화살표가… 셋 다 나란히 섰다!)']]], () => {
      ctx.stage.setMood('talk');
      ctx.stage.shot('talk');
      sound.play('poof');
      ctx.stage.swirl(false);
      whenStill(() => {
        ctx.forceSwap(false);
        ctx.stage.setMood('back');
        sound.play('pomp');
        scenes([
          ['talk', ['(번쩍—!! …눈을 떠 보니)', '(내 손이다! 내 몸으로 돌아왔다!)', U('야하~!! (제 귀를 잡아당기며 방방)'), C('…돌아왔다… (훌쩍)'), H('역시 내 몸이 제일 편해~!')]]
        ], momonga);
      });
    });
  }
  /** 모몽가가 들이닥친다: 메달 없이 버튼을 쾅쾅 → 고장 났다며 마구 두드리다 기계를 부순다. */
  function momonga() {
    ctx.stage.setMood('momonga');
    ctx.stage.momongaIn();
    ctx.stage.shot('smash');
    whenStill(() => scenes([
      ['smash', [M('뭐야 뭐야! 다들 여기서 뭐 하고 놀았어?!'), H('앗, 모몽가… 그 기계는 만지면 안 돼~!')]],
      ['smash', [M('흥! 나도 할 거야! (빨간 버튼을 쾅쾅 누른다)'), '(…메달을 넣지 않아서 아무 일도 일어나지 않는다)', M('뭐야! 고장 났잖아! 흥!!')],
        () => { ctx.stage.turn('momonga', 'slot'); ctx.stage.pose('momonga', 'flail'); }]
    ], () => {
      ctx.stage.setMood('smash');
      ctx.stage.smash();
      sound.play('thud');
      setTimeout(() => S && sound.play('thud'), 900);
      whenStill(() => {
        if (!S) return;
        ctx.stage.setMood('gone');
        scenes([
          ['smash', ['(쾅! 콰직—!! 구름 머리가 떨어지고, 기계에서 연기가 피어올랐다…)', M('…………'), M('…난 몰라! 원래 고장 나 있었어! 흥!'), C('…(멍)'), H('…모몽가~ 그거 하나뿐인 기계였는데~!'), U('…하아.')]]
        ], () => outside('(…우리는 원래 몸으로 게임센터를 나왔다)'));
      });
    }));
  }

  /** 마을로: 게임센터 문 앞, 셋이 옆에. 마지막 대사 · 보상은 퀘스트 done(몸은 그 단계대로 — 바뀌었거나 돌아왔거나). */
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
        PALS.forEach((k, i) => ctx.arriveBeside(k, p.position.x + [-1.3, 1.3, 2.5][i], p.position.z + [0.3, 0.3, -0.2][i]));
        S.pals = PALS;
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
  function clear() {
    if (!S) return;
    rattle(false);
    S.pals.forEach((k) => ctx.letGo(k));
    if (minigame.active) minigame.stop();
    S = null;
    ctx.forceSwap(null);
  }

  return {
    /** 연출 중인지(마을에서 마무리 대사가 끝날 때까지). */
    get active() { return !!S; },
    /** 게임센터 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && ['intro', 'talk', 'game'].includes(S.kind) && S.scene !== 'swapRamen'; },
    /** 지금 단계(디버그 · 테스트용): intro · talk · game · ramen · outro. */
    get phase() { return S ? S.kind : null; },
    /** 장면 시작. scene: 'swapSlot' | 'swapRamen' | 'swapBack', done: 다 보고 마을로 돌아오면(퀘스트 마무리 대사 · 보상). */
    play(scene, done) { if (!S) begin(scene, done); },
    /** 장면 모드에서 매 프레임: 움직임이 끝나길 기다리던 다음 대사. */
    tick(dt, t) {
      if (!S) return;
      if (S.wait && !ctx.stage.busy) { const then = S.wait; S.wait = null; then(); }
      if (!S) return;
      if (S.kind === 'game' && minigame.active) minigame.update(dt);
      ctx.stage.update(dt, t);
    },
    /** 마을에서 매 프레임: 마무리 대사가 끝나면 정리. */
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.doneCalled && !guide.open && S.t > 0.3) { clear(); input.setEnabled(true); }
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() { clear(); }
  };
}
