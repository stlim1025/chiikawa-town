# 치이카와 마을 생활

브라우저에서 도는 3D 마을 생활 게임(Three.js 0.160, 빌드 없음).

## 실행

```bash
python3 -m http.server 8765
# http://localhost:8765/index.html   (테스트 도구는 ?debug)
```

## 테스트

```bash
node --test tests/*.test.mjs
```

## 새 버전 알림

커밋할 때마다 `version.json` 이 그 시각으로 바뀌고(`.githooks/pre-commit`), 게임은 이 값이 바뀌면 화면 위에 「새 버전이 나왔어요」 알림 띠를 띄워요(`src/ui/update.js`).
저장소를 새로 받은 PC 에서는 훅을 한 번 켜 주세요.

```bash
git config core.hooksPath .githooks
```

## 구조

| 폴더 | 내용 |
| --- | --- |
| `src/core` | 게임 규칙(상태 · 일감 · 자격 · 친구 · 퀘스트 · 집 · 토벌 · NPC 두뇌 `brain.js` · 대사 `villagetalk.js`) |
| `src/world` | 마을 · 풀 · 열매 · 몬스터 · 친구 집 안 |
| `src/actors` | 내 캐릭터 · NPC 움직임(`npcs.js`) · 모델 |
| `src/ui` | HUD · 창 · 마을폰 · 시험 · 라멘 알바 · 그림 |
| `src/main.js` | 모든 것을 잇는 곳(마을 살림 · 대화 · 토벌 · 저장) |
| `tests` | 규칙 단위 테스트 |
