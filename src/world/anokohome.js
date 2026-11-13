import { buildAnoko, ANOKO_RIDE_SCALE } from '../actors/anoko.js';
import { buildCar } from '../actors/car.js';
import { groundY } from '../core/layout.js';

/**
 * 집 앞 아노코(메인 이야기 2장 보상 — 게임 오리지널): 2장을 끝내면 내 집 문 옆 마당에 엎드려 쉰다(웃는 얼굴, 탈 때와 같은 크기).
 * 말을 걸면 자동차와 아노코 가운데 탈 것을 고른다(main.js). 타고 나가 있지 않은 탈것은 집 앞에 있다:
 * 아노코를 타고 나가면 그 자리가 비고, 자동차가 있으면 아노코 옆에 하늘색 자동차를 세워 둔다(자동차를 타고 나가면 비운다).
 * show({ anoko, car }) 로 보인다 · 숨긴다. place(door): 집 문 앞 자리(집을 넓히면 바뀐다)에 맞춰 문 옆 빈자리로 옮긴다.
 * 보이는 동안만 장애물(장애물 칸은 놓은 자리로 정해지니 옮길 때마다 새로 놓고 옛것은 끈다).
 */
export function createAnokoHome(scene, village) {
  const anoko = buildAnoko(), car = buildCar();
  anoko.setPose('lie');
  anoko.setFace('happy');
  anoko.root.scale.setScalar(ANOKO_RIDE_SCALE);
  anoko.root.visible = false;
  car.root.visible = false;
  scene.add(anoko.root, car.root);
  const spot = { x: 0, z: 0 }, carSpot = { x: 0, z: 0 };
  let obA = null, obC = null, doorKey = '', shown = { anoko: false, car: false };
  /** 장애물을 새 자리에 놓는다(옛것은 끈다). */
  const block = (old, x, z, r) => { if (old) old.off = true; const o = { x, z, r, off: true }; village.obstacles.push(o); return o; };
  return {
    /** 엎드린 아노코 자리(말 걸기). */
    spot,
    /** 집 문 앞 자리 door 에 맞춰 옮긴다(같은 자리면 그대로). 카메라(남쪽) 쪽을 조금 비스듬히 본다. */
    place(door) {
      const key = `${door.x.toFixed(2)},${door.z.toFixed(2)}`;
      if (key === doorKey) return;
      doorKey = key;
      if (obA) obA.off = true;
      if (obC) obC.off = true;
      const a = village.nearestFree(door.x + 1.9, door.z + 0.8, 0.9);
      spot.x = a.x; spot.z = a.z;
      const c = village.nearestFree(a.x + 2.1, a.z + 0.3, 0.7);
      carSpot.x = c.x; carSpot.z = c.z;
      anoko.root.position.set(a.x, groundY(a.x, a.z), a.z);
      anoko.root.rotation.y = -0.45;
      car.root.position.set(c.x, groundY(c.x, c.z), c.z);
      car.root.rotation.y = 0.35;
      obA = block(obA, a.x, a.z, 0.85);
      obC = block(obC, c.x, c.z, 0.6);
      shown = { anoko: false, car: false };
      anoko.root.visible = false;
      car.root.visible = false;
    },
    /** 보일 것: anoko 엎드린 아노코, car 세워 둔 자동차. */
    show({ anoko: a = false, car: c = false } = {}) {
      if (a === shown.anoko && c === shown.car) return;
      shown = { anoko: a, car: c };
      anoko.root.visible = a;
      car.root.visible = c;
      if (obA) obA.off = !a;
      if (obC) obC.off = !c;
    },
    /** 아노코가 보이는지(말 걸기 대상). */
    get resting() { return shown.anoko; },
    /** 숨 쉬기 · 꼬리 살랑. */
    update(dt, t) { if (shown.anoko) anoko.animate(t, {}); }
  };
}
