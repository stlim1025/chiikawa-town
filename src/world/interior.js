import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO } from '../render/toon.js';
import { buildChibi, buildNpc, animateChibi, showOnlyProp } from '../actors/models.js';
import { HOME_CELL as CELL, roomLayout, roomShape, homeCellCenter, sizeOf, decorOf, WALLPAPERS, FLOORS } from '../core/home.js';
import { photoFrameTexture } from './photoframe.js';
import { buildDoll, dollLook } from '../actors/dolls.js';

// 돔 집 안: 앞쪽 벽이 잘린 인형의 집처럼 비스듬히 위에서 들여다본다.
// 방 크기 · 칸 격자 · 문간 · 옷장 · 보관 상자 자리는 집 크기마다 다르다(core/home.js roomLayout). 깔개와 방석은 밟고 지나갈 수 있다.
const WALKABLE = new Set(['rug', 'cushion', 'squarerug']);

/** 칸 (cx, cz) 의 바닥 가운데(size: 집 크기 번호, 처음 방이 0). */
export const cellCenter = (cx, cz, size = 0) => homeCellCenter(size, cx, cz);

const PIC_GEO = new THREE.PlaneGeometry(1, 1);
let friendTex = null;
/**
 * 우정 사진 액자(업적 기념 가구 friendframe)의 사진: 파스텔 하늘과 풀밭 앞에 여섯 친구(치이카와, 하치와레, 우사기, 쿠리만쥬, 랏코, 모몽가)가
 * 나란히 웃고 있는 그림. 처음 부를 때 한 번 그리고, 액자가 몇 개든 같이 쓴다.
 */
function friendPhotoTexture() {
  if (friendTex) return friendTex;
  const W = 240, H = 160, LINE = '#5a4a44', INK = '#2b2224';
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const ell = (x, y, rx, ry, fill, stroke = true) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (stroke) c.stroke();
  };
  // 머리 동그라미 안쪽에만 칠한다(머리 위 무늬)
  const inHead = (x, y, r, paint) => {
    c.save();
    c.beginPath();
    c.arc(x, y, r - 1, 0, Math.PI * 2);
    c.clip();
    paint();
    c.restore();
  };
  // 하늘, 구름, 풀밭
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#bfe3f7');
  sky.addColorStop(0.7, '#fde8ef');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  [[52, 34, 22], [170, 26, 26], [204, 48, 14]].forEach(([x, y, r]) => { ell(x, y, r, r * 0.45, '#ffffff', false); ell(x + r * 0.4, y - r * 0.25, r * 0.55, r * 0.4, '#ffffff', false); });
  ell(W / 2, H + 46, W * 0.8, 92, '#b7e3a4', false);
  c.strokeStyle = LINE;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  // 친구 여섯: 몸 색, 머리 반지름, 귀와 무늬
  const friends = [
    { body: '#ffffff', r: 17, ears: (x, y) => [-1, 1].forEach((s) => ell(x + s * 12, y - 13, 5, 5, '#ffffff')), cheek: true },
    {
      body: '#ffffff', r: 17,
      ears: (x, y) => [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(x + s * 5, y - 14); c.lineTo(x + s * 13, y - 25); c.lineTo(x + s * 16, y - 8); c.closePath(); c.fillStyle = '#7f9bc4'; c.fill(); c.stroke(); }),
      top: (x, y, r) => inHead(x, y, r, () => [-1, 1].forEach((s) => ell(x + s * 11, y - 12, 10, 11, '#7f9bc4', false))) // 가운데가 갈라진 앞머리 무늬
    },
    { body: '#f6e39a', r: 17, ears: (x, y) => [-1, 1].forEach((s) => ell(x + s * 7, y - 25, 4.5, 14, '#f6e39a')) },
    {
      body: '#e8c492', r: 17, ears: (x, y) => [-1, 1].forEach((s) => ell(x + s * 12, y - 13, 4.5, 4.5, '#b9824f')),
      top: (x, y, r) => inHead(x, y, r, () => ell(x, y - 17, 20, 11, '#b9824f', false)) // 밤만쥬처럼 짙은 윗머리
    },
    {
      body: '#a9785a', r: 17, ears: (x, y) => [-1, 1].forEach((s) => ell(x + s * 15, y - 8, 4, 4, '#a9785a')),
      top: (x, y) => { ell(x, y + 3, 12, 10, '#f0dcc0', false); ell(x, y + 1, 2.6, 1.8, INK, false); } // 밝은 얼굴과 까만 코
    },
    {
      body: '#ffffff', r: 14, ears: (x, y) => [-1, 1].forEach((s) => ell(x + s * 11, y - 9, 5.5, 5, '#b9cdeb')),
      top: (x, y, r) => inHead(x, y, r, () => ell(x, y - 14, 17, 9, '#b9cdeb', false)), cheek: true
    }
  ];
  friends.forEach((f, i) => {
    const r = f.r, x = 30 + i * 36, y = 89 + (17 - r); // 작은 친구도 발 높이는 같게
    ell(x, y + r + 12, r * 0.72, 15, f.body); // 몸(풀밭에 서 있다)
    f.ears(x, y);
    ell(x, y, r, r * 0.94, f.body);
    if (f.top) f.top(x, y, r);
    c.beginPath(); // 머리 테두리를 무늬 위에 다시 긋는다
    c.ellipse(x, y, r, r * 0.94, 0, 0, Math.PI * 2);
    c.stroke();
    [-1, 1].forEach((s) => {
      ell(x + s * r * 0.38, y + 1, 2, 2.4, INK, false);
      if (f.cheek) ell(x + s * r * 0.62, y + 6, 3.4, 2.2, '#f8b4c4', false);
    });
    c.beginPath(); // 웃는 입
    c.arc(x, y + 5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  });
  friendTex = new THREE.CanvasTexture(cv);
  friendTex.colorSpace = THREE.SRGBColorSpace;
  return friendTex;
}

