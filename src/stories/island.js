import { BEATS, GATHER, CHORUS, BATTLE, ROAMS } from './islandscript.js';
import { createIslandRoam } from './islandroam.js';

/**
 * 사이드스토리 '수상한 섬 합숙'(원작 세이렌(섬) 편) 진행. 데이터(부탁 · 보상)는 core/quests.js 의 islandCamp, 대본은 stories/islandscript.js.
 *  1) 아침 선착장: 치이카와 · 하치와레 · 우사기 · 랏코가 모인다(우사기는 맨몸) → 오리 배에 올라 섬 모드(world/island.js)로.
 *  2) 대본의 장면을 차례로: 검은 화면(제목) → 자리 · 카메라 · 하늘을 맞추고 → 대사 · 연출 · 놀이(노 젓기 · 인어 합창 · 헤엄 · 박자 · 카레 던지기).
 *     축제 · 밤의 정글 · 동굴 구출은 직접 걷는다(stories/islandroam.js): 말 걸기 · 먹기 · 춤 · 덩굴 끊기.
 *  3) 마지막 밤 모닥불 뒤 진짜로 잔다(sleepOver: 밤 10시로 맞추고 잠 → 다음 날 아침). 섬에 있는 동안 마을 시계는 멈춰 있다.
 *  4) 떠나는 배 · 먼 바다 장면 → 마을 선착장으로 돌아와 마무리 대사 · 보상(퀘스트 done).
 * ctx: { npcs, village, hud, guide, sound, input, staged, isle, rhythm, minigame, pier, cam, getPlayer, who(kind), me(), narrator, fill(lines),
 *        setMode, setCinematic, myLook, sleepOver(after), arriveBeside(kind, x, z) }
 */
const KEY = { c: 'chiikawa', h: 'hachiware', u: 'usagi', r: 'rakko', m: 'momonga', k: 'kani', q: 'kurimanju', s: 'shisa' };
const GUESTS = {
  j: { kind: 'jiro', name: '시마지로', tag: '#f0c28e', ink: '#6a3a12' },
  t: { kind: 'hitoha', name: '한잎', tag: '#d4dcc6', ink: '#3d5230' },
  f: { kind: 'futaba', name: '두잎', tag: '#dde0e5', ink: '#3f4650' },
  i: { kind: 'islander', name: '섬사람', tag: '#e3e5e8', ink: '#4a5058' },
  z: { kind: 'siren', name: '세이렌', tag: '#bfe3ef', ink: '#1f4d63' }
};
const PIER_PALS = ['chiikawa', 'hachiware', 'usagi', 'rakko']; // 마을 선착장에 모이는 친구(섬에 있는 동안 마을에서 숨는다)
const LEIS = ['me', 'chiikawa', 'hachiware', 'usagi', 'rakko', 'momonga', 'kani'];
const NOTE_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M16 30V10l16-4v20" fill="none" stroke="#3a4a7a" stroke-width="3" stroke-linejoin="round"/><ellipse cx="12" cy="30" rx="6" ry="4.6" fill="#ffd6f0" stroke="#3a4a7a" stroke-width="2.4"/><ellipse cx="28" cy="26" rx="6" ry="4.6" fill="#ffd6f0" stroke="#3a4a7a" stroke-width="2.4"/></svg>';
const CAN_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="11" y="8" width="18" height="26" rx="3" fill="#f2d14a" stroke="#5a4431" stroke-width="2.4"/><path d="M11 15h18M11 27h18" stroke="#5a4431" stroke-width="2"/><ellipse cx="20" cy="8.5" rx="7" ry="2" fill="#e8e3d6" stroke="#5a4431" stroke-width="2"/></svg>';
const CHORUS_BPM = 100, BATTLE_BPM = 124;
const ROW_SPAN = 6.5; // 노 젓기: 다 저으면 배가 이만큼 나아간다
const good = (rank) => rank === 'S' || rank === 'A';
const list = (k) => (Array.isArray(k) ? k : [k]);
const isLine = (L) => typeof L === 'string' || Array.isArray(L);

