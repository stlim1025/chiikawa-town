import * as THREE from 'three';
import { toonMaterial, addOutline, GEO } from '../render/toon.js';
import { part, mergeParts } from '../render/merge.js';
import { MONSTERS, inSwing } from '../core/combat.js';
import { regionAt, shoreDist, groundY, VILLAGE_R, CAVE } from '../core/layout.js';

/**
 * 마을 밖 몬스터(4단계): 이 게임만의 오리지널 생물. 모양은 부품을 쌓아 한 덩어리로 합치고(몸 + 외곽선, 얼굴),
 * 나방 날개처럼 움직이는 부분만 따로 둔다. 구역마다 정해진 수만큼 살고, 쓰러지면 잠시 뒤 내 눈에 안 띄는 곳에서 다시 생긴다.
 * 행동: 어슬렁(집 둘레) → 내가 가까이 오면 쫓아옴 → 종류마다 다른 공격(바닥의 빨간 표시로 예고) → 잠깐 휘청(이때 때리기 좋다)
 * → 다시 쫓기. 집에서 너무 멀어지거나 내가 마을 울타리 안으로 들어가면 돌아간다. 마을 안으로는 절대 들어오지 않는다.
 */

/** 구역마다 사는 수와 자리. */
const SPAWN = {
  fluff: { n: 8, area: 'fields' },
  hopper: { n: 6, area: 'fields' },
  mole: { n: 4, area: 'fields' },
  beetle: { n: 7, area: 'forest' },
  shroom: { n: 6, area: 'forest' },
  stump: { n: 4, area: 'forest' },
  slime: { n: 7, area: 'river' },
  frog: { n: 6, area: 'river' },
  crab: { n: 5, area: 'river' },
  turtle: { n: 5, area: 'mountain' },
  pebble: { n: 6, area: 'mountain' },
  ram: { n: 5, area: 'mountain' },
  moth: { n: 12, area: 'night' }
};
const AREAS = {
  fields: { box: [36, 72, -42, 42], ok: (x, z) => regionAt(x, z) === 'fields' },
  forest: { box: [-72, -36, -42, 42], ok: (x, z) => regionAt(x, z) === 'forest' },
  river: { box: [-62, 62, 30, 70], ok: (x, z) => regionAt(x, z) === 'river' && shoreDist(x, z) > 1.2 && shoreDist(x, z) < 7 },
  mountain: { box: [-52, 52, -70, -38], ok: (x, z) => regionAt(x, z) === 'mountain' && Math.hypot(x - CAVE.x, z - CAVE.z) > 9 },
  night: { box: [-72, 72, -70, 70], ok: (x, z) => regionAt(x, z) !== 'village' && shoreDist(x, z) > 1 }
};
/** 이보다 멀면 움직이지도 그리지도 않는다. */
const ACTIVE_DIST = 48;
/** 집에서 이만큼 멀어지면 쫓기를 그만두고 돌아간다. */
const LEASH = 15;
/** 울타리 밖 이만큼까지만 다가온다. */
const FENCE = VILLAGE_R + 1.4;
const REFILL_SECONDS = 20;
/** 내 몸 반지름(맞았는지 잴 때 더한다). */
const ME = 0.32;

/**
 * 공격 방식. 모두 '예고(wind) → 공격(act) → 휘청(rec) → 쉬기(cool)' 순서다.
 * range: 이만큼 가까우면 공격을 시작, keep: 멀리서 쏘는 몬스터가 지키는 거리, lock: 예고 중 이 비율이 지나면 겨눈 곳을 굳힌다(그 뒤로 피할 수 있다).
 *  bump   붙어서 들이받기                 leap/stomp  겨눈 곳으로 뛰어올라 내려앉으며 둘레를 친다
 *  burrow 땅속으로 파고들어 발밑에서 튀어나옴  charge/roll/dive  겨눈 쪽으로 일직선 돌진(roll 은 벽에 한 번 튕긴다, dive 는 하늘에서)
 *  shoot/spit 멀리서 탄을 쏜다              slam  제자리에서 뛰어 둘레를 쿵
 *  tongue 일직선 혀 채찍                   combo 집게로 세 번 연달아       spin  등껍질 회전으로 따라오며 부딪친다
 */
const ATK = {
  bump: { reach: 0.5, wind: 0.45, cool: 1.0, rec: 0.3 },
  leap: { range: 5.2, wind: 0.6, lock: 0.6, air: 0.6, radius: 1.0, height: 1.3, cool: 1.5, rec: 0.6 },
  stomp: { range: 5.6, wind: 0.8, lock: 0.55, air: 0.85, radius: 1.45, height: 2.3, cool: 2.0, rec: 0.9 },
  burrow: { range: 7, wind: 0.5, travel: 4.4, maxT: 2.6, warn: 0.65, radius: 1.05, cool: 2.0, rec: 0.8 },
  charge: { range: 6, wind: 0.7, lock: 0.65, speed: 9.5, len: 6.5, width: 0.95, cool: 1.8, rec: 0.7 },
  roll: { range: 7.5, wind: 0.8, lock: 0.6, speed: 7.5, len: 11, width: 1.0, bounce: 1, cool: 2.2, rec: 1.0 },
  dive: { range: 6.5, wind: 0.7, lock: 0.6, speed: 10, len: 7, width: 0.95, cool: 1.8, rec: 0.6 },
  shoot: { keep: 4.6, range: 7, wind: 0.65, n: 3, spread: 0.34, speed: 5.6, r: 0.24, life: 1.9, color: '#c39be8', cool: 2.2, rec: 0.35 },
  spit: { keep: 4.2, range: 6.6, wind: 0.65, n: 1, spread: 0, speed: 4.6, r: 0.38, life: 2.0, color: '#4fa3e6', cool: 1.9, rec: 0.35 },
  slam: { range: 1.8, wind: 0.85, radius: 2.1, cool: 2.0, rec: 0.8 },
  tongue: { range: 3.6, wind: 0.75, lock: 0.5, len: 3.9, width: 0.5, show: 0.3, cool: 1.6, rec: 0.5 },
  combo: { range: 1.25, wind: 0.4, n: 3, gap: 0.32, reach: 0.85, cool: 1.7, rec: 0.7 },
  spin: { range: 6, wind: 0.75, dur: 2.2, speed: 4.8, turn: 2.0, cool: 2.2, rec: 1.2 },
  // 왕버섯: 가까우면 넓게 내려찍기, 멀면 포자를 사방으로
  bossSlam: { range: 3.2, wind: 1.0, radius: 2.9, cool: 1.6, rec: 1.0, kind: 'slam' },
  bossShoot: { range: 10, wind: 0.85, n: 10, spread: (Math.PI * 2) / 10, ring: true, speed: 4.2, r: 0.32, life: 2.6, color: '#f08070', dmgK: 0.7, cool: 1.6, rec: 0.6, kind: 'shoot' }
};
Object.entries(ATK).forEach(([k, a]) => { if (!a.kind) a.kind = k; });
/** 맞아도 움츠리기를 멈추지 않는 단단한 몬스터. */
const HEAVY = { turtle: true, kingcap: true, stump: true, pebble: true };

// ---------- 모양 ----------
const EYE = '#2b2224', SHINE = '#ffffff', BLUSH = '#ff9fb4';
/** 앞(+z)을 보는 얼굴: 눈(반짝임) + 눈썹. tilt: 눈썹 기울기(+ 화남, − 졸림/순함). */
function face(g, { y, z, dx, r = 0.045, brow = 0.35, browY = 0.075, color = EYE, browLen = 0.07 }) {
  [-1, 1].forEach((sd) => {
    part(g, GEO.dot, color, { position: [sd * dx, y, z], scale: [r, r * 1.25, r * 0.5], flat: true });
    part(g, GEO.dot, SHINE, { position: [sd * dx - r * 0.3, y + r * 0.45, z + r * 0.35], scale: [r * 0.35, r * 0.35, r * 0.2], flat: true });
    if (brow !== null) part(g, GEO.box, EYE, { position: [sd * dx, y + browY, z - 0.005], rotation: [0, 0, sd * brow], scale: [browLen, 0.018, 0.012], flat: true });
  });
}
/** 바깥(구 표면)을 향해 선 원뿔 하나. */
function spike(g, color, cx, cy, cz, R, tilt, yaw, scale) {
  const x = cx + Math.sin(tilt) * Math.sin(yaw) * R, y = cy + Math.cos(tilt) * R, z = cz + Math.sin(tilt) * Math.cos(yaw) * R;
  part(g, GEO.cone, color, { position: [x, y, z], rotation: [tilt, yaw, 0], scale });
}
const HORN = new THREE.TorusGeometry(1, 0.34, 8, 16, Math.PI * 1.5);

