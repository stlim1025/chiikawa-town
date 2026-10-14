/**
 * 사이드스토리 '위스키 봉봉'(원작 2025년 1월 연재분: 우사기가 숲에서 찾은 신기한 초콜릿을 셋이 먹고 취한다 →
 * 산책하던 포셰트 갑옷 씨가 "무면허 음주?!" 했다가 위스키 봉봉인 걸 알고 "초콜릿이면 세이프!" → 그래도 너무 취한 것 같아
 * 덩굴을 당기자 머리에서 덩굴이 자란 새하얀 큰 뱀이 나와 치이카와를 발끝부터 삼킨다 → 하치와레 · 우사기는 취권 자세로 나섰다가
 * 서로 장난치다 같이 삼켜진다 → 갑옷 씨가 너클 더스터를 끼고 구해 안고 달린다 → 하치와레 "뒤꿈치 각질이 나았어!" →
 * 셋은 계속 취해 시끌벅적, 우사기는 마지막 봉봉까지 먹고 신나서 뛰어간다).
 * 데이터(부탁 · 보상)는 core/quests.js 의 whiskeyBonbon, 장면은 world/bonbon.js.
 *  1) 덩굴의 초콜릿을 따 먹는다(따도 또 열린다) → 2) 배 두드리기(박자) → 취해서 깔깔 → 3) 포셰트 갑옷 씨 등장
 *  4) 덩굴을 당기자 큰 뱀 → 치이카와 · 하치와레 · 우사기가 꿀꺽 → 5) 취권 펀치(흔들리는 바늘 타이밍) 세 번에 한 명씩 퉤
 *  6) 숲 밖으로 → 뒤꿈치 · 우사기가 뛰어간다 → 마을(마지막 대사 · 보상은 퀘스트 done)
 * 게임에서 정한 부분(원작에서 확인하지 못함): 나도 같이 먹고 취한 것, 배 두드리기 박자 놀이, 나와 갑옷 씨가 함께 치는 취권 펀치(원작은 갑옷 씨 혼자),
 *   펀치마다 한 명씩 뱉어 내는 것, 마을로 돌아온 뒤 대사와 보상.
 * ctx: { hud, guide, sound, input, rhythm, minigame, stage(장면 — 처음 들어갈 때 만든다), cam, getPlayer, who(kind), narrator, fill(lines),
 *        setMode, setCinematic, myLook, front(숲길 옆 덩굴 — spot), arriveBeside(kind, x, z), letGo(kind) }
 */
const BPM = 104;
const chart = (bars) => { const out = []; bars.forEach((beats, n) => beats.forEach((b) => out.push(4 + n * 4 + b))); return out; };
const DRUM = chart([[0, 2], [0, 2, 3], [0, 1, 2, 3], [0, 2, 3], [0, 1, 2, 3], [0, 1, 2, 2.5, 3]]);
const BONBON_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="13" fill="#6b3f26" stroke="#3e2416" stroke-width="2.4"/><ellipse cx="20" cy="15" rx="8" ry="4" fill="#8a5636"/><circle cx="15" cy="19" r="2.6" fill="#fff" opacity=".55"/><path d="M20 9V5" stroke="#4f7a3a" stroke-width="2.4" stroke-linecap="round"/></svg>';
const SPIT = ['chiikawa', 'hachiware', 'usagi']; // 펀치가 맞을 때마다 이 차례로 퉤
const PALS = ['hachiware', 'chiikawa'];
const good = (rank) => rank === 'S' || rank === 'A';

