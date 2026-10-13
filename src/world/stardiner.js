import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { buildStarman, starTips } from './starfall.js';
import { STARS, CORNERS } from '../core/stardiner.js';
import { roadDist } from '../core/layout.js';

/**
 * 레스토랑 '별 세 개'(사이드스토리 'starDiner' — stories/stardiner.js):
 *  - createStarDiner(): 가게 안 장면(클럽 · 무대처럼 따로 그린다). 입구 · 무기와 토벌 증표를 맡기는 바구니 · 목욕하는 커다란 솥,
 *    빵 옷(돌돌 말려 위에 빨간 열매), 커다란 오크 괴물(다리 · 앞치마 · 주먹만 — 윗몸은 천장 너머라 얼굴은 끝까지 안 보인다),
 *    벽의 '장식' 판에 붙잡힌 별똥별 셋(모서리마다 쇠고랑). 쇠고랑을 다 빼내면 오크가 뛰쳐나오고 다 같이 입구로 도망친다.
 *  - createDinerFront(scene, village): 마을 동쪽 들판 길가의 가게 겉모습(낡은 회색 가게 · 삐뚤어진 '별 세 개' 간판 · 판자로 막은 창 · 유리문).
 *    이야기를 받은 동안만 보이고 막힌다.
 *  - buildStarTrio(): 풀려난 별똥별 셋(마을에서 고맙다며 오므라이스를 건네고 하늘로 돌아간다).
 */
const WALL_Z = -4;
const CEIL_Y = 5;
const STAR_SCALE = 0.5;
const STAR_POS = [[2.55, 2.35], [4.2, 2.75], [5.85, 2.35]]; // 벽 판 위 별 가운데(x, y)
const SIGN_TEXT = '별  세  개';
const KINDS = ['me', 'chiikawa', 'hachiware'];
const DOOR_X = -5.4; // 주방 문 경첩(왼쪽 끝): 오크가 드나드는 커다란 문(폭 2 · 높이 3.2)
const KITCHEN = [DOOR_X + 1.0, WALL_Z + 0.9]; // 주방 문 바로 앞(오크가 나오는 자리)
const EXIT = [-7.1, 2.6]; // 가게 입구(왼쪽 벽의 열린 문)
const POT = [-1.3, -2.2]; // 목욕하는 커다란 솥
const BASKET = [1.0, -3.3]; // 무기 · 토벌 증표를 맡기는 바구니(별 판 바로 옆)
// 장면마다 서는 자리
const SPOTS = {
  enter: { me: [-5.3, 2.5], chiikawa: [-4.95, 1.85], hachiware: [-5.65, 3.15] },
  bath: { me: [POT[0], POT[1] + 0.45], chiikawa: [POT[0] - 0.55, POT[1] - 0.2], hachiware: [POT[0] + 0.55, POT[1] - 0.2] },
  bread: { me: [-4.3, 2.5], chiikawa: [-3.0, 2.55], hachiware: [-1.7, 2.5] }
};
// 달리는 길(식탁 · 솥을 돌아서): 빵에서 빠져나와 입구 쪽으로 → 두고 온 무기 · 토벌 증표를 가지러 바구니로 →
// 별 판 앞(치이카와는 주방 문 쪽 망보기) → 다 같이 입구 밖으로. speed: 초당 거리
const PATHS = {
  flee: {
    me: { path: [[-5.6, 2.6]], speed: 3.6 }, chiikawa: { path: [[-6.35, 2.9]], speed: 3.0 }, hachiware: { path: [[-4.85, 2.3]], speed: 3.8 }
  },
  back: {
    me: { path: [[-1, 2.6], [1.9, 1.0], [1.5, -2.6]], speed: 3.4 },
    chiikawa: { path: [[-1, 2.3], [1.7, 0.9], [0.6, -2.6]], speed: 3.0 },
    hachiware: { path: [[-1, 2.9], [2.1, 1.1], [2.3, -2.7]], speed: 3.6 }
  },
  rescue: {
    me: { path: [[3.3, -2.5]], speed: 2.4 }, hachiware: { path: [[5.0, -2.6]], speed: 2.8 }, chiikawa: { path: [[0.6, -1.0], [-2.8, -0.4]], speed: 2.6 }
  },
  escape: {
    me: { path: [[1.85, 0.9], [0, 2.6], [-6.4, 2.6], EXIT], speed: 4.0 },
    hachiware: { path: [[4.9, 2.7], [0.4, 3.0], [-6.4, 2.9], EXIT], speed: 4.8 },
    chiikawa: { path: [[-3.2, 1.8], [-6.4, 2.3], EXIT], speed: 2.8 }
  }
};
// 오크: 나와서 빵 앞에 선다 · 주방으로 돌아간다 · 쫓아오다 입구 앞에서 멈춘다(덩치가 커서 못 나간다)
const ORC_PATHS = {
  come: { path: [[-3.6, -0.8], [-3.0, 0.45]], speed: 1.3 },
  leave: { path: [[-3.6, -0.8], KITCHEN], speed: 1.6 },
  chase: { path: [[-4.2, -0.6], [-4.4, 0.7]], speed: 1.6 }
};
const SHOTS = {
  hall: { pos: [0.5, 2.6, 5.6], look: [-3.4, 1.0, 0.6], portrait: { pos: [-2.6, 2.6, 5.6], look: [-4.8, 1.0, 1.4] } },
  door: { pos: [-2.2, 2.3, 1.8], look: [-4.4, 1.9, WALL_Z], portrait: { pos: [-2.0, 2.5, 3.8], look: [-4.4, 1.9, WALL_Z] } },
  bath: { pos: [POT[0] - 2.1, 2.9, 0.4], look: [POT[0] + 0.2, 0.9, POT[1]], portrait: { pos: [POT[0] - 2.3, 3.4, 0.5], look: [POT[0] + 0.1, 0.9, POT[1]] } }, // 식탁은 화면 밖
  bread: { pos: [-1.6, 0.8, 5.6], look: [-3.0, 0.75, 1.4], portrait: { pos: [-2.6, 1.0, 5.6], look: [-3.0, 0.9, 1.4] } }, // 낮게: 오크는 다리 · 앞치마만
  orc: { pos: [-3.8, 0.9, 1.6], look: [-4.4, 1.3, -3.0], portrait: { pos: [-3.8, 1.0, 2.6], look: [-4.4, 1.3, -3.0] } }, // 뛰쳐나온 오크(낮게: 다리 · 앞치마 · 주먹)
  wall: { look: [4.2, 2.45, WALL_Z], fit: 5.4 }, // fit: 별 판 너비(쇠고랑 단추까지)가 화면 가로에 꼭 차도록 물러선다
  follow: { follow: [2.4, 3.4, 6.2], portrait: { follow: [1.4, 4.0, 8.4] } } // follow: 움직이는 셋의 가운데를 이만큼 떨어져 따라간다
};
const ORC_GREEN = '#a9bb6e', ORC_CLAW = '#dde3d0';
const propsOf = (c) => new Set(Object.values(c.props || {}).flat());
const hideProps = (c) => propsOf(c).forEach((m) => { m.visible = false; });
const smooth = (u) => u * u * (3 - 2 * u);

