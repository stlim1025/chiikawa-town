import * as THREE from 'three';
import { groundY } from '../core/layout.js';

/**
 * 아노코 마당의 분위기(메인 이야기 2장 최종 보스 — 게임 오리지널 연출): 아노코가 단계를 바꾸며 포효하면 마당이 달라진다.
 *  · 1단계(화남): 하얀 솜털이 바람을 타고 천천히 흩날린다.
 *  · 2단계(마지막): 솜털이 눈보라처럼 마당을 빙빙 돌며 몰아친다.
 * main 은 같은 세기(level)로 하늘 · 해 · 캐릭터 빛을 1 노을빛, 2 어둑한 보랏빛으로 바꾼다.
 * update(dt, target, near): target(지금 단계 0 ~ 2)을 천천히 따라간다(한 단계에 1.4초쯤 — 포효하는 동안 바뀐다).
 * near(0 ~ 1)는 내가 마당 가까이 있는 정도: 마당에서 멀어지면 걷힌다. eye(카메라 자리)를 주면 카메라 바로 앞 솜털은 작아져 사라진다
 * (렌즈에 붙은 듯 크게 보이지 않게). → { update, get level() }
 */
const N = 260; // 솜털 수(눈보라일 때 모두)
const TOP = 5.5; // 솜털이 생기는 높이

export function createAnokoMood(scene, spot) {
  const R = spot.r + 4, floor = groundY(spot.x, spot.z);
  const mat = new THREE.MeshBasicMaterial({ color: '#fbf7ef', transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), mat, N);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.visible = false;
  scene.add(mesh);
  /** 솜털 하나: 마당 중심에서 각도 a · 거리 r, 높이 y, 크기 s, 흔들림 위상 ph, 빠르기 배율 sp. */
  const fresh = (p, y) => {
    p.a = Math.random() * Math.PI * 2;
    p.r = Math.sqrt(Math.random()) * R;
    p.y = y;
    p.s = 0.05 + Math.random() * 0.08;
    p.ph = Math.random() * Math.PI * 2;
    p.sp = 0.6 + Math.random() * 0.8;
    return p;
  };
  const fluff = Array.from({ length: N }, () => fresh({}, 0.3 + Math.random() * TOP));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), size = new THREE.Vector3();
  let k = 0, shown = 0, t = 0;

  return {
    /** 화면에 보이는 세기(0 ~ 2): 따라가는 단계 × 마당 가까이 있는 정도. */
    get level() { return shown; },
    update(dt, target, near, eye = null) {
      t += dt;
      k += Math.sign(target - k) * Math.min(Math.abs(target - k), dt * 0.7);
      shown = k * Math.max(0, Math.min(1, near));
      const w1 = Math.min(1, shown), w2 = Math.max(0, shown - 1);
      const count = Math.round(N * (0.35 * w1 + 0.65 * w2));
      mesh.visible = count > 0;
      mesh.count = count;
      if (!count) return;
      mat.opacity = 0.9 * Math.min(1, shown * 2);
      const spin = 0.35 + 3.2 * w2, fall = 0.22 + 0.7 * w2; // 1단계: 살랑살랑 내려앉는다, 2단계: 빠르게 휘돈다
      for (let i = 0; i < count; i++) {
        const p = fluff[i];
        p.a += (dt * spin * p.sp) / Math.max(1.2, p.r);
        p.y -= dt * fall * p.sp;
        if (p.y < 0.1) fresh(p, TOP + Math.random());
        const x = spot.x + Math.cos(p.a) * p.r + Math.sin(t * 0.9 + p.ph) * 0.35;
        const z = spot.z + Math.sin(p.a) * p.r + Math.cos(t * 0.7 + p.ph) * 0.35;
        pos.set(x, floor + p.y + Math.sin(t * 1.7 + p.ph) * 0.12, z);
        const d = eye ? pos.distanceTo(eye) : 9;
        size.setScalar(d < 4 ? p.s * Math.max(0, (d - 1.5) / 2.5) : p.s);
        m4.compose(pos, q, size);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
}
