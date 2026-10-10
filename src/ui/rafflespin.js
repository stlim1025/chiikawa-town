/**
 * 경품 추첨 연출: 가운데에 가라가라(팔각 통)가 덜컹덜컹 두 바퀴 돌고, 구멍에서 구슬이 툭 떨어져 쟁반에서 통통 튄다.
 * { ball: 구슬 색, sound, onDone } — 끝나면(누르거나 엔터 · 스페이스로 건너뛰어도) onDone 을 한 번 부른다.
 */
const SPIN_MS = 1500, DROP_MS = 650, HOLD_MS = 550;

function octagon(cx, cy, r) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export function openRaffleSpin(ui, { ball, sound, onDone }) {
  const wrap = document.createElement('div');
  wrap.className = 'raffle-wrap';
  wrap.innerHTML = `<div class="raffle-stage" role="img" aria-label="경품 추첨 가라가라를 돌리는 중">
    <svg viewBox="0 0 200 170" aria-hidden="true">
      <ellipse cx="100" cy="156" rx="72" ry="8" fill="rgba(90,68,49,.16)"/>
      <path d="M58 142 80 84M142 142 120 84" stroke="#5a4431" stroke-width="13" stroke-linecap="round"/>
      <path d="M58 142 80 84M142 142 120 84" stroke="#a8743c" stroke-width="7" stroke-linecap="round"/>
      <rect x="38" y="137" width="124" height="13" rx="5" fill="#a8743c" stroke="#5a4431" stroke-width="3"/>
      <g class="rs-drum">
        <polygon points="${octagon(100, 80, 50)}" fill="#c98a4a" stroke="#5a4431" stroke-width="4" stroke-linejoin="round"/>
        <polygon points="${octagon(100, 80, 34)}" fill="#e8b878" stroke="#a8743c" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M100 30v100M50 80h100M65 45l70 70M135 45l-70 70" stroke="#a8743c" stroke-width="2" opacity=".55"/>
        <circle cx="100" cy="80" r="7" fill="#7a5233" stroke="#5a4431" stroke-width="2.4"/>
        <path d="M100 80h44" stroke="#5a4431" stroke-width="7" stroke-linecap="round"/><path d="M100 80h44" stroke="#7a5233" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="146" cy="80" r="7" fill="#e0524f" stroke="#5a4431" stroke-width="3"/>
      </g>
      <path d="M116 126h48l-5 12h-38z" fill="#fff" stroke="#5a4431" stroke-width="3" stroke-linejoin="round"/>
      <circle class="rs-ball" cx="108" cy="104" r="9" fill="${ball}" stroke="#5a4431" stroke-width="3"/>
    </svg>
    <p class="rs-say">덜컹덜컹…</p>
  </div>`;
  ui.appendChild(wrap);
  let done = false, rattle = 0;
  const born = performance.now(); // 돌리기를 엔터로 눌렀으면 그 키를 떼는 것으로 바로 건너뛰지 않게
  const tick = setInterval(() => { if (++rattle > 7) clearInterval(tick); else sound?.play('click'); }, SPIN_MS / 8);
  const drop = setTimeout(() => { sound?.play('heart'); wrap.querySelector('.rs-say').textContent = '툭!'; }, SPIN_MS + 120);
  const end = setTimeout(finish, SPIN_MS + DROP_MS + HOLD_MS);
  const keys = (e) => {
    if (!['Space', 'Enter', 'NumpadEnter', 'Escape'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keyup' && performance.now() - born > 300) finish();
  };
  function finish() {
    if (done) return;
    done = true;
    clearInterval(tick); clearTimeout(drop); clearTimeout(end);
    window.removeEventListener('keydown', keys, true);
    window.removeEventListener('keyup', keys, true);
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 200);
    onDone?.();
  }
  wrap.addEventListener('click', finish);
  window.addEventListener('keydown', keys, true);
  window.addEventListener('keyup', keys, true);
  return { close: finish };
}
