# 해뜰 과일 농장

클래식 지뢰찾기와 완전히 분리된 독립 게임이다. 코드는 이 폴더에만 둔다.

- 경제와 주문 규칙의 SSOT: docs/01-spec.md
- 순수 로직: src/farmHarness.js (DOM import 금지)
- 화면: src/main.js
- 수치 변경 전 docs/01-spec.md를 먼저 수정한다.
- 변경 뒤 tests/test.html, tests/ui-harness.html을 실행한다.
