# 치이카와 마을 같이 놀기 서버

같은 방 코드를 넣은 친구들이 서로의 마을에 보이게 해 주는 작은 서버입니다.
콘솔 프로그램에서 ASP.NET Core 로 SignalR 허브(`/town`)를 띄웁니다.

- 게임 진행(돈, 가방, 자격증 …)은 지금처럼 **각자 기기에** 저장됩니다.
- 서버는 같은 방 사람들의 **위치, 몸짓, 한마디**만 나눠 줍니다. 저장하는 것이 없어서 DB 도 계정도 필요 없습니다.
- 한 방에는 8명까지 들어올 수 있습니다(`appsettings.json` 의 `Town:MaxPlayers`).

## 실행

.NET 10 SDK 가 필요합니다.

```bash
cd server/TownServer
dotnet run
```

`http://localhost:5280` 에서 열립니다. 브라우저로 열면 `chiikawa-town server: 0 players online` 이 보입니다.

### 혼자 시험하기(내 PC 안에서만)

게임은 고정 서버 주소(`src/net/multi.js` 의 `DEFAULT_SERVER`)로 붙는다. 내 PC 서버로 시험할 때만 주소 뒤에 `?mpserver=` 를 붙인다.

1. 게임을 `python -m http.server 8765` 로 띄운다(저장소 루트에서).
2. `http://localhost:8765/?mpserver=localhost:5280` 로 열고 마을폰 → **같이 놀기** → 방 코드 아무거나(예: `test`) → 들어가기.
3. 다른 창에서 `http://127.0.0.1:8765/?mpserver=localhost:5280` 로 열면 저장이 따로라서 다른 캐릭터로 같은 방에 들어가 볼 수 있다.

## 친구와 놀기: Tailscale Funnel

Tailscale Funnel 을 쓰면 **공유기 포트포워딩 · 방화벽 · 인증서 없이** 내 PC 의 서버를
고정 주소(`https://내PC이름.내tailnet이름.ts.net`)로 밖에서 들어올 수 있게 합니다.

1. Tailscale 을 설치하고 로그인한다.
2. Tailscale 관리 화면에서 **Funnel 을 켠다**(MagicDNS · HTTPS 인증서도 켜져 있어야 한다. 새 tailnet 은 기본으로 켜져 있다).
3. 서버를 켠 상태에서 아래 명령으로 5280 포트를 내보낸다(`--bg` 면 터미널을 닫거나 PC 를 다시 켜도 유지된다).

   ```bash
   tailscale funnel --bg 5280
   ```

4. `tailscale funnel status` 로 나온 주소(`https://….ts.net`)가 게임의 `DEFAULT_SERVER`(`src/net/multi.js`)와 같은지 확인한다.
   지금 주소: `desktop-jc07560.tail4a150e.ts.net`. 주소가 바뀌면 `DEFAULT_SERVER` 만 고치면 된다.
5. 친구는 GitHub Pages 의 게임에서 마을폰 → **같이 놀기** → **방 코드만** 넣고 들어간다(서버 주소는 화면에 보이지 않는다).

> PC 가 켜져 있고 서버가 돌고 있을 때만 들어올 수 있습니다.
> 서버 주소는 누구에게나 열려 있으니 방 코드는 친구끼리만 나누세요. 안 쓸 때는 `tailscale funnel --https=443 off` 로 끌 수 있습니다.

## 설정(`appsettings.json`)

| 키 | 기본값 | 뜻 |
|---|---|---|
| `Urls` | `http://localhost:5280` | 서버가 듣는 주소 |
| `Town:MaxPlayers` | 8 | 방 하나의 최대 인원 |
| `Town:MovesPerSecond` | 20 | 한 사람이 1초에 보낼 수 있는 위치 수(게임은 10번 보낸다) |
| `Town:MoveBurst` | 5 | 네트워크가 밀렸다 몰려와도 봐주는 개수 |
| `Town:AllowedOrigins` | `["*"]` | 접속을 허용할 게임 페이지 출처 |

## 통신 명세(SignalR 허브 `/town`, JSON)

게임은 협상(HTTP) 없이 바로 웹소켓으로 붙습니다(`skipNegotiation`).

### 클라이언트 → 서버

| 메서드 | 인자 | 설명 |
|---|---|---|
| `Join` | `room: string`, `info: { name, look, x, z, yaw }` | 방에 들어간다. 돌려주는 값: `{ ok, reason, you, players: [{ id, name, look, move }] }`. `reason`: `room`(방 코드가 이상함) · `look` · `full` |
| `Move` | `{ x, z, yaw, anim, area }` | 위치 · 방향 · 몸짓. `area`: `village`(마을) · `away`(집 안이나 다른 장면) |
| `Say` | `text: string`(30자까지) | 한마디(게임에서는 정해진 말만) |
| `Emote` | `name: string`(16자까지) | 몸짓 이름 |
| `Leave` | | 방에서 나온다(연결이 끊겨도 저절로 나온다) |

방 코드: 한글 · 영문 · 숫자 · `-` 로 1~16자. 영문은 소문자로 바꾼다.

### 서버 → 클라이언트

| 이벤트 | 인자 |
|---|---|
| `playerJoined` | `{ id, name, look, move }` |
| `playerMoved` | `id`, `{ x, z, yaw, anim, area }` |
| `playerSaid` | `id`, `text` |
| `playerEmote` | `id`, `name` |
| `playerLeft` | `id` |

게임 쪽 코드: `src/net/multi.js`(연결), `src/net/remote.js`(다른 플레이어 캐릭터).
