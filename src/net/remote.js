import { buildChibi, animateChibi } from '../actors/models.js';
import { groundY } from '../core/layout.js';

/**
 * 같이 놀기: 같은 방 다른 플레이어들의 캐릭터. 받은 위치로 부드럽게 따라가고(10번/초 남짓 오는 위치 사이를 메운다),
 * 머리 위에 이름표와 한마디 말풍선을 띄운다. 마을에 있을 때만 보인다(집 안 · 다른 장면이면 숨긴다).
 */

/** 그대로 따라 할 몸짓(그 밖 · 손에 무언가 드는 공격 몸짓은 서 있기로). */
const ANIMS = new Set(['idle', 'walk', 'pull', 'cheer', 'dance', 'hurt', 'slurp', 'gulp', 'nibble', 'pray', 'wave', 'clap', 'hop', 'sit', 'stretch', 'look', 'sway', 'spin', 'think', 'shy', 'pose', 'gaze']);
/** 한마디 말풍선이 떠 있는 시간(초). */
const SAY_SEC = 3.5;
/** 받은 위치와 이만큼 넘게 떨어져 있으면 따라가지 않고 바로 옮긴다(순간 이동 · 다시 접속). */
const SNAP = 8;

export function createRemotePlayers(scene) {
  const list = new Map();

  function add(p) {
    remove(p.id);
    let chibi;
    try { chibi = buildChibi(p.look || {}); } catch { chibi = buildChibi({}); } // 모르는 모습이면 기본 모습
    scene.add(chibi.root);
    const m = p.move || {}, x = m.x || 0, z = m.z || 0, yaw = m.yaw || 0;
    list.set(p.id, { id: p.id, name: p.name, chibi, x, z, yaw, tx: x, tz: z, tyaw: yaw, anim: m.anim || 'idle', area: m.area || 'village', t: Math.random() * 10, phase: 0, say: '', sayT: 0, emote: null, emoteT: 0 });
  }
  function move(id, m) {
    const p = list.get(id);
    if (!p) return;
    if (Math.hypot(m.x - p.x, m.z - p.z) > SNAP) { p.x = m.x; p.z = m.z; }
    p.tx = m.x; p.tz = m.z; p.tyaw = m.yaw; p.anim = m.anim; p.area = m.area;
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

  /** 매 프레임. show: 내가 마을에 있는지(집 안 · 장면 중이면 모두 숨긴다). */
  function update(dt, show) {
    const k = 1 - Math.exp(-dt * 10);
    for (const p of list.values()) {
      const vis = show && p.area === 'village';
      p.chibi.root.visible = vis;
      p.sayT = Math.max(0, p.sayT - dt);
      p.emoteT = Math.max(0, p.emoteT - dt);
      if (!vis) continue;
      const ox = p.x, oz = p.z;
      p.x += (p.tx - p.x) * k;
      p.z += (p.tz - p.z) * k;
      let d = p.tyaw - p.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.yaw += d * k;
      p.t += dt;
      p.phase += Math.hypot(p.x - ox, p.z - oz) * 3.2; // 걸음은 실제로 움직인 만큼(내 캐릭터와 같은 비율)
      const anim = p.emoteT > 0 ? p.emote : ANIMS.has(p.anim) ? p.anim : 'idle';
      p.chibi.root.position.set(p.x, groundY(p.x, p.z), p.z);
      p.chibi.root.rotation.y = p.yaw;
      animateChibi(p.chibi, anim, p.t, { phase: p.phase, moving: anim === 'walk' });
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

  return { add, move, say, emote, remove, clear, update, labels, get size() { return list.size; } };
}
