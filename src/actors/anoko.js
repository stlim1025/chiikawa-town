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

/** 싸울 때 얼굴: 짙은 테두리의 베이지 둥근 눈에 갈색 소용돌이, 작은 ω 입. */
function swirlFace() {
  const parts = [], EX = 0.4, EY = -0.06;
  for (const sd of [-1, 1]) {
    parts.push(decal(sd * EX, EY, [0.215, 0.215, 0.04], INK, 0.012));
    parts.push(decal(sd * EX, EY, [0.185, 0.185, 0.045], EYE_FILL, 0.03));
    // 소용돌이: 가운데에서 바깥으로 한 바퀴 반 남짓 풀리는 선(왼쪽 눈은 거울처럼 뒤집는다)
    const N = 30, pts = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N, th = 0.6 + u * Math.PI * 3.4, rad = 0.02 + 0.11 * u;
      pts.push([sd * (EX + rad * Math.cos(th)), EY + rad * Math.sin(th)]);
    }
    parts.push(...stroke(pts, 0.014, SWIRL, 0.07));
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
 * 아노코 하나. → { root, height(크기 1 일 때 선 키), setFace('swirl' | 'happy'), setPose('stand' | 'lie'), animate(t, { moving, step }) }.
 * root 에 모두 들어 있어 부르는 쪽은 root 의 자리 · 방향 · 크기만 바꾼다. 처음에는 서서 소용돌이 눈.
 * 묶음: trunk(몸통 전체 — 걸을 때 통통, 엎드리면 내려앉는다) 아래 head(목이 축), legs 넷(엉덩관절이 축, 그 아래 paw 가 발목 축), tail 마디 다섯(앞 마디에 이어 붙는다).
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
   */
  function animate(t, opts = {}) {
    const lying = pose === 'lie', moving = !lying && !!opts.moving;
    gait += ((moving ? 1 : 0) - gait) * 0.2;
    if (gait < 0.001) gait = 0;
    const ph = opts.step != null ? opts.step : t * 8;
    const breath = Math.sin(t * (lying ? 1.3 : 1.9));
    chest.scale.setScalar(1 + 0.014 * breath);
    mane.scale.setScalar(1 + 0.012 * Math.sin(t * (lying ? 1.3 : 1.9) - 0.5));
    trunk.position.y = base.trunkY + gait * Math.abs(Math.sin(ph)) * 0.05;
    head.rotation.x = base.headTilt + 0.012 * breath + gait * Math.sin(ph * 2) * 0.03;
    legs.forEach(({ group, paw, phase }, i) => {
      const b = base.legs[i], swing = Math.sin(ph + phase) * 0.5 * gait;
      group.rotation.x = b.pitch + swing;
      paw.rotation.x = -b.pitch - swing * 0.6;
    });
    const speed = lying ? 0.7 : 1.2, amp = lying ? 0.07 : 0.12;
    tail.forEach((seg, i) => {
      seg.rotation.y = base.tail[i][1] + Math.sin(t * speed - i * 0.6) * amp;
      seg.rotation.x = base.tail[i][0] + (i ? gait * Math.sin(ph * 2 - i * 0.5) * 0.03 : 0);
    });
  }

  setPose('stand');
  return { root, height: HEIGHT, setFace, setPose, animate };
}