/** 종류별 모양. → { height: 머리 위 높이, hover: 떠 있는 높이 } 을 돌려주고 g 에 부품을 붙인다. wings 가 있으면 날개 부품 목록. */
const BUILD = {
  // 풀뭉치: 동그란 풀 덩어리에 뾰족한 잎이 삐죽삐죽, 꼭대기에 하얀 꽃 하나
  fluff(g) {
    part(g, GEO.sphere, '#7cc25e', { position: [0, 0.4, 0], scale: [0.42, 0.38, 0.42] });
    let k = 0;
    for (const [tilt, n, len] of [[0.25, 5, 0.26], [0.75, 8, 0.22], [1.25, 9, 0.17]]) {
      for (let i = 0; i < n; i++, k++) {
        const yaw = (i / n) * Math.PI * 2 + tilt * 1.7;
        if (tilt > 1 && Math.abs(Math.sin(yaw / 2)) < 0.42) continue; // 얼굴 앞은 비운다
        spike(g, k % 3 ? '#5fae4f' : '#8fd16a', 0, 0.4, 0, 0.33, tilt, yaw, [0.085, len, 0.085]);
      }
    }
    part(g, GEO.dot, '#fff7fa', { position: [0.06, 0.82, -0.02], scale: [0.07, 0.05, 0.07] });
    part(g, GEO.dot, '#ffd94a', { position: [0.06, 0.85, -0.02], scale: [0.03, 0.025, 0.03] });
    [-1, 1].forEach((sd) => part(g, GEO.sphere, '#4f9a48', { position: [sd * 0.17, 0.06, 0.12], scale: [0.11, 0.07, 0.13] }));
    face(g, { y: 0.44, z: 0.385, dx: 0.13, brow: 0.45 });
    part(g, GEO.box, EYE, { position: [0, 0.33, 0.405], scale: [0.07, 0.016, 0.01], flat: true });
    return { height: 1.0 };
  },
  // 도토리 뿔벌레: 도토리 껍데기를 등에 쓴 갈색 벌레, 머리에 뿔 하나
  beetle(g) {
    const k = 1.15, P = (x, y, z) => [x * k, y * k, z * k], S = (x, y, z) => [x * k, y * k, z * k];
    part(g, GEO.sphere, '#7a5538', { position: P(0, 0.22, 0.02), scale: S(0.34, 0.2, 0.42) });
    part(g, GEO.sphere, '#e0ad6a', { position: P(0, 0.34, -0.06), scale: S(0.33, 0.25, 0.37) });
    part(g, GEO.sphere, '#94643a', { position: P(0, 0.47, -0.08), scale: S(0.36, 0.13, 0.39) });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      part(g, GEO.dot, '#74482a', { position: P(Math.sin(a) * 0.26, 0.53, -0.08 + Math.cos(a) * 0.28), scale: S(0.04, 0.025, 0.04) });
    }
    part(g, GEO.cylinder, '#5a3b28', { position: P(0, 0.56, -0.08), rotation: [0, 0, 0.3], scale: S(0.03, 0.1, 0.03) });
    part(g, GEO.sphere, '#634230', { position: P(0, 0.27, 0.36), scale: S(0.2, 0.17, 0.17) });
    part(g, GEO.cone, '#f6e2b4', { position: P(0, 0.37, 0.43), rotation: [0.62, 0, 0], scale: S(0.07, 0.34, 0.07) });
    [-0.15, 0.06, 0.26].forEach((z) => [-1, 1].forEach((sd) => part(g, GEO.dot, '#3e2a1d', { position: P(sd * 0.3, 0.06, z), rotation: [0, 0, sd * 0.5], scale: S(0.07, 0.04, 0.05) })));
    face(g, { y: 0.29 * k, z: 0.515 * k, dx: 0.095, r: 0.045, brow: 0.5, browY: 0.07, browLen: 0.065 });
    return { height: 0.95 };
  },
  // 물방울 슬라임: 진한 파란 물방울(강물보다 진해서 물가에서도 잘 보인다). 꼭대기가 살짝 뒤로 흐르고, 바닥은 웅덩이처럼 퍼진다.
  // 왼쪽 위에 밝은 물빛 · 하얀 반짝임, 앞에 큰 눈과 볼
  slime(g) {
    const k = 1.2, P = (x, y, z) => [x * k, y * k, z * k];
    part(g, GEO.sphere, '#3f8fd0', { position: P(0, 0.04, 0), scale: P(0.48, 0.07, 0.48) });
    part(g, GEO.sphere, '#56aeea', { position: P(0, 0.33, 0), scale: P(0.42, 0.34, 0.42) });
    part(g, GEO.cone, '#56aeea', { position: P(0, 0.53, -0.05), rotation: [-0.35, 0, 0], scale: P(0.17, 0.3, 0.17) });
    part(g, GEO.sphere, '#9fdcfa', { position: P(-0.15, 0.47, 0.16), rotation: [0, 0, 0.5], scale: P(0.13, 0.08, 0.12) });
    part(g, GEO.dot, SHINE, { position: P(-0.2, 0.5, 0.3), rotation: [0, 0, 0.6], scale: P(0.07, 0.035, 0.03), flat: true });
    part(g, GEO.dot, SHINE, { position: P(-0.29, 0.38, 0.3), scale: P(0.028, 0.028, 0.02), flat: true });
    face(g, { y: 0.36 * k, z: 0.405 * k, dx: 0.13 * k, r: 0.058, brow: null });
    [-1, 1].forEach((sd) => part(g, GEO.dot, BLUSH, { position: P(sd * 0.24, 0.27, 0.35), scale: P(0.055, 0.028, 0.02), flat: true }));
    part(g, GEO.dot, EYE, { position: P(0, 0.26, 0.41), scale: P(0.045, 0.032, 0.015), flat: true });
    return { height: 1.1 };
  },
  // 이끼 거북: 바위 같은 등딱지에 이끼 방석과 새싹, 졸린 눈
  turtle(g) {
    part(g, GEO.sphere, '#7d756c', { position: [0, 0.18, 0], scale: [0.6, 0.12, 0.66] });
    part(g, GEO.sphere, '#a39a8f', { position: [0, 0.3, -0.02], scale: [0.54, 0.38, 0.6] });
    [[0.12, 0.6, -0.1, 0.2], [-0.2, 0.55, 0.12, 0.16], [0.24, 0.5, 0.2, 0.13], [-0.15, 0.52, -0.3, 0.15], [0.05, 0.42, 0.42, 0.1]].forEach(([x, y, z, r], i) =>
      part(g, GEO.sphere, i % 2 ? '#93c46a' : '#7fae5a', { position: [x, y, z], scale: [r, r * 0.45, r] }));
    [[0.1, -0.14], [-0.05, -0.05], [0.17, -0.02]].forEach(([x, z], i) => part(g, GEO.cone, i % 2 ? '#6f9e4f' : '#86b85e', { position: [x, 0.66, z], rotation: [0.3 * (i - 1), i, 0], scale: [0.04, 0.16, 0.04] }));
    part(g, GEO.dot, '#ffc6d6', { position: [-0.2, 0.62, 0.13], scale: [0.035, 0.03, 0.035] });
    part(g, GEO.sphere, '#a7b98a', { position: [0, 0.3, 0.64], scale: [0.21, 0.18, 0.22] });
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => part(g, GEO.sphere, '#a7b98a', { position: [sx * 0.4, 0.08, sz * 0.34], scale: [0.13, 0.1, 0.14] }));
    part(g, GEO.cone, '#a7b98a', { position: [0, 0.14, -0.62], rotation: [-1.9, 0, 0], scale: [0.06, 0.14, 0.06] });
    face(g, { y: 0.34, z: 0.84, dx: 0.09, r: 0.04, brow: -0.15, browY: 0.04, browLen: 0.07 });
    return { height: 1.0 };
  },
  // 그림자 나방: 보랏빛 복슬복슬한 몸과 큰 날개, 날개마다 밤에 빛나는 달무늬. 노란 눈
  moth(g, wings, glow) {
    part(g, GEO.sphere, '#4a3a6a', { position: [0, 0, -0.06], scale: [0.17, 0.18, 0.3] });
    part(g, GEO.sphere, '#7a68a0', { position: [0, 0.04, 0.14], scale: [0.2, 0.17, 0.13] });
    part(g, GEO.sphere, '#3e3060', { position: [0, 0.08, 0.3], scale: [0.14, 0.13, 0.12] });
    [-1, 1].forEach((sd) => {
      part(g, GEO.cylinder, '#3e3060', { position: [sd * 0.05, 0.17, 0.33], rotation: [0.4, 0, -sd * 0.5], scale: [0.012, 0.2, 0.012] });
      part(g, GEO.dot, '#9a88c4', { position: [sd * 0.135, 0.33, 0.39], scale: [0.035, 0.05, 0.02] });
    });
    [-1, 1].forEach((sd) => {
      part(g, GEO.dot, '#ffe36e', { position: [sd * 0.065, 0.1, 0.405], scale: [0.04, 0.045, 0.02], flat: true });
      part(g, GEO.dot, EYE, { position: [sd * 0.065, 0.095, 0.418], scale: [0.018, 0.03, 0.01], flat: true });
      part(g, GEO.box, EYE, { position: [sd * 0.07, 0.16, 0.4], rotation: [0, 0, sd * 0.5], scale: [0.06, 0.016, 0.01], flat: true });
    });
    // 날개(오른쪽 기준으로 만들고 왼쪽은 거울): 큰 앞날개 + 작은 뒷날개 + 달무늬
    const w = new THREE.Group();
    part(w, GEO.sphere, '#6e5a9a', { position: [0.46, 0.02, 0.06], rotation: [0, 0.25, 0], scale: [0.5, 0.03, 0.34] });
    part(w, GEO.sphere, '#8470b0', { position: [0.3, 0, -0.27], rotation: [0, -0.3, 0], scale: [0.3, 0.028, 0.23] });
    part(w, GEO.sphere, '#4a3a70', { position: [0.72, 0.035, 0.1], rotation: [0, 0.25, 0], scale: [0.2, 0.025, 0.16] });
    wings.push(w);
    glow.push({ position: [0.56, 0.055, 0.08], scale: [0.1, 0.03, 0.1] }, { position: [0.33, 0.04, -0.28], scale: [0.06, 0.025, 0.06] });
    return { height: 1.65, hover: 1.0 };
  },
  // 바위산 왕버섯: 붉은 갓에 크림색 점, 통통한 기둥에 화난 얼굴과 짧은 팔
  kingcap(g) {
    part(g, GEO.sphere, '#f3e6cf', { position: [0, 0.62, 0], scale: [0.62, 0.66, 0.58] });
    // 갓은 뒤로 살짝 젖혀서 위에서 내려다봐도 얼굴이 보이게
    const cap = new THREE.Group();
    cap.position.set(0, 1.12, -0.1);
    cap.rotation.x = -0.3;
    g.add(cap);
    part(cap, GEO.sphere, '#efd9b5', { position: [0, 0.04, 0], scale: [1.08, 0.2, 1.08] });
    part(cap, GEO.sphere, '#c0473c', { position: [0, 0.2, 0], scale: [1.18, 0.56, 1.18] });
    [[0, 0.72, 0, 0.22], [0.6, 0.5, 0.35, 0.17], [-0.55, 0.53, 0.4, 0.15], [0.3, 0.54, -0.6, 0.18], [-0.45, 0.48, -0.5, 0.16], [0.85, 0.33, -0.2, 0.13], [-0.88, 0.3, -0.05, 0.13], [0.1, 0.43, 0.85, 0.14]].forEach(([x, y, z, r]) =>
      part(cap, GEO.sphere, '#fff3dc', { position: [x, y, z], scale: [r, r * 0.45, r] }));
    [-1, 1].forEach((sd) => {
      part(g, GEO.sphere, '#f3e6cf', { position: [sd * 0.66, 0.6, 0.08], rotation: [0, 0, sd * 0.6], scale: [0.14, 0.24, 0.14] });
      part(g, GEO.sphere, '#d9c7a6', { position: [sd * 0.3, 0.06, 0.1], scale: [0.22, 0.09, 0.26] });
    });
    face(g, { y: 0.78, z: 0.56, dx: 0.2, r: 0.075, brow: 0.55, browY: 0.13, browLen: 0.13 });
    part(g, GEO.dot, '#6b2b2b', { position: [0, 0.48, 0.565], scale: [0.18, 0.08, 0.03], flat: true });
    [-0.08, 0.08].forEach((x) => part(g, GEO.box, SHINE, { position: [x, 0.53, 0.6], scale: [0.06, 0.04, 0.01], flat: true }));
    return { height: 2.25 };
  },
  // 연습용 허수아비: 나무 기둥 + 가로대, 짚 자루 몸에 과녁, 바느질 눈
  dummy(g) {
    part(g, GEO.box, '#9a6a3c', { position: [0, 0.55, 0], scale: [0.08, 1.1, 0.08] });
    part(g, GEO.box, '#9a6a3c', { position: [0, 0.78, 0], scale: [0.86, 0.07, 0.07] });
    part(g, GEO.sphere, '#e8c97a', { position: [0, 0.66, 0], scale: [0.28, 0.32, 0.22] });
    part(g, GEO.sphere, '#f3dfa8', { position: [0, 1.12, 0], scale: [0.22, 0.22, 0.2] });
    part(g, GEO.cone, '#c96a4a', { position: [0, 1.28, 0], scale: [0.2, 0.18, 0.2] });
    [-1, 1].forEach((sd) => part(g, GEO.cone, '#e8c36a', { position: [sd * 0.46, 0.78, 0], rotation: [0, 0, -sd * 1.57], scale: [0.07, 0.13, 0.07] }));
    part(g, GEO.dot, '#e2574c', { position: [0, 0.68, 0.21], scale: [0.13, 0.13, 0.02], flat: true });
    part(g, GEO.dot, SHINE, { position: [0, 0.68, 0.225], scale: [0.08, 0.08, 0.02], flat: true });
    part(g, GEO.dot, '#e2574c', { position: [0, 0.68, 0.235], scale: [0.035, 0.035, 0.02], flat: true });
    [-1, 1].forEach((sd) => [0.785, -0.785].forEach((r) => part(g, GEO.box, EYE, { position: [sd * 0.08, 1.15, 0.2], rotation: [0, 0, r], scale: [0.06, 0.014, 0.01], flat: true })));
    part(g, GEO.box, EYE, { position: [0, 1.05, 0.205], scale: [0.09, 0.012, 0.01], flat: true });
    return { height: 1.5 };
  },
  // 풀잎 메뚜기: 연두 몸통에 큰 머리, 접힌 굵은 뒷다리, 등에 잎 날개 둘, 더듬이
  hopper(g) {
    part(g, GEO.sphere, '#8fcf5a', { position: [0, 0.3, -0.08], scale: [0.2, 0.19, 0.34] });
    part(g, GEO.sphere, '#a6d96a', { position: [0, 0.42, 0.24], scale: [0.21, 0.2, 0.19] });
    [-1, 1].forEach((sd) => {
      part(g, GEO.sphere, '#5f9e3a', { position: [sd * 0.08, 0.47, -0.14], rotation: [0.12, sd * 0.2, 0], scale: [0.1, 0.03, 0.32] });
      part(g, GEO.sphere, '#7cbf4c', { position: [sd * 0.22, 0.36, -0.14], rotation: [-0.8, 0, sd * 0.2], scale: [0.085, 0.24, 0.1] });
      part(g, GEO.cylinder, '#5f9a3a', { position: [sd * 0.25, 0.02, -0.34], rotation: [0.95, 0, 0], scale: [0.03, 0.38, 0.03] });
      part(g, GEO.cylinder, '#5f9a3a', { position: [sd * 0.1, 0, 0.14], rotation: [0, 0, -sd * 0.35], scale: [0.025, 0.25, 0.025] });
      part(g, GEO.cylinder, '#5f9a3a', { position: [sd * 0.06, 0.58, 0.28], rotation: [0.6, 0, -sd * 0.55], scale: [0.012, 0.28, 0.012] });
    });
    face(g, { y: 0.45, z: 0.425, dx: 0.085, r: 0.042, brow: 0.45, browY: 0.07, browLen: 0.06 });
    part(g, GEO.box, EYE, { position: [0, 0.35, 0.42], scale: [0.06, 0.014, 0.01], flat: true });
    return { height: 0.95 };
  },
  // 흙두더지: 흙더미 위 통통한 회갈색 몸, 분홍 코, 크고 하얀 손과 발톱, 머리털 세 가닥
  mole(g) {
    part(g, GEO.sphere, '#9a7552', { position: [0, 0.03, 0], scale: [0.55, 0.08, 0.55] });
    part(g, GEO.sphere, '#7d5f52', { position: [0, 0.34, 0], scale: [0.4, 0.36, 0.38] });
    part(g, GEO.sphere, '#c9a68a', { position: [0, 0.28, 0.17], scale: [0.27, 0.24, 0.24] });
    part(g, GEO.sphere, '#ff9fb4', { position: [0, 0.31, 0.41], scale: [0.085, 0.065, 0.065] });
    [-1, 1].forEach((sd) => {
      part(g, GEO.sphere, '#f3e2cf', { position: [sd * 0.33, 0.2, 0.24], rotation: [0, sd * 0.4, 0], scale: [0.13, 0.06, 0.14] });
      [-0.06, 0, 0.06].forEach((o) => part(g, GEO.cone, '#fffaf0', { position: [sd * 0.36 + o, 0.2, 0.33], rotation: [Math.PI / 2, 0, 0], scale: [0.025, 0.1, 0.025] }));
      part(g, GEO.dot, BLUSH, { position: [sd * 0.17, 0.34, 0.37], scale: [0.045, 0.022, 0.015], flat: true });
    });
    [-0.08, 0, 0.08].forEach((x) => part(g, GEO.cone, '#6a4f44', { position: [x, 0.66, -0.02], rotation: [0, 0, -x * 3], scale: [0.04, 0.1, 0.04] }));
    face(g, { y: 0.44, z: 0.385, dx: 0.1, r: 0.036, brow: 0.5, browY: 0.065, browLen: 0.06 });
    return { height: 1.0 };
  },
  // 보라 독버섯: 크림색 기둥에 화난 얼굴, 뒤로 젖힌 보라 갓에 하얀 점
  shroom(g) {
    part(g, GEO.sphere, '#f3e6cf', { position: [0, 0.22, 0], scale: [0.22, 0.25, 0.2] });
    [-1, 1].forEach((sd) => part(g, GEO.sphere, '#e2cfb0', { position: [sd * 0.1, 0.04, 0.04], scale: [0.09, 0.05, 0.11] }));
    const cap = new THREE.Group();
    cap.position.set(0, 0.46, -0.06);
    cap.rotation.x = -0.32;
    g.add(cap);
    part(cap, GEO.sphere, '#e8d6f5', { position: [0, 0, 0], scale: [0.4, 0.07, 0.4] });
    part(cap, GEO.sphere, '#9a6ad0', { position: [0, 0.06, 0], scale: [0.42, 0.26, 0.42] });
    [[0, 0.3, 0, 0.08], [0.24, 0.2, 0.15, 0.06], [-0.22, 0.2, 0.16, 0.06], [0.2, 0.18, -0.2, 0.065], [-0.2, 0.2, -0.18, 0.06], [0.05, 0.2, 0.3, 0.05]].forEach(([x, y, z, r]) =>
      part(cap, GEO.sphere, '#fff3dc', { position: [x, y, z], scale: [r, r * 0.5, r] }));
    face(g, { y: 0.24, z: 0.2, dx: 0.075, r: 0.035, brow: 0.55, browY: 0.055, browLen: 0.055 });
    part(g, GEO.dot, EYE, { position: [0, 0.15, 0.19], scale: [0.03, 0.018, 0.01], flat: true });
    return { height: 0.95 };
  },
  // 그루터기 장군: 나이테가 보이는 그루터기 몸, 뿌리 발, 잎 달린 가지 팔, 꼭대기 새싹, 부리부리한 눈
  stump(g) {
    part(g, GEO.cylinder, '#a0703f', { position: [0, 0, 0], scale: [0.4, 0.62, 0.4] });
    part(g, GEO.cylinder, '#ecd09e', { position: [0, 0.62, 0], scale: [0.38, 0.02, 0.38] });
    part(g, GEO.cylinder, '#c9a274', { position: [0, 0.625, 0], scale: [0.24, 0.02, 0.24] });
    part(g, GEO.cylinder, '#ecd09e', { position: [0, 0.63, 0], scale: [0.12, 0.02, 0.12] });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      part(g, GEO.sphere, '#7a5136', { position: [Math.sin(a) * 0.38, 0.06, Math.cos(a) * 0.38], rotation: [0, a, 0], scale: [0.1, 0.07, 0.18] });
    }
    [-1.15, -1.7, 1.15, 1.7, Math.PI].forEach((a) => part(g, GEO.box, '#7a5136', { position: [Math.sin(a) * 0.4, 0.32, Math.cos(a) * 0.4], rotation: [0, a, 0], scale: [0.035, 0.36, 0.02] }));
    [-1, 1].forEach((sd) => {
      part(g, GEO.cylinder, '#8a5a30', { position: [sd * 0.36, 0.36, 0.05], rotation: [0, 0, -sd * 1.0], scale: [0.05, 0.3, 0.05] });
      part(g, GEO.sphere, '#6cc77e', { position: [sd * 0.62, 0.54, 0.05], scale: [0.1, 0.075, 0.1] });
    });
    part(g, GEO.cylinder, '#5a9a48', { position: [0.08, 0.63, -0.05], scale: [0.02, 0.18, 0.02] });
    [-1, 1].forEach((sd) => part(g, GEO.sphere, '#7cc25e', { position: [0.08 + sd * 0.07, 0.8, -0.05], rotation: [0, 0, sd * 0.5], scale: [0.08, 0.035, 0.05] }));
    face(g, { y: 0.4, z: 0.405, dx: 0.13, r: 0.05, brow: 0.6, browY: 0.085, browLen: 0.085 });
    part(g, GEO.box, EYE, { position: [0, 0.25, 0.405], scale: [0.12, 0.02, 0.01], flat: true });
    return { height: 1.15 };
  },
  // 연잎 개구리: 초록 몸에 밝은 배, 툭 튀어나온 눈두덩, 머리에 분홍 꽃 핀 연잎 모자, 넓게 웃는 입
  frog(g) {
    part(g, GEO.sphere, '#6cc77e', { position: [0, 0.24, -0.02], scale: [0.36, 0.24, 0.34] });
    part(g, GEO.sphere, '#e8f5c8', { position: [0, 0.2, 0.14], scale: [0.26, 0.17, 0.22] });
    [-1, 1].forEach((sd) => {
      part(g, GEO.sphere, '#6cc77e', { position: [sd * 0.15, 0.42, 0.12], scale: [0.11, 0.11, 0.1] });
      part(g, GEO.sphere, '#5aae68', { position: [sd * 0.3, 0.1, -0.12], scale: [0.14, 0.08, 0.2] });
      part(g, GEO.sphere, '#5aae68', { position: [sd * 0.2, 0.04, 0.28], scale: [0.08, 0.04, 0.09] });
      part(g, GEO.dot, BLUSH, { position: [sd * 0.21, 0.29, 0.29], scale: [0.045, 0.022, 0.015], flat: true });
    });
    const hat = new THREE.Group();
    hat.position.set(0, 0.56, -0.1);
    hat.rotation.x = -0.25;
    g.add(hat);
    part(hat, GEO.cylinder, '#4fa05a', { position: [0, 0, 0], scale: [0.3, 0.025, 0.3] });
    part(hat, GEO.box, '#3e8a4a', { position: [0, 0.03, 0.15], scale: [0.02, 0.01, 0.3] });
    part(hat, GEO.dot, '#ffb6c9', { position: [0.1, 0.06, -0.05], scale: [0.07, 0.05, 0.07] });
    part(hat, GEO.dot, '#ffe36e', { position: [0.1, 0.1, -0.05], scale: [0.03, 0.02, 0.03] });
    face(g, { y: 0.43, z: 0.215, dx: 0.15, r: 0.045, brow: 0.35, browY: 0.07, browLen: 0.06 });
    part(g, GEO.box, EYE, { position: [0, 0.27, 0.345], scale: [0.16, 0.015, 0.01], flat: true });
    return { height: 0.95 };
  },
  // 조약돌 게: 주황 몸에 등에 진 회색 조약돌, 눈자루 위 동그란 눈, 큰 집게 둘, 다리 셋씩
  crab(g) {
    part(g, GEO.sphere, '#f08a5d', { position: [0, 0.22, 0], scale: [0.38, 0.17, 0.3] });
    part(g, GEO.sphere, '#b9b2a6', { position: [0, 0.36, -0.08], scale: [0.3, 0.19, 0.24] });
    part(g, GEO.sphere, '#a39a8f', { position: [0.1, 0.5, -0.1], scale: [0.08, 0.04, 0.07] });
    part(g, GEO.sphere, '#cfc8bc', { position: [-0.12, 0.48, -0.03], scale: [0.06, 0.03, 0.05] });
    [-1, 1].forEach((sd) => {
      part(g, GEO.cylinder, '#e0764a', { position: [sd * 0.1, 0.3, 0.18], scale: [0.025, 0.16, 0.025] });
      part(g, GEO.sphere, '#ffffff', { position: [sd * 0.1, 0.48, 0.19], scale: [0.065, 0.065, 0.06] });
      part(g, GEO.sphere, '#f08a5d', { position: [sd * 0.42, 0.24, 0.24], scale: [0.15, 0.11, 0.13] });
      part(g, GEO.cone, '#f6a27e', { position: [sd * 0.4, 0.29, 0.32], rotation: [1.25, 0, 0], scale: [0.05, 0.15, 0.05] });
      [-0.12, -0.02, 0.08].forEach((z) => part(g, GEO.cylinder, '#e0764a', { position: [sd * 0.3, 0.15, z], rotation: [0, 0, -sd * 2.2], scale: [0.025, 0.2, 0.025] }));
      part(g, GEO.dot, EYE, { position: [sd * 0.1, 0.48, 0.245], scale: [0.03, 0.038, 0.015], flat: true });
      part(g, GEO.dot, SHINE, { position: [sd * 0.1 - 0.01, 0.495, 0.255], scale: [0.01, 0.01, 0.006], flat: true });
      part(g, GEO.box, EYE, { position: [sd * 0.1, 0.565, 0.22], rotation: [0, 0, sd * 0.45], scale: [0.06, 0.016, 0.012], flat: true });
    });
    part(g, GEO.box, EYE, { position: [0, 0.2, 0.305], scale: [0.07, 0.014, 0.01], flat: true });
    return { height: 0.85 };
  },
  // 데굴 돌멩이: 울퉁불퉁 회색 돌에 이끼 한 줌, 옆구리에 하늘색 결정, 동그란 눈
  pebble(g) {
    part(g, GEO.sphere, '#9da3ab', { position: [0, 0.36, 0], scale: [0.42, 0.36, 0.4] });
    part(g, GEO.sphere, '#8a9099', { position: [0.18, 0.52, -0.12], scale: [0.2, 0.16, 0.2] });
    part(g, GEO.sphere, '#b0b6be', { position: [-0.2, 0.22, -0.1], scale: [0.2, 0.14, 0.2] });
    part(g, GEO.sphere, '#86b85e', { position: [-0.08, 0.69, -0.05], scale: [0.16, 0.05, 0.14] });
    [[0.33, 0.45, 0.12, 0.5], [0.37, 0.33, 0.02, 1.0], [-0.36, 0.42, 0.05, -0.7]].forEach(([x, y, z, rz]) => part(g, GEO.cone, '#8fe3f0', { position: [x, y, z], rotation: [0, 0, -rz], scale: [0.05, 0.15, 0.05] }));
    face(g, { y: 0.41, z: 0.395, dx: 0.13, r: 0.045, brow: 0.45, browY: 0.07, browLen: 0.07 });
    part(g, GEO.dot, EYE, { position: [0, 0.27, 0.39], scale: [0.05, 0.025, 0.012], flat: true });
    return { height: 1.0 };
  },
  // 구름 산양: 몽글몽글 구름 털 몸, 연분홍 얼굴, 양옆으로 말린 뿔, 짧은 다리
  ram(g) {
    [[0, 0.48, -0.08, 0.32], [0.2, 0.42, -0.2, 0.22], [-0.2, 0.42, -0.2, 0.22], [0.2, 0.52, 0.04, 0.2], [-0.2, 0.52, 0.04, 0.2], [0, 0.68, -0.12, 0.2], [0, 0.4, -0.34, 0.2]]
      .forEach(([x, y, z, r], i) => part(g, GEO.sphere, i % 2 ? '#ffffff' : '#f4f1ea', { position: [x, y, z], scale: [r, r * 0.9, r] }));
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => part(g, GEO.cylinder, '#6b5a55', { position: [sx * 0.15, 0, sz * 0.14 - 0.08], scale: [0.045, 0.3, 0.045] }));
    part(g, GEO.sphere, '#ecdcd2', { position: [0, 0.48, 0.28], scale: [0.17, 0.18, 0.16] });
    part(g, GEO.sphere, '#ffffff', { position: [0, 0.64, 0.24], scale: [0.13, 0.07, 0.1] });
    [-1, 1].forEach((sd) => {
      part(g, HORN, '#d9b98a', { position: [sd * 0.17, 0.56, 0.2], rotation: [0, sd * Math.PI / 2, 0.4], scale: [0.1, 0.1, 0.1] });
      part(g, GEO.sphere, '#d8c4b8', { position: [sd * 0.2, 0.45, 0.24], rotation: [0, 0, sd * 0.8], scale: [0.07, 0.035, 0.05] });
    });
    face(g, { y: 0.5, z: 0.44, dx: 0.065, r: 0.035, brow: 0.5, browY: 0.06, browLen: 0.05 });
    part(g, GEO.dot, '#c98a8a', { position: [0, 0.4, 0.43], scale: [0.04, 0.025, 0.015], flat: true });
    return { height: 1.05 };
  }
};

