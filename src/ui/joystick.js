const RADIUS = 56;
/** 두 손가락을 이만큼(ms) 안에 같이 대야 확대 · 축소로 본다. 먼저 한참 누르고 있던 손가락(공격 · 풀 뽑기)에 다른 손가락이 닿으면 조이스틱이다. */
const PINCH_GAP = 300;
const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

/**
 * 가상 조이스틱(화면 왼쪽 절반, 터치만)과 키보드(WASD/방향키, 스페이스)를 하나로 묶는다. E · F · I 단축키는 main.js 에서.
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
  let touch = null; // { id, x, y, dx, dy, at: 잡은 시각 }
  let enabled = true;
  let actionDown = false;

  const emitAction = (down) => {
    if (actionDown === down) return;
    actionDown = down;
    listeners.forEach((fn) => fn(down));
  };

  function onDown(e) {
    if (e.pointerType === 'touch') {
      const now = performance.now(), left = e.clientX <= window.innerWidth * 0.5;
      // 조이스틱을 쥐고 움직이던 중에 닿은 손가락: 오른쪽이면 다른 누름(공격 연타 등)이다. 왼쪽이면 조이스틱 손가락을 뗀 소식을 놓친 채
      // (아이폰에서 가끔) 다시 닿은 것이라 조이스틱을 새로 잡는다 — 예전엔 놓친 손가락이 남아 조이스틱이 다시 나타나지 않았다
      if (touch && (now - touch.at > PINCH_GAP || Math.hypot(touch.dx, touch.dy) > 12)) {
        if (!left) return;
        fingers.delete(touch.id);
        touch = null;
        stick.hidden = true;
      }
      // 먼저 닿아 있던 손가락이 한참 눌려 있었으면(오른쪽 화면을 누른 채 공격 · 풀 뽑기, 또는 뗀 소식을 놓친 손가락) 확대가 아니다:
      // 확대 셈에서 빼서 이번 손가락이 조이스틱이 되게 한다(예전엔 두 손가락으로 알아 조이스틱 대신 화면이 확대 · 축소됐다)
      for (const [id, f] of fingers) if (now - f.at > PINCH_GAP) fingers.delete(id);
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, at: now });
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
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, at: performance.now() };
    try { canvas.setPointerCapture?.(e.pointerId); } catch { /* 이미 끝난 손가락 */ }
    stick.hidden = false;
    stick.style.left = e.clientX + 'px';
    stick.style.top = e.clientY + 'px';
    knob.style.transform = '';
  }
  function onMove(e) {
    const f = fingers.get(e.pointerId);
    if (f) {
      f.x = e.clientX; f.y = e.clientY;
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
    if (e.code === 'Space') { e.preventDefault(); if (enabled) emitAction(true); }
  }
  function onKeyUp(e) {
    if (KEYS[e.code]) pressed.delete(e.code);
    if (e.code === 'Space') emitAction(false);
  }
  function onBlur() { pressed.clear(); touch = null; fingers.clear(); pinchDist = 0; stick.hidden = true; emitAction(false); }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  // 손가락을 뗀 곳이 화면이 아니어도(그새 행동 버튼이 나타나 그 위에서 뗐어도) 놓친 손가락이 남지 않게 창 전체에서 받는다
  // (남은 손가락이 있으면 다음 터치를 두 손가락 확대로 잘못 알아 화면이 확 커졌다)
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  // 조이스틱을 쥔 채 다른 손가락으로 버튼(가방 · 마을폰 …)을 누르면 휴대폰 브라우저가 두 손가락 몸짓으로 보고 click 을 만들지 않는다.
  // 다른 손가락이 닿아 있는 동안 버튼에서 짧게 누르고 뗀 손가락은 직접 click 으로 바꿔 준다(브라우저가 그래도 click 을 만들면 하나만)
  const downTouches = new Set();
  let tapBtn = null, synth = null; // tapBtn: { id, el, x, y }, synth: { el, until } 직접 누른 버튼
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const el = e.target && e.target.closest ? e.target.closest('button') : null;
    tapBtn = el && downTouches.size > 0 && !el.classList.contains('hud-action') ? { id: e.pointerId, el, x: e.clientX, y: e.clientY } : null; // 행동 버튼은 누름 · 뗌을 따로 받는다
    downTouches.add(e.pointerId);
  }, true);
  const liftTouch = (e) => {
    downTouches.delete(e.pointerId);
    if (!tapBtn || e.pointerId !== tapBtn.id) return;
    const { el, x, y } = tapBtn;
    tapBtn = null;
    if (e.type !== 'pointerup' || el.disabled || !el.isConnected || Math.hypot(e.clientX - x, e.clientY - y) > 24) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !el.contains(under)) return;
    synth = { el, until: performance.now() + 700 };
    el.click();
  };
  window.addEventListener('pointerup', liftTouch, true);
  window.addEventListener('pointercancel', liftTouch, true);
  window.addEventListener('click', (e) => {
    if (!synth || !e.isTrusted) return;
    if (performance.now() < synth.until && synth.el.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
    synth = null;
  }, true);
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
