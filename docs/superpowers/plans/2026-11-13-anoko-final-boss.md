# 최종 보스 아노코 구현 계획

> **에이전트 작업자에게:** 필수 하위 스킬은 superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans 다. 작업마다 순서대로 구현하고, 단계는 체크박스(`- [ ]`)로 표시한다.

**목표:** 왕버섯 다음 메인 이야기 2장으로 서쪽 숲 너머 마당의 최종 보스 아노코와 싸우고, 이기면 집 앞 아노코에게서 탈것을 골라 타고 다니게 한다.

**구조:** 지금 있는 틀에 아노코 몫만 얹는다. 보스 마당(`ARENAS`), 보스 공격 꾸러미(`KITS`), 이야기 퀘스트, 자동차 타기가 그 틀이다. 시험할 수 있는 규칙(솜털 방패, 탈것 고르기, 공격 시간)은 새 `src/core/anoko.js` 에 두고, 3D 모습은 새 `src/actors/anoko.js` 하나를 보스와 집 앞과 탈 때 같이 쓴다.

**기술:** three.js ES 모듈(빌드 없음), 테스트는 `node --test tests/*.test.mjs`(core 모듈만 불러온다), 화면 확인은 개발 서버 `town`(8765, `/?debug`)과 `window.__town`.

**설계서:** `docs/Anoko-Final-Boss-2026-11-13.html` (승인됨). 작업자는 이 계획과 설계서를 같이 읽는다.

## 지킬 것

