/**
 * 마을 가꾸기(core/works.js) · 집 넓히기 · 벽지와 바닥(core/home.js)을 두고 마을 친구들이 하는 말(게임 오리지널).
 *  WORK_NEAR: 생긴 시설 곁을 지날 때 혼잣말(머리 위 말풍선).
 *  WORK_CHAT: 말을 걸어 '이야기하자'를 고르면 가끔, 생긴 시설 가운데 하나 이야기.
 *  HOME_CHAT: 내 집을 넓혔거나(expand) 벽지 · 바닥을 바꿨으면(decor) 가끔 그 이야기.
 * 친구마다 말투: 치이카와 수줍게 · 하치와레 밝게 · 우사기 몸짓과 소리 · 쿠리만쥬 '하아~' · 랏코 짧게 · 모몽가 '흥'.
 */
export const WORK_NEAR = {
  flowers: { chiikawa: '…꽃 예쁘다…♪', hachiware: '꽃밭이다~ 냄새 좋아!', usagi: '(꽃 냄새를 맡는다) 하아~', kurimanju: '하아~ 꽃 보며 한 잔 하고 싶네', rakko: '…꽃이 잘 자라는군', momonga: '흥 꽃은 나랑 잘 어울려!' },
  benches: { chiikawa: '…벤치에서 쉬고 싶다…', hachiware: '여기 앉아서 연못 보는 거 좋아~', usagi: '(벤치 위에서 통통 뛴다) 우라!', kurimanju: '하아~ 벤치가 딱 좋네', rakko: '…쉬어 가는 것도 수련이다', momonga: '이 벤치는 내 자리야!' },
  lamps: { chiikawa: '…밤길이 안 무서워…!', hachiware: '가로등 덕분에 길이 환해~', usagi: '(가로등을 올려다본다) 야하~', kurimanju: '하아~ 밤길이 밝으니 좋네', rakko: '…밤 수련 길이 밝아졌군', momonga: '흥 밤에도 내가 잘 보이겠네!' },
  clock: { chiikawa: '…벌써 이런 시간…!', hachiware: '시계탑 보면 시간을 알 수 있어!', usagi: '(시계탑 앞에서 째깍째깍) 우라!', kurimanju: '하아~ 시계 보니 맥주 시간이네', rakko: '…시간을 지키는 건 중요하다', momonga: '시계탑 꼭대기에 올라가 보고 싶어!' },
  roads: { chiikawa: '…길이 반들반들해…', hachiware: '돌길이라 걷기 편해~!', usagi: '(돌길 위에서 통통 뛴다) 야하!', kurimanju: '하아~ 비 와도 진흙이 안 튀겠네', rakko: '…발이 잘 디뎌지는군', momonga: '돌길 걸으면 더 귀여워 보여!' },
  pavilion: { chiikawa: '…정자에서 쉬고 갈까…', hachiware: '정자에서 강 보는 거 좋아~', usagi: '(정자 기둥을 빙글 돈다) 야하!', kurimanju: '하아~ 정자에서 한 잔 하면 좋겠다', rakko: '…강바람이 시원하군', momonga: '정자는 나만의 별장이야!' },
  fence: { chiikawa: '…돌담이 든든해…', hachiware: '울타리가 엄청 튼튼해졌어!', usagi: '(돌담을 톡톡 두드린다) 하아?', kurimanju: '하아~ 이제 마음 놓고 자겠네', rakko: '…견고하군', momonga: '돌담 위에 올라가 볼까 흥' }
};
export const WORK_CHAT = {
  flowers: { chiikawa: '…광장 꽃밭에서 나비 봤어…!', hachiware: '광장 꽃밭 진짜 예쁘지? 매일 보러 가~', usagi: '(꽃을 한 송이 내민다) 야하!', kurimanju: '하아~ 광장이 화사해졌어', rakko: '…꽃밭 앞에서 수련하면 기분이 좋다', momonga: '꽃밭에서 사진 찍어 줘! 귀엽게!' },
  benches: { chiikawa: '…연못 벤치에서 낮잠 잤어…', hachiware: '연못 벤치에서 물고기 구경했어!', usagi: '(벤치에 눕는 흉내) 하아~', kurimanju: '하아~ 연못 벤치에서 맥주 마시면 최고야', rakko: '…연못가 벤치는 조용해서 좋다', momonga: '벤치는 먼저 앉는 사람이 임자야 흥!' },
  lamps: { chiikawa: '…밤에 들판 가는 길이 안 무서워졌어…', hachiware: '밤에 가로등 켜지면 별 같아!', usagi: '(손으로 반짝반짝 흉내) 야하!', kurimanju: '하아~ 맥주집에서 갈 때 안 넘어져', rakko: '…밤 토벌도 할 만해졌다', momonga: '밤 산책할 때 가로등이 있어서 좋아 흥' },
  clock: { chiikawa: '…시계탑 덕분에 늦잠 안 잤어…', hachiware: '시계탑 생기고 약속을 잘 지켜~', usagi: '(시계 바늘처럼 팔을 돌린다) 야하!', kurimanju: '하아~ 시계탑 보고 맥주 시간 맞춰', rakko: '…시계탑을 보며 수련 시간을 잰다', momonga: '시계탑이 있어도 난 늦게 갈 거야 흥' },
  roads: { chiikawa: '…돌길에서는 안 넘어져…!', hachiware: '마을 길이 돌길이 돼서 멋있어졌어!', usagi: '(돌을 하나하나 밟는 흉내) 우라!', kurimanju: '하아~ 돌길이 되니 도시 같네', rakko: '…돌길은 달리기 수련에 좋다', momonga: '돌길이라 신발이 안 더러워져 흥' },
  pavilion: { chiikawa: '…강가 정자에서 도시락 먹었어…♪', hachiware: '강가 정자에서 낚시 구경했어!', usagi: '(정자 지붕을 손으로 그린다) 야하~', kurimanju: '하아~ 정자에서 마시는 맥주가 최고야', rakko: '…정자에서 마음을 가다듬었다', momonga: '정자에서 낮잠 잤는데 아무도 안 깨웠어 흥' },
  fence: { chiikawa: '…돌담 생기고 밤에 잘 자…', hachiware: '돌담이 생겨서 마을이 든든해졌어~', usagi: '(돌담처럼 팔짱을 낀다) 우라!', kurimanju: '하아~ 돌담 보니 마을이 커진 것 같아', rakko: '…돌담 덕에 마을이 안전하다', momonga: '돌담이 멋있긴 하네 흥 조금만' }
};
export const HOME_CHAT = {
  expand: { chiikawa: '…집이 넓어졌다며…? 놀러 가고 싶어…', hachiware: '집 넓혔다며? 가구 많이 놓을 수 있겠다~', usagi: '(팔을 활짝 벌린다) 우라!!', kurimanju: '하아~ 집 넓혔으면 집들이 해야지', rakko: '…넓은 집이면 수련도 하겠군', momonga: '넓은 집? 흥 내 방이 더 예쁠걸' },
  decor: { chiikawa: '…벽지 바꿨어…? 예쁠 것 같아…', hachiware: '방 분위기 바꿨다며? 궁금해~', usagi: '(벽에 색칠하는 흉내) 야하!', kurimanju: '하아~ 새 벽지 냄새 좋지', rakko: '…방이 새로워졌다고 들었다', momonga: '벽지 색은 내가 골라 줄 걸 그랬네 흥' }
};

