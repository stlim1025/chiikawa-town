import * as THREE from 'three';

/** 마중 나오는 친구들: 종류, 입구 안쪽 도착점에서 떨어진 자리(dx, dz), 처음 왔을 때 인사(전단지를 보고 온 새 이웃), 다시 왔을 때 인사. */
const GREETERS = [
  ['chiikawa', -1.4, -2.0, '…!! 새 이웃…?!', '…♪ 왔다!'],
  ['hachiware', 1.3, -1.8, '어? 그 전단지! 새로 이사 오는 친구구나!', '다시 왔구나~ 반가워!'],
  ['usagi', 0.1, -3.1, '우라!', '야하!']
];
/** 처음 왔을 때: 마을 밖 숲길 끝에서 주민 모집 전단지를 다시 펼쳐 보는 혼잣말(누르거나 FLYER_LINE_SEC 초가 지나면 다음 줄). */
const FLYER_LINES = [
  '(숲길 끝에서 꼬깃꼬깃한 전단지를 다시 펼쳐 본다…)',
  '빈집 있음 · 일감 많음 · 친구도 많음… 여기가 맞겠지?',
  '(저 앞에 알록달록한 마을 입구가 보인다!)',
  '좋아… 새로운 마을에서 힘내 보자!'
];
/** 마지막 혼잣말(다짐)에서는 두 팔을 번쩍 들고, 전단지를 접어 넣고 힘차게 걸어 들어간다. */
const CHEER_LINE = FLYER_LINES.length - 1;
const FLYER_LINE_SEC = 3.2;

const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

/**
 * 마을 입장 연출: (처음이면) 마을 밖에서 주민 모집 전단지를 펼쳐 보고 → 걸어 들어와 입구를 지나면 도장이 찍히고, 친구들이 마중 나온다.
 * start(onDone, fresh) 으로 시작, 매 프레임 update(dt). 건너뛰기 버튼이 있다.
 */
