import { itemInfo, countOf, takeItem } from './inventory.js';
import { FRIENDS, giftBond, friendOf, hearts } from './friends.js';
import { sellPrice } from './market.js';
import { addToPantry } from './pantry.js';

/**
 * 친구에게 선물(말 걸기 → '선물 줄게' → 주머니에서 고르기): 가방 물건 하나를 친구 가방(pantry.js)에 넣고 친밀도가 오른다.
 * 한 친구에게 하루 한 번(friends 의 gotDay). 오르는 점수(GIFT_PTS)는 그 친구 취향(좋아함 · 보통 · 싫어함)과 물건 값(노동 접수 매입가)으로 정한다:
 * 좋아하는 비싼 물건일수록 많이, 보통 물건은 값이 나가야 조금, 싫어하는 물건은 하나도 안 오르고 친구가 버린다(main):
 * 솔직한 친구(TOSS_NOW: 모몽가 · 우사기)는 그 자리에서 바로, 착한 친구들은 웃으며 받아 가방에 넣어 두었다가 내가 없을 때 몰래.
 * 선물 점수는 이야기 · 놀기의 하루 상한(DAY_CAP)과 따로 센다.
 */

/** 친구마다 좋아하는 물건(생김새 · 성격대로). */
export const LIKES = {
  chiikawa: ['tissue', 'cookies', 'candy', 'fruitbasket', 'hotpot', 'plazaflower'], // 울보라 휴지가 늘 필요하다 · 원작에서 추첨으로 받은 전골 세트 · 광장 꽃(마을 가꾸기)
  hachiware: ['starshard', 'cookies', 'riceball', 'berry'],
  usagi: ['sweetroot', 'clover', 'pizzabun', 'riceball', 'katsucurry'], // 토끼라 당근 · 토끼풀, 먹성 좋아 든든한 음식
  momonga: ['bigacorn', 'candy', 'cookies', 'starshard', 'pearl', 'glowfluff', 'plazaflower'], // 날다람쥐라 도토리, 응석받이라 단것 · 반짝이는 것 · 예쁜 꽃
  kurimanju: ['bottlebeer', 'jellybake', 'jelly', 'shellsoup', 'bonbon'], // 술꾼이라 위스키 든 초콜릿도
  rakko: ['shellsoup', 'pearl', 'hotpot', 'horn'], // 해달이라 조개 · 진주, 토벌 고수라 전리품 뿔
  shisa: ['shellsoup', 'katsucurry', 'pizzabun', 'hotpot'],
  kani: ['shell', 'pearl', 'lilypad', 'starshard'],
  pochette: ['wool', 'fluffdown', 'starshard', 'pearl'], // 만들 재료
  labor: ['tissue', 'riceball', 'bottlebeer'],
  ramen: ['shellsoup', 'katsucurry', 'reed'],
  captain: ['kingcap', 'hotpot', 'bark']
};
/** 친구마다 싫어하는 물건(성격대로): 겁 많은 치이카와는 무서운 것, 깔끔쟁이 모몽가는 흙 묻은 것, 요리하는 사람은 독 있는 것. */
export const DISLIKES = {
  chiikawa: ['spore', 'poisonweed', 'thorny', 'horn'],
  hachiware: ['poisonweed', 'spore'],
  usagi: ['tissue', 'rockmoss', 'weed'],
  momonga: ['weed', 'clover', 'tissue', 'bark', 'rockmoss'],
  kurimanju: ['candy', 'tissue'],
  rakko: ['candy', 'jelly'],
  shisa: ['poisonweed', 'spore'],
  kani: ['spore', 'thorny'],
  pochette: ['bark', 'rockmoss', 'spore'],
  labor: ['poisonweed'],
  ramen: ['poisonweed', 'spore'],
  captain: ['candy', 'tissue']
};
export const loves = (kind, id) => (LIKES[kind] || []).includes(id);
/** 싫어하는 선물을 그 자리에서 바로 버리는 친구(성격이 솔직하다). 나머지는 받아 두었다가 몰래 버린다. */
export const TOSS_NOW = ['momonga', 'usagi'];
export const tossesNow = (kind) => TOSS_NOW.includes(kind);
/** 그 친구의 취향: 'love' 좋아함 · 'hate' 싫어함 · 'ok' 보통. */
export const tasteOf = (kind, id) => (loves(kind, id) ? 'love' : (DISLIKES[kind] || []).includes(id) ? 'hate' : 'ok');

/** 물건 값(노동 접수 매입가)으로 정한 선물 점수: [이 값 이상, 좋아함 점수, 보통 점수] — 값이 큰 것부터 본다. */
export const GIFT_PTS = [[1000, 6, 2], [300, 4, 2], [100, 3, 1], [30, 2, 1], [0, 2, 0]];
/** 선물 하나로 오르는 친밀도(싫어하면 0). */
export function giftPoints(kind, id) {
  const taste = tasteOf(kind, id);
  if (taste === 'hate') return 0;
  const [, love, ok] = GIFT_PTS.find(([min]) => sellPrice(id) >= min);
  return taste === 'love' ? love : ok;
}

/** 줄 수 있는 물건인지(퀘스트 물건은 안 된다). */
export function canGift(id) {
  const info = itemInfo(id);
  return !!info && info.kind !== 'quest';
}