/** 낡은 흰 간판에 갈색 손글씨 '별 세 개'(가게 겉 · 안 같이 쓴다). */
function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d');
    g.fillStyle = '#f1f1ec';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = 'rgba(150, 150, 140, 0.14)'; // 얼룩
    for (let i = 0; i < 36; i++) g.fillRect((i * 97) % 500, (i * 53) % 150, 14 + (i % 4) * 6, 5);
    g.font = '700 118px Gaegu, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#7b4434';
    g.fillText(SIGN_TEXT, 256, 86);
    t.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load('700 118px Gaegu').then(draw, () => {});
  return t;
}
let signTex = null;
const sharedSign = () => signTex || (signTex = signTexture());

/** 가장자리가 흐린 흰 동그라미(촛불 빛 · 목욕 솥의 김). */
function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** 커다란 오크 괴물: 초록 다리(발톱) · 허리에 두른 흰 천 · 회색 윗몸 · 초록 팔과 주먹. 윗몸은 천장 위로 넘어가 얼굴은 없다(안 보인다). */
function buildOrc(toon) {
  const group = new THREE.Group();
  const legs = [-0.55, 0.55].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0, 0);
    group.add(leg);
    toon(leg, GEO.cylinder, ORC_GREEN, { position: [0, 0.12, 0], scale: [0.42, 1.45, 0.42], outline: 0.03 });
    toon(leg, GEO.sphere, ORC_GREEN, { position: [0, 0.16, 0.16], scale: [0.48, 0.2, 0.6], outline: 0.03 }); // 발
    [-0.27, -0.09, 0.09, 0.27].forEach((cx) => toon(leg, GEO.cone, ORC_CLAW, { position: [cx, 0.08, 0.68], rotation: [Math.PI / 2, 0, 0], scale: [0.07, 0.16, 0.07], outline: 0.012 }));
    return leg;
  });
  toon(group, GEO.box, null, { material: new THREE.MeshBasicMaterial({ color: '#f3f4ef' }), position: [0, 2.4, 0], scale: [2.3, 1.9, 1.35], outline: 0.035, shell: true }); // 허리에 두른 흰 천(그늘 없이 하얗게)
  toon(group, GEO.box, null, { material: new THREE.MeshBasicMaterial({ color: '#c4c7c3' }), position: [0, 5.3, 0], scale: [2.1, 4.0, 1.25], outline: 0.035, shell: true }); // 윗몸(천장 너머)
  const arms = [-1, 1].map((sd) => {
    const arm = new THREE.Group();
    arm.position.set(sd * 1.42, 6.6, 0);
    group.add(arm);
    toon(arm, GEO.cylinder, ORC_GREEN, { position: [0, -3.9, 0], scale: [0.34, 3.9, 0.34], outline: 0.03 });
    toon(arm, GEO.sphere, ORC_GREEN, { position: [0, -4.05, 0.05], scale: [0.5, 0.56, 0.46], outline: 0.03 }); // 주먹
    toon(arm, GEO.cone, ORC_CLAW, { position: [sd * -0.22, -4.25, 0.36], rotation: [Math.PI / 2, 0, 0], scale: [0.06, 0.14, 0.06], outline: 0.01 });
    return arm;
  });
  group.visible = false;
  return { group, legs, arms };
}

