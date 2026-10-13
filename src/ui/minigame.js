/**
 * 섬 편 놀이 화면: 연타(mash) · 타이밍(timing). 박자 화면(ui/rhythm.js)처럼 자기 버튼과 스페이스 · 엔터로 누른다
 * (시네마틱 화면에서는 평소 행동 버튼 · 게이지가 숨겨지므로 따로 그린다). 실패해서 끝나는 일은 없다.
 * mash({ label, button, gain, decay, onTick(p), onDone() }): 누를 때마다 gain 만큼 차고, 가만히 있으면 초당 decay 만큼 준다. 다 차면 끝.
 * timing({ label, button, need, zone: [from, to], speed, grow, wobble, onTick(p), onHit(n), onMiss(), onDone(misses) }):
 *   바늘이 왔다 갔다 하는 동안 초록 칸에서 누른다. need 번 맞히면 끝. 빗나가면 칸이 grow 만큼 넓어진다.
 *   wobble(0 ~ 1, 없으면 0): 바늘이 취한 듯 빨라졌다 느려졌다 한다(위스키 봉봉의 취권 펀치).
 * update(dt) · stop() · active
 */
const WORDS = { good: '좋아!', miss: '빗나감…' };

export function createMinigame(ui) {
  const root = document.createElement('div');
  root.className = 'minigame';
  root.hidden = true;
  root.innerHTML = '<div class="mg-lab"></div><div class="mg-track"><span class="mg-zone"></span><span class="mg-fill"></span><span class="mg-needle"></span></div>'
    + '<div class="mg-pips"></div><div class="mg-judge" aria-live="polite"></div><button type="button" class="mg-btn"></button><div class="mg-hint"><kbd>Space</kbd> 또는 버튼</div>';
  ui.appendChild(root);
  const q = (s) => root.querySelector(s);
  const lab = q('.mg-lab'), zone = q('.mg-zone'), fill = q('.mg-fill'), needle = q('.mg-needle'), pips = q('.mg-pips'), judge = q('.mg-judge'), btn = q('.mg-btn');
  let run = null; // mash: { kind, p, gain, decay, cb } · timing: { kind, p, ph, speed, zone, grow, need, hits, misses, cb }

  function show(label, button, kind) {
    lab.textContent = label;
    btn.textContent = button;
    root.className = 'minigame ' + kind;
    root.hidden = false;
    judge.textContent = '';
  }
  function flash(word) {
    judge.textContent = WORDS[word];
    judge.className = 'mg-judge ' + word;
    void judge.offsetWidth;
    judge.classList.add('pop');
  }
  function draw() {
    if (!run) return;
    if (run.kind === 'mash') { fill.style.width = run.p * 100 + '%'; zone.style.left = '96%'; zone.style.width = '4%'; needle.style.left = run.p * 100 + '%'; return; }
    zone.style.left = run.zone[0] * 100 + '%';
    zone.style.width = (run.zone[1] - run.zone[0]) * 100 + '%';
    fill.style.width = '0';
    needle.style.left = run.p * 100 + '%';
    pips.replaceChildren(...Array.from({ length: run.need }, (_, i) => { const e = document.createElement('i'); if (i < run.hits) e.className = 'on'; return e; }));
  }
  function end(arg) {
    const cb = run.cb;
    run = null;
    root.classList.add('done');
    setTimeout(() => { if (!run) root.hidden = true; root.classList.remove('done'); }, 450);
    cb.onDone?.(arg);
  }
  const api = {
    get active() { return !!run; },
    mash({ label, button = '연타!', gain = 0.08, decay = 0.12, ...cb }) {
      run = { kind: 'mash', p: 0.05, gain, decay, cb };
      show(label, button, 'mash');
      pips.replaceChildren();
      draw();
    },
    timing({ label, button = '지금!', need = 3, zone: z = [0.42, 0.58], speed = 0.9, grow = 0.04, wobble = 0, ...cb }) {
      run = { kind: 'timing', p: 0, ph: 0, speed, zone: [...z], grow, need, hits: 0, misses: 0, cb, lock: 0, wobble, wt: 0 };
      show(label, button, 'timing');
      draw();
    },
    press() {
      if (!run) return;
      if (run.kind === 'mash') {
        run.p = Math.min(1, run.p + run.gain);
        btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
        draw();
        if (run.p >= 1) end();
        return;
      }
      if (run.lock > 0) return; // 맞힌 직후 잠깐은 무시(두 번 눌림 방지)
      if (run.p >= run.zone[0] && run.p <= run.zone[1]) {
        run.hits++;
        run.lock = 0.35;
        flash('good');
        run.cb.onHit?.(run.hits);
        draw();
        if (run.hits >= run.need) end(run.misses);
      } else {
        run.misses++;
        const c = (run.zone[0] + run.zone[1]) / 2, half = Math.min(0.3, (run.zone[1] - run.zone[0]) / 2 + run.grow / 2);
        run.zone = [Math.max(0, c - half), Math.min(1, c + half)];
        flash('miss');
        run.cb.onMiss?.();
        draw();
      }
    },
    update(dt) {
      if (!run) return;
      if (run.kind === 'mash') run.p = Math.max(0.02, run.p - run.decay * dt);
      else {
        run.lock = Math.max(0, run.lock - dt);
        run.wt += dt;
        run.ph += dt * run.speed * Math.PI * (1 + run.wobble * Math.sin(run.wt * 2.7)); // wobble: 취한 듯 빨라졌다 느려졌다
        run.p = (1 - Math.cos(run.ph)) / 2;
      }
      run.cb.onTick?.(run.p);
      draw();
    },
    stop() { run = null; root.hidden = true; }
  };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); api.press(); });
  window.addEventListener('keydown', (e) => {
    if (!run || e.repeat || !(e.code === 'Space' || e.code === 'Enter' || e.key === ' ')) return;
    e.preventDefault();
    api.press();
  });
  return api;
}