const MODELS = new Map();
const bodyMat = toonMaterial('#ffffff', { vertexColors: true });
const flatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
/** 맞았을 때 번쩍(모두 하얗게) · 공격 직전 예고(붉게). */
const flashMat = toonMaterial('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.9, unique: true });
const warnMat = toonMaterial('#ff9a8a', { emissive: '#ff5a4a', emissiveIntensity: 0.35, unique: true });
/** 나방 달무늬(밤에 빛난다). */
const glowMat = toonMaterial('#fff1b0', { unique: true });
glowMat.emissive.setRGB(1, 0.85, 0.4).multiplyScalar(0.3);

function modelOf(species) {
  if (!MODELS.has(species)) {
    const root = new THREE.Group(), wingRoots = [], glow = [];
    const info = BUILD[species](root, wingRoots, glow);
    MODELS.set(species, {
      body: mergeParts(root, 'body'), flat: mergeParts(root, 'flat'),
      wing: wingRoots.length ? mergeParts(wingRoots[0], 'all') : null, glow, ...info
    });
  }
  return MODELS.get(species);
}

/** 몬스터 모양 하나(도감 · 시험 미리보기에서도 쓴다). → { root, inner, body, wings: [왼, 오] } */
export function monsterMesh(species) {
  const M = modelOf(species);
  const root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  const body = new THREE.Mesh(M.body, bodyMat);
  body.castShadow = true;
  addOutline(body, species === 'kingcap' ? 0.04 : 0.025);
  inner.add(body);
  if (M.flat) inner.add(new THREE.Mesh(M.flat, flatMat));
  const wings = [];
  if (M.wing) {
    [-1, 1].forEach((sd) => {
      const pivot = new THREE.Group();
      pivot.position.set(sd * 0.1, 0.03, -0.02);
      pivot.scale.x = sd; // 왼쪽은 거울
      pivot.rotation.z = sd * 0.3; // 살짝 V 자로 든다
      const w = new THREE.Mesh(M.wing, bodyMat);
      w.castShadow = true;
      addOutline(w, 0.02);
      pivot.add(w);
      for (const gl of M.glow) {
        const d = new THREE.Mesh(GEO.dot, glowMat);
        d.position.set(...gl.position);
        d.scale.set(...gl.scale);
        pivot.add(d);
      }
      inner.add(pivot);
      wings.push(pivot);
    });
  }
  inner.position.y = M.hover || 0;
  return { root, inner, body, wings, height: M.height, hover: M.hover || 0 };
}

// ---------- 공격 예고(바닥의 빨간 표시) · 탄 · 충격파 ----------
const TELE_EDGE = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
const TELE_FILL = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide });
const TELE_BASE = new THREE.MeshBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
const D_DISC = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const D_RING = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2);
/** 바닥 띠: 원점에서 앞(+z)으로 길이 1. */
const D_RECT = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateX(Math.PI / 2);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x2b2224, transparent: true, opacity: 0.18, depthWrite: false });
const tongueMat = toonMaterial('#f28fb0');
const moundMat = toonMaterial('#9a7552');
const shotMats = new Map();
function shotMat(c) {
  if (!shotMats.has(c)) {
    const m = toonMaterial(c, { unique: true });
    m.emissive = new THREE.Color(c);
    m.emissiveIntensity = 0.35;
    shotMats.set(c, m);
  }
  return shotMats.get(c);
}
/** 돌진 · 회전처럼 한번 시작하면 맞아도 밀리지 않는 공격. */
const COMMITTED = { leap: true, stomp: true, charge: true, roll: true, dive: true, spin: true };

