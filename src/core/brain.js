import { TIRED, MEAL_PRICE, WAKE_HOUR, isSleepHour } from './villagers.js';

/**
 * 마을 친구들의 두뇌: 욕구(기운 · 돈 · 심심함 · 외로움) + 성격 + 시간대 일과로 다음에 할 일을 고른다.
 * 무작위로 뽑지 않고 할 일마다 '하고 싶은 정도'를 매겨 가장 높은 것을 고른다(조금씩 흔들어서 늘 같은 선택만 하지는 않게).
 *
 * 할 일(act): sleep 밤잠 · nap 낮잠 · eat 라멘 · mealWith 친구와 라멘 · work 게시판 일감 · hunt 토벌 일감 · exam 토벌 자격증 시험
 *   · hobby 취미(친구마다 다르다) · chat 친구에게 가서 수다 · watch 하치와레 공연 구경 · greet 나에게 먼저 다가와 인사 · stroll 산책 · rest 제자리에서 쉬기
 */
/** 라멘 사 먹기: 기운이 FULL 이상이면 배불러 안 먹고, HUNGRY 아래면 배고파 먹고 싶어진다(돈 모으는 중이면 그때만). */
export const FULL = 80, HUNGRY = 55;
/** 라멘(MEAL_PRICE)을 사 먹을 만한지: 돈이 있고 배부르지 않고, 목표 값을 모으는 중이면 배고플 때만. 같이 먹자고 불린 친구도 이걸로 정한다. */
export const wantsMeal = (energy, money, saving) => money >= MEAL_PRICE && energy < FULL && (!saving || energy < HUNGRY);

/**
 * 성격. fun · social: 심심함 · 외로움이 차는 빠르기(1 이 보통), greet: 나에게 먼저 다가오는 정도,
 * likes: 친구마다 얼마나 좋아하는지(수다 · 같이 밥 상대를 고를 때), hobby: 취미 이름.
 */
export const PERSONA = {
  chiikawa: { fun: 1.0, social: 1.3, greet: 0.8, hobby: 'pond', likes: { hachiware: 1, usagi: 0.9, kurimanju: 0.6, rakko: 0.45, momonga: 0.3 } },
  hachiware: { fun: 0.9, social: 1.2, greet: 1.2, hobby: 'sing', likes: { chiikawa: 1, usagi: 0.8, kurimanju: 0.65, rakko: 0.55, momonga: 0.5 } },
  usagi: { fun: 1.6, social: 0.85, greet: 0.9, hobby: 'zoom', likes: { chiikawa: 0.9, hachiware: 0.85, rakko: 0.7, kurimanju: 0.6, momonga: 0.25 } },
  kurimanju: { fun: 0.6, social: 0.9, greet: 0.7, hobby: 'snack', likes: { chiikawa: 0.8, hachiware: 0.7, usagi: 0.65, rakko: 0.6, momonga: 0.35 } },
  rakko: { fun: 0.55, social: 0.5, greet: 0.5, hobby: 'dojo', likes: { usagi: 0.85, chiikawa: 0.5, hachiware: 0.5, kurimanju: 0.55, momonga: 0.15 } },
  momonga: { fun: 1.3, social: 1.15, greet: 1.0, hobby: 'showoff', likes: { chiikawa: 1, hachiware: 0.7, kurimanju: 0.6, usagi: 0.4, rakko: 0.3 } }
};

/**
 * 하루 일과: [시작 시각, 끝 시각, { 할 일: 곱 }]. 그 시간대에 그 일을 더 하고 싶어진다.
 * 치이카와는 아침에 일하고 저녁엔 연못 · 별 구경, 하치와레는 오후에 광장 공연, 랏코는 아침저녁 수련장,
 * 쿠리만쥬는 늦잠 뒤 안주 만들기(저녁 5 ~ 9시는 맥주집, 마을 살림 쪽에서 정한다), 모몽가는 오후에 친구들을 귀찮게 한다.
 */
