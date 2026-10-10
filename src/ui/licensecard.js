/**
 * 자격증 카드: 진짜 자격증처럼 — 위 띠(검정소 · 자격 이름 · 문장), 왼쪽 증명사진(내 캐릭터), 오른쪽 이름 · 발급일 · 번호,
 * 구석의 빨간 검정소 도장과 비스듬히 빛나는 홀로그램 띠. 합격했을 때 큰 카드로 받고, 마을폰 자격증 앱에서도 이 모습으로 본다.
 */

/** 자격마다 띠에 들어가는 문장(검정소 목록 · 카드가 같이 쓴다). */
export const EMBLEM = {
  weed: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 33V18" stroke="#5e9f80" stroke-width="3" stroke-linecap="round"/><path d="M20 20q-2-9-11-11q0 9 11 11zM20 17q2-9 11-10q-1 9-11 10z" fill="#8fd16a" stroke="#5e9f80" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 33h20" stroke="#c9a77c" stroke-width="3" stroke-linecap="round"/></svg>',
  liquor: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 9h18l-2 22a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="#fff6dc" stroke="#c98a5a" stroke-width="2"/><path d="M12.5 17h15l-1.3 13.5a2 2 0 0 1-2 1.8h-8.4a2 2 0 0 1-2-1.8z" fill="#f2b45a"/><circle cx="17" cy="23" r="1.4" fill="#fff"/><circle cx="22" cy="27" r="1.1" fill="#fff"/></svg>',
  arbeiter: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 19h28a14 13 0 0 1-28 0z" fill="#d9675b"/><path d="M9 19q5-4 11 0t11 0" fill="none" stroke="#fcd95b" stroke-width="2.6" stroke-linecap="round"/><path d="M24 6l-6 13M29 7l-7 12" stroke="#c9a77c" stroke-width="2.4" stroke-linecap="round"/></svg>',
  hunter: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 33 22 19" stroke="#f3a6b8" stroke-width="3.4" stroke-linecap="round"/><path d="M19 15a7 7 0 1 0 6 6" fill="none" stroke="#f3a6b8" stroke-width="3.2" stroke-linecap="round"/><path d="M27 13l4-1M28 18l4 1M22 11l1-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
};

// 사진이 없을 때(WebGL 이 안 될 때 · 아직 없는 자격) 사진 칸에 그리는 빈 얼굴
const NO_PHOTO = '<svg viewBox="0 0 40 50" aria-hidden="true"><circle cx="20" cy="21" r="12" fill="#fff" stroke="#c9b48e" stroke-width="2"/><path d="M6 50q2-13 14-13t14 13" fill="#fff" stroke="#c9b48e" stroke-width="2"/></svg>';
const SEAL = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" stroke-width="3.4"/><circle cx="30" cy="30" r="20.5" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="30" y="27" text-anchor="middle" font-size="12.5" fill="currentColor">검정소</text><text x="30" y="41" text-anchor="middle" font-size="12.5" fill="currentColor">합격</text></svg>';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function art(cls, markup) {
  const e = el('span', cls);
  e.innerHTML = markup; // 이 파일 안의 고정 그림만 넣는다
  return e;
}

/**
 * 카드 한 장. data: { id: 'weed' | 'liquor' | 'arbeiter' | 'hunter', title, name, photo: 데이터 URL | null,
 *   fields: [[항목, 값]], none: 아직 없는 자격(흐린 빈 카드), hint: 빈 카드에 적는 한 줄 }
 */
export function licenseCardEl(data) {
  const card = el('div', `lic-card tone-${data.id}${data.none ? ' none' : ''}`);
  card.setAttribute('role', 'img');
  card.setAttribute('aria-label', data.none ? `${data.title} — 아직 없어요` : `${data.title} 자격증, ${data.name}`);

  const band = el('div', 'lc-band');
  const head = el('div', 'lc-head');
  head.append(el('small', '', '치이카와 마을 검정소'), el('b', '', data.title));
  band.append(art('lc-emb', EMBLEM[data.id] || ''), head, el('i', 'lc-chip'));

  const photo = el('div', 'lc-photo');
  if (data.photo && !data.none) {
    const img = el('img');
    img.src = data.photo;
    img.alt = '';
    photo.append(img);
  } else photo.append(art('lc-nophoto', NO_PHOTO));
  const fields = el('dl', 'lc-fields');
  if (data.none) fields.append(el('dd', 'lc-empty', data.hint || '아직 없어요'));
  else for (const [k, v] of data.fields || []) fields.append(el('dt', '', k), el('dd', '', v));
  const body = el('div', 'lc-body');
  body.append(photo, fields);

  card.append(band, body);
  if (!data.none) card.append(art('lc-seal', SEAL), el('i', 'lc-holo'));
  return card;
}
