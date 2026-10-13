import * as THREE from 'three';
import { toonMesh, celMaterial, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { roadDist } from '../core/layout.js';

/**
 * 사이드스토리 '위스키 봉봉'(stories/bonbon.js)의 무대.
 * 원작: 숲에서 따도 따도 또 열리는 신기한 초콜릿(위스키 봉봉)을 먹고 셋이 취한다 → 산책하던 포셰트 갑옷 씨가 발견 →
 * 덩굴을 당기자 머리에서 덩굴이 자란 새하얀 큰 뱀이 나와 셋을 삼킨다 → 갑옷 씨가 너클 더스터로 구한다.
 * - buildBonbonVine(): 동그란 초콜릿이 주렁주렁 열린 덩굴 덤불(마을 숲길 옆 소품 · 장면 속 큰 뱀 머리 위 덩굴).
 * - createBonbonFront(scene, village): 서쪽 숲길 옆 덩굴(이야기를 받은 동안만 보인다) → { spot, visible, update }
 * - createBonbonGlade(): 숲속 빈터 장면(클럽 · 무대처럼 따로 그린다).
 */
const LEAF = ['#5f9e4f', '#6fb05a', '#4f8a44'];
const CHOCO = '#6b3f26', CHOCO_TOP = '#8a5636';

/** 초콜릿 덩굴 덤불(아래가 땅, 위로 잎 · 둘레에 초콜릿). → { group, bonbons, pick(), update(dt, t) } */
export function buildBonbonVine() {
  const group = new THREE.Group();
  const leaves = [];
  [[0, 0.32, 0, 0.34], [-0.32, 0.22, 0.08, 0.26], [0.33, 0.24, 0.05, 0.27], [0.05, 0.6, -0.05, 0.26], [-0.18, 0.5, 0.2, 0.2],
    [0.22, 0.52, 0.18, 0.2], [-0.05, 0.18, 0.3, 0.22], [0.12, 0.2, -0.3, 0.24], [-0.25, 0.42, -0.22, 0.2]].forEach(([x, y, z, r], i) => {
    const m = toonMesh(GEO.sphere, LEAF[i % 3], { position: [x, y, z], scale: [r, r * 0.9, r], outline: 0.02, shadow: false });
    m.userData.base = m.position.clone();
    group.add(m);
    leaves.push(m);
  });
  // 동그랗게 말린 덩굴손
  [[-0.42, 0.62, 0.1, 0.4], [0.44, 0.66, -0.05, -0.5], [0.05, 0.86, 0.1, 2.2]].forEach(([x, y, z, rz]) => {
    group.add(toonMesh(new THREE.TorusGeometry(0.12, 0.016, 6, 16, Math.PI * 1.4), '#4f7a3a', { position: [x, y, z], rotation: [0, 0.4, rz], outline: false, shadow: false }));
  });
  // 초콜릿: 잎 둘레에 짧은 꼭지로 매달린다(위가 살짝 밝다)
  const bonbons = [];
  for (let i = 0; i < 10; i++) {
    const a = i * 2.39, r = 0.42 + (i % 3) * 0.06, y = 0.16 + (i % 4) * 0.13;
    const b = new THREE.Group();
    b.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    b.add(toonMesh(GEO.sphere, CHOCO, { scale: [0.1, 0.094, 0.1], outline: 0.012, shadow: false }));
    b.add(toonMesh(GEO.sphere, CHOCO_TOP, { position: [0, 0.042, 0], scale: [0.07, 0.034, 0.07], outline: false, shadow: false }));
    b.add(toonMesh(GEO.cylinder, '#4f7a3a', { position: [0, 0.085, 0], scale: [0.01, 0.06, 0.01], outline: false, shadow: false })); // 꼭지(초콜릿 위에서 잎 쪽으로)
    b.userData.grow = 1;
    group.add(b);
    bonbons.push(b);
  }
  let nextPick = 0;
  return {
    group,
    bonbons,
    /** 하나 딴다: 작아졌다가 그 자리에 금세 다시 몽글몽글 열린다(따도 따도 또 열린다). */
    pick() { const b = bonbons[nextPick++ % bonbons.length]; b.userData.grow = 0; },
    update(dt, t) {
      leaves.forEach((m, i) => { m.position.y = m.userData.base.y + Math.sin(t * 1.6 + i) * 0.012; });
      for (const b of bonbons) {
        if (b.userData.grow < 1) b.userData.grow = Math.min(1, b.userData.grow + dt * 0.9);
        const g = b.userData.grow, e = g * g * (3 - 2 * g);
        b.scale.setScalar(0.05 + e * 0.95 + Math.sin(g * Math.PI) * 0.15); // 다시 열릴 때 톡 부풀었다 자리 잡는다
      }
    }
  };
}

/** 서쪽 숲길 옆의 초콜릿 덩굴(이야기를 받은 동안만 보인다). spot: 그 앞(카메라 쪽) 빈 땅. */
export function createBonbonFront(scene, village) {
  const tries = [[-40, -6.5], [-42, -7.2], [-38.5, -6], [-44, -8], [-40, -9], [-46, -9.5]];
  const [x, z] = tries.find(([tx, tz]) => village.isFree(tx, tz, 1.4, true) && roadDist(tx, tz) > 1.8) || tries[0];
  const vine = buildBonbonVine();
  vine.group.position.set(x, 0, z);
  vine.group.scale.setScalar(1.35);
  vine.group.visible = false;
  scene.add(vine.group);
  return {
    spot: { x, z: z + 1.8 },
    get visible() { return vine.group.visible; },
    set visible(v) { vine.group.visible = !!v; },
    update(dt, t) { if (vine.group.visible) vine.update(dt, t); }
  };
}

// ---------- 숲속 빈터 장면 ----------
const BUSH = [0, 0, -1.4]; // 덩굴 덤불(큰 뱀 머리가 이 밑에 숨어 있다)
const HEAD_S = 1.6; // 큰 뱀 머리 크기(머리 위 덩굴도 같이 커진다)
const HIDE = new THREE.Vector3(0, -0.82, -1.4); // 숨은 큰 뱀 머리(수평으로 묻혀 덩굴만 땅 위로 — 덤불처럼)
const HIDE_LOOK = new THREE.Vector3(0, -0.82, 3);
const UP = new THREE.Vector3(0.1, 2.2, -1.3); // 솟아오른 큰 뱀 머리
const BASE = [new THREE.Vector3(1.1, -1.6, -3.4), new THREE.Vector3(1.0, -0.1, -3.1)]; // 몸통이 땅에서 나오는 곳
const KINDS = ['me', 'chiikawa', 'hachiware', 'usagi', 'pochette'];
const SIT_LIFT = 0.12;
// 장면마다 서는 자리 [x, z, 몸짓, 바라보는 곳('bush' | 'cam' | 'snake' | [x, z])]
const SPOTS = {
  eat: { me: [-1.5, -1.65, 'idle', [0, -0.2]], chiikawa: [-1.0, -1.0, 'shy', [0, -0.2]], hachiware: [1.0, -1.0, 'look', [0, -0.2]], usagi: [1.5, -1.65, 'hop', [0, -0.2]] }, // 덩굴 양옆(가운데는 비우고, 얼굴이 보이게 앞쪽을 본다)
  drum: { me: [-1.6, 0.5, 'clap', 'cam'], chiikawa: [-0.55, 0.35, 'clap', 'cam'], hachiware: [0.45, 0.25, 'talk', 'cam'], usagi: [1.45, 0.45, 'clap', 'cam'] },
  tipsy: { me: [-1.95, 0.6, 'sway', 'cam'], chiikawa: [-0.95, 0.4, 'sway', 'cam'], hachiware: [0.3, 0.75, 'roll', [5, 0.75]], /* 옆을 보고 벌러덩: 카메라에 옆모습으로 눕는다 */ usagi: [1.75, 0.5, 'dance', 'cam'] },
  // 취해서 비틀거리는 장면은 서로 겹치지 않게 넉넉히(0.9 이상) 띄운다
  found: { me: [-0.75, 0.5, 'sway', 'cam'], chiikawa: [0.15, 0.35, 'sway', 'cam'], hachiware: [1.05, 0.45, 'sway', 'cam'], usagi: [2.0, 0.35, 'pose', 'cam'], pochette: [-1.95, 0.55, 'idle', [0.5, 0.45]] }, // 갑옷 씨는 같은 줄 옆에서 넷을 본다
  // 갑옷 씨는 덩굴을 당기다 깜짝 놀라 뒤로 물러선 자리
  snake: { me: [-1.25, 0.75, 'sway', 'snake'], chiikawa: [-0.3, 0.25, 'sway', 'snake'], hachiware: [0.7, 0.6, 'sway', 'snake'], usagi: [1.7, 0.45, 'sway', 'snake'], pochette: [-1.9, -0.2, 'hurt', 'snake'] },
  fistUp: { me: [-1.6, 1.1, 'sway', 'snake'], hachiware: [-0.3, 0.6, 'train', 'cam'], usagi: [0.85, 0.6, 'train', 'cam'], pochette: [-1.9, -0.2, 'hurt', 'snake'] }, // 큰 뱀을 등지고 취권 자세(얼굴이 보이게)
  fist: { me: [-1.6, 1.1, 'sway', 'snake'], hachiware: [-0.3, 0.6, 'train', [0.85, 0.6]], usagi: [0.85, 0.6, 'train', [-0.3, 0.6]], pochette: [-1.9, -0.2, 'hurt', 'snake'] }, // …서로 마주 보고 장난치기
  fight: { me: [0.45, 0.85, 'train', 'snake'], pochette: [-0.55, 0.65, 'idle', 'snake'] },
  escape: { me: [-1.3, 2.55, 'idle', 'cam'], chiikawa: [-4.0, 2.85, 'sway', 'cam'], hachiware: [-2.2, 2.9, 'sway', 'cam'], usagi: [-4.95, 2.6, 'dance', 'cam'], pochette: [-3.1, 2.2, 'idle', 'cam'] }
};
// 뱀이 뱉어 낸 친구가 내려앉는 자리
const LAND = { chiikawa: [-2.3, 0.3], hachiware: [-1.5, 1.0], usagi: [2.1, 0.5] }; // 큰 뱀을 가리지 않게 양옆으로
const SHOTS = {
  wide: { pos: [0, 2.6, 6.4], look: [0, 0.8, -0.6], portrait: { pos: [0, 3.4, 9.4], look: [0, 0.9, -0.6] } },
  vine: { pos: [0, 1.55, 2.3], look: [0, 0.55, -1.4], portrait: { pos: [0, 2.0, 4.2], look: [0, 0.6, -1.4] } },
  drum: { pos: [0, 1.5, 4.5], look: [0, 0.6, 0.3], portrait: { pos: [0, 2.0, 7.2], look: [0, 0.7, 0.3] } },
  found: { pos: [0.05, 1.9, 6.4], look: [0, 0.95, 0.4], portrait: { pos: [0, 2.6, 10.2], look: [0, 1.0, 0.4] } },
  pull: { pos: [-1.6, 3.7, 2.4], look: [-0.6, 0.6, -1.1], portrait: { pos: [-2.0, 4.6, 4.0], look: [-0.6, 0.7, -1.1] } }, // 넷의 머리 위로 내려다보며: 덩굴을 당기는 갑옷 씨
  snake: { pos: [0.6, 2.3, 8.0], look: [0.1, 1.7, -0.9], portrait: { pos: [0.6, 3.0, 11.4], look: [0.1, 1.9, -0.9] } },
  fist: { pos: [0.3, 1.9, 5.4], look: [0.3, 1.35, -0.6], portrait: { pos: [0.3, 2.5, 8.6], look: [0.3, 1.6, -0.6] } }, // 앞에서: 취권 자세 · 장난치는 둘, 뒤로 큰 뱀
  fight: { pos: [2.4, 2.2, 6.6], look: [-0.1, 1.75, -0.8], portrait: { pos: [2.7, 2.8, 9.6], look: [-0.1, 1.9, -0.8] } },
  escape: { pos: [-3.0, 1.7, 7.4], look: [-3.1, 0.8, 2.6], portrait: { pos: [-3.1, 2.3, 10.8], look: [-3.1, 0.9, 2.6] } }
};
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const propsOf = (c) => new Set(Object.values(c.props || {}).flat());
const hideProps = (c) => propsOf(c).forEach((m) => { m.visible = false; });
const partVolume = (m) => m.scale.x * m.scale.y * m.scale.z;

/** 마디(pivot) 안에서 가장 큰 부품의 상자(마디 좌표). */
function pivotBox(pivot) {
  const meshes = pivot.children.filter((m) => m.isMesh && m.geometry);
  if (!meshes.length) return null;
  const big = meshes.reduce((a, m) => (partVolume(m) > partVolume(a) ? m : a));
  big.updateMatrix();
  big.geometry.computeBoundingBox();
  return big.geometry.boundingBox.clone().applyMatrix4(big.matrix);
}
/** 취해서 빨개진 볼(얼굴 앞 양쪽, 처음엔 안 보인다). → 재질 목록(진하기는 opacity) */
function addFlush(c) {
  const head = c.pivots && c.pivots.head, box = head && pivotBox(head);
  if (!box) return [];
  const ctr = box.getCenter(new THREE.Vector3()), half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  return [-1, 1].map((sd) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#ff4f66', transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
    m.scale.set(half.x * 0.24, half.y * 0.13, 1);
    m.position.set(ctr.x + sd * half.x * 0.5, ctr.y - half.y * 0.2, ctr.z + half.z * 0.86 + 0.012);
    m.rotation.y = sd * 0.5;
    head.add(m);
    return mat;
  });
}
/** 포셰트 갑옷 씨의 너클 더스터(오른손에 금빛 고리). */
function addKnuckle(c) {
  const arm = c.pivots && c.pivots.armR, box = arm && pivotBox(arm);
  if (!box) return null;
  const g = new THREE.Group();
  g.position.set((box.min.x + box.max.x) / 2, box.min.y + 0.02, (box.min.z + box.max.z) / 2 + 0.04);
  [-0.05, 0, 0.05].forEach((x) => g.add(toonMesh(new THREE.TorusGeometry(0.035, 0.014, 6, 14), '#f2c84b', { position: [x, 0, 0.06], outline: 0.006, shadow: false })));
  g.add(toonMesh(GEO.box, '#e0b43c', { position: [0, -0.03, 0.06], scale: [0.16, 0.025, 0.03], outline: 0.006, shadow: false }));
  g.visible = false;
  arm.add(g);
  return g;
}

