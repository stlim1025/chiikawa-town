import * as THREE from 'three';
import { toonMesh, celMaterial, addOutline, GEO } from '../render/toon.js';
import { mergedGeometry } from '../render/batch.js';

/**
 * 아노코(마지막 보스, 길들이면 타고 다니고 집에서 쉰다). 생김새는 사용자가 보낸 그림 두 장(숲 바닥에 엎드린 모습 · 웃는 얼굴)을 따랐고,
 * 자세(서기 · 엎드리기)와 움직임(걷기 · 숨쉬기 · 꼬리 흔들기)은 게임에서 만들었다. 앞은 +z, 바닥이 y 0, 크기 1 일 때 선 키가 3 쯤.
 *  · 머리: 몸에 견주어 아주 큰 흰 털 뭉치. 둘레에 뾰족뾰족한 갈기(털 뭉치를 둘러 붙여 윤곽이 울퉁불퉁), 이마 가운데 작은 주황 뿔,
 *    양옆으로 처진 작은 귀
 *  · 몸: 앞쪽은 흰 털 가슴(얼굴 밑 털 목도리), 뒤쪽은 매끈한 베이지 엉덩이. 둘이 만나는 자리에 털 뭉치 띠
 *  · 다리 넷: 발끝에 짧고 뾰족한 주황 발톱 셋씩. 앞다리는 희고 뒷다리는 베이지
 *  · 꼬리: 초록 마디 다섯이 이어진 도마뱀 꼬리, 마디마다 아랫면에 흰 판
 *  · 얼굴 둘: 'swirl'(싸울 때 — 베이지 눈에 갈색 소용돌이, 작은 ω 입) · 'happy'(길든 뒤 — 감은 웃는 눈, 빗금 셋 분홍 볼, 송곳니 둘 보이는 ω 입)
 *  · 꾸밈 둘(친해지면 단다, setDecor): 갈기 옆에 묶은 리본, 등에 덮는 폭신한 안장 담요. 색은 아노코마다 따로 칠한다
 * 그리는 물체 수를 줄이려고 같은 묶음의 부품은 색을 꼭짓점에 칠해 한 도형으로 합쳤다(다리 · 발 · 꼬리 마디 · 머리는 움직이는 축이 따로 필요해 따로).
 */
/** 서 있는 키(크기 1). */
const HEIGHT = 3.0;
/** 타고 다닐 때의 크기: 선 키가 1.9 쯤 된다. */
export const ANOKO_RIDE_SCALE = 1.9 / HEIGHT;
/** 탄 캐릭터의 뿌리가 놓이는 등 위 자리(크기 1 기준. 부르는 쪽에서 ANOKO_RIDE_SCALE 을 곱한다). 갈기 바로 뒤, 등에 살짝 파묻힌다. */
export const ANOKO_SEAT = { y: 1.95, z: -0.3 };

const WHITE = '#fbfaf5', BEIGE = '#eadbc6', HORN = '#f2a46a', TAIL = '#7aa66e', PLATE = '#fbfaf5';
const INK = '#2b2224', EYE_FILL = '#f3dfc8', SWIRL = '#9a6a4c', CHEEK = '#f5a3b5', HATCH = '#b9506a', FANG = '#ffffff';
const LINE = 0.04; // 외곽선 굵기(크기 1 기준)

/** 가슴(흰 털) · 엉덩이(베이지) 가운데와 반지름. 몸통 묶음(trunk) 기준. */
const CHEST_C = [0, 1.15, 0.25], CHEST_R = [0.88, 0.85, 0.8];
const RUMP_C = [0, 1.2, -0.75], RUMP_R = [0.85, 0.85, 1.0];
/** 목(머리 묶음의 축)과 거기서 머리 가운데까지, 머리 반지름. */
const NECK = [0, 1.55, 0.55], HEAD_OFF = [0, 0.4, 0.3], HEAD_R = [1.0, 0.92, 0.9];
/** 다리: 엉덩관절에서 발까지 길이, 발 크기. */
const LEG_LEN = 0.78, PAW_R = [0.29, 0.17, 0.34];
/** 꼬리: 마디 길이와 마디별 굵기(뿌리가 굵다), 꼬리가 나오는 자리(몸통 묶음 기준). */
const TAIL_LEN = 0.44, TAIL_R = [0.3, 0.25, 0.2, 0.15, 0.1], TAIL_ROOT = [0, 1.0, -1.6];
/** 엎드릴 때 몸통이 내려앉는 높이(배가 바닥에 닿는다). */
const LIE_DROP = 0.4;

/**
 * 자세별 기본값(몸통 묶음 기준). legs: [앞왼, 앞오, 뒤왼, 뒤오] 의 { p: 엉덩관절 자리, yaw: 바깥으로 벌린 각, pitch: 앞으로 뻗은 각(음수가 앞) }.
 * tail: 마디마다 앞 마디에 대해 꺾인 각 [x(음수가 아래), y]. 서면 뒤로 늘어졌다 끝이 살짝 들리고, 엎드리면 바닥을 따라 옆으로 휜다.
 */
const POSES = {
  stand: {
    trunkY: 0, headY: 0, headTilt: 0,
    legs: [
      { p: [-0.5, 0.95, 0.4], yaw: 0, pitch: 0 }, { p: [0.5, 0.95, 0.4], yaw: 0, pitch: 0 },
      { p: [-0.55, 0.95, -0.9], yaw: 0, pitch: 0 }, { p: [0.55, 0.95, -0.9], yaw: 0, pitch: 0 }
    ],
    tail: [[-0.75, 0], [0.22, 0], [0.22, 0], [0.22, 0], [0.22, 0]]
  },
  lie: {
    trunkY: -LIE_DROP, headY: -0.12, headTilt: 0.08,
    legs: [
      { p: [-0.62, 0.7, 0.75], yaw: -0.5, pitch: -1.3 }, { p: [0.62, 0.7, 0.75], yaw: 0.5, pitch: -1.3 }, // 앞다리: 앞으로 쭉 뻗어 발톱이 머리 옆으로 보인다
      { p: [-0.78, 0.7, -0.7], yaw: -0.3, pitch: -1.3 }, { p: [0.78, 0.7, -0.7], yaw: 0.3, pitch: -1.3 } // 뒷다리: 배 옆으로 접는다
    ],
    tail: [[-0.5, 0.2], [0.14, 0.2], [0.14, 0.2], [0.12, 0.18], [0.1, 0.16]]
  }
};
/** 걸을 때 다리가 앞뒤로 흔들리는 박자: 대각선 다리끼리 같이 나간다. */
const GAIT_PHASE = [0, Math.PI, Math.PI, 0];