- 화면 문구는 한국어, 가운뎃점 「·」 금지(쉼표, 조사, 마침표로). 식별자, 로그, 커밋 메시지는 영어.
- 원작 대사를 옮기지 않는다. 대사, 공격, 타기는 게임에서 정한 것으로 주석에 밝힌다.
- 난이도 기준: 0.2초(±0.05) 늦게 반응하는 사람도 공격 하나하나를 예고를 보고 피할 수 있다.
- 숲 나무, 바위, 오데 빈터 (−40, 22), 게임센터 같은 지금 자리가 하나도 옮겨지면 안 된다(공유 난수 소비를 그대로 둔다).
- `src/core/savedict.js` 는 건드리지 않는다(CTW3 저장 코드가 깨진다).
- 줄바꿈 보존: 일부 파일은 CRLF 다. 편집 도구로만 고친다.
- 커밋 끝줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 끝나면 `git pull -q --rebase origin main && git push -q origin main`.
- 아티팩트(https://claude.ai/artifact/6pP4tGmE2BeysFsv5X2DVT) 다시 올리기: `files` 에 `version.json` 과 바뀐 파일을 늘 넣는다.
- 노션 퀘스트 페이지(3f58fd03e73681f5865dc304bb1da508)와 돈 페이지(3f48fd03e73681308f8bd08f33d3a728)를 코드에서 뽑은 값으로 고치고, 넣은 글은 서브에이전트로 확인한다.
- 키보드 모드에서 행동 버튼이 숨으므로, 새 행동 대상 종류는 반드시 `main.js` 의 `targetSpot` 에 경우를 넣는다(오데 때 실수).

## 살펴볼 곳 (테스트가 못 잡는 실패)

1. **오래전에 메인 이야기를 끝낸 저장**(예: 38일째에 끝내고 지금 52일째): 2장이 바로 열려야 한다 → 작업 6 테스트 `afterGap 은 끝낸 날 다음 날부터, 오래전에 끝냈으면 바로`.
2. **싸우다 기절하거나 새로고침**: 퀘스트는 boss 단계에 남고, 다시 가면 아노코가 체력 가득으로 다시 나타나야 한다 → 작업 7 브라우저 확인 단계.
3. **아노코를 탄 채 이야기 장면, 집 안, 같이 놀기 방문**: 자동차처럼 저절로 내려야 한다(`carStay`) → 작업 8 브라우저 확인 단계.
4. **자동차가 없는 저장**: 아노코만 있어도 탈것 버튼이 생기고 C 키로 탄다 → 작업 1 `rideKind` 테스트와 작업 8 확인.
5. **같이 놀기에서 옛 버전 상대**: `rd` 값을 모르는 쪽은 자동차로 그린다(깨지지 않는다) → 작업 8 확인.

---

### 작업 1: 아노코 규칙 모듈 (솜털 방패, 탈것 고르기, 공격 값)

**파일:**
- 만들기: `src/core/anoko.js`
- 테스트: `tests/anoko.test.mjs`

**주고받는 것:**
- 내놓는 것:
  - `ANOKO_SHIELD = { arc: Math.PI / 3, front: 1 / 3 }` 정면 좌우 60도 안이면 피해 ×1/3.
  - `frontGuard(yaw: number, mx: number, mz: number, hx: number, hz: number) => number` 아노코(바라보는 방향 `yaw`, three.js `rotation.y` 와 같은 뜻, 앞이 `(sin yaw, cos yaw)`)를 `(hx, hz)` 에서 쳤을 때 피해 배율(1/3 또는 1).
  - `ANOKO_TURN = 2.4` 아노코가 노리는 상대 쪽으로 도는 빠르기(라디안/초, 시작값).
  - `ANOKO_ATK` 공격 값 다섯: `claw`(combo), `tail`(sweep), `leap`(stomp), `fluff`(shoot 고리), `fluff2`(shoot 고리 두 겹). 모양은 `world/monsters.js` 의 `ATK` 항목과 같고 `kind` 를 적는다. 시작값:
    - `claw: { range: 2.2, wind: 0.55, n: 3, gap: 0.32, reach: 1.4, cool: 1.4, rec: 0.8, kind: 'combo' }`
    - `tail: { range: 99, wind: 0.75, radius: 3.2, cool: 1.4, rec: 1.0, kind: 'sweep' }` 아노코 뒤쪽 반원(앞쪽 반원은 안전)
    - `leap: { range: 9, wind: 0.85, lock: 0.65, air: 0.95, radius: 2.4, height: 1.6, cool: 1.8, rec: 0.9, kind: 'stomp' }`
    - `fluff: { range: 10, wind: 0.8, n: 10, spread: Math.PI * 2 / 10, ring: true, speed: 4.2, r: 0.34, life: 2.6, color: '#fbf7ef', dmgK: 0.7, cool: 1.6, rec: 0.6, kind: 'shoot' }`
    - `fluff2`: `fluff` 에 `n: 13, spread: Math.PI * 2 / 13, twice: 0.42, wind: 0.7, rec: 0.5`
  - `inSweep(yaw, mx, mz, px, pz, radius, me = 0.32) => boolean` 꼬리 휩쓸기에 맞는지(뒤쪽 반원 안, 반지름 + 내 몸).
  - `rideKind(state) => 'anoko' | 'car' | null` 탈것 버튼이 탈 것. 아노코를 얻었으면(`isDone(state, 'anoko')`) `state.ride === 'car'` 이고 자동차가 있을 때만 `'car'`, 그 밖에는 `'anoko'`. 아노코가 없으면 자동차가 있을 때 `'car'`, 없으면 `null`.
  - `isValidRide(v) => boolean` (`undefined`, `'car'`, `'anoko'` 만 참).

- [ ] **1단계: 실패하는 테스트 쓰기** (`tests/anoko.test.mjs`)
  - `frontGuard: 정면 60도 안은 1/3, 옆과 뒤는 1` — yaw 0(앞이 +z), 아노코 (0,0): (0, 2)→1/3, (1.6, 1.0)(약 58°)→1/3, (2, 0)→1, (0, −2)→1.
  - `inSweep: 뒤쪽 반원만, 앞은 안전` — yaw 0, radius 3.2: (0, −2)→true, (2, −0.1)→true, (0, 2)→false, (0, −3.6)→false.
  - `rideKind` — 아노코 없고 자동차 없음→null, 자동차만→'car', 아노코만(ride 없음)→'anoko', 둘 다 + ride 'car'→'car', 둘 다 + ride 'anoko'→'anoko', 아노코만 + ride 'car'(자동차 없음)→'anoko'.
  - `공격 하나하나는 0.2초(±0.05) 늦게 반응해도 피한다` — 가스벌레 테스트(`tests/gasbug.test.mjs` 의 `escapes`)와 같은 꼴로 공격마다 시뮬레이션: 걸음 3.2, 내 몸 0.32, 반응 0.15/0.2/0.25.
    - `claw`: 붙어 서 있다가(거리 1.0) 예고(wind) 시작 뒤 반응만큼 늦게 뒤로 걷기 시작해, 첫 할퀴기 때 `reach + 0.32` 밖이면 피한 것.
    - `tail`: 아노코 뒤 거리 1.5 에서 예고 뒤 늦게 바깥으로 걸어 `wind` 가 끝날 때 `radius + 0.32` 밖이거나 앞쪽 반원으로 들어가면 피한 것.
    - `leap`: 거리 0.8 ~ 6 에서 `wind × lock` 에 자리가 굳고, 착지(`wind + air`) 때 `radius + 0.32` 밖이면 피한 것.
    - `fluff`, `fluff2`: 고리 틈(`2π/n` 각도)이 내 몸보다 넓은 거리(거리 3 이상)에서 옆으로 반 칸 걸으면 피한 것. 두 겹은 두 번째 고리의 틈도 확인.
  - `isValidRide` — 'car', 'anoko', undefined 참, 'bike', 1, null 거짓.
- [ ] **2단계: 실행해 실패 확인** — `node --test tests/anoko.test.mjs` → `Cannot find module .../src/core/anoko.js`.
- [ ] **3단계: `src/core/anoko.js` 구현** — `isDone` 은 `./quests.js`, `hasTool` 은 `./tools.js` 에서. three 를 불러오지 않는다(테스트가 node 에서 불러온다). 피하기가 안 되는 공격이 있으면 시작값의 `wind` 를 늘린다.
- [ ] **4단계: 실행해 통과 확인** — `node --test tests/anoko.test.mjs` → 모두 PASS.
- [ ] **5단계: 커밋** — `feat: Anoko rules module - front fluff shield, tail sweep area, ride choice and attack timings dodgeable with a 0.2 s late reaction`

### 작업 2: 아노코 몬스터 항목, 도감, 균형 시뮬레이션

**파일:**
- 고치기: `src/core/combat.js` (`MONSTERS`, `MONSTER_ORDER`), `src/core/bosses.js` (`bossSeen`), `src/ui/monsterart.js` (`MON.anoko`)
- 테스트: `tests/anoko.test.mjs`(이어서), `tests/bosses.test.mjs` 는 그대로 통과해야 한다

**주고받는 것:**
- 쓰는 것: 작업 1 의 `ANOKO_ATK`, `ANOKO_SHIELD`, `ANOKO_TURN`.
- 내놓는 것: `MONSTERS.anoko = { name: '아노코', short: '아노코', region: 'boss', hp: 220, dmg: 18, speed: 1.8, aggro: 9, size: 1.4, boss: true, attack: 'boss', atk: '앞발 할퀴기, 꼬리 휩쓸기, 뛰어 덮치기, 솜털 뭉치 날리기, 부하 부르기', note: (게임에서 정한 짧은 설명, 앞쪽 솜털에 막힌다는 것 포함) }` (`drop` 없음). `MONSTER_ORDER` 맨 끝(`kingcap` 뒤)에 `'anoko'`. `bossSeen(state, 'anoko')` 는 `state.story.anokoSeen` 으로 본다.

- [ ] **1단계: 실패하는 테스트 쓰기**
  - `아노코: 최종 보스 항목` — `MONSTERS.anoko.boss`, `hp 220`, `dmg 18`, `drop` 없음, `MONSTER_ORDER` 마지막이 `'anoko'`, `bossSeen({ story: { anokoSeen: 53 } }, 'anoko')` 참.
  - `균형: 혼자면 체력 절반쯤에서 기운이 바닥나고, 친구 둘이면 기운 30 넘게 남기고 이긴다` — 테스트 안에 `simulateFight({ allies, weapon, seed })` 를 둔다(설계서 5절 모형):
    - 나: `WEAPONS.star`(3.5 / 0.45초), 기운 100, 먹을 것 없음. 아노코 앞쪽에서 휘두르면 `ANOKO_SHIELD.front` 배, 아노코가 쉬는 틈(`rec`)에는 옆으로 돌아 들어가 그대로.
    - 아노코: `KITS` 와 같은 고르기(가까우면 claw, 화나면 tail 이어서, 멀면 leap 또는 fluff), 화남 75%/50%, 부하는 처음 9초, 화난 뒤 7초마다(뿔벌레, 마지막 단계 그루터기와 버섯 둘).
    - 피하기: 공격 하나는 다 피하고, 부하 공격과 아노코 공격이 같은 1초 안에 겹치면 둘 중 하나(아노코 쪽, `dmg × dmgK`)를 맞는다. 피하는 동안(`wind` 끝까지)은 휘두르지 못한다.
    - 친구: 힘 `[2, 1]`(우사기, 하치와레 기본), 1.05초마다. 친구가 칠 때마다 30% 확률로 아노코가 그 친구를 노린다(그동안 나는 옆과 뒤를 쳐서 그대로 들어간다). 친구 체력 40, 쓰러지면 내가 2초 걸려 깨워 12로 일어난다.
    - 기대: 혼자 → 기운 0 이 될 때 아노코 체력이 35% ~ 65% 남는다(시드 20개 중앙값). 혼자 아노코를 쓰러뜨리는 데 드는 시간(기운을 무시하고 계산) ≥ 친구 둘과의 시간 × 3. 친구 둘 → 이기고 남은 기운 > 30(시드 20개 중앙값).
  - 기대에 못 미치면 `MONSTERS.anoko` 의 hp, dmg 와 작업 1 의 시작값을 고친다(설계서가 허락한 범위).
- [ ] **2단계: 실행해 실패 확인** — `node --test tests/anoko.test.mjs` → `MONSTERS.anoko` 없음으로 실패.
- [ ] **3단계: 구현** — `combat.js` 항목과 순서, `bosses.js` 의 `bossSeen` 에 anoko 경우, `monsterart.js` 의 `MON.anoko` SVG(하얀 솜털 머리, 주황 뿔, 빙글빙글 눈, 초록 꼬리 — 다른 `MON` 그림과 같은 크기와 선 굵기).
- [ ] **4단계: 실행해 통과 확인** — `node --test tests/*.test.mjs` → 모두 PASS(도감과 보스 테스트 포함).
- [ ] **5단계: 커밋** — `feat: Anoko monster entry, dex art and a balance simulation (solo runs out of stamina around half HP, two friends win with stamina to spare)`

### 작업 3: 서쪽 끝 너머 아노코 마당

**파일:**
- 고치기: `src/core/layout.js` (`ANOKO_LAIR`, `ARENAS`), `src/world/lairs.js` (`TERRAIN.anoko`, `DECOR.anoko`, `beyondEdge`), `src/world/outdoors.js` (서쪽 숲 반복문), `src/world/village.js` (서쪽 월드 끝 너머 땅, 길찾기 격자 `NAV_WEST`), 지도 앱(`src/ui/mapapp.js`)은 다른 마당처럼 그려지는지만 확인
- 테스트: `tests/anoko.test.mjs`(이어서)

**주고받는 것:**
- 내놓는 것: `export const ANOKO_LAIR = { x: -90.4, z: 16, r: 7.5, place: '아노코의 숲', door: { x: -70.5, z: 16 }, len: 12, lead: 8 }`(자리는 ±6 안에서 고칠 수 있다). `ARENAS` 맨 끝에 `{ id: 'anoko', ...ANOKO_LAIR }`. 왕버섯 굴처럼 `BOSS_LAIRS` 에는 넣지 않는다(구역 보스가 아니다 — `inLair`, `markBossDown` 대상 아님).

- [ ] **1단계: 바꾸기 전 숲 자리 찍어 두기** — 개발 서버에서 `__town.solids()` 를 불러 새 마당 둘레(가운데에서 30 밖, 그리고 x > −60 인 협곡과 흙길 둘레 4 밖)만 걸러 JSON 으로 저장해 둔다(scratchpad). `__town.odeInfo().spot` 이 (−40, 22) 인지도 적어 둔다.
- [ ] **2단계: 실패하는 테스트 쓰기**
  - `아노코 마당: 서쪽 월드 끝 너머, 고목 거인과 40 넘게, 오데 빈터와 10 넘게` — `arenaAt(ANOKO_LAIR.x, ANOKO_LAIR.z).id === 'anoko'`, `ANOKO_LAIR.x + ANOKO_LAIR.r < -80`, 고목 거인 마당 가운데와 거리 > 40, 입구에서 이어지는 흙길 끝(`canyonMouth` 에서 가장 가까운 길 점)과 (−40, 22) 거리 ≥ 10, `lairReach(-90.4, 16)` 참, `lairReach(-90.4, 30)` 거짓.
- [ ] **3단계: 실행해 실패 확인** — `node --test tests/anoko.test.mjs` → `ANOKO_LAIR` 없음.
- [ ] **4단계: 구현**
  - `layout.js`: `ANOKO_LAIR`, `ARENAS` 에 더하기.
  - `lairs.js`: `TERRAIN.anoko = { kind: 'tree', colors: [...고목 거인과 같은 초록], trunk: '#7a5136', w: 1.9, h: [4.6, 5.8] }`, `DECOR.anoko`(이끼 풀밭 바닥 + 하얀 솜털 뭉치 4 ~ 6개), `beyondEdge` 에 서쪽(`A.x - A.r - ARENA_WALL < -WORLD_HALF`) 더하기.
  - `outdoors.js` 서쪽 숲 반복문(58 ~ 72줄): 나무를 빼는 조건에 `onLairLead(px, pz, 2.5) || underEdge(px, pz)` 를 `arenaClear` 와 같은 줄(난수를 한 번 소비하는 갈래)에 더한다. 난수 소비 횟수를 바꾸지 않는다.
  - `village.js`: 월드 끝 너머 땅 반복문(118줄)에 서쪽 경우(`x0 = A.x - A.r - 48 … x1 = -WORLD_HALF - 3.5`), 길찾기 격자에 `NAV_WEST = Math.max(WORLD_HALF, ...ARENAS.map((A) => -(A.x - A.r - ARENA_WALL - 2)))` 를 더하고 `navPos`, `navCell`, `NAV_NX` 를 `-NAV_WEST` 기준으로 바꾼다.
- [ ] **5단계: 실행해 통과 확인** — `node --test tests/*.test.mjs` → 모두 PASS.
- [ ] **6단계: 브라우저 확인** — 새로고침 뒤 1단계 JSON 과 지금 `solids()`(같은 거름) 가 똑같고, 오데 빈터가 (−40, 22) 다. `teleport(-68, 16)` 에서 서쪽으로 걸어 협곡을 지나 마당 가운데까지 들어간다. 친구 둘과 파티를 맺고 `__town.path(-60, 16, -90, 16)` 이 길을 찾는다. 지도 앱에 마당과 이름표가 보인다. 화면을 찍어 마당과 둘레 고목, 맵 끝 둔덕이 이어지는지 본다.
- [ ] **7단계: 커밋** — `feat: Anoko's lair beyond the west edge of the forest - a mossy clearing walled by old trees with a canyon and dirt path from the forest-lake road; forest trees and the Ode clearing stay where they were`

### 작업 4: 아노코 3D 모델 (fable 에이전트)

**파일:**
- 만들기: `src/actors/anoko.js`

**주고받는 것:**
- 내놓는 것:
  - `buildAnoko() => { root: THREE.Group, height: number, setFace(kind: 'swirl' | 'happy'), setPose(kind: 'stand' | 'lie'), animate(t: number, opts: { moving?: boolean, step?: number }) }` — 크기 1 에서 서 있는 키 약 3.0, 앞은 +z, 바닥 y 0.
  - `ANOKO_RIDE_SCALE` (서 있는 키가 약 1.9 가 되는 배율), `ANOKO_SEAT = { y, z }` (크기 1 에서 등 위 앉는 자리, 탈 때는 `ANOKO_RIDE_SCALE` 을 곱해 쓴다).

- [ ] **1단계: fable 에이전트에게 맡기기** — `Agent` 도구, `model: "fable"`. 전달: 설계서 6절 전문, 사진 두 장 경로(이 세션 scratchpad 의 `anoko/anoko-lying.png`, `anoko/anoko-happy.png` — 사진을 직접 Read 하라고 적는다), 비슷한 예로 `src/actors/car.js`(부품 묶기와 `mergedGeometry`), `src/actors/models.js` 의 얼굴 부품(`face`, `faceStroke`, 볼 빗살), `src/render/toon.js` 의 `toonMesh`, 위 「내놓는 것」 그대로. 원작 그림을 저장소에 넣지 말 것, `src/actors/anoko.js` 하나만 만들 것을 적는다.
- [ ] **2단계: 문법 확인** — `node --input-type=module --check < src/actors/anoko.js` → 오류 없음.
- [ ] **3단계: 브라우저 확인** — 페이지에서 `import('/src/actors/anoko.js')` 로 모델을 장면에 놓고(앞, 옆, 뒤, 엎드림, 두 얼굴) 화면을 찍어 사진과 비교한다. 다른 점은 고치고(작은 수정은 직접, 큰 수정은 같은 에이전트에게 다시), 찍은 사진을 사용자에게 보내 모습을 확인받는다.
- [ ] **4단계: 커밋** — `feat: Anoko 3D model - white fluffy head and mane, small orange horn, drooping ears, beige back, green tail with white segments, orange claws, swirl eyes for fights and a happy closed-eye face`

### 작업 5: 보스 싸움 (공격, 꼬리 휩쓸기, 솜털 방패, 도는 빠르기)

**파일:**
- 고치기: `src/world/monsters.js`

**주고받는 것:**
- 쓰는 것: 작업 1 의 `ANOKO_ATK`, `frontGuard`, `inSweep`, `ANOKO_TURN`; 작업 4 의 `buildAnoko`.
- 내놓는 것: `BUILD.anoko`(얼굴 `swirl`), `KITS.anoko = { near: ATK.anokoClaw, again: ATK.anokoTail, pick: (r, roll) => (roll < 0.5 ? ATK.anokoLeap : r >= 2 ? ATK.anokoFluff2 : ATK.anokoFluff), minion: (r, k) => (r >= 2 ? (k === 0 ? 'stump' : 'shroom') : 'beetle') }`, `RAGE_AT.anoko = [0.75, 0.5]`, `HEAVY.anoko = true`. 새 공격 종류 `sweep`: 예고(`wind`) 동안 아노코 뒤쪽 반원 바닥 표시가 차오르고, 끝에 `inSweep` 이면 `hurt`. 맞은 피해 배율: `applyHit` 이 `species === 'anoko'` 이면 `dmg *= frontGuard(m.yaw, m.x, m.z, x, z)` 하고 실제로 들어간 피해를 `m.lastDmg` 에 적으며, 막혔으면 `C.onGuard?.(m, x, z)` 를 부른다. 아노코는 노리는 상대 쪽으로 `turnTo(..., ANOKO_TURN)` 으로만 돈다(다른 보스의 빠른 회전 대신).

- [ ] **1단계: 구현** — 위 내용. `ATK.anokoClaw` 등은 `ANOKO_ATK` 에서 가져와 넣는다(테스트한 값과 화면 값이 같게). `sweep` 의 예고 표시는 기존 `slam` 바닥 고리를 반원으로 잘라 쓴다. 같이 놀기 손님 화면용 `fxSnapshot`/`showGuest` 에 `sweep` 표시가 따라가는지 `slam` 처럼 맞춘다.
- [ ] **2단계: 테스트 통과 확인** — `node --test tests/*.test.mjs` → 모두 PASS.
- [ ] **3단계: 브라우저 확인** — `__town.spawnMonster('anoko', x, z)` 로 마당에 세우고 `T.step` 으로: 네 공격의 예고와 맞는 범위, 앞에서 치면 피해 숫자가 1/3, 뒤에서 치면 그대로, 화남 두 단계, 부하 종류. 정지 화면을 찍는다.
- [ ] **4단계: 커밋** — `feat: Anoko boss fight - claw combo, tail sweep behind it (front is safe), leap and fluff rings, forest minions, and the front fluff shield that cuts damage to a third unless you hit its side or back`

### 작업 6: 메인 이야기 2장 퀘스트

**파일:**
- 고치기: `src/core/quests.js` (`QUESTS.anoko`, `PLACES.anokoLair`, `baseOffer` 의 `afterGap`, boss 단계 `species`)
- 테스트: `tests/anoko.test.mjs`(이어서), `tests/quests.test.mjs` 는 그대로 통과

**주고받는 것:**
- 내놓는 것: `QUESTS.anoko`(객체 순서에서 `story` 바로 뒤 — `QUEST_ORDER` 와 `pickTrack` 이 이야기 다음으로 고른다):
  - `title: '숲 너머의 아노코', giver: 'captain', story: true, tutorial: true, needHearts: 0, after: 'story', afterGap: 1, ask`, `offer`(게임에서 새로 쓴 대사).
  - `steps`: `{ type: 'talk', to: 'rakko', goal, say }`, `{ type: 'visit', place: 'anokoLair', speaker: null, goal, say }`, `{ type: 'boss', species: 'anoko', speaker: null, goal, say }`, `{ type: 'talk', goal, say }`.
  - `reward: { money: 6000, bond: 6, village: 3 }`.
  - `PLACES.anokoLair = { name: '아노코의 숲', r: 9 }`.
  - `bossOf(step) => step.species || 'kingcap'` (내보내기 — main 이 boss 단계가 어느 보스인지 고를 때 쓴다).

- [ ] **1단계: 실패하는 테스트 쓰기**
  - `afterGap 은 끝낸 날 다음 날부터, 오래전에 끝냈으면 바로` — story done 38: day 38 에 `canOffer(s, 'anoko')` 거짓, day 39 참, day 52 참. story 안 끝냈으면 거짓.
  - `2장 단계: 랏코, 협곡 입구, 아노코, 대장` — 단계 종류와 `species: 'anoko'`, `bossOf` 가 왕버섯 단계에 `'kingcap'`.
  - `2장 보상 6000원과 마을 친밀도` — `completeStep` 을 끝까지 돌려 돈이 6000 늘고 `isDone(s, 'anoko')`.
  - `checkQuestData()` 가 빈 배열.
- [ ] **2단계: 실행해 실패 확인** — `node --test tests/anoko.test.mjs` → `QUESTS.anoko` 없음.
- [ ] **3단계: 구현** — `baseOffer` 의 `after` 줄 뒤에 `if (Q.afterGap && !(state.clock && state.clock.day - questState(state, Q.after).done >= Q.afterGap)) return false;`. 대사는 대장 갑옷 씨와 랏코 말투(지금 이야기 퀘스트 대사)에 맞춰 새로 쓴다. 2장 보상 대사 끝에 아노코가 집 앞으로 온다는 줄을 넣는다.
- [ ] **4단계: 실행해 통과 확인** — `node --test tests/*.test.mjs` → 모두 PASS.
- [ ] **5단계: 커밋** — `feat: main story chapter 2 "Anoko beyond the forest" - opens the day after the king mushroom story (old saves get it right away): hear rumors from Rakko, look into the canyon, defeat Anoko, report to the captain; reward 6000 won`

### 작업 7: 싸움 흐름 연결 (main.js)

**파일:**
- 고치기: `src/main.js`

**주고받는 것:**
- 쓰는 것: 작업 3 `ANOKO_LAIR`, 작업 5 `KITS.anoko`/`C.onGuard`/`m.lastDmg`, 작업 6 `QUESTS.anoko`, `bossOf`.
- 내놓는 것: `anokoSpot = village.nearestFree(ANOKO_LAIR.x, ANOKO_LAIR.z, 1.5)`, `questPlaceAt('anokoLair')` = 협곡 입구 바로 안(`canyonMouth(ANOKO_LAIR, -1)`), `__town.anoko()` 디버그(`{ step, spawned, hp, down }`), 테스트 앱 줄 「아노코」(2장 boss 단계로 바로 + 마당 입구로 이동).

- [ ] **1단계: 구현**
  - 왕버섯 `bossTime` 블록(3747 ~ 3757줄 근처)처럼: 2장이 visit 단계 이상이고 `!story.anokoDown` 이며 마당 46 안이면 아노코를 `anokoSpot` 에 세운다. boss 단계 전에는 `dormant`(잠든 채). visit 단계에 도착하면 `story.anokoSeen` 을 적는다(도감).
  - `onKill`: `m.species === 'anoko'` → `story.anokoDown = day`, 부하 정리, 「아노코를 쓰러뜨렸다!」 띠, `stepOf(state, 'anoko').type === 'boss'` 면 `questSceneStep('anoko')`. 쓰러뜨린 뒤 연출: 아노코 얼굴을 `happy` 로 바꾸고 그 자리에 잠깐 엎드려 있다가 사라진다(바로 사라지지 않게 3초쯤).
  - 무기 맞힘 숫자: 아노코는 `m.lastDmg` 를 띄운다(막히면 작은 숫자). `C.onGuard` → 솜털 효과와 「솜털에 막혔다!」(같은 타격에 한 번), 처음 한 번만(`seen('anokoGuard')`) 「옆이나 뒤를 노려 봐요」 토스트. 친구가 친 피해도 `m.lastDmg` 로 띄운다.
  - 보스 곡, 기절, 랏코 도시락은 지금 보스 흐름 그대로(따로 손대지 않는다).
  - 같이 놀기 손님이 친 피해도 방패가 적용되는지(`strikeGuest` 경로) 확인한다.
- [ ] **2단계: 테스트 통과 확인** — `node --test tests/*.test.mjs` → PASS, `node --input-type=module --check < src/main.js` 오류 없음.
- [ ] **3단계: 브라우저 확인(사용자 저장 사용)** — 사용자 저장(52일째, 이야기 끝냄)을 불러 대장에게 2장을 받고, 랏코, 협곡 입구(잠든 아노코와 해설), 테스트 앱 「아노코」로 boss 단계에서 친구 둘과 싸워 이긴 뒤 대장 보고까지. 싸우다 기절하고 다시 가면 체력 가득인 아노코가 있는지(살펴볼 곳 2), 새로고침해도 퀘스트가 boss 단계인지 본다. 막힘 숫자, 토스트, 띠 화면을 찍는다.
- [ ] **4단계: 커밋** — `feat: wire the Anoko fight into the village - it sleeps in its lair after you look into the canyon, wakes for the boss step, shows smaller numbers and a fluff puff when the shield blocks, and finishing it moves chapter 2 on`

### 작업 8: 집 앞 아노코와 타기

**파일:**
- 만들기: `src/world/anokohome.js`
- 고치기: `src/actors/player.js` (`setRiding(on, kind = 'car')`), `src/main.js` (`toggleCar`, 집 앞 대상, `targetSpot`, 같이 놀기 보내기), `src/net/remote.js` (`rd`), `src/ui/hud.js` (`setCar(mode, kind)` 그림), `src/core/save.js` (`isValidRide`)
- 테스트: `tests/anoko.test.mjs`(이어서)

**주고받는 것:**
- 쓰는 것: 작업 1 `rideKind`, `isValidRide`; 작업 4 `buildAnoko`, `ANOKO_RIDE_SCALE`, `ANOKO_SEAT`; `actors/car.js` 의 `buildCar`, `CAR_SPEED`.
- 내놓는 것:
  - `createAnokoHome(scene, village) => { spot: { x, z }, show(mode: 'anoko' | 'car' | null), place(door: { x, z }), update(dt, t) }` — 집 문 옆 빈자리(`village.nearestFree(door.x + 1.9, door.z + 0.7, 0.9)`)에 엎드린 아노코(`happy`) 또는 세워 둔 하늘색 자동차를 보이고, 보이는 동안만 장애물(r 0.85).
  - `player.setRiding(on, kind)`: `kind === 'anoko'` 면 `buildAnoko()` 를 `ANOKO_RIDE_SCALE` 로 줄여 붙이고 `ANOKO_SEAT` 높이에 앉는다. 빠르기는 둘 다 `CAR_SPEED`(6.4), 부딪힘 반지름은 아노코 0.6. `player.rideKind` 로 지금 탄 것.
  - 같이 놀기: 보내는 상태에 `rd: 'anoko'`(아노코를 탔을 때만). `remote.js` 는 `anim === 'drive' && p.rd === 'anoko'` 면 아노코를, 아니면 자동차를 그린다.
  - `hud.setCar(mode, kind)`: `kind === 'anoko'` 면 아노코 얼굴 그림, `aria-label` 「아노코 타기 / 아노코에서 내리기」, `title` 「아노코 (C)」.

- [ ] **1단계: 실패하는 테스트 쓰기** — `저장: ride 값` — `isValidState` 가 `ride: 'anoko'`, `'car'`, 없음은 받고 `'bike'` 는 거절.
- [ ] **2단계: 실행해 실패 확인** — `node --test tests/anoko.test.mjs` → 거절이 안 되어 실패.
- [ ] **3단계: 구현**
  - `save.js`: `if (s.ride !== undefined && !isValidRide(s.ride)) return false;`
  - `main.js`:
    - 2장을 끝냈으면 집 앞 아노코를 보인다(`isDone(state, 'anoko')`). `show` 는 `rideKind` 와 지금 탄 것으로 정한다: 아노코를 타고 나갔으면 빈자리, 아노코를 골랐고 자동차가 있으면 자동차, 그 밖에는 아노코. 집 크기가 바뀌면(`homeExt` 의 문 자리가 바뀌면) `place` 로 옮긴다.
    - `findTarget` 에 `{ type: 'anokoHome', label: '말 걸기', x, z, r: 1.1, y: 2.1 }`(가까이 1.8 안), `targetSpot` 에 `'anokoHome'` 경우, 행동 버튼에서 `guide.ask('(아노코가 꼬리를 살랑살랑 흔든다)', [...])` 고르기: 「아노코 타고 다니기」, 「자동차 타고 다니기」(자동차가 있을 때만), 「그만두기」 → `commit({ ...state, ride })`, 짧은 토스트.
    - `toggleCar`: `rideKind(state)` 가 null 이면 지금처럼 「자동차가 아직 없어요」, 아니면 그 종류로 `player.setRiding(true, kind)`. 자동차 전용 문구는 종류에 따라 바꾼다.
    - `hud.setCar(..., rideKind(state))`, 같이 놀기 `multi.tick` 상태에 `rd`.
    - 2장 보상 뒤 처음 한 번 「집 앞에서 아노코가 기다려요」 안내.
  - `remote.js`: 위 「내놓는 것」.
- [ ] **4단계: 실행해 통과 확인** — `node --test tests/*.test.mjs` → 모두 PASS.
- [ ] **5단계: 브라우저 확인** — 키보드 모드에서 집 앞 아노코 앞에 서면 「Space 말 걸기」와 노란 고리가 뜨는지(오데 실수 재발 방지), 고르기 뒤 버튼 그림과 C 키, 6.4 빠르기로 달리기, 이야기 장면과 집 안과 낚시에서 저절로 내리기(살펴볼 곳 3), 자동차 없는 저장(살펴볼 곳 4), 집 크기 단계 바꾸기, 쫓겨난 상태. 휴대폰 크기(`resize_window` mobile)에서 행동 버튼과 탈것 버튼. 같이 놀기는 포트 5299 시험 서버로 두 탭을 이어 상대 화면에 아노코를 탄 모습이 보이는지(살펴볼 곳 5). 화면을 찍는다.
- [ ] **6단계: 커밋** — `feat: ride Anoko - after chapter 2 Anoko rests by your front door; talk to it to choose riding Anoko or the car, the ride button and C key use your choice at car speed, and friends in play-together see you on Anoko`

### 작업 9: 마무리 (전체 확인, 노션, 아티팩트)

**파일:** 코드 변경 없음(찾은 문제는 해당 작업 파일에서 고친다)

- [ ] **1단계: 전체 테스트** — `node --test tests/*.test.mjs` → 모두 PASS. 바뀐 js 마다 `node --input-type=module --check`.
- [ ] **2단계: 처음부터 끝까지 한 번** — 사용자 저장으로 2장 받기부터 집 앞 아노코 타고 숲까지. 콘솔 오류 없음(`read_console_messages`).
- [ ] **3단계: 노션** — 퀘스트 페이지에 메인 이야기 2장(여는 조건, 단계, 보상 6000원과 친밀도), 돈 페이지에 보상 6000원을 코드에서 뽑은 값으로 넣고, 서브에이전트로 넣은 글을 확인한다.
- [ ] **4단계: 올리기** — 커밋 확인 뒤 `git pull -q --rebase origin main && git push -q origin main`. 아티팩트에 바뀐 파일과 `version.json` 을 `files` 로 올린다(먼저 올라간 파일이 이전 커밋과 같은지 확인).
- [ ] **5단계: 사용자 보고** — 무엇이 바뀌었는지, 화면 사진, 게임에서 정한 것(대사, 공격, 타기, 숫자)을 한국어로.
