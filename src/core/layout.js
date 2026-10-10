/**
 * 월드 배치(순수 데이터와 계산): 크기 · 구역 · 마을 건물 자리 · 길 · 강과 호수.
 * three 없이 쓰고 테스트한다. 좌표는 x 가 동(+) · 서(−), z 가 남(+) · 북(−). 카메라는 남쪽에서 북쪽을 본다.
 */

/** 월드 끝(x, z 가 −80 ~ 80). */
export const WORLD_HALF = 80;
/** 걸어갈 수 있는 끝. */
export const WALK_HALF = 76;
/** 마을 울타리 반지름. */
export const VILLAGE_R = 28;
/** 문 너비의 절반. */
export const GATE_HALF = 2.2;
/** 마을 문 넷(울타리 위 가운데). */
export const GATES = {
  north: { x: 0, z: -VILLAGE_R }, south: { x: 0, z: VILLAGE_R },
  west: { x: -VILLAGE_R, z: 0 }, east: { x: VILLAGE_R, z: 0 }
};
export const REGION_NAMES = { village: '치이카와 마을', forest: '숲', mountain: '바위산', fields: '들판', river: '강가' };

/** (x, z) 가 속한 구역. 울타리 안이면 마을, 밖이면 동서남북 가운데 더 멀리 나간 쪽. */
export function regionAt(x, z) {
  if (Math.hypot(x, z) <= VILLAGE_R) return 'village';
  if (Math.abs(x) >= Math.abs(z)) return x < 0 ? 'forest' : 'fields';
  return z < 0 ? 'mountain' : 'river';
}

/** 광장(원). */
export const PLAZA = { x: 0, z: 0, r: 5.5 };
/** 마을 연못(조금 납작한 타원). */
export const POND = { x: -4.5, z: 21.5, r: 2.1 };
/** 동서로 흐르는 강: 가운데 z = riverZ(x), 폭의 절반 half. */
export const RIVER = { z: 36, amp: 2.5, freq: 0.06, half: 3 };
/** 강을 건너는 다리: 다리 가운데 x 와 폭의 절반. */
export const BRIDGES = [{ x: 0, half: 1.4 }, { x: -40, half: 1.2 }];
/** 남서쪽 호수(타원). */
export const LAKE = { x: -48, z: 60, rx: 15, rz: 10 };
/** 이보다 남쪽은 넓은 호수(월드 남쪽 끝). */
export const SOUTH_SHORE = 72;
/** 북쪽 바위산의 하치와레 동굴: 바위 덩어리 가운데, 크기, 입구 앞. */
export const CAVE = { x: 8, z: -47, r: 3, door: { x: 8, z: -42.6 } };

export const riverZ = (x) => RIVER.z + RIVER.amp * Math.sin(x * RIVER.freq);

/** 가장 가까운 물가까지의 거리(음수면 물속). 다리 위는 강이 아니다. */
export function shoreDist(x, z) {
  const onBridge = BRIDGES.some((b) => Math.abs(x - b.x) < b.half);
  const river = onBridge ? 99 : Math.abs(z - riverZ(x)) - RIVER.half;
  const lake = (Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) - 1) * Math.min(LAKE.rx, LAKE.rz);
  const pond = Math.hypot(x - POND.x, (z - POND.z) / 0.85) - POND.r;
  const sea = SOUTH_SHORE - z;
  return Math.min(river, lake, pond, sea);
}
export const isWater = (x, z) => shoreDist(x, z) < 0;

/** 다리 판: 길이(강 폭 + 양쪽 1.2) · 윗면 높이 · 양 끝 비탈 길이. */
export const BRIDGE_LEN = RIVER.half * 2 + 2.4, BRIDGE_TOP = 0.2, BRIDGE_RAMP = 0.9;
/** 발 디딜 높이: 다리 위면 판 높이(양 끝은 비탈을 따라 내려온다), 아니면 땅(0). 캐릭터 · 몬스터가 판에 파묻히지 않게. */
export function groundY(x, z) {
  for (const b of BRIDGES) {
    if (Math.abs(x - b.x) > b.half + 0.15) continue;
    const dz = Math.abs(z - riverZ(b.x)) - BRIDGE_LEN / 2;
    if (dz < 0) return BRIDGE_TOP;
    if (dz < BRIDGE_RAMP) return BRIDGE_TOP * (1 - dz / BRIDGE_RAMP);
  }
  return 0;
}

