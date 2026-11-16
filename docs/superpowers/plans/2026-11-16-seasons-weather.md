# 계절과 날씨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게임 달력을 따라 계절이 바뀌고 아침마다 날씨(맑음, 흐림, 비, 눈)가 정해지며, 계절마다 풍경과 놀이(단풍잎, 눈사람, 발자국)와 생물(미꾸라지, 눈뭉치)이 달라진다.

**Architecture:** 계절과 날씨는 `src/core/season.js` 의 순수 함수(시작 날짜와 날 번호 → 계절, 날씨)로 정해 저장 없이 손님도 같은 값을 쓴다. 단풍잎과 눈사람 규칙은 `src/core/seasonplay.js`, 물고기와 몬스터는 기존 `fishing.js`, `combat.js` 에 더한다. 화면은 `world/seasonlook.js`(나무, 땅, 덤불, 꽃, 지붕 색), `world/seasonfx.js`(꽃잎, 낙엽, 발자국), `world/weather.js`(눈 추가), `world/leafpiles.js`, `world/snowmen.js` 가 맡고 `main.js` 가 잇는다.

**Tech Stack:** Three.js ES modules(빌드 없음), node:test.

**Spec:** `docs/Seasons-Weather-2026-11-16.html`

## Global Constraints

- 계절: 3~5월 봄, 6~8월 여름, 9~11월 가을, 12~2월 겨울(게임 달력 `dateOf(state.startDate, day).m`).
- 날씨 확률: 봄 맑음 55 흐림 20 비 25, 여름 55 15 30, 가을 60 25 15, 겨울 맑음 45 흐림 25 눈 30. 겨울엔 비 없음, 다른 계절엔 눈 없음. 1~2일째는 늘 맑음.
- 해가 약해지는 정도: 흐림 15%, 비 35%, 눈 20%. 날씨로 어두워져도 밤 판단(가로등, 밤 나방, 캐릭터 푸른빛)은 시계로만 한다.
- 이야기가 부른 비('검은 별똥별', '하치와레의 카메라')가 이긴다.
- 단풍잎: 가을, 날마다 12곳, 아이템 `mapleleaf` 「단풍잎」 20원, 치이카와가 좋아함. 주인 몫(손님 화면엔 낙엽 더미 없음).
- 눈사람: 겨울, 마을 안 길과 건물이 아닌 땅, 연타 놀이, 얼굴 3가지, 5개까지(6번째에 가장 오래된 것 사라짐), 겨울 끝에 녹음. 손님은 보기만(월드 이름표 `sm`, `g` 와 겹치지 않게).
- 발자국: 겨울 눈 위, 나와 같이 놀기 친구, 60개, 20초에 흐려짐.
- 미꾸라지: 비 오는 날만, 시냇물과 연못, 중간, 10~20cm, 80원. 도감 보상 4종 300, 8종 800, 13종 3,000 그대로 + 14종 1,000원. 저장 검사는 13과 14 모두 받는다.
- 눈뭉치: 겨울만, 들판과 숲에 기존 몬스터에 더해 세 마리씩, 겨울 끝에 사라짐. 체력 5, 기운 −9, 전리품 `icecrystal` 「얼음 결정」 60원, 굴러와 부딪치기(일직선, 예고).
- 우산: 집 밖의 마을 친구 모두(마을 길과 광장 포함), 비 오는 날. 내 캐릭터는 없음.
- 겨울에 숨기는 꽃: 땅의 장식 꽃만. 광장 꽃밭 꽃 따기는 그대로.
- 모델(우산, 눈사람, 눈뭉치, 낙엽 더미, 아이콘, 지붕 눈, 입자 모양)은 fable 5.2로.
- 화면 글에 가운뎃점(·)을 쓰지 않는다.

## Review Focus

