import * as THREE from 'three';
import { toonMesh, celMaterial, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi, wearPajama, PAJAMA_COLORS } from '../actors/models.js';
import { PLAZA } from '../core/layout.js';

/**
 * 파자마 파티즈 무대(사이드스토리 '파자마 파티즈'): 밤의 마을 광장에 세운 작은 무대. 이 장면에는 무대 · 아이돌 · 관객만 두고(배경 없음),
 * main.js 가 진짜 마을을 같은 카메라로 먼저 그린 뒤 그 위에 겹쳐 그린다. 아래 자리 · 카메라는 무대 기준(AT 이 원점, 무대는 −z 북쪽)이다.
 * 무대 위에는 원작처럼 귀 달린 후드 잠옷을 입고 얼굴은 까만 그림자인 아이돌 넷(가운데 초록이 마이크), 앞에는 나 · 치이카와 · 하치와레(응원봉),
 * 노래가 귀에 남아 하나둘 모여드는 갑옷 씨 관객, 2절에는 우사기 · 치이카와 · 하치와레가 무대에 올라 다 같이 춤춘다.
 * 몸짓은 곡 박(beat)에 맞춘다(models.js 의 'idol' · 'idolSing' · 'glow'). 카메라는 shot(이름)으로 부드럽게 옮긴다.
 */
// 잠옷 색: 원작 그림의 연보라 · 풀빛 초록 · 산호 분홍 · 하양
export const IDOLS = [
  { id: 'idolV', name: '보라', color: '#cbbde9' },
  { id: 'idolG', name: '초록', color: '#a5c58c', lead: true },
  { id: 'idolP', name: '분홍', color: '#f28f9b' },
  { id: 'idolW', name: '하양', color: '#fbfaf3' }
];
const FACE_SHADOW = '#56545c', FACE_BLUSH = '#151316'; // 후드 안 얼굴: 이목구비 없이 동그란 까만 그림자, 볼에 빗금(///) 홍조(원작)
const HATCH = new THREE.SphereGeometry(1, 8, 6); // 빗금 한 줄(가늘고 긴 납작 타원)
const STAGE_Y = 0.7;
const IDOL_X = [-2.1, -0.7, 0.7, 2.1];
/**
 * 무대 자리(마을 좌표): 광장 한가운데(시계탑 자리) 바로 남쪽. 무대 뒤로 시계탑 · 노동 접수 · 경품 추첨 줄이 보이고,
 * 관객석은 광장 남쪽 끝 꽃밭 사이(카메라도 마을처럼 남쪽에서 북쪽을 본다). 관객 자리는 둘레 가로등 · 나무 · 꽃밭을 비켜 잡았다.
 */
const AT = { x: PLAZA.x, z: PLAZA.z + 5.7 };
const PALS = ['chiikawa', 'hachiware', 'usagi'];
const SEATS = { me: [0, 1.3], chiikawa: [-1.15, 2.2], hachiware: [1.15, 2.2], usagi: [4.3, -1.0] }; // 우사기는 처음엔 무대 계단 옆(나타나면 바로 무대로)
const ON_STAGE = { chiikawa: [-1.4, -2.15], hachiware: [0, -2.05], usagi: [1.4, -2.15] }; // 2절: 무대 앞줄
// 갑옷 씨 관객: 무대 앞 좌우 날개(가운데 뒤는 비워 카메라가 무대 · 우리 일행을 보게)
const FANS = [['labor', -3.6, 1.6], ['pochette', 3.6, 1.7], ['labor', -4.7, 0.5], ['captain', 4.7, 0.6], ['labor', -4.4, 3.0], ['pochette', 3.3, 3.2], ['labor', -5.0, 2.5]];
const GLOW = ['#ffe45f', '#ff9ae3', '#7fe0ff', '#9dff8a', '#ffb36b'];
const GLOW_C = GLOW.map((c) => new THREE.Color(c)); // 매 장면 색을 바꿀 때 글자 풀기 없이
const SHOTS = {
  wide: { pos: [0, 5.0, 8.8], look: [0, 1.2, -2.6] },
  stage: { pos: [-0.8, 2.3, 3.2], look: [0, 1.55, -3.1], portrait: { pos: [-0.8, 2.9, 5.6], look: [0, 1.45, -3.1] } }, // 조금 왼쪽에서: 관객석 오른쪽 가로등이 화면에 걸리지 않게
  crowd: { pos: [0, 2.7, -2.4], look: [0, 0.8, 3.2] },
  dance: { pos: [0, 4.8, 4.7], look: [0, 1.2, -3.0], portrait: { pos: [0, 5.6, 7.4], look: [0, 1.2, -3.0] } }, // 세로 화면은 좁아서 조금 뒤에서(양 끝 아이돌까지)
  finale: { pos: [0, 4.4, 6.8], look: [0, 1.4, -2.8] }
};
const WHITE = new THREE.Color(1, 1, 1);

