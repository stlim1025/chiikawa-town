import { FRIENDS, friendOf, hearts, ptsForHearts, MAX_HEARTS, GIFT_HEARTS, befriendBy } from './friends.js';
import { homeOf, FURNITURE } from './home.js';
import { hasLicense, studyProgress, STUDY } from './licenses.js';
import { bagOf, takeItem, addItem, registerItems, itemInfo } from './inventory.js';
import { ACCESSORY_ITEMS, wardrobeOf } from './wardrobe.js';
import { WEAPONS, weaponOf, MONSTERS } from './combat.js';
import { WEED_KINDS, josa } from './weeding.js';
import { hourOf } from './clock.js';
import { VILLAGERS, villagerOf, BED_HOUR } from './villagers.js';

/**
 * 퀘스트(5단계): 친구마다 고충(부탁)과 마을 이야기. 친구 머리 위에 ! 가 뜨면 부탁이 있다는 뜻이고,
 * 말을 걸어 들어 주면 단계(step)를 하나씩 해 나간다. 다 하면 돈 · 친밀도 · 물건 · 꾸미기 · 무기 · 가구를 받는다.
 * 단계 종류:
 *   bring   { items: { id: 개수 } }    가방에 모아서 to 에게 건넨다(건네면 가방에서 빠진다)
 *   hunt    { species, n }             그 몬스터를 n 마리 잡고(단계를 받은 뒤부터 센다) to 에게 알린다
 *   pull    { kind, n }                그 풀을 n 개 뽑고 to 에게 알린다
 *   license { id }                     그 자격증을 따고 to 에게 알린다
 *   study   { id }                     그 자격 시험 공부(licenses.js 의 STUDY: 술 강의 · 토벌 안내서)를 하고 to 에게 알린다(이미 그 자격이 있으면 끝난 것으로)
 *   talk    { }                        to 에게 말을 건다
 *   visit   { place, night?, evening?, with? } 그곳에 가면 저절로 끝난다(night 면 밤 19시 ~ 새벽 5시, evening 이면 저녁 17 ~ 21시에만,
 *                                       with 면 부탁한 친구와 같이 가야 한다)
 *   together { act, n }                부탁한 친구와 같이(친구가 따라다니는 동안) 일상 일(ACTS)을 n 번 하면 저절로 끝난다
 * daily: 일상 부탁(같이 라멘 먹기 · 같이 풀 뽑기 같은 사소한 일). again: 끝내고 그만큼 날이 지나면 또 부탁한다.
 *   wish: { hours: [시작, 끝), need?: 'hungry' 배고플 때 | 'broke' 돈이 모자랄 때 | 'tired' 지쳤을 때, chance: 그날 그 마음이 들 확률 }
 *   — 일상 부탁은 늘 떠 있지 않고, 그 친구가 정말 그럴 형편 · 시간일 때만, 마을 전체에 많아야 MAX_WISHES 개만 뜬다.
 *   boss    { }                        이야기 속 왕버섯을 쓰러뜨리면 저절로 끝난다
 *   scene   { scene }                  main 이 그 장면(사이드스토리 연출)을 끝까지 보여 주면 끝난다(받자마자 시작)
 *   visit 에 hours: [시작, 끝) 이 있으면 그 시각에만(24 를 넘기면 자정 너머까지), scene 이 있으면 도착했을 때 대화 대신 그 장면을 연다.
 * 사이드스토리(side): 원작 에피소드를 따라가는 이야기. 머리 위에 ! 대신 펼친 책(이야기 표시)이 뜨고, 한 번에 하나만,
 *   하나를 끝내면 SIDE_GAP 일 동안은 다음 이야기가 열리지 않는다(일상 부탁처럼 되풀이하는 daily 사이드는 따로).
 *   needStory: state.story[그 이름] 에 적힌 날 다음 날부터(본 일이 있어야) · after: 그 퀘스트를 끝낸 뒤 · hours: 그 시각에만 부탁한다.
 *   reward.friends: { 친구: 점수 } 같이 한 친구들 친밀도도.
 * to 를 적지 않으면 부탁한 친구(giver)에게 알린다. say: 그 단계를 끝냈을 때 to(visit · boss 는 speaker)가 하는 말.
 * state.quests = { 퀘스트 id: { step, base: 그 단계를 받았을 때 센 값, done?: 끝낸 날 } }, state.questTrack = 화면에 띄울 퀘스트 id,
 * state.story = { bossSeen?, bossDown? }, state.truce = 모몽가가 소매치기를 쉬는 마지막 날.
 */

/** 퀘스트에서만 받는 먹을 것. */
export const QUEST_ITEMS = {
  riceball: { name: '우사기 주먹밥', kind: 'food', note: '소풍 돗자리 위에서 받은 커다란 주먹밥. 먹으면 기운이 20 찬다.', eat: 20 },
  jellybake: { name: '젤리 구이', kind: 'food', note: '쿠리만쥬가 구운 겉바삭 속쫀득 안주. 먹으면 기운이 30 찬다.', eat: 30 },
  bottlebeer: { name: '병맥주', kind: 'food', note: '쿠리만쥬가 챙겨 준 시원한 병맥주. 마시면 기운이 25 찬다.', eat: 25 },
  pizzabun: { name: '피자호빵', kind: 'food', note: '라멘 로우의 새 메뉴. 반으로 가르면 치즈가 쭈욱 늘어나는 피자 맛 호빵. 먹으면 기운이 30 찬다.', eat: 30 },
  katsucurry: { name: '시마지로 카츠카레', kind: 'food', note: '섬 정글의 시마지로가 싸 준 바삭한 카츠카레. 살짝 맵다! 먹으면 기운이 45 찬다.', eat: 45 },
  shellsoup: { name: '섬 조개국', kind: 'food', note: '시마지로의 레시피로 끓인 뜨끈한 조개국. 먹으면 기운이 30 찬다.', eat: 30 },
  // 보스에게 처음 쓰러진 뒤 랏코가 힘내라며 준다(main 의 랏코 조언)
  rakkobento: { name: '랏코의 대나무 도시락', kind: 'food', note: '"우선 기운부터 채워라" 하며 랏코가 건넨 대나무 잎 도시락. 작은 주먹밥 둘이 들어 있다. 먹으면 기운이 40 찬다.', eat: 40 }
};
registerItems(QUEST_ITEMS);

/** 퀘스트에 나오는 곳(main 이 world 좌표로 채운다: cave, lair). r: 이만큼 가까이 가면 도착. */
export const PLACES = {
  cave: { name: '하치와레 동굴', r: 3.2 },
  lair: { name: '바위산 깊은 곳', r: 9 },
  pub: { name: '맥주집', r: 3 },
  bridge: { name: '강가 다리', r: 3.4 },
  plaza: { name: '광장', r: 4.5 },
  exam: { name: '검정소', r: 3 },
  home: { name: '내 집 앞', r: 2.6 },
  pier: { name: '선착장', r: 3 }
};

/** 같이 하기(together) 부탁에서 세는 일상 일. main 이 내가 그 일을 할 때마다 logAct 로 센다. */
export const ACTS = { ramen: '라멘 먹기', weed: '풀 뽑기', berry: '열매 따기' };

/** 내가 한 일상 일을 센다. withKinds: 그때 옆에서 같이 다니던 친구들(그 친구와 같이 한 것으로도 센다). */
export function logAct(state, act, withKinds = []) {
  const acts = { ...(state.acts || {}) };
  acts[act] = (acts[act] || 0) + 1;
  for (const k of withKinds) acts[`${act}@${k}`] = (acts[`${act}@${k}`] || 0) + 1;
  return { ...state, acts };
}
const actsWith = (state, act, kind) => (state.acts || {})[`${act}@${kind}`] || 0;

