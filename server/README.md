# 치이카와 마을 같이 놀기 서버

동물의 숲처럼 **내 마을 문을 열면 친구가 내 마을 코드로 놀러 오는** 작은 서버입니다.
콘솔 프로그램에서 ASP.NET Core 로 SignalR 허브(`/town`)를 띄웁니다.

- 게임 진행(돈, 가방, 자격증 …)은 지금처럼 **각자 기기에** 저장됩니다.
- 서버는 같은 마을 사람들의 **위치, 몸짓, 한마디**와 주인이 보내는 **마을 모습(시간, 마을 친구들, 풀)**을 나눠 주기만 합니다.
  저장하는 것이 없어서 DB 도 계정도 필요 없습니다.
- 한 마을에는 주인 포함 8명까지 들어올 수 있습니다(`appsettings.json` 의 `Town:MaxPlayers`).

## 게임에서 어떻게 노나요

마을폰 → **같이 놀기**

| 하는 사람 | 하는 일 |
|---|---|
| 주인 | **내 마을 코드**(처음 한 번 만들어져 저장되는 대문자 6자, 예: `K7QX2M`)를 친구에게 알려 주고 **문 열기** |
| 친구 | 그 코드를 넣고 **놀러 가기** → 주인 마을 남쪽 정문 안에서 나타난다 |
| 친구 | 다 놀았으면 **집으로 돌아가기** → 떠나기 전 자리로 돌아온다 |
| 주인 | **문 닫기**(또는 창을 닫으면) → 와 있던 친구들은 저절로 집으로 돌아간다 |

1단계(지금)에서 놀러 간 친구는:

- 주인 마을의 시간(하늘, 시계), 마을 친구들(자리, 몸짓, 말풍선), 풀을 본다. 주인이 풀을 뽑으면 친구 화면에서도 사라진다.
- 마을 울타리 안에서 돌아다니며 한마디로 인사만 한다(풀 뽑기, 가게, 말 걸기는 아직 안 된다).
- 놀러 간 동안 내 시간, 퀘스트, 저장은 멈춘다. 놀러 간 채로 창을 닫아도 떠나기 전 자리에서 이어진다.

다음 단계: 친구 마을에서 풀 뽑기, 열매 따기(내 가방으로), 가게에서 내 돈으로 사기, 주인 집 구경.

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
2. `http://localhost:8765/?mpserver=localhost:5280` 로 열고 마을폰 → **같이 놀기** → **문 열기**. 내 마을 코드를 본다.
3. 다른 창에서 `http://127.0.0.1:8765/?mpserver=localhost:5280` 로 열면 저장이 따로라서 다른 캐릭터로
   그 코드를 넣고 **놀러 가기** 해 볼 수 있다.

## 친구와 놀기: Tailscale Funnel

Tailscale Funnel 을 쓰면 **공유기 포트포워딩, 방화벽, 인증서 없이** 내 PC 의 서버를
고정 주소(`https://내PC이름.내tailnet이름.ts.net`)로 밖에서 들어올 수 있게 합니다.

1. Tailscale 을 설치하고 로그인한다.
2. Tailscale 관리 화면에서 **Funnel 을 켠다**(MagicDNS, HTTPS 인증서도 켜져 있어야 한다. 새 tailnet 은 기본으로 켜져 있다).
3. 서버를 켠 상태에서 아래 명령으로 5280 포트를 내보낸다(`--bg` 면 터미널을 닫거나 PC 를 다시 켜도 유지된다).

   ```bash
   tailscale funnel --bg 5280
   ```

4. `tailscale funnel status` 로 나온 주소(`https://….ts.net`)가 게임의 `DEFAULT_SERVER`(`src/net/multi.js`)와 같은지 확인한다.
   지금 주소: `desktop-jc07560.tail4a150e.ts.net`. 주소가 바뀌면 `DEFAULT_SERVER` 만 고치면 된다.
5. 친구는 GitHub Pages 의 게임에서 마을폰 → **같이 놀기** → **내 마을 코드만** 넣고 놀러 온다(서버 주소는 화면에 보이지 않는다).

> PC 가 켜져 있고 서버가 돌고 있을 때만 놀러 올 수 있습니다. 주인은 게임을 켜 둔 채로 있어야 마을 모습이 친구에게 갑니다.
> 서버 주소는 누구에게나 열려 있으니 마을 코드는 친구끼리만 나누세요. 안 쓸 때는 `tailscale funnel --https=443 off` 로 끌 수 있습니다.

## 설정(`appsettings.json`)

