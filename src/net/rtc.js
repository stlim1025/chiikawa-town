/**
 * 같이 놀기 바로 연결(WebRTC 데이터 채널): 같은 마을 사람끼리 서버를 거치지 않고 핸드폰끼리 바로 주고받는다.
 * 서버(Tailscale Funnel: 도쿄 중계를 거쳐 PC 로 들어와 느리다)는 처음에 서로의 주소를 건네주는 데만 쓰고(signal),
 * 바로 연결이 안 되는 네트워크(통신사 망이 막는 경우 등)면 그대로 서버를 거친다(multi.js 가 사람마다 고른다).
 * 채널 둘: fast(순서 · 재전송 없음 — 위치 · 마을 모습처럼 최신 것만 있으면 되는 것), sure(순서대로 반드시 — 행동 · 한마디 · 나에게만 온 것).
 */
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
/** 내 주소(같은 와이파이 · 바깥 주소)를 모으는 데 기다리는 최대 시간(ms). 다 모이면 그 전에 보낸다. */
const GATHER_MS = 2500;
/** 이 안에 이어지지 않으면 바로 연결은 포기하고 서버로(ms). */
const CONNECT_MS = 15000;
/** 바로 연결된 사람에게 왕복 시간을 재는 간격(ms). */
const PING_MS = 2000;
/** fast 채널에 이만큼(바이트) 넘게 밀려 있으면 이번 것은 건너뛴다(밀린 옛 위치보다 다음 위치가 낫다). */
const FAST_BUFFER = 64 * 1024;

/**
 * signal(to, payload): 서버로 상대에게 연결 정보를 보낸다. onMessage(id, kind, data): 바로 연결로 받은 것. onChange(): 연결 상태 · 왕복 시간이 바뀌었다.
 * → { supported, connect(id, initiator), take(id, payload), send(id, kind, data, fast) → 보냈으면 true, live(id), info(id), forget(id), closeAll() }
 */
