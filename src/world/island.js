import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi, propFor, showOnlyProp } from '../actors/models.js';
import { ISLE } from '../core/layout.js';
import { buildSiren, buildMermaid, buildIslander, addBatteryLid, buildJiro, buildDuckBoat, buildRowBoat, buildVineWrap, buildTendrils, giveLei, textBoard } from './islandcast.js';
import { batchStatic } from '../render/batch.js';

/**
 * 수상한 섬(사이드스토리 '수상한 섬 합숙' — 원작 세이렌(섬) 편): 마을과 따로 그리는 장면(우사기 클럽처럼).
 * 한 장면 안에 원작의 장소를 모두 둔다(대본 stories/islandscript.js 가 자리 · 카메라를 고른다):
 *  바다 위 오리 배 · 해변(환영 아치 · 포장마차 넷 · 게시판 · 모닥불 · 선착장) · 바다 위 방갈로 · '출입금지' 동굴(뭍 쪽 입구 · 바다 쪽 입구)
 *  · 동굴 속(세이렌의 굴) · 정글 속 시마지로의 카레 · 조개 가게 · 회상(세피아 바다) · 마지막 장면의 먼 바다.
 * 하늘: day · sunset · night · dawn · cave · memory · under(바닷속).
 */
const SKIES = {
  day: { bg: '#9ad7f5', fog: '#dff3fb', sea: '#5fc0e8', light: '#ffffff', near: 45, far: 160, hemi: 1.0, sun: 1.5 },
  sunset: { bg: '#f2a46f', fog: '#fcd9a8', sea: '#e59a7c', light: '#ffd8b8', near: 40, far: 150, hemi: 0.9, sun: 1.2 },
  dawn: { bg: '#f7c9b5', fog: '#fde3d3', sea: '#8fc4dd', light: '#ffe9dc', near: 40, far: 150, hemi: 0.95, sun: 1.2 },
  night: { bg: '#151b38', fog: '#2b3360', sea: '#1f2d5a', light: '#a3afe0', near: 30, far: 120, hemi: 0.75, sun: 0.5, stars: true },
  cave: { bg: '#0f1a26', fog: '#0f1a26', sea: '#1d5263', light: '#9cc6dc', near: 12, far: 48, hemi: 0.8, sun: 0.3 },
  memory: { bg: '#d9c39e', fog: '#d9c39e', sea: '#b49d7a', light: '#f3dfb8', near: 25, far: 110, hemi: 1.0, sun: 1.0 },
  under: { bg: '#0d3a52', fog: '#0d3a52', sea: '#1d5263', light: '#8fd0e8', near: 2, far: 16, hemi: 0.8, sun: 0.3 }
};
const PALS = ['chiikawa', 'hachiware', 'usagi', 'rakko', 'momonga', 'kani', 'kurimanju', 'shisa'];
const ISLANDERS = [['isl1', { ears: 'bunny', crown: true }], ['isl2', { crown: true }], ['isl3', { ears: 'round', shade: '#958f96' }], ['isl4', { shade: '#87828a' }]];
const ease = (k) => k * k * (3 - 2 * k);

