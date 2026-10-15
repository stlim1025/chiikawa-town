import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { mergeUnit } from '../render/batch.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { groundY } from '../core/layout.js';

/**
 * 사이드스토리 '스위치'(원작 애니 시즌1 「스위치」 — stories/switch.js)의 장소와 장면.
 *  createSwitchFront: 바위산 북쪽 끝 절벽에 뚫린 동굴 입구(이야기를 받은 동안만). 둥근 입구가 창살로 막혀 있다.
 *  buildSwitchGadget · holdSwitch: 우사기가 주워 들고 다니는 스위치(하얀 상자에 빨간 버튼).
 *  createBeetleBuddy: 마을에서 나를 졸졸 따라다니는 풍뎅이(창살을 연 뒤부터 마지막 장면 전까지).
 *  createSwitchStage: 바위산 끝자락 절벽 앞 장면(우사기가 스위치를 누르면 창살이 올라가고 풍뎅이가 나온다 · 소풍 · 근육질 괴물로 커져 날아간다).
 */
/** 풍뎅이 크기: 원작에서는 아주 작다. 캐릭터 절반쯤으로 세운다. */
export const BEETLE_SCALE = 0.5;
const MONSTER_S = 2; // 괴물 풍뎅이 크기(모델 앉은키 2.6 → 5.2쯤: 친구들의 네 배 남짓)
const ROCK = ['#a29a90', '#8f877e', '#b3aba1'];
const STONE = '#cfc7bb', BAR = '#8d5a48', CRACK = '#8a6656', CAVE = '#2c2628', CLIFF_ROCK = '#8f8174'; // CLIFF_ROCK: 바위산 북쪽 끝 절벽 색(world/outdoors.js)
const ARCH_W = 0.72, ARCH_LEG = 1.05, ARCH_TOP = ARCH_LEG + ARCH_W; // 동굴 입구: 반폭 · 곧은 옆벽 높이(그 위는 반원)
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const lerp = (a, b, u) => a + (b - a) * u;

/** 동굴 입구 모양(아래는 땅속까지, 위는 반원). w: 반폭. */
function archPath(path, w = ARCH_W, bottom = -0.15) {
  path.moveTo(-w, bottom);
  path.lineTo(w, bottom);
  path.lineTo(w, ARCH_LEG);
  path.absarc(0, ARCH_LEG, w, 0, Math.PI, false);
  path.lineTo(-w, bottom);
  return path;
}

/** 창살(원작 그림처럼 가로세로 살 + 칸마다 X 빗금): 입구 모양대로(옆 · 위 끝과 바닥은 돌 · 땅 속에 묻힌다), 한 덩어리로 합친다. */
function buildBars() {
  const bars = new THREE.Group();
  const bar = (x, y, w, h, rz = 0, line = true) => bars.add(toonMesh(GEO.box, BAR, { position: [x, y, 0], scale: [w, h, 0.06], rotation: [0, 0, rz], outline: line ? 0.012 : false, shell: true, shadow: false }));
  const half = (y) => (y <= ARCH_LEG ? ARCH_W : Math.sqrt(Math.max(0, ARCH_W * ARCH_W - (y - ARCH_LEG) ** 2)));
  const COLS = [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6], ROWS = [0.32, 0.64, 0.96, 1.28, 1.56];
  COLS.forEach((x) => { const top = ARCH_LEG + Math.sqrt(ARCH_W * ARCH_W - x * x) + 0.06; bar(x, (top - 0.2) / 2, 0.065, top + 0.2); });
  ROWS.forEach((y) => bar(0, y, half(y) * 2 + 0.12, 0.06));
  for (let i = 0; i <= COLS.length; i++) for (let j = 0; j <= ROWS.length; j++) { // 칸마다 엇갈려 그은 X(가장자리의 좁은 칸 · 반원 밖은 건너뛴다)
    const x0 = i ? COLS[i - 1] : -ARCH_W, x1 = i < COLS.length ? COLS[i] : ARCH_W, y0 = j ? ROWS[j - 1] : 0, y1 = j < ROWS.length ? ROWS[j] : ARCH_TOP;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, len = Math.min(x1 - x0, y1 - y0) * 0.75;
    if (x1 - x0 < 0.2 || Math.abs(cx) + 0.08 > half(cy + 0.08)) continue;
    [-0.78, 0.78].forEach((rz) => bar(cx, cy, len, 0.012, rz, false));
  }
  mergeUnit(bars, bars.children.slice());
  return bars;
}

/**
 * 장면 속 바위벽: 동굴 입구가 뚫린 두툼한 돌판 · 뒤로 둘러선 바위 · 금 간 자국, 입구 안은 깜깜하다. 앞은 +z.
 * 입구는 창살로 막혀 있고, 열면 창살이 돌판 속으로 쑥 올라간다.
 */
