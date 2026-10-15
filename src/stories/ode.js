import { odeDue } from '../core/quests.js';

/**
 * 사이드스토리 '오데와 함께 감옥'(원작 애니 189화: 숲에서 오데와 만났다가 다 같이 고블린들에게 붙잡혀 감옥으로 → 줄무늬 옷을 입고 감옥살이 →
 * 탈출하려고 땅을 파는 등 고군분투 → 작은 우리는 땅굴로, 오데는 정문 쇠창살을 휘어 빠져나와 고블린들과 싸운다 → 그 뒤 모몽가도 붙잡혀 간다).
 * 데이터(단계 · 보상)는 core/quests.js 의 odePrison, 장소와 장면은 world/odejail.js.
 *  1) 발견: 열흘째부터 낮에 숲 호숫가 길 옆 빈터 근처(26m)에 가면 "와작와작" — 커다란 버섯을 먹는 오데(core/quests.js 의 odeDue). 말을 걸면 시작
 *  2) 버섯을 나눠 먹다가 → 덤불에서 고블린들 → 밧줄에 꽁꽁, 감옥으로 → 줄무늬 옷 · 요리책(굽기 · 끓이기) → 감옥살이
 *  3) 땅 파기(연타): 간수 고블린이 등 돌리고 요리책을 보는 동안만 판다. 뒤돌아보면 멈추기(그때 파면 들켜서 조금 메워진다) → 땅굴이 바깥까지 뚫린다
 *  4) 오데는 어깨가 껴서 못 들어간다 → 오데가 정문 쇠창살을 쥔다 → 우리 넷의 응원(연타) → 창살 가운데가 활처럼 휜다
 *  5) 오데가 먼저 휜 틈으로 빠져나오자 고블린들이 우르르 → 싸움(타이밍: 맞히면 오데가 하나씩 붙잡아 던지고, 빗나가면 콩 맞는다)
 *     → 고블린들이 나가떨어진 뒤 우리 넷은 땅굴로 → 땅굴 끝에서 오데와 만나 숲으로 → 오데는 숲 안쪽으로
 *  6) 그날 저녁 감옥: 줄무늬 옷의 모몽가(마을에서는 다음 날 아침까지 안 보인다) → 마을(마지막 대사 · 보상은 퀘스트 done)
 * 게임에서 정한 부분(원작에서 확인하지 못함): 내가 같이 있던 것, 버섯을 나눠 먹은 것, 땅 파기 놀이 규칙(간수가 뒤돌아보면 멈추기),
 *   오데를 응원하는 연타와 싸움 타이밍 놀이, 모몽가가 붙잡혀 간 때(그날 저녁)와 다음 날 아침까지 마을에 없는 것, 대사 전부와 보상(줄무늬 죄수복과 줄무늬 모자).
 * ctx: { getState, hud, guide, sound, input, minigame, stage(장면 — 처음 들어갈 때 만든다), spot(숲속 빈터의 오데), cam, getPlayer, who(kind), narrator,
 *        fill(lines), regionAt, setMode, setCinematic, myLook, startStory(), arriveBeside(kind, x, z), letGo(kind), jailMomonga() }
 */
const NEAR = 26, FAR = 60, TALK = 2.6;
const GRACE = 0.25; // 간수가 고개를 든 뒤 이만큼은 눌러도 봐준다(늦게 반응하는 사람 기준)
const PALS = ['hachiware', 'chiikawa'];
const ODE = { kind: null, name: '오데', tag: '#f6ee9a', ink: '#6b5a1e' }; // 대화 상자 이름표(마을 친구가 아니라 하트는 없다)
const READ = '간수가 요리책을 보는 동안 몰래 파기!';