1. 예전 저장(13종 도감 보상을 받은 저장, `leaves`/`snowmen` 칸이 없는 저장): 그대로 불러와져야 한다 → 작업 1과 4 테스트.
2. 같이 놀기 손님: 주인과 같은 계절, 날씨, 눈사람을 보고, 자기 저장의 단풍잎과 눈사람은 바뀌지 않는다 → 작업 1 테스트(같은 입력 같은 날씨), 작업 6 브라우저.
3. 날이 바뀌는 순간(아침 6시): 계절, 날씨, 낙엽 자리가 새날 것으로 바뀌고 겨울이 끝나면 눈사람이 녹는다 → 작업 1 테스트(`meltSnowmen`), 작업 6 브라우저.
4. 비 오는 낮: 가로등과 창문이 켜지지 않고 밤 나방이 나오지 않는다 → 작업 2 브라우저(`nightNow` 값 비교).
5. 휴대폰: 눈, 낙엽, 발자국이 그리기 횟수를 크게 늘리지 않는다(입자마다 한 번) → 작업 3 브라우저(`__town.drawCalls()` 전후 비교).

---

### Task 1: 규칙 모듈 — 계절, 날씨, 단풍잎, 눈사람

**Files:**
- Create: `src/core/season.js`, `src/core/seasonplay.js`
- Modify: `src/core/save.js`(isValidLeaves, isValidSnowmen), `src/core/gifts.js`(치이카와 좋아함에 `mapleleaf`)
- Test: `tests/season.test.mjs`

**Interfaces — Produces:**
- `season.js`: `seasonOfMonth(m) → 'spring'|'summer'|'autumn'|'winter'`, `seasonAt(startISO, day)`, `WEATHER_P`(위 확률표), `weatherOf(startISO, day) → 'sunny'|'cloudy'|'rain'|'snow'`(시작 날짜와 날 번호를 섞은 해시로 0~1 값을 만들어 확률표에서 고른다, 같은 입력은 늘 같다), `WEATHER_DIM = { sunny: 0, cloudy: 0.15, rain: 0.35, snow: 0.2 }`.
- `seasonplay.js`: `LEAF = 'mapleleaf'`(registerItems: 「단풍잎」, kind 'drop', sell 20), `LEAF_SPOTS = 12`, `leavesOf(state, day) → { day, picked: [ids] }`(다른 날이면 비운다), `pickLeaf(state, id, day, season) → { ok, state }`(가방에 단풍잎 +1, 같은 날 같은 자리 두 번은 안 됨, 가을 아니면 안 됨), `SNOWMAN_MAX = 5`, `SNOWMAN_FACES = 3`, `addSnowman(state, { x, z, face }, day) → state`(맨 앞이 가장 오래된 것), `meltSnowmen(state, season) → state`(겨울 아니면 비운다), `isValidLeaves`, `isValidSnowmen`.

- [ ] Step 1: 테스트 — 달 12, 1, 2 → winter, 3 → spring, 6 → summer, 9 → autumn; `weatherOf` 같은 입력 같은 값; 1~2일째 sunny; 계절별로 1,000일(그 계절 날짜만)을 돌려 비율이 확률표 ±5% 안; 겨울에 rain 0번, 다른 계절에 snow 0번; `pickLeaf` 가을 하루 한 자리 한 번, 가방 단풍잎, `sellPrice('mapleleaf') === 20`, 다음 날 다시; 가을 아닌 날 `pickLeaf` 실패; `addSnowman` 6번째에 첫 번째 사라짐; `meltSnowmen(…, 'spring')` 빈 목록; `isValidState` 가 `leaves`, `snowmen` 없는 저장과 있는 저장 모두 받고, 이상한 값(NaN 좌표, face 3 이상)은 거른다.
- [ ] Step 2: 실패 확인 → Step 3: 구현 → Step 4: 통과와 전체 테스트 → Step 5: 커밋.

### Task 2: 하늘과 날씨 — 밤 판단 분리, 흐림, 눈, 날씨 표시