function buildSwitchRock() {
  const group = new THREE.Group();
  const t = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); group.add(m); return m; };
  [[-2.3, 1.4, -0.5, 1.0, 1.4], [2.3, 1.3, -0.5, 1.0, 1.3], [-1.3, 3.3, -0.75, 1.2, 0.85], [1.4, 3.3, -0.75, 1.25, 0.9], [0, 3.9, -0.8, 1.1, 0.6],
    [-3.1, 0.5, -0.1, 0.8, 0.6], [3.1, 0.5, -0.15, 0.8, 0.6]].forEach(([x, y, z, sx, sy], i) => t(GEO.sphere, ROCK[i % 3], { position: [x, y, z], scale: [sx, sy, 0.9], outline: 0.03 }));
  // 돌판(앞뒤 두께 0.56, 가장자리는 둥글게 깎였다): 입구 자리만 뚫렸다
  const face = new THREE.Shape();
  face.moveTo(-2.3, -0.3);
  face.lineTo(2.3, -0.3);
  face.splineThru([[2.55, 1.1], [2.3, 2.3], [1.7, 3.3], [0.7, 3.9], [-0.4, 3.85], [-1.5, 3.45], [-2.25, 2.5], [-2.55, 1.2], [-2.3, -0.3]].map(([x, y]) => new THREE.Vector2(x, y)));
  face.holes.push(archPath(new THREE.Path()));
  t(new THREE.ExtrudeGeometry(face, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2, curveSegments: 18 }).translate(0, 0, -0.18), STONE, { outline: 0.03 });
  [[-1.55, 2.2, 0.5, 0.5], [-1.2, 2.36, 0.3, -0.3], [1.6, 1.0, 0.45, -0.6], [1.86, 0.84, 0.25, 0.2], [1.25, 2.9, 0.35, 0.3], [-1.9, 0.75, 0.3, 1.2]]
    .forEach(([x, y, len, rz]) => t(GEO.box, CRACK, { position: [x, y, 0.29], scale: [len, 0.025, 0.02], rotation: [0, 0, rz], outline: false })); // 금 간 자국
  t(new THREE.ShapeGeometry(archPath(new THREE.Shape(), ARCH_W + 0.02), 12), CAVE, { position: [0, 0, -0.2], outline: false }); // 입구 안 깜깜한 동굴 속
  // 창살: 돌판 두께 한가운데. 열리면 위로 올라가 돌판 속에 숨는다
  const bars = buildBars();
  group.add(bars);
  return {
    group,
    /** 창살이 열린 정도(0 닫힘 ~ 1 다 올라가 입구가 트였다). */
    open(u) { bars.position.y = u * (ARCH_TOP + 0.15); }
  };
}

/**
 * 마을의 동굴 입구: 바위산 북쪽 끝 절벽 면에 박는 입구 둘레 돌(절벽과 같은 색, 앞이 +z, 절벽 면보다 1m쯤 앞으로 나오고 뒤는 절벽 속으로) · 깜깜한 속 · 창살.
 * 깜깜한 속과 창살은 둥근 절벽 면보다 앞에 둔다(뒤에 두면 구멍 안으로 절벽 바위가 비친다).
 * 마을에서는 여닫는 모습을 보여 주지 않으니(장면 속에서 연다) 열린 뒤로는 창살을 숨긴다.
 */
function buildCliffDoor() {
  const group = new THREE.Group();
  const t = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); group.add(m); return m; };
  const rim = new THREE.Shape();
  rim.moveTo(-1.55, -0.3);
  rim.lineTo(1.55, -0.3);
  rim.splineThru([[1.75, 0.9], [1.5, 2.1], [0.8, 2.85], [-0.15, 3.0], [-1.0, 2.75], [-1.6, 1.95], [-1.78, 0.85], [-1.55, -0.3]].map(([x, y]) => new THREE.Vector2(x, y)));
  rim.holes.push(archPath(new THREE.Path()));
  t(new THREE.ExtrudeGeometry(rim, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2, curveSegments: 16 }).translate(0, 0, -1.5), CLIFF_ROCK, { outline: 0.04 });
  t(new THREE.ShapeGeometry(archPath(new THREE.Shape(), ARCH_W + 0.02), 12), CAVE, { position: [0, 0, -0.6], outline: false }); // 깜깜한 동굴 속
  const bars = buildBars();
  bars.position.z = -0.3;
  group.add(bars);
  return { group, open(u) { bars.visible = u < 1; } };
}

/**
 * 마을: 바위산 북쪽 끝 절벽(world/outdoors.js 가 큰 바위를 이어 붙인 맵 끝 절벽)에 뚫린 동굴 입구. 이야기를 받은 동안만 보인다.
 * 남쪽에서 북쪽으로 훑어 처음 막히는 곳을 절벽 면으로 보고 그 앞에 박는다. x 후보는 왕버섯 굴 협곡 · 하치와레 동굴과 떨어진 곳, 앞이 트인 첫 자리.
 * spot 은 그 앞에 서는 자리(길목을 막지 않게 길 가운데가 아닌 맵 끝 절벽에).
 */
export function createSwitchFront(scene, village) {
  const cliffAt = (x) => { for (let z = -56; z >= -76; z -= 0.25) if (!village.isFree(x, z, 0.3)) return z; return null; };
  let at = { x: 1, z: -69.95 };
  for (const x of [1, 2, 0, 4, 11, 17, -2]) {
    const c = cliffAt(x);
    if (c == null || c > -64) continue; // 절벽보다 앞의 바위에 먼저 걸렸다
    if (!village.isFree(x, c + 2.5, 1.2) || !village.isFree(x - 1.4, c + 1.2, 0.5) || !village.isFree(x + 1.4, c + 1.2, 0.5)) continue;
    at = { x, z: c + 0.3 }; // 실제 절벽 면은 막히는 자리(절벽 바위 반지름의 1.1배 + 0.3)보다 0.6 ~ 0.8 안쪽: 입구 앞면은 그보다 1m쯤 앞
    break;
  }
  const door = buildCliffDoor();
  door.group.position.set(at.x, groundY(at.x, at.z), at.z);
  door.group.visible = false;
  scene.add(door.group);
  return {
    spot: { x: at.x, z: at.z + 2.4 },
    get visible() { return door.group.visible; },
    set visible(v) { door.group.visible = !!v; },
    /** 창살을 연 뒤로는 열린 채(이야기 속에서 우사기가 스위치를 눌렀다). */
    setOpen(on) { door.open(on ? 1 : 0); }
  };
}

