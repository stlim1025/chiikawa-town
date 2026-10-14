import { FRIENDS } from './friends.js';
import { josa } from './weeding.js';

/**
 * 마을 친구들끼리의 말: 짝마다 다른 수다, 아무나 하는 잡담, 오늘 있었던 일 이야기와 소문, 들은 사람의 반응,
 * 나에게 먼저 다가와 하는 말, 취미 · 공연 · 축하 · 위로 대사, 친구 앱의 '오늘 마을 소식' 문장.
 * 말풍선 한 줄이라 짧게 쓰고 '.' · '·' 로 문장을 잇지 않는다. 우사기는 소리와 몸짓으로만 말한다.
 *
 * 사건(ev) = { type, who, with?, title?, mon?, n?, lic?, day, hour }
 *   meal 라멘(with 같이 먹은 친구) · chat 수다 · job 일감 끝 · hunt 토벌 일감 끝 · examPass / examFail 토벌 자격증 시험
 *   · sing 하치와레 공연(n 관객 수) · watch 공연 구경 · train 수련장 수련(with) · comfort 달래 줌 · congrats 축하해 줌
 *   · theft 모몽가 소매치기 · partyHunt 나와 같이 토벌 · playerBoss / playerRanker / playerLicense(lic) / playerWork(work) / playerHome(home) / playerDecor(item) 내가 한 큰일(who 'me')
 */

export const nameOf = (kind, me = '나') => (kind === 'me' ? me : FRIENDS[kind] ? FRIENDS[kind].name : kind);
const pick = (list, random = Math.random) => (Array.isArray(list) ? list[Math.floor(random() * list.length) % list.length] : list);
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? String(v[k]) : ''));

/** 짝 수다: 'a|b'(이름순) → 대본 여러 개. 대본 = [[말하는 친구, 대사], …] */
export const PAIR_TALK = {
  'chiikawa|hachiware': [
    [['hachiware', '치이카와~ 오늘 뭐 했어?'], ['chiikawa', '…풀 뽑았어…!'], ['hachiware', '대단해~! 나도 힘내야지!']],
    [['chiikawa', '…배고파…'], ['hachiware', '그럼 이따 라멘 먹으러 갈까~?'], ['chiikawa', '…!! 응!']],
    [['hachiware', '새 노래 만들었는데 들어 볼래?'], ['chiikawa', '…♪ 듣고 싶어…!'], ['hachiware', '♪ 라라라~']]
  ],
  'chiikawa|usagi': [
    [['usagi', '야하!'], ['chiikawa', '…우사기…! 안녕…'], ['usagi', '(빙글빙글 돈다)']],
    [['usagi', '우라?'], ['chiikawa', '…? 같이 가자고…?'], ['usagi', '야하~!']]
  ],
  'hachiware|usagi': [
    [['hachiware', '우사기! 오늘도 기운 넘치네~'], ['usagi', '우라!'], ['hachiware', '하하 나도 힘낼게~']],
    [['usagi', '(풀을 한 다발 내민다)'], ['hachiware', '와~ 고마워! 어디서 땄어?'], ['usagi', '야하!']]
  ],
  'chiikawa|momonga': [
    [['momonga', '야 치이카와! 나 귀엽지?'], ['chiikawa', '…으, 응…'], ['momonga', '흥! 당연하지!']],
    [['momonga', '그거 맛있어 보인다? 나 줘!'], ['chiikawa', '…히잉…']]
  ],
  'hachiware|momonga': [
    [['momonga', '하치와레! 나만 봐!'], ['hachiware', '하하 오늘도 귀엽네~'], ['momonga', '흥! 알면 됐어!']]
  ],
  'momonga|usagi': [
    [['momonga', '우사기 비켜!'], ['usagi', '하아?'], ['momonga', '…흥!']]
  ],
  'rakko|usagi': [
    [['rakko', '…우사기 기운이 좋군'], ['usagi', '우라!'], ['rakko', '…훗']],
    [['usagi', '(칼 휘두르는 흉내)'], ['rakko', '…자세는 나쁘지 않다'], ['usagi', '야하~!']]
  ],
  'chiikawa|rakko': [
    [['rakko', '…무기는 손질했나'], ['chiikawa', '…! 아, 아직…'], ['rakko', '…매일 조금씩이다']],
    [['chiikawa', '…랏코… 멋있어…'], ['rakko', '…훗']]
  ],
  'hachiware|rakko': [
    [['hachiware', '랏코 오늘도 수련해?'], ['rakko', '…매일 한다'], ['hachiware', '멋지다~ 나도 노래 연습 매일 해!']]
  ],
  'chiikawa|kurimanju': [
    [['kurimanju', '하아~ 안주 먹어 볼래?'], ['chiikawa', '…!! 먹을래…!'], ['kurimanju', '하아~ 맛있지?']]
  ],
  'hachiware|kurimanju': [
    [['hachiware', '쿠리만쥬 오늘 안주 뭐야~?'], ['kurimanju', '하아~ 군밤이지'], ['hachiware', '와 맛있겠다~']]
  ],
  'kurimanju|usagi': [
    [['usagi', '(킁킁 냄새를 맡는다)'], ['kurimanju', '하아~ 하나 먹어'], ['usagi', '야하!']]
  ],
  'kurimanju|rakko': [
    [['kurimanju', '하아~ 한 잔 어때'], ['rakko', '…수련 끝나고 하지'], ['kurimanju', '하아~ 기다릴게']]
  ],
  'kurimanju|momonga': [
    [['momonga', '그 안주 나 줘!'], ['kurimanju', '하아~ 하나만이다'], ['momonga', '흥! 두 개!']]
  ],
  'momonga|rakko': [
    [['momonga', '랏코! 나 칭찬해 봐!'], ['rakko', '……'], ['momonga', '흥! 재미없어!']]
  ]
};
/** 아무나 하는 잡담: 말 거는 쪽(open) · 받는 쪽(reply). */
export const SMALLTALK = {
  open: {
    chiikawa: ['…날씨 좋다…♪', '…배고파…', '…오늘 뭐 해…?'],
    hachiware: ['오늘 날씨 진짜 좋다~', '뭐 하고 있었어~?', '같이 놀자~!'],
    usagi: ['야하!', '우라?', '(빙글빙글 돈다)'],
    kurimanju: ['하아~ 오늘도 평화롭네', '하아~ 출출하지 않아?'],
    rakko: ['…수련은 하고 있나', '…오늘 바람이 좋군'],
    momonga: ['나 오늘 귀엽지?', '야! 나 좀 봐!', '심심해! 놀아 줘!']
  },
  reply: {
    chiikawa: ['…응…!', '…헤헤…♪', '…와아…'],
    hachiware: ['그치~!', '좋아 좋아~', '하하 그러게~'],
    usagi: ['야하~!', '우라!', '하아?'],
    kurimanju: ['하아~ 그렇지', '하아~ 좋네'],
    rakko: ['…그렇군', '…훗'],
    momonga: ['흥!', '당연하지!', '…뭐 그렇다 치고']
  }
};

