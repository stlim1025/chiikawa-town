import assert from 'node:assert/strict';
import { test } from 'node:test';
const W = await import('../src/ui/webapp.js');

const PHONE = { framed: false, standalone: false, touch: true };
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  kakao: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
  naver: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.0)',
  line: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Line/14.0.0'
};

test('홈 화면에 추가: 브라우저로 연 터치 화면에서만 보이고, 홈 화면 앱 · 아티팩트 안 · 마우스 화면에서는 안 보인다', () => {
  assert.equal(W.installKind({ ...PHONE, ua: UA.android }), 'menu');
  assert.equal(W.installKind({ ...PHONE, standalone: true, ua: UA.android, hasPrompt: true }), null, '홈 화면 앱으로 열었다');
  assert.equal(W.installKind({ ...PHONE, framed: true, ua: UA.android, hasPrompt: true }), null, '아티팩트(iframe) 안');
  assert.equal(W.installKind({ ...PHONE, touch: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0', hasPrompt: true }), null, '마우스가 주인 화면');
});

test('홈 화면에 추가: 안드로이드는 설치 창, 아이폰 · 아이패드는 공유 버튼 안내, 앱 안 브라우저는 다른 브라우저 안내', () => {
  assert.equal(W.installKind({ ...PHONE, ua: UA.android, hasPrompt: true }), 'prompt');
  assert.equal(W.installKind({ ...PHONE, ua: UA.android }), 'menu', '설치 창을 아직 못 받았으면 메뉴 안내');
  assert.equal(W.installKind({ ...PHONE, ua: UA.iphone }), 'ios');
  assert.equal(W.installKind({ ...PHONE, ua: UA.ipad, iosTouchMac: true }), 'ios', '아이패드는 Mac 처럼 알린다');
  for (const k of ['kakao', 'naver', 'line']) assert.equal(W.installKind({ ...PHONE, ua: UA[k], hasPrompt: true }), 'inapp', k);
});

test('홈 화면에 추가: 브라우저 밖(Node)에서는 버튼을 안 보이고, 설치 창도 띄우지 않는다', async () => {
  assert.equal(W.installNow(), null);
  assert.equal(await W.runInstall(), null);
});
