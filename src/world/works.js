import * as THREE from 'three';
import { toonMaterial, toonMesh, toonInstances, GEO } from '../render/toon.js';
import { mergeUnit } from '../render/batch.js';
import { WORK_IDS, WORK_SPOTS, WORK_SIGNS, outerLampSpots, pavedStrips } from '../core/works.js';
import { PLAZA, VILLAGE_R, GATES, GATE_HALF } from '../core/layout.js';
import { hourOf } from '../core/clock.js';

const PYRAMID = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0).rotateY(Math.PI / 4); // 네모 지붕(면이 앞 · 옆을 본다)
const FLOWER_COLORS = ['#ffa8c6', '#ffe36e', '#ffffff', '#c9a8ff', '#ff9a9a'];

/**
 * 마을 가꾸기 시설(core/works.js)을 마을에 세운다: 광장 꽃밭 · 연못 쉼터 벤치 · 바깥 길 가로등 · 마을 시계탑 · 강가 정자.
 * 처음 보일 때 만들고, 같이 놀기로 친구 마을에 가면 그 마을 모습으로 바꿔 보인다(숨긴 시설은 길도 막지 않는다 — 장애물 off).
 * 다 모였지만 아직 안 생긴 날(공사 중)은 그 자리에 '공사 중' 울타리만 선다.
 * village: buildVillage 가 돌려준 것(group · obstacles · isFree · lamp · signMaterial · refreshNav).
 */
