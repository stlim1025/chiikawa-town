import * as THREE from 'three';
import { newRescue, stepRescue, nextClamp } from '../core/stardiner.js';

/**
 * 사이드스토리 '별 세 개'(원작: 하치와레 · 치이카와가 간판에 '별 세 개'라고 쓰인 레스토랑에 갔더니, 목욕을 시키고 빵 옷을 입혀
 * 커다란 오크 괴물이 먹으려 한다. 위험을 눈치채고 도망치다 무기와 토벌 증표를 두고 온 걸 알고 되돌아가서, 벽에 붙잡혀 있던
 * 별똥별 셋도 구해 다 같이 탈출한다). 데이터(부탁 · 보상)는 core/quests.js 의 starDiner, 구출 놀이 규칙은 core/stardiner.js,
 * 장면은 world/stardiner.js, 쇠고랑 단추는 ui/stargame.js.
 *  1) 입구 → 주방의 목소리: 무기 · 토벌 증표를 바구니에 맡기고 목욕부터 → 커다란 솥에서 목욕
 *  2) 빵 옷으로 돌돌(위에 빨간 열매) → 커다란 오크 괴물이 쿵쿵 다가온다(다리 · 앞치마 · 주먹만, 얼굴은 안 나온다) → 주방으로 돌아간 틈에
 *  3) 빵에서 빠져나와 입구 쪽으로 → 무기랑 토벌 증표를 두고 왔다! → 바구니로 되돌아가 되찾는다
 *  4) 바구니 옆 벽의 별 장식이 꿈틀 → 붙잡힌 별똥별 셋 → 구출 놀이(쇠고랑을 꾹 누르고 있으면 빠진다, 오크가 내다볼 때는 손을 뗀다)
 *  5) 다 풀면 오크가 뛰쳐나온다 → 다 같이 입구 밖으로 → 들판에서 별똥별들이 고맙다며 거대 오므라이스를 건네고 밤하늘로(마지막 대사 · 보상은 퀘스트 done)
 * 게임에서 정한 부분(원작에서 확인하지 못함): 말로 시키는 '주방의 목소리', 오크가 내다보는 구출 놀이, 들판의 보답 장면.
 * ctx: { hud, guide, sound, input, stage(장면 — 처음 들어갈 때 만든다), game(ui/stargame.js), cam, getPlayer, who(kind), narrator, fill(lines),
 *        setMode, setCinematic, myLook, front(가게 겉모습 — spot), villageScene, makeTrio(), ui, arriveBeside(kind, x, z), letGo(kind) }
 */
const KITCHEN = { kind: 'kitchen', name: '주방의 목소리', tag: '#e2d4c0', ink: '#4a3a2a' };
const STAR = { kind: 'star', name: '별똥별', tag: '#fff3a0', ink: '#7a5a12' };
const SAVED = ['별똥별 하나를 구했다!', '별똥별 둘째도 풀려났다!', '셋 다 구했다!'];
const PALS = ['hachiware', 'chiikawa'];

