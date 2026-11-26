# 마을 대회 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토요일 낚시 대회와 수요일 풀 뽑기 시합을 연다. 3분 한 판(내 판 동안 시계 멈춤), 마을 친구 여섯과 같이 놀기 손님이 한 순위판에서 겨루고, 오후 5시 광장 시상식에서 상품, 트로피, 업적을 준다.

**Architecture:** 규칙은 모두 순수 모듈 `src/core/contest.js`에 둔다(날짜, 한 판 점수, 기록, 친구 기록 뽑기, 등수, 상품, 저장 정리, 손님 점수 확인). main.js는 대회 날 진행(장식, 접수, 시계 멈춤, 낚시와 풀 뽑기 연결, 친구 참가, 시상식, 같이 놀기)만 잇는다. 시상식 장면은 `src/stories/contest.js`, 접수 탁자와 단상은 `src/world/contestprops.js`.

**Tech Stack:** Three.js ES 모듈(빌드 없음), node:test(`node --test tests/*.test.mjs`), SignalR 같이 놀기(서버는 고치지 않는다).

**Spec:** `docs/Village-Contests-2026-11-26.html` (승인됨)

## Global Constraints

- 화면 글은 한국어, 가운뎃점(·) 없이. 식별자, 로그, 커밋 메시지는 영어. 대회는 게임 오리지널.
- 대회 요일: 낚시 대회 토요일(dow 6), 풀 뽑기 시합 수요일(dow 3). `dateOf(...).dow` 0이 일요일. 3일째부터.
- 접수 오전 9시 ~ 오후 5시, 시상식 오후 5시(놓치면 그날 밤 9시까지), 친구 참가 시작 9시 ~ 4시.
- 한 판 180초(실제 초), 들어갈 때 기운 10, 판 안에서는 기운을 쓰지 않는다. 내 판 동안 마을 시계가 멈춘다(손님 판은 주인 시계를 멈추지 않는다).
- 판 안에서 잡은 것은 세기만 하고 놓아준다(가방, 일감, 팔기 아님). 낚시 도감과 풀 도감 기록은 남긴다.
- 점수: 낚시 = 물고기 수(깡통 빼고), 같으면 가장 큰 cm. 풀 = 깔끔 2점, 끊김 1점(독풀 끊김 1점), 같으면 깔끔하게 뽑은 수.
- 상품: 1등 1,000원, 2등 600원, 3등 400원, 참가 150원. 대회 날마다 한 번. 그 종목에서 처음 1등이면 트로피 가구.
- 업적 둘(돈 0, 칭호만, 묶음 'life'): 「낚시 대회 우승」 칭호 「낚시 대회 우승자」, 「풀 뽑기 시합 우승」 칭호 「풀 뽑기 시합 우승자」. 업적 34개, 칭호 15개, 돈 합계 31,700원 그대로.
- 풀 뽑기 날: 풀이 6초마다 다시 자라고 자리마다 상한 1.5배. 다음 날 아침 6시에 평소대로.
- 손님: 주인 시계 기준 4시 30분 이후 새 판 금지, 5시에 하던 판 끊김. 점수 상한 낚시 40, 풀 120(넘으면 버림). 순위판은 `sendWorld`의 `ct` 키, 손님 점수는 `multi.act({ t: 'contest' })`, 등수는 `multi.direct({ t: 'prize' })`.
- 막대 과자 데이와 겹치면 광장 장식(현수막)은 막대 과자 데이가 먼저, 대회는 그대로.
- 저장: `state.contest` 하나. 잘못된 칸은 저장을 거부하지 말고 버린다.
- 줄바꿈 보존: 고치기 전에 `file`로 확인하고 CRLF 파일은 CRLF 그대로. 새 파일은 LF.
- 난이도는 반응 0.2초 늦는 사람 모델로 잰다(메모리 balance-human-delay).
- 3D 모델(접수 탁자, 단상, 트로피 둘)은 fable 5.2 서브에이전트가 만든다.
- 작업이 끝나면 확인 없이 main에 커밋하고 `git pull -q --rebase origin main && git push -q origin main`. 커밋 끝줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 한 판 도중 저장되고 다시 불러오면: 판은 저장에 남지 않고(시계 멈춤도 풀림), 그날 기록(best, rounds)은 끝난 판까지만 남아야 한다. → Task 1 `cleanContest`가 모르는 칸(`round`)을 버리는 테스트.
2. 오후 5시에 내 판이 아직 도는 중: 판이 끝나기 전에는 시상식으로 넘어가면 안 된다. → Task 1 `contestPhase(hour, roundOn)` 테스트(판 도는 중에는 'open').
3. 예전 저장(state.contest 없음)과 깨진 contest 값: 불러오기가 실패하면 안 된다. → Task 1 `isValidState` 통과와 `cleanContest` 테스트.
4. 손님이 보낸 이상한 점수(상한 초과, 소수, 음수, 문자열): 순위판에 들어가면 안 된다. → Task 1 `guestScoreOk` 테스트.
5. 들어갈 수 없는 때(기운 10 미만, 몸이 바뀜, 접수 시간 밖, 대회 날 아님, 손님 4시 30분 이후): 알맞은 까닭을 알려야 한다. → Task 1 `canEnter` 테스트.

