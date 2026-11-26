import * as THREE from 'three';
import { toonMesh, GEO } from '../render/toon.js';
import { batchStatic } from '../render/batch.js';
import { PLAZA, lotById } from '../core/layout.js';

/**
 * 마을 대회 소품(게임 오리지널, core/contest.js 의 토요일 낚시 대회와 수요일 풀 뽑기 시합):
 *  - 대회 접수대: 대회 날 게시판 옆에 서는 작은 탁자(체크무늬 보, 「대회 접수」 팻말)
 *  - 시상대: 오후 5시 시상식 동안 광장 남쪽에 놓는 3단 단상(가운데 1등, 왼쪽 2등, 오른쪽 3등)
 * 둘 다 처음 보일 때 만들고, setDesk 와 setPodium 으로 보이고 숨긴다(장애물도 같이 켜고 끈다).
 * village: buildVillage 가 돌려준 것(obstacles, nearestFree, refreshNav).
 */
const FONT = 'Gaegu, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const WOOD = '#c49a6c', DARK_WOOD = '#8a5a34', CREAM = '#fff6e0', RED = '#e0524f', INK = '#5a4431';
// 접수대: 게시판(노동 접수) 동쪽 옆. 서쪽에는 일감 걸이가 서 있다
const DESK_SIDE = 2.1, DESK_HX = 0.66, DESK_HZ = 0.36;
// 시상대: 광장 한가운데(시계탑 자리)에서 남쪽으로. 앞면이 남쪽(카메라 쪽)을 본다
// 광장 동쪽(시계탑 오른쪽): 남쪽에 두면 남쪽 길목 현수막이 카메라 앞을 가려 단상이 안 보였다
const POD = { x: PLAZA.x + 3.4, z: PLAZA.z - 0.3, w: 0.9, d: 0.8, cap: 0.06 };
// 1등(가운데), 2등(화면 왼쪽 = 서쪽), 3등(오른쪽) 순서
const STEPS = [
  { dx: 0, h: 0.6, top: '#fcd95b', n: '1' },
  { dx: -POD.w, h: 0.42, top: '#cfd6dd', n: '2' },
  { dx: POD.w, h: 0.28, top: '#d99a6a', n: '3' }
];

