import { JOB_TYPES, availableJobs, isComplete, payout } from '../core/jobs.js';
import { PAY_MULT, XP_TO_EXAM, EXAM_STREAK, canTakeExam } from '../core/license.js';
import { SHOPS, CHEERS_PRICE, CHEERS_STAMINA, PUB_HOURS } from '../core/shop.js';
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
import { WEED_KINDS, WEED_ORDER, canPullKind, kindsOfGrade, josa } from '../core/weeding.js';
import { weedSvg } from './weedart.js';
import { pochetteSvg, itemSvg, accessorySvg } from './itemart.js';
import { bagOf, itemInfo } from '../core/inventory.js';
import { ACCESSORY_ITEMS, wardrobeOf } from '../core/wardrobe.js';
import { WEAPONS, WEAPON_ORDER, MONSTERS, MONSTER_ORDER, MONSTER_REGIONS, DROPS, weaponOf } from '../core/combat.js';
import { monsterSvg, dropSvg, weaponSvg } from './monsterart.js';
import { QUESTS, QUEST_ORDER, questState, shortGoal, progressOf, isDone, isActive, pickTrack } from '../core/quests.js';
import { FRIENDS, friendOf, hearts, HEART_PTS, MAX_HEARTS, GIFT_HEARTS } from '../core/friends.js';
import { charSvg } from './art.js';

// 마을폰 앱 아이콘
const APP_ICON = {
  sfx: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 16h6l8-7v22l-8-7H8z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M27 14q4 6 0 12M31 10q7 10 0 20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  music: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M16 27V10l15-3v17" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><ellipse cx="12.5" cy="28" rx="5" ry="4" fill="#fff"/><ellipse cx="27.5" cy="25" rx="5" ry="4" fill="#fff"/></svg>',
  exit: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 19 20 8l13 11" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 17v15h18V17" fill="#fff"/><rect x="17" y="23" width="6" height="9" rx="2" fill="#f4a261"/></svg>',
  card: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="10" width="28" height="20" rx="4" fill="#fff"/><circle cx="14" cy="19" r="4" fill="#7fb6e2"/><path d="M9 27q5 -5 10 0" fill="#7fb6e2"/><path d="M22 17h8M22 22h6" stroke="#b9a37a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  map: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 10l9-3 10 3 9-3v23l-9 3-10-3-9 3z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M15 7v23M25 10v23" stroke="#7fb6e2" stroke-width="2.4"/><circle cx="20" cy="17" r="3" fill="#f06a8f"/></svg>',
  // 풀 도감: 펼친 책 위에 새싹
  // 테스트 도구: 스패너
  dev: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M27.5 6.5a7.5 7.5 0 0 0-7.1 9.9L8.6 28.2a3.2 3.2 0 0 0 4.5 4.5l11.8-11.8a7.5 7.5 0 0 0 9.9-7.1l-4.6 2.4-3.9-1.3-1.3-3.9z" fill="#fff"/></svg>',
  weeds: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 14q8-3 15 1q7-4 15-1v18q-8-3-15 1q-7-4-15-1z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M20 15v18" stroke="#8cc46d" stroke-width="2"/><path d="M20 15q-1-6-7-8q0 6 7 8zM20 13q2-6 8-6q-1 6-8 6z" fill="#4f9f58"/></svg>',
  // 설정: 톱니바퀴
  options: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M17.4 5h5.2l.9 4.1a11 11 0 0 1 3 1.7l4-1.3 2.6 4.5-3.1 2.8a11 11 0 0 1 0 3.4l3.1 2.8-2.6 4.5-4-1.3a11 11 0 0 1-3 1.7l-.9 4.1h-5.2l-.9-4.1a11 11 0 0 1-3-1.7l-4 1.3-2.6-4.5 3.1-2.8a11 11 0 0 1 0-3.4l-3.1-2.8 2.6-4.5 4 1.3a11 11 0 0 1 3-1.7z" fill="#fff"/><circle cx="20" cy="20" r="5" fill="#9aa3b5"/></svg>',
  // 퀘스트: 둘둘 만 두루마리
  quests: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="8" width="22" height="25" rx="3" fill="#fff"/><path d="M7 10a4 4 0 0 1 8 0v20a4 4 0 0 1-8 0zM25 30a4 4 0 0 0 8 0" fill="#fff" stroke="#e8a83e" stroke-width="2"/><path d="M15 15h11M15 20h11M15 25h7" stroke="#e8a83e" stroke-width="2.2" stroke-linecap="round"/></svg>',
  // 친구: 하트
  friends: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 33S7 24.6 7 15.4A6.6 6.6 0 0 1 20 12.6a6.6 6.6 0 0 1 13 2.8C33 24.6 20 33 20 33z" fill="#fff"/><path d="M13.5 16a3.4 3.4 0 0 1 3.8-2.6" fill="none" stroke="#f28fb0" stroke-width="2.4" stroke-linecap="round"/></svg>',
  // 몬스터 도감: 뿔 달린 동그란 몬스터 얼굴
  monsters: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 13l-3-7 8 4zM28 13l3-7-8 4z" fill="#fff"/><circle cx="20" cy="22" r="12" fill="#fff"/><ellipse cx="15.5" cy="22" rx="2.2" ry="2.8" fill="#8a6fb0"/><ellipse cx="24.5" cy="22" rx="2.2" ry="2.8" fill="#8a6fb0"/><path d="M12 17l6 2M28 17l-6 2" stroke="#8a6fb0" stroke-width="2" stroke-linecap="round"/><path d="M16 28q4 3 8 0" fill="none" stroke="#8a6fb0" stroke-width="2" stroke-linecap="round"/></svg>'
};
/** 몬스터가 사는 곳(안내서 · 도감). */
const REGION_TEXT = { fields: '동쪽 들판', forest: '서쪽 숲', river: '남쪽 강가', mountain: '북쪽 바위산', night: '밤에 마을 밖 어디든', boss: '바위산 깊은 곳' };