---

### Task 1: 대회 규칙 모듈

**Files:**
- Create: `src/core/contest.js`
- Modify: `src/core/save.js` (불러온 뒤 `contest`를 `cleanContest`로 바꿔 끼우기, 검사는 늘 통과)
- Test: `tests/contest.test.mjs`

**Interfaces:**
- Produces (모두 `src/core/contest.js` export):
  - 상수 `CONTESTS = { fish: { id: 'fish', name: '낚시 대회', dow: 6, banner: '마을 낚시 대회' }, weed: { id: 'weed', name: '풀 뽑기 시합', dow: 3, banner: '마을 풀 뽑기 시합' } }`, `OPEN_HOUR = 9`, `CLOSE_HOUR = 17`, `CEREMONY_LATEST = 21`, `NPC_LAST_START = 16`, `GUEST_LAST_START = 16.5`, `ROUND_SECONDS = 180`, `ENTRY_STAMINA = 10`, `FIRST_DAY = 3`, `PRIZE = { 1: 1000, 2: 600, 3: 400, join: 150 }`, `SCORE_CAP = { fish: 40, weed: 120 }`, `WEED_BOOST = { regrow: 6, cap: 1.5 }`, `CONTEST_FRIENDS = ['chiikawa', 'hachiware', 'usagi', 'kurimanju', 'rakko', 'momonga']`, `TROPHY = { fish: 'fishtrophy', weed: 'weedtrophy' }`
  - `contestKindOn(startISO, day) → 'fish' | 'weed' | null`
  - `contestPhase(hour, roundOn) → 'before' | 'open' | 'ceremony' | 'closed'` (9시 전 before, 9 ~ 17 open, 판이 돌면 시각과 상관없이 open, 17 ~ 21 ceremony, 21 이후 closed)
  - `contestOf(state) → { day, kind, best, rounds, npc, rank, first, got, wins }` (없으면 `{ day: 0, kind: null, best: null, rounds: 0, npc: {}, rank: null, first: false, got: false, wins: { fish: 0, weed: 0 } }`)
  - `beginContestDay(state, day, kind) → state` (그날 기록을 새로, wins는 그대로. 이미 그날이면 그대로)
  - `newRound(kind) → { kind, s: 0, t: 0, clean: 0 }`
  - `roundCatch(round, { junk, cm }) → round` (junk면 그대로, 아니면 s+1, t = max(t, cm))
  - `roundPull(round, result) → round` ('clean' s+2, clean+1, t = clean / 'snapped' s+1 / 그 밖은 그대로)
  - `better(a, b) → boolean` (a가 b보다 높다: s 큰 쪽, 같으면 t 큰 쪽. b가 null이면 true)
  - `recordRound(state, { s, t }) → state` (rounds+1, best는 더 나은 쪽)
  - `canEnter(state, { hour, kind, swapped, guest }) → { ok, reason }` reason: 'day' | 'hour' | 'stamina' | 'swap' | 'late'(손님 4시 30분 이후)
  - `npcRecord(startISO, day, kind, who, myGrade) → { s, t }` (Task 2에서 솜씨표를 채운다. 여기서는 날짜, 종목, 친구로 늘 같은 값을 뽑는 틀과 시드)
  - `npcJoinHour(startISO, day, who) → number` (OPEN_HOUR 이상 NPC_LAST_START 미만, 날짜와 친구로 늘 같다)
  - `rankBoard(entries) → [{ ...entry, rank }]` entries = `[{ who, s, t }]`, `better` 순서, s와 t가 같으면 같은 등수
  - `settleContest(state, guests = []) → state` (내가 한 판이라도 했으면 me + npc + guests로 rank, 1등이면 wins[kind]+1, 그때 wins가 1이 되면 first = true. 안 했으면 rank null인 채로 got = true(끝남 표시). 이미 정했으면 그대로)
  - `prizeOf(rec) → { money, trophy }` (rank 1 ~ 3이면 PRIZE[rank], 4 이상이면 PRIZE.join, 안 했으면 0. first면 trophy = TROPHY[kind])
  - `claimContestPrize(state) → { ok, state, money, trophy, reason }` reason: 'none'(안 함) | 'notyet'(rank 없음) | 'done'(받음). 트로피는 `home.owned`에 +1(업적 기념 가구와 같은 방식).
  - `guestScoreOk(kind, s, t) → boolean` (s 정수, 0 이상, SCORE_CAP[kind] 이하. t는 0 이상 유한수, 풀이면 정수이고 t ≤ s / 2)
  - `cleanContest(c) → object | undefined` (아는 칸만, 잘못된 값은 기본값, 모르는 kind는 null, 모르는 친구 kind는 npc에서 뺌)
  - `bannerText(state) → string | null` (Task 4에서 쓴다: 막대 과자 데이면 '막대 과자 데이', 대회 날 6시 ~ 자정이면 CONTESTS[kind].banner, 아니면 null)

