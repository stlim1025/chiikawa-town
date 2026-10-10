import { ramenQuiz } from '../core/ramen.js';

/**
 * 사이드스토리 '시사의 슈퍼 알바이터'(원작: 라멘 로우 사부님을 '사부님'이라 부르며 따르는 시사가, 같이 일하려고 아주 어려운 슈퍼 알바이터 자격을 딴다).
 * 데이터(부탁 · 보상)는 core/quests.js 의 shisaArbeiter.
 *  · quiz: 저녁 공부 — 내가 레시피 책에서 문제를 내고(ramenQuiz), 시사가 답하면 "맞아!" · "땡!" 으로 판정해 준다(틀리게 판정하면 해설이 알려 준다).
 *  · exam: 시험 날 — 검정소 앞에서 떠는 시사를 응원 → 한 시간 뒤 "합격했어요!!" → 사부님이 와서 앞치마를 건넨다.
 * ctx: { guide, npcs, hud, sound, input, village, staged, who(kind), me(), narrator, fill(lines), skipHours(h), getPlayer() }
 */
const QUIZ_ROUNDS = 4;

export function createShisaStory(ctx) {
  const { guide, npcs, hud, sound, input, village, staged } = ctx;
  const S = () => ctx.who('shisa'), R = () => ctx.who('ramen'), N = () => ctx.narrator, ME = () => ctx.me();
  const say = (lines, then, who) => guide.say(ctx.fill(lines), then, who);
  let outro = null; // 시험 장면이 끝나고 마무리 대사가 닫히면 붙잡은 둘을 놓아 준다

  /** 저녁 공부(퀴즈). done: 다 끝나면(퀘스트 단계 마무리). */
  function quiz(done) {
    const qs = ramenQuiz(QUIZ_ROUNDS);
    // 시사의 답: 처음엔 반쯤 헷갈리다가 뒤로 갈수록 맞힌다
    const rightOf = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.7, true];
    let i = 0, good = 0;
    const round = () => {
      if (i >= qs.length) { finish(); return; }
      const q = qs[i], right = rightOf[i];
      const pick = right ? q.answer : (q.answer + 1 + Math.floor(Math.random() * (q.choices.length - 1))) % q.choices.length;
      say([{ who: ME(), text: `문제! ${q.q}` }, { who: S(), text: `음… 음…! '${q.choices[pick]}'!` }], () => {
        guide.ask('시사의 답은…?', ['맞아!', '땡! 틀렸어'], (k) => {
          const saidRight = k === 0;
          if (saidRight === right) good++;
          const answer = q.choices[q.answer];
          const lines = right
            ? (saidRight ? [{ who: S(), text: '앗싸! 맞았다~!' }] : [{ who: S(), text: '에엣?! 맞는 줄 알았는데…' }, { who: N(), text: '(사실 맞는 답이었다… 시사가 헷갈려 버렸다!)' }])
            : (saidRight ? [{ who: S(), text: '헤헤, 맞았죠?' }, { who: N(), text: `(사실 정답은 '${answer}'였다…!)` }] : [{ who: S(), text: `앗… 정답은 '${answer}'였군요! 외웠어요!` }]);
          sound.play(saidRight === right ? 'heart' : 'none');
          i++;
          say(lines, round, S());
        }, ME());
      }, ME());
    };
    const finish = () => {
      const end = good >= QUIZ_ROUNDS ? [{ who: S(), text: '전부 제대로 짚어 주셨어요…! {name} 님은 문제 내는 천재예요!' }]
        : good >= 2 ? [{ who: S(), text: '헷갈렸던 건 다시 외웠어요!' }] : [{ who: S(), text: '으으… 아직 멀었네요… 오늘 밤새 레시피 책을 볼게요!' }];
      say(end, done, S());
    };
    say([{ who: S(), text: '{name} 님! 와 주셨군요!' }, { who: S(), text: '레시피 책에서 문제를 내 주세요! 제가 맞혀 볼게요!' }], round, S());
  }

  /** 시험 날 장면(검정소 앞). done: 다 보고 나면(마무리 대사 · 보상). */
  function exam(done) {
    const ex = village.spots.exam, p = ctx.getPlayer().position;
    const shisa = npcs.byKind('shisa');
    staged.add('shisa');
    input.setEnabled(false);
    if (shisa) {
      const at = village.nearestFree(ex.x - 0.9, ex.z + 0.5, 0.35);
      npcs.comeOut(shisa, at.x, at.z);
      npcs.act(shisa, 'shy', { face: p, time: 60 });
    }
    say([{ who: S(), text: '다, 다 왔어요…!' }, { who: N(), text: '(시사의 손이 부들부들 떨린다…)' }, { who: S(), text: '머리가 새하얘질 것 같아요…!' }], () => {
      guide.ask('시사에게 한마디…', ['할 수 있어!', '평소대로만 하면 돼!', '(꼭 안아 준다)'], (k) => {
        const reply = [[{ who: S(), text: '네…! 할 수 있어요!!' }], [{ who: S(), text: '평소대로… 사부님처럼…! 네!' }], [{ who: S(), text: '…!! (얼굴이 새빨개졌다) 히, 힘이 나요…!' }]][k];
        say([...reply, { who: S(), text: '다녀오겠습니다!' }], () => waitExam(done), S());
      }, ME());
    }, S());
  }
  function waitExam(done) {
    const shisa = npcs.byKind('shisa'), ex = village.spots.exam;
    if (shisa) npcs.act(shisa, 'hop', { time: 0.8 });
    setTimeout(() => {
      if (shisa) npcs.goIn(shisa); // 검정소 안으로
      hud.curtain(true, '(한 시간쯤 지났다…)');
      ctx.skipHours(1);
      setTimeout(() => {
        if (shisa) { const at = village.nearestFree(ex.x - 0.6, ex.z + 0.8, 0.35); npcs.comeOut(shisa, at.x, at.z); npcs.act(shisa, 'look', { face: ctx.getPlayer().position, time: 60 }); }
        hud.curtain(false);
        say([{ who: N(), text: '(검정소 문이 열리고 시사가 나왔다…)' }, { who: S(), text: '……' }, { who: S(), text: '{name} 님…' }, { who: S(), text: '합격… 했어요…!!' }], () => {
          if (shisa) npcs.act(shisa, 'hop', { time: 3, say: '야호~!!' });
          sound.play('pass');
          setTimeout(() => master(done), 1200);
        }, S());
      }, 1700);
    }, 700);
  }
  function master(done) {
    const ex = village.spots.exam, m = npcs.byKind('ramen'), shisa = npcs.byKind('shisa');
    if (m) {
      staged.add('ramen');
      const at = village.nearestFree(ex.x + 1.3, ex.z + 1.1, 0.35);
      npcs.comeOut(m, at.x, at.z);
      npcs.act(m, 'talk', { face: shisa || ex, time: 60 });
    }
    if (shisa && m) npcs.act(shisa, 'look', { face: m, time: 60 });
    say([{ who: R(), text: '…시사.' }, { who: S(), text: '사, 사부님?!' }, { who: R(), text: '…합격했다고 들었다. 수고했다.' },
      { who: N(), text: '(사부님이 새하얀 앞치마를 건넸다)' }, { who: R(), text: '오늘부터 주방에서 같이 하자.' }, { who: S(), text: '사부니임…!! (눈물이 그렁그렁)' }], () => {
      if (shisa) npcs.act(shisa, 'hop', { time: 2.5 });
      outro = { t: 0 };
      done();
    }, R());
  }

  return {
    quiz,
    exam,
    /** 매 프레임: 시험 장면의 마무리 대사가 닫히면 시사 · 사부님을 일과로 돌려보낸다. */
    update(dt) {
      if (!outro) return;
      outro.t += dt;
      if (outro.t < 0.5 || guide.open) return;
      outro = null;
      ['shisa', 'ramen'].forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) { npcs.plan(n, []); staged.delete(k); } });
      setTimeout(() => hud.toast('라멘 로우에 시사 특제 라멘이 생겼어요!', 3800), 4800);
    },
    reset() { outro = null; staged.delete('shisa'); staged.delete('ramen'); }
  };
}