/** 들고 다니는 소품(무기 · 도구) 메시들. */
const propsOf = (c) => new Set(Object.values(c.props || {}).flat());
/** 가장 큰 부품(머리 · 팔 · 몸통 자리를 잡는 데 쓴다). 합친 덩어리(크기 1)와 skip(소품 — 팔에 붙은 사스마타를 손으로 잘못 잡지 않게)은 뺀다. */
const biggest = (g, skip) => { let b = null; (g ? g.children : []).forEach((m) => { if (m.isMesh && !m.userData.merged && !(skip && skip.has(m)) && (!b || m.scale.x * m.scale.y * m.scale.z > b.scale.x * b.scale.y * b.scale.z)) b = m; }); return b; };
/** 무대에서는 무기 · 도구를 숨긴다(파자마 파티). */
const hideProps = (c) => propsOf(c).forEach((m) => { m.visible = false; });
/** 손 끝 자리(팔 마디 안 좌표). */
function hand(c, side = 'armR') {
  const p = c.pivots && c.pivots[side], arm = biggest(p, propsOf(c));
  return p ? { pivot: p, at: arm ? new THREE.Vector3(arm.position.x, arm.position.y - arm.scale.y * 0.92, arm.position.z) : new THREE.Vector3(0, -0.3, 0) } : null;
}
/** 손에 응원봉(빛나는 막대). */
function giveGlow(c, color) {
  const h = hand(c);
  if (!h) return null;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.42, 8), new THREE.MeshBasicMaterial({ color }));
  stick.position.copy(h.at).add(new THREE.Vector3(0, -0.2, 0.02));
  const grip = toonMesh(GEO.cylinder, '#5a4a6a', { position: [h.at.x, h.at.y - 0.05, h.at.z + 0.02], scale: [0.04, 0.09, 0.04], outline: 0.01, shadow: false });
  h.pivot.add(stick, grip);
  return stick;
}