export const QUESTS = {
  // ---------- 마을 이야기(대장 갑옷 씨): 바위산의 수상한 기척 → 왕버섯 ----------
  story: {
    title: '바위산의 수상한 기척', giver: 'captain', story: true, needHearts: 0, tutorial: true,
    ask: '무슨 일이에요?',
    offer: ['흠흠. {name}, 잠깐 이야기 좀 하지.', '요즘 마을 밖 몬스터가 부쩍 늘었다. 특히 북쪽 바위산 쪽이다.', '마을을 지키려면 토벌할 줄 아는 사람이 필요해.', '토벌 자격증을 따 와라. 그 전에 검정소 토벌 안내서부터 읽고 와라. 필기는 전부 거기서 나온다.'],
    steps: [
      // 안내서를 안 읽고 시험부터 봤다가 필기에서 떨어지는 일이 많아서, 먼저 읽고 오게 한다(예전 저장은 save.js 가 단계 번호를 한 칸 민다)
      { type: 'study', id: 'hunter', goal: '검정소에서 토벌 안내서를 읽어 보자! (검정소 창에서 토벌 안내서 「읽기」)', say: ['흠. 안내서는 읽었군.', '몬스터가 사는 곳과 공격, 전리품까지. 필기는 안내서에 적힌 그대로 나온다.', '준비가 되면 검정소에서 시험을 봐라. 자격증을 따면 무기는 도구점에서 살 수 있다.'] },
      { type: 'license', id: 'hunter', goal: '검정소에서 토벌 자격증을 따자! (응시료 300원)', say: ['흠! 합격했군. 역시 내 눈은 틀리지 않았다.', '그럼 첫 임무다. 바위산의 이끼 거북을 3마리 줄여 줘라.'] },
      { type: 'hunt', species: 'turtle', n: 3, goal: '북쪽 바위산의 이끼 거북 세 마리를 잡자!', say: ['수고했다. 그런데… 이상하군.', '쓰러뜨려도 쓰러뜨려도 바위산 쪽에서 계속 나타난다고 한다.', '랏코라면 뭔가 알지도 모른다. 랏코 수련장에 가 봐라.'] },
      { type: 'talk', to: 'rakko', goal: '랏코에게 바위산 이야기를 물어보자!', say: ['…대장이 보냈나.', '바위산 깊은 곳에서 이상한 기척이 난다. 몬스터들이 거기서 깨어나는 것 같다.', '옛날 이야기라면 카니가 잘 알 거다. 헌책방에 가 봐라.'] },
      { type: 'talk', to: 'kani', goal: '카니 헌책방에서 옛이야기를 들어 보자!', say: ['…바위산 이야기?', '(낡은 그림책을 펼친다)', '…"바위산 깊은 곳, 길이 끝나는 곳에 커다란 버섯이 산다. 포자를 뿌려 풀과 몬스터를 깨운다"…', '…그림책 이야기인 줄 알았는데…', '…바위산 오솔길 끝이야. 조심해. 딱.'] },
      { type: 'visit', place: 'lair', goal: '바위산 오솔길 끝을 살펴보자! (깊은 곳)', speaker: null, say: ['(땅이 쿵, 쿵 울린다…)', '(바위 그늘에서 커다란 버섯이 몸을 일으켰다!)', '…저게 그림책 속 왕버섯이야! 일단 마을에 알리자.'] },
      { type: 'talk', goal: '대장 갑옷 씨에게 왕버섯 이야기를 하자!', say: ['…왕버섯이라고?!', '그 녀석이 포자로 몬스터들을 깨우고 있었던 거군.', '기운을 가득 채우고, 좋은 무기를 들고 가라. 가까이 가면 풀뭉치를 불러낸다니 조심하고.', '마을의 운명이 너에게 달렸다, {name}!'] },
      { type: 'boss', goal: '바위산 깊은 곳의 왕버섯을 쓰러뜨리자!', speaker: null, say: ['(왕버섯이 털썩 쓰러지며 포자가 흩어졌다…)', '(바위산에 조용한 바람이 분다)', '해냈다! 대장 갑옷 씨에게 알리자.'] },
      { type: 'talk', goal: '대장 갑옷 씨에게 알려 주자!', say: ['…해냈군, {name}!', '이제 바위산도 조용해질 거다. 마을 모두를 대신해서… 고맙다.', '이건 마을이 너에게 주는 선물이다. 흠흠, 잘 어울리겠군.'] }
    ],
    reward: { money: 5000, bond: 6, accessory: 'crown', village: 3 }
  },
  // ---------- 친구들의 고충 ----------
  pillow: {
    title: '치이카와의 베개', giver: 'chiikawa', needHearts: 1, ask: '무슨 고민 있어?',
    offer: ['…있잖아…', '요즘 밤마다… 무서운 꿈을 꿔…', '들판의 풀뭉치가… 데굴데굴 쫓아오는 꿈…', '…보송보송한 베개가 있으면… 괜찮을 것 같아…', '풀뭉치 솜털… 3개만… 구해 줄 수 있어…?'],
    steps: [{ type: 'bring', items: { fluffdown: 3 }, goal: '보송 솜털 세 개를 치이카와에게 갖다주자! (동쪽 들판 풀뭉치)', say: ['…! 보송보송해…!', '이걸로 베개 만들면… 무서운 꿈… 안 꿀 거야…', '…고마워…♪ 이거… 내가 좋아하는 꽃 핀…'] }],
    reward: { money: 300, bond: 3, accessory: 'flower' }
  },
  picnic: {
    title: '우사기의 소풍 자리', giver: 'usagi', needHearts: 1, ask: '무슨 일 있어?',
    offer: ['우라!', '(들판 쪽을 가리키며 펄쩍펄쩍 뛴다)', '하아?! (데굴데굴 굴러가는 시늉을 한다)', '(돗자리를 펼치는 시늉을 하고는 고개를 젓는다)', '(들판의 풀뭉치 때문에 소풍을 못 가는 것 같다…!)'],
    steps: [{ type: 'hunt', species: 'fluff', n: 4, goal: '동쪽 들판의 풀뭉치 네 마리를 쫓아내 주자!', say: ['우라~!!', '(돗자리를 활짝 펼치고 커다란 주먹밥을 건넨다)', '야하! 야하!'] }],
    reward: { money: 400, bond: 3, items: { riceball: 3 } }
  },
  treasure: {
    title: '모몽가의 보물 상자', giver: 'momonga', needHearts: 1, ask: '뭐 원하는 거 있어?',
    offer: ['야, {name}. 나 반짝이는 게 필요해.', '숲 뿔벌레 뿔이랑, 밤에 나는 나방 날개 가루.', '…가져오면 당분간 네 지갑은 봐줄게. 흥!'],
    steps: [{ type: 'bring', items: { horn: 2, moondust: 1 }, goal: '반짝 뿔 두 개랑 달빛 가루 하나를 모몽가에게 갖다주자!', say: ['…흥, 생각보다 빨랐네.', '(보물 상자에 넣으며 몰래 흐뭇해한다)', '약속은 약속이야. 사흘은 봐줄게. 이 리본도 가져. 흥!'] }],
    reward: { bond: 3, accessory: 'ribbon', truce: 3 }
  },
  snack: {
    title: '쿠리만쥬의 새 안주', giver: 'kurimanju', needHearts: 2, ask: '오늘은 뭐 만들어?',
    offer: ['하아~ 이번에 새 안주를 만들어 보려고.', '말랑말랑한 젤리를 구우면… 겉은 바삭, 속은 쫀득하지 않을까?', '강가 슬라임이 떨어뜨리는 말랑 젤리 3개랑 빨간 열매 4개만 있으면 돼~', '하아~ 부탁해도 될까?'],
    steps: [{ type: 'bring', items: { jelly: 3, berry: 4 }, goal: '말랑 젤리 세 개랑 빨간 열매 네 개를 쿠리만쥬에게 갖다주자!', say: ['오~ 고마워!', '(지글지글… 고소하고 달콤한 냄새가 난다)', '하아~ 대성공이야! 이건 네 몫. 배고플 때 먹어~'] }],
    reward: { money: 500, bond: 3, items: { jellybake: 2 } }
  },
  // 술 자격증 길잡이: 강의 8강을 끝까지 듣고 → 검정소에서 시험. 자격이 있으면 부탁하지 않는다(맥주 한 잔 부탁으로 이어진다)
  liquorStudy: {
    title: '쿠리만쥬의 술 공부', giver: 'kurimanju', needHearts: 0, tutorial: true, unlessLicense: 'liquor', ask: '요즘 뭐 재밌는 거 있어?',
    offer: ['하아~ {name}, 맥주집 생맥주 마셔 봤어?', '아… 술 자격증이 있어야 마실 수 있구나.', '좋아, 내가 위스키 강의를 해 줄게. 시험 범위가 딱 위스키거든~',
      { text: '여덟 번만 들으면 돼. 빨갛게 보이는 말은 시험에 꼭 나오니까 잘 봐 둬~', marks: ['빨갛게'] }],
    steps: [
      { type: 'study', id: 'liquor', goal: '쿠리만쥬의 위스키 강의 8강을 끝까지 듣자! (쿠리만쥬에게 「강의 들으러 왔어」)',
        say: ['하아~ 끝까지 다 들었네. 대단해~', '이제 검정소에 가서 술 자격 시험을 봐.', '필기는 강의에서 빨갛던 말 그대로 나오고, 실기는 하이볼 만들기야~'] },
      { type: 'license', id: 'liquor', goal: '검정소에서 술 자격 시험을 보자! (응시료 600원)', say: ['하아~ 합격 축하해!', '이제 맥주집 생맥주도 마실 수 있어. 다음엔 같이 한 잔 하자~'] }
    ],
    reward: { money: 300, bond: 3, items: { bottlebeer: 2 } }
  },
  cheers: {
    title: '쿠리만쥬와 맥주 한 잔', giver: 'kurimanju', needHearts: 2, needLicense: 'liquor', ask: '요즘 맥주는 어때?',
    offer: ['하아~ {name}, 술 자격증 땄다며?', '마을 동쪽 맥주집 알지? 거기 생맥주가 아주 끝내주거든~', '근데 맥주엔 안주가 있어야지. 빨간 열매 5개만 따다 줄래? 새콤달콤하게 절여 볼게.', '그리고… 저녁에 맥주집에서 같이 한 잔 하자. 하아~'],
    steps: [
      { type: 'bring', items: { berry: 5 }, goal: '빨간 열매 다섯 개를 쿠리만쥬에게 갖다주자! (마을 가장자리 열매 덤불)', say: ['오~ 잘 익었네!', '(열매를 새콤달콤하게 절인다…)', '좋아, 안주 준비 끝! 저녁(5시 ~ 9시)에 맥주집에서 기다릴게~'] },
      { type: 'visit', place: 'pub', evening: true, goal: '저녁에 맥주집에서 쿠리만쥬를 만나자! (오후 5시 ~ 9시)', speaker: 'kurimanju', say: ['왔구나~ 자, 한 잔 받아!', '건배~! (짠—!)', '…캬~ 같이 마시니까 훨씬 맛있다. 하아~', '저녁에 여기 오면 언제든 한 잔 하자. 같이 건배하면 더 친해질 거야~'] }
    ],
    reward: { money: 600, bond: 4, items: { bottlebeer: 3 } }
  },
  song: {
    title: '하치와레의 동굴 무대', giver: 'hachiware', needHearts: 2, ask: '요즘 노래 연습은 어때?',
    offer: ['있잖아, {name}.', '나 동굴에서 혼자 노래 연습하는데… 너무 어두워서 조금 무서워.', '그림자 나방 날개 가루가 밤에 반짝반짝 빛난대!', '달빛 가루 2개만 구해 줄래? 동굴을 반짝이는 무대로 꾸미고 싶어~'],
    steps: [
      { type: 'bring', items: { moondust: 2 }, goal: '달빛 가루 두 개를 하치와레에게 갖다주자! (밤에 나오는 그림자 나방)', say: ['우와~ 진짜 반짝거린다!', '오늘 밤에 동굴로 와 줄래? 첫 번째 관객이 되어 줘!'] },
      { type: 'visit', place: 'cave', night: true, goal: '밤에 바위산 하치와레 동굴로 가 보자! (밤 7시 ~ 새벽 5시)', speaker: 'hachiware', say: ['(동굴 안이 달빛 가루로 반짝반짝 빛난다…)', '♪ 라라~ 랄라~ 반짝이는 밤에~ ♪', '…헤헤, 어땠어? 들어 줘서 고마워, {name}!', '이제 사람들 앞에서도 부를 수 있을 것 같아~'] }
    ],
    reward: { money: 600, bond: 6, furniture: 'lamp' }
  },
  training: {
    title: '랏코의 수련', giver: 'rakko', needHearts: 2, needLicense: 'hunter', ask: '수련 상대가 필요해?',
    // 갓 자격증을 딴 때라 가장 쉬운 동쪽 들판 풀뭉치로(바위산 몬스터는 처음엔 버겁다)
    offer: ['…{name}. 토벌 자격증을 땄다지.', '약속대로 가르쳐 주지. 하지만 먼저 실력을 봐야겠다.', '동쪽 들판 풀뭉치 3마리. 가볍다고 얕보지 마라.', '들이받기 전에 움츠린다. 그때 비켰다가, 부딪친 뒤를 노려라.'],
    steps: [{ type: 'hunt', species: 'fluff', n: 3, goal: '동쪽 들판의 풀뭉치 세 마리를 잡아 보자!', say: ['…훗. 해냈군.', '좋은 눈을 가졌다. 이걸 받아라.', '네 손에 맞게 다듬어 둔 무기다. …수련을 게을리하지 마라.'] }],
    reward: { money: 300, bond: 3, weapon: 'sword' } // 목검(돌 망치는 이른 보상으로 너무 셌다 — 가게에서 4,500원)
  },
  noodles: {
    title: '시사의 면 삶기 특훈', giver: 'shisa', needHearts: 1, ask: '요즘 연습은 잘 돼?',
    offer: ['{name} 님! 저 면 삶기 특훈 중인데요…', '사부님이 그러셨어요. 좋은 라멘은 좋은 재료부터라고!', '강가 물가 갈대를 5개만 뽑아다 주실 수 있어요? 국물 거를 때 쓰려고요!'],
    steps: [{ type: 'pull', kind: 'reed', n: 5, goal: '물가 갈대 다섯 개를 뽑아 주자! (3급부터)', say: ['와아! 고마워요, {name} 님!', '이걸로 국물을 거르면 훨씬 맑아질 거예요!', '감사의 뜻으로… 사부님 몰래 드리는 거예요! 쉿!'] }],
    reward: { money: 700, bond: 3 }
  },
  // ---------- 사이드스토리: 원작 에피소드(머리 위에 이야기 표시) ----------
  usagiHome: {
    title: '우사기의 집', giver: 'hachiware', side: true, needStory: 'usagiSeen', hours: [15, 21], needHearts: 0, ask: '무슨 얘기 해?',
    offer: [
      '있잖아, {name}… 우사기는 밤마다 어디로 돌아가는 걸까?',
      { who: 'chiikawa', text: '…집… 아니야…?' },
      '{name}도 봤지? 어젯밤에 우사기가 자기 집 말고 숲 쪽으로 쌩~ 가 버리는 거!',
      { who: 'chiikawa', text: '…!! (궁금해서 눈이 동그래진다)' },
      '오늘 밤에 셋이서 몰래 따라가 보자! 밤 8시 넘어서 광장에서 만나~'
    ],
    steps: [{
      type: 'visit', place: 'plaza', hours: [20, 24], scene: 'usagiClub', speaker: 'hachiware',
      goal: '밤에 광장에서 치이카와랑 하치와레를 만나자! (밤 8시 ~ 12시)',
      say: ['…결국 우사기 집이 어딘지는 하나도 모르겠네~', { who: 'chiikawa', text: '…그래도… 재밌었다…♪' }, '헤헤, 그치? 우사기는 정말 수수께끼야~']
    }],
    reward: { bond: 3, friends: { usagi: 3, chiikawa: 2 }, furniture: 'djbooth' }
  },
  pizzaBun: {
    title: '우사기의 피자호빵', giver: 'usagi', side: true, needStory: 'pizzaNews', sameDay: true, hours: [9, 20], needHearts: 1, ask: '우라?',
    offer: ['(라멘 로우 쪽을 가리키며 킁킁…)', '우라…? (침을 꿀꺽)', '(새로 나온 피자호빵이 몹시 궁금한 것 같다…!)'],
    steps: [{
      type: 'bring', items: { pizzabun: 1 }, fx: 'pizzaCry', goal: '라멘 로우에서 피자호빵을 사다 주자! (라멘 로우, 60원)',
      // cue: 그 줄에서 연출(한 입 → 얼굴 클로즈업 · 굳기 · 진짜로 울기 · 활짝 웃으며 카메라가 빠진다)
      say: ['(우사기가 피자호빵을 반으로 갈랐다… 치즈가 쭈욱~)', { text: '(한 입 베어 물더니…)', cue: 'pizzaBite' }, '……', { text: '(그대로 굳어 버렸다…?)', cue: 'pizzaFreeze' },
        { text: '…우…우라…(눈물이 주르륵)', cue: 'pizzaCry' }, { who: 'hachiware', text: '우사기가… 울어?! 그렇게 맛있어?!' }, { who: 'chiikawa', text: '…(꿀꺽)' },
        '(너무 맛있어서 우는 것 같다…!)', { text: '야하~!! (반쪽을 내밀며 같이 먹자고 한다)', cue: 'pizzaSmile' }]
    }],
    reward: { bond: 3, friends: { chiikawa: 1, hachiware: 1 }, items: { pizzabun: 1 } }
  },
  shisaArbeiter: {
    title: '시사의 슈퍼 알바이터', giver: 'shisa', side: true, after: 'noodles', hours: [8, 18], needHearts: 1, ask: '요즘 무슨 고민 있어?',
    offer: [
      '{name} 님…! 저, 사부님 곁에서 같이 라멘을 만들고 싶어요!',
      '그러려면 슈퍼 알바이터 자격이 있어야 한대요… 엄청 어렵다는 그 시험이요!',
      '필기는 레시피랑 조리 규칙, 실기는 손님 세 분께 실수 없이…!',
      '저 혼자서는 자신이 없어서요… 공부 좀 도와주실 수 있어요?'
    ],
    steps: [
      { type: 'talk', hours: [17, 22], fx: 'shisaQuiz', goal: '저녁에 라멘 로우 앞에서 시사 공부를 도와주자! (오후 5시 ~ 10시)',
        say: ['헤헤… {name} 님 덕분에 조금 자신이 생겼어요!', '시험은 내일이에요! 내일 낮에 같이 검정소까지 가 주실 거죠…?'] },
      { type: 'visit', place: 'exam', hours: [9, 17], with: true, scene: 'shisaExam', speaker: 'shisa', goal: '시험 날! 시사랑 같이 검정소에 가자! (오전 9시 ~ 오후 5시)',
        say: ['{name} 님, 정말 고마워요!', '오늘부터 사부님 곁에서 열심히 할게요! 시사 특제 라멘, 꼭 먹으러 와 주세요~!'] }
    ],
    reward: { bond: 4, friends: { ramen: 2 }, money: 300, story: 'shisaPass' }
  },
  // 하치와레가 구덩이에!(원작: 구덩이에 빠진 하치와레) — 말로 부탁하지 않고 숲에서 "살려줘~" 소리를 듣고 찾아낸다(stories/hachipit.js)
  hachiPit: {
    title: '하치와레가 구덩이에!', giver: 'hachiware', side: true, noOffer: true, needHearts: 2, ask: '',
    offer: ['(숲 속 구덩이에서 하치와레를 찾았다)'],
    steps: [{
      type: 'bring', items: { vine: 3 }, goal: '덩굴풀 세 개로 밧줄을 엮어 하치와레를 꺼내 주자! (숲, 4급부터)', speaker: 'hachiware',
      say: ['영차~ 하고 끌어올려 줘서 고마워, {name}!', '구덩이 속에서 하늘만 보고 있으니까 조금 무서웠어~', '이제 발밑 조심할게! 헤헤.']
    }],
    reward: { bond: 4, friends: { chiikawa: 2 }, money: 300 }
  },
  // 잠옷 밤나들이(원작 애니 10화: 갑옷 씨가 준 잠옷을 입고 셋이 밤에 놀며 별을 본다) — 받자마자 잠옷(start), 밤에 내 집 앞에서(stories/pajama.js)
  pajamaNight: {
    title: '잠옷 밤나들이', giver: 'pochette', side: true, minDay: 6, hours: [9, 18], needHearts: 0, ask: '새로 만든 거 있어요?',
    offer: ['어서 오세요~! 아, {name} 님!', '새로 만든 잠옷이 있는데요… 귀 달린 후드까지 있는 폭신폭신한 잠옷이에요!', '치이카와 님이랑 하치와레 님 것도 만들었어요. 다 같이 입으면 귀여울 것 같아서~', '오늘 밤에 입고 셋이서 놀아 보는 건 어때요?'],
    start: { accessory: 'pajama' },
    steps: [{
      type: 'visit', place: 'home', hours: [20, 24], scene: 'pajamaNight', speaker: 'hachiware', goal: '밤에 잠옷 입고 내 집 앞으로 가자! (밤 8시 ~ 12시)',
      say: ['헤헤… 밖에서 자 버렸네~', '잠옷 입고 밤에 노는 거 진짜 재밌었다!', '또 하자, {name}! 다음엔 간식도 챙겨 오자~']
    }],
    reward: { bond: 2, friends: { chiikawa: 3, hachiware: 3 } }
  },
  islandCamp: {
    title: '수상한 섬 합숙', giver: 'usagi', side: true, minDay: 8, hours: [12, 20], needHearts: 2, ask: '우라?',
    offer: [
      '우라!', '(우사기가 구깃구깃한 전단지를 내밀었다…)',
      '『특별한 섬으로 초대합니다! 간단한 토벌로 보수가 무려 100배!! 섬 한정 라멘 & 디저트도 공짜!』',
      { who: 'hachiware', text: '우와~ 섬 합숙이래! 보수 100배에 공짜 라멘이라니~!' },
      { who: 'chiikawa', text: '…(전단지를 보며 조금 불안한 얼굴)…' },
      { who: 'rakko', text: '…너무 좋은 얘기는 수상한 법이다. 나도 같이 가지.' },
      '야하! (내일 아침 남쪽 바닷가 선착장으로 오라는 듯 손짓한다)'
    ],
    steps: [{
      type: 'visit', place: 'pier', hours: [6, 11], scene: 'islandCamp', speaker: 'hachiware',
      goal: '아침에 남쪽 바닷가 선착장으로 가자! (아침 6시 ~ 11시)',
      say: ['{name}~ 우리 다 새카맣게 탔다~!', '(셋이서 서로 등에 벗겨진 껍질을 뜯어 준다… 뿌직, 뿌직)', '보수 100배는… 결국 음식이었지만~',
        '그래도 엄청난 여름이었다! 시마지로 씨 카레, 집에서도 먹자~', { who: 'chiikawa', text: '…(바다 쪽을 한 번 돌아본다)' }, '(…어디선가, 노랫소리 같은 웃음소리가 들린 것 같았다)']
    }],
    reward: { bond: 3, friends: { chiikawa: 3, hachiware: 3, usagi: 3, rakko: 2, momonga: 1 }, items: { katsucurry: 2, shellsoup: 2 }, story: 'islandDone' }
  },
  // 파자마 파티즈(원작 아이돌 그룹: 포셰트 갑옷 씨에게 산 색색 파자마를 입은 넷이 노래하고 춤춘다 — 첫 공연엔 손님이 없었지만 노래가 귀에 남아
  // 갑옷 씨들 · 치이카와 · 하치와레까지 따라 부르고 춤추게 된다). 잠옷 밤나들이 다음, 밤 광장 무대에서 공연 · 응원(stories/pajamaidol.js, 노래는 core/idolsong.js 의 원곡)
  pajamaParty: {
    title: '파자마 파티즈', giver: 'pochette', side: true, after: 'pajamaNight', minDay: 8, hours: [9, 18], needHearts: 0, ask: '요즘 잘 팔리는 거 있어요?',
    offer: ['어서 오세요~! 들어 보세요, {name} 님!', '지난번 그 폭신폭신 잠옷이요, 초록, 분홍, 하양, 보라… 넷이서 색깔별로 사 갔는데요',
      '글쎄 그 잠옷을 입고 아이돌을 한대요! 이름하여 『파자마 파티즈』!', '오늘 밤 광장에서 첫 공연이래요. 근데… 손님이 하나도 안 오면 어쩌죠…?',
      { who: 'hachiware', text: '아이돌!? 우리가 보러 가자~! 첫 손님 해 주자!' }, { who: 'chiikawa', text: '…!! (두근두근)' }],
    steps: [{
      type: 'visit', place: 'plaza', hours: [19, 24], scene: 'pajamaParty', speaker: 'pochette', goal: '밤에 광장 무대로 첫 공연 보러 가자! (밤 7시 ~ 12시)',
      say: ['공연 봤어요!? 제가 만든 잠옷이 무대 위에서 반짝반짝…!', '파·자·마·파·티~♪ …어라, 저도 모르게 흥얼거리네요. 귀에서 안 떠나요~!']
    }],
    reward: { bond: 2, money: 300, friends: { chiikawa: 2, hachiware: 2, usagi: 2 }, story: 'pajamaParty' }
  },
  // ---------- 일상 부탁: 같이 라멘 먹기 · 같이 풀 뽑기 같은 사소한 일(며칠 지나면 또 부탁한다) ----------
  ramenDate: {
    title: '치이카와랑 라멘', giver: 'chiikawa', daily: true, again: 3, wish: { hours: [11, 20], need: 'hungry', chance: 0.4 }, needHearts: 0, ask: '무슨 일 있어?',
    offer: ['…저기… {name}…', '라멘 로우 라멘… 먹고 싶은데…', '혼자 가면… 좀 떨려서…', '…같이… 먹으러 가 줄래…?'],
    steps: [{ type: 'together', act: 'ramen', n: 1, goal: '치이카와랑 라멘 로우에서 라멘 먹자!', say: ['…후루룩…! 맛있어…!', '같이 먹으니까… 훨씬 맛있다…', '…또 같이 오자…♪'] }],
    reward: { bond: 2 }
  },
  weedChii: {
    title: '치이카와랑 풀 뽑기', giver: 'chiikawa', daily: true, again: 3, wish: { hours: [8, 16], need: 'broke', chance: 0.25 }, needHearts: 0, ask: '풀 뽑으러 가?',
    offer: ['…{name}…', '오늘 풀 뽑기… 하려고 하는데…', '혼자 하면… 조금 무서워서…', '히잉… 같이 해 줄래…?'],
    steps: [{ type: 'together', act: 'weed', n: 4, goal: '치이카와랑 같이 풀 네 개를 뽑자!', say: ['…다 뽑았다…!', '같이 하니까… 금방이었어…', '…이거… 아까 찾은 거… 너 줄게…'] }],
    reward: { bond: 2, items: { clover: 1 } }
  },
  weedPal: {
    title: '하치와레랑 풀 뽑기', giver: 'hachiware', daily: true, again: 2, wish: { hours: [8, 16], need: 'broke', chance: 0.3 }, needHearts: 0, ask: '오늘 뭐 해?',
    offer: ['있잖아, {name}! 오늘 풀 뽑기 같이 할래?', '둘이 하면 금방 끝나고, 수다도 떨 수 있잖아~', '어떻게든 될 거야!'],
    steps: [{ type: 'together', act: 'weed', n: 5, goal: '하치와레랑 같이 풀 다섯 개를 뽑자!', say: ['우와~ 벌써 다 했다!', '같이 하니까 하나도 안 힘들었어!', '이거 아까 주운 동전이야. 반씩 나누자!'] }],
    reward: { money: 120, bond: 2 }
  },
  berryPal: {
    title: '우사기랑 열매 따기', giver: 'usagi', daily: true, again: 2, wish: { hours: [10, 17], chance: 0.22 }, needHearts: 0, ask: '우라?',
    offer: ['우라!', '(빨간 열매 덤불 쪽을 가리키며 펄쩍펄쩍 뛴다)', '(바구니를 내밀며 같이 가자고 손짓한다)'],
    steps: [{ type: 'together', act: 'berry', n: 4, goal: '우사기랑 빨간 열매 네 개를 따자! (마을 가장자리 열매 덤불)', say: ['야하~!', '(열매를 하나 입에 쏙 넣고는 행복한 얼굴을 한다)', '(바구니에서 열매를 한 줌 나눠 준다)'] }],
    reward: { bond: 2, items: { berry: 2 } }
  },
  hangover: {
    title: '쿠리만쥬의 해장 라멘', giver: 'kurimanju', daily: true, again: 3, wish: { hours: [7, 11], chance: 0.3 }, needHearts: 0, ask: '오늘 기분은 어때?',
    offer: ['하아~ 어젯밤에 조금 많이 마셨나 봐…', '이럴 땐 뜨끈한 라멘 국물이 최고지~', '같이 한 그릇 할래? 혼자 먹으면 심심하잖아~'],
    steps: [{ type: 'together', act: 'ramen', n: 1, goal: '쿠리만쥬랑 라멘 로우에서 라멘 먹자!', say: ['후루룩… 하아~ 살 것 같다~', '역시 라멘은 같이 먹어야 맛있어~', '다음엔 내가 한 잔 살게~'] }],
    reward: { bond: 2 }
  },
  walkRiver: {
    title: '모몽가랑 강가 산책', giver: 'momonga', daily: true, again: 3, wish: { hours: [14, 19], chance: 0.22 }, needHearts: 1, ask: '심심해?',
    offer: ['야, {name}.', '…강가 다리에서 물 구경하고 싶은데, 혼자 가긴 좀 그렇잖아.', '너도 같이 와. 싫다고 하면 지갑 털 거야. 흥!'],
    steps: [{ type: 'visit', place: 'bridge', with: true, goal: '모몽가랑 남쪽 강가 다리까지 걸어가자!', speaker: 'momonga', say: ['(다리 아래로 강물이 졸졸 흐른다…)', '…뭐야, 생각보다 좋잖아.', '…가끔 또 데려와. 흥!'] }],
    reward: { bond: 2 }
  },
  restDay: {
    title: '랏코의 쉬는 날', giver: 'rakko', daily: true, again: 4, wish: { hours: [11, 19], need: 'tired', chance: 0.4 }, needHearts: 1, ask: '오늘도 수련이야?',
    offer: ['…{name}.', '수련만 한다고 강해지는 건 아니다. 가끔은 쉬는 것도 수련이지.', '…라멘이나 먹으러 가지. 같이.'],
    steps: [{ type: 'together', act: 'ramen', n: 1, goal: '랏코랑 라멘 로우에서 라멘 먹자!', say: ['…훗. 국물이 좋군.', '…이런 날도 나쁘지 않다.', '…또 가자.'] }],
    reward: { bond: 2 }
  },
  // 우사기의 집을 본 뒤로는 가끔 저녁에 우사기가 또 클럽에 가자고 한다(사이드스토리 되풀이)
  clubNight: {
    title: '우사기랑 클럽', giver: 'usagi', side: true, daily: true, again: 3, after: 'usagiHome', wish: { hours: [19, 21], chance: 0.3 }, needHearts: 0, ask: '우라?',
    offer: ['우라!', '(숲 쪽을 가리키며 들썩들썩 춤을 춘다)', '(오늘 밤에 또 클럽에 가자는 것 같다…!)'],
    steps: [{ type: 'scene', scene: 'clubNight', speaker: 'usagi', goal: '우사기를 따라 클럽에 가자!', say: ['야하~!!', '(실컷 춤추고 나왔다)'] }],
    reward: { bond: 2 }
  }
};
export const QUEST_ORDER = Object.keys(QUESTS);

