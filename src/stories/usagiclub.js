import { CLUB_BPM, clubChart } from '../core/rhythm.js';
import { hourOf } from '../core/clock.js';
import { isActive, isDone, sideBusy } from '../core/quests.js';
import { hearts, friendOf } from '../core/friends.js';
import { VILLAGE_R } from '../core/layout.js';

/**
 * 사이드스토리 '우사기의 집'(원작 319 · 320화) 연출. 데이터(부탁 · 보상)는 core/quests.js 의 usagiHome · clubNight.
 *  1) 목격: 밤 7시 반 ~ 9시 반, 우사기(하트 2개 이상)가 내 뒤에서 쌩 달려와 손목시계를 보고 "우라!" → 숲속 큰 나무 구멍으로(story.usagiSeen).
 *  2) 다음 날 저녁 하치와레에게 이야기 표시: "오늘 밤 셋이서 몰래 따라가 보자"
 *  3) 밤 8 ~ 12시 광장: 치이카와 · 하치와레와 만나 우사기를 몰래 따라간다. 우사기가 뒤돌아보면 멈춰야 한다(움직이면 "…하?").
 *     너무 멀어지면 우사기가 흥얼거리며 기다려 주고, 아예 놓치면(40m) 그날은 접고 다음 밤에 다시.
 *  4) 숲 깊숙이 큰 나무 밑동 구멍(world/burrows.js) 앞에서 '따라 들어가기' → 어두운 터널 → 클럽(world/club.js): 무대 위 우사기 DJ, 박자 맞추기 춤(ui/rhythm.js).
 *  5) 강가 굴로 나온다. 우사기는 "야하!" 하고 집 쪽으로 달려가고, 마지막 대사 · 보상은 퀘스트(done)가.
 *  clubNight(되풀이): 우사기가 가자고 하면 바로 클럽(터널 없이) → 춤 → 강가 굴.
 * ctx: { getState, commit, npcs, player, cam, village, input, hud, guide, sound, club, rhythm, burrows, staged(Set),
 *        who(kind), narrator, fill(lines), setMode, setCinematic, putToBed(kind), homeDoor(kind), myLook, onAbort }
 */
const SIGHT_HEARTS = 2;
const SPB = 60 / CLUB_BPM;
const SEE = 15; // 우사기가 돌아봤을 때 이 안에서 움직이면 들킨다
const TOO_CLOSE = 2.2, TOO_FAR = 16, CATCH_UP = 11, LOST = 40;
const LOOK_SEC = 1.7, WARN_SEC = 0.7, STILL_SEC = 1.3;
// 광장 → 서쪽 큰길 → 서쪽 문 → 숲길 깊숙이(지날 때마다 한 번씩 뒤돌아본다). 다 오면 숲길 옆 큰 나무 구멍 앞으로
const ROUTE = [{ x: -6, z: 0.6 }, { x: -15, z: 0.6 }, { x: -23, z: 0.4 }, { x: -31, z: -0.5 }, { x: -39, z: -0.3 }, { x: -47, z: 2.3 }];
const HUMS = ['우라~♪', '야하~', '(흥얼흥얼)', '우라라~♪'];
const PALS = ['chiikawa', 'hachiware'];

