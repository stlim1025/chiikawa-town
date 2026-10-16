import * as THREE from 'three';

/**
 * 색종이(집들이 · 막대 과자 파티의 건배 컷신): 한 자리에서 위로 팡 터져 사방으로 퍼졌다가 팔랑팔랑 떨어진다.
 * 점(Points) 하나로 그린다(그리기 호출 1번). 떨어지는 동안만 보이고, 다 떨어지면 저절로 숨는다.
 * → { burst(x, y, z, { n, spread, up }), update(dt), clear() }
 */
const MAX = 320;
const COLORS = ['#ffb7cf', '#fcd95b', '#8fd16a', '#8fd3ff', '#c9a8ff', '#ff9a8a', '#ffffff'].map((c) => new THREE.Color(c));
const GRAVITY = 5.5, FALL = 1.1, DRAG = 1.8; // 떨어지는 빠르기는 FALL 까지만(종이처럼 천천히)

export function createConfetti(scene) {
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), vel = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX), sway = new Float32Array(MAX);
  pos.fill(-100);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, depthWrite: false }));
  points.frustumCulled = false; // 점 자리가 늘 바뀌어서 처음 경계로 잘못 빼지 않게
  points.visible = false;
  scene.add(points);
  let next = 0;

  return {
    /** (x, y, z)에서 n 장을 터뜨린다. spread: 옆으로 퍼지는 빠르기, up: 위로 솟는 빠르기. */
    burst(x, y, z, { n = 150, spread = 2.6, up = 5.2 } = {}) {
      for (let i = 0; i < n; i++) {
        const k = next++ % MAX, a = Math.random() * Math.PI * 2, r = spread * (0.35 + Math.random() * 0.65);
        pos[k * 3] = x + (Math.random() - 0.5) * 0.4;
        pos[k * 3 + 1] = y + Math.random() * 0.3;
        pos[k * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
        vel[k * 3] = Math.cos(a) * r;
        vel[k * 3 + 1] = up * (0.6 + Math.random() * 0.4);
        vel[k * 3 + 2] = Math.sin(a) * r;
        life[k] = 2.4 + Math.random() * 1.6;
        sway[k] = Math.random() * Math.PI * 2;
        const c = COLORS[k % COLORS.length];
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      }
      geo.attributes.color.needsUpdate = true;
      points.visible = true;
    },
    update(dt) {
      if (!points.visible) return;
      let any = false;
      const keep = Math.max(0, 1 - DRAG * dt);
      for (let k = 0; k < MAX; k++) {
        if (life[k] <= 0) continue;
        life[k] -= dt;
        if (life[k] <= 0) { pos[k * 3 + 1] = -100; continue; }
        any = true;
        vel[k * 3] *= keep;
        vel[k * 3 + 2] *= keep;
        vel[k * 3 + 1] = Math.max(-FALL, vel[k * 3 + 1] - GRAVITY * dt);
        sway[k] += dt * 5;
        const s = vel[k * 3 + 1] < 0 ? Math.sin(sway[k]) * 0.5 : 0; // 떨어질 때 팔랑팔랑
        pos[k * 3] += (vel[k * 3] + s) * dt;
        pos[k * 3 + 1] += vel[k * 3 + 1] * dt;
        pos[k * 3 + 2] += (vel[k * 3 + 2] + Math.cos(sway[k]) * s) * dt;
        if (pos[k * 3 + 1] < 0.02) { pos[k * 3 + 1] = 0.02; vel[k * 3] = vel[k * 3 + 2] = 0; } // 땅에 내려앉으면 그 자리에(사라질 때까지)
      }
      geo.attributes.position.needsUpdate = true;
      if (!any) points.visible = false;
    },
    clear() { life.fill(0); pos.fill(-100); geo.attributes.position.needsUpdate = true; points.visible = false; }
  };
}
