/**
 * 친구가 지금 하는 일 아이콘(머리 위 작은 동그라미 · 친구 앱). 20 × 20 SVG.
 * leaf 일감 · star 스티커/구경 · bowl 라멘 · sword 토벌/수련 · pen 시험 · dots 수다 · note 노래 · book 공부
 * · zap 뛰어다니기 · mug 맥주/안주 · heart 인사/축하 · moon 잠 · step 산책 · broom 청소 · needle 바느질 · eye 순찰/살피기 · pot 요리 · fish 낚시
 */
const S = (body) => `<svg viewBox="0 0 20 20" aria-hidden="true">${body}</svg>`;
export const DOING_ICONS = {
  leaf: S('<path d="M4 16C4 8 9 4 16.5 3.5 16 11 12 16 4 16z" fill="#8fd18a" stroke="#4f9a54" stroke-width="1.4" stroke-linejoin="round"/><path d="M4.5 15.5 12 8" stroke="#4f9a54" stroke-width="1.4" stroke-linecap="round"/>'),
  star: S('<path d="M10 2.5l2.2 4.7 5.1.6-3.8 3.5 1 5.1L10 13.9l-4.5 2.5 1-5.1-3.8-3.5 5.1-.6z" fill="#ffd45e" stroke="#d9a520" stroke-width="1.3" stroke-linejoin="round"/>'),
  bowl: S('<path d="M3 9.5h14a7 7 0 0 1-14 0z" fill="#f08a6b" stroke="#b9553c" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 8c0-2 1.2-2 1.2-4M10 8c0-2 1.2-2 1.2-4M14 8c0-2 1.2-2 1.2-4" stroke="#c9b99a" stroke-width="1.2" stroke-linecap="round" fill="none"/>'),
  sword: S('<path d="M14.5 2.5l3 3-8.5 8.5-3-3z" fill="#e9eef3" stroke="#7a8794" stroke-width="1.3" stroke-linejoin="round"/><path d="M4.5 11.5l4 4M3 17l3-3" stroke="#a8743c" stroke-width="2" stroke-linecap="round"/>'),
  pen: S('<rect x="4" y="2.5" width="10.5" height="15" rx="2" fill="#fff" stroke="#9a8a6a" stroke-width="1.3"/><path d="M6.5 6.5h5.5M6.5 9.5h5.5M6.5 12.5h3" stroke="#c9b99a" stroke-width="1.3" stroke-linecap="round"/>'),
  dots: S('<path d="M3 5.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3.5v-3.5a3 3 0 0 1-2-3z" fill="#fff" stroke="#7fb6e2" stroke-width="1.4" stroke-linejoin="round"/><circle cx="7" cy="8" r="1.2" fill="#7fb6e2"/><circle cx="10" cy="8" r="1.2" fill="#7fb6e2"/><circle cx="13" cy="8" r="1.2" fill="#7fb6e2"/>'),
  note: S('<path d="M8 14.5V4.5l8-2v10" fill="none" stroke="#c05a8f" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="6" cy="14.8" rx="2.6" ry="2" fill="#f08ab8" stroke="#c05a8f" stroke-width="1.2"/><ellipse cx="14" cy="12.8" rx="2.6" ry="2" fill="#f08ab8" stroke="#c05a8f" stroke-width="1.2"/>'),
  book: S('<path d="M2.5 5q4-1.6 7.5.6Q13.5 3.4 17.5 5v11q-4-1.6-7.5.6Q6.5 14.4 2.5 16z" fill="#fff" stroke="#7fb6e2" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 5.6v11" stroke="#7fb6e2" stroke-width="1.3"/>'),
  zap: S('<path d="M11.5 1.8 4 11.2h5l-1.4 7 7.6-9.6h-5z" fill="#ff8a6a" stroke="#c9553a" stroke-width="1.2" stroke-linejoin="round"/>'),
  mug: S('<rect x="3.5" y="5.5" width="9.5" height="11" rx="1.8" fill="#ffc94a" stroke="#c98f1c" stroke-width="1.3"/><path d="M13 8h1.8a2 2 0 0 1 0 5H13" fill="none" stroke="#c98f1c" stroke-width="1.3"/><path d="M3.5 6.5q2-2.5 4.7-1 2.6-1.5 4.8 1" fill="#fff" stroke="#d9cdb4" stroke-width="1.1"/>'),
  heart: S('<path d="M10 17.5S2.5 12.8 2.5 7.6A4 4 0 0 1 10 5.4a4 4 0 0 1 7.5 2.2c0 5.2-7.5 9.9-7.5 9.9z" fill="#ff8fab" stroke="#d65a7c" stroke-width="1.3" stroke-linejoin="round"/>'),
  moon: S('<path d="M13.5 2.5a7.5 7.5 0 1 0 4 12.5A6.5 6.5 0 0 1 13.5 2.5z" fill="#ffe08a" stroke="#c9a33a" stroke-width="1.3" stroke-linejoin="round"/>'),
  broom: S('<path d="M13 2.5 9.5 10" stroke="#a8743c" stroke-width="1.8" stroke-linecap="round"/><path d="M6.5 9.5h6l1.5 8h-9z" fill="#ffd45e" stroke="#c98f1c" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 12.5v4M10.5 12.5v4" stroke="#c98f1c" stroke-width="1"/>'),
  needle: S('<path d="M4 16 15.5 4.5" stroke="#9aa5b1" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="15" cy="5" rx="1.4" ry="2" transform="rotate(45 15 5)" fill="none" stroke="#9aa5b1" stroke-width="1.1"/><path d="M15 5q3 4-1 7t-8 3" fill="none" stroke="#f06a8f" stroke-width="1.4" stroke-linecap="round"/>'),
  eye: S('<path d="M2 10q8-8 16 0-8 8-16 0z" fill="#fff" stroke="#7a8794" stroke-width="1.4" stroke-linejoin="round"/><circle cx="10" cy="10" r="3" fill="#5a4431"/><circle cx="11" cy="9" r="1" fill="#fff"/>'),
  pot: S('<path d="M3 8h14v5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" fill="#9aa5b1" stroke="#5f6b77" stroke-width="1.3" stroke-linejoin="round"/><path d="M1.5 9h1.5M17 9h1.5" stroke="#5f6b77" stroke-width="1.6" stroke-linecap="round"/><path d="M7 6c0-1.5 1-1.5 1-3M11 6c0-1.5 1-1.5 1-3" stroke="#c9b99a" stroke-width="1.2" stroke-linecap="round" fill="none"/>'),
  step: S('<ellipse cx="7" cy="12" rx="2.6" ry="3.6" fill="#d9b48a" stroke="#9a7650" stroke-width="1.2"/><ellipse cx="13.5" cy="7" rx="2.4" ry="3.3" fill="#d9b48a" stroke="#9a7650" stroke-width="1.2"/>'),
  fish: S('<path d="M15 10l3.5-3v6z" fill="#7fb3dc" stroke="#4d7fa8" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="9" cy="10" rx="6.5" ry="4" fill="#9ccaf0" stroke="#4d7fa8" stroke-width="1.3"/><circle cx="5.6" cy="9.2" r="1" fill="#2f4a63"/>')
};
