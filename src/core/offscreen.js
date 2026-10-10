import { chooseActivity, satisfy, growNeeds, freshMind } from './brain.js';
import {
  VILLAGERS, BED_HOUR, MAX_JOBS_PER_DAY, MEAL_PRICE, MEAL_ENERGY, NAP_ENERGY, isSleepHour,
  boardOf, villagerOf, villagerEnergy, villagerTakesJob, payVillager, villagerSpend, villagerPay
} from './villagers.js';
import { JOB_TYPES } from './jobs.js';
import { DAY_SECONDS } from './clock.js';

/** 게임 속 한 시간의 실제 길이(초). 욕구가 차는 빠르기(brain.js 의 NEED_RATE)는 실제 초 기준이다. */
const HOUR_SECONDS = DAY_SECONDS / 24;
/** 한 시간 돌아다니기만 해도 주는 기운 · 일감 하나에 드는 기운(화면에서 풀 · 열매 · 스티커로 드는 만큼쯤). */
const HOURLY_TIRE = 6, WORK_TIRE = 30;

const shuffle = (list, random) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const eat = (s, kind, day) => villagerEnergy(villagerSpend(s, kind, MEAL_PRICE, day), kind, MEAL_ENERGY, day);

/**
 * 내가 일찍 잠든 사이(잠든 시각 ~ 밤 9시) 친구들이 보낸 저녁을 한 시간씩 건너뛰며 지낸다.
 * 화면에서처럼 두뇌(chooseActivity)가 할 일을 고르고 결과만 남긴다: 일하면 보수(게시판 일감이 줄고 하루 두 개까지),
 * 라멘을 먹으면 돈과 기운, 수다 · 같이 라멘은 짝도 마음이 풀린다. 토벌 · 시험 · 공연처럼 화면에서 봐야 하는 일은 하지 않는다.
 * 밤잠 시간에 잠들면 친구들도 이미 자는 중이라 그대로 돌려준다. 넘겨받은 state · minds 는 바꾸지 않는다.
 * opts: { day, fromHour, toHour = 밤 9시, random, skip: 끼지 않는 친구 kind 들(첫날 안내 중인 하치와레) }
 * → { state, minds, events: [{ type: 'job' | 'meal' | 'chat', who, with?, title?, hour }] }
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
      const v = villagerOf(s, kind, day), spec = VILLAGERS[kind], m = growNeeds(next[kind], kind, HOUR_SECONDS);
      const left = boardOf(s, day).left;
      const jobs = v.jobs < MAX_JOBS_PER_DAY ? spec.jobs.filter((id) => left[id] > 0) : [];
      const friends = kinds.filter((k) => !done.has(k)).map((k) => ({ kind: k, dist: 10 }));
      const c = chooseActivity({
        kind, hour, energy: v.energy, money: v.money, fun: m.fun, social: m.social, diligence: spec.diligence, appetite: spec.eat,
        jobs: jobs.length > 0, guiding, hunter: null, friends, show: null, player: null
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
