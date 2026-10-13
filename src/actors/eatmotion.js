/**
 * 먹는 몸짓(core/eating.js 의 mode)과 손에 드는 음식(prop 꼬리표 'f-…').
 * 음식 부품은 models.js 의 held() 가 팔 마디에 단다: { arm, pose, parts } — parts 는 그 팔이 pose 자세일 때
 * 손끝에서 잰 위치(+z 앞, +x 내 캐릭터 오른쪽, +y 위)로 적는다. 몸짓은 그 자세를 기준으로 움직인다.
 */
export const EAT_ANIMS = ['slurp', 'gulp', 'nibble'];

// 손에 든 자세(팔 회전 [x, y, z], 'YXZ'). 오른팔 z − · 왼팔 z + 가 몸 안쪽
const HOLD = {
  bowl: [-1.15, 0, 0.5], // 왼손: 그릇을 가슴 앞에 받친다
  chop: [-0.95, 0, -0.45], // 오른손: 젓가락을 그릇에 담근다
  mouth: [-1.5, 0.05, -0.4], // 오른손: 젓가락 끝(면)이 입 바로 앞
  cup: [-1.15, -0.25, -0.55], // 오른손: 잔을 입 앞에 든다
  nibble: [-1.4, -0.1, -0.6] // 오른손: 음식을 입에 댄다(왼손도 같이 받친다)
};

// 팔이 짧아 손이 몸 옆에 머물러서, 젓가락을 길게 해 손에서 가슴 앞 그릇까지 닿게 한다(가늘게 · 테두리 없이 진한 색)
const CHOPSTICKS = [
  { m: 'box', c: '#9a6534', p: [-0.128, 0.037, 0.07], r: [-0.25, -1.07, 0], s: [0.014, 0.014, 0.34], o: false },
  { m: 'box', c: '#9a6534', p: [-0.12, 0.052, 0.082], r: [-0.2, -1.02, 0], s: [0.014, 0.014, 0.34], o: false },
  // 젓가락 끝에 매달린 면 두어 가닥
  { m: 'box', c: '#f3d36b', p: [-0.272, 0.045, 0.15], s: [0.01, 0.07, 0.01], o: false },
  { m: 'box', c: '#f3d36b', p: [-0.262, 0.05, 0.165], r: [0, 0, 0.25], s: [0.01, 0.06, 0.01], o: false }
];
/** 왼손에 받친 그릇(cup: 그릇 색, soup: 국물 색, tops: 고명). */
const BX = 0.18, BZ = 0.16; // 왼손 끝에서 그릇 가운데까지
const bowl = (cup, soup, tops) => [
  { m: 'cylinder', c: cup, p: [BX, -0.06, BZ], s: [0.125, 0.09, 0.125] },
  { m: 'cylinder', c: cup, p: [BX, -0.08, BZ], s: [0.075, 0.025, 0.075] },
  { m: 'cylinder', c: soup, p: [BX, 0.028, BZ], s: [0.115, 0.006, 0.115], o: false },
  ...tops.map((pt) => ({ ...pt, p: [pt.p[0] - 0.1 + BX, pt.p[1], pt.p[2] - 0.07 + BZ] }))
];

