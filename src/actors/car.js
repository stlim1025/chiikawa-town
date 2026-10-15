import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO, LINE_COLOR } from '../render/toon.js';
import { mergedGeometry } from '../render/batch.js';

/**
 * 하늘색 자동차(원작에서 랏코가 타고 다니는 차, 도구점 core/tools.js 의 car). 앞은 +z, 바닥(바퀴 밑)이 y 0.
 *  · 납작하고 둥근 아래 몸통 앞(보닛)에 얼굴: 웃는 눈 둘, 갈색 테두리의 흰 코, 웃는 입, 분홍 볼
 *  · 뒤쪽으로 높이 솟은 하늘색 지붕(객실): 불룩했다가 꼭대기로 물방울처럼 뾰족해지고, 꼭대기에 분홍 꽃 한 송이
 *  · 창: 앞 유리 · 뒤 유리 · 양옆 아치 창 셋(운전석 창이 가장 크다). 지붕을 실제로 뚫고(알파 맵) 갈색 테두리와 흰 빗금 반사를 그린다
 *  · 짙은 회색 바퀴 넷(흰 휠)은 몸통 밑에 반쯤 숨는다
 * 탄 캐릭터는 운전석(SEAT_Z)에 앉아(DRIVE_LIFT 만큼 올라앉는다) 창 너머로 머리가 보인다. 값 · 빠르기는 게임에서 정했다.
 */
/** 차에 탄 캐릭터를 올려 앉히는 높이(캐릭터 뿌리 기준, 차는 그만큼 내려 바닥에 둔다). */
export const DRIVE_LIFT = 0.32;
/** 걷기(3.2)의 두 배. 같이 놀기에서 다른 사람 화면이 따라 그리는 최고 빠르기(net/remote.js 의 MAX_V 8) 안. */
export const CAR_SPEED = 6.4;
/** 부딪힘 반지름(걸을 때 0.35): 차가 집 · 나무에 너무 파묻히지 않게. */
export const CAR_RADIUS = 0.5;
/** 캐릭터가 차 가운데보다 이만큼 앞(운전석 창 자리)에 앉는다. */
const SEAT_Z = 0.2;
const WHEEL_R = 0.23;
/** 지붕(객실): 차 가운데보다 조금 뒤에, 몸통 폭 그대로 앞뒤로 길게. */
const CABIN_Z = -0.12, CABIN_SX = 1.0, CABIN_SZ = 1.25;
/** 지붕 옆모습 [반지름, 높이]: 몸통 속에서 시작해 불룩했다가 꼭대기로 물방울처럼 가늘게 뾰족해진다(꽃이 그 끝에). */
const PROFILE = [[0.52, 0.6], [0.66, 0.8], [0.69, 1.0], [0.68, 1.2], [0.63, 1.4], [0.53, 1.58], [0.38, 1.75], [0.21, 1.88], [0.09, 1.97], [0.035, 2.03], [0, 2.08]];
const TOP = 2.08;
/** 아래 몸통: 옆이 곧은 알약(앞뒤 끝이 둥글다). 단면 반지름 x · y, 가운데 높이, 곧은 길이 · 끝 둥근 길이(z). */
const BODY_RX = 0.76, BODY_RY = 0.38, BODY_Y = 0.55, BODY_MID = 0.42, BODY_CAP = 0.6; // 아래 몸통이 지붕보다 넓어 뒤에서 보면 종 모양
/**
 * 창(지붕을 도는 각 a — 0 이 앞, π/2 가 오른쪽 — 과 높이 y 범위). 원작처럼 한쪽에 위가 둥근 아치 창 둘, 앞 유리는 옆까지 감싸 돌아
 * 옆에서 봐도 운전하는 모습이 보이고, 뒤 유리는 크고 위가 넓게 둥글다. 양옆 창은 오른쪽 것을 왼쪽으로 뒤집어 쓴다.
 */
const SIDE_WINDOWS = [
  { a: [0.98, 1.46], y: [0.98, 1.38] },
  { a: [1.64, 2.12], y: [0.98, 1.34] }
];
const WINDOWS = [
  { a: [-0.78, 0.78], y: [0.98, 1.42] }, // 앞 유리
  { a: [Math.PI - 0.8, Math.PI + 0.8], y: [0.95, 1.55] }, // 뒤 유리
  ...SIDE_WINDOWS,
  ...SIDE_WINDOWS.map((w) => ({ ...w, a: [-w.a[1], -w.a[0]] }))
];