/** 내가(그 친구가) 한 일을 이야기할 때(1인칭). {w} 같이 한 친구, {title} 일감, {mon} 몬스터, {n} 관객 수 */
const OWN = {
  meal: { chiikawa: '…아까 {w}랑 라멘 먹었어…♪', hachiware: '아까 {w}랑 라멘 먹었어~ 맛있었다!', usagi: '(라멘 먹는 흉내) 야하~', kurimanju: '하아~ {w}랑 라멘 한 그릇 했지', rakko: '…{w}와 라멘을 먹었다', momonga: '{w}랑 라멘 먹었어! 내가 더 귀여웠지!' },
  mealSolo: { chiikawa: '…라멘 먹었어…♪ 맛있었어…', hachiware: '라멘 먹고 왔어~ 든든하다!', usagi: '(배를 두드린다) 야하~', kurimanju: '하아~ 라멘 한 그릇 했지', rakko: '…라멘을 먹었다', momonga: '라멘 먹었어! 맛있었어!' },
  chat: { chiikawa: '…아까 {w}랑 이야기했어…♪', hachiware: '아까 {w}랑 수다 떨었어~', usagi: '(누군가 흉내를 낸다) 야하!', kurimanju: '하아~ {w}랑 이야기 좀 했지', rakko: '…{w}와 이야기를 나눴다', momonga: '{w}가 나 귀엽대! 흥!' },
  job: { chiikawa: '…오늘 {title} 했어…!', hachiware: '오늘 {title} 했어~ 보람차다!', usagi: '(풀 뽑는 흉내) 우라!', kurimanju: '하아~ 오늘 일 좀 했지', rakko: '…오늘 일도 수련이었다' },
  hunt: { chiikawa: '…{mon} 잡았어…! 무서웠어…', hachiware: '나 오늘 {mon} 잡았다~!', usagi: '(휘두르는 흉내) 이야~하!', kurimanju: '하아~ {mon} 잡고 왔지', rakko: '…{mon} 토벌했다' },
  examPass: { chiikawa: '…나 토벌 자격증 땄어…!!', hachiware: '나 토벌 자격증 땄어~!', usagi: '(자격증을 번쩍 든다) 우라!!', kurimanju: '하아~ 자격증 땄다고', rakko: '…당연한 결과다' },
  examFail: { chiikawa: '…시험 떨어졌어… 히잉…', hachiware: '시험 떨어졌어~ 다음엔 붙을 거야!', usagi: '하아…', kurimanju: '하아~ 떨어졌지 뭐야', rakko: '…다시 간다' },
  sing: { hachiware: '오늘 광장에서 노래했어! {n}명이나 들어 줬어~' },
  watch: { chiikawa: '…하치와레 노래 들었어…♪ 좋았어…', usagi: '(노래 흉내) 야하~', kurimanju: '하아~ 하치와레 노래 좋더라', rakko: '…하치와레의 노래 나쁘지 않았다', momonga: '하치와레 노래? 내가 더 잘해!' },
  train: { rakko: '…{w}와 수련했다', usagi: '(칼 휘두르는 흉내) 우라!' },
  buy: { chiikawa: '…나 {item} 샀어…! 헤헤…', hachiware: '나 {item} 샀다~! 모은 보람이 있어!', usagi: '(새 물건을 번쩍 들어 보인다) 야하!!', kurimanju: '하아~ {item} 하나 들였지', rakko: '…드디어 {item}이다 훗', momonga: '{item} 샀어! 부럽지? 흥!' },
  partyHunt: { chiikawa: '…같이 토벌해서… 든든했어…!', hachiware: '같이 토벌해서 재밌었다~!', usagi: '(같이 휘두르는 흉내) 우라!', kurimanju: '하아~ 같이 토벌하니 좋더라', rakko: '…같이 싸우니 나쁘지 않더군' }
};
/** 소문: '{who}가 ~했' 까지(끝맺음은 친구 말투로). */
const STEM = {
  meal: (e, N) => (e.with ? `${josa(N(e.who), '이/가')} ${josa(N(e.with), '이랑/랑')} 라멘 먹었` : `${josa(N(e.who), '이/가')} 라멘 먹었`),
  chat: (e, N) => (e.with ? `${josa(N(e.who), '이/가')} ${josa(N(e.with), '이랑/랑')} 수다 떨었` : null),
  job: (e, N) => `${josa(N(e.who), '이/가')} ${e.title || '일감'} 했`,
  hunt: (e, N) => `${josa(N(e.who), '이/가')} ${e.mon || '몬스터'} 잡았`,
  examPass: (e, N) => `${josa(N(e.who), '이/가')} 토벌 자격증 땄`,
  examFail: (e, N) => `${josa(N(e.who), '이/가')} 시험에 떨어졌`,
  sing: () => '하치와레가 광장에서 노래했',
  train: (e, N) => (e.with ? `${josa(N(e.who), '이/가')} ${josa(N(e.with), '이랑/랑')} 수련했` : `${josa(N(e.who), '이/가')} 수련했`),
  theft: () => '모몽가가 또 소매치기했',
  buy: (e, N) => `${josa(N(e.who), '이/가')} ${e.item || '새 물건'} 샀`,
  partyHunt: (e, N) => `${josa(N(e.who), '이/가')} ${josa(N('me'), '이랑/랑')} 같이 토벌했`,
  playerBoss: (e, N) => `${josa(N('me'), '이/가')} ${josa(e.boss || '왕버섯', '을/를')} 쓰러뜨렸`, // boss: 쓰러뜨린 보스 짧은 이름(없으면 이야기 속 왕버섯)
  playerRanker: (e, N) => `${josa(N('me'), '이/가')} 토벌 랭커가 됐`,
  playerLicense: (e, N) => `${josa(N('me'), '이/가')} ${e.lic || '자격증'} 땄`,
  playerWork: (e, N) => `${josa(N('me'), '이/가')} ${josa(e.work || '새 시설', '을/를')} 만들었`,
  playerHome: (e, N) => `${josa(N('me'), '이/가')} 집을 ${josa(e.home || '넓은 방', '으로/로')} 넓혔`,
  playerDecor: (e, N) => `${josa(N('me'), '이/가')} 방을 ${josa(e.item || '새 벽지', '으로/로')} 꾸몄`
};
/** 소문 끝맺음: 친구 말투. 우사기는 몸짓뿐. */
const GOSSIP = {
  chiikawa: (st) => `…있잖아 ${st}대…!`,
  hachiware: (st) => `있잖아~ ${st}대!`,
  usagi: () => '(무언가 열심히 흉내 낸다) 야하!',
  kurimanju: (st) => `하아~ ${st}대`,
  rakko: (st) => `…${st}다더군`,
  momonga: (st) => `${st}대 흥!`
};
/** 내가 한 큰일을 친구가 알고 먼저 말해 준다(2인칭). */
const PRAISE = {
  playerBoss: { chiikawa: '…{boss} 잡았다며…!! 대단해…!', hachiware: '{me}! {boss} 잡았다며?! 대단해~!', usagi: '(박수를 친다) 우라!!', kurimanju: '하아~ {boss} 잡았다며? 한 잔 해야지', rakko: '…{boss} 쓰러뜨렸다고 들었다 훗', momonga: '{boss}? 흥! 나도 할 수 있거든!' },
  playerRanker: { chiikawa: '…랭커…! 멋있어…!', hachiware: '랭커가 됐다며? 역시 {me}!', usagi: '(박수를 친다) 우라!!', kurimanju: '하아~ 랭커라니 대단하네', rakko: '…랭커가 됐군 기대하겠다', momonga: '랭커? 흥 운이 좋았네!' },
  playerLicense: { chiikawa: '…{lic} 땄다며…! 축하해…!', hachiware: '{lic} 땄다며? 축하해~!', usagi: '(박수를 친다) 야하!!', kurimanju: '하아~ {lic} 축하해', rakko: '…{lic}인가 잘했다', momonga: '{lic}? 흥 별거 아니네!' },
  playerWork: { chiikawa: '…{work} 생겼다…! {me} 덕분이야…!', hachiware: '{work} 봤어? {me} 덕분이래~ 고마워!', usagi: '(신나서 뛰어다닌다) 야하!!', kurimanju: '하아~ {work} 좋더라 고마워', rakko: '…{work}인가 좋은 일을 했군', momonga: '{work}? 흥 나쁘진 않네!' },
  playerHome: { chiikawa: '…집이 {home}이 됐다며…! 좋겠다…', hachiware: '{me}네 집 넓어졌다며? 놀러 갈래~!', usagi: '(두 팔을 활짝 벌린다) 우라!!', kurimanju: '하아~ 집들이는 언제야?', rakko: '…넓은 집이라 수련하기 좋겠군', momonga: '{home}? 흥 부럽지 않거든!' },
  playerDecor: { chiikawa: '…{item} 예쁘대…! 보고 싶어…', hachiware: '방 꾸몄다며? {item} 센스 좋다~', usagi: '(벽에 색칠하는 흉내) 야하!', kurimanju: '하아~ 방 꾸몄다며 분위기 좋겠네', rakko: '…방을 새로 꾸몄다고 들었다', momonga: '{item}? 흥 나쁘지 않은 선택이네' }
};
/** 이야기를 들은 친구의 반응(좋은 일 · 슬픈 일). */
const REACT = {
  good: { chiikawa: ['…와아…!', '…대단해…!', '…헤에…'], hachiware: ['우와~ 대단하다!', '진짜? 멋지다~', '헤에~ 그랬구나!'], usagi: ['야하!', '우라?', '하아~?'], kurimanju: ['하아~ 그렇구나', '하아~ 대단하네'], rakko: ['…그런가', '…훗', '…나쁘지 않군'], momonga: ['흥! 별거 아니네', '…흥 나도 할 수 있어', '그래서 뭐?'] },
  sad: { chiikawa: '…괜찮아…', hachiware: '다음엔 될 거야~!', usagi: '(토닥토닥)', kurimanju: '하아~ 그럴 때도 있지', rakko: '…다시 하면 된다', momonga: '흥 바보네' }
};
const SAD = new Set(['examFail', 'theft']);

