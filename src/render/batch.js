import * as THREE from 'three';
import { outlineMaterial, toonMaterial } from './toon.js';

// 움직이지 않는 풍경을 덩어리로 합친다(정적 배칭): 가로등 · 울타리 · 덤불 · 바위처럼 재질을 여럿이 같이 쓰는 불투명 소품을
// 칸마다 한 메시로(같은 색끼리 나눠 쓰는 재질은 색을 꼭짓점에 칠해 색이 달라도 하나로), 그 외곽선도 굵기별로 한 메시로. 물체 수가 줄면 위치 계산 · 화면 안 검사 · 그리기 명령이 함께 준다
// (휴대폰에서 프레임을 잡아먹던 건 물체 5천 개를 매 장면 하나하나 챙기는 일이었다).
// 합치지 않는 것: 반투명이 되는 것(가리는 나무 · 집 · 문은 재질을 따로 둔다 → mergeUnit 으로 한 채 안에서만), 무늬가 있는 재질(간판),
// skip 으로 받은 움직이는 것(구름 · 나비 · 추첨 통). 밤 창문 · 가로등 유리처럼 코드가 바꾸는 건 재질이라 합친 뒤에도 그대로 바뀐다.

const isOutline = (m) => !!(m.material && m.material.side === THREE.BackSide && m.material.isMeshBasicMaterial);
const isZone = (o) => !!(o.userData && o.userData.cx !== undefined); // zones.js 의 묶음 그룹(멀리 있으면 통째로 감춘다)

/**
 * 부품 [{ geometry, position, rotation, scale, color }] 을 한 도형으로(부모 기준 좌표). 나무 잎처럼 부품 몇 개를 미리 합칠 때.
 * rotation 은 [x, y, z](YXZ), 없으면 0. color 를 주면 그 색을 꼭짓점에 칠한다(vertexColors 재질로 그린다).
 */
export function mergedGeometry(parts) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const color = parts.some((p) => p.color != null);
  return mergeInto(parts.map((p) => ({
    geometry: p.geometry,
    matrix: m.clone().compose(new THREE.Vector3(...(p.position || [0, 0, 0])), q.clone().setFromEuler(e.set(...(p.rotation || [0, 0, 0]), 'YXZ')), new THREE.Vector3(...(p.scale || [1, 1, 1]))),
    tint: p.color != null ? new THREE.Color(p.color) : null
  })), { color });
}