export const FOOD_SHAPES = {
  // 라멘: 빨간 그릇에 노란 면 · 나루토 · 반숙 달걀 · 김, 오른손엔 젓가락
  'f-ramen': [
    { arm: 'armL', pose: HOLD.bowl, parts: bowl('#e2574c', '#f2c46b', [
      { m: 'sphere', c: '#f6d77a', p: [0.1, 0.03, 0.07], s: [0.08, 0.018, 0.08], o: false },
      { m: 'dot', c: '#ffffff', p: [0.135, 0.045, 0.045], s: [0.026, 0.008, 0.026], o: false },
      { m: 'dot', c: '#f39aaa', p: [0.135, 0.05, 0.045], s: [0.011, 0.005, 0.011], o: false },
      { m: 'dot', c: '#ffffff', p: [0.07, 0.045, 0.1], s: [0.026, 0.012, 0.022], o: false },
      { m: 'dot', c: '#f6b73c', p: [0.07, 0.054, 0.1], s: [0.013, 0.007, 0.011], o: false },
      { m: 'box', c: '#2f3b2c', p: [0.1, 0.06, 0.0], r: [-0.25, 0, 0], s: [0.06, 0.06, 0.006] },
      { m: 'dot', c: '#7cc25e', p: [0.08, 0.044, 0.05], s: [0.012, 0.005, 0.012], o: false },
      { m: 'dot', c: '#7cc25e', p: [0.12, 0.044, 0.1], s: [0.012, 0.005, 0.012], o: false }
    ]) },
    { arm: 'armR', pose: HOLD.chop, parts: CHOPSTICKS }
  ],
  // 전골: 갈색 뚝배기에 빨간 국물 · 두부 · 배추
  'f-hotpot': [
    { arm: 'armL', pose: HOLD.bowl, parts: bowl('#8a5a3c', '#e0633f', [
      { m: 'box', c: '#fffaf0', p: [0.075, 0.04, 0.06], s: [0.035, 0.025, 0.035] },
      { m: 'box', c: '#fffaf0', p: [0.13, 0.04, 0.09], s: [0.035, 0.025, 0.035] },
      { m: 'dot', c: '#9fd36a', p: [0.11, 0.04, 0.03], s: [0.04, 0.01, 0.025], o: false },
      { m: 'dot', c: '#f2c46b', p: [0.09, 0.04, 0.11], s: [0.02, 0.01, 0.02], o: false }
    ]) },
    { arm: 'armR', pose: HOLD.chop, parts: CHOPSTICKS }
  ],
  // 생맥주: 손잡이를 쥐고(바깥) 잔은 입 쪽(안쪽)에, 거품이 넘칠 듯
  'f-beer': [{ arm: 'armR', pose: HOLD.cup, parts: [
    { m: 'cylinder', c: '#f2b632', p: [-0.11, -0.07, 0.13], s: [0.07, 0.16, 0.07] },
    { m: 'sphere', c: '#fffaf0', p: [-0.11, 0.09, 0.13], s: [0.08, 0.04, 0.08] },
    { m: 'box', c: '#f7dc8a', p: [-0.03, 0.01, 0.13], s: [0.025, 0.09, 0.025] },
    { m: 'dot', c: '#ffe08a', p: [-0.15, -0.01, 0.17], s: [0.008, 0.05, 0.008], o: false }
  ] }],
  // 하이볼: 키 큰 잔에 호박색 술 · 얼음 · 레몬 한 조각, 기포
  'f-highball': [{ arm: 'armR', pose: HOLD.cup, parts: [
    { m: 'cylinder', c: '#f2c25e', p: [-0.105, -0.1, 0.13], s: [0.055, 0.2, 0.055] },
    { m: 'cylinder', c: '#e6f4fa', p: [-0.105, 0.1, 0.13], s: [0.058, 0.035, 0.058] },
    { m: 'box', c: '#ffffff', p: [-0.12, 0.115, 0.12], r: [0.3, 0.4, 0], s: [0.035, 0.035, 0.035], o: false },
    { m: 'box', c: '#ffffff', p: [-0.09, 0.11, 0.145], r: [0.5, 0.1, 0.3], s: [0.032, 0.032, 0.032], o: false },
    { m: 'cylinder', c: '#f8e36a', p: [-0.06, 0.12, 0.13], r: [0, 0, Math.PI / 2], s: [0.03, 0.01, 0.03] },
    { m: 'dot', c: '#fff6d6', p: [-0.13, -0.02, 0.175], s: [0.008, 0.008, 0.008], o: false },
    { m: 'dot', c: '#fff6d6', p: [-0.1, 0.03, 0.182], s: [0.007, 0.007, 0.007], o: false }
  ] }],
  // 병맥주: 갈색 병 · 크림색 라벨 · 노란 뚜껑
  'f-bottle': [{ arm: 'armR', pose: HOLD.cup, parts: [
    { m: 'cylinder', c: '#7a4a22', p: [-0.1, -0.09, 0.13], s: [0.05, 0.15, 0.05] },
    { m: 'cylinder', c: '#f6e7c3', p: [-0.1, -0.05, 0.13], s: [0.053, 0.06, 0.053] },
    { m: 'cone', c: '#7a4a22', p: [-0.1, 0.06, 0.13], s: [0.05, 0.05, 0.05] },
    { m: 'cylinder', c: '#7a4a22', p: [-0.1, 0.08, 0.13], s: [0.022, 0.07, 0.022] },
    { m: 'cylinder', c: '#e8c547', p: [-0.1, 0.15, 0.13], s: [0.026, 0.015, 0.026] }
  ] }],
  'f-onigiri': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'sphere', c: '#fffdf6', p: [-0.12, 0.1, 0.1], s: [0.075, 0.07, 0.05] },
    { m: 'box', c: '#2f3b2c', p: [-0.12, 0.05, 0.1], s: [0.075, 0.05, 0.105] }
  ] }],
  'f-berry': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'sphere', c: '#e2483d', p: [-0.11, 0.1, 0.1], s: [0.045, 0.045, 0.045] },
    { m: 'dot', c: '#7cc25e', p: [-0.11, 0.145, 0.1], s: [0.025, 0.008, 0.015], o: false }
  ] }],
  'f-edamame': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'sphere', c: '#8fcb5c', p: [-0.11, 0.1, 0.1], r: [0, 0, 0.5], s: [0.03, 0.08, 0.03] },
    { m: 'dot', c: '#c4ea8e', p: [-0.125, 0.13, 0.125], s: [0.017, 0.017, 0.012], o: false },
    { m: 'dot', c: '#c4ea8e', p: [-0.1, 0.085, 0.128], s: [0.017, 0.017, 0.012], o: false }
  ] }],
  // 피자호빵: 노릇한 호빵 반쪽 사이로 빨간 소스
  'f-pizzabun': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'sphere', c: '#fbd3a0', p: [-0.12, 0.1, 0.1], s: [0.075, 0.06, 0.07] },
    { m: 'box', c: '#e8573f', p: [-0.12, 0.085, 0.1], s: [0.11, 0.012, 0.1], o: false }
  ] }],
  'f-jelly': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'sphere', c: '#e9a94b', p: [-0.12, 0.1, 0.1], s: [0.07, 0.042, 0.06] },
    { m: 'box', c: '#a8642a', p: [-0.12, 0.14, 0.1], r: [0, 0.5, 0], s: [0.09, 0.006, 0.01], o: false },
    { m: 'box', c: '#a8642a', p: [-0.12, 0.14, 0.1], r: [0, -0.5, 0], s: [0.09, 0.006, 0.01], o: false }
  ] }],
  'f-apple': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'sphere', c: '#e2483d', p: [-0.12, 0.1, 0.1], s: [0.06, 0.056, 0.06] },
    { m: 'box', c: '#7a5236', p: [-0.12, 0.165, 0.1], s: [0.01, 0.03, 0.01] },
    { m: 'dot', c: '#7cc25e', p: [-0.1, 0.17, 0.1], r: [0, 0, -0.5], s: [0.025, 0.01, 0.015], o: false }
  ] }],
  'f-cookie': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'cylinder', c: '#e5b46e', p: [-0.12, 0.1, 0.09], r: [Math.PI / 2, 0, 0], s: [0.075, 0.022, 0.075] },
    { m: 'dot', c: '#6b4226', p: [-0.14, 0.115, 0.114], s: [0.01, 0.01, 0.005], o: false },
    { m: 'dot', c: '#6b4226', p: [-0.1, 0.09, 0.114], s: [0.01, 0.01, 0.005], o: false },
    { m: 'dot', c: '#6b4226', p: [-0.12, 0.13, 0.114], s: [0.009, 0.009, 0.005], o: false }
  ] }],
  // 거대 오므라이스: 왼손에 흰 접시, 노란 달걀 위에 케첩 지그재그, 오른손엔 숟가락
  'f-omurice': [
    { arm: 'armL', pose: HOLD.bowl, parts: [
      { m: 'cylinder', c: '#ffffff', p: [BX, -0.03, BZ], s: [0.16, 0.02, 0.16] },
      { m: 'sphere', c: '#f8d34a', p: [BX, 0.0, BZ], s: [0.12, 0.055, 0.08] },
      { m: 'box', c: '#e2483d', p: [BX - 0.04, 0.056, BZ], r: [0, 0.6, 0], s: [0.07, 0.008, 0.014], o: false },
      { m: 'box', c: '#e2483d', p: [BX + 0.02, 0.058, BZ], r: [0, -0.6, 0], s: [0.07, 0.008, 0.014], o: false },
      { m: 'dot', c: '#7cc25e', p: [BX + 0.1, -0.005, BZ + 0.04], s: [0.02, 0.01, 0.02], o: false }
    ] },
    { arm: 'armR', pose: HOLD.chop, parts: [
      { m: 'box', c: '#d9dde2', p: [-0.128, 0.037, 0.07], r: [-0.25, -1.07, 0], s: [0.016, 0.012, 0.3], o: false },
      { m: 'sphere', c: '#d9dde2', p: [-0.262, 0.05, 0.142], s: [0.03, 0.012, 0.024], o: false },
      { m: 'dot', c: '#f8d34a', p: [-0.262, 0.062, 0.142], s: [0.018, 0.008, 0.016], o: false }
    ] }
  ],
  // 하치와레 러스크: 노릇한 빵 조각에 설탕 반짝
  'f-rusk': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'box', c: '#e9b468', p: [-0.12, 0.1, 0.09], r: [0, 0, 0.2], s: [0.13, 0.08, 0.035] },
    { m: 'box', c: '#fff3c4', p: [-0.12, 0.13, 0.11], r: [0, 0, 0.2], s: [0.1, 0.014, 0.006], o: false }
  ] }],
  'f-candy': [{ arm: 'armR', pose: HOLD.nibble, parts: [
    { m: 'box', c: '#fffaf0', p: [-0.1, 0.07, 0.09], s: [0.012, 0.11, 0.012] },
    { m: 'cylinder', c: '#f48fb1', p: [-0.1, 0.15, 0.08], r: [Math.PI / 2, 0, 0], s: [0.06, 0.022, 0.06] },
    { m: 'dot', c: '#ffffff', p: [-0.1, 0.15, 0.102], s: [0.018, 0.018, 0.004], o: false }
  ] }]
};

