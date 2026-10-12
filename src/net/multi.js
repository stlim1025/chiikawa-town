/**
 * 같이 놀기(멀티): 같은 방 사람들과 위치 · 몸짓 · 한마디를 주고받는다(서버: server/TownServer 의 SignalR 허브 /town).
 * 게임 진행은 각자 기기에 있고, 여기서는 '누가 어디서 뭘 하는지'만 나눈다.
 * SignalR 클라이언트는 처음 들어갈 때만 CDN 에서 불러온다(같이 놀기를 안 쓰면 받지 않는다).
 */
const SIGNALR_URL = 'https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.7/+esm';
/** 위치를 보내는 간격(초). 서버는 0.05초보다 자주 오면 버린다. */
export const SEND_EVERY = 0.1;
/** 가만히 있어도 이만큼(초)마다 한 번은 보낸다. */
const HEARTBEAT = 2;

/**
 * 사람이 넣은 서버 주소를 허브 주소로: 'my-pc.tail1234.ts.net' → 'https://my-pc.tail1234.ts.net/town',
 * 'localhost:5280' → 'http://localhost:5280/town'. 비었거나 이상하면 null.
 */
export function hubUrl(input) {
  let s = String(input || '').trim();
  if (!s) return null;
  if (!/^[a-z]+:\/\//i.test(s)) s = (/^(localhost|127\.|\[::1\])/i.test(s) ? 'http://' : 'https://') + s;
  try {
    const u = new URL(s);
    if (u.protocol === 'ws:') u.protocol = 'http:';
    if (u.protocol === 'wss:') u.protocol = 'https:';
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.pathname || u.pathname === '/') u.pathname = '/town';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/** 방 코드 정리(서버와 같은 규칙): 1~16자 한글 · 영문 · 숫자 · '-', 영문은 소문자. 맞지 않으면 null. */
export function roomCode(input) {
  const c = String(input || '').trim().toLowerCase();
  return /^[0-9a-z가-힣-]{1,16}$/.test(c) ? c : null;
}

const REASON = { room: '방 코드는 한글, 영문, 숫자로 16자까지예요', look: '캐릭터 모습을 보낼 수 없었어요', full: '방이 꽉 찼어요(8명까지)' };

/**
 * events: { joined(player), moved(id, move), left(id), said(id, text), emote(id, name), cleared(), status() }
 * player = { id, name, look, move: { x, z, yaw, anim, area } }
 */
export function createMulti(events = {}) {
  let lib = null, conn = null, status = 'off', error = '', room = null, info = null, sendT = 0, beatT = 0, lastKey = '';
  const players = new Map(); // id → 이름(나 빼고)
  const setStatus = (s, err = '') => { status = s; error = err; events.status?.(); };
  const clearPlayers = () => { players.clear(); events.cleared?.(); };

  /** 방에 들어간다(처음 연결 · 끊겼다 다시 이어졌을 때). */
  async function join() {
    const r = await conn.invoke('Join', room, info);
    if (!r || !r.ok) { await stop(); setStatus('error', REASON[r && r.reason] || '들어갈 수 없었어요'); return; }
    clearPlayers();
    for (const p of r.players || []) { players.set(p.id, p.name); events.joined?.(p); }
    lastKey = '';
    setStatus('on');
  }
  async function stop() {
    const c = conn;
    conn = null;
    clearPlayers();
    if (c) { try { await c.stop(); } catch { /* 이미 끊겼다 */ } }
  }

  return {
    get status() { return status; },
    get error() { return error; },
    get room() { return room; },
    get on() { return status === 'on'; },
    /** 같은 방 사람들(나 빼고) [{ id, name }]. */
    get players() { return [...players].map(([id, name]) => ({ id, name })); },
    /** 서버에 붙어 방에 들어간다. joinInfo = { name, look, x, z, yaw }. 들어갔으면 true. */
    async connect(server, code, joinInfo) {
      const url = hubUrl(server), rc = roomCode(code);
      if (!url) { setStatus('error', '서버 주소를 확인해 주세요'); return false; }
      if (!rc) { setStatus('error', REASON.room); return false; }
      await stop();
      room = rc;
      info = joinInfo;
      setStatus('connecting');
      try {
        lib ||= await import(SIGNALR_URL);
        // 협상(HTTP) 없이 바로 웹소켓으로: 게임 페이지와 출처가 다른 서버에도 CORS 걱정 없이 붙는다
        const c = new lib.HubConnectionBuilder()
          .withUrl(url, { skipNegotiation: true, transport: lib.HttpTransportType.WebSockets })
          .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
          .configureLogging(lib.LogLevel.Warning)
          .build();
        c.on('playerJoined', (p) => { players.set(p.id, p.name); events.joined?.(p); events.status?.(); });
        c.on('playerMoved', (id, m) => events.moved?.(id, m));
        c.on('playerLeft', (id) => { players.delete(id); events.left?.(id); events.status?.(); });
        c.on('playerSaid', (id, text) => events.said?.(id, text));
        c.on('playerEmote', (id, name) => events.emote?.(id, name));
        c.onreconnecting(() => { clearPlayers(); setStatus('connecting'); });
        c.onreconnected(() => { join().catch(() => setStatus('error', '방에 다시 들어가지 못했어요')); }); // 새 연결이라 방에 다시 들어간다
        c.onclose(() => { if (conn !== c) return; conn = null; clearPlayers(); setStatus('error', '서버와 연결이 끊겼어요'); });
        conn = c;
        await c.start();
        await join();
        return status === 'on';
      } catch {
        await stop();
        setStatus('error', '서버에 연결할 수 없어요. 주소와 서버가 켜져 있는지 확인해 주세요');
        return false;
      }
    },
    /** 방에서 나와 연결을 끊는다. */
    async leave() {
      const c = conn;
      if (c) { try { await c.invoke('Leave'); } catch { /* 이미 끊겼다 */ } }
      await stop();
      setStatus('off');
    },
    /** 매 프레임: 내 움직임 { x, z, yaw, anim, area } 을 SEND_EVERY 초마다(바뀌었을 때만, 가만히 있어도 HEARTBEAT 초마다 한 번). */
    tick(dt, move) {
      if (status !== 'on' || !conn) return;
      sendT += dt;
      beatT += dt;
      if (sendT < SEND_EVERY) return;
      sendT = 0;
      const key = `${move.x.toFixed(2)},${move.z.toFixed(2)},${move.yaw.toFixed(2)},${move.anim},${move.area}`;
      if (key === lastKey && beatT < HEARTBEAT) return;
      lastKey = key;
      beatT = 0;
      conn.send('Move', move).catch(() => {});
    },
    /** 한마디(정해진 말)를 보낸다. */
    say(text) { if (status === 'on' && conn) conn.send('Say', text).catch(() => {}); },
    /** 이모트(몸짓 이름)를 보낸다. */
    emote(name) { if (status === 'on' && conn) conn.send('Emote', name).catch(() => {}); }
  };
}