/** 들고 다니는 스위치(원작: 우사기가 주운 하얀 상자 위에 빨간 버튼). press(u): 버튼이 눌린 정도(0 ~ 1). */
export function buildSwitchGadget() {
  const group = new THREE.Group();
  const t = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); group.add(m); return m; };
  t(GEO.box, '#f4f1ea', { scale: [0.2, 0.1, 0.13], outline: 0.012, shell: true });
  const button = t(GEO.cylinder, '#e0524f', { position: [0, 0.05, 0], scale: [0.05, 0.03, 0.05], outline: 0.008 });
  const shine = t(GEO.box, '#a8322f', { position: [0, 0.081, 0], scale: [0.055, 0.004, 0.012], outline: false }); // 버튼 위 한 줄
  return { group, press(u) { button.position.y = 0.05 - u * 0.022; shine.position.y = 0.081 - u * 0.022; } };
}
/** 그 친구가 스위치를 오른손에 든다(on = false 면 내려놓는다). */
export function holdSwitch(chibi, gadget, on) {
  const hand = chibi && chibi.pivots && chibi.pivots.armR;
  if (!hand) return;
  if (on && gadget.group.parent !== hand) { hand.add(gadget.group); gadget.group.position.set(0.05, -0.2, 0.14); gadget.group.rotation.set(0.3, 0, 0); }
  else if (!on && gadget.group.parent === hand) hand.remove(gadget.group);
}

/** 풍뎅이의 쩍 벌린 입(이빨) · 괴물의 날개를 켠다. */
const showTag = (c, tag, on) => (c.props[tag] || []).forEach((m) => { m.visible = !!on; });

/** 마을에서 나를 따라다니는 풍뎅이: 떨어지면 아장아장 쫓아오고, 가까우면 나를 바라본다. 너무 멀어지면(순간 이동) 옆에 나타난다. */
export function createBeetleBuddy(scene) {
  const c = buildNpc('beetle');
  c.root.scale.setScalar(BEETLE_SCALE);
  c.root.visible = false;
  scene.add(c.root);
  const pos = new THREE.Vector3();
  let on = false, moving = false, phase = 0, yaw = 0, hop = 0, mouth = 0, holdYaw = null;
  return {
    chibi: c,
    get on() { return on; },
    get position() { return pos; },
    /** 따라다니기를 켜고 끈다(켤 때 near 옆에 나타난다). */
    show(v, near) {
      on = !!v;
      c.root.visible = on;
      if (on && near) { pos.set(near.x + 0.7, 0, near.z + 0.5); yaw = 0; }
    },
    /** 하품: ω 입이 쩍 벌어져 뾰족한 이빨이 보인다. faceYaw 가 있으면 그동안 제자리에서 그쪽(카메라)을 본다. */
    yawn(v, faceYaw = null) { mouth = v ? 1 : 0; holdYaw = v ? faceYaw : null; showTag(c, 'teeth', v); },
    /** 기뻐서 폴짝. */
    jump() { hop = 0.6; },
    /** hidden: 마을 화면이 아니면(다른 장면 · 집 안) 숨는다. */
    update(dt, t, player, hidden) {
      c.root.visible = on && !hidden;
      if (!on || hidden || !player) return;
      const p = player.position, dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz);
      if (holdYaw != null) { yaw = holdYaw; moving = false; } // 하품하는 동안은 제자리에서 카메라 쪽을
      else if (d > 14) { pos.set(p.x + 0.7, 0, p.z + 0.5); moving = false; } // 멀리 순간 이동했으면 옆에
      else if (d > 1.1) { // 떨어지면 쫓아온다(멀수록 빨리)
        const v = Math.min(7, 1.5 + (d - 1.1) * 2.4) * dt;
        pos.x += (dx / d) * v; pos.z += (dz / d) * v;
        yaw = Math.atan2(dx, dz);
        moving = true;
      } else { moving = false; yaw += (Math.atan2(dx, dz) - yaw) * Math.min(1, dt * 3); } // 가까우면 나를 본다
      phase += dt * (moving ? 12 : 0);
      hop = Math.max(0, hop - dt);
      c.root.position.set(pos.x, groundY(pos.x, pos.z) + Math.sin((hop / 0.6) * Math.PI) * 0.25, pos.z);
      c.root.rotation.y = yaw;
      animateChibi(c, moving ? 'walk' : mouth ? 'talk' : 'idle', t, { phase, hop: 0.1 });
    }
  };
}

