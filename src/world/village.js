import * as THREE from 'three';
import { toonMaterial, toonMesh, toonInstances, GEO } from '../render/toon.js';
import { astar, smoothPath } from '../core/pathfind.js';
import { createObstacleIndex, slideMove } from '../core/obstacles.js';
import { WORLD_HALF, WALK_HALF, VILLAGE_R, GATE_HALF, GATES, POND, LOTS, ROADS, roadDist, shoreDist, doorSpot, lotRadius } from '../core/layout.js';
import { createZones } from './zones.js';
import { buildOutdoors } from './outdoors.js';
import { DESIGNS } from './buildings.js';

/** 흙길까지의 거리(음수면 길 위). berries.js 가 쓴다. */
export const pathDist = roadDist;

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

const C = {
  grass: new THREE.Color('#9fdc7f'), grass2: new THREE.Color('#c4ec92'), dirt: new THREE.Color('#f5e1b0'), sand: new THREE.Color('#f0e0b4')
};

const REGION_C = { forest: new THREE.Color('#86c975'), mountain: new THREE.Color('#c9c1ae'), fields: new THREE.Color('#cdee98'), river: new THREE.Color('#a8e08a') };
const tint = new THREE.Color();
function groundColor(x, z, out) {
  const n = Math.sin(x * 1.1 + z * 0.6) * 0.5 + Math.sin(x * 0.35 - z * 0.9) * 0.5;
  out.copy(C.grass).lerp(C.grass2, 0.5 + n * 0.35);
  // 울타리 밖은 구역 색으로 물든다(대각선 경계에서는 이웃 구역 색이 섞인다)
  const outside = smooth(VILLAGE_R - 2, VILLAGE_R + 10, Math.hypot(x, z));
  if (outside > 0) {
    const k = smooth(-6, 6, Math.abs(x) - Math.abs(z)); // 1: 동서 구역, 0: 남북 구역
    tint.copy(z < 0 ? REGION_C.mountain : REGION_C.river).lerp(x < 0 ? REGION_C.forest : REGION_C.fields, k);
    out.lerp(tint, outside * 0.85);
  }
  out.lerp(C.dirt, smooth(0.3, -0.1, roadDist(x, z)));
  out.lerp(C.sand, smooth(1.2, 0.0, shoreDist(x, z)));
  return out;
}

/** 지붕(박공) 도형: 바닥 1x1, 용마루는 x 방향, 높이 1. */
function roofGeometry() {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], Cc = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], R1 = [-0.5, 1, 0], R2 = [0.5, 1, 0];
  const tris = [A, R1, R2, A, R2, B, D, Cc, R2, D, R2, R1, A, D, R1, B, R2, Cc, A, B, Cc, A, Cc, D];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}
const ROOF = roofGeometry();
const OCTA = new THREE.CylinderGeometry(1, 1, 1, 8); // 경품 추첨 가라가라의 팔각 통

