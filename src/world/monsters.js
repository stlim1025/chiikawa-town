import * as THREE from 'three';
import { toonMaterial, addOutline, GEO } from '../render/toon.js';
import { part, mergeParts } from '../render/merge.js';
import { MONSTERS, inSwing } from '../core/combat.js';
import { regionAt, shoreDist, VILLAGE_R, CAVE } from '../core/layout.js';

/**
 * 마을 밖 몬스터(4단계): 이 게임만의 오리지널 생물. 모양은 부품을 쌓아 한 덩어리로 합치고(몸 + 외곽선, 얼굴),
 * 나방 날개처럼 움직이는 부분만 따로 둔다. 구역마다 정해진 수만큼 살고, 쓰러지면 잠시 뒤 내 눈에 안 띄는 곳에서 다시 생긴다.
 * 행동: 어슬렁(집 둘레) → 내가 가까이 오면 쫓아옴 → 닿을 만큼 오면 잠깐 움츠렸다가(예고) 들이받기 → 집에서 너무 멀어지거나
 * 내가 마을 울타리 안으로 들어가면 돌아감. 마을 안으로는 절대 들어오지 않는다.
 */

/** 구역마다 사는 수와 자리. */
const SPAWN = {
  fluff: { n: 7, area: 'fields' },
  beetle: { n: 7, area: 'forest' },
  slime: { n: 6, area: 'river' },
  turtle: { n: 5, area: 'mountain' },
  moth: { n: 9, area: 'night' }
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
/** 들이받기 전에 움츠리는 시간(초) · 들이받은 뒤 쉬는 시간. */
const WIND = { fluff: 0.5, beetle: 0.45, slime: 0.55, turtle: 0.75, moth: 0.45, kingcap: 0.8, dummy: 0 };
const COOL = { fluff: 1.2, beetle: 1.1, slime: 1.3, turtle: 1.6, moth: 1.0, kingcap: 1.5, dummy: 0 };
/** 맞아도 움츠리기를 멈추지 않는 단단한 몬스터. */
const HEAVY = { turtle: true, kingcap: true };

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
  // 물방울 슬라임: 말랑한 물방울. 꼭대기가 살짝 뒤로 흐르고, 바닥은 웅덩이처럼 퍼진다
  slime(g) {
    part(g, GEO.sphere, '#7cc4ea', { position: [0, 0.04, 0], scale: [0.46, 0.07, 0.46] });
    part(g, GEO.sphere, '#8fd3f4', { position: [0, 0.32, 0], scale: [0.4, 0.33, 0.4] });
    part(g, GEO.cone, '#8fd3f4', { position: [0, 0.5, -0.04], rotation: [-0.35, 0, 0], scale: [0.17, 0.28, 0.17] });
    part(g, GEO.sphere, '#bfe9fb', { position: [0, 0.3, 0.1], scale: [0.3, 0.24, 0.3] });
    part(g, GEO.dot, SHINE, { position: [-0.17, 0.5, 0.25], rotation: [0, 0, 0.6], scale: [0.07, 0.035, 0.03], flat: true });
    part(g, GEO.dot, SHINE, { position: [-0.24, 0.4, 0.27], scale: [0.025, 0.025, 0.02], flat: true });
    face(g, { y: 0.35, z: 0.385, dx: 0.12, brow: null });
    [-1, 1].forEach((sd) => part(g, GEO.dot, BLUSH, { position: [sd * 0.22, 0.27, 0.33], scale: [0.05, 0.025, 0.02], flat: true }));
    part(g, GEO.dot, EYE, { position: [0, 0.26, 0.4], scale: [0.04, 0.03, 0.015], flat: true });
    return { height: 0.95 };
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
  }
};

const MODELS = new Map();
const bodyMat = toonMaterial('#ffffff', { vertexColors: true });
const flatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
/** 맞았을 때 번쩍(모두 하얗게) · 들이받기 직전 예고(붉게). */
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