/** 빵 옷: 누운 통처럼 몸을 감싸고 앞쪽 끝으로 얼굴만 빼꼼(앞 테두리), 노릇한 자국 · 위에 빨간 열매. */
const ROLL_R = 0.52, ROLL_LEN = 1.3;
const rollGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0); // 앞이 뚫린 통
function buildRoll(toon) {
  const g = new THREE.Group();
  const z0 = 0.1 - ROLL_LEN;
  toon(g, rollGeo, '#f1ddb0', { position: [0, ROLL_R, z0], rotation: [Math.PI / 2, 0, 0], scale: [ROLL_R, ROLL_LEN, ROLL_R], outline: 0.025 });
  toon(g, rollGeo, null, { material: new THREE.MeshBasicMaterial({ color: '#f7ead0', side: THREE.BackSide }), position: [0, ROLL_R, z0], rotation: [Math.PI / 2, 0, 0], scale: [ROLL_R * 0.97, ROLL_LEN, ROLL_R * 0.97], outline: false }); // 폭신한 빵 속
  toon(g, GEO.cylinder, '#e8cf9c', { position: [0, ROLL_R, z0], rotation: [Math.PI / 2, 0, 0], scale: [ROLL_R, 0.02, ROLL_R], outline: false }); // 뒤는 막혔다
  toon(g, new THREE.TorusGeometry(1, 0.15, 8, 28), '#f3dfb4', { position: [0, ROLL_R, 0.1], scale: [ROLL_R, ROLL_R, ROLL_R], outline: 0.015 }); // 앞 테두리(빵 끝)
  [[-0.22, -0.55], [0.2, -0.95], [-0.04, -1.15]].forEach(([x, z]) => toon(g, GEO.dot, '#c99a5c', { position: [x, ROLL_R * 2 - 0.02, z], scale: [0.14, 0.03, 0.11], outline: false }));
  toon(g, GEO.sphere, '#d9473f', { position: [0, ROLL_R * 2 + 0.08, -0.55], scale: [0.11, 0.1, 0.11], outline: 0.012 });
  toon(g, GEO.box, '#5c8a3a', { position: [0.04, ROLL_R * 2 + 0.2, -0.55], rotation: [0, 0, -0.5], scale: [0.03, 0.08, 0.03], outline: false });
  g.visible = false;
  return g;
}

