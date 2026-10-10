// 2D 손그림 캐릭터(64x64 좌표의 SVG 조각, 발끝 y≈61). 타이틀·캐릭터 만들기 배경에서 쓴다.
// 원작 그림체를 따른 규칙:
//  - 굵은 진갈색 선, 크고 둥근 머리가 그대로 몸으로 이어지는 떡 모양
//  - 팔은 옆구리에서 볼록 나온 짧은 혹(내리기·내밀기·들기), 발은 몸 아래 양쪽 끝의 세로로 가는 작은 타원,
//    두 발 사이 바닥은 아래로 살짝 볼록(모두 몸 윤곽 한 줄이라 이음매가 없다). 캐릭터마다 자세가 다르다.
//  - 얼굴은 머리 가운데보다 조금 아래에 모여 있다: 작은 까만 눈 + 흰 반짝, 짧은 시무룩 눈썹, ω 입
//  - 볼은 눈보다 큰 분홍 타원에 빗금(////)
// 그림은 200x200 좌표로 그리고 0.32 배로 줄여 돌려준다. 여러 장이 겹쳐도 되도록 id 는 쓰지 않는다.
const LINE = '#3a2a28', WHITE = '#ffffff', CHEEK = '#f7a9b9', HATCH = '#c45a70';
const W = 4.6, FACE = 3; // 바깥 선, 얼굴 선 두께(200 좌표)

