import * as THREE from 'three';
import { toonMaterial, toonMesh, GEO } from '../render/toon.js';
import { mergeUnit } from '../render/batch.js';
import { WORK_IDS, WORK_SPOTS, outerLampSpots } from '../core/works.js';
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
  let hands = null, roof = null;

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

  /** 광장 꽃밭: 돌 테두리 안 흙에 잎 덤불 넷과 색색 꽃 열한 송이. */
  function flowerBed({ x, z }, i, obs) {
    const g = unit(x, z);
    part(g, GEO.cylinder, '#d9cfc0', { scale: [0.85, 0.26, 0.85] });
    part(g, GEO.cylinder, '#8a6a4a', { scale: [0.74, 0.24, 0.74], outline: false, shadow: false });
    for (let k = 0; k < 4; k++) {
      const a = k * 1.57 + 0.4 + i;
      part(g, GEO.sphere, '#7cc46a', { position: [Math.cos(a) * 0.42, 0.26, Math.sin(a) * 0.42], scale: [0.2, 0.09, 0.2], outline: 0.012, shadow: false });
    }
    for (let k = 0; k < 11; k++) {
      const a = k * 2.4 + i, r = k === 0 ? 0 : 0.2 + 0.42 * Math.sqrt(k / 10), fx = Math.cos(a) * r, fz = Math.sin(a) * r;
      part(g, GEO.box, '#5fa04f', { position: [fx, 0.3, fz], scale: [0.02, 0.12, 0.02], outline: false, shadow: false });
      part(g, GEO.sphere, FLOWER_COLORS[(k + i) % FLOWER_COLORS.length], { position: [fx, 0.39, fz], scale: [0.085, 0.06, 0.085], outline: 0.01, shadow: false });
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

  /** 마을 시계탑: 돌 받침 위 크림색 탑, 모서리 나무, 빨간 네모 지붕, 앞에 시계(바늘은 마을 시각을 따라 돈다). */
  function clockTower({ x, z, yaw }, obs) {
    const g = unit(x, z, yaw), cream = '#f7efe0', wood = '#8a5a3c', FACE = 2.55;
    part(g, GEO.box, '#cfc6b8', { position: [0, 0.15, 0], scale: [1.25, 0.3, 1.25], shell: true });
    part(g, GEO.box, cream, { position: [0, 1.75, 0], scale: [0.85, 2.9, 0.85], shell: true });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(g, GEO.box, wood, { position: [sx * 0.43, 1.75, sz * 0.43], scale: [0.1, 2.9, 0.1], shell: true, shadow: false }));
    part(g, GEO.box, wood, { position: [0, 3.24, 0], scale: [1.05, 0.12, 1.05], shell: true });
    part(g, PYRAMID, '#d9675b', { position: [0, 3.3, 0], scale: [0.85, 0.9, 0.85], shell: true });
    part(g, GEO.sphere, '#f6c453', { position: [0, 4.25, 0], scale: [0.1, 0.1, 0.1], outline: 0.012 });
    part(g, GEO.box, '#a77a52', { position: [0, 0.68, 0.43], scale: [0.36, 0.7, 0.02], outline: 0.012, shadow: false });
    // 시계판: 나무 테 · 흰 판 · 눈금 열둘(3 · 6 · 9 · 12 는 길게)
    part(g, GEO.cylinder, wood, { position: [0, FACE, 0.425], rotation: [Math.PI / 2, 0, 0], scale: [0.36, 0.04, 0.36], outline: 0.015, shadow: false });
    part(g, GEO.cylinder, '#fffdf6', { position: [0, FACE, 0.445], rotation: [Math.PI / 2, 0, 0], scale: [0.31, 0.03, 0.31], outline: false, shadow: false });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      part(g, GEO.box, '#3a2a28', { position: [Math.sin(a) * 0.25, FACE + Math.cos(a) * 0.25, 0.478], rotation: [0, 0, -a], scale: k % 3 ? [0.02, 0.02, 0.01] : [0.03, 0.06, 0.01], outline: false, shadow: false });
    }
    part(g, GEO.sphere, '#3a2a28', { position: [0, FACE, 0.5], scale: [0.03, 0.03, 0.012], outline: false, shadow: false });
    // 바늘: 판 가운데에서 돌아가는 축(합치지 않는다)
    const hand = (len, w) => {
      const p = new THREE.Group();
      p.position.set(0, FACE, 0.49);
      p.add(toonMesh(GEO.box, '#3a2a28', { position: [0, len / 2 - 0.03, 0], scale: [w, len, 0.012], outline: false, shadow: false }));
      g.add(p);
      return p;
    };
    hands = { hour: hand(0.15, 0.03), minute: hand(0.23, 0.02) };
    obs.push(box(g, 0, 0, 0.63, 0.63));
    return finish(g);
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

  /** 시설마다: 만들어서 { groups, obs } (장애물은 마을 장애물에 넣는다). */
  const BUILD = {
    flowers: (obs) => WORK_SPOTS.flowers.map((p, i) => flowerBed(p, i, obs)),
    benches: (obs) => WORK_SPOTS.benches.map((p) => parkBench(p, obs)),
    clock: (obs) => [clockTower(WORK_SPOTS.clock[0], obs)],
    pavilion: (obs) => [pavilion(WORK_SPOTS.pavilion[0], obs)],
    lamps: (obs) => lampSpots.map((p) => { const l = village.lamp(p.x, p.z); obs.push(l.obstacle); return l.group; })
  };
  const signSpot = (id) => (id === 'lamps' ? lampSpots[0] : WORK_SPOTS[id][0]);
  function make(fn) {
    const obs = [], groups = fn(obs);
    for (const o of obs) if (!village.obstacles.list.includes(o)) village.obstacles.push(o);
    return { groups, obs };
  }
  const setOn = (w, on) => { if (!w) return; w.groups.forEach((g) => { g.visible = on; }); w.obs.forEach((o) => { o.off = !on; }); };

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
        if (want === 'open' && !built[id]) built[id] = make(BUILD[id]);
        if (want === 'building' && !marks[id]) marks[id] = make((obs) => [workSign(signSpot(id), obs)]);
        setOn(built[id], want === 'open');
        setOn(marks[id], want === 'building');
      }
      if (changed) village.refreshNav();
    },
    /** 매 프레임: 시계탑 바늘을 마을 시각에, 정자 안에 들어가면 지붕을 비치게. */
    update(dt, clock, focus) {
      if (hands && shown.clock === 'open' && clock) {
        const h = hourOf(clock);
        hands.hour.rotation.z = -((h % 12) / 12) * Math.PI * 2;
        hands.minute.rotation.z = -(h % 1) * Math.PI * 2;
      }
      if (roof && shown.pavilion === 'open' && focus) {
        const { g } = roof, a = g.rotation.y, dx = focus.x - g.position.x, dz = focus.z - g.position.z;
        const lx = Math.cos(a) * dx - Math.sin(a) * dz, lz = Math.sin(a) * dx + Math.cos(a) * dz;
        const under = Math.abs(lx) < 1.6 && lz > -1.6 && lz < 3;
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