export function createStarDiner() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a1d18');
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x5a4030, 1.05));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const light = new THREE.Color(1, 0.96, 0.9); // 캐릭터 단색 칠에 곱하는 빛(촛불 · 등잔의 따뜻한 빛)
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const add = (parent, geo, mat, pos, scale, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (scale) m.scale.set(...scale); if (rot) m.rotation.set(...rot); parent.add(m); return m; };
  const toon = (parent, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); parent.add(m); return m; };
  const puffTex = puffTexture(); // 가장자리가 흐린 동그라미(촛불 · 김)

  // ---------- 가게: 나무 바닥 · 벽지 · 아래 판자 · 천장 ----------
  toon(scene, GEO.box, '#b98a5c', { position: [0, -0.05, 0], scale: [16, 0.1, 12], outline: false });
  for (let i = -7; i <= 7; i += 1.4) add(scene, new THREE.PlaneGeometry(0.03, 12).rotateX(-Math.PI / 2), basic('#9a6e48'), [i, 0.002, 0]);
  toon(scene, GEO.box, '#f3dfc2', { position: [0, CEIL_Y / 2, WALL_Z - 0.1], scale: [16, CEIL_Y, 0.2], outline: false });
  toon(scene, GEO.box, '#a8774e', { position: [0, 0.6, WALL_Z], scale: [16, 1.2, 0.1], outline: false });
  for (let i = -7.5; i <= 7.5; i += 0.9) add(scene, new THREE.PlaneGeometry(0.06, 3.6), basic('#ead2b0'), [i, 3.1, WALL_Z + 0.001]); // 세로 줄무늬 벽지
  [-1, 1].forEach((sd) => toon(scene, GEO.box, '#e8d2b2', { position: [sd * 7.6, CEIL_Y / 2, 0], scale: [0.2, CEIL_Y, 12], outline: false }));
  add(scene, new THREE.PlaneGeometry(16, 12).rotateX(Math.PI / 2), basic('#4e3829'), [0, CEIL_Y, 0]); // 천장(아래를 본다, 오크 윗몸이 이 너머로)
  // '별 세 개' 간판(벽 위) — 가게 이름
  add(scene, new THREE.PlaneGeometry(2.4, 0.75), basic('#ffffff', { map: sharedSign() }), [-1.2, 4.1, WALL_Z + 0.06], null, [0, 0, 0.06]);

  // ---------- 주방 문(왼쪽 안, 오크가 드나드는 커다란 문): 안쪽으로 열리면 깜깜한 주방, 내다볼 때는 초록 손가락 ----------
  add(scene, new THREE.PlaneGeometry(2.0, 3.2), basic('#241914'), [DOOR_X + 1.0, 1.6, WALL_Z + 0.02]);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(DOOR_X, 0, WALL_Z + 0.08);
  toon(doorPivot, GEO.box, '#8a5a34', { position: [1.0, 1.6, 0], scale: [2.0, 3.2, 0.1], outline: 0.02, shell: true });
  const windowMat = basic('#ffe9a8');
  add(doorPivot, new THREE.CircleGeometry(0.3, 24), windowMat, [1.0, 2.5, 0.06]);
  const shadow = add(doorPivot, new THREE.CircleGeometry(0.3, 24), basic('#2b1f1a', { transparent: true, opacity: 0 }), [1.0, 2.5, 0.07]); // 커다란 몸이 창을 가린다
  toon(doorPivot, GEO.dot, '#e2b84a', { position: [1.8, 1.5, 0.07], scale: [0.07, 0.07, 0.05], outline: false });
  scene.add(doorPivot);
  const grip = new THREE.Group(); // 문틈을 쥔 초록 손가락 셋
  [2.15, 1.95, 1.75].forEach((y) => toon(grip, GEO.sphere, ORC_GREEN, { position: [DOOR_X + 2.02, y, WALL_Z + 0.16], scale: [0.2, 0.09, 0.12], outline: 0.012 }));
  grip.visible = false;
  scene.add(grip);
  // ---------- 가게 입구(왼쪽 벽): 열린 문 너머로 밤하늘 · 다 같이 여기로 도망친다 ----------
  add(scene, new THREE.PlaneGeometry(1.4, 2.4), basic('#2c3a66'), [-7.49, 1.2, EXIT[1]], null, [0, Math.PI / 2, 0]);
  toon(scene, GEO.box, '#8a5a34', { position: [-7.45, 2.45, EXIT[1]], scale: [0.16, 0.14, 1.66], outline: 0.015, shell: true });
  [-1, 1].forEach((sd) => toon(scene, GEO.box, '#8a5a34', { position: [-7.45, 1.2, EXIT[1] + sd * 0.76], scale: [0.16, 2.5, 0.14], outline: 0.015, shell: true }));
  toon(scene, GEO.box, '#8a5a34', { position: [-6.95, 1.15, EXIT[1] + 1.25], rotation: [0, -0.9, 0], scale: [1.3, 2.3, 0.1], outline: 0.02, shell: true }); // 활짝 열린 문짝

  // ---------- 식탁 · 촛불 · 은빛 덮개 접시 ----------
  const table = new THREE.Group();
  table.position.set(0, 0, 0.35);
  toon(table, GEO.cylinder, '#7a5236', { scale: [0.12, 0.72, 0.12], outline: 0.015 });
  toon(table, GEO.cylinder, '#fffaf2', { position: [0, 0.72, 0], scale: [1.15, 0.06, 1.15], outline: 0.02 });
  toon(table, GEO.cylinder, '#c9464a', { position: [0, 0.725, 0], scale: [0.7, 0.062, 0.7], outline: false }); // 빨간 식탁보 가운데
  toon(table, GEO.cylinder, '#fff5e0', { position: [0, 0.78, 0], scale: [0.05, 0.22, 0.05], outline: 0.008 });
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xffd27a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.position.set(0, 1.08, 0);
  flame.scale.set(0.22, 0.32, 1);
  table.add(flame);
  [[-0.62, 0.35], [0.62, 0.35], [0, 0.72]].forEach(([x, z]) => {
    toon(table, GEO.cylinder, '#ffffff', { position: [x, 0.76, z], scale: [0.26, 0.03, 0.26], outline: 0.01 });
    toon(table, GEO.sphereLow, '#d7dde6', { position: [x, 0.79, z], scale: [0.2, 0.17, 0.2], outline: 0.012 }); // 은빛 덮개
  });
  scene.add(table);
  // 다른 빈 식탁 둘(손님이 아무도 없다)
  [[-6.5, -0.9], [3.4, 1.4]].forEach(([x, z]) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    toon(g, GEO.cylinder, '#7a5236', { scale: [0.1, 0.7, 0.1], outline: 0.012 });
    toon(g, GEO.cylinder, '#fffaf2', { position: [0, 0.7, 0], scale: [0.85, 0.05, 0.85], outline: 0.018 });
    scene.add(g);
  });

  // ---------- 목욕하는 커다란 솥(물이 찰랑 · 김이 모락모락) ----------
  const pot = new THREE.Group();
  pot.position.set(POT[0], 0, POT[1]);
  toon(pot, GEO.cylinder, '#b9c1c9', { scale: [1.15, 0.87, 1.15], outline: 0.03 });
  toon(pot, GEO.cylinder, '#e2e7eb', { position: [0, 0.87, 0], scale: [1.21, 0.08, 1.21], outline: 0.02 }); // 두꺼운 테두리
  toon(pot, GEO.cylinder, '#a9c7d6', { position: [0, 0.95, 0], scale: [1.1, 0.03, 1.1], outline: false }); // 물
  scene.add(pot);
  const steam = Array.from({ length: 8 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { phase: i / 8, x: Math.cos(i * 2.4) * 0.8, z: Math.sin(i * 2.4) * 0.6 };
    pot.add(s);
    return s;
  });
  let steamOn = 0;

  // ---------- 짐 바구니(무기 · 토벌 증표) ----------
  const basket = new THREE.Group();
  basket.position.set(BASKET[0], 0, BASKET[1]);
  toon(basket, GEO.cylinder, '#c9a36a', { scale: [0.42, 0.38, 0.42], outline: 0.02 });
  toon(basket, GEO.cylinder, '#a87f48', { position: [0, 0.36, 0], scale: [0.46, 0.05, 0.46], outline: 0.012 });
  const gear = new THREE.Group();
  [[-0.12, 0.3, '#8a5a34'], [0.1, -0.25, '#8a5a34'], [0.02, 0.05, '#9aa3ad']].forEach(([x, r, c]) => toon(gear, GEO.box, c, { position: [x, 0.62, 0], rotation: [0, 0, r], scale: [0.06, 0.6, 0.06], outline: 0.01 }));
  [-0.18, 0, 0.18].forEach((x) => toon(gear, GEO.cylinder, '#e8c547', { position: [x, 0.42, 0.3], rotation: [Math.PI / 2, 0, 0], scale: [0.09, 0.03, 0.09], outline: 0.008 }));
  gear.visible = false;
  basket.add(gear);
  scene.add(basket);

  // ---------- 벽 '장식' 판과 붙잡힌 별똥별 셋 ----------
  toon(scene, GEO.box, '#6e472f', { position: [4.2, 2.5, WALL_Z + 0.05], scale: [5.3, 2.0, 0.08], outline: 0.025, shell: true });
  const tips = starTips();
  const stars = STAR_POS.map(([x, y], s) => {
    const st = buildStarman();
    st.group.scale.setScalar(STAR_SCALE);
    st.group.position.set(x, y, WALL_Z + 0.22);
    st.halo.material.opacity = 0;
    scene.add(st.group);
    return { ...st, home: new THREE.Vector3(x, y, WALL_Z + 0.22), free: false, freeT: 0, escT: 0, flinch: 0, phase: s * 1.7 };
  });
  // 쇠고랑: 모서리 끝마다 모서리를 감싼 회색 쇠(가운데 볼트)
  const clamps = [];
  for (let s = 0; s < STARS; s++) {
    for (let k = 0; k < CORNERS; k++) {
      const tp = tips[k], st = stars[s];
      const g = new THREE.Group();
      const at = new THREE.Vector3(st.home.x + tp.x * STAR_SCALE * 0.86, st.home.y + tp.y * STAR_SCALE * 0.86, WALL_Z + 0.36);
      g.position.copy(at);
      g.rotation.z = tp.a - Math.PI / 2;
      toon(g, GEO.box, '#8f98a6', { scale: [0.2, 0.09, 0.2], outline: 0.012, shell: true });
      toon(g, GEO.box, '#8f98a6', { position: [-0.085, -0.06, 0], scale: [0.04, 0.12, 0.2], outline: 0.01, shell: true });
      toon(g, GEO.box, '#8f98a6', { position: [0.085, -0.06, 0], scale: [0.04, 0.12, 0.2], outline: 0.01, shell: true });
      toon(g, GEO.dot, '#5e6673', { position: [0, 0.02, 0.11], scale: [0.03, 0.03, 0.02], outline: false });
      scene.add(g);
      clamps.push({ g, at, free: false, vy: 0, spin: 0, shake: 0 });
    }
  }

  // ---------- 오크 괴물 ----------
  const orc = { ...buildOrc(toon), mode: 'hide', path: null, speed: 1, walkT: 0, prevS: 0 };
  scene.add(orc.group);
  let stompCb = null;

  // ---------- 우리 셋 · 빵 옷 ----------
  let me = null;
  const pals = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware') };
  Object.values(pals).forEach((c) => { hideProps(c); scene.add(c.root); });
  const rolls = {};
  KINDS.forEach((k) => { rolls[k] = buildRoll(toon); scene.add(rolls[k]); });
  const walk = {}; // kind → { from, to, t, sec, rest: 남은 길, speed }
  const charOf = (k) => (k === 'me' ? me : pals[k]);

  let shot = SHOTS.hall, snapNext = true, mood = 'enter', peek = 'calm', peekT = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3(), tmpStar = new THREE.Vector3();

  function place(k, x, z, faceX, faceZ, y = 0) {
    const c = charOf(k);
    c.root.position.set(x, y, z);
    c.root.rotation.y = Math.atan2(faceX - x, faceZ - z);
    c.root.visible = true;
    delete walk[k];
  }
  /** 여러 마디 길을 멈칫하지 않고 쭉 달린다(speed: 초당 거리). */
  function walkPath(k, pts, speed) {
    const from = charOf(k).root.position.clone().setY(0), to = new THREE.Vector3(pts[0][0], 0, pts[0][1]);
    walk[k] = { from, to, t: 0, sec: Math.max(0.15, from.distanceTo(to) / speed), rest: pts.slice(1), speed };
  }
  /** 다 왔을 때 바라볼 곳(장면마다). */
  function arrive(k, c) {
    const p = c.root.position;
    if (mood === 'escape') c.root.visible = false; // 입구 밖으로 나갔다
    else if (mood === 'flee') c.root.rotation.y = Math.PI / 2; // 앗! 뒤(가게 안쪽)를 돌아본다
    else if (mood === 'back') c.root.rotation.y = Math.PI; // 바구니 · 벽을 본다
    else if (mood === 'rescue') c.root.rotation.y = k === 'chiikawa' ? Math.atan2(KITCHEN[0] - p.x, WALL_Z - p.z) : Math.PI;
  }
  function orcPlace(x, z, faceX, faceZ) {
    orc.group.position.set(x, 0, z);
    orc.group.rotation.y = Math.atan2(faceX - x, faceZ - z);
    orc.group.visible = true;
  }

  return {
    scene,
    camera,
    light,
    /** 새로 들어왔다: 내 생김새 look. 셋은 입구에, 별 · 쇠고랑 · 바구니 · 오크는 처음 그대로. */
    start(look) {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      hideProps(me);
      scene.add(me.root);
      stars.forEach((st) => { st.free = false; st.freeT = 0; st.escT = 0; st.flinch = 0; st.group.position.copy(st.home); st.group.rotation.set(0, 0, 0); st.halo.material.opacity = 0; st.group.visible = true; });
      clamps.forEach((c) => { c.free = false; c.vy = 0; c.spin = 0; c.shake = 0; c.g.visible = true; c.g.position.copy(c.at); c.g.rotation.x = 0; });
      gear.visible = false;
      orc.mode = 'hide'; orc.path = null; orc.group.visible = false;
      peek = 'calm'; peekT = 0; steamOn = 0;
      this.setMood('enter');
      shot = SHOTS.hall; snapNext = true;
    },
    /** 카메라 자리: 'hall' 입구 · 'door' 주방 문 · 'bath' 솥 · 'bread' 빵 옷 · 'orc' 뛰쳐나온 오크 · 'wall' 별 판(구출 놀이) · 'follow' 움직이는 셋을 따라. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.hall; if (snap) snapNext = true; },
    /**
     * 장면: 'enter' 입구에 선다 · 'bath' 솥 안(머리만 빼꼼) · 'bread' 빵 옷으로 돌돌 · 'flee' 빵에서 빠져나와 입구 쪽으로
     * · 'back' 바구니로 되돌아간다 · 'rescue' 별 판 앞으로(치이카와는 망보기) · 'escape' 다 같이 입구 밖으로.
     */
    setMood(m) {
      mood = m;
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c) continue;
        rolls[k].visible = m === 'bread';
        c.root.scale.setScalar(m === 'bread' ? 0.75 : 1);
        const at = SPOTS[m] && SPOTS[m][k];
        if (at) {
          if (m === 'enter') place(k, at[0], at[1], 0, 0.5);
          else if (m === 'bath') place(k, at[0], at[1], at[0], at[1] + 3, 0.45);
          else {
            place(k, at[0], at[1] - 0.25, at[0], at[1] + 3, 0.1); // 빵 통 안에(얼굴이 앞 테두리 바로 안쪽)
            rolls[k].position.set(at[0], 0, at[1]);
          }
        } else if (PATHS[m]) walkPath(k, PATHS[m][k].path, PATHS[m][k].speed);
      }
    },
    /** 오크: 'come' 주방에서 나와 빵 앞으로 · 'leave' 주방으로 돌아간다 · 'burst' 주방 문 앞에 뛰쳐나온다 · 'chase' 쫓아온다 · 'hide'. */
    orc(m) {
      orc.mode = m;
      orc.path = null;
      if (m === 'come' || m === 'burst') orcPlace(KITCHEN[0], KITCHEN[1], KITCHEN[0], 5);
      if (ORC_PATHS[m]) { orc.path = ORC_PATHS[m].path.slice(); orc.speed = ORC_PATHS[m].speed; }
      if (m === 'hide') orc.group.visible = false;
    },
    /** 오크 발소리(한 걸음 디딜 때마다). */
    onStomp(fn) { stompCb = fn; },
    /** 바구니에 무기 · 토벌 증표가 있는지(맡겼다 · 되찾았다). */
    basket(on) { gear.visible = !!on; },
    /** 누가 아직 걷거나 오크가 움직이는 중인지(다 끝나면 다음 대사). */
    get busy() { return Object.keys(walk).length > 0 || !!orc.path; },
    /** 주방: 'calm' 조용 · 'warn' 달그락(문이 들썩) · 'peek' 내다봄(문이 빼꼼, 문틈에 초록 손가락). */
    setPeek(p) { peek = p; peekT = 0; },
    /** 쇠고랑 i 의 세계 좌표(화면 위치를 재려고 — 빠졌으면 null). */
    clampWorld(i) { const c = clamps[i]; return c && !c.free ? c.g.position : null; },
    /** 쇠고랑 i 가 빠졌다: 툭 떨어진다. */
    freeClamp(i) { const c = clamps[i]; if (!c || c.free) return; c.free = true; c.vy = 1.2; c.spin = (i % 2 ? 1 : -1) * 6; stars[Math.floor(i / CORNERS)].flinch = 0.25; },
    /** 들킬 뻔: 쇠고랑이 다시 꽉(덜컹), 별도 움찔. */
    tighten(i) { const c = clamps[i]; if (!c) return; c.shake = 0.4; stars[Math.floor(i / CORNERS)].flinch = 0.4; },
    /** 별 하나가 다 풀렸다: 판에서 떨어져 둥실 앞으로. */
    starFree(s) { const st = stars[s]; if (st) st.free = true; },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 64 : 42;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      // 오크: 쿵쿵 걷기(한 발씩 들었다 디딘다), 서 있으면 숨 쉬듯 · 화나면 주먹이 부르르
      if (orc.group.visible) {
        const P = orc.group.position;
        if (orc.path) {
          const [tx, tz] = orc.path[0], dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz), stepLen = orc.speed * dt;
          if (d > 1e-4) orc.group.rotation.y = Math.atan2(dx, dz);
          if (d <= stepLen) { P.x = tx; P.z = tz; orc.path.shift(); } else { P.x += (dx / d) * stepLen; P.z += (dz / d) * stepLen; }
          orc.walkT += dt * 5.5;
          const s = Math.sin(orc.walkT);
          orc.legs[0].position.y = Math.max(0, s) * 0.28;
          orc.legs[1].position.y = Math.max(0, -s) * 0.28;
          if (orc.prevS && Math.sign(s) !== Math.sign(orc.prevS) && stompCb) stompCb();
          orc.prevS = s;
          P.y = Math.abs(s) * 0.06;
          if (!orc.path.length) {
            orc.path = null;
            orc.legs.forEach((l) => { l.position.y = 0; });
            P.y = 0;
            orc.prevS = 0;
            if (orc.mode === 'leave') orc.group.visible = false;
            else if (orc.mode === 'come') orc.group.rotation.y = 0;
            else if (orc.mode === 'chase') orc.group.rotation.y = Math.atan2(EXIT[0] - P.x, EXIT[1] - P.z);
          }
        } else {
          const angry = orc.mode === 'burst' || orc.mode === 'chase';
          orc.arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 1.4 + i) * 0.04; a.rotation.z = angry ? Math.sin(t * 20 + i * 2) * 0.03 : 0; });
        }
      }
      // 주방 문: 오크가 드나들면 활짝(안쪽으로), 달그락이면 들썩, 내다보면 빼꼼 + 문틈에 초록 손가락 · 창이 깜깜
      peekT += dt;
      const orcAtDoor = orc.group.visible && Math.hypot(orc.group.position.x - KITCHEN[0], orc.group.position.z - KITCHEN[1]) < 2.4;
      const doorTo = orcAtDoor ? 1.5 : peek === 'peek' ? Math.min(0.5, peekT * 1.8) : peek === 'warn' ? Math.sin(t * 40) * 0.03 : 0;
      doorPivot.rotation.y += (doorTo - doorPivot.rotation.y) * Math.min(1, dt * 10);
      grip.visible = peek === 'peek' && !orcAtDoor;
      shadow.material.opacity += ((peek === 'peek' ? 0.9 : 0) - shadow.material.opacity) * Math.min(1, dt * 8);
      windowMat.color.set(peek === 'warn' ? (Math.sin(t * 30) > 0 ? '#fff4c9' : '#e8c878') : '#ffe9a8');
      flame.scale.set(0.2 + Math.sin(t * 13) * 0.02, 0.3 + Math.sin(t * 9) * 0.04, 1);
      // 김: 목욕하는 동안 솥에서 모락모락
      steamOn += ((mood === 'bath' ? 1 : 0) - steamOn) * Math.min(1, dt * 2);
      steam.forEach((s) => {
        const u = (t * 0.35 + s.userData.phase) % 1;
        s.position.set(s.userData.x + Math.sin(t + s.userData.phase * 9) * 0.15, 1.0 + u * 1.6, s.userData.z);
        s.scale.setScalar(0.6 + u * 0.9);
        s.material.opacity = Math.sin(u * Math.PI) * 0.75 * steamOn;
        s.visible = steamOn > 0.02;
      });
      // 별똥별: 붙잡힌 동안 바르르(살려 줘), 풀리면 앞으로 둥실(가운데로 조금 모여 화면 안에)
      stars.forEach((st, s) => {
        st.flinch = Math.max(0, st.flinch - dt);
        if (!st.free) {
          st.group.rotation.z = Math.sin(t * 7 + st.phase) * 0.05 + Math.sin(st.flinch * 40) * st.flinch * 0.3;
          return;
        }
        st.freeT += dt;
        const e = smooth(Math.min(1, st.freeT / 1.2));
        st.group.position.set(st.home.x + (1 - s) * 0.35 * e, st.home.y + 0.25 * e + Math.sin(t * 2.4 + st.phase) * 0.08 * e, st.home.z + 0.9 * e);
        st.group.rotation.z = Math.sin(t * 3 + st.phase) * 0.12 * e;
        st.halo.material.opacity = 0.55 * e;
        if (mood === 'escape') { // 셋을 따라 입구 밖으로 슝
          st.escT += dt;
          const v = Math.min(1, st.escT / 2.4);
          st.group.position.lerp(tmpStar.set(EXIT[0] + 0.2, 1.5 + (s - 1) * 0.3, EXIT[1] + (s - 1) * 0.45), v * v);
          st.group.visible = v < 1;
        }
      });
      // 쇠고랑: 빠진 것은 툭 떨어져 바닥에서 사라진다, 다시 조인 것은 덜컹
      clamps.forEach((c) => {
        if (c.free) {
          if (!c.g.visible) return;
          c.vy -= dt * 9;
          c.g.position.y += c.vy * dt;
          c.g.position.z += dt * 0.6;
          c.g.rotation.z += c.spin * dt;
          if (c.g.position.y < 0.08) c.g.visible = false;
          return;
        }
        c.shake = Math.max(0, c.shake - dt);
        c.g.position.x = c.at.x + Math.sin(c.shake * 60) * c.shake * 0.08;
      });
      // 우리 셋: 걷는 중이면 걷기, 아니면 그 장면 몸짓
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c) continue;
        const w = walk[k];
        if (w) {
          w.t = Math.min(1, w.t + dt / w.sec);
          c.root.position.lerpVectors(w.from, w.to, w.t);
          c.root.rotation.y = Math.atan2(w.to.x - w.from.x, w.to.z - w.from.z);
          animateChibi(c, 'walk', t, { phase: t * (mood === 'escape' || mood === 'flee' ? 16 : 10), moving: true });
          if (w.t >= 1) {
            if (w.rest.length) { walkPath(k, w.rest, w.speed); continue; }
            delete walk[k];
            arrive(k, c);
          }
          continue;
        }
        let anim = 'idle';
        if (mood === 'enter') anim = k === 'chiikawa' ? 'shy' : k === 'hachiware' ? 'sway' : 'idle';
        else if (mood === 'bath') anim = k === 'chiikawa' ? 'shy' : k === 'hachiware' ? 'sway' : 'idle';
        else if (mood === 'bread') anim = k === 'chiikawa' ? 'shy' : k === 'hachiware' ? 'look' : 'idle';
        else if (mood === 'flee') anim = k === 'hachiware' ? 'flail' : k === 'chiikawa' ? 'shy' : 'look';
        else if (mood === 'back') anim = 'look';
        else if (mood === 'rescue') anim = k === 'chiikawa' ? (peek === 'calm' ? 'look' : 'shy') : k === 'hachiware' ? (peek === 'peek' ? 'shy' : 'pull') : 'idle';
        animateChibi(c, anim, t, { phase: k.length, power: anim === 'pull' ? 0.6 + Math.sin(t * 9) * 0.3 : 0 });
      }
      // 카메라: 정한 자리로 부드럽게(세로 화면이면 세로 자리)
      const sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot, k = Math.min(1, dt * 2.4);
      if (sh.follow) {
        // 움직이는 셋(아직 안에 있는)의 가운데를 따라간다(가게 안에서만), 다 나갔으면 그 자리에 멈춘다
        let n = 0;
        tmpLook.set(0, 0, 0);
        for (const kk of KINDS) { const c = charOf(kk); if (c && c.root.visible) { tmpLook.add(c.root.position); n++; } }
        if (n) {
          tmpLook.divideScalar(n).setY(0.8);
          tmpPos.copy(tmpLook).add(tmpStar.set(...sh.follow));
          tmpPos.set(Math.max(-6.8, Math.min(6.8, tmpPos.x)), Math.min(CEIL_Y - 0.4, tmpPos.y), Math.min(5.6, tmpPos.z));
        } else { tmpLook.copy(camLook); tmpPos.copy(camPos); }
      } else {
        tmpLook.set(...sh.look);
        if (sh.fit) {
          // 좁은 세로 화면에서 구출하는 동안은 지금 푸는 별 하나만 크게(다 풀면 다음 별로 옮겨 간다)
          const idx = mood === 'rescue' && camera.aspect < 0.8 ? clamps.findIndex((c) => !c.free) : -1;
          let fit = sh.fit;
          if (idx >= 0) { const [x, y] = STAR_POS[Math.floor(idx / CORNERS)]; tmpLook.set(x, y, sh.look[2]); fit = 2.4; }
          tmpPos.copy(tmpLook).setZ(tmpLook.z + Math.max(fit * 0.62, fit / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)));
        } else tmpPos.set(...sh.pos);
      }
      if (snapNext) { camPos.copy(tmpPos); camLook.copy(tmpLook); snapNext = false; }
      else { camPos.lerp(tmpPos, k); camLook.lerp(tmpLook, k); }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    }
  };
}

