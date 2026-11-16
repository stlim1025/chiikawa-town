import * as THREE from 'three';
import { toonMaterial } from '../render/toon.js';
import { mergedGeometry } from '../render/batch.js';
import { groundY } from '../core/layout.js';
import { mapleLeafGeometry } from './leafpiles.js';

/**
 * 계절 풍경(게임 오리지널): 내 둘레에 흩날리는 것들과 눈밭 발자국.
 *  · 봄: 분홍 벚꽃잎이 바람을 타고 팔랑팔랑 흘러간다(인스턴스 메시 하나, 120장).
 *  · 가을: 주황 · 빨강 · 노랑 단풍잎이 빙글빙글 돌며 떨어진다(인스턴스 메시 하나, 90장).
 *  · 여름 · 겨울: 흩날리는 것은 없다(눈은 weather.js 가 내린다).
 *  · 발자국: 눈 쌓인 땅(setSnowGround(true), 겨울)에서만. addPrint 로 찍은 발바닥 자국 60개(가득 차면 가장 오래된 것부터 덮어쓴다)가
 *    20초에 걸쳐 옅어지다 사라진다(인스턴스 메시 하나, 자국마다 옅기).
 * 계절이 바뀌면 천천히 줄고 는다. 카메라(eye) 바로 앞 3m 안의 잎은 작아져 사라진다(렌즈에 붙은 듯 크게 보이지 않게).
 * → { setSeason(season), update(dt, center, t, eye), addPrint(x, z, yaw), setSnowGround(on) }
 */
const AREA = 14; // 내 둘레 반경(한 변 28 인 상자 안에서 돈다)
const TOP = 6; // 잎이 생기는 높이
const PETALS = 120, LEAVES = 90;
const PETAL_COLORS = ['#ffd1e0', '#ffb7cf', '#ffe3ec', '#ffc4d8'];
const LEAF_COLORS = ['#e8662e', '#d9432f', '#f2b632', '#e0892b'];
const PRINTS = 60, PRINT_LIFE = 20;
const NEAR = 3, NEAR_GONE = 1.2; // 카메라에서 이 거리 안이면 작아지기 시작 · 완전히 사라지는 거리

/** 벚꽃잎 한 장(납작한 판, 길이 1): 끝이 살짝 갈라진 물방울 모양. */
function petalGeometry() {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.5);
  sh.bezierCurveTo(0.42, -0.3, 0.5, 0.22, 0.14, 0.5);
  sh.lineTo(0, 0.36);
  sh.lineTo(-0.14, 0.5);
  sh.bezierCurveTo(-0.5, 0.22, -0.42, -0.3, 0, -0.5);
  return new THREE.ShapeGeometry(sh, 4).rotateX(-Math.PI / 2);
}
/** 발바닥 자국 하나(땅에 누운 판): 둥근 발바닥 + 발가락 셋. 발가락 쪽이 +z(걷는 쪽). */
function printGeometry() {
  const disc = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);
  return mergedGeometry([
    { geometry: disc, position: [0, 0, -0.025], scale: [0.075, 1, 0.062] },
    { geometry: disc, position: [-0.062, 0, 0.068], scale: [0.027, 1, 0.032] },
    { geometry: disc, position: [0, 0, 0.096], scale: [0.029, 1, 0.034] },
    { geometry: disc, position: [0.062, 0, 0.068], scale: [0.027, 1, 0.032] }
  ]);
}

