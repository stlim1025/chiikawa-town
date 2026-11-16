# 아노코와 지내기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 집 앞 아노코와 쓰다듬기, 간식, 같이 달리기로 친해지고, 하트마다 반겨 주기, 털 빗기, 인형 선물과 경주, 꾸미기, 빠른 달리기가 열린다.

**Architecture:** 규칙은 three 없이 도는 `src/core/anokobond.js`(점수, 하트, 열림, 경주 보상, 저장 검사, 꾸미기 꼬리표)에 모으고 node 테스트로 지킨다. 화면 쪽은 `src/main.js`(집 앞 메뉴, 달린 거리, 꾸미기 적용), `src/world/anokohome.js`(반겨 주기), 새 `src/world/anokorace.js`(경주 고리), 모델은 `src/actors/anoko.js`와 `src/world/interior.js`(fable 5.2)가 맡는다.

**Tech Stack:** Three.js ES modules(빌드 없음), node:test.

**Spec:** `docs/Anoko-Bond-2026-11-16.html`

## Global Constraints

- 화면 글에 가운뎃점(·)을 쓰지 않는다. 쉼표, 조사, 마침표로 잇는다(코드 주석과 노션은 괜찮다).
- 모델과 동작(리본, 안장, 반겨 주기, 아노코 인형, 아이콘)은 fable 5.2로 만든다.
- 하루 상한 3점, 하트 곡선은 `HEART_AT`(3, 9, 18, 30, 45) 그대로.
- 쓰다듬기 +1, 간식 +1(빨간 열매 `berry` +2), 같이 달리기 300m +1. 행동마다 하루 한 번.
- 열림: 하트 1 반겨 주기, 2 털 빗기(아노코 솜털 120원), 3 아노코 인형 선물과 경주, 4 꾸미기(리본 6색, 안장 6색, 처음은 없음), 5 아노코 탈 때 1.15배.
- 경주: 집 앞 → 북문 → 동문 → 남문 → 서문 → 광장 → 집 앞. 고리 반지름 2.5m, 문 고리는 울타리 안쪽 2m. 2분 제한, 내리면 끝(기록 없음). 첫 완주 1,000원(기록 보상 겹치지 않음), 그 뒤 기록을 0.5초 넘게 줄이면 300원 하루 한 번.
- 같이 놀기 꾸미기 꼬리표: `'ride-anoko'` 바로 뒤 `'ak-<리본><안장>'`(예 `'ak-35'`). 받는 쪽은 `/^[a-zA-Z0-9_-]{1,20}$/` 꼬리표 4개까지만 받는다.
- 반겨 주기: 1분 넘게 떠나 있다가 7m 안으로 들어오면 한 번.
- 2장(`state.quests.anoko.done`)을 끝내지 않았으면 아노코 메뉴는 없다(지금처럼). 예전 저장에 `anokoBond` 가 없으면 0에서 시작.

## Review Focus

1. 2장을 끝내기 전 저장, 또는 `anokoBond` 가 없는 저장: 메뉴와 거리 세기가 아무것도 하지 않고 오류도 없어야 한다 → 작업 1 테스트 `bondOf on empty state`.
2. 날이 바뀐 뒤: 어제 한 행동은 다시 할 수 있고, 하루 점수와 달린 거리는 0부터 → 작업 1 테스트 `new day resets`.
3. 간식을 줄 때 가방에 그 물건이 없거나 먹을 것이 아니면 아무것도 빠지지 않는다 → 작업 1 테스트 `feed needs a food in the bag`.
4. 경주 도중 내리기, 2분 넘기기, 기절, 집으로 가기: 고리와 시간 표시가 사라지고 기록과 돈은 그대로 → 작업 5 브라우저 확인.
5. 꾸미기 꼬리표가 소품 꼬리표 넷 제한에 잘리지 않고, 예전 판 친구에게는 아노코만 보인다 → 작업 1 테스트 `decor tag`, 작업 4 브라우저 확인.

---

### Task 1: 규칙 모듈 `core/anokobond.js`

**Files:**
- Create: `src/core/anokobond.js`
- Modify: `src/core/anoko.js` (`tamed` 를 export)
- Test: `tests/anokobond.test.mjs`

