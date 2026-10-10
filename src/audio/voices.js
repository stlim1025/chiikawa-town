/**
 * 친구들 목소리(대사 한 줄마다): 음원 없이 Web Audio 로 합성한다. 톱니파(성대) → 모음마다 다른 공명 필터 셋(포먼트) → 크기 곡선,
 * '하 · 히 · 헤'의 숨소리는 잡음, 끝 음높이 · 떨림으로 말투를 낸다. 원작 목소리를 흉내 낸 짧은 소리:
 *  - 우사기: "야하!" · "우라!" · "하아?" · "푸루루루" (높고 힘찬 외침)
 *  - 치이카와: "헤에~" · "히힣" 웃음 · "흐에…" 울먹임 · "힛!" 놀람 · 작게 "에…" (말 대신 작은 소리만)
 *  - 모몽가: "흥!" (코맹맹이), 그 밖엔 높고 새침한 옹알이
 *  - 하치와레: 대사 글자의 모음을 따라 옹알거리는 말소리(동물의 숲 말소리처럼, 물음표면 끝이 올라간다)
 * pickVoice(kind, text) → 음절 목록 | null(그 친구는 원래 톡톡 말소리). speak(env, kind, text) → 소리를 냈으면 true.
 * env: { ctx: AudioContext, bus: 연결할 곳, noise: 잡음 버퍼 }
 */
// 모음 공명(어른 기준 Hz). shift 로 작은 몸집만큼 올린다.
const VOWELS = { a: [1000, 1500, 2900], i: [380, 2700, 3500], u: [430, 1150, 2700], e: [600, 2200, 3000], o: [620, 1050, 2800] };
const GAINS = [1, 0.6, 0.28], QS = [4, 6, 9];
// 모음마다 크기 맞추기('이 · 우'는 공명이 높은 목소리 아래 · 위로 비켜 작게 들린다)
const VOWEL_GAIN = { a: 1, e: 0.8, i: 2.2, u: 1.6, o: 1.1 };
// 한글 가운데 소리(중성) 21개 → 가까운 모음
const JUNG = ['a', 'e', 'a', 'e', 'o', 'e', 'o', 'e', 'o', 'a', 'e', 'e', 'o', 'u', 'o', 'e', 'i', 'u', 'u', 'i', 'i'];

const U = { shift: 1.3 }, C = { shift: 1.4 }, M = { shift: 1.25 };
const s = (o, base) => ({ ...base, ...o });
const USAGI = {
  yaha: [s({ from: 'i', v: 'a', f0: [780, 930], dur: 0.12, gap: 0.01 }, U), s({ c: 'h', v: 'a', f0: [1180, 820], dur: 0.3, vib: [7, 30] }, U)],
  ura: [s({ v: 'u', f0: [660, 780], dur: 0.09, gap: 0 }, U), s({ c: 'r', from: 'e', v: 'a', f0: [920, 1260], dur: 0.26, vib: [8, 35] }, U)],
  haa: [s({ c: 'h', v: 'a', f0: [520, 1000], dur: 0.38 }, U)],
  pururu: [s({ c: 'k', v: 'u', f0: [900, 920], dur: 0.05, gap: 0 }, U),
    ...[0, 1, 2, 3, 4].map((i) => s({ c: 'r', v: 'u', f0: [940 + i * 30, 960 + i * 30], dur: 0.045, gap: 0 }, U)), s({ c: 'r', v: 'u', f0: [1120, 900], dur: 0.12 }, U)]
};
const CHII = {
  hee: [s({ c: 'h', v: 'e', f0: [900, 660], dur: 0.42, vib: [9, 45], breath: 0.35 }, C)],
  hihi: [s({ c: 'h', v: 'i', f0: [980, 1050], dur: 0.07 }, C), s({ c: 'h', v: 'i', f0: [1020, 1100], dur: 0.07 }, C), s({ c: 'h', v: 'i', f0: [1080, 1230], dur: 0.12 }, C)],
  hue: [s({ c: 'h', from: 'u', v: 'e', f0: [820, 560], dur: 0.5, vib: [10, 55], breath: 0.45 }, C)],
  hic: [s({ c: 'h', v: 'i', f0: [1100, 1320], dur: 0.1 }, C)],
  tiny: [s({ v: 'e', f0: [860, 960], dur: 0.13, breath: 0.25 }, C)]
};
const MOMO = { hmph: [s({ c: 'h', v: 'u', f0: [760, 520], dur: 0.2, nasal: true }, M)] };
// 대사마다 나는 소리라 톡톡 말소리보다 조금만 크게(헤드리스에서 평균 크기를 재어 맞췄다)
const VOL = { usagi: 0.2, chiikawa: 0.22, momonga: 0.22, hachiware: 0.18 };

