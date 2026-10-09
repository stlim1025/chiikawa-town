// 토벌(4단계) 그림: 몬스터 얼굴 카드 · 전리품 · 무기. 64 × 64 칸. 3D 모양(world/monsters.js)과 같은 색 · 생김새.
import { registerItemArt } from './itemart.js';

const L = '#5a4431';
const S = `stroke="${L}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = (rx = 18) => `<ellipse cx="32" cy="57" rx="${rx}" ry="3.6" fill="#e6d8b8"/>`;
/** 눈 둘(반짝임) + 눈썹. tilt > 0 이면 화난 눈썹, < 0 이면 졸린 눈썹, null 이면 없다. */
const eyes = (cx, cy, dx, r = 2.6, tilt = 0.5) => [-1, 1].map((sd) => {
  const x = cx + sd * dx;
  const brow = tilt === null ? '' : `<path d="M${(x - 3.6).toFixed(1)} ${(cy - 5 - sd * tilt * -2.4).toFixed(1)}L${(x + 3.6).toFixed(1)} ${(cy - 5 + sd * tilt * -2.4).toFixed(1)}" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
  return `<ellipse cx="${x}" cy="${cy}" rx="${r}" ry="${(r * 1.25).toFixed(1)}" fill="#2b2224"/><circle cx="${(x - r * 0.35).toFixed(1)}" cy="${(cy - r * 0.5).toFixed(1)}" r="${(r * 0.38).toFixed(1)}" fill="#fff"/>${brow}`;
}).join('');

