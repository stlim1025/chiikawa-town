import * as THREE from 'three';
import { toonMaterial, toonMesh, toonInstances, GEO } from '../render/toon.js';
import { WORLD_HALF, VILLAGE_R, RIVER, BRIDGES, BRIDGE_LEN, BRIDGE_TOP, BRIDGE_RAMP, LAKE, SOUTH_SHORE, CAVE, CLIFF, PIER, BOSS_LAIRS, ARENAS, ARENA_WALL, doorAngle, riverZ, roadDist, shoreDist } from '../core/layout.js';
import { buildLairs } from './lairs.js';

const UP = new THREE.Vector3(0, 1, 0);
const m4 = (x, y, z, sx, sy, sz, yaw = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(sx, sy, sz));
const TREE_PARTS = [[0, 1.65, 0, 0.82], [0.48, 1.35, 0.18, 0.58], [-0.42, 1.42, -0.12, 0.6], [0.05, 1.3, -0.45, 0.55]];
const FLOWER = ['#ffffff', '#ffa8c6', '#ffe36e', '#c9a8ff', '#ff9a9a', '#8fd3ff'];

/**
 * 마을 밖 네 구역을 짓는다: 서쪽 숲, 북쪽 바위산(하치와레 동굴 · 빛나는 버섯 · 절벽), 동쪽 들판 · 둔덕, 남쪽 강 · 다리 · 호수 · 바다.
 * 반복되는 나무 · 바위 · 꽃 · 갈대는 묶음(zones)마다 인스턴스로 그리고, 길가 나무만 ctx.tree 로 지어 내 캐릭터를 가리면 반투명해지게 한다.
 * ctx: { world, zones, obstacles, rand, tree(x, z, s, leaf, parent), labels, spots } → { glow: 밤에 빛나는 재질 목록 }
 */
