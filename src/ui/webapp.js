// 홈 화면 앱: GitHub Pages 에서 '홈 화면에 추가'하면 주소창 없이 전체화면으로 열리게 머리말(앱 이름 · 아이콘 · 전체화면)을 단다.
// claude.ai 아티팩트 안(iframe)에서는 바깥 페이지가 주인이라 아무것도 하지 않는다.
const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();

/**
 * 타이틀 화면 「홈 화면에 추가」 버튼이 할 일(ui/title.js). 브라우저로 연 터치 화면(휴대폰 · 태블릿)에서만 보인다.
 *  'prompt' 브라우저 설치 창을 띄운다(안드로이드 Chrome · 삼성 인터넷이 beforeinstallprompt 를 준 때)
 *  'ios'    아이폰 · 아이패드: 웹페이지가 스스로 추가할 수 없어 공유 버튼 안내
 *  'inapp'  카카오톡 같은 앱 안 브라우저: 추가가 안 돼 Safari · Chrome 으로 열라는 안내
 *  'menu'   그 밖(설치 창을 아직 못 받았다): 브라우저 메뉴 안내
 *  null     버튼을 안 보인다(아티팩트 안 · 홈 화면 앱으로 열었다 · 마우스가 주인 화면)
 */
export function installKind({ framed, standalone, touch, ua = '', iosTouchMac = false, hasPrompt = false }) {
  if (framed || standalone || !touch) return null;
  if (/KAKAOTALK|NAVER\(inapp|DaumApps|Instagram|FBAN|FBAV| Line\//i.test(ua)) return 'inapp';
  if (/iPhone|iPad|iPod/.test(ua) || iosTouchMac) return 'ios';
  return hasPrompt ? 'prompt' : 'menu';
}

let deferred = null, installed = false; // deferred: 받아 둔 설치 창(beforeinstallprompt), installed: 이번에 설치를 마쳤다
const listeners = new Set();
const changed = () => listeners.forEach((f) => f());
const isStandalone = () => navigator.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
/** 지금 「홈 화면에 추가」 버튼이 할 일(installKind 의 값, 안 보일 때 null). */
export function installNow() {
  if (typeof window === 'undefined' || installed) return null;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const iosTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // 아이패드는 Mac 처럼 자기를 알린다
  return installKind({ framed, standalone: isStandalone(), touch: coarse || iosTouchMac, ua: navigator.userAgent, iosTouchMac, hasPrompt: !!deferred });
}
/** 버튼을 눌렀을 때: 받아 둔 설치 창을 띄우고 고른 결과('accepted' | 'dismissed'), 설치 창이 없으면 null(안내를 보일 차례). */
export async function runInstall() {
  if (!deferred) return null;
  const e = deferred;
  deferred = null; // 설치 창은 한 번만 띄울 수 있다(브라우저가 나중에 다시 주면 또 받는다)
  e.prompt();
  const { outcome } = await e.userChoice;
  changed();
  return outcome;
}
/** 버튼이 할 일이 바뀌면(설치 창을 받았다 · 설치를 마쳤다) f 를 부른다. → 떼는 함수 */
export function onInstallChange(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}

if (!framed) {
  const add = (tag, attrs) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    document.head.appendChild(e);
  };
  add('link', { rel: 'manifest', href: 'manifest.webmanifest' });
  add('link', { rel: 'apple-touch-icon', href: 'icons/icon-180.png' });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  // 시각 · 배터리 띠 밑까지 화면을 쓴다: HUD 는 env(safe-area-inset-*) 로 노치를 비켜 간다
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  add('meta', { name: 'apple-mobile-web-app-title', content: '치이카와 마을' });
  add('meta', { name: 'theme-color', content: '#d9eef7' });
  // 홈 화면에서 연 앱이면 표시해 둔다(index.html 이 화면 높이를 100vh 로 잡는다)
  const standalone = navigator.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  if (standalone) document.documentElement.classList.add('standalone');
  // 안드로이드 Chrome 이 「앱 설치」 창을 띄우려면 fetch 처리기가 있는 서비스 워커가 있어야 한다(sw.js 는 요청을 그대로 넘기기만 한다)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // 브라우저가 알아서 띄우는 설치 띠 대신 타이틀 화면 버튼으로 띄운다
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; changed(); });
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; changed(); });
}