const NIGHT = (h) => h >= 19 || h < 5;
/** 시각 h 가 [시작, 끝) 안인지(끝이 24 를 넘으면 자정 너머까지: [20, 26) 은 밤 8시 ~ 새벽 2시). */
export const inHours = (h, [a, b]) => (b > 24 ? h >= a || h < b - 24 : h >= a && h < b);
/** 사이드스토리를 하나 끝내면 이만큼 날이 지나야 다음 이야기가 열린다. */
export const SIDE_GAP = 2;
const isStorySide = (id) => !!QUESTS[id].side && !QUESTS[id].daily;
const EVENING = (h) => h >= 17 && h < 21;
export const questsOf = (state) => state.quests || {};
export const questState = (state, id) => questsOf(state)[id] || null;
export const isDone = (state, id) => !!(questState(state, id) && questState(state, id).done);
export const isActive = (state, id) => !!(questState(state, id) && !questState(state, id).done);
/** 지금 단계(없으면 null). */
export const stepOf = (state, id) => { const q = questState(state, id); return q && !q.done ? QUESTS[id].steps[q.step] : null; };
/** 그 단계를 누구에게 알리는지. */
export const reportTo = (id, step) => step.to || QUESTS[id].giver;
/** '우사기의 피자호빵' 아침 소식(라멘 로우 새 메뉴)을 띄울 때인지: 셋째 날부터 아침(8 ~ 12시), 우사기와 조금 친하고 다른 이야기를 하는 중이 아닐 때 한 번. */
export function pizzaNewsDue(state) {
  if (!state.clock || state.tutorial !== 'done' || (state.story || {}).pizzaNews || state.clock.day < 3) return false;
  const h = hourOf(state.clock);
  return h >= 8 && h < 12 && !sideBusy(state) && hearts(friendOf(state, 'usagi')) >= 1;
}
/** '하치와레가 구덩이에!'가 일어날 수 있는지: 넷째 날부터 낮(10 ~ 17시), 덩굴풀을 뽑을 수 있는 급수(4급), 하치와레와 하트 2, 다른 이야기가 없을 때 한 번. */
export function pitDue(state) {
  if (!state.clock || (state.tutorial && state.tutorial !== 'done') || state.clock.day < 4) return false;
  if (isActive(state, 'hachiPit') || isDone(state, 'hachiPit')) return false;
  const h = hourOf(state.clock), grade = (state.license || {}).grade ?? 5;
  return h >= 10 && h < 17 && grade <= WEED_KINDS.vine.grade && !sideBusy(state) && hearts(friendOf(state, 'hachiware')) >= 2;
}
/** 사이드스토리를 지금 새로 열 수 없는지: 하나를 하는 중이거나, 마지막으로 끝낸 지 SIDE_GAP 일이 안 됐다. */
export function sideBusy(state) {
  const ids = Object.keys(QUESTS).filter(isStorySide);
  if (ids.some((id) => isActive(state, id))) return true;
  const last = Math.max(0, ...ids.map((id) => (questState(state, id) || {}).done || 0));
  return !!last && !!state.clock && state.clock.day - last < SIDE_GAP;
}

