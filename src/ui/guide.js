/**
 * 대화 상자(동물의 숲처럼 아래쪽, 기울어진 이름표와 통통 튀는 ▼)와, 지금 할 일을 알려 주는 쪽지.
 * 하치와레뿐 아니라 마을 친구 누구나 이 상자로 말한다. who = { kind, name, tag(이름표 색), ink(이름 글씨 색), hearts? }
 * say(lines, onDone, who): 한 줄씩 보여 주고 다 읽으면 onDone. 상자 아무 곳이나 누르거나 ▼ 버튼(엔터·스페이스)으로 넘긴다.
 *   줄은 글 한 줄이거나 { text, chips: [{ icon(SVG), text, done? }], marks?: [말] }: 글 밑에 물건 · 몬스터 그림 꼬리표를 단다(몇 개 모았는지 등).
 *   marks 에 든 말은 글 속에서 빨갛게 칠한다(쿠리만쥬 술 강의에서 시험에 나오는 말).
 * ask(text, choices, onPick, who): 말 한 줄과 오른쪽 위 선택지 말풍선. 고르면 onPick(번호).
 * onDone · onPick 안에서 다시 say · ask 를 부르면 상자가 닫히지 않고 바로 이어진다.
 * opts.onLine(who, text): 새 줄이 나올 때마다(말소리용 — 글을 보고 그 친구 목소리를 고른다). opts.dock: 할 일 쪽지를 붙일 곳(HUD 왼쪽 위 기둥).
 * opts.onCue(cue): { text, cue } 줄이 나올 때(연출 신호: 피자호빵 클로즈업 · 울기 시작 …).
 */
const HACHI = { kind: 'hachiware', name: '하치와레', tag: '#a9d4f2', ink: '#2f5577' };

/** 글을 칠할 말(marks)과 나머지 조각으로 나눈다. 긴 말부터 찾아 겹치지 않게. → [{ text, mark }] (이어 붙이면 원래 글) */
export function markSegments(text, marks = []) {
  const list = marks.filter(Boolean).sort((a, b) => b.length - a.length), out = [];
  let i = 0, plain = '';
  while (i < text.length) {
    const w = list.find((m) => text.startsWith(m, i));
    if (!w) { plain += text[i++]; continue; }
    if (plain) out.push({ text: plain, mark: false });
    plain = '';
    out.push({ text: w, mark: true });
    i += w.length;
  }
  if (plain) out.push({ text: plain, mark: false });
  return out;
}