// ---------- 바위산 기슭 장면 ----------
const ROCK_AT = [0, -2.4], ROCK_S = 1.3; // 바위벽 자리 · 크기
const USAGI_AT = [1.6, 0.4]; // 스위치를 든 우사기(바위벽 오른쪽 앞, 우리 쪽을 본다)
const MONSTER_AT = [0, -1.6]; // 괴물이 책상다리하고 앉는 자리(등은 바위벽에 기댄다)
const SKY = [0, 30]; // 나무 뒤에 숨어 올려다보는 하늘 쪽(괴물이 날아가는 쪽)
const KINDS = ['me', 'chiikawa', 'hachiware', 'usagi', 'labor', 'beetle'];
const SIT_LIFT = 0.12;
const CLOTH = [0, 0.5];
// 장면마다 서는 자리 [x, z, 몸짓, 바라보는 곳('door' | 'cam' | 'beetle' | 'monster' | [x, z])]
const SPOTS = {
  arrive: { me: [-1.4, 1.6, 'idle', 'door'], chiikawa: [-0.5, 1.9, 'shy', 'door'], hachiware: [0.5, 1.7, 'look', 'door'], usagi: [...USAGI_AT, 'hop', [0.4, 3.0]] },
  press: { me: [-1.4, 1.6, 'idle', USAGI_AT], chiikawa: [-0.5, 1.9, 'shy', USAGI_AT], hachiware: [0.5, 1.7, 'talk', USAGI_AT], usagi: [...USAGI_AT, 'idle', [0.4, 3.0]] },
  open: { me: [-2.0, 1.2, 'look', 'door'], chiikawa: [-1.3, 2.2, 'shy', 'door'], hachiware: [-1.0, 1.45, 'look', 'door'], usagi: [1.5, 0.6, 'look', 'door'] }, // 입구 앞을 비우고 양옆으로(치이카와는 하치와레 뒤로 쏙)
  // 걸어 나온 풍뎅이를 반원으로 둘러싼다(카메라 쪽은 비워 풍뎅이 얼굴과 다 같이 보이게)
  meet: { me: [-1.15, -0.1, 'idle', 'beetle'], chiikawa: [-0.45, -0.75, 'shy', 'beetle'], hachiware: [0.5, -0.7, 'wave', 'beetle'], usagi: [1.2, -0.1, 'hop', 'beetle'], beetle: [0, 0.3, 'wave', 'cam'] },
  pet: { me: [-0.6, 0.6, 'talk', 'beetle'], chiikawa: [-0.45, -0.75, 'idle', 'beetle'], hachiware: [0.5, -0.7, 'clap', 'beetle'], usagi: [1.2, -0.1, 'hop', 'beetle'], beetle: [0, 0.3, 'hop', [-0.6, 0.6]] },
  // 돗자리 양옆으로 나눠 앉는다(카메라에서 옆얼굴과 맞은편 풍뎅이가 보이게)
  picnic: { me: [-1.3, 0.2, 'sit', CLOTH], chiikawa: [-1.25, 0.95, 'sit', CLOTH], hachiware: [1.25, 0.95, 'sit', CLOTH], usagi: [1.3, 0.2, 'sit', CLOTH], labor: [2.6, -0.3, 'lean', 'beetle'], beetle: [0, -0.35, 'idle', 'cam'] },
  feast: { me: [-1.3, 0.2, 'nibble', CLOTH], chiikawa: [-1.25, 0.95, 'nibble', CLOTH], hachiware: [1.25, 0.95, 'nibble', CLOTH], usagi: [1.3, 0.2, 'nibble', CLOTH], labor: [2.6, -0.3, 'idle', 'beetle'], beetle: [0, -0.35, 'sway', 'cam'] },
  // 괴물: 다들 뒤로 물러서고(치이카와는 털썩), 갑옷 씨는 앞으로 나서 지켜본다
  monster: { me: [-1.9, 2.1, 'look', 'monster'], chiikawa: [-0.9, 2.6, 'faint', 'cam'], hachiware: [0.5, 2.45, 'look', 'monster'], usagi: [1.7, 2.0, 'look', 'monster'], labor: [2.3, 0.9, 'idle', 'monster'] },
  // 조금 떨어진 숲가: 두 나무 뒤에 숨어 날아가는 괴물을 올려다본다(카메라는 우리 등 뒤 — 원작 구도처럼)
  hide: { me: [-1.4, 11.45, 'cower', SKY], chiikawa: [1.55, 11.4, 'cower', SKY], hachiware: [-2.15, 11.75, 'cower', SKY], usagi: [2.15, 11.6, 'hug', SKY], labor: [-3.3, 11.0, 'look', SKY] }
};
const SHOTS = {
  wide: { pos: [4.4, 2.4, 4.6], look: [-0.2, 0.9, -0.5], portrait: { pos: [6.0, 3.0, 7.0], look: [-0.2, 1.0, -0.5] } }, // 비스듬히 옆에서: 바위벽과 얼굴이 함께 보이게
  switch: { pos: [1.9, 1.0, 2.3], look: [1.45, 0.5, 0.4], portrait: { pos: [1.9, 1.4, 3.4], look: [1.45, 0.5, 0.4] } }, // 스위치를 든 우사기(오른쪽 앞에서 — 친구들이 가리지 않게)
  door: { pos: [0, 2.0, 4.4], look: [0, 0.9, -2.0], portrait: { pos: [0, 2.5, 7.0], look: [0, 1.0, -2.0] } },
  beetle: { pos: [0, 1.05, 2.5], look: [0, 0.35, -0.1], portrait: { pos: [0, 1.4, 3.8], look: [0, 0.4, -0.1] } },
  picnic: { pos: [0, 2.9, 5.6], look: [0, 0.45, 0.2], portrait: { pos: [0, 3.6, 8.6], look: [0, 0.5, 0.2] } },
  monster: { pos: [0, 1.7, 7.6], look: [0, 2.4, -1.2], portrait: { pos: [0, 2.4, 11.2], look: [0, 2.6, -1.2] } }, // 책상다리한 괴물과 발치의 우리
  sky: { pos: [0, 1.0, 6.8], look: [0, 5.0, -1.4], portrait: { pos: [0, 1.2, 9.6], look: [0, 5.4, -1.4] } }, // 날개를 펴고 떠오르는 괴물을 올려다본다
  gone: { pos: [0, 0.85, 7.4], look: [0, 3.0, 22], portrait: { pos: [0, 1.1, 3.8], look: [0, 3.6, 22] } } // 나무 뒤에 숨은 우리 등 뒤에서 하늘 저편으로
};
// 풍뎅이가 불러낸 음식(돗자리 위): [x, z, 종류]
const DISHES = [[-0.62, 0.32, 'onigiri'], [-0.2, 0.62, 'cake'], [0.22, 0.32, 'skewer'], [0.62, 0.62, 'pudding'], [0, 0.85, 'onigiri'], [-0.45, 0.82, 'pudding']];