/** 시계탑 종소리를 들은 마을 친구의 한마디(말풍선). */
export const BELL_HEARD = { chiikawa: '…종소리다…!', hachiware: '종소리다~! 좋은 소리!', usagi: '(종소리에 맞춰 폴짝 뛴다) 우라!', kurimanju: '하아~ 종소리 들으니 한 잔 생각나네', rakko: '…좋은 울림이다', momonga: '시끄러워! …조금은 좋네 흥' };

const pick = (list, random) => list[Math.floor(random() * list.length) % list.length];
/** 시설 곁 혼잣말(그 친구 말이 없으면 null). */
export const nearWorkLine = (kind, workId) => (WORK_NEAR[workId] && WORK_NEAR[workId][kind]) || null;
/** '이야기하자'에서 할 시설 · 집 이야기: 생긴 시설(open) 가운데 하나, 또는 내 집(넓혔다 · 꾸몄다). 할 말이 없으면 null. */
export function upgradeChat(kind, { open = [], expanded = false, decorated = false } = {}, random = Math.random) {
  const pool = open.filter((id) => WORK_CHAT[id] && WORK_CHAT[id][kind]).map((id) => WORK_CHAT[id][kind]);
  if (expanded && HOME_CHAT.expand[kind]) pool.push(HOME_CHAT.expand[kind]);
  if (decorated && HOME_CHAT.decor[kind]) pool.push(HOME_CHAT.decor[kind]);
  return pool.length ? pick(pool, random) : null;
}