/** 글자 모음을 따라 옹알거린다: 2 ~ 7 음절, 첫소리에 따라 짧은 자음, 물음표면 끝이 올라가고 느낌표면 높게 시작해 떨어진다. */
function babble(text, base, shift) {
  const chars = [...text].filter((ch) => ch >= '가' && ch <= '힣');
  if (!chars.length) return null;
  const n = Math.max(2, Math.min(7, Math.round(chars.length / 2))), step = chars.length / n;
  const q = /\?/.test(text), ex = /!/.test(text), wavy = /~/.test(text), out = [];
  for (let i = 0; i < n; i++) {
    const code = chars[Math.floor(i * step)].charCodeAt(0) - 0xac00, cho = Math.floor(code / 588), v = JUNG[Math.floor((code % 588) / 28)];
    const c = cho === 18 ? 'h' : cho === 11 ? null : cho === 5 ? 'r' : cho === 9 || cho === 10 ? 's' : cho === 2 || cho === 6 ? null : 'k';
    const f0 = base * (1 + 0.1 * Math.sin(i * 1.9 + n) + (ex ? 0.08 : 0)), last = i === n - 1;
    const end = !last ? f0 * 0.97 : q ? f0 * 1.28 : ex ? f0 * 0.82 : f0 * 0.9;
    out.push({ c, v, f0: [f0, end], dur: last ? 0.11 : 0.07, gap: 0.012, nasal: cho === 2 || cho === 6, vib: last && wavy ? [8, 30] : null, shift });
  }
  return out;
}
/** 그 친구가 이 대사에서 낼 소리(음절 목록). 괄호 속 지문은 빼고 본다. */
export function pickVoice(kind, text = '') {
  const t = String(text).replace(/\([^)]*\)/g, ' ');
  if (kind === 'usagi') return /야하/.test(t) ? USAGI.yaha : /하아|하\?/.test(t) ? USAGI.haa : /[후푸]루루/.test(t) ? USAGI.pururu : USAGI.ura;
  if (kind === 'chiikawa') {
    if (/히힣|히히|헤헤/.test(t)) return CHII.hihi;
    if (/흐에|훌쩍|히잉|흑|으앙|엉엉/.test(t)) return CHII.hue;
    if (/헤에|헤…|헤\./.test(t)) return CHII.hee;
    if (/!/.test(t) && t.replace(/[^가-힣]/g, '').length <= 3) return CHII.hic;
    return CHII.tiny;
  }
  if (kind === 'momonga') return /흥/.test(t) ? MOMO.hmph : babble(t, 900, 1.25);
  if (kind === 'hachiware') return babble(t, 640, 1.15);
  return null;
}

let current = null; // 지금 나는 말소리: 다음 줄이 오면 짧게 줄여 겹치지 않게
const noiseSrc = (env) => { const n = env.ctx.createBufferSource(); n.buffer = env.noise; return n; };
function consonant(env, c, t, V, out) {
  const { ctx } = env, n = noiseSrc(env), f = ctx.createBiquadFilter(), g = ctx.createGain(), len = c === 'h' ? 0.05 : 0.015;
  f.type = 'bandpass';
  f.frequency.value = c === 'h' ? V[1] * 1.2 : c === 's' ? 5200 : 2600;
  f.Q.value = c === 'h' ? 1.2 : 2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(c === 'h' ? 0.5 : 0.35, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(f).connect(g).connect(out);
  n.start(t);
  n.stop(t + len + 0.02);
}
/** 음절 하나: (자음) → 톱니파 + 공명 셋(모음, from 이 있으면 그 모음에서 미끄러진다) · 떨림 · 숨소리. 끝나는 시각을 돌려준다. */
function syllable(env, sy, t0, out) {
  const { ctx } = env, V = VOWELS[sy.v], A = VOWELS[sy.from || sy.v], k0 = sy.shift || 1.2, dur = sy.dur;
  if (sy.c && sy.c !== 'r') consonant(env, sy.c, t0, V, out);
  const tv = t0 + (sy.c === 'h' ? 0.04 : sy.c === 'k' || sy.c === 's' ? 0.015 : 0);
  const osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(sy.f0[0], tv);
  osc.frequency.linearRampToValueAtTime(sy.f0[1], tv + dur);
  if (sy.vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = sy.vib[0];
    lg.gain.value = sy.vib[1];
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(tv);
    lfo.stop(tv + dur + 0.1);
  }
  const top = VOWEL_GAIN[sy.v] || 1;
  amp.gain.setValueAtTime(0.0001, tv);
  amp.gain.exponentialRampToValueAtTime(top, tv + 0.018);
  if (sy.c === 'r') { amp.gain.linearRampToValueAtTime(top * 0.25, tv + 0.035); amp.gain.linearRampToValueAtTime(top, tv + 0.055); } // 혀를 한 번 튕긴다
  amp.gain.setValueAtTime(top, tv + Math.max(0.06, dur * 0.7));
  amp.gain.exponentialRampToValueAtTime(0.0001, tv + dur + 0.05);
  for (let k = 0; k < 3; k++) {
    const bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass';
    bp.Q.value = QS[k];
    bp.frequency.setValueAtTime(A[k] * k0, tv);
    if (sy.from) bp.frequency.linearRampToValueAtTime(V[k] * k0, tv + Math.min(dur * 0.45, 0.08));
    g.gain.value = GAINS[k] * (sy.nasal && k > 0 ? 0.3 : 1);
    osc.connect(bp).connect(g).connect(amp);
  }
  if (sy.breath) {
    const n = noiseSrc(env), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass';
    bp.frequency.value = V[1] * k0;
    bp.Q.value = 2;
    g.gain.value = sy.breath * 0.5;
    n.connect(bp).connect(g).connect(amp);
    n.start(tv);
    n.stop(tv + dur + 0.06);
  }
  amp.connect(out);
  osc.start(tv);
  osc.stop(tv + dur + 0.08);
  return tv + dur;
}
/** 대사 한 줄의 목소리를 낸다(그 친구 몫이 아니면 false — 원래 톡톡 말소리를 쓰게). */
export function speak(env, kind, text) {
  const syl = pickVoice(kind, text);
  if (!syl || !env || !env.ctx) return false;
  const { ctx } = env, now = ctx.currentTime;
  if (current && current.context === ctx) { current.gain.cancelScheduledValues(now); current.gain.setTargetAtTime(0.0001, now, 0.02); }
  const out = ctx.createGain();
  out.gain.value = VOL[kind] || 0.2;
  out.connect(env.bus);
  current = out;
  let t = now + 0.01;
  for (const sy of syl) t = syllable(env, sy, t, out) + (sy.gap ?? 0.025);
  return true;
}
