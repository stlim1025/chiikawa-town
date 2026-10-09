import * as THREE from 'three';

/**
 * 바닥에 떨어진 물건 그리기: 가방에서 보던 그 물건 그림이 바닥에 서서 살랑살랑 떠 있다(잡초면 잡초, 열매면 열매, 무기면 무기).
 * 그림은 늘 카메라를 보는 판(스프라이트)이고, 테두리를 하얗게 둘러 풀밭에서도 잘 보이게 한다. 발밑에는 동그란 그림자.
 * sync(state.ground) 로 목록에 맞춰 만들고 지우고, nearest 로 주울 것을 찾는다.
 * artOf(e): 그 물건의 그림(SVG 문자열). 물건마다 한 번만 그려 두고 같이 쓴다.
 */
const SIZE = 128;
const textures = new Map(); // 그림 열쇠 → CanvasTexture
/** SVG 그림을 판 그림(텍스처)으로: 바닥 그림자 타원은 빼고, 하얀 테두리를 둘러 그린다. 다 그려지면 텍스처가 바뀐다. */
function textureOf(key, svg) {
  if (textures.has(key)) return textures.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, tex);
  const img = new Image();
  img.onload = () => {
    const c = canvas.getContext('2d'), pad = 10, s = SIZE - pad * 2;
    c.clearRect(0, 0, SIZE, SIZE);
    // 하얀 테두리: 그림을 둘레로 조금씩 밀어 하얗게 찍은 뒤 그 위에 진짜 그림
    const white = document.createElement('canvas');
    white.width = white.height = SIZE;
    const w = white.getContext('2d');
    w.drawImage(img, pad, pad, s, s);
    w.globalCompositeOperation = 'source-in';
    w.fillStyle = '#ffffff';
    w.fillRect(0, 0, SIZE, SIZE);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.drawImage(white, Math.cos(a) * 4, Math.sin(a) * 4); }
    c.drawImage(img, pad, pad, s, s);
    tex.needsUpdate = true;
  };
  img.src = svgDataUrl(svg, true);
  return tex;
}
/**
 * SVG 글을 그림 주소(data URL)로. 화면 그림(innerHTML)은 같은 속성이 두 번 있어도(예: stroke-width) 너그럽게 그리지만
 * 그림 파일로 읽을 때는 한 글자만 어긋나도 아예 안 그려지므로, HTML 처럼 한 번 읽어 바로잡은 뒤 다시 적는다.
 * noShadow 면 그림 속 바닥 그림자 타원(#e6d8b8)을 뺀다(진짜 그림자를 따로 깐다).
 */
export function svgDataUrl(svg, noShadow = false) {
  const tpl = document.createElement('template');
  tpl.innerHTML = svg.trim();
  const el = tpl.content.querySelector('svg');
  if (!el) return '';
  if (noShadow) el.querySelectorAll('ellipse[fill="#e6d8b8"]').forEach((e) => { if (+e.getAttribute('cy') >= 54) e.remove(); });
  el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  el.setAttribute('width', SIZE);
  el.setAttribute('height', SIZE);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(el));
}
const shadowGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x2b2224, transparent: true, opacity: 0.18, depthWrite: false });

export function createGround(scene, artOf) {
  const items = new Map(); // g → { e, root, pic, born }
  let t = 0;

  function build(e) {
    const root = new THREE.Group();
    const key = (e.weapon ? 'w:' : 'i:') + e.id;
    const pic = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureOf(key, artOf(e)), alphaTest: 0.2 }));
    pic.center.set(0.5, 0.12); // 그림 아래쪽이 바닥 가까이
    pic.scale.set(0.72, 0.72, 1);
    root.add(pic);
    const sh = new THREE.Mesh(shadowGeo, shadowMat);
    sh.position.y = 0.02;
    sh.scale.setScalar(0.24);
    sh.renderOrder = 1;
    root.add(sh);
    root.position.set(e.x, 0, e.z);
    scene.add(root);
    return { e, root, pic, sh, born: 0 };
  }

  return {
    /** 목록(state.ground)에 맞춘다. */
    sync(list) {
      const seen = new Set();
      for (const e of list) {
        seen.add(e.g);
        const it = items.get(e.g);
        if (it) { it.e = e; continue; }
        items.set(e.g, build(e));
      }
      for (const [g, it] of items) if (!seen.has(g)) { scene.remove(it.root); it.pic.material.dispose(); items.delete(g); }
    },
    /** (x, z) 에서 maxDist 안의 가장 가까운 떨어진 물건. */
    nearest(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const it of items.values()) {
        const d = Math.hypot(it.e.x - x, it.e.z - z);
        if (d < bd) { bd = d; best = it.e; }
      }
      return best;
    },
    /** 둥실둥실 · 떨어질 때 톡 튀며 나타난다. focus 에서 먼 것은 그리지 않는다. */
    update(dt, focus) {
      t += dt;
      for (const it of items.values()) {
        const far = focus && Math.hypot(it.e.x - focus.x, it.e.z - focus.z) > 50;
        it.root.visible = !far;
        if (far) continue;
        let y = 0.06 + Math.sin(t * 2.4 + it.e.g) * 0.04, k = 1;
        if (it.born < 1) {
          it.born = Math.min(1, it.born + dt * 3);
          k = 0.4 + 0.6 * it.born;
          y += Math.sin(it.born * Math.PI) * 0.45;
        }
        it.pic.position.y = y;
        it.pic.scale.set(0.72 * k, 0.72 * k, 1);
        it.sh.scale.setScalar(0.24 * (1 - y * 0.6));
      }
    }
  };
}
