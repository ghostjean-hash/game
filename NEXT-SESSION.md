# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-06-07, lotto 다음 버전 S0-S4 구현)

lotto "메인 깔끔화" 다음 버전 구현 완료. 4갈래 전수 검사(기능/UX디자이너/프로그래머/PD) → `games/lotto/BACKLOG.md` 신설 → 사용자 의견 7건 + AskUserQuestion 결정 2건 → S0-S4 전부 구현(테스트 314/314 PASS, 브라우저 로드 JS 에러 0). **미커밋 상태**.

## 다음 세션 첫 행동 (우선순위)

1. **사용자 화면 검토 대기**: lotto 메인/기록/설정 변경을 사용자가 dev 서버(`127.0.0.1:8000/games/lotto/`) 또는 GitHub Pages(push 후)에서 확인 → 수정 방향 제시. 자비스 임의 진행 금지(사용자 "결과 보고 수정" 명시).
2. **push 결정**: GitHub Pages 확인 원하면 commit + push(main 직접 배포). 사용자 직전 질문 "GitHub Pages에서 테스트?" = push 대기. (단 sealing 시 commit+push 했으면 이미 반영 - git log 확인.)
3. **docs SSOT 일치 (필수, 미반영)**: S0-S4가 바꾼 spec 절을 코드에 맞춤. 대상 = 01_spec 4장(추천/설정 탭 구조) / 5.1.3 / 5.1.5(전략·프리셋 위치) / 5.1.6(캐릭터 카드 접힘 운세) / 5.2.2(카운트다운 단위) / 5.3(비율필터 폐기) / 5.2.5.7(fiveSets 폐기) / 5.6·5.8(당첨 기원 위치) + 02_data(매직넘버 2종 + 옵션 폐기). 화면 검토·수정 확정 후 일괄(미리 하면 재작업).
4. **draw-card.js 수동 삭제**: rm 권한 차단으로 빈 stub 상태.

상세 = `games/lotto/BACKLOG.md` (4갈래 검사 + 다음 버전 설계 + 진행 현황 6장).

## 이전 컨텍스트 (2026-06-06~07 도메인 골격)

game-hub 도메인 정식 등록 완료(domain-map sequential/html-game, search_roots 2곳, buffer 인계 merged). 상태판 봉합(M-1/M-2 완료 마일스톤). CLAUDE.md/PROGRESS.md 이름 겹침은 루트 CLAUDE.md 0장 "문서 지도"로 1차 처리(근본 = 도메인 표식 파일명 분리, 글로벌 사양 영역 buffer #217).

## 게임 작업 컨텍스트

게임별 진행 = 각 `games/<id>/PROGRESS.md` + lotto는 `BACKLOG.md`. lotto는 S0-S4 적용으로 메인 구조 변경(제목 제거 / 전략 설정 이전 / 운세 전면 / 당첨 기원 기록 탭 / 카운트다운 단위). **docs 일치 작업 전이라 코드-spec 불일치 상태 주의** (다음 세션 우선순위 3).