export const ROUTINE = {
  chiikawa: [[7, 11, { work: 1.5 }], [11, 14, { eat: 1.6, mealWith: 1.6 }], [14, 18, { chat: 1.3, hobby: 1.2, watch: 1.2 }], [18, 21, { hobby: 1.9, chat: 1.1 }]],
  hachiware: [[7, 11, { work: 1.4 }], [11, 13, { eat: 1.4, mealWith: 1.5 }], [13, 17.5, { hobby: 2.2 }], [17.5, 21, { chat: 1.5, greet: 1.2 }]],
  usagi: [[7, 12, { work: 1.2, hunt: 1.4 }], [12, 17, { hobby: 1.4, hunt: 1.2, watch: 1.2 }], [17, 21, { chat: 1.2, eat: 1.3, mealWith: 1.3 }]],
  kurimanju: [[6, 9.5, { rest: 1.8 }], [9.5, 15, { hobby: 1.5, work: 1.1 }], [15, 17, { chat: 1.4, greet: 1.2 }]],
  rakko: [[6, 9, { hobby: 2.4 }], [9, 16, { hunt: 1.6, work: 1.1 }], [16, 20, { hobby: 1.7 }]],
  momonga: [[8, 12, { hobby: 1.4 }], [12, 18, { chat: 1.6, greet: 1.3 }], [18, 21, { hobby: 1.3 }]]
};

/** 그 시각의 일과 곱(없으면 {}). */
export function routineAt(kind, hour) {
  const row = (ROUTINE[kind] || []).find(([a, b]) => hour >= a && hour < b);
  return row ? row[2] : {};
}

/**
 * 아침에 일어나 집을 나서는 시각(시). 밤잠이 끝나는 6시 반부터 차례로: 랏코는 일어나자마자 수련, 우사기 · 치이카와 · 하치와레가 뒤따르고,
 * 모몽가는 느지막이, 쿠리만쥬는 늦잠. 한꺼번에 우르르 나오지 않게 한다.
 */
export const WAKE = { rakko: 6.5, usagi: 6.6, chiikawa: 6.75, hachiware: 6.9, momonga: 7.4, kurimanju: 8.2 };
export const wakeHourOf = (kind) => WAKE[kind] ?? WAKE_HOUR;

/** 심심함 · 외로움이 1초에 차는 양(성격 1 기준): 심심함은 2분, 외로움은 2분 반이면 꽉 찬다. */
export const NEED_RATE = { fun: 1 / 120, social: 1 / 150 };
/** 할 일을 하면 채워지는(줄어드는) 욕구. 일은 조금 심심해진다. */
export const SATISFY = {
  chat: { social: -0.65, fun: -0.15 }, mealWith: { social: -0.55, fun: -0.15 }, eat: { fun: -0.05 }, hobby: { fun: -0.75 },
  watch: { fun: -0.6, social: -0.25 }, show: { fun: -0.8, social: -0.35 }, greet: { social: -0.5, fun: -0.1 }, stroll: { fun: -0.3 },
  work: { fun: 0.08 }, hunt: { fun: -0.35 }, train: { fun: -0.55, social: -0.4 }, comfort: { social: -0.3 }
};

/** 새 마음(처음엔 조금 심심하고 조금 외롭다). */
export const freshMind = (random = Math.random) => ({ fun: 0.25 + random() * 0.35, social: 0.25 + random() * 0.35 });
/** dt 초만큼 욕구가 찬다(0 ~ 1). */
export function growNeeds(mind, kind, dt) {
  const P = PERSONA[kind] || { fun: 1, social: 1 };
  return { ...mind, fun: Math.min(1, mind.fun + dt * NEED_RATE.fun * P.fun), social: Math.min(1, mind.social + dt * NEED_RATE.social * P.social) };
}
/** 할 일을 해서 욕구가 풀린다. */
export function satisfy(mind, act) {
  const S = SATISFY[act] || {};
  const clamp = (v) => Math.max(0, Math.min(1, v));
  return { ...mind, fun: clamp(mind.fun + (S.fun || 0)), social: clamp(mind.social + (S.social || 0)) };
}

/** a 가 b 를 얼마나 좋아하는지(0 ~ 1). */
export const likeOf = (a, b) => (PERSONA[a] && PERSONA[a].likes[b]) || 0.4;

/**
 * 다음에 할 일을 고른다. → { act, with: 같이 할 친구 kind | null, scores }
 * ctx: { kind, hour, energy, money, fun, social, diligence, appetite,
 *        jobs: 받을 수 있는 일감이 있는지, hunter: { exam, hunt, want } | null, goal: { kind, cost } | null 돈 모으는 목표(core/goals.js),
 *        friends: [{ kind, dist }] 지금 한가한 친구들, show: { by, dist } | null 공연 중,
 *        player: { dist, hearts, ready } | null 내 캐릭터(ready: 요즘 인사 안 했다), guiding: 첫날 안내 중 }
 */