export function createUsagiClub(ctx) {
  const { npcs, cam, village, input, hud, guide, sound, club, rhythm, staged } = ctx; // 내 캐릭터(ctx.player)는 새 게임마다 새로 만들어져서 그때그때 읽는다
  let S = null;
  let lostDay = 0; // 놓친 날(그날 밤에는 광장에 다시 와도 시작하지 않는다)
  const usagi = () => npcs.byKind('usagi');
  const forest = () => ctx.burrows.spots.forest, river = () => ctx.burrows.spots.river;
  const H = () => ctx.who('hachiware'), C = () => ctx.who('chiikawa'), U = () => ctx.who('usagi');
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const say = (lines, then, who = ctx.narrator) => guide.say(ctx.fill(lines), then, who);
  const palSay = (kind, text) => { const n = npcs.byKind(kind); if (n && !n.away) npcs.say(n, text); };
  const stage = (kind) => { staged.add(kind); return npcs.byKind(kind); };
  const unstage = (kind) => staged.delete(kind);

  // ---------- 1) 목격 ----------
  function canSight(state) {
    if (S || !state || !state.clock || (state.tutorial && state.tutorial !== 'done')) return false; // 옛 저장(안내 기록 없음)도
    if (isActive(state, 'usagiHome') || isDone(state, 'usagiHome') || (state.story || {}).usagiSeen || sideBusy(state)) return false;
    if (hearts(friendOf(state, 'usagi')) < SIGHT_HEARTS) return false;
    const h = hourOf(state.clock), p = ctx.player.position, u = usagi();
    if (h < 19.5 || h >= 21.5 || Math.hypot(p.x, p.z) > VILLAGE_R - 2) return false;
    return !!u && !u.away && !u.party && !u.follow && !staged.has('usagi') && !npcs.busy(u);
  }
  function sight() {
    const u = stage('usagi'), p = ctx.player.position, b = forest();
    const from = village.nearestFree(p.x + 6, p.z + 9, 0.5), by = village.nearestFree(p.x + 1.8, p.z + 0.7, 0.4);
    S = { kind: 'sight', t: 0, seen: false };
    npcs.comeOut(u, from.x, from.z);
    npcs.plan(u, [
      { do: 'walk', x: by.x, z: by.z, run: true },
      { do: 'act', anim: 'look', time: 1.3, say: '(손목시계를 힐끗 본다)', face: { x: p.x - 4, z: p.z - 6 }, quick: true },
      { do: 'say', text: '우라!' },
      { do: 'call', fn: () => sightSeen() },
      { do: 'walk', x: b.front.x, z: b.front.z, run: true },
      { do: 'act', anim: 'hop', time: 0.6, quick: true },
      { do: 'call', fn: () => sightEnd() }
    ]);
  }
  function sightSeen() {
    const s = ctx.getState();
    if (!S || S.seen || !s || !s.clock) return;
    S.seen = true;
    if (!(s.story || {}).usagiSeen) ctx.commit({ ...s, story: { ...(s.story || {}), usagiSeen: s.clock.day } });
    hud.toast('우사기가 집이 아닌 숲 쪽으로 쌩 달려갔다…?', 3800);
  }
  function sightEnd() {
    if (!S || S.kind !== 'sight') return;
    if (!ctx.getState()) { S = null; return; }
    sightSeen();
    ctx.putToBed('usagi'); // 나무 구멍으로 쏙(다음 날 아침에는 늘 그렇듯 자기 집에서 나온다)
    unstage('usagi');
    S = null;
  }

  // ---------- 3) 광장에서 만나 몰래 따라가기 ----------
  function meet(id, done) {
    S = { kind: 'meet', id, done, t: 0 };
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true);
    setTimeout(() => {
      if (!S) return;
      const p = ctx.player.position, u = stage('usagi');
      const at = village.nearestFree(p.x + 2.5, p.z - 6, 0.5); // 화면 앞쪽(북쪽)에서 나온다
      npcs.comeOut(u, at.x, at.z);
      npcs.act(u, 'stretch', { face: { x: at.x - 5, z: at.z }, time: 60, say: '(쭈욱~ 기지개)' });
      [['chiikawa', -1.2, 0.8], ['hachiware', 1.2, 0.8]].forEach(([k, dx, dz]) => {
        const n = stage(k);
        if (!n) return;
        npcs.comeOut(n, p.x + dx, p.z + dz);
        npcs.act(n, 'look', { face: u, time: 60, say: k === 'chiikawa' ? '(소곤소곤…)' : '쉿~' }); // 자러 가던 한마디는 지운다
      });
      ctx.player.face(u.x, u.z);
      cam.snap(p);
      hud.curtain(false);
      say([
        { who: H(), text: '왔구나, {name}! 쉿~ 저기 봐, 우사기 나온다!' },
        { who: C(), text: '…(두근두근)' },
        { who: H(), text: '들키지 않게 살금살금 따라가자! 우사기가 뒤돌아보면 꼼짝 말고 멈추기~' }
      ], startFollow, H());
    }, 600);
  }
  function startFollow() {
    if (!S) return;
    Object.assign(S, { kind: 'follow', leg: 0, watch: null, waiting: false, diving: false, lostT: 0, caught: 0, last: { x: ctx.player.position.x, z: ctx.player.position.z } });
    PALS.forEach((k) => { const n = npcs.byKind(k); if (n) { npcs.plan(n, []); npcs.setFollow(k, true); } });
    input.setEnabled(true);
    hud.toast('우사기를 몰래 따라가요', 3400, { chips: [{ text: '돌아보면 멈추기!' }] });
    nextLeg();
  }
  function nextLeg() {
    const u = usagi(), w = ROUTE[S.leg];
    if (!w) {
      const f = forest().front;
      npcs.plan(u, [{ do: 'walk', x: f.x, z: f.z }, { do: 'say', text: '야하!' }, { do: 'act', anim: 'hop', time: 0.5, quick: true }, { do: 'call', fn: dive }]);
      S.diving = true;
      return;
    }
    npcs.plan(u, [{ do: 'walk', x: w.x, z: w.z }, { do: 'call', fn: () => beginWatch(true) }]);
    if (Math.random() < 0.6) npcs.say(u, pick(HUMS));
  }
  function beginWatch(advance) {
    const u = usagi();
    npcs.act(u, 'idle', { time: 30 });
    npcs.say(u, '…?');
    S.watch = { t: 0, turned: false, caught: false, still: 0, advance };
  }
  function endWatch() {
    const W = S.watch;
    S.watch = null;
    if (W.advance) S.leg++;
    npcs.say(usagi(), W.caught ? '…? (기분 탓인가)' : pick(HUMS));
    nextLeg();
  }
  function dive() {
    if (!S) return;
    const u = usagi();
    if (u) npcs.goIn(u);
    S.kind = 'burrow';
    S.diving = false;
    S.burrowAt = S.t;
    S.lostT = 0;
    palSay('hachiware', '저 큰 나무 구멍으로 쏙 들어갔어! 우리도 가 보자~!');
    setTimeout(() => palSay('chiikawa', '…!! (따라간다)'), 900);
  }
  function abort() {
    const s = ctx.getState();
    lostDay = s && s.clock ? s.clock.day : 0;
    input.setEnabled(false);
    say([{ who: H(), text: '앗… 우사기를 놓쳐 버렸다~' }, { who: C(), text: '…흐잉…' }, { who: H(), text: '내일 밤에 다시 해 보자! 밤 8시 넘어서 광장에서~' }], () => { cleanup(); ctx.onAbort(); }, H());
  }
  function updateFollow(dt) {
    const u = usagi(), p = ctx.player.position;
    if (!u) return;
    const d = dist(u, p), moved = dist(p, S.last) > 0.7 * dt;
    S.last = { x: p.x, z: p.z };
    if (S.kind === 'burrow') {
      if (!S.hinted && S.t - S.burrowAt > 25) { S.hinted = true; palSay('hachiware', '저 나무 밑 구멍으로 들어가 보자~!'); }
      if (dist(p, forest().front) > LOST) { S.lostT += dt; if (S.lostT > 4) { S.kind = 'lost'; abort(); } } else S.lostT = 0;
      return;
    }
    if (d > LOST && !u.away) { S.lostT += dt; if (S.lostT > 4) { S.kind = 'lost'; abort(); return; } } else S.lostT = 0;
    const W = S.watch;
    if (W) {
      W.t += dt;
      if (!W.turned && W.t > WARN_SEC) { W.turned = true; u.yaw = Math.atan2(p.x - u.x, p.z - u.z); sound.play('warn'); }
      if (W.turned) {
        if (moved && d < SEE) {
          W.still = 0;
          if (!W.caught) {
            W.caught = true; S.caught++;
            npcs.say(u, '…하?');
            palSay('hachiware', '쉿…! 꼼짝 마~!');
            setTimeout(() => palSay('chiikawa', '…!!(움찔)'), 400);
          }
        } else W.still += dt;
        if (W.t > WARN_SEC + LOOK_SEC && W.still >= (W.caught ? STILL_SEC : 0)) endWatch();
      }
      return;
    }
    if (S.diving) return;
    if (S.waiting) {
      if (d < CATCH_UP) { S.waiting = false; nextLeg(); }
      return;
    }
    if (d > TOO_FAR) {
      S.waiting = true;
      npcs.act(u, 'sway', { time: 60 });
      npcs.say(u, '(흥얼흥얼…♪)');
      palSay('hachiware', '앗, 너무 멀어졌다! 얼른 따라가자~');
    } else if (d < TOO_CLOSE) beginWatch(false); // 너무 바짝 붙으면 기척을 느끼고 돌아본다
  }

  // ---------- 4) 클럽 ----------
  function enterClub() {
    const again = S.again;
    S.kind = 'club';
    input.setEnabled(false);
    hud.setAction(null);
    if (!again) PALS.forEach((k) => { const n = npcs.byKind(k); if (n) { npcs.setFollow(k, false); npcs.goIn(n); } });
    else { const u = usagi(); if (u) npcs.goIn(u); }
    hud.curtain(true, again ? '(우사기를 따라 숲속 큰 나무 구멍으로…)' : '');
    setTimeout(() => {
      if (!S) return;
      ctx.setMode('club');
      ctx.setCinematic(true);
      sound.duck(true);
      club.start(ctx.myLook(), { withTunnel: !again, pals: !again });
      Object.assign(S, { clubT: 0, beat: -1, eighth: -1, revealed: again });
      hud.curtain(false);
      if (again) afterReveal();
    }, again ? 1600 : 700);
  }
  function afterReveal() {
    club.setPals('look');
    const lines = S.again
      ? [{ who: U(), text: '야하~!!' }, '(오늘도 우사기의 DJ 타임이 시작됐다!)', { who: U(), text: '우라! (춤추라는 듯 손짓한다)' }]
      : [{ who: H(), text: '여, 여기가… 우사기 집…?!' }, { who: C(), text: '……!! (반짝반짝)' }, { who: U(), text: '우라!' },
        '(우사기가 무대 위로 올라가 도토리에 나뭇잎을 문지르기 시작했다…! 끽끽♪)',
        { who: H(), text: '{name}, 우리도 춤추자~! 도토리가 동그라미에 닿을 때 맞춰서!' }];
    setTimeout(() => S && say(lines, startDance), 900);
  }
  function startDance() {
    if (!S) return;
    club.setPals('dance');
    rhythm.start({
      bpm: CLUB_BPM, chart: clubChart(),
      onHit: (q, combo) => {
        sound.play('scratch');
        club.meDance(0.45);
        club.cheer(q === 'perfect' && combo >= 4);
        if (combo === 8 || combo === 16 || combo === 24) sound.play('cheer');
        club.setFever(combo >= 8);
      },
      onMiss: () => club.setFever(false),
      onEnd: danceEnd
    });
  }
  function danceEnd(res) {
    if (!S) return;
    club.setFever(res.rank === 'S');
    club.cheer(true);
    sound.play('cheer');
    const great = res.rank === 'S', good = res.rank === 'A';
    const lines = S.again
      ? [great ? { who: U(), text: '야하~!! (엄지 척)' } : good ? { who: U(), text: '우라!' } : { who: U(), text: '하아~ (같이 데굴데굴 웃는다)' }]
      : great ? [{ who: H(), text: '{name} 엄청 잘 춘다~!! 손님들이 난리 났어!' }, { who: U(), text: '야하~!! (엄지 척)' }]
        : good ? [{ who: H(), text: '헤헤, 신난다~! 우리 꽤 잘 맞았지?' }, { who: U(), text: '우라!' }]
          : [{ who: C(), text: '…헤헤… 어려웠다…' }, { who: H(), text: '그래도 재밌었다~!' }];
    say([...lines, '(실컷 춤추고 나니 어느새 밤이 깊었다…)', '(우사기를 따라 다른 굴로 나왔다)'], exitClub);
  }
  function exitClub() {
    hud.curtain(true);
    setTimeout(() => {
      if (!S) return;
      rhythm.stop();
      sound.duck(false);
      ctx.setMode('play');
      ctx.setCinematic(false);
      const r = river();
      ctx.player.setPosition(r.front.x, r.front.z + 0.4);
      ctx.player.face(r.front.x, r.front.z + 3);
      cam.snap(ctx.player.position);
      if (!S.again) PALS.forEach((k, i) => { const n = npcs.byKind(k); if (n) { npcs.comeOut(n, r.front.x + (i ? 1.2 : -1.2), r.front.z + 0.9); npcs.act(n, 'look', { face: ctx.player.position, time: 60 }); } });
      const u = usagi(), door = ctx.homeDoor('usagi');
      if (u) {
        npcs.comeOut(u, r.front.x, r.front.z);
        npcs.plan(u, [{ do: 'act', anim: 'hop', time: 0.7, say: '야하!', quick: true }, { do: 'walk', x: door.x, z: door.z + 0.3, run: true }, { do: 'call', fn: () => { ctx.putToBed('usagi'); unstage('usagi'); } }]);
      }
      hud.curtain(false);
      S.kind = 'outro';
      S.t = 0;
      setTimeout(() => { if (S && S.kind === 'outro' && !S.ended) { S.ended = true; S.done && S.done(); } }, 1300);
    }, 800);
  }
  /** 다 끝났다(또는 그만뒀다): 친구들을 일과로 돌려보낸다(밤이면 하품하고 집으로). */
  function cleanup() {
    PALS.forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) { npcs.setFollow(k, false); npcs.plan(n, []); unstage(k); } });
    const u = usagi();
    if (u && staged.has('usagi') && !(u.plan && u.plan.length)) { ctx.putToBed('usagi'); unstage('usagi'); }
    if (rhythm.active) rhythm.stop();
    sound.duck(false);
    if (!guide.open) input.setEnabled(true); // 테스트 앱처럼 퀘스트 없이 본 장면도 다시 움직이게
    S = null;
  }

  return {
    /** 연출 중(내 캐릭터 · 친구들을 붙잡고 있다)인지. 목격은 지나가는 장면이라 아니다. */
    get active() { return !!S && S.kind !== 'sight'; },
    get inClub() { return !!S && S.kind === 'club'; },
    /** 연출 중인 퀘스트 · 지금 할 일(화면 왼쪽 위 쪽지). */
    get questId() { return S ? S.id : null; },
    get goal() { return S ? { meet: '우사기를 몰래 따라가기', follow: '우사기를 몰래 따라가기 · 돌아보면 멈추기!', burrow: '큰 나무 구멍으로 따라 들어가기', club: '우사기 클럽에서 춤추기' }[S.kind] || null : null; },
    /** 지금 단계(디버그 · 테스트용). */
    get phase() { return S ? S.kind : null; },
    /** 0.3초마다(한가할 때): 목격 장면을 열 때인지. */
    trySight() { if (canSight(ctx.getState())) sight(); },
    /** 타이틀로 나갈 때: 하던 연출을 모두 접는다(붙잡은 친구 · 클럽 음악 · 박자 화면). */
    reset() { if (rhythm.active) rhythm.stop(); sound.duck(false); staged.clear(); S = null; },
    /** 오늘 밤 광장에 와서 시작해도 되는지(놓친 날 밤에는 다시 시작하지 않는다). */
    canPlay(day) { return !S && day !== lostDay; },
    /** 장면 시작: again 이면 우사기랑 클럽만(clubNight). done: 다 보고 나면(퀘스트 마무리 대사 · 보상). */
    play({ id, again = false, done }) {
      // 마무리 대사가 끝날 때까지 친구들을 붙잡아 두었다가 놓아 준다(update 의 outro)
      const finish = () => { if (S) S.doneCalled = true; if (done) done(); };
      if (!again) { meet(id, finish); return; }
      S = { kind: 'again', id, done: finish, again: true, t: 0 };
      input.setEnabled(false);
      const u = stage('usagi');
      if (u && !u.away) npcs.act(u, 'hop', { face: ctx.player.position, time: 2, say: '우라!' });
      setTimeout(() => S && enterClub(), 900);
    },
    /** 마을에서 매 프레임. */
    update(dt) {
      if (!S) return;
      S.t += dt;
      if (S.kind === 'sight' && S.t > 60) sightEnd(); // 우사기가 길을 못 찾아도 끝낸다(숲 깊숙이 나무까지 뛰어가는 시간보다 넉넉히)
      else if (S.kind === 'follow' || S.kind === 'burrow') updateFollow(dt);
      else if (S.kind === 'outro' && S.doneCalled && !guide.open) cleanup();
    },
    /** 클럽 모드에서 매 프레임: 장면 · 박자 소리 · 박자 판정(소리 · 조명은 박자 화면의 시계에 맞춘다). */
    tickClub(dt) {
      if (!S || S.clubT == null) return;
      S.clubT += dt;
      const tt = rhythm.active ? rhythm.time : S.clubT;
      club.update(dt, tt);
      if (club.phase === 'tunnel') {
        const b = Math.floor(S.clubT / SPB);
        if (b !== S.beat) { S.beat = b; sound.play('thump', Math.min(1, S.clubT / 4.6)); }
        if (club.tunnelDone && !S.revealed) {
          S.revealed = true;
          hud.curtain(true);
          setTimeout(() => { if (!S) return; club.reveal(); hud.curtain(false); sound.play('cheer'); afterReveal(); }, 380);
        }
        return;
      }
      const e = Math.floor(tt / (SPB / 2));
      if (e !== S.eighth) { S.eighth = e; sound.play(e % 2 ? 'hat' : 'kick'); }
      if (rhythm.active) { const h = rhythm.hype; rhythm.update(); club.setHype(rhythm.active ? rhythm.hype : h); } // 곡이 끝나도 마지막 흥은 남긴다
    },
    /** 행동 안내(나무 구멍 앞에 서면 '따라 들어가기'). */
    target(p) {
      if (!S || S.kind !== 'burrow') return null;
      const f = forest(), m = f.mark;
      return dist(p, f.front) < 1.7 ? { type: 'story', label: '따라 들어가기', x: m.x, z: m.z, r: 0.75, y: m.y } : null;
    },
    /** 행동 버튼: 연출 중이면 받는다(나무 구멍 앞이면 들어가기, 클럽에서는 박자). */
    press() {
      if (!S || S.kind === 'sight') return false;
      if (S.kind === 'club') { if (rhythm.active) rhythm.press(); return true; }
      if (S.kind === 'burrow' && dist(ctx.player.position, forest().front) < 1.7) enterClub();
      return true;
    }
  };
}
