import * as THREE from 'three';
import { JOB_TYPES, isComplete } from '../core/jobs.js';
import { MAX_STAMINA } from '../core/state.js';
import { hourOf, phaseOf } from '../core/clock.js';
import { dateLabel, todayISO } from '../core/calendar.js';

// 동물의 숲처럼: 돈·기운은 왼쪽 위 알약, 날짜·시각은 왼쪽 아래 큰 글씨, 설정은 오른쪽 위 마을폰
export const COIN = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f9d35b" stroke="#d99a2b" stroke-width="2"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#d99a2b" stroke-width="1.8"/><path d="M7.5 7.8q1.6-2 3.6-2.4" fill="none" stroke="#fff6d0" stroke-width="1.8" stroke-linecap="round"/></svg>';
const HEART = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5C6 16.4 2.6 13 2.6 8.9 2.6 6.2 4.7 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4c2.6 0 4.7 2.2 4.7 4.9 0 4.1-3.4 7.5-9.4 11.6z" fill="#ff9fb4" stroke="#e0718b" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.4 8.2q.6-1.6 2.2-1.9" fill="none" stroke="#ffe3ea" stroke-width="1.8" stroke-linecap="round"/></svg>';
const PHONE = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="4" width="22" height="32" rx="7" fill="#5ec4ad"/><rect x="12" y="8" width="16" height="21" rx="4" fill="#e9fbf3"/><path d="M20 26c-3.6-2.4-4.6-6.4-1.4-11.4 4.2 1.8 5.4 6.6 1.4 11.4zM20 26v-7" fill="#78c86a" stroke="#4f9c47" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="32.4" r="1.8" fill="#e9fbf3"/></svg>';
const SKY_ICON = {
  morning: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5" fill="#ffd45e"/><g stroke="#ffd45e" stroke-width="2.4" stroke-linecap="round"><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></g></svg>',
  evening: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 0 1 16 0z" fill="#ffa86b"/><path d="M2.5 19h19" stroke="#ffd3a8" stroke-width="2.4" stroke-linecap="round"/></svg>',
  night: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.5a8.6 8.6 0 1 0 5 13.2A7 7 0 0 1 15.5 3.5z" fill="#fff0a6"/></svg>'
};
SKY_ICON.day = SKY_ICON.morning;
// 새 일감 쪽지 그림(게시판에 꽂힌 메모 + 압정)
const NOTE = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="9" width="32" height="34" rx="5" fill="#fffaeb" stroke="#5a4431" stroke-width="2.6"/><path d="M15 21h18M15 28h18M15 35h11" stroke="#d6c08e" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="9" r="5" fill="#f2768f" stroke="#5a4431" stroke-width="2.4"/><circle cx="22.4" cy="7.6" r="1.4" fill="#fff"/></svg>';
const LIGHT_ICON = {
  off: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8M9 4v3l-2 3v9h10v-9l-2-3V4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  lantern: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8M9 4v3l-2 3v9h10v-9l-2-3V4" fill="#ffe08a" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="14" r="2.4" fill="#ff9d3c"/></svg>',
  flashlight: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h7l4-3v12l-4-3H5z" fill="#cfe6f7" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 8l3-2M18 12h3M18 16l3 2" stroke="#ffb02e" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** 상태 표시, 일감, 시계, 행동 버튼, 힘 게이지, 알림, 월드 라벨. */
export function createHud(ui, input) {
  // 왼쪽 위 기둥: 돈 · 급수 · 기운 → 지금 일감 → (안내 중이면) 할 일 쪽지가 차례로 쌓인다
  const dock = el('div', 'hud-left');
  const status = el('div', 'hud-status');
  status.innerHTML = `<div class="hud-pill hud-money">${COIN}<span class="mv"></span></div>
    <div class="hud-grade"></div>
    <div class="hud-pill hud-energy" aria-label="기운">${HEART}<div class="hud-bar"><i></i></div><span class="sv"></span></div>
    <div class="hud-buff" hidden>💪 공격 +1</div>`;
  // 같이 토벌 중인 친구들 얼굴(돈 · 기운 아래)
  const partyTag = el('div', 'hud-party');
  partyTag.hidden = true;
  const job = el('div', 'hud-job');
  job.hidden = true;
  job.innerHTML = '<b></b><span class="n"></span>';
  // 하는 중인 퀘스트(5단계): 일감 칸 아래에 퀘스트마다 쪽지 한 장씩(화면에 띄운 것이 맨 위)
  const quests = el('div', 'hud-quests');
  dock.append(status, partyTag, job, quests);
  const notes = new Map(); // 퀘스트 id → { el, key }
  // 카드가 날아오는 중인 퀘스트(그동안 그 쪽지는 숨겨 두었다가 카드가 꽂히면 반짝이며 나타난다)
  const incoming = new Map(); // id → 날아오는 카드 수
  const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0Q11.2 8.8 20 10Q11.2 11.2 10 20Q8.8 11.2 0 10Q8.8 8.8 10 0Z" fill="currentColor"/></svg>';
  /** 퀘스트 쪽지가 톡 튀며 반짝: 빛이 한 번 쓸고 지나가고, 둘레에서 별이 튄다. */
  function shineQuest(quest) {
    if (!quest) return;
    quest.classList.remove('got', 'shine');
    void quest.offsetWidth;
    quest.classList.add('shine');
    quest.querySelectorAll('.q-star').forEach((e) => e.remove());
    const spots = [[0, 0], [35, -8], [72, -6], [100, 10], [104, 70], [80, 108], [40, 106], [-4, 80], [-6, 30]];
    spots.forEach(([x, y], i) => {
      const st = document.createElement('i');
      st.className = 'q-star';
      const dx = (x - 50) * 0.5, dy = (y - 50) * 0.5;
      st.style.cssText = `--x:${x}%;--y:${y}%;--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--t:${(i * 0.05).toFixed(2)}s;--c:${i % 3 === 1 ? '#ffffff' : i % 3 === 2 ? '#ffb3c7' : '#ffc93c'}`;
      st.innerHTML = STAR;
      quest.appendChild(st);
    });
    setTimeout(() => { quest.classList.remove('shine'); quest.querySelectorAll('.q-star').forEach((e) => e.remove()); }, 1600);
  }
  const clock = el('div', 'hud-clock');
  clock.innerHTML = '<div class="hud-date"><span class="dl"></span><span class="sk"></span></div><div class="hud-time"><b class="hm"></b><small class="ap"></small></div>';
  // 가방(마을폰 왼쪽): 모아 둔 풀 · 열매 · 물건
  const bagBtn = el('button', 'hud-bag', '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 14q0-8 7-8t7 8" fill="none" stroke="#8a5a30" stroke-width="3" stroke-linecap="round"/><rect x="7" y="13" width="26" height="22" rx="7" fill="#e9b26b" stroke="#8a5a30" stroke-width="2.6"/><path d="M7 21h26" stroke="#8a5a30" stroke-width="2.4"/><rect x="16" y="18" width="8" height="7" rx="2" fill="#fcd95b" stroke="#8a5a30" stroke-width="2"/></svg>');
  bagBtn.type = 'button';
  bagBtn.setAttribute('aria-label', '주머니');
  bagBtn.title = '주머니 (I)';
  const gear = el('button', 'hud-phone', PHONE);
  gear.type = 'button';
  gear.setAttribute('aria-label', '마을폰(설정)');
  gear.title = '마을폰 (E)';
  // 마을폰 아래 등불 버튼(확대 · 축소는 휠 · 두 손가락으로)
  const zoom = el('div', 'hud-zoom');
  const lightBtn = el('button', 'icon-btn hud-light', LIGHT_ICON.off);
  lightBtn.type = 'button';
  lightBtn.hidden = true;
  lightBtn.title = '등불 (F)';
  zoom.append(lightBtn);
  const action = el('button', 'hud-action');
  action.type = 'button';
  action.hidden = true;
  const meter = el('div', 'hud-meter');
  meter.hidden = true;
  meter.innerHTML = '<div class="lab">초록에서 떼요</div><div class="track"><span class="zone"></span><span class="fill"></span><span class="needle"></span></div>';
  const toasts = el('div', 'hud-toasts');
  /**
   * 짧은 조각 여러 개를 한 줄에: 글 하나('초록에서 떼요') 또는 [글 | { icon, text, pill }] 목록.
   * 조각마다 따로 떨어진 칸(그림이 있거나 pill 이면 동그란 알약)이라 '·' 로 이어 쓰지 않아도 구분된다.
   * icon: 'coin' | 'energy' | SVG 문자열. 같은 내용이면 다시 그리지 않는다(매 프레임 불려도 가볍게).
   */
  function fillParts(target, parts) {
    const list = typeof parts === 'string' ? [parts] : parts.filter(Boolean);
    const key = list.map((p) => (typeof p === 'string' ? p : (p.icon ? '#' : '') + p.text)).join('|');
    if (target.dataset.k === key) return;
    target.dataset.k = key;
    target.replaceChildren(...list.map((p) => {
      const s = el('span', typeof p === 'string' ? 'part' : 'part pill');
      if (typeof p === 'string') { s.textContent = p; return s; }
      if (p.icon) s.innerHTML = p.icon === 'coin' ? COIN : p.icon === 'energy' ? HEART : p.icon;
      const em = document.createElement('em');
      em.textContent = p.text;
      s.append(em);
      return s;
    }));
  }
  // 놀이 시간(술래잡기): 위 가운데 노란 알약
  const timer = el('div', 'hud-timer');
  timer.hidden = true;
  timer.setAttribute('role', 'timer');
  const labelLayer = el('div');
  labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  /**
   * 머리 위 표시를 (x, y) 에 놓는다(표시는 CSS 로 가운데 · 아래 기준: translate(-50%, -100%)). 놓인 왼쪽 위가 늘 정수 픽셀이 되게
   * 폭 · 높이의 소수 부분까지 보정한다: 이름표 크기가 소수(87.3px …)라 가운데 기준으로 놓으면 글자 · 아이콘이 소수 픽셀에 걸려,
   * 걸을 때마다 고해상도 휴대폰에서 아이콘이 글자와 따로 부들부들 떨렸다. 크기는 내용 · 모양이 바뀔 때(와 3초마다 — 글꼴이 늦게 와도) 잰다.
   */
  const placeAt = (e, x, y) => {
    const key = (e.dataset.v || e.textContent) + '|' + e.className;
    if (e._key !== key || ++e._age > 90) {
      const r = e.getBoundingClientRect(), t = getComputedStyle(e).transform;
      const k = t && t !== 'none' ? Math.hypot(new DOMMatrixReadOnly(t).a, new DOMMatrixReadOnly(t).b) || 1 : 1; // 톡 나타나는 중(줄어 있음)이면 원래 크기로
      e._w = r.width / k; e._h = r.height / k; e._key = key; e._age = 0;
    }
    const lx = Math.round(x - e._w / 2) + e._w / 2, ly = Math.round(y - e._h) + e._h;
    if (e._lx !== lx) { e._lx = lx; e.style.left = lx + 'px'; }
    if (e._ly !== ly) { e._ly = ly; e.style.top = ly + 'px'; }
  };
  // 맞았을 때 붉은 테두리 · 기절할 때 어둡게 덮는 막
  const hurtFx = el('div', 'hurt-fx');
  const curtain = el('div', 'curtain');
  ui.append(labelLayer, hurtFx, dock, clock, bagBtn, gear, zoom, action, meter, timer, toasts, curtain);

  const q = (root, sel) => root.querySelector(sel);
  const press = (down) => (e) => { e.preventDefault(); if (down) action.setPointerCapture?.(e.pointerId); input.setAction(down); };
  action.addEventListener('pointerdown', press(true));
  action.addEventListener('pointerup', press(false));
  action.addEventListener('pointercancel', press(false));
  action.addEventListener('contextmenu', (e) => e.preventDefault());

  const labelEls = new Map();
  // 월드에 붙는 잠깐짜리 연출(친밀도 하트 등): { x, y, z, el, until }
  const fx = [];
  const HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5C6 16.4 2.6 13 2.6 8.9 2.6 6.2 4.7 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4c2.6 0 4.7 2.2 4.7 4.9 0 4.1-3.4 7.5-9.4 11.6z" fill="#ff8fab" stroke="#e0607f" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.4 8.2q.6-1.6 2.2-1.9" fill="none" stroke="#ffe3ea" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const v = new THREE.Vector3();
  let lastText = '';
  // 바뀐 값만 DOM 에 쓴다
  const shown = {};
  const setText = (key, node, text) => { if (shown[key] !== text) { shown[key] = text; node.textContent = text; } };
  let size = { w: ui.clientWidth, h: ui.clientHeight };
  window.addEventListener('resize', () => { size = { w: ui.clientWidth, h: ui.clientHeight }; });
  const gradeEl = q(status, '.hud-grade'), moneyEl = q(status, '.mv'), staminaEl = q(status, '.sv');
  const buffEl = q(status, '.hud-buff');
  const bar = q(status, '.hud-bar');
  const dateEl = q(clock, '.dl'), skyEl = q(clock, '.sk'), hmEl = q(clock, '.hm'), apEl = q(clock, '.ap');

  // ---------- 큰 소식 카드(notice): 차례로 하나씩 ----------
  const noticeQueue = [];
  function showNotice() {
    const n = noticeQueue[0];
    if (!n) return;
    const wrap = el('div', 'notice-wrap');
    wrap.innerHTML = `<div class="notice-card ${n.tone || 'info'}" role="alertdialog" aria-modal="true"><i class="nk"></i><b class="stamp"></b><p class="ns"></p><div class="nc"></div><button class="btn primary" type="button"></button></div>`;
    q(wrap, '.nk').textContent = n.kicker || '';
    q(wrap, '.stamp').textContent = n.stamp || '';
    q(wrap, '.ns').textContent = n.sub || '';
    if (n.card) q(wrap, '.nk').after(n.card); // 자격증 카드 같은 큰 그림(도장 대신 보여 줄 때는 stamp 를 비운다)
    if (!n.stamp) q(wrap, '.stamp').remove();
    const row = q(wrap, '.nc');
    (n.chips || []).forEach((c) => {
      const ch = el('i', 'banner-chip');
      ch.innerHTML = (c.icon === 'coin' ? COIN : c.icon || '') + '<em></em>';
      ch.querySelector('em').textContent = c.text;
      row.appendChild(ch);
    });
    if (!row.children.length) row.remove();
    const ok = q(wrap, '.btn');
    ok.textContent = n.ok || '확인';
    const keys = (e) => {
      if (!['Space', 'Enter', 'NumpadEnter', 'Escape'].includes(e.code)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keyup' && !e.repeat) close();
    };
    function close() {
      if (!wrap.isConnected) return;
      window.removeEventListener('keydown', keys, true);
      window.removeEventListener('keyup', keys, true);
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 220);
      noticeQueue.shift();
      n.onClose?.();
      setTimeout(showNotice, 260);
    }
    ok.addEventListener('click', close);
    window.addEventListener('keydown', keys, true);
    window.addEventListener('keyup', keys, true);
    ui.appendChild(wrap);
    ok.focus({ preventScroll: true });
  }

  return {
    /** 왼쪽 위 기둥(하치와레의 할 일 쪽지를 여기에 붙인다). */
    dock,
    onSettings(fn) { gear.addEventListener('click', fn); },
    onBag(fn) { bagBtn.addEventListener('click', fn); },
    /** 가방에 무언가 들어갔을 때 가방 버튼이 톡 튄다. */
    bagBump() { bagBtn.classList.remove('bump'); void bagBtn.offsetWidth; bagBtn.classList.add('bump'); },
    /** 등불 버튼을 누르면(끔 → 랜턴 → 손전등). */
    onLight(fn) { lightBtn.addEventListener('click', fn); },
    /** 등불 버튼 모양. mode 가 null 이면 버튼을 숨긴다(불이 하나도 없을 때). */
    setLight(mode) {
      lightBtn.hidden = mode == null;
      if (mode == null || shown.light === mode) return;
      shown.light = mode;
      lightBtn.innerHTML = LIGHT_ICON[mode];
      lightBtn.setAttribute('aria-label', mode === 'off' ? '불 켜기' : mode === 'lantern' ? '랜턴 켜짐(누르면 바꾸기)' : '손전등 켜짐(누르면 바꾸기)');
      lightBtn.setAttribute('aria-pressed', String(mode !== 'off'));
    },
    /** 상태와 일감, 시계를 그린다. */
    render(state) {
      setText('grade', gradeEl, `제초 ${state.license.grade}급`);
      // 랏코와 수련한 날: 공격 +1 꼬리표
      const trained = !!(state.friends && state.friends.rakko && state.friends.rakko.home === state.clock.day);
      if (shown.buff !== trained) { shown.buff = trained; buffEl.hidden = !trained; }
      setText('money', moneyEl, state.money.toLocaleString('ko-KR') + '원');
      if (shown.stamina !== state.stamina) {
        shown.stamina = state.stamina;
        staminaEl.textContent = String(state.stamina);
        bar.firstChild.style.width = (state.stamina / MAX_STAMINA) * 100 + '%';
        bar.classList.toggle('low', state.stamina <= 25);
      }
      // 일감 칸: 일감(또는 승급 시험)이 있을 때만. 이름 + 진행 숫자만 짧게
      let title = null, n = '';
      const done = !state.exam && !!state.job && isComplete(state.job);
      if (state.exam) { title = '승급 시험'; n = `연속 ${state.exam.streak} / ${state.exam.need || 5}`; }
      else if (state.job) {
        const type = JOB_TYPES[state.job.typeId];
        title = type.title;
        n = done ? '보수 받으러 가요!' : `${state.job.count} / ${type.target}`;
      }
      const text = title ? title + '|' + n : '';
      if (text !== lastText) {
        lastText = text;
        job.hidden = !title;
        job.querySelector('b').textContent = title || '';
        job.querySelector('.n').textContent = n;
        job.classList.toggle('done', done);
      }
      // 시각은 동물의 숲처럼 12시간제 큰 숫자 + 오전/오후
      const minutes = Math.round(hourOf(state.clock) * 60) % 1440, h24 = Math.floor(minutes / 60);
      setText('date', dateEl, dateLabel(state.startDate || todayISO(), state.clock.day));
      setText('hm', hmEl, `${h24 % 12 || 12}:${String(minutes % 60).padStart(2, '0')}`);
      setText('ap', apEl, h24 < 12 ? '오전' : '오후');
      const phase = phaseOf(state.clock);
      if (shown.phase !== phase) { shown.phase = phase; skyEl.innerHTML = SKY_ICON[phase]; }
    },
    /**
     * 하는 중인 퀘스트 쪽지들 [{ id, title, goal, n?: '0 / 3', story }] (위에서부터 이 순서로). 빈 목록이면 모두 숨긴다.
     * 목표나 진행이 바뀐 쪽지는 톡 튄다(카드가 날아오는 중이면 꽂힐 때 반짝인다).
     */
    setQuests(list) {
      const chipKey = (q) => (q.chips || []).map((c) => c.text + (c.done ? '!' : '')).join(',');
      const key = list.map((q) => q.id + ':' + q.goal + ':' + (q.n || '') + ':' + chipKey(q)).join('|');
      if (shown.quests === key) return;
      shown.quests = key;
      const keep = new Set(list.map((q) => q.id));
      for (const [id, nt] of notes) if (!keep.has(id)) { nt.el.remove(); notes.delete(id); }
      list.forEach((q, i) => {
        let nt = notes.get(q.id);
        if (!nt) {
          const e = el('div', 'hud-quest');
          e.innerHTML = '<i></i><b></b><span><em></em><small></small></span>';
          nt = { el: e, key: '' };
          notes.set(q.id, nt);
        }
        const e = nt.el;
        if (quests.children[i] !== e) quests.insertBefore(e, quests.children[i] || null);
        e.classList.toggle('story', !!q.story);
        e.classList.toggle('side', !!q.side && !q.story);
        e.classList.toggle('incoming', incoming.has(q.id));
        e.querySelector('i').textContent = q.story ? '이야기' : q.side ? '사이드스토리' : '부탁';
        e.querySelector('b').textContent = q.title;
        e.querySelector('em').textContent = q.goal;
        const sm = e.querySelector('small');
        sm.textContent = q.n || '';
        sm.hidden = !q.n;
        // 물건 · 몬스터 그림 꼬리표(다 모은 것은 초록)
        let cs = e.querySelector('.q-chips');
        if (!cs) { cs = el('span', 'q-chips'); e.querySelector('span').appendChild(cs); }
        const ck = chipKey(q);
        if (cs.dataset.k !== ck) {
          cs.dataset.k = ck;
          cs.replaceChildren(...(q.chips || []).map((c) => {
            const ch = el('span', 'q-chip' + (c.done ? ' done' : ''));
            ch.innerHTML = c.icon + '<span class="q-n"></span>';
            ch.querySelector('.q-n').textContent = c.text;
            return ch;
          }));
        }
        cs.hidden = !(q.chips && q.chips.length);
        const k = q.goal + '|' + (q.n || '') + '|' + ck;
        if (nt.key && nt.key !== k && !incoming.has(q.id)) { e.classList.remove('got'); void e.offsetWidth; e.classList.add('got'); }
        nt.key = k;
      });
    },
    /** 행동 버튼 글자. null 이면 숨긴다. */
    /** 같이 토벌 중인 친구들. list: [{ name, svg: 얼굴 그림 }] (비면 숨긴다) */
    /**
     * 같이 다니는 친구 꼬리표. list: [{ name, svg, hp?, max?, down? }] — 같이 토벌 중인 친구는 얼굴 옆에 체력 막대와 숫자(쓰러지면 흐린 얼굴 · '기절').
     * 친구가 바뀔 때만 새로 그리고 톡 튀며, 체력만 바뀌면 막대만 고친다.
     */
    setParty(list, label = '같이 토벌') {
      partyTag.hidden = !list.length;
      const key = label + '|' + list.map((f) => f.name + (f.hp !== undefined ? '+' : '')).join(',');
      if (partyTag.dataset.k !== key) {
        partyTag.dataset.k = key;
        partyTag.replaceChildren();
        if (!list.length) return;
        const lab = el('span', 'pt-lab');
        lab.textContent = label;
        partyTag.appendChild(lab);
        for (const f of list) {
          const box = el('span', 'pt-ally');
          const face = el('i', 'pt-face');
          face.innerHTML = f.svg;
          face.title = f.name;
          face.setAttribute('aria-label', f.name);
          box.appendChild(face);
          if (f.hp !== undefined) { const bar = el('span', 'pt-hp'); bar.appendChild(el('i')); box.append(bar, el('b', 'pt-num')); }
          partyTag.appendChild(box);
        }
        partyTag.classList.remove('got'); void partyTag.offsetWidth; partyTag.classList.add('got');
      }
      list.forEach((f, i) => {
        const box = partyTag.querySelectorAll('.pt-ally')[i], bar = box && box.querySelector('.pt-hp');
        if (!bar) return;
        const k = Math.max(0, Math.min(1, f.hp / (f.max || 1)));
        bar.firstChild.style.width = `${Math.round(k * 100)}%`;
        bar.classList.toggle('low', k <= 0.4 && k > 0.2);
        bar.classList.toggle('crit', k <= 0.2);
        box.classList.toggle('down', !!f.down);
        bar.title = f.down ? `${f.name} 기절` : `${f.name} 체력 ${Math.max(0, Math.round(f.hp))} / ${f.max}`;
        bar.setAttribute('aria-label', bar.title);
        box.querySelector('.pt-num').textContent = String(f.down ? 0 : Math.max(0, Math.round(f.hp)));
      });
    },
    setAction(label) {
      action.hidden = !label;
      if (label && action.textContent !== label) action.textContent = label;
    },
    /** 힘 게이지. zone = { from, to } (0..1) */
    /** 힘 게이지. label 을 주면 위 글씨를 바꾼다(풀 이름 · 몇 번째인지). */
    /** label: 글 하나 또는 조각 목록(fillParts). */
    showMeter(power, zone, label = '초록에서 떼요') {
      meter.hidden = false;
      fillParts(q(meter, '.lab'), label);
      const z = q(meter, '.zone');
      z.style.left = zone.from * 100 + '%';
      z.style.width = (zone.to - zone.from) * 100 + '%';
      q(meter, '.fill').style.width = power * 100 + '%';
      q(meter, '.needle').style.left = power * 100 + '%';
    },
    hideMeter() { meter.hidden = true; },
    /** 놀이 · 시험 시간 표시: 글 하나 또는 조각 목록(fillParts). null 이면 숨긴다. */
    setTimer(parts) {
      timer.hidden = !parts;
      if (parts) fillParts(timer, parts);
    },
    /**
     * 새 일감 · 시험 · 부탁을 받았을 때: 가운데에 쪽지 카드가 톡 떴다가 왼쪽 위로 날아가 꽂히고 그 칸이 반짝인다.
     * to: 'job'(일감 칸, 기본) | 'quest'(퀘스트 쪽지 — 쪽지는 카드가 꽂힐 때 나타나며 별이 튄다)
     * { kicker: '새 일감!', title, sub, to, chips: [{ icon: 'coin' | SVG, text }] } — 덧붙일 것(어디서 · 보수)은 sub 에 잇지 말고 chips 로.
     */
    announce({ kicker, title, sub, to = 'job', id = null, chips = null }) {
      const toQuest = to === 'quest';
      if (toQuest && id) { incoming.set(id, (incoming.get(id) || 0) + 1); notes.get(id)?.el.classList.add('incoming'); }
      const card = el('div', 'task-card' + (toQuest ? ' quest' : ''));
      card.setAttribute('role', 'status');
      card.innerHTML = `<span class="task-ico">${NOTE}</span><div class="task-txt"><i></i><b></b><span></span></div>`;
      card.querySelector('i').textContent = kicker;
      card.querySelector('b').textContent = title;
      card.querySelector('.task-txt span').textContent = sub || '';
      if (!sub) card.querySelector('.task-txt span').remove();
      if (chips && chips.length) {
        const row = el('div', 'task-chips');
        fillParts(row, chips.map((c) => ({ ...c, pill: true })));
        card.querySelector('.task-txt').append(row);
      }
      ui.appendChild(card);
      const glow = () => {
        if (toQuest) {
          const left = (incoming.get(id) || 1) - 1, note = notes.get(id)?.el;
          if (left > 0) incoming.set(id, left); else { incoming.delete(id); note?.classList.remove('incoming'); }
          shineQuest(note);
          return;
        }
        job.classList.remove('got');
        void job.offsetWidth; // 반짝임 다시 시작
        job.classList.add('got');
        setTimeout(() => job.classList.remove('got'), 1600);
      };
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        const target = toQuest ? (notes.get(id)?.el || quests) : job;
        if (toQuest) target.style.visibility = 'hidden'; // 자리는 재되 아직 보이지 않게
        const to = target.getBoundingClientRect();
        if (toQuest) target.style.visibility = '';
        if (still || !card.animate || !to.width) { card.remove(); glow(); return; }
        // 일감 칸(또는 퀘스트 쪽지) 자리로 줄어들며 날아간다
        const from = card.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const k = Math.max(0.15, Math.min(0.6, to.height / from.height));
        const fly = card.animate([
          { transform: 'translate(-50%, -50%) rotate(-2deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.35 - 30}px)) rotate(-8deg) scale(${(1 + k) / 2})`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(0deg) scale(${k})`, opacity: 0.2 }
        ], { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.7, 0.4)', fill: 'forwards' });
        fly.onfinish = () => { card.remove(); glow(); };
      }, 1500);
    },
    /**
     * 친밀도가 올랐을 때: 친구 머리 위로 하트가 퐁퐁 떠오르고 '+1' 이 뜬다. up 이면 하트가 사방으로 터지고,
     * 위 가운데에 그 친구의 하트 줄(새 하트가 톡 채워진다) 카드가 잠깐 뜬다.
     * { x, y, z: 친구 머리 위, gained, up, hearts: 지금 하트 수, name, tag: 이름표 색 }
     */
    hearts({ x, y, z, gained, up, hearts, name, tag }) {
      const e = el('div', 'heart-fx' + (up ? ' up' : ''));
      const n = up ? 9 : 4;
      let html = '';
      for (let i = 0; i < n; i++) {
        const a = up ? (i / n) * 360 : -60 + (i / (n - 1)) * 120, d = up ? 70 + (i % 3) * 14 : 34 + (i % 2) * 16;
        html += `<i class="hf" style="--a:${a}deg;--d:${d}px;--t:${(i * 0.06).toFixed(2)}s">${HEART_SVG}</i>`;
      }
      e.innerHTML = html + `<b class="hf-plus">${HEART_SVG}+${gained}</b>`;
      labelLayer.appendChild(e);
      fx.push({ x, y, z, el: e, until: performance.now() + (up ? 1700 : 1300) });
      if (!up) return;
      const card = el('div', 'heart-card');
      card.setAttribute('role', 'status');
      card.style.setProperty('--tag', tag || '#ffd6e2');
      card.innerHTML = `<b></b><span class="row">${Array.from({ length: 5 }, (_, i) => `<i class="${i < hearts ? 'on' : ''}${i === hearts - 1 ? ' new' : ''}">${HEART_SVG}</i>`).join('')}</span><small>더 친해졌어요!</small>`;
      card.querySelector('b').textContent = name;
      ui.appendChild(card);
      setTimeout(() => card.classList.add('out'), 2300);
      setTimeout(() => card.remove(), 2700);
    },
    /** 맞았다: 화면 가장자리가 붉게 번쩍. */
    hurt() { hurtFx.classList.remove('on'); void hurtFx.offsetWidth; hurtFx.classList.add('on'); },
    /** 화면을 어둡게 덮는다(기절). on=false 면 걷는다. */
    curtain(on, text = '') { curtain.textContent = text; curtain.classList.toggle('on', !!on); },
    /** 월드 위치에서 떠오르는 글씨(맞힌 힘, 얻은 전리품). kind: 'dmg' | 'drop' | 'hurt' */
    floatText({ x, y, z, text, kind = 'dmg' }) {
      const e = el('div', 'float-fx ' + kind);
      e.textContent = text;
      labelLayer.appendChild(e);
      fx.push({ x, y, z, el: e, until: performance.now() + (kind === 'drop' ? 1300 : kind === 'note' ? 1400 : 900) });
    },
    /** 화면 가운데에 크게 찍히는 도장(노동 완료처럼 꼭 봐야 하는 소식). */
    /**
     * chips: 보상 꼬리표 [{ icon: 'coin' | 'heart' | SVG 문자열 | null, text }] — 긴 글 대신 아이콘 + 짧은 글로 한 줄에.
     */
    /**
     * 부탁 완료(동물의 숲처럼 축하): 가운데 위에 리본 달린 큰 카드가 톡 튀어나오고, 둘레로 꽃가루가 팡 터진다. 잠깐 뒤 저절로 사라진다(누르지 않아도 된다).
     * { title: '부탁 완료!' · '이야기 완료!', sub: 부탁 이름, chips: [{ icon, text }] 보상 }
     */
    questDone({ title, sub, chips = [], ms = 4800 }) {
      const card = el('div', 'quest-done');
      card.setAttribute('role', 'status');
      card.innerHTML = '<i class="qd-ribbon"></i><b class="qd-sub"></b><div class="qd-chips"></div>';
      card.querySelector('.qd-ribbon').textContent = title;
      card.querySelector('.qd-sub').textContent = sub || '';
      const row = card.querySelector('.qd-chips');
      for (const c of chips) {
        const ch = el('i', 'banner-chip');
        ch.innerHTML = (c.icon === 'coin' ? COIN : c.icon === 'heart' ? HEART_SVG : c.icon === 'energy' ? HEART : c.icon || '') + '<em></em>';
        ch.querySelector('em').textContent = c.text;
        row.appendChild(ch);
      }
      if (!chips.length) row.remove();
      // 꽃가루: 카드 가운데서 사방으로 튀었다가 떨어진다(색 · 모양 · 크기 제각각)
      const COLORS = ['#ffb7cf', '#fcd95b', '#8fd16a', '#8fd3ff', '#c9a8ff', '#ff9a8a', '#ffffff'];
      const burst = el('div', 'qd-confetti');
      for (let i = 0; i < 34; i++) {
        const p = el('i', 'qd-bit' + (i % 3 === 0 ? ' round' : i % 3 === 1 ? ' long' : ''));
        const a = (i / 34) * Math.PI * 2 + Math.random() * 0.3, r = 90 + Math.random() * 120;
        p.style.setProperty('--dx', `${Math.round(Math.cos(a) * r * 1.4)}px`);
        p.style.setProperty('--dy', `${Math.round(Math.sin(a) * r - 40)}px`);
        p.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 900)}deg`);
        p.style.setProperty('--d', `${(0.9 + Math.random() * 0.7).toFixed(2)}s`);
        p.style.background = COLORS[i % COLORS.length];
        burst.appendChild(p);
      }
      card.appendChild(burst);
      ui.appendChild(card);
      setTimeout(() => card.classList.add('out'), ms - 400);
      setTimeout(() => card.remove(), ms);
    },
    banner(title, sub, ms = 2600, chips = null) {
      const b = el('div', 'hud-banner' + (chips && chips.length ? ' has-chips' : ''));
      b.setAttribute('role', 'status');
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = title;
      b.querySelector('span').textContent = sub || '';
      if (chips && chips.length) {
        const row = el('div', 'banner-chips');
        chips.forEach((c) => {
          const ch = el('i', 'banner-chip');
          ch.innerHTML = (c.icon === 'coin' ? COIN : c.icon === 'heart' ? HEART_SVG : c.icon === 'energy' ? HEART : c.icon || '') + '<em></em>';
          ch.querySelector('em').textContent = c.text;
          row.appendChild(ch);
        });
        b.appendChild(row);
      }
      ui.appendChild(b);
      setTimeout(() => b.classList.add('out'), ms - 400);
      setTimeout(() => b.remove(), ms);
    },
    /**
     * 꼭 봐야 하는 소식(청약 발표 같은): 화면 가운데 큰 카드에 도장을 쾅 찍어 보여 주고, 확인을 눌러야 닫힌다.
     * { kicker: 위 작은 알약, stamp: 도장 글(당첨 · 낙첨), tone: 'good' | 'bad' | 'info', sub: 한 줄, chips: [{ icon, text }], ok: 버튼 글,
     *   card: 알약 아래 넣을 요소(자격증 카드) }
     * 엔터 · 스페이스로도 닫힌다(게임으로 새지 않게 막는다). 여러 개면 차례로 하나씩.
     */
    notice(n) {
      noticeQueue.push(n);
      if (noticeQueue.length === 1) showNotice();
    },
    /**
     * 잠깐 뜨는 알림. 글은 짧은 한 마디만, 덧붙일 것은 opts 로:
     * opts.icon: 맨 앞 그림(물건 그림 SVG, 없으면 나뭇잎), opts.chips: [{ icon: 'coin' | 'energy' | SVG, text }] 뒤에 붙는 작은 알약.
     */
    toast(text, ms = 2400, opts = null) {
      const t = el('div', 'toast' + (opts && opts.icon ? ' has-icon' : ''));
      if (opts && opts.icon) { const i = el('span', 't-ico'); i.innerHTML = opts.icon; t.appendChild(i); }
      const s = el('span', 't-text');
      s.textContent = text;
      t.appendChild(s);
      for (const c of (opts && opts.chips) || []) {
        const ch = el('i', 't-chip');
        ch.innerHTML = (c.icon === 'coin' ? COIN : c.icon === 'energy' ? HEART : c.icon || '') + '<em></em>';
        ch.querySelector('em').textContent = c.text;
        t.appendChild(ch);
      }
      toasts.appendChild(t);
      while (toasts.children.length > 3) toasts.firstChild.remove();
      setTimeout(() => t.remove(), ms);
    },
    /** 월드 위치에 붙는 라벨(간판, 말풍선). items: [{ id, x, y, z, text, kind: 'sign' | 'bubble' }] */
    placeLabels(items, camera) {
      const w = size.w, h = size.h, seen = new Set();
      for (const it of items) {
        v.set(it.x, it.y, it.z).project(camera);
        if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) continue;
        let e = labelEls.get(it.id);
        if (!e) { e = el('div', 'world-label ' + it.kind); labelLayer.appendChild(e); labelEls.set(it.id, e); }
        if (it.kind === 'prompt') {
          // 행동 안내: (PC 면) 키 모양 + 할 일
          const want = (it.key || '') + '|' + it.text;
          if (e.dataset.v !== want) {
            e.dataset.v = want;
            e.replaceChildren(...(it.key ? [el('kbd', '', ''), el('span', '', '')] : [el('span', '', '')]));
            if (it.key) e.firstChild.textContent = it.key;
            e.lastChild.textContent = it.text;
          }
        } else if (it.kind === 'mhp') {
          // 몬스터 머리 위: 이름 + 체력 줄
          const want = it.text + '|' + Math.round(it.pct * 100);
          if (e.dataset.v !== want) {
            if (!e.firstChild) { e.append(el('b'), el('i', '', '<u></u>')); e.classList.toggle('boss', !!it.boss); }
            e.dataset.v = want;
            e.firstChild.textContent = it.text;
            e.querySelector('u').style.width = Math.round(it.pct * 100) + '%';
            e.classList.toggle('low', it.pct <= 0.34);
          }
        } else if (it.kind === 'doing') {
          // 친구가 하는 일: 머리 위 작은 동그라미 아이콘
          if (e.dataset.v !== it.icon) { e.dataset.v = it.icon; e.innerHTML = it.svg; }
        } else if (it.html != null) {
          // 그림이 든 표시(간판 명찰 · 이야기 표시): 바뀔 때만 다시 그린다
          if (e.dataset.v !== it.html) { e.dataset.v = it.html; e.innerHTML = it.html; }
        } else if (e.textContent !== it.text) e.textContent = it.text;
        if ('far' in it) e.classList.toggle('far', !!it.far);
        placeAt(e, ((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h);
        seen.add(it.id);
      }
      labelEls.forEach((e, id) => { if (!seen.has(id)) { e.remove(); labelEls.delete(id); } });
      // 잠깐짜리 연출: 붙은 자리를 따라다니다가 시간이 되면 지운다
      const t = performance.now();
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i];
        if (t > f.until) { f.el.remove(); fx.splice(i, 1); continue; }
        v.set(f.x, f.y, f.z).project(camera);
        placeAt(f.el, ((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h);
      }
    }
  };
}
