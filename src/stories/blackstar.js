import { buildAlarmClock } from '../world/chiiroom.js';

/**
 * 사이드스토리 '검은 별똥별' 연출. 데이터(부탁 · 단계)는 core/quests.js 의 blackStar, 되풀이 규칙은 core/blackstar.js,
 * 치이카와네 방은 world/chiiroom.js. 원작: 하치와레가 「소원을 들어주지만 찜찜해진다」는 검은 별똥별 소문을 꺼내고,
 * 치이카와는 큰 자명종을 산다. 별밤에 풀을 뽑으며 "이런 날이 계속됐으면 좋겠다" → 그 말 그대로 같은 날이 되풀이된다.
 *  - wish     들판 별밤 풀 뽑기 · 소원 · 까만 별똥별이 하늘을 가로지른다 → 내일이 되풀이되는 날
 *  - morning  치이카와네 집 앞: 새 자명종 · 하치와레의 기념사진(구석에 까만 얼룩)
 *  - dejavu   (되돌아온 같은 아침) 똑같은 말 · 똑같은 사진 → 치이카와도 기억하고 있다
 *  - watch    치이카와네 방 밤 12시: 자명종에서 검은 별똥별이 나와 흥얼거리며 "해피?" → 시곗바늘을 거꾸로
 *  - sleepover 하치와레 · 우사기랑 같이 지켜도 우사기의 "우라!"는 빗나가고, 다 같이 잠든다 → 또 같은 아침
 *  - soak     산소 표백제 대야: "해피잖아?!" 매달려도 치이카와는 내일을 고른다 → 보글보글 휘젓기(연타) → "바이"
 *  - rain     비 오는 어두운 아침: 진짜 내일이 왔다. 안도의 눈물 · 하치와레랑 우사기 · 들판의 모몽가(매일 똑같으면 최고)
 * 게임에서 정한 부분: 검은 별똥별의 생김새, 나도 치이카와와 함께 기억한다는 것, 별의 대사 일부, 들판 풀 뽑기를 동쪽 들판에서 한 것.
 * 별이 부르는 노래는 가사 없이 흥얼거림으로만.
 * ctx: { hud, guide, sound, input, npcs, staged, ui, getPlayer, who(kind), narrator, fill(lines), setMode, setCinematic, myLook,
 *        stage(치이카와네 방 — 처음 들어갈 때 만든다), villageScene, minigame, homeOf(kind),
 *        startLoop(), markLoop(), endLoop(), rewindNow(), nudgeSearch(), setRain(on) }
 */
const STAR = { kind: 'blackstar', name: '검은 별똥별', tag: '#3a3348', ink: '#efe9ff' };
const VILLAGE_SCENES = ['wish', 'morning', 'dejavu', 'rain'];

