import { ROADS, VILLAGE_R, roadDist, shoreDist, lairReach } from './layout.js';
import { registerItems, addItem } from './inventory.js';

/**
 * 마을 가꾸기(게임 오리지널, 동물의 숲 공공사업처럼): 광장 북쪽 '마을 가꾸기' 모금함에 돈을 모아 내면
 * 다 모인 다음 날 아침 마을에 새 시설이 생긴다. 조금씩(WORK_STEP) 나눠 내도 되고, 여러 곳을 같이 모아도 된다.
 * state.works = { [id]: { paid: 낸 돈, day?: 다 모인 날, open?: 생겼다고 알린 날 } }
 */
export const WORK_STEP = 1000;
export const WORKS = {
  flowers: { name: '광장 꽃밭', price: 3000, note: '광장 남쪽 둘레에 꽃밭 넷이 생겨요' },
  benches: { name: '연못 쉼터', price: 6000, note: '연못가에 나무 벤치 둘이 놓여요' },
  lamps: { name: '바깥 길 가로등', price: 12000, note: '마을 밖 큰길에도 밤이면 불이 켜져요' },
  clock: { name: '마을 시계탑', price: 20000, note: '광장 한켠에서 마을 시각을 알려 줘요' },
  roads: { name: '돌길 포장', price: 25000, note: '마을 안 흙길과 광장이 반듯한 돌길이 돼요' },
  pavilion: { name: '강가 정자', price: 30000, note: '남쪽 강가에 쉬어 가는 정자가 생겨요' },
  fence: { name: '든든한 돌담', price: 40000, note: '나무 울타리가 돌담이 되고 문 옆에 돌기둥이 서요' }
};
export const WORK_IDS = Object.keys(WORKS);

/**
 * 시설 자리: 마을 배치에서 비어 있는 곳을 골라 둔 것(길 · 가게 문 앞 · 가로등 · 물가를 피한다). yaw: 앞이 보는 방향(0 이면 남쪽, 카메라 쪽).
 * 바깥 길 가로등은 outerLampSpots 가 길을 따라 고른다.
 */
export const WORK_SPOTS = {
  flowers: [{ x: 3.3, z: 5.72 }, { x: 5.72, z: 3.3 }, { x: -5.72, z: 3.3 }, { x: -3.3, z: 5.72 }],
  benches: [{ x: -4.5, z: 18.2, yaw: 0 }, { x: -4.5, z: 24.6, yaw: Math.PI }],
  // 시계탑: 광장 남서쪽(한가운데는 카메라 이야기의 단체 사진 줄, 북쪽은 노동 접수 · 경품 추첨 · 모금함 문 앞이라 비켜 선다)
  clock: [{ x: -3.0, z: 2.6, yaw: 0 }],
  pavilion: [{ x: 8, z: 31.5, yaw: 0 }]
};
/** 마을 전체를 바꾸는 시설(돌길 · 돌담)의 '공사 중' 간판 자리. */
export const WORK_SIGNS = { roads: { x: -3.0, z: 4.2 }, fence: { x: 3.2, z: 25.0 } };

/** 돌길로 바꾸는 마을 안 길(울타리 안 큰길 넷 · 상점가 · 주택가 골목)과 광장. */
export const INNER_ROADS = ['main-ew', 'main-ns', 'shops', 'homes'];
/** 돌길 판 [{ x, z, len, w, yaw }]: 길 마디마다 한 장(가운데 · 길이 · 폭, yaw 는 길 방향 — three.js rotation.y). 흙길 가장자리까지 덮게 조금 넓다. */
export function pavedStrips() {
  const out = [];
  for (const id of INNER_ROADS) {
    const r = ROADS.find((q) => q.id === id);
    for (let k = 1; k < r.pts.length; k++) {
      const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k], len = Math.hypot(bx - ax, bz - az);
      out.push({ id, x: (ax + bx) / 2, z: (az + bz) / 2, len, w: r.w + 0.35, yaw: Math.atan2(bx - ax, bz - az) });
    }
  }
  return out;
}

const OUTER_ROADS = ['to-fields', 'to-forest', 'to-mountain', 'to-river'];
export const OUTER_LAMP_SPACING = 9, OUTER_LAMP_GAP = 5;
/**
 * 바깥 길 가로등 자리 [{ x, z }]: 마을 울타리 밖 큰길 넷을 따라 OUTER_LAMP_SPACING 마다 번갈아 한쪽에 세운다.
 * 문 바로 앞 · 길 위 · 물가 · 보스 마당은 피하고, 안 되면 길 건너편, 그다음 앞뒤로 조금씩 비켜 본다. isFree(x, z): 장애물이 없는지.
 */