/** 흙길: 꺾이는 점들과 폭. 마을 안 큰길 넷, 상점가 · 주택가 길, 바깥 구역으로 나가는 길. */
export const ROADS = [
  { id: 'main-ew', w: 1.4, pts: [[-VILLAGE_R, 0], [VILLAGE_R, 0]] },
  { id: 'main-ns', w: 1.4, pts: [[0, -VILLAGE_R], [0, VILLAGE_R]] },
  { id: 'shops', w: 1.2, pts: [[-20, -10], [22, -10]] },
  { id: 'homes', w: 1.2, pts: [[-20, 12], [20, 12]] },
  { id: 'to-river', w: 1.3, pts: [[0, VILLAGE_R], [0, 33], [0, 40], [2, 48], [-4, 58]] },
  { id: 'to-forest', w: 1.2, pts: [[-VILLAGE_R, 0], [-36, -2], [-46, 3], [-56, -1], [-68, -6]] },
  { id: 'forest-lake', w: 1.0, pts: [[-46, 3], [-48, 14], [-42, 24], [-40, 31], [-40, 42], [-36, 48]] },
  { id: 'to-mountain', w: 1.2, pts: [[0, -VILLAGE_R], [1, -36], [6, -40], [CAVE.door.x, CAVE.door.z]] },
  { id: 'mountain-trail', w: 1.0, pts: [[1, -36], [-10, -48], [-22, -58]] },
  { id: 'to-fields', w: 1.3, pts: [[VILLAGE_R, 0], [38, 2], [50, -2], [62, 3]] } // 동쪽 끝 둔덕 앞에서 끝난다
];

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
/** 흙길(광장 포함)까지의 거리(음수면 길 위). */
export function roadDist(x, z) {
  let best = Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r;
  for (const r of ROADS) {
    for (let k = 1; k < r.pts.length; k++) {
      const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k];
      best = Math.min(best, segDist(x, z, ax, az, bx, bz) - r.w / 2);
    }
  }
  return best;
}

/**
 * 마을 건물 자리. 모두 남쪽(카메라 쪽)을 본다. kind: house(박공지붕 집) · dome(하얀 돔 집) · stall(노점) · board(게시판)
 * · bench(작업대) · dojo(수련장) · pub(맥주집 노점) · raffle(경품 추첨 가라가라). home 이 있으면 그 친구의 집(3단계에서 들어가 잔다).
 */
export const LOTS = [
  { id: 'furniture', kind: 'house', x: -17, z: -14, s: 1.05, roof: '#9fd8c4', label: '가구점' },
  { id: 'books', kind: 'house', x: -10, z: -14, s: 0.95, roof: '#c9a77c', label: '카니 헌책방' },
  { id: 'pochette', kind: 'stall', x: -4, z: -13.2, label: '포셰트 가게' },
  { id: 'realty', kind: 'house', x: 5, z: -14, s: 0.95, roof: '#c4b4e8', label: '부동산' },
  { id: 'tools', kind: 'house', x: 11.5, z: -14, s: 1.0, roof: '#8fb7d9', label: '도구점' },
  { id: 'ramen', kind: 'house', x: 18.5, z: -14, s: 1.1, roof: '#d9675b', label: '라멘 로우' },
  { id: 'exam', kind: 'house', x: 18, z: -4.5, s: 0.85, roof: '#7fa7d9', label: '검정소' },
  { id: 'board', kind: 'board', x: -5, z: -5.4, label: '노동 접수' },
  { id: 'factory', kind: 'bench', x: -9.5, z: -5.4, label: '스티커 작업대' },
  { id: 'raffle', kind: 'raffle', x: 5, z: -5.4, label: '경품 추첨' },
  { id: 'home', kind: 'dome', x: -8, z: 7.5, s: 1.0, label: '내 집' },
  { id: 'chiikawa', kind: 'dome', x: -14.5, z: 8, s: 1.15, label: '치이카와네', home: 'chiikawa' },
  { id: 'usagi', kind: 'house', x: 8, z: 7.5, s: 0.85, roof: '#f2cf7a', label: '우사기네', home: 'usagi' },
  { id: 'kurimanju', kind: 'house', x: 14.5, z: 7.5, s: 0.9, roof: '#d9a066', label: '쿠리만쥬네', home: 'kurimanju' },
  { id: 'momonga', kind: 'house', x: -12, z: 17, s: 0.8, roof: '#bfe0f5', label: '모몽가네', home: 'momonga' },
  { id: 'rakko', kind: 'house', x: 12, z: 17, s: 0.95, roof: '#a8826a', label: '랏코네', home: 'rakko' },
  { id: 'dojo', kind: 'dojo', x: 17, z: 16, label: '랏코 수련장' },
  { id: 'pub', kind: 'pub', x: 20.5, z: 3.4, roof: '#e9884f', label: '맥주집' }
];

const RADIUS = { house: (l) => 1.716 * l.s, dome: (l) => 1.47 * l.s, stall: () => 1.15, board: () => 1.0, bench: () => 1.0, dojo: () => 2.0, pub: () => 1.3, raffle: () => 1.0 };
/** 건물이 차지하는 반지름(장애물 크기와 같다). */
export const lotRadius = (lot) => RADIUS[lot.kind](lot);

