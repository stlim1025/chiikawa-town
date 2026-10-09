import { WORLD_HALF } from './layout.js';

/**
 * 탐험 기록: 월드를 CELL 칸 격자(N × N)로 나눠 가 본 칸을 비트로 남긴다. 지도를 갖기 전부터 기록한다.
 * 저장은 base64 문자열(200바이트), '' 은 아무 데도 안 가 봄.
 */
export const CELL = 4;
export const N = (WORLD_HALF * 2) / CELL;
const BYTES = (N * N) / 8;

function toBytes(str) {
  const b = new Uint8Array(BYTES);
  if (!str) return b;
  const raw = atob(str);
  for (let i = 0; i < raw.length && i < BYTES; i++) b[i] = raw.charCodeAt(i);
  return b;
}
function toStr(b) {
  let raw = '';
  for (const v of b) raw += String.fromCharCode(v);
  return btoa(raw);
}
const clampCell = (v) => Math.min(N - 1, Math.max(0, v));

/** (x, z) 가 들어 있는 칸 [i, j](월드 밖은 끝 칸). */
export function cellOf(x, z) {
  return [clampCell(Math.floor((x + WORLD_HALF) / CELL)), clampCell(Math.floor((z + WORLD_HALF) / CELL))];
}
/** 칸 [i, j] 를 가 봤는지. */
export function isExplored(str, i, j) {
  if (!str) return false;
  const k = j * N + i;
  return (toBytes(str)[k >> 3] & (1 << (k & 7))) !== 0;
}
/** (x, z) 에서 radius 안의 칸을 가 본 곳으로 표시한다. 새로 밝아진 칸이 없으면 같은 문자열을 돌려준다. */
export function markExplored(str, x, z, radius) {
  const b = toBytes(str);
  let changed = false;
  const [ci, cj] = cellOf(x, z), reach = Math.ceil(radius / CELL);
  for (let j = cj - reach; j <= cj + reach; j++) {
    for (let i = ci - reach; i <= ci + reach; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const cx = -WORLD_HALF + (i + 0.5) * CELL, cz = -WORLD_HALF + (j + 0.5) * CELL;
      if (Math.hypot(cx - x, cz - z) > radius + CELL / 2) continue;
      const k = j * N + i, bit = 1 << (k & 7);
      if (!(b[k >> 3] & bit)) { b[k >> 3] |= bit; changed = true; }
    }
  }
  return changed ? toStr(b) : str;
}
/** 가 본 칸 수. */
export function exploredCount(str) {
  let n = 0;
  for (const v of toBytes(str)) for (let x = v; x; x &= x - 1) n++;
  return n;
}
/** 저장된 탐험 기록 모양이 맞는지(save.js 검사). */
export function isValidExplored(str) {
  if (typeof str !== 'string') return false;
  if (str === '') return true;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(str)) return false;
  try { return atob(str).length === BYTES; } catch { return false; }
}
