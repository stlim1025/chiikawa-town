const RADIUS = 56;
const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

/**
 * 가상 조이스틱(화면 왼쪽 절반)과 키보드(WASD/방향키, 스페이스)를 하나로 묶는다.
 * vector() 는 길이 1 이하, y 는 화면 위쪽이 + 이다.
 */
export function createInput(ui, canvas) {
  const stick = document.createElement('div');
  stick.className = 'stick';
  stick.hidden = true;
  stick.innerHTML = '<i></i>';
  ui.appendChild(stick);
  const knob = stick.firstChild;

  const pressed = new Set();
  const listeners = [];
  let touch = null; // { id, x, y, dx, dy }
  let enabled = true;
  let actionDown = false;

  const emitAction = (down) => {
    if (actionDown === down) return;
    actionDown = down;
    listeners.forEach((fn) => fn(down));
  };

  function onDown(e) {
    if (!enabled || touch || e.clientX > window.innerWidth * 0.5) return;
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    canvas.setPointerCapture?.(e.pointerId);
    stick.hidden = false;
    stick.style.left = e.clientX + 'px';
    stick.style.top = e.clientY + 'px';
    knob.style.transform = '';
  }
  function onMove(e) {
    if (!touch || e.pointerId !== touch.id) return;
    let dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    touch.dx = dx; touch.dy = dy;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function onUp(e) {
    if (!touch || e.pointerId !== touch.id) return;
    touch = null;
    stick.hidden = true;
  }
  const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  function onKeyDown(e) {
    // 입력이 꺼져 있으면(창, 캐릭터 만들기) 키를 가로채지 않아 버튼을 스페이스로 누를 수 있게 둔다
    if (!enabled || typing(e)) return;
    if (KEYS[e.code]) { pressed.add(e.code); e.preventDefault(); }
    if (e.code === 'Space') { e.preventDefault(); if (enabled) emitAction(true); }
  }
  function onKeyUp(e) {
    if (KEYS[e.code]) pressed.delete(e.code);
    if (e.code === 'Space') emitAction(false);
  }
  function onBlur() { pressed.clear(); touch = null; stick.hidden = true; emitAction(false); }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    /** 이동 방향. */
    vector() {
      if (!enabled) return { x: 0, y: 0 };
      if (touch) return { x: touch.dx / RADIUS, y: -touch.dy / RADIUS };
      let x = 0, y = 0;
      pressed.forEach((code) => { x += KEYS[code][0]; y += KEYS[code][1]; });
      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },
    /** 행동 버튼 누름/뗌을 구독한다. */
    onAction(fn) { listeners.push(fn); },
    /** 화면 행동 버튼에서 호출. */
    setAction(down) { emitAction(down); },
    /** 창이 열려 있을 때 입력을 막는다. */
    setEnabled(on) { enabled = on; if (!on) { touch = null; stick.hidden = true; pressed.clear(); emitAction(false); } },
    get actionDown() { return actionDown; }
  };
}
