# game_ghost

퍼즐 게임 프로토타입 모음. Vanilla HTML/Canvas/JS + PWA + GitHub Pages.

## 구조

```
/                       런처(허브)
shared/                 공통 모듈 (input/storage/loop/ui + 디자인 토큰)
games/<id>/             각 게임. index.html 진입점.
games/_registry.json    런처가 읽는 게임 목록
```

## 로컬 실행

```
python -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속. (file:// 직접 열기는 service worker/ESM 때문에 동작 안 함.)

## 새 게임 추가

1. `games/<id>/` 폴더 생성, `index.html`/`game.js`/`style.css` 작성
2. `games/_registry.json`에 항목 추가
3. `service-worker.js`의 `PRECACHE` 목록에 새 경로 추가, `CACHE_VERSION` bump
4. 로컬 확인 후 `git push`

## 폰/패드 테스트

1. GitHub에 push -> Pages 자동 배포
2. 폰 브라우저에서 `https://<user>.github.io/game_ghost/` 접속
3. iOS Safari: 공유 -> 홈 화면에 추가. Android Chrome: 메뉴 -> 앱 설치
4. 비행기 모드로 오프라인 동작 확인
