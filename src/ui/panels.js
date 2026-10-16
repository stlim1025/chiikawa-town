import { JOB_TYPES, availableJobs, isComplete, payout, gradedJob } from '../core/jobs.js';
import { FISH, DEX_FISH, DEX_PRIZES, dexCount, fishPrizeOf, fishLogOf, waterName, fishPrice } from '../core/fishing.js';
import { PAY_MULT, XP_TO_EXAM, EXAM_STREAK, EXAM_FEE, canTakeExam, gradeName, NOVICE } from '../core/license.js';
import { SHOPS, CHEERS_PRICE, CHEERS_STAMINA, PUB_HOURS, isOnSale } from '../core/shop.js';
import { MAX_STAMINA } from '../core/state.js';
import { FURNITURE, FURNITURE_CATS, WALLPAPERS, FLOORS, homeOf, gridOf, nextSize, sizeOf, decorOf, hasDecor } from '../core/home.js';
import { RENT, HOUSE_PRICE, LOTTERY_FEE, LOTTERY_PRICE, RENT_DAY, ANNOUNCE_DAY, EVICT_AFTER, LODGING_PRICE, ROUGH_REST, housingOf } from '../core/housing.js';
import { POCHETTES, THEFT_GUARD, pochetteOf, worn } from '../core/pochette.js';
import { LICENSES, hasLicense, licensesOf, canWorkRamen } from '../core/licenses.js';
import { boardOf, DAILY_JOBS } from '../core/villagers.js';
import { weedOf, WEED_START } from '../core/friendweed.js';
import { SHIFT_BASE, BOWL_PAY } from '../core/ramen.js';
import { COIN } from './hud.js';
import { recipeCards } from './ramenshop.js';
import { TOOLS, hasTool, lightOf, toolsOf } from '../core/tools.js';
import { exploredCount, N } from '../core/explore.js';
import { timeLabel } from '../core/clock.js';
import { REGION_NAMES, regionAt } from '../core/layout.js';
import { createMapView } from './mapapp.js';
import { WEED_KINDS, WEED_ORDER, canPullKind, kindsOfGrade, josa } from '../core/weeding.js';
import { weedSvg } from './weedart.js';
import { pochetteSvg, itemSvg, accessorySvg, TICKET_SVG } from './itemart.js';
import { bagOf, itemInfo, countOf, MAX_STACK } from '../core/inventory.js';
import { storageOf, storedOf, canStore, STORE_STACK } from '../core/storage.js';
import { pantryOf } from '../core/pantry.js';
import { sellableIds, nextSale, saleTotal } from '../core/market.js';
import { canGift } from '../core/gifts.js';
import { ACCESSORY_ITEMS, wardrobeOf, SALON_PRICE } from '../core/wardrobe.js';
import { WEAPONS, WEAPON_ORDER, MONSTERS, MONSTER_ORDER, MONSTER_REGIONS, DROPS, weaponOf } from '../core/combat.js';
import { bossSeen } from '../core/bosses.js';
import { monsterSvg, dropSvg, weaponSvg } from './monsterart.js';
import { QUESTS, QUEST_ORDER, questState, shortGoal, progressOf, isDone, isActive, pickTrack, activeQuests } from '../core/quests.js';
import { FRIENDS, friendOf, hearts, MAX_HEARTS } from '../core/friends.js';
import { charSvg, hasCharArt } from './art.js';
import { EMBLEM, licenseCardEl } from './licensecard.js';
import { PRIZES, RAFFLE_PRICE, DAILY_TICKETS, raffleOf } from '../core/raffle.js';
import { HUNTER_PROFILES, RANKER_TOP, RANKER_MIN, ENGRAVE_PRICE, ranking, hunterOf, licensed, isRanker, engravedOf } from '../core/hunters.js';
import { WORKS, WORK_IDS, WORK_STEP, workOf, workStatus, leftOf } from '../core/works.js';

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
  // 검색(사이드스토리 '검은 별똥별' 동안만): 돋보기
  search: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="17" cy="17" r="9" fill="#fff"/><circle cx="17" cy="17" r="5.5" fill="#8fc7ee"/><path d="M24 24l8 8" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>',
  // 친구: 하트
  friends:'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 33S7 24.6 7 15.4A6.6 6.6 0 0 1 20 12.6a6.6 6.6 0 0 1 13 2.8C33 24.6 20 33 20 33z" fill="#fff"/><path d="M13.5 16a3.4 3.4 0 0 1 3.8-2.6" fill="none" stroke="#f28fb0" stroke-width="2.4" stroke-linecap="round"/></svg>',
  // 같이 놀기: 손잡은 두 친구
  multi: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="13" cy="14" r="6" fill="#fff"/><circle cx="27" cy="14" r="6" fill="#fff"/><path d="M5 33q1-11 8-11t8 11zM19 33q1-11 8-11t8 11z" fill="#fff"/><path d="M17 27h6" stroke="#5aa98c" stroke-width="2.6" stroke-linecap="round"/></svg>',
  // 몬스터 도감: 뿔 달린 동그란 몬스터 얼굴
  fishdex: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M29 21l7-6v12z" fill="#fff"/><ellipse cx="18" cy="21" rx="13" ry="8" fill="#fff"/><circle cx="11" cy="19" r="2.2" fill="#4f86b8"/><path d="M20 14q3 7 0 14" fill="none" stroke="#4f86b8" stroke-width="2" stroke-linecap="round"/></svg>',
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

/** 마을 가꾸기 시설 그림(core/works.js): 꽃밭 · 벤치 · 가로등 · 시계탑 · 정자. */
const WORK_ART = {
  flowers: '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="29" rx="14" ry="5" fill="#d9cfc0" stroke="#5a4431" stroke-width="2"/><ellipse cx="20" cy="27.6" rx="10.5" ry="3.2" fill="#8a6a4a"/><path d="M13 27v-5M20 27v-9M27 27v-5" stroke="#5fa04f" stroke-width="2" stroke-linecap="round"/><circle cx="13" cy="20.5" r="3.4" fill="#ffa8c6" stroke="#5a4431" stroke-width="2"/><circle cx="20" cy="16" r="3.6" fill="#ffe36e" stroke="#5a4431" stroke-width="2"/><circle cx="27" cy="20.5" r="3.4" fill="#c9a8ff" stroke="#5a4431" stroke-width="2"/></svg>',
  benches: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 28v6M30 28v6M10 13v11M30 13v11" stroke="#5a5560" stroke-width="3" stroke-linecap="round"/><rect x="6" y="13" width="28" height="4" rx="1.5" fill="#c98a4a" stroke="#5a4431" stroke-width="2"/><rect x="6" y="18.5" width="28" height="4" rx="1.5" fill="#c98a4a" stroke="#5a4431" stroke-width="2"/><rect x="5" y="24.5" width="30" height="4.5" rx="1.5" fill="#c98a4a" stroke="#5a4431" stroke-width="2"/></svg>',
  lamps: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="12" r="10" fill="#ffe36e" opacity=".4"/><path d="M20 34V16" stroke="#4a3f48" stroke-width="3" stroke-linecap="round"/><rect x="14.5" y="32" width="11" height="3.4" rx="1.7" fill="#4a3f48"/><circle cx="20" cy="12" r="5" fill="#fff3c4" stroke="#5a4431" stroke-width="2"/><path d="M13.5 8.5h13L20 4z" fill="#4a3f48" stroke="#4a3f48" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  clock: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="13" y="13" width="14" height="22" fill="#f7efe0" stroke="#5a4431" stroke-width="2"/><path d="M10.5 14 20 5l9.5 9z" fill="#d9675b" stroke="#5a4431" stroke-width="2" stroke-linejoin="round"/><circle cx="20" cy="21" r="4.6" fill="#fff" stroke="#5a4431" stroke-width="1.6"/><path d="M20 21v-3M20 21h2.4" stroke="#3a2a28" stroke-width="1.4" stroke-linecap="round"/><rect x="17.5" y="28" width="5" height="7" rx="2.5" fill="#a77a52"/></svg>',
  pavilion: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 19v14M31 19v14" stroke="#a8743c" stroke-width="3" stroke-linecap="round"/><rect x="13" y="26" width="14" height="2.8" rx="1" fill="#c98a4a"/><rect x="5" y="32" width="30" height="3" rx="1" fill="#d8c3a0" stroke="#5a4431" stroke-width="1.6"/><path d="M4 17.5 20 7l16 10.5z" fill="#6f9a6a" stroke="#5a4431" stroke-width="2" stroke-linejoin="round"/><rect x="5" y="17" width="30" height="3" rx="1" fill="#7a5233"/><circle cx="20" cy="6" r="1.8" fill="#f6c453"/></svg>',
  roads: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 33 13 7h14l9 26z" fill="#a99e8b" stroke="#5a4431" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 12h6v5h-7zM21 12h6.5l1.6 5H21zM10 20h8v6h-10zM20.5 20h9l2 6h-11zM7 29h10v3H6zM19.5 29h12l1 3H19.5z" fill="#e6dfcf"/></svg>',
  fence: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="20" width="34" height="13" rx="2" fill="#d6cfbf" stroke="#5a4431" stroke-width="2"/><path d="M3 26.5h34M11 20v6.5M23 20v6.5M17 26.5V33M29 26.5V33" stroke="#a99e8b" stroke-width="1.6"/><rect x="2" y="17.5" width="36" height="3.5" rx="1.5" fill="#ece6d8" stroke="#5a4431" stroke-width="1.6"/><rect x="15" y="9" width="10" height="25" rx="1.5" fill="#bfb5a0" stroke="#5a4431" stroke-width="2"/><circle cx="20" cy="6.5" r="3" fill="#f6c453" stroke="#5a4431" stroke-width="1.6"/></svg>'
};

/** 토벌 랭킹 왕관. */
const CROWN = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 31 5 14l9 7 6-12 6 12 9-7-2 17z" fill="#fcd95b" stroke="#c98a2e" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 31h24" stroke="#c98a2e" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="22" r="2.6" fill="#ff8aa6"/><circle cx="12" cy="24" r="1.8" fill="#9fd3ff"/><circle cx="28" cy="24" r="1.8" fill="#9fd3ff"/></svg>';
/** 친구 얼굴(랭킹 · 알림). */
const friendFace = (kind) => `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(kind)}</svg>`;
/** 내 얼굴(몸 색 동그라미 + 눈 + 볼): 랭킹 줄과 무기에 새긴 얼굴에 쓴다. */
const myFace = (body) => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="21" r="15" fill="${body}" stroke="#5a4431" stroke-width="2.4"/>`
  + `<circle cx="14.5" cy="19" r="2.2" fill="#5a4431"/><circle cx="25.5" cy="19" r="2.2" fill="#5a4431"/>`
  + `<ellipse cx="11" cy="25" rx="3" ry="1.8" fill="#ffa8b8"/><ellipse cx="29" cy="25" rx="3" ry="1.8" fill="#ffa8b8"/><path d="M18 25q2 2 4 0" fill="none" stroke="#5a4431" stroke-width="1.6" stroke-linecap="round"/></svg>`;
/** 내 무기 그림(랭커가 얼굴을 새겼으면 내 얼굴이 박힌 그림). */
const myWeaponArt = (s, id) => weaponSvg(id, engravedOf(s).includes(id) ? (s.profile.look && s.profile.look.body) || '#ffffff' : null);

/** 노동 접수 창에서 고른 탭(마을 일 · 토벌 · 전리품). 창을 다시 열어도 그대로. */
let boardTab = 'work';
let sellSel = null; // 노동 접수 '팔기'에서 고른 물건 id
let pochetteTab = 'pochette'; // 포셰트 가게 탭: 'pochette' | 'accessory'(마지막에 본 탭을 기억한다)
let furnitureTab = 'furniture'; // 가구점 탭: 'furniture' | 'decor'(벽지와 바닥)
let furnitureCat = 'all'; // 가구 탭의 분류: 'all' | core/home.js 의 FURNITURE_CATS id(마지막에 본 분류를 기억한다)
/** 벽지 · 바닥 견본 그림(core/home.js): 벽지는 둥근 벽에 창, 바닥은 마루 결. */
const decorSvg = (kind, c) => (kind === 'wall'
  ? `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34V17a14 12 0 0 1 28 0v17z" fill="${c}" stroke="#5a4431" stroke-width="2"/><rect x="15" y="15" width="10" height="10" rx="1.5" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.6"/><path d="M20 15v10M15 20h10" stroke="#5a4431" stroke-width="1.2"/></svg>`
  : `<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="24" rx="15" ry="10" fill="${c}" stroke="#5a4431" stroke-width="2"/><path d="M9 20.5h22M6.5 25h27M9 29.5h22" stroke="#5a4431" stroke-opacity=".25" stroke-width="1.4"/></svg>`);
/** 집 넓히기 그림: 둥근 집 양옆으로 분홍 화살표. */
// 빌린 집(마을이 처음부터 세운 하얀 돔 집 — world/homeext.js 의 0단계): 동그란 돔에 네모 창, 옆으로 튀어나온 둥근 현관
const DOME_ART = '<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="49" rx="28" ry="5" fill="#a9dc8c"/><path d="M7 48C7 23 18 12 32 12s25 11 25 36z" fill="#fbfaf5" stroke="#5a4431" stroke-width="2.4" stroke-linejoin="round"/><rect x="17" y="24" width="12" height="10" rx="2" fill="#c6e7f5" stroke="#5a4431" stroke-width="2"/><path d="M23 24v10M17 29h12" stroke="#5a4431" stroke-width="1.6"/><path d="M38 48V36a8 8 0 0 1 16 0v12z" fill="#fbfaf5" stroke="#5a4431" stroke-width="2.2" stroke-linejoin="round"/><path d="M42 48v-10a4 4 0 0 1 8 0v10z" fill="#c49a6c" stroke="#5a4431" stroke-width="1.6"/></svg>';
// 넓은 방(빨간 지붕의 아담한 집 — world/homeext.js 의 1단계): 박공지붕 · 굴뚝 · 초록 덧창 · 꽃 상자 · 작은 현관 지붕
const COTTAGE_ART = '<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="50" rx="29" ry="5" fill="#a9dc8c"/><rect x="42" y="7" width="6" height="11" fill="#c96f5d" stroke="#5a4431" stroke-width="1.8"/><rect x="11" y="24" width="42" height="25" fill="#fff4de" stroke="#5a4431" stroke-width="2"/><path d="M5 26L32 8l27 18z" fill="#e0645a" stroke="#5a4431" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 23l8-5.5 8 5.5z" fill="#f7d7b5"/><rect x="15" y="30" width="9" height="8" rx="1" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.6"/><rect x="40" y="30" width="9" height="8" rx="1" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.6"/><path d="M12.5 30h2.5v8h-2.5zM24 30h2.5v8H24zM37.5 30H40v8h-2.5zM49 30h2.5v8H49z" fill="#5fae6e"/><rect x="14" y="38.5" width="11" height="3" rx="1" fill="#a8795a"/><rect x="39" y="38.5" width="11" height="3" rx="1" fill="#a8795a"/><circle cx="16.5" cy="38" r="1.3" fill="#f48fb1"/><circle cx="19.5" cy="37.6" r="1.3" fill="#ffd36b"/><circle cx="22.5" cy="38" r="1.3" fill="#f48fb1"/><circle cx="41.5" cy="38" r="1.3" fill="#ffd36b"/><circle cx="44.5" cy="37.6" r="1.3" fill="#f48fb1"/><circle cx="47.5" cy="38" r="1.3" fill="#ffd36b"/><rect x="28" y="35" width="8" height="14" rx="1.5" fill="#a8795a" stroke="#5a4431" stroke-width="1.6"/><path d="M25 35.5l7-4.5 7 4.5z" fill="#e0645a" stroke="#5a4431" stroke-width="1.6" stroke-linejoin="round"/><rect x="26" y="48.5" width="12" height="2.5" rx="1" fill="#e9e2d6" stroke="#5a4431" stroke-width="1.2"/></svg>';
// 큰 방(2층 저택 — 2단계): 남색 모임지붕 · 굴뚝 둘 · 가운데 박공과 둥근 창 · 기둥 현관 위 발코니 · 두 짝 대문 · 원뿔 나무
const MANSION_ART = '<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="50" rx="30" ry="5" fill="#a9dc8c"/><rect x="13" y="4" width="5" height="10" fill="#9aa3b5" stroke="#5a4431" stroke-width="1.6"/><rect x="46" y="4" width="5" height="10" fill="#9aa3b5" stroke="#5a4431" stroke-width="1.6"/><rect x="8" y="18" width="48" height="31" fill="#fff4de" stroke="#5a4431" stroke-width="2"/><path d="M5 19l9-10h36l9 10z" fill="#4a5f8e" stroke="#5a4431" stroke-width="2" stroke-linejoin="round"/><path d="M24 19l8-9 8 9z" fill="#fff4de" stroke="#5a4431" stroke-width="1.6" stroke-linejoin="round"/><circle cx="32" cy="15.2" r="2.3" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.2"/><path d="M28 30v-6a4 4 0 0 1 8 0v6z" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.6"/><rect x="12" y="22" width="7" height="7" rx="1" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.4"/><rect x="45" y="22" width="7" height="7" rx="1" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.4"/><rect x="12" y="36" width="7" height="8" rx="1" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.4"/><rect x="45" y="36" width="7" height="8" rx="1" fill="#c6e7f5" stroke="#5a4431" stroke-width="1.4"/><path d="M10 22h2v7h-2zM19 22h2v7h-2zM43 22h2v7h-2zM52 22h2v7h-2zM10 36h2v8h-2zM19 36h2v8h-2zM43 36h2v8h-2zM52 36h2v8h-2z" fill="#4a5f8e"/><rect x="22" y="31" width="20" height="3" fill="#fbfaf5" stroke="#5a4431" stroke-width="1.4"/><path d="M23 31v-2.5M26.5 31v-2.5M30 31v-2.5M34 31v-2.5M37.5 31v-2.5M41 31v-2.5M22.5 28.5h19" stroke="#5a4431" stroke-width="1.1"/><rect x="23" y="34" width="2.6" height="15" fill="#fbfaf5" stroke="#5a4431" stroke-width="1.2"/><rect x="38.4" y="34" width="2.6" height="15" fill="#fbfaf5" stroke="#5a4431" stroke-width="1.2"/><rect x="28" y="38" width="8" height="11" rx="1" fill="#8a5a3c" stroke="#5a4431" stroke-width="1.4"/><path d="M32 38v11" stroke="#5a4431" stroke-width="1.1"/><path d="M2 49l3.5-11L9 49zM55 49l3.5-11L62 49z" fill="#6fae6a" stroke="#5a4431" stroke-width="1.4" stroke-linejoin="round"/><rect x="25" y="48.5" width="14" height="2.5" rx="1" fill="#e9e2d6" stroke="#5a4431" stroke-width="1.2"/></svg>';
// 내 집 바깥 모습(집 크기 번호마다)
const HOUSE_LOOK = ['하얀 돔 집', '빨간 지붕의 아담한 집', '2층 저택'];
const HOUSE_ART = [DOME_ART, COTTAGE_ART, MANSION_ART];
/** 스티커 일감 그림: 과일 스티커가 붙은 종이 한 장. */
const STICKER_ART = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="13" y="10" width="38" height="46" rx="5" fill="#fff" stroke="#5a4431" stroke-width="2.4"/><circle cx="25" cy="25" r="7" fill="#f04a60" stroke="#5a4431" stroke-width="2"/><circle cx="40" cy="27" r="6.5" fill="#fcd95b" stroke="#5a4431" stroke-width="2"/><circle cx="31" cy="41" r="7" fill="#8fd16a" stroke="#5a4431" stroke-width="2"/><path d="M25 18v-3M40 20.5v-3" stroke="#5e9f80" stroke-width="2" stroke-linecap="round"/></svg>';
/** 일감 그림: 풀 · 열매는 그 그림, 스티커는 종이, 토벌은 몬스터 얼굴. */
const jobArt = (type) => (type.hunt ? monsterSvg(type.kind) : type.kind === 'sticker' ? STICKER_ART : itemSvg(type.kind));


