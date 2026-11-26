import { FURNITURE, MAT_SIZES, homeOf, spare, isMat, matSize, footprint, cellsOf, stackAt, fitMat } from '../core/home.js';
import { COIN } from './hud.js';

const won = (n) => n.toLocaleString('ko-KR') + '원';

/**
 * 집 안 화면의 버튼들. 평소에는 자기 · 옷장 · 상자 · 꾸미기 · 나가기(집 안을 걸어 다니며 침대 · 옷장 · 보관 상자 · 문 앞에서 눌러도 된다).
 * 꾸미기 중에는 아래에 가진 가구 목록이 나오고, 목록의 가구를 바닥으로 끌어다 놓거나 고른 뒤 빈 칸을 누르면 놓인다.
 * 놓인 가구를 끌면 다른 칸으로 옮기고, 누르면 돌리거나 넣어 둘 수 있다. 가구는 마을 가구점에서 산다.
 * 러그 같은 깔개(core/home.js isMat)는 가구 밑에도 깔리고, 고르면 크게 · 작게로 여러 칸을 덮는다. 가구와 깔개가 겹친 칸을
 * 한 번 더 누르면 밑의 깔개를 고른다. 놓인 것은 { cx, cz, mat }(시작 칸 + 깔개 쪽인지)으로 가리킨다.
 * handlers: { getState, thumb(id) → 그림 URL | undefined, place(id, cx, cz) → { ok, reason }, remove(cx, cz, mat), rotate(cx, cz, mat) → 새 집,
 *             resize(cx, cz, step) → { ok, reason, home }, move(from, to | null) → { ok, reason }, cellAtScreen(clientX, clientY) → 칸 | null,
 *             ghost(id | null, 칸 | null), sleep(), wardrobe(), exit(), showGrid(on), highlight(칸 | 칸 목록 | null), onDecor(on) }
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
      <button class="btn" type="button" data-a="storage">상자</button>
      <button class="btn pink" type="button" data-a="decor">꾸미기</button>
      <button class="btn primary" type="button" data-a="exit">나가기</button>
    </div>
    <div class="home-tray" hidden>
      <p class="home-hint" aria-live="polite"></p>
      <div class="home-pick" hidden>
        <button class="btn" type="button" data-a="grow">크게</button>
        <button class="btn" type="button" data-a="shrink">작게</button>
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
  const growBtn = q('[data-a="grow"]'), shrinkBtn = q('[data-a="shrink"]');

  let decor = false, selected = null, picked = null, note = ''; // picked: 고른 놓인 것 { cx, cz, mat }
  let justDragged = false; // 끌어서 놓은 직후 따라오는 click 은 무시한다
  const same = (p, t) => p.cx === t.cx && p.cz === t.cz && isMat(p.id) === !!t.mat;
  const targetOf = (p) => ({ cx: p.cx, cz: p.cz, mat: isMat(p.id) });
  const pickedOf = (home) => (picked && home.placed.find((p) => same(p, picked))) || null;
  /** 놓인 것 p 를 고른다(덮는 칸들을 분홍으로). null 이면 고르지 않는다. */
  const pickItem = (p) => { picked = p ? targetOf(p) : null; h.highlight(p ? cellsOf(p) : null); };
  /** 끌어 옮긴 새 시작 칸: 처음 누른 칸 grab 에서 놓은 칸 to 까지 움직인 만큼(큰 깔개는 누른 자리가 손가락을 따라온다). */
  const shift = (from, to, grab) => (grab ? { cx: from.cx + to.cx - grab.cx, cz: from.cz + to.cz - grab.cz } : to);
  const takenNote = (mat) => (mat ? '거기엔 이미 깔개가 있어요' : '거기엔 이미 가구가 있어요');
  /** 고른 것의 안내: 깔개는 덮는 칸 수, 깔개 위 가구는 한 번 더 누르면 밑의 깔개를 고른다는 것. */
  function pickLabel(home, p) {
    const name = FURNITURE[p.id].name;
    if (isMat(p.id)) { const { w, d } = footprint(p); return `${name}, ${w * d === 1 ? '한 칸' : `${w}×${d}칸`}`; }
    return stackAt(home, p.cx, p.cz).length > 1 ? `${name}, 한 번 더 누르면 밑의 깔개` : name;
  }

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
        note = r.ok ? '' : r.reason === 'taken' ? takenNote(isMat(id)) : '';
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
    const pickedItem = pickedOf(home), mat = !!pickedItem && isMat(pickedItem.id);
    pickRow.hidden = !pickedItem;
    growBtn.hidden = shrinkBtn.hidden = !mat; // 크게 · 작게는 깔개만
    if (mat) { const n = MAT_SIZES.indexOf(matSize(pickedItem)); growBtn.disabled = n >= MAT_SIZES.length - 1; shrinkBtn.disabled = n <= 0; }
    hint.textContent = note || (pickedItem ? pickLabel(home, pickedItem)
      : selected ? '빈 칸 누르기'
        : owned.length ? '끌어서 옮기기' : '가구점에서 사 와요');
  }

  const setDecor = (on) => { decor = on; selected = null; picked = null; note = ''; h.showGrid(on); h.highlight(null); h.onDecor?.(on); render(); };

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'sleep') h.sleep();
    else if (a === 'wardrobe') h.wardrobe();
    else if (a === 'storage') h.storage?.(); // 보관 상자(두 번째 주머니)
    else if (a === 'exit') h.exit();
    else if (a === 'decor') setDecor(true);
    else if (a === 'done') setDecor(false);
    else if (a === 'rotate' && picked) { // 길쭉한 깔개는 돌리면 시작 칸이 당겨질 수 있어 같은 번호의 것을 다시 고른다
      const before = homeOf(h.getState()), i = before.placed.findIndex((p) => same(p, picked)), after = h.rotate(picked.cx, picked.cz, picked.mat);
      note = after === before ? '다른 깔개와 자리가 겹쳐서 못 돌려요' : '';
      pickItem(after.placed[i]);
      render();
    } else if ((a === 'grow' || a === 'shrink') && picked) {
      const i = homeOf(h.getState()).placed.findIndex((p) => same(p, picked)), r = h.resize(picked.cx, picked.cz, a === 'grow' ? 1 : -1);
      note = r.ok ? '' : r.reason === 'taken' ? '다른 깔개와 자리가 겹쳐요' : r.reason === 'room' ? '방이 좁아서 더 못 키워요' : '';
      pickItem(r.home.placed[i]);
      render();
    } else if (a === 'remove' && picked) { h.remove(picked.cx, picked.cz, picked.mat); pickItem(null); render(); }
    else if (a === 'unpick') { picked = null; h.highlight(null); render(); }
  });

  return {
    get open() { return !root.hidden; },
    get decorating() { return decor; },
    open() { root.hidden = false; setDecor(false); },
    close() { setDecor(false); root.hidden = true; },
    refresh: render,
    /**
     * 그 칸을 누르고 끌기 시작할 때 옮길 것 { cx, cz, mat }: 고른 것이 그 칸에 겹쳐 있으면 그것, 아니면 맨 위(가구, 그다음 위의 깔개).
     * 꾸미기 중이 아니거나 쟁반에서 고른 가구가 있거나 빈 칸이면 null.
     */
    grab(cell) {
      if (!decor || selected || !cell) return null;
      const st = stackAt(homeOf(h.getState()), cell.cx, cell.cz), p = (picked && st.find((o) => same(o, picked))) || st[0];
      return p ? targetOf(p) : null;
    },
    /** 끌고 있는 from 을 지금 to 칸에 놓으면 덮을 칸들(처음 누른 칸 grab 기준, 분홍 표시용). */
    dropCells(from, to, grab) {
      if (!from || !to) return null;
      const home = homeOf(h.getState()), p = home.placed.find((o) => same(o, from));
      if (!p || !isMat(p.id)) return to;
      const a = fitMat(home, { ...p, ...shift(from, to, grab) });
      return a ? cellsOf({ ...p, ...a }) : to;
    },
    /** 끌어 온 from 을 놓았을 때(grab: 처음 누른 칸). to 가 null 이면 방 밖. */
    dropped(from, to, grab) {
      const r = h.move(from, to && shift(from, to, grab));
      note = r.ok || r.reason === 'same' ? '' : r.reason === 'taken' ? takenNote(from.mat) : '방 안에 놓아 주세요';
      pickItem(null);
      render();
    },
    /** 바닥 칸을 눌렀을 때(꾸미기 중에만 의미가 있다). 겹친 칸은 누를 때마다 위에서부터 다음 것을 고른다. */
    cellTapped(cell) {
      if (!decor || !cell) return;
      note = '';
      if (selected) {
        const r = h.place(selected, cell.cx, cell.cz);
        if (r.ok) { if (spare(homeOf(h.getState()), selected) <= 0) selected = null; }
        else if (r.reason === 'taken') note = isMat(selected) ? '이미 깔개를 깐 칸이에요' : '이미 가구가 있는 칸이에요';
      } else {
        const st = stackAt(homeOf(h.getState()), cell.cx, cell.cz);
        if (st.length) { const k = picked ? st.findIndex((o) => same(o, picked)) : -1; pickItem(st[(k + 1) % st.length]); }
      }
      render();
    }
  };
}
