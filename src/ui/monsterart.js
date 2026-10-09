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
  slime: () => `${shadow(20)}<ellipse cx="32" cy="53" rx="21" ry="5" fill="#3f8fd0" ${S}/>
    <path d="M32 9q4 10 14 18q8 8 7 16q-1 12-21 12t-21-12q-1-8 7-16q10-8 14-18z" fill="#56aeea" ${S}/>
    <ellipse cx="22" cy="28" rx="6" ry="3.4" fill="#9fdcfa" transform="rotate(-35 22 28)"/>
    <ellipse cx="21" cy="30" rx="4" ry="2.2" fill="#fff" transform="rotate(-35 21 30)"/><circle cx="17" cy="36" r="1.5" fill="#fff"/>
    ${eyes(32, 40, 7, 3, null)}<ellipse cx="22" cy="45" rx="3" ry="1.6" fill="#ff9fb4"/><ellipse cx="42" cy="45" rx="3" ry="1.6" fill="#ff9fb4"/><ellipse cx="32" cy="47" rx="2" ry="1.6" fill="#2b2224"/>`,
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
  hopper: () => `${shadow(18)}
    <path d="M12 52l7-13M52 52l-7-13" ${S} stroke-width="3"/>
    <ellipse cx="15" cy="36" rx="6" ry="11" fill="#7cbf4c" ${S} transform="rotate(-25 15 36)"/><ellipse cx="49" cy="36" rx="6" ry="11" fill="#7cbf4c" ${S} transform="rotate(25 49 36)"/>
    <ellipse cx="32" cy="42" rx="13" ry="12" fill="#8fcf5a" ${S}/>
    <path d="M22 30q-10-14 2-21q6 10-2 21z" fill="#5f9e3a" ${S}/><path d="M42 30q10-14-2-21q-6 10 2 21z" fill="#5f9e3a" ${S}/>
    <circle cx="32" cy="31" r="12" fill="#a6d96a" ${S}/>
    <path d="M28 20q-4-9-10-12M36 20q4-9 10-12" fill="none" ${S}/>
    ${eyes(32, 32, 5.5, 2.4, 0.6)}<path d="M29 39h6" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`,
  mole: () => `${shadow(22)}<ellipse cx="32" cy="54" rx="24" ry="5" fill="#9a7552" ${S}/>
    <path d="M28 13l-1-6M32 12V5M36 13l1-6" stroke="#6a4f44" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="32" cy="34" r="20" fill="#7d5f52" ${S}/><ellipse cx="32" cy="40" rx="13" ry="12" fill="#c9a68a"/>
    <ellipse cx="13" cy="47" rx="7" ry="4.5" fill="#f3e2cf" ${S}/><ellipse cx="51" cy="47" rx="7" ry="4.5" fill="#f3e2cf" ${S}/>
    <path d="M7 49l-2 3M11 51l-1 3M15 51v3M57 49l2 3M53 51l1 3M49 51v3" stroke="${L}" stroke-width="1.6" stroke-linecap="round"/>
    ${eyes(32, 30, 6, 1.9, 0.6)}<ellipse cx="32" cy="38" rx="4.2" ry="3.2" fill="#ff9fb4" ${S} stroke-width="1.8"/>
    <ellipse cx="21" cy="37" rx="2.6" ry="1.4" fill="#ff9fb4"/><ellipse cx="43" cy="37" rx="2.6" ry="1.4" fill="#ff9fb4"/>`,
  shroom: () => `${shadow(16)}
    <path d="M22 56q-3-12 2-22h16q5 10 2 22z" fill="#f3e6cf" ${S}/>
    <path d="M6 32Q6 8 32 8t26 24q-26 7-52 0z" fill="#9a6ad0" ${S}/>
    <ellipse cx="32" cy="14" rx="4.5" ry="2.4" fill="#fff3dc"/><ellipse cx="17" cy="22" rx="3.6" ry="2" fill="#fff3dc"/><ellipse cx="47" cy="21" rx="4" ry="2.2" fill="#fff3dc"/><ellipse cx="25" cy="27" rx="2.6" ry="1.4" fill="#fff3dc"/><ellipse cx="41" cy="28" rx="2.4" ry="1.3" fill="#fff3dc"/>
    ${eyes(32, 44, 5, 2.2, 0.8)}<path d="M30 51h4" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`,
  stump: () => `${shadow(22)}
    <path d="M12 54q4-3 4-8M52 54q-4-3-4-8M26 57l2-5M38 57l-2-5" stroke="#7a5136" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M14 24v26q18 8 36 0V24z" fill="#a0703f" ${S}/>
    <ellipse cx="32" cy="24" rx="18" ry="6" fill="#ecd09e" ${S}/><ellipse cx="32" cy="24" rx="11" ry="3.6" fill="none" stroke="#c9a274" stroke-width="2"/><ellipse cx="32" cy="24" rx="4.5" ry="1.6" fill="#c9a274"/>
    <path d="M14 36l-8-8M50 36l8-8" stroke="${L}" stroke-width="6.4" stroke-linecap="round"/><path d="M14 36l-8-8M50 36l8-8" stroke="#8a5a30" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="6" cy="26" r="4.4" fill="#6cc77e" ${S}/><circle cx="58" cy="26" r="4.4" fill="#6cc77e" ${S}/>
    <path d="M35 20v-8" stroke="#5a9a48" stroke-width="2.4" stroke-linecap="round"/><path d="M35 13q-6-4-9 0q4 3 9 0zM35 13q6-4 9 0q-4 3-9 0z" fill="#7cc25e" ${S} stroke-width="1.6"/>
    ${eyes(32, 38, 7, 2.6, 1)}<path d="M27 47h10" stroke="${L}" stroke-width="2.2" stroke-linecap="round"/>`,
  frog: () => `${shadow(20)}
    <ellipse cx="14" cy="51" rx="8" ry="4.5" fill="#5aae68" ${S}/><ellipse cx="50" cy="51" rx="8" ry="4.5" fill="#5aae68" ${S}/>
    <ellipse cx="32" cy="41" rx="20" ry="15" fill="#6cc77e" ${S}/><ellipse cx="32" cy="46" rx="13" ry="8" fill="#e8f5c8"/>
    <circle cx="22" cy="27" r="7" fill="#6cc77e" ${S}/><circle cx="42" cy="27" r="7" fill="#6cc77e" ${S}/>
    <ellipse cx="32" cy="15" rx="15" ry="4" fill="#4fa05a" ${S}/><circle cx="38" cy="12" r="3" fill="#ffb6c9" ${S} stroke-width="1.6"/>
    ${eyes(32, 28, 10, 2.4, 0.4)}<path d="M23 39q9 5 18 0" fill="none" stroke="${L}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="19" cy="37" rx="2.6" ry="1.4" fill="#ff9fb4"/><ellipse cx="45" cy="37" rx="2.6" ry="1.4" fill="#ff9fb4"/>`,
  crab: () => `${shadow(22)}
    ${[0, 1, 2].map((i) => `<path d="M${16 - i * 2} ${43 + i * 3}l-8 ${4 + i}M${48 + i * 2} ${43 + i * 3}l8 ${4 + i}" stroke="#e0764a" stroke-width="2.8" stroke-linecap="round"/>`).join('')}
    <path d="M13 34q-7-2-5-9M51 34q7-2 5-9" fill="none" stroke="#e0764a" stroke-width="3" stroke-linecap="round"/>
    <path d="M8 27q-7-7 0-13q7 2 5 9zM56 27q7-7 0-13q-7 2-5 9z" fill="#f08a5d" ${S}/>
    <ellipse cx="32" cy="43" rx="19" ry="11" fill="#f08a5d" ${S}/>
    <ellipse cx="32" cy="33" rx="14" ry="9" fill="#b9b2a6" ${S}/><ellipse cx="37" cy="30" rx="4" ry="2" fill="#a39a8f"/>
    <path d="M26 30V20M38 30V20" stroke="#e0764a" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="26" cy="17" r="4.5" fill="#fff" ${S} stroke-width="1.8"/><circle cx="38" cy="17" r="4.5" fill="#fff" ${S} stroke-width="1.8"/>
    <circle cx="26" cy="17.6" r="2" fill="#2b2224"/><circle cx="38" cy="17.6" r="2" fill="#2b2224"/>
    <path d="M22 10l7 3M42 10l-7 3" stroke="${L}" stroke-width="2" stroke-linecap="round"/><path d="M29 47h6" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`,
  pebble: () => `${shadow(20)}
    <path d="M10 44q-2-20 12-28q12-6 24 2q12 8 9 26q-3 10-22 11t-23-11z" fill="#9da3ab" ${S}/>
    <path d="M40 15q8 2 10 8q-6 2-12-2z" fill="#8a9099"/><ellipse cx="25" cy="16" rx="8" ry="3" fill="#86b85e" ${S} stroke-width="1.8"/>
    <path d="M52 30l6-4-2 8zM50 41l7 1-5 5z" fill="#8fe3f0" ${S} stroke-width="1.6"/>
    ${eyes(30, 34, 7, 2.6, 0.6)}<ellipse cx="30" cy="45" rx="3" ry="1.6" fill="#2b2224"/>`,
  ram: () => `${shadow(20)}
    <path d="M20 52v6M28 53v5M38 53v5M46 52v6" stroke="#6b5a55" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M10 40q-6-10 4-16q0-10 10-10q6-6 14-2q10-2 14 6q10 4 6 14q6 10-4 16q-4 6-14 4q-6 4-14 0q-12 2-16-12z" fill="#fbfaf6" ${S}/>
    <ellipse cx="32" cy="37" rx="10" ry="11" fill="#ecdcd2" ${S}/>
    <path d="M23 29q-10-6-12 4q0 8 8 6q4-2 2-6M41 29q10-6 12 4q0 8-8 6q-4-2-2-6" fill="none" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/>
    <path d="M23 29q-10-6-12 4q0 8 8 6q4-2 2-6M41 29q10-6 12 4q0 8-8 6q-4-2-2-6" fill="none" stroke="#d9b98a" stroke-width="4.4" stroke-linecap="round"/>
    <ellipse cx="32" cy="27" rx="7" ry="3.6" fill="#fff" ${S} stroke-width="1.6"/>
    ${eyes(32, 36, 4.5, 2, 0.6)}<ellipse cx="32" cy="43" rx="2.4" ry="1.4" fill="#c98a8a"/>`,
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
  leafwing: `${shadow(14)}<path d="M14 50Q10 20 40 10q12 4 8 16Q42 44 14 50z" fill="#b5e07a" ${S}/><path d="M16 48Q28 30 44 14M24 38l-6-4M30 30l-4-6M36 22l-2-6" fill="none" stroke="#7cbf4c" stroke-width="2" stroke-linecap="round"/>`,
  sweetroot: `${shadow(14)}<path d="M24 22q8-6 16 0q2 14-8 32q-10-18-8-32z" fill="#e8b88a" ${S}/><path d="M27 30h7M28 38h6M30 46h3" stroke="#c4925f" stroke-width="2" stroke-linecap="round"/><path d="M29 20q-5-10 1-13q3 6-1 13zM35 20q5-10-1-13q-3 6 1 13z" fill="#7cc25e" ${S} stroke-width="1.8"/>`,
  spore: `${shadow(14)}<path d="M18 32q0-12 14-12t14 12q2 20-14 22q-16-2-14-22z" fill="#c39be8" ${S}/><path d="M26 20q6-6 12 0" fill="none" ${S}/><circle cx="26" cy="34" r="2.4" fill="#fff3dc"/><circle cx="37" cy="40" r="3" fill="#fff3dc"/><circle cx="30" cy="46" r="1.8" fill="#fff3dc"/><path d="M48 10l1.2 2.6 2.6 1.2-2.6 1.2L48 18l-1.2-2.8-2.6-1.2 2.6-1.2z" fill="#ffd94a"/>`,
  bark: `${shadow(16)}<path d="M14 16l34-4 4 36-34 6z" fill="#a0703f" ${S}/><path d="M23 18l2 34M33 16l2 34M43 14l2 34" stroke="#7a5136" stroke-width="2.4" stroke-linecap="round"/><path d="M40 10q6-6 10 0q-4 4-10 0z" fill="#7cc25e" ${S} stroke-width="1.6"/>`,
  lilypad: `${shadow(18)}<path d="M32 31L53 24A22 21 0 1 1 41 11Z" fill="#4fa05a" ${S}/><path d="M32 31L18 21M32 31L16 41M32 31L36 50M32 31L50 42" stroke="#3e8a4a" stroke-width="2" stroke-linecap="round"/><circle cx="46" cy="14" r="5" fill="#ffb6c9" ${S} stroke-width="1.8"/><circle cx="46" cy="14" r="2" fill="#ffe36e"/>`,
  pearl: `${shadow(16)}<path d="M8 42q24-24 48 0q-24 14-48 0z" fill="#f6c2a8" ${S}/><path d="M20 34l4 6M32 30v8M44 34l-4 6" stroke="#e8a588" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="34" r="9" fill="#fbf7ff" ${S}/><circle cx="29" cy="31" r="3" fill="#fff"/><path d="M50 12l1.2 2.6 2.6 1.2-2.6 1.2L50 20l-1.2-2.8-2.6-1.2 2.6-1.2z" fill="#ffd94a"/>`,
  ore: `${shadow(16)}<path d="M12 44l6-18 14-8 16 6 4 18-16 10z" fill="#9da3ab" ${S}/><path d="M24 30l6-12 6 10-4 10zM38 32l8-10 4 12-6 6z" fill="#8fe3f0" ${S} stroke-width="1.8"/><path d="M28 22l2-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  wool: `${shadow(18)}<path d="M14 44q-8-2-6-10q2-8 10-6q2-10 12-8q6-6 14 0q10-2 12 8q8 2 6 10q-2 8-10 6q-6 6-14 2q-8 4-14-2q-8 2-10 0z" fill="#fbfaf6" ${S}/><path d="M22 34q4-3 8 0M34 30q4-3 8 0M28 42q4-3 8 0" fill="none" stroke="#e6dfd2" stroke-width="2" stroke-linecap="round"/>`,
  kingcap: `${shadow(20)}<path d="M6 44Q6 14 32 12t26 32q-26 8-52 0z" fill="#c0473c" ${S}/><path d="M8 44q24 6 48 0v4q-24 6-48 0z" fill="#efd9b5" ${S}/><ellipse cx="32" cy="20" rx="6" ry="3" fill="#fff3dc"/><ellipse cx="18" cy="30" rx="4.6" ry="2.4" fill="#fff3dc"/><ellipse cx="45" cy="28" rx="5" ry="2.6" fill="#fff3dc"/><path d="M14 22q6-8 14-9" fill="none" stroke="#e8786c" stroke-width="2.4" stroke-linecap="round"/>`
};
export const dropSvg = (id) => `<svg viewBox="0 0 64 64" aria-hidden="true">${DROP[id] || ''}</svg>`;
registerItemArt(Object.fromEntries(Object.keys(DROP).map((id) => [id, dropSvg(id)])));

/** 무기 그림(도구점 · 가방). 비스듬히 놓인 모습. */
const WEAPON = {
  stick: `<path d="M14 52L50 12" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M14 52L50 12" stroke="#b07a45" stroke-width="4.4" stroke-linecap="round"/><circle cx="34" cy="30" r="2" fill="#8a5a30"/><path d="M44 19q8-4 10 2q-6 4-10-2z" fill="#7cc25e" ${S}/>`,
  sword: `<path d="M24 40L52 10" stroke="${L}" stroke-width="9" stroke-linecap="round"/><path d="M24 40L52 10" stroke="#e3c08d" stroke-width="5.4" stroke-linecap="round"/><path d="M17 37l10 10" stroke="${L}" stroke-width="7" stroke-linecap="round"/><path d="M17 37l10 10" stroke="#3e2a1d" stroke-width="3.6" stroke-linecap="round"/><path d="M12 52l9-9" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M12 52l9-9" stroke="#5a3b28" stroke-width="4" stroke-linecap="round"/>`,
  hammer: `<path d="M14 54L40 22" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M14 54L40 22" stroke="#9a6a3c" stroke-width="4.4" stroke-linecap="round"/><path d="M30 14l10-10 20 20-10 10z" fill="#9a948c" ${S}/><path d="M38 12l14 14" stroke="#6f6a63" stroke-width="5"/><path d="M34 14l4-4" stroke="#c9c4bc" stroke-width="2.4" stroke-linecap="round"/>`,
  // 사스마타: 비스듬한 분홍 자루(하얀 마개) + 끝이 안으로 휜 둥근 U 갈래 + 하얀 가시
  fork: (() => {
    // 갈래 고리: 가운데 (44, 20), 반지름 11, 자루 쪽(왼쪽 아래)에서 열린 쪽(오른쪽 위)으로
    const cx = 43, cy = 21, R = 13, base = Math.PI * 0.75; // 자루가 붙는 방향(왼쪽 아래)
    const pt = (a, r = R) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const a0 = base - Math.PI * 0.53, a1 = base + Math.PI * 0.53;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const arc = `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    let spikes = '';
    for (const k of [-0.48, -0.3, -0.13, 0.13, 0.3, 0.48]) {
      const a = base + Math.PI * k;
      const [px, py] = pt(a), [ix, iy] = pt(a, R - 6), [s1x, s1y] = pt(a - 0.13), [s2x, s2y] = pt(a + 0.13);
      spikes += `<path d="M${s1x.toFixed(1)} ${s1y.toFixed(1)}L${ix.toFixed(1)} ${iy.toFixed(1)}L${s2x.toFixed(1)} ${s2y.toFixed(1)}Z" fill="#fffaf6" stroke="${L}" stroke-width="1.6" stroke-linejoin="round"/>`;
      void px; void py;
    }
    for (const k of [-0.4, 0.4]) {
      const a = base + Math.PI * k;
      const [ox, oy] = pt(a, R + 5.5), [s1x, s1y] = pt(a - 0.13), [s2x, s2y] = pt(a + 0.13);
      spikes += `<path d="M${s1x.toFixed(1)} ${s1y.toFixed(1)}L${ox.toFixed(1)} ${oy.toFixed(1)}L${s2x.toFixed(1)} ${s2y.toFixed(1)}Z" fill="#fffaf6" stroke="${L}" stroke-width="1.6" stroke-linejoin="round"/>`;
    }
    const [jx, jy] = pt(base);
    return `<path d="M9 57L${jx.toFixed(1)} ${jy.toFixed(1)}" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M9 57L${jx.toFixed(1)} ${jy.toFixed(1)}" stroke="#f3a6b8" stroke-width="4" stroke-linecap="round"/>
      <path d="M8 58l4-4" stroke="${L}" stroke-width="7.6" stroke-linecap="round"/><path d="M8 58l4-4" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/>
      ${spikes}<path d="${arc}" fill="none" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="${arc}" fill="none" stroke="#f3a6b8" stroke-width="4" stroke-linecap="round"/>`;
  })(),
  star: `<path d="M24 40L52 10" stroke="${L}" stroke-width="9" stroke-linecap="round"/><path d="M24 40L52 10" stroke="#cdeeff" stroke-width="5.4" stroke-linecap="round"/><path d="M30 33L48 14" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M16 36l12 12" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M16 36l12 12" stroke="#f2c94c" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="42" r="3" fill="#ff7a9a" ${S} stroke-width="1.6"/><path d="M12 52l8-8" stroke="${L}" stroke-width="7.4" stroke-linecap="round"/><path d="M12 52l8-8" stroke="#3a4a7a" stroke-width="4" stroke-linecap="round"/><path d="M54 4l1.6 3.4 3.4 1.6-3.4 1.6L54 14l-1.6-3.4L49 9l3.4-1.6z" fill="#ffd94a"/>`
};
/** 무기에 새긴 얼굴(토벌 랭커) 자리: 날 · 자루 가운데쯤. */
const FACE_SPOT = { stick: [32, 32], sword: [40, 24], hammer: [27, 38], fork: [24, 42], star: [40, 24] };
/** 새긴 얼굴: 몸 색 동그라미 + 두 눈 + 볼. */
const faceBadge = (id, body) => {
  const [x, y] = FACE_SPOT[id] || [32, 32];
  return `<g transform="translate(${x} ${y})"><circle r="7.6" fill="${body}" stroke="${L}" stroke-width="2"/>`
    + `<circle cx="-2.6" cy="-0.6" r="1.25" fill="${L}"/><circle cx="2.6" cy="-0.6" r="1.25" fill="${L}"/>`
    + `<ellipse cx="-4.2" cy="2" rx="1.5" ry="0.9" fill="#ffa8b8"/><ellipse cx="4.2" cy="2" rx="1.5" ry="0.9" fill="#ffa8b8"/></g>`;
};
/** 무기 그림. face: 얼굴을 새겼으면 그 몸 색(토벌 랭커). */
export const weaponSvg = (id, face = null) => `<svg viewBox="0 0 64 64" aria-hidden="true">${shadow(16)}${WEAPON[id] || ''}${face ? faceBadge(id, face) : ''}</svg>`;
