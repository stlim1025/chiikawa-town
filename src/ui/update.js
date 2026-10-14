/**
 * 새 버전 알림(GitHub Pages · 홈 화면 앱 · 아티팩트): 저장소 맨 위 version.json(커밋할 때마다 .githooks/pre-commit 이 그 시각으로 바꾼다)을
 * 처음에 한 번 읽어 두고, 몇 분마다 · 앱으로 돌아올 때마다 다시 읽어 다르면 화면 위 가운데에 알림 띠를 띄운다.
 * 「새로고침」은 onReload(저장) 뒤 새로고침, 「나중에」는 띠만 닫는다(그 버전으로는 다시 띄우지 않는다). 놀던 중에 저절로 새로고침하지는 않는다.
 * version.json 을 못 읽으면(파일이 없거나 오프라인) 아무것도 하지 않는다.
 */
const CHECK_MS = 5 * 60 * 1000;

export function createUpdateCheck(ui, { onReload } = {}) {
  let first = null, dismissed = null;
  const read = () => fetch('version.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.v === 'string' ? j.v : null))
    .catch(() => null);

  const bar = document.createElement('div');
  bar.className = 'update-bar';
  bar.hidden = true;
  bar.setAttribute('role', 'status');
  bar.innerHTML = '<span>새 버전이 나왔어요</span><button type="button" class="ub-go">새로고침</button><button type="button" class="ub-later">나중에</button>';
  ui.appendChild(bar);
  bar.querySelector('.ub-go').addEventListener('click', () => {
    try { onReload?.(); } finally { location.reload(); }
  });
  bar.querySelector('.ub-later').addEventListener('click', () => { bar.hidden = true; dismissed = bar.dataset.v; });

  async function check() {
    const v = await read();
    if (!v) return;
    if (first == null) { first = v; return; }
    if (v === first || v === dismissed) return;
    bar.dataset.v = v;
    bar.hidden = false;
  }
  check();
  setInterval(check, CHECK_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  return { check };
}
