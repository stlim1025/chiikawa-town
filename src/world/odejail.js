import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { mergeUnit } from '../render/batch.js';
import { buildChibi, buildNpc, animateChibi, wearStripes } from '../actors/models.js';
import { groundY, roadDist } from '../core/layout.js';

/**
 * 사이드스토리 '오데와 함께 감옥'(원작 애니 189화 — stories/ode.js)의 장소와 장면.
 *  createOdeSpot: 서쪽 숲 호숫가 길 옆 빈터에 책상다리하고 앉아 커다란 버섯을 와작와작 먹는 오데(이야기가 열린 동안만 보인다).
 *  createOdeStage: 숲속 빈터(오데와 버섯 · 고블린들에게 붙잡힘)와 고블린 감옥(줄무늬 옷 · 요리책 · 땅 파기 · 우리 넷은 땅굴로 ·
 *    오데는 정문 쇠창살을 가운데부터 휘어 나와 고블린들과 싸운다 · 붙잡혀 온 모몽가).
 */
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const lerp = (a, b, u) => a + (b - a) * u;
const showTag = (c, tag, on) => (c.props[tag] || []).forEach((m) => { m.visible = !!on; });
const ROPE = '#d9b98a';

/** 오데가 먹는 커다란 버섯(동그란 갈색 갓 · 하얀 대, 한쪽은 뜯어 먹은 자리). */
export function buildBigMushroom() {
  const g = new THREE.Group();
  const t = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); g.add(m); return m; };
  t(GEO.cylinder, '#f4efe4', { scale: [0.13, 0.34, 0.13], outline: 0.012 });
  t(GEO.sphere, '#c99a5c', { position: [0, 0.38, 0], scale: [0.42, 0.25, 0.4], outline: 0.016 });
  t(GEO.sphere, '#ddb67e', { position: [-0.12, 0.54, 0.16], scale: [0.13, 0.05, 0.08], outline: false });
  t(GEO.sphere, '#f6e9cc', { position: [0.24, 0.44, 0.22], scale: [0.12, 0.09, 0.08], outline: 0.01 });
  return g;
}

/** 오데를 앉힌다(책상다리 — on = false 면 서는 다리로). */
export function setOdeSit(ode, on) {
  showTag(ode, 'sitLegs', on);
  ['legL', 'legR'].forEach((k) => { if (ode.pivots[k]) ode.pivots[k].visible = !on; });
}

// 서쪽 숲 호숫가로 가는 길 옆 나무가 드문 빈터(남쪽 카메라 앞을 나무가 가리지 않게): 하치와레 구덩이 · 초콜릿 덩굴 · 토끼굴과 떨어진 곳
const SPOT_TRIES = [[-40, 22], [-39, 23.5], [-45, 26], [-50, 9]];
const FACE = -Math.PI / 5; // 길(서쪽)과 카메라(남쪽) 사이를 보고 앉는다

/** 마을: 숲속 빈터에서 버섯을 먹는 오데(story 가 보였다 숨겼다 한다, 숨으면 길도 막지 않는다). */
export function createOdeSpot(scene, village) {
  const [x, z] = SPOT_TRIES.find(([tx, tz]) => village.isFree(tx, tz, 1.6, true) && roadDist(tx, tz) > 2.0) || SPOT_TRIES[0];
  const group = new THREE.Group();
  group.position.set(x, groundY(x, z), z);
  group.rotation.y = FACE;
  const ode = buildNpc('ode');
  Object.values(ode.props || {}).flat().forEach((m) => { m.visible = false; });
  setOdeSit(ode, true);
  group.add(ode.root);
  const shroom = buildBigMushroom();
  shroom.position.set(0, 0.3, 0.74);
  shroom.scale.setScalar(1.25);
  group.add(shroom);
  group.visible = false;
  scene.add(group);
  const ob = { x, z, r: 1.0, off: true };
  village.obstacles.push(ob);
  return {
    spot: { x, z },
    /** 말을 거는 자리(오데 앞). */
    front: { x: x + Math.sin(FACE) * 2.1, z: z + Math.cos(FACE) * 2.1 },
    get visible() { return group.visible; },
    show(on) { group.visible = !!on; ob.off = !on; },
    update(dt, t) { if (group.visible) animateChibi(ode, 'nibble', t, { phase: 1.3 }); }
  };
}

