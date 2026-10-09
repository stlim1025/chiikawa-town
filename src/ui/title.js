import { createScenery } from './scenery.js';

/**
 * 타이틀 화면. 저장이 있으면 "이어하기"와 "새로 시작하기", 없으면 "시작하기"를 보인다.
 * 고른 결과를 Promise 로 돌려준다: 'continue' | 'new'
 */
export function showTitle(ui, saved) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'title-screen';
    el.innerHTML = `
      <div class="title-card card" role="dialog" aria-label="치이카와 마을 생활 시작">
        <p class="title-kicker"><span class="blush" aria-hidden="true"></span> 먼작귀 마을 생활 <span class="blush" aria-hidden="true"></span></p>
        <h1 class="title-name">치이카와 마을</h1>
        <p class="title-sub">오늘은 어떤 하루가 될까?</p>
        <div class="title-actions"></div>
      </div>`;
    el.prepend(createScenery());
    ui.appendChild(el);
    const actions = el.querySelector('.title-actions');

    const leave = (choice) => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 350);
      resolve(choice);
    };
    const button = (text, cls, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + cls;
      b.textContent = text;
      b.addEventListener('click', onClick);
      actions.appendChild(b);
      return b;
    };

    if (saved) {
      const first = button('이어하기', 'primary', () => leave('continue'));
      const who = document.createElement('small'); // 누구로 이어 하는지는 버튼 안 둘째 줄에 작게
      who.textContent = `${saved.profile.name} ${saved.license.grade}급`;
      first.append(who);
      let armed = false;
      const fresh = button('새로 시작하기', '', () => {
        if (!armed) { armed = true; fresh.textContent = '한 번 더 누르면 저장을 지우고 새로 시작해요'; return; }
        leave('new');
      });
      first.focus();
    } else {
      button('시작하기', 'primary', () => leave('new')).focus();
    }
  });
}