/** 그 친구가 이 사건을 이야기하는 말(본인 일이면 1인칭, 아니면 소문). 할 말이 없으면 null. */
export function storyLine(kind, ev, me = '나', random = Math.random) {
  const N = (k) => nameOf(k, me);
  if (ev.who === 'me' && PRAISE[ev.type]) return null; // 내 일은 나에게만(praiseLine)
  if (ev.who === kind || ev.with === kind) {
    const w = ev.who === kind ? ev.with : ev.who;
    const type = ev.type === 'meal' && !w ? 'mealSolo' : ev.type;
    const own = OWN[type] && OWN[type][kind];
    if (!own) return null;
    if (/\{w\}/.test(own) && !w) return null; // 같이 한 친구 없이 혼자 한 일은 '{w}랑' 대사를 못 쓴다
    return fill(own, { w: w ? N(w) : '', title: ev.title || '일', mon: ev.mon || '몬스터', n: ev.n || 0, item: ev.item || '새 물건' });
  }
  const st = STEM[ev.type] && STEM[ev.type](ev, N);
  return st && GOSSIP[kind] ? GOSSIP[kind](st) : null;
}
/** 내가 한 큰일(playerBoss 등)을 친구가 나에게 말해 줄 때. */
export function praiseLine(kind, ev, me = '나') {
  const P = PRAISE[ev.type] && PRAISE[ev.type][kind];
  return P ? fill(P, { me, lic: ev.lic || '자격증', boss: ev.boss || '왕버섯', work: ev.work || '새 시설', home: ev.home || '넓은 방', item: ev.item || '새 벽지' }) : null;
}
/** 사건을 내 쪽에서 본 소문(친구가 내 이야기를 다른 친구에게 할 때). */
export function gossipLine(kind, ev, me = '나') {
  const st = STEM[ev.type] && STEM[ev.type](ev, (k) => nameOf(k, me));
  return st && GOSSIP[kind] ? GOSSIP[kind](st) : null;
}
/** 이야기를 들은 친구의 반응. */
export function reactLine(kind, ev, random = Math.random) {
  if (SAD.has(ev.type)) return REACT.sad[kind] || '…';
  return pick(REACT.good[kind] || ['…'], random);
}