// ---------- 숲속 빈터 · 고블린 감옥 장면 ----------
const ODE_SIT = [0, -1.3]; // 숲: 오데가 책상다리하고 앉은 자리
const BARS_Z = 1.5, BAR_H = 3.4, BAR_XS = Array.from({ length: 17 }, (_, i) => -2.88 + i * 0.36); // 감옥 앞 쇠창살(가운데 8번이 x = 0)
// 오데가 쥐고 휘는 정문 창살 네 줄(외눈 양옆으로 두 줄씩 — 가운데 줄을 쥐면 그 창살이 눈을 가렸다): 위아래는 그대로, 가운데가 활처럼 양옆으로 휜다.
// 안쪽 둘이 더 많이, 바깥 둘은 덜 휜다(바깥 줄이 옆의 곧은 창살을 넘어가지 않게)
const MID = [7, 8, 9, 10], PRY_X = 0.18, BENDS = [-0.28, -0.5, 0.5, 0.28];
// 감옥 바닥 오른쪽의 땅굴(우리 넷은 여기로 빠져나간다): 뒤 왼쪽 구석 카메라에서 땅굴과 창살 밖 간수가 나란히 보이게
// (안쪽 구석에 두었더니 땅굴을 비추면 간수가 화면 밖이라 고개를 드는 게 안 보였다. 가운데에 두면 땅굴이 연타 버튼 밑에 가렸다)
const HOLE = [1.6, 0];
const FIGHT = [0.2, 3.3]; // 휜 창살 틈으로 나온 오데가 고블린들과 싸우는 자리
const THROW = ['g1', 'g2', 'g0', 'g3']; // 오데가 붙잡아 던지는 차례(g4 는 콩 하고 덤볐다가 끝에 도망친다)
const GUARD = [2.35, 2.85]; // 창살 밖 간수 고블린(나무 의자에 앉아 요리책을 본다)
const CHEF = [-2.25, 3.05]; // 요리책을 펼쳐 든 고블린(원작 장면처럼 책 쪽을 우리에게)
const POT = [-3.75, 3.9]; // 커다란 솥(불 위)
const GOBS = ['g0', 'g1', 'g2', 'g3', 'g4'];
const KINDS = ['me', 'chiikawa', 'hachiware', 'usagi', 'ode', 'momonga', ...GOBS];
const SIT_LIFT = 0.12;
const G_GUARD = [...GUARD, 'read', 'cell'], G_CHEF = [...CHEF, 'read', 'cam'];
// 땅 파기 때 간수가 바라보는 쪽: 요리책은 감옥에 등을 돌리고 보다가, 갸웃하며 반쯤 돌고, 고개를 들면 감옥을 정면으로(왼쪽으로 돈다)
const GUARD_YAW = { read: 0, warn: -1.45, look: Math.atan2(-GUARD[0], -0.5 - GUARD[1]) };
// 장면마다 서는 자리 [x, z, 몸짓, 바라보는 곳('cam' | 'ode' | 'mid' | 'hole' | 'cell' | 'out' | [x, z])]
const SPOTS = {
  // 오데를 가운데 두고 양옆으로 둥글게(한 줄로 서면 다들 카메라에 등을 보였다)
  meet: { ode: [...ODE_SIT, 'nibble', 'cam'], me: [-1.45, -0.7, 'idle', 'ode'] },
  arrive: { ode: [...ODE_SIT, 'nibble', 'cam'], me: [-1.45, -0.7, 'idle', 'ode'], chiikawa: [-2.3, -0.35, 'shy', [0, 1.2]], hachiware: [1.45, -0.7, 'look', 'ode'], usagi: [2.3, -0.35, 'hop', [0, 1.2]] },
  share: { ode: [...ODE_SIT, 'nibble', 'cam'], me: [-1.45, -0.7, 'nibble', 'ode'], chiikawa: [-2.3, -0.35, 'nibble', [0, 1.2]], hachiware: [1.45, -0.7, 'nibble', 'ode'], usagi: [2.3, -0.35, 'nibble', [0, 1.2]] },
  // 덤불에서 튀어나온 고블린들이 빙 둘러싼다
  goblins: { ode: [...ODE_SIT, 'idle', 'cam'], me: [-1.25, 0.55, 'cower', 'cam'], chiikawa: [-0.4, 0.95, 'cower', 'cam'], hachiware: [0.5, 0.9, 'look', 'cam'], usagi: [1.3, 0.5, 'look', 'cam'],
    g0: [-3.3, 0.2, 'idle', 'mid'], g1: [3.3, 0.3, 'idle', 'mid'], g2: [-2.6, 2.8, 'idle', 'mid'], g3: [2.7, 2.9, 'idle', 'mid'], g4: [-2.2, -2.4, 'idle', 'mid'] },
  // 붙잡힘: 오데는 꽁꽁(손은 앞에 모으고), 우리 넷도 밧줄에
  caught: { ode: [0, -1.0, 'pray', 'cam'], me: [-1.35, 0.85, 'cower', 'cam'], chiikawa: [-0.45, 1.3, 'sob', 'cam'], hachiware: [0.5, 1.25, 'shy', 'cam'], usagi: [1.45, 0.85, 'idle', 'cam'],
    g0: [-1.15, -1.9, 'cheer', 'cam'], g1: [1.15, -1.9, 'cheer', 'cam'], g2: [-2.9, 1.6, 'hop', 'mid'], g3: [3.0, 1.5, 'hop', 'mid'], g4: [-2.4, -0.4, 'hop', 'mid'] },
  // 고블린 감옥: 창살 안(원작 구도처럼 오데가 뒤 가운데, 셋이 앞줄), 창살 밖 앞쪽에 고블린 둘의 뒤통수
  // 얼굴이 창살 사이로 보이게(카메라에서 창살이 그 깊이에 비치는 간격의 가운데 — 오데 외눈이 가운데 창살에 가렸다)
  cell: { ode: [0.29, -1.15, 'idle', 'cam'], usagi: [-0.69, 0.3, 'idle', 'cam'], chiikawa: [0.22, 0.45, 'idle', 'cam'], hachiware: [1.15, 0.3, 'idle', 'cam'], me: [-1.68, 0.05, 'idle', 'cam'],
    g0: [-1.9, 2.55, 'idle', 'cell'], g1: [1.9, 2.55, 'idle', 'cell'], g2: G_GUARD, g3: G_CHEF },
  cook: { ode: [0.29, -1.15, 'idle', 'cam'], usagi: [-0.69, 0.3, 'look', CHEF], chiikawa: [0.22, 0.45, 'shy', CHEF], hachiware: [1.15, 0.3, 'look', CHEF], me: [-1.68, 0.05, 'look', CHEF],
    g2: G_GUARD, g3: G_CHEF },
  // 감옥살이: 나무 그릇 죽을 받아 먹는다
  life: { ode: [1.5, -1.4, 'nibble', 'cam'], me: [-1.6, -0.15, 'nibble', 'cam'], usagi: [-0.75, 0.2, 'nibble', 'cam'], chiikawa: [0.05, 0.35, 'nibble', 'cam'], hachiware: [0.85, 0.2, 'nibble', 'cam'], g2: G_GUARD, g3: G_CHEF },
  // 땅 파기: 셋이 땅굴 건너편에 쪼그려 앉아(얼굴이 카메라 쪽) 파고, 우사기는 간수를 살피고, 오데는 안쪽 구석에서 지켜본다(카메라 앞에 서면 등이 화면을 가렸다).
  // 간수는 감옥에 등을 돌리고 요리책을 본다(고개를 들 때 돌아본다)
  dig: { me: [2.27, -0.34, 'dig', 'hole'], chiikawa: [2.26, 0.35, 'dig', 'hole'], hachiware: [1.69, 0.75, 'dig', 'hole'], usagi: [-0.8, 0.9, 'look', GUARD], ode: [2.75, -1.75, 'idle', 'hole'],
    g2: [...GUARD, 'read', [GUARD[0], GUARD[1] + 5]], g3: G_CHEF },
  // 오데가 정문 창살을 쥐고 휜다(얼굴은 바깥으로). 우리 넷은 땅굴 옆에서 숨죽여 지켜본다(방방 뛰면 내내 소란스러웠다 — 싸움이 끝난 뒤 땅굴로)
  pry: { ode: [PRY_X, BARS_Z - 0.95, 'pry', 'out'], chiikawa: [1.2, -0.85, 'pray', 'ode'], hachiware: [1.95, -0.9, 'look', 'ode'], me: [2.6, -0.4, 'look', 'ode'],
    usagi: [2.35, 0.7, 'look', 'ode'], g2: [...GUARD, 'shy', 'cell'], g3: G_CHEF },
  // 감옥 밖: 휜 창살 틈으로 나온 오데를 고블린들이 둘러싼다(양옆으로 — 카메라 앞을 가리지 않게. 오데 옆 뒤쪽 둘은 얼굴과 도끼 · 바구니가 카메라 쪽으로 보인다)
  fight: { ode: [...FIGHT, 'idle', 'cam'], g0: [-1.7, 2.45, 'hop', 'ode'], g1: [-2.8, 3.3, 'hop', 'ode'], g2: [2.8, 3.6, 'hop', 'ode'], g3: [2.1, 2.45, 'hop', 'ode'], g4: [-1.2, 6.2, 'hop', 'ode'] },
  // 그날 저녁 감옥: 줄무늬 옷의 모몽가 혼자
  momonga: { momonga: [0.25, 0.2, 'sob', 'cam'], g0: [-1.9, 2.55, 'idle', 'cell'], g1: [1.9, 2.55, 'idle', 'cell'], g2: G_GUARD, g3: G_CHEF },
  // 숲(탈출한 뒤): 줄무늬 차림 그대로 숲길에서 숨을 고른다
  out: { ode: [0.2, -0.9, 'idle', 'cam'], me: [-1.4, 0.9, 'idle', 'cam'], chiikawa: [-0.5, 1.3, 'sob', 'cam'], hachiware: [0.55, 1.25, 'idle', 'cam'], usagi: [1.45, 0.85, 'hop', 'cam'] }
};
const SHOTS = {
  wide: { pos: [0, 2.7, 6.6], look: [0, 0.8, -0.5], portrait: { pos: [0, 3.5, 9.8], look: [0, 0.9, -0.5] } },
  ode: { pos: [0.5, 1.9, 2.3], look: [0, 1.25, -1.3], portrait: { pos: [0.5, 2.3, 3.6], look: [0, 1.3, -1.3] } },
  goblins: { pos: [0, 4.6, 8.2], look: [0, 0.3, 0.4], portrait: { pos: [0, 5.8, 11.5], look: [0, 0.3, 0.4] } },
  capture: { pos: [2.6, 2.2, 5.6], look: [0, 0.9, -0.3], portrait: { pos: [3.3, 2.9, 8.2], look: [0, 1.0, -0.3] } },
  cell: { pos: [0, 1.6, 5.9], look: [0, 1.0, -1.0], portrait: { pos: [0, 2.0, 8.7], look: [0, 1.1, -1.0] } },
  cook: { pos: [-2.25, 0.95, 5.45], look: [-2.25, 0.42, 3.2], portrait: { pos: [-2.25, 1.1, 6.7], look: [-2.25, 0.4, 3.2] } }, // 가슴 앞에 펼친 요리책(아래 대사 상자에 안 가리게 화면 가운데)과 그 위 얼굴
  // 감옥 안 뒤 왼쪽 구석에서 대각선으로: 왼쪽에 땅굴 · 파는 셋, 오른쪽 창살 너머에 간수(밖에서는 창살에 가렸다). 세로 화면은 땅굴 바로 뒤에서 내려다본다
  dig: { pos: [-2.7, 2.3, -2.3], look: [1.47, 0.28, 0.46], portrait: { pos: [2.0, 3.4, -2.45], look: [1.95, 0.46, 1.05] } },
  bars: { pos: [PRY_X, 1.5, 4.8], look: [PRY_X, 1.3, 0.9], portrait: { pos: [PRY_X, 1.8, 6.8], look: [PRY_X, 1.3, 0.9] } },
  fight: { pos: [0.3, 2.7, 9.6], look: [0.2, 1.0, 3.6], portrait: { pos: [0.3, 3.4, 12.6], look: [0.2, 1.0, 3.6] } }, // 고블린들 너머로 오데 얼굴
  momonga: { pos: [0, 1.35, 4.9], look: [0, 0.7, -0.4], portrait: { pos: [0, 1.6, 6.8], look: [0, 0.75, -0.4] } }
};
const PLACES = {
  forest: { bg: '#dfeccf', near: 12, far: 32, hemi: 1.4, light: [1, 0.98, 0.94], mid: [0, 0] },
  jail: { bg: '#8c8993', near: 10, far: 27, hemi: 1.15, light: [0.92, 0.92, 0.97], mid: [0, -0.4] }
};