/**
 * 싸움 동작(앞발 할퀴기 · 꼬리 쓸기 · 포효)과 화난 털이 평소 자세에 더하는 값들의 번호. 값이 모두 0 이면 평소 모습 그대로다.
 * 매 장면 목표값을 정하고 지금 값을 절반씩 따라가게 해(FX_EASE), 동작이 바뀌거나 끝날 때 툭 끊기지 않는다.
 */
const FX = {
  TP: 0, TYAW: 1, REAR: 2, HP: 3, HZ: 4, HYAW: 5, SHAKE: 6, FUR: 7, PLANT: 8,
  LEG: 9, // 앞다리 둘 × [앞뒤 각, 벌린 각, 발 오므림, 엉덩관절 앞뒤] = 9 ~ 16
  TW: 17, TY: 18, // 꼬리: 쓸기 정도(펴지고 늘어난다), 마디 다섯의 옆 꺾임 = 18 ~ 22
  N: 23
};
const FX_EASE = 0.5;
/** 포효로 일어설 때 몸통이 들리는 각(28.6°)과 그 축이 되는 뒷다리 엉덩관절(몸통 묶음 기준 y, z). */
const REAR_MAX = 0.5, REAR_PIVOT = [0.95, -0.9];
/** 꼬리 쓸기: 마디별로 몸 뒤쪽에서 벗어나는 각(끝으로 갈수록 크게 감긴다), 쓸 때 펴지는 마디 각, 늘어나는 비율(끝이 반지름 3 쯤에 닿는다). */
const SWEEP_ARC = [0.9, 1.25, 1.55, 1.8, 2.0], SWEEP_FLAT = [-0.3, 0.1, 0.08, 0.06, 0.05], SWEEP_STRETCH = 0.3;
/** 화났을 때(2 단계) 눈 색: 붉은 눈에 검붉은 소용돌이. */
const RAGE_FILL = '#e5463a', RAGE_SWIRL = '#5c0f12';

/**
 * 꾸밈(setDecor). 리본: 머리(skull) 기준 자리와 기운 각 — 갈기 털끝 옆에 묶어 앞에서도, 등에 타고 뒤에서 봐도 갈기 밖으로 보인다.
 * 안장 담요: 엉덩이 겉면을 따라 등마루에서 양옆으로 SADDLE_ARC(라디안)만큼, 앞뒤로 SADDLE_Z(몸통 기준 z) 사이를 덮는다.
 * 앞 끝은 가슴 털 띠 밑으로 들어가고, 겉면에서 SADDLE_LIFT 만큼만 떠 있어 탄 자리(ANOKO_SEAT) 바로 밑에 깔린다.
 */
const BOW_AT = [1.26, -0.3, 0.08], BOW_ROT = [0, 0.4, -0.3];
const SADDLE_ARC = 0.9, SADDLE_Z = [-0.36, -1.08], SADDLE_LIFT = 0.03, SADDLE_RIM = 0.032;
/** 꾸밈의 어두운 쪽(매듭 · 담요 테두리): 꼭짓점 색으로 곱해져 고른 색보다 한 톤 짙다. */
const DECOR_TRIM = '#d4d4d4';
/** 반기기(animate 의 greet): 일어나는 구간 · 내려앉는 구간의 경계, 폴짝 횟수와 높이(크기 1 기준). */
const GREET_UP = 0.2, GREET_DOWN = 0.8, GREET_HOPS = 3, GREET_HOP = 0.25;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
/** a 에서 b 사이를 부드럽게 0 → 1. */
function smooth(a, b, x) {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}

/** 머리(가운데가 원점) 겉면에서 얼굴 면 (x, y) 자리와 그 자리를 바라보는 회전. push 만큼 겉면 밖으로 띄운다. */
function onHead(x, y, push = 0) {
  const [rx, ry, rz] = HEAD_R;
  const z = rz * Math.sqrt(Math.max(0.02, 1 - (x * x) / (rx * rx) - (y * y) / (ry * ry)));
  const n = new THREE.Vector3(x / (rx * rx), y / (ry * ry), z / (rz * rz)).normalize();
  return { p: [x + n.x * push, y + n.y * push, z + n.z * push], r: [-Math.asin(n.y), Math.atan2(n.x, n.z), 0] };
}

/** 얼굴 위 이어진 붓선: 얼굴 면 점들을 머리 겉면에 붙여 굵기 r 의 관으로 잇고 두 끝은 동그랗게. → mergedGeometry 부품들. */
function stroke(pts, r, color, push = 0.02) {
  const abs = pts.map(([x, y]) => onHead(x, y, push).p);
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(abs.map((p) => new THREE.Vector3(...p))), pts.length * 6, r, 6, false);
  return [
    { geometry: tube, color },
    ...[abs[0], abs[abs.length - 1]].map((p) => ({ geometry: GEO.dot, position: p, scale: [r, r, r], color }))
  ];
}

/** 얼굴 면에 납작한 동그라미 하나(눈 · 볼 · 빗금). rz 는 얼굴 면 안에서 기울인 각. */
function decal(x, y, scale, color, push = 0.02, rz = 0) {
  const q = onHead(x, y, push);
  return { geometry: GEO.sphereLow, position: q.p, rotation: [q.r[0], q.r[1], rz], scale, color };
}

/** ω 입(가운데 (0, y), 너비 w 의 절반이 한 혹). */
function omega(y, w, r) {
  const h = w * 0.42;
  return stroke([[-w, y + h * 0.5], [-w * 0.86, y - h * 0.5], [-w * 0.5, y - h], [-w * 0.14, y - h * 0.5], [0, y + h * 0.35], [w * 0.14, y - h * 0.5], [w * 0.5, y - h], [w * 0.86, y - h * 0.5], [w, y + h * 0.5]], r, INK);
}

