import { buildChibi, animateChibi, SEAT_LIFT } from '../actors/models.js';
import { groundY } from '../core/layout.js';

/**
 * 같이 놀기: 같은 방 다른 플레이어들의 캐릭터. 받은 위치로 부드럽게 따라가고(1초에 15번 남짓 오는 위치 사이를 걷는 빠르기로 메운다),
 * 머리 위에 이름표와 한마디 말풍선을 띄운다. 마을에 있을 때만 보인다(집 안 · 다른 장면이면 숨긴다).
 */

/** 그대로 따라 할 몸짓(그 밖은 서 있기로). swing · thrust: 같이 토벌할 때 휘두르기, faint: 쓰러져 깨워 주길 기다린다. */
const ANIMS = new Set(['idle', 'walk', 'pull', 'cheer', 'dance', 'hurt', 'slurp', 'gulp', 'nibble', 'pray', 'wave', 'clap', 'hop', 'sit', 'bench', 'stretch', 'look', 'sway', 'spin', 'think', 'shy', 'pose', 'gaze', 'swing', 'thrust', 'faint']);
/** 한마디 말풍선이 떠 있는 시간(초). */
const SAY_SEC = 3.5;
/** 받은 위치와 이만큼 넘게 떨어져 있으면 따라가지 않고 바로 옮긴다(순간 이동 · 다시 접속). */
const SNAP = 8;
/**
 * 늦게 보이지 않게: 걷는 중이면 받은 두 자리 사이의 빠르기로 다음 소식이 올 때까지 앞질러 그린다(LEAD 초까지만,
 * 소식이 끊기면 거기서 멈춘다). 멈추면('walk' 가 아니면) 바로 받은 자리로. 빠르기는 MAX_V 칸/초까지.
 */
const LEAD = 0.15, MAX_V = 8;
/** 받은 자리로 따라가는 빠르기(클수록 덜 늦고, 작을수록 부드럽다). */
const FOLLOW = 16;
/**
 * 받은 움직임의 손에 든 것(소품 꼬리표를 쉼표로: 'w-star,lantern' 무기와 등불, 'f-ramen' 먹는 음식). 영문 · 숫자 · '-' 만, 넷까지.
 * 모르는 꼬리표는 모델에 그 소품이 없어 아무것도 안 보인다.
 */
const heldOf = (m) => (m && typeof m.h === 'string' ? m.h.split(',').filter((t) => /^[a-zA-Z0-9_-]{1,20}$/.test(t)).slice(0, 4).join(',') : '');
/** 모습 비교용 글자(같은 모습이면 다시 만들지 않는다). */
const lookKey = (look) => { try { return JSON.stringify(look || {}); } catch { return ''; } };
/** 손에 든 등불(빛을 비춘다): 'lantern' | 'flashlight' | null. */
const lightOfHeld = (held) => (held.includes('flashlight') ? 'flashlight' : held.includes('lantern') ? 'lantern' : null);

/**
 * scene: 그릴 장면. area: 이 장면에 보일 사람의 있는 곳('village' 마을과 바깥 · 'home' 마을 주인의 집 안 — 집 안은 바닥 높이 0).
 */
