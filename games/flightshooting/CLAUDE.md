# Sky Raider (flightshooting) 작업 컨텍스트

이 파일은 flightshooting 게임 작업 시 자동 로드되는 컨텍스트다. 작업 지침/핵심 정보/주의점만 둔다. 진행 로그는 `PROGRESS.md`.

# 1. 게임 정의

1.1. **한 줄**: 좌→우 전진 캐주얼 횡스크롤 비행 슈팅. 드래그 이동 + 자동발사. 모바일 우선 PWA.
1.2. **상태**: playable. 메뉴/전투/보스 등장/게임오버 전 경로 browser-shot 검증 통과.
1.3. **성격**: 캐주얼 아케이드(누구나 픽업). 하드코어 탄막 아님.

# 2. 파일 구조

```
games/flightshooting/
├── CLAUDE.md          # 이 파일
├── PROGRESS.md        # 진행 로그
├── index.html         # 메뉴 + 게임 화면
├── game.js            # 전체 게임 로직(엔티티/루프/스테이지/보스)
├── style.css          # 게임 전용 스타일
├── sound.js           # Web Audio 합성 효과음(자산 0)
└── README.md
```

# 3. 핵심 사양

3.1. **전진 방향**: +x(오른쪽). 아군 탄 vx>0, 적은 오른쪽에서 등장해 왼쪽 이동. 좌표는 CSS 픽셀(stage clientW/H).
3.2. **조작**: 캔버스 드래그(상대 이동 - 잡은 지점 대비 델타를 기체에 적용, 손가락 가림 방지) + 키보드 방향키/WASD. 자동발사(0.14s).
3.3. **화력(power) 1~5**: 발사 각도 배열(`CFG.fireAngles`)로 분기. 1=단발, 5=5way 부채.
3.4. **파워업 아이템**: 적 처치 시 확률 드롭(`CFG.drop`). P=화력+1, H=목숨+1, B=봄(화면 적 전멸+보스 데미지).
3.5. **적 3종**: drone(직진) / weaver(사인파) / gunner(조준 발사). 사양은 `CFG.enemy`.
3.6. **진행**: 3개 구역. 웨이브(`buildWaves`) 소진 + 화면 적 0 → 보스 등장 → 격파 시 다음 구역. 3구역 보스 격파 = 전체 클리어.
3.7. **보스**: 상하 유영 + 2패턴(부채 산탄 / 조준 3연발) 번갈아. HP = baseHp + (구역-1)*hpPerStage.
3.8. **목숨 3개**: 피격 시 목숨-1 + 화력-1(최소1) + 무적 1.6s 깜빡. 0이면 게임오버. localStorage 베스트.

# 4. 작업 시 주의

4.1. **[hidden] 덮임 주의(#190)**: 화면 전환용 `.menu-screen`/`.game-screen`은 `display:flex`가 브라우저 기본 `[hidden]{display:none}`을 명시도로 덮는다. style.css에서 `[hidden]{display:none !important}`로 확실히 눌러야 두 화면이 겹치지 않는다.
4.2. **sr-only 자체 정의**: 공유 CSS에 sr-only가 없다. topbar의 접근성 제목 숨김은 style.css에서 직접 정의(tetris도 동일 패턴).
4.3. **밸런스 상수는 `CFG` 한곳**에. 난이도 조정은 여기서.
4.4. **DPR·리사이즈**: `resize()`가 stage 부모 rect 기준으로 canvas 크기 재계산. startGame에서 gameScreen 표시 후 호출해야 세로 공간 정상 확보.
4.5. 진행/완료/다음 작업/미해결은 `PROGRESS.md` 참조.
