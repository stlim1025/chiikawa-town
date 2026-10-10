import * as THREE from 'three';
import { toonMaterial, toonMesh, addOutline, GEO } from '../render/toon.js';
import { WEED_KINDS, stagesOf } from '../core/weeding.js';
import { regionAt, roadDist, shoreDist, VILLAGE_R } from '../core/layout.js';
import { part, mergeParts } from '../render/merge.js';

/**
 * 풀 10종이 자라는 곳. area 는 아래 AREAS 의 자리 고르기 규칙, n 은 그 자리에 동시에 자라는 수.
 * 마을 안은 5 · 4 · 3급 풀만, 마을 밖 구역마다 그 구역의 풀이 자란다.
 */
const SPAWN = {
  weed: [{ area: 'village', n: 24 }, { area: 'fields', n: 10 }],
  clover: [{ area: 'village', n: 8 }, { area: 'fields', n: 6 }, { area: 'riverbank', n: 6 }],
  foxtail: [{ area: 'fields', n: 14 }, { area: 'villageEdge', n: 4 }],
  vine: [{ area: 'forest', n: 14 }],
  thorny: [{ area: 'villageEdge', n: 8 }, { area: 'forest', n: 5 }],
  reed: [{ area: 'shore', n: 16 }],
  rockmoss: [{ area: 'mountain', n: 14 }],
  moongrass: [{ area: 'forest', n: 6 }, { area: 'mountain', n: 6 }],
  giantweed: [{ area: 'forestDeep', n: 4 }],
  poisonweed: [{ area: 'mountainDeep', n: 6 }]
};
/** 마을 밖 자리 고르기: 고르는 상자 [x0, x1, z0, z1] 와 조건. */
const AREAS = {
  fields: { box: [34, 70, -50, 50], ok: (x, z) => regionAt(x, z) === 'fields' },
  forest: { box: [-72, -34, -50, 50], ok: (x, z) => regionAt(x, z) === 'forest' },
  forestDeep: { box: [-74, -52, -40, 40], ok: (x, z) => regionAt(x, z) === 'forest' },
  mountain: { box: [-55, 55, -68, -34], ok: (x, z) => regionAt(x, z) === 'mountain' },
  mountainDeep: { box: [-50, 50, -70, -55], ok: (x, z) => regionAt(x, z) === 'mountain' },
  riverbank: { box: [-60, 60, 32, 68], ok: (x, z) => regionAt(x, z) === 'river' && shoreDist(x, z) > 1.5 },
  shore: { box: [-70, 70, 30, 72], ok: (x, z) => Math.hypot(x, z) > VILLAGE_R + 3 && shoreDist(x, z) > 0.4 && shoreDist(x, z) < 1.8 }
};
const REGROW_SECONDS = 20;
/** 이보다 먼 풀은 그리지 않는다(안개 너머). */
const DRAW_DIST = 50;
const HINT_DIST = 22; // 뽑을 풀 표시는 이만큼 가까운 풀에만(멀리까지 다 띄우면 어지럽다)

// ---------- 모양: 부품을 쌓아 만든 뒤 한 덩어리 도형으로 합친다(풀 하나 = 그리기 두 번: 몸 + 외곽선) ----------
/** 원뿔 잎이 바깥으로 기울어 둥글게 퍼진 다발. */
function leafFan(g, n, colors, { r = 0.07, h = 0.42, dh = 0.04, tilt = 0.35, flat = 1, y = 0, yaw0 = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    part(g, GEO.cone, colors[i % colors.length], { position: [0, y, 0], rotation: [tilt, yaw0 + (i / n) * Math.PI * 2, 0], scale: [r, h - (i % 3) * dh, r * flat] });
  }
}

