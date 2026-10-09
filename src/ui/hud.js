import * as THREE from 'three';
import { JOB_TYPES, isComplete } from '../core/jobs.js';
import { EXAM_STREAK } from '../core/license.js';
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
const PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
const MINUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"></path></svg>';
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
  dock.append(status, job);
  const clock = el('div', 'hud-clock');
  clock.innerHTML = '<div class="hud-date"><span class="dl"></span><span class="sk"></span></div><div class="hud-time"><b class="hm"></b><small class="ap"></small></div>';
  const gear = el('button', 'hud-phone', PHONE);
  gear.type = 'button';
  gear.setAttribute('aria-label', '마을폰(설정)');
  const zoom = el('div', 'hud-zoom');
  const zoomIn = el('button', 'icon-btn', PLUS), zoomOut = el('button', 'icon-btn', MINUS);
  zoomIn.type = zoomOut.type = 'button';
  zoomIn.setAttribute('aria-label', '확대');
  zoomOut.setAttribute('aria-label', '축소');
  const lightBtn = el('button', 'icon-btn hud-light', LIGHT_ICON.off);
  lightBtn.type = 'button';
  lightBtn.hidden = true;
  zoom.append(zoomIn, zoomOut, lightBtn);
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
  ui.append(labelLayer, dock, clock, gear, zoom, action, meter, timer, toasts);

  const q = (root, sel) => root.querySelector(sel);
  const press = (down) => (e) => { e.preventDefault(); if (down) action.setPointerCapture?.(e.pointerId); input.setAction(down); };
  action.addEventListener('pointerdown', press(true));
  action.addEventListener('pointerup', press(false));
  action.addEventListener('pointercancel', press(false));
  action.addEventListener('contextmenu', (e) => e.preventDefault());

  const labelEls = new Map();
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
    onZoom(fn) { zoomIn.addEventListener('click', () => fn(0.85)); zoomOut.addEventListener('click', () => fn(1.18)); },
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
      if (state.exam) text = `승급 시험 ${state.exam.streak} / ${EXAM_STREAK} · 깔끔하게 연속으로`;
      else if (state.job) {
        const type = JOB_TYPES[state.job.typeId];
        text = done ? `${type.title} 완료! · 노동 접수에서 보수 받기` : `${type.title} ${state.job.count} / ${type.target}`;
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
    /** 행동 버튼 글자. null 이면 숨긴다. */
    setAction(label) {
      action.hidden = !label;
      if (label && action.textContent !== label) action.textContent = label;
    },
    /** 힘 게이지. zone = { from, to } (0..1) */
    showMeter(power, zone) {
      meter.hidden = false;
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
        if (e.textContent !== it.text) e.textContent = it.text;
        e.style.left = ((v.x + 1) / 2) * w + 'px';
        e.style.top = ((1 - v.y) / 2) * h + 'px';
        seen.add(it.id);
      }
      labelEls.forEach((e, id) => { if (!seen.has(id)) { e.remove(); labelEls.delete(id); } });
    }
  };
}
