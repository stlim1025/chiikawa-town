import * as THREE from 'three';
import { loadPhotos, savePhotos } from '../core/photostore.js';

/**
 * 사이드스토리 '하치와레의 카메라'(원작 2020년 12월 연재분 · 애니 78 ~ 81화 · 95화). 데이터(부탁 · 보상)는 core/quests.js 의 hachiCamera.
 * 하치와레가 돈을 모아 카메라를 산 날 이야기가 열리고(core/goals.js), 낮에 광장으로 가면:
 *  1) 첫 장: 치이카와를 찍으려다 예전 지팡이 카메라(찍은 꽃 · 나무가 사라졌다) 생각에 굳는다 → 꽃 · 나무로 시험 삼아 찰칵(그대로다)
 *     → 치이카와 "찍어 줘" → 브이를 하려다 부끄러워 손을 숨긴 치이카와를 찰칵, 안 사라졌다!(원작. 내가 거드는 말 고르기는 게임에서 정함)
 *  2) 우사기가 와서 셋이서: 하치와레가 건넨 카메라로 내가 뷰파인더를 보며 세 장(게임에서 정함). 두 번째는 우사기의 전설의 포즈(원작)
 *  3) 비가 온다: 하치와레가 카메라를 품에 안고 가까운 큰 나무 밑으로(원작: 비에 젖으면 안 된다 · 카메라에 행동이 묶인다 · 들고 다니면 조금 무겁다)
 *  4) 다음 날 하치와레에게: 뽑은 사진을 펼쳐 본다. 다 흔들렸고(원작), 치이카와가 하치와레는 찍을 때 가끔 혀를 내민다고 알려 준다(애니 95화)
 * 친구를 부르면 그 자리에 다 올 때까지 기다렸다가(늦으면 그 자리에 세운다) 다음 대사로 넘어간다: 대사에 나오는 친구는 늘 화면에 있다.
 * 찍은 사진은 이 브라우저에 남긴다(core/photostore.js): 뽑은 사진 · 흔들린 사진 액자(world/photoframe.js)에 쓴다.
 * ctx: { npcs, village, hud, guide, sound, input, staged, who(kind), narrator, me(), fill(lines), getPlayer, cam, photo(ui/photos.js),
 *        capture({ pos, look, rect }) → data URL | null, setRain(on), shelter() → { stand, spots: [3] }, bring(kind, x, z), photosChanged(),
 *        backdrop() → { x, z, r } | null(광장 한가운데 시계탑: 셋은 그 앞에 선다) }
 */
const CAPTIONS = ['첫 장, 치이카와', '셋이 나란히', '우사기의 전설의 포즈', '다 같이 점프'];
/** 셋이서 찍는 세 장: 뷰파인더 위 안내 · 찍기 전 대사(who 가 없으면 해설) · 셋의 몸짓(제자리에서). */
const ROUNDS = [
  { label: '셋이 다 들어왔을 때 찰칵!', lines: [{ who: 'hachiware', text: '자, 찍는다~! 다들 이쪽 봐~!' }], poses: { chiikawa: 'pose', hachiware: 'wave', usagi: 'dance' } },
  { label: '우사기의 전설의 포즈를 찰칵!', lines: [{ who: 'usagi', text: '야하!' }, { text: '(우사기가 휙 돌아서더니… 거꾸로 서서 다리 사이로 이쪽을 내다본다?!)' }, { who: 'hachiware', text: '우사기, 그 포즈 뭐야~! 찍어 줘, 찍어 줘!' }],
    poses: { chiikawa: 'clap', hachiware: 'clap', usagi: 'peek' } },
  { label: '다 같이 점프! 찰칵!', lines: [{ who: 'hachiware', text: '마지막은 다 같이 점프~!' }, { who: 'chiikawa', text: '…!! (폴짝)' }], poses: { chiikawa: 'hop', hachiware: 'hop', usagi: 'hop' } }
];
const PALS = ['chiikawa', 'hachiware', 'usagi'];
/** 셋이 나란히 설 때 사이(m): 몸이 겹치지 않게. 셋을 찍는 거리는 셋(양 끝 몸까지)이 틀 너비의 8할 안에 들어오게 잡는다. */
const GAP = 1.05, ROW_HALF = GAP + 0.5;