/** 그 단계를 받았을 때 세어 두는 값(사냥 · 풀 · 같이 하기는 그 뒤로 센다). */
function snapshot(state, step, id) {
  if (step.type === 'hunt') return (state.hunted || {})[step.species] || 0;
  if (step.type === 'pull') return (state.weedLog || {})[step.kind] || 0;
  if (step.type === 'together') return actsWith(state, step.act, reportTo(id, step));
  return 0;
}
/** 지금 단계의 진행 { have, need } (센 것이 없으면 null). */
export function progressOf(state, id) {
  const q = questState(state, id), step = stepOf(state, id);
  if (!step) return null;
  if (step.type === 'hunt') return { have: Math.min(step.n, ((state.hunted || {})[step.species] || 0) - q.base), need: step.n };
  if (step.type === 'pull') return { have: Math.min(step.n, ((state.weedLog || {})[step.kind] || 0) - q.base), need: step.n };
  if (step.type === 'together') return { have: Math.min(step.n, Math.max(0, actsWith(state, step.act, reportTo(id, step)) - q.base)), need: step.n };
  if (step.type === 'study') { const p = studyProgress(state, step.id); return hasLicense(state, step.id) ? { have: p.need, need: p.need } : p; }
  if (step.type === 'bring') {
    const b = bagOf(state).items;
    const need = Object.values(step.items).reduce((a, n) => a + n, 0);
    const have = Object.entries(step.items).reduce((a, [it, n]) => a + Math.min(n, b[it] || 0), 0);
    return { have, need };
  }
  return null;
}
/** 지금 단계를 끝낼 수 있는지(알리러 가면 되는지). visit · boss 는 main 이 도착 · 쓰러뜨림을 알려 준다. */
export function stepReady(state, id) {
  const step = stepOf(state, id);
  if (!step) return false;
  if (step.type === 'talk') return !step.hours || !state.clock || inHours(hourOf(state.clock), step.hours); // 시각이 정해진 이야기(저녁 공부)는 그때에만
  if (step.type === 'license') return hasLicense(state, step.id);
  if (step.type === 'visit' || step.type === 'boss' || step.type === 'scene') return false;
  const p = progressOf(state, id);
  return !!p && p.have >= p.need;
}
/** 일상 부탁이 마을에 한꺼번에 떠 있을 수 있는 수(이미 받은 일상 부탁도 센다). */
export const MAX_WISHES = 2;
/** 그날 · 그 부탁의 주사위(0..1): 날마다 다르고, 하루 안에서는 같다(느낌표가 깜빡이지 않게). */
function dayRoll(day, id) {
  let h = 2166136261;
  for (const ch of `${day}:${id}`) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
/** 같이 다니는 부탁(같이 하기 · 같이 가기)은 잘 시간(BED_HOUR) 이만큼 전부터는 새로 하지 않는다(하다 말고 자러 가지 않게). */
export const BUDDY_WISH_GAP = 2;
const buddyQuest = (id) => QUESTS[id].steps.some((st) => st.type === 'together' || (st.type === 'visit' && st.with));
/** 그 친구가 지금 그 일상 부탁을 할 형편인지: 시간대 · 형편(배고픔 · 돈 · 기운) · 그날 마음(chance). */
export function wishNow(state, id) {
  const Q = QUESTS[id], W = Q.wish;
  if (!W) return true;
  const day = state.clock.day, hour = hourOf(state.clock);
  const end = buddyQuest(id) ? Math.min(W.hours[1], BED_HOUR - BUDDY_WISH_GAP) : W.hours[1];
  if (hour < W.hours[0] || hour >= end || dayRoll(day, id) >= W.chance) return false;
  const v = VILLAGERS[Q.giver] ? villagerOf(state, Q.giver, day) : null;
  if (W.need === 'hungry') return !!v && v.energy < 55;
  if (W.need === 'tired') return !!v && v.energy < 45;
  if (W.need === 'broke') return !!v && v.money < 200;
  return true;
}
/** 지금 마을에 떠 있는 일상 부탁: 형편이 맞는 것 중 그날 주사위 순으로, 친구마다 하나, 많아야 MAX_WISHES 개(받은 것 포함). */
export function openWishes(state) {
  const active = QUEST_ORDER.filter((id) => isActive(state, id));
  const room = MAX_WISHES - active.filter((id) => QUESTS[id].daily).length;
  if (room <= 0 || !state.clock) return [];
  const busy = new Set(active.map((id) => QUESTS[id].giver)); // 부탁 중인 친구는 새 부탁을 안 한다
  const out = [];
  const cands = QUEST_ORDER.filter((id) => QUESTS[id].daily && baseOffer(state, id) && wishNow(state, id))
    .sort((a, b) => dayRoll(state.clock.day, a) - dayRoll(state.clock.day, b));
  for (const id of cands) {
    if (out.length >= room) break;
    if (busy.has(QUESTS[id].giver)) continue;
    busy.add(QUESTS[id].giver);
    out.push(id);
  }
  return out;
}
/** 부탁을 들을 수 있는지. 일상 부탁은 지금 마을에 떠 있는 것(openWishes)만. */
export function canOffer(state, id) {
  return QUESTS[id].daily ? baseOffer(state, id) && openWishes(state).includes(id) : baseOffer(state, id);
}
/** 기본 조건: 안 했고(일상 부탁은 끝내고 again 날이 지났고), 친밀도 · 자격 · 앞 이야기(튜토리얼) 조건을 채웠으면. */
function baseOffer(state, id) {
  const Q = QUESTS[id], q = questState(state, id);
  if (Q.noOffer) return false; // 말로는 부탁하지 않는 이야기(숲에서 찾아내는 구덩이 같은)
  if (q && !(q.done && Q.again && state.clock && state.clock.day - q.done >= Q.again)) return false;
  if ((Q.tutorial || Q.daily || Q.side) && state.tutorial && state.tutorial !== 'done') return false; // 일상 부탁 · 사이드스토리도 첫날 안내가 끝난 뒤부터
  if (Q.needLicense && !hasLicense(state, Q.needLicense)) return false;
  if (Q.unlessLicense && hasLicense(state, Q.unlessLicense)) return false; // 이미 그 자격이 있으면 따라는 부탁은 안 한다
  if (Q.after && !isDone(state, Q.after)) return false;
  if (Q.minDay && state.clock && state.clock.day < Q.minDay) return false;
  if (Q.needStory) { const d = (state.story || {})[Q.needStory]; if (!d || (typeof d === 'number' && state.clock && (Q.sameDay ? state.clock.day < d : state.clock.day <= d))) return false; } // sameDay: 그날부터
  if (Q.hours && state.clock && !inHours(hourOf(state.clock), Q.hours)) return false;
  if (isStorySide(id) && sideBusy(state)) return false;
  return hearts(friendOf(state, Q.giver)) >= (Q.needHearts || 0);
}
/** 그 친구에게 지금 할 수 있는 퀘스트 일: { offer: [id], report: [id](끝낼 수 있는 것), waiting: [id](알려야 하지만 아직 덜 한 것) } */
export function questsFor(state, kind) {
  const out = { offer: [], report: [], waiting: [] };
  for (const id of QUEST_ORDER) {
    if (QUESTS[id].giver === kind && canOffer(state, id)) out.offer.push(id);
    const step = stepOf(state, id);
    if (!step || step.type === 'visit' || step.type === 'boss' || step.type === 'scene' || reportTo(id, step) !== kind) continue;
    (stepReady(state, id) ? out.report : out.waiting).push(id);
  }
  return out;
}
/** 머리 위 표시: '?'(알리러 오면 끝) · 'story'(사이드스토리 — 펼친 책) · '!'(새 부탁) · null. */
export function markOf(state, kind) {
  const q = questsFor(state, kind);
  return q.report.length ? '?' : q.offer.some((id) => QUESTS[id].side) ? 'story' : q.offer.length ? '!' : null;
}

/** 부탁을 받는다(처음 단계를 시작한다). 화면에 띄울 퀘스트로 고른다. */
export function startQuest(state, id) {
  const step = QUESTS[id].steps[0];
  return { ...state, quests: { ...questsOf(state), [id]: { step: 0, base: snapshot(state, step, id) } }, questTrack: id };
}

/** 친밀도를 바로 올린다(퀘스트 보상). 하트 3개가 되면 그 친구 선물 가구도. → { state, up, hearts, gift } */
export function bond(state, kind, pts) {
  if (!FRIENDS[kind] || !pts) return { state, up: false, hearts: hearts(friendOf(state, kind)), gift: null };
  const f = friendOf(state, kind), next = { ...f, pts: Math.min(f.pts + pts, ptsForHearts(MAX_HEARTS) + 2) };
  let s = state, gift = null;
  const giftId = FRIENDS[kind].gift;
  if (giftId && !next.gift && hearts(next) >= GIFT_HEARTS) {
    gift = giftId;
    next.gift = true;
    const home = homeOf(s);
    s = { ...s, home: { ...home, owned: { ...home.owned, [giftId]: (home.owned[giftId] || 0) + 1 } } };
  }
  s = { ...s, friends: { ...(s.friends || {}), [kind]: next } };
  return { state: s, up: hearts(next) > hearts(f), hearts: hearts(next), gift };
}

/**
 * 보상을 준다. → { state, got: [글자], parts: [{ kind, id?, n?, text }] (화면 꼬리표용), gifts: [가구 id], up: 하트가 늘었는지 }
 * parts.kind: 'money' | 'bond' | 'village' | 'item' | 'accessory' | 'weapon' | 'furniture' | 'truce'
 */
export function giveReward(state, id, day) {
  const Q = QUESTS[id], R = Q.reward || {}, got = [], parts = [], gifts = [];
  const add = (part) => { parts.push(part); got.push(part.long || part.text); };
  let s = state, up = false;
  if (R.money) { s = { ...s, money: s.money + R.money }; add({ kind: 'money', n: R.money, text: `${R.money.toLocaleString('ko-KR')}원` }); }
  if (R.bond) {
    // 일상 부탁은 그날 친밀도 상한 안에서만(이미 많이 친해진 날엔 안 오른다), 한 번만 하는 부탁은 그대로
    const b = Q.daily ? befriendBy(s, Q.giver, R.bond, day) : bond(s, Q.giver, R.bond), n = Q.daily ? b.gained : R.bond;
    s = b.state; up = b.up; if (b.gift) gifts.push(b.gift);
    if (n > 0) add({ kind: 'bond', id: Q.giver, n, text: `${FRIENDS[Q.giver].name} +${n}`, long: `${FRIENDS[Q.giver].name} 친밀도 +${n}` });
  }
  if (R.village) {
    for (const k of ['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju', 'rakko', 'shisa', 'kani']) { const b = bond(s, k, R.village); s = b.state; if (b.gift) gifts.push(b.gift); }
    add({ kind: 'village', n: R.village, text: `마을 친구 모두 +${R.village}`, long: '마을 친구들 모두와 친밀도 +' + R.village });
  }
  if (R.items) for (const [it, n] of Object.entries(R.items)) { s = addItem(s, it, n).state; add({ kind: 'item', id: it, n, text: `${itemInfo(it).name} ×${n}` }); }
  if (R.accessory) {
    const w = wardrobeOf(s);
    if (!w.owned.includes(R.accessory)) { s = { ...s, wardrobe: { owned: [...w.owned, R.accessory], wear: w.wear } }; add({ kind: 'accessory', id: R.accessory, text: ACCESSORY_ITEMS[R.accessory].name, long: `${ACCESSORY_ITEMS[R.accessory].name}(옷장)` }); }
    else { s = { ...s, money: s.money + 300 }; add({ kind: 'money', n: 300, text: '300원', long: '300원(이미 가진 소품 대신)' }); }
  }
  if (R.weapon) {
    const w = weaponOf(s);
    if (!w.owned.includes(R.weapon)) { s = { ...s, weapon: { owned: [...w.owned, R.weapon], held: w.held || R.weapon } }; add({ kind: 'weapon', id: R.weapon, text: WEAPONS[R.weapon].name, long: `${WEAPONS[R.weapon].name}(무기)` }); }
    else { const m = Math.round(WEAPONS[R.weapon].price / 2); s = { ...s, money: s.money + m }; add({ kind: 'money', n: m, text: `${m.toLocaleString('ko-KR')}원`, long: `${m.toLocaleString('ko-KR')}원(이미 가진 무기 대신)` }); }
  }
  if (R.furniture) { const home = homeOf(s); s = { ...s, home: { ...home, owned: { ...home.owned, [R.furniture]: (home.owned[R.furniture] || 0) + 1 } } }; add({ kind: 'furniture', id: R.furniture, text: FURNITURE[R.furniture].name, long: `${FURNITURE[R.furniture].name}(가구)` }); }
  if (R.friends) for (const [k, n] of Object.entries(R.friends)) {
    const b = bond(s, k, n);
    s = b.state; if (b.gift) gifts.push(b.gift);
    add({ kind: 'bond', id: k, n, text: `${FRIENDS[k].name} +${n}`, long: `${FRIENDS[k].name} 친밀도 +${n}` });
  }
  if (R.story) s = { ...s, story: { ...(s.story || {}), [R.story]: day } }; // 이야기의 끝을 기억한다(시사 합격 → 특제 라멘)
  if (R.truce) { s = { ...s, truce: day + R.truce - 1 }; add({ kind: 'truce', n: R.truce, text: `모몽가 휴전 ${R.truce}일`, long: `모몽가가 ${R.truce}일 동안 소매치기 안 하기` }); }
  return { state: s, got, parts, gifts, up };
}

/**
 * 지금 단계를 끝내고 다음 단계로(마지막이면 퀘스트 끝 + 보상). bring 이면 가방에서 꺼내 건넨다.
 * → { state, finished, next: 다음 단계 | null, reward: giveReward 결과 | null }
 */
export function completeStep(state, id, day) {
  const Q = QUESTS[id], q = questState(state, id), step = Q.steps[q.step];
  let s = state;
  if (step.type === 'bring') for (const [it, n] of Object.entries(step.items)) s = takeItem(s, it, n).state;
  const nextI = q.step + 1;
  if (nextI >= Q.steps.length) {
    s = { ...s, quests: { ...questsOf(s), [id]: { step: nextI, base: 0, done: day } } };
    if (s.questTrack === id) s = { ...s, questTrack: pickTrack(s) };
    const reward = giveReward(s, id, day);
    return { state: reward.state, finished: true, next: null, reward };
  }
  const next = Q.steps[nextI];
  s = { ...s, quests: { ...questsOf(s), [id]: { step: nextI, base: snapshot(s, next, id) } } };
  return { state: s, finished: false, next, reward: null };
}

/** 화면에 띄울 퀘스트: 정해 둔 것이 끝났으면 이야기 → 다른 진행 중인 부탁. */
export function pickTrack(state) {
  if (state.questTrack && isActive(state, state.questTrack)) return state.questTrack;
  return QUEST_ORDER.find((id) => isActive(state, id)) || null;
}
/** 장면 단계(scene)에 멈춘 퀘스트들: 장면은 저장되지 않으니, 장면이 안 돌고 있는데 이 단계면(장면 도중 새로고침) 그만둔 것으로 본다. */
export const staleScenes = (state) => activeQuests(state).filter((id) => { const st = stepOf(state, id); return !!st && st.type === 'scene'; });
/** 버전 3 이하 저장: 이야기(story) 맨 앞에 '토벌 안내서 읽기' 단계가 생겼으니 받아 둔 이야기의 단계 번호를 한 칸 민다(하던 단계 그대로). */
export function shiftStoryStep(quests) {
  const q = quests && quests.story;
  if (!q) return quests;
  return { ...quests, story: { ...q, step: Math.min(q.step + 1, QUESTS.story.steps.length) } };
}

/** 퀘스트를 없던 일로(다시 부탁받을 수 있게). */
export function dropQuest(state, id) {
  const qs = { ...questsOf(state) };
  delete qs[id];
  const s = { ...state, quests: qs };
  return { ...s, questTrack: s.questTrack === id ? pickTrack({ ...s, questTrack: null }) : s.questTrack };
}
/** 진행 중인 퀘스트 목록(이야기가 먼저). */
export const activeQuests = (state) => QUEST_ORDER.filter((id) => isActive(state, id));
export const doneQuests = (state) => QUEST_ORDER.filter((id) => isDone(state, id));

/**
 * 대화 상자용 지금 단계 목표: 한 문장(text)과 괄호 속 안내(hint, 어디서 · 몇 급부터 같은 것).
 * 몇 개 모았는지는 글에 붙이지 않고 shortGoal 의 parts 그림 꼬리표로 따로 보여 준다. 알리기만 남았으면 '○○에게 알려 주자!'.
 * 안내 글은 단어만 이어 붙이지 말고 친구가 옆에서 말하듯(…하자! · …주자!).
 */
const readyLine = (id, step) => `${FRIENDS[reportTo(id, step)].name}에게 ${step.type === 'bring' ? '갖다주자!' : '알려 주자!'}`;
export function goalText(state, id) {
  const step = stepOf(state, id);
  if (!step) return { text: '', hint: '' };
  if (stepReady(state, id) && step.type !== 'talk') return { text: readyLine(id, step), hint: '' };
  return { text: step.goal.replace(/\s*\([^)]*\)/g, '').trim(), hint: (step.goal.match(/\(([^)]*)\)/) || [])[1] || '' };
}

