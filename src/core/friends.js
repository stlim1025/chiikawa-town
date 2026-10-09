import { homeOf } from './home.js';
import { VILLAGERS, villagerOf, villagerSpend, payVillager } from './villagers.js';

/**
 * 마을 친구들: 이름표(대화 상자의 이름과 색), 같이 놀 수 있는지(play), 많이 친해지면 주는 선물 가구(gift).
 * 친밀도는 state.friends[kind] = { pts, talk: 마지막으로 이야기한 날, play: 마지막으로 논 날, gift: 선물을 줬는지 }.
 * 이야기는 하루에 한 번 +1, 놀기는 하루에 한 번 +2. 3점마다 하트 하나(최대 5개), 하트 3개가 되면 선물.
 */
export const FRIENDS = {
  chiikawa: { name: '치이카와', tag: '#ffd6e2', ink: '#8a3b52', play: true, gift: 'cushion' },
  hachiware: { name: '하치와레', tag: '#a9d4f2', ink: '#2f5577', play: true, gift: 'plant' },
  usagi: { name: '우사기', tag: '#f8e7a6', ink: '#7a5a12', play: true, gift: 'lamp' },
  momonga: { name: '모몽가', tag: '#cfe6f7', ink: '#2f5577', play: false, gift: 'doll' }, // 성격이 까칠해서 같이 놀아 주지 않는다
  kurimanju: { name: '쿠리만쥬', tag: '#ecc9a2', ink: '#6b4020', play: true, gift: 'stove' },
  rakko: { name: '랏코', tag: '#dcc8b0', ink: '#5a3d22', play: true, gift: 'rug' },
  shisa: { name: '시사', tag: '#ffd27a', ink: '#7a4a10', play: false, gift: 'table' },
  kani: { name: '카니', tag: '#ffc9d2', ink: '#8a2f45', play: false, gift: 'shelf' },
  pochette: { name: '포셰트 갑옷 씨', tag: '#dfe3e8', ink: '#4a5058', play: false, gift: null },
  labor: { name: '노동 갑옷 씨', tag: '#e6dccb', ink: '#5a4a34', play: false, gift: null },
  ramen: { name: '라멘 갑옷 씨', tag: '#f2e2a6', ink: '#6a5420', play: false, gift: null },
  captain: { name: '대장 갑옷 씨', tag: '#f3d27a', ink: '#6a4a10', play: false, gift: null }
};

/**
 * '이야기하자'를 고르면 나누는 대화(친구마다 여러 개 중 하나). {name} 은 내 이름으로 바뀐다.
 */
