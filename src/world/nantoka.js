import * as THREE from 'three';
import { toonMesh, celMaterial, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi } from '../actors/models.js';
import { buildDoll, DOLL_SCALE } from '../actors/dolls.js';

/**
 * 사이드스토리 15편 「난토카바니아」(stories/nantoka.js)의 무대: 서쪽 숲 오솔길과 숲 밖 강가(같은 장면 안, 멀리 떨어진 두 곳).
 * 원작(애니 21 ~ 23화): 하치와레가 셋을 닮은 인형 「난토카바니아」를 선물 → 인형으로 변하기 시작할 때 덤불 뒤에서 마녀가 나타난다 →
 * 마녀는 원래 몸들을 그물 보따리에 싸 들고 인형을 뒤로한 채 걸어간다 → 인형은 제대로 못 움직이고 하치와레만 조금씩 움직여
 * 페트병 뚜껑을 굴린다 → 마녀가 뚜껑을 밟고 넘어지며 다들 원래 몸으로 돌아와 보따리에서 빠져나온다 → 강가에서 얼굴을 비춰 보며 안도.
 * 게임에서 정한 부분: 나도 같이 인형이 된 것(연두 멜빵바지), 마녀의 생김새를 모형으로 옮긴 모양, 장소(숲 오솔길 · 강가), 움직임.
 * 마녀: 검은 두건 망토 덩어리에 초록 얼굴 · 큰 매부리코 · 덜덜 떨리는 하얀 동그란 눈 · 손톱 긴 초록 손 · 맨발.
 */
const LEAF = ['#5f9e4f', '#6fb05a', '#4f8a44'];
const KINDS = ['me', 'chiikawa', 'hachiware', 'usagi'];
const ROW = { me: -1.35, chiikawa: -0.45, hachiware: 0.45, usagi: 1.35 }; // 넷이 나란히 선 자리(x)
const BODY_Z = 0.45, DOLL_Z = 1.15; // 몸 · 인형이 선 줄(z): 인형은 몸 앞(카메라 쪽)
const BUSH = { x: 2.7, z: -2.5 }; // 마녀가 숨어 있던 덤불
const WITCH_STOP = { x: 0.15, z: -3.9 }; // 보따리를 메고 걸어가다 터덜터덜 걷는 곳(뚜껑 놀이 동안)
const CAP_AT = { x: 0.95, z: 0.85 }; // 길가에 떨어져 있던 페트병 뚜껑
const RIVER = { x: 40 }; // 숲 밖 강가(숲에서 안개 너머 멀리)
const BANK_Z = -0.95, WATER = [-0.45, 3.0]; // 강가: 넷이 앉는 둑, 물(z 범위)
const LEAN = 0.28; // 강가에서 물을 들여다보며 앞으로 숙인 만큼
const SHOTS = {
  gift: { pos: [0, 1.45, 4.4], look: [0, 0.55, 0.5], portrait: { pos: [0, 2.0, 7.0], look: [0, 0.6, 0.5] } },
  dolls: { pos: [0.1, 0.62, 3.0], look: [0, 0.22, 1.0], portrait: { pos: [0.1, 0.9, 4.6], look: [0, 0.25, 1.0] } }, // 인형 눈높이
  witch: { pos: [2.3, 1.3, 2.5], look: [2.9, 1.45, -3.3], portrait: { pos: [2.3, 1.6, 4.2], look: [2.9, 1.5, -3.3] } }, // 넷 뒤 덤불에서 마녀가
  bag: { pos: [-1.6, 2.1, 4.6], look: [0.2, 0.7, -0.4], portrait: { pos: [-1.9, 2.8, 7.4], look: [0.2, 0.8, -0.4] } },
  leave: { pos: [0.25, 0.5, 2.5], look: [0.1, 0.9, -3.6], portrait: { pos: [0.25, 0.75, 3.6], look: [0.1, 1.0, -3.6] } }, // 인형들 뒤에서 걸어가는 마녀를
  cap: { pos: [-0.3, 0.62, 0.3], look: [0.9, 0.12, 0.95], portrait: { pos: [-0.9, 0.95, -0.2], look: [0.9, 0.12, 0.95] } }, // 왼쪽 옆 낮게: 하치와레 인형과 그 앞 뚜껑
  // 뚜껑 놀이: 옆에서 길을 가로로 — 오른쪽에 인형 · 뚜껑, 왼쪽에 걸어가는 마녀. 놀이 막대 · 버튼(화면 가운데 아래)을 비켜 화면 위쪽에
  roll: { pos: [5.0, 4.8, -1.8], look: [0.2, -0.15, -1.8], portrait: { pos: [8.6, 7.6, -1.8], look: [0.2, -0.3, -1.8] } },
  // 넘어진 뒤로는 마녀가 있는 곳을 따라간다(follow: 터덜터덜 걸은 만큼 자리가 다르다): 옆 위에서 하늘을 보고 버둥대는 마녀 · 떨어진 보따리
  fall: { follow: true, pos: [0.9, 3.2, -2.9], look: [0, 0.2, 0.15], portrait: { pos: [1.1, 4.5, -4.4], look: [0, 0.3, 0.15] } },
  free: { follow: true, pos: [-0.6, 3.2, 5.8], look: [-1.0, 0.4, 2.0], portrait: { pos: [-0.6, 4.4, 8.6], look: [-1.0, 0.5, 2.0] } }, // 앞쪽 위에서: 마녀 앞으로 빠져나온 넷(마녀는 뒤에)
  river: { pos: [RIVER.x, 1.45, 4.3], look: [RIVER.x, 0.12, -0.55], portrait: { pos: [RIVER.x, 1.9, 6.6], look: [RIVER.x, 0.15, -0.55] } }
};
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const hideProps = (c) => Object.values(c.props || {}).flat().forEach((m) => { m.visible = false; });