/** 싸울 때 얼굴: 짙은 테두리의 베이지 둥근 눈에 갈색 소용돌이, 작은 ω 입. 눈 색과 소용돌이 색을 바꾸면 화난 붉은 눈이 된다. */
function swirlFace(fill = EYE_FILL, swirl = SWIRL) {
  const parts = [], EX = 0.4, EY = -0.06;
  for (const sd of [-1, 1]) {
    parts.push(decal(sd * EX, EY, [0.215, 0.215, 0.04], INK, 0.012));
    parts.push(decal(sd * EX, EY, [0.185, 0.185, 0.045], fill, 0.03));
    // 소용돌이: 가운데에서 바깥으로 한 바퀴 반 남짓 풀리는 선(왼쪽 눈은 거울처럼 뒤집는다)
    const N = 30, pts = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N, th = 0.6 + u * Math.PI * 3.4, rad = 0.02 + 0.11 * u;
      pts.push([sd * (EX + rad * Math.cos(th)), EY + rad * Math.sin(th)]);
    }
    parts.push(...stroke(pts, 0.014, swirl, 0.07));
  }
  parts.push(...omega(-0.3, 0.085, 0.013));
  return mergedGeometry(parts);
}

/** 길든 뒤 얼굴: 위로 휜 감은 눈, 짧은 눈썹, 빗금 셋 그은 분홍 볼, ω 입 밑으로 작은 송곳니 둘이 보이는 벌린 입. */
function happyFace() {
  const parts = [], EX = 0.4, EY = -0.04;
  for (const sd of [-1, 1]) {
    parts.push(...stroke([-1, -0.6, -0.2, 0.2, 0.6, 1].map((k) => [sd * (EX + k * 0.14), EY + 0.065 * (1 - k * k) - 0.012 * k]), 0.016, INK));
    parts.push(...stroke([[sd * (EX - 0.07), 0.24], [sd * (EX - 0.02), 0.245]], 0.013, INK));
    parts.push(decal(sd * 0.55, -0.27, [0.17, 0.1, 0.03], CHEEK, 0.004));
    for (const k of [-1, 0, 1]) parts.push(decal(sd * 0.55 + k * 0.055, -0.27, [0.011, 0.05, 0.012], HATCH, 0.03, -0.4));
    // 송곳니: 입 안에서 아래로 뾰족한 작은 흰 이
    const f = onHead(sd * 0.024, -0.322, 0.016);
    parts.push({ geometry: GEO.cone, position: f.p, rotation: [Math.PI + f.r[0], f.r[1], 0], scale: [0.017, 0.046, 0.01], color: FANG });
  }
  parts.push(...omega(-0.3, 0.095, 0.014));
  parts.push(...stroke([[-0.05, -0.325], [-0.043, -0.37], [0, -0.395], [0.043, -0.37], [0.05, -0.325]], 0.012, INK)); // 벌린 입 아래 둘레
  parts.push(...stroke([[-0.03, -0.455], [0.03, -0.455]], 0.011, INK)); // 턱 밑 짧은 선
  return mergedGeometry(parts);
}

/** 엉덩이 겉면에서 등마루로부터 옆으로 phi(라디안) 돌아간, 앞뒤 z 자리(몸통 기준)와 그 자리의 바깥 방향. lift 만큼 겉면 밖으로 띄운다. */
function onRump(phi, z, lift = 0) {
  const [rx, ry, rz] = RUMP_R, dz = z - RUMP_C[2], s = Math.sqrt(Math.max(0.02, 1 - (dz * dz) / (rz * rz)));
  const x = rx * s * Math.sin(phi), y = ry * s * Math.cos(phi);
  const n = new THREE.Vector3(x / (rx * rx), y / (ry * ry), dz / (rz * rz)).normalize();
  return { p: new THREE.Vector3(x + n.x * lift, RUMP_C[1] + y + n.y * lift, z + n.z * lift), n };
}

/** 리본(매듭이 원점, 앞이 +z): 가운데 매듭, 양옆으로 살짝 치켜든 고리 둘, 아래로 벌어진 끈 둘. */
function bowGeometry() {
  const list = [{ geometry: GEO.sphereLow, scale: [0.08, 0.09, 0.08], color: DECOR_TRIM }];
  for (const sd of [-1, 1]) {
    list.push({ geometry: GEO.sphereMid, position: [sd * 0.18, 0.035, 0], rotation: [0, 0, sd * 0.3], scale: [0.18, 0.125, 0.07], color: '#ffffff' });
    list.push({ geometry: GEO.sphereLow, position: [sd * 0.09, -0.19, -0.01], rotation: [0, 0, sd * 0.38], scale: [0.06, 0.16, 0.042], color: '#ffffff' });
  }
  return mergedGeometry(list);
}

/** 안장 담요(몸통 기준 좌표): 엉덩이 겉면을 따라 덮은 천 + 가장자리를 두른 도톰한 테두리 + 뒤쪽 등받이 솜 말이. */
function saddleGeometry() {
  const NU = 12, NV = 8, [z0, z1] = SADDLE_Z, pos = [], nor = [], idx = [];
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const q = onRump(lerp(-SADDLE_ARC, SADDLE_ARC, i / NU), lerp(z0, z1, j / NV), SADDLE_LIFT);
      pos.push(q.p.x, q.p.y, q.p.z);
      nor.push(q.n.x, q.n.y, q.n.z);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c); // 바깥에서 봤을 때 앞면
    }
  }
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  cloth.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  cloth.setIndex(idx);
  // 테두리: 천 둘레를 한 바퀴(앞 → 오른쪽 → 뒤 → 왼쪽) 도는 관. 천 가장자리와 몸 사이 틈을 가린다
  const rim = [], edge = (phi, z) => rim.push(onRump(phi, z, SADDLE_LIFT).p);
  for (let i = 0; i < NU; i++) edge(lerp(-SADDLE_ARC, SADDLE_ARC, i / NU), z0);
  for (let j = 0; j < NV; j++) edge(SADDLE_ARC, lerp(z0, z1, j / NV));
  for (let i = 0; i < NU; i++) edge(lerp(SADDLE_ARC, -SADDLE_ARC, i / NU), z1);
  for (let j = 0; j < NV; j++) edge(-SADDLE_ARC, lerp(z1, z0, j / NV));
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), rim.length * 2, SADDLE_RIM, 6, true);
  const back = onRump(0, z1 + 0.1, SADDLE_LIFT - 0.01);
  return mergedGeometry([
    { geometry: cloth, color: '#ffffff' },
    { geometry: tube, color: DECOR_TRIM },
    { geometry: GEO.sphereLow, position: back.p.toArray(), rotation: [Math.atan2(back.n.z, back.n.y), 0, 0], scale: [0.3, 0.08, 0.1], color: DECOR_TRIM }
  ]);
}

