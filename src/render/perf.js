// 휴대폰 발열 줄이기: 절전 모드(초당 30번만 돌고 그리기), 창이 화면을 덮고 있을 때 뒤 3D 를 천천히 그리기,
// 먼 외곽선을 그리기에서 빼는 기준(lod.js 가 쓴다). three 없이 판단만 한다(테스트하기 쉽게).

/** 절전 모드에서 초당 도는 횟수. */
export const SAVE_FPS = 30;
/** 창(가게 · 마을폰 · 시험 …)이 화면을 덮고 있을 때 뒤 3D 를 초당 그리는 횟수(10번이면 뒤에서 움직이는 친구들이 뚝뚝 끊겨 버벅이는 것처럼 보였다). */
export const COVERED_FPS = 30;
/**
 * 카메라에서 이보다 먼 외곽선은 그리지 않는다(1픽셀 안팎이라 안개 속에서 티가 나지 않는다). 몸통은 그대로 그린다:
 * 작은 부품까지 거리로 빼 보니 멀리 선 갑옷 씨 · 가로등이 통째로 사라져서(부품마다 작아서) 몸통은 빼지 않는다.
 */
export const OUTLINE_FAR = 36;
/** 경계에서 깜빡이지 않게 두는 여유(감출 때는 바깥으로, 다시 보일 때는 안쪽으로). */
export const LOD_SLACK = 1.5;

const KEY = 'chiikawa-town:powersave';
const JITTER_MS = 4; // 화면 새로 고침 간격이 조금씩 흔들려도 초당 30번을 지키게

/**
 * storage: getItem/setItem 이 있는 저장소(막혀 있어도 동작). coarse: 휴대폰 · 태블릿(손가락)이면 절전이 기본.
 */
export function createPerf({ storage = null, coarse = false } = {}) {
  let saved = null;
  try { saved = storage ? storage.getItem(KEY) : null; } catch { /* 저장소가 막혀 있다 */ }
  let powerSave = saved == null ? !!coarse : saved === '1';
  let lastTick = -Infinity, sinceDraw = Infinity;
  return {
    get powerSave() { return powerSave; },
    setPowerSave(on) {
      powerSave = !!on;
      try { if (storage) storage.setItem(KEY, powerSave ? '1' : '0'); } catch { /* 저장소가 막혀 있다 */ }
    },
    /** 한 번 돌 때 기대하는 간격(ms): 버벅임(해상도 낮추기) 판단의 기준. */
    get frameMs() { return 1000 / (powerSave ? SAVE_FPS : 60); },
    /** 이번 화면 새로 고침에 게임을 돌릴지. now: requestAnimationFrame 시각(ms). */
    due(now) {
      if (powerSave && now - lastTick < 1000 / SAVE_FPS - JITTER_MS) return false;
      lastTick = now;
      return true;
    },
    /** 이번에 3D 를 그릴지: 창이 화면을 덮고 있으면 초당 COVERED_FPS 번만. dt: 지난번 뒤 흐른 초. */
    drawDue(dt, covered) {
      sinceDraw += dt;
      if (covered && sinceDraw < 1 / COVERED_FPS - 1e-6) return false;
      sinceDraw = 0;
      return true;
    }
  };
}

/**
 * 이 메시를 그리기에서 뺄지. d: 카메라까지 거리, outline: 외곽선 메시, hidden: 지금 빠져 있는지(경계에서 깜빡이지 않게 여유를 둔다).
 */
export function lodHide({ d, outline = false }, hidden) {
  const far = outline ? OUTLINE_FAR : Infinity;
  return hidden ? d > far - LOD_SLACK : d > far + LOD_SLACK;
}