export function outerLampSpots({ isFree = () => true } = {}) {
  const out = [];
  const ok = (x, z) => Math.hypot(x, z) > VILLAGE_R + 2.5 && roadDist(x, z) > 0.2 && shoreDist(x, z) > 1.2 && !lairReach(x, z) && isFree(x, z)
    && out.every((p) => Math.hypot(p.x - x, p.z - z) >= OUTER_LAMP_GAP);
  for (const id of OUTER_ROADS) {
    const road = ROADS.find((r) => r.id === id), off = road.w / 2 + 0.8, segs = [];
    let total = 0;
    for (let k = 1; k < road.pts.length; k++) {
      const [ax, az] = road.pts[k - 1], [bx, bz] = road.pts[k], len = Math.hypot(bx - ax, bz - az);
      segs.push({ ax, az, bx, bz, len, from: total });
      total += len;
    }
    const at = (s) => {
      const g = segs.find((q) => s <= q.from + q.len) || segs[segs.length - 1], u = (s - g.from) / g.len;
      return { x: g.ax + (g.bx - g.ax) * u, z: g.az + (g.bz - g.az) * u, nx: -(g.bz - g.az) / g.len, nz: (g.bx - g.ax) / g.len };
    };
    for (let s = 4, k = 0; s < total; s += OUTER_LAMP_SPACING, k++) {
      const side = k % 2 ? 1 : -1;
      place: for (const ds of [0, 1.5, -1.5, 3, -3]) {
        const c = at(Math.max(0, Math.min(total, s + ds)));
        for (const sd of [side, -side]) {
          const x = c.x + c.nx * off * sd, z = c.z + c.nz * off * sd;
          if (ok(x, z)) { out.push({ x, z }); break place; }
        }
      }
    }
  }
  return out;
}

const worksOf = (s) => (s.works && typeof s.works === 'object' ? s.works : {});
/** 그 시설의 모금: { paid, day(다 모인 날 | null), open(알린 날 | null) }. */
export function workOf(s, id) {
  const w = worksOf(s)[id];
  return { paid: (w && w.paid) || 0, day: w && w.day != null ? w.day : null, open: w && w.open != null ? w.open : null };
}
/** 'none' 아직 · 'saving' 모으는 중 · 'building' 다 모였다(내일 아침에 생긴다) · 'open' 생겼다. */
export function workStatus(s, id) {
  const w = workOf(s, id);
  if (w.paid >= WORKS[id].price && w.day != null) return w.day < s.clock.day ? 'open' : 'building';
  return w.paid > 0 ? 'saving' : 'none';
}
/** 다 모으기까지 남은 돈. */
export const leftOf = (s, id) => Math.max(0, WORKS[id].price - workOf(s, id).paid);

/** 모금함에 낸다: 남은 만큼까지만, 가진 돈이 모자라면 못 낸다. → { ok, state, amount, full(이번에 다 모였다) } */
export function donate(s, id, amount) {
  if (!WORKS[id] || !(amount > 0)) return { ok: false, state: s };
  const n = Math.min(Math.floor(amount), leftOf(s, id));
  if (n <= 0 || s.money < n) return { ok: false, state: s };
  const paid = workOf(s, id).paid + n, full = paid >= WORKS[id].price;
  const w = full ? { paid, day: s.clock.day } : { paid };
  return { ok: true, amount: n, full, state: { ...s, money: s.money - n, works: { ...worksOf(s), [id]: w } } };
}

/** 생겼는데 아직 알리지 않은 시설(아침에 '새로 생겼어요'). */
export const dueWorks = (s) => WORK_IDS.filter((id) => workStatus(s, id) === 'open' && workOf(s, id).open == null);
/** 생겼다고 알렸다. */
export function markWorksOpen(s, ids) {
  if (!ids.length) return s;
  const works = { ...worksOf(s) };
  for (const id of ids) works[id] = { ...works[id], open: s.clock.day };
  return { ...s, works };
}