export function createSeasonFx(scene) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), size = new THREE.Vector3(), col = new THREE.Color();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  /** 흩날리는 잎 한 무리: 인스턴스 메시 하나. kind 마다 떨어지는 빠르기 · 흔들림 · 도는 모양이 다르다. */
  function flock(geometry, count, colors, opt) {
    const mesh = new THREE.InstancedMesh(geometry, toonMaterial('#ffffff', { doubleSide: true, unique: true }), count);
    for (let i = 0; i < count; i++) mesh.setColorAt(i, col.set(colors[i % colors.length]));
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.raycast = () => {};
    scene.add(mesh);
    const parts = Array.from({ length: count }, () => ({
      x: 0, y: 0, z: 0, vy: opt.fall[0] + Math.random() * (opt.fall[1] - opt.fall[0]), s: opt.size[0] + Math.random() * (opt.size[1] - opt.size[0]),
      ph: Math.random() * Math.PI * 2, ax: (0.6 + Math.random()) * opt.spin * (Math.random() < 0.5 ? -1 : 1), ay: (0.5 + Math.random()) * opt.spin
    }));
    return { mesh, parts, opt, amount: 0, placed: false };
  }
  const petals = flock(petalGeometry(), PETALS, PETAL_COLORS, { fall: [0.45, 0.9], size: [0.13, 0.19], spin: 2.6, wind: [0.9, 0.25], sway: 0.7 });
  const leaves = flock(mapleLeafGeometry(), LEAVES, LEAF_COLORS, { fall: [0.7, 1.2], size: [0.24, 0.36], spin: 1.5, wind: [0.35, 0.1], sway: 1.1 });

  /** 잎 하나를 내 둘레 아무 데나(y: 높이) 새로 놓는다. */
  const scatter = (p, center, y) => { p.x = center.x + (Math.random() * 2 - 1) * AREA; p.z = center.z + (Math.random() * 2 - 1) * AREA; p.y = y; };

  function updateFlock(f, on, dt, center, t, eye) {
    f.amount += ((on ? 1 : 0) - f.amount) * Math.min(1, dt * 0.8);
    const n = f.amount < 0.02 ? 0 : Math.round(f.parts.length * Math.min(1, f.amount + 0.02));
    f.mesh.count = n;
    f.mesh.visible = n > 0;
    if (!n) { f.placed = false; return; }
    if (!f.placed) { f.placed = true; for (const p of f.parts) scatter(p, center, Math.random() * TOP); }
    const o = f.opt;
    for (let i = 0; i < n; i++) {
      const p = f.parts[i], w = Math.sin(t * 1.3 + p.ph);
      p.y -= p.vy * (1 - 0.35 * Math.abs(w)) * dt; // 옆으로 미끄러질 때는 천천히 내려온다
      p.x += (o.wind[0] + w * o.sway) * dt;
      p.z += (o.wind[1] + Math.cos(t * 0.9 + p.ph * 1.7) * o.sway * 0.6) * dt;
      if (p.y < 0.02) scatter(p, center, TOP * (0.75 + Math.random() * 0.35));
      // 내가 움직이면 멀어진 잎은 반대쪽으로 옮겨 와 늘 둘레에 있다
      if (p.x - center.x > AREA) p.x -= AREA * 2; else if (p.x - center.x < -AREA) p.x += AREA * 2;
      if (p.z - center.z > AREA) p.z -= AREA * 2; else if (p.z - center.z < -AREA) p.z += AREA * 2;
      pos.set(p.x, p.y, p.z);
      let s = p.s;
      if (eye) { const d = pos.distanceTo(eye); if (d < NEAR) s *= Math.max(0, (d - NEAR_GONE) / (NEAR - NEAR_GONE)); }
      e.set(t * p.ax + p.ph + w * 0.6, t * p.ay + p.ph, Math.sin(t * 1.9 + p.ph) * 0.7);
      f.mesh.setMatrixAt(i, m4.compose(pos, q.setFromEuler(e), size.setScalar(s)));
    }
    f.mesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- 눈밭 발자국 ----------
  const fade = new Float32Array(PRINTS);
  const printGeo = printGeometry();
  printGeo.setAttribute('aFade', new THREE.InstancedBufferAttribute(fade, 1));
  const printMat = new THREE.MeshBasicMaterial({ color: 0x7f93b3, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  printMat.onBeforeCompile = (shader) => { // 자국마다 옅기(aFade)
    shader.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
    shader.fragmentShader = 'varying float vFade;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
  };
  printMat.customProgramCacheKey = () => 'snow-footprint';
  const prints = new THREE.InstancedMesh(printGeo, printMat, PRINTS);
  for (let i = 0; i < PRINTS; i++) prints.setMatrixAt(i, ZERO);
  prints.frustumCulled = false;
  prints.visible = false;
  prints.raycast = () => {};
  scene.add(prints);
  const born = new Float32Array(PRINTS).fill(-1); // 찍힌 시각(-1: 비었다)
  let nextPrint = 0, live = 0, clock = 0, snowGround = false, season = null;

  function clearPrints() {
    for (let i = 0; i < PRINTS; i++) { born[i] = -1; fade[i] = 0; prints.setMatrixAt(i, ZERO); }
    live = 0;
    prints.visible = false;
    prints.instanceMatrix.needsUpdate = true;
  }

  return {
    /** 계절을 바꾼다('spring' · 'summer' · 'autumn' · 'winter'): 봄엔 벚꽃잎, 가을엔 단풍잎이 천천히 나타나고 나머지는 걷힌다. */
    setSeason(s) { season = s; },
    /** 눈 쌓인 땅인지: 켜져 있는 동안만 발자국이 찍히고 보인다. 끄면 남은 자국도 지운다. */
    setSnowGround(on) {
      if (!!on === snowGround) return;
      snowGround = !!on;
      if (!snowGround) clearPrints();
    },
    /** (x, z) 에 yaw 쪽을 보는 발자국 하나(눈밭일 때만). 가득 차면 가장 오래된 자국을 덮어쓴다. */
    addPrint(x, z, yaw = 0) {
      if (!snowGround) return;
      const i = nextPrint;
      nextPrint = (nextPrint + 1) % PRINTS;
      if (born[i] < 0) live++;
      born[i] = clock;
      fade[i] = 1;
      pos.set(x, groundY(x, z) + 0.025, z);
      e.set(0, yaw, 0);
      prints.setMatrixAt(i, m4.compose(pos, q.setFromEuler(e), size.setScalar(1)));
      prints.instanceMatrix.needsUpdate = true;
      prints.visible = true;
    },
    /** center: 내 캐릭터 자리(잎이 그 둘레에서 돈다), t: 흐른 시간(초), eye: 카메라 자리(Vector3, 없어도 된다). */
    update(dt, center, t = 0, eye = null) {
      clock += dt;
      updateFlock(petals, season === 'spring', dt, center, t, eye);
      updateFlock(leaves, season === 'autumn', dt, center, t, eye);
      if (!live) return;
      for (let i = 0; i < PRINTS; i++) {
        if (born[i] < 0) continue;
        const k = 1 - (clock - born[i]) / PRINT_LIFE;
        if (k <= 0) { // 다 옅어졌다: 숨긴다
          born[i] = -1; fade[i] = 0; live--;
          prints.setMatrixAt(i, ZERO);
          prints.instanceMatrix.needsUpdate = true;
        } else fade[i] = k;
      }
      printGeo.attributes.aFade.needsUpdate = true;
      if (!live) prints.visible = false;
    }
  };
}