export function createIntro(ui, { player, cam, npcs, village, sound }) {
  const E = village.entrance;
  // 마을 이름 리본: 리본이 펼쳐지고 이름이 떠오른 뒤 '어서 와요!' 딱지가 톡 붙는다
  const stamp = document.createElement('div');
  stamp.className = 'village-title';
  stamp.hidden = true;
  stamp.innerHTML = '<div class="vt-band"><i class="vt-tail l"></i><i class="vt-tail r"></i><div class="vt-ribbon"><b class="vt-name">치이카와 마을</b><span class="vt-line" aria-hidden="true"></span></div></div><i class="vt-kicker">어서 와요!</i>';
  // 주민 모집 전단지(처음 왔을 때만): 압정으로 꽂혀 있던 접힌 종이 한 장(마을 그림 · 아래 뜯어 가는 연락처 쪽지) + 아래 혼잣말
  const flyer = document.createElement('div');
  flyer.className = 'intro-flyer';
  flyer.hidden = true;
  flyer.setAttribute('role', 'dialog');
  flyer.setAttribute('aria-label', '주민 모집 전단지');
  flyer.innerHTML = `
    <div class="flyer-paper">
      <i class="flyer-pin l" aria-hidden="true"></i><i class="flyer-pin r" aria-hidden="true"></i>
      <b class="flyer-burst">환영!</b>
      <p class="flyer-sub">~ 치이카와 마을 ~</p>
      <h2 class="flyer-title">주민 모집</h2>
      <svg class="flyer-art" viewBox="0 0 240 92" aria-hidden="true"><circle cx="206" cy="22" r="11" fill="#ffd66b" stroke="#e8a93a" stroke-width="2"/><path d="M0 72q60-22 120-6t120-8v34H0z" fill="#bfe6a6" stroke="#6b4a2e" stroke-width="2"/><path d="M112 92q6-14 2-26" fill="none" stroke="#e9c98f" stroke-width="7" stroke-linecap="round"/><path d="M30 70v-16a17 17 0 0 1 34 0v16z" fill="#fff" stroke="#6b4a2e" stroke-width="2"/><rect x="42" y="58" width="9" height="12" rx="4" fill="#cfe7ff" stroke="#6b4a2e" stroke-width="1.6"/><path d="M146 66v-16h28v16" fill="#fff3d6" stroke="#6b4a2e" stroke-width="2"/><path d="M142 51l18-14 18 14z" fill="#f48fb1" stroke="#6b4a2e" stroke-width="2" stroke-linejoin="round"/><rect x="156" y="55" width="8" height="11" rx="2" fill="#c98a5a" stroke="#6b4a2e" stroke-width="1.4"/><path d="M92 66v-12" stroke="#8a5a3a" stroke-width="4" stroke-linecap="round"/><circle cx="92" cy="46" r="12" fill="#8fd16a" stroke="#6b4a2e" stroke-width="2"/><circle cx="214" cy="60" r="8" fill="#f6a9c4" stroke="#6b4a2e" stroke-width="1.6"/><path d="M214 68v6" stroke="#8a5a3a" stroke-width="3" stroke-linecap="round"/><path d="M70 30q4-4 8 0q4-4 8 0" fill="none" stroke="#6b4a2e" stroke-width="1.6" stroke-linecap="round"/><path d="M118 18q3-3 6 0q3-3 6 0" fill="none" stroke="#6b4a2e" stroke-width="1.6" stroke-linecap="round"/></svg>
      <ul class="flyer-list">
        <li><b>★ 빈집 있음</b><small>집세 저렴! 월요일마다</small></li>
        <li><b>★ 일감 많음</b><small>풀 뽑기부터 차근차근</small></li>
        <li><b>★ 친구 많음</b><small>라멘 · 축제 · 별이 쏟아지는 밤</small></li>
      </ul>
      <p class="flyer-note">경험 없어도 OK! 몸만 오세요~</p>
      <div class="flyer-tabs" aria-hidden="true"><span class="flyer-tab">노동 접수<br>치이카와 마을</span><span class="flyer-tab">노동 접수<br>치이카와 마을</span><span class="flyer-tab torn">노동 접수<br>치이카와 마을</span><span class="flyer-tab">노동 접수<br>치이카와 마을</span><span class="flyer-tab">노동 접수<br>치이카와 마을</span><span class="flyer-tab">노동 접수<br>치이카와 마을</span></div>
    </div>
    <p class="flyer-say" aria-live="polite"></p>`;
  const sayEl = flyer.querySelector('.flyer-say');
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'btn skip-btn';
  skip.textContent = '건너뛰기';
  skip.hidden = true;
  ui.append(flyer, stamp, skip);

  // 처음에는 마을 밖 높은 곳에서 입구를 바라본다
  const wide = { pos: new THREE.Vector3(5.5, 6.5, E.outside.z + 8), look: new THREE.Vector3(0, 1.4, E.gateZ) };
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  let t = 0, greetT = 0, active = false, stamped = false, greeted = false, done = null, first = true;
  let phase = 'walk', line = 0, lineT = 0; // phase: 'flyer' 전단지 보는 중 · 'walk' 걸어 들어가는 중

  function showLine() {
    sayEl.textContent = FLYER_LINES[line];
    sayEl.classList.toggle('cheer', line === CHEER_LINE);
    if (line === CHEER_LINE) player.cheerTime = 1.6; // 다짐: 두 팔을 번쩍
    lineT = 0;
  }
  /** 전단지 다음 줄(마지막 줄 뒤에는 전단지를 접고 걸어 들어간다). */
  function nextLine() {
    if (phase !== 'flyer') return;
    line++;
    if (line < FLYER_LINES.length) { showLine(); sound?.play('click'); return; }
    flyer.classList.add('leave');
    setTimeout(() => { flyer.hidden = true; flyer.classList.remove('leave'); }, 380);
    phase = 'walk';
    t = 0;
    player.walkTo = { x: E.inside.x, z: E.inside.z, speed: 2.6 };
  }
  flyer.addEventListener('click', nextLine);
  const onKey = (e) => {
    if (!active || phase !== 'flyer' || !['Space', 'Enter', 'NumpadEnter'].includes(e.code)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) nextLine();
  };
  window.addEventListener('keydown', onKey, true);

  function finish() {
    if (!active) return;
    active = false;
    phase = 'walk';
    player.walkTo = null;
    player.placeAt(E.inside.x, E.inside.z);
    player.face(E.inside.x, E.inside.z - 1);
    flyer.hidden = true;
    stamp.hidden = true;
    skip.hidden = true;
    cam.snap(player.position);
    const cb = done;
    done = null;
    if (cb) cb();
  }
  skip.addEventListener('click', finish);

  return {
    get active() { return active; },
    /** fresh: 처음 만든 캐릭터면 true(전단지를 보고 들어오고, 인사가 달라진다). */
    start(onDone, fresh = true) {
      t = 0; active = true; stamped = false; greeted = false; done = onDone; first = fresh;
      stamp.querySelector('.vt-kicker').textContent = fresh ? '어서 와요!' : '또 왔어요!';
      player.placeAt(E.outside.x, E.outside.z);
      player.face(E.outside.x, E.outside.z - 1);
      if (fresh) { phase = 'flyer'; line = 0; showLine(); flyer.hidden = false; player.walkTo = null; }
      else { phase = 'walk'; player.walkTo = { x: E.inside.x, z: E.inside.z, speed: 2.6 }; }
      // 마중 친구들은 처음부터 입구(들어오는 내 캐릭터) 쪽을 보고 기다린다
      GREETERS.forEach(([kind, dx, dz]) => {
        const n = npcs.byKind(kind), x = E.inside.x + dx, z = E.inside.z + dz;
        if (n) { n.x = x; n.z = z; n.state = 'idle'; n.task = null; n.timer = 9; n.talk = 0; n.yaw = Math.atan2(E.outside.x - x, E.outside.z - z); }
      });
      skip.hidden = false;
      cam.set(wide.pos, wide.look);
    },
    update(dt) {
      if (!active) return;
      // 전단지를 보는 동안: 카메라는 마을 밖 높은 곳 그대로, 친구들은 입구에서 기다린다
      if (phase === 'flyer') {
        cam.set(wide.pos, wide.look);
        GREETERS.forEach(([kind]) => { const n = npcs.byKind(kind); if (n) n.timer = Math.max(n.timer, 2); });
        lineT += dt;
        if (lineT > FLYER_LINE_SEC) nextLine();
        return;
      }
      t += dt;
      const p = player.position;
      const follow = cam.poseFor(p.x, p.z);
      const k = smooth((t - 1.4) / 1.8);
      pos.copy(wide.pos).lerp(follow.pos, k);
      look.copy(wide.look).lerp(follow.look, k);
      cam.set(pos, look);
      if (!stamped && p.z < E.gateZ - 0.3) {
        stamped = true;
        stamp.hidden = false;
        stamp.classList.remove('show');
        void stamp.offsetWidth; // 애니메이션 다시 시작
        stamp.classList.add('show');
        sound?.play('morning');
      }
      // 걸어 들어오는 동안 친구들이 고개(몸)를 천천히 돌려 내 캐릭터를 따라 본다
      if (!greeted) GREETERS.forEach(([kind]) => {
        const n = npcs.byKind(kind);
        if (!n) return;
        n.timer = Math.max(n.timer, 2); // 연출 중에는 돌아다니지 않게
        let diff = Math.atan2(p.x - n.x, p.z - n.z) - n.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.yaw += Math.max(-dt * 3, Math.min(dt * 3, diff));
      });
      if (!greeted && !player.walkTo) {
        greeted = true;
        greetT = t;
        GREETERS.forEach(([kind, , , hello, again], i) => {
          const n = npcs.byKind(kind);
          if (n) npcs.talk(n, first ? hello : again);
          setTimeout(() => sound?.play('talk', kind), i * 280); // 셋이 차례로 인사하는 소리
        });
        player.cheerTime = 1.6;
      }
      if (greeted && t - greetT > (first ? 2.8 : 2.2)) finish();
    }
  };
}
