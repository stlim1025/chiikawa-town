import * as THREE from 'three';

/** 마중 나오는 친구들: 종류, 입구 안쪽 도착점에서 떨어진 자리(dx, dz), 처음 왔을 때 인사, 다시 왔을 때 인사. */
const GREETERS = [
  ['chiikawa', -1.4, -2.0, '…!! 어서 와!', '…♪ 왔다!'],
  ['hachiware', 1.3, -1.8, '와아~ 새 친구다!', '다시 왔구나~ 반가워!'],
  ['usagi', 0.1, -3.1, '우라!', '야하!']
];

const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

/**
 * 마을 입장 연출: 마을 밖에서 걸어 들어와 입구를 지나면 도장이 찍히고, 친구들이 마중 나온다.
 * start(onDone) 으로 시작, 매 프레임 update(dt). 건너뛰기 버튼이 있다.
 */
export function createIntro(ui, { player, cam, npcs, village, sound }) {
  const E = village.entrance;
  // 마을 이름 리본: 리본이 펼쳐지고 이름이 떠오른 뒤 '어서 와요!' 딱지가 톡 붙는다
  const stamp = document.createElement('div');
  stamp.className = 'village-title';
  stamp.hidden = true;
  stamp.innerHTML = '<div class="vt-band"><i class="vt-tail l"></i><i class="vt-tail r"></i><div class="vt-ribbon"><b class="vt-name">치이카와 마을</b><span class="vt-line" aria-hidden="true"></span></div></div><i class="vt-kicker">어서 와요!</i>';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'btn skip-btn';
  skip.textContent = '건너뛰기';
  skip.hidden = true;
  ui.append(stamp, skip);

  // 처음에는 마을 밖 높은 곳에서 입구를 바라본다
  const wide = { pos: new THREE.Vector3(5.5, 6.5, E.outside.z + 8), look: new THREE.Vector3(0, 1.4, E.gateZ) };
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  let t = 0, greetT = 0, active = false, stamped = false, greeted = false, done = null, first = true;

  function finish() {
    if (!active) return;
    active = false;
    player.walkTo = null;
    player.placeAt(E.inside.x, E.inside.z);
    player.face(E.inside.x, E.inside.z - 1);
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
    /** fresh: 처음 만든 캐릭터면 true(인사가 달라진다). */
    start(onDone, fresh = true) {
      t = 0; active = true; stamped = false; greeted = false; done = onDone; first = fresh;
      stamp.querySelector('.vt-kicker').textContent = fresh ? '어서 와요!' : '또 왔어요!';
      player.placeAt(E.outside.x, E.outside.z);
      player.face(E.outside.x, E.outside.z - 1);
      player.walkTo = { x: E.inside.x, z: E.inside.z, speed: 2.6 };
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
      if (greeted && t - greetT > 2.2) finish();
    }
  };
}
