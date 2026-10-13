import * as THREE from 'three';
import { loadPhotos } from '../core/photostore.js';
import { sketchPhoto } from '../ui/photos.js';

/**
 * 흔들린 사진 액자(사이드스토리 '하치와레의 카메라' 선물)의 사진: 그날 찍은 마지막 단체 사진(이 브라우저에 남아 있으면)을
 * 살짝 번지게, 없으면 셋이 나란히 선 흔들린 사진 그림으로. 액자가 몇 개든 그림 하나를 같이 쓴다.
 */
const W = 160, H = 120;
let canvas = null, tex = null;

function draw() {
  const g = canvas.getContext('2d');
  sketchPhoto(g, W, H, 3);
  tex.needsUpdate = true;
  const url = loadPhotos().at(-1);
  if (!url) return;
  const img = new Image();
  img.onload = () => {
    g.save();
    try { g.filter = 'blur(0.8px)'; } catch { /* 번지게 못 그리면 또렷하게 */ }
    g.drawImage(img, 0, 0, W, H);
    g.globalAlpha = 0.4; // 흔들림: 조금 비켜난 같은 사진을 반투명하게
    g.drawImage(img, 3, -2, W, H);
    g.restore();
    tex.needsUpdate = true;
  };
  img.src = url;
}

/** 액자 속 사진 텍스처(처음 부를 때 만든다). */
export function photoFrameTexture() {
  if (tex) return tex;
  canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  draw();
  return tex;
}

/** 새로 찍은 사진으로 다시 그린다(아직 만든 적 없으면 그만). */
export function refreshPhotoFrame() {
  if (tex) draw();
}