const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];

/**
 * 먹는 몸짓의 자세 { a, bob, lean, waddle }. opts.eat: 한 번 먹기의 진행(0 → 1, 없으면 계속 되풀이 — 라멘 가게 친구들),
 * opts.phase: 친구마다 박자를 어긋나게.
 */
export function eatPose(mode, t, opts = {}) {
  const phase = opts.phase || 0, k = opts.eat;
  if (mode === 'slurp') {
    // 그릇을 가슴 앞에 받치고 젓가락으로 면을 집어(0 ~ 0.3) 입으로 올려(~0.5) 후루룩(~0.8) 다시 그릇으로
    const c = k != null ? (k * 2.3 + 0.55) % 1 : (t * 0.8 + phase) % 1;
    const lift = c < 0.3 ? 0 : c < 0.5 ? ease((c - 0.3) / 0.2) : c < 0.8 ? 1 : 1 - ease((c - 0.8) / 0.2);
    const sip = c >= 0.5 && c < 0.8 ? Math.sin(t * 34) * 0.025 : 0, stir = c < 0.3 ? Math.sin(t * 9) * 0.06 : 0;
    return {
      a: {
        armL: [HOLD.bowl[0] + lift * 0.08, 0, HOLD.bowl[2]],
        armR: lerp3(HOLD.chop, HOLD.mouth, lift).map((v, i) => (i === 1 ? v + stir : v)),
        head: [0.24 - lift * 0.2 + sip, 0, 0]
      },
      lean: 0.06 - lift * 0.08,
      bob: Math.abs(sip) * 0.3
    };
  }
  if (mode === 'gulp') {
    // 잔을 들고(0 ~ 0.18) 고개를 젖혀 꿀꺽꿀꺽(~0.68) 내려놓고(~0.82) "캬~" 하며 부르르(~1)
    const g = k != null ? k : (t * 0.4 + phase) % 1;
    const up = g < 0.18 ? ease(g / 0.18) : g < 0.68 ? 1 : g < 0.82 ? 1 - 0.75 * ease((g - 0.68) / 0.14) : 0.25;
    const tilt = g < 0.18 ? 0 : g < 0.3 ? ease((g - 0.18) / 0.12) : g < 0.68 ? 1 : g < 0.78 ? 1 - ease((g - 0.68) / 0.1) : 0;
    const kya = g < 0.82 ? 0 : Math.sin(((g - 0.82) / 0.18) * Math.PI);
    const nod = tilt > 0.9 ? Math.sin(t * 13) * 0.04 : 0;
    const arm = lerp3([-0.35, 0, -0.25], HOLD.cup, up);
    return {
      a: {
        armR: [arm[0] - 0.4 * tilt, arm[1], arm[2]],
        armL: [-0.25 * kya, 0, -0.12 - 0.9 * kya],
        head: [-0.3 * tilt + nod + 0.12 * kya, 0, 0]
      },
      lean: -0.12 * tilt + 0.04 * kya,
      bob: 0.03 * kya,
      waddle: Math.sin(t * 42) * 0.05 * kya
    };
  }
  // nibble: 두 손으로 입에 대고 냠냠냠, 몸을 살랑살랑
  const nib = Math.abs(Math.sin(t * 13 + phase)), jig = nib * 0.06;
  return {
    a: {
      armR: [HOLD.nibble[0] + jig, HOLD.nibble[1], HOLD.nibble[2]],
      armL: [HOLD.nibble[0] + jig, -HOLD.nibble[1], -HOLD.nibble[2]],
      head: [0.05 + nib * 0.05, 0, Math.sin(t * 3 + phase) * 0.05]
    },
    bob: nib * 0.01,
    waddle: Math.sin(t * 4 + phase) * 0.04
  };
}

/** 한 번 먹기(opts.eat)의 처음 · 끝에 원래 자세와 섞는 무게(0 → 1 → 0). */
export const eatWeight = (k) => (k < 0.12 ? ease(clamp01(k / 0.12)) : k > 0.88 ? ease(clamp01((1 - k) / 0.12)) : 1);
