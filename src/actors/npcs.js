import { buildNpc, animateChibi, PROP_FOR } from './models.js';
import { VILLAGE_R, groundY } from '../core/layout.js';

/** 말 걸면 하는 대사. */
const TALK = {
  chiikawa: ['…♪', '풀 뽑기 가야지…', '배고파…', '오늘은 뭐 먹지…', '히잉'],
  hachiware: ['오늘도 힘내자~', '뭐든 할 수 있어!', '같이 풀 뽑을래?', '와~ 날씨 좋다!'],
  usagi: ['우라!', '야하!', '하아?', '이야~하!'],
  momonga: ['뭘 봐?', '흥!', '귀찮게 하지 마!', '…뭐, 귀엽긴 하지?'],
  kurimanju: ['하아~', '맥주 한 잔…', '안주 만들까…'],
  rakko: ['수련이다', '단련을 게을리하지 마', '훗'],
  shisa: ['라멘 먹으러 오세요~', '사부님~!', '오늘도 열심히!'],
  kani: ['헌책 있어요…', '책 읽을까…', '딱딱!'],
  pochette: ['어머, 귀여워라~', '포셰트 신상이야~', '다들 잘 지내니?'],
  labor: ['빠른 사람이 임자!', '일감은 게시판에서 받아요', '의태형인가…?'],
  ramen: ['어서 오세요~', '로우 라멘 맛있어요', '면 삶을 시간이다'],
  captain: ['흠흠', '승급 시험은 여기서 본다', '깔끔하게 뽑아라', '규칙은 규칙이다']
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * 친구마다 쉬는 동안 하는 몸짓(anim, models.js 의 animateChibi 모드)을 time 초 동안 하며 가끔 혼잣말(lines).
 * chance 는 쉬다가 이 몸짓을 할 확률(없으면 0.7, 나머지는 산책). 몸짓에 맞는 소품은 models.js 의 PROP_FOR.
 * 일(풀 뽑기 · 열매 따기 · 스티커)은 게시판에서 일감을 받았을 때만 plan 으로 한다(main 의 마을 살림).
 */
const WORK = {
  chiikawa: { type: 'act', anim: 'talk', time: 3, lines: ['…♪', '쉬는 중…', '배고파…'] },
  hachiware: { type: 'act', anim: 'dance', time: 3, lines: ['노래 연습 중~ ♪', '휴~ 잠깐 쉬자'] },
  usagi: { type: 'act', anim: 'train', time: 3, lines: ['우라!', '(뒹굴뒹굴)'] },
  momonga: { type: 'act', anim: 'dance', time: 3.5, lines: ['나 귀엽지? 대답 안 해?', '흥, 다들 나만 봐!'] },
  kurimanju: { type: 'act', anim: 'drink', time: 7, chance: 0.95, lines: ['캬~ 맥주 최고…', '하아~ 한 잔 더…', '맥주는 역시 거품이지…', '안주 만들어 볼까…'] }, // 거의 늘 맥주
  rakko: { type: 'act', anim: 'train', time: 4, lines: ['하앗!', '수련이다'] },
  shisa: { type: 'act', anim: 'sweep', time: 4.5, lines: ['쓱싹쓱싹~', '가게 앞은 깨끗하게!'] },
  kani: { type: 'act', anim: 'read', time: 6, lines: ['(책 읽는 중…)', '재밌다…'] },
  pochette: { type: 'act', anim: 'talk', time: 3, lines: ['신상 들어왔어요~', '구경하고 가요~'] },
  labor: { type: 'act', anim: 'talk', time: 3, lines: ['일감 있어요~!', '빠른 사람이 임자!'] },
  ramen: { type: 'act', anim: 'sweep', time: 4, lines: ['면 삶는 중~', '오늘 라멘도 맛있어요'] },
  captain: { type: 'act', anim: 'talk', time: 3, lines: ['승급 시험은 여기서!', '흠흠, 규칙은 규칙이다'] }
};
const WEED_PULL_SECONDS = 2.4;
const STEER = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]; // 가려는 쪽이 막히면 이만큼(라디안) 옆으로 틀어 본다
const MIN_WEEDS_FOR_FRIENDS = 8; // 내 몫을 남기려고 풀이 이보다 적으면 친구들은 뽑지 않는다