export function createRtc({ signal, onMessage, onChange }) {
  const supported = typeof RTCPeerConnection === 'function';
  const peers = new Map(); // id → { pc, fast, sure, live, rtt, failed, timer }
  let pingTimer = 0;

  /** 주소 모으기가 끝날 때까지(또는 GATHER_MS 까지) 기다린다: 주소를 한 번에 보내서 주고받는 횟수를 줄인다. */
  function gathered(pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((done) => {
      const finish = () => { pc.removeEventListener('icegatheringstatechange', check); clearTimeout(timer); done(); };
      const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
      const timer = setTimeout(finish, GATHER_MS);
      pc.addEventListener('icegatheringstatechange', check);
    });
  }
  function update(P) {
    const was = P.live;
    P.live = !!(P.fast && P.sure && P.fast.readyState === 'open' && P.sure.readyState === 'open');
    if (P.live) { clearTimeout(P.timer); P.failed = false; }
    if (was !== P.live) onChange?.();
  }
  function wire(id, P, ch) {
    if (ch.label === 'fast') P.fast = ch;
    else if (ch.label === 'sure') P.sure = ch;
    else return;
    ch.onopen = () => update(P);
    ch.onclose = () => { if (peers.get(id) === P) drop(id, true); };
    ch.onmessage = (e) => {
      if (typeof e.data !== 'string' || e.data.length > 200000) return;
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (!msg || typeof msg !== 'object' || typeof msg.k !== 'string') return;
      if (msg.k === 'ping') { send(id, 'pong', msg.d); return; }
      if (msg.k === 'pong') { if (Number.isFinite(msg.d)) { P.rtt = Math.max(0, performance.now() - msg.d); onChange?.(); } return; }
      onMessage(id, msg.k, msg.d);
    };
  }
  function make(id) {
    drop(id);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const P = { pc, fast: null, sure: null, live: false, rtt: null, failed: false, timer: 0 };
    peers.set(id, P);
    pc.ondatachannel = (e) => wire(id, P, e.channel);
    pc.onconnectionstatechange = () => {
      if ((pc.connectionState === 'failed' || pc.connectionState === 'closed') && peers.get(id) === P) drop(id, true);
    };
    P.timer = setTimeout(() => { if (peers.get(id) === P && !P.live) drop(id, true); }, CONNECT_MS);
    if (!pingTimer) pingTimer = setInterval(ping, PING_MS);
    onChange?.();
    return P;
  }
  /** 연결을 끊는다. failed: 바로 연결이 안 됐다(서버로 주고받는다고 표시해 둔다). 아니면 아예 잊는다. */
  function drop(id, failed = false) {
    const P = peers.get(id);
    if (!P) return;
    clearTimeout(P.timer);
    const pc = P.pc;
    P.pc = null;
    P.live = false;
    if (pc) { try { pc.close(); } catch { /* 이미 닫혔다 */ } }
    if (failed) P.failed = true; else peers.delete(id);
    onChange?.();
  }
  function ping() {
    for (const id of peers.keys()) send(id, 'ping', performance.now());
  }
  async function offer(id) {
    const P = make(id);
    wire(id, P, P.pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }));
    wire(id, P, P.pc.createDataChannel('sure'));
    await P.pc.setLocalDescription(await P.pc.createOffer());
    await gathered(P.pc);
    if (peers.get(id) === P && P.pc) signal(id, { t: 'rtc', k: 'offer', sdp: P.pc.localDescription.sdp });
  }
  async function answer(id, sdp) {
    const P = make(id);
    await P.pc.setRemoteDescription({ type: 'offer', sdp });
    await P.pc.setLocalDescription(await P.pc.createAnswer());
    await gathered(P.pc);
    if (peers.get(id) === P && P.pc) signal(id, { t: 'rtc', k: 'answer', sdp: P.pc.localDescription.sdp });
  }
  /** kind · data 를 바로 연결로 보낸다(fast: 순서 · 재전송 없는 채널). 바로 연결이 아니면 false(그러면 서버로 보낸다). */
  function send(id, kind, data, fast = false) {
    const P = peers.get(id);
    if (!P || !P.live) return false;
    const ch = fast ? P.fast : P.sure;
    if (!ch || ch.readyState !== 'open') return false;
    if (fast && ch.bufferedAmount > FAST_BUFFER) return true;
    try { ch.send(JSON.stringify({ k: kind, d: data })); return true; } catch { return false; }
  }

  return {
    supported,
    /** 같은 마을에 새로 만난 사람과 바로 연결을 시작한다. 둘 중 한쪽(initiator)만 먼저 청하고, 다른 쪽은 청이 오기를 기다린다. */
    connect(id, initiator) {
      if (!supported || !initiator || (peers.get(id) && peers.get(id).pc)) return;
      offer(id).catch(() => drop(id, true));
    },
    /** 서버로 온 연결 정보({ t: 'rtc', k: 'offer' | 'answer', sdp }). */
    take(id, a) {
      if (!supported || !a || typeof a.sdp !== 'string' || a.sdp.length > 8000) return;
      if (a.k === 'offer') answer(id, a.sdp).catch(() => drop(id, true));
      else if (a.k === 'answer') {
        const P = peers.get(id);
        if (P && P.pc && P.pc.signalingState === 'have-local-offer') P.pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }).catch(() => drop(id, true));
      }
    },
    send,
    /** 그 사람과 바로 연결돼 있는지. */
    live(id) { const P = peers.get(id); return !!(P && P.live); },
    /** 그 사람과의 연결: { mode: 'direct' 바로 · 'trying' 잇는 중 · 'server' 서버로, rtt: 왕복 ms | null }. */
    info(id) {
      const P = peers.get(id);
      if (!P) return { mode: 'server', rtt: null };
      return { mode: P.live ? 'direct' : P.failed ? 'server' : 'trying', rtt: P.live ? P.rtt : null };
    },
    /** 그 사람이 마을을 떠났다. */
    forget(id) { drop(id); },
    /** 마을에서 나왔다(모두 끊는다). */
    closeAll() {
      for (const id of [...peers.keys()]) drop(id);
      clearInterval(pingTimer);
      pingTimer = 0;
    }
  };
}
