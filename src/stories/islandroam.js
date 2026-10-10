/**
 * 섬에서 직접 걷기(사이드스토리 '수상한 섬 합숙'): 축제 · 밤의 정글 · 동굴 구출 때 내 캐릭터를 조이스틱 · 키보드로 움직인다.
 * 대본(stories/islandscript.js 의 ROAMS)이 정한다: { area('beach' | 'grotto'), me: [x, z, 바라봄], follow(따라오는 친구), goal(목표 글), cam: [높이, 거리], targets, watch }
 *  target: { id, k(그 사람 자리) | at: [x, z](기준 자리 상대), r(가까이 갈 거리), label(행동 이름), lines(처음) · again(다시),
 *            eat('slurp' | 'nibble' | 'dance' — 그동안 그 몸짓), free(덩굴 끊기 — 다 끊으면 끝), ask: { text, choices, end(끝내는 선택지 번호) },
 *            auto(가까이 가면 저절로 · 한 번), end(대사 뒤 끝) }
 *  watch(동굴 구출): { every: [최소, 최대 초], warn(멈춰야 하는 초), warnText, caught(움직였을 때 대사 · 연출) } — 세이렌이 뒤척일 때 움직이면 들킬 뻔한다(실패는 없다).
 * ctx: { isle, input, hud, guide, sound, run(items, done), who(kind), move(kind, x, z, face, mode, y), face(kind, x, z), unface(kind), pose(kind, mode),
 *        others() → [{ k, x, z }](나 말고 서 있는 사람들), setBody(on) }
 */
const SPEED = 3.2, ME_R = 0.32, PAL_R = 0.38, FOLLOW_GAP = 1.1, EAT_SEC = 2.6;
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const rand = ([a, b]) => a + Math.random() * (b - a);

