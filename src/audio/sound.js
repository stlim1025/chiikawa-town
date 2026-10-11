// 효과음과 배경음악. 음원 파일 없이 Web Audio 로 그 자리에서 합성한다(외부 파일을 불러올 수 없는 환경이라).
// 브라우저는 사용자가 한 번 누르기 전까지 소리를 막으므로, 첫 누름에서 unlock() 을 부른다.

import { IDOL_BPM, CHORDS, songAt } from '../core/idolsong.js';

import { playVoice, hush } from './voices.js';
const PREFS_KEY = 'chiikawa-town-sound';
const MUSIC_VOL = 0.28, SFX_VOL = 0.9;

// 배경음악: 오르골 느낌의 8마디 반복(8분음표, MIDI 번호, 0 은 쉼표). 화음은 C · Am · F · G 진행.
const MELODY = [
  72, 76, 79, 76, 77, 76, 74, 0, 72, 0, 69, 72, 76, 74, 72, 0,
  69, 72, 77, 76, 74, 72, 74, 76, 79, 0, 77, 76, 74, 0, 71, 0,
  72, 76, 79, 81, 79, 76, 77, 79, 76, 0, 72, 74, 76, 0, 72, 69,
  69, 72, 74, 77, 76, 74, 71, 74, 72, 0, 67, 0, 72, 0, 0, 0
];
const BASS = [48, 45, 41, 43, 48, 45, 41, 48]; // 마디마다 근음(1·3박에 친다)
const TEMPO = 100;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/**
 * 보스전 곡(보스가 깨어 가까이 있을 때 · main.js 가 bossMusic(true)): 라단조 · 빠른 템포, 8마디 반복.
 * 마디마다 근음(쿵쿵 몰아치는 8분 베이스) · 화음(길게 까는 현 · 박마다 금관 찌르기) · 선율(8분 8칸, 0 은 쉼 · 뒤 쉼만큼 끈다).
 * 북: 1 · 4 · 5박 킥, 3 · 7박 스네어, 8분 하이햇, 4 · 8마디 끝은 탐탐 몰아치기.
 */
export const BOSS_TEMPO = 138;
export const BOSS_BARS = [
  { root: 38, tones: [62, 65, 69], mel: [74, 0, 77, 0, 81, 0, 79, 77] }, // Dm
  { root: 34, tones: [58, 62, 65], mel: [74, 0, 0, 0, 70, 72, 74, 0] }, // B♭
  { root: 36, tones: [60, 64, 67], mel: [76, 0, 79, 0, 84, 0, 83, 81] }, // C
  { root: 33, tones: [61, 64, 69], mel: [81, 0, 0, 0, 76, 0, 73, 0] }, // A
  { root: 38, tones: [62, 65, 69], mel: [74, 0, 77, 0, 81, 0, 86, 0] }, // Dm
  { root: 31, tones: [58, 62, 67], mel: [82, 0, 81, 79, 77, 0, 74, 0] }, // Gm
  { root: 34, tones: [58, 62, 65], mel: [77, 0, 79, 81, 82, 0, 79, 0] }, // B♭
  { root: 33, tones: [61, 64, 69], mel: [81, 0, 0, 0, 0, 0, 73, 76] } // A → 처음으로
];

/** 친구마다 말소리 높이(Hz). */
const VOICE = { chiikawa: 820, hachiware: 700, usagi: 980, momonga: 900, kurimanju: 420, rakko: 520, shisa: 760, kani: 640, pochette: 600, labor: 330, ramen: 380, captain: 300,
  hitoha: 860, futaba: 900, islander: 880, jiro: 280, siren: 560, // 수상한 섬 사람들
  idolG: 940, idolP: 1040, idolW: 880, idolV: 780 }; // 파자마 파티즈(초록 · 분홍 · 하양 · 보라)

/**
 * 소리 장치를 만든다. storage 는 localStorage 처럼 getItem/setItem 이 있는 객체(막혀 있어도 동작한다).
 */