**Files:**
- Modify: `src/main.js`(applySky, 날씨 고르기, 이야기 비 우선), `src/world/weather.js`(눈송이 입자, `setDaily(kind)`), `src/ui/hud.js`(날짜 옆 `setWeather(kind)` 그림)

**Interfaces:** Consumes `weatherOf`, `WEATHER_DIM`. Produces `weather.setDaily(kind)`(비 세기 = max(이야기 비, 그날 비), 눈은 그날 눈), `weather.snow`(0~1), `hud.setWeather(kind)`.

- [ ] Step 1: 브라우저 RED — 낮 12시에 비를 켜면 `nightNow` 가 0.5를 넘는다(가로등 켜짐).
- [ ] Step 2: 구현 — applySky 에서 `day`, `night` 는 날씨를 빼고 시계로 정한 해와 하늘빛으로 먼저 구하고, 날씨 어두움(WEATHER_DIM 과 비·눈 세기)은 그 뒤에 해와 하늘빛에만 곱한다. 흐림은 하늘을 옅은 회색, 눈은 밝은 회색. 손님은 `visiting.startDate`, `visiting.clock` 으로 같은 날씨.
- [ ] Step 3: 브라우저 GREEN — 비 오는 낮 `nightNow` 가 맑은 낮과 같다, 밤에는 그대로; 눈 오는 날 눈송이가 보이고 그리기 횟수 +1 이하; 날씨 그림.
- [ ] Step 4: 전체 테스트, 커밋.

### Task 3: 계절 풍경 — 나무, 땅, 덤불, 꽃, 입자, 발자국 그리기

**Files:**
- Create: `src/world/seasonlook.js` — `createSeasonLook({ village, outdoors }) → { apply(season) }`, `src/world/seasonfx.js` — `createSeasonFx(scene) → { setSeason(season), update(dt, center), addPrint(x, z, yaw) }`(꽃잎, 낙엽 각각 InstancedMesh 하나, 발자국 InstancedMesh 하나 60개, 20초에 흐려짐)
- Modify: `src/world/village.js`(잎 도형 캐시와 덤불, 꽃, 땅 핸들 내보내기, 땅을 batch 에서 빼기), `src/world/outdoors.js`(숲 잎 계절용 재질과 들판 꽃 핸들 내보내기)

**Interfaces:** Produces `village.seasonHandles()`, `outdoors.seasonHandles()`(seasonlook 만 쓴다), `seasonLook.apply(season)`, `seasonFx.addPrint`.

- [ ] Step 1: 브라우저 RED — 계절을 바꿔도 나무 색이 같다.
- [ ] Step 2: 구현 — 계절 색(봄 연두, 여름 진초록, 가을 주황·빨강·노랑을 나무마다 섞기, 분홍 나무는 붉게, 겨울 눈 덮인 흰빛), 땅 다시 칠하기(가을 누런 기, 겨울 흰 눈에 길은 흐린 흙빛), 겨울엔 장식 꽃 숨기기, 봄 꽃잎과 가을 낙엽 입자는 내 둘레에.
- [ ] Step 3: 브라우저 GREEN — 네 계절 사진, 그리기 횟수 비교, 계절 바꾸기가 한 번에 끝남.
- [ ] Step 4: 전체 테스트, 커밋.

### Task 4: 비 오는 날 물고기 미꾸라지와 도감 보상

**Files:** Modify `src/core/fishing.js`(FISH `loach`: 미꾸라지, waters [river, pond], size 1, cm [10, 20], sell 80, `rain: true`; `fishFor(water, hour, weather)`, `pickFish(water, hour, random, weather)` — 비 아니면 rain 물고기 제외; DEX_PRIZES 에 14 → 1000, 13 그대로; isValidFishPrize 가 둘 다 받음), `src/main.js`(두 호출에 오늘 날씨), `src/ui/panels.js`(도감 칩 「비 오는 날만」)
- Test: `tests/fishing.test.mjs`, `tests/fishuse.test.mjs`

