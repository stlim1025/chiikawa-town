import { ISLE } from '../core/layout.js';

/**
 * 사이드스토리 '수상한 섬 합숙'의 대본(원작 세이렌(섬) 편의 흐름을 따른다). 장면 진행은 stories/island.js 가 맡는다.
 * 장면(beat): { id, at(기준 자리), sky, title(검은 화면 글), cast, cam, boats, siren, mer, tendrils, fires, binds, props, lines }
 *  - 자리 · 카메라는 모두 at 기준 상대 좌표. cast: { 누구: [dx, dz, 바라봄, 몸짓, 높이, 탄 배] }
 *    바라봄: 라디안(0 = +z) · 'cam'(카메라) · 다른 사람 이름 · [x, z](상대 자리). 탄 배('duck' | 'row' | 'far')가 있으면 dx · dz 는 배 기준.
 *  - lines: 글(내레이션) · [말하는 사람, 글] · 연출 { do: ... } 를 차례로. 말하는 사람: c h u r m k q s(치이카와 · 하치와레 · 우사기 · 랏코 · 모몽가 · 카니 · 쿠리만쥬 · 시사)
 *    j(시마지로) · t(한잎) · f(두잎) · i(섬사람) · z(세이렌) · me(나)
 *  - 연출: pose · cast · hide · siren · sirenMouth · mer(ride 면 배를 따라간다) · tendrils · bind · unbind · boat · cam · fire · sign · lid · snd · shake · splash · wait · notes · bubbles · lei · scale · ask · game · branch · sleep
 */
const PI = Math.PI;
const PALS = ['me', 'chiikawa', 'hachiware', 'usagi', 'rakko', 'momonga', 'kani'];

/** 박자 맞추기 악보(박 번호, 처음 4박은 준비). */
const chart = (bars) => { const out = []; bars.forEach((beats, n) => beats.forEach((b) => out.push(4 + n * 4 + b))); return out; };
export const CHORUS = chart([[0, 2], [0, 2], [0, 1, 2, 3], [0, 2, 3], [0, 1, 2, 3], [0, 1, 2, 2.5, 3]]);
export const BATTLE = chart([[0, 1, 2, 3], [0, 1, 2, 3], [0, 0.5, 1, 2, 3], [0, 1, 1.5, 2, 3], [0, 1, 2, 2.5, 3, 3.5], [0, 0.5, 1, 2, 2.5, 3], [0, 1, 2, 3], [0, 0.5, 1, 1.5, 2, 3]]);

/** 마을 선착장에서 모일 때(섬으로 떠나기 전). */
export const GATHER = [
  ['h', '{name}~! 좋은 아침! 드디어 섬 합숙이다~!'],
  ['u', '야하~!'],
  '(우사기는 짐이 하나도 없다… 정말 맨몸이다)',
  ['h', '우사기, 짐은…?!'], ['u', '우라?'],
  ['r', '…다 모였군. 수상한 얘기다. 이번엔 내가 인솔하겠다.'],
  '(부두 끝에서 커다란 오리 배가 뿌우~ 하고 기다리고 있다)',
  ['c', '…오, 오리…!']
];