export function createGuide(ui, { onLine, dock, onCue } = {}) {
  const box = document.createElement('div');
  box.className = 'guide';
  box.setAttribute('role', 'dialog');
  box.hidden = true;
  box.innerHTML = `
    <p class="guide-name"><span class="nm"></span><span class="hearts" aria-hidden="true"></span><span class="note"></span></p>
    <p class="guide-text" aria-live="polite"></p>
    <p class="guide-chips" hidden></p>
    <div class="guide-choices" role="menu" hidden></div>
    <button class="guide-next" type="button"></button>`;
  const goal = document.createElement('div');
  goal.className = 'guide-goal';
  goal.hidden = true;
  ui.append(box);
  (dock || ui).append(goal);

  const text = box.querySelector('.guide-text'), chipsEl = box.querySelector('.guide-chips'), next = box.querySelector('.guide-next'), choicesEl = box.querySelector('.guide-choices');
  const nameEl = box.querySelector('.guide-name'), nmEl = nameEl.querySelector('.nm'), heartsEl = nameEl.querySelector('.hearts'), noteEl = nameEl.querySelector('.note');
  let lines = [], i = 0, done = null, who = HACHI, baseWho = HACHI, choosing = false, seq = 0;
  let sel = 0, pickFn = null; // 선택지: 지금 고른 줄, 골랐을 때 부를 함수

  function setWho(w) {
    who = w || HACHI;
    nmEl.textContent = who.name;
    nameEl.style.background = who.tag;
    nameEl.style.color = who.ink;
    // 친밀도 하트(친구에게 말 걸었을 때만)
    heartsEl.textContent = who.hearts == null ? '' : '♥'.repeat(who.hearts) + '♡'.repeat(5 - who.hearts);
    noteEl.textContent = who.note || ''; // 그 친구에게 빌린 돈 같은 짧은 메모
    box.setAttribute('aria-label', `${who.name}의 말`);
  }
  function open() {
    box.hidden = false;
    seq++;
  }
  /** 콜백을 부르고, 그 안에서 새 말을 시작하지 않았으면 상자를 닫는다. */
  function finish(cb, arg) {
    const before = seq;
    cb?.(arg);
    if (seq === before) box.hidden = true;
  }
  /** 글 밑 그림 꼬리표(없으면 숨긴다). */
  function setChips(list = []) {
    chipsEl.hidden = !list.length;
    chipsEl.replaceChildren(...list.map((c) => {
      const el = document.createElement('span');
      el.className = 'g-chip' + (c.done ? ' done' : '');
      if (c.icon) el.insertAdjacentHTML('beforeend', c.icon);
      const t = document.createElement('em');
      t.textContent = c.text;
      el.append(t);
      return el;
    }));
  }
  function show() {
    const L = lines[i];
    const w = typeof L !== 'string' && L.who ? L.who : baseWho;
    if (w !== who) setWho(w);
    if (typeof L !== 'string' && L.cue) onCue?.(L.cue);
    if (typeof L !== 'string' && L.marks) {
      text.replaceChildren(...markSegments(L.text, L.marks).map((p) => (p.mark ? Object.assign(document.createElement('b'), { className: 'g-mark', textContent: p.text }) : document.createTextNode(p.text))));
    } else text.textContent = typeof L === 'string' ? L : L.text;
    setChips(typeof L === 'string' ? [] : L.chips);
    next.setAttribute('aria-label', i === lines.length - 1 ? '알겠어!' : '다음');
    onLine?.(who, text.textContent);
  }
  /** 다음 줄로(마지막 줄이면 닫고 onDone). */
  function advance() {
    if (box.hidden || choosing) return;
    i++;
    if (i < lines.length) { show(); return; }
    const cb = done;
    done = null;
    finish(cb);
  }
  // 버튼을 눌러도 상자로 올라오므로 상자 하나에서만 처리한다(선택지를 고르는 중에는 넘기지 않는다)
  box.addEventListener('click', advance);

  /** k 번째 선택지를 노랗게(위아래 끝에서는 반대쪽으로 돈다). */
  function select(k) {
    const items = [...choicesEl.children];
    if (!items.length) return;
    sel = (k + items.length) % items.length;
    items.forEach((b, j) => b.classList.toggle('sel', j === sel));
    items[sel].focus({ preventScroll: true });
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  function choose(k) {
    if (!choosing) return;
    choosing = false;
    choicesEl.hidden = true;
    next.hidden = false;
    finish(pickFn, k);
  }

  // 키보드: 선택지는 W/S(↑/↓)로 고르고 스페이스·엔터로 정한다. 대사는 스페이스·엔터로 넘긴다.
  // 대화 중에는 이 키들이 이동 · '말 걸기'로 새어 나가지 않게 여기서 멈춘다(창 맨 앞 단계에서 받는다).
  const OK = ['Space', 'Enter', 'NumpadEnter'], UP = ['KeyW', 'ArrowUp'], DOWN = ['KeyS', 'ArrowDown'];
  window.addEventListener('keydown', (e) => {
    if (box.hidden || (e.target && e.target.tagName === 'INPUT')) return;
    const up = UP.includes(e.code), down = DOWN.includes(e.code), ok = OK.includes(e.code);
    if (!up && !down && !ok) return;
    e.preventDefault(); // 버튼이 스스로 눌리는 것(두 번 고르기)도 막는다
    e.stopPropagation();
    if (e.repeat) return; // 꾹 누르고 있어도 한 번만
    if (choosing) {
      if (up) select(sel - 1);
      else if (down) select(sel + 1);
      else choose(sel);
    } else if (ok) advance();
  }, true);
  window.addEventListener('keyup', (e) => {
    if (box.hidden || !OK.includes(e.code)) return;
    e.preventDefault(); // 스페이스는 뗄 때 버튼이 눌리므로 그것도 막는다
    e.stopPropagation();
  }, true);

  return {
    get open() { return !box.hidden; },
    say(list, onDone, w) {
      setWho(w);
      baseWho = who;
      open();
      choosing = false;
      choicesEl.hidden = true;
      next.hidden = false;
      lines = list;
      i = 0;
      done = onDone || null;
      show();
      next.focus();
    },
    ask(line, choices, onPick, w) {
      setWho(w);
      open();
      choosing = true;
      pickFn = onPick;
      next.hidden = true;
      text.textContent = line;
      setChips();
      onLine?.(who, line);
      choicesEl.replaceChildren(...choices.map((label, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'guide-choice';
        b.setAttribute('role', 'menuitem');
        b.textContent = label;
        b.addEventListener('click', (e) => { e.stopPropagation(); choose(k); });
        b.addEventListener('pointerenter', () => select(k)); // 마우스로 가리켜도 같은 줄이 노래진다
        return b;
      }));
      choicesEl.hidden = false;
      choicesEl.scrollTop = 0;
      select(0);
    },
    /** 할 일 쪽지. null 이면 숨긴다. hold: 자리만 두고 숨겨 둔다(가운데 할 일 카드가 날아와 꽂힐 때 hud.announce 가 드러낸다). */
    setGoal(t, { hold = false } = {}) {
      goal.hidden = !t;
      if (t) goal.textContent = t;
      goal.classList.toggle('incoming', !!t && hold);
    },
    /** 할 일 쪽지 칸(hud.announce 의 target). */
    goalEl: goal
  };
}
