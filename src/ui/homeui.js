import { FURNITURE, homeOf, spare } from '../core/home.js';
import { COIN } from './hud.js';

const won = (n) => n.toLocaleString('ko-KR') + '원';

/**
 * 집 안 화면의 버튼들. 평소에는 자기 · 옷장 · 꾸미기 · 나가기(집 안을 걸어 다니며 침대 · 옷장 · 문 앞에서 눌러도 된다).
 * 꾸미기 중에는 아래에 가진 가구 목록이 나오고, 목록의 가구를 바닥으로 끌어다 놓거나 고른 뒤 빈 칸을 누르면 놓인다.
 * 놓인 가구를 끌면 다른 칸으로 옮기고, 누르면 돌리거나 넣어 둘 수 있다. 가구는 마을 가구점에서 산다.
 * handlers: { getState, thumb(id) → 그림 URL | undefined, place(id, cx, cz) → { ok, reason }, remove(cx, cz), rotate(cx, cz),
 *             move(from, to) → { ok, reason }, cellAtScreen(clientX, clientY) → 칸 | null, ghost(id | null, 칸 | null),
 *             sleep(), wardrobe(), exit(), showGrid(on), highlight(cell | null), onDecor(on) }
 */
export function createHomeUI(ui, h) {
  const root = document.createElement('div');
  root.className = 'home-ui';
  root.hidden = true;
  root.innerHTML = `
    <div class="home-title"><b></b><small class="wallet"><span class="wallet-ico">${COIN}</span><span></span></small></div>
    <div class="home-bar">
      <button class="btn" type="button" data-a="sleep">자기</button>
      <button class="btn" type="button" data-a="wardrobe">옷장</button>
      <button class="btn pink" type="button" data-a="decor">꾸미기</button>
      <button class="btn primary" type="button" data-a="exit">나가기</button>
    </div>
    <div class="home-tray" hidden>
      <p class="home-hint" aria-live="polite"></p>
      <div class="home-pick" hidden>
        <button class="btn" type="button" data-a="rotate">돌리기</button>
        <button class="btn" type="button" data-a="remove">넣어 두기</button>
        <button class="btn" type="button" data-a="unpick">그대로 두기</button>
      </div>
      <div class="items"></div>
      <div class="tray-actions">
        <button class="btn primary" type="button" data-a="done">다 했어요</button>
      </div>
    </div>`;
  ui.appendChild(root);
  // 목록에서 끌고 있는 가구 그림(손가락을 따라다닌다. 바닥 칸 위에서는 3D 가구가 대신 보인다)
  const ghostImg = document.createElement('img');
  ghostImg.className = 'drag-ghost';
  ghostImg.alt = '';
  ghostImg.hidden = true;
  root.appendChild(ghostImg);
  const q = (s) => root.querySelector(s);
  const bar = q('.home-bar'), tray = q('.home-tray'), hint = q('.home-hint'), items = q('.items'), pickRow = q('.home-pick');

  let decor = false, selected = null, picked = null, note = '';
  let justDragged = false; // 끌어서 놓은 직후 따라오는 click 은 무시한다

  /** 목록의 가구를 바닥으로 끌어다 놓기. 10px 넘게 움직여야 끌기로 친다(터치에서 옆으로 밀면 목록 스크롤). */
  function startTileDrag(e, id) {
    if (spare(homeOf(h.getState()), id) <= 0) return;
    const d = { id, sx: e.clientX, sy: e.clientY, on: false, cell: null };
    const move = (ev) => {
      if (!d.on) {
        const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
        if (Math.hypot(dx, dy) < 10) return;
        if (ev.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy)) { stop(); return; }
        d.on = true;
        picked = null;
        note = '';
        root.classList.add('dragging');
        ghostImg.src = h.thumb(id) || '';
      }
      ev.preventDefault();
      d.cell = h.cellAtScreen(ev.clientX, ev.clientY);
      h.highlight(d.cell);
      h.ghost(id, d.cell);
      // 바닥 칸 위에서는 3D 가구를 보여 주고, 아니면 그림이 손가락을 따라온다
      const r = root.getBoundingClientRect();
      ghostImg.hidden = !!d.cell;
      ghostImg.style.left = ev.clientX - r.left + 'px';
      ghostImg.style.top = ev.clientY - r.top + 'px';
    };
    const up = () => {
      stop();
      if (!d.on) return; // 그냥 누른 것: click 으로 고르기
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 0);
      if (d.cell) {
        const r = h.place(id, d.cell.cx, d.cell.cz);
        note = r.ok ? '' : r.reason === 'taken' ? '거기엔 이미 가구가 있어요' : '';
      }
      selected = null;
      render();
    };
    function stop() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', stop);
      root.classList.remove('dragging');
      ghostImg.hidden = true;
      h.ghost(null, null);
      h.highlight(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', stop);
  }

  function render() {
    const s = h.getState(), home = homeOf(s);
    q('.home-title b').textContent = `${s.profile.name}네 집`;
    q('.home-title small > span:last-child').textContent = won(s.money);
    bar.hidden = decor;
    tray.hidden = !decor;
    if (!decor) return;
    const owned = Object.keys(FURNITURE).filter((id) => (home.owned[id] || 0) > 0);
    items.replaceChildren(...owned.map((id) => {
      const b = document.createElement('button'), left = spare(home, id);
      b.type = 'button';
      b.className = 'tile';
      const src = h.thumb(id);
      if (src) {
        const img = document.createElement('img');
        img.className = 'thumb';
        img.src = src;
        img.alt = '';
        b.append(img);
      }
      const nm = document.createElement('span'), cnt = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = FURNITURE[id].name;
      cnt.className = 'cnt';
      cnt.textContent = `×${left}`;
      b.append(nm, cnt);
      b.disabled = left <= 0;
      b.setAttribute('aria-pressed', String(selected === id));
      b.addEventListener('click', () => { if (justDragged) return; selected = selected === id ? null : id; picked = null; note = ''; h.highlight(null); render(); });
      b.addEventListener('pointerdown', (e) => startTileDrag(e, id));
      return b;
    }));
    const pickedItem = picked && home.placed.find((p) => p.cx === picked.cx && p.cz === picked.cz);
    pickRow.hidden = !pickedItem;
    hint.textContent = note || (pickedItem ? `${FURNITURE[pickedItem.id].name}: 어떻게 할까요?`
      : selected ? `${FURNITURE[selected].name}을(를) 놓을 빈 칸을 눌러요`
        : owned.length ? '끌어서 옮기고 누르면 돌려요' : '마을 가구점에서 가구를 사 와요');
  }

  const setDecor = (on) => { decor = on; selected = null; picked = null; note = ''; h.showGrid(on); h.highlight(null); h.onDecor?.(on); render(); };

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'sleep') h.sleep();
    else if (a === 'wardrobe') h.wardrobe();
    else if (a === 'exit') h.exit();
    else if (a === 'decor') setDecor(true);
    else if (a === 'done') setDecor(false);
    else if (a === 'rotate' && picked) { h.rotate(picked.cx, picked.cz); render(); }
    else if (a === 'remove' && picked) { h.remove(picked.cx, picked.cz); picked = null; h.highlight(null); render(); }
    else if (a === 'unpick') { picked = null; h.highlight(null); render(); }
  });

  return {
    get open() { return !root.hidden; },
    get decorating() { return decor; },
    open() { root.hidden = false; setDecor(false); },
    close() { setDecor(false); root.hidden = true; },
    refresh: render,
    /** 그 칸의 가구를 끌어 옮길 수 있는지(꾸미기 중, 쟁반에서 고른 가구가 없을 때). */
    canDrag(cell) {
      if (!decor || selected || !cell) return false;
      return homeOf(h.getState()).placed.some((p) => p.cx === cell.cx && p.cz === cell.cz);
    },
    /** 끌어 온 가구를 놓았을 때. to 가 null 이면 방 밖. */
    dropped(from, to) {
      const r = h.move(from, to || { cx: -1, cz: -1 });
      note = r.ok || r.reason === 'same' ? '' : r.reason === 'taken' ? '거기엔 이미 가구가 있어요' : '방 안에 놓아 주세요';
      picked = null;
      h.highlight(null);
      render();
    },
    /** 바닥 칸을 눌렀을 때(꾸미기 중에만 의미가 있다). */
    cellTapped(cell) {
      if (!decor || !cell) return;
      const home = homeOf(h.getState()), there = home.placed.find((p) => p.cx === cell.cx && p.cz === cell.cz);
      note = '';
      if (selected) {
        if (there) note = '이미 가구가 있는 칸이에요';
        else {
          h.place(selected, cell.cx, cell.cz);
          if (spare(homeOf(h.getState()), selected) <= 0) selected = null;
        }
      } else if (there) {
        picked = cell;
        h.highlight(cell);
      }
      render();
    }
  };
}
