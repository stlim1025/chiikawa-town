import * as THREE from 'three';
import { toonMaterial, addOutline, GEO } from '../render/toon.js';
import { part, mergeParts } from '../render/merge.js';
import { regionAt, roadDist, arenaAt, canyonAt, groundY } from '../core/layout.js';

/**
 * 밤에 빛나는 버섯(core/glowfluff.js 의 '반짝 털뭉치 따기'): 서쪽 숲에 하얀 버섯 무더기가 늘 있고(낮에는 그냥 하얀 버섯),
 * 밤이 되면 숨 쉬듯 은은하게 빛난다. 무더기마다 가장 큰 버섯 갓 위에 민들레 씨처럼 동그란 반짝 털뭉치가 하나 앉는다(밤에만).
 * 자리는 늘 같게(정해진 씨앗으로 고른다) — 그 밤에 뗀 무더기 번호를 저장해 두고 다음 밤에 다시 앉힌다.
 */
const COUNT = 12;
const BOX = [-70, -36, -44, 44]; // 서쪽 숲(풀 · 몬스터의 forest 구역과 같은 쪽)
const PERIOD = 1.7; // 빛이 한 번 숨 쉬는 시간(초)
const DRAW_DIST = 46; // 이보다 멀면 그리지 않는다
const STARTLE = 1.4; // 어두울 때 눌러 움찔한 뒤 빛이 사그라든 채 있는 시간(초)
const FLY = 0.35; // 뗀 털뭉치가 손으로 날아오는 시간(초)

/** 늘 같은 자리를 고르는 작은 난수(mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 털뭉치 둘레 빛무리: 가운데가 밝은 동그란 그림 하나를 모두 나눠 쓴다
let haloTex = null;
function haloTexture() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,250,220,1)');
  grd.addColorStop(0.35, 'rgba(255,244,190,0.55)');
  grd.addColorStop(1, 'rgba(255,244,190,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}

/** 버섯 무더기 하나: 버섯 넷(가장 큰 것 위에 털뭉치)을 한 덩어리로 합친다. → { mesh, mat, top: 털뭉치 자리(무더기 기준) } */
function clusterModel(random) {
  const root = new THREE.Group();
  // [x, z, 키, 갓 반지름]: 가장 큰 버섯이 맨 앞
  const shrooms = [[0, 0, 0.84, 0.2], [0.34, 0.16, 0.52, 0.15], [-0.3, 0.2, 0.4, 0.17], [0.08, -0.32, 0.3, 0.13]];
  shrooms.forEach(([x, z, h, r]) => {
    part(root, GEO.cylinder, '#eef1fb', { position: [x, 0, z], scale: [r * 0.24, h, r * 0.24] }); // 가는 대
    part(root, GEO.sphereMid, '#ffffff', { position: [x, h, z], scale: [r, r * 0.72, r] }); // 동그란 갓
    part(root, GEO.cylinder, '#f3f5ff', { position: [x, h - 0.05, z], scale: [r * 1.08, 0.04, r * 1.08] }); // 갓 아래 테두리
  });
  const mat = toonMaterial('#ffffff', { vertexColors: true, unique: true }); // 무더기마다 따로 빛난다
  const mesh = new THREE.Mesh(mergeParts(root), mat);
  mesh.rotation.y = random() * Math.PI * 2;
  addOutline(mesh, 0.018);
  const [, , h, r] = shrooms[0];
  return { mesh, mat, top: new THREE.Vector3(0, h + r * 0.72 + 0.1, 0) };
}

/** 털뭉치: 은은히 빛나는 동그란 몸 + 민들레 씨 같은 점들 + 빛무리. */
function fluffModel(random) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(GEO.sphereLow, new THREE.MeshBasicMaterial({ color: '#fffbe8' })));
  g.children[0].scale.setScalar(0.085);
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const u = random() * 2 - 1, a = random() * Math.PI * 2, rr = 0.13 + random() * 0.04, s = Math.sqrt(1 - u * u);
    pts.push(Math.cos(a) * s * rr, u * rr, Math.sin(a) * s * rr);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.035, transparent: true, opacity: 0.95, depthWrite: false })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: '#fff3c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(0.6);
  g.add(halo);
  return { g, halo };
}

