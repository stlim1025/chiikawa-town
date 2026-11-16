import * as THREE from 'three';
import { celMaterial, addOutline, GEO } from '../render/toon.js';
import { part, mergeParts } from '../render/merge.js';
import { groundY } from '../core/layout.js';

/**
 * 눈사람(겨울, 게임 오리지널): 눈덩이 둘을 쌓고 숯 눈 · 입, 당근 코, 나뭇가지 팔을 붙였다. 얼굴(face 0 · 1 · 2)마다 표정과 차림이 다르다.
 *  · 0 웃는 얼굴 + 파란 양동이 모자
 *  · 1 동그랗게 벌린 입 + 빨간 목도리
 *  · 2 윙크 + 겨자색 목도리와 비스듬히 쓴 작은 빨간 양동이
 * 모양은 얼굴마다 한 번만 만들어 한 덩어리로 합쳐 두고(몸 + 외곽선, 얼굴 점) 눈사람마다 나눠 쓴다(눈사람 하나에 그리기 세 번).
 * sync(list): list = [{ x, z, day, face }] 에 맞춰 세우고 치운다(같으면 아무 일도 하지 않는다). 새로 생긴 눈사람은 퐁 하고 커진다(update).
 * → { sync(list), update(dt) }
 */
const POP = 0.45; // 퐁 하고 커지는 초
const SNOW = '#fbfdff', SHADE = '#e9f1f8', COAL = '#2b2224', CARROT = '#f08a3c', TWIG = '#7a5236';
const HEAD = [0, 1.22, 0], HEAD_R = 0.38;
const TORUS = new THREE.TorusGeometry(1, 0.22, 8, 20).rotateX(Math.PI / 2);

/** 머리(구) 앞면 위 (x, y) 자리(머리 가운데 기준)의 겉면 좌표. push 만큼 바깥으로. */
function onHead(x, y, push = 0.004) {
  const z = Math.sqrt(Math.max(0.0004, HEAD_R * HEAD_R - x * x - y * y));
  const k = 1 + push / HEAD_R;
  return { position: [HEAD[0] + x * k, HEAD[1] + y * k, HEAD[2] + z * k], rotation: [-Math.asin(y / HEAD_R), Math.atan2(x, z), 0] };
}

/** 얼굴 face 의 눈사람 부품을 g 에 붙인다(앞이 +z). */
function buildParts(g, face) {
  // 눈덩이 둘: 아래 0.55, 위 0.38. 아래 덩이 옆에 살짝 덧붙은 눈
  part(g, GEO.sphere, SNOW, { position: [0, 0.5, 0], scale: [0.55, 0.52, 0.55] });
  part(g, GEO.sphere, SNOW, { position: HEAD, scale: [HEAD_R, HEAD_R, HEAD_R] });
  part(g, GEO.sphereLow, SHADE, { position: [0.38, 0.12, -0.2], scale: [0.2, 0.12, 0.2] });
  part(g, GEO.sphereLow, SHADE, { position: [-0.36, 0.1, 0.22], scale: [0.16, 0.1, 0.16] });
  // 숯 눈: 윙크(2)면 오른쪽 눈은 감은 선
  const eye = (sd) => { const h = onHead(sd * 0.13, 0.08); part(g, GEO.dot, COAL, { ...h, scale: [0.042, 0.05, 0.016], flat: true }); };
  eye(-1);
  if (face === 2) {
    [-1, 1].forEach((sd) => { const h = onHead(0.13 + sd * 0.03, 0.085 - 0.012); part(g, GEO.box, COAL, { position: h.position, rotation: [h.rotation[0], h.rotation[1], -sd * 0.45], scale: [0.075, 0.018, 0.012], flat: true }); });
  } else eye(1);
  // 숯 입: 웃는 입(점 다섯 · 윙크는 넷이 호를 그린다), 놀란 입(동그란 점 하나)
  if (face === 1) {
    part(g, GEO.dot, COAL, { ...onHead(0, -0.13), scale: [0.045, 0.055, 0.016], flat: true });
  } else {
    const n = face === 2 ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1; // -1 ~ 1
      part(g, GEO.dot, COAL, { ...onHead(u * 0.13, -0.15 + u * u * 0.055), scale: [0.022, 0.022, 0.012], flat: true });
    }
  }
  // 당근 코(앞으로 뾰족)
  part(g, GEO.cone, CARROT, { position: [0, HEAD[1] - 0.01, HEAD_R - 0.03], rotation: [Math.PI / 2 - 0.12, 0, 0], scale: [0.05, 0.22, 0.05] });
  // 배의 숯 단추 둘
  [0.7, 0.48].forEach((y) => {
    const dy = y - 0.5, z = 0.55 * Math.sqrt(Math.max(0.01, 1 - (dy / 0.52) ** 2));
    part(g, GEO.dot, COAL, { position: [0, y, z + 0.004], rotation: [-dy * 1.2, 0, 0], scale: [0.036, 0.036, 0.014], flat: true });
  });
  // 나뭇가지 팔: 옆으로 비스듬히 든 가지 끝에 잔가지 둘
  [-1, 1].forEach((sd) => {
    const lean = sd * (face === 1 ? 0.75 : 1.0), bx = sd * 0.44, by = 0.72, len = 0.46;
    part(g, GEO.cylinder, TWIG, { position: [bx, by, 0], rotation: [0, 0, -lean], scale: [0.022, len, 0.022] });
    const tx = bx + Math.sin(lean) * len * 0.68, ty = by + Math.cos(lean) * len * 0.68;
    part(g, GEO.cylinder, TWIG, { position: [tx, ty, 0], rotation: [0, 0, -lean - sd * 0.75], scale: [0.015, 0.15, 0.015] });
    part(g, GEO.cylinder, TWIG, { position: [tx, ty, 0], rotation: [0, 0, -lean + sd * 0.7], scale: [0.015, 0.13, 0.015] });
  });
  // 차림: 양동이 모자 · 목도리
  const bucket = (color, rim, x, tilt, s) => {
    const b = new THREE.Group();
    b.position.set(x, HEAD[1] + HEAD_R * 0.82, 0);
    b.rotation.z = tilt;
    g.add(b);
    part(b, GEO.cylinder, color, { position: [0, 0, 0], scale: [0.2 * s, 0.24 * s, 0.2 * s] });
    part(b, GEO.cylinder, rim, { position: [0, 0, 0], scale: [0.225 * s, 0.035 * s, 0.225 * s] });
  };
  const scarf = (color, dark) => {
    part(g, TORUS, color, { position: [0, 0.98, 0], scale: [0.33, 0.3, 0.33] });
    part(g, GEO.box, color, { position: [0.2, 0.82, 0.36], rotation: [0.25, 0, -0.18], scale: [0.11, 0.3, 0.045] });
    part(g, GEO.box, dark, { position: [0.225, 0.7, 0.39], rotation: [0.25, 0, -0.18], scale: [0.115, 0.03, 0.05] });
  };
  if (face === 0) bucket('#7fa7d9', '#5f87c0', 0.02, -0.14, 1);
  else if (face === 1) scarf('#e0524f', '#b93e3c');
  else { scarf('#e8b83c', '#c2942a'); bucket('#e0524f', '#b93e3c', -0.1, 0.34, 0.8); }
}

