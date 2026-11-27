import { hourOf, DAY_SECONDS } from '../core/clock.js';
import { NOVICE } from '../core/license.js';
import { FRIENDS } from '../core/friends.js';
import { FURNITURE } from '../core/home.js';
import { VILLAGE_R } from '../core/layout.js';
import { dateLabel } from '../core/calendar.js';
import { useStamina } from '../core/state.js';
import { isStickFest } from '../core/stickday.js';
import { ICO } from '../ui/panels.js';
import { CONTESTS, CLOSE_HOUR, OPEN_HOUR, NPC_LAST_START, NPC_PLAY_HOURS, CONTEST_FRIENDS, ROUND_SECONDS, ENTRY_STAMINA, contestKindOn, contestPhase, contestOf, beginContestDay, settleContest, rankBoard, bannerText,
  newRound, roundCatch, roundPull, recordRound, better, canEnter, npcRecord, npcJoinHour, claimContestPrize, guestScoreOk, guestPrize, fillNpcRecords, settleStale, guestRoundOver } from '../core/contest.js';

/**
 * 마을 대회 진행(main.js 에서 떼어 냄 — 규칙은 core/contest.js, 탁자 · 단상은 world/contestprops.js, 시상식 장면은 stories/contest.js):
 * 대회 날 광장 장식 · 알림, 노동 갑옷 씨 접수, 내 한 판(3분 타이머), 친구 참가, 같이 놀기 손님 기록 · 상품, 오후 5시 정리 · 시상식, 마을폰 순위판.
 *
 * ctx: main.js 의 살림을 읽고 쓰는 창구. 바뀌는 값은 getter(state · mode · sleeping · fainting · downed · questScene · visiting · fishing · pulling · swapOn · player
 *      · festival · props · ceremony), 그대로인 것은 값(multi · hud · sound · weeds · npcs · panels · guide), 나머지는 함수
 *      (commit, happen, funBusy, myName, won, sayAs, endTalk, cancelPull, cancelFish, setDoing, restHere, npcFishSpot, fishMiss, npcMissFish, npcLandFish, tireNpc, isFree).
 */
