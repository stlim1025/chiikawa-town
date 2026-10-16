// 홈 화면 앱(GitHub Pages)용 서비스 워커: 아무것도 저장하지 않고, 같은 출처의 GET 요청을 그대로 네트워크로 넘긴다.
// 안드로이드 Chrome 이 「앱 설치」 창(beforeinstallprompt)을 띄우려면 fetch 처리기가 있는 서비스 워커가 있어야 해서 둔다(src/ui/webapp.js 가 등록).
// 캐시를 쓰지 않으니 새 버전 알림(src/ui/update.js)과 업데이트는 서비스 워커가 없을 때와 같다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return; // 같이 놀기 서버 같은 다른 곳은 손대지 않는다
  e.respondWith(fetch(r));
});
