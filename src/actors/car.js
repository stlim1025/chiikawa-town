import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO } from '../render/toon.js';
import { mergedGeometry } from '../render/batch.js';

/**
 * 하늘색 자동차(원작에서 랏코가 타고 다니는 차, 도구점 core/tools.js 의 car): 동글동글한 하늘색 몸통 앞에 얼굴(웃는 눈 · 코 · 웃는 입 · 분홍 볼),
 * 지붕 꼭대기에 분홍 꽃 한 송이, 짙은 회색 바퀴 넷(흰 휠). 앞은 +z, 바닥(바퀴 밑)이 y 0.
 * 탄 캐릭터는 의자에 앉아(DRIVE_LIFT 만큼 올라앉는다) 지붕 너머로 머리가 보인다. 지붕은 원작의 창문 대신 반투명 하늘색 유리로
 * (위에서 내려다보는 화면이라 창문 구멍으로는 탄 캐릭터가 거의 안 보였다). 유리 지붕 · 값 · 빠르기는 게임에서 정했다.
 */
/** 차에 탄 캐릭터를 올려 앉히는 높이(캐릭터 뿌리 기준, 차는 그만큼 내려 바닥에 둔다). */
export const DRIVE_LIFT = 0.32;
/** 걷기(3.2)의 두 배. 같이 놀기에서 다른 사람 화면이 따라 그리는 최고 빠르기(net/remote.js 의 MAX_V 8) 안. */
export const CAR_SPEED = 6.4;
/** 부딪힘 반지름(걸을 때 0.35): 차가 집 · 나무에 너무 파묻히지 않게. */
export const CAR_RADIUS = 0.5;
/** 캐릭터가 차 가운데보다 이만큼 앞(운전석)에 앉는다. */
const SEAT_Z = 0.05;
const WHEEL_R = 0.24;

const BODY = '#cde4fa', GLASS = '#c6e2fb', TIRE = '#5b5e67', HUB = '#ffffff', INK = '#4a3b33', CHEEK = '#f6a9bd', PETAL = '#f7a3c0', CORE = '#ffe066', NOSE = '#f5f9ff';
const ARC = new THREE.TorusGeometry(1, 0.3, 6, 14, Math.PI); // 반원 고리(웃는 눈 ∩ · 웃는 입 ∪)
const AXLE = new THREE.CylinderGeometry(1, 1, 1, 20).rotateZ(Math.PI / 2); // 축이 x 인 바퀴
const RING = new THREE.TorusGeometry(1, 0.16, 6, 20); // 핸들

let parts = null; // 차마다 같은 도형 · 재질을 나눠 쓴다(같이 놀기 친구들 차도)
function shared() {
  if (parts) return parts;
  // 몸통(굵은 외곽선): 동글동글한 아래 몸통
  const body = mergedGeometry([{ geometry: GEO.sphere, position: [0, 0.6, 0], scale: [0.8, 0.48, 1.08], color: BODY }]);
  // 작은 부품(가는 외곽선): 지붕 꼭지 · 꽃 · 코
  const flower = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2;
    return { geometry: GEO.sphere, position: [Math.cos(a) * 0.075, 1.86, -0.06 + Math.sin(a) * 0.075], scale: [0.06, 0.028, 0.06], color: PETAL };
  });
  const detail = mergedGeometry([
    { geometry: GEO.cone, position: [0, 1.55, -0.06], scale: [0.12, 0.27, 0.12], color: BODY },
    ...flower,
    { geometry: GEO.sphere, position: [0, 1.88, -0.06], scale: [0.035, 0.03, 0.035], color: CORE },
    { geometry: GEO.sphere, position: [0, 0.6, 1.05], scale: [0.13, 0.08, 0.055], color: NOSE }
  ]);
  // 얼굴(외곽선 없이 단색): 웃는 눈 둘 · 콧구멍 · 웃는 입 · 분홍 볼, 안쪽 핸들
  const face = mergedGeometry([
    ...[-1, 1].flatMap((sd) => [
      { geometry: ARC, position: [sd * 0.2, 0.73, 0.99], rotation: [0, sd * 0.34, 0], scale: [0.055, 0.055, 0.055], color: INK },
      { geometry: GEO.sphere, position: [sd * 0.035, 0.6, 1.1], scale: [0.016, 0.02, 0.01], color: INK },
      { geometry: GEO.sphere, position: [sd * 0.47, 0.56, 0.86], rotation: [0, sd * 0.8, 0], scale: [0.1, 0.085, 0.025], color: CHEEK }
    ]),
    { geometry: ARC, position: [0, 0.47, 1.02], rotation: [0, 0, Math.PI], scale: [0.09, 0.09, 0.09], color: INK },
    { geometry: RING, position: [0, 1.06, 0.4], rotation: [-0.95, 0, 0], scale: [0.14, 0.14, 0.14], color: '#6b6f78' }
  ]);
  // 바퀴 하나: 짙은 회색 타이어 + 양옆으로 보이는 흰 휠
  const wheel = mergedGeometry([
    { geometry: AXLE, scale: [0.17, WHEEL_R, WHEEL_R], color: TIRE },
    { geometry: AXLE, scale: [0.19, 0.1, 0.1], color: HUB }
  ]);
  const glass = toonMaterial(GLASS, { unique: true });
  glass.transparent = true; glass.opacity = 0.5; glass.depthWrite = false; // 지붕 모양은 보이고, 탄 캐릭터 머리도 비치게
  parts = {
    body, detail, face, wheel, glass,
    paint: toonMaterial('#ffffff', { vertexColors: true }),
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
  const face = new THREE.Mesh(P.face, P.flat);
  shell.add(face);
  // 유리 지붕: 외곽선 없이(뒤로 그려진 외곽선 껍질이 유리 너머로 까맣게 비쳤다), 그림자도 없이
  shell.add(toonMesh(GEO.sphere, null, { material: P.glass, position: [0, 1.04, -0.06], scale: [0.62, 0.6, 0.72], outline: false, shadow: false }));
  root.add(shell);
  const wheels = [];
  for (const [x, z] of [[-0.6, 0.64], [0.6, 0.64], [-0.6, -0.64], [0.6, -0.64]]) {
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