/**
 * 마녀의 얼굴 그림(원작 그대로 그린 2D, 두건 앞면에 붙인다): 위쪽 검은 두건에 덜덜 떨리는 하얀 동그란 눈, 아래에 둥근 네모 초록 가면 —
 * 주름 가득, 이마에서 턱 끝까지 늘어진 매부리코. kind 'grin' 꾹 다문 입(들여다볼 때) · 'scream' 질끈 감은 눈과 크게 벌린 입(넘어졌을 때).
 */
function witchFaceTexture(kind) {
  const W = 512, H = 400, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), INK = '#3e2a22', GREEN = '#8fae58', NOSE = '#9cbb64';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (w, c = INK) => { g.lineWidth = w; g.strokeStyle = c; g.stroke(); };
  const rrect = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // 눈(두건 위)
  [-1, 1].forEach((sd) => {
    const cx = W / 2 + sd * 64, cy = 72;
    if (kind === 'scream') { // 질끈 감은 눈: 비스듬한 선 · 그 위로 떨리는 하얀 선
      g.beginPath(); g.moveTo(cx - sd * 30, cy - 6); g.lineTo(cx + sd * 26, cy + 10); stroke(10, '#f4f1e8');
      g.beginPath(); g.moveTo(cx - sd * 30, cy - 6); g.lineTo(cx + sd * 26, cy + 10); stroke(5);
      [-14, 6].forEach((dx) => { g.beginPath(); g.moveTo(cx + dx, cy - 34); g.lineTo(cx + dx + 4, cy - 20); stroke(5, '#f4f1e8'); });
      return;
    }
    g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); stroke(6);
    g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fillStyle = '#1e1a1a'; g.fill();
    [44, 56].forEach((r) => { g.beginPath(); g.arc(cx, cy, r, sd > 0 ? -0.55 : Math.PI - 0.55, sd > 0 ? 0.55 : Math.PI + 0.55); stroke(5, '#f4f1e8'); }); // 덜덜 떨리는 선
  });
  // 초록 가면
  rrect(96, 140, 320, 248, 96);
  g.fillStyle = GREEN; g.fill(); stroke(8);
  g.save(); rrect(96, 140, 320, 248, 96); g.clip();
  // 주름: 볼 양옆 괄호 주름 · 눈 밑 · 턱
  [-1, 1].forEach((sd) => {
    const x0 = W / 2 + sd * 128;
    [0, 1, 2].forEach((k) => { g.beginPath(); g.arc(x0 + sd * (28 + k * 14), 268, 64 - k * 8, sd > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, sd > 0 ? Math.PI * 1.38 : Math.PI * 0.38); stroke(4); });
    g.beginPath(); g.moveTo(W / 2 + sd * 40, 176); g.quadraticCurveTo(W / 2 + sd * 92, 168, W / 2 + sd * 120, 196); stroke(4); // 눈 밑
    g.beginPath(); g.moveTo(W / 2 + sd * 30, 196); g.quadraticCurveTo(W / 2 + sd * 74, 200, W / 2 + sd * 96, 222); stroke(3.5);
  });
  g.beginPath(); g.moveTo(W / 2 - 40, 372); g.quadraticCurveTo(W / 2, 384, W / 2 + 40, 372); stroke(3.5); // 턱
  // 입
  if (kind === 'scream') {
    rrect(W / 2 - 92, 262, 184, 92, 40); g.fillStyle = '#e8737c'; g.fill(); stroke(6);
    [-56, -20, 20, 56].forEach((x) => { g.fillStyle = '#fffaf0'; g.fillRect(W / 2 + x - 9, 262, 18, 16); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(W / 2 + x - 9, 262, 18, 16); });
  } else {
    g.beginPath(); g.moveTo(W / 2 - 84, 304); g.quadraticCurveTo(W / 2, 316, W / 2 + 84, 304); stroke(5);
    [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(W / 2 + sd * 84, 292); g.lineTo(W / 2 + sd * 92, 318); stroke(4); });
  }
  // 매부리코: 미간에서 턱 가까이까지 길게 늘어진 V
  g.beginPath(); g.moveTo(W / 2 - 22, 150); g.quadraticCurveTo(W / 2 - 30, 260, W / 2, kind === 'scream' ? 300 : 352); g.quadraticCurveTo(W / 2 + 30, 260, W / 2 + 22, 150); g.closePath();
  g.fillStyle = NOSE; g.fill(); stroke(5);
  [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(W / 2 + sd * 10, 178); g.quadraticCurveTo(W / 2 + sd * 18, 214, W / 2 + sd * 8, 248); stroke(3); }); // 콧등 주름
  g.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 마녀: 위가 둥글게 솟은 종 모양 검은 두건 망토(한 덩어리) · 앞면에 얼굴 그림(눈 · 초록 가면) · 검은 소매 끝에 손가락이 길고 손톱이 뾰족한 초록 손 ·
 * 망토 밑으로 초록 맨다리와 발가락이 긴 큰 발. 넘어지면 얼굴이 소리 지르는 그림으로 바뀌고(setFace) 다리를 하늘로 든다.
 * → { root, body, hands, legs, setFace(kind), sackAt }
 */
