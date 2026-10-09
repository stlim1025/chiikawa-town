import { INGREDIENTS, RECIPES, emptyBowl, addToBowl, bowlMatches, potState, servePay, BOIL, SOGGY_AFTER } from '../core/ramen.js';
import { charSvg } from './art.js';

const FACES = ['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju'];
const FACE_NAME = { chiikawa: '치이카와', hachiware: '하치와레', usagi: '우사기', momonga: '모몽가', kurimanju: '쿠리만쥬' };
const SOUPS = ['shoyu', 'miso', 'shio', 'tonkotsu'], NOODLES = ['thin', 'thick'];

// ---------- 그릇 그림 ----------
// 토핑마다 놓이는 자리(두 번째 · 세 번째는 옆에 하나 더)
const SLOTS = {
  moyashi: [[70, 33], [62, 28], [78, 29]],
  chashu: [[46, 37], [56, 31], [40, 30]],
  negi: [[72, 44], [80, 40], [64, 46]],
  nori: [[100, 22], [108, 26], [92, 20]],
  egg: [[94, 41], [100, 35], [88, 46]],
  corn: [[54, 45], [46, 46], [60, 49]],
  butter: [[70, 26], [76, 22], [64, 22]],
  garlic: [[84, 47], [88, 43], [80, 50]]
};
function topping(id, x, y) {
  switch (id) {
    case 'chashu': return `<circle cx="${x}" cy="${y}" r="9" fill="#c98a6a" stroke="#8a5a40" stroke-width="1.6"/><path d="M${x - 4} ${y}a4 4 0 1 1 4 4" fill="none" stroke="#efc2a8" stroke-width="1.6"/>`;
    case 'negi': return [[0, 0], [5, -3], [-5, -2], [2, 4]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2.3" fill="#a6e08f" stroke="#4f9c47" stroke-width="1.2"/>`).join('');
    case 'nori': return `<rect x="${x - 6}" y="${y - 9}" width="12" height="20" rx="1.5" fill="#2f4a3a" stroke="#1d2e24" stroke-width="1.2" transform="rotate(12 ${x} ${y})"/>`;
    case 'egg': return `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="6.5" fill="#fffdf6" stroke="#cfc4a8" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="3.8" fill="#f7a823"/>`;
    case 'moyashi': return [[-8, 2], [-4, -2], [0, 3], [4, -3], [8, 1], [-2, -5], [3, 5]].map(([dx, dy]) => `<path d="M${x + dx - 4} ${y + dy}q4 -3 8 0" fill="none" stroke="#f6f2dc" stroke-width="2.6" stroke-linecap="round"/><path d="M${x + dx - 4} ${y + dy}q4 -3 8 0" fill="none" stroke="#d9d2b0" stroke-width="0.8" stroke-linecap="round"/>`).join('');
    case 'corn': return [[0, 0], [4, 1], [-4, 1], [2, -3], [-2, -3], [0, 3]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2" fill="#ffd84d" stroke="#d9a520" stroke-width="0.8"/>`).join('');
    case 'butter': return `<rect x="${x - 6}" y="${y - 4}" width="12" height="9" rx="2" fill="#fbe7a1" stroke="#d9b85a" stroke-width="1.2"/>`;
    case 'garlic': return `<circle cx="${x}" cy="${y}" r="4.6" fill="#f6efe2" stroke="#c9b9a0" stroke-width="1.2"/><circle cx="${x + 3}" cy="${y - 2}" r="2.6" fill="#f6efe2" stroke="#c9b9a0" stroke-width="1"/>`;
    default: return '';
  }
}
/** 그릇 그림(SVG 문자열). 수프 색 · 면 · 토핑이 들어간 만큼 그려진다. */
export function bowlSvg(bowl) {
  const it = bowl.items, soup = SOUPS.find((s) => it[s]);
  let inner = `<ellipse cx="70" cy="40" rx="54" ry="14" fill="${soup ? INGREDIENTS[soup].color : '#f4ece0'}"/>`;
  if (soup && SOUPS.filter((s) => it[s]).length + (it[soup] - 1) > 1) inner += '<ellipse cx="70" cy="40" rx="54" ry="14" fill="#8a7a6a" opacity="0.35"/>'; // 수프를 섞으면 탁해진다
  for (const n of NOODLES) {
    if (!it[n]) continue;
    const w = n === 'thick' ? 3.4 : 1.7, c = INGREDIENTS[n].color, rows = n === 'thick' ? 4 : 7;
    for (let i = 0; i < rows; i++) {
      const y = 33 + i * (n === 'thick' ? 4 : 2.4);
      inner += `<path d="M30 ${y}q10 -4 20 0t20 0t20 0t20 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    }
  }
  for (const id of ['moyashi', 'chashu', 'corn', 'garlic', 'negi', 'egg', 'butter', 'nori']) {
    for (let k = 0; k < Math.min(it[id] || 0, 3); k++) inner += topping(id, ...SLOTS[id][k]);
  }
  return `<svg viewBox="0 0 140 100" aria-hidden="true">
    <path d="M12 40Q18 96 70 96Q122 96 128 40Z" fill="#e2574c" stroke="#a83a33" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M30 70q40 14 80 0" fill="none" stroke="#fffaf0" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>
    <ellipse cx="70" cy="40" rx="60" ry="17" fill="#fffaf0" stroke="#a83a33" stroke-width="2.4"/>
    <clipPath id="soup-clip"><ellipse cx="70" cy="40" rx="54" ry="14"/></clipPath>
    <g clip-path="url(#soup-clip)">${inner}</g></svg>`;
}

/** 재료 이름 칩(색 점 + 이름, 두 개 이상이면 ×n). */
function chip(id, n = 1) {
  const s = document.createElement('span');
  s.className = 'ing-chip';
  s.innerHTML = `<i style="background:${INGREDIENTS[id].color}"></i>`;
  s.append(n > 1 ? `${INGREDIENTS[id].name} ×${n}` : INGREDIENTS[id].name);
  return s;
}
/** 레시피 카드 묶음(가게 창의 레시피 북과 주방에서 같이 쓴다). */
export function recipeCards() {
  const box = document.createElement('div');
  box.className = 'recipe-cards';
  for (const r of Object.values(RECIPES)) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    const t = document.createElement('b');
    t.textContent = r.name;
    const list = document.createElement('div');
    list.className = 'chips';
    list.append(...Object.entries(r.items).map(([id, n]) => chip(id, n)));
    card.append(t, list);
    box.append(card);
  }
  return box;
}

// ---------- 주방 그림(재료가 늘어선 조리대) ----------
// 같은 그림이 매번 같게 나오도록 흩뿌릴 때 정해진 흔들림을 쓴다
const wob = (i, a) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * a;
function scatter(cols, rows, x0, y0, dx, dy, draw) {
  let out = '', i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) out += draw(x0 + c * dx + wob(i * 2, 4), y0 + r * dy + wob(i * 2 + 1, 4), i);
  return out;
}
/** 흰 사각 트레이에 담긴 재료. */
const trayArt = (inner) => `<svg viewBox="0 0 120 80" aria-hidden="true"><rect x="5" y="12" width="110" height="62" rx="12" fill="#9aa5b0"/><rect x="5" y="8" width="110" height="62" rx="12" fill="#f7f9fb" stroke="#aeb8c2" stroke-width="3"/><rect x="13" y="15" width="94" height="48" rx="8" fill="#e3e9ee"/>${inner}</svg>`;
/** 대나무 바구니에 담긴 면 뭉치. */
const nestArt = (thick) => `<svg viewBox="0 0 100 74" aria-hidden="true"><ellipse cx="50" cy="52" rx="42" ry="17" fill="#b98a52" stroke="#7d5a32" stroke-width="3"/><path d="M14 50q36 14 72 0" fill="none" stroke="#8f6a3e" stroke-width="2" stroke-dasharray="3 4"/>${
  scatter(4, 3, 24, 30, 15, 7, (x, y) => `<path d="M${x - 8} ${y}q4 -6 8 0t8 0" fill="none" stroke="${thick ? '#e9c463' : '#f4dc8a'}" stroke-width="${thick ? 4.4 : 2.2}" stroke-linecap="round"/><path d="M${x - 8} ${y}q4 -6 8 0t8 0" fill="none" stroke="#c99f3c" stroke-width="${thick ? 1 : 0.6}" stroke-linecap="round" opacity="0.6"/>`)}</svg>`;
const KITCHEN_ART = {
  negi: trayArt(scatter(7, 4, 22, 23, 12.5, 11, (x, y) => `<circle cx="${x}" cy="${y}" r="4.3" fill="#c9eeb0" stroke="#4f9c47" stroke-width="2"/>`)),
  nori: trayArt(scatter(4, 2, 18, 19, 21, 21, (x, y, i) => `<rect x="${x}" y="${y}" width="19" height="19" rx="2" fill="#2f4a3a" stroke="#1d2e24" stroke-width="1.5" transform="rotate(${(i % 5) * 4 - 8} ${x + 9} ${y + 9})"/><path d="M${x + 4} ${y + 6}h10M${x + 4} ${y + 12}h8" stroke="#46664f" stroke-width="1.4"/>`)),
  moyashi: trayArt(scatter(6, 4, 18, 23, 15, 11, (x, y, i) => `<path d="M${x} ${y}q6 -5 12 ${i % 2 ? 2 : -1}" fill="none" stroke="#fbf7e4" stroke-width="3.6" stroke-linecap="round"/><path d="M${x} ${y}q6 -5 12 ${i % 2 ? 2 : -1}" fill="none" stroke="#cfc7a0" stroke-width="1" stroke-linecap="round"/><circle cx="${x + 12}" cy="${y + (i % 2 ? 2 : -1)}" r="2.3" fill="#f2df8a"/>`)),
  corn: trayArt(scatter(9, 5, 19, 21, 10, 9.6, (x, y) => `<circle cx="${x}" cy="${y}" r="3.9" fill="#ffd84d" stroke="#d9a520" stroke-width="1.2"/>`)),
  chashu: `<svg viewBox="0 0 100 74" aria-hidden="true">${[[36, 42], [62, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="23" fill="#f3d6c0" stroke="#a4613a" stroke-width="6"/><path d="M${x - 8} ${y + 2}a8 8 0 1 1 8 8a4 4 0 1 1 -4 -4" fill="none" stroke="#e2a98a" stroke-width="3" stroke-linecap="round"/>`).join('')}</svg>`,
  egg: `<svg viewBox="0 0 100 74" aria-hidden="true">${[[34, 42, -12], [64, 36, 14]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="17" ry="22" fill="#fffdf6" stroke="#d6cbb2" stroke-width="2.5"/><circle cx="${x}" cy="${y + 2}" r="10.5" fill="#f39c1f"/><circle cx="${x - 2}" cy="${y}" r="5" fill="#ffc35a"/></g>`).join('')}</svg>`,
  butter: '<svg viewBox="0 0 100 74" aria-hidden="true"><ellipse cx="50" cy="52" rx="40" ry="14" fill="#e9eef2" stroke="#aeb8c2" stroke-width="3"/><path d="M28 30l20 -9l26 8v15l-20 9l-26 -8z" fill="#fbe7a1" stroke="#d9b85a" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 30l26 8l20 -9M54 38v15" fill="none" stroke="#d9b85a" stroke-width="2"/></svg>',
  garlic: `<svg viewBox="0 0 100 74" aria-hidden="true"><path d="M16 34h68q-4 30 -34 30t-34 -30z" fill="#f4f0e8" stroke="#b8ab95" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="34" rx="34" ry="9" fill="#fff9ee" stroke="#b8ab95" stroke-width="3"/>${scatter(7, 2, 26, 31, 8, 5, (x, y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f3e6c4" stroke="#c9b37e" stroke-width="0.8"/>`)}</svg>`,
  thin: nestArt(false),
  thick: nestArt(true)
};
/** 위에서 본 수프 통(김이 모락모락). */
const soupArt = (color) => `<svg viewBox="0 0 110 76" aria-hidden="true"><path d="M30 10q-5 -5 0 -10M55 8q-5 -5 0 -10M80 10q-5 -5 0 -10" fill="none" stroke="#e8eef2" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/><ellipse cx="55" cy="50" rx="50" ry="22" fill="#7d8790"/><ellipse cx="55" cy="44" rx="50" ry="22" fill="#d5dbe0" stroke="#87919b" stroke-width="3"/><ellipse cx="55" cy="44" rx="41" ry="16" fill="${color}"/><ellipse cx="41" cy="38" rx="13" ry="4" fill="#ffffff" opacity="0.35"/></svg>`;
const TRASH_ART = '<svg viewBox="0 0 80 74" aria-hidden="true"><path d="M18 22h44l-5 46H23z" fill="#8d969f" stroke="#5f6770" stroke-width="3" stroke-linejoin="round"/><rect x="12" y="14" width="56" height="9" rx="4" fill="#a7b0b8" stroke="#5f6770" stroke-width="3"/><rect x="32" y="8" width="16" height="7" rx="3" fill="#5f6770"/><path d="M31 32v28M40 32v28M49 32v28" stroke="#6b747c" stroke-width="3" stroke-linecap="round"/></svg>';
/** 가스레인지 위 냄비. state 에 따라 물 · 면 · 김 · 불꽃이 바뀐다. */
function boilerArt(st, type) {
  const on = st === 'boiling' || st === 'ready' || st === 'soggy';
  const c = type ? (st === 'soggy' ? '#cfc4a4' : INGREDIENTS[type].color) : '', w = type === 'thick' ? 5 : 3;
  const noodle = type ? `<path d="M40 40q8 -6 16 0t16 0t16 0t16 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M44 46q8 -5 16 0t16 0t16 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 150 112" aria-hidden="true">
    ${on ? '<path d="M50 18q-6 -7 0 -14M75 14q-6 -7 0 -14M100 18q-6 -7 0 -14" fill="none" stroke="#eef2f5" stroke-width="3" stroke-linecap="round"/>' : ''}
    <rect x="10" y="88" width="130" height="20" rx="6" fill="#3f444b"/><rect x="10" y="98" width="130" height="10" rx="4" fill="#c9443b"/>
    ${on ? '<path d="M45 90l5 -9l5 9M70 90l5 -11l5 11M95 90l5 -9l5 9" fill="#6ec2f5" stroke="#3a8fd1" stroke-width="1.5" stroke-linejoin="round"/>' : ''}
    <rect x="14" y="44" width="10" height="8" rx="3" fill="#6d7781"/><rect x="126" y="44" width="10" height="8" rx="3" fill="#6d7781"/>
    <path d="M22 38h106v38q0 10 -10 10H32q-10 0 -10 -10z" fill="#b8c1c9" stroke="#6d7781" stroke-width="3"/>
    <ellipse cx="75" cy="38" rx="53" ry="12" fill="${on ? '#a9daf0' : '#cfe9f5'}" stroke="#6d7781" stroke-width="3"/>
    ${noodle}
    <path d="M34 60h82" stroke="#d6dde3" stroke-width="3" stroke-linecap="round" opacity="0.7"/></svg>`;
}
/** 삶기 게이지(반원): 덜 삶음(파랑) → 딱 좋음(초록) → 퍼짐(빨강). 바늘은 따로 돌린다. */
const GAUGE = '<svg viewBox="0 0 100 56" aria-hidden="true"><path d="M8 52a42 42 0 0 1 84 0z" fill="#fffaf0" stroke="#8d6a45" stroke-width="3"/>'
  + '<path d="M16 52a34 34 0 0 1 51.6 -29.1" fill="none" stroke="#a9c4dc" stroke-width="12"/>'
  + '<path d="M67.6 22.9a34 34 0 0 1 14.9 17.9" fill="none" stroke="#73c68e" stroke-width="12"/>'
  + '<path d="M82.5 40.8a34 34 0 0 1 1.5 11.2" fill="none" stroke="#e9705a" stroke-width="12"/>'
  + '<g class="needle"><path d="M50 52L50 18" stroke="#5a4431" stroke-width="3.4" stroke-linecap="round"/></g><circle cx="50" cy="52" r="5" fill="#5a4431"/></svg>';
/** 게이지 바늘 각도(도, -90 왼쪽 ~ 90 오른쪽). 덜 삶음 -90~30, 딱 좋음 30~68, 퍼짐 68~90. */
function needleAngle(pot, t) {
  if (!pot) return -90;
  const e = t - pot.start, boil = BOIL[pot.type];
  if (e < boil) return -90 + 120 * (e / boil);
  if (e < boil + SOGGY_AFTER) return 30 + 38 * ((e - boil) / SOGGY_AFTER);
  return Math.min(90, 68 + 22 * ((e - boil - SOGGY_AFTER) / 2));
}

/**
 * 라멘 로우 주방. mode 'work'(알바: duration 초 동안 손님을 받는다) | 'exam'(슈퍼 알바이터 실기: 손님 3명, 실수하면 불합격, 레시피 북 없음).
 * 재료가 그림으로 늘어서 있다: 트레이(파 · 김 · 숙주 · 옥수수), 수프 통 넷, 면 바구니 둘(누르면 냄비로), 선반(차슈 · 달걀 · 버터 · 마늘).
 * 냄비 게이지가 초록일 때 냄비를 누르면 면이 그릇으로 간다. 주문표를 눌러 손님을 고르고 '내기' 간판을 누른다.
 * onEnd({ completed, served, earned, missed, wrong, reason }): 결과 화면에서 '확인'을 누르면.
 * sound: 효과음(play(name)).
 */
export function openRamenShop(ui, { mode = 'work', duration = 90, onEnd, sound }) {
  const exam = mode === 'exam';
  const EXAM_COUNT = 3;
  const item = (id, art) => `<button class="k-item" type="button" data-ing="${id}"><span class="art">${art}</span><span class="lab">${INGREDIENTS[id].name}</span></button>`;
  const wrap = document.createElement('div');
  wrap.className = 'backdrop kitchen-wrap';
  wrap.innerHTML = `
    <div class="panel kitchen" role="dialog" aria-label="라멘 로우 주방"><div class="panel-body kitchen-scene">
      <div class="k-top">
        <div class="k-board">
          <div class="k-board-head"><b>${exam ? '슈퍼 알바이터 실기' : '라멘 로우 알바'}</b><span class="k-timer"></span><span class="k-earn"></span>
            <button class="k-quit" type="button" data-k="quit">${exam ? '포기하기' : '그만하기'}</button></div>
          <div class="k-counter"></div>
        </div>
        ${exam ? '' : '<button class="k-recipe" type="button" data-k="book"><span>레시피</span></button>'}
        <button class="k-serve" type="button" data-k="serve"><span class="bell" aria-hidden="true"></span><b>내기!</b></button>
      </div>
      <div class="k-trays">${['negi', 'nori', 'moyashi', 'corn'].map((id) => item(id, KITCHEN_ART[id])).join('')}</div>
      <div class="k-traybox"><div class="k-bowl"></div><p class="k-say" aria-live="polite"></p></div>
      <div class="k-soups">${SOUPS.map((id) => item(id, soupArt(INGREDIENTS[id].color))).join('')}</div>
      <div class="k-boil">
        <button class="k-pot" type="button" data-k="pot" aria-label="면 삶는 냄비"><span class="gauge">${GAUGE}</span><span class="pot-art"></span><span class="pot-say"></span></button>
      </div>
      <div class="k-shelf">
        ${NOODLES.map((id) => item(id, KITCHEN_ART[id])).join('')}
        <span class="k-sep" aria-hidden="true"></span>
        ${['chashu', 'egg', 'butter', 'garlic'].map((id) => item(id, KITCHEN_ART[id])).join('')}
        <button class="k-item k-trash" type="button" data-k="trash"><span class="art">${TRASH_ART}</span><span class="lab">그릇 비우기</span></button>
      </div>
      <div class="k-book" hidden><div class="k-book-head"><b>레시피 북</b><button class="btn" type="button" data-k="book-close">닫기</button></div></div>
      <div class="k-result" hidden></div>
    </div></div>`;
  ui.appendChild(wrap);
  const q = (s) => wrap.querySelector(s);
  const counter = q('.k-counter'), bowlEl = q('.k-bowl'), sayEl = q('.k-say'), timerEl = q('.k-timer'), earnEl = q('.k-earn');
  const potEl = q('.k-pot'), potSay = q('.pot-say'), potArt = q('.pot-art'), needle = q('.gauge .needle'), book = q('.k-book'), result = q('.k-result');
  q('.k-book').append(recipeCards());

  const seats = [null, null, null];
  let sel = 0, bowl = emptyBowl(), pot = null, served = 0, earned = 0, missed = 0, wrong = 0, examLeft = EXAM_COUNT;
  let alive = true, timer = 0, nextSpawn = 0.6, sayT = 0, potDrawn = ''; // 손님 · 냄비는 0.05초마다(화면이 안 그려지는 동안에도 시간대로 흐른다)
  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  const recipeIds = Object.keys(RECIPES);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function say(text, ms = 1800) { sayEl.textContent = text; sayEl.hidden = false; sayT = now() + ms / 1000; }
  function renderBowl() { bowlEl.innerHTML = bowlSvg(bowl); }
  /** 누른 그림이 톡 튄다. */
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function renderSeats() {
    counter.replaceChildren(...seats.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seat' + (c ? '' : ' empty') + (i === sel && c ? ' sel' : '');
      b.dataset.seat = String(i);
      if (!c) { b.innerHTML = '<span class="seat-empty">빈자리</span>'; b.disabled = true; return b; }
      b.innerHTML = `<span class="face"><svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(c.kind)}</svg></span>
        <span class="ticket"><small>${FACE_NAME[c.kind]}</small><b>${RECIPES[c.order].name}</b><span class="patience"><i></i></span></span>`;
      b.setAttribute('aria-label', `${FACE_NAME[c.kind]}: ${RECIPES[c.order].name}`);
      return b;
    }));
  }
  function spawn() {
    const free = seats.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return;
    const i = exam ? 1 : pick(free);
    const wait = exam ? 45 : Math.max(22, 34 - served * 0.8); // 손님을 많이 받을수록 조금씩 급해진다
    seats[i] = { kind: pick(FACES), order: pick(recipeIds), arrived: now(), wait, patience: 1 };
    if (!seats[sel]) sel = i;
    renderSeats();
    sound?.play('job');
  }
  function leave(i) {
    seats[i] = null;
    if (i === sel) { const other = seats.findIndex(Boolean); sel = other >= 0 ? other : sel; }
    renderSeats();
  }

  function serve() {
    const c = seats[sel];
    if (!c) { say('라멘을 낼 손님의 주문표를 먼저 눌러요'); return; }
    if (!Object.keys(bowl.items).length) { say('그릇이 비어 있어요'); return; }
    if (bowlMatches(bowl, c.order)) {
      const pay = servePay(c.patience);
      earned += pay;
      served++;
      say(`${FACE_NAME[c.kind]}: 맛있다~! (+${pay}원)`);
      sound?.play('coin');
      leave(sel);
      if (exam) { if (served >= EXAM_COUNT) finish(true); else nextSpawn = now() + 1.2; }
    } else {
      wrong++;
      sound?.play('none');
      if (exam) { finish(false, `${RECIPES[c.order].name}와 다른 라멘을 냈어요`); return; }
      c.arrived -= c.wait * 0.3; // 틀리면 인내심이 확 줄어든다
      say(`${FACE_NAME[c.kind]}: 이거 주문한 거 아닌데…`);
    }
    bowl = emptyBowl();
    renderBowl();
  }
  function addIngredient(id) {
    if (INGREDIENTS[id].kind === 'noodle') {
      if (pot) { say('냄비에 면이 이미 있어요. 게이지가 초록일 때 냄비를 눌러요'); return; }
      pot = { type: id, start: now() };
      say(`${INGREDIENTS[id].name}을 냄비에 넣었어요. 게이지가 초록이 되면 건져요`);
      sound?.play('click');
      return;
    }
    bowl = addToBowl(bowl, id);
    renderBowl();
    bump(bowlEl);
  }
  function potClick() {
    const st = potState(pot, now());
    if (st === 'empty') say('아래 면 바구니를 누르면 냄비에서 삶아져요');
    else if (st === 'boiling') say('아직 덜 삶아졌어요. 게이지가 초록이 될 때까지 기다려요');
    else if (st === 'soggy') { pot = null; say('면이 퍼져 버렸어요… 버리고 다시 삶아요'); sound?.play('none'); }
    else { bowl = addToBowl(bowl, pot.type); pot = null; renderBowl(); bump(bowlEl); sound?.play('click'); }
  }
  function renderPot(t) {
    const st = potState(pot, t);
    potEl.dataset.state = st;
    const key = `${st}-${pot ? pot.type : ''}`;
    if (key !== potDrawn) { potDrawn = key; potArt.innerHTML = boilerArt(st, pot && pot.type); }
    needle.style.transform = `rotate(${needleAngle(pot, t)}deg)`;
    const label = { empty: '냄비 · 면을 넣어요', boiling: '삶는 중…', ready: '딱 좋아! 눌러서 건지기', soggy: '퍼졌어요… 눌러서 버리기' }[st];
    if (potSay.textContent !== label) potSay.textContent = label;
  }

  function loop() {
    if (!alive) return;
    const t = now();
    // 손님 오기
    if (t >= nextSpawn) {
      if (exam) { if (!seats.some(Boolean) && examLeft > 0) { examLeft--; spawn(); } nextSpawn = Infinity; }
      else { if (t < duration - 10) spawn(); nextSpawn = t + 6 + Math.random() * 4; }
    }
    // 인내심
    counter.querySelectorAll('.seat').forEach((el) => {
      const c = seats[+el.dataset.seat];
      if (!c) return;
      c.patience = 1 - (t - c.arrived) / c.wait;
      const bar = el.querySelector('.patience i');
      bar.style.width = Math.max(0, c.patience) * 100 + '%';
      bar.className = c.patience < 0.3 ? 'low' : c.patience < 0.6 ? 'mid' : '';
    });
    seats.forEach((c, i) => {
      if (!c || c.patience > 0) return;
      missed++;
      say(`${FACE_NAME[c.kind]}가 기다리다 가 버렸어요…`);
      sound?.play('none');
      leave(i);
      if (exam) finish(false, '손님이 기다리다 가 버렸어요');
    });
    renderPot(t);
    // 시간
    if (exam) timerEl.textContent = `손님 ${Math.min(served + 1, EXAM_COUNT)} / ${EXAM_COUNT} · 실수하면 불합격`;
    else {
      const left = Math.max(0, Math.ceil(duration - t));
      timerEl.textContent = `남은 시간 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (t >= duration) finish(true);
    }
    earnEl.textContent = exam ? `낸 그릇 ${served}` : `번 돈 ${earned.toLocaleString('ko-KR')}원`;
    if (sayT && t > sayT) { sayEl.hidden = true; sayT = 0; }
  }

  function finish(completed, reason) {
    if (!alive) return;
    alive = false;
    clearInterval(timer);
    const res = { completed, served, earned, missed, wrong, reason: reason || '' };
    result.hidden = false;
    let title, lines;
    if (exam) {
      title = completed ? '실기 합격!' : '실기 불합격…';
      lines = completed ? ['레시피 북 없이 세 그릇을 실수 없이 냈어요.'] : [reason || '다음에 다시 도전해요.'];
    } else {
      title = completed ? '근무 끝! 수고했어요' : '일찍 마쳤어요';
      lines = [`손님 ${served}명에게 냈어요${missed ? ` · 놓친 손님 ${missed}명` : ''}${wrong ? ` · 잘못 낸 그릇 ${wrong}` : ''}`,
        completed ? '기본급과 번 돈은 가게 주인이 바로 줄 거예요.' : '끝까지 일하지 않아서 기본급은 없어요.'];
    }
    result.innerHTML = '<b></b><div class="lines"></div><button class="btn primary" type="button" data-k="ok">확인</button>';
    result.querySelector('b').textContent = title;
    result.querySelector('.lines').append(...lines.map((l) => { const p = document.createElement('p'); p.textContent = l; return p; }));
    result.querySelector('[data-k="ok"]').focus();
    result.querySelector('[data-k="ok"]').addEventListener('click', () => { wrap.remove(); onEnd?.(res); });
    sound?.play(completed ? 'done' : 'fail');
  }

  wrap.addEventListener('click', (e) => {
    if (!alive) return;
    const seat = e.target.closest('.seat');
    if (seat && !seat.disabled) { sel = +seat.dataset.seat; renderSeats(); return; }
    const ing = e.target.closest('[data-ing]');
    if (ing) { bump(ing); addIngredient(ing.dataset.ing); return; }
    const kEl = e.target.closest('[data-k]'), k = kEl?.dataset.k;
    if (kEl && k !== 'quit') bump(kEl);
    if (k === 'serve') serve();
    else if (k === 'trash') { bowl = emptyBowl(); renderBowl(); say('그릇을 비웠어요'); }
    else if (k === 'pot') potClick();
    else if (k === 'book') book.hidden = false;
    else if (k === 'book-close') book.hidden = true;
    else if (k === 'quit') finish(false, exam ? '시험을 포기했어요' : '');
  });

  sayEl.hidden = true;
  renderSeats();
  renderBowl();
  timer = setInterval(loop, 50);
  loop();
  return { close: () => { alive = false; clearInterval(timer); wrap.remove(); } };
}
