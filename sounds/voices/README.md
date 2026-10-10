# 친구들 목소리 파일

대사가 나올 때 친구마다 짧은 목소리를 틀어요. 이 폴더에 아래 이름의 `.mp3` 파일을 넣으면 됩니다.
없는 파일은 원래의 톡톡 말소리로 나와요. 몇 개만 먼저 넣어도 돼요.

## 형식

- mp3(아이폰 Safari에서 가장 잘 나와요), 모노, 1초 안팎
- 앞뒤 무음은 잘라 주세요
- 크기는 서로 비슷하게 맞춰 주세요(너무 크게 찢어지지 않게)
- 원작 성우 목소리를 복제하지 말고, 비슷한 느낌의 귀여운 목소리로 만들어 주세요

## 만들 소리

| 파일 이름 | 말 | 느낌 |
|---|---|---|
| usagi_yaha.mp3 | 야하! | 아주 높고 힘차게 외치기 |
| usagi_ura.mp3 | 우라! | 높고 짧게 기합 |
| usagi_haa.mp3 | 하아? | 끝을 올리며 의아하게 |
| usagi_pururu.mp3 | 푸루루루~ | 혀를 굴리며 신나게 |
| chiikawa_hee.mp3 | 헤에… | 작고 떨리는 목소리, 끝이 내려감 |
| chiikawa_hihi.mp3 | 히힛 | 수줍게 작게 웃기 |
| chiikawa_hue.mp3 | 흐에에… | 울먹이며 |
| chiikawa_hic.mp3 | 힛! | 깜짝 놀라 짧게 |
| chiikawa_e.mp3 | 에… | 아주 작게 |
| momonga_hmph.mp3 | 흥! | 새침하게 코웃음 |
| momonga_what.mp3 | 뭐야! | 높고 투정 부리듯 |
| hachiware_un.mp3 | 응! | 밝게 대답 |
| hachiware_wow.mp3 | 우와~! | 신나서 감탄 |
| hachiware_eh.mp3 | 에엣?! | 놀라서 되묻기 |
| hachiware_hehe.mp3 | 헤헤~ | 기분 좋게 웃기 |
| hachiware_hmm.mp3 | 음~ | 생각하며 |

파일을 넣었으면 알려 주세요. `src/audio/voices.js` 의 `READY` 목록에 이름을 더하고 게임에 올립니다.