function buildWitch() {
  const root = new THREE.Group(), body = new THREE.Group();
  root.rotation.order = 'YXZ'; // 넘어질 때 제 몸 기준으로 뒤로(rotation.x)
  root.scale.setScalar(0.85);
  root.add(body);
  const BLACK = '#3b3e45', GREEN = '#8fae58', CLAW = '#d9e3b0';
  const cloak = celMaterial(BLACK, { flat: true });
  const add = (parent, geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); parent.add(m); return m; };
  // 종 모양 두건 망토: 아래가 넓고 위로 둥글게 솟는다
  const PROFILE = [[0, 0.02], [0.92, 0], [1.08, 0.18], [1.12, 0.5], [1.08, 0.9], [1.0, 1.25], [0.88, 1.55], [0.72, 1.82], [0.5, 2.05], [0.26, 2.2], [0.08, 2.27], [0, 2.28]];
  const bell = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 36);
  add(body, bell, BLACK, { material: cloak, outline: 0.045 });
  // 얼굴 그림: 두건 앞면 곡선을 그대로 따라 휜 띠(같은 모양을 살짝 크게, 앞쪽만 — 높이를 고르게 나눠 그림이 늘어나지 않게)
  const radiusAt = (y) => { for (let i = 1; i < PROFILE.length; i++) { const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i]; if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1); } return 0; };
  const band = Array.from({ length: 14 }, (_, i) => { const y = 0.84 + (i / 13) * 1.1; return new THREE.Vector2(radiusAt(y) + 0.02, y); });
  const textures = { grin: witchFaceTexture('grin'), scream: witchFaceTexture('scream') };
  const faceMat = new THREE.MeshBasicMaterial({ map: textures.grin, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  body.add(new THREE.Mesh(new THREE.LatheGeometry(band, 28, -1.0, 2.0), faceMat));
  // 손: 검은 소매 끝에 초록 손, 손가락 넷이 길게 앞으로 뻗어 아래로 굽고 끝에 뾰족한 손톱
  const hands = [-1, 1].map((sd) => {
    const h = new THREE.Group();
    body.add(h);
    add(h, GEO.cylinder, BLACK, { material: cloak, position: [0, 0, -0.06], rotation: [-Math.PI / 2, 0, 0], scale: [0.13, 0.5, 0.13], outline: 0.025 }); // 소매(손목에서 뒤로)
    add(h, GEO.sphere, GREEN, { position: [0, 0, 0.06], scale: [0.17, 0.1, 0.16], outline: 0.016 });
    [-0.11, -0.04, 0.04, 0.11].forEach((x, i) => {
      const f = new THREE.Group();
      f.position.set(x, 0.0, 0.18);
      f.rotation.x = 0.55 + (i % 2) * 0.12; // 아래로 굽은 손가락
      h.add(f);
      add(f, GEO.sphere, GREEN, { position: [0, 0, 0.11], scale: [0.034, 0.034, 0.13], outline: 0.008 });
      add(f, GEO.cone, CLAW, { position: [0, 0, 0.22], rotation: [Math.PI / 2, 0, 0], scale: [0.026, 0.14, 0.026], outline: 0.006 });
    });
    return h;
  });
  // 다리: 망토 밑(엉덩이)에서 아래로, 초록 정강이 끝에 발가락이 긴 큰 발. 서 있을 때는 발만 망토 밑으로 보인다
  const legs = [-1, 1].map((sd) => {
    const l = new THREE.Group();
    l.position.set(sd * 0.36, 0.42, 0.22);
    root.add(l);
    add(l, GEO.cylinder, GREEN, { position: [0, -0.4, 0], scale: [0.075, 0.42, 0.075], outline: 0.012 }); // 정강이
    const foot = new THREE.Group();
    foot.position.set(0, -0.36, 0.06);
    l.add(foot);
    add(foot, GEO.sphere, GREEN, { position: [0, 0, 0.1], scale: [0.14, 0.07, 0.24], outline: 0.012 });
    [-0.085, -0.03, 0.03, 0.085].forEach((x, i) => add(foot, GEO.sphere, GREEN, { position: [x, 0.01, 0.33 - Math.abs(i - 1.5) * 0.03], scale: [0.03, 0.03, 0.06], outline: 0.006 }));
    return l;
  });
  return {
    root, body, hands, legs,
    /** 얼굴 그림: 'grin' 꾹 다문 입 · 'scream' 소리 지르는 입. */
    setFace(kind) { faceMat.map = textures[kind] || textures.grin; faceMat.needsUpdate = true; },
    sackAt: new THREE.Vector3(0, 1.55, -1.3)
  };
}

/** 그물 보따리: 반투명 그물 망태 속에 축 늘어진 넷의 몸(작게). → { group, net, inside: [chibi — me · chiikawa · hachiware · usagi 차례] } */
function buildSack(look) {
  const group = new THREE.Group();
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.strokeStyle = '#7d8290';
  g.lineWidth = 5;
  for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2.5);
  const net = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.scale.set(0.62, 0.55, 0.58);
  net.renderOrder = 2;
  group.add(net);
  const fill = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({ color: '#eef0f4', transparent: true, opacity: 0.22, depthWrite: false }));
  fill.scale.set(0.6, 0.53, 0.56);
  group.add(fill);
  group.add(toonMesh(GEO.cone, '#8b8f9a', { position: [0, 0.45, 0], scale: [0.14, 0.22, 0.14], outline: 0.012, shadow: false })); // 묶은 목
  group.add(toonMesh(GEO.sphere, '#6f7380', { position: [0, 0.7, 0], scale: [0.08, 0.06, 0.08], outline: 0.01, shadow: false }));
  const inside = [buildChibi(look), buildNpc('chiikawa'), buildNpc('hachiware'), buildNpc('usagi')].map((c, i) => {
    hideProps(c);
    c.root.scale.setScalar(0.42);
    c.root.position.set([-0.18, 0.18, -0.12, 0.14][i], [-0.25, -0.22, 0.02, 0.0][i], [0.08, 0.1, -0.12, -0.08][i]);
    c.root.rotation.set(1.2 + i * 0.3, i * 1.4, 0.4 - i * 0.25);
    animateChibi(c, 'faint', 0, {});
    group.add(c.root);
    return c;
  });
  return { group, net, inside };
}

/** 페트병 뚜껑: 하얀 뚜껑, 옆에 오돌토돌 세로 줄. 굴릴 때는 옆으로 세워 데굴데굴(spin 이 바퀴처럼 돈다). */
function buildCap() {
  const group = new THREE.Group(), spin = new THREE.Group();
  group.rotation.order = 'YXZ';
  group.add(spin);
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 16;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 16);
  g.fillStyle = '#c9ccd4';
  for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 2, 16);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  const top = celMaterial('#ffffff', { flat: true });
  spin.add(toonMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.075, 28), '#ffffff', { material: [new THREE.MeshBasicMaterial({ map: tex }), top, top], outline: 0.008, shadow: false }));
  return { group, spin };
}

