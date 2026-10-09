import { charSvg } from './art.js';

const INK = '#2b2224';
const ink = (w = 3) => ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// 언덕선(화면 좌표 y). 집과 나무는 이 선 위에 심는다.
const farY = (x) => 462 + 26 * Math.sin(x / 230 + 0.6) + 12 * Math.sin(x / 97 + 2.1);
const nearY = (x) => 622 + 24 * Math.sin(x / 260 + 2.0) + 9 * Math.sin(x / 110);

function hillPath(fn) {
  let d = `M-20 ${fn(-20).toFixed(1)}`;
  for (let x = 0; x <= 1640; x += 20) d += ` L${x} ${fn(x).toFixed(1)}`;
  return d + ' L1640 900 L-20 900 Z';
}

function cloud(x, y, s, cls) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="${cls}">
    <path d="M10 60 Q0 60 2 48 Q4 36 20 38 Q24 18 46 20 Q62 4 84 18 Q104 10 112 30 Q132 30 130 48 Q128 62 112 60 Z" fill="#ffffff"${ink(3.2)}/>
  </g></g>`;
}

/** 집: 바닥 가운데가 언덕선(farY)보다 조금 아래에 오도록 심는다. */
function house(cx, s, roof) {
  const w = 56 * s, base = farY(cx) + 10 * s;
  const x = cx - w / 2, y = base - 62 * s;
  return `<ellipse cx="${cx}" cy="${base}" rx="${w * 0.62}" ry="${7 * s}" fill="#8fcc78"/>
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})">
    <rect x="0" y="22" width="56" height="40" rx="4" fill="#fff4de"${ink()}/>
    <path d="M-6 26 L28 -2 L62 26 Z" fill="${roof}"${ink()}/>
    <rect x="9" y="38" width="14" height="24" rx="3" fill="#a8795a"${ink(2.4)}/>
    <rect x="32" y="34" width="16" height="13" rx="2" fill="#c6e7f5"${ink(2.4)}/>
  </g>`;
}

/** 나무: 줄기 밑동이 선(fn) 아래로 살짝 묻히게 심는다. */
function tree(cx, fn, s, leaf = '#78ca84', sink = 8) {
  const base = fn(cx) + sink * s;
  return `<ellipse cx="${cx}" cy="${base}" rx="${18 * s}" ry="${5 * s}" fill="#8fcc78"/>
  <g transform="translate(${cx} ${(base - 44 * s).toFixed(1)}) scale(${s})">
    <rect x="-5" y="18" width="10" height="26" rx="3" fill="#b88c66"${ink(2.6)}/>
    <path d="M0 -26 Q22 -28 24 -6 Q34 4 22 18 Q8 28 -6 20 Q-26 20 -24 2 Q-30 -16 -12 -20 Q-8 -28 0 -26 Z" fill="${leaf}"${ink(2.8)}/>
  </g>`;
}

function flowers(seed, count) {
  let s = seed, out = '';
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const colors = ['#ffffff', '#ffb7cf', '#ffe36e', '#cdb3ff', '#ff9a9a', '#9fd8ff'];
  for (let i = 0; i < count; i++) {
    const x = r() * 1600, y = nearY(x) + 30 + r() * (880 - nearY(x) - 30), c = colors[i % colors.length];
    out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${[0, 72, 144, 216, 288].map((a) =>
      `<circle cx="${(Math.cos(a * Math.PI / 180) * 5).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180) * 5).toFixed(1)}" r="4.2" fill="${c}"/>`).join('')}<circle r="2.6" fill="#ffcf4a"/></g>`;
  }
  return out;
}

/** 친구: 발끝(64 좌표의 y≈61)이 앞 언덕 풀밭에 닿게 세운다. */
function chibi(kind, cx, depth, s, delay) {
  const feet = nearY(cx) + depth;
  return `<ellipse cx="${cx}" cy="${feet.toFixed(1)}" rx="${(15 * s).toFixed(1)}" ry="${(3.2 * s).toFixed(1)}" fill="#7fbf6c" opacity="0.55"/>
  <g transform="translate(${(cx - 32 * s).toFixed(1)} ${(feet - 61 * s).toFixed(1)}) scale(${s})"><g class="hopper" style="animation-delay:${delay}s">${charSvg(kind)}</g></g>`;
}