/** 꾸밈 하나의 재질: 몸과 같은 손그림 재질을 아노코마다 따로 복제해 uColor 만 바꾼다(나눠 쓰는 재질은 건드리지 않는다). 하늘빛(uLight)은 그대로 나눠 쓴다. */
function decorMaterial() {
  const src = celMaterial('#ffffff', { vertexColors: true }), m = src.clone();
  m.uniforms.uLight = src.uniforms.uLight;
  return m;
}

let parts = null; // 아노코마다 같은 도형 · 재질을 나눠 쓴다(보스 · 탈것 · 집에서 쉬는 것)
function shared() {
  if (parts) return parts;
  // 머리 본체(가운데가 원점): 큰 흰 공 + 처진 귀 둘 + 이마의 주황 뿔
  const hornAt = onHead(0, 0.5, -0.04);
  const head = mergedGeometry([
    { geometry: GEO.sphere, scale: HEAD_R, color: WHITE },
    ...[-1, 1].map((sd) => ({ geometry: GEO.sphereMid, position: [sd * 0.84, 0.66, -0.05], rotation: [0, 0, -sd * 0.38], scale: [0.32, 0.17, 0.2], color: WHITE })),
    { geometry: GEO.cone, position: hornAt.p, rotation: [0.55, 0, 0], scale: [0.11, 0.3, 0.11], color: HORN }
  ]);
  // 갈기: 머리 둘레에 바깥으로 뾰족한 털 뭉치를 두 겹으로 둘러 윤곽을 울퉁불퉁하게. 앞 겹은 정수리(귀 사이)를 비우고 아래로 갈수록 크다
  const tufts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, up = Math.sin(a);
    if (up > 0.8) continue;
    const k = 1 + 0.18 * Math.max(0, -up);
    tufts.push({ geometry: GEO.sphereLow, position: [Math.cos(a) * 0.9, up * 0.82, -0.08], rotation: [0, 0, a - Math.PI / 2], scale: [0.2 * k, 0.33 * k, 0.22], color: WHITE });
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    tufts.push({ geometry: GEO.sphereLow, position: [Math.cos(a) * 0.8, Math.sin(a) * 0.74, -0.45], rotation: [0, 0, a - Math.PI / 2], scale: [0.22, 0.33, 0.24], color: WHITE });
  }
  const mane = mergedGeometry(tufts);
  // 가슴(가운데가 원점, 숨쉴 때 부푼다): 흰 털 공 + 얼굴 밑 털 목도리 + 베이지 엉덩이와 만나는 자리의 털 띠
  const chest = mergedGeometry([
    { geometry: GEO.sphere, scale: CHEST_R, color: WHITE },
    ...[-0.95, -0.48, 0, 0.48, 0.95].map((a) => ({ geometry: GEO.sphereLow, position: [Math.sin(a) * 0.72, -0.22, 0.35 + Math.cos(a) * 0.55], scale: [0.33, 0.3, 0.33], color: WHITE })),
    ...Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return { geometry: GEO.sphereLow, position: [Math.cos(a) * 0.79, Math.sin(a) * 0.75, -0.5], rotation: [0, 0, a - Math.PI / 2], scale: [0.2, 0.22, 0.27], color: WHITE };
    })
  ]);
  const rump = mergedGeometry([{ geometry: GEO.sphere, position: RUMP_C, scale: RUMP_R, color: BEIGE }]);
  // 다리 윗부분(엉덩관절이 원점, 아래로 뻗는다)과 발(발 가운데가 원점, 앞으로 뾰족한 주황 발톱 셋)
  const leg = (color) => mergedGeometry([{ geometry: GEO.sphereMid, position: [0, -0.38, 0], scale: [0.27, 0.5, 0.29], color }]);
  const paw = (color) => mergedGeometry([
    { geometry: GEO.sphereMid, scale: PAW_R, color },
    ...[-1, 0, 1].map((k) => ({ geometry: GEO.cone, position: [k * 0.15, -0.035, 0.2], rotation: [1.72, k * 0.3, 0], scale: [0.078, 0.24, 0.078], color: HORN }))
  ]);
  // 꼬리 마디(앞 끝이 원점, -z 로 뻗는다): 초록 몸 + 아랫면 흰 판(마디마다 끊겨 보인다)
  const tail = TAIL_R.map((r) => mergedGeometry([
    { geometry: GEO.sphereMid, position: [0, 0, -TAIL_LEN / 2], scale: [r, r * 0.9, TAIL_LEN * 0.64], color: TAIL },
    { geometry: GEO.sphereLow, position: [0, -r * 0.4, -TAIL_LEN / 2], scale: [r * 0.93, r * 0.62, TAIL_LEN * 0.44], color: PLATE }
  ]));
  parts = {
    head, mane, chest, rump, tail,
    legFront: leg(WHITE), legHind: leg(BEIGE), pawFront: paw(WHITE), pawHind: paw(BEIGE),
    swirl: swirlFace(), happy: happyFace(),
    fur: celMaterial('#ffffff', { vertexColors: true }), // 몸: 캐릭터와 같은 손그림 재질(색은 꼭짓점에)
    ink: celMaterial('#ffffff', { vertexColors: true, flat: true }) // 얼굴: 그늘 없이 단색
  };
  return parts;
}

/** 손그림 외곽선이 붙은 몸 부품 하나. */
function furMesh(geometry, material, line = LINE) {
  const mesh = toonMesh(geometry, null, { material, outline: false });
  addOutline(mesh, line, true);
  return mesh;
}

