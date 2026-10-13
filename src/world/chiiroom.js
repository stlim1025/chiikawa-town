import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { buildStarman } from './starfall.js';

/**
 * 치이카와네 방(사이드스토리 '검은 별똥별' — stories/blackstar.js): 클럽 · 무대처럼 따로 그리는 장면.
 * 이불 · 작은 상 · 밤하늘 창 · 선반 위 커다란 빨간 자명종. 자명종 안에 검은 별똥별이 숨어 있다가 밤 12시에 나와
 * 흥얼거리며 시곗바늘을 거꾸로 돌린다. 마지막엔 산소 표백제를 푼 대야에 자명종을 담가 쫓아낸다.
 * → { scene, camera, light, start(look), shot(name, snap), setMood(m), star(m), spinBack(on), smash(), dunk(), busy, resize, update }
 */
const WALL_Z = -3.2;
const CLOCK = [1.9, 1.32, -2.72]; // 선반 위 자명종 가운데
const TUB = [0.55, 0, -0.75]; // 산소 표백제 대야
const KINDS = ['me', 'chiikawa', 'hachiware', 'usagi'];
// 장면마다 앉는 자리(x, z)와 바라보는 곳
const SPOTS = {
  watch: { me: [0.85, -1.25], chiikawa: [1.75, -1.35] },
  sleep: { chiikawa: [-1.05, -0.95], me: [-0.35, -0.8], hachiware: [0.35, -0.8], usagi: [1.05, -0.95] }, // 이불 앞에 나란히(얼굴이 보이게 앞을 본다)
  soak: { me: [1.55, -0.2], chiikawa: [-0.25, -0.55] }
};
const SHOTS = {
  room: { pos: [0.2, 2.9, 4.6], look: [0.3, 0.9, -1.2], portrait: { pos: [0.2, 3.3, 6.4], look: [0.3, 0.9, -1.2] } },
  clock: { pos: [1.3, 1.8, -0.1], look: [CLOCK[0] - 0.05, CLOCK[1] + 0.35, CLOCK[2]], portrait: { pos: [1.15, 1.9, 0.9], look: [CLOCK[0] - 0.05, CLOCK[1] + 0.35, CLOCK[2]] } }, // 자명종과 그 위로 나온 별까지
  tub: { pos: [0.3, 2.3, 2.0], look: [0.4, 0.45, -0.8], portrait: { pos: [0.3, 2.7, 3.2], look: [0.4, 0.45, -0.8] } }
};
const propsOf = (c) => new Set(Object.values(c.props || {}).flat());
const hideProps = (c) => propsOf(c).forEach((m) => { m.visible = false; });

/** 커다란 빨간 자명종(하얀 판 · 바늘 둘 · 노란 종 둘 · 다리 둘, 앞이 +z). 마을 장면 소품으로도 쓴다. → { group, hourHand, minHand } */
export function buildAlarmClock() {
  const group = new THREE.Group();
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
  const add = (parent, geo, c, pos) => { const m = new THREE.Mesh(geo, basic(c)); m.position.set(...pos); parent.add(m); return m; };
  const toon = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); group.add(m); return m; };
  toon(GEO.cylinder, '#e8584f', { position: [0, 0, -0.1], rotation: [Math.PI / 2, 0, 0], scale: [0.36, 0.2, 0.36], outline: 0.02 });
  add(group, new THREE.CircleGeometry(0.3, 32), '#fffaf0', [0, 0, 0.104]);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; add(group, new THREE.CircleGeometry(k % 3 ? 0.012 : 0.022, 8), '#4a3a3a', [Math.sin(a) * 0.25, Math.cos(a) * 0.25, 0.106]); }
  const hand = (len, w) => { const p = new THREE.Group(); p.position.z = 0.11; add(p, new THREE.PlaneGeometry(w, len), '#3a2a2a', [0, len / 2 - 0.02, 0]); group.add(p); return p; };
  const hourHand = hand(0.16, 0.035), minHand = hand(0.24, 0.022);
  add(group, new THREE.CircleGeometry(0.025, 12), '#e8584f', [0, 0, 0.115]);
  [-1, 1].forEach((sd) => toon(GEO.sphere, '#f2c84b', { position: [sd * 0.2, 0.34, -0.02], scale: [0.13, 0.11, 0.13], outline: 0.012 })); // 종 둘
  toon(GEO.box, '#c94a42', { position: [0, 0.38, -0.02], scale: [0.04, 0.1, 0.04], outline: false });
  [-1, 1].forEach((sd) => toon(GEO.cylinder, '#c94a42', { position: [sd * 0.2, -0.42, -0.02], scale: [0.04, 0.1, 0.04], outline: 0.01 })); // 다리
  return { group, hourHand, minHand };
}

