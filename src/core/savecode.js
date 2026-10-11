import { serialize, deserialize } from './save.js';

/**
 * 저장 옮기기(마을폰 설정 · 저장 내보내기 / 불러오기): 진행을 복사 · 붙여 넣기 좋은 짧은 글(저장 코드)로 바꾸고, 다시 진행으로 푼다.
 * 아이폰은 홈 화면 앱마다 저장 공간이 따로라 앱을 지우면 진행이 사라지고, PC · Safari · 웹앱끼리도 저장이 따로다 —
 * 코드를 메신저로 보내 다른 기기에서 붙여 넣으면 진행이 그대로 옮겨진다.
 * 코드: 'CTW3.' + 저장 글을 사전(savedict.js — 저장 글에 늘 나오는 조각)을 넣은 deflate 로 줄여 한글 음절에 13비트씩 적은 것.
 *  영문 base64 는 글자당 6비트라 한글이 글자 수를 절반 아래로 줄이고, 사전이 키 · 이름 같은 뻔한 부분을 거의 지운다.
 *  맨 앞 한 글자는 끝 글자에 채운 빈 비트 수(정확한 바이트 수를 알려고). 위치 · 시각의 긴 소수는 넷째 자리에서 반올림해 넣는다.
 * 예전 코드도 읽는다: 'CTW2.'(사전 없는 한글) · 'CTW1.'(gzip + URL 에 안전한 base64) · 'CTW0.'(압축 없는 base64) · 원래 저장 글(JSON).
 * 압축 도구(vendor/fflate.js)와 사전은 내보내기 · 불러오기를 할 때만 불러온다. 풀 때는 save.js 의 검사(deserialize)를 그대로 거친다.
 */
const PREFIX = 'CTW';
const HANGUL = 0xac00; // '가' — 0xAC00 + 0 ~ 8191 은 모두 한글 음절(가 ~ 힣 안)
const BITS = 13;
const MASK = (1 << BITS) - 1;
const DECIMALS = 1e4;

let tools = null;
/** 압축 도구 + 사전(처음 쓸 때 한 번 불러온다). */
function loadTools() {
  tools ||= Promise.all([import('../vendor/fflate.js'), import('./savedict.js')]).then(([fflate, { SAVE_DICT_1 }]) => ({ fflate, dict: new TextEncoder().encode(SAVE_DICT_1) }));
  tools.catch(() => { tools = null; }); // 받기에 실패했으면 다음에 다시
  return tools;
}

function fromBase64Url(text) {
  const b = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 바이트 → 한글 음절(글자당 13비트). 첫 글자 = 끝 글자 뒤에 채운 0 비트 수. */
function toHangul(bytes) {
  const pad = Math.ceil((bytes.length * 8) / BITS) * BITS - bytes.length * 8;
  const codes = [HANGUL + pad];
  let acc = 0, bits = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    if (bits >= BITS) {
      bits -= BITS;
      codes.push(HANGUL + ((acc >> bits) & MASK));
      acc &= (1 << bits) - 1;
    }
  }
  if (bits) codes.push(HANGUL + ((acc << (BITS - bits)) & MASK));
  let out = '';
  for (let i = 0; i < codes.length; i += 0x2000) out += String.fromCharCode(...codes.slice(i, i + 0x2000));
  return out;
}
/** 한글 음절 → 바이트. 길이 · 글자가 맞지 않으면 throw. */
function fromHangul(text) {
  const v = Array.from(text, (c) => c.charCodeAt(0) - HANGUL);
  const pad = v.shift();
  const total = v.length * BITS - pad;
  if (!(pad < BITS) || total <= 0 || total % 8 || v.some((x) => x > MASK)) throw new Error('bad code');
  const out = new Uint8Array(total / 8);
  let acc = 0, bits = 0, i = 0;
  for (const x of v) {
    acc = (acc << BITS) | x;
    bits += BITS;
    while (bits >= 8 && i < out.length) {
      bits -= 8;
      out[i++] = (acc >> bits) & 0xff;
    }
    acc &= (1 << bits) - 1;
  }
  return out;
}

/** 긴 소수는 넷째 자리까지만(위치 · 시각 — 넷째 자리 아래는 놀이에 차이가 없고 압축도 안 된다). */
const trimNumbers = (state) => JSON.parse(JSON.stringify(state, (_, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * DECIMALS) / DECIMALS : v)));

/** 진행 → 저장 코드('CTW3.' + 한글). */
export async function encodeSave(state) {
  const { fflate, dict } = await loadTools();
  const raw = new TextEncoder().encode(serialize(trimNumbers(state)));
  return `${PREFIX}3.${toHangul(fflate.deflateSync(raw, { level: 9, dictionary: dict }))}`;
}

/** 코드 글자 → 풀린 저장 글 바이트. 한글은 NFC 로 다시 모은다(자모로 풀어 보내는 기기가 있다). */
function unpack(kind, body, { fflate, dict }) {
  const hangul = () => fromHangul(body.normalize('NFC').replace(/[^가-힣]/g, ''));
  const base64 = () => fromBase64Url(body.replace(/[^A-Za-z0-9_-]/g, ''));
  if (kind === '3') return fflate.inflateSync(hangul(), { dictionary: dict });
  if (kind === '2') return fflate.inflateSync(hangul());
  if (kind === '1') return fflate.gunzipSync(base64());
  return base64();
}

/**
 * 저장 코드(또는 저장 글 JSON) → { ok, state } | { ok: false, reason: 'empty' | 'corrupt' | 'version' | 'unsupported' }.
 * 메신저가 긴 글을 줄바꿈 · 띄어 써도 읽는다(코드 글자가 아닌 것은 빼고 본다). 'unsupported' = 압축 도구를 받지 못함.
 */
export async function decodeSave(code) {
  const text = String(code ?? '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.startsWith('{')) return deserialize(text);
  const m = /^CTW([0-3])\.([\s\S]+)$/.exec(text);
  if (!m) return { ok: false, reason: 'corrupt' };
  let lib;
  try { lib = await loadTools(); } catch { return { ok: false, reason: 'unsupported' }; }
  try {
    return deserialize(new TextDecoder().decode(unpack(m[1], m[2], lib)));
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}