const MON = {
  fluff: () => {
    let spikes = '';
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI + (i / 10) * Math.PI, x = 32 + Math.cos(a) * 19, y = 36 + Math.sin(a) * 18;
      const tx = 32 + Math.cos(a) * 27, ty = 36 + Math.sin(a) * 26;
      spikes += `<path d="M${(x - Math.sin(a) * 4).toFixed(1)} ${(y + Math.cos(a) * 4).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${(x + Math.sin(a) * 4).toFixed(1)} ${(y - Math.cos(a) * 4).toFixed(1)}Z" fill="${i % 3 ? '#5fae4f' : '#8fd16a'}" ${S}/>`;
    }
    return `${shadow()}${spikes}<circle cx="32" cy="37" r="19" fill="#7cc25e" ${S}/>
      <circle cx="36" cy="10" r="4.5" fill="#fff7fa" ${S}/><circle cx="36" cy="10" r="1.8" fill="#ffd94a"/>
      ${eyes(32, 38, 7.5, 2.6, 0.6)}<path d="M28 47h8" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
  },
  beetle: () => `${shadow(20)}
    ${[16, 26, 38, 48].map((x) => `<path d="M${x} 46l${x < 32 ? -4 : 4} 7" ${S} stroke-width="3"/>`).join('')}
    <ellipse cx="32" cy="36" rx="19" ry="14" fill="#e0ad6a" ${S}/>
    <path d="M12 30q20-22 40 0q-20 6-40 0z" fill="#94643a" ${S}/>
    ${[18, 25, 32, 39, 46].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 24 : 27}" r="1.6" fill="#74482a"/>`).join('')}
    <path d="M32 18l2-6" ${S}/>
    <ellipse cx="32" cy="45" rx="11" ry="8" fill="#634230" ${S}/>
    <path d="M29 40l3-14 3 14z" fill="#f6e2b4" ${S}/>
    ${eyes(32, 46, 5, 2.1, 0.6)}`,
  slime: () => `${shadow(20)}<ellipse cx="32" cy="53" rx="21" ry="5" fill="#7cc4ea" ${S}/>
    <path d="M32 9q4 10 14 18q8 8 7 16q-1 12-21 12t-21-12q-1-8 7-16q10-8 14-18z" fill="#8fd3f4" ${S}/>
    <ellipse cx="21" cy="30" rx="4" ry="2.2" fill="#fff" transform="rotate(-35 21 30)"/><circle cx="17" cy="36" r="1.5" fill="#fff"/>
    ${eyes(32, 40, 7, 2.6, null)}<ellipse cx="22" cy="45" rx="3" ry="1.6" fill="#ff9fb4"/><ellipse cx="42" cy="45" rx="3" ry="1.6" fill="#ff9fb4"/><ellipse cx="32" cy="47" rx="2" ry="1.6" fill="#2b2224"/>`,
  turtle: () => `${shadow(22)}
    <ellipse cx="16" cy="51" rx="5" ry="3.6" fill="#a7b98a" ${S}/><ellipse cx="38" cy="52" rx="5" ry="3.6" fill="#a7b98a" ${S}/>
    <path d="M6 44q2-26 26-26t24 26z" fill="#a39a8f" ${S}/><path d="M4 44h48q2 5-2 6H8q-6-1-4-6z" fill="#7d756c" ${S}/>
    <ellipse cx="24" cy="24" rx="7" ry="3" fill="#7fae5a"/><ellipse cx="36" cy="22" rx="6" ry="2.6" fill="#93c46a"/><ellipse cx="17" cy="32" rx="5" ry="2.2" fill="#93c46a"/>
    <path d="M30 20l-2-7M33 20l3-6" stroke="#6f9e4f" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="29" r="1.8" fill="#ffc6d6"/>
    <circle cx="52" cy="38" r="9" fill="#a7b98a" ${S}/>
    <path d="M47 37h3.6M54 37h3.6" stroke="#2b2224" stroke-width="2.4" stroke-linecap="round"/><path d="M50 43q2 1.4 4 0" fill="none" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>`,
  moth: () => `${shadow(14)}
    <path d="M30 30Q14 8 4 20q-4 12 14 16q-10 10 0 16q10 2 12-12z" fill="#6e5a9a" ${S}/>
    <path d="M34 30Q50 8 60 20q4 12-14 16q10 10 0 16q-10 2-12-12z" fill="#6e5a9a" ${S}/>
    <circle cx="14" cy="22" r="4.6" fill="#fff1b0"/><circle cx="50" cy="22" r="4.6" fill="#fff1b0"/><circle cx="16" cy="44" r="2.6" fill="#fff1b0"/><circle cx="48" cy="44" r="2.6" fill="#fff1b0"/>
    <path d="M29 16q-4-8-8-9M35 16q4-8 8-9" fill="none" ${S}/><circle cx="21" cy="7" r="2" fill="#9a88c4" ${S}/><circle cx="43" cy="7" r="2" fill="#9a88c4" ${S}/>
    <ellipse cx="32" cy="36" rx="7" ry="15" fill="#4a3a6a" ${S}/><circle cx="32" cy="22" r="7" fill="#3e3060" ${S}/>
    <ellipse cx="29" cy="22" rx="2.2" ry="2.6" fill="#ffe36e"/><ellipse cx="35" cy="22" rx="2.2" ry="2.6" fill="#ffe36e"/><circle cx="29" cy="22" r="1" fill="#2b2224"/><circle cx="35" cy="22" r="1" fill="#2b2224"/>`,
  kingcap: () => `${shadow(22)}
    <path d="M18 56q-4-14 2-26h24q6 12 2 26z" fill="#f3e6cf" ${S}/>
    <ellipse cx="13" cy="42" rx="4" ry="6" fill="#f3e6cf" ${S}/><ellipse cx="51" cy="42" rx="4" ry="6" fill="#f3e6cf" ${S}/>
    <path d="M4 30Q4 6 32 6t28 24q-28 8-56 0z" fill="#c0473c" ${S}/>
    <ellipse cx="32" cy="12" rx="5" ry="2.4" fill="#fff3dc"/><ellipse cx="16" cy="20" rx="4" ry="2" fill="#fff3dc"/><ellipse cx="47" cy="18" rx="4.4" ry="2.2" fill="#fff3dc"/><ellipse cx="28" cy="24" rx="3" ry="1.5" fill="#fff3dc"/>
    ${eyes(32, 40, 6.5, 2.6, 0.9)}<path d="M26 49q6-4 12 0q-6 4-12 0z" fill="#6b2b2b"/><path d="M30 48v2M34 48v2" stroke="#fff" stroke-width="1.6"/>`,
  dummy: () => `${shadow(14)}<path d="M32 30v26" stroke="#9a6a3c" stroke-width="5" stroke-linecap="round"/>
    <path d="M10 32h44" stroke="#9a6a3c" stroke-width="4.5" stroke-linecap="round"/><path d="M8 32l-5-3v6zM56 32l5-3v6z" fill="#e8c36a" ${S}/>
    <ellipse cx="32" cy="36" rx="12" ry="13" fill="#e8c97a" ${S}/><circle cx="32" cy="37" r="6" fill="#e2574c"/><circle cx="32" cy="37" r="3.6" fill="#fff"/><circle cx="32" cy="37" r="1.6" fill="#e2574c"/>
    <circle cx="32" cy="16" r="9" fill="#f3dfa8" ${S}/><path d="M24 9l8-7 8 7z" fill="#c96a4a" ${S}/>
    <path d="M27 14l3 3M30 14l-3 3M34 14l3 3M37 14l-3 3M29 21h6" stroke="#2b2224" stroke-width="1.8" stroke-linecap="round"/>`
};
/** 몬스터 그림(도감 · 시험 · 일감). */
export const monsterSvg = (id) => `<svg viewBox="0 0 64 64" aria-hidden="true">${MON[id] ? MON[id]() : ''}</svg>`;

/** 전리품 그림. */
const DROP = {
  fluffdown: `${shadow(16)}<path d="M18 46q-10 0-9-9t10-8q2-10 13-10t13 10q9-1 10 8t-9 9z" fill="#f4fbe9" ${S}/><path d="M24 34q3-4 7-3M36 31q4 0 6 4" fill="none" stroke="#cfe6b8" stroke-width="2.2" stroke-linecap="round"/><path d="M32 19q-2-8 5-11q2 8-5 11z" fill="#8fd16a" ${S}/>`,
  horn: `${shadow(14)}<path d="M20 52q-2-24 10-38q8-8 14-6q-10 8-10 22t2 22z" fill="#f6e2b4" ${S}/><path d="M24 42q4-1 8 0M23 32q5-1 9 0M26 22q4-1 7 1" fill="none" stroke="#d9bf86" stroke-width="2" stroke-linecap="round"/><path d="M34 14q4-3 7-3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  jelly: `${shadow(16)}<path d="M14 48q-2-16 4-24q6-8 14-8t14 8q6 8 4 24q-18 6-36 0z" fill="#8fd3f4" ${S}/><path d="M18 30q4-8 12-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="38" r="3" fill="#c6ecff"/><circle cx="26" cy="42" r="2" fill="#c6ecff"/>`,
  shell: `${shadow(18)}<path d="M8 46l6-24 18-10 20 8 6 26z" fill="#a39a8f" ${S}/><path d="M14 22l12 10 6-20M26 32l-12 14M26 32l18 4 8-16M44 36l14 10" fill="none" stroke="#7d756c" stroke-width="2" stroke-linejoin="round"/><ellipse cx="24" cy="20" rx="6" ry="2.6" fill="#7fae5a"/><ellipse cx="42" cy="26" rx="5" ry="2.2" fill="#93c46a"/>`,
  moondust: `${shadow(14)}<path d="M22 22h20l-2-8H24z" fill="#cdbdf0" ${S}/><path d="M18 30q0-8 6-8h16q6 0 6 8v16q0 8-8 8H26q-8 0-8-8z" fill="#e8f4ff" ${S}/><path d="M21 38q11 6 22 0v8q0 6-6 6H27q-6 0-6-6z" fill="#ffe57a"/>
    <path d="M30 10l1.4 3 3 1.4-3 1.4L30 19l-1.4-3-3-1.4 3-1.4zM46 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#ffd94a"/><circle cx="28" cy="44" r="1.6" fill="#fff"/><circle cx="36" cy="42" r="1.2" fill="#fff"/>`,
  kingcap: `${shadow(20)}<path d="M6 44Q6 14 32 12t26 32q-26 8-52 0z" fill="#c0473c" ${S}/><path d="M8 44q24 6 48 0v4q-24 6-48 0z" fill="#efd9b5" ${S}/><ellipse cx="32" cy="20" rx="6" ry="3" fill="#fff3dc"/><ellipse cx="18" cy="30" rx="4.6" ry="2.4" fill="#fff3dc"/><ellipse cx="45" cy="28" rx="5" ry="2.6" fill="#fff3dc"/><path d="M14 22q6-8 14-9" fill="none" stroke="#e8786c" stroke-width="2.4" stroke-linecap="round"/>`
};
export const dropSvg = (id) => `<svg viewBox="0 0 64 64" aria-hidden="true">${DROP[id] || ''}</svg>`;
registerItemArt(Object.fromEntries(Object.keys(DROP).map((id) => [id, dropSvg(id)])));

