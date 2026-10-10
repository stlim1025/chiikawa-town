import * as THREE from 'three';
import { buildChibi, animateChibi } from '../actors/models.js';
import { setCelLight } from '../render/toon.js';

const W = 240, H = 300; // 증명사진 4:5
const cache = new Map();

/** 보이는 부품만으로 감싼 상자(숨겨 둔 소품 — 손에 드는 불 같은 — 은 빼고). */
function visibleBox(root) {
  const box = new THREE.Box3();
  (function walk(o) {
    if (!o.visible) return;
    if (o.isMesh) box.expandByObject(o, false);
    else o.children.forEach(walk);
  })(root);
  return box;
}

/**
 * 자격증 사진: 내 캐릭터를 정면에서 가슴 위까지 찍은 증명사진(PNG 데이터 URL). 모습이 같으면 한 번만 그린다.
 * 귀 · 모자가 길어도 머리 꼭대기에 맞춰 잘리지 않게 찍는다. WebGL 을 쓸 수 없으면 null(카드에 빈 사진 칸).
 */
export function playerPortrait(look) {
  const key = JSON.stringify(look || {});
  if (cache.has(key)) return cache.get(key);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c4a5, 1.4));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
  sun.position.set(1.5, 4, 5);
  scene.add(sun);
  const chibi = buildChibi(look);
  animateChibi(chibi, 'idle', 0, {});
  scene.add(chibi.root);
  chibi.root.updateMatrixWorld(true);
  const box = visibleBox(chibi.root);
  // 위는 머리 꼭대기에서 조금 띄우고, 아래는 가슴께까지 — 너무 짧으면(작은 귀) 아래로 늘려 얼굴이 한가운데 오게
  const top = box.max.y + 0.06, span = Math.max(top - 0.2, 0.92 * (H / W));
  const cy = top - span / 2;
  const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 30);
  const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.set(0, cy + 0.12, box.max.z + dist);
  camera.lookAt(0, cy, 0);
  setCelLight(new THREE.Color(1, 1, 1)); // 마을이 밤이어도 사진은 밝게(다음 프레임에 마을 빛으로 돌아간다)
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(chibi.root);
  renderer.forceContextLoss();
  renderer.dispose();
  cache.set(key, url);
  return url;
}
