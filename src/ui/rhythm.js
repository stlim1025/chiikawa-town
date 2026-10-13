import { press as pressNote, sweep, result, chartBeats } from '../core/rhythm.js';

/**
 * 박자 맞추기 화면(우사기 클럽의 춤): 도토리 음표가 오른쪽에서 동그라미로 다가오고, 닿는 순간 누르면(스페이스 · 행동 버튼 · 화면 아무 데나 탭) 퍼펙트.
 * 실패해서 끝나는 일은 없다. 시계는 화면이 직접 잰다(performance.now) — 박자 소리도 이 시계(time)에 맞춰 친다.
 * start({ bpm, chart, onHit(q, combo), onMiss(), onEnd(result), label?, hint?, go?, icon? }) · press() · update() · stop()
 * label · hint · go · icon: 다른 장면에서 쓸 때 흥 막대 이름 · 아래 안내 · 마지막 카운트 · 음표 그림(없으면 클럽 그대로).
 */
const APPROACH = 1.7; // 음표가 줄 끝에서 동그라미까지 오는 시간(초)
const ACORN = '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="25" rx="11" ry="12" fill="#c98a4b" stroke="#5a3a22" stroke-width="2.4"/><path d="M8 18c0-6 5.4-9 12-9s12 3 12 9c-3.4 1.6-7.6 2.4-12 2.4S11.4 19.6 8 18z" fill="#7a5131" stroke="#5a3a22" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 9V5" stroke="#5a3a22" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="15.5" cy="25" rx="2.4" ry="3.6" fill="#fff" opacity="0.45"/></svg>';
const WORDS = { perfect: '퍼펙트!', good: '좋아!', miss: '놓침…' };
const COUNT = ['3', '2', '1', '우라!'];
const CLUB_TEXT = { label: '손님들 흥', hint: '도토리가 동그라미에 닿을 때 <kbd>Space</kbd> 또는 탭!', go: '우라!', icon: ACORN };

export function createRhythm(ui) {
  const root = document.createElement('div');
  root.className = 'rhythm';
  root.hidden = true;
  root.innerHTML = '<div class="rh-hype"><b>손님들 흥</b><i><u></u></i></div>'
    + `<div class="rh-lane"><div class="rh-ring">${ACORN}</div><div class="rh-notes"></div></div>`
    + '<div class="rh-judge" aria-live="polite"></div><div class="rh-count"></div><div class="rh-combo"></div>'
    + '<div class="rh-hint">도토리가 동그라미에 닿을 때 <kbd>Space</kbd> 또는 탭!</div>';
  ui.appendChild(root);
  const lane = root.querySelector('.rh-lane'), notesEl = root.querySelector('.rh-notes'), ring = root.querySelector('.rh-ring');
  const judgeEl = root.querySelector('.rh-judge'), countEl = root.querySelector('.rh-count'), comboEl = root.querySelector('.rh-combo');
  const hypeBar = root.querySelector('.rh-hype u'), hypeLab = root.querySelector('.rh-hype b'), hintEl = root.querySelector('.rh-hint');
  let look = CLUB_TEXT;

  let run = null; // { t0, spb, notes: [{ at, hit, el }], end, cb, combo, hype }
  const now = () => performance.now() / 1000;

  function flash(q) {
    judgeEl.textContent = WORDS[q];
    judgeEl.className = 'rh-judge ' + q;
    void judgeEl.offsetWidth; // 같은 판정이 이어져도 다시 톡 튀게
    judgeEl.classList.add('pop');
    if (q !== 'miss') { ring.classList.remove('hit'); void ring.offsetWidth; ring.classList.add('hit'); }
  }
  function setHype(v) { run.hype = Math.max(0, Math.min(1, v)); hypeBar.style.width = Math.round(run.hype * 100) + '%'; }
  function finish() {
    const r = run, res = result(r.notes);
    run = null;
    root.classList.add('done');
    setTimeout(() => { root.hidden = true; root.classList.remove('done'); }, 600);
    r.cb.onEnd?.(res);
  }

  const api = {
    get active() { return !!run; },
    /** 시작부터 지난 시간(초) — 박자 소리 맞추기용(없으면 null). */
    get time() { return run ? now() - run.t0 : null; },
    get spb() { return run ? run.spb : 0; },
    get hype() { return run ? run.hype : 0; },
    start({ bpm, chart, label, hint, go, icon, ...cb }) {
      const spb = 60 / bpm;
      look = { label: label || CLUB_TEXT.label, hint: hint || CLUB_TEXT.hint, go: go || CLUB_TEXT.go, icon: icon || ACORN };
      hypeLab.textContent = look.label;
      hintEl.innerHTML = look.hint;
      ring.innerHTML = look.icon;
      notesEl.replaceChildren();
      const notes = chart.map((b) => {
        const el = document.createElement('i');
        el.className = 'rh-note';
        el.innerHTML = look.icon;
        notesEl.appendChild(el);
        return { at: b * spb, hit: null, el };
      });
      run = { t0: now(), spb, notes, end: chartBeats(chart) * spb, cb, combo: 0, hype: 0.3 };
      setHype(0.3);
      comboEl.textContent = '';
      judgeEl.textContent = '';
      root.hidden = false;
    },
    /** 눌렀다: 가까운 음표를 친다. → 판정 | null(근처에 음표가 없다) */
    press() {
      if (!run) return null;
      const r = pressNote(run.notes, now() - run.t0);
      if (!r) return null;
      run.notes[r.i].el.classList.add('hit', r.q);
      run.combo = r.q === 'miss' ? 0 : run.combo + 1;
      comboEl.textContent = run.combo >= 4 ? `${run.combo} 콤보` : '';
      setHype(run.hype + (r.q === 'perfect' ? 0.045 : r.q === 'good' ? 0.025 : -0.05));
      flash(r.q);
      run.cb.onHit?.(r.q, run.combo);
      return r.q;
    },
    update() {
      if (!run) return;
      const t = now() - run.t0, W = lane.clientWidth, ringX = 34;
      // 카운트: 처음 4박
      const beat = Math.floor(t / run.spb);
      countEl.textContent = beat >= 0 && beat < 3 ? COUNT[beat] : beat === 3 ? look.go : '';
      countEl.classList.toggle('go', beat === 3);
      for (const i of sweep(run.notes, t)) {
        run.notes[i].el.classList.add('hit', 'miss');
        run.combo = 0;
        comboEl.textContent = '';
        setHype(run.hype - 0.04);
        flash('miss');
        run.cb.onMiss?.();
      }
      for (const n of run.notes) {
        if (n.hit) continue;
        const x = ringX + ((n.at - t) / APPROACH) * (W - ringX - 20);
        n.el.style.transform = `translateX(${Math.round(x)}px)`;
        n.el.style.opacity = x > W - 10 ? '0' : '1';
      }
      if (t > run.end) finish();
    },
    stop() { run = null; root.hidden = true; }
  };
  // 박자 동안은 화면 어디를 눌러도 친다(전에는 줄만 눌렸다). 단추(행동 버튼 · 창)는 제 일을 하게 둔다 — 행동 버튼은 스스로 박자를 친다(두 번 치지 않게)
  window.addEventListener('pointerdown', (e) => {
    if (!run || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target && e.target.closest && e.target.closest('button, a, input, .panel, .guide')) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation(); // 화면(조이스틱 · 휘두르기)까지는 가지 않게
    api.press();
  }, true);
  window.addEventListener('keydown', (e) => {
    if (!run || e.repeat || !(e.code === 'Space' || e.code === 'Enter' || e.key === ' ')) return;
    e.preventDefault();
    api.press();
  });
  return api;
}