export const CHATS = {
  chiikawa: [
    ['…!', '{name}… 오늘 풀 많이 뽑았어…?', '나는… 세 개 뽑았어… 히잉…'],
    ['배고파…', '라멘 로우 라멘… 진짜 맛있어…', '다음에… 같이 먹으러 가자…!'],
    ['…있잖아…', '밤에 별 보는 거… 좋아해…', '…♪']
  ],
  hachiware: [
    ['{name}! 마을 생활은 좀 익숙해졌어?', '처음엔 다 어려워. 나도 그랬는걸~', '천천히 하면 돼! 뭐든 할 수 있어!'],
    ['나 요즘 노래 연습하고 있어~', '언젠가 사람들 앞에서 부르고 싶거든.', '그때 꼭 들으러 와 줘!'],
    ['치이카와랑 우사기랑 소풍 가고 싶다~', '도시락은 내가 쌀게!', '{name}도 같이 갈래?']
  ],
  usagi: [
    ['우라!', '야하! 야하!', '(뭔가 신나 보인다)'],
    ['하아?', '……', '우라~! (가 버릴 것 같다가 다시 돌아왔다)'],
    ['이야~하!', '(풀을 한 움큼 들어 보인다)', '야하!']
  ],
  momonga: [
    ['왜 자꾸 말 걸어?', '할 말 있으면 빨리 해.', '없어? 그럼 저리 가! 흥!'],
    ['{name}, 맛있는 거 가져왔어?', '없어? 그럼 왜 왔는데?!', '다음엔 빈손으로 오지 마. 흥!'],
    ['너 지갑 좀 두툼하다?', '…아, 아무것도 아니야!', '쳐다보지 마! 흥!']
  ],
  kurimanju: [
    ['하아~', '오늘 하루도 수고했어.', '이따가 맛있는 안주 만들 건데… 하아~'],
    ['구운 거 좋아해?', '겉은 바삭, 속은 촉촉… 그게 최고지.', '하아~ 생각만 해도 행복해.']
  ],
  rakko: [
    ['…수련 중이다.', '강해지려면 매일 조금씩 쌓아야 한다.', '너도 게을리하지 마라.'],
    ['풀 뽑기도 수련이다.', '힘을 주는 때와 빼는 때를 알아야 하지.', '…초록 칸을 잘 봐라.']
  ],
  shisa: [
    ['어서 오세요~! 라멘 로우입니다!', '저는 아직 수행 중이지만, 사부님 라멘은 최고예요!', '언제든 먹으러 오세요~'],
    ['가게 앞은 늘 깨끗하게!', '사부님이 그러셨어요. 청소도 요리의 시작이라고!', '오늘도 열심히 할게요!']
  ],
  kani: [
    ['…책 읽고 있었어.', '헌책방 책은 냄새가 좋아…', '딱딱.'],
    ['…{name}도 책 좋아해?', '…다음에 재밌는 거 골라 줄게.', '딱.']
  ],
  pochette: [
    ['어머, 어서 와~', '포셰트 신상이 들어왔어. 하나같이 귀엽지?', '천천히 구경하고 가~'],
    ['다들 잘 지내니?', '마을이 북적북적해서 좋아~', '또 놀러 와!']
  ],
  labor: [
    ['일감은 게시판에 있어요!', '빠른 사람이 임자! 다 하면 여기서 보수를 받아요.', '오늘도 힘냅시다!'],
    ['갑옷이 좀 덥긴 하지만…', '일할 땐 이게 제일 든든해요.', '후우~']
  ],
  ramen: [
    ['어서 오세요~', '오늘 국물 진~하게 우렸어요.', '기운 없으면 라멘이 최고예요!'],
    ['면은 삶는 시간이 생명이에요.', '1초만 늦어도 달라지거든요.', '흠흠, 오늘도 완벽!']
  ],
  captain: [
    ['흠흠.', '승급 시험은 깔끔하게 연속 다섯 번이다.', '규칙은 규칙이다.'],
    ['풀 뽑기를 우습게 보지 마라.', '마을이 깨끗한 건 다 너희 덕분이다.', '…흠흠, 수고가 많다.']
  ]
};

export const HEART_PTS = 3;
export const MAX_HEARTS = 5;
export const GIFT_HEARTS = 3;
const GAIN = { talk: 1, play: 2, drink: 2, home: 2 }; // drink: 맥주집에서 쿠리만쥬와 건배, home: 친구 집에서 같이 놀기(낮잠 · 노래 · 수련 …)

/** 그 친구와의 친밀도(처음 보면 0). */
export function friendOf(state, kind) {
  return (state.friends && state.friends[kind]) || { pts: 0, talk: 0, play: 0, gift: false };
}

/** 하트 개수(0..5). */
export function hearts(f) {
  return Math.min(MAX_HEARTS, Math.floor(f.pts / HEART_PTS));
}

/**
 * 이야기하거나(talk) 놀았을 때(play) · 같이 건배했을 때(drink) · 친구 집에서 같이 놀았을 때(home). 같은 날 같은 일은 한 번만 친밀도가 오른다.
 * 하트가 GIFT_HEARTS 개가 되면 그 친구의 선물 가구가 집에 들어온다(한 번만).
 * → { state, gained, hearts, up(하트가 늘었는지), gift: 가구 id | null }
 */
