import { createScenery } from './scenery.js';

/** 휴대폰을 세로로 들고 있으면 가로로 돌리라고 안내한다. "세로로 그냥 하기" 로 넘길 수 있다. */
export function createOrientationGuard(ui) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  let dismissed = false;
  const el = document.createElement('div');
  el.className = 'notice';
  el.hidden = true;
  el.innerHTML = '<div class="card"><h2>휴대폰을 가로로 돌려 주세요</h2><p>가로 화면에서 조이스틱과 버튼을 잡기 편해요.</p><button class="btn" type="button">세로로 그냥 하기</button></div>';
  el.prepend(createScenery());
  ui.appendChild(el);
  el.querySelector('button').addEventListener('click', () => {
    dismissed = true;
    document.body.classList.add('portrait-ok');
    check();
  });
  function check() {
    el.hidden = !(coarse && !dismissed && window.innerHeight > window.innerWidth);
  }
  window.addEventListener('resize', check);
  check();
  return { check, get blocking() { return !el.hidden; } };
}