/** 음식 한 접시(하얀 접시 위). */
function buildDish(kind) {
  const g = new THREE.Group();
  const t = (geo, c, o) => g.add(toonMesh(geo, c, { shadow: false, ...o }));
  t(GEO.cylinder, '#ffffff', { scale: [0.17, 0.02, 0.17], outline: 0.008 });
  if (kind === 'onigiri') {
    t(GEO.sphere, '#fbfaf5', { position: [0, 0.1, 0], scale: [0.09, 0.085, 0.07], outline: 0.01 });
    t(GEO.box, '#2e3a2c', { position: [0, 0.05, 0.06], scale: [0.07, 0.05, 0.01], outline: false });
  } else if (kind === 'cake') {
    t(GEO.cylinder, '#f7d9b0', { position: [0, 0.02, 0], scale: [0.1, 0.07, 0.1], outline: 0.01 });
    t(GEO.cylinder, '#fbfaf5', { position: [0, 0.09, 0], scale: [0.1, 0.025, 0.1], outline: false });
    t(GEO.sphere, '#e0524f', { position: [0, 0.135, 0], scale: [0.03, 0.03, 0.03], outline: 0.006 });
  } else if (kind === 'skewer') {
    t(GEO.cylinder, '#c49a6c', { position: [0, 0.04, 0], rotation: [0, 0, Math.PI / 2], scale: [0.008, 0.26, 0.008], outline: false });
    [-0.07, 0, 0.07].forEach((x, i) => t(GEO.sphere, ['#f4b6c2', '#fbfaf5', '#9fd16a'][i], { position: [x - 0.06, 0.05, 0], scale: [0.035, 0.035, 0.035], outline: 0.006 }));
  } else {
    t(GEO.cylinder, '#f7d77a', { position: [0, 0.02, 0], scale: [0.07, 0.08, 0.07], outline: 0.008 });
    t(GEO.cylinder, '#8a5636', { position: [0, 0.1, 0], scale: [0.072, 0.015, 0.072], outline: false });
  }
  return g;
}

