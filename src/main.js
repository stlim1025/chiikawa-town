/*
 * 《치이카와 마을 생활》 큰 업데이트 계획(사용자 요구사항 → 단계)
 *  1단계 ✅ 맵 개편: 넓어진 마을 · 집 배치, 마을 밖 네 구역(숲 · 바위산 · 들판 · 강가), 지도(가 본 곳만 밝게), 랜턴 · 손전등
 *  2단계 ✅ 급수별 풀: 5급~1급 풀 10종(core/weeding.js), 구역별로 자람(world/weeds.js), 뽑는 방식(흔들림 · 여러 번 · 독),
 *          급수별 일감, 어려운 풀일수록 경험치 많이, 승급 시험은 지금 급수의 풀로, 마을폰 '풀 도감' 앱
 *  +    라멘 주방 새 단장 · 알바 필기 강화 · 친밀도 하트 연출 · 가방(미리 캐 두기) · 옷장 · 집 안 걷기 · 친밀도별 대사(core/dialogue.js)
 *  3단계 ✅ 마을 생활 — 친구들 기운(일하면 줄고, 모자라면 라멘 · 낮잠, 밤 21시~6시 반에는 집에서 잠), 친구 집 · 하치와레 동굴 안(world/rooms.js),
 *          문 두드리기 · 하트 2개부터 '집에 놀러 가도 돼?' · 쫓겨났을 때 친구 집에서 묵기
 *  4단계 ✅ 토벌 — 도구점 무기 4종(core/combat.js), 검정소 토벌 자격증(필기 + 허수아비 실기), 마을 밖 몬스터 5종 + 보스(오리지널 디자인,
 *          world/monsters.js: 어슬렁 → 쫓기 → 움츠렸다 들이받기), 맞으면 기운 −, 0이면 기절(집 앞 · 세 시간 뒤 · 돈 조금), 전리품 → 노동 접수에서 팔기,
 *          토벌 일감 5종, 토벌 안내서 · 몬스터 도감 앱
 *  5단계 ✅ 퀘스트 · 스토리 — core/quests.js: 친구 고충 7가지(치이카와 베개 · 우사기 소풍 · 모몽가 보물 · 쿠리만쥬 안주 · 하치와레 동굴 무대 ·
 *          랏코 수련 · 시사 특훈, 돈 · 친밀도 · 꾸미기 · 무기 · 가구 · 먹을 것 보상), 마을 이야기 「바위산의 수상한 기척」(대장 → 토벌 자격증 →
 *          랏코 → 카니 그림책 → 바위산 깊은 곳 → 왕버섯 보스전 → 마을 축하), 머리 위 ! · ?, 왼쪽 위 퀘스트 쪽지, 마을폰 퀘스트 앱
 */
import * as THREE from 'three';
import { createScene } from './render/scene.js';
import { createPerf } from './render/perf.js';
import { createLod } from './render/lod.js';
import { createFollowCamera } from './render/camera.js';
import { buildVillage } from './world/village.js';
import { createWeeds, stageLabel } from './world/weeds.js';
import { buildChibi, setCrying, wearPajama, PAJAMA_COLORS, SEAT_LIFT } from './actors/models.js';
import { setCelLight, toonMesh, GEO } from './render/toon.js';
import { createPlayer } from './actors/player.js';
import { createNpcs } from './actors/npcs.js';
import { createInput } from './ui/joystick.js';
import { createHud } from './ui/hud.js';
import { createPanels, ICO } from './ui/panels.js';
import { createMulti, DEFAULT_SERVER, roomCode, newVillageCode, isVillageCode } from './net/multi.js';
import { createRemotePlayers } from './net/remote.js';
import { openCreator } from './ui/creator.js';
import { showTitle } from './ui/title.js';
import { createIntro } from './ui/intro.js';
import { createState, addMoney, trySpend, useStamina, restoreStamina, sleepStamina, MAX_STAMINA } from './core/state.js';
import { advance, hourOf, sleepFor, timeLabel, phaseOf, SLEEP_HOURS } from './core/clock.js';
import { WEED_KINDS, STAMINA_PER_PULL, startPull, chargePull, releasePull, canPullKind, advanceWeed, gotWeed, pullStamina, kindsOfGrade, josa } from './core/weeding.js';
import { JOB_TYPES, acceptJob, recordPull, isComplete, payout, isWeedJob, isFishJob } from './core/jobs.js';
import { gainXp, canTakeExam, startExam, examStep, examCounts, examKinds, promote, PAY_MULT, EXAM_FEE, EXAM_STREAK, payExamFee, NOVICE, gradeName } from './core/license.js';
import { buy, CHEERS_PRICE, CHEERS_STAMINA, isPubHour } from './core/shop.js';
import { createStore } from './core/save.js';
import { encodeSave, decodeSave } from './core/savecode.js';
import { createSound } from './audio/sound.js';
import { TUTORIAL_LINES, HELP_TOPICS, tutorialActive, tutorialNext } from './core/tutorial.js';
import { createGuide } from './ui/guide.js';
import { playSleep } from './ui/sleepfx.js';
import { createBerries } from './world/berries.js';
import { createGlowShrooms } from './world/glowshrooms.js';
import { glowZone, glowResult, pickedTonight, markPicked } from './core/glowfluff.js';
import { openSticker } from './ui/sticker.js';
import { createInterior } from './world/interior.js';
import { createRooms } from './world/rooms.js';
import { createHomeUI } from './ui/homeui.js';
import { FURNITURE, HOME_SIZES, WALLPAPERS, FLOORS, homeOf, sizeOf, gridOf, decorOf, expandHome, useDecor, buyFurniture, placeFurniture, removeFurniture, rotateFurniture, moveFurniture } from './core/home.js';
import { FRIENDS, CHATS, ptsForHearts, friendOf, hearts, befriend, befriendBy, markDay, rps, canBorrow, loanOptions, borrow, repay, debtOf } from './core/friends.js';
import { LICENSES, LIQUOR_LESSONS, LIQUOR_MARKS, STUDY, studyProgress, markStudy, liquorQuiz, payFee, grant, revoke, hasLicense, licensesOf, licenseNumber, canWorkRamen, workedRamen } from './core/licenses.js';
import { ramenQuiz, shiftPay } from './core/ramen.js';
import { addItem, takeItem, eatItem, submitToJob, countOf, itemInfo, MAX_STACK } from './core/inventory.js';
import { storeItem, takeOut } from './core/storage.js';
import { greetingFor, chatFor } from './core/dialogue.js';
import { ACCESSORY_ITEMS, buyAccessory, craftAccessory, wearAccessory, wardrobeOf, SALON_PRICE } from './core/wardrobe.js';
import { sellItem, sellPrice } from './core/market.js';
import { canGift, giveGift, giftLine, tasteOf } from './core/gifts.js';
import { openRamenShop } from './ui/ramenshop.js';
import { itemSvg, accessorySvg } from './ui/itemart.js';
import { weaponSvg, monsterSvg } from './ui/monsterart.js';
import { openQuiz, openHighball } from './ui/exams.js';
import { licenseCardEl } from './ui/licensecard.js';
import { openRaffleSpin } from './ui/rafflespin.js';
import { raffleOf, earnTicket, drawRaffle } from './core/raffle.js';
import {
  VILLAGERS, MEAL_PRICE, takeFromBoard, returnToBoard, villagerOf, villagerTakesJob, payVillager, villagerSpend, villagerPay,
  canSteal, stealAmount, steal, recover, thiefKeeps, markTheft, villagerEnergy, isSleepHour, BED_HOUR, TIRED, NAP_ENERGY, MEAL_ENERGY,
  boardOf, MAX_JOBS_PER_DAY, updateVillager
} from './core/villagers.js';
import { HUNTER_PROFILES, licensed, addKill, canTryExam, tryExam, ranking, engrave as engraveWeapon, engravedOf, ENGRAVE_PRICE, partyCheck, killPoints, PARTY_HEARTS } from './core/hunters.js';
import { lineOf } from './core/npclines.js';
import { chooseActivity, freshMind, growNeeds, satisfy, likeOf, PERSONA, wakeHourOf } from './core/brain.js';
import { liveOffscreen, asleepSpans, mateEats } from './core/offscreen.js';
import { goalOf, canBuy, buyGoal, npcPower, hasRod, hasCar, canDoJob, canTryLiquor, tryLiquor, goalNews, goalPlace, friendLook } from './core/goals.js';
import {
  conversation, storyLine, praiseLine, newsLine, HOBBY, SHOW, TRAIN_TALK, GREET_RUN, GIFT, CONGRATS, THANKS, COMFORT, COMFORTED,
  FAINT_RUSH, THEFT_SEEN, MEAL_INVITE, SMALLTALK, pickLine, fillLine, STAFF_TALK, STAFF_SCRIPTS, PRAISED, savingLine
} from './core/villagetalk.js';
import { DOING_ICONS } from './ui/doingicons.js';
import { charSvg, hasCharArt } from './ui/art.js';
import { furnitureThumbs } from './world/thumbs.js';
import { TICKET_SVG } from './ui/itemart.js';
import { playerPortrait } from './world/portrait.js';
import { RENT, LOTTERY_PRICE, LODGING_PRICE, ROUGH_REST, housingOf, isEvicted, startDay, payRent, rentAgain, buyHouse, applyLottery, buyByLottery } from './core/housing.js';
import { POCHETTES, buyPochette, wearPochette, worn, guardedTheft } from './core/pochette.js';
import { VILLAGE_R, REGION_NAMES, GATES, POND, RIVER, BRIDGES, riverZ, regionAt, roadDist, RAMEN_SEATS, RAMEN_QUEUE, SOUTH_SHORE, CLIFF } from './core/layout.js';
import { markExplored } from './core/explore.js';
import { TOOLS, toolsOf, buyTool, lightOf, nextLight, hasTool } from './core/tools.js';
import { CAR_RADIUS } from './actors/car.js';
import { FISH, FISH_STAMINA, BITE_WAIT, waterAt, pickFish, rulesOf, startReel, stepReel, fishLength, logFish, grillFish, claimDex } from './core/fishing.js';
import { createFishGame } from './ui/fishgame.js';
import { createPlayerLights } from './actors/lights.js';
import { todayISO, dateLabel, weekdayOf, dateOf } from './core/calendar.js';
import { WEAPONS, MONSTERS, heldWeapon, buyWeapon, holdWeapon, faint, recordHunt, sellDrops, huntQuiz, PLAYER_IFRAME, PLAYER_KNOCK, FAINT_HOURS } from './core/combat.js';
import { LAIR_BOSSES, BOSS_LAIRS, KING_LAIR, bossHome, bossSeen, markBossSeen, markBossDown } from './core/bosses.js';
import { bountyNow, markBountyDown, claimBounty, ELITE } from './core/bounty.js';
import { WORKS, WORK_IDS, WORK_SPOTS, REST_RATE, donate, fundWork, workOf, dueWorks, markWorksOpen, workStatus, worksView, packWorks, unpackWorks, canPickFlower, pickFlower, canRingBell, ringBell } from './core/works.js';
import { nearWorkLine, upgradeChat, BELL_HEARD } from './core/upgradetalk.js';
import { createWorks } from './world/works.js';
import { createHomeExterior } from './world/homeext.js';
import { talkMenu, subAsk, BACK } from './core/talkmenu.js';
import { createMonsters } from './world/monsters.js';
import { canWish, makeWish, WISHES, WISH_MONEY, WISH_STAMINA, isStarfallNight, isStarHour } from './core/starfall.js';
import { createStarfall } from './world/starfall.js';
import { createStreaks } from './ui/starstreaks.js';
import { signHtml } from './ui/signart.js';
import { createClub } from './world/club.js';
import { createBurrows } from './world/burrows.js';
import { createRhythm } from './ui/rhythm.js';
import { createUsagiClub } from './stories/usagiclub.js';
import { createIsland } from './world/island.js';
import { createPier } from './world/pier.js';
import { createIslandTrip } from './stories/island.js';
import { createMinigame } from './ui/minigame.js';
import { createShisaStory } from './stories/shisa.js';
import { createHachiPit } from './stories/hachipit.js';
import { createPajamaStory } from './stories/pajama.js';
import { createIdolStage } from './world/idolstage.js';
import { createIdolStory } from './stories/pajamaidol.js';
import { createStarDiner, createDinerFront, buildStarTrio } from './world/stardiner.js';
import { createStarDinerStory } from './stories/stardiner.js';
import { createBonbonFront, createBonbonGlade } from './world/bonbon.js';
import { createBonbonStory } from './stories/bonbon.js';
import { createSwitchFront, createBeetleBuddy, createSwitchStage, buildSwitchGadget, holdSwitch, BEETLE_SCALE } from './world/switchcave.js';
import { createSwitchStory } from './stories/switch.js';
import { createCameraStory } from './stories/camera.js';
import { createPhotoUi } from './ui/photos.js';
import { refreshPhotoFrame } from './world/photoframe.js';
import { createChiiRoom } from './world/chiiroom.js';
import { createWeather } from './world/weather.js';
import { createBlackStarStory } from './stories/blackstar.js';
import { loopDue, rewind as loopRewind, markLoop as loopMark, startLoop as loopStart, endLoop as loopEnd, loopGate, loopOf, BLEACH_PRICE } from './core/blackstar.js';
import { createStarGame } from './ui/stargame.js';
import { createCliff } from './world/cliff.js';
import { createPit } from './world/pit.js';
import { eatStyle } from './core/eating.js';
import { createGround } from './world/ground.js';
import { groundOf, dropItem as dropToGround, dropWeapon, pickUp, groundName, placeItem, MAX_GROUND } from './core/ground.js';
import { pantryOf, addToPantry, takeFromPantry, snackOf, shareOf, sellPantry, thanksOf, hatedOf, SNACK_ENERGY } from './core/pantry.js';
import { createUpdateCheck } from './ui/update.js';
import { QUESTS, PLACES as QUEST_PLACES, questsFor, markOf, startQuest, completeStep, stepOf, reportTo, goalText, shortGoal, pickTrack, activeQuests, arrived, isDone, isActive, bond, logAct, stepReady, pizzaNewsDue, staleScenes, dropQuest, ACTS, boardStory } from './core/quests.js';

const ui = document.getElementById('ui');
const canvas = document.getElementById('scene');

function fatal(title, text) {
  ui.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'notice';
  box.innerHTML = '<div class="card"><h2></h2><p></p></div>';
  box.querySelector('h2').textContent = title;
  box.querySelector('p').textContent = text;
  ui.appendChild(box);
}

function safeStorage() {
  try { return window.localStorage; } catch {
    const fail = () => { throw new Error('storage blocked'); };
    return { getItem: fail, setItem: fail, removeItem: fail };
  }
}

// 하늘(위·지평선 색)과 빛: 시각(시) 기준 키프레임. 낮은 맑고 밝게.
const SKY = [
  { h: 4.5, top: '#1f2b4f', hor: '#3d4f80', sun: 0.35, hemi: 0.6 },
  { h: 6.5, top: '#8ccbf0', hor: '#ffe3cf', sun: 1.5, hemi: 1.05 },
  { h: 8.5, top: '#78c3f1', hor: '#e2f5fb', sun: 2.0, hemi: 1.2 },
  { h: 16.5, top: '#78c3f1', hor: '#e2f5fb', sun: 2.0, hemi: 1.2 },
  { h: 18.5, top: '#8f9bd8', hor: '#ffc9a3', sun: 1.3, hemi: 0.95 },
  { h: 20.5, top: '#2a3866', hor: '#4a5c8f', sun: 0.45, hemi: 0.65 },
  { h: 28.5, top: '#1f2b4f', hor: '#3d4f80', sun: 0.35, hemi: 0.6 }
].map((k) => ({ ...k, topC: new THREE.Color(k.top), horC: new THREE.Color(k.hor) }));

function boot() {
  let gfx;
  try {
    gfx = createScene(canvas);
  } catch (e) {
    console.error(e);
    fatal('3D 화면을 열 수 없어요', '브라우저 설정에서 하드웨어 가속(WebGL)을 켠 뒤 새로고침해 주세요.');
    return;
  }
  const { scene, sun, hemi } = gfx;
  // 넓어진 월드: 먼 곳은 안개로 부드럽게 가린다(멀리 있는 구역 묶음은 그리지 않는다)
  scene.fog.near = 30;
  scene.fog.far = 64;
  const lights = createPlayerLights(scene); // 랜턴 · 손전등
  let nightNow = 0;
  let exploreT = 0, lastRegion = null; // 탐험 기록 주기 · 마지막 구역(세션을 시작할 때 비운다)
  const cam = createFollowCamera(gfx.resize());
  const village = buildVillage(scene);
  const berries = createBerries(scene, village); // 잡초보다 먼저 심어서 잡초가 덤불을 피해 자란다
  const glows = createGlowShrooms(scene, village); // 서쪽 숲 빛나는 버섯(밤에 반짝 털뭉치) — 잡초가 버섯 위에 돋지 않게 먼저
  const weeds = createWeeds(scene, village);
  const monsters = createMonsters(scene, village); // 마을 밖 몬스터(4단계)
  const works = createWorks(village); // 마을 가꾸기 시설(모금함에 돈을 모아 생긴 꽃밭 · 벤치 · 가로등 · 시계탑 · 정자)
  const homeExt = createHomeExterior(village); // 내 집 바깥: 넓힐수록 돔 집 → 아담한 집 → 저택
  // 가려진 몬스터 실루엣은 스텐실 버퍼로 '제 몸이 보이는 곳'을 빼고 칠한다. 기기 · 브라우저가 스텐실을 안 주면
  // 실루엣이 몬스터 몸 위를 분홍으로 덮어 모습이 안 보이므로, 그런 화면에서는 실루엣을 끈다
  {
    const gl = gfx.renderer.getContext();
    monsters.setGhosts(!!(gl.getContextAttributes() || {}).stencil && gl.getParameter(gl.STENCIL_BITS) > 0);
  }
  const ground = createGround(scene, (e) => (e.weapon ? weaponSvg(e.id) : itemSvg(e.id))); // 주머니에서 버린 물건(그 물건 그림 그대로 바닥에)
  const groundKind = (e) => (e.weapon ? 'weapon' : (itemInfo(e.id) || { kind: 'quest' }).kind);
  const npcs = createNpcs(scene, village, weeds, berries);
  const input = createInput(ui, canvas);
  const hud = createHud(ui, input);
  const store = createStore(safeStorage());
  // 휴대폰 발열 줄이기: 절전(초당 30번) · 창이 화면을 덮으면 뒤 3D 는 천천히 · 먼 외곽선은 그리지 않기
  const perf = createPerf({ storage: safeStorage() }); // 절전 모드는 휴대폰도 꺼진 채로 시작(초당 60번)
  const lod = createLod(gfx.scene);
  const covered = () => !!ui.querySelector('.backdrop:not(.side):not([hidden]), .notice-wrap, .raffle-wrap'); // 옷장(side)은 내 모습을 봐야 해서 뺀다
  let drawNow = true;
  // 소리: 브라우저는 첫 누름 전까지 소리를 막으므로 누를 때마다 깨운다. 버튼을 누르면 딸깍.
  const sound = createSound(safeStorage());
  // 소리 깨우기: 터치는 손을 뗄 때(pointerup · touchend · click)라야 브라우저가 '사용자가 눌렀다'로 쳐준다(누르는 순간은 스크롤일 수도 있어서).
  // 예전엔 pointerdown · keydown 에서만 깨워 아이폰(터치)에서는 소리가 영영 나지 않았다
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(type, () => sound.unlock(), true);
  ui.addEventListener('click', (e) => { if (e.target.closest('button')) sound.play('click'); }, true);
  const guide = createGuide(ui, { onLine: (who, text) => sound.voice(who.kind, text), dock: hud.dock, onCue: (cue) => storyCue(cue) });

  let state = null;
  let player = null;
  // 친구가 풀을 뽑거나 열매를 따면 내 캐릭터처럼 결과를 머리 위에 띄운다(가까이 있을 때만): 깔끔! · 끊어졌다… · 조금 더 꾹~ · +1 · 떨어뜨렸다
  npcs.onWorkFx((n, e) => {
    const p = player && player.position;
    if (!p || Math.hypot(e.x - p.x, e.z - p.z) > 22) return;
    if (e.type === 'weed') {
      const [text, kind] = e.result === 'clean' ? ['깔끔!', 'clean'] : e.result === 'snapped' ? ['끊어졌다…', 'snap'] : ['조금 더 꾹~', 'tip'];
      hud.floatText({ x: e.x, y: 1.15, z: e.z, text, kind });
    } else if (e.result === 'drop') hud.floatText({ x: e.x, y: 1.2, z: e.z, text: '앗, 떨어뜨렸다…', kind: 'snap' });
    else hud.floatText({ x: e.x, y: 1.2, z: e.z, text: '+1', kind: 'pick', icon: itemSvg('berry') });
  });
  let pulling = null; // { weed, pull }
  let sleeping = false; // 하루가 지나는 연출 중
  let target = null;
  let saveTimer = 0;

  let saveLocked = false; // 저장을 불러온 직후(새로고침 전): 창을 떠나며 지금 진행으로 덮어쓰지 않게
  // 같이 놀기: 친구 마을에 놀러 간 중 { code, home: 떠나온 자리 { x, z, yaw }, clock · npcs · weeds · berries: 주인이 보낸 마을 모습, arriving · leaving: 커튼 연출 중, warnAt }
  // 놀러 간 동안에도 저장은 하되(친구 마을에서 얻은 것은 바로 내 것) 자리는 떠나온 곳으로 적는다: 창을 닫아도 다음에는 내 마을에서 이어진다
  let visiting = null;
  const save = () => {
    if (!state || !player || saveLocked) return;
    const p = visiting ? visiting.home : player.position;
    store.save({ ...state, player: { x: p.x, z: p.z } });
  };
  const commit = (next, persist = true) => { state = next; if (persist) save(); };
  // 새 버전이 올라오면 화면 위에 알림 띠: 「새로고침」은 지금 진행을 저장하고 새로고침(ui/update.js)
  const updateCheck = createUpdateCheck(ui, { onReload: save });
  const seen = (tip) => state.seenTips.includes(tip);
  const markSeen = (tip) => { state = { ...state, seenTips: [...state.seenTips, tip] }; };

  // ---------- 같이 놀기(멀티): 동물의 숲처럼 내 마을 문을 열면 친구가 내 마을 코드로 놀러 온다(서버: server/TownServer) ----------
  const remotes = createRemotePlayers(scene);
  let homeRemotes = null;
  let worldT = 0, weedsT = 0; // 주인: 마을 모습을 다시 보낼 때까지 남은 초(시간 · 마을 친구들, 풀)
  // 같은 사람을 마을(바깥 포함)과 주인 집 안에 하나씩: 있는 곳(area)에 맞는 쪽만 보인다(homeRemotes 는 집 안 장면이 생긴 뒤에 만든다)
  const eachRemote = (fn) => { fn(remotes); if (homeRemotes) fn(homeRemotes); };
  // 등불을 든 친구 둘레도 밝힌다(두 명까지). 처음 필요할 때 만들어 계속 둔다(빛 개수가 바뀌면 화면이 잠깐 멈칫해서 끄기만 한다)
  const remoteLights = [];
  function updateRemoteLights() {
    const lit = mode === 'play' ? remotes.lit().slice(0, 2) : [];
    while (remoteLights.length < lit.length) remoteLights.push(createPlayerLights(scene));
    remoteLights.forEach((L, i) => { const r = lit[i]; L.update(r ? r.mode : 'off', r || { x: 0, z: 0 }, r ? r.yaw : 0, nightNow); });
  }
  const multi = createMulti({
    joined: (p, fresh) => {
      eachRemote((r) => r.add(p));
      if (!fresh) return; // 먼저 와 있던 사람(놀러 갔을 때 이미 있던 주인 · 손님)은 알리지 않는다
      worldT = weedsT = 0; // 주인: 새 손님에게 마을 모습을 바로 보낸다
      sound.play('job');
      hud.toast(`${josa(p.name, '이/가')} 놀러 왔어요!`, 3000);
    },
    moved: (id, m) => {
      const was = remotes.animOf(id);
      eachRemote((r) => r.move(id, m));
      // 같이 토벌하던 친구가 쓰러졌다: 다가가서 깨워 줄 수 있다
      if (m && m.anim === 'faint' && was && was !== 'faint' && m.area === 'village') hud.toast(`${josa(multi.nameOf(id) || '친구', '이/가')} 쓰러졌어요! 다가가서 깨워 주세요`, 3600);
    },
    left: (id, name) => { eachRemote((r) => r.remove(id)); releaseHolds(id); leaveParty(id); arrivedGuests.delete(id); if (name) hud.toast(`${josa(name, '이/가')} 돌아갔어요`, 2600); },
    said: (id, text) => eachRemote((r) => r.say(id, text)), emote: (id, name) => eachRemote((r) => r.emote(id, name)),
    look: (id, look) => eachRemote((r) => r.setLook(id, look)), // 옷 · 변신 · 포셰트를 바꿨다
    cleared: () => { eachRemote((r) => r.clear()); clearParty(); arrivedGuests.clear(); },
    world: (w) => takeWorld(w),
    guestAct: (id, a) => takeGuestAct(id, a),
    direct: (id, a) => takeDirect(id, a),
    closed: (hostName) => endVisit('closed', hostName),
    lost: () => endVisit('lost'),
    status: () => { panels.refresh('multi'); updateVisitTag(); }
  });
  // 서버 주소는 고정(DEFAULT_SERVER, 화면에 보이지 않는다). 내 PC 에서 시험할 때만 주소 뒤 ?mpserver=localhost:5280 으로 바꾼다.
  // 친구 마을 코드는 이 브라우저에 기억해 둔다(다음에 또 넣지 않게)
  const mpServer = new URLSearchParams(location.search).get('mpserver') || DEFAULT_SERVER;
  const MP_KEY = { code: 'chiikawa-town-mp-friend' };
  const lsGet = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 저장이 막혀 있으면 이번만 */ } };
  const mpDraft = { code: lsGet(MP_KEY.code) };
  let mySay = null; // 내가 한 한마디 { text, until } — 내 머리 위에도 말풍선
  const joinInfo = (x, z, yaw) => ({ name: myName(), look: myLook(), x, z, yaw });
  /** 화면에 보일 상태: 친구 마을에 놀러 간 동안은 시계 · 날짜만 주인 마을 것(내 진행은 그대로). */
  const viewState = () => (visiting && visiting.clock ? { ...state, clock: visiting.clock, startDate: visiting.startDate || state.startDate } : state);
  const multiPanel = {
    state: () => ({
      status: multi.status, role: multi.role, error: multi.error, players: multi.players, hostName: multi.hostName,
      myCode: state ? state.villageCode : '', code: mpDraft.code, visiting: !!visiting
    }),
    draft(key, v) { if (!MP_KEY[key]) return; mpDraft[key] = v; lsSet(MP_KEY[key], v); },
    /** 내 마을 문을 연다(친구가 내 마을 코드로 놀러 올 수 있다). */
    async open() {
      if (!state || !player || visiting) return;
      const ok = await multi.open(mpServer, state.villageCode, joinInfo(player.position.x, player.position.z, player.yaw));
      if (!ok || !state) return; // 못 열었으면 까닭이 폰에 뜬다(열리면 폰의 스위치가 '열림'으로)
      sound.play('job');
      hud.toast('문을 열었어요! 친구에게 마을 코드를 알려 주세요', 4200, { chips: [{ text: state.villageCode }] });
    },
    /** 내 마을 문을 닫는다(와 있던 친구들은 집으로 돌아간다). */
    shut() { multi.leave(); hud.toast('문을 닫았어요', 2200); },
    /** 마을 문 열기 스위치: 열려 있으면 닫고, 닫혀 있으면 연다. */
    toggleGate() { if (multi.status === 'open') multiPanel.shut(); else if (multi.status !== 'connecting') multiPanel.open(); },
    visit() { startVisit(mpDraft.code); },
    goHome() { if (panels.openKind() === 'multi') panels.close(); endVisit('home'); },
    /** 내 마을 코드를 복사한다(복사가 막힌 브라우저면 코드를 알림으로 보여 준다). */
    copy() {
      const code = state && state.villageCode;
      if (!code) return;
      const shown = () => hud.toast('내 마을 코드', 3600, { chips: [{ text: code }] });
      try { navigator.clipboard.writeText(code).then(() => hud.toast('마을 코드를 복사했어요', 2200, { chips: [{ text: code }] }), shown); } catch { shown(); }
    },
    say(text) { multi.say(text); mySay = { text, until: performance.now() + 3500 }; }
  };

  /**
   * 친구 마을에 놀러 간다(마을폰 '같이 놀기'). 커튼 뒤에서 그 마을 모습으로 바꾸고, 처음 마을에 올 때처럼
   * 숲길 끝에서 정문으로 걸어 들어간다(리본에 '○○의 마을'). 놀러 간 동안 내 시간 · 퀘스트는 멈추고,
   * 주인 마을의 풀 · 열매를 내 가방으로, 가게에서는 내 돈으로 산다.
   */
  async function startVisit(typed) {
    if (!state || !player || visiting) return;
    const code = String(typed || '').trim().toUpperCase();
    if (!roomCode(code)) { hud.toast('친구의 마을 코드를 넣어 주세요', 2400); return; }
    if (code === state.villageCode) { hud.toast('내 마을 코드예요. 친구의 마을 코드를 넣어 주세요', 2800); return; }
    if (mode !== 'play' || pulling || sleeping || fainting || sticker || funBusy() || closeup || hunterExam || guide.open) { hud.toast('지금은 놀러 갈 수 없어요', 2400); return; }
    const E = village.entrance;
    const ok = await multi.visit(mpServer, code, joinInfo(E.outside.x, E.outside.z, Math.PI));
    if (!ok || visiting || !state || mode !== 'play') { if (ok) multi.leave(); return; } // 못 들어갔으면 까닭이 폰에 뜬다
    const v = visiting = { code, home: { x: player.position.x, z: player.position.z, yaw: player.yaw }, clock: null, npcs: [], weeds: null, berries: null, arriving: true, leaving: false, warnAt: 0 };
    if (panels.isOpen()) panels.close();
    cancelPull();
    partyEnd(null, 'partyLeave');
    target = null;
    hud.setAction(null);
    hud.setQuests([]);
    if (examPill) { examPill = false; hud.setTimer(null); }
    input.setEnabled(false);
    const host = multi.hostName || '친구';
    hud.curtain(true, `${host}의 마을로 가는 중…`);
    save(); // 떠나기 전 자리를 적어 둔다
    setTimeout(() => {
      if (visiting !== v || v.leaving) return;
      v.arriving = false;
      weeds.showGuest(v.weeds || [], multi.you); // 내 풀 · 덤불은 숨기고 주인 마을 것으로
      if (v.berries) berries.showGuest(v.berries);
      updateVisitTag();
      hud.curtain(false);
      mode = 'intro';
      setCinematic(true);
      intro.start(() => {
        if (visiting !== v) return;
        mode = 'play';
        v.safeUntil = performance.now() + 4000; // 들어온 직후 잠깐은 맞지 않는다(오는 길에 늦게 온 공격 소식)
        setCinematic(false);
        input.setEnabled(true);
        hud.toast('다 놀았으면 마을폰으로 집에 가요', 3000);
      }, false, { title: `${host}의 마을`, kicker: '놀러 왔어요!' });
    }, 1000);
  }
  /** 집으로 돌아온다. why: 'home'(내가 돌아감) · 'closed'(주인이 문을 닫았다) · 'lost'(연결이 끊겼다) · 'faint'(쓰러졌는데 아무도 안 깨워 줬다). */
  function endVisit(why, hostName = '') {
    if (!visiting || visiting.leaving) return;
    const v = visiting, host = hostName || multi.hostName || '친구';
    const fainted = why === 'faint' || clearDown(); // 쓰러진 채로 돌아가면 기절한 것으로
    v.leaving = true;
    if (why === 'home' || why === 'faint') multi.leave();
    input.setEnabled(false);
    hud.curtain(true, fainted ? '눈앞이 깜깜해졌다…' : '집으로 돌아가는 중…');
    setTimeout(() => {
      if (visiting !== v) return;
      dropVisit();
      hud.curtain(false);
      if (!sleeping) input.setEnabled(true);
      if (fainted) {
        // 기절: 내 마을 떠나온 자리에서 정신을 차린다(시간이 흐르고 돈을 조금 잃는다 — 내 마을에서 기절할 때와 같게)
        const r = faint(state);
        commit(r.state);
        if (r.lost) sound.play('coinLoss');
        hud.banner('기절했어요…', '정신을 차려 보니 내 마을이었어요', 3600, [{ icon: ICO.clock, text: timeLabel(state.clock) }, ...(r.lost ? [{ icon: 'coin', text: `−${won(r.lost)}` }] : [])]);
        return;
      }
      hud.toast(why === 'closed' ? `${host}의 마을 문이 닫혀서 집으로 돌아왔어요` : why === 'lost' ? '연결이 끊겨서 집으로 돌아왔어요' : '집으로 돌아왔어요', 3200);
    }, 1000);
  }
  /** 놀러 간 것을 바로 끝내고 떠나온 자리로 돌아온다(endVisit 의 커튼 뒤 · 메인으로 나갈 때). */
  function dropVisit() {
    if (!visiting) return;
    cancelPull();
    const h = visiting.home, curtained = visiting.arriving || visiting.leaving;
    visiting = null;
    if (curtained) hud.curtain(false); // 커튼 연출 도중에 메인으로 나갔으면 걷어 둔다
    if (mode === 'intro') { intro.abort(); mode = 'play'; setCinematic(false); } // 걸어 들어가는 도중이었다
    exitHostHome(true); // 친구 집 안에 있었다
    clearDown();
    npcs.puppet(null);
    weeds.showGuest(null);
    berries.showGuest(null);
    monsters.showGuest(null);
    eachRemote((r) => r.clear());
    if (!starShow && starfall.phase !== 'idle') starfall.clear(); // 주인 마을에 떨어진 별똥별맨 · 구덩이를 내 마을로 가져오지 않는다
    player.walkTo = null;
    player.setPosition(h.x, h.z);
    player.face(h.x + Math.sin(h.yaw), h.z + Math.cos(h.yaw));
    cam.snap(player.position);
    updateVisitTag();
  }
  /** 같이 놀기 꼬리표(왼쪽 위): 주인은 놀러 온 친구 이름, 손님은 놀러 와 있는 마을. */
  function updateVisitTag() {
    const party = [...mpParty.values()]; // 같이 토벌 파티
    if (visiting && !visiting.arriving) hud.setVisitors({ label: `${multi.hostName || '친구'}의 마을에 놀러 왔어요`, short: `${multi.hostName || '친구'}네 마을`, names: [], party });
    else if (!visiting && multi.status === 'open') {
      const guests = multi.players.map((p) => p.name);
      hud.setVisitors(guests.length ? { label: '놀러 온 친구', short: '', names: guests, party } : { label: '마을 문이 열려 있어요', short: '문 열림', names: [], party }); // short: 휴대폰에서 보일 짧은 글
    } else hud.setVisitors(null);
  }
  /**
   * 손님: 주인이 보낸 마을 모습 { c: [날, 시각], d: 주인의 시작 날짜, n: 마을 친구들, w: 풀, b: 열매 덤불 }.
   * 서버가 그대로 전한 것이라 하나씩 확인해서 쓴다. 풀 · 덤불은 커튼이 다 내려온 뒤에 바꾼다.
   */
  function takeWorld(w) {
    if (!visiting || !w || typeof w !== 'object') return;
    if (Array.isArray(w.c) && Number.isFinite(w.c[0]) && Number.isFinite(w.c[1])) visiting.clock = { day: Math.max(1, Math.floor(w.c[0])), t: Math.min(0.99999, Math.max(0, w.c[1])) };
    if (typeof w.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.d)) visiting.startDate = w.d;
    if (Array.isArray(w.n)) visiting.npcs = w.n.filter((s) => Array.isArray(s) && typeof s[0] === 'string').slice(0, 40);
    if (Array.isArray(w.w)) { visiting.weeds = w.w.slice(0, 400); if (!visiting.arriving) weeds.showGuest(visiting.weeds, multi.you); }
    if (Array.isArray(w.b)) { visiting.berries = w.b.slice(0, 40); if (!visiting.arriving) berries.showGuest(visiting.berries); }
    if (Array.isArray(w.k)) {
      // 마을 가꾸기 시설(공사 중 · 생김): 바뀌면 모금함 창도 다시
      const k = unpackWorks(w.k), changed = JSON.stringify(k) !== JSON.stringify(visiting.works || {});
      visiting.works = k;
      if (changed) panels.refresh('works');
    }
    if (Array.isArray(w.kp)) {
      // 주인 마을 모금함에 모인 돈(시설마다): 모금함 창은 이 금액으로
      const kp = {};
      for (const r of w.kp.slice(0, WORK_IDS.length)) if (Array.isArray(r) && Object.hasOwn(WORKS, r[0]) && Number.isFinite(r[1])) kp[r[0]] = Math.max(0, Math.min(WORKS[r[0]].price, Math.floor(r[1])));
      const changed = JSON.stringify(kp) !== JSON.stringify(visiting.worksPaid || {});
      visiting.worksPaid = kp;
      if (changed) panels.refresh('works');
    }
    if (Array.isArray(w.m) && !visiting.arriving) monsters.showGuest(w.m.slice(0, 80), { shots: w.s, rain: w.r }); // 바깥에서 같이 토벌
    if (Array.isArray(w.g)) visiting.ground = parseGround(w.g);
    if (Array.isArray(w.z) && Number.isFinite(w.z[0]) && w.z[0] !== visiting.slept && !visiting.arriving && !visiting.leaving
      && Number.isFinite(w.z[1]) && Number.isFinite(w.z[2]) && ['morning', 'day', 'evening', 'night'].includes(w.z[3])) {
      visiting.slept = w.z[0];
      guestSleep({ day: Math.max(1, Math.floor(w.z[1])), t: Math.min(0.99999, Math.max(0, w.z[2])) }, w.z[3]);
    }
    if (Array.isArray(w.e) && !visiting.arriving) {
      // 주인 마을 소식(광장 공연 같은 일): 처음 받은 것만 알림으로
      visiting.news = visiting.news || new Set();
      for (const e of w.e.slice(0, 5)) {
        if (!Array.isArray(e) || !Number.isFinite(e[0]) || typeof e[1] !== 'string' || visiting.news.has(e[0])) continue;
        visiting.news.add(e[0]);
        const kind = typeof e[2] === 'string' && FRIENDS[e[2]] ? e[2] : null;
        hud.toast(e[1].slice(0, 40), 2600, kind ? { icon: faceIcon(kind) } : null);
      }
    }
    if (Array.isArray(w.h)) {
      const house = parseHouse(w.h, w.hl), key = JSON.stringify([house.size, house.wall, house.floor, house.placed]);
      if (key !== visiting.houseKey) {
        visiting.houseKey = key;
        visiting.house = house;
        if (mode === 'guesthome') interior.setHome(house); // 주인이 꾸미는 중이면 바로 바뀐다
      }
    }
  }
  /**
   * 손님: 놀러 간 마을 주인이 잠들었다 — 나도 같은 잠 연출(그 마을 날짜 · 깨는 시각)을 보고, 친구 집에서 잔 것처럼 기운이 찬다.
   * 내 마을 시간은 놀러 가 있는 동안 멈춰 있으니 그대로 둔다.
   */
  function guestSleep(clock, phase) {
    if (sleeping || !state || !visiting || fainting || downed) return;
    sleeping = true;
    cancelPull();
    if (panels.isOpen()) panels.close();
    input.setEnabled(false);
    hud.setAction(null);
    sound.play('sleep');
    const light = phase === 'morning' || phase === 'day', host = multi.hostName || '친구';
    playSleep(ui, { dateText: dateLabel(visiting.startDate || state.startDate || todayISO(), clock.day), timeText: timeLabel(clock), phase },
      () => commit(sleepStamina(state, 'lodge')), () => { if (light) sound.play('morning'); }).then(() => {
      sleeping = false;
      if (mode === 'play' || mode === 'guesthome') input.setEnabled(true);
      hud.toast(`${host}의 마을에서 같이 푹 잤어요!`, 3400);
    });
  }
  /**
   * 주인: 손님의 행동을 내 마을에 반영한다(받은 값은 하나씩 확인한다). 바뀐 풀 · 덤불은 다음 마을 모습으로 바로 모두에게 간다.
   * { t: 'grab' | 'drop', id }: 그 풀을 뽑기 시작했다 · 그만뒀다(그동안 나와 마을 친구들은 그 풀을 건드리지 않는다)
   * { t: 'weed', id, stage, flawed }: 한 단계 뽑았다, { t: 'weed', id, done: 'clean' | 'snapped' }: 다 뽑았다
   * { t: 'berry', i }: 그 덤불의 열매를 땄다
   * { t: 'hit', id, dmg, knock, x, z }: 그 몬스터를 쳤다, { t: 'take', g, n }: 바닥 물건을 줍겠다, { t: 'put', id, n, clean, weapon, x, z }: 버렸다
   */
  function takeGuestAct(id, a) {
    if (!state || !a || typeof a !== 'object') return;
    if (a.t === 'hit') {
      // 몬스터 치기: 손님 무기가 닿았다(내가 친 것처럼 밀리고, 그 손님에게 덤비기도 한다)
      const m = Number.isFinite(a.id) ? monsters.byId(a.id) : null;
      if (!m || m.exam || m === bossM || !Number.isFinite(a.x) || !Number.isFinite(a.z) || Math.hypot(a.x - m.x, a.z - m.z) > m.M.size + 6) return;
      const dmg = Math.max(1, Math.min(GUEST_HIT_MAX, Math.round(a.dmg * 2) / 2 || 1)); // 0.5 단위(반짝 검 3.5)
      const killed = monsters.playerHit(m, { x: a.x, z: a.z, dmg, knock: Math.max(0, Math.min(3, Number(a.knock) || 1)), by: 'mp:' + id });
      hud.floatText({ x: m.x, y: m.mesh.height * 0.85, z: m.z, text: `-${dmg}`, kind: 'dmg' });
      if (killed) guestKilled(id, m);
      return;
    }
    weedsT = 0; // 바뀐 풀 · 덤불 · 바닥 물건 · 모금은 다음 마을 모습으로 바로
    if (a.t === 'donate') {
      // 손님이 내 마을 모금함에 냈다: 남은 만큼까지만 받아 내 모금에 더하고(내 돈은 그대로), 받은 만큼을 그 손님에게 알린다(손님 돈은 손님 쪽에서 뺀다)
      if (!Object.hasOwn(WORKS, a.id)) return;
      const r = fundWork(state, a.id, Number(a.n));
      multi.direct(id, { t: 'donated', id: a.id, n: r.ok ? r.amount : 0, full: r.ok && r.full ? 1 : 0 });
      if (!r.ok) return;
      commit(r.state);
      sound.play('coin');
      const who = multi.nameOf(id) || '친구', chips = [{ icon: 'coin', text: `+${won(r.amount)}` }];
      if (r.full) hud.toast(`${josa(who, '이/가')} 보태서 ${josa(WORKS[a.id].name, '이/가')} 다 모였어요! 내일 아침에 생겨요`, 3600, { chips });
      else hud.toast(`${josa(who, '이/가')} ${WORKS[a.id].name}에 보탰어요`, 2600, { chips });
      panels.refresh('works');
      return;
    }
    if (a.t === 'take') {
      // 바닥 물건 줍기: 아직 있으면 달라는 만큼 건네준다(손님 가방에는 손님 쪽에서)
      const list = groundOf(state), e = list.find((o) => o.g === a.g);
      if (!e) return;
      const n = e.weapon ? 1 : Math.max(1, Math.min(e.n, Math.floor(a.n) || e.n)), clean = Math.min(e.clean || 0, n);
      const rest = n >= e.n ? list.filter((o) => o !== e) : list.map((o) => (o === e ? { ...o, n: o.n - n, clean: Math.max(0, (o.clean || 0) - clean) } : o));
      commit({ ...state, ground: rest });
      multi.direct(id, { t: 'got', id: e.id, n, clean, weapon: e.weapon ? 1 : 0 });
      return;
    }
    if (a.t === 'put') {
      // 손님이 버렸다: 내 마을 바닥에 떨어진다(꽉 찼으면 가장 오래된 것부터 치운다)
      const weapon = !!a.weapon;
      if ((weapon ? !Object.hasOwn(WEAPONS, a.id) : !okItem(a.id)) || !Number.isFinite(a.x) || !Number.isFinite(a.z)) return;
      const n = weapon ? 1 : Math.max(1, Math.min(MAX_STACK, Math.floor(a.n) || 1));
      let list = groundOf(state);
      if (list.length >= MAX_GROUND) list = list.slice(1);
      const g = list.reduce((mx, o) => Math.max(mx, o.g), 0) + 1;
      commit({ ...state, ground: [...list, { g, id: a.id, n, clean: weapon ? 0 : Math.max(0, Math.min(n, Math.floor(a.clean) || 0)), ...(weapon ? { weapon: true } : {}), x: a.x, z: a.z }] });
      return;
    }
    if (a.t === 'berry') {
      const b = Number.isInteger(a.i) ? berries.list[a.i] : null;
      if (b && b.ready) berries.pick(b);
      return;
    }
    const w = Number.isFinite(a.id) ? weeds.byId(a.id) : null;
    if (!w) return;
    const mine = w.busy === 'guest' && w.busyBy === id;
    if (a.t === 'grab') {
      if (!w.busy && !npcs.isWorkingOn(w)) { w.busy = 'guest'; w.busyBy = id; w.busyUntil = performance.now() + GUEST_HOLD_MS; }
    } else if (a.t === 'drop') {
      if (mine) { delete w.busy; delete w.busyBy; }
    } else if (a.t === 'weed') {
      if (mine) { delete w.busy; delete w.busyBy; }
      if (a.done === 'clean' || a.done === 'snapped') {
        // 내가 같은 풀을 뽑고 있었으면 친구가 먼저 뽑은 것으로
        if (pulling && pulling.weed === w) { cancelPull(); hud.floatText({ x: w.x, y: 1.15, z: w.z, text: `${josa(multi.nameOf(id) || '친구', '이/가')} 먼저 뽑았어요`, kind: 'tip' }); }
        weeds.remove(w, a.done);
      } else if (Number.isInteger(a.stage) && a.stage > w.stage && a.stage <= 4) {
        weeds.loosen(w, a.stage);
        w.flawed = !!a.flawed;
      }
    }
  }
  /** 주인: 손님이 뽑기 시작한 풀은 이만큼(ms) 그 손님 몫으로 둔다(그만뒀다는 말이 끊겨 안 와도 풀리게). */
  const GUEST_HOLD_MS = 8000;
  /** 주인: 그 손님이 잡아 둔 풀을 놓는다(손님이 돌아갔을 때). */
  function releaseHolds(id) {
    for (const w of weeds.list) if (w.busy === 'guest' && w.busyBy === id) { delete w.busy; delete w.busyBy; }
  }
  /** 주인: 손님에게 보낼 풀의 뽑는 중 표시(0 아무도 · 1 나나 마을 친구 · 손님 연결 id). 오래된 손님 몫은 여기서 풀어 준다. */
  function weedBusy(w) {
    if (w.busy === 'guest') {
      if (performance.now() < w.busyUntil) return w.busyBy;
      delete w.busy;
      delete w.busyBy;
    }
    return w.busy || npcs.isWorkingOn(w) ? 1 : 0;
  }

  // ---------- 같이 놀기: 같이 토벌 · 쓰러지면 깨워 주기 · 바닥 물건 나눠 줍기 · 주인 집 구경 ----------
  const r2 = (v) => Math.round(v * 100) / 100;
  /** 같이 놀기: 풀 뽑기 결과 글씨를 같은 마을 사람들 화면에도(열쇠 → [글씨, 모양]). */
  const FX_TEXT = { clean: ['깔끔!', 'clean'], snap: ['끊어졌다…', 'snap'], poison: ['윽, 독이 튀었다!', 'snap'], long: ['너무 오래 당겼다…', 'snap'] };
  function shareFx(k, x, z) {
    if (!multi.count || !(multi.status === 'open' || multi.status === 'visiting')) return;
    for (const p of multi.players) multi.direct(p.id, { t: 'fx', k, x: r2(x), z: r2(z) });
  }
  /** 받은 글씨: 내가 마을(바깥 포함)에 있고 가까우면 그 자리 위에 톡. */
  function showFx(a) {
    const f = Object.hasOwn(FX_TEXT, a.k) ? FX_TEXT[a.k] : null;
    if (!f || mode !== 'play' || !player || !Number.isFinite(a.x) || !Number.isFinite(a.z)) return;
    if (Math.hypot(a.x - player.position.x, a.z - player.position.z) < 24) hud.floatText({ x: a.x, y: 1.15, z: a.z, text: f[0], kind: f[1] });
  }
  /** 다른 사람이 보낸 물건 이름이 이 게임에 있는 물건인지(Object 의 속성 이름은 빼고). */
  const okItem = (id) => typeof id === 'string' && !(id in Object.prototype) && !!itemInfo(id);
  /** 손님 무기 한 번에 들어갈 수 있는 가장 큰 피해(랏코와 수련한 날 덤까지). 넘게 오면 깎는다. */
  const GUEST_HIT_MAX = Math.max(...Object.values(WEAPONS).map((W) => W.dmg)) + 3;
  /**
   * 주인: 몬스터가 노릴 수 있는 놀러 온 친구들(바깥에 있고 쓰러지지 않은 사람). 마을 안이면 safe.
   * 숲길 끝에서 걸어 들어오는 동안(아직 마을 안에 한 번도 안 들어온 손님)은 노리지 않는다: 들어오다 맞았다.
   */
  const arrivedGuests = new Set();
  const guestAllies = () => remotes.players().filter((p) => {
    if (Math.hypot(p.x, p.z) < VILLAGE_R - 1) arrivedGuests.add(p.id);
    return p.area === 'village' && p.anim !== 'faint' && arrivedGuests.has(p.id);
  }).map((p) => ({ kind: 'mp:' + p.id, x: p.x, z: p.z, player: true, safe: Math.hypot(p.x, p.z) < VILLAGE_R + 0.6 }));
  /** 주인: 마을 울타리 가까이 나가 있는 손님들의 자리(그 둘레 몬스터 모습을 보낸다). */
  const guestsAfield = () => remotes.players().filter((p) => p.area === 'village' && Math.hypot(p.x, p.z) > VILLAGE_R - 6);
  /** 주인: 몬스터가 놀러 온 친구를 맞혔다 → 그 친구에게 알린다(기운은 그 친구 쪽에서 준다). */
  function hitGuest(id, hit, m) {
    if (m) (m.hitGuests ||= new Set()).add(id); // 그 친구가 잡아도 '깔끔하게'가 아니다
    multi.direct(id, { t: 'hurt', dmg: Math.round(hit.dmg), x: r2(hit.x), z: r2(hit.z), sp: m ? m.species : '' });
  }
  /** 주인: 놀러 온 친구가 몬스터를 쓰러뜨렸다 → 전리품 · 점수는 그 친구 쪽에서. 구역 보스면 내 마을에서도 오늘은 끝. */
  function guestKilled(id, m) {
    multi.direct(id, { t: 'kill', sp: m.species, x: r2(m.x), z: r2(m.z), clean: m.hitGuests && m.hitGuests.has(id) ? 0 : 1 });
    if (m.bounty) { bountyM = null; commit(markBountyDown(state)); hud.toast(`${josa(m.M.name, '이/가')} 쓰러졌어요! 게시판에서 현상금을 받아요`, 3600, { icon: monsterSvg(m.species) }); } // 놀러 온 친구가 잡아도 우리 마을 현상금
    if (Math.hypot(m.x - player.position.x, m.z - player.position.z) < 16) sound.play('poof');
    if (BOSS_LAIRS[m.species]) {
      lairBossM[m.species] = null;
      monsters.clear((o) => o.summoned);
      commit(markBossDown(state, m.species, state.clock.day));
      cutBossMusic();
      hud.banner(`${josa(multi.nameOf(id) || '친구', '이/가')} ${josa(m.M.name, '을/를')} 쓰러뜨렸다!`, '내일 다시 나타나요', 3200);
    }
  }
  /** 나에게만 온 것: 'hurt' 몬스터에게 맞았다(손님) · 'kill' 내가 쓰러뜨렸다(손님) · 'got' 주운 물건(손님) · 'wake' 깨워 줬다. */
  function takeDirect(id, a) {
    if (!state || !a || typeof a !== 'object') return;
    if (a.t === 'wake') { wakeUp(multi.nameOf(id)); return; }
    if (a.t === 'fx') { showFx(a); return; } // 친구가 풀을 뽑았다(깔끔! · 끊어졌다…)
    // 같이 토벌 파티(주인 · 손님 누구끼리든)
    if (a.t === 'invite') { takeInvite(id); return; }
    if (a.t === 'party') {
      const name = multi.nameOf(id) || '친구';
      if (a.ok) joinParty(id, name); else hud.toast(`${josa(name, '은/는')} 지금은 같이 못 간대요`, 2400);
      return;
    }
    if (a.t === 'unparty') { leaveParty(id); return; }
    if (a.t === 'pkill') { mpPartyKill(id, a); return; }
    if (a.t === 'hp') { // 파티원의 기운(왼쪽 위 '같이 토벌' 막대)
      const p = mpParty.get(id);
      if (p && Number.isFinite(a.v) && Number.isFinite(a.m) && a.m > 0) { p.max = Math.min(999, a.m); p.hp = Math.max(0, Math.min(p.max, a.v)); updateVisitTag(); }
      return;
    }
    if (!visiting || visiting.arriving || id !== multi.hostId) return; // 아래는 놀러 간 마을 주인만 보낸다
    if (a.t === 'hurt') {
      const dmg = Math.max(1, Math.min(80, Math.round(a.dmg) || 1)), sp = Object.hasOwn(MONSTERS, a.sp) ? a.sp : null;
      const x = Number.isFinite(a.x) ? a.x : player.position.x, z = Number.isFinite(a.z) ? a.z : player.position.z;
      onMonsterHit({ species: sp, M: sp ? MONSTERS[sp] : { dmg }, x, z }, { dmg, x, z });
    } else if (a.t === 'kill' && Object.hasOwn(MONSTERS, a.sp)) {
      const M = MONSTERS[a.sp];
      onKill({ species: a.sp, M, x: Number.isFinite(a.x) ? a.x : player.position.x, z: Number.isFinite(a.z) ? a.z : player.position.z, hitPlayer: !a.clean, mesh: { height: M.height || 1 }, remote: true });
    } else if (a.t === 'got') takeGot(a);
    else if (a.t === 'star') takeStar(a); // 주인이 별똥별에 소원을 빌었다
    else if (a.t === 'donated') takeDonated(a); // 주인 마을 모금함에 낸 돈을 주인이 받았다
  }
  /**
   * 모금함 창에 보일 마을: 친구 마을에 놀러 간 동안은 주인 마을의 모금(모인 돈 · 공사 중 · 생김)과 시계로. 낼 돈은 내 돈 그대로.
   * 주인이 보낸 것은 모인 돈(worksPaid)과 마을 모습(works: 공사 중 · 생김)뿐이라, 생김은 어제 · 공사 중은 오늘 다 모인 것으로 맞춘다.
   */
  function worksPanelState() {
    if (!visiting || visiting.arriving) return state;
    const clock = visiting.clock || state.clock, works = {};
    for (const id of WORK_IDS) {
      const st = (visiting.works || {})[id], paid = (visiting.worksPaid || {})[id] || 0, full = Math.max(paid, WORKS[id].price);
      // 다 모였는데 주인의 '공사 중'이 아직 안 왔으면(방금 내가 채웠다) 공사 중으로
      works[id] = st === 'open' ? { paid: full, day: clock.day - 1 } : st === 'building' || paid >= WORKS[id].price ? { paid: full, day: clock.day } : { paid };
    }
    return { ...state, clock, works };
  }
  /** 손님: 주인 마을 모금함에 낸다. 주인이 받은 만큼을 알려 오면(takeDonated) 그때 내 돈에서 뺀다(다른 사람이 먼저 채웠거나 끊겼을 때 헛돈이 안 나가게). */
  function donateToHost(id, amount) {
    if (!visiting || visiting.arriving || !Object.hasOwn(WORKS, id)) return;
    const left = Math.max(0, WORKS[id].price - ((visiting.worksPaid || {})[id] || 0));
    const n = Math.min(Math.floor(amount), left);
    if (n <= 0 || state.money < n) return;
    multi.act({ t: 'donate', id, n });
  }
  /** 손님: 주인이 받은 돈 → 그만큼 내 돈에서 빼고, 창에도 바로 더해 둔다(주인의 다음 마을 모습이 곧 맞춰 준다). */
  function takeDonated(a) {
    if (!Object.hasOwn(WORKS, a.id)) return;
    const n = Math.max(0, Math.floor(Number(a.n)) || 0), host = multi.hostName || '친구', W = WORKS[a.id];
    if (!n) { hud.toast(`${host}네 ${W.name}은 벌써 다 모였대요`, 2400); panels.refresh('works'); return; }
    const pay = Math.min(n, state.money);
    commit({ ...state, money: state.money - pay });
    sound.play('coin');
    visiting.worksPaid = { ...(visiting.worksPaid || {}), [a.id]: Math.min(W.price, ((visiting.worksPaid || {})[a.id] || 0) + n) };
    if (a.full) visiting.works = { ...(visiting.works || {}), [a.id]: 'building' }; // 내가 다 채웠다: 주인의 다음 마을 모습을 기다리지 않고 공사 중 울타리를 바로
    const chips = [{ icon: 'coin', text: `−${won(pay)}` }];
    if (a.full) { player.cheerTime = 1.0; hud.toast(`${host}네 ${josa(W.name, '이/가')} 다 모였어요! 내일 아침에 생겨요`, 3600, { chips }); }
    else hud.toast(`${host}네 ${W.name}에 보탰어요`, 2200, { chips });
    panels.refresh('works');
  }

  // 쓰러지기: 같이 노는 친구가 있으면 기운이 다 떨어져도 바로 기절하지 않고 그 자리에 쓰러져 DOWN_WAIT 초 기다린다.
  // 친구가 다가와 깨워 주면 기운 WAKE_STAMINA 로 일어나고, 아무도 안 깨워 주거나 '그만 기다리기'를 누르면 원래처럼 기절한다
  const DOWN_WAIT = 30, WAKE_STAMINA = 30;
  let downed = null; // { t: 남은 초 }
  const canGoDown = () => !hunterExam && (visiting ? !visiting.leaving && !visiting.arriving : multi.status === 'open' && multi.count > 0);
  function goDown() {
    downed = { t: DOWN_WAIT };
    cancelPull();
    player.busy = true;
    player.act('faint', 9999);
    sound.play('faint');
    cutBossMusic();
    hud.toast('쓰러졌어요… 친구가 깨워 줄 때까지 기다려요', 3600);
  }
  /** 쓰러져 있는 동안 매 프레임: 남은 시간, 행동 버튼은 '그만 기다리기'. 같이 노는 친구가 다 떠나면 바로 기절. */
  function updateDown(dt) {
    if (!downed) return;
    downed.t -= dt;
    hud.setTimer(['쓰러짐', { text: '친구가 깨워 주길 기다리는 중', narrow: 'hide' }, { icon: ICO.clock, text: `${Math.max(0, Math.ceil(downed.t))}초` }]);
    hud.setAction('그만 기다리기');
    const company = visiting ? !visiting.leaving : multi.status === 'open' && multi.count > 0;
    if (downed.t <= 0 || !company) giveUpDown();
  }
  function clearDown() {
    if (!downed) return false;
    downed = null;
    player.busy = false;
    player.act(null, 0);
    hud.setTimer(null);
    return true;
  }
  /** 기다리지 않고 기절한다(놀러 가 있었으면 집으로 돌아가며 기절). */
  function giveUpDown() {
    if (!clearDown()) return;
    if (visiting) endVisit('faint'); else startFaint();
  }
  /** 친구가 깨워 줬다: 그 자리에서 기운이 조금 찬 채로 일어난다. */
  function wakeUp(byName) {
    if (!downed) return;
    clearDown();
    commit({ ...state, stamina: Math.max(state.stamina, WAKE_STAMINA) });
    iframe = 2;
    player.cheerTime = 1.2;
    sound.play('heart');
    hud.toast(`${josa(byName || '친구', '이/가')} 깨워 줬어요!`, 2600, { chips: [{ text: `기운 ${state.stamina}` }] });
  }
  /** 쓰러진 친구 깨우기(가까이 가서 누른다). */
  function wakeFriend(tg) {
    multi.direct(tg.id, { t: 'wake' });
    player.face(tg.x, tg.z);
    player.cheerTime = 0.8;
    sound.play('heart');
    hud.toast(`${josa(tg.name, '을/를')} 깨웠어요!`, 2200);
  }
  /** 주인: 내가 집 안에 있어도 바깥에서 토벌 중인 손님이 있으면 몬스터는 계속 움직인다(나는 노리지 않는다). */
  function guestMonsters(dt) {
    if (multi.status !== 'open' || !multi.count) return;
    const allies = guestAllies();
    if (allies.length) monsters.update(dt, t, { player: player.position, active: false, night: nightNow, onHit: onMonsterHit, allies, onAllyHit });
  }
  /** 가까운 다른 사람: 쓰러져 있으면 깨우기, 아니면 말 걸기(같이 토벌 파티) 대상(findTarget · findGuestTarget). */
  function playerOptions(p, options) {
    for (const o of remotes.visible()) {
      const dd = Math.hypot(o.x - p.x, o.z - p.z);
      if (o.anim === 'faint' && dd < 1.6) options.push({ d: -2, t: { type: 'wakeMp', id: o.id, name: o.name, x: o.x, z: o.z, label: `${o.name} 깨우기` } });
      else if (o.anim !== 'faint' && dd < 1.4) options.push({ d: dd - 0.1, t: { type: 'mpTalk', id: o.id, name: o.name, x: o.x, z: o.z, label: '말 걸기' } });
    }
  }

  // 같이 토벌 파티: 다른 사람에게 말 걸어 '같이 토벌하러 가자!' → 받아 주면 파티. 파티 중에 쓰러뜨린 몬스터는
  // 토벌 일감 · 퀘스트를 파티 모두가 같이 세고(토벌 점수는 나눠 갖는다), 전리품은 가방 대신 그 자리 바닥에 떨어진다(누구든 줍는다)
  const mpParty = new Map(); // 연결 id → { name, hp: 그 사람 기운(모르면 null), max }
  let hpSentT = 0, hpSent = null; // 파티원에게 내 기운을 마지막으로 보낸 뒤 흐른 초 · 보낸 값
  /** 내 기운을 파티원에게 알린다(바뀌면 0.3초마다, 그대로여도 5초마다 한 번). now: 바로 보낸다. */
  function sendPartyHp(dt, now = false) {
    if (!mpParty.size || !state) return;
    hpSentT += dt;
    const v = downed ? 0 : state.stamina;
    if (!now && (hpSentT < 0.3 || (v === hpSent && hpSentT < 5))) return;
    hpSentT = 0;
    hpSent = v;
    for (const id of mpParty.keys()) multi.direct(id, { t: 'hp', v, m: MAX_STAMINA });
  }
  const mpWho = (name) => ({ kind: 'me', name, tag: '#e3f4ec', ink: '#3f7a63' }); // 대화 상자 이름표(다른 사람)
  /** 다른 사람에게 말 걸기: 같이 토벌하러 가자 · 파티 그만하자 · 인사. */
  function talkToPlayer(tg) {
    const inParty = mpParty.has(tg.id);
    cancelPull();
    player.face(tg.x, tg.z);
    input.setEnabled(false);
    hud.setAction(null);
    guide.ask(`${tg.name}에게 뭐라고 할까?`, [inParty ? '파티 그만하자' : '같이 토벌하러 가자!', '안녕~!', '그만두기'], (i) => {
      input.setEnabled(true);
      if (i === 1) { multiPanel.say('안녕~!'); return; }
      if (i !== 0) return;
      if (inParty) { multi.direct(tg.id, { t: 'unparty' }); leaveParty(tg.id); return; }
      multi.direct(tg.id, { t: 'invite' });
      hud.toast(`${tg.name}에게 같이 토벌하자고 했어요`, 2400);
    }, meWho());
  }
  /** 같이 토벌하자는 말을 받았다: 바쁘면 다음에, 아니면 대답을 고른다. */
  function takeInvite(id) {
    const name = multi.nameOf(id) || '친구';
    if (mpParty.has(id)) { multi.direct(id, { t: 'party', ok: true }); return; }
    const busy = !state || mode !== 'play' || guide.open || panels.isOpen() || pulling || downed || sleeping || fainting || funBusy();
    if (busy) { multi.direct(id, { t: 'party', ok: false }); return; }
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    sound.play('job');
    guide.ask('같이 토벌하러 가자!', ['좋아!', '다음에 할래'], (i) => {
      input.setEnabled(true);
      const ok = i === 0 && multi.players.some((p) => p.id === id); // 그새 돌아갔으면 못 맺는다
      multi.direct(id, { t: 'party', ok });
      if (ok) joinParty(id, name);
    }, mpWho(name));
  }
  function joinParty(id, name) {
    mpParty.set(id, { name, hp: null, max: MAX_STAMINA });
    sendPartyHp(0, true); // 서로의 기운이 바로 보이게
    updateVisitTag();
    sound.play('job');
    hud.toast(`${josa(name, '과/와')} 파티를 맺었어요!`, 3200, { chips: [{ text: '토벌 일감은 같이 세요' }, { text: '전리품은 바닥에' }] });
  }
  /** 파티가 끝났다(그만하자고 했거나 · 상대가 돌아갔다). */
  function leaveParty(id) {
    const name = mpParty.get(id)?.name;
    if (!mpParty.delete(id)) return;
    updateVisitTag();
    hud.toast(`${josa(name || '친구', '과/와')} 파티가 끝났어요`, 2400);
  }
  function clearParty() { if (mpParty.size) { mpParty.clear(); updateVisitTag(); } }
  /** 파티의 다른 사람이 몬스터를 쓰러뜨렸다: 토벌 일감 · 퀘스트를 같이 세고, 토벌 점수는 나눠 갖는다(전리품은 바닥에 있다). */
  function mpPartyKill(id, a) {
    if (!state || !mpParty.has(id) || !Object.hasOwn(MONSTERS, a.sp)) return;
    const M = MONSTERS[a.sp], split = Math.max(1, Math.min(8, Math.floor(a.n) || 2));
    const x = Number.isFinite(a.x) ? a.x : player.position.x, z = Number.isFinite(a.z) ? a.z : player.position.z;
    let s = recordHunt(state, a.sp);
    s = addKill(s, 'me', a.sp, split);
    const before = s.job;
    const counted = s.job && JOB_TYPES[s.job.typeId].kind === a.sp && !isComplete(s.job);
    if (counted) s = { ...s, job: recordPull(s.job, a.sp, a.clean ? 'clean' : 'snapped') };
    commit(s);
    hud.floatText({ x, y: (M.height || 1) + 0.9, z, text: `같이 잡았다 +${killPoints(a.sp, split)}점`, kind: 'drop' });
    if (state.hunted[a.sp] === 1) hud.toast(`${M.name} 첫 토벌!`, 2600, { icon: monsterSvg(a.sp) });
    else if (counted && !isComplete(state.job)) hud.floatText({ x, y: (M.height || 1) + 1.3, z, text: `${state.job.count} / ${JOB_TYPES[state.job.typeId].target}`, kind: 'pick', icon: monsterSvg(a.sp) });
    celebrateIfDone(before, state.job);
    rankNews();
  }
  /** 파티 전리품: 가방 대신 그 자리 바닥에(놀러 가 있으면 주인 마을 바닥, 아니면 내 마을 바닥). */
  function dropToWorld(id, x, z) {
    const at = village.nearestFree(x, z, 0.2);
    if (visiting) multi.act({ t: 'put', id, n: 1, clean: 0, weapon: 0, x: r2(at.x), z: r2(at.z) });
    else commit(placeItem(state, id, 1, at.x, at.z));
    hud.floatText({ x: at.x, y: 0.9, z: at.z, text: '바닥에', kind: 'pick', icon: itemSvg(id) });
  }

  // 바닥 물건: 주인 마을 바닥(state.ground)을 같이 쓴다. 손님은 주울 때 주인에게 '줍기'를 보내고 주인이 건네준 만큼(got)만 가방에 넣는다(둘이 같이 주워도 하나만)
  /** 손님: 주인이 보낸 바닥 물건 [[g, id, n, clean, weapon, x, z]] → 바닥 물건 목록. 모르는 물건은 버린다. */
  const parseGround = (rows) => rows.slice(0, MAX_GROUND * 2)
    .filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && (r[4] ? Object.hasOwn(WEAPONS, r[1]) : okItem(r[1])) && Number.isFinite(r[2]) && r[2] > 0 && Number.isFinite(r[5]) && Number.isFinite(r[6]))
    .map(([g, id, n, clean, weapon, x, z]) => ({ g, id, n: Math.min(MAX_STACK, Math.floor(n)), clean: Math.max(0, Math.floor(clean) || 0), ...(weapon ? { weapon: true } : {}), x, z }));
  /** 손님: 친구 마을 바닥의 물건을 줍는다(주머니에 들어갈 만큼만 달라고 한다). */
  function takeRemoteGround(g) {
    const e = (visiting.ground || []).find((o) => o.g === g);
    if (!e || (visiting.taking && performance.now() < visiting.taking)) return;
    let n = e.n;
    if (!e.weapon) {
      const room = MAX_STACK - countOf(state, e.id);
      if (room <= 0) { hud.toast('주머니가 꽉 찼어요'); sound.play('none'); return; }
      n = Math.min(n, room);
    }
    visiting.taking = performance.now() + 1500; // 주인 대답이 오기 전에 또 누르지 않게
    multi.act({ t: 'take', g, n });
    player.face(e.x, e.z);
  }
  /** 손님: 주인이 건네준 물건을 가방에 넣는다(다 안 들어가면 남은 것은 다시 바닥에). */
  function takeGot(a) {
    const weapon = !!a.weapon;
    if (weapon ? !Object.hasOwn(WEAPONS, a.id) : !okItem(a.id)) return;
    visiting.taking = 0;
    const n = weapon ? 1 : Math.max(1, Math.min(MAX_STACK, Math.floor(a.n) || 1));
    const e = { g: 1, id: a.id, n, clean: Math.max(0, Math.min(n, Math.floor(a.clean) || 0)), x: player.position.x, z: player.position.z, ...(weapon ? { weapon: true } : {}) };
    const r = pickUp({ ...state, ground: [e] }, 1);
    if (!r.ok) { hud.toast('주머니가 꽉 찼어요'); multi.act({ t: 'put', id: e.id, n: e.n, clean: e.clean, weapon: weapon ? 1 : 0, x: r2(e.x), z: r2(e.z) }); return; }
    commit({ ...r.state, ground: groundOf(state) });
    if (r.left > 0) multi.act({ t: 'put', id: e.id, n: r.left, clean: 0, weapon: 0, x: r2(e.x), z: r2(e.z) });
    sound.play('clean');
    hud.bagBump();
    const icon = weapon ? weaponSvg(e.id) : itemSvg(e.id);
    if (r.refund) hud.toast('이미 있는 무기예요', 2200, { icon, chips: [{ icon: 'coin', text: `+${won(r.refund)}` }] });
    else hud.toast(`${groundName(e)}${r.n > 1 ? ` ${r.n}개` : ''} 주웠어요`, 1800, { icon });
  }
  /** 손님: 친구 마을에서 버리면 주인 마을 바닥에 떨어진다(주인이나 다른 손님이 주울 수 있다). */
  function dropToHost(sel, n) {
    const at = dropSpot(visiting.ground || []);
    const tmp = { ...state, ground: [] };
    const r = sel.type === 'weapon' ? dropWeapon(tmp, sel.id, at.x, at.z) : dropToGround(tmp, sel.id, n, at.x, at.z);
    if (!r.ok) { hud.toast('버릴 수 없어요'); return; }
    const e = r.state.ground[0];
    commit({ ...r.state, ground: groundOf(state) });
    multi.act({ t: 'put', id: e.id, n: e.n, clean: e.clean || 0, weapon: e.weapon ? 1 : 0, x: r2(e.x), z: r2(e.z) });
    sound.play('drop');
    const name = sel.type === 'weapon' ? WEAPONS[sel.id].name : itemInfo(sel.id).name;
    hud.toast(`${name}${r.n > 1 ? ` ${r.n}개` : ''} 버렸어요`, 1800, { icon: sel.type === 'weapon' ? weaponSvg(sel.id) : itemSvg(sel.id) });
  }

  // 주인 집 구경: 주인이 보낸 가구 배치로 집 안을 그린다(꾸미기 · 침대 · 옷장은 주인만, 손님은 둘러보고 나가기만)
  /**
   * 손님: 주인이 보낸 가구 [[id, cx, cz, rot]] 와 집 모습 look [크기, 벽지, 바닥] → { size, wall, floor, placed }.
   * 모르는 가구 · 그 크기 방의 칸 밖 · 모르는 벽지 · 바닥은 버린다.
   */
  const parseHouse = (rows, look) => {
    const L = Array.isArray(look) ? look : [], size = Number.isInteger(L[0]) && HOME_SIZES[L[0]] ? L[0] : 0, G = HOME_SIZES[size];
    return {
      size,
      wall: typeof L[1] === 'string' && Object.hasOwn(WALLPAPERS, L[1]) ? L[1] : undefined,
      floor: typeof L[2] === 'string' && Object.hasOwn(FLOORS, L[2]) ? L[2] : undefined,
      placed: rows.slice(0, G.cols * G.rows * 2)
        .filter((r) => Array.isArray(r) && Object.hasOwn(FURNITURE, r[0]) && Number.isInteger(r[1]) && Number.isInteger(r[2]) && r[1] >= 0 && r[2] >= 0 && r[1] < G.cols && r[2] < G.rows)
        .map(([id, cx, cz, rot]) => ({ id, cx, cz, rot: [0, 1, 2, 3].includes(rot) ? rot : 0 }))
    };
  };
  function enterHostHome() {
    if (!visiting || !visiting.house) { hud.toast('아직 집 안을 볼 수 없어요', 2000); return; }
    cancelPull();
    mode = 'guesthome';
    setCinematic(true);
    document.body.classList.add('in-home');
    hud.setAction(null);
    interior.setHome(visiting.house);
    interior.setPlayer(myLook());
    interior.stepAside(visiting.house, homeRemotes.players().filter((p) => p.area === 'home')); // 먼저 와 있는 사람과 겹치지 않게 옆에 선다
    sound.play('job');
    hud.toast(`${multi.hostName || '친구'}네 집에 들어왔어요`, 2400);
  }
  /** 친구 집에서 나온다(현관 앞). quiet: 놀러 간 것이 끝나 집으로 돌아갈 때(자리는 dropVisit 이 정한다). */
  function exitHostHome(quiet = false) {
    if (mode !== 'guesthome') return;
    mode = 'play';
    setCinematic(false);
    document.body.classList.remove('in-home');
    interior.setCue(null);
    homeTarget = null;
    if (quiet) return;
    const s = village.spots.home;
    player.setPosition(s.x, s.z);
    player.face(s.x + 1, s.z + 0.4);
    cam.snap(player.position);
  }
  /**
   * 같이 놀기 매 프레임(모든 장면): 내 움직임을 보내고(마을 울타리 안에서 돌아다닐 때만 'village'),
   * 주인이면 손님이 있을 때 내 마을 모습을 보낸다(시간 · 마을 친구들은 0.2초마다, 풀은 1초마다).
   */
  function netTick(dt) {
    if (visiting && (visiting.arriving || visiting.leaving)) return; // 커튼 연출 중에는 보내지 않는다(숲길 끝에서 기다리는 모습 그대로)
    // 주인 집 안(주인이 내 집에 있거나, 손님이 친구 집에 놀러 갔으면): 집 안 자리로 'home'. 그 밖에는 바깥이면 'village'
    // 놀러 간 친구는 숲길 끝에서 걸어 들어오는 모습부터 보인다(바깥에서 같이 토벌할 수 있어서 울타리 밖도 'village')
    if ((mode === 'home' && !visiting) || mode === 'guesthome') {
      const q = interior.playerPos;
      multi.tick(dt, { x: r2(q.x), z: r2(q.z), yaw: r2(interior.playerYaw), anim: interior.playerMoving ? 'walk' : 'idle', area: 'home' });
    } else {
      const p = player.position, outside = visiting ? mode === 'play' || mode === 'intro' : mode === 'play';
      multi.tick(dt, { x: r2(p.x), z: r2(p.z), yaw: r2(player.yaw), anim: player.anim || 'idle', area: outside ? 'village' : 'away', h: player.heldTags }); // h: 손에 든 무기 · 등불 · 음식
    }
    sendPartyHp(dt); // 같이 토벌 파티원에게 내 기운
    if (multi.status !== 'open' || !multi.count) return;
    worldT -= dt;
    weedsT -= dt;
    if (worldT > 0) return;
    // 바깥에 나간 손님이 있으면 몬스터 · 탄을 0.1초마다(같이 토벌), 아니면 0.2초마다
    const afield = guestsAfield();
    worldT = afield.length ? 0.1 : 0.2;
    const w = { c: [state.clock.day, +state.clock.t.toFixed(5)], d: state.startDate, n: npcs.snapshot(), m: afield.length ? monsters.snapshot(afield) : [] };
    if (afield.length) { const fx = monsters.fxSnapshot(afield); w.s = fx.shots; w.r = fx.rain; }
    const now = performance.now();
    while (hostNews.length && hostNews[0].until < now) hostNews.shift();
    if (hostNews.length) w.e = hostNews.map((e) => [e.id, e.text, e.kind || '']); // 마을 소식(몇 초 동안 거듭 실어서 빠진 것 없이)
    if (hostSleep && hostSleep.until > now) w.z = [hostSleep.id, hostSleep.day, +hostSleep.t.toFixed(5), hostSleep.phase]; // 내가 잠들었다(손님도 같은 잠 연출)
    if (weedsT <= 0) {
      weedsT = 1;
      w.w = weeds.snapshot(weedBusy);
      w.b = berries.snapshot();
      w.g = groundOf(state).map((e) => [e.g, e.id, e.n, e.clean || 0, e.weapon ? 1 : 0, r2(e.x), r2(e.z)]); // 바닥 물건(손님도 주울 수 있다)
      w.h = homeOf(state).placed.map((q) => [q.id, q.cx, q.cz, q.rot || 0]); // 내 집 가구(손님이 구경한다)
      const dc = decorOf(homeOf(state));
      w.hl = [sizeOf(homeOf(state)), dc.wall, dc.floor]; // 내 집 크기 · 벽지 · 바닥
      w.k = packWorks(worksView(state)); // 마을 가꾸기 시설(손님 화면에도 보인다)
      w.kp = WORK_IDS.map((id) => [id, workOf(state, id).paid]).filter((r) => r[1] > 0); // 시설마다 모인 돈(손님 모금함 창에 내 마을 금액으로)
    }
    multi.sendWorld(w);
  }
  /** 같이 놀기(주인): 놀러 온 친구에게도 알릴 마을 소식(광장 공연 같은 일). 4초 동안 마을 모습에 실어 보낸다. */
  const hostNews = [];
  let hostNewsId = 0;
  function shareNews(text, kind = '') {
    if (multi.status !== 'open' || !multi.count) return;
    hostNews.push({ id: ++hostNewsId, text, kind, until: performance.now() + 4000 });
  }
  /** 같이 놀기(주인): 내가 잠들면 놀러 온 친구 화면에도 같은 잠 연출(깨는 시각 clock · 그때 하늘 phase). 4초 동안 마을 모습에 실어 보낸다. */
  let hostSleep = null;
  function shareSleep(clock, phase) {
    if (multi.status !== 'open' || !multi.count) return;
    hostSleep = { id: Date.now(), day: clock.day, t: clock.t, phase, until: performance.now() + 4000 };
  }
  /**
   * 손님: 친구 마을에서 돌아다니며 풀을 뽑고 열매를 따고(내 가방으로) 가게에서 내 돈으로 산다. 마을 밖에서는 같이 토벌한다.
   * 내 시간 · 퀘스트 이야기는 멈춘다.
   */
  function guestTick(dt) {
    const shown = viewState(); // 시계 · 날짜는 주인 마을 것
    panels.tick(shown);
    player.update(dt, input);
    updateCombat(dt); // 휘두르기 · 맞은 뒤 잠깐 무적
    if (pulling) updatePull(dt);
    if (fishing) updateFish(dt);
    updateCatchFx(dt);
    target = pulling || fishing || panels.isOpen() || guide.open || sleeping || sticker || funBusy() || downed ? null : findGuestTarget();
    const p = player.position, swingable = !target && !downed && weaponNow() && monsters.nearest(p.x, p.z, 6);
    hud.setAction(pulling ? '뽑는 중' : fishing ? fishLabel() : target ? target.label : swingable ? '휘두르기' : null);
    updateExamPill(); // 친구 마을 검정소에서 본 제초 승급 시험도 그 마을 풀로 이어 간다
    // 할 일 쪽지(○급 시험을 보자!)도 여기서 걷는다: 내 마을 갱신은 놀러 간 동안 멈춰 있어서, 친구 마을에서 시험을 시작해도 쪽지가 남았다
    updateExamGoal();
    if (grade5Shown && !grade5Due()) { grade5Shown = false; guide.setGoal(null); }
    updateDown(dt);
    hud.render(shown);
    const lightMode = lightOf(state);
    hud.setLight(hasTool(state, 'lantern') || hasTool(state, 'flashlight') ? lightMode : null);
    player.setHeld(lightMode === 'off' ? null : lightMode);
    lights.update(lightMode, player.position, player.yaw, nightNow);
    // 별똥별 밤은 주인 마을 시계로(소원은 내 마을에서 빈다)
    const vc = shown.clock, starNight = isStarfallNight(vc.day) && isStarHour(hourOf(vc));
    streaks.setActive(starNight && !panels.isOpen());
    if (starNight && starNotice !== 'v' + vc.day && !guide.open) {
      starNotice = 'v' + vc.day;
      hud.toast('별똥별이 쏟아지는 밤이에요', 3600, { chips: [{ text: `${multi.hostName || '친구'}의 마을 하늘` }] });
    }
  }

  // ---------- 창 ----------
  let appNudge = null; // 새로 생긴 마을폰 앱(지도를 막 샀으면 'map'): 그 앱을 열 때까지 마을폰 버튼 · 앱 아이콘이 빛난다
  const panels = createPanels(ui, {
    getState: () => state,
    // 모금함 창: 친구 마을에 놀러 간 동안은 그 마을 모금(worksPanelState)과 주인 이름
    worksState: () => worksPanelState(),
    worksHost: () => (visiting && !visiting.arriving ? multi.hostName || '친구' : null),
    appNudge: () => appNudge,
    appSeen: (kind) => { if (kind === appNudge) appNudge = null; },
    // 사이드스토리 '검은 별똥별': 없애는 법을 찾을 차례에만 마을폰 '검색' 앱 · 산소 표백제를 가져갈 차례에만 도구점에서 판다
    searchApp: () => { const st = state && stepOf(state, 'blackStar'); return !!st && st.type === 'search' && loopGate(state, st); },
    searchFound: () => {
      const st = stepOf(state, 'blackStar');
      if (!st || st.type !== 'search') return;
      panels.close();
      const lines = [...st.say];
      lines.speaker = 'chiikawa';
      finishQuestStep('blackStar', null, lines);
    },
    // 현상금 몬스터(core/bounty.js): 게시판 전단 · 현상금 받기
    bounty: () => (state && !visiting ? bountyNow(state) : null),
    claimBounty: () => {
      const r = claimBounty(state);
      if (!r.ok) return;
      commit(r.state);
      sound.play('coin');
      player.cheerTime = 1.0;
      hud.toast('현상금을 받았어요!', 3200, { chips: [{ icon: 'coin', text: won(r.reward) }] });
    },
    // 낚시 도감(core/fishing.js): 잡아 본 물고기 가짓수 보상 받기
    claimFishDex: (n) => {
      const r = claimDex(state, n);
      if (!r.ok) return;
      commit(r.state);
      sound.play('coin');
      player.cheerTime = 1.0;
      hud.toast(`낚시 도감 ${n}종 보상!`, 3200, { chips: [{ icon: 'coin', text: won(r.money) }] });
    },
    // 마을 가꾸기(core/works.js): 모금함에 낸다. 다 모이면 그 자리에 '공사 중' 간판이 서고 다음 날 아침에 생긴다
    donateWork: (id, amount) => {
      if (visiting) { donateToHost(id, amount); return; } // 친구 마을 모금함: 그 마을 모금으로(내 돈은 주인이 받은 만큼 나중에 뺀다)
      const r = donate(state, id, amount);
      if (!r.ok) return;
      commit(r.state);
      sound.play('coin');
      const paid = [{ icon: 'coin', text: `−${won(r.amount)}` }];
      if (r.full) { player.cheerTime = 1.0; hud.toast(`${josa(WORKS[id].name, '이/가')} 다 모였어요! 내일 아침에 생겨요`, 3600, { chips: paid }); }
      else hud.toast(`${WORKS[id].name}에 보탰어요`, 2200, { chips: paid });
    },
    // 사이드스토리 '수상한 섬 합숙': 친구 다섯과 친해지면 게시판에 '보수 100배' 전단지가 붙는다. 떼면 친구들이 모여들어 보고 이야기 시작
    boardStory: () => (state ? boardStory(state) : null),
    takeFlyer: () => {
      const id = boardStory(state);
      if (!id) return;
      const Q = QUESTS[id], p = player.position;
      panels.close();
      input.setEnabled(false);
      hud.setAction(null);
      const kinds = [...new Set(Q.offer.filter((l) => typeof l !== 'string' && l.who).map((l) => l.who))];
      const SIDE = [[1.2, -0.1], [-1.2, -0.1], [2.2, 0.1], [-2.2, 0.1], [3.1, 0.3], [-3.1, 0.3]]; // 내 양옆으로 한 줄(카메라 앞을 가리지 않게)
      kinds.forEach((k, i) => {
        const m = npcs.byKind(k);
        if (!m || m.away || npcs.busy(m) || staged.has(k) || Math.hypot(m.x - p.x, m.z - p.z) > 18 || !SIDE[i]) return;
        const at = village.nearestFree(p.x + SIDE[i][0], p.z + SIDE[i][1], 0.4);
        npcs.plan(m, [{ do: 'walk', x: at.x, z: at.z, run: true }, { do: 'act', anim: 'shy', time: 8, face: { x: p.x, z: p.z } }]);
      });
      guide.say(Q.offer.map(fillName), () => {
        if (mode === 'play') input.setEnabled(true);
        commit(startQuest(state, id));
        sound.play('job');
        hud.announce({ kicker: '사이드스토리 시작!', title: Q.title, sub: shortGoal(state, id).goal, to: 'quest', id });
      }, NARRATOR);
    },
    bleachShop: () => { const st = state && stepOf(state, 'blackStar'); return st && st.type === 'bring' && st.items.bleach ? { price: BLEACH_PRICE, have: countOf(state, 'bleach') > 0 } : null; },
    buyBleach: () => {
      const paid = trySpend(state, BLEACH_PRICE);
      if (!paid.ok) { hud.toast('돈이 모자라요', 2400); return; }
      const r = addItem(paid.state, 'bleach', 1);
      if (!r.added) { hud.toast('가방이 꽉 찼어요', 2400); return; }
      commit(r.state);
      sound.play('coin');
      hud.toast('산소 표백제를 샀어요', 2400, { chips: [{ icon: itemSvg('bleach'), text: '산소 표백제' }] });
    },
    /** 폰 상태 줄 { time, date }: 친구 마을에 놀러 간 동안은 그 마을 시계(아니면 null 이라 내 시계). */
    phoneNow: () => (visiting && visiting.clock ? { time: timeLabel(visiting.clock), date: dateLabel(visiting.startDate || state.startDate, visiting.clock.day) } : null),
    multi: multiPanel,
    /** 친구 마을에 놀러 가 있는지(가게에서 알바 · 건배처럼 내 마을에서만 하는 일을 숨긴다). */
    visiting: () => !!visiting,
    villageLive: () => villageLive(),
    getSound: () => sound.prefs,
    toast: (text) => hud.toast(text),
    // 테스트 도구(마을폰 숨은 앱)
    /** 테스트 앱의 그래픽 진단: 그래픽 카드 · 버퍼 · 화면 크기와 가장 가까운 몬스터의 그리기 상태(복사해서 알려 줄 수 있게). */
    diag() {
      const gl = gfx.renderer.getContext(), attrs = gl.getContextAttributes() || {}, ext = gl.getExtension('WEBGL_debug_renderer_info');
      const cv = gfx.renderer.domElement, p = player ? player.position : { x: 0, z: 0 };
      return [
        `gpu: ${ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)}`,
        `webgl2=${typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext} stencil=${gl.getParameter(gl.STENCIL_BITS)} depth=${gl.getParameter(gl.DEPTH_BITS)} aa=${!!attrs.antialias} samples=${gl.getParameter(gl.SAMPLES)}`,
        `dpr=${window.devicePixelRatio} buf=${cv.width}x${cv.height} css=${cv.clientWidth}x${cv.clientHeight}`,
        `me=${p.x.toFixed(1)},${p.z.toFixed(1)} night=${nightNow.toFixed(2)} light=${lightOf(state)}`,
        `mon: ${monsters.debugNearest(p.x, p.z)}`
      ].join('\n');
    },
    dev: {
      money(n) { commit(addMoney(state, n)); sound.play('coin'); hud.toast(`테스트: ${won(n)}을 넣었어요`); },
      stamina() { commit({ ...state, stamina: MAX_STAMINA }); },
      grade(up) { const g = Math.min(NOVICE, Math.max(1, state.license.grade - up)); commit({ ...state, license: { grade: g, xp: 0, day: state.clock.day, look: myLook() }, exam: null }); hud.toast(`제초 검정 ${gradeName(g)}`); },
      hour(h) { commit({ ...state, clock: { day: state.clock.day, t: (((h - 6) % 24) + 24) % 24 / 24 } }); },
      license(id, on) { commit(on ? grant(state, id, state.clock.day, myLook()) : revoke(state, id)); hud.toast(`테스트: ${LICENSES[id].name} ${on ? '땄어요' : '없앴어요'}`); },
      /** 별똥별맨 미리 보기: 밤 · 별똥별 밤을 기다리지 않고 바로(하늘만 잠깐 밤으로, 소원은 안 이뤄진다). */
      starfall() { startWish(true); },
      /** 사이드스토리 '우사기의 집' 바로: 목격 · 부탁을 건너뛰고 밤 9시 광장에서 둘과 만나는 데부터. */
      usagiHome() {
        const qs = { ...(state.quests || {}) };
        delete qs.usagiHome;
        const s = startQuest({ ...state, quests: qs, story: { ...(state.story || {}), usagiSeen: state.clock.day - 1 } }, 'usagiHome');
        commit({ ...s, clock: { day: state.clock.day, t: (21 - 6) / 24 } });
        player.setPosition(village.spots.plaza.x + 1, village.spots.plaza.z + 1.5);
        cam.snap(player.position);
      },
      /** 피자호빵 소식 바로(라멘 로우 새 메뉴 · 우사기에게 이야기 표시). */
      pizzaNews() { commit({ ...state, story: { ...(state.story || {}), pizzaNews: state.clock.day } }); hud.toast('테스트: 라멘 로우에 피자호빵이 나왔어요', 2600); },
      /** 시사의 슈퍼 알바이터: 저녁 공부(퀴즈)부터 · 시험 날(검정소 앞, 시사가 따라온다)부터. */
      shisaStudy() {
        const qs = { ...(state.quests || {}), noodles: { step: 1, base: 0, done: Math.max(1, state.clock.day - 1) } };
        delete qs.shisaArbeiter;
        const s = startQuest({ ...state, quests: qs }, 'shisaArbeiter');
        commit({ ...s, clock: { day: state.clock.day, t: (18 - 6) / 24 } });
        const r = village.spots.ramen;
        player.setPosition(r.x, r.z + 2);
        cam.snap(player.position);
      },
      shisaExam() {
        const qs = { ...(state.quests || {}), noodles: { step: 1, base: 0, done: Math.max(1, state.clock.day - 1) }, shisaArbeiter: { step: 1, base: 0 } };
        commit({ ...state, quests: qs, questTrack: 'shisaArbeiter', clock: { day: state.clock.day, t: (10 - 6) / 24 } });
        const e = village.spots.exam;
        player.setPosition(e.x, e.z + 6);
        cam.snap(player.position);
        const n = npcs.byKind('shisa');
        if (n) startBuddy(n);
      },
      /** 하치와레가 구덩이에!: 4급 · 하트 2 · 낮 12시, 덩굴풀 3개를 들고 숲 구덩이 앞으로(가까이 가면 "살려줘~"). */
      hachiPit() {
        const qs = { ...(state.quests || {}) };
        delete qs.hachiPit;
        const f = friendOf(state, 'hachiware');
        let s = { ...state, quests: qs, license: { ...state.license, grade: Math.min(state.license.grade, 4) }, clock: { day: Math.max(4, state.clock.day), t: (12 - 6) / 24 },
          friends: { ...(state.friends || {}), hachiware: { ...f, pts: Math.max(f.pts || 0, ptsForHearts(2)) } } };
        s = addItem(s, 'vine', 3).state;
        commit(s);
        player.setPosition(pit.front.x, pit.front.z + 6);
        cam.snap(player.position);
      },
      /** 잠옷 밤나들이: 귀 달린 잠옷을 받은 상태로 밤 9시 내 집 앞(가까이 가면 둘이 달려온다). */
      pajama() {
        const qs = { ...(state.quests || {}) };
        delete qs.pajamaNight;
        const w = wardrobeOf(state);
        const s = startQuest({ ...state, quests: qs, wardrobe: { owned: w.owned.includes('pajama') ? w.owned : [...w.owned, 'pajama'], wear: 'pajama' } }, 'pajamaNight');
        commit({ ...s, clock: { day: Math.max(6, state.clock.day), t: (21 - 6) / 24 } });
        refreshLook();
        const h = village.spots.home;
        player.setPosition(h.x + 4, h.z + 3);
        cam.snap(player.position);
      },
      /** 파자마 파티즈: show 면 무대만 바로(보상 없음), 아니면 잠옷 밤나들이를 끝낸 것으로 하고 부탁을 받은 채 밤 8시 광장 앞(걸어 들어가면 시작 · 보상까지). */
      pajamaParty(show) {
        if (idolStory.active) return;
        if (show) { idolStory.play(() => hud.toast('테스트: 공연 끝', 2400)); return; }
        const qs = { ...(state.quests || {}) };
        delete qs.pajamaParty;
        if (!isDone(state, 'pajamaNight')) qs.pajamaNight = { step: QUESTS.pajamaNight.steps.length, base: 0, done: Math.max(1, state.clock.day - 3) };
        commit({ ...startQuest({ ...state, quests: qs }, 'pajamaParty'), clock: { day: Math.max(8, state.clock.day), t: (20 - 6) / 24 } });
        player.setPosition(0, 7.5);
        cam.snap(player.position);
      },
      /** 우사기 클럽 춤만 바로(보상 없음). */
      club() { if (!usagiClub.active) usagiClub.play({ id: null, again: true, done: () => hud.toast('테스트: 클럽 끝', 2400) }); },
      /** 수상한 섬 합숙: from 이 없으면 부탁을 받은 다음 날 아침 선착장 앞(보상까지), 있으면 그 장면부터 바로(보상 없음). */
      island(from) {
        if (islandTrip.active) return;
        if (from) { islandTrip.play({ from, done: () => hud.toast('테스트: 섬 끝', 2400) }); return; }
        const qs = { ...(state.quests || {}) };
        delete qs.islandCamp;
        commit({ ...startQuest({ ...state, quests: qs }, 'islandCamp'), clock: { day: Math.max(8, state.clock.day), t: (8 - 6) / 24 } });
        player.setPosition(pier.spot.x - 3, pier.spot.z - 5);
        cam.snap(player.position);
      },
      /** 별 세 개: show 면 가게 안 장면만 바로(보상 없음), 아니면 부탁을 받은 채 저녁 7시 가게 앞(걸어 들어가면 시작 · 보상까지). */
      starDiner(show) {
        if (starDiner.active) return;
        if (show) { starDiner.play(() => hud.toast('테스트: 레스토랑 끝', 2400)); return; }
        const qs = { ...(state.quests || {}) };
        delete qs.starDiner;
        commit({ ...startQuest({ ...state, quests: qs }, 'starDiner'), clock: { day: Math.max(5, state.clock.day), t: (19 - 6) / 24 } });
        player.setPosition(dinerFront.spot.x, dinerFront.spot.z + 4);
        cam.snap(player.position);
      },
      /**
       * 검은 별똥별: 부탁을 받은 채 그 단계 앞으로(시각 · 장소 · 되풀이 상태까지 맞춰서, 걸어 들어가면 시작 · 보상까지).
       * at: 'wish' 들판 별밤 · 'dejavu' 되돌아온 같은 아침 · 'watch' 밤 12시 전 · 'soak' 표백제 담그기 · 'rain' 비 오는 다음 날 아침.
       */
      blackStar(at) {
        if (blackStar.active) return;
        const step = { wish: 0, dejavu: 2, watch: 3, soak: 7, rain: 8 }[at], hour = { wish: 21, dejavu: 8, watch: 22.5, soak: 21, rain: 8 }[at];
        const qs = { ...(state.quests || {}) };
        delete qs.blackStar;
        let s = startQuest({ ...state, quests: qs }, 'blackStar');
        const day = Math.max(9, s.clock.day), story = { ...(s.story || {}) };
        delete story.blackLoop;
        delete story.blackFree;
        if (at === 'dejavu' || at === 'watch' || at === 'soak') story.blackLoop = { day, n: 1, mark: 0 }; // 한 번 되돌아온 같은 날
        if (at === 'rain') story.blackFree = day - 1; // 어젯밤에 쫓아냈다
        s = { ...s, story, quests: { ...s.quests, blackStar: { ...s.quests.blackStar, step } }, clock: { day, t: (hour - 6) / 24 } };
        commit(s);
        const p = at === 'wish' ? STAR_FIELD : homeDoor('chiikawa');
        player.setPosition(p.x + 3, p.z + 3);
        cam.snap(player.position);
      },
      /** 위스키 봉봉: show 면 숲속 빈터 장면만 바로(보상 없음), 아니면 부탁을 받은 채 오전 11시 숲길 옆 덩굴 앞(걸어 들어가면 시작 · 보상까지). */
      whiskeyBonbon(show) {
        if (bonbonStory.active) return;
        if (show) { bonbonStory.play(() => hud.toast('테스트: 위스키 봉봉 끝', 2400)); return; }
        const qs = { ...(state.quests || {}) };
        delete qs.whiskeyBonbon;
        commit({ ...startQuest({ ...state, quests: qs }, 'whiskeyBonbon'), clock: { day: Math.max(10, state.clock.day), t: (11 - 6) / 24 } });
        player.setPosition(bonbonFront.spot.x + 3, bonbonFront.spot.z + 3);
        cam.snap(player.position);
      },
      /**
       * 스위치: 'open' 부탁을 받은 채 오전 10시 바위산 동굴 앞(걸어 들어가면 시작), 'teeth' 풍뎅이와 다닌 셋째 날 오전 10시 우사기 옆(말을 걸면 이빨),
       * 'finale' 갑옷 씨와 상담한 뒤 동굴 앞(걸어 들어가면 마지막 장면 · 보상까지), 'show' · 'showEnd' 처음 · 마지막 장면만(보상 없음).
       */
      beetleSwitch: (at) => devBeetleSwitch(at),
      /**
       * 하치와레의 카메라: 'plaza' 부탁을 받은 채 오전 11시 광장 남쪽(걸어 들어가면 시작 · 보상까지),
       * 'prints' 사진을 찍은 다음 날 오전 10시 하치와레 옆(말을 걸면 뽑은 사진 · 보상), 'show' 광장 장면만(보상 없음).
       */
      hachiCamera(at) {
        if (cameraStory.active) return;
        const pl = village.spots.plaza;
        if (at === 'show') { cameraStory.play(() => hud.toast('테스트: 사진 찍기 끝', 2400)); return; }
        const qs = { ...(state.quests || {}) };
        delete qs.hachiCamera;
        let s = startQuest({ ...state, quests: qs }, 'hachiCamera');
        const day = s.clock.day;
        s = at === 'prints' ? { ...s, quests: { ...s.quests, hachiCamera: { step: 1, base: 0, at: day - 1 } }, clock: { day, t: (10 - 6) / 24 } } : { ...s, clock: { day, t: (11 - 6) / 24 } };
        commit(s);
        const h = npcs.byKind('hachiware');
        if (at === 'prints' && h) { npcs.comeOut(h, pl.x + 1.2, pl.z); player.setPosition(pl.x + 1.2, pl.z + 2); }
        else player.setPosition(pl.x, pl.z + 8);
        cam.snap(player.position);
      }
    },
    toggleSound: (kind) => sound.toggle(kind),
    getPowerSave: () => perf.powerSave,
    togglePowerSave: () => perf.setPowerSave(!perf.powerSave),
    // 저장 옮기기(마을폰 설정 · core/savecode.js): 지금 진행 → 저장 코드, 코드 → 진행(검사), 확인하면 그 진행으로 바꾸고 새로 시작
    exportSave: () => (state && player ? encodeSave({ ...state, player: { x: player.position.x, z: player.position.z } }) : Promise.reject(new Error('no game'))),
    readSave: (code) => decodeSave(code),
    importSave(next) {
      saveLocked = true;
      if (!store.save(next)) { saveLocked = false; return false; } // 이 브라우저는 저장이 꺼져 있다
      setTimeout(() => location.reload(), 400);
      return true;
    },
    onOpen: () => { cancelPull(); input.setEnabled(false); hud.setAction(null); },
    onClose: () => { if (giftFor) { giftFor = null; endTalk(); return; } input.setEnabled(true); }, // 선물 고르다 닫으면 대화도 끝
    acceptJob(typeId) {
      // 게시판 일감은 하루에 정해진 수만큼: 친구들이 먼저 받아 가면 마감
      const r = takeFromBoard(state, typeId, state.clock.day);
      if (!r.ok) { hud.toast('오늘 마감된 일감이에요'); return; }
      const before = { ...r.state, job: acceptJob(typeId) }, sub = submitToJob(before);
      commit(sub.state);
      sound.play('job');
      const T = JOB_TYPES[typeId];
      panels.close();
      hud.announce({ kicker: '새 일감!', title: T.title, sub: '',
        chips: sub.moved ? [{ icon: ICO.check, text: `${state.job.count} / ${T.target}` }]
          : [{ icon: ICO.pin, text: T.where }, { icon: 'coin', text: `${won(Math.round(T.base * (T.hunt ? 1 : PAY_MULT[state.license.grade])))}부터` }] });
      celebrateIfDone(before.job, state.job);
    },
    quitJob() { commit({ ...returnToBoard(state, state.job.typeId, state.clock.day), job: null }); hud.toast('일감을 게시판에 돌려놨어요'); },
    reportJob() {
      if (!state.job || !isComplete(state.job)) return;
      const pay = payout(state.job, state.license.grade);
      commit({ ...addMoney(state, pay), job: null });
      sound.play('coin');
      hud.toast(`보수 ${pay.toLocaleString('ko-KR')}원을 받았어요!`);
      staffSay('labor', 'paid', 9, player.position);
      player.cheerTime = 1.2;
      // 첫날 안내의 첫 보수: 게시판을 닫고 하치와레가 바로 마무리 이야기를 한다(창을 연 채로 다음 일감을 받으면 안내가 풀 뽑기로 되돌아가 하치와레가 계속 따라다녔다)
      if (state.tutorial === 'report') { panels.close(); enterTutorial('tips', 'report'); }
    },
    startExam() {
      if (!canTakeExam(state.license)) return;
      const paid = payExamFee(state); // 승급 시험도 공짜가 아니다(떨어지면 다시 낸다)
      if (!paid.ok) { hud.toast(`시험 값 ${won(EXAM_FEE[state.license.grade])}이 모자라요`); return; }
      const exam = startExam(state.license.grade);
      commit({ ...paid.state, exam });
      sound.play('job');
      panels.close();
      hud.announce({ kicker: '승급 시험 시작!', title: `깔끔하게 연속 ${exam.need}번`, sub: '', chips: kindsOfGrade(state.license.grade).map((k) => ({ icon: itemSvg(k), text: WEED_KINDS[k].name })) });
    },
    buy(itemId, shopId = 'ramen') {
      const r = buy(state, shopId, itemId);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : r.reason === 'license' ? '술 자격이 있어야 해요' : r.reason === 'bag' ? '가방이 꽉 찼어요' : r.reason === 'soon' ? '아직 안 팔아요' : '지금은 배불러요'); return; }
      const paid = state.money - r.state.money;
      commit(r.state);
      if (r.item) { sound.play('coin'); hud.toast(`${itemInfo(r.item).name} 포장 완료! 가방에 넣었어요`, 2400, { icon: itemSvg(r.item) }); gotTicket(paid); return; } // 포장 상품(피자호빵)
      sound.play('eat');
      eatMotion(itemId);
      const SAY = { ramen: '후루룩!', shisaramen: '시사 특제 라멘… 국물이 끝내준다!', highball: '캬~ 시원하다!', beer: '캬~ 생맥주!', edamame: '짭짤한 풋콩!' };
      hud.toast(SAY[itemId] || '냠냠!', 2000);
      gotTicket(paid);
      if (itemId === 'ramen' || itemId === 'shisaramen') didAct('ramen'); // 일상 부탁: 같이 라멘 먹기
    },
    // 경품 추첨: 추첨권(없으면 돈)으로 가라가라를 돌린다 → 연출 → 당첨 카드
    raffleDraw() {
      const r = drawRaffle(state);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '가방이 꽉 찼어요'); return; }
      commit(r.state);
      panels.close();
      beginOverlay();
      drumSpin = 1.6;
      if (r.paid === 'money') sound.play('coin');
      openRaffleSpin(ui, { ball: r.prize.ball, sound, onDone: () => { endOverlay(); showPrize(r.prize); } });
    },
    // 맥주집: 쿠리만쥬가 와 있는지 · 오늘 건배했는지, 건배하기
    pubInfo: () => ({ here: !!kuriAtPub(), cheered: friendOf(state, 'kurimanju').drink === state.clock.day }),
    cheers() { const k = kuriAtPub(); if (k) cheersWith(k); },
    // 검정소 시험 · 라멘 로우 알바
    takeLicense: (id) => takeLicense(id),
    salon: () => openSalon(),
    // 시험 공부거리(토벌 안내서 · 레시피 북)를 펼쳤다: 펼친 날을 적어 둔다(시험 전 검정관 확인 · 이야기 퀘스트 '안내서 읽기')
    studied: (id) => { const s = markStudy(state, id, state.clock.day); if (s !== state) commit(s); },
    licenseCard: (id) => licenseCardData(id),
    workRamen: () => workRamen(),
    // 가구점
    thumbs: () => furnitureThumbs(),
    buyFurniture(id) {
      const r = buyFurniture(state, id);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      const paid = state.money - r.state.money;
      commit(r.state);
      sound.play('coin');
      hud.toast(`${josa(FURNITURE[id].name, '을/를')} 샀어요!`, 2600);
      gotTicket(paid);
    },
    // 벽지 · 바닥(core/home.js, 가구점): 안 가졌으면 사서 붙이고, 가졌으면 바꿔 붙인다
    useDecor(kind, id) {
      const r = useDecor(state, kind, id);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      const paid = state.money - r.state.money, D = (kind === 'wall' ? WALLPAPERS : FLOORS)[id];
      commit(r.state);
      sound.play(r.bought ? 'coin' : 'click');
      hud.toast(r.bought ? `${josa(D.name, '을/를')} 샀어요! 집에 들어가면 보여요` : `${josa(D.name, '으로/로')} 바꿨어요`, 2600);
      if (r.bought) happen({ type: 'playerDecor', who: 'me', item: D.name }); // 새로 산 벽지 · 바닥은 마을 친구들이 듣고 이야기한다
      if (paid) gotTicket(paid);
    },
    // 부동산
    dayLabel: (day) => dateLabel(state.startDate, day),
    nextDay: (dow, from = state.clock.day + 1) => { let d = from; while (weekdayOf(state.startDate, d) !== dow) d++; return d; },
    payRent() {
      const r = payRent(state);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      commit(r.state);
      sound.play('coin');
      hud.toast('밀린 집세를 다 냈어요!', 2600);
    },
    rentAgain() {
      const r = rentAgain(state);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      commit(r.state);
      sound.play('coin');
      hud.banner('다시 세 들었어요', '', 2600);
    },
    // 포셰트 가게
    buyPochette(id) {
      const r = buyPochette(state, id);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '이미 가진 포셰트예요'); return; }
      const paid = state.money - r.state.money;
      commit(r.state);
      refreshLook();
      sound.play('coin');
      player.cheerTime = 1.2;
      hud.toast(`${josa(POCHETTES[id].name, '을/를')} 장착했어요!`, 2800);
      gotTicket(paid);
    },
    wearPochette(id) {
      commit(wearPochette(state, id));
      refreshLook();
      if (mode === 'home') interior.setPlayer(myLook(), true);
      else if (mode === 'visit') rooms.setPlayer(myLook()); // 모몽가네 거울 앞에서 갈아입을 때
      sound.play('click');
      hud.toast(id ? `${josa(POCHETTES[id].name, '을/를')} 장착했어요` : '포셰트를 뺐어요');
    },
    // 꾸미기 소품(포셰트 가게에서 사고, 집 옷장에서 바꿔 단다)
    buyAccessory(id) {
      const r = buyAccessory(state, id);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '이미 가진 소품이에요'); return; }
      const paid = state.money - r.state.money;
      commit(r.state);
      refreshLook();
      sound.play('coin');
      player.cheerTime = 1.2;
      hud.toast(`${josa(ACCESSORY_ITEMS[id].name, '을/를')} 장착했어요!`, 3400);
      gotTicket(paid);
    },
    // 재료로 만드는 소품(별 조각 셋 → 별 조각 머리핀): 만들면 바로 단다
    craftAccessory(id) {
      const r = craftAccessory(state, id);
      if (!r.ok) { hud.toast(r.reason === 'items' ? '재료가 모자라요' : '이미 가진 소품이에요'); return; }
      commit(r.state);
      refreshLook();
      sound.play('done');
      player.cheerTime = 1.6;
      hud.banner('새 꾸미기!', ACCESSORY_ITEMS[id].name, 3000);
    },
    wearAccessory(id) {
      commit(wearAccessory(state, id));
      refreshLook();
      if (mode === 'home') interior.setPlayer(myLook(), true);
      else if (mode === 'visit') rooms.setPlayer(myLook()); // 모몽가네 거울 앞에서 갈아입을 때
      sound.play('click');
    },
    // 가방
    eatItem(id) {
      const r = eatItem(state, id, MAX_STAMINA);
      if (!r.ok) { hud.toast(r.reason === 'full' ? '지금은 배불러요' : '먹을 수 없어요'); return; }
      commit(r.state);
      sound.play('eat');
      eatMotion(id);
      hud.toast(`${itemInfo(id).name} 냠냠!`, 2200, { icon: itemSvg(id), chips: [{ icon: 'energy', text: `기운 +${r.gain}` }] });
    },
    // 헌책방 · 도구점 · 지도 앱
    buyTool(id) {
      const r = buyTool(state, id);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '이미 가지고 있어요'); return; }
      const paid = state.money - r.state.money;
      commit(r.state);
      sound.play('coin');
      if (id === 'map') {
        // 지도는 마을폰 앱으로 본다: 알림으로 어디서 보는지 알려 주고, 지도 앱을 열 때까지 마을폰 버튼과 지도 아이콘이 빛난다
        appNudge = 'map';
        hud.toast('마을 지도를 샀어요! 마을폰의 지도 앱에서 볼 수 있어요', 4200);
      } else if (id === 'car') hud.toast('하늘색 자동차를 샀어요! 오른쪽 위 자동차 버튼(C 키)으로 언제든 타고 내려요', 4600);
      else hud.toast(`${josa(TOOLS[id].name, '을/를')} 샀어요!`, 2600);
      gotTicket(paid);
    },
    setLight(id) { commit({ ...state, tools: { ...toolsOf(state), light: id } }); },
    // 도구점 무기 · 가방에서 바꿔 들기 · 노동 접수 전리품 팔기(4단계)
    buyWeapon(id) {
      const r = buyWeapon(state, id);
      if (!r.ok) { hud.toast({ money: '돈이 부족해요', license: '무기는 토벌 자격증이 있어야 살 수 있어요', owned: '이미 가진 무기예요' }[r.reason] || '살 수 없어요'); return; }
      const paid = state.money - r.state.money;
      commit(r.state);
      sound.play('coin');
      player.cheerTime = 1.2;
      hud.toast(`${josa(WEAPONS[id].name, '을/를')} 장착했어요!`, 2800, { icon: weaponSvg(id) });
      gotTicket(paid);
    },
    /** 토벌 랭커 특전: 지금 든 무기에 내 얼굴을 새긴다. */
    engrave() {
      const r = engraveWeapon(state);
      if (!r.ok) { hud.toast({ ranker: '랭커만 새길 수 있어요', weapon: '무기를 들고 와요', done: '이미 새긴 무기예요', money: '돈이 부족해요' }[r.reason] || '새길 수 없어요'); return; }
      commit(r.state);
      sound.play('done');
      player.cheerTime = 1.6;
      const id = heldWeapon(state);
      hud.banner('무기에 얼굴을 새겼어요!', WEAPONS[id].name, 3200);
    },
    holdWeapon(id) {
      commit(holdWeapon(state, id));
      sound.play('click');
      hud.toast(id ? `${josa(WEAPONS[id].name, '을/를')} 장착했어요` : '무기를 뺐어요', 1600, id ? { icon: weaponSvg(id, engravedOf(state).includes(id) ? state.profile.look.body : null) } : null);
    },
    trackQuest(id) { commit({ ...state, questTrack: id }); },
    // 주머니에서 버리기: 마을을 돌아다닐 때만(집 · 친구 집 안에서는 안 된다). 발 앞에 나뭇잎 꾸러미로 떨어진다
    canDrop: () => mode === 'play',
    dropItem(sel, n) {
      if (mode !== 'play') return;
      if (visiting) { dropToHost(sel, n); return; } // 친구 마을에서 버리면 그 마을 바닥에
      const at = dropSpot();
      const r = sel.type === 'weapon' ? dropWeapon(state, sel.id, at.x, at.z) : dropToGround(state, sel.id, n, at.x, at.z);
      if (!r.ok) { hud.toast(r.reason === 'full' ? '바닥이 꽉 찼어요' : '버릴 수 없어요'); return; }
      commit(r.state);
      ground.sync(groundOf(state), groundKind);
      sound.play('drop');
      const name = sel.type === 'weapon' ? WEAPONS[sel.id].name : itemInfo(sel.id).name;
      hud.toast(`${name}${r.n > 1 ? ` ${r.n}개` : ''} 버렸어요`, 1800, { icon: sel.type === 'weapon' ? weaponSvg(sel.id) : itemSvg(sel.id) });
    },
    // 집 보관 상자(core/storage.js): 주머니 → 상자 넣기, 상자 → 주머니 꺼내기
    storeItem(id, n) {
      const r = storeItem(state, id, n);
      if (!r.ok) { hud.toast(r.reason === 'quest' ? '퀘스트 물건은 주머니에 들고 다녀요' : r.reason === 'full' ? `상자에 ${josa(itemInfo(id).name, '이/가')} 가득해요` : '넣을 수 없어요', 2400); return; }
      commit(r.state);
      sound.play('drop');
      hud.toast(`${r.moved > 1 ? `${itemInfo(id).name} ${r.moved}개를` : josa(itemInfo(id).name, '을/를')} 상자에 넣었어요`, 1800, { icon: itemSvg(id) });
    },
    takeOut(id, n) {
      const r = takeOut(state, id, n);
      if (!r.ok) { hud.toast(r.reason === 'bag' ? '주머니에 더 못 넣어요(한 가지 99개까지)' : '꺼낼 수 없어요', 2400); return; }
      commit(r.state);
      sound.play('click');
      hud.bagBump();
      hud.toast(`${r.moved > 1 ? `${itemInfo(id).name} ${r.moved}개를` : josa(itemInfo(id).name, '을/를')} 꺼냈어요`, 1800, { icon: itemSvg(id) });
    },
    sellDrops() {
      const r = sellDrops(state);
      if (!r.sold) return;
      commit(r.state);
      sound.play('coin');
      hud.toast(`전리품 ${r.sold}개를 팔았어요!`, 3000, { chips: [{ icon: 'coin', text: `+${won(r.earned)}` }] });
    },
    // 노동 접수 '팔기': 고른 물건을 n 개(core/market.js)
    sellItem(id, n) {
      const r = sellItem(state, id, n);
      if (!r.sold) return;
      commit(r.state);
      sound.play('coin');
      hud.toast(`${itemInfo(id).name} ${r.sold}개를 팔았어요`, 2400, { icon: itemSvg(id), chips: [{ icon: 'coin', text: `+${won(r.earned)}` }] });
    },
    // 친구에게 선물: 말 걸기 → '선물 줄게' → 주머니에서 고른 물건(주머니는 이미 닫혔다)
    giveGift: (id) => giveGiftTo(id),
    playerPos: () => ({ x: player.position.x, z: player.position.z, yaw: player.yaw }), // 지도에 바라보는 방향 화살표
    mapLabels: () => village.labels.map((l) => ({ x: l.x, z: l.z, text: l.text })),
    // 지도에 마을 친구들 얼굴(집 안에 있으면 빼고)
    // 마을 친구들 얼굴(친구 마을에 놀러 가 있으면 그 마을 친구들이 보이는 자리)
    mapFriends: () => Object.keys(VILLAGERS).map((k) => npcs.byKind(k)).filter((n) => n && (visiting ? n.pup && n.chibi.root.visible : !n.away))
      .map((n) => ({ x: visiting ? n.pup.x : n.x, z: visiting ? n.pup.z : n.z, name: nameOf(n.kind), svg: faceIcon(n.kind) })),
    /** 같이 놀기 파티원 자리(집 안에 있으면 그 집 앞). */
    mapMates: () => {
      const at = new Map(remotes.players().map((p) => [p.id, p]));
      return [...mpParty].map(([id, m]) => {
        const p = at.get(id);
        if (!p || (p.area !== 'village' && p.area !== 'home')) return null;
        const s = p.area === 'home' ? village.spots.home : p;
        return { x: s.x, z: s.z, name: m.name };
      }).filter(Boolean);
    },
    buyHouse() {
      const r = buyHouse(state);
      if (!r.ok) { hud.toast(r.reason === 'unpaid' ? '밀린 집세부터 내요' : '돈이 부족해요'); return; }
      commit(r.state);
      celebrateHouse();
    },
    applyLottery() {
      const r = applyLottery(state, state.clock.day);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '이미 신청했어요'); return; }
      commit(r.state);
      sound.play('job');
      hud.toast('청약 신청 완료!', 2800, { chips: [{ icon: ICO.clock, text: '수요일 발표' }] });
    },
    buyByLottery() {
      const r = buyByLottery(state, state.clock.day);
      if (!r.ok) { hud.toast(r.reason === 'unpaid' ? '밀린 집세부터 내요' : r.reason === 'money' ? '돈이 부족해요' : '당첨 기한이 지났어요'); return; }
      commit(r.state);
      celebrateHouse();
    },
    // 집 넓히기(core/home.js, 부동산): 내 집을 한 단계 넓혀 가구 칸을 늘린다
    expandHome() {
      const r = expandHome(state);
      if (!r.ok) { hud.toast(r.reason === 'own' ? '집을 사야 넓힐 수 있어요' : r.reason === 'max' ? '이미 가장 넓어요' : '돈이 부족해요'); return; }
      commit(r.state);
      const G = gridOf(homeOf(r.state));
      hud.banner('집이 넓어졌어요!', `${G.name}, 가구 놓을 칸이 ${G.cols * G.rows}칸이 됐어요`, 3400);
      happen({ type: 'playerHome', who: 'me', home: G.name }); // 마을 친구들이 듣고 이야기한다
      sound.play('done');
      player.cheerTime = 1.6;
    },
    /** 메인(타이틀)으로 나간다. 진행은 저장되고, 타이틀에서 이어하기·새로 시작하기를 고른다. */
    toTitle() {
      cancelPull();
      multi.leave(); // 같이 놀기: 문을 닫거나 놀러 간 마을에서 나온다
      dropVisit(); // 놀러 가 있었으면 떠나온 자리로 돌려놓고 저장한다
      clearDown(); // 쓰러져 기다리던 중이었다
      cutBossMusic(); // 보스전 곡도 멈춘다
      resetFun();
      endHunterExam();
      if (bossM) { monsters.clear((m) => m === bossM || m.summoned); bossM = null; }
      questScene = false;
      usagiClub.reset();
      shisaStory.reset();
      hachiPit.reset();
      pajama.reset();
      islandTrip.reset();
      idolStory.reset();
      starDiner.reset();
      blackStar.reset();
      bonbonStory.reset();
      switchStory.reset();
      cameraStory.reset();
      loopRewinding = false;
      weather.setRain(false);
      sound.rain(false);
      hud.setQuests([]);
      save();
      guide.setGoal(null);
      examGoal = null; // 다음에 들어오면 승급 시험 쪽지를 다시 띄운다
      npcs.setFollow('hachiware', false);
      // 마을 친구들이 하던 일감 · 일정을 멈춘다(타이틀에서도 친구들은 움직이는데, 일정 끝에 진행(state)을 고치다 오류가 났다)
      for (const n of npcs.list) npcs.plan(n, []);
      hud.setAction(null);
      state = null;
      mode = 'title';
      if (player) { lights.update('off', player.position, player.yaw, 0); player.setHeld(null); } // 들고 있던 불을 끈다
      setCinematic(true);
      input.setEnabled(false);
      openTitle();
    }
  });

  /**
   * 잠자기: 하루가 지나는 연출. 어두워진 사이에 아침으로 바꾸고, 해가 뜨면 다시 움직인다(집 안이면 집 안 그대로).
   * how: 'home'(내 집) · 'lodge'(친구 집에 돈을 내고) — 기운이 60 찬다 / 'rough'(노숙) — 30 만 찬다(100 까지).
   */
  /** 침대에서: 잘지 한 번 묻고, '잘래요'면 다음 날 아침까지 잔다. */
  const BED = { kind: null, name: '침대', tag: '#d9ecff', ink: '#2f5577' };
  function askSleep() {
    input.setEnabled(false);
    hud.setAction(null);
    guide.ask(`${SLEEP_HOURS}시간 푹 잘까요?`, ['잘래요', '아직이요'], (i) => {
      if (i === 0) doSleep();
      else if (mode === 'home') input.setEnabled(true);
    }, BED);
  }
  /** after: 잠 연출이 다 끝난 뒤, dark: 화면이 깜깜한 동안(친구들이 제자리로 간 다음 — 이야기 장면이 아침 자리를 미리 잡는다). */
  function doSleep(how = 'home', after = null, dark = null) {
    if (sleeping) return;
    sleeping = true;
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    sound.play('sleep');
    // 검은 별똥별: 밤 12시를 넘겨 자면 같은 날 아침(6시 반)으로 — 그사이 친구들이 보낸 시간도, 새날도 없다
    if (loopDue(state, sleepFor(state.clock))) {
      const next = loopRewind(sleepStamina(state, how));
      shareSleep(next.clock, 'morning');
      playSleep(ui, { dateText: dateLabel(next.startDate || todayISO(), next.clock.day), timeText: timeLabel(next.clock), phase: 'morning' },
        () => { commit(next); villageOvernight(); dark?.(); }, () => sound.play('morning')).then(() => {
        sleeping = false;
        if (mode === 'play' || (mode === 'home' && !homeUI.decorating)) input.setEnabled(true);
        homeUI.refresh();
        after?.();
        hud.toast('…또 같은 날 아침?', 3600);
      });
      return;
    }
    // 아침까지가 아니라 SLEEP_HOURS 시간만 흐른다. 그사이 친구들도 그 시간을 보낸다(저녁 · 밤잠 · 다음 날 아침)
    const to = sleepFor(state.clock), spans = asleepSpans(state.clock, to), wakeHour = hourOf(to);
    const lived = liveWhileAsleep(spans);
    const rolled = rollDays(sleepStamina({ ...lived.state, clock: to }, how)); // 기운이 60 찬다(노숙은 30)
    const next = rolled.state, phase = phaseOf(to);
    const onDark = () => {
      commit(next);
      if (!spans.night) villageAfterNap(lived.evening); // 낮잠: 친구들은 그사이 한 일에 맞는 곳에 가 있다
      else {
        villageOvernight(); // 밤잠: 각자 집에서 자고
        if (spans.morning) villageAfterNap(lived.morning, (k) => wakeHourOf(k) <= wakeHour); // 이미 일어날 때가 지난 친구는 나와서 지내는 중
      }
      dark?.();
    };
    const light = phase === 'morning' || phase === 'day';
    shareSleep(to, phase); // 놀러 온 친구도 같이 잔다
    playSleep(ui, { dateText: dateLabel(next.startDate || todayISO(), next.clock.day), timeText: timeLabel(to), phase }, onDark, () => { if (light) sound.play('morning'); }).then(() => {
      sleeping = false;
      if (mode === 'play' || (mode === 'home' && !homeUI.decorating)) input.setEnabled(true);
      homeUI.refresh();
      after?.();
      hud.toast(how === 'rough' ? '바닥에서 잤더니 몸이 쑤셔요…' : how === 'lodge' ? '친구 집에서 푹 잤어요!' : '푹 잤어요!', 3400);
      announce(rolled.events);
    });
  }

  // ---------- 날짜: 집세(월요일)와 청약 발표(수요일) ----------
  let knownDay = 0; // 집세 · 청약을 처리한 마지막 날
  const won = (n) => n.toLocaleString('ko-KR') + '원';
  /** knownDay 다음 날부터 s 의 날까지 하루씩 넘기며 집세와 청약을 처리한다. */
  function rollDays(s) {
    const events = [];
    for (let d = knownDay + 1; d <= s.clock.day; d++) {
      const r = startDay(s, d, weekdayOf(s.startDate, d));
      s = r.state;
      events.push(...r.events);
    }
    knownDay = Math.max(knownDay, s.clock.day);
    // 일요일이면 내일이 집세 날이라고 알려 준다
    if (events.length === 0 && !housingOf(s).own && !isEvicted(s) && weekdayOf(s.startDate, s.clock.day) === 0) events.push({ type: 'rentSoon' });
    return { state: s, events };
  }
  /** 새 날의 소식을 띄운다. */
  function announce(events) {
    for (const e of events) {
      if (e.type === 'rentPaid') { hud.toast('집세를 냈어요', 2600, { chips: [{ icon: 'coin', text: `−${won(e.amount)}` }] }); sound.play('coin'); }
      else if (e.type === 'rentUnpaid') hud.toast('집세를 못 냈어요!', 4800, { chips: [{ icon: 'coin', text: won(e.unpaid) }, { text: '월요일까지' }] });
      else if (e.type === 'evicted') evicted(e.unpaid);
      else if (e.type === 'rentSoon') hud.toast('내일은 집세 날', 2800, { chips: [{ icon: 'coin', text: won(RENT) }] });
      // 청약 발표(수요일 아침)는 놓치지 않게 화면 가운데 큰 카드에 도장으로
      else if (e.type === 'lotteryWon') {
        const lot = housingOf(state).lottery;
        hud.notice({ kicker: '주택 청약 발표', stamp: '당첨!', tone: 'good', sub: '',
          chips: [{ icon: 'coin', text: won(LOTTERY_PRICE) }, { icon: ICO.clock, text: `${lot && lot.until ? dateLabel(state.startDate, lot.until) : '일주일'}까지` }], ok: '좋아요!' });
        sound.play('done');
      } else if (e.type === 'lotteryLost') {
        hud.notice({ kicker: '주택 청약 발표', stamp: '낙첨', tone: 'bad', sub: '' });
        sound.play('fail');
      } else if (e.type === 'lotteryExpired') hud.notice({ kicker: '주택 청약', stamp: '기한 끝', tone: 'info', sub: '' });
    }
  }
  /** 집세를 두 번 연달아 못 내서 쫓겨났다: 집 안이면 밖으로 나온다. */
  function evicted(unpaid) {
    if (mode === 'home') exitHome();
    hud.banner('집에서 쫓겨났어요…', `밀린 집세 ${won(unpaid)}`, 4200);
    sound.play('fail');
    setTimeout(() => { if (state && isEvicted(state)) hud.toast('밤엔 친구 집이나 노숙', 3600); }, 4400);
  }
  /** 밤(18시 ~ 다음 날 6시): 쫓겨났으면 잘 곳을 찾을 시간. */
  const bedtime = () => { const h = hourOf(state.clock); return h >= 18 || h < 6; };
  /** 노숙: 바닥에서 자면 다음 날 기운이 조금만 찬다. */
  function sleepRough() {
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    guide.ask(`여기서 노숙할 거야? 바닥에서 자면 내일 기운이 ${ROUGH_REST}밖에 안 차…`, ['여기서 잘래', '아직 안 잘래'], (i) => {
      input.setEnabled(true);
      if (i === 0) doSleep('rough');
    });
  }
  /** 내 모습 + 멘 포셰트. */
  // 내 모습: 만들 때 고른 몸 · 얼굴에 지금 단 소품과 멘 포셰트(옷장에서 바꾼다)
  const myLook = () => ({ ...state.profile.look, accessory: wardrobeOf(state).wear, pochette: worn(state) });
  const refreshLook = () => { player.setModel(buildChibi(myLook())); multi.look(myLook()); }; // 같이 놀기: 같은 마을 사람들에게도 바로

  /** 내 집 마련! */
  function celebrateHouse() {
    hud.banner('내 집 마련!', '', 3200);
    sound.play('done');
    player.cheerTime = 1.8;
  }
  /** 모습 바꾸기(집 안 거울). */
  // ---------- 집 안 ----------
  const interior = createInterior();
  homeRemotes = createRemotePlayers(interior.scene, 'home'); // 같이 놀기: 주인 집 안에 같이 있는 사람
  const INDOOR_LIGHT = new THREE.Color(1, 1, 1); // 집 안 캐릭터는 밤에도 밝게
  const homeUI = createHomeUI(ui, {
    getState: () => state,
    thumb: (id) => furnitureThumbs()[id],
    place(id, cx, cz) {
      const r = placeFurniture(homeOf(state), id, cx, cz);
      if (r.ok) { commit({ ...state, home: r.home }); interior.setHome(r.home); sound.play('job'); }
      return r;
    },
    remove(cx, cz) { const home = removeFurniture(homeOf(state), cx, cz); commit({ ...state, home }); interior.setHome(home); sound.play('click'); },
    rotate(cx, cz) { const home = rotateFurniture(homeOf(state), cx, cz); commit({ ...state, home }); interior.setHome(home); sound.play('click'); },
    move(from, to) {
      const r = moveFurniture(homeOf(state), from, to);
      if (r.ok) { commit({ ...state, home: r.home }); sound.play('job'); }
      interior.setHome(r.home); // 못 옮겼으면 제자리로 돌아간다
      return r;
    },
    sleep: () => doSleep(),
    wardrobe: () => { interior.faceCamera(); panels.openWardrobe(); },
    storage: () => panels.openStorage(), // 보관 상자(두 번째 주머니)
    onDecor: (on) => { if (mode === 'home') input.setEnabled(!on && !panels.isOpen()); }, // 꾸미기 중에는 걷지 않는다
    exit: () => exitHome(),
    showGrid: (on) => interior.showGrid(on),
    highlight: (cell) => interior.highlight(cell),
    cellAtScreen: (x, y) => { const p = ndc({ clientX: x, clientY: y }); return interior.cellAt(p.x, p.y); },
    ghost: (id, cell) => interior.ghost(id, cell)
  });
  /** 집에 들어간다: 마을 대신 집 안을 그리고, 집 안 버튼을 띄운다. */
  function enterHome() {
    cancelPull();
    partyEnd(null, 'partyLeave'); // 같이 토벌하던 친구들은 집 앞에서 헤어진다
    mode = 'home';
    setCinematic(true);
    document.body.classList.add('in-home');
    hud.setAction(null);
    interior.setHome(homeOf(state));
    interior.setPlayer(myLook());
    interior.stepAside(homeOf(state), homeRemotes.players().filter((p) => p.area === 'home')); // 같이 놀기: 집에 와 있는 친구와 겹치지 않게
    homeUI.open();
    sound.play('job');
    const unpaid = housingOf(state).unpaid;
    if (unpaid > 0) hud.toast('밀린 집세가 있어요', 3200, { chips: [{ icon: 'coin', text: won(unpaid) }, { icon: ICO.pin, text: '부동산에서 내기' }] });
  }
  function exitHome() {
    homeUI.close();
    mode = 'play';
    setCinematic(false);
    document.body.classList.remove('in-home');
    interior.setCue(null);
    input.setEnabled(true);
    const s = village.spots.home;
    player.setPosition(s.x, s.z);
    player.face(s.x + 1, s.z + 0.4); // 현관에서 나와 길 쪽을 본다
    cam.snap(player.position);
    save();
  }
  // 꾸미기 중 바닥: 누르면 그 칸에 놓거나 고르고, 놓인 가구를 끌면 다른 칸으로 옮긴다
  const ndc = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }; };
  let drag = null; // { from: 칸, sx, sy: 누른 화면 위치, moved: 끌었는지, can: 끌 수 있는 가구인지 }
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'home' || !homeUI.decorating) return;
    const p = ndc(e), from = interior.pickCell(p.x, p.y) || interior.cellAt(p.x, p.y); // 가구를 눌렀으면 그 가구의 칸
    drag = { from, sx: e.clientX, sy: e.clientY, moved: false, can: homeUI.canDrag(from) };
    if (drag.can) canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || !drag.can) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return; // 살짝 떨린 건 누름으로
    drag.moved = true;
    const p = ndc(e);
    interior.drag(drag.from, interior.pointAt(p.x, p.y));
    interior.highlight(interior.cellAt(p.x, p.y));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (mode !== 'home' || !homeUI.decorating) return;
    const p = ndc(e);
    if (d.moved) homeUI.dropped(d.from, interior.cellAt(p.x, p.y));
    else homeUI.cellTapped(d.from);
  });
  canvas.addEventListener('pointercancel', () => {
    if (drag && drag.moved) { interior.drag(drag.from, null); interior.highlight(null); }
    drag = null;
  });

  // 가방: 오른쪽 위 버튼 또는 I · B 키
  const openBag = () => { if (state && (mode === 'play' || mode === 'visit' || (mode === 'home' && !homeUI.decorating)) && !guide.open && !sleeping && !funBusy() && !panels.isOpen()) panels.openBag(); };
  hud.onBag(openBag);
  // 마을폰: 마을에서도, 집 · 친구 집 안에서도(꾸미는 중만 빼고) 연다. 오른쪽 위 버튼 또는 E 키
  const phoneOk = () => !!(state && (mode === 'play' || mode === 'visit' || (mode === 'home' && !homeUI.decorating)) && !guide.open && !sleeping && !funBusy());
  const openPhone = () => {
    if (!phoneOk()) return;
    panels.openSettings({ storage: store.available });
    if (state.tutorial === 'phone') tutPhoneOpened = true; // 첫날 안내: 열어 봤으니 닫으면 하치와레가 마을폰 이야기를 한다
  };
  hud.onSettings(openPhone);
  // 퀘스트 쪽지가 시계 위까지 다 못 들어가 묶인 「외 N개」: 누르면 마을폰 퀘스트 앱
  hud.onQuestMore(() => { if (phoneOk()) panels.openQuests(); });
  input.onZoom((f) => cam.zoomBy(f)); // 두 손가락으로 확대 · 축소
  // 등불: 가진 불만 끔 → 랜턴 → 손전등. 버튼 또는 F 키(아직 불이 없으면 어디서 사는지 알려 준다)
  const toggleLight = (fromKey) => {
    if (!state || mode !== 'play') return;
    const next = nextLight(state);
    if (lightOf(next) === lightOf(state)) { if (fromKey) hud.toast('등불이 아직 없어요', 2200, { chips: [{ text: '도구점에서 팔아요' }] }); return; }
    commit(next);
  };
  hud.onLight(() => toggleLight(false));
  hud.onRecall(() => recallHome());
  // ---------- 하늘색 자동차(도구점, actors/car.js): 버튼 또는 C 키로 언제든 타고 내린다(걷기의 두 배 빠르기) ----------
  // 행동 버튼 · 휘두르기를 하면 내려서 그 일을 하고, 이야기 장면 · 다른 장면 · 쓰러짐처럼 걸어야 할 때는 저절로 내린다
  /** 지금 차에 탄 채로 있어도 되는지(아니면 저절로 내린다). */
  const carStay = () => mode === 'play' && !!state && !!player && !fainting && !downed && !sleeping && !recalling && !hunterExam && !resting && !pulling && !fishing && !glowTry && !sticker
    && !funBusy() && !player.walkTo && !(visiting && (visiting.arriving || visiting.leaving));
  function getOffCar(quiet = false) {
    if (!player || !player.riding) return;
    player.setRiding(false);
    if (!quiet) sound.play('poof');
  }
  function toggleCar(fromKey) {
    if (!state || mode !== 'play' || !player) return;
    if (!hasTool(state, 'car')) { if (fromKey) hud.toast('자동차가 아직 없어요', 2200, { chips: [{ icon: ICO.pin, text: `도구점 ${won(TOOLS.car.price)}` }] }); return; }
    if (player.riding) { getOffCar(); return; }
    if (!carStay() || panels.isOpen() || guide.open || talking) return;
    // 차가 들어갈 자리: 좁은 곳이면 가까운 빈자리로 살짝 비켜 탄다(너무 멀면 못 탄다)
    const p = player.position, at = village.nearestFree(p.x, p.z, CAR_RADIUS);
    if (Math.hypot(at.x - p.x, at.z - p.z) > 1.2) { hud.toast('여기는 자동차를 꺼낼 자리가 없어요', 2200); return; }
    player.placeAt(at.x, at.z);
    player.setRiding(true);
    sound.play('honk');
  }
  hud.onCar(() => toggleCar(false));
  // 퀘스트 쪽지 압정: 고정하면 접어도 늘 보이고 맨 위로(다시 누르면 풀기). 저장에 남는다
  hud.onQuestPin((id) => {
    if (!state || !QUESTS[id]) return;
    const pins = state.questPins || [], on = pins.includes(id);
    commit({ ...state, questPins: on ? pins.filter((x) => x !== id) : [...pins.filter((x) => isActive(state, x)), id] }); // 끝난 퀘스트 압정은 이참에 치운다
    sound.play('click');
  });
  // 키보드: I · B 주머니, E 마을폰(같은 키를 한 번 더 누르면 닫는다), F 등불, C 자동차, H 집으로(마을 밖에서)
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    if (e.code === 'KeyI' || e.code === 'KeyB') { if (panels.openKind() === 'bag') panels.close(); else openBag(); }
    else if (e.code === 'KeyE') { if (panels.isPhone()) panels.close(); else openPhone(); }
    else if (e.code === 'KeyF') toggleLight(true);
    else if (e.code === 'KeyC') toggleCar(true);
    else if (e.code === 'KeyH') recallHome();
  });
  // ---------- 집으로: 마을 밖에서 토벌하다가 커튼 한 번에 집 앞으로(친구 마을이면 친구네 집 앞) ----------
  let recalling = false;
  const outsideVillage = () => !!player && Math.hypot(player.position.x, player.position.z) > VILLAGE_R + 1;
  /** 지금 집으로 버튼을 쓸 수 있는지(마을 밖이고, 다른 일 · 연출 중이 아닐 때). */
  const canRecall = () => mode === 'play' && !!state && outsideVillage() && !recalling && !fainting && !downed && !hunterExam && !sticker && !pulling && !sleeping
    && !funBusy() && !panels.isOpen() && !guide.open && !(visiting && (visiting.arriving || visiting.leaving));
  function recallHome() {
    if (!canRecall()) return;
    const p = player.position;
    // 쫓아오는 몬스터가 가까이 있으면 못 간다(도망치는 수단이 되지 않게). 친구 마을에서는 받은 모습뿐이라 가까이 있으면
    const chased = monsters.active().some((m) => !m.dead && Math.hypot(m.x - p.x, m.z - p.z) < 9 && (visiting || (m.state !== 'wander' && m.state !== 'return' && !m.foe))); // 쫓기 · 공격 예고 · 공격 · 공격 뒤 숨 고르기
    if (chased) { hud.toast('몬스터가 쫓아오고 있어서 못 가요', 2600); return; }
    recalling = true;
    input.setEnabled(false);
    hud.setAction(null);
    hud.curtain(true, '집으로 돌아가는 중…');
    setTimeout(() => {
      recalling = false;
      if (!state || mode !== 'play') { hud.curtain(false); return; }
      const h = !visiting && isEvicted(state) ? village.spots.plaza : village.spots.home, at = village.nearestFree(h.x + 0.6, h.z + 1.4, 0.5);
      player.setPosition(at.x, at.z);
      player.face(at.x, at.z + 3);
      cam.snap(player.position);
      hud.curtain(false);
      if (!panels.isOpen() && !guide.open) input.setEnabled(true);
      save();
    }, 900);
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoomBy(Math.exp(e.deltaY * 0.001)); }, { passive: false });
  // PC: 마우스 왼쪽 클릭으로 무기를 휘두른다(누른 쪽 · 그 근처 몬스터를 노린다)
  const clickRay = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), clickHit = new THREE.Vector3();
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || mode !== 'play' || !state || !weaponNow()) return;
    if (panels.isOpen() || guide.open || sleeping || funBusy() || fainting || sticker || pulling || talking || fishing || glowTry) return; // 낚시 · 털뭉치 따기 중에는 휘두르지 않는다
    const p = ndc(e);
    clickRay.setFromCamera(p, cam.camera);
    const hit = clickRay.ray.intersectPlane(groundPlane, clickHit);
    doSwing(hit ? { x: hit.x, z: hit.z } : null);
  });

  /** 이번 작업으로 일감을 다 했으면 크게 알린다(가운데 도장 + 빰빠밤 + 만세). */
  function celebrateIfDone(before, after) {
    if (after && isComplete(after) && !(before && isComplete(before))) {
      hud.banner('노동 완료!', '', 2600, [{ icon: ICO.pin, text: '노동 접수' }]);
      sound.play('done');
      player.cheerTime = 1.8;
    }
  }

  // ---------- 다른 작업: 스티커 붙이기, 열매 따기 ----------
  const WORK_STAMINA = 2;
  let sticker = null; // 스티커 작업 중이면 열려 있는 미니게임
  const jobKind = () => state.job && JOB_TYPES[state.job.typeId].kind;

  function startSticker() {
    if (jobKind() !== 'sticker') { hud.toast('스티커 일감이 없어요', 2400, { chips: [{ icon: ICO.pin, text: '노동 접수' }] }); return; }
    if (isComplete(state.job)) { hud.toast('다 붙였어요!'); return; }
    if (state.stamina < WORK_STAMINA) { hud.toast('기운이 없어요', 2000); return; }
    input.setEnabled(false);
    hud.setAction(null);
    const type = JOB_TYPES[state.job.typeId];
    sticker = openSticker(ui, {
      need: type.target - state.job.count, done: state.job.count, stamina: state.stamina, maxStamina: MAX_STAMINA,
      onResult(result) {
        if (state.stamina < WORK_STAMINA) { hud.toast('기운이 다 떨어졌어요…'); return false; }
        const before = state.job;
        state = { ...useStamina(state, WORK_STAMINA).state, job: recordPull(state.job, 'sticker', result) };
        sound.play(result === 'clean' ? 'zone' : result === 'snapped' ? 'job' : 'none');
        celebrateIfDone(before, state.job);
        return { stamina: state.stamina };
      },
      onClose() { sticker = null; if (mode === 'play') input.setEnabled(true); save(); }
    });
  }

  function pickBerry(bush) {
    if (state.stamina < WORK_STAMINA) { hud.toast('기운이 없어요', 2000); return; }
    if (jobKind() !== 'berry' || isComplete(state.job)) {
      // 일감이 아니면 가방에(먹거나, 나중에 열매 일감에 낸다)
      const a = addItem(useStamina(state, WORK_STAMINA).state, 'berry', 1, 1);
      if (!a.added) { hud.toast('가방이 꽉 찼어요'); return; }
      berries.pick(bush);
      if (bush.guest) multi.act({ t: 'berry', i: bush.i }); // 친구 마을 덤불: 주인 마을에서도 빈다(딴 열매는 내 가방에)
      commit(a.state);
      didAct('berry');
      sound.play('clean');
      player.face(bush.x, bush.z);
      hud.bagBump();
      hud.floatText({ x: bush.x, y: 1.2, z: bush.z, text: '+1', kind: 'pick', icon: itemSvg('berry') }); // 가방 개수는 가방이 톡 튀는 것으로
      return;
    }
    const before = state.job;
    berries.pick(bush);
    if (bush.guest) multi.act({ t: 'berry', i: bush.i });
    commit({ ...useStamina(state, WORK_STAMINA).state, job: recordPull(state.job, 'berry', 'clean') });
    didAct('berry');
    sound.play('clean');
    player.face(bush.x, bush.z);
    player.cheerTime = 0.6;
    if (!isComplete(state.job)) hud.floatText({ x: bush.x, y: 1.2, z: bush.z, text: `${state.job.count} / ${JOB_TYPES[state.job.typeId].target}`, kind: 'pick', icon: itemSvg('berry') });
    celebrateIfDone(before, state.job);
  }

  /**
   * 반짝 털뭉치 따기(밤, 서쪽 숲 빛나는 버섯 — core/glowfluff.js): 풀 뽑기처럼 행동 버튼을 꾹 누르면 손을 뻗고(멈춰 서서) 버섯 빛 게이지가 뜬다.
   * 손을 뻗을 때마다 초록 칸(그 털뭉치가 놓아주는 밝기) 자리가 바뀐다. 손을 떼는 순간 빛이 초록 칸이면 깔끔하게, 가까우면 그냥 떼어지고,
   * 멀면 털뭉치가 움찔해서 못 뗀다(기운은 안 든다). 움찔해서 빛이 사그라든 동안은 늘 움찔.
   * 일감이면 일감에, 아니면 가방에.
   */
  function beginGlow(s) {
    if (state.stamina < WORK_STAMINA) { hud.toast('기운이 없어요', 2000); return; }
    glowTry = { s, zone: glowZone() };
    player.face(s.x, s.z);
    player.busy = true; // 손을 뻗는 동안은 멈춰 선다
  }
  function cancelGlow() {
    if (!glowTry) return;
    glowTry = null;
    player.busy = false;
    hud.hideMeter();
  }
  function endGlow() {
    const { s, zone } = glowTry;
    cancelGlow();
    pickGlow(s, zone);
  }
  function pickGlow(s, zone) {
    const top = { x: s.x, y: 1.45, z: s.z };
    player.face(s.x, s.z);
    const res = s.dim > 0 ? 'startle' : glowResult(glows.glowOf(s), zone);
    if (res === 'startle') {
      glows.startle(s);
      sound.play('none');
      hud.floatText({ ...top, text: '움찔!', kind: 'tip' });
      return;
    }
    if (state.stamina < WORK_STAMINA) { hud.toast('기운이 없어요', 2000); return; }
    const clean = res === 'clean', counted = jobKind() === 'glowfluff' && !isComplete(state.job);
    let next = markPicked(useStamina(state, WORK_STAMINA).state, s.id);
    if (counted) next = { ...next, job: recordPull(next.job, 'glowfluff', clean ? 'clean' : 'snapped') };
    else {
      const a = addItem(next, 'glowfluff', 1, clean ? 1 : 0); // 일감이 아니면 가방에(나중에 일감에 내거나 팔거나 선물)
      if (!a.added) { hud.toast('가방이 꽉 찼어요'); return; }
      next = a.state;
      hud.bagBump();
    }
    const before = state.job;
    glows.pick(s, player.position);
    commit(next);
    sound.play('clean');
    player.cheerTime = clean ? 0.7 : 0;
    // 작은 글씨 한 줄(그림 + 깔끔하면 '반짝!' + 일감 진행이나 +1)
    const n = counted ? `${state.job.count} / ${JOB_TYPES[state.job.typeId].target}` : '+1';
    hud.floatText({ ...top, text: clean ? `반짝! ${n}` : n, kind: 'mini', icon: itemSvg('glowfluff') });
    celebrateIfDone(before, state.job);
  }

  // ---------- 풀 뽑기 ----------
  function beginPull(weed) {
    const W = WEED_KINDS[weed.kind];
    if (!canPullKind(state.license.grade, weed.kind)) { hud.toast(`${W.grade}급부터`, 2200, { icon: itemSvg(weed.kind) }); return; }
    if (state.stamina < STAMINA_PER_PULL) { hud.toast('기운이 없어요', 2000); return; }
    if (npcs.isWorkingOn(weed)) { hud.toast('친구가 뽑으려는 풀이에요'); return; }
    // 같이 놀기: 놀러 온 친구가 뽑고 있는 내 마을 풀 · 친구 마을에서 다른 사람이 뽑고 있는 풀
    if (weed.busy === 'guest' && performance.now() < weed.busyUntil) { hud.toast(`${josa(multi.nameOf(weed.busyBy) || '친구', '이/가')} 뽑고 있는 풀이에요`); return; }
    if (weed.guest && weed.taken) { hud.toast('다른 친구가 뽑고 있는 풀이에요'); return; }
    if (weed.guest) multi.act({ t: 'grab', id: weed.id }); // 주인에게: 이 풀은 내가 뽑는 중
    // 초록 구간은 뽑을 때마다 다른 자리에, 기운이 낮을수록 좁고 빠르게
    const st = stageLabel(weed);
    // 내 제초 급수가 그 풀보다 높을수록 쉬워진다(core/weeding.js 의 pullSkill)
    pulling = { weed, pull: startPull(weed.kind, { stamina: state.stamina, maxStamina: MAX_STAMINA, grade: state.license.grade }), label: [{ icon: itemSvg(weed.kind), text: `${W.name}${st ? ' ' + st : ''}` }] };
    weed.busy = 'player'; // 친구들이 이 풀을 노리지 않게
    if (state.stamina <= MAX_STAMINA * 0.3 && !seen('tired-pull')) {
      markSeen('tired-pull');
      hud.toast('기운이 없어 손이 떨려요…', 3200);
    }
    player.busy = true;
    player.mode = 'pull';
    player.face(weed.x, weed.z);
    sound.chargeStart();
  }

  /** 뽑는 동안 매 프레임: 게이지가 차오르고 풀이 늘어난다(내 마을 · 친구 마을 같이). */
  function updatePull(dt) {
    const before = pulling.pull.power;
    pulling.pull = chargePull(pulling.pull, dt);
    player.power = pulling.pull.power;
    sound.chargeUpdate(player.power);
    // 지금 떼면 깔끔하게! (끝에 닿고 되돌아오는 길에 초록 칸 위쪽으로 들어설 때도)
    if (pulling.pull.back ? before > pulling.pull.greenTo && player.power <= pulling.pull.greenTo : before < pulling.pull.greenFrom && player.power >= pulling.pull.greenFrom) sound.play('zone');
    weeds.tug(pulling.weed, pulling.pull.power);
    hud.showMeter(pulling.pull.power, { from: pulling.pull.greenFrom, to: pulling.pull.greenTo }, pulling.label);
    // 끝까지 갔다가 왼쪽 끝으로 돌아올 때까지 누르고 있었으면 그대로 끊어진다(실패)
    if (pulling.pull.over) endPull(true);
  }

  /** 결과 없이 뽑기를 멈춘다(창이 열리거나 다시 시작할 때). 기운은 쓰지 않는다. */
  // ---------- 낚시(core/fishing.js, 게임 오리지널): 낚싯대를 들고 물가에서 '낚싯대 펼치기' ----------
  // 던지면 찌가 물에 뜨고, 한두 번 톡톡 건드리다가(속지 말 것) 퐁 잠기면 바로 행동 버튼 → 끌어올리기 놀이(ui/fishgame.js):
  // 행동 버튼을 누르고 있으면 초록 칸이 올라가고 떼면 내려온다. 물고기를 칸 안에 두어 게이지를 채우면 물 밖으로 튀어 올라 머리 위로
  let fishing = null; // { phase: 'cast' | 'wait' | 'bite' | 'reel', water, spot, t, biteAt, nibbles: [초], fish, reel: stepReel 상태, hold: 누르고 있다 }
  let actionDown = false, fishRelease = false; // 행동 버튼을 누르고 있는지 · 낚시가 끝날 때 누르고 있었으면 뗄 때까지 다시 던지지 않는다
  const fishGame = createFishGame(ui);
  const bobber = new THREE.Group();
  bobber.add(toonMesh(GEO.sphere, '#ffffff', { scale: [0.08, 0.06, 0.08], outline: 0.012, shadow: false }));
  bobber.add(toonMesh(GEO.sphere, '#e0524f', { position: [0, 0.05, 0], scale: [0.075, 0.055, 0.075], outline: 0.012, shadow: false }));
  bobber.visible = false;
  scene.add(bobber);
  const fishLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x5a4431 }));
  fishLine.visible = false;
  fishLine.frustumCulled = false;
  scene.add(fishLine);
  /** 물가인지: 바라보는 쪽부터 둘러보며 1.5 ~ 2.7 앞에 물이 있으면 그 자리 { x, z, water, front: 바로 앞이 물 }(내가 물속이면 null). */
  function fishSpotNear(p, yaw) {
    if (waterAt(p.x, p.z)) return null;
    for (const da of [0, 0.45, -0.45, 0.9, -0.9, 1.5, -1.5, 2.2, -2.2, Math.PI]) {
      for (const d of [1.5, 2.1, 2.7]) {
        const a = yaw + da, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, water = waterAt(x, z);
        if (water) return { x, z, water, front: Math.abs(da) < 0.5 && d < 2.2 };
      }
    }
    return null;
  }
  /** 낚싯대 끝: 손에 든 낚싯대의 빨간 끝(못 찾으면 오른손 위 앞쪽 어림). */
  const rodTip = () => {
    const v = new THREE.Vector3();
    if (player.rodTip(v)) return v;
    const p = player.position, y = player.yaw;
    return v.set(p.x + Math.cos(y) * 0.35 + Math.sin(y) * 1.2, 1.55, p.z - Math.sin(y) * 0.35 + Math.cos(y) * 1.2);
  };
  /** 물낯 높이: 절벽 앞 만(바다를 아래로 낮춘 곳)만 낮다. */
  const waterY = (x, z) => (z > SOUTH_SHORE && x > CLIFF.cove.x0 && x < CLIFF.cove.x1 ? CLIFF.cove.y : 0) + 0.04;
  function beginFish(spot) {
    if (state.stamina < FISH_STAMINA) { hud.toast('기운이 없어요', 2000); return; }
    commit(useStamina(state, FISH_STAMINA).state, false);
    player.face(spot.x, spot.z);
    player.busy = true;
    player.setRod(true);
    const wait = BITE_WAIT[0] + Math.random() * (BITE_WAIT[1] - BITE_WAIT[0]);
    const nibbles = Array.from({ length: Math.floor(Math.random() * 3) }, () => 0.8 + Math.random() * Math.max(0.2, wait - 1.4)).sort((a, b) => a - b); // 톡톡 건드리기(속지 말 것)
    fishing = { phase: 'cast', t: 0, spot, water: spot.water, biteAt: wait, nibbles, fish: null, reel: null, hold: false };
    sound.play('swing');
    if (!seen('fishing')) { markSeen('fishing'); hud.toast('찌가 퐁 잠기면 바로 눌러요. 그다음 꾹 눌렀다 뗐다 하며 초록 칸에 물고기를 담아요', 5200); }
  }
  function cancelFish() {
    if (!fishing) return;
    fishing = null;
    fishRelease = actionDown; // 버튼을 누른 채로 끝났으면 한 번 떼야 다시 던진다
    player.busy = false;
    player.setRod(false);
    player.mode = 'idle';
    player.power = 0;
    bobber.visible = false;
    fishLine.visible = false;
    fishGame.hide();
    hud.hideMeter();
  }
  function fishFail(text) {
    const s = fishing.spot;
    hud.floatText({ x: s.x, y: 0.9, z: s.z, text, kind: 'tip' });
    sound.play('none');
    splash(s, 0.5);
    cancelFish();
  }

  // 낚시 연출: 물보라(퍼지는 고리 · 튀는 물방울), 낚은 물고기가 물에서 튀어 올라 머리 위로(잠깐 들고 있다가 가방으로)
  const splashes = [], splashRing = new THREE.RingGeometry(0.75, 1, 32).rotateX(-Math.PI / 2);
  function splash(at, k = 1) {
    const ring = new THREE.Mesh(splashRing, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.position.set(at.x, waterY(at.x, at.z) + 0.01, at.z);
    ring.scale.setScalar(0.1);
    scene.add(ring);
    const drops = Array.from({ length: Math.round(7 * k) }, () => {
      const m = toonMesh(GEO.sphere, '#e8f6ff', { scale: [0.045, 0.055, 0.045], outline: false, shadow: false }), a = Math.random() * Math.PI * 2, v = (0.7 + Math.random()) * k;
      m.position.copy(ring.position);
      scene.add(m);
      return { m, vx: Math.cos(a) * v, vy: (2.2 + Math.random() * 1.4) * Math.sqrt(k), vz: Math.sin(a) * v };
    });
    splashes.push({ ring, drops, t: 0, k });
  }
  let heldFish = null; // { g, t, from }
  /** 낚은 것 모형: 몸통 · 꼬리 · 눈(크기만큼 크게), 문어는 둥근 머리에 다리, 빈 깡통은 깡통. 몸 길이는 z 쪽. */
  function fishModel(id) {
    const F = FISH[id], g = new THREE.Group(), s = [0.8, 1.1, 1.45][F.size];
    const part = (geo, c, o) => g.add(toonMesh(geo, c, { shadow: false, ...o }));
    if (id === 'can') {
      part(GEO.cylinder, F.color, { position: [0, -0.13, 0], scale: [0.09, 0.26, 0.09], outline: 0.015 });
      part(GEO.cylinder, '#e0524f', { position: [0, -0.06, 0], scale: [0.093, 0.1, 0.093], outline: false });
      return g;
    }
    if (id === 'octopus') {
      part(GEO.sphere, F.color, { position: [0, 0.06, 0], scale: [0.16, 0.15, 0.16], outline: 0.015 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        part(GEO.cone, F.color, { position: [Math.cos(a) * 0.08, 0.02, Math.sin(a) * 0.08], rotation: [Math.PI - Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5], scale: [0.035, 0.2, 0.035], outline: 0.01 });
      }
      [-1, 1].forEach((sd) => part(GEO.dot, '#3a2a28', { position: [sd * 0.06, 0.08, 0.135], scale: [0.025, 0.025, 0.02], outline: false }));
      return g;
    }
    part(GEO.sphere, F.color, { scale: [0.07 * s, 0.1 * s, 0.2 * s], outline: 0.015 });
    part(GEO.cone, F.color, { position: [0, 0, -0.3 * s], rotation: [Math.PI / 2, 0, 0], scale: [0.03 * s, 0.13 * s, 0.11 * s], outline: 0.012 });
    if (id === 'rainbow') part(GEO.sphere, '#f7c6d4', { scale: [0.072 * s, 0.03 * s, 0.17 * s], outline: false });
    [-1, 1].forEach((sd) => part(GEO.dot, '#3a2a28', { position: [sd * 0.058 * s, 0.03 * s, 0.12 * s], scale: [0.018, 0.018, 0.018], outline: false }));
    return g;
  }
  function jumpFish(id, from) {
    if (heldFish) scene.remove(heldFish.g);
    const g = fishModel(id);
    g.position.copy(from);
    scene.add(g);
    heldFish = { g, t: 0, from: from.clone() };
  }
  const fishTop = new THREE.Vector3();
  /** 매 프레임: 물보라를 퍼뜨리고, 낚은 물고기를 머리 위로 날려 잠깐 들고 있다가 치운다. */
  function updateCatchFx(dt) {
    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i];
      sp.t += dt;
      sp.ring.scale.setScalar(0.1 + sp.t * 2.4 * sp.k);
      sp.ring.material.opacity = Math.max(0, 0.85 * (1 - sp.t / 0.7));
      for (const d of sp.drops) { d.vy -= 9 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; }
      if (sp.t > 0.7) { scene.remove(sp.ring); sp.ring.material.dispose(); sp.drops.forEach((d) => scene.remove(d.m)); splashes.splice(i, 1); }
    }
    if (!heldFish) return;
    const h = heldFish, g = h.g, p = player.position;
    h.t += dt;
    fishTop.set(p.x, 1.8, p.z);
    if (h.t < 0.6) {
      const k = h.t / 0.6;
      g.position.lerpVectors(h.from, fishTop, k);
      g.position.y += Math.sin(k * Math.PI) * 1.3;
      g.rotation.set(h.t * 14, Math.PI / 2, 0);
    } else if (h.t < 2.4) {
      g.position.set(fishTop.x, fishTop.y + Math.sin(h.t * 5) * 0.04, fishTop.z);
      g.rotation.set(0, Math.PI / 2, Math.sin(h.t * 4) * 0.18);
      g.scale.setScalar(1.5 + Math.max(0, 0.25 - (h.t - 0.6)) * 1.6); // 들어 올리면 크게 보이게(잡는 순간 살짝 더 커졌다 돌아온다)
    } else if (h.t < 2.7) {
      g.scale.setScalar(Math.max(0.01, 1.5 * (1 - (h.t - 2.4) / 0.3)));
    } else { scene.remove(g); heldFish = null; }
  }
  function fishCatch() {
    const id = fishing.fish, F = FISH[id], from = bobber.position.clone();
    cancelFish();
    // 낚시 일감(core/jobs.js)의 그 물고기면 가방 대신 일감에 센다
    const forJob = !F.junk && jobKind() === id && !isComplete(state.job), before = state.job;
    let s = state;
    if (forJob) s = { ...s, job: recordPull(s.job, id, 'snapped') };
    else {
      const r = addItem(state, id, 1);
      if (!r.added) { hud.toast('가방이 꽉 찼어요'); return; }
      s = r.state;
    }
    const cm = fishLength(id), lg = logFish(s, id, cm);
    commit(lg.state);
    if (forJob) celebrateIfDone(before, state.job); else hud.bagBump();
    splash(from, F.junk ? 0.6 : 1.3);
    jumpFish(id, from);
    if (F.junk) {
      sound.play('can');
      fishGame.catchCard({ title: `${F.name}…`, art: itemSvg(id), chips: ['물이 깨끗해졌어요'], junk: true });
      return;
    }
    sound.play('done');
    player.cheerTime = 2.0;
    const T = forJob && JOB_TYPES[state.job.typeId];
    fishGame.catchCard({ title: `${josa(F.name, '을/를')} 낚았어요!`, art: itemSvg(id), chips: [`${cm}cm`, T ? `일감 ${state.job.count} / ${T.target}` : `팔면 ${won(F.sell)}`], ribbon: lg.first ? '처음 잡았어요!' : lg.best ? '최고 기록!' : null });
  }
  /**
   * 행동 버튼(down: 눌렀다 · 뗐다): 기다릴 때 누르면 너무 일러 놓치고, 찌가 잠기면 낚아채 끌어올리기 놀이로,
   * 놀이 중에는 누르고 있는 동안 초록 칸이 올라간다.
   */
  function fishPress(down) {
    const f = fishing;
    if (f.phase === 'reel') { f.hold = down; return; }
    if (!down || f.phase === 'cast') return;
    if (f.phase === 'wait') { fishFail('너무 일렀어요…'); return; }
    // 찌가 잠겼을 때 낚아챘다: 쓰레기는 바로 올라오고, 물고기는 끌어올리기 놀이
    if (FISH[f.fish].junk) { fishCatch(); return; }
    f.phase = 'reel';
    f.t = 0;
    f.reel = startReel(f.fish);
    f.hold = true; // 낚아챈 손을 그대로 누르고 있다
    player.mode = 'pull';
    sound.play('splash');
    splash(bobber.position, 0.8);
  }
  function updateFish(dt) {
    const f = fishing;
    if (!f) return;
    if (panels.isOpen() || guide.open || sleeping) { cancelFish(); return; }
    f.t += dt;
    const tip = rodTip(), s = f.spot, wy = waterY(s.x, s.z);
    if (f.phase === 'cast') {
      // 대 끝에서 포물선으로 날아가 물에 퐁
      const k = Math.min(1, f.t / 0.45);
      bobber.position.set(tip.x + (s.x - tip.x) * k, tip.y + (wy - tip.y) * k + Math.sin(k * Math.PI) * 0.9, tip.z + (s.z - tip.z) * k);
      bobber.visible = true;
      if (k >= 1) { f.phase = 'wait'; f.t = 0; sound.play('splash'); splash(s, 0.4); }
    } else {
      let by = wy, ox = 0, oz = 0;
      if (f.phase === 'wait') {
        const nib = f.nibbles.some((n) => f.t > n && f.t < n + 0.18); // 톡: 살짝 가라앉았다 뜬다
        by = wy + Math.sin(f.t * 3) * 0.015 - (nib ? 0.05 : 0);
        if (f.t >= f.biteAt) {
          f.phase = 'bite';
          f.t = 0;
          f.fish = pickFish(f.water, hourOf(state.clock));
          sound.play('splash');
          splash(s, 0.7);
          hud.floatText({ x: s.x, y: 0.8, z: s.z, text: '!', kind: 'tip' });
        }
      } else if (f.phase === 'bite') {
        by = wy - 0.12; // 퐁 잠겼다
        if (f.t > rulesOf(f.fish).window) { fishFail('도망갔다…'); return; }
      } else {
        f.reel = stepReel(f.reel, dt, f.hold);
        const R = f.reel;
        by = wy - (R.inside ? 0.1 : 0.05);
        ox = (R.fish - 0.5) * 0.8 + Math.sin(f.t * 17) * 0.05; // 물고기가 도망치는 쪽으로 찌가 끌려 다닌다
        oz = Math.cos(f.t * 13) * 0.06;
        player.power = R.progress;
        fishGame.show(R, rulesOf(f.fish).game.zone, FISH[f.fish].size, f.hold);
        if (R.done === 'caught') { fishCatch(); return; }
        if (R.done === 'lost') { fishFail('놓쳤어요…'); return; }
      }
      bobber.position.set(s.x + ox, by, s.z + oz);
    }
    // 줄: 대 끝 → 찌
    const pos = fishLine.geometry.attributes.position;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, bobber.position.x, bobber.position.y + 0.06, bobber.position.z);
    pos.needsUpdate = true;
    fishLine.visible = true;
  }
  const fishLabel = () => (fishing.phase === 'reel' ? '꾹 누르기' : fishing.phase === 'bite' ? '지금!' : '기다리는 중');
  function cancelPull() {
    cancelGlow(); // 털뭉치에 손을 뻗던 중이어도(창이 열리거나 연출이 시작되면) 그만둔다
    cancelFish(); // 낚시하던 중이어도
    if (!pulling) return;
    if (pulling.weed.guest) multi.act({ t: 'drop', id: pulling.weed.id });
    weeds.tug(pulling.weed, 0);
    delete pulling.weed.busy;
    pulling = null;
    sound.chargeStop();
    player.busy = false;
    player.mode = 'idle';
    player.power = 0;
    hud.hideMeter();
  }

  /** tooLong: 끝까지 갔다가 왼쪽 끝으로 돌아올 때까지 누르고 있었다(그대로 끊어진다). */
  function endPull(tooLong = false) {
    const { weed, pull } = pulling;
    // 결과는 위 알림 줄 대신 풀 위에서 톡. fx: 같은 마을 사람들 화면에도 띄울 글씨(FX_TEXT)
    const pop = (text, kind, fx) => { hud.floatText({ x: weed.x, y: 1.15, z: weed.z, text, kind }); if (fx) shareFx(fx, weed.x, weed.z); };
    pulling = null;
    sound.chargeStop();
    player.busy = false;
    player.mode = 'idle';
    player.power = 0;
    hud.hideMeter();
    weeds.tug(weed, 0);
    delete weed.busy;
    const step = releasePull(pull), W = WEED_KINDS[weed.kind];
    sound.play(step === 'clean' ? 'clean' : step === 'snapped' ? 'snap' : 'none');
    if (step === 'none') { if (weed.guest) multi.act({ t: 'drop', id: weed.id }); pop('조금 더 꾹~', 'tip'); return; }

    let next = useStamina(state, Math.min(state.stamina, pullStamina(weed.kind, step))).state; // 독이 튀어도 남은 기운까지만
    if (W.poison && step === 'snapped') pop('윽, 독이 튀었다!', 'snap', 'poison');
    else if (tooLong) pop('너무 오래 당겼다…', 'snap', 'long');
    // 여러 번에 나눠 뽑는 풀: 아직 남았으면 조금 올라온 채로 두고 다시 누르게
    const prog = advanceWeed({ stage: weed.stage, flawed: weed.flawed }, weed.kind, step);
    if (!prog.done) {
      weed.flawed = prog.flawed;
      weeds.loosen(weed, prog.stage);
      if (weed.guest) multi.act({ t: 'weed', id: weed.id, stage: prog.stage, flawed: !!prog.flawed }); // 친구 마을 풀: 주인 마을에서도 올라오게
      if (!(W.poison && step === 'snapped') && !tooLong) pop(`한 번 더! ${prog.stage} / ${W.stages || 1}`, 'tip');
      state = next;
      save();
      return;
    }
    // 끊어진 풀은 못 얻는다(core/weeding.js 의 gotWeed): 일감 개수 · 가방 · 도감(퀘스트도 도감 수로 센다) · 같이 풀 뽑기에 넣지 않는다. 경험치는 조금
    const result = prog.final, got = gotWeed(result);
    const log = state.weedLog || {}, first = got && !log[weed.kind];
    next = {
      ...next, license: gainXp(next.license, result, weed.kind), ...(got ? { weedLog: { ...log, [weed.kind]: (log[weed.kind] || 0) + 1 } } : {}),
      stats: { pulled: next.stats.pulled + 1, clean: next.stats.clean + (result === 'clean' ? 1 : 0) }
    };
    const counted = got && next.job && JOB_TYPES[next.job.typeId].kind === weed.kind && !isComplete(next.job);
    if (counted) next = { ...next, job: recordPull(next.job, weed.kind, result) };
    else if (got) {
      // 일감에 안 세는 풀은 가방에 모아 둔다(일감을 받으면 바로 낼 수 있다)
      const a = addItem(next, weed.kind, 1, result === 'clean' ? 1 : 0);
      next = a.state;
      if (a.added) hud.bagBump(); else hud.toast('가방이 꽉 찼어요');
    }
    weeds.remove(weed, result);
    if (weed.guest) multi.act({ t: 'weed', id: weed.id, done: result }); // 친구 마을 풀: 주인 마을에서도 뽑힌다(얻은 풀은 내 가방에)
    if (first && weed.kind !== 'weed') hud.banner('새 풀!', W.name, 2400);
    else if (!(W.poison && step === 'snapped') && !tooLong) pop(result === 'clean' ? '깔끔!' : '끊어졌다…', result === 'clean' ? 'clean' : 'snap', result === 'clean' ? 'clean' : 'snap');

    if (next.exam && examCounts(next.exam, weed.kind)) {
      const exam = examStep(next.exam, result);
      if (exam.done) {
        if (exam.passed) {
          next = { ...next, exam: null, license: promote(next.license, next.clock.day, myLook()) };
          sound.play('pass');
          const unlocked = kindsOfGrade(next.license.grade);
          showLicenseCard('weed', `제초 검정 ${next.license.grade}급 합격!`, next, unlocked.length ? { sub: '이제 이 풀도 뽑을 수 있어요', chips: unlocked.map((k) => ({ icon: itemSvg(k), text: WEED_KINDS[k].name })) } : null);
          staffSay('captain', 'pass', 16, player.position);
          if (state.license.grade >= NOVICE) cheerGrade5(); // 첫 자격(견습 → 5급): 안내해 준 하치와레가 축하
          player.cheerTime = 2;
        } else {
          // 불합격: 작은 알림 한 줄로는 떨어진 줄도 몰랐다 → 자격증 필기처럼 가운데 '불합격' 도장 카드. 설명은 짧게 한 마디만
          const g = next.license.grade;
          next = { ...next, exam: null };
          sound.play('fail');
          hud.notice({ kicker: `제초 검정 ${gradeName(g - 1)} 시험`, stamp: '불합격', tone: 'bad', sub: '승급 시험에 떨어졌어요', ok: '다시 해 볼게요' });
          staffSay('captain', 'fail', 16, player.position);
        }
      } else next = { ...next, exam };
    }
    celebrateIfDone(state.job, next.job);
    state = next;
    if (got && !counted && !state.exam && !seen('bag-herb')) {
      markSeen('bag-herb');
      hud.toast('뽑은 풀은 주머니로', 2600);
    }
    if (examDue() && !seen('exam-' + state.license.grade)) { // 견습 → 5급은 하치와레가 알려 준다(updateGrade5Guide)
      markSeen('exam-' + state.license.grade);
      announceExam();
    }
    if (got) didAct('weed'); // 일상 부탁: 같이 풀 뽑기
    save();
  }

  // ---------- 하치와레의 첫날 안내 ----------
  const GOALS = { house: '하치와레를 따라가자!', board: '노동 접수에서 일감을 받자!', pull: '풀을 뽑아 보자!', report: '보수를 받으러 가자!', phone: '마을폰을 열어 보자!' };
  // 할 일 카드 밑줄: 설명서 말투 말고 하치와레가 옆에서 말하듯
  const GOAL_HINTS = { house: '하얀 동그란 집이 내 집이래!', board: '하치와레를 따라 게시판으로!', pull: '꾹 눌렀다가 초록 칸에서 톡!', report: '하치와레가 게시판에서 기다려!', phone: '오른쪽 위 폰 버튼을 톡!' };
  let tutPhoneOpened = false; // 안내 'phone' 단계에서 마을폰을 열어 봤는지(닫으면 하치와레가 마을폰 이야기를 한다)
  const homeLabel = village.labels.find((l) => l.text === '내 집');
  const homeLead = { get x() { return village.spots.home.x + 1.1; }, get z() { return village.spots.home.z + 0.6; } }; // 하치와레가 서서 기다리는 현관 옆(넓힌 집이면 그 문 옆)
  const boardLead = { x: village.spots.board.x + 1.4, z: village.spots.board.z + 0.2 }; // 노동 접수 게시판 옆(내가 서는 게시판 앞자리는 비워 둔다)
  const nearHome = () => !!player && Math.hypot(player.position.x - village.spots.home.x, player.position.z - village.spots.home.z) < 2.6;
  const boardSign = village.labels.find((l) => l.text === '노동 접수'); // '여기!' 는 게시판 간판 바로 위에
  const benchSign = village.labels.find((l) => l.text === '스티커 작업대');
  /** 하치와레가 말한다. 말하는 동안은 움직이지 않는다. */
  function sayGuide(lines, then) {
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    guide.say(lines, () => { input.setEnabled(true); then?.(); });
  }
  /** 안내 단계로 들어간다: 저장하고, 하치와레가 따라다닐지 정하고, 그 단계의 말을 한다. */
  function enterTutorial(step, from) {
    state = { ...state, tutorial: step };
    save();
    npcs.setFollow('hachiware', tutorialActive(step));
    guide.setGoal(GOALS[step] || null, { hold: true }); // 할 일 쪽지는 말이 끝나고 가운데 카드가 날아와 꽂힐 때 나타난다(announceGoal)
    // 집 · 노동 접수 안내 중에는 하치와레가 앞장서서 그 앞(현관 옆 · 게시판 옆)에서 기다린다. 풀 뽑기는 뒤를 졸졸 따라다닌다
    npcs.lead('hachiware', step === 'house' || step === 'houseTour' ? homeLead : step === 'board' || step === 'report' ? boardLead : null);
    if (step === 'hello') sayGuide(TUTORIAL_LINES.hello, () => enterTutorial('house', 'hello'));
    else if (step === 'houseTour') sayGuide(TUTORIAL_LINES.houseTour, () => enterTutorial('board', 'houseTour'));
    else if (step === 'tips') sayGuide(TUTORIAL_LINES.tips, () => enterTutorial('phone', 'tips'));
    else if (step === 'phone') { tutPhoneOpened = false; sayGuide(TUTORIAL_LINES.phone, () => announceGoal(step)); }
    else if (step === 'phoneTour') sayGuide(TUTORIAL_LINES.phoneTour, () => { enterTutorial('done', 'phoneTour'); hud.toast('안내 끝!', 2400); });
    else if (step === 'board') sayGuide(from === 'pull' || from === 'report' ? TUTORIAL_LINES.boardAgain : TUTORIAL_LINES.board, () => announceGoal(step));
    else if (TUTORIAL_LINES[step]) sayGuide(TUTORIAL_LINES[step], () => announceGoal(step));
    else announceGoal(step);
  }
  /** 할 일 카드: 부탁을 받을 때처럼 가운데에 톡 떴다가 왼쪽 위 할 일 쪽지로 날아가 꽂힌다. 그새 단계가 바뀌었으면 띄우지 않는다. */
  let goalCardAt = -1e9;
  function announceGoal(step) {
    if (!state || state.tutorial !== step || !GOALS[step]) return;
    goalCardAt = performance.now();
    sound.play('job');
    hud.announce({ kicker: '할 일!', title: GOALS[step], sub: GOAL_HINTS[step], target: guide.goalEl, look: 'goal' });
  }
  // ---------- 제초 5급 안내: 견습이 5급 시험을 볼 수 있게 되면 하치와레가 달려와 알려 주고 검정소로 앞장선다 ----------
  const examSign = village.labels.find((l) => l.text === '검정소');
  const examLead = { x: village.spots.exam.x + 1.3, z: village.spots.exam.z + 0.8 }; // 하치와레가 서서 기다리는 검정소 문 옆
  const GRADE5_GOAL = '검정소에서 5급 시험을 보자!';
  const TIMES = ['', '한', '두', '세', '네', '다섯']; // 말로 할 때 '3번' 대신 '세 번'
  let grade5Call = null; // 하치와레가 달려오는 중 { t }
  let grade5Shown = false; // 할 일 쪽지 · 검정소 위 '여기!' 를 띄우는 중
  /** 견습이 5급 시험을 볼 수 있고, 아직 시험 중이 아니며, 첫날 안내도 끝났는지. */
  const grade5Due = () => !!state && state.license.grade >= NOVICE && canTakeExam(state.license) && !state.exam && !tutorialActive(state.tutorial);
  /** 하치와레가 지금 달려올 수 있는지(집 안 · 잠 · 같이 토벌 · 다른 안내 중이면 기다린다). */
  const hachiFree = (n) => !!n && !n.away && !n.party && !n.lead && !n.follow && !buddies.has('hachiware') && !isSleepHour(hourOf(state.clock));
  function updateGrade5Guide(dt) {
    if (!grade5Due()) {
      if (grade5Call) { grade5Call = null; npcs.setFollow('hachiware', false); }
      if (grade5Shown) { grade5Shown = false; guide.setGoal(null); npcs.lead('hachiware', null); }
      return;
    }
    // 이미 알려 줬으면(저장을 불러와도) 할 일 쪽지만 계속
    if (seen('guide-grade5')) { if (!grade5Shown && !grade5Call) { grade5Shown = true; guide.setGoal(GRADE5_GOAL, { top: true }); } return; }
    const n = npcs.byKind('hachiware');
    if (grade5Call) {
      // 달려오는 중: 가까이 오면(또는 오래 걸리면) 말을 건다. 그새 바빠지면 기다렸다가
      grade5Call.t += dt;
      const near = n && player && Math.hypot(n.x - player.position.x, n.z - player.position.z) < 2.4;
      if ((near || grade5Call.t > 9) && mode === 'play' && !guide.open && !panels.isOpen() && !sleeping && !funBusy() && !pulling) callGrade5(n);
      return;
    }
    if (mode !== 'play' || guide.open || panels.isOpen() || sleeping || funBusy() || fainting || pulling || questScene || !hachiFree(n)) return;
    grade5Call = { t: 0 };
    npcs.setFollow('hachiware', true); // 내 쪽으로 달려온다
  }
  function callGrade5(n) {
    grade5Call = null;
    markSeen('guide-grade5');
    npcs.setFollow('hachiware', false);
    if (n) beginTalk(n);
    sayGuide([
      '{name}~! 잠깐잠깐!',
      '잡초 뽑는 솜씨가 엄청 늘었다~!',
      '이제 제초 5급 시험을 볼 수 있어!',
      `잡초를 ${TIMES[EXAM_STREAK[NOVICE]]} 번 연달아 깔끔하게 뽑으면 합격이야~`,
      `시험 값은 ${won(EXAM_FEE[NOVICE])}! 5급이 되면 토끼풀도 뽑을 수 있어~`,
      '같이 가자! 따라와~!'
    ].map(fillName), () => {
      if (n) { endTalk(); npcs.lead('hachiware', examLead); } // 검정소 문 옆까지 앞장서서 기다린다
      if (!grade5Due()) return;
      grade5Shown = true;
      guide.setGoal(GRADE5_GOAL, { hold: true, top: true });
      sound.play('job');
      hud.announce({ kicker: '할 일!', title: '제초 5급을 따자!', sub: '검정소에 가서 시험 보자!', target: guide.goalEl, look: 'goal' });
    });
  }
  // ---------- 승급 시험 알림(5급 → 4급부터): 위에 뜨는 작은 알림 한 줄은 못 보고 지나치기 쉬웠다. 가운데에 큼직한 카드가 떴다가
  // 할 일 쪽지로 꽂히고, 시험을 볼 때까지 할 일 쪽지와 검정소 위 '여기!' 가 남는다 ----------
  let examGoal = null; // 할 일 쪽지에 띄운 승급 시험 글(없으면 null)
  const examGoalText = () => `검정소에서 ${gradeName(state.license.grade - 1)} 시험을 보자!`;
  /** 견습이 아닌 급수에서 다음 급수 시험을 볼 수 있고, 아직 시험 중이 아닌지. */
  const examDue = () => !!state && state.license.grade < NOVICE && canTakeExam(state.license) && !state.exam;
  function announceExam() {
    examGoal = examGoalText();
    guide.setGoal(examGoal, { hold: true, top: true }); // 쪽지는 카드가 날아와 꽂힐 때 나타난다(화면 위 가운데)
    sound.play('job');
    hud.announce({ kicker: '승급 시험!', title: `제초 ${gradeName(state.license.grade - 1)} 시험을 볼 수 있어요!`, sub: '검정소에 가서 시험 보자!', target: guide.goalEl, look: 'goal',
      chips: [{ icon: ICO.pin, text: '검정소' }, { icon: 'coin', text: won(EXAM_FEE[state.license.grade]) }] });
  }
  /**
   * 제초 승급 시험: 토벌 실기처럼 위 가운데 노란 알약에 진행(깔끔하게 연속 ●○)을 크게. 실기 · 술래잡기가 알약을 쓰는 동안은 비켜 준다.
   * 시험에 세는 풀은 마을에서 그 풀 위에 노란 화살표, 알약에도 그 풀 그림 · 이름.
   */
  function updateExamPill() {
    const examWeeds = state.exam && !state.exam.done ? examKinds(state.exam) : [];
    weeds.setHint(examWeeds);
    if (state.exam && !hunterExam && !tag && !downed) {
      const need = state.exam.need || 5, got = Math.min(state.exam.streak, need);
      // 세로 휴대폰은 좁아서 풀은 그림만 · 숫자(●○ 와 같은 뜻)는 뺀다(narrow)
      hud.setTimer(['승급 시험', ...examWeeds.map((k) => ({ icon: itemSvg(k), text: WEED_KINDS[k].name, narrow: 'icon' })), { text: '●'.repeat(got) + '○'.repeat(need - got) }, { text: `${got} / ${need}`, narrow: 'hide' }]);
      examPill = true;
    } else if (examPill) { examPill = false; if (!hunterExam && !tag) hud.setTimer(null); }
  }
  /** 시험을 보거나 급수가 오르면 쪽지를 걷고, 불러온 저장에서 이미 알려 준 시험이면 쪽지만 다시 띄운다. */
  function updateExamGoal() {
    if (!examDue() || tutorialActive(state.tutorial)) { if (examGoal) { examGoal = null; guide.setGoal(null); } return; }
    if (!examGoal && seen('exam-' + state.license.grade)) { examGoal = examGoalText(); guide.setGoal(examGoal, { top: true }); }
  }
  /** 첫 자격(견습 → 5급)을 따면 곁의 하치와레가 축하한다. */
  function cheerGrade5() {
    const n = npcs.byKind('hachiware');
    if (!n || n.away || !player || Math.hypot(n.x - player.position.x, n.z - player.position.z) > 14) return;
    setTimeout(() => npcs.say(n, '축하해~! 이제 토끼풀도 뽑을 수 있어!'), 900);
  }
  /** 가야 할 곳 위에 '여기!' 표시. */
  function tutorialMarker() {
    const step = state && state.tutorial;
    // 안내가 끝난 뒤에도 일감을 다 하면 게시판 위에 '여기!'
    const jobDone = state && state.job && isComplete(state.job);
    // 집 안내(첫날, 또는 하치와레에게 집을 물었을 때): 내 집 간판 위에
    if (step === 'house' || escort) return { id: 'guide', x: homeLabel.x, y: homeLabel.y + 0.9, z: homeLabel.z, text: '여기!', kind: 'mark' };
    if (step === 'board' || step === 'report' || jobDone) return { id: 'guide', x: boardSign.x, y: boardSign.y + 0.9, z: boardSign.z, text: '여기!', kind: 'mark' };
    if (grade5Shown || examGoal) return { id: 'guide', x: examSign.x, y: examSign.y + 0.9, z: examSign.z, text: '여기!', kind: 'mark' }; // 제초 승급 시험 보러
    // 다른 작업 일감 중이면 어디서 하는지 표시: 스티커는 작업대, 열매는 가장 가까운 열린 덤불
    const kind = state && state.job && JOB_TYPES[state.job.typeId].kind;
    if (kind === 'sticker') return { id: 'guide', x: benchSign.x, y: benchSign.y + 0.9, z: benchSign.z, text: '여기!', kind: 'mark' };
    if (kind === 'berry' && player) {
      const b = berries.nearestReady(player.position.x, player.position.z, 60);
      if (b && Math.hypot(b.x - player.position.x, b.z - player.position.z) > 1.6) return { id: 'guide', x: b.x, y: 1.4, z: b.z, text: '열매!', kind: 'mark' };
    }
    // 반짝 털뭉치 일감(밤): 가까운 빛나는 버섯 위에(털뭉치가 앉아 있는 것만)
    if (kind === 'glowfluff' && player && !isComplete(state.job)) {
      const s = glows.nearest(player.position.x, player.position.z, 60);
      if (s && Math.hypot(s.x - player.position.x, s.z - player.position.z) > 1.8) return { id: 'guide', x: s.x, y: 1.8, z: s.z, text: '털뭉치!', kind: 'mark' };
    }
    if (step === 'pull' && player) {
      const w = weeds.nearest(player.position.x, player.position.z, 40, 'weed');
      if (w && Math.hypot(w.x - player.position.x, w.z - player.position.z) > 1.4) return { id: 'guide', x: w.x, y: 1.1, z: w.z, text: '풀!', kind: 'mark' };
    }
    // 잡초 말고 다른 풀 일감: 가까이(30 안)에 그 풀이 있으면 위에 이름표
    if (kind && kind !== 'weed' && WEED_KINDS[kind] && player && !jobDone) {
      const w = weeds.nearest(player.position.x, player.position.z, 30, kind);
      if (w && Math.hypot(w.x - player.position.x, w.z - player.position.z) > 1.6) return { id: 'guide', x: w.x, y: (kind === 'giantweed' ? 1.9 : 1.1), z: w.z, text: WEED_KINDS[kind].name, kind: 'mark' };
    }
    return null;
  }

  let homeTarget = null; // 집 안에서 지금 누르면 할 일
  input.onAction((down) => {
    actionDown = down;
    if (!down) fishRelease = false; // 낚시가 끝난 뒤 버튼을 뗐다: 이제 다시 던질 수 있다
    if (mode === 'visit' && drill) { if (down) drillPress(); return; } // 랏코네 수련: 바늘이 초록일 때 누른다
    if (mode === 'visit' && down && homeTarget && state && !sleeping && !panels.isOpen() && !guide.open) {
      if (homeTarget.type === 'door') exitVisit();
      else if (homeTarget.type === 'host') talkTo(npcs.byKind(visit.kind));
      else if (homeTarget.type === 'act') doHomeAct(visit.kind);
      return;
    }
    // 친구 집: 나가기만(친구 보관 상자는 열 수 없다)
    if (mode === 'guesthome') {
      if (!down || !homeTarget || panels.isOpen() || guide.open) return;
      if (homeTarget.type === 'door') exitHostHome();
      else if (homeTarget.type === 'chestLocked') { sound.play('none'); hud.toast(`${multi.hostName || '친구'}의 보관 상자는 열 수 없어요`, 2400); }
      return;
    }
    if (mode === 'home' && down && homeTarget && state && !sleeping && !panels.isOpen() && !homeUI.decorating && !guide.open) {
      if (homeTarget.type === 'bed') askSleep();
      else if (homeTarget.type === 'wardrobe') { interior.faceCamera(); panels.openWardrobe(); }
      else if (homeTarget.type === 'chest') { sound.play('click'); panels.openStorage(); }
      else if (homeTarget.type === 'door') exitHome();
      return;
    }
    if (mode === 'club') { if (down && usagiClub && !guide.open) usagiClub.press(); return; } // 우사기 클럽: 박자 맞추기
    if (mode === 'idol') { if (down && idolStory && !guide.open) idolStory.press(); return; } // 파자마 파티즈 무대: 박자(박자 화면도 스스로 스페이스 · 탭을 받는다)
    if (mode === 'island') { if (down && islandTrip.roaming && !guide.open) islandTrip.press(); return; } // 수상한 섬: 직접 걸을 때만 행동 버튼(놀이 화면은 자기 버튼 · 스페이스로)
    if (mode === 'bonbon') { if (down && bonbonStory && !guide.open) bonbonStory.press(); return; } // 위스키 봉봉 숲속 빈터: 배 두드리기(박자 · 펀치 화면도 스스로 받는다)
    if (mode === 'beetle') return; // 스위치 바위산 기슭: 대사 · 고르기 창만
    if (mode === 'diner') { if (starDiner && !guide.open) starDiner.press(down); return; } // 별 세 개 레스토랑: 누르는 동안 다음 쇠고랑을 꾹
    if (mode === 'chiiroom') return; // 검은 별똥별 방: 연타는 놀이 화면이 스스로 받는다
    if (mode === 'play' && down && usagiClub && usagiClub.active && !guide.open && !panels.isOpen()) { usagiClub.press(); return; }
    if (mode === 'play' && down && hachiPit && hachiPit.active && !guide.open && !panels.isOpen()) { hachiPit.press(); return; } // 밧줄 당기기(영차!)
    if (!state || mode !== 'play' || guide.open || sleeping || sticker || funBusy()) return;
    if (fishing) { if (!panels.isOpen()) fishPress(down); return; } // 낚시: 찌가 잠길 때 낚아채기 · 끌어올리기 놀이(누르고 있기)
    if (fishRelease && down) return; // 낚시가 끝났을 때 누르고 있던 버튼(키 반복 포함)으로는 다시 던지지 않는다 — 한 번 떼고 다시 눌러야 던진다
    if (!down) {
      if (glowTry) { if (panels.isOpen()) cancelGlow(); else endGlow(); return; } // 털뭉치: 손을 뗀 순간의 빛으로
      if (pulling) { if (panels.isOpen()) cancelPull(); else endPull(); }
      return;
    }
    if (panels.isOpen() || fainting) return;
    if (downed) { giveUpDown(); return; } // 쓰러져 있을 때 행동 버튼: 그만 기다리기
    if (pulling) return;
    // 자동차에 탄 채 행동 버튼: 내려서 그 일을 한다(할 일이 없으면 내리기만)
    if (player.riding) { getOffCar(); if (!target && !(weaponNow() && !visiting)) return; }
    // 대상이 없어도 무기를 들고 있으면 허공에 휘두른다
    if (!target) { if (weaponNow() && !visiting) doSwing(); return; } // 친구 마을에서는 무기를 휘두르지 않는다(대상도 풀 · 열매 · 가게만)
    if (target.type === 'attack') doSwing();
    else if (target.type === 'pickup') pickUpGround(target.g);
    else if (target.type === 'weed') beginPull(target.weed);
    else if (target.type === 'fish') beginFish(target.spot);
    else if (target.type === 'noRod') hud.toast('낚싯대가 있어야 낚시할 수 있어요', 3200, { chips: [{ icon: ICO.pin, text: `도구점 ${won(TOOLS.rod.price)}` }] });
    else if (target.type === 'flower') pickPlazaFlower(target.i);
    else if (target.type === 'rest') startRest(target.seat);
    else if (target.type === 'bell') ringClockBell();
    else if (target.type === 'friendHome') knockHome(target.kind);
    else if (target.type === 'npc' && target.npc.kind === 'hachiware' && tutorialActive(state.tutorial) && TUTORIAL_LINES[state.tutorial]) {
      sayGuide(TUTORIAL_LINES[state.tutorial]); // 안내 중에 하치와레에게 말을 걸면 지금 할 일을 다시 알려 준다
    } else if (target.type === 'npc') talkTo(target.npc);
    else if (target.type === 'board') panels.openBoard();
    else if (target.type === 'exam') panels.openExam();
    else if (target.type === 'ramen') panels.openShop();
    else if (target.type === 'furniture') panels.openFurniture();
    else if (target.type === 'realty') panels.openRealty();
    else if (target.type === 'home') {
      if (isEvicted(state)) hud.toast('쫓겨나서 못 들어가요', 3400, { chips: [{ text: '부동산으로' }] });
      else enterHome();
    } else if (target.type === 'pochette') panels.openPochette();
    else if (target.type === 'pub') panels.openPub();
    else if (target.type === 'books') panels.openBooks();
    else if (target.type === 'salon') panels.openSalon();
    else if (target.type === 'tools') panels.openTools();
    else if (target.type === 'raffle') panels.openRaffle();
    else if (target.type === 'donation') panels.openWorks();
    else if (target.type === 'wake') wakeAlly(target.npc);
    else if (target.type === 'wish') startWish();
    else if (target.type === 'pit') hachiPit.press();
    else if (target.type === 'rough') sleepRough();
    else if (target.type === 'factory') startSticker();
    else if (target.type === 'berry') pickBerry(target.bush);
    else if (target.type === 'glow') beginGlow(target.shroom);
    else if (target.type === 'wakeMp') wakeFriend(target);
    else if (target.type === 'mpTalk') talkToPlayer(target);
    else if (target.type === 'hostHome') enterHostHome();
  });

  // ---------- 친구와 이야기 · 놀기 ----------
  let talking = null; // 대화 중인 친구
  let tag = null; // 술래잡기 { n, t: 남은 초 }
  let examPill = false; // 제초 승급 시험 진행을 위 가운데 알약에 띄우는 중
  const MONSTER_SEE = 18; // 이 거리 안 몬스터는 앞을 가리는 나무를 반투명하게
  let dance = null; // 같이 춤추기 { n, t }
  let escort = false; // 하치와레가 집까지 앞장서는 중
  let overlay = false; // 시험 · 알바 창이 열려 있다
  let starShow = null; // 별똥별 소원 연출 중(아래 별똥별 밤 참고)
  let usagiClub = null; // 사이드스토리 '우사기의 집' 연출(stories/usagiclub.js — 아래에서 만든다)
  let islandTrip = null; // 사이드스토리 '수상한 섬 합숙'(stories/island.js — 아래에서 만든다)
  let hachiPit = null; // 사이드스토리 '하치와레가 구덩이에!'(stories/hachipit.js — 아래에서 만든다)
  let pajama = null; // 사이드스토리 '잠옷 밤나들이'(stories/pajama.js — 아래에서 만든다)
  let idolStory = null; // 사이드스토리 '파자마 파티즈'(stories/pajamaidol.js — 아래에서 만든다)
  let starDiner = null; // 사이드스토리 '별 세 개 레스토랑'(stories/stardiner.js — 아래에서 만든다)
  let bonbonStory = null; // 사이드스토리 '위스키 봉봉'(stories/bonbon.js — 아래에서 만든다)
  let switchStory = null; // 사이드스토리 '스위치'(stories/switch.js — 아래에서 만든다)
  let blackStar = null; // 사이드스토리 '검은 별똥별'(stories/blackstar.js — 아래에서 만든다)
  let cameraStory = null; // 사이드스토리 '하치와레의 카메라'(stories/camera.js — 아래에서 만든다)
  const staged = new Set(); // 연출에 붙잡혀 있는 친구들(일과 · 잠자러 가기를 잠시 미룬다)
  const funBusy = () => !!(talking || tag || dance || overlay || starShow || (usagiClub && usagiClub.active) || (hachiPit && hachiPit.active) || (pajama && pajama.active) || (idolStory && idolStory.active) || (islandTrip && islandTrip.active) || (starDiner && starDiner.active) || (blackStar && blackStar.active) || (bonbonStory && bonbonStory.active) || (cameraStory && cameraStory.active) || (switchStory && switchStory.active));
  // 줄마다 말하는 사람이 다를 수 있다({ who: 친구 kind | 이름표, text }): 친구 kind 면 그 친구 이름표로
  const fillName = (line) => (typeof line === 'string' ? line.replaceAll('{name}', state.profile.name)
    : { ...line, text: fillName(line.text), ...(typeof line.who === 'string' ? { who: whoOf({ kind: line.who }) } : {}) });
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  /** 대화 상자 이름표: 이름 · 색 · 친밀도 하트. */
  const whoOf = (n) => ({ kind: n.kind, ...FRIENDS[n.kind], hearts: hearts(friendOf(state, n.kind)),
    note: debtOf(state, n.kind) > 0 ? `빌린 돈 ${won(debtOf(state, n.kind))}` : null });
  // 지갑이 텅 비었을 때의 첫마디
  const BROKE = {
    chiikawa: '돈이 하나도 없어… 일하러 가야 해…', hachiware: '요즘 좀 빠듯하네~ 열심히 일해야지!', usagi: '하아? (빈 지갑을 흔든다)',
    kurimanju: '하아~ 술값이 모자라…', rakko: '수련만 하다 보니 돈이…', momonga: '돈 없어! 쳐다보지 마!'
  };
  // 하트를 꽉 채운 친구에게 돈을 빌릴 때 · 쫓겨나서 하룻밤 묵을 때의 말
  const LOAN_ASK = {
    chiikawa: '…조금이라면…! 얼마…?', hachiware: '물론이지~ 얼마나 필요해?', usagi: '우라! (지갑을 활짝 연다)',
    kurimanju: '하아~ 얼마나 필요한데?', rakko: '…곤란할 때는 서로 돕는 거다. 얼마냐.', momonga: '흥, 빌려는 줄게. 얼마? 빨리 말해.'
  };
  const LODGE = {
    chiikawa: ['…같이 자자…!', '(이불을 하나 더 꺼내 준다)'], hachiware: ['물론이지~ 동굴이 좀 좁지만 괜찮지?', '푹 자~ 내일 또 힘내자!'],
    usagi: ['우라!', '(옆자리를 툭툭 두드려 준다)'], kurimanju: ['하아~ 우리 집에서 자고 가.', '자기 전에 한 잔… 아니, 그냥 자자.'],
    rakko: ['…좋다. 하룻밤이다.', '수련은 내일 아침 일찍이다.'], momonga: ['돈 냈으니까 들어와. 딱 하룻밤이야!', '내 침대 건드리면 쫓아낸다! 바닥에서 자!']
  };
  const sayAs = (n, lines, then) => guide.say(lines.map(fillName), then, whoOf(n));
  /** 퀘스트 물건 · 몬스터 꼬리표: 그림 + 모은 수 / 필요한 수(다 모으면 초록). */
  // 한 마리 · 한 개짜리는 0/1 대신 그림만(다 하면 ✓) — 구역 보스 셋처럼 꼬리표가 많으면 쪽지가 너무 커졌다
  const partChips = (g) => g.parts.map((pt) => ({ icon: pt.kind === 'monster' ? monsterSvg(pt.id) : itemSvg(pt.id), text: pt.need === 1 ? (pt.have >= 1 ? '✓' : '') : `${pt.have}/${pt.need}`, done: pt.have >= pt.need }));
  /** '부탁 다시 듣기' 대사 한 줄: 목표 한 문장 + 꼬리표(모은 수, 어디서 · 언제). */
  const goalLine = (id) => {
    const t = goalText(state, id), g = shortGoal(state, id), chips = partChips(g);
    if (!chips.length && g.n) chips.push({ text: g.n });
    if (t.hint) chips.push({ icon: /\d+시/.test(t.hint) ? ICO.clock : ICO.pin, text: t.hint });
    return { text: t.text, chips };
  };
  const askAs = (n, line, choices, then) => guide.ask(fillName(line), choices, then, whoOf(n));
  /** 대화를 시작한다: 친구는 하던 일을 멈추고 나를 본다. */
  function beginTalk(n) {
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    talking = n;
    npcs.hold(n, true);
  }
  function endTalk() {
    if (talking) npcs.hold(talking, false);
    talking = null;
    if (mode === 'play' || mode === 'visit') input.setEnabled(true);
  }
  /** 메인으로 나갈 때 하던 놀이를 모두 멈춘다. */
  function resetFun() {
    if (tag) npcs.flee(tag.n, false);
    if (talking) npcs.hold(talking, false);
    talking = tag = dance = null;
    escort = false;
    npcs.lead('hachiware', null);
    partyEnd(null, null);
    hud.setTimer(null);
  }

  /** 말을 걸면: 첫마디와 함께 동물의 숲처럼 고를 거리를 띄운다. */
  function talkTo(n) {
    const f = FRIENDS[n.kind];
    if (!f) return;
    beginTalk(n);
    const opts = [];
    // 퀘스트(5단계): 알리러 왔으면 맨 위, 새 부탁이 있으면 그다음, 아직 덜 했으면 다시 듣기
    const qs = questsFor(state, n.kind);
    qs.report.forEach((id) => { const st = stepOf(state, id); opts.push(['qreport:' + id, st.ask || (st.type === 'bring' ? '부탁한 거 가져왔어!' : st.type === 'talk' ? (QUESTS[id].story ? `「${QUESTS[id].title}」 이야기` : '이야기 들으러 왔어') : '다 했어!')]); }); // st.ask: 그 단계만의 말(뽑은 사진 보러 왔어!)
    qs.offer.forEach((id) => opts.push(['qoffer:' + id, QUESTS[id].ask || '무슨 고민 있어?']));
    qs.waiting.forEach((id) => opts.push(isBuddyStep(stepOf(state, id)) && !n.follow ? ['qwith:' + id, '같이 가자!'] : ['qhint:' + id, '부탁이 뭐였더라?']));
    activeQuests(state).forEach((id) => { const st = stepOf(state, id); if (st.type === 'visit' && st.with && reportTo(id, st) === n.kind && !n.follow) opts.push(['qwith:' + id, '같이 가자!']); });
    if (buddies.has(n.kind)) opts.push(['qstop', '오늘은 여기까지 하자']);
    if (n.kind === 'hachiware') opts.push(['help', '궁금한 게 있어']);
    opts.push(['chat', '이야기하자']);
    if (Object.keys((state.bag && state.bag.items) || {}).some((id) => countOf(state, id) > 0 && canGift(id))) opts.push(['gift', '선물 줄게']);
    // 토벌하는 친구: 같이 토벌 가자(하트 PARTY_HEARTS 개부터) · 같이 다니는 중이면 헤어지기
    if (HUNTER_PROFILES[n.kind] && mode === 'play') opts.push(n.party ? ['unparty', '이제 돌아가도 돼'] : ['party', '같이 토벌 가자!']);
    if (f.play && mode !== 'visit') opts.push(['play', '같이 놀자']); // 집 안에서는 뛰어놀 수 없다
    else if (n.kind === 'momonga' && mode !== 'visit') opts.push(['snub', '같이 놀자']); // 까칠해서 안 놀아 준다
    // 하트 2개부터: 집에 놀러 가기(밤에는 안 된다)
    if (mode === 'play' && VILLAGERS[n.kind] && friendDoors()[n.kind] && hearts(friendOf(state, n.kind)) >= 2 && !isSleepHour(hourOf(state.clock))) opts.push(['visit', n.kind === 'hachiware' ? '동굴에 놀러 가도 돼?' : '집에 놀러 가도 돼?']);
    // 친구 집 안: 그 집의 놀이 · 간식(하루 한 번)
    if (mode === 'visit' && visit && visit.kind === n.kind) {
      if (HOME_ACTS[n.kind]) opts.push(['homeact', HOME_ACTS[n.kind].ask]);
      if (friendOf(state, n.kind).snack !== state.clock.day) opts.push(['snack', '출출한데… 간식 있어?']);
    }
    // 쿠리만쥬: 술 자격 공부(강의) · 자격을 따면 한 잔. '술 공부' 부탁 중이면 강의 듣기를 묶음에 접지 않고 바로 보이게
    const lessonQuest = stepOf(state, 'liquorStudy') && stepOf(state, 'liquorStudy').type === 'study' && !stepReady(state, 'liquorStudy');
    if (n.kind === 'kurimanju' && mode !== 'visit') opts.push(hasLicense(state, 'liquor') ? ['drink', '한 잔 하자'] : lessonQuest ? ['lesson', '강의 들으러 왔어'] : ['study', '술 공부하고 싶어']);
    if (n.kind === 'pochette') opts.push(['shop', '포셰트 구경할래']);
    // 지갑이 있는 친구: 하트를 꽉 채우면 돈을 빌릴 수 있고, 빌렸으면 갚는다. 쫓겨났으면 밤에 하룻밤 재워 달라고 한다.
    if (VILLAGERS[n.kind]) {
      const debt = debtOf(state, n.kind);
      if (isEvicted(state) && bedtime()) opts.push(['lodge', `하룻밤 재워 줄래? (${won(LODGING_PRICE)})`]);
      if (debt > 0) opts.push(['repay', `빌린 돈 갚을게 (${won(debt)})`]);
      else if (canBorrow(state, n.kind, state.clock.day)) opts.push(['borrow', '돈 좀 빌려줄래?']);
    }
    opts.push(['bye', '아무것도 아니야']);
    const poor = VILLAGERS[n.kind] && villagerOf(state, n.kind, state.clock.day).money < 60;
    const h = hearts(friendOf(state, n.kind)); // 친밀도에 따라 인사 · 이야기가 달라진다
    const sleepy = VILLAGERS[n.kind] && villagerOf(state, n.kind, state.clock.day).energy < TIRED + 10; // 기운이 없으면 피곤한 인사
    const greet = poor ? BROKE[n.kind] : sleepy ? TIRED_SAY[n.kind] : greetingFor(n.kind, h) || npcs.greeting(n.kind);
    // 고를 거리가 많으면 묶음('같이 뭐 하자!' · '볼일이 있는데…')으로 접는다(core/talkmenu.js). 묶음을 고르면 그 안의 것들과 되돌아가기
    const { top, groups } = talkMenu(opts);
    const showTop = () => askAs(n, greet, top.map((o) => o[1]), (i) => (groups[top[i][0]] ? showGroup(top[i][0]) : pick(top[i][0])));
    const showGroup = (g) => askAs(n, subAsk(n.kind, g), [...groups[g].map((o) => o[1]), BACK], (j) => (j === groups[g].length ? showTop() : pick(groups[g][j][0])));
    const pick = (k) => {
      if (k.startsWith('qoffer:')) offerQuest(n, k.slice(7));
      else if (k.startsWith('qreport:')) reportQuest(n, k.slice(8));
      else if (k.startsWith('qwith:')) {
        // 잘 시간이 다 됐으면 내일 같이 하자고 한다(하다 말고 자러 가지 않게)
        if (hourOf(state.clock) >= BED_HOUR - 1 || isSleepHour(hourOf(state.clock))) sayAs(n, [BUDDY_LATE[n.kind] || '오늘은 늦었으니까 내일 같이 하자~'], endTalk);
        else sayAs(n, [BUDDY_SAY[n.kind] ? BUDDY_SAY[n.kind].go : '좋아!'], () => { endTalk(); startBuddy(n); });
      }
      else if (k === 'qstop') sayAs(n, [BUDDY_SAY[n.kind] ? BUDDY_SAY[n.kind].stop : '그래, 다음에 또!'], () => { endTalk(); endBuddy(n.kind); });
      else if (k.startsWith('qhint:')) { const id = k.slice(6); sayAs(n, [`「${QUESTS[id].title}」`, goalLine(id), n.kind === 'momonga' ? '빨리 해 와. 흥!' : '부탁해~!'], endTalk); }
      else if (k === 'help') askHelp(n, '뭐가 궁금해? 뭐든 물어봐~');
      else if (k === 'chat') {
        // 오늘 있었던 일 · 들은 소문 · 내 큰일 이야기가 있으면 먼저(한 번 한 이야기는 다시 안 한다)
        const st = VILLAGERS[n.kind] ? untold(n.kind) : null;
        // 돈 모으는 목표는 친구 앱에 없고 이야기로만 알게 된다(하루 한 번쯤, 모은 만큼 말이 달라진다)
        const m = VILLAGERS[n.kind] ? mindOf(n.kind) : null, g = m && m.savedDay !== state.clock.day ? goalOf(state, n.kind) : null;
        const saving = g && savingLine(n.kind, g, villagerOf(state, n.kind, state.clock.day).money);
        if (st && Math.random() < 0.7) { mindOf(n.kind).told.add(st.ev); minds[n.kind] = satisfy(mindOf(n.kind), 'greet'); sayAs(n, [st.line], () => reward(n, 'talk')); }
        else if (saving && Math.random() < 0.6) { m.savedDay = state.clock.day; sayAs(n, [saving], () => reward(n, 'talk')); }
        else {
          // 마을 가꾸기 시설 · 넓힌 집 · 새로 꾸민 방이 있으면 가끔 그 이야기(core/upgradetalk.js)
          const home = homeOf(state), dc = decorOf(home);
          const up = VILLAGERS[n.kind] && Math.random() < 0.4 ? upgradeChat(n.kind, { open: WORK_IDS.filter((id) => workStatus(state, id) === 'open'), expanded: sizeOf(home) > 0, decorated: dc.wall !== 'cream' || dc.floor !== 'wood' }) : null;
          sayAs(n, up ? [up] : chatFor(n.kind, h), () => reward(n, 'talk'));
        }
      }
      else if (k === 'gift') { giftFor = n; panels.openGift({ kind: n.kind, name: FRIENDS[n.kind].name }); } // 친구는 기다리고(talking), 주머니에서 고른다
      else if (k === 'party') askParty(n);
      else if (k === 'unparty') sayAs(n, [lineOf(n.kind, 'partyLeave')], () => { endTalk(); partyEnd([n.kind], null); });
      else if (k === 'play') askPlay(n);
      else if (k === 'snub') sayAs(n, ['싫어! 내가 왜 너랑 놀아?', '…귀여워해 주는 거면 몰라도! 흥!'], endTalk);
      else if (k === 'homeact') { endTalk(); doHomeAct(n.kind); }
      else if (k === 'snack') giveSnack(n);
      else if (k === 'visit') {
        sayAs(n, [n.kind === 'hachiware' ? '좋아~! 내 동굴 구경시켜 줄게!' : n.kind === 'usagi' ? '야하!' : n.kind === 'momonga' ? '…흥! 아무것도 만지지 마!' : '응! 같이 가자~'], () => {
          endTalk();
          npcs.goIn(n);
          awayInfo[n.kind] = { why: 'visit', until: lifeClock }; // 내가 나오면 같이 나온다
          enterVisit(n.kind);
        });
      }
      else if (k === 'study' || k === 'lesson') {
        const i = (state.liquorLesson || 0) % LIQUOR_LESSONS.length;
        commit(markStudy({ ...state, liquorLesson: i + 1 }, 'liquor', i + 1)); // 들은 강의 수(시험 전 검정관이 확인한다)
        // 시험에 나오는 말은 빨갛게(LIQUOR_MARKS) — 첫 강의에서 그렇다고 알려 준다
        const intro = i === 0 ? [{ text: '빨갛게 보이는 말은 시험에 꼭 나와. 잘 봐 둬~', marks: ['빨갛게'] }] : [];
        sayAs(n, [...intro, ...LIQUOR_LESSONS[i].map((text) => ({ text, marks: LIQUOR_MARKS })), { text: '오늘 강의 끝~ 하아~', chips: [{ icon: ICO.book, text: `${i + 1} / ${LIQUOR_LESSONS.length}` }] }], () => reward(n, 'talk'));
      } else if (k === 'drink') {
        // 맥주집에 와 있을 때만 같이 건배(하루 한 번 · 두 잔 값). 다른 데서는 저녁에 맥주집으로 오라고 한다
        if (!kuriAtPub()) { sayAs(n, [isPubHour(hourOf(state.clock)) ? '좋지~ 맥주집에서 기다릴게! 하아~' : { text: '하아~ 맥주는 맥주집이지', chips: [{ icon: ICO.clock, text: '저녁 5 ~ 9시' }] }], () => { if (isPubHour(hourOf(state.clock))) npcPub(n); endTalk(); }); return; }
        cheersWith(n);
      } else if (k === 'shop') { endTalk(); panels.openPochette(); }
      else if (k === 'borrow') askLoan(n);
      else if (k === 'repay') {
        const r = repay(state, n.kind);
        if (!r.ok) { sayAs(n, ['돈이 아직 모자라잖아~', '천천히 갚아도 돼!'], endTalk); return; }
        commit(r.state);
        sound.play('coin');
        sayAs(n, ['딱 맞게 받았어! 고마워~'], () => { hud.toast(`${FRIENDS[n.kind].name}에게 빌린 돈을 다 갚았어요`); endTalk(); });
      } else if (k === 'lodge') {
        if (state.money < LODGING_PRICE) { sayAs(n, ['…돈이 모자란 것 같아…', '미안해…'], endTalk); return; }
        commit(payVillager({ ...state, money: state.money - LODGING_PRICE }, n.kind, LODGING_PRICE, state.clock.day));
        sound.play('coin');
        sayAs(n, LODGE[n.kind], () => { endTalk(); doSleep('lodge'); });
      } else endTalk();
    };
    showTop();
  }

  // ---------- 퀘스트(5단계): 친구의 고충 · 마을 이야기 ----------
  const NARRATOR = { kind: null, name: '…', tag: '#e6dccb', ink: '#5a4a34' };
  /** 부탁을 듣고 받을지 고른다. */
  /** 부탁 대사에 다른 친구가 같이 말하면(줄의 who) 그 친구가 가까이 있을 때 옆으로 걸어온다. */
  function gatherSpeakers(n, lines) {
    const kinds = new Set(lines.filter((l) => typeof l !== 'string' && typeof l.who === 'string' && l.who !== n.kind).map((l) => l.who));
    kinds.forEach((k) => {
      const m = npcs.byKind(k);
      if (!m || m.away || npcs.busy(m) || staged.has(k) || Math.hypot(m.x - n.x, m.z - n.z) > 14) return;
      const at = village.nearestFree(n.x + 1.1, n.z + 0.4, 0.4);
      npcs.plan(m, [{ do: 'walk', x: at.x, z: at.z }, { do: 'act', anim: 'shy', time: 6, face: player.position }]);
    });
  }
  function offerQuest(n, id) {
    const Q = QUESTS[id];
    gatherSpeakers(n, Q.offer);
    const ask = Q.side ? (Q.daily ? '같이 갈래?' : '같이 가 볼래?') : Q.story ? '맡아 주겠나?' : Q.daily ? '같이 할래?' : '…부탁해도 될까?';
    sayAs(n, Q.offer, () => askAs(n, ask, [Q.side ? '좋아, 같이 가자!' : Q.daily ? '좋아, 같이 하자!' : '좋아, 해 볼게!', '지금은 좀…'], (i) => {
      if (i !== 0) { sayAs(n, [lineOf(n.kind, 'questLater')], endTalk); return; } // 친구 말투로(우사기는 소리로만)
      commit(startQuest(state, id));
      sound.play('job');
      endTalk();
      if (Q.start && Q.start.accessory) { // 받자마자 주는 선물(귀 달린 잠옷): 옷장에 넣고 바로 입는다
        const w = wardrobeOf(state), a = Q.start.accessory;
        commit({ ...state, wardrobe: { owned: w.owned.includes(a) ? w.owned : [...w.owned, a], wear: a } });
        refreshLook();
        setTimeout(() => hud.toast(`${ACCESSORY_ITEMS[a].name}을 받았어요!`, 3200, { icon: accessorySvg(a) }), 400);
      }
      if (Q.steps[0].type === 'scene') { questSceneStep(id); return; } // 받자마자 장면(우사기랑 클럽 가기)
      if (isBuddyStep(Q.steps[0])) startBuddy(n); // 일상 부탁: 같이 하자며 따라나선다
      hud.announce({ kicker: Q.side ? '사이드스토리 시작!' : Q.story ? '이야기 시작!' : Q.chain ? '연계 퀘스트 시작!' : Q.daily ? '일상 부탁!' : '새 부탁!', title: Q.title, sub: shortGoal(state, id).goal, to: 'quest', id });
    }));
  }
  /** 지금 단계를 끝냈다고 알린다(bring 이면 건넨다). */
  function reportQuest(n, id) {
    const step = stepOf(state, id);
    const finish = () => finishQuestStep(id, n, step.say);
    // 단계마다 짧은 연출(피자호빵을 먹고 우는 우사기 …). true 를 돌려주면 그 연출(시사의 공부 퀴즈)이 끝난 뒤 스스로 마무리한다
    if (step.fx && STEP_FX[step.fx] && STEP_FX[step.fx](n, finish) === true) return;
    finish();
  }
  /** 퀘스트 단계 연출: 건네받은 친구가 먹고 · 울고, 둘레 친구들이 모여든다. */
  const STEP_FX = {
    shisaQuiz(n, finish) { shisaStory.quiz(finish); return true; },
    cameraPrints(n, finish) { cameraStory.prints(finish); return true; }, // 하치와레의 카메라: 뽑은 사진을 펼쳐 본다
    // 스위치: 따라다니던 풍뎅이가 하품을 하는데… ω 입속에 뾰족한 이빨이 빼곡하다
    beetleTeeth(n, finish) {
      if (beetleBuddy.on && mode === 'play') { // 카메라가 풍뎅이 얼굴로 다가가고, 풍뎅이는 카메라 쪽을 보고 하품한다
        // 작은 풍뎅이: 머리 가운데(키의 0.62쯤) 높이로, 더 가까이(1.2m), 시선은 조금만 내린다
        const b = beetleBuddy.position, bug = { get x() { return b.x; }, get z() { return b.z; }, chibi: { height: beetleBuddy.chibi.height * BEETLE_SCALE * 1.32 }, closeDist: 1.2, aimDrop: 0.08, faceYaw: null };
        startCloseup(bug);
        beetleBuddy.yawn(true, bug.faceYaw);
      } else if (beetleBuddy.on) beetleBuddy.yawn(true, 0); // 집 안(친구 방): 그 자리에서 방 카메라 쪽을 보고 하품
      sound.play('growl');
      guide.say(['(곁에 있던 풍뎅이가 쩌억 하품을 했다…)', '(…입속에 뾰족뾰족한 이빨이 빼곡하다!?)'], () => { endCloseup(); beetleBuddy.yawn(false); finish(); }, NARRATOR);
      return true;
    },
    pizzaCry(n) {
      cryFx = { n, t: 0, crying: false }; // 대사 줄 신호(storyCue)로: 한 입 → 클로즈업 → 굳기 → 울기 → 활짝
      ['hachiware', 'chiikawa'].forEach((kind, i) => {
        const m = npcs.byKind(kind);
        if (!m || m.away || npcs.busy(m) || staged.has(kind) || Math.hypot(m.x - n.x, m.z - n.z) > 22) return;
        const at = village.nearestFree(n.x + (i ? -1.3 : 1.3), n.z + 0.7, 0.4);
        npcs.plan(m, [{ do: 'walk', x: at.x, z: at.z, run: true }, { do: 'act', anim: i ? 'shy' : 'look', time: 6, face: { x: n.x, z: n.z } }]);
      });
    }
  };
  /**
   * 퀘스트 단계를 끝낸다: who(친구 · 없으면 해설)가 lines 를 말하고, 다음 단계를 알리거나 보상을 준다.
   * n 이 null 이면(visit · boss) 대화를 새로 연다.
   */
  function finishQuestStep(id, n, lines) {
    const Q = QUESTS[id], r = completeStep(state, id, state.clock.day);
    commit(r.state);
    const say = (ls, then) => (n ? sayAs(n, ls, then) : guide.say(ls.map(fillName), then, lines.speaker ? whoOf(npcs.byKind(lines.speaker)) : NARRATOR));
    say(lines, () => {
      if (!r.finished) {
        if (n) endTalk(); else unlockAfterScene();
        sound.play('job');
        hud.announce({ kicker: Q.story ? '이야기가 이어져요' : '다음 할 일', title: Q.title, sub: shortGoal(state, id).goal, to: 'quest', id });
        return;
      }
      if (n) endTalk(); else unlockAfterScene();
      celebrateQuest(id, r.reward, n);
    });
  }
  // ---------- 우는 얼굴 클로즈업(피자호빵): 카메라가 얼굴로 다가가고, 친구는 카메라 쪽을 보며 진짜로 운다 ----------
  let cryFx = null, closeup = null; // cryFx: { n, t, crying } · closeup: { n, t, a(카메라가 오는 방향), fromPos, fromLook, out, outT }
  let cutscene = false; // 이야기 장면이라 화면 글을 숨긴 중(body.cutscene)
  let storyCam = false; // 이야기 카메라(잠옷 밤나들이 별 보기)를 쓰는 중: 끝나면 따라가기 카메라를 내 자리에 바로 붙인다
  let glowTry = null; // 털뭉치 따기: 행동 버튼을 꾹 누르고 손을 뻗은 중 { s: 버섯 무더기, zone: 이번 초록 칸 } — 손을 떼면 그때 빛으로 판정
  /** 대사 줄의 연출 신호. */
  function storyCue(cue) {
    const F = cryFx;
    if (!F) return;
    const n = F.n;
    if (cue === 'pizzaBite') { npcs.emote(n, 'nibble', 2.4); startCloseup(n); }
    else if (cue === 'pizzaFreeze') npcs.emote(n, 'idle', 30);
    else if (cue === 'pizzaCry') { F.crying = true; npcs.emote(n, 'sob', 30); }
    else if (cue === 'pizzaSmile') { F.crying = false; setCrying(n.chibi, false); npcs.emote(n, 'hop', 2.5); endCloseup(); }
  }
  /** 얼굴로 다가간다: 내 캐릭터에 가리지 않게 비스듬한 쪽에서. 그 친구는 카메라 쪽을 본다. */
  function startCloseup(n) {
    const p = player.position, from = cam.poseFor(p.x, p.z);
    const a = Math.atan2(p.x - n.x, p.z - n.z) + (p.x >= n.x ? -1.05 : 1.05);
    closeup = { n, t: 0, a, fromPos: from.pos, fromLook: from.look, out: false, outT: 0 };
    n.faceYaw = a;
  }
  function endCloseup() { if (closeup && !closeup.out) { closeup.out = true; closeup.outT = 0; } }
  function closeupCamera(dt) {
    const C = closeup, n = C.n;
    C.t += dt;
    const ease = (u) => u * u * (3 - 2 * u);
    const face = new THREE.Vector3(n.x, n.chibi.height * 0.47, n.z), d = n.closeDist || 2.15; // closeDist: 작은 풍뎅이처럼 더 다가갈 때
    const near = face.clone().add(new THREE.Vector3(Math.sin(C.a) * d, 0.1, Math.cos(C.a) * d));
    const aim = face.clone().add(new THREE.Vector3(0, -(n.aimDrop ?? 0.28), 0)); // 얼굴이 화면 위쪽에(아래 대화 상자에 안 가리게)
    const home = cam.poseFor(player.position.x, player.position.z);
    let pos, look;
    if (!C.out) { const k = ease(Math.min(1, C.t / 0.9)); pos = C.fromPos.clone().lerp(near, k); look = C.fromLook.clone().lerp(aim, k); }
    else {
      C.outT += dt;
      const k = ease(Math.min(1, C.outT / 0.9));
      pos = near.clone().lerp(home.pos, k); look = aim.clone().lerp(home.look, k);
      if (C.outT >= 0.9) { n.faceYaw = null; closeup = null; cam.snap(player.position); return; }
    }
    cam.set(pos, look);
  }
  /** 매 프레임: 눈물 · 대화가 끝났는데 남은 연출 정리. */
  function updateCryFx(dt) {
    if (!cryFx) return;
    cryFx.t += dt;
    if (cryFx.crying) setCrying(cryFx.n.chibi, true, cryFx.t);
    if (!guide.open && cryFx.t > 0.5) { // 대화가 끝났다(중간에 닫혀도)
      setCrying(cryFx.n.chibi, false);
      endCloseup();
      if (!closeup) cryFx = null;
    }
  }
  /** 해설 · 장면(visit · boss)이 끝나면 다시 움직인다. */
  function unlockAfterScene() { questScene = false; if (mode === 'play') input.setEnabled(true); }
  let questScene = false;
  /** 장면으로 끝나는 단계(그곳에 도착 · 왕버섯을 쓰러뜨림): 움직임을 멈추고 대화를 띄운다. */
  function questSceneStep(id) {
    const step = stepOf(state, id);
    if (!step || questScene) return;
    questScene = true;
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    const lines = [...step.say];
    lines.speaker = step.speaker;
    if (step.scene) { // 사이드스토리 장면(stories/): 다 보고 나면 마무리 대사 · 보상
      const done = () => finishQuestStep(id, null, lines);
      if (step.scene === 'shisaExam') shisaStory.exam(done);
      else if (step.scene === 'pajamaNight') pajama.play(done);
      else if (step.scene === 'pajamaParty') idolStory.play(done);
      else if (step.scene === 'islandCamp') islandTrip.play({ done });
      else if (step.scene === 'starDiner') starDiner.play(done);
      else if (step.scene === 'whiskeyBonbon') bonbonStory.play(done);
      else if (step.scene === 'switchOpen' || step.scene === 'switchFinale') switchStory.play(step.scene, done);
      else if (step.scene === 'hachiCamera') cameraStory.play(done);
      else if (step.scene.startsWith('black')) blackStar.play(step.scene, done);
      else usagiClub.play({ id, again: step.scene === 'clubNight', done });
      return;
    }
    if (step.speaker === 'hachiware' && step.place === 'cave') {
      // 하치와레의 동굴 무대: 동굴 앞에 나와 노래한다
      const h = npcs.byKind('hachiware'), c = village.spots.hachiCave;
      player.setPosition(c.x, c.z + 2.6);
      player.face(c.x, c.z);
      cam.snap(player.position);
      if (h) {
        if (h.away) npcs.comeOut(h, c.x, c.z + 0.2);
        else { h.x = c.x; h.z = c.z + 0.2; }
        npcs.hold(h, true);
        npcs.emote(h, 'dance', 7);
      }
      sound.play('heartUp');
      // 노래하는 동안 음표가 퐁퐁
      let notes = 0;
      const sing = setInterval(() => {
        if (!h || ++notes > 9 || mode !== 'play') { clearInterval(sing); return; }
        hud.floatText({ x: h.x + (Math.random() - 0.5) * 0.8, y: h.chibi.height + 0.4, z: h.z, text: notes % 2 ? '♪' : '♫', kind: 'note' });
        if (notes % 3 === 1) sound.play('heart');
      }, 650);
      setTimeout(() => { if (h) npcs.hold(h, false); }, 7500);
    }
    if (step.speaker === 'kurimanju' && step.place === 'pub') {
      // 맥주집 건배: 쿠리만쥬가 카운터 앞에 와 있고, 같이 짠!
      const k = npcs.byKind('kurimanju'), seat = pubSeat(), front = village.spots.pub;
      player.setPosition(front.x + 0.15, front.z + 0.1);
      cam.snap(player.position);
      if (k) {
        if (k.away) npcs.comeOut(k, seat.x, seat.z);
        else { k.x = seat.x; k.z = seat.z; }
        player.face(k.x, k.z);
        k.yaw = Math.atan2(player.position.x - k.x, player.position.z - k.z);
        npcs.hold(k, true);
        setTimeout(() => { npcs.emote(k, 'drink', 3.6); drinkBeer(); hud.floatText({ x: (player.position.x + k.x) / 2, y: 1.7, z: (player.position.z + k.z) / 2, text: '짠!', kind: 'note' }); sound.play('heart'); }, 1200);
        setTimeout(() => npcs.hold(k, false), 9000);
      }
      sound.play('heartUp');
    }
    if (step.place === 'bench' || step.place === 'pavilion' || step.place === 'clockTower') workQuestStage(id, step); // 마을 가꾸기 시설에서 하는 부탁
    if (step.speaker === 'rakko' && step.place === 'dojo') {
      // 랏코의 수련 2부: 저녁 수련장에서 대련(랏코가 수련장 앞에 나와 마주 서서 목검을 휘두른다)
      const r = npcs.byKind('rakko'), d = village.spots.dojo, at = village.nearestFree(d.x + 1.3, d.z + 2.2, 0.45);
      if (r) {
        if (r.away) npcs.comeOut(r, at.x, at.z);
        else { r.x = at.x; r.z = at.z; }
        npcs.hold(r, true);
        r.yaw = Math.atan2(player.position.x - r.x, player.position.z - r.z);
        npcs.emote(r, 'train', 6);
        player.face(r.x, r.z);
        setTimeout(() => npcs.hold(r, false), 9000);
      }
      sound.play('swing');
    }
    finishQuestStep(id, null, lines);
  }
  /** 부탁을 다 들어줬다: 보상과 축하. 이야기의 끝이면 마을 친구들이 다 같이 기뻐한다. */
  function celebrateQuest(id, reward, n) {
    const Q = QUESTS[id], F = FRIENDS[Q.giver];
    const giver = n || npcs.byKind(Q.giver);
    // 머리 위 하트만 퐁퐁(하트 줄 카드는 가운데 보상 카드와 겹쳐서 띄우지 않는다 · 보상 카드에 하트 꼬리표가 있다)
    if (giver && !giver.away && mode === 'play') hud.hearts({ x: giver.x, y: giver.chibi.height + 0.5, z: giver.z, gained: (Q.reward && Q.reward.bond) || 1, up: false, hearts: hearts(friendOf(state, Q.giver)), name: F.name, tag: F.tag });
    sound.play('quest');
    player.cheerTime = 2.4;
    // 부탁한 친구도 펄쩍 기뻐하고, 머리 위로 반짝 · 음표가 퐁퐁
    if (giver && !giver.away && mode === 'play') {
      npcs.emote(giver, joyAnim(Q.giver), 2.8);
      let k = 0;
      const sparkle = setInterval(() => {
        if (++k > 6 || mode !== 'play') { clearInterval(sparkle); return; }
        hud.floatText({ x: giver.x + (Math.random() - 0.5) * 0.9, y: giver.chibi.height + 0.5, z: giver.z, text: ['★', '♪', '♥'][k % 3], kind: 'note' });
      }, 260);
    }
    // 보상은 아이콘 꼬리표로 짧게(돈 · 하트 · 물건 그림)
    const ICON = { money: 'coin', bond: 'heart', village: 'heart' };
    const chips = reward.parts.map((pt) => ({
      icon: ICON[pt.kind] || (pt.kind === 'item' ? itemSvg(pt.id) : pt.kind === 'accessory' ? accessorySvg(pt.id) : pt.kind === 'weapon' ? weaponSvg(pt.id) : null),
      text: pt.text
    }));
    // 부탁 완료 카드(리본 · 꽃가루). 이야기 끝이면 마을 친구들이 다 같이 기뻐한다
    const tale = Q.story || (Q.side && !Q.daily);
    hud.questDone({ title: tale ? '이야기 완료!' : '부탁 완료!', sub: Q.title, chips, ms: tale ? 5600 : 4800 });
    if (Q.story) npcs.list.forEach((m) => { if (!m.away) npcs.emote(m, joyAnim(m.kind), 3); });
    if (reward.gifts.length) setTimeout(() => hud.toast('선물을 받았어요!', 3000, { chips: reward.gifts.map((g) => ({ text: FURNITURE[g].name })) }), 4400);
    refreshLook();
  }
  /**
   * 토벌 안내서 읽기(이야기 첫 단계): 다 읽고 창을 닫으면 검정소 앞 대장 갑옷 씨가 그 자리에서 받아 주고, '이야기가 이어져요' 카드로
   * 다음 할 일(토벌 자격증)이 갱신된다. 대장이 근처에 없으면(수련장에 갔거나) '다 읽었어요!' 카드만 띄우고 말을 걸면 이어진다.
   */
  let studyShown = null; // '다 읽었어요!' 카드를 띄운 단계(같은 단계에 두 번 띄우지 않는다)
  function studyReport() {
    const st = stepOf(state, 'story');
    if (!st || st.type !== 'study' || !stepReady(state, 'story')) return;
    const n = npcs.byKind('captain'), p = player.position;
    if (n && !n.away && Math.hypot(n.x - p.x, n.z - p.z) < 9) { beginTalk(n); finishQuestStep('story', n, st.say); return; }
    const key = 'story:' + state.quests.story.step;
    if (studyShown === key) return;
    studyShown = key;
    sound.play('ready');
    player.cheerTime = 1.2;
    hud.announce({ kicker: '다 읽었어요!', title: QUESTS.story.title, sub: '대장 갑옷 씨에게 알려요', to: 'quest', id: 'story' });
  }
  /** 퀘스트에 나오는 곳의 월드 자리. */
  // 마을 가꾸기로 생긴 곳(퀘스트 visit): 연못 쉼터 · 강가 정자 · 시계탑 앞 · 북쪽 · 동쪽 문 돌기둥
  const WORK_PLACES = { bench: WORK_SPOTS.benches[0], pavilion: WORK_SPOTS.pavilion[0], clockTower: { x: WORK_SPOTS.clock[0].x, z: WORK_SPOTS.clock[0].z + 1.1 }, gateNorth: { x: GATES.north.x, z: GATES.north.z + 2 }, gateEast: { x: GATES.east.x - 2, z: GATES.east.z } };
  const questPlaceAt = (place) => place === 'cave' ? village.spots.hachiCave : place === 'lair' ? lairSpot : place === 'pub' ? village.spots.pub : place === 'bridge' ? BRIDGE_SPOT : place === 'plaza' ? village.spots.plaza : place === 'exam' ? village.spots.exam : place === 'home' ? village.spots.home : place === 'pier' ? pier.spot : place === 'diner' ? dinerFront.spot
    : place === 'chiiHome' ? homeDoor('chiikawa') : place === 'starfield' ? STAR_FIELD : place === 'bonbonVine' ? bonbonFront.spot : place === 'switchRock' ? switchFront.spot
    : place === 'moleGate' ? BOSS_LAIRS.bigmole.door : place === 'elderGate' ? BOSS_LAIRS.elder.door : place === 'crabGate' ? BOSS_LAIRS.bigcrab.door : place === 'dojo' ? village.spots.dojo : WORK_PLACES[place] || null; // 연계 퀘스트: 보스 마당 협곡 입구 · 랏코 수련장, 마을 가꾸기 시설
  const STAR_FIELD = { x: GATES.east.x + 7, z: 5 }; // 사이드스토리 '검은 별똥별': 동쪽 문 바로 바깥 길가 풀밭
  const BRIDGE_SPOT = { x: BRIDGES[0].x, z: riverZ(BRIDGES[0].x) };
  const lairSpot = village.nearestFree(KING_LAIR.x, KING_LAIR.z, 1.5); // 왕버섯 굴 마당 가운데(core/layout.js — 둘레에 벽, 오솔길 쪽 입구)
  let questT = 0, bossM = null, questHint = false;
  /**
   * 구역 보스(core/bosses.js): 오늘 쓰러뜨리지 않았으면 제 굴 · 빈터에 한 마리씩 있다(내 눈앞에서 솟아나지 않게 멀리 있을 때 놓는다).
   * 처음 가까이 다가가면 '등장!' 알림과 함께 도감에 드러난다. 이미 쓰러뜨린 날의 저장을 불러왔으면 치운다.
   */
  const lairBossM = {};
  function updateLairBosses(p) {
    const day = state.clock.day;
    for (const sp of LAIR_BOSSES) {
      const L = BOSS_LAIRS[sp], d = Math.hypot(p.x - L.x, p.z - L.z), home = bossHome(state, sp, day);
      let m = lairBossM[sp];
      if (m && (m.dead || !home)) { if (!m.dead) monsters.clear((o) => o === m); m = lairBossM[sp] = null; }
      if (!m && home && d > 26) { const at = village.nearestFree(L.x, L.z, 1.5); m = lairBossM[sp] = monsters.spawnAt(sp, at.x, at.z); }
      if (m && d < 13 && !bossSeen(state, sp)) {
        commit(markBossSeen(state, sp));
        sound.play('warn');
        hud.toast(`${m.M.name} 등장!`, 3200, { icon: monsterSvg(sp), chips: [{ text: L.place }, { text: '보스' }] });
      }
    }
  }
  /**
   * 현상금 몬스터(core/bounty.js): 그날 정해진 시각이 되면 그 구역에 황금 대장이 나타나고 게시판에 전단이 붙는다(알림 한 번).
   * 쓰러뜨리면 게시판에서 현상금을 받는다. 밤 10시가 지나면 사라진다. 다시 불러온 저장이면 아직 안 잡은 대장을 다시 세운다.
   */
  let bountyM = null, bountyNote = 0; // bountyNote: 나타났다고 알린 날(사라졌다고 알렸으면 음수)
  function updateBounty(p) {
    const b = bountyNow(state);
    if (!b || b.status !== 'up') {
      if (bountyM) { if (!bountyM.dead) monsters.clear((m) => m === bountyM); bountyM = null; }
      if (b && b.status === 'gone' && bountyNote === b.day) { bountyNote = -b.day; hud.toast(`${josa(b.name, '이/가')} 어디론가 사라졌어요`, 3000, { icon: monsterSvg(b.species) }); }
      return;
    }
    if (!bountyM || bountyM.dead) bountyM = monsters.spawnElite(b.species, p, { name: b.name, ...ELITE });
    if (bountyM && bountyNote !== b.day && bountyNote !== -b.day) {
      bountyNote = b.day;
      sound.play('warn');
      hud.toast('현상금 몬스터가 나타났어요!', 5200, { icon: monsterSvg(b.species), chips: [{ text: b.name }, { text: b.where }, { icon: 'coin', text: won(b.reward) }] });
    }
  }
  /** 0.3초마다: 도착한 곳 · 왕버섯 깨우기 · 처음 부탁 안내. */
  /**
   * 부탁에 필요한 걸 다 모았을 때(물건 · 토벌 · 풀): 그 순간 한 번 '다 모았어요!' 카드가 떠서 퀘스트 쪽지로 날아가 반짝이고, 띠링 소리 · 만세.
   * 불러온 저장에 이미 다 모인 부탁은 알리지 않는다(처음 한 번은 지금 상태를 기억만). 같은 부탁도 단계가 바뀌면 다시 센다.
   */
  const readySeen = new Set();
  let readyInit = false;
  const READY_TYPES = { bring: ['다 모았어요!', '가져가요'], hunt: ['다 잡았어요!', '알려요'], pull: ['다 뽑았어요!', '알려요'], bosses: ['구역 보스를 다 쓰러뜨렸어요!', '알려요'] };
  function checkReady() {
    const now = activeQuests(state).filter((id) => { const st = stepOf(state, id); return st && READY_TYPES[st.type] && stepReady(state, id); })
      .map((id) => `${id}:${state.quests[id].step}`);
    if (!readyInit) { readyInit = true; now.forEach((k) => readySeen.add(k)); return; }
    for (const key of [...readySeen]) if (!now.includes(key)) readySeen.delete(key); // 버리거나 써서 모자라지면 다음에 다시 알린다
    for (const key of now) {
      if (readySeen.has(key)) continue;
      readySeen.add(key);
      const id = key.split(':')[0], st = stepOf(state, id), [kicker, verb] = READY_TYPES[st.type], to = FRIENDS[reportTo(id, st)];
      sound.play('ready');
      player.cheerTime = 1.2;
      hud.announce({ kicker, title: QUESTS[id].title, sub: `${to ? to.name : ''}에게 ${verb}`, to: 'quest', id });
    }
  }
  /** 그 자리(x, z)가 생긴 시설 곁인지: 돌길은 마을 안 길 위, 돌담은 울타리 가, 가로등은 바깥 가로등 둘레, 나머지는 시설 자리 둘레. */
  function nearWork(id, x, z) {
    if (id === 'roads') return Math.hypot(x, z) < VILLAGE_R - 1 && roadDist(x, z) < 0.3;
    if (id === 'fence') { const r = Math.hypot(x, z); return r > VILLAGE_R - 3.5 && r < VILLAGE_R + 3; }
    if (id === 'lamps') return works.lampSpots.some((q) => Math.hypot(q.x - x, q.z - z) < 3);
    return (WORK_SPOTS[id] || []).some((q) => Math.hypot(q.x - x, q.z - z) < 3.2);
  }
  // 마을 친구가 생긴 시설 곁을 지나면 가끔 혼잣말(말풍선, core/upgradetalk.js). 6초마다 한 친구까지, 같은 친구는 90초 쉰다
  let chatterT = 0;
  const chatterAt = new Map();
  function worksChatter() {
    chatterT -= 0.3;
    if (chatterT > 0 || visiting) return;
    chatterT = 6;
    const open = WORK_IDS.filter((id) => workStatus(state, id) === 'open');
    if (!open.length) return;
    const p = player.position, now = performance.now() / 1000;
    for (const n of npcs.list) {
      if (!VILLAGERS[n.kind] || n.away || n.bubble || n === talking || Math.hypot(n.x - p.x, n.z - p.z) > 14) continue;
      if (now - (chatterAt.get(n.kind) ?? -1e9) < 90 || Math.random() > 0.4) continue;
      const id = open.find((w) => nearWork(w, n.x, n.z)), line = id && nearWorkLine(n.kind, id);
      if (!line) continue;
      npcs.say(n, line);
      chatterAt.set(n.kind, now);
      return;
    }
  }
  /** 마을 가꾸기(core/works.js): 다 모인 다음 날 아침 시설이 생기면 한 번 알린다(마을 친구들도 이야기한다). */
  function checkWorks() {
    const due = dueWorks(state);
    if (!due.length) return;
    commit(markWorksOpen(state, due));
    due.forEach((id) => happen({ type: 'playerWork', who: 'me', work: WORKS[id].name }));
    sound.play('job');
    hud.banner('마을이 달라졌어요!', `${josa(due.map((id) => WORKS[id].name).join(', '), '이/가')} 생겼어요`, 4200);
  }
  function updateQuests(dt) {
    questT -= dt;
    if (questT > 0 || !state) return;
    questT = 0.3;
    checkReady();
    const p = player.position, hour = hourOf(state.clock);
    const free = !panels.isOpen() && !guide.open && !sleeping && !funBusy() && !fainting && !questScene && !pulling;
    if (!questScene && !usagiClub.active) for (const id of staleScenes(state)) commit(dropQuest(state, id)); // 장면 도중 새로고침했으면 없던 일로
    for (const id of activeQuests(state)) {
      const step = stepOf(state, id);
      if (free && step.type === 'visit' && arrived(step, questPlaceAt(step.place), p.x, p.z, hour) && (!step.with || buddyNear(reportTo(id, step))) && (!step.scene || (usagiClub.canPlay(state.clock.day) && !islandTrip.active))
        && loopGate(state, step)) { // 검은 별똥별: 되풀이되는 날 · 한 번 더 되돌아온 날 · 쫓아낸 다음 날에만 열리는 단계
        if (step.place === 'lair') commit({ ...state, story: { ...(state.story || {}), bossSeen: true } });
        if (step.with) endBuddy(reportTo(id, step));
        questSceneStep(id);
        return;
      }
    }
    if (free && !talking && buddyDone.length) { const id = buddyDone.shift(); if (isActive(state, id) && stepReady(state, id)) finishBuddy(id); }
    if (free && !talking) studyReport();
    if (free && !talking) usagiClub.trySight(); // 사이드스토리: 밤에 우사기가 숲 쪽으로 쌩(목격)
    if (free && !talking) hachiPit.tryDiscover(); // 사이드스토리: 숲 구덩이에서 "살려줘~"
    if (free && !talking) checkWorks();
    if (!talking) worksChatter();
    if (free && !talking && pizzaNewsDue(state)) { // 사이드스토리 '우사기의 피자호빵': 아침에 라멘 로우 새 메뉴 소식
      commit({ ...state, story: { ...(state.story || {}), pizzaNews: state.clock.day } });
      hud.toast('라멘 로우에 새 메뉴가 나왔대요!', 4200, { chips: [{ icon: itemSvg('pizzabun'), text: '피자호빵' }] });
    }
    // 왕버섯: 이야기가 바위산 깊은 곳에 이르면 그 자리에 있다. 싸울 차례(boss)가 되기 전에는 잠들어 있다
    const story = state.quests && state.quests.story, sStep = stepOf(state, 'story');
    const bossTime = story && !story.done && story.step >= QUESTS.story.steps.findIndex((s) => s.type === 'visit') && !(state.story && state.story.bossDown);
    if (bossTime && (!bossM || bossM.dead) && Math.hypot(p.x - lairSpot.x, p.z - lairSpot.z) < 46) {
      monsters.clear((m) => m.species === 'kingcap');
      bossM = monsters.spawnAt('kingcap', lairSpot.x, lairSpot.z);
    }
    if (bossM && !bossM.dead) {
      bossM.dormant = !(sStep && sStep.type === 'boss');
      if (!bossTime) { monsters.clear((m) => m === bossM); bossM = null; }
    }
    updateLairBosses(p);
    updateBounty(p);
    // 처음으로 부탁할 친구가 생기면 한 번 알려 준다
    if (!questHint && !seen('quest-intro') && !tutorialActive(state.tutorial) && free) {
      const any = npcs.list.some((m) => markOf(state, m.kind) === '!');
      if (any) { questHint = true; markSeen('quest-intro'); hud.toast('! 가 뜬 친구에게 말을 걸어 봐요', 3200); }
    }
  }
  const STORY_MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C9.8 5 7 4.6 3.5 5v12.5c3.5-.4 6.3 0 8.5 1.5 2.2-1.5 5-1.9 8.5-1.5V5C17 4.6 14.2 5 12 6.5z" fill="#fff" stroke="#7b4b8f" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 6.5V19" stroke="#7b4b8f" stroke-width="1.8"/><path d="M6 9h3.5M6 12h3.5M14.5 9H18M14.5 12H18" stroke="#c9a0d8" stroke-width="1.4" stroke-linecap="round"/></svg>';
  /** 머리 위 ! · ? · 이야기 표시(가까운 친구만). */
  function questMarks(focus) {
    const out = [];
    for (const m of npcs.list) {
      if (m.away || m.bubble || Math.hypot(m.x - focus.x, m.z - focus.z) > 26) continue;
      const mk = markOf(state, m.kind);
      const up = m.driving ? 0.75 : 0; // 하늘색 자동차를 타고 있으면 지붕 위로
      if (mk === 'story') out.push({ id: 's-' + m.kind, x: m.x, y: m.chibi.height + 0.6 + up, z: m.z, html: STORY_MARK, kind: 'qmark story' }); // 사이드스토리: ! 대신 펼친 책
      else if (mk) out.push({ id: 'q-' + m.kind, x: m.x, y: m.chibi.height + 0.55 + up, z: m.z, text: mk, kind: mk === '?' ? 'qmark report' : 'qmark' });
    }
    // 게시판에 붙은 이야기 전단지(수상한 섬 합숙): 게시판 왼쪽 일감 걸이 벽(world/village.js 의 tagWall, 높이 2) 위에 펼친 책.
    // 간판(높이 3) 위는 게시판 앞에 서면 화면 위로 벗어난다
    if (boardStory(state) && Math.hypot(boardSign.x - focus.x, boardSign.z - focus.z) <= 26) {
      out.push({ id: 's-board', x: boardSign.x - 1.85, y: 2.55, z: boardSign.z, html: STORY_MARK, kind: 'qmark story' });
    }
    return out;
  }

  /** 버릴 자리: 발 앞부터, 이미 떨어진 꾸러미(list)와 겹치지 않는 빈 땅(동물의 숲처럼 옆으로 하나씩 늘어놓는다). */
  function dropSpot(list = groundOf(state)) {
    const p = player.position, yaw = player.yaw;
    const taken = (at) => list.some((e) => Math.hypot(e.x - at.x, e.z - at.z) < 0.55);
    const ring = [[0.8, 0], [0.85, 0.75], [0.85, -0.75], [0.95, 1.5], [0.95, -1.5], [1.45, 0], [1.45, 0.42], [1.45, -0.42], [1.3, 1.1], [1.3, -1.1], [1.1, 2.3], [1.1, -2.3], [1.0, Math.PI]];
    let first = null;
    for (const [d, a] of ring) {
      const at = village.nearestFree(p.x + Math.sin(yaw + a) * d, p.z + Math.cos(yaw + a) * d, 0.2);
      first = first || at;
      if (!taken(at)) return at;
    }
    return first;
  }
  /** 바닥의 나뭇잎 꾸러미를 줍는다(주머니 칸이 모자라면 들어가는 만큼만). */
  function pickUpGround(g) {
    if (visiting) { takeRemoteGround(g); return; } // 친구 마을 바닥: 주인에게 달라고 한다
    const e = groundOf(state).find((o) => o.g === g);
    if (!e) return;
    const r = pickUp(state, g);
    if (!r.ok) { hud.toast('주머니가 꽉 찼어요'); sound.play('none'); return; }
    commit(r.state);
    ground.sync(groundOf(state), groundKind);
    player.face(e.x, e.z);
    sound.play('clean');
    hud.bagBump();
    const name = groundName(e);
    const icon = e.weapon ? weaponSvg(e.id) : itemSvg(e.id);
    if (r.refund) hud.toast('이미 있는 무기예요', 2200, { icon, chips: [{ icon: 'coin', text: `+${won(r.refund)}` }] });
    else hud.toast(`${name}${r.n > 1 ? ` ${r.n}개` : ''} 주웠어요`, 1800, { icon, chips: r.left > 0 ? [{ text: `${r.left}개 남음` }] : null });
  }

  /** 돈 빌리기: 친구 지갑의 절반까지, 갚기 전에는 한 번만. */
  function askLoan(n) {
    const amounts = loanOptions(state, n.kind, state.clock.day);
    askAs(n, LOAN_ASK[n.kind] || '얼마나 필요해?', [...amounts.map((a) => won(a)), '역시 괜찮아'], (i) => {
      const amount = amounts[i];
      if (!amount) { sayAs(n, ['그래? 필요하면 또 말해~'], endTalk); return; }
      commit(borrow(state, n.kind, amount, state.clock.day));
      sound.play('coin');
      sayAs(n, [`여기 ${won(amount)}! 나중에 꼭 갚아 줘~`], () => { hud.toast(`${FRIENDS[n.kind].name}에게 ${won(amount)} 빌렸어요`, 3400); endTalk(); });
    });
  }

  // ---------- 자격(술 · 슈퍼 알바이터)과 라멘 로우 알바 ----------
  /** 시험 · 알바 창이 열려 있는 동안 마을 조작을 막는다. */
  function beginOverlay() { cancelPull(); input.setEnabled(false); hud.setAction(null); overlay = true; }
  function endOverlay() { overlay = false; if (mode === 'play') input.setEnabled(true); }
  // ---------- 경품 추첨 ----------
  let drumSpin = 0; // 마을의 가라가라 통이 도는 남은 시간
  /** 가게에서 물건을 샀다: 경품 추첨권 한 장(하루 몇 장까지). 처음 받으면 어디서 쓰는지 알려 준다. */
  /** 가게에서 paid 원을 냈다: 비싼 것(TICKET_MIN_PRICE 원 이상)이면 추첨권 한 장. 라멘 · 맥주처럼 싼 것은 안 준다. */
  function gotTicket(paid) {
    const r = earnTicket(state, state.clock.day, paid);
    if (!r.earned) return;
    commit(r.state);
    setTimeout(() => hud.toast('추첨권 +1', 1800, { icon: TICKET_SVG, chips: [{ text: `${raffleOf(state).tickets}장` }] }), 700);
    if (!seen('raffle-ticket')) { markSeen('raffle-ticket'); setTimeout(() => hud.toast('추첨권은 광장 옆 경품 추첨에서', 3200, { icon: TICKET_SVG }), 2600); }
  }
  /** 당첨 카드: 나온 구슬과 상품 그림, 1 · 2등은 도장이 빨갛게 쾅. */
  function showPrize(P) {
    const I = itemInfo(P.item), big = P.id === 'gold' || P.id === 'red';
    const card = document.createElement('div');
    card.className = 'raffle-prize';
    card.innerHTML = `<span class="rp-ball" style="background:${P.ball}"></span><span class="rp-item">${itemSvg(P.item)}</span>`;
    hud.notice({ kicker: `${P.ballName} 구슬!`, card, stamp: P.id === 'white' ? '참가상' : `${P.rank} 당첨!`, tone: big ? 'good' : 'info', sub: `${josa(I.name, '을/를')} 받았어요`, ok: '받았다!' });
    sound.play(P.id === 'gold' ? 'heartUp' : big ? 'done' : 'heart');
    if (big) player.cheerTime = P.id === 'gold' ? 2.4 : 1.4;
    hud.bagBump();
  }
  /** 자격증 카드에 적는 날짜: 진짜 자격증처럼 2026.10.08 */
  const cardDate = (s, day) => { const { y, m, d } = dateOf(s.startDate || todayISO(), day); return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`; };
  /**
   * 자격증 카드에 들어갈 것(합격 카드 · 마을폰 자격증 앱). id: 'weed'(제초 검정, 급수가 이름에) | 'liquor' | 'arbeiter' | 'hunter'.
   * 아직 없는 자격은 흐린 빈 카드(none). 사진은 지금 내 모습을 정면에서 찍는다.
   */
  function licenseCardData(id, s = state) {
    const name = s.profile.name;
    const novice = id === 'weed' && s.license.grade >= NOVICE; // 견습은 제초 자격이 아직 없다(검정소에서 5급부터)
    const own = id === 'weed' ? (novice ? null : { day: s.license.day || 1, look: s.license.look }) : licensesOf(s)[id];
    const title = id === 'weed' ? `제초 검정 ${novice ? 5 : s.license.grade}급` : LICENSES[id].name;
    // 카드에 크게 쓰는 두 줄(원작 '草むしり / 3級' 처럼): 제초는 '풀 뽑기 / N급', 나머지는 자격 이름 / 합격
    const big = id === 'weed' ? ['풀 뽑기', novice ? '아직 없어요' : `${s.license.grade}급`] : [LICENSES[id].name, own ? '합격' : '아직 없어요'];
    if (!own) return { id, title, big, none: true, hint: novice ? `잡초를 뽑아 경험치를 채우면 검정소에서 시험을 봐요(${won(EXAM_FEE[NOVICE])})` : `검정소에서 시험을 봐요(응시료 ${won(LICENSES[id].fee)})` };
    // 사진은 딴 그때 모습(예전에 딴 자격증은 기본 모습)
    return { id, title, big, name, photo: playerPortrait(own.look || s.profile.look), fields: [['이름', name], ['발급', cardDate(s, own.day)], ['번호', licenseNumber(name, id, own.day)]] };
  }
  /** 합격하면 진짜 자격증 카드를 받는다(확인을 눌러야 닫힌다). extra: { sub, chips } — 카드 아래 덧붙일 것 */
  function showLicenseCard(id, kicker, s = state, extra = null) {
    hud.notice({ kicker, card: licenseCardEl(licenseCardData(id, s)), tone: 'good', sub: (extra && extra.sub) || '자격증 앱에 넣어 뒀어요', chips: extra && extra.chips, ok: '받았다!' });
  }
  /**
   * 시험 전에 검정관(대장 갑옷 씨)이 공부했는지 묻는다(licenses.js 의 STUDY): 공부거리를 안 봤으면 먼저 보러 가라고 하고,
   * 그래도 보겠다면 그대로 시험. 안내서 · 레시피 북은 그 자리에서 펼쳐 준다. → 물어봤으면 true(시험은 대답한 뒤에)
   */
  function examCheck(id) {
    const p = studyProgress(state, id);
    if (p.have >= p.need) return false;
    const captain = whoOf({ kind: 'captain' });
    const line = id === 'liquor'
      ? (p.have ? `흠. 쿠리만쥬 강의는 ${p.have}강까지 들었군. 필기는 강의에서 나온다. 끝까지 듣고 오는 게 좋을 거다.` : '흠흠. 술 자격 필기는 쿠리만쥬 강의에서 나온다. 강의는 듣고 왔나?')
      : id === 'hunter' ? '흠흠. 토벌 안내서는 읽어 봤나? 필기는 전부 안내서에서 나온다.' : '흠흠. 라멘 로우 레시피 북은 봤나? 필기는 레시피에서 나온다.';
    const free = () => { if (mode === 'play' && !panels.isOpen() && !guide.open) input.setEnabled(true); }; // 갑옷 씨 말이 끝나면 다시 움직이게(말 상자는 콜백 전에 닫힌다 · guide.js finish)
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    guide.ask(line, [id === 'liquor' ? '강의 듣고 올게요' : `${STUDY[id].what} 먼저 볼게요`, '그래도 볼래요'], (i) => {
      if (i === 1) { takeLicense(id, true); return; }
      if (id === 'hunter') panels.openGuidebook();
      else if (id === 'arbeiter') panels.openRecipes({ back: 'exam' });
      else guide.say([{ text: '쿠리만쥬에게 「술 공부하고 싶어」라고 말을 걸어 봐라. 흠흠.', chips: [{ icon: ICO.book, text: `${p.have} / ${p.need}강` }] }], free, captain);
    }, captain);
    return true;
  }
  /**
   * 변신 살롱: 지금 모습에서 시작하는 만들기 화면(이름 · 장식은 그대로). '이 모습으로 할래요'를 누를 때 값을 내고(그만두면 안 낸다)
   * 새 모습으로 바뀐 뒤 두 팔 번쩍. 자격증 사진은 딴 그때 모습 그대로다.
   */
  function openSalon() {
    if (state.money < SALON_PRICE) { hud.toast('돈이 모자라요'); return; }
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    setCinematic(true);
    const back = () => { setCinematic(false); if (mode === 'play' && !panels.isOpen() && !guide.open) input.setEnabled(true); };
    openCreator(ui, ({ look }) => {
      const paid = trySpend(state, SALON_PRICE);
      if (!paid.ok) { hud.toast('돈이 모자라요'); back(); return; }
      commit({ ...paid.state, profile: { ...paid.state.profile, look: { ...look, accessory: state.profile.look.accessory } } });
      refreshLook();
      sound.play('coin');
      player.cheerTime = 1.8;
      hud.toast('짜잔~ 새로운 모습이 됐어요!', 2800);
      back();
    }, { name: state.profile.name, look: { ...state.profile.look } }, back, { salon: true, price: SALON_PRICE });
  }
  /** 검정소 시험: (공부 확인) → 응시료 → 필기 → 실기(술: 하이볼, 슈퍼 알바이터: 손님 3명) → 합격하면 자격증. sure: 공부 확인을 이미 했다 */
  function takeLicense(id, sure = false) {
    if (hunterExam) { hud.toast('토벌 실기 중이에요!'); return; }
    if (visiting && id === 'hunter') { hud.toast('토벌 시험은 내 마을 검정소에서 봐요', 2800); return; } // 실기 몬스터는 내 마을에만 나온다
    if (!sure && !hasLicense(state, id) && state.money >= LICENSES[id].fee && examCheck(id)) return;
    const L = LICENSES[id], r = payFee(state, id);
    if (!r.ok) { hud.toast(r.reason === 'money' ? '응시료가 부족해요' : '이미 있는 자격이에요'); return; }
    commit(r.state);
    beginOverlay();
    // 불합격: 동물의 숲처럼 도장 카드(불합격 · 까닭 · 공부거리)를 확인할 때까지 띄운다
    const fail = (why, tip) => { endOverlay(); hud.notice({ kicker: L.name, stamp: '불합격', tone: 'bad', sub: why, chips: tip ? [{ icon: ICO.book, text: tip }] : null, ok: '다음에 또 올게요' }); };
    const pass = () => {
      commit(grant(state, id, state.clock.day, myLook())); // 사진은 딴 그때 모습으로
      endOverlay();
      happen({ type: 'playerLicense', who: 'me', lic: L.name });
      staffSay('captain', 'pass', 16, player.position);
      showLicenseCard(id, `${L.name} 합격!`);
      sound.play('done');
      player.cheerTime = 1.8;
    };
    const questions = id === 'liquor' ? liquorQuiz(L.questions) : id === 'hunter' ? huntQuiz(L.questions) : ramenQuiz(L.questions);
    openQuiz(ui, {
      title: `${L.name} 필기`, questions, pass: L.pass, seconds: L.seconds || 0, sound,
      hint: id === 'hunter' ? '토벌 안내서' : id === 'liquor' ? '쿠리만쥬 강의' : '레시피 북',
      onDone: (correct, ok) => {
        if (!ok) { endOverlay(); return; } // 시험지 결과(도장 · 검정관 말)로 이미 알렸다
        if (id === 'liquor') openHighball(ui, { sound, onDone: (good) => (good ? pass() : fail('하이볼을 다시 연습해요')) });
        else if (id === 'hunter') startHunterPractical(pass, fail);
        else openRamenShop(ui, { mode: 'exam', sound, onEnd: (res) => (res.completed ? pass() : fail(res.reason)) });
      }
    });
  }
  /** 라멘 로우 알바: 하루 한 번, 기운 15. 끝까지 일하면 기본급 + 그릇 보수, 일찍 그만두면 그릇 보수만. */
  function workRamen() {
    const can = canWorkRamen(state, state.clock.day);
    if (!can.ok) { hud.toast(can.reason === 'today' ? '오늘 근무는 끝났어요' : '슈퍼 알바이터 자격이 있어야 해요'); return; }
    const used = useStamina(state, 15);
    if (!used.ok) { hud.toast('기운이 없어요', 2000); return; }
    commit(workedRamen(used.state, state.clock.day));
    beginOverlay();
    openRamenShop(ui, {
      mode: 'work', duration: 90, sound,
      onEnd: (res) => {
        const pay = res.completed ? shiftPay(res) : res.earned;
        commit(addMoney(state, pay));
        endOverlay();
        if (pay > 0) { hud.banner('알바 끝!', '', 3200, [{ icon: 'coin', text: `+${won(pay)}` }, { text: `손님 ${res.served}명` }]); sound.play('coin'); }
        else hud.toast('오늘은 한 그릇도 못 냈어요…');
      }
    });
  }
  // ---------- 토벌(4단계): 무기 휘두르기 · 몬스터에게 맞기 · 기절 · 토벌 실기 ----------
  const SWING_TIME = 0.34, HIT_DELAY = 0.14;
  let swingCool = 0, iframe = 0, fainting = false, swingHit = null; // swingHit: { t: 맞히기까지 남은 초, id: 무기 }
  let hunterExam = null; // 토벌 실기 { t: 남은 초, left: 남은 허수아비 · 몬스터, hits: 맞은 수, pass, fail, foes: { at: 나올 자리, next: 다음에 나올 몬스터 번호, in: 나오기까지 초 | null } }
  const EXAM_FOE_DELAY = 2; // 앞엣것을 쓰러뜨리고 다음 몬스터가 나오기까지(초)
  let examCleanup = false; // 실기 몬스터를 치울 차례(endHunterExam(true))
  let growlCool = 0, warnCool = 0;
  /** 지금 손에 든 무기(실기 중에 무기가 없으면 빌린 사스마타). */
  const weaponNow = () => (state ? heldWeapon(state) || (hunterExam ? 'fork' : null) : null);

  /**
   * 휘두르기: 가까운 몬스터 쪽으로 몸을 돌리고(휴대폰에서도 맞히기 쉽게) 잠깐 뒤에 맞힌다.
   * aim(마우스로 누른 땅 { x, z })이 있으면 그 근처 몬스터를, 없으면 누른 쪽을 바라보고 휘두른다.
   */
  function doSwing(aim) {
    const id = weaponNow();
    if (!id || swingCool > 0 || player.swinging || fainting || downed || fishing) return; // 낚시 중에는 휘두르지 않는다
    if (player.riding) getOffCar(); // 차에서는 못 휘두른다: 내려서 휘두른다
    const W = WEAPONS[id], p = player.position;
    let near = monsters.nearest(p.x, p.z, W.range + 1.2);
    if (aim) {
      const m = monsters.nearest(aim.x, aim.z, 1.6);
      near = m && Math.hypot(m.x - p.x, m.z - p.z) < W.range + 1.2 ? m : null;
      if (!near && Math.hypot(aim.x - p.x, aim.z - p.z) > 0.2) player.face(aim.x, aim.z);
    }
    if (near) player.face(near.x, near.z);
    player.swing(SWING_TIME, W.thrust ? 'thrust' : 'swing');
    swingCool = W.cool;
    swingHit = { t: HIT_DELAY, id };
    sound.play('swing', id); // 무기마다 다른 바람 소리
  }
  function resolveSwing(id) {
    const W = WEAPONS[id], p = player.position;
    if (visiting) {
      // 친구 마을: 닿은 몬스터를 주인에게 알린다(진짜 피해 · 쓰러뜨리기는 주인 쪽에서, 쓰러뜨리면 전리품이 나에게 온다)
      const dmg = W.dmg + trainBonus(), hits = monsters.strikeGuest({ x: p.x, z: p.z, yaw: player.yaw, range: W.range, dmg, arc: W.arc });
      if (!hits.length) return;
      sound.play('hit', id);
      for (const { m } of hits) {
        hud.floatText({ x: m.x, y: m.mesh.height * 0.85, z: m.z, text: `-${W.dmg}`, kind: 'dmg' });
        multi.act({ t: 'hit', id: m.id, dmg, knock: W.knock || 1, x: r2(p.x), z: r2(p.z) });
      }
      return;
    }
    const hits = monsters.strike({ x: p.x, z: p.z, yaw: player.yaw, range: W.range, dmg: W.dmg + trainBonus(), knock: W.knock || 1, arc: W.arc }); // 랏코와 수련한 날은 +1
    if (!hits.length) return;
    sound.play('hit', id);
    for (const { m, killed } of hits) {
      hud.floatText({ x: m.x, y: m.mesh.height * 0.85, z: m.z, text: `-${W.dmg}`, kind: 'dmg' });
      if (killed) onKill(m);
    }
  }
  /** 몬스터를 쓰러뜨렸다: 전리품은 가방에(같이 놀기 파티면 그 자리 바닥에), 토벌 일감이면 센다(한 번도 안 맞고 잡으면 깔끔하게). */
  function onKill(m) {
    sound.play('poof');
    if (m.M.boss) cutBossMusic(); // 보스를 쓰러뜨리면 보스 곡은 바로 뚝
    if (m.exam) { examDummyDown(); return; }
    // 토벌 점수(랭킹): 같이 토벌 중이면 나와 데려간 친구들 · 같이 놀기 파티가 똑같이 나눠 갖는다
    const crew = ['me', ...npcs.partyKinds()], partners = [...mpParty.keys()], split = crew.length + partners.length;
    let s = recordHunt(state, m.species);
    for (const who of crew) s = addKill(s, who, m.species, split);
    if (split > 1) hud.floatText({ x: m.x, y: m.mesh.height + 0.9, z: m.z, text: `나눠서 +${killPoints(m.species, split)}점`, kind: 'drop' });
    // 같이 놀기 파티: 파티의 다른 사람도 토벌 일감 · 퀘스트를 같이 센다
    for (const pid of partners) multi.direct(pid, { t: 'pkill', sp: m.species, x: r2(m.x), z: r2(m.z), clean: m.hitPlayer ? 0 : 1, n: split });
    // 친구 마을에서 잡은 것(m.remote)은 전리품 · 점수 · 일감만: 내 마을 이야기 · 구역 보스는 그대로
    if (m.species === 'kingcap' && !m.remote) s = { ...s, story: { ...(s.story || {}), bossSeen: true, bossDown: true } };
    if (BOSS_LAIRS[m.species] && !m.remote) s = markBossDown(s, m.species, s.clock.day); // 구역 보스: 오늘은 끝, 내일 다시 나타난다
    const before = s.job;
    if (s.job && JOB_TYPES[s.job.typeId].kind === m.species) s = { ...s, job: recordPull(s.job, m.species, m.hitPlayer ? 'snapped' : 'clean') };
    if (m.bounty && !m.remote) s = markBountyDown(s); // 현상금 황금 대장: 게시판에서 현상금을 받는다
    const drop = m.M.drop, many = m.bounty ? ELITE.drops : 1;
    let got = 0;
    if (drop && !partners.length) { const r = addItem(s, drop, many); s = r.state; got = r.added; }
    commit(s);
    // 전리품 · 토벌 일감 진행: 열매 따기처럼 그림 + 숫자가 반짝이며 통통(가방 개수는 가방이 톡 튀는 것으로)
    if (drop && partners.length) dropToWorld(drop, m.x, m.z); // 파티: 전리품은 그 자리 바닥에(누구든 줍는다)
    else if (got) { hud.floatText({ x: m.x, y: m.mesh.height + 0.35, z: m.z, text: `+${got}`, kind: 'pick', icon: itemSvg(drop) }); hud.bagBump(); }
    else if (drop) hud.toast('가방이 꽉 찼어요');
    if (state.hunted[m.species] === 1) hud.toast(`${m.M.name} 첫 토벌!`, 2600, { icon: monsterSvg(m.species) });
    else if (state.job && JOB_TYPES[state.job.typeId].kind === m.species && !isComplete(state.job)) hud.floatText({ x: m.x, y: m.mesh.height + 1.05, z: m.z, text: `${state.job.count} / ${JOB_TYPES[state.job.typeId].target}`, kind: 'pick', icon: monsterSvg(m.species) });
    celebrateIfDone(before, state.job);
    rankNews();
    if (m.remote) { if (m.M.boss) hud.banner(`${josa(m.M.name, '을/를')} 쓰러뜨렸다!`, `${multi.hostName || '친구'}의 마을에서`, 3000); return; }
    // 이야기 속 왕버섯을 쓰러뜨렸다
    if (m.species === 'kingcap') {
      bossM = null;
      happen({ type: 'playerBoss', who: 'me', boss: m.M.short }); // 온 마을에 소문이 난다
      monsters.clear((o) => o.summoned);
      hud.banner('왕버섯을 쓰러뜨렸다!', '', 3000);
      if (stepOf(state, 'story') && stepOf(state, 'story').type === 'boss') setTimeout(() => questSceneStep('story'), 1600);
    }
    if (m.bounty) {
      bountyM = null;
      happen({ type: 'playerBoss', who: 'me', boss: m.M.name }); // 온 마을에 소문이 난다
      hud.banner(`${josa(m.M.name, '을/를')} 쓰러뜨렸다!`, '노동 접수 게시판에서 현상금을 받아요', 3400);
    }
    // 구역 보스를 쓰러뜨렸다: 부하는 흩어지고, 소문이 나고, 내일 다시 나타난다
    if (BOSS_LAIRS[m.species]) {
      lairBossM[m.species] = null;
      happen({ type: 'playerBoss', who: 'me', boss: m.M.short });
      monsters.clear((o) => o.summoned);
      hud.banner(`${josa(m.M.name, '을/를')} 쓰러뜨렸다!`, '내일 다시 나타나요', 3200);
    }
  }
  /** 몬스터의 들이받기가 닿았다: 기운이 줄고 밀려난다. 잠깐은 다시 안 맞는다. 기운이 0이면 기절. */
  /** 몬스터 공격이 닿았다. hit: { dmg, x, z } — 공격마다 다른 피해와 날아온 자리(탄 · 충격파는 그 자리에서 밀려난다). */
  function onMonsterHit(m, hit = {}) {
    if (iframe > 0 || fainting || downed || sleeping || mode !== 'play' || !state || (visiting && (visiting.arriving || visiting.leaving || performance.now() < (visiting.safeUntil || 0)))) return;
    const dmg = hit.dmg ?? m.M.dmg, next = Math.max(0, state.stamina - dmg);
    commit({ ...state, stamina: next }, false);
    iframe = PLAYER_IFRAME;
    const p = player.position, dx = p.x - (hit.x ?? m.x), dz = p.z - (hit.z ?? m.z), d = Math.hypot(dx, dz) || 1;
    cancelPull();
    player.hurt((dx / d) * PLAYER_KNOCK, (dz / d) * PLAYER_KNOCK, PLAYER_IFRAME);
    sound.play('hurt');
    hud.hurt();
    hud.floatText({ x: p.x, y: 1.6, z: p.z, text: `기운 −${dmg}`, kind: 'hurt' });
    if (hunterExam && examHit(next)) { if (next <= 0) startFaint(); return; }
    if (next <= 0 && canGoDown()) goDown(); // 같이 노는 친구가 있으면 그 자리에 쓰러져 깨워 주길 기다린다
    else if (next <= 0) startFaint(bossOf(m)); // 보스에게 처음 쓰러졌으면 깨어난 뒤 랏코가 와서 힘내라며 도시락을 준다
    else if (next <= 25 && warnCool <= 0) { warnCool = 20; hud.toast('기운이 얼마 없어요!', 2400); }
  }
  /**
   * 기절: 화면이 어두워졌다가 내 집 앞에서 깨어난다(누가 데려다준 것처럼 · 쫓겨났으면 쓰러진 쪽 마을 입구).
   * 돈을 조금 잃고(짤랑 소리), FAINT_HOURS 시간이 지나 있다 — 검은 화면에 '(세 시간 뒤…)', 깨면 지금 시각 꼬리표.
   */
  function startFaint(boss = null) {
    fainting = true;
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    sound.play('faint');
    cutBossMusic(); // 쓰러지면 보스 곡은 바로 뚝
    hud.curtain(true, '눈앞이 깜깜해졌다…');
    setTimeout(() => {
      if (!state) { fainting = false; hud.curtain(false); return; }
      const r = faint(state), p = player.position; // 시간도 FAINT_HOURS 만큼 흐른다(core/combat.js)
      const home = !isEvicted(state);
      let at;
      if (home) { const h = village.spots.home; at = village.nearestFree(h.x + 0.6, h.z + 1.4, 0.5); }
      else {
        const gate = Object.values(GATES).reduce((a, g) => (Math.hypot(g.x - p.x, g.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? g : a));
        const k = (VILLAGE_R - 2.5) / VILLAGE_R;
        at = { x: gate.x * k, z: gate.z * k };
      }
      player.stopBlink();
      player.setPosition(at.x, at.z);
      player.face(0, 0);
      cam.snap(player.position);
      iframe = 0;
      commit(r.state);
      hud.curtain(true, `(${TIMES[FAINT_HOURS] || FAINT_HOURS} 시간 뒤…)`);
      setTimeout(() => {
        hud.curtain(false);
        fainting = false;
        if (mode === 'play' && !panels.isOpen() && !guide.open) input.setEnabled(true);
        if (r.lost) sound.play('coinLoss'); // 돈을 잃었다: 동전이 짤랑짤랑 굴러떨어지는 소리
        hud.banner('기절했어요…', home ? '정신을 차려 보니 내 집 앞이었어요' : '정신을 차려 보니 마을 입구였어요', 3600,
          [{ icon: ICO.clock, text: timeLabel(state.clock) }, ...(r.lost ? [{ icon: 'coin', text: `−${won(r.lost)}` }] : [])]);
        for (const kind of npcs.partyKinds()) npcs.say(npcs.byKind(kind), lineOf(kind, 'partyFaint')); // 같이 토벌하던 친구들이 옆으로 달려온다
        if (!startRakkoAdvice(boss, !npcs.partyKinds().length)) rushToMe(); // 보스에게 처음 졌으면 랏코가, 아니면 친한 친구가 달려온다
      }, 1300);
    }, 1500);
  }
  /**
   * 토벌 자격증 실기: 검정소 앞마당에 허수아비가 먼저 서고, 다 쓰러뜨리면 쫓아와 공격하는 몬스터(LICENSES.hunter.foes)가
   * 나온다(여럿이면 앞 몬스터를 쓰러뜨릴 때마다 한 마리씩 차례로). 정해진 시간 안에 모두 쓰러뜨리면 합격, 시간이 다 되거나 L.hits 번 맞으면(기절해도) 불합격.
   */
  /**
   * 실기 몬스터가 나올 자리: 내 왼쪽 위나 오른쪽 위(화면 안). 카메라가 남쪽에서 북쪽을 보니 아래(+z)에 생기면 화면 밖이라
   * 안 보이는 데서 갑자기 덤볐다. 후보 자리를 지금 카메라로 비춰 보고 화면 안쪽에 들어오는 첫 자리로:
   * 넓은 화면은 옆으로 넉넉히, 좁은 휴대폰 세로 화면은 안쪽 · 위쪽으로 당긴다.
   */
  const examFoeV = new THREE.Vector3();
  function examFoeSpot() {
    const p = player.position, side = Math.random() < 0.5 ? -1 : 1;
    for (const [dx, dz] of [[3.0, -2.6], [2.4, -3.0], [1.8, -3.4], [1.2, -3.8]]) {
      const at = village.nearestFree(p.x + side * dx, p.z + dz, 0.5);
      examFoeV.set(at.x, 0.4, at.z).project(cam.camera);
      if (Math.abs(examFoeV.x) < 0.8 && examFoeV.y > -0.6 && examFoeV.y < 0.85) return at;
    }
    return village.nearestFree(p.x + side * 1.2, p.z - 3.8, 0.5);
  }
  function startHunterPractical(pass, fail) {
    const L = LICENSES.hunter, ex = village.spots.exam;
    endOverlay();
    const at = ([dx, dz]) => village.nearestFree(ex.x + dx, ex.z + dz, 0.5);
    const dummies = [[-2.4, 1.6], [2.4, 1.6], [0, 3.0]].slice(0, L.dummies).map(at);
    const foes = L.foes.map(() => null); // 나올 자리는 차례가 될 때 내 둘레에서 정한다(examFoeSpot)
    dummies.forEach((sp) => monsters.spawnAt('dummy', sp.x, sp.z, { exam: true }));
    // 몬스터는 허수아비를 다 쓰러뜨린 뒤에 한 마리씩(foes.in: 다음 몬스터가 나오기까지 초, null 이면 아직 차례가 아니다)
    hunterExam = { t: L.practical, left: dummies.length + foes.length, hits: 0, pass, fail, foes: { at: foes, next: 0, in: null } };
    player.face(ex.x, ex.z + 2);
    sound.play('job');
    hud.announce({ kicker: '토벌 실기 시작!', title: `허수아비 ${dummies.length}개 다음 몬스터 ${foes.length}마리`, sub: '',
      chips: [{ icon: ICO.clock, text: `${L.practical}초 안에` }, { text: `${L.hits}번 맞으면 불합격` },
        heldWeapon(state) ? null : { icon: weaponSvg('fork'), text: '사스마타 빌려줌' }].filter(Boolean) });
  }
  /** 실기 중에 맞았다: L.hits 번째이거나 기절하면 불합격. → 시험이 끝났는지 */
  function examHit(stamina) {
    const L = LICENSES.hunter;
    hunterExam.hits += 1;
    const left = L.hits - hunterExam.hits;
    if (left > 0 && stamina > 0) { hud.toast(left === 1 ? '한 번 더 맞으면 불합격!' : `${left}번 더 맞으면 불합격!`, 1600); return false; }
    const fail = hunterExam.fail;
    endHunterExam(true); // 몬스터에게 맞은 순간은 몬스터 갱신 도중이라 목록은 나중에 치운다
    fail(stamina > 0 ? `${L.hits}번 맞아서 떨어졌어요` : '기절해서 떨어졌어요');
    return true;
  }
  /** 실기를 끝낸다. later: 몬스터 갱신 도중(맞아서 끝났을 때)이면 몬스터 목록을 건드리지 않고 이번 프레임 updateCombat 에서 치운다. */
  function endHunterExam(later = false) {
    if (!hunterExam) return;
    hunterExam = null;
    if (later) examCleanup = true; else monsters.clear((m) => m.exam);
    hud.setTimer(null);
  }
  function examDummyDown() {
    if (!hunterExam) return;
    hunterExam.left -= 1;
    if (hunterExam.left > 0) {
      // 서 있는 것(허수아비 · 나온 몬스터)을 다 쓰러뜨렸으면 다음 몬스터가 나온다
      const F = hunterExam.foes, waiting = F.at.length - F.next;
      if (hunterExam.left === waiting && waiting > 0) { F.in = EXAM_FOE_DELAY; hud.toast(F.next === 0 ? '허수아비 끝! 이제 몬스터가 와요' : '좋아요! 다음 몬스터가 와요', 1600); }
      else hud.toast(`${hunterExam.left}개 남았어요!`, 1400);
      return;
    }
    const pass = hunterExam.pass;
    endHunterExam();
    setTimeout(pass, 500);
  }
  // 휘두를 때 앞에 그려지는 하얀 반달 궤적(맞는 범위: 앞쪽 ±60도, 무기 길이만큼). 칼끝을 따라 무기 쪽부터 펼쳐진다
  const SLASH_SEG = 28;
  const slash = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.0, SLASH_SEG, 1, -Math.PI / 3, (Math.PI * 2) / 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  slash.visible = false;
  slash.renderOrder = 3;
  scene.add(slash);
  // 찌르는 무기(사스마타): 앞으로 길고 좁은 궤적
  const stab = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.0, 16, 1, -0.62, 1.24), slash.material);
  stab.visible = false;
  stab.renderOrder = 3;
  scene.add(stab);
  /** 매 프레임(마을 돌아다니는 중): 휘두르기 · 무적 시간 · 실기 시계 · 손에 든 무기. */
  function updateCombat(dt) {
    const k = player.swingK, wid = weaponNow(), thrust = !!(wid && WEAPONS[wid].thrust);
    const trail = thrust ? stab : slash;
    (thrust ? slash : stab).visible = false;
    trail.visible = k > 0.3 && k < 0.78;
    if (trail.visible) {
      const reach = wid ? WEAPONS[wid].range + 0.2 : 1.5;
      // 머리(칼끝이 지나간 자리)가 먼저 그려지고 꼬리가 뒤따라 사라진다
      const head = Math.min(1, (k - 0.3) / 0.25), tail = Math.max(0, Math.min(1, (k - 0.45) / 0.33));
      if (thrust) {
        trail.position.set(player.position.x, 0.4, player.position.z);
        trail.rotation.set(-Math.PI / 2, player.yaw - Math.PI / 2, 0, 'YXZ');
        trail.scale.setScalar(reach * (0.5 + 0.5 * head)); // 찌르기: 앞으로 쭉 뻗어 나간다
      } else {
        // 베기: 무기 쪽 위에서 반대쪽 아래로 비스듬히(몸짓과 같은 방향)
        const from = Math.round(SLASH_SEG * (1 - head)), to = Math.round(SLASH_SEG * (1 - tail));
        trail.geometry.setDrawRange(from * 6, Math.max(0, to - from) * 6);
        trail.position.set(player.position.x, 0.42, player.position.z);
        trail.rotation.set(-Math.PI / 2 + 0.18, player.yaw - Math.PI / 2, 0, 'YXZ');
        trail.scale.setScalar(reach);
      }
      trail.material.opacity = 0.8 * (1 - tail * 0.85);
      trail.material.color.set(wid === 'star' ? 0xfff2a8 : 0xffffff);
    }
    if (examCleanup) { examCleanup = false; monsters.clear((m) => m.exam); }
    swingCool = Math.max(0, swingCool - dt);
    iframe = Math.max(0, iframe - dt);
    growlCool = Math.max(0, growlCool - dt);
    warnCool = Math.max(0, warnCool - dt);
    if (swingHit) { swingHit.t -= dt; if (swingHit.t <= 0) { const id = swingHit.id; swingHit = null; resolveSwing(id); } }
    player.setWeapon(weaponNow());
    player.setEngraved(engravedOf(state));
    if (hunterExam) {
      hunterExam.t -= dt;
      const F = hunterExam.foes;
      if (F.in != null && (F.in -= dt) <= 0) { // 차례가 된 몬스터 한 마리
        const i = F.next++, sp = examFoeSpot();
        monsters.spawnAt(LICENSES.hunter.foes[i], sp.x, sp.z, { exam: true });
        F.in = null;
        sound.play('growl');
        hud.toast(`몬스터 ${i + 1} / ${F.at.length}`, 1600);
      }
      const lives = LICENSES.hunter.hits - hunterExam.hits;
      hud.setTimer(['토벌 실기', { icon: monsterSvg('dummy'), text: `${hunterExam.left}개` }, { text: '♥'.repeat(lives) + '♡'.repeat(hunterExam.hits) },
        { icon: ICO.clock, text: `${Math.max(0, Math.ceil(hunterExam.t))}초` }]);
      if (hunterExam.t <= 0) {
        const fail = hunterExam.fail;
        endHunterExam();
        fail('시간 안에 다 쓰러뜨리지 못했어요');
      }
    }
  }
  /** 몬스터가 나를 알아챘다: 으르릉(너무 자주는 말고), 무기가 없으면 도망치라고 알려 준다. */
  function onAggro() {
    if (growlCool <= 0) { sound.play('growl'); growlCool = 1.6; }
    if (!weaponNow() && warnCool <= 0) { warnCool = 25; hud.toast('몬스터다!', 2200); }
  }

  /** 친밀도를 올리고(하루에 한 번), 하트가 늘거나 선물을 주면 알린다. */
  function reward(n, action) {
    const r = befriend(state, n.kind, action, state.clock.day);
    commit(r.state);
    showBond(n, r);
  }
  /** 선물 줄 친구(말 걸기 → '선물 줄게' → 주머니에서 고르는 동안). 고르지 않고 닫으면 onClose 가 대화를 끝낸다. */
  let giftFor = null;
  function giveGiftTo(id) {
    const n = giftFor;
    giftFor = null;
    if (!n) return;
    const r = giveGift(state, n.kind, id, state.clock.day);
    if (!r.ok) { sayAs(n, [r.reason === 'today' ? giftLine(n.kind, 'cap') : '…?'], endTalk); return; }
    commit(r.state);
    sound.play(r.taste === 'hate' ? 'none' : r.love ? 'heartUp' : 'job');
    // 좋아하는지 싫어하는지 한눈에: 알림 꼬리표 + 친구 머리 위 글씨 + 몸짓(좋으면 깡충, 싫으면 갸웃)
    const TASTE = { love: ['아주 좋아해요!', '좋아해!', 'clean', 'hop'], ok: ['보통이에요', '', '', null], hate: ['싫어하는 것 같아요', '싫어…', 'snap', 'think'] }[r.taste] || ['', '', '', null];
    hud.toast(`${FRIENDS[n.kind].name}에게 ${josa(itemInfo(id).name, '을/를')} 줬어요`, 2800, { icon: itemSvg(id), chips: [{ text: TASTE[0] }] });
    if (TASTE[1]) hud.floatText({ x: n.x, y: n.chibi.height + 0.5, z: n.z, text: TASTE[1], kind: TASTE[2] });
    if (TASTE[3]) npcs.emote(n, TASTE[3], 2.2);
    // 싫어하는 선물: 성격대로 살짝 싫은 티를 낸다(친밀도는 안 오른다). 모몽가 · 우사기는 대화가 끝나자마자 내 앞에서 버리고,
    // 착한 친구들은 일단 받아 두었다가 내가 없을 때 몰래 버린다(lifeDecide · staffTossSecret)
    if (r.taste === 'hate') { sayAs(n, [giftLine(n.kind, 'hate')], () => { endTalk(); if (r.tossNow) tossAway(n, id); }); return; }
    sayAs(n, [giftLine(n.kind, r.love ? 'love' : 'ok')], () => showBond(n, r));
  }
  /** 내가 그 친구를 볼 수 없는지(멀리 있거나 집 안 · 연출 중): 착한 친구는 이럴 때만 몰래 버린다. */
  const unseen = (n) => mode !== 'play' || Math.hypot(player.position.x - n.x, player.position.z - n.z) > 18;
  /** 싫은 선물을 받아 둔 착한 친구: 조용한 곳으로 걸어가 두리번거리고, 그래도 내가 안 보이면 몰래 내려놓는다(보이면 그만둔다). */
  function npcTossSecret(n, id) {
    const a = Math.random() * Math.PI * 2, spot = village.nearestFree(n.x + Math.sin(a) * 4.5, n.z + Math.cos(a) * 4.5, 0.5);
    setDoing(n.kind, null, '산책');
    npcs.plan(n, [{ do: 'walk', x: spot.x, z: spot.z, near: 0.5 }, { do: 'act', anim: 'look', time: 1.6 }, {
      do: 'call', fn: () => {
        if (!state || !pantryOf(state, n.kind)[id] || !unseen(n)) { restHere(n.kind, 5); return; } // 들킬 것 같으면 다음에
        commit(placeItem(takeFromPantry(state, n.kind, id, 1).state, id, 1, n.x + 0.4, n.z + 0.3), false);
        npcs.say(n, giftLine(n.kind, 'toss'));
        restHere(n.kind, 6 + Math.random() * 6);
      }
    }]);
  }
  /** 가게를 지키는 사람(갑옷 씨들 · 시사 · 카니)은 자리를 비우지 않고, 내가 안 보일 때 가게 옆에 슬쩍 내려놓는다. */
  function staffTossSecret(n, kind) {
    const id = hatedOf(state, kind);
    if (!id || !unseen(n)) return;
    const at = village.nearestFree(n.x - 0.9, n.z + 0.6, 0.3);
    commit(placeItem(takeFromPantry(state, kind, id, 1).state, id, 1, at.x, at.z), false);
    npcs.say(n, giftLine(kind, 'toss'));
  }
  /** 싫어하는 선물을 받은 친구가 조금 떨어진 곳에 버린다(바닥 물건이라 내가 다시 주울 수 있다). 친구 집 안이면 그 집 문 앞에. */
  function tossAway(n, id) {
    setTimeout(() => {
      if (!state || !n) return;
      const inside = mode === 'visit', d = inside ? homeDoor(n.kind) : null;
      const a = (n.yaw || 0) + Math.PI * (0.6 + Math.random() * 0.8), bx = d ? d.x : n.x, bz = d ? d.z + 1.2 : n.z;
      const at = village.nearestFree(bx + Math.sin(a) * 1.1, bz + Math.cos(a) * 1.1, 0.3);
      commit(placeItem(state, id, 1, at.x, at.z));
      if (!inside) npcs.emote(n, 'think', 1.2);
      npcs.say(n, giftLine(n.kind, 'toss'));
    }, 700);
  }
  /** 친밀도가 오른 것을 보여 주고(머리 위 하트 · 선물 가구) 대화를 끝낸다. r: befriend 결과 모양 */
  function showBond(n, r) {
    if (r.gained > 0) {
      // 친밀도가 오르면 머리 위로 하트(하트가 늘면 크게 터지고 하트 줄 카드)
      const F = FRIENDS[n.kind];
      const at = mode === 'visit' ? rooms.hostAnchor() : { x: n.x, y: n.chibi.height + 0.5, z: n.z };
      hud.hearts({ ...at, gained: r.gained, up: r.up, hearts: r.hearts, name: F.name, tag: F.tag });
      sound.play(r.up ? 'heartUp' : 'heart');
      npcs.emote(n, joyAnim(n.kind), r.up ? 1.6 : 0.9);
    }
    if (r.gift) {
      sayAs(n, [playLine(n, 'gift')], () => {
        hud.banner('선물을 받았어요!', FURNITURE[r.gift].name, 3000);
        sound.play('done');
        endTalk();
      });
      return;
    }
    endTalk();
  }

  // 하치와레의 '궁금한 게 있어': 안내에서 배운 것 · 자주 묻는 것
  function askHelp(n, line) {
    askAs(n, line, [...HELP_TOPICS.map((t) => t.q), '이제 괜찮아'], (i) => {
      const topic = HELP_TOPICS[i];
      if (!topic) { sayAs(n, ['궁금한 거 생기면 또 물어봐~'], endTalk); return; }
      sayAs(n, topic.lines, () => {
        if (topic.home) { endTalk(); escort = true; npcs.lead('hachiware', homeLead); }
        else askHelp(n, '또 궁금한 거 있어?');
      });
    });
  }

  // 같이 놀기: 대사는 친구마다 자기 말투로(core/npclines.js 의 playAsk · rps… · tag… · dance…)
  const HANDS = [['scissors', '가위'], ['rock', '바위'], ['paper', '보']];
  const playLine = (n, key, vars = {}) => lineOf(n.kind, key, { name: '{name}', ...vars }); // {name} 은 대화 상자가 채운다
  function askPlay(n) {
    askAs(n, playLine(n, 'playAsk'), ['가위바위보', '술래잡기', '같이 춤추기', '다음에 놀자'], (i) => {
      if (i === 0) playRps(n, playLine(n, 'rpsGo'));
      else if (i === 1) sayAs(n, [playLine(n, 'tagGo')], () => startTag(n));
      else if (i === 2) sayAs(n, [playLine(n, 'danceGo')], () => startDance(n));
      else endTalk();
    });
  }
  function playRps(n, line) {
    askAs(n, line, HANDS.map((h) => h[1]), (i) => {
      const theirs = pick(HANDS), res = rps(HANDS[i][0], theirs[0]), said = playLine(n, 'rpsShow', { hand: theirs[1] });
      if (res === 'draw') { playRps(n, `${said} ${playLine(n, 'rpsDraw')}`); return; }
      if (res === 'win') { player.cheerTime = 1.6; sound.play('pass'); }
      else { npcs.emote(n, joyAnim(n.kind), 1.6); sound.play('none'); }
      sayAs(n, [said, playLine(n, res === 'win' ? 'rpsLose' : 'rpsWin')], () => {
        askAs(n, playLine(n, 'rpsAgain'), ['한 판 더!', '그만할래'], (k) => { if (k === 0) playRps(n, playLine(n, 'rpsGo')); else reward(n, 'play'); });
      });
    });
  }
  /** 술래잡기: 친구가 도망가고, 15초 안에 가까이 가면 잡힌다. */
  function startTag(n) {
    npcs.hold(n, false);
    talking = null;
    npcs.flee(n, true);
    tag = { n, t: 15, head: 1.2 }; // 처음 1.2초는 친구가 먼저 달아나고 나는 기다린다(바로 옆에서 시작해도 잡히지 않게)
    input.setEnabled(false);
    sound.play('job');
  }
  function endTag(caught) {
    const n = tag.n, stolen = tag.thief;
    tag = null;
    hud.setTimer(null);
    npcs.flee(n, false);
    if (stolen) { endThiefChase(n, stolen, caught); return; }
    beginTalk(n);
    if (caught) { player.cheerTime = 1.6; sound.play('pass'); } else npcs.emote(n, joyAnim(n.kind), 1.6);
    sayAs(n, [playLine(n, caught ? 'tagCaught' : 'tagEscaped')], () => reward(n, 'play'));
  }
  /** 같이 춤추기: 둘이 4초 동안 춤춘다. */
  function startDance(n) {
    npcs.emote(n, 'dance', 4);
    player.danceTime = 4;
    sound.play('done');
    dance = { n, t: 4 };
  }
  /** 매 프레임: 술래잡기 시간 · 잡았는지, 춤이 끝났는지, 집 안내가 끝났는지. */
  function updateFun(dt) {
    if (tag) {
      const ready = tag.head > 0;
      tag.head -= dt;
      if (ready && tag.head <= 0) input.setEnabled(true); // 출발!
      if (!ready) tag.t -= dt;
      const secs = { icon: ICO.clock, text: `${Math.max(0, Math.ceil(tag.t))}초` };
      hud.setTimer(tag.thief ? ['소매치기 모몽가 잡기!', secs, { icon: 'coin', text: won(tag.thief) }]
        : ready ? `${FRIENDS[tag.n.kind].name}가 도망간다… 준비!` : [`${FRIENDS[tag.n.kind].name} 잡기!`, secs]);
      const caught = tag.head <= 0 && Math.hypot(tag.n.x - player.position.x, tag.n.z - player.position.z) < tag.n.chibi.radius + 0.45;
      if (caught || tag.t <= 0) endTag(caught);
    }
    if (dance) {
      dance.t -= dt;
      if (dance.t <= 0) {
        const n = dance.n;
        dance = null;
        sayAs(n, [playLine(n, 'danceEnd')], () => reward(n, 'play'));
      }
    }
    updateTheft(dt);
    if (escort && !guide.open && !talking && nearHome()) {
      escort = false;
      const h = npcs.byKind('hachiware');
      beginTalk(h);
      sayAs(h, ['여기가 네 집이야!'], () => { npcs.lead('hachiware', null); endTalk(); });
    }
  }

  // ---------- 마을 살림: 친구들도 게시판 일감을 받아 일하고, 쉬고, 라멘을 사 먹는다 ----------
  // 일감은 하루 한도를 나눠 쓰므로 친구들이 많이 받아 가면 내 몫이 줄어든다(core/villagers.js)
  const restUntil = {}; // 친구마다 다음에 할 일을 고를 시각(마을 살림 시계, 초)
  let lifeClock = 0, brainT = 0;
  let theft = null; // 모몽가가 살금살금 다가오는 중 { n, t }
  Object.keys(VILLAGERS).forEach((k) => { restUntil[k] = 2 + Math.random() * 14; }); // 시작하자마자 한꺼번에 움직이지 않게 조금씩 어긋나게
  /**
   * 여럿이 함께 쓰는 곳의 자리(친구가 갈 때 빈자리를 고른다): 게시판 앞 넷 · 스티커 작업대 둘레 다섯. 라멘 가게는 아래 ramenSeatSteps.
   * 문 앞(내가 말 거는 자리)과 그곳 직원 자리는 비워 둔다. spots 는 문 앞 자리, 작업대 · 게시판 가운데는 그보다 1.7 · 1.65 뒤.
   */
  const SLOTS = {
    board: () => { const b = village.spots.board; return [[-0.7, 0.25], [0.15, 0.9], [-1.5, 0.6], [-0.6, 1.1]].map(([dx, dz]) => ({ x: b.x + dx, z: b.z + dz })); },
    bench: () => { const f = village.spots.factory, cz = f.z - 1.7; return [[-0.45, 0.8], [0.35, 0.8], [-0.4, -0.8], [0.4, -0.8], [-1.15, 0]].map(([dx, dz]) => ({ x: f.x + dx, z: cz + dz })); }
  };
  // ---------- 라멘 가게 자리: 한 자리에 한 명씩 앉고, 다 찼으면 뒤에 줄을 섰다가 빈자리가 나면 앉는다 ----------
  const RAMEN_WAIT = 45; // 줄 서서 기다리는 최대 시간(초)
  const ramenAt = (list) => { const r = village.spots.ramen; return list.map(([dx, dz]) => ({ x: r.x + dx, z: r.z + dz })); };
  const ramenFace = () => ({ x: village.spots.ramen.x, z: village.spots.ramen.z - 1.5 });
  /** 그 자리에 다른 누가 앉아 있거나 앉으러 가는 중인지(라멘 일정이 남아 있을 때만: 다른 일로 바뀌면 자리는 저절로 빈다). */
  /** 손님이 앉지도 오지도 않는 빈 의자 하나(없으면 null): 라멘 아저씨가 테이블을 닦으러 갈 곳. */
  const emptySeat = (me) => {
    const free = ramenAt(RAMEN_SEATS).filter((p, i) => !seatTaken(i, me) && !npcs.list.some((m) => m !== me && !m.away && Math.hypot(m.x - p.x, m.z - p.z) < 0.8));
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  };
  const seatTaken = (i, me) => npcs.list.some((m) => m !== me && m.ramenSeat === i && !m.away && m.plan && m.plan.some((s) => s.ramen));
  /** 가장 가까운 빈자리를 맡는다 → 자리 { x, z } | null */
  function takeSeat(n) {
    const seats = ramenAt(RAMEN_SEATS), free = seats.map((_, i) => i).filter((i) => !seatTaken(i, n));
    if (!free.length) return null;
    const i = free.sort((a, b) => Math.hypot(seats[a].x - n.x, seats[a].z - n.z) - Math.hypot(seats[b].x - n.x, seats[b].z - n.z))[0];
    n.ramenSeat = i;
    return seats[i];
  }
  /**
   * 라멘 가게까지 가서 빈자리에 앉는 일정 단계. 자리가 다 찼으면 뒤에 줄을 서서(하는 일 '라멘 줄 서는 중') 빈자리가 나기를 기다린다.
   * 이어지는 먹기 단계에도 ramen: true 를 붙여야 먹는 동안 자리를 지킨다(act 는 시작할 때 일정에서 빠지므로, 마지막 먹기 뒤의
   * 단계까지 붙여야 다 먹을 때까지 자리가 비지 않는다). 너무 오래 기다리면 그만두고 잠깐 쉰다(giveUp: 그때 더 할 일).
   */
  function ramenSeatSteps(n, giveUp = null) {
    const sitDown = () => { const p = ramenAt(RAMEN_SEATS)[n.ramenSeat]; n.plan.unshift({ do: 'walk', x: p.x, z: p.z, near: 0.45, ramen: true }); };
    n.ramenSeat = null; // 지난번 자리는 잊는다(새 일정이 자리를 고르기 전부터 그 자리를 막지 않게)
    return [{
      do: 'call', ramen: true,
      fn: () => {
        n.ramenSeat = null;
        if (takeSeat(n)) { sitDown(); return; }
        const doing = mindOf(n.kind).doing;
        setDoing(n.kind, 'bowl', '라멘 줄 서는 중');
        n.plan.unshift(
          { do: 'walk', slots: ramenAt(RAMEN_QUEUE), near: 0.5, ramen: true },
          { do: 'until', ramen: true, face: ramenFace(), max: RAMEN_WAIT, test: () => !!takeSeat(n), onGiveUp: () => { n.ramenSeat = null; restHere(n.kind, 6 + Math.random() * 6); giveUp?.(); } },
          { do: 'call', ramen: true, fn: () => { mindOf(n.kind).doing = doing; sitDown(); } }
        );
      }
    }];
  }
  // ---------- 친구 집 · 동굴에 놀러 가기(3단계) ----------
  const rooms = createRooms();
  // ---------- 사이드스토리 '우사기의 집'(stories/usagiclub.js): 토끼굴 둘 · 클럽 장면 · 박자 맞추기 ----------
  const club = createClub(), rhythm = createRhythm(ui), burrows = createBurrows(scene, village);
  /** 그 친구를 잠자리에(집 안으로): 다음 날 아침 늘 그렇듯 자기 집에서 나온다. */
  const putToBed = (kind) => {
    const n = npcs.byKind(kind);
    if (!n || !state) return;
    npcs.goIn(n);
    awayInfo[kind] = { why: 'sleep', until: 0, ...(hourOf(state.clock) >= 18 ? { day: state.clock.day } : {}) }; // 저녁이면 다음 날 아침에
    setDoing(kind, 'moon', '자는 중');
  };
  // 사이드스토리 '시사의 슈퍼 알바이터'(stories/shisa.js): 저녁 공부 퀴즈 · 시험 날
  const shisaStory = createShisaStory({
    guide, npcs, hud, sound, input, village, staged, who: (kind) => whoOf({ kind }), me: () => meWho(), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    skipHours: (h) => commit({ ...state, clock: { ...state.clock, t: Math.min(0.999, state.clock.t + h / 24) } }), getPlayer: () => player
  });
  // 사이드스토리 '하치와레가 구덩이에!'(stories/hachipit.js): 숲 구덩이 · 밧줄 영차
  const pit = createPit(scene, village);
  hachiPit = createHachiPit({
    getState: () => state, npcs, village, hud, guide, sound, input, staged, pit, who: (kind) => whoOf({ kind }), narrator: NARRATOR,
    fill: (lines) => lines.map(fillName), getPlayer: () => player, regionAt,
    startStory: (id) => { commit(startQuest(state, id)); sound.play('job'); hud.announce({ kicker: '사이드스토리 시작!', title: QUESTS[id].title, sub: shortGoal(state, id).goal, to: 'quest', id }); },
    finishStory: (id) => { const st = stepOf(state, id), lines = [...st.say]; lines.speaker = st.speaker || QUESTS[id].giver; questScene = true; input.setEnabled(false); finishQuestStep(id, null, lines); }
  });
  // 사이드스토리 '잠옷 밤나들이'(stories/pajama.js): 귀 달린 잠옷을 입은 셋이 연못가에서 별 보다 잠들기
  const cliff = createCliff(scene, village); // 마을 밖 남쪽 바다가 보이는 절벽 · 통나무
  pajama = createPajamaStory({
    npcs, village, hud, guide, input, staged, who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    getPlayer: () => player, cam, cliff, get starfall() { return starfall; }, // starfall 은 아래에서 만든다(그때그때 읽는다)
    wear: (chibi, kind, on) => wearPajama(chibi, on, PAJAMA_COLORS[kind], { ownEars: true }), // 후드 귀는 그 친구 귀 모양 그대로
    sleepHere: (after, dark) => doSleep('home', after, dark), // dark: 화면이 깜깜한 동안(아침 자리로 옮겨 두기)
    wakeBeside: (kind, x, z) => { const n = npcs.byKind(kind); if (!n) return; staged.add(kind); npcs.comeOut(n, x, z); delete awayInfo[kind]; setDoing(kind, null, null); }
  });
  usagiClub = createUsagiClub({
    getState: () => state, commit: (s) => commit(s), npcs, get player() { return player; }, cam, village, input, hud, guide, sound, club, rhythm, burrows, staged,
    who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), putToBed: (k) => putToBed(k), homeDoor: (k) => homeDoor(k),
    myLook: () => myLook(), onAbort: () => unlockAfterScene()
  });
  // 사이드스토리 '수상한 섬 합숙'(stories/island.js): 남쪽 선착장 · 섬 장면 · 섬 놀이 화면(연타 · 타이밍)
  const isle = createIsland(), pier = createPier(scene, village), minigame = createMinigame(ui);
  islandTrip = createIslandTrip({
    npcs, village, hud, guide, sound, input, staged, isle, rhythm, minigame, pier, cam, getPlayer: () => player,
    who: (kind) => whoOf({ kind }), me: () => meWho(), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), myLook: () => myLook(),
    // 마지막 밤: 밤 10시로 맞추고 진짜로 잔다(다음 날 아침). 섬에 있는 동안 마을 시계는 멈춰 있다
    sleepOver: (after) => { const late = (22 - 6) / 24; if (state.clock.t < late) commit({ ...state, clock: { ...state.clock, t: late } }); doSleep('home', after); },
    arriveBeside: (kind, x, z) => { const n = npcs.byKind(kind); if (!n) return; staged.add(kind); npcs.comeOut(n, x, z); delete awayInfo[kind]; setDoing(kind, null, null); }
  });
  // 사이드스토리 '파자마 파티즈'(stories/pajamaidol.js): 밤 광장 무대(world/idolstage.js) · 아이돌 넷 · 원곡(core/idolsong.js) · 응원 리듬 놀이
  // 무대(캐릭터 열넷)는 처음 공연을 볼 때 만든다: 게임을 켤 때 휴대폰을 무겁게 하지 않게
  let idolStage = null;
  idolStory = createIdolStory({
    hud, guide, sound, input, rhythm, get stage() { return idolStage || (idolStage = createIdolStage()); }, cam, getPlayer: () => player,
    who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), myLook: () => myLook()
  });
  // 사이드스토리 '별 세 개 레스토랑'(stories/stardiner.js): 들판 길가 가게 겉모습(이야기를 받은 동안만) · 가게 안 장면(처음 들어갈 때 만든다) · 쇠고랑 단추
  const dinerFront = createDinerFront(scene, village);
  let dinerStage = null;
  starDiner = createStarDinerStory({
    hud, guide, sound, input, get stage() { return dinerStage || (dinerStage = createStarDiner()); }, game: createStarGame(ui), cam, getPlayer: () => player,
    who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName), ui,
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), myLook: () => myLook(),
    front: dinerFront, villageScene: scene, makeTrio: () => buildStarTrio(),
    // 같이 도망 나온 친구: 내 옆에 세워 두고(일과는 잠시 미룬다), 이야기가 끝나면 놓아준다
    arriveBeside: (kind, x, z) => { const n = npcs.byKind(kind); if (!n) return; staged.add(kind); npcs.comeOut(n, x, z); npcs.hold(n, true); delete awayInfo[kind]; setDoing(kind, null, null); },
    letGo: (kind) => { const n = npcs.byKind(kind); if (n && staged.has(kind)) npcs.hold(n, false); staged.delete(kind); }
  });
  // 사이드스토리 '검은 별똥별'(stories/blackstar.js): 치이카와네 방(처음 들어갈 때 만든다) · 같은 날 되풀이(core/blackstar.js)
  let chiiRoom = null;
  blackStar = createBlackStarStory({
    hud, guide, sound, input, npcs, staged, ui, getPlayer: () => player, who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), myLook: () => myLook(),
    get stage() { return chiiRoom || (chiiRoom = createChiiRoom()); }, villageScene: scene, minigame, homeOf: (kind) => homeDoor(kind),
    startLoop: () => commit(loopStart(state)), markLoop: () => commit(loopMark(state)), endLoop: () => commit(loopEnd(state)),
    rewindNow: () => { commit(loopRewind(loopMark(state))); afterLoopRewind(); }, // 장면 끝의 되감기: 본 장면을 적어 두고 같은 날 아침으로
    nudgeSearch: () => { appNudge = 'search'; },
    setRain: (on) => { weather.setRain(on); sound.rain(on); }
  });
  // 사이드스토리 '위스키 봉봉'(stories/bonbon.js): 서쪽 숲길 옆 초콜릿 덩굴(이야기를 받은 동안만) · 숲속 빈터 장면(처음 들어갈 때 만든다)
  const bonbonFront = createBonbonFront(scene, village);
  let bonbonGlade = null;
  bonbonStory = createBonbonStory({
    hud, guide, sound, input, rhythm, minigame, get stage() { return bonbonGlade || (bonbonGlade = createBonbonGlade()); }, cam, getPlayer: () => player,
    who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), myLook: () => myLook(), front: bonbonFront,
    // 같이 마을로 돌아온 친구: 내 옆에 세워 두고(일과는 잠시 미룬다), 이야기가 끝나면 놓아준다
    arriveBeside: (kind, x, z) => { const n = npcs.byKind(kind); if (!n) return; staged.add(kind); npcs.comeOut(n, x, z); npcs.hold(n, true); delete awayInfo[kind]; setDoing(kind, null, null); },
    letGo: (kind) => { const n = npcs.byKind(kind); if (n && staged.has(kind)) npcs.hold(n, false); staged.delete(kind); }
  });
  // 사이드스토리 '스위치'(stories/switch.js): 바위산 북쪽 끝 절벽에 늘 있는 창살로 막힌 동굴 입구 · 마을에서 따라다니는 풍뎅이 ·
  // 우사기가 들고 다니는 스위치(동굴에 가기 전까지) · 바위산 기슭 장면(처음 들어갈 때 만든다)
  const switchFront = createSwitchFront(scene, village);
  const beetleBuddy = createBeetleBuddy(scene);
  const villageSwitch = buildSwitchGadget();
  let switchStage = null;
  switchStory = createSwitchStory({
    hud, guide, sound, input, get stage() { return switchStage || (switchStage = createSwitchStage()); }, cam, getPlayer: () => player,
    who: (kind) => whoOf({ kind }), narrator: NARRATOR, fill: (lines) => lines.map(fillName),
    setMode: (m) => { mode = m; }, setCinematic: (on) => setCinematic(on), myLook: () => myLook(), front: switchFront,
    arriveBeside: (kind, x, z) => { const n = npcs.byKind(kind); if (!n) return; staged.add(kind); npcs.comeOut(n, x, z); npcs.hold(n, true); delete awayInfo[kind]; setDoing(kind, null, null); },
    letGo: (kind) => { const n = npcs.byKind(kind); if (n && staged.has(kind)) npcs.hold(n, false); staged.delete(kind); }
  });
  /**
   * 스위치 풍뎅이(창살을 연 뒤 마지막 장면 전까지): 지금 있는 곳(마을 · 내 집 · 친구 방)의 장면 where 로 옮겨 가 내 자리 me 를 따라온다.
   * hidden: 그 장면을 그리지 않는 동안(마을 화면이 아닐 때) 숨는다. canStand(x, z): 집 안에서 설 수 있는지(가구를 돌아서 온다).
   */
  function beetleFollow(dt, t, where, me, hidden = false, canStand = null) {
    const bstep = visiting ? -1 : beetleStep(), follow = bstep >= 1 && bstep <= 4;
    if (follow !== beetleBuddy.on) beetleBuddy.show(follow, me);
    if (follow) beetleBuddy.setScene(where, me, canStand);
    beetleBuddy.update(dt, t, me, hidden, where !== scene, canStand);
  }
  /** 스위치 이야기에서 지금 단계(받지 않았거나 끝났으면 -1): 0 은 동굴에 가기 전(우사기가 스위치를 들고 다닌다), 1 ~ 4 는 창살을 연 뒤 마지막 장면 전(풍뎅이가 따라다닌다). */
  const beetleStep = () => (state && isActive(state, 'beetleSwitch') ? (state.quests.beetleSwitch || {}).step ?? -1 : -1);
  /**
   * 테스트 앱 '스위치'(디버그 beetleSwitch 도 같다): 'open' 부탁을 받은 채 오전 10시 바위산 동굴 앞(걸어 들어가면 시작),
   * 'teeth' 풍뎅이와 다닌 셋째 날 오전 10시 우사기 옆(말을 걸면 이빨), 'finale' 갑옷 씨와 상담한 뒤 동굴 앞(걸어 들어가면 마지막 장면 · 보상까지),
   * 'show' · 'showEnd' 처음 · 마지막 장면만(보상 없음).
   */
  function devBeetleSwitch(at) {
    if (switchStory.active) return;
    if (at === 'show' || at === 'showEnd') { switchStory.play(at === 'show' ? 'switchOpen' : 'switchFinale', () => hud.toast('테스트: 스위치 끝', 2400)); return; }
    const qs = { ...(state.quests || {}) };
    delete qs.beetleSwitch;
    const step = { open: 0, teeth: 2, finale: 4 }[at] ?? 0, day = Math.max(11, state.clock.day);
    let s = startQuest({ ...state, quests: qs }, 'beetleSwitch');
    s = { ...s, quests: { ...s.quests, beetleSwitch: { ...s.quests.beetleSwitch, step, at: day - 1 } }, clock: { day, t: (10 - 6) / 24 } };
    commit(s);
    const usagi = npcs.byKind('usagi');
    const p = at === 'teeth' && usagi && !usagi.away ? { x: usagi.x + 1.5, z: usagi.z + 1 } : { x: switchFront.spot.x, z: switchFront.spot.z + 3.5 };
    player.setPosition(p.x, p.z);
    cam.snap(player.position);
  }
  // 사이드스토리 '하치와레의 카메라'(stories/camera.js): 광장에서 사진 찍기(뷰파인더 · 찍은 사진은 이 브라우저에) · 다음 날 뽑은 사진
  const photoUi = createPhotoUi(ui);
  /**
   * 지금 장면을 사진으로: pos · look 이 있으면 그 자리에서 본 모습, rect(화면 사각형 — 뷰파인더 틀)가 있으면 그만큼 오려 낸다(없으면 가운데 4:3).
   * 그리자마자 같은 순간에 옮겨 그려서(그림판이 아직 지워지기 전) 화면 글 · 말풍선 없이 장면만 담긴다. → JPEG data URL | null
   */
  function capturePhoto({ pos = null, look = null, rect = null } = {}) {
    const c = cam.camera, keepPos = c.position.clone(), keepQuat = c.quaternion.clone();
    try {
      if (pos) { c.position.copy(pos); c.lookAt(look); c.updateMatrixWorld(); }
      gfx.render(c);
      const cv = gfx.renderer.domElement, box = cv.getBoundingClientRect(), kx = cv.width / box.width, ky = cv.height / box.height;
      let sx, sy, sw, sh;
      if (rect) { sx = (rect.left - box.left) * kx; sy = (rect.top - box.top) * ky; sw = rect.width * kx; sh = rect.height * ky; }
      else { sh = Math.min(cv.height, cv.width * 0.75); sw = sh / 0.75; sx = (cv.width - sw) / 2; sy = (cv.height - sh) / 2; }
      const out = document.createElement('canvas');
      out.width = 240;
      out.height = 180;
      out.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, 240, 180);
      return out.toDataURL('image/jpeg', 0.82);
    } catch {
      return null; // 그림을 못 옮기는 기기면 사진 없이(뽑은 사진은 그림으로)
    } finally {
      if (pos) { c.position.copy(keepPos); c.quaternion.copy(keepQuat); c.updateMatrixWorld(); }
    }
  }
  cameraStory = createCameraStory({
    npcs, village, hud, guide, sound, input, staged, who: (kind) => whoOf({ kind }), narrator: NARRATOR, me: () => meWho(), fill: (lines) => lines.map(fillName),
    getPlayer: () => player, cam, photo: photoUi, capture: capturePhoto,
    setRain: (on) => { weather.setRain(on); sound.rain(on); },
    // 비 피할 곳: 지금 자리에서 가장 가까운 마을 안 큰 나무 밑(가게 처마는 셋이 들어가기엔 좁다). 줄기 남쪽(카메라 쪽) 잎 그늘에
    // 치이카와 · 하치와레 · 우사기, 나는 그 오른쪽 앞(카메라는 내 뒤에서 보니 셋 중 누구의 바로 앞에도 서지 않게)
    shelter: () => {
      const p = player.position, trees = village.treeSpots().filter((t) => Math.hypot(t.x, t.z) < VILLAGE_R - 4);
      const t = trees.reduce((b, o) => (!b || Math.hypot(o.x - p.x, o.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? o : b), null) || { ...village.spots.plaza, s: 1 };
      const free = (dx, dz) => village.nearestFree(t.x + dx * t.s, t.z + dz * t.s, 0.3);
      return { stand: free(1.6, 1.35), spots: [free(-1.0, 0.55), free(-0.1, 1.0), free(0.8, 0.6)] };
    },
    // 그 친구를 이야기로 데려온다: 집 안이면 나오게, 같이 토벌 · 같이 다니는 중이면 그만두게, 일과 기록은 지운다(끝나면 일과대로)
    bring: (kind, x, z) => {
      const n = npcs.byKind(kind);
      if (!n) return;
      if (n.party) partyEnd([kind], null);
      if (buddies.has(kind)) endBuddy(kind, null);
      staged.add(kind);
      npcs.comeOut(n, x, z);
      delete awayInfo[kind];
      setDoing(kind, null, null);
    },
    photosChanged: () => refreshPhotoFrame(),
    backdrop: () => (workStatus(state, 'clock') === 'open' ? { x: WORK_SPOTS.clock[0].x, z: WORK_SPOTS.clock[0].z, r: 0.9 } : null) // 광장 한가운데 시계탑
  });
  /** 같은 날 아침으로 되돌아온 뒤: 친구들은 각자 집에서 자고 있고(일어날 때 나온다), 마을에 있었으면 나는 내 집 앞에서. */
  function afterLoopRewind() {
    villageOvernight();
    if (mode === 'play' || mode === 'chiiroom') { const h = village.spots.home; player.setPosition(h.x, h.z + 1.2); cam.snap(player.position); }
  }
  let loopRewinding = false;
  /** 밤 12시가 지났는데 아직 되풀이 중이면: 시곗바늘이 거꾸로… 같은 날 아침으로(연출 · 대화 중이면 끝난 뒤에). */
  function loopTick() {
    if (loopRewinding || sleeping || !state || visiting || !loopDue(state) || blackStar.active || guide.open || questScene) return;
    loopRewinding = true;
    input.setEnabled(false);
    blackStar.rewindFx(() => { commit(loopRewind(state)); afterLoopRewind(); }, () => { loopRewinding = false; if (mode === 'play' || mode === 'home') input.setEnabled(true); });
  }
  let visit = null; // { kind, lodge }
  const friendDoors = () => ({ ...(village.homes || {}), hachiware: village.spots.hachiCave });
  /** 문을 두드린다: 집주인이 안에 있으면 들어가고(낮잠 중이면 반겨 준다), 밤잠 중이면 쫓겨났을 때만 재워 달라고 할 수 있다. */
  function knockHome(kind) {
    const n = npcs.byKind(kind), F = FRIENDS[kind], a = awayInfo[kind];
    if (!n || !n.away) { hud.toast(`${josa(F.name, '은/는')} 집에 없어요`, 2600); return; }
    if (a && a.why === 'sleep') {
      if (isEvicted(state) && bedtime()) {
        beginTalk(n);
        askAs(n, kind === 'momonga' ? '뭐야?! 이 밤에! 시끄러워!' : '…으음… 누구야…? 이 밤에…', [`하룻밤 재워 줘 (${won(LODGING_PRICE)})`, '미안, 그냥 갈게'], (i) => {
          if (i !== 0) { endTalk(); return; }
          if (state.money < LODGING_PRICE) { sayAs(n, ['…돈이 모자란 것 같아…'], endTalk); return; }
          commit(payVillager({ ...state, money: state.money - LODGING_PRICE }, kind, LODGING_PRICE, state.clock.day));
          sound.play('coin');
          sayAs(n, LODGE[kind] || ['…들어와.'], () => { endTalk(); enterVisit(kind, { lodge: true }); });
        });
        return;
      }
      hud.toast(`${josa(F.name, '은/는')} 쿨쿨 자고 있어요… 쉿!`, 2600);
      return;
    }
    enterVisit(kind);
  }
  function enterVisit(kind, { lodge = false } = {}) {
    cancelPull();
    partyEnd(null, 'partyLeave');
    visit = { kind, lodge };
    mode = 'visit';
    setCinematic(true);
    document.body.classList.add('in-home');
    hud.setAction(null);
    rooms.setRoom(kind, myLook(), VILLAGERS[kind] ? friendLook(state, kind) : {}); // 돈을 모아 산 가구 · 벽지 · 바닥 · 넓힌 방 · 포셰트
    sound.play('job');
    const F = FRIENDS[kind];
    if (lodge) { setTimeout(() => { if (mode === 'visit') doSleep('lodge', exitVisit); }, 900); return; }
    hud.toast(`${kind === 'hachiware' ? '하치와레네 동굴' : `${F.name}네 집`}에 왔어요`, 2600, HOME_ACTS[kind] ? { chips: [{ text: `✨ ${HOME_ACTS[kind].label}` }] } : null);
  }
  function exitVisit() {
    if (!visit) return;
    if (drill) endDrill();
    const d = friendDoors()[visit.kind];
    visit = null;
    mode = 'play';
    setCinematic(false);
    document.body.classList.remove('in-home');
    rooms.setCue(null);
    player.setPosition(d.x, d.z + 0.9);
    player.face(d.x, d.z + 3);
    cam.snap(player.position);
    if (!sleeping) input.setEnabled(true);
    save();
  }

  // ---------- 친구 집에서 할 거리: 집마다 하나씩(하루 한 번 하트 +2) + 간식 ----------
  const HOME_ACTS = {
    chiikawa: { label: '같이 낮잠 자기', ask: '같이 낮잠 잘래?' },
    usagi: { label: '풀 다발 정리하기', ask: '풀 정리 도와줄게!' },
    kurimanju: { label: '안주 구워 먹기', ask: '화로에 뭐 구워 먹자!' },
    momonga: { label: '거울 보며 꾸미기', ask: '거울 좀 써도 돼?' },
    rakko: { label: '같이 수련하기', ask: '수련 상대가 되어 줘!' },
    hachiware: { label: '같이 노래하기', ask: '같이 노래하자!' }
  };
  /** 오늘 이미 같이 놀았을 때. */
  const HOME_DONE = {
    chiikawa: ['…오늘은 벌써 푹 잤어…', '내일 또 같이 자자…!'], usagi: ['우라!', '(풀 다발이 이미 반듯하게 정리돼 있다)'],
    kurimanju: ['하아~ 오늘은 배불러~', '내일 또 구워 먹자~'], rakko: ['…오늘 수련은 끝났다.', '그 힘, 몬스터 앞에서 써 봐라. 내일 다시 와라.'],
    hachiware: ['오늘은 목이 좀 쉬었나 봐~', '내일 또 같이 부르자!'], momonga: ['또 거울?', '…흥, 마음대로 해.']
  };
  /** 간식(하루 한 번): 집주인마다 다른 맛 · 기운. */
  const SNACKS = {
    chiikawa: { lines: ['…이거, 같이 먹자…!', '(작은 쿠키를 반으로 나눠 준다)'], gain: 15 },
    hachiware: { lines: ['버섯 수프 끓여 놨어~', '따끈할 때 먹어!'], gain: 20 },
    usagi: { lines: ['우라!', '(커다란 주먹밥을 쑥 내민다)'], gain: 20 },
    kurimanju: { lines: ['하아~ 안주 남은 거 있어.', '먹어 먹어~'], gain: 15 },
    rakko: { lines: ['…녹차다.', '마음이 차분해진다.'], gain: 12 },
    momonga: { lines: ['내 간식인데…!', '…흥, 하나만이야. 고마워하라고!'], gain: 10 }
  };
  const doneToday = (kind) => friendOf(state, kind).home === state.clock.day;
  const gainStamina = (n) => { const before = state.stamina; commit({ ...state, stamina: Math.min(MAX_STAMINA, state.stamina + n) }); return state.stamina - before; };
  function giveSnack(n) {
    const S = SNACKS[n.kind];
    if (!S) { endTalk(); return; }
    sayAs(n, S.lines, () => {
      const got = gainStamina(S.gain);
      commit(markDay(state, n.kind, 'snack', state.clock.day));
      sound.play('eat');
      hud.toast('냠냠!', 2200, { chips: [got ? { icon: 'energy', text: `기운 +${got}` } : { text: '배불러요' }] });
      endTalk();
    });
  }
  /** 그 집의 놀이를 한다. */
  function doHomeAct(kind) {
    const n = npcs.byKind(kind);
    if (!n || !HOME_ACTS[kind] || talking || drill) return;
    if (kind !== 'momonga' && doneToday(kind)) { beginTalk(n); sayAs(n, HOME_DONE[kind], endTalk); return; }
    const a = rooms.actSpot();
    if (a) rooms.moveNear(a.x, a.z); // 침대 · 화로 · 짚 인형 옆으로 가서 한다
    beginTalk(n);
    if (kind === 'chiikawa') {
      // 같이 낮잠: 화면이 어두워졌다가 한 시간 반 뒤에 깬다(기운 +40)
      sayAs(n, ['…같이 자자…!', '(이불을 반으로 나눠 덮어 준다)'], () => {
        overlay = true;
        input.setEnabled(false);
        hud.curtain(true, '쿨쿨… 💤');
        sound.play('sleep');
        setTimeout(() => {
          state = { ...state, clock: advance(state.clock, 45) };
          const got = gainStamina(40);
          hud.curtain(false);
          overlay = false;
          sayAs(n, ['…잘 잤다…♪', '{name}이랑 자니까 꿈도 좋았어…!'], () => { hud.toast('푹 잤어요', 3000, { chips: [{ icon: 'energy', text: `기운 +${got}` }, { text: '1시간 30분 지남' }] }); reward(n, 'home'); });
        }, 2200);
      });
    } else if (kind === 'usagi') {
      // 풀 다발 정리: 우사기가 뽑아 둔 풀을 나눠 준다(가방 → 일감에 바로 낼 수 있다)
      sayAs(n, ['우라!', '(쓱쓱 싹싹… 같이 풀 다발을 정리한다)', '야하! (풀을 한 움큼 나눠 준다)'], () => {
        let s = addItem(state, 'weed', 4, 4).state;
        s = addItem(s, 'clover', 2, 2).state;
        commit(s);
        hud.bagBump();
        hud.toast('풀을 받았어요!', 2800, { chips: [{ icon: itemSvg('weed'), text: '잡초 4' }, { icon: itemSvg('clover'), text: '토끼풀 2' }] });
        reward(n, 'home');
      });
    } else if (kind === 'kurimanju') {
      // 화로 구이: 낚은 생선이 있으면 생선구이로(값싼 것부터 세 마리까지, 큰 고기는 두 접시), 말랑 젤리가 있으면 젤리 구이 2개로, 없으면 풋콩을 구워 먹는다
      const grill = grillFish(state);
      if (grill.ok || grill.reason === 'full') {
        sayAs(n, ['오~ 싱싱한 생선이네! 화로에 올려 보자~', '(화로에 생선을 굽는다… 지글지글)', '생선구이 완성~! 하아~ 냄새 좋다'], () => {
          const g = grillFish(state); // 말하는 사이 가방이 바뀌었을 수 있다
          if (!g.ok) { hud.toast(g.reason === 'full' ? '가방이 꽉 찼어요' : '구울 생선이 없어요', 2400); reward(n, 'home'); return; }
          commit(g.state);
          hud.bagBump();
          sound.play('eat');
          hud.toast(`생선구이 ${g.made}개!`, 3000, { icon: itemSvg('grilledfish'), chips: Object.entries(g.used).map(([id, k]) => ({ icon: itemSvg(id), text: `${FISH[id].name} −${k}` })) });
          reward(n, 'home');
        });
      } else if (countOf(state, 'jelly') > 0) {
        sayAs(n, ['오~ 말랑 젤리 있네! 이리 줘 봐~', '(화로에 젤리를 굽는다… 치익—)', '젤리 구이 완성~! 두 개 챙겨 가. 하아~'], () => {
          commit(addItem(takeItem(state, 'jelly', 1).state, 'jellybake', 2).state);
          hud.bagBump();
          hud.toast('젤리 구이 2개!', 2800, { icon: itemSvg('jellybake'), chips: [{ icon: itemSvg('jelly'), text: '말랑 젤리 −1' }] });
          reward(n, 'home');
        });
      } else {
        sayAs(n, ['하아~ 풋콩이나 구워 먹자~', '(화로에 풋콩을 굽는다… 톡톡)', '짭짤하지? 생선이나 말랑 젤리 가져오면 구워 줄게~'], () => {
          const got = gainStamina(20);
          sound.play('eat');
          hud.toast('냠냠!', 2400, { chips: [got ? { icon: 'energy', text: `기운 +${got}` } : { text: '배불러요' }] });
          reward(n, 'home');
        });
      }
    } else if (kind === 'momonga') {
      // 거울: 옷장을 열어 갈아입는다. 처음이면(하루 한 번) 하트 +2
      const first = !doneToday(kind);
      sayAs(n, first ? ['…내 거울이야. 특별히 빌려주는 거야.', '꾸며 봐. 나보다 귀여우면 안 돼!'] : HOME_DONE.momonga, () => {
        if (first) reward(n, 'home'); else endTalk();
        setTimeout(() => { if (mode === 'visit' && !talking) panels.openWardrobe(); }, first ? 900 : 100);
      });
    } else if (kind === 'rakko') {
      sayAs(n, ['…좋다. 짚 인형을 쳐라.', '바늘이 초록에 들 때 눌러라. 다섯 번 중 세 번이다.', '해내면 오늘 하루 네 일격이 더 세진다.'], () => { endTalk(); startDrill(n); });
    } else if (kind === 'hachiware') {
      // 같이 노래: 짧은 노래 · 둘이 춤 · 기분이 좋아져 기운 +15
      sayAs(n, ['좋아~! 하나, 둘, 셋!', '라~ 라라~ ♪'], () => {
        talking = null;
        overlay = true;
        input.setEnabled(false);
        sound.play('song');
        rooms.pose('dance', 3);
        rooms.hostPose('dance', 3);
        setTimeout(() => {
          overlay = false;
          const got = gainStamina(15);
          beginTalk(n);
          sayAs(n, ['같이 부르니까 훨씬 좋다~!', '{name} 목소리 예쁘다~ 또 같이 하자!'], () => { hud.toast('기분이 좋아졌어요', 2600, got ? { chips: [{ icon: 'energy', text: `기운 +${got}` }] } : null); reward(n, 'home'); });
        }, 3000);
      });
    }
  }
  // 랏코네 수련: 바늘이 오가는 게이지에서 초록일 때 누른다. 다섯 번 중 세 번 맞히면 성공 → 그날 하루 공격 +1(기운 −8, 실패하면 −4)
  let drill = null; // { n, t, tries, hits, cool }
  const DRILL = { tries: 5, need: 3, zone: { from: 0.42, to: 0.6 }, speed: 2.6, cost: 8, failCost: 4, bonus: 1 };
  /** 오늘 랏코와 수련에 성공했으면 무기 힘 +1(하루 동안). */
  const trainBonus = () => (state && friendOf(state, 'rakko').home === state.clock.day ? DRILL.bonus : 0);
  function startDrill(n) {
    drill = { n, t: 0, tries: 0, hits: 0, cool: 0.35 };
    overlay = true;
    input.setEnabled(true); // 누르기만 받는다(걷기는 overlay 로 멈춘다)
  }
  const drillK = () => (1 - Math.cos(drill.t * DRILL.speed)) / 2;
  function drillPress() {
    if (!drill || drill.cool > 0) return;
    const k = drillK(), hit = k >= DRILL.zone.from && k <= DRILL.zone.to;
    drill.tries++;
    drill.cool = 0.35;
    rooms.pose('swing', 0.32);
    if (hit) { drill.hits++; sound.play('hit'); } else sound.play('none');
    const left = DRILL.tries - drill.tries;
    if (drill.hits >= DRILL.need || drill.hits + left < DRILL.need) finishDrill(drill.hits >= DRILL.need);
  }
  function endDrill() { drill = null; overlay = false; hud.hideMeter(); }
  function finishDrill(ok) {
    const n = drill.n;
    endDrill();
    commit({ ...state, stamina: Math.max(0, state.stamina - (ok ? DRILL.cost : DRILL.failCost)) });
    beginTalk(n);
    if (ok) sayAs(n, ['…훗. 좋은 일격이다.', '오늘은 네 무기에 힘이 더 실릴 거다.', '몬스터 앞에서 써 봐라.'], () => {
      rooms.hostPose(joyAnim(n.kind), 1.2); // 랏코: 고개를 끄덕이거나 박수
      hud.banner('수련 성공!', '', 2600, [{ text: `💪 공격 +${DRILL.bonus}` }, { icon: 'energy', text: `기운 −${DRILL.cost}` }]);
      sound.play('done');
      reward(n, 'home');
    });
    else sayAs(n, ['…아직이군.', `숨을 고르고 다시 와라. (기운 −${DRILL.failCost})`], endTalk);
  }

  // ---------- 친구들의 기운 · 잠(3단계) ----------
  /** 집에 들어가 있는 친구: kind → { why: 'sleep' | 'nap', until: 낮잠이 끝나는 마을 살림 시각 } */
  const awayInfo = {};
  const homeDoor = (kind) => (kind === 'hachiware' ? village.spots.hachiCave : village.homes && village.homes[kind]);
  const SLEEPY = { chiikawa: '…졸려… 이제 잘래…', hachiware: '하암~ 오늘도 수고했어~ 잘 자!', usagi: '하아… (하품)', kurimanju: '하아~ 한 잔 하고 자야지~', rakko: '…오늘 수련은 여기까지다', momonga: '졸려! 말 걸지 마!' };
  const TIRED_SAY = { chiikawa: '…힘들어… 조금 쉴래…', hachiware: '휴~ 잠깐 낮잠 좀 자고 올게~', usagi: '하아…', kurimanju: '하아~ 피곤해~ 좀 누워야지~', rakko: '…잠시 숨을 고르지.', momonga: '피곤해! 귀찮게 하지 마!' };
  const MORNING = { chiikawa: '…잘 잤다…♪', hachiware: '좋은 아침~!', usagi: '우라!', kurimanju: '하아~ 좋은 아침~', rakko: '…아침 수련 시간이다', momonga: '…뭘 봐? 아침부터' };
  const tireNpc = (kind, amount) => { if (state) state = villagerEnergy(state, kind, -amount, state.clock.day); }; // 메인으로 나간 뒤(state 없음)에는 세지 않는다
  /** 집(동굴)으로 걸어가서 들어간다. */
  function npcGoHome(n, why, quiet = false) {
    const d = homeDoor(n.kind);
    if (!d) return;
    if (!quiet) npcs.say(n, why === 'sleep' ? SLEEPY[n.kind] : TIRED_SAY[n.kind]);
    setDoing(n.kind, 'moon', why === 'sleep' ? '자러 가는 중' : '낮잠 자러 가는 중');
    npcs.plan(n, [{ do: 'walk', x: d.x, z: d.z + 0.3 }, {
      do: 'call',
      fn: () => { npcs.goIn(n); awayInfo[n.kind] = { why, until: lifeClock + 45 + Math.random() * 30 }; setDoing(n.kind, 'moon', why === 'sleep' ? '자는 중' : '낮잠 자는 중'); }
    }]);
  }
  /** 내가 잠든 사이 친구들도 밤 9시까지 저녁을 마저 보낸다(core/offscreen.js). 그날 일은 친구들이 기억해 다음 날 이야기한다. → 바뀐 state */
  function liveWhileAsleep(spans) {
    const skip = tutorialActive(state.tutorial) ? ['hachiware'] : [], out = { state, evening: [], morning: [] };
    const live = (span, list) => {
      const r = liveOffscreen(out.state, minds, { day: span.day, fromHour: span.from, toHour: span.to, skip });
      for (const [k, m] of Object.entries(r.minds)) minds[k] = { ...mindOf(k), ...m }; // 기억 · 하는 일 칸이 없는 마음이 들어오지 않게
      r.events.forEach((ev) => { list.push(ev); happen({ ...ev, day: span.day }); });
      out.state = r.state;
    };
    if (spans.evening) live(spans.evening, out.evening);
    if (spans.morning) { // 밤잠을 자고 일어났다: 기운이 가득 찬 채로 아침을 보낸다
      for (const k of Object.keys(VILLAGERS)) out.state = updateVillager(out.state, k, spans.morning.day, { energy: 100 });
      live(spans.morning, out.morning);
    }
    return out;
  }
  /**
   * 밤을 넘기지 않은 잠(또는 밤잠 뒤 이미 일어난 친구): 그사이 마지막으로 한 일에 맞는 곳에 가 있다
   * (일감 → 게시판, 라멘 → 라멘 가게, 그 밖 → 광장이나 집 앞). 하던 일 · 같이 토벌 · 공연은 끝나 있다.
   */
  function villageAfterNap(events, awake = () => true) {
    show = null;
    partyEnd(null, null);
    const S = village.spots;
    for (const kind of Object.keys(VILLAGERS)) {
      const n = npcs.byKind(kind);
      if (!n || !awake(kind) || (visit && visit.kind === kind) || (kind === 'hachiware' && tutorialActive(state.tutorial))) continue;
      const last = [...events].reverse().find((e) => e.who === kind || e.with === kind);
      const at = !last ? (Math.random() < 0.5 ? S.plaza : homeDoor(kind) || S.plaza) : last.type === 'job' ? S.board : last.type === 'meal' ? S.ramen : S.plaza;
      npcs.lead(kind, null);
      if (n.flee) npcs.flee(n, false);
      npcs.plan(n, []);
      npcs.comeOut(n, at.x + (Math.random() - 0.5) * 2.4, at.z + 1.2 + Math.random() * 1.2);
      delete awayInfo[kind];
      restUntil[kind] = 0;
      setDoing(kind, null, null);
    }
  }
  /**
   * 하룻밤이 지났다(내가 자는 동안 화면이 깜깜할 때): 하던 일 · 같이 토벌 · 공연은 끝나고, 친구들은 각자 집에서 자다가
   * 아침에 저마다 일어나 나온다(core/brain.js 의 WAKE). 갑옷 씨들 · 시사 · 카니는 가게 자리로 돌아가 있다.
   * 내가 묵는 집의 친구와 첫날 안내 중인 하치와레는 그대로 둔다.
   */
  function villageOvernight() {
    show = null;
    partyEnd(null, null);
    for (const kind of Object.keys(VILLAGERS)) {
      const n = npcs.byKind(kind);
      if (!n || (visit && visit.kind === kind) || (kind === 'hachiware' && tutorialActive(state.tutorial))) continue;
      npcs.lead(kind, null);
      if (n.flee) npcs.flee(n, false);
      npcs.goIn(n);
      awayInfo[kind] = { why: 'sleep', until: 0 };
      minds[kind] = { ...mindOf(kind), ...freshMind() }; // 푹 자고 나면 심심함 · 외로움도 가신다
      restUntil[kind] = 0;
      setDoing(kind, 'moon', '자는 중');
    }
    for (const kind of STAFF) {
      const n = npcs.byKind(kind);
      if (!n || n.away) continue;
      npcs.plan(n, []);
      npcs.comeOut(n, n.home.x, n.home.z);
      restHere(kind, 5 + Math.random() * 10);
    }
  }
  /** 1.5초마다 친구들이 다음에 할 일을 고른다(밤에는 집에 가서 자고, 기운이 모자라면 밥이나 낮잠). */
  function villageLife(dt) {
    lifeClock += dt;
    brainT -= dt;
    if (brainT > 0 || !state) return;
    brainT = 1.5;
    if (!lastRankers) rankNews(); // 처음엔 지금 랭커들을 기억만 해 둔다(바뀔 때 알린다)
    const day = state.clock.day, hour = hourOf(state.clock);
    if (show && mode === 'play' && Math.hypot(player.position.x - show.x, player.position.z - show.z) < 7) show.meT += 1.5; // 나도 공연을 듣는 중
    if (show && lifeClock > show.until + 25) show = null; // 공연하던 친구가 붙잡혀 끝내지 못했다
    for (const kind of Object.keys(VILLAGERS)) {
      const n = npcs.byKind(kind);
      if (!n) continue;
      npcs.setCar(kind, hasCar(state, kind)); // 하늘색 자동차를 샀으면(랏코) 마을 밖 먼 길은 차로
      npcs.setPochette(kind, friendLook(state, kind).pochette); // 돈을 모아 산 포셰트는 메고 다닌다
      if (staged.has(kind) || (starShow && starShow.pals && starShow.pals.includes(kind))) continue; // 연출 중(별똥별 · 사이드스토리): 끝나면 일과대로(밤이면 하품하고 집으로)
      if (!n.away) minds[kind] = growNeeds(mindOf(kind), kind, 1.5); // 깨어 있으면 심심함 · 외로움이 조금씩 찬다
      // 집 안: 밤잠은 아침에 저마다 일어나는 때(core/brain.js 의 WAKE)가 되면, 낮잠은 시간이 되면 나온다(내가 놀러 가 있으면 기다린다)
      if (n.away) {
        const a = awayInfo[kind] || { why: 'sleep', until: 0 };
        const wake = !isSleepHour(hour) && (a.why === 'sleep' ? hour >= wakeHourOf(kind) && !(a.day != null && day <= a.day) : lifeClock >= a.until); // 저녁에 든 잠은 날이 바뀐 뒤에
        if (wake && !(visit && visit.kind === kind)) {
          const d = homeDoor(kind);
          npcs.comeOut(n, d.x, d.z + 0.6);
          const e = villagerOf(state, kind, day).energy;
          state = villagerEnergy(state, kind, (a.why === 'sleep' ? 100 : NAP_ENERGY) - e, day);
          delete awayInfo[kind];
          if (a.why !== 'visit') npcs.say(n, a.why === 'sleep' ? MORNING[kind] : lineOf(kind, 'napWake')); // 놀러 왔던 내가 나가면 말없이 따라 나온다
        }
        continue;
      }
      // 돌아다니기만 해도 조금씩(나랑 같이 다니는 부탁 중에는 빼고: 오후 2시에도 지쳐서 낮잠 자러 가 버렸다)
      if (!buddies.has(kind)) tireNpc(kind, 0.3);
      if (buddies.has(kind)) { // 일상 부탁으로 같이 다니는 중: 잘 시간 한 시간 전부터 졸리다고 알리고, 잘 시간이 되면 하던 일에 맞게 인사하고 집으로(부탁은 그대로, 내일 이어서)
        const sleepy = isSleepHour(hour);
        if (!sleepy && hour >= BED_HOUR - 1 && !buddyYawned.has(kind)) { buddyYawned.add(kind); npcs.say(n, BUDDY_YAWN[kind] || '하아암… 졸려~'); npcs.emote(n, 'stretch', 1.4); }
        if (sleepy) {
          endBuddy(kind, buddyBedLine(kind));
          hud.toast(`${josa(nameOf(kind), '이/가')} 졸려서 집에 갔어요. 부탁은 내일 이어서 해요`, 3200, { icon: faceIcon(kind) });
          npcGoHome(n, 'sleep', true);
        } else if (villagerOf(state, kind, day).energy < TIRED) { endBuddy(kind, BUDDY_SAY[kind] ? BUDDY_SAY[kind].stop : null); npcGoHome(n, 'nap', true); }
        continue;
      }
      if (n.party) { // 같이 토벌 중: 밤이 되거나 지치면 인사하고 집으로
        if (isSleepHour(hour)) { partyEnd([kind], 'partyNightLeave'); npcGoHome(n, 'sleep', true); }
        else if (villagerOf(state, kind, day).energy < TIRED) { partyEnd([kind], 'partyTiredLeave'); npcGoHome(n, 'nap', true); }
        continue;
      }
      if (npcs.busy(n) || n === talking || (tag && tag.n === n) || (theft && theft.n === n)) continue;
      if (kind === 'hachiware' && tutorialActive(state.tutorial)) continue; // 첫날 안내 중에는 하치와레가 집에 가지 않는다
      const tired = villagerOf(state, kind, day).energy < TIRED;
      // 쿠리만쥬: 저녁(17 ~ 21시)에는 쉬던 것도 멈추고 맥주집 카운터 앞에서 한 잔(지쳤으면 먼저 쉰다)
      if (kind === 'kurimanju' && isPubHour(hour) && !tired && !isSleepHour(hour)) { npcPub(n); continue; }
      if (lifeClock < restUntil[kind] && !isSleepHour(hour) && !tired) continue;
      lifeDecide(n, kind, day, hour); // 두뇌: 욕구 · 성격 · 일과로 다음 할 일(core/brain.js)
    }
    // 갑옷 씨들 · 시사 · 카니: 지나가면 인사하고, 쉴 때가 지나면 일과대로 다음 일
    for (const kind of STAFF) {
      const n = npcs.byKind(kind);
      if (!n || n.away || staged.has(kind) || npcs.busy(n) || n === talking) continue; // 연출 중(시사 시험 날)이면 그대로
      staffGreet(n, kind);
      if (Math.random() < 0.03) staffTossSecret(n, kind); // 싫은 선물을 받아 뒀으면 내가 안 볼 때 슬쩍
      if (lifeClock >= restUntil[kind]) staffDecide(n, kind, hour);
    }
    maybeSteal(day, hour);
  }
  /**
   * 친구가 게시판까지 걸어와서 일감을 받고(이때 게시판의 남은 수가 준다) → 실제로 일하고(뽑은 풀 · 딴 열매를 센다)
   * → 게시판으로 돌아와 다 했으면 보수를 받는다. 다 못 했으면 보수 없이 일감을 게시판에 다시 건다.
   */
  function npcWork(n, typeId) {
    const T = JOB_TYPES[typeId], bench = village.spots.factory, benchMid = { x: bench.x, z: bench.z - 1.7 };
    const job = { day: 0, done: 0 };
    setDoing(n.kind, isFishJob(T) ? 'fish' : T.kind === 'sticker' ? 'star' : 'leaf', T.title);
    // 게시판 일감은 선착순: 아침이거나 할 수 있는 일감이 얼마 안 남았으면 뛰어간다
    const left = boardOf(state, state.clock.day).left, open = VILLAGERS[n.kind].jobs.reduce((a, id) => a + (left[id] || 0), 0);
    const hurry = hourOf(state.clock) < 10 || open <= 2;
    const steps = [{ do: 'walk', slots: SLOTS.board(), near: 0.45, run: hurry }, {
      do: 'call',
      fn: () => {
        const r = villagerTakesJob(state, n.kind, typeId, state.clock.day);
        if (!r.ok) { // 오는 사이에 다른 누가 받아 갔다
          n.plan = null;
          npcs.say(n, lineOf(n.kind, 'jobSoldOut'));
          restHere(n.kind, 8 + Math.random() * 12);
          return;
        }
        job.day = state.clock.day;
        commit(r.state, false);
        npcs.say(n, lineOf(n.kind, 'jobTake', { title: T.title }));
      }
    }];
    // 일하면 기운이 준다(풀 하나 6 · 열매 하나 5 · 스티커 한 판 15)
    // 뽑거나 딸 때 가끔 그 친구 말투로 한마디
    const mutter = (key) => { if (Math.random() < 0.45) npcs.say(n, lineOf(n.kind, key)); };
    if (isWeedJob(T)) steps.push({ do: 'weeds', kind: T.kind, left: T.target, onPull: () => { job.done++; tireNpc(n.kind, 6); mutter('pull'); } });
    else if (T.kind === 'berry') steps.push({ do: 'berries', left: T.target, onPick: () => { job.done++; tireNpc(n.kind, 5); mutter('berry'); } });
    else if (isFishJob(T)) {
      // 낚시 일감: 그 물고기가 사는 물가(연못 · 시냇물 · 바다)로 가서 한 마리씩 낚는다(일감 물고기는 일감에 낸다)
      const water = FISH[T.kind].waters.find((w) => w !== 'lake') || 'pond', spot = npcFishSpot(water) || npcFishSpot('pond');
      if (spot) steps.push({ do: 'walk', x: spot.x, z: spot.z, near: 0.4 });
      // 놓치기도 한다(친구마다 솜씨가 다르다): 다 낚을 때까지 더 던지고, 너무 많이 놓치면 다 못 한 채 돌아간다.
      // 낚시는 몸짓 하나로 쭉(던질 때마다 끊었다 이으면 그 사이에 옆에 선 나를 쳐다봤다), 한 번 던질 때마다 낚음 · 놓침(beats)
      const beats = [];
      let at = 0;
      for (let got = 0, cast = 0; got < T.target && cast < T.target * 4; cast++) {
        const miss = Math.random() < fishMiss(n.kind);
        at += 4 + Math.random() * 4;
        beats.push({ at, fn: miss ? () => npcMissFish(n) : () => { job.done++; npcLandFish(n, water, false, T.kind); } });
        if (!miss) got++;
      }
      steps.push({ do: 'act', anim: 'fish', face: spot ? spot.face : null, time: at + 0.4, beats, quick: true });
    } else steps.push({ do: 'walk', slots: SLOTS.bench(), near: 0.4 }, { do: 'act', anim: 'read', face: benchMid, time: T.target * 1.5, say: lineOf(n.kind, 'sticker') }, { do: 'call', fn: () => { job.done = T.target; tireNpc(n.kind, 15); } });
    steps.push({ do: 'walk', slots: SLOTS.board(), near: 0.45 }, {
      do: 'call',
      fn: () => {
        if (job.done >= T.target) {
          const pay = villagerPay(typeId);
          commit(payVillager(state, n.kind, pay, state.clock.day), false);
          npcs.say(n, lineOf(n.kind, 'jobDone', { pay: `+${won(pay)}` }));
          happen({ type: 'job', who: n.kind, title: T.title });
          setTimeout(() => staffSay('labor', 'paid', 8, n), 1600);
          npcSellBag(n);
        } else {
          if (job.day === state.clock.day) commit(returnToBoard(state, typeId, job.day), false); // 그날 일감이면 다시 건다
          npcs.say(n, lineOf(n.kind, 'jobFail'));
        }
        restHere(n.kind, goalOf(state, n.kind) ? 4 + Math.random() * 5 : 12 + Math.random() * 20); // 모으는 목표가 있으면 숨만 돌리고 다음 일감으로
      }
    });
    npcs.plan(n, steps);
  }
  // ---------- 친구들의 토벌: 자격증 시험(검정소) → 토벌 일감(마을 밖에서 진짜 몬스터를) → 랭킹 ----------
  // 그림이 없는 친구(시사 같은 직원)는 이름표 색 동그라미에 첫 글자
  const faceIcon = (kind) => (hasCharArt(kind) ? `<svg viewBox="-6 -8 76 76" aria-hidden="true">${charSvg(kind)}</svg>`
    : `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="${(FRIENDS[kind] || {}).tag || '#eee'}" stroke="#5a4431" stroke-width="3"/><text x="32" y="42" text-anchor="middle" font-size="28" font-weight="700" fill="${(FRIENDS[kind] || {}).ink || '#5a4431'}">${((FRIENDS[kind] || {}).name || '?').slice(0, 1)}</text></svg>`);
  const nameOf = (kind) => (HUNTER_PROFILES[kind] ? HUNTER_PROFILES[kind].name : FRIENDS[kind] ? FRIENDS[kind].name : kind);
  /** 친구가 검정소에 가서 토벌 자격증 시험을 본다(응시료는 친구 지갑에서). 붙으면 마을에 소식이 퍼진다. */
  function npcExam(n) {
    const ex = village.spots.exam, fee = LICENSES.hunter.fee;
    const seats = [[0.7, 0.7], [1.5, 1.0], [0.1, 1.3]].map(([dx, dz]) => ({ x: ex.x + dx, z: ex.z + dz }));
    setDoing(n.kind, 'pen', '토벌 자격증 시험');
    npcs.plan(n, [
      { do: 'walk', slots: seats, near: 0.45 },
      { do: 'act', anim: 'read', face: { x: ex.x, z: ex.z - 2 }, time: 6, say: lineOf(n.kind, 'examGo') },
      { do: 'call', fn: () => {
        const day = state.clock.day;
        if (!canTryExam(state, n.kind, day) || villagerOf(state, n.kind, day).money < fee) { n.plan = null; return; }
        const r = tryExam(villagerSpend(state, n.kind, fee, day), n.kind, day);
        commit(r.state, false);
        const near = Math.hypot(n.x - player.position.x, n.z - player.position.z) < 14;
        if (r.passed) {
          npcs.say(n, lineOf(n.kind, 'examPass'));
          hud.toast(`${josa(nameOf(n.kind), '이/가')} 토벌 자격증을 땄어요!`, 3600, { icon: faceIcon(n.kind) });
          rankNews();
        } else {
          npcs.say(n, lineOf(n.kind, 'examFail'));
          if (near) hud.toast(`${josa(nameOf(n.kind), '이/가')} 토벌 자격증 시험에 떨어졌어요`, 2800, { icon: faceIcon(n.kind) });
        }
        happen({ type: r.passed ? 'examPass' : 'examFail', who: n.kind });
        restHere(n.kind, 15 + Math.random() * 15);
        setTimeout(() => { if (state && !npcs.busy(n)) reactToFriend(n, r.passed); }, 2600); // 단짝이 달려와 축하하거나 달래 준다
      } }
    ]);
  }
  /** 친구의 술 자격 시험(차례 목표 다음에 바라는 것, core/goals.js): 검정소에서 응시료를 내고 보고, 붙든 떨어지든 마을 소식에 남는다. */
  function npcLiquorExam(n) {
    const ex = village.spots.exam;
    const seats = [[0.7, 0.7], [1.5, 1.0], [0.1, 1.3]].map(([dx, dz]) => ({ x: ex.x + dx, z: ex.z + dz }));
    setDoing(n.kind, 'pen', '술 자격 시험');
    npcs.plan(n, [
      { do: 'walk', slots: seats, near: 0.45 },
      { do: 'act', anim: 'read', face: { x: ex.x, z: ex.z - 2 }, time: 6, say: lineOf(n.kind, 'examGo') },
      { do: 'call', fn: () => {
        const day = state.clock.day;
        if (!canTryLiquor(state, n.kind, day)) { n.plan = null; return; }
        const r = tryLiquor(state, n.kind, day);
        commit(r.state, false);
        const ev = happen({ type: r.passed ? 'liquorPass' : 'liquorFail', who: n.kind });
        npcs.say(n, (r.passed && ev && storyLine(n.kind, ev, myName())) || lineOf(n.kind, r.passed ? 'examPass' : 'examFail'));
        if (r.passed) hud.toast(`${josa(nameOf(n.kind), '이/가')} 술 자격을 땄어요!`, 3600, { icon: faceIcon(n.kind) });
        else if (Math.hypot(n.x - player.position.x, n.z - player.position.z) < 14) hud.toast(`${josa(nameOf(n.kind), '이/가')} 술 자격 시험에 떨어졌어요`, 2800, { icon: faceIcon(n.kind) });
        restHere(n.kind, 15 + Math.random() * 15);
        setTimeout(() => { if (state && !npcs.busy(n)) reactToFriend(n, r.passed); }, 2600); // 단짝이 달려와 축하하거나 달래 준다
      } }
    ]);
  }
  /**
   * 친구의 토벌 일감: 게시판에서 받고 → 마을 밖 그 몬스터에게 걸어가 쓰러뜨리고(점수가 쌓인다) → 게시판에서 보수를 받는다.
   * 몬스터는 친구를 쫓지 않는다(나만 노린다). 다 못 잡고 오래 헤매면 그만두고 일감을 돌려놓는다.
   */
  function npcHunt(n, typeId) {
    const T = JOB_TYPES[typeId], power = npcPower(state, n.kind), job = { day: 0, done: 0 }, deadline = lifeClock + 110; // 3시간 반쯤 헤매면 돌아온다
    setDoing(n.kind, 'sword', `${MONSTERS[T.kind] ? MONSTERS[T.kind].name : '몬스터'} 토벌`);
    npcs.plan(n, [
      { do: 'walk', slots: SLOTS.board(), near: 0.45 },
      { do: 'call', fn: () => {
        const r = villagerTakesJob(state, n.kind, typeId, state.clock.day);
        if (!r.ok) { n.plan = null; npcs.say(n, lineOf(n.kind, 'huntSoldOut')); restHere(n.kind, 10); return; }
        job.day = state.clock.day;
        commit(r.state, false);
        npcs.say(n, lineOf(n.kind, 'huntGo', { mon: MONSTERS[T.kind] ? MONSTERS[T.kind].name : '' }));
      } },
      { do: 'hunt', left: T.target, giveUp: () => lifeClock > deadline,
        find: (x, z, skip) => monsters.nearest(x, z, 140, (m) => m.species === T.kind && !m.summoned && !m.exam && !m.M.boss && !m.bounty && !skip.has(m)), // 현상금 황금 대장은 내 몫
        hit: (m) => monsters.npcHit(m, power, n.x, n.z),
        onKill: (m) => {
          job.done++;
          tireNpc(n.kind, 8);
          const s = addKill(state, n.kind, m.species), drop = m.M.drop;
          // 전리품은 친구 가방에(게시판에서 판다). 싫어하는 전리품(랏코의 말랑 젤리 · 치이카와의 반짝 뿔)은 가방에 넣지 않고
          // 그 자리에서 노동 접수 값으로 판다 — 가방에 넣으면 싫은 선물처럼 몰래 버리러 다녀서 마을 바닥에 쌓였다
          const keep = drop && Math.random() < 0.6;
          commit(!keep ? s : tasteOf(n.kind, drop) === 'hate' ? payVillager(s, n.kind, sellPrice(drop), state.clock.day) : addToPantry(s, n.kind, drop, 1).state, false);
          npcs.say(n, lineOf(n.kind, 'huntCry'));
          rankNews();
        } },
      { do: 'walk', slots: SLOTS.board(), near: 0.45, run: true }, // 보수 받으러 뛰어서 돌아온다
      { do: 'call', fn: () => {
        if (job.done >= T.target) {
          const pay = villagerPay(typeId);
          commit(payVillager(state, n.kind, pay, state.clock.day), false);
          npcs.say(n, lineOf(n.kind, 'huntDone', { pay: `+${won(pay)}` }));
          happen({ type: 'hunt', who: n.kind, mon: MONSTERS[T.kind] ? MONSTERS[T.kind].name : '몬스터' });
          npcSellBag(n);
        } else {
          if (job.day === state.clock.day) commit(returnToBoard(state, typeId, job.day), false);
          npcs.say(n, lineOf(n.kind, 'huntFail'));
        }
        restHere(n.kind, 15 + Math.random() * 20);
      } }
    ]);
  }
  /**
   * 랭킹이 바뀌었으면 알린다: 새로 랭커가 된 사람(나는 큰 배너 + 얼굴 새기기 안내, 친구는 알림).
   * 처음 부를 때는 지금 랭커들을 기억만 한다.
   */
  let lastRankers = null;
  function rankNews() {
    const now = new Set(ranking(state, state.profile.name).filter((r) => r.ranker).map((r) => r.who));
    if (lastRankers) {
      for (const who of now) {
        if (lastRankers.has(who)) continue;
        if (who === 'me') { happen({ type: 'playerRanker', who: 'me' }); hud.banner('토벌 랭커가 됐어요!', '', 3600, [{ icon: ICO.pin, text: '검정소에서 얼굴 새기기' }]); sound.play('done'); }
        else hud.toast(`${josa(nameOf(who), '이/가')} 토벌 랭커가 됐어요!`, 3600, { icon: faceIcon(who) });
      }
      if (lastRankers.has('me') && !now.has('me')) hud.toast('랭커 자리에서 밀려났어요', 3000);
    }
    lastRankers = now;
  }

  // ---------- 같이 토벌: 하트가 쌓인 토벌 친구를 데려가면 내 둘레 몬스터를 같이 치고, 토벌 점수는 나눠 갖는다 ----------
  const PARTY_NO = {
    hearts: ['partyHearts', () => [{ icon: ICO.heart, text: `하트 ${PARTY_HEARTS}개부터` }]],
    myLicense: ['partyMyLicense', () => [{ icon: ICO.shield, text: '내 토벌 자격증' }, { icon: ICO.pin, text: '검정소' }]],
    license: ['partyLicense', () => [{ icon: ICO.shield, text: '친구도 토벌 자격증' }]],
    night: ['partyNight', () => [{ icon: ICO.moon, text: '낮에만' }]],
    tired: ['partyTired', () => [{ icon: ICO.zap, text: '기운이 모자라요' }]],
    full: ['partyFull', () => npcs.partyKinds().map((k) => ({ icon: faceIcon(k), text: nameOf(k) }))],
    busy: ['partyBusy', () => []]
  };
  /** '같이 토벌 가자!': 데려갈 수 있으면 따라나서고, 아니면 그 친구 말투로 왜 안 되는지(꼬리표로 조건). */
  function askParty(n) {
    const kind = n.kind, day = state.clock.day;
    const c = (n.plan && n.plan.length) || tutorialActive(state.tutorial) ? { ok: false, reason: 'busy' }
      : partyCheck(state, kind, { day, night: isSleepHour(hourOf(state.clock)), party: npcs.partyKinds() });
    if (!c.ok) {
      const [key, chips] = PARTY_NO[c.reason] || PARTY_NO.busy;
      const list = chips();
      sayAs(n, [list.length ? { text: lineOf(kind, key), chips: list } : lineOf(kind, key)], endTalk);
      return;
    }
    sayAs(n, [{ text: lineOf(kind, 'partyJoin'), chips: [{ icon: ICO.star, text: '토벌 점수는 나눠 가져요' }] }], () => { endTalk(); startParty(n); });
  }
  // 같이 토벌하는 친구의 체력: 몬스터가 친구를 노려 맞히면 줄고, 다 떨어지면 그 자리에 기절한다. 다가가서 깨우면 조금만 찬 채로 일어난다
  const ALLY_HP = 40, WAKE_HP = 12;
  const allyHp = {};
  const DOWN_SAY = { chiikawa: '히잉…', hachiware: '으앗… 미안…', usagi: '우라…', kurimanju: '하아…', rakko: '…큭.', momonga: '흥… 아파…' };
  const WAKE_SAY = { chiikawa: '…고마워… 다시 힘낼게…!', hachiware: '고마워! 다시 해 보자~', usagi: '우라!!', kurimanju: '하아~ 살았다~', rakko: '…빚졌군.', momonga: '흥, 안 고마워! …고마워.' };
  const HURT_SAY = { chiikawa: '히잉!', hachiware: '아얏!', usagi: '우랏!', kurimanju: '아이고~', rakko: '…큭', momonga: '아야!' };
  /** 몬스터가 노릴 수 있는 친구들(쓰러진 친구는 빼고). */
  const partyAllies = () => npcs.partyKinds().map((k) => npcs.byKind(k)).filter((n) => n && !n.down && !n.away).map((n) => ({ kind: n.kind, x: n.x, z: n.z }));
  /** 몬스터가 같이 토벌하는 친구를 맞혔다. */
  function onAllyHit(kind, hit, m) {
    if (kind.startsWith('mp:')) { hitGuest(kind.slice(3), hit, m); return; } // 같이 놀기: 놀러 온 친구가 맞았다
    const n = npcs.byKind(kind);
    if (!n || n.down || !n.party) return;
    allyHp[kind] = (allyHp[kind] ?? ALLY_HP) - hit.dmg;
    syncParty(); // 왼쪽 위 꼬리표의 체력 막대
    hud.floatText({ x: n.x, y: n.chibi.height + 0.3, z: n.z, text: `-${hit.dmg}`, kind: 'dmg' });
    sound.play('hurt');
    if (allyHp[kind] > 0) { if (Math.random() < 0.5) npcs.say(n, HURT_SAY[kind] || '아얏!'); npcs.emote(n, 'hurt', 0.35); return; }
    allyHp[kind] = 0;
    npcs.down(n, true);
    syncParty();
    npcs.say(n, DOWN_SAY[kind] || '으으…');
    setDoing(kind, 'moon', '기절해 있어요');
    hud.toast(`${josa(nameOf(kind), '이/가')} 쓰러졌어요!`, 2800, { icon: faceIcon(kind), chips: [{ text: '다가가서 깨우기' }] });
  }
  /** 쓰러진 친구를 깨운다: 그 자리에서 조금만 찬 체력으로 일어나 다시 같이 싸운다. */
  function wakeAlly(n) {
    if (!n || !n.down) return;
    npcs.down(n, false);
    allyHp[n.kind] = WAKE_HP;
    syncParty();
    npcs.say(n, WAKE_SAY[n.kind] || '고마워!');
    npcs.emote(n, joyAnim(n.kind), 1.2);
    setDoing(n.kind, 'sword', '나랑 같이 토벌');
    sound.play('heart');
    player.cheerTime = 0.8;
    hud.toast(`${josa(nameOf(n.kind), '을/를')} 깨웠어요!`, 2200, { icon: faceIcon(n.kind), chips: [{ text: `체력 ${WAKE_HP} / ${ALLY_HP}` }] });
  }
  /** 친구가 따라나선다: 내 둘레 8칸 안 몬스터를 친구 힘(power)만큼 친다. */
  function startParty(n) {
    const kind = n.kind, power = npcPower(state, kind);
    allyHp[kind] = ALLY_HP;
    npcs.party(kind, {
      range: 8, every: 1.05,
      find: () => monsters.nearest(player.position.x, player.position.z, 8, (m) => !m.exam && m.species !== 'dummy'),
      hit: (m) => {
        const before = m.hp, killed = monsters.npcHit(m, power, n.x, n.z, kind); // 맞은 몬스터는 이 친구에게 덤비기도 한다
        if (m.hp < before) hud.floatText({ x: m.x, y: m.mesh.height * 0.85, z: m.z, text: `-${power}`, kind: 'dmg' });
        return killed;
      },
      onKill: (m) => partyKill(n, m)
    });
    setDoing(kind, 'sword', '나랑 같이 토벌');
    syncParty();
    sound.play('job');
  }
  /** 같이 토벌하던 친구가 몬스터를 쓰러뜨렸다: 한마디 · 기운이 줄고, 그날 처음이면 친밀도도 오른다. 전리품 · 일감 · 점수는 내가 잡은 것처럼. */
  function partyKill(n, m) {
    const kind = n.kind, day = state.clock.day;
    tireNpc(kind, 6);
    npcs.say(n, lineOf(kind, 'partyCry'));
    const b = befriend(state, kind, 'hunt', day);
    if (b.gained > 0) {
      const F = FRIENDS[kind];
      commit(b.state, false);
      hud.hearts({ x: n.x, y: n.chibi.height + 0.5, z: n.z, gained: b.gained, up: b.up, hearts: b.hearts, name: F.name, tag: F.tag });
      if (b.gift) hud.banner('선물을 받았어요!', FURNITURE[b.gift].name, 3000, [{ icon: faceIcon(kind), text: F.name }]);
      happen({ type: 'partyHunt', who: kind, with: 'me' }); // 그날 처음 같이 잡았을 때만(하루 한 번 하트와 같이)
    }
    onKill(m);
  }
  /** 같이 토벌을 끝낸다(kinds 가 null 이면 모두). key 가 있으면 그 친구 말투로 인사한다. */
  function partyEnd(kinds, key) {
    if (!kinds) [...buddies].forEach((k) => endBuddy(k, null)); // 일상 부탁으로 같이 다니던 친구도
    const list = kinds || npcs.partyKinds();
    for (const kind of list) {
      const n = npcs.byKind(kind);
      if (!n || !n.party) continue;
      if (n.down) npcs.down(n, false); // 헤어질 때 쓰러져 있던 친구는 털고 일어난다
      delete allyHp[kind];
      npcs.party(kind, null);
      if (key) npcs.say(n, lineOf(kind, key));
      restHere(kind, 10 + Math.random() * 20);
    }
    if (list.length) syncParty();
  }
  /** 왼쪽 위 '같이 토벌' · '같이 다니는 중' 꼬리표(데려간 친구 얼굴). */
  const syncParty = () => {
    const party = npcs.partyKinds(), list = [...party, ...[...buddies].filter((k) => !party.includes(k))];
    hud.setParty(list.map((k) => {
      const f = { name: nameOf(k), svg: faceIcon(k) };
      if (!party.includes(k)) return f;
      const n = npcs.byKind(k);
      return { ...f, hp: allyHp[k] ?? ALLY_HP, max: ALLY_HP, down: !!(n && n.down) }; // 같이 토벌하는 친구는 체력 막대도
    }), party.length ? '같이 토벌' : '같이 다니는 중');
  };

  // ---------- 일상 부탁: 친구와 같이 다니며 라멘 먹기 · 풀 뽑기 · 열매 따기 · 산책 ----------
  /** 친구와 같이 해야 하는 단계인지(같이 하기 · 같이 가기). */
  const isBuddyStep = (st) => !!st && (st.type === 'together' || (st.type === 'visit' && st.with));
  const buddies = new Set(); // 일상 부탁으로 나를 따라다니는 친구들
  const buddyDone = []; // 같이 하기를 다 해서, 창이 닫히면 그 자리에서 끝낼 부탁
  const ACT_ANIM = { ramen: 'slurp', weed: 'pull', berry: 'pull' };
  // 같이 다닐 때 친구마다 하는 말: go 따라나설 때 · stop 헤어질 때 · 일마다 한마디
  const BUDDY_SAY = {
    chiikawa: { go: '…응! 같이 가…!', stop: '…응… 다음에 또 같이 하자…', ramen: '…후루룩…♪', weed: '…영차…!', berry: '…빨갛다…♪' },
    hachiware: { go: '좋아, 가자~!', stop: '그래! 다음에 또 같이 하자~', ramen: '후루룩~ 맛있다!', weed: '영차~ 하나 뽑았다!', berry: '반짝반짝 열매다~' },
    usagi: { go: '우라~!!', stop: '우라…', ramen: '후루룩!!', weed: '우라!', berry: '야하~!' },
    kurimanju: { go: '하아~ 그럼 가 볼까~', stop: '하아~ 다음에 또 하자~', ramen: '하아~ 국물 좋다~', weed: '하아~ 허리야…', berry: '안주로 딱이네~' },
    momonga: { go: '흥, 빨리 와!', stop: '흥! 다음엔 끝까지 같이 가.', ramen: '흥, 나쁘지 않네.', weed: '왜 내가 이걸… 흥!', berry: '이건 내 거!' },
    rakko: { go: '…가지.', stop: '…다음에 또.', ramen: '…훗.', weed: '…이것도 수련이다.', berry: '…달군.' }
  };
  // 같이 다니다 잘 시간이 다가올 때(한 시간 전) 하품하며 하는 말 · 잘 시간이 되어 헤어질 때 하던 일에 맞춘 인사({act} 그 일, {act은} 그 일 + 은/는)
  const BUDDY_YAWN = {
    chiikawa: '…하암… 졸려… 조금만 더…', hachiware: '하아암~ 슬슬 졸리다~ 조금만 더 하자!', usagi: '(크게 하품) …우라…',
    kurimanju: '하아~ 슬슬 졸리네~', momonga: '흥… 졸려. 빨리 끝내!', rakko: '…슬슬 잘 시간이군.'
  };
  const BUDDY_BED = {
    chiikawa: '…졸려… {act}… 내일 마저 하자… (꾸벅)', hachiware: '하아암~ 오늘은 여기까지! {act은} 내일 마저 하자~',
    usagi: '(꾸벅꾸벅…) 우라… (내일 하자는 듯 집 쪽을 가리킨다)', kurimanju: '하아~ 졸려서 안 되겠다. {act은} 내일 하자~',
    momonga: '졸려! {act은} 내일 해! 흥!', rakko: '…잘 시간이다. {act은} 내일 마저 하지.'
  };
  /** 잘 시간이 다 돼서 같이 가자고 하면. */
  const BUDDY_LATE = {
    chiikawa: '…오늘은… 졸려… 내일 같이 하자…!', hachiware: '오늘은 벌써 늦었어~ 내일 같이 하자!', usagi: '(하품하며 집 쪽을 가리킨다) 우라…',
    kurimanju: '하아~ 오늘은 늦었네. 내일 하자~', momonga: '지금 몇 시인 줄 알아? 내일 해! 흥!', rakko: '…오늘은 늦었다. 내일 하지.'
  };
  const buddyYawned = new Set(); // 이번에 같이 다니면서 졸리다고 이미 말한 친구
  /** 그 친구와 같이 하던 부탁의 일(라멘 먹기 · 풀 뽑기 · 열매 따기 · 산책)에 맞춘 잘 자 인사. */
  function buddyBedLine(kind) {
    const id = activeQuests(state).find((q) => { const st = stepOf(state, q); return isBuddyStep(st) && reportTo(q, st) === kind; });
    const st = id && stepOf(state, id), act = st ? (st.type === 'together' ? ACTS[st.act] : '산책') : '같이 하던 거';
    return (BUDDY_BED[kind] || '{act은} 내일 마저 하자~').replace('{act은}', josa(act, '은/는')).replace('{act}', act);
  }
  /** 나랑 같이 다니기 시작할 때 친구 기운을 이만큼까지는 채운다(부탁을 끝까지 함께하게). */
  const BUDDY_ENERGY = 70;
  /** 친구가 나를 따라나선다(하던 일정은 그만두고). */
  function startBuddy(n) {
    if (!n || n.away || buddies.has(n.kind)) return;
    buddies.add(n.kind);
    // 같이 하자고 했으니 기운을 낸다: 지친 채로 시작하면 곧 낮잠 자러 가 버려서 부탁을 끝낼 수 없었다
    const day = state.clock.day, e = villagerOf(state, n.kind, day).energy;
    if (e < BUDDY_ENERGY) state = villagerEnergy(state, n.kind, BUDDY_ENERGY - e, day);
    npcs.plan(n, []);
    npcs.setFollow(n.kind, true);
    setDoing(n.kind, 'heart', '나랑 같이 다니는 중');
    syncParty();
  }
  /** 같이 다니기를 그만둔다(say 가 있으면 한마디). */
  function endBuddy(kind, say = null) {
    if (!buddies.delete(kind)) return;
    buddyYawned.delete(kind);
    const n = npcs.byKind(kind);
    if (n) { npcs.setFollow(kind, false); if (say) npcs.say(n, say); restHere(kind, 10 + Math.random() * 20); }
    syncParty();
  }
  /** 그 친구가 내 옆(8칸 안)에 같이 있는지. */
  const buddyNear = (kind) => { const n = npcs.byKind(kind); return !!n && !n.away && (buddies.has(kind) || n.party) && Math.hypot(n.x - player.position.x, n.z - player.position.z) < 8; };
  /**
   * 내가 일상 일(라멘 먹기 · 풀 뽑기 · 열매 따기)을 했다: 옆에서 같이 다니던 친구와 같이 한 것으로 세고, 친구도 같이 한다(몸짓 · 한마디).
   * 같이 하기를 다 했으면 창이 닫힌 뒤 그 자리에서 부탁을 끝낸다.
   */
  function didAct(act) {
    const near = [...new Set([...buddies, ...npcs.partyKinds()])].filter(buddyNear);
    commit(logAct(state, act, near), false);
    for (const kind of near) {
      const n = npcs.byKind(kind);
      npcs.emote(n, ACT_ANIM[act] || 'clap', act === 'ramen' ? 3.2 : 1.2);
      if (BUDDY_SAY[kind] && BUDDY_SAY[kind][act] && Math.random() < 0.6) npcs.say(n, BUDDY_SAY[kind][act]);
      const id = activeQuests(state).find((q) => { const st = stepOf(state, q); return st && st.type === 'together' && st.act === act && reportTo(q, st) === kind; });
      if (id && stepReady(state, id) && !buddyDone.includes(id)) buddyDone.push(id);
    }
  }
  /** 같이 하기를 다 했다: 따라다니기를 끝내고 그 친구가 고맙다고 말하며 부탁 끝(보상). */
  function finishBuddy(id) {
    const st = stepOf(state, id), kind = reportTo(id, st), n = npcs.byKind(kind);
    if (!n || n.away) return;
    endBuddy(kind);
    beginTalk(n);
    finishQuestStep(id, n, st.say);
  }

  /** 친구가 라멘 로우에서 라멘을 사 먹는다(지갑에서 나간다). */
  function npcEat(n) {
    const r = village.spots.ramen;
    setDoing(n.kind, 'bowl', '라멘 먹기');
    npcs.plan(n, [...ramenSeatSteps(n), { do: 'call', ramen: true, fn: () => staffSay('ramen', 'welcome', 7, r) }, { do: 'act', anim: 'slurp', face: { x: r.x, z: r.z - 1.5 }, time: 4, say: lineOf(n.kind, 'eat'), ramen: true }, {
      do: 'call', ramen: true,
      fn: () => {
        commit(villagerEnergy(villagerSpend(state, n.kind, MEAL_PRICE, state.clock.day), n.kind, MEAL_ENERGY, state.clock.day), false); // 라멘을 먹으면 기운이 찬다
        happen({ type: 'meal', who: n.kind });
        restHere(n.kind, 8 + Math.random() * 10);
      }
    }]);
  }

  // ---------- 친구들의 가방(core/pantry.js): 꺼내 먹기 · 나눠 주기 · 팔기 · 답례 ----------
  const SNACK_SAY = { chiikawa: '…냠…♪', hachiware: '냠냠~ 맛있다!', usagi: '우라~!', kurimanju: '하아~ 맛있네', rakko: '…훗. 맛있군.', momonga: '흥, 맛있네!' };
  const SHARE_SAY = {
    chiikawa: '…{w}… 이거 좋아하지…? 줄게…!', hachiware: '{w}! 이거 좋아하지? 너 줄게~', usagi: '(가방에서 불쑥 꺼내 내민다) 우라!',
    kurimanju: '하아~ 이거 {w} 좋아하잖아. 가져가', rakko: '…{w}, 이거 받아라.', momonga: '흥! 나 이거 필요 없어. {w} 가져!'
  };
  const THANKS_SAY = {
    chiikawa: '…이거… 받은 건데… 너한테 주고 싶어…!', hachiware: '이거 받았는데~ 너 주고 싶어서 아껴 뒀어!', usagi: '(가방을 뒤적뒤적… 불쑥 내민다) 야하!',
    kurimanju: '하아~ 이거 너 줄게. 늘 고마우니까', rakko: '…답례다. 받아라.', momonga: '흥! 남아서 주는 거야! 고마워서 그런 거 아니야!'
  };
  /** 가방의 먹을 것을 꺼내 먹는다: 그 자리에서 냠냠, 기운이 찬다(마을 소식에도 남는다). */
  function npcSnack(n, id) {
    const info = itemInfo(id);
    setDoing(n.kind, 'bowl', `${info.name} 먹기`);
    npcs.plan(n, [{ do: 'act', anim: 'nibble', time: 3.2, say: `${SNACK_SAY[n.kind] || '냠냠'} (${josa(info.name, '을/를')} 꺼내 먹는다)` }, {
      do: 'call', fn: () => {
        const t = takeFromPantry(state, n.kind, id, 1);
        if (t.taken) { commit(villagerEnergy(t.state, n.kind, info.eat, state.clock.day), false); happen({ type: 'snack', who: n.kind, item: info.name }); }
        restHere(n.kind, 6 + Math.random() * 8);
      }
    }]);
  }
  /** 수다 끝에: 내가 좋아하지 않는데 상대가 좋아하는 물건이 가방에 있으면 나눠 준다. → 나눠 줬는지 */
  function shareAfterChat(from, to) {
    const id = shareOf(state, from.kind, to.kind);
    if (!id || Math.random() > 0.8) return false;
    commit(addToPantry(takeFromPantry(state, from.kind, id, 1).state, to.kind, id, 1).state, false);
    npcs.say(from, (SHARE_SAY[from.kind] || '이거 줄게!').replace('{w}', nameOf(to.kind)));
    setTimeout(() => { if (!state) return; npcs.say(to, giftLine(to.kind, 'love')); npcs.emote(to, joyAnim(to.kind), 1.6); }, 1500);
    happen({ type: 'share', who: from.kind, with: to.kind, item: itemInfo(id).name });
    return true;
  }
  /** 노동 접수에 온 김에 가방의 전리품 · 풀(좋아하지 않는 것)을 팔아 지갑에 보탠다. */
  function npcSellBag(n) {
    const r = sellPantry(state, n.kind);
    if (!r.earned) return;
    commit(payVillager(r.state, n.kind, r.earned, state.clock.day), false);
    setTimeout(() => { if (state) npcs.say(n, lineOf(n.kind, 'bagSell', { pay: `+${won(r.earned)}` })); }, 2600); // 친구마다 말투대로(core/npclines.js)
  }

  // ---------- 똑똑한 친구들: 마음(욕구) · 하는 일 · 오늘 기억과 소문 · 친구끼리 수다 · 공연 · 먼저 다가오기 ----------
  // 친구마다 { fun 심심함, social 외로움, doing 지금 하는 일 { icon, text }, mem 기억한 일(어제 · 오늘), told 나에게 한 이야기, greetAt }
  const minds = {};
  const mindOf = (kind) => minds[kind] || (minds[kind] = { ...freshMind(), doing: null, mem: [], told: new Set(), greetAt: -999 });
  const villageNews = []; // 마을 소식 [{ text, kinds, day, hour }]
  let show = null; // 하치와레 공연 { by, x, z, until, audience: Set, meT: 내가 들은 시간 }
  let lastGreetAt = -999; // 마지막으로 누가 나에게 다가온 때(한꺼번에 몰려오지 않게)
  const myName = () => (state && state.profile.name) || '나';
  const isVillager = (k) => !!VILLAGERS[k];
  const withName = (k, pair = '이랑/랑') => josa(nameOf(k), pair);
  /** 지금 하는 일(머리 위 아이콘 · 친구 앱). icon 이 없으면 아이콘 없이 글만. */
  function setDoing(kind, icon, text) { if (isVillager(kind) || STAFF.includes(kind)) mindOf(kind).doing = text ? { icon, text } : null; }
  /** 잠깐 그 자리에서 쉰다(몸짓 · 혼잣말은 친구 쪽에서). */
  function restHere(kind, sec) { restUntil[kind] = lifeClock + sec; setDoing(kind, null, STAFF.includes(kind) ? '가게 지키는 중' : '쉬는 중'); }
  /** 그 친구가 이 일을 기억한다(어제 · 오늘 것만 12개까지). */
  function remember(kind, e) {
    if (!isVillager(kind) || !state) return;
    const m = mindOf(kind), today = state.clock.day;
    if (!m.mem.includes(e)) m.mem = [...m.mem.filter((x) => x.day >= today - 1), e].slice(-12);
  }
  /** 일이 일어났다: 함께한 친구들이 기억하고, 소식거리면 마을 소식에 남는다. 내 큰일(who 'me')은 온 마을에 퍼진다. */
  function happen(ev) {
    if (!state) return null;
    const e = { day: state.clock.day, hour: hourOf(state.clock), ...ev };
    (e.who === 'me' ? Object.keys(VILLAGERS) : [e.who, e.with]).forEach((k) => remember(k, e));
    const nl = newsLine(e, myName());
    if (nl) { villageNews.push({ ...nl, day: e.day, hour: e.hour }); if (villageNews.length > 40) villageNews.shift(); }
    return e;
  }
  /** 그 친구가 이야기할 거리(어제 · 오늘, 수다 자체는 빼고). */
  const newsOf = (kind) => mindOf(kind).mem.filter((e) => e.type !== 'chat' && e.day >= state.clock.day - 1);
  /** 나에게 아직 안 한 이야기 한 줄: 최근 것부터(내 큰일이면 칭찬). → { line, ev } | null */
  function untold(kind) {
    const m = mindOf(kind);
    for (const e of newsOf(kind).filter((x) => !m.told.has(x)).reverse()) {
      const line = e.who === 'me' ? praiseLine(kind, e, myName()) : storyLine(kind, e, myName());
      if (line) return { line, ev: e };
    }
    return null;
  }
  /** 지금 불러도 되는 한가한 친구: 깨어 있고, 일정 · 대화 · 놀이 · 같이 토벌 중이 아니고, 지치지 않았다. */
  function isFree(n) {
    if (!n || !isVillager(n.kind) || n.away || n.party || npcs.busy(n) || n === talking || (tag && tag.n === n) || (theft && theft.n === n)) return false;
    if (n.kind === 'kurimanju' && isPubHour(hourOf(state.clock))) return false;
    if (n.kind === 'hachiware' && tutorialActive(state.tutorial)) return false;
    return villagerOf(state, n.kind, state.clock.day).energy >= TIRED;
  }
  const otherVillagers = (kind) => Object.keys(VILLAGERS).filter((k) => k !== kind).map((k) => npcs.byKind(k)).filter(Boolean);

  /** 두뇌가 다음 할 일을 고르고 그 일을 시킨다. */
  function lifeDecide(n, kind, day, hour) {
    const v = villagerOf(state, kind, day), spec = VILLAGERS[kind], m = mindOf(kind), H = HUNTER_PROFILES[kind];
    const left = boardOf(state, day).left, roomForJob = v.jobs < MAX_JOBS_PER_DAY;
    const jobs = roomForJob ? spec.jobs.filter((id) => left[id] > 0 && canDoJob(state, kind, id)) : []; // 낚시 일감은 낚싯대를 산 뒤에만
    const hunts = H && roomForJob && licensed(state, kind) ? Object.keys(JOB_TYPES).filter((id) => JOB_TYPES[id].hunt && !JOB_TYPES[id].kind.startsWith('moth') && left[id] > 0) : [];
    const p = player.position, canMeet = mode === 'play' && !funBusy() && !panels.isOpen() && !guide.open && !sleeping && !fainting;
    // 목표 값이 다 모였으면 가게가 열린 동안 먼저 사러 간다(core/goals.js)
    if (hour >= 8 && hour < 20 && !tutorialActive(state.tutorial) && canBuy(state, kind, day)) { npcShop(n); return 'shop'; }
    // 술 자격이 목표고 응시료가 모였으면 검정소가 여는 동안 시험을 보러 간다(하루 한 번)
    if (hour >= 8 && hour < 17 && !tutorialActive(state.tutorial) && canTryLiquor(state, kind, day)) { npcLiquorExam(n); return 'exam'; }
    // 배가 고프면 가방(선물 · 나눠 받은 것)의 먹을 것을 꺼내 먹는다(라멘값을 아낀다)
    const snack = v.energy < SNACK_ENERGY && hour >= 7 && hour < 21 ? snackOf(state, kind) : null;
    if (snack && (v.energy < TIRED || Math.random() < 0.75)) { npcSnack(n, snack); return 'snack'; } // 지쳤으면 낮잠보다 간식 먼저
    // 싫은 선물을 받아 둔 착한 친구: 내가 멀리 있을 때 몰래 버리러 간다
    const hated = hatedOf(state, kind);
    if (hated && unseen(n) && Math.random() < 0.5) { npcTossSecret(n, hated); return 'toss'; }
    const goal = goalOf(state, kind);
    const ctx = {
      kind, hour, energy: v.energy, money: v.money, fun: m.fun, social: m.social, diligence: spec.diligence, appetite: spec.eat,
      jobs: jobs.length > 0, guiding: tutorialActive(state.tutorial), goal: goal && { kind: goal.kind, cost: goal.cost },
      hunter: H && hour >= 7 && hour < 17 ? { exam: canTryExam(state, kind, day) && v.money >= LICENSES.hunter.fee, hunt: hunts.length > 0, want: H.want } : null,
      friends: otherVillagers(kind).filter(isFree).map((f) => ({ kind: f.kind, dist: Math.hypot(f.x - n.x, f.z - n.z) })),
      show: show && lifeClock < show.until ? { by: show.by, dist: Math.hypot(show.x - n.x, show.z - n.z) } : null,
      player: canMeet ? { dist: Math.hypot(p.x - n.x, p.z - n.z), hearts: hearts(friendOf(state, kind)), ready: lifeClock - m.greetAt > 150 && lifeClock - lastGreetAt > 40 } : null
    };
    const c = chooseActivity(ctx), mate = c.with ? npcs.byKind(c.with) : null;
    minds[kind] = satisfy(m, c.act);
    switch (c.act) {
      case 'sleep': case 'nap': npcGoHome(n, c.act); break;
      case 'eat': npcEat(n); break;
      // 같이 라멘: 불린 친구도 사 먹을 만할 때만(배부르거나 목표 값을 모으는 중이면 혼자 먹으러 간다 — 화면 밖 하루와 같은 기준)
      case 'mealWith': if (isFree(mate) && mateEats(state, mate.kind, state.clock.day)) npcMealWith(n, mate); else npcEat(n); break;
      case 'work': npcWork(n, jobs[Math.floor(Math.random() * jobs.length)]); break;
      case 'hunt': npcHunt(n, hunts[Math.floor(Math.random() * hunts.length)]); break;
      case 'exam': npcExam(n); break;
      case 'hobby': npcHobby(n, hour); break;
      case 'chat': if (isFree(mate)) npcChat(n, mate); else npcStroll(n); break;
      case 'watch': npcWatch(n); break;
      case 'greet': npcGreet(n); break;
      case 'stroll': npcStroll(n); break;
      default: restHere(kind, 8 + Math.random() * 14);
    }
    return c.act;
  }

  /** 기쁠 때 몸짓: 친구마다 성격대로 여러 가지 중 하나(늘 두 팔 들고 방방만 하지 않게). 갑옷 씨들 · 시사 · 카니는 STAFF_JOY. */
  const JOY = { chiikawa: ['cheer', 'hop', 'shy', 'clap'], hachiware: ['wave', 'clap', 'sway', 'cheer'], usagi: ['hop', 'spin', 'cheer'], kurimanju: ['clap', 'sway', 'wave'], rakko: ['think', 'clap', 'wave'], momonga: ['pose', 'spin', 'hop'] };
  const STAFF_JOY = ['clap', 'wave', 'cheer'];
  const joyAnim = (kind) => pickLine(JOY[kind] || STAFF_JOY);
  /**
   * 모은 돈으로 목표를 이루러 간다(core/goals.js 의 goalPlace: 무기 · 카메라 · 낚싯대는 도구점, 가구 · 벽지는 가구점, 포셰트는 포셰트 가게,
   * 집 넓히기는 부동산, 마을 가꾸기는 모금함). 그 앞에서 기뻐하고 이루면 마을 소식에 남는다.
   */
  const BUY_SAY = { chiikawa: '…드디어…! 이거 주세요…!', hachiware: '드디어 산다~! 이거 주세요!', usagi: '야하! 야하!', kurimanju: '하아~ 이걸로 할게', rakko: '…이것으로 하지' };
  const HOME_SAY = { chiikawa: '…집을… 넓히고 싶어요…!', hachiware: '집을 넓히고 싶어요~!', usagi: '(팔을 활짝 벌린다) 우라!', kurimanju: '하아~ 집 좀 넓혀 볼까', rakko: '…집을 넓히겠다' };
  const DONATE_SAY = { chiikawa: '…마을이 예뻐지면 좋겠어…', hachiware: '마을 가꾸기에 보태야지~!', usagi: '(동전을 넣는다) 야하!', kurimanju: '하아~ 조금 보태 볼까', rakko: '…마을을 위해서다' };
  const PLACE_NAME = { tools: '도구점', furniture: '가구점', pochette: '포셰트 가게', realty: '부동산', donation: '마을 가꾸기 모금함' };
  function npcShop(n) {
    const g = goalOf(state, n.kind), place = goalPlace(g), door = place && village.spots[place];
    if (!door || !PLACE_NAME[place]) { restHere(n.kind, 5); return; }
    setDoing(n.kind, 'star', `${PLACE_NAME[place]}에 가는 중`); // 무엇을 사는지는 이야기로 알게 된다
    const say = (g.kind === 'home' ? HOME_SAY : g.kind === 'donate' ? DONATE_SAY : BUY_SAY)[n.kind] || '이거 주세요!';
    npcs.plan(n, [{ do: 'walk', x: door.x, z: door.z, near: 0.7 }, { do: 'act', anim: joyAnim(n.kind), time: 1.6, say }, {
      do: 'call',
      fn: () => {
        const r = buyGoal(state, n.kind, state.clock.day); // 오는 사이 돈을 써 버렸거나 그 시설이 다 모였으면 못 이룬다
        if (r.ok) {
          commit(r.state, false);
          happen({ type: goalNews(r.goal), who: n.kind, item: r.goal.label, cost: r.goal.cost });
          if (r.goal.kind === 'donate') {
            panels.refresh('works');
            // 친구가 보태서 다 모였으면 내가 낸 것처럼 알린다(다음 날 아침에 생긴다)
            if (r.full) hud.toast(`${josa(nameOf(n.kind), '이/가')} 보태서 ${josa(r.goal.label, '이/가')} 다 모였어요! 내일 아침에 생겨요`, 3600, { icon: faceIcon(n.kind) });
          }
        }
        restHere(n.kind, 10 + Math.random() * 12);
      }
    }]);
  }

  /** 두 친구가 만날 자리: 가운데(또는 at)에서 왼쪽 · 오른쪽으로 서서 마주 본다(카메라에서 둘 다 보이게). */
  function meetSpots(a, b, at) {
    const c0 = at || { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, c = village.nearestFree(c0.x, c0.z, 0.7), dx = b.x >= a.x ? 1 : -1;
    return { pa: village.nearestFree(c.x - dx * 0.62, c.z, 0.4), pb: village.nearestFree(c.x + dx * 0.62, c.z, 0.4) };
  }
  /** 대화 일정: 자리로 가서 → 둘 다 모이면 → 대본대로 번갈아 말한다(듣는 쪽은 바라보며). */
  function talkSteps(n, spot, face, lines, group, anim, listen) {
    const steps = [{ do: 'walk', x: spot.x, z: spot.z, near: 0.6 }, { do: 'sync', group, face }];
    for (const [who, text] of lines) {
      const t = npcs.lineTime(text) + 0.25;
      steps.push(who === n.kind ? { do: 'act', anim, face, time: t, say: text, quick: true } : { do: 'act', anim: listen, face, time: t, quick: true });
    }
    return steps;
  }
  /** 두 친구를 한자리에 모아 같이 하게 한다(수다 · 수련 · 축하 · 위로). done() 은 다 끝나면 한 번. */
  function together(a, b, lines, { at = null, anim = 'talk', listen = 'idle', icon = 'dots', text, done = null } = {}) {
    const { pa, pb } = meetSpots(a, b, at), group = { need: 2, here: new Set() };
    let finished = false;
    const end = (n) => {
      restHere(n.kind, 8 + Math.random() * 12);
      if (!finished && !group.cancel) { finished = true; if (done) done(); }
    };
    setDoing(a.kind, icon, text(b.kind));
    setDoing(b.kind, icon, text(a.kind));
    npcs.plan(a, [...talkSteps(a, pa, pb, lines, group, anim, listen), { do: 'call', fn: () => end(a) }]);
    npcs.plan(b, [...talkSteps(b, pb, pa, lines, group, anim, listen), { do: 'call', fn: () => end(b) }]);
  }
  /** 수다: 짝마다 다른 이야기, 오늘 있었던 일이나 소문을 전하기도 한다(들은 친구도 기억한다). */
  function npcChat(a, b) {
    const conv = conversation(a.kind, b.kind, newsOf(a.kind), myName());
    together(a, b, conv.lines, {
      icon: 'dots', text: (o) => `${withName(o)} 수다`,
      done: () => {
        happen({ type: 'chat', who: a.kind, with: b.kind });
        if (conv.told) remember(b.kind, conv.told);
        minds[b.kind] = satisfy(mindOf(b.kind), 'chat');
        if (!shareAfterChat(a, b)) shareAfterChat(b, a); // 가방에 상대가 좋아하는 게 있으면 나눠 준다
      }
    });
  }
  /** 같이 라멘: 데리러 가서 말을 걸고, 라멘 가게 앞에 나란히 앉아 먹고, 먹으면서 수다. */
  function npcMealWith(a, b) {
    const r = village.spots.ramen, face = { x: r.x, z: r.z - 1.5 }, group = { need: 2, here: new Set() };
    const conv = conversation(a.kind, b.kind, newsOf(a.kind), myName());
    let finished = false;
    const end = (n) => {
      const day = state.clock.day, price = Math.min(MEAL_PRICE, villagerOf(state, n.kind, day).money);
      commit(villagerEnergy(villagerSpend(state, n.kind, price, day), n.kind, MEAL_ENERGY, day), false);
      restHere(n.kind, 10 + Math.random() * 15);
      if (!finished && !group.cancel) {
        finished = true;
        happen({ type: 'meal', who: a.kind, with: b.kind });
        if (conv.told) remember(b.kind, conv.told);
        minds[b.kind] = satisfy(mindOf(b.kind), 'mealWith');
      }
    };
    const steps = (n) => {
      const s = [];
      if (n === a) s.push({ do: 'walk', x: b.x + (a.x > b.x ? 1 : -1), z: b.z, near: 1.4 }, { do: 'act', anim: 'talk', face: { x: b.x, z: b.z }, time: 2.6, say: fillLine(MEAL_INVITE[a.kind] || '{w} 라멘 먹자', { w: nameOf(b.kind) }), quick: true });
      else s.push({ do: 'sync', group: invite, face: { x: a.x, z: a.z }, max: 30 }, { do: 'act', anim: joyAnim(n.kind), time: 1.4, say: pickLine(SMALLTALK.reply[n.kind] || ['응!']), quick: true });
      if (n === a) s.push({ do: 'sync', group: invite, max: 30 });
      s.push(...ramenSeatSteps(n, () => { group.cancel = true; }), { do: 'sync', group, face, max: RAMEN_WAIT + 15, ramen: true }); // 짝이 줄 서 있으면 앉아서 기다려 준다
      if (n === a) s.push({ do: 'call', ramen: true, fn: () => staffSay('ramen', 'welcome', 7, r) });
      s.push({ do: 'act', anim: 'slurp', face, time: 4.5, say: lineOf(n.kind, 'eat'), quick: true, ramen: true });
      for (const [who, text] of conv.lines) {
        const t = npcs.lineTime(text) + 0.25;
        s.push(who === n.kind ? { do: 'act', anim: 'talk', face, time: t, say: text, quick: true, ramen: true } : { do: 'act', anim: 'slurp', face, time: t, quick: true, ramen: true });
      }
      s.push({ do: 'call', ramen: true, fn: () => end(n) });
      return s;
    };
    const invite = { need: 2, here: new Set() };
    setDoing(a.kind, 'bowl', `${withName(b.kind)} 라멘`);
    setDoing(b.kind, 'bowl', `${withName(a.kind)} 라멘`);
    npcs.plan(a, steps(a));
    npcs.plan(b, steps(b));
  }
  /** 취미: 친구마다 다른 곳에서 다른 것(치이카와 연못 · 공부 · 별, 하치와레 공연, 우사기 뛰어다니기, 쿠리만쥬 안주, 랏코 수련, 모몽가 귀여운 척). */
  // ---------- 친구들의 낚시(게임 오리지널): 도구점에서 낚싯대를 산 친구(core/goals.js hasRod)는 쉬는 틈에 낚시하고 낚시 일감도 받는다 ----------
  /** 친구가 낚시할 물가 자리 { x, z, face(물 쪽), water }: 연못(마을 안 동서쪽 가) · 시냇물(남쪽 문 밖 북쪽 둑) · 바다(남쪽 바닷가, 선착장 서쪽). 못 찾으면 null. */
  function npcFishSpot(water) {
    for (let k = 0; k < 10; k++) {
      let x, z, fx, fz;
      if (water === 'river') { x = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 16); z = riverZ(x) - RIVER.half - 0.8; fx = x; fz = riverZ(x); }
      else if (water === 'sea') { x = -18 + Math.random() * 22; z = SOUTH_SHORE - 0.8; fx = x; fz = SOUTH_SHORE + 4; }
      else { const a = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 1.1); x = POND.x + Math.sin(a) * (POND.r + 0.85); z = POND.z + Math.cos(a) * (POND.r + 0.85) * 0.85; fx = POND.x; fz = POND.z; }
      const p = village.nearestFree(x, z, 0.4), d = Math.hypot(fx - p.x, fz - p.z) || 1;
      if (Math.hypot(p.x - x, p.z - z) < 0.9 && waterAt(p.x + ((fx - p.x) / d) * 1.6, p.z + ((fz - p.z) / d) * 1.6) === water) return { x: p.x, z: p.z, face: { x: fx, z: fz }, water };
    }
    return null;
  }
  /**
   * 친구가 한 마리 낚는다: 가까우면 머리 위에 물고기 이름 · 그림, 가끔 한마디. want: 그 물고기(일감), 아니면 그 물 · 시각에 사는 것 중에서.
   * keep 이면 친구 가방에 넣는다(가득 차면 놓아준다 — 좋아하지 않는 물고기는 일하고 돌아와 판다). → 낚은 id
   */
  function npcLandFish(n, water, keep, want = null) {
    const id = want || pickFish(water, hourOf(state.clock)), F = FISH[id], p = player.position;
    if (Math.hypot(n.x - p.x, n.z - p.z) < 26) hud.floatText({ x: n.x, y: n.chibi.height + 0.55, z: n.z, text: F.name, kind: 'mini', icon: itemSvg(id) });
    if (Math.random() < 0.5) npcs.say(n, F.junk ? '…깡통이다' : lineOf(n.kind, 'fish'));
    if (keep && !F.junk) commit(addToPantry(state, n.kind, id, 1).state, false);
    tireNpc(n.kind, 4);
    return id;
  }
  /** 친구 낚시 솜씨: 한 번 던져 놓칠 확률(해달 랏코는 잘 낚는다). */
  const FISH_MISS = { rakko: 0.18, hachiware: 0.32, kurimanju: 0.28 };
  const fishMiss = (kind) => FISH_MISS[kind] ?? 0.3;
  /** 친구가 놓쳤다: 가까우면 머리 위에 '놓쳤다…'(내 낚시처럼), 가끔 한마디. */
  function npcMissFish(n) {
    const p = player.position;
    if (Math.hypot(n.x - p.x, n.z - p.z) < 26) hud.floatText({ x: n.x, y: n.chibi.height + 0.55, z: n.z, text: pickLine(['놓쳤다…', '도망갔다…', '줄이 끊어졌다…']), kind: 'snap' });
    if (Math.random() < 0.45) npcs.say(n, lineOf(n.kind, 'fishMiss'));
    tireNpc(n.kind, 2);
  }
  /** 쉬는 틈 낚시: 연못이나 시냇물에 가서 두세 번 던진다(놓치기도 한다). 낚은 물고기는 친구 가방에. */
  function npcFishHobby(n) {
    const spot = npcFishSpot(Math.random() < 0.6 ? 'pond' : 'river') || npcFishSpot('pond');
    if (!spot) { npcStroll(n); return; }
    setDoing(n.kind, 'fish', '낚시하는 중');
    const steps = [{ do: 'walk', x: spot.x, z: spot.z, near: 0.4 }];
    // 두세 번 던진다: 몸짓 하나로 쭉 낚시만(던질 때마다 끊으면 그 사이에 옆에 선 나를 쳐다봤다), 던질 때마다 낚음 · 놓침(beats)
    const casts = 2 + Math.floor(Math.random() * 2), beats = [];
    let at = 0;
    for (let i = 0; i < casts; i++) { at += 5 + Math.random() * 4; beats.push({ at, fn: () => (Math.random() < fishMiss(n.kind) ? npcMissFish(n) : npcLandFish(n, spot.water, true)) }); }
    steps.push({ do: 'act', anim: 'fish', face: spot.face, time: at + 0.4, beats, quick: true });
    steps.push({ do: 'call', fn: () => restHere(n.kind, 6 + Math.random() * 10) });
    npcs.plan(n, steps);
  }
  function npcHobby(n, hour) {
    const kind = n.kind;
    if (hasRod(state, kind) && hour >= 6 && hour < 19 && Math.random() < 0.4) { npcFishHobby(n); return; } // 낚싯대를 샀으면 가끔 낚시하러
    let hobby = (PERSONA[kind] || {}).hobby || 'stroll';
    if (kind === 'chiikawa') hobby = hour >= 18 ? 'stars' : Math.random() < 0.55 ? 'pond' : 'study';
    if (hobby === 'sing') return npcShow(n);
    if (hobby === 'dojo') {
      const u = npcs.byKind('usagi');
      if (isFree(u) && Math.random() < 0.45 && Math.hypot(u.x - n.x, u.z - n.z) < 32) return npcTrain(n, u);
    }
    const H = HOBBY[hobby];
    if (!H) return npcStroll(n);
    const at = hobbySpot(n, hobby), steps = [{ do: 'walk', x: at.x, z: at.z, near: 0.5, run: hobby === 'zoom' }];
    setDoing(kind, H.icon, H.doing);
    if (hobby === 'zoom') {
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 5, p = village.nearestFree(at.x + Math.sin(a) * r, at.z + Math.cos(a) * r, 0.5);
        if (Math.hypot(p.x, p.z) > VILLAGE_R - 3) continue;
        steps.push({ do: 'walk', x: p.x, z: p.z, near: 0.7, run: true }, { do: 'act', anim: joyAnim(n.kind), time: 0.9, say: Math.random() < 0.6 ? pickLine(H.lines) : undefined, quick: true });
      }
    } else {
      // 취미마다 몸짓: 연못가에선 앉아서 두리번, 별 구경은 하늘 보기, 모몽가 귀여운 척은 여러 포즈
      const ANIMS = { pond: ['sit', 'look', 'sit'], study: ['read', 'think', 'read'], stars: ['gaze', 'gaze', 'sit'], snack: ['drink', 'sway', 'drink'], dojo: ['train', 'stretch', 'train'], showoff: ['pose', 'spin', 'dance'] }[hobby] || ['idle', 'look', 'idle'];
      for (let i = 0; i < 3; i++) steps.push({ do: 'act', anim: ANIMS[i], face: at.face, time: 3.4 + Math.random() * 1.6, say: Math.random() < 0.7 ? pickLine(H.lines) : undefined, quick: true });
      if (hobby === 'pond' || hobby === 'stars') steps.push({ do: 'act', anim: joyAnim(n.kind), face: at.face, time: 1.2, say: pickLine(H.lines), quick: true });
    }
    steps.push({ do: 'call', fn: () => restHere(kind, 6 + Math.random() * 10) });
    npcs.plan(n, steps);
  }
  /** 취미 하는 자리와 바라볼 곳. */
  function hobbySpot(n, hobby) {
    const pl = village.spots.plaza, around = (c, r) => { const a = Math.random() * Math.PI * 2; return village.nearestFree(c.x + Math.sin(a) * r, c.z + Math.cos(a) * r, 0.5); };
    if (hobby === 'pond') {
      const a = (Math.random() - 0.5) * 1.8, p = village.nearestFree(POND.x + Math.sin(a) * (POND.r + 0.9), POND.z - Math.cos(a) * (POND.r + 0.9), 0.4);
      return { ...p, face: { x: POND.x, z: POND.z } };
    }
    if (hobby === 'study' || hobby === 'snack') {
      const d = homeDoor(n.kind) || pl, p = village.nearestFree(d.x + 1.0, d.z + 0.8, 0.45);
      return { ...p, face: { x: p.x, z: p.z + 4 } };
    }
    if (hobby === 'dojo') { const d = village.spots.dojo, p = village.nearestFree(d.x + (Math.random() - 0.5) * 2.4, d.z + 0.6 + Math.random(), 0.45); return { ...p, face: { x: p.x, z: p.z - 3 } }; }
    if (hobby === 'zoom') return { x: n.x, z: n.z, face: null };
    const p = around(pl, 1.5 + Math.random() * 2.5);
    return { ...p, face: { x: p.x, z: p.z + 4 } };
  }
  /** 하치와레 광장 공연: 노래하는 동안 심심한 친구들이 모여 구경하고, 끝나면 관객에게 인사(나도 들었으면 하트). */
  function npcShow(n) {
    if (show) return npcStroll(n);
    const pl = village.spots.plaza, st = village.nearestFree(pl.x, pl.z - 0.6, 0.6), face = { x: st.x, z: st.z + 5 };
    const lyrics = [...HOBBY.sing.lines].sort(() => Math.random() - 0.5);
    setDoing(n.kind, 'note', '광장 노래 공연');
    const steps = [{ do: 'walk', x: st.x, z: st.z, near: 0.4 }, {
      do: 'call', fn: () => {
        show = { by: n.kind, x: st.x, z: st.z, until: lifeClock + 42, audience: new Set(), meT: 0 };
        npcs.say(n, SHOW.start);
        for (const k of Object.keys(VILLAGERS)) if (k !== n.kind) restUntil[k] = Math.min(restUntil[k], lifeClock + Math.random() * 4); // 둘레 친구들이 곧 알아챈다
        if (mode === 'play' && Math.hypot(player.position.x - st.x, player.position.z - st.z) < 24) hud.toast('광장 공연 시작!', 2400, { icon: faceIcon(n.kind) });
        shareNews('광장 공연 시작!', n.kind); // 놀러 온 친구도 보러 오게
      }
    }, { do: 'act', anim: 'talk', face, time: 2.4, quick: true }];
    for (let i = 0; i < 9; i++) steps.push({ do: 'act', anim: 'dance', face, time: 4.5, say: lyrics[i % lyrics.length], quick: true });
    steps.push({ do: 'call', fn: () => endShow(n) });
    npcs.plan(n, steps);
  }
  function endShow(n) {
    const s = show;
    show = null;
    if (!s) return;
    const me = s.meT >= 10;
    happen({ type: 'sing', who: n.kind, n: s.audience.size + (me ? 1 : 0) });
    npcs.say(n, SHOW.thanks);
    const steps = [{ do: 'act', anim: 'wave', time: 2.4, quick: true }]; // 공연 끝: 관객에게 손 흔들기
    if (me) steps.push({ do: 'call', fn: () => {
      npcs.say(n, fillLine(SHOW.thanksMe, { me: myName() }));
      const r = befriend(state, n.kind, 'watch', state.clock.day);
      if (r.gained > 0) { commit(r.state); hud.hearts({ x: n.x, y: n.chibi.height + 0.5, z: n.z, gained: r.gained, up: r.up, hearts: r.hearts, name: FRIENDS[n.kind].name, tag: FRIENDS[n.kind].tag }); sound.play(r.up ? 'heartUp' : 'heart'); }
    } }, { do: 'act', anim: 'talk', time: 2.6, quick: true });
    steps.push({ do: 'call', fn: () => restHere(n.kind, 15 + Math.random() * 15) });
    npcs.plan(n, steps);
  }
  /** 공연 구경: 하치와레 옆 앞쪽에 서서 바라보다가 가끔 환호. */
  function npcWatch(n) {
    const s = show;
    if (!s) { restHere(n.kind, 4); return; }
    const around = [-1.2, 1.2, -0.75, 0.75, -1.65, 1.65].map((a) => ({ x: s.x + Math.sin(a) * 2.4, z: s.z + Math.cos(a) * 2.4 }));
    const face = { x: s.x, z: s.z }, cheer = SHOW.cheer[n.kind] || ['♪'];
    setDoing(n.kind, 'note', `${nameOf(s.by)} 공연 구경`);
    const hurry = Math.hypot(s.x - n.x, s.z - n.z) > 8; // 공연이 끝나기 전에 닿게 뛰어간다
    const steps = [{ do: 'walk', slots: around, near: 0.5, run: hurry }, { do: 'call', fn: () => { if (show !== s) { n.plan = null; restHere(n.kind, 3); return; } s.audience.add(n.kind); } }];
    for (let t = 0; t < Math.max(5, s.until - lifeClock); t += 5) steps.push({ do: 'act', anim: Math.random() < 0.5 ? 'sway' : 'idle', face, time: 3.6, quick: true }, { do: 'act', anim: pickLine(['clap', 'clap', 'cheer', 'wave']), face, time: 1.3, say: Math.random() < 0.55 ? pickLine(cheer) : undefined, quick: true });
    steps.push({ do: 'call', fn: () => { happen({ type: 'watch', who: n.kind, with: null }); restHere(n.kind, 8 + Math.random() * 10); } });
    npcs.plan(n, steps);
  }
  /** 랏코가 우사기를 수련장으로 불러 같이 수련. */
  function npcTrain(r, u) {
    const d = village.spots.dojo;
    together(r, u, TRAIN_TALK, {
      at: { x: d.x, z: d.z + 0.8 }, anim: 'train', listen: 'train', icon: 'sword', text: (o) => `${withName(o)} 수련`,
      done: () => { happen({ type: 'train', who: r.kind, with: u.kind }); minds[u.kind] = satisfy(mindOf(u.kind), 'train'); }
    });
  }
  /** 나에게 먼저 다가와서 말을 건다: 아직 안 한 이야기(소문 · 내 큰일 칭찬)나 인사, 친한 친구는 가끔 선물도. */
  function npcGreet(n) {
    const kind = n.kind, m = mindOf(kind), h = hearts(friendOf(state, kind)), f = friendOf(state, kind);
    m.greetAt = lifeClock;
    lastGreetAt = lifeClock;
    const story = untold(kind), G = GIFT[kind];
    const line = story ? story.line : fillLine(pickLine(GREET_RUN[kind] || ['{me}!']), { me: myName() });
    // 친한 친구의 선물: 가방에 좋아하지 않는 물건이 있으면 그걸 답례로(없으면 늘 주던 것)
    const back = thanksOf(state, kind);
    const gift = h >= 3 && G && f.giftDay !== state.clock.day && Math.random() < 0.35
      ? (back && Math.random() < 0.6 ? { item: back, n: 1, line: THANKS_SAY[kind] || G.line, fromBag: true } : G) : null;
    setDoing(kind, 'heart', '나에게 인사');
    const far = Math.hypot(player.position.x - n.x, player.position.z - n.z) > 7;
    const steps = [{ do: 'approach', near: 1.8, max: 18, run: far }, {
      do: 'call', fn: () => {
        if (mode !== 'play') { n.plan = null; restHere(kind, 5); return; }
        npcs.say(n, line);
        npcs.emote(n, 'wave', 0.8);
        if (story) m.told.add(story.ev);
      }
    }, { do: 'act', anim: 'talk', time: npcs.lineTime(line) + 0.3, quick: true }];
    if (gift) steps.push({ do: 'call', fn: () => giftFrom(n, gift) }, { do: 'act', anim: joyAnim(n.kind), time: 2.4, quick: true });
    steps.push({ do: 'act', anim: 'idle', time: 2.5, quick: true }, { do: 'call', fn: () => restHere(kind, 10 + Math.random() * 10) });
    npcs.plan(n, steps);
  }
  /** 친한 친구가 주는 선물(하루 한 번). */
  function giftFrom(n, g) {
    if (g.fromBag && !pantryOf(state, n.kind)[g.item]) return; // 다가오는 사이 먹거나 나눠 줬다
    const r = addItem(g.fromBag ? takeFromPantry(state, n.kind, g.item, g.n).state : state, g.item, g.n);
    if (!r.added) return;
    commit(markDay(r.state, n.kind, 'giftDay', state.clock.day));
    npcs.say(n, g.line);
    hud.bagBump();
    sound.play('coin');
    hud.toast(`${josa(nameOf(n.kind), '이/가')} 선물을 줬어요`, 2800, { icon: itemSvg(g.item), chips: [{ text: `${itemInfo(g.item).name} ${r.added}개` }] });
  }
  /** 산책: 광장 · 연못 · 가게 앞처럼 마을 이곳저곳(지금 있는 곳 말고). */
  function npcStroll(n) {
    const S = village.spots, places = [['광장', S.plaza], ['연못', { x: POND.x, z: POND.z - POND.r - 1.2 }], ['포셰트 가게', S.pochette], ['헌책방', S.books], ['노동 접수', S.board], ['라멘 로우', S.ramen], ['수련장', S.dojo]]
      .filter(([, p]) => p && Math.hypot(p.x - n.x, p.z - n.z) > 5);
    const [name, p] = places[Math.floor(Math.random() * places.length)];
    const at = village.nearestFree(p.x + (Math.random() - 0.5) * 3, p.z + 0.8 + Math.random() * 1.8, 0.5);
    setDoing(n.kind, 'step', `${name} 산책`);
    npcs.plan(n, [{ do: 'walk', x: at.x, z: at.z, near: 0.8 }, { do: 'act', anim: 'idle', time: 2 + Math.random() * 3, quick: true }, { do: 'call', fn: () => restHere(n.kind, 5 + Math.random() * 10) }]);
  }
  /** 친구 일에 반응: 가까이 있는 한가한 친구 중 그 친구를 가장 좋아하는 친구가 달려와 축하하거나 달래 준다. */
  function reactToFriend(n, passed) {
    const f = otherVillagers(n.kind).filter((m) => isFree(m) && Math.hypot(m.x - n.x, m.z - n.z) < 26)
      .sort((a, b) => likeOf(b.kind, n.kind) - likeOf(a.kind, n.kind))[0];
    if (!f || likeOf(f.kind, n.kind) < 0.45) return;
    const lines = passed ? [[f.kind, CONGRATS[f.kind]], [n.kind, THANKS[n.kind]]] : [[f.kind, COMFORT[f.kind]], [n.kind, COMFORTED[n.kind]]];
    together(f, n, lines, {
      at: { x: n.x, z: n.z }, icon: 'heart', text: (o) => (passed ? `${nameOf(o)} 축하` : `${nameOf(o)} 달래기`),
      done: () => happen({ type: passed ? 'congrats' : 'comfort', who: f.kind, with: n.kind })
    });
  }
  /** 내가 기절했다 깨면: 친한 한가한 친구가 달려온다. */
  function rushToMe() {
    if (npcs.partyKinds().length) return; // 같이 토벌하던 친구가 이미 옆에 있다
    const p = player.position;
    const f = Object.keys(VILLAGERS).map((k) => npcs.byKind(k)).filter((m) => isFree(m) && hearts(friendOf(state, m.kind)) >= 2)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!f || Math.hypot(f.x - p.x, f.z - p.z) > 45) return;
    setDoing(f.kind, 'heart', '나에게 달려오는 중');
    const line = fillLine(FAINT_RUSH[f.kind] || '괜찮아?!', { me: myName() });
    npcs.plan(f, [{ do: 'approach', near: 1.8, max: 40, run: true }, { do: 'call', fn: () => npcs.say(f, line) }, { do: 'act', anim: 'talk', time: npcs.lineTime(line) + 0.3, quick: true }, { do: 'act', anim: 'idle', time: 2, quick: true }, { do: 'call', fn: () => restHere(f.kind, 8) }]);
  }
  /**
   * 보스에게 처음 쓰러지면(혼자든 같이든 한 번만, state.story.rakkoCheer), 깨어난 뒤 랏코가 걸어와 말을 걸고 힘내라며 대나무 도시락을 준다.
   * 혼자였으면 마을 친구들과 친해져서 같이 토벌하라고(같이 가 줄 친한 토벌 친구가 있으면 같이 가자고 하라고, 랏코 자신이 그만큼 친하면 자기를 부르라고).
   * 멀리 있거나 집 안이면 화면 밖 가까이까지 나와서 걸어온다. 잠잘 시각 · 같이 토벌 · 다른 안내 중이면 오지 않는다(다음에 보스에게 쓰러지면 다시).
   */
  let rakkoCall = null;
  /** 이 몬스터에게 쓰러지면 보스에게 진 것인지 → 보스 종류 | null. 보스 마당의 부하에게 쓰러져도 그 보스. */
  const bossOf = (m) => (m.M.boss ? m.species : m.arena ? m.arena.id : null);
  function startRakkoAdvice(boss, solo) {
    const n = npcs.byKind('rakko'), p = player.position;
    if (!boss || !state || (state.story || {}).rakkoCheer || !n || n.party || n.lead || n.follow || buddies.has('rakko') || isSleepHour(hourOf(state.clock))) return false;
    if (n.away || Math.hypot(n.x - p.x, n.z - p.z) > 20) { // 화면 밖(카메라 쪽) 가까이로 나와서 걸어온다
      const at = village.nearestFree(p.x + 1.5, p.z + 9, 0.45);
      npcs.comeOut(n, at.x, at.z);
      delete awayInfo.rakko;
      setDoing('rakko', null, null);
    }
    rakkoCall = { t: 0, boss, solo };
    npcs.setFollow('rakko', true); // 내 쪽으로 걸어온다
    return true;
  }
  /** 랏코의 대나무 도시락을 가방에 넣고, 다시는 오지 않게 적어 둔다. */
  function giveRakkoBento() {
    const a = addItem(state, 'rakkobento', 1);
    commit({ ...a.state, story: { ...(a.state.story || {}), rakkoCheer: state.clock.day } });
    sound.play('ready');
    if (a.added) { hud.bagBump(); hud.toast(`${josa(itemInfo('rakkobento').name, '을/를')} 받았어요!`, 3200, { icon: itemSvg('rakkobento') }); }
  }
  function updateRakkoAdvice(dt) {
    if (!rakkoCall) return;
    rakkoCall.t += dt;
    const n = npcs.byKind('rakko');
    if (!n || n.away || rakkoCall.t > 40) { rakkoCall = null; npcs.setFollow('rakko', false); return; }
    const near = Math.hypot(n.x - player.position.x, n.z - player.position.z) < 2.4;
    if (!(near || rakkoCall.t > 12) || mode !== 'play' || guide.open || panels.isOpen() || sleeping || funBusy() || fainting || pulling || questScene) return;
    const B = MONSTERS[rakkoCall.boss], ok = (k) => hearts(friendOf(state, k)) >= PARTY_HEARTS;
    const me = ok('rakko'), others = Object.keys(HUNTER_PROFILES).some((k) => k !== 'rakko' && ok(k)), solo = rakkoCall.solo, foe = B ? B.short || B.name : '그 녀석';
    rakkoCall = null;
    npcs.setFollow('rakko', false);
    beginTalk(n);
    sayAs(n, [
      '…{name}. 쓰러졌다고 들었다.',
      solo ? `…${foe}에게 혼자 갔었나.` : `…${foe}에게 당했나.`,
      solo ? '그 녀석은 혼자서는 버겁다. …나도 처음엔 그랬다.' : '그 녀석은 만만치 않다. …나도 처음엔 그랬다.',
      ...(!solo ? ['…무기를 손보고, 기운을 가득 채워서 다시 가라.']
        : me ? ['…나를 불러라. 같이 가 주지.', '다음엔 혼자 가지 마라.']
          : others ? ['…네가 같이 가자고 하면 따라와 줄 친구가 있다.', '다음엔 혼자 가지 마라.']
            : ['…마을 친구들과 더 친해져라.', '친해지면 같이 토벌 가자고 할 수 있다. 여럿이면 해볼 만하다.']),
      '(랏코가 대나무 잎으로 싼 도시락을 내민다)',
      '…이거 먹고 힘내라. 훗. 우선 기운부터 채워라.'
    ], () => { endTalk(); giveRakkoBento(); });
  }
  /** 머리 위 하는 일 아이콘: 내 둘레 친구들만, 머리 오른쪽 위에 작게(말풍선이 뜨면 잠깐 숨는다). */
  function doingLabels(focus) {
    const out = [];
    for (const kind of [...Object.keys(VILLAGERS), ...STAFF]) {
      const n = npcs.byKind(kind), d = minds[kind] && minds[kind].doing;
      if (!n || n.away || n.bubble || staged.has(kind) || !d || !d.icon || !DOING_ICONS[d.icon] || Math.hypot(n.x - focus.x, n.z - focus.z) > 15) continue;
      out.push({ id: 'do-' + kind, x: n.x, y: n.chibi.height + 0.3 + (n.driving ? 0.75 : 0), z: n.z, text: '', kind: 'doing', icon: d.icon, svg: DOING_ICONS[d.icon] });
    }
    return out;
  }
  /** 친구 앱: 친구마다 지금 하는 일, 오늘 마을 소식(최근 것부터). */
  function villageLive() {
    if (!state) return { doing: {}, news: [] };
    const doing = {};
    for (const kind of Object.keys(VILLAGERS)) {
      const n = npcs.byKind(kind), d = minds[kind] && minds[kind].doing;
      const text = n && n.party ? '나랑 같이 토벌' : n && n.away ? (awayInfo[kind] && awayInfo[kind].why === 'nap' ? '집에서 낮잠' : awayInfo[kind] && awayInfo[kind].why === 'visit' ? '집에서 나랑 노는 중' : '집에서 자는 중') : d ? d.text : '쉬는 중';
      const icon = n && n.party ? 'sword' : n && n.away ? 'moon' : d && d.icon;
      doing[kind] = { text, svg: icon ? DOING_ICONS[icon] : null };
    }
    for (const kind of STAFF) {
      const d = minds[kind] && minds[kind].doing;
      doing[kind] = { text: d ? d.text : '가게 지키는 중', svg: d && d.icon ? DOING_ICONS[d.icon] : null };
    }
    const today = state.clock.day;
    return { doing, news: villageNews.filter((e) => e.day === today).slice(-8).reverse().map((e) => ({ ...e, faces: e.kinds.map(faceIcon) })) };
  }

  // ---------- 갑옷 씨들 · 시사 · 카니: 가게를 지키다가 일과대로 움직이고, 지나가는 나와 친구들에게 먼저 말을 건다 ----------
  const STAFF = ['labor', 'ramen', 'captain', 'pochette', 'shisa', 'kani'];
  const staffGreetAt = {}; // 나에게 마지막으로 인사한 때
  STAFF.forEach((k) => { restUntil[k] = 3 + Math.random() * 12; });
  const staffLine = (kind, key) => fillLine(pickLine(STAFF_TALK[kind][key]), { me: myName() });
  /** 그 갑옷 씨가 가까이(from 에서 maxD 안) 있고 한가하면 한마디. */
  function staffSay(kind, key, maxD, from) {
    const n = npcs.byKind(kind);
    if (!n || n.away || n.talk > 0 || n === talking || !STAFF_TALK[kind][key] || Math.hypot(n.x - from.x, n.z - from.z) > maxD) return;
    npcs.say(n, staffLine(kind, key));
  }
  /** 가게 자리로 돌아와 잠깐 쉰다. */
  const backToPost = (n) => [{ do: 'walk', x: n.home.x, z: n.home.z, near: 0.6 }, { do: 'call', fn: () => restHere(n.kind, 10 + Math.random() * 15) }];
  /** 가게 자리에서 몸짓 몇 번(가끔 혼잣말). */
  function atPost(n, anim, key, icon, text, times = 3, face = null) {
    setDoing(n.kind, icon, text);
    const steps = [];
    if (Math.hypot(n.x - n.home.x, n.z - n.home.z) > 0.8) steps.push({ do: 'walk', x: n.home.x, z: n.home.z, near: 0.5 });
    for (let i = 0; i < times; i++) steps.push({ do: 'act', anim, face, time: 3.2 + Math.random() * 1.5, say: i === 0 || Math.random() < 0.4 ? staffLine(n.kind, key) : undefined, quick: true });
    steps.push({ do: 'call', fn: () => restHere(n.kind, 8 + Math.random() * 12) });
    npcs.plan(n, steps);
  }
  /** 어딘가에 다녀온다: 가서 몸짓하고 가게로 돌아온다. */
  function goAndDo(n, at, anim, key, icon, text, time = 5, face = null) {
    const p = village.nearestFree(at.x, at.z, 0.45);
    setDoing(n.kind, icon, text);
    npcs.plan(n, [{ do: 'walk', x: p.x, z: p.z, near: 0.6 }, { do: 'act', anim, face, time, say: key ? staffLine(n.kind, key) : undefined, quick: true }, ...backToPost(n)]);
  }
  /** 일감 중인 친구(풀 · 열매 · 스티커) 중 가까운 하나. */
  function workerNear(n, maxD) {
    return Object.keys(VILLAGERS).map((k) => npcs.byKind(k))
      .filter((v) => v && !v.away && minds[v.kind] && minds[v.kind].doing && ['leaf', 'star'].includes(minds[v.kind].doing.icon) && Math.hypot(v.x - n.x, v.z - n.z) < maxD)
      .sort((a, b) => Math.hypot(a.x - n.x, a.z - n.z) - Math.hypot(b.x - n.x, b.z - n.z))[0] || null;
  }
  /** 일하는 친구 옆에 가서 한마디(친구는 하던 일을 계속하며 대답만 한다). */
  function cheerWorker(n, key, icon, text) {
    const w = workerNear(n, 26);
    if (!w) return false;
    const d = Math.hypot(w.x - n.x, w.z - n.z) || 1, k = Math.max(0, (d - 1.6) / d);
    const at = village.nearestFree(n.x + (w.x - n.x) * k, n.z + (w.z - n.z) * k, 0.45), line = staffLine(n.kind, key);
    setDoing(n.kind, icon, `${nameOf(w.kind)} ${text}`);
    npcs.plan(n, [{ do: 'walk', x: at.x, z: at.z, near: 0.8 },
      { do: 'act', anim: 'talk', face: { x: w.x, z: w.z }, time: npcs.lineTime(line) + 0.2, say: line, quick: true },
      { do: 'call', fn: () => { if (!w.away && Math.hypot(w.x - n.x, w.z - n.z) < 4.5) npcs.say(w, PRAISED[w.kind] || '네!'); } },
      { do: 'act', anim: 'clap', face: { x: w.x, z: w.z }, time: 2.2, quick: true }, ...backToPost(n)]); // 격려하고 박수
    return true;
  }
  /** 점심: 라멘 가게 앞에 앉아 한 그릇(노동 갑옷 씨). */
  function staffLunch(n) {
    const r = village.spots.ramen, face = { x: r.x, z: r.z - 1.5 };
    setDoing(n.kind, 'bowl', '점심 라멘');
    npcs.plan(n, [...ramenSeatSteps(n, () => npcs.plan(n, backToPost(n))), { do: 'call', ramen: true, fn: () => staffSay('ramen', 'welcome', 7, r) },
      { do: 'act', anim: 'slurp', face, time: 5, say: staffLine(n.kind, 'lunch'), quick: true, ramen: true }, { do: 'act', anim: 'slurp', face, time: 3, quick: true, ramen: true },
      { do: 'call', ramen: true, fn: () => {} }, ...backToPost(n)]); // 빈 call: 두 번째 그릇을 다 비울 때까지 자리를 지킨다
  }
  /** 대장 갑옷 씨 순찰: 광장과 문 몇 곳을 돌며 둘러본다. */
  function patrol(n) {
    const k = (VILLAGE_R - 4.5) / VILLAGE_R, pl = village.spots.plaza;
    const stops = [pl, ...Object.values(GATES).map((g) => ({ x: g.x * k, z: g.z * k, out: g }))].sort(() => Math.random() - 0.5).slice(0, 2);
    setDoing(n.kind, 'eye', '마을 순찰');
    const steps = [];
    for (const s of stops) {
      const p = village.nearestFree(s.x, s.z, 0.5);
      steps.push({ do: 'walk', x: p.x, z: p.z, near: 0.8 }, { do: 'act', anim: 'idle', face: s.out || { x: p.x, z: p.z + 3 }, time: 2.6, say: Math.random() < 0.6 ? staffLine(n.kind, 'patrol') : undefined, quick: true });
    }
    npcs.plan(n, [...steps, ...backToPost(n)]);
  }
  /** 대장 갑옷 씨: 가까운 풀을 살피러 간다. */
  function inspectWeeds(n) {
    const near = weeds.list.filter((w) => weeds.usable(w) && Math.hypot(w.x - n.x, w.z - n.z) < 22);
    if (!near.length) return patrol(n);
    const w = near[Math.floor(Math.random() * near.length)], d = Math.hypot(w.x - n.x, w.z - n.z) || 1, k = Math.max(0, (d - 1.2) / d);
    goAndDo(n, { x: n.x + (w.x - n.x) * k, z: n.z + (w.z - n.z) * k }, 'read', 'weeds', 'eye', '풀 살피기', 4, { x: w.x, z: w.z });
    return true;
  }
  /** 시사 심부름: 가게 몇 곳을 돌고 온다. */
  function errand(n) {
    const S = village.spots, list = [S.pochette, S.books, S.plaza, S.tools].filter(Boolean), dest = list[Math.floor(Math.random() * list.length)];
    const p = village.nearestFree(dest.x, dest.z + 0.6, 0.45);
    setDoing(n.kind, 'step', '심부름');
    npcs.say(n, staffLine(n.kind, 'errand'));
    npcs.plan(n, [{ do: 'walk', x: p.x, z: p.z, near: 0.7 }, { do: 'act', anim: 'talk', time: 2.5, quick: true },
      { do: 'walk', x: n.home.x, z: n.home.z, near: 0.6 }, { do: 'act', anim: joyAnim(n.kind), time: 1.4, say: staffLine(n.kind, 'back'), quick: true }, { do: 'call', fn: () => restHere(n.kind, 10 + Math.random() * 10) }]);
  }
  /** 갑옷 씨들의 하루: 시간대마다 할 만한 일에 무게를 매겨 하나 고른다. */
  function staffDecide(n, kind, hour) {
    if (hour < 7 || hour >= 20.5) { // 가게 문 닫은 시간: 자리로 돌아가 쉰다
      setDoing(kind, 'moon', '가게 문 닫음');
      if (Math.hypot(n.x - n.home.x, n.z - n.home.z) > 1) npcs.plan(n, backToPost(n)); else restUntil[kind] = lifeClock + 20;
      return;
    }
    const S = village.spots, south = (p) => ({ x: p.x, z: p.z + 4 });
    const freeVillager = () => Object.keys(VILLAGERS).map((k) => npcs.byKind(k)).filter((v) => isFree(v) && Math.hypot(v.x - n.x, v.z - n.z) < 24)[0];
    let opts = [];
    if (kind === 'labor') {
      const b = S.board, left = Object.values(boardOf(state, state.clock.day).left).reduce((a, c) => a + c, 0);
      opts = [
        [hour < 10 ? 3 : 0.4, () => goAndDo(n, { x: b.x - 1.85, z: b.z - 0.75 }, 'read', 'post', 'pen', '일감 붙이기', 4.5, { x: b.x - 1.85, z: b.z - 1.8 })], // 옆 일감 걸이에 패를 건다
        [2, () => atPost(n, 'talk', left > 0 ? 'call' : 'callNone', 'dots', '손님 부르기', 2, south(n.home))],
        [hour >= 9 && hour < 18 ? 1.8 : 0, () => cheerWorker(n, 'cheer', 'eye', '격려') || atPost(n, 'talk', 'call', 'dots', '손님 부르기', 1, south(n.home))],
        [hour >= 11.5 && hour < 13.5 ? 6 : 0, () => staffLunch(n)],
        [hour >= 17 ? 2.5 : 0.3, () => atPost(n, 'sweep', 'sweep', 'broom', '게시판 앞 정리', 2)],
        [0.6, () => atPost(n, 'stretch', 'stretch', null, '쉬는 중', 1)]
      ];
    } else if (kind === 'ramen') {
      const r = S.ramen, shisa = npcs.byKind('shisa');
      opts = [
        [3, () => atPost(n, 'sweep', 'cook', 'pot', '국물 우리기', 3, { x: r.x, z: r.z - 2 })],
        [shisa && !npcs.busy(shisa) && shisa !== talking ? 1.6 : 0, () => together(n, shisa, pickLine(STAFF_SCRIPTS.coach), { at: { x: r.x + 1.9, z: r.z - 0.3 }, icon: 'pot', text: (o) => (o === 'shisa' ? '시사 가르치기' : '면 삶기 배우기') })],
        [emptySeat(n) ? 1 : 0, () => goAndDo(n, emptySeat(n), 'sweep', 'wipe', 'broom', '테이블 닦기', 4)],
        [hour >= 14.5 && hour < 16.5 ? 3 : 0.2, () => goAndDo(n, Math.random() < 0.5 ? { x: POND.x + 1, z: POND.z - POND.r - 1 } : S.plaza, 'idle', 'rest', 'step', '바람 쐬기', 6)]
      ];
    } else if (kind === 'pochette') {
      const st = S.pochette, v = freeVillager();
      opts = [
        [3, () => atPost(n, 'read', 'sew', 'needle', '바느질', 3, { x: st.x + 0.3, z: st.z + 4 })], // 판매대 뒤에서 손님 쪽을 보고, 판매대 위로 천 · 바늘(models.js 'sewing')
        [1.5, () => goAndDo(n, { x: st.x + (Math.random() - 0.5) * 2.4, z: st.z + 1 }, 'talk', 'display', 'dots', '손님 부르기', 3.5, south(st))],
        [v ? 1.7 : 0, () => together(n, v, [['pochette', staffLine('pochette', 'compliment')], [v.kind, PRAISED[v.kind] || '헤헤']], { icon: 'heart', text: (o) => (o === 'pochette' ? '칭찬 듣기' : `${nameOf(o)} 칭찬`) })],
        [hour >= 10 && hour < 18 ? 1 : 0.2, () => goAndDo(n, { x: S.plaza.x + (Math.random() - 0.5) * 4, z: S.plaza.z + 2 }, 'pose', 'show', 'heart', '신상 자랑', 5, south(S.plaza))]
      ];
    } else if (kind === 'captain') {
      const ex = S.exam, rk = npcs.byKind('rakko');
      opts = [
        [hour < 9.5 ? 3 : 0.3, () => goAndDo(n, { x: ex.x + 0.6, z: ex.z + 0.2 }, 'read', 'prep', 'pen', '시험 준비', 5, { x: ex.x, z: ex.z - 2 })],
        [hour >= 8 && hour < 18 ? 2.2 : 0.5, () => patrol(n)],
        [1.2, () => inspectWeeds(n)],
        [hour >= 9 && hour < 18 ? 1.4 : 0, () => cheerWorker(n, 'watch', 'eye', '지켜보기') || patrol(n)],
        [hour >= 16 && isFree(rk) ? 2 : 0, () => together(n, rk, STAFF_SCRIPTS.spar[0], { at: { x: S.dojo.x, z: S.dojo.z + 0.8 }, anim: 'train', listen: 'train', icon: 'sword', text: (o) => `${withName(o)} 대련`, done: () => happen({ type: 'train', who: 'captain', with: 'rakko' }) })]
      ];
    } else if (kind === 'shisa') {
      opts = [[3, () => atPost(n, 'sweep', 'sweep', 'broom', '가게 앞 청소', 3)], [hour >= 9 && hour < 17 ? 1 : 0, () => errand(n)]];
    } else if (kind === 'kani') {
      opts = [[3, () => atPost(n, 'read', 'read', 'book', '책 읽기', 3)],
        [hour >= 10 && hour < 18 ? 1 : 0, () => goAndDo(n, { x: POND.x - 1.2, z: POND.z - POND.r - 1 }, 'read', 'out', 'book', '연못가 독서', 9, { x: POND.x, z: POND.z })]];
    }
    const total = opts.reduce((a, [w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [w, fn] of opts) { if ((r -= w) <= 0) { fn(); return; } }
    restHere(kind, 10);
  }
  /** 내가 가게 앞을 지나가면 먼저 인사한다(가끔). */
  function staffGreet(n, kind) {
    if (mode !== 'play' || funBusy() || panels.isOpen() || guide.open || sleeping) return;
    const p = player.position;
    if (Math.hypot(p.x - n.x, p.z - n.z) > 5.5 || lifeClock - (staffGreetAt[kind] ?? -999) < 120 || Math.random() > 0.35) return;
    staffGreetAt[kind] = lifeClock;
    npcs.emote(n, 'wave', 0.8);
    npcs.say(n, staffLine(kind, kind === 'labor' && !Object.values(boardOf(state, state.clock.day).left).some((c) => c > 0) ? 'greetNone' : 'greet'));
  }

  // ---------- 맥주집: 저녁이면 쿠리만쥬가 와 있고, 같이 건배하면 친해진다 ----------
  /** 쿠리만쥬 자리: 카운터 앞 왼쪽 의자 옆(내가 서는 맥주집 앞 자리 바로 왼쪽). */
  const pubSeat = () => ({ x: village.spots.pub.x - 0.95, z: village.spots.pub.z - 0.35 });
  /** 쿠리만쥬가 맥주집에 와 있으면 그 친구(아니면 null). */
  function kuriAtPub() {
    const k = npcs.byKind('kurimanju'), s = pubSeat();
    return k && !k.away && Math.hypot(k.x - s.x, k.z - s.z) < 2.6 ? k : null;
  }
  /** 쿠리만쥬가 맥주집으로 가서 한 잔 한다(벌써 와 있으면 그 자리에서 계속). */
  const PUB_LINES = ['캬~ 퇴근 후엔 역시 생맥주!', '하아~ 거품이 살아 있네…', '한 잔 더~', '{name}도 한 잔 할래?'];
  function npcPub(n) {
    const s = pubSeat(), steps = [];
    setDoing(n.kind, 'mug', '맥주집에서 한 잔');
    if (Math.hypot(n.x - s.x, n.z - s.z) > 0.9) steps.push({ do: 'walk', x: s.x, z: s.z });
    steps.push({ do: 'call', fn: () => { n.yaw = Math.atan2(village.spots.pub.x - n.x, village.spots.pub.z - 2 - n.z); } });
    steps.push({ do: 'act', anim: 'drink', time: 9, say: fillName(PUB_LINES[Math.floor(Math.random() * PUB_LINES.length)]) });
    steps.push({ do: 'call', fn: () => { restUntil[n.kind] = lifeClock + 4; } });
    npcs.plan(n, steps);
  }
  /** 쿠리만쥬와 건배: 두 잔 값을 내고 짠! 하루 한 번 하트 +2 · 기운도 조금. */
  /** 먹는 몸짓: 창을 닫고 그 음식을 손에 들고 먹는다(라멘은 그릇 들고 후루룩, 술은 잔 들고 꿀꺽, 과자는 냠냠). */
  function eatMotion(id) {
    const st = eatStyle(id);
    if (!st) return;
    panels.close();
    if (mode === 'home') interior.pose(st.mode, st.dur, st.prop);
    else if (mode === 'visit') rooms.pose(st.mode, st.dur, st.prop);
    else {
      const c = cam.camera.position;
      player.face(c.x, c.z); // 화면 쪽으로 돌아서 먹는다(뒷모습이면 그릇 · 잔이 몸에 가려진다)
      player.eat(st.mode, st.prop, st.dur);
    }
  }
  /** 건배: 생맥주 잔을 들고 꿀꺽. */
  function drinkBeer() { const st = eatStyle('beer'); player.eat(st.mode, st.prop, st.dur); }

  function cheersWith(n) {
    if (!talking) beginTalk(n);
    if (!hasLicense(state, 'liquor')) { sayAs(n, ['하아~ 술은 술 자격증부터!', '검정소에서 따 오면 같이 마시자~'], endTalk); return; }
    if (friendOf(state, n.kind).drink === state.clock.day) { sayAs(n, ['오늘은 벌써 한 잔 했잖아~ 하아~', '내일 저녁에 또 건배하자!'], endTalk); return; }
    if (state.money < CHEERS_PRICE) { sayAs(n, [`두 잔이면 ${won(CHEERS_PRICE)}인데… 돈이 모자라나 봐.`, '다음에 같이 마시자~'], endTalk); return; }
    commit({ ...state, money: state.money - CHEERS_PRICE, stamina: Math.min(MAX_STAMINA, state.stamina + CHEERS_STAMINA) });
    sound.play('coin');
    const p = player.position;
    player.face(n.x, n.z);
    n.yaw = Math.atan2(p.x - n.x, p.z - n.z);
    npcs.emote(n, 'drink', 3.6);
    drinkBeer();
    hud.floatText({ x: (p.x + n.x) / 2, y: 1.7, z: (p.z + n.z) / 2, text: '짠!', kind: 'note' });
    setTimeout(() => sound.play('heart'), 250);
    sayAs(n, ['건배~!', '…캬~ 같이 마시니까 훨씬 맛있다. 하아~', { text: '(생맥주 두 잔을 비웠다)', chips: [{ icon: ICO.coin, text: `-${won(CHEERS_PRICE)}` }, { icon: ICO.heart, text: `기운 +${CHEERS_STAMINA}` }] }], () => reward(n, 'drink'));
  }

  // ---------- 소매치기 모몽가: 하루 한 번쯤, 낮은 확률로 살금살금 다가와 지갑을 노린다 ----------
  function maybeSteal(day, hour) {
    if (theft || tag || mode !== 'play' || hour < 8 || hour >= 20 || tutorialActive(state.tutorial) || !canSteal(state, day)) return;
    if (state.truce && state.truce >= day) return; // 모몽가와 약속(보물 상자 부탁)한 동안은 노리지 않는다
    if (funBusy() || panels.isOpen() || guide.open || sleeping || sticker || pulling) return;
    const m = npcs.byKind('momonga');
    if (!m || m.away || npcs.busy(m) || Math.hypot(m.x - player.position.x, m.z - player.position.z) > 5.5) return;
    if (Math.random() > 0.03) return; // 가까이 있을 때 1.5초마다 3%
    theft = { n: m, t: 8, retarget: 0 };
    npcs.say(m, '(살금살금…)');
  }
  /** 매 프레임: 다가오는 중이면 내 쪽으로, 닿으면 슥! 너무 오래 걸리면 포기. */
  function updateTheft(dt) {
    if (!theft) return;
    const m = theft.n, d = Math.hypot(m.x - player.position.x, m.z - player.position.z);
    theft.t -= dt;
    if (panels.isOpen() || guide.open || overlay || sleeping || sticker || mode !== 'play') { npcs.lead('momonga', null); theft = null; return; }
    if (d < m.chibi.radius + 0.55) {
      const amount = guardedTheft(state, stealAmount(state)); // 포셰트에 넣어 두면 절반만
      npcs.lead('momonga', null);
      theft = null;
      commit(steal(state, amount, state.clock.day));
      startThiefChase(m, amount);
    } else if (theft.t <= 0) {
      npcs.lead('momonga', null);
      commit(markTheft(state, state.clock.day));
      npcs.say(m, '…쳇!');
      theft = null;
    } else if ((theft.retarget -= dt) <= 0) {
      theft.retarget = 0.3;
      npcs.lead('momonga', { x: player.position.x, z: player.position.z });
    }
  }
  /** 훔쳐서 달아난다: 15초 안에 잡으면 돌려받는다. */
  function startThiefChase(m, amount) {
    cancelPull();
    npcs.flee(m, true);
    npcs.say(m, '흥! 느림보~ 이건 내 거야!');
    tag = { n: m, t: 15, head: 0.6, thief: amount };
    // 둘레에서 본 친구들이 놀라고, 소문이 난다
    const seen = happen({ type: 'theft', who: 'momonga' });
    for (const f of otherVillagers('momonga')) {
      if (f.away || Math.hypot(f.x - player.position.x, f.z - player.position.z) > 14) continue;
      remember(f.kind, seen);
      if (THEFT_SEEN[f.kind] && !npcs.busy(f)) npcs.say(f, THEFT_SEEN[f.kind]);
    }
    hud.banner('소매치기다!', '잡아요!', 2600, [{ icon: 'coin', text: `−${won(amount)}` }, worn(state) ? { text: '포셰트 덕에 ½' } : null].filter(Boolean));
    sound.play('stamp');
  }
  function endThiefChase(m, amount, caught) {
    if (caught) {
      commit(recover(state, amount));
      beginTalk(m);
      player.cheerTime = 1.6;
      sound.play('coin');
      sayAs(m, ['으앗, 잡혔다!', '…쳇, 돌려주면 되잖아! 흥!'], () => { endTalk(); hud.toast(`${won(amount)}을 돌려받았어요!`, 3000); });
    } else {
      commit(thiefKeeps(state, amount, state.clock.day));
      hud.toast(`모몽가가 ${won(amount)}을 들고 도망쳤어요…`, 3600);
      sound.play('fail');
    }
  }

  // ---------- 상호작용 대상 ----------
  const PLACES = [['board', '게시판'], ['exam', '검정소'], ['ramen', '라멘 로우'], ['furniture', '가구점'], ['realty', '부동산'], ['pochette', '포셰트 가게'], ['books', '카니 헌책방'], ['tools', '도구점'], ['pub', '맥주집'], ['home', '집에 들어가기'], ['factory', '스티커 작업'], ['raffle', '경품 추첨'], ['salon', '변신 살롱'], ['donation', '마을 가꾸기']];
  // 가장 가까운 대상을 고른다. 건물은 거리를 0.6 깎아 조금 우선한다.
  function findTarget() {
    const p = player.position;
    const options = [];
    // 바닥에 떨어진 물건(주머니에서 버린 것): 줍기
    const gi = ground.nearest(p.x, p.z, 1.15);
    if (gi) options.push({ d: Math.hypot(gi.x - p.x, gi.z - p.z) - 0.3, t: { type: 'pickup', g: gi.g, x: gi.x, z: gi.z, label: `${groundName(gi)}${gi.n > 1 ? ` ×${gi.n}` : ''} 줍기` } });
    // 무기를 들었고 몬스터가 닿을 만큼 가까우면 무엇보다 먼저 공격(4단계)
    const wid = weaponNow();
    if (wid) {
      const m = monsters.nearest(p.x, p.z, WEAPONS[wid].range + 0.5);
      if (m) options.push({ d: -1, t: { type: 'attack', monster: m, label: '공격' } });
    }
    // 친구가 뽑으러 가거나 뽑는 중인 풀은 건너뛴다
    let weed = null, wd = 1.3;
    for (const w of weeds.list) {
      if (!weeds.usable(w)) continue;
      const d = Math.hypot(w.x - p.x, w.z - p.z);
      if (d < wd && !npcs.isWorkingOn(w)) { wd = d; weed = w; }
    }
    if (weed) {
      const W = WEED_KINDS[weed.kind], st = stageLabel(weed);
      const label = !canPullKind(state.license.grade, weed.kind) ? `${W.grade}급 풀` : st ? `뽑기 ${st}` : '뽑기';
      options.push({ d: Math.hypot(weed.x - p.x, weed.z - p.z), t: { type: 'weed', weed, label } });
    }
    const bush = berries.nearestReady(p.x, p.z, 1.4);
    if (bush) options.push({ d: Math.hypot(bush.x - p.x, bush.z - p.z), t: { type: 'berry', bush, label: '열매 따기' } });
    const shroom = glows.nearest(p.x, p.z, 1.5); // 밤: 빛나는 버섯 위 반짝 털뭉치
    if (shroom) options.push({ d: Math.hypot(shroom.x - p.x, shroom.z - p.z) - 0.2, t: { type: 'glow', shroom, label: '털뭉치 따기' } });
    const npc = npcs.nearest(p.x, p.z, 1.6);
    // 퀘스트 표시(! · ?)가 뜬 친구는 가게 문 앞에 서 있어도 말 걸기가 먼저
    // 같이 토벌하다 쓰러진 친구: 가까이 가면 '깨우기'가 먼저
    for (const kind of npcs.partyKinds()) {
      const dn = npcs.byKind(kind);
      if (dn && dn.down && Math.hypot(dn.x - p.x, dn.z - p.z) < 1.6) options.push({ d: -2, t: { type: 'wake', npc: dn, label: `${nameOf(kind)} 깨우기` } });
    }
    if (npc && !staged.has(npc.kind)) options.push({ d: Math.hypot(npc.x - p.x, npc.z - p.z) - (markOf(state, npc.kind) ? 1.2 : 0), t: { type: 'npc', npc, label: '말 걸기' } });
    for (const [key, label] of PLACES) {
      const s = village.spots[key], d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 1.8) options.push({ d: d - 0.6, t: { type: key, label: key === 'home' && isEvicted(state) ? '집(잠김)' : label } });
    }
    // 쫓겨났으면 밤에는 아무 데서나 노숙할 수 있다(가까운 다른 대상이 먼저)
    // 친구 집 · 하치와레 동굴 문 앞(3단계): 두드리기
    for (const [kind, d] of Object.entries(friendDoors())) {
      const dd = Math.hypot(d.x - p.x, d.z - p.z);
      if (dd < 1.8) options.push({ d: dd - 0.5, t: { type: 'friendHome', kind, label: kind === 'hachiware' ? '동굴 들여다보기' : '문 두드리기' } });
    }
    if (isEvicted(state) && bedtime()) options.push({ d: 1.7, t: { type: 'rough', label: '노숙하기' } });
    const pitT = hachiPit.target(p); // 숲 구덩이(하치와레가 구덩이에!)
    if (pitT) options.push({ d: 0.2, t: pitT });
    if (!starShow && canWish(state)) options.push({ d: 30, t: { type: 'wish', label: '별똥별에 소원 빌기' } });
    if (!resting) fishOption(p, options); // 물가: 낚싯대 펼치기(바로 앞이 물이면 둘레 풀보다 먼저, 벤치에 앉아 있을 때는 일어나서)
    workTargets(p, options); // 마을 가꾸기 시설: 꽃 따기 · 앉아서 쉬기 · 종 치기
    playerOptions(p, options); // 같이 놀기: 쓰러진 친구 깨우기 · 말 걸기
    options.sort((a, b) => a.d - b.d);
    return options.length ? options[0].t : null;
  }
  // ---------- 마을 가꾸기 시설로 하는 일(core/works.js, 게임 오리지널) ----------
  // 광장 꽃밭 '꽃 따기'(꽃밭마다 하루 한 번) · 연못 벤치와 강가 정자 '앉아서 쉬기'(앉아 있는 동안 기운이 찬다, 움직이면 일어난다)
  // · 시계탑 '종 치기'(하루 한 번, 종소리를 들은 마을 친구들이 반가워하고 조금 친해진다)
  let resting = null; // { kind, rate, acc, full, stand(일어나면 설 자리) } 앉아서 쉬는 중
  /** 앉을 수 있는 자리 [{ kind, x, z, yaw, lift }]: 생긴 벤치 둘 · 정자 안 뒤쪽 긴 의자. */
  function restSeats() {
    const out = [];
    if (workStatus(state, 'benches') === 'open') for (const b of WORK_SPOTS.benches) out.push({ kind: 'benches', x: b.x, z: b.z, yaw: b.yaw, lift: SEAT_LIFT });
    if (workStatus(state, 'pavilion') === 'open') { const P = WORK_SPOTS.pavilion[0]; out.push({ kind: 'pavilion', x: P.x, z: P.z - 0.85, yaw: P.yaw, lift: SEAT_LIFT }); }
    return out;
  }
  function workTargets(p, options) {
    if (visiting || resting || !state.works) return;
    WORK_SPOTS.flowers.forEach((b, i) => {
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < 1.7 && canPickFlower(state, i)) options.push({ d: d - 0.6, t: { type: 'flower', i, x: b.x, z: b.z, label: '꽃 따기' } });
    });
    for (const seat of restSeats()) {
      const d = Math.hypot(seat.x - p.x, seat.z - p.z);
      if (d < 1.3) options.push({ d: d - 0.5, t: { type: 'rest', seat, label: '앉아서 쉬기' } }); // 연못 벤치 바로 앞이면 낚싯대 펼치기(물 바로 앞 0.6)보다 먼저
    }
    if (canRingBell(state)) {
      const c = WORK_SPOTS.clock[0], x = c.x, z = c.z + 1.0, d = Math.hypot(x - p.x, z - p.z);
      if (d < 1.4) options.push({ d: d - 0.4, t: { type: 'bell', x, z, label: '종 치기' } });
    }
  }
  function pickPlazaFlower(i) {
    const r = pickFlower(state, i);
    if (!r.ok) { hud.toast(r.reason === 'full' ? '가방이 꽉 찼어요' : '오늘은 이미 땄어요', 2000); return; }
    commit(r.state);
    sound.play('snap');
    hud.bagBump();
    const b = WORK_SPOTS.flowers[i];
    hud.floatText({ x: b.x, y: 1.0, z: b.z, text: '광장 꽃', kind: 'mini', icon: itemSvg('plazaflower') });
    if (!seen('plazaflower')) { markSeen('plazaflower'); hud.toast('꽃밭마다 하루에 한 송이씩 딸 수 있어요. 꽃을 좋아하는 친구에게 선물해 봐요', 4200); }
  }
  function startRest(seat) {
    // 자리 위에 앉는다: 벤치 · 의자는 장애물이라 충돌 검사 없이 놓고(setPosition 은 자리 앞으로 밀어낸다), 등이 등받이에 닿게 조금 앞으로.
    // 엉덩이는 자리 높이(lift)에, 다리는 접어 자리 끝에 늘어뜨린다('bench' 몸짓)
    const fx = Math.sin(seat.yaw), fz = Math.cos(seat.yaw);
    player.placeAt(seat.x + fx * 0.1, seat.z + fz * 0.1);
    player.face(seat.x + fx * 2, seat.z + fz * 2);
    player.lift = seat.lift;
    player.act('bench', 3600);
    resting = { kind: seat.kind, rate: REST_RATE[seat.kind], acc: 0, full: false, fresh: true, stand: { x: seat.x + fx * 0.8, z: seat.z + fz * 0.8 } }; // fresh: 앉은 몸짓은 다음 player.update 때 잡히니 한 프레임은 일어난 걸로 보지 않는다
    sound.play('click');
    if (!seen('rest')) { markSeen('rest'); hud.toast('앉아 있으면 기운이 차요. 움직이면 일어나요', 3200); }
  }
  /** 매 프레임: 앉아 있는 동안 기운이 찬다. 걸어서 몸짓이 풀리면 일어난다. */
  function updateRest(dt) {
    if (!resting) return;
    if (resting.fresh) { resting.fresh = false; return; }
    if (player.anim !== 'bench' || mode !== 'play' || fishing) { // 일어나면 자리 앞에 선다(의자 장애물 안에 남지 않게)
      const st = resting.stand;
      player.lift = 0; resting = null;
      if (!fishing) player.setPosition(st.x, st.z);
      return;
    }
    if (state.stamina >= MAX_STAMINA) {
      if (!resting.full) { resting.full = true; hud.toast('기운이 가득 찼어요', 2000); }
      return;
    }
    resting.acc += resting.rate * dt;
    if (resting.acc >= 1) { const n = Math.floor(resting.acc); resting.acc -= n; commit({ ...state, stamina: Math.min(MAX_STAMINA, state.stamina + n) }, false); }
  }
  function ringClockBell() {
    const r = ringBell(state);
    if (!r.ok) return;
    let s = r.state;
    sound.play('bell');
    player.cheerTime = 1.4;
    const c = WORK_SPOTS.clock[0];
    [0, 750, 1500].forEach((ms) => setTimeout(() => hud.floatText({ x: c.x, y: 3.4, z: c.z + 0.5, text: '땡—', kind: 'note' }), ms));
    // 종소리를 들은 마을 친구들: 한마디 하고 기뻐하며, 그날 상한 안에서 조금 친해진다
    const p = player.position;
    let heard = 0;
    for (const n of npcs.list) {
      if (!VILLAGERS[n.kind] || n.away || Math.hypot(n.x - p.x, n.z - p.z) > 18) continue;
      heard++;
      setTimeout(() => { if (n.away) return; npcs.say(n, BELL_HEARD[n.kind]); npcs.emote(n, joyAnim(n.kind), 2); }, 700 + heard * 300);
      s = befriendBy(s, n.kind, 1, s.clock.day).state;
    }
    commit(s);
    hud.toast(heard ? `종소리가 울려 퍼져요. 들은 친구 ${heard}명이 반가워해요` : '종소리가 마을에 울려 퍼져요', 3400, { chips: [{ icon: ICO.clock, text: timeLabel(state.clock) }] });
  }
  /** 마을 가꾸기 시설에서 하는 부탁의 도착 연출: 벤치 · 정자는 내가 앉고 같이 온 친구가 옆에서 노래하거나 굽고, 시계탑은 종이 울린다. */
  function workQuestStage(id, step) {
    const f = npcs.byKind(QUESTS[id].giver), p = player.position;
    if (step.place === 'clockTower') { sound.play('bell'); if (f && !f.away) npcs.emote(f, joyAnim(f.kind), 3); return; }
    const seat = restSeats().find((q) => q.kind === (step.place === 'bench' ? 'benches' : 'pavilion'));
    if (!seat) return;
    startRest(seat);
    if (!f || f.away) return;
    const fx = Math.sin(seat.yaw), fz = Math.cos(seat.yaw), rx = Math.cos(seat.yaw), rz = -Math.sin(seat.yaw);
    f.x = seat.x + fx * 0.9 + rx * 0.7;
    f.z = seat.z + fz * 0.9 + rz * 0.7;
    f.yaw = Math.atan2(p.x - f.x, p.z - f.z);
    npcs.hold(f, true);
    setTimeout(() => npcs.hold(f, false), 8000);
    if (QUESTS[id].giver === 'hachiware') {
      npcs.emote(f, 'dance', 7);
      let k = 0;
      const sing = setInterval(() => {
        if (++k > 8 || mode !== 'play') { clearInterval(sing); return; }
        hud.floatText({ x: f.x + (Math.random() - 0.5) * 0.8, y: f.chibi.height + 0.4, z: f.z, text: k % 2 ? '♪' : '♫', kind: 'note' });
        if (k % 3 === 1) sound.play('heart');
      }, 650);
    } else {
      npcs.emote(f, 'drink', 4);
      setTimeout(() => hud.floatText({ x: (p.x + f.x) / 2, y: 1.6, z: (p.z + f.z) / 2, text: '지글지글♪', kind: 'note' }), 900);
    }
  }
  /** 물가 대상: 낚싯대가 있으면 '낚싯대 펼치기'(물을 바로 보고 있으면 둘레 풀 · 열매보다 먼저), 없으면 누를 때 어디서 사는지 알려 준다. */
  function fishOption(p, options) {
    const fs = fishSpotNear(p, player.yaw);
    if (!fs) return;
    if (hasTool(state, 'rod')) options.push({ d: fs.front ? 0.6 : 1.2, t: { type: 'fish', spot: fs, label: '낚싯대 펼치기' } });
    else options.push({ d: 1.25, t: { type: 'noRod', spot: fs, label: '낚시하기' } });
  }
  /** 같이 놀기: 친구 마을에서도 쓰는 건물(내 돈 · 내 일감 · 내 자격으로. 토벌 실기만 내 마을 검정소에서). 집은 친구 집이라 따로. */
  const GUEST_PLACES = new Set(['board', 'exam', 'ramen', 'furniture', 'realty', 'pochette', 'books', 'tools', 'pub', 'factory', 'raffle', 'salon']);
  /** 친구 마을에서 지금 누르면 할 일: 몬스터 치기 · 쓰러진 친구 깨우기 · 바닥 물건 줍기 · 풀 뽑기 · 열매 따기(내 가방으로) · 가게 · 친구 집. */
  function findGuestTarget() {
    const p = player.position, options = [];
    const wid = weaponNow();
    if (wid) {
      const m = monsters.nearest(p.x, p.z, WEAPONS[wid].range + 0.5);
      if (m) options.push({ d: -1, t: { type: 'attack', monster: m, label: '공격' } });
    }
    playerOptions(p, options);
    const gi = ground.nearest(p.x, p.z, 1.15);
    if (gi) options.push({ d: Math.hypot(gi.x - p.x, gi.z - p.z) - 0.3, t: { type: 'pickup', g: gi.g, x: gi.x, z: gi.z, label: `${groundName(gi)}${gi.n > 1 ? ` ×${gi.n}` : ''} 줍기` } });
    const hs = village.spots.home, hd = Math.hypot(hs.x - p.x, hs.z - p.z);
    if (hd < 1.8) options.push({ d: hd - 0.6, t: { type: 'hostHome', label: `${multi.hostName || '친구'}네 집 들어가기` } });
    let weed = null, wd = 1.3;
    for (const w of weeds.active()) {
      if (!weeds.usable(w)) continue;
      const d = Math.hypot(w.x - p.x, w.z - p.z);
      if (d < wd) { wd = d; weed = w; }
    }
    if (weed) {
      const W = WEED_KINDS[weed.kind], st = stageLabel(weed);
      const label = !canPullKind(state.license.grade, weed.kind) ? `${W.grade}급 풀` : st ? `뽑기 ${st}` : '뽑기';
      options.push({ d: wd, t: { type: 'weed', weed, label } });
    }
    const bush = berries.nearestReady(p.x, p.z, 1.4);
    if (bush) options.push({ d: Math.hypot(bush.x - p.x, bush.z - p.z), t: { type: 'berry', bush, label: '열매 따기' } });
    fishOption(p, options); // 친구 마을에서도 낚시(내 가방으로)
    for (const [key, label] of PLACES) {
      if (!GUEST_PLACES.has(key)) continue;
      const s = village.spots[key], d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 1.8) options.push({ d: d - 0.6, t: { type: key, label } });
    }
    options.sort((a, b) => a.d - b.d);
    return options.length ? options[0].t : null;
  }

  // ---------- 행동 안내: 지금 누르면 무엇을 하는지 대상 발밑에 노란 고리, 머리 위에 (PC 면 키 모양과 함께) 할 일 ----------
  const cue = new THREE.Mesh(new THREE.RingGeometry(0.74, 1, 40), new THREE.MeshBasicMaterial({ color: 0xfcd95b, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  cue.rotation.x = -Math.PI / 2;
  cue.renderOrder = 2;
  cue.visible = false;
  scene.add(cue);

  // ---------- 별똥별이 쏟아지는 밤(core/starfall.js · world/starfall.js): 소원을 빌다가 진짜 별똥별이 떨어져 별똥별맨이 ----------
  const starfall = createStarfall(scene), streaks = createStreaks(ui);
  const weather = createWeather(scene); // 비: 켜면 빗줄기 · 물방울 고리, 하늘 · 빛은 applySky 가 잿빛으로
  const RAIN_TOP = new THREE.Color('#5b6470'), RAIN_HOR = new THREE.Color('#8b939d');
  let starNotice = 0, shakeT = 0;
  const STARMAN = { kind: 'star', name: '별똥별맨', tag: '#fff3a0', ink: '#7a5a12' };
  const meWho = () => ({ kind: 'me', name: myName(), tag: '#ffffff', ink: '#5a4a3a' });
  const WISH_GAG = { rich: `(발밑에 ${WISH_MONEY}원이 떨어져 있다…)`, full: '(왠지 배가 조금 부른 것 같다…)', friends: '(친구들이랑 조금 더 가까워진 것 같다…)', luck: '(주머니에 추첨권이 한 장 들어 있다…)' };
  const STAR_REACT = { chiikawa: 'shy', hachiware: 'hop', usagi: 'hop', kurimanju: 'look', rakko: 'think', momonga: 'hop' }; // 별똥별맨을 보고 놀라는 몸짓
  // 원작처럼 셋이 같이 별똥별을 본다: 내 옆자리 [dx, dz]. 별똥별맨이 발광하면 우사기는 따라 발광, 둘은 소원을 빈다
  const STAR_PALS = [['chiikawa', -1.3, 0.4, 'pray'], ['hachiware', 1.3, 0.4, 'pray'], ['usagi', 2.6, -0.2, 'flail']];
  const north = (n) => ({ x: n.x, z: n.z - 10 });
  /** 하늘을 올려다보는 사이(땅이 화면에 안 보일 때) 셋이 내 옆에 와서 같이 하늘을 본다. */
  function gatherPals(S) {
    S.pals = [];
    for (const [kind, dx, dz] of STAR_PALS) {
      const n = npcs.byKind(kind);
      if (!n) continue;
      npcs.comeOut(n, S.p.x + dx, S.p.z + dz);
      npcs.act(n, 'gaze', { face: north(n), time: 90 });
      S.pals.push(kind);
    }
  }
  /** 소원 빌기: 고개를 들어 밤하늘 → 소원 고르기 → 진짜 별똥별이 앞에 쿵 → 별똥별맨이 빤히 보다가 날아간다. */
  function startWish(preview = false) {
    if (starShow || mode !== 'play' || (!preview && !canWish(state))) return;
    const p = player.position, land = village.nearestFree(p.x, p.z - 3.4, 0.9), from = cam.poseFor(p.x, p.z);
    player.face(land.x, land.z);
    player.busy = true;
    streaks.setActive(false);
    starfall.setSky(true);
    starShow = { phase: 'look', t: 0, land, p: { x: p.x, z: p.z }, fromPos: from.pos, fromLook: from.look, kinds: [], preview };
  }
  function askWish() {
    guide.ask('(별똥별이 쏟아진다…!) 무슨 소원을 빌까?', [...WISHES.map((w) => w.label), '역시 안 빌래'], (i) => {
      const S = starShow, w = WISHES[i];
      if (!S) return;
      if (!w) { S.phase = 'back'; S.t = 0; return; }
      Object.assign(S, { wish: w.id, phase: 'fall', t: 0 });
      sound.play('swing');
      player.act('pray', 2);
      (S.pals || []).forEach((kind) => { const n = npcs.byKind(kind); if (n && kind !== 'usagi') npcs.act(n, 'pray', { face: north(n), time: 90 }); });
      starfall.drop(new THREE.Vector3(S.p.x - 7, 15, S.p.z - 22), S.land.x, S.land.z, starLanded);
      shareStar('drop', S);
    }, meWho());
  }
  /** 같이 놀기(주인): 별똥별맨 연출을 놀러 온 친구들 화면에도('drop' 같은 자리에 떨어진다, 'leave' 날아간다). */
  function shareStar(k, S) {
    if (multi.status !== 'open' || !multi.count) return;
    const a = k === 'drop' ? { t: 'star', k, x: r2(S.land.x), z: r2(S.land.z), fx: r2(S.p.x - 7), fz: r2(S.p.z - 22) } : { t: 'star', k };
    for (const p of multi.players) multi.direct(p.id, a);
  }
  /** 손님: 주인이 소원을 빌어 별똥별이 떨어졌다, 별똥별맨이 날아간다(소원은 주인 것이라 연출만 본다). */
  function takeStar(a) {
    if (starShow) return;
    if (a.k === 'drop') {
      if (![a.x, a.z, a.fx, a.fz].every(Number.isFinite)) return;
      starfall.drop(new THREE.Vector3(a.fx, 15, a.fz), a.x, a.z, () => {
        if (mode !== 'play' || Math.hypot(a.x - player.position.x, a.z - player.position.z) > 20) return;
        sound.play('thud');
        setTimeout(() => sound.play('poof'), 120);
      });
      hud.toast(`${josa(multi.hostName || '친구', '이/가')} 별똥별에 소원을 빌었어요`, 3000);
    } else if (a.k === 'leave' && ['fall', 'rise', 'flail'].includes(starfall.phase)) starfall.leave(() => {});
  }
  /** 쿵! 화면이 흔들리고, 근처 친구들이 달려와 놀란다. 별똥별맨이 다 솟아나면 빤히 쳐다본다. */
  function starLanded() {
    const S = starShow;
    if (!S) return;
    Object.assign(S, { phase: 'landed', t: 0 });
    shakeT = 0.7;
    sound.play('thud');
    setTimeout(() => sound.play('poof'), 120);
    starfall.setSky(false);
    const crater = { x: S.land.x, z: S.land.z }, pals = S.pals || [];
    for (const kind of pals) { const n = npcs.byKind(kind); if (n) npcs.act(n, 'hop', { face: crater, time: 2.5, say: lineOf(kind, 'starShock') }); }
    setTimeout(() => {
      if (starShow !== S) return;
      player.act('pray', 6);
      pals.forEach((kind, i) => {
        const n = npcs.byKind(kind), how = STAR_PALS.find((q) => q[0] === kind)[3];
        if (n) setTimeout(() => { if (starShow === S) npcs.act(n, how, { face: crater, time: 90, say: lineOf(kind, how === 'flail' ? 'starCopy' : 'starPray') }); }, i * 350);
      });
    }, 1000);
    for (const n of npcs.list) {
      if (n.away || !FRIENDS[n.kind] || Math.hypot(n.x - S.land.x, n.z - S.land.z) > 16) continue;
      S.kinds.push(n.kind);
      if (pals.includes(n.kind)) continue;
      const a = Math.atan2(n.x - S.land.x, n.z - S.land.z);
      // 하던 일을 멈추고 그 자리에서 바로 놀란 뒤(말 걸기처럼 끼어든다), 구덩이 옆으로 달려와 본다
      npcs.plan(n, [{ do: 'walk', x: S.land.x + Math.sin(a) * 2.2, z: S.land.z + Math.cos(a) * 2.2, near: 0.6 },
        { do: 'act', anim: STAR_REACT[n.kind] || 'hop', face: { x: S.land.x, z: S.land.z }, time: 6, quick: true }]);
      npcs.talk(n, lineOf(n.kind, 'starShock'));
    }
    setTimeout(() => {
      if (starShow !== S) return;
      guide.say(['(별똥별맨이 갑자기 미친 듯이 발광한다!!)', '(부들부들부들부들…!!)'], () => { sound.play('swing'); starfall.leave(starGone); shareStar('leave'); }, STARMAN);
    }, 2600);
  }
  /** 별똥별맨이 날아갔다: 소원이 시시하게 조금 이루어지고 별 조각이 남는다. */
  function starGone() {
    const S = starShow;
    if (!S) return;
    (S.pals || []).forEach((kind) => { const n = npcs.byKind(kind); if (n) npcs.act(n, 'gaze', { face: north(n), time: 90 }); });
    if (S.preview) { // 미리 보기: 소원은 이뤄지지 않고 오늘 밤 진짜로 빌 기회도 그대로
      sound.play('done');
      guide.say(['(미리 보기라 소원은 이뤄지지 않았다… 별똥별이 쏟아지는 밤에 진짜로 빌어 봐요)'], () => endWish(true), meWho());
      return;
    }
    const r = makeWish(state, S.wish, S.kinds);
    // 연출하는 사이 별똥별 시각(새벽 2시)이 지나 소원이 안 이뤄졌으면 얻은 게 없다고만(별 조각 카드는 띄우지 않는다)
    if (!r.ok) { guide.say(['(…별똥별맨은 아무것도 남기지 않고 가 버렸다)'], () => endWish(true), meWho()); return; }
    commit(r.state);
    sound.play('done');
    const chip = { rich: { icon: ICO.coin, text: `+${WISH_MONEY}원` }, full: { text: `기운 +${WISH_STAMINA}` }, luck: { icon: TICKET_SVG, text: '추첨권 +1' },
      friends: r.gained.length ? { icon: ICO.heart, text: r.gained.map(nameOf).join(', ') } : null }[S.wish];
    S.kinds.forEach((kind, i) => { const n = npcs.byKind(kind); if (n) setTimeout(() => npcs.say(n, lineOf(kind, 'starBye')), 500 + i * 450); });
    // 끝나면 가운데 보상 카드. 별똥별맨은 별똥별 밤마다 또 오니 '이야기 완료'가 아니라 별 조각을 얻은 카드로,
    // 머리핀(별 조각 셋, 포셰트 가게)을 아직 안 만들었으면 몇 개 모았는지도
    const shards = countOf(state, 'starshard'), pin = ACCESSORY_ITEMS.starpin, needPin = !wardrobeOf(state).owned.includes('starpin');
    const chips = [{ icon: itemSvg('starshard'), text: needPin ? `별 조각 ${Math.min(shards, pin.craft.starshard)} / ${pin.craft.starshard}` : `별 조각 ${shards}개` }, ...(chip ? [chip] : [])];
    guide.say([WISH_GAG[S.wish], '(별똥별맨이 반짝이는 조각을 남기고 갔다)'], () => {
      endWish(true);
      sound.play('quest');
      player.cheerTime = 2.4;
      hud.questDone({ title: '별 조각을 얻었어요!', sub: '별똥별이 쏟아지는 밤마다 또 빌 수 있어요', chips, ms: 5600 });
      if (needPin && shards >= pin.craft.starshard) setTimeout(() => hud.toast('포셰트 가게에서 별 조각 머리핀을 만들 수 있어요', 3600, { icon: accessorySvg('starpin') }), 5800);
    }, meWho());
  }
  function endWish(done = false) {
    const S = starShow;
    if (!S) return;
    starShow = null;
    starfall.setSky(false);
    player.busy = false;
    player.act(null, 0);
    (S.pals || []).forEach((kind) => { const n = npcs.byKind(kind); if (n) npcs.plan(n, []); }); // 몸짓을 멈추고 일과로(밤이면 하품하고 집으로)
    cam.snap(done ? { x: S.p.x, z: (S.p.z + S.land.z) / 2 } : S.p); // 따라가기 카메라가 지금 자리에서 부드럽게 이어 간다
  }
  /** 연출 카메라: 올려다보기 → (소원) → 떨어지는 별을 따라 내려와 나와 구덩이가 함께 보이게. */
  function starCamera(dt) {
    const S = starShow;
    S.t += dt;
    const ease = (u) => u * u * (3 - 2 * u), mid = cam.poseFor(S.p.x, (S.p.z + S.land.z) / 2);
    const skyPos = new THREE.Vector3(S.p.x, 1.1, S.p.z + 2.8), skyLook = new THREE.Vector3(S.p.x, 8, S.p.z - 12);
    let pos = mid.pos, look = mid.look;
    if (S.phase === 'look') {
      const e = ease(Math.min(1, S.t / 1.3));
      pos = S.fromPos.clone().lerp(skyPos, e); look = S.fromLook.clone().lerp(skyLook, e);
      if (!S.pals && S.t >= 0.75) gatherPals(S);
      if (S.t >= 1.3) { S.phase = 'wish'; askWish(); }
    } else if (S.phase === 'wish') { pos = skyPos; look = skyLook; }
    else if (S.phase === 'fall') {
      // 별은 점점 빨라지며 떨어지고(카메라보다 늦게 내려온다) 카메라는 먼저 땅을 향하니, 도중에는 시선을 별 쪽으로 당겨 화면 밖으로 안 나가게
      // 별이 높이 있을수록 많이 당기고(땅에 닿는 순간 0), 처음 0.4초는 하늘 보던 시선에서 부드럽게 넘어간다
      const e = ease(Math.min(1, S.t / 1.4)), h = starfall.head;
      const w = starfall.phase === 'fall' ? 0.7 * Math.min(1, Math.max(0, (h.y - 0.75) / 6)) * ease(Math.min(1, S.t / 0.4)) : 0;
      pos = skyPos.clone().lerp(mid.pos, e);
      look = skyLook.clone().lerp(mid.look, e).lerp(h, w);
    }
    else if (S.phase === 'back') {
      const e = ease(Math.min(1, S.t / 0.9));
      pos = skyPos.clone().lerp(S.fromPos, e); look = skyLook.clone().lerp(S.fromLook, e);
      if (S.t >= 0.9) { endWish(false); return; }
    }
    if (shakeT > 0) { shakeT -= dt; const a = 0.24 * (shakeT / 0.7); pos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, 0)); }
    cam.set(pos, look);
  }
  /** 대상의 자리 { x, z, r: 고리 크기, y: 안내 높이, id }. */
  function targetSpot(tg) {
    if (!tg) return null;
    if (tg.type === 'weed') { const big = tg.weed.kind === 'giantweed'; return { x: tg.weed.x, z: tg.weed.z, r: big ? 0.75 : 0.5, y: big ? 2.0 : 1.05, id: 'w' + tg.weed.id }; }
    if (tg.type === 'berry') return { x: tg.bush.x, z: tg.bush.z, r: 0.75, y: 1.3, id: 'b' + tg.bush.x.toFixed(2) };
    if (tg.type === 'glow') return { x: tg.shroom.x, z: tg.shroom.z, r: 0.8, y: 1.55, id: 'g' + tg.shroom.id };
    if (tg.type === 'npc') return { x: tg.npc.x, z: tg.npc.z, r: tg.npc.chibi.radius + 0.25, y: tg.npc.chibi.height + 0.35, id: 'n' + tg.npc.kind, skipLabel: !!tg.npc.bubble };
    if (tg.type === 'friendHome') { const d = friendDoors()[tg.kind]; return { x: d.x, z: d.z, r: 0.6, y: 1.5, id: 'f' + tg.kind }; }
    if (tg.type === 'pickup') return { x: tg.x, z: tg.z, r: 0.42, y: 0.7, id: 'g' + tg.g };
    if (tg.type === 'attack') { const m = tg.monster; return { x: m.x, z: m.z, r: m.M.size + 0.25, y: m.mesh.height + 0.2, id: 'm' + m.id, skipLabel: true, foe: true }; }
    if (tg.type === 'pit') return { x: tg.x, z: tg.z, r: tg.r, y: tg.y, id: 'pit' };
    if (tg.type === 'story') return { x: tg.x, z: tg.z, r: tg.r, y: tg.y, id: 'story' }; // 사이드스토리(토끼굴 들어가기)
    if (tg.type === 'wish') return { x: player.position.x, z: player.position.z, r: 0.7, y: 1.9, id: 'wish' }; // 내 발밑 · 머리 위에
    if (tg.type === 'wakeMp') return { x: tg.x, z: tg.z, r: 0.6, y: 1.1, id: 'mpw' + tg.id }; // 같이 놀기: 쓰러진 친구
    if (tg.type === 'mpTalk') return { x: tg.x, z: tg.z, r: 0.55, y: 1.55, id: 'mpt' + tg.id }; // 같이 놀기: 다른 사람에게 말 걸기
    if (tg.type === 'hostHome') { const s = village.spots.home; return { x: s.x, z: s.z, r: 0.6, y: 1.4, id: 'phostHome' }; }
    if (tg.type === 'fish' || tg.type === 'noRod') return { x: player.position.x, z: player.position.z, r: 0.5, y: 1.45, id: 'fish', noRing: true }; // 낚시: 물가에 서면 내 머리 위에 안내만(물 위 고리는 없다)
    if (tg.type === 'flower') return { x: tg.x, z: tg.z, r: 1.0, y: 0.95, id: 'flw' + tg.i }; // 마을 가꾸기: 광장 꽃밭
    if (tg.type === 'rest') return { x: tg.seat.x, z: tg.seat.z, r: 0.75, y: 1.3, id: 'rest' + tg.seat.x.toFixed(1) + tg.seat.z.toFixed(1) }; // 벤치 · 정자 앉는 자리
    if (tg.type === 'bell') return { x: tg.x, z: tg.z, r: 0.6, y: 1.7, id: 'bell' }; // 시계탑 앞
    const s = village.spots[tg.type];
    return s ? { x: s.x, z: s.z, r: 0.6, y: 1.4, id: 'p' + tg.type } : null;
  }
  function showTargetCue() {
    const sp = targetSpot(target);
    cue.visible = !!sp && !sp.noRing; // 낚시처럼 고리 없이 안내만 띄우는 대상도 있다
    if (!sp) return null;
    const pulse = 1 + 0.07 * Math.sin(t * 6);
    cue.material.color.set(sp.foe ? 0xff6b5b : 0xfcd95b); // 공격할 몬스터는 붉은 고리
    cue.position.set(sp.x, 0.04, sp.z);
    cue.scale.setScalar(sp.r * pulse);
    cue.material.opacity = 0.65 + 0.25 * Math.sin(t * 6);
    if (sp.skipLabel) return null; // 친구가 말하는 중이면 말풍선을 가리지 않게
    return { id: 'prompt:' + sp.id, x: sp.x, y: sp.y, z: sp.z, text: target.label, key: input.mode === 'desk' ? (target.type === 'attack' ? 'Space / 클릭' : 'Space') : null, kind: 'prompt' };
  }

  // ---------- 하늘 ----------
  const skyTop = new THREE.Color(), skyHorizon = new THREE.Color();
  const celTint = new THREE.Color(), CEL_DAY = new THREE.Color('#ffffff'), CEL_NIGHT = new THREE.Color('#9aa6d6');
  function applySky(clock) {
    let h = hourOf(clock);
    if (h < SKY[0].h) h += 24;
    let i = 0;
    while (i < SKY.length - 2 && h > SKY[i + 1].h) i++;
    const a = SKY[i], b = SKY[i + 1], k = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h)));
    skyTop.copy(a.topC).lerp(b.topC, k);
    skyHorizon.copy(a.horC).lerp(b.horC, k);
    const wet = weather.rain; // 비가 오면 하늘은 잿빛, 해와 빛은 어둑하게
    if (wet > 0.001) { skyTop.lerp(RAIN_TOP, wet * 0.85); skyHorizon.lerp(RAIN_HOR, wet * 0.85); }
    gfx.setSky(skyTop, skyHorizon);
    sun.intensity = (a.sun + (b.sun - a.sun) * k) * (1 - 0.65 * wet);
    hemi.intensity = (a.hemi + (b.hemi - a.hemi) * k) * (1 - 0.3 * wet);
    // 캐릭터는 명암 대신 빛 색만 따른다: 밤에는 푸르스름하게(마을보다는 밝게 두어 잘 보이게)
    const day = Math.min(1, Math.max(0, (sun.intensity + hemi.intensity - 0.95) / 2.25));
    // 마을 밖의 밤은 훨씬 어둡다: 울타리에서 멀어질수록 밤의 빛을 더 줄인다(불을 들면 캐릭터는 조금 밝게)
    const night = Math.min(1, Math.max(0, (0.6 - day) / 0.4));
    const p = player && mode !== 'title' ? player.position : { x: 0, z: 0 };
    const out = mode === 'play' ? Math.min(1, Math.max(0, (Math.hypot(p.x, p.z) - VILLAGE_R) / 10)) : 0; // 마을 밖 밤 어둠은 플레이 중에만
    const dim = 1 - 0.8 * night * out;
    sun.intensity *= dim;
    hemi.intensity *= dim;
    nightNow = night;
    const lit = state && lightOf(state) !== 'off' ? 0.3 * night : 0;
    setCelLight(celTint.copy(CEL_NIGHT).lerp(CEL_DAY, Math.min(1, day * dim + lit)));
    village.tintSigns(celTint);
    village.setNight(Math.min(1, Math.max(0, (0.6 - day) / 0.4))); // 해가 지면 가로등과 창문에 불이 들어온다
  }

  // ---------- 시작: 타이틀 → (새 게임이면 캐릭터 만들기) → 입장 연출 → 플레이 ----------
  // mode: 'title'(타이틀·캐릭터 만들기, 카메라가 마을 위를 돈다) | 'intro'(입장 연출) | 'play'
  let mode = 'title';
  let intro = null;
  const setCinematic = (on) => document.body.classList.toggle('cinematic', on);
  setCinematic(true);

  /** 새 캐릭터는 마을 입구에서 걸어 들어오고(입장 연출), 이어하기는 저장된 자리에서 바로 시작한다. */
  function beginSession(next, fresh) {
    lastRegion = null; // 다시 시작해도 구역 알림이 잘못 뜨지 않게
    readySeen.clear(); readyInit = false; // 불러온 저장에 이미 다 모인 부탁은 '다 모았어요!' 를 다시 띄우지 않게
    // 예전 저장에는 시작 날짜가 없다: 지금 날이 오늘이 되도록 거꾸로 맞춘다
    if (!next.startDate) next = { ...next, startDate: todayISO(new Date(Date.now() - (next.clock.day - 1) * 86400000)) };
    // 같이 놀기: 내 마을 코드(친구가 이 코드로 놀러 온다). 처음 한 번 만들어 저장해 두고 계속 쓴다
    if (!isVillageCode(next.villageCode)) next = { ...next, villageCode: newVillageCode() };
    // 예전 저장의 위치가 새 배치에서 건물 · 물 위면 광장으로
    if (!village.isFree(next.player.x, next.player.z, 0.35)) next = { ...next, player: { ...village.spots.plaza } };
    state = next;
    knownDay = state.clock.day; // 저장된 날까지는 처리가 끝났다
    const chibi = buildChibi(myLook());
    if (!player) {
      player = createPlayer(scene, chibi, village);
      intro = createIntro(ui, { player, cam, npcs, village, sound, guide, me: () => meWho() });
    } else player.setModel(chibi);
    // 이어하기: 입장 연출 없이 지난번에 있던 자리에서 바로 시작한다(처음 만든 캐릭터만 마을 입구로 걸어 들어온다)
    if (!fresh) {
      player.walkTo = null;
      player.setPosition(state.player.x, state.player.z);
      cam.snap(player.position);
      mode = 'play';
      setCinematic(false);
      input.setEnabled(true);
      hud.toast(`다시 왔네요, ${state.profile.name}!`, 2600);
      if (tutorialActive(state.tutorial)) enterTutorial(state.tutorial, null);
      return;
    }
    mode = 'intro';
    input.setEnabled(false);
    setCinematic(true);
    intro.start(() => {
      mode = 'play';
      setCinematic(false);
      input.setEnabled(true);
      save();
      if (!fresh) hud.toast(`다시 왔네요, ${state.profile.name}!`, 2600);
      // 안내가 남아 있으면(새 게임이거나 안내 도중에 껐다 켰으면) 하치와레가 이어서 알려 준다
      if (tutorialActive(state.tutorial)) enterTutorial(state.tutorial, null);
    }, fresh);
  }

  function startCreator() {
    mode = 'title';
    setCinematic(true);
    input.setEnabled(false);
    openCreator(ui, (profile) => beginSession(createState(profile), true));
  }

  function openTitle() {
    const loaded = store.load();
    if (!loaded.ok && (loaded.reason === 'corrupt' || loaded.reason === 'version')) {
      store.backup();
      setTimeout(() => hud.toast('저장 데이터를 읽을 수 없어 새로 시작해요', 4000), 300);
    }
    showTitle(ui, loaded.ok ? loaded.state : null).then((choice) => {
      sound.startMusic(); // 타이틀에서 고른 순간(첫 누름 뒤)부터 배경음악
      if (choice === 'continue') {
        try { beginSession(loaded.state, false); } catch (e) {
          console.error(e);
          store.backup();
          hud.toast('저장 데이터를 읽을 수 없어 새로 시작해요', 4000);
          startCreator();
        }
      } else {
        if (loaded.ok) store.clear();
        startCreator();
      }
    });
  }
  openTitle();
  if (!store.available) setTimeout(() => hud.toast('이 브라우저는 저장이 안 돼요', 5000), 600);
  // 창을 닫거나 다른 앱으로 갈 때도 저장한다
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  window.addEventListener('pagehide', save);
  const signLabels = village.labels.map((l, i) => ({ id: 'sign-' + i, ...l, key: l.text, html: signHtml(l.text), kind: 'sign' }));
  // 별 세 개 레스토랑 간판(가게가 보이는 동안만 — 이야기를 받은 동안)
  const dinerSign = { id: 'sign-diner', ...dinerFront.sign, text: '별 세 개', key: '별 세 개', html: signHtml('별 세 개'), kind: 'sign' };
  const SIGN_SEE = 34, SIGN_CLEAR = 16; // 간판은 이만큼 안에서만, 가까운 것(SIGN_CLEAR 안)만 또렷하게 · 먼 것은 작고 흐리게
  const homeSign = signLabels.find((l) => l.text === '내 집'); // 사기 전에는 '빌린 집'

  // ---------- 루프 ----------
  let last = performance.now(), t = 0, crashed = false;
  const titlePos = new THREE.Vector3(), titleLook = new THREE.Vector3(0, 0, 1);
  function frame(now) {
    requestAnimationFrame(frame);
    // 절전: 초당 30번만 돌고 그린다(휴대폰 발열). 다만 풀 뽑기 게이지 · 우사기 클럽 박자처럼 순간을 재는 동안은 화면 새로 고침마다 돈다
    // (30번이면 기운이 낮을 때 좁은 초록 칸을 게이지가 건너뛰어 '깔끔하게'가 안 나오고, 북 · 하이햇 소리가 박자마다 들쭉날쭉했다)
    if (!perf.due(now) && !pulling && !(usagiClub && usagiClub.active) && !(islandTrip && islandTrip.inIsland) && !(idolStory && idolStory.onStage) && !(starDiner && starDiner.onStage) && !(blackStar && blackStar.onStage) && !(bonbonStory && bonbonStory.onStage) && !(switchStory && switchStory.onStage)) return;
    // 0 아래로도 막는다: 첫 프레임의 시각(now)이 마을을 다 짓기 전에 잰 last 보다 앞설 수 있어 dt 가 음수가 되면
    // 솟아나는 중이던 몬스터의 크기가 음수(뒤집혀 땅속)로 굳어 분홍 실루엣만 보였다
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    gfx.adapt(now - last, perf.frameMs); // 버벅이면 해상도를 낮춘다
    last = now;
    if (pauseLoop) return; // 디버그: 화면을 멈춰 두고 연출을 찍을 때
    drawNow = perf.drawDue(dt, covered()); // 창이 화면을 덮고 있으면 뒤 3D 는 초당 30번만(render/perf.js 의 COVERED_FPS)
    try {
      tick(dt);
    } catch (e) {
      // 한 프레임의 오류로 화면 전체가 멈추지 않게 한다
      if (!crashed) { crashed = true; console.error(e); hud.toast('문제가 생겨서 새로고침이 필요해요', 5000); }
    }
  }

  let skipRender = false, holdRender = false, pauseLoop = false; // 디버그 step 중에는 그리지 않는다
  // 로컬 확인용: 주소에 ?debug 가 있을 때만 시간을 직접 흘리는 훅을 연다
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
    window.__town = {
      // 시간을 흘린다. 그리기는 마지막 한 번만(느린 확인 환경에서도 빨리 돌게)
      step(seconds, dt = 1 / 30) { skipRender = true; try { for (let s = 0; s < seconds; s += dt) tick(dt); } finally { skipRender = holdRender; } },
      // 3D 그리기를 멈춰 둔다(느린 확인 환경에서 화면 글자 · 창만 빨리 찍을 때)
      hold(on) { holdRender = skipRender = !!on; },
      pause(on) { pauseLoop = !!on; },
      hud,
      panels, // 창을 바로 열어 보기(휴대폰 화면 확인용)
      get state() { return state; },
      get target() { return target && { type: target.type, label: target.label }; },
      player: () => player && { ...player.position },
      teleport(x, z) { player.setPosition(x, z); cam.snap(player.position); },
      // 지금 장면을 한 번 그린다(느린 확인 환경에서 찍기 직전에)
      draw() { const keep = skipRender; skipRender = false; drawNow = true; try { tick(1e-4); } finally { skipRender = keep; } },
      weeds: () => weeds.list.map((w) => ({ kind: w.kind, area: w.area, x: w.x, z: w.z, stage: w.stage, hidden: !!w.hidden, visible: w.mesh.visible })),
      weedCounts: () => weeds.counts(),
      camPos: () => cam.camera.position.toArray(),
      // 월드 점 → 화면 좌표(클릭 확인용)
      project: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam.camera), r = canvas.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }; },
      pull: () => pulling && { kind: pulling.weed.kind, power: pulling.pull.power, from: pulling.pull.greenFrom, to: pulling.pull.greenTo, label: pulling.label },
      npcWork: (kind, typeId) => npcWork(npcs.byKind(kind), typeId),
      announce: (events) => announce(events),
      licenseCard: (id) => showLicenseCard(id, '자격증 카드 확인'), // 합격 카드를 바로 띄워 보기
      party: (kind) => startParty(npcs.byKind(kind)), // 같이 토벌을 바로 시작(대화 없이)
      ally: (kind) => ({ hp: allyHp[kind], down: !!(npcs.byKind(kind) || {}).down }),
      monsterHp: (id, hp) => { const m = monsters.list.find((o) => o.id === id); if (m) m.hp = hp; },
      npcEat: (kind) => npcEat(npcs.byKind(kind)),
      npcHunt: (kind, typeId) => npcHunt(npcs.byKind(kind), typeId),
      npcExam: (kind) => npcExam(npcs.byKind(kind)),
      npcs: () => npcs.list.map((n) => ({ kind: n.kind, x: n.x, z: n.z, r: n.chibi.radius, state: n.state, task: n.task && (n.task.anim || n.task.type),
        prop: n.prop, plan: n.plan ? n.plan.map((s) => s.do) : null, stuck: n.stuck || 0, path: n.path ? n.path.length : null, party: !!n.party, bubble: n.bubble && n.bubble.text })),
      npc: (kind) => npcs.byKind(kind), // 친구 하나를 직접 들여다보기
      talk: (kind) => talkTo(npcs.byKind(kind)), // 그 친구에게 바로 말 걸기(고를 거리 확인용)
      faint: () => startFaint(), // 바로 기절(깨어나는 곳 · 흐른 시간 확인용)
      bossMusic: () => sound.bossOn, // 지금 보스전 곡인지
      // 똑똑한 친구들 확인용: 마음 · 하는 일 · 소식 · 공연
      life: () => ({
        minds: Object.fromEntries(Object.entries(minds).map(([k, m]) => [k, { fun: +m.fun.toFixed(2), social: +m.social.toFixed(2), doing: m.doing && m.doing.text, mem: m.mem.length }])),
        news: villageNews.map((e) => `${Math.floor(e.hour)}시 ${e.text}`), show: show && { by: show.by, audience: [...show.audience], meT: show.meT }
      }),
      lifeDo: (kind, act, mate) => { const n = npcs.byKind(kind); if (act === 'chat') npcChat(n, npcs.byKind(mate)); else if (act === 'meal') npcMealWith(n, npcs.byKind(mate)); else if (act === 'show') npcShow(n); else if (act === 'greet') npcGreet(n); else if (act === 'train') npcTrain(n, npcs.byKind(mate)); else if (act === 'hobby') npcHobby(n, hourOf(state.clock)); },
      happen: (ev) => happen(ev),
      spots: village.spots,
      homes: () => friendDoors(),
      visitRoom: (kind) => enterVisit(kind),
      homeAct: (kind) => doHomeAct(kind),
      drill: () => drill && { k: drillK(), hits: drill.hits, tries: drill.tries },
      homeStand: (x, z) => interior.standAt(x, z),
      homeTarget: () => homeTarget && homeTarget.type,
      leaveRoom: () => exitVisit(),
      free: (x, z, r) => village.isFree(x, z, r),
      path: (x0, z0, x1, z1) => village.findPath({ x: x0, z: z0 }, { x: x1, z: z1 }), // 친구 길찾기 확인용
      solids: () => village.obstacles.list.filter((o) => !o.soft).map((o) => ({ x: o.x, z: o.z, r: o.r, box: o.box ? { hx: o.box.hx, hz: o.box.hz } : null })),
      patch: (p) => { state = { ...state, ...p }; if (p.tutorial) { guide.setGoal(null); npcs.setFollow('hachiware', tutorialActive(p.tutorial)); } },
      berries: () => berries.list.map((b) => ({ x: b.x, z: b.z, ready: b.ready })),
      cellAt: (fx, fy) => interior.cellAt(fx * 2 - 1, -(fy * 2 - 1)),
      mode: () => mode,
      // 같이 놀기 확인용: 연결 상태와 놀러 간 마을에서 받은 것
      mp: () => ({ status: multi.status, role: multi.role, players: multi.players.map((p) => p.name), visiting: visiting && { code: visiting.code, npcs: visiting.npcs.length, weeds: visiting.weeds ? visiting.weeds.length : null, clock: visiting.clock, arriving: visiting.arriving } }),
      remotes: () => remotes, // 같이 놀기 확인용: 다른 사람 캐릭터(든 것 · 등불 · 모습)
      story: () => (usagiClub ? usagiClub.phase : null),
      staged: () => [...staged],
      burrows: () => burrows.spots,
      club: () => ({ phase: club.phase, hype: club.hype, rhythm: rhythm.active, guide: guide.open }),
      idol: () => ({ phase: idolStory.phase, round: idolStory.round, rhythm: rhythm.active, guide: guide.open, fans: idolStage ? idolStage.fans : 0, mode }),
      idolPlay: () => { if (!idolStory.active) idolStory.play(() => hud.toast('테스트: 공연 끝', 2400)); },
      /** 무대 카메라(디버그: zoom 을 올려 아이돌 얼굴을 가까이 본다). */
      idolCam: () => (idolStage ? idolStage.camera : null),
      /** 새 버전 확인을 바로 한 번(디버그: version.json 이 바뀌었으면 알림 띠). */
      checkUpdate: () => updateCheck.check(),
      /** 별 세 개 레스토랑을 바로(보상 없음): 헤드리스 시험용. */
      dinerPlay: () => { if (!starDiner.active) starDiner.play(() => hud.toast('테스트: 레스토랑 끝', 2400)); },
      bonbonPlay: () => { if (!bonbonStory.active) bonbonStory.play(() => hud.toast('테스트: 위스키 봉봉 끝', 2400)); },
      beetleSwitch: (at) => devBeetleSwitch(at), // 스위치: 'open' · 'teeth' · 'finale' · 'show' · 'showEnd'(테스트 앱과 같다)
      beetle: () => ({ phase: switchStory.phase, mode, step: beetleStep(), buddy: beetleBuddy.on, mood: switchStage ? switchStage.mood : null }),
      bonbon: () => ({ phase: bonbonStory.phase, mode, swallowed: bonbonGlade ? bonbonGlade.swallowed : null, drunk: bonbonGlade ? bonbonGlade.drunkLevel : null }),
      camera: () => ({ phase: cameraStory.phase, shooting: photoUi.shooting, mode }), // 하치와레의 카메라 진행(뷰파인더가 셔터를 기다리는지)
      /** 검은 별똥별 장면 하나를 바로(보상 없음): 'blackWish' · 'blackMorning' · 'blackDejavu' · 'blackWatch' · 'blackSleepover' · 'blackSoak' · 'blackRain'. */
      blackPlay: (scene) => { if (!blackStar.active) blackStar.play(scene, () => hud.toast('테스트: 장면 끝', 2000)); },
      black: () => ({ loop: loopOf(state), free: state && state.story ? state.story.blackFree : null, quest: state && state.quests ? state.quests.blackStar : null, phase: blackStar.active, mode, clock: state && state.clock }),
      diner: () => ({ phase: starDiner.phase, mode, rescue: starDiner.rescue && { phase: starDiner.rescue.phase, free: starDiner.rescue.clamps.filter((c) => c.free).length, caught: starDiner.rescue.caught }, front: dinerFront.visible, spot: dinerFront.spot }),
      island: () => ({ phase: islandTrip.phase, rhythm: rhythm.active, mini: minigame.active, guide: guide.open, siren: isle.sirenState, roam: islandTrip.roamInfo() }),
      /** 수상한 섬을 그 장면부터(보상 없음): 헤드리스 시험용. */
      islandPlay: (from) => { if (!islandTrip.active) islandTrip.play({ from, done: () => hud.toast('테스트: 섬 끝', 2400) }); },
      pit: () => ({ spot: pit.spot, front: pit.front, phase: hachiPit.phase, open: pit.open }),
      action: (down) => input.setAction(down),
      /** 하늘색 자동차 타기 · 내리기(가지고 있어야 탄다) → 지금 탔는지. */
      drive: (on) => { if (on && !player.riding) toggleCar(false); else if (!on && player.riding) getOffCar(); return player.riding; },
      drawCalls: () => gfx.renderer.info.render.calls,
      /** 렌더 통계(최적화 확인용): 그리기 호출 · 삼각형 · 기하 · 텍스처 · 셰이더 수. */
      renderInfo: () => { const I = gfx.renderer.info; return { calls: I.render.calls, triangles: I.render.triangles, geometries: I.memory.geometries, textures: I.memory.textures, programs: I.programs ? I.programs.length : 0 }; },
      scene: () => scene, // 그리기 호출을 무엇이 쓰는지 들여다보기
      region: () => player && regionAt(player.position.x, player.position.z),
      // 토벌(4단계) 확인용
      // 친구 마을에 놀러 가 있으면 그 마을 몬스터
      monsters: () => monsters.active().map((m) => ({ id: m.id, species: m.species, x: +m.x.toFixed(2), z: +m.z.toFixed(2), hp: m.hp, state: m.state, atk: m.atk && m.atk.kind, under: m.under, air: +(m.airY || 0).toFixed(2), dead: m.dead, visible: m.mesh.root.visible })),
      clearMonsters: () => monsters.clear(() => true),
      faceMonsters: () => monsters.list.forEach((m) => { m.yaw = 0; m.mesh.root.rotation.y = 0; }),
      monsterShots: () => monsters.shots(),
      monsterCounts: () => monsters.counts(),
      spawnMonster: (species, dx = 0, dz = 2) => { const m = monsters.spawnAt(species, player.position.x + dx, player.position.z + dz); m.home = { x: m.x, z: m.z }; return m.id; },
      /** 황금 대장처럼 새 공격을 섞어 쓰는 몬스터를 내 옆에(디버그: 금관 · 체력 배율은 없이 공격만). */
      spawnElite: (species, dx = 0, dz = 3) => { const m = monsters.spawnAt(species, player.position.x + dx, player.position.z + dz, { bounty: true }); m.home = { x: m.x, z: m.z }; return m.id; },
      swing: () => doSwing(),
      exam: () => hunterExam && { t: hunterExam.t, left: hunterExam.left },
      iframe: () => iframe,
      combat: () => ({ swingCool, swingHit, swinging: player.swinging, k: player.swingK, mode, fainting }),
      quests: () => ({ quests: state.quests, track: pickTrack(state), story: state.story, boss: bossM && { x: bossM.x, z: bossM.z, hp: bossM.hp, dormant: !!bossM.dormant, state: bossM.state } }),
      lair: () => lairSpot,
      marks: () => npcs.list.map((m) => [m.kind, markOf(state, m.kind)]).filter((x) => x[1]),
      flags: () => ({ pulling: !!pulling, panel: panels.isOpen(), guide: guide.open, sleeping, sticker: !!sticker, talking: !!talking, tag: !!tag, dance: !!dance, overlay, fainting, weapon: weaponNow() })
    };
  }

  // ---------- 보스전 배경음악: 깨어난 보스가 나를 알아챘거나 맞았고 가까이 있으면 웅장한 곡으로(audio/sound.js 의 bossMusic) ----------
  let bossBgmHold = 0; // 보스가 곁에 있다가 사라진 뒤 남은 초(대왕 두더지가 땅속에 숨어 잠깐 안 보여도 곡이 끊기지 않게)
  function updateBossMusic(dt) {
    const p = player && player.position;
    const fighting = mode === 'play' && !fainting && p && monsters.nearest(p.x, p.z, sound.bossOn ? 26 : 15, (m) => m.M.boss && (m.engaged || m.hp < m.M.hp));
    bossBgmHold = fighting ? 4 : Math.max(0, bossBgmHold - dt);
    sound.bossMusic(bossBgmHold > 0);
  }
  /** 보스전 곡을 바로 끊는다(기절 · 보스를 쓰러뜨림 · 타이틀로): 남은 몇 초를 기다리지 않는다. */
  function cutBossMusic() {
    bossBgmHold = 0;
    sound.bossMusic(false, true);
  }

  /** 시간이 흘러 날이 바뀌었으면(밤새 깨어 있다가 06:00 이 지나면) 집세 · 청약을 처리한다. 자는 중에는 doSleep 이 처리한다. */
  function newDayCheck() {
    if (sleeping || state.clock.day <= knownDay) return;
    const r = rollDays(state);
    commit(r.state);
    announce(r.events);
  }

  function tick(dt) {
    t += dt;
    if (state && player) netTick(dt); // 같이 놀기: 집 안 · 장면 중에도 보낸다('away' 면 친구 화면에서 숨는다)
    if (state) updateBossMusic(dt);
    const aspect = gfx.resize();
    if (drumSpin > 0 && village.raffleDrum) { drumSpin -= dt; village.raffleDrum.rotation.x -= dt * 10 * Math.min(1, drumSpin * 1.5); } // 경품 추첨 가라가라
    // 집 안: 마을 대신 집 안 장면을 그린다(시간은 흐르고, 마을 친구들도 계속 지낸다)
    if (mode === 'visit' && state) {
      if (!sleeping) state = { ...state, clock: advance(state.clock, dt) };
      loopTick(); // 검은 별똥별: 밤 12시가 지나면 같은 날 아침으로
      newDayCheck();
      villageLife(dt);
      weeds.update(dt, { night: nightNow, focus: player.position });
      berries.update(dt);
      npcs.update(dt, t, player.position);
      guestMonsters(dt); // 같이 놀기: 바깥에서 토벌 중인 손님이 있으면 몬스터는 계속 움직인다
      rooms.resize(aspect);
      const free = !panels.isOpen() && !sleeping && !overlay && !guide.open;
      if (free) rooms.walk(dt, input.vector());
      homeTarget = free ? rooms.target() : null;
      rooms.setCue(homeTarget, t);
      if (drill) {
        drill.t += dt;
        drill.cool = Math.max(0, drill.cool - dt);
        hud.showMeter(drillK(), DRILL.zone, [{ icon: ICO.check, text: `${drill.hits}/${DRILL.need}` }, `${DRILL.tries - drill.tries}번 남음`]);
        hud.setAction('치기!');
      } else hud.setAction(homeTarget ? homeTarget.label : null);
      rooms.update(dt, t, !!talking);
      beetleFollow(dt, t, rooms.scene, rooms.playerPos, false, (x, z) => rooms.free(x, z)); // 스위치 풍뎅이도 친구 방까지 따라 들어와 가구를 돌아서 온다
      setCelLight(INDOOR_LIGHT);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(rooms.scene, rooms.camera);
      // 놀이 자리 표시(오늘 아직 안 했으면 ✨), 가까이 가면 행동 안내
      const act = rooms.actSpot(), vLabels = [];
      if (act && !drill && (!homeTarget || homeTarget.type !== 'act') && (visit.kind === 'momonga' || !doneToday(visit.kind))) vLabels.push({ id: 'vact', x: act.x, y: 1.9, z: act.z, text: '✨ ' + act.label, kind: 'mark' });
      if (homeTarget) vLabels.push({ id: 'prompt:v' + homeTarget.type, x: homeTarget.x, y: homeTarget.y, z: homeTarget.z, text: homeTarget.label, key: input.mode === 'desk' ? 'Space' : null, kind: 'prompt' });
      hud.placeLabels(vLabels, rooms.camera);
      saveTimer += dt;
      if (saveTimer > 10) { saveTimer = 0; save(); }
      return;
    }
    // 우사기 클럽(사이드스토리): 마을 대신 클럽 장면을 그린다(시간은 흐르고, 마을 친구들도 계속 지낸다)
    if (mode === 'club' && state) {
      state = { ...state, clock: advance(state.clock, dt) };
      newDayCheck();
      villageLife(dt);
      npcs.update(dt, t, player.position);
      club.resize(aspect);
      usagiClub.tickClub(dt);
      setCelLight(club.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(club.scene, club.camera);
      hud.placeLabels([], club.camera);
      return;
    }
    // 파자마 파티즈 무대(사이드스토리): 진짜 마을 광장에 세운 무대. 공연 동안 마을 시계 · 친구들은 멈춰 있다(밤 12시를 넘겨도 공연은 끝까지)
    if (mode === 'idol' && state) {
      idolStage.resize(aspect);
      idolStory.tick(dt, t);
      // 마을의 반투명 처리 · 가까운 구역 · 그림자는 관객석 기준으로(무대 · 관객을 가리는 것만 비친다)
      const seat = idolStage.focus;
      village.update(dt, seat, idolStage.audience);
      works.update(dt, state.clock, seat);
      homeExt.update(dt, seat);
      gfx.followSun(seat.x, seat.z);
      setCelLight(idolStage.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) {
        // 마을을 무대 카메라로 먼저 그리고 그 위에 무대를 겹친다(깊이를 같이 써서 앞뒤가 맞는다). 마을을 걷던 나 · 친구들 · 같이 노는 친구는 무대 쪽에 따로 있어 그동안 숨긴다
        const hide = [player.root, ...npcs.list.map((n) => n.chibi.root), ...remotes.roots()].filter((o) => o.visible);
        hide.forEach((o) => { o.visible = false; });
        try { gfx.render(idolStage.camera); } finally { hide.forEach((o) => { o.visible = true; }); }
        gfx.renderer.autoClear = false;
        try { gfx.renderer.render(idolStage.scene, idolStage.camera); } finally { gfx.renderer.autoClear = true; }
      }
      hud.placeLabels(idolStory.labels(), idolStage.camera);
      return;
    }
    // 수상한 섬(사이드스토리): 섬 장면을 그린다. 섬에 있는 동안 마을 시계 · 친구들은 멈춰 있다(마지막 밤에 진짜로 잔다)
    if (mode === 'island' && state) {
      isle.resize(aspect);
      islandTrip.tick(dt, t);
      setCelLight(isle.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(isle.scene, isle.camera);
      hud.placeLabels(islandTrip.labels(), isle.camera);
      return;
    }
    // 별 세 개 레스토랑(사이드스토리): 가게 안 장면. 구출하는 동안 마을 시계 · 친구들은 멈춰 있다
    // 검은 별똥별(사이드스토리): 치이카와네 방. 방에 있는 동안 마을 시계 · 친구들은 멈춰 있다
    if (mode === 'chiiroom' && state) {
      chiiRoom.resize(aspect);
      blackStar.tick(dt, t);
      setCelLight(chiiRoom.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(chiiRoom.scene, chiiRoom.camera);
      hud.placeLabels([], chiiRoom.camera);
      return;
    }
    // 위스키 봉봉(사이드스토리): 숲속 빈터. 장면을 보는 동안 마을 시계 · 친구들은 멈춰 있다
    if (mode === 'bonbon' && state) {
      bonbonGlade.resize(aspect);
      bonbonStory.tick(dt, t);
      setCelLight(bonbonGlade.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(bonbonGlade.scene, bonbonGlade.camera);
      hud.placeLabels([], bonbonGlade.camera);
      return;
    }
    // 스위치(사이드스토리): 바위산 기슭. 장면을 보는 동안 마을 시계 · 친구들은 멈춰 있다
    if (mode === 'beetle' && state) {
      switchStage.resize(aspect);
      switchStory.tick(dt, t);
      setCelLight(switchStage.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(switchStage.scene, switchStage.camera);
      hud.placeLabels([], switchStage.camera);
      return;
    }
    if (mode === 'diner' && state) {
      dinerStage.resize(aspect);
      starDiner.tick(dt, t);
      setCelLight(dinerStage.light);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(dinerStage.scene, dinerStage.camera);
      hud.placeLabels([], dinerStage.camera);
      return;
    }
    if (mode === 'home' && state) {
      if (!sleeping) state = { ...state, clock: advance(state.clock, dt) };
      loopTick(); // 검은 별똥별: 밤 12시가 지나면 같은 날 아침으로
      newDayCheck();
      villageLife(dt);
      weeds.update(dt, { night: nightNow, focus: player.position });
      berries.update(dt);
      npcs.update(dt, t, player.position);
      guestMonsters(dt);
      interior.resize(aspect);
      // 집 안을 걷는다(꾸미기 · 창 · 잠자기 중에는 멈춘다). 침대 · 옷장 · 문 앞이면 행동 안내
      const free = !homeUI.decorating && !panels.isOpen() && !sleeping && !overlay && !guide.open;
      if (free) interior.walk(dt, input.vector(), homeOf(state));
      homeTarget = free ? interior.target(homeOf(state)) : null;
      interior.setCue(homeTarget, t);
      hud.setAction(homeTarget ? homeTarget.label : null);
      interior.update(dt, t);
      beetleFollow(dt, t, interior.scene, interior.playerPos, false, (x, z) => interior.free(homeOf(state), x, z)); // 스위치 풍뎅이도 집 안까지 따라 들어와 가구를 돌아서 온다
      homeRemotes.update(dt, true); // 같이 놀기: 내 집에 구경 온 친구
      setCelLight(INDOOR_LIGHT);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(interior.scene, interior.camera);
      const hLabels = homeRemotes.labels();
      if (homeTarget) hLabels.push({ id: 'prompt:h' + homeTarget.type, x: homeTarget.x, y: homeTarget.type === 'wardrobe' ? 2.3 : 1.2, z: homeTarget.z, text: homeTarget.label, key: input.mode === 'desk' ? 'Space' : null, kind: 'prompt' });
      hud.placeLabels(hLabels, interior.camera);
      saveTimer += dt;
      if (saveTimer > 10) { saveTimer = 0; save(); }
      return;
    }
    // 같이 놀기: 친구 집 구경(주인이 보낸 가구 배치). 둘러보고 나가기만 하고, 내 시간은 멈춰 있다
    if (mode === 'guesthome' && state) {
      if (!visiting || !visiting.house) { exitHostHome(); return; }
      panels.tick(viewState());
      interior.resize(aspect);
      const free = !panels.isOpen() && !overlay && !guide.open;
      if (free) interior.walk(dt, input.vector(), visiting.house);
      homeTarget = free ? interior.target(visiting.house, { guest: true }) : null;
      interior.setCue(homeTarget, t);
      hud.setAction(homeTarget ? homeTarget.label : null);
      hud.render(viewState());
      interior.update(dt, t);
      homeRemotes.update(dt, true); // 집 안에 같이 있는 주인 · 다른 손님
      setCelLight(INDOOR_LIGHT);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender && drawNow) gfx.renderer.render(interior.scene, interior.camera);
      const gLabels = homeRemotes.labels();
      if (homeTarget) gLabels.push({ id: 'prompt:gh', x: homeTarget.x, y: 1.2, z: homeTarget.z, text: homeTarget.label, key: input.mode === 'desk' ? 'Space' : null, kind: 'prompt' });
      if (mySay && performance.now() < mySay.until) { const q = interior.playerPos; gLabels.push({ id: 'mp-me', x: q.x, y: 1.75, z: q.z, text: mySay.text, kind: 'bubble' }); }
      hud.placeLabels(gLabels, interior.camera);
      return;
    }
    cam.setAspect(aspect);
    // 내 둘레(18칸) 몬스터 앞을 가리는 나무도 반투명하게(위에서 내려다보는 화면이라 우듬지에 통째로 가려진다)
    const nearMonsters = player ? monsters.active().filter((m) => !m.dead && !m.under && m.mesh.root.visible && Math.hypot(m.x - player.position.x, m.z - player.position.z) < MONSTER_SEE).map((m) => ({ x: m.x, z: m.z })) : [];
    village.update(dt, player ? player.position : null, nearMonsters);
    weeds.update(dt, { night: nightNow, focus: player && mode !== 'title' ? player.position : village.spots.plaza });
    berries.update(dt);
    // 빛나는 버섯: 밤이면 숨 쉬듯 빛나고 갓 위에 반짝 털뭉치(이번 밤에 뗀 것 빼고). 친구 마을에서는 털뭉치가 그 마을 주인 몫이라 안 보인다
    glows.update(dt, { night: nightNow, focus: player && mode !== 'title' ? player.position : village.spots.plaza, picked: state ? pickedTonight(state) : [], guest: !!visiting });
    // 별 세 개 레스토랑 가게: 이야기를 받은 동안만 들판 길가에 있다(친구 마을에서는 안 보인다)
    dinerFront.visible = !!state && !visiting && isActive(state, 'starDiner');
    // 위스키 봉봉 초콜릿 덩굴: 이야기를 받은 동안만 서쪽 숲길 옆에 있다
    bonbonFront.visible = !!state && !visiting && isActive(state, 'whiskeyBonbon');
    bonbonFront.update(dt, t);
    // 스위치 동굴: 바위산 북쪽 끝 절벽에 늘 있다. 창살은 이야기 속에서 연 뒤로(이야기를 끝낸 뒤에도) 열린 채. 그사이 풍뎅이가 나를 따라다닌다
    const bstep = visiting ? -1 : beetleStep();
    switchFront.setOpen(!visiting && !!state && (bstep >= 1 || isDone(state, 'beetleSwitch')));
    beetleFollow(dt, t, scene, player ? player.position : null, mode !== 'play');
    const usagiNpc = npcs.byKind('usagi');
    if (usagiNpc) holdSwitch(usagiNpc.chibi, villageSwitch, bstep === 0); // 동굴에 가기 전: 우사기가 주운 스위치를 손에 들고 다닌다
    // 마을 가꾸기 시설: 내 마을은 내 모금대로, 친구 마을에서는 주인이 보낸 모습대로(들어가는 커튼 뒤에서 바꾼다)
    const worksGuest = visiting && !visiting.arriving;
    works.show(!state ? {} : worksGuest ? visiting.works || {} : worksView(state));
    works.update(dt, worksGuest ? visiting.clock : state && state.clock, player ? player.position : null);
    // 내 집 바깥(world/homeext.js): 넓힌 만큼 아담한 집 · 저택으로, 친구 마을에서는 주인 집 크기대로. 이름표도 그 집 앞면으로
    const homeSize = !state ? 0 : worksGuest ? (visiting.house ? visiting.house.size : 0) : sizeOf(homeOf(state));
    if (homeExt.show(homeSize) && homeSign) Object.assign(homeSign, homeExt.signAt());
    homeExt.update(dt, player ? player.position : null);

    const focus = player && mode !== 'title' ? player.position : village.spots.plaza;
    // 몬스터: 돌아다니는 중에만 나를 노린다(창 · 대화 · 잠 · 기절 · 쓰러짐 중에는 멈칫). 내 마을에 놀러 온 친구도 노린다
    const hunting = mode === 'play' && !!state && !visiting && !panels.isOpen() && !guide.open && !sleeping && !funBusy() && !fainting && !downed && !sticker;
    if (visiting && !visiting.arriving) {
      // 친구 마을: 몬스터는 주인 쪽에서 움직이고, 나는 받은 모습을 따라 그린다(공격 예고 소리만 가까우면)
      monsters.guestStep(dt, t, { onWind: (m) => { if (Math.hypot(m.x - focus.x, m.z - focus.z) < 11) sound.play('warn'); } });
    } else {
      monsters.update(dt, t, {
        player: focus, active: hunting, night: nightNow, onHit: onMonsterHit, onAggro, allies: [...(hunting ? partyAllies() : []), ...(state && !visiting ? guestAllies() : [])], onAllyHit,
        // 공격 예고 · 땅 울림 소리(가까이 있을 때만)
        onWind: (m) => { if (Math.hypot(m.x - focus.x, m.z - focus.z) < 11) sound.play('warn'); },
        onImpact: (m, x, z) => { if (Math.hypot(x - focus.x, z - focus.z) < 12) sound.play('thud'); },
        onRage: (m, r) => { sound.play('thud'); hud.toast(m.species === 'kingcap' && r >= 2 ? '왕버섯이 포자를 마구 뿜으며 날뛰어요!' : `${josa(m.M.short || m.M.name, '이/가')} ${r >= 2 ? '잔뜩 ' : ''}화났어요!`, 2600, { icon: monsterSvg(m.species) }); } // 무슨 공격을 새로 쓰는지는 알려 주지 않는다(직접 겪어 보며 알아 가게)
      });
    }
    if (state) ground.sync(visiting ? visiting.ground || [] : groundOf(state), groundKind); // 친구 마을에서는 그 마을 바닥 물건
    ground.update(dt, focus);
    if (state && player && mode === 'intro') {
      player.update(dt, input);
      intro.update(dt);
    } else if (state && player && mode === 'play' && visiting) {
      guestTick(dt); // 친구 마을에 놀러 간 중
    } else if (state && player && mode === 'play') {
      if (!sleeping) state = { ...state, clock: advance(state.clock, dt) }; // 창(노동 접수 · 가게 · 마을폰 …)을 보는 동안에도 시간은 흐른다
      loopTick(); // 검은 별똥별: 밤 12시가 지나면 같은 날 아침으로
      panels.tick(state);
      newDayCheck();
      player.update(dt, input);
      updateCombat(dt);
      updateQuests(dt);
      usagiClub.update(dt);
      shisaStory.update(dt);
      hachiPit.update(dt);
      pajama.update(dt);
      cameraStory.update(dt);
      idolStory.update(dt);
      starDiner.update(dt, t);
      bonbonStory.update(dt);
      switchStory.update(dt);
      islandTrip.update(dt);
      updateCryFx(dt);
      if (pulling) updatePull(dt);
      if (fishing) updateFish(dt);
      updateCatchFx(dt);
      updateRest(dt); // 벤치 · 정자에 앉아 쉬는 중
      target = usagiClub.active ? (guide.open || panels.isOpen() ? null : usagiClub.target(player.position))
        : pulling || fishing || panels.isOpen() || guide.open || sleeping || sticker || funBusy() || fainting || downed ? null : findTarget();
      updateFun(dt);
      villageLife(dt);
      // 무기를 들고 몬스터가 근처에 있으면(닿지 않아도) 휘두르기 버튼을 띄운다(휴대폰)
      const swingable = !target && hunting && weaponNow() && monsters.nearest(player.position.x, player.position.z, 6);
      hud.setAction(hachiPit.phase === 'rescue' ? '영차!' : pulling ? '뽑는 중' : glowTry ? '따는 중' : fishing ? fishLabel() : target ? target.label : swingable ? '휘두르기' : null);
      // 털뭉치 따기(꾹 누르고 있는 동안): 버섯 빛을 게이지로 — 바늘이 초록 칸(손을 뻗을 때마다 자리가 바뀐다)에 왔을 때 손을 뗀다. 풀 뽑기 게이지와 같은 자리
      if (glowTry) {
        if (!glowTry.s.has) cancelGlow(); // 그새 날이 밝았다
        else hud.showMeter(glows.glowOf(glowTry.s), glowTry.zone, [{ icon: itemSvg('glowfluff'), text: '초록 칸에서 손을 떼요' }]);
      }
      hud.render(state);
      updateExamPill();
      // 별똥별이 쏟아지는 밤: 처음 한 번 알리고, 화면 위쪽에 별똥별이 가끔 지나간다(소원을 빌면 하늘을 올려다본다)
      const starNight = isStarfallNight(state.clock.day) && isStarHour(hourOf(state.clock)) && !tutorialActive(state.tutorial);
      streaks.setActive(starNight && !starShow && !sleeping && !panels.isOpen());
      if (starNight && canWish(state) && starNotice !== state.clock.day && !guide.open) {
        starNotice = state.clock.day;
        hud.toast('별똥별이 쏟아지는 밤이에요', 3600, { chips: [{ text: '소원을 빌어 봐요' }] });
      }
      // 하는 중인 퀘스트를 모두: 고정(압정)한 것 → 화면에 띄우기로 고른 것 → 나머지 차례로(고정한 것은 접어도 보인다)
      const qt = pickTrack(state), qs = activeQuests(state), pins = (state.questPins || []).filter((id) => qs.includes(id));
      const order = [...pins, ...(qt && !pins.includes(qt) ? [qt] : []), ...qs.filter((id) => id !== qt && !pins.includes(id))];
      hud.setQuests(order.map((id) => {
        const g = shortGoal(state, id);
        // 물건 · 몬스터는 그림 꼬리표로(몇 개 남았는지 한눈에)
        const sg = usagiClub.active && usagiClub.questId === id ? usagiClub.goal : null; // 연출 중에는 지금 할 일(몰래 따라가기 · 굴로 들어가기 …)
        return { id, title: QUESTS[id].title, story: !!QUESTS[id].story, side: !!QUESTS[id].side, chain: !!QUESTS[id].chain, goal: sg || g.goal, n: sg ? '' : g.n, chips: sg ? [] : partChips(g), pinned: pins.includes(id) };
      }));
      // 불: 등불 버튼 모양, 손에 든 모습, 따라다니는 빛
      const lightMode = lightOf(state);
      hud.setLight(hasTool(state, 'lantern') || hasTool(state, 'flashlight') ? lightMode : null);
      player.setHeld(lightMode === 'off' ? null : lightMode);
      lights.update(lightMode, player.position, player.yaw, nightNow);
      // 탐험 기록(지도가 없어도 남긴다)과 구역이 바뀌면 알림
      exploreT -= dt;
      if (exploreT <= 0) {
        exploreT = 0.5;
        const pp = player.position, ex = markExplored(state.explored || '', pp.x, pp.z, 8);
        if (ex !== state.explored) state = { ...state, explored: ex };
        const r = regionAt(pp.x, pp.z);
        if (lastRegion && r !== lastRegion) hud.toast(REGION_NAMES[r], 1600);
        // 처음 마을 밖에 나가면 몬스터 이야기를 한 번 해 준다
        if (lastRegion === 'village' && r !== 'village' && !seen('monsters') && !tutorialActive(state.tutorial)) {
          markSeen('monsters');
          setTimeout(() => hud.toast('마을 밖은 몬스터 조심!', 3200), 1700);
        }
        lastRegion = r;
      }
      // 안내: 목표를 이루면(창을 닫고 손을 뗀 뒤에) 다음 단계로
      if (tutorialActive(state.tutorial) && !guide.open && !panels.isOpen() && !pulling) {
        const next = tutorialNext(state.tutorial, state, { nearHome: nearHome(), phoneOpened: tutPhoneOpened });
        if (next !== state.tutorial) enterTutorial(next, state.tutorial);
        // 말이 다른 대화에 끊겨 할 일 카드를 못 띄웠으면(쪽지가 숨은 채로 남았으면) 지금 띄운다
        else if (guide.goalEl.classList.contains('incoming') && performance.now() - goalCardAt > 4000) announceGoal(state.tutorial);
      }
      updateGrade5Guide(dt);
      updateExamGoal();
      updateRakkoAdvice(dt);
      updateDown(dt); // 같이 놀기: 쓰러져 깨워 주길 기다리는 중(행동 버튼 · 위 알약을 덮어쓴다)
      saveTimer += dt;
      if (saveTimer > 10) { saveTimer = 0; save(); }
    }
    // 친구 마을에 놀러 간 동안은 내 마을 친구들 대신 주인 마을 친구들(주인이 보낸 모습)을 보여 준다
    const guestView = !!visiting && !visiting.arriving; // 커튼이 다 내려온 뒤부터 친구 마을 모습
    if (guestView) npcs.puppet(visiting.npcs, dt, t);
    else npcs.update(dt, t, focus);
    // 같이 놀기: 같은 마을 친구들은 내가 마을에 있을 때만 보인다(내 움직임은 netTick 이 보낸다)
    remotes.update(dt, (mode === 'play' || (mode === 'intro' && !!visiting)) && !closeup); // 친구 마을로 걸어 들어갈 때도 와 있는 친구들이 보인다
    updateRemoteLights();
    hud.setRecall(canRecall()); // 마을 밖에 있을 때만 집으로 버튼
    // 하늘색 자동차: 걸어야 할 때(이야기 · 다른 장면 · 쓰러짐 · 앉아 쉬기 …)는 저절로 내리고, 버튼은 차가 있을 때만(타고 있으면 눌린 모양)
    if (player && player.riding && !carStay()) getOffCar(true);
    hud.setCar(mode === 'play' && state && hasTool(state, 'car') ? (player && player.riding ? 'on' : 'off') : null);
    hud.setPhoneNudge(!!appNudge || (!!state && state.tutorial === 'phone')); // 새로 생긴 앱(지도)을 열 때까지 · 첫날 안내에서 마을폰을 열어 볼 때 마을폰 버튼이 빛난다
    if (mode !== 'play') streaks.setActive(false);
    // 이야기 장면(잠옷 밤나들이 · 별똥별 소원 · 얼굴 클로즈업): 화면 글을 거의 다 숨기고 대화 상자는 작게 맨 아래로(index.html .cutscene)
    const cut = mode === 'play' && (pajama.active || !!starShow || !!closeup || blackStar.cutscene || cameraStory.cutscene);
    if (cut !== cutscene) { cutscene = cut; document.body.classList.toggle('cutscene', cut); }
    // 하늘: 놀러 간 동안은 주인 마을 시간, 별똥별맨 미리 보기 동안은 하늘만 밤
    applySky(guestView && visiting.clock ? visiting.clock : starShow && starShow.preview ? { day: state.clock.day, t: (21 - 6) / 24 } : state ? state.clock : { day: 1, t: 0.15 });
    if (mode === 'play') {
      if (starShow) starCamera(dt);
      else if (closeup) closeupCamera(dt);
      else {
        const pp = pajama.camPose(dt) || cameraStory.camPose(); // 이야기 카메라(별 보기 · 뷰파인더)
        if (pp) { cam.set(pp.pos, pp.look); storyCam = true; }
        else {
          // 이야기 카메라가 끝나면 따라가기 카메라를 바로 내 자리에 붙인다(연출 전 자리 — 마을 — 에서 날아오지 않게)
          if (storyCam) { storyCam = false; cam.snap(focus); }
          cam.follow(focus, dt);
        }
      }
    }
    else if (mode === 'title') {
      // 타이틀: 마을 위를 천천히 돈다
      const a = t * 0.07;
      titlePos.set(Math.sin(a) * 34, 16, Math.cos(a) * 34 + 2);
      cam.set(titlePos, titleLook);
    }
    starfall.update(dt, cam.camera);
    weather.update(dt, focus); // 비(검은 별똥별의 비 오는 아침 등)
    gfx.followSun(focus.x, focus.z);
    if (!skipRender && drawNow) {
      lod.update(cam.camera, performance.now(), mode !== 'title'); // 타이틀은 마을을 멀리서 내려다봐서 외곽선을 다 남긴다
      gfx.render(cam.camera);
    }
    if (homeSign && state) {
      const tx = visiting ? `${multi.hostName || '친구'}네 집` : housingOf(state).own ? '내 집' : isEvicted(state) ? '빈집' : '빌린 집';
      if (homeSign.text !== tx) { homeSign.text = tx; homeSign.html = signHtml(tx, homeSign.key); }
    }
    // 타이틀 · 처음 마을에 들어오는 장면에서는 간판 · 말풍선을 띄우지 않는다(마을에 들어온 뒤부터 톡톡 나타난다)
    if (mode !== 'play' || closeup || pajama.phase === 'stars' || pajama.phase === 'sleep') { cue.visible = false; hud.placeLabels([], cam.camera); return; } // 얼굴 클로즈업 · 별 보기 동안은 간판 · 말풍선도 숨긴다
    const bubbles = npcs.labels(), mark = visiting ? null : tutorialMarker();
    if (mark) bubbles.push(mark);
    bubbles.push(...monsters.labels(focus)); // 몬스터 이름 · 체력 줄(친구 마을에서는 그 마을 몬스터)
    if (!visiting) bubbles.push(...questMarks(focus), ...doingLabels(focus)); // 퀘스트 ! · ?, 친구가 하는 일(놀러 간 친구 마을에서는 빼고)
    bubbles.push(...remotes.labels()); // 같이 놀기: 다른 플레이어 이름표 · 한마디
    if (mySay && performance.now() < mySay.until && player) bubbles.push({ id: 'mp-me', x: player.position.x, y: 1.75, z: player.position.z, text: mySay.text, kind: 'bubble' });
    const prompt = showTargetCue(bubbles);
    if (prompt) bubbles.push(prompt);
    // 간판은 가까운 것만(넓어진 월드에서 먼 간판까지 계산하지 않게), 먼 간판은 작고 흐리게
    const near = [];
    for (const l of dinerFront.visible ? [...signLabels, dinerSign] : signLabels) {
      const d = Math.hypot(l.x - focus.x, l.z - focus.z);
      if (d < SIGN_SEE) { l.far = d > SIGN_CLEAR; near.push(l); }
    }
    hud.placeLabels(bubbles.length ? near.concat(bubbles) : near, cam.camera);
  }
  village.warmShaders(gfx.renderer, cam.camera); // 처음 나무 · 집 뒤에 갈 때 멈칫하지 않게 반투명 셰이더를 미리
  requestAnimationFrame(frame);
}

boot();
