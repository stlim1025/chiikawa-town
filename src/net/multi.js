/**
 * 같이 놀기(멀티): 동물의 숲처럼 내 마을 문을 열면 친구가 내 마을 코드로 놀러 온다(서버: server/TownServer 의 SignalR 허브 /town).
 * 게임 진행은 각자 기기에 있고, 여기서는 '누가 어디서 뭘 하는지'와 주인 마을의 모습(시간 · 친구들 · 풀)만 나눈다.
 * SignalR 클라이언트는 처음 연결할 때만 CDN 에서 불러온다(같이 놀기를 안 쓰면 받지 않는다).
 */
const SIGNALR_URL = 'https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.7/+esm';
/** 같이 놀기 서버(Tailscale Funnel 고정 주소, server/README.md). 화면에는 보이지 않고 마을 코드만 넣는다. */
export const DEFAULT_SERVER = 'desktop-jc07560.tail4a150e.ts.net';
/** 위치를 보내는 간격(초). 서버는 1초에 20번 넘게 오면 버린다. */
export const SEND_EVERY = 0.1;
/** 가만히 있어도 이만큼(초)마다 한 번은 보낸다. */
const HEARTBEAT = 2;
/** 내 마을 코드 글자(헷갈리는 I · L · O · 0 · 1 은 뺐다). */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** 내 마을 코드 길이. */
export const CODE_LEN = 6;

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

/** 마을 코드 정리(서버와 같은 규칙): 1~16자 한글 · 영문 · 숫자 · '-', 영문은 소문자. 맞지 않으면 null. */
export function roomCode(input) {
  const c = String(input || '').trim().toLowerCase();
  return /^[0-9a-z가-힣-]{1,16}$/.test(c) ? c : null;
}

/** 새 내 마을 코드(대문자 6자, 예: 'K7QX2M'). random 은 0 이상 1 미만을 돌려주는 함수. */
export function newVillageCode(random = Math.random) {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return s;
}

/** 저장된 내 마을 코드가 쓸 만한지(대문자 6자, 정해진 글자만). */
export function isVillageCode(code) {
  return typeof code === 'string' && code.length === CODE_LEN && [...code].every((ch) => CODE_CHARS.includes(ch));
}

const REASON = {
  room: '마을 코드는 영문, 숫자로 6자예요',
  look: '캐릭터 모습을 보낼 수 없었어요',
  taken: '이 마을 문은 다른 창에서 이미 열려 있어요',
  closed: '그 마을은 지금 문이 닫혀 있어요. 친구에게 문을 열어 달라고 해 주세요',
  full: '그 마을은 지금 꽉 찼어요(8명까지)'
};

/**
 * events: {
 *   joined(player, fresh — 방금 들어왔으면 true, 먼저 와 있던 사람이면 false), moved(id, move), left(id, name),
 *   said(id, text), emote(id, name), world(payload — 주인 마을의 모습, 손님만 받는다),
 *   closed(hostName — 놀러 간 마을의 문이 닫혔다), lost() — 놀러 간 마을과 연결이 끊겼다, cleared(), status()
 * }
 * player = { id, name, look, host, move: { x, z, yaw, anim, area } }
 */