/** 구역 이름(토벌 목표의 '어디서'). */
const REGION_AT = { fields: '동쪽 들판', forest: '서쪽 숲', river: '남쪽 강가', mountain: '북쪽 바위산', night: '마을 밖' };
/**
 * 화면 왼쪽 위 쪽지 · 마을폰용 짧은 목표: 한 마디 글(괄호 속 안내 · '·' 로 이은 말 없이) + 물건 · 몬스터마다 그림 꼬리표.
 * → { goal, n: '', parts: [{ kind: 'item' | 'monster', id, have, need }] }
 */
export function shortGoal(state, id) {
  const step = stepOf(state, id);
  if (!step) return { goal: '', n: '', parts: [] };
  if (stepReady(state, id) && step.type !== 'talk') return { goal: readyLine(id, step), n: '', parts: [] };
  if (step.type === 'bring') {
    const b = bagOf(state).items;
    return { goal: `${FRIENDS[reportTo(id, step)].name}에게 갖다주자!`, n: '', parts: Object.entries(step.items).map(([it, n]) => ({ kind: 'item', id: it, have: Math.min(n, b[it] || 0), need: n })) };
  }
  const p = progressOf(state, id);
  if (step.type === 'hunt') {
    const M = MONSTERS[step.species];
    return { goal: `${REGION_AT[M.region] ? REGION_AT[M.region] + '의 ' : ''}${josa(M.name, '을/를')} 잡자!`, n: '', parts: [{ kind: 'monster', id: step.species, have: p.have, need: p.need }] };
  }
  if (step.type === 'pull') return { goal: `${josa(WEED_KINDS[step.kind].name, '을/를')} 뽑자!`, n: '', parts: [{ kind: 'item', id: step.kind, have: p.have, need: p.need }] };
  const n = p && !(step.type === 'study' && p.need <= 1) ? `${p.have} / ${p.need}` : ''; // 안내서 읽기처럼 한 번이면 0 / 1 은 안 보인다
  return { goal: step.goal.replace(/\s*\([^)]*\)/g, '').trim(), n, parts: [] };
}

