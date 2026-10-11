import { addItem, registerItems } from './inventory.js';
import { addMoney, restoreStamina } from './state.js';
import { raffleOf } from './raffle.js';
import { befriend } from './friends.js';
import { hourOf } from './clock.js';

/**
 * 별똥별이 쏟아지는 밤(원작: 별똥별에 소원을 빌다가 진짜 별똥별이 떨어져 '별똥별맨'이 나타난 이야기).
 * 둘째 날부터 며칠에 한 번, 밤 STAR_FROM ~ 새벽 STAR_UNTIL 시에 별똥별이 흐르고, 하룻밤에 한 번 소원을 빌 수 있다.
 * 소원은 시시하게 조금만 이루어지고 별똥별맨이 '별 조각'을 남긴다. state.starfall = { day: 마지막으로 소원을 빈 날 }.
 */
export const STAR_FROM = 20, STAR_UNTIL = 2, STARFALL_EVERY = 3;
export const WISH_MONEY = 77, WISH_STAMINA = 20;

export const WISHES = [
  { id: 'rich', label: '부자가 되게 해 주세요' },
  { id: 'full', label: '라멘을 배 터지게 먹게 해 주세요' },
  { id: 'friends', label: '친구들이랑 오래오래 놀게 해 주세요' },
  { id: 'luck', label: '행운이 오게 해 주세요' }
];

export const STAR_ITEMS = {
  starshard: { name: '별 조각', kind: 'misc', note: '별똥별맨이 남기고 간 반짝이는 조각. 셋을 모아 포셰트 가게에 가면 머리핀으로 만들어 준대요.' }
};
registerItems(STAR_ITEMS);

/** 그날 밤 별똥별이 쏟아지는지(날마다 같은 답). 첫날은 아직. */
export function isStarfallNight(day) {
  if (!(day >= 2)) return false;
  let x = Math.imul(day ^ 0x5bd1e995, 0x27d4eb2d); // 날짜를 고루 섞어(딱 사흘마다처럼 기계적이지 않게)
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x ^= x >>> 13;
  return (x >>> 0) % STARFALL_EVERY === 0;
}

/** 별똥별이 흐르는 시각(밤 8시 ~ 새벽 2시, 하루는 아침 6시에 바뀌니 같은 날 밤). */
export const isStarHour = (hour) => hour >= STAR_FROM || hour < STAR_UNTIL;

/** 지금 소원을 빌 수 있는지: 별똥별 밤 · 그 시각 · 오늘 밤 아직 안 빌었고 첫날 안내가 끝났을 때. */
export function canWish(state) {
  const day = state.clock.day;
  return isStarfallNight(day) && isStarHour(hourOf(state.clock)) && (!state.starfall || state.starfall.day !== day)
    && (!state.tutorial || state.tutorial === 'done');
}

/**
 * 소원을 빈다: 시시하게 조금 이루어지고 별 조각 하나. nearKinds: 옆에서 같이 본 친구들(친구 소원이면 하트).
 * → { ok, state, wish, gained: 하트가 오른 친구들 }
 */
export function makeWish(state, wishId, nearKinds = []) {
  const wish = WISHES.find((w) => w.id === wishId);
  if (!wish || !canWish(state)) return { ok: false, state, gained: [] };
  const day = state.clock.day;
  let s = { ...state, starfall: { day } };
  const gained = [];
  if (wishId === 'rich') s = addMoney(s, WISH_MONEY);
  else if (wishId === 'full') s = restoreStamina(s, WISH_STAMINA);
  else if (wishId === 'luck') { const r = raffleOf(s); s = { ...s, raffle: { ...r, tickets: r.tickets + 1 } }; }
  else if (wishId === 'friends') {
    for (const kind of nearKinds) {
      const r = befriend(s, kind, 'watch', day); // 같이 별을 본 날(하트는 하루 상한 안에서)
      s = r.state;
      if (r.gained > 0) gained.push(kind);
    }
  }
  s = addItem(s, 'starshard', 1).state;
  return { ok: true, state: s, wish, gained };
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** 저장된 별똥별 기록 모양 검사(save.js). */
export const isValidStarfall = (sf) => !!sf && typeof sf === 'object' && num(sf.day);