/** 종류별 모양 부품. glow 는 밤에 빛나는 부품 자리(따로 그린다). */
const BUILD = {
  weed(g) { leafFan(g, 4, ['#8fd16a', '#6fbf5a']); },
  clover(g) {
    // 줄기 끝에 둥근 잎 세 장이 달린 토끼풀 넷 + 하얀 꽃 하나
    [[0.1, 0.05, 0.16], [-0.12, 0.08, 0.13], [0.02, -0.13, 0.18], [-0.05, 0.14, 0.1]].forEach(([x, z, h], i) => {
      part(g, GEO.cylinder, '#7cc25e', { position: [x, 0, z], scale: [0.012, h, 0.012] });
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + i;
        part(g, GEO.dot, k % 2 ? '#5fb85a' : '#4fa94f', { position: [x + Math.sin(a) * 0.05, h, z + Math.cos(a) * 0.05], rotation: [0, a, 0], scale: [0.045, 0.014, 0.06] });
      }
    });
    part(g, GEO.cylinder, '#7cc25e', { position: [0, 0, 0], scale: [0.012, 0.27, 0.012] });
    part(g, GEO.dot, '#fff7fa', { position: [0, 0.3, 0], scale: [0.065, 0.06, 0.065] });
    part(g, GEO.dot, '#ffd3e2', { position: [0, 0.27, 0.02], scale: [0.05, 0.03, 0.05] });
  },
  foxtail(g) {
    // 기운 줄기 셋 끝에 복슬복슬한 이삭
    [[0, 0.3, 0.55], [2.1, 0.22, 0.48], [4.2, 0.35, 0.5]].forEach(([yaw, tilt, h], i) => {
      const s = new THREE.Group();
      s.rotation.set(tilt, yaw, 0, 'YXZ');
      g.add(s);
      part(s, GEO.cylinder, '#8cc65a', { scale: [0.012, h, 0.012] });
      part(s, GEO.sphere, i % 2 ? '#dfe58a' : '#d2dc76', { position: [0, h + 0.06, 0], scale: [0.045, 0.12, 0.045] });
    });
    leafFan(g, 3, ['#7fbe54'], { r: 0.05, h: 0.26, tilt: 0.6, flat: 0.4 });
  },
  vine(g) {
    // 땅을 기는 덩굴: 가운데 잎 덤불 + 둥글게 휜 줄기 셋(점을 이어 그린다) + 잎
    part(g, GEO.sphere, '#4f9a48', { position: [0, 0.06, 0], scale: [0.2, 0.13, 0.2] });
    for (let a = 0; a < 3; a++) {
      const yaw = (a / 3) * Math.PI * 2 + 0.4;
      for (let k = 0; k <= 7; k++) {
        const t = k / 7, r = 0.12 + t * 0.4, y = 0.04 + Math.sin(t * Math.PI) * 0.26;
        const x = Math.sin(yaw + t * 0.9) * r, z = Math.cos(yaw + t * 0.9) * r;
        part(g, GEO.dot, '#4b8b3b', { position: [x, y, z], scale: [0.035, 0.035, 0.035] });
        if (k % 2) part(g, GEO.dot, k % 4 === 1 ? '#5cae4f' : '#6dbd5a', { position: [x, y + 0.04, z], rotation: [0.3, yaw + t, 0], scale: [0.075, 0.018, 0.045] });
      }
    }
    part(g, GEO.dot, '#9a7fd8', { position: [0.05, 0.2, 0.05], scale: [0.04, 0.04, 0.04] });
  },
  thorny(g) {
    part(g, GEO.cone, '#8a6fb0', { scale: [0.09, 0.55, 0.09] });
    [[0.08, 0.2, 0.6], [-0.08, 0.32, -0.6], [0.07, 0.42, 2.2]].forEach(([x, y, rot]) => {
      part(g, GEO.cone, '#6b4f93', { position: [x, y, 0], rotation: [0, rot, x > 0 ? -1.1 : 1.1], scale: [0.03, 0.12, 0.03] });
    });
    part(g, GEO.dot, '#e0524f', { position: [0, 0.6, 0], scale: [0.07, 0.07, 0.07] });
  },
  reed(g) {
    // 키 큰 갈대 셋: 줄기 + 갈색 부들 이삭 + 납작한 잎
    [[0, 0, 0.95, 0.05], [0.12, 0.06, 0.8, -0.1], [-0.1, 0.08, 0.88, 0.12]].forEach(([x, z, h, tilt]) => {
      const s = new THREE.Group();
      s.position.set(x, 0, z);
      s.rotation.set(tilt, 0, tilt * 0.6, 'YXZ');
      g.add(s);
      part(s, GEO.cylinder, '#9fbf5a', { scale: [0.016, h, 0.016] });
      part(s, GEO.cylinder, '#7a5232', { position: [0, h - 0.24, 0], scale: [0.042, 0.18, 0.042] });
    });
    leafFan(g, 4, ['#8fb85a', '#a7c96a'], { r: 0.04, h: 0.6, dh: 0.08, tilt: 0.28, flat: 0.3 });
  },
  rockmoss(g) {
    // 작은 바위에 붙은 이끼 방석과 자잘한 꽃
    part(g, GEO.sphere, '#a8a29a', { position: [0, 0.05, -0.04], scale: [0.24, 0.15, 0.19] });
    [[0.05, 0.16, 0, 0.12], [-0.12, 0.12, 0.06, 0.09], [0.15, 0.08, 0.1, 0.08], [-0.02, 0.06, 0.16, 0.1]].forEach(([x, y, z, r], i) => {
      part(g, GEO.sphere, i % 2 ? '#93c46a' : '#7fae5a', { position: [x, y, z], scale: [r, r * 0.5, r] });
    });
    [[0.06, 0.23, 0.02], [-0.1, 0.18, 0.08], [0.14, 0.14, 0.13]].forEach(([x, y, z]) => part(g, GEO.dot, '#fff3b0', { position: [x, y, z], scale: [0.025, 0.025, 0.025] }));
    leafFan(g, 3, ['#6f9e4f'], { r: 0.03, h: 0.2, tilt: 0.3, y: 0.12 });
  },
  moongrass(g, glow) {
    // 가는 연청색 잎 + 줄기 끝에 빛나는 구슬(밤에 빛난다)
    leafFan(g, 5, ['#9fd8c8', '#bfe8dc'], { r: 0.035, h: 0.48, dh: 0.06, tilt: 0.32, flat: 0.45 });
    part(g, GEO.cylinder, '#a9dcc9', { scale: [0.012, 0.5, 0.012] });
    glow.push({ position: [0, 0.56, 0], scale: [0.08, 0.08, 0.08] });
  },
  giantweed(g) {
    // 어른 키만 한 잡초: 큰 잎 다발 + 가운데 높은 줄기의 노란 꽃 + 땅 위로 드러난 뿌리
    leafFan(g, 7, ['#5aaa4a', '#77c35c'], { r: 0.13, h: 0.9, dh: 0.08, tilt: 0.32 });
    part(g, GEO.cylinder, '#6cb054', { scale: [0.035, 1.35, 0.035] });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      part(g, GEO.dot, '#ffd94a', { position: [Math.sin(a) * 0.09, 1.38, Math.cos(a) * 0.09], scale: [0.07, 0.03, 0.07] });
    }
    part(g, GEO.dot, '#e08a2e', { position: [0, 1.4, 0], scale: [0.055, 0.045, 0.055] });
    [[0.25, 0.1], [-0.2, 0.18], [0.05, -0.27]].forEach(([x, z]) => part(g, GEO.sphere, '#a07a52', { position: [x, 0.02, z], scale: [0.09, 0.05, 0.09] }));
  },
  poisonweed(g) {
    // 보랏빛 잎 + 연두 반점, 가운데 부푼 독주머니와 떠오르는 방울
    leafFan(g, 5, ['#6a3f86', '#7f4f9e'], { r: 0.065, h: 0.42, dh: 0.04, tilt: 0.42, flat: 0.55 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      part(g, GEO.dot, '#b6e04a', { position: [Math.sin(a) * 0.1, 0.16, Math.cos(a) * 0.1], scale: [0.022, 0.022, 0.022] });
    }
    part(g, GEO.cylinder, '#5a3a72', { scale: [0.02, 0.36, 0.02] });
    part(g, GEO.sphere, '#a3d14a', { position: [0, 0.42, 0], scale: [0.1, 0.12, 0.1] });
    part(g, GEO.dot, '#6a3f86', { position: [0.04, 0.47, 0.07], scale: [0.025, 0.025, 0.015] });
    [[0.12, 0.62, 0.03, 0.035], [-0.06, 0.72, -0.05, 0.026], [0.03, 0.82, 0.08, 0.02]].forEach(([x, y, z, r]) => part(g, GEO.dot, '#c8f07a', { position: [x, y, z], scale: [r, r, r] }));
  }
};

