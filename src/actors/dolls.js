import * as THREE from 'three';
import { celMaterial, addOutline } from '../render/toon.js';
import { buildChibi, buildNpc } from './models.js';

/**
 * 난토카바니아 인형(사이드스토리 15편 「난토카바니아」, 원작 애니 21 ~ 23화 「なんとかバニア」): 손바닥만 한 펠트 인형.
 * 그 캐릭터 모델에 멜빵바지(가슴판 · 반달 주머니 · 바짓가랑이)를 입히고, 머리 테두리에 바느질 점선을 두른 뒤 작게 줄인다.
 * 멜빵바지 색: 치이카와 분홍 · 하치와레 하늘색 · 우사기 주황(원작), 나는 연두(게임에서 정함).
 * 장면(world/nantoka.js) · 내 집 가구 「난토카바니아 인형 세트」(world/interior.js)가 쓴다.
 */
export const DOLL_SCALE = 0.3;
export const DOLL_COLORS = { chiikawa: '#f4b6c6', hachiware: '#9fc9ec', usagi: '#f4b46a', me: '#acd68c' };
const STITCH = '#5a3d36';

const vol = (m) => m.scale.x * m.scale.y * m.scale.z;
/** 마디 안에서 가장 큰 부품(합친 덩어리는 빼고 — 잠옷과 같은 기준). */
const biggest = (g) => { let b = null; (g ? g.children : []).forEach((m) => { if (m.isMesh && !m.userData.merged && (!b || vol(m) > vol(b))) b = m; }); return b; };
const darker = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;

// 몸 껍질: 아래쪽(바지)과 앞쪽 가슴판. three 의 구는 phi 가 y 축을 돌고(앞 +z 는 phi = π/2), theta 가 위(0)에서 아래(π)로 내려간다
const PANTS = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
const BIB = new THREE.SphereGeometry(1, 12, 6, Math.PI / 2 - 0.62, 1.24, Math.PI * 0.27, Math.PI * 0.25);
const POCKET = new THREE.CircleGeometry(1, 14, Math.PI, Math.PI); // 아래로 볼록한 반달
const POCKET_RIM = new THREE.TorusGeometry(1, 0.09, 4, 14, Math.PI);
const DOT = new THREE.SphereGeometry(1, 6, 4);

/**
 * 인형에 멜빵바지를 입히고 머리에 바느질 점선을 두른다(모델은 그대로 두고 껍질을 덧붙인다).
 * color: 멜빵바지 색.
 */
export function dressDoll(chibi, color) {
  const P = chibi.pivots || {}, cloth = celMaterial(color, { doubleSide: true }), deep = celMaterial(darker(color, 0.86));
  const put = (parent, geo, material, pos, scale, outline = 0.02) => {
    const m = new THREE.Mesh(geo, material);
    m.position.copy(pos);
    m.scale.copy(scale);
    if (outline) addOutline(m, outline, true);
    parent.add(m);
    return m;
  };
  const body = biggest(P.body);
  if (body) {
    const s = body.scale, at = body.position;
    put(P.body, PANTS, cloth, at, s.clone().multiplyScalar(1.07)).rotation.copy(body.rotation);
    put(P.body, BIB, cloth, at, s.clone().multiplyScalar(1.08), 0.016).rotation.copy(body.rotation);
    // 반달 주머니: 가슴판 아래쪽, 몸 앞면에 붙여서
    const th = Math.PI * 0.43, front = new THREE.Vector3(at.x, at.y + Math.cos(th) * s.y * 1.1, at.z + Math.sin(th) * s.z * 1.1);
    const pocket = put(P.body, POCKET, deep, front, new THREE.Vector3(s.x * 0.24, s.y * 0.18, 1), false);
    pocket.rotation.x = -0.25;
    const rim = put(P.body, POCKET_RIM, celMaterial(STITCH, { flat: true }), front.clone().add(new THREE.Vector3(0, 0, 0.004)), new THREE.Vector3(s.x * 0.24, s.y * 0.18, s.x * 0.24), false);
    rim.rotation.set(-0.25, 0, Math.PI);
  }
  // 바짓가랑이: 다리 부품을 바지 색 껍질로(발끝은 그대로 보이게 조금만 크게)
  const held = new Set(Object.values(chibi.props || {}).flat());
  ['legL', 'legR'].forEach((k) => (P[k] ? P[k].children : []).filter((m) => m.isMesh && !held.has(m)).forEach((m) => {
    put(P[k], m.geometry, cloth, m.position, m.scale.clone().multiplyScalar(1.12), 0.016).rotation.copy(m.rotation);
  }));
  // 머리 테두리 바느질 점선: 얼굴 둘레(앞에서 보이는 테두리)를 따라 작은 점, 목 쪽은 비운다
  const head = biggest(P.head);
  if (head) {
    const c = head.position, s = head.scale, stitch = celMaterial(STITCH, { flat: true }), n = 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.sin(a) < -0.72) continue; // 목에 닿는 아래쪽
      put(P.head, DOT, stitch, new THREE.Vector3(c.x + Math.cos(a) * s.x * 0.99, c.y + Math.sin(a) * s.y * 0.99, c.z + s.z * 0.2), new THREE.Vector3(s.x * 0.032, s.x * 0.032, s.x * 0.032), false);
    }
  }
  return chibi;
}

/** 인형 하나: kind 는 마을 친구 종류 또는 'me'(look 은 내 생김새). 몸짓은 animateChibi 로(마디가 그대로라 같이 움직인다). */
export function buildDoll(kind, look = null) {
  const c = kind === 'me' ? buildChibi(look) : buildNpc(kind);
  Object.values(c.props || {}).flat().forEach((m) => { m.visible = false; }); // 들고 다니는 소품 · 칼은 빼고
  dressDoll(c, DOLL_COLORS[kind] || DOLL_COLORS.me);
  c.root.scale.setScalar(DOLL_SCALE);
  c.doll = kind;
  return c;
}

// 내 집 가구 「난토카바니아 인형 세트」에 넣을 내 생김새(가구 모델은 상태를 모르니 main 이 알려 준다)
let lookOf = () => null;
/** 가구의 내 인형이 쓸 생김새를 어디서 읽을지(main: () => 내 생김새). */
export function setDollLook(fn) { lookOf = typeof fn === 'function' ? fn : () => null; }
/** 가구용: 지금 내 생김새. */
export const dollLook = () => lookOf();