- [ ] **Step 1: Write the failing tests** (`tests/contest.test.mjs`)

```js
test('대회 날: 토요일 낚시, 수요일 풀, 3일째부터', () => {
  assert.equal(contestKindOn('2026-10-01', 3), 'fish');   // 10/3(토)
  assert.equal(contestKindOn('2026-10-01', 7), 'weed');   // 10/7(수)
  assert.equal(contestKindOn('2026-10-01', 4), null);
  assert.equal(contestKindOn('2026-10-01', 42), 'weed');  // 11/11(수), 막대 과자 데이와 겹쳐도 연다
  assert.equal(contestKindOn('2026-10-07', 1), null);     // 수요일이지만 3일째 전
});
test('대회 시각: 판이 돌면 5시가 넘어도 open', () => {
  assert.equal(contestPhase(8.9, false), 'before');
  assert.equal(contestPhase(9, false), 'open');
  assert.equal(contestPhase(17, false), 'ceremony');
  assert.equal(contestPhase(17.2, true), 'open');
  assert.equal(contestPhase(21, false), 'closed');
});
// 한 판 점수(깡통 빼기, 깔끔 2점 끊김 1점, better), 기록(recordRound 두 번: 가장 좋은 판만, rounds 2),
// canEnter(까닭 다섯), 등수와 상품(한 번만, 참가상, 처음 1등만 트로피, 안 했으면 'none'),
// npcRecord와 npcJoinHour가 날짜로 늘 같고 범위 안, guestScoreOk(아래), 저장 정리(아래), bannerText(아래)
test('손님 점수 확인', () => {
  assert.ok(guestScoreOk('fish', 12, 44));
  for (const [k, s, t] of [['fish', 41, 10], ['weed', 121, 10], ['fish', 2.5, 10], ['fish', -1, 0], ['fish', '9', 1], ['weed', 10, 6]]) assert.ok(!guestScoreOk(k, s, t));
});
test('저장 정리: 예전 저장, 깨진 값, 모르는 칸', () => {
  const s = { ...createState({ name: '나', look: {} }), tutorial: 'done' };
  assert.ok(isValidState(s));
  const bad = { ...s, contest: { day: 3.5, kind: 'ramen', npc: { rakko: { s: 3, t: 1 }, goblin: { s: 1, t: 0 } }, round: { s: 5 }, wins: { fish: -1 } } };
  assert.ok(isValidState(bad));
  const c = cleanContest(bad.contest);
  assert.equal(c.kind, null); assert.ok(!('round' in c)); assert.ok(!('goblin' in c.npc)); assert.equal(c.wins.fish, 0);
});
test('현수막 글: 막대 과자 데이가 먼저', () => {
  // day 42(11/11) 낮 → '막대 과자 데이', day 3 낮 → '마을 낚시 대회', day 4 → null, day 3 새벽 5시 → null
});
```

