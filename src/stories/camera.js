import * as THREE from 'three';
import { loadPhotos, savePhotos } from '../core/photostore.js';

/**
 * 사이드스토리 '하치와레의 카메라'(원작 2020년 12월 연재분 · 애니 78 ~ 81화 · 95화). 데이터(부탁 · 보상)는 core/quests.js 의 hachiCamera.
 * 하치와레가 돈을 모아 카메라를 산 날 이야기가 열리고(core/goals.js), 낮에 광장으로 가면:
 *  1) 첫 장: 치이카와를 찍으려다 예전 지팡이 카메라(찍은 꽃 · 나무가 사라졌다) 생각에 굳는다 → 꽃 · 나무로 시험 삼아 찰칵(그대로다)
 *     → 치이카와 "찍어 줘" → 브이를 하려다 부끄러워 손을 숨긴 치이카와를 찰칵, 안 사라졌다!(원작. 내가 거드는 말 고르기는 게임에서 정함)
 *  2) 우사기가 와서 셋이서: 하치와레가 건넨 카메라로 내가 뷰파인더를 보며 세 장(게임에서 정함). 두 번째는 우사기의 전설의 포즈(원작)
 *  3) 비가 온다: 하치와레가 카메라를 품에 안고 처마 밑으로(원작: 비에 젖으면 안 된다 · 카메라에 행동이 묶인다 · 들고 다니면 조금 무겁다)
 *  4) 다음 날 하치와레에게: 뽑은 사진을 펼쳐 본다. 다 흔들렸고(원작), 치이카와가 하치와레는 찍을 때 가끔 혀를 내민다고 알려 준다(애니 95화)
 * 찍은 사진은 이 브라우저에 남긴다(core/photostore.js): 뽑은 사진 · 흔들린 사진 액자(world/photoframe.js)에 쓴다.
 * ctx: { npcs, village, hud, guide, sound, input, staged, who(kind), narrator, me(), fill(lines), getPlayer, cam, photo(ui/photos.js),
 *        capture({ pos, look, rect }) → data URL | null, setRain(on), shelters() → [{ x, z }], photosChanged() }
 */
const CAPTIONS = ['첫 장, 치이카와', '셋이 나란히', '우사기의 전설의 포즈', '다 같이 점프'];
/** 셋이서 찍는 세 장: 뷰파인더 위 안내 · 찍기 전 대사(who 가 없으면 해설) · 셋의 몸짓 · 우사기가 뛰어다니는지(roam). */
const ROUNDS = [
  { label: '셋이 다 들어왔을 때 찰칵!', lines: [{ who: 'hachiware', text: '자, 찍는다~! 다들 이쪽 봐~!' }], poses: { chiikawa: 'pose', hachiware: 'wave' }, roam: true },
  { label: '우사기의 전설의 포즈를 찰칵!', lines: [{ who: 'usagi', text: '야하!' }, { text: '(우사기가 휙 돌아서더니… 거꾸로 서서 다리 사이로 이쪽을 내다본다?!)' }, { who: 'hachiware', text: '우사기, 그 포즈 뭐야~! 찍어 줘, 찍어 줘!' }],
    poses: { chiikawa: 'clap', hachiware: 'clap', usagi: 'peek' } },
  { label: '다 같이 점프! 찰칵!', lines: [{ who: 'hachiware', text: '마지막은 다 같이 점프~!' }, { who: 'chiikawa', text: '…!! (폴짝)' }], poses: { chiikawa: 'hop', hachiware: 'hop', usagi: 'hop' }, roam: true }
];
const PALS = ['chiikawa', 'hachiware', 'usagi'];