export function createMulti(events = {}) {
  let lib = null, conn = null, status = 'off', error = '', room = null, role = null, info = null, hostId = null;
  let sendT = 0, beatT = 0, lastKey = '';
  const players = new Map(); // id → { name, host }(나 빼고)
  const setStatus = (s, err = '') => { status = s; error = err; events.status?.(); };
  const clearPlayers = () => { players.clear(); events.cleared?.(); };
  const live = () => status === 'open' || status === 'visiting';

  /** 문을 열거나 놀러 간다(처음 연결 · 끊겼다 다시 이어졌을 때 again=true). */
  async function enter(again = false) {
    const r = await conn.invoke(role === 'host' ? 'OpenGate' : 'Visit', room, info);
    if (!r || !r.ok) {
      await stop();
      setStatus('error', REASON[r && r.reason] || '들어갈 수 없었어요');
      if (again && role === 'guest') events.lost?.(); // 다시 이었더니 그새 문이 닫혀 있었다
      return;
    }
    clearPlayers();
    hostId = r.host;
    for (const p of r.players || []) { players.set(p.id, { name: p.name, host: !!p.host }); events.joined?.(p, false); }
    lastKey = '';
    setStatus(role === 'host' ? 'open' : 'visiting');
  }
  async function stop() {
    const c = conn;
    conn = null;
    clearPlayers();
    if (c) { try { await c.stop(); } catch { /* 이미 끊겼다 */ } }
  }

  async function start(as, server, code, joinInfo) {
    const url = hubUrl(server), rc = roomCode(code);
    if (!url) { setStatus('error', '서버 주소를 확인해 주세요'); return false; }
    if (!rc) { setStatus('error', REASON.room); return false; }
    await stop();
    room = rc;
    role = as;
    info = joinInfo;
    hostId = null;
    setStatus('connecting');
    try {
      lib ||= await import(SIGNALR_URL);
      // 협상(HTTP) 없이 바로 웹소켓으로: 게임 페이지와 출처가 다른 서버에도 CORS 걱정 없이 붙는다
      const c = new lib.HubConnectionBuilder()
        .withUrl(url, { skipNegotiation: true, transport: lib.HttpTransportType.WebSockets })
        .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
        .configureLogging(lib.LogLevel.Warning)
        .build();
      c.on('playerJoined', (p) => { players.set(p.id, { name: p.name, host: !!p.host }); events.joined?.(p, true); events.status?.(); });
      c.on('playerMoved', (id, m) => events.moved?.(id, m));
      c.on('playerLeft', (id) => {
        const p = players.get(id);
        players.delete(id);
        events.left?.(id, p ? p.name : '');
        events.status?.();
      });
      c.on('playerSaid', (id, text) => events.said?.(id, text));
      c.on('playerEmote', (id, name) => events.emote?.(id, name));
      c.on('world', (w) => { if (role === 'guest' && status === 'visiting') events.world?.(w); });
      c.on('gateClosed', (hostName) => {
        // 놀러 간 마을의 주인이 문을 닫았다: 연결을 끊고 집으로
        if (conn !== c) return;
        stop().then(() => { setStatus('off'); events.closed?.(hostName || ''); });
      });
      c.onreconnecting(() => { clearPlayers(); setStatus('connecting'); });
      // 새 연결이라 다시 문을 열거나 다시 놀러 간다
      c.onreconnected(() => {
        enter(true).catch(() => { stop(); setStatus('error', '다시 들어가지 못했어요'); if (role === 'guest') events.lost?.(); });
      });
      c.onclose(() => {
        if (conn !== c) return;
        const wasGuest = role === 'guest';
        conn = null;
        clearPlayers();
        setStatus('error', '서버와 연결이 끊겼어요');
        if (wasGuest) events.lost?.();
      });
      conn = c;
      await c.start();
      await enter();
      return live();
    } catch {
      await stop();
      setStatus('error', '같이 놀기 서버에 연결할 수 없어요. 서버가 켜져 있을 때 다시 해 주세요');
      return false;
    }
  }

  return {
    get status() { return status; },
    get error() { return error; },
    /** 문을 연 내 마을 코드 · 놀러 간 마을 코드(소문자). */
    get room() { return room; },
    /** 'host'(내 마을 문을 열었다) · 'guest'(놀러 갔다) · null. */
    get role() { return live() || status === 'connecting' ? role : null; },
    /** 같은 마을 사람들(나 빼고) [{ id, name, host }]. */
    get players() { return [...players].map(([id, p]) => ({ id, ...p })); },
    /** 같은 마을 사람 수(나 빼고). */
    get count() { return players.size; },
    /** 놀러 간 마을 주인의 이름(없으면 ''). */
    get hostName() { const p = hostId && players.get(hostId); return p ? p.name : ''; },
    /** 내 마을 문을 연다. joinInfo = { name, look, x, z, yaw }. 열었으면 true. */
    open(server, code, joinInfo) { return start('host', server, code, joinInfo); },
    /** 친구 마을에 놀러 간다(문이 열려 있어야 한다). 들어갔으면 true. */
    visit(server, code, joinInfo) { return start('guest', server, code, joinInfo); },
    /** 문을 닫거나(주인) 집으로 돌아가며(손님) 연결을 끊는다. */
    async leave() {
      const c = conn;
      if (c) { try { await c.invoke('Leave'); } catch { /* 이미 끊겼다 */ } }
      await stop();
      setStatus('off');
    },
    /** 매 프레임: 내 움직임 { x, z, yaw, anim, area } 을 SEND_EVERY 초마다(바뀌었을 때만, 가만히 있어도 HEARTBEAT 초마다 한 번). */
    tick(dt, move) {
      if (!live() || !conn) return;
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
    /** 주인: 내 마을의 모습을 손님들에게 보낸다(손님이 있을 때만). */
    sendWorld(payload) { if (status === 'open' && conn && players.size) conn.send('World', payload).catch(() => {}); },
    /** 한마디(정해진 말)를 보낸다. */
    say(text) { if (live() && conn) conn.send('Say', text).catch(() => {}); },
    /** 이모트(몸짓 이름)를 보낸다. */
    emote(name) { if (live() && conn) conn.send('Emote', name).catch(() => {}); }
  };
}