/** 가구 모델. 한 칸(약 1 x 1) 안에 들어가는 크기. 가구점 썸네일(world/thumbs.js)도 이걸로 그린다. */
export function furnitureModel(id) {
  const g = new THREE.Group();
  const m = (geo, c, o = {}) => { const mesh = toonMesh(geo, c, { shadow: false, ...o }); g.add(mesh); return mesh; };
  // 기울인 묶음(책, 방패, 액자) 안에 넣는 조각: 외곽선은 달라고 할 때만
  const sub = (par, geo, c, o = {}) => { const mesh = toonMesh(geo, c, { shadow: false, outline: false, ...o }); par.add(mesh); return mesh; };
  switch (id) {
    case 'bed':
      m(GEO.box, '#d8b48c', { position: [0, 0.18, 0.05], scale: [0.9, 0.36, 0.95], shell: true });
      m(GEO.box, '#fff4de', { position: [0, 0.4, 0.07], scale: [0.82, 0.12, 0.88], shell: true });
      m(GEO.box, '#a8dcc8', { position: [0, 0.47, 0.2], scale: [0.84, 0.07, 0.6], shell: true });
      m(GEO.sphere, '#ffffff', { position: [0, 0.52, -0.25], scale: [0.26, 0.09, 0.15], outline: 0.02 });
      m(GEO.box, '#c49a6c', { position: [0, 0.48, -0.44], scale: [0.92, 0.62, 0.08], shell: true });
      break;
    case 'table':
      m(GEO.cylinder, '#c49a6c', { position: [0, 0, 0], scale: [0.07, 0.5, 0.07], outline: 0.02 });
      m(GEO.cylinder, '#e2b77f', { position: [0, 0.5, 0], scale: [0.42, 0.07, 0.42], outline: 0.025 });
      m(GEO.cylinder, '#ffffff', { position: [0.12, 0.57, 0.05], scale: [0.07, 0.1, 0.07], outline: 0.012 });
      break;
    case 'cushion':
      m(GEO.sphere, '#ffb7cf', { position: [0, 0.1, 0], scale: [0.38, 0.12, 0.38], outline: 0.025 });
      m(GEO.dot, '#e5788f', { position: [0, 0.22, 0], scale: [0.05, 0.03, 0.05], outline: false });
      break;
    case 'rug':
      m(GEO.cylinder, '#cdb8f0', { position: [0, 0, 0], scale: [0.5, 0.02, 0.5], outline: 0.02, receive: true });
      m(GEO.cylinder, '#e6dcff', { position: [0, 0.005, 0], scale: [0.3, 0.025, 0.3], outline: false, receive: true });
      break;
    case 'plant':
      m(GEO.cylinder, '#d8a47f', { position: [0, 0, 0], scale: [0.18, 0.3, 0.18], outline: 0.02 });
      [[0, 0.5, 0, 0.2], [0.12, 0.42, 0.05, 0.15], [-0.12, 0.44, -0.04, 0.15]].forEach(([x, y, z, r]) => m(GEO.sphere, '#6cc77e', { position: [x, y, z], scale: [r, r, r], outline: 0.02 }));
      break;
    case 'lamp':
      m(GEO.cylinder, '#8f8174', { position: [0, 0, 0], scale: [0.16, 0.05, 0.16], outline: 0.015 });
      m(GEO.cylinder, '#8f8174', { position: [0, 0.05, 0], scale: [0.025, 0.85, 0.025], outline: 0.01 });
      m(GEO.cone, '#fff1a8', { position: [0, 0.78, 0], scale: [0.26, 0.3, 0.26], outline: 0.02 });
      m(GEO.dot, '#fff6c8', { position: [0, 0.84, 0], scale: [0.09, 0.09, 0.09], outline: false });
      break;
    case 'shelf':
      m(GEO.box, '#c49a6c', { position: [0, 0.55, -0.25], scale: [0.9, 1.1, 0.34], shell: true });
      [0.32, 0.72].forEach((y) => m(GEO.box, '#a77d5a', { position: [0, y, -0.07], scale: [0.82, 0.04, 0.02], outline: false }));
      ['#e0524f', '#7fa7d9', '#f7d24a', '#8fd16a', '#ffb7cf'].forEach((c, i) => m(GEO.box, c, { position: [-0.3 + i * 0.15, i % 2 ? 0.86 : 0.46, -0.12], scale: [0.1, 0.24, 0.16], outline: 0.01 }));
      break;
    case 'stove':
      m(GEO.box, '#e0524f', { position: [0, 0.28, 0], scale: [0.5, 0.56, 0.45], shell: true });
      m(GEO.box, '#f7a84a', { position: [0, 0.24, 0.23], scale: [0.26, 0.2, 0.02], outline: false });
      m(GEO.cylinder, '#6b6470', { position: [0.12, 0.56, -0.08], scale: [0.07, 0.6, 0.07], outline: 0.015 });
      break;
    case 'djbooth':
      // 우사기 클럽의 DJ 자리: 작은 탁자 위 커다란 도토리와 나뭇잎, 옆에 동그란 스피커
      m(GEO.box, '#5b4a7a', { position: [0, 0.3, 0], scale: [0.86, 0.6, 0.46], shell: true });
      m(GEO.box, '#ff7ad9', { position: [0, 0.4, 0.235], scale: [0.7, 0.05, 0.01], outline: false });
      m(GEO.sphere, '#b9773f', { position: [-0.12, 0.7, 0], scale: [0.16, 0.13, 0.16], outline: 0.02 });
      m(GEO.sphere, '#7a5131', { position: [-0.12, 0.79, 0], scale: [0.17, 0.06, 0.17], outline: 0.015 });
      m(GEO.sphere, '#6cc77e', { position: [0.18, 0.62, 0.02], scale: [0.16, 0.025, 0.09], rotation: [0, 0.5, 0], outline: 0.015 });
      m(GEO.box, '#3a3236', { position: [0.55, 0.32, 0], scale: [0.26, 0.64, 0.3], shell: true });
      [0.2, 0.46].forEach((y) => m(GEO.cylinder, '#8f8174', { position: [0.55, y, 0.16], scale: [0.08, 0.02, 0.08], rotation: [Math.PI / 2, 0, 0], outline: 0.01 }));
      break;
    case 'dollset': {
      // 난토카바니아 인형 세트(사이드스토리 '난토카바니아'): 낮은 나무 받침 위에 넷의 인형(나 · 치이카와 · 하치와레 · 우사기)
      m(GEO.box, '#c49a6c', { position: [0, 0.06, 0], scale: [0.9, 0.12, 0.42], shell: true });
      ['me', 'chiikawa', 'hachiware', 'usagi'].forEach((k, i) => {
        const d = buildDoll(k, k === 'me' ? dollLook() : null);
        d.root.scale.setScalar(0.38);
        d.root.position.set(-0.32 + i * 0.213, 0.12, 0.02);
        d.root.rotation.y = (1.5 - i) * 0.12; // 가운데를 보듯 살짝 안쪽으로
        animateChibi(d, 'idle', 0, {});
        g.add(d.root);
      });
      break;
    }
    case 'photo': {
      // 흔들린 사진 액자(하치와레의 카메라): 낮은 나무 장 위에 비스듬히 세운 액자, 사진은 그날 찍은 단체 사진(world/photoframe.js)
      m(GEO.box, '#c49a6c', { position: [0, 0.18, 0], scale: [0.56, 0.36, 0.36], shell: true });
      const fr = new THREE.Group();
      fr.position.set(0, 0.6, 0.02);
      fr.rotation.set(-0.16, 0, 0, 'YXZ');
      fr.add(toonMesh(GEO.box, '#e8b86a', { position: [0, 0, 0], scale: [0.52, 0.42, 0.05], shell: true, shadow: false, outline: 0.015 }));
      fr.add(toonMesh(new THREE.PlaneGeometry(1, 1), '#ffffff', { material: new THREE.MeshBasicMaterial({ map: photoFrameTexture() }), position: [0, 0, 0.027], scale: [0.44, 0.33, 1], outline: false, shadow: false }));
      g.add(fr);
      m(GEO.box, '#a77d5a', { position: [0, 0.52, -0.14], scale: [0.05, 0.3, 0.04], rotation: [0.55, 0, 0], outline: 0.01 }); // 뒤 받침대
      break;
    }
    case 'doll': {
      const doll = buildNpc('chiikawa');
      doll.root.scale.setScalar(0.42);
      animateChibi(doll, 'idle', 0, {});
      g.add(doll.root);
      break;
    }
    case 'anokodoll': {
      // 아노코 인형(아노코와 친해지면 받는다): 앉아 있는 작은 봉제 인형. 흰 털 머리와 갈기, 주황 뿔, 감은 웃는 눈, 베이지 몸, 끝이 흰 초록 꼬리
      const WHITE = '#fbfaf5', BEIGE = '#eadbc6', HORN = '#f2a46a', INK = '#2b2224';
      m(GEO.sphere, BEIGE, { position: [0, 0.15, -0.02], scale: [0.17, 0.16, 0.16], outline: 0.02 }); // 몸
      [-1, 1].forEach((sd) => {
        m(GEO.sphere, BEIGE, { position: [sd * 0.11, 0.05, 0.12], scale: [0.065, 0.05, 0.085], outline: 0.015 }); // 앞으로 뻗은 뒷발
        m(GEO.dot, HORN, { position: [sd * 0.11, 0.045, 0.2], scale: [0.03, 0.02, 0.02], outline: false }); // 발톱
        m(GEO.sphere, WHITE, { position: [sd * 0.1, 0.17, 0.13], scale: [0.05, 0.06, 0.05], outline: 0.015 }); // 가슴 앞에 모은 앞발
      });
      // 꼬리: 엉덩이 뒤에서 옆으로 말려 나온다
      m(GEO.sphere, '#7aa66e', { position: [0.07, 0.07, -0.17], scale: [0.1, 0.055, 0.06], rotation: [0, 0.5, 0], outline: 0.015 });
      m(GEO.sphere, '#7aa66e', { position: [0.19, 0.06, -0.18], scale: [0.075, 0.045, 0.05], rotation: [0, -0.3, 0], outline: 0.015 });
      m(GEO.sphere, WHITE, { position: [0.27, 0.06, -0.14], scale: [0.04, 0.035, 0.04], outline: 0.012 });
      // 머리: 흰 공 둘레에 털 뭉치 갈기(정수리는 비운다), 처진 귀, 이마의 뿔
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        if (Math.sin(a) > 0.8) continue;
        m(GEO.sphere, WHITE, { position: [Math.cos(a) * 0.2, 0.38 + Math.sin(a) * 0.17, 0], scale: [0.08, 0.08, 0.08], outline: 0.015 });
      }
      m(GEO.sphere, WHITE, { position: [0, 0.38, 0.04], scale: [0.22, 0.2, 0.2], outline: 0.02 });
      [-1, 1].forEach((sd) => m(GEO.sphere, WHITE, { position: [sd * 0.17, 0.54, 0.02], scale: [0.07, 0.04, 0.045], rotation: [0, 0, -sd * 0.38], outline: 0.012 }));
      m(GEO.cone, HORN, { position: [0, 0.53, 0.13], scale: [0.03, 0.085, 0.03], rotation: [0.55, 0, 0], outline: 0.01 });
      // 얼굴: 위로 휜 감은 눈(짧은 선 둘을 ㅅ 모양으로), 분홍 볼, 작은 입
      [-1, 1].forEach((sd) => {
        [-1, 1].forEach((k) => m(GEO.dot, INK, { position: [sd * 0.085 + k * 0.014, 0.392, 0.226], scale: [0.02, 0.006, 0.008], rotation: [0, sd * 0.35, -k * 0.5], outline: false }));
        m(GEO.dot, '#f5a3b5', { position: [sd * 0.14, 0.345, 0.193], scale: [0.032, 0.018, 0.01], rotation: [0, sd * 0.65, 0], outline: false });
      });
      m(GEO.dot, INK, { position: [0, 0.345, 0.238], scale: [0.016, 0.009, 0.008], outline: false });
      break;
    }
    // ---------- 업적 기념 가구(도감과 업적 보상, 가구점에서는 팔지 않는다) ----------
    case 'dexplaque': {
      // 반짝 도감 상패: 나무 받침 위 독서대에 펼쳐 세운 그림책(마을 도감). 왼쪽 장에 물고기와 풀잎, 오른쪽 장에 복슬복슬한 몬스터, 책 위에 금빛 별
      const INK = '#2b2224', GOLD = '#fcd95b';
      m(GEO.box, '#8a5a34', { position: [0, 0.07, 0], scale: [0.64, 0.14, 0.42], shell: true, outline: 0.02 });
      m(GEO.box, GOLD, { position: [0, 0.07, 0.212], scale: [0.3, 0.06, 0.01], outline: false }); // 금빛 이름판
      m(GEO.box, '#a77d5a', { position: [0, 0.27, 0], scale: [0.1, 0.26, 0.1], shell: true, outline: 0.012 }); // 기둥
      m(GEO.box, '#a77d5a', { position: [0, 0.3, 0.07], scale: [0.5, 0.04, 0.16], shell: true, outline: 0.012 }); // 책을 받치는 턱
      const bk = new THREE.Group(); // 책: 위쪽이 뒤로 넘어가게 눕혀 비스듬히 위에서도 장이 보인다
      bk.position.set(0, 0.53, 0);
      bk.rotation.set(-0.5, 0, 0, 'YXZ');
      g.add(bk);
      sub(bk, GEO.box, '#b5524a', { scale: [0.68, 0.46, 0.035], shell: true, outline: 0.015 }); // 표지
      sub(bk, GEO.box, '#d9c9a8', { position: [0, 0, 0.02], scale: [0.012, 0.4, 0.012] }); // 책등 골
      sub(bk, GEO.box, '#e0524f', { position: [0.04, -0.25, 0.012], scale: [0.035, 0.1, 0.01] }); // 가름끈
      const spark = (par, x, y) => sub(par, GEO.box, GOLD, { position: [x, y, 0.02], scale: [0.024, 0.024, 0.005], rotation: [0, 0, Math.PI / 4] }); // 반짝이(마름모)
      // 장 둘: 바깥쪽 가장자리가 살짝 들린다
      const [left, right] = [-1, 1].map((sd) => {
        const pg = new THREE.Group();
        pg.position.set(sd * 0.165, 0, 0.03);
        pg.rotation.y = -sd * 0.1;
        bk.add(pg);
        sub(pg, GEO.box, '#fff8e6', { scale: [0.31, 0.4, 0.025], shell: true, outline: 0.008 });
        return pg;
      });
      // 왼쪽 장 위: 물고기(책등 쪽을 본다)
      sub(left, GEO.sphere, '#6fb7e8', { position: [0, 0.085, 0.02], scale: [0.07, 0.04, 0.01], outline: 0.008 });
      sub(left, GEO.cone, '#6fb7e8', { position: [-0.11, 0.085, 0.02], scale: [0.035, 0.05, 0.008], rotation: [0, 0, -Math.PI / 2] });
      sub(left, GEO.dot, INK, { position: [0.035, 0.092, 0.031], scale: [0.008, 0.008, 0.004] });
      spark(left, 0.1, 0.15);
      // 왼쪽 장 아래: 풀잎 줄기
      sub(left, GEO.box, '#5fae6a', { position: [0, -0.1, 0.02], scale: [0.012, 0.13, 0.006] });
      [-1, 1].forEach((sd) => sub(left, GEO.sphere, '#7cc46a', { position: [sd * 0.032, -0.085, 0.022], scale: [0.035, 0.016, 0.006], rotation: [0, 0, sd * 0.6] }));
      sub(left, GEO.sphere, '#7cc46a', { position: [0, -0.025, 0.022], scale: [0.016, 0.03, 0.006] });
      spark(left, -0.1, -0.05);
      // 오른쪽 장: 복슬복슬한 동그란 몬스터와 설명 글줄
      sub(right, GEO.sphere, '#c9a4f0', { position: [0, 0.03, 0.02], scale: [0.085, 0.08, 0.012], outline: 0.008 });
      [[-0.045, 0.1], [0, 0.118], [0.045, 0.1]].forEach(([x, y]) => sub(right, GEO.dot, '#c9a4f0', { position: [x, y, 0.02], scale: [0.026, 0.026, 0.008] }));
      [-1, 1].forEach((sd) => {
        sub(right, GEO.dot, INK, { position: [sd * 0.03, 0.045, 0.033], scale: [0.01, 0.012, 0.004] });
        sub(right, GEO.dot, '#f5a3b5', { position: [sd * 0.055, 0.02, 0.032], scale: [0.014, 0.009, 0.004] });
      });
      sub(right, GEO.dot, INK, { position: [0, 0.018, 0.033], scale: [0.012, 0.006, 0.004] });
      [-0.12, -0.15].forEach((y, i) => sub(right, GEO.box, '#d9c9a8', { position: [i ? -0.03 : 0, y, 0.014], scale: [i ? 0.16 : 0.22, 0.012, 0.004] }));
      spark(right, 0.11, 0.14);
      // 책 위의 금빛 별
      sub(bk, GEO.sphere, GOLD, { position: [0, 0.31, 0], scale: [0.05, 0.05, 0.025], outline: 0.01 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        sub(bk, GEO.cone, GOLD, { position: [Math.sin(a) * 0.03, 0.31 + Math.cos(a) * 0.03, 0], scale: [0.03, 0.07, 0.02], rotation: [0, 0, -a], outline: 0.008 });
      }
      break;
    }
    case 'bossshield': {
      // 다섯 보스 기념 방패: 낮은 받침에 세운 둥근 나무 방패(쇠 테두리, 가운데 금빛 돌기). 다섯 보스 얼굴이 고리 모양으로 둘러 있다
      // 위에서 시계 방향으로 두더지(금빛 발톱), 나무 거인(잎 머리), 강 게(집게발), 버섯 왕(보라 갓과 왕관), 아노코(흰 털과 주황 뿔)
      const INK = '#2b2224', GOLD = '#fcd95b', WHITE = '#fbfaf5';
      m(GEO.box, '#8a5a34', { position: [0, 0.06, 0], scale: [0.56, 0.12, 0.3], shell: true, outline: 0.02 });
      [-1, 1].forEach((sd) => m(GEO.box, '#a77d5a', { position: [sd * 0.2, 0.17, 0.02], scale: [0.06, 0.12, 0.14], shell: true, outline: 0.012 })); // 방패를 끼우는 턱
      const sh = new THREE.Group();
      sh.position.set(0, 0.54, 0);
      sh.rotation.set(-0.16, 0, 0, 'YXZ');
      g.add(sh);
      sub(sh, GEO.cylinder, '#7d8791', { position: [0, 0, -0.03], scale: [0.4, 0.05, 0.4], rotation: [Math.PI / 2, 0, 0], outline: 0.02 }); // 쇠 테두리
      sub(sh, GEO.cylinder, '#c98f5a', { position: [0, 0, 0], scale: [0.35, 0.03, 0.35], rotation: [Math.PI / 2, 0, 0] }); // 나무 판
      [-0.12, 0.12].forEach((x) => sub(sh, GEO.box, '#a8703c', { position: [x, 0, 0.031], scale: [0.012, 0.62, 0.004] })); // 널 이음매
      sub(sh, GEO.sphere, GOLD, { position: [0, 0, 0.035], scale: [0.075, 0.075, 0.04], outline: 0.01 }); // 가운데 돌기
      const face = (i, build) => {
        const f = new THREE.Group(), a = Math.PI / 2 - (i / 5) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.215, Math.sin(a) * 0.215, 0.042);
        sh.add(f);
        build((geo, c, o) => sub(f, geo, c, o));
      };
      const eyes = (p, dx, y, c = INK, r = 0.012) => [-1, 1].forEach((sd) => p(GEO.dot, c, { position: [sd * dx, y, 0.019], scale: [r, r, 0.006] }));
      face(0, (p) => { // 큰 두더지: 갈색 얼굴, 분홍 코, 양옆에 치켜든 금빛 발톱
        p(GEO.sphere, '#8a6a58', { scale: [0.085, 0.08, 0.018], outline: 0.01 });
        p(GEO.dot, '#f3d9c4', { position: [0, -0.02, 0.014], scale: [0.04, 0.03, 0.008] });
        p(GEO.dot, '#f08aa0', { position: [0, -0.012, 0.021], scale: [0.016, 0.012, 0.006] });
        eyes(p, 0.035, 0.025);
        [-1, 1].forEach((sd) => [0, 1].forEach((k) => p(GEO.cone, GOLD, { position: [sd * (0.072 + k * 0.022), -0.075 + k * 0.012, 0.012], scale: [0.012, 0.045, 0.008], rotation: [0, 0, -sd * 0.3] })));
      });
      face(1, (p) => { // 나무 거인: 나무껍질 얼굴, 잎 머리, 노랗게 빛나는 눈, 옹이 입
        p(GEO.sphere, '#8a6a48', { scale: [0.075, 0.085, 0.018], outline: 0.01 });
        [[-0.05, 0.062], [0.05, 0.062], [0, 0.085]].forEach(([x, y]) => p(GEO.dot, '#5fae6a', { position: [x, y, 0.012], scale: [0.045, 0.035, 0.012] }));
        eyes(p, 0.03, 0.008, '#ffe36e', 0.014);
        p(GEO.dot, '#3a2a20', { position: [0, -0.04, 0.018], scale: [0.02, 0.014, 0.006] });
      });
      face(2, (p) => { // 큰 강 게: 주황빨강 등딱지, 위로 솟은 눈, 양옆 집게발
        p(GEO.sphere, '#e8643c', { scale: [0.09, 0.065, 0.018], outline: 0.01 });
        [-1, 1].forEach((sd) => {
          p(GEO.sphere, '#e8643c', { position: [sd * 0.1, 0.045, 0.006], scale: [0.036, 0.03, 0.012], outline: 0.008 });
          p(GEO.dot, WHITE, { position: [sd * 0.032, 0.066, 0.012], scale: [0.02, 0.02, 0.008] });
          p(GEO.dot, INK, { position: [sd * 0.032, 0.066, 0.02], scale: [0.009, 0.009, 0.004] });
        });
        p(GEO.dot, INK, { position: [0, -0.012, 0.019], scale: [0.02, 0.006, 0.005] });
      });
      face(3, (p) => { // 버섯 왕: 크림색 얼굴에 커다란 보라 갓, 흰 점, 작은 금빛 왕관
        p(GEO.sphere, '#fff4de', { position: [0, -0.025, 0], scale: [0.06, 0.06, 0.018], outline: 0.01 });
        p(GEO.sphere, '#9a6ad0', { position: [0, 0.035, 0.006], scale: [0.1, 0.06, 0.02], outline: 0.01 });
        [[-0.05, 0.04], [0.045, 0.048]].forEach(([x, y]) => p(GEO.dot, WHITE, { position: [x, y, 0.025], scale: [0.016, 0.012, 0.005] }));
        p(GEO.cone, GOLD, { position: [0, 0.085, 0.006], scale: [0.026, 0.04, 0.01] });
        eyes(p, 0.025, -0.025);
      });
      face(4, (p) => { // 아노코: 흰 털 얼굴 둘레에 털 뭉치, 주황 뿔 둘
        [0.2, 1.1, 2.04, 2.94].forEach((t) => p(GEO.dot, WHITE, { position: [Math.cos(t + Math.PI) * 0.072, Math.sin(t + Math.PI) * 0.068, -0.004], scale: [0.03, 0.03, 0.012], outline: 0.008 }));
        p(GEO.sphere, WHITE, { scale: [0.075, 0.07, 0.018], outline: 0.01 });
        [-1, 1].forEach((sd) => p(GEO.cone, '#f2a46a', { position: [sd * 0.035, 0.052, 0.008], scale: [0.016, 0.05, 0.01], rotation: [0, 0, -sd * 0.25] }));
        eyes(p, 0.03, 0.005);
        p(GEO.dot, INK, { position: [0, -0.02, 0.019], scale: [0.012, 0.006, 0.004] });
      });
      break;
    }
    case 'friendframe': {
      // 우정 사진 액자: 나무 이젤에 올린 커다란 액자. 사진(그림 한 장, friendPhotoTexture)에는 여섯 친구가 나란히 웃고 있다
      [-1, 1].forEach((sd) => m(GEO.box, '#a77d5a', { position: [sd * 0.3, 0.45, -0.04], scale: [0.045, 0.9, 0.045], rotation: [-0.14, 0, sd * 0.08], outline: 0.01 }));
      m(GEO.box, '#a77d5a', { position: [0, 0.42, -0.2], scale: [0.045, 0.86, 0.045], rotation: [0.32, 0, 0], outline: 0.01 }); // 뒤 다리
      m(GEO.box, '#8a5a34', { position: [0, 0.33, 0.05], scale: [0.8, 0.04, 0.14], shell: true, outline: 0.012 }); // 액자를 올리는 턱
      const fr = new THREE.Group();
      fr.position.set(0, 0.67, 0.02);
      fr.rotation.set(-0.14, 0, 0, 'YXZ');
      g.add(fr);
      sub(fr, GEO.box, '#c98f5a', { scale: [0.9, 0.62, 0.06], shell: true, outline: 0.02 });
      sub(fr, PIC_GEO, '#ffffff', { material: new THREE.MeshBasicMaterial({ map: friendPhotoTexture() }), position: [0, 0, 0.032], scale: [0.78, 0.5, 1] });
      // 액자 위 분홍 리본
      [-1, 1].forEach((sd) => sub(fr, GEO.sphere, '#ff9fbd', { position: [sd * 0.05, 0.33, 0.01], scale: [0.05, 0.035, 0.025], rotation: [0, 0, sd * 0.3], outline: 0.01 }));
      sub(fr, GEO.dot, '#e5788f', { position: [0, 0.33, 0.02], scale: [0.022, 0.022, 0.02] });
      break;
    }
    // ---------- 늘린 가구(게임 오리지널, core/home.js) ----------
    // 침대와 소파
    case 'futon':
      m(GEO.box, '#fff4de', { position: [0, 0.04, 0.03], scale: [0.86, 0.08, 0.92], shell: true, outline: 0.02, receive: true });
      m(GEO.box, '#a8c8f0', { position: [0, 0.1, 0.16], scale: [0.88, 0.05, 0.62], shell: true, outline: 0.02 });
      m(GEO.sphere, '#ffffff', { position: [0, 0.13, -0.3], scale: [0.24, 0.07, 0.13], outline: 0.02 });
      break;
    case 'sofa':
      m(GEO.box, '#f4a6b8', { position: [0, 0.2, 0.05], scale: [0.92, 0.3, 0.62], shell: true });
      m(GEO.box, '#f4a6b8', { position: [0, 0.5, -0.22], scale: [0.92, 0.46, 0.18], shell: true });
      [-0.42, 0.42].forEach((x) => m(GEO.box, '#e88ea4', { position: [x, 0.38, 0.05], scale: [0.12, 0.32, 0.64], shell: true, outline: 0.02 }));
      [-0.18, 0.18].forEach((x) => m(GEO.box, '#ffd0dc', { position: [x, 0.39, 0.08], scale: [0.34, 0.08, 0.46], shell: true, outline: 0.015 }));
      break;
    case 'hammock':
      [-0.44, 0.44].forEach((z) => m(GEO.cylinder, '#a77d5a', { position: [0, 0, z], scale: [0.045, 0.95, 0.045], outline: 0.015 }));
      m(GEO.sphere, '#f7d24a', { position: [0, 0.48, 0], scale: [0.2, 0.08, 0.42], outline: 0.02 });
      m(GEO.sphere, '#ffffff', { position: [0, 0.55, -0.26], scale: [0.13, 0.05, 0.08], outline: 0.015 });
      break;
    case 'bunkbed':
      [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].forEach(([x, z]) => m(GEO.cylinder, '#b98b62', { position: [x, 0, z], scale: [0.04, 1.25, 0.04], outline: 0.012 }));
      m(GEO.box, '#d8b48c', { position: [0, 0.16, 0], scale: [0.88, 0.12, 0.9], shell: true, outline: 0.02 });
      m(GEO.box, '#fff4de', { position: [0, 0.27, 0], scale: [0.82, 0.1, 0.84], shell: true, outline: 0.015 });
      m(GEO.box, '#a8c8f0', { position: [0, 0.34, 0.12], scale: [0.84, 0.05, 0.6], shell: true, outline: 0.015 });
      m(GEO.box, '#d8b48c', { position: [0, 0.8, 0], scale: [0.88, 0.12, 0.9], shell: true, outline: 0.02 });
      m(GEO.box, '#fff4de', { position: [0, 0.91, 0], scale: [0.82, 0.1, 0.84], shell: true, outline: 0.015 });
      m(GEO.box, '#ffb7cf', { position: [0, 0.98, 0.12], scale: [0.84, 0.05, 0.6], shell: true, outline: 0.015 });
      [0.3, 0.55].forEach((y) => m(GEO.box, '#a77d5a', { position: [0.47, y + 0.25, 0.3], scale: [0.03, 0.03, 0.2], outline: false }));
      break;
    case 'starbed':
      m(GEO.box, '#3d4a7a', { position: [0, 0.18, 0.05], scale: [0.92, 0.36, 0.95], shell: true });
      m(GEO.box, '#fff8e6', { position: [0, 0.4, 0.07], scale: [0.84, 0.12, 0.88], shell: true });
      m(GEO.box, '#6b7bd6', { position: [0, 0.47, 0.2], scale: [0.86, 0.07, 0.6], shell: true });
      [[-0.22, 0.28], [0.18, 0.1], [0.05, 0.36], [-0.05, 0.02]].forEach(([x, z]) => m(GEO.dot, '#fff1a0', { position: [x, 0.51, z], scale: [0.035, 0.02, 0.035], outline: false }));
      m(GEO.box, '#fcd95b', { position: [0, 0.6, -0.44], scale: [0.92, 0.85, 0.08], shell: true });
      m(GEO.sphere, '#fff1a0', { position: [0, 0.92, -0.38], scale: [0.12, 0.12, 0.04], outline: 0.015 });
      break;
    // 탁자와 의자
    case 'stool':
      m(GEO.cylinder, '#c49a6c', { position: [0, 0, 0], scale: [0.05, 0.34, 0.05], outline: 0.012 });
      m(GEO.cylinder, '#c49a6c', { position: [0, 0, 0], scale: [0.18, 0.03, 0.18], outline: 0.015 });
      m(GEO.cylinder, '#ffb7cf', { position: [0, 0.34, 0], scale: [0.22, 0.08, 0.22], outline: 0.02 });
      break;
    case 'chair':
      [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([x, z]) => m(GEO.cylinder, '#c49a6c', { position: [x, 0, z], scale: [0.03, 0.42, 0.03], outline: 0.01 }));
      m(GEO.box, '#e2b77f', { position: [0, 0.44, 0], scale: [0.44, 0.06, 0.44], shell: true, outline: 0.02 });
      m(GEO.box, '#e2b77f', { position: [0, 0.72, -0.2], scale: [0.44, 0.5, 0.05], shell: true, outline: 0.02 });
      break;
    case 'lowtable':
      [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]].forEach(([x, z]) => m(GEO.cylinder, '#a77d5a', { position: [x, 0, z], scale: [0.035, 0.26, 0.035], outline: 0.01 }));
      m(GEO.box, '#e2b77f', { position: [0, 0.29, 0], scale: [0.82, 0.06, 0.6], shell: true, outline: 0.02 });
      m(GEO.cylinder, '#ffffff', { position: [0.18, 0.32, 0.05], scale: [0.06, 0.07, 0.06], outline: 0.01 });
      m(GEO.sphere, '#f7a84a', { position: [-0.15, 0.36, -0.05], scale: [0.08, 0.06, 0.08], outline: 0.012 });
      break;
    case 'desk':
      [-0.4, 0.4].forEach((x) => m(GEO.box, '#c49a6c', { position: [x, 0.3, 0], scale: [0.06, 0.6, 0.5], shell: true, outline: 0.015 }));
      m(GEO.box, '#d8b48c', { position: [0, 0.63, 0], scale: [0.92, 0.06, 0.56], shell: true, outline: 0.02 });
      m(GEO.box, '#e2b77f', { position: [0.22, 0.5, 0], scale: [0.3, 0.16, 0.48], shell: true, outline: 0.015 });
      ['#7fa7d9', '#e0524f', '#8fd16a'].forEach((c, i) => m(GEO.box, c, { position: [-0.24, 0.69 + i * 0.05, -0.08], scale: [0.26, 0.045, 0.2], outline: 0.008 }));
      m(GEO.cylinder, '#f7d24a', { position: [0.25, 0.66, -0.12], scale: [0.05, 0.12, 0.05], outline: 0.01 });
      break;
    case 'teatable':
      m(GEO.cylinder, '#c49a6c', { position: [0, 0, 0], scale: [0.06, 0.48, 0.06], outline: 0.015 });
      m(GEO.cylinder, '#f6c6d2', { position: [0, 0.48, 0], scale: [0.42, 0.06, 0.42], outline: 0.02 });
      m(GEO.sphere, '#ffffff', { position: [0, 0.63, 0], scale: [0.11, 0.09, 0.11], outline: 0.015 });
      m(GEO.cone, '#ffffff', { position: [0.1, 0.6, 0], scale: [0.03, 0.12, 0.03], rotation: [0, 0, -0.9], outline: 0.008 });
      m(GEO.dot, '#e5788f', { position: [0, 0.73, 0], scale: [0.03, 0.03, 0.03], outline: false });
      [[-0.24, 0.12], [0.22, 0.18]].forEach(([x, z]) => m(GEO.cylinder, '#ffffff', { position: [x, 0.54, z], scale: [0.05, 0.06, 0.05], outline: 0.01 }));
      break;
    // 수납
    case 'chest':
      m(GEO.box, '#d8b48c', { position: [0, 0.36, -0.08], scale: [0.8, 0.72, 0.5], shell: true });
      [0.2, 0.44].forEach((y) => {
        m(GEO.box, '#c49a6c', { position: [0, y, 0.18], scale: [0.72, 0.18, 0.02], outline: false });
        m(GEO.dot, '#8f8174', { position: [0, y, 0.2], scale: [0.03, 0.03, 0.02], outline: false });
      });
      m(GEO.sphere, '#ffb7cf', { position: [0.22, 0.77, -0.1], scale: [0.08, 0.05, 0.08], outline: 0.012 });
      break;
    case 'toybox':
      m(GEO.box, '#7fa7d9', { position: [0, 0.24, 0], scale: [0.72, 0.48, 0.5], shell: true });
      m(GEO.box, '#5b86c4', { position: [0, 0.55, -0.2], scale: [0.74, 0.05, 0.3], rotation: [-0.9, 0, 0], shell: true, outline: 0.015 });
      m(GEO.sphere, '#e0524f', { position: [-0.16, 0.52, 0.06], scale: [0.11, 0.11, 0.11], outline: 0.015 });
      m(GEO.box, '#f7d24a', { position: [0.14, 0.52, 0.05], scale: [0.14, 0.14, 0.14], rotation: [0, 0.5, 0.3], shell: true, outline: 0.012 });
      m(GEO.sphere, '#8fd16a', { position: [0.02, 0.56, 0.12], scale: [0.07, 0.07, 0.07], outline: 0.012 });
      break;
    case 'bookcase':
      m(GEO.box, '#a77d5a', { position: [0, 0.72, -0.25], scale: [0.94, 1.44, 0.36], shell: true });
      [0.36, 0.76, 1.16].forEach((y, row) => {
        m(GEO.box, '#8a6446', { position: [0, y - 0.18, -0.07], scale: [0.86, 0.03, 0.02], outline: false });
        ['#e0524f', '#7fa7d9', '#f7d24a', '#8fd16a', '#ffb7cf', '#b59af0'].forEach((c, i) => {
          if ((i + row) % 5 === 4) return;
          m(GEO.box, c, { position: [-0.34 + i * 0.13, y, -0.12], scale: [0.09, 0.26, 0.17], outline: 0.008 });
        });
      });
      break;
    case 'cabinet':
      // 뒤판(하늘빛 유리 안쪽) 앞으로 선반을 내밀고 그 위에 반짝이를 늘어놓는다(몸통 안에 두면 가려 안 보인다)
      m(GEO.box, '#c49a6c', { position: [0, 0.62, -0.3], scale: [0.86, 1.24, 0.22], shell: true });
      m(GEO.box, '#dceefa', { position: [0, 0.72, -0.18], scale: [0.72, 0.92, 0.02], outline: false });
      [0.4, 0.8].forEach((y) => m(GEO.box, '#a77d5a', { position: [0, y, -0.06], scale: [0.78, 0.04, 0.26], shell: true, outline: 0.01 }));
      [['#fcd95b', -0.2, 0.5], ['#e0524f', 0.15, 0.5], ['#7fa7d9', -0.05, 0.9], ['#fff1a0', 0.22, 0.9]].forEach(([c, x, y]) => m(GEO.sphere, c, { position: [x, y, -0.04], scale: [0.07, 0.07, 0.07], outline: 0.01 }));
      m(GEO.box, '#a77d5a', { position: [0, 0.1, -0.08], scale: [0.86, 0.2, 0.3], shell: true, outline: 0.015 });
      break;
    // 조명
    case 'candle':
      m(GEO.cylinder, '#e8b86a', { position: [0, 0, 0], scale: [0.14, 0.05, 0.14], outline: 0.015 });
      m(GEO.cylinder, '#e8b86a', { position: [0, 0.05, 0], scale: [0.03, 0.4, 0.03], outline: 0.01 });
      [-0.12, 0, 0.12].forEach((x, i) => {
        m(GEO.cylinder, '#fffbe8', { position: [x, 0.44 + (i === 1 ? 0.06 : 0), 0], scale: [0.04, 0.16, 0.04], outline: 0.01 });
        m(GEO.dot, '#ffcf5a', { position: [x, 0.64 + (i === 1 ? 0.06 : 0), 0], scale: [0.03, 0.05, 0.03], outline: false });
      });
      m(GEO.box, '#e8b86a', { position: [0, 0.44, 0], scale: [0.28, 0.03, 0.04], outline: false });
      break;
    case 'paperlamp':
      m(GEO.cylinder, '#a77d5a', { position: [0, 0, 0], scale: [0.14, 0.05, 0.14], outline: 0.012 });
      m(GEO.cylinder, '#a77d5a', { position: [0, 0.05, 0], scale: [0.02, 0.22, 0.02], outline: false });
      m(GEO.sphere, '#fff3d6', { position: [0, 0.5, 0], scale: [0.24, 0.3, 0.24], outline: 0.02 });
      [0.38, 0.5, 0.62].forEach((y) => m(GEO.cylinder, '#e8c99a', { position: [0, y, 0], scale: [0.235 * Math.sqrt(1 - ((y - 0.5) / 0.3) ** 2) + 0.005, 0.01, 0.235 * Math.sqrt(1 - ((y - 0.5) / 0.3) ** 2) + 0.005], outline: false }));
      break;
    case 'shroomlamp':
      m(GEO.cylinder, '#fff4de', { position: [0, 0, 0], scale: [0.09, 0.48, 0.09], outline: 0.015 });
      m(GEO.sphere, '#e0524f', { position: [0, 0.5, 0], scale: [0.3, 0.17, 0.3], outline: 0.02 });
      [[0.12, 0.6, 0.1], [-0.14, 0.58, 0.05], [0.02, 0.63, -0.15], [-0.04, 0.66, 0.05]].forEach(([x, y, z]) => m(GEO.dot, '#ffffff', { position: [x, y, z], scale: [0.04, 0.02, 0.04], outline: false }));
      break;
    case 'starlamp':
      m(GEO.cylinder, '#4a5585', { position: [0, 0, 0], scale: [0.15, 0.06, 0.15], outline: 0.015 });
      m(GEO.cylinder, '#4a5585', { position: [0, 0.06, 0], scale: [0.025, 0.3, 0.025], outline: false });
      m(GEO.sphere, '#fcd95b', { position: [0, 0.56, 0], scale: [0.12, 0.12, 0.06], outline: 0.015 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        m(GEO.cone, '#fcd95b', { position: [Math.sin(a) * 0.08, 0.56 + Math.cos(a) * 0.08, 0], scale: [0.07, 0.16, 0.05], rotation: [0, 0, -a], outline: 0.012 });
      }
      break;
    // 부엌
    case 'ramenpot':
      m(GEO.box, '#c49a6c', { position: [0, 0.3, -0.05], scale: [0.66, 0.6, 0.46], shell: true });
      m(GEO.cylinder, '#d9645a', { position: [-0.12, 0.6, -0.05], scale: [0.18, 0.2, 0.18], outline: 0.02 });
      m(GEO.sphere, '#8f8174', { position: [-0.12, 0.81, -0.05], scale: [0.17, 0.04, 0.17], outline: 0.012 });
      [0, 1, 2].forEach((i) => m(GEO.cylinder, '#ffffff', { position: [0.2, 0.6 + i * 0.05, 0.02], scale: [0.11, 0.045, 0.11], outline: 0.008 }));
      break;
    case 'sink':
      m(GEO.box, '#dceefa', { position: [0, 0.38, -0.05], scale: [0.86, 0.76, 0.55], shell: true });
      m(GEO.box, '#eceff1', { position: [0, 0.78, -0.05], scale: [0.92, 0.05, 0.6], shell: true, outline: 0.015 });
      m(GEO.box, '#b0bec5', { position: [0, 0.8, -0.02], scale: [0.42, 0.03, 0.3], outline: false });
      m(GEO.cylinder, '#9aa5a8', { position: [0, 0.8, -0.24], scale: [0.03, 0.22, 0.03], outline: 0.008 });
      m(GEO.box, '#9aa5a8', { position: [0, 1.01, -0.16], scale: [0.04, 0.03, 0.18], outline: 0.008 });
      [-0.2, 0.2].forEach((x) => m(GEO.dot, '#8f8174', { position: [x, 0.5, 0.23], scale: [0.03, 0.03, 0.02], outline: false }));
      break;
    case 'fridge':
      m(GEO.box, '#f0f4f7', { position: [0, 0.62, -0.08], scale: [0.62, 1.24, 0.56], shell: true });
      m(GEO.box, '#cfd8dc', { position: [0, 0.82, 0.2], scale: [0.58, 0.02, 0.01], outline: false });
      [1.02, 0.52].forEach((y) => m(GEO.box, '#8f8174', { position: [0.22, y, 0.21], scale: [0.03, 0.18, 0.03], outline: false }));
      [['#ffb7cf', -0.14, 1.05], ['#8fd16a', -0.05, 0.98], ['#f7d24a', -0.18, 0.6]].forEach(([c, x, y]) => m(GEO.dot, c, { position: [x, y, 0.21], scale: [0.04, 0.04, 0.015], outline: false }));
      break;
    case 'oven':
      m(GEO.box, '#c9775a', { position: [0, 0.38, -0.05], scale: [0.76, 0.76, 0.6], shell: true });
      m(GEO.sphere, '#c9775a', { position: [0, 0.76, -0.05], scale: [0.36, 0.26, 0.3], outline: 0.02 });
      m(GEO.box, '#3a3236', { position: [0, 0.4, 0.25], scale: [0.38, 0.26, 0.02], outline: false });
      m(GEO.sphere, '#f7a84a', { position: [0, 0.34, 0.2], scale: [0.12, 0.06, 0.04], outline: false });
      m(GEO.cylinder, '#8f8174', { position: [0.18, 0.95, -0.12], scale: [0.06, 0.25, 0.06], outline: 0.012 });
      break;
    // 식물
    case 'cactus':
      m(GEO.cylinder, '#d8a47f', { position: [0, 0, 0], scale: [0.15, 0.22, 0.15], outline: 0.015 });
      m(GEO.sphere, '#6cb87a', { position: [0, 0.44, 0], scale: [0.11, 0.24, 0.11], outline: 0.015 });
      m(GEO.sphere, '#6cb87a', { position: [0.13, 0.46, 0], scale: [0.05, 0.1, 0.05], outline: 0.01 });
      m(GEO.dot, '#ff8fb0', { position: [0, 0.69, 0], scale: [0.05, 0.03, 0.05], outline: false });
      break;
    case 'sunflower':
      m(GEO.cylinder, '#c9775a', { position: [0, 0, 0], scale: [0.16, 0.24, 0.16], outline: 0.015 });
      m(GEO.cylinder, '#5fae6a', { position: [0, 0.24, 0], scale: [0.02, 0.6, 0.02], outline: false });
      [-1, 1].forEach((s) => m(GEO.sphere, '#6cc77e', { position: [s * 0.08, 0.5, 0], scale: [0.08, 0.03, 0.05], rotation: [0, 0, s * 0.4], outline: 0.01 }));
      m(GEO.sphere, '#f7d24a', { position: [0, 0.88, 0.03], scale: [0.17, 0.17, 0.04], outline: 0.015 });
      m(GEO.sphere, '#8a5a34', { position: [0, 0.88, 0.06], scale: [0.07, 0.07, 0.03], outline: false });
      break;
    case 'bonsai':
      m(GEO.box, '#5b86c4', { position: [0, 0.06, 0], scale: [0.6, 0.12, 0.4], shell: true, outline: 0.015 });
      m(GEO.cylinder, '#8a5a34', { position: [-0.05, 0.12, 0], scale: [0.04, 0.32, 0.04], rotation: [0, 0, 0.35], outline: 0.01 });
      [[-0.18, 0.42, 0, 0.13], [0.05, 0.48, 0.02, 0.15], [0.2, 0.4, -0.02, 0.1]].forEach(([x, y, z, r]) => m(GEO.sphere, '#4f9a5c', { position: [x, y, z], scale: [r, r * 0.65, r], outline: 0.015 }));
      break;
    case 'tree':
      m(GEO.cylinder, '#d8a47f', { position: [0, 0, 0], scale: [0.26, 0.3, 0.26], outline: 0.02 });
      m(GEO.cylinder, '#a77d5a', { position: [0, 0.3, 0], scale: [0.07, 0.6, 0.07], outline: 0.012 });
      [[0, 1.1, 0, 0.36], [-0.2, 0.95, 0.05, 0.24], [0.22, 0.98, -0.04, 0.24]].forEach(([x, y, z, r]) => m(GEO.sphere, '#6cc77e', { position: [x, y, z], scale: [r, r, r], outline: 0.02 }));
      [[0.12, 1.02, 0.28], [-0.18, 1.16, 0.22], [0.28, 0.9, 0.12], [-0.3, 0.9, 0.12]].forEach(([x, y, z]) => m(GEO.dot, '#e0524f', { position: [x, y, z], scale: [0.05, 0.05, 0.05], outline: false }));
      break;
    // 깔개와 방석
    case 'squarerug':
      m(GEO.box, '#f6c6d2', { position: [0, 0.01, 0], scale: [0.96, 0.02, 0.96], outline: 0.015, shell: true, receive: true });
      m(GEO.box, '#fff4de', { position: [0, 0.016, 0], scale: [0.62, 0.02, 0.62], outline: false, receive: true });
      break;
    case 'beanbag':
      m(GEO.sphere, '#9fd3c7', { position: [0, 0.22, 0], scale: [0.42, 0.24, 0.42], outline: 0.025 });
      m(GEO.sphere, '#86c2b4', { position: [0, 0.38, -0.1], scale: [0.3, 0.14, 0.24], outline: 0.02 });
      break;
    // 장식
    case 'radio':
      m(GEO.box, '#c49a6c', { position: [0, 0.12, 0], scale: [0.56, 0.24, 0.32], shell: true, outline: 0.015 });
      m(GEO.box, '#e0524f', { position: [0, 0.38, 0], scale: [0.5, 0.28, 0.24], shell: true });
      m(GEO.cylinder, '#3a3236', { position: [-0.1, 0.38, 0.12], scale: [0.09, 0.02, 0.09], rotation: [Math.PI / 2, 0, 0], outline: false });
      [0.1, 0.18].forEach((x) => m(GEO.dot, '#fff4de', { position: [x, 0.38, 0.13], scale: [0.03, 0.03, 0.02], outline: false }));
      m(GEO.cylinder, '#8f8174', { position: [0.18, 0.52, -0.05], scale: [0.008, 0.3, 0.008], rotation: [0, 0, -0.4], outline: false });
      break;
    case 'easel':
      [-0.18, 0.18].forEach((x) => m(GEO.box, '#a77d5a', { position: [x, 0.5, 0], scale: [0.04, 1.0, 0.04], rotation: [-0.15, 0, x > 0 ? -0.12 : 0.12], outline: 0.01 }));
      m(GEO.box, '#a77d5a', { position: [0, 0.48, -0.16], scale: [0.04, 0.95, 0.04], rotation: [0.3, 0, 0], outline: 0.01 });
      m(GEO.box, '#ffffff', { position: [0, 0.74, 0.05], scale: [0.5, 0.52, 0.03], rotation: [-0.15, 0, 0], shell: true, outline: 0.015 });
      [['#7fa7d9', 0, 0.84], ['#6cc77e', -0.1, 0.66], ['#ffb7cf', 0.12, 0.7]].forEach(([c, x, y]) => m(GEO.sphere, c, { position: [x, y, 0.08], scale: [0.11, 0.06, 0.015], outline: false }));
      break;
    case 'globe':
      m(GEO.cylinder, '#8a5a34', { position: [0, 0, 0], scale: [0.13, 0.04, 0.13], outline: 0.012 });
      m(GEO.cylinder, '#8a5a34', { position: [0, 0.04, 0], scale: [0.025, 0.3, 0.025], outline: false });
      m(GEO.sphere, '#7fa7d9', { position: [0, 0.55, 0], scale: [0.2, 0.2, 0.2], outline: 0.015 });
      [[0.08, 0.62, 0.15], [-0.12, 0.5, 0.12], [0.1, 0.45, -0.14], [-0.05, 0.68, -0.13]].forEach(([x, y, z]) => m(GEO.sphere, '#6cc77e', { position: [x, y, z], scale: [0.07, 0.05, 0.05], outline: false }));
      break;
    case 'clock':
      m(GEO.box, '#8a5a34', { position: [0, 0.7, -0.22], scale: [0.44, 1.4, 0.3], shell: true });
      m(GEO.cylinder, '#fff8e6', { position: [0, 1.12, -0.06], scale: [0.15, 0.02, 0.15], rotation: [Math.PI / 2, 0, 0], outline: 0.012 });
      m(GEO.box, '#3a3236', { position: [0, 1.15, -0.04], scale: [0.015, 0.09, 0.01], outline: false });
      m(GEO.box, '#3a3236', { position: [0.03, 1.12, -0.04], scale: [0.07, 0.015, 0.01], outline: false });
      m(GEO.box, '#5a3c26', { position: [0, 0.55, -0.06], scale: [0.26, 0.5, 0.02], outline: false });
      m(GEO.sphere, '#fcd95b', { position: [0, 0.42, -0.04], scale: [0.06, 0.06, 0.02], outline: 0.01 });
      break;
    case 'fishtank':
      m(GEO.box, '#a77d5a', { position: [0, 0.25, -0.05], scale: [0.82, 0.5, 0.46], shell: true });
      m(GEO.box, '#bfe6f5', { position: [0, 0.72, -0.05], scale: [0.78, 0.44, 0.42], shell: true, outline: 0.015 });
      m(GEO.box, '#e8d4a8', { position: [0, 0.52, -0.05], scale: [0.74, 0.04, 0.38], outline: false });
      [['#f2884a', -0.15, 0.74], ['#fcd95b', 0.18, 0.66]].forEach(([c, x, y]) => {
        m(GEO.sphere, c, { position: [x, y, 0.1], scale: [0.07, 0.045, 0.03], outline: 0.008 });
        m(GEO.cone, c, { position: [x - 0.06, y, 0.1], scale: [0.03, 0.06, 0.02], rotation: [0, 0, Math.PI / 2], outline: false });
      });
      m(GEO.sphere, '#5fae6a', { position: [0.28, 0.62, -0.1], scale: [0.04, 0.1, 0.04], outline: false });
      break;
    case 'trophy':
      m(GEO.box, '#8a5a34', { position: [0, 0.12, 0], scale: [0.4, 0.24, 0.4], shell: true });
      m(GEO.cylinder, '#fcd95b', { position: [0, 0.24, 0], scale: [0.05, 0.22, 0.05], outline: 0.01 });
      m(GEO.sphere, '#fcd95b', { position: [0, 0.6, 0], scale: [0.19, 0.17, 0.19], outline: 0.015 });
      [-1, 1].forEach((s) => m(GEO.sphere, '#fcd95b', { position: [s * 0.2, 0.62, 0], scale: [0.06, 0.08, 0.03], outline: 0.01 }));
      m(GEO.dot, '#fff1a0', { position: [0, 0.6, 0.18], scale: [0.05, 0.05, 0.02], outline: false });
      break;
    case 'piano':
      m(GEO.box, '#3a3236', { position: [0, 0.45, -0.18], scale: [0.95, 0.9, 0.44], shell: true });
      m(GEO.box, '#3a3236', { position: [0, 0.58, 0.08], scale: [0.95, 0.06, 0.16], shell: true, outline: 0.015 });
      m(GEO.box, '#ffffff', { position: [0, 0.63, 0.1], scale: [0.86, 0.03, 0.12], outline: false });
      for (let i = 0; i < 6; i++) m(GEO.box, '#1e1a1d', { position: [-0.33 + i * 0.13, 0.655, 0.07], scale: [0.05, 0.02, 0.07], outline: false });
      m(GEO.box, '#ffffff', { position: [0, 0.9, -0.02], scale: [0.36, 0.22, 0.02], rotation: [-0.2, 0, 0], outline: 0.01 });
      break;
    case 'fountain':
      m(GEO.cylinder, '#eceff1', { position: [0, 0, 0], scale: [0.46, 0.2, 0.46], outline: 0.02 });
      m(GEO.cylinder, '#9fd4f2', { position: [0, 0.18, 0], scale: [0.4, 0.03, 0.4], outline: false });
      m(GEO.cylinder, '#eceff1', { position: [0, 0.2, 0], scale: [0.07, 0.52, 0.07], outline: 0.012 });
      m(GEO.sphere, '#eceff1', { position: [0, 0.72, 0], scale: [0.22, 0.06, 0.22], outline: 0.015 });
      m(GEO.sphere, '#bfe6f5', { position: [0, 0.78, 0], scale: [0.06, 0.12, 0.06], outline: false });
      [0, 1, 2, 3].forEach((i) => { const a = (i / 4) * Math.PI * 2; m(GEO.dot, '#bfe6f5', { position: [Math.sin(a) * 0.24, 0.5, Math.cos(a) * 0.24], scale: [0.03, 0.08, 0.03], outline: false }); });
      break;
    default:
      break;
  }
  return g;
}

