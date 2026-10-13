/**
 * 사이드스토리 '하치와레의 카메라' 화면(stories/camera.js 가 쓴다). 실패해서 끝나는 일은 없다.
 *  flash(): 찰칵! 화면이 하얗게 번쩍
 *  viewfinder({ label, n, of, onShoot() }): 화면 가운데 네모 틀(사진에 담길 곳)과 셔터 버튼. Space · Enter 로도 누른다
 *  frameRect(): 지금 틀의 화면 사각형(사진으로 오려 낼 곳) · hideViewfinder()
 *  roll(url): 찍은 사진을 틀 아래에 작게 늘어놓는다(rollClear() 로 비운다)
 *  showPrints(urls | null, captions): 뽑은 사진(흔들리게)을 한 장씩 펼친다. null 이면 그림으로 · hidePrints()
 * sketchPhoto(ctx2d, w, h, i): 사진이 없을 때 그리는 흔들린 사진 그림(뽑은 사진 · 흔들린 사진 액자).
 */
export function createPhotoUi(ui) {
  const flashEl = document.createElement('div');
  flashEl.className = 'photo-flash';
  const vf = document.createElement('div');
  vf.className = 'viewfinder';
  vf.hidden = true;
  vf.innerHTML = '<div class="vf-lab"></div><div class="vf-frame"><i class="vf-c tl"></i><i class="vf-c tr"></i><i class="vf-c bl"></i><i class="vf-c br"></i><span class="vf-rec"></span></div>'
    + '<div class="vf-roll"></div><button type="button" class="vf-btn">찰칵!</button><div class="vf-hint"><kbd>Space</kbd> 또는 버튼</div>';
  const prints = document.createElement('div');
  prints.className = 'prints';
  prints.hidden = true;
  ui.append(flashEl, vf, prints);
  const q = (s) => vf.querySelector(s);
  const lab = q('.vf-lab'), frame = q('.vf-frame'), rec = q('.vf-rec'), rollEl = q('.vf-roll'), btn = q('.vf-btn');
  let shoot = null; // 뷰파인더가 떠 있는 동안 셔터를 누르면 부를 것

  function press() {
    if (!shoot) return;
    const cb = shoot;
    shoot = null; // 한 장 찍으면 다음 차례(이야기가 다시 띄울 때)까지 잠근다
    btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
    cb();
  }
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); press(); });
  window.addEventListener('keydown', (e) => {
    if (!shoot || vf.hidden || e.repeat || !(e.code === 'Space' || e.code === 'Enter' || e.key === ' ')) return;
    e.preventDefault();
    press();
  });

  return {
    get shooting() { return !!shoot; },
    flash() {
      flashEl.classList.remove('on');
      void flashEl.offsetWidth;
      flashEl.classList.add('on');
    },
    viewfinder({ label, n, of, onShoot }) {
      lab.textContent = label;
      rec.textContent = `● ${n} / ${of}`;
      vf.hidden = false;
      shoot = onShoot;
    },
    hideViewfinder() { shoot = null; vf.hidden = true; },
    frameRect() { return frame.getBoundingClientRect(); },
    /** 뷰파인더 틀이 화면 너비의 몇 할인지(띄우기 전에도: index.html 의 .vf-frame 너비 식과 같다). */
    frameFraction() {
      const W = ui.clientWidth || window.innerWidth, H = ui.clientHeight || window.innerHeight;
      return Math.min(W - 32, 640, (H * 0.58 * 4) / 3) / W;
    },
    roll(url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      rollEl.appendChild(img);
    },
    rollClear() { rollEl.replaceChildren(); },
    showPrints(urls, captions = []) {
      const n = urls ? urls.length : captions.length;
      const cards = Array.from({ length: n }, (_, i) => {
        const fig = document.createElement('figure');
        fig.className = 'print';
        fig.style.setProperty('--r', `${[-5, 3, -2, 5][i % 4]}deg`);
        fig.style.setProperty('--d', `${i * 0.35}s`);
        const ph = document.createElement('div');
        ph.className = 'ph';
        let src = urls && urls[i];
        if (!src) { // 사진이 없으면(다른 기기 · 지운 브라우저) 그림으로
          const c = document.createElement('canvas');
          c.width = 240; c.height = 180;
          sketchPhoto(c.getContext('2d'), 240, 180, i);
          src = c.toDataURL('image/png');
        }
        // 흔들린 사진: 살짝 번진 사진 위에 조금 비켜난 같은 사진을 반투명하게 겹친다
        for (const cls of ['', 'ghost']) { const img = document.createElement('img'); img.src = src; img.alt = ''; if (cls) img.className = cls; ph.appendChild(img); }
        fig.appendChild(ph);
        if (captions[i]) { const cap = document.createElement('figcaption'); cap.textContent = captions[i]; fig.appendChild(cap); }
        return fig;
      });
      prints.replaceChildren(...cards);
      prints.hidden = false;
    },
    hidePrints() { prints.hidden = true; prints.replaceChildren(); }
  };
}

/** 사진이 없을 때의 흔들린 사진 그림: 풀밭 위 하늘, i 에 따라 치이카와 혼자 · 셋이 나란히 · 거꾸로 선 우사기. */
export function sketchPhoto(g, w, h, i = 1) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#bfe3ff');
  sky.addColorStop(0.62, '#e9f6ff');
  sky.addColorStop(0.63, '#a6d98a');
  sky.addColorStop(1, '#86c56c');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  try { g.filter = 'blur(1.6px)'; } catch { /* 번지게 못 그리면 또렷하게 */ }
  const blob = (x, y, r, body, ears, upside = false) => {
    g.save();
    g.translate(x, y);
    if (upside) g.rotate(Math.PI);
    g.fillStyle = body;
    g.strokeStyle = '#5a4a3a';
    g.lineWidth = Math.max(1.5, r * 0.08);
    g.beginPath(); g.ellipse(0, r * 0.95, r * 0.75, r * 0.6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); // 몸
    if (ears === 'long') for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.35, -r * 1.1, r * 0.18, r * 0.6, s * 0.12, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else if (ears === 'cat') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.75, -r * 0.35); g.lineTo(s * r * 0.55, -r * 0.95); g.lineTo(s * r * 0.15, -r * 0.7); g.closePath(); g.fill(); g.stroke(); }
    else for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.55, -r * 0.65, r * 0.22, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2); g.fill(); g.stroke(); // 얼굴
    if (ears === 'cat') { g.fillStyle = '#5f86c9'; g.beginPath(); g.ellipse(0, -r * 0.45, r * 0.95, r * 0.45, 0, Math.PI, Math.PI * 2); g.fill(); }
    g.fillStyle = '#2b2224';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.32, r * 0.05, r * 0.09, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff9fb2';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.55, r * 0.3, r * 0.14, r * 0.08, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  };
  const y = h * 0.52, r = h * 0.17;
  if (i === 0) blob(w * 0.5, y, r * 1.25, '#ffffff', 'round');
  else if (i === 2) { blob(w * 0.3, y, r, '#ffffff', 'round'); blob(w * 0.62, y + r * 0.6, r, '#fff6d6', 'long', true); }
  else { blob(w * 0.28, y, r, '#ffffff', 'round'); blob(w * 0.5, y - (i === 3 ? r * 0.5 : 0), r, '#ffffff', 'cat'); blob(w * 0.73, y, r, '#fff6d6', 'long'); }
  try { g.filter = 'none'; } catch { /* 그대로 */ }
}
