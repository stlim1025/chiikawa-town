import * as THREE from 'three';
import { toonMesh, toonMaterial, GEO } from '../render/toon.js';
import { batchStatic } from '../render/batch.js';
import { PLAZA } from '../core/layout.js';

/**
 * 막대 과자 데이 장식(게임 오리지널, core/stickday.js 의 축제 사흘 동안 광장 둘레):
 *  - 광장 둘레 가로등 사이에 알록달록 삼각 깃발 줄
 *  - 남북 길목 위에 '막대 과자 데이' 현수막(기둥 둘)
 *  - 동서 길목 양옆에 큰 막대 과자 화분(초콜릿 · 딸기 · 화이트)
 * 처음 축제 날에 만들고, setOn 으로 보이고 숨긴다(기둥 · 화분 장애물도 같이 켜고 끈다).
 * village: buildVillage 가 돌려준 것(lamps · obstacles · nearestFree · refreshNav).
 */
const FLAG_COLORS = ['#ff9fc0', '#fcd95b', '#8fd3ff', '#8fd16a', '#c9a8ff', '#ffffff'].map((c) => new THREE.Color(c));
const ROPE_Y = 1.55, FLAG_W = 0.26, FLAG_H = 0.3, FLAG_GAP = 0.42;
const COAT = ['#6b3f26', '#ff9fc0', '#fff4dc']; // 초콜릿 · 딸기 · 화이트