/**
 * 아노코 하나. → { root, height(크기 1 일 때 선 키), setFace('swirl' | 'happy'), setPose('stand' | 'lie'), setRage(0 | 1 | 2),
 *   setDecor({ ribbon, saddle }), animate(t, { moving, step, claw, tail, roar, greet }), bob }.
 * root 에 모두 들어 있어 부르는 쪽은 root 의 자리 · 방향 · 크기만 바꾼다. 처음에는 서서 소용돌이 눈.
 * 묶음: trunk(몸통 전체 — 걸을 때 통통, 엎드리면 내려앉는다) 아래 head(목이 축), legs 넷(엉덩관절이 축, 그 아래 paw 가 발목 축), tail 마디 다섯(앞 마디에 이어 붙는다).
 * 싸움 동작(보스만 쓴다. 한 번에 하나만 넘기고, 없거나 null 이면 평소 걷기 · 서기 그대로. 끝나면 0.1 초쯤에 걸쳐 평소 자세로 돌아온다):
 *  · claw: { wind: 0 ~ 1, side } 앞발을 들어 바깥 뒤로 젖힌다 / { swing: 0 ~ 1, side } 그 앞발로 가슴 앞을 바깥에서 안으로 가로 할퀸다.
 *    side 1 은 +x 쪽 앞다리(legs[1]), -1 은 -x 쪽 앞다리(legs[0]). 안 주면 1
 *  · tail: { wind: 0 ~ 1 } 꼬리를 +x 쪽으로 감아 든다 / { sweep: 0 ~ 1 } +x 쪽에서 바로 뒤(-z)를 지나 -x 쪽까지 뒤 반원을 휘두른다(몸은 앞을 본 채)
 *  · roar: 0 ~ 1. 뒷다리로 일어섰다(0 ~ 0.3) 털을 부풀려 떨며 버티고(~ 0.75) 앞발로 내려앉는다. 충격파는 0.35 쯤
 *  · setRage(2): 소용돌이 눈이 붉어지고 갈기 · 가슴 털이 8% 부푼다. 0 · 1 은 평소 모습
 * 친해진 뒤(집 · 탈것만 쓴다):
 *  · setDecor({ ribbon, saddle }): 리본 · 안장 담요의 색('#rrggbb') 또는 null(숨김). 안 넘긴 것은 그대로 둔다
 *  · greet: 0 ~ 1. 엎드린 채(setPose('lie')) 넘기면 일어나(0 ~ 0.2) 꼬리를 크게 흔들며 세 번 폴짝 뛰고(~ 0.8) 다시 엎드린다. 얼굴은 setFace 그대로
 */
