import * as THREE from 'three';
import { addOutline } from '../render/toon.js';

/**
 * 별똥별 밤 연출(core/starfall.js): 소원을 빌 때 올려다본 밤하늘의 별 · 별똥별 줄기,
 * 진짜로 떨어지는 별똥별과 구덩이, 사실적인 얼굴의 '별똥별맨'. 빛은 스프라이트로만(조명을 늘리지 않는다).
 */
const FALL = 1.4, RISE = 0.6, LEAVE = 0.9, CRATER_LIFE = 25;
const STAR_R = 1, STAR_IN = 0.56, DEPTH = 0.3, BEVEL = 0.12;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTex = () => canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.35, 'rgba(255,240,170,0.45)');
  r.addColorStop(1, 'rgba(255,230,140,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
});
// 별똥별 줄기: 오른쪽 끝이 머리(밝다), 왼쪽으로 꼬리가 흐려진다
const streakTex = () => canvasTex(256, 32, (g, w, h) => {
  const lin = g.createLinearGradient(0, 0, w, 0);
  lin.addColorStop(0, 'rgba(255,240,190,0)');
  lin.addColorStop(0.8, 'rgba(255,245,210,0.55)');
  lin.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = lin;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w - h / 2, h * 0.15);
  g.arc(w - h / 2, h / 2, h * 0.35, -Math.PI / 2, Math.PI / 2);
  g.lineTo(0, h / 2);
  g.fill();
});

/** 별똥별맨 얼굴: 휘둥그런 눈 · 눈가 주름 · 이를 드러내고 벌린 입(원작처럼 이상하게 사실적인). */
function faceTex() {
  return canvasTex(256, 256, (g) => {
    const ink = '#3b2a20';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = ink;
    for (const ex of [94, 162]) {
      g.fillStyle = '#fffdf2';
      g.lineWidth = 4;
      g.beginPath(); g.ellipse(ex, 100, 22, 20, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = ink;
      g.beginPath(); g.arc(ex + (ex < 128 ? 4 : -4), 101, 6.5, 0, Math.PI * 2); g.fill();
      g.lineWidth = 2.6;
      g.beginPath(); g.arc(ex, 101, 29, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); // 위 눈꺼풀 주름
      g.beginPath(); g.arc(ex, 104, 28, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); // 눈 밑 주름
      g.beginPath(); g.arc(ex, 108, 34, Math.PI * 0.32, Math.PI * 0.68); g.stroke();
    }
    g.lineWidth = 2.6;
    for (const x of [121, 128, 135]) { g.beginPath(); g.moveTo(x, 74); g.lineTo(x + (x - 128) * 0.25, 88); g.stroke(); } // 미간 주름
    g.beginPath(); g.moveTo(121, 126); g.quadraticCurveTo(128, 133, 135, 126); g.stroke(); // 코
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 44, 140); g.quadraticCurveTo(128 + sx * 56, 166, 128 + sx * 46, 194); g.stroke(); } // 팔자 주름
    // 벌린 입
    g.fillStyle = '#5a2a20';
    g.lineWidth = 4;
    g.beginPath(); g.roundRect(88, 142, 80, 50, 14); g.fill(); g.stroke();
    g.fillStyle = '#e88a8a';
    g.beginPath(); g.ellipse(128, 178, 18, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff6dc';
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.rect(93 + i * 11.8, 144, 10.5, 13); g.fill(); g.stroke(); } // 윗니
    for (let i = 0; i < 5; i++) { g.beginPath(); g.rect(99 + i * 11.8, 178, 10.5, 12); g.fill(); g.stroke(); } // 아랫니
    g.beginPath(); g.arc(128, 166, 50, Math.PI * 0.3, Math.PI * 0.7); g.stroke(); // 턱 주름
  });
}
/** 땅에 팬 구덩이: 어두운 바닥 · 테두리 · 사방으로 갈라진 금. */
function craterTex() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = 'rgba(78,70,64,0.92)';
    g.beginPath(); g.ellipse(128, 128, 70, 62, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(44,38,34,0.95)';
    g.lineWidth = 7;
    g.stroke();
    g.lineWidth = 4;
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3 * Math.sin(i * 7.1), r0 = 66, r1 = 98 + 22 * Math.abs(Math.sin(i * 3.3));
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0 * 0.9);
      g.lineTo(128 + Math.cos(a + 0.12) * (r0 + r1) / 2, 128 + Math.sin(a + 0.12) * (r0 + r1) / 2 * 0.9);
      g.lineTo(128 + Math.cos(a - 0.05) * r1, 128 + Math.sin(a - 0.05) * r1 * 0.9);
      g.stroke();
    }
  });
}
/** 통통한 다섯 갈래 별(끝이 둥글다). */
function starGeometry() {
  const s = new THREE.Shape();
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const th = Math.PI / 2 + (i / N) * Math.PI * 2, k = Math.pow((1 + Math.cos(5 * (th - Math.PI / 2))) / 2, 1.5);
    const r = STAR_IN + (STAR_R - STAR_IN) * k, x = Math.cos(th) * r, y = Math.sin(th) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: 0.08, bevelSegments: 3, curveSegments: 4 });
  g.center();
  return g;
}

