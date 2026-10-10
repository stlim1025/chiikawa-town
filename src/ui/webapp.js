// 홈 화면 앱: GitHub Pages 에서 '홈 화면에 추가'하면 주소창 없이 전체화면으로 열리게 머리말(앱 이름 · 아이콘 · 전체화면)을 단다.
// claude.ai 아티팩트 안(iframe)에서는 바깥 페이지가 주인이라 아무것도 하지 않는다.
const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();

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
}