**Interfaces:**
- Produces:
  - 상수 `BOND = { dayCap: 3, runGoal: 300, fluffSell: 120, speed: 1.15 }`, `UNLOCK = { greet: 1, comb: 2, race: 3, decor: 4, speed: 5 }`, `RACE = { limit: 120, first: 1000, record: 300, margin: 0.5 }`, `RIBBONS`, `SADDLES`(각 `[{ name, color }]` 6개, 화면 이름은 한국어 색 이름), `FLUFF = 'anokofluff'`, `DOLL = 'anokodoll'`.
  - `bondOf(state) → { pts, day, dayPts, pet, feed, run, comb, runDist, raceBest, raceDone, raceDay, ribbon, saddle }`(없는 칸은 0, `raceBest` 는 null).
  - `bondHearts(state) → 0..5`, `isUnlocked(state, key) → boolean`(2장 전에는 늘 false).
  - `canAct(state, act, day) → 'ok' | 'done' | 'locked'`(act: `'pet' | 'feed' | 'comb'`).
  - `pet(state, day)`, `feed(state, itemId, day)`, `comb(state, day)`, `addRun(state, meters, day)` → `{ ok, state, gained, hearts, up, unlocks: [key], reason }`(reason: `'locked' | 'done' | 'item'`). 하트 3이 되면 `home.owned.anokodoll` +1.
  - `raceFinish(state, seconds, day) → { state, reward, first, record }`.
  - `setDecor(state, ribbon, saddle) → state`(0~6, 하트 4 전에는 그대로).
  - `rideBoost(state) → 1 | 1.15`, `decorTag(state) → 'ak-35' | null`, `parseDecorTag(tags: string[]) → { ribbon, saddle } | null`, `isValidBond(b) → boolean`.
  - `registerItems({ anokofluff: { name: '아노코 솜털', kind: 'drop', sell: 120, note } })` 를 모듈 맨 위에서.

- [ ] **Step 1: 실패하는 테스트를 쓴다**(`tests/anokobond.test.mjs`)
  - `bondOf on empty state`: 2장 전 상태에서 `bondOf` 는 0들, `isUnlocked(s,'greet')` false, `pet` 은 `reason: 'locked'`.
  - `pet once a day`: 2장 끝낸 상태에서 `pet` → gained 1, 같은 날 다시 → `reason: 'done'`.
  - `day cap 3`: 같은 날 pet(1) + feed berry(2) + addRun 300(0 — 상한) → `dayPts === 3`.
  - `feed needs a food in the bag`: 가방에 없는 id → `reason: 'item'`, 가방 그대로. `berry` 1개 → gained 2, 가방 0. 다른 먹을 것(`riceball`) → gained 1.
  - `new day resets`: day 5에 pet 후 day 6에 pet 가능, `addRun` 은 day 바뀌면 `runDist` 0부터.
  - `run counts once at 300m`: 150 + 149 → gained 0, +1 → gained 1, 이후 같은 날 +500 → gained 0.
  - `hearts and unlocks`: pts 3 → 하트 1 `unlocks: ['greet']`, pts 18 → `home.owned.anokodoll === 1` 한 번만, 하트 5 → `rideBoost === 1.15`, 그 전 1.
  - `comb gives fluff`: 하트 2 전 `locked`, 이후 `bagOf(s).items.anokofluff === 1`, 같은 날 두 번째 `done`, `sellPrice('anokofluff') === 120`.
  - `race rewards`: 첫 완주 40초 → reward 1000, first true, best 40. 같은 날 39 → reward 0, best 39. 다음 날 38.4 → 300. 같은 날 다시 30 → 0, best 30. 다음 날 29.6 → 0(0.4초), best 29.6.
  - `decor tag`: 하트 4 전 `setDecor` 무시, 이후 (3,5) → `decorTag === 'ak-35'`, `parseDecorTag(['ride-anoko','ak-35','lantern'])` → `{ ribbon: 3, saddle: 5 }`, `'ak-9z'` → null, 꼬리표가 `/^[a-zA-Z0-9_-]{1,20}$/` 를 통과.
  - `isValidBond`: undefined true, 음수 pts false, ribbon 7 false.
- [ ] **Step 2: 실행해서 실패 확인** — `node --test tests/anokobond.test.mjs` → `Cannot find module`.
- [ ] **Step 3: `src/core/anokobond.js` 를 만든다.** 하트 계산은 `friends.js` 의 `HEART_AT`, `MAX_HEARTS` 를 쓴다. 2장 확인은 `core/anoko.js` 의 `tamed`(export 로 바꾼다). 가방은 `inventory.js` 의 `takeItem`, `addItem`, `countOf`, `itemInfo`(먹을 것 = `info.eat > 0`).
- [ ] **Step 4: 실행해서 통과 확인**, 이어서 전체 `node --test tests/*.test.mjs`.
- [ ] **Step 5: 커밋** `feat: Anoko bond rules ...`

### Task 2: 저장, 가구, 아이템 연결

**Files:**
- Modify: `src/core/save.js`(isValidState 에 `isValidBond(s.anokoBond)`), `src/core/home.js`(`FURNITURE.anokodoll = { id: 'anokodoll', name: '아노코 인형', price: 300, cat: 'deco', gift: true }`)
- Test: `tests/anokobond.test.mjs` 에 더한다

- [ ] **Step 1: 테스트** — `isValidState({...s, anokoBond: {pts:-1}})` false, 정상 값 true, `FURNITURE.anokodoll.gift === true`, 하트 3 선물 뒤 `isValidState` true.
- [ ] **Step 2: 실패 확인** → **Step 3: 구현** → **Step 4: 전체 테스트 통과** → **Step 5: 커밋**.

