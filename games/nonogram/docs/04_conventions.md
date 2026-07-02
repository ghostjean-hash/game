# 04. 컨벤션 (conventions)

> 네이밍 / 주석 / 테스트 / 디자인 토큰 사용 규칙의 SSOT.

## 1. 네이밍

(미정 - 원칙: camelCase 함수, UPPER_SNAKE 상수)

## 2. 코드 규칙

- ES Modules, import는 상대경로 + `.js` 확장자 명시
- `src/core/`는 순수 함수. DOM / Canvas / window / document import 금지
- 상태 불변 - 변경은 새 값 반환

## 3. 색상 / 토큰

- 게임 데이터 색: `src/data/colors.js` 상수만
- UI 색 / 간격 / 폰트: `styles/tokens.css` CSS 변수만
- 인라인 매직 값 금지

## 4. 테스트

- `tests/test.html` 열면 전체 자동 실행
- `src/core/` 모듈은 테스트 필수, 핵심 로직 변경 시 테스트 함께 수정
