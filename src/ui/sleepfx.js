/**
 * 하루가 지나는 연출: 화면이 밤하늘로 어두워지며 달과 별, "Zzz… 쿨쿨" → 해가 떠오르며 "10월 9일 (금) 아침".
 * dateText: 새 날의 날짜 글자(calendar.js 의 dateLabel).
 * onDark: 화면이 다 어두워졌을 때(이때 시간과 기운을 바꿔 둔다). onMorning: 해가 뜰 때(소리용).
 * 연출이 끝나면 Promise 가 풀린다.
 */
export function playSleep(ui, { dateText }, onDark, onMorning) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'sleep-fx';
    el.setAttribute('role', 'status');
    const stars = Array.from({ length: 14 }, (_, i) => {
      const x = (i * 37) % 100, y = (i * 23) % 55;
      return `<i class="star" style="left:${x}%;top:${y}%;animation-delay:${(i % 5) * 0.3}s"></i>`;
    }).join('');
    el.innerHTML = `${stars}<i class="moon"></i><i class="sun"></i>
      <div class="sleep-text"><b class="zzz">Z<span>z</span><span>z</span></b><p>쿨쿨…</p></div>`;
    ui.appendChild(el);
    const text = el.querySelector('.sleep-text');

    setTimeout(() => el.classList.add('in'), 20);
    setTimeout(() => onDark?.(), 700);
    setTimeout(() => {
      el.classList.add('morning');
      text.innerHTML = '<b></b><p>좋은 아침!</p>';
      text.querySelector('b').textContent = `${dateText} 아침`;
      onMorning?.();
    }, 2500);
    setTimeout(() => el.classList.add('out'), 3800);
    setTimeout(() => { el.remove(); resolve(); }, 4400);
  });
}