const paint = (fill, w) => ` fill="${fill || 'none'}"${w ? ` stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : ''}`;
/** 경로. w 가 0 이면 선 없이 칠만 한다. 끝을 닫지 않은 경로는 칠은 닫히고 선은 열린 채로 남는다. */
const P = (d, fill, w = W) => `<path d="${d}"${paint(fill, w)}/>`;
const E = (cx, cy, rx, ry, fill, w = W, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${paint(fill, w)}${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
/** 선을 두 번 겹쳐 그린 관(꼬리처럼 가는 덩어리): 바깥 진한 선 + 안쪽 색. */
const tube = (d, fill, width) =>
  `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${width + W * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------- 몸 ----------
// 몸은 윤곽선 한 줄: 머리 윗부분(타원의 위쪽 절반) → 옆구리 → 팔 → 겨드랑이 → 발 → 두 발 사이 바닥.
// 오른쪽·왼쪽 절반을 따로 만들 수 있어서 팔 모양과 발 높이를 양쪽 다르게 줄 수 있다(자세).
// 좌표는 모두 [c1x,c1y,c2x,c2y,x,y] 3차 베지어이고 오른쪽 절반 기준으로 쓴다. 왼쪽은 좌우를 뒤집어 붙인다.

/** 팔 모양. 어깨 [x, y](몸 윤곽에서 팔이 시작하는 점)에서 겨드랑이까지. 원작처럼 짧은 혹 정도만 나온다. */
const ARM = {
  // 아래로 내린 팔
  down: ([x, y]) => [[x + 7, y - 2, x + 14, y + 5, x + 13, y + 13], [x + 12, y + 20, x + 4, y + 23, x - 3, y + 20]],
  // 옆으로 내민 팔(손잡기)
  out: ([x, y]) => [[x + 8, y - 3, x + 16, y - 2, x + 18, y + 5], [x + 20, y + 12, x + 8, y + 20, x - 3, y + 20]],
  // 위로 든 팔(손 흔들기)
  up: ([x, y]) => [[x + 3, y - 5, x + 8, y - 12, x + 13, y - 13], [x + 19, y - 14, x + 21, y - 6, x + 18, y + 1], [x + 15, y + 7, x + 6, y + 12, x - 2, y + 20]]
};

/**
 * 겨드랑이 [ax, ay] 에서 바닥 가운데까지: 몸 아래 끝에 세로로 가는 타원 발, 두 발 사이 바닥은 아래로 살짝 볼록.
 * feet: { out, inn: 발 바깥·안쪽 x, top: 발이 시작하는 높이, bottom: 발끝, mid: 두 발 사이 바닥 가운데 높이 }
 * lift 만큼 발을 들어 올린다(걷거나 깡총 뛰는 자세).
 */
function legSegs([ax, ay], { out, inn, top, bottom, mid }, lift = 0) {
  const o = out + lift * 0.5, i = inn + lift * 0.5, t = top - lift, b = bottom - lift, c = (o + i) / 2;
  return [
    [ax + 2, ay + 10, o + 6, t - 6, o, t], // 옆구리 → 발 바깥
    [o + 1.5, t + 8, o - 1, b, c, b], // 발 바깥 → 둥근 발끝
    [i + 1, b, i - 1.5, t + 8, i, t + 3], // 발끝 → 발 안쪽
    [i - 6, t + 6 + lift, 114, mid, 100, mid] // 두 발 사이 바닥
  ];
}

/**
 * 몸 종류. arc: 머리 타원 [rx, ry, cy](가운데 x=100) — 모자 무늬가 같은 호를 쓴다.
 * shoulder: 팔 모양별 어깨 위치, feet: 발 치수.
 */
const BODIES = {
  // 치이카와·하치와레·모몽가
  mochi: { arc: [76, 68, 104], shoulder: { down: [168, 140], out: [170, 134], up: [175, 124] }, feet: { out: 151, inn: 138, top: 185, bottom: 200, mid: 190 } },
  usagi: { arc: [56, 54, 112], shoulder: { down: [150, 140], out: [152, 134], up: [155, 124] }, feet: { out: 139, inn: 126, top: 185, bottom: 200, mid: 190 } },
  kurimanju: { arc: [78, 74, 114], shoulder: { down: [171, 148], out: [173, 142], up: [177, 130] }, feet: { out: 156, inn: 143, top: 189, bottom: 202, mid: 193 } }
};

/** 한쪽 절반(오른쪽 기준): 머리 타원 오른쪽 끝 → 어깨 → 팔 → 겨드랑이 → 발 → 바닥 가운데. */
function half(B, arm, lift) {
  const [rx, , cy] = B.arc, ex = 100 + rx, S = B.shoulder[arm];
  const segs = [[ex, cy + (S[1] - cy) * 0.55, S[0] + (ex - S[0]) * 0.6, S[1] - 6, S[0], S[1]], ...ARM[arm](S)];
  const pit = segs[segs.length - 1];
  return [...segs, ...legSegs([pit[4], pit[5]], B.feet, lift)];
}

/**
 * 몸 윤곽. pose: { r, l: 오른쪽·왼쪽(보는 사람 기준) 팔 모양, liftR, liftL: 발 든 높이 }
 * ears: 머리 윤곽에 이어 붙이는 귀 { p1, p2: 왼쪽 귀가 머리 타원에서 시작·끝나는 점(왼쪽 끝에서 시계 방향 순서),
 *   left: p1 → p2 경로 명령, right: 거울 위치의 오른쪽 귀 경로 명령(거울 p2 → 거울 p1) }.
 *   귀도 윤곽선의 일부라 머리와 귀 사이에 선이 없다.
 */
function bodyPath(kind, pose, ears) {
  const B = BODIES[kind], [rx, ry, cy] = B.arc;
  const right = half(B, pose.r, pose.liftR || 0), left = half(B, pose.l, pose.liftL || 0);
  const head = `A${rx} ${ry} 0 0 1`;
  let d = `M${100 - rx} ${cy}`;
  if (ears) {
    const [x1, y1] = ears.p1, [x2, y2] = ears.p2;
    d += `${head} ${x1} ${y1}${ears.left}${head} ${200 - x2} ${y2}${ears.right}${head} ${100 + rx} ${cy}`;
  } else d += `${head} ${100 + rx} ${cy}`;
  for (const s of right) d += `C${s.join(' ')}`;
  const pts = [[100 + rx, cy], ...left.map((s) => [s[4], s[5]])];
  for (let i = left.length - 1; i >= 0; i--) {
    const [a, b, c, e] = left[i], [px, py] = pts[i];
    d += `C${200 - c} ${e} ${200 - a} ${b} ${200 - px} ${py}`;
  }
  return d + 'Z';
}
/** 몸 전체를 발 근처를 축으로 살짝 기울인다(+ 는 시계 방향). */
const tilt = (deg, svg) => `<g transform="rotate(${deg} 100 196)">${svg}</g>`;

// ---------- 얼굴 ----------
/** 까만 타원 눈 + 오른쪽 위 흰 반짝(big 이면 아래에 작은 반짝 하나 더). */
function eyes(y, dx, rx, ry, big = false) {
  return [-1, 1].map((s) => {
    const cx = 100 + s * dx;
    return E(cx, y, rx, ry, LINE, 0) + E(cx + rx * 0.3, y - ry * 0.38, rx * 0.36, rx * 0.36, WHITE, 0) +
      (big ? E(cx - rx * 0.32, y + ry * 0.42, rx * 0.17, rx * 0.17, WHITE, 0) : '');
  }).join('');
}
/** ω 입. b 는 혹 하나의 폭. */
const mouth = (y, b = 10) => P(`M${100 - b} ${y}q${b / 2} ${b * 0.62} ${b} 0q${b / 2} ${b * 0.62} ${b} 0`, null, FACE);
/** 분홍 볼 + 빗금. */
function cheeks(y, dx, rx = 14, ry = 9.5, hatch = true) {
  return [-1, 1].map((s) => {
    const cx = 100 + s * dx;
    let h = '';
    if (hatch) for (let i = -1.5; i <= 1.5; i++) {
      const x = cx + i * rx * 0.36;
      h += `M${(x - 2).toFixed(1)} ${(y + ry * 0.45).toFixed(1)}L${(x + 2).toFixed(1)} ${(y - ry * 0.45).toFixed(1)}`;
    }
    return E(cx, y, rx, ry, CHEEK, 0) + (h ? `<path d="${h}" fill="none" stroke="${HATCH}" stroke-width="2.2" stroke-linecap="round"/>` : '');
  }).join('');
}

// 자세는 타이틀 배경 배치(왼쪽부터 우사기 · 치이카와 · 하치와레 … 모몽가 · 쿠리만쥬)에 맞췄다:
// 가운데 치이카와가 양팔을 벌리고, 양옆 친구는 치이카와 쪽 팔을 내밀어 손잡은 것처럼 보인다.
const ART = {
  chiikawa() {
    // 작고 둥근 귀가 머리 윤곽에 바로 이어진다
    const body = bodyPath('mochi', { r: 'out', l: 'out' },
      { p1: [52, 51.28], p2: [76, 39.48], left: 'A13.4 13.4 0 0 1 76 39.48', right: 'A13.4 13.4 0 0 1 148 51.28' });
    // 실눈으로 웃는 얼굴(레퍼런스): 거의 평평한 짧은 눈·눈썹 선, ω 입 아래 하얗게 벌린 입, 그 아래 작은 턱선
    const dash = (y, lift) => [-1, 1].map((s) => P(`M${100 + s * 23 - 8} ${y}Q${100 + s * 23} ${y - lift} ${100 + s * 23 + 8} ${y}`, null, 3.4)).join('');
    return P(body, WHITE) + dash(97, 4) + dash(113, 5) + cheeks(117, 45) +
      mouth(121, 8) + P('M94.5 124Q100 137 105.5 124Z', WHITE, FACE) + P('M96.5 142Q100 144 103.5 142', null, FACE);
  },

  hachiware() {
    const B = '#6593bf';
    const body = bodyPath('mochi', { r: 'up', l: 'out' }); // 왼팔은 치이카와 손잡기, 오른팔은 번쩍
    // 모자: 머리 윤곽의 위쪽 호 + 아래 경계(가운데가 V 로 파인다). 경계에는 선이 없다.
    const cap = P('M31.8 74A76 68 0 0 1 168.2 74Q150 84 116 78L100 60L84 78Q50 84 31.8 74Z', B, 0);
    // 뾰족 귀: 머리 윤곽 위의 두 점에서 시작하는 열린 경로라 모자와 이음매 없이 이어진다.
    const ears = P('M40.2 62Q34 34 48 13Q70 22 86 37.2', B) + P('M159.8 62Q166 34 152 13Q130 22 114 37.2', B);
    return tilt(-3, tube('M52 180Q32 190 24 182Q20 176 25 172', B, 8) + P(body, WHITE) + cap + P(body, null) + ears +
      eyes(110, 24, 8, 9.5, true) + cheeks(120, 46) + mouth(118, 9) + P('M94 122Q100 133 106 122Z', '#ef8ea0', FACE));
  },

  usagi() {
    const Y = '#fbe9a8', K = '#f6b4c3';
    // 위아래 폭이 거의 같은 달걀형. 긴 귀는 머리 윤곽에 바로 이어진다. 오른팔은 치이카와 손잡기, 오른발은 깡총 들었다.
    const body = bodyPath('usagi', { r: 'out', l: 'down', liftR: 6 }, {
      p1: [80, 61.56], p2: [95, 58.22],
      left: 'C72 44 70 14 81 8C92 3 95 38 95 58.22', right: 'C105 38 108 3 119 8C130 14 128 44 120 61.56'
    });
    const inner = P('M83 54C78 38 78 20 82 15C88 12 90 36 90 54Z', K, 0) + P('M117 54C122 38 122 20 118 15C112 12 110 36 110 54Z', K, 0);
    // 순한 얼굴(사용자가 후보 다섯 중 고름): 눈 위 작은 아치 눈썹, 동그란 눈에 가로 반짝, ω 입과 작은 턱선
    const eye = (cx) => E(cx, 118, 6.6, 6.6, LINE, 0) + E(cx + 0.6, 116.6, 3.6, 1.9, WHITE, 0);
    const face = P('M69 106Q78 98 88 104', null, 2.8) + P('M112 104Q122 98 131 106', null, 2.8) +
      eye(79) + eye(121) + cheeks(124, 41, 12.5, 8.5) + mouth(128, 6) + P('M97 137q3 2 6 0', null, FACE);
    return tilt(4, P(body, Y) + inner + face);
  },

  momonga() {
    const BL = '#bfe0f6', BL2 = '#a8d4f1';
    // 꼬리: 선 없이 연하늘색 솜뭉치(가장자리가 몽글몽글)
    const tail = `<g transform="translate(14 -10)">` +
      P('M150 106C132 96 128 66 142 46C150 30 168 22 182 30C196 36 202 54 196 72C192 90 180 104 166 108C160 110 155 109 150 106Z', BL, 0) +
      P('M156 44q7 -6 13 -1M178 58q6 -2 9 4M168 86q6 2 10 -2', null, 2) + '</g>';
    // 둥근 귀는 머리 윤곽에 바로 이어지고, 안쪽만 하늘색
    const earIn = E(57.6, 41.7, 7.5, 7.5, BL2, 0) + E(142.4, 41.7, 7.5, 7.5, BL2, 0);
    // 볼 털: 머리 윤곽 위의 두 점을 잇는 열린 경로라 몸 쪽에는 선이 없다
    const fur = P('M175.5 112L186 116L176 121L187 127L174 133', WHITE) + P('M24.5 112L14 116L24 121L13 127L26 133', WHITE);
    const eye = (cx, look) => E(cx, 111, 11.5, 12, WHITE, FACE) + E(cx + look, 113, 8, 9, LINE, 0) +
      E(cx + look + 2.6, 109, 3, 3, WHITE, 0) + E(cx + look - 2.4, 117.5, 1.4, 1.4, WHITE, 0);
    const body = bodyPath('mochi', { r: 'down', l: 'out', liftL: 7 }, // 한쪽 팔 내밀고 한 발 든 자세
      { p1: [46, 56.15], p2: [76, 39.48], left: 'A17.2 17.2 0 0 1 76 39.48', right: 'A17.2 17.2 0 0 1 154 56.15' });
    return tilt(3, tail + P(body, WHITE) + earIn + fur +
      eye(76, 2) + eye(124, -2) + cheeks(127, 50) + E(100, 124, 6.5, 5, BL2, 2.4) + mouth(132, 7));
  },

  kurimanju() {
    const T = '#f7d8b0', CAP = '#8f5c3b';
    // 머리 윗부분은 타원(중심 100,114 · 반지름 78x74)의 위쪽 절반: 갈색 모자가 같은 호를 쓴다.
    // 작은 귀는 모자 바로 아래 옆머리 윤곽에 이어진다. 오른손에 캔.
    const body = bodyPath('kurimanju', { r: 'out', l: 'down' },
      { p1: [24.34, 96], p2: [31.85, 78], left: 'A10 10 0 0 1 31.85 78', right: 'A10 10 0 0 1 175.66 96' });
    const cap = P('M31.85 78A78 74 0 0 1 168.15 78Q100 96 31.85 78Z', CAP, 0) + E(78, 58, 13, 5, '#ad7a55', 0, -18) +
      P('M168.15 78Q100 96 31.85 78', null);
    const can = `<rect x="179" y="112" width="18" height="28" rx="4"${paint('#e9826b', 3.6)}/>` + P('M179 120H197M179 128H197', null, 2.4);
    return P(body, T) + cap + P(body, null) + can +
      eyes(121, 15, 5, 6) + cheeks(131, 40, 13, 8, false) + mouth(133, 6);
  },

  rakko() {
    const FUR = '#fbe7c2', PAW = '#4a3a34';
    // 원작처럼: 북슬북슬한 크림색 털 공(윤곽 밖으로 짧은 털 선), 양옆에 작은 까만 귀, 이마(보는 쪽 왼쪽)에 네 갈래 별 흉터,
    // 목에 두툼한 흰 목도리를 까만 손으로 쥐고, 등 뒤로 흰 망토 자락, 왼쪽 어깨 옆으로 흰 칼 손잡이가 비죽
    const body = bodyPath('mochi', { r: 'down', l: 'down' });
    const fuzz = [];
    for (let i = 0; i <= 16; i++) {
      const t = Math.PI * (0.92 + i * 0.07), c = Math.cos(t), sn = Math.sin(t);
      fuzz.push(`M${(100 + 81 * c).toFixed(1)} ${(104 + 73 * sn).toFixed(1)}L${(100 + 88 * c).toFixed(1)} ${(104 + 80 * sn).toFixed(1)}`);
    }
    const ticks = `<path d="${fuzz.join('')}" fill="none" stroke="${LINE}" stroke-width="3.2" stroke-linecap="round"/>`;
    const hilt = tube('M32 116L6 96', '#f4f0e8', 9) + P('M11 95L16 103M18 100L23 108', null, 2.6) + tube('M21 103L32 121', '#e9e4d8', 4);
    const cape = P('M138 150L186 146Q194 172 182 198Q162 190 144 194Z', WHITE);
    const ears = E(30, 92, 8, 10, PAW, 3, -10) + E(170, 80, 8, 10, PAW, 3, 15);
    const scarf = P('M34 136Q100 164 166 136L169 154Q100 186 31 154Z', WHITE, 3.6);
    const paws = E(89, 166, 10, 7.5, PAW, 3) + E(111, 166, 10, 7.5, PAW, 3);
    const star = P('M68 70Q71 82 82 85Q71 88 68 100Q65 88 54 85Q65 82 68 70Z', '#bfae8c', 3);
    const dots = [[84, 121], [80, 127], [116, 121], [120, 127]].map(([x, y]) => E(x, y, 1.6, 1.6, LINE, 0)).join('');
    return cape + hilt + P(body, FUR) + ticks + ears + scarf + paws + star + eyes(108, 23, 6, 5.4) +
      E(100, 117, 5, 3.6, LINE, 0) + mouth(123, 6) + dots + cheeks(124, 46, 12, 8);
  }
};

/** 캐릭터 그림 조각(<g> 안에 넣는 SVG 문자열). 좌표계는 64x64, 발끝이 y≈61. */
export function charSvg(kind) {
  return `<g transform="translate(0 -3) scale(0.32)">${ART[kind]()}</g>`; // 발끝(200 좌표 y≈200)이 y≈61 에 오게
}