const MODELS = new Map(); // 종류 → { geo, glow }
/** 작아서 잘 안 보이는 풀은 조금 키운다. */
const SIZE = { clover: 1.35, rockmoss: 1.2 };
function modelOf(kind) {
  if (!MODELS.has(kind)) {
    const root = new THREE.Group(), glow = [];
    root.scale.setScalar(SIZE[kind] || 1);
    BUILD[kind](root, glow);
    glow.forEach((gl) => { gl.position = gl.position.map((v) => v * (SIZE[kind] || 1)); gl.scale = gl.scale.map((v) => v * (SIZE[kind] || 1)); });
    MODELS.set(kind, { geo: mergeParts(root), glow });
  }
  return MODELS.get(kind);
}
const OUTLINE = { giantweed: 0.03, reed: 0.016 };
/** 달빛 풀 구슬(밤 정도에 맞춰 빛난다). */
const glowMat = toonMaterial('#c9f4ff', { unique: true });
glowMat.emissive.setRGB(0.45, 0.85, 1).multiplyScalar(0.3);

export function weedMesh(kind) {
  const outer = new THREE.Group();
  const { geo, glow } = modelOf(kind);
  const body = new THREE.Mesh(geo, toonMaterial('#ffffff', { vertexColors: true }));
  body.castShadow = true;
  addOutline(body, OUTLINE[kind] || 0.02);
  outer.add(body);
  for (const gl of glow) outer.add(toonMesh(GEO.dot, null, { material: glowMat, position: gl.position, scale: gl.scale, outline: 0.012, shadow: false }));
  return outer;
}

