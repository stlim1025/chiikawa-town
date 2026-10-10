import { WHISKY_BAND, SODA_BAND, pourOk } from '../core/licenses.js';

/** 시험 창 틀(검정소 시험지). 닫으면 키보드 듣기도 멈춘다. */
function sheet(ui, title) {
  const wrap = document.createElement('div');
  wrap.className = 'backdrop exam-wrap';
  wrap.innerHTML = '<div class="panel exam-sheet" role="dialog"><div class="panel-body"><div class="panel-head"><h2></h2><span class="wallet exam-step"></span></div><div class="exam-body"></div></div></div>';
  wrap.querySelector('h2').textContent = title;
  wrap.querySelector('.panel').setAttribute('aria-label', title);
  ui.appendChild(wrap);
  const keys = [];
  return {
    wrap,
    body: wrap.querySelector('.exam-body'),
    step: wrap.querySelector('.exam-step'),
    /** 창이 열려 있는 동안만 키를 듣는다(이동 · 행동으로 새지 않게 맨 앞 단계에서 멈춘다). fn 이 false 를 돌려주면 그 키는 놓아준다. */
    onKey(type, fn) {
      const h = (e) => { if (fn(e) !== false) { e.preventDefault(); e.stopPropagation(); } };
      window.addEventListener(type, h, true);
      keys.push([type, h]);
    },
    close() { keys.forEach(([t, h]) => window.removeEventListener(t, h, true)); wrap.remove(); }
  };
}
const OK = ['Space', 'Enter', 'NumpadEnter'], UP = ['KeyW', 'ArrowUp'], DOWN = ['KeyS', 'ArrowDown'];

/**
 * 필기시험: 문제를 하나씩 보여 주고 보기를 고른다(W/S · ↑/↓ 로 고르고 스페이스 · 엔터로 정하거나, 눌러서).
 * questions: [{ q, choices, answer }], pass: 합격에 필요한 개수. seconds: 문제마다 제한 시간(없으면 무제한, 넘기면 틀린 것).
 * onDone(맞힌 개수, 합격했는지). hint: 떨어졌을 때 검정관이 다시 보라고 짚어 줄 공부거리(토벌 안내서 · 쿠리만쥬 강의 · 레시피 북).
 * 결과는 동물의 숲처럼: 합격 · 불합격 도장이 쾅, 문제마다 맞힌 것 동그라미, 검정관(대장 갑옷 씨) 말풍선.
 */
