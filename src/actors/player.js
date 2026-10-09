import { animateChibi } from './models.js';

const SPEED = 3.2;
const RADIUS = 0.35;

/** 입력을 받아 내 캐릭터를 움직인다. */
export function createPlayer(scene, chibi, village) {
  scene.add(chibi.root);
  const position = { x: 0, z: 2 };
  let yaw = 0, phase = 0, t = 0;
  let model = chibi;
  let held = null;
  const showHeld = () => {
    for (const [tag, meshes] of Object.entries(model.props || {})) for (const m of meshes) m.visible = tag === held;
  };

  const api = {
    position,
    /** true 면 이동하지 않는다(풀 뽑기, 창 열림 등). */
    busy: false,
    /** 'idle' | 'walk' | 'pull' | 'cheer' | 'dance' */
    mode: 'idle',
    power: 0,
    cheerTime: 0,
    /** 친구와 같이 춤추는 남은 시간. */
    danceTime: 0,
    get yaw() { return yaw; },
    setPosition(x, z) {
      const p = village.nearestFree(x, z, RADIUS);
      position.x = p.x; position.z = p.z;
    },
    /** 충돌 검사 없이 바로 놓는다(마을 밖에서 걸어 들어오는 연출). */
    placeAt(x, z) { position.x = x; position.z = z; },
    /** 연출용 자동 걷기 목표 { x, z, speed }. 도착하면 null 이 된다. */
    walkTo: null,
    /** 모델을 바꾼다(캐릭터 다시 만들기). */
    setModel(next) {
      scene.remove(model.root);
      model = next;
      scene.add(model.root);
      showHeld();
    },
    /** 손에 드는 불 'lantern' | 'flashlight' | null. 모델을 바꿔도 유지한다. */
    setHeld(tag) { if (held === tag) return; held = tag; showHeld(); },
    /** 지점을 바라본다. */
    face(x, z) { yaw = Math.atan2(x - position.x, z - position.z); },
    update(dt, input) {
      t += dt;
      let moving = false;
      if (api.walkTo) {
        // 연출: 목표까지 충돌 검사 없이 걷는다
        const w = api.walkTo, dx = w.x - position.x, dz = w.z - position.z, d = Math.hypot(dx, dz);
        const step = (w.speed || 2.6) * dt;
        if (d <= step) { position.x = w.x; position.z = w.z; api.walkTo = null; }
        else {
          position.x += (dx / d) * step; position.z += (dz / d) * step;
          yaw = Math.atan2(dx, dz);
          phase += step * 3.2;
          moving = true;
        }
      }
      const v = api.busy || api.walkTo || moving ? { x: 0, y: 0 } : input.vector();
      const len = Math.min(1, Math.hypot(v.x, v.y));
      if (len > 0.12) {
        const dx = v.x / Math.hypot(v.x, v.y), dz = -v.y / Math.hypot(v.x, v.y);
        const step = SPEED * len * dt, ox = position.x, oz = position.z;
        const nx = position.x + dx * step, nz = position.z + dz * step;
        if (village.isFree(nx, position.z, RADIUS)) position.x = nx;
        if (village.isFree(position.x, nz, RADIUS)) position.z = nz;
        moving = Math.hypot(position.x - ox, position.z - oz) > step * 0.25; // 벽에 막혀 제자리면 걷는 몸짓을 하지 않는다
        const want = Math.atan2(dx, dz);
        let d = want - yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        yaw += Math.max(-dt * 10, Math.min(dt * 10, d));
        if (moving) phase += dt * SPEED * len * 3.2;
      }
      api.cheerTime = Math.max(0, api.cheerTime - dt);
      api.danceTime = Math.max(0, api.danceTime - dt);
      const mode = api.mode === 'pull' ? 'pull' : api.danceTime > 0 ? 'dance' : api.cheerTime > 0 ? 'cheer' : moving ? 'walk' : 'idle';
      model.root.position.set(position.x, 0, position.z);
      model.root.rotation.y = yaw;
      animateChibi(model, mode, t, { phase, power: api.power });
    }
  };
  return api;
}
