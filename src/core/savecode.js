import { serialize, deserialize } from './save.js';

/**
 * 저장 옮기기(마을폰 설정 · 저장 내보내기 / 불러오기): 진행을 복사 · 붙여 넣기 좋은 짧은 글(저장 코드)로 바꾸고, 다시 진행으로 푼다.
 * 아이폰은 홈 화면 앱마다 저장 공간이 따로라 앱을 지우면 진행이 사라지고, PC · Safari · 웹앱끼리도 저장이 따로다 —
 * 코드를 메신저로 보내 다른 기기에서 붙여 넣으면 진행이 그대로 옮겨진다.
 * 코드: 'CTW1.' + gzip 으로 줄인 저장 글을 URL 에 안전한 base64(A-Z a-z 0-9 - _)로. 압축을 못 하는 브라우저는 'CTW0.'(그대로).
 * 원래 저장 글(JSON)을 붙여 넣어도 읽는다. 풀 때는 save.js 의 검사(deserialize)를 그대로 거친다.
 */
const PREFIX = 'CTW';

/** 이 브라우저가 gzip 으로 줄이고 풀 수 있는지. */
export const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(text) {
  const b = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function through(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** 진행 → 저장 코드. compress 를 끄면(또는 못 하면) 'CTW0.'. */
export async function encodeSave(state, { compress = canCompress() } = {}) {
  const raw = new TextEncoder().encode(serialize(state));
  if (!compress) return `${PREFIX}0.${toBase64Url(raw)}`;
  return `${PREFIX}1.${toBase64Url(await through(raw, new CompressionStream('gzip')))}`;
}

/**
 * 저장 코드(또는 저장 글 JSON) → { ok, state } | { ok: false, reason: 'empty' | 'corrupt' | 'version' | 'unsupported' }.
 * 메신저가 긴 글을 줄바꿈 · 띄어 써도 읽는다(코드 글자가 아닌 것은 빼고 본다).
 */
export async function decodeSave(code) {
  const text = String(code ?? '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.startsWith('{')) return deserialize(text);
  const m = /^CTW([01])\.([\s\S]+)$/.exec(text);
  if (!m) return { ok: false, reason: 'corrupt' };
  try {
    let bytes = fromBase64Url(m[2].replace(/[^A-Za-z0-9_-]/g, ''));
    if (m[1] === '1') {
      if (!canCompress()) return { ok: false, reason: 'unsupported' };
      bytes = await through(bytes, new DecompressionStream('gzip'));
    }
    return deserialize(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}