/** 둥근 문(아래는 평평, 위는 반원): 폭 1 · 높이 1.75 · 두께 1(가운데 기준), 원점은 문 아래 가운데. */
function archDoorGeometry() {
  const sh = new THREE.Shape();
  sh.moveTo(-0.5, 0);
  sh.lineTo(0.5, 0);
  sh.lineTo(0.5, 1.25);
  sh.absarc(0, 1.25, 0.5, 0, Math.PI, false);
  sh.lineTo(-0.5, 0);
  return new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -0.5);
}
const ARCH_DOOR = archDoorGeometry();

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 마을 전체를 장면에 만든다. */
export function buildVillage(scene) {
  const rand = rng(7);
  const obstacles = createObstacleIndex(4), labels = [], spots = {}, clouds = [];
  const world = new THREE.Group();
  scene.add(world);

  // 땅
  const groundGeo = new THREE.PlaneGeometry(WORLD_HALF * 2 + 8, WORLD_HALF * 2 + 8, 200, 200).rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position, colors = new Float32Array(pos.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    groundColor(pos.getX(i), pos.getZ(i), tmp);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(groundGeo, toonMaterial('#ffffff', { vertexColors: true }));
  ground.receiveShadow = true;
  world.add(ground);

  // 연못과 연잎
  world.add(toonMesh(GEO.cylinder, '#86d3f2', { position: [POND.x, -0.02, POND.z], scale: [POND.r, 0.05, POND.r * 0.85], shadow: false, receive: true, outline: 0.03 }));
  [[0.6, 0.3, 0.32], [-0.7, -0.4, 0.26], [0.1, -0.8, 0.22]].forEach(([dx, dz, r]) => {
    world.add(toonMesh(GEO.cylinder, '#86c77f', { position: [POND.x + dx, 0.03, POND.z + dz], scale: [r, 0.03, r], shadow: false, outline: 0.02 }));
  });
  // 연못은 장애물 대신 isFree 가 물로 막는다

  const place = (parent, mesh) => { parent.add(mesh); return mesh; };
  /**
   * 건물 · 가판대가 실제로 차지하는 바닥을 장애물로: 몸에 닿는 높이(바닥 위 0.25 ~ 0.85)에 걸친 조각마다 네모(둥근 벽 · 고깔은 원).
   * 예전처럼 건물 전체를 감싸는 큰 원 하나로 막으면 벽에서 한참 떨어진 곳에서도 걸려 답답했다.
   * 그 큰 원은 꽃 · 나무 자리를 고를 때만 쓰도록 soft 로 남긴다(걸어서는 지나갈 수 있다).
   * g: 다 지은 무리(위치 · y 회전만 있다), list: 그 조각들(g 바로 밑 것만 센다). union: 모두 합친 네모 하나로(가판대 · 게시판처럼 작은 것).
   */
  const SOLID_BOX = new THREE.Box3(), SOLID_ALL = new THREE.Box3();
  function solid(g, list, union = false) {
    const a = g.rotation.y, ca = Math.cos(a), sa = Math.sin(a), shapes = [];
    const shapeOf = (bx) => ({ cx: (bx.min.x + bx.max.x) / 2, cz: (bx.min.z + bx.max.z) / 2, hx: (bx.max.x - bx.min.x) / 2, hz: (bx.max.z - bx.min.z) / 2 });
    SOLID_ALL.makeEmpty();
    for (const m of list) {
      if (!m.isMesh || m.parent !== g) continue;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      m.updateMatrix();
      SOLID_BOX.copy(m.geometry.boundingBox).applyMatrix4(m.matrix);
      if (SOLID_BOX.min.y > 0.85 || SOLID_BOX.max.y < 0.25) continue; // 머리 위(지붕 · 처마 · 간판) · 발밑(깔개 · 계단 · 받침)은 걸리지 않는다
      if (union) { SOLID_ALL.union(SOLID_BOX); continue; }
      const sh = shapeOf(SOLID_BOX);
      if (sh.hx < 0.03 && sh.hz < 0.03) continue;
      sh.round = (m.geometry === GEO.cylinder || m.geometry === GEO.cone) && !m.rotation.x && !m.rotation.z && Math.abs(sh.hx - sh.hz) < 0.02;
      shapes.push(sh);
    }
    if (union && !SOLID_ALL.isEmpty()) shapes.push(shapeOf(SOLID_ALL));
    // 큰 것부터, 이미 넣은 네모 안에 쏙 들어가는 조각(벽 위 창틀 · 모서리 기둥)은 뺀다
    shapes.sort((p, q) => q.hx * q.hz - p.hx * p.hz);
    const kept = [], within = (s, k) => s.cx - s.hx >= k.cx - k.hx - 0.02 && s.cx + s.hx <= k.cx + k.hx + 0.02 && s.cz - s.hz >= k.cz - k.hz - 0.02 && s.cz + s.hz <= k.cz + k.hz + 0.02;
    for (const s of shapes) if (!kept.some((k) => !k.round && within(s, k))) kept.push(s);
    for (const s of kept) {
      const x = g.position.x + ca * s.cx + sa * s.cz, z = g.position.z - sa * s.cx + ca * s.cz;
      obstacles.push(s.round ? { x, z, r: s.hx } : { x, z, box: { hx: s.hx, hz: s.hz, yaw: a } });
    }
  }

  // 집도 나무처럼, 카메라와 내 캐릭터 사이를 가리면 반투명해진다. 그래서 집마다 재질을 따로 둔다.
  const houses = [];
  const windows = []; // 밤에 불이 들어오는 창(집마다 재질)
  /**
   * 가게 · 친구 집: buildings.js 의 모양(design)대로 짓는다. 남쪽(카메라 쪽)을 보고, 조금씩 비뚤게 앉힌다.
   * 모양 안 조각은 이 건물 전용 재질이라 내 캐릭터를 가리면 함께 반투명해진다. 돌려주는 H 는 가장 높은 곳.
   */
  function building(lot, design) {
    const { x, z, s } = lot;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = (lot.yaw || 0) + (rand() - 0.5) * 0.12;
    // 가게 앞 소품도 막는다(건물 기준 자리 → 마을 자리)
    const block = (lx, lz, r) => { const a = g.rotation.y; obstacles.push({ x: x + Math.cos(a) * lx + Math.sin(a) * lz, z: z - Math.sin(a) * lx + Math.cos(a) * lz, r }); };
    // 밤에 불이 들어오는 창 · 등(그 색 재질을 창문 목록에 넣는다)
    const glow = (mesh) => { if (!windows.includes(mesh.material)) windows.push(mesh.material); return mesh; };
    const mats = new Map(), meshes = [];
    const mat = (c) => {
      if (!mats.has(c)) { const m = toonMaterial(c, { unique: true }); m.transparent = true; mats.set(c, m); }
      return mats.get(c);
    };
    const part = (geo, c, opts) => { const m = place(g, toonMesh(geo, null, { ...opts, material: mat(c) })); meshes.push(m); return m; };
    const { H } = design({ s, part, block, glow, ROOF });
    world.add(g);
    obstacles.push({ x, z, r: lotRadius(lot), soft: true });
    solid(g, meshes);
    houses.push({ x, z, half: 1.32 * s, mats: [...mats.values()], meshes, fade: 1 });
    return { H };
  }

  // 나무 잎은 나무마다 재질을 따로 두어, 내 캐릭터를 가릴 때 반투명하게 만든다
  const trees = [];
  function tree(x, z, s, leaf = '#6cc77e', parent = world) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rand() * 6;
    g.scale.setScalar(s);
    place(g, toonMesh(GEO.cylinder, '#b88c66', { scale: [0.16, 1.1, 0.16], outline: 0.03 }));
    const light = new THREE.Color(leaf).lerp(new THREE.Color('#ffffff'), 0.14).getStyle();
    const mats = [toonMaterial(leaf, { unique: true }), toonMaterial(light, { unique: true })];
    mats.forEach((m) => { m.transparent = true; });
    const canopy = [];
    [[0, 1.65, 0, 0.82], [0.48, 1.35, 0.18, 0.58], [-0.42, 1.42, -0.12, 0.6], [0.05, 1.3, -0.45, 0.55]].forEach(([px, py, pz, r], i) => {
      canopy.push(place(g, toonMesh(GEO.sphere, null, { material: mats[i % 2], position: [px, py, pz], scale: [r, r * 0.92, r], outline: 0.04 })));
    });
    parent.add(g);
    obstacles.push({ x, z, r: 0.6 * s });
    trees.push({ x, z, s, mats, canopy, fade: 1 });
  }

  function bush(x, z, s) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    [[0, 0.28, 0, 0.42], [0.38, 0.22, 0.08, 0.32], [-0.36, 0.2, 0.05, 0.3]].forEach(([px, py, pz, r], i) => {
      place(g, toonMesh(GEO.sphere, i ? '#9dd394' : '#8fcd86', { position: [px, py, pz], scale: [r, r * 0.85, r], outline: 0.03 }));
    });
    world.add(g);
    obstacles.push({ x, z, r: 0.55 * s, soft: true }); // 덤불은 지나갈 수 있다(꽃 · 풀이 그 자리에 나지 않게만)
  }

  /**
   * 원작 치이카와네 같은 하얀 돔 집: 반구 몸통, 옆에 둥근 현관 혹, 십자 창 하나.
   * 집처럼 내 캐릭터를 가리면 반투명해진다. 돌려주는 R 은 몸통 반지름.
   */
  function dome(x, z, s, yaw = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    const mats = new Map(), meshes = [];
    const mat = (c) => {
      if (!mats.has(c)) { const m = toonMaterial(c, { unique: true }); m.transparent = true; mats.set(c, m); }
      return mats.get(c);
    };
    const part = (geo, c, opts) => { const m = place(g, toonMesh(geo, null, { ...opts, material: mat(c) })); meshes.push(m); return m; };
    const R = 1.4 * s;
    part(GEO.sphere, '#fbfaf5', { scale: [R, R * 0.9, R], receive: true, outline: 0.05 }); // 아래 반은 땅에 묻혀 반구가 된다
    // 현관 혹(앞 오른쪽 대각선): 키 큰 반달 모양
    const bx = R * 0.62, bz = R * 0.62, rz = 0.42 * s, ry = 0.95 * s;
    part(GEO.sphere, '#fbfaf5', { position: [bx, 0, bz], scale: [rz, ry, rz], outline: 0.04 });
    // 문(원작처럼 흰 문): 카메라 쪽으로 꺾지 않고 혹이 바깥을 보는 쪽(대각선)에 자연스럽게 달고,
    // 위로 갈수록 좁아지는 혹 겉면을 따라 살짝 뒤로 기울인다. 문 · 손잡이 · 가로선은 문 묶음(door) 안 좌표로 붙인다
    const dw = 0.33 * s, dh = dw * 1.75, dt = 0.06, surf = (y) => rz * Math.sqrt(1 - (y / ry) ** 2);
    const tilt = Math.atan((surf(0) - surf(dh)) / dh), face = Math.atan2(bx, bz), ox = Math.sin(face), oz = Math.cos(face);
    const door = new THREE.Group();
    door.position.set(bx + ox * surf(0), 0, bz + oz * surf(0));
    door.rotation.set(-tilt, face, 0, 'YXZ');
    g.add(door);
    const doorPart = (geo, c, opts) => { const m = place(door, toonMesh(geo, null, { ...opts, material: mat(c) })); meshes.push(m); return m; };
    doorPart(ARCH_DOOR, '#ffffff', { position: [0, 0, dt / 2 + 0.012], scale: [dw, dw, dt], shell: true, outline: 0.022, shadow: false });
    doorPart(GEO.box, '#e3dacb', { position: [0, dh * 0.42, dt + 0.016], scale: [dw * 0.78, 0.016, 0.01], outline: false, shadow: false });
    doorPart(GEO.dot, '#d9b45a', { position: [dw * 0.28, dh * 0.4, dt + 0.03], scale: [0.035 * s, 0.035 * s, 0.035 * s], outline: 0.012, shadow: false });
    // 문 앞 디딤돌(문이 보는 쪽으로)
    const step = surf(0) + 0.3 * s;
    part(GEO.cylinder, '#e7e1d6', { position: [bx + ox * step, 0, bz + oz * step], rotation: [0, face, 0], scale: [0.3 * s, 0.05, 0.2 * s], outline: 0.02, shadow: false, receive: true });
    // 십자 창(앞 왼쪽 위): 흰 틀 + 진한 십자
    const el = 0.62, az = -0.42; // 높이각, 옆으로 돌린 각
    const wx = Math.sin(az) * Math.cos(el) * R * 1.01, wy = Math.sin(el) * R * 0.9, wz = Math.cos(az) * Math.cos(el) * R * 1.01;
    part(GEO.box, '#c6e7f5', { position: [wx, wy, wz], rotation: [-el * 0.8, az, 0], scale: [0.36 * s, 0.36 * s, 0.04], shell: true, outline: 0.02, shadow: false });
    part(GEO.box, '#3a3236', { position: [wx * 1.005, wy, wz * 1.005], rotation: [-el * 0.8, az, 0], scale: [0.04 * s, 0.34 * s, 0.05], outline: false, shadow: false });
    part(GEO.box, '#3a3236', { position: [wx * 1.005, wy, wz * 1.005], rotation: [-el * 0.8, az, 0], scale: [0.34 * s, 0.04 * s, 0.05], outline: false, shadow: false });
    world.add(g);
    obstacles.push({ x, z, r: R * 1.05 });
    // 현관 혹도 막는다(문에 파고들지 않게)
    obstacles.push({ x: x + Math.cos(yaw) * bx + Math.sin(yaw) * bz, z: z - Math.sin(yaw) * bx + Math.cos(yaw) * bz, r: rz + 0.12 });
    houses.push({ x, z, half: R, mats: [...mats.values()], meshes, fade: 1 });
    windows.push(mats.get('#c6e7f5'));
    return { R };
  }

  /** 포셰트 가게 노점: lot 자리에서 남쪽(카메라 쪽)을 본다. */
  function stall(lot) {
    const { x, z } = lot, g = new THREE.Group(), wood = '#d8b48c';
    g.position.set(x, 0, z);
    g.rotation.y = 0;
    place(g, toonMesh(GEO.box, wood, { position: [0, 0.75, 0], scale: [1.6, 0.12, 0.8], shell: true }));
    [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].forEach(([lx, lz]) => place(g, toonMesh(GEO.box, wood, { position: [lx, 0.37, lz], scale: [0.08, 0.75, 0.08], shell: true })));
    [-0.85, 0.85].forEach((px) => place(g, toonMesh(GEO.box, wood, { position: [px, 1.25, -0.42], scale: [0.07, 1.0, 0.07], shell: true })));
    place(g, toonMesh(ROOF, '#f7b6cc', { position: [0, 1.72, -0.05], scale: [1.95, 0.42, 1.1], shell: true }));
    ['#f7a8c4', '#bfe0f5', '#fff1a8', '#d9ccff', '#ffd6e2'].forEach((c, i) => place(g, toonMesh(GEO.box, c, { position: [-0.6 + i * 0.3, 0.9, 0.05], scale: [0.2, 0.16, 0.09], shell: true, shadow: false })));
    world.add(g);
    obstacles.push({ x, z, r: lotRadius(lot), soft: true });
    solid(g, g.children, true);
    labels.push({ x, y: 2.5, z, text: lot.label });
  }

  /** 노동 접수 게시판. */
  /**
   * 노동 접수대(원작처럼): 노란 계산대 앞판에 일감 종이 셋, 나무 기둥 넷 위에 '노동' 이라 쓴 흰 간판, 계산대 위 호출 종.
   * 노동 갑옷 씨가 계산대 안에서 팔짱 끼고 기대 손님을 기다린다(뒤가 트여 있어 드나든다).
   * 왼쪽 옆에는 나무 일감 패가 줄줄이 걸린 흰 벽(일감 걸이)이 선다.
   */
  function board(lot) {
    const { x, z } = lot, g = new THREE.Group(), post = '#8a5a3c', front = '#f6c66b';
    g.position.set(x, 0, z);
    // 계산대: 노란 앞판 · 옆판 · 밝은 나무 상판
    place(g, toonMesh(GEO.box, front, { position: [0, 0.47, 0.3], scale: [1.9, 0.94, 0.08], shell: true }));
    [-0.95, 0.95].forEach((px) => place(g, toonMesh(GEO.box, front, { position: [px, 0.47, 0.1], scale: [0.08, 0.94, 0.48], shell: true })));
    place(g, toonMesh(GEO.box, '#ead3a6', { position: [0, 0.97, 0.12], scale: [2.0, 0.07, 0.5], shell: true }));
    // 앞판에 붙인 일감 종이 셋(줄 셋씩)
    [-0.55, 0.05, 0.6].forEach((px, i) => {
      place(g, toonMesh(GEO.box, '#fffdf6', { position: [px, 0.5, 0.35], rotation: [0, 0, (i - 1) * 0.04], scale: [0.32, 0.42, 0.015], outline: 0.012, shadow: false }));
      [0.62, 0.52, 0.42].forEach((py) => place(g, toonMesh(GEO.box, '#6b4a3a', { position: [px, py, 0.36], scale: [0.2, 0.014, 0.01], outline: false, shadow: false })));
    });
    // 호출 종
    place(g, toonMesh(GEO.cone, '#d9c58f', { position: [-0.62, 1.0, 0.2], scale: [0.08, 0.1, 0.08], outline: 0.014, shadow: false }));
    place(g, toonMesh(GEO.sphere, '#a8935f', { position: [-0.62, 1.12, 0.2], scale: [0.025, 0.025, 0.025], outline: false, shadow: false }));
    // 기둥 넷 · 위 옆 들보 · '노동' 간판
    [[-0.95, 0.34], [0.95, 0.34], [-0.95, -0.42], [0.95, -0.42]].forEach(([px, pz]) => place(g, toonMesh(GEO.box, post, { position: [px, 1.18, pz], scale: [0.08, 2.36, 0.08], shell: true })));
    [-0.95, 0.95].forEach((px) => place(g, toonMesh(GEO.box, post, { position: [px, 2.22, -0.04], scale: [0.08, 0.08, 0.84], shell: true, shadow: false })));
    place(g, toonMesh(GEO.box, '#fbfaf5', { position: [0, 2.5, 0.34], scale: [2.1, 0.62, 0.08], shell: true }));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 0.54), new THREE.MeshBasicMaterial({ map: signTexture('노동') }));
    sign.position.set(0, 2.5, 0.385);
    g.add(sign);
    signs.push(sign.material);
    world.add(g);
    // 계산대 앞 · 뒤 기둥만 막는다(노동 갑옷 씨가 뒤로 드나들며 안에 선다)
    [-0.6, 0, 0.6].forEach((px) => obstacles.push({ x: x + px, z: z + 0.25, r: 0.36, soft: true }));
    [-0.95, 0.95].forEach((px) => obstacles.push({ x: x + px, z: z - 0.42, r: 0.12 }));
    solid(g, g.children.filter((m) => m !== sign), true);
    labels.push({ x, y: 3.05, z, text: lot.label });
    tagWall(x - 1.85, z - 0.15);
  }
  /** 일감 걸이: 흰 벽에 가로 막대 셋, 막대마다 나무 일감 패가 넷씩 걸려 있다. */
  function tagWall(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    place(g, toonMesh(GEO.box, '#f7f2e6', { position: [0, 1.0, 0], scale: [1.25, 2.0, 0.12], shell: true }));
    place(g, toonMesh(GEO.box, '#c9b48e', { position: [0, 2.04, 0.02], scale: [1.35, 0.08, 0.2], shell: true, shadow: false }));
    [1.62, 1.12, 0.62].forEach((py) => {
      place(g, toonMesh(GEO.box, '#6b4a3a', { position: [0, py, 0.08], scale: [1.08, 0.022, 0.02], outline: false, shadow: false }));
      [-0.39, -0.13, 0.13, 0.39].forEach((px) => {
        place(g, toonMesh(GEO.box, '#e9cf9a', { position: [px, py - 0.17, 0.08], scale: [0.15, 0.24, 0.02], outline: 0.01, shadow: false }));
        place(g, toonMesh(GEO.sphere, '#6b4a3a', { position: [px, py - 0.08, 0.095], scale: [0.016, 0.016, 0.006], outline: false, shadow: false }));
      });
    });
    world.add(g);
    obstacles.push({ x, z, r: 0.66, soft: true });
    solid(g, g.children, true);
  }
  /** 간판 글씨(캔버스 그림): 흰 바탕에 굵은 갈색 손글씨, 나뭇결 같은 짧은 선 몇 개. 글꼴이 늦게 오면 다시 그린다. */
  function signTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 140;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
      const c = canvas.getContext('2d');
      c.fillStyle = '#fbfaf5';
      c.fillRect(0, 0, 512, 140);
      c.strokeStyle = 'rgba(90, 68, 49, 0.45)';
      c.lineWidth = 3;
      [[40, 22], [62, 30], [455, 18], [470, 28], [70, 108], [440, 104], [452, 112]].forEach(([lx, ly]) => { c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx, ly + 14); c.stroke(); });
      c.fillStyle = '#6e3a2e';
      c.font = 'bold 104px Gaegu, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text.split('').join(' '), 256, 76);
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.load('bold 104px Gaegu').then(draw, () => {});
    return tex;
  }

  /** 스티커 작업대: 게시판 옆 긴 탁자 위에 컨베이어와 과일, 옆에 과일 상자. */
  function bench(lot) {
    const { x, z } = lot, g = new THREE.Group(), wood = '#c49a6c';
    g.position.set(x, 0, z);
    g.rotation.y = 0;
    place(g, toonMesh(GEO.box, wood, { position: [0, 0.62, 0], scale: [1.5, 0.1, 0.75], shell: true }));
    [[-0.66, -0.3], [0.66, -0.3], [-0.66, 0.3], [0.66, 0.3]].forEach(([lx, lz]) => place(g, toonMesh(GEO.box, wood, { position: [lx, 0.3, lz], scale: [0.08, 0.6, 0.08], shell: true })));
    place(g, toonMesh(GEO.box, '#6b6470', { position: [0, 0.7, 0], scale: [1.36, 0.05, 0.4], shell: true, shadow: false }));
    ['#e0524f', '#f7c948', '#f29a4a'].forEach((c, i) => place(g, toonMesh(GEO.sphere, c, { position: [-0.45 + i * 0.45, 0.82, 0], scale: [0.12, 0.11, 0.12], outline: 0.015 })));
    place(g, toonMesh(GEO.cylinder, '#ffb7cf', { position: [0.55, 0.68, 0.28], rotation: [Math.PI / 2, 0, 0], scale: [0.09, 0.06, 0.09], outline: 0.012, shadow: false }));
    place(g, toonMesh(GEO.box, '#e2b77f', { position: [1.05, 0.25, 0], scale: [0.45, 0.5, 0.45], shell: true }));
    ['#e0524f', '#f7c948'].forEach((c, i) => place(g, toonMesh(GEO.sphere, c, { position: [0.95 + i * 0.2, 0.55, 0.05], scale: [0.11, 0.1, 0.11], outline: 0.015 })));
    world.add(g);
    obstacles.push({ x, z, r: lotRadius(lot), soft: true });
    solid(g, g.children, true);
    labels.push({ x, y: 1.6, z, text: lot.label });
  }

  /**
   * 경품 추첨: 빨간 줄무늬 천을 덮은 탁자 위에 팔각 나무 통(가라가라)과 손잡이, 앞에 구슬 받는 하얀 쟁반과 금 종,
   * 뒤에 빨강 · 하양 차양. 추첨할 때 통이 빙글빙글 돈다(raffleDrum).
   */
  let raffleDrum = null;
  const signs = []; // 글씨 그림 간판 재질(밤에는 어둡게: tintSigns)
  function raffle(lot) {
    const { x, z } = lot, g = new THREE.Group(), wood = '#c98a4a', red = '#e0524f';
    g.position.set(x, 0, z);
    // 탁자: 흰 천에 빨간 세로 줄
    place(g, toonMesh(GEO.box, '#fffaf0', { position: [0, 0.38, 0], scale: [1.5, 0.76, 0.72], shell: true }));
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((px) => place(g, toonMesh(GEO.box, red, { position: [px, 0.38, 0.37], scale: [0.13, 0.74, 0.02], outline: false, shadow: false })));
    // 가라가라: 받침 다리 둘 + 팔각 통(옆으로 눕힌 축) + 손잡이
    [-0.32, 0.32].forEach((px) => place(g, toonMesh(GEO.box, '#a8743c', { position: [px, 0.98, -0.05], scale: [0.06, 0.46, 0.3], shell: true, shadow: false })));
    const drum = new THREE.Group();
    drum.position.set(0, 1.12, -0.05);
    place(drum, toonMesh(OCTA, wood, { rotation: [0, 0, Math.PI / 2], scale: [0.27, 0.5, 0.27], outline: 0.022 }));
    [-0.255, 0.255].forEach((px) => place(drum, toonMesh(OCTA, '#e8b878', { position: [px, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.2, 0.02, 0.2], outline: false, shadow: false })));
    place(drum, toonMesh(GEO.box, '#7a5233', { position: [0.36, 0, 0], scale: [0.04, 0.04, 0.04], outline: false, shadow: false }));
    // 손잡이(통과 같이 돈다): 축에서 뻗은 팔 + 빨간 손잡이
    place(drum, toonMesh(GEO.box, '#7a5233', { position: [0.4, 0, 0.13], scale: [0.04, 0.04, 0.28], outline: 0.012, shadow: false }));
    place(drum, toonMesh(GEO.cylinder, '#e0524f', { position: [0.4, 0, 0.26], rotation: [0, 0, -Math.PI / 2], scale: [0.035, 0.12, 0.035], outline: 0.012, shadow: false }));
    g.add(drum);
    raffleDrum = drum;
    // 구슬 쟁반(색 구슬 몇 개) · 금 종
    place(g, toonMesh(GEO.box, '#ffffff', { position: [-0.05, 0.8, 0.22], scale: [0.5, 0.05, 0.22], outline: 0.014, shadow: false }));
    [['#f6c453', -0.2], ['#e0524f', -0.05], ['#fbfaf5', 0.1]].forEach(([c, px]) => place(g, toonMesh(GEO.sphere, c, { position: [px, 0.86, 0.22], scale: [0.045, 0.045, 0.045], outline: 0.01, shadow: false })));
    place(g, toonMesh(GEO.cone, '#f6c453', { position: [-0.55, 0.77, 0.12], scale: [0.09, 0.14, 0.09], outline: 0.014, shadow: false }));
    place(g, toonMesh(GEO.sphere, '#a8743c', { position: [-0.55, 0.93, 0.12], scale: [0.025, 0.025, 0.025], outline: false, shadow: false }));
    // 뒤 기둥 · 빨강 하양 차양
    [-0.72, 0.72].forEach((px) => place(g, toonMesh(GEO.box, '#a8743c', { position: [px, 1.05, -0.35], scale: [0.07, 2.1, 0.07], shell: true })));
    place(g, toonMesh(ROOF, red, { position: [0, 2.1, -0.15], scale: [1.75, 0.34, 0.8], shell: true }));
    [-0.6, -0.2, 0.2, 0.6].forEach((px) => place(g, toonMesh(GEO.box, '#fffaf0', { position: [px, 1.92, 0.27], scale: [0.2, 0.22, 0.03], outline: 0.012, shadow: false })));
    world.add(g);
    obstacles.push({ x, z, r: lotRadius(lot), soft: true });
    solid(g, g.children, true);
    labels.push({ x, y: 2.6, z, text: lot.label });
  }

  /** 랏코 수련장: 나무 기둥 셋과 짚 인형. */
  function dojo(lot) {
    const g = new THREE.Group();
    g.position.set(lot.x, 0, lot.z);
    [[-1.2, -0.6], [0, -1.0], [1.2, -0.6]].forEach(([px, pz]) => {
      place(g, toonMesh(GEO.cylinder, '#b88c66', { position: [px, 0, pz], scale: [0.14, 1.1, 0.14], outline: 0.025 }));
      obstacles.push({ x: lot.x + px, z: lot.z + pz, r: 0.3 });
    });
    place(g, toonMesh(GEO.cylinder, '#e8c36a', { position: [0, 0, 0.6], scale: [0.28, 0.9, 0.28], outline: 0.025 }));
    place(g, toonMesh(GEO.sphere, '#e8c36a', { position: [0, 1.1, 0.6], scale: [0.24, 0.24, 0.24], outline: 0.025 }));
    obstacles.push({ x: lot.x, z: lot.z + 0.6, r: 0.4 });
    world.add(g);
    labels.push({ x: lot.x, y: 1.8, z: lot.z, text: lot.label });
  }

  /**
   * 맥주집: 주황 차양 아래 나무 카운터, 뒤 선반에 맥주잔 · 맥주통, 앞에 동그란 의자 셋, 처마 끝에 빨간 등(밤에 켜진다),
   * 지붕 위에 거품 가득한 커다란 맥주잔 간판. 저녁이면 쿠리만쥬가 카운터 앞 왼쪽 자리에 와서 한 잔 한다.
   */
  function pub(lot) {
    const { x, z } = lot, g = new THREE.Group(), wood = '#b98a5e', dark = '#8a6240';
    g.position.set(x, 0, z);
    // 집처럼 내 캐릭터를 가리면 반투명해진다(재질을 따로 둔다)
    const mats = new Map(), meshes = [];
    const mat = (c) => { if (!mats.has(c)) { const m = toonMaterial(c, { unique: true }); m.transparent = true; mats.set(c, m); } return mats.get(c); };
    const pp = (parent, geo, c, opts) => { const m = place(parent, toonMesh(geo, null, { ...opts, material: mat(c) })); meshes.push(m); return m; };
    // 카운터(앞판은 진한 나무, 위는 밝은 상판)
    pp(g, GEO.box, dark, { position: [0, 0.45, 0.1], scale: [2.3, 0.9, 0.5], shell: true });
    pp(g, GEO.box, '#d8b48c', { position: [0, 0.94, 0.12], scale: [2.45, 0.08, 0.66], shell: true });
    [-0.75, 0, 0.75].forEach((px) => pp(g, GEO.box, '#a77a52', { position: [px, 0.45, 0.36], scale: [0.04, 0.8, 0.02], outline: false, shadow: false }));
    // 뒤 기둥 · 앞 기둥 · 차양 지붕
    [[-1.15, -0.55], [1.15, -0.55], [-1.15, 0.45], [1.15, 0.45]].forEach(([px, pz]) => pp(g, GEO.box, wood, { position: [px, 1.15, pz], scale: [0.09, 2.3, 0.09], shell: true }));
    pp(g, ROOF, lot.roof || '#e9884f', { position: [0, 2.25, -0.05], scale: [2.75, 0.55, 1.45], shell: true });
    // 차양 끝 흰 줄무늬(노렌 느낌)
    [-0.9, -0.3, 0.3, 0.9].forEach((px) => pp(g, GEO.box, '#fff3e0', { position: [px, 2.0, 0.66], scale: [0.48, 0.34, 0.03], shell: true, outline: 0.015, shadow: false }));
    // 뒤 선반: 맥주잔 줄 · 맥주통
    pp(g, GEO.box, wood, { position: [0, 1.35, -0.5], scale: [2.1, 0.06, 0.28], shell: true, shadow: false });
    [-0.75, -0.4, -0.05, 0.3].forEach((px) => {
      pp(g, GEO.cylinder, '#f6c453', { position: [px, 1.38, -0.5], scale: [0.09, 0.2, 0.09], outline: 0.012, shadow: false });
      pp(g, GEO.sphere, '#ffffff', { position: [px, 1.6, -0.5], scale: [0.1, 0.06, 0.1], outline: 0.01, shadow: false });
    });
    pp(g, GEO.cylinder, '#b07a4a', { position: [0.82, 0.98, -0.42], rotation: [0, 0, Math.PI / 2], scale: [0.26, 0.5, 0.26], outline: 0.02, shadow: false });
    [0.66, 0.98].forEach((px) => pp(g, GEO.cylinder, '#5a5560', { position: [px, 0.98, -0.42], rotation: [0, 0, Math.PI / 2], scale: [0.27, 0.04, 0.27], outline: false, shadow: false }));
    // 카운터 위 생맥주 꼭지
    pp(g, GEO.cylinder, '#c9ced6', { position: [-0.55, 0.98, -0.02], scale: [0.05, 0.32, 0.05], outline: 0.012, shadow: false });
    pp(g, GEO.box, '#c9ced6', { position: [-0.55, 1.3, 0.04], scale: [0.06, 0.05, 0.16], outline: 0.012, shadow: false });
    // 앞 동그란 의자 셋
    [-0.8, 0, 0.8].forEach((px) => {
      pp(g, GEO.cylinder, '#e9884f', { position: [px, 0.42, 0.95], scale: [0.22, 0.08, 0.22], outline: 0.02 });
      pp(g, GEO.cylinder, dark, { position: [px, 0, 0.95], scale: [0.05, 0.42, 0.05], outline: 0.012, shadow: false });
    });
    // 처마 끝 빨간 등 둘(밤에 불이 들어온다)
    const lantern = mat('#f2604f');
    windows.push(lantern);
    [-1.25, 1.25].forEach((px) => {
      pp(g, GEO.box, dark, { position: [px, 1.92, 0.62], scale: [0.03, 0.18, 0.03], outline: false, shadow: false });
      pp(g, GEO.sphere, '#f2604f', { position: [px, 1.68, 0.62], scale: [0.17, 0.24, 0.17], outline: 0.018, shadow: false });
      pp(g, GEO.cylinder, '#3a3236', { position: [px, 1.42, 0.62], scale: [0.1, 0.04, 0.1], outline: false, shadow: false });
    });
    // 지붕 위 커다란 맥주잔 간판
    const sign = new THREE.Group();
    sign.position.set(0, 2.62, 0.1);
    pp(sign, GEO.cylinder, '#f6c453', { position: [0, 0, 0], scale: [0.3, 0.55, 0.3], outline: 0.025 });
    pp(sign, GEO.sphere, '#ffffff', { position: [0, 0.58, 0], scale: [0.36, 0.17, 0.36], outline: 0.02 });
    pp(sign, GEO.sphere, '#ffffff', { position: [0.16, 0.64, 0.1], scale: [0.16, 0.12, 0.16], outline: 0.015 });
    pp(sign, new THREE.TorusGeometry(0.17, 0.05, 8, 20, Math.PI), '#f6c453', { position: [0.3, 0.28, 0], rotation: [0, 0, -Math.PI / 2], scale: [1, 1, 1], outline: 0.015 });
    g.add(sign);
    world.add(g);
    obstacles.push({ x, z: z - 0.05, r: lotRadius(lot), soft: true });
    solid(g, g.children, true);
    houses.push({ x, z, half: 1.4, mats: [...mats.values()], meshes, fade: 1 });
    labels.push({ x, y: 3.6, z, text: lot.label });
  }

  // ---------- 마을 건물: layout 의 자리(LOTS)마다 남쪽(카메라 쪽)을 보고 짓는다 ----------
  const homes = {};
  for (const lot of LOTS) {
    if (lot.kind === 'house') {
      const d = building(lot, DESIGNS[lot.id]);
      labels.push({ x: lot.x, y: d.H + 0.55, z: lot.z, text: lot.label });
    } else if (lot.kind === 'dome') {
      const d = dome(lot.x, lot.z, lot.s, lot.yaw || 0);
      labels.push({ x: lot.x, y: d.R + 0.9, z: lot.z, text: lot.label });
    } else if (lot.kind === 'stall') stall(lot);
    else if (lot.kind === 'board') board(lot);
    else if (lot.kind === 'bench') bench(lot);
    else if (lot.kind === 'dojo') dojo(lot);
    else if (lot.kind === 'pub') pub(lot);
    else if (lot.kind === 'raffle') raffle(lot);
    if (lot.home) homes[lot.home] = doorSpot(lot);
    else spots[lot.id] = doorSpot(lot);
  }
  spots.plaza = { x: 0.3, z: 1.2 };
  spots.entrance = { x: 0.1, z: VILLAGE_R - 4 };

  // ---------- 마을 울타리: 동그랗게 두르고 문 넷만 비운다 ----------
  const RING = VILLAGE_R + 0.5;
  const nearGate = (x, z) => Object.values(GATES).some((g) => Math.hypot(x - (g.x * RING) / VILLAGE_R, z - (g.z * RING) / VILLAGE_R) < GATE_HALF - 0.45); // 문 기둥 바로 옆까지 막는다
  {
    const posts = [], rails = [], UP = new THREE.Vector3(0, 1, 0);
    const steps = Math.round((Math.PI * 2 * RING) / 1.6);
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2, x = Math.sin(a) * RING, z = Math.cos(a) * RING;
      if (nearGate(x, z)) { prev = null; continue; }
      posts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.32, z), new THREE.Quaternion(), new THREE.Vector3(0.13, 0.64, 0.13)));
      if (prev) {
        const len = Math.hypot(x - prev.x, z - prev.z), yaw = Math.atan2(x - prev.x, z - prev.z);
        for (const y of [0.45, 0.22]) {
          rails.push(new THREE.Matrix4().compose(new THREE.Vector3((prev.x + x) / 2, y, (prev.z + z) / 2), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(0.06, 0.08, len)));
        }
      }
      prev = { x, z };
    }
    world.add(toonInstances(GEO.box, '#efdbbb', posts, { shell: true }));
    world.add(toonInstances(GEO.box, '#efdbbb', rails, { shell: true, shadow: false }));
    const n = Math.round((Math.PI * 2 * RING) / 0.8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.sin(a) * RING, z = Math.cos(a) * RING;
      if (!nearGate(x, z)) obstacles.push({ x, z, r: 0.35 });
    }
  }

  // ---------- 마을 문 넷: 나무 기둥 둘 · 간판 · 문 앞 화분 ----------
  // 문은 재질을 따로 두어, 바로 뒤를 지나는 내 캐릭터를 가리지 않게 반투명하게 만든다
  const gates = [];
  /** (gx, gz) 에 나무 문을 세운다. yaw 는 돌린 각(남북 문 0, 동서 문 π/2), title 은 간판 글. */
  function gate(gx, gz, yaw, title) {
    const g = new THREE.Group(), wood = '#c49a6c';
    g.position.set(gx, 0, gz);
    g.rotation.y = yaw;
    const gt = { x: gx, z: gz, mats: [], meshes: [], fade: 1 };
    const fadeMat = (color) => { const m = toonMaterial(color, { unique: true }); m.transparent = true; gt.mats.push(m); return m; };
    const gatePart = (geo, color, opts) => { const mesh = place(g, toonMesh(geo, null, { ...opts, material: fadeMat(color) })); gt.meshes.push(mesh); return mesh; };
    [-1.45, 1.45].forEach((x) => {
      gatePart(GEO.box, wood, { position: [x, 1.15, 0], scale: [0.24, 2.3, 0.24], shell: true });
      gatePart(GEO.sphere, '#f4a091', { position: [x, 2.38, 0], scale: [0.2, 0.14, 0.2], outline: 0.02 });
      // 기둥 장애물: 문을 돌린 방향에 맞춰 양쪽에
      obstacles.push({ x: gx + Math.cos(yaw) * x, z: gz - Math.sin(yaw) * x, r: 0.25 });
      // 문 앞 화분
      place(g, toonMesh(GEO.cylinder, '#d8a47f', { position: [x * 1.45, 0, 0.5], scale: [0.22, 0.32, 0.22], outline: 0.02 }));
      ['#ffd6e2', '#fff1a8', '#ffffff'].forEach((c, i) => {
        place(g, toonMesh(GEO.dot, c, { position: [x * 1.45 + (i - 1) * 0.1, 0.38, 0.5 + (i % 2) * 0.06], scale: [0.08, 0.08, 0.08], outline: false, shadow: false }));
      });
    });
    gatePart(GEO.box, '#f5ead2', { position: [0, 2.05, 0], scale: [3.0, 0.48, 0.12], shell: true });
    gatePart(ROOF, '#f4a091', { position: [0, 2.3, 0], scale: [3.5, 0.36, 0.5], shell: true });
    world.add(g);
    labels.push({ x: gx, y: 3.1, z: gz, text: title });
    gates.push(gt);
  }
  gate(GATES.south.x, GATES.south.z, 0, '치이카와 마을');
  gate(GATES.north.x, GATES.north.z, 0, '바위산 가는 길');
  gate(GATES.west.x, GATES.west.z, Math.PI / 2, '숲 가는 길');
  gate(GATES.east.x, GATES.east.z, Math.PI / 2, '들판 가는 길');

  // ---------- 울타리 밖 네 구역: 월드를 묶음으로 나눠 멀리 있는 묶음은 그리지 않는다 ----------
  const zones = createZones(world, { size: 20, half: WORLD_HALF, view: 56 });
  const outdoors = buildOutdoors({ world, zones, obstacles, rand, tree, labels, spots });

  /** (x, z) 에 반지름 radius 만큼 설 수 있는지. soft 면 지나갈 수 있는 덤불도 피한다(무언가를 놓을 자리 고를 때). */
  function isFree(x, z, radius = 0.35, soft = false) {
    if (Math.max(Math.abs(x), Math.abs(z)) > WALK_HALF) return false;
    if (shoreDist(x, z) < radius * 0.6) return false; // 물에는 들어가지 않는다(다리 위는 물이 아니다)
    return !obstacles.hits(x, z, radius, soft);
  }

  // ---------- 가로등: 길을 따라 서 있다가 밤이 되면 불이 들어온다 ----------
  // 진짜 빛 대신 램프의 발광 + 은은한 후광 + 바닥의 빛 웅덩이로 흉내 낸다(휴대폰에서도 가볍게)
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g2 = c.getContext('2d'), grd = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = grd;
    g2.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const lampGlass = toonMaterial('#f3eedf', { unique: true });
  const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd98c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc56b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolGeo = new THREE.CircleGeometry(1.9, 28).rotateX(-Math.PI / 2);
  function lamp(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    place(g, toonMesh(GEO.cylinder, '#4a3f48', { scale: [0.17, 0.12, 0.17] }));
    place(g, toonMesh(GEO.cylinder, '#4a3f48', { scale: [0.06, 1.62, 0.06] }));
    place(g, toonMesh(GEO.sphere, null, { position: [0, 1.72, 0], scale: [0.17, 0.19, 0.17], material: lampGlass, shadow: false }));
    place(g, toonMesh(GEO.cone, '#4a3f48', { position: [0, 1.84, 0], scale: [0.23, 0.15, 0.23] }));
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(0, 1.72, 0);
    halo.scale.set(1.8, 1.8, 1);
    g.add(halo);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.y = 0.05;
    pool.renderOrder = 1;
    g.add(pool);
    world.add(g);
    obstacles.push({ x, z, r: 0.22 });
  }
  // 마을 안 길마다 7칸 간격으로 번갈아 한쪽에(한쪽이 막혔으면 반대편에)
  for (const road of ROADS) {
    for (let k = 1; k < road.pts.length; k++) {
      const [ax, az] = road.pts[k - 1], [bx, bz] = road.pts[k];
      const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
      for (let d = 3; d < len; d += 7) {
        const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
        if (Math.hypot(x, z) > VILLAGE_R - 2) continue;
        const off = (Math.round(d / 7) % 2 ? 1 : -1) * (road.w / 2 + 0.8);
        const ok = [[x + nx * off, z + nz * off], [x - nx * off, z - nz * off]]
          .find(([px, pz]) => isFree(px, pz, 0.6, true) && roadDist(px, pz) > 0.2 && shoreDist(px, pz) > 1.2);
        if (ok) lamp(ok[0], ok[1]);
      }
    }
  }

  // 마을 나무: 길 · 건물 · 물을 피해 약 46그루(다섯에 하나는 꽃나무, 셋에 하나는 덤불)
  for (let k = 0, made = 0; k < 500 && made < 46; k++) {
    const a = rand() * Math.PI * 2, r = 7 + rand() * 19, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (roadDist(x, z) < 1.6 || shoreDist(x, z) < 1.5 || !isFree(x, z, 1.4, true)) continue;
    if (LOTS.some((l) => Math.hypot(l.x - x, l.z - z) < lotRadius(l) + 2.4)) continue;
    made++;
    if (made % 5 === 0) tree(x, z, 0.95 + rand() * 0.2, '#ffb6cd');
    else if (made % 3 === 0) bush(x, z, 0.85 + rand() * 0.2);
    else tree(x, z, 1.0 + rand() * 0.3);
  }

  // 꽃(마을 안만): 색마다 인스턴스 메시 하나
  const flowerColors = ['#ffffff', '#ffa8c6', '#ffe36e', '#c9a8ff', '#ff9a9a', '#8fd3ff'];
  const flowerSpots = flowerColors.map(() => []);
  for (let k = 0; k < 1400; k++) {
    const fx = (rand() - 0.5) * 56, fz = (rand() - 0.5) * 56;
    if (Math.hypot(fx, fz) > VILLAGE_R - 1 || roadDist(fx, fz) < 0.3 || shoreDist(fx, fz) < 0.6 || !isFree(fx, fz, 0.05, true)) continue;
    flowerSpots[k % flowerColors.length].push([fx, fz]);
  }
  const m4 = new THREE.Matrix4();
  flowerColors.forEach((c, i) => {
    const list = flowerSpots[i];
    const petals = new THREE.InstancedMesh(GEO.dot, toonMaterial(c), list.length);
    list.forEach(([fx, fz], j) => petals.setMatrixAt(j, m4.compose(new THREE.Vector3(fx, 0.07, fz), new THREE.Quaternion(), new THREE.Vector3(0.09, 0.07, 0.09))));
    world.add(petals);
  });

  // 먼 언덕과 구름
  for (let h = 0; h < 26; h++) {
    const a = (h / 26) * Math.PI * 2 + rand() * 0.3, d = 104 + rand() * 10, w = 10 + rand() * 5;
    world.add(toonMesh(GEO.sphere, h % 2 ? '#aee08f' : '#95d488', { position: [Math.sin(a) * d, -0.6, Math.cos(a) * d], scale: [w, 4 + rand() * 4, w], outline: false, shadow: false }));
  }
  for (let c = 0; c < 10; c++) {
    const g = new THREE.Group();
    [[0, 0, 0, 1.3], [1.2, -0.2, 0.2, 0.95], [-1.2, -0.25, 0, 0.9], [0.5, 0.45, -0.2, 0.85], [-0.5, 0.35, 0.3, 0.8]].forEach(([px, py, pz, r]) => {
      g.add(toonMesh(GEO.sphere, '#ffffff', { position: [px, py, pz], scale: [r, r * 0.75, r], outline: 0.06, shadow: false }));
    });
    // 카메라(최대 높이 약 17, 마을 남쪽)와 내 캐릭터 사이를 지나가지 않게: 모두 북쪽 먼 하늘, 카메라보다 높은 곳
    g.position.set((rand() - 0.5) * 220, 19 + rand() * 7, -60 - rand() * 40);
    g.scale.setScalar(1.3 + rand() * 1.4);
    g.userData.speed = 0.25 + rand() * 0.35;
    world.add(g);
    clouds.push(g);
  }

  // 나비: 꽃밭 위를 팔랑팔랑 날아다닌다
  const butterflies = [];
  const flyTarget = () => { const a = rand() * Math.PI * 2, r = 2 + rand() * 22; return { x: Math.sin(a) * r, z: Math.cos(a) * r }; };
  ['#ffffff', '#ffe36e', '#ffb7cf', '#c9a8ff', '#ffffff', '#ffe36e', '#ffb7cf', '#8fd3ff', '#ffffff'].forEach((color) => {
    const g = new THREE.Group();
    const wings = [-1, 1].map((sd) => {
      const pivot = new THREE.Group();
      pivot.add(toonMesh(GEO.dot, color, { position: [sd * 0.075, 0, 0], scale: [0.08, 0.008, 0.065], outline: 0.008, shadow: false }));
      g.add(pivot);
      return pivot;
    });
    g.add(toonMesh(GEO.dot, '#2b2224', { scale: [0.013, 0.013, 0.05], outline: false, shadow: false }));
    const p = flyTarget(), q = flyTarget();
    g.position.set(p.x, 1, p.z);
    world.add(g);
    butterflies.push({ g, wings, tx: q.x, tz: q.z, phase: rand() * 6, speed: 0.7 + rand() * 0.6 });
  });

  let nightK = -1;

  // ---------- 길찾기: 월드 전체 0.5 칸 격자(칸마다 처음 볼 때 그때까지 놓인 단단한 장애물 · 물로 정한다) ----------
  const NAV = 0.5, NAV_N = Math.ceil((WORLD_HALF * 2) / NAV), NAV_R = 0.38;
  const nav = new Uint8Array(NAV_N * NAV_N); // 0 아직 모름 · 1 열림 · 2 막힘
  const navPos = (i, j) => [-WORLD_HALF + (i + 0.5) * NAV, -WORLD_HALF + (j + 0.5) * NAV];
  const navCell = (x, z) => [Math.min(NAV_N - 1, Math.max(0, Math.floor((x + WORLD_HALF) / NAV))), Math.min(NAV_N - 1, Math.max(0, Math.floor((z + WORLD_HALF) / NAV)))];
  function navBlocked(i, j) {
    const k = j * NAV_N + i;
    if (!nav[k]) { const [x, z] = navPos(i, j); nav[k] = isFree(x, z, NAV_R) ? 1 : 2; }
    return nav[k] === 2;
  }
  /** 막힌 칸이면 가장 가까운 열린 칸. */
  function nearestOpen([i, j]) {
    if (!navBlocked(i, j)) return [i, j];
    for (let r = 1; r < 8; r++) {
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ni = i + di, nj = j + dj;
        if (ni >= 0 && nj >= 0 && ni < NAV_N && nj < NAV_N && !navBlocked(ni, nj)) return [ni, nj];
      }
    }
    return null;
  }
  /** a 에서 b 까지 곧장 걸어갈 수 있는지(0.25 마다 확인). */
  const clearLine = (a, b) => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25);
    for (let k = 1; k < n; k++) if (!isFree(a[0] + (b[0] - a[0]) * (k / n), a[1] + (b[1] - a[1]) * (k / n), NAV_R - 0.04)) return false;
    return true;
  };

  /** (ox, oz) 에서 (nx, nz) 로 가려 할 때 실제로 갈 자리: 막히면 장애물을 따라 미끄러진다(core/obstacles.js slideMove). */
  const move = (ox, oz, nx, nz, radius = 0.35) => slideMove(isFree, obstacles.pushOut, ox, oz, nx, nz, radius);

  return {
    /** 그림 간판도 마을 빛(낮 · 밤)에 맞춰 어둡게 한다. */
    tintSigns(color) { for (const m of signs) m.color.copy(color); },
    /** 경품 추첨 가라가라 통(추첨할 때 돌린다). */
    get raffleDrum() { return raffleDrum; },
    group: world,
    obstacles,
    move,
    labels,
    spots,
    /** 친구 집 문 앞: { chiikawa, usagi, kurimanju, momonga, rakko }. */
    homes,
    /** 월드 묶음(멀리 있는 묶음은 감춘다). */
    zones,
    /** 입장 연출: 마을 밖 출발점, 문 위치, 도착점. */
    entrance: { outside: { x: 0.2, z: 46 }, gateZ: VILLAGE_R, inside: { x: 0.1, z: VILLAGE_R - 4 } },
    isFree,
    /** (x, z) 에서 가장 가까운 빈 자리. */
    nearestFree(x, z, radius = 0.35) {
      if (isFree(x, z, radius)) return { x, z };
      for (let r = 0.3; r < 6; r += 0.3) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r;
          if (isFree(nx, nz, radius)) return { x: nx, z: nz };
        }
      }
      return { ...spots.plaza };
    },
    /** 잡초가 자랄 수 있는 빈 풀밭 한 곳. */
    randomFreeSpot(random, minR, maxR) {
      for (let i = 0; i < 60; i++) {
        const a = random() * Math.PI * 2, r = minR + random() * (maxR - minR);
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        const nearSpot = Object.values(spots).some((s) => Math.hypot(s.x - x, s.z - z) < 2.5);
        if (!nearSpot && isFree(x, z, 0.6, true) && roadDist(x, z) > 0.25 && shoreDist(x, z) > 1.0) return { x, z };
      }
      return null;
    },
    /**
     * from 에서 to 까지 집 · 나무 · 울타리를 돌아가는 길: 꺾이는 점들 [{ x, z }] (곧장 갈 수 있으면 [to]). 길이 없으면 null.
     */
    findPath(from, to) {
      if (clearLine([from.x, from.z], [to.x, to.z])) return [{ x: to.x, z: to.z }];
      const s = nearestOpen(navCell(from.x, from.z)), g = nearestOpen(navCell(to.x, to.z));
      if (!s || !g) return null;
      const cells = astar(NAV_N, NAV_N, navBlocked, s, g, 60000);
      if (!cells) return null;
      const pts = [[from.x, from.z], ...cells.slice(1).map(([i, j]) => navPos(i, j))];
      if (isFree(to.x, to.z, 0.3)) pts.push([to.x, to.z]);
      return smoothPath(pts, clearLine).slice(1).map(([x, z]) => ({ x, z }));
    },
    /** 밤 정도(0 낮 ~ 1 밤): 가로등과 집 창문에 불을 켜고, 바깥 구역의 빛나는 것(버섯)을 밝힌다. */
    setNight(k) {
      if (Math.abs(k - nightK) < 0.01) return;
      nightK = k;
      lampGlass.emissive.setRGB(1, 0.86, 0.55).multiplyScalar(k);
      haloMat.opacity = 0.85 * k;
      poolMat.opacity = 0.5 * k;
      windows.forEach((m) => { if (m) m.emissive.setRGB(1, 0.78, 0.4).multiplyScalar(0.85 * k); });
      outdoors.glow.forEach((m) => m.emissive.setRGB(0.45, 0.85, 1).multiplyScalar(k));
    },
    /**
     * 먼 묶음은 감추고, focus(내 캐릭터)와 카메라 사이를 가리는 나무 · 집 · 문을 반투명하게. 카메라는 남쪽(+z)에 있다.
     * others: 내 둘레 몬스터 자리 — 위에서 내려다보는 화면이라 나무 앞(남쪽)에 선 몬스터는 우듬지에 통째로 가려지므로 그 나무도 반투명하게.
     */
    update(dt, focus, others = []) {
      if (focus) {
        zones.update(focus);
        // 이 나무가 그 자리(p)를 카메라에서 가리는지: 나무가 조금 남쪽(카메라 쪽)에 있고 옆으로 가까우면
        const covers = (t, p) => { const z = t.z - p.z, x = Math.abs(t.x - p.x); return z > -0.3 && z < 4.5 * t.s && x < 1.5 * t.s; };
        // 나무: 멀리 있고 이미 불투명한 나무는 건너뛴다(바깥 길가 나무까지 더해 많다)
        for (const t of trees) {
          const dz = t.z - focus.z, dx = Math.abs(t.x - focus.x);
          const nearOthers = others.length > 0 && dx < 22 && dz > -20 && dz < 10;
          if (t.fade === 1 && (dx > 6 || dz < -1 || dz > 8) && !nearOthers) continue;
          const hiding = covers(t, focus) || (nearOthers && others.some((p) => covers(t, p)));
          t.fade += ((hiding ? 0.3 : 1) - t.fade) * Math.min(1, dt * 8);
          if (t.fade > 0.995) t.fade = 1;
          t.mats.forEach((m) => { m.opacity = t.fade; m.depthWrite = t.fade > 0.95; });
          t.canopy.forEach((c) => { c.children[0].visible = t.fade > 0.95; });
        }
        // 집: 내 캐릭터보다 카메라 쪽(남쪽)에 있으면서 옆으로 가까우면 반투명하게
        for (const h of houses) {
          const dz = h.z - focus.z, dx = Math.abs(h.x - focus.x);
          const hiding = dz > -0.6 && dz < h.half + 5 && dx < h.half + 0.9;
          h.fade += ((hiding ? 0.3 : 1) - h.fade) * Math.min(1, dt * 8);
          h.mats.forEach((m) => { m.opacity = h.fade; m.depthWrite = h.fade > 0.95; });
          h.meshes.forEach((m) => { if (m.children[0]) m.children[0].visible = h.fade > 0.95; });
        }
        // 문: 내 캐릭터가 문 바로 뒤(북쪽)에 있으면 반투명하게
        for (const gt of gates) {
          const dz = gt.z - focus.z, dx = Math.abs(gt.x - focus.x);
          const under = dz > -0.4 && dz < 6 && dx < 3;
          gt.fade += ((under ? 0.3 : 1) - gt.fade) * Math.min(1, dt * 8);
          gt.mats.forEach((m) => { m.opacity = gt.fade; m.depthWrite = gt.fade > 0.95; });
          gt.meshes.forEach((m) => { if (m.children[0]) m.children[0].visible = gt.fade > 0.95; });
        }
      }
      for (const b of butterflies) {
        b.phase += dt * 16;
        const flap = Math.sin(b.phase) * 0.9;
        b.wings[0].rotation.z = flap;
        b.wings[1].rotation.z = -flap;
        const dx = b.tx - b.g.position.x, dz = b.tz - b.g.position.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { const n = flyTarget(); b.tx = n.x; b.tz = n.z; }
        else {
          b.g.position.x += (dx / d) * b.speed * dt;
          b.g.position.z += (dz / d) * b.speed * dt;
          b.g.rotation.y = Math.atan2(dx, dz);
        }
        b.g.position.y = 0.8 + Math.sin(b.phase * 0.12) * 0.35;
      }
      clouds.forEach((g) => {
        g.position.x += g.userData.speed * dt;
        if (g.position.x > 120) g.position.x -= 240;
      });
    }
  };
}
