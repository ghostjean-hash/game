# Sky Raider (flightshooting) 진행 로그

## 2026-07-06 - 신규 게임 착수 + 첫 playable

### 기획 결정 (사용자 확정)
- 성격: 캐주얼 아케이드 (손가락 드래그 이동 + 자동발사)
- 진행: 스테이지 클리어 + 보스 (3개 구역)
- 조작: 드래그 이동 + 자동발사 (터치 우선, 키보드 보조)
- 성장: 파워업 아이템 (P 화력 / H 회복 / B 봄)
- 방향: 사용자 명시 "횡스크롤" → 세로 스크롤이 아닌 좌→우 전진(그라디우스형)으로 구현

### 완료
1. 파일 셋업: index.html / game.js / style.css / sound.js / CLAUDE.md / README.md
2. 게임 코어: DPR 대응 canvas, 별 배경 스크롤, 드래그(상대 이동)+키보드, 자동발사, 공유 loop.js 연결
3. 엔티티: 적 3종(drone/weaver/gunner), 아군/적 탄, 파워업 드롭·획득, 원-원 충돌, 목숨/무적
4. 진행: 3구역 웨이브 스포너, 보스(상하 유영 + 2패턴), 스테이지 클리어/게임오버/전체 클리어, 점수+베스트
5. 효과음: Web Audio 합성(자산 0) - 발사/피격/폭발/파워업/봄/보스격파/클리어/게임오버
6. `games/_registry.json` 등록 (id flightshooting, accent #22d3ee, status playable)
7. game.js에서 registerServiceWorker 호출(운영 환경만)

### browser-shot 검증 (실제 화면)
- 메뉴 화면: 기체 아이콘 + 타이틀 + 시작/조작법 + 베스트 정상
- 전투: 기체·총알·엔진불꽃, 드론 접근, P 파워업 획득(power 1→2) 정상
- 게임오버 모달: "격추당했다 / 점수 / 최고기록 / 다시하기·홈" 정상
- 보스 등장: "구역 1 보스" 체력바 + 보스 렌더 정상

### 발견·수정한 결손
- [수정] `.menu-screen`/`.game-screen`의 `display:flex`가 `[hidden]`을 덮어 메뉴+게임 화면이 동시 표시 + canvas 세로 축소(420px). `[hidden]{display:none !important}`로 정정 → canvas 761px 정상 (#190 유형).
- [수정] 공유 CSS에 sr-only 미정의로 접근성 제목이 화면 노출. style.css에 sr-only 직접 정의.

### 남은 것 / 후보
- 보스 격파 → 다음 구역 전환은 로직 검증만(자동 회피로 보스 처치까지는 미도달). 실플레이 확인 권장.
- 구역별 보스 패턴 차별화(현재 3구역 동일 2패턴, HP만 증가).
- 모바일 실기기 터치 감도 확인.
- 홈 카드 아이콘/썸네일(현재 accent 색만).