export function createSound(storage) {
  const prefs = { sfx: true, music: true };
  try { Object.assign(prefs, JSON.parse(storage.getItem(PREFS_KEY) || '{}')); } catch { /* 저장소가 막혀도 기본값으로 */ }

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let musicOn = false, nextTime = 0, step = 0, ducked = false, boss = false, bossStep = 0;
  let charge = null; // { osc, gain }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // 아이폰: 무음(벨소리) 스위치를 켜 둬도 게임 소리가 나게(음악 앱처럼 'playback'). 끄고 싶으면 마을폰 설정에서 끈다
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* 없는 브라우저 */ }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = prefs.sfx ? SFX_VOL : 0;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = prefs.music ? MUSIC_VOL : 0;
    musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // 화면을 떠나 있으면 소리도 쉰다
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); // 못 깨우면 다음 누름에서(unlock)
    });
    return ctx;
  }

  /** 짧은 음 하나. slideTo 가 있으면 그 높이로 미끄러진다. */
  function tone({ freq, type = 'sine', start = 0, dur = 0.15, vol = 0.2, attack = 0.006, slideTo = 0, bus = sfxBus }) {
    const t0 = ctx.currentTime + start, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  /** 걸러 낸 잡음(뽑히는 소리, 후루룩, 쿵). */
  function noise({ start = 0, dur = 0.15, vol = 0.2, freq = 1500, q = 1, type = 'bandpass', sweepTo = 0, bus = sfxBus }) {
    const t0 = ctx.currentTime + start, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    click: () => tone({ freq: 620, slideTo: 900, type: 'triangle', dur: 0.08, vol: 0.14 }),
    // 초록 구간에 들어섰다는 신호
    zone: () => tone({ freq: 1568, type: 'sine', dur: 0.12, vol: 0.12 }),
    clean: () => {
      noise({ dur: 0.09, vol: 0.22, freq: 2400, q: 0.8 });
      tone({ freq: 520, slideTo: 1040, type: 'square', dur: 0.1, vol: 0.06 });
      [1047, 1319, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'triangle', start: 0.07 + i * 0.055, dur: 0.22, vol: 0.12 }));
    },
    snap: () => {
      noise({ dur: 0.05, vol: 0.3, freq: 3200, type: 'highpass' });
      tone({ freq: 330, slideTo: 110, type: 'triangle', start: 0.03, dur: 0.32, vol: 0.2 });
    },
    none: () => tone({ freq: 220, slideTo: 180, type: 'sine', dur: 0.12, vol: 0.14 }),
    coin: () => [1319, 1760, 2093, 2637].forEach((f, i) => tone({ freq: f, type: 'square', start: i * 0.07, dur: 0.22, vol: 0.05 })),
    // 돈을 잃었다(기절): 동전이 짤랑짤랑 굴러떨어지며 음이 내려가고, 끝에 '뿅…' 하고 빠지는 소리
    coinLoss: () => {
      [2637, 2093, 1760, 1319, 988].forEach((f, i) => tone({ freq: f, type: 'square', start: i * 0.09, dur: 0.16, vol: 0.045 }));
      [0.05, 0.17, 0.3].forEach((st) => noise({ start: st, dur: 0.05, vol: 0.06, freq: 5200, q: 3 })); // 짤랑
      tone({ freq: 392, slideTo: 196, type: 'triangle', start: 0.48, dur: 0.38, vol: 0.12 });
    },
    eat: () => {
      [0, 0.22, 0.44].forEach((s) => noise({ start: s, dur: 0.18, vol: 0.16, freq: 600, sweepTo: 2600, q: 2 }));
      tone({ freq: 784, slideTo: 1175, type: 'triangle', start: 0.66, dur: 0.18, vol: 0.12 });
    },
    // 친구 말소리: 높이가 다른 짧은 음 서너 개(피요피요)
    talk: (kind) => {
      const base = VOICE[kind] || 700, n = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) tone({ freq: base * (0.85 + Math.random() * 0.35), type: 'triangle', start: i * 0.075, dur: 0.07, vol: 0.09 });
    },
    stamp: () => {
      noise({ dur: 0.12, vol: 0.35, freq: 180, type: 'lowpass' });
      tone({ freq: 140, slideTo: 70, type: 'sine', dur: 0.2, vol: 0.3 });
      [784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', start: 0.16 + i * 0.08, dur: 0.3, vol: 0.11 }));
    },
    pass: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'square', start: i * 0.11, dur: i === 5 ? 0.5 : 0.14, vol: 0.07 })),
    fail: () => [523, 494, 466, 440].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.18, dur: 0.24, vol: 0.13 })),
    sleep: () => [1047, 880, 784, 659, 523].forEach((f, i) => tone({ freq: f, type: 'sine', start: i * 0.2, dur: 0.5, vol: 0.1 })),
    job: () => [784, 988].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.09, dur: 0.16, vol: 0.12 })),
    // 노동 완료: 빰빠밤!
    done: () => [659, 784, 1047, 1319, 1047, 1319, 1568].forEach((f, i) => tone({ freq: f, type: i < 4 ? 'square' : 'triangle', start: i * 0.09, dur: i === 6 ? 0.6 : 0.12, vol: i < 4 ? 0.07 : 0.12 })),
    // 부탁에 필요한 걸 다 모았다: 띠링~ 반짝
    ready: () => [1175, 1568, 2093].forEach((f, i) => tone({ freq: f, type: i === 2 ? 'triangle' : 'sine', start: i * 0.08, dur: i === 2 ? 0.45 : 0.16, vol: 0.11 })),
    // 부탁 완료: 따라라 따~안! 하고 화음이 울린 뒤 반짝반짝
    quest: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'square', start: i * 0.08, dur: 0.1, vol: 0.07 }));
      [1047, 1319, 1568].forEach((f) => tone({ freq: f, type: 'triangle', start: 0.34, dur: 0.9, vol: 0.09 }));
      [2093, 2637, 3136, 2637, 3136].forEach((f, i) => tone({ freq: f, type: 'sine', start: 0.5 + i * 0.1, dur: 0.18, vol: 0.05 }));
    },
    // 친밀도: 퐁퐁(오름), 하트가 늘면 반짝이는 아르페지오
    heart: () => [988, 1319].forEach((f, i) => tone({ freq: f, type: 'sine', start: i * 0.09, dur: 0.22, vol: 0.12 })),
    heartUp: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone({ freq: f, type: i % 2 ? 'triangle' : 'sine', start: i * 0.08, dur: i === 4 ? 0.6 : 0.2, vol: 0.11 })),
    // 토벌(4단계): 휘두르기(휙), 맞히기(퍽), 맞기(아얏), 쓰러뜨리기(뿅), 기절, 몬스터가 노릴 때(으르릉)
    swing: () => noise({ dur: 0.16, vol: 0.22, freq: 900, sweepTo: 3200, q: 1.4 }),
    hit: () => {
      noise({ dur: 0.08, vol: 0.32, freq: 420, type: 'lowpass' });
      tone({ freq: 260, slideTo: 120, type: 'square', dur: 0.1, vol: 0.09 });
      tone({ freq: 1320, type: 'triangle', start: 0.02, dur: 0.07, vol: 0.07 });
    },
    hurt: () => {
      noise({ dur: 0.1, vol: 0.28, freq: 300, type: 'lowpass' });
      tone({ freq: 880, slideTo: 440, type: 'triangle', start: 0.03, dur: 0.22, vol: 0.14 });
    },
    poof: () => {
      noise({ dur: 0.22, vol: 0.24, freq: 1800, sweepTo: 600, q: 0.7 });
      [1175, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'sine', start: 0.1 + i * 0.06, dur: 0.18, vol: 0.09 }));
    },
    // 바닥에 떨어뜨리기: 사락(잎) + 톡
    drop: () => {
      noise({ dur: 0.14, vol: 0.18, freq: 2600, sweepTo: 900, q: 0.8 });
      tone({ freq: 520, slideTo: 300, type: 'triangle', start: 0.08, dur: 0.12, vol: 0.12 });
    },
    growl: () => tone({ freq: 150, slideTo: 210, type: 'sawtooth', dur: 0.28, vol: 0.05 }),
    // 친구 집에서 같이 부르는 짧은 노래(하치와레)
    song: () => [72, 74, 76, 79, 76, 77, 79, 84, 79, 76, 74, 72].forEach((n, i) => {
      tone({ freq: midi(n), type: 'triangle', start: i * 0.24, dur: 0.3, vol: 0.12 });
      if (i % 2 === 0) tone({ freq: midi(n - 12), type: 'sine', start: i * 0.24, dur: 0.45, vol: 0.06 });
    }),
    // 몬스터 공격 예고(짧게 올라가는 삐-) · 땅을 쿵 치는 소리
    warn: () => tone({ freq: 520, slideTo: 880, type: 'triangle', dur: 0.14, vol: 0.06 }),
    thud: () => { tone({ freq: 110, slideTo: 55, type: 'sine', dur: 0.22, vol: 0.2 }); noise({ dur: 0.12, vol: 0.12, freq: 300, sweepTo: 120, q: 0.8 }); },
    faint: () => [659, 587, 523, 440, 330].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.16, dur: 0.3, vol: 0.12 })),
    // 우사기 클럽: 쿵(킥) · 칙(하이햇) · 끽(도토리에 나뭇잎 문지르기) · 와아(손님들 환호) · 둥(터널 너머로 들리는 비트, arg = 크기 0..1)
    kick: () => { tone({ freq: 150, slideTo: 45, type: 'sine', dur: 0.18, vol: 0.32 }); noise({ dur: 0.03, vol: 0.05, freq: 2400, q: 0.7 }); },
    hat: () => noise({ dur: 0.045, vol: 0.06, freq: 8200, q: 0.9, type: 'highpass' }),
    scratch: () => { noise({ dur: 0.12, vol: 0.14, freq: 1300, sweepTo: 3200, q: 2.4 }); tone({ freq: 880, slideTo: 1480, type: 'triangle', dur: 0.08, vol: 0.06 }); },
    cheer: () => { noise({ dur: 0.9, vol: 0.12, freq: 1700, sweepTo: 1100, q: 0.6 }); [660, 880, 990].forEach((f, i) => tone({ freq: f, type: 'triangle', start: 0.05 + i * 0.09, dur: 0.18, vol: 0.05 })); },
    thump: (v = 0.5) => tone({ freq: 95, slideTo: 42, type: 'sine', dur: 0.22, vol: 0.05 + 0.25 * v }),
    // 아침: 해가 뜨며 올라가는 소리
    morning: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.12, dur: 0.4, vol: 0.11 })),
    // 수상한 섬: 세이렌의 노래(살짝 어긋난 두 음이 떨리는 높은 선율) · 물보라 · 파도(쏴아) · 인어 합창 맞힘(딩) · 맥주 캔 두드림(깡)
    siren: () => [79, 84, 83, 79, 76, 79, 74, 76].forEach((n, i) => {
      tone({ freq: midi(n), type: 'sine', start: i * 0.32, dur: 0.5, vol: 0.07, attack: 0.08 });
      tone({ freq: midi(n) * 1.006, type: 'sine', start: i * 0.32 + 0.02, dur: 0.48, vol: 0.04, attack: 0.1 });
    }),
    splash: () => { noise({ dur: 0.5, vol: 0.2, freq: 900, sweepTo: 250, q: 0.6, type: 'lowpass' }); noise({ start: 0.05, dur: 0.35, vol: 0.08, freq: 3000, q: 0.8 }); },
    wave: () => [0, 0.35, 0.7].forEach((st, i) => noise({ start: st, dur: 0.9 - i * 0.15, vol: 0.06, freq: 700 - i * 120, sweepTo: 300, q: 0.5, type: 'lowpass' })),
    chime: () => { tone({ freq: 1568, type: 'sine', dur: 0.35, vol: 0.08 }); tone({ freq: 2349, type: 'sine', start: 0.02, dur: 0.25, vol: 0.04 }); },
    can: () => { tone({ freq: 1900, slideTo: 1500, type: 'square', dur: 0.05, vol: 0.05 }); noise({ dur: 0.06, vol: 0.08, freq: 4200, q: 3 }); }
  };

  // ---------- 배경음악 ----------
  /** 보스전 곡 한 칸(8분음표): 북 · 베이스 · 현 · 금관 찌르기 · 선율(데이터는 BOSS_BARS). */
  function bossNote(at, eighth) {
    const bar = BOSS_BARS[Math.floor(bossStep / 8)], j = bossStep % 8, bus = musicBus, k32 = bossStep % 32;
    // 북: 킥(1 · 4 · 5) · 스네어(3 · 7) · 하이햇, 4 · 8마디 끝 두 칸은 탐탐 몰아치기
    if (j === 0 || j === 3 || j === 4) { tone({ freq: 120, slideTo: 42, type: 'sine', start: at, dur: 0.22, vol: 0.5, bus }); noise({ start: at, dur: 0.03, vol: 0.06, freq: 2600, q: 0.7, bus }); }
    if (j === 2 || j === 6) { noise({ start: at, dur: 0.14, vol: 0.2, freq: 1900, q: 0.7, bus }); tone({ freq: 220, slideTo: 150, type: 'triangle', start: at, dur: 0.08, vol: 0.12, bus }); }
    noise({ start: at, dur: 0.035, vol: 0.035, freq: 8600, q: 0.9, type: 'highpass', bus });
    if (k32 === 14 || k32 === 15 || k32 === 30 || k32 === 31) [0, 0.5].forEach((d, i) => tone({ freq: 170 - (j - 6) * 30 - i * 20, slideTo: 70, type: 'sine', start: at + d * eighth, dur: 0.18, vol: 0.32, bus }));
    // 베이스: 8분마다 근음을 몰아친다(휴대폰 스피커에서도 들리게 한 옥타브 위를 같이)
    tone({ freq: midi(bar.root), type: 'triangle', start: at, dur: eighth * 0.85, vol: j % 2 ? 0.16 : 0.22, bus });
    tone({ freq: midi(bar.root + 12), type: 'square', start: at, dur: eighth * 0.6, vol: 0.035, bus });
    // 현: 마디 첫 박에 화음을 길게 깔고, 1 · 4박에 금관처럼 짧게 찌른다
    if (j === 0) bar.tones.forEach((n) => tone({ freq: midi(n - 12), type: 'triangle', start: at, dur: eighth * 7.6, vol: 0.045, attack: 0.08, bus }));
    if (j === 0 || j === 3) bar.tones.forEach((n) => { tone({ freq: midi(n), type: 'sawtooth', start: at, dur: 0.16, vol: 0.022, bus }); tone({ freq: midi(n) * 1.004, type: 'square', start: at, dur: 0.14, vol: 0.016, bus }); });
    // 선율: 뒤 쉼표만큼 끈다, 세모 + 살짝 어긋난 네모 + 한 옥타브 아래 톱니로 굵게
    const n = bar.mel[j];
    if (n) {
      let len = 1;
      while (j + len < 8 && !bar.mel[j + len]) len++;
      const dur = Math.min(4, len) * eighth * 0.95;
      tone({ freq: midi(n), type: 'triangle', start: at, dur, vol: 0.13, attack: 0.012, bus });
      tone({ freq: midi(n) * 1.003, type: 'square', start: at, dur: dur * 0.85, vol: 0.04, attack: 0.012, bus });
      tone({ freq: midi(n - 12), type: 'sawtooth', start: at, dur: dur * 0.8, vol: 0.02, attack: 0.02, bus });
    }
    bossStep = (bossStep + 1) % (BOSS_BARS.length * 8);
  }

  function scheduleMusic() {
    if (!ctx || ctx.state !== 'running') return;
    if (ducked) { nextTime = ctx.currentTime + 0.05; return; } // 클럽 · 연출 동안 마을 음악은 쉰다
    const eighth = 60 / (boss ? BOSS_TEMPO : TEMPO) / 2;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // 쉬었다 돌아오면 밀린 음을 몰아 치지 않게
    while (nextTime < ctx.currentTime + 0.25) {
      if (boss) { bossNote(nextTime - ctx.currentTime, eighth); nextTime += eighth; continue; } // 보스전: 마을 곡 대신
      const at = nextTime - ctx.currentTime, note = MELODY[step];
      if (note) {
        tone({ freq: midi(note), type: 'sine', start: at, dur: 0.55, vol: 0.22, bus: musicBus });
        tone({ freq: midi(note + 12), type: 'sine', start: at, dur: 0.25, vol: 0.04, bus: musicBus }); // 오르골 반짝임
      }
      if (step % 4 === 0) tone({ freq: midi(BASS[Math.floor(step / 8)]), type: 'triangle', start: at, dur: 0.6, vol: 0.14, bus: musicBus });
      nextTime += eighth;
      step = (step + 1) % MELODY.length;
    }
  }

  function save() { try { storage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* 저장 못 해도 이번 판에는 적용 */ } }

  return {
    prefs,
    /** 첫 누름에서 부른다: 소리 장치를 만들고 깨운다. */
    unlock() {
      const c = ensure();
      if (!c || c.state === 'running' || c.state === 'closed' || document.hidden) return;
      // 아이폰은 전화 · 앱 전환 뒤 'interrupted' 가 되기도 한다 → running 이 아니면 깨운다. 옛 아이폰은 누름 안에서 소리를 하나 내야 풀려서 빈 소리 한 번
      c.resume().catch(() => {});
      try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0); } catch { /* 이미 닫힘 */ }
    },
    /** 효과음. name: click · zone · clean · snap · none · coin · eat · talk · stamp · pass · fail · sleep · job · done · morning */
    play(name, arg) {
      if (!prefs.sfx || !ensure() || ctx.state !== 'running') return;
      SFX[name]?.(arg);
    },
    /** 대사 한 줄의 말소리(audio/voices.js): 치이카와 · 우사기 · 모몽가 · 하치와레는 넣어 둔 음성 파일, 파일이 없거나 다른 친구면 톡톡 말소리. */
    voice(kind, text) {
      if (!prefs.sfx || !ensure() || ctx.state !== 'running') return;
      if (!playVoice(ctx, sfxBus, kind, text)) SFX.talk(kind);
    },
    /** 뽑는 동안 힘에 따라 높아지는 소리. */
    chargeStart() {
      if (!prefs.sfx || !ensure() || ctx.state !== 'running' || charge) return;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 180;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start();
      charge = { osc, gain };
    },
    chargeUpdate(power) {
      if (charge) charge.osc.frequency.setTargetAtTime(180 + power * 520, ctx.currentTime, 0.02);
    },
    chargeStop() {
      if (!charge) return;
      const { osc, gain } = charge, t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.stop(t + 0.08);
      charge = null;
    },
    /** 배경음악을 시작한다(이미 켜져 있으면 그대로). */
    startMusic() {
      if (musicOn || !ensure()) return;
      musicOn = true;
      nextTime = ctx.currentTime + 0.1;
      step = 0;
      setInterval(scheduleMusic, 80);
    },
    /** 마을 배경음악을 잠깐 쉰다(on) · 다시 튼다(off): 우사기 클럽처럼 따로 비트가 울리는 동안. */
    duck(on) { ducked = !!on; },
    /**
     * 보스전 곡으로 바꾼다(on) · 마을 곡으로 돌아간다(off). 바뀔 때 음악을 잠깐 줄였다 키우고, 보스 곡은 쾅 하는 첫 박부터.
     * 배경음악 켜기를 따른다(꺼져 있으면 아무 소리도 안 난다).
     */
    bossMusic(on) {
      on = !!on;
      if (boss === on) return;
      boss = on;
      if (!ctx) return;
      const t = ctx.currentTime, full = prefs.music ? MUSIC_VOL : 0;
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setValueAtTime(musicBus.gain.value, t);
      musicBus.gain.linearRampToValueAtTime(full * 0.15, t + 0.15);
      musicBus.gain.linearRampToValueAtTime(full, t + 0.6);
      nextTime = t + 0.18; // 다음 곡을 처음부터
      if (on) {
        bossStep = 0;
        if (prefs.music) { // 시작 쾅: 낮은 북 + 심벌처럼 퍼지는 잡음
          tone({ freq: 90, slideTo: 38, type: 'sine', start: 0.16, dur: 0.6, vol: 0.55, bus: musicBus });
          noise({ start: 0.16, dur: 1.1, vol: 0.12, freq: 6000, q: 0.5, type: 'highpass', bus: musicBus });
        }
      } else step = 0;
    },
    /** 지금 보스전 곡인지. */
    get bossOn() { return boss; },
    /**
     * 파자마 파티즈의 노래 한 칸(core/idolsong.js): 8분음표 e(곡 시작부터, 준비 박 포함)의 멜로디 · 화음 · 베이스 · 북.
     * 무대 장면이 박자 화면 시계(rhythm.time)에 맞춰 칸이 바뀔 때마다 부른다. 준비 박에는 똑 · 똑 · 똑 · 띵.
     * fever: 다 같이 춤출 때 한 옥타브 위 반짝이를 더한다. 노래는 배경음악 · 북은 효과음 켜기를 따른다.
     */
    idolStep(round, e, fever = false) {
      if (!ensure() || ctx.state !== 'running') return;
      const at = songAt(round, e);
      if (!at) return;
      const j = at.count ? e % 8 : at.j, eighth = 60 / IDOL_BPM / 2;
      if (prefs.sfx) {
        if (at.count) { if (j % 2 === 0) tone({ freq: j === 6 ? 1568 : 1047, type: 'sine', dur: 0.08, vol: 0.1 }); return; }
        if (j % 4 === 0) SFX.kick();
        else if (j % 4 === 2) noise({ dur: 0.09, vol: 0.16, freq: 1700, q: 0.9 }); // 짝(손뼉)
        if (j % 2) SFX.hat();
      }
      if (at.count || !prefs.music) return;
      const b = at.data, ch = CHORDS[b.chord], n = b.mel[j];
      if (n) {
        let len = 1;
        while (j + len < 8 && !b.mel[j + len]) len++; // 뒤 쉼표만큼 길게 끈다
        const dur = Math.min(4, len) * eighth * 0.92;
        tone({ freq: midi(n), type: 'triangle', dur, vol: 0.13, attack: 0.012, bus: musicBus });
        tone({ freq: midi(n), type: 'square', dur: dur * 0.7, vol: 0.035, attack: 0.012, bus: musicBus }); // 반짝이는 8비트 아이돌 소리
        if (fever) tone({ freq: midi(n + 12), type: 'sine', dur: dur * 0.6, vol: 0.04, bus: musicBus });
      }
      if (j === 0 || j === 4) tone({ freq: midi(ch.bass), type: 'triangle', dur: eighth * 3.6, vol: 0.16, bus: musicBus });
      if (j % 2 === 1) ch.tones.forEach((f) => tone({ freq: midi(f), type: 'triangle', dur: eighth * 0.8, vol: 0.028, bus: musicBus })); // 엇박 화음(통통 튀게)
    },
    /** 효과음(sfx) 또는 배경음악(music)을 켜고 끈다. 바뀐 값을 돌려준다. */
    toggle(kind) {
      prefs[kind] = !prefs[kind];
      save();
      if (kind === 'sfx' && !prefs.sfx) hush(); // 말하던 목소리도 멈춘다
      if (ctx) {
        const bus = kind === 'sfx' ? sfxBus : musicBus, on = kind === 'sfx' ? SFX_VOL : MUSIC_VOL;
        bus.gain.setTargetAtTime(prefs[kind] ? on : 0, ctx.currentTime, 0.05);
      }
      return prefs[kind];
    }
  };
}
