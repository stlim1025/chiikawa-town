/**
 * 레스토랑 '별 세 개' 구출 놀이 화면(사이드스토리 'starDiner'): 3D 장면의 쇠고랑마다 동그란 '꾹' 단추를 겹쳐 띄운다.
 * 다른 놀이(섬 놀이 · 응원)처럼 흰 테두리 동그라미에 노란 고리가 차오르고(core/stardiner.js 의 HOLD_SEC), 다 차면 그 모서리가 빠진다.
 * 다음 차례 단추는 종이색으로 둥실. 키보드로는 Space · Enter 를 누르고 있으면 다음 쇠고랑을 누른다.
 * 화면 아래 가운데: 주방 상태(조용 · 달그락 · 오크가 내다봄 — 내다볼 때 누르고 있으면 들킬 뻔한다), 구한 별똥별(별 셋), 도움말.
 * start({ onHold(i | null) }) · layout(points [{ i, x, y, p, next }]) · setPhase('calm' | 'warn' | 'peek') · saved(n) · flash(text, bad) · release() · close()
 */
const PHASE_TEXT = { calm: '주방에서 달그락달그락… 지금이야, 꾹꾹!', warn: '쿵… 쿵… 발소리가 다가온다…!', peek: '쉿! 손을 떼요! 오크가 내다본다!' };
const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6.1 6.6.7-4.9 4.5 1.4 6.5L12 17.1l-5.9 3.3 1.4-6.5-4.9-4.5 6.6-.7z"/></svg>';

export function createStarGame(ui) {
  const root = document.createElement('div');
  root.className = 'stargame';
  root.hidden = true;
  root.innerHTML = '<div class="sg-clamps"></div><div class="sg-flash" aria-live="polite"></div>'
    + '<div class="sg-panel"><div class="sg-lab" aria-live="polite"></div>'
    + `<div class="sg-pips" aria-label="구한 별똥별">${STAR_SVG.repeat(3)}</div>`
    + '<div class="sg-hint">쇠고랑을 꾹 누르고 있으면 빠져요 <kbd>Space</kbd></div></div>';
  ui.appendChild(root);
  const box = root.querySelector('.sg-clamps'), labEl = root.querySelector('.sg-lab'), flashEl = root.querySelector('.sg-flash');
  const pips = [...root.querySelectorAll('.sg-pips svg')];
  const btns = new Map(); // 쇠고랑 번호 → 단추
  let onHold = null, holding = null, keyHeld = false, nextId = null, active = false;

  const set = (i) => { if (holding === i) return; holding = i; if (onHold) onHold(i); };
  function btn(i) {
    let b = btns.get(i);
    if (b) return b;
    b = document.createElement('button');
    b.type = 'button';
    b.className = 'sg-clamp';
    b.setAttribute('aria-label', `쇠고랑 ${i + 1} 꾹 누르기`);
    b.innerHTML = '<i class="sg-ring"></i><span>꾹</span>';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { b.setPointerCapture(e.pointerId); } catch { /* 이미 끝난 손가락 */ }
      set(i);
    });
    const up = () => { if (holding === i) set(null); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    box.appendChild(b);
    btns.set(i, b);
    return b;
  }
  // 키보드: 누르고 있는 동안 다음 쇠고랑을 누른다
  window.addEventListener('keydown', (e) => {
    if (!active || !(e.code === 'Space' || e.code === 'Enter')) return;
    e.preventDefault();
    if (e.repeat || keyHeld) return;
    keyHeld = true;
    if (nextId != null) set(nextId);
  });
  window.addEventListener('keyup', (e) => {
    if (!active || !(e.code === 'Space' || e.code === 'Enter')) return;
    keyHeld = false;
    set(null);
  });

  const api = {
    get active() { return active; },
    start(opts) {
      onHold = opts.onHold;
      holding = null;
      keyHeld = false;
      active = true;
      root.hidden = false;
      root.classList.remove('done');
      flashEl.textContent = '';
      api.saved(0);
      api.setPhase('calm');
    },
    /** 매 프레임: 남은 쇠고랑의 화면 자리 · 진행(p 0~1) · 다음 차례(next). 빠진 것은 points 에서 빠진다. */
    layout(points) {
      const seen = new Set();
      nextId = null;
      for (const pt of points) {
        const b = btn(pt.i);
        seen.add(pt.i);
        b.hidden = false;
        b.style.left = `${pt.x}px`;
        b.style.top = `${pt.y}px`;
        b.style.setProperty('--p', pt.p.toFixed(3));
        b.classList.toggle('next', !!pt.next);
        b.classList.toggle('on', holding === pt.i);
        if (pt.next) nextId = pt.i;
      }
      for (const [i, b] of btns) if (!seen.has(i)) { b.hidden = true; b.classList.remove('next', 'on'); if (holding === i) set(null); }
    },
    setPhase(p) {
      labEl.textContent = PHASE_TEXT[p] || '';
      root.dataset.phase = p;
    },
    /** 구한 별똥별 수(아래 별 셋이 하나씩 노랗게). */
    saved(n) { pips.forEach((el, k) => el.classList.toggle('on', k < n)); },
    /** 잠깐 가운데 글(별 하나 구했다 · bad 면 들킬 뻔). */
    flash(text, bad = false) {
      flashEl.textContent = text;
      flashEl.classList.toggle('bad', !!bad);
      flashEl.classList.remove('pop');
      void flashEl.offsetWidth;
      flashEl.classList.add('pop');
    },
    /** 누르던 것을 놓게 한다(들킬 뻔했을 때 — 다시 눌러야 한다). */
    release() { set(null); keyHeld = false; },
    close() {
      active = false;
      set(null);
      root.classList.add('done');
      setTimeout(() => { if (!active) { root.hidden = true; root.classList.remove('done'); } }, 400);
    }
  };
  return api;
}
