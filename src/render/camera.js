import * as THREE from 'three';

// 동물의 숲처럼: 가까이 당기면 카메라가 낮게 누워 캐릭터가 크게, 멀리 빼면 위에서 내려다본다.
const MIN_DIST = 5.5, MAX_DIST = 18;
const LOW = (26 * Math.PI) / 180, HIGH = (50 * Math.PI) / 180;
const LEAD = 1.1; // 캐릭터보다 조금 앞(북쪽)을 바라봐서 캐릭터가 화면 약간 아래에 오게
const pitchFor = (d) => LOW + (HIGH - LOW) * ((d - MIN_DIST) / (MAX_DIST - MIN_DIST));

/** 비스듬히 뒤에서 내 캐릭터를 따라가는 카메라. */
export function createFollowCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 300);
  const target = new THREE.Vector3();
  let dist = 8.5, placed = false;

  function place() {
    const p = pitchFor(dist);
    camera.position.set(target.x, target.y + Math.sin(p) * dist, target.z + Math.cos(p) * dist);
    camera.lookAt(target.x, target.y + 0.9, target.z - LEAD);
  }

  return {
    camera,
    /** 따라가기 카메라가 (x, z) 를 볼 때의 위치와 시선. 연출에서 섞어 쓰기 위해 계산만 한다. */
    poseFor(x, z, d = dist) {
      const p = pitchFor(d);
      return {
        pos: new THREE.Vector3(x, Math.sin(p) * d, z + Math.cos(p) * d),
        look: new THREE.Vector3(x, 0.9, z - LEAD)
      };
    },
    /** 카메라를 직접 놓는다(타이틀, 입장 연출). */
    set(pos, look) {
      camera.position.copy(pos);
      camera.lookAt(look);
    },
    /** 연출이 끝나면 따라가기 대상을 맞춰 끊김 없이 이어 간다. */
    snap(p) {
      target.set(p.x, 0, p.z);
      placed = true;
      place();
    },
    /** 대상 위치 {x, z} 를 부드럽게 따라간다. */
    follow(p, dt) {
      const k = placed ? 1 - Math.exp(-dt * 6) : 1;
      placed = true;
      target.x += (p.x - target.x) * k;
      target.z += (p.z - target.z) * k;
      place();
    },
    /** 거리 배율로 확대·축소(가까울수록 낮게 눕는다). */
    zoomBy(factor) {
      dist = Math.min(MAX_DIST, Math.max(MIN_DIST, dist * factor));
      place();
    },
    /** 화면 비율이 바뀌면 호출. 세로 화면은 시야각을 넓힌다. */
    setAspect(a) {
      camera.aspect = a;
      camera.fov = a < 1 ? 56 : 36;
      camera.updateProjectionMatrix();
    }
  };
}