export function createGlowShrooms(scene, village, random = seeded(20251010)) {
  const list = [];
  const okSpot = (x, z) => regionAt(x, z) === 'forest' && roadDist(x, z) > 1.5 && village.isFree(x, z, 0.9, true)
    && !arenaAt(x, z, 3) && !canyonAt(x, z, 3) && list.every((s) => Math.hypot(s.x - x, s.z - z) > 6);
  for (let tries = 0; tries < 600 && list.length < COUNT; tries++) {
    const x = BOX[0] + random() * (BOX[1] - BOX[0]), z = BOX[2] + random() * (BOX[3] - BOX[2]);
    if (!okSpot(x, z)) continue;
    const c = clusterModel(random), f = fluffModel(random);
    const g = new THREE.Group();
    g.position.set(x, groundY(x, z), z);
    g.add(c.mesh, f.g);
    f.g.position.copy(c.top);
    f.g.visible = false;
    scene.add(g);
    village.obstacles.push({ x, z, r: 0.6, soft: true }); // 풀 · 꽃이 버섯 위에 돋지 않게(밟고 지나갈 수는 있다)
    list.push({ id: list.length, x, z, g, mat: c.mat, mesh: c.mesh, fluff: f.g, halo: f.halo, top: c.top.clone(), off: random() * Math.PI * 2, has: false, dim: 0, wob: 0, fly: null });
  }

  let t = 0;
  // 빛 세기: 일정한 빠르기로 밝아졌다 어두워진다(삼각파 — 사인파는 양 끝에서 오래 머물러 끝에 걸린 초록 칸이 쉬웠다)
  const pulse = (s) => { const u = (t / PERIOD + s.off / (Math.PI * 2)) % 1; return 1 - Math.abs(2 * u - 1); };

  return {
    list,
    /** 지금 빛 세기 0~1(움찔한 뒤에는 어둡다) — 떼기 판정 · 게이지(core/glowfluff.js 의 glowResult). */
    glowOf: (s) => pulse(s) * (s.dim > 0 ? 0.3 : 1),
    /** 털뭉치가 앉아 있는 가장 가까운 무더기(maxDist 안, 없으면 null). */
    nearest(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const s of list) {
        if (!s.has) continue;
        const d = Math.hypot(s.x - x, s.z - z);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    },
    /** 뗐다: 털뭉치가 내 손(to { x, z })으로 톡 날아온다. */
    pick(s, to) {
      s.has = false;
      s.fly = { t: 0, to: new THREE.Vector3(to.x - s.x, 0.85, to.z - s.z) };
    },
    /** 어두울 때 눌렀다: 털뭉치가 움찔하고 빛이 잠깐 사그라든다. */
    startle(s) { s.dim = STARTLE; s.wob = 0.5; },
    /**
     * 매 프레임. night: 밤 정도 0~1, focus: 내 자리(멀면 그리지 않는다), picked: 이번 밤에 뗀 무더기 번호들,
     * guest: 친구 마을에 놀러 간 중(털뭉치는 그 마을 주인 몫이라 보이지 않는다).
     */
    update(dt, { night = 0, focus = null, picked = [], guest = false } = {}) {
      t += dt;
      const lit = night >= 0.45, taken = new Set(picked);
      for (const s of list) {
        s.g.visible = !focus || Math.hypot(s.x - focus.x, s.z - focus.z) < DRAW_DIST;
        s.dim = Math.max(0, s.dim - dt);
        if (!s.g.visible) { s.has = false; continue; }
        const b = pulse(s), k = night * (0.3 + 0.7 * b) * (s.dim > 0 ? 0.3 : 1);
        s.mat.emissive.setRGB(0.78, 0.84, 0.96).multiplyScalar(k); // 밤에 하얗게(살짝 푸르스름) 빛난다
        // 움찔: 버섯이 살짝 오그라들었다 펴진다
        s.wob = Math.max(0, s.wob - dt);
        s.mesh.scale.set(1, 1 - 0.12 * Math.sin(s.wob * 20) * s.wob, 1);
        if (s.fly) {
          s.fly.t += dt;
          const u = Math.min(1, s.fly.t / FLY);
          s.fluff.position.lerpVectors(s.top, s.fly.to, u * u);
          s.fluff.scale.setScalar(1 - 0.6 * u);
          if (u >= 1) { s.fly = null; s.fluff.visible = false; s.fluff.position.copy(s.top); s.fluff.scale.setScalar(1); }
          continue;
        }
        const want = lit && !guest && !taken.has(s.id);
        s.fluff.visible = want;
        s.has = want;
        if (!want) continue;
        s.fluff.position.y = s.top.y + Math.sin(t * 2 + s.off) * 0.015 - (s.wob > 0 ? 0.04 : 0);
        s.halo.material.opacity = (0.3 + 0.65 * b) * (s.dim > 0 ? 0.35 : 1);
        s.halo.scale.setScalar(0.5 + 0.28 * b);
      }
    }
  };
}