export function createStarfall(scene) {
  const glow = glowTex(), streak = streakTex();
  const additive = (map, color, opacity = 1) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });

  // 별똥별맨
  const man = new THREE.Group();
  const body = new THREE.Mesh(starGeometry(), new THREE.MeshBasicMaterial({ color: '#ffe23a' }));
  addOutline(body, 0.035, true);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: faceTex(), transparent: true, depthWrite: false }));
  face.position.z = DEPTH / 2 + BEVEL + 0.004;
  face.scale.setScalar(1.5); // 얼굴이 별 가운데를 꽉 채우게(원작처럼 눈 · 입이 크게)
  const halo = new THREE.Sprite(additive(glow, 0xfff1a0, 0.85));
  halo.scale.set(4.4, 4.4, 1);
  halo.position.z = -0.3;
  man.add(halo, body, face);
  man.visible = false;
  scene.add(man);
  // 떨어질 · 날아갈 때 꼬리
  const trail = new THREE.Sprite(additive(streak, 0xfff6c8));
  trail.center.set(1, 0.5);
  trail.visible = false;
  scene.add(trail);
  // 부딪힐 때 번쩍
  const flash = new THREE.Sprite(additive(glow, 0xffffff, 0));
  flash.visible = false;
  scene.add(flash);
  // 구덩이 · 땅에 번진 빛
  const crater = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: craterTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  crater.renderOrder = 1;
  crater.visible = false;
  scene.add(crater);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glow, color: 0xffd76a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.renderOrder = 1;
  pool.visible = false;
  scene.add(pool);

  // 올려다본 밤하늘: 별 · 지나가는 별똥별(소원을 빌 때만 보인다)
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, el = 0.08 + Math.random() * 1.2;
    starPos.push(Math.cos(a) * Math.cos(el) * 150, Math.sin(el) * 150, Math.sin(a) * Math.cos(el) * 150);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fff8e0', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
  stars.visible = false;
  stars.frustumCulled = false;
  scene.add(stars);
  const streaks = Array.from({ length: 6 }, () => {
    const sp = new THREE.Sprite(additive(streak, 0xfff3c0, 0));
    sp.center.set(1, 0.5);
    sp.visible = false;
    scene.add(sp);
    return { sp, t: 0, life: 0, x: 0, y: 0, vx: 0, vy: 0 };
  });
  let skyOn = false, spawnIn = 0;

  let phase = 'idle', pt = 0, land = null, start = null, onLand = null, onGone = null, craterT = 0;
  const v = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const ease = (u) => u * u;
  /** 화면에서 a → b 로 가는 방향 각도(꼬리 스프라이트를 그쪽으로 돌린다). */
  const screenAngle = (camera, a, b) => {
    const pa = v.copy(a).project(camera), ax = pa.x, ay = pa.y, pb = v.copy(b).project(camera);
    return Math.atan2(pb.y - ay, pb.x - ax);
  };

  return {
    get phase() { return phase; },
    /** 올려다본 밤하늘(별 · 지나가는 별똥별)을 켜고 끈다. */
    setSky(on) { skyOn = on; stars.visible = on; if (!on) streaks.forEach((s) => { s.sp.visible = false; }); },
    /** 별똥별이 하늘(from)에서 (x, z) 로 떨어진다. 부딪히면 land(), 별똥별맨이 다 솟아나면 다음 단계. */
    drop(from, x, z, hit) {
      land = new THREE.Vector3(x, 0, z);
      start = from.clone();
      onLand = hit;
      phase = 'fall';
      pt = 0;
      man.visible = true;
      man.scale.setScalar(0.45);
      man.rotation.set(0, 0, 0);
      trail.visible = true;
      crater.visible = false;
      pool.visible = false;
    },
    /** 별똥별맨이 하늘로 날아간다. 다 날아가면 gone(). */
    leave(gone) { onGone = gone; phase = 'leave'; pt = 0; trail.visible = true; },
    /** 구덩이까지 바로 치운다. */
    clear() { phase = 'idle'; man.visible = trail.visible = flash.visible = crater.visible = pool.visible = false; },
    update(dt, camera) {
      pt += dt;
      // 밤하늘 별똥별: 카메라가 보는 쪽 하늘에 몇 개씩
      if (skyOn) {
        stars.position.copy(camera.position);
        camera.getWorldDirection(fwd);
        right.crossVectors(fwd, camera.up).normalize();
        up.crossVectors(right, fwd).normalize();
        spawnIn -= dt;
        if (spawnIn <= 0) {
          spawnIn = 0.35 + Math.random() * 0.9;
          const s = streaks.find((q) => q.t >= q.life);
          if (s) Object.assign(s, { t: 0, life: 0.7 + Math.random() * 0.5, x: -20 + Math.random() * 60, y: 6 + Math.random() * 22, vx: -(30 + Math.random() * 25), vy: -(10 + Math.random() * 12) });
        }
        for (const s of streaks) {
          s.t += dt;
          const live = s.t < s.life;
          s.sp.visible = live;
          if (!live) continue;
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.sp.position.copy(camera.position).addScaledVector(fwd, 120).addScaledVector(right, s.x).addScaledVector(up, s.y);
          s.sp.material.rotation = Math.atan2(s.vy, s.vx) + Math.PI; // 머리(오른쪽 끝)가 가는 쪽
          s.sp.material.opacity = Math.sin((s.t / s.life) * Math.PI);
          s.sp.scale.set(10, 0.5, 1);
        }
      }
      if (phase === 'fall') {
        const u = Math.min(1, pt / FALL), e = ease(u);
        man.position.lerpVectors(start, land, e).y += 0.75 * e;
        man.rotation.z += dt * 6;
        trail.position.copy(man.position);
        trail.material.rotation = screenAngle(camera, start, land) + Math.PI;
        trail.scale.set(3 + 5 * e, 0.9, 1);
        if (u >= 1) {
          phase = 'rise'; pt = 0;
          trail.visible = false;
          crater.position.set(land.x, 0.03, land.z);
          pool.position.set(land.x, 0.05, land.z);
          crater.visible = pool.visible = flash.visible = true;
          flash.position.set(land.x, 0.8, land.z);
          craterT = CRATER_LIFE;
          man.rotation.z = 0;
          onLand?.();
        }
      } else if (phase === 'rise') {
        const u = Math.min(1, pt / RISE), over = 1 + 0.18 * Math.sin(u * Math.PI);
        man.position.set(land.x, 0.15 + 0.6 * u, land.z);
        man.scale.setScalar((0.45 + 0.55 * u) * over);
        if (u >= 1) { phase = 'stare'; pt = 0; }
      } else if (phase === 'stare') {
        man.position.set(land.x, 0.75, land.z);
        man.scale.setScalar(1);
        man.rotation.z = Math.sin(pt * 31) * 0.025; // 부들부들
      } else if (phase === 'leave') {
        const u = Math.min(1, pt / LEAVE), e = ease(u);
        man.position.set(land.x - 4 * e, 0.75 + 26 * e, land.z - 6 * e);
        man.scale.setScalar(1 - 0.5 * e);
        man.rotation.z += dt * 8;
        trail.position.copy(man.position);
        trail.material.rotation = screenAngle(camera, land, man.position) + Math.PI;
        trail.scale.set(2 + 6 * e, 0.9, 1);
        if (u >= 1) { phase = 'gone'; man.visible = trail.visible = false; const cb = onGone; onGone = null; cb?.(); }
      }
      // 번쩍 · 땅의 빛 · 구덩이(조금 있다 사라진다)
      if (flash.visible) {
        const u = Math.min(1, pt / 0.35);
        flash.scale.setScalar(1 + 9 * u);
        flash.material.opacity = phase === 'rise' ? 1 - u : 0;
        if (phase !== 'rise' || u >= 1) flash.visible = false;
      }
      if (pool.visible) pool.material.opacity = man.visible && phase !== 'gone' ? 0.55 + 0.15 * Math.sin(pt * 4) : Math.max(0, pool.material.opacity - dt * 0.4);
      if (crater.visible && phase === 'gone') {
        craterT -= dt;
        crater.material.opacity = Math.min(1, craterT / 3);
        if (craterT <= 0) { crater.visible = pool.visible = false; crater.material.opacity = 1; phase = 'idle'; }
      }
    }
  };
}