const MODELS = new Map();
/** 얼굴마다 합쳐 둔 도형 { body, flat }. */
function modelOf(face) {
  if (!MODELS.has(face)) {
    const root = new THREE.Group();
    buildParts(root, face);
    MODELS.set(face, { body: mergeParts(root, 'body'), flat: mergeParts(root, 'flat') });
  }
  return MODELS.get(face);
}

/** 자리로 정한 0 ~ 1 값(같은 자리의 눈사람은 늘 같은 쪽을 본다). */
const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

export function createSnowmen(scene) {
  const bodyMat = celMaterial('#ffffff', { vertexColors: true });
  const flatMat = celMaterial('#ffffff', { vertexColors: true, flat: true });
  let items = []; // { x, z, day, face, g, age }
  const same = (a, b) => a.x === b.x && a.z === b.z && a.day === b.day && (a.face | 0) === b.face;
  const keyOf = (e) => `${e.x},${e.z},${e.day},${e.face | 0}`;

  function make(e) {
    const face = Math.max(0, Math.min(2, e.face | 0)), M = modelOf(face);
    const g = new THREE.Group();
    const body = new THREE.Mesh(M.body, bodyMat);
    body.castShadow = true;
    addOutline(body, 0.03, true);
    g.add(body);
    if (M.flat) g.add(new THREE.Mesh(M.flat, flatMat));
    g.position.set(e.x, groundY(e.x, e.z), e.z);
    g.rotation.y = (hash(e.x, e.z) - 0.5) * 0.9; // 남쪽(카메라 쪽)을 보되 조금씩 다르게
    g.scale.setScalar(0.001);
    scene.add(g);
    return { x: e.x, z: e.z, day: e.day, face: e.face | 0, g, age: 0 };
  }

  return {
    /** 목록에 맞춰 눈사람을 세우고 치운다(열쇠: 자리 · 날 · 얼굴). 달라진 것이 없으면 바로 돌아온다. */
    sync(list) {
      list = list || [];
      let changed = list.length !== items.length;
      for (let i = 0; !changed && i < list.length; i++) changed = !same(list[i], items[i]);
      if (!changed) return;
      const old = new Map(items.map((it) => [keyOf(it), it]));
      const next = [];
      for (const e of list) {
        const k = keyOf(e), it = old.get(k);
        if (it) { old.delete(k); next.push(it); } else next.push(make(e));
      }
      for (const it of old.values()) scene.remove(it.g);
      items = next;
    },
    /** 새로 생긴 눈사람이 퐁 하고 커진다(살짝 넘쳤다가 제 크기로). */
    update(dt) {
      for (const it of items) {
        if (it.age >= POP) continue;
        it.age = Math.min(POP, it.age + dt);
        const u = it.age / POP, c = 1.70158, v = u - 1;
        it.g.scale.setScalar(Math.max(0.001, 1 + (c + 1) * v * v * v + c * v * v)); // easeOutBack
      }
    }
  };
}
