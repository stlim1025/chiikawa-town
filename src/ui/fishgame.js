/**
 * 낚시 화면(core/fishing.js, 게임 오리지널).
 *  끌어올리기 놀이: 오른쪽에 세로 물길(위 물낯 → 아래 깊은 물), 행동 버튼을 누르고 있으면 올라가는 초록 칸과 이리저리 도망치는
 *  물고기 그림자(무엇이 걸렸는지는 낚을 때까지 모른다), 옆에 낚기 게이지.
 *  잡은 물고기 카드: 가운데 위에 빙글 도는 빛살과 물고기 그림, 이름 · 크기 · 팔면 얼마 · '처음 잡았어요!' 띠.
 */
const SHADOW = (size) => {
  const w = [24, 28, 32][size], h = [9, 11, 13][size];
  return `<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M${46 + (32 - w) / 2} 20l12-9v18z" fill="#24435c" opacity=".8"/>`
    + `<ellipse cx="30" cy="20" rx="${w}" ry="${h}" fill="#24435c" opacity=".8"/><circle cx="${30 - w + 9}" cy="${20 - h / 3}" r="2.4" fill="#cfe6f2"/></svg>`;
};

export function createFishGame(root) {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const game = el('div', 'fishgame');
  const track = el('div', 'fg-track'), zone = el('div', 'fg-zone'), fish = el('div', 'fg-fish');
  const bar = el('div', 'fg-bar'), fill = el('i');
  const tip = el('div', 'fg-tip', '꾹 누르면 올라가요');
  track.append(zone, fish);
  bar.append(fill);
  game.append(track, bar, tip);
  game.hidden = true;
  const card = el('div', 'fish-catch');
  card.hidden = true;
  card.setAttribute('role', 'status');
  root.append(game, card);
  let shownSize = -1, cardTimer = 0;

  return {
    /** 놀이 화면을 reel(stepReel 상태)에 맞춘다. zoneSize: 초록 칸 크기(0 ~ 1), size: 물고기 크기(그림자), holding: 누르고 있다. */
    show(reel, zoneSize, size, holding) {
      game.hidden = false;
      if (shownSize !== size) { fish.innerHTML = SHADOW(size); shownSize = size; }
      zone.style.bottom = `${reel.zone * 100}%`;
      zone.style.height = `${zoneSize * 100}%`;
      fish.style.bottom = `${reel.fish * 100}%`;
      fish.style.transform = `translate(-50%, 50%) rotate(${Math.sin(reel.t * 9) * 14}deg)`;
      fill.style.height = `${reel.progress * 100}%`;
      game.classList.toggle('in', !!reel.inside);
      game.classList.toggle('hold', !!holding);
      tip.hidden = reel.t > 3.5;
    },
    hide() { game.hidden = true; shownSize = -1; },
    /** 잡은 것 카드: { title, art: SVG 글, chips: [글], ribbon: 띠 글 | null, junk: 쓰레기(빛살 없이 짧게) } — 잠깐 떴다가 사라진다. */
    catchCard({ title, art, chips = [], ribbon = null, junk = false }) {
      const pic = el('div', 'fc-art');
      if (!junk) pic.append(el('i', 'fc-rays'));
      const img = el('span', 'fc-img');
      img.innerHTML = art;
      pic.append(img);
      const row = el('div', 'fc-chips');
      chips.forEach((c) => row.append(el('span', null, c)));
      card.replaceChildren(...[ribbon ? el('div', 'fc-ribbon', ribbon) : null, pic, el('div', 'fc-title', title), chips.length ? row : null].filter(Boolean));
      card.className = `fish-catch${junk ? ' junk' : ''}`;
      card.hidden = false;
      void card.offsetWidth; // 같은 카드가 연달아 떠도 처음부터 튀어나오게
      card.classList.add('pop');
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => { card.hidden = true; }, junk ? 1800 : 3000);
    },
    hideCard() { clearTimeout(cardTimer); card.hidden = true; }
  };
}