- [ ] **Step 2: Run** `node --test tests/contest.test.mjs` — Expected: FAIL (모듈 없음).
- [ ] **Step 3: Implement** `src/core/contest.js`. 날짜 시드는 FNV-1a(`season.js`의 `roll`과 같은 방식, 키 `${startISO}#${day}#ct#${kind}#${who}`). save.js는 불러오는 함수(파일을 읽고 그 자리)에서 `contest`를 `cleanContest`로 바꿔 끼우고, `isValidState`는 contest 때문에 거부하지 않는다.
- [ ] **Step 4: Run** `node --test tests/contest.test.mjs`와 전체 `node --test tests/*.test.mjs` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: contest rules module ...`

### Task 2: 친구 솜씨표와 난이도 시뮬레이션

**Files:**
- Modify: `src/core/contest.js` (`NPC_SKILL`, `WEED_GRADE_SCALE`, `npcRecord` 본문)
- Test: `tests/contestbalance.test.mjs`

**Interfaces:**
- Consumes: Task 1 `npcRecord`, `rankBoard`, `better`, `newRound`, `roundCatch`, `roundPull`, `CONTEST_FRIENDS`, `SCORE_CAP`.
- Produces: `NPC_SKILL = { fish: { [who]: { mean, sd } }, weed: { [who]: { mean, sd } } }`, `WEED_GRADE_SCALE = { [grade]: number }`(NOVICE ~ 1). `npcRecord`가 이 표로 { s, t }를 낸다(s는 정규분포 반올림, 0 이상 SCORE_CAP 이하 정수. 낚시 t는 그 판에 낚았을 법한 가장 큰 cm, 풀 t는 깔끔하게 뽑은 수로 s에서 어림하되 t ≤ s / 2).

- [ ] **Step 1: Write the simulation test**
  - 사람 모델(낚시): 던지기 0.6초 → 입질 `BITE_WAIT` → 반응(보통 0.2초, 익숙 0.12초)이 그 크기의 `SIZE_RULES[size].window` 안이면 끌어올리기 → `startReel`/`stepReel`을 늦게 보는 조종(tests/fishing.test.mjs의 `play()`와 같은 방식: 보통 { delay: 0.2, k: 0.12, every: 0.08 }, 익숙 { delay: 0.12, k: 0.22, every: 0.05 })으로 끝까지 → 낚으면 1초 쉬고 다음. 물은 'pond', 12시, 맑음. 180초 동안 `roundCatch`.
  - 사람 모델(풀): 풀 사이 걷기 2.0초, 'weed' 종류를 `startPull(kind, { grade })` → `chargePull`을 1/60초씩, 늦게 본 힘(delay)이 초록 칸 가운데쯤일 때 떼기 → `releasePull` → `advanceWeed` → 다 뽑으면 `roundPull`. 180초.
  - 단언(시드 고정, 200 대회):
    - 한 판만 한 보통 사람(제초 견습과 3급 각각): 3등 안 비율 0.35 ~ 0.65, 1등 비율 0.10 ~ 0.30.
    - 익숙한 사람: 1등 비율 0.40 이상.
    - 친구끼리만 겨룬 대회에서 랏코 1등 비율 0.5 미만, 1등을 한 번이라도 한 친구가 셋 이상.
    - `npcRecord`의 s는 늘 0 이상 SCORE_CAP 이하 정수, 풀 t ≤ s / 2.
- [ ] **Step 2: Run** `node --test tests/contestbalance.test.mjs` — Expected: FAIL(솜씨표가 비어 있다).
- [ ] **Step 3: Fill `NPC_SKILL`, `WEED_GRADE_SCALE`** — 시뮬레이션으로 보통 사람 평균, 표준편차를 재고 설계서 5절 순서(낚시: 랏코, 쿠리만쥬 상 / 하치와레, 우사기 중, 우사기 sd 큼 / 치이카와, 모몽가 하. 풀: 랏코, 우사기 상 / 쿠리만쥬, 하치와레 중 / 치이카와, 모몽가 하)를 지키며 단언을 통과하게 맞춘다. 풀은 `mean × WEED_GRADE_SCALE[myGrade]`(내 급수의 보통 사람 평균 ÷ 견습 평균).
- [ ] **Step 4: Run** 전체 테스트 — Expected: PASS.
- [ ] **Step 5: Commit** `balance: contest friend skill tables ...` (본문에 보통, 익숙 사람의 1등, 3등 안 비율)

### Task 3: 업적 둘, 트로피 가구, 대회 소품 모델

**Files:**
- Modify: `src/core/achieve.js` (업적 둘), `tests/achieve.test.mjs` (34개, 15칭호), `tests/achart.test.mjs` (gold 15)
- Modify: `src/core/home.js` (FURNITURE `fishtrophy` 「낚시 대회 트로피」, `weedtrophy` 「풀 뽑기 시합 트로피」: price 0, cat 'deco', gift true), `src/world/interior.js` (`furnitureModel` case 둘)
- Create: `src/world/contestprops.js`

**Interfaces:**
- Consumes: Task 1 `contestOf(state).wins`.
- Produces: 업적 id `contestFish`, `contestWeed`(group 'life', money 0, need 1, progress `contestOf(s).wins.fish`/`.weed` 가 1 이상이면 1). `createContestProps(scene, village) → { setDesk(on), setPodium(on), podiumSpots() → [{ x, z, y }, { x, z, y }, { x, z, y }] (1등, 2등, 3등 자리) }`. 접수 탁자는 게시판 옆 빈 곳(`village.nearestFree`), 단상은 광장 가운데 남쪽. 켜고 끌 때 장애물도 같이(festival.js처럼).

- [ ] **Step 1: Failing tests** — achieve.test: 34개, 칭호 15개(TITLES에 둘 더함), 돈 31,700 그대로, wins.fish 1이면 'contestFish' 이룸, 'contestWeed'는 아님. achart.test: gold 15. balance.test의 가구 모델 검사는 `case 'fishtrophy'`가 없어서 실패.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: fable 5.2 서브에이전트에 모델링** — 트로피 둘(금빛 컵, 낚시는 컵 위 물고기, 풀은 잎 둘), 접수 탁자(천 덮인 작은 탁자 + 세운 표지판, 글 「대회 접수」는 canvas 질감, festival.js의 글씨 방식), 단상(세 칸, 가운데가 가장 높고 앞면에 1 2 3). 툰 재질은 `render/toon.js`의 `toonMesh`, `GEO`. 업적 기념 가구(dexplaque 등) 모델 코드를 본보기로.
- [ ] **Step 4: 업적, 가구 정의** — 위 Interfaces 대로.
- [ ] **Step 5: Run** 전체 테스트 — PASS. 브라우저에서 트로피 둘이 집 꾸미기 미리보기에 보이는지.
- [ ] **Step 6: Commit**

### Task 4: 대회 날 진행(장식, 알림, 풀 늘리기, 마감)

**Files:**
- Modify: `src/world/festival.js` (`setOn(on, text = '막대 과자 데이')`: 글이 바뀌면 현수막 질감을 다시 그린다)
- Modify: `src/world/weeds.js` (`setBoost(on)`: on이면 다시 자라는 간격 `WEED_BOOST.regrow`초, 자리마다 상한 `Math.ceil(n × WEED_BOOST.cap)`)
- Modify: `src/main.js` (`updateContestDay()`를 0.3초마다 축제 장식을 고치던 자리에서 부른다)
- Modify: `src/core/villagetalk.js` (newsLine에 'contestEve', 'contestWin' 문구)

**Interfaces:**
- Consumes: Task 1 `contestKindOn`, `contestOf`, `beginContestDay`, `contestPhase`, `settleContest`, `bannerText`, `CONTESTS`. Task 3 `createContestProps`.
- Produces: main.js 안 `updateContestDay()`, 메모리 `contestUi = { eveDay, morningDay }`.

- [ ] **Step 1: Implement**
  - 전날 저녁 6시 이후(다음 날이 대회 날): 한 번 `hud.toast('내일은 마을 낚시 대회!')`와 `happen({ type: 'contestEve', kind })`.
  - 대회 날 6시 이후 처음: `commit(beginContestDay(...))`, `hud.banner(CONTESTS[kind].name, '오전 9시부터 노동 갑옷 씨에게 접수해요')` 한 번.
  - 장식: `festival.setOn(!!bannerText(state), bannerText(state))`(막대 과자 데이 장식을 켜던 자리와 하나로), 접수 탁자 `props.setDesk(대회 날)`, 풀 날이면 `weeds.setBoost(true)` 아니면 false. 손님일 때는 지금처럼 끈다.
  - 오후 5시(`contestPhase === 'ceremony'`이고 판이 없고 아직 정리 전): Task 7의 `startCeremony()`를 부를 수 있으면 부르고, 못 부르는 상태가 9시까지 이어지면 `commit(settleContest(state, guests))` + 토스트 「대회 결과는 노동 갑옷 씨에게 들어요」.
- [ ] **Step 2: Run** 전체 테스트, 브라우저: `__town.patch({ clock })`로 대회 전날 6시, 당일 6시, 오후 5시를 보고 장식, 현수막 글, 풀 늘어남, 알림을 확인. 11/11(day 42)은 현수막이 막대 과자 데이.
- [ ] **Step 3: Commit**

### Task 5: 내 한 판(접수, 시계 멈춤, 점수, 끝내기)

**Files:**
- Modify: `src/main.js` (`talkTo` 노동 갑옷 씨 선택지, `contestRound`, `fishOption`, `beginFish`, `fishCatch`, `endPull`, play 모드 시계 진행, HUD)

**Interfaces:**
- Consumes: Task 1 `canEnter`, `newRound`, `roundCatch`, `roundPull`, `recordRound`, `ROUND_SECONDS`, `ENTRY_STAMINA`, `CONTESTS`.
- Produces: main.js 안 `let contestRound = null` (`{ kind, s, t, clean, left, guest }`), `startRound()`, `finishRound(why)`, `contestTick(dt)`.

- [ ] **Step 1:** 노동 갑옷 씨 선택지: 대회 날 open이면 「대회 나가기」(`canEnter` 까닭별 토스트: 「기운이 모자라요(10 필요)」, 「접수는 오전 9시부터 오후 5시까지예요」, 「몸이 바뀐 동안에는 못 나가요」, 「오늘 접수는 끝났어요」), 「순위판 보기」(Task 7), 판 도는 중이면 「그만하기」, 상품이 기다리면 「상품 받기」(Task 7).
- [ ] **Step 2:** `startRound()`: 기운 10 쓰기, `contestRound = { ...newRound(kind), left: ROUND_SECONDS, guest: !!visiting }`, 배너 「시작!」.
- [ ] **Step 3:** 시계: play 모드의 시계 진행 줄(잠 아닐 때 흐르는 곳)에 `&& !(contestRound && !contestRound.guest)`.
- [ ] **Step 4:** 낚시: 판 도는 중 종목이 fish면 낚싯대가 없어도 '낚싯대 펼치기'(`fishOption`), `beginFish`는 기운을 쓰지 않는다. `fishCatch`는 판 도는 중이면 `roundCatch` + `logFish`만(가방, `noteFishCm`, `recordPull` 없이), 머리 위에 「+1」(깡통은 「깡통은 안 쳐요」).
- [ ] **Step 5:** 풀: 판 도는 중 종목이 weed면 `endPull`에서 기운을 쓰지 않고(독 포함), 다 뽑았을 때 `roundPull` + 깔끔하면 평소처럼 weedLog 기록, 가방과 일감에는 넣지 않는다. 「+2」나 「+1」.
- [ ] **Step 6:** `contestTick(dt)`: left를 줄이고 `hud.setTimer`로 종목 이름, 남은 시간, 이번 판 점수, 그날 가장 좋은 기록(좁으면 숨김). left ≤ 0, 기절, 잠, 이야기 장면, 놀러 가기와 돌아오기 → `finishRound(why)`.
- [ ] **Step 7:** `finishRound`: 주인이나 혼자면 `commit(recordRound(...))`, 손님이면 Task 8의 `multi.act`. 결과 배너(「5마리! 오늘 가장 좋은 기록」), 타이머 숨김.
- [ ] **Step 8: Run** 전체 테스트, 브라우저: 낚싯대 없는 저장으로 대회 날 9시 → 접수 → 시계 멈춤(`__town.state.clock.t` 그대로), 판 안 기운 그대로, 가방에 물고기 없음, 3분 뒤 기록.
- [ ] **Step 9: Commit**

### Task 6: 친구들의 참가

**Files:**
- Modify: `src/main.js` (`lifeDecide` 앞부분, 친구 낚시와 풀 걸음 재사용, `setDoing` 「대회 중」)

**Interfaces:**
- Consumes: Task 1 `npcJoinHour`, `npcRecord`, `NPC_LAST_START`, `CONTEST_FRIENDS`, `ROUND_SECONDS`. Task 2 솜씨표.
- Produces: main.js 안 `contestNpc = new Map()` (kind → { until }), `npcContest(n)`.

- [ ] **Step 1:** 대회 날 open이고 그 친구가 아직 참가 안 했고(`contestOf(state).npc[kind]` 없음) 시각이 `npcJoinHour` 이상이고 `isFree(n)`이면 `npcContest(n)`: 낚시면 대회 낚싯대로(`hasRod` 없이) `npcFishHobby`와 같은 걸음으로 가까운 물가에서 ROUND_SECONDS 동안, 풀이면 가까운 풀로 걸어가 뽑기(풀 일감 단계 재사용, 일감은 아님). `setDoing(kind, 'fish' | 'leaf', '대회 중')`.
- [ ] **Step 2:** 끝나면 `commit({ ...state, contest: { ...rec, npc: { ...rec.npc, [kind]: npcRecord(start, day, kind, who, myWeedGrade) } } })`, 가까우면 한마디.
- [ ] **Step 3:** 4시가 지나도 못 했으면 그날 기록 없음. 몸이 바뀐 동안에도 친구들은 참가한다.
- [ ] **Step 4: Run** 전체 테스트, 브라우저: 9시 ~ 4시를 빨리 감으며 친구들이 물가로 가고 순위판에 하나씩 오르는지.
- [ ] **Step 5: Commit**

### Task 7: 순위판, 시상식, 상품 받기

**Files:**
- Create: `src/stories/contest.js` (`createContestCeremony(ctx)`, stickday.js와 같은 ctx)
- Modify: `src/ui/panels.js` (순위판 창 `openContestBoard()`와 마을폰 앱 '대회'), `index.html` (순위판 CSS), `src/main.js` (시상식 시작, 상품 받기, 순위판 데이터)

**Interfaces:**
- Consumes: Task 1 `rankBoard`, `settleContest`, `prizeOf`, `claimContestPrize`, `CONTESTS`. Task 3 `props.setPodium`, `podiumSpots`. Task 8 손님 목록(없으면 빈 배열).
- Produces: main.js 안 `contestBoard() → { kind, day, open, rows: [{ who, name, s, t, rank, me, guest, yet }] }`, `startCeremony()`, `claimPrize()`. panels: `openContestBoard()`는 `handlers.contestBoard()`로 받아 그린다.

- [ ] **Step 1:** 순위판: 이름, 점수(「9마리」/「14점」), 가르는 값(「가장 큰 것 44cm」/「깔끔 6」), 아직 안 한 친구는 「아직」. 마을폰 앱 '대회': 대회 날이면 순위판, 아니면 다음 대회 날짜와 종목, 내 우승 수.
- [ ] **Step 2:** 시상식: 내가 마을 안(play 모드)이고 잠, 기절, 이야기 장면, 친구 집이 아니면 `startCeremony()` — `settleContest` 먼저, 친구들을 `ctx.summon`으로 광장에 모으고, 1 ~ 3등이 단상 자리로(나면 나도), 나머지는 둘레에서 'cheer', `confetti.burst`, 배너로 1 ~ 3등과 내 등수, 내 상품 바로 받기(`claimContestPrize`) → 돈 칩, 트로피면 「집 상자에 넣었어요」. 끝나면 단상 끄고 친구들 풀어 주기(`staged.delete`).
- [ ] **Step 3:** 놓친 경우: Task 4의 정리 뒤 노동 갑옷 씨 「상품 받기」로 같은 `claimContestPrize`.
- [ ] **Step 4: Run** 전체 테스트, 브라우저: 5시 시상식(스크린샷), 놓친 날 상품 받기, 순위판 창과 마을폰 앱.
- [ ] **Step 5: Commit**

### Task 8: 같이 놀기 손님

**Files:**
- Modify: `src/main.js` (`takeGuestAct` 'contest', 마을 모습 `w.ct`, `takeWorld`의 `ct`, `takeDirect` 'prize', 손님 판 시작과 끊김)
- Modify: `src/core/contest.js` (`guestPrize(state, kind, rank) → { state, money, trophy }`), `tests/contest.test.mjs`

**Interfaces:**
- Consumes: Task 1 `guestScoreOk`, `canEnter`(guest: true), `rankBoard`, `GUEST_LAST_START`. Task 5 `startRound`/`finishRound`. Task 7 `contestBoard`.
- Produces: 주인 메모리 `contestGuests = new Map()` (연결 id → { name, s, t }), `w.ct = { k, d, o, b: [[이름, s, t, 종류('me' | 'npc' | 'guest'), rank]] }` (12줄까지), 손님 `visiting.contest`.

- [ ] **Step 1: Failing test** — `guestPrize`: rank 1이면 1,000원 + wins+1 + 처음이면 트로피, rank 5면 150원, rank 1을 두 번째 받으면 트로피 없음.
- [ ] **Step 2:** 손님 판: 노동 갑옷 씨 선택지는 `visiting.contest`(주인이 보낸 ct)로 열려 있는지 본다. 주인 시각 4시 30분 이후면 'late'. 판 끝(또는 주인 시각 5시)에 `multi.act({ t: 'contest', k, s, t })`.
- [ ] **Step 3:** 주인: `takeGuestAct`에서 `guestScoreOk`와 오늘 종목 확인, 그 손님 최고 기록만 `contestGuests`에. 1초 블록에서 `w.ct`. 대회 날이 바뀌면 비운다.
- [ ] **Step 4:** 시상식(주인): 등수에 손님을 넣고, 남아 있는 손님에게 `multi.direct(id, { t: 'prize', k, rank })`. 손님 `takeDirect` 'prize': `guestPrize`로 commit, 배너.
- [ ] **Step 5: Run** 전체 테스트, 시험 서버 5299(스크래치 townsrv, 배경 실행 후 TaskStop)로 주인과 손님 두 탭 확인. 사용자 서버(5280)는 건드리지 않는다.
- [ ] **Step 6: Commit**

### Task 9: 마무리(최종 리뷰, 노션, 게시)

- [ ] **Step 1:** fable 5.2 서브에이전트로 브랜치 전체 리뷰(시작 커밋..HEAD), 중요 문제만 고치기(각각 실패 테스트 먼저).
- [ ] **Step 2:** 노션 돈 버는 방법 페이지에 「마을 대회 (게임 오리지널)」 절(요일, 시각, 한 판 규칙, 상품, 트로피), 업적 표 두 줄, 추천 순서 한 줄. 값은 코드에서. 서브에이전트로 다시 읽어 확인.
- [ ] **Step 3:** 아티팩트 게시(live version.json 먼저 읽고, 바뀐 파일과 새 파일 전부 + version.json, page는 index.html).
- [ ] **Step 4:** 계획 작업 폴더 지우기, 최종 보고.