export function createIslandTrip(ctx) {
  const { isle, guide, hud, sound, input, npcs, staged, rhythm, minigame } = ctx;
  let S = null; // { kind: 'gather' | 'island' | 'outro', i, o, pos, camPos, res, leis, done, follow, eighth, bpm, beatSnd }

  const speaker = (key) => (key === 'me' ? ctx.me() : KEY[key] ? ctx.who(KEY[key]) : GUESTS[key] || ctx.narrator);
  const line = (L) => (typeof L === 'string' ? { who: ctx.narrator, text: L } : { who: speaker(L[0]), text: L[1] });
  const rel = (x, z) => ({ x: S.o.x + x, z: S.o.z + z });
  const relSpec = (sp) => (sp && sp.x !== undefined ? { ...sp, ...rel(sp.x, sp.z) } : sp);

  /** 대사 · 연출 목록을 차례로. 대사는 이어서 한 상자로, 연출은 하나씩(기다리는 연출은 끝나면 다음으로). */
  function run(items, done) {
    let i = 0;
    const next = () => {
      if (!S) return;
      if (i >= items.length) { done(); return; }
      const batch = [];
      while (i < items.length && isLine(items[i])) batch.push(line(items[i++]));
      if (batch.length) { guide.say(ctx.fill(batch), next, ctx.narrator); return; }
      act(items[i++], next);
    };
    next();
  }

  // ---------- 자리 · 카메라 ----------
  function worldOf(k) {
    const p = S.pos[k];
    if (!p) return null;
    const base = p.ride ? isle.boatPos(p.ride) : S.o;
    return base ? { x: base.x + p.dx, z: base.z + p.dz } : null;
  }
  function faceOf(f, w) {
    if (typeof f === 'number') return f;
    const t = f === 'cam' ? S.camPos : typeof f === 'string' ? worldOf(f) : Array.isArray(f) ? rel(f[0], f[1]) : null;
    return t && w ? Math.atan2(t.x - w.x, t.z - w.z) : 0;
  }
  function put(k) {
    const p = S.pos[k], w = worldOf(k);
    if (!w) return;
    isle.place(k, { x: p.ride ? p.dx : w.x, z: p.ride ? p.dz : w.z, face: faceOf(p.face, w), mode: p.mode, y: p.y, ride: p.ride });
  }
  function placeAll(cast) {
    for (const [k, e] of Object.entries(cast)) S.pos[k] = { dx: e[0], dz: e[1], face: e[2], mode: e[3] || 'idle', y: e[4] || 0, ride: e[5] || null };
    Object.keys(cast).forEach(put);
  }
  function repose(k, patch) { if (S.pos[k]) { Object.assign(S.pos[k], patch); put(k); } }
  function camera(pos, look, blend = 0) {
    const o = S.o;
    isle.setCamera([o.x + pos[0], pos[1], o.z + pos[2]], [o.x + look[0], look[1], o.z + look[2]], blend);
    S.camPos = { x: o.x + pos[0], z: o.z + pos[2] };
  }

  /** 사람 이름(kind) → 말하는 사람(이름표). */
  const whoKind = (k) => Object.values(GUESTS).find((g) => g.kind === k) || (String(k).startsWith('isl') ? GUESTS.i : k === 'me' ? ctx.me() : ctx.who(k));
  const roam = createIslandRoam({
    isle, input, hud, guide, sound, run: (items, done) => run(items, done), who: whoKind,
    move: (k, x, z, face, mode, y) => { S.pos[k] = { dx: x - S.o.x, dz: z - S.o.z, face, mode, y: y || 0, ride: null }; put(k); },
    face: (k, x, z) => { const p = S.pos[k]; if (p) { p.saved = p.face; repose(k, { face: [x - S.o.x, z - S.o.z] }); } },
    unface: (k) => { const p = S.pos[k]; if (p && 'saved' in p) { const f = p.saved; delete p.saved; repose(k, { face: f }); } },
    pose: (k, mode) => repose(k, { mode }),
    others: () => Object.keys(S.pos).filter((k) => k !== 'me').map((k) => ({ k, ...worldOf(k) })).filter((p) => p.x !== undefined),
    setBody: (on) => document.body.classList.toggle('in-roam', on)
  });

  // ---------- 연출 ----------
  const SYNC = {
    pose: (a) => list(a.k).forEach((k) => repose(k, { mode: a.mode, ...(a.face !== undefined ? { face: a.face } : {}) })),
    cast: (a) => placeAll(a.cast),
    hide: (a) => list(a.k).forEach((k) => { isle.place(k, null); delete S.pos[k]; }),
    siren: (a) => { const { do: _d, ...sp } = a; isle.siren(relSpec(sp)); },
    sirenMouth: (a) => isle.sirenMouth(a.v),
    mer: (a) => isle.mermaids(a.list.map(relSpec)),
    tendrils: (a) => isle.tendrils(a.spec ? relSpec(a.spec) : null),
    bind: (a) => list(a.k).forEach((k) => isle.bind(k, a.on)),
    unbind: () => isle.unbindAll(),
    boat: (a) => isle.boat(a.kind, a.spec ? relSpec(a.spec) : null),
    cam: (a) => camera(a.pos, a.look, a.blend || 0),
    fire: (a) => isle.fire(a.name, a.on),
    sign: (a) => isle.sign(a.fallen),
    lid: (a) => isle.lid(a.on),
    snd: (a) => sound.play(a.name),
    shake: (a) => isle.shake(a.sec),
    splash: (a) => { const p = rel(a.x, a.z); isle.splash(p.x, p.z, a.s); },
    notes: (a) => { const w = worldOf(a.k), p = S.pos[a.k]; isle.notes(a.on && !!w, w && { x: w.x, y: (p.y || 0) + 1.5, z: w.z, w: 0.4, size: 0.45 }); },
    bubbles: (a) => isle.bubbles(a.on),
    lei: (a) => { list(a.k).forEach((k) => isle.lei(k, a.on)); S.leis = a.on; },
    scale: () => { const w = worldOf('me'); if (w) isle.flyScale({ x: w.x, y: 2, z: w.z }); sound.play('chime'); }
  };
  function act(a, next) {
    if (SYNC[a.do]) { SYNC[a.do](a); next(); return; }
    if (a.do === 'wait') setTimeout(() => S && next(), a.sec * 1000);
    else if (a.do === 'ask') guide.ask(ctx.fill([a.text])[0], a.choices, (i) => run(a.then[i] || [], next), speaker(a.k));
    else if (a.do === 'game') GAMES[a.game](() => S && next());
    else if (a.do === 'branch') run(good(S.res[a.on]) ? a.good : a.bad, next);
    else if (a.do === 'sleep') ctx.sleepOver(() => S && next());
    else if (a.do === 'roam') roam.start(ROAMS[a.id], S.o, () => S && next());
    else next();
  }

  // ---------- 놀이 ----------
  function startRhythm(bpm, chart, look, beatSnd, onHit, key, done) {
    S.eighth = -1; S.bpm = bpm; S.beatSnd = beatSnd;
    rhythm.start({ bpm, chart, ...look, onHit, onEnd: (res) => { S.res[key] = res.rank; S.beatSnd = null; setTimeout(() => S && done(), 500); } });
  }
  const GAMES = {
    /** 노 젓기(연타): 저은 만큼 보트가 동굴 쪽으로 나아가고 카메라가 따라간다. */
    row(done) {
      const b0 = isle.boatPos('row');
      let best = 0;
      S.follow = () => { const b = isle.boatPos('row'); if (b) isle.setCamera([b.x - 6.5, 2.8, b.z + 2.8], [b.x + 5, 1, b.z]); };
      minigame.mash({
        label: '노 젓기! 연타!', button: '영차!', gain: 0.07, decay: 0.08,
        onTick: (p) => { best = Math.max(best, p); isle.boat('row', { x: b0.x + best * ROW_SPAN, z: b0.z, face: Math.PI / 2 }); },
        onDone: () => { S.follow = null; setTimeout(() => S && done(), 600); } // 연타하던 손이 다음 대사를 넘기지 않게 잠깐 쉰다
      });
    },
    /** 인어 합창(박자): 우사기 노래에 박자를 맞춰 인어가 따라 부르게. */
    chorus(done) {
      startRhythm(CHORUS_BPM, CHORUS, { label: '인어 합창', hint: '음표가 동그라미에 닿을 때 <kbd>Space</kbd> · 탭!', go: '라~♪', icon: NOTE_SVG }, 'soft', () => sound.play('chime'), 'chorus', done);
    },
    /** 바닷속 헤엄(타이밍 3번): 시마지로의 파도에 맞춰 앞으로. */
    swim(done) {
      minigame.timing({
        label: '숨 참고… 파도에 맞춰 헤엄!', button: '헤엄!', need: 3, zone: [0.4, 0.6], speed: 0.75, grow: 0.05,
        onHit: (n) => {
          sound.play('wave');
          ['jiro', 'chiikawa', 'me'].forEach((k) => repose(k, { dz: S.pos[k].dz - 1.6 }));
          camera([0, -1.5, 5 - n * 1.6], [0, -2, -2 - n * 1.6], 0.6);
        },
        onMiss: () => sound.play('fail'),
        onDone: () => setTimeout(() => S && done(), 400)
      });
    },
    /** 결전(박자): 맥주 캔 · 랩 · 고함으로 인어들의 합창을 흐트러뜨린다. */
    battle(done) {
      startRhythm(BATTLE_BPM, BATTLE, { label: '노래 흐트러뜨리기', hint: '캔이 동그라미에 닿을 때 <kbd>Space</kbd> · 탭!', go: '야하!', icon: CAN_SVG }, 'beat', () => sound.play('can'), 'battle', done);
    },
    /** 카레 던지기(타이밍 1번): 세이렌의 입이 크게 벌어졌을 때. 빗나가면 칸이 넓어진다. */
    throw(done) {
      minigame.timing({
        label: '입이 크게 벌어졌을 때 카레를 던져!', button: '던져!', need: 1, zone: [0.78, 0.98], speed: 0.6, grow: 0.08,
        onTick: (p) => isle.sirenMouth(p),
        onMiss: () => sound.play('fail'),
        onDone: () => {
          const w = worldOf('me');
          isle.throwCurry([w.x, 3.6, w.z], isle.mouthPos(), () => { isle.sirenMouth(null); done(); });
        }
      });
    }
  };

  // ---------- 장면 ----------
  function setupBeat(b) {
    isle.clear();
    S.pos = {};
    S.o = b.at;
    isle.setSky(b.sky || 'day');
    if (b.cam) camera(b.cam[0], b.cam[1], 0);
    for (const [k, sp] of Object.entries(b.boats || {})) isle.boat(k, sp ? relSpec(sp) : null);
    if (b.siren) isle.siren(relSpec(b.siren));
    if (b.mer) isle.mermaids(b.mer.map(relSpec));
    if (b.tendrils) isle.tendrils(relSpec(b.tendrils));
    (b.fires || []).forEach((f) => isle.fire(f, true));
    if (b.cast) placeAll(b.cast);
    (b.binds || []).forEach((k) => isle.bind(k, true));
    const pr = b.props || {};
    if (pr.pot) isle.pot(true);
    if (pr.memory) isle.memoryProps(true);
    if (pr.farShadow) { const p = rel(pr.farShadow[0], pr.farShadow[1]); isle.farShadow(true, p.x, p.z); }
    if (S.leis) LEIS.forEach((k) => isle.lei(k, true));
  }
  function playBeat(i) {
    if (!S) return;
    const b = BEATS[i];
    if (!b) { leaveIsland(); return; }
    S.i = i;
    hud.curtain(true, b.title || '');
    setTimeout(() => {
      if (!S) return;
      setupBeat(b);
      hud.curtain(false);
      setTimeout(() => S && run(b.lines, () => playBeat(i + 1)), 800);
    }, b.title ? 1900 : 700);
  }

  // ---------- 마을 ↔ 섬 ----------
  function gather() {
    S.kind = 'gather';
    input.setEnabled(false);
    hud.setAction(null);
    const spot = ctx.pier.spot, p = ctx.getPlayer();
    p.setPosition(spot.x, spot.z);
    p.face(spot.x, spot.z + 5);
    ctx.cam.snap(p.position);
    PIER_PALS.forEach((k, i) => {
      const n = npcs.byKind(k);
      if (!n) return;
      staged.add(k);
      const from = ctx.village.nearestFree(spot.x - 5 + i * 1.6, spot.z - 7, 0.4), to = ctx.village.nearestFree(spot.x - 2 + i * 1.3, spot.z - 1.5, 0.3);
      npcs.comeOut(n, from.x, from.z);
      npcs.plan(n, [{ do: 'walk', x: to.x, z: to.z, run: true }, { do: 'act', anim: i === 2 ? 'hop' : 'look', time: 9999, face: { x: spot.x, z: spot.z } }]);
    });
    setTimeout(() => S && run(GATHER, () => enterIsland(0)), 2400);
  }
  function enterIsland(from) {
    hud.curtain(true, '');
    setTimeout(() => {
      if (!S) return;
      PIER_PALS.forEach((k) => { const n = npcs.byKind(k); if (n) { staged.add(k); npcs.plan(n, []); npcs.goIn(n); } });
      ctx.setMode('island');
      ctx.setCinematic(true);
      isle.start(ctx.myLook());
      S.kind = 'island';
      S.leis = from > 1;
      playBeat(from);
    }, 900);
  }
  function stopGames() {
    roam.stop();
    if (rhythm.active) rhythm.stop();
    minigame.stop();
    S.follow = null;
    S.beatSnd = null;
  }
  function leaveIsland() {
    hud.curtain(true, '(오리 배를 타고, 마을로…)');
    setTimeout(() => {
      if (!S) return;
      stopGames();
      isle.clear();
      ctx.setMode('play');
      ctx.setCinematic(false);
      const spot = ctx.pier.spot, p = ctx.getPlayer();
      p.setPosition(spot.x, spot.z);
      p.face(spot.x, spot.z - 4);
      ctx.cam.snap(p.position);
      PIER_PALS.forEach((k, i) => {
        const at = ctx.village.nearestFree(spot.x - 2 + i * 1.3, spot.z - 1.4, 0.3);
        ctx.arriveBeside(k, at.x, at.z);
        const n = npcs.byKind(k);
        if (n) npcs.act(n, i === 2 ? 'hop' : 'look', { face: p.position, time: 60 });
      });
      hud.curtain(false);
      S.kind = 'outro';
      S.t = 0;
      setTimeout(() => { if (S && !S.doneCalled) { S.doneCalled = true; S.done?.(); } }, 1200);
    }, 1900);
  }
  /** 다 끝났다: 붙잡아 둔 친구들을 일과로 돌려보낸다. */
  function cleanup() {
    PIER_PALS.forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); });
    if (!guide.open) input.setEnabled(true);
    S = null;
  }

  return {
    /** 연출 중(마을 선착장 · 섬 · 돌아온 뒤 마무리 대사)인지. */
    get active() { return !!S; },
    get inIsland() { return !!S && S.kind === 'island'; },
    /** 지금 단계 · 장면(디버그 · 테스트용). */
    get phase() { return S ? (S.kind === 'island' ? BEATS[S.i]?.id || 'island' : S.kind) : null; },
    /** 시작(아침 선착장). from: 장면 이름을 주면 선착장 없이 그 장면부터(테스트 앱). done: 마무리 대사 · 보상. */
    play({ done, from = null } = {}) {
      if (S) return;
      S = { kind: 'gather', i: 0, o: { x: 0, z: 0 }, pos: {}, camPos: null, res: {}, leis: false, done, follow: null, eighth: -1, t: 0 };
      if (from == null) { gather(); return; }
      input.setEnabled(false);
      enterIsland(Math.max(0, BEATS.findIndex((b) => b.id === from)));
    },
    /** 섬 모드에서 매 프레임: 장면 · 놀이 화면 · 박자 소리. */
    tick(dt, t) {
      if (!S) return;
      roam.tick(dt);
      isle.update(dt, t);
      minigame.update(dt);
      if (S.follow) S.follow();
      if (!rhythm.active) return;
      rhythm.update();
      const tt = rhythm.time;
      if (S.beatSnd && tt != null) {
        const e = Math.floor(tt / (30 / S.bpm));
        if (e !== S.eighth) { S.eighth = e; if (S.beatSnd === 'beat') sound.play(e % 2 ? 'hat' : 'kick'); else if (e % 2 === 0) sound.play('hat'); }
      }
    },
    /** 직접 걷는 중인지(행동 버튼 · 머리 위 안내를 받는다). */
    get roaming() { return roam.active; },
    /** 행동 버튼 · 스페이스(직접 걷는 중): 가까운 곳에서 할 일. */
    press() { if (S) roam.press(); },
    /** 직접 걷기 상태(디버그 · 헤드리스 시험용). */
    roamInfo() { return roam.info(); },
    /** 머리 위 안내(직접 걷는 중). */
    labels() { return S ? roam.labels() : []; },
    /** 마을에서 매 프레임(돌아온 뒤 마무리 대사가 끝나면 정리). */
    update(dt) {
      if (!S || S.kind !== 'outro') return;
      S.t += dt;
      if (S.doneCalled && !guide.open && S.t > 1.5) cleanup();
    },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다. */
    reset() {
      if (!S) return;
      stopGames();
      isle.clear();
      PIER_PALS.forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); }); // 선착장으로 걸어오던 계획도 접는다
      S = null;
    }
  };
}