/**
 * 두 친구의 수다 대본을 만든다. → { lines: [[kind, 대사], …], told: 전한 사건 | null }
 * news: 말 거는 친구(a)가 아는 오늘 일들(먼저 들려준다), random 으로 짝 수다 · 소문 · 잡담 중 하나.
 */
export function conversation(a, b, news = [], me = '나', random = Math.random) {
  const key = [a, b].sort().join('|');
  const pair = PAIR_TALK[key];
  const fresh = news.filter((e) => e.who !== b && e.with !== b && e.type !== 'chat');
  const roll = random();
  if (fresh.length && roll < 0.45) {
    const ev = fresh[Math.floor(random() * fresh.length) % fresh.length];
    const tell = ev.who === 'me' ? gossipLine(a, ev, me) : storyLine(a, ev, me, random);
    if (tell) return { lines: [[a, pick(SMALLTALK.open[a] || ['…'], random)], [a, tell], [b, reactLine(b, ev, random)]], told: ev };
  }
  if (pair && roll < 0.8) return { lines: pick(pair, random).map(([k, t]) => [k, t]), told: null };
  return { lines: [[a, pick(SMALLTALK.open[a] || ['…'], random)], [b, pick(SMALLTALK.reply[b] || ['…'], random)]], told: null };
}