/** 새하얀 큰 뱀: 머리(위아래 턱 · 까만 눈 · 머리 위 초콜릿 덩굴) + 동그란 마디를 이은 몸통. */
function buildSerpent(scene) {
  const head = new THREE.Group();
  const white = '#f6f4ee';
  const flat = celMaterial(white, { flat: true }); // 새하얀 뱀: 그늘 없이(원작처럼 하얗게, 테두리만)
  head.add(toonMesh(GEO.sphere, white, { material: flat, position: [0, 0.06, 0], scale: [0.62, 0.42, 0.74], outline: 0.025, shadow: false }));
  const jaw = new THREE.Group(); // 아래턱: 뒤쪽을 축으로 벌어진다
  jaw.position.set(0, -0.1, -0.32);
  jaw.add(toonMesh(GEO.sphere, white, { material: flat, position: [0, -0.06, 0.34], scale: [0.56, 0.17, 0.66], outline: 0.022, shadow: false }));
  jaw.add(toonMesh(GEO.sphere, '#f19aae', { position: [0, 0.04, 0.34], scale: [0.46, 0.06, 0.56], outline: false, shadow: false })); // 입속
  head.add(jaw);
  head.add(toonMesh(GEO.sphere, '#3a2a2a', { position: [0, -0.02, 0.2], scale: [0.4, 0.05, 0.45], outline: false, shadow: false })); // 위턱 안쪽(입을 벌리면 보인다)
  [-1, 1].forEach((sd) => { // 까만 눈(머리 표면 z ≈ 0.62 위로 살짝 나오게) · 눈빛
    head.add(toonMesh(GEO.sphere, '#2a2224', { position: [sd * 0.3, 0.17, 0.6], scale: [0.07, 0.08, 0.05], outline: false, shadow: false }));
    head.add(toonMesh(GEO.sphere, '#ffffff', { position: [sd * 0.28, 0.2, 0.645], scale: [0.022, 0.022, 0.012], outline: false, shadow: false }));
  });
  const vine = buildBonbonVine();
  vine.group.position.set(0, 0.42, -0.05);
  head.add(vine.group);
  head.scale.setScalar(HEAD_S); // 머리 위 덩굴에 얼굴이 묻히지 않게 머리를 크게
  head.position.copy(HIDE);
  scene.add(head);
  const ring = celMaterial('#ebe7dc', { flat: true });
  const body = Array.from({ length: 18 }, (_, i) => {
    const m = toonMesh(GEO.sphere, white, { material: i % 2 ? flat : ring, outline: 0.02, shadow: false }); // 마디마다 살짝 다른 흰색
    scene.add(m);
    return m;
  });
  return { head, jaw, vine, body };
}