/** 마을에 보일 모습 { id: 'open' | 'building' }(공사 중이면 간판만). */
export function worksView(s) {
  const v = {};
  for (const id of WORK_IDS) { const st = workStatus(s, id); if (st === 'open' || st === 'building') v[id] = st; }
  return v;
}
/** 같이 놀기: 주인 마을 모습으로 보낼 것 [[id, 1 공사 중 | 2 생겼다]] ↔ 받은 것을 확인해서 모습으로. */
export const packWorks = (view) => Object.entries(view).map(([id, st]) => [id, st === 'open' ? 2 : 1]);
export function unpackWorks(rows) {
  const v = {};
  if (!Array.isArray(rows)) return v;
  for (const r of rows.slice(0, WORK_IDS.length)) if (Array.isArray(r) && Object.hasOwn(WORKS, r[0]) && (r[1] === 1 || r[1] === 2)) v[r[0]] = r[1] === 2 ? 'open' : 'building';
  return v;
}

// ---------- 생긴 시설로 하는 일(게임 오리지널) ----------
// 광장 꽃밭: 꽃밭마다 하루 한 번 '꽃 따기'(광장 꽃 한 송이) · 연못 벤치 · 강가 정자: '앉아서 쉬기'(앉아 있는 동안 기운이 찬다)
// 마을 시계탑: 하루 한 번 '종 치기'(종소리를 들은 마을 친구들이 반응하고 조금 친해진다 — main)
// state.workUse = { flowers: [꽃밭마다 마지막으로 딴 날], bell: 마지막으로 종 친 날 }
export const WORK_ITEMS = {
  plazaflower: { name: '광장 꽃', kind: 'flower', sell: 15, note: '광장 꽃밭에서 딴 알록달록한 꽃 한 송이. 꽃을 좋아하는 친구에게 주면 기뻐해요.' }
};
registerItems(WORK_ITEMS);
/** 앉아서 쉴 때 1초에 차는 기운: 벤치보다 강바람 부는 정자가 더 잘 쉬어진다. */
export const REST_RATE = { benches: 3, pavilion: 5 };
export const workUseOf = (s) => (s.workUse && typeof s.workUse === 'object' ? s.workUse : {});
/** i 번째 꽃밭에서 오늘 꽃을 딸 수 있는지(꽃밭이 생겼고 오늘 아직 안 땄다). */
export function canPickFlower(s, i) {
  const days = workUseOf(s).flowers || [];
  return workStatus(s, 'flowers') === 'open' && i >= 0 && i < WORK_SPOTS.flowers.length && days[i] !== s.clock.day;
}
/** i 번째 꽃밭에서 꽃을 딴다. → { ok, state, reason: 'none'(오늘은 다 땄다) | 'full'(가방이 꽉 찼다) } */
export function pickFlower(s, i) {
  if (!canPickFlower(s, i)) return { ok: false, reason: 'none', state: s };
  const r = addItem(s, 'plazaflower', 1);
  if (!r.added) return { ok: false, reason: 'full', state: s };
  const use = workUseOf(s), days = [...(use.flowers || [])];
  while (days.length < WORK_SPOTS.flowers.length) days.push(0);
  days[i] = s.clock.day;
  return { ok: true, state: { ...r.state, workUse: { ...use, flowers: days } } };
}
/** 오늘 시계탑 종을 칠 수 있는지. */
export const canRingBell = (s) => workStatus(s, 'clock') === 'open' && workUseOf(s).bell !== s.clock.day;
/** 종을 친다(하루 한 번). → { ok, state } */
export function ringBell(s) {
  if (!canRingBell(s)) return { ok: false, state: s };
  return { ok: true, state: { ...s, workUse: { ...workUseOf(s), bell: s.clock.day } } };
}
/** 저장 확인: 꽃밭마다 날은 0 이상 정수, 종 친 날도 정수. */
export function isValidWorkUse(u) {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
  if (u.flowers !== undefined && !(Array.isArray(u.flowers) && u.flowers.length <= WORK_SPOTS.flowers.length && u.flowers.every((d) => Number.isInteger(d) && d >= 0))) return false;
  return u.bell === undefined || (Number.isInteger(u.bell) && u.bell >= 0);
}

/** 저장 확인: 아는 시설만, 낸 돈은 0 이상 값까지, 날은 자연수. */
export function isValidWorks(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
  return Object.entries(w).every(([id, v]) => Object.hasOwn(WORKS, id) && v && typeof v === 'object'
    && Number.isInteger(v.paid) && v.paid >= 0 && v.paid <= WORKS[id].price
    && (v.day === undefined || (Number.isInteger(v.day) && v.day >= 1)) && (v.open === undefined || (Number.isInteger(v.open) && v.open >= 1)));
}
