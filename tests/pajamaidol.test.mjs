import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
const { createIdolStory } = await import('../src/stories/pajamaidol.js');
const I = await import('../src/core/idolsong.js');

/** 가짜 무대 · 대화 상자(바로 넘어간다) · 박자 화면 · 소리로 연출 순서만 본다. */
function fake() {
  const calls = { modes: [], cinematic: [], duck: [], starts: [], fans: 0, input: null };
  const stage = {
    start() {}, shot() {}, setMood() {}, setPals() {}, setFever() {}, setHype() {}, cheer() {}, usagiJoin() {}, palsJoin() {}, update() {},
    addFan() { return ++calls.fans; }, get fans() { return calls.fans; }, anchor: () => ({ x: 1, y: 2, z: 3 })
  };
  const rhythm = {
    active: false, time: 0, hype: 0.3,
    start(opts) { calls.starts.push(opts); this.active = true; }, stop() { this.active = false; }, update() {}, press() {}
  };
  const ctx = {
    hud: { curtain() {}, setAction() {}, toast() {} },
    guide: { open: false, say(lines, then) { if (then) then(); } },
    sound: { duck(on) { calls.duck.push(on); }, play() {}, idolStep() {} },
    input: { setEnabled(on) { calls.input = on; } },
    rhythm, stage, cam: { snap() {} }, getPlayer: () => ({ position: { x: 0, z: 0 } }),
    who: (kind) => ({ kind, name: kind }), narrator: { kind: null, name: '…' }, fill: (lines) => lines,
    setMode(m) { calls.modes.push(m); }, setCinematic(on) { calls.cinematic.push(on); }, myLook: () => ({})
  };
  const finishRound = (rank) => { rhythm.active = false; calls.starts.at(-1).onEnd({ rank }); };
  return { ctx, calls, finishRound };
}

test('파자마 파티즈 연출: 막 → 1절(갑옷 씨가 모여든다) → 친구들 무대로 → 2절 → 마무리 → 마을, 마무리는 한 번만', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { ctx, calls, finishRound } = fake();
    const story = createIdolStory(ctx);
    let done = 0;
    story.play(() => done++);
    assert.equal(story.phase, 'intro');
    assert.equal(calls.input, false, '연출 동안은 걷지 않는다');
    mock.timers.tick(1100);
    assert.deepEqual(calls.modes, ['idol']);
    assert.deepEqual(calls.duck, [true], '마을 음악은 쉰다');
    mock.timers.tick(700);
    assert.equal(story.phase, 'round');
    assert.equal(story.round, 1);
    assert.deepEqual(calls.starts[0].chart, I.idolChart(1));
    for (let i = 1; i <= 10; i++) calls.starts[0].onHit('perfect', i);
    assert.equal(calls.fans, 2, '다섯 번 맞출 때마다 하나씩');
    finishRound('B');
    assert.ok(calls.fans >= 5, '1절이 끝나면 적어도 다섯은 모여 있다');
    mock.timers.tick(1700);
    assert.equal(story.round, 2);
    assert.deepEqual(calls.starts[1].chart, I.idolChart(2));
    finishRound('S');
    mock.timers.tick(900);
    assert.equal(story.phase, 'outro');
    assert.deepEqual(calls.modes, ['idol', 'play']);
    assert.equal(calls.cinematic.at(-1), false);
    assert.equal(calls.duck.at(-1), false, '마을 음악을 다시 튼다');
    mock.timers.tick(500);
    assert.equal(done, 1);
    mock.timers.tick(10000);
    assert.equal(done, 1, '한 번만');
    story.update(0.1);
    assert.equal(story.active, false);
    assert.equal(calls.input, true);
  } finally { mock.timers.reset(); }
});

test('공연 도중 · 끝난 직후 타이틀로 나가면(reset) 마무리를 부르지 않고 박자 화면 · 음악을 접는다', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const when of ['round', 'outro']) {
      const { ctx, calls, finishRound } = fake();
      const story = createIdolStory(ctx);
      let done = 0;
      story.play(() => done++);
      mock.timers.tick(1100); mock.timers.tick(700); // 막 → 무대(그 안에서 다시 거는 타이머는 따로 돌린다)
      if (when === 'outro') { finishRound('A'); mock.timers.tick(1700); finishRound('A'); mock.timers.tick(900); assert.equal(story.phase, 'outro'); }
      story.reset();
      assert.equal(story.active, false);
      assert.equal(ctx.rhythm.active, false);
      assert.equal(calls.duck.at(-1), false);
      mock.timers.tick(10000);
      assert.equal(done, 0, when);
    }
  } finally { mock.timers.reset(); }
});

test('노래하는 동안 초록 머리 위에 지금 노랫말, 준비 박 · 노래 밖에서는 없다', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { ctx } = fake();
    const story = createIdolStory(ctx);
    story.play(() => {});
    mock.timers.tick(1100); mock.timers.tick(700);
    const spb = 60 / I.IDOL_BPM;
    ctx.rhythm.time = 2 * spb;
    story.tick(0.016, 1);
    assert.deepEqual(story.labels(), [], '준비 박');
    ctx.rhythm.time = (4 + 0.1) * spb;
    story.tick(0.016, 1);
    const [L] = story.labels();
    assert.equal(L.text, I.IDOL_ROUNDS[1].lyrics[0]);
    assert.deepEqual([L.x, L.y, L.z], [1, 2, 3]);
    ctx.rhythm.active = false;
    assert.deepEqual(story.labels(), []);
  } finally { mock.timers.reset(); }
});