const BODY = '#b9d7fa', LIFT = '#3d526b', TIRE = '#5b5e67', HUB = '#ffffff', INK = '#4a3b33', CHEEK = '#f6a9bd', PETAL = '#f7a3c0', CORE = '#ffe066', NOSE = '#ffffff', SEAT = '#e9e2d4';
const ARC = new THREE.TorusGeometry(1, 0.3, 6, 14, Math.PI); // 반원 고리(웃는 눈 ∩ · 웃는 입 ∪)
const AXLE = new THREE.CylinderGeometry(1, 1, 1, 20).rotateZ(Math.PI / 2); // 축이 x 인 바퀴
const RING = new THREE.TorusGeometry(1, 0.16, 6, 20); // 핸들

/** 지붕 회전체와 창 그림(색 · 구멍 · 유리 반사). 지붕 겉면 무늬 좌표: u 는 도는 각(0 이 앞), v 는 옆모습 점 순서. */
function cabinParts() {
  const pts = new THREE.SplineCurve(PROFILE.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(30);
  const geo = new THREE.LatheGeometry(pts, 40).scale(CABIN_SX, 1, CABIN_SZ);
  // 높이 y 가 옆모습 몇 번째 점쯤인지(v): 창을 높이로 정해 두고 무늬 좌표로 바꾼다
  const vAt = (y) => {
    for (let j = 1; j < pts.length; j++) {
      if (pts[j].y >= y) { const k = (y - pts[j - 1].y) / (pts[j].y - pts[j - 1].y || 1); return (j - 1 + k) / (pts.length - 1); }
    }
    return 1;
  };
  const W = 1024, H = 512;
  const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  // 아치 창 모양(위는 둥글게, 아래 모서리는 살짝): 앞 유리처럼 u 0 을 넘는 창도 그리게 왼쪽 · 오른쪽으로 한 벌씩 더
  const paths = [];
  for (const w of WINDOWS) {
    const x0 = (w.a[0] / (Math.PI * 2)) * W, x1 = (w.a[1] / (Math.PI * 2)) * W, top = (1 - vAt(w.y[1])) * H, bot = (1 - vAt(w.y[0])) * H;
    const r = Math.min((x1 - x0) / 2, (bot - top) * 0.6), rb = 10;
    for (const off of [-W, 0, W]) {
      const p = new Path2D(), a = x0 + off, b = x1 + off;
      p.moveTo(a, bot - rb); p.lineTo(a, top + r); p.arcTo(a, top, a + r, top, r); p.lineTo(b - r, top); p.arcTo(b, top, b, top + r, r);
      p.lineTo(b, bot - rb); p.arcTo(b, bot, b - rb, bot, rb); p.lineTo(a + rb, bot); p.arcTo(a, bot, a, bot - rb, rb); p.closePath();
      paths.push({ p, a, b, top, bot });
    }
  }
  // 색: 하늘색 위에 창 둘레 갈색 테두리(절반은 구멍에 잘리고 바깥 절반이 보인다)
  const paint = canvas(), pc = paint.getContext('2d');
  pc.fillStyle = BODY; pc.fillRect(0, 0, W, H);
  pc.strokeStyle = INK; pc.lineWidth = 12; pc.lineJoin = 'round';
  for (const { p } of paths) pc.stroke(p);
  // 구멍: 흰 곳은 남고 검은 창 자리는 뚫린다(alphaTest)
  const hole = canvas(), hc = hole.getContext('2d');
  hc.fillStyle = '#ffffff'; hc.fillRect(0, 0, W, H);
  hc.fillStyle = '#000000';
  for (const { p } of paths) hc.fill(p);
  // 유리: 창 자리만 옅은 하늘빛, 흰 빗금 반사 둘
  const glass = canvas(), gc = glass.getContext('2d');
  for (const { p, a, b, top, bot } of paths) {
    gc.save(); gc.clip(p);
    gc.fillStyle = 'rgba(214,234,252,0.32)'; gc.fillRect(a, top, b - a, bot - top); // 옅은 하늘빛(안쪽이 회색 구멍처럼 보이지 않게, 탄 캐릭터는 비치게)
    gc.strokeStyle = 'rgba(255,255,255,0.9)'; gc.lineWidth = 7; gc.lineCap = 'round';
    const w = b - a, h = bot - top;
    for (const f of [0.45, 0.62]) { gc.beginPath(); gc.moveTo(a + w * (f - 0.2), bot - h * 0.15); gc.lineTo(a + w * (f + 0.12), top + h * 0.2); gc.stroke(); }
    gc.restore();
  }
  const tex = (c, color) => { const t = new THREE.CanvasTexture(c); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return { geo, paint: tex(paint, true), hole: tex(hole, false), glass: tex(glass, true) };
}

let parts = null; // 차마다 같은 도형 · 재질을 나눠 쓴다(같이 놀기 친구들 차도)
function shared() {
  if (parts) return parts;
  const C = cabinParts();
  // 지붕: 무늬(하늘색 + 창 테두리)를 칠하고 창 자리를 뚫는다. 안쪽 벽도 보이게 양면. 그늘진 쪽이 회색으로 보이지 않게 살짝 밝힌다(LIFT)
  const cabin = toonMaterial('#ffffff', { unique: true, doubleSide: true, emissive: LIFT });
  cabin.map = C.paint; cabin.alphaMap = C.hole; cabin.alphaTest = 0.5; cabin.needsUpdate = true;
  // 지붕 외곽선: 다른 외곽선처럼 법선 쪽으로 민 뒷면 껍질인데, 창 자리는 같이 뚫는다(안 뚫으면 창 너머가 까맣게 막혔다)
  const cabinLine = new THREE.MeshBasicMaterial({ color: LINE_COLOR, side: THREE.BackSide, alphaMap: C.hole, alphaTest: 0.5, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  cabinLine.onBeforeCompile = (shader) => { shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 0.03;'); };
  cabinLine.customProgramCacheKey = () => 'car-cabin-line';
  // 유리: 지붕보다 살짝 안쪽 같은 회전체, 창 자리에만 옅은 빛과 반사가 보인다
  const glass = new THREE.MeshBasicMaterial({ map: C.glass, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const glassGeo = C.geo.clone().scale(0.96, 1, 0.96);
  // 아래 몸통(굵은 외곽선): 옆이 곧은 알약을 앞뒤로 눕힌 모양(타원 공은 옆이 너무 불룩해 접시처럼 보였다)
  const pill = new THREE.CapsuleGeometry(1, 2 * BODY_MID / BODY_CAP, 10, 24).rotateX(Math.PI / 2);
  const body = mergedGeometry([{ geometry: pill, position: [0, BODY_Y, 0], scale: [BODY_RX, BODY_RY, BODY_CAP], color: BODY }]);
  // 작은 부품(가는 외곽선): 꽃 · 흰 코 · 의자 등받이
  const flower = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2;
    return { geometry: GEO.sphere, position: [Math.cos(a) * 0.085, TOP + 0.03, CABIN_Z + Math.sin(a) * 0.085], scale: [0.07, 0.032, 0.07], color: PETAL };
  });
  // 앞 · 뒤 둥근 끝 겉면의 자리(x, y) → 그 자리 z(얼굴 · 뒷불 · 번호판을 겉면에 붙인다)
  const frontZ = (x, y) => BODY_MID + BODY_CAP * Math.sqrt(Math.max(0, 1 - (x / BODY_RX) ** 2 - ((y - BODY_Y) / BODY_RY) ** 2));
  const plate = new THREE.CapsuleGeometry(1, 2, 4, 12).rotateZ(Math.PI / 2); // 옆으로 눕힌 알약: 둥근 네모 번호판
  const detail = mergedGeometry([
    ...flower,
    { geometry: GEO.sphere, position: [0, TOP + 0.05, CABIN_Z], scale: [0.04, 0.034, 0.04], color: CORE },
    { geometry: GEO.sphere, position: [0, 0.55, frontZ(0, 0.55) - 0.01], scale: [0.12, 0.075, 0.05], color: NOSE },
    { geometry: GEO.sphere, position: [0, 1.0, SEAT_Z - 0.48], scale: [0.36, 0.42, 0.12], color: SEAT },
    // 뒷모습: 양쪽 분홍 동그란 뒷불, 가운데 아래 흰 번호판
    ...[-1, 1].map((sd) => ({ geometry: GEO.sphere, position: [sd * 0.48, 0.6, -frontZ(0.48, 0.6) + 0.005], rotation: [0, -sd * 0.85, 0], scale: [0.095, 0.095, 0.025], color: CHEEK })),
    { geometry: plate, position: [0, 0.45, -frontZ(0, 0.45) - 0.01], scale: [0.08, 0.08, 0.025], color: NOSE }
  ]);
  // 얼굴(외곽선 없이 단색): 웃는 눈 둘 · 웃는 입 · 분홍 볼, 안쪽 핸들
  const face = mergedGeometry([
    ...[-1, 1].flatMap((sd) => [
      { geometry: ARC, position: [sd * 0.17, 0.66, frontZ(0.17, 0.66) + 0.005], rotation: [0, sd * 0.32, 0], scale: [0.05, 0.05, 0.05], color: INK },
      { geometry: GEO.sphere, position: [sd * 0.46, 0.5, frontZ(0.46, 0.5) - 0.005], rotation: [0, sd * 0.85, 0], scale: [0.095, 0.08, 0.025], color: CHEEK }
    ]),
    { geometry: ARC, position: [0, 0.44, frontZ(0, 0.44) + 0.005], rotation: [0, 0, Math.PI], scale: [0.085, 0.085, 0.085], color: INK },
    { geometry: RING, position: [0, 1.0, SEAT_Z + 0.36], rotation: [-0.95, 0, 0], scale: [0.13, 0.13, 0.13], color: '#6b6f78' }
  ]);
  // 바퀴 하나: 짙은 회색 타이어 + 양옆으로 보이는 흰 휠
  const wheel = mergedGeometry([
    { geometry: AXLE, scale: [0.17, WHEEL_R, WHEEL_R], color: TIRE },
    { geometry: AXLE, scale: [0.19, 0.1, 0.1], color: HUB }
  ]);
  parts = {
    cabinGeo: C.geo, glassGeo, cabin, cabinLine, glass, body, detail, face, wheel,
    paint: toonMaterial('#ffffff', { vertexColors: true, unique: true, emissive: LIFT }), // 차만의 재질(그늘을 밝히는 빛을 다른 물건과 나눠 쓰지 않게)
    flat: new THREE.MeshBasicMaterial({ vertexColors: true })
  };
  return parts;
}

/** 차 하나. → { root, shell(몸통 묶음 — 달릴 때 통통), wheels } . 탄 캐릭터의 뿌리에 붙여 쓴다(위치 · 방향은 캐릭터를 따른다). */
export function buildCar() {
  const P = shared(), root = new THREE.Group(), shell = new THREE.Group();
  root.position.set(0, -DRIVE_LIFT, -SEAT_Z);
  shell.add(toonMesh(P.body, null, { material: P.paint, outline: 0.03 }));
  shell.add(toonMesh(P.detail, null, { material: P.paint, outline: 0.012 }));
  shell.add(new THREE.Mesh(P.face, P.flat));
  const cabin = new THREE.Mesh(P.cabinGeo, P.cabin);
  cabin.position.z = CABIN_Z;
  cabin.castShadow = true;
  const line = new THREE.Mesh(P.cabinGeo, P.cabinLine);
  line.raycast = () => {};
  cabin.add(line);
  shell.add(cabin);
  const glass = new THREE.Mesh(P.glassGeo, P.glass);
  glass.position.z = CABIN_Z;
  shell.add(glass);
  root.add(shell);
  const wheels = [];
  for (const [x, z] of [[-0.62, 0.62], [0.62, 0.62], [-0.62, -0.62], [0.62, -0.62]]) {
    const w = toonMesh(P.wheel, null, { material: P.paint, position: [x, WHEEL_R, z], outline: 0.025 });
    root.add(w);
    wheels.push(w);
  }
  return { root, shell, wheels };
}

/** 굴러간 만큼(dist) 바퀴를 돌리고, 달리는 동안 몸통을 살짝 통통(t: 시간). */
export function rollCar(car, dist, t) {
  for (const w of car.wheels) w.rotation.x += dist / WHEEL_R;
  car.shell.position.y = dist > 0.0005 ? Math.abs(Math.sin(t * 13)) * 0.025 : 0;
}
