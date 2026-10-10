/**
 * 별똥별이 쏟아지는 밤: 화면 위쪽에 별똥별이 가끔 휙 지나간다.
 * 카메라가 땅을 내려다봐서 하늘이 화면에 안 보이니 화면 위에 겹쳐 그린다(누름은 막지 않는다).
 */
export function createStreaks(ui) {
  const layer = document.createElement('div');
  layer.className = 'star-streaks';
  layer.setAttribute('aria-hidden', 'true');
  layer.hidden = true;
  ui.prepend(layer); // HUD 아래에 깔린다
  let on = false, timer = 0;
  const spawn = () => {
    if (!on) return;
    const s = document.createElement('i');
    s.style.left = `${35 + Math.random() * 60}%`;
    s.style.top = `${2 + Math.random() * 20}%`;
    s.style.animationDuration = `${0.8 + Math.random() * 0.5}s`;
    s.addEventListener('animationend', () => s.remove());
    layer.appendChild(s);
    timer = setTimeout(spawn, 900 + Math.random() * 2600);
  };
  return {
    /** 별똥별 밤이면 켠다(창 · 연출 중에는 끈다). */
    setActive(v) {
      if (v === on) return;
      on = v;
      layer.hidden = !v;
      clearTimeout(timer);
      if (v) timer = setTimeout(spawn, 400);
      else layer.replaceChildren();
    }
  };
}