/** visit 단계: 지금 그곳에 와 있는지. place: { x, z }, hour: 지금 시각. */
export function arrived(step, place, x, z, hour) {
  if (!step || step.type !== 'visit' || !place) return false;
  if (step.hours && !inHours(hour, step.hours)) return false;
  if (step.night && !NIGHT(hour)) return false;
  if (step.evening && !EVENING(hour)) return false;
  return Math.hypot(x - place.x, z - place.z) < (PLACES[step.place].r || 3);
}
export const isNightHour = NIGHT;
export const isEveningHour = EVENING;

const num = (v) => typeof v === 'number' && Number.isFinite(v);
export function isValidQuests(qs) {
  if (!qs || typeof qs !== 'object' || Array.isArray(qs)) return false;
  return Object.entries(qs).every(([id, q]) => QUESTS[id] && q && num(q.step) && q.step >= 0 && q.step <= QUESTS[id].steps.length && num(q.base) && (q.done === undefined || num(q.done)));
}
/** 같이 한 일상 일 기록(state.acts) 모양 검사. */
export function isValidActs(a) {
  return !!a && typeof a === 'object' && !Array.isArray(a) && Object.values(a).every((v) => num(v) && v >= 0);
}
export function isValidStory(st) {
  return !!st && typeof st === 'object' && !Array.isArray(st);
}
/** 퀘스트 데이터가 서로 맞는지(테스트용): 친구 · 물건 · 몬스터 · 풀 · 보상이 모두 있는 것인지. */
export function checkQuestData() {
  const errs = [];
  for (const [id, Q] of Object.entries(QUESTS)) {
    if (!FRIENDS[Q.giver]) errs.push(id + ': giver');
    for (const st of Q.steps) {
      if (st.to && !FRIENDS[st.to]) errs.push(id + ': to ' + st.to);
      if (st.type === 'bring') for (const it of Object.keys(st.items)) if (!itemInfo(it)) errs.push(id + ': item ' + it);
      if (st.type === 'hunt' && !MONSTERS[st.species]) errs.push(id + ': species');
      if (st.type === 'pull' && !WEED_KINDS[st.kind]) errs.push(id + ': weed');
      if (st.type === 'visit' && !PLACES[st.place]) errs.push(id + ': place');
      if (st.type === 'together' && (!ACTS[st.act] || !(st.n > 0))) errs.push(id + ': act');
      if (st.type === 'scene' && typeof st.scene !== 'string') errs.push(id + ': scene');
      if (st.type === 'study' && !STUDY[st.id]) errs.push(id + ': study');
      if (st.hours && !(Array.isArray(st.hours) && st.hours.length === 2)) errs.push(id + ': hours');
      if (Q.daily && !(Q.again >= 1)) errs.push(id + ': again');
      if (!st.goal || !st.say) errs.push(id + ': goal/say');
    }
    const R = Q.reward || {};
    if (R.accessory && !ACCESSORY_ITEMS[R.accessory]) errs.push(id + ': accessory');
    if (R.weapon && !WEAPONS[R.weapon]) errs.push(id + ': weapon');
    if (R.furniture && !FURNITURE[R.furniture]) errs.push(id + ': furniture');
    if (R.friends) for (const k of Object.keys(R.friends)) if (!FRIENDS[k]) errs.push(id + ': friend ' + k);
    if (Q.after && !QUESTS[Q.after]) errs.push(id + ': after');
    if (Q.start && Q.start.accessory && !ACCESSORY_ITEMS[Q.start.accessory]) errs.push(id + ': start accessory');
    for (const L of Q.offer || []) if (typeof L !== 'string' && !(L && L.text && (!L.who || FRIENDS[L.who]))) errs.push(id + ': offer line');
    if (R.items) for (const it of Object.keys(R.items)) if (!itemInfo(it)) errs.push(id + ': reward item ' + it);
  }
  return errs;
}