export function createBlackStarStory(ctx) {
  const { hud, guide, sound, input, npcs, staged } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const H = () => ctx.who('hachiware'), C = () => ctx.who('chiikawa'), U = () => ctx.who('usagi'), M = () => ctx.who('momonga');
  /** 차례로: 대사 묶음(배열)은 말하고, 함수는 (next) 를 받아 연출 뒤에 부른다. */
  const seq = (list, then) => {
    const next = (i) => {
      if (!S) return;
      if (i >= list.length) { then(); return; }
      const it = list[i];
      if (typeof it === 'function') it(() => next(i + 1));
      else say(it, () => next(i + 1));
    };
    next(0);
  };

  function fresh(kind, done) {
    S = { kind, done, staged: [], wait: null, mini: false, rain: false, prop: null };
    input.setEnabled(false);
    hud.setAction(null);
  }
  // ---------- 마을 장면: 친구를 그 자리에 세우고 몸짓 ----------
  function stand(k, x, z, anim, face) {
    const n = npcs.byKind(k);
    if (!n) return;
    staged.add(k);
    npcs.comeOut(n, x, z);
    npcs.act(n, anim, { face, time: 9999 });
    if (!S.staged.includes(k)) S.staged.push(k);
  }
  function act(k, anim, face) { const n = npcs.byKind(k); if (n) npcs.act(n, anim, { face, time: 9999 }); }
  function releaseAll() {
    for (const k of S.staged) { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); }
    S.staged = [];
  }
  /** 밤하늘을 가로지르는 까만 별똥별(화면 위쪽). */
  function blackStreak() {
    const el = document.createElement('div');
    el.className = 'black-streak';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i></i>';
    ctx.ui.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
  /** 찰칵! 하얗게 번쩍. */
  function photoFlash() {
    const el = document.createElement('div');
    el.className = 'photo-flash';
    el.setAttribute('aria-hidden', 'true');
    ctx.ui.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
  /** 비 오는 아침: 마을에 진짜 비(world/weather.js — 빗줄기 · 물방울 고리 · 잿빛 하늘). */
  function rain(on) {
    if (!S || S.rain === on) return;
    S.rain = on;
    ctx.setRain(on);
  }
  /** 치이카와 옆에 놓는 자명종 소품(마을). */
  function clockProp(x, z) {
    const c = buildAlarmClock();
    c.group.scale.setScalar(0.85);
    c.group.position.set(x, 0.45, z);
    ctx.villageScene.add(c.group);
    S.prop = c.group;
  }
  function end() {
    if (!S) return;
    const done = S.done;
    releaseAll();
    rain(false);
    if (S.prop) ctx.villageScene.remove(S.prop);
    ctx.minigame.stop();
    ctx.setCinematic(false);
    S = null;
    if (done) done();
  }

  // ---------- 1. 별밤 풀 뽑기 · 소원 ----------
  function wish(done) {
    fresh('wish', done);
    ctx.setCinematic(true);
    const p = ctx.getPlayer().position, me = { x: p.x, z: p.z };
    stand('hachiware', p.x + 1.4, p.z - 0.2, 'pull', me);
    stand('chiikawa', p.x - 1.4, p.z - 0.1, 'pull', me);
    seq([
      ['(별이 쏟아질 듯한 밤. 셋이서 나란히 풀을 뽑는다…)', { who: H(), text: '밤에 하는 풀 뽑기도 좋다~ 시원하고, 별도 예쁘고!' }, { who: C(), text: '…(끄덕끄덕)' }],
      (next) => { act('hachiware', 'gaze'); act('chiikawa', 'gaze'); setTimeout(() => S && next(), 900); },
      [{ who: H(), text: '이런 날이… 쭉 계속됐으면 좋겠다~' }, { who: C(), text: '…(나도…)' }],
      (next) => { blackStreak(); sound.play('chime'); setTimeout(() => S && next(), 1800); },
      ['(그때, 밤하늘을 까만 별똥별 하나가 스윽 가로질렀다…)', { who: H(), text: '어? 방금… 까만 별똥별?' }, { who: C(), text: '…?' }, { who: H(), text: '에이~ 잘못 봤나 봐! 헤헤.' }]
    ], () => { ctx.startLoop(); end(); });
  }

  // ---------- 2 · 3. 치이카와네 집 앞: 새 자명종 · 기념사진(되돌아온 아침엔 똑같이) ----------
  function morning(done, again) {
    fresh(again ? 'dejavu' : 'morning', done);
    ctx.setCinematic(true);
    const home = ctx.homeOf('chiikawa'), p = ctx.getPlayer().position, me = { x: p.x, z: p.z };
    const cx = home.x, cz = home.z + 0.9;
    stand('chiikawa', cx, cz, again ? 'shy' : 'hop', me);
    stand('hachiware', p.x + 1.5, p.z + 0.2, 'wave', { x: cx, z: cz });
    clockProp(cx + 0.7, cz + 0.2);
    const snap = (next) => { act('hachiware', 'pose', { x: cx, z: cz }); photoFlash(); sound.play('chime'); setTimeout(() => S && next(), 800); };
    if (!again) {
      seq([
        ['(치이카와가 커다란 빨간 자명종을 안고 나왔다)', { who: C(), text: '…! (짜잔)' }, { who: H(), text: '우와~ 진짜 크다! 소리도 엄청 크겠다~' }, { who: H(), text: '기념사진 찍자! 자, 찰칵!' }],
        snap,
        ['(…사진 구석에 까만 얼룩 같은 게 찍혔다?)', { who: H(), text: '어라? 렌즈에 뭐가 묻었나~' }, { who: H(), text: '이따 경품 추첨 돌리러 가자! 뭐가 나올까~?' }, { who: C(), text: '…! (두근두근)' }]
      ], () => { ctx.markLoop(); end(); });
    } else {
      seq([
        ['(치이카와가 커다란 빨간 자명종을 안고 나왔다… 어제랑 똑같이)', { who: C(), text: '…(부들부들)' }, { who: H(), text: '우와~ 진짜 크다! 소리도 엄청 크겠다~' }, '(…이 말, 어제도 들었는데?)', { who: H(), text: '기념사진 찍자! 자, 찰칵!' }],
        snap,
        ['(사진 구석에 또 까만 얼룩…)', { who: H(), text: '어라? 렌즈에 뭐가 묻었나~' }, { who: H(), text: '이따 경품 추첨 돌리러 가자! 뭐가 나올까~?' }, { who: C(), text: '…(휴지… 또 휴지가 나올 거야…)' },
          '(치이카와가 나를 올려다본다. 치이카와도… 기억하고 있다!)', { who: C(), text: '…!! (밤 12시에… 자명종을…)' }]
      ], () => { ctx.markLoop(); end(); });
    }
  }

  // ---------- 치이카와네 방(따로 그리는 장면) ----------
  function enterRoom(text, mood, then) {
    hud.curtain(true, text);
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('chiiroom');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.myLook());
      ctx.stage.setMood(mood);
      ctx.stage.shot('room', true);
      hud.curtain(false);
      setTimeout(() => S && then(), 600);
    }, 1100);
  }
  function leaveRoom(text, apply, then) {
    hud.curtain(true, text);
    setTimeout(() => {
      if (!S) return;
      ctx.minigame.stop();
      if (apply) apply();
      ctx.setMode('play');
      hud.curtain(false);
      setTimeout(() => S && then(), 500);
    }, 1500);
  }
  /** 방 장면의 움직임(내리치기 · 담그기 · 날아가기)이 끝나면 next. */
  const waitStage = (next) => { S.wait = next; };

  // ---------- 4. 밤 12시를 지켜본다 ----------
  function watch(done) {
    fresh('room', done);
    enterRoom('(밤 11시 50분… 치이카와네 방)', 'watch', () => seq([
      ['(째깍, 째깍… 곧 밤 12시)', { who: C(), text: '…(꿀꺽)' }],
      (next) => { ctx.stage.shot('clock'); setTimeout(() => S && next(), 900); },
      (next) => { sound.play('chime'); ctx.stage.star('out'); setTimeout(() => S && next(), 1400); },
      ['(뎅… 밤 12시. 자명종 속에서 까만 별이 스르륵 나왔다!)', { who: STAR, text: '라라라~ 라라라~ ♪' }, { who: STAR, text: '해피? 해피~?' },
        { who: STAR, text: '오늘이 계속되면… 괴물도 없고, 친구들도 있고. 해피하잖아?' }, { who: C(), text: '…!! (도리도리)' }, { who: STAR, text: '…해피 아니야?' }],
      (next) => { ctx.stage.spinBack(true); sound.play('warn'); setTimeout(() => S && next(), 1700); },
      ['(시곗바늘이 거꾸로 뱅글뱅글…)']
    ], () => leaveRoom('(째깍… 째깍… 모든 게 거꾸로 감긴다…)', () => ctx.rewindNow(), end)));
  }

  // ---------- 5. 하치와레 · 우사기랑 같이 지킨다 ----------
  function sleepover(done) {
    fresh('room', done);
    enterRoom('(밤, 치이카와네 방. 하치와레랑 우사기도 왔다)', 'sleep', () => seq([
      [{ who: H(), text: '정말로 같은 날이 계속된다고…? 그럼 오늘은 다 같이 지켜 줄게!' }, { who: U(), text: '우라!' }, { who: C(), text: '…(꾸벅)' }, '(그리고… 밤 12시)'],
      (next) => { sound.play('chime'); ctx.stage.star('out'); setTimeout(() => S && next(), 1400); },
      [{ who: STAR, text: '라라라~ ♪' }, { who: H(), text: '저기, 별똥별아! 제발 그만해 줘~ 치이카와가 힘들어해!' }, { who: STAR, text: '해피~?' }, { who: U(), text: '……우라아!!' }],
      (next) => { ctx.stage.smash(); sound.play('thud'); waitStage(next); },
      ['(검은 별똥별은 쏙, 자명종 속으로 숨어 버렸다…)', { who: H(), text: '어, 어디 갔지…?' }, '(…눈꺼풀이 무거워진다. 다들 스르르 잠이 들었다)'],
      (next) => { ctx.stage.star('out'); ctx.stage.spinBack(true); sound.play('warn'); setTimeout(() => S && next(), 1600); }
    ], () => leaveRoom('(째깍… 째깍… 또 거꾸로…)', () => { ctx.rewindNow(); ctx.nudgeSearch(); }, end)));
  }

  // ---------- 8. 산소 표백제에 담근다 ----------
  function soak(done) {
    fresh('room', done);
    enterRoom('(밤, 치이카와네 방. 대야에 산소 표백제를 풀었다)', 'soak', () => {
      ctx.stage.shot('tub');
      seq([
        ['(물에 풀자 보글보글 하얀 거품이 인다)', { who: C(), text: '…(자명종을 꼬옥)' }, '(상으로 받은 돈으로 산, 소중한 자명종…)'],
        (next) => { ctx.stage.star('plead'); sound.play('warn'); setTimeout(() => S && next(), 900); },
        [{ who: STAR, text: '해피?! 해피잖아?!' }, { who: STAR, text: '괴물도 없고… 친구들도 있고… 걱정도 없는데?' }, { who: C(), text: '……' }, { who: C(), text: '…!! (그래도… 내일이 좋아!)' }],
        (next) => {
          S.mini = true;
          ctx.minigame.mash({
            label: '보글보글 휘젓기! 연타!', button: '보글보글!', gain: 0.08, decay: 0.07,
            onDone: () => { if (!S) return; S.mini = false; ctx.stage.dunk(); sound.play('clean'); setTimeout(() => S && next(), 900); }
          });
        },
        [{ who: STAR, text: '……바이.' }],
        (next) => { ctx.stage.star('gone'); waitStage(next); },
        ['(검은 별똥별은 창밖 밤하늘로 사라졌다)']
      ], () => { ctx.endLoop(); leaveRoom('(째깍, 째깍… 이번엔 시곗바늘이 앞으로 간다)', null, end); });
    });
  }

  // ---------- 9. 비 오는 아침 ----------
  function rainy(done) {
    fresh('rain', done);
    ctx.setCinematic(true);
    rain(true);
    const home = ctx.homeOf('chiikawa'), p = ctx.getPlayer().position, me = { x: p.x, z: p.z };
    const door = { x: home.x, z: home.z + 0.9 };
    stand('chiikawa', door.x, door.z, 'look', me);
    stand('hachiware', p.x + 1.5, p.z + 0.3, 'wave', door);
    stand('usagi', p.x - 1.5, p.z + 0.4, 'hop', door);
    seq([
      ['(쏴아아… 비가 내린다. 아침인데도 하늘이 어둑어둑하다)', { who: C(), text: '…비…?' }, { who: C(), text: '…!! (어제랑 달라…!)' }, '(같은 날이 아니라… 진짜 내일이 왔다)'],
      (next) => { act('chiikawa', 'sob', me); setTimeout(() => S && next(), 700); },
      [{ who: C(), text: '…(엉엉)' }, { who: H(), text: '치이카와~! 좋은 아침! …어라? 왜 울어~?' }, { who: U(), text: '야하!' }, { who: C(), text: '…(눈물을 닦고, 활짝)' }],
      ['(그 시각, 들판 어딘가…)', { who: M(), text: '(숨겨 둔 밥솥을 열어 혼자 밥을 퍼먹는다) …끄억.' }, { who: M(), text: '매일매일 이렇게 똑같으면 최고인데~ 흥!' }]
    ], () => { rain(false); end(); });
  }

  return {
    /** 연출 중인지. */
    get active() { return !!S; },
    /** 마을에서 하는 장면(화면 글을 숨긴다). */
    get cutscene() { return !!S && VILLAGE_SCENES.includes(S.kind); },
    /** 치이카와네 방을 그리는 중인지. */
    get onStage() { return !!S && S.kind === 'room'; },
    /** 장면 시작(questSceneStep). done: 다 보면 마무리 대사 · 다음 단계. */
    play(scene, done) {
      if (S) return;
      if (scene === 'blackWish') wish(done);
      else if (scene === 'blackMorning') morning(done, false);
      else if (scene === 'blackDejavu') morning(done, true);
      else if (scene === 'blackWatch') watch(done);
      else if (scene === 'blackSleepover') sleepover(done);
      else if (scene === 'blackSoak') soak(done);
      else if (scene === 'blackRain') rainy(done);
      else if (done) done();
    },
    /** 방 장면에서 매 프레임: 움직임이 끝나길 기다리던 다음 차례 · 연타 놀이 · 장면. */
    tick(dt, t) {
      if (S && S.wait && !ctx.stage.busy) { const next = S.wait; S.wait = null; next(); }
      if (S && S.mini) ctx.minigame.update(dt);
      ctx.stage.update(dt, t);
    },
    /** 밤 12시(또는 자고 일어나서): 시곗바늘이 거꾸로… apply 로 시계를 되돌리고(main) 같은 날 아침. */
    rewindFx(apply, after) {
      hud.curtain(true, '(째깍… 째깍… 어디선가 시곗바늘이 거꾸로 돈다…)');
      sound.play('warn');
      setTimeout(() => {
        apply();
        hud.curtain(false);
        setTimeout(() => { hud.toast('…또 같은 날 아침?', 3600); if (after) after(); }, 500);
      }, 1800);
    },
    /** 타이틀로 나갈 때: 하던 연출을 접는다. */
    reset() { if (S) { releaseAll(); rain(false); if (S.prop) ctx.villageScene.remove(S.prop); } ctx.minigame.stop(); S = null; }
  };
}
