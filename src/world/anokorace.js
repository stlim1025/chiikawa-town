import * as THREE from 'three';
import { groundY } from '../core/layout.js';

/**
 * 아노코 경주(아노코와 지내기 하트 3 — core/anokobond.js 의 RACE, 게임 오리지널): 땅에 빛나는 고리를 차례로 지난다.
 * 다음 고리만 밝고 그 위로 빛기둥이 서서 멀리서도 보인다. 고리 안(반지름 RING_R)에 들어가면 다음 고리로, 마지막 고리면 완주.
 * → { start(points), stop(), update(dt, p) → 'pass' | 'finish' | null, get active(), get index(), get count() }
 */
export const RING_R = 2.5;

export function createAnokoRace(scene) {
  const ringGeo = new THREE.TorusGeometry(RING_R, 0.14, 8, 48);
  const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 7, 16, 1, true);
  const lit = new THREE.MeshBasicMaterial({ color: '#ffd45c', transparent: true, opacity: 0.95, depthWrite: false });
  const dim = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff1b0', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.visible = false;
  scene.add(beam);
  const rings = [];
  let pts = [], idx = 0, t = 0;

  /** idx 번째 고리만 밝게, 그 위에 빛기둥. 지난 고리는 숨긴다. */
  function light() {
    rings.forEach((r, i) => { r.material = i === idx ? lit : dim; r.visible = i >= idx; });
    const q = pts[idx];
    beam.visible = !!q;
    if (q) beam.position.set(q.x, groundY(q.x, q.z) + 3.5, q.z);
  }
  function stop() {
    rings.forEach((r) => scene.remove(r));
    rings.length = 0;
    pts = [];
    idx = 0;
    beam.visible = false;
  }

  return {
    get active() { return pts.length > 0; },
    get index() { return idx; },
    get count() { return pts.length; },
    /** 고리 자리 [{ x, z }] 차례로(마지막이 결승). */
    start(points) {
      stop();
      pts = points.map((q) => ({ x: q.x, z: q.z }));
      for (const q of pts) {
        const r = new THREE.Mesh(ringGeo, dim);
        r.rotation.x = Math.PI / 2;
        r.position.set(q.x, groundY(q.x, q.z) + 0.15, q.z);
        scene.add(r);
        rings.push(r);
      }
      idx = 0;
      t = 0;
      light();
    },
    stop,
    /** p(내 자리)가 다음 고리 안에 들어왔는지: 'pass' 다음 고리로, 'finish' 완주(고리는 치운다), 아니면 null. */
    update(dt, p) {
      if (!pts.length) return null;
      t += dt;
      const pulse = 1 + 0.08 * Math.sin(t * 6);
      if (rings[idx]) rings[idx].scale.set(pulse, pulse, pulse);
      beamMat.opacity = 0.25 + 0.12 * Math.sin(t * 4);
      const q = pts[idx];
      if (Math.hypot(p.x - q.x, p.z - q.z) > RING_R) return null;
      if (rings[idx]) rings[idx].scale.set(1, 1, 1);
      idx++;
      if (idx >= pts.length) { stop(); return 'finish'; }
      light();
      return 'pass';
    }
  };
}