export function createOdeStory(ctx) {
  const { hud, guide, sound, input, minigame } = ctx;
  let S = null; // { kind: 'found' | 'intro' | 'talk' | 'dig' | 'pry' | 'fight' | 'outro', t, done, wait, mini, guard, force }
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const H = (text) => ({ who: ctx.who('hachiware'), text }), C = (text) => ({ who: ctx.who('chiikawa'), text });
  const U = (text) => ({ who: ctx.who('usagi'), text }), M = (text) => ({ who: ctx.who('momonga'), text }), O = (text) => ({ who: ODE, text });
  const P = () => ctx.getPlayer().position;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  /** 대사 묶음을 차례로: [[카메라, 대사, 묶음 전에 할 일?], …] → then. 카메라는 미끄러져 옮겨 간다(창살 안팎을 오갈 때는 할 일에서 바로 옮긴다 — 창살을 뚫고 지나갔다) */
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
  /** 장면 속 움직임(걷기 · 고블린 · 창살 · 달리기)이 다 끝나면 then. */
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
  // 테스트 앱: 그 장면부터 바로
  const JUMP = {
    dig: () => { ctx.stage.setPlace('jail'); ctx.stage.dress(true); ctx.stage.setMood('dig'); ctx.stage.shot('dig', true); say(['(밤마다… 나무 숟가락으로 몰래 감옥 바닥을 판다)'], dig); },
    fight: () => { ctx.stage.setPlace('jail'); ctx.stage.dress(true); ctx.stage.setMood('pry'); ctx.stage.setDig(1); ctx.stage.bendDone(); ctx.stage.shot('bars', true); S.kind = 'talk'; bent(); },
    momonga: () => momonga()
  };

  /** 숲속 빈터의 오데를 보인다(force: 테스트 앱 — 열리는 조건과 상관없이). */
  function find(force = false) {
    S = { kind: 'found', t: 0, force };
    ctx.spot.show(true);
    hud.toast('숲 안쪽에서 와작와작… 무언가 먹는 소리가 들려요', 3800);
  }

  function begin(done, from = null) {
    S = { kind: 'intro', done, wait: null, mini: false, guard: null, t: 0, doneCalled: false };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, '(숲 안쪽 빈터… 커다란 누군가가 책상다리하고 앉아 버섯을 와작와작 먹고 있다)');
    setTimeout(() => {
      if (!S) return;
      ctx.spot.show(false);
      ctx.setMode('odejail');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.myLook());
      ctx.stage.shot('ode', true);
      hud.curtain(false);
      setTimeout(() => S && (JUMP[from] || meet)(), 700);
    }, 1200);
  }

  // ---------- 숲속 빈터: 오데와 버섯 ----------
  function meet() {
    S.kind = 'talk';
    scenes([
      ['ode', ['(머리와 몸이 하나로 이어진 커다란 노란 몸… 얼굴 한가운데에 동그란 눈이 하나)', '(커다란 버섯을 와작와작 뜯어 먹고 있다)']]
    ], () => {
      ctx.stage.shot('wide');
      ctx.stage.palsArrive();
      whenStill(() => scenes([
        ['wide', [H('{name}~! 여기 있었구나! …우와, 누구야?'), C('…!! (하치와레 뒤로 쏙)'), U('…하?')]],
        ['ode', [O('……오데.'), H('오데? 이름이 오데야?'), O('…오데, 버섯 먹는다.')]]
      ], share));
    });
  }
  /** 오데가 버섯을 찢어 나눠 준다. */
  function share() {
    guide.ask('(오데가 커다란 버섯을 북 찢어 우리 쪽으로 내민다)', ['받아서 먹기'], () => {
      ctx.stage.setMood('share');
      ctx.stage.shot('wide');
      sound.play('eat');
      scenes([
        ['wide', ['(쫄깃쫄깃… 숲 냄새가 가득한 맛이다)', H('맛있다~! 고마워, 오데!'), C('…헤헤…(오물오물)'), U('야하~!'), O('…좋다.')]]
      ], goblins);
    }, ctx.narrator);
  }
  /** 덤불에서 고블린들이 튀어나와 다 같이 붙잡힌다 → 감옥으로. */
  function goblins() {
    ctx.stage.shot('goblins');
    ctx.stage.goblinsOut();
    sound.play('warn');
    whenStill(() => scenes([
      ['goblins', ['(바스락바스락… 덤불 여기저기서 연두색 무언가가 하나둘 튀어나왔다)', '(뾰족한 머리에 풀 치마… 고블린들이다!)', H('어, 어라…? 누구야~?'), '(고블린들이 우리를 빙 둘러싸고 무어라 쑥덕쑥덕…)']]
    ], () => {
      ctx.stage.capture();
      ctx.stage.shot('capture');
      sound.play('thud');
      whenStill(() => scenes([
        ['capture', ['(눈 깜짝할 사이에 밧줄이 휙휙…!)', '(오데도, 우리 넷도 밧줄에 꽁꽁…!)', C('…!! (엉엉)'), H('노, 놓아줘~! 우리 하나도 맛없어~!'), O('…….')]]
      ], () => cut('(…우리는 그대로 고블린들에게 끌려갔다)', () => {
        ctx.stage.setPlace('jail');
        ctx.stage.dress(true);
        ctx.stage.setMood('cell');
        ctx.stage.shot('cell', true);
      }, jail)));
    }));
  }

  // ---------- 고블린 감옥 ----------
  function jail() {
    scenes([
      ['cell', ['(돌벽으로 둘러싸인 어둑한 방… 앞은 굵은 쇠창살)', '(어느새 다들 줄무늬 옷에 줄무늬 모자 차림이다)', H('여기… 감옥이야…?'), C('…(덜덜)'), U('……하아.'), O('…오데도 갇혔다.')]],
      ['cook', ['(창살 밖에서 고블린 하나가 커다란 책을 펼쳐 들고 열심히 읽는다)', '(펼친 쪽에는… 「굽기」 「끓이기」…?)', H('저, 저거… 요리책 아니야…?')], () => ctx.stage.setMood('cook')],
      ['cell', [C('…!!!! (털썩)'), H('치, 치이카와~!'), U('하아?!'), O('…오데, 맛없다.'), H('…{name}, 어떻게든 여기서 나가자!')], () => { ctx.stage.setMood('cell'); ctx.stage.pose('chiikawa', 'faint'); }]
    ], () => cut('(감옥살이 이틀째… 고블린들은 꼬박꼬박 밥을 갖다주었다)', () => { ctx.stage.setMood('life'); ctx.stage.shot('cell', true); }, life));
  }
  function life() {
    scenes([
      ['cell', ['(나무 그릇에 담긴 죽을 받아 먹으며, 다 같이 감옥살이를 견뎠다)', H('밥은… 생각보다 맛있네~'), C('…우리 살찌우려는 거… 아닐까…'), H('…앗.'), U('……푸루루.')]],
      ['dig', ['(그날 밤부터 몰래… 나무 숟가락으로 감옥 바닥을 파기로 했다!)', H('간수 고블린이 등 돌리고 요리책 볼 때만 파는 거야!'), H('뒤돌아보면… 꼼짝 마~!')], () => { ctx.stage.setMood('dig'); ctx.stage.shot('dig', true); }]
    ], dig);
  }
  /** 땅 파기(연타): 간수가 요리책을 보는 동안만. 고개를 들었을 때 파면 들켜서 조금 메워진다. */
  function dig() {
    if (!S) return;
    S.kind = 'dig';
    S.mini = true;
    S.guard = { phase: 'read', t: 0, next: 2.0 };
    ctx.stage.setMood('dig');
    ctx.stage.guard('read');
    ctx.stage.digging(true);
    // 45번쯤 눌러야 다 판다(1초에 5번이면 9초 — 그동안 간수가 세 번쯤 고개를 든다. 0.05 로 했더니 간수가 고개를 들기도 전에 끝났다)
    minigame.mash({
      label: READ, button: '파기!', gain: 0.022, decay: 0, loss: 0.15,
      onPress: () => !(S.guard.phase === 'look' && S.guard.t > GRACE),
      onCaught: () => { ctx.stage.guard('caught'); sound.play('warn'); S.guard = { phase: 'look', t: GRACE, next: 1.4 }; },
      onTick: (p) => ctx.stage.setDig(p),
      onDone: () => { S.mini = false; S.guard = null; ctx.stage.guard(null); ctx.stage.digging(false); setTimeout(() => S && through(), 500); }
    });
  }
  /** 간수: 등 돌리고 요리책(1.8 ~ 3.4초) → 갸웃하며 반쯤 돈다(0.9초, 아직 파도 된다) → 감옥을 돌아본다(1.5 ~ 2.3초) → 다시 요리책. */
  function guardTick(dt) {
    const g = S.guard;
    if (!g) return;
    g.t += dt;
    if (g.t < g.next) return;
    if (g.phase === 'read') {
      S.guard = { phase: 'warn', t: 0, next: 0.9 };
      ctx.stage.guard('warn');
      minigame.setLabel('앗… 간수가 뒤돌아본다!', 'warn');
      sound.play('warn');
    } else if (g.phase === 'warn') {
      S.guard = { phase: 'look', t: 0, next: 1.5 + Math.random() * 0.8 };
      ctx.stage.guard('look');
      ctx.stage.digging(false);
      minigame.setLabel('꼼짝 마! 지금 파면 들킨다', 'alert');
    } else {
      S.guard = { phase: 'read', t: 0, next: 1.8 + Math.random() * 1.6 };
      ctx.stage.guard('read');
      ctx.stage.digging(true);
      minigame.setLabel(READ);
    }
  }
  /** 푹! 땅굴이 바깥까지 뚫렸다 → 오데는 어깨가 껴서 못 들어간다 → 오데가 정문 창살을 쥔다(우리 넷은 땅굴 옆에서 응원). */
  function through() {
    S.kind = 'talk';
    ctx.stage.holeThrough();
    sound.play('pass');
    scenes([
      ['dig', ['(…푹! 숟가락 끝이 흙을 뚫고, 구멍 저편에서 바깥바람이 솔솔 들어왔다)', H('뚫렸다~!!'), C('…!! (반짝반짝)'), U('우라!')]],
      ['dig', [H('오데도 같이 가자!'), '(오데가 구멍에 발을 넣어 보았지만… 어깨부터 꽉 끼었다)', O('……오데, 안 들어간다.'), O('오데는 정문으로 간다.'), H('저, 정문…? 쇠창살인데…?')]],
      ['bars', ['(오데가 성큼성큼 정문 쇠창살 앞으로 가더니, 굵은 쇠창살 두 줄을 꽉 움켜쥐었다)', H('오데, 힘내~!')], () => { ctx.stage.setMood('pry'); ctx.stage.shot('bars', true); }]
    ], pry);
  }
  /** 오데가 정문 창살을 휜다(응원 연타). */
  function pry() {
    if (!S) return;
    S.kind = 'pry';
    S.mini = true;
    ctx.stage.roar(true);
    minigame.mash({
      label: '오데 힘내! 연타로 응원하기', button: '영차!', gain: 0.07, decay: 0.1,
      onTick: (p) => ctx.stage.pry(p),
      onDone: () => { S.mini = false; ctx.stage.bendDone(); sound.play('thud'); whenStill(bent); }
    });
  }
  /** 창살 가운데가 활처럼 휘었다 → 오데가 먼저 틈으로 빠져나오자 고블린들이 우르르(우리 넷은 감옥 안 땅굴 옆에서 응원). */
  function bent() {
    S.kind = 'talk';
    ctx.stage.roar(true);
    scenes([
      ['bars', ['(끼기기기긱…!!)', '(굵은 쇠창살 가운데가 엿가락처럼 양옆으로 휘어, 틈이 쩍 벌어졌다!)', O('…오데, 힘 세다.')]]
    ], () => {
      ctx.stage.shot('fight');
      ctx.stage.odeOut();
      whenStill(() => scenes([
        ['fight', ['(오데가 휜 창살 틈으로 비집고 나와, 감옥 밖에 우뚝 섰다!)']]
      ], () => {
        ctx.stage.goblinsRush();
        sound.play('warn');
        whenStill(() => scenes([
          ['fight', ['(그때… 소란을 들은 고블린들이 오데에게 우르르 몰려왔다!)', O('……덤벼라.'), '(오데가 입을 네모나게 쩍 벌리고 고블린들 앞에 버티고 섰다!)']]
        ], fight));
      }));
    });
  }
  /** 싸움(타이밍): 초록 칸에서 누르면 오데가 덤벼든 고블린을 붙잡아 휙 던지고, 빗나가면 고블린한테 콩 맞는다. */
  function fight() {
    if (!S) return;
    S.kind = 'fight';
    S.mini = true;
    minigame.timing({
      label: '고블린이 덤벼들 때 초록 칸에서! 오데가 붙잡아 던진다', button: '던져!', need: 4, zone: [0.38, 0.62], speed: 0.75, grow: 0.06,
      onHit: (n) => { ctx.stage.throwGoblin(n - 1); sound.play('hit'); },
      onMiss: () => { ctx.stage.goblinBonk(); sound.play('swing'); },
      onDone: () => { S.mini = false; setTimeout(() => S && whenStill(won), 900); }
    });
  }
  /** 고블린들이 나가떨어졌다 → 그제야 우리 넷도 땅굴로 쏙쏙 → 땅굴 끝에서 오데와 만나 숲으로. */
  function won() {
    S.kind = 'talk';
    ctx.stage.goblinsFlee();
    scenes([
      ['fight', ['(휘익~ 쿵! 고블린들이 하나둘 나가떨어졌다)', '(남은 고블린은 허둥지둥 도망쳤다)', O('…오데, 이겼다.')]],
      ['dig', [H('지금이야! 우리도 땅굴로~!'), U('야하~!')], () => ctx.stage.shot('dig', true)]
    ], () => {
      ctx.stage.intoHole();
      whenStill(() => scenes([
        ['dig', ['(우리는 하나씩 땅굴 속으로 쏙쏙 들어갔다)']]
      ], outCut));
    });
  }
  /** 땅굴 끝 → 숲길로. */
  function outCut() {
    cut('(…땅굴 끝에서 빠져나온 우리 넷은 오데와 만나, 줄무늬 옷차림 그대로 숲으로 냅다 달렸다!)', () => {
      ctx.stage.roar(false);
      ctx.stage.setPlace('forest');
      ctx.stage.setMood('out');
      ctx.stage.shot('wide', true);
    }, out);
  }
  /** 숲길: 숨을 고르고, 오데는 숲 안쪽으로 떠난다. */
  function out() {
    scenes([
      ['wide', [H('하아… 하아… 살았다~'), C('…(훌쩍)…무서웠어…'), O('…오데, 간다.')]]
    ], () => {
      ctx.stage.odeLeave();
      whenStill(() => scenes([
        ['wide', ['(오데는 어깨를 한 번 으쓱하고, 숲 안쪽으로 성큼성큼 사라졌다)', H('잘 가, 오데~! 고마워~!'), U('야하~!')]]
      ], momonga));
    });
  }
  /** 그날 저녁 감옥: 줄무늬 옷을 입은 모몽가. */
  function momonga() {
    cut('(…그날 저녁, 숲속 고블린 감옥)', () => {
      ctx.stage.setPlace('jail');
      ctx.stage.repairBars();
      ctx.stage.dress(true);
      ctx.stage.setMood('momonga');
      ctx.stage.shot('momonga', true);
    }, () => scenes([
      ['momonga', ['(새로 고친 쇠창살 안에… 줄무늬 옷을 입은 누군가가 앉아 있다)', M('…야!! 여기서 꺼내! 나 엄청 귀엽잖아!'), '(창살 밖 고블린은 요리책만 휙휙 넘긴다)', M('…흥!! 꺼내 줄 때까지 계속 소리칠 거야!!')]]
    ], outside));
  }

  /** 마을로: 숲속 빈터 앞, 하치와레 · 치이카와가 옆에. 모몽가는 다음 날 아침까지 감옥. 마지막 대사 · 보상은 퀘스트 done. */
  function outside() {
    hud.curtain(true, '(…줄무늬 옷과 모자는 기념으로 챙겨 왔다)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('play');
      ctx.jailMomonga();
      const p = ctx.getPlayer(), at = ctx.spot.front;
      if (p) {
        p.setPosition(at.x, at.z);
        p.face(ctx.spot.spot.x, ctx.spot.spot.z);
        ctx.cam.snap(p.position);
        PALS.forEach((k, i) => ctx.arriveBeside(k, p.position.x + (i ? -1.2 : 1.2), p.position.z + 0.4));
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
    /** 연출 중인지(장면 · 마을에서 마무리 대사가 끝날 때까지 — 숲에서 오데를 찾아 둔 것만으로는 아니다). */
    get active() { return !!S && S.kind !== 'found'; },
    /** 숲속 빈터 · 감옥 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && ['intro', 'talk', 'dig', 'pry', 'fight'].includes(S.kind); },
    /** 지금 단계(디버그 · 테스트용): found · intro · talk · dig · pry · fight · outro. */
    get phase() { return S ? S.kind : null; },
    /** 0.3초마다(한가할 때): 숲에서 빈터 근처면 버섯을 먹는 오데가 보인다. */
    tryDiscover() {
      const s = ctx.getState();
      if (S || !s || !odeDue(s)) return;
      const p = P();
      if (ctx.regionAt(p.x, p.z) !== 'forest' || dist(p, ctx.spot.spot) > NEAR) return;
      find();
    },
    /** 테스트 앱: 열리는 조건과 상관없이 숲속 빈터에 오데를 보인다. */
    find() { if (!S) find(true); },
    /** 오데 앞이면 행동 안내. */
    target(p) {
      if (!S || S.kind !== 'found' || dist(p, ctx.spot.spot) > TALK) return null;
      return { type: 'ode', label: '말 걸기', x: ctx.spot.spot.x, z: ctx.spot.spot.z, r: 1.0, y: 2.5 };
    },
    /** 행동 버튼(오데 앞): 이야기를 받고 바로 장면. */
    press() { if (S && S.kind === 'found') { S = null; ctx.startStory(); } },
    /** 장면 시작. done: 다 보고 마을로 돌아오면(퀘스트 마무리 대사 · 보상), from: 테스트 앱이 그 장면부터('dig' · 'fight' · 'momonga'). */
    play(done, from = null) { if (!S || S.kind === 'found') begin(done, from); },
    /** 장면 모드에서 매 프레임: 움직임이 끝나길 기다리던 다음 대사 · 땅 파기 · 응원 연타 · 싸움 타이밍. */
    tick(dt, t) {
      if (!S) return;
      if (S.wait && !ctx.stage.busy) { const then = S.wait; S.wait = null; then(); }
      if (!S) return;
      if (S.mini) { minigame.update(dt); if (S.kind === 'dig') guardTick(dt); }
      ctx.stage.update(dt, t);
    },
    /** 마을에서 매 프레임: 찾아 둔 오데는 멀어지거나 때가 지나면 숨기고, 마무리 대사가 끝나면 정리. */
    update(dt) {
      if (!S) return;
      S.t += dt;
      if (S.kind === 'found') {
        const s = ctx.getState();
        if (!s || (!S.force && !odeDue(s)) || dist(P(), ctx.spot.spot) > FAR) { ctx.spot.show(false); S = null; }
        return;
      }
      if (S.kind === 'outro' && S.doneCalled && !guide.open && S.t > 0.3) { PALS.forEach((k) => ctx.letGo(k)); input.setEnabled(true); S = null; }
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() {
      if (S && S.mini) minigame.stop();
      if (S && S.kind !== 'found') PALS.forEach((k) => ctx.letGo(k));
      ctx.spot.show(false);
      S = null;
    }
  };
}
