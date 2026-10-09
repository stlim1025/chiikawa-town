import * as THREE from 'three';

/**
 * 부품을 쌓아 모양을 만든 뒤 정점 색이 든 도형 하나로 합친다(그리기 호출을 줄인다). 풀 · 몬스터가 쓴다.
 * part 로 root 아래에 자리 잡기용 메시를 붙이고, mergeParts(root) 로 합친다. flat 부품(눈 · 입처럼 외곽선 없이
 * 단색으로 그릴 것)은 mergeParts(root, 'flat') 로 따로 합친다.
 */
const tmpColor = new THREE.Color();

/** 부품 하나(그리기용이 아닌 자리 잡기용 메시). opts.flat 이면 외곽선 없는 얼굴 부품. */
export function part(parent, geo, color, { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], flat = false } = {}) {
  const m = new THREE.Mesh(geo);
  m.userData.color = color;
  m.userData.flat = flat;
  m.position.set(...position);
  m.rotation.set(rotation[0], rotation[1], rotation[2], 'YXZ');
  m.scale.set(...scale);
  parent.add(m);
  return m;
}

/** root 아래 부품들을 하나로 합친다. which: 'body'(flat 이 아닌 것, 기본) | 'flat' | 'all'. 부품이 없으면 null. */
export function mergeParts(root, which = 'all') {
  root.updateMatrixWorld(true);
  const pos = [], nor = [], col = [], idx = [];
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  root.traverse((m) => {
    if (!m.isMesh || m === root) return;
    if (which === 'body' && m.userData.flat) return;
    if (which === 'flat' && !m.userData.flat) return;
    const g = m.geometry, base = pos.length / 3;
    const p = g.attributes.position, n = g.attributes.normal;
    nm.getNormalMatrix(m.matrixWorld);
    tmpColor.set(m.userData.color);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      nor.push(v.x, v.y, v.z);
      col.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
  });
  if (!pos.length) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  out.computeBoundingSphere();
  return out;
}