export function befriend(state, kind, action, day) {
  const f = friendOf(state, kind), field = GAIN[action] ? action : 'talk';
  if (f[field] === day) return { state, gained: 0, hearts: hearts(f), up: false, gift: null };
  const next = { ...f, pts: f.pts + GAIN[field], [field]: day };
  let s = state, gift = null;
  const giftId = FRIENDS[kind] && FRIENDS[kind].gift;
  if (giftId && !next.gift && hearts(next) >= GIFT_HEARTS) {
    gift = giftId;
    next.gift = true;
    const home = homeOf(s);
    s = { ...s, home: { ...home, owned: { ...home.owned, [giftId]: (home.owned[giftId] || 0) + 1 } } };
  }
  s = { ...s, friends: { ...(state.friends || {}), [kind]: next } };
  return { state: s, gained: GAIN[field], hearts: hearts(next), up: hearts(next) > hearts(f), gift };
}

const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
/** 가위바위보: 내가 낸 것 a, 친구가 낸 것 b → 'win' | 'lose' | 'draw'. */
export function rps(a, b) {
  if (a === b) return 'draw';
  return BEATS[a] === b ? 'win' : 'lose';
}

// ---------- 돈 빌리기: 하트를 꽉 채운 친구는 급할 때 돈을 빌려준다 ----------
/** 빌릴 수 있는 금액들(친구 지갑의 절반까지). */
const LOAN_STEPS = [50, 100, 200, 300];
/** 그 친구에게 빌린 돈(없으면 0). */
export function debtOf(state, kind) {
  return friendOf(state, kind).debt || 0;
}
/** 빌릴 수 있는지: 지갑이 있는 마을 친구 · 하트 최대 · 갚지 않은 돈이 없음. */
export function canBorrow(state, kind, day) {
  if (!VILLAGERS[kind] || debtOf(state, kind) > 0) return false;
  return hearts(friendOf(state, kind)) >= MAX_HEARTS && loanOptions(state, kind, day).length > 0;
}
/** 지금 빌려줄 수 있는 금액들. */
export function loanOptions(state, kind, day) {
  if (!VILLAGERS[kind]) return [];
  const half = villagerOf(state, kind, day).money / 2;
  return LOAN_STEPS.filter((a) => a <= half);
}
/** 빌린다: 친구 지갑에서 내 지갑으로, 갚을 돈이 남는다. */
export function borrow(state, kind, amount, day) {
  const f = friendOf(state, kind);
  const s = villagerSpend({ ...state, money: state.money + amount }, kind, amount, day);
  return { ...s, friends: { ...(s.friends || {}), [kind]: { ...f, debt: amount, debtDay: day } } };
}
/** 갚는다(한 번에 다). { ok, state, reason: 'none' | 'money' } */
export function repay(state, kind) {
  const debt = debtOf(state, kind);
  if (!debt) return { ok: false, reason: 'none', state };
  if (state.money < debt) return { ok: false, reason: 'money', state };
  const f = friendOf(state, kind);
  const day = (state.villagers && state.villagers[kind] && state.villagers[kind].day) || f.debtDay || 0; // 친구의 그날 일한 수는 그대로
  const s = payVillager({ ...state, money: state.money - debt }, kind, debt, day);
  return { ok: true, state: { ...s, friends: { ...(s.friends || {}), [kind]: { ...f, debt: 0 } } } };
}

/** 저장된 친밀도 모양이 맞는지(save.js 검사). */
/** 그날 한 일(간식 얻어먹기처럼 친밀도와 상관없는 것)을 적어 둔다. → state */
export function markDay(state, kind, field, day) {
  const f = friendOf(state, kind);
  return { ...state, friends: { ...(state.friends || {}), [kind]: { ...f, [field]: day } } };
}

export function isValidFriends(fr) {
  if (!fr || typeof fr !== 'object' || Array.isArray(fr)) return false;
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  return Object.entries(fr).every(([kind, f]) => FRIENDS[kind] && f && num(f.pts) && f.pts >= 0 && num(f.talk) && num(f.play) && typeof f.gift === 'boolean'
    && (f.debt === undefined || (num(f.debt) && f.debt >= 0)) && ['drink', 'home', 'snack'].every((k) => f[k] === undefined || num(f[k])));
}