/** 풀 10종을 마을 안팎에 키우고 뽑힌 연출을 한다. */
export function createWeeds(scene, village, random = Math.random) {
  const list = [];
  const flying = [];
  let nextId = 1, regrow = 0, cull = 0, nightK = 0;

  /** 그 규칙의 빈 자리 하나(없으면 null). */
  function spotFor(area) {
    if (area === 'village') return village.randomFreeSpot(random, 5, 25);
    if (area === 'villageEdge') return village.randomFreeSpot(random, 21, 26.5);
    const A = AREAS[area], [x0, x1, z0, z1] = A.box;
    for (let i = 0; i < 80; i++) {
      const x = x0 + random() * (x1 - x0), z = z0 + random() * (z1 - z0);
      if (!A.ok(x, z) || roadDist(x, z) < 0.4 || !village.isFree(x, z, 0.6, true)) continue;
      if (Object.values(village.spots).some((s) => Math.hypot(s.x - x, s.z - z) < 2.5)) continue;
      return { x, z };
    }
    return null;
  }

  function spawn(kind, area) {
    const spot = spotFor(area);
    if (!spot || list.some((w) => Math.hypot(w.x - spot.x, w.z - spot.z) < 1.0)) return false;
    const mesh = weedMesh(kind);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = random() * Math.PI * 2;
    mesh.scale.setScalar(0.01);
    scene.add(mesh);
    const W = WEED_KINDS[kind];
    list.push({ id: nextId++, kind, area, x: spot.x, z: spot.z, mesh, grow: 0, stage: 0, flawed: false, night: !!W.night, hidden: !!W.night && nightK < 0.45 });
    return true;
  }

  for (const [kind, rules] of Object.entries(SPAWN)) {
    for (const r of rules) for (let i = 0, made = 0; i < r.n * 3 && made < r.n; i++) if (spawn(kind, r.area)) made++;
  }
  list.forEach((w) => { w.grow = 1; w.mesh.scale.setScalar(1); });

  const usable = (w) => !w.hidden;
  // 승급 시험에서 뽑을 풀: 그 풀 위에 통통 뛰며 도는 노란 화살표(setHint 로 종류를 정한다)
  let hintKinds = new Set(), hintKey = '', hintT = 0;
  const tops = {}; // 종류 → 다 자란 풀의 꼭대기 높이
  const topOf = (kind) => (tops[kind] ??= new THREE.Box3().setFromObject(weedMesh(kind)).max.y);
  const hintMesh = () => {
    const g = new THREE.Group();
    g.add(toonMesh(GEO.cone, '#fcd95b', { rotation: [Math.PI, 0, 0], scale: [0.14, 0.26, 0.14], outline: 0.016, shadow: false }));
    scene.add(g);
    return g;
  };
  const dropHint = (w) => { if (w.hint) { scene.remove(w.hint); w.hint = null; } };
  const applyVisibility = (focus) => {
    for (const w of list) w.mesh.visible = !w.hidden && (!focus || Math.hypot(w.x - focus.x, w.z - focus.z) < DRAW_DIST);
  };

  return {
    list,
    /** (x, z) 에서 maxDist 안의 가장 가까운 풀(밤에만 나오는 풀이 숨어 있으면 뺀다). kind 를 주면 그 종류만. */
    nearest(x, z, maxDist, kind = null) {
      let best = null, bd = maxDist;
      for (const w of list) {
        if (!usable(w) || (kind && w.kind !== kind)) continue;
        const d = Math.hypot(w.x - x, w.z - z);
        if (d < bd) { bd = d; best = w; }
      }
      return best;
    },
    /** 지금 보이고 뽑을 수 있는 풀인지. */
    usable,
    /** 뽑을 풀 표시: kinds(풀 종류 목록) 위에 화살표를 띄운다. null · [] 이면 모두 지운다. */
    setHint(kinds) {
      const key = (kinds || []).join(',');
      if (key === hintKey) return;
      hintKey = key;
      hintKinds = new Set(kinds || []);
      for (const w of list) if (!hintKinds.has(w.kind)) dropHint(w);
    },
    /** 뽑는 동안 풀이 흔들리고 늘어난다. */
    tug(weed, power) {
      if (!weed) return;
      weed.mesh.scale.set(1 - power * 0.15, 1 + power * 0.35, 1 - power * 0.15);
      weed.mesh.rotation.z = Math.sin(performance.now() / 30) * 0.08 * power;
    },
    /** 여러 번에 나눠 뽑는 풀: 한 단계 뽑힐 때마다 조금씩 땅에서 올라온다. */
    loosen(weed, stage) {
      weed.stage = stage;
      weed.mesh.position.y = 0.06 * stage;
      weed.mesh.rotation.x = 0.12 * stage * (weed.id % 2 ? 1 : -1);
    },
    /** 뽑힌 풀을 날려 보낸다. result: 'clean' | 'snapped' */
    remove(weed, result) {
      const i = list.indexOf(weed);
      if (i < 0) return;
      list.splice(i, 1);
      dropHint(weed);
      const m = weed.mesh;
      m.visible = true;
      m.scale.setScalar(1);
      m.rotation.z = 0;
      if (result === 'clean') {
        const root = toonMesh(GEO.dot, '#c9a27a', { position: [0, -0.05, 0], scale: [0.12, 0.08, 0.12], outline: 0.015, shadow: false });
        m.add(root);
      }
      flying.push({ mesh: m, t: 0, vy: result === 'clean' ? 4.2 : 2.6, vx: (random() - 0.5) * 1.2, spin: (random() - 0.5) * 12 });
    },
    /** 종류별 지금 자라 있는 수(디버그 · 테스트). */
    counts() {
      const c = {};
      for (const w of list) c[w.kind] = (c[w.kind] || 0) + 1;
      return c;
    },
    /** opts: { night: 0 낮 ~ 1 밤, focus: 내 캐릭터 자리(멀리 있는 풀은 감춘다) } */
    update(dt, { night = 0, focus = null } = {}) {
      // 밤 정도: 달빛 풀이 나타나고 구슬이 빛난다
      if (Math.abs(night - nightK) > 0.01) {
        nightK = night;
        glowMat.emissive.setRGB(0.45, 0.85, 1).multiplyScalar(0.3 + 0.7 * night);
      }
      for (const w of list) {
        if (!w.night) continue;
        const hide = nightK < 0.45 && !w.busy && w.stage === 0; // 뽑는 중에 해가 떠도 사라지지 않게
        w.hidden = hide;
      }
      cull -= dt;
      if (cull <= 0) { cull = 0.4; applyVisibility(focus); }

      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        f.t += dt; f.vy -= 12 * dt;
        f.mesh.position.y += f.vy * dt;
        f.mesh.position.x += f.vx * dt;
        f.mesh.rotation.z += f.spin * dt;
        f.mesh.scale.setScalar(Math.max(0.01, 1 - f.t * 1.3));
        if (f.t > 0.8) { scene.remove(f.mesh); flying.splice(i, 1); }
      }
      list.forEach((w) => {
        if (w.grow < 1) { w.grow = Math.min(1, w.grow + dt * 1.5); w.mesh.scale.setScalar(w.grow); }
      });
      if (hintKinds.size) {
        hintT += dt;
        for (const w of list) {
          const want = hintKinds.has(w.kind) && w.mesh.visible && !w.hidden && (!focus || Math.hypot(w.x - focus.x, w.z - focus.z) < HINT_DIST);
          if (!want) { if (w.hint) w.hint.visible = false; continue; }
          if (!w.hint) w.hint = hintMesh();
          w.hint.visible = true;
          w.hint.position.set(w.x, w.mesh.position.y + topOf(w.kind) * w.grow + 0.42 + Math.sin(hintT * 4 + w.id) * 0.06, w.z);
          w.hint.rotation.y = hintT * 1.5;
        }
      }
      regrow += dt;
      if (regrow >= REGROW_SECONDS) {
        regrow = 0;
        // 자리마다 모자란 만큼 하나씩 다시 자란다
        for (const [kind, rules] of Object.entries(SPAWN)) {
          for (const r of rules) {
            if (list.filter((w) => w.kind === kind && w.area === r.area).length < r.n) spawn(kind, r.area);
          }
        }
        applyVisibility(focus);
      }
    }
  };
}

/** 풀 하나를 몇 번 더 뽑아야 하는지 '1 / 2' 같은 글씨. */
export function stageLabel(weed) {
  const n = stagesOf(weed.kind);
  return n > 1 ? `${weed.stage + 1} / ${n}` : '';
}