export function chooseActivity(ctx, random = Math.random) {
  const { kind, hour, energy, money } = ctx;
  if (isSleepHour(hour)) return { act: 'sleep', with: null, scores: {} };
  // 지쳤으면 돈이 있으면 라멘, 없으면 낮잠. 목표 값을 모으는 중이면 라멘값도 아끼고 집에서 낮잠
  const saving = !!ctx.goal && money < ctx.goal.cost;
  if (energy < TIRED) return { act: money >= MEAL_PRICE && hour >= 7 && hour < 20 && !saving ? 'eat' : 'nap', with: null, scores: {} };
  const P = PERSONA[kind] || { greet: 0.5, likes: {} };
  const fun = ctx.fun ?? 0.3, social = ctx.social ?? 0.3, day = hour >= 7 && hour < 20;
  const R = routineAt(kind, hour), s = {};
  // 같이 할 친구: 좋아하는 정도 × 가까운 정도
  const near = (d) => (d < 8 ? 1.2 : d < 25 ? 1 : 0.45);
  const best = (ctx.friends || []).map((f) => ({ ...f, w: likeOf(kind, f.kind) * near(f.dist) })).sort((a, b) => b.w - a.w)[0] || null;

  // 목표(core/goals.js)가 있으면 모자란 만큼 부지런해진다(돈이 넉넉해도 목표가 멀면 계속 일한다). 없으면 예전처럼 지갑 사정대로
  const g = ctx.goal, gap = g ? g.cost - money : 0;
  const drive = g && gap > 0 ? 1.8 + 0.8 * Math.min(1, gap / g.cost) : 0;
  const rush = hour < 11 ? 1.5 : 1; // 게시판 일감은 선착순: 아침 일찍 받으러 간다
  if (day && ctx.jobs && !ctx.guiding) {
    const need = g ? (gap > 0 ? drive : 0.6) : money < 150 ? 1.5 : money > 600 ? 0.45 : 1;
    s.work = (ctx.diligence || 0) * need * rush * (1.15 - fun * 0.4);
  }
  if (day && ctx.hunter && !ctx.guiding) {
    // 토벌 일감은 보수가 커서, 목표를 모을 때도 자격증이 있으면 풀 뽑기보다 먼저 노린다
    if (ctx.hunter.hunt) s.hunt = ctx.hunter.want * (energy > 45 ? 1.1 : 0.3) * (drive ? drive * rush * 1.3 : 1);
    if (ctx.hunter.exam) s.exam = ctx.hunter.want * 0.7 * (ctx.goal && ctx.goal.kind === 'license' ? 4 : 1); // 자격증이 목표면 시험 값이 모이자마자
  }
  // 라멘(80원, 기운 +45): 배부르면(기운 FULL 이상) 사 먹지 않고, 목표 값을 모으는 중이면 배고플 때(HUNGRY 아래)만 조금.
  // 예전에는 기운이 가득해도 점심 · 저녁때면 먹고 친구랑 같이도 먹어서 하루 서너 그릇(번 돈 300원 남짓을 거의 다)을 썼다
  if (day && wantsMeal(energy, money, saving)) {
    const meal = (hour >= 11 && hour < 14) || (hour >= 18 && hour < 20);
    const eat = ((energy < HUNGRY ? 0.6 : 0.08) + (ctx.appetite || 0.3) * (meal ? 1.5 : 0.3)) * (saving ? 0.5 : 1);
    if (best && social > 0.35 && best.w > 0.45) s.mealWith = eat * (1 + social * 0.6) * best.w;
    s.eat = eat;
  }
  s.hobby = 0.15 + fun * 0.95;
  if (best) s.chat = social * 1.1 * best.w;
  if (ctx.show && ctx.show.by !== kind && ctx.show.dist < 34) s.watch = (0.35 + fun * 0.9) * likeOf(kind, ctx.show.by) * 1.3;
  const pl = ctx.player;
  if (pl && pl.ready && pl.hearts >= 1 && pl.dist < 14 && !ctx.guiding) s.greet = social * P.greet * (0.35 + pl.hearts * 0.13);
  s.stroll = 0.18 + fun * 0.25;
  s.rest = 0.22;
  let act = 'rest', top = -1;
  for (const [a, v] of Object.entries(s)) {
    const w = v * (R[a] ?? 1) * (0.75 + 0.5 * random());
    if (w > top) { top = w; act = a; }
  }
  return { act, with: act === 'chat' || act === 'mealWith' ? best.kind : null, scores: s };
}