let count = 0;
/**
 * 타이틀·캐릭터 만들기 화면에 까는 손그림 배경: 하늘, 해, 구름, 언덕 위 마을, 꽃밭, 통통 뛰는 친구들.
 * opts.friends: false 면 친구들을 빼고 그린다(캐릭터 만들기처럼 앞에 3D 캐릭터가 있을 때).
 */
export function createScenery(opts = {}) {
  const friends = opts.friends !== false;
  const skyId = 'scenery-sky-' + (++count); // 여러 배경이 함께 있어도 그라데이션 ID 가 겹치지 않게
  const el = document.createElement('div');
  el.className = 'scenery';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="${skyId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fd0f5"/><stop offset="0.55" stop-color="#cdeefc"/><stop offset="1" stop-color="#fff0f4"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#${skyId})"/>
    <g transform="translate(1340 150)">
      <g class="sun-rays">${Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return `<path d="M${(Math.cos(a) * 84).toFixed(0)} ${(Math.sin(a) * 84).toFixed(0)} L${(Math.cos(a) * 112).toFixed(0)} ${(Math.sin(a) * 112).toFixed(0)}"${ink(4)}/>`;
      }).join('')}</g>
      <circle r="66" fill="#fff3a6"${ink(3.6)}/>
      <ellipse cx="-24" cy="12" rx="13" ry="7" fill="#ffc1cf"/><ellipse cx="24" cy="12" rx="13" ry="7" fill="#ffc1cf"/>
      <circle cx="-14" cy="-4" r="4.5" fill="${INK}"/><circle cx="14" cy="-4" r="4.5" fill="${INK}"/>
      <path d="M-6 14 q3 4 6 0 q3 4 6 0"${ink(3)} fill="none"/>
    </g>
    ${cloud(120, 80, 1.6, 'cloud c1')}${cloud(620, 40, 1.2, 'cloud c2')}${cloud(980, 190, 1.0, 'cloud c3')}
    <path d="${hillPath(farY)}" fill="#b8e3a2"${ink(3.4)}/>
    ${/* 뒷 언덕 길: 앞 언덕 뒤에서 나와 S 자로 구불구불 좁아지며 뒷 언덕 꼭대기(마을)까지 올라간다 */ ''}
    <path d="M802 ${(nearY(802) + 40).toFixed(1)} C785 600 775 560 782 540 C790 515 826 500 823 480 C821 462 790 450 784 ${farY(784).toFixed(1)}
      L800 ${farY(800).toFixed(1)} C806 450 850 462 849 480 C847 505 812 515 820 540 C828 565 850 600 858 ${(nearY(858) + 40).toFixed(1)} Z" fill="#f3dfae"${ink(2.6)}/>
    ${tree(170, farY, 1.5, '#86cf8c')}${tree(1490, farY, 1.4, '#86cf8c')}${tree(1040, farY, 1.15, '#ffb8cf')}
    ${house(400, 1.45, '#f4a091')}${house(610, 1.25, '#9fd8c4')}${house(1200, 1.35, '#c4b4e8')}${house(1370, 1.15, '#f2cf7a')}
    <path d="${hillPath(nearY)}" fill="#9fdc7f"${ink(3.4)}/>
    ${/* 앞 언덕 길: 화면 아래에서 앞 언덕 꼭대기 선까지 끊기지 않고 이어진다 */ ''}
    <path d="M700 900 C 740 800 760 ${(nearY(790) + 90).toFixed(1)} 805 ${nearY(805).toFixed(1)} L 863 ${nearY(863).toFixed(1)} C 850 ${(nearY(850) + 90).toFixed(1)} 900 800 960 900 Z" fill="#f3dfae"${ink(3)}/>
    ${tree(90, nearY, 1.8, '#78ca84', 30)}${tree(1530, nearY, 1.7, '#78ca84', 30)}
    ${flowers(7, 46)}
    ${friends ? chibi('usagi', 420, 150, 2.9, 0) + chibi('chiikawa', 560, 165, 2.7, 0.25) + chibi('hachiware', 690, 158, 2.7, 0.5)
      + chibi('momonga', 1060, 170, 2.6, 0.15) + chibi('kurimanju', 1200, 160, 2.6, 0.4) : ''}
  </svg>`;
  return el;
}