export function createIdolStage() {
  const scene = new THREE.Scene(); // 배경 없음: 마을 위에 겹쳐 그린다
  scene.add(new THREE.HemisphereLight(0xd6dcff, 0x2b3566, 1.05)); // 무대 조명(이 장면 물체에만)
  const root = new THREE.Group(); // 무대 쪽 물체 모두: 광장 자리로
  root.position.set(AT.x, 0, AT.z);
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300); // 마을 하늘 돔(반지름 200)까지 보이게
  const light = new THREE.Color(1, 1, 1); // 캐릭터 단색 칠에 곱하는 빛(무대 조명 색이 박자마다 살짝 돈다)
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const add = (parent, geo, mat, pos, scale, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (scale) m.scale.set(...scale); if (rot) m.rotation.set(...rot); parent.add(m); return m; };
  const toon = (parent, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); parent.add(m); return m; };

  // ---------- 무대 ----------
  const stage = new THREE.Group();
  root.add(stage);
  toon(stage, GEO.box, '#c79e74', { position: [0, STAGE_Y / 2, -3.2], scale: [7.4, STAGE_Y, 3.1], shell: true, outline: 0.03 });
  toon(stage, GEO.box, '#e8c49b', { position: [0, STAGE_Y + 0.01, -3.2], scale: [7.2, 0.03, 2.9], outline: false });
  // 무대 앞 가장자리: 파스텔 방울 장식
  ['#ffb3cd', '#fff1a8', '#a8e6b4', '#c9b3ef', '#a9dcff'].forEach((c, i, arr) => {
    for (let k = i; k < 15; k += arr.length) toon(stage, GEO.sphere, null, { material: basic(c), position: [-3.5 + k * 0.5, STAGE_Y - 0.05, -1.63], scale: [0.2, 0.2, 0.12], outline: 0.015 });
  });
  // 계단
  toon(stage, GEO.box, '#b88d63', { position: [3.0, STAGE_Y * 0.25, -1.35], scale: [1, STAGE_Y * 0.5, 0.5], shell: true, outline: 0.02 });
  // 뒤 아치 · 간판
  [-3.3, 3.3].forEach((x) => toon(stage, GEO.cylinder, '#ffc6d9', { position: [x, STAGE_Y, -4.45], scale: [0.16, 3.2, 0.16], outline: 0.025 }));
  toon(stage, new THREE.TorusGeometry(3.3, 0.16, 10, 40, Math.PI), '#ffc6d9', { position: [0, STAGE_Y + 3.2, -4.45], outline: 0.025 });
  const signTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
      const g = c.getContext('2d');
      g.clearRect(0, 0, 512, 160);
      g.fillStyle = '#fffaf0'; g.strokeStyle = '#e9a7c0'; g.lineWidth = 12;
      g.beginPath(); g.roundRect(10, 10, 492, 140, 60); g.fill(); g.stroke();
      g.font = '700 74px Gaegu, "Apple SD Gothic Neo", sans-serif'; g.textBaseline = 'middle';
      const word = '파자마 파티즈', cols = ['#5bb96a', '#f07aa6', '#9fb6d6', '#a27ae0'];
      let x = 256 - g.measureText(word).width / 2;
      [...word].forEach((ch, i) => { g.fillStyle = cols[i % cols.length]; g.fillText(ch, x, 84); x += g.measureText(ch).width; });
      t.needsUpdate = true;
    };
    draw();
    if (document.fonts && document.fonts.load) document.fonts.load('700 74px Gaegu').then(draw, () => {});
    return t;
  })();
  add(stage, new THREE.PlaneGeometry(3.6, 1.12), basic('#ffffff', { map: signTex, transparent: true }), [0, STAGE_Y + 3.35, -4.38]);
  // 꼬마전구: 아치를 따라(박자마다 색이 돈다)
  const bulbs = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * (i / 18), m = add(stage, new THREE.SphereGeometry(0.075, 8, 6), basic(GLOW[i % GLOW.length]), [Math.cos(a) * 3.3, STAGE_Y + 3.2 + Math.sin(a) * 3.3, -4.25]);
    bulbs.push({ m, k: i });
  }
  // 핀 조명 셋(위에서 무대로, 살랑살랑) · 무대 바닥 빛 웅덩이
  const beams = [-2.2, 0, 2.2].map((x, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x * 1.15, 7, -1.2);
    pivot.lookAt(x, 0, -3.1);
    pivot.rotateX(-Math.PI / 2); // 원뿔(+y 위)이 무대 쪽으로 내려오게
    stage.add(pivot);
    const mat = basic(GLOW[i], { transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    add(pivot, new THREE.ConeGeometry(1.1, 7.4, 20, 1, true), mat, [0, -3.7, 0]);
    return { pivot, mat, k: i, base: pivot.rotation.z };
  });
  const pools = IDOL_X.map((x, i) => add(stage, new THREE.CircleGeometry(0.62, 24).rotateX(-Math.PI / 2), basic(GLOW[i], { transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), [x, STAGE_Y + 0.03, -3.2]));
  // 색종이(2절 피버): 무대 위에서 팔랑팔랑
  const CONF = 90, confPos = new Float32Array(CONF * 3), confSeed = [];
  for (let i = 0; i < CONF; i++) confSeed.push({ x: -4 + ((i * 37) % 80) / 10, z: -4 + ((i * 53) % 70) / 10, v: 0.6 + ((i * 17) % 50) / 60, ph: i * 0.7 });
  const confGeo = new THREE.BufferGeometry();
  confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
  const confetti = new THREE.Points(confGeo, new THREE.PointsMaterial({ size: 0.26, color: '#ffd1e6', transparent: true, opacity: 0, depthWrite: false }));
  confetti.frustumCulled = false; // 점 자리가 매 장면 바뀌어서(처음 경계는 원점 한 점) 화면 밖으로 잘못 빼지 않게
  root.add(confetti);

  // ---------- 아이돌 넷 ----------
  const faceMat = celMaterial(FACE_SHADOW, { flat: true }), blushMat = celMaterial(FACE_BLUSH, { flat: true });
  const idols = IDOLS.map((d, i) => {
    const c = buildChibi({ ears: 'round', body: '#ffffff', accessory: 'none' });
    const head = biggest(c.pivots.head); // 머리 본체(후드를 씌우기 전에 — 후드가 더 크다)
    wearPajama(c, true, d.color);
    if (head) {
      // 얼굴: 눈 · 입 · 볼은 숨기고 머리 본체를 까맣게 — 후드의 동그란 구멍으로 까만 얼굴만 보인다
      const suit = new Set(c.pajama);
      c.pivots.head.children.forEach((m) => { if (m.isMesh && m !== head && !suit.has(m)) m.visible = false; });
      head.material = faceMat;
      // 볼: 얼굴 가운데 높이 양옆에 「/」로 기운 짧은 빗금 셋. 머리 크기 묶음 안에서 돌려 붙인다(머리가 납작해도 곡면에 붙게)
      const mask = new THREE.Group();
      mask.position.copy(head.position);
      mask.rotation.copy(head.rotation);
      mask.scale.copy(head.scale);
      [-1, 1].forEach((sd) => {
        const cheek = new THREE.Group();
        cheek.rotation.set(0.18, sd * 0.48, 0, 'YXZ'); // 얼굴 높이 한가운데(후드 구멍 가운데와 같은 높이)의 양옆
        [-0.1, 0, 0.1].forEach((x) => {
          const line = new THREE.Mesh(HATCH, blushMat);
          line.position.set(x, 0, 1.015); // 까만 얼굴 면 바로 위
          line.rotation.z = -0.45;
          line.scale.set(0.032, 0.15, 0.012);
          cheek.add(line);
        });
        mask.add(cheek);
      });
      c.pivots.head.add(mask);
    }
    if (d.lead) {
      // 가운데 초록: 마이크
      const h = hand(c);
      if (h) {
        h.pivot.add(toonMesh(GEO.cylinder, '#4a4458', { position: [h.at.x, h.at.y - 0.16, h.at.z + 0.03], scale: [0.025, 0.16, 0.025], outline: 0.008, shadow: false }));
        h.pivot.add(toonMesh(GEO.sphere, '#d9dde6', { position: [h.at.x, h.at.y - 0.2, h.at.z + 0.03], scale: [0.065, 0.065, 0.065], outline: 0.01, shadow: false }));
      }
    }
    c.root.position.set(IDOL_X[i], STAGE_Y, -3.2);
    c.root.scale.setScalar(1.05);
    stage.add(c.root);
    return { c, d, home: new THREE.Vector3(IDOL_X[i], STAGE_Y, -3.2), back: new THREE.Vector3(IDOL_X[i] * 1.05, STAGE_Y, -3.75), phase: i * 0.9 };
  });

  // ---------- 나 · 친구들 · 갑옷 씨 관객 ----------
  let me = null, meGlow = null, meJump = 0;
  const pals = {};
  PALS.forEach((k, i) => {
    const c = buildNpc(k);
    hideProps(c);
    wearPajama(c, true, PAJAMA_COLORS[k], { ownEars: true }); // 후드 귀는 그 친구 귀 모양 그대로(하치와레 뾰족귀 · 우사기 긴 귀)
    if (k !== 'usagi') giveGlow(c, GLOW[i + 1]);
    root.add(c.root);
    pals[k] = { c, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, sec: 1, onStage: false };
  });
  const fans = FANS.map(([kind, x, z], i) => {
    const c = buildNpc(kind);
    hideProps(c);
    giveGlow(c, GLOW[i % GLOW.length]);
    c.root.position.set(x, 0, z);
    c.root.rotation.y = Math.atan2(-x, -3.2 - z);
    c.root.visible = false;
    root.add(c.root);
    return { c, pop: 0, phase: i * 0.37 };
  });
  let shown = 0;

  let shot = SHOTS.wide, snapNext = false, fever = false, hype = 0.3, cheerT = 0, mood = 'idle', palMode = 'look', t0 = 0;
  const camPos = new THREE.Vector3(...SHOTS.wide.pos), camLook = new THREE.Vector3(...SHOTS.wide.look);
  const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();

  function placePal(k, x, z, faceStage = true) {
    const p = pals[k];
    p.c.root.position.set(x, 0, z);
    p.c.root.rotation.y = faceStage ? Math.PI : 0;
    p.t = 1;
  }
  /** 그 자리로 걸어간다(무대에 오르면 무대 높이로 폴짝). */
  function walkPal(k, x, y, z, sec) {
    const p = pals[k];
    p.from.copy(p.c.root.position); p.to.set(x, y, z); p.t = 0; p.sec = sec;
  }

  return {
    scene,
    camera,
    light,
    /** 새 공연: 내 생김새 look(잠옷을 입힌다). 손님은 나 · 치이카와 · 하치와레뿐. */
    start(look) {
      if (me) {
        root.remove(me.root);
        me.root.traverse((m) => { if (m.isMesh && m.userData.merged) m.geometry.dispose(); }); // 합친 덩어리는 이 모형만의 도형
        if (meGlow) { meGlow.geometry.dispose(); meGlow.material.dispose(); }
      }
      me = buildChibi({ ...look, accessory: 'pajama' });
      hideProps(me);
      meGlow = giveGlow(me, GLOW[0]);
      me.root.position.set(SEATS.me[0], 0, SEATS.me[1]);
      me.root.rotation.y = Math.PI;
      root.add(me.root);
      PALS.forEach((k) => { pals[k].onStage = false; pals[k].c.root.visible = true; placePal(k, SEATS[k][0], SEATS[k][1]); });
      pals.usagi.c.root.visible = false;
      idols.forEach((I) => I.c.root.position.copy(I.home));
      fans.forEach((f) => { f.c.root.visible = false; f.pop = 0; });
      shown = 0; fever = false; hype = 0.3; mood = 'idle'; palMode = 'look'; t0 = 0;
      shot = SHOTS.wide; snapNext = true;
    },
    /** 카메라 자리: 'wide' 관객석 뒤 · 'stage' 무대 가까이 · 'crowd' 무대에서 관객석 쪽 · 'finale'. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.wide; if (snap) snapNext = true; },
    /** 아이돌 몸짓: 'idle'(꼼지락) · 'sing'(노래 · 춤) · 'bow'(인사). */
    setMood(m) { mood = m; },
    /** 친구들(관객석): 'look' 두리번 · 'glow' 응원봉 · 'cheer' 만세. */
    setPals(m) { palMode = m; },
    setFever(on) { fever = on; },
    setHype(v) { hype = Math.max(0, Math.min(1, v)); },
    /** 박자를 맞췄다: 나는 펄쩍, 관객도 들썩. */
    cheer() { meJump = 1; cheerT = 0.6; },
    /** 갑옷 씨 관객이 하나 더 온다(뿅). 지금 관객 수를 돌려준다. */
    addFan() { if (shown >= fans.length) return shown; const f = fans[shown++]; f.c.root.visible = true; f.pop = 0.001; return shown; },
    get fans() { return shown; },
    get maxFans() { return fans.length; },
    /** 우사기가 무대 옆에서 뛰어들어 무대 위로(야하!). */
    usagiJoin() {
      const u = pals.usagi;
      u.c.root.visible = true;
      placePal('usagi', SEATS.usagi[0], SEATS.usagi[1], false);
      u.onStage = true;
      walkPal('usagi', ON_STAGE.usagi[0], STAGE_Y, ON_STAGE.usagi[1], 1.1);
    },
    /** 치이카와 · 하치와레도 무대 위로(아이돌들은 한 걸음 뒤로). */
    palsJoin() {
      ['chiikawa', 'hachiware'].forEach((k, i) => { pals[k].onStage = true; walkPal(k, ON_STAGE[k][0], STAGE_Y, ON_STAGE[k][1], 1.3 + i * 0.2); });
      idols.forEach((I) => I.c.root.position.copy(I.back));
    },
    /** 말풍선 자리(마을 좌표): 'idolG' 같은 아이돌 · 친구 · 'me'. */
    anchor(who) {
      const w = (x, y, z) => ({ x: x + AT.x, y, z: z + AT.z });
      const I = idols.find((x) => x.d.id === who);
      if (I) { const p = I.c.root.position; return w(p.x, p.y + I.c.height * 1.05 + 0.45, p.z); }
      const P = pals[who];
      if (P) { const p = P.c.root.position; return w(p.x, p.y + P.c.height + 0.45, p.z); }
      return me ? w(me.root.position.x, me.height + 0.45, me.root.position.z) : w(SEATS.me[0], 1.5, SEATS.me[1]);
    },
    /** 관객석 맨 앞(내 자리, 마을 좌표): 마을의 반투명 처리(나무 · 시계탑 · 집)를 이 자리 기준으로 — 무대를 가리는 것만 비친다. */
    focus: { x: AT.x + SEATS.me[0], z: AT.z + SEATS.me[1] },
    /** 관객석 자리 전체(마을 좌표 — 아직 안 온 갑옷 씨 자리까지): 마을 나무가 카메라에서 이 자리를 가리면 공연 내내 그 나무도 반투명하게. */
    audience: [SEATS.me, SEATS.chiikawa, SEATS.hachiware, ...FANS.map(([, x, z]) => [x, z])].map(([x, z]) => ({ x: x + AT.x, z: z + AT.z })),
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 64 : 42;
      camera.updateProjectionMatrix();
    },
    /** 매 프레임: t 초, beat 곡 박 번호(노래 중이 아니면 null — 그때는 시계로 천천히). */
    update(dt, t, beat) {
      t0 += dt;
      const b = beat != null ? beat : t * 1.2;
      const on = beat != null ? Math.pow(1 - (b - Math.floor(b)), 3) : 0.3; // 박 처음에 번쩍
      const ci = ((Math.floor(b) % GLOW.length) + GLOW.length) % GLOW.length;
      light.copy(GLOW_C[ci]).lerp(WHITE, 0.72 - 0.08 * on).multiplyScalar(0.95 + 0.06 * on);
      bulbs.forEach((x) => x.m.material.color.copy(GLOW_C[(x.k + ci) % GLOW.length]));
      beams.forEach((x) => {
        x.pivot.rotation.z = x.base + Math.sin(t * 0.8 + x.k * 1.9) * 0.18;
        x.mat.color.copy(GLOW_C[(ci + x.k) % GLOW.length]);
        x.mat.opacity = (fever ? 0.2 : 0.11) + 0.08 * on;
      });
      pools.forEach((p, i) => { p.material.color.copy(GLOW_C[(ci + i) % GLOW.length]); p.material.opacity = 0.22 + 0.25 * on; p.position.x = idols[i].c.root.position.x; p.position.z = idols[i].c.root.position.z; });
      // 아이돌: 노래하면 박자 안무(가운데 초록은 마이크 손), 아니면 꼼지락 · 인사
      idols.forEach((I) => {
        if (mood === 'sing') animateChibi(I.c, I.d.lead ? 'idolSing' : 'idol', t, { beat: b });
        else if (mood === 'bow') animateChibi(I.c, 'pose', t, { phase: I.phase });
        else animateChibi(I.c, I.d.lead ? 'sway' : 'shy', t, { phase: I.phase });
      });
      // 친구들: 걸어가는 중이면 걷기, 무대 위면 같이 춤(우사기는 깡충 · 빙글 · 춤을 번갈아)
      for (const [k, P] of Object.entries(pals)) {
        if (!P.c.root.visible) continue;
        if (P.t < 1) {
          P.t = Math.min(1, P.t + dt / P.sec);
          const e = P.t * P.t * (3 - 2 * P.t);
          P.c.root.position.lerpVectors(P.from, P.to, e);
          P.c.root.position.y += Math.sin(P.t * Math.PI) * 0.5; // 무대로 폴짝
          P.c.root.rotation.y = Math.atan2(P.to.x - P.from.x, P.to.z - P.from.z);
          animateChibi(P.c, 'walk', t, { phase: t * 10 });
          if (P.t >= 1) P.c.root.rotation.y = P.onStage ? 0 : Math.PI;
          continue;
        }
        if (P.onStage) {
          if (mood !== 'sing') animateChibi(P.c, 'cheer', t, { phase: k.length });
          else if (k === 'usagi') {
            const m = Math.floor(b / 4) % 3;
            if (m === 0) animateChibi(P.c, 'hop', b * (Math.PI / 6), {});
            else if (m === 1) animateChibi(P.c, 'spin', b * (Math.PI / 5), {});
            else animateChibi(P.c, 'idol', t, { beat: b + 2 });
          } else animateChibi(P.c, 'idol', t, { beat: b });
        } else animateChibi(P.c, palMode, t, { beat: b, phase: k === 'chiikawa' ? 0 : 1.7 });
      }
      // 나: 응원봉, 박자를 맞추면 펄쩍
      if (me) {
        meJump = Math.max(0, meJump - dt * 3);
        animateChibi(me, mood === 'sing' ? 'glow' : mood === 'bow' ? 'clap' : 'idle', t, { beat: b, phase: 0.6 });
        me.root.position.y = Math.sin(meJump * Math.PI) * 0.22;
        if (meGlow) meGlow.material.color.copy(GLOW_C[(ci + 2) % GLOW.length]);
      }
      // 갑옷 씨들: 뿅 나타나서 응원봉
      cheerT = Math.max(0, cheerT - dt);
      fans.forEach((f, i) => {
        if (!f.c.root.visible) return;
        if (f.pop < 1) f.pop = Math.min(1, f.pop + dt * 2.6);
        const s = f.pop < 1 ? 0.3 + 0.7 * f.pop + Math.sin(f.pop * Math.PI) * 0.25 : 1;
        f.c.root.scale.setScalar(s * 0.92);
        animateChibi(f.c, mood === 'sing' ? 'glow' : 'clap', t, { beat: b + (i % 2) * 0.5, phase: f.phase });
        f.c.root.position.y = fever || cheerT > 0 ? Math.abs(Math.sin(b * Math.PI + f.phase)) * 0.12 * (0.5 + hype) : 0;
      });
      // 색종이(피버)
      confetti.material.opacity += ((fever ? 0.95 : 0) - confetti.material.opacity) * Math.min(1, dt * 3);
      if (confetti.material.opacity > 0.02) {
        confSeed.forEach((s, i) => {
          confPos[i * 3] = s.x + Math.sin(t0 * 2 + s.ph) * 0.3; confPos[i * 3 + 1] = 6 - ((t0 * s.v + s.ph) % 6.5); confPos[i * 3 + 2] = s.z;
        });
        confGeo.attributes.position.needsUpdate = true;
        confetti.material.color.copy(GLOW_C[(ci + 1) % GLOW.length]);
      }
      // 카메라: 정한 자리로 부드럽게 · 살짝 흔들린다(무대 기준 자리를 마을 좌표로)
      const k = Math.min(1, dt * 2.2), sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot;
      if (snapNext) { camPos.set(...sh.pos); camLook.set(...sh.look); snapNext = false; } // 바로 옮기기(세로 화면이면 세로 자리로)
      else { camPos.lerp(tmpPos.set(...sh.pos), k); camLook.lerp(tmpLook.set(...sh.look), k); }
      camera.position.copy(camPos).add(root.position);
      camera.position.x += Math.sin(t * 0.3) * 0.25;
      camera.lookAt(tmpLook.copy(camLook).add(root.position));
    }
  };
}