export function buildOutdoors(ctx) {
  const { world, zones, obstacles, rand, tree, labels, spots } = ctx;
  const glow = [];
  const outside = (x, z) => Math.hypot(x, z) > VILLAGE_R + 3;
  // 종류 → { geo, color, opts, byZone: Map(묶음 그룹 → 행렬 목록) }
  const batches = new Map();
  function addInstance(kind, geo, color, opts, x, z, matrix) {
    let b = batches.get(kind);
    if (!b) batches.set(kind, (b = { geo, color, opts, byZone: new Map() }));
    const g = zones.groupAt(x, z);
    if (!b.byZone.has(g)) b.byZone.set(g, []);
    b.byZone.get(g).push(matrix);
  }
  /** 숲속 나무 하나(인스턴스): 줄기 + 잎 넷. */
  function forestTree(x, z, s, leaf) {
    const yaw = rand() * 6, c = Math.cos(yaw), sn = Math.sin(yaw);
    addInstance('trunk', GEO.cylinder, '#b88c66', { outline: 0.03 }, x, z, m4(x, 0, z, 0.16 * s, 1.1 * s, 0.16 * s));
    for (const [px, py, pz, r] of TREE_PARTS) {
      const wx = x + (px * c + pz * sn) * s, wz = z + (-px * sn + pz * c) * s;
      addInstance('leaf' + leaf, GEO.sphereMid, leaf, { outline: 0.04 }, x, z, m4(wx, py * s, wz, r * s, r * 0.92 * s, r * s));
    }
    obstacles.push({ x, z, r: 0.6 * s });
  }

  const ELDER = BOSS_LAIRS.elder;
  const inLair = (x, z, pad = 0) => Object.values(BOSS_LAIRS).some((L) => Math.hypot(x - L.x, z - L.z) < L.r + pad);
  /** 보스 마당 자리(벽 둘레까지)와 입구 앞마당: 나무 · 바위를 비운다. */
  const arenaClear = (x, z) => ARENAS.some((A) => {
    if (Math.hypot(x - A.x, z - A.z) < A.r + ARENA_WALL + 1.2) return true;
    const a = doorAngle(A), d = A.r + ARENA_WALL + 1.8;
    return Math.hypot(x - (A.x + Math.sin(a) * d), z - (A.z + Math.cos(a) * d)) < 2.8;
  });
  // ---------- 서쪽 숲: 빽빽한 나무와 빈터, 길가는 반투명해지는 나무, 서쪽 끝은 빈틈없이 ----------
  for (let x = -WORLD_HALF + 1; x < -VILLAGE_R - 2; x += 3.2) {
    for (let z = -WORLD_HALF + 1; z < WORLD_HALF - 1; z += 3.2) {
      const px = x + (rand() - 0.5) * 2.4, pz = z + (rand() - 0.5) * 2.4, edge = px < -70;
      if (!edge && Math.abs(pz) > Math.abs(px) + 4) continue; // 대각선 너머는 이웃 구역(바위산 · 강가)
      if (!outside(px, pz) || shoreDist(px, pz) < 1.5) continue;
      const rd = roadDist(px, pz);
      if (rd < 2.2 || (!edge && rand() < 0.22)) continue; // 길과 숲속 빈터
      const s = 0.95 + rand() * 0.45, leaf = rand() < 0.5 ? '#5fb36e' : '#6cc77e';
      if (arenaClear(px, pz)) rand(); // 고목 거인 마당 · 입구 앞: 나무는 빼되 난수(나무 방향 — tree · forestTree 둘 다 한 번)는 그대로 써서 뒤 나무 · 바위 자리가 바뀌지 않게
      else if (rd < 5) tree(px, pz, s, leaf, zones.groupAt(px, pz));
      // 빈터 남쪽(카메라 쪽) 나무는 싸움을 가리면 반투명해지는 나무로(이것도 난수를 한 번 쓴다)
      else if (pz > ELDER.z && pz < ELDER.z + ELDER.r + 8 && Math.abs(px - ELDER.x) < ELDER.r + 3) tree(px, pz, s, leaf, zones.groupAt(px, pz));
      else forestTree(px, pz, s, leaf);
    }
  }

  // ---------- 북쪽 바위산 ----------
  const ROCK = ['#a39486', '#8f8174', '#b3a597'];
  for (let k = 0; k < 900; k++) {
    const x = (rand() - 0.5) * 152, z = -VILLAGE_R - 4 - rand() * 40;
    if (rand() < 0.75 || Math.abs(x) > Math.abs(z) + 4 || roadDist(x, z) < 2 || Math.hypot(x - CAVE.x, z - CAVE.z) < 8) continue;
    const s = 0.5 + rand() * 1.2, mat = m4(x, 0, z, s * (1 + rand() * 0.4), s * (0.6 + rand() * 0.3), s, rand() * 6);
    if (arenaClear(x, z)) continue; // 왕버섯 굴 마당 · 입구 앞(난수는 위에서 다 썼다 — 뒤 바위 자리가 바뀌지 않게)
    addInstance('rock' + (k % 3), GEO.sphereMid, ROCK[k % 3], { outline: 0.045, receive: true }, x, z, mat);
    obstacles.push({ x, z, r: s * 1.05 });
  }
  // 북쪽 끝 절벽: 큰 바위를 이어 붙인다
  for (let x = -WORLD_HALF; x <= WORLD_HALF; x += 4.5) {
    const z = -72 - rand() * 3, s = 3.2 + rand() * 1.6;
    addInstance('cliff', GEO.sphereMid, '#8f8174', { outline: 0.06, receive: true }, x, z, m4(x, 0, z, s * 1.2, s * 1.6, s));
    obstacles.push({ x, z, r: s * 1.1 });
  }
  // 하치와레 동굴: 바위 덩어리에 문 없이 뚫린 입구(원작처럼 문이 없다)
  {
    const g = new THREE.Group(), R = CAVE.r;
    g.position.set(CAVE.x, 0, CAVE.z);
    g.add(toonMesh(GEO.sphere, '#a39486', { scale: [R * 1.5, R * 1.15, R * 1.2], receive: true, outline: 0.06 }));
    g.add(toonMesh(GEO.sphere, '#8f8174', { position: [-R * 1.3, 0, -R * 0.3], scale: [R * 0.9, R * 0.8, R * 0.9], outline: 0.05 }));
    g.add(toonMesh(GEO.sphere, '#b3a597', { position: [R * 1.35, 0, -R * 0.4], scale: [R * 0.75, R * 0.62, R * 0.75], outline: 0.05 }));
    g.add(toonMesh(GEO.sphere, '#2b2224', { position: [0, 0.05, R * 1.16], scale: [0.95, 1.25, 0.2], outline: false, shadow: false }));
    [-0.4, 0, 0.4].forEach((px, i) => g.add(toonMesh(GEO.cone, i % 2 ? '#8fd16a' : '#6fbf5a', { position: [px, R * 1.1, 0], rotation: [0, 0, -px], scale: [0.12, 0.5, 0.12], outline: 0.02 })));
    zones.add(g, CAVE.x, CAVE.z);
    obstacles.push({ x: CAVE.x, z: CAVE.z, r: R * 1.25 }, { x: CAVE.x - R * 1.3, z: CAVE.z - R * 0.3, r: R * 0.9 }, { x: CAVE.x + R * 1.35, z: CAVE.z - R * 0.4, r: R * 0.75 });
    labels.push({ x: CAVE.x, y: R * 1.15 + 1.2, z: CAVE.z, text: '하치와레네 동굴' });
    spots.hachiCave = { ...CAVE.door };
  }
  // 밤에 빛나는 버섯(원작의 야간 채취): 동굴 둘레
  const capMat = toonMaterial('#9fe0ff', { unique: true });
  glow.push(capMat);
  for (let k = 0, made = 0; k < 300 && made < 48; k++) {
    const x = CAVE.x + (rand() - 0.5) * 50, z = CAVE.z + (rand() - 0.5) * 34;
    if (Math.abs(x) > Math.abs(z) + 2 || roadDist(x, z) < 0.6 || obstacles.hits(x, z, 0.3)) continue;
    made++;
    addInstance('stem', GEO.cylinder, '#f3eedf', { outline: 0.015, shadow: false }, x, z, m4(x, 0, z, 0.05, 0.22, 0.05));
    addInstance('cap', GEO.sphereLow, null, { outline: 0.015, shadow: false, material: capMat }, x, z, m4(x, 0.24, z, 0.14, 0.09, 0.14));
  }

  // ---------- 동쪽 들판: 외딴 나무, 꽃밭, 동쪽 끝 둔덕(지나갈 수 없다) ----------
  for (let k = 0, made = 0; k < 80 && made < 16; k++) {
    const x = VILLAGE_R + 8 + rand() * 38, z = (rand() - 0.5) * 100;
    if (Math.abs(z) > x - 4 || roadDist(x, z) < 3 || shoreDist(x, z) < 2 || obstacles.hits(x, z, 1.5)) continue;
    made++;
    tree(x, z, 1.05 + rand() * 0.3, made % 3 ? '#6cc77e' : '#ffb6cd', zones.groupAt(x, z));
  }
  for (let z = -WORLD_HALF; z <= WORLD_HALF; z += 9) {
    const x = 74 + rand() * 4, s = 6 + rand() * 3;
    addInstance('mound' + (Math.abs(z) % 18 ? 0 : 1), GEO.sphere, Math.abs(z) % 18 ? '#aee08f' : '#95d488', { outline: 0.06, receive: true }, x, z, m4(x, -0.8, z, s, 3 + rand() * 2, s));
    obstacles.push({ x, z, r: s * 0.95 });
  }
  for (let k = 0; k < 3200; k++) {
    const x = VILLAGE_R + 2 + rand() * (WORLD_HALF - VILLAGE_R - 6), z = (rand() - 0.5) * 150;
    if (Math.abs(z) > x || roadDist(x, z) < 0.4 || shoreDist(x, z) < 0.6 || obstacles.hits(x, z, 0.05, true) || inLair(x, z)) continue; // 보스 자리 흙바닥에는 꽃이 안 난다
    const c = FLOWER[k % FLOWER.length];
    addInstance('flower' + c, GEO.speck, c, { outline: false, shadow: false }, x, z, m4(x, 0.07, z, 0.09, 0.07, 0.09));
  }

  // ---------- 남쪽 물: 강 띠, 호수, 바다(월드 남쪽 끝) ----------
  const water = toonMaterial('#86d3f2');
  {
    const pos = [], idx = [];
    let i = 0;
    for (let x = -WORLD_HALF - 4; x <= WORLD_HALF + 4; x += 2, i++) {
      const zc = riverZ(x);
      pos.push(x, 0.02, zc - RIVER.half, x, 0.02, zc + RIVER.half);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const river = new THREE.Mesh(geo, water);
    river.receiveShadow = true;
    world.add(river);
  }
  world.add(toonMesh(GEO.cylinder, null, { material: water, position: [LAKE.x, -0.03, LAKE.z], scale: [LAKE.rx, 0.05, LAKE.rz], outline: 0.04, shadow: false, receive: true }));
  // 바다: 절벽 앞 만(灣) 자리는 비운다(world/cliff.js 가 아래로 낮춘 물과 바위벽을 깐다)
  {
    const C = CLIFF.cove, sea = (x0, x1, z0) => world.add(toonMesh(GEO.box, null, { material: water, position: [(x0 + x1) / 2, -0.03, (z0 + 140) / 2], scale: [x1 - x0, 0.1, 140 - z0], outline: false, shadow: false, receive: true }));
    sea(-140, C.x0, SOUTH_SHORE); sea(C.x1, 140, SOUTH_SHORE); sea(C.x0, C.x1, C.z1);
  }
  // 다리: 나무 판과 양쪽 난간, 양 끝은 땅으로 내려오는 비탈 판(올라서도 발이 판에 묻히지 않게 core/layout 의 groundY 와 같은 높이)
  BRIDGES.forEach((b) => {
    const zc = riverZ(b.x), len = BRIDGE_LEN, wood = '#c49a6c', g = new THREE.Group(), T = 0.12;
    g.position.set(b.x, 0, zc);
    g.add(toonMesh(GEO.box, wood, { position: [0, BRIDGE_TOP - T / 2, 0], scale: [b.half * 2 + 0.2, T, len], shell: true, receive: true }));
    const slope = Math.atan2(BRIDGE_TOP, BRIDGE_RAMP), rl = Math.hypot(BRIDGE_TOP, BRIDGE_RAMP);
    [-1, 1].forEach((sd) => g.add(toonMesh(GEO.box, wood, { position: [0, BRIDGE_TOP / 2 - (T / 2) / Math.cos(slope), sd * (len / 2 + BRIDGE_RAMP / 2)], rotation: [sd * slope, 0, 0], scale: [b.half * 2 + 0.2, T, rl], shell: true, receive: true })));
    [-1, 1].forEach((sd) => {
      for (let k = 0; k <= 4; k++) g.add(toonMesh(GEO.box, wood, { position: [sd * (b.half + 0.05), 0.42, -len / 2 + (k / 4) * len], scale: [0.1, 0.56, 0.1], shell: true }));
      g.add(toonMesh(GEO.box, '#a77d5a', { position: [sd * (b.half + 0.05), 0.66, 0], scale: [0.08, 0.08, len], shell: true, shadow: false }));
    });
    zones.add(g, b.x, zc);
  });
  // 갈대: 강가 양쪽(다리 근처는 비운다)
  for (let k = 0; k < 700; k++) {
    const x = (rand() - 0.5) * 156, z = riverZ(x) + (rand() < 0.5 ? -1 : 1) * (RIVER.half + 0.3 + rand() * 1.4);
    if (rand() < 0.5 || BRIDGES.some((b) => Math.abs(x - b.x) < b.half + 1.5) || roadDist(x, z) < 1) continue;
    addInstance('reed' + (k % 2), GEO.cone, k % 2 ? '#7fbf6a' : '#6fae5f', { outline: 0.012, shadow: false }, x, z, m4(x, 0, z, 0.05, 0.55 + rand() * 0.4, 0.05, rand()));
  }
  // 물가 나무 몇 그루
  for (let k = 0, made = 0; k < 60 && made < 10; k++) {
    const x = (rand() - 0.5) * 140, z = 42 + rand() * 26;
    if (shoreDist(x, z) < 2 || roadDist(x, z) < 2.5 || obstacles.hits(x, z, 1.5) || Math.hypot(x - CLIFF.log.x, z - CLIFF.log.z) < 9 || Math.hypot(x - PIER.x, z - SOUTH_SHORE) < 7) continue; // 절벽 위 · 선착장 앞은 탁 트이게
    made++;
    const s = 1.0 + rand() * 0.3;
    if (inLair(x, z, 1.5)) rand(); // 보스 자리 안: 나무는 빼되 난수(나무 방향)는 그대로 써서 뒤 자리가 바뀌지 않게
    else tree(x, z, s, '#6cc77e', zones.groupAt(x, z));
  }

  // 구역 보스 자리(난수를 쓰는 짓기가 다 끝난 뒤에: 그 앞 나무 · 꽃 자리가 바뀌지 않게)
  buildLairs({ zones, obstacles, labels });

  // ---------- 모은 인스턴스를 묶음마다 그린다 ----------
  for (const b of batches.values()) for (const [g, list] of b.byZone) g.add(toonInstances(b.geo, b.color, list, b.opts));
  return { glow };
}
