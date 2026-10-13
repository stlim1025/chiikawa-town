/**
 * 사이드스토리 '하치와레의 카메라'에서 찍은 사진(작은 JPEG data URL)을 이 브라우저에 남겨 둔다.
 * 게임 저장(저장 코드)에는 넣지 않는다: 크고, 다른 기기로 옮기지 않아도 되는 추억이라.
 * 저장이 막혀 있거나(사생활 보호 창 등) 비어 있으면 빈 목록이다(뽑은 사진 · 액자는 그림으로 대신 그린다).
 */
const KEY = 'chiikawa-town-photos';
/** 남겨 두는 사진 수(하치와레가 찍은 첫 장 + 내가 찍은 세 장). */
export const MAX_PHOTOS = 4;

const okUrl = (u) => typeof u === 'string' && u.startsWith('data:image/') && u.length < 400000;

/** 남겨 둔 사진 data URL 목록(찍은 순서). */
export function loadPhotos() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter(okUrl).slice(0, MAX_PHOTOS) : [];
  } catch {
    return [];
  }
}

/** 사진 목록을 남긴다(앞에서부터 MAX_PHOTOS 장). 저장이 막혀 있으면 이번만 쓰고 만다. */
export function savePhotos(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify((list || []).filter(okUrl).slice(0, MAX_PHOTOS)));
    return true;
  } catch {
    return false;
  }
}