export function createCameraStory(ctx) {
  const { npcs, village, hud, guide, sound, input, staged } = ctx;
  let S = null; // { kind, t, done, stand, shots, first, cam, row, fh(틀 반 너비 m), spots, gatherT, roam, roamT, shelter }
  let printing = false; // 다음 날 뽑은 사진을 펼쳐 보는 중
  const WHO = { hachiware: () => ctx.who('hachiware'), chiikawa: () => ctx.who('chiikawa'), usagi: () => ctx.who('usagi') };
  /** 대사 줄 { who: 친구 이름 | 없으면 해설, text }. */
  const say = (lines, then) => guide.say(ctx.fill(lines.map((l) => ({ ...l, who: l.who ? WHO[l.who]() : ctx.narrator }))), then, WHO.hachiware());
  const P = () => ctx.getPlayer();
  const npc = (k) => npcs.byKind(k);
  const at = (x, z) => village.nearestFree(x, z, 0.35);
  const later = (ms, fn) => setTimeout(() => { if (S) fn(); }, ms);

  /** 이야기 동안 그 자리로 오게 한다(일과는 미룬다). 멀거나 집에 있으면 화면 밖에서 달려온다. */
  function walkIn(kind, to, anim, face, line) {
    const n = npc(kind);
    if (!n) return null;
    staged.add(kind);
    const p = P().position;
    if (n.away || Math.hypot(n.x - to.x, n.z - to.z) > 16) { const from = at(p.x + (to.x >= p.x ? 6 : -6), p.z + 5); npcs.comeOut(n, from.x, from.z); }
    npcs.plan(n, [{ do: 'walk', x: to.x, z: to.z, run: true }, { do: 'act', anim, time: 9999, face, say: line }]);
    return n;
  }
  /** 그 자리에서 곧바로 몸짓(face: 바라볼 곳). */
  function pose(kind, anim, face, line) {
    const n = npc(kind);
    if (n && !n.away) npcs.act(n, anim, { face, time: 9999, say: line });
    return n;
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

  // ---------- 1) 첫 장 ----------
  function meet(done) {
    // 광장 남쪽에 서고(카메라는 남쪽에서 북쪽을 본다), 둘이 북쪽에서 마주 본다
    const stand = at(0.3, 3.6);
    S = { kind: 'meet', t: 0, done, stand, shots: [], first: null, cam: null, roam: false, roamT: 0, shelter: null };
    input.setEnabled(false);
    hud.setAction(null);
    P().walkTo = { x: stand.x, z: stand.z, speed: 2.4 };
    walkIn('chiikawa', at(stand.x - 0.9, stand.z - 2.0), 'shy', stand);
    walkIn('hachiware', at(stand.x + 0.9, stand.z - 1.8), 'hug', stand);
    later(2300, firstShot);
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
    walkIn('usagi', at(st.x + 2.0, st.z - 1.7), 'hop', st, '야하!');
    later(1700, () => say([{ who: 'hachiware', text: '우사기다~! 우사기도 같이 찍자!' }, { who: 'hachiware', text: '{name}, 셔터 눌러 줄래? 나도 같이 찍히고 싶어~' },
      { text: '(하치와레에게 카메라를 건네받았다. …생각보다 묵직하다!)' }], setupShoot));
  }
  function setupShoot() {
    const st = S.stand, c = ctx.cam.camera;
    // 셋(양 끝 사이 2.2m 남짓)이 뷰파인더 틀 너비의 8할 안에 들어오는 거리. 틀이 작거나 화면이 좁으면(세로 화면) 멀리 선다
    const tanH = Math.tan(THREE.MathUtils.degToRad(c.fov) / 2) * c.aspect, fw = ctx.photo.frameFraction();
    const dist = Math.min(8, Math.max(3.2, 1.1 / (0.8 * tanH * fw)));
    S.fh = tanH * dist * fw; // 셋이 선 거리에서 틀 너비의 반(m)
    S.row = { x: st.x, z: st.z - dist };
    S.cam = { pos: new THREE.Vector3(st.x, 0.92, st.z - 0.5), look: new THREE.Vector3(st.x, 0.55, S.row.z) }; // 내 얼굴 앞에서 셋을 본다
    S.spots = { chiikawa: at(S.row.x - S.fh * 0.55, S.row.z), hachiware: at(S.row.x + S.fh * 0.55, S.row.z), usagi: at(S.row.x + S.fh * 1.2, S.row.z + 0.3) };
    S.kind = 'gather';
    S.gatherT = S.t;
    P().face(S.row.x, S.row.z);
    walkIn('chiikawa', S.spots.chiikawa, 'shy', st);
    walkIn('hachiware', S.spots.hachiware, 'wave', st);
    walkIn('usagi', S.spots.usagi, 'hop', st);
  }
  function round(i) {
    const R = ROUNDS[i];
    S.kind = 'shoot';
    for (const k of PALS) {
      const anim = R.poses[k], n = npc(k);
      if (!anim || !n) continue;
      if (anim === 'peek') { // 등을 이쪽으로 두고 거꾸로 서면 얼굴이 이쪽을 본다
        const spot = at(S.row.x + S.fh * 0.05, S.row.z + 0.35);
        n.x = spot.x; n.z = spot.z;
        pose(k, 'peek', { x: spot.x, z: spot.z - 5 });
        continue;
      }
      if (k !== 'usagi') { n.x = S.spots[k].x; n.z = S.spots[k].z; } // 제자리에서(걷던 중이면 그 자리로)
      pose(k, anim, S.stand);
    }
    S.roam = !!R.roam;
    S.roamT = 0;
    say(R.lines, () => ctx.photo.viewfinder({ label: R.label, n: i + 1, of: ROUNDS.length, onShoot: () => shoot(i) }));
  }
  function shoot(i) {
    const url = ctx.capture({ rect: ctx.photo.frameRect() });
    shutter();
    if (url) { S.shots[i] = url; ctx.photo.roll(url); }
    S.roam = false;
    later(650, () => {
      ctx.photo.hideViewfinder();
      if (i + 1 < ROUNDS.length) { say([{ who: 'hachiware', text: ['찍었다~! 한 장 더!', '우와~ 우사기 대단해~!'][i] }], () => round(i + 1)); return; }
      ctx.photo.rollClear();
      keep();
      rain();
    });
  }
  /** 찍은 사진(하치와레의 첫 장 + 내가 찍은 세 장)을 남긴다. 하나라도 못 찍었으면 그 자리는 비운다(뽑은 사진은 그림으로). */
  function keep() {
    const list = [S.first, ...ROUNDS.map((_, i) => S.shots[i] || null)];
    if (!list.some(Boolean)) return;
    if (list.every(Boolean)) savePhotos(list);
    ctx.photosChanged();
  }

  // ---------- 3) 비 ----------
  function rain() {
    S.kind = 'rain';
    S.cam = null; // 따라가기 카메라로
    ctx.setRain(true);
    const p = P().position;
    pose('hachiware', 'hug', p);
    pose('chiikawa', 'look', { x: p.x, z: p.z - 6 });
    pose('usagi', 'hop', p);
    say([{ text: '(…톡, 토독. 갑자기 빗방울이 떨어지기 시작했다)' }, { who: 'hachiware', text: '앗, 비다!!' }, { who: 'hachiware', text: '카메라가 젖으면 안 돼~!! (카메라를 품에 꼭 안는다)' },
      { who: 'hachiware', text: '{name}, 저기 처마 밑으로 뛰자~!' }], runForCover);
  }
  function runForCover() {
    const p = P().position;
    let best = null, bd = Infinity;
    for (const s of ctx.shelters()) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }
    const sh = S.shelter = best || { x: p.x, z: p.z };
    S.kind = 'run';
    hud.setTimer(['비가 와요', { text: '하치와레랑 처마 밑으로' }]);
    input.setEnabled(true);
    PALS.forEach((k, i) => {
      const n = npc(k);
      if (!n) return;
      const spot = at(sh.x + (i - 1) * 0.95, sh.z + 0.5);
      npcs.plan(n, [{ do: 'walk', x: spot.x, z: spot.z, run: true }, { do: 'act', anim: k === 'hachiware' ? 'hug' : k === 'usagi' ? 'hop' : 'shy', time: 9999, face: { x: spot.x, z: spot.z + 5 } }]);
    });
  }
  function sheltered() {
    S.kind = 'shelter';
    input.setEnabled(false);
    hud.setTimer(null);
    hud.setAction(null);
    P().face(S.shelter.x, S.shelter.z + 5);
    say([{ who: 'hachiware', text: '휴우… 카메라는 무사해~' }, { who: 'hachiware', text: '카메라가 생기니까 비 올 때도 조심해야 하네~' },
      { who: 'hachiware', text: '계속 들고 다니니까 조금 무겁기도 하고~ 헤헤' }, { who: 'chiikawa', text: '…(손수건으로 카메라를 같이 닦아 준다)' },
      { who: 'usagi', text: '야하~! (빗속으로 뛰어나가 첨벙첨벙)' }, { text: '(비는 금세 그쳤다)' }], () => {
      ctx.setRain(false);
      S.kind = 'outro';
      S.t = 0;
      S.done();
    });
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
      if ((S.kind === 'gather' || S.kind === 'shoot') && S.row) clearView();
      // 셋이 찍을 자리에 다 왔으면(늦어도 4초) 첫 장
      if (S.kind === 'gather' && (S.t - S.gatherT > 4 || PALS.every((k) => { const n = npc(k); return !n || n.away || Math.hypot(n.x - S.spots[k].x, n.z - S.spots[k].z) < 0.4; }))) round(0);
      // 셋이서 찍는 동안 우사기는 가만히 있지 않는다: 틀 밖까지 이리저리 뛰어다닌다
      if (S.kind === 'shoot' && S.roam) {
        S.roamT -= dt;
        const u = npc('usagi');
        if (u && S.roamT <= 0) {
          S.roamT = 0.9 + Math.random() * 0.8;
          const xs = [-1.3, -0.25, 0.1, 0.35, 1.3], to = at(S.row.x + S.fh * xs[Math.floor(Math.random() * xs.length)], S.row.z + 0.3); // 둘 사이 · 틀 밖 양옆
          npcs.plan(u, [{ do: 'walk', x: to.x, z: to.z, run: true }, { do: 'act', anim: 'hop', time: 9999, face: S.stand }]);
        }
      }
      if (S.kind === 'run' && S.shelter && Math.hypot(P().position.x - S.shelter.x, P().position.z - S.shelter.z) < 2.4) sheltered();
      if (S.kind === 'outro' && S.t > 0.6 && !guide.open) { release(); S = null; }
    },
    reset() { release(); S = null; printing = false; ctx.photo.hidePrints(); }
  };
}