export function createNantokaStage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6ecd6');
  scene.fog = new THREE.Fog('#d6ecd6', 12, 27);
  scene.add(new THREE.HemisphereLight(0xfffbe8, 0x6f8a58, 1.5));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  const light = new THREE.Color(1, 0.98, 0.92);
  const toon = (geo, c, o) => { const m = toonMesh(geo, c, { shadow: false, ...o }); scene.add(m); return m; };

  // ---------- 서쪽 숲 오솔길: 풀밭 · 흙길(안쪽으로 이어진다) · 둘레의 나무 · 덤불 ----------
  toon(GEO.cylinder, '#8cc56f', { position: [0, -0.1, -2], scale: [15, 0.1, 15], outline: false });
  toon(GEO.box, '#cdb68a', { position: [0.1, 0.012, -4], scale: [1.7, 0.02, 20], outline: false }); // 흙길
  const trees = [[-3.4, -1.8], [-4.6, -4.6], [-2.8, -7.2], [6.3, -0.6], [4.4, -4.4], [2.9, -7.6], [-5.6, 1.4], [5.4, 1.8], [-1.6, -10.4], [1.9, -11.0], [-4.2, -10.0], [4.8, -9.4]];
  trees.forEach(([x, z], i) => {
    const h = 2.4 + (i % 3) * 0.5;
    toon(GEO.cylinder, '#8a6244', { position: [x, 0, z], scale: [0.22, h, 0.22], outline: 0.02 });
    toon(GEO.sphere, LEAF[i % 3], { position: [x, h + 0.5, z], scale: [1.3, 1.1, 1.3], outline: 0.03 });
    toon(GEO.sphere, LEAF[(i + 1) % 3], { position: [x + 0.5, h + 0.05, z + 0.3], scale: [0.85, 0.7, 0.85], outline: 0.025 });
  });
  // 마녀가 숨어 있던 덤불(넷 뒤 오른쪽) · 길가 덤불
  [[BUSH.x - 0.6, BUSH.z + 0.2, 0.7], [BUSH.x, BUSH.z, 0.85], [BUSH.x + 0.7, BUSH.z - 0.1, 0.7], [-2.2, -2.2, 0.6], [-1.7, -5.2, 0.55], [2.0, -6.0, 0.6]].forEach(([x, z, r], i) =>
    toon(GEO.sphere, LEAF[i % 3], { position: [x, r * 0.62, z], scale: [r, r * 0.85, r * 0.8], outline: 0.025 }));
  for (let i = 0; i < 40; i++) { // 풀 포기
    const a = i * 2.17, r = 1.6 + (i % 6) * 0.9;
    const x = Math.sin(a) * r, z = Math.cos(a) * r - 2;
    if (Math.abs(x - 0.1) < 0.9) continue; // 흙길은 비운다
    toon(GEO.cone, '#6fae55', { position: [x, 0, z], scale: [0.05, 0.18, 0.05], outline: false });
  }

  // ---------- 숲 밖 강가(같은 장면 오른쪽 멀리): 둑 · 강바닥 · 물(반투명, 그 밑에 물에 비친 모습) · 갈대 ----------
  toon(GEO.box, '#8cc56f', { position: [RIVER.x, -1, WATER[0] - 3.2], scale: [18, 2, 6.4], outline: false }); // 넷이 앉는 둑(윗면 0, 물가까지)
  toon(GEO.box, '#8cc56f', { position: [RIVER.x, -1, WATER[1] + 3], scale: [18, 2, 6], outline: false }); // 카메라 쪽 둑
  toon(GEO.box, '#4f7f95', { position: [RIVER.x, -1.9, (WATER[0] + WATER[1]) / 2], scale: [18, 0.2, WATER[1] - WATER[0]], outline: false }); // 강바닥(물에 비친 모습이 들어갈 깊이)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(18, WATER[1] - WATER[0]), new THREE.MeshBasicMaterial({ color: '#8cc8e6', transparent: true, opacity: 0.62, depthWrite: false }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(RIVER.x, 0.01, (WATER[0] + WATER[1]) / 2);
  water.renderOrder = 3;
  scene.add(water);
  const ripples = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(RIVER.x - 2.5 + i * 1.0, 0.02, 0.3 + (i % 3) * 0.7);
    m.renderOrder = 4;
    m.userData.ph = i * 0.37;
    scene.add(m);
    return m;
  });
  [[-5, -1.4], [-4.4, -1.7], [4.6, -1.5], [5.3, -1.2], [-6.2, 3.6], [6.0, 3.4]].forEach(([dx, z], i) => { // 갈대
    for (let k = 0; k < 3; k++) toon(GEO.cone, '#7fa95a', { position: [RIVER.x + dx + k * 0.12, 0, z + (k % 2) * 0.1], rotation: [0, 0, (k - 1) * 0.12], scale: [0.04, 0.7 + ((i + k) % 3) * 0.15, 0.04], outline: 0.008 });
  });
  [[-2.2, -1.6], [2.4, -1.8], [-3.4, -1.25]].forEach(([dx, z]) => toon(GEO.sphere, '#b8b2a6', { position: [RIVER.x + dx, 0.08, z], scale: [0.26, 0.14, 0.2], outline: 0.015 }));
  [[-4.6, -4.2], [-2.2, -5.0], [0.4, -4.6], [2.9, -5.2], [5.0, -4.0], [-6.4, -5.6], [6.6, -5.8]].forEach(([dx, z], i) => { // 둑 뒤 숲(지나온 숲)
    const h = 2.0 + (i % 3) * 0.4;
    toon(GEO.cylinder, '#8a6244', { position: [RIVER.x + dx, 0, z], scale: [0.2, h, 0.2], outline: 0.02 });
    toon(GEO.sphere, LEAF[i % 3], { position: [RIVER.x + dx, h + 0.45, z], scale: [1.2, 1.0, 1.2], outline: 0.03 });
  });
  [[-3.2, -2.6], [-0.9, -2.9], [1.6, -2.7], [3.8, -2.5]].forEach(([dx, z], i) => toon(GEO.sphere, LEAF[(i + 1) % 3], { position: [RIVER.x + dx, 0.36, z], scale: [0.6, 0.45, 0.5], outline: 0.02 }));

  // ---------- 넷(몸) · 넷의 인형 · 물에 비친 넷 · 마녀 · 그물 보따리 · 페트병 뚜껑 ----------
  let me = null, meDoll = null, meMirror = null, sack = null;
  const bodies = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi') };
  const dolls = { chiikawa: buildDoll('chiikawa'), hachiware: buildDoll('hachiware'), usagi: buildDoll('usagi') };
  const mirrors = { chiikawa: buildNpc('chiikawa'), hachiware: buildNpc('hachiware'), usagi: buildNpc('usagi') };
  [...Object.values(bodies), ...Object.values(mirrors)].forEach((c) => { hideProps(c); scene.add(c.root); });
  Object.values(dolls).forEach((c) => scene.add(c.root));
  const bodyOf = (k) => (k === 'me' ? me : bodies[k]);
  const dollOf = (k) => (k === 'me' ? meDoll : dolls[k]);
  const mirrorOf = (k) => (k === 'me' ? meMirror : mirrors[k]);
  // 인형이 빛날 때 둘레의 반짝임(인형마다 하나, 처음엔 안 보인다)
  const glows = Object.fromEntries(KINDS.map((k) => {
    const m = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0, depthWrite: false }));
    m.scale.setScalar(0.24);
    m.renderOrder = 5;
    scene.add(m);
    return [k, m];
  }));
  const witch = buildWitch();
  scene.add(witch.root);
  const cap = buildCap();
  scene.add(cap.group);

  let shot = SHOTS.gift, snapNext = true, flashT = 0, glowOn = false, shakeT = 0, mirrorsOn = false;
  let witchMode = 'hidden'; // hidden · peek · idle · walk · trudge · fall · down · flail
  let walkPh = 0, trudgeT = 0;
  const anims = {}, dollAnims = {};
  let tweens = [];
  const tween = (dur, step, end) => { tweens.push({ t: 0, dur, step, end }); };
  const later = (sec, fn) => tween(sec, () => {}, fn); // 장면 시계로 잠시 뒤에(타이틀로 나가면 같이 사라진다)
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const faceTo = (obj, x, z) => { obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z); };

  function placeBody(k, x, z, anim, look) {
    const c = bodyOf(k);
    if (!c) return;
    c.root.visible = true;
    c.root.position.set(x, 0, z);
    c.root.rotation.set(0, 0, 0);
    c.root.scale.setScalar(1);
    if (look) faceTo(c.root, look[0], look[1]);
    anims[k] = anim;
  }
  function placeDoll(k, x, z, anim, look) {
    const c = dollOf(k);
    if (!c) return;
    c.root.visible = true;
    c.root.position.set(x, 0, z);
    c.root.rotation.set(0, 0, 0);
    c.root.scale.setScalar(DOLL_SCALE);
    if (look) faceTo(c.root, look[0], look[1]);
    dollAnims[k] = anim;
  }
  /** 마녀를 (x, z)에 세운다(face: 바라보는 곳). */
  function placeWitch(x, z, face, mode = 'idle') {
    witch.root.visible = true;
    witch.root.position.set(x, 0, z);
    witch.root.rotation.set(0, 0, 0);
    if (face) faceTo(witch.root, face[0], face[1]);
    witchMode = mode;
  }
  /** 마녀가 (x, z)까지 걸어간다(쿵쿵). */
  function witchWalk(x, z, dur, then) {
    const from = witch.root.position.clone();
    witchMode = 'walk';
    faceTo(witch.root, x, z);
    tween(dur, (u) => { witch.root.position.set(from.x + (x - from.x) * u, 0, from.z + (z - from.z) * u); }, () => { witchMode = 'idle'; if (then) then(); });
  }

  const api = {
    scene,
    camera,
    light,
    /** 새로 들어왔다: 내 생김새 look 으로 나 · 내 인형 · 물에 비친 나 · 보따리 속 나를 만든다. */
    start(look) {
      for (const c of [me, meDoll, meMirror]) if (c) scene.remove(c.root);
      if (sack && sack.group.parent) sack.group.parent.remove(sack.group);
      me = buildChibi(look); hideProps(me); scene.add(me.root);
      meDoll = buildDoll('me', look); scene.add(meDoll.root);
      meMirror = buildChibi(look); hideProps(meMirror); scene.add(meMirror.root);
      sack = buildSack(look);
      sack.group.visible = false;
      scene.add(sack.group);
      tweens = []; flashT = 0; glowOn = false; shakeT = 0; trudgeT = 0; mirrorsOn = false;
      witch.root.visible = false; witchMode = 'hidden'; witch.setFace('grin');
      witch.root.rotation.set(0, 0, 0);
      cap.group.visible = true;
      cap.group.position.set(CAP_AT.x, 0.04, CAP_AT.z);
      cap.group.rotation.set(0, 0.6, 0);
      cap.spin.rotation.set(0, 0, 0);
      api.setMood('gift');
      shot = SHOTS.gift; snapNext = true;
    },
    /** 카메라: gift · dolls · witch · bag · leave · cap · roll · fall · free · river. snap 이면 바로. */
    shot(name, snap = false) { shot = SHOTS[name] || SHOTS.gift; if (snap) snapNext = true; },
    /**
     * 장면마다 서는 자리. gift: 넷이 나란히(인형은 아직 없다) · play: 인형을 앞에 세워 두고 들여다본다 ·
     * river: 숲 밖 강가 둑에 나란히 앉아 물을 들여다본다(물에 비친 넷).
     */
    setMood(m) {
      KINDS.forEach((k) => { const r = mirrorOf(k); if (r) r.root.visible = false; });
      mirrorsOn = false;
      if (m === 'gift' || m === 'play') {
        KINDS.forEach((k) => {
          placeBody(k, ROW[k], BODY_Z, m === 'play' ? 'look' : k === 'hachiware' ? 'talk' : 'idle', m === 'play' ? [ROW[k], DOLL_Z] : [ROW[k], 5]);
          if (m === 'gift') dollOf(k).root.visible = false;
          else placeDoll(k, ROW[k], DOLL_Z, 'idle', [ROW[k], 5]);
        });
      } else if (m === 'river') {
        KINDS.forEach((k, i) => {
          const x = RIVER.x - 1.5 + i * 1.0;
          placeBody(k, x, BANK_Z, 'sit', [x, 5]);
          bodyOf(k).root.rotation.x = LEAN; // 물 쪽으로 몸을 숙여 들여다본다
          const r = mirrorOf(k);
          r.root.visible = true;
          r.root.position.set(x, 0, WATER[0] + 0.12);
          r.root.rotation.set(-LEAN, 0, Math.PI); // 물에 비친 모습: 거꾸로(앞으로 숙인 만큼 반대로)
          dollOf(k).root.visible = false;
        });
        mirrorsOn = true;
        witch.root.visible = false;
        if (sack) sack.group.visible = false;
        cap.group.visible = false;
      }
    },
    /** 하치와레가 인형을 하나씩 꺼낸다: 그 친구 앞에 인형이 톡 하고 선다. */
    popDoll(k) {
      const d = dollOf(k);
      placeDoll(k, ROW[k], DOLL_Z, 'hop', [ROW[k], 5]);
      d.root.scale.setScalar(0.01);
      tween(0.45, (u) => { d.root.scale.setScalar(DOLL_SCALE * (0.2 + 0.8 * ease(u)) + Math.sin(u * Math.PI) * 0.05); }, () => { d.root.scale.setScalar(DOLL_SCALE); dollAnims[k] = 'idle'; });
    },
    /** 인형이 빛난다(on) · 그친다. */
    glow(on) { glowOn = !!on; },
    /** 마녀가 덤불 뒤에서 쑥 올라와 들여다본다(손톱이 덤불 위에). */
    witchPeek() {
      placeWitch(BUSH.x, BUSH.z - 1.1, [0, 1], 'peek');
      witch.setFace('grin');
      witch.root.position.y = -1.4;
      tween(1.4, (u) => { witch.root.position.y = -1.4 + ease(u) * 1.82; }, null); // 얼굴이 덤불 위로 쑥, 손톱은 덤불 꼭대기에
    },
    /** 영혼이 인형으로: 번쩍! 몸은 벌러덩 쓰러지고 인형이 깨어나 덤불 쪽을 본다. */
    swapSouls() {
      flashT = 1;
      glowOn = false;
      KINDS.forEach((k) => {
        anims[k] = 'faint';
        dollAnims[k] = 'look';
        faceTo(dollOf(k).root, BUSH.x, BUSH.z);
      });
    },
    /** 마녀가 덤불을 돌아 나와 쓰러진 몸들을 그물 보따리에 쓸어 담아 메고는, 인형들을 등지고 숲 안쪽으로 걸어간다. */
    witchBag() {
      witch.root.position.y = 0;
      // 덤불을 옆으로 돌아 나와서(덤불을 뚫고 지나가지 않게) 쓰러진 몸들 뒤로
      witchWalk(BUSH.x + 1.3, BUSH.z - 0.7, 1.0, () => witchWalk(BUSH.x + 1.0, BUSH.z + 1.5, 1.4, () => witchWalk(0.15, -1.6, 1.8, () => { // 몸집이 커서 한 걸음 뒤에 서서
        faceTo(witch.root, 0, BODY_Z);
        scene.add(sack.group);
        sack.group.visible = true;
        sack.group.position.set(0.15, 0.55, 0.0);
        sack.group.rotation.set(0, 0, 0);
        sack.inside.forEach((c) => { c.root.visible = false; });
        KINDS.forEach((k, i) => later(i * 0.35, () => {
          const b = bodyOf(k), from = b.root.position.clone();
          tween(0.6, (u) => {
            b.root.position.set(from.x + (0.15 - from.x) * u, Math.sin(u * Math.PI) * 0.8, from.z + (0.0 - from.z) * u);
            b.root.scale.setScalar(1 - u * 0.6);
          }, () => { b.root.visible = false; sack.inside[i].root.visible = true; });
        }));
        later(4 * 0.35 + 1.0, () => {
          witch.root.add(sack.group); // 등에 멘다
          sack.group.position.copy(witch.sackAt);
          sack.group.rotation.set(0.3, 0, 0);
          witchWalk(WITCH_STOP.x, WITCH_STOP.z, 3.0, () => { witchMode = 'trudge'; faceTo(witch.root, WITCH_STOP.x, -20); });
        });
      })));
    },
    /** 인형들: 몸을 움직여 보려 하지만 꿈쩍 못 한다(하치와레만 조금 꼼지락). */
    struggle() { KINDS.forEach((k) => { dollAnims[k] = k === 'hachiware' ? 'sway' : 'flail'; faceTo(dollOf(k).root, WITCH_STOP.x, WITCH_STOP.z); }); },
    /** 하치와레 인형이 아장아장 뚜껑 앞까지(느리게 흔들흔들), 뚜껑을 옆으로 세운다. */
    hachiToCap() {
      const d = dolls.hachiware, from = d.root.position.clone(), to = new THREE.Vector3(CAP_AT.x - 0.1, 0, CAP_AT.z + 0.24);
      dollAnims.hachiware = 'walk';
      faceTo(d.root, to.x, to.z);
      tween(2.4, (u) => { d.root.position.lerpVectors(from, to, u); d.root.rotation.z = Math.sin(u * Math.PI * 8) * 0.12; }, () => {
        d.root.rotation.z = 0;
        dollAnims.hachiware = 'pull';
        faceTo(d.root, WITCH_STOP.x, WITCH_STOP.z);
        cap.group.rotation.set(0, Math.atan2(WITCH_STOP.x - CAP_AT.x, WITCH_STOP.z - CAP_AT.z), Math.PI / 2); // 옆으로 세워 굴릴 준비
        cap.group.position.y = 0.11;
      });
    },
    /** 뚜껑을 굴린다: hit 면 마녀 뒤꿈치 밑으로 → 밟고 꽈당, 아니면 옆 풀숲으로 빗나갔다가 하치와레가 다시 굴려 온다. then: 다 끝나면. */
    roll(hit, then) {
      const from = new THREE.Vector3(CAP_AT.x, 0.11, CAP_AT.z), wp = witch.root.position;
      const to = hit ? new THREE.Vector3(wp.x + 0.25, 0.11, wp.z + 0.32) : new THREE.Vector3(wp.x + 1.6, 0.11, wp.z + 1.5);
      dollAnims.hachiware = 'hop';
      cap.group.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      tween(0.8, (u) => { cap.group.position.lerpVectors(from, to, u); cap.spin.rotation.y = u * 12; }, () => {
        dollAnims.hachiware = 'pull';
        if (hit) { api.fall(); if (then) then(); return; }
        later(0.5, () => tween(0.7, (u) => { cap.group.position.lerpVectors(to, from, u); cap.spin.rotation.y = 12 - u * 9; }, () => {
          cap.group.rotation.y = Math.atan2(WITCH_STOP.x - CAP_AT.x, WITCH_STOP.z - CAP_AT.z);
          if (then) then();
        }));
      });
    },
    /** 마녀가 뚜껑을 밟고 뒤로 꽈당: 보따리가 등 뒤로 떨어진다. */
    fall() {
      witchMode = 'fall';
      witch.setFace('scream'); // 소리 지르는 얼굴
      shakeT = 0.7;
      const from = witch.root.position.clone();
      tween(0.6, (u) => {
        const e = ease(u);
        witch.root.rotation.x = -e * 1.3; // 뒤로 벌러덩(얼굴은 하늘로)
        witch.root.position.set(from.x, Math.sin(u * Math.PI) * 0.35 + e * 0.35, from.z + e * 0.6);
      }, () => { witchMode = 'down'; });
      if (sack) { // 보따리: 등에서 떨어져 옆 뒤쪽 땅에 털썩
        const world = new THREE.Vector3();
        sack.group.getWorldPosition(world);
        scene.add(sack.group);
        sack.group.position.copy(world);
        sack.group.rotation.set(0, 0, 0);
        const land = new THREE.Vector3(from.x - 1.6, 0.52, from.z + 0.7);
        tween(0.7, (u) => { sack.group.position.set(world.x + (land.x - world.x) * u, world.y + (land.y - world.y) * u + Math.sin(u * Math.PI) * 0.5, world.z + (land.z - world.z) * u); sack.group.rotation.z = u * 0.6; }, null);
      }
      cap.group.position.set(from.x + 0.25, 0.04, from.z + 0.32);
      cap.group.rotation.set(0, 0, 0); // 밟혀서 납작하게 엎어진 뚜껑
    },
    /** 주문이 풀렸다: 번쩍! 인형은 축 늘어지고, 넷은 원래 몸으로 그물 보따리를 헤치고 나온다. */
    breakFree() {
      flashT = 1;
      const sp = sack ? sack.group.position.clone() : new THREE.Vector3(0, 0, -2.6);
      if (sack) {
        sack.inside.forEach((c) => { c.root.visible = false; });
        tween(0.5, (u) => { sack.group.scale.setScalar(1 + u * 0.4); sack.net.material.opacity = 1 - u; }, () => { sack.group.visible = false; sack.group.scale.setScalar(1); sack.net.material.opacity = 1; });
      }
      KINDS.forEach((k, i) => {
        dollAnims[k] = 'faint';
        const to = [sp.x - 1.0 + i * 0.7, sp.z + 1.8 + (i % 2) * 0.25];
        placeBody(k, sp.x, sp.z, 'flail', [to[0], 5]);
        bodyOf(k).root.scale.setScalar(0.5);
        tween(0.5, (u) => { const b = bodyOf(k).root; b.position.set(sp.x + (to[0] - sp.x) * u, Math.sin(u * Math.PI) * 0.6, sp.z + (to[1] - sp.z) * u); b.scale.setScalar(0.5 + 0.5 * u); },
          () => { anims[k] = k === 'usagi' ? 'hop' : k === 'chiikawa' ? 'cower' : 'look'; });
      });
    },
    /** 넷이 정신없이 도망친다(카메라 쪽 숲 밖으로). 마녀는 땅바닥에서 버둥버둥. */
    runAway() {
      KINDS.forEach((k, i) => {
        const b = bodyOf(k).root, from = b.position.clone(), to = new THREE.Vector3(-1.4 + i * 0.6, 0, 6.5);
        anims[k] = 'run';
        faceTo(b, to.x, to.z);
        tween(1.6 + i * 0.1, (u) => { b.position.lerpVectors(from, to, u); }, () => { b.visible = false; });
      });
      witchMode = 'flail';
    },
    /** 마녀가 지금 하는 것(디버그 · 테스트용). */
    get witchMode() { return witchMode; },
    /** 움직임이 아직 끝나지 않았는지. */
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
      // 번쩍(주문): 빛을 확 밝혔다가 돌아온다
      flashT = Math.max(0, flashT - dt * 1.6);
      light.setRGB(1 + flashT * 1.6, 0.98 + flashT * 1.6, 0.92 + flashT * 1.5);
      // 인형 둘레 반짝임
      KINDS.forEach((k, i) => {
        const g = glows[k], d = dollOf(k);
        if (!d || !d.root.visible) { g.material.opacity = 0; return; }
        g.position.set(d.root.position.x, 0.16, d.root.position.z);
        g.material.opacity = glowOn ? 0.35 + Math.sin(t * 9 + i) * 0.2 : Math.max(0, g.material.opacity - dt * 2);
        g.scale.setScalar(0.22 + (glowOn ? Math.sin(t * 6 + i) * 0.04 : 0));
      });
      // 마녀: 들여다보기(덤불에 손톱) · 쿵쿵 걷기 · 터덜터덜(제자리에서 조금씩) · 꽈당(다리를 하늘로) · 버둥버둥
      const W = witch, wb = W.body;
      wb.position.set(0, 0, 0);
      wb.rotation.set(0, 0, 0);
      if (witchMode === 'walk' || witchMode === 'trudge') {
        walkPh += dt * (witchMode === 'walk' ? 6 : 3.4);
        wb.position.y = Math.abs(Math.sin(walkPh)) * 0.07;
        wb.rotation.z = Math.sin(walkPh) * 0.07;
        W.legs.forEach((l, i) => { l.position.set(i ? 0.36 : -0.36, 0.42, 0.22); l.rotation.x = Math.sin(walkPh + i * Math.PI) * 0.4; });
        W.hands.forEach((h, i) => { h.position.set(i ? 0.95 : -0.95, 0.85 + Math.sin(walkPh + i * Math.PI) * 0.05, 0.55); h.rotation.set(0.2, 0, 0); });
        if (witchMode === 'trudge') { trudgeT += dt; witch.root.position.z = WITCH_STOP.z - Math.min(1.2, trudgeT * 0.03); } // 무거운 보따리에 아주 조금씩만 나아간다
      } else if (witchMode === 'peek') {
        W.legs.forEach((l, i) => { l.position.set(i ? 0.36 : -0.36, 0.42, 0.22); l.rotation.x = 0; });
        W.hands.forEach((h, i) => { h.position.set(i ? 0.5 : -0.5, 0.95, 1.2); h.rotation.set(-0.15, 0, 0); }); // 덤불 위에 손톱을 척
      } else if (witchMode === 'down' || witchMode === 'flail' || witchMode === 'fall') {
        const fl = witchMode === 'flail';
        W.legs.forEach((l, i) => { l.position.set(i ? 0.55 : -0.55, 0.45, 0.75); l.rotation.x = -1.45 + Math.sin(t * (fl ? 11 : 4) + i * 2.1) * (fl ? 0.35 : 0.12); }); // 다리를 망토 밖 앞(넘어지면 하늘)으로 번쩍
        W.hands.forEach((h, i) => { h.position.set(i ? 1.12 : -1.12, 1.3 + Math.sin(t * (fl ? 10 : 3) + i * 2) * 0.12, 0.3); h.rotation.set(-0.9, 0, 0); }); // 양팔을 허우적
      } else {
        W.legs.forEach((l, i) => { l.position.set(i ? 0.36 : -0.36, 0.42, 0.22); l.rotation.x = 0; });
        W.hands.forEach((h, i) => { h.position.set(i ? 0.95 : -0.95, 0.85, 0.55); h.rotation.set(0.2, 0, 0); });
      }
      // 몸 · 인형 · 물에 비친 모습 몸짓
      for (const k of KINDS) {
        const b = bodyOf(k);
        if (b && b.root.visible) {
          let a = anims[k] || 'idle';
          const opts = { phase: k.length };
          if (a === 'run') { a = 'walk'; opts.phase = t * 14; }
          if (a === 'sit') b.root.position.y = 0.12;
          animateChibi(b, a, t, opts);
        }
        const d = dollOf(k);
        if (d && d.root.visible) {
          const a = dollAnims[k] || 'idle', opts = { phase: k.length };
          if (a === 'walk') opts.phase = t * 9;
          d.root.rotation.x = a === 'faint' ? -Math.PI / 2 * 0.95 : 0; // 주문이 풀리면 축 늘어져 벌러덩
          animateChibi(d, a === 'faint' ? 'idle' : a, t, opts);
        }
        const r = mirrorOf(k);
        if (mirrorsOn && r && r.root.visible) {
          r.root.position.y = -0.12 + Math.sin(t * 1.3 + k.length) * 0.008; // 물결에 살짝 일렁
          animateChibi(r, 'sit', t, { phase: k.length });
        }
      }
      ripples.forEach((m) => { const u = (t * 0.35 + m.userData.ph) % 1; m.scale.setScalar(0.6 + u * 2.2); m.material.opacity = mirrorsOn ? (1 - u) * 0.5 : 0; });
      // 카메라
      const sh = camera.aspect < 1 && shot.portrait ? shot.portrait : shot, kk = Math.min(1, dt * 2.2);
      tmpPos.set(...sh.pos); tmpLook.set(...sh.look);
      if (shot.follow) { const w = witch.root.position; tmpPos.x += w.x; tmpPos.z += w.z; tmpLook.x += w.x; tmpLook.z += w.z; } // 마녀가 있는 곳을 따라
      if (snapNext) { camPos.copy(tmpPos); camLook.copy(tmpLook); snapNext = false; }
      else { camPos.lerp(tmpPos, kk); camLook.lerp(tmpLook, kk); }
      camera.position.copy(camPos);
      if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); camera.position.x += Math.sin(t * 60) * 0.05 * shakeT; camera.position.y += Math.cos(t * 50) * 0.04 * shakeT; }
      camera.lookAt(camLook);
    }
  };
  return api;
}
