const RADIUS = 56;
const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

/**
 * 가상 조이스틱(화면 왼쪽 절반, 터치만)과 키보드(WASD/방향키, 스페이스 · E)를 하나로 묶는다.
 * vector() 는 길이 1 이하, y 는 화면 위쪽이 + 이다.
 * 입력 방식: 마지막으로 쓴 것이 터치면 'touch'(조이스틱 · 행동 버튼을 보인다), 키보드 · 마우스면 'desk'(숨긴다).
 * <html data-input="touch | desk"> 로 CSS 가 나눠 그린다. 두 손가락으로 벌리고 오므리면 확대 · 축소. 마우스 오른쪽 버튼은 막는다.
 */
export function createInput(ui, canvas) {
  const root = document.documentElement;
  let mode = null;
  const modeListeners = [];
  const setMode = (m) => {
    if (mode === m) return;
    mode = m;
    root.dataset.input = m;
    modeListeners.forEach((fn) => fn(m));
  };
  // 처음: 마우스처럼 정밀한 포인터가 주 입력이면 PC, 아니면 터치
  setMode(window.matchMedia?.('(pointer: fine)').matches ? 'desk' : 'touch');
  window.addEventListener('pointerdown', (e) => setMode(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'desk'), true);
  window.addEventListener('keydown', (e) => { if (KEYS[e.code] || e.code === 'Space' || e.code === 'KeyE') setMode('desk'); }, true);
  // 두 손가락 확대 · 축소
  const fingers = new Map(); // pointerId → { x, y }
  let pinchDist = 0;
  const zoomListeners = [];
  const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
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
    if (e.pointerType === 'touch') {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        // 두 번째 손가락: 조이스틱을 놓고 확대 · 축소로
        pinchDist = spread();
        touch = null;
        stick.hidden = true;
        return;
      }
    }
    if (fingers.size >= 2) return;
    // 조이스틱은 터치에서만(PC 에서는 키보드로 움직인다)
    if (e.pointerType === 'mouse' || !enabled || touch || e.clientX > window.innerWidth * 0.5) return;
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    try { canvas.setPointerCapture?.(e.pointerId); } catch { /* 이미 끝난 손가락 */ }
    stick.hidden = false;
    stick.style.left = e.clientX + 'px';
    stick.style.top = e.clientY + 'px';
    knob.style.transform = '';
  }
  function onMove(e) {
    if (fingers.has(e.pointerId)) {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        const d = spread();
        if (pinchDist > 0 && d > 0) zoomListeners.forEach((fn) => fn(pinchDist / d)); // 벌리면 가까이
        pinchDist = d;
        return;
      }
    }
    if (!touch || e.pointerId !== touch.id) return;
    let dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    touch.dx = dx; touch.dy = dy;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function onUp(e) {
    fingers.delete(e.pointerId);
    if (fingers.size < 2) pinchDist = 0;
    if (!touch || e.pointerId !== touch.id) return;
    touch = null;
    stick.hidden = true;
  }
  const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  function onKeyDown(e) {
    // 입력이 꺼져 있으면(창, 캐릭터 만들기) 키를 가로채지 않아 버튼을 스페이스로 누를 수 있게 둔다
    if (!enabled || typing(e)) return;
    if (KEYS[e.code]) { pressed.add(e.code); e.preventDefault(); }
    if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); if (enabled) emitAction(true); }
  }
  function onKeyUp(e) {
    if (KEYS[e.code]) pressed.delete(e.code);
    if (e.code === 'Space' || e.code === 'KeyE') emitAction(false);
  }
  function onBlur() { pressed.clear(); touch = null; fingers.clear(); pinchDist = 0; stick.hidden = true; emitAction(false); }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  // 마우스 오른쪽 버튼은 게임에서 쓰지 않는다: 브라우저 메뉴를 띄우지 않고, 누름도 게임(꾸미기 · 행동 버튼 · 붓기 등)에 전하지 않는다.
  // 이름 칸만은 붙여넣기 메뉴를 그대로 둔다.
  window.addEventListener('contextmenu', (e) => { if (!typing(e)) e.preventDefault(); });
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 2) e.stopPropagation(); }, true);

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
    /** 두 손가락 확대 · 축소: fn(거리 배율) — 1 보다 작으면 가까이. */
    onZoom(fn) { zoomListeners.push(fn); },
    /** 지금 입력 방식 'touch' | 'desk'. */
    get mode() { return mode; },
    onMode(fn) { modeListeners.push(fn); },
    /** 화면 행동 버튼에서 호출. */
    setAction(down) { emitAction(down); },
    /** 창이 열려 있을 때 입력을 막는다. */
    setEnabled(on) { enabled = on; if (!on) { touch = null; stick.hidden = true; pressed.clear(); emitAction(false); } },
    get actionDown() { return actionDown; }
  };
}
