import * as THREE from 'three';

/**
 * 날씨: 비. 카메라 둘레(따라다니는 상자)에 가는 빗줄기가 바람에 비스듬히 떨어지고, 땅에 닿은 자리에는 물방울 고리가 퍼진다.
 * 켜고 끌 때는 천천히 짙어지고 걷힌다(rain: 0 ~ 1). main 은 rain 만큼 하늘 · 해 · 캐릭터 빛을 어둡고 잿빛으로 바꾼다.
 * 지금은 사이드스토리 '검은 별똥별'의 비 오는 아침에 쓴다(stories/blackstar.js 가 setRain).
 * 눈(겨울): 하얀 눈송이가 천천히, 좌우로 살랑살랑 흔들리며 내린다. 비와 같이 천천히 짙어지고 걷힌다(snow: 0 ~ 1). 점(Points) 하나로 한 번에 그린다.
 * → { setRain(on), rain, setSnow(on), snow, update(dt, center) }
 */
const N = 2200; // 빗줄기 수
const AREA = 30; // 둘레 상자 한 변(카메라 앞뒤로 넉넉히)
const TOP = 15; // 빗줄기가 생기는 높이
const LEN = 0.55; // 빗줄기 길이
const WIND = 0.22; // 떨어지는 만큼 옆으로 밀리는 비율(비스듬히)
const SPLASHES = 48;
const SNOW_N = 1500; // 눈송이 수
const SNOW_AREA = 28; // 눈이 내리는 둘레 상자 한 변
const SNOW_TOP = 11; // 눈송이가 생기는 높이

/** 눈송이 무늬: 가장자리가 부드러운 하얀 동그라미(16 × 16). */
function flakeTexture() {
  const S = 16, data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - (S - 1) / 2, y - (S - 1) / 2) / (S / 2);
    data.set([255, 255, 255, Math.round(255 * Math.max(0, Math.min(1, (1 - d) * 2.4)))], (y * S + x) * 4);
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createWeather(scene) {
  const pos = new Float32Array(N * 6);
  const drops = Array.from({ length: N }, () => ({ dx: (Math.random() - 0.5) * AREA, dz: (Math.random() - 0.5) * AREA, y: Math.random() * TOP, v: 16 + Math.random() * 6 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xdde6f5, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);
  // 물방울 고리: 땅에 닿은 자리에서 퍼지며 옅어진다
  const ringGeo = new THREE.RingGeometry(0.7, 1, 18).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: SPLASHES }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xdfe8f5, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    return { m, t: 1 + Math.random() };
  });
  let target = 0, k = 0, nextRing = 0;

  // 눈: 점마다 눈송이 하나. 카메라 바로 앞 눈송이가 화면을 덮는 큰 얼룩이 되지 않게 화면에서의 크기에 위 한계를 둔다
  const snowPos = new Float32Array(SNOW_N * 3);
  const flakes = Array.from({ length: SNOW_N }, () => ({
    dx: (Math.random() - 0.5) * SNOW_AREA, dz: (Math.random() - 0.5) * SNOW_AREA, y: Math.random() * SNOW_TOP,
    v: 0.9 + Math.random() * 1.0, ph: Math.random() * Math.PI * 2, amp: 0.25 + Math.random() * 0.45
  }));
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.13, map: flakeTexture(), transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  snowMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <logdepthbuf_vertex>', `gl_PointSize = min(gl_PointSize, scale * 0.028);
#include <logdepthbuf_vertex>`);
  };
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.frustumCulled = false;
  snowPoints.visible = false;
  scene.add(snowPoints);
  let snowTarget = 0, ks = 0, st = 0;
  /** 눈송이를 내리고 자리를 적는다. */
  function updateSnow(dt, center) {
    ks += (snowTarget - ks) * Math.min(1, dt * 1.2);
    const on = ks > 0.01;
    snowPoints.visible = on;
    if (!on) return;
    st += dt;
    snowMat.opacity = 0.95 * ks;
    const cx = center.x, cz = center.z;
    for (let i = 0; i < SNOW_N; i++) {
      const f = flakes[i];
      f.y -= f.v * dt;
      if (f.y < 0) { // 땅에 닿았다: 위에서 다시
        f.y += SNOW_TOP;
        f.dx = (Math.random() - 0.5) * SNOW_AREA;
        f.dz = (Math.random() - 0.5) * SNOW_AREA;
      }
      const j = i * 3;
      snowPos[j] = cx + f.dx + Math.sin(st * 0.8 + f.ph) * f.amp;
      snowPos[j + 1] = f.y;
      snowPos[j + 2] = cz + f.dz + Math.cos(st * 0.6 + f.ph * 1.3) * f.amp;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  return {
    /** 비를 켜고 끈다(천천히 짙어지고 걷힌다). */
    setRain(on) { target = on ? 1 : 0; },
    /** 지금 비의 세기 0 ~ 1(하늘 · 빛을 어둡게 하는 데 쓴다). */
    get rain() { return k; },
    /** 눈을 켜고 끈다(천천히 짙어지고 걷힌다). */
    setSnow(on) { snowTarget = on ? 1 : 0; },
    /** 지금 눈의 세기 0 ~ 1. */
    get snow() { return ks; },
    /** center: 비를 둘러칠 곳(카메라가 보는 내 캐릭터). */
    update(dt, center) {
      updateSnow(dt, center);
      k += (target - k) * Math.min(1, dt * 1.2);
      const on = k > 0.01;
      lines.visible = on;
      if (!on) { rings.forEach((r) => { r.m.visible = false; }); return; }
      mat.opacity = 0.78 * k;
      const cx = center.x, cz = center.z;
      for (let i = 0; i < N; i++) {
        const d = drops[i];
        d.y -= d.v * dt;
        if (d.y < 0) { // 땅에 닿았다: 위로 다시, 가끔 그 자리에 물방울 고리
          if (Math.abs(d.dx) < 9 && Math.abs(d.dz) < 9 && Math.random() < 0.08) {
            const r = rings[nextRing++ % SPLASHES];
            r.t = 0;
            r.m.position.set(cx + d.dx, 0.03, cz + d.dz);
          }
          d.y += TOP + Math.random() * 2;
          d.dx = (Math.random() - 0.5) * AREA;
          d.dz = (Math.random() - 0.5) * AREA;
        }
        const x = cx + d.dx + d.y * WIND, z = cz + d.dz, j = i * 6;
        pos[j] = x + LEN * WIND; pos[j + 1] = d.y + LEN; pos[j + 2] = z;
        pos[j + 3] = x; pos[j + 4] = d.y; pos[j + 5] = z;
      }
      geo.attributes.position.needsUpdate = true;
      for (const r of rings) {
        r.t += dt;
        const u = r.t / 0.5;
        r.m.visible = u < 1;
        if (u >= 1) continue;
        r.m.scale.setScalar(0.06 + u * 0.22);
        r.m.material.opacity = (1 - u) * 0.7 * k;
      }
    }
  };
}