export function createStarDinerStory(ctx) {
  const { hud, guide, sound, input } = ctx;
  let S = null;
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const H = () => ctx.who('hachiware'), C = () => ctx.who('chiikawa');
  const proj = new THREE.Vector3();
  /** 대사 여러 묶음을 차례로(묶음 사이에 카메라를 옮긴다, 괄호 지문은 내레이션): [[shot, lines], …] → then */
  const scenes = (list, then) => {
    const next = (i) => {
      if (!S) return;
      if (i >= list.length) { then(); return; }
      const [shot, lines] = list[i];
      if (shot) ctx.stage.shot(shot);
      say(lines, () => next(i + 1));
    };
    next(0);
  };
  /** 장면 속 움직임(걷기 · 오크)이 다 끝나면 then. */
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
    }, 1200);
  };

  function begin(done) {
    S = { kind: 'intro', done, R: null, hold: null, saved: 0, trio: null, t: 0, doneCalled: false, wait: null };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, '(삐뚤어진 간판에 별 세 개… 소문의 레스토랑이다)');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('diner');
      ctx.setCinematic(true);
      ctx.stage.start(ctx.myLook());
      ctx.stage.onStomp(() => sound.play('thud'));
      ctx.stage.shot('hall', true);
      hud.curtain(false);
      setTimeout(() => S && intro(), 700);
    }, 1100);
  }
  function intro() {
    S.kind = 'talk';
    scenes([
      ['hall', ['(가게 안은 조용하다. 손님은 우리 셋뿐…)', { who: H(), text: '별이 세 개래~! 엄청 맛있는 가게인가 봐!' }, { who: C(), text: '…(두근두근)' }]],
      ['door', [{ who: KITCHEN, text: '어서 오세요… 식사 전에… 먼저 목욕을 하세요…' }, { who: KITCHEN, text: '무기랑 토벌 증표는… 바구니에 맡겨 주세요…' },
        { who: H(), text: '목욕…? 레스토랑인데~?' }]]
    ], () => cut('(무기랑 토벌 증표를 바구니에 맡기고… 목욕하러)', () => {
      ctx.stage.basket(true);
      ctx.stage.setMood('bath');
      ctx.stage.shot('bath', true);
    }, bath));
  }
  function bath() {
    scenes([['bath', ['(커다란 솥 같은 욕조에서 김이 모락모락…)', { who: H(), text: '하아~ 뜨끈뜨끈 개운하다~' }, { who: C(), text: '…(발그레)' },
      { who: KITCHEN, text: '다 씻으셨으면… 빵 옷을 입으세요…' }]]],
    () => cut('(…빵으로 돌돌 말렸다!)', () => { ctx.stage.setMood('bread'); ctx.stage.shot('bread', true); }, bread));
  }
  function bread() {
    scenes([['bread', ['(빵 위에는 빨간 열매까지 콕…)', { who: H(), text: '어라…? 이거 왠지…' }, { who: C(), text: '…?' }]]], () => {
      ctx.stage.orc('come');
      whenStill(() => scenes([['bread', ['(쿵… 쿵… 커다란 오크 괴물이 다가왔다…!)', { who: C(), text: '…!! (부들부들)' },
        { who: H(), text: '우, 우리… 먹히는 거야…?!' }, '(오크 괴물은 무언가를 가지러 주방으로 돌아갔다…)']]], () => {
        ctx.stage.orc('leave');
        whenStill(flee);
      }));
    });
  }
  /** 빵에서 빠져나와 입구 쪽으로 → 두고 온 무기 · 토벌 증표 → 바구니로 → 벽의 별똥별. */
  function flee() {
    scenes([['bread', [{ who: H(), text: '지금이야! 빵에서 빠져나가자!' }, '(꼼지락꼼지락… 빵에서 쏙!)']]], () => {
      ctx.stage.setMood('flee');
      ctx.stage.shot('follow');
      whenStill(() => scenes([[null, [{ who: H(), text: '……앗!' }, { who: H(), text: '무기랑 토벌 증표를 두고 왔어!' }, { who: C(), text: '…!!' },
        { who: H(), text: '얼른 가지러 가자~!' }]]], () => {
        ctx.stage.setMood('back');
        whenStill(() => {
          ctx.stage.basket(false);
          sound.play('drop');
          scenes([
            [null, ['(무기랑 토벌 증표를 되찾았다!)']],
            ['wall', ['(그런데 바구니 옆, 벽에 걸린 별 장식 셋이… 꿈틀했다?)', { who: STAR, text: '……살려 줘……' }, { who: C(), text: '…!! (부들부들)' },
              { who: H(), text: '저거 장식이 아니야…! 별똥별이 붙잡혀 있어!' }, { who: H(), text: '모서리마다 쇠고랑이… 꾹꾹 눌러서 하나씩 빼내자!' },
              { who: H(), text: '주방 문이 달그락거리면 얼른 손을 떼야 해! 들키면 큰일이야~' }]]
          ], rescue);
        });
      }));
    });
  }
  function rescue() {
    if (!S) return;
    S.kind = 'rescue';
    S.R = newRescue();
    S.hold = null;
    ctx.stage.setMood('rescue');
    ctx.stage.shot('wall');
    ctx.game.start({ onHold: (i) => { if (S) S.hold = i; } });
  }
  /** 구출 놀이 한 프레임: 규칙(core) → 장면 · 단추 · 소리. */
  function tickRescue(dt) {
    const R = S.R;
    for (const e of stepRescue(R, dt, S.hold)) {
      if (e.type === 'free') { ctx.stage.freeClamp(e.i); sound.play('clean'); }
      else if (e.type === 'star') { ctx.stage.starFree(e.star); sound.play('job'); ctx.game.flash(SAVED[Math.min(SAVED.length - 1, S.saved++)]); ctx.game.saved(S.saved); }
      else if (e.type === 'caught') { S.hold = null; ctx.game.release(); ctx.stage.tighten(e.i); sound.play('none'); ctx.game.flash('쉿…! 들킬 뻔했다', true); }
      else if (e.type === 'warn') { ctx.stage.setPeek('warn'); ctx.game.setPhase('warn'); sound.play('warn'); }
      else if (e.type === 'peek') { ctx.stage.setPeek('peek'); ctx.game.setPhase('peek'); }
      else if (e.type === 'calm') { ctx.stage.setPeek('calm'); ctx.game.setPhase('calm'); }
      else if (e.type === 'done') { S.kind = 'freed'; ctx.game.close(); setTimeout(() => S && freed(), 900); }
    }
    if (S.kind !== 'rescue') return;
    // 단추를 쇠고랑 자리에(장면 카메라로 화면 좌표를 잰다)
    const cam = ctx.stage.camera, W = ctx.ui.clientWidth, Hh = ctx.ui.clientHeight, nx = nextClamp(R), pts = [];
    for (const c of R.clamps) {
      if (c.free) continue;
      const w = ctx.stage.clampWorld(c.i);
      if (!w) continue;
      proj.copy(w).project(cam);
      const x = (proj.x + 1) / 2 * W, y = (1 - proj.y) / 2 * Hh;
      if (x < -20 || x > W + 20) continue; // 화면 밖(좁은 화면에서 다른 별)
      pts.push({ i: c.i, x, y, p: c.p, next: !!nx && nx.i === c.i });
    }
    ctx.game.layout(pts);
  }
  function freed() {
    if (!S) return;
    ctx.stage.setPeek('calm');
    S.kind = 'talk';
    scenes([['wall', ['(풀려난 별똥별 셋이 둥실 떠올랐다)', { who: STAR, text: '……고마워……!' }, { who: H(), text: '다 풀었다~! 이제 다 같이 도망치자!' }]]], () => {
      ctx.stage.orc('burst');
      sound.play('growl');
      scenes([['orc', ['(쾅! 주방 문이 열리고 오크 괴물이 뛰쳐나왔다!)', { who: C(), text: '…!!' }, { who: H(), text: '도망쳐~!!' }]]], escape);
    });
  }
  function escape() {
    if (!S) return;
    S.kind = 'escape';
    ctx.stage.setMood('escape');
    ctx.stage.orc('chase');
    ctx.stage.shot('follow');
    setTimeout(() => {
      if (!S) return;
      hud.curtain(true, '(별똥별들이랑 다 같이 후다닥 가게를 빠져나왔다!)');
      setTimeout(() => S && outside(), 1300);
    }, 3000);
  }
  /** 들판으로 나왔다: 하치와레 · 치이카와도 옆에, 별똥별 셋이 고맙다며 거대 오므라이스 → 밤하늘로. 화면 글은 끝까지 숨긴 채. */
  function outside() {
    ctx.setMode('play');
    const p = ctx.getPlayer(), at = ctx.front.spot;
    if (p) {
      p.setPosition(at.x, at.z + (at.z > 0 ? -5 : 5));
      p.face(at.x, at.z);
      ctx.cam.snap(p.position);
      PALS.forEach((k, i) => ctx.arriveBeside(k, p.position.x + (i ? -1.2 : 1.2), p.position.z + 0.4));
    }
    S.trio = ctx.makeTrio();
    ctx.villageScene.add(S.trio.group);
    hud.curtain(false);
    S.kind = 'thanks';
    setTimeout(() => S && say(['(가게에서 한참 떨어진 들판까지 왔다. 하아… 하아…)', { who: STAR, text: '……고마워……' },
      '(별똥별들이 커다란 오므라이스를 내밀었다!)', { who: H(), text: '우와~ 엄청 큰 오므라이스다~!' }, { who: C(), text: '…!! (반짝반짝)' }], () => {
      if (!S) return;
      S.trio.flyAway();
      sound.play('done');
      say(['(별똥별들은 밤하늘로 슝 돌아갔다…)'], finish);
    }), 600);
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
  function clearTrio() {
    if (S && S.trio) { ctx.villageScene.remove(S.trio.group); S.trio = null; }
  }

  return {
    /** 연출 중인지(들판에서 마무리 대사가 끝날 때까지). */
    get active() { return !!S; },
    /** 가게 안 장면을 그리는 중인지(이때는 화면을 늘 꽉 찬 빠르기로). */
    get onStage() { return !!S && ['intro', 'talk', 'rescue', 'freed', 'escape'].includes(S.kind); },
    /** 지금 단계(디버그 · 테스트용): intro · talk · rescue · freed · escape · thanks · outro. */
    get phase() { return S ? S.kind : null; },
    /** 구출 놀이 상태(디버그 · 테스트용). */
    get rescue() { return S && S.R; },
    /** 장면 시작. done: 다 보고 들판으로 나와 별똥별이 떠나면(퀘스트 마무리 대사 · 보상). */
    play(done) { if (!S) begin(done); },
    /** 가게 안 모드에서 매 프레임: 움직임이 끝나길 기다리던 다음 대사 · 구출 놀이 · 장면. */
    tick(dt, t) {
      if (!S) return;
      if (S.wait && !ctx.stage.busy) { const then = S.wait; S.wait = null; then(); }
      if (!S) return;
      if (S.kind === 'rescue') tickRescue(dt);
      ctx.stage.update(dt, t);
    },
    /** 행동 버튼(키보드 Space 는 쇠고랑 화면이 스스로 받는다): 누르는 동안 다음 쇠고랑을 꾹. */
    press(down) {
      if (!S || S.kind !== 'rescue') return;
      if (down) { const n = nextClamp(S.R); S.hold = n ? n.i : null; } else S.hold = null;
    },
    /** 마을에서 매 프레임: 들판의 별똥별 셋(둥실 → 밤하늘로), 마무리 대사가 끝나면 정리. */
    update(dt, t) {
      if (!S) return;
      if (S.trio) {
        const p = ctx.getPlayer();
        if (p) S.trio.update(dt, t, p.position);
        if (S.trio.done) clearTrio();
      }
      if (S.kind === 'outro') {
        S.t += dt;
        if (S.doneCalled && !guide.open && S.t > 0.3) { clearTrio(); PALS.forEach((k) => ctx.letGo(k)); input.setEnabled(true); S = null; }
      }
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() { if (ctx.game.active) ctx.game.close(); clearTrio(); if (S) PALS.forEach((k) => ctx.letGo(k)); S = null; }
  };
}
