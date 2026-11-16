# 도감과 업적 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 쌓이는 기록으로 업적 32개를 판단해 마을폰 「업적」 앱에서 보상(돈, 칭호, 기념 가구)을 받고, 고른 칭호가 내 정보 칸과 같이 놀기 친구 화면에 보이게 한다.

**Architecture:** 업적 정의와 판단, 이루기, 받기, 칭호, 새 기록(눈사람, 단풍잎, 현상금)은 three 없는 `src/core/achieve.js` 에 두고 node 시험으로 확인한다. `main.js` 가 1초마다 판단하고 배너를 띄우며, `ui/panels.js` 가 업적 앱을, `ui/hud.js` 가 칭호 띠를, `net/remote.js` 가 친구 머리 위 칭호를 그린다. 기념 가구 셋은 `core/home.js` 의 선물 가구로 두고 모델은 fable 5.2가 만든다.

**Tech Stack:** Three.js ES modules(빌드 없음), node:test.

**Spec:** `docs/Dex-Achievements-2026-11-16.html`

## Global Constraints

- 업적 32개, 묶음 여섯(도감, 토벌, 친구, 생활, 계절, 이야기), 이름과 조건과 보상은 설계서 2절 표 그대로. 돈 합계 31,700원.
- 칭호 13개: 몬스터 척척박사, 낚시 명인, 마을 도감 박사, 현상금 사냥꾼, 마을의 수호자, 모두의 친구, 아노코 단짝, 풀 뽑기 달인, 마을 가꾸미, 눈사람 장인, 사계절 주민, 바위산의 영웅, 이야기 수집가.
- 기념 가구 3개: 반짝 도감 상패(마을 도감 박사), 다섯 보스 기념 방패(마을의 수호자), 우정 사진 액자(모두의 친구). 가게에서 팔지 않음, 바닥 한 칸, 받으면 `home.owned` 에 +1.
- 몬스터 수는 `MONSTER_ORDER` 에 든 종류만 센다(연습용 허수아비 `dummy` 제외).
- 새로 세는 기록 셋(이번 판부터): 눈사람(세운 순간), 단풍잎(주운 순간), 현상금(받은 순간).
- 낚시 도감 보상은 그대로, 업적 「낚시 명인」은 돈 없이 칭호만.
- 화면 글에 가운뎃점(·)을 쓰지 않는다. 기념 가구 모델은 fable 5.2로.
- 배너는 대화창, 이야기 장면, 첫날 안내가 끝난 뒤. 예전 저장은 알림 하나로 묶는다.

## Review Focus

1. 예전 저장(허수아비 50마리, 이미 이룬 업적 여럿): 불러올 때 배너가 쏟아지지 않고 알림 하나, 허수아비는 몬스터 수에 들지 않는다 → Task 1 시험(`hunted.dummy`), Task 4 브라우저.
2. 받기를 두 번 누르거나 아직 못 이룬 업적의 받기: 돈과 가구가 한 번만 → Task 1 시험.
3. 같이 놀기 손님 중의 업적: 내 저장으로 이루고 받을 수 있고 주인 마을 저장은 바뀌지 않는다 → Task 4 브라우저.
4. 저장의 칭호가 받지 않은 업적이거나 친구가 보낸 칭호가 이상한 값(긴 글, 글자가 아닌 값): 저장은 거르고 친구 칭호는 무시 → Task 1 시험(`isValidState`), Task 5 시험(`titleFromLook`, core/achieve.js).
5. 휴대폰: 1초마다 판단해도 새로 이룬 것이 없으면 저장을 새로 만들지 않는다(같은 객체) → Task 1 시험.

---

### Task 1: 업적 규칙 모듈과 저장 검사

**Files:**
- Create: `src/core/achieve.js`
- Modify: `src/core/season.js`(`seasonsSeen`), `src/core/home.js`(기념 가구 셋), `src/core/save.js`(검사 셋)
- Test: `tests/achieve.test.mjs`