export function openQuiz(ui, { title, questions, pass, seconds = 0, onDone, sound, hint = '' }) {
  const s = sheet(ui, title);
  let i = 0, sel = 0, correct = 0, locked = false, ended = false, clock = 0, qStart = 0;
  const results = []; // 문제마다 맞혔는지(결과 동그라미)
  const stopClock = () => { clearInterval(clock); clock = 0; };
  // 남은 시간 막대: 0.1초마다 줄고, 다 되면 시간 초과(틀린 것)
  function startClock() {
    if (!seconds) return;
    qStart = performance.now();
    const bar = s.body.querySelector('.exam-clock i'), num = s.body.querySelector('.exam-clock b');
    clock = setInterval(() => {
      const left = Math.max(0, seconds - (performance.now() - qStart) / 1000);
      bar.style.width = (left / seconds) * 100 + '%';
      bar.classList.toggle('low', left < 5);
      num.textContent = `${Math.ceil(left)}초`;
      if (left <= 0) choose(-1);
    }, 100);
  }

  function render() {
    const q = questions[i];
    s.step.textContent = `${i + 1} / ${questions.length}`;
    s.body.innerHTML = `${seconds ? '<div class="exam-clock" aria-hidden="true"><span><i></i></span><b></b></div>' : ''}<p class="exam-q"></p><div class="exam-choices" role="menu"></div><p class="exam-tip"></p>`;
    s.body.querySelector('.exam-q').textContent = `Q${i + 1}. ${q.q}`;
    const box = s.body.querySelector('.exam-choices');
    box.append(...q.choices.map((c, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'guide-choice exam-choice';
      b.setAttribute('role', 'menuitem');
      b.textContent = c;
      b.addEventListener('click', () => choose(k));
      b.addEventListener('pointerenter', () => select(k));
      return b;
    }));
    select(0);
    startClock();
  }
  function select(k) {
    const items = [...s.body.querySelectorAll('.exam-choice')];
    sel = (k + items.length) % items.length;
    items.forEach((b, j) => b.classList.toggle('sel', j === sel));
  }
  function choose(k) {
    if (locked || ended) return;
    locked = true;
    stopClock();
    const q = questions[i], items = [...s.body.querySelectorAll('.exam-choice')];
    const right = k === q.answer;
    if (right) correct++;
    results.push(right);
    items[q.answer].classList.add('right');
    if (k < 0) s.body.querySelector('.exam-tip').textContent = '시간 초과!';
    else if (!right) items[k].classList.add('wrong');
    sound?.play(right ? 'clean' : 'none');
    setTimeout(() => {
      locked = false;
      i++;
      if (i < questions.length) render(); else end();
    }, 750);
  }
  /** 검정관의 한마디: 붙으면 칭찬, 아깝게 떨어지면 다독이고, 많이 모자라면 공부거리를 짚어 준다. */
  function examinerLine(passed) {
    if (passed) return '흠흠! 훌륭하다. 이어서 실기다.';
    if (correct >= pass - 1) return '흠흠… 한 문제 차이로군. 다음엔 붙을 거다.';
    return hint ? `흠흠. ${hint} 다시 보고 오도록.` : '흠흠. 다시 공부하고 오도록.';
  }
  function end() {
    ended = true;
    const passed = correct >= pass;
    s.step.textContent = '결과';
    s.body.innerHTML = `<div class="exam-result ${passed ? 'pass' : 'fail'}"><b class="stamp"></b><div class="score-dots" aria-hidden="true"></div><p class="exam-count"></p>`
      + '<div class="examiner"><span class="ex-name">대장 갑옷 씨</span><p class="ex-say"></p></div></div><div class="actions"><button class="btn primary" type="button"></button></div>';
    s.body.querySelector('.stamp').textContent = passed ? '합격' : '불합격';
    s.body.querySelector('.score-dots').append(...results.map((r) => { const d = document.createElement('i'); d.className = r ? 'on' : 'off'; return d; }));
    s.body.querySelector('.exam-count').textContent = `${correct} / ${questions.length} · 합격 ${pass}개`;
    s.body.querySelector('.ex-say').textContent = examinerLine(passed);
    const ok = s.body.querySelector('button');
    ok.textContent = passed ? '실기 보러 가기' : '다음에 또 올게요';
    ok.addEventListener('click', () => { stopClock(); s.close(); onDone?.(correct, passed); });
    ok.focus();
    sound?.play(passed ? 'pass' : 'fail');
  }
  s.onKey('keydown', (e) => {
    const up = UP.includes(e.code), down = DOWN.includes(e.code), ok = OK.includes(e.code);
    if (!up && !down && !ok) return false;
    if (e.repeat) return;
    if (ended) { if (ok) s.body.querySelector('button')?.click(); return; }
    if (up) select(sel - 1); else if (down) select(sel + 1); else choose(sel);
  });
  s.onKey('keyup', (e) => (OK.includes(e.code) ? undefined : false));
  render();
}

/**
 * 술 자격 실기: 하이볼 만들기. 버튼(또는 스페이스)을 꾹 누르면 붓고, 떼면 멈춘다.
 * 1단계 위스키를 아래 선 안까지 → 2단계 탄산수를 위 선 안까지(넘치면 안 된다). onDone(합격했는지).
 */
