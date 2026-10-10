import * as THREE from 'three';

/** 렌더러, 장면, 빛을 만든다. 휴대폰이면 그림자와 해상도를 낮춘다. */
export function createScene(canvas) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true }); // stencil: 가려진 몬스터 실루엣
  const pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  // 장면 자체는 움직이지 않는다: 켜 두면 매 장면 '위치 다시 계산' 신호가 꼭대기부터 모든 물체로 번져 굳혀 둔 정적 물체까지 다시 계산했다
  scene.matrixAutoUpdate = false;
  // 숨긴 꼭대기 물체(뽑힌 풀 · 따 간 열매 같은 것 수백 개)는 매 장면 위치 계산 순회에서 뺀다. 장면이 움직이지 않으니
  // 다시 보일 때 제 위치 계산만으로 맞는다. 통째로 다시(force)일 때는 원래대로 다 돈다
  const updateAll = scene.updateMatrixWorld;
  scene.updateMatrixWorld = function (force) {
    if (force || this.matrixWorldNeedsUpdate) return updateAll.call(this, force);
    for (const c of this.children) if (c.visible && c.matrixWorldAutoUpdate) c.updateMatrixWorld(false);
  };
  scene.background = new THREE.Color(0xd9eef7);
  scene.fog = new THREE.Fog(0xe2f5fb, 46, 125);

  // 하늘: 위는 진한 하늘색, 지평선은 연한 색인 그라데이션 돔(카메라를 따라다닌다)
  const skyUniforms = { top: { value: new THREE.Color('#78c3f1') }, bottom: { value: new THREE.Color('#e2f5fb') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vDir;\nvoid main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top;\nuniform vec3 bottom;\nvarying vec3 vDir;\nvoid main(){\n  float h = clamp(vDir.y * 2.2 + 0.06, 0.0, 1.0);\n  gl_FragColor = vec4(mix(bottom, top, h), 1.0);\n  #include <colorspace_fragment>\n}'
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xeaf6ff, 0xc9e8b0, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
  sun.position.set(10, 20, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /** 캔버스 크기에 맞춘다. 화면 비율을 돌려준다. */
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
    return w / h;
  }

  // 화면이 버벅이면(느린 프레임이 3초 넘게 쌓이면) 해상도를 0.25 씩 낮춘다(1 까지). 다시 올리지는 않는다: 오르내림을 되풀이하지 않게
  // 느림 기준은 기대 간격의 1.45 배(60fps 면 24ms, 절전 30fps 면 48ms): 절전으로 일부러 늦춘 간격을 버벅임으로 보지 않게
  const SLOW_FACTOR = 1.45, SLOW_BUDGET_MS = 3000;
  let ratio = pixelRatio, slow = 0;
  function adapt(frameMs, targetMs = 1000 / 60) {
    if (!(frameMs > 0) || frameMs > 250) return; // 탭을 오갔을 때처럼 튄 값은 빼고
    slow = frameMs > targetMs * SLOW_FACTOR ? slow + frameMs : Math.max(0, slow - frameMs * 0.5);
    if (slow < SLOW_BUDGET_MS || ratio <= 1) return;
    slow = 0;
    ratio = Math.max(1, ratio - 0.25);
    renderer.setPixelRatio(ratio);
    const size = renderer.getSize(new THREE.Vector2());
    renderer.setSize(size.x, size.y, false);
  }

  /** 해를 target 근처에 두어 그림자를 선명하게 한다. */
  function followSun(x, z) {
    sun.position.set(x + 10, 20, z + 8);
    sun.target.position.set(x, 0, z);
  }

  /** 하늘 위·지평선 색을 바꾼다. 안개와 배경은 지평선 색을 따른다. */
  function setSky(top, horizon) {
    skyUniforms.top.value.copy(top);
    skyUniforms.bottom.value.copy(horizon);
    scene.fog.color.copy(horizon);
    scene.background.copy(horizon);
  }

  // 그림자 맵: 카메라가 멈춰 있으면 두 장면에 한 번만 다시 그린다(서 있을 때 그림자 그리기 절반 — 친구가 걸어도 한 장면 늦는 건 2cm 남짓).
  // 카메라가 움직이거나, 그림자 범위 안 캐릭터 · 몬스터(장면 꼭대기 물체)가 지난 그림자 뒤로 3cm 넘게 움직였으면 매번
  // (카메라를 세워 둔 연출 · 달려오는 몬스터도 그림자가 몸에서 3cm 넘게 늦지 않게)
  const SHADOW_SLACK = 0.03, SHADOW_REACH = 22;
  const lastCam = new THREE.Matrix4(), lastPos = new WeakMap();
  let shadowTick = 0;
  function shadowDue(camera) {
    camera.updateMatrixWorld();
    const a = camera.matrixWorld.elements, b = lastCam.elements;
    let due = (++shadowTick & 1) === 0;
    for (let i = 0; i < 16 && !due; i++) due = Math.abs(a[i] - b[i]) > 1e-4;
    const cx = sun.target.position.x, cz = sun.target.position.z;
    for (let i = 0, kids = scene.children; i < kids.length && !due; i++) {
      const c = kids[i], p = c.position, q = lastPos.get(c);
      if (!c.visible || !c.matrixAutoUpdate || Math.abs(p.x - cx) > SHADOW_REACH || Math.abs(p.z - cz) > SHADOW_REACH) continue;
      due = !q || Math.abs(q.x - p.x) + Math.abs(q.y - p.y) + Math.abs(q.z - p.z) > SHADOW_SLACK;
    }
    if (!due) return false;
    lastCam.copy(camera.matrixWorld);
    for (const c of scene.children) if (c.visible && c.matrixAutoUpdate) { const q = lastPos.get(c); if (q) q.copy(c.position); else lastPos.set(c, c.position.clone()); }
    return true;
  }

  return {
    renderer, scene, sun, hemi, coarse, resize, followSun, setSky, adapt,
    get pixelRatio() { return ratio; },
    render: (camera) => {
      sky.position.copy(camera.position);
      renderer.shadowMap.autoUpdate = shadowDue(camera);
      try { renderer.render(scene, camera); } finally { renderer.shadowMap.autoUpdate = true; } // 다른 장면(클럽 · 미리보기)은 늘 그대로
    }
  };
}