export function createWorks(village) {
  // 바깥 길 가로등 자리: 다른 시설이 서기 전에 한 번 정한다(어느 마을에서나 같은 자리)
  const lampSpots = outerLampSpots({ isFree: (x, z) => village.isFree(x, z, 0.6, true) });
  const shown = {}, built = {}, marks = {};
  const vcMat = toonMaterial('#ffffff', { vertexColors: true });
  const plain = (m) => m.isMeshToonMaterial && !m.userData.keep && !m.map && !m.vertexColors && m.side === THREE.FrontSide && m.emissive.getHex() === 0;
  let hands = null, roof = null, tower = null;

  /** 시설 한 덩어리: (x, z) 에 yaw 만큼 돌려 세운다. 부품은 part 로 붙이고 finish 로 합친다(그리기 몇 번으로). */
  function unit(x, z, yaw = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.userData.parts = [];
    return g;
  }
  const part = (g, geo, color, opts) => { const m = toonMesh(geo, color, opts); g.add(m); g.userData.parts.push(m); return m; };
  function finish(g) {
    mergeUnit(g, g.userData.parts, (m) => (plain(m.material) ? { key: 'vc', material: vcMat, tint: m.material.color } : { key: m.material.uuid, material: m.material, tint: null }));
    village.group.add(g);
    return g;
  }
  /** 덩어리 안 (lx, lz) 의 마을 자리. */
  const at = (g, lx, lz) => { const a = g.rotation.y; return { x: g.position.x + Math.cos(a) * lx + Math.sin(a) * lz, z: g.position.z - Math.sin(a) * lx + Math.cos(a) * lz }; };
  const circle = (g, lx, lz, r) => ({ ...at(g, lx, lz), r });
  const box = (g, lx, lz, hx, hz) => ({ ...at(g, lx, lz), box: { hx, hz, yaw: g.rotation.y } });

  /** 광장 꽃밭: 땅에 박힌 납작한 돌멩이 테두리 안에 봉긋한 흙, 잎 덤불 다섯과 색색 꽃 열한 송이(높은 돌 화분이 아니라 땅에 붙은 화단). */
  function flowerBed({ x, z }, i, obs) {
    const g = unit(x, z), MOUND = 0.72;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + i * 0.3;
      part(g, GEO.sphere, k % 2 ? '#b9ad9a' : '#a69884', { position: [Math.cos(a) * 0.8, 0.03, Math.sin(a) * 0.8], rotation: [0, -a, 0], scale: [0.11, 0.07, 0.15], outline: 0.01, shadow: false });
    }
    part(g, GEO.cylinder, '#6e4a2e', { scale: [0.78, 0.04, 0.78], outline: false, shadow: false });
    part(g, GEO.sphere, '#7d5535', { position: [0, 0.04, 0], scale: [MOUND, 0.1, MOUND], outline: false, shadow: false });
    const soil = (r) => 0.04 + 0.1 * Math.sqrt(Math.max(0, 1 - (r / MOUND) ** 2)); // 흙 더미 겉 높이
    for (let k = 0; k < 5; k++) {
      const a = k * 1.26 + 0.4 + i;
      part(g, GEO.sphere, '#7cc46a', { position: [Math.cos(a) * 0.45, soil(0.45), Math.sin(a) * 0.45], scale: [0.18, 0.08, 0.18], outline: 0.012, shadow: false });
    }
    for (let k = 0; k < 11; k++) {
      const a = k * 2.4 + i, r = k === 0 ? 0 : 0.18 + 0.4 * Math.sqrt(k / 10), fx = Math.cos(a) * r, fz = Math.sin(a) * r, y = soil(r);
      part(g, GEO.box, '#5fa04f', { position: [fx, y + 0.07, fz], scale: [0.02, 0.14, 0.02], outline: false, shadow: false });
      part(g, GEO.sphere, FLOWER_COLORS[(k + i) % FLOWER_COLORS.length], { position: [fx, y + 0.16, fz], scale: [0.085, 0.06, 0.085], outline: 0.01, shadow: false });
    }
    obs.push(circle(g, 0, 0, 0.85));
    return finish(g);
  }

  /** 연못 쉼터 벤치: 쇠 다리 둘에 나무 앉는 판 셋 · 등받이 둘(앞이 yaw 쪽). */
  function parkBench({ x, z, yaw }, obs) {
    const g = unit(x, z, yaw), wood = '#c98a4a', iron = '#5a5560';
    [-0.55, 0.55].forEach((px) => {
      part(g, GEO.box, iron, { position: [px, 0.2, 0.02], scale: [0.06, 0.4, 0.42], shell: true, shadow: false });
      part(g, GEO.box, iron, { position: [px, 0.62, -0.17], scale: [0.06, 0.5, 0.06], shell: true, shadow: false });
    });
    [-0.12, 0.02, 0.16].forEach((pz) => part(g, GEO.box, wood, { position: [0, 0.42, pz], scale: [1.3, 0.05, 0.12], shell: true }));
    [0.58, 0.76].forEach((py) => part(g, GEO.box, wood, { position: [0, py, -0.19], scale: [1.3, 0.12, 0.04], shell: true }));
    obs.push(box(g, 0, 0, 0.68, 0.25));
    return finish(g);
  }

  /**
   * 마을 시계탑: 돌 받침 위 크림색 탑, 모서리 나무, 빨간 네모 지붕, 앞에 시계(바늘은 마을 시각을 따라 돈다).
   * 광장 한가운데 높이 서 있어 뒤(북쪽)에 서면 나를 가린다 → 집처럼 반투명해지게 탑만의 재질로 만든다(다른 시설과 합치지 않는다).
   */
  function clockTower({ x, z, yaw }, obs) {
    const g = unit(x, z, yaw), cream = '#f7efe0', wood = '#8a5a3c', FACE = 2.55;
    const mats = new Map(), mat = (c) => {
      if (!mats.has(c)) { const m = toonMaterial(c, { unique: true }); m.userData.keep = true; mats.set(c, m); }
      return mats.get(c);
    };
    const cp = (geo, color, opts) => part(g, geo, null, { ...opts, material: mat(color) });
    cp(GEO.box, '#cfc6b8', { position: [0, 0.15, 0], scale: [1.25, 0.3, 1.25], shell: true });
    cp(GEO.box, cream, { position: [0, 1.75, 0], scale: [0.85, 2.9, 0.85], shell: true });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cp(GEO.box, wood, { position: [sx * 0.43, 1.75, sz * 0.43], scale: [0.1, 2.9, 0.1], shell: true, shadow: false }));
    cp(GEO.box, wood, { position: [0, 3.24, 0], scale: [1.05, 0.12, 1.05], shell: true });
    cp(PYRAMID, '#d9675b', { position: [0, 3.3, 0], scale: [0.85, 0.9, 0.85], shell: true });
    cp(GEO.sphere, '#f6c453', { position: [0, 4.25, 0], scale: [0.1, 0.1, 0.1], outline: 0.012 });
    cp(GEO.box, '#a77a52', { position: [0, 0.68, 0.43], scale: [0.36, 0.7, 0.02], outline: 0.012, shadow: false });
    // 시계판: 나무 테 · 흰 판 · 눈금 열둘(3 · 6 · 9 · 12 는 길게)
    cp(GEO.cylinder, wood, { position: [0, FACE, 0.425], rotation: [Math.PI / 2, 0, 0], scale: [0.36, 0.04, 0.36], outline: 0.015, shadow: false });
    cp(GEO.cylinder, '#fffdf6', { position: [0, FACE, 0.445], rotation: [Math.PI / 2, 0, 0], scale: [0.31, 0.03, 0.31], outline: false, shadow: false });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      cp(GEO.box, '#3a2a28', { position: [Math.sin(a) * 0.25, FACE + Math.cos(a) * 0.25, 0.478], rotation: [0, 0, -a], scale: k % 3 ? [0.02, 0.02, 0.01] : [0.03, 0.06, 0.01], outline: false, shadow: false });
    }
    cp(GEO.sphere, '#3a2a28', { position: [0, FACE, 0.5], scale: [0.03, 0.03, 0.012], outline: false, shadow: false });
    // 바늘: 판 가운데에서 돌아가는 축(합치지 않는다)
    const hand = (len, w) => {
      const p = new THREE.Group();
      p.position.set(0, FACE, 0.49);
      p.add(toonMesh(GEO.box, null, { position: [0, len / 2 - 0.03, 0], scale: [w, len, 0.012], outline: false, shadow: false, material: mat('#3a2a28') }));
      g.add(p);
      return p;
    };
    hands = { hour: hand(0.15, 0.03), minute: hand(0.23, 0.02) };
    obs.push(box(g, 0, 0, 0.63, 0.63));
    finish(g);
    const towerMats = [...mats.values()];
    tower = { g, mats: towerMats, meshes: g.children.filter((m) => towerMats.includes(m.material)), fade: 1 }; // 합친 뒤의 탑 메시(외곽선은 비칠 때 숨긴다)
    return g;
  }

  /** 강가 정자: 나무 바닥 위 기둥 넷, 뒤 · 옆 난간, 뒤에 긴 의자, 초록 네모 지붕. 앞이 트여 있어 들어가 쉴 수 있다(지붕은 들어가면 비친다). */
  function pavilion({ x, z, yaw }, obs) {
    const g = unit(x, z, yaw), wood = '#a8743c', dark = '#7a5233';
    part(g, GEO.box, '#d8c3a0', { position: [0, 0.03, 0], scale: [2.6, 0.06, 2.6], shell: true, shadow: false });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(g, GEO.box, wood, { position: [sx * 1.15, 1.1, sz * 1.15], scale: [0.14, 2.2, 0.14], shell: true }));
    part(g, GEO.box, wood, { position: [0, 0.55, -1.15], scale: [2.3, 0.07, 0.07], shell: true, shadow: false });
    [-1, 1].forEach((sx) => part(g, GEO.box, wood, { position: [sx * 1.15, 0.55, -0.58], scale: [0.07, 0.07, 1.15], shell: true, shadow: false }));
    part(g, GEO.box, '#c98a4a', { position: [0, 0.4, -0.85], scale: [1.9, 0.08, 0.42], shell: true });
    [-0.8, 0, 0.8].forEach((px) => part(g, GEO.box, dark, { position: [px, 0.2, -0.85], scale: [0.08, 0.4, 0.34], shell: true, shadow: false }));
    // 지붕은 따로(들어가면 비치게): 처마 판 · 네모 지붕 · 금 꼭지
    const mats = new Map(), mat = (c) => {
      if (!mats.has(c)) { const m = toonMaterial(c, { unique: true }); m.userData.keep = true; mats.set(c, m); }
      return mats.get(c);
    };
    part(g, GEO.box, null, { position: [0, 2.24, 0], scale: [2.9, 0.1, 2.9], shell: true, material: mat(dark) });
    part(g, PYRAMID, null, { position: [0, 2.28, 0], scale: [2.15, 1.1, 2.15], shell: true, material: mat('#6f9a6a') });
    part(g, GEO.sphere, null, { position: [0, 3.42, 0], scale: [0.1, 0.1, 0.1], outline: 0.015, material: mat('#f6c453') });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => obs.push(circle(g, sx * 1.15, sz * 1.15, 0.12)));
    obs.push(box(g, 0, -0.85, 0.95, 0.22), box(g, 0, -1.15, 1.15, 0.05), box(g, -1.15, -0.58, 0.05, 0.58), box(g, 1.15, -0.58, 0.05, 0.58));
    finish(g);
    const roofMats = [...mats.values()];
    roof = { g, mats: roofMats, meshes: g.children.filter((m) => roofMats.includes(m.material)), fade: 1 }; // 합친 뒤의 지붕 메시(외곽선은 비칠 때 숨긴다)
    return g;
  }

  /** 공사 중: 주황 · 흰 줄무늬 가림막과 '공사 중' 간판. */
  function workSign({ x, z }, obs) {
    const g = unit(x, z);
    [-0.45, 0.45].forEach((px) => part(g, GEO.box, '#7a5233', { position: [px, 0.5, 0], scale: [0.07, 1.0, 0.07], shell: true, shadow: false }));
    for (let k = 0; k < 5; k++) part(g, GEO.box, k % 2 ? '#fbfaf5' : '#f29a4a', { position: [-0.4 + k * 0.2, 0.55, 0.05], scale: [0.2, 0.16, 0.04], outline: 0.01, shadow: false });
    part(g, GEO.box, '#fbfaf5', { position: [0, 1.15, 0], scale: [0.74, 0.34, 0.05], shell: true, shadow: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.29), village.signMaterial('공사 중', { w: 330, spaced: false }));
    sign.position.set(0, 1.15, 0.03);
    g.add(sign);
    obs.push(circle(g, 0, 0, 0.5));
    return finish(g);
  }

  /** 돌 포장 무늬(캔버스): 엇갈려 쌓은 둥근 네모 돌 네 줄, 돌마다 조금씩 다른 밝기와 윗면 반짝, 사이는 진한 줄눈. 되풀이해 깐다. */
  function stoneTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d'), tones = ['#e6dfcf', '#dcd3c0', '#d2c9b4', '#ebe5d7', '#d8cdb6'];
    const box = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
    g.fillStyle = '#a99e8b';
    g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 4; row++) {
      for (let col = -1; col < 4; col++) {
        const x = col * 32 + (row % 2 ? 16 : 0), y = row * 32;
        g.fillStyle = tones[(((row * 3 + col * 7) % tones.length) + tones.length) % tones.length];
        box(x + 2.5, y + 2.5, 27, 27, 7);
        g.fillStyle = 'rgba(255, 255, 255, 0.35)';
        box(x + 6, y + 5, 12, 4, 2);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const TILE = 1.1; // 돌 무늬 한 장이 덮는 크기(m)
  const tileUv = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
  /** 돌길 포장: 마을 안 길마다 돌 무늬 판(흙길 위에 살짝 띄운다), 광장은 둥근 돌 마당에 진한 돌 테두리와 가운데 둥근 무늬. */
  function paving() {
    const mat = toonMaterial('#ffffff', { unique: true });
    mat.map = stoneTexture();
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -4;
    const out = [];
    const add = (m) => { m.receiveShadow = true; village.group.add(m); out.push(m); return m; };
    pavedStrips().forEach((s, i) => {
      const m = add(new THREE.Mesh(tileUv(new THREE.PlaneGeometry(s.w, s.len).rotateX(-Math.PI / 2), s.w / TILE, s.len / TILE), mat));
      m.position.set(s.x, 0.018 + i * 0.002, s.z); // 겹치는 네거리에서 깜빡이지 않게 판마다 조금씩 높이를 달리
      m.rotation.y = s.yaw;
    });
    const R = PLAZA.r + 0.25, flat = (geo) => geo.rotateX(-Math.PI / 2);
    add(new THREE.Mesh(tileUv(flat(new THREE.CircleGeometry(R, 56)), (2 * R) / TILE, (2 * R) / TILE), mat)).position.set(PLAZA.x, 0.034, PLAZA.z);
    // 테두리 · 가운데 무늬: 돌길 판(앞으로 당겨 그린다)보다 더 앞으로. 같은 정도면 멀리서 비스듬히 볼 때는 돌길 판에 덮였다가
    // 가까이 가면 나타났다(시계탑 밑동의 갈색 고리). 무늬마다 재질을 따로 둔다(같은 색을 나눠 쓰는 다른 물체까지 당겨지지 않게)
    const deco = (geo, color, y) => {
      const m = toonMaterial(color, { unique: true });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -8;
      add(toonMesh(flat(geo), null, { material: m, outline: false, shadow: false })).position.set(PLAZA.x, y, PLAZA.z);
    };
    deco(new THREE.RingGeometry(R, R + 0.32, 56), '#a99d88', 0.04);
    deco(new THREE.RingGeometry(1.15, 1.45, 40), '#c9b48e', 0.042);
    deco(new THREE.CircleGeometry(0.55, 32), '#e3b5ad', 0.042);
    return out;
  }

  /**
   * 든든한 돌담: 나무 울타리 자리(마을 둘레)를 따라 두 가지 빛깔이 번갈아 드는 돌벽과 덮개돌, 세 마디마다와 끝마다 돌기둥,
   * 문 넷 양옆에는 금빛 구슬을 얹은 큰 돌기둥. 둘레 장애물은 나무 울타리 것을 그대로 쓰고, 문 옆 큰 기둥만 더 막는다.
   */
  function stoneWall(obs) {
    const RING = VILLAGE_R + 0.5, steps = Math.round((Math.PI * 2 * RING) / 1.6), UP = new THREE.Vector3(0, 1, 0);
    const nearGate = (x, z) => Object.values(GATES).some((g) => Math.hypot(x - (g.x * RING) / VILLAGE_R, z - (g.z * RING) / VILLAGE_R) < GATE_HALF - 0.45);
    const M = (x, y, z, yaw, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new THREE.Vector3(sx, sy, sz));
    const pts = [];
    for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI * 2; pts.push({ x: Math.sin(a) * RING, z: Math.cos(a) * RING, a, gap: false }); }
    pts.forEach((p) => { p.gap = nearGate(p.x, p.z); });
    const walls = [[], []], caps = [], pillars = [], pcaps = [];
    pts.forEach((p, i) => {
      if (p.gap) return;
      const prev = pts[i - 1], next = pts[i + 1];
      if (prev && !prev.gap) {
        const len = Math.hypot(p.x - prev.x, p.z - prev.z) + 0.04, yaw = Math.atan2(p.x - prev.x, p.z - prev.z), cx = (prev.x + p.x) / 2, cz = (prev.z + p.z) / 2;
        walls[i % 2].push(M(cx, 0.3, cz, yaw, 0.34, 0.6, len));
        caps.push(M(cx, 0.64, cz, yaw, 0.44, 0.09, len));
      }
      if (i % 3 === 0 || !prev || prev.gap || !next || next.gap) {
        pillars.push(M(p.x, 0.45, p.z, p.a, 0.46, 0.9, 0.46));
        pcaps.push(M(p.x, 0.95, p.z, p.a, 0.56, 0.1, 0.56));
      }
    });
    // 문 양옆 큰 돌기둥(문을 돌린 방향 = 둘레 접선)
    const gp = [], gcap = [], gball = [];
    for (const G of Object.values(GATES)) {
      const r = Math.hypot(G.x, G.z), tx = -G.z / r, tz = G.x / r, yaw = Math.atan2(G.x, G.z);
      for (const sd of [-1, 1]) {
        const x = G.x + tx * sd * 2.05, z = G.z + tz * sd * 2.05;
        gp.push(M(x, 0.75, z, yaw, 0.62, 1.5, 0.62));
        gcap.push(M(x, 1.54, z, yaw, 0.76, 0.12, 0.76));
        gball.push(M(x, 1.72, z, 0, 0.15, 0.15, 0.15));
        obs.push({ x, z, r: 0.38 });
      }
    }
    const out = [
      toonInstances(GEO.box, '#d6cfbf', walls[0], { shell: true }),
      toonInstances(GEO.box, '#c9c0ac', walls[1], { shell: true }),
      toonInstances(GEO.box, '#ece6d8', caps, { shell: true, shadow: false }),
      toonInstances(GEO.box, '#bfb5a0', pillars, { shell: true }),
      toonInstances(GEO.box, '#ece6d8', pcaps, { shell: true, shadow: false }),
      toonInstances(GEO.box, '#b7ac96', gp, { shell: true }),
      toonInstances(GEO.box, '#ece6d8', gcap, { shell: true, shadow: false }),
      toonInstances(GEO.sphere, '#f6c453', gball, { outline: 0.02, shadow: false })
    ];
    out.forEach((g) => village.group.add(g));
    return out;
  }

  /** 시설마다: 만들어서 { groups, obs } (장애물은 마을 장애물에 넣는다). */
  const BUILD = {
    flowers: (obs) => WORK_SPOTS.flowers.map((p, i) => flowerBed(p, i, obs)),
    benches: (obs) => WORK_SPOTS.benches.map((p) => parkBench(p, obs)),
    clock: (obs) => [clockTower(WORK_SPOTS.clock[0], obs)],
    pavilion: (obs) => [pavilion(WORK_SPOTS.pavilion[0], obs)],
    lamps: (obs) => lampSpots.map((p) => { const l = village.lamp(p.x, p.z); obs.push(l.obstacle); return l.group; }),
    roads: () => paving(),
    fence: (obs) => stoneWall(obs)
  };
  /** 공사 중 간판 자리: 바깥 가로등은 첫 가로등 자리, 돌길 · 돌담은 정해 둔 자리, 나머지는 시설 자리. */
  const signSpot = (id) => (id === 'lamps' ? lampSpots[0] : WORK_SIGNS[id] || WORK_SPOTS[id][0]);
  function make(fn) {
    const obs = [], groups = fn(obs);
    for (const o of obs) if (!village.obstacles.list.includes(o)) village.obstacles.push(o);
    return { groups, obs, hide: [] };
  }
  /** 보이기 · 숨기기: 시설과 그 장애물, 그리고 시설이 바꿔 놓는 원래 것(돌담이면 나무 울타리)은 거꾸로. */
  const setOn = (w, on) => {
    if (!w) return;
    w.groups.forEach((g) => { g.visible = on; });
    w.obs.forEach((o) => { o.off = !on; });
    w.hide.forEach((g) => { g.visible = !on; });
  };

  return {
    /** 바깥 길 가로등 자리(테스트 · 확인용). */
    lampSpots,
    /** 마을 모습 { id: 'open' | 'building' } 대로 보인다(없는 것은 숨긴다). */
    show(view) {
      let changed = false;
      for (const id of WORK_IDS) {
        const want = view[id] || null;
        if ((shown[id] || null) === want) continue;
        shown[id] = want;
        changed = true;
        if (want === 'open' && !built[id]) {
          built[id] = make(BUILD[id]);
          if (id === 'fence') built[id].hide = village.fence || []; // 돌담이 서면 나무 울타리는 걷는다
        }
        if (want === 'building' && !marks[id]) marks[id] = make((obs) => [workSign(signSpot(id), obs)]);
        setOn(built[id], want === 'open');
        setOn(marks[id], want === 'building');
      }
      if (changed) village.refreshNav();
    },
    /** 매 프레임: 시계탑 바늘을 마을 시각에, 시계탑 뒤에 서면 탑을 · 정자 안에 들어가면 지붕을 비치게. */
    update(dt, clock, focus) {
      if (hands && shown.clock === 'open' && clock) {
        const h = hourOf(clock);
        hands.hour.rotation.z = -((h % 12) / 12) * Math.PI * 2;
        hands.minute.rotation.z = -(h % 1) * Math.PI * 2;
      }
      // 시계탑: 내 캐릭터보다 카메라 쪽(남쪽)에 있으면서 옆으로 가까우면(탑 뒤에 섰으면) 마을 집처럼 반투명하게
      if (tower && shown.clock === 'open' && focus) {
        const dz = tower.g.position.z - focus.z, dx = Math.abs(tower.g.position.x - focus.x);
        const hiding = dz > -0.6 && dz < 6 && dx < 1.6;
        if (hiding || tower.fade < 1) {
          const f = tower.fade + ((hiding ? 0.3 : 1) - tower.fade) * Math.min(1, dt * 8);
          tower.fade = f > 0.995 ? 1 : f;
          tower.mats.forEach((m) => {
            m.opacity = tower.fade;
            m.depthWrite = tower.fade > 0.95;
            if (m.transparent !== tower.fade < 1) { m.transparent = tower.fade < 1; m.needsUpdate = true; }
          });
          tower.meshes.forEach((m) => { for (const c of m.children) c.visible = tower.fade > 0.95; });
        }
      }
      if (roof && shown.pavilion === 'open' && focus) {
        const { g } = roof, a = g.rotation.y, dx = focus.x - g.position.x, dz = focus.z - g.position.z;
        const lx = Math.cos(a) * dx - Math.sin(a) * dz, lz = Math.sin(a) * dx + Math.cos(a) * dz;
        // 정자 안이거나, 정자 뒤(북쪽)에 서서 지붕이 카메라(남쪽)와 나 사이를 가릴 때
        const behind = g.position.z - focus.z, side = Math.abs(focus.x - g.position.x);
        const under = (Math.abs(lx) < 1.6 && lz > -1.6 && lz < 3) || (side < 2.2 && behind > 0 && behind < 6.5);
        if (!under && roof.fade === 1) return;
        const f = roof.fade + ((under ? 0.3 : 1) - roof.fade) * Math.min(1, dt * 8);
        roof.fade = f > 0.995 ? 1 : f;
        // 평소엔 불투명으로 그린다(마을 집처럼): 비칠 때만 반투명, 외곽선은 숨긴다
        roof.mats.forEach((m) => {
          m.opacity = roof.fade;
          m.depthWrite = roof.fade > 0.95;
          if (m.transparent !== roof.fade < 1) { m.transparent = roof.fade < 1; m.needsUpdate = true; }
        });
        roof.meshes.forEach((m) => { for (const c of m.children) c.visible = roof.fade > 0.95; });
      }
    }
  };
}