/** 취미: 하는 곳 이름과 혼잣말. */
export const HOBBY = {
  pond: { where: '연못', icon: 'star', doing: '연못 구경', lines: ['(연못을 바라본다) …♪', '…물고기 있다…!', '…반짝반짝…'] },
  study: { where: '집 앞', icon: 'book', doing: '검정 공부', lines: ['(제초 검정 공부 중…)', '…외워야 돼…', '…히잉 어려워…'] },
  stars: { where: '광장', icon: 'star', doing: '별 구경', lines: ['…별이다…♪', '…반짝반짝…', '(하늘을 올려다본다)'] },
  sing: { where: '광장', icon: 'note', doing: '노래 공연', lines: ['♪ 라라라~', '♪ 어떻게든 될 거야~', '♪ 풀을 뽑자 영차영차~', '♪ 오늘도 좋은 날~'] },
  zoom: { where: '마을', icon: 'zap', doing: '뛰어다니기', lines: ['야하~!', '이야~하!', '후랏!', '우라라라!'] },
  snack: { where: '집 앞', icon: 'mug', doing: '안주 굽기', lines: ['하아~ 안주가 잘 구워졌다', '하아~ 바삭바삭', '(군밤을 굽는다)'] },
  dojo: { where: '수련장', icon: 'sword', doing: '수련', lines: ['하앗!', '…집중', '…아직이다', '훗'] },
  showoff: { where: '광장', icon: 'heart', doing: '귀여운 척', lines: ['나 귀엽지?!', '다들 나만 봐!', '(귀여운 척을 한다)'] }
};
/** 공연: 시작 · 관객 환호 · 끝 인사. */
export const SHOW = {
  start: '광장에서 노래할게~!',
  cheer: { chiikawa: ['…와아…♪', '(짝짝짝)'], usagi: ['야하~!', '(덩실덩실)'], kurimanju: ['하아~ 좋다', '(박수)'], rakko: ['…훗', '(조용히 박수)'], momonga: ['흥 나쁘지 않네', '내가 더 잘해!'] },
  thanks: '들어 줘서 고마워~!',
  thanksMe: '{me}도 들어 줬구나! 고마워~'
};
/** 랏코와 우사기의 수련장 수련 대본(둘 다 칼을 휘두른다). */
export const TRAIN_TALK = [['rakko', '…우사기 수련이다'], ['usagi', '우라!'], ['rakko', '하앗!'], ['usagi', '이야~하!'], ['rakko', '…좋다']];
/** 나에게 먼저 다가와서(할 이야기가 없을 때). {me} 내 이름 */
export const GREET_RUN = {
  chiikawa: ['…{me}…! (손을 흔든다)', '…{me}…! 안녕…♪'],
  hachiware: ['{me}~! 뭐 해?', '{me}! 마침 찾고 있었어~'],
  usagi: ['야하~!', '(달려와서 빙글빙글)'],
  kurimanju: ['하아~ {me} 왔네', '하아~ {me} 오늘도 수고해'],
  rakko: ['…{me} 수련은 하고 있나', '…{me} 무리하지 마라'],
  momonga: ['{me}! 나 못 본 척했지?!', '야! {me}! 나 귀엽지?']
};
/** 친한 친구가 가끔 주는 선물. */
export const GIFT = {
  chiikawa: { item: 'berry', n: 1, line: '…이거… 줄게…!' },
  hachiware: { item: 'berry', n: 2, line: '이거 너 줄게~!' },
  usagi: { item: 'berry', n: 3, line: '(열매를 한가득 내민다) 야하!' },
  kurimanju: { item: 'berry', n: 2, line: '하아~ 이거 먹어' },
  rakko: { item: 'horn', n: 1, line: '…토벌하다 주웠다 받아라' },
  momonga: { item: 'pearl', n: 1, line: '흥! 남아서 주는 거야!' }
};
/** 같이 라멘 먹자고 할 때. {w} 데려가는 친구 */
export const MEAL_INVITE = {
  chiikawa: '…{w}… 같이 라멘 먹을래…?', hachiware: '{w}! 라멘 먹으러 가자~', usagi: '(라멘 먹는 흉내) 야하?',
  kurimanju: '하아~ {w} 라멘 한 그릇 어때', rakko: '…{w} 라멘 먹으러 가지', momonga: '{w}! 라멘 먹자! 네가 사!'
};
/** 축하 · 위로 · 기절했을 때 달려와서 · 모몽가 소매치기를 봤을 때. */
export const CONGRATS = { chiikawa: '…축하해…!!', hachiware: '축하해~! 대단해!', usagi: '우라~!!', kurimanju: '하아~ 축하주다!', rakko: '…잘했다', momonga: '흥 축하해 줄게' };
/**
 * 돈 모으는 목표(core/goals.js) 이야기: 친구 앱에 띄우지 않고 '이야기하자'로 알게 된다. 모은 만큼(시작 · 절반 · 거의) 말이 달라진다.
 * 자격증은 사는 게 아니라 시험 볼 돈을 모은다. 우사기는 말 대신 그림 · 몸짓으로.
 */
