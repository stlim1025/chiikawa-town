import * as THREE from 'three';

/** 외곽선 색. */
export const LINE_COLOR = 0x2b2224;
/**
 * 가려진 몬스터 실루엣(monsters.js 의 ghostMat 은 스텐실이 1 이 아닌 곳에만 칠한다)이 칠해지지 않게 남기는 표시.
 * 외곽선(몬스터 제 테두리 · 다른 물체의 선)과 캐릭터 몸에 남겨, 탁 트인 곳 몬스터 둘레 · 안쪽 선에 빨간 테두리가 끼거나
 * 내 캐릭터 몸 위로 몬스터 실루엣이 비치지 않게 한다(나무 · 집 같은 몸통 뒤에 가린 곳에만 실루엣).
 */
const NO_GHOST = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp };

let gradient = null;
/** 명암을 3단으로 끊는 그라디언트 텍스처(공유). */
function gradientMap() {
  if (gradient) return gradient;
  gradient = new THREE.DataTexture(new Uint8Array([155, 212, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const toonCache = new Map();
/** 만화풍 재질. 같은 색은 재사용한다. opts: { vertexColors, emissive, unique } */
export function toonMaterial(color, opts = {}) {
  const key = [color, opts.vertexColors ? 'vc' : '', opts.emissive || '', opts.doubleSide ? 'ds' : ''].join('|');
  if (!opts.unique && toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), vertexColors: !!opts.vertexColors, side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  if (!opts.unique) toonCache.set(key, m);
  return m;
}

const flatCache = new Map();
/** 명암 없는 단색 재질(눈, 볼, 입처럼 작은 얼굴 부품). */
export function flatMaterial(color) {
  if (!flatCache.has(color)) flatCache.set(color, new THREE.MeshBasicMaterial({ color }));
  return flatCache.get(color);
}

// ---------- 캐릭터용 2D 손그림 재질 ----------
/** 캐릭터에 곱하는 빛 색(낮은 흰색, 밤은 푸르스름). 모든 캐릭터 재질이 나눠 쓴다. */
const celLight = { value: new THREE.Color(1, 1, 1) };
/** 캐릭터 빛 색을 바꾼다. main 은 하늘에 맞춰, 캐릭터 만들기 미리보기는 흰색으로 그리기 직전에 부른다. */
export function setCelLight(color) { celLight.value.copy(color); }

const CEL_VERT = `
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
varying vec3 vN;
void main() {
  #include <color_vertex>
  vN = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
// 단색 칠 + 화면 오른쪽 아래에만 연보라 그늘 한 단계. 빛을 화면 기준으로 두어 어느 쪽을 봐도 그림처럼 같은 자리에 그늘이 진다.
const CEL_FRAG = `
uniform vec3 uColor;
uniform vec3 uLight;
uniform float uShade;
#include <common>
#include <color_pars_fragment>
#include <fog_pars_fragment>
varying vec3 vN;
void main() {
  vec3 base = uColor;
  #ifdef USE_COLOR
    base *= vColor;
  #endif
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  float lit = smoothstep(-0.36, -0.28, dot(n, normalize(vec3(-0.55, 0.7, 0.45))));
  vec3 shade = base * vec3(0.86, 0.85, 0.95);
  vec3 col = mix(mix(base, shade, uShade), base, lit) * uLight;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const celCache = new Map();
/**
 * 2D 손그림 느낌의 캐릭터 재질: 빛에 따라 둥글게 번지는 명암 없이 단색으로 칠한다.
 * opts: { vertexColors, doubleSide, flat (그늘 없이 단색: 눈·볼·입) }
 */
export function celMaterial(color, opts = {}) {
  const key = [color, opts.vertexColors ? 'vc' : '', opts.doubleSide ? 'ds' : '', opts.flat ? 'f' : ''].join('|');
  if (celCache.has(key)) return celCache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) }, uShade: { value: opts.flat ? 0 : 1 } }]),
    vertexShader: CEL_VERT,
    fragmentShader: CEL_FRAG,
    vertexColors: !!opts.vertexColors,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    fog: true,
    ...NO_GHOST
  });
  m.uniforms.uLight = celLight; // merge 는 값을 복제하므로 공유 빛은 나중에 붙인다
  celCache.set(key, m);
  return m;
}

const outlineCache = new Map();
/**
 * 정점을 법선 방향으로 밀어낸 뒷면만 그리는 외곽선 재질. thickness 는 메시 로컬 단위.
 * hand 면 붓펜으로 그은 듯 굵기가 조금씩 들쭉날쭉하고 아래쪽이 더 굵다.
 */
function outlineMaterial(thickness, hand = false) {
  const key = (hand ? 'hand:' : '') + thickness;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new THREE.MeshBasicMaterial({ color: LINE_COLOR, side: THREE.BackSide, ...NO_GHOST });
  const push = hand
    ? `float wob = 0.8 + 0.4 * (0.5 + 0.5 * sin(position.x * 5.0 + position.y * 3.0) * sin(position.z * 4.0 - position.y * 3.0 + 1.3));
float press = 1.0 + 0.3 * clamp(-normal.y, 0.0, 1.0);
float far = clamp(-(modelViewMatrix * vec4(position, 1.0)).z / 9.0, 1.0, 1.8); // 멀리서 봐도 그림처럼 선 굵기가 비슷하게
transformed += normalize(normal) * uThickness * wob * press * far;`
    : 'transformed += normalize(normal) * uThickness;';
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uThickness = { value: thickness };
    shader.vertexShader = 'uniform float uThickness;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + push);
  };
  m.customProgramCacheKey = () => (hand ? 'toon-outline-hand' : 'toon-outline');
  outlineCache.set(key, m);
  return m;
}

