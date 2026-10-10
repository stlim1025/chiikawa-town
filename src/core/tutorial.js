import { isComplete } from './jobs.js';

/**
 * 하치와레의 첫날 안내. 단계는 state.tutorial 에 문자열로 저장한다.
 *  hello  → 인사와 "일해서 돈을 벌어" (대화를 읽으면 house)
 *  house  → 하치와레가 앞장서서 내 집까지 데려간다(집 앞에 오면 houseTour)
 *  houseTour → 집 앞에서 집 이야기(빌린 집 · 잠 · 꾸미기). 대화를 읽으면 board
 *  board  → 노동 접수에서 일감 받기
 *  pull   → 풀 뽑기(꾹 눌렀다 초록에서 떼기)
 *  report → 노동 접수에서 보수 받기
 *  tips   → 기운 회복과 승급(검정소) 이야기 (대화를 읽으면 done)
 *  done   → 끝. 예전 저장처럼 값이 없어도 끝난 것으로 본다.
 */
export const TUTORIAL_LINES = {
  hello: [
    '어서 와~! 나는 하치와레야!',
    '여기선 일해서 돈을 벌어~ 기본은 풀 뽑기!'
  ],
  house: [
    '먼저 네 집부터 알려 줄게! 따라와~',
    { text: '저 하얀 집이야', chips: [{ text: '여기! 표시' }] }
  ],
  // 집 앞에 왔을 때
  houseTour: [
    '짜잔~ 여기가 네 집이야!',
    { text: '월요일마다 집세를 내', chips: [{ text: '300원' }] },
    '피곤하면 들어가서 푹 자~',
    '이제 돈 벌러 가자!'
  ],
  board: [
    { text: '노동 접수에서 일감을 받자', chips: [{ text: '서쪽 게시판' }] },
    { text: '게시판 앞에서 버튼!', chips: [{ text: 'PC 는 Space' }] }
  ],
  // 일감을 그만둬서 다시 게시판으로 돌아갈 때
  boardAgain: ['일감을 그만뒀네~ 다시 받아 오자!'],
  pull: [
    '이제 풀을 뽑자!',
    { text: '꾹 누르고 초록에서 떼!', chips: [{ text: '딩 소리' }] }
  ],
  report: [
    '다 뽑았다~! 대단해!',
    '노동 접수에서 보수를 받자'
  ],
  tips: [
    '첫 보수 축하해~ ♪',
    { text: '기운이 없으면 먹거나 자~', chips: [{ text: '라멘 로우' }, { text: '내 집' }] },
    { text: '깔끔하게 뽑으면 승급!', chips: [{ text: '동쪽 검정소' }] },
    '그럼 힘내! 궁금하면 말 걸어~'
  ]
};

/** 안내가 진행 중인지. */
export function tutorialActive(step) {
  return !!step && step !== 'done';
}

/**
 * 목표를 이루었으면 다음 단계(대화 단계 hello · houseTour · tips 는 대화를 다 읽어야 넘어가므로 그대로).
 * ctx.nearHome: 내 캐릭터가 집 앞에 왔는지(위치는 화면 쪽에서 알려 준다).
 */
export function tutorialNext(step, state, ctx = {}) {
  switch (step) {
    case 'house': return ctx.nearHome ? 'houseTour' : step;
    case 'board': return state.job ? 'pull' : step;
    case 'pull': return !state.job ? 'board' : isComplete(state.job) ? 'report' : step;
    case 'report':
      if (state.job) return isComplete(state.job) ? step : 'pull';
      return state.money > 0 ? 'tips' : 'board';
    default: return step;
  }
}

/**
 * 하치와레에게 '궁금한 게 있어'라고 하면 고를 수 있는 질문들. 안내에서 배운 것과 자주 묻는 것.
 * home: true 인 질문은 대답한 뒤 하치와레가 집까지 앞장선다.
 */