export function createChiiRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b2230');
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x5a4a5a, 1.0));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  const light = new THREE.Color(0.95, 0.92, 0.98); // 밤 방 안 불빛(살짝 푸르스름)
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const add = (parent, geo, mat, pos, scale, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (scale) m.scale.set(...scale); if (rot) m.rotation.set(...rot); parent.add(m); return m; };
  const toon = (parent, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); parent.add(m); return m; };

  // ---------- 방: 나무 바닥 · 연분홍 벽 · 천장 ----------
  toon(scene, GEO.box, '#d8b48a', { position: [0, -0.05, 0], scale: [9, 0.1, 8], outline: false });
  for (let i = -4; i <= 4; i += 0.9) add(scene, new THREE.PlaneGeometry(0.025, 8).rotateX(-Math.PI / 2), basic('#b98f66'), [i, 0.002, 0]);
  toon(scene, GEO.box, '#f6e1d6', { position: [0, 2, WALL_Z - 0.1], scale: [9, 4, 0.2], outline: false });
  [-1, 1].forEach((sd) => toon(scene, GEO.box, '#f1d8cc', { position: [sd * 4.4, 2, 0.8], scale: [0.2, 4, 8], outline: false }));
  toon(scene, GEO.box, '#e7c2b2', { position: [0, 0.25, WALL_Z], scale: [9, 0.5, 0.06], outline: false }); // 걸레받이
  add(scene, new THREE.PlaneGeometry(9, 8).rotateX(Math.PI / 2), basic('#4a3a48'), [0, 4, 0.8]); // 천장
  // 창(뒷벽 왼쪽): 밤하늘 · 작은 별
  toon(scene, GEO.box, '#c9a07a', { position: [-1.7, 2.05, WALL_Z + 0.02], scale: [1.5, 1.25, 0.08], outline: 0.02, shell: true });
  add(scene, new THREE.PlaneGeometry(1.32, 1.07), basic('#22305a'), [-1.7, 2.05, WALL_Z + 0.07]);
  [[-2.1, 2.3], [-1.45, 2.45], [-1.9, 1.8], [-1.25, 1.95], [-2.2, 1.65]].forEach(([x, y]) => add(scene, new THREE.CircleGeometry(0.025, 6), basic('#fff6c8'), [x, y, WALL_Z + 0.075]));
  toon(scene, GEO.box, '#c9a07a', { position: [-1.7, 2.05, WALL_Z + 0.08], scale: [0.05, 1.07, 0.03], outline: false });

  // ---------- 이불 · 베개 · 작은 상 ----------
  toon(scene, GEO.box, '#ffffff', { position: [-1.4, 0.07, -1.3], scale: [1.4, 0.14, 1.9], outline: 0.02, shell: true });
  toon(scene, GEO.box, '#f6b6c8', { position: [-1.4, 0.17, -1.0], scale: [1.42, 0.1, 1.2], outline: 0.02, shell: true });
  toon(scene, GEO.sphere, '#fff6ea', { position: [-1.4, 0.24, -2.0], scale: [0.45, 0.12, 0.25], outline: 0.015 });
  const table = new THREE.Group();
  table.position.set(-0.9, 0, 1.1);
  toon(table, GEO.cylinder, '#b9845a', { position: [0, 0.3, 0], scale: [0.55, 0.06, 0.55], outline: 0.015 });
  [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(([x, z]) => toon(table, GEO.box, '#9a6a44', { position: [x, 0.15, z], scale: [0.06, 0.3, 0.06], outline: false }));
  scene.add(table);

  // ---------- 선반 위 커다란 빨간 자명종(바늘이 돈다) ----------
  toon(scene, GEO.box, '#c99a6a', { position: [CLOCK[0], 0.45, CLOCK[2] - 0.08], scale: [1.3, 0.9, 0.62], outline: 0.02, shell: true });
  const { group: clock, hourHand, minHand } = buildAlarmClock();
  clock.position.set(...CLOCK);
  scene.add(clock);
  const clockHome = clock.position.clone();

  // ---------- 검은 별똥별(자명종 속에 숨어 있다) ----------
  const star = buildStarman({ dark: true });
  star.group.scale.setScalar(0.3);
  star.group.visible = false;
  scene.add(star.group);
  const notes = Array.from({ length: 3 }, (_, i) => { const n = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), basic('#cfc4ff', { transparent: true, opacity: 0 })); n.userData.ph = i / 3; scene.add(n); return n; });

  // ---------- 산소 표백제 대야(담그는 장면에서만) ----------
  const tub = new THREE.Group();
  tub.position.set(...TUB);
  toon(tub, GEO.cylinder, '#9cc9e6', { scale: [0.6, 0.34, 0.6], outline: 0.02 });
  add(tub, new THREE.CircleGeometry(0.56, 28).rotateX(-Math.PI / 2), basic('#eef8ff'), [0, 0.345, 0]);
  const foamMat = basic('#ffffff'); // 거품은 그늘 없이 하얗게
  const foam = Array.from({ length: 9 }, (_, i) => { const a = i * 2.4; const b = add(tub, GEO.sphereLow, foamMat, [Math.cos(a) * 0.35 * ((i % 3) / 3 + 0.3), 0.36, Math.sin(a) * 0.3 * ((i % 3) / 3 + 0.3)], [0.07, 0.05, 0.07]); b.userData.ph = i * 0.7; return b; });
  tub.visible = false;
  scene.add(tub);

  // ---------- 우리 넷 ----------
  let me = null;
  const pals = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi') };
  Object.values(pals).forEach((c) => { hideProps(c); scene.add(c.root); });
  const charOf = (k) => (k === 'me' ? me : pals[k]);

  let shot = SHOTS.room, snapNext = true, mood = 'watch', starMode = 'hide', starT = 0, spin = false, smashT = -1, dunkT = -1;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const OUT = new THREE.Vector3(CLOCK[0] - 0.15, CLOCK[1] + 0.7, CLOCK[2] + 0.45); // 자명종 위에 둥실
  const PLEAD = new THREE.Vector3(TUB[0] + 0.1, 1.15, TUB[2] + 0.35); // 대야 앞에서 매달린다
  const WINDOW = new THREE.Vector3(-1.7, 2.05, WALL_Z - 0.6);

  function place(k, x, z, faceX, faceZ) {
    const c = charOf(k);
    if (!c) return;
    c.root.position.set(x, 0, z);
    c.root.rotation.y = Math.atan2(faceX - x, faceZ - z);
    c.root.visible = true;
  }

  return {
    scene,
    camera,
    light,
    /** 새로 들어왔다: 내 생김새 look. 자명종은 선반 위에, 별똥별은 숨어 있다. */
    start(look) {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      hideProps(me);
      scene.add(me.root);
      clock.position.copy(clockHome);
      clock.rotation.set(0, 0, 0);
      clock.visible = true;
      star.group.visible = false;
      starMode = 'hide';
      spin = false; smashT = -1; dunkT = -1;
      this.setMood('watch');
      shot = SHOTS.room; snapNext = true;
    },
    /** 카메라: 'room' 방 전체 · 'clock' 자명종 가까이 · 'tub' 대야. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.room; if (snap) snapNext = true; },
    /** 'watch' 나랑 치이카와가 자명종 앞에 · 'sleep' 넷이 이불 둘레에 · 'soak' 대야 앞(치이카와가 자명종을 든다). */
    setMood(m) {
      mood = m;
      const at = SPOTS[m] || {};
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c) continue;
        if (!at[k]) { c.root.visible = false; continue; }
        const [x, z] = at[k];
        const look = m === 'soak' ? [TUB[0], TUB[2]] : m === 'watch' ? [CLOCK[0], CLOCK[2]] : [x, z + 3];
        place(k, x, z, look[0], look[1]);
      }
      tub.visible = m === 'soak';
      if (m === 'soak') { clock.position.set(TUB[0] - 0.45, 0.62, TUB[2] + 0.05); clock.rotation.set(0, 0.6, 0); } // 치이카와가 대야 옆에 들고 있다
      else { clock.position.copy(clockHome); clock.rotation.set(0, 0, 0); }
    },
    /** 별똥별: 'hide' 숨음 · 'out' 자명종에서 나와 둥실(흥얼흥얼) · 'plead' 대야 앞에서 매달림 · 'gone' 창밖으로 슝. */
    star(m) { starMode = m; starT = 0; star.group.visible = m !== 'hide'; if (m === 'out') star.group.position.set(CLOCK[0], CLOCK[1], CLOCK[2] + 0.1); },
    /** 시곗바늘이 거꾸로 뱅글뱅글. */
    spinBack(on) { spin = !!on; },
    /** 우사기가 "우라!" 하고 내리친다: 별똥별은 쏙 자명종 속으로. */
    smash() { smashT = 0; },
    /** 자명종을 대야에 퐁당 담근다. */
    dunk() { dunkT = 0; },
    /** 움직임(내리치기 · 담그기 · 별이 날아가기)이 아직 끝나지 않았는지. */
    get busy() { return (smashT >= 0 && smashT < 1.2) || (dunkT >= 0 && dunkT < 1.4) || (starMode === 'gone' && starT < 2.2); },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 64 : 42;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      // 시곗바늘: 평소엔 째깍째깍, 거꾸로 돌 땐 뱅글뱅글
      if (spin) { minHand.rotation.z += dt * 14; hourHand.rotation.z += dt * 2.2; }
      else { minHand.rotation.z = -((t * 0.2) % (Math.PI * 2)); hourHand.rotation.z = -0.4; }
      // 별똥별
      starT += dt;
      const P = star.group.position;
      if (starMode === 'out') {
        const u = Math.min(1, starT / 1.1), e = u * u * (3 - 2 * u);
        P.lerpVectors(tmpPos.set(CLOCK[0], CLOCK[1], CLOCK[2] + 0.1), OUT, e);
        P.y += Math.sin(t * 2.6) * 0.05 * e;
        star.group.rotation.z = Math.sin(t * 3) * 0.2 + (spin ? t * 6 : 0);
        star.group.scale.setScalar(0.3 * (0.4 + 0.6 * e));
      } else if (starMode === 'plead') {
        P.lerp(PLEAD, Math.min(1, dt * 3));
        P.y += Math.sin(t * 9) * 0.01;
        star.group.rotation.z = Math.sin(t * 14) * 0.12; // 바들바들
      } else if (starMode === 'gone') {
        const u = Math.min(1, starT / 2), e = u * u;
        P.lerp(WINDOW, Math.min(1, dt * (1 + e * 4)));
        star.group.rotation.z += dt * 8;
        star.group.scale.setScalar(0.3 * Math.max(0, 1 - Math.max(0, starT - 1.2)));
      }
      if (smashT >= 0) { // 우사기 내리치기: 별은 자명종 속으로 쏙
        smashT += dt;
        if (smashT > 0.45 && starMode === 'out') { starMode = 'hide'; star.group.visible = false; }
        clock.position.y = clockHome.y + (smashT > 0.4 && smashT < 0.7 ? Math.sin((smashT - 0.4) * 60) * 0.03 : 0);
      }
      if (dunkT >= 0) { // 대야에 퐁당
        dunkT += dt;
        const u = Math.min(1, dunkT / 0.8);
        clock.position.set(TUB[0] - 0.45 + 0.45 * u, 0.62 - 0.42 * u, TUB[2] + 0.05);
        clock.rotation.z = u * 0.5;
      }
      // 흥얼흥얼 음표(별이 나와 있을 때)
      notes.forEach((n) => {
        const u = (t * 0.6 + n.userData.ph) % 1;
        n.position.set(P.x + 0.2 + u * 0.3, P.y + 0.15 + u * 0.5, P.z);
        n.material.opacity = starMode === 'out' ? Math.sin(u * Math.PI) * 0.9 : 0;
      });
      foam.forEach((b) => { b.scale.setScalar(0.06 + Math.abs(Math.sin(t * 3 + b.userData.ph)) * 0.04 + (dunkT >= 0 ? 0.04 : 0)); });
      // 우리 넷의 몸짓
      for (const k of KINDS) {
        const c = charOf(k);
        if (!c || !c.root.visible) continue;
        let anim = 'sit';
        if (mood === 'watch') anim = k === 'chiikawa' && starMode !== 'hide' ? 'shy' : 'sit';
        else if (mood === 'sleep') anim = k === 'usagi' && smashT >= 0 && smashT < 0.9 ? 'swing' : k === 'hachiware' && starMode === 'out' ? 'talk' : 'sit';
        else if (mood === 'soak') anim = k === 'chiikawa' ? (starMode === 'plead' ? 'shy' : 'idle') : 'idle';
        animateChibi(c, anim, t, { phase: k.length, swing: anim === 'swing' ? Math.min(1, smashT / 0.8) : 0 });
      }
      // 카메라
      const sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot, kk = Math.min(1, dt * 2.6);
      tmpPos.set(...sh.pos); tmpLook.set(...sh.look);
      if (snapNext) { camPos.copy(tmpPos); camLook.copy(tmpLook); snapNext = false; }
      else { camPos.lerp(tmpPos, kk); camLook.lerp(tmpLook, kk); }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    }
  };
}