| 키 | 기본값 | 뜻 |
|---|---|---|
| `Urls` | `http://localhost:5280` | 서버가 듣는 주소 |
| `Town:MaxPlayers` | 8 | 마을 하나의 최대 인원(주인 포함) |
| `Town:MovesPerSecond` | 20 | 한 사람이 1초에 보낼 수 있는 위치 수(게임은 10번 보낸다) |
| `Town:MoveBurst` | 5 | 네트워크가 밀렸다 몰려와도 봐주는 개수 |
| `Town:AllowedOrigins` | `["*"]` | 접속을 허용할 게임 페이지 출처 |

## 통신 명세(SignalR 허브 `/town`, JSON)

게임은 협상(HTTP) 없이 바로 웹소켓으로 붙습니다(`skipNegotiation`). 한 메시지는 64KB 까지 받습니다.

### 클라이언트 → 서버

| 메서드 | 인자 | 설명 |
|---|---|---|
| `OpenGate` | `code: string`, `info: { name, look, x, z, yaw }` | 내 마을 문을 연다(주인). 돌려주는 값: `JoinResult`. 그 코드로 이미 열려 있으면 `taken` |
| `Visit` | `code: string`, `info: { name, look, x, z, yaw }` | 친구 마을에 놀러 간다(손님). 돌려주는 값: `JoinResult`. 문이 닫혀 있으면 `closed`, 꽉 찼으면 `full` |
| `Move` | `{ x, z, yaw, anim, area }` | 위치, 방향, 몸짓. `area`: `village`(마을 울타리 안) 또는 `away`(집 안, 마을 밖, 다른 장면) |
| `World` | `{ c, d, n, w }` | 주인만: 마을 모습(아래). 서버는 내용을 해석하지 않고 손님들에게 그대로 보낸다(48KB 까지) |
| `Say` | `text: string`(30자까지) | 한마디(게임에서는 정해진 말만) |
| `Emote` | `name: string`(16자까지) | 몸짓 이름 |
| `Leave` | | 나온다. 주인이면 문이 닫힌다(연결이 끊겨도 저절로 나온다) |

`JoinResult`: `{ ok, reason, you, host, players: [{ id, name, look, move, host }] }`.
`reason`: `room`(코드가 이상함), `look`, `taken`, `closed`, `full`.

마을 코드: 서버는 한글, 영문, 숫자, `-` 로 1~16자를 받고 영문은 소문자로 바꾼다.
게임이 만드는 내 마을 코드는 헷갈리는 글자(I, L, O, 0, 1)를 뺀 대문자 6자다.

### 마을 모습(`World`, 주인 → 손님)

주인은 손님이 있을 때 0.2초마다 보낸다. 풀(`w`)은 1초마다, 새 손님이 오면 바로.

| 키 | 모양 | 뜻 |
|---|---|---|
| `c` | `[day, t]` | 주인 마을 시계(날, 하루 중 0~1, 06:00 이 0) |
| `d` | `"YYYY-MM-DD"` | 주인의 시작 날짜(날짜 표시용) |
| `n` | `[[kind, x, z, yaw, mode, bubble, away]]` | 마을 친구들: 종류, 자리, 방향, 몸짓, 말풍선(없으면 `""`), 집 안이면 1 |
| `w` | `[[id, kind, x, z, stage, hidden]]` | 마을 울타리 안 풀: 주인 쪽 번호, 종류, 자리, 뽑힌 단계, 숨었으면 1(낮의 달빛 풀) |

손님은 받은 값을 하나씩 확인해서 쓴다(모르는 풀 종류, 숫자가 아닌 자리는 버린다).

### 서버 → 클라이언트

| 이벤트 | 인자 |
|---|---|
| `playerJoined` | `{ id, name, look, move, host }` |
| `playerMoved` | `id`, `{ x, z, yaw, anim, area }` |
| `playerSaid` | `id`, `text` |
| `playerEmote` | `id`, `name` |
| `playerLeft` | `id`(손님이 나갔다) |
| `world` | 마을 모습(손님만 받는다) |
| `gateClosed` | 주인 이름(주인이 문을 닫았거나 연결이 끊겼다. 손님은 집으로 돌아간다) |

게임 쪽 코드: `src/net/multi.js`(연결), `src/net/remote.js`(다른 플레이어 캐릭터),
`src/main.js` 의 같이 놀기 부분(놀러 가기, 마을 모습 보내기와 받기), `src/actors/npcs.js` 의 `snapshot`, `puppet`, `src/world/weeds.js` 의 `snapshot`, `showGuest`.
