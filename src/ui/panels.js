import { JOB_TYPES, availableJobs, isComplete, payout } from '../core/jobs.js';
import { PAY_MULT, XP_TO_EXAM, EXAM_STREAK, canTakeExam } from '../core/license.js';
import { SHOPS } from '../core/shop.js';
import { MAX_STAMINA } from '../core/state.js';
import { FURNITURE, homeOf } from '../core/home.js';
import { RENT, HOUSE_PRICE, LOTTERY_FEE, LOTTERY_PRICE, RENT_DAY, ANNOUNCE_DAY, EVICT_AFTER, LODGING_PRICE, ROUGH_REST, housingOf } from '../core/housing.js';
import { POCHETTES, THEFT_GUARD, pochetteOf, worn } from '../core/pochette.js';
import { LICENSES, hasLicense, licensesOf, canWorkRamen } from '../core/licenses.js';
import { boardOf, DAILY_JOBS } from '../core/villagers.js';
import { SHIFT_BASE, BOWL_PAY } from '../core/ramen.js';
import { COIN } from './hud.js';
import { recipeCards } from './ramenshop.js';
import { TOOLS, hasTool, lightOf } from '../core/tools.js';
import { exploredCount, N } from '../core/explore.js';
import { timeLabel } from '../core/clock.js';
import { REGION_NAMES, regionAt } from '../core/layout.js';
import { createMapView } from './mapapp.js';

// 마을폰 앱 아이콘
const APP_ICON = {
  sfx: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 16h6l8-7v22l-8-7H8z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M27 14q4 6 0 12M31 10q7 10 0 20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  music: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M16 27V10l15-3v17" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><ellipse cx="12.5" cy="28" rx="5" ry="4" fill="#fff"/><ellipse cx="27.5" cy="25" rx="5" ry="4" fill="#fff"/></svg>',
  exit: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 19 20 8l13 11" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 17v15h18V17" fill="#fff"/><rect x="17" y="23" width="6" height="9" rx="2" fill="#f4a261"/></svg>',
  card: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="10" width="28" height="20" rx="4" fill="#fff"/><circle cx="14" cy="19" r="4" fill="#7fb6e2"/><path d="M9 27q5 -5 10 0" fill="#7fb6e2"/><path d="M22 17h8M22 22h6" stroke="#b9a37a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  map: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 10l9-3 10 3 9-3v23l-9 3-10-3-9 3z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M15 7v23M25 10v23" stroke="#7fb6e2" stroke-width="2.4"/><circle cx="20" cy="17" r="3" fill="#f06a8f"/></svg>'
};

function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'onClick') e.addEventListener('click', v);
    else if (k === 'class') e.className = v;
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  children.flat().forEach((c) => { if (c != null && c !== false) e.append(c); });
  return e;
}
const won = (n) => n.toLocaleString('ko-KR') + '원';
/** 그림(SVG 문자열)이 든 span. */
function svgSpan(cls, html) {
  const e = document.createElement('span');
  e.className = cls;
  e.innerHTML = html;
  return e;
}
/** 창 머리: 기울어진 이름표 제목 + (가게면) 가진 돈 알약. */
const head = (title, money) => h('div', { class: 'panel-head' }, h('h2', {}, title),
  money == null ? null : h('div', { class: 'wallet' }, svgSpan('wallet-ico', COIN), won(money)));

