import { pullDifficulty } from '../core/weeding.js';

const FRUITS = [
  { name: '사과', body: '#e0524f', leaf: '#6fbf5a' },
  { name: '레몬', body: '#f7d24a', leaf: '#6fbf5a' },
  { name: '귤', body: '#f29a4a', leaf: '#6fbf5a' },
  { name: '복숭아', body: '#ffb7c5', leaf: '#8fd16a' }
];
const fruitSvg = (f) => `<svg viewBox="0 0 60 60" aria-hidden="true">
  <ellipse cx="30" cy="34" rx="21" ry="20" fill="${f.body}" stroke="#2b2224" stroke-width="3"/>
  <path d="M30 14q4-8 12-6q-2 8-12 6z" fill="${f.leaf}" stroke="#2b2224" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="22" cy="28" rx="5" ry="3" fill="#ffffff" opacity="0.6"/></svg>`;

/**
 * 과일 스티커 붙이기: 컨베이어로 과일이 지나간다. 가운데 틀 안에 왔을 때 '붙이기'(버튼·스페이스·엔터·벨트 누르기).
 * 틀 한가운데면 'clean'(완벽), 틀 안이면 'snapped'(좋아), 틀 밖이면 'none'(빗나감). 그냥 지나간 과일은 세지 않는다.
 * 기운이 낮을수록 과일이 빠르고 틀이 좁다(풀 뽑기와 같은 난이도 규칙).
 * opts: { need(남은 장수), done(이미 붙인 장수), stamina, maxStamina,
 *         onResult(result) → { stamina } 또는 false(기운이 없어 더 못 함), onClose(붙인 장수) }
 */
export function openSticker(ui, { need, done = 0, stamina, maxStamina, onResult, onClose }) {
  const wrap = document.createElement('div');
  wrap.className = 'backdrop sticker-game';
  wrap.innerHTML = `
    <div class="panel card" role="dialog" aria-label="과일 스티커 붙이기"><div class="panel-body">
      <h2>스티커 작업대</h2>
      <p class="sub">과일이 가운데 틀에 왔을 때 붙이기! 한가운데면 완벽해요.</p>
      <div class="belt"><span class="belt-zone"><i></i></span><span class="belt-fruit"></span></div>
      <p class="belt-say" aria-live="polite">&nbsp;</p>
      <div class="actions">
        <span class="belt-count"></span>
        <button class="btn" type="button" data-quit>그만하기</button>
        <button class="btn primary belt-go" type="button">붙이기!</button>
      </div>
    </div></div>`;
  ui.appendChild(wrap);
  const belt = wrap.querySelector('.belt'), zone = wrap.querySelector('.belt-zone'), fruitEl = wrap.querySelector('.belt-fruit');
  const say = wrap.querySelector('.belt-say'), countEl = wrap.querySelector('.belt-count'), go = wrap.querySelector('.belt-go');

  let made = 0, current = stamina, fruit = null, alive = true, raf = 0, zoneW = 18;
  const target = done + need;
  const showCount = () => { countEl.textContent = `${done + made} / ${target}장`; };

  // 기운에 따른 틀 폭과 속도
  function nextFruit() {
    const d = pullDifficulty(current, maxStamina), f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    zoneW = 18 * d.widthScale;
    zone.style.width = zoneW + '%';
    fruitEl.innerHTML = fruitSvg(f);
    fruitEl.classList.remove('stuck');
    fruit = { start: performance.now(), dur: (2.4 - Math.min(made, 8) * 0.08) / d.speedScale, judged: false };
  }
  /** 과일 가운데 위치(0..1, 0.5 가 틀 한가운데). 시간으로 계산해서 화면이 드문드문 그려져도 정확하다. */
  const pos = () => Math.min(1.1, -0.1 + ((performance.now() - fruit.start) / 1000 / fruit.dur) * 1.2);

  function judge() {
    if (!alive || !fruit || fruit.judged) return;
    fruit.judged = true;
    const off = Math.abs(pos() - 0.5), half = zoneW / 200;
    const result = off <= half * 0.35 ? 'clean' : off <= half ? 'snapped' : 'none';
    const r = onResult(result);
    if (r === false) { finish(); return; }
    current = r.stamina;
    if (result !== 'none') { made++; fruitEl.classList.add('stuck'); }
    say.textContent = result === 'clean' ? '완벽해!' : result === 'snapped' ? '좋아!' : '앗, 빗나갔다…';
    say.className = 'belt-say ' + result;
    showCount();
    if (done + made >= target) setTimeout(finish, 600);
  }

  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!fruit) return;
    const p = pos();
    fruitEl.style.left = p * 100 + '%';
    if (p >= 1.1) {
      if (!fruit.judged) { say.textContent = '앗, 지나갔다…'; say.className = 'belt-say none'; }
      nextFruit();
    }
  }

  function finish() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    wrap.remove();
    onClose?.(made);
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if ((e.key === ' ' || e.key === 'Enter') && document.activeElement !== wrap.querySelector('[data-quit]')) { e.preventDefault(); judge(); }
  };
  document.addEventListener('keydown', onKey, true);
  go.addEventListener('click', judge);
  belt.addEventListener('pointerdown', (e) => { e.preventDefault(); judge(); });
  wrap.querySelector('[data-quit]').addEventListener('click', finish);

  showCount();
  nextFruit();
  raf = requestAnimationFrame(frame);
  go.focus();
  return { close: finish };
}
