/*
 * 《치이카와 마을 생활》 큰 업데이트 계획(사용자 요구사항 → 단계)
 *  1단계 ✅ 맵 개편: 넓어진 마을 · 집 배치, 마을 밖 네 구역(숲 · 바위산 · 들판 · 강가), 지도(가 본 곳만 밝게), 랜턴 · 손전등
 *  2단계 ✅ 급수별 풀: 5급~1급 풀 10종(core/weeding.js), 구역별로 자람(world/weeds.js), 뽑는 방식(흔들림 · 여러 번 · 독),
 *          급수별 일감, 어려운 풀일수록 경험치 많이, 승급 시험은 지금 급수의 풀로, 마을폰 '풀 도감' 앱
 *  3단계: 마을 생활 — 친구들 기력(일하면 줄고, 모자라면 라멘 · 집에 들어가 잠), 친구 집 · 하치와레 동굴 안에 들어가기, 마을 다듬기
 *  4단계: 토벌 — 도구점 무기, 검정소 토벌 자격증, 마을 밖 몬스터(오리지널 디자인), 노동 접수 토벌 일감
 *  5단계: 퀘스트 · 스토리 — 친구마다 고충 퀘스트(친밀도 · 돈 · 가구 · 도구 보상), 마을 스토리라인, 퀘스트 앱
 */
