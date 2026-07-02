# Nonogram

행/열 숫자 힌트로 칸을 채워 숨은 픽셀 그림을 완성하는 로직 퍼즐.

## 플레이

- 허브: https://ghostjean-hash.github.io/game/ 에서 Nonogram 카드 선택
- 직접: https://ghostjean-hash.github.io/game/games/nonogram/

## 로컬 실행

저장소 루트에서:

```
node scripts/dev-server.mjs 8000
```

브라우저에서 http://127.0.0.1:8000/games/nonogram/ 접속.

## 테스트

`games/nonogram/tests/test.html`을 브라우저에서 열면 전체 테스트가 자동 실행되고 상단에 PASS/FAIL이 표시됩니다.

## 배포

main 브랜치 push → GitHub Pages 자동 배포.
