import assert from 'node:assert/strict';
import { test } from 'node:test';
const I = await import('../src/core/idolsong.js');
const R = await import('../src/core/rhythm.js');

test('파자마 파티즈의 노래: 마디마다 8분음표 8칸, 음은 쉼표(0) 아니면 노래하기 좋은 높이', () => {
  for (const round of [1, 2]) {
    const { bars, lyrics } = I.IDOL_ROUNDS[round];
    assert.equal(bars.length, 16, `${round}절은 16마디`);
    assert.equal(lyrics.length, bars.length / 2, '노랫말은 두 마디에 한 줄');
    for (const b of bars) {
      assert.equal(b.mel.length, 8);
      assert.ok(I.CHORDS[b.chord], b.chord);
      assert.ok(b.mel.every((n) => n === 0 || (n >= 60 && n <= 91)), b.mel.join(','));
      assert.ok(b.sec === 'verse' || b.sec === 'chorus');
    }
  }
});

test('악보: 처음 4박은 준비, 음은 멜로디가 시작하는 자리에만 · 겹치지 않고 차례로', () => {
  for (const round of [1, 2]) {
    const chart = I.idolChart(round), { bars } = I.IDOL_ROUNDS[round];
    assert.ok(chart.length >= 40 && chart.length <= 80, `${round}절 음 수 ${chart.length}`);
    assert.ok(chart.every((b) => b >= 4 && Number.isInteger(b * 2)), '준비 4박 뒤 · 반 박 단위');
    for (let i = 1; i < chart.length; i++) assert.ok(chart[i] - chart[i - 1] >= 1, '바로 붙은 8분음표는 하나만(연타 없이)');
    for (const b of chart) {
      const e = (b - 4) * 2, bar = bars[Math.floor(e / 8)];
      assert.ok(bar && bar.mel[e % 8] > 0, `${b}박은 멜로디가 나오는 자리`);
    }
    assert.equal(R.chartBeats(chart), 4 + bars.length * 4, '마지막 마디까지 곡이 이어진다');
  }
  assert.ok(I.idolChart(1).filter((b) => b < 4 + 32).every(Number.isInteger), '1절 앞(노래 부분)은 정박만');
  assert.ok(I.idolChart(2).some((b) => !Number.isInteger(b)), '2절(후렴)은 반 박도 섞인다');
});

test('곡 자리: 8분음표 번호 → 준비 · 마디 · 칸 · 노랫말', () => {
  assert.equal(I.songAt(1, 0).count, true, '처음 8칸(4박)은 준비');
  const a = I.songAt(1, 8);
  assert.equal(a.count, false); assert.equal(a.bar, 0); assert.equal(a.j, 0); assert.equal(a.line, I.IDOL_ROUNDS[1].lyrics[0]);
  const b = I.songAt(1, 8 + 8 * 3 + 5);
  assert.equal(b.bar, 3); assert.equal(b.j, 5); assert.equal(b.line, I.IDOL_ROUNDS[1].lyrics[1]);
  assert.equal(I.songAt(1, 8 + 16 * 8), null, '곡이 끝나면 없다');
});