// 안내서 · 검정소의 작은 그림 아이콘(글 대신 한눈에)
export const ICO = {
  pin: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18s-6-6.2-6-10a6 6 0 0 1 12 0c0 3.8-6 10-6 10z" fill="#e8746a"/><circle cx="10" cy="8" r="2.4" fill="#fff"/></svg>',
  moon: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.5 2.5a7.5 7.5 0 1 0 4 12.5A6.5 6.5 0 0 1 13.5 2.5z" fill="#8a6fb0"/></svg>',
  shield: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2l7 2.5v5c0 4.4-3 7.4-7 8.5-4-1.1-7-4.1-7-8.5v-5z" fill="#8fa7c4"/><path d="M10 4.5v11" stroke="#fff" stroke-width="1.6" opacity="0.7"/></svg>',
  heart: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.5S2.5 12.8 2.5 7.6A4 4 0 0 1 10 5.4a4 4 0 0 1 7.5 2.2c0 5.2-7.5 9.9-7.5 9.9z" fill="#f06a8f"/></svg>',
  pen: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="2.5" width="11" height="15" rx="2" fill="#fff" stroke="#9b8466" stroke-width="1.5"/><path d="M6 7h5M6 10h5M6 13h3" stroke="#9b8466" stroke-width="1.4" stroke-linecap="round"/><path d="M15.5 6.5l2 2-6 6-2.6.6.6-2.6z" fill="#f2a65a"/></svg>',
  clock: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10.5" r="7" fill="#fff" stroke="#7fb6e2" stroke-width="2"/><path d="M10 6.5v4.2l2.8 1.8" fill="none" stroke="#5a7fa8" stroke-width="1.8" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 11V6.5a1.3 1.3 0 0 1 2.6 0V10V4.3a1.3 1.3 0 0 1 2.6 0V10V5a1.3 1.3 0 0 1 2.6 0v5.5l.6-1.6a1.3 1.3 0 0 1 2.4 1l-1.8 4.6A5 5 0 0 1 9.4 18H9a4 4 0 0 1-4-4z" fill="#ffd2a8" stroke="#c98a5a" stroke-width="1.1" stroke-linejoin="round"/></svg>',
  book: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 5q4-1.6 7.5.6Q13.5 3.4 17.5 5v11q-4-1.6-7.5.6Q6.5 14.4 2.5 16z" fill="#a9d7c0" stroke="#5e9f80" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 5.6v11" stroke="#5e9f80" stroke-width="1.3"/></svg>',
  coin: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="#fcd95b" stroke="#d9a520" stroke-width="1.6"/><path d="M7 7.5l1.4 5 1.6-3.6 1.6 3.6 1.4-5" fill="none" stroke="#a57412" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#9fdcb7"/><path d="M10 14.5v-8M6.5 9.5 10 6l3.5 3.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l2.2 4.7 5.1.6-3.8 3.5 1 5.1L10 13.9l-4.5 2.5 1-5.1-3.8-3.5 5.1-.6z" fill="#ffc93c" stroke="#d9a520" stroke-width="1" stroke-linejoin="round"/></svg>',
  todo: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="#c9b99a" stroke-width="2" stroke-dasharray="3.2 2.3"/></svg>',
  zap: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 1.8 4 11.2h5l-1.4 7 7.6-9.6h-5z" fill="#ff8a6a" stroke="#d9573f" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#6cc48f"/><path d="M6 10.3l2.7 2.7L14.2 7.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const ico = (name, cls = 'ico') => svgSpan(cls, ICO[name]);
/** 아이콘 + 한 줄 글로 된 짧은 목록(긴 설명 대신). [[아이콘, 글], ...] */
const facts = (list) => h('ul', { class: 'facts' }, list.filter(Boolean).map(([icon, ...text]) => h('li', {}, ico(icon), h('span', {}, ...text))));
/** 값이 적힌 사기 버튼(동전 그림 + 값). 돈이 모자라면 눌리지 않는다. */
const priceBtn = (price, money, onClick, cls = 'btn primary') => h('button', { class: `${cls} price-btn`, type: 'button', disabled: money < price, onClick, 'aria-label': `${won(price)}에 사기${money < price ? ' (돈이 부족해요)' : ''}` },
  svgSpan('coin-ico', COIN), won(price));
/** 동글한 알약 꼬리표: 아이콘 + 글. */
/** 꼬리표 여러 개를 한 줄에(좁으면 꼬리표 단위로 줄을 바꾼다). */
const chipLine = (...chips) => h('div', { class: 'd chip-line' }, ...chips.filter(Boolean));
const chip = (icon, cls, ...text) => h('span', { class: `chip${cls ? ' ' + cls : ''}` }, icon ? (typeof icon === 'string' && ICO[icon] ? ico(icon) : icon) : null, ...text);

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

/** 노동 접수 창에서 고른 탭(마을 일 · 토벌 · 전리품). 창을 다시 열어도 그대로. */
let boardTab = 'work';
/** 스티커 일감 그림: 과일 스티커가 붙은 종이 한 장. */
const STICKER_ART = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="13" y="10" width="38" height="46" rx="5" fill="#fff" stroke="#5a4431" stroke-width="2.4"/><circle cx="25" cy="25" r="7" fill="#f04a60" stroke="#5a4431" stroke-width="2"/><circle cx="40" cy="27" r="6.5" fill="#fcd95b" stroke="#5a4431" stroke-width="2"/><circle cx="31" cy="41" r="7" fill="#8fd16a" stroke="#5a4431" stroke-width="2"/><path d="M25 18v-3M40 20.5v-3" stroke="#5e9f80" stroke-width="2" stroke-linecap="round"/></svg>';
/** 일감 그림: 풀 · 열매는 그 그림, 스티커는 종이, 토벌은 몬스터 얼굴. */
const jobArt = (type) => (type.hunt ? monsterSvg(type.kind) : type.kind === 'sticker' ? STICKER_ART : itemSvg(type.kind));

/** 하트 2개부터 집(동굴)에 놀러 가서 같이 놀 수 있는 친구. */
const HOME_VISIT = new Set(['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'momonga', 'rakko']);

/**
 * 몬스터 카드(토벌 안내서 · 몬스터 도감): 구역마다 머리글 아래 셋씩. 카드에는 얼굴 · 이름 · 공격 방식 · 단단함 · 공격 · 전리품.
 * withCount 면 잡은 수(못 잡았으면 흐리게)와 한 줄 설명. 이야기 속 왕버섯은 만나기 전에는 '???' 로 감춘다.
 */
function monsterCards(s, withCount) {
  const hunted = s.hunted || {};
  const card = (k) => {
    const M = MONSTERS[k], n = hunted[k] || 0, D = DROPS[M.drop];
    const hidden = M.boss && !n && !(s.story && s.story.bossSeen);
    if (hidden) {
      return h('div', { class: 'row mon-card unseen' }, svgSpan('mon-ico mystery', '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="20" fill="#e6d8b8"/><text x="32" y="44" text-anchor="middle" font-size="28" font-weight="700" fill="#b9a37a">?</text></svg>'),
        h('div', {}, h('div', { class: 't' }, '???'), h('div', { class: 'mon-chips' }, chip(null, 'muted', '커다란 무언가가 산다는 소문…'))));
    }
    // 단단함: 몇 대 맞아야 쓰러지는지 방패 다섯 칸으로
    const tough = Math.min(5, Math.ceil(M.hp / 3));
    const shields = h('span', { class: 'tough', 'aria-label': `단단함 ${tough} / 5` }, Array.from({ length: 5 }, (_, i) => h('i', { class: i < tough ? 'on' : '' })));
    return h('div', { class: `row mon-card${withCount && !n ? ' unseen' : ''}` }, svgSpan('mon-ico', monsterSvg(k)),
      h('div', {},
        h('div', { class: 't' }, M.name, withCount ? h('span', { class: 'weed-count' }, n ? `${n}마리 잡음` : '아직 못 잡았어요') : null),
        h('div', { class: 'mon-chips' },
          chip('zap', 'atk-chip', M.atk),
          chip('shield', 'tough-chip', '단단함', shields),
          chip('heart', 'hit', `−${M.dmg}`),
          chip(svgSpan('ico', dropSvg(M.drop)), 'drop', D.name, h('b', {}, won(D.price)))),
        withCount ? h('div', { class: 'd weed-tip' }, M.note) : null));
  };
  const out = [];
  for (const r of MONSTER_REGIONS) {
    const ks = MONSTER_ORDER.filter((k) => MONSTERS[k].region === r);
    if (!ks.length) continue;
    out.push(h('div', { class: `mon-region ${r}` }, ico(r === 'night' ? 'moon' : 'pin'), h('b', {}, REGION_TEXT[r])));
    ks.forEach((k) => out.push(card(k)));
  }
  return out;
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
  const PHONE_APPS = ['settings', 'options', 'licenses', 'map', 'weeds', 'monsters', 'quests', 'friends', 'dev'];
  // 테스트 도구: 마을폰 제목을 빠르게 다섯 번 누르면 켜진다(이 브라우저에 기억)
  const DEV_KEY = 'chiikawa-town-dev';
  const devOn = () => { try { return localStorage.getItem(DEV_KEY) === '1'; } catch { return false; } };
  let titleTaps = [];
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
    // 옷장은 내 캐릭터가 보이게 옆에 붙여 띄운다(어둡게 덮지 않는다)
    const backdrop = h('div', { class: phone ? 'backdrop phone-backdrop' : kind === 'wardrobe' ? 'backdrop side' : 'backdrop' });
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

  // Esc: 가운데 창을 닫는다(주머니에서 칸을 골라 둔 상태면 고르기만 푼다)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !current) return;
    e.preventDefault();
    if (current.kind === 'bag' && current.sel) { current.sel = null; render(); return; }
    close();
  });
  const closeBtn = () => h('button', { class: 'btn', type: 'button', onClick: () => close() }, '닫기');
  const after = (fn) => () => { fn(); if (current) render(); };
  /**
   * 노동 접수 일감 한 줄(장부처럼 줄마다 점선으로 나눈다): 그림 | 이름 + 어디서 | 보수 + 남은 건수 | 받기.
   * 보수는 오른쪽 한 칸에 모아 숫자끼리 줄이 맞게, 남은 건수는 그 밑 작은 글씨로. 다 나가면 흐리게 하고 '마감' 도장.
   */
  function jobRow(type, n, mult) {
    const pay = won(Math.round(type.base * mult));
    return h('div', { class: `job-row${n > 0 ? '' : ' soldout'}` },
      svgSpan('job-art', jobArt(type)),
      h('div', { class: 'job-main' }, h('b', { class: 'job-name' }, type.title), h('span', { class: 'job-where' }, ico('pin'), type.where)),
      h('div', { class: 'job-pay' }, h('b', {}, svgSpan('coin', COIN), `${pay}~`),
        h('small', { class: n === 1 ? 'last' : '' }, n <= 0 ? '오늘 마감' : n === 1 ? '마지막 1건' : `${n}건 남음`)),
      n > 0 ? h('button', { class: 'btn primary take', type: 'button', onClick: after(() => handlers.acceptJob(type.id)) }, '받기')
        : h('span', { class: 'job-stamp' }, '마감'));
  }
  /** 하는 중인 일감: 그림 · 이름 · 진행 막대(동물의 숲 마일 목록처럼) · 깔끔하게 뽑은 수, 다 하면 보수 받기. */
  function jobNow(s) {
    const type = JOB_TYPES[s.job.typeId], done = isComplete(s.job), pct = Math.min(100, Math.round((s.job.count / type.target) * 100));
    return h('div', { class: `job-now${done ? ' done' : ''}` },
      svgSpan('job-art', jobArt(type)),
      h('div', { class: 'job-main' },
        h('span', { class: 'job-kicker' }, done ? '다 했어요!' : '하는 중'),
        h('b', { class: 'job-name' }, type.title),
        h('div', { class: 'job-prog' }, h('i', { class: 'bar' }, h('i', { style: `width: ${pct}%` })), h('b', {}, `${s.job.count} / ${type.target}`)),
        h('span', { class: 'job-where' }, ico('star'), `깔끔하게 ${s.job.clean}번`)),
      done ? h('button', { class: 'btn primary take', type: 'button', onClick: after(handlers.reportJob) }, '보수 받기', h('small', {}, won(payout(s.job, s.license.grade))))
        : h('button', { class: 'btn take quiet', type: 'button', onClick: after(handlers.quitJob) }, '그만두기'));
  }
  /** 전리품 팔기: 가방 칸처럼 네모 칸에 그림, 오른쪽 아래 개수. 밑에 모두 판 값과 버튼. */
  function sellBox(s, drops) {
    const items = bagOf(s).items, total = drops.reduce((a, id) => a + items[id] * DROPS[id].price, 0);
    return h('div', { class: 'sell-box' },
      h('div', { class: 'slots' }, drops.map((id) => h('span', { class: 'slot', title: DROPS[id].name, 'aria-label': `${DROPS[id].name} ${items[id]}개` },
        svgSpan('art', dropSvg(id)), h('em', {}, `×${items[id]}`)))),
      h('div', { class: 'sell-foot' },
        h('span', { class: 'sum' }, '모두 팔면', h('b', {}, svgSpan('coin', COIN), won(total))),
        h('button', { class: 'btn pink take', type: 'button', onClick: after(handlers.sellDrops) }, '모두 팔기')));
  }
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
    if (current.afterRender) { const f = current.afterRender; current.afterRender = null; f(); }
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
      const left = boardOf(s, s.clock.day).left, tutorial = s.tutorial === 'board';
      // 하치와레 안내 중(첫 일감)에는 풀 뽑기만 보여 준다
      const mine = tutorial ? [JOB_TYPES.weed8] : availableJobs(s.license.grade, licensesOf(s));
      const total = mine.reduce((a, j) => a + (DAILY_JOBS[j.id] || 0), 0), remain = mine.reduce((a, j) => a + (left[j.id] || 0), 0);
      const mult = PAY_MULT[s.license.grade];
      const items = bagOf(s).items, drops = Object.keys(DROPS).filter((id) => items[id] > 0);
      const out = [head('노동 접수', s.money)];
      // 오늘 남은 일감: 제목 밑 얇은 막대 한 줄(상자 없이)
      if (!tutorial) {
        const pct = total > 0 ? Math.min(100, Math.round((remain / total) * 100)) : 0;
        out.push(h('div', { class: `board-meter${remain <= 0 ? ' out' : remain / total <= 0.25 ? ' low' : ''}` },
          h('span', { class: 'lab' }, remain > 0 ? '오늘 남은 일감' : '오늘 일감은 다 나갔어요'),
          h('span', { class: 'num' }, h('b', {}, String(remain)), ` / ${Math.max(total, remain)}`),
          h('i', { class: 'bar', role: 'progressbar', 'aria-label': '오늘 남은 일감', 'aria-valuemin': '0', 'aria-valuemax': String(Math.max(total, remain)), 'aria-valuenow': String(remain) },
            h('i', { style: `width: ${pct}%` }))));
      }
      if (s.job) {
        out.push(jobNow(s));
        if (drops.length) out.push(h('h3', { class: 'shop-sec' }, '전리품 팔기'), sellBox(s, drops));
      } else {
        // 탭(몬스터 헌터 퀘스트 카운터 · 동물의 숲 마일 목록처럼): 마을 일 | 토벌 | 전리품 — 한 번에 한 묶음만
        const tabs = [{ id: 'work', label: '마을 일', list: mine.filter((t) => !t.hunt) }];
        const hunts = mine.filter((t) => t.hunt);
        if (hunts.length) tabs.push({ id: 'hunt', label: '토벌', list: hunts });
        if (drops.length && !tutorial) tabs.push({ id: 'sell', label: '전리품', n: drops.reduce((a, id) => a + items[id], 0) });
        if (!tabs.some((t) => t.id === boardTab)) boardTab = 'work';
        if (tabs.length > 1) {
          // 탭 줄은 목록을 내려도 창 위에 붙어 있다(휴대폰에서 다른 탭으로 바로)
          out.push(h('div', { class: 'board-tabs-wrap' }, h('div', { class: 'board-tabs', role: 'tablist' }, tabs.map((t) => {
            const n = t.n ?? t.list.reduce((a, j) => a + (left[j.id] ?? 0), 0);
            return h('button', { class: 'board-tab', type: 'button', role: 'tab', 'aria-selected': String(t.id === boardTab),
              onClick: () => { if (boardTab === t.id) return; boardTab = t.id; render(); current.panel.scrollTop = 0; } },
            t.label, h('span', { class: 'n' }, String(n)));
          }))));
        }
        const tab = tabs.find((t) => t.id === boardTab);
        if (tab.id === 'sell') out.push(sellBox(s, drops));
        else {
          // 마감된 일감은 아래로(받을 수 있는 것부터 보이게, 순서는 그대로)
          const open = (t) => ((left[t.id] ?? 0) > 0 ? 0 : 1);
          out.push(h('div', { class: 'ledger' }, [...tab.list].sort((a, c) => open(a) - open(c)).map((type) => jobRow(type, left[type.id] ?? 0, type.hunt ? 1 : mult))));
        }
      }
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    exam(s) {
      const lic = s.license, mult = PAY_MULT[lic.grade];
      const out = [head('검정소', s.money), h('p', { class: 'sub' }, '자격을 따면 할 수 있는 일이 늘어요')];
      // 자격 한 장: 위 줄에 이름 · 상태(버튼), 아래에 아이콘 한 줄씩
      const card = (art, title, side, lines) => h('div', { class: 'row lic' },
        h('div', { class: 'lic-top' }, svgSpan('lic-ico', art), h('div', { class: 't' }, title), side),
        facts(lines));
      // 제초 검정
      const names = kindsOfGrade(lic.grade).map((k) => WEED_KINDS[k].name).join(', ');
      let side;
      if (s.exam) side = h('span', { class: 'lic-badge going' }, `시험 중 ${s.exam.streak} / ${s.exam.need || 5}번`);
      else if (canTakeExam(lic)) side = h('button', { class: 'btn pink', type: 'button', onClick: after(handlers.startExam) }, `${lic.grade - 1}급 시험 보기`);
      else if (lic.grade <= 1) side = h('span', { class: 'lic-badge done' }, ico('star'), '최고 급수');
      const xpNeed = XP_TO_EXAM[lic.grade];
      out.push(card('<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 33V18" stroke="#5e9f80" stroke-width="3" stroke-linecap="round"/><path d="M20 20q-2-9-11-11q0 9 11 11zM20 17q2-9 11-10q-1 9-11 10z" fill="#8fd16a" stroke="#5e9f80" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 33h20" stroke="#c9a77c" stroke-width="3" stroke-linecap="round"/></svg>', `제초 검정 ${lic.grade}급`, side, [
        ['coin', `보수 ${mult}배`],
        lic.grade > 1 ? ['up', `승급: ${names}`, h('br'), `깔끔하게 연속 ${EXAM_STREAK[lic.grade]}번`] : ['star', '모든 풀을 뽑을 수 있어요'],
        lic.grade > 1 && !s.exam && !canTakeExam(lic) ? ['star', `다음 시험까지 경험치 ${lic.xp} / ${xpNeed}`, h('i', { class: 'xp-bar' }, h('i', { style: `width:${Math.min(100, Math.round((lic.xp / xpNeed) * 100))}%` }))] : null
      ]));
      // 술 자격 · 슈퍼 알바이터 · 토벌: 필기 · 실기 · 준비를 한 줄씩
      const LIC_ART = {
        liquor: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 9h18l-2 22a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="#fff6dc" stroke="#c98a5a" stroke-width="2"/><path d="M12.5 17h15l-1.3 13.5a2 2 0 0 1-2 1.8h-8.4a2 2 0 0 1-2-1.8z" fill="#f2b45a"/><circle cx="17" cy="23" r="1.4" fill="#fff"/><circle cx="22" cy="27" r="1.1" fill="#fff"/></svg>',
        arbeiter: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 19h28a14 13 0 0 1-28 0z" fill="#d9675b"/><path d="M9 19q5-4 11 0t11 0" fill="none" stroke="#fcd95b" stroke-width="2.6" stroke-linecap="round"/><path d="M24 6l-6 13M29 7l-7 12" stroke="#c9a77c" stroke-width="2.4" stroke-linecap="round"/></svg>',
        hunter: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 33 22 19" stroke="#f3a6b8" stroke-width="3.4" stroke-linecap="round"/><path d="M19 15a7 7 0 1 0 6 6" fill="none" stroke="#f3a6b8" stroke-width="3.2" stroke-linecap="round"/><path d="M27 13l4-1M28 18l4 1M22 11l1-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
      };
      const L = LICENSES, test = (id) => ['pen', `필기 ${L[id].questions}문제 중 ${L[id].pass}개 맞히면 합격`, h('br'), `문제당 ${L[id].seconds}초`];
      const LINES = {
        liquor: [test('liquor'), ['hand', '실기: 하이볼 만들기'], ['book', '준비: 쿠리만쥬의 위스키 강의']],
        arbeiter: [test('arbeiter'), ['hand', '실기: 레시피 북 없이 손님 3명'], ['book', '준비: 레시피 북과 면 삶는 시간']],
        hunter: [test('hunter'), ['hand', `실기: 허수아비 ${L.hunter.dummies}개를 ${L.hunter.practical}초 안에`], ['book', '준비: 토벌 안내서'], ['shield', '무기는 빌려줘요']]
      };
      for (const id of ['liquor', 'arbeiter', 'hunter']) {
        const own = hasLicense(s, id);
        const side2 = own ? h('span', { class: 'lic-badge done' }, ico('check'), '합격')
          : h('button', { class: 'btn pink', type: 'button', disabled: s.money < L[id].fee, onClick: () => { close(true); handlers.takeLicense(id); } }, s.money < L[id].fee ? `${won(L[id].fee)} 부족` : `시험 보기 ${won(L[id].fee)}`);
        out.push(card(LIC_ART[id], L[id].name, side2, own ? [['check', `${handlers.dayLabel(licensesOf(s)[id].day)}에 땄어요`]] : LINES[id]));
      }
      out.push(h('div', { class: 'row lic guide-row' },
        h('div', { class: 'lic-top' }, svgSpan('lic-ico', '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 10q8-3 15 1q7-4 15-1v21q-8-3-15 1q-7-4-15-1z" fill="#fff6dc" stroke="#c98a5a" stroke-width="2" stroke-linejoin="round"/><path d="M20 11v21" stroke="#c98a5a" stroke-width="2"/><circle cx="12.5" cy="19" r="4" fill="#8fd16a"/><path d="M10.5 18.5h1M14 18.5h1" stroke="#335" stroke-width="1.4" stroke-linecap="round"/><path d="M23 17h8M23 21h8M23 25h5" stroke="#c9a77c" stroke-width="2" stroke-linecap="round"/></svg>'),
          h('div', {}, h('div', { class: 't' }, '토벌 안내서'), h('div', { class: 'd' }, '몬스터 도감과 규칙')),
          h('button', { class: 'btn', type: 'button', onClick: () => show('guidebook') }, '읽기'))));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 검정소 토벌 안내서: 몬스터 카드 + 규칙(필기 범위)
    guidebook(s) {
      // 지켜야 할 규칙: 그림 + 굵은 한 줄 + 짧은 한 줄짜리 카드 넷(필기 범위)
      const RULE_ART = {
        faint: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 41S7 30.5 7 18.6A9 9 0 0 1 24 13.4a9 9 0 0 1 17 5.2C41 30.5 24 41 24 41z" fill="#f06a8f"/><path d="M25 14l-4 8 6 3-5 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        safe: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 24 24 12l14 12" fill="none" stroke="#5e9f80" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 22v13h20V22" fill="#a9e4cb"/><rect x="21" y="27" width="6" height="8" rx="2" fill="#5e9f80"/><path d="M4 37h40M8 31v9M16 31v9M32 31v9M40 31v9" stroke="#c9a77c" stroke-width="2.6" stroke-linecap="round"/></svg>',
        dodge: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5l5 10 11-3-6 10 9 7-11 2 1 11-9-6-9 6 1-11-11-2 9-7-6-10 11 3z" fill="#ff9a8a"/><path d="M24 15v11" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="32" r="2.6" fill="#fff"/></svg>',
        shop: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18h32l-3 22H11z" fill="#fcd95b" stroke="#d9a520" stroke-width="2" stroke-linejoin="round"/><path d="M17 18v-3a7 7 0 0 1 14 0v3" fill="none" stroke="#d9a520" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="29" r="5" fill="#fff8dc"/><path d="M22 27.5l1 3 1-2 1 2 1-3" fill="none" stroke="#a57412" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      };
      const rule = (art, title, sub) => h('div', { class: 'rule-card' }, svgSpan('rule-ico', RULE_ART[art]), h('div', {}, h('b', {}, title), h('span', {}, sub)));
      return [head('토벌 안내서'), h('p', { class: 'sub' }, '알고 나가면 안전해요!'),
        h('div', { class: 'rule-grid' },
          rule('faint', '맞으면 기운이 줄어요', '0이 되면 기절해서 돈을 조금 잃어요'),
          rule('safe', '마을 안은 안전해요', '울타리 안으로 못 들어와요'),
          rule('dodge', '빨간 표시를 피해요', '곧 그 자리로 공격이 와요'),
          rule('shop', '무기는 도구점에서', '전리품은 노동 접수에서 팔아요')),
        h('h3', { class: 'shop-sec' }, '몬스터'),
        ...monsterCards(s, false),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onClick: () => show('exam') }, '검정소로'), closeBtn())];
    },
    // 마을폰 '퀘스트' 앱: 하는 중인 부탁(화면에 띄울 것 고르기) · 끝낸 부탁
    quests(s) {
      const track = pickTrack(s);
      const face = (kind) => (['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju'].includes(kind)
        ? svgSpan('q-face', `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(kind)}</svg>`)
        : h('span', { class: 'q-face mono', style: `--tag:${FRIENDS[kind].tag};--ink:${FRIENDS[kind].ink}` }, FRIENDS[kind].name.slice(0, 1)));
      const card = (id, kind) => {
        const Q = QUESTS[id], st = questState(s, id), p = kind === 'active' ? progressOf(s, id) : null;
        return h('div', { class: `row q-card ${kind}${Q.story ? ' story' : ''}${id === track ? ' tracked' : ''}` }, face(Q.giver),
          h('div', {},
            h('div', { class: 't' }, Q.title, Q.story ? h('span', { class: 'weed-count' }, '이야기') : null),
            kind === 'active' ? h('div', { class: 'd' }, shortGoal(s, id).goal) : null,
            // 단계 · 진행 · 어디서(괄호 속 안내)는 꼬리표로
            kind === 'active' ? h('div', { class: 'mon-chips' },
              Q.steps.length > 1 ? chip(null, '', `${st.step + 1} / ${Q.steps.length}단계`) : null,
              p ? chip(null, 'done', `${p.have} / ${p.need}`) : null,
              ((Q.steps[st.step].goal.match(/\(([^)]*)\)/) || [])[1]) ? chip('pin', '', Q.steps[st.step].goal.match(/\(([^)]*)\)/)[1]) : null,
              id !== track ? h('button', { class: 'chip chip-btn', type: 'button', onClick: after(() => handlers.trackQuest(id)) }, '▲ 맨 위로') : null) : null,
            kind === 'done' ? h('div', { class: 'd' }, '다 들어줬어요 ✓') : null));
      };
      // 받은 부탁만: 하는 중 · 끝낸 것(아직 안 받은 부탁은 친구 머리 위 ! 로 알게 된다)
      const active = QUEST_ORDER.filter((id) => isActive(s, id)), done = QUEST_ORDER.filter((id) => isDone(s, id));
      const out = [appBar('퀘스트', `끝낸 부탁 ${done.length}`)];
      if (active.length) { out.push(h('h3', { class: 'shop-sec' }, '하는 중')); active.forEach((id) => out.push(card(id, 'active'))); }
      if (done.length) { out.push(h('h3', { class: 'shop-sec' }, '끝낸 부탁')); done.forEach((id) => out.push(card(id, 'done'))); }
      if (!active.length && !done.length) out.push(h('p', { class: 'bag-empty' }, '아직 받은 부탁이 없어요'));
      return out;
    },
    // 마을폰 '친구' 앱: 마을 친구마다 하트 · 다음 하트까지 · 오늘 이야기했는지 · 놀았는지 · 선물 · 빌린 돈
    friends(s) {
      const today = s.clock.day, kinds = Object.keys(FRIENDS);
      const total = kinds.reduce((a, k) => a + hearts(friendOf(s, k)), 0);
      const HEART = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.5S2.5 12.8 2.5 7.6A4 4 0 0 1 10 5.4a4 4 0 0 1 7.5 2.2c0 5.2-7.5 9.9-7.5 9.9z"/></svg>';
      const face = (kind) => (['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju'].includes(kind)
        ? svgSpan('q-face', `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(kind)}</svg>`)
        : h('span', { class: 'q-face mono', style: `--tag:${FRIENDS[kind].tag};--ink:${FRIENDS[kind].ink}` }, FRIENDS[kind].name.slice(0, 1)));
      const out = [appBar('친구', `하트 ${total}개`), h('p', { class: 'sub' }, '하루 한 번씩 하트가 늘어요')];
      // 하트 많은 친구부터(같으면 원래 순서)
      kinds.map((k, i) => ({ k, i, f: friendOf(s, k) })).sort((a, b) => b.f.pts - a.f.pts || a.i - b.i).forEach(({ k, f }) => {
        const F = FRIENDS[k], hc = hearts(f), full = hc >= MAX_HEARTS, into = f.pts % HEART_PTS;
        const talked = f.talk === today, played = f.play === today;
        // 오늘 한 일(이야기 · 놀기)은 체크 / 빈 동그라미로, 선물 · 빌린 돈은 짧은 꼬리표로
        const chips = [
          h('span', { class: 'chip-lab' }, '오늘'),
          chip(talked ? 'check' : 'todo', talked ? 'done' : 'todo', '이야기'),
          F.play ? chip(played ? 'check' : 'todo', played ? 'done' : 'todo', '놀기') : null,
          k === 'kurimanju' ? chip(f.drink === today ? 'check' : 'todo', f.drink === today ? 'done' : 'todo', '건배') : null,
          HOME_VISIT.has(k) && hc >= 2 ? chip(f.home === today ? 'check' : 'todo', f.home === today ? 'done' : 'todo', '집에서') : null,
          F.gift && FURNITURE[F.gift] ? (f.gift ? chip('check', 'done', `선물 ${FURNITURE[F.gift].name}`) : chip('heart', 'gift', `${GIFT_HEARTS}개면 ${FURNITURE[F.gift].name} 선물`)) : null,
          f.debt ? chip('coin', 'debt', `빌린 돈 ${won(f.debt)}`) : null
        ];
        out.push(h('div', { class: `row f-card${f.pts ? '' : ' new'}` }, face(k),
          h('div', {},
            h('div', { class: 't' }, F.name,
              h('span', { class: 'f-hearts', role: 'img', 'aria-label': `하트 ${hc} / ${MAX_HEARTS}` }, Array.from({ length: MAX_HEARTS }, (_, i) => svgSpan(`f-heart${i < hc ? ' on' : ''}`, HEART)))),
            h('div', { class: 'f-next' }, full ? '하트가 가득해요!' : f.pts ? `다음 하트까지 ${HEART_PTS - into}` : '아직 친해지지 않았어요',
              full ? null : h('span', { class: 'q-bar' }, h('i', { style: `width:${Math.round((into / HEART_PTS) * 100)}%` }))),
            h('div', { class: 'mon-chips' }, chips))));
      });
      return out;
    },
    // 마을폰 '몬스터 도감' 앱: 만난(잡은) 몬스터와 잡은 수
    monsters(s) {
      const caught = MONSTER_ORDER.filter((k) => (s.hunted || {})[k] > 0).length;
      return [appBar('몬스터 도감', `${caught} / ${MONSTER_ORDER.length}종`),
        ...monsterCards(s, true)];
    },
    shop(s) {
      const shop = SHOPS.ramen;
      const out = [head(shop.name, s.money), h('p', { class: 'sub' }, `지금 기운 ${s.stamina} / ${MAX_STAMINA}`)];
      shop.items.forEach((item) => {
        const lock = item.needs && !hasLicense(s, item.needs), full = s.stamina >= MAX_STAMINA;
        out.push(h('div', { class: 'row' },
          h('div', {}, h('div', { class: 't' }, item.name), h('div', { class: 'd' }, `기운 +${item.stamina}`)),
          lock ? h('span', { class: 'lic-badge' }, '자격증 필요') : full ? h('span', { class: 'lic-badge' }, '배불러요')
            : priceBtn(item.price, s.money, after(() => handlers.buy(item.id)))));
      });
      // 알바: 슈퍼 알바이터 자격이 있으면 하루 한 번
      const work = canWorkRamen(s, s.clock.day);
      out.push(h('div', { class: 'row' },
        h('div', {}, h('div', { class: 't' }, '알바하기'), chipLine(chip('clock', '', '3시간'), chip('coin', '', `${won(SHIFT_BASE)} + 그릇당 ${won(BOWL_PAY)}~`))),
        work.ok ? h('button', { class: 'btn pink', type: 'button', disabled: s.stamina < 15, onClick: () => { close(true); handlers.workRamen(); } }, s.stamina < 15 ? '기운이 없어요' : '일하기')
          : h('span', { class: 'lic-badge' }, work.reason === 'today' ? '오늘 근무 끝' : '자격증 필요')));
      out.push(h('div', { class: 'row' },
        h('div', {}, h('div', { class: 't' }, '레시피 북'), h('div', { class: 'd' }, '라멘 다섯 가지')),
        h('button', { class: 'btn', type: 'button', onClick: () => show('recipes') }, '보기')));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 맥주집: 생맥주(술 자격증) · 풋콩, 저녁에 와 있는 쿠리만쥬와 건배(하루 한 번 · 하트 +2)
    pub(s) {
      const shop = SHOPS.pub, info = handlers.pubInfo ? handlers.pubInfo() : { here: false, cheered: false };
      const ART = {
        beer: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="12" width="17" height="22" rx="3" fill="#f6c453" stroke="#c98a2a" stroke-width="2"/><path d="M26 16h3a4 4 0 0 1 0 12h-3" fill="none" stroke="#c98a2a" stroke-width="2.6"/><path d="M8 13q0-6 5-6q2-3 5-1q4-2 6 1q4 0 4 5z" fill="#fff" stroke="#d9cbb0" stroke-width="1.4"/><path d="M14 18v11M20 18v11" stroke="#ffe08a" stroke-width="2" stroke-linecap="round"/></svg>',
        edamame: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 27q4-15 17-18q7-1 7 4q-2 13-18 17q-6 1-6-3z" fill="#9fd36a" stroke="#5e9f40" stroke-width="2"/><circle cx="14" cy="24" r="3.4" fill="#c4ea8e"/><circle cx="20" cy="19" r="3.6" fill="#c4ea8e"/><circle cx="26" cy="14" r="3.2" fill="#c4ea8e"/></svg>'
      };
      const out = [head(shop.name, s.money), h('p', { class: 'sub' }, `지금 기운 ${s.stamina} / ${MAX_STAMINA}`)];
      shop.items.forEach((item) => {
        const lock = item.needs && !hasLicense(s, item.needs), full = s.stamina >= MAX_STAMINA;
        out.push(h('div', { class: 'row pub-row' }, svgSpan('lic-ico', ART[item.id]),
          h('div', {}, h('div', { class: 't' }, item.name), h('div', { class: 'd' }, `기운 +${item.stamina}`)),
          lock ? h('span', { class: 'lic-badge' }, '자격증 필요') : full ? h('span', { class: 'lic-badge' }, '배불러요')
            : priceBtn(item.price, s.money, after(() => handlers.buy(item.id, 'pub')))));
      });
      // 쿠리만쥬와 건배
      const lic = hasLicense(s, 'liquor');
      const side = !lic ? h('span', { class: 'lic-badge' }, '술 자격증 필요')
        : !info.here ? h('span', { class: 'lic-badge' }, `저녁 ${PUB_HOURS[0]} ~ ${PUB_HOURS[1]}시`)
          : info.cheered ? h('span', { class: 'lic-badge done' }, ico('check'), '오늘 건배함')
            : priceBtn(CHEERS_PRICE, s.money, () => { close(true); handlers.cheers(); }, 'btn pink');
      out.push(h('div', { class: `row pub-row cheers${info.here ? ' here' : ''}` },
        svgSpan('q-face', `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg('kurimanju')}</svg>`),
        h('div', {}, h('div', { class: 't' }, '쿠리만쥬와 건배'),
          h('div', { class: 'mon-chips' }, chip('heart', 'gift', '하트 +2'), chip(null, '', `기운 +${CHEERS_STAMINA}`))),
        side));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    recipes() {
      return [head('레시피 북'), h('p', { class: 'sub' }, '개수까지 똑같이 만들어요'), recipeCards(),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onClick: () => show('shop') }, '가게로'), closeBtn())];
    },
    // 마을폰 '자격증' 앱(폰 안 화면: 닫기는 아래 홈 버튼)
    licenses(s) {
      const out = [appBar('자격증')];
      out.push(h('div', { class: 'row license-card' }, h('div', {}, h('div', { class: 't' }, `제초 검정 ${s.license.grade}급`), chipLine(chip('coin', '', `보수 ${PAY_MULT[s.license.grade]}배`), chip('check', '', `풀 ${WEED_ORDER.filter((k) => canPullKind(s.license.grade, k)).length}종 뽑기`)))));
      for (const id of ['liquor', 'arbeiter', 'hunter']) {
        const own = hasLicense(s, id);
        out.push(h('div', { class: `row license-card${own ? '' : ' none'}` },
          h('div', {}, h('div', { class: 't' }, LICENSES[id].name), h('div', { class: 'd' }, own ? `${handlers.dayLabel(licensesOf(s)[id].day)} 취득` : '아직 없어요'))));
      }
      return out;
    },
    // 동물의 숲 카탈로그처럼: 왼쪽 목록에서 고르면 오른쪽에 크게 보인다
    furniture(s) {
      const home = homeOf(s), thumbs = handlers.thumbs(), list = Object.values(FURNITURE);
      if (!current.sel) current.sel = list[0].id;
      const view = h('div', { class: 'cat-view', 'aria-live': 'polite' });
      const drawView = () => {
        const f = FURNITURE[current.sel];
        view.replaceChildren(
          thumbs[f.id] ? h('img', { class: 'cat-img', src: thumbs[f.id], alt: `${f.name} 미리보기` }) : h('div', { class: 'cat-img' }),
          h('div', { class: 'cat-name' }, f.name),
          h('div', { class: 'cat-meta' }, `가진 것 ${home.owned[f.id] || 0}개`),
          priceBtn(f.price, s.money, after(() => handlers.buyFurniture(f.id))));
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
            h('div', {}, h('div', { class: 't' }, '쫓겨났어요'),
              h('div', { class: 'd' }, `밤엔 친구 집(${won(LODGING_PRICE)})이나 노숙`)),
            h('button', { class: 'btn primary', type: 'button', disabled: s.money < again, onClick: after(handlers.rentAgain) }, `다시 세 들기 ${won(again)}`)));
          // 밀린 집세만 먼저 갚을 수도 있다(쫓겨난 건 그대로지만, 갚아야 집을 살 수 있다)
          if (hs.unpaid > 0) {
            out.push(h('div', { class: 'row' },
              h('div', {}, h('div', { class: 't' }, '밀린 집세만 내기'), h('div', { class: 'd' }, '갚아야 집을 살 수 있어요')),
              h('button', { class: 'btn', type: 'button', disabled: s.money < hs.unpaid, onClick: after(handlers.payRent) }, `${won(hs.unpaid)} 내기`)));
          }
        } else {
          // 지금 사는 집(빌린 집)과 집세
          out.push(h('div', { class: 'row' },
            h('div', {}, h('div', { class: 't' }, '빌린 집'), h('div', { class: 'mon-chips' }, chip('coin', '', `집세 ${won(RENT)} / 주`), chip(null, '', `다음 ${rentDay}`))),
            hs.unpaid > 0
              ? h('button', { class: 'btn primary', type: 'button', disabled: s.money < hs.unpaid, onClick: after(handlers.payRent) }, `밀린 집세 ${won(hs.unpaid)} 내기`)
              : null));
          // 밀린 집세 경고: 월요일에는 밀린 집세와 그 주 집세를 함께 낸다
          if (hs.unpaid > 0) {
            const lastChance = (hs.missed || 0) + 1 >= EVICT_AFTER;
            out.push(h('p', { class: 'note warn' }, lastChance ? '다음 월요일에 못 내면 쫓겨나요!' : `${EVICT_AFTER}번 연달아 못 내면 쫓겨나요!`));
          }
        }
        // 돈 모아 사기
        out.push(h('div', { class: 'row' },
          h('div', {}, h('div', { class: 't' }, '집 사기'), h('div', { class: 'd' }, '집세가 없어져요')),
          hs.unpaid > 0 ? h('span', { class: 'lic-badge' }, '밀린 집세부터') : priceBtn(HOUSE_PRICE, s.money, after(handlers.buyHouse), 'btn pink')));
        // 청약
        const lot = hs.lottery;
        let lotRow;
        if (!lot) {
          lotRow = h('button', { class: 'btn', type: 'button', disabled: s.money < LOTTERY_FEE, onClick: after(handlers.applyLottery) }, `신청하기 ${won(LOTTERY_FEE)}`);
        } else if (lot.won) {
          lotRow = h('button', { class: 'btn primary', type: 'button', disabled: s.money < LOTTERY_PRICE || hs.unpaid > 0, onClick: after(handlers.buyByLottery) }, `${won(LOTTERY_PRICE)}에 사기`);
        } else {
          lotRow = h('div', { class: 'd' }, '신청 완료', h('br'), `${handlers.dayLabel(handlers.nextDay(ANNOUNCE_DAY, lot.applied + 1))} 발표`);
        }
        const lotDesc = lot && lot.won
          ? h('div', { class: 'd' }, `당첨! ${handlers.dayLabel(lot.until)}까지`)
          : chipLine(chip('clock', '', '수요일 발표'), chip('coin', '', `당첨되면 ${won(LOTTERY_PRICE)}`));
        out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, '주택 청약'), lotDesc), lotRow));
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
        h('p', { class: 'sub' }, `메고 다니면 소매치기 피해 ${guard}`)];
      Object.entries(POCHETTES).forEach(([id, P]) => {
        const own = pc.owned.includes(id), on = wearing === id;
        let btn;
        if (!own) btn = priceBtn(P.price, s.money, after(() => handlers.buyPochette(id)));
        else if (!on) btn = h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.wearPochette(id)) }, '메기');
        else btn = h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.wearPochette(null)) }, '벗기');
        out.push(h('div', { class: `row pochette${on ? ' worn' : ''}` },
          svgSpan('pochette-art', pochetteSvg(id, P)),
          h('div', {}, h('div', { class: 't' }, P.name, on ? h('span', { class: 'weed-count' }, '메는 중') : null), h('div', { class: 'd' }, P.note)),
          btn));
      });
      // 꾸미기 소품: 사면 바로 달고, 집 옷장에서 바꿔 단다
      const wd = wardrobeOf(s);
      out.push(h('h3', { class: 'shop-sec' }, '꾸미기 소품'));
      Object.entries(ACCESSORY_ITEMS).forEach(([id, A]) => {
        const own = wd.owned.includes(id);
        out.push(h('div', { class: 'row pochette' }, svgSpan('pochette-art', accessorySvg(id)),
          h('div', {}, h('div', { class: 't' }, A.name), h('div', { class: 'd' }, A.note)),
          own ? h('span', { class: 'lic-badge done' }, ico('check'), wd.wear === id ? '다는 중' : '가짐')
            : priceBtn(A.price, s.money, after(() => handlers.buyAccessory(id)))));
      });
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 주머니(동물의 숲처럼): 동그란 칸이 줄지어 있고, 칸을 누르면 이름 말풍선과 할 일 메뉴(먹기 · 들기 · 버리기)
    bag(s) {
      const b = bagOf(s), wp = weaponOf(s);
      const KIND_ORDER = { herb: 0, food: 1, drop: 2, quest: 3 };
      const order = (id) => { const w = WEED_ORDER.indexOf(id); return w >= 0 ? w : 50 + Object.keys(DROPS).indexOf(id); };
      const items = Object.keys(b.items).filter((id) => b.items[id] > 0 && itemInfo(id))
        .sort((a, c) => (KIND_ORDER[itemInfo(a).kind] ?? 9) - (KIND_ORDER[itemInfo(c).kind] ?? 9) || order(a) - order(c));
      const weapons = [...wp.owned].sort((a, c) => WEAPON_ORDER.indexOf(a) - WEAPON_ORDER.indexOf(c));
      const slots = [...weapons.map((id) => ({ type: 'weapon', id })), ...items.map((id) => ({ type: 'item', id }))];
      const SLOTS = Math.max(30, Math.ceil(slots.length / 10) * 10);
      const same = (a, c) => a && c && a.type === c.type && a.id === c.id;
      if (current.sel && !slots.some((x) => same(x, current.sel))) current.sel = null;
      const sel = current.sel;
      const pick = (slot) => { current.sel = same(slot, current.sel) ? null : slot; render(); };
      const nameOf = (x) => (x.type === 'weapon' ? WEAPONS[x.id].name : itemInfo(x.id).name);
      const artOf = (x) => (x.type === 'weapon' ? weaponSvg(x.id) : itemSvg(x.id));
      const grid = h('div', { class: 'pocket-grid', role: 'grid', 'aria-label': '주머니 칸' },
        Array.from({ length: SLOTS }, (_, i) => {
          const x = slots[i];
          if (!x) return h('span', { class: 'pocket-slot empty', 'aria-hidden': 'true' });
          const n = x.type === 'item' ? b.items[x.id] : 0, held = x.type === 'weapon' && wp.held === x.id;
          const btn = h('button', { class: `pocket-slot${same(x, sel) ? ' on' : ''}${held ? ' held' : ''}`, type: 'button', 'data-slot': String(i),
            'aria-label': `${nameOf(x)}${n > 1 ? ` ${n}개` : ''}${held ? ' (들고 있음)' : ''}`, 'aria-pressed': String(same(x, sel)), onClick: () => pick(x) },
          svgSpan('pocket-ico', artOf(x)),
          n > 1 ? h('b', { class: 'pocket-cnt' }, String(n)) : null,
          held ? h('i', { class: 'pocket-held', 'aria-hidden': 'true' }, '✋') : null);
          // 마우스를 올리면 그 칸 위에 이름 말풍선
          btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showHover(btn, x); });
          btn.addEventListener('pointerleave', () => { hover.hidden = true; });
          return btn;
        }));
      const hover = h('div', { class: 'pocket-name hover', 'aria-hidden': 'true' });
      hover.hidden = true;
      const wrap = h('div', { class: 'pocket' }, grid, hover);
      function showHover(btn, x) {
        if (same(x, current.sel)) { hover.hidden = true; return; } // 고른 칸은 이미 이름이 떠 있다
        const W = wrap.getBoundingClientRect(), r = btn.getBoundingClientRect();
        hover.textContent = nameOf(x);
        hover.style.left = `${r.left - W.left + r.width / 2}px`;
        hover.style.top = `${r.top - W.top - 6}px`;
        hover.hidden = false;
      }
      // 고른 칸: 위에 이름 말풍선, 옆에 할 일 메뉴
      if (!slots.length) wrap.append(h('p', { class: 'pocket-empty' }, '주머니가 비어 있어요'));
      if (sel) {
        const n = sel.type === 'item' ? b.items[sel.id] : 1, inf = sel.type === 'item' ? itemInfo(sel.id) : null;
        const canDrop = handlers.canDrop ? handlers.canDrop() : true;
        const act = (label, fn, opts = {}) => h('button', { class: `pocket-act${opts.main ? ' main' : ''}`, type: 'button', disabled: !!opts.disabled, onClick: () => { current.sel = null; fn(); if (current) render(); } }, label);
        const acts = [];
        if (inf && inf.eat) acts.push(act(s.stamina >= MAX_STAMINA ? '배불러요' : '먹기', () => handlers.eatItem(sel.id), { main: true, disabled: s.stamina >= MAX_STAMINA }));
        if (sel.type === 'weapon') acts.push(wp.held === sel.id ? act('넣어 두기', () => handlers.holdWeapon(null)) : act('들기', () => handlers.holdWeapon(sel.id), { main: true }));
        if (!canDrop) acts.push(act('밖에서만 버릴 수 있어요', () => {}, { disabled: true }));
        else if (n > 1) { acts.push(act('한 개 버리기', () => handlers.dropItem(sel, 1))); acts.push(act(`모두 버리기 (${n}개)`, () => handlers.dropItem(sel, n))); }
        else acts.push(act('버리기', () => handlers.dropItem(sel, 1)));
        acts.push(act('그만두기', () => {}));
        wrap.append(h('div', { class: 'pocket-name', role: 'status' }, nameOf(sel)), h('div', { class: 'pocket-menu', role: 'menu' }, acts));
        // 그린 뒤에 말풍선 · 메뉴를 고른 칸 옆에 붙인다(칸 자리를 재야 해서)
        current.afterRender = () => {
          const slot = wrap.querySelector('.pocket-slot.on'), menu = wrap.querySelector('.pocket-menu'), bubble = wrap.querySelector('.pocket-name');
          if (!slot || !menu) return;
          const W = wrap.getBoundingClientRect(), r = slot.getBoundingClientRect();
          const left = r.left - W.left, top = r.top - W.top;
          bubble.style.left = `${left + r.width / 2}px`;
          bubble.style.top = `${top - 6}px`;
          // 칸 오른쪽 → 왼쪽 → (좁은 화면) 칸 아래, 아래가 모자라면 이름 말풍선 위
          const mw = menu.offsetWidth, mh = menu.offsetHeight;
          let mx = left + r.width + 8, my = Math.max(4, Math.min(W.height - mh - 4, top + r.height / 2 - mh / 2));
          if (mx + mw > W.width - 4) {
            if (left - mw - 8 >= 4) mx = left - mw - 8;
            else {
              mx = Math.max(4, Math.min(W.width - mw - 4, left + r.width / 2 - mw / 2));
              my = top + r.height + 10;
              if (my + mh > W.height - 4) my = top - mh - 34;
            }
          }
          menu.style.left = `${mx}px`;
          menu.style.top = `${my}px`;
          menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
        };
      }
      return [head('주머니', s.money), wrap,
        h('div', { class: 'actions' }, h('p', { class: 'hint' }, `${slots.length} / ${SLOTS}칸`), closeBtn())];
    },
    // 집 옷장: 가진 포셰트 · 소품을 골라 바로 바꿔 단다(집 안의 내 캐릭터가 바로 바뀐다)
    wardrobe(s) {
      const pc = pochetteOf(s), wd = wardrobeOf(s);
      const tile = (on, art, name, fn) => h('button', { class: 'bag-tile', type: 'button', 'aria-pressed': String(on), onClick: after(fn) }, svgSpan('bag-ico', art), h('span', { class: 'nm' }, name));
      const none = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="16" fill="none" stroke="#b9a37a" stroke-width="4"/><path d="M21 43L43 21" stroke="#b9a37a" stroke-width="4" stroke-linecap="round"/></svg>';
      const out = [head('옷장'), h('p', { class: 'sub' }, '고르면 바로 바뀌어요')];
      out.push(h('h3', { class: 'shop-sec' }, '포셰트'));
      out.push(h('div', { class: 'bag-grid' }, tile(!pc.wear, none, '안 메기', () => handlers.wearPochette(null)),
        pc.owned.map((id) => tile(pc.wear === id, pochetteSvg(id, POCHETTES[id]), POCHETTES[id].name, () => handlers.wearPochette(id)))));
      out.push(h('h3', { class: 'shop-sec' }, '머리 장식'));
      out.push(h('div', { class: 'bag-grid' }, tile(wd.wear === 'none', none, '안 달기', () => handlers.wearAccessory('none')),
        wd.owned.map((id) => tile(wd.wear === id, accessorySvg(id), ACCESSORY_ITEMS[id].name, () => handlers.wearAccessory(id)))));
      if (!pc.owned.length && !wd.owned.length) out.push(h('p', { class: 'note' }, '포셰트 가게에서 사 와요'));
      out.push(h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', onClick: () => close() }, '다 골랐어요')));
      return out;
    },
    // 카니 헌책방: 마을 지도
    books(s) {
      const own = hasTool(s, 'map'), T = TOOLS.map;
      return [head('카니 헌책방', s.money), h('p', { class: 'sub' }, '…딱딱.'),
        h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, T.note)),
          own ? h('span', { class: 'lic-badge done' }, ico('check'), '가짐')
            : priceBtn(T.price, s.money, after(() => handlers.buyTool('map')))),
        h('div', { class: 'actions' }, closeBtn())];
    },
    // 도구점: 랜턴 · 손전등(4단계에 무기)
    tools(s) {
      const out = [head('도구점', s.money), h('h3', { class: 'shop-sec' }, '불')];
      for (const id of ['lantern', 'flashlight']) {
        const T = TOOLS[id], own = hasTool(s, id), held = lightOf(s) === id;
        out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, T.note)),
          !own ? priceBtn(T.price, s.money, after(() => handlers.buyTool(id)))
            : held ? h('span', { class: 'lic-badge done' }, ico('check'), '드는 중') : h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.setLight(id)) }, '들기')));
      }
      // 무기(4단계): 사면 바로 들고, 가진 무기는 바꿔 들거나 넣어 둔다
      const wp = weaponOf(s);
      out.push(h('h3', { class: 'shop-sec' }, '무기'));
      for (const id of WEAPON_ORDER) {
        const W = WEAPONS[id], own = wp.owned.includes(id), on = wp.held === id;
        let btn;
        if (!own) btn = priceBtn(W.price, s.money, after(() => handlers.buyWeapon(id)));
        else if (!on) btn = h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.holdWeapon(id)) }, '들기');
        else btn = h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.holdWeapon(null)) }, '넣기');
        out.push(h('div', { class: `row pochette${on ? ' worn' : ''}` }, svgSpan('pochette-art', weaponSvg(id)),
          h('div', {}, h('div', { class: 't' }, W.name, h('span', { class: 'power' }, '힘 ', '★'.repeat(W.dmg)), on ? h('span', { class: 'weed-count' }, '드는 중') : null), h('div', { class: 'd' }, W.note)),
          btn));
      }
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 테스트 도구(숨은 앱): 돈 · 기운 · 급수 · 시각을 바로 바꾼다
    dev(s) {
      const row = (t, d, ...btns) => h('div', { class: 'row dev-row' }, h('div', {}, h('div', { class: 't' }, t), d ? h('div', { class: 'd' }, d) : null), h('div', { class: 'dev-btns' }, ...btns));
      const b = (label, fn, cls = 'btn') => h('button', { class: cls, type: 'button', onClick: after(fn) }, label);
      return [appBar('테스트', '개발용'),
        h('p', { class: 'sub' }, '여러 기능을 빨리 시험해 보는 도구예요.'),
        row('돈', `지금 ${won(s.money)}`, b('+1만', () => handlers.dev.money(10000), 'btn primary'), b('+10만', () => handlers.dev.money(100000), 'btn primary')),
        row('기운', `지금 ${s.stamina} / ${MAX_STAMINA}`, b('가득', () => handlers.dev.stamina())),
        row('제초 검정', `지금 ${s.license.grade}급`, b('올리기', () => handlers.dev.grade(1)), b('내리기', () => handlers.dev.grade(-1))),
        row('시각', timeLabel(s.clock), b('아침', () => handlers.dev.hour(8)), b('밤', () => handlers.dev.hour(22))),
        h('p', { class: 'note' }, '마을폰 제목을 다시 다섯 번 누르면 이 앱이 숨어요.')];
    },
    // 마을폰 '풀 도감' 앱: 급수별로 풀 그림 · 자라는 곳 · 요령 · 뽑은 수(못 뽑는 급수는 흐리게)
    weeds(s) {
      const log = s.weedLog || {}, grade = s.license.grade;
      const found = WEED_ORDER.filter((k) => log[k] > 0).length;
      const out = [appBar('풀 도감', `${found} / ${WEED_ORDER.length}종`),
        h('p', { class: 'sub' }, `지금 ${grade}급`)];
      for (const g of [5, 4, 3, 2, 1]) {
        const open = grade <= g;
        out.push(h('div', { class: `weed-grade${open ? '' : ' locked'}` }, h('b', {}, `${g}급 풀`), open ? null : h('span', {}, `${g}급부터`)));
        for (const k of kindsOfGrade(g)) {
          const W = WEED_KINDS[k], n = log[k] || 0;
          // 자라는 곳 · 뽑는 요령은 꼬리표로(긴 설명 대신)
          const how = [W.stages > 1 ? `${W.stages}번에 나눠 뽑기` : null, W.drift ? '초록 칸 흔들림' : null, W.poison ? '끊기면 독' : null, W.night ? '밤에만' : null].filter(Boolean);
          out.push(h('div', { class: `row weed-card${open ? '' : ' locked'}${n ? '' : ' unseen'}` },
            svgSpan('weed-ico', weedSvg(k)),
            h('div', {},
              h('div', { class: 't' }, W.name, h('span', { class: 'weed-count' }, n ? `${n}개` : '아직')),
              h('div', { class: 'mon-chips' }, chip('pin', '', W.where), ...how.map((x) => chip(null, 'muted', x))))));
        }
      }
      return out;
    },
    // 마을폰 '지도' 앱: 앱 막대 아래를 지도가 꽉 채운다(끌기 · 확대는 mapapp.js 의 createMapView, render 에서 붙인다)
    map(s) {
      const p = handlers.playerPos();
      const pct = Math.round((exploredCount(s.explored || '') / (N * N)) * 100);
      return [appBar('지도', p ? REGION_NAMES[regionAt(p.x, p.z)] : null),
        h('div', { class: 'mapview', role: 'group', 'aria-label': '마을과 바깥 지도. 가 본 곳만 밝게 보여요' }),
        // 왼쪽에 다루는 법, 오른쪽에 가 본 곳(좁으면 둘 사이에서만 줄을 바꾼다)
        h('p', { class: 'phone-foot' }, h('span', {}, '끌어서 보고 휠로 확대'), h('b', {}, `가 본 곳 ${pct}%`))];
    },
    // 설정은 동물의 숲 폰처럼: 동그란 앱 아이콘을 누른다
    settings(s) {
      const app = (cls, icon, label, onClick) => h('button', { class: `app ${cls}`, type: 'button', onClick },
        svgSpan('app-ico', icon), h('span', { class: 'app-label' }, label));
      return [
        h('h2', { class: 'phone-title', onClick: () => {
          const now = performance.now();
          titleTaps = titleTaps.filter((t) => now - t < 2500).concat(now);
          if (titleTaps.length < 5) return;
          titleTaps = [];
          const on = !devOn();
          try { localStorage.setItem(DEV_KEY, on ? '1' : '0'); } catch { /* 저장이 막혀 있으면 이번만 */ }
          handlers.toast?.(on ? '테스트 도구가 켜졌어요' : '테스트 도구를 껐어요');
          render();
        } }, '마을폰'),
        h('div', { class: 'apps' },
          app('options', APP_ICON.options, '설정', () => show('options')),
          hasTool(s, 'map') ? app('map', APP_ICON.map, '지도', () => show('map')) : null,
          app('licenses', APP_ICON.card, '자격증', () => show('licenses')), // 'card' 이름표는 전역 .card(흰 카드 테두리)와 겹쳐서 쓰지 않는다
          app('weeds', APP_ICON.weeds, '풀 도감', () => show('weeds')),
          app('quests', APP_ICON.quests, '퀘스트', () => show('quests')),
          app('friends', APP_ICON.friends, '친구', () => show('friends')),
          app('monsters', APP_ICON.monsters, '몬스터 도감', () => show('monsters')),
          devOn() ? app('dev', APP_ICON.dev, '테스트', () => show('dev')) : null,
          // 메인(타이틀)으로: 진행은 저장되고, 새로 하고 싶으면 타이틀의 '새로 시작하기'
          app('exit', APP_ICON.exit, '메인으로', () => { close(true); handlers.toTitle(); })),
      ];
    },
    // 마을폰 '설정' 앱: 효과음 · 배경음악 켜고 끄기, 저장 안내
    options(s, extra) {
      const snd = handlers.getSound();
      const toggle = (kind, label, desc) => h('div', { class: 'row opt-row' },
        h('div', {}, h('div', { class: 't' }, label), h('div', { class: 'd' }, desc)),
        h('button', { class: `switch${snd[kind] ? ' on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(!!snd[kind]), 'aria-label': label, onClick: after(() => handlers.toggleSound(kind)) },
          h('i', { 'aria-hidden': 'true' }), h('span', {}, snd[kind] ? '켜짐' : '꺼짐')));
      return [appBar('설정'),
        h('h3', { class: 'shop-sec' }, '소리'),
        toggle('sfx', '효과음', '버튼, 풀 뽑기, 몬스터 소리'),
        toggle('music', '배경음악', '오르골 느낌의 마을 음악'),
        h('h3', { class: 'shop-sec' }, '저장'),
        h('p', { class: 'phone-note' }, extra.storage == null || extra.storage ? '진행은 이 브라우저에 자동 저장돼요' : '저장이 꺼져 있어서 창을 닫으면 진행이 사라져요')];
    }
  };

  return {
    isOpen: () => !!current,
    /** 마을폰을 보고 있는지(폰을 볼 때는 시간이 계속 흐른다). */
    isPhone: () => !!current?.phone,
    /** 매 프레임: 폰 상태 줄 시각을 흐르는 시간에 맞춘다. */
    tick(s) {
      if (!current?.phone || !s) return;
      const t = timeLabel(s.clock);
      if (current.status.time.textContent !== t) current.status.time.textContent = t;
    },
    close: () => close(),
    openBoard: () => show('board'),
    openExam: () => show('exam'),
    openShop: () => show('shop'),
    openLicenses: () => show('licenses'),
    openFurniture: () => show('furniture'),
    openRealty: () => show('realty'),
    openPochette: () => show('pochette'),
    openPub: () => show('pub'),
    openBag: () => show('bag'),
    openWardrobe: () => show('wardrobe'),
    openBooks: () => show('books'),
    openTools: () => show('tools'),
    openMap: () => show('map'),
    openWeeds: () => show('weeds'),
    openMonsters: () => show('monsters'),
    openQuests: () => show('quests'),
    openSettings: (extra) => show('settings', extra)
  };
}