const SAVING = {
  chiikawa: { start: '…{item} 사고 싶어서… 돈 모으는 중…!', half: '…{item}… 반쯤 모았어…!', almost: '…{item}… 거의 다 모았어…!!' },
  hachiware: { start: '요즘 {item} 사려고 열심히 일해~', half: '{item} 돈이 반쯤 모였어~!', almost: '{item}까지 조금만 더! 어떻게든 될 거야~' },
  usagi: { start: '({item} 그림을 그려 보인다) 야하!', half: '({item} 그림에 반만 색칠한다) 우라!', almost: '({item} 그림을 흔든다) 야하!!' },
  kurimanju: { start: '하아~ {item} 들이려고 모으는 중이야', half: '하아~ {item} 돈이 반은 모였지', almost: '하아~ {item} 거의 다 모았어~' },
  rakko: { start: '…{item} 손에 넣을 때까지 모은다', half: '…{item}까지 아직 절반이다', almost: '…{item}도 머지않았다 훗' }
};
const SAVING_LICENSE = {
  chiikawa: { start: '…토벌 자격증 시험 볼 돈… 모으는 중…!', half: '…시험 볼 돈… 반쯤 모았어…!', almost: '…시험 볼 돈… 거의 다 모았어…!!' },
  hachiware: { start: '토벌 자격증 시험 볼 돈 모으는 중이야~', half: '시험 볼 돈이 반쯤 모였어~!', almost: '곧 토벌 자격증 시험 보러 갈 거야~!' },
  usagi: { start: '(자격증 흉내를 낸다) 우라!', half: '(자격증 흉내를 내며 반만 웃는다) 야하', almost: '(검정소 쪽을 가리킨다) 야하!!' },
  kurimanju: { start: '하아~ 자격증 시험 볼 돈 모으는 중이야', half: '하아~ 시험 볼 돈이 반은 모였지', almost: '하아~ 곧 자격증 시험 보러 가야지' }
};
/** 그 친구가 지금 모으는 목표 이야기 한 줄(목표가 없으면 null). have: 지금 가진 돈. */
export function savingLine(kind, goal, have) {
  if (!goal) return null;
  const T = (goal.kind === 'license' ? SAVING_LICENSE : SAVING)[kind];
  if (!T) return null;
  const p = have / goal.cost;
  return fill(p < 0.34 ? T.start : p < 0.8 ? T.half : T.almost, { item: goal.label });
}