function spriteTex(draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const radial = (stops) => (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); x.fillStyle = gr; x.fillRect(0, 0, s, s); };
const TEX = {
  flame: () => spriteTex(radial([[0, 'rgba(255,250,200,1)'], [0.35, 'rgba(255,190,80,0.95)'], [0.7, 'rgba(255,110,50,0.55)'], [1, 'rgba(255,80,40,0)']])),
  puff: () => spriteTex(radial([[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']])),
  glow: () => spriteTex(radial([[0, 'rgba(210,250,255,1)'], [0.4, 'rgba(140,220,255,0.7)'], [1, 'rgba(120,200,255,0)']])),
  note: () => spriteTex((x, s) => { x.fillStyle = '#ffffff'; x.strokeStyle = '#3a4a7a'; x.lineWidth = 5; x.font = `700 ${s * 0.8}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeText('♪', s / 2, s / 2); x.fillText('♪', s / 2, s / 2); })
};
const sprite = (map, color = '#ffffff', additive = false) => new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));

export function createIsland() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKIES.day.bg);
  scene.fog = new THREE.Fog(SKIES.day.fog, 45, 160);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9c4a5, 1.0), sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(20, 40, 25);
  scene.add(hemi, sun);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const light = new THREE.Color(1, 1, 1); // 캐릭터 단색 칠에 곱하는 빛(하늘마다 다르다)
  // g: 움직이거나 켜고 끄는 것 · env: 움직이지 않는 풍경(다 지은 뒤 칸마다 덩어리로 합친다 → 그리기 · 위치 계산이 확 준다)
  const g = new THREE.Group(), env = new THREE.Group();
  scene.add(g, env);
  const e = (geo, c, o) => { const mesh = toonMesh(geo, c, { shadow: false, ...o }); env.add(mesh); return mesh; };
  const T = { flame: TEX.flame(), puff: TEX.puff(), glow: TEX.glow(), note: TEX.note() };

  const seaMat = new THREE.MeshBasicMaterial({ color: SKIES.day.sea });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), seaMat);
  sea.position.y = -0.05;
  g.add(sea);
  buildIslandGround(e);
  buildPalms(e);
  buildStalls(env, e);
  buildWelcome(env, e);
  buildBungalows(e);
  const sign = buildCave(env, e);
  buildGrotto(env, e);
  buildHut(env, e);
  buildMemory(e);
  batchStatic(env, { skip: [sign], cell: 30 }); // 팻말은 쓰러진다 · 회상 소품은 숨겨 둔 채라 그대로
  const fires = { beach: makeFire(g, ISLE.fire.x, ISLE.fire.z, 1, T.flame), grotto: makeFire(g, ISLE.grotto.x - 2.4, ISLE.grotto.z - 1.4, 0.8, T.flame), hut: makeFire(g, ISLE.hut.x + 1.2, ISLE.hut.z + 0.95, 0.5, T.flame) };
  fires.grotto.group.position.y = 0.4; // 바위 턱 위
  const stars = buildStars(scene);
  const pot = new THREE.Group(); // 매운 카레 냄비(작전 회의): 해변 모닥불 위
  pot.add(toonMesh(GEO.cylinder, '#3a3236', { scale: [0.45, 0.5, 0.45], outline: 0.02, shadow: false }), toonMesh(GEO.cylinder, '#b8401f', { position: [0, 0.48, 0], scale: [0.4, 0.04, 0.4], outline: false, shadow: false }));
  pot.position.set(ISLE.fire.x, 0.3, ISLE.fire.z);
  pot.visible = false;
  g.add(pot);
  const fx = createFx(g, T);

  // 탈것: 오리 배 · 작은 보트 · 먼 바다의 작은 배(마지막 장면) · 바다 위 물결(배가 나아가는 느낌)
  const duck = buildDuckBoat(), row = buildRowBoat(), far = buildRowBoat('#8a6a4a');
  g.add(duck.root, row.root, far.root);
  const boats = { duck: { ...duck, spec: null }, row: { ...row, spec: null }, far: { ...far, spec: null } };
  const TUFTS = 34, tufts = new THREE.InstancedMesh(GEO.sphereLow, new THREE.MeshBasicMaterial({ color: '#ffffff' }), TUFTS); // 물결: 인스턴스 하나
  tufts.frustumCulled = false;
  tufts.visible = false;
  g.add(tufts);
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3();
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#0a1a2a', transparent: true, opacity: 0.45, depthWrite: false }));
  shadow.scale.set(3.2, 1, 6);
  shadow.visible = false;
  g.add(shadow);

  // 세이렌 · 인어 · 덩굴
  const siren = buildSiren();
  g.add(siren.root);
  const sv = { state: 'hide', t: 0, x: 0, z: 0, face: 0, y: -9, mouth: null };
  const mermaids = [buildMermaid(), buildMermaid(), buildMermaid()];
  mermaids.forEach((mm) => { mm.root.visible = false; g.add(mm.root); });
  let merSpec = [];
  const VINES = 6, vines = buildTendrils(VINES, 8); // 덩굴 줄기 여섯(인스턴스 하나)
  vines.root.visible = false;
  g.add(vines.root);
  let tenSpec = null; // { x, z, r, grow }

  // 사람들
  const cast = {};
  PALS.forEach((k) => { cast[k] = buildNpc(k); giveLei(cast[k]); });
  cast.hitoha = buildIslander({ leaves: 1 }); // 한잎: 머리 위 이파리 하나
  cast.futaba = buildIslander({ leaves: 2, shade: '#938e95' }); // 두잎: 이파리 둘
  const lid = addBatteryLid(cast.futaba);
  ISLANDERS.forEach(([k, o]) => { cast[k] = buildIslander(o); });
  cast.jiro = buildJiro();
  Object.values(cast).forEach((c) => { c.root.visible = false; g.add(c.root); });
  const who = {}, binds = {};
  let camFrom = null, camTo = null, camT = 0, camDur = 0, shakeT = 0;

  const api = {
    scene, camera, light, cast,
    /** 새로 섬에 간다: 내 생김새로 나를 만들고 모든 연출을 처음 상태로. */
    start(look) {
      if (cast.me) g.remove(cast.me.root);
      cast.me = buildChibi(look);
      giveLei(cast.me);
      g.add(cast.me.root);
      api.clear();
    },
    /** 모두 치운다(사람 · 세이렌 · 인어 · 덩굴 · 불 · 효과). 배는 선착장에. */
    clear() {
      for (const k of Object.keys(who)) delete who[k];
      Object.values(binds).forEach((b) => { b.visible = false; });
      Object.values(cast).forEach((c) => { c.root.visible = false; if (c.lei) c.lei.visible = false; });
      api.siren({ state: 'hide' });
      api.mermaids([]);
      api.tendrils(null);
      Object.values(fires).forEach((f) => { f.group.visible = false; });
      api.boat('duck', { x: ISLE.jetty.x + 3.3, z: ISLE.jetty.z + 2.5, face: 0 }); // 선착장 옆에 나란히
      api.boat('row', null); api.boat('far', null);
      api.sign(false); api.lid(false); api.memoryProps(false); api.pot(false); api.farShadow(false);
      fx.clear();
    },
    setSky(kind) {
      const s = SKIES[kind] || SKIES.day;
      scene.background.set(s.bg);
      scene.fog.color.set(s.fog);
      scene.fog.near = s.near; scene.fog.far = s.far;
      seaMat.color.set(s.sea);
      hemi.intensity = s.hemi; sun.intensity = s.sun;
      stars.visible = !!s.stars;
      light.set(s.light);
    },
    /** 사람을 세운다. spec: { x, z, face(라디안 | {x,z}), mode(몸짓), y, ride('duck' | 'row' | 'far') } | null(숨김). ride 면 x · z 는 배 기준. */
    place(kind, spec) {
      const c = cast[kind];
      if (!c) return;
      if (!spec) { delete who[kind]; c.root.visible = false; return; }
      const prev = who[kind];
      who[kind] = { ...spec };
      if (!prev || prev.mode !== spec.mode) showOnlyProp(c, propFor(kind, spec.mode));
    },
    pos(kind) { const c = cast[kind]; return who[kind] && c ? { x: c.root.position.x, y: c.root.position.y + 0.6, z: c.root.position.z } : null; },
    boatPos(kind) { const b = boats[kind]; return b.spec ? { x: b.spec.x, z: b.spec.z } : null; },
    lei(kind, on) { const c = cast[kind]; if (c && c.lei) c.lei.visible = on; },
    /** 덩굴에 묶였다 / 풀려났다. */
    bind(kind, on) {
      if (!binds[kind]) { binds[kind] = buildVineWrap(); g.add(binds[kind]); }
      binds[kind].visible = on;
    },
    unbindAll() { Object.values(binds).forEach((b) => { b.visible = false; }); },
    /** 카메라: pos · look 은 [x, y, z]. blend 초 동안 부드럽게(0 이면 바로). */
    setCamera(pos, look, blend = 0) {
      const to = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) };
      camFrom = blend > 0 && camTo ? { pos: camera.position.clone(), look: camTo.look.clone() } : null;
      camTo = to; camT = 0; camDur = blend;
    },
    shake(sec = 0.6) { shakeT = sec; },
    /** 세이렌: { state: hide|rise|idle|sing|friendly|angry|swipe|calm|hurt|leave, x, z, face, mouth(0..1 — 입 벌림을 직접) } */
    siren(spec) {
      const was = sv.state;
      Object.assign(sv, { mouth: null }, spec, { t: 0 });
      if (spec.state === 'rise') { sv.y = -7; fx.splash(sv.x, sv.z, 2.2); }
      if (spec.state === 'hide') sv.y = -9;
      if (spec.state !== 'rise' && was === 'hide' && spec.state !== 'hide') sv.y = 0;
    },
    sirenMouth(v) { sv.mouth = v; },
    get sirenState() { return sv.state; },
    /** 세이렌 입(카레 과녁) 위치. */
    mouthPos() { const p = new THREE.Vector3(); siren.parts.mouth.getWorldPosition(p); return p; },
    /** 인어들: [{ x, z, face, state: swim|sing|bitten }] */
    mermaids(list) { merSpec = list || []; mermaids.forEach((mm, i) => { mm.root.visible = !!merSpec[i]; if (!merSpec[i]) fx.notes(false, null, 'mer' + i); }); },
    /** 덩굴 줄기: { x, z, r } 둘레에서 솟는다 | null */
    tendrils(spec) { tenSpec = spec ? { r: 4, ...spec, grow: 0 } : null; vines.root.visible = !!spec; },
    /** 배: kind duck|row|far, spec { x, z, face, moving, capsize } | null */
    boat(kind, spec) { const b = boats[kind]; b.spec = spec ? { ...spec, t: 0 } : null; b.root.visible = !!spec; },
    fire(name, on) { if (fires[name]) fires[name].group.visible = on; },
    sign(fallen) { sign.rotation.x = fallen ? -Math.PI / 2 + 0.12 : 0; },
    lid(on) { lid.visible = on; },
    memoryProps(on) { env.traverse((o) => { if (o.userData.memory) o.visible = on; }); },
    farShadow(on, x = 0, z = 0) { shadow.visible = on; shadow.position.set(x, -0.02, z); },
    pot(on) { pot.visible = on; fx.steam(on, { x: ISLE.fire.x, y: 1.0, z: ISLE.fire.z, w: 0.25, size: 0.45 }, 'pot'); },
    notes(on, src) { fx.notes(on, src, 'script'); },
    steam(on, src) { fx.steam(on, src, 'script'); },
    bubbles(on) { fx.bubbles(on); },
    splash(x, z, s) { fx.splash(x, z, s); },
    /** 카레 그릇을 던진다: from → to(Vector3 | [x,y,z]), 도착하면 onArrive. */
    throwCurry(from, to, onArrive) { fx.throwBowl(from, to, onArrive); },
    flyScale(from) { fx.scale(from); },
    resize(aspect) { camera.aspect = aspect; camera.fov = aspect < 1 ? 62 : 45; camera.updateProjectionMatrix(); },
    update(dt, t) {
      updateBoats(dt, t);
      updateSiren(dt, t);
      updateSea(dt, t);
      updateCast(t);
      Object.values(fires).forEach((f) => { if (f.group.visible) { const k = 0.85 + Math.sin(t * 13 + f.s) * 0.08 + Math.sin(t * 7.3) * 0.06; f.flame.scale.set(0.8 * k * f.s, 1.05 * k * f.s, 1); } });
      if (stars.visible) stars.material.opacity = 0.75 + Math.sin(t * 2) * 0.15;
      fx.update(dt, t, camera);
      updateCamera(dt, t);
    }
  };

  function updateBoats(dt, t) {
    for (const b of Object.values(boats)) {
      if (!b.spec) continue;
      const s = b.spec;
      s.t += dt;
      b.root.position.set(s.x, Math.sin(t * 1.6 + s.x) * 0.06, s.z);
      b.root.rotation.set(Math.sin(t * 1.1) * 0.025, s.face || 0, Math.sin(t * 1.3) * 0.035);
      if (s.capsize) { const k = ease(Math.min(1, s.t / 0.6)); b.root.rotation.z = k * Math.PI * 0.95; b.root.position.y -= k * 0.3; }
      if (s.drift) { s.x += Math.sin(s.face) * s.drift * dt; s.z += Math.cos(s.face) * s.drift * dt; }
    }
  }
  function updateSea(dt, t) {
    const d = boats.duck.spec, on = !!(d && d.moving);
    tufts.visible = on;
    if (on) {
      // 배 둘레 30m 안에서 배 뒤쪽으로 흘러간다(배가 앞으로 나아가는 느낌)
      const span = 30, fwd = d.face || 0;
      for (let i = 0; i < TUFTS; i++) {
        const sx = ((i * 7.31) % span) - span / 2, along = ((i * 13.7 + t * 5) % span) - span / 2;
        m4.makeRotationY(fwd).scale(v3.set(0.5 + (i % 3) * 0.2, 0.05, 0.22));
        tufts.setMatrixAt(i, m4.setPosition(d.x + sx * Math.cos(fwd) - along * Math.sin(fwd), 0, d.z + sx * -Math.sin(fwd) - along * Math.cos(fwd)));
      }
      tufts.instanceMatrix.needsUpdate = true;
    }
    if (tenSpec) {
      tenSpec.grow = Math.min(1, tenSpec.grow + dt * 0.9);
      for (let i = 0; i < VINES; i++) {
        const a = (i / VINES) * Math.PI * 2 + 0.4, r = tenSpec.r + (i % 2) * 1.4, bx = tenSpec.x + Math.sin(a) * r, bz = tenSpec.z + Math.cos(a) * r * 0.6;
        for (let j = 0; j < vines.len; j++) {
          const h = j * 0.55 * tenSpec.grow, sw = Math.sin(t * 2.4 + j * 0.7 + i) * j * 0.13;
          vines.set(i, j, bx + sw * Math.cos(a), h, bz + sw * Math.sin(a), 0.32 - j * 0.025);
        }
      }
      vines.done();
    }
  }
  function updateSiren(dt, t) {
    const P = siren.parts, s = sv;
    s.t += dt;
    const target = s.state === 'hide' ? -9 : s.state === 'leave' ? -8 : 0;
    s.y += (target - s.y) * Math.min(1, dt * (s.state === 'rise' ? 1.8 : s.state === 'leave' ? 0.7 : 3));
    if (s.state === 'leave') { s.x -= Math.sin(s.face) * dt * 1.5; s.z -= Math.cos(s.face) * dt * 1.5; }
    siren.root.visible = s.y > -8.6;
    siren.root.position.set(s.x, s.y, s.z);
    siren.root.rotation.y = s.face;
    const st = s.state, sway = Math.sin(t * 0.9) * 0.05;
    // 지느러미 손: armZ 0 = 옆으로 쭉, + 면 위로. 눈썹: + 면 찌푸림(안쪽 끝이 내려간다)
    let armZ = 0.5, armX = 0, mouth = 0.06, eye = 1, shake = 0, brow = 0.22;
    if (st === 'sing') { armZ = 0.75 + Math.sin(t * 1.5) * 0.2; mouth = 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(t * 6)); brow = 0.05; }
    else if (st === 'friendly') { armX = -0.7; armZ = -0.2; eye = 0.45; brow = 0; }
    else if (st === 'angry') { armZ = 1.25 + Math.sin(t * 9) * 0.15; mouth = 0.24; shake = 0.06; brow = 0.55; }
    else if (st === 'calm' || st === 'leave') { eye = 0.12; armZ = 0.15; brow = 0; }
    else if (st === 'hurt') { armZ = 0.6 + Math.sin(t * 14) * 0.6; mouth = 0.36; shake = 0.12; eye = 0.3; brow = -0.25; }
    if (s.mouth != null) mouth = 0.06 + s.mouth * 0.32;
    P.body.rotation.z = sway * (st === 'calm' ? 0.5 : 1);
    P.body.position.x = shake ? Math.sin(t * 40) * shake : 0;
    P.armL.rotation.set(armX, 0, -armZ); P.armR.rotation.set(armX, 0, armZ);
    P.mouth.scale.y += (mouth - P.mouth.scale.y) * Math.min(1, dt * 12);
    P.eyes.forEach((e) => { e.scale.y = e.userData.sy * eye; });
    P.brows.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * brow; });
    P.blush.forEach((b) => { b.visible = st === 'hurt'; });
    const sw = st === 'swipe' ? Math.sin(Math.min(1, s.t / 1.1) * Math.PI) : 0;
    P.tail.rotation.y = -1.5 * sw;
    P.tail.position.y = -0.6 + sw * 1.8;
    P.fin.rotation.x = Math.sin(t * 2) * 0.2;
    fx.notes(st === 'sing', { x: s.x, y: s.y + 4.4, z: s.z }, 'siren');
    fx.steam(st === 'hurt', { x: s.x, y: s.y + 6.2, z: s.z }, 'siren');
    merSpec.forEach((ms, i) => {
      const mm = mermaids[i];
      if (!ms) return;
      mm.root.position.set(ms.x, Math.sin(t * 2 + i) * 0.08 - 0.1, ms.z);
      mm.root.rotation.y = ms.face || 0;
      mm.fin.rotation.x = Math.sin(t * 5 + i) * 0.35;
      mm.mouth.scale.y = ms.state === 'sing' ? 0.03 + 0.025 * (0.5 + 0.5 * Math.sin(t * 6 + i)) : 0.028;
      mm.root.position.x += ms.state === 'bitten' ? Math.sin(t * 40) * 0.05 : 0;
      fx.notes(ms.state === 'sing', { x: ms.x, y: 1.3, z: ms.z, w: 0.3, size: 0.4 }, 'mer' + i);
    });
  }
  function faceAngle(w) {
    if (typeof w.face === 'number') return w.face;
    if (w.face && typeof w.face === 'object') return Math.atan2(w.face.x - w.x, w.face.z - w.z);
    return 0;
  }
  function updateCast(t) {
    for (const [k, c] of Object.entries(cast)) {
      const w = who[k];
      if (!w) { c.root.visible = false; continue; }
      c.root.visible = true;
      let y = w.y || 0, x = w.x, z = w.z;
      const b0 = w.ride && boats[w.ride].spec;
      if (b0) { y = boats[w.ride].deckY + boats[w.ride].root.position.y; x += b0.x; z += b0.z; }
      c.root.position.set(x, y, z);
      c.root.rotation.y = faceAngle(w);
      if (c.animate) c.animate(w.mode || 'idle', t, w.x * 1.7 + w.z); // 섬사람(자기 몸짓)
      else animateChibi(c, w.mode || 'idle', t, { phase: w.x * 1.7 + w.z });
      const b = binds[k];
      if (b && b.visible) { b.position.set(x, y, z); b.rotation.y = t * 0.3; b.scale.setScalar(k === 'jiro' ? 1.4 : 1); }
    }
  }
  function updateCamera(dt, t) {
    if (!camTo) return;
    camT += dt;
    if (camFrom && camDur > 0) {
      const k = ease(Math.min(1, camT / camDur));
      camera.position.copy(camFrom.pos).lerp(camTo.pos, k);
      camera.lookAt(camFrom.look.clone().lerp(camTo.look, k));
    } else { camera.position.copy(camTo.pos); camera.lookAt(camTo.look); }
    if (shakeT > 0) { shakeT -= dt; camera.position.x += Math.sin(t * 60) * 0.12; camera.position.y += Math.cos(t * 47) * 0.08; }
  }
  return api;
}

// ---------- 장소 짓기 ----------
function buildIslandGround(m) {
  m(GEO.cylinder, '#f3dfa6', { position: [0, -0.3, 0], scale: [19, 0.3, 16], outline: 0.05, receive: true });
  m(GEO.cylinder, '#9fd36f', { position: [0, -0.28, -5], scale: [13, 0.3, 9.5], outline: 0.04, receive: true });
  // 선착장: 해변에서 바다로 뻗은 나무 판
  for (let z = ISLE.jetty.z - 4; z <= ISLE.jetty.z + 4.2; z += 0.7) m(GEO.box, z % 1.4 < 0.7 ? '#c49a6c' : '#b38a5c', { position: [ISLE.jetty.x, 0.12, z], scale: [1.6, 0.1, 0.62], outline: 0.015 });
  [-1, 1].forEach((sd) => [ISLE.jetty.z, ISLE.jetty.z + 4].forEach((z) => m(GEO.cylinder, '#8a5a34', { position: [ISLE.jetty.x + sd * 0.85, -0.6, z], scale: [0.1, 1, 0.1], outline: 0.01 })));
}
function palm(m, x, z, h, lean) {
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    m(GEO.cylinder, i % 2 ? '#b5895a' : '#a07a4c', { position: [x + lean * k * k * h * 0.4, k * h, z], scale: [0.17 - k * 0.05, h / 5.6, 0.17 - k * 0.05], outline: 0.02 });
  }
  const top = [x + lean * h * 0.4, h + 0.2, z];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    m(GEO.sphere, i % 2 ? '#5fb85a' : '#6fc767', { position: [top[0] + Math.sin(a) * 0.95, top[1] - 0.25, top[2] + Math.cos(a) * 0.95], rotation: [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6], scale: [0.45, 0.08, 1.2], outline: 0.02 });
  }
  m(GEO.sphere, '#7a5a3a', { position: [top[0], top[1] - 0.1, top[2]], scale: [0.2, 0.2, 0.2], outline: 0.015 });
}
function buildPalms(m) {
  [[-14, 7, 4.2, 0.6], [11.8, 12.2, 4.6, -0.5], [-17, 1, 3.8, 0.7], [11, -4, 4.0, -0.4], [-6, -4.5, 4.4, 0.3], [9, 13, 3.6, -0.6], [-15.5, 6.5, 3.9, 0.5],
    [-2, -9.5, 4.6, 0.2], [8.5, -9, 4.2, -0.3], [-5.5, -13, 4.8, 0.4], [7.5, -15, 4.0, -0.5], [0, -16.5, 4.4, 0.1], [11, -12, 3.8, -0.6], [-8.5, -8.5, 4.0, 0.5]]
    .forEach(([x, z, h, l]) => palm(m, x, z, h, l));
  // 정글 덤불
  [[-1, -13.5], [6.5, -13], [-3.5, -11], [9.5, -10.5], [1.5, -15.5], [-6.5, -10]].forEach(([x, z], i) => m(GEO.sphere, i % 2 ? '#5aa653' : '#6fbf63', { position: [x, 0.4, z], scale: [1.1, 0.75, 1.0], outline: 0.03 }));
}
function buildStalls(g, m) {
  [['섬 한정 라멘', '#e9584f', -6], ['과일 파르페', '#f48fb1', -2], ['야키소바', '#f2a03d', 2], ['솜사탕', '#7cbfe8', 6]].forEach(([name, col, x]) => {
    const z = ISLE.stalls.z;
    m(GEO.box, '#e8c48e', { position: [x, 0.5, z], scale: [2.2, 1.0, 0.9], outline: 0.03 });
    [-1, 1].forEach((sd) => m(GEO.cylinder, '#8a5a34', { position: [x + sd * 1.05, 0, z - 0.4], scale: [0.06, 2.3, 0.06], outline: 0.012 }));
    for (let i = 0; i < 5; i++) m(GEO.box, i % 2 ? '#ffffff' : col, { position: [x - 0.96 + i * 0.48, 2.25, z + 0.05], rotation: [0.35, 0, 0], scale: [0.48, 0.06, 1.3], outline: 0.012 });
    const b = textBoard(name, 1.9, 0.5, { bg: '#fff7e0', ink: '#5a3a22', size: 46 });
    b.position.set(x, 2.75, z - 0.35);
    g.add(b);
  });
}
function buildWelcome(g, m) {
  const z = 12.2;
  [-2.3, 2.3].forEach((x) => m(GEO.cylinder, '#a07a4c', { position: [x, 0, z], scale: [0.16, 3.1, 0.16], outline: 0.02 }));
  m(GEO.box, '#a07a4c', { position: [0, 3.1, z], scale: [5.2, 0.28, 0.3], outline: 0.02 });
  for (let i = 0; i < 11; i++) m(GEO.dot, ['#ff8fb1', '#ffd45e', '#ffffff', '#ff9e6e'][i % 4], { position: [-2.4 + i * 0.48, 3.28, z + 0.12], scale: [0.16, 0.14, 0.12], outline: 0.012 });
  const b = textBoard('어서 와요!', 2.6, 0.7, { bg: '#fff7e0', ink: '#c0392b', size: 54 });
  b.position.set(0, 3.75, z + 0.05);
  g.add(b);
  // 게시판(토벌 벽보)
  m(GEO.box, '#8a5a34', { position: [5, 0.9, 9.6], scale: [1.6, 1.1, 0.12], outline: 0.02 });
  [-0.7, 0.7].forEach((dx) => m(GEO.cylinder, '#8a5a34', { position: [5 + dx, 0, 9.6], scale: [0.06, 1.5, 0.06], outline: 0.01 }));
  const poster = textBoard('토벌: 세이렌', 1.3, 0.85, { w: 200, h: 130, bg: '#fff3d6', ink: '#7a2a20', size: 34 });
  poster.position.set(5, 0.92, 9.68);
  g.add(poster);
}
function buildBungalows(m) {
  const roof = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0);
  [[ISLE.bungalow.x, ISLE.bungalow.z - 2.4], [ISLE.bungalow.x + 2.6, ISLE.bungalow.z - 8]].forEach(([x, z]) => {
    [[-1.3, -1.3], [1.3, -1.3], [-1.3, 2.2], [1.3, 2.2]].forEach(([dx, dz]) => m(GEO.cylinder, '#8a5a34', { position: [x + dx, -0.6, z + dz], scale: [0.1, 1.2, 0.1], outline: 0.01 }));
    m(GEO.box, '#c49a6c', { position: [x, 0.55, z + 0.5], scale: [3, 0.14, 4], outline: 0.02 });
    m(GEO.box, '#ecd3a5', { position: [x, 1.42, z - 0.4], scale: [2.3, 1.6, 2], outline: 0.025 });
    m(GEO.box, '#5a3a22', { position: [x, 1.2, z + 0.62], scale: [0.6, 1.1, 0.04], outline: false });
    m(roof, '#c99a55', { position: [x, 2.2, z - 0.4], rotation: [0, Math.PI / 4, 0], scale: [2.1, 1.3, 2.1], outline: 0.03 });
  });
}
function buildCave(g, m) {
  [[-13, -7, 4.4, 3.8], [-16.2, -5.4, 3.2, 2.9], [-10.4, -8.6, 3.1, 2.7], [-14.6, -10.4, 3.4, 3.1], [-10.8, -4.4, 2.2, 1.8], [-17.4, -8.8, 2.4, 2.2]]
    .forEach(([x, z, r, h], i) => m(GEO.sphereMid, i % 2 ? '#8f8174' : '#a39584', { position: [x, 0, z], scale: [r, h, r * 0.9], outline: 0.05 }));
  const dark = new THREE.MeshBasicMaterial({ color: '#140e0c' });
  [[-12.2, 0.3, -2.95, 1.3, 1.5, 0.5], [-18.3, 0.2, -7, 0.5, 1.5, 1.6]].forEach(([x, y, z, sx, sy, sz]) => {
    const hole = new THREE.Mesh(GEO.sphereMid, dark);
    hole.position.set(x, y, z); hole.scale.set(sx, sy, sz);
    g.add(hole);
  });
  // '출입금지' 팻말: 밑동을 축으로 쓰러진다
  const sign = new THREE.Group();
  sign.position.set(ISLE.sign.x, 0, ISLE.sign.z);
  sign.add(toonMesh(GEO.cylinder, '#8a5a34', { position: [0, 0, 0], scale: [0.06, 1.25, 0.06], outline: 0.012, shadow: false }));
  const b = textBoard('출입금지', 1.1, 0.42, { bg: '#f6e7c8', ink: '#c0392b', size: 52 });
  b.position.set(0, 1.1, 0.05);
  sign.add(b);
  g.add(sign);
  return sign;
}
function buildGrotto(g, m) {
  const G = ISLE.grotto;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), new THREE.MeshBasicMaterial({ color: '#0c131c', side: THREE.BackSide }));
  dome.position.set(G.x, 0, G.z); dome.scale.set(14, 9, 14);
  g.add(dome);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r = 10 + (i % 3);
    if (Math.cos(a) > 0.8) continue; // 카메라가 서는 앞쪽(+z)은 비운다
    m(GEO.sphereMid, i % 2 ? '#4b505a' : '#5a5f6a', { position: [G.x + Math.sin(a) * r, 0, G.z + Math.cos(a) * r], scale: [3, 4 + (i % 4), 2.6], outline: 0.05 });
  }
  m(GEO.sphereMid, '#6a6f7a', { position: [G.x - 4, -0.15, G.z - 2], scale: [3.6, 0.6, 2.6], outline: 0.04 }); // 바위 턱(붙잡힌 친구들)
  const glow = new THREE.MeshBasicMaterial({ color: '#8fe6ff' });
  [[-7, -6], [6, -7], [8, 2], [-8, 3], [2, -9], [-3, -9.5]].forEach(([dx, dz], i) => {
    const c = new THREE.Mesh(GEO.cone, glow);
    c.position.set(G.x + dx, 0.2 + (i % 3) * 0.8, G.z + dz); c.scale.set(0.25, 0.9 + (i % 2) * 0.5, 0.25); c.rotation.z = (i % 2 ? 0.3 : -0.3);
    g.add(c);
  });
}
function buildHut(g, m) {
  const H = ISLE.hut;
  m(GEO.box, '#a07a4c', { position: [H.x, 0.1, H.z], scale: [4.2, 0.2, 3.2], outline: 0.02 });
  m(GEO.box, '#b98a56', { position: [H.x, 1.3, H.z - 1.5], scale: [4.2, 2.4, 0.16], outline: 0.025 });
  [-1, 1].forEach((sd) => m(GEO.box, '#b98a56', { position: [H.x + sd * 2.05, 1.3, H.z - 0.3], scale: [0.16, 2.4, 2.6], outline: 0.025 }));
  m(GEO.box, '#9a8a4a', { position: [H.x, 2.65, H.z - 0.1], rotation: [0.22, 0, 0], scale: [4.8, 0.18, 3.8], outline: 0.03 });
  m(GEO.box, '#c49a6c', { position: [H.x - 0.6, 0.55, H.z + 1.1], scale: [2.4, 0.9, 0.6], outline: 0.02 }); // 계산대
  m(GEO.cylinder, '#3a3236', { position: [H.x + 1.2, 0.25, H.z + 0.4], scale: [0.45, 0.5, 0.45], outline: 0.02 }); // 화덕 위 냄비
  m(GEO.cylinder, '#c98a2b', { position: [H.x + 1.2, 0.74, H.z + 0.4], scale: [0.4, 0.04, 0.4], outline: false });
  const lamp = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  lamp.position.set(H.x - 1.7, 2.2, H.z + 1.3); lamp.scale.setScalar(0.18);
  g.add(lamp);
  const b = textBoard('카레 · 조개', 2.2, 0.6, { bg: '#fff3d6', ink: '#7a3a12', size: 50 });
  b.position.set(H.x, 2.95, H.z + 1.75);
  b.rotation.x = -0.15;
  g.add(b);
}
function buildMemory(m) {
  const M = ISLE.memory, mark = (o) => { o.userData.memory = true; o.visible = false; return o; };
  mark(m(GEO.box, '#8a6a4a', { position: [M.x - 0.9, 0.1, M.z], rotation: [0.3, 0.4, 0.5], scale: [1.4, 0.36, 1.6], outline: 0.03 }));
  mark(m(GEO.box, '#8a6a4a', { position: [M.x + 1.1, 0.0, M.z + 0.6], rotation: [-0.2, -0.3, -0.6], scale: [1.4, 0.36, 1.5], outline: 0.03 }));
  mark(m(GEO.box, '#b08a5c', { position: [M.x + 0.2, 0.05, M.z + 2.2], scale: [2.2, 0.1, 0.9], outline: 0.02 })); // 널빤지(두잎이 누운)
  mark(m(GEO.sphere, '#9fd8e0', { position: [M.x + 4.5, 1.1, M.z - 3], rotation: [0, 0, 0.7], scale: [1.2, 0.22, 0.7], outline: 0.04 })); // 물 위로 솟은 지느러미
  mark(m(GEO.sphere, '#9fd8e0', { position: [M.x + 5.6, 1.0, M.z - 3], rotation: [0, 0, -0.7], scale: [1.2, 0.22, 0.7], outline: 0.04 }));
  mark(m(GEO.box, '#7a4a7a', { position: [M.x - 0.6, 0.12, M.z + 2.6], rotation: [0, 0.4, 0], scale: [0.36, 0.08, 0.28], outline: 0.01 })); // 도감
}
function makeFire(g, x, z, s, flameTex) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  [0, 1.2, 2.4].forEach((a) => group.add(toonMesh(GEO.cylinder, '#8a5a34', { position: [0, 0.08, 0], rotation: [Math.PI / 2, a, 0.3], scale: [0.07 * s, 0.45 * s, 0.07 * s], outline: 0.015, shadow: false })));
  const flame = sprite(flameTex, '#ffffff', true);
  flame.position.set(0, 0.45 * s, 0);
  group.add(flame);
  group.visible = false;
  g.add(group);
  return { group, flame, s };
}
function buildStars(scene) {
  const N = 300, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = (i * 2.399) % (Math.PI * 2), r = 90 + ((i * 37) % 50), y = 20 + ((i * 53) % 80);
    sp[i * 3] = Math.sin(a) * r; sp[i * 3 + 1] = y; sp[i * 3 + 2] = Math.cos(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.7, transparent: true, opacity: 0.9, depthWrite: false }));
  stars.visible = false;
  scene.add(stars);
  return stars;
}

// ---------- 효과: 물보라 · 음표 · 김 · 물방울 · 날아가는 카레 · 반짝이는 비늘 ----------
function createFx(g, T) {
  const pool = [];
  const spawn = (map, color, x, y, z, vx, vy, vz, life, size, grav = 0, additive = false) => {
    let p = pool.find((q) => !q.alive);
    if (!p) { p = { s: sprite(map, color, additive) }; g.add(p.s); pool.push(p); }
    p.s.material.map = map; p.s.material.color.set(color); p.s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    Object.assign(p, { alive: true, x, y, z, vx, vy, vz, life, max: life, size, grav });
    p.s.visible = true;
    return p;
  };
  const notes = {}, steam = {}; // 음표 · 김이 나오는 곳(세이렌 · 대본이 따로 켠다)
  let bubbles = false, acc = 0, bowl = null, scale = null;
  const bowlMesh = new THREE.Group();
  bowlMesh.add(toonMesh(GEO.cylinder, '#ffffff', { scale: [0.32, 0.22, 0.32], outline: 0.015, shadow: false }));
  bowlMesh.add(toonMesh(GEO.cylinder, '#b8401f', { position: [0, 0.2, 0], scale: [0.28, 0.04, 0.28], outline: false, shadow: false }));
  bowlMesh.visible = false;
  g.add(bowlMesh);
  return {
    clear() { pool.forEach((p) => { p.alive = false; p.s.visible = false; }); notes.script = steam.script = null; bubbles = false; bowl = scale = null; bowlMesh.visible = false; },
    notes(on, src, key) { notes[key] = on && src ? src : null; },
    steam(on, src, key) { steam[key] = on && src ? src : null; },
    bubbles(on) { bubbles = on; },
    splash(x, z, s = 1) { for (let i = 0; i < 18; i++) { const a = i * 2.4; spawn(T.puff, '#ffffff', x, 0.2, z, Math.sin(a) * 2.4 * s, 4 + (i % 4) * 1.2 * s, Math.cos(a) * 2.4 * s, 1.0, 0.6 * s, 9); } },
    throwBowl(from, to, onArrive) { bowl = { from: new THREE.Vector3(...(Array.isArray(from) ? from : [from.x, from.y, from.z])), to: Array.isArray(to) ? new THREE.Vector3(...to) : to.clone(), t: 0, dur: 0.85, onArrive }; bowlMesh.visible = true; },
    scale(from) { scale = { p: spawn(T.glow, '#bff4ff', from.x, from.y, from.z, -1.2, 1.6, -2.4, 4, 0.45, 0, true) }; },
    update(dt, t, camera) {
      acc += dt;
      if (acc > 0.32) {
        acc = 0;
        for (const n of Object.values(notes)) if (n) spawn(T.note, '#ffffff', n.x + Math.sin(t * 3) * (n.w ?? 1.4), n.y, n.z + 0.6, Math.sin(t) * 0.4, 1.2, 0.3, 2, n.size || 0.7);
        for (const s of Object.values(steam)) if (s) for (let i = 0; i < 2; i++) spawn(T.puff, '#ffffff', s.x + (i ? 0.8 : -0.8) * (s.w ?? 1), s.y, s.z, (i ? 0.4 : -0.4), 1.8, 0, 1.3, s.size || 0.9);
        if (bubbles) { const c = camera.position; for (let i = 0; i < 3; i++) spawn(T.puff, '#cfefff', c.x + Math.sin(t * 7 + i) * 2.5, c.y - 2, c.z - 3 - i, 0, 1.6, 0, 2.2, 0.22); }
      }
      for (const p of pool) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; p.s.visible = false; continue; }
        p.vy -= p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.s.position.set(p.x, p.y, p.z);
        const k = p.life / p.max;
        p.s.material.opacity = Math.min(1, k * 1.6);
        p.s.scale.setScalar(p.size * (1.2 - k * 0.4));
      }
      if (bowl) {
        bowl.t += dt;
        const k = Math.min(1, bowl.t / bowl.dur);
        bowlMesh.position.copy(bowl.from).lerp(bowl.to, k);
        bowlMesh.position.y += Math.sin(k * Math.PI) * 3;
        bowlMesh.rotation.set(k * 8, k * 3, 0);
        if (k >= 1) { const cb = bowl.onArrive; bowl = null; bowlMesh.visible = false; cb?.(); }
      }
      if (scale && !scale.p.alive) scale = null;
    }
  };
}