**Interfaces — Produces:**
- `ACH_GROUPS = [{ id: 'dex', name: '도감' }, { id: 'hunt', name: '토벌' }, { id: 'friend', name: '친구' }, { id: 'life', name: '생활' }, { id: 'season', name: '계절' }, { id: 'story', name: '이야기' }]`
- `ACHIEVEMENTS`: `[{ id, group, name, goal, need, money, title?, furniture?, progress(state) → number }]`. id 와 need: dexMon10 10, dexMonAll 20, dexWeed5 5, dexWeedAll 10, dexFishAll 14(`DEX_FISH.length`), dexAll 3, hunt10 10, hunt100 100, hunt500 500, bosses3 3, bounty5 5, bossAll 5, friend5 5(여섯 친구 중 가장 많은 하트), friendsAll3 6, friendsAll5 6, anokoHeart5 5(`bondHearts`), grade1 1, licenses3 3, house 1, bigHouse 2(`sizeOf(state.home)`), works7 7(`workStatus === 'open'`), car 1(`hasTool(state, 'car')`), days100 100(`clock.day`), snowmen5 5, leaves30 30, loach 1, snowball10 10(`hunted.snowball`), seasons4 4, story1 1(`isDone(state, 'story')`), story2 1(`isDone(state, 'anoko')`), requests 19(메인, 사이드, 일상이 아닌 퀘스트), sides 16(`side: true`).
- 보스: bosses3 = `bossesOf(state)` 의 bigmole, elder, bigcrab 중 `down` 있는 수. bossAll = bosses3 + `state.story.bossDown` + (`tamed(state)` 또는 `hunted.anoko > 0`).
- 여섯 친구: chiikawa, hachiware, usagi, kurimanju, rakko, momonga — `hearts(state.friends[k])`(없으면 0).
- `FURNITURE` 키: `dexplaque`(반짝 도감 상패), `bossshield`(다섯 보스 기념 방패), `friendframe`(우정 사진 액자) — `{ price: 0, gift: true, cat: 'deco' }`.
- `progressOf(state, id) → { have, need, done }`(have 는 need 를 넘지 않는다)
- `checkAchievements(state) → { state, newly: [id] }` — 새로 이룬 업적에 `{ day: clock.day }` 를 적는다. 새로 이룬 것이 없으면 받은 state 그대로(같은 객체).
- `claimAchievement(state, id) → { ok, state, money, title, furniture, reason? }` — reason `'none' | 'notyet' | 'got'`.
- `unclaimedCount(state) → number`, `titlesOf(state) → [{ id, title }]`(받은 업적 중 칭호 있는 것), `setTitle(state, id | null) → state`(받은 칭호만), `titleOf(state) → string | null`.
- `addRecord(state, key, n = 1) → state` — key `'snowmen' | 'leaves' | 'bounty'`.
- `isValidAchieve(a)`, `isValidRecords(r)` — save.js 가 쓴다. 칭호 검사는 save.js 에서 `title` 이 받은 업적의 칭호인지.
- `season.js`: `seasonsSeen(startISO, day) → string[]`(1일째부터 day 까지 나온 계절, 중복 없이).
- 저장 칸: `state.achieve = { [id]: { day, got?: true } }`, `state.records = { snowmen?, leaves?, bounty? }`, `state.title = id | null`.

- [ ] Step 1: 시험 — 32개 id 가 겹치지 않고 묶음 여섯이 다 쓰인다; 돈 합계 31,700; 칭호 13개(위 목록 그대로); 가구 셋이 `FURNITURE` 에 `gift: true` 로 있다; 이름, 조건, 칭호에 「·」가 없다; 새 게임은 아무것도 이루지 않았다; `hunted = { fluff: 9, dummy: 50 }` 이면 hunt10 미달, `fluff: 10` 이면 이룸; 몬스터 도감 19종이면 dexMonAll 미달, 20종(눈뭉치 포함)이면 이룸; `seasonsSeen('2026-10-01', 243).length === 3`, `244` 에서 4; 경계값마다 이루기 직전과 직후(예: 하트 4 → 5, 날 99 → 100, 단풍잎 29 → 30); `checkAchievements` 가 이룬 날을 적고 두 번째 부르면 같은 객체; `claimAchievement` 가 돈을 한 번만 주고 두 번째는 `got`, 못 이룬 것은 `notyet`; 칭호 받기 뒤 `setTitle`/`titleOf`, 받지 않은 칭호는 `setTitle` 이 무시; 가구 받기 뒤 `home.owned.dexplaque === 1`; dexFishAll 의 money 0; `isValidState` 가 칸 없는 예전 저장과 새 저장을 받고, 모르는 id, 음수 기록, 받지 않은 업적의 `title` 을 거른다.
- [ ] Step 2: 실패 확인 → Step 3: 구현 → Step 4: 통과와 전체 시험(`node --test tests/*.test.mjs`) → Step 5: 커밋.

### Task 2: 새로 세는 기록 셋

**Files:** Modify `src/core/seasonplay.js`(`pickLeaf` 성공 시 `addRecord(…, 'leaves')`, `addSnowman` 이 `addRecord(…, 'snowmen')`), `src/core/bounty.js`(`claimBounty` 성공 시 `addRecord(…, 'bounty')`)
- Test: `tests/season.test.mjs`, 현상금 시험이 있는 파일(없으면 `tests/achieve.test.mjs`)

