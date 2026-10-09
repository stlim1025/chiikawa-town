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
    <div class="hud-pill hud-energy" aria-label="기운">${HEART}<div class="hud-bar"><i></i></div><span class="sv"></span></div>`;
  const job = el('div', 'hud-job');
  // 지금 하는 퀘스트(5단계): 일감 칸 아래 두루마리 쪽지
  const quest = el('div', 'hud-quest');
  quest.hidden = true;
  quest.innerHTML = '<i></i><b></b><span></span>';
  dock.append(status, job, quest);
  const clock = el('div', 'hud-clock');
  clock.innerHTML = '<div class="hud-date"><span class="dl"></span><span class="sk"></span></div><div class="hud-time"><b class="hm"></b><small class="ap"></small></div>';
  // 가방(마을폰 왼쪽): 모아 둔 풀 · 열매 · 물건
  const bagBtn = el('button', 'hud-bag', '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 14q0-8 7-8t7 8" fill="none" stroke="#8a5a30" stroke-width="3" stroke-linecap="round"/><rect x="7" y="13" width="26" height="22" rx="7" fill="#e9b26b" stroke="#8a5a30" stroke-width="2.6"/><path d="M7 21h26" stroke="#8a5a30" stroke-width="2.4"/><rect x="16" y="18" width="8" height="7" rx="2" fill="#fcd95b" stroke="#8a5a30" stroke-width="2"/></svg>');
  bagBtn.type = 'button';
  bagBtn.setAttribute('aria-label', '가방');
  const gear = el('button', 'hud-phone', PHONE);
  gear.type = 'button';
  gear.setAttribute('aria-label', '마을폰(설정)');
  // 마을폰 아래 등불 버튼(확대 · 축소는 휠 · 두 손가락으로)
  const zoom = el('div', 'hud-zoom');
  const lightBtn = el('button', 'icon-btn hud-light', LIGHT_ICON.off);
  lightBtn.type = 'button';
  lightBtn.hidden = true;
  zoom.append(lightBtn);
  const action = el('button', 'hud-action');
  action.type = 'button';
  action.hidden = true;
  const meter = el('div', 'hud-meter');
  meter.hidden = true;
  meter.innerHTML = '<div class="lab">꾹 눌렀다가 초록에서 떼요</div><div class="track"><span class="zone"></span><span class="fill"></span><span class="needle"></span></div>';
  const toasts = el('div', 'hud-toasts');
  // 놀이 시간(술래잡기): 위 가운데 노란 알약
  const timer = el('div', 'hud-timer');
  timer.hidden = true;
  timer.setAttribute('role', 'timer');
  const labelLayer = el('div');
  labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
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
  const bar = q(status, '.hud-bar');
  const dateEl = q(clock, '.dl'), skyEl = q(clock, '.sk'), hmEl = q(clock, '.hm'), apEl = q(clock, '.ap');

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
      setText('money', moneyEl, state.money.toLocaleString('ko-KR') + '원');
      if (shown.stamina !== state.stamina) {
        shown.stamina = state.stamina;
        staminaEl.textContent = String(state.stamina);
        bar.firstChild.style.width = (state.stamina / MAX_STAMINA) * 100 + '%';
        bar.classList.toggle('low', state.stamina <= 25);
      }
      let text;
      const done = !state.exam && !!state.job && isComplete(state.job);
      if (state.exam) text = `승급 시험 ${state.exam.streak} / ${state.exam.need || 5} · 깔끔하게 연속으로`;
      else if (state.job) {
        const type = JOB_TYPES[state.job.typeId];
        text = done ? `${type.title} 완료! · 노동 접수에서 보수 받기` : `${type.title} ${state.job.count} / ${type.target}${type.id === 'weed8' ? '' : ' · ' + type.where}`;
      } else text = '일감 없음 · 노동 접수에서 받아요';
      if (text !== lastText) { job.textContent = text; lastText = text; job.classList.toggle('done', done); }
      // 시각은 동물의 숲처럼 12시간제 큰 숫자 + 오전/오후
      const minutes = Math.round(hourOf(state.clock) * 60) % 1440, h24 = Math.floor(minutes / 60);
      setText('date', dateEl, dateLabel(state.startDate || todayISO(), state.clock.day));
      setText('hm', hmEl, `${h24 % 12 || 12}:${String(minutes % 60).padStart(2, '0')}`);
      setText('ap', apEl, h24 < 12 ? '오전' : '오후');
      const phase = phaseOf(state.clock);
      if (shown.phase !== phase) { shown.phase = phase; skyEl.innerHTML = SKY_ICON[phase]; }
    },
    /** 지금 하는 퀘스트 { title, goal, story } | null. */
    setQuest(q) {
      const key = q ? q.title + '|' + q.goal : '';
      if (shown.quest === key) return;
      shown.quest = key;
      quest.hidden = !q;
      if (!q) return;
      quest.classList.toggle('story', !!q.story);
      quest.querySelector('i').textContent = q.story ? '이야기' : '부탁';
      quest.querySelector('b').textContent = q.title;
      quest.querySelector('span').textContent = q.goal;
      quest.classList.remove('got'); void quest.offsetWidth; quest.classList.add('got');
    },
    /** 행동 버튼 글자. null 이면 숨긴다. */
    setAction(label) {
      action.hidden = !label;
      if (label && action.textContent !== label) action.textContent = label;
    },
    /** 힘 게이지. zone = { from, to } (0..1) */
    /** 힘 게이지. label 을 주면 위 글씨를 바꾼다(풀 이름 · 몇 번째인지). */
    showMeter(power, zone, label = '꾹 눌렀다가 초록에서 떼요') {
      meter.hidden = false;
      const lab = q(meter, '.lab');
      if (lab.textContent !== label) lab.textContent = label;
      const z = q(meter, '.zone');
      z.style.left = zone.from * 100 + '%';
      z.style.width = (zone.to - zone.from) * 100 + '%';
      q(meter, '.fill').style.width = power * 100 + '%';
      q(meter, '.needle').style.left = power * 100 + '%';
    },
    hideMeter() { meter.hidden = true; },
    /** 놀이 시간 표시. null 이면 숨긴다. */
    setTimer(text) {
      timer.hidden = !text;
      if (text && timer.textContent !== text) timer.textContent = text;
    },
    /**
     * 새 일감 · 시험을 받았을 때: 가운데에 쪽지 카드가 톡 떴다가 왼쪽 위 일감 칸으로 날아가 꽂히고, 일감 칸이 반짝인다.
     * { kicker: '새 일감!', title, sub }
     */
    announce({ kicker, title, sub }) {
      const card = el('div', 'task-card');
      card.setAttribute('role', 'status');
      card.innerHTML = `<span class="task-ico">${NOTE}</span><div class="task-txt"><i></i><b></b><span></span></div>`;
      card.querySelector('i').textContent = kicker;
      card.querySelector('b').textContent = title;
      card.querySelector('.task-txt span').textContent = sub || '';
      ui.appendChild(card);
      const glow = () => {
        job.classList.remove('got');
        void job.offsetWidth; // 반짝임 다시 시작
        job.classList.add('got');
        setTimeout(() => job.classList.remove('got'), 1600);
      };
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        if (still || !card.animate) { card.remove(); glow(); return; }
        // 일감 칸 자리로 줄어들며 날아간다
        const from = card.getBoundingClientRect(), to = job.getBoundingClientRect();
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
    banner(title, sub, ms = 2600) {
      const b = el('div', 'hud-banner');
      b.setAttribute('role', 'status');
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = title;
      b.querySelector('span').textContent = sub || '';
      ui.appendChild(b);
      setTimeout(() => b.classList.add('out'), ms - 400);
      setTimeout(() => b.remove(), ms);
    },
    /** 잠깐 뜨는 알림. */
    toast(text, ms = 2400) {
      const t = el('div', 'toast');
      t.textContent = text;
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
        } else if (e.textContent !== it.text) e.textContent = it.text;
        e.style.left = ((v.x + 1) / 2) * w + 'px';
        e.style.top = ((1 - v.y) / 2) * h + 'px';
        seen.add(it.id);
      }
      labelEls.forEach((e, id) => { if (!seen.has(id)) { e.remove(); labelEls.delete(id); } });
      // 잠깐짜리 연출: 붙은 자리를 따라다니다가 시간이 되면 지운다
      const t = performance.now();
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i];
        if (t > f.until) { f.el.remove(); fx.splice(i, 1); continue; }
        v.set(f.x, f.y, f.z).project(camera);
        f.el.style.left = ((v.x + 1) / 2) * w + 'px';
        f.el.style.top = ((1 - v.y) / 2) * h + 'px';
      }
    }
  };
}
