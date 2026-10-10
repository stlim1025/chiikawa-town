/**
 * 친구들 목소리: 미리 만든 짧은 음성 파일(sounds/voices/<파일 이름>.mp3)을 대사에 맞게 골라 튼다(음성은 AI 음성 서비스 등으로 따로 만들어 넣는다).
 * 파일이 아직 없는 소리 · 다른 친구는 원래 톡톡 말소리(sound.js 가 대신 낸다).
 *  - 우사기: 야하! · 우라! · 하아? · 푸루루루~  — 대사에서 골라
 *  - 치이카와: 헤에… · 히힛 · 흐에에… · 힛! · 에…  — 말 대신 작은 소리
 *  - 모몽가: 흥! · 뭐야!
 *  - 하치와레: 응! · 우와~! · 에엣?! · 헤헤~ · 음~  — 대사 분위기에 맞는 짧은 맞장구
 * 파일을 넣으면 READY 에 그 이름을 더한다(목록에 있는 것만 불러와서, 없는 파일을 찾느라 헛걸음하지 않는다).
 */
/** 만들 소리 목록: 파일 이름(친구_소리) → 녹음할 말. */
export const CLIPS = {
  usagi_yaha: '야하!', usagi_ura: '우라!', usagi_haa: '하아?', usagi_pururu: '푸루루루~',
  chiikawa_hee: '헤에…', chiikawa_hihi: '히힛', chiikawa_hue: '흐에에…', chiikawa_hic: '힛!', chiikawa_e: '에…',
  momonga_hmph: '흥!', momonga_what: '뭐야!',
  hachiware_un: '응!', hachiware_wow: '우와~!', hachiware_eh: '에엣?!', hachiware_hehe: '헤헤~', hachiware_hmm: '음~'
};
/** 들어와 있는 음성 파일(sounds/voices/ 아래). */
export const READY = [];
const BASE = 'sounds/voices/';
const VOL = 0.9;

/** 이 대사에서 그 친구가 낼 소리(파일 이름) | null. 괄호 속 지문은 빼고 본다. */
export function pickClip(kind, text = '') {
  const t = String(text).replace(/\([^)]*\)/g, ' ');
  if (kind === 'usagi') return /야하/.test(t) ? 'usagi_yaha' : /하아|하\?/.test(t) ? 'usagi_haa' : /[후푸]루루/.test(t) ? 'usagi_pururu' : 'usagi_ura';
  if (kind === 'chiikawa') {
    return /히힣|히히|헤헤/.test(t) ? 'chiikawa_hihi' : /흐에|훌쩍|히잉|흑|으앙|엉엉/.test(t) ? 'chiikawa_hue' : /헤에|헤…|헤\./.test(t) ? 'chiikawa_hee'
      : /!/.test(t) && t.replace(/[^가-힣]/g, '').length <= 1 ? 'chiikawa_hic' : 'chiikawa_e';
  }
  if (kind === 'momonga') return /흥/.test(t) ? 'momonga_hmph' : 'momonga_what';
  if (kind === 'hachiware') {
    if (!/[가-힣]/.test(t)) return null;
    return /헤헤|히히/.test(t) ? 'hachiware_hehe' : /\?/.test(t) ? 'hachiware_eh' : /우와|와~|최고|!/.test(t) ? 'hachiware_wow' : /음|…/.test(t) ? 'hachiware_hmm' : 'hachiware_un';
  }
  return null;
}

let player = null;
/** 소리 장치 하나에 하나: 파일을 미리 받아 두고(풀어 둔 소리) 튼다. 앞 소리는 끊는다. */
function createPlayer(ctx, bus) {
  const bufs = new Map(); // 이름 → AudioBuffer | null(받는 중) | false(없음)
  let current = null;
  const load = (id) => {
    if (bufs.has(id)) return;
    bufs.set(id, null);
    fetch(BASE + id + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((a) => ctx.decodeAudioData(a)).then((b) => bufs.set(id, b)).catch(() => bufs.set(id, false));
  };
  READY.forEach(load);
  return {
    ctx,
    play(id) {
      const b = bufs.get(id);
      if (!b) { load(id); return false; }
      this.stop();
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b;
      g.gain.value = VOL;
      src.connect(g).connect(bus);
      src.start();
      current = src;
      return true;
    },
    stop() { try { current?.stop(); } catch { /* 이미 끝남 */ } current = null; }
  };
}
/** 대사 한 줄의 목소리를 튼다. 들어와 있는 파일이 없으면 false(원래 톡톡 말소리를 쓰게). */
export function playVoice(ctx, bus, kind, text) {
  const id = pickClip(kind, text);
  if (!id || !READY.includes(id) || !ctx) return false;
  if (!player || player.ctx !== ctx) player = createPlayer(ctx, bus);
  return player.play(id);
}
/** 틀던 목소리를 멈춘다(효과음을 끌 때). */
export function hush() { player?.stop(); }