/**
 * 하나를 준다: 내 가방에서 빠지고 친구 가방에 들어간다. 바로 버리는 친구(TOSS_NOW)가 싫어하는 물건이면 가방에 넣지 않고 tossNow(main 이 그 자리에 버리게 한다).
 * → { ok, reason?: 'none' | 'today', state, taste, love, tossNow, gained, hearts, up, gift(선물 가구) }
 */
export function giveGift(state, kind, id, day) {
  const taste = FRIENDS[kind] ? tasteOf(kind, id) : 'ok';
  if (!FRIENDS[kind] || !canGift(id) || countOf(state, id) <= 0) return { ok: false, reason: 'none', state, taste, love: false };
  if (friendOf(state, kind).gotDay === day) return { ok: false, reason: 'today', state, taste, love: taste === 'love' };
  let s = takeItem(state, id, 1, false).state;
  const tossNow = taste === 'hate' && tossesNow(kind);
  if (!tossNow) s = addToPantry(s, kind, id, 1).state; // 착한 친구는 싫어도 일단 받아 둔다(나중에 몰래 버린다)
  const b = giftBond(s, kind, giftPoints(kind, id), day);
  return { ok: true, state: b.state, taste, love: taste === 'love', tossNow, gained: b.gained, hearts: b.hearts ?? hearts(friendOf(b.state, kind)), up: b.up, gift: b.gift };
}

/**
 * 받았을 때 하는 말: love(좋아하는 것) · ok(그 밖의 것) · hate(싫어하는 것 — 성격대로 살짝 싫은 티) · cap(오늘은 벌써 받았다)
 * · toss(싫은 걸 버리며 — 모몽가 · 우사기는 내 앞에서 대놓고, 착한 친구들은 아무도 없을 때 몰래).
 */
const SAY = {
  chiikawa: { love: '…!! 이거… 나 줘도 돼…? (반짝반짝)', ok: '…고, 고마워…! 헤헤…', cap: '…오, 오늘은 벌써 받았어… 다음에…!',
    hate: '…!? …이, 이건… 좀 무서워… (울먹울먹)', toss: '(두리번두리번…) …미안해… (살짝 내려놓는다)' },
  hachiware: { love: '우와~ 진짜?! 이거 엄청 좋아해! 고마워~!', ok: '헤헤, 고마워~! 잘 쓸게!', cap: '오늘은 벌써 받았는걸~ 다음에 줘!',
    hate: '음… 고마워~ 근데 이건 나한테는 좀 안 맞을지도…?', toss: '(주위를 살피더니 살짝) …미안해~' },
  usagi: { love: '야하~~!!', ok: '우라!', cap: '우라~ (고개를 절레절레)',
    hate: '…하아? (킁킁 냄새를 맡더니 얼굴을 찡그린다)', toss: '(휙 던져 버린다) 우라!' },
  momonga: { love: '…흥! 뭐, 받아 줄게. (꼬리를 살랑살랑)', ok: '이게 뭐야? …그래도 받아 둘게. 흥!', cap: '오늘은 됐어! 흥!',
    hate: '이게 뭐야?! 이런 걸 나한테 주는 거야? 흥!', toss: '필요 없어! (바닥에 툭 던진다)' },
  kurimanju: { love: '하아~ 이거 딱 좋네~ 고마워', ok: '하아~ 고마워', cap: '하아~ 오늘은 이걸로 충분해~',
    hate: '하아~… 이건 좀… 안주로는 안 되겠네…', toss: '하아~ (아무도 없지…? 살짝…)' },
  rakko: { love: '…좋은 걸 주는군. 고맙다.', ok: '…고맙다.', cap: '…마음만 받겠다. 오늘은 충분하다.',
    hate: '…이건 필요 없다. 마음만 받지.', toss: '…(아무도 없는 걸 확인하고 조용히 내려놓는다)' },
  shisa: { love: '와아~! 이거 정말 좋아해요! 감사합니다~!', ok: '헤헤, 고마워요~!', cap: '오늘은 벌써 받았어요~ 다음에 주세요!',
    hate: '에… 이건 가게에 둘 수가 없어요… 죄송해요!', toss: '(가게 뒤에 살짝…) 죄송해요…' },
  kani: { love: '…딱딱! (신나서 집게를 딱딱)', ok: '…딱. (꾸벅)', cap: '…딱. (고개를 젓는다)',
    hate: '…딱. (집게로 살짝 밀어낸다)', toss: '…딱. (몰래 내려놓는다)' },
  pochette: { love: '어머나~ 좋은 재료네요! 고마워요~', ok: '어머, 고마워요~', cap: '오늘은 마음만 받을게요~',
    hate: '어머… 이건 재료로 쓰기엔 좀… 미안해요~', toss: '(몰래 살짝…) 미안해요~' },
  labor: { hate: '앗… 이건 좀… 게시판에 붙일 수도 없고요…', toss: '(아무도 안 보죠…?) 살짝~' },
  ramen: { hate: '어… 이건 주방에 둘 수가 없어요~', toss: '(가게 뒤에 슬쩍…)' },
  captain: { hate: '흠흠… 그래도 마음은 받아 두지.', toss: '흠흠. (아무도 없을 때 슬쩍)' }
};
const DEFAULT_SAY = { love: '오오, 이거 좋아하는 건데! 고맙네!', ok: '고맙네!', cap: '오늘은 충분하네. 마음만 받지!', hate: '음… 이건 좀…', toss: '이건 여기 두지…' };
export const giftLine = (kind, k) => (SAY[kind] && SAY[kind][k]) || DEFAULT_SAY[k];
