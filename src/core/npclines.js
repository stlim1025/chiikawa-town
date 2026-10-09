/**
 * 친구마다 말투가 다른 일 · 시험 · 토벌 · 같이 토벌 대사. 말풍선 한 줄이라 짧게 쓰고, 문장을 '.' · '·' 로 잇지 않는다.
 * 목록이면 하나를 고른다. {title} 일감 이름, {mon} 몬스터 이름, {pay} '+120원' 같은 보수를 채운다.
 *
 * 치이카와: 겁 많고 말이 짧다(…! · 히잉 · 우와앙), 그래도 열심히 한다
 * 하치와레: 밝고 긍정적(어떻게든 될 거야~), 노래하고 남을 북돋운다
 * 우사기: 소리로만 말한다(우라! · 야하! · 하아? · 후랏)
 * 쿠리만쥬: 느긋한 어른, 하아~ 한숨, 맥주와 안주
 * 랏코: 말수 적은 최고 랭커 검사(훗 · …수련이다)
 * 모몽가: 까칠하고 제멋대로(흥!), 일도 토벌도 안 한다
 */
export const NPC_LINES = {
  chiikawa: {
    jobTake: ['{title}…! 해 볼게…', '…할 수 있어…!'],
    jobSoldOut: '앗… 없어졌다…',
    sticker: '(꾹꾹…)',
    pull: ['영차…!', '…뽑았다!', '흐읏…!'],
    berry: ['하나…!', '…♪'],
    jobDone: ['와아… {pay}', '…해냈다! {pay}'],
    jobFail: '…히잉 다 못 했어…',
    eat: '(후루룩…) …♪',
    napWake: '…개운해…!',
    examGo: '(덜덜) …시험…',
    examPass: '…붙었다…!! 우와아앙…',
    examFail: '…히잉… 또 떨어졌다…',
    huntGo: '…무섭지만 다녀올게…!',
    huntSoldOut: '앗… 토벌 일감 없다…',
    huntCry: ['…얏!', '에잇…!', '(덜덜) …해냈다?'],
    huntDone: '…살았다… {pay}',
    huntFail: '…히잉 못 잡았어…',
    // 같이 토벌
    partyJoin: '…같이…! 가자…!',
    partyHearts: '…아, 아직 좀… 무서워…',
    partyMyLicense: '…토벌 자격증… 있어야 돼…',
    partyLicense: '…나 아직 자격증 없어…',
    partyNight: '…졸려… 밤엔 무서워…',
    partyTired: '…힘들어… 오늘은 못 가…',
    partyBusy: '…지금 일하는 중…!',
    partyFull: '…자리가 없어…',
    partyCry: ['…얏!', '에잇…!', '…해냈다!'],
    partyLeave: '…수고했어…!',
    partyTiredLeave: '…힘들어… 먼저 갈게…',
    partyNightLeave: '…졸려… 이제 갈게…',
    partyFaint: '…괜찮아…?!'
  },
  hachiware: {
    jobTake: ['{title}! 맡겨 줘~', '{title}! 내가 할게~'],
    jobSoldOut: '앗 늦었다~ 다음에 받자!',
    sticker: '스티커 붙이기~ ♪',
    pull: ['영차~ 하나 더!', '쑥~! ♪', '풀 뽑기는 즐거워~'],
    berry: ['하나 땄다~ ♪', '맛있어 보여~'],
    jobDone: ['오늘도 해냈다~! {pay}', '보수다~ {pay}'],
    jobFail: '다 못 했다~ 일감은 돌려놓을게',
    eat: '역시 라멘이 최고야~',
    napWake: '푹 잤다~ 다시 힘내자!',
    examGo: '공부한 대로만 하자~!',
    examPass: '해냈다~! 토벌 자격증이다!',
    examFail: '아깝다~ 다음엔 붙을 거야!',
    huntGo: ['{mon} 잡으러 가자~!', '어떻게든 될 거야~!'],
    huntSoldOut: '토벌 일감이 다 나갔네~',
    huntCry: ['에잇!', '해냈다~!', '좋았어~!'],
    huntDone: '토벌 성공~! {pay}',
    huntFail: '오늘은 안 됐다~ 내일 또 하자!',
    partyJoin: '좋아~ 같이 가자!',
    partyHearts: '음~ 조금 더 친해지면 같이 가자!',
    partyMyLicense: '토벌 자격증부터 따 오자~!',
    partyLicense: '나도 아직 자격증이 없어~',
    partyNight: '이제 밤이야~ 내일 가자!',
    partyTired: '오늘은 너무 지쳤어~ 다음에!',
    partyBusy: '지금 하던 거 끝내고 가자~!',
    partyFull: '벌써 꽉 찼네~ 다음에 끼워 줘!',
    partyCry: ['에잇!', '우리가 해냈다~!', '좋았어~!'],
    partyLeave: '재밌었다~ 또 같이 가자!',
    partyTiredLeave: '휴~ 나 먼저 쉴게!',
    partyNightLeave: '벌써 밤이네~ 들어가자!',
    partyFaint: '괜찮아?! 마을로 가자!'
  },
  usagi: {
    jobTake: '야하!',
    jobSoldOut: '하아?!',
    sticker: '(척척척)',
    pull: ['우라!', '야하!', '후랏!'],
    berry: ['(냠)', '야하~'],
    jobDone: ['우라~! {pay}', '야하! {pay}'],
    jobFail: '하아…',
    eat: '(후루루루룩!)',
    napWake: '후랏!',
    examGo: '(끄적끄적) …우라?',
    examPass: '우라~!! 우라!!',
    examFail: '하아?!',
    huntGo: '이야~하!',
    huntSoldOut: '하아?',
    huntCry: ['우라!', '야하!', '이야~하!', '후랏!'],
    huntDone: '야하~! {pay}',
    huntFail: '하아…',
    partyJoin: '야하~!',
    partyHearts: '…하아?',
    partyMyLicense: '하아? (자격증!)',
    partyLicense: '……하아',
    partyNight: '(하품)',
    partyTired: '하아…',
    partyBusy: '하아? (일하는 중)',
    partyFull: '하아?',
    partyCry: ['우라!', '야하!', '이야~하!'],
    partyLeave: '우라!',
    partyTiredLeave: '하아…',
    partyNightLeave: '(하품)',
    partyFaint: '하아?!'
  },
  kurimanju: {
    jobTake: '{title}… 슬슬 해 볼까~',
    jobSoldOut: '하아~ 한발 늦었네…',
    sticker: '하아~ 끝나면 한 잔이다…',
    pull: ['하아~ 허리야…', '영차…'],
    berry: ['안주로 딱이네~', '하아~ 잘 익었다'],
    jobDone: ['하아~ 맥줏값 벌었다 {pay}', '하아~ {pay}'],
    jobFail: '하아~ 오늘은 여기까지…',
    eat: '하아~ 라멘엔 맥주인데…',
    napWake: '하아~ 개운하다…',
    examGo: '하아~ 시험 끝나면 한 잔이다',
    examPass: '하아~ 붙었다… 축하주다!',
    examFail: '하아~ 한 잔 하고 잊자…',
    huntGo: '하아~ 다녀와서 한 잔 해야지',
    huntSoldOut: '하아~ 토벌 일감이 없네',
    huntCry: ['하아~ 끝!', '안주 거리다~', '하아~'],
    huntDone: '하아~ 오늘은 내가 쏜다 {pay}',
    huntFail: '하아~ 오늘은 공쳤다…',
    partyJoin: '하아~ 가 볼까',
    partyHearts: '하아~ 같이 한 잔부터 하자고',
    partyMyLicense: '하아~ 자격증부터 따 와',
    partyLicense: '하아~ 나 아직 자격증이 없어',
    partyNight: '하아~ 이 시간엔 한 잔이지',
    partyTired: '하아~ 오늘은 쉬어야겠어',
    partyBusy: '하아~ 이것만 끝내고…',
    partyFull: '하아~ 자리가 꽉 찼네',
    partyCry: ['하아~ 끝!', '안주 거리다~'],
    partyLeave: '하아~ 수고했어 한 잔 하자고',
    partyTiredLeave: '하아~ 지쳤다… 먼저 간다',
    partyNightLeave: '하아~ 한 잔 하러 가야지',
    partyFaint: '하아~ 무리했네…'
  },
  rakko: {
    jobTake: '…이것도 수련이다',
    jobSoldOut: '…늦었군',
    sticker: '…집중',
    pull: ['…하앗', '뿌리까지 단번에', '훗'],
    berry: ['…훗', '…잘 익었군'],
    jobDone: '…받아 두지 {pay}',
    jobFail: '…수련이 부족했다',
    eat: '…맛있군',
    napWake: '…다시 수련이다',
    examGo: '…집중한다',
    examPass: '…당연하다',
    examFail: '…다시 온다',
    huntGo: ['…다녀오지', '{mon}… 벤다'],
    huntSoldOut: '…늦었군',
    huntCry: ['하앗!', '훗', '…베었다'],
    huntDone: '…토벌 완료 {pay}',
    huntFail: '…놓쳤군',
    partyJoin: '…따라와라',
    partyHearts: '…아직 실력을 모른다',
    partyMyLicense: '…자격증 없는 자와는 못 간다',
    partyLicense: '…',
    partyNight: '…밤길은 위험하다',
    partyTired: '…오늘은 숨을 고르겠다',
    partyBusy: '…지금은 할 일이 있다',
    partyFull: '…자리가 없군',
    partyCry: ['하앗!', '훗', '…베었다'],
    partyLeave: '…수고했다',
    partyTiredLeave: '…여기까지다',
    partyNightLeave: '…오늘은 여기까지다',
    partyFaint: '…무리하지 마라'
  },
  momonga: {
    eat: '맛있어! 더 줘!',
    napWake: '흥 잘 잤어'
  }
};
/** 친구 말투가 없을 때(다른 마을 사람). */
const PLAIN = {
  jobTake: '{title}! 할게요', jobSoldOut: '앗 벌써 다 나갔네', sticker: '스티커 붙이는 중', pull: ['영차!'], berry: ['하나 땄다'],
  jobDone: '보수 받았다 {pay}', jobFail: '다 못 했다', eat: '라멘 맛있다~', napWake: '잘 쉬었다!',
  examGo: '시험 보는 중…', examPass: '붙었다!', examFail: '떨어졌다…', huntGo: '다녀올게!', huntSoldOut: '토벌 일감이 없네',
  huntCry: ['얏!'], huntDone: '토벌 끝! {pay}', huntFail: '못 잡았다…',
  partyJoin: '같이 가자!', partyHearts: '조금 더 친해지면…', partyMyLicense: '토벌 자격증이 있어야 해', partyLicense: '자격증이 없어',
  partyNight: '밤엔 위험해', partyTired: '오늘은 지쳤어', partyFull: '자리가 꽉 찼어', partyBusy: '지금 하던 거 끝내고', partyCry: ['얏!'], partyLeave: '수고했어!',
  partyTiredLeave: '먼저 쉴게', partyNightLeave: '이제 들어갈게', partyFaint: '괜찮아?!'
};

/** 그 친구의 그 대사 한 줄(목록이면 하나 골라서 {title} · {mon} · {pay} 를 채운다). */
export function lineOf(kind, key, vars = {}, random = Math.random) {
  const own = NPC_LINES[kind] && NPC_LINES[kind][key];
  const L = own != null ? own : PLAIN[key];
  if (L == null) return '';
  const s = Array.isArray(L) ? L[Math.floor(random() * L.length) % L.length] : L;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')).replace(/\s+$/, '');
}