/**
 * 몬스터 카드(토벌 안내서 · 몬스터 도감): 구역마다 머리글 아래 셋씩. 카드에는 얼굴 · 이름 · 공격 방식 · 단단함 · 공격 · 전리품.
 * withCount 면 잡은 수(못 잡았으면 흐리게)와 한 줄 설명. 보스(이야기 속 왕버섯 · 구역 보스)는 마주치기 전에는 '???' 로 감춘다.
 */
function monsterCards(s, withCount) {
  const hunted = s.hunted || {};
  const card = (k) => {
    const M = MONSTERS[k], n = hunted[k] || 0, D = DROPS[M.drop];
    const hidden = M.boss && !n && !bossSeen(s, k); // 보스는 마주치기 전까지 '???'
    if (hidden) {
      return h('div', { class: 'row mon-card unseen' }, svgSpan('mon-ico mystery', '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="20" fill="#e6d8b8"/><text x="32" y="44" text-anchor="middle" font-size="28" font-weight="700" fill="#b9a37a">?</text></svg>'),
        h('div', {}, h('div', { class: 't' }, '???'), h('div', { class: 'mon-chips' }, chip(null, 'muted', '커다란 무언가가 산다는 소문…'))));
    }
    // 단단함: 몇 대 맞아야 쓰러지는지 방패 다섯 칸으로
    const tough = Math.min(5, Math.ceil(M.hp / 3));
    const shields = h('span', { class: 'tough', 'aria-label': `단단함 ${tough} / 5` }, Array.from({ length: 5 }, (_, i) => h('i', { class: i < tough ? 'on' : '' })));
    return h('div', { class: `row mon-card${withCount && !n ? ' unseen' : ''}` }, svgSpan('mon-ico', monsterSvg(k)),
      h('div', {},
        h('div', { class: 't' }, M.name, withCount ? h('span', { class: 'weed-count' }, n ? `${n}마리` : '아직') : null),
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
 *   takeLicense(id: 'liquor' | 'arbeiter' | 'hunter'), studied(id: 'hunter' | 'arbeiter') (토벌 안내서 · 레시피 북을 펼쳤다), workRamen(),
 *   thumbs() → { 가구id: 그림 URL }, buyFurniture(id), useDecor(kind: 'wall' | 'floor', id) (벽지 · 바닥 사서 붙이기), expandHome() (집 넓히기),
 *   payRent() (밀린 집세만 · 쫓겨났어도 낼 수 있지만 쫓겨난 건 그대로), rentAgain() (쫓겨난 뒤 밀린 집세 + 이번 주 집세 내고 다시 세 들기),
 *   buyHouse(), applyLottery(), buyByLottery(), dayLabel(day), nextDay(요일) → 그 요일이 오는 날,
 *   buyPochette(id) (사면 바로 멘다), wearPochette(id | null) (null 이면 벗기),
 *   buyTool(id: 'map' | 'lantern' | 'flashlight'), setLight(id) (들 불 고르기), playerPos() → { x, z, yaw }, mapLabels() → [{ x, z, text }],
 *   getSound() → { sfx, music }, toggleSound(kind), onOpen(), onClose(),
 *   donateWork(id, amount) (마을 가꾸기 모금함에 내기, core/works.js),
 *   worksState() → 모금함 창에 보일 마을(친구 마을에 놀러 간 동안은 그 마을 모금), worksHost() → 놀러 간 마을 주인 이름 | null }
 */
export function createPanels(ui, handlers) {
  let current = null; // { kind, extra, backdrop, panel, phone?, status?, view? }
  // 마을폰 화면들: 폰 하나 안에서 화면 내용만 바뀐다
  const PHONE_APPS = ['settings', 'options', 'saveio', 'licenses', 'map', 'weeds', 'monsters', 'fishdex', 'quests', 'friends', 'multi', 'dev', 'devStories', 'search'];
  // 같이 놀기에서 고르는 한마디(자유 입력 대신 정해진 말만)
  const MP_SAYS = ['안녕~!', '같이 놀자!', '고마워!', '이쪽이야!', '잘 가~'];
  // 테스트 도구: 마을폰 제목을 빠르게 다섯 번 누르면 켜진다(이 브라우저에 기억)
  const DEV_KEY = 'chiikawa-town-dev';
  const devOn = () => { try { return localStorage.getItem(DEV_KEY) === '1'; } catch { return false; } };
  let titleTaps = [];
  // 마을폰을 열 때 받은 것({ storage }). 폰 안에서 화면을 옮겨도 그대로 쓴다
  let phoneExtra = {};

  function show(kind, extra) {
    handlers.appSeen?.(kind); // 새로 생긴 앱 안내(빛나는 아이콘)는 그 앱을 열면 끈다(폰 안에서 옮겨 가도)
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
    // 시험 공부거리를 펼쳤다(검정소 토벌 안내서 · 라멘 로우 레시피 북): 시험 전 검정관이 확인한다
    if (kind === 'guidebook' || kind === 'recipes') handlers.studied?.(kind === 'guidebook' ? 'hunter' : 'arbeiter');
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
      panel = h('div', { class: `panel panel-${kind}`, role: 'dialog', 'aria-modal': 'true' },
        h('button', { class: 'panel-x', type: 'button', 'aria-label': '닫기', onClick: () => close() }), body); // 스크롤 밖 오른쪽 위에 늘 보이는 닫기
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
    if ((current.kind === 'bag' || current.kind === 'storage') && current.sel) { current.sel = null; render(); return; }
    close();
  });
  // 닫기는 창 오른쪽 위 X 하나로(show): 아래 '닫기' 버튼은 휴대폰에서 스크롤해야 보여서 뺐다. 다른 버튼과 같이 있던 줄은 그 버튼만 남는다
  const closeBtn = () => null;
  const after = (fn) => () => { fn(); if (current) render(); };

  // ---------- 동그란 칸 주머니(주머니 · 보관 상자)가 같이 쓰는 것 ----------
  /** 칸 자리(주머니 안 좌표): 화면 좌표(getBoundingClientRect)는 창이 톡 커지는 중이면 줄어든 값이라 말풍선이 어긋난다 → 배치 좌표로 잰다. */
  function slotAt(wrap, el) {
    let x = 0, y = 0;
    for (let e = el; e && e !== wrap; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight };
  }
  /** 고른 칸 위에 이름 말풍선, 옆에 할 일 메뉴: 칸 오른쪽 → 왼쪽 → (좁은 화면) 칸 아래, 아래가 모자라면 이름 말풍선 위. */
  function placePocketMenu(wrap, bubble, menu) {
    const slot = wrap.querySelector('.pocket-slot.on');
    if (!slot || !menu) return;
    const W = { width: wrap.clientWidth, height: wrap.clientHeight }, r = slotAt(wrap, slot);
    const { left, top } = r;
    bubble.style.left = `${left + r.width / 2}px`;
    bubble.style.top = `${top - 12}px`; // 고른 칸은 4px 떠오르고 조금 커져 있다
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
  }
  /**
   * 개수 고르기(버리기 · 상자에 넣기 · 꺼내기): − 개수 + · 끌어서 고르는 막대 · '전체 N개' · 'N개 ○○' 확인 · 그만두기.
   * 1개부터 max 개까지. 누를 때마다 창을 다시 그리지 않고 글씨만 바꾼다(메뉴가 톡 튀지 않게). → 메뉴에 넣을 요소 목록
   */
  function countPicker(max, verb, onOk, onCancel) {
    let cnt = 1;
    const label = h('b', { class: 'cnt-n', 'aria-live': 'polite' });
    const minus = h('button', { class: 'cnt-step', type: 'button', 'aria-label': '하나 덜' }, '−');
    const plus = h('button', { class: 'cnt-step', type: 'button', 'aria-label': '하나 더' }, '+');
    const range = h('input', { class: 'cnt-range', type: 'range', min: '1', max: String(max), step: '1', value: '1', 'aria-label': `${verb} 개수` });
    const all = h('button', { class: 'pocket-act cnt-all', type: 'button' }, `전체 ${max}개`);
    const ok = h('button', { class: 'pocket-act main', type: 'button' });
    const set = (v) => {
      cnt = Math.max(1, Math.min(max, Math.round(Number(v)) || 1));
      label.textContent = `${cnt}개`;
      range.value = String(cnt);
      minus.disabled = cnt <= 1;
      plus.disabled = cnt >= max;
      all.setAttribute('aria-pressed', String(cnt === max));
      ok.textContent = `${cnt}개 ${verb}`;
    };
    minus.addEventListener('click', () => set(cnt - 1));
    plus.addEventListener('click', () => set(cnt + 1));
    range.addEventListener('input', () => set(range.value));
    all.addEventListener('click', () => set(max));
    ok.addEventListener('click', () => onOk(cnt));
    set(1);
    return [h('div', { class: 'cnt-pick', role: 'group', 'aria-label': `${verb} 개수` }, minus, label, plus), range, all, ok,
      h('button', { class: 'pocket-act', type: 'button', onClick: onCancel }, '그만두기')];
  }
  /** 주머니 · 상자 칸 차례: 풀 → 먹을 것 → 전리품 → 그 밖(같은 종류는 풀 도감 · 전리품 차례). */
  function pocketSort(ids) {
    const KIND_ORDER = { herb: 0, food: 1, drop: 2, quest: 3 };
    const order = (id) => { const w = WEED_ORDER.indexOf(id); return w >= 0 ? w : 50 + Object.keys(DROPS).indexOf(id); };
    return ids.sort((a, c) => (KIND_ORDER[itemInfo(a).kind] ?? 9) - (KIND_ORDER[itemInfo(c).kind] ?? 9) || order(a) - order(c));
  }
  /**
   * 노동 접수 일감 한 줄(장부처럼 줄마다 점선으로 나눈다): 그림 | 이름 + 어디서 | 보수 + 남은 건수 | 받기.
   * 보수는 오른쪽 한 칸에 모아 숫자끼리 줄이 맞게, 남은 건수는 그 밑 작은 글씨로. 다 나가면 흐리게 하고 '마감' 도장.
   */
  function jobRow(type, n, mult) {
    const pay = won(Math.round(type.base * (gradedJob(type) ? mult : 1))); // 토벌 · 낚시 일감은 급수 배율 없이
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
        type.cleanBonus > 0 ? h('span', { class: 'job-where' }, ico('star'), `깔끔하게 ${s.job.clean}번`) : h('span', { class: 'job-where' }, ico('pin'), type.where)),
      done ? h('button', { class: 'btn primary take', type: 'button', onClick: after(handlers.reportJob) }, '보수 받기', h('small', {}, won(payout(s.job, s.license.grade))))
        : h('button', { class: 'btn take quiet', type: 'button', onClick: after(handlers.quitJob) }, '그만두기'));
  }
  /**
   * 팔기(core/market.js): 가방 칸처럼 네모 칸에 그림 · 개수 · 하나 값. 칸을 고르면 밑에 1개 / 모두 팔기.
   * 전리품이 있으면 맨 밑에 '전리품 모두 팔기'(예전처럼 한 번에).
   */
  function sellBox(s, ids) {
    const items = bagOf(s).items;
    if (!ids.includes(sellSel)) sellSel = null;
    // 물고기는 큰 것부터 크기에 따른 값으로 판다(core/market.js nextSale): 칸에는 다음에 팔 하나 값
    const sel = sellSel, n = sel ? items[sel] : 0, next = sel ? nextSale(s, sel) : null;
    const drops = ids.filter((id) => DROPS[id]), dropTotal = drops.reduce((a, id) => a + items[id] * DROPS[id].price, 0);
    return h('div', { class: 'sell-box' },
      h('div', { class: 'slots' }, ids.map((id) => h('button', {
        class: `slot${id === sel ? ' on' : ''}`, type: 'button', title: itemInfo(id).name, 'aria-pressed': String(id === sel),
        'aria-label': `${itemInfo(id).name} ${items[id]}개, 하나에 ${won(nextSale(s, id).price)}`, onClick: () => { sellSel = id === sellSel ? null : id; render(); }
      }, svgSpan('art', itemSvg(id)), h('em', {}, `×${items[id]}`), h('small', { class: 'each' }, won(nextSale(s, id).price))))),
      sel ? h('div', { class: 'sell-pick' },
        h('div', { class: 'sell-name' }, h('b', {}, itemInfo(sel).name), h('span', {}, `${next.cm != null ? `${next.cm}cm짜리 ` : ''}하나에 ${won(next.price)}, ${n}개 있어요`)),
        h('div', { class: 'sell-btns' },
          h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.sellItem(sel, 1)) }, '1개 팔기'),
          n > 1 ? h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.sellItem(sel, n)) }, `모두 팔기 ${won(saleTotal(s, sel, n))}`) : null))
        : h('p', { class: 'sell-hint' }, '팔 물건을 골라요'),
      drops.length ? h('div', { class: 'sell-foot' },
        h('span', { class: 'sum' }, '전리품 모두', h('b', {}, svgSpan('coin', COIN), won(dropTotal))),
        h('button', { class: 'btn pink take', type: 'button', onClick: after(handlers.sellDrops) }, '전리품 모두 팔기')) : null);
  }
  // 마을폰 앱 화면 위 막대: 홈으로(‹, 저장 옮기기는 설정으로) · 앱 이름 · (지도면) 지금 있는 곳
  const appBar = (title, tag, back = 'settings') => h('div', { class: 'phone-bar' },
    h('button', { class: 'phone-back', type: 'button', 'aria-label': back === 'settings' ? '홈으로' : '뒤로', onClick: () => show(back) }, '‹'),
    h('h2', {}, title),
    tag ? h('span', { class: 'phone-tag' }, tag) : null);

  // 저장 옮기기(설정 → 내보내기 · 불러오기, 저장 코드는 core/savecode.js). 코드 칸은 다시 그리면 비워지므로 결과는 그 자리에서 글자만 바꾼다
  let saveMode = 'out';
  const openSaveIO = (mode) => { saveMode = mode; show('saveio'); };
  const SAVE_ERR = {
    empty: '저장 코드를 붙여 넣어 주세요',
    corrupt: '코드가 잘렸거나 다른 글이에요. 처음부터 끝까지 다시 복사해 주세요',
    version: '더 새로운 게임에서 만든 코드예요. 이 게임을 새로 고친 뒤 다시 해 주세요',
    unsupported: '코드를 푸는 도구를 받지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요'
  };
  /** 칸의 글을 복사한다. 클립보드가 막혀 있으면(오래된 사파리 · 끼워 넣은 창) 칸을 골라 execCommand 로. */
  async function copyText(area) {
    try { await navigator.clipboard.writeText(area.value); return true; } catch { /* 아래 방법으로 */ }
    try { area.focus(); area.setSelectionRange(0, area.value.length); return document.execCommand('copy'); } catch { return false; }
  }
  const saveMsg = (msg, text, warn = false) => { msg.textContent = text; msg.classList.toggle('warn', warn); };

  function saveExport(s) {
    const area = h('textarea', { class: 'save-code', readonly: true, rows: 5, spellcheck: 'false', 'aria-label': '저장 코드', placeholder: '코드를 만드는 중…' });
    const msg = h('p', { class: 'save-msg' });
    const copy = h('button', { class: 'btn primary', type: 'button', disabled: true }, '복사하기');
    const file = h('button', { class: 'btn', type: 'button', disabled: true }, '파일로 받기');
    area.addEventListener('click', () => area.setSelectionRange(0, area.value.length)); // 눌러서 전부 고르기(길게 눌러 복사할 때)
    copy.addEventListener('click', async () => { copy.textContent = (await copyText(area)) ? '복사했어요' : '길게 눌러 복사해 주세요'; });
    file.addEventListener('click', () => {
      const a = h('a', { href: URL.createObjectURL(new Blob([area.value], { type: 'text/plain' })), download: `치이카와마을-저장-${s.clock.day}일째.txt` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
    handlers.exportSave().then((code) => {
      area.value = code;
      copy.disabled = file.disabled = false;
      saveMsg(msg, `${s.profile.name}의 ${s.clock.day}일째 진행이에요`);
    }, () => saveMsg(msg, '코드를 만들지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요', true));
    return [appBar('저장 내보내기', null, 'options'),
      h('p', { class: 'sub' }, '이 코드를 다른 기기(PC, 휴대폰, 홈 화면 앱)의 마을폰 설정 → 불러오기에 붙여 넣으면 진행이 그대로 옮겨져요.'),
      area, msg,
      h('div', { class: 'save-io' }, copy, file),
      h('p', { class: 'note warn' }, '홈 화면 앱을 지우면 그 안의 진행도 같이 지워져요. 지우기 전에 코드를 메모나 메신저에 보관해 두세요.')];
  }

  function saveImport() {
    const area = h('textarea', { class: 'save-code', rows: 5, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', 'aria-label': '저장 코드 붙여 넣기', placeholder: '여기에 저장 코드를 붙여 넣어 주세요' });
    const pick = h('input', { type: 'file', accept: '.txt,.json,text/plain,application/json', hidden: true });
    const msg = h('p', { class: 'save-msg' });
    const check = h('div', { class: 'save-check', hidden: true });
    const read = h('button', { class: 'btn primary', type: 'button' }, '코드 확인');
    const fromFile = h('button', { class: 'btn', type: 'button', onClick: () => pick.click() }, '파일에서');
    async function verify() {
      check.hidden = true;
      saveMsg(msg, '읽는 중…');
      const r = await handlers.readSave(area.value);
      if (!r.ok) { saveMsg(msg, SAVE_ERR[r.reason] || SAVE_ERR.corrupt, true); return; }
      saveMsg(msg, '');
      const g = r.state;
      const yes = h('button', { class: 'btn pink', type: 'button' }, '이 진행으로 바꾸기');
      yes.addEventListener('click', () => {
        if (!handlers.importSave(g)) { saveMsg(msg, '이 브라우저는 저장이 꺼져 있어서 불러올 수 없어요', true); return; }
        yes.disabled = read.disabled = true;
        yes.textContent = '불러오는 중…';
      });
      check.replaceChildren(
        h('div', { class: 't' }, `${g.profile.name}, ${g.clock.day}일째`),
        h('div', { class: 'd' }, `${won(g.money)}, 제초 ${gradeName(g.license.grade)}`),
        h('p', { class: 'note warn' }, '지금 이 기기의 진행은 이 코드의 진행으로 바뀌어요'),
        yes);
      check.hidden = false;
    }
    area.addEventListener('input', () => { check.hidden = true; saveMsg(msg, ''); });
    read.addEventListener('click', verify);
    pick.addEventListener('change', async () => {
      const f = pick.files?.[0];
      if (!f) return;
      try { area.value = await f.text(); } catch { saveMsg(msg, '파일을 읽지 못했어요', true); return; }
      pick.value = '';
      verify();
    });
    return [appBar('저장 불러오기', null, 'options'),
      h('p', { class: 'sub' }, '다른 기기에서 내보낸 저장 코드를 붙여 넣어 주세요.'),
      area, pick, msg,
      h('div', { class: 'save-io' }, read, fromFile),
      check];
  }

  // 보스전 먹기 쿨타임(core/combat.js BOSS_EAT_COOL): 주머니가 열려 있는 동안 음식 칸의 남은 초를 고쳐 쓰고, 끝나면 다시 그려 회색을 걷는다
  let coolTimer = null;
  function watchEatCool(cool) {
    clearInterval(coolTimer);
    coolTimer = null;
    if (!(cool.left > 0)) return;
    coolTimer = setInterval(() => {
      if (!current || current.kind !== 'bag' || !current.panel) { clearInterval(coolTimer); coolTimer = null; return; }
      const left = handlers.eatCooldown().left;
      if (left <= 0) { clearInterval(coolTimer); coolTimer = null; render(); return; }
      current.panel.querySelectorAll('[data-cool-n]').forEach((e) => { e.textContent = String(Math.ceil(left)); });
      current.panel.querySelectorAll('[data-cool-label]').forEach((e) => { e.textContent = `${Math.ceil(left)}초 뒤에 먹어요`; });
    }, 250);
  }

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
    // 폰 상태 줄: 지금 시각 · 날짜(친구 마을에 놀러 간 동안은 그 마을 시계)
    const now = handlers.phoneNow ? handlers.phoneNow() : null;
    current.status.time.textContent = now ? now.time : timeLabel(s.clock);
    current.status.date.textContent = now ? now.date : handlers.dayLabel(s.clock.day);
    // 지도 화면: 지도 칸이 화면에 붙은 뒤에 만든다(칸 크기를 재야 해서)
    const host = p.querySelector('.mapview');
    if (host) current.view = createMapView(host, { explored: s.explored || '', player: handlers.playerPos(), labels: handlers.mapLabels(), friends: handlers.mapFriends ? handlers.mapFriends() : [], mates: handlers.mapMates ? handlers.mapMates() : [] });
  }

  const BUILD = {
    board(s) {
      const left = boardOf(s, s.clock.day).left, tutorial = s.tutorial === 'board';
      // 하치와레 안내 중(첫 일감)에는 풀 뽑기만 보여 준다
      const mine = tutorial ? [JOB_TYPES.weed8] : availableJobs(s.license.grade, licensesOf(s), toolsOf(s).owned);
      const total = mine.reduce((a, j) => a + (DAILY_JOBS[j.id] || 0), 0), remain = mine.reduce((a, j) => a + (left[j.id] || 0), 0);
      const mult = PAY_MULT[s.license.grade];
      const items = bagOf(s).items, sells = sellableIds(s);
      const out = [head('노동 접수', s.money)];
      // 이야기 전단지(친구 다섯과 친해지면 붙는 '수상한 섬 합숙'): 일감 위에 비스듬히 붙은 종이, 떼면 이야기 시작
      const flyerId = !tutorial && handlers.boardStory?.(), fl = flyerId && QUESTS[flyerId].flyer;
      if (fl) {
        out.push(h('div', { class: 'board-flyer' },
          h('i', { class: 'pin', 'aria-hidden': 'true' }),
          h('div', { class: 'bf-head' }, fl.head),
          h('div', { class: 'bf-big' }, fl.big),
          h('div', { class: 'bf-sub' }, fl.sub),
          h('button', { class: 'btn primary', type: 'button', onClick: () => handlers.takeFlyer() }, '전단지 떼기')));
      }
      // 현상금 몬스터(core/bounty.js): 나타나 있거나 쓰러뜨렸으면 빨간 '현상금' 전단(쓰러뜨렸으면 현상금 받기)
      const bt = !tutorial && handlers.bounty?.();
      if (bt && ['up', 'down', 'paid'].includes(bt.status)) {
        out.push(h('div', { class: `board-wanted ${bt.status}` },
          h('i', { class: 'pin', 'aria-hidden': 'true' }),
          svgSpan('bw-art', monsterSvg(bt.species)),
          h('div', { class: 'bw-txt' },
            h('div', { class: 'bw-head' }, '현상금'),
            h('div', { class: 'bw-name' }, bt.name),
            h('div', { class: 'bw-sub' }, bt.status === 'up' ? `${bt.where}에 나타났어요. 밤 10시가 지나면 사라져요` : bt.status === 'down' ? '쓰러뜨렸어요! 현상금을 받아 가세요' : '현상금을 받았어요'),
            bt.status === 'up' && bt.tricks && bt.tricks.length ? h('div', { class: 'bw-sub' }, `새 공격: ${bt.tricks.join(', ')}`) : null, // 원래 공격에 섞어 쓰는 것(core/bounty.js)
            h('div', { class: 'bw-pay' }, svgSpan('coin-ico', COIN), won(bt.reward))),
          bt.status === 'down' ? h('button', { class: 'btn primary', type: 'button', onClick: after(() => handlers.claimBounty()) }, '현상금 받기') : null));
      }
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
        if (sells.length) out.push(h('h3', { class: 'shop-sec' }, '팔기'), sellBox(s, sells));
      } else {
        // 탭(몬스터 헌터 퀘스트 카운터 · 동물의 숲 마일 목록처럼): 마을 일 | 토벌 | 전리품 — 한 번에 한 묶음만
        const tabs = [{ id: 'work', label: '마을 일', list: mine.filter((t) => !t.hunt) }];
        const hunts = mine.filter((t) => t.hunt);
        if (hunts.length) tabs.push({ id: 'hunt', label: '토벌', list: hunts });
        if (sells.length && !tutorial) tabs.push({ id: 'sell', label: '팔기', n: sells.reduce((a, id) => a + items[id], 0) });
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
        if (tab.id === 'sell') out.push(sellBox(s, sells));
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
      const out = [head('검정소', s.money)];
      // 토벌 안내서 칸. 대장 갑옷 씨가 "안내서부터 읽어라" 한 단계(이야기 첫 단계)에서는 맨 위로 올려 반짝이는 테두리 · '여기!' 딱지로 눈에 띄게
      const sq = questState(s, 'story'), sp = sq && !sq.done && QUESTS.story.steps[sq.step].type === 'study' ? progressOf(s, 'story') : null;
      const readNow = !!sp && sp.have < sp.need;
      const guideRow = h('div', { class: `row lic guide-row${readNow ? ' hl' : ''}` },
        readNow ? h('b', { class: 'hl-tag' }, '여기!') : null,
        h('div', { class: 'lic-top' }, svgSpan('lic-ico', '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 10q8-3 15 1q7-4 15-1v21q-8-3-15 1q-7-4-15-1z" fill="#fff6dc" stroke="#c98a5a" stroke-width="2" stroke-linejoin="round"/><path d="M20 11v21" stroke="#c98a5a" stroke-width="2"/><circle cx="12.5" cy="19" r="4" fill="#8fd16a"/><path d="M10.5 18.5h1M14 18.5h1" stroke="#335" stroke-width="1.4" stroke-linecap="round"/><path d="M23 17h8M23 21h8M23 25h5" stroke="#c9a77c" stroke-width="2" stroke-linecap="round"/></svg>'),
          h('div', {}, h('div', { class: 't' }, '토벌 안내서'), h('div', { class: 'd' }, readNow ? '대장 갑옷 씨가 읽어 보래요' : '몬스터 도감과 규칙')),
          h('button', { class: readNow ? 'btn primary' : 'btn', type: 'button', onClick: () => show('guidebook') }, '읽기')));
      if (readNow) out.push(guideRow);
      // 자격 한 장: 위 줄에 이름 · 상태(버튼), 아래에 아이콘 한 줄씩
      const card = (art, title, side, lines) => h('div', { class: 'row lic' },
        h('div', { class: 'lic-top' }, svgSpan('lic-ico', art), h('div', { class: 't' }, title), side),
        facts(lines));
      // 제초 검정
      let side;
      if (s.exam) side = h('span', { class: 'lic-badge going' }, `시험 중 ${s.exam.streak} / ${s.exam.need || 5}번`);
      else if (canTakeExam(lic)) { const fee = EXAM_FEE[lic.grade]; side = h('button', { class: 'btn pink', type: 'button', disabled: s.money < fee, onClick: after(handlers.startExam) }, s.money < fee ? `${won(fee)} 부족` : `${lic.grade - 1}급 시험 보기 ${won(fee)}`); }
      else if (lic.grade <= 1) side = h('span', { class: 'lic-badge done' }, ico('star'), '최고 급수');
      const xpNeed = XP_TO_EXAM[lic.grade];
      // 견습(자격 없음)이면 이름 대신 '견습', 첫 시험(견습 → 5급)은 잡초로
      out.push(card(EMBLEM.weed, `제초 검정 ${gradeName(lic.grade)}`, side, [
        ['coin', `보수 ${mult}배`],
        lic.grade > 1 ? ['up', lic.grade >= NOVICE ? `잡초를 ${EXAM_STREAK[lic.grade]}번 연달아 깔끔하게` : `승급 연속 ${EXAM_STREAK[lic.grade]}번`] : ['star', '모든 풀'],
        lic.grade > 1 && !s.exam && !canTakeExam(lic) ? ['star', `경험치 ${lic.xp} / ${xpNeed}`, h('i', { class: 'xp-bar' }, h('i', { style: `width:${Math.min(100, Math.round((lic.xp / xpNeed) * 100))}%` }))] : null
      ]));
      // 술 자격 · 슈퍼 알바이터 · 토벌: 필기 · 실기 · 준비를 한 줄씩
      const L = LICENSES, test = (id) => ['pen', `필기 ${L[id].pass} / ${L[id].questions}`];
      const LINES = {
        liquor: [test('liquor'), ['hand', '실기 하이볼'], ['book', '쿠리만쥬 강의']],
        arbeiter: [test('arbeiter'), ['hand', '실기 손님 3명, 레시피 북을 봐도 돼요'], ['book', '레시피 북']],
        hunter: [test('hunter'), ['hand', `실기 허수아비 ${L.hunter.dummies}개, 몬스터 ${L.hunter.foes.length}마리(${L.hunter.hits}번 맞으면 탈락)`], ['book', '토벌 안내서']]
      };
      for (const id of ['liquor', 'arbeiter', 'hunter']) {
        const own = hasLicense(s, id);
        const take = h('button', { class: 'btn pink', type: 'button', disabled: s.money < L[id].fee, onClick: () => { close(true); handlers.takeLicense(id); } }, s.money < L[id].fee ? `${won(L[id].fee)} 부족` : `시험 보기 ${won(L[id].fee)}`);
        // 슈퍼 알바이터: 시험 보기 밑에 레시피 북(필기 범위)을 바로 펼쳐 보는 버튼(다 보면 검정소로 돌아온다)
        const side2 = own ? h('span', { class: 'lic-badge done' }, ico('check'), '합격')
          : id === 'arbeiter' ? h('div', { class: 'lic-side' }, take, h('button', { class: 'btn', type: 'button', onClick: () => show('recipes', { back: 'exam' }) }, ico('book'), '레시피 북 보기'))
            : take;
        out.push(card(EMBLEM[id], L[id].name, side2, own ? [['check', `${handlers.dayLabel(licensesOf(s)[id].day)}에 땄어요`]] : LINES[id]));
      }
      // 토벌 랭킹: 내 순위(자격증이 있으면) · 랭커 특전(무기에 얼굴 새기기)
      const me = ranking(s, s.profile.name).find((r) => r.who === 'me');
      out.push(h('div', { class: 'row lic guide-row' },
        h('div', { class: 'lic-top' }, svgSpan('lic-ico', CROWN),
          h('div', {}, h('div', { class: 't' }, '토벌 랭킹'),
            me ? chipLine(chip('star', me.ranker ? 'ranker-chip' : '', me.ranker ? `랭커 ${me.rank}위` : `${me.rank}위`), chip(null, '', `${me.points}점`))
              : chipLine(chip('star', '', `상위 ${RANKER_TOP}명`))),
          h('button', { class: 'btn', type: 'button', onClick: () => show('ranking') }, '보기'))));
      if (!readNow) out.push(guideRow);
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    /**
     * 토벌 랭킹(검정소): 자격증 있는 토벌꾼을 점수 순으로. 위에서 셋(최소 점수 이상)이 랭커.
     * 아래에 아직 자격증을 준비 중인 친구들, 맨 아래에 랭커 특전(지금 든 무기에 내 얼굴 새기기).
     */
    ranking(s) {
      const rows = ranking(s, s.profile.name), body = (s.profile.look && s.profile.look.body) || '#ffffff';
      const out = [head('토벌 랭킹', s.money)];
      out.push(h('div', { class: 'ledger rank-list' }, rows.map((r) => h('div', { class: `rank-row${r.ranker ? ' ranker' : ''}${r.who === 'me' ? ' me' : ''}` },
        h('b', { class: 'rank-no' }, String(r.rank)),
        svgSpan('job-art', r.who === 'me' ? myFace(body) : friendFace(r.who)),
        h('div', { class: 'job-main' },
          h('b', { class: 'job-name' }, r.name, r.ranker ? h('span', { class: 'rank-badge' }, ico('star'), '랭커') : null),
          h('span', { class: 'job-where' }, `${r.kills}마리 토벌`)),
        h('div', { class: 'rank-pts' }, h('b', {}, String(r.points)), h('small', {}, '점'))))));
      // 아직 자격증이 없는 사람들
      const waiting = Object.keys(HUNTER_PROFILES).filter((k) => !licensed(s, k));
      if (!licensed(s, 'me') || waiting.length) {
        out.push(h('h3', { class: 'shop-sec' }, '자격증 준비 중'));
        out.push(h('div', { class: 'rank-wait' },
          !licensed(s, 'me') ? h('span', { class: 'chip' }, svgSpan('ico', myFace(body)), '나') : null,
          ...waiting.map((k) => { const t = hunterOf(s, k).tries; return h('span', { class: 'chip' }, svgSpan('ico', friendFace(k)), HUNTER_PROFILES[k].name, t ? h('small', {}, `${t}번 떨어짐`) : null); })));
      }
      // 랭커 특전: 지금 든 무기에 얼굴 새기기
      out.push(h('h3', { class: 'shop-sec' }, '랭커 특전'));
      const held = s.weapon && s.weapon.held, ranker = isRanker(s, 'me');
      let side, d;
      if (!ranker) {
        const third = rows.filter((r) => r.who !== 'me')[RANKER_TOP - 1];
        const goal = Math.max(RANKER_MIN, third ? third.points + 1 : RANKER_MIN), mine = hunterOf(s, 'me').points;
        side = h('span', { class: 'lic-badge' }, '랭커 전용');
        d = licensed(s, 'me') ? chipLine(chip('star', '', `랭커까지 ${Math.max(1, goal - mine)}점`)) : h('div', { class: 'd' }, '토벌 자격증부터 따요');
      } else if (!held) { side = h('span', { class: 'lic-badge' }, '무기를 들고 와요'); d = h('div', { class: 'd' }, '든 무기에 새겨요'); }
      else if (engravedOf(s).includes(held)) { side = h('span', { class: 'lic-badge done' }, ico('check'), '새김'); d = h('div', { class: 'd' }, `${WEAPONS[held].name}에 내 얼굴이 있어요`); }
      else { side = priceBtn(ENGRAVE_PRICE, s.money, after(handlers.engrave), 'btn pink'); d = h('div', { class: 'd' }, `${WEAPONS[held].name}에 새겨요`); }
      out.push(h('div', { class: 'row engrave-row' }, svgSpan('job-art', held ? weaponSvg(held, ranker || engravedOf(s).includes(held) ? body : null) : myFace(body)),
        h('div', {}, h('div', { class: 't' }, '무기에 얼굴 새기기'), d), side));
      out.push(h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onClick: () => show('exam') }, '검정소로'), closeBtn()));
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
      return [head('토벌 안내서'),
        h('div', { class: 'rule-grid' },
          rule('faint', '기운 0이면 기절', '세 시간 뒤 집 앞에서 깨고 돈을 조금 잃어요'),
          rule('safe', '마을 안은 안전', ''),
          rule('dodge', '빨간 표시는 피하기', ''),
          rule('shop', '무기는 도구점', '토벌 자격증이 있어야 사요. 전리품은 노동 접수에서 팔아요')),
        h('h3', { class: 'shop-sec' }, '몬스터'),
        ...monsterCards(s, false),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onClick: () => show('exam') }, '검정소로'), closeBtn())];
    },
    // 마을폰 '퀘스트' 앱: 하는 중인 부탁(화면에 띄울 것 고르기) · 끝낸 부탁
    quests(s) {
      const track = pickTrack(s);
      const face = (kind) => (hasCharArt(kind)
        ? svgSpan('q-face', `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(kind)}</svg>`)
        : h('span', { class: 'q-face mono', style: `--tag:${FRIENDS[kind].tag};--ink:${FRIENDS[kind].ink}` }, FRIENDS[kind].name.slice(0, 1)));
      const card = (id, kind) => {
        const Q = QUESTS[id], st = questState(s, id), p = kind === 'active' ? progressOf(s, id) : null;
        return h('div', { class: `row q-card ${kind}${Q.story ? ' story' : ''}${id === track ? ' tracked' : ''}` }, face(Q.giver),
          h('div', {},
            h('div', { class: 't' }, Q.title, Q.story || Q.side || Q.chain ? h('span', { class: 'weed-count' + (Q.side ? ' side' : '') }, Q.side ? '사이드스토리' : Q.chain ? '연계' : '이야기') : null),
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
      const active = activeQuests(s), done = QUEST_ORDER.filter((id) => isDone(s, id)); // 몸이 바뀐 동안은 그 이야기만(core/quests.js)
      const out = [appBar('퀘스트', `끝낸 부탁 ${done.length}`)];
      if (active.length) { out.push(h('h3', { class: 'shop-sec' }, '하는 중')); active.forEach((id) => out.push(card(id, 'active'))); }
      if (done.length) { out.push(h('h3', { class: 'shop-sec' }, '끝낸 부탁')); done.forEach((id) => out.push(card(id, 'done'))); }
      if (!active.length && !done.length) out.push(h('p', { class: 'bag-empty' }, '아직 받은 부탁이 없어요'));
      return out;
    },
    // 마을폰 '친구' 앱: 마을 친구마다 하트 · 다음 하트까지 · 오늘 이야기했는지 · 놀았는지 · 선물 · 빌린 돈
    friends(s) {
      const kinds = Object.keys(FRIENDS);
      // 마을 살림(main): 친구마다 지금 하는 일 · 오늘 마을 소식
      const live = handlers.villageLive ? handlers.villageLive() : { doing: {}, news: [] };
      const hourLabel = (hr) => { const hh = Math.floor(hr); return `${hh < 12 ? '오전' : '오후'} ${((hh + 11) % 12) + 1}시`; };
      const total = kinds.reduce((a, k) => a + hearts(friendOf(s, k)), 0);
      const HEART = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.5S2.5 12.8 2.5 7.6A4 4 0 0 1 10 5.4a4 4 0 0 1 7.5 2.2c0 5.2-7.5 9.9-7.5 9.9z"/></svg>';
      const face = (kind) => (hasCharArt(kind) // 그림이 없는 친구만 이름표 색 동그라미에 첫 글자
        ? svgSpan('q-face', `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(kind)}</svg>`)
        : h('span', { class: 'q-face mono', style: `--tag:${FRIENDS[kind].tag};--ink:${FRIENDS[kind].ink}` }, FRIENDS[kind].name.slice(0, 1)));
      const out = [appBar('친구', `하트 ${total}개`)];
      if (live.news.length) {
        out.push(h('h3', { class: 'shop-sec' }, '오늘 마을 소식'));
        out.push(h('ul', { class: 'news-list' }, live.news.map((e) => h('li', {},
          h('span', { class: 'n-faces' }, e.faces.map((f) => svgSpan('n-face', f))),
          h('span', { class: 'n-text' }, e.text), h('span', { class: 'n-time' }, hourLabel(e.hour))))));
        out.push(h('h3', { class: 'shop-sec' }, '친구들'));
      }
      // 하트 많은 친구부터(같으면 원래 순서)
      kinds.map((k, i) => ({ k, i, f: friendOf(s, k) })).sort((a, b) => b.f.pts - a.f.pts || a.i - b.i).forEach(({ k, f }) => {
        const F = FRIENDS[k], hc = hearts(f);
        // 하트 몇 개면 무슨 선물 · 다음 하트까지 몇 · 오늘 한 일 같은 건 앱에서 알려 주지 않는다(일하는 친구의 제초 급수 · 빌린 돈 · 친구 가방에 든 것만)
        const bag = Object.entries(pantryOf(s, k)).filter(([id, n]) => n > 0 && itemInfo(id));
        const grade = WEED_START[k] !== undefined ? chip(null, '', `제초 ${gradeName(weedOf(s, k).grade)}`) : null;
        const chips = [grade, f.debt ? chip('coin', 'debt', `빌린 돈 ${won(f.debt)}`) : null,
          ...bag.slice(0, 6).map(([id, n]) => h('span', { class: 'chip', title: itemInfo(id).name }, svgSpan('ico', itemSvg(id)), n > 1 ? `×${n}` : ''))];
        out.push(h('div', { class: `row f-card${f.pts ? '' : ' new'}` }, face(k),
          h('div', {},
            h('div', { class: 't' }, F.name,
              h('span', { class: 'f-hearts', role: 'img', 'aria-label': `하트 ${hc} / ${MAX_HEARTS}` }, Array.from({ length: MAX_HEARTS }, (_, i) => svgSpan(`f-heart${i < hc ? ' on' : ''}`, HEART)))),
            live.doing[k] ? h('div', { class: 'f-now' }, live.doing[k].svg ? svgSpan('f-now-ico', live.doing[k].svg) : null, live.doing[k].text) : null,
            grade || f.debt || bag.length ? h('div', { class: 'mon-chips', 'aria-label': '친구 가방' }, chips) : null)));
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
      // 메뉴마다 그림(맥주집처럼)
      const ART = {
        ramen: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M15 10q1-3 0-5M20 10q1-3 0-5M25 10q1-3 0-5" stroke="#c9b9a6" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M5 17h30a15 13 0 0 1-30 0z" fill="#d9675b" stroke="#a8433a" stroke-width="2"/><path d="M7 17q6-4 13-1t13 1z" fill="#fff3d6"/><path d="M10 16q3-3 6 0M17 16q3-3 6 0M24 16q3-3 6 0" fill="none" stroke="#efce6f" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="15" r="3" fill="#fff"/><circle cx="14" cy="15" r="1.4" fill="#f6b73c"/><circle cx="26" cy="15" r="2.6" fill="#fff" stroke="#f39aaa" stroke-width="1.2"/><rect x="11" y="31" width="18" height="3" rx="1.5" fill="#a8433a"/></svg>',
        onigiri: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 6q3 0 5 3l9 16q2 5-3 7H9q-5-2-3-7l9-16q2-3 5-3z" fill="#fffdf6" stroke="#d9cfb8" stroke-width="2"/><rect x="13" y="23" width="14" height="10" rx="2" fill="#3f4a3c"/><circle cx="17" cy="15" r="1" fill="#e9dfc8"/><circle cx="23" cy="18" r="1" fill="#e9dfc8"/></svg>',
        pizzabun: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M15 8q1-2 0-4M20 8q1-2 0-4M25 8q1-2 0-4" fill="none" stroke="#c9b9a6" stroke-width="1.6" stroke-linecap="round"/><path d="M6 24q0-13 14-13t14 13q0 8-14 8T6 24z" fill="#fbd3a0" stroke="#a8743a" stroke-width="2"/><path d="M9 25q11 5 22 0" fill="none" stroke="#e8573f" stroke-width="2.4" stroke-linecap="round"/><circle cx="15" cy="28" r="1.6" fill="#f2c43d"/><circle cx="25" cy="28" r="1.4" fill="#8fbf5a"/></svg>',
        highball: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 6h16l-2 28H14z" fill="#eaf6fb" stroke="#9cc4d6" stroke-width="2"/><path d="M13 14h14l-1.4 19H14.4z" fill="#f2c25e" opacity=".85"/><rect x="16" y="16" width="6" height="5" rx="1.2" fill="#fff" opacity=".8"/><rect x="19" y="22" width="5" height="4.5" rx="1.2" fill="#fff" opacity=".7"/><circle cx="27" cy="9" r="4.5" fill="#f8e36a" stroke="#d8b733" stroke-width="1.5"/><path d="M27 4.5v9M22.5 9h9" stroke="#d8b733" stroke-width="1"/></svg>'
      };
      // 막대 과자(축제 메뉴): 초콜릿을 입힌 가는 과자 막대 셋
      ART.sticksnack = '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke-linecap="round"><path d="M11 34L19 6" stroke="#e9c48a" stroke-width="3.4"/><path d="M14.2 22.8L19 6" stroke="#6b3f26" stroke-width="4"/><path d="M20 35V6" stroke="#e9c48a" stroke-width="3.4"/><path d="M20 23V6" stroke="#ff9fc0" stroke-width="4"/><path d="M29 34L21 6" stroke="#e9c48a" stroke-width="3.4"/><path d="M25.8 22.8L21 6" stroke="#6b3f26" stroke-width="4"/></g><circle cx="17.6" cy="12" r="0.9" fill="#fff"/><circle cx="20" cy="15" r="0.9" fill="#fff"/></svg>';
      ART.shisaramen = ART.ramen; // 시사 특제 라멘(같은 그릇)
      const out = [head(shop.name, s.money), h('p', { class: 'sub' }, `지금 기운 ${s.stamina} / ${MAX_STAMINA}`)];
      shop.items.forEach((item) => {
        if (item.after && !(s.story || {})[item.after]) return; // 새 메뉴는 소식이 나온 뒤부터
        if (!isOnSale(s, item)) return; // 축제 메뉴(막대 과자)는 축제 동안만
        const lock = item.needs && !hasLicense(s, item.needs), full = !item.item && s.stamina >= MAX_STAMINA; // 포장은 배불러도 산다
        out.push(h('div', { class: 'row pub-row' }, ART[item.id] ? svgSpan('lic-ico', ART[item.id]) : null,
          h('div', {}, h('div', { class: 't' }, item.name, item.fest ? h('span', { class: 'weed-count' }, '축제') : item.after ? h('span', { class: 'weed-count' }, '새 메뉴') : null), h('div', { class: 'd' }, item.item ? '포장해서 가방에 넣어 가요' : `기운 +${item.stamina}`)),
          lock ? h('span', { class: 'lic-badge' }, '자격증 필요') : full ? h('span', { class: 'lic-badge' }, '배불러요')
            : priceBtn(item.price, s.money, after(() => handlers.buy(item.id)))));
      });
      // 알바: 슈퍼 알바이터 자격이 있으면 하루 한 번(친구 마을에 놀러 간 동안은 사 먹기만)
      const work = canWorkRamen(s, s.clock.day);
      if (!handlers.visiting?.()) out.push(h('div', { class: 'row' },
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
      // 친구 마을에 놀러 간 동안은 사 마시기만(건배는 내 마을 쿠리만쥬와)
      if (!handlers.visiting?.()) out.push(h('div', { class: `row pub-row cheers${info.here ? ' here' : ''}` },
        svgSpan('q-face', `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg('kurimanju')}</svg>`),
        h('div', {}, h('div', { class: 't' }, '쿠리만쥬와 건배'),
          h('div', { class: 'mon-chips' }, chip('heart', 'gift', '하트 +2'), chip(null, '', `기운 +${CHEERS_STAMINA}`))),
        side));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 레시피 북: 라멘 로우에서(가게로), 시험 전 검정관이 펼쳐 줬으면 검정소로 돌아간다
    recipes(s, extra) {
      const back = extra && extra.back === 'exam' ? ['exam', '검정소로'] : ['shop', '가게로'];
      return [head('레시피 북'), recipeCards(),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onClick: () => show(back[0]) }, back[1]), closeBtn())];
    },
    // 마을폰 '자격증' 앱(폰 안 화면: 닫기는 아래 홈 버튼)
    licenses(s) {
      const out = [appBar('자격증')];
      // 딴 자격증은 내 사진이 박힌 카드로, 아직 없는 것은 흐린 빈 카드로. 카드 아래 한 줄: 제초는 보수 · 뽑을 수 있는 풀, 토벌은 랭킹
      const extra = (id) => {
        if (id === 'weed') return chipLine(chip('coin', '', `보수 ${PAY_MULT[s.license.grade]}배`), chip('check', '', `풀 ${WEED_ORDER.filter((k) => canPullKind(s.license.grade, k)).length}종 뽑기`));
        if (id !== 'hunter' || !hasLicense(s, id)) return null;
        const me = ranking(s, s.profile.name).find((r) => r.who === 'me');
        return me ? chipLine(chip('star', me.ranker ? 'ranker-chip' : '', me.ranker ? `랭커 ${me.rank}위` : `랭킹 ${me.rank}위`), chip(null, '', `${me.points}점`)) : null;
      };
      const ids = ['weed', 'liquor', 'arbeiter', 'hunter'].sort((a, b) => (a === 'weed' || hasLicense(s, a) ? 0 : 1) - (b === 'weed' || hasLicense(s, b) ? 0 : 1));
      out.push(h('div', { class: 'lic-list' }, ids.map((id) => h('div', { class: 'lic-item' }, licenseCardEl(handlers.licenseCard(id)), extra(id)))));
      return out;
    },
    // 동물의 숲 카탈로그처럼: 왼쪽 목록에서 고르면 오른쪽에 크게 보인다
    furniture(s) {
      const home = homeOf(s), thumbs = handlers.thumbs(), list = Object.values(FURNITURE).filter((f) => !f.gift); // 선물로만 받는 가구는 안 판다
      // 탭(포셰트 가게와 같은 모양): 가구 | 벽지와 바닥(옆 숫자는 가진 것 / 전부)
      const decorIds = [...Object.keys(WALLPAPERS).map((id) => ['wall', id]), ...Object.keys(FLOORS).map((id) => ['floor', id])];
      const tabs = [{ id: 'furniture', label: '가구', n: null }, { id: 'decor', label: '벽지와 바닥', n: `${decorIds.filter(([k, id]) => hasDecor(home, k, id)).length}/${decorIds.length}` }];
      const tabBar = h('div', { class: 'board-tabs-wrap' }, h('div', { class: 'board-tabs', role: 'tablist', 'aria-label': '가구점' }, tabs.map((t) =>
        h('button', { class: 'board-tab', type: 'button', role: 'tab', 'aria-selected': String(t.id === furnitureTab),
          onClick: () => { if (furnitureTab === t.id) return; furnitureTab = t.id; render(); current.panel.scrollTop = 0; } },
        t.label, t.n ? h('span', { class: 'n' }, t.n) : null))));
      if (furnitureTab === 'decor') {
        // 벽지 · 바닥(core/home.js): 사면 바로 붙이고, 가진 것은 언제든 바꿔 붙인다
        const d = decorOf(home), out = [head('가구점', s.money), tabBar];
        for (const [kind, T, title] of [['wall', WALLPAPERS, '벽지'], ['floor', FLOORS, '바닥']]) {
          out.push(h('h3', { class: 'shop-sec' }, title));
          for (const [id, D] of Object.entries(T)) {
            const own = hasDecor(home, kind, id), on = d[kind] === id;
            const btn = on ? h('span', { class: 'lic-badge done' }, ico('check'), '쓰는 중')
              : own ? h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.useDecor(kind, id)) }, '바꾸기')
                : priceBtn(D.price, s.money, after(() => handlers.useDecor(kind, id)));
            out.push(h('div', { class: `row pochette${on ? ' worn' : ''}` }, svgSpan('pochette-art', decorSvg(kind, D.color)),
              h('div', {}, h('div', { class: 't' }, D.name), h('div', { class: 'd' }, own ? '가지고 있어요' : kind === 'wall' ? '방 둥근 벽에 붙여요' : '방 바닥에 깔아요')),
              btn));
          }
        }
        out.push(h('p', { class: 'note' }, '한 번 사면 언제든 바꿔 붙일 수 있어요'));
        out.push(h('div', { class: 'actions' }, closeBtn()));
        return out;
      }
      // 분류 단추: 전체 + 분류마다(가구 수). 목록은 분류 차례, 같은 분류에서는 싼 것부터
      const catOrder = (f) => FURNITURE_CATS.findIndex((c) => c.id === f.cat);
      list.sort((a, b) => catOrder(a) - catOrder(b) || a.price - b.price);
      if (furnitureCat !== 'all' && !FURNITURE_CATS.some((c) => c.id === furnitureCat)) furnitureCat = 'all';
      const shown = furnitureCat === 'all' ? list : list.filter((f) => f.cat === furnitureCat);
      const catBar = h('div', { class: 'cat-cats', role: 'group', 'aria-label': '가구 분류' }, [{ id: 'all', name: '전체' }, ...FURNITURE_CATS].map((c) =>
        h('button', { class: 'cat-chip', type: 'button', 'aria-pressed': String(c.id === furnitureCat),
          onClick: () => { if (furnitureCat === c.id) return; furnitureCat = c.id; current.sel = null; render(); } },
        c.name, h('span', { class: 'n' }, String(c.id === 'all' ? list.length : list.filter((f) => f.cat === c.id).length)))));
      if (!current.sel || !shown.some((f) => f.id === current.sel)) current.sel = shown[0].id;
      const view = h('div', { class: 'cat-view', 'aria-live': 'polite' });
      const drawView = () => {
        const f = FURNITURE[current.sel];
        view.replaceChildren(
          thumbs[f.id] ? h('img', { class: 'cat-img', src: thumbs[f.id], alt: `${f.name} 미리보기` }) : h('div', { class: 'cat-img' }),
          h('div', { class: 'cat-name' }, f.name),
          h('div', { class: 'cat-meta' }, `가진 것 ${home.owned[f.id] || 0}개`),
          priceBtn(f.price, s.money, after(() => handlers.buyFurniture(f.id))));
      };
      const items = shown.map((f) => h('button', {
        class: 'cat-item', type: 'button', 'aria-pressed': String(f.id === current.sel),
        onClick: () => { current.sel = f.id; items.forEach((b, i) => b.setAttribute('aria-pressed', String(shown[i].id === f.id))); drawView(); }
      },
      thumbs[f.id] ? h('img', { class: 'thumb', src: thumbs[f.id], alt: '' }) : null,
      h('span', { class: 'nm' }, f.name),
      h('span', { class: 'pr' }, won(f.price))));
      drawView();
      return [
        head('가구점', s.money),
        tabBar,
        catBar,
        h('div', { class: 'catalog' }, h('div', { class: 'cat-list' }, items), view),
        h('div', { class: 'actions' }, closeBtn())
      ];
    },
    realty(s) {
      const hs = housingOf(s), day = s.clock.day;
      const out = [head('부동산', s.money)];
      // 돈이 모자라면 얼마 더 모아야 하는지(값 버튼만 흐리게 두면 왜 못 사는지 안 보였다)
      const short = (price) => (s.money < price ? h('div', { class: 'd short' }, `${won(price - s.money)} 더 모아야 해요`) : null);
      // 위에 할 일(「집 사기」, 「넓히기」), 아래에 값을 적은 버튼
      const bigBtn = (label, price, onClick) => h('button', { class: 'btn pink price-btn buy-house', type: 'button', disabled: s.money < price, onClick,
        'aria-label': `${label} ${won(price)}${s.money < price ? ' (돈이 부족해요)' : ''}` },
        h('small', {}, label), h('span', { class: 'bh-price' }, svgSpan('coin-ico', COIN), won(price)));
      const buyHouseBtn = () => bigBtn('집 사기', HOUSE_PRICE, after(handlers.buyHouse));
      if (hs.own) {
        // 내 집(집 넓히기, core/home.js): 넓힐 수 있으면 넓힌 뒤의 집 모습(넓은 방은 빨간 지붕의 아담한 집, 큰 방은 2층 저택)과 넓히기 버튼,
        // 다 넓혔으면 지금 집(2층 저택). 한 단계씩, 가구 놓을 칸이 늘어난다
        const home = homeOf(s), size = sizeOf(home), cur = gridOf(home), next = nextSize(home);
        out.push(h('div', { class: 'row pochette house' }, svgSpan('pochette-art', HOUSE_ART[next ? size + 1 : size]),
          h('div', {}, h('div', { class: 't' }, next ? `${josa(next.name, '으로/로')} 넓히기` : HOUSE_LOOK[size]),
            h('div', { class: 'mon-chips' }, chip('check', '', '내 집이에요'), chip('coin', '', '집세 없음')),
            h('div', { class: 'd' }, next
              ? `넓히면 ${josa(HOUSE_LOOK[size + 1], '이/가')} 되고, 가구 놓을 칸이 ${cur.cols * cur.rows}칸에서 ${next.cols * next.rows}칸으로 늘어요`
              : `가장 넓은 방이에요. 가구를 ${cur.cols * cur.rows}칸까지 놓아요`),
            next ? short(next.price) : null),
          next ? bigBtn('넓히기', next.price, after(handlers.expandHome)) : h('span', { class: 'lic-badge done' }, ico('check'), '다 넓혔어요')));
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
              h('div', {}, h('div', { class: 't' }, '밀린 집세만 내기'), null),
              h('button', { class: 'btn', type: 'button', disabled: s.money < hs.unpaid, onClick: after(handlers.payRent) }, `${won(hs.unpaid)} 내기`)));
          }
        } else {
          // 지금 사는 집(빌린 집): 하얀 돔 집 그림, 집세, 사면 어떻게 되는지와 집 사기 버튼을 한 칸에(밀린 집세가 있으면 그것부터)
          out.push(h('div', { class: 'row pochette house' }, svgSpan('pochette-art', DOME_ART),
            h('div', {}, h('div', { class: 't' }, '빌린 집'),
              h('div', { class: 'mon-chips' }, chip('coin', '', `일주일 집세 ${won(RENT)}`), chip('clock', '', `다음 집세 ${rentDay}`)),
              h('div', { class: 'd' }, hs.unpaid > 0 ? '밀린 집세를 다 내야 집을 살 수 있어요' : '집을 사면 집세가 없어지고 집을 넓힐 수 있어요'),
              hs.unpaid > 0 ? null : short(HOUSE_PRICE)),
            hs.unpaid > 0
              ? h('button', { class: 'btn primary', type: 'button', disabled: s.money < hs.unpaid, onClick: after(handlers.payRent) }, `밀린 집세 ${won(hs.unpaid)} 내기`)
              : buyHouseBtn()));
          // 밀린 집세 경고: 월요일에는 밀린 집세와 그 주 집세를 함께 낸다
          if (hs.unpaid > 0) {
            const lastChance = (hs.missed || 0) + 1 >= EVICT_AFTER;
            out.push(h('p', { class: 'note warn' }, lastChance ? '다음 월요일에 못 내면 쫓겨나요!' : `${EVICT_AFTER}번 연달아 못 내면 쫓겨나요!`));
          }
        }
        // 쫓겨난 뒤에는 빌린 집 칸이 없으니 집 사기를 따로
        if (hs.evicted) {
          out.push(h('div', { class: 'row' },
            h('div', {}, h('div', { class: 't' }, '집 사기'), h('div', { class: 'd' }, '집세가 없어지고 집을 넓힐 수 있어요'), hs.unpaid > 0 ? null : short(HOUSE_PRICE)),
            hs.unpaid > 0 ? h('span', { class: 'lic-badge' }, '밀린 집세부터') : buyHouseBtn()));
        }
        // 청약
        const lot = hs.lottery;
        let lotRow;
        if (!lot) {
          lotRow = h('button', { class: 'btn primary', type: 'button', disabled: s.money < LOTTERY_FEE, onClick: after(handlers.applyLottery) }, `신청하기 ${won(LOTTERY_FEE)}`);
        } else if (lot.won) {
          lotRow = h('button', { class: 'btn primary', type: 'button', disabled: s.money < LOTTERY_PRICE || hs.unpaid > 0, onClick: after(handlers.buyByLottery) }, `${won(LOTTERY_PRICE)}에 사기`);
        } else {
          lotRow = h('div', { class: 'd' }, '신청 완료', h('br'), `${handlers.dayLabel(handlers.nextDay(ANNOUNCE_DAY, lot.applied + 1))} 발표`);
        }
        const lotDesc = lot && lot.won
          ? h('div', { class: 'd' }, `당첨! ${handlers.dayLabel(lot.until)}까지`)
          : chipLine(chip('clock', '', '매주 수요일 발표'), chip('coin', '', `당첨되면 ${won(LOTTERY_PRICE)}`));
        out.push(h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, '주택 청약'),
          lot && lot.won ? null : h('div', { class: 'd' }, '당첨되면 집을 싸게 살 수 있어요'), lotDesc), lotRow));
      }
      out.push(h('p', { class: 'note' }, `오늘은 ${handlers.dayLabel(day)}`));
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 포셰트 가게: 사면 바로 메고, 가진 포셰트는 바꿔 메거나 벗는다
    pochette(s) {
      const pc = pochetteOf(s), wearing = worn(s), wd = wardrobeOf(s);
      const guard = THEFT_GUARD === 0.5 ? '절반만' : `${Math.round(THEFT_GUARD * 100)}%만`;
      const out = [head('포셰트 가게', s.money)];
      // 탭(노동 접수 탭과 같은 모양): 포셰트 | 꾸미기 — 한 번에 한 묶음만, 옆 숫자는 가진 것 / 전부
      const owned = (ids, has) => `${ids.filter(has).length}/${ids.length}`;
      const tabs = [
        { id: 'pochette', label: '포셰트', n: owned(Object.keys(POCHETTES), (id) => pc.owned.includes(id)) },
        { id: 'accessory', label: '꾸미기', n: owned(Object.keys(ACCESSORY_ITEMS).filter((id) => !ACCESSORY_ITEMS[id].gift || wd.owned.includes(id)), (id) => wd.owned.includes(id)) }
      ];
      out.push(h('div', { class: 'board-tabs-wrap' }, h('div', { class: 'board-tabs', role: 'tablist', 'aria-label': '포셰트 가게' }, tabs.map((t) =>
        h('button', { class: 'board-tab', type: 'button', role: 'tab', 'aria-selected': String(t.id === pochetteTab),
          onClick: () => { if (pochetteTab === t.id) return; pochetteTab = t.id; render(); current.panel.scrollTop = 0; } },
        t.label, h('span', { class: 'n' }, t.n))))));
      if (pochetteTab === 'accessory') {
        // 꾸미기 소품: 사면 바로 달고, 집 옷장에서 바꿔 단다
        Object.entries(ACCESSORY_ITEMS).forEach(([id, A]) => {
          const own = wd.owned.includes(id);
          if (A.gift && !own) return; // 선물로만 받는 것(귀 달린 잠옷)은 가졌을 때만 보인다
          // 재료로 만드는 것(별 조각 머리핀): 값 대신 재료 꼬리표(가진 수 / 필요한 수)와 '만들기'
          const need = A.craft ? Object.entries(A.craft) : null, enough = need && need.every(([it, k]) => countOf(s, it) >= k);
          const btn = own ? h('span', { class: 'lic-badge done' }, ico('check'), wd.wear === id ? '장착 중' : '가짐')
            : need ? h('button', { class: 'btn pink', type: 'button', disabled: !enough, onClick: after(() => handlers.craftAccessory(id)) }, '만들기')
              : priceBtn(A.price, s.money, after(() => handlers.buyAccessory(id)));
          out.push(h('div', { class: 'row pochette' }, svgSpan('pochette-art', accessorySvg(id)),
            h('div', {}, h('div', { class: 't' }, A.name), h('div', { class: 'd' }, A.note),
              need && !own ? h('div', { class: 'mon-chips' }, need.map(([it, k]) => chip(svgSpan('ico', itemSvg(it)), countOf(s, it) >= k ? '' : 'muted', `${itemInfo(it).name} ${Math.min(countOf(s, it), k)} / ${k}`))) : null),
            btn));
        });
        out.push(h('div', { class: 'actions' }, closeBtn()));
        return out;
      }
      out.push(chipLine(chip('coin', '', `소매치기 피해 ${guard}`)));
      Object.entries(POCHETTES).forEach(([id, P]) => {
        const own = pc.owned.includes(id), on = wearing === id;
        let btn;
        if (!own) btn = priceBtn(P.price, s.money, after(() => handlers.buyPochette(id)));
        else if (!on) btn = h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.wearPochette(id)) }, '장착');
        else btn = h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.wearPochette(null)) }, '빼기');
        out.push(h('div', { class: `row pochette${on ? ' worn' : ''}` },
          svgSpan('pochette-art', pochetteSvg(id, P)),
          h('div', {}, h('div', { class: 't' }, P.name, on ? h('span', { class: 'weed-count' }, '장착 중') : null), h('div', { class: 'd' }, P.note)),
          btn));
      });
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    // 주머니(동물의 숲처럼): 동그란 칸이 줄지어 있고, 칸을 누르면 이름 말풍선과 할 일 메뉴(먹기 · 들기 · 버리기)
    // 주머니. extra.giftTo = { kind, name } 이면 선물 모드: 고른 물건의 할 일이 '○○에게 주기' 하나(core/gifts.js)
    bag(s, extra) {
      const b = bagOf(s), wp = weaponOf(s), giftTo = extra && extra.giftTo;
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
      if (!sel) current.dropPick = null;
      const pick = (slot) => { current.sel = same(slot, current.sel) ? null : slot; current.dropPick = null; render(); };
      const nameOf = (x) => (x.type === 'weapon' ? WEAPONS[x.id].name : itemInfo(x.id).name);
      const artOf = (x) => (x.type === 'weapon' ? myWeaponArt(s, x.id) : itemSvg(x.id));
      // 보스전 먹기 쿨타임: 음식 칸을 회색으로 덮고 시계처럼 걷어 낸다(남은 초는 watchEatCool 이 고쳐 쓴다)
      const cool = handlers.eatCooldown ? handlers.eatCooldown() : { left: 0, total: 1 };
      const cooling = (x) => cool.left > 0 && x.type === 'item' && !!(itemInfo(x.id) || {}).eat;
      const coolLeft = () => Math.ceil(cool.left);
      watchEatCool(cool);
      const grid = h('div', { class: 'pocket-grid', role: 'grid', 'aria-label': '주머니 칸' },
        Array.from({ length: SLOTS }, (_, i) => {
          const x = slots[i];
          if (!x) return h('span', { class: 'pocket-slot empty', 'aria-hidden': 'true' });
          const n = x.type === 'item' ? b.items[x.id] : 0, held = x.type === 'weapon' && wp.held === x.id;
          const btn = h('button', { class: `pocket-slot${same(x, sel) ? ' on' : ''}${held ? ' held' : ''}${cooling(x) ? ' cooling' : ''}`, type: 'button', 'data-slot': String(i),
            'aria-label': `${nameOf(x)}${n > 1 ? ` ${n}개` : ''}${held ? ' (들고 있음)' : ''}${cooling(x) ? ` (${coolLeft()}초 뒤에 먹을 수 있음)` : ''}`, 'aria-pressed': String(same(x, sel)), onClick: () => pick(x) },
          svgSpan('pocket-ico', artOf(x)),
          cooling(x) ? h('span', { class: 'pocket-cool', 'aria-hidden': 'true', style: `--cool-total:${cool.total}s;animation-delay:-${(cool.total - cool.left).toFixed(2)}s` },
            h('b', { 'data-cool-n': '' }, String(coolLeft()))) : null,
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
        const r = slotAt(wrap, btn);
        hover.textContent = nameOf(x);
        hover.style.left = `${r.left + r.width / 2}px`;
        hover.style.top = `${r.top - 6}px`;
        hover.hidden = false;
      }
      // 고른 칸: 위에 이름 말풍선, 옆에 할 일 메뉴
      if (!slots.length) wrap.append(h('p', { class: 'pocket-empty' }, '주머니가 비어 있어요'));
      if (sel) {
        const n = sel.type === 'item' ? b.items[sel.id] : 1, inf = sel.type === 'item' ? itemInfo(sel.id) : null;
        const canDrop = handlers.canDrop ? handlers.canDrop() : true;
        const act = (label, fn, opts = {}) => h('button', { class: `pocket-act${opts.main ? ' main' : ''}`, type: 'button', disabled: !!opts.disabled, onClick: () => { current.sel = null; fn(); if (current) render(); } }, label);
        const acts = [];
        if (giftTo) {
          // 고르면 주머니를 닫고(조용히) 친구가 받는다. 무기 · 퀘스트 물건은 줄 수 없다
          if (sel.type === 'item' && canGift(sel.id)) acts.push(act(`${giftTo.name}에게 주기`, () => { close(true); handlers.giveGift(sel.id); }, { main: true }));
          else acts.push(act('줄 수 없어요', () => {}, { disabled: true }));
        } else {
          if (inf && inf.eat && cooling(sel)) acts.push(h('button', { class: 'pocket-act main', type: 'button', disabled: true, 'data-cool-label': '' }, `${coolLeft()}초 뒤에 먹어요`));
          else if (inf && inf.eat) acts.push(act(s.stamina >= MAX_STAMINA ? '배불러요' : '먹기', () => handlers.eatItem(sel.id), { main: true, disabled: s.stamina >= MAX_STAMINA }));
          if (sel.type === 'weapon') acts.push(wp.held === sel.id ? act('빼기', () => handlers.holdWeapon(null)) : act('장착', () => handlers.holdWeapon(sel.id), { main: true }));
          if (!canDrop) acts.push(act('밖에서만 버릴 수 있어요', () => {}, { disabled: true }));
          // 여러 개면 '버리기…' → 개수 고르기(− / + · 막대 · 전체)로 바뀐다
          else if (n > 1) acts.push(h('button', { class: 'pocket-act', type: 'button', onClick: () => { current.dropPick = `${sel.type}:${sel.id}`; render(); } }, '버리기…'));
          else acts.push(act('버리기', () => handlers.dropItem(sel, 1)));
        }
        acts.push(act('그만두기', () => {}));
        const picking = !giftTo && canDrop && n > 1 && current.dropPick === `${sel.type}:${sel.id}`;
        const items = picking
          ? countPicker(n, '버리기', (cnt) => { current.sel = null; current.dropPick = null; handlers.dropItem(sel, cnt); if (current) render(); }, () => { current.dropPick = null; render(); })
          : acts;
        // 이름 말풍선 · 메뉴는 직접 잡아 둔다(같은 모양의 마우스 말풍선 hover 가 먼저 들어 있어서 querySelector 로 찾으면 그쪽이 잡힌다)
        const bubble = h('div', { class: 'pocket-name', role: 'status' }, nameOf(sel)), menu = h('div', { class: `pocket-menu${picking ? ' picking' : ''}`, role: 'menu' }, items);
        wrap.append(bubble, menu);
        current.afterRender = () => placePocketMenu(wrap, bubble, menu); // 그린 뒤에 고른 칸 옆에 붙인다(칸 자리를 재야 해서)
      }
      return [head(giftTo ? `${giftTo.name}에게 줄 선물` : '주머니', s.money), wrap,
        h('div', { class: 'actions' }, h('p', { class: 'hint' }, giftTo ? '줄 물건을 골라요(좋아하는 걸 주면 더 기뻐해요)' : `${slots.length} / ${SLOTS}칸`), closeBtn())];
    },
    // 집 보관 상자(두 번째 주머니, core/storage.js): '꺼내기'(상자 칸) · '넣기'(주머니 칸) 탭. 칸을 고르면 바로 개수를 골라 옮긴다
    storage(s) {
      const tab = current.tab || 'out', box = storageOf(s), b = bagOf(s), src = tab === 'out' ? box : b;
      const ids = pocketSort(Object.keys(src.items).filter((id) => src.items[id] > 0 && itemInfo(id)));
      const SLOTS = Math.max(30, Math.ceil(ids.length / 10) * 10);
      if (current.sel && !ids.includes(current.sel)) current.sel = null;
      const sel = current.sel;
      const grid = h('div', { class: 'pocket-grid', role: 'grid', 'aria-label': tab === 'out' ? '보관 상자 칸' : '주머니 칸' },
        Array.from({ length: SLOTS }, (_, i) => {
          const id = ids[i];
          if (!id) return h('span', { class: 'pocket-slot empty', 'aria-hidden': 'true' });
          const n = src.items[id];
          return h('button', { class: `pocket-slot${sel === id ? ' on' : ''}`, type: 'button', 'aria-label': `${itemInfo(id).name}${n > 1 ? ` ${n}개` : ''}`, 'aria-pressed': String(sel === id),
            onClick: () => { current.sel = sel === id ? null : id; render(); } },
          svgSpan('pocket-ico', itemSvg(id)), n > 1 ? h('b', { class: 'pocket-cnt' }, String(n)) : null);
        }));
      const wrap = h('div', { class: 'pocket' }, grid);
      if (!ids.length) wrap.append(h('p', { class: 'pocket-empty' }, tab === 'out' ? '상자가 비어 있어요' : '주머니가 비어 있어요'));
      if (sel) {
        // 옮길 수 있는 만큼: 꺼내기는 주머니 한 가지 99개까지, 넣기는 상자 한 가지 999개까지(퀘스트 물건은 못 넣는다)
        const n = src.items[sel], verb = tab === 'out' ? '꺼내기' : '넣기';
        const room = tab === 'out' ? MAX_STACK - countOf(s, sel) : STORE_STACK - storedOf(s, sel), max = Math.min(n, room);
        const done = (cnt) => { current.sel = null; (tab === 'out' ? handlers.takeOut : handlers.storeItem)(sel, cnt); if (current) render(); };
        const cancel = () => { current.sel = null; render(); };
        const why = tab === 'in' && !canStore(sel) ? '퀘스트 물건은 못 넣어요' : max <= 0 ? (tab === 'out' ? '주머니가 가득해요' : '상자가 가득해요') : null;
        const items = why ? [h('button', { class: 'pocket-act', type: 'button', disabled: true }, why), h('button', { class: 'pocket-act', type: 'button', onClick: cancel }, '그만두기')]
          : max > 1 ? countPicker(max, verb, done, cancel)
          : [h('button', { class: 'pocket-act main', type: 'button', onClick: () => done(1) }, verb), h('button', { class: 'pocket-act', type: 'button', onClick: cancel }, '그만두기')];
        const bubble = h('div', { class: 'pocket-name', role: 'status' }, itemInfo(sel).name), menu = h('div', { class: `pocket-menu${max > 1 && !why ? ' picking' : ''}`, role: 'menu' }, items);
        wrap.append(bubble, menu);
        current.afterRender = () => placePocketMenu(wrap, bubble, menu);
      }
      const tabBtn = (t, text) => h('button', { class: `store-tab${tab === t ? ' on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(tab === t),
        onClick: () => { if (current.tab === t) return; current.tab = t; current.sel = null; render(); } }, text);
      const stored = Object.values(box.items).reduce((a, v) => a + v, 0);
      return [head('보관 상자', s.money),
        h('div', { class: 'store-tabs', role: 'tablist' }, tabBtn('out', '꺼내기'), tabBtn('in', '넣기')),
        wrap,
        h('div', { class: 'actions' }, h('p', { class: 'hint' }, tab === 'out' ? `상자에 ${stored}개 들어 있어요` : '넣을 물건을 골라요(퀘스트 물건은 빼고)'), closeBtn())];
    },
    // 집 옷장: 가진 포셰트 · 소품을 골라 바로 바꿔 단다(집 안의 내 캐릭터가 바로 바뀐다)
    wardrobe(s) {
      const pc = pochetteOf(s), wd = wardrobeOf(s);
      const tile = (on, art, name, fn) => h('button', { class: 'bag-tile', type: 'button', 'aria-pressed': String(on), onClick: after(fn) }, svgSpan('bag-ico', art), h('span', { class: 'nm' }, name));
      const none = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="16" fill="none" stroke="#b9a37a" stroke-width="4"/><path d="M21 43L43 21" stroke="#b9a37a" stroke-width="4" stroke-linecap="round"/></svg>';
      const out = [head('옷장')];
      out.push(h('h3', { class: 'shop-sec' }, '포셰트'));
      out.push(h('div', { class: 'bag-grid' }, tile(!pc.wear, none, '없음', () => handlers.wearPochette(null)),
        pc.owned.map((id) => tile(pc.wear === id, pochetteSvg(id, POCHETTES[id]), POCHETTES[id].name, () => handlers.wearPochette(id)))));
      out.push(h('h3', { class: 'shop-sec' }, '머리 장식'));
      out.push(h('div', { class: 'bag-grid' }, tile(wd.wear === 'none', none, '없음', () => handlers.wearAccessory('none')),
        wd.owned.map((id) => tile(wd.wear === id, accessorySvg(id), ACCESSORY_ITEMS[id].name, () => handlers.wearAccessory(id)))));
      if (!pc.owned.length && !wd.owned.length) out.push(h('p', { class: 'note' }, '포셰트 가게에서 사 와요'));
      out.push(h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', onClick: () => close() }, '다 골랐어요')));
      return out;
    },
    // 카니 헌책방: 마을 지도
    // 변신 살롱: 귀 · 몸 색 · 무늬 · 얼굴 · 머리를 새로 고른다(이름 · 장식은 그대로, 장식은 집 옷장에서)
    salon(s) {
      return [head('변신 살롱', s.money), h('p', { class: 'sub' }, '어머, 어서 와요~ 오늘은 어떤 모습이 되고 싶어요?'),
        h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, '모습 바꾸기'), h('div', { class: 'd' }, '귀부터 얼굴, 머리까지 새로 골라요')),
          priceBtn(SALON_PRICE, s.money, () => { close(true); handlers.salon(); }, 'btn pink')),
        h('p', { class: 'note' }, '마음에 안 들면 그만둬도 돼요. 돈은 바꿀 때만 받아요.'),
        h('div', { class: 'actions' }, closeBtn())];
    },
    books(s) {
      const own = hasTool(s, 'map'), T = TOOLS.map;
      return [head('카니 헌책방', s.money), h('p', { class: 'sub' }, '…딱딱.'),
        h('div', { class: 'row' }, h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, T.note)),
          own ? h('span', { class: 'lic-badge done' }, ico('check'), '가짐')
            : priceBtn(T.price, s.money, after(() => handlers.buyTool('map')))),
        h('div', { class: 'actions' }, closeBtn())];
    },
    // 도구점: 랜턴 · 손전등(4단계에 무기)
    // 경품 추첨(원작의 가라가라): 구슬 색마다 상품 · 추첨권(가게에서 물건을 사면 한 장) · 돌리기
    raffle(s) {
      const r = raffleOf(s), left = DAILY_TICKETS - (r.day === s.clock.day ? r.got : 0);
      // 돌리기 단추는 추첨권 줄에 붙여 상품 목록 위에(휴대폰에서 스크롤하지 않아도 바로 누르게)
      return [head('경품 추첨', s.money),
        h('p', { class: 'sub' }, '손잡이를 돌려 나온 구슬 색으로 상품을 받아요!'),
        h('div', { class: 'row pochette' }, svgSpan('pochette-art', TICKET_SVG),
          h('div', {}, h('div', { class: 't' }, `추첨권 ${r.tickets}장`), h('div', { class: 'd' }, left > 0 ? `가게에서 물건을 사면 한 장(오늘 ${left}장 더)` : '오늘 받을 추첨권은 다 받았어요')),
          r.tickets > 0 ? h('button', { class: 'btn primary', type: 'button', onClick: () => handlers.raffleDraw() }, '추첨권으로 돌리기')
            : h('button', { class: 'btn primary', type: 'button', disabled: s.money < RAFFLE_PRICE, onClick: () => handlers.raffleDraw() }, s.money < RAFFLE_PRICE ? `${won(RAFFLE_PRICE)} 부족` : `돌리기 ${won(RAFFLE_PRICE)}`)),
        h('div', { class: 'prize-list' }, PRIZES.map((P) => h('div', { class: 'prize-row' },
          h('i', { class: 'prize-ball', style: `background:${P.ball}` }),
          h('b', { class: 'prize-rank' }, P.rank),
          svgSpan('prize-art', itemSvg(P.item)),
          h('span', { class: 'prize-name' }, itemInfo(P.item).name)))),
        h('div', { class: 'actions' }, closeBtn())];
    },
    // 마을 가꾸기 모금함(core/works.js): 시설마다 모은 돈 막대와 내기 단추. 다 모이면 다음 날 아침에 마을에 생긴다
    works(s) {
      // 친구 마을에 놀러 간 동안은 그 마을 모금(v)을 보이고, 낼 돈은 내 돈(s.money)
      const v = handlers.worksState ? handlers.worksState() : s, host = handlers.worksHost ? handlers.worksHost() : null;
      const out = [head(host ? `${host}네 마을 가꾸기` : '마을 가꾸기', s.money),
        h('p', { class: 'sub' }, host ? `${host}네 마을 모금함이에요. 내 돈으로 같이 채워 줄 수 있어요` : '돈을 모아 내면 다 모인 다음 날 아침에 마을에 생겨요')];
      // 마을 발전: 생긴 시설 수 / 전부
      const built = WORK_IDS.filter((id) => workStatus(v, id) === 'open').length;
      out.push(h('div', { class: 'work-level' }, h('b', {}, `마을 발전 ${built} / ${WORK_IDS.length}`),
        h('div', { class: 'work-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(WORK_IDS.length), 'aria-valuenow': String(built), 'aria-label': '마을 발전' }, h('i', { style: `width:${Math.round((built / WORK_IDS.length) * 100)}%` }))));
      for (const id of WORK_IDS) {
        const W = WORKS[id], st = workStatus(v, id), paid = workOf(v, id).paid, left = leftOf(v, id), step = Math.min(WORK_STEP, left);
        const right = st === 'open' ? h('span', { class: 'lic-badge done' }, ico('check'), '완성')
          : st === 'building' ? h('span', { class: 'lic-badge' }, '공사 중')
            : h('div', { class: 'work-btns' },
              h('button', { class: 'btn', type: 'button', disabled: s.money < step, onClick: after(() => handlers.donateWork(id, step)) }, `${won(step)} 내기`),
              left > step ? h('button', { class: 'btn pink', type: 'button', disabled: s.money < left, onClick: after(() => handlers.donateWork(id, left)) }, `다 내기 ${won(left)}`) : null);
        out.push(h('div', { class: `row pochette work${st === 'open' ? ' done' : ''}` }, svgSpan('pochette-art', WORK_ART[id]),
          h('div', {}, h('div', { class: 't' }, W.name), h('div', { class: 'd' }, W.note),
            h('div', { class: 'work-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(W.price), 'aria-valuenow': String(paid), 'aria-label': `${W.name} 모은 돈` },
              h('i', { style: `width:${Math.round((paid / W.price) * 100)}%` })),
            h('div', { class: 'work-sum' }, `${won(paid)} / ${won(W.price)}`)),
          right));
      }
      out.push(h('div', { class: 'actions' }, closeBtn()));
      return out;
    },
    tools(s) {
      const out = [head('도구점', s.money), h('h3', { class: 'shop-sec' }, '불')];
      const LIGHT_ART = {
        lantern: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="13" fill="#ffd56b" opacity=".2"/><path d="M15 6h10" stroke="#7a5233" stroke-width="2.4" stroke-linecap="round"/><path d="M17 6v4M23 6v4" stroke="#7a5233" stroke-width="2"/><path d="M13 10h14l-1 3H14z" fill="#a8743c"/><rect x="13" y="13" width="14" height="17" rx="3" fill="#ffe7a3" stroke="#a8743c" stroke-width="2"/><ellipse cx="20" cy="22" rx="3.6" ry="5" fill="#ffb44a"/><ellipse cx="20" cy="23" rx="1.8" ry="2.8" fill="#fff3c4"/><rect x="12" y="30" width="16" height="4" rx="1.5" fill="#a8743c"/></svg>',
        flashlight: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="16" cy="20" r="13" fill="#fff6c8" opacity=".35"/><path d="M24 15l13-7v24l-13-7z" fill="#fff6c8" opacity=".85"/><rect x="4" y="15" width="13" height="10" rx="3" fill="#7fb6e2" stroke="#4b82ad" stroke-width="2"/><path d="M17 13h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5z" fill="#5d9bd0" stroke="#4b82ad" stroke-width="2"/><circle cx="10.5" cy="20" r="1.8" fill="#ffd56b"/></svg>'
      };
      for (const id of ['lantern', 'flashlight']) {
        const T = TOOLS[id], own = hasTool(s, id), held = lightOf(s) === id;
        out.push(h('div', { class: `row pochette${held ? ' worn' : ''}` }, svgSpan('pochette-art', LIGHT_ART[id]), h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, T.note)),
          !own ? priceBtn(T.price, s.money, after(() => handlers.buyTool(id)))
            : held ? h('span', { class: 'lic-badge done' }, ico('check'), '장착 중') : h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.setLight(id)) }, '장착')));
      }
      // 낚싯대(core/fishing.js): 물가에서 낚시하기
      {
        const T = TOOLS.rod, own = hasTool(s, 'rod');
        const ROD_ART = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 34L32 6" stroke="#d9b27a" stroke-width="3" stroke-linecap="round"/><path d="M8 34l5-6" stroke="#7a5136" stroke-width="5" stroke-linecap="round"/><circle cx="13" cy="27" r="3.4" fill="#b9bec6" stroke="#6f6a63" stroke-width="1.6"/><path d="M32 6Q36 18 30 26" fill="none" stroke="#5a4431" stroke-width="1.2"/><circle cx="30" cy="28" r="3" fill="#e0524f" stroke="#5a4431" stroke-width="1.2"/><path d="M27.2 28h5.6" stroke="#fff" stroke-width="1.4"/></svg>';
        out.push(h('h3', { class: 'shop-sec' }, '낚시'));
        out.push(h('div', { class: 'row pochette' }, svgSpan('pochette-art', ROD_ART), h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, T.note)),
          own ? h('span', { class: 'lic-badge done' }, ico('check'), '가지고 있음') : priceBtn(T.price, s.money, after(() => handlers.buyTool('rod')))));
      }
      // 하늘색 자동차(actors/car.js): 사면 화면 오른쪽 위 자동차 버튼(C)으로 언제든 타고 내린다
      {
        const T = TOOLS.car, own = hasTool(s, 'car');
        const CAR_ART = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 31Q3 31 3 27Q3 22 9 21Q10 13 16 10Q20 8 21.5 5Q23 8 27 10Q33 14 34 22Q37 23 37 27Q37 31 34 31Z" fill="#bcd9fa" stroke="#5a4431" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 21v-4.5a2.6 2.6 0 0 1 5.2 0V21zM23 21v-4.5a2.6 2.6 0 0 1 5.2 0V21z" fill="#eef7ff" stroke="#5a4431" stroke-width="1.3" stroke-linejoin="round"/><path d="M16.2 20l2.4-4M24.2 20l2.4-4" stroke="#fff" stroke-width="1" stroke-linecap="round"/><circle cx="21.5" cy="3.6" r="2.3" fill="#f7a3c0" stroke="#5a4431" stroke-width="1"/><circle cx="21.5" cy="3.6" r=".8" fill="#ffe066"/><path d="M5.5 24.2q1-1 2 0" fill="none" stroke="#5a4431" stroke-width="1" stroke-linecap="round"/><circle cx="6.6" cy="27" r="1.3" fill="#f6a9bd"/><circle cx="11" cy="31" r="4" fill="#5b5e67" stroke="#5a4431" stroke-width="1.6"/><circle cx="29" cy="31" r="4" fill="#5b5e67" stroke="#5a4431" stroke-width="1.6"/><circle cx="11" cy="31" r="1.5" fill="#fff"/><circle cx="29" cy="31" r="1.5" fill="#fff"/></svg>';
        out.push(h('h3', { class: 'shop-sec' }, '탈것'));
        out.push(h('div', { class: 'row pochette' }, svgSpan('pochette-art', CAR_ART), h('div', {}, h('div', { class: 't' }, T.name), h('div', { class: 'd' }, own ? '화면 오른쪽 위 자동차 버튼(C 키)으로 언제든 타고 내려요' : T.note)),
          own ? h('span', { class: 'lic-badge done' }, ico('check'), '가지고 있음') : priceBtn(T.price, s.money, after(() => handlers.buyTool('car')))));
      }
      // 산소 표백제(사이드스토리 '검은 별똥별'에서 찾아야 할 때만 판다)
      const bleach = handlers.bleachShop?.();
      if (bleach) {
        out.push(h('h3', { class: 'shop-sec' }, '생활'));
        out.push(h('div', { class: 'row pochette' }, svgSpan('pochette-art', itemSvg('bleach')),
          h('div', {}, h('div', { class: 't' }, itemInfo('bleach').name), h('div', { class: 'd' }, itemInfo('bleach').note)),
          bleach.have ? h('span', { class: 'lic-badge done' }, ico('check'), '가방에 있음') : priceBtn(bleach.price, s.money, after(() => handlers.buyBleach()))));
      }
      // 무기(4단계): 사면 바로 들고, 가진 무기는 바꿔 들거나 넣어 둔다
      // 무기는 토벌 자격증이 있어야 판다(없으면 값 대신 '자격증 필요'). 이미 가진 무기는 그대로 바꿔 든다
      const wp = weaponOf(s), hunter = hasLicense(s, 'hunter');
      out.push(h('h3', { class: 'shop-sec' }, '무기'));
      if (!hunter) out.push(h('p', { class: 'note warn' }, '무기는 토벌 자격증이 있어야 살 수 있어요. 검정소에서 따요(실기 때 무기는 빌려줘요).'));
      for (const id of WEAPON_ORDER) {
        const W = WEAPONS[id], own = wp.owned.includes(id), on = wp.held === id;
        let btn;
        if (!own) btn = hunter ? priceBtn(W.price, s.money, after(() => handlers.buyWeapon(id))) : h('span', { class: 'lic-badge' }, '자격증 필요');
        else if (!on) btn = h('button', { class: 'btn pink', type: 'button', onClick: after(() => handlers.holdWeapon(id)) }, '장착');
        else btn = h('button', { class: 'btn', type: 'button', onClick: after(() => handlers.holdWeapon(null)) }, '빼기');
        out.push(h('div', { class: `row pochette${on ? ' worn' : ''}` }, svgSpan('pochette-art', myWeaponArt(s, id)),
          h('div', {}, h('div', { class: 't' }, W.name, h('span', { class: 'power' }, '힘 ', '★'.repeat(Math.floor(W.dmg)), W.dmg % 1 ? h('span', { class: 'half' }, '★') : null), on ? h('span', { class: 'weed-count' }, '장착 중') : null), h('div', { class: 'd' }, W.note)),
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
        row('제초 검정', `지금 ${gradeName(s.license.grade)}`, b('올리기', () => handlers.dev.grade(1)), b('내리기', () => handlers.dev.grade(-1))),
        row('시각', timeLabel(s.clock), b('아침', () => handlers.dev.hour(8)), b('밤', () => handlers.dev.hour(22))),
        row('별똥별맨', '바로 보기(미리 보기라 소원은 안 이뤄져요)', h('button', { class: 'btn primary', type: 'button', onClick: () => { close(true); handlers.dev.starfall(); } }, '보기')),
        row('사이드스토리', '이야기마다 바로 시작하기', h('button', { class: 'btn primary', type: 'button', onClick: () => show('devStories') }, '열기')),
        ...['liquor', 'arbeiter', 'hunter'].map((id) => { const has = hasLicense(s, id); return row(LICENSES[id].name, has ? '있음' : '없음', b(has ? '없애기' : '따기', () => handlers.dev.license(id, !has), has ? 'btn' : 'btn primary')); }),
        // 그래픽 진단: 몬스터가 이상하게 보일 때 그 자리에서 복사해 알려 주면 원인을 찾을 수 있다
        row('그래픽 진단', '몬스터 근처에서 복사', h('button', { class: 'btn', type: 'button', onClick: (e) => {
          const text = handlers.diag(), btn = e.currentTarget;
          const done = (ok) => { btn.textContent = ok ? '복사했어요' : '복사 실패'; };
          (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(() => done(true), () => done(false)) : done(false));
          current.panel.querySelector('.diag-text')?.remove();
          btn.closest('.row').after(h('pre', { class: 'diag-text' }, text));
        } }, '복사')),
        h('p', { class: 'note' }, '마을폰 제목을 다시 다섯 번 누르면 이 앱이 숨어요.')];
    },
    // 테스트 앱 안의 '사이드스토리' 메뉴: 이야기마다 바로 시작하기(원작 순서). 부탁을 받은 채 그 자리 근처로 가면 보상까지, '장면만'은 보상 없이
    devStories() {
      const row = (t, d, ...btns) => h('div', { class: 'row dev-row' }, h('div', {}, h('div', { class: 't' }, t), h('div', { class: 'd' }, d)), h('div', { class: 'dev-btns' }, ...btns));
      const go = (label, fn, cls = 'btn') => h('button', { class: cls, type: 'button', onClick: () => { close(true); fn(); } }, label);
      const D = handlers.dev;
      return [appBar('사이드스토리', '테스트', 'dev'),
        h('p', { class: 'sub' }, '부탁을 받은 채로 그 자리 근처에 세워 줘요. 걸어 들어가면 보상까지, 장면만 보기는 보상 없이 바로.'),
        row('우사기의 집', '밤 9시 광장, 몰래 따라가기부터', go('시작', () => D.usagiHome(), 'btn primary')),
        row('우사기랑 클럽', '되풀이 이야기, 클럽 춤만 바로(보상 없음)', go('가기', () => D.club())),
        row('우사기의 피자호빵', '라멘 로우 새 메뉴 소식과 우사기 이야기 표시', go('띄우기', () => D.pizzaNews())),
        row('시사의 슈퍼 알바이터', '저녁 공부 또는 시험 날 검정소 앞', go('공부', () => D.shisaStudy()), go('시험', () => D.shisaExam())),
        row('하치와레가 구덩이에!', '숲 구덩이 앞에 덩굴풀 3개 들고', go('가기', () => D.hachiPit())),
        row('잠옷 밤나들이', '밤 9시 내 집 앞, 귀 달린 잠옷 입고', go('가기', () => D.pajama())),
        row('기운 안내', '기운 25로 광장 앞, 하치와레가 달려와 라멘 로우로', go('가기', () => D.tiredGuide())),
        row('집들이', '집을 산 다음 날 저녁 6시 반, 내 집 근처', go('가기', () => D.housewarm())),
        row('막대 과자 데이', '11월 10일 아침(장식, 가게, 친구 선물) 또는 11일 저녁 광장 앞', go('축제', () => D.stickDay()), go('파티', () => D.stickDay(true))),
        row('수상한 섬 합숙', '다음 날 아침 선착장 앞, 또는 동굴과 결전 장면부터(보상 없음)', go('선착장', () => D.island()), go('동굴', () => D.island('cave2')), go('결전', () => D.island('battle'))),
        row('파자마 파티즈', '밤 8시 광장 앞, 또는 무대만 바로(보상 없음)', go('광장', () => D.pajamaParty()), go('무대', () => D.pajamaParty('show'))),
        row('별 세 개', '저녁 7시 가게 앞, 또는 가게 안 장면만(보상 없음)', go('가게 앞', () => D.starDiner()), go('장면만', () => D.starDiner('show'))),
        row('검은 별똥별', '그 단계 앞에 시각과 되풀이 상태까지 맞춰서: 별밤 들판, 되돌아온 같은 아침, 밤 12시 전, 표백제 담그기, 비 오는 아침',
          go('들판', () => D.blackStar('wish')), go('같은 아침', () => D.blackStar('dejavu')), go('밤 12시', () => D.blackStar('watch')), go('담그기', () => D.blackStar('soak')), go('비', () => D.blackStar('rain'))),
        row('난토카바니아', '오전 11시 서쪽 숲 오솔길 앞, 또는 숲 장면만(보상 없음)', go('숲길', () => D.nantoka()), go('장면만', () => D.nantoka('show'))),
        row('위스키 봉봉', '오전 11시 숲길 옆 초콜릿 덩굴 앞, 또는 숲속 장면만(보상 없음)', go('덩굴 앞', () => D.whiskeyBonbon()), go('장면만', () => D.whiskeyBonbon('show'))),
        row('하치와레의 카메라', '오전 11시 광장 남쪽, 사진 찍은 다음 날 하치와레 옆(뽑은 사진), 또는 광장 장면만(보상 없음)',
          go('광장', () => D.hachiCamera('plaza')), go('뽑은 사진', () => D.hachiCamera('prints')), go('장면만', () => D.hachiCamera('show'))),
        row('스위치', '오전 10시 바위산 동굴 앞, 셋째 날 우사기 옆(이빨), 갑옷 씨와 상담한 뒤 동굴 앞, 또는 장면만(보상 없음)',
          go('동굴 앞', () => D.beetleSwitch('open')), go('이빨', () => D.beetleSwitch('teeth')), go('마지막', () => D.beetleSwitch('finale')),
          go('처음 장면', () => D.beetleSwitch('show')), go('마지막 장면', () => D.beetleSwitch('showEnd'))),
        row('오데와 함께 감옥', '열흘째 오전 11시 숲속 빈터 근처(가까이 가면 오데, 말을 걸면 시작하고 보상까지), 또는 장면만(보상 없음): 처음부터, 땅 파기부터, 오데와 고블린들의 싸움부터, 모몽가',
          go('빈터', () => D.odePrison('spot')), go('처음 장면', () => D.odePrison('show')), go('땅 파기', () => D.odePrison('dig')), go('싸움', () => D.odePrison('fight')), go('모몽가', () => D.odePrison('momonga'))),
        row('몸이 바뀌었다', '오전 10시 숲 어귀 게임센터 앞(걸어 들어가면 시작), 바뀐 몸으로 라멘 로우 앞, 다음 날 우는 치이카와 옆, 메달을 숨긴 우사기 옆, 되돌리러 게임센터 앞(보상까지), 또는 장면만(보상 없음)',
          go('게임센터', () => D.bodySwap('slot')), go('라멘', () => D.bodySwap('ramen')), go('울음', () => D.bodySwap('cry')), go('메달', () => D.bodySwap('chase')), go('되돌리기', () => D.bodySwap('back')),
          go('처음 장면', () => D.bodySwap('show')), go('되돌리기 장면', () => D.bodySwap('showBack')))];
    },
    // 마을폰 '낚시 도감' 앱(게임 오리지널): 맨 위에 가짓수 보상(받기), 물고기마다 그림 · 잡히는 곳 · 때 · 잡은 수 · 가장 큰 것.
    // 못 잡아 본 물고기는 그림자와 '???'(잡히는 곳 · 때는 힌트로 보인다)
    fishdex(s) {
      const log = fishLogOf(s), got = dexCount(s), claimed = fishPrizeOf(s);
      const out = [appBar('낚시 도감', `${got} / ${DEX_FISH.length}종`)];
      out.push(h('div', { class: 'dex-prizes' }, ...DEX_PRIZES.map((p) => {
        const done = claimed.includes(p.n), ready = !done && got >= p.n;
        return h('div', { class: `dex-prize${done ? ' done' : ready ? ' ready' : ''}` },
          h('b', {}, p.n === DEX_FISH.length ? '모든 물고기' : `${p.n}종`),
          h('span', { class: 'dp-money' }, svgSpan('coin', COIN), won(p.money)),
          done ? h('span', { class: 'dp-note' }, '받았어요')
            : ready ? h('button', { class: 'btn primary', type: 'button', onClick: after(() => handlers.claimFishDex(p.n)) }, '받기')
              : h('span', { class: 'dp-note' }, `${p.n - got}종 더`));
      })));
      for (const id of DEX_FISH) {
        const F = FISH[id], rec = log[id], when = F.night ? '밤에만' : F.day ? '낮에만' : null;
        out.push(h('div', { class: `row mon-card fish-card${rec ? '' : ' unseen'}` },
          svgSpan('mon-ico', itemSvg(id)),
          h('div', {},
            h('div', { class: 't' }, rec ? F.name : '???', h('span', { class: 'weed-count' }, rec ? `${rec.n}마리` : '아직')),
            h('div', { class: 'mon-chips' }, chip('pin', '', F.waters.map(waterName).join(', ')), when ? chip(null, 'muted', when) : null,
              rec && rec.best ? chip(null, 'muted', `가장 큰 것 ${rec.best}cm`) : null, rec ? chip(null, 'muted', `팔면 ${fishPrice(id, F.cm[0]).toLocaleString('ko-KR')} ~ ${won(fishPrice(id, F.cm[1]))}`) : null)))); // 크기에 따라(가장 작은 것 ~ 가장 큰 것)
      }
      return out;
    },
    // 마을폰 '풀 도감' 앱: 급수별로 풀 그림 · 자라는 곳 · 요령 · 뽑은 수(못 뽑는 급수는 흐리게)
    weeds(s) {
      const log = s.weedLog || {}, grade = s.license.grade;
      const found = WEED_ORDER.filter((k) => log[k] > 0).length;
      const out = [appBar('풀 도감', `${found} / ${WEED_ORDER.length}종`),
        h('p', { class: 'sub' }, `지금 ${gradeName(grade)}`)];
      for (const g of [NOVICE, 5, 4, 3, 2, 1]) {
        const open = grade <= g;
        out.push(h('div', { class: `weed-grade${open ? '' : ' locked'}` }, h('b', {}, g >= NOVICE ? '누구나 뽑는 풀' : `${g}급 풀`), open ? null : h('span', {}, `${g}급부터`)));
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
      // 새로 생긴 앱(지도를 막 샀을 때)은 아이콘이 빛나고 빨간 점(handlers.appNudge → 앱 이름, 열면 사라진다)
      const nudge = handlers.appNudge ? handlers.appNudge() : null;
      const app = (cls, icon, label, onClick) => h('button', { class: `app ${cls}${nudge === cls ? ' nudge' : ''}`, type: 'button', onClick, 'aria-label': nudge === cls ? `${label} (새로 생겼어요)` : null },
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
          app('multi', APP_ICON.multi, '같이 놀기', () => show('multi')),
          app('monsters', APP_ICON.monsters, '몬스터 도감', () => show('monsters')),
          hasTool(s, 'rod') || Object.keys(fishLogOf(s)).length ? app('fishdex', APP_ICON.fishdex, '낚시 도감', () => show('fishdex')) : null,
          handlers.searchApp?.() ? app('search', APP_ICON.search, '검색', () => show('search')) : null,
          devOn() ? app('dev', APP_ICON.dev, '테스트', () => show('dev')) : null,
          // 메인(타이틀)으로: 진행은 저장되고, 새로 하고 싶으면 타이틀의 '새로 시작하기'
          app('exit', APP_ICON.exit, '메인으로', () => { close(true); handlers.toTitle(); })),
      ];
    },
    // 마을폰 '검색' 앱(사이드스토리 '검은 별똥별' 동안만): 질문 게시판에서 찾은 글 하나 → 산소 표백제
    search() {
      return [appBar('검색'),
        h('div', { class: 'search-box' }, svgSpan('search-ico', APP_ICON.search), h('span', {}, '검은 별똥별 없애는 법')),
        h('div', { class: 'qa-card' },
          h('div', { class: 'qa-q' }, h('b', {}, 'Q'), h('span', {}, '자명종에 까만 별똥별이 붙었어요. 밤 12시만 되면 시곗바늘을 거꾸로 돌려서 같은 날만 계속돼요… 어떡하죠?')),
          h('div', { class: 'qa-a' }, h('b', {}, 'A'), h('span', {}, '산소 표백제를 푼 물에 그 물건을 푹 담가 보세요. 저희 집 시계에 붙었던 것도 그렇게 하니까 떠났어요!')),
          h('div', { class: 'qa-meta' }, '채택된 답변, 도움돼요 128')),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', onClick: () => handlers.searchFound?.() }, '이거다!'), closeBtn())];
    },
    // 마을폰 '설정' 앱: 효과음 · 배경음악 켜고 끄기, 절전 모드, 저장 안내
    options(s, extra) {
      const snd = handlers.getSound();
      const sw = (label, desc, on, flip) => h('div', { class: 'row opt-row' },
        h('div', {}, h('div', { class: 't' }, label), h('div', { class: 'd' }, desc)),
        h('button', { class: `switch${on ? ' on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': label, onClick: after(flip) },
          h('i', { 'aria-hidden': 'true' }), h('span', {}, on ? '켜짐' : '꺼짐')));
      const toggle = (kind, label, desc) => sw(label, desc, !!snd[kind], () => handlers.toggleSound(kind));
      return [appBar('설정'),
        h('h3', { class: 'shop-sec' }, '소리'),
        toggle('sfx', '효과음', '버튼, 풀 뽑기, 몬스터 소리'),
        toggle('music', '배경음악', '오르골 느낌의 마을 음악'),
        h('h3', { class: 'shop-sec' }, '화면'),
        sw('절전 모드', '초당 30번만 그려서 휴대폰이 덜 뜨거워져요', !!handlers.getPowerSave(), () => handlers.togglePowerSave()),
        h('h3', { class: 'shop-sec' }, '저장'),
        h('p', { class: 'phone-note' }, extra.storage == null || extra.storage ? '진행은 이 브라우저에 자동 저장돼요' : '저장이 꺼져 있어서 창을 닫으면 진행이 사라져요'),
        // PC ↔ 휴대폰 · 홈 화면 앱처럼 저장 공간이 다른 곳으로 옮길 때
        h('div', { class: 'save-io' },
          h('button', { class: 'btn', type: 'button', onClick: () => openSaveIO('out') }, '내보내기'),
          h('button', { class: 'btn', type: 'button', onClick: () => openSaveIO('in') }, '불러오기')),
        h('p', { class: 'note' }, '다른 기기로 옮기거나 홈 화면 앱을 지우기 전에 내보내기 코드를 받아 두세요')];
    },
    // 마을폰 '저장 옮기기': 설정에서 고른 쪽(내보내기 · 불러오기)
    saveio(s) {
      return saveMode === 'in' ? saveImport() : saveExport(s);
    },
    /**
     * 마을폰 '같이 놀기': 동물의 숲처럼 내 마을 문을 열면 친구가 내 마을 코드로 놀러 오고, 나도 친구 마을 코드로 놀러 간다.
     * 진행은 각자 기기에 있고, 서버는 움직임 · 한마디와 주인 마을의 모습만 나눈다(서버 주소는 고정이라 보이지 않는다).
     * handlers.multi = { state(), draft(key, v), toggleGate(), visit(), goHome(), copy(), say(text) }
     */
    multi() {
      const M = handlers.multi, st = M.state(), busy = st.status === 'connecting';
      const opened = st.status === 'open', away = st.visiting;
      const says = () => [h('h3', { class: 'shop-sec' }, '한마디'),
        h('div', { class: 'mp-says' }, MP_SAYS.map((t) => h('button', { class: 'btn', type: 'button', onClick: () => { M.say(t); close(); } }, t)))];
      // 친구 이름 + 연결: 핸드폰끼리 바로(왕복 ms) · 잇는 중 · 서버를 거쳐서(조금 느리다)
      const linkText = (l) => (!l ? '' : l.mode === 'direct' ? `바로 연결${l.rtt != null ? ` ${Math.round(l.rtt)}ms` : ''}` : l.mode === 'trying' ? '잇는 중' : '서버 거쳐서');
      const chips = (list, empty) => list.length ? h('div', { class: 'mp-players' }, list.map((p) => h('span', { class: 'chip' }, p.name,
        p.link ? h('small', { class: `mp-link ${p.link.mode}` }, linkText(p.link)) : null))) : h('p', { class: 'note' }, empty);
      const out = [appBar('같이 놀기')];
      if (st.status === 'error') out.push(h('p', { class: 'note warn' }, st.error));
      // 친구 마을에 놀러 와 있다: 같이 있는 친구 · 한마디 · 집으로
      if (away) {
        const host = st.hostName || '친구';
        out.push(h('p', { class: 'phone-note' }, busy ? '연결을 다시 잇는 중…' : `${host}의 마을에 놀러 와 있어요`),
          h('h3', { class: 'shop-sec' }, '같이 있는 친구'), chips(st.players, '아무도 없어요'),
          ...says(),
          h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', onClick: () => M.goHome() }, '집으로 돌아가기')));
        return out;
      }
      // 내 마을 코드: 문을 열면 친구가 이 코드로 놀러 온다
      out.push(h('h3', { class: 'shop-sec' }, '내 마을 코드'),
        h('div', { class: 'mp-code' },
          h('b', { class: 'mp-code-text', 'aria-label': `내 마을 코드 ${[...(st.myCode || '')].join(' ')}` }, st.myCode || '------'),
          h('button', { class: 'btn', type: 'button', onClick: () => M.copy() }, '복사')));
      // 마을 문: 스위치로 열고 닫는다(열려 있으면 놀러 온 친구 · 한마디)
      const hosting = busy && st.role === 'host', visitingNow = busy && st.role === 'guest';
      out.push(h('div', { class: 'row opt-row mp-gate' },
        h('div', {}, h('div', { class: 't' }, '마을 문 열기'),
          h('div', { class: 'd' }, opened ? '친구가 내 마을 코드로 놀러 올 수 있어요' : hosting ? '문을 여는 중…' : '열면 친구가 내 마을 코드로 놀러 올 수 있어요')),
        h('button', { class: `switch${opened ? ' on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(opened), 'aria-label': '마을 문 열기', disabled: visitingNow, onClick: () => M.toggleGate() },
          h('i', { 'aria-hidden': 'true' }), h('span', {}, opened ? '열림' : '닫힘'))));
      if (opened) {
        out.push(h('h3', { class: 'shop-sec' }, '놀러 온 친구'), chips(st.players, '아직 아무도 안 왔어요'), ...says());
        return out;
      }
      // 친구 마을 놀러 가기: 친구가 알려 준 마을 코드
      const inp = h('input', { class: 'name-input mp-input', value: st.code || '', placeholder: '예: K7QX2M', maxlength: 6, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': '친구 마을 코드' });
      inp.addEventListener('input', () => M.draft('code', inp.value)); // 다시 그려도 넣던 글이 남게
      out.push(h('h3', { class: 'shop-sec' }, '친구 마을 놀러 가기'), inp,
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', disabled: busy, onClick: () => M.visit() }, visitingNow ? '가는 중…' : '놀러 가기')),
        h('p', { class: 'note' }, '친구가 문을 열어 두었을 때만 놀러 갈 수 있어요'));
      return out;
    }
  };

  return {
    isOpen: () => !!current,
    /** 지금 떠 있는 창 이름('bag' · 'settings' …, 없으면 null). */
    openKind: () => current?.kind ?? null,
    /** 마을폰을 보고 있는지(폰을 볼 때는 시간이 계속 흐른다). */
    isPhone: () => !!current?.phone,
    /** 매 프레임: 폰 상태 줄 시각을 흐르는 시간에 맞춘다. */
    tick(s) {
      if (!current?.phone || !s) return;
      const t = timeLabel(s.clock);
      if (current.status.time.textContent !== t) current.status.time.textContent = t;
      // 지도를 보는 동안 같이 놀기 파티원 자리를 0.5초마다 새로
      if (current.view && current.view.setMates && handlers.mapMates) {
        const now = performance.now();
        if (!current.matesAt || now - current.matesAt > 500) { current.matesAt = now; current.view.setMates(handlers.mapMates()); }
      }
    },
    close: () => close(),
    openBoard: () => show('board'),
    openExam: () => show('exam'),
    openGuidebook: () => show('guidebook'), // 토벌 안내서(시험 전 검정관이 펼쳐 준다)
    openRecipes: (extra) => show('recipes', extra), // 레시피 북({ back: 'exam' } 이면 검정소로 돌아간다)
    openShop: () => show('shop'),
    openLicenses: () => show('licenses'),
    openFurniture: () => show('furniture'),
    openRealty: () => show('realty'),
    openPochette: () => show('pochette'),
    openPub: () => show('pub'),
    openBag: () => show('bag'),
    /** 친구에게 줄 물건 고르기(주머니를 선물 모드로): giftTo = { kind, name }. 고르면 handlers.giveGift(id). */
    openGift: (giftTo) => show('bag', { giftTo }),
    openWardrobe: () => show('wardrobe'),
    /** 집 보관 상자(꺼내기 탭부터). */
    openStorage: () => show('storage'),
    openBooks: () => show('books'),
    openSalon: () => show('salon'),
    openTools: () => show('tools'),
    openRaffle: () => show('raffle'),
    openWorks: () => show('works'),
    openMap: () => show('map'),
    openWeeds: () => show('weeds'),
    openMonsters: () => show('monsters'),
    openQuests: () => show('quests'),
    openSettings: (extra) => show('settings', extra),
    /** 지금 그 창(kind)이 떠 있으면 다시 그린다(같이 놀기 연결 상태가 바뀌었을 때). */
    refresh: (kind) => { if (current && current.kind === kind) render(); }
  };
}