export const THANKS = { chiikawa: '…고마워…!', hachiware: '고마워~!', usagi: '야하!', kurimanju: '하아~ 고마워', rakko: '…훗', momonga: '흥! 당연하지' };
export const COMFORT = { chiikawa: '…괜찮아… 다음엔…!', hachiware: '괜찮아~ 다음엔 꼭 붙을 거야!', usagi: '(토닥토닥)', kurimanju: '하아~ 한 잔 하고 잊자', rakko: '…다시 하면 된다', momonga: '흥 울지 마!' };
export const COMFORTED = { chiikawa: '…응… 고마워…', hachiware: '고마워~ 힘낼게!', usagi: '…야하', kurimanju: '하아~ 고맙네', rakko: '…훗', momonga: '…흥' };
export const FAINT_RUSH = { chiikawa: '…괜찮아…?!', hachiware: '{me}! 괜찮아?!', usagi: '하아?!', kurimanju: '하아~ 무리했구나', rakko: '…무리하지 마라', momonga: '흥! 조심 좀 해!' };
export const THEFT_SEEN = { chiikawa: '…모, 모몽가…!', hachiware: '모몽가~ 그러면 안 돼~!', usagi: '우라!!', kurimanju: '하아~ 또 저런다', rakko: '…모몽가' };

/** 친구 앱 '오늘 마을 소식' 한 줄. → { text, kinds: [얼굴] } | null (소식거리가 아니면) */
export function newsLine(ev, me = '나') {
  const N = (k) => nameOf(k, me), A = N(ev.who), B = ev.with ? N(ev.with) : '';
  const and = () => `${josa(A, '과/와')} ${josa(B, '이/가')}`;
  const T = {
    meal: () => (ev.with ? `${and()} 라멘을 같이 먹었어요` : null),
    chat: () => `${and()} 수다를 떨었어요`,
    job: () => `${josa(A, '이/가')} ${josa(ev.title || '일감', '을/를')} 끝냈어요`,
    hunt: () => `${josa(A, '이/가')} 토벌 일감을 끝냈어요`,
    examPass: () => `${josa(A, '이/가')} 토벌 자격증을 땄어요`,
    examFail: () => `${josa(A, '이/가')} 토벌 시험에 떨어졌어요`,
    sing: () => (ev.n ? `하치와레 광장 공연에 ${ev.n}명이 왔어요` : '하치와레가 광장에서 노래했어요'),
    train: () => `${and()} 수련장에서 수련했어요`,
    comfort: () => `${josa(A, '이/가')} ${josa(B, '을/를')} 달래 줬어요`,
    congrats: () => `${josa(A, '이/가')} ${josa(B, '을/를')} 축하해 줬어요`,
    theft: () => '모몽가가 또 소매치기를 했어요',
    buy: () => `${josa(A, '이/가')} 돈을 모아 ${josa(ev.item || '새 물건', '을/를')} 샀어요`,
    snack: () => `${josa(A, '이/가')} 가방에서 ${josa(ev.item || '간식', '을/를')} 꺼내 먹었어요`,
    share: () => `${josa(A, '이/가')} ${B}에게 ${josa(ev.item || '선물', '을/를')} 나눠 줬어요`,
    partyHunt: () => `${josa(A, '이/가')} ${josa(N('me'), '과/와')} 같이 토벌했어요`,
    playerBoss: () => `${josa(N('me'), '이/가')} 왕버섯을 쓰러뜨렸어요`,
    playerRanker: () => `${josa(N('me'), '이/가')} 토벌 랭커가 됐어요`,
    playerLicense: () => `${josa(N('me'), '이/가')} ${josa(ev.lic || '자격증', '을/를')} 땄어요`,
    playerWork: () => `${N('me')} 덕분에 마을에 ${josa(ev.work || '새 시설', '이/가')} 생겼어요`,
    playerHome: () => `${josa(N('me'), '이/가')} 집을 ${josa(ev.home || '넓은 방', '으로/로')} 넓혔어요`
  }[ev.type];
  const text = T ? T() : null;
  return text ? { text, kinds: [ev.who, ev.with].filter((k) => k && k !== 'me' && FRIENDS[k]) } : null;
}