export const HELP_TOPICS = [
  { q: '친구들 부탁은 뭐야?', lines: [
    { text: '머리 위 ! 는 고민이 있다는 뜻!', chips: [{ text: '! 부탁' }, { text: '? 다 했어' }] },
    { text: '다 하면 선물도 받고 더 친해져~', chips: [{ text: '퀘스트 앱' }] }
  ] },
  { q: '몬스터는 어떻게 잡아?', lines: [
    { text: '무기를 들고 가까이서 버튼!', chips: [{ text: '도구점' }] },
    '붉게 움츠리면 한 걸음 물러나~',
    '위험하면 마을 울타리 안으로!'
  ] },
  { q: '토벌 랭커가 뭐야?', lines: [
    { text: '토벌 점수 상위 셋이 랭커야!', chips: [{ text: '검정소 랭킹' }] },
    '랭커는 무기에 얼굴을 새길 수 있어~'
  ] },
  { q: '친구들은 하루 종일 뭐 해?', lines: [
    '다들 일하고 먹고 수다도 떨어~',
    { text: '나는 오후에 광장에서 노래해!', chips: [{ text: '끝까지 들으면 하트' }] },
    { text: '지금 뭐 하는지는 친구 앱에서!', chips: [{ text: '지도에도 얼굴' }] }
  ] },
  { q: '친구랑 같이 토벌할 수 있어?', lines: [
    { text: '같이 토벌 가자! 해 봐~', chips: [{ text: '하트 3개' }, { text: '둘 다 자격증' }] },
    { text: '같이 잡으면 점수는 나눠 가져', chips: [{ text: '둘까지' }] }
  ] },
  { q: '돈은 어떻게 벌어?', lines: [
    { text: '노동 접수에서 일감부터 받아!', chips: [{ text: '풀 뽑기' }, { text: '스티커' }, { text: '열매' }] },
    '다 하면 게시판에서 보수 받기~'
  ] },
  { q: '풀은 어떻게 뽑아?', lines: [
    { text: '꾹 누르고 초록에서 떼!', chips: [{ text: '딩 소리' }] },
    '기운이 낮으면 손이 떨려~'
  ] },
  { q: '기운이 없어…', lines: [
    { text: '라멘을 먹거나 푹 자~', chips: [{ text: '라멘 로우' }, { text: '내 집' }] }
  ] },
  { q: '승급은 어떻게 해?', lines: [
    { text: '경험치가 차면 승급 시험!', chips: [{ text: '동쪽 검정소' }] },
    { text: '깔끔하게 연속으로 뽑으면 합격', chips: [{ text: '보수 UP' }] }
  ] },
  { q: '집세랑 청약은 뭐야?', lines: [
    { text: '월요일마다 집세가 나가', chips: [{ text: '300원' }] },
    { text: '집을 사면 집세 끝!', chips: [{ text: '50,000원' }] },
    { text: '청약은 수요일 발표~', chips: [{ text: '신청 500원' }, { text: '당첨 15,000원' }] }
  ] },
  { q: '집세를 못 내면 어떻게 돼?', lines: [
    '두 번 연달아 못 내면 쫓겨나…',
    { text: '그땐 친구 집이나 노숙이야', chips: [{ text: '부동산에서 다시 세 들기' }] }
  ] },
  { q: '돈이 급할 땐?', lines: [
    { text: '단짝한테 빌릴 수 있어', chips: [{ text: '하트 5개' }] },
    { text: '포셰트를 메면 소매치기 피해 절반!', chips: [{ text: '포셰트 가게' }] }
  ] },
  { q: '가구는 어디서 사?', lines: [
    { text: '가구점에서 사서 집에서 꾸미기!', chips: [{ text: '민트색 가게' }] }
  ] },
  { q: '친구들이랑 놀고 싶어', lines: [
    { text: '같이 놀자! 해 봐~', chips: [{ text: '가위바위보' }, { text: '술래잡기' }, { text: '춤' }] }
  ] },
  { q: '자격은 뭐가 있어?', lines: [
    { text: '검정소에서 딸 수 있어!', chips: [{ text: '술' }, { text: '슈퍼 알바이터' }, { text: '토벌' }] },
    { text: '술 자격은 쿠리만쥬 강의부터~', chips: [{ text: '맥주집' }] },
    { text: '알바이터는 레시피 북을 외워!', chips: [{ text: '라멘 로우 알바' }] }
  ] },
  { q: '우리 집이 어디였지?', home: true, lines: ['내가 데려다줄게! 따라와~'] }
];