/** 무기 그림(도구점 · 가방). 비스듬히 놓인 모습. */
const WEAPON = {
  stick: `<path d="M14 52L50 12" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M14 52L50 12" stroke="#b07a45" stroke-width="4.4" stroke-linecap="round"/><circle cx="34" cy="30" r="2" fill="#8a5a30"/><path d="M44 19q8-4 10 2q-6 4-10-2z" fill="#7cc25e" ${S}/>`,
  sword: `<path d="M24 40L52 10" stroke="${L}" stroke-width="9" stroke-linecap="round"/><path d="M24 40L52 10" stroke="#e3c08d" stroke-width="5.4" stroke-linecap="round"/><path d="M17 37l10 10" stroke="${L}" stroke-width="7" stroke-linecap="round"/><path d="M17 37l10 10" stroke="#3e2a1d" stroke-width="3.6" stroke-linecap="round"/><path d="M12 52l9-9" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M12 52l9-9" stroke="#5a3b28" stroke-width="4" stroke-linecap="round"/>`,
  hammer: `<path d="M14 54L40 22" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M14 54L40 22" stroke="#9a6a3c" stroke-width="4.4" stroke-linecap="round"/><path d="M30 14l10-10 20 20-10 10z" fill="#9a948c" ${S}/><path d="M38 12l14 14" stroke="#6f6a63" stroke-width="5"/><path d="M34 14l4-4" stroke="#c9c4bc" stroke-width="2.4" stroke-linecap="round"/>`,
  // 사스마타: 비스듬한 긴 자루 + 빨간 감개 + 은빛 U자 갈래(끝이 뾰족)
  fork: `<path d="M10 56L40 26" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M10 56L40 26" stroke="#b8834a" stroke-width="4" stroke-linecap="round"/><path d="M12.5 53.5l5-5" stroke="#e2574c" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M33 23l10 10M38 18q-6 6 0 12q6 6 12 0" fill="none" stroke="${L}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M33 23l10 10M38 18q-6 6 0 12q6 6 12 0" fill="none" stroke="#c9ced6" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38 18l1.2-9 4.8 6.2zM50 30l9-1.2-6.2-4.8z" fill="#e6eaef" ${S} stroke-width="2"/>`,
  star: `<path d="M24 40L52 10" stroke="${L}" stroke-width="9" stroke-linecap="round"/><path d="M24 40L52 10" stroke="#cdeeff" stroke-width="5.4" stroke-linecap="round"/><path d="M30 33L48 14" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M16 36l12 12" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M16 36l12 12" stroke="#f2c94c" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="42" r="3" fill="#ff7a9a" ${S} stroke-width="1.6"/><path d="M12 52l8-8" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M12 52l8-8" stroke="#3a4a7a" stroke-width="4" stroke-linecap="round"/><path d="M54 4l1.6 3.4 3.4 1.6-3.4 1.6L54 14l-1.6-3.4L49 9l3.4-1.6z" fill="#ffd94a"/>`
};
export const weaponSvg = (id) => `<svg viewBox="0 0 64 64" aria-hidden="true">${shadow(16)}${WEAPON[id] || ''}</svg>`;