/**
 * 갑옷 씨들(가게 · 시험 · 일감을 맡은 마을 사람)과 시사 · 카니의 말. 가게를 지키다가 일과대로 움직인다.
 * 노동 갑옷 씨: 아침에 일감 붙이기 · 손님 부르기 · 일하는 친구 격려 · 점심 라멘
 * 라멘 갑옷 씨: 국물 우리기 · 시사 가르치기 · 테이블 닦기 · 오후에 바람 쐬기
 * 포셰트 갑옷 씨: 바느질 · 가게 앞 구경시키기 · 친구 칭찬 · 광장에서 신상 자랑
 * 대장 갑옷 씨: 아침 시험 준비 · 마을 순찰 · 풀 살피기 · 일하는 친구 지켜보기 · 저녁에 랏코와 대련
 */
export const STAFF_TALK = {
  labor: {
    post: ['새 일감 붙였어요!', '오늘 일감 많아요~'], call: ['일감 있어요~!', '빠른 사람이 임자!', '풀 뽑기 일감 남았어요~'], callNone: ['오늘 일감은 다 나갔어요~'],
    cheer: ['수고 많아요~!', '깔끔하네요!', '오 잘하는데요?'], lunch: ['일 끝나고 라멘이 최고예요', '후루룩~'], sweep: ['게시판 앞 정리~'],
    stretch: ['후우~ 갑옷이 덥다', '(기지개)'], greet: ['{me} 씨! 오늘 일감 있어요~', '어서 와요 {me} 씨!'], greetNone: ['어서 와요 {me} 씨!'],
    paid: ['수고했어요~!', '보수 여기 있어요~']
  },
  ramen: {
    cook: ['국물 우리는 중~', '면 삶을 시간이다', '오늘도 국물이 좋아요'], wipe: ['테이블 닦는 중~'], rest: ['후우~ 바람 좋다', '잠깐 쉬어요~'],
    welcome: ['어서 오세요~!', '라멘 나왔어요~'], greet: ['{me} 씨 어서 와요~', '오늘도 라멘 어때요?']
  },
  pochette: {
    sew: ['(한 땀 한 땀…)', '신상 만드는 중~'], display: ['구경하고 가요~', '신상 들어왔어요~'], show: ['신상 포셰트 어때~?', '어머 예쁘지~?'],
    compliment: ['어머 오늘 귀여워라~', '그 차림 잘 어울린다~', '포셰트 하나 메 볼래?'], greet: ['어머 {me}! 오늘도 귀엽네~', '{me}~ 구경하고 가~']
  },
  captain: {
    prep: ['오늘 시험 문제 확인', '흠흠 준비 완료'], patrol: ['흠흠 이상 없음', '규칙은 규칙이다', '…순찰 중'], weeds: ['…풀이 많이 자랐군', '깔끔하게 뽑아야 할 텐데'],
    watch: ['흠! 깔끔하게 뽑아라', '자세가 좋군', '규칙대로 하고 있군'], greet: ['흠흠 {me} 수고가 많다', '{me} 오늘도 성실하군'], pass: ['흠! 합격이다', '흠흠 잘했다'],
    fail: ['흠… 아깝군', '흠흠 연습하고 다시 와라']
  },
  shisa: {
    sweep: ['쓱싹쓱싹~', '가게 앞은 깨끗하게!'], errand: ['장 보러 다녀올게요~'], back: ['다녀왔습니다!'], greet: ['{me} 님! 어서 오세요~']
  },
  kani: {
    read: ['(책 읽는 중…)', '…재밌다'], out: ['…바깥에서 읽을래', '…딱'], greet: ['…{me} 딱']
  }
};
/** 대본: 라멘 갑옷 씨가 시사를 가르친다 · 대장 갑옷 씨와 랏코의 대련. */
export const STAFF_SCRIPTS = {
  coach: [
    [['ramen', '시사 면 삶을 시간이에요'], ['shisa', '네 사부님!'], ['ramen', '1초도 늦으면 안 돼요'], ['shisa', '알겠습니다!']],
    [['shisa', '사부님 국물 맛 좀 봐 주세요!'], ['ramen', '흠… 조금 더 진하게'], ['shisa', '네!']]
  ],
  spar: [[['captain', '흠! 한 판 하지'], ['rakko', '…좋다'], ['captain', '하앗!'], ['rakko', '훗'], ['captain', '흠흠 실력이 늘었군']]]
};
/** 칭찬 · 격려를 들은 친구의 짧은 대답. */
export const PRAISED = { chiikawa: '…헤헤…!', hachiware: '고마워요~!', usagi: '야하!', kurimanju: '하아~ 고마워', rakko: '…훗', momonga: '흥! 당연하지!' };

export { pick as pickLine, fill as fillLine };