export function createBonbonGlade() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe8d2');
  scene.fog = new THREE.Fog('#cfe8d2', 11, 26);
  scene.add(new THREE.HemisphereLight(0xfffbe8, 0x6f8a58, 1.5));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  const light = new THREE.Color(1, 0.98, 0.92);
  const toon = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); scene.add(m); return m; };

  // ---------- 숲속 빈터: 풀밭 · 흙 · 둘레의 나무 · 덤불 · 버섯 ----------
  // GEO.cylinder 는 바닥이 0 · 높이 1 이다(위치 y 가 밑면). 겹치는 판은 윗면 높이를 벌려 깜빡이지 않게
  toon(GEO.cylinder, '#8cc56f', { position: [0, -0.1, 0], scale: [14, 0.1, 14], outline: false }); // 풀밭(윗면 0)
  toon(GEO.cylinder, '#98ca78', { position: [0, 0, 0.2], scale: [3.6, 0.02, 3.0], outline: false }); // 빈터 가운데(윗면 0.02)
  toon(GEO.cylinder, '#c9b48a', { position: [-3.4, 0, 3.2], rotation: [0, 0.5, 0], scale: [1.1, 0.045, 2.6], outline: false }); // 숲 밖으로 가는 흙길(윗면 0.045)
  const trees = [[-5.2, -3.6], [-3.4, -5.6], [-1.2, -6.4], [1.4, -6.0], [3.6, -5.2], [5.4, -3.2], [6.4, -0.4], [-6.4, -0.8], [-6.8, 2.2], [6.6, 2.6], [-0.2, -8.2], [3.2, -8.0], [-3.8, -8.4]];
  trees.forEach(([x, z], i) => {
    const h = 2.2 + (i % 3) * 0.5;
    toon(GEO.cylinder, '#8a6244', { position: [x, 0, z], scale: [0.22, h, 0.22], outline: 0.02 }); // 줄기: 땅에서 h 까지
    toon(GEO.sphere, LEAF[i % 3], { position: [x, h + 0.5, z], scale: [1.25, 1.05, 1.25], outline: 0.03 });
    toon(GEO.sphere, LEAF[(i + 1) % 3], { position: [x + 0.5, h + 0.05, z + 0.3], scale: [0.8, 0.7, 0.8], outline: 0.025 });
  });
  [[-2.6, -2.4], [2.7, -2.6], [4.2, -1.0], [-4.3, -1.6]].forEach(([x, z], i) => toon(GEO.sphere, LEAF[i % 3], { position: [x, 0.3, z], scale: [0.7, 0.5, 0.6], outline: 0.02 }));
  [[-1.9, -1.2], [2.0, -0.6], [3.0, 1.2], [-2.8, 0.6]].forEach(([x, z]) => {
    toon(GEO.cylinder, '#fff4e4', { position: [x, 0, z], scale: [0.05, 0.2, 0.05], outline: 0.008 });
    toon(GEO.sphere, '#e56b5a', { position: [x, 0.22, z], scale: [0.14, 0.08, 0.14], outline: 0.01 });
  });
  for (let i = 0; i < 26; i++) { // 풀 포기
    const a = i * 2.17, r = 2.4 + (i % 5) * 0.9;
    toon(GEO.cone, '#6fae55', { position: [Math.sin(a) * r, 0.1, Math.cos(a) * r - 0.6], scale: [0.06, 0.2, 0.06], outline: false });
  }
  // 땅이 들썩일 때 흩어지는 흙덩이
  const clods = Array.from({ length: 8 }, () => { const m = toon(GEO.sphere, '#8a6a48', { scale: [0.08, 0.06, 0.08], outline: 0.008 }); m.visible = false; return m; });

  // ---------- 새하얀 큰 뱀(처음엔 머리가 땅속, 덩굴만 덤불처럼 보인다) ----------
  const snake = buildSerpent(scene);
  const H = snake.head.position;
  const curve = new THREE.CatmullRomCurve3([BASE[0].clone(), BASE[1].clone(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const tmp = new THREE.Vector3(), aim = new THREE.Vector3(), off = new THREE.Vector3();

  // ---------- 우리 넷 · 포셰트 갑옷 씨 ----------
  let me = null, meFlush = [];
  const pals = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi'), pochette: buildNpc('pochette') };
  Object.values(pals).forEach((c) => { hideProps(c); scene.add(c.root); });
  const flush = { chiikawa: addFlush(pals.chiikawa), hachiware: addFlush(pals.hachiware), usagi: addFlush(pals.usagi) };
  const knuckle = addKnuckle(pals.pochette);
  const charOf = (k) => (k === 'me' ? me : pals[k]);
  // 음표(하치와레 흥얼흥얼)
  const notes = Array.from({ length: 3 }, (_, i) => { const n = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshBasicMaterial({ color: '#7a5aa8', transparent: true, opacity: 0 })); n.userData.ph = i / 3; scene.add(n); return n; });

  let shot = SHOTS.wide, snapNext = true, drunk = 0, drumT = 9, noteOn = false;
  let snakeMode = 'hidden', bulge = -1, shakeT = 0;
  const anims = {}, at = {}, swingT = {}, inMouth = new Set(), gone = new Set();
  let tweens = [];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const tween = (dur, step, end) => { tweens.push({ t: 0, dur, step, end }); };

  function place(k, x, z, anim, face) {
    const c = charOf(k);
    if (!c) return;
    c.root.position.set(x, 0, z);
    c.root.rotation.set(0, 0, 0);
    c.root.scale.setScalar(1);
    const f = face === 'bush' ? [BUSH[0], BUSH[2]] : face === 'cam' ? [x, z + 5] : face === 'snake' ? [UP.x, UP.z] : face;
    c.root.rotation.y = Math.atan2(f[0] - x, f[1] - z);
    c.root.visible = true;
    anims[k] = anim;
    at[k] = [x, z];
  }
  /** 큰 뱀 머리를 p 로 옮기고 look 쪽을 보게 한다(몸통은 layBody 가 머리를 따라 휘게 한다). */
  function headTo(p, look) {
    H.copy(p);
    snake.head.lookAt(look || aim.set(0, 1.5, 3));
  }
  function layBody() {
    const pts = curve.points, under = H.y < 0; // 머리가 땅속이면 몸통도 다 땅속에
    pts[4].copy(H).add(off.set(0, -0.1, -0.6));
    pts[3].set(H.x * 0.6 + 0.2, under ? H.y - 0.4 : Math.max(H.y * 0.8, -0.4), H.z - 1.2);
    pts[2].set(0.9, under ? -1.0 : Math.max(0.1, H.y * 0.45), (BASE[1].z + pts[3].z) / 2);
    pts[1].y = under ? -1.2 : BASE[1].y;
    curve.updateArcLengths();
    snake.body.forEach((m, i) => {
      const u = i / (snake.body.length - 1);
      curve.getPointAt(u, m.position);
      let r = 0.42 + u * 0.2;
      if (bulge >= 0) r *= 1 + Math.max(0, 1 - Math.abs(u - bulge) * 7) * 0.45; // 꿀꺽 삼킨 혹이 몸통을 따라 내려간다
      m.scale.set(r, r, r);
      m.visible = m.position.y > -r;
    });
  }
  /** 흙덩이가 튀고 화면이 흔들린다. */
  function burst(x, z) {
    shakeT = 0.9;
    clods.forEach((m, i) => { const a = i * 0.8; m.visible = true; m.userData.v = new THREE.Vector3(Math.cos(a) * 1.6, 3 + (i % 3), Math.sin(a) * 1.6); m.position.set(x, 0.1, z); });
  }

  const api = {
    scene,
    camera,
    light,
    /** 새로 들어왔다: 내 생김새 look. 덩굴 덤불 밑에 큰 뱀이 숨어 있다. */
    start(look) {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      hideProps(me);
      meFlush = addFlush(me);
      scene.add(me.root);
      inMouth.clear(); gone.clear(); tweens = [];
      snakeMode = 'hidden'; bulge = -1; shakeT = 0;
      headTo(HIDE, HIDE_LOOK);
      snake.jaw.rotation.x = 0;
      snake.head.rotation.z = 0;
      api.drunk(0);
      api.notes(false);
      api.knuckle(false);
      api.setMood('eat');
      shot = SHOTS.wide; snapNext = true;
    },
    /** 카메라: wide · vine · drum · found · snake · fight · escape. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.wide; if (snap) snapNext = true; },
    /** 서는 자리 · 몸짓(삼켜진 · 떠난 친구는 숨긴 채). */
    setMood(m) {
      const spots = SPOTS[m] || {};
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c) continue;
        if (!spots[k] || inMouth.has(k) || gone.has(k)) { c.root.visible = false; continue; }
        place(k, ...spots[k]);
      }
    },
    /** 얼굴이 빨개지고(볼) 화면이 흔들흔들(0 ~ 1). */
    drunk(level) {
      drunk = clamp01(level);
      [...Object.values(flush).flat(), ...meFlush].forEach((mat) => { mat.opacity = drunk * 0.75; });
    },
    get drunkLevel() { return drunk; },
    /** 배를 통! 두드리는 사람들이 톡 튄다. */
    drum() { drumT = 0; },
    /** 하치와레 흥얼흥얼 음표. */
    notes(on) { noteOn = !!on; },
    /** 초콜릿 하나를 딴다(그 자리에 다시 열린다). */
    pick() { snake.vine.pick(); },
    /** 포셰트 갑옷 씨가 숲 쪽에서 지금 자리(setMood 로 정한 곳)까지 걸어 들어온다. */
    pochetteCome() {
      const c = pals.pochette, from = [-5.8, -0.4], to = at.pochette || [-1.95, 0.55];
      c.root.visible = true;
      anims.pochette = 'walk';
      tween(2.2, (u) => { c.root.position.set(from[0] + (to[0] - from[0]) * u, 0, from[1] + (to[1] - from[1]) * u); c.root.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]); },
        () => { anims.pochette = 'idle'; c.root.rotation.y = Math.atan2(0.5 - to[0], 0.45 - to[1]); });
    },
    /** 포셰트 갑옷 씨가 (x, z)까지 걸어가 face 쪽을 본다(덩굴을 당기러). */
    pochetteTo(x, z, face) {
      const c = pals.pochette, from = c.root.position.clone();
      anims.pochette = 'walk';
      c.root.rotation.set(0, Math.atan2(x - from.x, z - from.z), 0);
      tween(1.4, (u) => { c.root.position.set(from.x + (x - from.x) * u, 0, from.z + (z - from.z) * u); },
        () => { anims.pochette = 'pull'; c.root.rotation.y = Math.atan2(face[0] - x, face[1] - z); at.pochette = [x, z]; });
    },
    /** 너클 더스터를 낀다. */
    knuckle(on) { if (knuckle) knuckle.visible = !!on; },
    /** 그 친구의 몸짓을 바꾼다(삼켜지려 다가가기 · 장난치기 …). */
    pose(k, anim) { if (charOf(k)) anims[k] = anim; },
    /** 큰 뱀: 'rise' 땅을 뚫고 솟아오른다 · 'sink' 땅속으로 쑥. */
    snake(m) {
      if (m === 'rise') {
        snakeMode = 'rise';
        burst(BUSH[0], BUSH[2]);
        const from = H.clone();
        tween(1.8, (u) => { headTo(tmp.lerpVectors(from, UP, ease(u)).add(off.set(0, Math.sin(u * Math.PI) * 0.5, 0))); snake.jaw.rotation.x = Math.sin(u * Math.PI) * 0.35; },
          () => { snakeMode = 'up'; });
      } else if (m === 'sink') {
        snakeMode = 'sink';
        const from = H.clone();
        tween(1.6, (u) => { headTo(tmp.lerpVectors(from, HIDE, ease(u)), aim.copy(HIDE_LOOK)); }, () => { snakeMode = 'hidden'; burst(BUSH[0], BUSH[2]); });
      }
    },
    /** 큰 뱀이 그 친구를 발끝부터 꿀꺽(입을 벌리고 다가가 → 누운 채 쏙 → 혹이 몸통을 따라 내려간다). */
    swallow(k) {
      const c = charOf(k);
      if (!c || inMouth.has(k)) return;
      snakeMode = 'lunge';
      const p = c.root.position.clone(), mouth = new THREE.Vector3(p.x, 0.8, p.z - 1.45), from = H.clone(), target = p.clone().setY(0.4); // 머리 가운데(입 끝이 친구 발 앞에 오게)
      tween(0.7, (u) => { headTo(tmp.lerpVectors(from, mouth, ease(u)), target); snake.jaw.rotation.x = ease(u) * 0.75; }, () => {
        c.root.rotation.set(0, Math.PI, 0); // 큰 뱀 쪽(-z)을 보고 섰다가
        tween(1.2, (u) => {
          const e = ease(u);
          c.root.rotation.x = e * Math.PI / 2; // 벌러덩 누워 발끝(-z)부터 입속으로(머리는 +z 쪽, 얼굴은 하늘)
          c.root.position.set(p.x, 0.25 + e * 0.35, p.z - e * 0.95);
          c.root.scale.setScalar(1 - e * 0.65);
        }, () => {
          c.root.visible = false;
          inMouth.add(k);
          const back = H.clone();
          tween(1.1, (u) => { headTo(tmp.lerpVectors(back, UP, ease(u))); snake.jaw.rotation.x = 0.75 * (1 - ease(u)); bulge = 0.95 - u * 0.75; }, () => { bulge = -1; snakeMode = 'up'; });
        });
      });
    },
    /** 펀치! who('pochette' | 'me')가 내지르고 큰 뱀이 휘청한다. spitKind 가 있으면 그 친구를 퉤 뱉는다. */
    punch(who, spitKind) {
      const c = charOf(who);
      if (c) { anims[who] = 'thrust'; swingT[who] = 0; }
      snakeMode = 'hit';
      tween(0.5, (u) => {
        swingT[who] = u;
        headTo(tmp.set(UP.x - Math.sin(u * Math.PI) * 0.4, UP.y + Math.sin(u * Math.PI) * 0.15, UP.z - Math.sin(u * Math.PI) * 0.25));
        snake.head.rotation.z = Math.sin(u * Math.PI * 3) * 0.25;
      }, () => {
        if (c) anims[who] = who === 'me' ? 'train' : 'idle';
        snake.head.rotation.z = 0;
        snakeMode = 'up';
        if (spitKind) api.spit(spitKind);
      });
    },
    /** 헛손질: 큰 뱀이 쓱 피한다. */
    dodge() {
      snakeMode = 'hit';
      tween(0.4, (u) => { headTo(tmp.set(UP.x + Math.sin(u * Math.PI) * 0.6, UP.y, UP.z)); }, () => { snakeMode = 'up'; });
    },
    /** 삼켰던 친구를 퉤: 입에서 튀어나와 포물선을 그리며 땅에 털썩. */
    spit(k) {
      const c = charOf(k);
      if (!c || !inMouth.has(k)) return;
      inMouth.delete(k);
      const from = H.clone().add(off.set(0, -0.2, 0.9)), to = LAND[k] || [0, 1.6]; // 입 앞에서
      c.root.visible = true;
      c.root.rotation.set(0, 0, 0);
      anims[k] = 'faint';
      tween(0.4, (u) => { snake.jaw.rotation.x = Math.sin(u * Math.PI) * 0.8; }, null);
      tween(0.9, (u) => {
        c.root.position.set(from.x + (to[0] - from.x) * u, from.y * (1 - u) + Math.sin(u * Math.PI) * 1.2, from.z + (to[1] - from.z) * u);
        c.root.scale.setScalar(0.4 + 0.6 * ease(u));
        c.root.rotation.x = u * Math.PI * 2;
      }, () => { c.root.position.set(to[0], 0, to[1]); c.root.rotation.set(0, 0, 0); anims[k] = 'sit'; at[k] = to; }); // 털썩 앉아 멍하니(얼굴이 보이게 앞을 본다)
    },
    /** 우사기가 신나서 숲 밖으로 뛰어간다(그대로 사라진다). */
    usagiRun() {
      const c = pals.usagi, from = c.root.position.clone(), to = new THREE.Vector3(6.2, 0, 4.4);
      anims.usagi = 'run';
      c.root.rotation.set(0, Math.atan2(to.x - from.x, to.z - from.z), 0);
      tween(1.8, (u) => { c.root.position.lerpVectors(from, to, u); }, () => { c.root.visible = false; gone.add('usagi'); });
    },
    /** 삼켜진 친구들(디버그 · 테스트용). */
    get swallowed() { return [...inMouth]; },
    /** 움직임(걷기 · 뱀 · 뱉기 · 달려 나가기)이 아직 끝나지 않았는지. */
    get busy() { return tweens.length > 0; },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 64 : 42;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      // 움직임(끝나면 이어지는 다음 움직임을 붙인다)
      const live = tweens;
      tweens = [];
      for (const w of live) {
        w.t += dt;
        const u = clamp01(w.t / w.dur);
        w.step(u);
        if (u >= 1) { if (w.end) w.end(); } else tweens.push(w);
      }
      // 큰 뱀: 솟아 있으면 살랑살랑
      if (snakeMode === 'up') headTo(tmp.set(UP.x + Math.sin(t * 1.1) * 0.12, UP.y + Math.sin(t * 1.7) * 0.06, UP.z), aim.set(Math.sin(t * 0.7) * 0.6, 1.5, 3)); // 고개는 살짝만 숙인다(얼굴이 보이게)
      layBody();
      snake.vine.update(dt, t);
      clods.forEach((m) => {
        if (!m.visible) return;
        m.userData.v.y -= 9 * dt;
        m.position.addScaledVector(m.userData.v, dt);
        if (m.position.y < 0) m.visible = false;
      });
      drumT += dt;
      // 하치와레 흥얼흥얼 음표
      const hc = pals.hachiware.root.position;
      notes.forEach((n) => {
        const u = (t * 0.7 + n.userData.ph) % 1;
        n.position.set(hc.x + 0.25 + u * 0.35, 1.2 + u * 0.6, hc.z + 0.1);
        n.material.opacity = noteOn && pals.hachiware.root.visible ? Math.sin(u * Math.PI) * 0.9 : 0;
        n.lookAt(camera.position);
      });
      // 몸짓
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c || !c.root.visible) continue;
        let anim = anims[k] || 'idle';
        const opts = { phase: k.length };
        if (anim === 'roll') { // 하치와레: 벌러덩 누워 깔깔 구른다
          anim = 'faint';
          c.root.rotation.z = Math.sin(t * 3.2) * 0.55;
          c.root.position.x = at[k][0] + Math.sin(t * 1.6) * 0.35;
        } else if (anim === 'run') { anim = 'walk'; opts.phase = t * 14; } else if (anim === 'walk') opts.phase = t * 8;
        if (anim === 'thrust') opts.swing = swingT[k] || 0;
        const flying = anim === 'faint' && c.root.scale.x < 0.999; // 뱉어져 날아가는 중
        if (anim === 'clap' && drumT < 0.25) c.root.position.y = Math.sin((drumT / 0.25) * Math.PI) * 0.12; // 통! 톡 튄다
        else if (anim === 'sit') c.root.position.y = SIT_LIFT;
        else if (anim !== 'faint') c.root.position.y = 0;
        if (drunk > 0 && !flying && !['faint', 'walk', 'thrust'].includes(anim)) c.root.rotation.z = Math.sin(t * 1.9 + k.length) * 0.09 * drunk; // 비틀비틀
        animateChibi(c, anim, t, opts);
      }
      // 카메라(취하면 살짝 기울어 흔들흔들, 땅이 들썩이면 덜컹)
      const sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot, kk = Math.min(1, dt * 2.4);
      tmpPos.set(...sh.pos); tmpLook.set(...sh.look);
      if (snapNext) { camPos.copy(tmpPos); camLook.copy(tmpLook); snapNext = false; }
      else { camPos.lerp(tmpPos, kk); camLook.lerp(tmpLook, kk); }
      camera.position.copy(camPos);
      if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); camera.position.x += Math.sin(t * 60) * 0.06 * shakeT; camera.position.y += Math.cos(t * 50) * 0.05 * shakeT; }
      camera.lookAt(camLook);
      if (drunk > 0) camera.rotateZ(Math.sin(t * 1.3) * 0.035 * drunk);
    }
  };
  return api;
}