/** 몬스터들을 키우고 움직인다. */
export function createMonsters(scene, village, random = Math.random) {
  const list = [];
  const poofs = [], shots = [], waves = [];
  let nextId = 1, refill = 0, nightK = 0, C = null, playerSafe = false, P = { x: 0, z: 0 };

  function spotFor(area, size, avoid) {
    const A = AREAS[area], [x0, x1, z0, z1] = A.box;
    for (let i = 0; i < 60; i++) {
      const x = x0 + random() * (x1 - x0), z = z0 + random() * (z1 - z0);
      if (!A.ok(x, z) || Math.hypot(x, z) < VILLAGE_R + 7 || !village.isFree(x, z, size)) continue;
      if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < 22) continue;
      if (list.some((m) => Math.hypot(m.x - x, m.z - z) < 3)) continue;
      return { x, z };
    }
    return null;
  }

  function add(species, x, z, extra = {}) {
    const M = MONSTERS[species], mesh = monsterMesh(species);
    mesh.root.position.set(x, 0, z);
    const yaw = random() * Math.PI * 2;
    mesh.root.rotation.y = yaw;
    scene.add(mesh.root);
    const m = {
      id: nextId++, species, M, x, z, yaw, hp: M.hp, home: { x, z }, state: 'wander', timer: random() * 2, goal: null,
      cool: random() * 1.2, wind: 0, windMax: 1, stun: 0, flash: 0, kx: 0, kz: 0, alert: 0, engaged: false, hitPlayer: false, dead: false, deadT: 0,
      phase: random() * 10, mesh, born: 0, airY: 0, diveY: 0, rec: 0, act: null, atk: null, under: false, pinch: 0, popT: 0,
      strafe: random() < 0.5 ? -1 : 1, ...extra
    };
    list.push(m);
    return m;
  }

  function spawn(species, avoid) {
    const S = SPAWN[species], spot = spotFor(S.area, MONSTERS[species].size, avoid);
    if (!spot) return null;
    const m = add(species, spot.x, spot.z);
    m.born = 0.01; // 톡 솟아나며 생긴다
    m.mesh.root.scale.setScalar(0.01);
    return m;
  }

  function removeAt(i) {
    const m = list[i];
    scene.remove(m.mesh.root);
    if (m.tele) scene.remove(m.tele.g);
    if (m.mound) scene.remove(m.mound);
    list.splice(i, 1);
  }

  /** 쓰러질 때 하얀 연기 방울이 퍼진다(땅에 부딪칠 때 흙먼지도). */
  function poof(x, y, z, size, n = 9) {
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const bits = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, d = new THREE.Mesh(GEO.dot, puffMat);
      d.scale.setScalar(0.12 + size * 0.15);
      g.add(d);
      bits.push({ d, vx: Math.sin(a) * (1.6 + size), vy: 0.8 + random() * 1.4, vz: Math.cos(a) * (1.6 + size) });
    }
    scene.add(g);
    poofs.push({ g, bits, t: 0, mat: puffMat });
  }
  /** 땅을 치면 하얀 고리가 퍼진다. */
  function wave(x, z, r) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(D_RING, mat);
    mesh.position.set(x, 0.07, z);
    mesh.renderOrder = 4;
    scene.add(mesh);
    waves.push({ mesh, mat, t: 0, r });
  }

  // ---------- 예고 표시 ----------
  function tele(m) {
    if (m.tele) return m.tele;
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    const mk = (geo, mat) => { const o = new THREE.Mesh(geo, mat); o.renderOrder = 3; g.add(o); return o; };
    m.tele = { g, c: [mk(D_DISC, TELE_BASE), mk(D_DISC, TELE_FILL), mk(D_RING, TELE_EDGE)], l: [mk(D_RECT, TELE_BASE), mk(D_RECT, TELE_FILL), mk(D_RECT, TELE_EDGE), mk(D_RECT, TELE_EDGE)] };
    return m.tele;
  }
  const hideTele = (m) => { if (m.tele) m.tele.g.visible = false; };
  /** 둥근 표시: 테두리는 다 친 넓이, 안쪽은 k(0..1) 만큼 차오른다. 다 차면 그 자리를 친다. */
  function showCircle(m, x, z, r, k) {
    const T = tele(m), [base, fill, ring] = T.c, f = Math.max(0.02, r * Math.min(1, k));
    T.g.visible = true;
    T.g.position.set(x, 0.045, z);
    T.g.rotation.y = 0;
    T.c.forEach((o) => { o.visible = true; });
    T.l.forEach((o) => { o.visible = false; });
    base.scale.set(r, 1, r); ring.scale.set(r, 1, r); fill.scale.set(f, 1, f);
  }
  /** 띠 표시: (x, z) 에서 yaw 쪽으로 길이 len, 폭 w. 안쪽은 k 만큼 차오른다. */
  function showLine(m, x, z, yaw, len, w, k) {
    const T = tele(m), [base, fill, a, b] = T.l;
    T.g.visible = true;
    T.g.position.set(x, 0.045, z);
    T.g.rotation.y = yaw;
    T.c.forEach((o) => { o.visible = false; });
    T.l.forEach((o) => { o.visible = true; });
    base.scale.set(w, 1, len); fill.scale.set(w, 1, Math.max(0.02, len * Math.min(1, k)));
    a.position.x = -w / 2; b.position.x = w / 2;
    a.scale.set(0.06, 1, len); b.scale.set(0.06, 1, len);
  }

  // ---------- 탄 ----------
  function fire(m, A, aimYaw) {
    for (let i = 0; i < A.n; i++) {
      const yaw = A.ring ? aimYaw + i * A.spread : aimYaw + (i - (A.n - 1) / 2) * A.spread;
      const mesh = new THREE.Mesh(GEO.sphere, shotMat(A.color));
      mesh.scale.setScalar(A.r);
      addOutline(mesh, 0.02);
      const sh = new THREE.Mesh(D_DISC, SHADOW_MAT);
      sh.scale.set(A.r, 1, A.r);
      const x = m.x + Math.sin(yaw) * (m.M.size + 0.15), z = m.z + Math.cos(yaw) * (m.M.size + 0.15);
      mesh.position.set(x, 0.45, z);
      sh.position.set(x, 0.03, z);
      scene.add(mesh); scene.add(sh);
      shots.push({ x, z, vx: Math.sin(yaw) * A.speed, vz: Math.cos(yaw) * A.speed, life: A.life, r: A.r, dmg: Math.round(m.M.dmg * (A.dmgK || 1)), mesh, sh, owner: m, t: 0 });
    }
  }

  // ---------- 혀(개구리) · 흙더미(두더지) ----------
  function setTongue(m, len) {
    if (!m.tongue) {
      const g = new THREE.Group();
      g.position.set(0, 0.27, 0.3);
      const cyl = new THREE.Mesh(GEO.cylinder, tongueMat);
      cyl.rotation.x = Math.PI / 2;
      cyl.scale.set(0.055, 1, 0.055);
      const tip = new THREE.Mesh(GEO.sphere, tongueMat);
      tip.scale.setScalar(0.1);
      addOutline(tip, 0.015);
      g.add(cyl, tip);
      m.mesh.inner.add(g);
      m.tongue = { g, cyl, tip };
    }
    const T = m.tongue;
    T.g.visible = len > 0.02;
    T.cyl.scale.y = Math.max(0.01, len);
    T.tip.position.z = len;
  }
  function mound(m) {
    if (!m.mound) {
      m.mound = new THREE.Mesh(GEO.sphere, moundMat);
      addOutline(m.mound, 0.02);
      scene.add(m.mound);
    }
    return m.mound;
  }

  const inVillage = (x, z, pad = 1) => Math.hypot(x, z) < VILLAGE_R + pad;

  /** 장애물을 피해 미끄러지듯 움직인다. 마을 울타리 쪽은 막힌다. → 바라던 만큼 움직인 비율(0..1, 막히면 작다) */
  function moveBy(m, dx, dz) {
    const r = m.M.size * 0.8, fly = m.species === 'moth';
    const ox = m.x, oz = m.z, nx = m.x + dx, nz = m.z + dz;
    const ok = (x, z) => (m.exam || Math.hypot(x, z) > FENCE) && (fly ? Math.max(Math.abs(x), Math.abs(z)) < 76 : village.isFree(x, z, r));
    if (ok(nx, m.z)) m.x = nx;
    if (ok(m.x, nz)) m.z = nz;
    const want = Math.hypot(dx, dz);
    return want > 1e-6 ? Math.hypot(m.x - ox, m.z - oz) / want : 1;
  }
  function turnTo(m, tx, tz, dt, rate = 8) {
    const want = Math.atan2(tx - m.x, tz - m.z);
    let d = want - m.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    m.yaw += Math.max(-dt * rate, Math.min(dt * rate, d));
  }

  // ---------- 공격 ----------
  /** 나를 맞힌다(마을 안에 있거나 창이 떠 있으면 안 맞는다). */
  function hurt(m, dmg, x, z) {
    if (!C || !C.active || playerSafe) return;
    m.hitPlayer = true;
    C.onHit?.(m, { dmg, x, z });
  }
  /** 땅을 쿵: 고리 · 흙먼지, 둘레 r 안에 있으면 맞는다. */
  function impact(m, x, z, r, dmg) {
    wave(x, z, r);
    poof(x, 0.15, z, 0.15, 7);
    C?.onImpact?.(m, x, z);
    if (Math.hypot(P.x - x, P.z - z) < r + ME) hurt(m, dmg, x, z);
  }
  /** 지금 쓸 공격(왕버섯은 거리에 따라 고른다). */
  function attackOf(m, dp) {
    if (m.M.attack === 'boss') return dp < ATK.bossSlam.range + 0.6 ? ATK.bossSlam : ATK.bossShoot;
    return ATK[m.M.attack] || ATK.bump;
  }
  function startWind(m, A) {
    m.state = 'wind';
    m.atk = A;
    m.wind = m.windMax = A.wind;
    m.locked = false;
    m.aim = { x: P.x, z: P.z };
    C?.onWind?.(m);
  }
  function cancel(m) {
    m.state = 'chase';
    m.cool = Math.max(m.cool, 0.6);
    m.act = null;
    m.airY = 0; m.diveY = 0;
    if (m.tongue) setTongue(m, 0);
    hideTele(m);
  }
  function endAct(m, A, recK = 1) {
    m.state = 'recover';
    m.rec = A.rec * recK;
    m.cool = A.cool;
    m.act = null;
    m.airY = 0; m.diveY = 0;
    m.strafe = random() < 0.5 ? -1 : 1;
    hideTele(m);
  }
  /** 뛰어오를 자리를 굳힌다: 너무 멀면 줄이고, 울타리 안 · 나무 위는 피한다. */
  function lockLeap(m, A) {
    let { x, z } = m.aim;
    const dx = x - m.x, dz = z - m.z, d = Math.hypot(dx, dz), far = A.range + 1.2;
    if (d > far) { x = m.x + (dx / d) * far; z = m.z + (dz / d) * far; }
    const o = Math.hypot(x, z);
    if (!m.exam && o < FENCE + 0.5) { x *= (FENCE + 0.5) / o; z *= (FENCE + 0.5) / o; }
    for (let i = 0; i < 12 && !village.isFree(x, z, m.M.size * 0.8); i++) { x += (m.x - x) * 0.2; z += (m.z - z) * 0.2; }
    m.aim.x = x; m.aim.z = z;
  }

  /** 쫓기: 공격 방식마다 알맞은 거리까지 다가가고(멀리서 쏘는 몬스터는 거리를 지킨다), 닿으면 예고를 시작한다. */
  function chase(m, dt, dp, canSee) {
    if (!canSee) { m.state = 'wander'; m.engaged = false; m.goal = { ...m.home }; hideTele(m); return false; }
    if (m.stun > 0) return false;
    const M = m.M, A = attackOf(m, dp), kind = A.kind;
    turnTo(m, P.x, P.z, dt, 9);
    let near, trig;
    if (kind === 'bump') { near = M.size + 0.4; trig = M.size + 0.5; }
    else if (A.keep) { near = A.keep; trig = A.range; }
    else if (kind === 'combo' || kind === 'slam') { near = Math.max(M.size + 0.3, A.range * 0.55); trig = A.range; }
    else { near = Math.min(A.range * 0.6, 3.2); trig = A.range; }
    if (m.cool <= 0 && dp <= trig) { startWind(m, A); return false; }
    const step = M.speed * dt, ux = (P.x - m.x) / (dp || 1), uz = (P.z - m.z) / (dp || 1);
    let moving = false;
    if (A.keep && dp < A.keep - 1.4) { moveBy(m, -ux * step * 0.8, -uz * step * 0.8); moving = true; }
    else if (dp > near) { moveBy(m, ux * step, uz * step); moving = true; }
    else if (kind !== 'bump' && kind !== 'combo' && kind !== 'slam') {
      // 기다리는 동안 내 둘레를 빙 돈다
      const s = m.strafe * step * 0.5;
      if (moveBy(m, uz * s, -ux * s) < 0.5) m.strafe *= -1;
      moving = true;
    }
    // 왕버섯: 쫓아오는 동안 이따금 포자를 뿜어 풀뭉치를 불러낸다(살아 있는 부하는 넷까지)
    if (M.boss) {
      m.summonT = (m.summonT ?? 4) - dt;
      if (m.summonT <= 0) {
        m.summonT = 9;
        const minions = list.filter((o) => o.summoned && !o.dead).length;
        for (let k = 0; k < Math.min(2, 4 - minions); k++) {
          const a = random() * Math.PI * 2, sx = m.x + Math.sin(a) * 2.2, sz = m.z + Math.cos(a) * 2.2;
          if (!village.isFree(sx, sz, 0.4)) continue;
          const f = add('fluff', sx, sz, { summoned: true, state: 'chase', engaged: true, alert: 0.8 });
          f.born = 0.01; f.mesh.root.scale.setScalar(0.01);
          poof(sx, 0.3, sz, 0.3);
        }
        C?.onSummon?.(m);
      }
    }
    return moving;
  }

  /** 예고: 몸이 붉게 깜빡이고, 칠 곳에 빨간 표시가 차오른다. 겨누는 공격은 도중에 겨눈 곳을 굳힌다. */
  function windStep(m, dt) {
    const A = m.atk, kind = A.kind;
    if (!C.active || playerSafe) { cancel(m); return; }
    const k = 1 - m.wind / m.windMax;
    if (!m.locked) {
      m.aim.x = P.x; m.aim.z = P.z;
      turnTo(m, P.x, P.z, dt, 10);
      if (A.lock != null && k >= A.lock) {
        m.locked = true;
        if (kind === 'leap' || kind === 'stomp') lockLeap(m, A);
      }
    } else if (kind !== 'tongue') turnTo(m, m.aim.x, m.aim.z, dt, 10);
    if (kind === 'leap' || kind === 'stomp') { if (m.locked) showCircle(m, m.aim.x, m.aim.z, A.radius, k); else hideTele(m); }
    else if (kind === 'slam') showCircle(m, m.x, m.z, A.radius, k);
    else if (kind === 'charge' || kind === 'roll' || kind === 'dive') showLine(m, m.x, m.z, Math.atan2(m.aim.x - m.x, m.aim.z - m.z), A.len, A.width, k);
    else if (kind === 'tongue') showLine(m, m.x, m.z, m.yaw, A.len, A.width, k);
    m.wind -= dt;
    if (m.wind <= 0) startAct(m, A);
  }

  function startAct(m, A) {
    const M = m.M, kind = A.kind;
    hideTele(m);
    m.state = 'act';
    m.act = { t: 0 };
    if (kind === 'bump') {
      // 들이받기: 앞으로 톡 튀어 나가며, 아직 닿을 거리면 맞는다
      m.lunge = 0.18;
      moveBy(m, Math.sin(m.yaw) * 0.35, Math.cos(m.yaw) * 0.35);
      if (Math.hypot(m.x - P.x, m.z - P.z) < M.size + 0.85) hurt(m, M.dmg, m.x, m.z);
      endAct(m, A);
    } else if (kind === 'leap' || kind === 'stomp') {
      if (!m.locked) lockLeap(m, A);
      m.act.sx = m.x; m.act.sz = m.z;
    } else if (kind === 'burrow') {
      m.under = true;
      m.act.phase = 'under';
      m.dustT = 0;
    } else if (kind === 'charge' || kind === 'roll' || kind === 'dive') {
      m.act.dir = Math.atan2(m.aim.x - m.x, m.aim.z - m.z);
      m.act.dist = 0;
      m.act.bounce = A.bounce || 0;
      m.yaw = m.act.dir;
    } else if (kind === 'shoot' || kind === 'spit') {
      fire(m, A, Math.atan2(P.x - m.x, P.z - m.z));
      m.lunge = 0.15;
      endAct(m, A);
    } else if (kind === 'slam') {
      impact(m, m.x, m.z, A.radius, M.dmg);
      endAct(m, A);
    } else if (kind === 'tongue') {
      m.act.dir = m.yaw;
    } else if (kind === 'combo') {
      m.act.i = 0; m.act.next = 0;
    } else if (kind === 'spin') {
      m.act.dir = m.yaw;
      m.spinA = 0;
    } else endAct(m, A);
  }

  /** 공격 중. → 움직였는지 */
  function actStep(m, dt, dp) {
    const A = m.atk, a = m.act, M = m.M, kind = A.kind;
    a.t += dt;
    if (kind === 'leap' || kind === 'stomp') {
      const k = Math.min(1, a.t / A.air);
      const nx = a.sx + (m.aim.x - a.sx) * k, nz = a.sz + (m.aim.z - a.sz) * k;
      if (m.exam || Math.hypot(nx, nz) > FENCE) { m.x = nx; m.z = nz; }
      m.airY = A.height * 4 * k * (1 - k);
      if (k < 1) showCircle(m, m.aim.x, m.aim.z, A.radius, 1);
      else { m.airY = 0; impact(m, m.x, m.z, A.radius, M.dmg); endAct(m, A); }
      return true;
    }
    if (kind === 'burrow') {
      if (a.phase === 'under') {
        if (dp > 0.45) { const step = A.travel * dt; moveBy(m, ((P.x - m.x) / dp) * step, ((P.z - m.z) / dp) * step); }
        m.dustT -= dt;
        if (m.dustT <= 0) { m.dustT = 0.22; poof(m.x, 0.08, m.z, 0.02, 5); }
        if (dp < 0.6 || a.t > A.maxT) { a.phase = 'warn'; a.t = 0; }
        return true;
      }
      showCircle(m, m.x, m.z, A.radius, a.t / A.warn);
      if (a.t >= A.warn) { m.under = false; m.popT = 0.3; impact(m, m.x, m.z, A.radius, M.dmg); endAct(m, A); }
      return false;
    }
    if (kind === 'charge' || kind === 'roll' || kind === 'dive') {
      const step = A.speed * dt;
      const moved = moveBy(m, Math.sin(a.dir) * step, Math.cos(a.dir) * step);
      a.dist += step;
      m.yaw = a.dir;
      if (kind === 'roll') m.rollA = (m.rollA || 0) + step / Math.max(0.3, M.size);
      if (kind === 'dive') m.diveY = -Math.sin(Math.min(1, a.dist / A.len) * Math.PI) * 0.75;
      if (!a.hit && Math.hypot(m.x - P.x, m.z - P.z) < M.size + 0.35 + ME) { a.hit = true; hurt(m, M.dmg, m.x, m.z); }
      if (moved < 0.5) {
        wave(m.x, m.z, 0.7);
        C?.onImpact?.(m, m.x, m.z);
        if (a.bounce > 0) { a.bounce--; a.dir += Math.PI + (random() - 0.5) * 0.8; }
        else { endAct(m, A, 1.6); return true; } // 벽에 쿵 → 더 오래 휘청
      }
      if (a.dist >= A.len) endAct(m, A);
      return true;
    }
    if (kind === 'tongue') {
      const out = Math.min(1, a.t / (A.show * 0.35));
      const back = a.t > A.show * 0.6 ? Math.max(0, 1 - (a.t - A.show * 0.6) / (A.show * 0.4)) : 1;
      setTongue(m, A.len * Math.min(out, back));
      if (!a.done && out >= 1) {
        a.done = true;
        const fx = Math.sin(a.dir), fz = Math.cos(a.dir), rx = P.x - m.x, rz = P.z - m.z;
        const along = rx * fx + rz * fz, side = Math.abs(rx * fz - rz * fx);
        if (along > 0 && along < A.len + ME && side < A.width / 2 + ME) hurt(m, M.dmg, m.x + fx * along, m.z + fz * along);
      }
      if (a.t >= A.show) { setTongue(m, 0); endAct(m, A); }
      return false;
    }
    if (kind === 'combo') {
      a.next -= dt;
      if (a.next <= 0) {
        if (a.i >= A.n) { endAct(m, A); return false; }
        a.i++;
        a.next = A.gap;
        m.yaw = Math.atan2(P.x - m.x, P.z - m.z);
        const go = Math.min(0.32, Math.max(0, dp - M.size - 0.3));
        moveBy(m, ((P.x - m.x) / (dp || 1)) * go, ((P.z - m.z) / (dp || 1)) * go);
        m.lunge = 0.15; m.pinch = 0.12;
        if (Math.hypot(m.x - P.x, m.z - P.z) < M.size + A.reach) hurt(m, M.dmg, m.x, m.z);
      }
      return true;
    }
    if (kind === 'spin') {
      let d = Math.atan2(P.x - m.x, P.z - m.z) - a.dir;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a.dir += Math.max(-A.turn * dt, Math.min(A.turn * dt, d));
      const step = A.speed * dt;
      if (moveBy(m, Math.sin(a.dir) * step, Math.cos(a.dir) * step) < 0.5) a.dir += Math.PI * (0.7 + random() * 0.6);
      m.spinA = (m.spinA || 0) + dt * 18;
      if (Math.hypot(m.x - P.x, m.z - P.z) < M.size + 0.3 + ME) hurt(m, M.dmg, m.x, m.z);
      if (a.t >= A.dur) { m.spinA = 0; endAct(m, A); }
      return true;
    }
    endAct(m, A);
    return false;
  }

  /** 몸짓: 종류마다 다르게 통통 · 말랑 · 꿈틀 · 펄럭, 공격 중에는 공격 모양대로. */
  function animate(m, dt, t, moving) {
    const { inner, wings, body } = m.mesh, sp = m.species;
    const ph = t + m.phase;
    let y = m.mesh.hover, sx = 1, sy = 1, rz = 0, rx = 0, ry = 0;
    if (sp === 'fluff') {
      const hop = moving ? Math.abs(Math.sin(ph * 7)) : Math.abs(Math.sin(ph * 2.5)) * 0.2;
      y += hop * 0.28;
      sy = 1 + (hop < 0.15 ? -0.12 : 0.05); sx = 2 - sy;
    } else if (sp === 'hopper' || sp === 'frog') {
      const hop = moving ? Math.abs(Math.sin(ph * (sp === 'hopper' ? 8 : 6))) : 0;
      y += hop * (sp === 'hopper' ? 0.24 : 0.2);
      if (!moving) sx = 1 + Math.max(0, Math.sin(ph * 3)) * 0.04;
    } else if (sp === 'beetle') {
      rz = Math.sin(ph * (moving ? 18 : 3)) * (moving ? 0.06 : 0.02);
      y += moving ? Math.abs(Math.sin(ph * 18)) * 0.03 : 0;
    } else if (sp === 'mole') {
      rz = Math.sin(ph * (moving ? 10 : 2)) * (moving ? 0.06 : 0.02);
    } else if (sp === 'slime' || sp === 'shroom') {
      const k = Math.sin(ph * (moving ? 7 : 3));
      sy = 1 + k * (moving ? 0.14 : 0.06); sx = 1 - k * (moving ? 0.09 : 0.04);
    } else if (sp === 'stump') {
      rz = Math.sin(ph * (moving ? 5 : 1)) * (moving ? 0.1 : 0.02);
    } else if (sp === 'crab') {
      ry = Math.sin(ph * (moving ? 16 : 1.5)) * (moving ? 0.3 : 0.1);
      y += moving ? Math.abs(Math.sin(ph * 16)) * 0.03 : 0;
    } else if (sp === 'pebble' || sp === 'ram') {
      rx = moving ? Math.sin(ph * 9) * (sp === 'pebble' ? 0.18 : 0.05) : 0;
      y += moving ? Math.abs(Math.sin(ph * 9)) * 0.06 : 0;
    } else if (sp === 'turtle') {
      rz = Math.sin(ph * (moving ? 5 : 1.2)) * 0.04;
    } else if (sp === 'moth') {
      y += Math.sin(ph * 2.6) * 0.18;
      const f = Math.sin(ph * (m.state === 'chase' || m.state === 'act' ? 22 : 13)) * 0.55;
      if (wings.length) { wings[0].rotation.z = -0.3 - f; wings[1].rotation.z = 0.3 + f; }
      rx = 0.15;
    } else if (sp === 'kingcap') {
      rz = Math.sin(ph * (moving ? 4 : 1)) * (moving ? 0.07 : 0.025);
      y += moving ? Math.abs(Math.sin(ph * 4)) * 0.06 : 0;
    } else if (sp === 'dummy') {
      rz = Math.sin(m.wobble * 16) * Math.max(0, m.wobble) * 0.9;
      m.wobble = Math.max(0, (m.wobble || 0) - dt * 1.2);
    }
    const kind = m.atk && m.atk.kind;
    if (m.state === 'wind') {
      // 예고: 움츠렸다가(납작) 튀어 나간다
      const k = 1 - m.wind / m.windMax;
      sy *= 1 - 0.22 * k; sx *= 1 + 0.15 * k;
      rz += Math.sin(t * 60) * 0.05 * k;
      if (kind === 'slam') y += k > 0.55 ? ((k - 0.55) / 0.45) * 0.55 : 0;
      if (kind === 'burrow') y -= k * 0.9;
      if (kind === 'roll') rx -= k * 0.4;
    } else if (m.state === 'act') {
      if (kind === 'spin') { ry = m.spinA || 0; sy *= 0.82; sx *= 1.06; }
      else if (kind === 'roll') rx = m.rollA || 0;
      else if (kind === 'charge') rx = 0.28;
      else if (kind === 'dive') { y += m.diveY || 0; rx = 0.55; }
      else if (kind === 'leap' || kind === 'stomp') { sy *= 1.12; sx *= 0.92; }
    } else if (m.state === 'recover') {
      rz += Math.sin(t * 14) * 0.1; // 휘청
    }
    if (m.lunge > 0) { sy *= 1.12; sx *= 0.92; }
    if (m.popT > 0) { m.popT = Math.max(0, m.popT - dt); y -= (m.popT / 0.3) * 0.8; }
    y += m.airY || 0;
    if (m.stun > 0) rz += Math.sin(t * 40) * 0.08;
    inner.visible = !m.under;
    inner.position.y = y;
    inner.scale.set(sx, sy, sx);
    inner.rotation.set(rx, ry, rz);
    const blink = (m.state === 'wind' || m.pinch > 0) && Math.sin(t * 30) > 0;
    body.material = m.flash > 0 ? flashMat : blink ? warnMat : bodyMat;
    if (wings.length) wings.forEach((w) => { w.children[0].material = body.material; });
  }

  for (const [species, S] of Object.entries(SPAWN)) {
    if (species === 'moth') continue; // 밤에만
    for (let i = 0; i < S.n; i++) spawn(species, null);
  }

  return {
    list,
    /** 시험 허수아비 · 이야기 속 왕버섯처럼 정해진 자리에 놓는다. extra.exam 이면 마을 안에도 둔다. */
    spawnAt(species, x, z, extra = {}) { return add(species, x, z, { ...extra, wobble: 0 }); },
    /** 조건에 맞는 몬스터를 없앤다(연기 없이). */
    clear(fn) { for (let i = list.length - 1; i >= 0; i--) if (fn(list[i])) removeAt(i); },
    /** 살아 있는 것 중 (x, z) 에서 maxDist 안의 가장 가까운 몬스터(땅속에 숨은 것은 빼고). */
    nearest(x, z, maxDist, fn = null) {
      let best = null, bd = maxDist;
      for (const m of list) {
        if (m.dead || m.dormant || m.under || (fn && !fn(m))) continue;
        const d = Math.hypot(m.x - x, m.z - z) - m.M.size;
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    },
    /**
     * 내 공격: 바라보는 쪽 부채꼴 안의 몬스터를 때린다. → [{ m, killed }]
     * hit: { x, z, yaw, range, dmg, knock }. 땅속에 숨었거나 높이 뛰어오른 몬스터는 맞지 않는다.
     * 예고 중인 가벼운 몬스터를 때리면 공격이 끊긴다. 돌진 · 회전처럼 한번 시작한 공격은 밀리지 않는다.
     */
    strike({ x, z, yaw, range, dmg, knock = 1, arc }) {
      const out = [];
      for (const m of list) {
        if (m.dead || m.dormant || m.under || m.airY > 0.7 || !inSwing(x, z, yaw, range, m.x, m.z, m.M.size, arc)) continue;
        m.hp -= dmg;
        m.flash = 0.13;
        m.engaged = true;
        if (m.species === 'dummy') m.wobble = 1;
        const committed = m.state === 'act' && m.atk && COMMITTED[m.atk.kind];
        const d = Math.hypot(m.x - x, m.z - z) || 1;
        const push = (HEAVY[m.species] ? 0.45 : 1.2) * knock;
        if (m.species !== 'dummy' && !committed) { m.kx = ((m.x - x) / d) * push * 6; m.kz = ((m.z - z) / d) * push * 6; }
        if (m.state === 'wind' && !HEAVY[m.species]) { cancel(m); m.stun = 0.35; }
        else if (m.state === 'chase' || m.state === 'recover') m.stun = 0.35;
        if (m.state === 'wander') { m.state = 'chase'; m.alert = 0.8; }
        const killed = m.hp <= 0;
        if (killed) { m.dead = true; m.deadT = 0; hideTele(m); if (m.tongue) setTongue(m, 0); poof(m.x, 0.4 + m.mesh.hover, m.z, m.M.size); }
        out.push({ m, killed });
      }
      return out;
    },
    /** 머리 위 체력 줄 · 알아챔(!) 표시. */
    labels(focus) {
      const out = [];
      for (const m of list) {
        if (m.dead || m.under || !m.mesh.root.visible || Math.hypot(m.x - focus.x, m.z - focus.z) > 16) continue;
        const y = m.mesh.height + (m.airY || 0) + (m.species === 'moth' ? Math.sin(performance.now() / 385 + m.phase) * 0.18 : 0);
        if (m.dormant) { out.push({ id: 'mz' + m.id, x: m.x, y, z: m.z, text: `${m.M.name} · 쿨쿨…`, kind: 'mhp', pct: 1, boss: true }); continue; }
        if (m.alert > 0) out.push({ id: 'ma' + m.id, x: m.x, y: y + 0.45, z: m.z, text: '!', kind: 'alert' });
        if (m.engaged || m.hp < m.M.hp || m.exam) out.push({ id: 'mh' + m.id, x: m.x, y, z: m.z, text: m.M.name, kind: 'mhp', pct: Math.max(0, m.hp / m.M.hp), boss: !!m.M.boss });
      }
      return out;
    },
    /** 종류별 살아 있는 수(테스트). */
    counts() {
      const c = {};
      for (const m of list) if (!m.dead) c[m.species] = (c[m.species] || 0) + 1;
      return c;
    },
    /** 날아가는 탄 수(테스트). */
    shots: () => shots.length,
    /**
     * ctx: { player: { x, z }, active: 나를 노려도 되는지(창 · 대화 · 잠 중이면 false), night: 0..1,
     *        onHit(m, { dmg, x, z }): 공격이 닿았을 때, onAggro(m): 나를 알아챘을 때, onWind(m): 공격 예고를 시작할 때,
     *        onImpact(m, x, z): 땅을 쿵 칠 때 }
     */
    update(dt, t, ctx) {
      const p = ctx.player;
      C = ctx;
      P = p;
      nightK = ctx.night;
      glowMat.emissive.setRGB(1, 0.85, 0.4).multiplyScalar(0.3 + 0.9 * nightK);
      TELE_EDGE.opacity = 0.6 + 0.3 * Math.sin(t * 18);
      playerSafe = inVillage(p.x, p.z, 0.6);
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i], M = m.M, root = m.mesh.root;
        const dp = Math.hypot(m.x - p.x, m.z - p.z);
        if (m.dead) {
          m.deadT += dt;
          const k = m.deadT / 0.35;
          root.scale.setScalar(Math.max(0.01, (1 + k * 0.3) * (1 - k)));
          root.rotation.y += dt * 14;
          if (m.mound) m.mound.visible = false;
          if (k >= 1) removeAt(i);
          continue;
        }
        // 날이 밝으면 나방은 하늘로 날아가 사라진다
        if (m.species === 'moth' && nightK < 0.3 && !m.leaving && (m.state === 'wander' || dp > 10)) { m.leaving = true; hideTele(m); }
        if (m.leaving) {
          m.leaveT = (m.leaveT || 0) + dt;
          root.position.y = m.leaveT * 2.2;
          root.scale.setScalar(Math.max(0.01, 1 - m.leaveT / 1.6));
          if (m.leaveT > 1.6) removeAt(i);
          continue;
        }
        if (dp > ACTIVE_DIST && !m.exam) {
          root.visible = false;
          if (m.state === 'wind' || m.state === 'act' || m.state === 'recover') { cancel(m); m.state = 'wander'; m.under = false; }
          if (m.mound) m.mound.visible = false;
          continue;
        }
        root.visible = true;
        if (m.born > 0) { m.born = Math.min(1, m.born + dt * 2.2); root.scale.setScalar(m.born >= 1 ? 1 : m.born); if (m.born >= 1) m.born = 0; }
        m.flash = Math.max(0, m.flash - dt);
        m.alert = Math.max(0, m.alert - dt);
        m.stun = Math.max(0, m.stun - dt);
        m.cool = Math.max(0, m.cool - dt);
        m.lunge = Math.max(0, (m.lunge || 0) - dt);
        m.pinch = Math.max(0, m.pinch - dt);
        let moving = false;
        // 밀려남
        if (!m.under && Math.abs(m.kx) + Math.abs(m.kz) > 0.01) {
          moveBy(m, m.kx * dt, m.kz * dt);
          const damp = Math.exp(-dt * 9);
          m.kx *= damp; m.kz *= damp;
        }
        if (M.speed > 0) {
          const fromHome = Math.hypot(m.x - m.home.x, m.z - m.home.z);
          const canSee = ctx.active && !playerSafe && !m.dormant && dp < (m.engaged ? M.aggro * 1.7 : M.aggro);
          if ((m.state === 'wander' || m.state === 'chase') && fromHome > LEASH) { m.state = 'return'; hideTele(m); }
          if (m.state === 'wander') {
            if (canSee) {
              m.state = 'chase'; m.alert = 0.9; m.engaged = true;
              ctx.onAggro?.(m);
            } else if (ctx.active) {
              m.timer -= dt;
              if (m.timer <= 0 || !m.goal) {
                m.timer = 2 + random() * 3;
                const a = random() * Math.PI * 2, r = random() * 4;
                m.goal = random() < 0.35 ? null : { x: m.home.x + Math.sin(a) * r, z: m.home.z + Math.cos(a) * r };
              }
              if (m.goal) {
                const gx = m.goal.x - m.x, gz = m.goal.z - m.z, gd = Math.hypot(gx, gz);
                if (gd > 0.2) {
                  const step = M.speed * 0.35 * dt;
                  turnTo(m, m.goal.x, m.goal.z, dt, 4);
                  moveBy(m, (gx / gd) * step, (gz / gd) * step);
                  moving = true;
                } else m.goal = null;
              }
            }
          } else if (m.state === 'chase') moving = chase(m, dt, dp, canSee);
          else if (m.state === 'wind') windStep(m, dt);
          else if (m.state === 'act') moving = actStep(m, dt, dp);
          else if (m.state === 'recover') {
            m.rec -= dt;
            if (m.rec <= 0) m.state = 'chase';
          } else if (m.state === 'return') {
            const hx = m.home.x - m.x, hz = m.home.z - m.z, hd = Math.hypot(hx, hz);
            if (hd < 1) { m.state = 'wander'; m.engaged = false; m.hp = M.hp; m.hitPlayer = false; }
            else {
              const step = M.speed * 0.9 * dt;
              turnTo(m, m.home.x, m.home.z, dt, 6);
              moveBy(m, (hx / hd) * step, (hz / hd) * step);
              moving = true;
            }
          }
        }
        const solid = !m.under && m.airY < 0.3;
        // 나와 겹치지 않게(들이받은 뒤에도 내 몸 안으로 파고들지 않는다)
        if (M.speed > 0 && solid) {
          const qx = m.x - p.x, qz = m.z - p.z, qd = Math.hypot(qx, qz), minD = M.size * 0.8 + 0.35;
          if (qd > 0.001 && qd < minD) moveBy(m, (qx / qd) * (minD - qd), (qz / qd) * (minD - qd));
        }
        // 서로 겹치지 않게 살짝 민다
        if (solid) {
          for (const o of list) {
            if (o === m || o.dead || o.under) continue;
            const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz), min = (m.M.size + o.M.size) * 0.8;
            if (od > 0.001 && od < min) moveBy(m, (ox / od) * (min - od) * 0.5, (oz / od) * (min - od) * 0.5);
          }
        }
        root.position.set(m.x, groundY(m.x, m.z), m.z);
        root.rotation.y = m.yaw;
        animate(m, dt, t, moving);
        // 땅속을 파고드는 동안 흙더미가 따라 움직인다(튀어나오기 직전에는 들썩인다)
        if (m.under) {
          const md = mound(m), warn = m.act && m.act.phase === 'warn', sh = warn ? Math.sin(t * 50) * 0.05 : 0;
          md.visible = true;
          md.position.set(m.x + sh, 0, m.z);
          md.scale.set(0.42, warn ? 0.2 : 0.13, 0.42);
        } else if (m.mound) m.mound.visible = false;
      }
      // 탄: 곧게 날아가다 나에게 닿거나 울타리에 닿거나 시간이 다 되면 톡 터진다
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.t += dt;
        s.x += s.vx * dt; s.z += s.vz * dt;
        s.mesh.position.set(s.x, 0.45 + Math.sin(s.t * 10) * 0.05, s.z);
        s.sh.position.set(s.x, 0.03, s.z);
        let gone = s.t > s.life || Math.hypot(s.x, s.z) < FENCE - 0.3;
        if (!gone && Math.hypot(s.x - p.x, s.z - p.z) < s.r + ME) { hurt(s.owner, s.dmg, s.x, s.z); gone = true; }
        if (gone) {
          poof(s.x, 0.45, s.z, 0.02, 6);
          scene.remove(s.mesh); scene.remove(s.sh);
          shots.splice(i, 1);
        }
      }
      // 충격파 고리
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.t += dt;
        const k = Math.min(1, w.t / 0.35), r = w.r * (0.35 + 0.65 * k);
        w.mesh.scale.set(r, 1, r);
        w.mat.opacity = 0.85 * (1 - k);
        if (k >= 1) { scene.remove(w.mesh); w.mat.dispose(); waves.splice(i, 1); }
      }
      // 연기
      for (let i = poofs.length - 1; i >= 0; i--) {
        const f = poofs[i];
        f.t += dt;
        for (const b of f.bits) {
          b.d.position.x += b.vx * dt; b.d.position.y += b.vy * dt; b.d.position.z += b.vz * dt;
          b.vx *= 0.9; b.vz *= 0.9;
          b.d.scale.multiplyScalar(1 + dt * 1.5);
        }
        f.mat.opacity = Math.max(0, 0.9 - f.t * 1.6);
        if (f.t > 0.55) { scene.remove(f.g); f.mat.dispose(); poofs.splice(i, 1); }
      }
      // 모자란 만큼 다시 생긴다(밤이면 나방도). 내 눈앞에서 솟아나지 않게 멀리에서
      refill -= dt;
      if (refill <= 0) {
        refill = REFILL_SECONDS;
        for (const [species, S] of Object.entries(SPAWN)) {
          if (species === 'moth' && nightK < 0.55) continue;
          const have = list.filter((m) => m.species === species && !m.dead && !m.leaving).length;
          for (let k = have; k < S.n; k++) spawn(species, p);
        }
      }
    }
  };
}