/** 마을 친구 12명. 자리가 정해진 친구는 그 주변에서만 움직인다. 각자 할 일(WORK)을 하다가 돌아다닌다. */
export function createNpcs(scene, village, weeds, berries) {
  const s = village.spots;
  const kuri = (village.homes && village.homes.kurimanju) || s.plaza;
  const POSTS = [
    ['chiikawa', -2.2, 2.6, false], ['hachiware', 2.4, 2.2, false], ['usagi', 0.8, 4.6, false],
    ['momonga', -3.6, 4.2, false], ['kurimanju', kuri.x + 0.8, kuri.z + 0.6, false], ['rakko', s.dojo.x - 1.2, s.dojo.z + 0.4, false],
    // 대장 갑옷 씨는 검정소 시험관, 카니는 헌책방 앞
    ['captain', s.exam.x - 0.9, s.exam.z + 0.5, true], ['kani', s.books.x + 1.0, s.books.z + 0.3, true],
    ['shisa', s.ramen.x + 1.3, s.ramen.z + 0.6, true], ['ramen', s.ramen.x - 1.0, s.ramen.z + 0.4, true],
    ['pochette', s.pochette.x + 0.6, s.pochette.z + 0.4, true], ['labor', s.board.x + 0.9, s.board.z + 0.3, true]
  ];

  const nearFree = (x, z) => {
    if (village.isFree(x, z, 0.4)) return { x, z };
    for (let r = 0.4; r < 4; r += 0.4) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r;
      if (village.isFree(nx, nz, 0.4)) return { x: nx, z: nz };
    }
    return { x, z };
  };

  const list = POSTS.map(([kind, x, z, fixed]) => {
    const p = nearFree(x, z);
    const chibi = buildNpc(kind);
    scene.add(chibi.root);
    return {
      kind, chibi, fixed, home: { ...p }, x: p.x, z: p.z, yaw: Math.random() * 6, phase: Math.random() * 6,
      state: 'idle', timer: 0.5 + Math.random() * 2, tx: p.x, tz: p.z, talk: 0, bubble: null,
      speed: chibi.height > 1.8 ? 0.8 : fixed ? 0.95 : 1.15 // 마을 친구들은 할 일이 많아 조금 더 빨리 걷는다
    };
  });

  /** 두 친구가 겹치지 않으려면 떨어져야 하는 거리. */
  const spacing = (a, b) => a.chibi.radius + b.chibi.radius;
  /** (x, z) 로 가면 다른 친구에게 더 다가가 겹치는지. 이미 겹쳐 있어도 멀어지는 쪽으로는 갈 수 있다. */
  const crowded = (n, x, z) => list.some((m) => {
    if (m === n) return false;
    const d = Math.hypot(m.x - x, m.z - z);
    return d < spacing(n, m) && d < Math.hypot(m.x - n.x, m.z - n.z);
  });
  /** 겹친 친구들을 서로 반대쪽으로 천천히 밀어낸다. */
  function separate(dt) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = spacing(a, b);
        if (d >= min || a.away || b.away) continue;
        const ux = d > 0.001 ? dx / d : 1, uz = d > 0.001 ? dz / d : 0, push = Math.min((min - d) / 2, dt * 2);
        if (village.isFree(a.x - ux * push, a.z - uz * push, 0.3)) { a.x -= ux * push; a.z -= uz * push; }
        if (village.isFree(b.x + ux * push, b.z + uz * push, 0.3)) { b.x += ux * push; b.z += uz * push; }
      }
    }
  }

  let lastPlayer = { x: 0, z: 0 };
  /** (x, z) 로 가면 내 캐릭터에게 밀려날 만큼 더 다가가는지(그쪽으로 걸으면 밀려서 제자리걸음이 된다). */
  const intoPlayer = (n, x, z) => {
    const d = Math.hypot(lastPlayer.x - x, lastPlayer.z - z);
    return d < n.chibi.radius + 0.35 && d < Math.hypot(lastPlayer.x - n.x, lastPlayer.z - n.z);
  };
  /** 말풍선이 떠 있는 시간: 긴 말은 조금 더 오래(읽을 수 있게). */
  const lineTime = (text) => Math.max(2.4, Math.min(4.2, 1.3 + String(text).length * 0.09));
  const say = (n, text) => { n.bubble = { text, t: lineTime(text) }; };

  /**
   * 게시판 · 작업대 · 라멘 가게처럼 여럿이 쓰는 곳의 자리 고르기: 다른 친구(와 나)가 서 있거나 가는 중인 자리는 피하고,
   * 빈자리 중 가까운 곳부터. 다 찼으면 그중 덜 붐비는 곳. 한 자리만 있으면 먼저 온 친구가 쓰는 동안 다른 친구가 서성였다.
   */
  function pickSlot(n, slots) {
    const others = [[lastPlayer.x, lastPlayer.z]];
    for (const m of list) {
      if (m === n || m.away) continue;
      others.push([m.x, m.z]);
      if (m.state === 'walk') others.push([m.tx, m.tz]);
      const st = m.plan && m.plan[0];
      if (st && st.do === 'walk' && st.x != null) others.push([st.x, st.z]);
    }
    const crowd = (p) => others.reduce((a, [x, z]) => a + (Math.hypot(x - p.x, z - p.z) < 0.75 ? 1 : 0), 0);
    return slots.map((s) => nearFree(s.x, s.z)).map((p) => ({ p, c: crowd(p), d: Math.hypot(p.x - n.x, p.z - n.z) }))
      .sort((a, b) => a.c - b.c || a.d - b.d)[0].p;
  }

  /** 그 풀을 지금 어느 친구가 맡아 뽑으러 가거나 뽑는 중인지. */
  const claimed = (w) => list.some((m) => m.task && m.task.weed === w);

  /** 지금 목적지(tx, tz)까지 집 · 나무 · 울타리를 돌아가는 길을 찾아 둔다(못 찾으면 null: 곧장 간다). */
  function route(n) {
    n.pathTo = n.tx + ',' + n.tz;
    n.pathT = 0;
    n.path = village.findPath({ x: n.x, z: n.z }, { x: n.tx, z: n.tz });
  }
  /** 찾아 둔 길과 막힘 기록을 지운다(새 목적지를 정하거나 걷기를 그만둘 때). */
  function clearRoute(n) {
    n.path = null;
    n.pathTo = null;
    n.stuck = 0;
    n.stuckT = 0;
    n.sx = null;
  }
  /** 막혔을 때 지금 향한 쪽의 왼쪽이나 오른쪽(무작위)으로 비켜설 빈자리를 길 맨 앞에 끼운다. */
  function sidestep(n) {
    const first = Math.random() < 0.5 ? 1 : -1;
    for (const r of [0.9, 0.6]) for (const side of [first, -first]) {
      const a = n.yaw + side * Math.PI / 2, x = n.x + Math.sin(a) * r, z = n.z + Math.cos(a) * r;
      if (village.isFree(x, z, 0.4) && !crowded(n, x, z)) { n.path = [{ x, z }, ...(n.path || [])]; return; }
    }
  }
  /** 목적지에 닿았다: 풀이면 뽑기 시작, 아니면 잠깐 쉰다(일정이 남았으면 꺾이는 곳마다 쉬지 않고 곧바로 다음 단계로). */
  function arrive(n) {
    clearRoute(n);
    if (n.task && n.task.type === 'weed') { n.state = 'work'; n.workT = 0; }
    else { n.state = 'idle'; n.timer = n.plan && n.plan.length ? 0.2 : 1.5 + Math.random() * 3; }
  }
  /**
   * 0.7초마다 그사이 얼마나 움직였는지 본다. 거의 그대로면 막힌 것이라 길을 다시 찾고 옆으로 비켜 본다(도망 중엔 빼고).
   * 세 번 잇달아 막히면 목적지 가까이면 다 온 셈 치고, 아니면 그만둔다(일이면 onFail 을 알리고 끝낸다).
   */
  function checkStuck(n, dt) {
    n.stuckT = (n.stuckT || 0) + dt;
    if (n.stuckT < 0.7) return;
    n.stuckT = 0;
    const went = n.sx == null ? Infinity : Math.hypot(n.x - n.sx, n.z - n.sz);
    n.sx = n.x;
    n.sz = n.z;
    if (went >= 0.2) { n.stuck = 0; return; }
    n.stuck = (n.stuck || 0) + 1;
    if (n.stuck >= 3) {
      const near = n.task && n.task.type === 'weed' ? 0.6 : 1.2;
      if (Math.hypot(n.tx - n.x, n.tz - n.z) < near) arrive(n); // 거의 다 왔으면 여기서 한다
      else if (n.task) { n.task.onFail?.(); endTask(n); } // 길이 막혀 못 가면 그 일은 그만둔다
      else { clearRoute(n); n.state = 'idle'; n.timer = 0.8; }
    } else if (!n.flee) { route(n); sidestep(n); }
  }

  /** 지금 몸짓에 맞는 소품만 보인다(바뀔 때만 손댄다). 등에 멘 칼('sheathed')은 칼을 뽑아 들 때만 숨는다. */
  function showProp(n, want) {
    if (n.prop === want) return;
    n.prop = want;
    for (const tag in n.chibi.props) {
      const on = tag === 'sheathed' ? want !== 'sword' : tag === want;
      n.chibi.props[tag].forEach((m) => { m.visible = on; });
    }
  }

  /** 할 일을 끝내고(또는 그만두고) 잠깐 쉰다(토벌 중 휘두르기처럼 quick 이면 쉬지 않고 바로 다음). */
  function endTask(n) {
    const quick = n.task && n.task.quick;
    n.task = null;
    n.state = 'idle';
    n.timer = quick ? 0.05 : 1.5 + Math.random() * 3;
    clearRoute(n);
  }

  /**
   * 같이 토벌(party): 내 둘레에 몬스터가 있으면 달려가 때린다. 싸울 게 없거나 내가 너무 멀면 false(그러면 따라온다).
   * 한 번 휘두르면 every 초 동안은 그 자리에서 노려본다.
   */
  function partyFight(n, pd0) {
    const P = n.party;
    if (pd0 > 12) return false;
    let m = P.target;
    if (!m || m.dead || m.dormant || m.under || Math.hypot(m.x - lastPlayer.x, m.z - lastPlayer.z) > P.range + 3) m = P.target = P.find();
    if (!m) return false;
    const d = Math.hypot(m.x - n.x, m.z - n.z), reach = m.M.size + 0.75;
    if (d > reach) {
      n.state = 'walk';
      n.tx = m.x + ((n.x - m.x) / d) * (reach - 0.25);
      n.tz = m.z + ((n.z - m.z) / d) * (reach - 0.25);
      return true;
    }
    n.yaw = Math.atan2(m.x - n.x, m.z - n.z);
    if (P.cool > 0) { if (n.state === 'walk') clearRoute(n); n.state = 'idle'; n.timer = 99; return true; }
    P.cool = P.every;
    clearRoute(n);
    n.task = { type: 'act', anim: 'train', time: 0.7, quick: true };
    n.state = 'work';
    n.workT = 0;
    if (P.hit(m)) { P.target = null; P.onKill(m); }
    return true;
  }

  /** 할 일을 시작한다. 시작했으면 true. */
  function startWork(n) {
    const job = WORK[n.kind];
    if (!job) return false;
    if (job.type === 'weed') {
      // 내가 뽑고 있는 풀(busy)과 다른 친구가 맡은 풀은 빼고
      const free = weeds.list.filter((w) => w.kind === 'weed' && !w.busy && !w.stage && weeds.usable(w) && !claimed(w));
      if (free.length < MIN_WEEDS_FOR_FRIENDS) return false;
      let best = null, bd = 9;
      for (const w of free) {
        const d = Math.hypot(w.x - n.x, w.z - n.z);
        if (d < bd && Math.hypot(w.x - lastPlayer.x, w.z - lastPlayer.z) > 2.5) { bd = d; best = w; }
      }
      if (!best) return false;
      const k = bd > 0.01 ? 0.55 / bd : 0;
      n.task = { type: 'weed', weed: best };
      clearRoute(n);
      n.tx = best.x + (n.x - best.x) * k;
      n.tz = best.z + (n.z - best.z) * k;
      n.state = 'walk';
      return true;
    }
    n.task = { type: 'act', anim: job.anim, time: job.time * (0.8 + Math.random() * 0.4) };
    n.state = 'work';
    n.workT = 0;
    if (Math.random() < 0.55) say(n, pick(job.lines));
    return true;
  }

  /**
   * 일정(plan) 한 단계를 진행한다. 단계: walk { x, z } 또는 { slots: [{ x, z }…], near } (갈 때 빈자리를 고른다)
   * · weeds { kind, left, onPull } · berries { left, onPick } · act { anim, time, say, face: { x, z } } · say { text }
   * · wait { time } · call { fn } · hunt { find(x, z, skip), hit(m), left, onKill(m) } (마을 밖 몬스터 토벌). 다 하면 다음 단계로.
   * · walk 에 run: true 면 뛰어간다. act 에 quick: true 면 끝나자마자 다음 단계(대화처럼 박자를 맞출 때).
   * · sync { group: { need, here: Set } } 같은 group 의 친구가 다 모일 때까지 기다린다(오래 안 오면 모두 그만둔다).
   * · approach { near, max } 내 캐릭터에게 다가간다(움직여도 따라간다).
   */
  function runPlan(n) {
    const step = n.plan[0];
    const next = (timer = 0.2) => { n.plan.shift(); n.timer = timer; };
    if (step.do !== 'walk') n.dash = false;
    if (step.do === 'walk') {
      n.dash = !!step.run;
      if (step.slots && step.x == null) { const p = pickSlot(n, step.slots); step.x = p.x; step.z = p.z; }
      const d = Math.hypot(step.x - n.x, step.z - n.z);
      if (d < (step.near ?? 0.9)) { next(); return; }
      step.tries = (step.tries || 0) + 1;
      if (step.tries > 5) { const p = nearFree(step.x, step.z); n.x = p.x; n.z = p.z; next(); return; } // 길이 막히면 슬쩍 건너간다
      clearRoute(n);
      n.tx = step.x; n.tz = step.z; n.state = 'walk';
    } else if (step.do === 'weeds') {
      if (step.left <= 0) { next(); return; }
      let best = null, bd = 99;
      for (const w of weeds.list) {
        if (w.kind !== step.kind || w.busy || w.stage || !weeds.usable(w) || claimed(w) || step.skip?.has(w) || Math.hypot(w.x - lastPlayer.x, w.z - lastPlayer.z) < 2.5) continue; // skip: 길이 막혀 못 간 풀
        const d = Math.hypot(w.x - n.x, w.z - n.z);
        if (d < bd) { bd = d; best = w; }
      }
      if (!best) { step.waits = (step.waits || 0) + 1; n.timer = 2; if (step.waits > 40) next(); return; } // 풀이 다시 자랄 때까지
      const k = bd > 0.01 ? 0.55 / bd : 0;
      n.task = {
        type: 'weed', weed: best, onDone: () => { step.left--; step.onPull?.(); },
        onFail: () => (step.skip = step.skip || new Set()).add(best) // 다음엔 다른 풀을 고른다
      };
      clearRoute(n);
      n.tx = best.x + (n.x - best.x) * k;
      n.tz = best.z + (n.z - best.z) * k;
      n.state = 'walk';
    } else if (step.do === 'berries') {
      if (step.left <= 0 || !berries) { next(); return; }
      const b = step.bush;
      if (b && Math.hypot(b.x - n.x, b.z - n.z) < 1.5) {
        if (b.ready) { berries.pick(b); step.left--; step.onPick?.(); n.emote = { anim: 'pull', t: 0.9 }; }
        step.bush = null; step.tries = 0; n.timer = 1.2;
        return;
      }
      const target = b && b.ready ? b : berries.nearestReady(n.x, n.z, 60);
      if (!target) { step.waits = (step.waits || 0) + 1; n.timer = 3; if (step.waits > 30) next(); return; }
      step.bush = target;
      step.tries = (step.tries || 0) + 1;
      const d = Math.hypot(target.x - n.x, target.z - n.z), k = d > 0.01 ? 1.0 / d : 0;
      const p = nearFree(target.x + (n.x - target.x) * k, target.z + (n.z - target.z) * k);
      if (step.tries > 8) { n.x = p.x; n.z = p.z; n.timer = 0.2; return; }
      clearRoute(n);
      n.tx = p.x; n.tz = p.z; n.state = 'walk';
    } else if (step.do === 'hunt') {
      // 토벌: 가장 가까운 그 몬스터에게 걸어가서(마을 밖까지) 닿으면 휘두른다. 못 찾거나 못 가면 기다리다 그만둔다
      if (step.left <= 0 || (step.giveUp && step.giveUp())) { next(); return; } // 다 잡았거나 너무 오래 헤맸다
      step.skip = step.skip || new Set();
      let m = step.target;
      if (!m || m.dead) m = step.target = step.find(n.x, n.z, step.skip);
      if (!m) { step.waits = (step.waits || 0) + 1; n.timer = 2; if (step.waits > 30) next(); return; }
      const d = Math.hypot(m.x - n.x, m.z - n.z), reach = m.M.size + 0.8;
      if (d > reach) {
        step.tries = (step.tries || 0) + 1;
        if (step.tries > 14) { step.skip.add(m); step.target = null; step.tries = 0; n.timer = 0.3; return; } // 그 녀석에게는 못 간다
        clearRoute(n);
        n.tx = m.x + ((n.x - m.x) / d) * (reach - 0.3);
        n.tz = m.z + ((n.z - m.z) / d) * (reach - 0.3);
        n.dash = d > 5; // 마을 밖 먼 길은 뛰어간다
        n.state = 'walk';
        return;
      }
      step.tries = 0;
      n.yaw = Math.atan2(m.x - n.x, m.z - n.z);
      n.task = { type: 'act', anim: 'train', time: 0.75, quick: true };
      n.state = 'work';
      n.workT = 0;
      if (step.hit(m)) { step.left--; step.target = null; step.onKill?.(m); }
    } else if (step.do === 'sync') {
      const g = step.group;
      if (step.face) n.yaw = Math.atan2(step.face.x - n.x, step.face.z - n.z);
      if (g.cancel) { n.plan = null; n.timer = 1; return; }
      g.here.add(n);
      if (g.here.size >= g.need) { next(0.05); return; }
      step.waited = (step.waited || 0) + 0.3;
      n.timer = 0.3;
      if (step.waited > (step.max || 16)) { g.cancel = true; n.plan = null; n.timer = 1; } // 짝이 안 온다: 모두 그만
    } else if (step.do === 'approach') {
      const d = Math.hypot(lastPlayer.x - n.x, lastPlayer.z - n.z);
      if (d < (step.near || 1.6)) { n.yaw = Math.atan2(lastPlayer.x - n.x, lastPlayer.z - n.z); next(0.05); return; }
      step.tries = (step.tries || 0) + 1;
      if (step.tries > (step.max || 14) || d > 30) { n.plan = null; n.timer = 1; return; } // 못 따라잡았다
      clearRoute(n);
      const k = (d - (step.near || 1.6) * 0.7) / d;
      n.tx = n.x + (lastPlayer.x - n.x) * k;
      n.tz = n.z + (lastPlayer.z - n.z) * k;
      n.dash = !!step.run;
      n.state = 'walk';
    } else if (step.do === 'act') {
      if (step.face) n.yaw = Math.atan2(step.face.x - n.x, step.face.z - n.z);
      n.task = { type: 'act', anim: step.anim, time: step.time, quick: !!step.quick };
      n.state = 'work';
      n.workT = 0;
      if (step.say) say(n, step.say);
      n.plan.shift();
    } else if (step.do === 'say') { say(n, step.text); next(1); }
    else if (step.do === 'wait') next(step.time);
    else if (step.do === 'call') { next(); step.fn(n); }
    else next();
  }

  function pickTarget(n) {
    // 술래잡기 · 소매치기로 마을 밖까지 갔으면 먼저 마을 안으로 돌아온다(길찾기가 문을 지나 데려온다)
    const far = Math.hypot(n.x, n.z);
    if (!n.fixed && far > VILLAGE_R - 2) {
      const k = (VILLAGE_R - 6) / far, p = nearFree(n.x * k, n.z * k);
      n.tx = p.x; n.tz = p.z; clearRoute(n);
      return true;
    }
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = n.fixed ? Math.random() * 2.5 : 1.5 + Math.random() * 5;
      const bx = n.fixed ? n.home.x : n.x, bz = n.fixed ? n.home.z : n.z;
      const x = bx + Math.sin(a) * r, z = bz + Math.cos(a) * r;
      const taken = list.some((m) => m !== n && Math.hypot(m.x - x, m.z - z) < spacing(n, m) + 0.3);
      if (village.isFree(x, z, 0.45) && Math.hypot(x, z) < VILLAGE_R - 2 && !taken) { n.tx = x; n.tz = z; clearRoute(n); return true; }
    }
    return false;
  }

  return {
    list,
    /** (x, z) 에서 maxDist 안의 가장 가까운 친구. */
    nearest(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const n of list) { if (n.away) continue; const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } }
      return best;
    },
    /** 말을 건다. 대사를 돌려준다. */
    talk(n, line) {
      const text = line || pick(TALK[n.kind]);
      if (n.task) endTask(n); // 말을 걸면 하던 일을 멈추고 돌아본다
      clearRoute(n);
      n.talk = 2.8;
      n.bubble = { text, t: 2.8 };
      n.state = 'idle';
      n.timer = 2.8;
      return text;
    },
    /** 종류로 친구를 찾는다. */
    byKind(kind) { return list.find((n) => n.kind === kind); },
    /** 일정을 맡긴다(마을 살림: 일감 · 밥). 다른 일정이 있으면 덮어쓴다. */
    plan(n, steps) { if (n.task) endTask(n); n.plan = steps; n.timer = 0.2; n.dash = false; },
    /** 일정이 있거나 따라다니기 · 앞장서기 · 도망 · 대화 중이라 다른 걸 시킬 수 없는지. */
    busy(n) { return !!((n.plan && n.plan.length) || n.follow || n.lead || n.flee || n.talk > 0 || n.emote); },
    /** 말풍선 한 줄. */
    say(n, text) { say(n, text); },
    /** 그 말이 말풍선에 떠 있는 시간(대화 박자 맞추기). */
    lineTime,
    /** 말 걸었을 때의 첫마디(말풍선 없이 대사만). */
    greeting(kind) { return pick(TALK[kind] || ['…']); },
    /** 대화 상자가 열려 있는 동안 하던 일을 멈추고 나를 바라보며 서 있게 한다(on=false 면 다시 자유롭게). */
    hold(n, on) {
      clearRoute(n);
      if (on) { if (n.task) endTask(n); n.talk = Infinity; n.bubble = null; n.state = 'idle'; }
      else { n.talk = 0; n.state = 'idle'; n.timer = 2; }
    },
    /** 집(동굴)에 들어간다: 보이지 않고, 말을 걸 수 없고, 아무것도 하지 않는다(3단계 낮잠 · 밤잠). */
    goIn(n) { if (n.task) endTask(n); clearRoute(n); n.plan = null; n.bubble = null; n.emote = null; n.away = true; n.state = 'idle'; n.chibi.root.visible = false; },
    /** 집에서 나온다(문 앞 (x, z)). */
    comeOut(n, x, z) { const p = nearFree(x, z); n.x = p.x; n.z = p.z; n.away = false; n.state = 'idle'; n.timer = 1.5; n.talk = 0; n.chibi.root.visible = true; },
    /** 몸짓을 sec 초 동안(같이 춤추기 'dance', 이겼다 'cheer'). */
    emote(n, anim, sec) { n.emote = { anim, t: sec }; },
    /** 술래잡기: 내 캐릭터에게서 도망간다. */
    flee(n, on) {
      if (n.task) endTask(n);
      clearRoute(n);
      n.flee = on;
      n.fleeT = 0;
      n.state = 'idle';
      n.timer = 1;
    },
    /** 앞장서서 point 까지 걸어가 기다린다(하치와레의 집 안내). null 이면 그만. */
    lead(kind, point) {
      const n = list.find((m) => m.kind === kind);
      if (!n || (!point && !n.lead)) return; // 앞장서고 있지 않으면 그만둘 것도 없다
      if (n.task) endTask(n);
      clearRoute(n);
      n.lead = point ? nearFree(point.x, point.z) : null;
      if (!point) { n.state = 'idle'; n.timer = 1; }
    },
    /** 어느 친구가 그 풀을 뽑으러 가거나 뽑는 중인지(내가 같은 풀을 뽑지 않게). */
    isWorkingOn: claimed,
    /** 내 캐릭터를 졸졸 따라다니게 한다(하치와레의 첫날 안내). on=false 면 다시 자유롭게 돌아다닌다. */
    setFollow(kind, on) {
      const n = list.find((m) => m.kind === kind);
      if (!n || n.follow === on) return;
      n.follow = on;
      if (n.task) endTask(n);
      clearRoute(n);
      if (!on) { n.state = 'idle'; n.timer = 1; }
    },
    /**
     * 같이 토벌: cfg { find(): 노릴 몬스터 | null, hit(m): 쓰러뜨렸는지, onKill(m), range: 내 둘레 몇 칸까지, every: 휘두르는 간격(초) }
     * 이면 내 캐릭터를 따라다니다 둘레 몬스터를 친다. null 이면 그만두고 다시 자유롭게.
     */
    party(kind, cfg) {
      const n = list.find((m) => m.kind === kind);
      if (!n) return;
      if (n.task) endTask(n);
      clearRoute(n);
      n.plan = null;
      n.party = cfg ? { range: 8, every: 1, ...cfg, cool: 0, target: null } : null;
      n.follow = !!cfg;
      n.state = 'idle';
      n.timer = 1;
    },
    /** 같이 토벌 중인 친구 kind 목록. */
    partyKinds() { return list.filter((n) => n.party).map((n) => n.kind); },
    update(dt, t, player) {
      lastPlayer = player;
      separate(dt);
      for (const n of list) {
        if (n.away) continue; // 집 안에 있다
        if (n.bubble) { n.bubble.t -= dt; if (n.bubble.t <= 0) n.bubble = null; }
        if (n.party) n.party.cool = Math.max(0, n.party.cool - dt);
        let mode = 'idle', power = 0;
        const pd0 = Math.hypot(player.x - n.x, player.z - n.z);
        // 술래잡기: 내 캐릭터 반대쪽으로 달아난다(멀리 떨어지면 숨을 고르며 약 올린다)
        if (n.flee && !n.emote) {
          n.state = 'walk';
          const away = Math.atan2(n.x - player.x, n.z - player.z) + Math.sin(t * 1.7 + n.phase) * 0.6;
          n.tx = n.x + Math.sin(away) * 2;
          n.tz = n.z + Math.cos(away) * 2;
          // 처음엔 나보다 조금 빠르게 달리다가 점점 지친다(15초 안에 잡을 수 있게)
          n.fleeT += dt;
          n.runSpeed = pd0 > 6 ? 1.6 : Math.max(2.0, 3.9 - n.fleeT * 0.15);
        }
        // 앞장서기: 목적지로 걸어가되, 내가 너무 뒤처지면 서서 기다린다
        else if (n.lead && n.talk <= 0 && !n.emote) {
          const dl = Math.hypot(n.lead.x - n.x, n.lead.z - n.z);
          if (dl > 0.3 && pd0 < 6) { n.state = 'walk'; n.tx = n.lead.x; n.tz = n.lead.z; }
          else { n.state = 'idle'; n.timer = 99; n.yaw = Math.atan2(player.x - n.x, player.z - n.z); }
        }
        // 같이 토벌: 휘두르는 중이면 그대로, 아니면 둘레 몬스터에게 달려간다(없으면 아래 따라다니기)
        else if (n.party && n.follow && n.talk <= 0 && !n.emote && (n.state === 'work' || partyFight(n, pd0))) { /* 싸우는 중 */ }
        // 따라다니기: 멀어지면 내 캐릭터 옆(조금 뒤)으로 걸어오고, 가까우면 서서 바라본다. 너무 멀면 옆에 나타난다.
        else if (n.follow && n.talk <= 0 && !n.emote) {
          const d = pd0;
          if (d > 9) { const p = nearFree(player.x + 1.2, player.z + 0.9); n.x = p.x; n.z = p.z; n.state = 'idle'; }
          else if (d > 2.4) { n.state = 'walk'; n.tx = player.x + 1.1; n.tz = player.z + 0.7; }
          else if (d < 1.8 || n.state === 'idle') { n.state = 'idle'; n.timer = 99; n.yaw = Math.atan2(player.x - n.x, player.z - n.z); }
        }
        if (n.emote) {
          // 몸짓(춤 · 만세): 나를 바라보며 제자리에서
          n.emote.t -= dt;
          mode = n.emote.anim;
          n.yaw = Math.atan2(player.x - n.x, player.z - n.z);
          if (n.emote.t <= 0) n.emote = null;
        } else if (n.talk > 0) {
          n.talk -= dt;
          n.yaw = Math.atan2(player.x - n.x, player.z - n.z);
          mode = 'talk';
        } else if (n.state === 'idle') {
          n.timer -= dt;
          // 쉬는 시간이 끝나면 대개 자기 일을 하고, 가끔 산책한다
          if (n.plan && n.plan.length && !n.follow) { if (n.timer <= 0) runPlan(n); } // 맡은 일정부터
          else if (n.timer <= 0 && !n.follow && Math.random() < (WORK[n.kind]?.chance ?? 0.7) && startWork(n)) { /* 몸짓 시작 */ }
          else if (n.timer <= 0 && pickTarget(n)) n.state = 'walk';
          else if (n.timer <= 0) n.timer = 1;
        } else if (n.state === 'work') {
          n.workT += dt;
          const task = n.task;
          if (task.type === 'weed') {
            const w = task.weed;
            if (!weeds.list.includes(w)) endTask(n); // 그새 다른 누가 뽑았다
            else {
              power = Math.min(1, n.workT / (WEED_PULL_SECONDS * 0.9));
              weeds.tug(w, power);
              n.yaw = Math.atan2(w.x - n.x, w.z - n.z);
              mode = 'pull';
              if (n.workT >= WEED_PULL_SECONDS) {
                weeds.remove(w, 'clean');
                if (task.onDone) task.onDone(); // 일감으로 뽑았으면 센다(한마디는 일감 쪽에서 그 친구 말투로)
                else if (Math.random() < 0.5) say(n, pick(WORK[n.kind].lines));
                endTask(n);
              }
            }
          } else {
            mode = task.anim;
            if (n.workT >= task.time) endTask(n);
          }
        } else {
          const d = Math.hypot(n.tx - n.x, n.tz - n.z);
          if (n.task && n.task.weed && !weeds.list.includes(n.task.weed)) endTask(n); // 가는 길에 풀이 사라졌다
          else if (d < 0.15) arrive(n);
          else {
            // 집 · 나무 · 울타리를 돌아가는 길을 따라간다. 목적지가 바뀌면 다시 찾되, 따라오기 · 앞장서기처럼
            // 목적지가 계속 바뀔 때는 0.6초에 한 번만. 도망갈 때는 길 없이 곧장 달아난다.
            if (!n.flee && n.pathTo !== n.tx + ',' + n.tz && (n.pathTo == null || n.pathT > 0.6)) route(n);
            n.pathT = (n.pathT || 0) + dt;
            const path = n.flee ? null : n.path;
            while (path && path.length && Math.hypot(path[0].x - n.x, path[0].z - n.z) < 0.35) path.shift(); // 지나온 꺾이는 점
            const goal = path && path.length ? path[0] : { x: n.tx, z: n.tz };
            const want = Math.atan2(goal.x - n.x, goal.z - n.z);
            // 따라올 때는 내 걸음에 맞춰 빠르게, 앞장설 때는 내가 따라오기 좋게, 도망갈 때는 달린다
            const speed = n.flee ? n.runSpeed : n.lead ? 2.4 : n.follow ? 3.0 : n.dash ? 2.6 : n.speed, step = speed * dt;
            // 늦게 도는 몸 방향이 아니라 가려는 쪽으로 걷고, 막히면 옆으로 틀어 비켜 간다
            let heading = want, moved = false;
            for (const off of STEER) {
              const nx = n.x + Math.sin(want + off) * step, nz = n.z + Math.cos(want + off) * step;
              if (village.isFree(nx, nz, 0.34) && !crowded(n, nx, nz) && !intoPlayer(n, nx, nz) && (!n.flee || Math.hypot(nx, nz) < Math.max(VILLAGE_R + 12, Math.hypot(n.x, n.z)))) { n.x = nx; n.z = nz; heading = want + off; moved = true; break; }
            }
            let diff = heading - n.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = n.flee ? 16 : 7; // 도망갈 때는 휙 돌아선다
            n.yaw += Math.max(-dt * turn, Math.min(dt * turn, diff));
            if (moved) { n.phase += dt * speed * 9; mode = 'walk'; } // 정말 움직였을 때만 걷는 몸짓(막히면 제자리 달리기 없이 서 있는다)
            checkStuck(n, dt);
          }
        }
        // 한가하게 서 있는 친구는 내가 가까이 지나가면 고개를 돌려 바라본다
        if (n.state === 'idle' && !n.task && !n.emote && n.talk <= 0 && !n.flee && pd0 < 2.8 && !(n.plan && n.plan[0] && n.plan[0].do === 'sync')) {
          let dd = Math.atan2(player.x - n.x, player.z - n.z) - n.yaw;
          while (dd > Math.PI) dd -= Math.PI * 2;
          while (dd < -Math.PI) dd += Math.PI * 2;
          n.yaw += Math.max(-dt * 4, Math.min(dt * 4, dd));
        }
        // 내 캐릭터와 겹치지 않게
        const px = n.x - player.x, pz = n.z - player.z, pd = Math.hypot(px, pz), min = n.chibi.radius + 0.35;
        if (pd < min && pd > 0.001) {
          const nx = player.x + (px / pd) * min, nz = player.z + (pz / pd) * min;
          if (village.isFree(nx, nz, 0.3)) { n.x = nx; n.z = nz; }
        }
        n.chibi.root.position.set(n.x, groundY(n.x, n.z), n.z);
        n.chibi.root.rotation.y = n.yaw;
        showProp(n, (PROP_FOR[n.kind] || {})[mode] || null); // 맥주 · 책 · 빗자루처럼 그 몸짓에 드는 물건
        animateChibi(n.chibi, mode, t, { phase: n.phase, power });
      }
    },
    /** 말풍선 라벨. */
    labels() {
      return list.filter((n) => n.bubble && !n.away).map((n) => ({ id: 'npc-' + n.kind, x: n.x, y: n.chibi.height + 0.35, z: n.z, text: n.bubble.text, kind: 'bubble' }));
    }
  };
}