/** 고블린 요리책 펼친 면: 왼쪽 「굽기」(불꽃), 오른쪽 「끓이기」(웃는 냄비). */
function cookbookTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d');
    g.fillStyle = '#f7ead0'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#8a5a3c'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
    g.beginPath(); g.moveTo(256, 4); g.lineTo(256, 252); g.stroke();
    g.fillStyle = '#4a3428'; g.font = '700 70px Gaegu, "Apple SD Gothic Neo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('굽기', 128, 72); g.fillText('끓이기', 384, 72);
    // 불꽃
    g.fillStyle = '#ef6a4a'; g.strokeStyle = '#4a3428'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(128, 222); g.bezierCurveTo(88, 214, 90, 170, 112, 150); g.bezierCurveTo(112, 170, 124, 172, 126, 160); g.bezierCurveTo(124, 140, 136, 124, 146, 118);
    g.bezierCurveTo(146, 140, 172, 160, 166, 192); g.bezierCurveTo(162, 212, 148, 222, 128, 222); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(130, 198, 13, 18, 0, 0, Math.PI * 2); g.fill();
    // 웃는 냄비(국 그릇)
    g.fillStyle = '#d6e6f2'; g.beginPath(); g.moveTo(340, 150); g.lineTo(428, 150); g.bezierCurveTo(428, 200, 404, 222, 384, 222); g.bezierCurveTo(364, 222, 340, 200, 340, 150); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#4a3428'; g.beginPath(); g.arc(368, 172, 5, 0, Math.PI * 2); g.arc(400, 172, 5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(384, 182, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load('700 70px Gaegu').then(draw, () => {});
  return tex;
}

/**
 * 돌벽 금(원작 감옥처럼 들쭉날쭉한 그물 모양): 흔들린 격자 점을 이어 긋고, 몇 줄은 빼서 돌덩이 모양이 고르지 않게. 벽 면(로컬 xy)에 붙인다.
 * w · h: 벽 크기, cols · rows: 칸 수, z: 벽 면 앞 높이. 한 덩어리로 합친다.
 */
function crackNet(w, h, cols, rows, seed, z) {
  const g = new THREE.Group();
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pts = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const edge = i === 0 || i === cols || j === 0 || j === rows;
    pts.push([-w / 2 + (i / cols) * w + (edge ? 0 : (rnd() - 0.5) * (w / cols) * 0.7), (j / rows) * h + (edge ? 0 : (rnd() - 0.5) * (h / rows) * 0.6)]);
  }
  const at = (i, j) => pts[j * (cols + 1) + i];
  const seg = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    g.add(toonMesh(GEO.box, '#8a6656', { position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], rotation: [0, 0, Math.atan2(dy, dx)], scale: [Math.hypot(dx, dy) + 0.03, 0.038, 0.02], outline: false, shadow: false }));
  };
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    if (i < cols && j > 0 && j < rows && rnd() > 0.12) seg(at(i, j), at(i + 1, j));
    if (j < rows && i > 0 && i < cols && rnd() > 0.12) seg(at(i, j), at(i, j + 1));
  }
  mergeUnit(g, g.children.slice());
  return g;
}