export function createIslandRoam(ctx) {
  const { isle, input, hud, guide, sound } = ctx;
  let R = null; // { def, o, area, x, z, yaw, moving, busy, used, freed, cam, fol, watch, done, near }

  const rel = (p) => ({ x: R.o.x + p[0], z: R.o.z + p[1] });
  const spotOf = (t) => (t.k ? isle.pos(t.k) : rel(t.at));
  const open = (t) => !(t.free && R.freed.has(t.id)) && !(t.auto && R.used.has(t.id));

  /** 막히면 벽을 따라 미끄러지고, 동그라미(물체 · 친구)에서는 밀려난다. */
  function collide(nx, nz) {
    const A = R.area;
    if (!A.inside(nx, nz)) { if (A.inside(nx, R.z)) nz = R.z; else if (A.inside(R.x, nz)) nx = R.x; else return { x: R.x, z: R.z }; }
    const obs = [...A.obstacles, ...ctx.others().filter((p) => !R.fol || p.k !== R.fol.k).map((p) => ({ x: p.x, z: p.z, r: PAL_R }))];
    for (const o of obs) {
      const d = Math.hypot(nx - o.x, nz - o.z), min = o.r + ME_R;
      if (d < min && d > 1e-4) { nx = o.x + ((nx - o.x) / d) * min; nz = o.z + ((nz - o.z) / d) * min; }
    }
    return A.inside(nx, nz) ? { x: nx, z: nz } : { x: R.x, z: R.z };
  }
  function walk(dt) {
    const v = guide.open || R.busy ? { x: 0, y: 0 } : input.vector();
    const len = Math.min(1, Math.hypot(v.x, v.y));
    R.moving = false;
    if (len > 0.12) {
      const L = Math.hypot(v.x, v.y), dx = v.x / L, dz = -v.y / L, step = SPEED * len * dt;
      const p = collide(R.x + dx * step, R.z + dz * step);
      R.moving = near(p, R) > step * 0.25;
      R.x = p.x; R.z = p.z;
      let d = Math.atan2(dx, dz) - R.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      R.yaw += Math.max(-dt * 10, Math.min(dt * 10, d));
    }
    const mode = R.busy ? R.busy.mode : R.moving ? 'walk' : 'idle';
    ctx.move('me', R.x, R.z, R.yaw, mode, R.area.heightAt(R.x, R.z));
    return len;
  }
  /** 따라오는 친구: 내 뒤 조금 옆으로. 움직일 때만 몸짓을 바꾼다(대사 중 연출 몸짓은 그대로 둔다). */
  function follow(dt) {
    const F = R.fol;
    if (!F || guide.open) return;
    const tx = R.x - Math.sin(R.yaw) * FOLLOW_GAP + Math.cos(R.yaw) * 0.5, tz = R.z - Math.cos(R.yaw) * FOLLOW_GAP - Math.sin(R.yaw) * 0.5;
    const d = Math.hypot(tx - F.x, tz - F.z);
    if (d > 0.35) {
      const step = Math.min(d, SPEED * 1.1 * dt), nx = F.x + ((tx - F.x) / d) * step, nz = F.z + ((tz - F.z) / d) * step;
      if (R.area.inside(nx, nz)) { F.x = nx; F.z = nz; }
      F.yaw = Math.atan2(tx - F.x, tz - F.z);
      F.moving = true;
      ctx.move(F.k, F.x, F.z, F.yaw, 'walk', R.area.heightAt(F.x, F.z));
    } else if (F.moving) {
      F.moving = false;
      ctx.move(F.k, F.x, F.z, Math.atan2(R.x - F.x, R.z - F.z), 'idle', R.area.heightAt(F.x, F.z));
    }
  }
  function camera(dt) {
    const [h, d] = R.def.cam || [6.4, 8.6], c = R.cam, k = Math.min(1, dt * 5);
    c.x += (R.x - c.x) * k; c.z += (R.z - c.z) * k;
    isle.setCamera([c.x, h, c.z + d], [c.x, 0.8, c.z - 0.8], 0);
  }
  function nearest() {
    let best = null, bd = Infinity;
    for (const t of R.def.targets) {
      if (!open(t) || t.auto) continue;
      const p = spotOf(t);
      if (!p) continue;
      const d = near(p, R);
      if (d < (t.r || 1.5) && d < bd) { best = t; bd = d; }
    }
    return best;
  }
  /** 세이렌이 뒤척인다(동굴 구출): 그동안 움직이면 들킬 뻔한다. */
  function watch(dt, len) {
    const W = R.watch;
    if (!W || guide.open) return;
    W.t += dt;
    if (W.phase === 'calm' && W.t > W.next) {
      Object.assign(W, { phase: 'warn', t: 0 });
      isle.siren({ state: 'idle' });
      sound.play('warn');
      hud.toast(R.def.watch.warnText, 1800);
    } else if (W.phase === 'warn') {
      if (len > 0.12) {
        Object.assign(W, { phase: 'calm', t: 0, next: rand([5, 8]) });
        ctx.run(R.def.watch.caught, () => {});
      } else if (W.t > R.def.watch.warn) {
        Object.assign(W, { phase: 'calm', t: 0, next: rand(R.def.watch.every) });
        isle.siren({ state: 'calm' });
      }
    }
  }
  function finish() {
    const done = R.done;
    stop();
    done();
  }
  /** 그 자리에서 할 일: 먹기 · 춤 · 말 걸기 · 덩굴 끊기 · 고르기. */
  function act(t) {
    const first = !R.used.has(t.id);
    R.used.add(t.id);
    const lines = (!first && t.again) || t.lines || [];
    const p = spotOf(t);
    if (p) R.yaw = Math.atan2(p.x - R.x, p.z - R.z);
    if (t.k && !t.free) ctx.face(t.k, R.x, R.z);
    if (t.eat) R.busy = { mode: t.eat, until: EAT_SEC };
    if (t.free) {
      R.busy = { mode: 'swing', until: 0.5 };
      sound.play('swing');
      R.freed.add(t.id);
      isle.bind(t.k, false);
      ctx.pose(t.k, 'hop');
      sound.play('pass');
    }
    const after = () => {
      if (!R) return;
      if (t.k && !t.free) ctx.unface(t.k);
      if (R.busy && R.busy.mode !== 'swing') R.busy = null;
      const all = R.def.targets.filter((x) => x.free);
      if (t.end || (t.free && all.every((x) => R.freed.has(x.id)))) { finish(); return; }
      if (t.ask) guide.ask(t.ask.text, t.ask.choices, (i) => { if (i === t.ask.end) finish(); }, ctx.who(t.k));
    };
    ctx.run(lines, after);
  }
  function stop() {
    if (!R) return;
    R = null;
    ctx.setBody(false);
    hud.setAction(null);
    hud.setTimer(null);
    input.setEnabled(false);
  }

  return {
    get active() { return !!R; },
    /** 걷기 시작: def(대본) · o(장면 기준 자리) · done(끝나면 대본 다음 줄로). */
    start(def, o, done) {
      const [mx, mz, face] = def.me;
      R = { def, o, area: isle.walkArea(def.area), x: o.x + mx, z: o.z + mz, yaw: face || 0, moving: false, busy: null, used: new Set(), freed: new Set(), done };
      R.cam = { x: R.x, z: R.z };
      if (def.follow) { const p = isle.pos(def.follow) || { x: R.x + 0.8, z: R.z + 0.8 }; R.fol = { k: def.follow, x: p.x, z: p.z, yaw: R.yaw, moving: true }; }
      if (def.watch) R.watch = { phase: 'calm', t: 0, next: rand(def.watch.every) };
      ctx.setBody(true);
      input.setEnabled(true);
      hud.setTimer(def.goal || null);
      if (def.tip) hud.toast(def.tip, 4200);
    },
    tick(dt) {
      if (!R) return;
      if (R.busy && R.busy.until > 0) { R.busy.until -= dt; if (R.busy.until <= 0 && (R.busy.mode === 'swing' || !guide.open)) R.busy = null; }
      const len = walk(dt);
      follow(dt);
      camera(dt);
      watch(dt, len);
      if (!guide.open && R) for (const t of R.def.targets) if (t.auto && open(t)) { const p = spotOf(t); if (p && near(p, R) < (t.r || 1.5)) { act(t); break; } }
      if (!R) return;
      R.near = guide.open ? null : nearest();
      hud.setAction(R.near ? R.near.label : null);
    },
    /** 행동 버튼 · 스페이스: 가까운 곳에서 할 일. */
    press() { if (R && !guide.open && !R.busy && R.near) act(R.near); },
    /** 머리 위 안내(가까운 곳의 할 일 · 세이렌이 뒤척일 때 !). */
    labels() {
      if (!R) return [];
      const out = [];
      if (R.near) { const p = spotOf(R.near); if (p) out.push({ id: 'roam-prompt', x: p.x, y: (p.y || 0.6) + 1.2, z: p.z, text: R.near.label, key: input.mode === 'desk' ? 'Space' : null, kind: 'prompt' }); }
      if (R.watch && R.watch.phase === 'warn') { const m = isle.mouthPos(); out.push({ id: 'roam-warn', x: m.x, y: m.y + 2.6, z: m.z, text: '!', kind: 'mark' }); }
      return out;
    },
    /** 지금 상태(디버그 · 헤드리스 시험용): 내 자리 · 가까운 할 일 · 세이렌이 뒤척이는지 · 할 일 목록. */
    info() {
      if (!R) return null;
      const targets = R.def.targets.map((t) => { const p = spotOf(t) || {}; return { id: t.id, x: p.x, z: p.z, r: t.r || 1.5, auto: !!t.auto, done: !open(t) || (R.used.has(t.id) && !t.free && !t.ask) }; });
      return { x: R.x, z: R.z, near: R.near ? R.near.id : null, busy: !!R.busy, warn: !!(R.watch && R.watch.phase === 'warn'), targets };
    },
    stop
  };
}