export function createCameraStory(ctx) {
  const { npcs, village, hud, guide, sound, input, staged } = ctx;
  let S = null; // { kind, t, done, stand, want: {친구: 자리}, wait, shots, first, cam, row, fh(틀 반 너비 m), spots, shelter }
  let printing = false; // 다음 날 뽑은 사진을 펼쳐 보는 중
  const WHO = { hachiware: () => ctx.who('hachiware'), chiikawa: () => ctx.who('chiikawa'), usagi: () => ctx.who('usagi') };
  /** 대사 줄 { who: 친구 이름 | 없으면 해설, text }. */
  const say = (lines, then) => guide.say(ctx.fill(lines.map((l) => ({ ...l, who: l.who ? WHO[l.who]() : ctx.narrator }))), then, WHO.hachiware());
  const P = () => ctx.getPlayer();
  const npc = (k) => npcs.byKind(k);
  const at = (x, z) => village.nearestFree(x, z, 0.35);
  const later = (ms, fn) => setTimeout(() => { if (S) fn(); }, ms);

  /**
   * 이야기 동안 그 자리로 오게 한다(일과는 미룬다). 집 안 · 멀리 · 같이 다니는 중이면 그 자리 옆 가까운 데로 불러내서 달려오게 한다.
   * 온 뒤에는 anim 몸짓으로 face 를 본다. 기다릴 자리(S.want)에 적어 둔다.
   */
  function walkIn(kind, to, anim, face, line) {
    const n = npc(kind);
    if (!n) return;
    const far = S.kind !== 'run' && Math.hypot(n.x - to.x, n.z - to.z) > 9; // 비 피할 때는 같이 있던 자리에서 함께 뛴다
    if (n.away || n.party || n.follow || far) {
      const from = at(to.x + (to.x >= P().position.x ? 4 : -4), to.z + 2);
      ctx.bring(kind, from.x, from.z);
    } else staged.add(kind);
    npcs.plan(n, [{ do: 'walk', x: to.x, z: to.z, run: true }, { do: 'act', anim, time: 9999, face, say: line }]);
    S.want[kind] = to;
  }
  /** kinds 가 다 올 때까지 기다렸다가 then(늦어도 limit 초 뒤에는 그 자리에 세우고). */
  function waitFor(kinds, then, limit = 4.5) { S.wait = { kinds, then, until: S.t + limit }; }
  function checkWait() {
    const W = S.wait, late = S.t > W.until;
    const here = W.kinds.every((k) => {
      const n = npc(k), w = S.want[k];
      if (!n || !w || Math.hypot(n.x - w.x, n.z - w.z) < 0.6) return true;
      if (late) { n.x = w.x; n.z = w.z; n.away = false; n.chibi.root.visible = true; return true; } // 늦으면 그 자리에(길이 막혔어도 대사에는 꼭 있게)
      return false;
    });
    if (!here) return;
    S.wait = null;
    W.then();
  }
  /** 그 자리에서 곧바로 몸짓(face: 바라볼 곳). */
  function pose(kind, anim, face, line) {
    const n = npc(kind);
    if (n && !n.away) npcs.act(n, anim, { face, time: 9999, say: line });
  }
  function shutter() { sound.play('shutter'); ctx.photo.flash(); }
  /** 찍는 동안 내 앞(카메라와 셋 사이 · 셋 바로 뒤)을 지나는 다른 친구는 옆으로 비켜 준다(사진을 가리지 않게). */
  const shooed = new Map(); // 친구 → 비켜 달라고 한 때(S.t)
  function clearView() {
    const ax = S.stand.x, az = S.stand.z - 0.5, bx = S.row.x, bz = S.row.z - 1.2, len = Math.hypot(bx - ax, bz - az);
    for (const n of npcs.list) {
      if (n.away || n.party || n.follow || PALS.includes(n.kind) || (shooed.get(n) || -9) > S.t - 2) continue;
      const u = Math.max(0, Math.min(1, ((n.x - ax) * (bx - ax) + (n.z - az) * (bz - az)) / (len * len)));
      const d = Math.hypot(n.x - (ax + (bx - ax) * u), n.z - (az + (bz - az) * u));
      if (d > S.fh * 1.6 + 0.6) continue;
      shooed.set(n, S.t);
      const side = n.x >= ax ? 1 : -1, to = at(n.x + side * (S.fh * 2.4 + 2), n.z);
      npcs.plan(n, [{ do: 'walk', x: to.x, z: to.z, run: true }]);
    }
  }
  /** 비 피한 나무 둘레(r 안)의 다른 친구도 비켜 준다(셋과 나를 가리지 않게). */
  function clearAround(c, r) {
    for (const n of npcs.list) {
      if (n.away || n.party || n.follow || PALS.includes(n.kind) || (shooed.get(n) || -9) > S.t - 2 || Math.hypot(n.x - c.x, n.z - c.z) > r) continue;
      shooed.set(n, S.t);
      const a = Math.atan2(n.x - c.x, n.z - c.z), to = at(c.x + Math.sin(a) * (r + 2.5), c.z + Math.cos(a) * (r + 2.5));
      npcs.plan(n, [{ do: 'walk', x: to.x, z: to.z, run: true }]);
    }
  }

  // ---------- 1) 첫 장 ----------
  function meet(done) {
    // 광장 남쪽에 서고(카메라는 남쪽에서 북쪽을 본다), 둘이 북쪽에서 마주 본다
    const stand = at(0.3, 3.6);
    S = { kind: 'meet', t: 0, done, stand, want: {}, wait: null, shots: [], first: null, cam: null, row: null, fh: 1, spots: null, shelter: null };
    input.setEnabled(false);
    hud.setAction(null);
    P().walkTo = { x: stand.x, z: stand.z, speed: 2.4 };
    walkIn('chiikawa', at(stand.x - 0.95, stand.z - 2.0), 'shy', stand);
    walkIn('hachiware', at(stand.x + 0.95, stand.z - 1.8), 'hug', stand);
    waitFor(['chiikawa', 'hachiware'], firstShot, 5);
  }
  function firstShot() {
    S.kind = 'first';
    P().face(S.stand.x, S.stand.z - 3);
    say([{ who: 'hachiware', text: '{name}~! 왔구나!' }, { text: '(하치와레가 새 카메라를 품에 안고 소중하게 쓰다듬는다)' },
      { who: 'hachiware', text: '그럼… 첫 장은 치이카와로 찍어 볼게!' }], () => {
      const c = npc('chiikawa'), h = npc('hachiware');
      if (c) pose('hachiware', 'snap', c);
      if (h) pose('chiikawa', 'pose', h);
      later(1100, () => say([{ text: '(…하치와레가 카메라를 든 채 그대로 굳어 버렸다)' }, { who: 'hachiware', text: '…있잖아, 예전에 이상한 지팡이로 나온 카메라가 있었는데…' },
        { who: 'hachiware', text: '그걸로 찍었더니 꽃이랑 나무가 정말로 사라져 버렸어…' }, { who: 'hachiware', text: '…치이카와도 사라지면 어떡하지…' },
        { who: 'hachiware', text: '…조, 조금만 더 시험해 볼까…' }], testShots));
    });
  }
  function testShots() {
    const h = npc('hachiware');
    if (!h) { chiiTurn(); return; }
    const aim = (dx) => ({ x: h.x + dx, z: h.z - 1.5 });
    pose('hachiware', 'snap', aim(2.4));
    pose('chiikawa', 'look', h);
    later(800, () => {
      shutter();
      say([{ text: '(찰칵! …꽃은 그대로 있다)' }], () => {
        pose('hachiware', 'snap', aim(-2.4));
        later(800, () => { shutter(); say([{ text: '(찰칵! …나무도 그대로 있다)' }, { who: 'hachiware', text: '…그래도… 역시 무서워…' }], encourage); });
      });
    });
  }
  function encourage() {
    guide.ask('(하치와레에게 뭐라고 할까?)', ['이건 진짜 카메라잖아!', '나부터 찍어 봐!'], (i) => {
      if (!S) return;
      if (i === 0) { say([{ who: 'hachiware', text: '…진짜 카메라… 그렇지…?' }], chiiTurn); return; }
      pose('hachiware', 'snap', P().position);
      later(900, () => { shutter(); say([{ text: '(찰칵! …나는 그대로 있다)' }, { who: 'hachiware', text: '{name}… 안 사라졌어…!' }], chiiTurn); });
    }, ctx.me());
  }
  /** 치이카와가 찍어 달라고 한다 → 브이를 하려다 부끄러워 손을 숨긴 치이카와를 찰칵(하치와레 눈으로 본 첫 장을 남긴다). */
  function chiiTurn() {
    const h = npc('hachiware');
    pose('chiikawa', 'pose', h || P().position);
    say([{ who: 'chiikawa', text: '…하치와레… 괜찮아…!' }, { who: 'chiikawa', text: '…찍어 줘…!' },
      { text: '(치이카와가 브이를 하려다가… 부끄러워서 손을 쏙 숨겼다)' }], () => {
      const c = npc('chiikawa');
      pose('chiikawa', 'shy', h || P().position);
      if (c) pose('hachiware', 'snap', c);
      later(900, () => {
        S.first = firstPhoto();
        shutter();
        say([{ text: '(찰칵!)' }, { text: '(…치이카와는 그대로 거기 있다)' }], () => {
          const p = P().position;
          pose('hachiware', 'hop', p);
          pose('chiikawa', 'hop', npc('hachiware') || p);
          sound.play('heart');
          say([{ who: 'hachiware', text: '…치이카와… 안 사라졌다…!!' }, { who: 'hachiware', text: '다행이다~!! 진짜 카메라야~!' }, { who: 'chiikawa', text: '…!! (방긋)' }], usagiJoin);
        });
      });
    });
  }
  /** 하치와레 눈높이에서 치이카와를 본 사진. */
  function firstPhoto() {
    const h = npc('hachiware'), c = npc('chiikawa');
    if (!h || !c) return null;
    const eye = new THREE.Vector3(h.x, h.chibi.height * 0.6, h.z), aim = new THREE.Vector3(c.x, c.chibi.height * 0.45, c.z);
    eye.addScaledVector(aim.clone().sub(eye).setY(0).normalize(), 0.5); // 하치와레 얼굴 앞(제 카메라 · 머리가 찍히지 않게)
    return ctx.capture({ pos: eye, look: aim });
  }

  // ---------- 2) 셋이서: 내가 뷰파인더로 세 장 ----------
  function usagiJoin() {
    S.kind = 'usagi';
    const st = S.stand;
    walkIn('usagi', at(st.x + 2.1, st.z - 1.7), 'hop', st, '야하!');
    waitFor(['usagi'], () => say([{ who: 'hachiware', text: '우사기다~! 우사기도 같이 찍자!' }, { who: 'hachiware', text: '{name}, 셔터 눌러 줄래? 나도 같이 찍히고 싶어~' },
      { text: '(하치와레에게 카메라를 건네받았다. …생각보다 묵직하다!)' }], setupShoot), 4);
  }
  function setupShoot() {
    let st = S.stand;
    const c = ctx.cam.camera;
    // 셋(양 끝 몸까지)이 뷰파인더 틀 너비의 8할 안에 들어오는 거리. 틀이 작거나 화면이 좁으면(세로 화면) 멀리 선다
    const tanH = Math.tan(THREE.MathUtils.degToRad(c.fov) / 2) * c.aspect, fw = ctx.photo.frameFraction();
    const dist = Math.min(9, Math.max(3.5, ROW_HALF / (0.8 * tanH * fw)));
    S.fh = tanH * dist * fw; // 셋이 선 거리에서 틀 너비의 반(m)
    // 광장 한가운데 시계탑(마을 가꾸기)이 있으면 셋은 탑 바로 앞에 서고(탑이 사진 배경), 나는 그만큼 뒤로 물러나 찍는다.
    // 여기서부터 화면은 내 눈(뷰파인더)이라 물러나는 모습은 보이지 않는다
    const tw = ctx.backdrop && ctx.backdrop(), front = tw ? tw.z + tw.r + 0.8 : 0;
    if (tw && Math.abs(tw.x - st.x) < tw.r + ROW_HALF && st.z - dist < front) {
      st = S.stand = at(st.x, front + dist);
      P().setPosition(st.x, st.z);
    }
    S.row = { x: st.x, z: st.z - dist };
    S.cam = { pos: new THREE.Vector3(st.x, 0.92, st.z - 0.5), look: new THREE.Vector3(st.x, 0.55, S.row.z) }; // 내 얼굴 앞에서 셋을 본다
    // 왼쪽부터 치이카와 · 우사기 · 하치와레(우사기가 가운데: 전설의 포즈를 가운데서)
    S.spots = { chiikawa: at(S.row.x - GAP, S.row.z), usagi: at(S.row.x, S.row.z), hachiware: at(S.row.x + GAP, S.row.z) };
    S.kind = 'gather';
    P().face(S.row.x, S.row.z);
    for (const k of PALS) walkIn(k, S.spots[k], k === 'usagi' ? 'hop' : 'wave', st);
    waitFor(PALS, () => round(0), 4.5);
  }
  function round(i) {
    const R = ROUNDS[i];
    S.kind = 'shoot';
    for (const k of PALS) {
      const n = npc(k), spot = S.spots[k];
      if (!n) continue;
      n.x = spot.x; n.z = spot.z; // 늘 제자리에서(서로 겹치지 않게)
      // 전설의 포즈: 등을 이쪽으로 두고 거꾸로 서면 얼굴이 이쪽을 본다
      pose(k, R.poses[k], R.poses[k] === 'peek' ? { x: spot.x, z: spot.z - 5 } : S.stand);
    }
    say(R.lines, () => ctx.photo.viewfinder({ label: R.label, n: i + 1, of: ROUNDS.length, onShoot: () => shoot(i) }));
  }
  function shoot(i) {
    const url = ctx.capture({ rect: ctx.photo.frameRect() });
    shutter();
    if (url) { S.shots[i] = url; ctx.photo.roll(url); }
    later(650, () => {
      ctx.photo.hideViewfinder();
      if (i + 1 < ROUNDS.length) { say([{ who: 'hachiware', text: ['찍었다~! 한 장 더!', '우와~ 우사기 대단해~!'][i] }], () => round(i + 1)); return; }
      ctx.photo.rollClear();
      keep();
      rain();
    });
  }
  /** 찍은 사진(하치와레의 첫 장 + 내가 찍은 세 장)을 남긴다. 하나라도 못 찍었으면 남기지 않는다(뽑은 사진은 그림으로). */
  function keep() {
    const list = [S.first, ...ROUNDS.map((_, i) => S.shots[i] || null)];
    if (!list.every(Boolean)) return;
    savePhotos(list);
    ctx.photosChanged();
  }

  // ---------- 3) 비: 가까운 큰 나무 밑으로 ----------
  function rain() {
    S.kind = 'rain';
    S.cam = null; // 따라가기 카메라로
    ctx.setRain(true);
    const p = P().position;
    pose('hachiware', 'hug', p);
    pose('chiikawa', 'look', { x: p.x, z: p.z - 6 });
    pose('usagi', 'hop', p);
    say([{ text: '(…톡, 토독. 갑자기 빗방울이 떨어지기 시작했다)' }, { who: 'hachiware', text: '앗, 비다!!' }, { who: 'hachiware', text: '카메라가 젖으면 안 돼~!! (카메라를 품에 꼭 안는다)' },
      { who: 'hachiware', text: '{name}, 저기 큰 나무 밑으로 뛰자~!' }], runForCover);
  }
  function runForCover() {
    const sh = S.shelter = ctx.shelter();
    S.kind = 'run'; // walkIn 이 이 단계를 보고 멀어도 불러내지 않는다
    hud.setTimer(['비가 와요', { text: '하치와레랑 큰 나무 밑으로' }]);
    input.setEnabled(true);
    PALS.forEach((k, i) => walkIn(k, sh.spots[i], k === 'hachiware' ? 'hug' : k === 'usagi' ? 'hop' : 'shy', { x: sh.spots[i].x, z: sh.spots[i].z + 5 }));
  }
  function sheltered() {
    S.kind = 'shelter';
    input.setEnabled(false);
    hud.setTimer(null);
    hud.setAction(null);
    const sh = S.shelter;
    P().face(sh.stand.x, sh.stand.z + 5);
    waitFor(PALS, () => say([{ who: 'hachiware', text: '휴우… 카메라는 무사해~' }, { who: 'hachiware', text: '카메라가 생기니까 비 올 때도 조심해야 하네~' },
      { who: 'hachiware', text: '계속 들고 다니니까 조금 무겁기도 하고~ 헤헤' }, { who: 'chiikawa', text: '…(손수건으로 카메라를 같이 닦아 준다)' },
      { who: 'usagi', text: '야하~! (빗속으로 뛰어나가 첨벙첨벙)' }, { text: '(비는 금세 그쳤다)' }], () => {
      ctx.setRain(false);
      S.kind = 'outro';
      S.t = 0;
      S.done();
    }), 3);
  }

  /** 이야기가 끝나거나 접힐 때: 친구들을 일과로, 화면을 원래대로. */
  function release() {
    ctx.photo.hideViewfinder();
    ctx.photo.rollClear();
    if (S && (S.kind === 'rain' || S.kind === 'run' || S.kind === 'shelter')) { ctx.setRain(false); hud.setTimer(null); }
    for (const k of PALS) { const n = npc(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); }
  }

  return {
    /** 내 캐릭터를 붙잡고 있는 중인지(비 피해 뛰는 동안은 움직일 수 있다). */
    get active() { return !!S && S.kind !== 'run'; },
    /** 화면 글을 숨기는 이야기 장면인지(뛰는 동안은 안내가 보이게, 뽑은 사진을 펼쳐 보는 동안은 숨긴다). */
    get cutscene() { return (!!S && S.kind !== 'run') || printing; },
    get phase() { return S ? S.kind : null; },
    /** 시작(낮에 광장에 왔을 때). done: 마무리 대사 · 다음 단계. */
    play(done) { if (!S) meet(done); },
    /** 다음 날: 뽑은 사진을 펼쳐 본다 → finish(마무리 대사 · 보상). */
    prints(finish) {
      const urls = loadPhotos(), h = npc('hachiware'), c = npc('chiikawa');
      const pals = !!c && !c.away && !!h && Math.hypot(c.x - h.x, c.z - h.z) < 20 && !c.party && !c.follow;
      if (pals) { staged.add('chiikawa'); npcs.plan(c, [{ do: 'walk', x: h.x - 1.1, z: h.z + 0.5, run: true }, { do: 'act', anim: 'look', time: 12, face: { x: h.x, z: h.z } }]); }
      say([{ who: 'hachiware', text: '{name}! 어제 찍은 사진, 뽑아 왔어~!' }], () => {
        printing = true;
        ctx.photo.showPrints(urls.length === CAPTIONS.length ? urls : null, CAPTIONS);
        sound.play('chime');
        // 애니 95화: 사진을 본 치이카와가, 하치와레가 사진 찍을 때 가끔 혀를 내밀고 있다고 알려 줘 하치와레가 놀란다
        say([{ who: 'hachiware', text: '…어라? 다 흔들렸네…' },
          ...(pals ? [{ who: 'chiikawa', text: '…하치와레… 사진 찍을 때… 가끔 혀가 쏙 나와 있어…' }, { who: 'hachiware', text: '에엣?! 정말?!' }]
            : [{ who: 'hachiware', text: '치이카와가 그러는데, 나 사진 찍을 때 가끔 혀가 쏙 나와 있대~ 헤헤' }]),
          { who: 'hachiware', text: '…그래도 흔들린 것도 멋이지~!' }], () => {
          printing = false;
          ctx.photo.hidePrints();
          if (pals) { npcs.plan(c, []); staged.delete('chiikawa'); }
          finish();
        });
      });
    },
    /** 뷰파인더로 찍는 동안의 카메라(내 얼굴 앞에서 셋을 본다), 아니면 null(따라가기 카메라). */
    camPose() { return S && S.cam ? { pos: S.cam.pos, look: S.cam.look } : null; },
    update(dt) {
      if (!S) return;
      S.t += dt;
      if (S.wait) checkWait();
      if ((S.kind === 'gather' || S.kind === 'shoot') && S.row) clearView();
      if ((S.kind === 'run' || S.kind === 'shelter') && S.shelter) clearAround(S.shelter.stand, 3);
      if (S.kind === 'run' && S.shelter && Math.hypot(P().position.x - S.shelter.stand.x, P().position.z - S.shelter.stand.z) < 1.8) sheltered();
      if (S.kind === 'outro' && S.t > 0.6 && !guide.open) { release(); S = null; }
    },
    reset() { release(); S = null; printing = false; ctx.photo.hidePrints(); }
  };
}