/** 게시판 일감 한 종류의 남은 건수: 하루 몫만큼 동그라미(남은 만큼 채운다) + 글씨. 1건이면 주황, 0건이면 회색 '마감'. */
function leftPill(n, max) {
  const cls = n <= 0 ? ' out' : n === 1 ? ' last' : '';
  const dots = h('span', { class: 'dots', 'aria-hidden': 'true' }, Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
  return h('span', { class: `left-pill${cls}` }, dots, n <= 0 ? '마감' : n === 1 ? '마지막 1건' : `${n}건 남음`);
}

/** 포셰트 그림: 끈(고리) · 몸통 · 덮개 · 단추. 별밤 포셰트는 별 단추. */
function pochetteSvg(id, P) {
  const line = '#5a4431';
  const star = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R;
    return `${(cx + k * Math.cos(a)).toFixed(1)},${(cy + k * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const button = id === 'night'
    ? `<polygon points="${star(32, 44, 7, 3)}" fill="${P.accent}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>`
    : `<circle cx="32" cy="44" r="4.6" fill="${P.accent}" stroke="${line}" stroke-width="2.4"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M15 30Q32 -10 49 30" fill="none" stroke="${line}" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M15 30Q32 -10 49 30" fill="none" stroke="${P.accent}" stroke-width="3" stroke-linecap="round"/>
    <rect x="9" y="25" width="46" height="32" rx="13" fill="${P.color}" stroke="${line}" stroke-width="3"/>
    <path d="M9 38Q9 25 22 25H42Q55 25 55 38Q32 52 9 38Z" fill="${P.color}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 35Q32 43 50 35" fill="none" stroke="${P.accent}" stroke-width="1.8" stroke-dasharray="3 3" stroke-linecap="round"/>
    <ellipse cx="20" cy="31" rx="5" ry="2.4" fill="#fff" opacity="0.45"/>
    ${button}
  </svg>`;
}

/**
 * 게시판(노동 접수), 제초 검정소, 라멘 로우, 가구점, 부동산, 포셰트 가게, 설정 창. (집 안은 ui/homeui.js)
 * handlers: { getState, acceptJob(typeId), quitJob(), reportJob(), startExam(), buy(itemId), toTitle(),
 *   takeLicense(id: 'liquor' | 'arbeiter'), workRamen(),
 *   thumbs() → { 가구id: 그림 URL }, buyFurniture(id),
 *   payRent() (밀린 집세만 · 쫓겨났어도 낼 수 있지만 쫓겨난 건 그대로), rentAgain() (쫓겨난 뒤 밀린 집세 + 이번 주 집세 내고 다시 세 들기),
 *   buyHouse(), applyLottery(), buyByLottery(), dayLabel(day), nextDay(요일) → 그 요일이 오는 날,
 *   buyPochette(id) (사면 바로 멘다), wearPochette(id | null) (null 이면 벗기),
 *   buyTool(id: 'map' | 'lantern' | 'flashlight'), setLight(id) (들 불 고르기), playerPos() → { x, z, yaw }, mapLabels() → [{ x, z, text }],
 *   getSound() → { sfx, music }, toggleSound(kind), onOpen(), onClose() }
 */
export function createPanels(ui, handlers) {
  let current = null; // { kind, extra, backdrop, panel, phone?, status?, view? }
  // 마을폰 화면들: 폰 하나 안에서 화면 내용만 바뀐다
  const PHONE_APPS = ['settings', 'licenses', 'map'];
  // 마을폰을 열 때 받은 것({ storage }). 폰 안에서 화면을 옮겨도 그대로 쓴다
  let phoneExtra = {};

  function show(kind, extra) {
    const phone = PHONE_APPS.includes(kind);
    if (phone && extra) phoneExtra = extra;
    // 폰 안에서 화면만 옮길 때: 폰 틀 · 배경은 그대로 두고 화면 내용만 바꾼다(올라오는 움직임을 다시 하지 않게)
    if (phone && current?.phone) {
      current.kind = kind;
      current.extra = phoneExtra;
      current.phone.dataset.app = kind;
      current.panel.scrollTop = 0;
      render();
      current.panel.querySelector('button')?.focus({ preventScroll: true });
      return;
    }
    close(true);
    current = { kind, extra: phone ? phoneExtra : extra };
    const backdrop = h('div', { class: phone ? 'backdrop phone-backdrop' : 'backdrop' });
    backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) close(); });
    let panel, body;
    if (phone) {
      // 마을폰: 민트 틀 안에 화면(위 상태 줄 · 앱 화면) + 아래 동그란 홈 버튼(누르면 폰을 닫는다)
      body = h('div', { class: 'phone-body' });
      current.status = { time: h('b', { class: 'phone-time' }), date: h('span', { class: 'phone-date' }) };
      panel = h('div', { class: 'panel phone', role: 'dialog', 'aria-modal': 'true', 'aria-label': '마을폰', 'data-app': kind },
        h('div', { class: 'phone-screen' },
          h('div', { class: 'phone-status' }, current.status.time, h('i', { class: 'phone-cam', 'aria-hidden': 'true' }), current.status.date),
          body),
        h('button', { class: 'phone-home', type: 'button', 'aria-label': '폰 닫기', onClick: () => close() }));
      current.phone = panel;
    } else {
      // 테두리는 .panel 에, 스크롤은 .panel-body 에 둔다(스크롤해도 테두리가 따라 움직이지 않게)
      body = h('div', { class: 'panel-body' });
      panel = h('div', { class: `panel panel-${kind}`, role: 'dialog', 'aria-modal': 'true' }, body);
    }
    backdrop.append(panel);
    ui.append(backdrop);
    current.backdrop = backdrop;
    current.panel = body;
    render();
    handlers.onOpen?.();
    // 폰은 아래에서 올라오는 중이라 화면 밖에 있다: 포커스가 화면을 끌어 올리지 않게
    panel.querySelector('button')?.focus({ preventScroll: true });
  }

  /** 지도 화면을 떠날 때 지도(끌기 · 확대 이벤트)를 정리한다. */
  function dropMap() {
    if (!current?.view) return;
    current.view.destroy();
    current.view = null;
  }

  function close(silent) {
    if (!current) return;
    dropMap();
    current.backdrop.remove();
    current = null;
    if (!silent) handlers.onClose?.();
  }

  const closeBtn = () => h('button', { class: 'btn', type: 'button', onClick: () => close() }, '닫기');
  const after = (fn) => () => { fn(); if (current) render(); };
  // 마을폰 앱 화면 위 막대: 홈으로(‹) · 앱 이름 · (지도면) 지금 있는 곳
  const appBar = (title, tag) => h('div', { class: 'phone-bar' },
    h('button', { class: 'phone-back', type: 'button', 'aria-label': '홈으로', onClick: () => show('settings') }, '‹'),
    h('h2', {}, title),
    tag ? h('span', { class: 'phone-tag' }, tag) : null);

  function render() {
    const s = handlers.getState();
    const p = current.panel;
    dropMap();
    // 다시 그려도 스크롤 자리는 그대로(가구 목록에서 사기를 눌러도 위로 튀지 않게)
    const keep = [p, p.querySelector('.cat-list')].map((e) => e && e.scrollTop);
    p.replaceChildren(...BUILD[current.kind](s, current.extra));
    [p, p.querySelector('.cat-list')].forEach((e, i) => { if (e && keep[i]) e.scrollTop = keep[i]; });
    if (!current.phone) return;
    // 폰 상태 줄: 지금 시각 · 날짜
    current.status.time.textContent = timeLabel(s.clock);
    current.status.date.textContent = handlers.dayLabel(s.clock.day);
    // 지도 화면: 지도 칸이 화면에 붙은 뒤에 만든다(칸 크기를 재야 해서)
    const host = p.querySelector('.mapview');
    if (host) current.view = createMapView(host, { explored: s.explored || '', player: handlers.playerPos(), labels: handlers.mapLabels() });
  }

  const BUILD = {
    board(s) {
      const left = boardOf(s, s.clock.day).left;
      const total = Object.values(DAILY_JOBS).reduce((a, b) => a + b, 0), remain = Object.values(left).reduce((a, b) => a + b, 0);
      const out = [head('노동 접수'), h('p', { class: 'sub' }, remain > 0 ? '빠른 사람이 임자! 날이 바뀌면 새 일감이 올라와요.' : '오늘 일감은 다 나갔어요. 날이 바뀌면 새로 올라와요.')];
      // 오늘 남은 일감: 큰 숫자 + 남은 만큼 찬 막대(한눈에 보이게). 적게 남으면 주황, 다 나가면 회색
      const pct = total > 0 ? Math.min(100, Math.round((remain / total) * 100)) : 0;
      out.push(h('div', { class: `board-sum${remain <= 0 ? ' out' : remain / total <= 0.25 ? ' low' : ''}` },
        h('div', { class: 'board-sum-top' },
          h('span', { class: 'lab' }, '남은 일감'), h('b', {}, String(remain)), h('span', { class: 'of' }, `/ ${Math.max(total, remain)}건`)),
        h('div', { class: 'board-bar', role: 'progressbar', 'aria-label': '오늘 남은 일감', 'aria-valuemin': '0', 'aria-valuemax': String(Math.max(total, remain)), 'aria-valuenow': String(remain) },
          h('i', { style: `width: ${pct}%` })),
        h('p', { class: 'who' }, '친구들은 게시판까지 직접 와야 일감을 받아 가요')));
      const mult = PAY_MULT[s.license.grade];
      if (s.job) {
        const type = JOB_TYPES[s.job.typeId], done = isComplete(s.job);
        out.push(h('div', { class: 'row' },
          h('div', {}, h('div', { class: 't' }, type.title), h('div', { class: 'd' }, `진행 ${s.job.count} / ${type.target} · 깔끔하게 ${s.job.clean}번`)),
          done
            ? h('button', { class: 'btn primary', type: 'button', onClick: after(handlers.reportJob) }, `보수 받기 ${won(payout(s.job, s.license.grade))}`)
            : h('button', { class: 'btn', type: 'button', onClick: after(handlers.quitJob) }, '그만두기')));
      } else {
        // 하치와레 안내 중(첫 일감)에는 풀 뽑기만 보여 준다
        const jobs = s.tutorial === 'board' ? [JOB_TYPES.weed8] : availableJobs(s.license.grade);
        jobs.forEach((type) => {
          // 남은 건수는 제목 옆 알약(하루 몫만큼 동그라미)으로 크게
          const n = left[type.id] ?? 0, max = Math.max(DAILY_JOBS[type.id] ?? 0, n);
          out.push(h('div', { class: `row job${n > 0 ? '' : ' soldout'}` },
            h('div', {},
              h('div', { class: 'job-title' }, h('span', { class: 't' }, type.title), leftPill(n, max)),
              h('div', { class: 'd' }, `${won(Math.round(type.base * mult))}부터 · ${type.where}`)),
            h('button', { class: 'btn primary', type: 'button', disabled: n <= 0, onClick: after(() => handlers.acceptJob(type.id)) }, n > 0 ? '받기' : '오늘 마감')));
        });
      }
      // 지금 급수 · 보수 배율과 승급 안내를 각각 다른 줄에(한 줄에 몰리면 읽기 어렵다)
      out.push(h('div', { class: 'row' },
        h('div', {}, h('div', { class: 't' }, `제초 검정 ${s.license.grade}급`), h('div', { class: 'd' }, `보수 ${mult}배`))));
      out.push(h('p', { class: 'note' }, '승급 시험은 동쪽 검정소에서 봐요.'));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    exam(s) {
      const lic = s.license, mult = PAY_MULT[lic.grade];
      const out = [head('검정소', s.money), h('p', { class: 'sub' }, '여러 자격을 따는 곳. 자격이 있으면 할 수 있는 일이 늘어나요.')];
      let examRow;
      if (s.exam) examRow = h('div', { class: 'd' }, `시험 중 · 깔끔하게 연속 ${EXAM_STREAK}번 (지금 ${s.exam.streak}번)`);
      else if (canTakeExam(lic)) examRow = h('button', { class: 'btn pink', type: 'button', onClick: after(handlers.startExam) }, `${lic.grade - 1}급 승급 시험 보기`);
      else if (lic.grade > 1) examRow = h('div', { class: 'd' }, `다음 시험까지 경험치 ${lic.xp} / ${XP_TO_EXAM[lic.grade]}`);
      else examRow = h('div', { class: 'd' }, '최고 급수인 1급이에요!');
      out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, `제초 검정 ${lic.grade}급`), h('div', { class: 'd' }, `보수 ${mult}배 · 깔끔하게 연속 ${EXAM_STREAK}번 뽑으면 승급`)), examRow));
      // 술 자격 · 슈퍼 알바이터: 필기 + 실기
      const INFO = {
        liquor: `필기 ${LICENSES.liquor.questions}문제(${LICENSES.liquor.pass}개 이상, 문제당 ${LICENSES.liquor.seconds}초) + 하이볼 실기 · 쿠리만쥬에게 위스키 강의를 다 듣고 와요`,
        arbeiter: '필기 4문제(3개 이상) + 레시피 북 없이 손님 3명 실기 · 라멘 로우 레시피 북으로 공부해요'
      };
      for (const id of ['liquor', 'arbeiter']) {
        const L = LICENSES[id], own = hasLicense(s, id);
        out.push(h('div', { class: 'row' },
          h('div', {}, h('div', { class: 't' }, L.name), h('div', { class: 'd' }, own ? `${handlers.dayLabel(licensesOf(s)[id].day)}에 땄어요` : INFO[id])),
          own ? h('div', { class: 'd' }, '합격 ✓')
            : h('button', { class: 'btn pink', type: 'button', disabled: s.money < L.fee, onClick: () => { close(true); handlers.takeLicense(id); } }, s.money < L.fee ? `응시료 ${won(L.fee)} 부족` : `시험 보기 ${won(L.fee)}`)));
      }
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    shop(s) {
      const shop = SHOPS.ramen;
      const out = [head(shop.name, s.money), h('p', { class: 'sub' }, `지금 기운 ${s.stamina} / ${MAX_STAMINA}`)];
      shop.items.forEach((item) => {
        const cannot = item.needs && !hasLicense(s, item.needs) ? `${LICENSES[item.needs].name} 필요`
          : s.money < item.price ? '돈이 부족해요' : s.stamina >= MAX_STAMINA ? '배불러요' : null;
        out.push(h('div', { class: 'row' },
          h('div', {}, h('div', { class: 't' }, item.name), h('div', { class: 'd' }, `${won(item.price)} · 기운 +${item.stamina}`)),
          h('button', { class: 'btn primary', type: 'button', disabled: !!cannot, onClick: after(() => handlers.buy(item.id)) }, cannot || '사기')));
      });
      // 알바: 슈퍼 알바이터 자격이 있으면 하루 한 번
      const work = canWorkRamen(s, s.clock.day);
      out.push(h('div', { class: 'row' },
        h('div', {}, h('div', { class: 't' }, '알바하기'), h('div', { class: 'd' }, `근무 3시간 · 기본급 ${won(SHIFT_BASE)} + 한 그릇에 ${won(BOWL_PAY)}~ · 기운 15`)),
        work.ok ? h('button', { class: 'btn pink', type: 'button', disabled: s.stamina < 15, onClick: () => { close(true); handlers.workRamen(); } }, s.stamina < 15 ? '기운이 없어요' : '일하기')
          : h('div', { class: 'd' }, work.reason === 'today' ? '오늘 근무 끝 · 내일 또 와요' : '슈퍼 알바이터 자격 필요')));
      out.push(h('div', { class: 'row' },
        h('div', {}, h('div', { class: 't' }, '레시피 북'), h('div', { class: 'd' }, '라멘 다섯 가지 만드는 법')),
        h('button', { class: 'btn', type: 'button', onClick: () => show('recipes') }, '보기')));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    recipes() {
      return [head('레시피 북'), h('p', { class: 'sub' }, '수프 · 면 · 토핑이 조금씩 달라요. 개수까지 똑같아야 해요!'), recipeCards(),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onClick: () => show('shop') }, '가게로'), closeBtn())];
    },
    // 마을폰 '자격증' 앱(폰 안 화면: 닫기는 아래 홈 버튼)
    licenses(s) {
      const out = [appBar('자격증'), h('p', { class: 'sub' }, `${s.profile.name}의 자격증 지갑`)];
      out.push(h('div', { class: 'row license-card' }, h('div', {}, h('div', { class: 't' }, `제초 검정 ${s.license.grade}급`), h('div', { class: 'd' }, `보수 ${PAY_MULT[s.license.grade]}배`))));
      for (const id of ['liquor', 'arbeiter']) {
        const own = hasLicense(s, id);
        out.push(h('div', { class: `row license-card${own ? '' : ' none'}` },
          h('div', {}, h('div', { class: 't' }, LICENSES[id].name), h('div', { class: 'd' }, own ? `${handlers.dayLabel(licensesOf(s)[id].day)} 취득` : '아직 없어요 · 검정소에서 시험을 봐요'))));
      }
      return out;
    },
    // 동물의 숲 카탈로그처럼: 왼쪽 목록에서 고르면 오른쪽에 크게 보인다
    furniture(s) {
      const home = homeOf(s), thumbs = handlers.thumbs(), list = Object.values(FURNITURE);
      if (!current.sel) current.sel = list[0].id;
      const view = h('div', { class: 'cat-view', 'aria-live': 'polite' });
      const drawView = () => {
        const f = FURNITURE[current.sel], short = s.money < f.price;
        view.replaceChildren(
          thumbs[f.id] ? h('img', { class: 'cat-img', src: thumbs[f.id], alt: `${f.name} 미리보기` }) : h('div', { class: 'cat-img' }),
          h('div', { class: 'cat-name' }, f.name),
          h('div', { class: 'cat-meta' }, `가진 것 ${home.owned[f.id] || 0}개`),
          h('button', { class: 'btn primary', type: 'button', disabled: short, onClick: after(() => handlers.buyFurniture(f.id)) }, short ? '돈이 부족해요' : `${won(f.price)}에 사기`));
      };
      const items = list.map((f) => h('button', {
        class: 'cat-item', type: 'button', 'aria-pressed': String(f.id === current.sel),
        onClick: () => { current.sel = f.id; items.forEach((b, i) => b.setAttribute('aria-pressed', String(list[i].id === f.id))); drawView(); }
      },
      thumbs[f.id] ? h('img', { class: 'thumb', src: thumbs[f.id], alt: '' }) : null,
      h('span', { class: 'nm' }, f.name),
      h('span', { class: 'pr' }, won(f.price))));
      drawView();
      return [
        head('가구점', s.money),
        h('div', { class: 'catalog' }, h('div', { class: 'cat-list' }, items), view),
        h('div', { class: 'actions' }, h('p', { class: 'hint' }, "산 가구는 집에서 '꾸미기'로 놓아요"), closeBtn())
      ];
    },
    realty(s) {
      const hs = housingOf(s), day = s.clock.day;
      const out = [head('부동산', s.money)];
      if (hs.own) {
        out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, '내 집이에요!'), h('div', { class: 'd' }, '이제 집세를 내지 않아요'))));
      } else {
        const rentDay = handlers.dayLabel(handlers.nextDay(RENT_DAY));
        if (hs.evicted) {
          // 쫓겨난 뒤: 밀린 집세 + 이번 주 집세를 내고 다시 세 든다
          const again = hs.unpaid + RENT;
          out.push(h('div', { class: 'row evict' },
            h('div', {}, h('div', { class: 't' }, '집에서 쫓겨났어요'),
              h('div', { class: 'd' }, `집세를 ${EVICT_AFTER}번 연달아 못 내서 집에 들어갈 수 없어요. 밤에는 친구에게 돈을 내고 하룻밤 묵거나(${won(LODGING_PRICE)}) 바닥에서 노숙해야 해요 · 노숙하면 다음 날 기운이 ${ROUGH_REST}만 차요`)),
            h('button', { class: 'btn primary', type: 'button', disabled: s.money < again, onClick: after(handlers.rentAgain) }, `다시 세 들기 ${won(again)}`)));
          out.push(h('p', { class: 'note' }, hs.unpaid > 0
            ? `다시 세 들면 밀린 집세 ${won(hs.unpaid)}과 이번 주 집세 ${won(RENT)}을 함께 내고 집에 다시 들어가요.`
            : `다시 세 들면 이번 주 집세 ${won(RENT)}을 내고 집에 다시 들어가요.`));
          // 밀린 집세만 먼저 갚을 수도 있다(쫓겨난 건 그대로지만, 갚아야 집을 살 수 있다)
          if (hs.unpaid > 0) {
            out.push(h('div', { class: 'row' },
              h('div', {}, h('div', { class: 't' }, '밀린 집세만 내기'), h('div', { class: 'd' }, '내도 쫓겨난 건 그대로예요 · 집을 사려면 먼저 갚아요')),
              h('button', { class: 'btn', type: 'button', disabled: s.money < hs.unpaid, onClick: after(handlers.payRent) }, `${won(hs.unpaid)} 내기`)));
          }
        } else {
          // 지금 사는 집(빌린 집)과 집세
          out.push(h('div', { class: 'row' },
            h('div', {}, h('div', { class: 't' }, '지금은 빌린 집'), h('div', { class: 'd' }, `집세 일주일에 ${won(RENT)} · 다음 집세 ${rentDay}`)),
            hs.unpaid > 0
              ? h('button', { class: 'btn primary', type: 'button', disabled: s.money < hs.unpaid, onClick: after(handlers.payRent) }, `밀린 집세 ${won(hs.unpaid)} 내기`)
              : null));
          // 밀린 집세 경고: 월요일에는 밀린 집세와 그 주 집세를 함께 낸다
          if (hs.unpaid > 0) {
            const lastChance = (hs.missed || 0) + 1 >= EVICT_AFTER;
            out.push(h('p', { class: 'note warn' },
              `${lastChance ? '다음 월요일에 밀린 집세까지 못 내면 집에서 쫓겨나요!' : `집세를 ${EVICT_AFTER}번 연달아 못 내면 집에서 쫓겨나요!`} ${rentDay}에는 밀린 집세와 그 주 집세를 합쳐 ${won(hs.unpaid + RENT)}을 내요.`));
          }
        }
        if (hs.unpaid > 0) out.push(h('p', { class: 'note' }, '밀린 집세가 있으면 집을 살 수 없어요. 먼저 밀린 집세를 내요.'));
        // 돈 모아 사기
        out.push(h('div', { class: 'row' },
          h('div', {}, h('div', { class: 't' }, '집 사기'), h('div', { class: 'd' }, `${won(HOUSE_PRICE)} · 사면 집세가 없어요`)),
          h('button', { class: 'btn pink', type: 'button', disabled: s.money < HOUSE_PRICE || hs.unpaid > 0, onClick: after(handlers.buyHouse) }, s.money < HOUSE_PRICE ? '돈이 부족해요' : '사기')));
        // 청약
        const lot = hs.lottery;
        let lotRow;
        if (!lot) {
          lotRow = h('button', { class: 'btn', type: 'button', disabled: s.money < LOTTERY_FEE, onClick: after(handlers.applyLottery) }, `신청하기 ${won(LOTTERY_FEE)}`);
        } else if (lot.won) {
          lotRow = h('button', { class: 'btn primary', type: 'button', disabled: s.money < LOTTERY_PRICE || hs.unpaid > 0, onClick: after(handlers.buyByLottery) }, `${won(LOTTERY_PRICE)}에 사기`);
        } else {
          lotRow = h('div', { class: 'd' }, `신청 완료 · ${handlers.dayLabel(handlers.nextDay(ANNOUNCE_DAY, lot.applied + 1))} 발표`);
        }
        const lotDesc = lot && lot.won
          ? `당첨! ${handlers.dayLabel(lot.until)}까지 헐값 ${won(LOTTERY_PRICE)}에 살 수 있어요`
          : `매주 수요일 발표 · 당첨되면 ${won(LOTTERY_PRICE)}에 집을 살 수 있어요`;
        out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, '주택 청약'), h('div', { class: 'd' }, lotDesc)), lotRow));
      }
      out.push(h('p', { class: 'note' }, `오늘은 ${handlers.dayLabel(day)}`));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 포셰트 가게: 사면 바로 메고, 가진 포셰트는 바꿔 메거나 벗는다
    pochette(s) {
      const pc = pochetteOf(s), wearing = worn(s);
      const guard = THEFT_GUARD === 0.5 ? '절반만' : `${Math.round(THEFT_GUARD * 100)}%만`;
      const out = [head('포셰트 가게', s.money),
        h('p', { class: 'sub' }, `포셰트 갑옷 씨가 하나하나 손수 만든 포셰트예요. 지갑을 넣어 메고 다니면 모몽가가 소매치기해도 ${guard} 가져가요.`)];
      Object.entries(POCHETTES).forEach(([id, P]) => {
        const own = pc.owned.includes(id), on = wearing === id, short = s.money < P.price;
        let btn;
        if (!own) btn = h('button', { class: 'btn primary', type: 'button', disabled: short, onClick: after(() => handlers.buyPochette(id)) }, short ? '돈이 부족해요' : `${won(P.price)}에 사기`);
        else if (!on) btn = h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.wearPochette(id)) }, '메기');
        else btn = h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.wearPochette(null)) }, '메는 중 · 벗기');
        out.push(h('div', { class: `row pochette${on ? ' worn' : ''}` },
          svgSpan('pochette-art', pochetteSvg(id, P)),
          h('div', {}, h('div', { class: 't' }, P.name), h('div', { class: 'd' }, `${won(P.price)} · ${P.note}${own ? ' · 가지고 있어요' : ''}`)),
          btn));
      });
      out.push(h('p', { class: 'note' }, wearing ? `지금 ${POCHETTES[wearing].name}를 메고 있어요. 지갑이 든든해요!` : '지금은 포셰트를 안 메고 있어요. 소매치기를 당하면 그대로 빼앗겨요.'));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 카니 헌책방: 마을 지도
    books(s) {
      const own = hasTool(s, 'map'), T = TOOLS.map;
      return [head('카니 헌책방', s.money), h('p', { class: 'sub' }, '…오래된 책 냄새. 마을 지도도 있어. 딱딱.'),
        h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, `${won(T.price)} · ${T.note}`)),
          own ? h('div', { class: 'd' }, '가지고 있어요 · 마을폰 지도 앱')
            : h('button', { class: 'btn primary', type: 'button', disabled: s.money < T.price, onClick: after(() => handlers.buyTool('map')) }, s.money < T.price ? '돈이 부족해요' : `${won(T.price)}에 사기`)),
        h('p', { class: 'note' }, '지도가 없어도 다녀온 곳은 기억해요. 지도를 사면 한꺼번에 보여요.'),
        h('div', { class: 'actions' }, closeBtn())];
    },
    // 도구점: 랜턴 · 손전등(4단계에 무기)
    tools(s) {
      const out = [head('도구점', s.money), h('p', { class: 'sub' }, '밤에 마을 밖은 아주 어두워요. 불을 들고 다녀요.')];
      for (const id of ['lantern', 'flashlight']) {
        const T = TOOLS[id], own = hasTool(s, id), held = lightOf(s) === id;
        out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, `${won(T.price)} · ${T.note}`)),
          !own ? h('button', { class: 'btn primary', type: 'button', disabled: s.money < T.price, onClick: after(() => handlers.buyTool(id)) }, s.money < T.price ? '돈이 부족해요' : `${won(T.price)}에 사기`)
            : held ? h('div', { class: 'd' }, '들고 있어요') : h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.setLight(id)) }, '들기')));
      }
      out.push(h('p', { class: 'note' }, '오른쪽 등불 버튼으로 끄고 켜요.'), h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 마을폰 '지도' 앱: 앱 막대 아래를 지도가 꽉 채운다(끌기 · 확대는 mapapp.js 의 createMapView, render 에서 붙인다)
    map(s) {
      const p = handlers.playerPos();
      const pct = Math.round((exploredCount(s.explored || '') / (N * N)) * 100);
      return [appBar('지도', p ? REGION_NAMES[regionAt(p.x, p.z)] : null),
        h('div', { class: 'mapview', role: 'group', 'aria-label': '마을과 바깥 지도. 가 본 곳만 밝게 보여요' }),
        // 좁으면 ' · ' 자리에서만 줄을 바꾼다
        h('p', { class: 'phone-foot' }, h('span', {}, '끌어서 둘러봐요'), ' · ', h('span', {}, '두 손가락이나 휠로 확대'), ' · ', h('b', {}, `가 본 곳 ${pct}%`))];
    },
    // 설정은 동물의 숲 폰처럼: 동그란 앱 아이콘을 누른다
    settings(s, extra) {
      const snd = handlers.getSound();
      const app = (cls, icon, label, onClick, pressed) => h('button', { class: `app ${cls}`, type: 'button', 'aria-pressed': pressed, onClick },
        svgSpan('app-ico', icon), h('span', { class: 'app-label' }, label));
      // 소리 앱은 켜짐 · 꺼짐 글씨 없이 아이콘으로만: 꺼지면 회색 + 빗금(.off)
      const sound = (kind, label) => app(`${kind}${snd[kind] ? '' : ' off'}`, APP_ICON[kind], label,
        after(() => handlers.toggleSound(kind)), String(!!snd[kind]));
      return [
        h('h2', { class: 'phone-title' }, '마을폰'),
        h('div', { class: 'apps' },
          sound('sfx', '효과음'),
          sound('music', '배경음악'),
          hasTool(s, 'map') ? app('map', APP_ICON.map, '지도', () => show('map')) : null,
          app('card', APP_ICON.card, '자격증', () => show('licenses')),
          // 메인(타이틀)으로: 진행은 저장되고, 새로 하고 싶으면 타이틀의 '새로 시작하기'
          app('exit', APP_ICON.exit, '메인으로', () => { close(true); handlers.toTitle(); })),
        // 저장 안내: 폰을 열 때 저장 여부를 받지 못했으면(지도 · 자격증으로 바로 열었을 때) 안 보인다
        extra.storage == null ? null
          : h('p', { class: 'phone-note' }, extra.storage ? '진행은 이 브라우저에 자동 저장돼요' : '이 브라우저는 저장이 꺼져 있어요. 창을 닫으면 진행이 사라져요')
      ];
    }
  };

  return {
    isOpen: () => !!current,
    close: () => close(),
    openBoard: () => show('board'),
    openExam: () => show('exam'),
    openShop: () => show('shop'),
    openLicenses: () => show('licenses'),
    openFurniture: () => show('furniture'),
    openRealty: () => show('realty'),
    openPochette: () => show('pochette'),
    openBooks: () => show('books'),
    openTools: () => show('tools'),
    openMap: () => show('map'),
    openSettings: (extra) => show('settings', extra)
  };
}
