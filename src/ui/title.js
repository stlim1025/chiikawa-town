import { createScenery } from './scenery.js';
import { gradeName } from '../core/license.js';
import { installNow, runInstall, onInstallChange } from './webapp.js';

/** 「홈 화면에 추가」를 눌렀는데 설치 창을 띄울 수 없을 때 보이는 안내(webapp.js 의 installKind). */
const INSTALL_GUIDE = {
  ios: '공유 버튼(네모에 위쪽 화살표)을 누르고 「홈 화면에 추가」를 골라 주세요.',
  inapp: '이 앱 안에서는 추가할 수 없어요. 메뉴에서 「다른 브라우저로 열기」를 골라 Safari나 Chrome으로 연 뒤 다시 눌러 주세요.',
  menu: '브라우저 메뉴(⋮)에서 「홈 화면에 추가」나 「앱 설치」를 골라 주세요.'
};

/**
 * 타이틀 화면. 저장이 있으면 "이어하기"와 "새로 시작하기", 없으면 "시작하기"를 보인다.
 * 고른 결과를 Promise 로 돌려준다: 'continue' | 'new'
 * 브라우저로 연 휴대폰 · 태블릿이면 그 아래에 「홈 화면에 추가」 버튼도 보인다(홈 화면 앱으로 열었거나 아티팩트 안이면 안 보인다).
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
    const install = homeScreenButton(el.querySelector('.title-card'));

    const leave = (choice) => {
      install.off();
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
      who.textContent = `${saved.profile.name}, 제초 ${gradeName(saved.license.grade)}`;
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

/** 카드 맨 아래 「홈 화면에 추가」: 누르면 설치 창, 못 띄우면 그 아래에 안내 한 줄. → { off() } */
function homeScreenButton(card) {
  const box = document.createElement('div');
  box.className = 'title-install';
  box.innerHTML = '<button type="button" class="btn title-install-btn">홈 화면에 추가</button><p class="title-install-guide" hidden></p>';
  card.appendChild(box);
  const guide = box.querySelector('p');
  const sync = () => { box.hidden = !installNow(); };
  sync();
  const off = onInstallChange(sync);
  box.querySelector('button').addEventListener('click', async () => {
    const outcome = installNow() === 'prompt' ? await runInstall() : null;
    if (outcome) { if (outcome === 'accepted') box.hidden = true; return; } // 설치 창을 닫았으면 그대로 둔다
    guide.textContent = INSTALL_GUIDE[installNow()] || INSTALL_GUIDE.menu;
    guide.hidden = false;
  });
  return { off };
}