export function createSwitchStage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6e6ee');
  scene.fog = new THREE.Fog('#d6e6ee', 14, 34);
  scene.add(new THREE.HemisphereLight(0xfffbe8, 0xb5ad9c, 1.4)); // 원작처럼 하얗게 밝은 돌벽 · 땅(앞에서 비추는 해와 함께)
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
  sun.position.set(4, 9, 7);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const light = new THREE.Color(1, 0.98, 0.94);
  const toon = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); scene.add(m); return m; };

  // ---------- 바위산 기슭: 거친 땅 · 바위 · 듬성듬성한 풀, 앞쪽 멀리 숲가와 먼 산 ----------
  toon(GEO.cylinder, '#a8b394', { position: [0, -0.1, 0], scale: [34, 0.1, 34], outline: false });
  toon(GEO.cylinder, '#b9b39f', { position: [0, 0, 0.6], scale: [3.4, 0.02, 2.6], outline: false }); // 입구 앞 맨땅
  [[-5.4, -3.4, 1.2], [5.2, -3.0, 1.4], [-6.6, 0.6, 1.0], [6.4, 1.4, 0.9], [-3.6, -5.4, 1.6], [3.8, -5.6, 1.7], [0, -7.4, 2.6], [-7.6, -4.6, 2.0], [7.4, -4.2, 2.2]]
    .forEach(([x, z, s], i) => toon(GEO.sphere, ROCK[i % 3], { position: [x, s * 0.45, z], scale: [s, s * 0.8, s * 0.9], outline: 0.03 }));
  for (let i = 0; i < 22; i++) { // 풀 포기
    const a = i * 2.31, r = 2.6 + (i % 5) * 0.9;
    toon(GEO.cone, '#7da05e', { position: [Math.sin(a) * r, 0.08, Math.cos(a) * r - 0.2], scale: [0.05, 0.16, 0.05], outline: false });
  }
  // 숲가(괴물이 날아갈 때 숨는 곳): 굵은 나무 둘 · 풀, 그 너머 먼 산과 구름
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff' }), hillMat = new THREE.MeshBasicMaterial({ color: '#c6cbdc' });
  [[2.6, 12.3], [-2.7, 12.5]].forEach(([x, z]) => {
    toon(GEO.cylinder, '#eee2cd', { position: [x, 0, z], scale: [0.42, 6.2, 0.42], outline: 0.03 });
    [[-0.2, 1.6, 0.9], [0.15, 3.0, 1.2], [-0.1, 4.4, 0.8]].forEach(([dx, y, len]) => toon(GEO.box, '#b59f86', { position: [x + dx, y, z - 0.4], scale: [0.03, len, 0.02], outline: false })); // 나무껍질 결
    [[0, 6.6, 0, 1.5], [-0.9, 6.1, 0.3, 1.0], [0.9, 6.2, -0.2, 1.1]].forEach(([dx, y, dz, s]) => toon(GEO.sphere, '#8fbf72', { position: [x + dx, y, z + dz], scale: [s, s * 0.75, s], outline: 0.03 }));
  });
  for (let i = 0; i < 14; i++) toon(GEO.cone, '#7da05e', { position: [Math.sin(i * 1.9) * (1.2 + (i % 4) * 0.8), 0.08, 12 + Math.cos(i * 1.9) * 1.6], scale: [0.05, 0.16, 0.05], outline: false });
  [[-13, 31, 8], [0, 35, 10], [13, 30, 7.5]].forEach(([x, z, r]) => toon(GEO.sphere, '#c6cbdc', { position: [x, 0, z], scale: [r, r * 0.42, r * 0.6], outline: false, material: hillMat })); // 먼 산(빛 그늘 없이 연한 보랏빛 회색)
  [[-4.5, 9.0, 28], [6.0, 10.5, 31]].forEach(([x, y, z]) => [[0, 0, 1.3], [-1.3, -0.3, 0.9], [1.3, -0.25, 1.0]]
    .forEach(([dx, dy, s]) => toon(GEO.sphere, '#ffffff', { position: [x + dx, y + dy, z], scale: [s * 1.2, s * 0.7, s * 0.5], outline: false, material: cloudMat }))); // 구름(빛 그늘 없이 새하얗게)
  const rock = buildSwitchRock();
  rock.group.position.set(ROCK_AT[0], 0, ROCK_AT[1]);
  rock.group.scale.setScalar(ROCK_S);
  scene.add(rock.group);
  // 소풍 돗자리 · 불러낸 음식 · 반짝이 · 하트 · 흙먼지
  // 돗자리 윗면(0.045)은 맨땅 원판 윗면(0.02)보다 위로(같은 높이면 깜빡이며 묻힌다), 접시는 그 위에
  const cloth = toon(GEO.box, '#f7c6cf', { position: [CLOTH[0], 0.035, CLOTH[1]], scale: [2.0, 0.02, 1.3], outline: 0.015 });
  const dishes = DISHES.map(([x, z, kind]) => { const d = buildDish(kind); d.position.set(x, 0.045, z); d.visible = false; scene.add(d); return d; });
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0, depthWrite: false });
  const sparks = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), sparkMat); m.userData.a = i * 0.63; scene.add(m); return m; });
  const heartMat = new THREE.MeshBasicMaterial({ color: '#ff8fae', transparent: true, opacity: 0, depthWrite: false });
  const hearts = Array.from({ length: 3 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), heartMat); m.userData.ph = i / 3; scene.add(m); return m; });
  const dust = Array.from({ length: 14 }, () => { const m = toon(GEO.sphere, '#b6ad9f', { scale: [0.1, 0.08, 0.1], outline: 0.008 }); m.visible = false; return m; });

  // ---------- 우리 넷 · 노동 갑옷 씨 · 풍뎅이 · 괴물이 된 풍뎅이 ----------
  let me = null;
  const pals = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi'), labor: buildNpc('labor'), beetle: buildNpc('beetle') };
  Object.values(pals).forEach((c) => { Object.values(c.props || {}).flat().forEach((m) => { m.visible = false; }); scene.add(c.root); });
  const beetle = pals.beetle;
  const gadget = buildSwitchGadget();
  holdSwitch(pals.usagi, gadget, true);
  const mon = buildNpc('beetleMonster');
  Object.values(mon.props || {}).flat().forEach((m) => { m.visible = false; });
  scene.add(mon.root);
  const wings = mon.props.wings || [];
  wings.forEach((m) => { m.userData.rz = m.rotation.z; });
  const charOf = (k) => (k === 'me' ? me : pals[k]);

  let shot = SHOTS.wide, snapNext = true, shakeT = 0, sparkT = 9, heartT = 9, flap = false, flight = null, mood = 'arrive';
  const anims = {};
  let tweens = [];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const tween = (dur, step, end) => { tweens.push({ t: 0, dur, step, end }); };
  const faceOf = (face, x, z) => (face === 'door' ? ROCK_AT : face === 'monster' ? MONSTER_AT : face === 'cam' ? [x, z + 5] : face === 'beetle' ? [beetle.root.position.x, beetle.root.position.z] : face);

  function place(k, x, z, anim, face) {
    const c = charOf(k);
    if (!c) return;
    c.root.position.set(x, 0, z);
    c.root.rotation.set(0, 0, 0);
    if (k !== 'beetle') c.root.scale.setScalar(1);
    const f = faceOf(face, x, z);
    c.root.rotation.y = Math.atan2(f[0] - x, f[1] - z);
    c.root.visible = true;
    anims[k] = anim;
  }
  /** 흙먼지가 튀고 화면이 흔들린다. */
  function rumble(x, z, power = 1) {
    shakeT = 0.9 * power;
    dust.forEach((m, i) => { const a = i * 0.7; m.visible = true; m.userData.v = new THREE.Vector3(Math.cos(a) * 1.4 * power, (2.4 + (i % 3) * 0.8) * power, Math.sin(a) * 1.4 * power); m.position.set(x, 0.1, z); });
  }

  const api = {
    scene,
    camera,
    light,
    /** 새로 들어왔다: 내 생김새 look. at: 'open'(처음 — 창살이 닫혀 있고 풍뎅이는 안에, 우사기가 스위치를 들었다) · 'finale'(마지막 — 창살은 열린 채, 갑옷 씨도 같이 왔다). */
    start(look, at = 'open') {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      Object.values(me.props || {}).flat().forEach((m) => { m.visible = false; });
      scene.add(me.root);
      tweens = []; shakeT = 0; sparkT = 9; heartT = 9; flap = false; flight = null;
      rock.open(at === 'finale' ? 1 : 0);
      gadget.group.visible = at !== 'finale';
      gadget.press(0);
      beetle.root.scale.setScalar(BEETLE_SCALE);
      beetle.root.rotation.set(0, 0, 0);
      showTag(beetle, 'teeth', false);
      mon.root.visible = false;
      mon.root.scale.setScalar(MONSTER_S);
      mon.root.rotation.set(0, 0, 0);
      showTag(mon, 'wings', false); showTag(mon, 'sitLegs', false); showTag(mon, 'flyLegs', false);
      wings.forEach((m) => { m.rotation.z = m.userData.rz; });
      cloth.visible = at === 'finale';
      dishes.forEach((d) => { d.visible = false; });
      for (const k of KINDS) if (charOf(k)) charOf(k).root.visible = false;
      api.setMood(at === 'finale' ? 'picnic' : 'arrive');
      shot = SHOTS.wide; snapNext = true;
    },
    /** 카메라: wide · switch · door · beetle · picnic · monster · sky · gone. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.wide; if (snap) snapNext = true; },
    /** 서는 자리 · 몸짓(그 장면에 없는 사람은 숨긴다. 풍뎅이는 자리가 없으면 그대로). */
    setMood(m) {
      mood = m;
      // 숲가에서 하늘을 올려다볼 때는 안개를 멀리(날아가는 괴물 · 먼 산이 뿌옇게 묻히지 않게), 바위산 기슭에서는 가까이
      scene.fog.near = m === 'hide' ? 26 : 14; scene.fog.far = m === 'hide' ? 70 : 34;
      const spots = SPOTS[m] || {};
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c) continue;
        if (!spots[k]) { if (k !== 'beetle') c.root.visible = false; continue; }
        place(k, ...spots[k]);
      }
    },
    get mood() { return mood; },
    /** 그 사람의 몸짓을 바꾼다. */
    pose(k, anim) { if (charOf(k)) anims[k] = anim; },
    /** 우사기가 스위치를 번쩍 들고 빨간 버튼을 꾹(버튼이 쑥 들어갔다 나온다). */
    press() { anims.usagi = 'cheer'; tween(0.5, (u) => gadget.press(Math.sin(u * Math.PI)), () => { anims.usagi = 'hop'; }); },
    /** 쿠구구궁: 땅이 울리며 창살이 바위벽 속으로 천천히 올라간다. */
    open() { rumble(ROCK_AT[0], ROCK_AT[1] + 0.6); tween(2.2, (u) => rock.open(ease(u)), null); },
    /** 어두운 동굴 안에서 풍뎅이가 아장아장 걸어 나온다(meet 자리까지). */
    beetleOut() {
      const to = SPOTS.meet.beetle, from = [ROCK_AT[0], ROCK_AT[1] - 0.2];
      beetle.root.visible = true;
      anims.beetle = 'walk';
      beetle.root.rotation.set(0, 0, 0);
      tween(2.6, (u) => beetle.root.position.set(from[0] + (to[0] - from[0]) * u, 0, from[1] + (to[1] - from[1]) * u), () => { anims.beetle = 'wave'; });
    },
    /** 쓰다듬으면 하트가 몽글몽글. */
    hearts() { heartT = 0; anims.beetle = 'hop'; },
    /** 풍뎅이가 두 팔을 번쩍: 반짝반짝 뿅! 돗자리 위에 음식이 하나씩 나타난다. */
    summon() {
      anims.beetle = 'cheer';
      sparkT = 0;
      dishes.forEach((d, i) => tween(0.35 + i * 0.28, () => {}, () => {
        d.visible = true;
        tween(0.3, (u) => d.scale.setScalar(Math.max(0.01, Math.sin(u * Math.PI * 0.75) / Math.sin(Math.PI * 0.75))), () => d.scale.setScalar(1));
      }));
    },
    /** ω 입이 쩍 벌어지며 부르르 → 펑: 흙먼지 속에서 우락부락한 근육질 괴물이 부풀어 올라 책상다리하고 앉는다. */
    monster() {
      anims.beetle = 'idle';
      showTag(beetle, 'teeth', true);
      tween(0.8, (u) => { beetle.root.rotation.z = Math.sin(u * Math.PI * 10) * 0.08; }, () => {
        beetle.root.rotation.z = 0;
        beetle.root.visible = false;
        rumble(MONSTER_AT[0], MONSTER_AT[1] + 1.2, 1.4);
        mon.root.visible = true;
        showTag(mon, 'sitLegs', true); showTag(mon, 'flyLegs', false); // 책상다리하고 앉는다
        mon.root.position.set(MONSTER_AT[0], 0, MONSTER_AT[1]);
        mon.root.rotation.set(0, 0, 0);
        tween(1.4, (u) => mon.root.scale.setScalar(MONSTER_S * (0.12 + 0.88 * ease(u)) * (1 + Math.sin(u * Math.PI) * 0.08)), () => mon.root.scale.setScalar(MONSTER_S));
      });
    },
    /** 등에서 날개가 펼쳐지고 퍼덕퍼덕 떠오른다(땅에서 뜨면 책상다리를 풀고 다리를 늘어뜨린다). */
    fly() {
      showTag(mon, 'wings', true);
      flap = true;
      flight = 'up';
      tween(2.4, (u) => {
        if (flight !== 'up') return;
        mon.root.position.y = ease(u) * 3.2; mon.root.rotation.x = 0.15 * ease(u);
        const hang = mon.root.position.y > 1.1;
        showTag(mon, 'sitLegs', !hang); showTag(mon, 'flyLegs', hang);
      }, null);
    },
    /** (숲가로 숨은 뒤) 하늘 저편으로 날아가 멀어진다(먼 산 너머에서 사라진다). 우리 등 뒤 카메라에는 괴물 등과 날개가 보인다. */
    flyAway() {
      flight = 'away';
      showTag(mon, 'wings', true); showTag(mon, 'sitLegs', false); showTag(mon, 'flyLegs', true);
      flap = true;
      mon.root.visible = true;
      mon.root.scale.setScalar(MONSTER_S);
      mon.root.rotation.set(0.35, 0, 0);
      const from = [0.3, 4.0, 26], to = [1.6, 11, 82]; // 끝에는 안개 너머로 묻힌다
      tween(9, (u) => { const e = u * u * 0.7 + u * 0.3; mon.root.position.set(lerp(from[0], to[0], e) + Math.sin(u * 5) * 0.3, lerp(from[1], to[1], e), lerp(from[2], to[2], e)); },
        () => { mon.root.visible = false; flap = false; });
    },
    /** 움직임(걸어 나오기 · 음식 · 커지기 · 날기)이 아직 끝나지 않았는지. */
    get busy() { return tweens.length > 0; },
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
      // 반짝이(음식을 불러낼 때) · 하트(쓰다듬을 때)
      sparkT += dt;
      const bp = beetle.root.position;
      sparks.forEach((m) => {
        const u = clamp01(sparkT / 1.6), a = m.userData.a + sparkT * 2;
        m.position.set(CLOTH[0] + Math.cos(a) * (0.3 + u * 0.9), 0.3 + u * 1.2 + Math.sin(a * 2) * 0.1, CLOTH[1] + Math.sin(a) * (0.3 + u * 0.6));
        m.lookAt(camera.position);
      });
      sparkMat.opacity = sparkT < 1.6 ? Math.sin((sparkT / 1.6) * Math.PI) : 0;
      heartT += dt;
      hearts.forEach((m) => {
        const u = (heartT * 0.8 + m.userData.ph) % 1;
        m.position.set(bp.x + (m.userData.ph - 0.33) * 0.4, 0.5 + u * 0.5, bp.z + 0.15);
        m.lookAt(camera.position);
      });
      heartMat.opacity = heartT < 2.2 ? Math.min(1, (2.2 - heartT) * 1.5) * 0.9 : 0;
      // 괴물: 숨 쉬듯 들썩이며 주먹에 힘을 줬다 뺐다, 날 때는 날개를 퍼덕퍼덕
      if (mon.root.visible) {
        const P = mon.pivots;
        mon.inner.position.y = Math.sin(t * 2.2) * 0.012;
        if (P.armL) P.armL.rotation.x = Math.sin(t * 2.2) * 0.06;
        if (P.armR) P.armR.rotation.x = Math.sin(t * 2.2 + 0.6) * 0.06;
        if (P.head) P.head.rotation.z = Math.sin(t * 1.3) * 0.05;
        if (flap) wings.forEach((m, i) => { m.rotation.z = m.userData.rz + Math.sin(t * 22 + i) * 0.25; });
        if (flight === 'up' && !tweens.length) mon.root.position.y = 3.2 + Math.sin(t * 3) * 0.12; // 떠오른 채 둥실
      }
      // 몸짓
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c || !c.root.visible) continue;
        const anim = anims[k] || 'idle';
        if (k !== 'beetle') c.root.position.y = anim === 'sit' || anim === 'nibble' ? SIT_LIFT : 0;
        animateChibi(c, anim, t, { phase: k === 'beetle' ? t * 10 : k.length });
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
