# Blessed Lotto

## 1. 게임 한 줄
한국 6/45 로또 번호를 캐릭터 시드로 추천하는 PWA. 당첨 확률 향상이 아닌 선택의 서사화.

## 2. 작업 워크플로우 (반드시 지킬 것)
1. 사용자 요구사항을 받으면, 먼저 어떤 문서를 수정해야 하는지 식별
2. 해당 문서를 수정 (단 하나의 진실의 원천)
3. 변경된 문서 기반으로 코드 수정
4. 테스트 코드도 함께 수정

## 3. 문서 인덱스
- docs/01_spec.md - 게임 규칙, 조작, 화면 흐름
- docs/02_data.md - 게임 데이터, 수치, 색상
- docs/03_architecture.md - 폴더/모듈 구조, 의존성 규칙
- docs/04_conventions.md - 네이밍, 주석, 테스트, 토큰 규칙

## 4. 절대 규칙
- 게임 로직과 렌더링은 절대 한 모듈에 두지 않는다
- 매직 넘버 금지. 모든 수치는 docs/02_data.md 정의 상수에서
- core/는 DOM/Canvas/window/document 일체 import 금지
- 핵심 로직 변경 시 반드시 테스트 코드 업데이트
- docs와 코드가 충돌하면 docs가 진실. 코드를 docs에 맞춰 수정

## 5. 기술 환경
- ES Modules 직접 사용. 빌드/번들러/TypeScript 금지
- import는 상대경로 + .js 확장자 명시
- 외부 라이브러리 최소화. 필요시 CDN ESM 빌드만
- 영속 데이터는 localStorage, 키 prefix는 lotto_

## 6. 색상과 스타일
- 게임 데이터(블록 색 등): src/data/colors.js 상수만 사용
- 디자인 토큰(UI 색/간격/폰트): styles/tokens.css 변수만 사용
- 인라인 매직 값 금지

## 7. 실행
- 로컬: `python -m http.server` 후 localhost:8000
- 테스트: tests/test.html을 브라우저에서 열기
- 배포: main 브랜치 push → GitHub Pages 자동 배포

## 8. 변경 이력
- 2026-05-01: html-game v0.1 적용 (초기 셋업)
- 2026-05-01: html-game v0.2 마이그레이션 (8.4 항목 일반화 반영)
