/**
 * 친구들 목소리(대사 한 줄마다): 기기에 들어 있는 한국어 음성(아이폰 '유나' 같은 말하기 음성, Web Speech)을 높고 빠르게 해서 말한다.
 * 음원 파일 없이, 합성음보다 사람 목소리에 가깝게.
 *  - 우사기: "야하!" · "우라!" · "하아?" · "푸루루루~" 만 높게 외친다(대사에서 골라)
 *  - 치이카와: 말 대신 "헤에…" · "히힛" · "흐에에…" · "힛!" · "에…" 작은 소리만
 *  - 모몽가: "흥!" — 그 밖엔 대사를 높고 새침하게
 *  - 하치와레: 대사를 그대로(괄호 속 지문 · 말줄임 · 물결은 빼고) 밝고 높게
 * pickVoice(kind, text) → { say, pitch, rate, volume } | null(그 친구는 원래 톡톡 말소리).
 * speak(kind, text, gain) → 말했으면 true. 한국어 음성이 없거나 막혀 있으면 false(원래 톡톡 말소리를 쓰게).
 */
const STYLE = {
  usagi: { pitch: 2, rate: 1.35, volume: 0.9 },
  chiikawa: { pitch: 2, rate: 0.9, volume: 0.7 },
  momonga: { pitch: 1.85, rate: 1.2, volume: 0.85 },
  hachiware: { pitch: 1.5, rate: 1.15, volume: 0.85 }
};
const MAX_SAY = 60; // 너무 긴 대사는 앞부분만(다음 줄로 넘기면 끊긴다)
/** 말할 글: 괄호 속 지문 · 말줄임 · 물결을 뺀다. */
const clean = (t) => String(t).replace(/\([^)]*\)/g, ' ').replace(/…+|\.{2,}/g, ' ').replace(/~+/g, '').replace(/\s+/g, ' ').trim();

/** 그 친구가 이 대사에서 할 말과 목소리(높이 · 빠르기 · 크기). */
export function pickVoice(kind, text = '') {
  const style = STYLE[kind];
  if (!style) return null;
  const t = String(text).replace(/\([^)]*\)/g, ' ');
  let say = null;
  if (kind === 'usagi') say = /야하/.test(t) ? '야하!' : /하아|하\?/.test(t) ? '하아?' : /[후푸]루루/.test(t) ? '푸루루루~' : '우라!';
  else if (kind === 'chiikawa') {
    say = /히힣|히히|헤헤/.test(t) ? '히힛' : /흐에|훌쩍|히잉|흑|으앙|엉엉/.test(t) ? '흐에에…' : /헤에|헤…|헤\./.test(t) ? '헤에…'
      : /!/.test(t) && t.replace(/[^가-힣]/g, '').length <= 1 ? '힛!' : '에…';
  } else if (kind === 'momonga') say = /흥/.test(t) ? '흥!' : clean(t);
  else say = clean(t);
  if (!say || !/[가-힣]/.test(say)) return null;
  return { say: say.slice(0, MAX_SAY), ...style };
}

let cached = null, watching = false;
/** 한국어 음성 하나(여성 목소리를 먼저: 높게 올렸을 때 덜 어색하다). 음성 목록은 늦게 차기도 해서 바뀌면 다시 고른다. */
function koreanVoice(synth) {
  if (!watching && synth.addEventListener) { watching = true; synth.addEventListener('voiceschanged', () => { cached = null; }); }
  if (cached) return cached;
  const ko = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
  cached = ko.find((v) => /yuna|sunhi|heami|google|여성|female/i.test(v.name)) || ko[0] || null;
  return cached;
}
/** 대사 한 줄을 그 친구 목소리로(앞 줄은 끊는다). */
export function speak(kind, text, gain = 1) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
  const p = pickVoice(kind, text);
  if (!p) return false;
  const v = koreanVoice(synth);
  if (!v) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(p.say);
  u.voice = v;
  u.lang = v.lang;
  u.pitch = p.pitch;
  u.rate = p.rate;
  u.volume = Math.min(1, p.volume * gain);
  synth.speak(u);
  return true;
}
/** 말하던 것을 멈춘다(효과음을 끌 때). */
export function hush() { try { window.speechSynthesis?.cancel(); } catch { /* 없는 브라우저 */ } }
