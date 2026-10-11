import test from 'node:test';
import assert from 'node:assert/strict';

/** 가짜 소리 장치: 만든 소리(오실레이터 · 잡음)를 센다. 곡을 스케줄하다 오류가 나면 테스트가 깨진다. */
function fakeAudio() {
  const made = { osc: 0, noise: 0, types: new Set() };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = (extra = {}) => ({ connect() {}, ...extra });
  class Ctx {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createGain() { return node({ gain: param() }); }
    createOscillator() { made.osc++; const o = node({ frequency: param(), start() {}, stop() {} }); return new Proxy(o, { set(t, k, v) { if (k === 'type') made.types.add(v); t[k] = v; return true; } }); }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    createBufferSource() { made.noise++; return node({ start() {}, stop() {} }); }
    createBiquadFilter() { return node({ frequency: param(), Q: { value: 1 } }); }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  globalThis.window = { AudioContext: Ctx };
  globalThis.document = { hidden: false, addEventListener() {} };
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true }); // 노드는 읽기 전용 getter
  return made;
}

test('보스전 곡: 라단조 8마디 · 마을 곡보다 빠르고, 켜면 북 · 베이스 · 화음 · 선율이 오류 없이 울린다', async () => {
  const made = fakeAudio();
  const { createSound, BOSS_BARS, BOSS_TEMPO } = await import('../src/audio/sound.js');
  assert.equal(BOSS_BARS.length, 8);
  for (const b of BOSS_BARS) { assert.equal(b.mel.length, 8); assert.equal(b.tones.length, 3); }
  assert.ok(BOSS_TEMPO > 100, '마을 곡(100)보다 빠르다');

  const timers = [];
  const realSet = globalThis.setInterval;
  globalThis.setInterval = (fn) => { timers.push(fn); return 0; };
  try {
    const sound = createSound({ getItem: () => null, setItem() {} });
    sound.unlock();
    sound.startMusic();
    const run = (n) => { for (let i = 0; i < n; i++) timers.forEach((f) => f()); };
    run(1);
    const village = made.osc;
    assert.ok(village > 0, '마을 곡이 울린다');
    sound.bossMusic(true);
    assert.equal(sound.bossOn, true);
    const before = { osc: made.osc, noise: made.noise };
    run(1);
    assert.ok(made.osc - before.osc > village * 2, '보스 곡은 한 번에 훨씬 많은 소리를 겹친다(웅장하게)');
    assert.ok(made.noise > before.noise, '북 · 심벌 잡음');
    assert.ok(made.types.has('sawtooth') && made.types.has('square') && made.types.has('triangle'));
    sound.bossMusic(false);
    assert.equal(sound.bossOn, false);
    run(1);
  } finally { globalThis.setInterval = realSet; }
});