/** 몬스터들을 키우고 움직인다. */
export function createMonsters(scene, village, random = Math.random) {
  const list = [];
  const poofs = [];
  let nextId = 1, refill = 0, nightK = 0;

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
      cool: 0, wind: 0, stun: 0, flash: 0, kx: 0, kz: 0, alert: 0, engaged: false, hitPlayer: false, dead: false, deadT: 0,
      phase: random() * 10, mesh, born: 0, ...extra
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
    list.splice(i, 1);
  }

  /** 쓰러질 때 하얀 연기 방울이 퍼진다. */
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  function poof(x, y, z, size) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const bits = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, d = new THREE.Mesh(GEO.dot, puffMat);
      d.scale.setScalar(0.12 + size * 0.15);
      g.add(d);
      bits.push({ d, vx: Math.sin(a) * (1.6 + size), vy: 0.8 + random() * 1.4, vz: Math.cos(a) * (1.6 + size) });
    }
    scene.add(g);
    poofs.push({ g, bits, t: 0 });
  }

  const inVillage = (x, z, pad = 1) => Math.hypot(x, z) < VILLAGE_R + pad;

  /** 장애물을 피해 미끄러지듯 움직인다. 마을 울타리 쪽은 막힌다. */
  function moveBy(m, dx, dz) {
    const r = m.M.size * 0.8, fly = m.species === 'moth';
    const nx = m.x + dx, nz = m.z + dz;
    const ok = (x, z) => (m.exam || Math.hypot(x, z) > FENCE) && (fly ? Math.max(Math.abs(x), Math.abs(z)) < 76 : village.isFree(x, z, r));
    if (ok(nx, m.z)) m.x = nx;
    if (ok(m.x, nz)) m.z = nz;
  }
  function turnTo(m, tx, tz, dt, rate = 8) {
    const want = Math.atan2(tx - m.x, tz - m.z);
    let d = want - m.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    m.yaw += Math.max(-dt * rate, Math.min(dt * rate, d));
  }

  /** 몸짓: 종류마다 다르게 통통 · 말랑 · 꿈틀 · 펄럭. */
  function animate(m, dt, t, moving) {
    const { inner, wings, body } = m.mesh, sp = m.species;
    const ph = t + m.phase;
    let y = m.mesh.hover, sx = 1, sy = 1, rz = 0, rx = 0;
    if (sp === 'fluff') {
      const hop = moving ? Math.abs(Math.sin(ph * 7)) : Math.abs(Math.sin(ph * 2.5)) * 0.2;
      y += hop * 0.28;
      sy = 1 + (hop < 0.15 ? -0.12 : 0.05); sx = 2 - sy;
    } else if (sp === 'beetle') {
      rz = Math.sin(ph * (moving ? 18 : 3)) * (moving ? 0.06 : 0.02);
      y += moving ? Math.abs(Math.sin(ph * 18)) * 0.03 : 0;
    } else if (sp === 'slime') {
      const k = Math.sin(ph * (moving ? 7 : 3));
      sy = 1 + k * (moving ? 0.14 : 0.06); sx = 1 - k * (moving ? 0.09 : 0.04);
    } else if (sp === 'turtle') {
      rz = Math.sin(ph * (moving ? 5 : 1.2)) * 0.04;
    } else if (sp === 'moth') {
      y += Math.sin(ph * 2.6) * 0.18;
      const f = Math.sin(ph * (m.state === 'chase' ? 22 : 13)) * 0.55;
      if (wings.length) { wings[0].rotation.z = -0.3 - f; wings[1].rotation.z = 0.3 + f; }
      rx = 0.15;
    } else if (sp === 'kingcap') {
      rz = Math.sin(ph * (moving ? 4 : 1)) * (moving ? 0.07 : 0.025);
      y += moving ? Math.abs(Math.sin(ph * 4)) * 0.06 : 0;
    } else if (sp === 'dummy') {
      rz = Math.sin(m.wobble * 16) * Math.max(0, m.wobble) * 0.9;
      m.wobble = Math.max(0, (m.wobble || 0) - dt * 1.2);
    }
    // 들이받기 예고: 움츠렸다가(납작) 튀어 나간다
    if (m.state === 'wind') {
      const k = 1 - m.wind / WIND[sp];
      sy *= 1 - 0.22 * k; sx *= 1 + 0.15 * k;
      rz += Math.sin(t * 60) * 0.05 * k;
    } else if (m.lunge > 0) {
      sy *= 1.12; sx *= 0.92;
    }
    if (m.stun > 0) rz += Math.sin(t * 40) * 0.08;
    inner.position.y = y;
    inner.scale.set(sx, sy, sx);
    inner.rotation.set(rx, 0, rz);
    body.material = m.flash > 0 ? flashMat : m.state === 'wind' && Math.sin(t * 30) > 0 ? warnMat : bodyMat;
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
    /** 살아 있는 것 중 (x, z) 에서 maxDist 안의 가장 가까운 몬스터. */
    nearest(x, z, maxDist, fn = null) {
      let best = null, bd = maxDist;
      for (const m of list) {
        if (m.dead || m.dormant || (fn && !fn(m))) continue;
        const d = Math.hypot(m.x - x, m.z - z) - m.M.size;
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    },
    /**
     * 내 공격: 바라보는 쪽 부채꼴 안의 몬스터를 때린다. → [{ m, killed }]
     * hit: { x, z, yaw, range, dmg, knock }
     */
    strike({ x, z, yaw, range, dmg, knock = 1 }) {
      const out = [];
      for (const m of list) {
        if (m.dead || m.dormant || !inSwing(x, z, yaw, range, m.x, m.z, m.M.size)) continue; // 잠든 왕버섯은 아직 깨울 수 없다
        m.hp -= dmg;
        m.flash = 0.13;
        m.engaged = true;
        if (m.species === 'dummy') m.wobble = 1;
        const d = Math.hypot(m.x - x, m.z - z) || 1;
        const push = (HEAVY[m.species] ? 0.45 : 1.2) * knock;
        if (m.species !== 'dummy') { m.kx = ((m.x - x) / d) * push * 6; m.kz = ((m.z - z) / d) * push * 6; }
        if (!HEAVY[m.species] || m.state !== 'wind') { m.stun = 0.35; if (m.state === 'wind') { m.state = 'chase'; m.cool = 0.6; } }
        if (m.state === 'wander') { m.state = 'chase'; m.alert = 0.8; }
        const killed = m.hp <= 0;
        if (killed) { m.dead = true; m.deadT = 0; poof(m.x, 0.4 + m.mesh.hover, m.z, m.M.size); }
        out.push({ m, killed });
      }
      return out;
    },
    /** 머리 위 체력 줄 · 알아챔(!) 표시. */
    labels(focus) {
      const out = [];
      for (const m of list) {
        if (m.dead || !m.mesh.root.visible || Math.hypot(m.x - focus.x, m.z - focus.z) > 16) continue;
        const y = m.mesh.height + (m.species === 'moth' ? Math.sin(performance.now() / 385 + m.phase) * 0.18 : 0);
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
    /**
     * ctx: { player: { x, z }, active: 나를 노려도 되는지(창 · 대화 · 잠 중이면 false), night: 0..1,
     *        onHit(m): 들이받기가 닿았을 때, onAggro(m): 나를 알아챘을 때 }
     */
    update(dt, t, ctx) {
      const p = ctx.player;
      nightK = ctx.night;
      glowMat.emissive.setRGB(1, 0.85, 0.4).multiplyScalar(0.3 + 0.9 * nightK);
      const playerSafe = inVillage(p.x, p.z, 0.6);
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i], M = m.M, root = m.mesh.root;
        const dp = Math.hypot(m.x - p.x, m.z - p.z);
        if (m.dead) {
          m.deadT += dt;
          const k = m.deadT / 0.35;
          root.scale.setScalar(Math.max(0.01, (1 + k * 0.3) * (1 - k)));
          root.rotation.y += dt * 14;
          if (k >= 1) removeAt(i);
          continue;
        }
        // 날이 밝으면 나방은 하늘로 날아가 사라진다
        if (m.species === 'moth' && nightK < 0.3 && !m.leaving && (m.state !== 'chase' || dp > 10)) m.leaving = true;
        if (m.leaving) {
          m.leaveT = (m.leaveT || 0) + dt;
          root.position.y = m.leaveT * 2.2;
          root.scale.setScalar(Math.max(0.01, 1 - m.leaveT / 1.6));
          if (m.leaveT > 1.6) removeAt(i);
          continue;
        }
        if (dp > ACTIVE_DIST && !m.exam) { root.visible = false; continue; }
        root.visible = true;
        if (m.born > 0) { m.born = Math.min(1, m.born + dt * 2.2); root.scale.setScalar(m.born >= 1 ? 1 : m.born); if (m.born >= 1) m.born = 0; }
        m.flash = Math.max(0, m.flash - dt);
        m.alert = Math.max(0, m.alert - dt);
        m.stun = Math.max(0, m.stun - dt);
        m.cool = Math.max(0, m.cool - dt);
        m.lunge = Math.max(0, (m.lunge || 0) - dt);
        let moving = false;
        // 밀려남
        if (Math.abs(m.kx) + Math.abs(m.kz) > 0.01) {
          moveBy(m, m.kx * dt, m.kz * dt);
          const damp = Math.exp(-dt * 9);
          m.kx *= damp; m.kz *= damp;
        }
        if (M.speed > 0) {
          const fromHome = Math.hypot(m.x - m.home.x, m.z - m.home.z);
          const canSee = ctx.active && !playerSafe && !m.dormant && dp < (m.engaged ? M.aggro * 1.7 : M.aggro);
          if (m.state !== 'return' && fromHome > LEASH) m.state = 'return';
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
          } else if (m.state === 'chase') {
            if (!canSee) { m.state = 'wander'; m.engaged = false; m.goal = { ...m.home }; }
            else if (m.stun <= 0) {
              const reach = M.size + 0.5;
              turnTo(m, p.x, p.z, dt, 9);
              if (dp < reach && m.cool <= 0) { m.state = 'wind'; m.wind = WIND[m.species]; }
              else if (dp > reach * 0.8) {
                const step = M.speed * dt;
                moveBy(m, ((p.x - m.x) / dp) * step, ((p.z - m.z) / dp) * step);
                moving = true;
              }
            }
            // 왕버섯: 쫓아오는 동안 이따금 포자를 뿜어 풀뭉치를 불러낸다(살아 있는 부하는 넷까지)
            if (M.boss && m.state === 'chase') {
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
                ctx.onSummon?.(m);
              }
            }
          } else if (m.state === 'wind') {
            turnTo(m, p.x, p.z, dt, 5);
            m.wind -= dt;
            if (m.wind <= 0) {
              // 들이받기: 앞으로 톡 튀어 나가며, 아직 닿을 거리면 맞는다
              m.state = 'chase';
              m.cool = COOL[m.species];
              m.lunge = 0.18;
              const lx = Math.sin(m.yaw), lz = Math.cos(m.yaw);
              moveBy(m, lx * 0.35, lz * 0.35);
              const d2 = Math.hypot(m.x - p.x, m.z - p.z);
              if (ctx.active && !playerSafe && d2 < M.size + 0.85) { m.hitPlayer = true; ctx.onHit?.(m); }
            }
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
        // 나와 겹치지 않게(들이받은 뒤에도 내 몸 안으로 파고들지 않는다)
        if (M.speed > 0) {
          const qx = m.x - p.x, qz = m.z - p.z, qd = Math.hypot(qx, qz), minD = M.size * 0.8 + 0.35;
          if (qd > 0.001 && qd < minD) moveBy(m, (qx / qd) * (minD - qd), (qz / qd) * (minD - qd));
        }
        // 서로 겹치지 않게 살짝 민다
        for (const o of list) {
          if (o === m || o.dead) continue;
          const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz), min = (m.M.size + o.M.size) * 0.8;
          if (od > 0.001 && od < min) moveBy(m, (ox / od) * (min - od) * 0.5, (oz / od) * (min - od) * 0.5);
        }
        root.position.set(m.x, 0, m.z);
        root.rotation.y = m.yaw;
        animate(m, dt, t, moving);
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
        puffMat.opacity = Math.max(0, 0.9 - f.t * 1.6);
        if (f.t > 0.55) { scene.remove(f.g); poofs.splice(i, 1); }
      }
      if (!poofs.length) puffMat.opacity = 0.9;
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
