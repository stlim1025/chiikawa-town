import { animateChibi } from './models.js';
import { groundY } from '../core/layout.js';

const SPEED = 3.2;
const RADIUS = 0.35;
const SWING_SLOW = 0.55; // 휘두르는 동안은 발걸음이 느려진다(미끄러지듯 팔만 휘두르지 않게)

/** 입력을 받아 내 캐릭터를 움직인다. */
export function createPlayer(scene, chibi, village) {
  scene.add(chibi.root);
  const position = { x: 0, z: 2 };
  let yaw = 0, phase = 0, t = 0;
  let model = chibi;
  let held = null, weapon = null, weaponShown = true, engraved = new Set(); // engraved: 얼굴을 새긴 무기(랭커)
  let rod = false; // 낚시하는 동안: 무기 대신 낚싯대(core/fishing.js)
  let swingT = 0, hurtT = 0, blinkT = 0, swingStyle = 'swing'; // swingStyle: 'swing'(내리치기) | 'thrust'(찌르기)
  let eatT = 0, eatDur = 1, eatMode = null, food = null; // 먹는 중: 몸짓('slurp' | 'gulp' | 'nibble') · 손에 든 음식 꼬리표('f-…')
  let actT = 0, actMode = null; // 연출 몸짓(별똥별에 소원 빌기 'pray' 등)
  const knock = { x: 0, z: 0 };
  // 먹는 동안은 음식만 든다(무기 · 손전등은 잠깐 넣어 둔다)
  let heldTags = ''; // 지금 보이는 소품 꼬리표(쉼표로) — 같이 놀기에서 다른 사람 화면에도 같게
  const showHeld = () => {
    const on = [];
    for (const [tag, meshes] of Object.entries(model.props || {})) {
      const vis = food ? tag === food : rod ? tag === 'rod' || tag === held : tag === held || !!(weaponShown && weapon && (tag === 'w-' + weapon || (tag === 'wf-' + weapon && engraved.has(weapon))));
      for (const m of meshes) m.visible = vis;
      if (vis) on.push(tag);
    }
    heldTags = on.join(',');
  };
  const stopEat = () => { eatT = 0; if (food) { food = null; showHeld(); } };

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
    /** 지금 캐릭터 모형의 뿌리(다른 장면이 마을을 그릴 때 잠깐 숨긴다 — 파자마 파티즈 무대). */
    get root() { return model.root; },
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
    /** 오른손 무기 id | null(4단계). */
    setWeapon(id) { if (weapon === id) return; weapon = id; showHeld(); },
    /** 낚싯대를 든다(무기는 잠깐 넣어 둔다) · 내려놓는다. */
    setRod(on) { if (rod === !!on) return; rod = !!on; showHeld(); },
    /** 낚싯대 끝(빨간 끝 부품)의 월드 자리를 out 에(낚싯줄을 잇는다). 들고 있지 않으면 null. */
    rodTip(out) { const list = model.props && model.props.rod; return rod && list && list.length ? list[list.length - 1].getWorldPosition(out) : null; },
    /** 얼굴을 새긴 무기들(토벌 랭커). */
    setEngraved(list) { const key = (list || []).join(','); if ([...engraved].join(',') === key) return; engraved = new Set(list || []); showHeld(); },
    /** 무기를 휘두른다(seconds 동안 휘두르기 몸짓). */
    swing(seconds = 0.32, style = 'swing') { stopEat(); actT = 0; swingT = seconds; api.swingDur = seconds; swingStyle = style; },
    /** 먹는다(mode: 'slurp' 그릇 들고 후루룩 · 'gulp' 잔 들고 꿀꺽 · 'nibble' 냠냠, prop: 손에 드는 음식). 걷거나 휘두르거나 맞으면 그만 먹는다. */
    eat(mode, prop, seconds) { eatT = seconds; eatDur = seconds; eatMode = mode; food = prop; showHeld(); },
    /** 연출 몸짓을 seconds 초 동안(mode: 'pray' 등, 0 이면 그만). 걷거나 휘두르거나 맞으면 그만둔다. */
    act(mode, seconds) { actMode = mode; actT = mode ? seconds : 0; },
    get swinging() { return swingT > 0; },
    /** 손에 든 것(보이는 소품 꼬리표를 쉼표로: 'w-star,lantern' · 'f-ramen', 없으면 ''). */
    get heldTags() { return heldTags; },
    /** 휘두르기 진행(0 → 1, 안 휘두르면 0). */
    get swingK() { return swingT > 0 ? 1 - swingT / api.swingDur : 0; },
    /** 맞았다: 밀려나고, 잠깐 휘청이며 깜빡인다. (vx, vz) 는 밀려나는 거리. */
    hurt(vx, vz, seconds = 1.0) { stopEat(); actT = 0; knock.x = vx * 7; knock.z = vz * 7; hurtT = 0.3; blinkT = seconds; },
    /** 깜빡임(맞은 뒤 잠깐 무적)을 멈춘다. */
    stopBlink() { blinkT = 0; model.root.visible = true; },
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
      // 맞아서 밀려나는 중이면 조작이 잠깐 안 먹는다
      if (Math.abs(knock.x) + Math.abs(knock.z) > 0.05) {
        const p = village.move(position.x, position.z, position.x + knock.x * dt, position.z + knock.z * dt, RADIUS);
        position.x = p.x; position.z = p.z;
        const damp = Math.exp(-dt * 10);
        knock.x *= damp; knock.z *= damp;
      }
      const v = api.busy || api.walkTo || moving || hurtT > 0 ? { x: 0, y: 0 } : input.vector();
      const len = Math.min(1, Math.hypot(v.x, v.y));
      if (len > 0.12 && eatT > 0) stopEat(); // 걸어가면 그만 먹는다
      if (len > 0.12) actT = 0;
      if (len > 0.12) {
        const dx = v.x / Math.hypot(v.x, v.y), dz = -v.y / Math.hypot(v.x, v.y);
        const pace = swingT > 0 ? SWING_SLOW : 1;
        const step = SPEED * len * pace * dt, ox = position.x, oz = position.z;
        // 막혀도 장애물을 따라 미끄러지며 간다(가로등 · 건물 모서리에 살짝 걸려도 멈추지 않게)
        const p = village.move(position.x, position.z, position.x + dx * step, position.z + dz * step, RADIUS);
        position.x = p.x; position.z = p.z;
        moving = Math.hypot(position.x - ox, position.z - oz) > step * 0.25; // 벽에 막혀 제자리면 걷는 몸짓을 하지 않는다
        const want = Math.atan2(dx, dz);
        let d = want - yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        yaw += Math.max(-dt * 10, Math.min(dt * 10, d));
        if (moving) phase += dt * SPEED * len * pace * 3.2;
      }
      api.cheerTime = Math.max(0, api.cheerTime - dt);
      api.danceTime = Math.max(0, api.danceTime - dt);
      swingT = Math.max(0, swingT - dt);
      hurtT = Math.max(0, hurtT - dt);
      if (eatT > 0) { eatT = Math.max(0, eatT - dt); if (eatT === 0) stopEat(); }
      actT = Math.max(0, actT - dt);
      const mode = api.mode === 'pull' ? 'pull' : hurtT > 0 ? 'hurt' : swingT > 0 ? swingStyle : eatT > 0 ? eatMode : actT > 0 ? actMode : api.danceTime > 0 ? 'dance' : api.cheerTime > 0 ? 'cheer' : moving ? 'walk' : 'idle';
      api.anim = mode; // 지금 몸짓(같이 놀기에서 다른 사람에게 보낸다)
      // 풀 뽑기 · 춤 · 만세 중에는 무기를 넣어 둔다(손이 풀 · 머리에 박히지 않게)
      const show = !(mode === 'pull' || mode === 'dance' || mode === 'cheer');
      if (show !== weaponShown) { weaponShown = show; showHeld(); }
      // 맞은 뒤 무적 시간에는 깜빡인다
      if (blinkT > 0) { blinkT = Math.max(0, blinkT - dt); model.root.visible = blinkT === 0 || Math.floor(blinkT * 14) % 2 === 0; }
      model.root.position.set(position.x, groundY(position.x, position.z) + (api.lift || 0), position.z); // 다리 위면 판 높이, lift: 통나무에 앉을 때처럼 조금 위로
      model.root.rotation.y = yaw;
      animateChibi(model, mode, t, { phase, power: api.power, swing: swingT > 0 ? 1 - swingT / api.swingDur : 0, moving, eat: eatT > 0 ? 1 - eatT / eatDur : undefined });
    }
  };
  return api;
}