export function buildAnoko() {
  const P = shared(), root = new THREE.Group(), trunk = new THREE.Group();
  root.add(trunk);
  trunk.add(furMesh(P.rump, P.fur));
  const chest = furMesh(P.chest, P.fur);
  chest.position.set(...CHEST_C);
  trunk.add(chest);

  // 머리: 목을 축으로 끄덕인다. 얼굴 둘은 같은 자리에 겹쳐 두고 하나만 보인다
  const head = new THREE.Group(), skull = new THREE.Group();
  head.position.set(...NECK);
  skull.position.set(...HEAD_OFF);
  head.add(skull);
  trunk.add(head);
  skull.add(furMesh(P.head, P.fur));
  const mane = furMesh(P.mane, P.fur);
  skull.add(mane);
  const faces = {};
  for (const kind of ['swirl', 'happy']) {
    const f = new THREE.Mesh(P[kind], P.ink);
    f.raycast = () => {};
    f.visible = kind === 'swirl';
    skull.add(f);
    faces[kind] = f;
  }

  // 다리 넷: 앞 둘은 희고 뒤 둘은 베이지. 발은 다리가 뻗어도 바닥과 나란하게 따로 돌린다
  const legs = GAIT_PHASE.map((phase, i) => {
    const front = i < 2, group = new THREE.Group(), paw = furMesh(front ? P.pawFront : P.pawHind, P.fur, 0.03);
    group.rotation.order = 'YXZ';
    group.add(furMesh(front ? P.legFront : P.legHind, P.fur));
    paw.position.set(0, -LEG_LEN, 0.08);
    group.add(paw);
    trunk.add(group);
    return { group, paw, phase };
  });

  // 꼬리: 마디가 앞 마디 끝에 이어져 뿌리에서 끝으로 갈수록 크게 휜다
  const tail = [];
  let holder = trunk;
  P.tail.forEach((geo, i) => {
    const seg = new THREE.Group();
    seg.rotation.order = 'YXZ';
    seg.position.set(...(i ? [0, 0, -TAIL_LEN * 0.9] : TAIL_ROOT));
    seg.add(furMesh(geo, P.fur, 0.03));
    holder.add(seg);
    holder = seg;
    tail.push(seg);
  });

  let pose = 'stand', base = POSES.stand, gait = 0; // gait: 걷는 정도(0 ~ 1, 서고 걷는 사이를 부드럽게 잇는다)
  const fxTgt = new Array(FX.N).fill(0), fxCur = new Array(FX.N).fill(0); // 싸움 동작이 더하는 값: 목표와 지금
  let fxOn = false, rage = 0;
  const decor = { ribbon: { color: null, mesh: null }, saddle: { color: null, mesh: null } }; // 꾸밈: 지금 색과 부품(처음 달 때 만든다)
  let greetS = 0, greetLive = false; // 반기기: 일어선 정도(0 엎드림 ~ 1 섬), 지난 장면에 반기기 값을 넣었는지
  const mixed = { trunkY: 0, headY: 0, headTilt: 0, legs: POSES.lie.legs.map(() => ({ p: [0, 0, 0], yaw: 0, pitch: 0 })), tail: POSES.lie.tail.map(() => [0, 0]) }; // 엎드림과 섬 사이 자세(매 장면 다시 채운다)

  /** 화난 정도(싸움 단계 0 · 1 · 2)에 맞는 모습. 2 면 소용돌이 눈이 붉어지고 털이 부푼다(털은 animate 에서 천천히). 같은 값으로 다시 불러도 아무 일도 하지 않는다. */
  function setRage(level) {
    const lv = level >= 2 ? 2 : level >= 1 ? 1 : 0;
    if (lv === rage) return;
    rage = lv;
    if (lv === 2 && !P.swirlRage) P.swirlRage = swirlFace(RAGE_FILL, RAGE_SWIRL); // 붉은 눈 도형은 처음 화날 때 한 번만 만든다
    faces.swirl.geometry = lv === 2 ? P.swirlRage : P.swirl;
  }

  /** 싸움 동작의 목표값을 정하고 지금 값을 따라가게 한다. → 이번 장면에 더할 값이 있는지. */
  function updateFx(opts) {
    const claw = opts.claw, sweep = opts.tail, roar = opts.roar, puff = rage === 2 ? 0.08 : 0;
    if (!fxOn && !claw && !sweep && roar == null && !puff) return false;
    const T = fxTgt;
    T.fill(0);
    T[FX.FUR] = puff;
    if (claw) {
      // 앞발 할퀴기: side 쪽 앞다리(+x 가 legs[1])를 들어 바깥에서 안으로 휘두른다
      const s = claw.side < 0 ? -1 : 1, L = FX.LEG + (s < 0 ? 0 : 4);
      T[FX.PLANT] = 1;
      if (claw.swing != null) {
        const k = clamp01(claw.swing);
        const e = 1 - (1 - clamp01((k - 0.15) / 0.45)) ** 3; // 처음에 확 나가고 끝에서 느려진다
        const hold = 1 - 0.85 * smooth(0.6, 1, k); // 휘두른 뒤 발을 내려 다음 할퀴기로 이어진다
        T[L] = hold * (-0.85 - 0.3 * Math.sin(e * Math.PI));
        T[L + 1] = hold * s * lerp(1.1, -1.0, e);
        T[L + 2] = hold * 0.6;
        T[L + 3] = hold * lerp(-0.1, 0.2, e);
        T[FX.TP] = hold * lerp(-0.07, 0.1, e);
        T[FX.TYAW] = hold * s * lerp(0.08, -0.14, e);
        T[FX.HP] = hold * lerp(-0.12, 0.2, e);
        T[FX.HZ] = hold * lerp(-0.08, 0.05, e);
      } else {
        const w = smooth(0, 1, claw.wind ?? 0);
        T[L] = -0.85 * w;
        T[L + 1] = s * 1.1 * w;
        T[L + 2] = 0.6 * w;
        T[L + 3] = -0.1 * w;
        T[FX.TP] = -0.07 * w; // 몸을 살짝 뒤로 젖히고 머리를 당긴다
        T[FX.TYAW] = s * 0.08 * w;
        T[FX.HP] = -0.12 * w;
        T[FX.HZ] = -0.08 * w;
      }
    } else if (sweep) {
      // 꼬리 쓸기: 마디마다 조금씩 늦게 따라가 끝이 채찍처럼 뒤따른다. 엉덩이는 꼬리 반대쪽으로 8° 까지만 틀고 머리는 그만큼 되돌려 앞을 본다
      let w, d0 = -1;
      const dir = [-1, -1, -1, -1, -1]; // -1: +x 쪽, 0: 바로 뒤, 1: -x 쪽
      if (sweep.sweep != null) {
        const k = clamp01(sweep.sweep);
        w = 1 - smooth(0.7, 1, k);
        for (let i = 0; i < 5; i++) dir[i] = -1 + 2 * smooth(0, 1, (k - i * 0.06) / 0.42);
        d0 = dir[0];
      } else w = smooth(0, 1, sweep.wind ?? 0);
      let prev = 0;
      for (let i = 0; i < 5; i++) {
        const c = SWEEP_ARC[i] * dir[i] * w;
        T[FX.TY + i] = c - prev;
        prev = c;
      }
      T[FX.TW] = w;
      T[FX.TYAW] = -0.14 * d0 * w;
      T[FX.HYAW] = 0.14 * d0 * w;
    } else if (roar != null) {
      // 포효: 일어선다 → 버티며 털을 부풀리고 떤다 → 앞발로 내려앉아 한 번 살짝 튄다
      const k = clamp01(roar);
      let up, nod = 0;
      if (k < 0.3) up = Math.sin((k / 0.3) * Math.PI / 2);
      else if (k < 0.75) up = 1;
      else if (k < 0.9) up = 1 - ((k - 0.75) / 0.15) ** 2;
      else { up = 0.1 * Math.sin(((k - 0.9) / 0.1) * Math.PI); nod = up; }
      T[FX.PLANT] = 1;
      T[FX.REAR] = up;
      T[FX.HP] = -0.2 * up + nod;
      for (const L of [FX.LEG, FX.LEG + 4]) { T[L] = -0.35 * up; T[L + 2] = 1.3 * up; } // 든 앞발은 앞으로 모으고 발끝을 늘어뜨린다
      T[FX.SHAKE] = smooth(0.28, 0.36, k) * (1 - smooth(0.68, 0.78, k));
      T[FX.FUR] += 0.13 * smooth(0.2, 0.36, k) * (1 - smooth(0.75, 0.95, k));
    }
    let live = 0;
    for (let i = 0; i < FX.N; i++) {
      fxCur[i] += (T[i] - fxCur[i]) * FX_EASE;
      live = Math.max(live, Math.abs(fxCur[i]));
    }
    fxOn = !!claw || !!sweep || roar != null || puff > 0 || live > 0.001;
    if (!fxOn) fxCur.fill(0); // 다 돌아왔으면 0 으로 한 번 더 적용해 평소 값으로 되돌려 놓고 끝낸다
    return true;
  }

  /** 싸움 동작 값을 평소 움직임 위에 더한다(animate 가 평소 값을 다 넣은 뒤 부른다). */
  function applyFx(t) {
    const C = fxCur, shake = C[FX.SHAKE];
    // 몸통: 일어설 때는 뒷다리 엉덩관절을 축으로 들려 뒷발이 바닥에 그대로 있다
    const th = -REAR_MAX * C[FX.REAR], cs = Math.cos(th), sn = Math.sin(th), [py, pz] = REAR_PIVOT;
    trunk.rotation.x += th + C[FX.TP];
    trunk.rotation.y = C[FX.TYAW];
    trunk.position.y += py - (py * cs - pz * sn) + Math.max(0, C[FX.TP]) * 0.4; // 앞으로 숙일 때 앞발이 바닥에 파묻히지 않게 살짝 든다
    trunk.position.z = pz - (py * sn + pz * cs);
    trunk.position.x = Math.sin(t * 61) * 0.014 * shake;
    head.rotation.x += C[FX.HP];
    head.rotation.y = C[FX.HYAW] + Math.sin(t * 34) * 0.1 * shake;
    head.rotation.z = Math.sin(t * 34 + 1.3) * 0.04 * shake;
    head.position.z = NECK[2] + C[FX.HZ];
    chest.scale.multiplyScalar(1 + C[FX.FUR]);
    mane.scale.multiplyScalar(1 + C[FX.FUR]);
    legs.forEach(({ group, paw }, i) => {
      if (i < 2) {
        const b = base.legs[i], L = FX.LEG + i * 4;
        group.rotation.x += C[L];
        group.rotation.y = b.yaw + C[L + 1];
        paw.rotation.x += -C[L] + C[L + 2]; // 다리가 들린 만큼 발을 되돌리고 그 위에 오므린다
        group.position.z = b.p[2] + C[L + 3];
      } else group.rotation.x -= th; // 뒷다리는 몸통이 들린 만큼 되돌려 곧게 선 채로
    });
    tail[0].scale.setScalar(1 + SWEEP_STRETCH * C[FX.TW]);
    tail.forEach((seg, i) => {
      seg.rotation.y += C[FX.TY + i];
      seg.rotation.x += (SWEEP_FLAT[i] - base.tail[i][0]) * C[FX.TW];
    });
    tail[0].rotation.x += -th + 0.35 * C[FX.REAR]; // 일어서도 꼬리가 바닥에 박히지 않게 들어 준다
  }

  /**
   * 꾸밈을 단다 · 뗀다. ribbon: 갈기 옆 리본, saddle: 등 위 안장 담요. 값은 색('#rrggbb') 또는 null(숨김), 안 넘긴 것(undefined)은 그대로 둔다.
   * 리본은 머리에, 담요는 몸통에 붙어 걷거나 뛰거나 엎드려도 같이 움직인다. 같은 값으로 다시 불러도 아무 일도 하지 않는다.
   */
  function setDecor(opts = {}) {
    for (const kind of ['ribbon', 'saddle']) {
      if (opts[kind] === undefined) continue;
      const d = decor[kind], color = opts[kind] || null;
      if (color === d.color) continue;
      d.color = color;
      if (color && !d.mesh) {
        // 도형은 모든 아노코가 나눠 쓰고(처음 달 때 한 번 만든다) 재질만 따로 둔다
        if (kind === 'ribbon') {
          if (!P.bow) P.bow = bowGeometry();
          d.mesh = furMesh(P.bow, decorMaterial(), 0.025);
          d.mesh.position.set(...BOW_AT);
          d.mesh.rotation.set(...BOW_ROT);
          skull.add(d.mesh);
        } else {
          if (!P.saddle) P.saddle = saddleGeometry();
          d.mesh = furMesh(P.saddle, decorMaterial(), 0.022);
          trunk.add(d.mesh);
        }
      }
      if (!d.mesh) continue;
      d.mesh.visible = !!color;
      if (color) d.mesh.material.uniforms.uColor.value.set(color);
    }
  }

  /**
   * 반기기 값 k(0 ~ 1, 없으면 null)에서 일어선 정도(0 엎드림 ~ 1 섬)를 구한다. 0 ~ 0.2 에 일어나고 0.8 ~ 1 에 다시 엎드린다.
   * 도중에 값이 끊기면(null) 툭 떨어지지 않게 몇 장면에 걸쳐 엎드린 자세로 돌아간다.
   */
  function greetStand(k) {
    if (k == null) greetS = greetS > 0.002 ? greetS * 0.7 : 0;
    else {
      const c = clamp01(k);
      greetS = c < GREET_UP ? smooth(0, GREET_UP, c) : c > GREET_DOWN ? 1 - smooth(GREET_DOWN, 1, c) : 1;
    }
    return greetS;
  }

  /** 엎드린 자세와 선 자세를 s(0 ~ 1)만큼 섞은 자세. 높이(몸통 · 엉덩관절)는 조금 앞서 올려, 다리를 펴는 동안 발이 땅에 파묻히지 않는다. */
  function blendPose(s) {
    const A = POSES.lie, B = POSES.stand, u = 1 - (1 - s) * (1 - s);
    mixed.trunkY = lerp(A.trunkY, B.trunkY, u);
    mixed.headY = lerp(A.headY, B.headY, s);
    mixed.headTilt = lerp(A.headTilt, B.headTilt, s);
    mixed.legs.forEach((leg, i) => {
      const a = A.legs[i], b = B.legs[i];
      leg.p[0] = lerp(a.p[0], b.p[0], s);
      leg.p[1] = lerp(a.p[1], b.p[1], u);
      leg.p[2] = lerp(a.p[2], b.p[2], s);
      leg.yaw = lerp(a.yaw, b.yaw, s);
      leg.pitch = lerp(a.pitch, b.pitch, s);
    });
    mixed.tail.forEach((seg, i) => {
      seg[0] = lerp(A.tail[i][0], B.tail[i][0], s);
      seg[1] = lerp(A.tail[i][1], B.tail[i][1], s);
    });
    return mixed;
  }

  /**
   * 반기기 몸짓을 평소 움직임 위에 얹는다(animate 가 자세 b 로 평소 값을 다 넣은 뒤 부른다). k: 반기기 값(null 이면 돌아가는 중), s: 일어선 정도.
   * setPose 에서만 정하던 값(머리 높이 · 엉덩관절 자리 · 벌린 각)도 여기서 넣으므로, s 가 0 이 된 장면에 한 번 더 불러 엎드린 값으로 되돌린다.
   */
  function applyGreet(t, k, s, b) {
    // 폴짝: 0.2 ~ 0.8 사이에 세 번. 땅에 닿을 때마다 납작해졌다 튀고, 뛰기 직전 · 마지막 착지 뒤에는 살짝만 움츠린다
    let air = 0, squash = 0;
    if (k != null && k > GREET_UP && k < GREET_DOWN) {
      const q = (k - GREET_UP) / (GREET_DOWN - GREET_UP);
      air = Math.abs(Math.sin(q * Math.PI * GREET_HOPS));
      squash = (1 - air) ** 2 * smooth(0, 0.06, q) * (1 - smooth(0.94, 1, q));
    }
    trunk.position.y += GREET_HOP * air;
    trunk.scale.set(1 + 0.06 * squash, 1 - 0.1 * squash, 1 + 0.06 * squash);
    head.position.y = NECK[1] + b.headY;
    head.rotation.x -= s * 0.1 + air * 0.08; // 고개를 들고
    head.rotation.z = s * 0.14 * Math.sin(t * 5); // 좋아서 좌우로 갸웃갸웃
    legs.forEach(({ group, paw }, i) => {
      const l = b.legs[i], kick = (i < 2 ? -0.3 : 0.3) * air; // 뜬 동안 앞발은 앞으로, 뒷발은 뒤로
      group.position.set(l.p[0], l.p[1], l.p[2]);
      group.rotation.y = l.yaw;
      group.rotation.x += kick;
      paw.rotation.x -= kick;
    });
    tail.forEach((seg, i) => { seg.rotation.y += s * 0.3 * Math.sin(t * 15 - i * 0.5); }); // 꼬리를 크고 빠르게
    tail[0].rotation.x += s * 0.4; // 꼬리를 치켜든다
  }

  /** 얼굴을 바꾼다: 'swirl'(소용돌이 눈) · 'happy'(웃는 얼굴). */
  function setFace(kind) {
    const k = kind === 'happy' ? 'happy' : 'swirl';
    faces.swirl.visible = k === 'swirl';
    faces.happy.visible = k === 'happy';
  }

  /** 자세를 바꾼다: 'stand'(네 다리로 선다) · 'lie'(배를 바닥에 대고 앞다리를 뻗는다). 부품 자리 · 각도만 옮긴다. */
  function setPose(kind) {
    pose = kind === 'lie' ? 'lie' : 'stand';
    base = POSES[pose];
    gait = 0;
    greetS = 0; // 반기던 중이면 그만둔다(아래에서 자세 값을 모두 새로 넣는다)
    greetLive = false;
    trunk.position.y = base.trunkY;
    head.position.y = NECK[1] + base.headY;
    head.rotation.set(base.headTilt, 0, 0);
    legs.forEach(({ group, paw }, i) => {
      const b = base.legs[i];
      group.position.set(...b.p);
      group.rotation.set(b.pitch, b.yaw, 0);
      paw.rotation.x = -b.pitch;
    });
    tail.forEach((seg, i) => seg.rotation.set(base.tail[i][0], base.tail[i][1], 0));
  }

  /**
   * 매 장면 부른다(t: 초). moving 이면 네 다리 걸음(step 이 있으면 그 값을 걸음 박자로, 없으면 시간에서)과 몸 통통.
   * 늘: 가슴 · 갈기 숨쉬기와 느린 꼬리 흔들기. 엎드린 자세에서는 다리는 그대로 두고 숨쉬기와 느긋한 꼬리만.
   * claw · tail · roar 를 넘기면 그 싸움 동작을 평소 움직임 위에 얹는다(값의 뜻은 buildAnoko 설명). 할퀴거나 포효하는 동안은 제자리걸음을 하지 않는다.
   * greet(0 ~ 1, 엎드린 자세에서만): 집에서 반기는 몸짓. 일어나 꼬리를 흔들며 폴짝폴짝 뛰고 다시 엎드린다. 부르는 쪽은 setPose('lie') 그대로 두고 값만 넘긴다(끝나면 null).
   */
  function animate(t, opts = {}) {
    const fx = updateFx(opts), plant = fx ? fxCur[FX.PLANT] : 0;
    const lying = pose === 'lie', moving = !lying && !!opts.moving && !opts.claw && opts.roar == null;
    const stand = lying ? greetStand(opts.greet) : 0, greeting = stand > 0 || greetLive; // 반기는 중이거나, 방금 끝나 엎드린 값으로 되돌릴 장면
    const b0 = stand > 0 ? blendPose(stand) : base; // 이번 장면의 기본 자세(반기는 동안만 엎드림과 섬 사이)
    gait += ((moving ? 1 : 0) - gait) * 0.2;
    if (gait < 0.001) gait = 0;
    const ph = opts.step != null ? opts.step : t * 8;
    const breath = Math.sin(t * (lying ? 1.3 : 1.9));
    chest.scale.setScalar(1 + 0.014 * breath);
    mane.scale.setScalar(1 + 0.012 * Math.sin(t * (lying ? 1.3 : 1.9) - 0.5));
    // 달릴 때: 한 걸음에 두 번 몸 전체가 통통 튀어 오르고(가라앉을 때 살짝 납작), 앞뒤로 껑충 기울며 좌우로도 조금 흔들린다
    const hop = Math.sin(ph) ** 2;
    trunk.position.y = b0.trunkY + gait * hop * 0.2;
    trunk.rotation.x = gait * Math.sin(ph * 2 + 0.8) * 0.08;
    trunk.rotation.z = gait * Math.sin(ph) * 0.045;
    trunk.scale.set(1 + gait * (1 - hop) * 0.03, 1 - gait * (1 - hop) * 0.05, 1 + gait * (1 - hop) * 0.03);
    head.rotation.x = b0.headTilt + 0.012 * breath - gait * Math.sin(ph * 2 + 1.4) * 0.09; // 몸과 엇갈려 끄덕
    mane.scale.y *= 1 + gait * Math.sin(ph * 2 + 2) * 0.04; // 갈기 털이 출렁
    legs.forEach(({ group, paw, phase }, i) => {
      const b = b0.legs[i], swing = Math.sin(ph + phase) * 0.75 * gait * (1 - plant);
      group.rotation.x = b.pitch + swing;
      paw.rotation.x = -b.pitch - swing * 0.6;
    });
    const speed = lying ? 0.7 : 1.2, amp = (lying ? 0.07 : 0.12) + gait * 0.1;
    tail.forEach((seg, i) => {
      seg.rotation.y = b0.tail[i][1] + Math.sin(t * speed - i * 0.6) * amp + gait * Math.sin(ph - i * 0.7) * 0.14;
      seg.rotation.x = b0.tail[i][0] + (i ? gait * Math.sin(ph * 2 - i * 0.5) * 0.1 : 0); // 달리면 꼬리가 위아래로 출렁
    });
    if (greeting) {
      applyGreet(t, opts.greet, stand, b0);
      greetLive = stand > 0;
    }
    if (fx) applyFx(t);
  }

  setPose('stand');
  return {
    root, height: HEIGHT, setFace, setPose, setRage, setDecor, animate,
    /** 달리며 몸통이 튀어 오른 높이(크기 1 기준): 등에 탄 캐릭터도 이만큼 같이 들썩인다. */
    get bob() { return trunk.position.y - base.trunkY; }
  };
}