export function createBonbonStory(ctx) {
  const { hud, guide, sound, input, rhythm, minigame } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const H = (text) => ({ who: ctx.who('hachiware'), text }), C = (text) => ({ who: ctx.who('chiikawa'), text });
  const U = (text) => ({ who: ctx.who('usagi'), text }), P = (text) => ({ who: ctx.who('pochette'), text });
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
  /** 장면 속 움직임(걷기 · 큰 뱀 · 뱉기)이 다 끝나면 then. */
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
    S = { kind: 'intro', done, wait: null, rank: null, beat: false, eighth: -1, mini: false, t: 0, doneCalled: false };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, '(서쪽 숲 깊은 곳… 덩굴에 동그란 초콜릿이 주렁주렁 열려 있다)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('bonbon');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.myLook());
      ctx.stage.shot('vine', true);
      hud.curtain(false);
      setTimeout(() => S && feast(), 700);
    }, 1200);
  }
  /** 1) 따 먹기: 따도 따도 또 열린다. 다들 조금씩 얼굴이 빨개진다. */
  function feast() {
    S.kind = 'talk';
    const pick = () => { ctx.stage.pick(); sound.play('snap'); };
    scenes([
      ['vine', ['(덩굴마다 동그란 초콜릿이 주렁주렁…)', U('야하! (하나 똑 따서 덥석)')], pick],
      ['vine', [H('나도 먹어 볼래~ …음? 안에 뭔가 말랑한 게 들었어!'), C('…(냠)…!! (반짝반짝)')], pick],
      ['vine', ['(나도 하나 먹어 보았다. 달콤 쌉싸름… 그리고 속이 살짝 화끈!)', H('헤헤~ 따도 따도 또 열려~!'), '(딴 자리에 금세 새 초콜릿이 몽글몽글 열린다)'], () => { pick(); ctx.stage.drunk(0.25); }],
      ['drum', [H('♪ 초콜릿~ 따도 또 열려~ 맛있어서 행복해~ ♪'), U('(배를 통통 두드린다) 우라!'), H('{name}도 같이! 박자 맞춰 배 두드리자~!')],
        () => { ctx.stage.setMood('drum'); ctx.stage.notes(true); ctx.stage.drunk(0.4); }]
    ], drum);
  }
  /** 2) 배 두드리기(박자): 하치와레가 흥얼거리면 다 같이 통통. */
  function drum() {
    if (!S) return;
    S.kind = 'drum';
    S.beat = true;
    S.eighth = -1;
    rhythm.start({
      bpm: BPM, chart: DRUM, label: '흥얼흥얼 배 두드리기', hint: '초콜릿이 동그라미 한가운데에 올 때 <kbd>Space</kbd> 또는 탭!', go: '통!', icon: BONBON_SVG,
      onHit: () => { ctx.stage.drum(); sound.play('kick'); },
      onEnd: (res) => { S.rank = res.rank; S.beat = false; setTimeout(() => S && tipsy(), 500); }
    });
  }
  function tipsy() {
    S.kind = 'talk';
    ctx.stage.notes(false);
    scenes([
      [null, good(S.rank) ? ['(배 두드리는 소리가 숲에 통통 울려 퍼졌다)', H('아하하하~ 최고야~!')] : ['(박자는 엉망진창이지만… 다들 마냥 즐겁다)', H('아하하~ 엉망진창이야~!')]],
      ['drum', ['(하치와레가 벌러덩 누워 깔깔 구른다)', H('초콜릿이 너무 맛있어서 행복해~'), C('…헤헤…(발그레)'), U('푸루루루~'),
        H('근데… 술 마시면 이런 기분일까~?'), '(…다들 얼굴이 이미 새빨갛다. 아무도 눈치채지 못했다)'], () => { ctx.stage.setMood('tipsy'); ctx.stage.drunk(0.85); }]
    ], found);
  }
  /** 3) 산책하던 포셰트 갑옷 씨: "무면허 음주?!" → 위스키 봉봉 → "초콜릿이면 세이프!" → 그래도 이상해서 덩굴을 당긴다. */
  function found() {
    ctx.stage.setMood('found');
    ctx.stage.shot('found');
    ctx.stage.pochetteCome();
    whenStill(() => scenes([
      ['found', [P('(콧노래를 부르며 산책 중) …어머? 다들 여기서 뭐 해요?'), '(우리 넷은 서로 기대어 휘청휘청 인사했다)', H('갑옷 씨다~ 안녕하세요~ (비틀)'),
        P('어머나… 얼굴이 새빨개요! 설마… 무, 무면허 음주?!')]],
      ['found', [U('(초콜릿을 입에 가득 넣고 와작와작)'), P('…잠깐만요, 그 초콜릿… 위스키 봉봉이잖아요!'), P('……초콜릿이면 세이프! (휴우)')]],
      ['found', [P('그래도… 다들 너무 취한 것 같은데요…?'), P('이 덩굴, 뭔가 이상해요. 어디서 자라는 거지…?')]]
    ], () => {
      ctx.stage.shot('pull');
      ctx.stage.pochetteTo(-0.95, -0.85, [0, -1.4]); // 덩굴 앞으로 걸어가 잡는다
      whenStill(() => scenes([['pull', ['(포셰트 갑옷 씨가 초콜릿 덩굴을 꽉 잡고… 영차! 잡아당겼다…)']]], rise));
    }));
  }
  /** 4) 큰 뱀이 솟아오르고 치이카와를 꿀꺽 → 하치와레 · 우사기의 취권(…장난) → 둘도 꿀꺽. */
  function rise() {
    ctx.stage.setMood('snake');
    ctx.stage.shot('snake');
    ctx.stage.snake('rise');
    sound.play('growl');
    whenStill(() => scenes([
      ['snake', ['(땅이 들썩… 머리에서 덩굴이 자란 새하얀 큰 뱀이 솟아올랐다!)', P('꺄아아악! 배, 뱀이에요!!'), '(초콜릿 덩굴은… 큰 뱀의 머리에서 자라고 있었다)', C('…헤헤…(비틀비틀 큰 뱀 쪽으로)')]]
    ], () => {
      ctx.stage.swallow('chiikawa');
      sound.play('eat');
      whenStill(() => scenes([
        ['snake', ['(큰 뱀이 치이카와를 발끝부터 꿀꺽꿀꺽…)', C('…(느긋)…'), P('치, 치이카와 님!! 누, 누가 좀 도와주세요~!!')]],
        ['fist', [H('우리가 해치울게~! 취권이다~!'), U('우라! (비틀)')], () => ctx.stage.setMood('fistUp')],
        ['fist', ['(…둘은 신이 나서 서로 툭툭, 장난만 친다)', H('아하하~ 간지러워~'), P('지, 지금 장난칠 때가 아니에요~!!')], () => ctx.stage.setMood('fist')]
      ], () => {
        ctx.stage.swallow('hachiware');
        sound.play('eat');
        whenStill(() => {
          ctx.stage.swallow('usagi');
          sound.play('eat');
          whenStill(() => scenes([
            ['snake', ['(큰 뱀이 하치와레랑 우사기도 꿀꺽…!)', P('으아앙… 셋 다 먹혔어요…!'), P('{name} 님! 같이 구해요!')]],
            ['fight', ['(포셰트 갑옷 씨가 너클 더스터를 끼었다…!)', P('무, 무섭지만… 제가 할게요…!'), '(나도 주먹을 쥐었다. 흔들흔들… 이것이 취권…?)'],
              () => { ctx.stage.setMood('fight'); ctx.stage.knuckle(true); }]
          ], fight));
        });
      }));
    }));
  }
  /** 5) 취권 펀치: 흔들리는 바늘이 초록 칸에 왔을 때. 맞힐 때마다 나와 갑옷 씨가 치고, 큰 뱀이 한 명씩 퉤. */
  function fight() {
    if (!S) return;
    S.kind = 'fight';
    S.mini = true;
    minigame.timing({
      label: '흔들흔들 취권 펀치! 초록 칸에서', button: '펀치!', need: 3, zone: [0.4, 0.6], speed: 0.85, grow: 0.06, wobble: 0.55,
      onHit: (n) => {
        ctx.stage.punch('me');
        sound.play('hit');
        setTimeout(() => { if (!S) return; ctx.stage.punch('pochette', SPIT[n - 1]); sound.play('thud'); }, 380);
      },
      onMiss: () => { ctx.stage.dodge(); sound.play('swing'); },
      onDone: () => { S.mini = false; setTimeout(() => S && whenStill(rescued), 900); }
    });
  }
  function rescued() {
    S.kind = 'talk';
    scenes([['fight', ['(퉤! 큰 뱀이 셋을 모두 뱉어 냈다!)', P('지금이에요! 도망쳐요~!!')]]], () => {
      ctx.stage.snake('sink');
      sound.play('growl');
      cut('(포셰트 갑옷 씨가 셋을 품에 안고 숲 밖까지 내달렸다…!)', () => {
        ctx.stage.knuckle(false);
        ctx.stage.setMood('escape');
        ctx.stage.shot('escape', true);
      }, epilogue);
    });
  }
  /** 6) 숲 밖: 하치와레의 반들반들 뒤꿈치 · 계속 취한 셋 · 마지막 봉봉까지 먹고 뛰어가는 우사기. */
  function epilogue() {
    scenes([
      ['escape', ['(하아… 하아… 큰 뱀에게서 겨우 도망쳤다)', H('……앗.'), P('왜, 왜 그래요? 어디 다쳤어요?'), H('뒤꿈치 각질이… 나았어! 반들반들~'), P('…네에?')]],
      ['escape', [H('아하하~ 갑옷 씨 최고~!'), C('…헤헤…(꾸벅꾸벅)'), '(셋은 아직도 취해서 시끌벅적…)', P('이대로 두고 가도 될까요…'),
        U('우라라라 푸루루루 야하 우라 하아 푸루루…!!'), P('우, 우사기 님…? 무슨 말인지 하나도 모르겠어요~!')]],
      ['escape', [P('어머, 우사기 님 손에 아직 봉봉이 하나 남았네요.'), P('혹시 누가 의심하면 이 초콜릿을 보여 주세요. 초콜릿이면 세이프니까요!'),
        '(우사기는 그 봉봉을 냉큼 입에 넣었다)', U('야하~~!!')]]
    ], () => {
      ctx.stage.usagiRun();
      whenStill(() => scenes([[null, ['(…그러고는 신나서 숲 밖으로 뛰어가 버렸다)', P('아, 우사기 니임~!!')]]], outside));
    });
  }
  /** 마을로: 숲길 옆 덩굴 앞, 하치와레 · 치이카와가 옆에(아직 발그레). 마지막 대사 · 보상은 퀘스트 done. */
  function outside() {
    hud.curtain(true, '(…포셰트 갑옷 씨는 가게로 돌아가고, 우리는 비틀비틀 마을 쪽으로)');
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
    /** 숲속 빈터 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && ['intro', 'talk', 'drum', 'fight'].includes(S.kind); },
    /** 지금 단계(디버그 · 테스트용): intro · talk · drum · fight · outro. */
    get phase() { return S ? S.kind : null; },
    /** 장면 시작. done: 다 보고 마을로 돌아오면(퀘스트 마무리 대사 · 보상). */
    play(done) { if (!S) begin(done); },
    /** 숲속 빈터 모드에서 매 프레임: 움직임이 끝나길 기다리던 다음 대사 · 박자 · 펀치 · 장면. */
    tick(dt, t) {
      if (!S) return;
      if (S.wait && !ctx.stage.busy) { const then = S.wait; S.wait = null; then(); }
      if (!S) return;
      if (S.mini) minigame.update(dt);
      if (rhythm.active) {
        rhythm.update();
        const tt = rhythm.time;
        if (S.beat && tt != null) { const e = Math.floor(tt / (30 / BPM)); if (e !== S.eighth) { S.eighth = e; if (e % 2 === 0) sound.play('hat'); } }
      }
      ctx.stage.update(dt, t);
    },
    /** 행동 버튼(박자 화면 · 펀치 화면도 스스로 스페이스 · 탭을 받는다): 배 두드리기. */
    press() { if (S && rhythm.active) rhythm.press(); },
    /** 마을에서 매 프레임: 마무리 대사가 끝나면 정리. */
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.doneCalled && !guide.open && S.t > 0.3) { PALS.forEach((k) => ctx.letGo(k)); input.setEnabled(true); S = null; }
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() {
      if (S && S.mini) minigame.stop();
      if (S && rhythm.active) rhythm.stop();
      if (S) PALS.forEach((k) => ctx.letGo(k));
      S = null;
    }
  };
}