/** mesh 에 외곽선 자식 메시를 붙인다. world 는 대략적인 월드 두께, hand 는 손그림 선, geometry 는 외곽선 모양(겉모양만 같으면 더 성긴 도형). */
export function addOutline(mesh, world = 0.035, hand = false, geometry = mesh.geometry) {
  const s = (Math.abs(mesh.scale.x) + Math.abs(mesh.scale.y) + Math.abs(mesh.scale.z)) / 3 || 1;
  const o = new THREE.Mesh(geometry, outlineMaterial(Math.round((world / s) * 1000) / 1000, hand));
  o.raycast = () => {};
  o.castShadow = false;
  o.receiveShadow = false;
  mesh.add(o);
  return o;
}

const shellMaterial = new THREE.MeshBasicMaterial({ color: LINE_COLOR, side: THREE.BackSide, ...NO_GHOST });
/** 상자·지붕처럼 각진 메시용 외곽선: 살짝 키운 뒷면 껍질. world 는 월드 두께. */
export function addShellOutline(mesh, world = 0.035) {
  const o = new THREE.Mesh(mesh.geometry, shellMaterial);
  const sx = Math.abs(mesh.scale.x) || 1, sy = Math.abs(mesh.scale.y) || 1, sz = Math.abs(mesh.scale.z) || 1;
  o.scale.set(1 + (2 * world) / sx, 1 + (2 * world) / sy, 1 + (2 * world) / sz);
  o.raycast = () => {};
  mesh.add(o);
  return o;
}

/**
 * 공유 기본 도형. 구는 화면에서 가장 큰 머리도 외곽선이 매끈해 보일 만큼만 나눈다(예전 28×18 은 한 화면 80만 ~ 150만 삼각형의 주범).
 * sphereMid: 숲 나무 · 바위처럼 수백 개 깔리는 것용, sphereLow · speck: 손 · 단추 · 꽃처럼 작은 것용.
 */
export const GEO = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  sphereMid: new THREE.SphereGeometry(1, 16, 10),
  sphereLow: new THREE.SphereGeometry(1, 12, 8),
  dot: new THREE.SphereGeometry(1, 10, 7),
  speck: new THREE.SphereGeometry(1, 6, 4),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 18).translate(0, 0.5, 0),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0)
};

/**
 * 만화풍 메시를 만든다.
 * opts: { outline: 월드 두께 | false, shadow: boolean, receive: boolean, material }
 */
const SMALL_SPHERE = 0.09; // 이보다 작은 구는 화면에서 몇 픽셀이라 성긴 구로 그린다
export function toonMesh(geometry, color, opts = {}) {
  const small = geometry === GEO.sphere && opts.scale && Math.max(...opts.scale.map(Math.abs)) < SMALL_SPHERE;
  const mesh = new THREE.Mesh(small ? GEO.sphereLow : geometry, opts.material || toonMaterial(color));
  if (opts.position) mesh.position.set(...opts.position);
  if (opts.scale) mesh.scale.set(...opts.scale);
  if (opts.rotation) mesh.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2], 'YXZ');
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = !!opts.receive;
  if (opts.outline !== false) {
    if (opts.shell) addShellOutline(mesh, opts.outline || 0.035);
    else addOutline(mesh, opts.outline || 0.035);
  }
  return mesh;
}

/**
 * 같은 도형을 여러 자리에 한 번에 그리는 만화풍 인스턴스 메시. 외곽선도 인스턴스로 함께 그린다.
 * matrices: THREE.Matrix4 배열(월드 좌표). opts: { outline: 월드 두께 | false, shell: 각진 도형이면 true, shadow, receive, material }
 * → THREE.Group(메시 + 외곽선). 숲의 나무 · 바위 · 울타리처럼 수백 개를 그리기 호출 몇 번으로 그린다.
 */
export function toonInstances(geometry, color, matrices, opts = {}) {
  const group = new THREE.Group();
  const count = matrices.length;
  if (!count) return group;
  const mesh = new THREE.InstancedMesh(geometry, opts.material || toonMaterial(color), count);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = !!opts.receive;
  mesh.computeBoundingSphere();
  group.add(mesh);
  if (opts.outline !== false) {
    const w = opts.outline || 0.035;
    let line;
    if (opts.shell) {
      // 각진 도형: 인스턴스마다 크기에 맞춰 살짝 키운 뒷면 껍질
      line = new THREE.InstancedMesh(geometry, shellMaterial, count);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), m2 = new THREE.Matrix4();
      matrices.forEach((m, i) => {
        m.decompose(p, q, s);
        s.set(s.x + 2 * w, s.y + 2 * w, s.z + 2 * w);
        line.setMatrixAt(i, m2.compose(p, q, s));
      });
    } else {
      // 둥근 도형: 법선 방향으로 민 외곽선(두께는 인스턴스 평균 크기로 맞춘다)
      const s = new THREE.Vector3();
      const avg = matrices.reduce((a, m) => { s.setFromMatrixScale(m); return a + (s.x + s.y + s.z) / 3; }, 0) / count || 1;
      line = new THREE.InstancedMesh(geometry, outlineMaterial(Math.round((w / avg) * 1000) / 1000, true), count);
      line.instanceMatrix = mesh.instanceMatrix;
    }
    line.castShadow = false;
    line.raycast = () => {};
    line.computeBoundingSphere();
    group.add(line);
  }
  return group;
}
