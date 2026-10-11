import { itemInfo, countOf, takeItem } from './inventory.js';
import { FRIENDS, befriendBy } from './friends.js';

/**
 * 친구에게 선물(말 걸기 → '선물 줄게' → 주머니에서 고르기): 가방 물건 하나를 주면 친밀도가 오른다.
 * 좋아하는 물건(LIKES)이면 LOVE_PTS, 아니면 GIFT_PTS. 일상 친밀도처럼 한 친구와 하루 DAY_CAP 점까지라(friends.js),
 * 그날 상한이 찼으면 받지 않고 물건도 그대로 둔다('cap').
 */
export const LOVE_PTS = 2;
export const GIFT_PTS = 1;

/** 친구마다 좋아하는 물건. */
export const LIKES = {
  chiikawa: ['tissue', 'cookies', 'candy', 'fruitbasket'], // 울보라 휴지가 늘 필요하다
  hachiware: ['starshard', 'cookies', 'riceball', 'berry'],
  usagi: ['pizzabun', 'riceball', 'hotpot', 'katsucurry'],
  momonga: ['candy', 'cookies', 'starshard', 'pearl'],
  kurimanju: ['bottlebeer', 'jellybake', 'jelly', 'shellsoup'],
  rakko: ['fruitbasket', 'cookies', 'hotpot', 'horn'],
  shisa: ['shellsoup', 'katsucurry', 'pizzabun', 'hotpot'],
  kani: ['shell', 'pearl', 'lilypad', 'starshard'],
  pochette: ['wool', 'fluffdown', 'starshard', 'pearl'], // 만들 재료
  labor: ['tissue', 'riceball', 'bottlebeer'],
  ramen: ['shellsoup', 'katsucurry', 'reed'],
  captain: ['kingcap', 'hotpot', 'bark']
};
export const loves = (kind, id) => (LIKES[kind] || []).includes(id);
/** 줄 수 있는 물건인지(퀘스트 물건은 안 된다). */
export function canGift(id) {
  const info = itemInfo(id);
  return !!info && info.kind !== 'quest';
}

/** 하나를 준다. → { ok, reason?: 'none' | 'cap', state, love, gained, hearts, up, gift(선물 가구) } */
export function giveGift(state, kind, id, day) {
  if (!FRIENDS[kind] || !canGift(id) || countOf(state, id) <= 0) return { ok: false, reason: 'none', state, love: false };
  const love = loves(kind, id), b = befriendBy(state, kind, love ? LOVE_PTS : GIFT_PTS, day);
  if (b.gained <= 0) return { ok: false, reason: 'cap', state, love };
  return { ok: true, state: takeItem(b.state, id, 1, false).state, love, gained: b.gained, hearts: b.hearts, up: b.up, gift: b.gift };
}

/** 받았을 때 하는 말: love(좋아하는 것) · ok(그 밖의 것) · cap(오늘은 많이 받아서 사양). */
const SAY = {
  chiikawa: { love: '…!! 이거… 나 줘도 돼…? (반짝반짝)', ok: '…고, 고마워…! 헤헤…', cap: '…오, 오늘은 벌써 많이 받았어… 다음에…!' },
  hachiware: { love: '우와~ 진짜?! 이거 엄청 좋아해! 고마워~!', ok: '헤헤, 고마워~! 잘 쓸게!', cap: '오늘은 벌써 많이 받았는걸~ 다음에 줘!' },
  usagi: { love: '야하~~!!', ok: '우라!', cap: '우라~ (고개를 절레절레)' },
  momonga: { love: '…흥! 뭐, 받아 줄게. (꼬리를 살랑살랑)', ok: '이게 뭐야? …그래도 받아 둘게. 흥!', cap: '오늘은 됐어! 흥!' },
  kurimanju: { love: '하아~ 이거 딱 좋네~ 고마워', ok: '하아~ 고마워', cap: '하아~ 오늘은 이걸로 충분해~' },
  rakko: { love: '…좋은 걸 주는군. 고맙다.', ok: '…고맙다.', cap: '…마음만 받겠다. 오늘은 충분하다.' },
  shisa: { love: '와아~! 이거 정말 좋아해요! 감사합니다~!', ok: '헤헤, 고마워요~!', cap: '오늘은 벌써 많이 받았어요~ 다음에 주세요!' },
  kani: { love: '…딱딱! (신나서 집게를 딱딱)', ok: '…딱. (꾸벅)', cap: '…딱. (고개를 젓는다)' },
  pochette: { love: '어머나~ 좋은 재료네요! 고마워요~', ok: '어머, 고마워요~', cap: '오늘은 마음만 받을게요~' }
};
const DEFAULT_SAY = { love: '오오, 이거 좋아하는 건데! 고맙네!', ok: '고맙네!', cap: '오늘은 충분하네. 마음만 받지!' };
export const giftLine = (kind, k) => (SAY[kind] && SAY[kind][k]) || DEFAULT_SAY[k];