- [ ] Step 1: 테스트 — 비 아닌 날 `fishFor('river', 12)` 에 loach 없음, 비 오는 날 있음; 13종 보상을 받은 저장이 저장 검사 통과; 14종이면 1,000원 칸; 기존 「물마다 시간마다 두 종 이상」 테스트 유지.
- [ ] Step 2~5: 실패 확인, 구현, 통과, 커밋.

### Task 5: 모델과 그림 (fable 5.2)

**Files:** `src/actors/models.js`(PROP_PARTS 우산, 친구마다 색 하나, 몸에 붙임), `src/world/snowmen.js`(새: `createSnowmen(scene) → { sync(list) }`, 얼굴 3가지), `src/world/leafpiles.js`(새: `createLeafPiles(scene) → { sync(spots, pickedIds), nearest(x, z, r) }`), `src/world/monsters.js` BUILD 눈뭉치, `src/ui/monsterart.js` MON 눈뭉치와 DROP 얼음 결정, `src/ui/itemart.js` 단풍잎, 지붕 눈(`buildings.js`, `homeext.js` 지붕 부품 위 흰 덮개, `setSnow(on)`), seasonfx 입자 모양.

- [ ] Step 1: fable 에이전트에게 맡긴다. Step 2: `node --check`, 빈 장면 사진 확인. Step 3: 커밋.

### Task 6: 계절 놀이와 우산 연결

**Files:** Modify `src/main.js`(낙엽 더미 자리 — `village.treeSpots()` 에서 날짜로 고정 12곳, 줍기 대상, 눈사람 만들기 대상과 연타 놀이, 근처 친구 한마디, 발자국, 우산, 같이 놀기 `sm`), `src/actors/npcs.js`(`setRain(on)` — 집 밖 친구는 우산), `src/net/remote.js`(손님 발자국)

- [ ] Step 1: 브라우저 RED — 가을에 낙엽 더미 없음.
- [ ] Step 2: 구현.
- [ ] Step 3: 브라우저 GREEN — 낙엽 줍기와 하루 초기화, 눈사람 세우기와 6번째, 겨울 끝 녹기, 발자국 60개와 20초, 비 오는 날 우산, 손님 화면에 주인 눈사람.
- [ ] Step 4: 전체 테스트, 커밋.

### Task 7: 겨울 몬스터 눈뭉치

**Files:** Modify `src/core/combat.js`(MONSTERS `snowball`: 「눈뭉치」, region 'winter', winter: true, hp 5, dmg 9, drop `icecrystal`, 굴러오기 공격; DROPS `icecrystal` 「얼음 결정」 60원; MONSTER_ORDER; 퀴즈 규칙은 night 처럼 제외), `src/world/monsters.js`(겨울에만 들판, 숲에 세 마리씩 더, 겨울 아니면 떠난다 — ctx 에 `winter`), `src/ui/panels.js`(REGION_TEXT 「겨울」)
- Test: `tests/combat.test.mjs`(몬스터 수와 순서 테스트 조정), 새 테스트(겨울 아닌 날 눈뭉치 스폰 조건이 거짓)

- [ ] Step 1~5: 실패하는 테스트, 구현, 통과, 브라우저(겨울 들판에 눈뭉치 셋, 봄에 사라짐), 커밋.

### Task 8: 노션, 아티팩트, 마무리 검토

- [ ] 노션: 돈 버는 방법(단풍잎 20원, 얼음 결정 60원, 미꾸라지 80원, 도감 14종 1,000원), 선물(치이카와 단풍잎), 퀘스트 정리 머리 안내 기준 버전. 넣은 글은 서브에이전트로 확인.
- [ ] 아티팩트에 바뀐 파일과 version.json.
- [ ] 마무리 검토(fable)와 고치기.
