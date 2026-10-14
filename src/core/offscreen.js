import { chooseActivity, satisfy, growNeeds, freshMind } from './brain.js';
import {
  VILLAGERS, BED_HOUR, WAKE_HOUR, MAX_JOBS_PER_DAY, MEAL_PRICE, MEAL_ENERGY, NAP_ENERGY, isSleepHour,
  boardOf, villagerOf, villagerEnergy, villagerTakesJob, payVillager, villagerSpend, villagerPay
} from './villagers.js';
import { JOB_TYPES } from './jobs.js';
import { DAY_SECONDS, hourOf } from './clock.js';
import { goalOf, canBuy, buyGoal, canDoJob } from './goals.js';

/** 게임 속 한 시간의 실제 길이(초). 욕구가 차는 빠르기(brain.js 의 NEED_RATE)는 실제 초 기준이다. */
const HOUR_SECONDS = DAY_SECONDS / 24;
/** 한 시간 돌아다니기만 해도 주는 기운 · 일감 하나에 드는 기운(화면에서 풀 · 열매 · 스티커로 드는 만큼쯤). */
const HOURLY_TIRE = 6, WORK_TIRE = 30;
/** 가게(도구점 · 가구점)가 닫는 시각. */
const SHOP_CLOSE = 20;

const shuffle = (list, random) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
/**
 * 내가 from → to 동안 자는 사이 친구들이 보내는 시간. evening: 잠든 날 밤 9시(또는 깬 시각)까지 깨어 지낸 때,
 * night: 친구들도 밤잠을 잤는지(밤 9시를 넘겼거나 밤잠 시간에 잠들었다), morning: 밤잠 뒤 일어나서(6시 반)부터 내가 깰 때까지.
 * 시각은 그날 06:00 부터 센 시(6 ~ 30)로 비교한다(하루는 06:00 에 바뀐다). → { evening, night, morning } (구간은 { day, from, to } | null)
 */
export function asleepSpans(from, to) {
  const r = (x) => Math.round(x * 1e6) / 1e6, lin = (c) => r(6 + c.t * 24);
  const h0 = lin(from), h1 = lin(to), days = to.day - from.day, end = h1 + days * 24;
  const evening = h0 >= WAKE_HOUR && h0 < BED_HOUR ? { day: from.day, from: h0, to: Math.min(end, BED_HOUR) } : null;
  const night = isSleepHour(hourOf(from)) || end > BED_HOUR;
  const morning = night && (days > 0 || h0 < WAKE_HOUR) && h1 > WAKE_HOUR && h1 < BED_HOUR ? { day: to.day, from: WAKE_HOUR, to: h1 } : null;
  return { evening, night, morning };
}

const eat = (s, kind, day) => villagerEnergy(villagerSpend(s, kind, MEAL_PRICE, day), kind, MEAL_ENERGY, day);

/**
 * 내가 일찍 잠든 사이(잠든 시각 ~ 밤 9시) 친구들이 보낸 저녁을 한 시간씩 건너뛰며 지낸다.
 * 화면에서처럼 두뇌(chooseActivity)가 할 일을 고르고 결과만 남긴다: 일하면 보수(게시판 일감이 줄고 하루 세 개까지),
 * 라멘을 먹으면 돈과 기운, 수다 · 같이 라멘은 짝도 마음이 풀린다. 돈 모으는 목표(core/goals.js)를 보고 일하고, 값이 모이면 가게에서 산다.
 * 토벌 · 시험 · 공연처럼 화면에서 봐야 하는 일은 하지 않는다.
 * 밤잠 시간에 잠들면 친구들도 이미 자는 중이라 그대로 돌려준다. 넘겨받은 state · minds 는 바꾸지 않는다.
 * opts: { day, fromHour, toHour = 밤 9시, random, skip: 끼지 않는 친구 kind 들(첫날 안내 중인 하치와레) }
 * → { state, minds, events: [{ type: 'job' | 'meal' | 'chat' | 'buy', who, with?, title?, item?, cost?, hour }] }
 */
export function liveOffscreen(state, minds, { day, fromHour, toHour = BED_HOUR, random = Math.random, skip = [] }) {
  if (isSleepHour(fromHour)) return { state, minds, events: [] };
  const kinds = Object.keys(VILLAGERS).filter((k) => !skip.includes(k));
  const guiding = !!state.tutorial && state.tutorial !== 'done';
  const next = { ...minds };
  for (const k of kinds) next[k] = next[k] || freshMind(random);
  const events = [];
  let s = state;
  for (let hour = fromHour; hour < toHour; hour += 1) {
    const done = new Set(); // 이번 시간에 이미 무언가 한 친구(짝으로 불려 간 친구도)
    for (const kind of shuffle(kinds, random)) {
      if (done.has(kind)) continue;
      done.add(kind);
      if (hour < SHOP_CLOSE && !guiding && canBuy(s, kind, day)) { // 목표 값이 모였으면 이번 시간에는 가게에 다녀온다(첫날 안내 중엔 화면에서처럼 안 간다)
        const b = buyGoal(s, kind, day);
        s = b.state;
        events.push({ type: 'buy', who: kind, item: b.goal.label, cost: b.goal.cost, hour });
        continue;
      }
      const v = villagerOf(s, kind, day), spec = VILLAGERS[kind], m = growNeeds(next[kind], kind, HOUR_SECONDS), goal = goalOf(s, kind);
      const left = boardOf(s, day).left;
      const jobs = v.jobs < MAX_JOBS_PER_DAY ? spec.jobs.filter((id) => left[id] > 0 && canDoJob(s, kind, id)) : []; // 낚시 일감은 낚싯대를 산 뒤에만
      const friends = kinds.filter((k) => !done.has(k)).map((k) => ({ kind: k, dist: 10 }));
      const c = chooseActivity({
        kind, hour, energy: v.energy, money: v.money, fun: m.fun, social: m.social, diligence: spec.diligence, appetite: spec.eat,
        jobs: jobs.length > 0, guiding, hunter: null, friends, show: null, player: null, goal: goal && { kind: goal.kind, cost: goal.cost }
      }, random);
      next[kind] = satisfy(m, c.act);
      s = villagerEnergy(s, kind, -HOURLY_TIRE, day);
      if (c.act === 'work') {
        const id = jobs[Math.floor(random() * jobs.length) % jobs.length];
        const r = villagerTakesJob(s, kind, id, day);
        if (!r.ok) continue;
        s = villagerEnergy(payVillager(r.state, kind, villagerPay(id), day), kind, -WORK_TIRE, day);
        events.push({ type: 'job', who: kind, title: JOB_TYPES[id].title, hour });
      } else if (c.act === 'eat') {
        s = eat(s, kind, day);
        events.push({ type: 'meal', who: kind, hour });
      } else if (c.act === 'mealWith' || c.act === 'chat') {
        const mate = c.with;
        done.add(mate);
        next[mate] = satisfy(growNeeds(next[mate], mate, HOUR_SECONDS), c.act);
        s = villagerEnergy(s, mate, -HOURLY_TIRE, day);
        if (c.act === 'mealWith') s = eat(eat(s, kind, day), mate, day);
        events.push({ type: c.act === 'chat' ? 'chat' : 'meal', who: kind, with: mate, hour });
      } else if (c.act === 'nap') {
        s = villagerEnergy(s, kind, NAP_ENERGY, day);
      }
    }
  }
  return { state: s, minds: next, events };
}