/**
 * 마을 동쪽 들판 길가의 레스토랑 '별 세 개' 겉모습: 낡은 회색 가게, 앞에 삐뚤어진 흰 간판('별 세 개' 손글씨),
 * 판자로 막은 창(모서리에 테이프), 하늘색 유리문. 이야기를 받은 동안만 보이고 막힌다(visible).
 * → { spot: 문 앞(이야기가 시작되는 자리), sign: 간판 자리, visible }
 */
export function createDinerFront(scene, village) {
  // 길 남쪽의 빈 땅(나무 · 바위가 없는 곳): 문(+z)이 길 쪽이자 카메라 쪽을 본다(마을 카메라는 늘 남쪽에서 본다)
  const tries = [[44, -4.6], [42, -4.8], [46, -6.4], [48, -6.6], [40, -4.8], [44, -7.4]];
  const [x, z] = tries.find(([tx, tz]) => village.isFree(tx, tz, 2.6, true) && roadDist(tx, tz) > 2.4) || tries[0];
  const face = 1;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = face < 0 ? Math.PI : 0;
  const m = (geo, c, o) => { const mesh = toonMesh(geo, c, { shadow: true, ...o }); g.add(mesh); return mesh; };
  m(GEO.box, '#a9aeb6', { position: [0, 1.4, 0], scale: [4.4, 2.8, 3.4], outline: 0.03, shell: true });
  m(GEO.box, '#959aa2', { position: [0, 2.86, 0], scale: [4.6, 0.14, 3.6], outline: 0.025, shell: true }); // 납작한 지붕 테두리
  // 앞(문 쪽 = +z): 판자로 막은 창 · 하늘색 유리문 · 삐뚤어진 간판
  m(GEO.box, '#c9a978', { position: [-1.05, 1.15, 1.72], scale: [1.7, 0.95, 0.06], outline: 0.02, shell: true });
  [-1.6, -1.25, -0.9, -0.55].forEach((sx) => m(GEO.box, '#8a6a44', { position: [sx, 1.15, 1.76], scale: [0.02, 0.9, 0.01], outline: false }));
  [[-1.82, 1.55], [-0.28, 0.75]].forEach(([sx, sy]) => m(GEO.box, '#efe2c4', { position: [sx, sy, 1.77], rotation: [0, 0, 0.5], scale: [0.22, 0.12, 0.01], outline: 0.008 })); // 테이프
  m(GEO.box, '#8f949b', { position: [0.95, 1.0, 1.71], scale: [1.25, 2.0, 0.05], outline: 0.02, shell: true }); // 문틀
  m(GEO.box, '#bfe0ee', { position: [0.95, 0.98, 1.74], scale: [1.08, 1.84, 0.04], outline: false }); // 유리
  m(GEO.box, '#e8edf0', { position: [0.62, 0.95, 1.77], scale: [0.14, 0.2, 0.02], outline: 0.008 }); // 손잡이 판
  m(GEO.box, '#f1f1ec', { position: [-0.15, 2.95, 1.86], rotation: [0, 0, 0.1], scale: [4.4, 1.4, 0.1], outline: 0.03, shell: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.31), new THREE.MeshBasicMaterial({ map: sharedSign() }));
  sign.position.set(-0.15, 2.95, 1.915);
  sign.rotation.z = 0.1;
  g.add(sign);
  g.visible = false;
  scene.add(g);
  // 막힘: 보일 때만(soft 면 지나갈 수 있고 풀 · 꽃만 비켜 돋는다)
  const block = { x, z, box: { hx: 2.25, hz: 1.75, yaw: 0 }, soft: true };
  village.obstacles.push(block);
  return {
    spot: { x, z: z + face * 2.9 },
    sign: { x, y: 4.1, z: z + face * 1.9 },
    get visible() { return g.visible; },
    set visible(on) { g.visible = !!on; block.soft = !on; }
  };
}

/** 풀려난 별똥별 셋(마을): 내 머리 위에 둥실 떠 있다가 flyAway() 하면 밤하늘로 슝. → { group, update(dt, t, center), flyAway(), done } */
export function buildStarTrio() {
  const group = new THREE.Group();
  const trio = [-1, 0, 1].map((k, i) => {
    const st = buildStarman();
    st.group.scale.setScalar(0.42);
    group.add(st.group);
    return { ...st, k, phase: i * 2.1 };
  });
  let fly = -1;
  return {
    group,
    get done() { return fly > 2.5; },
    flyAway() { if (fly < 0) fly = 0; },
    update(dt, t, center) {
      if (fly >= 0) fly += dt;
      const up = fly > 0 ? fly * fly * 6 : 0;
      trio.forEach((st) => {
        st.group.position.set(center.x + st.k * 1.1, 2.1 + Math.sin(t * 2.2 + st.phase) * 0.12 + up, center.z + 0.6 - Math.abs(st.k) * 0.3);
        st.group.rotation.z = Math.sin(t * 2.6 + st.phase) * 0.15;
        st.group.scale.setScalar(0.42 * (fly > 1.6 ? Math.max(0, 1 - (fly - 1.6)) : 1));
      });
    }
  };
}