export function openHighball(ui, { onDone, sound }) {
  const s = sheet(ui, '하이볼 실기');
  s.step.textContent = '1단계';
  s.body.innerHTML = `
    <div class="hb">
      <div class="hb-glass" aria-hidden="true">
        <span class="band whisky" style="bottom:${WHISKY_BAND[0] * 100}%;height:${(WHISKY_BAND[1] - WHISKY_BAND[0]) * 100}%"></span>
        <span class="band soda" style="bottom:${SODA_BAND[0] * 100}%;height:${(SODA_BAND[1] - SODA_BAND[0]) * 100}%"></span>
        <i class="liq whisky"></i><i class="liq soda"></i><b class="ice"></b><b class="ice two"></b>
      </div>
      <div class="hb-side">
        <p class="hb-say" aria-live="polite"></p>
        <button class="btn primary hb-pour" type="button">꾹 눌러서 붓기</button>
        <p class="exam-tip">위스키 1 : 탄산수 3</p>
      </div>
    </div>`;
  const sayEl = s.body.querySelector('.hb-say'), pourBtn = s.body.querySelector('.hb-pour');
  const whiskyEl = s.body.querySelector('.liq.whisky'), sodaEl = s.body.querySelector('.liq.soda');
  let stage = 'whisky', whisky = 0, total = 0, pouring = false, raf = 0, startT = 0, base = 0, done = false;
  const SPEED = { whisky: 0.26, soda: 0.4 }; // 1초에 잔의 몇 배만큼(누른 시간으로 계산해서 화면이 덜 그려져도 양은 정확하다)

  function draw() {
    whiskyEl.style.height = whisky * 100 + '%';
    sodaEl.style.bottom = whisky * 100 + '%';
    sodaEl.style.height = Math.max(0, Math.min(1.05, total) - whisky) * 100 + '%';
  }
  function guide() {
    sayEl.textContent = stage === 'whisky' ? '위스키 노란 선까지' : '탄산수 파란 선까지';
    s.step.textContent = stage === 'whisky' ? '1단계' : '2단계';
  }
  /** 지금까지 부은 양을 누른 시간으로 맞춘다. */
  function measure() {
    const amount = Math.min(1.05, base + SPEED[stage] * (performance.now() - startT) / 1000);
    if (stage === 'whisky') { whisky = amount; total = amount; } else total = amount;
  }
  function tick() {
    if (!pouring) return;
    measure();
    draw();
    if (total >= 1.05) { stop(); return; } // 넘쳤다
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (done || pouring) return;
    pouring = true;
    startT = performance.now();
    base = stage === 'whisky' ? whisky : total;
    pourBtn.classList.add('on');
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (!pouring) return;
    measure();
    draw();
    pouring = false;
    cancelAnimationFrame(raf);
    pourBtn.classList.remove('on');
    if (stage === 'whisky') {
      if (whisky <= 0.02) return; // 거의 안 부었으면 아직 1단계
      stage = 'soda';
      sound?.play('click');
      guide();
    } else judge();
  }
  function judge() {
    done = true;
    const ok = pourOk(whisky, total);
    const why = ok ? '하이볼 완성!'
      : whisky < WHISKY_BAND[0] ? '위스키가 너무 적었어요…' : whisky > WHISKY_BAND[1] ? '위스키가 너무 많았어요…'
        : total > SODA_BAND[1] ? '넘쳐 버렸어요…' : '탄산수가 모자랐어요…';
    sayEl.textContent = why;
    s.step.textContent = '결과';
    pourBtn.replaceWith(Object.assign(document.createElement('button'), { className: 'btn primary', type: 'button', textContent: '확인' }));
    const okBtn = s.body.querySelector('.hb-side .btn');
    okBtn.addEventListener('click', () => { s.close(); onDone?.(ok); });
    okBtn.focus();
    sound?.play(ok ? 'pass' : 'fail');
  }
  pourBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { pourBtn.setPointerCapture(e.pointerId); } catch { /* 잡을 수 없는 포인터여도 붓기는 한다 */ }
    start();
  });
  pourBtn.addEventListener('pointerup', stop);
  pourBtn.addEventListener('pointercancel', stop);
  pourBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  s.onKey('keydown', (e) => {
    if (!OK.includes(e.code)) return false;
    if (done) { if (!e.repeat) s.body.querySelector('.hb-side .btn')?.click(); return; }
    if (!e.repeat) start();
  });
  s.onKey('keyup', (e) => { if (!OK.includes(e.code)) return false; stop(); });
  guide();
  draw();
}
