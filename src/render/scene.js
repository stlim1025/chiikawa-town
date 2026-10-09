import * as THREE from 'three';

/** 렌더러, 장면, 빛을 만든다. 휴대폰이면 그림자와 해상도를 낮춘다. */
export function createScene(canvas) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
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

  return {
    renderer, scene, sun, hemi, coarse, resize, followSun, setSky,
    render: (camera) => { sky.position.copy(camera.position); renderer.render(scene, camera); }
  };
}