/**
 * 돔(타원 반구: 반지름 R, 높이 H) 안쪽 벽면에 창 · 액자를 붙인다. a: 방위각(0 이 뒤쪽 −z, + 는 오른쪽), y: 높이,
 * inset: 벽에서 안쪽으로 띄우는 거리. 높이에 따라 벽이 안으로 좁아지므로 그만큼 당기고, 벽 기울기만큼 위를 안쪽으로 눕힌다.
 */
export function placeOnDome(obj, R, H, a, y, inset = 0.1) {
  const r = R * Math.sqrt(Math.max(0, 1 - (y * y) / (H * H))) - inset;
  const x = Math.sin(a) * r, z = -Math.cos(a) * r;
  obj.position.set(x, y, z);
  obj.rotation.set(Math.atan2(y / (H * H), (r + inset) / (R * R)), Math.atan2(-x, -z), 0, 'YXZ');
  return obj;
}

/** 집 안 장면. 밖 마을과 따로 그린다. */
export function createInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3e2c8');
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c4a5, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
  sun.position.set(2, 7, 5);
  scene.add(sun);

  // 방(바닥 · 돔 벽 · 창 · 문간 깔개 · 칸 표시 · 옷장 · 보관 상자): 집 크기가 바뀌면 buildRoom 이 다시 짓는다.
  // 벽지 · 바닥(core/home.js)은 재질 색만 바꾼다
  const roomG = new THREE.Group();
  scene.add(roomG);
  const floorMat = toonMaterial(FLOORS.wood.color, { unique: true });
  const wallMat = toonMaterial(WALLPAPERS.cream.color, { unique: true });
  wallMat.side = THREE.BackSide; // 앞쪽 벽은 보이지 않게 안쪽 면만 그린다
  const wallFlat = toonMaterial(WALLPAPERS.cream.color, { unique: true }); // 넓힌 집(네모난 방)의 벽: 같은 벽지 색
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c }); // 불빛(벽난로 불 · 촛불)은 빛을 받지 않고 늘 밝게
  const WALL_GEO = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const ARCH_TOP = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2); // 아치 창 위쪽 반원
  // 칸 표시(꾸미기 중에만): 칸마다 얇은 판
  const tileGeo = new THREE.PlaneGeometry(CELL * 0.92, CELL * 0.92).rotateX(-Math.PI / 2);
  const tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const hotMat = new THREE.MeshBasicMaterial({ color: 0xff8fb0, transparent: true, opacity: 0.55, depthWrite: false });
  let room = roomLayout(0), tiles = [];

  const furniture = new THREE.Group();
  scene.add(furniture);
  const models = new Map(); // 'cx,cz' → 놓인 가구 모델(끌 때 움직인다)
  const cellOf = new Map(); // 모델 → 칸 { cx, cz }(가구를 눌렀을 때 어느 칸인지)
  let ghostModel = null, ghostId = null; // 목록에서 끌어 오는 가구 미리보기
  let me = null;
  // 집 안을 걷는 내 캐릭터: 자리 · 바라보는 방향 · 걸음
  const pos = { x: room.DOOR.x, z: room.DOOR.z - 0.5 };
  let yaw = Math.PI, phase = 0, moving = false;
  let mePose = null; // 잠깐 하는 몸짓(먹기) { mode, t, dur, prop }
  let lastHome = null; // 마지막으로 그린 집(집주인이 설 빈자리를 찾을 때)
  let host = null, hostAt = null; // 집주인: 몸이 바뀐 동안(사이드스토리 '몸이 바뀌었다') 내 집에 사는 우사기(내 몸) — 손님으로 들어오면 방 안에 서 있다

  /** 그 크기(core/home.js HOME_SIZES 번호)의 방을 짓는다. 카메라도 방 크기만큼 물러선다. */
  function buildRoom(size) {
    roomG.clear();
    room = { ...roomLayout(size), shape: roomShape(size) };
    const { R, S, cols, rows, DOOR, WARDROBE, CHEST } = room, rect = room.shape.kind === 'rect';
    if (rect) buildRect(room);
    else {
      roomG.add(toonMesh(GEO.cylinder, null, { material: floorMat, position: [0, -0.1, 0], scale: [R, 0.1, R], outline: 0.04, receive: true }));
      roomG.add(toonMesh(WALL_GEO, null, { material: wallMat, scale: [R, R * 0.9, R], outline: false }));
      // 안쪽 벽의 십자 창(돔 벽면에 딱 붙게)
      const win = new THREE.Group();
      placeOnDome(win, R, R * 0.9, -0.45, 2.1);
      win.add(toonMesh(GEO.box, '#c6e7f5', { scale: [0.9, 0.9, 0.05], shell: true, outline: 0.03 }));
      win.add(toonMesh(GEO.box, '#3a3236', { position: [0, 0, 0.03], scale: [0.06, 0.86, 0.03], outline: false }));
      win.add(toonMesh(GEO.box, '#3a3236', { position: [0, 0, 0.03], scale: [0.86, 0.06, 0.03], outline: false }));
      roomG.add(win);
      // 문간 깔개(앞쪽)
      roomG.add(toonMesh(GEO.box, '#e7a3b0', { position: [0, 0.01, DOOR.z - 0.15], scale: [1.2, 0.02, 0.6], outline: 0.02, receive: true }));
    }
    tiles = [];
    for (let cz = 0; cz < rows; cz++) {
      for (let cx = 0; cx < cols; cx++) {
        const c = cellCenter(cx, cz, size), t = new THREE.Mesh(tileGeo, tileMat);
        t.position.set(c.x, 0.02, c.z);
        t.visible = false;
        t.userData = { cx, cz };
        roomG.add(t);
        tiles.push(t);
      }
    }
    addWardrobe(WARDROBE, rect);
    addChest(CHEST, rect);
    camera.position.set(0, 7.4 * S, 8.6 * S);
    camera.lookAt(0, 0.6, -0.5 * S);
  }
  /**
   * 넓힌 집의 네모난 방(core/home.js roomShape): 바닥 · 뒤 · 좌우 벽(앞은 트여 들여다본다) · 걸레받이.
   * 평범한 집(넓은 방): 커튼 단 창 둘 · 사이에 풍경화 · 상자 위 선반과 화분 · 분홍 문간 깔개.
   * 화려한 집(큰 방): 나무 징두리 판벽과 금빛 몰딩 · 벽기둥 · 붉은 커튼을 단 아치 창 · 가운데 벽난로(불꽃 · 촛대 · 금테 그림) · 샹들리에 ·
   * 금빛 바닥 테두리 · 문에서 들어오는 붉은 깔개 · 구석 화분 · 옆벽 그림.
   */
  function buildRect(room) {
    const { hx, z0, z1, fancy } = room.shape, H = fancy ? 3.0 : 2.6, w = hx * 2, d = z1 - z0, mz = (z0 + z1) / 2;
    const add = (geo, c, o) => { const m = toonMesh(geo, c, o); roomG.add(m); return m; };
    roomG.add(toonMesh(GEO.box, null, { material: floorMat, position: [0, -0.1, mz], scale: [w + 0.4, 0.2, d + 0.2], outline: 0.04, receive: true }));
    const wall = (x, z, sx, sz) => roomG.add(toonMesh(GEO.box, null, { material: wallFlat, position: [x, H / 2, z], scale: [sx, H, sz], outline: 0.03, receive: true }));
    wall(0, z0 - 0.1, w + 0.4, 0.2);
    [-1, 1].forEach((sd) => wall(sd * (hx + 0.1), mz, 0.2, d + 0.2));
    // 벽을 따라 붙이는 띠(걸레받이 · 판벽 · 몰딩): 뒤 벽과 좌우 벽 세 군데에 같은 높이로
    const band = (c, y, h, t, o = {}) => {
      add(GEO.box, c, { position: [0, y, z0 + t / 2], scale: [w, h, t], outline: 0.012, shadow: false, ...o });
      [-1, 1].forEach((sd) => add(GEO.box, c, { position: [sd * (hx - t / 2), y, mz], scale: [t, h, d], outline: 0.012, shadow: false, ...o }));
    };
    band(fancy ? '#7a4f30' : '#a87b4c', 0.07, 0.14, 0.05);
    // 창(뒤 벽): 흰 틀 · 유리 · 창살, arch 면 위가 둥근 창
    const win = (x, y, ww, wh, arch) => {
      add(GEO.box, '#ffffff', { position: [x, y, z0 + 0.03], scale: [ww + 0.14, wh + 0.14, 0.05], shell: true, outline: 0.02 });
      add(GEO.box, '#c6e7f5', { position: [x, y, z0 + 0.06], scale: [ww, wh, 0.03], outline: false });
      add(GEO.box, '#5a4431', { position: [x, y, z0 + 0.08], scale: [0.04, wh, 0.015], outline: false, shadow: false });
      add(GEO.box, '#5a4431', { position: [x, y, z0 + 0.08], scale: [ww, 0.04, 0.015], outline: false, shadow: false });
      if (arch) {
        add(ARCH_TOP, '#ffffff', { position: [x, y + wh / 2, z0 + 0.03], scale: [ww / 2 + 0.07, ww / 2 + 0.07, 0.05], outline: 0.02 });
        add(ARCH_TOP, '#c6e7f5', { position: [x, y + wh / 2, z0 + 0.06], scale: [ww / 2, ww / 2, 0.03], outline: false });
      }
    };
    // 액자(벽에 붙인다): 테 색 · 그림 색 · 해(동그라미)
    const frame = (x, y, z, rotY, fw, fh, edge, art) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      g.add(toonMesh(GEO.box, edge, { scale: [fw, fh, 0.05], shell: true, outline: 0.015 }));
      g.add(toonMesh(GEO.box, art, { position: [0, 0, 0.03], scale: [fw - 0.12, fh - 0.12, 0.01], outline: false, shadow: false }));
      g.add(toonMesh(GEO.box, '#7cc46a', { position: [0, -fh * 0.22, 0.036], scale: [fw - 0.12, fh * 0.2, 0.01], outline: false, shadow: false }));
      g.add(toonMesh(GEO.dot, '#ffe36e', { position: [fw * 0.22, fh * 0.15, 0.04], scale: [0.06, 0.06, 0.01], outline: false, shadow: false }));
      roomG.add(g);
    };
    if (!fancy) {
      // 평범한 집: 커튼 단 창 둘, 사이에 풍경화, 오른쪽 벽 상자 위 선반과 화분, 문간 깔개
      for (const x of [-hx * 0.48, hx * 0.48]) {
        win(x, 1.5, 0.9, 0.9, false);
        add(GEO.box, '#8a5a3c', { position: [x, 2.1, z0 + 0.1], scale: [1.5, 0.05, 0.05], outline: false, shadow: false });
        [-1, 1].forEach((sd) => add(GEO.box, '#f4a6b8', { position: [x + sd * 0.62, 1.45, z0 + 0.12], scale: [0.26, 1.2, 0.05], shell: true, outline: 0.015, shadow: false }));
      }
      frame(0, 1.65, z0 + 0.04, 0, 0.7, 0.5, '#c99a6a', '#bfe3f0');
      const sx = hx - 0.08;
      add(GEO.box, '#a87b4c', { position: [sx - 0.12, 1.45, room.CHEST.z], scale: [0.24, 0.05, 0.9], outline: 0.012 });
      add(GEO.cylinder, '#d98a5a', { position: [sx - 0.14, 1.475, room.CHEST.z - 0.2], scale: [0.09, 0.14, 0.09], outline: 0.012 });
      add(GEO.sphere, '#7cc46a', { position: [sx - 0.14, 1.7, room.CHEST.z - 0.2], scale: [0.14, 0.12, 0.14], outline: 0.012 });
      frame(-hx + 0.03, 1.75, room.WARDROBE.z + 1.2, Math.PI / 2, 0.5, 0.4, '#c99a6a', '#f6d6e0');
      add(GEO.box, '#e7a3b0', { position: [0, 0.01, room.DOOR.z - 0.15], scale: [1.2, 0.02, 0.6], outline: 0.02, receive: true });
      return;
    }
    // ---------- 화려한 집 ----------
    band('#9a6a46', 0.55, 1.0, 0.04); // 징두리 판벽
    band('#e8c26a', 1.06, 0.06, 0.07); // 판벽 위 금빛 띠
    band('#e8c26a', H - 0.08, 0.12, 0.08); // 천장 밑 몰딩
    // 벽기둥 넷(뒤 벽): 크림색 기둥에 금빛 머리
    for (const x of [-hx + 0.35, -1.45, 1.45, hx - 0.35]) {
      add(GEO.box, '#fff8ec', { position: [x, H / 2, z0 + 0.06], scale: [0.24, H, 0.1], shell: true, outline: 0.015 });
      add(GEO.box, '#e8c26a', { position: [x, H - 0.25, z0 + 0.1], scale: [0.32, 0.14, 0.12], outline: 0.012, shadow: false });
    }
    // 아치 창 둘과 붉은 커튼 · 금빛 커튼 걸이
    const wx = (hx - 0.35 + 1.45) / 2;
    for (const x of [-wx, wx]) {
      win(x, 1.55, 0.8, 1.2, true);
      add(GEO.box, '#e8c26a', { position: [x, 2.65, z0 + 0.12], scale: [1.6, 0.05, 0.05], outline: false, shadow: false });
      [-1, 1].forEach((sd) => {
        add(GEO.box, '#b8343f', { position: [x + sd * 0.62, 1.55, z0 + 0.14], scale: [0.3, 2.2, 0.06], shell: true, outline: 0.015, shadow: false });
        add(GEO.box, '#e8c26a', { position: [x + sd * 0.62, 1.2, z0 + 0.18], scale: [0.32, 0.06, 0.04], outline: false, shadow: false });
      });
    }
    // 벽난로: 돌 테두리 · 검은 아궁이 · 불꽃 · 나무 선반 · 금빛 촛대 둘 · 위에 금테 그림
    const fzz = z0 + 0.18;
    add(GEO.box, '#efe6d8', { position: [0, 0.6, fzz], scale: [1.7, 1.2, 0.36], shell: true, outline: 0.025 });
    add(GEO.box, '#3a2a28', { position: [0, 0.42, fzz + 0.12], scale: [0.95, 0.72, 0.16], outline: false });
    roomG.add(toonMesh(GEO.cone, null, { material: glow('#ff8a3a'), position: [-0.12, 0.08, fzz + 0.15], scale: [0.2, 0.42, 0.12], outline: false, shadow: false }));
    roomG.add(toonMesh(GEO.cone, null, { material: glow('#ffc04a'), position: [0.14, 0.08, fzz + 0.16], scale: [0.16, 0.32, 0.1], outline: false, shadow: false }));
    add(GEO.box, '#5a3b28', { position: [0, 0.1, fzz + 0.16], rotation: [0, 0.3, 0], scale: [0.6, 0.08, 0.1], outline: false, shadow: false });
    add(GEO.box, '#8a5a3c', { position: [0, 1.25, fzz + 0.04], scale: [1.95, 0.1, 0.46], shell: true, outline: 0.02 });
    for (const x of [-0.7, 0.7]) {
      add(GEO.cylinder, '#e8c26a', { position: [x, 1.3, fzz + 0.06], scale: [0.05, 0.22, 0.05], outline: 0.01, shadow: false });
      add(GEO.cylinder, '#fffaf0', { position: [x, 1.52, fzz + 0.06], scale: [0.03, 0.12, 0.03], outline: false, shadow: false });
      roomG.add(toonMesh(GEO.dot, null, { material: glow('#ffd36a'), position: [x, 1.68, fzz + 0.06], scale: [0.03, 0.05, 0.03], outline: false, shadow: false }));
    }
    frame(0, 2.05, z0 + 0.04, 0, 1.1, 0.75, '#e8c26a', '#a9c8e8');
    // 옆벽 그림(왼쪽은 옷장 위 뒤쪽 · 오른쪽은 둘)
    frame(-hx + 0.03, 1.8, room.WARDROBE.z + 1.5, Math.PI / 2, 0.7, 0.5, '#e8c26a', '#f6d6e0');
    frame(hx - 0.03, 1.8, room.CHEST.z + 1.4, -Math.PI / 2, 0.7, 0.5, '#e8c26a', '#d8e8c0');
    frame(hx - 0.03, 1.9, room.CHEST.z - 1.6, -Math.PI / 2, 0.5, 0.6, '#e8c26a', '#f2d6b0');
    // 뒤 구석 화분(잎 넓은 나무)
    for (const sd of [-1, 1]) {
      const x = sd * (hx - 0.45), z = z0 + 0.42;
      add(GEO.cylinder, '#e9e2d4', { position: [x, 0, z], scale: [0.22, 0.4, 0.22], outline: 0.015 });
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; add(GEO.sphere, '#5f9e5a', { position: [x + Math.sin(a) * 0.16, 0.75 + (k % 2) * 0.12, z + Math.cos(a) * 0.16], scale: [0.22, 0.12, 0.22], outline: 0.012, shadow: false }); }
    }
    // 바닥 금빛 테두리 · 문에서 들어오는 붉은 깔개(금 가장자리)
    const ib = 0.3, iw = w - ib * 2, id = d - ib * 2;
    for (const [x, z, sx, sz] of [[0, z0 + ib, iw, 0.06], [0, z1 - ib, iw, 0.06], [-hx + ib, mz, 0.06, id], [hx - ib, mz, 0.06, id]]) add(GEO.box, '#e8c26a', { position: [x, 0.006, z], scale: [sx, 0.012, sz], outline: false, shadow: false, receive: true });
    const rz0 = room.Z0 + room.rows * CELL + 0.05, rz1 = z1 - 0.1;
    add(GEO.box, '#b8343f', { position: [0, 0.012, (rz0 + rz1) / 2], scale: [1.3, 0.02, rz1 - rz0], outline: 0.015, receive: true });
    [-1, 1].forEach((sd) => add(GEO.box, '#e8c26a', { position: [sd * 0.6, 0.024, (rz0 + rz1) / 2], scale: [0.06, 0.01, rz1 - rz0], outline: false, shadow: false }));
    // 샹들리에(뒤쪽 위): 금빛 고리 · 촛불 여섯 · 유리 방울, 천장까지 사슬
    const cg = new THREE.Group();
    cg.position.set(0, H - 0.75, z0 + d * 0.33);
    cg.add(toonMesh(new THREE.TorusGeometry(0.5, 0.035, 8, 28).rotateX(Math.PI / 2), '#e8c26a', { outline: 0.01, shadow: false }));
    cg.add(toonMesh(GEO.cylinder, '#e8c26a', { position: [0, 0, 0], scale: [0.015, 0.75, 0.015], outline: false, shadow: false }));
    cg.add(toonMesh(GEO.sphere, '#e8c26a', { position: [0, -0.05, 0], scale: [0.1, 0.12, 0.1], outline: 0.01, shadow: false }));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2, x = Math.sin(a) * 0.5, z = Math.cos(a) * 0.5;
      cg.add(toonMesh(GEO.cylinder, '#fffaf0', { position: [x, 0.02, z], scale: [0.025, 0.12, 0.025], outline: false, shadow: false }));
      cg.add(toonMesh(GEO.dot, null, { material: glow('#ffd36a'), position: [x, 0.17, z], scale: [0.025, 0.04, 0.025], outline: false, shadow: false }));
      cg.add(toonMesh(GEO.dot, '#cfe9f5', { position: [x * 0.8, -0.12, z * 0.8], scale: [0.03, 0.05, 0.03], outline: false, shadow: false }));
    }
    roomG.add(cg);
  }
  // 옷장(늘 왼쪽 벽에 붙어 있다): 나무 장 + 문 두 짝 + 거울
  function addWardrobe(WARDROBE, rect = false) {
    const g = new THREE.Group();
    g.position.set(WARDROBE.x, 0, WARDROBE.z);
    g.rotation.y = rect ? Math.PI / 2 : Math.PI / 2 - 0.35; // 둥근 방은 굽은 벽을 따라 비스듬히, 네모난 방은 벽에 반듯이
    g.add(toonMesh(GEO.box, '#c99a6a', { position: [0, 0.95, 0], scale: [1.3, 1.9, 0.55], shell: true, outline: 0.03 }));
    g.add(toonMesh(GEO.box, '#d8ad7d', { position: [-0.32, 0.95, 0.29], scale: [0.6, 1.72, 0.04], shell: true, outline: 0.02 }));
    g.add(toonMesh(GEO.box, '#cfe7f2', { position: [0.32, 1.05, 0.29], scale: [0.5, 1.2, 0.04], shell: true, outline: 0.02 }));
    g.add(toonMesh(GEO.box, '#ffffff', { position: [0.24, 1.3, 0.315], scale: [0.08, 0.5, 0.01], outline: false, shadow: false }));
    [-0.06, 0.06].forEach((x) => g.add(toonMesh(GEO.dot, '#8a5a30', { position: [x, 1.0, 0.33], scale: [0.04, 0.04, 0.04], outline: false })));
    g.add(toonMesh(GEO.box, '#a87b4c', { position: [0, 1.93, 0], scale: [1.4, 0.08, 0.62], shell: true, outline: 0.02 }));
    roomG.add(g);
  }
  // 보관 상자(옷장 맞은편 오른쪽 벽): 나무 상자 + 뚜껑 + 금빛 띠 두 줄 + 자물쇠
  function addChest(CHEST, rect = false) {
    const g = new THREE.Group();
    g.position.set(CHEST.x, 0, CHEST.z);
    g.rotation.y = rect ? -Math.PI / 2 : -(Math.PI / 2 - 0.35);
    g.add(toonMesh(GEO.box, '#c08550', { position: [0, 0.27, 0], scale: [0.95, 0.54, 0.6], shell: true, outline: 0.03 }));
    g.add(toonMesh(GEO.box, '#d49a62', { position: [0, 0.62, 0], scale: [1.0, 0.16, 0.65], shell: true, outline: 0.025 }));
    [-0.3, 0.3].forEach((x) => g.add(toonMesh(GEO.box, '#e8b84e', { position: [x, 0.36, 0], scale: [0.08, 0.74, 0.67], outline: 0.012 })));
    g.add(toonMesh(GEO.box, '#f2c94c', { position: [0, 0.5, 0.33], scale: [0.16, 0.18, 0.05], outline: 0.012 }));
    g.add(toonMesh(GEO.dot, '#5a4431', { position: [0, 0.48, 0.36], scale: [0.03, 0.03, 0.03], outline: false }));
    roomG.add(g);
  }
  // 대상 발밑의 노란 고리(집 안 행동 안내)
  const cue = new THREE.Mesh(new THREE.RingGeometry(0.74, 1, 40), new THREE.MeshBasicMaterial({ color: 0xfcd95b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  cue.rotation.x = -Math.PI / 2;
  cue.visible = false;
  scene.add(cue);
  const blocked = (home, x, z, r) => {
    const sh = room.shape;
    if (sh && sh.kind === 'rect' ? Math.abs(x) > sh.hx - 0.45 || z < sh.z0 + 0.5 || z > sh.z1 - 0.12 : Math.hypot(x, z) > room.R - 0.55) return true; // 벽(둥근 방 · 네모난 방)
    if (Math.hypot(x - room.WARDROBE.x, z - room.WARDROBE.z) < 0.75 + r) return true;
    if (Math.hypot(x - room.CHEST.x, z - room.CHEST.z) < 0.55 + r) return true;
    if (host && Math.hypot(x - hostAt.x, z - hostAt.z) < 0.5 + r) return true; // 집주인
    return home.placed.some((p) => {
      if (WALKABLE.has(p.id)) return false;
      const c = cellCenter(p.cx, p.cz, room.size);
      return Math.abs(x - c.x) < CELL * 0.45 + r && Math.abs(z - c.z) < CELL * 0.45 + r;
    });
  };

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  buildRoom(0);
  const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();

  return {
    scene,
    camera,
    /** 놓인 가구를 다시 그린다. 집 크기가 바뀌었으면 방을 다시 짓고, 벽지 · 바닥 색을 붙인다. */
    setHome(home) {
      lastHome = home;
      const size = sizeOf(home), d = decorOf(home);
      if (size !== room.size) buildRoom(size);
      wallMat.color.set(WALLPAPERS[d.wall].color);
      wallFlat.color.set(WALLPAPERS[d.wall].color);
      floorMat.color.set(FLOORS[d.floor].color);
      furniture.clear();
      models.clear();
      cellOf.clear();
      for (const p of home.placed) {
        const c = cellCenter(p.cx, p.cz, size), f = furnitureModel(p.id);
        f.position.set(c.x, 0, c.z);
        f.rotation.y = -p.rot * Math.PI / 2;
        furniture.add(f);
        models.set(`${p.cx},${p.cz}`, f);
        cellOf.set(f, { cx: p.cx, cz: p.cz });
      }
    },
    /** 끌고 있는 가구: 칸 cell 의 가구를 바닥 위 점 { x, z } 로 살짝 들어 옮긴다. point 가 null 이면 제자리로. */
    drag(cell, point) {
      const f = cell && models.get(`${cell.cx},${cell.cz}`);
      if (!f) return;
      const c = point || cellCenter(cell.cx, cell.cz, room.size);
      f.position.set(c.x, point ? 0.25 : 0, c.z);
    },
    /** 목록에서 끌어 오는 가구 미리보기: 칸 위에 살짝 띄워 보여 준다(id 나 cell 이 null 이면 숨긴다). */
    ghost(id, cell) {
      if (!id || !cell) { if (ghostModel) ghostModel.visible = false; return; }
      if (ghostId !== id) {
        if (ghostModel) scene.remove(ghostModel);
        ghostModel = furnitureModel(id);
        ghostId = id;
        scene.add(ghostModel);
      }
      const c = cellCenter(cell.cx, cell.cz, room.size);
      ghostModel.position.set(c.x, 0.2, c.z);
      ghostModel.visible = true;
    },
    /** 화면 좌표(-1..1)에 보이는 가구의 칸. 가구 몸통(탁자 윗면처럼 바닥보다 높이 보이는 곳)을 눌러도 그 가구로 친다. 없으면 null. */
    pickCell(nx, ny) {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      for (const h of ray.intersectObjects(furniture.children, true)) {
        let o = h.object;
        while (o && o.parent !== furniture) o = o.parent;
        if (o && cellOf.has(o)) return cellOf.get(o);
      }
      return null;
    },
    /** 화면 좌표(-1..1)가 가리키는 바닥 위 점 { x, z }(방 밖이어도). */
    pointAt(nx, ny) {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      return ray.ray.intersectPlane(floor, hit) ? { x: hit.x, z: hit.z } : null;
    },
    /** 집 안의 내 캐릭터. keep 이 아니면 문간에서 방 쪽을 보고 선다(옷을 갈아입을 때는 keep). */
    setPlayer(look, keep = false) {
      if (me) scene.remove(me.root);
      me = buildChibi(look);
      if (!keep) { pos.x = room.DOOR.x; pos.z = room.DOOR.z - 0.5; yaw = Math.PI; }
      me.root.position.set(pos.x, 0, pos.z);
      me.root.rotation.y = yaw;
      scene.add(me.root);
    },
    /** 입력 방향 v = { x, y }(y 는 화면 위가 +)로 걷는다. 벽 · 가구 · 옷장은 비켜 간다. */
    walk(dt, v, home) {
      const len = Math.min(1, Math.hypot(v.x, v.y));
      moving = false;
      if (len < 0.12) return;
      const dx = v.x / Math.hypot(v.x, v.y), dz = -v.y / Math.hypot(v.x, v.y), step = 2.6 * len * dt, r = 0.3;
      const nx = pos.x + dx * step, nz = pos.z + dz * step;
      if (!blocked(home, nx, pos.z, r)) { pos.x = nx; moving = true; }
      if (!blocked(home, pos.x, nz, r)) { pos.z = nz; moving = true; }
      let d = Math.atan2(dx, dz) - yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      yaw += Math.max(-dt * 10, Math.min(dt * 10, d));
      if (moving) phase += dt * 2.6 * len * 3.2;
    },
    /** (x, z) 에 반지름 r 인 몸이 설 수 있는지(벽 · 가구 · 옷장을 피해서 — 따라다니는 풍뎅이가 길을 찾는다). */
    free(home, x, z, r = 0.2) { return !blocked(home, x, z, r); },
    /** 그 자리에 바로 선다(확인용). */
    standAt(x, z) { pos.x = x; pos.z = z; },
    /**
     * 집주인(몸이 바뀐 동안 내 집에 사는 우사기 — 내 몸)을 방 가운데쯤 빈자리에 세운다. look 이 없으면 치운다.
     * 가구 · 옷장 · 상자를 피해 방 안쪽부터 찾고, 손님(나)을 바라본다.
     */
    setHost(look) {
      if (host) { scene.remove(host.root); host = null; }
      if (!look || !lastHome) return;
      const chibi = buildChibi(look), h = lastHome;
      hostAt = { x: 0, z: 0 };
      host = null; // 빈자리를 찾는 동안은 집주인과 부딪히지 않게
      for (const [x, z] of [[0, -0.6], [0.9, -0.9], [-0.9, -0.9], [0, -1.6], [1.6, -0.2], [-1.6, -0.2], [0, 0.4], [1.2, 0.8], [-1.2, 0.8]]) {
        if (!blocked(h, x, z, 0.45) && Math.hypot(x - room.DOOR.x, z - room.DOOR.z) > 1.2) { hostAt = { x, z }; break; }
      }
      host = chibi;
      host.root.position.set(hostAt.x, 0, hostAt.z);
      scene.add(host.root);
    },
    /** 같이 놀기: 문간에 먼저 와 있는 사람(others [{ x, z }])과 겹치지 않게 옆 빈자리로 비켜 선다(가구 · 벽은 피한다). */
    stepAside(home, others) {
      if (!others.length) return;
      for (const [dx, dz] of [[0, 0], [1.05, 0], [-1.05, 0], [1.0, -0.8], [-1.0, -0.8], [0, -1.05], [1.9, -0.45], [-1.9, -0.45], [0, -2.0]]) {
        const x = pos.x + dx, z = pos.z + dz;
        if (blocked(home, x, z, 0.3) || !others.every((o) => Math.hypot(o.x - x, o.z - z) > 0.95)) continue;
        pos.x = x;
        pos.z = z;
        if (me) me.root.position.set(x, 0, z);
        return;
      }
    },
    /**
     * 지금 할 수 있는 일: 가까운 침대(자기) · 옷장 · 보관 상자 · 문(나가기). { type, x, z, r, label } | null
     * guest: 같이 놀기로 친구 집에 놀러 왔으면 문(나가기)과 잠긴 친구 상자('chestLocked' — 누르면 못 연다고만 알린다).
     */
    target(home, { guest = false } = {}) {
      const opts = [], { WARDROBE, CHEST, DOOR } = room;
      if (!guest) {
        for (const p of home.placed) if (p.id === 'bed') { const c = cellCenter(p.cx, p.cz, room.size); opts.push({ type: 'bed', x: c.x, z: c.z, r: 0.75, label: '자기', reach: 1.35 }); }
        opts.push({ type: 'wardrobe', x: WARDROBE.x, z: WARDROBE.z, r: 0.85, label: '옷장', reach: 1.5 });
        opts.push({ type: 'chest', x: CHEST.x, z: CHEST.z, r: 0.7, label: '보관 상자', reach: 1.3 });
      } else opts.push({ type: 'chestLocked', x: CHEST.x, z: CHEST.z, r: 0.7, label: '친구 상자', reach: 1.3 });
      opts.push({ type: 'door', x: DOOR.x, z: DOOR.z, r: 0.6, label: '나가기', reach: 0.9 });
      let best = null, bd = Infinity;
      for (const o of opts) { const d = Math.hypot(o.x - pos.x, o.z - pos.z); if (d < o.reach && d < bd) { bd = d; best = o; } }
      return best;
    },
    /** 행동 안내 고리(null 이면 숨긴다). */
    setCue(t, time = 0) {
      cue.visible = !!t;
      if (!t) return;
      cue.position.set(t.x, 0.03, t.z);
      cue.scale.setScalar(t.r * (1 + 0.07 * Math.sin(time * 6)));
    },
    get playerPos() { return pos; },
    /** 집 안 내 캐릭터가 바라보는 방향 · 걷는 중인지(같이 놀기: 같이 있는 친구에게 보낸다). */
    get playerYaw() { return yaw; },
    get playerMoving() { return moving; },
    /** 옷장을 열 때: 카메라(앞) 쪽을 보고 서서 바뀐 모습이 보이게. */
    faceCamera() { yaw = 0; moving = false; },
    showGrid(on) { tiles.forEach((t) => { t.visible = on; t.material = tileMat; }); },
    /** 칸 하나를 분홍으로(null 이면 모두 원래대로). */
    highlight(cell) { tiles.forEach((t) => { t.material = cell && t.userData.cx === cell.cx && t.userData.cz === cell.cz ? hotMat : tileMat; }); },
    /** 화면 좌표(-1..1)가 가리키는 바닥 칸. 칸 밖이면 null. */
    cellAt(nx, ny) {
      ray.setFromCamera({ x: nx, y: ny }, camera);
      if (!ray.ray.intersectPlane(floor, hit)) return null;
      const cx = Math.floor((hit.x - room.X0) / CELL), cz = Math.floor((hit.z - room.Z0) / CELL);
      return cx >= 0 && cz >= 0 && cx < room.cols && cz < room.rows ? { cx, cz } : null;
    },
    resize(aspect) {
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 62 : 38;
      camera.updateProjectionMatrix();
    },
    /** 내 캐릭터가 잠깐 몸짓을 한다(먹기: mode 'slurp' | 'gulp' | 'nibble', prop: 그동안 손에 드는 음식). */
    pose(mode, dur, prop = null) { mePose = { mode, t: dur, dur, prop }; if (me) showOnlyProp(me, prop); },
    update(dt, t) {
      if (!me) return;
      me.root.position.set(pos.x, 0, pos.z);
      me.root.rotation.y = yaw;
      if (mePose) { mePose.t -= dt; if (mePose.t <= 0 || moving) { if (mePose.prop) showOnlyProp(me, null); mePose = null; } } // 걸어가면 그만 먹는다
      if (mePose) animateChibi(me, mePose.mode, t, { phase, eat: 1 - mePose.t / mePose.dur });
      else animateChibi(me, moving ? 'walk' : 'idle', t, { phase });
      if (host) { // 집주인(속은 우사기)은 나를 바라보며 가끔 깡충
        host.root.rotation.y = Math.atan2(pos.x - hostAt.x, pos.z - hostAt.z);
        animateChibi(host, Math.sin(t * 0.7) > 0.6 ? 'hop' : 'idle', t, {});
      }
    }
  };
}