**Interfaces:** Consumes `addRecord` (Task 1).

- [ ] Step 1: 시험 — 단풍잎 주우면 `records.leaves` +1, 같은 자리 두 번째(실패)는 그대로; 눈사람 여섯 번 세우면 `records.snowmen === 6`(다섯 개만 남아도 수는 6); 현상금 받기 성공 시 `records.bounty` +1, 이미 받은 날 두 번째는 그대로.
- [ ] Step 2~5: 실패 확인, 구현, 통과, 커밋.

### Task 3: 기념 가구 모델 (fable 5.2)

**Files:** 가구 모델을 그리는 곳(`src/world/interior.js` 의 가구별 분기, 예: `case 'anokodoll'`)과 가구점, 상자 썸네일이 그 모델을 쓰는지 확인.

- [ ] Step 1: fable 에이전트에게 세 모델을 맡긴다(설계서 5절의 모습, 바닥 한 칸, 다른 가구와 같은 크기 감). Step 2: `node --input-type=module --check`, 집 안에 셋을 놓은 사진으로 확인. Step 3: 커밋.

### Task 4: 업적 앱, 배너, 칭호 띠 연결

**Files:** Modify `src/main.js`(1초 판단, 배너 줄, 예전 저장 알림, 받기와 칭호 처리기, 마을폰 강조), `src/ui/panels.js`(`achieve` 앱: 맨 위 칭호 달기, 묶음별 카드, 진행 `12 / 20`, 보상 칩, 받기), `src/ui/hud.js`(`setTitle(text | null)` 칭호 띠), `index.html`(띠와 앱 모양)

**Interfaces:** Consumes Task 1 의 모든 함수. Produces `hud.setTitle(text | null)`, 처리기 `claimAchievement(id)`, `setTitle(id | null)`.

- 판단: 놀이(`play`, 손님 포함)와 집 안(`home`)에서 1초마다 `checkAchievements`. 불러온 뒤 첫 판단의 `newly` 는 배너 대신 알림 하나(「이미 이룬 업적이 N개 있어요! 마을폰 업적 앱에서 받아요」, 첫날 안내가 끝난 뒤). 그 뒤 `newly` 는 줄에 넣고 대화창, 이야기 장면, 첫날 안내가 아닐 때 하나씩 `hud.banner('업적을 이뤘어요!', 이름)`.
- 받을 것이 있으면 마을폰 버튼이 빛나고 업적 앱이 강조된다(기존 `appNudge` 방식). 앱 목록에서 몬스터 도감 다음.
- 받기: 돈 소리, 받은 돈 칩, 가구는 「집 상자에 넣었어요」, 칭호는 「칭호를 달 수 있어요」.

- [ ] Step 1: 브라우저 RED — 마을폰에 업적 앱이 없다.
- [ ] Step 2: 구현.
- [ ] Step 3: 브라우저 GREEN — 예전 저장 불러오기에서 알림 하나와 배너 없음; 단풍잎 30장째에 배너; 받기로 돈 한 번; 칭호 달기와 띠; 기념 가구가 집 상자에; 손님 중에도 내 업적 받기.
- [ ] Step 4: 전체 시험, 커밋.

### Task 5: 같이 놀기 칭호

**Files:** Modify `src/core/achieve.js`(`titleFromLook(look) → string | null`: 글자만, 12자로 자름 — remote.js 는 three 를 불러서 node 시험에서 못 읽으므로 core 에 둔다), `src/main.js`(보내는 모습에 `title` 을 붙인다: 처음 들어갈 때와 칭호를 바꿀 때), `src/net/remote.js`(`titleFromLook` 으로 읽어 이름 위에 `mp-title` 이름표), `index.html`(`.world-label.mp-title`)
- Test: `tests/achieve.test.mjs` — `titleFromLook`.

- [ ] Step 1: 시험 — `titleFromLook({ title: '눈사람 장인' })` 그대로, 13자 이상은 12자로, 숫자나 객체는 null, look 없음 null.
- [ ] Step 2~3: 구현, 통과.
- [ ] Step 4: 브라우저 — 시험 서버(포트 5299)로 두 화면, 칭호를 단 쪽의 이름 위에 칭호가 보이고 바꾸면 바로 바뀐다.
- [ ] Step 5: 커밋.

### Task 6: 노션, 아티팩트, 마무리 검토

- [ ] 노션 돈 버는 방법 페이지에 업적 표(묶음, 업적, 조건, 보상), 칭호, 기념 가구, 머리 안내 기준 버전. 넣은 글은 서브에이전트로 확인.
- [ ] 아티팩트에 바뀐 파일과 version.json.
- [ ] 마무리 검토(fable)와 고치기.