export const BEATS = [
  {
    id: 'voyage', at: ISLE.voyage, sky: 'day', title: '(오리 배를 타고, 남쪽 섬으로…)',
    boats: { duck: { x: 0, z: 0, face: PI, moving: true } },
    // 선실이 뒤(+z)에 있어 사람은 앞 갑판(dz -2.6 ~ 0.5)에
    cast: { me: [0.6, -1.3, PI, 'idle', 0, 'duck'], chiikawa: [-0.5, -0.5, 'cam', 'hurt', 0, 'duck'], hachiware: [-1.0, 0.3, 'chiikawa', 'talk', 0, 'duck'], usagi: [0.3, 0.3, 'chiikawa', 'sway', 0, 'duck'],
      rakko: [1.0, -2.3, PI, 'idle', 0, 'duck'], momonga: [-0.8, -2.1, 'cam', 'pose', 0, 'duck'], kani: [1.1, -0.2, PI, 'read', 0, 'duck'] },
    cam: [[7.5, 4.2, 2], [0, 1.4, -0.5]],
    lines: [
      '(오리 배가 바다 위를 미끄러지듯 나아간다…)',
      ['m', '흥! 보수 100배는 내가 다 가질 거야! 따라오지 마!'], ['k', '…딱딱. (카니도 같이 탔다)'],
      ['h', '모몽가랑 카니도 왔구나~! 다 같이 합숙이다!'],
      ['c', '…우욱…'], ['h', '치이카와, 배멀미해?! 괜찮아~?'],
      { do: 'pose', k: 'usagi', mode: 'wave' }, '(우사기가 치이카와 등을 토닥토닥 쓸어 준다)',
      ['r', '…먼 곳을 봐라. 수평선을 보면 좀 낫다.'],
      { do: 'cam', pos: [-2.5, 3.4, 7], look: [0, 1.5, -30], blend: 2.2 }, { do: 'wait', sec: 1.6 },
      '(수평선 너머로 야자수가 우거진 섬이 보이기 시작했다!)',
      { do: 'pose', k: 'hachiware', mode: 'hop' }, { do: 'pose', k: 'chiikawa', mode: 'look' },
      ['h', '섬이다~~!!'], ['c', '…!! (반짝반짝)']
    ]
  },
  {
    id: 'welcome', at: ISLE.beach, sky: 'day', title: '',
    cast: {
      isl1: [-3, 1.2, 0, 'dance'], isl2: [-1.6, 1.7, 0, 'dance'], isl3: [1.6, 1.7, 0, 'dance'], isl4: [3, 1.2, 0, 'dance'], hitoha: [-0.5, 2.4, 0, 'shy'], futaba: [0.6, 2.4, 0, 'shy'],
      chiikawa: [-0.8, 4.4, PI, 'look'], hachiware: [0.4, 4.6, PI, 'hop'], usagi: [1.5, 4.8, PI, 'idle'], me: [-1.8, 4.8, PI, 'idle'], rakko: [2.6, 5.4, PI, 'idle'], momonga: [-2.8, 5.4, PI, 'pose'], kani: [3.4, 5.9, PI, 'idle']
    },
    cam: [[2.2, 3.6, 10.6], [0, 1.1, 1.6]],
    lines: [
      { do: 'snd', name: 'song' },
      '(동글동글한 섬사람들이 꽃목걸이를 들고, 노래하며 맞아 준다)',
      ['i', '♪ 어서 와요~ 어서 와요~ 우리 섬에 어서 와요~ ♪'],
      { do: 'lei', k: PALS, on: true }, '(목에 꽃목걸이가 걸렸다!)',
      ['t', '머, 멀리서 와 주셔서… 고맙습니다…'],
      { do: 'pose', k: 'futaba', mode: 'talk' }, ['f', '(꾸벅) …저기… 이거, 드세요…'],
      '(하치와레가 섬 소다를 받았다!)', { do: 'pose', k: 'hachiware', mode: 'gulp' },
      ['h', '고마워~! 꿀꺽꿀꺽… 캬~ 시원하다~!'],
      ['u', '야하~!'], ['c', '…헤헤…'],
      ['r', '…환영은 고맙다. 그런데 토벌할 녀석은 어디 있지?'], ['t', '…아, 그건… 일단 쉬세요… 맛있는 것도 잔뜩 있어요…'],
      { do: 'pose', k: 'hitoha', mode: 'shy' }
    ]
  },
  {
    id: 'festival', at: { x: 0, z: 0 }, sky: 'day', title: '',
    cast: {
      shisa: [-6, 2.0, 0, 'talk'], isl3: [-2, 2.0, 0, 'talk'], isl4: [6, 2.0, 0, 'talk'],
      rakko: [-1.2, 4.9, PI, 'idle'], kurimanju: [3.0, 4.9, PI, 'gulp'], usagi: [6.9, 4.9, PI, 'hop'],
      chiikawa: [-1.4, 7.6, 0.4, 'look'], hachiware: [1.5, 7.8, -0.3, 'sway'], me: [0, 7.0, PI, 'idle'],
      isl1: [-5.3, 8.6, 0.6, 'dance'], isl2: [-3.7, 8.8, -0.6, 'dance'], hitoha: [9.4, 7.6, -0.5, 'shy'], futaba: [10.2, 7.1, -0.8, 'shy'],
      momonga: [-7.6, 12.6, 0.2, 'nibble'], kani: [-9.0, 4.8, 0.4, 'read']
    },
    cam: [[0, 6.4, 15.6], [0, 0.8, 6.2]],
    lines: [
      { do: 'snd', name: 'song' }, '(환영 노래가 끝나자, 해변은 그대로 축제가 되었다!)',
      ['h', '{name}! 포장마차 전부 공짜래~! 돌아다니면서 실컷 놀자!'],
      { do: 'roam', id: 'festival' },
      { do: 'snd', name: 'song' }, '(실컷 먹고, 이야기하고, 춤추다 보니… 어느새 해가 기울었다)'
    ]
  },
  {
    id: 'bungalow', at: ISLE.bungalow, sky: 'sunset', title: '(해 질 녘)',
    cast: { chiikawa: [-0.5, -0.6, 0.4, 'gaze', 0.62], hachiware: [0.5, -0.4, 'hitoha', 'talk', 0.62], me: [-1.2, -1.0, 0.3, 'idle', 0.62], hitoha: [0.8, 1.6, 'hachiware', 'shy'], futaba: [-0.2, 1.9, 'hachiware', 'shy'] },
    cam: [[-5.0, 3.4, 4.6], [0.4, 0.9, -0.6]],
    lines: [
      '(숙소는 바다 위에 지은 방갈로! 창밖으로 노을 진 바다가 반짝인다)',
      ['h', '우와~ 바다 위에서 자는 거야?!'], ['c', '…(창밖을 보며 반짝반짝)'],
      '(섬사람들은 수줍음이 많지만, 하치와레는 금세 친해졌다)',
      ['t', '…저기… 이 섬, 마음에 드세요…?'], ['h', '응! 완전 최고야~!'], ['f', '…다행이다…'],
      ['t', '…저는 한잎, 이쪽은 두잎이에요. 늘… 둘이 같이 있어요.'], ['f', '(한잎 뒤에 쏙 숨는다)']
    ]
  },
  {
    id: 'sign', at: ISLE.sign, sky: 'sunset', title: '',
    cast: { kani: [0.9, 1.0, [0, 0], 'look'], momonga: [-0.5, 0.9, [0, 0], 'pose'], chiikawa: [1.4, 2.6, [0, 0], 'shy'], me: [-0.4, 2.8, [0, 0], 'idle'] },
    cam: [[-3.0, 2.2, 5.0], [0.3, 1.0, -0.6]],
    lines: [
      '(바위 언덕 쪽을 거닐다가, 카니가 뭔가를 발견했다)', ['k', '…딱. (손가락으로 가리킨다)'],
      '(동굴 앞에 \'출입금지\' 팻말이 서 있다…)',
      ['m', '뭐야 이거? 출입금지? 흥, 누가 정했는데!'],
      { do: 'pose', k: 'momonga', mode: 'swing' }, { do: 'sign', fallen: true }, { do: 'snd', name: 'thud' },
      '(모몽가가 팻말을 툭 걷어차자… 팻말이 쓰러져 버렸다)',
      ['m', '…내가 한 거 아니야! 원래 쓰러져 있었어!'], ['k', '…….'], ['c', '…(안절부절)'],
      { do: 'snd', name: 'siren' }, '(그때… 동굴 깊은 곳에서 희미하게 노랫소리 같은 게 들렸다…?)', ['c', '……!']
    ]
  },
  {
    id: 'campfire', at: ISLE.fire, sky: 'night', title: '(밤)', fires: ['beach'],
    cast: {
      me: [0, -1.9, [0, 0], 'sit'], chiikawa: [-1.2, -1.45, [0, 0], 'sit'], hachiware: [1.2, -1.45, [0, 0], 'sit'], usagi: [1.85, -0.3, [0, 0], 'sit'], rakko: [1.5, 1.1, [0, 0], 'sit'],
      kani: [0.55, 1.85, [0, 0], 'sit'], momonga: [-0.55, 1.85, [0, 0], 'sit'], shisa: [-1.5, 1.1, [0, 0], 'sit'], kurimanju: [-1.85, -0.3, [0, 0], 'gulp'],
      isl1: [-2.6, 2.6, [0, 0], 'sway'], isl2: [2.6, 2.6, [0, 0], 'sway'], hitoha: [-1.0, 3.3, [0, 0], 'sway'], futaba: [1.0, 3.3, [0, 0], 'sway']
    },
    cam: [[0, 3.0, -6.2], [0, 0.7, 0.6]],
    lines: [
      { do: 'snd', name: 'song' }, '(모닥불을 둘러싸고 다 같이 노래를 불렀다. 타닥타닥…)',
      ['q', '하아~ 이런 밤엔 한 잔 더…'],
      ['h', '있잖아, 낮에 그 동굴에서 노랫소리가 들렸대!'],
      { do: 'pose', k: 'usagi', mode: 'cheer' }, ['u', '우라!! (노를 번쩍 든다)'],
      ['h', '배 타고 보러 가 보자는 거야?!'], ['c', '…에, 에엣…!?'],
      ['r', '…밤바다는 위험하다. 멀리 가지 마라.'], ['u', '야하!']
    ]
  },
  {
    id: 'row', at: ISLE.seacave, sky: 'night', title: '',
    boats: { row: { x: -10, z: 0, face: PI / 2 } },
    cast: { usagi: [1.0, 0, PI / 2, 'pull', 0, 'row'], hachiware: [0.25, 0.32, PI / 2, 'pull', 0, 'row'], chiikawa: [0.25, -0.32, PI / 2, 'shy', 0, 'row'], me: [-0.7, 0, PI / 2, 'idle', 0, 'row'] },
    cam: [[-16.5, 2.8, 2.8], [-5, 1, 0]],
    lines: [
      '(우사기와 하치와레가 작은 보트를 저어 나가고… 치이카와와 {name}도 따라 탔다)',
      ['h', '{name}, 같이 노 젓자~! 하나, 둘!'],
      { do: 'game', game: 'row' },
      { do: 'snd', name: 'siren' }, '(동굴 입구에 다다르자… 안쪽에서 아름다운 노랫소리가 울려 퍼진다…)',
      ['h', '…이, 이 노래… 뭐지…?'], ['c', '…(덜덜)'],
      { do: 'shake', sec: 0.8 }, '(그 순간, 물속에서 커다란 그림자가…!!)',
      { do: 'boat', kind: 'row', spec: { x: -3.5, z: 0, face: PI / 2, capsize: true } }, { do: 'splash', x: -3.5, z: 0, s: 1.6 }, { do: 'snd', name: 'splash' },
      { do: 'hide', k: ['usagi', 'hachiware', 'chiikawa', 'me'] }, '(풍덩!! 보트가 뒤집혔다!)'
    ]
  },
  {
    id: 'grotto', at: ISLE.grotto, sky: 'cave', title: '',
    siren: { state: 'rise', x: 2, z: -3.5, face: 0 }, mer: [{ x: -1.6, z: -0.8, face: 0.4, state: 'swim' }],
    cam: [[0.5, 3.0, 8.5], [-0.5, 2.8, -2]],
    lines: [
      { do: 'snd', name: 'splash' }, { do: 'shake', sec: 0.6 },
      '(물속에서 거대한 세이렌이 솟아올랐다…! 곁에는 작은 인어도 있다)',
      ['h', '으아아아…!!'], ['u', '하?!'], ['c', '…!!!'],
      { do: 'siren', state: 'friendly' }, '(세이렌이 커다란 손으로… 물에 빠진 모두를 건져 올렸다)',
      { do: 'cast', cast: { me: [-4.6, -0.9, [-2.4, -1.4], 'sit', 0.4], chiikawa: [-3.3, -0.7, [-2.4, -1.4], 'sit', 0.4], hachiware: [-4.9, -2.3, [-2.4, -1.4], 'sit', 0.4], usagi: [-3.4, -2.6, [-2.4, -1.4], 'sit', 0.4] } },
      { do: 'fire', name: 'grotto', on: true }, { do: 'cam', pos: [-1, 3.2, 6.5], look: [-2.2, 1.6, -2], blend: 1.4 },
      '(그리고 모닥불 곁에 앉혀, 젖은 몸을 말려 주었다…)',
      ['h', '…어라? 착한… 애야?'],
      { do: 'siren', state: 'sing' }, ['z', '라~ 라라~♪ (부드럽게 흥얼거린다)'],
      '(인어가 꼬리를 살랑살랑 흔들며 웃는다)',
      ['h', '아, 나 이거 도감에서 봤어! 세이렌이랑 인어…'],
      ['h', '\'인어를 먹으면 영원한 생명을 얻는다\'는 전설도 있었는데…'],
      { do: 'siren', state: 'angry' }, { do: 'shake', sec: 0.4 }, '(그 말에, 세이렌의 눈빛이 순간 서늘해졌다…)',
      { do: 'siren', state: 'calm' }, '(세이렌은 섬 쪽을 가리키며 슬픈 소리로 울었다)',
      '(…인어 친구 하나가, 섬사람에게 먹혀 버렸다고 하는 것 같다)',
      ['c', '…!'], ['h', '그, 그런…']
    ]
  },
  {
    id: 'poster', at: ISLE.beach, sky: 'day', title: '(다음 날 아침)',
    cast: { hachiware: [4.6, 2.0, PI, 'read'], usagi: [5.5, 2.3, PI, 'idle'], momonga: [3.6, 2.3, PI, 'pose'], chiikawa: [5.1, 3.1, PI, 'look'], me: [6.3, 2.9, PI, 'idle'], rakko: [2.8, 3.2, [5, 0.6], 'think'], kani: [6.8, 2.0, PI, 'idle'] },
    cam: [[5.5, 2.6, 7.2], [5, 1.1, 0.6]], // 아치 기둥을 비켜서
    lines: [
      '(섬 게시판에 커다란 벽보가 붙어 있었다)',
      '『토벌 대상: 세이렌. 보수: 섬의 맛있는 음식과 특산물 100배!』',
      ['h', '보수 100배가… 돈이 아니라 음식이었어?!'], ['u', '하아?!'],
      { do: 'pose', k: 'momonga', mode: 'flail' }, ['m', '뭐야!! 사기잖아!! 돌려줘!!'],
      '(같이 온 다른 토벌꾼들은 세이렌의 크기를 듣더니 하나둘 줄행랑쳤다…)',
      ['r', '…역시 수상했군.'], ['c', '…(어젯밤 세이렌을 떠올린다)']
    ]
  },
  {
    id: 'attack', at: ISLE.battle, sky: 'day', title: '',
    cast: {
      me: [-0.8, -1.2, 0, 'idle'], chiikawa: [0.2, -1.0, 0, 'look'], hachiware: [1.2, -1.3, 0, 'idle'], usagi: [-1.8, -0.6, 0, 'idle'], rakko: [0.6, 0.6, 0, 'idle'], momonga: [-2.6, -1.4, 0, 'idle'], kani: [2.4, -1.8, 0, 'idle'],
      isl1: [-4, -2.5, 0, 'look'], isl2: [4, -2.6, 0, 'look'], hitoha: [-3.2, -3.4, 0, 'idle'], futaba: [3.0, -3.6, 0, 'idle']
    },
    cam: [[-3, 3.4, -7], [-1.5, 2.6, 7]],
    lines: [
      { do: 'shake', sec: 1.2 }, { do: 'snd', name: 'growl' }, '(쿠구구궁…!! 바다가 크게 일렁인다)',
      { do: 'siren', state: 'rise', x: 0, z: 11, face: PI }, { do: 'wait', sec: 1.4 }, { do: 'siren', state: 'angry' },
      { do: 'pose', k: ['isl1', 'isl2', 'hitoha', 'futaba'], mode: 'flail' }, ['i', '세, 세이렌이다…!! 다들 도망쳐…!'],
      { do: 'siren', state: 'sing' }, { do: 'tendrils', spec: { x: 0, z: 6, r: 3.5 } }, { do: 'snd', name: 'siren' },
      '(세이렌의 노래에 맞춰, 바다에서 덩굴이 꿈틀꿈틀 뻗어 나온다!)',
      { do: 'pose', k: 'usagi', mode: 'wave' }, ['u', '우라~! (손을 흔들며 인사한다)'],
      { do: 'siren', state: 'angry' }, { do: 'shake', sec: 0.5 }, '(…세이렌이 더 화가 났다!!)',
      { do: 'cast', cast: { rakko: [0.6, 2.4, 0, 'train'] } }, ['r', '물러서라! 여기는 내가 막는다!'],
      { do: 'cast', cast: { momonga: [-0.2, 2.2, 0, 'flail'] } }, ['m', '나도 할 거야! 보수는 내 거야! 비켜!'],
      '(모몽가가 끼어드는 바람에 랏코가 균형을 잃었다…!)',
      { do: 'bind', k: ['rakko'], on: true }, { do: 'snd', name: 'hurt' }, ['r', '…크윽!'],
      { do: 'cast', cast: { rakko: [0.4, 7, PI, 'hurt'] } }, { do: 'splash', x: 0.4, z: 7, s: 1.2 }, { do: 'snd', name: 'splash' },
      { do: 'hide', k: ['rakko'] }, { do: 'bind', k: ['rakko'], on: false },
      '(덩굴이 랏코를 휘감아… 그대로 바닷속으로 끌고 가 버렸다!!)',
      { do: 'siren', state: 'leave' }, { do: 'tendrils', spec: null },
      { do: 'pose', k: ['hachiware'], mode: 'flail' }, { do: 'pose', k: ['chiikawa'], mode: 'sob' },
      ['h', '라, 랏코~~!!'], ['c', '…!!!'],
      { do: 'pose', k: 'momonga', mode: 'shy' }, ['m', '…내, 내 탓 아니야…!']
    ]
  },
  {
    id: 'search', at: { x: 3.5, z: -5.5 }, sky: 'day', title: '',
    cast: { hitoha: [0.6, -1.2, 'hachiware', 'talk'], futaba: [-0.4, -1.4, 'hachiware', 'shy'], hachiware: [0.3, 0.6, 'hitoha', 'talk'], chiikawa: [-0.8, 0.8, 'hitoha', 'look'], usagi: [1.4, 0.9, 'hitoha', 'idle'], me: [-1.6, 1.2, 'hitoha', 'idle'], momonga: [2.2, 0.2, 'hitoha', 'pose'], kani: [2.6, 1.2, 'hitoha', 'idle'] },
    cam: [[0.5, 2.6, 6.5], [0.2, 1.0, -0.2]],
    lines: [
      ['t', '…랏코 님을 끌고 간 곳은… 아마 그 동굴일 거예요…'], ['f', '…저희가… 안내할게요…'],
      ['h', '고마워! 랏코를 구하러 가자!'], '(랏코가 떨어뜨린 칼은 하치와레가 대신 들었다)',
      ['h', '…있잖아, 인어를 먹으면 영원한 생명을 얻는다는 얘기… 알아?'],
      { do: 'pose', k: ['hitoha', 'futaba'], mode: 'shy' }, ['t', '…! …모, 모르겠어요…'], ['f', '…(고개를 푹 숙인다)'],
      ['m', '영원한 생명…? 그거 나도 갖고 싶어!'], { do: 'pose', k: 'kani', mode: 'swing' }, ['k', '…딱! (모몽가를 집게로 꼬집는다)'], ['m', '아야!'],
      { do: 'cast', cast: { momonga: [2.2, 0.2, 'cam', 'nibble'], chiikawa: [1.2, 0.6, 'momonga', 'sit'], hachiware: [0.3, 0.6, 'cam', 'sit'], usagi: [-0.5, 0.9, 'cam', 'sit'], me: [-1.4, 1.1, 'cam', 'sit'] } },
      '(점심을 먹고 잠깐 쉬는데… 모몽가가 사탕을 먹다가 목에 걸렸다!)',
      { do: 'pose', k: 'momonga', mode: 'flail' }, ['m', '켁…! 케, 케겍…!!'],
      { do: 'cast', cast: { chiikawa: [1.6, 0.5, 'momonga', 'wave'] } }, '(치이카와가 달려가 등을 탁탁 두드리자… 사탕이 퐁!)',
      { do: 'pose', k: 'momonga', mode: 'shy' }, ['m', '…흥. …고, 고마워.'], ['c', '…헤헤…']
    ]
  },
  {
    id: 'cave2', at: ISLE.grotto, sky: 'cave', title: '(그 동굴 속)',
    cast: {
      rakko: [-4, -2.6, 0.3, 'idle', 0.4], me: [-1.9, -0.9, 'rakko', 'idle', 0.4], chiikawa: [-2.8, -0.4, 'rakko', 'look', 0.4], hachiware: [-3.7, -0.3, 'rakko', 'idle', 0.4], usagi: [-4.7, -0.4, 'rakko', 'idle', 0.4],
      momonga: [-5.5, -0.9, 'rakko', 'idle', 0.4], kani: [-6.1, -1.6, 'rakko', 'idle', 0.4], hitoha: [-6.0, -2.9, 'rakko', 'shy', 0.35], futaba: [-5.4, -3.5, 'rakko', 'shy', 0.35]
    },
    binds: ['rakko'], cam: [[-0.4, 3.0, 7.0], [-3.2, 1.2, -1.8]],
    lines: [
      '(동굴 안쪽 바위 턱에… 덩굴에 꽁꽁 묶인 랏코가 있다!)', ['r', '…너희… 오면 안 된다…!'], ['h', '랏코! 지금 풀어 줄게!'],
      { do: 'siren', state: 'rise', x: 3.6, z: -4.6, face: -0.5 }, { do: 'mer', list: [{ x: 0.6, z: -0.9, face: -1, state: 'swim' }] }, { do: 'snd', name: 'splash' },
      '(세이렌이 돌아왔다…! 범인을 데려온 줄 알았는지 천천히 다가온다)',
      { do: 'cast', cast: { momonga: [-0.4, -0.8, -1.2, 'hop', 0.3] } }, ['m', '인어다…! 내 영원한 생명~!!'],
      { do: 'mer', list: [{ x: 0.6, z: -0.9, face: -1, state: 'bitten' }] }, { do: 'snd', name: 'hurt' }, '(모몽가가 인어를 덥석 깨물었다!!)',
      { do: 'siren', state: 'angry' }, { do: 'shake', sec: 1 }, { do: 'snd', name: 'growl' }, ['z', '──────!!'],
      { do: 'tendrils', spec: { x: -3, z: -1, r: 4.5 } }, '(세이렌이 노발대발했다!! 사방에서 덩굴이 덮쳐 온다!)',
      { do: 'pose', k: ['me', 'chiikawa', 'hachiware', 'usagi', 'kani', 'hitoha', 'futaba'], mode: 'flail' }, ['h', '흩어져~!!'],
      { do: 'cast', cast: { usagi: [-1.4, -0.2, 0.6, 'sway', 0.4] } }, { do: 'notes', k: 'usagi', on: true },
      ['u', '…우라~ 라~♪'], '(우사기가 갑자기 노래를 시작했다…! 인어가 그 노래를 따라 부르기 시작한다!)',
      { do: 'mer', list: [{ x: 0.6, z: -0.9, face: -1, state: 'sing' }] }, { do: 'siren', state: 'idle' },
      ['h', '{name}! 박자 맞춰서 같이 불러! 시간을 벌자~!'],
      { do: 'game', game: 'chorus' },
      { do: 'branch', on: 'chorus', good: ['(인어가 노래에 푹 빠졌다! 세이렌도 잠깐 넋을 놓고 듣는다)'], bad: ['(삐걱삐걱… 그래도 인어는 따라 불러 주었다!)'] },
      { do: 'notes', k: 'usagi', on: false },
      { do: 'pose', k: 'hachiware', mode: 'swing' }, '(그 틈에 하치와레가 랏코의 칼로 덩굴을 휘휘 쳐냈다!)',
      { do: 'pose', k: 'chiikawa', mode: 'swing' }, '(치이카와가 남은 사탕을 힘껏 던졌다…!)',
      { do: 'siren', state: 'angry' }, '(…하지만 세이렌은 두 번 속지 않았다!)',
      { do: 'bind', k: ['hachiware', 'usagi', 'momonga', 'kani', 'hitoha', 'futaba'], on: true }, { do: 'pose', k: ['hachiware', 'usagi', 'momonga', 'kani', 'hitoha', 'futaba'], mode: 'hurt' },
      '(덩굴이 하치와레, 우사기, 모몽가, 카니… 섬사람들까지 붙잡아 버렸다!)',
      ['h', '치이카와! {name}! 이거 받아…!'], '(하치와레가 랏코의 칼을 휙 던져 주었다)',
      ['h', '…도망쳐!!'], ['c', '…!! (훌쩍)'],
      '(치이카와와 {name}만 겨우 동굴을 빠져나왔다…)'
    ]
  },
  {
    id: 'alone', at: ISLE.hut, sky: 'night', title: '(밤… 정글 속)', fires: ['hut'],
    cast: { chiikawa: [6.2, 9.2, PI, 'sob'], me: [5.4, 8.6, PI, 'idle'] },
    cam: [[5.4, 5.6, 16], [5.4, 0.8, 7.8]],
    lines: [
      '(깜깜한 정글 속을 헤매는 치이카와와 {name}…)', ['c', '…흐에… (훌쩍)'],
      '(그때, 어디선가 맛있는 카레 냄새가 솔솔…)',
      { do: 'roam', id: 'jungle' },
      '(정글 깊은 곳, 불 켜진 오두막이 있다. 간판에는 \'카레 · 조개\')',
      { do: 'cast', cast: { jiro: [0.8, 2.6, 'chiikawa', 'wave'], chiikawa: [-1.0, 3.8, [0, 0], 'shy'], me: [0.2, 4.2, [0, 0], 'idle'] } },
      { do: 'cam', pos: [-3.6, 2.4, 9], look: [0, 1.2, 1.8], blend: 1 }, { do: 'snd', name: 'thud' },
      ['j', '어이, 꼬맹이들. 이런 밤에 뭐 하냐. 배고프지?'], '(웃통을 벗은 덩치 큰 아저씨가 나왔다)',
      ['j', '나는 시마지로다. 앉아라. 카츠카레랑 조개국을 내주지.'],
      { do: 'cast', cast: { chiikawa: [-1.2, 2.2, PI, 'slurp'], me: [0.0, 2.3, PI, 'slurp'], jiro: [-0.6, 0.3, 0, 'talk'] } }, { do: 'cam', pos: [2.6, 2.3, 6.5], look: [-0.6, 1.2, 0.8], blend: 1.2 },
      '(바삭한 카츠카레와 뜨끈한 조개국… 얼어붙었던 몸이 사르르 녹는다)', ['c', '…(눈물을 글썽이며 냠냠)'],
      ['j', '세이렌 말이냐. 녀석은 원래 먼 바다에서 흘러온 녀석이다.'],
      ['j', '섬사람들이 먹을 걸 나눠 주며 잘 지냈는데… 언제부턴가 틀어져 버렸지.'],
      ['j', '친구들이 붙잡혔다고? …좋다. 데려가 주지. 바닷속 길로 가면 들키지 않는다.']
    ]
  },
  {
    id: 'dive', at: { x: ISLE.grotto.x, z: ISLE.grotto.z + 11 }, sky: 'under', title: '(숨을 크게 들이쉬고… 바닷속으로!)',
    cast: { jiro: [0, 0, PI, 'walk', -2], chiikawa: [-0.9, 1.4, PI, 'walk', -2.2], me: [0.9, 1.6, PI, 'walk', -2.1] },
    cam: [[0, -1.5, 5], [0, -2, -2]],
    lines: [
      { do: 'bubbles', on: true }, ['j', '숨 꾹 참아라. 그리고 내 파도에 맞춰 헤엄쳐.'],
      { do: 'game', game: 'swim' },
      { do: 'bubbles', on: false }
    ]
  },
  {
    id: 'rescue', at: ISLE.grotto, sky: 'cave', title: '',
    siren: { state: 'idle', x: 2, z: -3.5, face: -0.3 },
    cast: {
      // 바위 턱 앞쪽 가장자리에 반원으로(사이로 다가가 하나씩 끊을 수 있게)
      rakko: [-1.7, -2.3, 0.9, 'idle', 0.4], hitoha: [-1.8, -1.35, 0.6, 'hurt', 0.4], usagi: [-2.7, -0.6, 0.3, 'hurt', 0.4], hachiware: [-4.0, -0.35, 0, 'hurt', 0.4],
      momonga: [-5.3, -0.6, -0.3, 'hurt', 0.4], kani: [-6.2, -1.3, -0.6, 'hurt', 0.4], futaba: [-6.3, -2.3, -0.9, 'hurt', 0.4],
      jiro: [3.0, 0.4, [2, -3.5], 'idle'], chiikawa: [0.7, 1.7, [2, -3.5], 'look'], me: [1.0, 2.2, [2, -3.5], 'idle'] // 시마지로는 세이렌 곁에서 파도를 흉내 낸다
    },
    binds: ['hachiware', 'usagi', 'momonga', 'kani', 'rakko', 'hitoha', 'futaba'], cam: [[-1.2, 3.4, 8.6], [-0.6, 1.8, -1.6]],
    lines: [
      { do: 'splash', x: 3.0, z: 0.4, s: 0.8 }, '(푸하! 동굴 속 물웅덩이로 고개를 내밀었다)',
      '(세이렌이 붙잡은 친구들을 지키듯 똬리를 틀고 있다…)',
      { do: 'pose', k: 'jiro', mode: 'sway' }, { do: 'snd', name: 'wave' }, ['j', '…쏴아… 쏴아아…'],
      '(시마지로가 파도 소리를 흉내 내자… 세이렌이 스르르 눈을 감는다)', { do: 'siren', state: 'calm' }, { do: 'snd', name: 'wave' },
      ['j', '(작은 목소리로) 내가 재우는 동안 덩굴을 끊어라. 녀석이 뒤척이면… 꼼짝 마라.'],
      { do: 'roam', id: 'rescue' },
      ['h', '치이카와~!! {name}~!!'], ['c', '…!! (와락)'], ['r', '…빚을 졌군.'],
      ['j', '너희 먼저 가라. 나는… 조개 좀 캐고 가지.']
    ]
  },
  {
    id: 'plan', at: ISLE.fire, sky: 'dawn', title: '(새벽, 작전 회의)', fires: ['beach'], props: { pot: true },
    cast: {
      rakko: [0, 1.9, [0, 0], 'talk'], chiikawa: [-1.3, -1.4, [0, 0], 'idle'], hachiware: [1.3, -1.4, [0, 0], 'idle'], me: [0, -1.9, [0, 0], 'idle'], usagi: [1.9, 0, [0, 0], 'idle'],
      momonga: [-1.9, 0.2, [0, 0], 'idle'], kurimanju: [-1.2, 1.4, [0, 0], 'idle'], shisa: [1.2, 1.4, [0, 0], 'idle'], kani: [2.3, 1.4, [0, 0], 'idle']
    },
    cam: [[0, 3, -6], [0, 0.8, 0.6]],
    lines: [
      ['r', '세이렌의 힘은 노래다. 노래로 덩굴을 부리고, 인어들이 그 노래를 받쳐 준다.'],
      ['r', '노래만 막으면… 이길 수 있다.'],
      { do: 'pose', k: 'chiikawa', mode: 'talk' }, ['c', '…저, 저기…!'], '(치이카와가 시마지로에게서 얻어 온 카레 냄비를 가리킨다)',
      ['h', '아! 엄청 매운 카레를 먹이면… 노래를 못 부르겠다!'], ['r', '…좋은 생각이다.'],
      { do: 'pose', k: ['kurimanju', 'shisa'], mode: 'clap' }, '(쿠리만쥬 선배와 시사가 섬에서 제일 매운 고추를 듬뿍 넣어 카레를 끓였다…)',
      ['q', '하아~ 김만 쐬어도 눈이 맵다…'], ['s', '냄새만 맡아도 눈물이 나와요~!'],
      ['m', '흥, 별로 안 맵겠지. (날름)'], { do: 'pose', k: 'momonga', mode: 'faint' }, { do: 'snd', name: 'faint' }, '(모몽가가 그대로 뒤로 넘어갔다)',
      ['h', '…효과는 확실하네…'],
      { do: 'pose', k: 'usagi', mode: 'cheer' }, ['u', '야하!!'], '(우사기가 다 같이 힘내자는 듯 주먹을 번쩍 들었다)'
    ]
  },
  {
    id: 'battle', at: ISLE.battle, sky: 'day', title: '(결전!)',
    siren: { state: 'rise', x: 0, z: 11, face: PI }, tendrils: { x: 0, z: 6, r: 3.5 },
    mer: [{ x: -3, z: 8, face: PI, state: 'sing' }, { x: 3, z: 8.3, face: PI, state: 'sing' }], // 인어는 둘(하나는 먹혀 버렸다)
    cast: {
      kurimanju: [-3.0, 0.2, 0, 'gulp'], usagi: [-1.8, 0.8, 0, 'dance'], momonga: [-0.6, 1.0, 0, 'flail'], rakko: [1.6, 1.6, 0, 'train'], chiikawa: [0.3, -0.6, 0, 'look'], hachiware: [1.1, -0.8, 0, 'idle'],
      me: [-0.4, -1.0, 0, 'idle'], jiro: [2.9, -1.6, 0, 'idle'], shisa: [-3.8, -1.2, 0, 'cheer'], kani: [3.9, -0.6, 0, 'idle'], isl1: [-5, -3, 0, 'look'], isl2: [5, -3, 0, 'look'], hitoha: [-2.4, -3.4, 0, 'idle'], futaba: [2.2, -3.6, 0, 'idle']
    },
    cam: [[-1.5, 3.6, -8], [-0.5, 3, 8]],
    lines: [
      { do: 'shake', sec: 1 }, { do: 'snd', name: 'growl' }, { do: 'wait', sec: 1.2 }, { do: 'siren', state: 'sing' },
      '(세이렌이 나타났다! 인어들의 합창에 맞춰 덩굴이 뻗어 온다!)',
      ['r', '작전대로다! 박자로 인어들의 노래를 흐트러뜨려라!'],
      '(쿠리만쥬 선배가 맥주 캔을 두드리고, 우사기가 랩을 하고, 모몽가가 소리를 지른다!)',
      ['h', '{name}! 우리도 박자 맞춰~!'],
      { do: 'game', game: 'battle' },
      { do: 'branch', on: 'battle', good: ['(인어들의 합창이 엉망진창이 됐다! 세이렌의 노래가 흔들린다!)'], bad: ['(합창이 조금씩 어긋나기 시작했다!)'] },
      { do: 'mer', list: [{ x: -3, z: 8, face: PI, state: 'swim' }, { x: 3, z: 8.3, face: PI, state: 'swim' }] },
      { do: 'pose', k: 'rakko', mode: 'swing' }, { do: 'tendrils', spec: null }, { do: 'snd', name: 'hit' }, '(그 틈에 랏코가 덩굴을 단칼에 베어 냈다!)',
      { do: 'cast', cast: { momonga: [0.3, 8.6, PI, 'flail', 3.2] } }, '(모몽가가 덩굴을 타고 올라가 꼬리로 세이렌의 코를 간질간질…)',
      { do: 'siren', state: 'idle' }, { do: 'sirenMouth', v: 0.8 }, ['z', '…하… 하아… (입이 크게 벌어진다!)'],
      { do: 'pose', k: 'jiro', mode: 'cheer' }, ['j', '지금이다!! 꼬맹이들, 날아라~!!'],
      { do: 'cast', cast: { chiikawa: [-0.6, 5.8, PI, 'flail', 3.2], hachiware: [0.7, 5.6, PI, 'flail', 3.4], me: [0.1, 5.2, PI, 'flail', 3.0] } },
      { do: 'cam', pos: [9, 4.2, 4], look: [0, 3.6, 8.5], blend: 0.8 },
      '(시마지로가 치이카와와 하치와레, {name}을 번쩍 들어 세이렌 쪽으로 던졌다!)',
      ['h', '어떻게든 되어라~~!!'],
      { do: 'game', game: 'throw' },
      { do: 'siren', state: 'hurt' }, { do: 'shake', sec: 1.2 }, { do: 'snd', name: 'hit' },
      '(매운 카레가 세이렌의 입속으로 쏙!!)', ['z', '────!!! (얼굴이 새빨개지며 콜록콜록)'],
      '(노래가… 멈췄다!)', { do: 'snd', name: 'pass' },
      { do: 'cast', cast: { chiikawa: [0.3, 0.4, 0, 'hop'], hachiware: [1.1, 0.2, 0, 'hop'], me: [-0.5, 0.2, 0, 'hop'], momonga: [-0.8, 1.3, 0, 'pose'] } },
      { do: 'cam', pos: [-5.5, 3.2, -6.5], look: [0, 2.4, 6], blend: 1 },
      { do: 'cast', cast: { isl1: [-1.8, 2.4, 0, 'flail'], isl2: [1.6, 2.6, 0, 'flail'], hitoha: [-0.4, 3.0, 0, 'flail'] } },
      ['i', '지금이다…! 먹혀 버린 친구들의 원수를…!'], '(섬사람들이 세이렌에게 몰려들려 한다)',
      { do: 'cast', cast: { hachiware: [0.6, 3.6, PI / 6, 'talk'] } }, ['h', '잠깐!! 이제 그만하자…!'],
      ['h', '세이렌도… 친구를 잃어서 슬펐던 거잖아…'],
      { do: 'siren', state: 'calm' }, '(세이렌은 한참 동안 하치와레를 바라보더니… 천천히 고개를 끄덕였다)',
      { do: 'siren', state: 'swipe' }, { do: 'snd', name: 'splash' }, '(돌아서는 세이렌의 꼬리가 크게 휘둘러졌다…!)',
      { do: 'cast', cast: { futaba: [0.3, 1.2, PI, 'hurt'] } }, ['f', '…위험해요…!!'],
      { do: 'shake', sec: 0.6 }, { do: 'snd', name: 'thud' }, { do: 'cast', cast: { futaba: [0.3, 1.0, PI / 2, 'faint'] } },
      '(두잎이 치이카와를 감싸며… 대신 꼬리에 맞았다!)', { do: 'pose', k: 'chiikawa', mode: 'sob' }, ['c', '…!! 두, 두잎…!'],
      { do: 'lid', on: true }, { do: 'cam', pos: [2.4, 1.6, -1.2], look: [0.3, 0.3, 1.0], blend: 1.2 },
      '(쓰러진 두잎의 등에… 작은 뚜껑 같은 게 보였다…? 마치 건전지를 넣는 칸처럼…)',
      { do: 'cast', cast: { hitoha: [0.9, 0.4, 'futaba', 'sob'] } }, ['t', '…! (서둘러 두잎을 끌어안아 등을 가린다)'],
      ['t', '…괜찮아요. 두잎은… 튼튼하니까요.'], ['c', '……'],
      { do: 'siren', state: 'leave' }, { do: 'mer', list: [] }, '(세이렌과 인어들은 먼 바다로 떠나갔다…)'
    ]
  },
  {
    id: 'memory', at: ISLE.memory, sky: 'memory', title: '(…아주 오래전, 어느 날)', props: { memory: true },
    cast: { futaba: [0.2, 2.2, PI / 2, 'faint', 0.12], hitoha: [-0.7, 2.9, 'futaba', 'sob'] },
    cam: [[4.2, 2.6, 7.5], [0, 0.6, 1.6]],
    lines: [
      '(세이렌과 인어들이 고깃배 곁에서 놀다가… 세이렌의 꼬리가 배를 부숴 버렸다)',
      '(크게 다쳐 움직이지 않는 두잎)',
      '(울면서 도감을 넘기던 한잎의 눈에, 한 줄이 들어왔다)',
      '『인어를 먹으면 영원한 생명을 얻는다』',
      '(…그 뒤의 일은, 두 사람만의 비밀이다)'
    ]
  },
  {
    id: 'farewell', at: ISLE.fire, sky: 'night', title: '(마지막 밤)', fires: ['beach'],
    cast: {
      chiikawa: [-3.4, -1.0, [-5.4, -2.2], 'sit'], hitoha: [-5.0, -2.2, 'chiikawa', 'idle'], futaba: [-5.7, -1.6, 'chiikawa', 'idle'],
      me: [0, -1.9, [0, 0], 'sit'], hachiware: [1.2, -1.45, [0, 0], 'sit'], usagi: [1.85, -0.3, [0, 0], 'sit'], rakko: [1.5, 1.1, [0, 0], 'sit'], kani: [0.55, 1.85, [0, 0], 'sit'],
      momonga: [-0.55, 1.85, [0, 0], 'sit'], shisa: [-1.5, 1.1, [0, 0], 'sit'], kurimanju: [-1.85, -0.3, [0, 0], 'gulp'], jiro: [2.9, 2.4, [0, 0], 'idle'], isl1: [3.2, -1.8, [0, 0], 'sway'], isl2: [2.4, 3.4, [0, 0], 'sway']
    },
    cam: [[-1.5, 2.8, -6.5], [-2.4, 0.8, 0]],
    lines: [
      { do: 'snd', name: 'song' }, '(마지막 밤. 다시 모닥불을 피우고 다 같이 노래했다)',
      '(치이카와는 조금 떨어진 곳에 앉아, 이파리 머리의 두 사람, 한잎과 두잎을 바라본다…)',
      ['c', '…저기…'], ['t', '…네?'], ['f', '……'],
      '(물어보고 싶은 게 있었다. 그 뚜껑이 뭔지, 인어는 어떻게 된 건지…)',
      '(…치이카와는 끝내 묻지 않기로 했다)', ['c', '…아, 아무것도 아니야…'], ['t', '…(살며시 웃는다)'],
      { do: 'cast', cast: { hachiware: [-2.6, -1.5, [-5.4, -2.2], 'sit'], usagi: [-4.2, -0.5, [-5.4, -2.2], 'sit'] } },
      ['h', '치이카와~ 여기 있었구나!'], ['u', '우라~'], '(셋이 나란히 앉아 일렁이는 불꽃을 바라봤다)',
      { do: 'hide', k: ['hitoha', 'futaba'] }, '(어느새, 잎사귀 두 사람은 어둠 속으로 조용히 사라져 있었다…)',
      { do: 'cast', cast: { jiro: [-0.9, -3.0, 'me', 'talk'] } }, ['j', '어이, 꼬맹이들. 선물이다.'],
      '(시마지로가 조개국과 카레 레시피, 그리고 남은 카레를 건네주었다!)',
      ['j', '집에 가서도 만들어 먹어라. 매운 건… 적당히 넣고.'], ['h', '고마워요, 시마지로 씨~!'],
      '(그날 밤은 방갈로에서 파도 소리를 들으며 푹 잤다…)',
      { do: 'sleep' }
    ]
  },
  {
    id: 'depart', at: { x: ISLE.jetty.x + 3.3, z: ISLE.jetty.z + 2.5 }, sky: 'day', title: '',
    boats: { duck: { x: 0, z: 4.5, face: 0, moving: true } },
    cast: {
      // 선착장(왼쪽, -x) 쪽을 보고 손을 흔든다. 선실이 뒤라 앞 갑판(dz -0.5 ~ 2.6)에
      me: [-0.6, 0.2, -PI / 2, 'wave', 0, 'duck'], chiikawa: [-1.0, 1.0, -PI / 2, 'wave', 0, 'duck'], hachiware: [-0.3, 1.6, -PI / 2, 'wave', 0, 'duck'], usagi: [-1.1, 2.1, -PI / 2, 'wave', 0, 'duck'], rakko: [0.6, 2.4, -PI / 2, 'idle', 0, 'duck'],
      momonga: [0.5, 0.8, -PI / 2, 'pose', 0, 'duck'], kani: [1.0, 1.6, -PI / 2, 'wave', 0, 'duck'], kurimanju: [0.9, -0.2, -PI / 2, 'gulp', 0, 'duck'], shisa: [0.2, 2.6, -PI / 2, 'wave', 0, 'duck'],
      isl1: [-3.3, -2.5, [0, 4.5], 'wave'], isl2: [-3.3, -1.6, [0, 4.5], 'wave'], isl3: [-3.3, -0.7, [0, 4.5], 'wave'], isl4: [-3.3, 0.2, [0, 4.5], 'wave'], jiro: [-3.3, -3.6, [0, 4.5], 'wave']
    },
    cam: [[-4.6, 3.0, 9.2], [0, 1.2, 2.5]], // 바다 쪽에서: 손 흔드는 친구들 너머로 선착장의 섬사람들
    lines: [
      '(아침. 오리 배가 섬을 떠난다)', ['i', '…안녕히 가세요~ 또 와요~'],
      '(섬사람들이 손을 흔든다. 그런데… 잎사귀 두 사람은 보이지 않는다)', ['c', '……'],
      ['m', '흥… 영원한 생명은 이제 됐어. 영원히 살면 귀찮을 것 같아.'],
      ['q', '하아~ 배멀미엔 해장술이지…'],
      { do: 'scale' }, '(바람에 반짝이는 비늘 하나가 날아올라… 바다 저편으로 사라졌다)'
    ]
  },
  {
    id: 'far', at: ISLE.far, sky: 'day', title: '',
    boats: { far: { x: 0, z: 0, face: -PI / 2, drift: 0.35 } },
    cast: { hitoha: [0.55, 0, -PI / 2, 'pull', 0, 'far'], futaba: [-0.55, 0, -PI / 2, 'idle', 0, 'far'] },
    // 배 뒤를 세이렌이 머리만 내밀고 쫓고, 그 뒤로 인어 둘이 따라간다(배 기준 자리 — 배와 함께 움직인다)
    siren: { state: 'idle', x: 8, z: 0.2, face: -PI / 2, ride: 'far', sink: 3.6 },
    mer: [{ x: 13.4, z: 1.3, face: -PI / 2, state: 'swim', ride: 'far' }, { x: 14.8, z: -0.9, face: -PI / 2, state: 'swim', ride: 'far' }],
    // 처음엔 배 뒤에서 먼 섬을 향해 가는 배만 → 카메라가 뒤로 빠지며 쫓아오는 세이렌과 인어가 드러난다
    cam: [[2.6, 2.4, 4.6], [-12, 0.6, -1.5]],
    lines: [
      '(…멀리, 작은 배 한 척이 다른 섬을 향해 조용히 노를 젓고 있다)',
      { do: 'cam', pos: [8, 12, 21], look: [7.5, 0, 0], blend: 3.6 }, { do: 'wait', sec: 3.4 },
      '(그 뒤를… 커다란 두 눈이 물 위로, 가만히 그 배를 바라보며 따라간다)',
      '(그리고 세이렌 뒤로… 인어 둘이 물결 사이로 고개를 내밀며 따라가고 있었다)'
    ]
  }
];