export function createRemotePlayers(scene, area = 'village') {
  const list = new Map();
  const floorY = (x, z) => (area === 'village' ? groundY(x, z) : 0);

  function add(p) {
    remove(p.id);
    let chibi;
    try { chibi = buildChibi(p.look || {}); } catch { chibi = buildChibi({}); } // 모르는 모습이면 기본 모습
    scene.add(chibi.root);
    const m = p.move || {}, x = m.x || 0, z = m.z || 0, yaw = m.yaw || 0;
    list.set(p.id, { id: p.id, name: p.name, chibi, lookKey: lookKey(p.look), x, z, yaw, tx: x, tz: z, tyaw: yaw, vx: 0, vz: 0, at: 0, anim: m.anim || 'idle', area: m.area || 'village', held: heldOf(m), shownHeld: null, t: Math.random() * 10, phase: 0, say: '', sayT: 0, emote: null, emoteT: 0 });
  }
  /** 모습이 바뀌었다(옷 · 변신 · 포셰트): 캐릭터를 다시 만든다(같은 모습이면 그대로). */
  function setLook(id, look) {
    const p = list.get(id), key = lookKey(look);
    if (!p || key === p.lookKey) return;
    let chibi;
    try { chibi = buildChibi(look || {}); } catch { return; } // 모르는 모습이면 지금 모습 그대로
    scene.remove(p.chibi.root);
    chibi.root.visible = p.chibi.root.visible;
    p.chibi = chibi;
    p.lookKey = key;
    p.shownHeld = null; // 새 캐릭터에도 든 것을 다시 쥐여 준다
    scene.add(chibi.root);
  }
  /** 손에 든 것(무기 · 등불 · 음식)을 그 사람 화면과 같게 보인다(내 캐릭터의 showHeld 가 고른 꼬리표 그대로). */
  function showHeld(p) {
    if (p.held === p.shownHeld) return;
    p.shownHeld = p.held;
    const on = new Set(p.held ? p.held.split(',') : []);
    for (const [tag, meshes] of Object.entries(p.chibi.props || {})) for (const mesh of meshes) mesh.visible = on.has(tag);
  }
  function move(id, m) {
    const p = list.get(id);
    if (!p) return;
    const now = performance.now(), gap = p.at ? (now - p.at) / 1000 : 0;
    if (Math.hypot(m.x - p.x, m.z - p.z) > SNAP) { p.x = m.x; p.z = m.z; }
    // 걷는 중이면 지난 자리에서 온 빠르기를 재 둔다(멈췄거나 소식 사이가 너무 길면 0)
    if (m.anim === 'walk' && gap > 0.02 && gap < 0.4 && Math.hypot(m.x - p.tx, m.z - p.tz) < SNAP) {
      p.vx = (m.x - p.tx) / gap;
      p.vz = (m.z - p.tz) / gap;
      const v = Math.hypot(p.vx, p.vz);
      if (v > MAX_V) { p.vx *= MAX_V / v; p.vz *= MAX_V / v; }
    } else { p.vx = 0; p.vz = 0; }
    p.at = now;
    if (m.anim !== p.anim) p.animT = 0; // 휘두르기는 시작부터 다시
    p.tx = m.x; p.tz = m.z; p.tyaw = m.yaw; p.anim = m.anim; p.area = m.area; p.held = heldOf(m);
  }
  function say(id, text) { const p = list.get(id); if (p) { p.say = text; p.sayT = SAY_SEC; } }
  function emote(id, name) { const p = list.get(id); if (p && ANIMS.has(name)) { p.emote = name; p.emoteT = 2; } }
  function remove(id) {
    const p = list.get(id);
    if (!p) return;
    scene.remove(p.chibi.root);
    list.delete(id);
  }
  function clear() { for (const id of [...list.keys()]) remove(id); }

  /** 매 프레임. show: 내가 이 장면에 있는지(아니면 모두 숨긴다). 이 장면(area)에 있는 사람만 보인다. */
  function update(dt, show) {
    const k = 1 - Math.exp(-dt * FOLLOW), now = performance.now();
    for (const p of list.values()) {
      const vis = show && p.area === area;
      p.chibi.root.visible = vis;
      p.sayT = Math.max(0, p.sayT - dt);
      p.emoteT = Math.max(0, p.emoteT - dt);
      if (!vis) continue;
      const ox = p.x, oz = p.z;
      const ahead = p.at ? Math.min(LEAD, (now - p.at) / 1000) : 0; // 마지막 소식 뒤로 흐른 만큼 앞질러
      p.x += (p.tx + p.vx * ahead - p.x) * k;
      p.z += (p.tz + p.vz * ahead - p.z) * k;
      let d = p.tyaw - p.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.yaw += d * k;
      p.t += dt;
      p.animT = (p.animT || 0) + dt;
      p.phase += Math.hypot(p.x - ox, p.z - oz) * 3.2; // 걸음은 실제로 움직인 만큼(내 캐릭터와 같은 비율)
      const anim = p.emoteT > 0 ? p.emote : ANIMS.has(p.anim) ? p.anim : 'idle';
      p.chibi.root.position.set(p.x, floorY(p.x, p.z) + (anim === 'bench' ? SEAT_LIFT : 0), p.z); // 벤치 · 정자에 앉았으면 자리 높이로
      p.chibi.root.rotation.y = p.yaw;
      const swing = anim === 'swing' || anim === 'thrust' ? Math.min(1, p.animT / 0.34) : 0; // 휘두르기 진행(내 캐릭터의 SWING_TIME 과 같게)
      showHeld(p);
      animateChibi(p.chibi, anim, p.t, { phase: p.phase, moving: anim === 'walk', swing });
    }
  }

  /** 머리 위 표시(hud.placeLabels): 이름표, 한마디 말풍선은 그 위에. */
  function labels() {
    const out = [];
    for (const p of list.values()) {
      if (!p.chibi.root.visible) continue;
      const top = p.chibi.height;
      out.push({ id: 'mp-n-' + p.id, x: p.x, y: top + 0.2, z: p.z, text: p.name, kind: 'mp-name' });
      if (p.sayT > 0) out.push({ id: 'mp-s-' + p.id, x: p.x, y: top + 0.75, z: p.z, text: p.say, kind: 'bubble' });
    }
    return out;
  }

  /** 그 사람의 지금 몸짓(없으면 null). */
  function animOf(id) { const p = list.get(id); return p ? p.anim : null; }
  /** 받은 마지막 자리 · 있는 곳 · 몸짓 · 손에 든 것 [{ id, name, x, z, area, anim, held }](주인: 몬스터가 노릴 놀러 온 친구들). */
  function players() { return [...list.values()].map((p) => ({ id: p.id, name: p.name, x: p.tx, z: p.tz, area: p.area, anim: p.anim, held: p.held })); }
  /** 같이 노는 사람들의 캐릭터 모형 뿌리(다른 장면이 마을을 그릴 때 잠깐 숨긴다 — 파자마 파티즈 무대). */
  function roots() { return [...list.values()].map((p) => p.chibi.root); }
  /** 디버그: 그 사람 캐릭터에서 지금 보이는 소품 꼬리표 · 모습. */
  function debugOf(id) { const p = list.get(id); return p && { shown: Object.entries(p.chibi.props || {}).filter(([, ms]) => ms.some((m) => m.visible)).map(([t]) => t), look: p.lookKey }; }
  /** 지금 보이는 사람 [{ id, name, x, z, anim }](말 걸기 · 깨우기 대상). */
  function visible() {
    const out = [];
    for (const p of list.values()) if (p.chibi.root.visible) out.push({ id: p.id, name: p.name, x: p.x, z: p.z, anim: p.anim });
    return out;
  }
  /** 쓰러져 깨워 주길 기다리는 사람(보이는 사람만) [{ id, name, x, z }]. */
  function downed() { return visible().filter((p) => p.anim === 'faint'); }
  /** 등불을 든 사람(보이는 사람만) [{ id, x, z, yaw, mode: 'lantern' | 'flashlight' }] — 그 둘레를 밝힌다. */
  function lit() {
    const out = [];
    for (const p of list.values()) {
      const mode = p.chibi.root.visible ? lightOfHeld(p.held) : null;
      if (mode) out.push({ id: p.id, x: p.x, z: p.z, yaw: p.yaw, mode });
    }
    return out;
  }

  return { add, move, say, emote, setLook, remove, clear, update, labels, players, roots, visible, downed, lit, animOf, debugOf, get size() { return list.size; } };
}