### Task 3: 모델과 그림 (fable 5.2)

**Files:**
- Modify: `src/actors/anoko.js`, `src/world/interior.js`, `src/ui/itemart.js`(아노코 솜털 그림), 가구 그림이 따로 필요하면 그 파일

**Interfaces:**
- Produces: `buildAnoko().setDecor({ ribbon: '#hex' | null, saddle: '#hex' | null })`, `animate(t, { …, greet: k })`(k 0→1, 2.4초: 일어나 꼬리를 크게 흔들고 두세 번 통통, 다시 엎드림), interior 가구 `'anokodoll'`, 아이템 그림 `'anokofluff'`.
- 기존 탈것, 집 앞, 보스 모습은 옵션이 없으면 그대로.

- [ ] **Step 1: fable 5.2 에이전트에게 맡긴다**(위 인터페이스, 안장은 `ANOKO_SEAT` 자리 아래에 맞춤, 리본은 목 옆).
- [ ] **Step 2: `node --check`** 와 브라우저에서 각 모습 확인(빈 장면에 띄워 찍기).
- [ ] **Step 3: 커밋**.

### Task 4: 집 앞 메뉴, 반겨 주기, 거리, 속도, 꾸미기 적용

**Files:**
- Modify: `src/main.js`(`talkAnokoHome`, `syncAnokoHome`, 매 프레임 거리 세기, `multi.tick` 꼬리표), `src/world/anokohome.js`(`greet()`, `setDecor`), `src/actors/player.js`(`setRiding(on, kind, boost = 1)` 와 mount `setDecor`), `src/net/remote.js`(`parseDecorTag` 로 꾸미기)

**Interfaces:**
- Consumes: 작업 1의 함수 전부, 작업 3의 `setDecor`, `greet`.
- 메뉴 순서: 쓰다듬기, 간식 주기, 털 빗기(하트 2), 경주(하트 3), 꾸미기(하트 4), 탈것 고르기(자동차가 있을 때만 두 갈래), 그만두기. 오늘 한 행동은 뒤에 「(내일 또)」. 안내 문장 「(아노코가 꼬리를 살랑살랑 흔든다) ♥♥♡♡♡」.
- 점수가 오르면 `hud.hearts`(마을 친구와 같은 모양, 이름 '아노코'), 열리면 `hud.banner('아노코와 더 친해졌어요!', <열린 것 한 줄>)`.
- 거리: 아노코를 타고 있을 때 프레임마다 움직인 거리, 한 프레임 2m 넘는 이동은 버림, 놀러 간 동안 세지 않음. 300m 를 채우면 토스트 「아노코와 300m를 달렸어요!」.

- [ ] **Step 1: 브라우저 RED** — 2장 끝낸 테스트 저장에서 집 앞 아노코 메뉴에 쓰다듬기가 없음을 확인.
- [ ] **Step 2: 구현.**
- [ ] **Step 3: 브라우저 GREEN** — 쓰다듬기, 간식(빈 가방, 열매), 털 빗기, 하트 오름과 열림 알림, 300m 달리기, 반겨 주기, 꾸미기가 탈 때와 집 앞에 보임, 하트 5 속도 7.36, 꼬리표 `'ak-35'`.
- [ ] **Step 4: 전체 테스트, 커밋**.

### Task 5: 경주 `world/anokorace.js`

**Files:**
- Create: `src/world/anokorace.js` — `createAnokoRace(scene) → { start(points), stop(), update(dt, p) → 'pass' | 'finish' | null, active, index }`(고리 메시, 다음 고리만 밝게)
- Modify: `src/main.js`(메뉴 '경주', 시간 표시 `hud.setTimer`, 끝/실패 처리, `raceFinish` 보상)

- [ ] **Step 1: 브라우저 RED** — 하트 3 저장에서 메뉴에 경주 없음.
- [ ] **Step 2: 구현** — 시작하면 저절로 아노코에 탐, 고리 지날 때 소리, 2분 넘기거나 내리거나 기절, 집으로 가기, 놀러 가기에서 멈추고 표시를 지움.
- [ ] **Step 3: 브라우저 GREEN** — 고리 순서대로 지나 완주, 첫 완주 1,000원, 같은 날 기록 경신 0원, 다음 날 0.5초 넘게 줄이면 300원, 내리면 기록 없음.
- [ ] **Step 4: 전체 테스트, 커밋, 푸시, 아티팩트(바뀐 파일과 version.json).**

### Task 6: 노션

- [ ] 돈 버는 방법 페이지: 아노코 솜털 120원, 경주 보상. 선물 페이지: 아노코 간식(빨간 열매 +2, 다른 먹을 것 +1). 퀘스트 페이지 2장 보상 줄에 「집 앞 아노코와 친해지기」 한 줄. 넣은 글은 서브에이전트로 확인.