export function createContestDay(ctx) {
  const { multi, hud, sound, weeds, npcs, panels, guide } = ctx;
  let round = null; // 마을 대회 한 판 { kind, s, t, clean, left, guest }(core/contest.js)
  const guests = new Map(); // 주인: 오늘 대회에 참가한 같이 놀기 손님 이름 → { id: 가장 최근 연결 id, name, s, t }
  const ui = { eveDay: 0, morningDay: 0 }; // 전날 저녁 알림 · 당일 아침 배너를 띄운 날
  const prizeGot = new Set(); // 손님: 받은 주인 마을 대회 상품(주인 · 날 · 종목 — 두 번 오면 한 번만)
  const npcPlaying = new Map(); // 대회에 나간 친구 kind → { day, until: 끝날 시각 }(중간에 끊겨도 이 시각이 지나면 기록을 올린다)
  let timerKey = '';

  /** 주인: 손님의 마을 대회 한 판(multi act 'contest'): 오늘 종목이고 3분 한 판에서 나올 수 있는 점수일 때만, 그 손님 가장 좋은 기록을 순위판에. */
  function guestEntry(id, a) {
    const state = ctx.state;
    const kind = state.tutorial === 'done' ? contestKindOn(state.startDate, state.clock.day) : null;
    if (!kind || a.k !== kind || !guestScoreOk(kind, a.s, a.b)) return;
    // 주인이 오늘 아직 바깥에 안 나왔으면 그날 기록부터 연다(지난 대회 등수 때문에 거절되거나 나중에 지워지지 않게)
    if (contestOf(state).day !== state.clock.day || contestOf(state).kind !== kind) { guests.clear(); ctx.commit(beginContestDay(state, state.clock.day, kind)); }
    const rec = contestOf(ctx.state);
    if (rec.rank != null || rec.got) return;
    // 손님은 이름으로 묶는다(다시 접속해 연결 id 가 바뀌어도 한 줄). 상품은 가장 최근 연결로
    const name = (multi.nameOf(id) || '친구').slice(0, 12), r = { id, name, s: a.s, t: a.b }, old = guests.get(name);
    guests.set(name, !old || better(r, old) ? r : { ...old, id });
  }
  /** 마을 대회 손님 기록(순위판 · 등수에 넣는다). */
  const guestList = () => [...guests.values()].map((g) => ({ who: 'mp:' + g.id, name: g.name, s: g.s, t: g.t }));
  /** 마을 대회가 끝났다: 등수를 정하고 1등을 마을 소식으로. */
  function settleDay() {
    const before = contestOf(ctx.state);
    ctx.commit(settleContest(fillNpcRecords(ctx.state, ctx.state.license ? ctx.state.license.grade : NOVICE), guestList())); // 내가 자는 사이 지나간 친구 참가도 채운다
    const c = contestOf(ctx.state);
    const entries = [...(before.best ? [{ who: 'me', ...before.best }] : []), ...Object.entries(c.npc).map(([who, r]) => ({ who, ...r }))];
    const board = rankBoard([...entries, ...guestList()]), top = board[0];
    if (top && top.s > 0 && !top.who.startsWith('mp:')) ctx.happen({ type: 'contestWin', who: top.who, item: CONTESTS[c.kind].banner });
    // 같이 놀기 손님: 아직 내 마을에 있으면 등수를 보낸다(상품은 손님 저장에 — 돌아간 손님은 기록만 남는다)
    for (const e of board) if (e.who.startsWith('mp:') && multi.players.some((p) => 'mp:' + p.id === e.who)) multi.direct(e.who.slice(3), { t: 'prize', k: c.kind, rank: e.rank, d: c.day });
    return c;
  }
  /**
   * 마을 대회 날(core/contest.js, 0.3초마다): 광장 현수막(막대 과자 데이가 먼저) · 게시판 옆 접수 탁자 · 풀 뽑기 날 풀 늘리기,
   * 전날 저녁 6시 알림, 당일 아침 배너, 오후 5시가 지나면 정리(시상식 장면은 startCeremony).
   */
  function updateDay() {
    const bt = bannerText(ctx.state);
    ctx.festival.setOn(!!bt, bt || undefined);
    const day = ctx.state.clock.day, hour = hourOf(ctx.state.clock), ready = ctx.state.tutorial === 'done';
    const kind = ready ? contestKindOn(ctx.state.startDate, day) : null;
    ctx.props.setDesk(!!kind && hour >= 6);
    weeds.setBoost(kind === 'weed');
    if (!ready) return;
    // 정리 못 한 채 날이 넘어간 지난 대회(5시 전에 집에 들어가 잤다 등): 등수를 정해 두고 상품은 노동 갑옷 씨에게
    const stale = settleStale(ctx.state, day, ctx.state.license ? ctx.state.license.grade : NOVICE);
    if (stale !== ctx.state) ctx.commit(stale);
    const tomorrow = contestKindOn(ctx.state.startDate, day + 1);
    if (tomorrow && hour >= 18 && ui.eveDay !== day && ctx.mode === 'play' && !ctx.sleeping) {
      ui.eveDay = day;
      hud.toast(`내일은 ${CONTESTS[tomorrow].banner}!`, 3200);
    }
    if (!kind) return;
    const rec = contestOf(ctx.state);
    if (rec.day !== day || rec.kind !== kind) { guests.clear(); ctx.commit(beginContestDay(ctx.state, day, kind)); }
    if (ui.morningDay !== day && hour >= 6 && hour < CLOSE_HOUR && ctx.mode === 'play' && !ctx.sleeping && !ctx.fainting && !ctx.questScene) {
      ui.morningDay = day;
      if (isStickFest(ctx.state)) hud.toast(`오늘은 ${CONTESTS[kind].banner}도 열려요! 오전 9시부터 노동 갑옷 씨에게`, 4200); // 막대 과자 데이 배너와 겹치지 않게
      else hud.banner(CONTESTS[kind].name, '오전 9시부터 노동 갑옷 씨에게 접수해요', 3600);
    }
    // 대회에 나갔다가 이야기 장면 등으로 끊긴 친구: 끝날 시각이 지나면(또는 마감이면) 기록을 대신 올려 준다
    for (const [k, g] of npcPlaying) if (g.day === day && !contestOf(ctx.state).npc[k] && (hour >= g.until + 0.5 || hour >= CLOSE_HOUR)) postNpcRecord(k);
    const phase = contestPhase(hour, !!(round && !round.guest));
    const now = contestOf(ctx.state);
    if ((phase === 'ceremony' || phase === 'closed') && now.rank == null && !now.got) {
      // 한 판이라도 했으면 광장 시상식(마을 안에서 다른 일이 없을 때 — 막히면 9시까지 기다린다), 아니면 조용히 정리
      if (phase === 'ceremony' && now.best) { if (canCeremony()) startCeremony(); return; }
      const c = settleDay();
      if (c.best) hud.toast(`${CONTESTS[kind].name} 결과는 노동 갑옷 씨에게 들어요`, 3200);
    }
  }
  /** 주인: 손님에게 보낼 마을 대회 순위판 { k, d, o: 접수 중, b: [[이름, 점수, 가르는 값, 'me' | 'npc' | 'guest' | 'yet', 등수]] }(오늘 대회가 없으면 null). */
  function wire() {
    const state = ctx.state;
    const kind = state.tutorial === 'done' ? contestKindOn(state.startDate, state.clock.day) : null;
    if (!kind) return null;
    const b = board();
    const rows = b.today ? b.rows.slice(0, 12).map((r) => [String(r.name || '').slice(0, 12), r.yet ? 0 : r.s, r.yet ? 0 : r.t, r.yet ? 'yet' : r.me ? 'me' : r.guest ? 'guest' : 'npc', r.yet ? 0 : r.rank, r.guest ? String(r.who).slice(3) : '']) : []; // 마지막: 손님 연결 id(손님이 제 줄을 알아본다)
    return { k: kind, d: ctx.state.clock.day, o: contestPhase(hourOf(ctx.state.clock), false) === 'open' ? 1 : 0, b: rows };
  }
  /** 손님: 주인 마을 대회 등수를 받았다 → 상품은 내 저장에(core/contest.js 의 guestPrize). */
  function takePrize(a) {
    if (!Object.hasOwn(CONTESTS, a.k) || !Number.isInteger(a.rank) || a.rank < 1) return;
    const key = `${multi.room}|${a.d}|${a.k}`; // 같은 주인 마을 같은 대회 날은 한 번만
    if (prizeGot.has(key)) return;
    prizeGot.add(key);
    const r = guestPrize(ctx.state, a.k, a.rank);
    if (!r.money) return;
    ctx.commit(r.state);
    const chips = [{ icon: 'coin', text: `+${ctx.won(r.money)}` }];
    if (r.trophy) chips.push({ text: FURNITURE[r.trophy].name });
    hud.questDone({ title: a.rank <= 3 ? `${CONTESTS[a.k].name} ${a.rank}등!` : `${CONTESTS[a.k].name} 참가상`, sub: `${multi.hostName || '친구'}네 마을 대회`, chips, ms: 4800 });
    sound.play('coin');
  }
  /** 마을폰 대회 앱 · 순위판: 오늘 대회면 순위(나 · 친구 · 손님, 아직 안 한 친구는 끝에), 아니면 다음 대회 날. */
  function board() {
    const state = ctx.state, visiting = ctx.visiting;
    const rec = contestOf(state);
    if (visiting) {
      const v = visiting.contest;
      if (!v) return { kind: null, today: false, next: null, wins: rec.wins };
      return { kind: v.k, today: true, phase: v.o ? 'open' : 'ceremony', host: multi.hostName || '친구', wins: rec.wins,
        rows: v.b.map(([name, s, t, type, rank, gid]) => ({ name, s, t, rank, me: type === 'guest' && !!gid && gid === multi.you, yet: type === 'yet' })) };
    }
    const today = kindHere();
    if (today && rec.day === state.clock.day) {
      const entries = [...(rec.best ? [{ who: 'me', name: ctx.myName(), me: true, ...rec.best }] : []), ...Object.entries(rec.npc).map(([k, r]) => ({ who: k, name: FRIENDS[k].name, ...r })), ...guestList().map((g) => ({ ...g, guest: true }))];
      const yet = CONTEST_FRIENDS.filter((k) => !rec.npc[k]).map((k) => ({ who: k, name: FRIENDS[k].name, yet: true }));
      return { kind: today, today: true, phase: contestPhase(hourOf(state.clock), !!round), rows: [...rankBoard(entries), ...yet], wins: rec.wins };
    }
    let d = state.clock.day + 1;
    while (!contestKindOn(state.startDate, d) && d < state.clock.day + 8) d++;
    return { kind: null, today: false, next: { kind: contestKindOn(state.startDate, d), date: dateLabel(state.startDate, d) }, wins: rec.wins };
  }
  /** 시상식 장면을 열 수 있는지: 내 마을 바깥(play) 마을 안에서 잠 · 기절 · 이야기 · 창 · 대화가 없을 때. */
  const canCeremony = () => ctx.mode === 'play' && !ctx.visiting && !ctx.sleeping && !ctx.fainting && !ctx.downed && !ctx.questScene && !ctx.funBusy() && !panels.isOpen() && !guide.open
    && Math.hypot(ctx.player.position.x, ctx.player.position.z) < VILLAGE_R;
  /** 오후 5시 광장 시상식: 등수를 정하고 장면을 연 뒤 상품을 받는다. */
  function startCeremony() {
    ctx.cancelPull();
    if (ctx.fishing) ctx.cancelFish();
    const before = contestOf(ctx.state);
    const c = settleDay();
    const named = (e) => ({ ...e, name: e.who === 'me' ? ctx.myName() : FRIENDS[e.who] ? FRIENDS[e.who].name : e.name || '친구' });
    const top = rankBoard([{ who: 'me', ...before.best }, ...Object.entries(c.npc).map(([who, r]) => ({ who, ...r })), ...guestList()])
      .filter((e) => e.rank <= 3).slice(0, 3).map(named);
    ctx.ceremony.play({ kind: c.kind, top, me: { rank: c.rank, s: before.best.s }, guests: CONTEST_FRIENDS.filter((k) => npcs.byKind(k)) }, () => claim());
  }
  /** 대회 상품 받기(시상식 뒤 바로, 놓쳤으면 노동 갑옷 씨에게). */
  function claim() {
    const c = contestOf(ctx.state), r = claimContestPrize(ctx.state);
    if (!r.ok) return false;
    ctx.commit(r.state);
    const chips = [{ icon: 'coin', text: `+${ctx.won(r.money)}` }];
    if (r.trophy) chips.push({ text: FURNITURE[r.trophy].name });
    hud.questDone({ title: c.rank <= 3 ? `${CONTESTS[c.kind].name} ${c.rank}등!` : `${CONTESTS[c.kind].name} 참가상`, sub: r.trophy ? '트로피는 집 상자에 넣었어요' : '', chips, ms: 4800 });
    sound.play('coin');
    return true;
  }
  /** 지금 있는 마을의 오늘 대회 종목(내 마을: 튜토리얼 뒤 그날 종목, 친구 마을: 주인이 보낸 것). */
  function kindHere() {
    const visiting = ctx.visiting, state = ctx.state;
    if (visiting) return visiting.contest && visiting.contest.o ? visiting.contest.k : null;
    return state.tutorial === 'done' ? contestKindOn(state.startDate, state.clock.day) : null;
  }
  const contestHour = () => hourOf(ctx.visiting && ctx.visiting.clock ? ctx.visiting.clock : ctx.state.clock);
  const CONTEST_NO = {
    day: '오늘은 대회가 없다.', hour: '접수는 오전 9시부터 오후 5시까지다.', late: '오늘 접수는 끝났다.',
    swap: '…몸이 바뀐 동안에는 나갈 수 없다.', stamina: `기운이 모자라 보인다. 기운 ${ENTRY_STAMINA}은 있어야 한다.`
  };
  /** 노동 갑옷 씨: 대회 나가기 · 그만하기. */
  function join(n) {
    const kind = kindHere();
    const can = canEnter(ctx.state, { hour: contestHour(), kind, swapped: ctx.swapOn, guest: !!ctx.visiting });
    if (!can.ok) { ctx.sayAs(n, [CONTEST_NO[can.reason] || CONTEST_NO.day], ctx.endTalk); return; }
    ctx.sayAs(n, [`${CONTESTS[kind].name} 접수 완료! 3분이다. 시작!`], () => { ctx.endTalk(); startRound(kind, !!ctx.visiting); });
  }
  /** 대회 한 판 시작: 기운 10, 내 마을이면 판 동안 시계가 멈춘다(core/contest.js). */
  function startRound(kind, guest) {
    ctx.commit(useStamina(ctx.state, ENTRY_STAMINA).state);
    round = { ...newRound(kind), left: ROUND_SECONDS, guest };
    timerKey = '';
    hud.banner(`${CONTESTS[kind].name} 시작!`, kind === 'fish' ? '3분 동안 많이 낚아요' : '3분 동안 많이 뽑아요', 2200);
    sound.play('job');
  }
  /** 한 판이 끝났다(시간 · 그만하기 · 쓰러짐 · 잠 · 장면 · 다른 곳으로): 내 마을이면 그날 기록에, 손님이면 주인에게. */
  function finishRound(why) {
    const r = round;
    if (!r) return;
    round = null;
    hud.setTimer(null);
    if (ctx.fishing) ctx.cancelFish(); // 끝난 뒤에 낚인 물고기가 가방으로 가지 않게
    if (ctx.pulling) ctx.cancelPull();
    const unit = r.kind === 'fish' ? '마리' : '점';
    if (r.guest) { // b: 같을 때 가르는 값(t 는 메시지 종류)
      if (multi.status === 'visiting') { multi.act({ t: 'contest', k: r.kind, s: r.s, b: r.t }); hud.banner(`${r.s}${unit}!`, `${multi.hostName || '친구'}네 순위판에 올렸어요`, 3000); }
      else hud.toast('친구 마을과 연결이 끊겨 기록을 보내지 못했어요', 3200);
      return;
    }
    const prev = contestOf(ctx.state).best;
    ctx.commit(recordRound(ctx.state, r));
    hud.banner(`${r.s}${unit}!`, better(r, prev) ? '오늘 가장 좋은 기록' : `오늘 가장 좋은 기록 ${prev.s}${unit}`, 3000);
    if (why !== 'time' && why !== 'quit') hud.toast('대회 판이 끝났어요', 2200);
  }
  /** 매 프레임: 남은 시간을 줄이고 화면 위에 남은 시간 · 점수 · 그날 가장 좋은 기록. 판을 이어 갈 수 없으면 끝낸다. */
  function tick(dt) {
    if (!round) return;
    if (ctx.mode !== 'play' || ctx.sleeping || ctx.fainting || ctx.downed || ctx.questScene || round.guest !== !!ctx.visiting) { finishRound('stop'); return; }
    if (round.guest && ctx.visiting.clock && guestRoundOver(hourOf(ctx.visiting.clock))) { finishRound('close'); return; } // 주인 시각 5시 조금 전(정리 전에 점수가 닿게)
    round.left -= dt;
    if (round.left <= 0) { finishRound('time'); return; }
    const sec = Math.ceil(round.left), unit = round.kind === 'fish' ? '마리' : '점';
    const best = round.guest ? null : contestOf(ctx.state).best;
    const key = `${sec}|${round.s}|${best ? best.s : ''}`;
    if (key === timerKey) return;
    timerKey = key;
    hud.setTimer([CONTESTS[round.kind].name, { icon: ICO.clock, text: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` },
      { text: `${round.s}${unit}` }, best ? { text: `가장 좋은 기록 ${best.s}${unit}`, narrow: 'hide' } : null].filter(Boolean));
  }

  /** 마을 대회에 나간 친구가 끝나고 하는 한마디(게임 오리지널). */
  const CONTEST_DONE = { chiikawa: '…해, 했다…!', hachiware: '헤헤, 열심히 했어~!', usagi: '야하!', kurimanju: '하아~ 끝났다~', rakko: '…이 정도군.', momonga: '내가 제일 잘했지? 흥!' };
  /** 친구 대회 기록을 순위판에 올린다(솜씨표에서 날짜로 정해지는 값 — core/contest.js 의 npcRecord). */
  function postNpcRecord(kind) {
    const state = ctx.state;
    const rec = contestOf(state);
    if (!rec.kind || rec.day !== state.clock.day || rec.npc[kind]) return;
    const r = npcRecord(state.startDate, rec.day, rec.kind, kind, state.license ? state.license.grade : NOVICE);
    ctx.commit({ ...state, contest: { ...rec, npc: { ...rec.npc, [kind]: r } } }, false);
    const n = npcs.byKind(kind), player = ctx.player;
    if (n && !n.away && Math.hypot(n.x - player.position.x, n.z - player.position.z) < 16) npcs.say(n, CONTEST_DONE[kind] || '다 했다!');
  }
  /** 친구가 대회에 나간다: 낚시면 연못가에서 게임 안 1시간(실제 30초) 낚시, 풀이면 잡초를 뽑으러 다닌다. 끝나면 기록을 올린다. */
  function npcStart(n, kind) {
    npcPlaying.set(n.kind, { day: ctx.state.clock.day, until: hourOf(ctx.state.clock) + NPC_PLAY_HOURS });
    ctx.setDoing(n.kind, kind === 'fish' ? 'fish' : 'leaf', '대회 중');
    const done = { do: 'call', fn: () => { postNpcRecord(n.kind); ctx.restHere(n.kind, 6 + Math.random() * 8); } };
    if (kind === 'fish') {
      const spot = ctx.npcFishSpot('pond') || ctx.npcFishSpot('river');
      if (!spot) { postNpcRecord(n.kind); return; }
      const secs = (NPC_PLAY_HOURS / 24) * DAY_SECONDS, beats = [];
      for (let at = 4; at < secs - 1; at += 4 + Math.random() * 3) beats.push({ at, fn: () => (Math.random() < ctx.fishMiss(n.kind) ? ctx.npcMissFish(n) : ctx.npcLandFish(n, spot.water, false)) });
      npcs.plan(n, [{ do: 'walk', x: spot.x, z: spot.z, near: 0.4 }, { do: 'act', anim: 'fish', face: spot.face, time: secs, beats, quick: true }, done]);
    } else npcs.plan(n, [{ do: 'weeds', kind: 'weed', left: 5 + Math.floor(Math.random() * 3), onPull: () => ctx.tireNpc(n.kind, 1) }, done]);
  }
  /** 친구가 지금 대회에 나갈 차례인지(그날 참가 시각이 지났고 아직 안 했고 한가하다). */
  function npcDue(n, hour) {
    const kind = kindHere();
    if (!kind || ctx.visiting || !CONTEST_FRIENDS.includes(n.kind) || hour < OPEN_HOUR || hour >= NPC_LAST_START) return null;
    const state = ctx.state;
    const rec = contestOf(state), started = npcPlaying.get(n.kind);
    if (rec.day !== state.clock.day || rec.npc[n.kind] || (started && started.day === state.clock.day)) return null;
    return hour >= npcJoinHour(state.startDate, state.clock.day, n.kind) && ctx.isFree(n) ? kind : null;
  }

  return {
    /** 지금 하고 있는 한 판(없으면 null). */
    round: () => round,
    /** 대회 낚시 판에서 한 마리(깡통이면 junk) — 바뀐 판을 돌려준다. */
    catchFish: (c) => (round = roundCatch(round, c)),
    /** 대회 풀 뽑기 판에서 한 포기(core/weeding.js 의 결과) — 바뀐 판을 돌려준다. */
    pullWeed: (result) => (round = roundPull(round, result)),
    guestEntry, wire, takePrize, board, updateDay, kindHere, join, claim, finishRound, tick, npcDue, npcStart
  };
}
