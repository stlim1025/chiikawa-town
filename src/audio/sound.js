// 효과음과 배경음악. 음원 파일 없이 Web Audio 로 그 자리에서 합성한다(외부 파일을 불러올 수 없는 환경이라).
// 브라우저는 사용자가 한 번 누르기 전까지 소리를 막으므로, 첫 누름에서 unlock() 을 부른다.

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

/** 친구마다 말소리 높이(Hz). */
const VOICE = { chiikawa: 820, hachiware: 700, usagi: 980, momonga: 900, kurimanju: 420, rakko: 520, shisa: 760, kani: 640, pochette: 600, labor: 330, ramen: 380, captain: 300 };

/**
 * 소리 장치를 만든다. storage 는 localStorage 처럼 getItem/setItem 이 있는 객체(막혀 있어도 동작한다).
 */
export function createSound(storage) {
  const prefs = { sfx: true, music: true };
  try { Object.assign(prefs, JSON.parse(storage.getItem(PREFS_KEY) || '{}')); } catch { /* 저장소가 막혀도 기본값으로 */ }

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let musicOn = false, nextTime = 0, step = 0;
  let charge = null; // { osc, gain }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
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
      if (document.hidden) ctx.suspend(); else ctx.resume();
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
  function noise({ start = 0, dur = 0.15, vol = 0.2, freq = 1500, q = 1, type = 'bandpass', sweepTo = 0 }) {
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
    g.connect(sfxBus);
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
    // 아침: 해가 뜨며 올라가는 소리
    morning: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.12, dur: 0.4, vol: 0.11 }))
  };

  // ---------- 배경음악 ----------
  function scheduleMusic() {
    if (!ctx || ctx.state !== 'running') return;
    const eighth = 60 / TEMPO / 2;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // 쉬었다 돌아오면 밀린 음을 몰아 치지 않게
    while (nextTime < ctx.currentTime + 0.25) {
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
      if (c && c.state === 'suspended' && !document.hidden) c.resume();
    },
    /** 효과음. name: click · zone · clean · snap · none · coin · eat · talk · stamp · pass · fail · sleep · job · done · morning */
    play(name, arg) {
      if (!prefs.sfx || !ensure() || ctx.state !== 'running') return;
      SFX[name]?.(arg);
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
    /** 효과음(sfx) 또는 배경음악(music)을 켜고 끈다. 바뀐 값을 돌려준다. */
    toggle(kind) {
      prefs[kind] = !prefs[kind];
      save();
      if (ctx) {
        const bus = kind === 'sfx' ? sfxBus : musicBus, on = kind === 'sfx' ? SFX_VOL : MUSIC_VOL;
        bus.gain.setTargetAtTime(prefs[kind] ? on : 0, ctx.currentTime, 0.05);
      }
      return prefs[kind];
    }
  };
}
