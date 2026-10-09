import * as THREE from 'three';
import { furnitureModel } from './interior.js';
import { FURNITURE } from '../core/home.js';
import { setCelLight } from '../render/toon.js';

let cache = null;

/**
 * 가구마다 작은 그림(PNG 데이터 URL)을 한 번만 그려 둔다. 가구점 목록과 집 안 가구 쟁반에서 쓴다.
 * WebGL 을 쓸 수 없으면 빈 객체를 돌려준다(그림 없이 이름만 보인다).
 */
export function furnitureThumbs() {
  if (cache) return cache;
  cache = {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return cache;
  }
  renderer.setSize(128, 128, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c4a5, 1.4));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.3);
  sun.position.set(2, 5, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  const view = new THREE.Vector3(1.35, 1.07, 1.9).normalize(); // 모든 가구를 같은 각도(비스듬히 위)에서 본다
  const box = new THREE.Box3(), center = new THREE.Vector3(), size = new THREE.Vector3();
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  setCelLight(new THREE.Color(1, 1, 1)); // 인형(먼작귀)은 밝게
  for (const id of Object.keys(FURNITURE)) {
    const model = furnitureModel(id);
    scene.add(model);
    // 작은 가구(인형, 방석)도 그림을 꽉 채우게 크기에 맞춰 카메라를 당긴다
    box.setFromObject(model);
    box.getCenter(center);
    const r = Math.max(0.2, box.getSize(size).length() / 2);
    camera.position.copy(center).addScaledVector(view, (r / Math.sin(halfFov)) * 0.88);
    camera.lookAt(center);
    renderer.render(scene, camera);
    cache[id] = renderer.domElement.toDataURL('image/png');
    scene.remove(model);
  }
  renderer.forceContextLoss();
  renderer.dispose();
  return cache;
}