export function createContestProps(scene, village) {
  /** 소품 하나: 뿌리 그룹(처음 켤 때 만든다)과 그 장애물. */
  const prop = (make) => ({ root: null, obs: [], make });

  /** 「대회 접수」 팻말 글씨(크림색 판, 빨간 점선 테두리, 양 끝에 작은 별). */
  function signTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = 144;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const star = (c, x, y, r) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.45 : r;
        c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      }
      c.closePath();
      c.fill();
    };
    const draw = () => {
      const c = canvas.getContext('2d');
      c.fillStyle = CREAM;
      c.fillRect(0, 0, 384, 144);
      c.strokeStyle = RED; c.lineWidth = 6; c.setLineDash([16, 10]); c.strokeRect(10, 10, 364, 124); c.setLineDash([]);
      c.fillStyle = '#f6b93b';
      star(c, 44, 72, 17);
      star(c, 340, 72, 17);
      c.fillStyle = INK;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold 82px ${FONT}`;
      c.fillText('대회 접수', 192, 76);
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.load('bold 82px Gaegu').then(draw, () => {});
    return tex;
  }
  /** 탁자 보의 빨간 체크무늬(크림 바탕에 빨간 줄이 겹치는 곳은 진하게). rx, ry: 되풀이 수. */
  function checkTexture(rx, ry) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d');
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = 'rgba(224, 82, 79, 0.5)';
    c.fillRect(0, 0, 16, 32);
    c.fillRect(0, 0, 32, 16);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    return tex;
  }
  /** 시상대 앞면 숫자(바탕은 비치고, 짙은 갈색 글씨에 흰 테두리). */
  function numeralTexture(n) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 128, 128);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold 150px ${FONT}`;
      c.lineJoin = 'round';
      c.strokeStyle = '#ffffff'; c.lineWidth = 24; c.strokeText(n, 64, 72);
      c.strokeStyle = INK; c.lineWidth = 11; c.strokeText(n, 64, 72); // 손글씨 숫자가 가늘어 한 번 더 그어 굵게
      c.fillStyle = INK;
      c.fillText(n, 64, 72);
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.load('bold 150px Gaegu').then(draw, () => {});
    return tex;
  }

  /** 접수대: 체크무늬 보를 덮은 탁자, 그 뒤쪽에 세운 팻말(앞뒤 두 면 모두 바로 읽힌다), 탁자 위 접수 종이와 연필꽂이. */
  function buildDesk(p) {
    const board = lotById('board');
    const at = village.nearestFree(board.x + DESK_SIDE, board.z, 0.75);
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.z);
    const add = (geo, c, o) => { const mesh = toonMesh(geo, c, o); g.add(mesh); return mesh; };
    // 탁자
    [[-0.52, -0.22], [0.52, -0.22], [-0.52, 0.22], [0.52, 0.22]].forEach(([lx, lz]) => add(GEO.box, WOOD, { position: [lx, 0.3, lz], scale: [0.08, 0.6, 0.08], shell: true, outline: 0.02 }));
    add(GEO.box, WOOD, { position: [0, 0.63, 0], scale: [1.2, 0.07, 0.6], shell: true, outline: 0.02 });
    // 보: 윗면과 앞자락은 체크무늬, 옆자락은 크림색, 자락 끝에 빨간 띠
    const plain = new THREE.MeshLambertMaterial({ color: CREAM });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.03, 0.68), [plain, plain, new THREE.MeshLambertMaterial({ map: checkTexture(8, 4) }), plain, plain, plain]);
    top.position.set(0, 0.685, 0);
    const drape = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.3, 0.02), [plain, plain, plain, plain, new THREE.MeshLambertMaterial({ map: checkTexture(8, 2) }), plain]);
    drape.position.set(0, 0.55, 0.34);
    g.add(top, drape);
    [-1, 1].forEach((sd) => add(GEO.box, CREAM, { position: [sd * 0.64, 0.55, 0], scale: [0.02, 0.3, 0.68], outline: false, shadow: false }));
    add(GEO.box, RED, { position: [0, 0.42, 0.345], scale: [1.3, 0.05, 0.03], outline: false, shadow: false });
    [-1, 1].forEach((sd) => add(GEO.box, RED, { position: [sd * 0.645, 0.42, 0], scale: [0.03, 0.05, 0.7], outline: false, shadow: false }));
    // 팻말: 탁자 뒤쪽에 선 기둥 둘 사이의 나무 테와 글씨 판
    [-1, 1].forEach((sd) => {
      add(GEO.box, DARK_WOOD, { position: [sd * 0.5, 0.97, -0.22], scale: [0.06, 0.56, 0.06], shell: true, outline: 0.015 });
      add(GEO.sphere, '#fcd95b', { position: [sd * 0.5, 1.29, -0.22], scale: [0.055, 0.055, 0.055], outline: 0.012 });
    });
    add(GEO.box, DARK_WOOD, { position: [0, 1.04, -0.22], scale: [1.02, 0.42, 0.04], shell: true, outline: 0.02 });
    const face = new THREE.MeshLambertMaterial({ map: signTexture() }), edge = new THREE.MeshLambertMaterial({ color: CREAM });
    const text = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 0.06), [edge, edge, edge, edge, face, face]);
    text.position.set(0, 1.04, -0.22);
    g.add(text);
    // 탁자 위: 접수 종이와 연필, 연필꽂이
    add(GEO.box, '#fffdf6', { position: [-0.2, 0.705, 0.08], rotation: [0, 0.12, 0], scale: [0.3, 0.012, 0.22], outline: 0.01, shadow: false });
    [0.03, -0.02, -0.07].forEach((dz) => add(GEO.box, '#b9a58c', { position: [-0.2, 0.713, 0.08 + dz], rotation: [0, 0.12, 0], scale: [0.2, 0.004, 0.012], outline: false, shadow: false }));
    add(GEO.cylinder, '#f6b93b', { position: [-0.02, 0.705, 0.14], rotation: [0, 0.5, Math.PI / 2], scale: [0.012, 0.16, 0.012], outline: false, shadow: false });
    add(GEO.cylinder, '#8fd3ff', { position: [0.34, 0.7, 0.06], scale: [0.06, 0.12, 0.06], outline: 0.012, shadow: false });
    [['#e0524f', -0.02, 0.1], ['#8fd16a', 0.025, -0.16]].forEach(([c, dx, lean]) => add(GEO.cylinder, c, { position: [0.34 + dx, 0.76, 0.06], rotation: [0, 0, lean], scale: [0.012, 0.16, 0.012], outline: false, shadow: false }));
    p.root.add(g);
    p.obs.push({ x: at.x, z: at.z, box: { hx: DESK_HX, hz: DESK_HZ, yaw: 0 } });
  }

  /** 시상대: 흰 단 셋(가운데가 가장 높다)에 금, 은, 동빛 윗판과 앞면의 큰 숫자. */
  function buildPodium(p) {
    const g = new THREE.Group();
    g.position.set(POD.x, 0, POD.z);
    const numeralGeo = new THREE.PlaneGeometry(1, 1);
    STEPS.forEach(({ dx, h, top, n }) => {
      const body = h - POD.cap;
      g.add(toonMesh(GEO.box, '#fbf6ea', { position: [dx, body / 2, 0], scale: [POD.w, body, POD.d], shell: true, outline: 0.025 }));
      g.add(toonMesh(GEO.box, top, { position: [dx, h - POD.cap / 2, 0], scale: [POD.w + 0.05, POD.cap, POD.d + 0.05], shell: true, outline: 0.02, receive: true }));
      const s = Math.min(0.56, body * 1.2); // 글씨 둘레에 빈 테가 있어 단보다 조금 커도 숫자는 앞면 안에 든다
      const num = new THREE.Mesh(numeralGeo, new THREE.MeshLambertMaterial({ map: numeralTexture(n), transparent: true, depthWrite: false }));
      num.position.set(dx, body / 2, POD.d / 2 + 0.006);
      num.scale.set(s, s, 1);
      g.add(num);
    });
    p.root.add(g);
    p.obs.push({ x: POD.x, z: POD.z, box: { hx: POD.w * 1.5 + 0.03, hz: POD.d / 2 + 0.03, yaw: 0 } });
  }

  const desk = prop(buildDesk), podium = prop(buildPodium);

  /** 소품을 보이거나 숨긴다(처음 보일 때 만든다). 같은 값으로 다시 부르면 아무 일도 없다. */
  function set(p, on) {
    on = !!on;
    if (on && !p.root) {
      p.root = new THREE.Group();
      p.make(p);
      scene.add(p.root);
      batchStatic(p.root, { cell: 40 });
      for (const o of p.obs) village.obstacles.push(o);
      village.refreshNav();
      return;
    }
    if (!p.root || p.root.visible === on) return;
    p.root.visible = on;
    p.obs.forEach((o) => { o.off = !on; });
    village.refreshNav();
  }

  return {
    /** 대회 접수대를 세우거나 치운다. */
    setDesk(on) { set(desk, on); },
    /** 시상대를 놓거나 치운다. */
    setPodium(on) { set(podium, on); },
    /** 시상대 위에 설 자리 셋(1등, 2등, 3등 순서): 단 윗면 가운데. y 는 단 높이. */
    podiumSpots() { return STEPS.map(({ dx, h }) => ({ x: POD.x + dx, z: POD.z, y: h })); }
  };
}