/**
 * 직접 걷는 곳(stories/islandroam.js). 자리는 그 장면의 at 기준 상대 좌표.
 *  festival: 환영 뒤 섬 축제 — 포장마차 넷에서 먹기 · 춤판 · 친구 · 섬사람들과 이야기. 하치와레에게 '숙소로 가자'를 고르면 끝.
 *  jungle: 밤의 정글 — 치이카와와 함께 카레 냄새를 따라 오두막까지.
 *  rescue: 동굴 구출 — 시마지로가 세이렌을 재우는 동안 덩굴 끊기. 세이렌이 뒤척일 때 움직이면 들킬 뻔한다.
 *  goal: 위 가운데 알약(hud.setTimer 조각) — 글자는 늘, { text, narrow: 'hide' } 는 좁은 세로 휴대폰에서 숨긴다.
 */
const talk = (k, lines, again) => ({ id: k, k, r: 1.5, label: '말 걸기', lines, again });
const free = (k, line) => ({ id: k, k, r: 1.8, label: '덩굴 끊기', free: true, lines: [line] });
export const ROAMS = {
  festival: {
    area: 'beach', me: [0, 7.0, PI], cam: [8.2, 6.6], // 높이 내려다봐서 환영 아치에 가리지 않게
    goal: ['섬 축제를 즐기자!', { text: '다 놀았으면 하치와레에게', narrow: 'hide' }], tip: '돌아다니며 말을 걸고 포장마차에서 먹어 보자',
    targets: [
      { id: 'ramen', at: [-6, 4.05], r: 1.3, label: '라멘 먹기', eat: 'slurp', lines: ['(진한 해물 국물의 섬 한정 라멘! 후루룩…)', ['s', '헤헤, 섬 해초를 듬뿍 넣었대요! 맛있죠?']], again: ['(한 그릇 더… 배가 빵빵하다!)'] },
      { id: 'parfait', at: [-2, 4.05], r: 1.3, label: '파르페 먹기', eat: 'nibble', lines: ['(랏코 뒤에 줄 서서 받은 과일 파르페! 과일이 산처럼 쌓였다)', ['r', '…디저트는 수련에 필요한 영양이다.']], again: ['(또 줄 섰다. 랏코도 또 서 있다…)'] },
      { id: 'yakisoba', at: [2, 4.05], r: 1.3, label: '야키소바 먹기', eat: 'slurp', lines: ['(철판에서 지글지글! 소스 냄새가 끝내준다)', ['q', '하아~ 야키소바엔 역시 이거지. (맥주를 들어 보인다)']], again: ['(후루룩… 역시 맛있다!)'] },
      { id: 'cotton', at: [6, 4.05], r: 1.3, label: '솜사탕 먹기', eat: 'nibble', lines: ['(구름만 한 솜사탕! 입 주위가 끈적끈적…)', ['u', '후루루루~!']], again: ['(솜사탕 하나 더… 달다!)'] },
      // 춤판: 춤추는 섬사람 둘 사이(그 둘에게 말을 거는 대신 같이 춤춘다)
      { id: 'dance', at: [-4.5, 9.0], r: 1.8, label: '같이 춤추기', eat: 'dance', lines: [['i', '축제 땐 다 같이 춤춰요~ 같이 춰요!'], { do: 'snd', name: 'song' }, '(섬사람들과 빙글빙글 춤을 췄다!)', ['i', '♪ 어서 와요~ 우리 섬에~ ♪']], again: [{ do: 'snd', name: 'song' }, '(또 신나게 춤췄다!)'] },
      { ...talk('hachiware', [['h', '{name}~! 축제 최고다~! 소다도 공짜래!'], ['h', '숙소는 바다 위 방갈로래~ 다 놀았으면 말해 줘!']], [['h', '헤헤, 재밌다~!']]),
        ask: { text: '이제 숙소로 갈까?', choices: ['응, 숙소로 가자!', '조금 더 놀래'], end: 0 } },
      talk('chiikawa', [['c', '…(라멘 냄새를 맡으며 행복한 얼굴)…'], ['c', '…섬… 좋다…!']], [['c', '…헤헤…']]),
      talk('usagi', [['u', '야하~!'], '(우사기가 솜사탕을 한 입 뜯어 내밀었다)', ['u', '우라!']], [['u', '후루루루~!']]),
      talk('rakko', [['r', '…파르페 줄이다. 새치기는 안 된다.'], ['r', '…그런데 토벌 얘기는 아무도 안 하는군. 수상하다.']], [['r', '…(묵묵히 줄을 서 있다)']]),
      talk('momonga', [['m', '흥, 뭐야. 혼자 먹는 게 제일 맛있다고!'], ['m', '…보수 100배는 언제 주는 거야?']], [['m', '저리 가! 흥!']]),
      talk('kani', [['k', '…딱딱.'], '(카니가 바위 언덕 쪽을 가만히 쳐다보고 있다…)'], [['k', '…딱.']]),
      talk('kurimanju', [['q', '하아~ 남쪽 섬에서 마시는 맥주는 또 각별하지…'], ['q', '야키소바 먹어 봐. 철판에서 갓 구운 거야.']], [['q', '하아~']]),
      talk('shisa', [['s', '어서 오세요~! 섬 한정 라멘이에요!'], ['s', '저도 여기서 알바하면서 섬 요리를 배우고 있어요!']], [['s', '맛있게 드세요~!']]),
      talk('isl3', [['i', '과일 파르페 있어요~ 줄 서 주세요…'], ['i', '…섬은 처음이세요…? 즐겁게 놀다 가세요… 정말로요…']], [['i', '…또 오셨네요…!']]),
      talk('isl4', [['i', '솜사탕, 크게 만들어 드릴게요…!']], [['i', '…(솜사탕 기계를 빙글빙글)']]),
      talk('hitoha', [['t', '…아, 안녕하세요…'], ['t', '…축제, 재밌으세요…? …다행이다…']], [['t', '…(두잎 손을 꼭 잡고 있다)']]),
      talk('futaba', [['f', '…(꾸벅)'], ['f', '…저… 소다, 맛있었어요…?']], [['f', '…(한잎 뒤에 쏙 숨는다)']])
    ]
  },
  jungle: {
    area: 'beach', me: [5.4, 8.6, PI], follow: 'chiikawa', cam: [5.6, 7.4],
    goal: ['카레 냄새를 따라 불빛 쪽으로', { text: '치이카와와 함께', narrow: 'hide' }],
    targets: [
      { id: 'rustle', at: [3.4, 5.0], r: 1.9, auto: true, lines: [{ do: 'snd', name: 'thud' }, '(덤불이 바스락…!)', { do: 'pose', k: 'chiikawa', mode: 'flail' }, ['c', '…!! (화들짝)'], '(…바람이었다. 치이카와가 {name} 옷자락을 꼭 잡는다)'] },
      { id: 'hut', at: [0, 2.8], r: 2.4, auto: true, end: true, lines: [] }
    ]
  },
  rescue: {
    area: 'grotto', me: [1.0, 2.2, PI], follow: 'chiikawa', cam: [4.6, 6.6],
    goal: ['덩굴을 끊어 친구들 구하기', { text: '세이렌이 뒤척이면 꼼짝 마!', narrow: 'hide' }], tip: '세이렌이 뒤척일 때 움직이면 들킬 뻔해요',
    watch: {
      every: [8, 12], warn: 1.8, warnText: '세이렌이 뒤척인다…! 멈춰!',
      caught: [{ do: 'siren', state: 'angry' }, { do: 'shake', sec: 0.5 }, { do: 'snd', name: 'growl' }, '(세이렌이 눈을 번쩍…!)', ['j', '…쏴아… 쏴아아…'],
        { do: 'siren', state: 'calm' }, '(시마지로가 서둘러 파도 소리를 내자, 세이렌이 다시 스르르 눈을 감았다…)']
    },
    targets: [
      free('hachiware', ['h', '{name}~!! 와 줬구나~!']), free('usagi', ['u', '야하~!']), free('momonga', ['m', '흥, 늦었잖아! …고, 고마워.']), free('kani', ['k', '…딱! (꾸벅)']),
      free('rakko', ['r', '…고맙다.']), free('hitoha', ['t', '…고, 고맙습니다…']), free('futaba', ['f', '…(꾸벅꾸벅)'])
    ]
  }
};