import * as THREE from 'three';
import { createScene } from './render/scene.js';
import { createFollowCamera } from './render/camera.js';
import { buildVillage } from './world/village.js';
import { createWeeds, stageLabel } from './world/weeds.js';
import { buildChibi } from './actors/models.js';
import { setCelLight } from './render/toon.js';
import { createPlayer } from './actors/player.js';
import { createNpcs } from './actors/npcs.js';
import { createInput } from './ui/joystick.js';
import { createHud } from './ui/hud.js';
import { createPanels } from './ui/panels.js';
import { openCreator } from './ui/creator.js';
import { showTitle } from './ui/title.js';
import { createIntro } from './ui/intro.js';
import { createOrientationGuard } from './ui/orientation.js';
import { createState, addMoney, useStamina, restoreStamina, MAX_STAMINA } from './core/state.js';
import { advance, hourOf, sleepUntilMorning } from './core/clock.js';
import { WEED_KINDS, STAMINA_PER_PULL, startPull, chargePull, releasePull, canPullKind, advanceWeed, pullStamina, kindsOfGrade, josa } from './core/weeding.js';
import { JOB_TYPES, acceptJob, recordPull, isComplete, payout, isWeedJob } from './core/jobs.js';
import { gainXp, canTakeExam, startExam, examStep, examCounts, promote } from './core/license.js';
import { buy } from './core/shop.js';
import { createStore } from './core/save.js';
import { createSound } from './audio/sound.js';
import { TUTORIAL_LINES, HELP_TOPICS, tutorialActive, tutorialNext } from './core/tutorial.js';
import { createGuide } from './ui/guide.js';
import { playSleep } from './ui/sleepfx.js';
import { createBerries } from './world/berries.js';
import { openSticker } from './ui/sticker.js';
import { createInterior } from './world/interior.js';
import { createHomeUI } from './ui/homeui.js';
import { FURNITURE, homeOf, buyFurniture, placeFurniture, removeFurniture, rotateFurniture, moveFurniture } from './core/home.js';
import { FRIENDS, CHATS, friendOf, hearts, befriend, rps, canBorrow, loanOptions, borrow, repay, debtOf } from './core/friends.js';
import { LICENSES, LIQUOR_LESSONS, liquorQuiz, payFee, grant, hasLicense, canWorkRamen, workedRamen } from './core/licenses.js';
import { ramenQuiz, shiftPay } from './core/ramen.js';
import { openRamenShop } from './ui/ramenshop.js';
import { openQuiz, openHighball } from './ui/exams.js';
import {
  VILLAGERS, MEAL_PRICE, takeFromBoard, returnToBoard, villagerOf, decide, villagerTakesJob, payVillager, villagerSpend, villagerPay,
  canSteal, stealAmount, steal, recover, thiefKeeps, markTheft
} from './core/villagers.js';
import { furnitureThumbs } from './world/thumbs.js';
import { RENT, LOTTERY_PRICE, LODGING_PRICE, ROUGH_REST, housingOf, isEvicted, startDay, payRent, rentAgain, buyHouse, applyLottery, buyByLottery } from './core/housing.js';
import { POCHETTES, buyPochette, wearPochette, worn, guardedTheft } from './core/pochette.js';
import { VILLAGE_R, REGION_NAMES, regionAt } from './core/layout.js';
import { markExplored } from './core/explore.js';
import { TOOLS, toolsOf, buyTool, lightOf, nextLight, hasTool } from './core/tools.js';
import { createPlayerLights } from './actors/lights.js';
import { todayISO, dateLabel, weekdayOf } from './core/calendar.js';

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
  const weeds = createWeeds(scene, village);
  const npcs = createNpcs(scene, village, weeds, berries);
  const input = createInput(ui, canvas);
  const hud = createHud(ui, input);
  createOrientationGuard(ui);
  const store = createStore(safeStorage());
  // 소리: 브라우저는 첫 누름 전까지 소리를 막으므로 누를 때마다 깨운다. 버튼을 누르면 딸깍.
  const sound = createSound(safeStorage());
  document.addEventListener('pointerdown', () => sound.unlock(), true);
  document.addEventListener('keydown', () => sound.unlock(), true);
  ui.addEventListener('click', (e) => { if (e.target.closest('button')) sound.play('click'); }, true);
  const guide = createGuide(ui, { onLine: (who) => sound.play('talk', who.kind), dock: hud.dock });

  let state = null;
  let player = null;
  let pulling = null; // { weed, pull }
  let sleeping = false; // 하루가 지나는 연출 중
  let target = null;
  let saveTimer = 0;

  const save = () => { if (state && player) store.save({ ...state, player: { x: player.position.x, z: player.position.z } }); };
  const commit = (next, persist = true) => { state = next; if (persist) save(); };
  const seen = (tip) => state.seenTips.includes(tip);
  const markSeen = (tip) => { state = { ...state, seenTips: [...state.seenTips, tip] }; };

  // ---------- 창 ----------
  const panels = createPanels(ui, {
    getState: () => state,
    getSound: () => sound.prefs,
    toggleSound: (kind) => sound.toggle(kind),
    onOpen: () => { cancelPull(); input.setEnabled(false); hud.setAction(null); },
    onClose: () => input.setEnabled(true),
    acceptJob(typeId) {
      // 게시판 일감은 하루에 정해진 수만큼: 친구들이 먼저 받아 가면 마감
      const r = takeFromBoard(state, typeId, state.clock.day);
      if (!r.ok) { hud.toast('그 일감은 오늘 마감됐어요. 다른 일감을 골라요'); return; }
      commit({ ...r.state, job: acceptJob(typeId) });
      sound.play('job');
      hud.toast(`일감을 받았어요: ${JOB_TYPES[typeId].title}`);
    },
    quitJob() { commit({ ...returnToBoard(state, state.job.typeId, state.clock.day), job: null }); hud.toast('일감을 그만뒀어요. 게시판에 다시 걸렸어요'); },
    reportJob() {
      if (!state.job || !isComplete(state.job)) return;
      const pay = payout(state.job, state.license.grade);
      commit({ ...addMoney(state, pay), job: null });
      sound.play('coin');
      hud.toast(`보수 ${pay.toLocaleString('ko-KR')}원을 받았어요!`);
      player.cheerTime = 1.2;
    },
    startExam() {
      if (!canTakeExam(state.license)) return;
      const exam = startExam(state.license.grade), names = kindsOfGrade(state.license.grade).map((k) => WEED_KINDS[k].name).join(' · ');
      commit({ ...state, exam });
      sound.play('job');
      hud.toast(`승급 시험 시작! ${josa(names, '을/를')} 깔끔하게 연속 ${exam.need}번 뽑아요`, 3600);
    },
    buy(itemId) {
      const r = buy(state, 'ramen', itemId);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : r.reason === 'license' ? '술 자격이 있어야 해요' : '지금은 배불러요'); return; }
      commit(r.state);
      sound.play('eat');
      hud.toast(itemId === 'ramen' ? '후루룩! 기운이 났어요' : itemId === 'highball' ? '캬~ 시원하다! 기운이 났어요' : '냠냠! 기운이 조금 났어요');
    },
    // 검정소 시험 · 라멘 로우 알바
    takeLicense: (id) => takeLicense(id),
    workRamen: () => workRamen(),
    // 가구점
    thumbs: () => furnitureThumbs(),
    buyFurniture(id) {
      const r = buyFurniture(state, id);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      commit(r.state);
      sound.play('coin');
      hud.toast(`${FURNITURE[id].name}을(를) 샀어요! 집에서 '꾸미기'로 놓아요`, 3000);
    },
    // 부동산
    dayLabel: (day) => dateLabel(state.startDate, day),
    nextDay: (dow, from = state.clock.day + 1) => { let d = from; while (weekdayOf(state.startDate, d) !== dow) d++; return d; },
    payRent() {
      const r = payRent(state);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      commit(r.state);
      sound.play('coin');
      hud.toast(isEvicted(state) ? '밀린 집세를 냈어요. 다시 세 들면 집에 들어갈 수 있어요' : '밀린 집세를 다 냈어요. 후련해요!', 3000);
    },
    rentAgain() {
      const r = rentAgain(state);
      if (!r.ok) { hud.toast('돈이 부족해요'); return; }
      commit(r.state);
      sound.play('coin');
      hud.banner('다시 세 들었어요', '이제 집에 들어가서 잘 수 있어요', 3000);
    },
    // 포셰트 가게
    buyPochette(id) {
      const r = buyPochette(state, id);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '이미 가진 포셰트예요'); return; }
      commit(r.state);
      refreshLook();
      sound.play('coin');
      player.cheerTime = 1.2;
      hud.toast(`${POCHETTES[id].name}을(를) 멨어요! 소매치기를 당해도 절반만 빼앗겨요`, 3400);
    },
    wearPochette(id) {
      commit(wearPochette(state, id));
      refreshLook();
      sound.play('click');
      hud.toast(id ? `${POCHETTES[id].name}을(를) 멨어요` : '포셰트를 벗었어요');
    },
    // 헌책방 · 도구점 · 지도 앱
    buyTool(id) {
      const r = buyTool(state, id);
      if (!r.ok) { hud.toast(r.reason === 'money' ? '돈이 부족해요' : '이미 가지고 있어요'); return; }
      commit(r.state);
      sound.play('coin');
      hud.toast(id === 'map' ? '마을 지도를 샀어요! 마을폰에 지도 앱이 생겼어요' : `${TOOLS[id].name}을(를) 샀어요! 밤에 들고 다녀요`, 3200);
    },
    setLight(id) { commit({ ...state, tools: { ...toolsOf(state), light: id } }); },
    playerPos: () => ({ x: player.position.x, z: player.position.z, yaw: player.yaw }), // 지도에 바라보는 방향 화살표
    mapLabels: () => village.labels.map((l) => ({ x: l.x, z: l.z, text: l.text })),
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
      hud.toast('청약을 넣었어요! 수요일 발표를 기다려요', 3000);
    },
    buyByLottery() {
      const r = buyByLottery(state, state.clock.day);
      if (!r.ok) { hud.toast(r.reason === 'unpaid' ? '밀린 집세부터 내요' : r.reason === 'money' ? '돈이 부족해요' : '당첨 기한이 지났어요'); return; }
      commit(r.state);
      celebrateHouse();
    },
    /** 메인(타이틀)으로 나간다. 진행은 저장되고, 타이틀에서 이어하기·새로 시작하기를 고른다. */
    toTitle() {
      cancelPull();
      resetFun();
      save();
      guide.setGoal(null);
      npcs.setFollow('hachiware', false);
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
   * how: 'home'(내 집) · 'lodge'(친구 집에 돈을 내고) — 기운이 가득 / 'rough'(노숙) — 기운이 조금만 찬다.
   */
  function doSleep(how = 'home') {
    if (sleeping) return;
    sleeping = true;
    cancelPull();
    input.setEnabled(false);
    hud.setAction(null);
    sound.play('sleep');
    const rolled = rollDays(restoreStamina({ ...state, clock: sleepUntilMorning(state.clock) }, how === 'rough' ? ROUGH_REST : MAX_STAMINA));
    const next = rolled.state;
    playSleep(ui, { dateText: dateLabel(next.startDate || todayISO(), next.clock.day) }, () => commit(next), () => sound.play('morning')).then(() => {
      sleeping = false;
      if (mode === 'play') input.setEnabled(true);
      homeUI.refresh();
      hud.toast(how === 'rough' ? '바닥에서 잤더니 온몸이 쑤셔요… 기운이 조금밖에 안 찼어요' : how === 'lodge' ? '친구 집에서 푹 잤어요. 기운이 가득해요!' : '푹 잤어요. 기운이 가득해요!', 3400);
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
      if (e.type === 'rentPaid') { hud.toast(`월요일이라 집세 ${won(e.amount)}을 냈어요`, 3200); sound.play('coin'); }
      else if (e.type === 'rentUnpaid') hud.toast(`돈이 모자라 집세를 못 냈어요 · 밀린 집세 ${won(e.unpaid)} · 다음 월요일까지 못 내면 쫓겨나요!`, 4800);
      else if (e.type === 'evicted') evicted(e.unpaid);
      else if (e.type === 'rentSoon') hud.toast(`내일(월)은 집세 ${won(RENT)}을 내는 날이에요`, 3200);
      else if (e.type === 'lotteryWon') { hud.banner('청약 당첨!', `일주일 안에 부동산에서 ${won(LOTTERY_PRICE)}에 사요`, 3600); sound.play('done'); }
      else if (e.type === 'lotteryLost') hud.toast('청약 발표: 아쉽게 떨어졌어요. 다시 신청해 봐요', 3600);
      else if (e.type === 'lotteryExpired') hud.toast('청약 당첨 기한이 지났어요', 3200);
    }
  }
  /** 집세를 두 번 연달아 못 내서 쫓겨났다: 집 안이면 밖으로 나온다. */
  function evicted(unpaid) {
    if (mode === 'home') exitHome();
    hud.banner('집에서 쫓겨났어요…', `밀린 집세 ${won(unpaid)} · 부동산에서 다시 세 들 수 있어요`, 4200);
    sound.play('fail');
    setTimeout(() => { if (state && isEvicted(state)) hud.toast('밤에는 친구에게 하룻밤 재워 달라고 하거나(돈이 들어요) 바닥에서 노숙해야 해요', 4800); }, 4400);
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
  const myLook = () => ({ ...state.profile.look, pochette: worn(state) });
  const refreshLook = () => { player.setModel(buildChibi(myLook())); };

  /** 내 집 마련! */
  function celebrateHouse() {
    hud.banner('내 집 마련!', '이제 집세를 내지 않아요', 3200);
    sound.play('done');
    player.cheerTime = 1.8;
  }
  /** 모습 바꾸기(집 안 거울). */
  function editLook() {
    input.setEnabled(false);
    const back = () => { if (mode === 'play') input.setEnabled(true); };
    openCreator(ui, (profile) => {
      commit({ ...state, profile });
      refreshLook();
      interior.setPlayer(myLook());
      back();
      hud.toast('새 모습이 마음에 들어요!');
    }, state.profile, back);
  }

  // ---------- 집 안 ----------
  const interior = createInterior();
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
    look: () => editLook(),
    exit: () => exitHome(),
    showGrid: (on) => interior.showGrid(on),
    highlight: (cell) => interior.highlight(cell),
    cellAtScreen: (x, y) => { const p = ndc({ clientX: x, clientY: y }); return interior.cellAt(p.x, p.y); },
    ghost: (id, cell) => interior.ghost(id, cell)
  });
  /** 집에 들어간다: 마을 대신 집 안을 그리고, 집 안 버튼을 띄운다. */
  function enterHome() {
    cancelPull();
    mode = 'home';
    setCinematic(true);
    input.setEnabled(false);
    hud.setAction(null);
    interior.setHome(homeOf(state));
    interior.setPlayer(myLook());
    homeUI.open();
    sound.play('job');
    const unpaid = housingOf(state).unpaid;
    if (unpaid > 0) hud.toast(`밀린 집세 ${won(unpaid)}이 있어요. 부동산에서 내요`, 3200);
  }
  function exitHome() {
    homeUI.close();
    mode = 'play';
    setCinematic(false);
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

  hud.onSettings(() => { if (state && mode === 'play' && !guide.open && !sleeping && !funBusy()) panels.openSettings({ storage: store.available }); });
  hud.onZoom((f) => cam.zoomBy(f));
  // 등불 버튼: 가진 불만 끔 → 랜턴 → 손전등
  hud.onLight(() => { if (state && mode === 'play') { commit(nextLight(state)); } });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoomBy(Math.exp(e.deltaY * 0.001)); }, { passive: false });

  /** 이번 작업으로 일감을 다 했으면 크게 알린다(가운데 도장 + 빰빠밤 + 만세). */
  function celebrateIfDone(before, after) {
    if (after && isComplete(after) && !(before && isComplete(before))) {
      hud.banner('노동 완료!', '노동 접수에서 보수를 받아요', 2800);
      sound.play('done');
      player.cheerTime = 1.8;
    }
  }

  // ---------- 다른 작업: 스티커 붙이기, 열매 따기 ----------
  const WORK_STAMINA = 2;
  let sticker = null; // 스티커 작업 중이면 열려 있는 미니게임
  const jobKind = () => state.job && JOB_TYPES[state.job.typeId].kind;

  function startSticker() {
    if (jobKind() !== 'sticker') { hud.toast('노동 접수에서 \'과일 스티커\' 일감을 받아 와요'); return; }
    if (isComplete(state.job)) { hud.toast('다 붙였어요! 노동 접수에서 보수를 받아요'); return; }
    if (state.stamina < WORK_STAMINA) { hud.toast('기운이 없어요. 라멘을 먹거나 집에서 쉬어요'); return; }
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
    if (jobKind() !== 'berry') { hud.toast('노동 접수에서 \'열매 따기\' 일감을 받아 와요'); return; }
    if (isComplete(state.job)) { hud.toast('다 땄어요! 노동 접수에서 보수를 받아요'); return; }
    if (state.stamina < WORK_STAMINA) { hud.toast('기운이 없어요. 라멘을 먹거나 집에서 쉬어요'); return; }
    const before = state.job;
    berries.pick(bush);
    commit({ ...useStamina(state, WORK_STAMINA).state, job: recordPull(state.job, 'berry', 'clean') });
    sound.play('clean');
    player.face(bush.x, bush.z);
    player.cheerTime = 0.6;
    if (!isComplete(state.job)) hud.toast(`빨간 열매를 땄다! ${state.job.count} / ${JOB_TYPES[state.job.typeId].target}`, 1400);
    celebrateIfDone(before, state.job);
  }

  // ---------- 풀 뽑기 ----------
  function beginPull(weed) {
    const W = WEED_KINDS[weed.kind];
    if (!canPullKind(state.license.grade, weed.kind)) { hud.toast(`${josa(W.name, '은/는')} ${W.grade}급부터 뽑을 수 있어요`, 2600); return; }
    if (state.stamina < STAMINA_PER_PULL) { hud.toast('기운이 없어요. 라멘을 먹거나 집에서 쉬어요'); return; }
    if (npcs.isWorkingOn(weed)) { hud.toast('친구가 뽑으려는 풀이에요. 다른 풀을 찾아봐요'); return; }
    // 초록 구간은 뽑을 때마다 다른 자리에, 기운이 낮을수록 좁고 빠르게
    const st = stageLabel(weed);
    pulling = { weed, pull: startPull(weed.kind, { stamina: state.stamina, maxStamina: MAX_STAMINA }), label: weed.kind === 'weed' ? undefined : `${W.name}${st ? ' ' + st : ''} · 초록에서 떼요` };
    weed.busy = 'player'; // 친구들이 이 풀을 노리지 않게
    if (state.stamina <= MAX_STAMINA * 0.3 && !seen('tired-pull')) {
      markSeen('tired-pull');
      hud.toast('기운이 없어서 손이 떨려요… 쉬면 다시 쉬워져요', 3200);
    }
    player.busy = true;
    player.mode = 'pull';
    player.face(weed.x, weed.z);
    sound.chargeStart();
  }

  /** 결과 없이 뽑기를 멈춘다(창이 열리거나 다시 시작할 때). 기운은 쓰지 않는다. */
  function cancelPull() {
    if (!pulling) return;
    weeds.tug(pulling.weed, 0);
    delete pulling.weed.busy;
    pulling = null;
    sound.chargeStop();
    player.busy = false;
    player.mode = 'idle';
    player.power = 0;
    hud.hideMeter();
  }

  function endPull() {
    const { weed, pull } = pulling;
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
    if (step === 'none') { hud.toast('조금 더 꾹 눌러요'); return; }

    let next = useStamina(state, Math.min(state.stamina, pullStamina(weed.kind, step))).state; // 독이 튀어도 남은 기운까지만
    if (W.poison && step === 'snapped') hud.toast('윽, 독이 튀었다! 기운이 쭉 빠졌어요', 2200);
    // 여러 번에 나눠 뽑는 풀: 아직 남았으면 조금 올라온 채로 두고 다시 누르게
    const prog = advanceWeed({ stage: weed.stage, flawed: weed.flawed }, weed.kind, step);
    if (!prog.done) {
      weed.flawed = prog.flawed;
      weeds.loosen(weed, prog.stage);
      if (!(W.poison && step === 'snapped')) hud.toast(`${step === 'clean' ? '쑥 올라왔다!' : '조금 끊겼지만 올라왔다'} 한 번 더! (${prog.stage} / ${W.stages || 1})`, 1600);
      state = next;
      save();
      return;
    }
    const result = prog.final;
    const log = state.weedLog || {}, first = !log[weed.kind];
    next = {
      ...next, license: gainXp(next.license, result, weed.kind), weedLog: { ...log, [weed.kind]: (log[weed.kind] || 0) + 1 },
      stats: { pulled: next.stats.pulled + 1, clean: next.stats.clean + (result === 'clean' ? 1 : 0) }
    };
    if (next.job) next = { ...next, job: recordPull(next.job, weed.kind, result) };
    weeds.remove(weed, result);
    if (first && weed.kind !== 'weed') hud.banner('새 풀!', `${josa(W.name, '을/를')} 처음 뽑았어요 · 마을폰 풀 도감에 적었어요`, 2600);
    else if (!(W.poison && step === 'snapped')) hud.toast(result === 'clean' ? `깔끔하게 뽑았다! (${W.name})` : `앗, 끊어졌다… (${W.name})`, 1400);

    if (next.exam && examCounts(next.exam, weed.kind)) {
      const exam = examStep(next.exam, result);
      if (exam.done) {
        if (exam.passed) {
          next = { ...next, exam: null, license: promote(next.license) };
          sound.play('pass');
          const unlocked = kindsOfGrade(next.license.grade).map((k) => WEED_KINDS[k].name).join(' · ');
          hud.banner(`제초 검정 ${next.license.grade}급!`, unlocked ? `이제 ${unlocked}도 뽑을 수 있어요` : '승급 축하해요!', 3600);
          player.cheerTime = 2;
        } else {
          next = { ...next, exam: null };
          sound.play('fail');
          hud.toast('불합격… 다시 도전해요', 3000);
        }
      } else next = { ...next, exam };
    }
    celebrateIfDone(state.job, next.job);
    state = next;
    if (!state.job && !state.exam && !seen('nojob')) {
      markSeen('nojob');
      hud.toast('일감 없이 뽑으면 보수가 없어요. 노동 접수에서 일감을 받아요', 3800);
    }
    if (canTakeExam(state.license) && !state.exam && !seen('exam-' + state.license.grade)) {
      markSeen('exam-' + state.license.grade);
      hud.toast('승급 시험을 볼 수 있어요! 동쪽 검정소로 가요', 3600);
    }
    save();
  }

  // ---------- 하치와레의 첫날 안내 ----------
  const GOALS = { house: '하치와레를 따라 내 집 찾아가기', board: '서쪽 노동 접수에서 일감 받기', pull: '풀 앞에서 꾹 눌렀다 초록에서 떼기', report: '노동 접수에서 보수 받기' };
  const homeLabel = village.labels.find((l) => l.text === '내 집');
  const homeLead = { x: village.spots.home.x + 1.1, z: village.spots.home.z + 0.6 }; // 하치와레가 서서 기다리는 현관 옆
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
    guide.setGoal(GOALS[step] || null);
    // 집 안내 중에는 하치와레가 앞장서서 현관 옆에서 기다린다
    npcs.lead('hachiware', step === 'house' || step === 'houseTour' ? homeLead : null);
    if (step === 'hello') sayGuide(TUTORIAL_LINES.hello, () => enterTutorial('house', 'hello'));
    else if (step === 'houseTour') sayGuide(TUTORIAL_LINES.houseTour, () => enterTutorial('board', 'houseTour'));
    else if (step === 'tips') sayGuide(TUTORIAL_LINES.tips, () => { enterTutorial('done', 'tips'); hud.toast('하치와레의 안내 끝! 이제 마음껏 지내 봐요', 3000); });
    else if (step === 'board') sayGuide(from === 'pull' || from === 'report' ? TUTORIAL_LINES.boardAgain : TUTORIAL_LINES.board);
    else if (TUTORIAL_LINES[step]) sayGuide(TUTORIAL_LINES[step]);
  }
  /** 가야 할 곳 위에 '여기!' 표시. */
  function tutorialMarker() {
    const step = state && state.tutorial;
    // 안내가 끝난 뒤에도 일감을 다 하면 게시판 위에 '여기!'
    const jobDone = state && state.job && isComplete(state.job);
    // 집 안내(첫날, 또는 하치와레에게 집을 물었을 때): 내 집 간판 위에
    if (step === 'house' || escort) return { id: 'guide', x: homeLabel.x, y: homeLabel.y + 0.9, z: homeLabel.z, text: '여기!', kind: 'mark' };
    if (step === 'board' || step === 'report' || jobDone) return { id: 'guide', x: boardSign.x, y: boardSign.y + 0.9, z: boardSign.z, text: '여기!', kind: 'mark' };
    // 다른 작업 일감 중이면 어디서 하는지 표시: 스티커는 작업대, 열매는 가장 가까운 열린 덤불
    const kind = state && state.job && JOB_TYPES[state.job.typeId].kind;
    if (kind === 'sticker') return { id: 'guide', x: benchSign.x, y: benchSign.y + 0.9, z: benchSign.z, text: '여기!', kind: 'mark' };
    if (kind === 'berry' && player) {
      const b = berries.nearestReady(player.position.x, player.position.z, 60);
      if (b && Math.hypot(b.x - player.position.x, b.z - player.position.z) > 1.6) return { id: 'guide', x: b.x, y: 1.4, z: b.z, text: '열매!', kind: 'mark' };
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

  input.onAction((down) => {
    if (!state || mode !== 'play' || guide.open || sleeping || sticker || funBusy()) return;
    if (!down) {
      if (pulling) { if (panels.isOpen()) cancelPull(); else endPull(); }
      return;
    }
    if (panels.isOpen()) return;
    if (pulling || !target) return;
    if (target.type === 'weed') beginPull(target.weed);
    else if (target.type === 'npc' && target.npc.kind === 'hachiware' && tutorialActive(state.tutorial) && TUTORIAL_LINES[state.tutorial]) {
      sayGuide(TUTORIAL_LINES[state.tutorial]); // 안내 중에 하치와레에게 말을 걸면 지금 할 일을 다시 알려 준다
    } else if (target.type === 'npc') talkTo(target.npc);
    else if (target.type === 'board') panels.openBoard();
    else if (target.type === 'exam') panels.openExam();
    else if (target.type === 'ramen') panels.openShop();
    else if (target.type === 'furniture') panels.openFurniture();
    else if (target.type === 'realty') panels.openRealty();
    else if (target.type === 'home') {
      if (isEvicted(state)) hud.toast('집에서 쫓겨났어요… 부동산에서 다시 세 들어야 들어갈 수 있어요', 3400);
      else enterHome();
    } else if (target.type === 'pochette') panels.openPochette();
    else if (target.type === 'books') panels.openBooks();
    else if (target.type === 'tools') panels.openTools();
    else if (target.type === 'rough') sleepRough();
    else if (target.type === 'factory') startSticker();
    else if (target.type === 'berry') pickBerry(target.bush);
  });

  // ---------- 친구와 이야기 · 놀기 ----------
  let talking = null; // 대화 중인 친구
  let tag = null; // 술래잡기 { n, t: 남은 초 }
  let dance = null; // 같이 춤추기 { n, t }
  let escort = false; // 하치와레가 집까지 앞장서는 중
  let overlay = false; // 시험 · 알바 창이 열려 있다
  const funBusy = () => !!(talking || tag || dance || overlay);
  const fillName = (line) => line.replaceAll('{name}', state.profile.name);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  /** 대화 상자 이름표: 이름 · 색 · 친밀도 하트. */
  const whoOf = (n) => ({ kind: n.kind, ...FRIENDS[n.kind], hearts: hearts(friendOf(state, n.kind)),
    note: debtOf(state, n.kind) > 0 ? `빌린 돈 ${won(debtOf(state, n.kind))}` : null });
  // 지갑이 텅 비었을 때의 첫마디
  const BROKE = {
    chiikawa: '돈이 하나도 없어… 일하러 가야 해…', hachiware: '요즘 좀 빠듯하네~ 열심히 일해야지!', usagi: '하아? (빈 지갑을 흔든다)',
    kurimanju: '하아~ 술값이 모자라…', rakko: '수련만 하다 보니 돈이…', momonga: '돈 좀 줘! 귀여우니까!'
  };
  // 하트를 꽉 채운 친구에게 돈을 빌릴 때 · 쫓겨나서 하룻밤 묵을 때의 말
  const LOAN_ASK = {
    chiikawa: '…조금이라면…! 얼마…?', hachiware: '물론이지~ 얼마나 필요해?', usagi: '우라! (지갑을 활짝 연다)',
    kurimanju: '하아~ 얼마나 필요한데?', rakko: '…곤란할 때는 서로 돕는 거다. 얼마냐.', momonga: '흥! 특별히 빌려줄게. 얼마?'
  };
  const LODGE = {
    chiikawa: ['…같이 자자…!', '(이불을 하나 더 꺼내 준다)'], hachiware: ['물론이지~ 동굴이 좀 좁지만 괜찮지?', '푹 자~ 내일 또 힘내자!'],
    usagi: ['우라!', '(옆자리를 툭툭 두드려 준다)'], kurimanju: ['하아~ 우리 집에서 자고 가.', '자기 전에 한 잔… 아니, 그냥 자자.'],
    rakko: ['…좋다. 하룻밤이다.', '수련은 내일 아침 일찍이다.'], momonga: ['흥, 돈 냈으니까 재워 줄게!', '내 침대는 안 돼! 바닥에서 자!']
  };
  const sayAs = (n, lines, then) => guide.say(lines.map(fillName), then, whoOf(n));
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
    if (mode === 'play') input.setEnabled(true);
  }
  /** 메인으로 나갈 때 하던 놀이를 모두 멈춘다. */
  function resetFun() {
    if (tag) npcs.flee(tag.n, false);
    if (talking) npcs.hold(talking, false);
    talking = tag = dance = null;
    escort = false;
    npcs.lead('hachiware', null);
    hud.setTimer(null);
  }

  /** 말을 걸면: 첫마디와 함께 동물의 숲처럼 고를 거리를 띄운다. */
  function talkTo(n) {
    const f = FRIENDS[n.kind];
    if (!f) return;
    beginTalk(n);
    const opts = [];
    if (n.kind === 'hachiware') opts.push(['help', '궁금한 게 있어']);
    opts.push(['chat', '이야기하자']);
    if (f.play) opts.push(['play', '같이 놀자']);
    // 쿠리만쥬: 술 자격 공부(강의) · 자격을 따면 한 잔
    if (n.kind === 'kurimanju') opts.push(hasLicense(state, 'liquor') ? ['drink', '한 잔 하자'] : ['study', '술 공부하고 싶어']);
    if (n.kind === 'pochette') opts.push(['shop', '포셰트 구경할래']);
    // 지갑이 있는 친구: 하트를 꽉 채우면 돈을 빌릴 수 있고, 빌렸으면 갚는다. 쫓겨났으면 밤에 하룻밤 재워 달라고 한다.
    if (VILLAGERS[n.kind]) {
      const debt = debtOf(state, n.kind);
      if (isEvicted(state) && bedtime()) opts.push(['lodge', `하룻밤 재워 줄래? (${won(LODGING_PRICE)})`]);
      if (debt > 0) opts.push(['repay', `빌린 돈 갚기 (${won(debt)})`]);
      else if (canBorrow(state, n.kind, state.clock.day)) opts.push(['borrow', '돈 좀 빌려줄래?']);
    }
    opts.push(['bye', '아무것도 아니야']);
    const poor = VILLAGERS[n.kind] && villagerOf(state, n.kind, state.clock.day).money < 60;
    askAs(n, poor ? BROKE[n.kind] : npcs.greeting(n.kind), opts.map((o) => o[1]), (i) => {
      const k = opts[i][0];
      if (k === 'help') askHelp(n, '뭐가 궁금해? 뭐든 물어봐~');
      else if (k === 'chat') sayAs(n, pick(CHATS[n.kind]), () => reward(n, 'talk'));
      else if (k === 'play') askPlay(n);
      else if (k === 'study') {
        const i = (state.liquorLesson || 0) % LIQUOR_LESSONS.length;
        commit({ ...state, liquorLesson: i + 1 });
        sayAs(n, [...LIQUOR_LESSONS[i], `(술 공부 ${i + 1} / ${LIQUOR_LESSONS.length}) 다 들으면 동쪽 검정소에서 시험을 봐~ 하아~`], () => reward(n, 'talk'));
      } else if (k === 'drink') {
        npcs.emote(n, 'drink', 3.5);
        sayAs(n, ['자격증 챙겼지? 그럼 한 잔~', '…캬~ 오늘 하루도 수고했어. 하아~'], () => reward(n, 'play'));
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
    });
  }

  /** 돈 빌리기: 친구 지갑의 절반까지, 갚기 전에는 한 번만. */
  function askLoan(n) {
    const amounts = loanOptions(state, n.kind, state.clock.day);
    askAs(n, LOAN_ASK[n.kind] || '얼마나 필요해?', [...amounts.map((a) => won(a)), '역시 괜찮아'], (i) => {
      const amount = amounts[i];
      if (!amount) { sayAs(n, ['그래? 필요하면 또 말해~'], endTalk); return; }
      commit(borrow(state, n.kind, amount, state.clock.day));
      sound.play('coin');
      sayAs(n, [`여기 ${won(amount)}! 나중에 꼭 갚아 줘~`], () => { hud.toast(`${FRIENDS[n.kind].name}에게 ${won(amount)}을 빌렸어요 · 다시 말을 걸면 갚을 수 있어요`, 3400); endTalk(); });
    });
  }

  // ---------- 자격(술 · 슈퍼 알바이터)과 라멘 로우 알바 ----------
  /** 시험 · 알바 창이 열려 있는 동안 마을 조작을 막는다. */
  function beginOverlay() { cancelPull(); input.setEnabled(false); hud.setAction(null); overlay = true; }
  function endOverlay() { overlay = false; if (mode === 'play') input.setEnabled(true); }
  /** 검정소 시험: 응시료 → 필기 → 실기(술: 하이볼, 슈퍼 알바이터: 손님 3명) → 합격하면 자격증. */
  function takeLicense(id) {
    const L = LICENSES[id], r = payFee(state, id);
    if (!r.ok) { hud.toast(r.reason === 'money' ? '응시료가 부족해요' : '이미 있는 자격이에요'); return; }
    commit(r.state);
    beginOverlay();
    const fail = (why) => { endOverlay(); hud.toast(`${L.name} 불합격… ${why}`, 3800); };
    const pass = () => {
      commit(grant(state, id, state.clock.day));
      endOverlay();
      hud.banner(`${L.name} 합격!`, id === 'liquor' ? '라멘 로우에서 하이볼을 마실 수 있어요' : '라멘 로우에서 알바할 수 있어요', 3600);
      sound.play('done');
      player.cheerTime = 1.8;
    };
    const questions = id === 'liquor' ? liquorQuiz(L.questions) : ramenQuiz(L.questions);
    openQuiz(ui, {
      title: `${L.name} · 필기`, questions, pass: L.pass, seconds: L.seconds || 0, sound,
      onDone: (correct, ok) => {
        if (!ok) { fail('필기에서 떨어졌어요'); return; }
        if (id === 'liquor') openHighball(ui, { sound, onDone: (good) => (good ? pass() : fail('하이볼을 다시 연습해요')) });
        else openRamenShop(ui, { mode: 'exam', sound, onEnd: (res) => (res.completed ? pass() : fail(res.reason)) });
      }
    });
  }
  /** 라멘 로우 알바: 하루 한 번, 기운 15. 끝까지 일하면 기본급 + 그릇 보수, 일찍 그만두면 그릇 보수만. */
  function workRamen() {
    const can = canWorkRamen(state, state.clock.day);
    if (!can.ok) { hud.toast(can.reason === 'today' ? '오늘 근무는 끝났어요. 내일 또 와요' : '슈퍼 알바이터 자격이 있어야 해요'); return; }
    const used = useStamina(state, 15);
    if (!used.ok) { hud.toast('기운이 없어요. 쉬고 와요'); return; }
    commit(workedRamen(used.state, state.clock.day));
    beginOverlay();
    openRamenShop(ui, {
      mode: 'work', duration: 90, sound,
      onEnd: (res) => {
        const pay = res.completed ? shiftPay(res) : res.earned;
        commit(addMoney(state, pay));
        endOverlay();
        if (pay > 0) { hud.banner('알바 끝!', `${pay.toLocaleString('ko-KR')}원을 받았어요 · 손님 ${res.served}명`, 3200); sound.play('coin'); }
        else hud.toast('오늘은 한 그릇도 못 냈어요…');
      }
    });
  }
  /** 친밀도를 올리고(하루에 한 번), 하트가 늘거나 선물을 주면 알린다. */
  function reward(n, action) {
    const r = befriend(state, n.kind, action, state.clock.day);
    commit(r.state);
    if (r.gift) {
      sayAs(n, ['{name}, 우리 많이 친해졌지? 이거 선물이야!'], () => {
        hud.banner('선물을 받았어요!', `${FURNITURE[r.gift].name} · 집에서 '꾸미기'로 놓아요`, 3400);
        sound.play('done');
        endTalk();
      });
      return;
    }
    if (r.up) { hud.toast(`${FRIENDS[n.kind].name}와 더 친해졌어요 ${'♥'.repeat(r.hearts)}`, 3000); sound.play('job'); }
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

  // 같이 놀기
  const HANDS = [['scissors', '가위'], ['rock', '바위'], ['paper', '보']];
  function askPlay(n) {
    askAs(n, '좋아! 뭐 하고 놀까?', ['가위바위보', '술래잡기', '같이 춤추기', '다음에 놀자'], (i) => {
      if (i === 0) playRps(n, '가위바위보! 뭐 낼래?');
      else if (i === 1) sayAs(n, ['내가 도망갈게! 15초 안에 잡아 봐~'], () => startTag(n));
      else if (i === 2) sayAs(n, ['좋아~ 같이 춤추자! 하나, 둘, 셋!'], () => startDance(n));
      else endTalk();
    });
  }
  function playRps(n, line) {
    askAs(n, line, HANDS.map((h) => h[1]), (i) => {
      const theirs = pick(HANDS), res = rps(HANDS[i][0], theirs[0]), said = `나는 ${theirs[1]}!`;
      if (res === 'draw') { playRps(n, `${said} 비겼다! 한 번 더, 뭐 낼래?`); return; }
      if (res === 'win') { player.cheerTime = 1.6; sound.play('pass'); }
      else { npcs.emote(n, 'cheer', 1.6); sound.play('none'); }
      sayAs(n, [said, res === 'win' ? '으앗, 졌다…! {name} 잘한다~' : '내가 이겼다~! 헤헤'], () => {
        askAs(n, '한 판 더 할래?', ['한 판 더!', '그만할래'], (k) => { if (k === 0) playRps(n, '가위바위보! 뭐 낼래?'); else reward(n, 'play'); });
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
    if (caught) { player.cheerTime = 1.6; sound.play('pass'); } else npcs.emote(n, 'cheer', 1.6);
    sayAs(n, caught ? ['으앗, 잡혔다~!', '{name} 진짜 빠르다! 재밌었어~'] : ['못 잡았지롱~!', '헤헤, 다음엔 꼭 잡아 봐~'], () => reward(n, 'play'));
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
      hud.setTimer(tag.thief ? `소매치기 모몽가 잡기! ${Math.max(0, Math.ceil(tag.t))}초 · ${won(tag.thief)}`
        : ready ? `${FRIENDS[tag.n.kind].name}가 도망간다… 준비!` : `${FRIENDS[tag.n.kind].name} 잡기! ${Math.max(0, Math.ceil(tag.t))}초`);
      const caught = tag.head <= 0 && Math.hypot(tag.n.x - player.position.x, tag.n.z - player.position.z) < tag.n.chibi.radius + 0.45;
      if (caught || tag.t <= 0) endTag(caught);
    }
    if (dance) {
      dance.t -= dt;
      if (dance.t <= 0) {
        const n = dance.n;
        dance = null;
        sayAs(n, ['헤헤, 신난다~!', '{name} 춤 잘 추네!'], () => reward(n, 'play'));
      }
    }
    updateTheft(dt);
    if (escort && !guide.open && !talking && nearHome()) {
      escort = false;
      const h = npcs.byKind('hachiware');
      beginTalk(h);
      sayAs(h, ['여기가 네 집이야! 피곤하면 들어가서 푹 쉬어~'], () => { npcs.lead('hachiware', null); endTalk(); });
    }
  }

  // ---------- 마을 살림: 친구들도 게시판 일감을 받아 일하고, 쉬고, 라멘을 사 먹는다 ----------
  // 일감은 하루 한도를 나눠 쓰므로 친구들이 많이 받아 가면 내 몫이 줄어든다(core/villagers.js)
  const restUntil = {}; // 친구마다 다음에 할 일을 고를 시각(마을 살림 시계, 초)
  let lifeClock = 0, brainT = 0;
  let theft = null; // 모몽가가 살금살금 다가오는 중 { n, t }
  Object.keys(VILLAGERS).forEach((k) => { restUntil[k] = 20 + Math.random() * 100; }); // 시작하자마자 우르르 몰려가지 않게
  const boardSpot = () => ({ x: village.spots.board.x + 0.5, z: village.spots.board.z + 0.9 });
  /** 1.5초마다 친구들이 다음에 할 일을 고른다. */
  function villageLife(dt) {
    lifeClock += dt;
    brainT -= dt;
    if (brainT > 0 || !state) return;
    brainT = 1.5;
    const day = state.clock.day, hour = hourOf(state.clock);
    for (const kind of Object.keys(VILLAGERS)) {
      const n = npcs.byKind(kind);
      if (!n || npcs.busy(n) || n === talking || (tag && tag.n === n) || (theft && theft.n === n) || lifeClock < restUntil[kind]) continue;
      const plan = decide(state, kind, day, hour);
      if (plan.act === 'work') npcWork(n, plan.typeId);
      else if (plan.act === 'eat') npcEat(n);
      else restUntil[kind] = lifeClock + 25 + Math.random() * 50;
    }
    maybeSteal(day, hour);
  }
  /**
   * 친구가 게시판까지 걸어와서 일감을 받고(이때 게시판의 남은 수가 준다) → 실제로 일하고(뽑은 풀 · 딴 열매를 센다)
   * → 게시판으로 돌아와 다 했으면 보수를 받는다. 다 못 했으면 보수 없이 일감을 게시판에 다시 건다.
   */
  function npcWork(n, typeId) {
    const T = JOB_TYPES[typeId], b = boardSpot(), bench = village.spots.factory;
    const job = { day: 0, done: 0 };
    const steps = [{ do: 'walk', ...b }, {
      do: 'call',
      fn: () => {
        const r = villagerTakesJob(state, n.kind, typeId, state.clock.day);
        if (!r.ok) { // 오는 사이에 다른 누가 받아 갔다
          n.plan = null;
          npcs.say(n, '앗, 벌써 다 나갔네…');
          restUntil[n.kind] = lifeClock + 20 + Math.random() * 30;
          return;
        }
        job.day = state.clock.day;
        commit(r.state, false);
        npcs.say(n, `${T.title}, 내가 할게!`);
      }
    }];
    if (isWeedJob(T)) steps.push({ do: 'weeds', kind: T.kind, left: T.target, onPull: () => { job.done++; } });
    else if (T.kind === 'berry') steps.push({ do: 'berries', left: T.target, onPick: () => { job.done++; } });
    else steps.push({ do: 'walk', x: bench.x, z: bench.z }, { do: 'act', anim: 'read', time: T.target * 1.5, say: '스티커 붙이는 중…' }, { do: 'call', fn: () => { job.done = T.target; } });
    steps.push({ do: 'walk', ...b }, {
      do: 'call',
      fn: () => {
        if (job.done >= T.target) {
          const pay = villagerPay(typeId);
          commit(payVillager(state, n.kind, pay, state.clock.day), false);
          npcs.say(n, `보수 받았다~ +${won(pay)}`);
        } else {
          if (job.day === state.clock.day) commit(returnToBoard(state, typeId, job.day), false); // 그날 일감이면 다시 건다
          npcs.say(n, '다 못 했다… 일감은 돌려놓을게');
        }
        restUntil[n.kind] = lifeClock + 30 + Math.random() * 60;
      }
    });
    npcs.plan(n, steps);
  }
  /** 친구가 라멘 로우에서 라멘을 사 먹는다(지갑에서 나간다). */
  function npcEat(n) {
    const r = village.spots.ramen;
    npcs.plan(n, [{ do: 'walk', x: r.x + 0.4, z: r.z + 1.0 }, { do: 'act', anim: 'drink', time: 4, say: '후루룩~ 라멘 맛있다~' }, {
      do: 'call',
      fn: () => {
        commit(villagerSpend(state, n.kind, MEAL_PRICE, state.clock.day), false);
        restUntil[n.kind] = lifeClock + 40 + Math.random() * 60;
      }
    }]);
  }

  // ---------- 소매치기 모몽가: 하루 한 번쯤, 낮은 확률로 살금살금 다가와 지갑을 노린다 ----------
  function maybeSteal(day, hour) {
    if (theft || tag || mode !== 'play' || hour < 8 || hour >= 20 || tutorialActive(state.tutorial) || !canSteal(state, day)) return;
    if (funBusy() || panels.isOpen() || guide.open || sleeping || sticker || pulling) return;
    const m = npcs.byKind('momonga');
    if (!m || npcs.busy(m) || Math.hypot(m.x - player.position.x, m.z - player.position.z) > 5.5) return;
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
    npcs.say(m, '헤헤~ 귀여우니까 봐줘!');
    tag = { n: m, t: 15, head: 0.6, thief: amount };
    hud.banner('소매치기다!', `모몽가가 ${won(amount)}을 훔쳐 갔어요! 잡아요!${worn(state) ? ' (포셰트 덕분에 절반만)' : ''}`, 2600);
    sound.play('stamp');
  }
  function endThiefChase(m, amount, caught) {
    if (caught) {
      commit(recover(state, amount));
      beginTalk(m);
      player.cheerTime = 1.6;
      sound.play('coin');
      sayAs(m, ['으앗, 잡혔다!', '…흥! 돌려주면 되잖아. 귀여우니까 용서해 줘!'], () => { endTalk(); hud.toast(`${won(amount)}을 돌려받았어요!`, 3000); });
    } else {
      commit(thiefKeeps(state, amount, state.clock.day));
      hud.toast(`모몽가가 ${won(amount)}을 들고 도망쳤어요…`, 3600);
      sound.play('fail');
    }
  }

  // ---------- 상호작용 대상 ----------
  const PLACES = [['board', '게시판'], ['exam', '검정소'], ['ramen', '라멘 로우'], ['furniture', '가구점'], ['realty', '부동산'], ['pochette', '포셰트 가게'], ['books', '카니 헌책방'], ['tools', '도구점'], ['home', '집에 들어가기'], ['factory', '스티커 작업']];
  // 가장 가까운 대상을 고른다. 건물은 거리를 0.6 깎아 조금 우선한다.
  function findTarget() {
    const p = player.position;
    const options = [];
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
    const npc = npcs.nearest(p.x, p.z, 1.6);
    if (npc) options.push({ d: Math.hypot(npc.x - p.x, npc.z - p.z), t: { type: 'npc', npc, label: '말 걸기' } });
    for (const [key, label] of PLACES) {
      const s = village.spots[key], d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 1.8) options.push({ d: d - 0.6, t: { type: key, label: key === 'home' && isEvicted(state) ? '집(잠김)' : label } });
    }
    // 쫓겨났으면 밤에는 아무 데서나 노숙할 수 있다(가까운 다른 대상이 먼저)
    if (isEvicted(state) && bedtime()) options.push({ d: 1.7, t: { type: 'rough', label: '노숙하기' } });
    options.sort((a, b) => a.d - b.d);
    return options.length ? options[0].t : null;
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
    gfx.setSky(skyTop, skyHorizon);
    sun.intensity = a.sun + (b.sun - a.sun) * k;
    hemi.intensity = a.hemi + (b.hemi - a.hemi) * k;
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
    village.setNight(Math.min(1, Math.max(0, (0.6 - day) / 0.4))); // 해가 지면 가로등과 창문에 불이 들어온다
  }

  // ---------- 시작: 타이틀 → (새 게임이면 캐릭터 만들기) → 입장 연출 → 플레이 ----------
  // mode: 'title'(타이틀·캐릭터 만들기, 카메라가 마을 위를 돈다) | 'intro'(입장 연출) | 'play'
  let mode = 'title';
  let intro = null;
  const setCinematic = (on) => document.body.classList.toggle('cinematic', on);
  setCinematic(true);

  /** 저장된(또는 새) 상태로 마을 입구에서 입장한다. */
  function beginSession(next, fresh) {
    lastRegion = null; // 다시 시작해도 구역 알림이 잘못 뜨지 않게
    // 예전 저장에는 시작 날짜가 없다: 지금 날이 오늘이 되도록 거꾸로 맞춘다
    if (!next.startDate) next = { ...next, startDate: todayISO(new Date(Date.now() - (next.clock.day - 1) * 86400000)) };
    // 예전 저장의 위치가 새 배치에서 건물 · 물 위면 광장으로
    if (!village.isFree(next.player.x, next.player.z, 0.35)) next = { ...next, player: { ...village.spots.plaza } };
    state = next;
    knownDay = state.clock.day; // 저장된 날까지는 처리가 끝났다
    const chibi = buildChibi(myLook());
    if (!player) {
      player = createPlayer(scene, chibi, village);
      intro = createIntro(ui, { player, cam, npcs, village, sound });
    } else player.setModel(chibi);
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
  if (!store.available) setTimeout(() => hud.toast('이 브라우저는 저장이 꺼져 있어요. 창을 닫으면 진행이 사라져요', 5000), 600);
  // 창을 닫거나 다른 앱으로 갈 때도 저장한다
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  window.addEventListener('pagehide', save);
  const signLabels = village.labels.map((l, i) => ({ id: 'sign-' + i, ...l, kind: 'sign' }));
  const homeSign = signLabels.find((l) => l.text === '내 집'); // 사기 전에는 '빌린 집'

  // ---------- 루프 ----------
  let last = performance.now(), t = 0, crashed = false;
  const titlePos = new THREE.Vector3(), titleLook = new THREE.Vector3(0, 0, 1);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      tick(dt);
    } catch (e) {
      // 한 프레임의 오류로 화면 전체가 멈추지 않게 한다
      if (!crashed) { crashed = true; console.error(e); hud.toast('문제가 생겼어요. 계속 안 되면 새로고침해 주세요', 5000); }
    }
  }

  let skipRender = false; // 디버그 step 중에는 그리지 않는다
  // 로컬 확인용: 주소에 ?debug 가 있을 때만 시간을 직접 흘리는 훅을 연다
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
    window.__town = {
      // 시간을 흘린다. 그리기는 마지막 한 번만(느린 확인 환경에서도 빨리 돌게)
      step(seconds, dt = 1 / 30) { skipRender = true; try { for (let s = 0; s < seconds; s += dt) tick(dt); } finally { skipRender = false; } },
      get state() { return state; },
      get target() { return target && { type: target.type, label: target.label }; },
      player: () => player && { ...player.position },
      teleport(x, z) { player.setPosition(x, z); },
      weeds: () => weeds.list.map((w) => ({ kind: w.kind, area: w.area, x: w.x, z: w.z, stage: w.stage, hidden: !!w.hidden, visible: w.mesh.visible })),
      weedCounts: () => weeds.counts(),
      pull: () => pulling && { kind: pulling.weed.kind, power: pulling.pull.power, from: pulling.pull.greenFrom, to: pulling.pull.greenTo, label: pulling.label },
      npcs: () => npcs.list.map((n) => ({ kind: n.kind, x: n.x, z: n.z, r: n.chibi.radius, state: n.state, task: n.task && (n.task.anim || n.task.type),
        prop: n.prop, plan: n.plan ? n.plan.map((s) => s.do) : null, stuck: n.stuck || 0, path: n.path ? n.path.length : null })),
      npc: (kind) => npcs.byKind(kind), // 친구 하나를 직접 들여다보기
      spots: village.spots,
      free: (x, z, r) => village.isFree(x, z, r),
      patch: (p) => { state = { ...state, ...p }; if (p.tutorial) { guide.setGoal(null); npcs.setFollow('hachiware', tutorialActive(p.tutorial)); } },
      berries: () => berries.list.map((b) => ({ x: b.x, z: b.z, ready: b.ready })),
      cellAt: (fx, fy) => interior.cellAt(fx * 2 - 1, -(fy * 2 - 1)),
      mode: () => mode,
      action: (down) => input.setAction(down),
      drawCalls: () => gfx.renderer.info.render.calls,
      scene: () => scene, // 그리기 호출을 무엇이 쓰는지 들여다보기
      region: () => player && regionAt(player.position.x, player.position.z)
    };
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
    const aspect = gfx.resize();
    // 집 안: 마을 대신 집 안 장면을 그린다(시간은 흐르고, 마을 친구들도 계속 지낸다)
    if (mode === 'home' && state) {
      if (!sleeping) state = { ...state, clock: advance(state.clock, dt) };
      newDayCheck();
      villageLife(dt);
      weeds.update(dt, { night: nightNow, focus: player.position });
      berries.update(dt);
      npcs.update(dt, t, player.position);
      interior.resize(aspect);
      interior.update(dt, t);
      setCelLight(INDOOR_LIGHT);
      lights.update('off', player.position, player.yaw, 0);
      if (!skipRender) gfx.renderer.render(interior.scene, interior.camera);
      hud.placeLabels([], cam.camera);
      saveTimer += dt;
      if (saveTimer > 10) { saveTimer = 0; save(); }
      return;
    }
    cam.setAspect(aspect);
    village.update(dt, player ? player.position : null);
    weeds.update(dt, { night: nightNow, focus: player && mode !== 'title' ? player.position : village.spots.plaza });
    berries.update(dt);

    const focus = player && mode !== 'title' ? player.position : village.spots.plaza;
    if (state && player && mode === 'intro') {
      player.update(dt, input);
      intro.update(dt);
    } else if (state && player && mode === 'play') {
      if (!panels.isOpen() && !sleeping) state = { ...state, clock: advance(state.clock, dt) };
      newDayCheck();
      player.update(dt, input);
      if (pulling) {
        const before = pulling.pull.power;
        pulling.pull = chargePull(pulling.pull, dt);
        player.power = pulling.pull.power;
        sound.chargeUpdate(player.power);
        if (before < pulling.pull.greenFrom && player.power >= pulling.pull.greenFrom) sound.play('zone'); // 지금 떼면 깔끔하게!
        weeds.tug(pulling.weed, pulling.pull.power);
        hud.showMeter(pulling.pull.power, { from: pulling.pull.greenFrom, to: pulling.pull.greenTo }, pulling.label);
      }
      target = pulling || panels.isOpen() || guide.open || sleeping || sticker || funBusy() ? null : findTarget();
      updateFun(dt);
      villageLife(dt);
      hud.setAction(pulling ? '뽑는 중' : target ? target.label : null);
      hud.render(state);
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
        lastRegion = r;
      }
      // 안내: 목표를 이루면(창을 닫고 손을 뗀 뒤에) 다음 단계로
      if (tutorialActive(state.tutorial) && !guide.open && !panels.isOpen() && !pulling) {
        const next = tutorialNext(state.tutorial, state, { nearHome: nearHome() });
        if (next !== state.tutorial) enterTutorial(next, state.tutorial);
      }
      saveTimer += dt;
      if (saveTimer > 10) { saveTimer = 0; save(); }
    }
    npcs.update(dt, t, focus);
    applySky(state ? state.clock : { day: 1, t: 0.15 });
    if (mode === 'play') cam.follow(focus, dt);
    else if (mode === 'title') {
      // 타이틀: 마을 위를 천천히 돈다
      const a = t * 0.07;
      titlePos.set(Math.sin(a) * 34, 16, Math.cos(a) * 34 + 2);
      cam.set(titlePos, titleLook);
    }
    gfx.followSun(focus.x, focus.z);
    if (!skipRender) gfx.render(cam.camera);
    if (homeSign && state) homeSign.text = housingOf(state).own ? '내 집' : isEvicted(state) ? '빈집' : '빌린 집';
    const bubbles = npcs.labels(), mark = mode === 'play' ? tutorialMarker() : null;
    if (mark) bubbles.push(mark);
    // 간판은 가까운 것만(넓어진 월드에서 먼 간판까지 계산하지 않게)
    const near = signLabels.filter((l) => Math.abs(l.x - focus.x) < 45 && Math.abs(l.z - focus.z) < 45);
    hud.placeLabels(bubbles.length ? near.concat(bubbles) : near, cam.camera);
  }
  requestAnimationFrame(frame);
}

boot();