/** 쇠창살 한 줄(아래가 0, 위로 BAR_H). */
function buildBar(x) {
  const g = new THREE.Group();
  g.position.set(x, 0, BARS_Z);
  g.add(toonMesh(GEO.cylinder, '#4b4a52', { scale: [0.045, BAR_H, 0.045], outline: 0.014, shadow: false }));
  return g;
}
/** 고블린 도끼(오른쪽 옆구리에 바깥으로 비스듬히 세운다 — 날이 머리 옆에 와서 뒤에서도 보인다): 나무 자루 끝에 회색 날. 자루 쥔 데가 원점. */
function buildAxe() {
  const g = new THREE.Group();
  g.add(toonMesh(GEO.cylinder, '#9a6a42', { position: [0, -0.15, 0], scale: [0.034, 0.98, 0.034], outline: 0.01, shadow: false })); // 자루
  g.add(toonMesh(GEO.box, '#aeb3bb', { position: [0.12, 0.7, 0], scale: [0.24, 0.2, 0.045], outline: 0.012, shadow: false })); // 날
  g.add(toonMesh(GEO.box, '#e8ebf0', { position: [0.235, 0.7, 0], scale: [0.03, 0.19, 0.05], outline: false, shadow: false })); // 날끝
  return g;
}
/** 고블린 바구니(왼쪽 옆구리에 든다): 엮은 띠 두 줄과 둥근 손잡이, 위로 빨간 버섯 몇 개. 손잡이 꼭대기가 원점에서 0.25 위. */
function buildBasket() {
  const g = new THREE.Group();
  g.add(toonMesh(GEO.cylinder, '#c8955a', { position: [0, -0.1, 0], scale: [0.17, 0.2, 0.15], outline: 0.012, shadow: false }));
  g.add(toonMesh(GEO.cylinder, '#6e4a2a', { position: [0, 0.098, 0], scale: [0.15, 0.006, 0.13], outline: false, shadow: false })); // 속
  [-0.04, 0.03].forEach((y) => g.add(toonMesh(GEO.cylinder, '#a87440', { position: [0, y, 0], scale: [0.176, 0.025, 0.156], outline: false, shadow: false }))); // 엮은 띠
  g.add(toonMesh(new THREE.TorusGeometry(0.15, 0.018, 6, 16, Math.PI), '#a87440', { position: [0, 0.1, 0], outline: 0.008, shadow: false })); // 손잡이
  [[-0.07, 0.03], [0.06, -0.03], [0.01, 0.06]].forEach(([x, z]) => g.add(toonMesh(GEO.sphere, '#e0524f', { position: [x, 0.11, z], scale: [0.06, 0.04, 0.06], outline: 0.008, shadow: false }))); // 버섯 갓
  return g;
}
/**
 * 오데가 휘는 정문 창살: 짧은 마디 여럿을 이어 세우고, bend(amt) 로 위아래 끝은 그대로 둔 채 가운데가 옆으로 amt 만큼 활처럼 휜다(원작처럼).
 * 마디는 이음매가 벌어지지 않게 조금씩 겹친다.
 */
const BAR_SEGS = 12;
function buildBendBar(x) {
  const g = new THREE.Group();
  g.position.set(x, 0, BARS_Z);
  const h = BAR_H / BAR_SEGS, k = Math.PI / BAR_H, segs = [];
  for (let i = 0; i < BAR_SEGS; i++) {
    const s = new THREE.Group();
    s.add(toonMesh(GEO.cylinder, '#4b4a52', { position: [0, -h * 0.54, 0], scale: [0.045, h * 1.08, 0.045], outline: 0.014, shadow: false }));
    g.add(s);
    segs.push(s);
  }
  g.userData.bend = (amt) => segs.forEach((s, i) => {
    const y = (i + 0.5) * h;
    s.position.set(amt * Math.sin(k * y), y, 0);
    s.rotation.z = -Math.atan(amt * k * Math.cos(k * y));
  });
  g.userData.bend(0);
  return g;
}