const FRONT = { house: (l) => 1.716 * l.s + 0.65, stall: () => 1.8, board: () => 1.65, bench: () => 1.7, dojo: () => 2.6, pub: () => 2.0, raffle: () => 1.7 };
/** 건물 앞(문 앞) 지점: 말 걸기 · 들어가기 대상이 되는 자리. 돔은 오른쪽 현관 혹 앞. */
export function doorSpot(lot) {
  if (lot.kind === 'dome') { const R = 1.4 * lot.s, out = (0.42 * lot.s + 0.8) * Math.SQRT1_2; return { x: lot.x + R * 0.62 + out, z: lot.z + R * 0.62 + out }; } // 현관 혹의 문 바로 앞(문이 대각선으로 바깥을 본다)
  return { x: lot.x, z: lot.z + FRONT[lot.kind](lot) };
}
export const lotById = (id) => LOTS.find((l) => l.id === id);

/** 라멘 로우 앞 손님 자리(가게 앞 지점에서 잰 [dx, dz]): 의자 넷 · 줄 다섯. */
export const RAMEN_SEATS = [[0.55, 0.95], [-0.45, 1.05], [1.45, 1.35], [-1.5, 1.3]];
export const RAMEN_QUEUE = [[-0.5, 2.7], [0.7, 2.8], [-1.7, 3.0], [1.9, 3.1], [0.1, 3.8]];

// ---------- 가로등 ----------
export const LAMP_SPACING = 7, LAMP_GAP = 6, LAMP_FRONT_CLEAR = 2.4, LAMP_CROWD_CLEAR = 1.2;
// 문 앞에서 남쪽(카메라 쪽)으로 뻗은 다가가는 길: 여기 서면 문으로 가는 길을 막고 화면에서 문을 가린다
export const LAMP_LANE = { half: 2.2, len: 4.5 };
/** (x, z) 가 문 앞 f 에서 카메라 쪽으로 뻗은 길(다가가는 자리) 안인지. */
export const inDoorLane = (f, x, z) => Math.abs(x - f.x) < LAMP_LANE.half && z > f.z - 0.5 && z < f.z + LAMP_LANE.len;
const LAMP_ROADS = ['main-ew', 'main-ns', 'shops', 'homes']; // 마을 안 길(큰길부터, 그다음 골목)
/**
 * 마을 안 가로등 자리 [{ x, z }]: 길을 처음부터 끝까지 이어 재며 LAMP_SPACING 마다 번갈아 한쪽에 세운다
 * (예전엔 길이 꺾이는 데마다 처음부터 다시 세서 광장 둘레에 몰리고, 가게 앞을 가렸다).
 * 가로등끼리 LAMP_GAP 이상, 가게 · 집 문 앞에서 LAMP_FRONT_CLEAR 이상 떨어지고 길 · 광장 · 물가 · 마을 밖은 피한다.
 * 그 자리가 안 되면 길 건너편, 그다음 앞뒤로 조금씩 비켜 본다. isFree(x, z): 건물 같은 장애물이 없는지(마을이 알려 준다).
 */
export function lampSpots({ isFree = () => true } = {}) {
  const fronts = LOTS.map(doorSpot), out = [];
  const ramen = doorSpot(lotById('ramen')), crowd = [...RAMEN_SEATS, ...RAMEN_QUEUE].map(([dx, dz]) => ({ x: ramen.x + dx, z: ramen.z + dz })); // 라멘 손님 의자 · 줄도 비운다
  const ok = (x, z) => Math.hypot(x, z) <= VILLAGE_R - 2 && roadDist(x, z) > 0.2 && shoreDist(x, z) > 1.2 && isFree(x, z)
    && fronts.every((f) => Math.hypot(f.x - x, f.z - z) >= LAMP_FRONT_CLEAR && !inDoorLane(f, x, z)) && crowd.every((c) => Math.hypot(c.x - x, c.z - z) >= LAMP_CROWD_CLEAR)
    && out.every((p) => Math.hypot(p.x - x, p.z - z) >= LAMP_GAP);
  for (const id of LAMP_ROADS) {
    const road = ROADS.find((r) => r.id === id), off = road.w / 2 + 0.8;
    const segs = [];
    let total = 0;
    for (let k = 1; k < road.pts.length; k++) {
      const [ax, az] = road.pts[k - 1], [bx, bz] = road.pts[k], len = Math.hypot(bx - ax, bz - az);
      segs.push({ ax, az, bx, bz, len, from: total });
      total += len;
    }
    // 길을 따라 s 만큼 간 점과 그 자리에서 길 옆 방향
    const at = (s) => {
      const g = segs.find((q) => s <= q.from + q.len) || segs[segs.length - 1], u = (s - g.from) / g.len;
      return { x: g.ax + (g.bx - g.ax) * u, z: g.az + (g.bz - g.az) * u, nx: -(g.bz - g.az) / g.len, nz: (g.bx - g.ax) / g.len };
    };
    for (let s = LAMP_SPACING / 2, k = 0; s < total; s += LAMP_SPACING, k++) {
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