/** [{ geometry, matrix, tint }] 를 matrix 를 굳혀 한 도형으로. 위치 · 법선(과 색 · uv)만. 색은 tint(그 부품 전체 한 색)가 있으면 그것, 없으면 도형의 색. */
function mergeInto(items, { color = false, uv = false } = {}) {
  let verts = 0, idx = 0;
  for (const { geometry: g } of items) { verts += g.attributes.position.count; idx += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3);
  const col = color ? new Float32Array(verts * 3) : null, tex = uv ? new Float32Array(verts * 2) : null;
  const index = new (verts > 65535 ? Uint32Array : Uint16Array)(idx);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const { geometry: g, matrix, tint } of items) {
    const p = g.attributes.position, n = g.attributes.normal;
    nm.getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
      if (col && tint) { col[(vo + i) * 3] = tint.r; col[(vo + i) * 3 + 1] = tint.g; col[(vo + i) * 3 + 2] = tint.b; }
      else if (col) { const c = g.attributes.color; col[(vo + i) * 3] = c ? c.getX(i) : 1; col[(vo + i) * 3 + 1] = c ? c.getY(i) : 1; col[(vo + i) * 3 + 2] = c ? c.getZ(i) : 1; }
      if (tex) { const t = g.attributes.uv; tex[(vo + i) * 2] = t.getX(i); tex[(vo + i) * 2 + 1] = t.getY(i); }
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) index[io++] = vo + g.index.getX(i);
    else for (let i = 0; i < p.count; i++) index[io++] = vo + i;
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (tex) out.setAttribute('uv', new THREE.BufferAttribute(tex, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  return out;
}

/** 합칠 수 있는 몸통 메시인지(외곽선이 아닌 것 · 자식은 외곽선뿐 · 보통 재질 하나 · 순서 지정 없음). */
function plainBody(m) {
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || isOutline(m)) return false;
  const g = m.geometry, mat = m.material;
  if (!g || !g.attributes.position || !g.attributes.normal || g.morphAttributes.position || Array.isArray(mat)) return false;
  if (mat.transparent || mat.map || mat.alphaMap || m.renderOrder !== 0 || m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
  if (mat.vertexColors && !g.attributes.color) return false;
  return m.children.every((c) => isOutline(c) && c.children.length === 0 && c.geometry && c.geometry.attributes.normal);
}

/** 외곽선 하나를 합칠 때의 묶음 열쇠와 만들 재질: 법선으로 미는 선은 굳힌 좌표계 단위 두께로, 껍질 선은 그대로. */
function lineKey(line, matrix) {
  const lm = line.material;
  if (lm.userData.thickness === undefined) return { key: 's|' + lm.uuid, material: () => lm };
  const e = matrix.elements;
  const s = (Math.hypot(e[0], e[1], e[2]) + Math.hypot(e[4], e[5], e[6]) + Math.hypot(e[8], e[9], e[10])) / 3;
  const w = Math.round(lm.userData.thickness * s * 1000) / 1000, hand = !!lm.userData.hand;
  return { key: 'o|' + w + '|' + hand, material: () => outlineMaterial(w, hand) };
}

/**
 * 한 물체(집 · 가게 · 문)의 부품을 그 물체 안에서 같은 재질끼리 합친다. 재질은 그대로라 가릴 때 반투명해지는 것 · 밤 창문은 그대로 된다.
 * 외곽선은 합친 몸통의 자식으로 붙는다(여럿일 수 있다). unit: 부품들이 들어 있는 물체 그룹. 돌려주는 값: 새 부품 목록.
 * recolor(m) → { key, material, tint } 를 주면 그 규칙으로 묶는다(캐릭터 얼굴 장식처럼 색이 다른 부품을 꼭짓점 색 재질 하나로).
 * 합친 메시는 userData.merged = true.
 */
export function mergeUnit(unit, meshes, recolor = (m) => ({ key: m.material.uuid, material: m.material, tint: null })) {
  unit.updateMatrixWorld(true);
  const inv = unit.matrixWorld.clone().invert();
  const ok = (m) => m.isMesh && !m.isInstancedMesh && !Array.isArray(m.material) && !m.material.map && m.renderOrder === 0 && m.geometry.attributes.normal
    && m.children.every((c) => isOutline(c) && c.children.length === 0 && c.geometry && c.geometry.attributes.normal);
  const kept = [], groups = new Map();
  for (const m of meshes) {
    if (!ok(m)) { kept.push(m); continue; }
    const rc = recolor(m), key = [rc.key, m.castShadow, m.receiveShadow].join('|');
    if (!groups.has(key)) groups.set(key, { body: m, material: rc.material, color: false, items: [], lines: new Map() });
    const gr = groups.get(key), mat = inv.clone().multiply(m.matrixWorld);
    gr.items.push({ geometry: m.geometry, matrix: mat, tint: rc.tint });
    if (rc.tint || (m.material.vertexColors && m.geometry.attributes.color)) gr.color = true;
    for (const line of m.children) {
      const lmat = inv.clone().multiply(line.matrixWorld), { key: lk, material } = lineKey(line, lmat);
      if (!gr.lines.has(lk)) gr.lines.set(lk, { material, items: [] });
      gr.lines.get(lk).items.push({ geometry: line.geometry, matrix: lmat });
    }
  }
  const merged = [];
  for (const { body, material, color, items, lines } of groups.values()) {
    const mesh = new THREE.Mesh(mergeInto(items, { color }), material);
    mesh.userData.merged = true;
    mesh.castShadow = body.castShadow;
    mesh.receiveShadow = body.receiveShadow;
    for (const { material, items: li } of lines.values()) {
      const line = new THREE.Mesh(mergeInto(li), material());
      line.raycast = () => {};
      mesh.add(line);
    }
    merged.push(mesh);
  }
  for (const m of meshes) {
    if (kept.includes(m)) continue;
    let p = m.parent;
    p.remove(m);
    while (p && p !== unit && p.children.length === 0 && p.parent) { const up = p.parent; up.remove(p); p = up; }
  }
  for (const mesh of merged) unit.add(mesh); // unit 기준 좌표로 굳혔다
  return [...kept, ...merged];
}

/**
 * root(마을) 아래 정적 소품을 합치고, 남은 정적 물체는 위치를 굳힌다(matrixAutoUpdate 끄기). skip: 움직이는 물체(그 아래는 손대지 않는다).
 * cell: 묶음(zone) 밖 물체를 모을 칸 크기(m). 돌려주는 값: 합치기 전 · 뒤 메시 수.
 */
export function batchStatic(root, { skip = [], cell = 20 } = {}) {
  const skipSet = new Set(skip.filter(Boolean));
  root.updateMatrixWorld(true);
  const visibleUnder = (o) => { for (let a = o; a && a !== root; a = a.parent) if (!a.visible || skipSet.has(a)) return false; return true; };

  // 1) 합칠 후보 몸통
  const bodies = [];
  let before = 0;
  root.traverse((o) => { if (o.isMesh) before++; });
  root.traverse((m) => {
    if (!plainBody(m) || !visibleUnder(m)) return;
    bodies.push(m);
  });

  // 2) 담을 곳(묶음 그룹 · 아니면 칸 그룹)과 재질 · 그림자 설정으로 나눈다
  const cells = new Map();
  const cellGroup = (x, z) => {
    const k = Math.floor(x / cell) + ',' + Math.floor(z / cell);
    if (!cells.has(k)) { const g = new THREE.Group(); g.name = 'batch-cell'; root.add(g); cells.set(k, g); }
    return cells.get(k);
  };
  const holderOf = (m) => { for (let a = m.parent; a && a !== root; a = a.parent) if (isZone(a)) return a; const e = m.matrixWorld.elements; return cellGroup(e[12], e[14]); };
  const groups = new Map();
  const put = (key, holder, make, item) => {
    if (!groups.has(key)) groups.set(key, { holder, make, items: [] });
    groups.get(key).items.push(item);
  };
  const taken = [];
  for (const m of bodies) {
    const holder = holderOf(m), mat = m.material;
    // 같은 색끼리 나눠 쓰는 만화 재질(따로 바뀌지 않는다)은 색을 꼭짓점에 칠해 칸 하나에 한 메시로. 따로 바뀌는 재질(밤 창문 · 빛나는 버섯)은 재질째로
    const tinted = mat.isMeshToonMaterial && mat.userData.shared && !mat.vertexColors && mat.emissive.getHex() === 0;
    const out = tinted ? toonMaterial('#ffffff', { vertexColors: true, doubleSide: mat.side === THREE.DoubleSide }) : mat;
    put(['b', holder.uuid, out.uuid, m.castShadow, m.receiveShadow].join('|'), holder,
      (geo) => { const mesh = new THREE.Mesh(geo, out); mesh.castShadow = m.castShadow; mesh.receiveShadow = m.receiveShadow; return mesh; },
      { geometry: m.geometry, matrix: m.matrixWorld.clone(), color: tinted || !!mat.vertexColors, tint: tinted ? mat.color : null });
    for (const line of m.children) {
      // 법선으로 미는 외곽선은 월드 단위 두께로(원래는 메시 단위 두께 × 그 메시 크기), 껍질 외곽선은 그대로
      const { key, material } = lineKey(line, line.matrixWorld);
      put(holder.uuid + '|' + key, holder, (geo) => new THREE.Mesh(geo, material()), { geometry: line.geometry, matrix: line.matrixWorld.clone() });
    }
    taken.push(m);
  }

  // 3) 원래 메시를 빼고(빈 그룹도 치운다) 합친 메시를 넣는다
  for (const m of taken) {
    let p = m.parent;
    p.remove(m);
    while (p && p !== root && !isZone(p) && p.children.length === 0 && p.parent) { const up = p.parent; up.remove(p); p = up; }
  }
  for (const { holder, make, items } of groups.values()) {
    const geo = mergeInto(items, { color: items[0].color });
    const mesh = make(geo);
    if (isOutline(mesh)) { mesh.raycast = () => {}; mesh.castShadow = false; mesh.receiveShadow = false; }
    holder.add(mesh); // 묶음 · 칸 그룹은 원점에 있어 월드 좌표 그대로
  }

  // 4) 남은 정적 물체는 위치를 굳힌다(매 장면 위치 계산을 건너뛴다). 움직이는 것(skip)과 그 아래는 그대로
  root.updateMatrixWorld(true);
  const freeze = (o) => {
    if (skipSet.has(o)) return;
    o.matrixAutoUpdate = false;
    for (const c of o.children) freeze(c);
  };
  freeze(root);
  let after = 0;
  root.traverse((o) => { if (o.isMesh) after++; });
  return { before, after };
}