export function createOdeStage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PLACES.forest.bg);
  scene.fog = new THREE.Fog(PLACES.forest.bg, PLACES.forest.near, PLACES.forest.far);
  const hemi = new THREE.HemisphereLight(0xfffbe8, 0xb5ad9c, PLACES.forest.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
  sun.position.set(4, 9, 7);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const light = new THREE.Color(...PLACES.forest.light);
  const toon = (parent, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); parent.add(m); return m; };

  // ---------- 숲속 빈터: 모래빛 맨땅 · 둘레 풀밭, 뒤로 하얀 줄기에 뭉게뭉게 초록 나무들, 앞 양옆 덤불(고블린이 숨는다) ----------
  const forest = new THREE.Group();
  scene.add(forest);
  toon(forest, GEO.cylinder, '#a9cf8f', { position: [0, -0.1, 0], scale: [34, 0.1, 34], outline: false });
  toon(forest, GEO.cylinder, '#efe6cc', { position: [0, 0, 0.2], scale: [4.8, 0.02, 4.2], outline: false });
  [[-4.6, -4.2, 1.0], [-1.8, -5.6, 1.15], [1.6, -5.4, 1.1], [4.4, -4.4, 1.0], [-6.6, -1.6, 0.95], [6.7, -1.2, 0.95], [-7.4, 2.4, 0.9], [7.2, 3.0, 0.9], [0, -8.2, 1.3], [-4.0, -8.6, 1.2], [4.2, -8.8, 1.2]]
    .forEach(([x, z, s], i) => {
      toon(forest, GEO.cylinder, '#efe3cf', { position: [x, 0, z], scale: [0.3 * s, 4.6 * s, 0.3 * s], outline: 0.025 });
      [[0, 4.9, 0, 1.5], [-0.95, 4.3, 0.25, 1.05], [0.95, 4.4, -0.15, 1.1], [0, 5.9, -0.1, 1.0]].forEach(([dx, y, dz, r]) => toon(forest, GEO.sphere, i % 2 ? '#93c983' : '#86bf76',
        { position: [x + dx * s, y * s, z + dz * s], scale: [r * s, r * 0.8 * s, r * s], outline: 0.03 }));
    });
  [[-3.6, 0.0], [3.6, 0.1], [-2.9, 3.1], [3.0, 3.2], [-2.5, -2.7]].forEach(([x, z]) => [[0, 0.35, 0, 0.55], [-0.4, 0.28, 0.1, 0.4], [0.42, 0.3, 0.05, 0.42]]
    .forEach(([dx, y, dz, r]) => toon(forest, GEO.sphere, '#7fb86c', { position: [x + dx, y, z + dz - 0.35], scale: [r, r * 0.85, r], outline: 0.025 })));
  for (let i = 0; i < 20; i++) { const a = i * 2.31, r = 3.6 + (i % 5) * 0.8; toon(forest, GEO.cone, '#7da05e', { position: [Math.sin(a) * r, 0.08, Math.cos(a) * r - 0.3], scale: [0.05, 0.16, 0.05], outline: false }); }
  const shroom = buildBigMushroom();
  forest.add(shroom);

  // ---------- 고블린 감옥: 금 간 회색 돌벽 셋(뒤 · 양옆), 앞은 굵은 쇠창살, 창살 밖은 간수 의자 · 요리책 · 큰 솥 ----------
  const jail = new THREE.Group();
  jail.visible = false;
  scene.add(jail);
  const WALL = '#cbcad0';
  toon(jail, GEO.box, '#b9b8be', { position: [0, -0.05, -0.55], scale: [6.6, 0.1, 4.1], outline: false }); // 감옥 바닥
  toon(jail, GEO.box, '#c4bdb2', { position: [0, -0.06, 5.5], scale: [16, 0.1, 8], outline: false }); // 창살 밖 바닥
  [[-1.2, -1.9, 0.5], [0.9, -0.4, 0.35], [-0.3, 0.8, 0.28], [2.2, 3.4, 0.5], [-1.0, 4.4, 0.4]].forEach(([x, z, r]) => toon(jail, GEO.cylinder, '#aeacb3', { position: [x, 0, z], scale: [r, 0.005, r * 0.7], outline: false })); // 바닥 얼룩
  toon(jail, GEO.box, WALL, { position: [0, 2.75, -2.75], scale: [7.2, 5.5, 0.3], outline: 0.03 }); // 뒷벽
  [-1, 1].forEach((sd) => {
    toon(jail, GEO.box, WALL, { position: [sd * 3.4, 2.75, -0.55], scale: [0.3, 5.5, 4.7], outline: 0.03 }); // 옆벽
    toon(jail, GEO.box, WALL, { position: [sd * 3.15, 2.75, BARS_Z], scale: [0.5, 5.5, 0.4], outline: 0.03 }); // 창살 옆 기둥
    const side = crackNet(4.2, 5.4, 4, 4, sd > 0 ? 71 : 37, 0.012);
    side.rotation.y = -sd * Math.PI / 2;
    side.position.set(sd * 3.24, 0, -0.55);
    jail.add(side);
  });
  toon(jail, GEO.box, WALL, { position: [0, 4.5, BARS_Z], scale: [6.6, 2.0, 0.4], outline: 0.03 }); // 창살 위 돌 들보
  const back = crackNet(6.9, 5.4, 7, 5, 13, 0.012);
  back.position.set(0, 0, -2.6);
  jail.add(back);
  // 쇠창살: 위아래 가로대 + 세로 창살(가운데 둘은 마디로 — 오데가 휜다)
  const rails = new THREE.Group();
  [0.1, BAR_H - 0.12].forEach((y) => rails.add(toonMesh(GEO.box, '#4b4a52', { position: [0, y, BARS_Z], scale: [6.0, 0.08, 0.08], outline: 0.014, shadow: false })));
  const bars = BAR_XS.map((x, i) => { const b = MID.includes(i) ? buildBendBar(x) : buildBar(x); (MID.includes(i) ? jail : rails).add(b); return b; });
  jail.add(rails);
  const midBars = MID.map((i) => bars[i]);
  // 간수 의자 · 큰 솥과 불
  toon(jail, GEO.cylinder, '#9a7552', { position: [GUARD[0], 0, GUARD[1] + 0.15], scale: [0.28, 0.32, 0.28], outline: 0.015 });
  toon(jail, GEO.cylinder, '#4a4048', { position: [POT[0], 0.18, POT[1]], scale: [0.55, 0.62, 0.55], outline: 0.025 });
  toon(jail, new THREE.TorusGeometry(0.56, 0.05, 8, 24), '#5a505a', { position: [POT[0], 0.8, POT[1]], rotation: [Math.PI / 2, 0, 0], outline: 0.012 });
  [[-0.25, 0.15], [0.05, 0.3], [0.3, 0.05], [-0.05, -0.2]].forEach(([dx, dz]) => toon(jail, GEO.cylinder, '#7a5636', { position: [POT[0] + dx, 0, POT[1] + dz + 0.3], rotation: [0.3, dx * 2, 0], scale: [0.05, 0.4, 0.05], outline: 0.01 }));
  const flames = [[-0.18, 0.62], [0.12, 0.6], [0, 0.72]].map(([dx, dz], i) => toon(jail, GEO.cone, i === 2 ? '#ffd36b' : '#f2884a', { position: [POT[0] + dx, 0.02, POT[1] + dz], scale: [0.12, 0.3, 0.12], outline: false }));
  // 땅굴 · 파낸 흙 · 바닥에 걸린 바위
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: '#2a1f1a' }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(HOLE[0], 0.012, HOLE[1]);
  jail.add(hole);
  // 파낸 흙은 땅굴 뒤쪽(벽 쪽)에 쌓는다
  const dirt = [[-0.3, -0.8], [0.35, -0.7], [-0.85, -0.6]].map(([dx, dz]) => toon(jail, GEO.sphere, '#8a6a4a', { position: [HOLE[0] + dx, 0, HOLE[1] + dz], scale: [0.2, 0.12, 0.2], outline: 0.012 }));
  // 흙먼지
  const dust = Array.from({ length: 14 }, () => { const m = toon(scene, GEO.sphere, '#b6ad9f', { scale: [0.1, 0.08, 0.1], outline: 0.008 }); m.visible = false; return m; });

  // ---------- 우리 넷 · 오데 · 모몽가 · 고블린 다섯 ----------
  let me = null;
  const pals = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi'), ode: buildNpc('ode'), momonga: buildNpc('momonga') };
  GOBS.forEach((k) => { pals[k] = buildNpc('goblin'); });
  Object.values(pals).forEach((c) => { Object.values(c.props || {}).flat().forEach((m) => { m.visible = false; }); scene.add(c.root); });
  const ode = pals.ode;
  // 간수는 덮개가 갈색인 작은 책, 요리사는 「굽기 · 끓이기」를 펼쳐 우리 쪽으로(감옥에서만 든다).
  // 요리책은 가슴 앞으로 쭉 내밀어 든다: 얼굴 높이 · 얼굴 바로 앞에 두면 책 읽는 몸짓으로 고개를 숙일 때 머리가 책을 덮었다
  const guardBook = toonMesh(GEO.box, '#8a5a3c', { position: [0, 0.5, 0.42], rotation: [-0.6, 0, 0], scale: [0.34, 0.04, 0.24], outline: 0.012, shadow: false });
  pals.g2.root.add(guardBook);
  const book = new THREE.Group();
  book.add(toonMesh(GEO.box, '#8a5a3c', { position: [0, 0, -0.02], scale: [0.68, 0.36, 0.03], outline: 0.012, shadow: false }));
  book.add(new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.32), new THREE.MeshBasicMaterial({ map: cookbookTexture() })));
  book.position.set(0, 0.36, 0.66);
  book.rotation.x = -0.3;
  pals.g3.root.add(book);
  // 도끼 · 바구니(g0 · g2 · g4 는 도끼, g1 · g3 은 바구니): 간수와 요리사는 감옥에서 책을 보는 동안만 책을 들고, 오데가 창살을 휠 때부터는 도끼 · 바구니.
  // 팔이 아니라 몸에 단다(팔에 달았더니 깡충 · 만세에 팔과 같이 돌아 도끼가 머리를 뚫었다). 손이 짧아 옆구리에 붙여 들면 쥔 것처럼 보인다
  const tools = {};
  GOBS.forEach((k, i) => {
    const c = pals[k];
    if (i % 2 === 0) { const t = buildAxe(); t.position.set(0.46, 0.25, 0.1); t.rotation.set(0.08, 0, -0.45); c.inner.add(t); tools[k] = t; }
    else { const t = buildBasket(); t.scale.setScalar(0.95); t.position.set(-0.52, 0.12, 0.08); c.inner.add(t); tools[k] = t; }
  });
  /** 간수 · 요리사가 책을 들었는지(아니면 도끼 · 바구니). */
  const holdBooks = (on) => { guardBook.visible = book.visible = on; tools.g2.visible = tools.g3.visible = !on; };
  // 붙잡혔을 때: 우리 몸에 감긴 밧줄
  const ropeRing = () => {
    const g = new THREE.Group();
    [0.32, 0.5].forEach((y) => g.add(toonMesh(new THREE.TorusGeometry(0.4, 0.035, 6, 20), ROPE, { position: [0, y, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 0.9, 1], outline: 0.01, shadow: false })));
    g.visible = false;
    return g;
  };
  const ropes = {};
  ['chiikawa', 'hachiware', 'usagi'].forEach((k) => { ropes[k] = ropeRing(); pals[k].root.add(ropes[k]); });
  const charOf = (k) => (k === 'me' ? me : pals[k]);

  let place = 'forest', shot = SHOTS.wide, snapNext = true, shakeT = 0, mood = 'meet', pryP = 0, guardMark = null, guardYaw = null;
  const anims = {}, lifts = {}, walking = new Set();
  let tweens = [];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const tween = (dur, step, end) => { tweens.push({ t: 0, dur, step, end }); };
  const faceOf = (face, x, z) => (face === 'cam' || face === 'out' ? [x, z + 5] : face === 'ode' ? [ode.root.position.x, ode.root.position.z] : face === 'mid' ? PLACES[place].mid
    : face === 'hole' ? HOLE : face === 'cell' ? [x, -1] : face);

  function placeChar(k, x, z, anim, face) {
    const c = charOf(k);
    if (!c) return;
    c.root.position.set(x, 0, z);
    c.root.rotation.set(0, 0, 0);
    const f = faceOf(face, x, z);
    c.root.rotation.y = Math.atan2(f[0] - x, f[1] - z);
    c.root.visible = true;
    anims[k] = anim;
    lifts[k] = 0;
    walking.delete(k);
  }
  /** 흙먼지가 튀고 화면이 흔들린다. */
  function rumble(x, z, power = 1) {
    shakeT = 0.9 * power;
    dust.forEach((m, i) => { const a = i * 0.7; m.visible = true; m.userData.v = new THREE.Vector3(Math.cos(a) * 1.4 * power, (2.2 + (i % 3) * 0.8) * power, Math.sin(a) * 1.4 * power); m.position.set(x, 0.1, z); });
  }
  /** k 를 to 까지 걸려 보낸다(길목 via 를 거쳐서, dur 초). 다 오면 몸짓 end. */
  function walkTo(k, to, dur, via = null, end = 'idle') {
    const c = charOf(k);
    if (!c) return;
    const from = [c.root.position.x, c.root.position.z], pts = via ? [from, via, to] : [from, to];
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), total = lens.reduce((a, b) => a + b, 0) || 1;
    anims[k] = 'walk';
    walking.add(k);
    tween(dur, (u) => {
      let d = u * total, i = 0;
      while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
      const a = pts[i], b = pts[i + 1], v = lens[i] ? Math.min(1, d / lens[i]) : 1;
      c.root.position.x = lerp(a[0], b[0], v); c.root.position.z = lerp(a[1], b[1], v);
      c.root.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    }, () => { walking.delete(k); anims[k] = end; });
  }
  /** 땅굴 크기(0 ~ 1): 구멍이 넓어지고 옆에 흙이 쌓인다. */
  function setHole(p) {
    const r = 0.06 + p * 0.5;
    hole.scale.set(r, r * 0.8, 1);
    hole.visible = p > 0;
    dirt.forEach((m, i) => { const k = clamp01(p * 1.6 - i * 0.25); m.visible = k > 0; m.scale.set(0.08 + k * 0.2, 0.05 + k * 0.14, 0.08 + k * 0.2); });
  }

  const api = {
    scene,
    camera,
    light,
    /** 새로 들어왔다: 내 생김새 look. 숲속 빈터에서 버섯을 먹는 오데 앞(나 혼자)부터. */
    start(look) {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      Object.values(me.props || {}).flat().forEach((m) => { m.visible = false; });
      ropes.me = ropeRing();
      me.root.add(ropes.me);
      scene.add(me.root);
      tweens = []; shakeT = 0; pryP = 0; guardMark = null; guardYaw = null;
      for (const k of KINDS) { const c = charOf(k); if (c) { c.root.visible = false; wearStripes(c, false); } }
      Object.values(ropes).forEach((g) => { g.visible = false; });
      showTag(ode, 'rope', false);
      api.repairBars();
      setHole(0);
      showTag(ode, 'roar', false);
      api.setPlace('forest');
      api.setMood('meet');
      shot = SHOTS.wide; snapNext = true;
    },
    /** 카메라: wide · ode · goblins · capture · cell · cook · dig · bars · fight · momonga. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.wide; if (snap) snapNext = true; },
    /** 장소: 'forest' 숲속 빈터 · 'jail' 고블린 감옥(배경색 · 안개 · 빛도 바꾼다). */
    setPlace(p) {
      place = p;
      const P = PLACES[p];
      forest.visible = p === 'forest';
      jail.visible = p === 'jail';
      scene.background.set(P.bg);
      scene.fog.color.set(P.bg); scene.fog.near = P.near; scene.fog.far = P.far;
      hemi.intensity = P.hemi;
      light.setRGB(...P.light);
      holdBooks(p === 'jail'); // 고블린들의 책은 감옥에서만
    },
    /** 서는 자리 · 몸짓(그 장면에 없는 사람은 숨긴다). 오데는 숲에서 버섯을 먹을 때만 앉는다. */
    setMood(m) {
      mood = m;
      guardYaw = null;
      if (m === 'pry' || m === 'fight') holdBooks(false); // 오데가 창살을 휘기 시작하면 책은 내려놓고 도끼 · 바구니
      const spots = SPOTS[m] || {};
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c) continue;
        if (!spots[k]) { c.root.visible = false; continue; }
        placeChar(k, ...spots[k]);
      }
      const sitting = ['meet', 'arrive', 'share', 'goblins'].includes(m);
      setOdeSit(ode, sitting);
      shroom.visible = sitting;
      shroom.position.set(ODE_SIT[0], 0.3, ODE_SIT[1] + 0.74);
      shroom.scale.setScalar(1.25);
    },
    get mood() { return mood; },
    /** 그 사람의 몸짓을 바꾼다. */
    pose(k, anim) { if (charOf(k)) anims[k] = anim; },
    /** 치이카와 · 하치와레 · 우사기가 뒤에서 걸어 들어온다(arrive 자리까지 와서 오데를 본다). */
    palsArrive() {
      mood = 'arrive';
      ['chiikawa', 'hachiware', 'usagi'].forEach((k, i) => {
        const [x, z, anim, face] = SPOTS.arrive[k];
        placeChar(k, x + (i - 1) * 0.6, 6.5 + i * 0.4, 'walk', 'cam');
        walkTo(k, [x, z], 2.2 + i * 0.25, null, anim);
        tween(2.25 + i * 0.25, () => {}, () => { const c = charOf(k), f = faceOf(face, x, z); c.root.rotation.y = Math.atan2(f[0] - x, f[1] - z); });
      });
    },
    /** 덤불 여기저기서 고블린들이 하나씩 쏙쏙 튀어나와 빙 둘러싼다. */
    goblinsOut() {
      api.setMood('goblins');
      GOBS.forEach((k, i) => {
        lifts[k] = -1.3;
        tween(0.25 + i * 0.32, () => {}, () => tween(0.45, (u) => { lifts[k] = -1.3 * (1 - ease(u)) + Math.sin(u * Math.PI) * 0.35; }, () => { lifts[k] = 0; anims[k] = 'hop'; }));
      });
    },
    /** 휙휙: 오데는 밧줄에 꽁꽁(일으켜 세운다), 우리 넷도 밧줄에. */
    capture() {
      api.setMood('caught');
      showTag(ode, 'rope', true);
      Object.values(ropes).forEach((g) => { g.visible = true; });
      rumble(0, 0.4, 0.5);
    },
    /** 줄무늬 죄수복 · 모자(감옥에 들어온 뒤로 — 밧줄은 푼다). */
    dress(on) {
      ['me', 'chiikawa', 'hachiware', 'usagi', 'ode', 'momonga'].forEach((k) => { const c = charOf(k); if (c) wearStripes(c, on); });
      showTag(ode, 'rope', false);
      Object.values(ropes).forEach((g) => { g.visible = false; });
    },
    /** 땅 파기 진행(0 ~ 1). */
    setDig(p) { setHole(p); },
    /** 땅을 파는 셋: on 이면 박박, 아니면 시치미 떼고 가만히(간수가 고개를 들었다). */
    digging(on) { ['me', 'chiikawa', 'hachiware'].forEach((k) => { anims[k] = on ? 'dig' : 'idle'; }); },
    /** 간수 고블린: 'read' 요리책을 본다 · 'warn' 고개를 갸웃(…?) · 'look' 고개를 들어 감옥을 본다(…!) · 'caught' 들켰다(펄쩍) · null(표시 없이 요리책). */
    guard(st) {
      anims.g2 = st === 'look' ? 'idle' : st === 'warn' ? 'think' : st === 'caught' ? 'hop' : 'read';
      guardMark = st === 'warn' ? '…?' : st === 'look' ? '…!' : st === 'caught' ? '!?' : st === 'read' ? '…' : null;
      if (mood === 'dig') guardYaw = st === 'look' || st === 'caught' ? GUARD_YAW.look : st === 'warn' ? GUARD_YAW.warn : GUARD_YAW.read;
      if (st === 'caught') ['me', 'chiikawa', 'hachiware'].forEach((k) => { anims[k] = 'cower'; });
    },
    /** 푹! 땅굴이 바깥까지 뚫렸다(흙먼지 · 다들 잠깐 깡충). */
    holeThrough() {
      setHole(1);
      rumble(HOLE[0], HOLE[1], 0.35);
      ['me', 'chiikawa', 'hachiware'].forEach((k) => { anims[k] = 'hop'; });
      tween(1.2, () => {}, () => ['me', 'chiikawa', 'hachiware'].forEach((k) => { if (anims[k] === 'hop') anims[k] = 'idle'; })); // 잠깐만 깡충
    },
    /** 우리 넷이 하나씩 땅굴로 쏙쏙(구멍까지 가서 쑥 들어가 사라진다). */
    intoHole() {
      ['me', 'chiikawa', 'hachiware', 'usagi'].forEach((k, i) => {
        tween(0.05 + i * 0.6, () => {}, () => {
          walkTo(k, [HOLE[0] + 0.06 * (i - 1.5), HOLE[1] + 0.12], 0.8, null, 'hop');
          tween(0.85, () => {}, () => tween(0.45, (u) => { lifts[k] = -1.25 * ease(u); }, () => { charOf(k).root.visible = false; lifts[k] = 0; }));
        });
      });
    },
    /** 오데가 정문 창살을 휜다(0 ~ 1): 가운데 네 줄이 양옆으로 활처럼 벌어진다(위아래 끝은 그대로). */
    pry(p) {
      pryP = p;
      midBars.forEach((b, i) => b.userData.bend(p * BENDS[i]));
      if (Math.random() < p * 0.15) shakeT = Math.max(shakeT, 0.15);
    },
    /** 끼기기긱: 다 휘었다(창살은 휜 채 — 오데가 그 틈으로 나간다). */
    bendDone() {
      api.pry(1);
      anims.ode = 'cheer';
      anims.g2 = 'hop';
      guardMark = '!?';
      rumble(PRY_X, BARS_Z + 0.4, 0.7);
    },
    /** 고친 쇠창살 · 메운 땅굴(처음 · 모몽가가 갇힌 저녁). */
    repairBars() {
      pryP = 0;
      setHole(0);
      midBars.forEach((b) => b.userData.bend(0));
    },
    /** 오데의 버럭: 입이 네모나게 쩍 벌어져 이가 보인다(창살을 휠 때 · 고블린들과 싸울 때). */
    roar(on) { showTag(ode, 'roar', on); },
    /** 오데가 휜 창살 틈으로 비집고 나와 감옥 밖에 버티고 선다. */
    odeOut() {
      walkTo('ode', FIGHT, 1.5, [PRY_X, BARS_Z + 0.2], 'idle');
      tween(1.55, () => {}, () => { const c = ode.root; c.rotation.y = 0; });
    },
    /** 고블린들이 양옆에서 우르르 몰려와 오데를 둘러싼다(책은 내려놓는다). */
    goblinsRush() {
      mood = 'fight';
      holdBooks(false);
      guardMark = null;
      GOBS.forEach((k, i) => {
        const [x, z, anim, face] = SPOTS.fight[k];
        placeChar(k, x < 0 ? -7.5 : 7.5, z + 0.6 + (i % 2) * 0.8, 'walk', face); // 화면 양옆 밖에서(카메라 뒤에서 오면 렌즈 앞을 스쳐 지나갔다)
        walkTo(k, [x, z], 1.1 + i * 0.15, null, anim);
        tween(1.15 + i * 0.15, () => {}, () => { const c = charOf(k), f = faceOf(face, x, z); c.root.rotation.y = Math.atan2(f[0] - x, f[1] - z); });
      });
    },
    /** n 번째로 덤벼든 고블린을 오데가 붙잡아(번쩍) 휙 던진다 → 멀리 데굴, 뻗는다. */
    throwGoblin(n) {
      const k = THROW[n % THROW.length], c = charOf(k);
      if (!c || !c.root.visible) return;
      const o = ode.root.position, sd = c.root.position.x < o.x ? -1 : 1;
      const grab = [o.x + sd * 0.8, o.z + 0.35], land = [sd * (4.2 + n * 0.4), 7.4 + n * 0.6];
      walkTo(k, grab, 0.3, null, 'flail');
      tween(0.32, () => {}, () => {
        anims.ode = 'cheer';
        tween(0.22, (u) => { lifts[k] = ease(u) * 1.3; }, () => {
          const from = [c.root.position.x, c.root.position.z];
          tween(0.8, (u) => {
            c.root.position.x = lerp(from[0], land[0], u); c.root.position.z = lerp(from[1], land[1], u);
            lifts[k] = 1.3 * (1 - u) + Math.sin(u * Math.PI) * 2.2;
            c.root.rotation.z = u * Math.PI * 2 * sd;
          }, () => { lifts[k] = 0; c.root.rotation.z = 0; anims[k] = 'faint'; anims.ode = 'idle'; shakeT = Math.max(shakeT, 0.25); });
        });
      });
    },
    /** 고블린 하나가 콩 하고 덤볐다 물러난다(오데가 휘청). */
    goblinBonk() {
      const k = 'g4', c = charOf(k);
      if (!c || !c.root.visible || anims[k] === 'faint') return;
      const o = ode.root.position, home = [c.root.position.x, c.root.position.z];
      walkTo(k, [o.x + 0.25, o.z + 0.8], 0.25, null, 'flail');
      tween(0.27, () => {}, () => { anims.ode = 'hurt'; shakeT = Math.max(shakeT, 0.2); walkTo(k, home, 0.35, null, 'hop'); });
      tween(0.9, () => {}, () => { if (anims.ode === 'hurt') anims.ode = 'idle'; });
    },
    /** 남은 고블린은 허둥지둥 도망친다. */
    goblinsFlee() {
      GOBS.forEach((k, i) => {
        const c = charOf(k);
        if (!c || !c.root.visible || anims[k] === 'faint') return;
        walkTo(k, [c.root.position.x + (i % 2 ? 3 : -3), 12], 1.6, null, 'idle');
        tween(1.65, () => {}, () => { c.root.visible = false; });
      });
      anims.ode = 'cheer';
    },
    /** 숲길에서 오데가 숲 안쪽으로 성큼성큼(보이지 않을 때까지). */
    odeLeave() {
      walkTo('ode', [-2.6, -9.5], 4.2, null, 'idle');
      tween(4.25, () => {}, () => { ode.root.visible = false; });
    },
    /** 움직임(걷기 · 고블린 · 창살 · 달리기)이 아직 끝나지 않았는지. */
    get busy() { return tweens.length > 0; },
    /** 화면 글(간수 고블린 머리 위 … · …? · …!). */
    labels() {
      if (!guardMark || place !== 'jail' || !pals.g2.root.visible) return [];
      const g = pals.g2.root.position;
      return [{ id: 'ode-guard', x: g.x, y: 1.5, z: g.z, text: guardMark, kind: 'bubble' }];
    },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 64 : 42;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      const live = tweens;
      tweens = [];
      for (const w of live) {
        w.t += dt;
        const u = clamp01(w.t / w.dur);
        w.step(u);
        if (u >= 1) { if (w.end) w.end(); } else tweens.push(w);
      }
      dust.forEach((m) => {
        if (!m.visible) return;
        m.userData.v.y -= 9 * dt;
        m.position.addScaledVector(m.userData.v, dt);
        if (m.position.y < 0) m.visible = false;
      });
      flames.forEach((m, i) => { m.scale.y = 0.3 + Math.sin(t * 9 + i * 2) * 0.06; });
      // 간수가 몸을 돌린다(땅 파기 — 요리책 ↔ 감옥)
      if (guardYaw !== null) { const r = pals.g2.root.rotation, d = guardYaw - r.y; r.y += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 7); }
      // 몸짓(걸을 때는 다리를 빨리)
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c || !c.root.visible) continue;
        const anim = anims[k] || 'idle';
        c.root.position.y = (anim === 'sit' ? SIT_LIFT : 0) + (lifts[k] || 0);
        animateChibi(c, anim, t, { phase: walking.has(k) ? t * 11 : k.length * 0.7, power: k === 'ode' ? pryP : 0 });
      }
      // 카메라(땅이 울리면 덜컹)
      const sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot, kk = Math.min(1, dt * 2.4);
      tmpPos.set(...sh.pos); tmpLook.set(...sh.look);
      if (snapNext) { camPos.copy(tmpPos); camLook.copy(tmpLook); snapNext = false; }
      else { camPos.lerp(tmpPos, kk); camLook.lerp(tmpLook, kk); }
      camera.position.copy(camPos);
      if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); camera.position.x += Math.sin(t * 60) * 0.06 * shakeT; camera.position.y += Math.cos(t * 50) * 0.05 * shakeT; }
      camera.lookAt(camLook);
    }
  };
  return api;
}