export function createFestival(scene, village) {
  let root = null;
  const obs = [];

  /** 광장 둘레 가로등을 각도 순으로 잇는다(너무 가깝거나 먼 짝은 건너뛴다). */
  function lampPairs() {
    const near = village.lamps.filter((p) => Math.hypot(p.x - PLAZA.x, p.z - PLAZA.z) < PLAZA.r + 8)
      .sort((a, b) => Math.atan2(a.z - PLAZA.z, a.x - PLAZA.x) - Math.atan2(b.z - PLAZA.z, b.x - PLAZA.x));
    const pairs = [];
    near.forEach((a, i) => {
      const b = near[(i + 1) % near.length];
      if (near.length < 2 || (near.length === 2 && i === 1)) return;
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      if (d > 2 && d < 13) pairs.push([a, b]);
    });
    return pairs;
  }
  /** 깃발 줄: 늘어진 줄(선분)과 줄에 매단 삼각 깃발(정점 색 삼각형) 한 덩어리씩. */
  function pennants(pairs) {
    const rope = [], fp = [], fn = [], fc = [];
    const at = (a, b, t, sag) => new THREE.Vector3(a.x + (b.x - a.x) * t, ROPE_Y - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t);
    let ci = 0;
    for (const [a, b] of pairs) {
      const len = Math.hypot(b.x - a.x, b.z - a.z), sag = Math.min(0.55, Math.max(0.22, len * 0.06));
      for (let i = 0; i < 16; i++) { const p = at(a, b, i / 16, sag), q = at(a, b, (i + 1) / 16, sag); rope.push(p.x, p.y, p.z, q.x, q.y, q.z); }
      const n = Math.floor((len - 0.4) / FLAG_GAP);
      const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(), nor = new THREE.Vector3(-dir.z, 0, dir.x);
      for (let k = 0; k < n; k++) {
        const t = (0.2 + k * FLAG_GAP + FLAG_GAP / 2) / len, w = FLAG_W / 2 / len;
        const p = at(a, b, t - w, sag), q = at(a, b, t + w, sag), m = at(a, b, t, sag);
        const tip = new THREE.Vector3(m.x, m.y - FLAG_H, m.z);
        fp.push(p.x, p.y - 0.01, p.z, q.x, q.y - 0.01, q.z, tip.x, tip.y, tip.z);
        const c = FLAG_COLORS[ci++ % FLAG_COLORS.length];
        for (let v = 0; v < 3; v++) { fn.push(nor.x, nor.y, nor.z); fc.push(c.r, c.g, c.b); }
      }
    }
    const flags = new THREE.BufferGeometry();
    flags.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    flags.setAttribute('normal', new THREE.Float32BufferAttribute(fn, 3));
    flags.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
    const ropeGeo = new THREE.BufferGeometry();
    ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute(rope, 3));
    const g = new THREE.Group();
    const flagMesh = new THREE.Mesh(flags, toonMaterial('#ffffff', { vertexColors: true, doubleSide: true, unique: true }));
    flagMesh.castShadow = false;
    g.add(flagMesh, new THREE.LineSegments(ropeGeo, new THREE.LineBasicMaterial({ color: '#5a4431' })));
    return g;
  }
  /** 현수막 글씨(분홍 천, 양 끝에 막대 과자 그림). */
  function bannerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 136;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
      const c = canvas.getContext('2d');
      c.fillStyle = '#ffc7d9';
      c.fillRect(0, 0, 640, 136);
      c.fillStyle = '#ff9fc0';
      for (let x = 0; x < 640; x += 40) { c.beginPath(); c.arc(x + 20, 136, 14, Math.PI, 0); c.fill(); } // 아래 물결 무늬
      c.strokeStyle = '#fff6fa'; c.lineWidth = 5; c.setLineDash([14, 10]); c.strokeRect(12, 12, 616, 98); c.setLineDash([]);
      [[60, 1], [580, -1]].forEach(([x, sd]) => { // 양 끝 막대 과자 둘
        c.lineCap = 'round';
        [[-12, '#6b3f26'], [12, '#e0527a']].forEach(([dx, coat]) => {
          c.strokeStyle = '#e9c48a'; c.lineWidth = 10; c.beginPath(); c.moveTo(x + dx, 104); c.lineTo(x + dx + sd * 6, 26); c.stroke();
          c.strokeStyle = coat; c.lineWidth = 13; c.beginPath(); c.moveTo(x + dx + sd * 3, 64); c.lineTo(x + dx + sd * 6, 26); c.stroke();
        });
      });
      c.fillStyle = '#5a4431';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = 'bold 76px Gaegu, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      c.fillText('막대 과자 데이', 320, 64);
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.load('bold 76px Gaegu').then(draw, () => {});
    return tex;
  }
  /** 길목 위 현수막: 기둥 둘(x ± 1.55) 사이 높이 2.1에 천. 글씨는 앞뒤 두 면 모두 바로 읽힌다. */
  function banner(x, z) {
    const g = new THREE.Group();
    [-1, 1].forEach((sd) => {
      g.add(toonMesh(GEO.cylinder, '#8a5a34', { position: [x + sd * 1.55, 0, z], scale: [0.07, 2.5, 0.07], outline: 0.015 }));
      g.add(toonMesh(GEO.sphere, '#fcd95b', { position: [x + sd * 1.55, 2.55, z], scale: [0.12, 0.12, 0.12], outline: 0.015 }));
      obs.push({ x: x + sd * 1.55, z, r: 0.12 });
    });
    const tex = bannerTexture(), face = new THREE.MeshLambertMaterial({ map: tex }), edge = new THREE.MeshLambertMaterial({ color: '#ffc7d9' });
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.64, 0.03), [edge, edge, edge, edge, face, face]);
    cloth.position.set(x, 2.12, z);
    g.add(cloth);
    root.add(g);
  }
  /** 큰 막대 과자 화분: 분홍 화분에 커다란 막대 과자 셋을 꽂았다. */
  function bigSticks(x, z) {
    const at = village.nearestFree(x, z, 0.4);
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.z);
    g.add(toonMesh(GEO.cylinder, '#e86a8a', { scale: [0.34, 0.3, 0.34], outline: 0.02 }));
    g.add(toonMesh(GEO.cylinder, '#ffd1e0', { position: [0, 0.3, 0], scale: [0.36, 0.05, 0.36], outline: 0.015 }));
    [[-0.12, -0.18, 0], [0.12, 0.16, 1], [0, 0.02, 2]].forEach(([dx, lean, i]) => {
      const s = new THREE.Group();
      s.position.set(dx, 0.3, (i - 1) * 0.06);
      s.rotation.z = lean;
      s.add(toonMesh(GEO.cylinder, '#e9c48a', { scale: [0.07, 1.25 + i * 0.12, 0.07], outline: 0.015 }));
      s.add(toonMesh(GEO.cylinder, COAT[i], { position: [0, 0.5 + i * 0.06, 0], scale: [0.09, 0.8 + i * 0.06, 0.09], outline: 0.015 }));
      g.add(s);
    });
    root.add(g);
    obs.push({ x: at.x, z: at.z, r: 0.4 });
  }
  function build() {
    root = new THREE.Group();
    root.add(pennants(lampPairs()));
    banner(PLAZA.x, PLAZA.z + PLAZA.r + 1.2); // 남쪽 길목(마을 남문 쪽에서 들어오며 본다)
    banner(PLAZA.x, PLAZA.z - PLAZA.r - 1.2); // 북쪽 길목
    [1, -1].forEach((sx) => [1, -1].forEach((sz) => bigSticks(PLAZA.x + sx * (PLAZA.r + 0.9), PLAZA.z + sz * 1.8))); // 동서 길목 양옆
    scene.add(root);
    batchStatic(root, { cell: 40 });
    for (const o of obs) village.obstacles.push(o);
    village.refreshNav();
  }

  return {
    /** 장식을 보이거나 숨긴다(처음 보일 때 만든다). */
    setOn(on) {
      if (on && !root) { build(); return; }
      if (!root || root.visible === on) return;
      root.visible = on;
      obs.forEach((o) => { o.off = !on; });
      village.refreshNav();
    },
    get on() { return !!root && root.visible; }
  };
}
