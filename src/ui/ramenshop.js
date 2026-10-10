import { INGREDIENTS, RECIPES, emptyBowl, addToBowl, bowlMatches, potState, servePay, BOIL, SOGGY_AFTER } from '../core/ramen.js';
import { charSvg } from './art.js';
import { bowlSvg, soupPotArt, noodleArt, panArt, boilerArt, TRASH_ART, ingIcon } from './ramenart.js';

const FACES = ['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju'];
const FACE_NAME = { chiikawa: '치이카와', hachiware: '하치와레', usagi: '우사기', momonga: '모몽가', kurimanju: '쿠리만쥬' };
const SOUPS = ['shoyu', 'miso', 'shio', 'tonkotsu'], NOODLES = ['thin', 'thick'];
const TOPS = ['chashu', 'egg', 'nori', 'negi', 'moyashi', 'corn', 'butter', 'garlic'];
const icon = (id) => ingIcon(id, INGREDIENTS[id].kind);

/** 재료 칩(작은 그림 + 이름, 두 개 이상이면 ×n). state: '' | 'have' | 'part' | 'extra' */
function chip(id, n = 1, state = '') {
  const s = document.createElement('span');
  s.className = 'ing-chip' + (state ? ' ' + state : '');
  s.innerHTML = icon(id);
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

/** 냄비 둘레 시간 고리: 삶는 동안 파랑으로 차오르고 → 딱 좋을 때 초록이 줄어들고 → 퍼지면 빨강. */
const RING = 2 * Math.PI * 55;
function ringOf(pot, t) {
  if (!pot) return { color: 'transparent', frac: 0 };
  const e = t - pot.start, boil = BOIL[pot.type];
  if (e < boil) return { color: '#6aa9e0', frac: e / boil, left: boil - e };
  if (e < boil + SOGGY_AFTER) return { color: '#55b877', frac: 1 - (e - boil) / SOGGY_AFTER };
  return { color: '#e9705a', frac: 1 };
}

/**
 * 라멘 로우 주방. mode 'work'(알바: duration 초 동안 손님을 받는다) | 'exam'(슈퍼 알바이터 실기: 손님 3명, 실수하면 불합격, 레시피 북 없음).
 * 화면: 위 노렌(가게 이름 · 남은 시간 · 번 돈) → 주문표 줄 → 왼쪽 위 수프 통 · 왼쪽 아래 면 채반과 냄비 → 가운데 큰 그릇 → 오른쪽 위 토핑 통 · 오른쪽 아래 내기.
 * 알바에서는 그릇 아래에 고른 손님 주문과 그릇을 맞춰 본 칩(들어감 / 아직 / 빼야 함)이 뜬다. 실기에서는 그릇에 든 것만.
 * onEnd({ completed, served, earned, missed, wrong, reason }): 결과 화면에서 '확인'을 누르면.
 */
export function openRamenShop(ui, { mode = 'work', duration = 90, onEnd, sound }) {
  const exam = mode === 'exam';
  const EXAM_COUNT = 3;
  const ing = (id, art) => `<button class="kx-ing" type="button" data-ing="${id}"><span class="art">${art}</span><span class="lab">${INGREDIENTS[id].name}</span></button>`;
  const wrap = document.createElement('div');
  wrap.className = 'backdrop kitchen-wrap';
  wrap.innerHTML = `
    <div class="panel kitchen" role="dialog" aria-label="라멘 로우 주방"><div class="kx">
      <header class="kx-noren">
        <span class="kx-crest" aria-hidden="true">라</span>
        <div class="kx-title"><b>라멘 로우</b><span>${exam ? '실기 시험: 실수 없이 세 그릇' : '오늘의 알바'}</span></div>
        <div class="kx-stats"><span class="kx-timer"></span><span class="kx-earn"></span></div>
        <button class="kx-quit" type="button" data-k="quit">${exam ? '포기하기' : '그만하기'}</button>
      </header>
      <div class="kx-rail"></div>
      <section class="kx-st kx-soups"><h3>수프</h3><div class="kx-grid">${SOUPS.map((id) => ing(id, soupPotArt(id))).join('')}</div></section>
      <section class="kx-st kx-boil"><h3>면</h3><div class="kx-boil-row">
        ${NOODLES.map((id) => ing(id, noodleArt(id))).join('')}
        <button class="kx-pot" type="button" data-k="pot" aria-label="면 삶는 냄비">
          <span class="pot-wrap"><span class="pot-art"></span><svg class="kx-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="55"/><circle class="arc" cx="60" cy="60" r="55" transform="rotate(-90 60 60)"/></svg></span>
          <span class="pot-say"></span></button>
      </div></section>
      <section class="kx-center">
        <p class="kx-say" aria-live="polite"></p>
        <div class="kx-bowl"></div>
        <div class="kx-check"></div>
      </section>
      <section class="kx-st kx-tops"><h3>토핑</h3><div class="kx-grid">${TOPS.map((id) => ing(id, panArt(id))).join('')}</div></section>
      <section class="kx-acts">
        ${exam ? '' : '<button class="kx-small" type="button" data-k="book">레시피 북</button>'}
        <button class="kx-small" type="button" data-k="trash"><span class="ico">${TRASH_ART}</span>그릇 비우기</button>
        <button class="kx-serve" type="button" data-k="serve"><span class="bell" aria-hidden="true"></span>내기!</button>
      </section>
      <div class="k-book" hidden><div class="k-book-head"><b>레시피 북</b><button class="btn" type="button" data-k="book-close">닫기</button></div></div>
      <div class="k-result" hidden></div>
    </div></div>`;
  ui.appendChild(wrap);
  const q = (s) => wrap.querySelector(s);
  const rail = q('.kx-rail'), bowlEl = q('.kx-bowl'), sayEl = q('.kx-say'), timerEl = q('.kx-timer'), earnEl = q('.kx-earn'), checkEl = q('.kx-check');
  const potEl = q('.kx-pot'), potSay = q('.pot-say'), potArt = q('.pot-art'), arc = q('.kx-ring .arc'), book = q('.k-book'), result = q('.k-result');
  arc.setAttribute('stroke-dasharray', RING.toFixed(1));
  book.append(recipeCards());

  const seats = [null, null, null];
  let sel = 0, bowl = emptyBowl(), pot = null, served = 0, earned = 0, missed = 0, wrong = 0, examLeft = EXAM_COUNT;
  let alive = true, timer = 0, nextSpawn = 0.6, sayT = 0, potDrawn = ''; // 손님 · 냄비는 0.05초마다(화면이 안 그려지는 동안에도 시간대로 흐른다)
  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  const recipeIds = Object.keys(RECIPES);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function say(text, ms = 1800) { sayEl.textContent = text; sayEl.hidden = false; sayT = now() + ms / 1000; }
  function renderBowl(drop = null) { bowlEl.innerHTML = bowlSvg(bowl, drop); renderCheck(); }
  /** 그릇 아래 칩: 알바면 고른 주문과 맞춰 보고, 실기면 그릇에 든 것만. */
  function renderCheck() {
    const have = bowl.items, c = seats[sel];
    const chips = [];
    if (!exam && c) {
      const want = RECIPES[c.order].items;
      for (const [id, n] of Object.entries(want)) chips.push(chip(id, n, (have[id] || 0) >= n ? ((have[id] || 0) > n ? 'extra' : 'have') : have[id] ? 'part' : ''));
      for (const [id, n] of Object.entries(have)) if (!want[id]) chips.push(chip(id, n, 'extra'));
    } else for (const [id, n] of Object.entries(have)) chips.push(chip(id, n, 'have'));
    if (!chips.length) {
      const e = document.createElement('span');
      e.className = 'kx-hint';
      e.textContent = exam ? '수프 → 면 → 토핑' : '';
      if (e.textContent) chips.push(e);
    }
    checkEl.replaceChildren(...chips);
  }
  /** 누른 것이 톡 튄다 / 그릇 흔들기 · 날려 보내기. */
  function play(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function renderSeats(fresh = -1) {
    rail.replaceChildren(...seats.map((c, i) => {
      if (!c) { const e = document.createElement('div'); e.className = 'kx-ticket empty'; e.textContent = '빈자리'; return e; }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kx-ticket' + (i === sel ? ' sel' : '') + (i === fresh ? ' new' : '');
      b.dataset.seat = String(i);
      b.innerHTML = `<span class="kx-clip" aria-hidden="true"></span><span class="kx-face"><svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(c.kind)}</svg></span>
        <span class="kx-order"><small></small><b></b></span><span class="kx-pat"><i></i></span>`;
      b.querySelector('small').textContent = FACE_NAME[c.kind];
      b.querySelector('b').textContent = RECIPES[c.order].name;
      b.setAttribute('aria-label', `${FACE_NAME[c.kind]}: ${RECIPES[c.order].name}`);
      return b;
    }));
    renderCheck();
  }
  function spawn() {
    const free = seats.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return;
    const i = exam ? 1 : pick(free);
    const wait = exam ? 45 : Math.max(22, 34 - served * 0.8); // 손님을 많이 받을수록 조금씩 급해진다
    seats[i] = { kind: pick(FACES), order: pick(recipeIds), arrived: now(), wait, patience: 1 };
    if (!seats[sel]) sel = i;
    renderSeats(i);
    sound?.play('job');
  }
  function leave(i) {
    seats[i] = null;
    if (i === sel) { const other = seats.findIndex(Boolean); sel = other >= 0 ? other : sel; }
    renderSeats();
  }

  function serve() {
    const c = seats[sel];
    if (!c) { say('주문표 먼저!'); return; }
    if (!Object.keys(bowl.items).length) { say('그릇이 비어 있어요'); return; }
    if (bowlMatches(bowl, c.order)) {
      const pay = servePay(c.patience);
      earned += pay;
      served++;
      say(`${FACE_NAME[c.kind]}: 맛있다~! (+${pay}원)`);
      sound?.play('coin');
      play(bowlEl, 'out');
      leave(sel);
      bowl = emptyBowl();
      setTimeout(() => { if (alive) { bowlEl.classList.remove('out'); renderBowl(); } }, 460);
      if (exam) { if (served >= EXAM_COUNT) setTimeout(() => finish(true), 500); else nextSpawn = now() + 1.2; }
      return;
    }
    wrong++;
    sound?.play('none');
    play(bowlEl, 'shake');
    if (exam) { finish(false, '주문과 다른 라멘'); return; }
    c.arrived -= c.wait * 0.3; // 틀리면 인내심이 확 줄어든다
    say(`${FACE_NAME[c.kind]}: 이거 주문한 거 아닌데…`);
    bowl = emptyBowl();
    setTimeout(() => { if (alive) renderBowl(); }, 380);
  }
  function addIngredient(id) {
    if (INGREDIENTS[id].kind === 'noodle') {
      if (pot) { say('냄비에 면이 이미 있어요'); return; }
      pot = { type: id, start: now() };
      say('초록일 때 건지기');
      sound?.play('click');
      return;
    }
    bowl = addToBowl(bowl, id);
    renderBowl(id);
    play(bowlEl, 'bump');
  }
  function potClick() {
    const st = potState(pot, now());
    if (st === 'empty') say('면부터 삶아요');
    else if (st === 'boiling') say('아직 덜 삶아졌어요');
    else if (st === 'soggy') { pot = null; say('면이 퍼졌어요…'); sound?.play('none'); }
    else { const type = pot.type; bowl = addToBowl(bowl, type); pot = null; renderBowl(type); play(bowlEl, 'bump'); sound?.play('click'); }
  }
  function renderPot(t) {
    const st = potState(pot, t);
    potEl.dataset.state = st;
    const key = `${st}-${pot ? pot.type : ''}`;
    if (key !== potDrawn) { potDrawn = key; potArt.innerHTML = boilerArt(st, pot && pot.type); }
    const r = ringOf(pot, t);
    arc.setAttribute('stroke', r.color);
    arc.setAttribute('stroke-dashoffset', (RING * (1 - r.frac)).toFixed(1));
    const label = st === 'boiling' ? `삶는 중 ${Math.ceil(r.left)}초` : { empty: '면을 넣어요', ready: '지금 건져요!', soggy: '퍼진 면 버리기' }[st];
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
    rail.querySelectorAll('.kx-ticket[data-seat]').forEach((el) => {
      const c = seats[+el.dataset.seat];
      if (!c) return;
      c.patience = 1 - (t - c.arrived) / c.wait;
      const bar = el.querySelector('.kx-pat i');
      bar.style.width = Math.max(0, c.patience) * 100 + '%';
      bar.className = c.patience < 0.3 ? 'low' : c.patience < 0.6 ? 'mid' : '';
      el.classList.toggle('hurry', c.patience < 0.3);
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
    if (exam) timerEl.textContent = `손님 ${Math.min(served + 1, EXAM_COUNT)} / ${EXAM_COUNT}`;
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
      lines = [`낸 그릇 ${served}`, missed ? `놓친 손님 ${missed}` : '', wrong ? `잘못 낸 그릇 ${wrong}` : '', `팁 포함 ${earned.toLocaleString('ko-KR')}원`,
        completed ? '기본급은 가게 주인이 따로 줘요.' : '끝까지 일하지 않아서 기본급은 없어요.'];
    }
    result.innerHTML = `<div class="k-result-card"><span class="k-result-bowl">${bowlSvg({ items: completed ? { shoyu: 1, thin: 1, chashu: 2, egg: 1, nori: 1, negi: 1 } : {} })}</span><b></b><div class="lines"></div><button class="btn primary" type="button" data-k="ok">확인</button></div>`;
    result.querySelector('b').textContent = title;
    result.querySelector('.lines').append(...lines.filter(Boolean).map((l) => { const p = document.createElement('p'); p.textContent = l; return p; }));
    result.querySelector('[data-k="ok"]').focus();
    result.querySelector('[data-k="ok"]').addEventListener('click', () => { wrap.remove(); onEnd?.(res); });
    sound?.play(completed ? 'done' : 'fail');
  }

  wrap.addEventListener('click', (e) => {
    if (!alive) return;
    const seat = e.target.closest('.kx-ticket[data-seat]');
    if (seat) { sel = +seat.dataset.seat; renderSeats(); return; }
    const ingEl = e.target.closest('[data-ing]');
    if (ingEl) { play(ingEl, 'bump'); addIngredient(ingEl.dataset.ing); return; }
    const kEl = e.target.closest('[data-k]'), k = kEl?.dataset.k;
    if (kEl && k !== 'quit') play(kEl, 'bump');
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
