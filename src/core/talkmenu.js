/**
 * 친구에게 말 걸 때 고를 거리 정리: 늘 쓰는 것(부탁 · 이야기 · 그만하기)은 바로 보이고, 나머지는 묶음 둘로 접는다.
 *  together '같이 뭐 하자!': 같이 놀기 · 토벌 가기 · 집에 놀러 가기 · 집 놀이 · 간식 · 한 잔 · 술 공부
 *  errand   '볼일이 있는데…': 선물 · 포셰트 구경 · 돈 빌리기 · 갚기 · 하룻밤 재워 주기
 * 묶음에 하나뿐이면 접지 않고 그대로 보인다. 묶음은 바로 보이는 것들 뒤에, 맨 끝은 늘 '아무것도 아니야'(bye).
 */
export const TALK_GROUPS = {
  together: { label: '같이 뭐 하자!', keys: ['play', 'snub', 'party', 'visit', 'homeact', 'snack', 'drink', 'study'] },
  errand: { label: '볼일이 있는데…', keys: ['gift', 'shop', 'borrow', 'repay', 'lodge'] }
};
/** 묶음 안 목록 끝의 되돌아가기. */
export const BACK = '아니다, 다른 거!';

const groupOf = (key) => Object.keys(TALK_GROUPS).find((g) => TALK_GROUPS[g].keys.includes(key));

/** [[열쇠, 글]](main.js 의 talkTo 가 만든 순서) → { top: 처음 보일 [[열쇠, 글]], groups: { 'grp:묶음': [[열쇠, 글]] } } */
export function talkMenu(opts) {
  const plain = [], folded = [], groups = {};
  for (const o of opts) if (o[0] !== 'bye' && !groupOf(o[0])) plain.push(o);
  for (const g of Object.keys(TALK_GROUPS)) {
    const list = opts.filter(([k]) => groupOf(k) === g);
    if (list.length === 1) folded.push(list[0]);
    else if (list.length > 1) { groups['grp:' + g] = list; folded.push(['grp:' + g, TALK_GROUPS[g].label]); }
  }
  return { top: [...plain, ...folded, ...opts.filter(([k]) => k === 'bye')], groups };
}

/** 묶음을 골랐을 때 친구가 하는 말(말투대로). */
const SUB_ASK = {
  together: { chiikawa: '…응! 뭐 할까…?', hachiware: '좋아~ 뭐 하고 놀까?', usagi: '야하!', momonga: '…흥, 같이 해 줄 수도 있고.', kurimanju: '하아~ 뭐 할래?', rakko: '…뭘 하고 싶지?' },
  errand: { chiikawa: '…응…? 뭔데…?', hachiware: '응, 뭔데?', usagi: '하아?', momonga: '뭔데? 빨리 말해.', kurimanju: '하아~ 뭔데?', rakko: '…말해 봐.' }
};
export function subAsk(kind, group) {
  const g = String(group).replace(/^grp:/, ''), lines = SUB_ASK[g] || SUB_ASK.errand;
  return lines[kind] || (g === 'together' ? '뭐 할까?' : '응, 뭔데?');
}
