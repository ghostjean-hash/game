# Sky Raider (flightshooting) 작업 컨텍스트

flightshooting 게임 작업 시 자동 로드되는 컨텍스트. 인덱스 + 절대 규칙 + 주의점. 진행 로그는 `PROGRESS.md`.
html-game 표준 v0.3.2 적용(문서 우선 워크플로우 - docs가 SSOT).

# 1. 게임 정의

1.1. **한 줄**: 세로(종) 스크롤 캐주얼 비행 슈팅. 플레이어 하단, 적은 위→아래. 드래그 이동 + 자동발사. 모바일 우선 PWA.
1.2. **상태**: playable. 표준 구조(src 모듈 분리 + docs + tests) 적용.
1.3. **성격**: 캐주얼 아케이드(누구나 픽업). 하드코어 탄막 아님.

# 2. 파일 구조

```
games/flightshooting/
├── CLAUDE.md / PROGRESS.md / README.md
├── index.html            # 메뉴 + 게임 화면
├── .standard             # html-game v0.3.2
├── styles/main.css       # .shooter 스타일 (tokens는 shared 재사용)
├── src/
│   ├── main.js           # 엔트리: 상태·루프·플로우·HUD·이벤트 소비
│   ├── data/             # numbers.js(CFG), colors.js(COLORS) - 순수 상수
│   ├── core/             # fire·parts·waves·stars·spawn·world·autopilot - 순수 로직
│   ├── render/view.js    # 캔버스 그리기 전용
│   ├── input/controls.js # 드래그·키보드
│   └── audio/sound.js    # Web Audio 합성
├── docs/                 # 01_spec ~ 04_conventions (SSOT)
└── tests/                # test.html + runner.js (core 순수함수)
```

# 3. 문서 인덱스 (SSOT - 코드보다 문서 우선)

- `docs/01_spec.md` - 게임 규칙, 조작, 코어 루프, 보스, 화면 흐름
- `docs/02_data.md` - 수치(numbers.js)·색상(colors.js) 스키마와 위치
- `docs/03_architecture.md` - 폴더/모듈 구조, 의존성 방향, 데이터 흐름
- `docs/04_conventions.md` - 네이밍, core 순수성, 매직넘버, 테스트 규칙
- `docs/05_power-parts.md` - 3계통 파워 파츠(전방 화력·옵션기·에너지존) 설계
- `docs/06_boss.md` - 보스 부위 파괴형 + 다중 스타일 설계안(설계 단계, 구현 미착수)
- `docs/07_balancing.md` - 밸런싱 종합(무기·적·보스·드롭 수치 정리 + 조정 이력)
- `docs/08_deep-space-stages.md` - 21~30 스테이지 확장 + 완전 다른 형태 신규 적 설계안(설계 단계, 구현 미착수)
- `docs/09_friend.md` - 친구 비행기(어린이 모드 전용): 등장 말풍선·자율 유영·메인 총알 10단계·아이템 공유·개별 HP·부활
- `docs/10_world-tour.md` - 세계 여행 스테이지 데이터 구조(54국+2여행지=56, 3파일 분리) + 새 국가 추가 절차
- `docs/13_background-prompts.md` - 공용 배경 풀 16종 이미지 생성 프롬프트(국가별 완성본 대신 풀+오버레이 조합)

# 4. 절대 규칙 (표준 4.3 + 게임 고유)

4.1. **게임 로직과 렌더는 절대 한 모듈에 두지 않는다.** 로직 core/, 그리기 render/.
4.2. **core/는 DOM/Canvas/window/document/오디오 import 금지.** 순수 함수로 `game` 상태만 변이. 부수효과는 `game.sfx`(사운드 이름)·`game.events`(화면 전환 신호)로만 알리고 main이 소비.
4.3. **매직 넘버 0.** 수치는 `src/data/numbers.js`(CFG), 게임 색은 `src/data/colors.js`(COLORS). 예외: sound.js 합성 파라미터.
4.4. 핵심 로직(발사/웨이브/충돌) 변경 시 `tests/`의 대응 테스트 함께 갱신.
4.5. docs와 코드가 충돌하면 docs가 진실.

# 5. 핵심 사양 (상세 → docs/01_spec.md)

5.1. **전진 방향**: 위쪽(-y). 플레이어 하단(yRatio 0.82), 적 위→아래 낙하. 아군 탄 vy<0.
5.2. **조작**: 드래그 상대 이동(손가락 가림 방지) + 키보드. 자동발사 0.14s.
5.3. **4계통 파워 파츠**: 전방 화력(P, `fire.js` frontSpec, front 1~40 - 1~8 탄 수 균일, 9~40 발별 진화 4티어) + 옵션기(S, `parts.js` 좌우 각 4대 전부 레이저) + 에너지존(E, `parts.js` 레벨 0~5, 0.5s tick) + 꼬리 비행기(T, `parts.js` 뒤 최대 4대 유도탄, 4대 후 1~4번 순차 무기 진화 4단계). 전용 아이템으로 성장, 피격 시 마지막 얻은 파츠 1개 손실(역순). 모든 발사체 데미지는 티어·크기 비례. 상세 → docs/05.
5.4. **진행**: 10구역. 1~9 웨이브+중보스(호위 동반), 10 최종보스. 화력·목숨은 구역 넘어가도 유지.
5.5. **화면 전환 타이머**: setTimeout 아닌 dt 기반(pendingTimer/transitionTimer/winTimer) - 일시정지 안전.

# 6. 작업 시 주의

6.1. **[hidden] 덮임(#190)**: `.menu-screen`/`.game-screen`의 `display:flex`가 `[hidden]{display:none}`을 명시도로 덮는다. styles/main.css에서 `[hidden]{display:none !important}`로 눌러야 화면 안 겹침.
6.2. **sr-only 자체 정의**: 공유 CSS에 sr-only 없어 styles/main.css에 직접 정의.
6.3. **DPR·리사이즈**: main.js `resize()`가 stage 부모 rect 기준. startGame에서 gameScreen 표시 후 호출해야 세로 공간 확보.
6.4. **사운드 톤은 실청 영역**: browser-shot 무음이라 재생 호출 무결성만 자동 확인 가능.

# 7. 변경 이력

- 2026-07-06: html-game v0.3.2 적용 (game.js 단일 → src 모듈 분리 + docs + tests + 전체화면 버튼).
- 2026-07-07: 단일 화력(1~20) → 3계통 파워 파츠(전방/옵션기/에너지존) 재구조화. `core/parts.js` 신설, docs/05.
- 2026-07-08: 전방화력 만렙(P8) 후 탄 모양 4단계 진화(원→타원→긴형→링) + 단계당 데미지 상승. `bullet.shapes`/`front.shapeDmg`, docs/05 1.1.1.
- 2026-07-08: 파워 파츠 3계통 → 4계통 재설계. P 1~8 개별 탄 균일화 + 9~40 발별 순차 진화(차가운색 4티어), S 8대 전부 레이저 통일(미사일 제거), 꼬리 비행기(T) 신설(4대 후 1~4번 순차 무기 진화), 발사체 데미지=크기·티어 비례. `frontSpec` 재설계·`parts.js` stepTail·numbers/colors·view drawTail·HUD 5칸·drop 6종. 테스트 51 PASS. docs 01·02·05.
- 2026-07-08: 4계통 위 개선 3건 - 자동이동 떨림 제거(autopilot 안전 시 12px 불감대) + 레이저를 흰-보라 빔으로 메인탄과 구분 + 발별 진화 탄을 색만이 아닌 형태(원→타원→긴형→링)로 구분. 발별 순차 구조는 유지.
- 2026-07-09: 무기 명칭 확정(메인 총알/사이드 총알/유도탄, 진화) + 역할·강화 재편. 메인 총알 = 직진 + 레이저식 강화(beam), 사이드 총알 = 부채 확산 + 진화(원→타원→빔→링, 메인에서 이관). 아이템 매핑(P→메인, S→사이드) 유지. 회복 파워업 하트 자체 렌더. 버그 2건(인트로 중 아이템 진행 / 무적 중 획득). core 54 PASS. docs/05.
- 2026-07-09(후속2): 밸런싱 4건 조정(사이드 총알 크기 절반·부채각 절반 / 쿨타임 메인+사이드 10%↑ / 메인 총알 속도 20%↓, numbers.js). 보스 부위 파괴형 + 스타일 4종 설계안 docs/06_boss.md 신설(설계만, 구현 미착수). 밸런싱 종합 docs/07_balancing.md 신설. core 54 PASS + 캡처.
- 2026-07-09(후속3): 메인 총알 발별 진화 재전환(각진 세트 다이아→화살→십자→별, 사이드는 둥근 진화 유지 - 외형 세트로 구분) + 강화1단계 다이아 크기 절반. 존 → 펄스파(퍼지는 링이 닿을 때만 피해, 5단계 강화). 유도탄 쿨타임 3배(0.9→2.7)+외형 메인과 통일. HUD 파츠 라벨을 아이템 배지(P·S·E·T)로. 하트 대칭 곡선. core 56 PASS + 캡처. docs 01·05·07 동기화. SW v158.
- 2026-07-09(후속4): 30 스테이지 확장(20→30) + 이질 기계 적 4종(turret 포대·prism 결정·mine 기뢰·warper 왜곡체, 각진 형태로 기존 정령류와 대비) + 기계 중보스(21~29) + void 체력 배수. autopilot 사람화 - 조작 빈도 제한(매 프레임→주기) + 인간 실측 리서치 기반 실력 4티어(반응지연·조준오차·예측지평·위협수, 기본 초보). 환경설정 화면(실력 선택+치트 on/off) + 치트 박스(드래그·속도 ×1~8·무적·드랍 확률/종류·접기). core 60 PASS + 캡처. docs 01·08·research 신설/동기화. SW v159.
- 2026-07-10: 무기 외형 개편 + 난이도 모드. 메인 총알 각진 세트(다이아→화살→십자→별) → 레이저 빔(티어↑ 길이·굵기·흰 코어 마디 + V자 대형으로 격자 뭉침 해소, `bullet.mainBeams`/`front.vStagger`, view.drawMainShape 제거). 유도탄 십자 공유 → 로켓 실루엣(`view.drawRocket`) + 크기 40% 축소. 시작 화면 어린이/일반 모드 분리(`CFG.difficulty`, 어린이는 적·보스 발사 간격 2.2배로 총알 덜 쏨, world enemyFireMul). core 60 PASS + 캡처. docs 01·05·07 동기화. SW v169.
- 2026-07-10(후속2): 6건 묶음 - 문서 "20→30" 정정 + 어린이 모드 적 조준 연발 정중앙 단발화(`difficulty.kid.enemyShotsMax`) + 적 출현 가로 영역 중앙 고정폭(`field.width`, `fieldBounds`, 이후 480→960) + 2차 이질 적 coil(전격 코일 아크 쌍)·serpent(기계 뱀 머리 약점 체인) + **보스 부위 파괴형 전면 개편**(코어+부위, `bossStyles` 4종 함선/생체/위성/파수꾼, 방어구 부수면 코어 노출·포탑 부수면 패턴 정지·sentinel 광폭화). core 86 PASS. SW v172·v173.
- 2026-07-12: 원격 조정 4건 - 유도탄 0강화 크기↑(`missileR` 1.2→2.6·`missileRGrow` 0.3→0.16, 만렙 크기 유지) + 메인 총알 단계색 대비↑(`mainTier` 명도 교차 재배치) + 보스 등장 왼쪽 점프 제거(등장 중 x=W/2 고정 + 완료 시 `boss.t`=0 리셋) + 어린이 모드 방사탄 감축(`radialMul` 0.4 손잡이 신설, 기뢰 파편·결정체 반사 감축). core 89 PASS + 캡처. docs 01·02·05·07 동기화.
- 2026-07-12(후속): 원격 조정 3건 - 어린이 모드 목숨 5개(`difficulty.maxLives` 일반3/어린이5 + HUD 하트 5칸 + `.life[hidden]` CSS) + 메인 총알 속도 강화 무관 고정(`playerFire` speedMul 제거) + 메인 총알 외형 전면 재설계(색만 바뀌는 단계 제거, 매 단계 형태 요소 누적 실선→코어→줄무늬→마디→화살촉→플라즈마, 빔 폭을 laneGap 안 고정해 옆칸 침범 제거, `mainWPer` 0.11→0.2). core 89 PASS + 캡처. docs 01·05·07 동기화.
- 2026-07-12(후속2): 원격 무기 외형 다듬기 - 사이드 크기 tier10 2/3 축소(drawSideShape 계수 0.7→0.22) + 메인 총알 단계별 다른 무늬 패턴 복원(마디·실선·톱니·구슬·마름모·물결·이중·나선·화살촉·링·플라즈마, 예전 0/2/6→새 0/1/2, 모든 무늬 cap(laneGap/2)로 침범 방지, mainLenPer 1.2→1.5) + 유도탄 형태(삼각→화살표→로켓) + 색 11색화(tailMissile). core 89 PASS + 캡처. docs 05·07 동기화.
- 2026-07-13(원격 4차): 조정 2건 - 메인 총알 강화 0단계 마디 점 5→4개로 줄이고 간격 확대(view.drawMainBeam t===0, `pd=h*0.13`) + 보스 좌우 유영 점진 가속(등장 직후 매우 느리게→`bobRamp` 7초에 걸쳐 최대 속도 `bobFreq`까지, `boss.bobPhase` 위상 직접 누적, 진폭 불변, numbers/world.js). core 89 PASS.
- 2026-07-14: 조작·AI 3건 - 플레이 중 뒤로가기 이탈 버그 수정(게임 화면 `←`가 허브 직행 링크라 게임 중에도 이탈 → `#game-home` + history.pushState/popstate로 게임 중 뒤로가기는 모드 선택으로, 모드 선택에서만 허브로. index.html·main.js) + 보스 좌우 유영 속도 절반(`bobFreq` 0.3→0.15, 진폭·램프 불변) + **자동 플레이 AI 판단 구조 교체**(한 걸음 그리디 → 2단계 빔서치: 후보로 seg=sim/2 굴려 도착점 구한 뒤 그 지점에서 다음 수까지 이어 평가, 첫 수 완전 생존 상위 BEAM6만 확장, 막다른 구석 자진 회피, autopilot.js `DEPTH`/`BEAM`·simulate tOff·decideTarget 재작성). core 89 PASS + 후반 구역21 자동 8초 생존.
- 2026-07-14(후속2): 친구 비행기 실플레이 다듬기 5건 - 완전 독립 이동(플레이어 기준 전면 제거, 자기 세로 밴드 homeYRatio에서 가까운 적 추적, sideOffset/minGap/aimBias 삭제) + 총알 좁은 부채(만렙 ≈80°→25°)·최소 크기(bulletR 5→3) + 총알 다크 웜톤(밝은 골드/흰색 → 흐린 탄·구리, 흰 코어 제거) + 플레이 중 가끔 잡담(chatter 8종, 6~10초마다). core 102 PASS + 캡처(독립 위치·다크 총알·"잘한다!" 잡담). docs/09·numbers·colors·friend·view 동기화.
- 2026-07-14(후속): 어린이 모드 친구 비행기 신설(docs/09). 왼쪽에서 말풍선("안녕!"→"난 친구야"→"같이 게임하자!")으로 등장해 플레이어 옆을 자율 유영(가까운 적 조준)하며 함께 싸운다. 메인 총알만 보유(강화 10단계로 부채꼴이 넓어짐, 따뜻한 색 별 모양 = 플레이어 냉색 빔과 구분). 아이템 공유(누가 먹든 나 계통 + 친구 메인 함께 강화), 점수 공유. HP 하트 5개(플레이어와 별개 풀) - 피해는 각자, 회복(H)은 공유, hp 0 기절 후 H로 부활(level 유지). 강화 정보 HUD 미표시. `core/friend.js` 신설(순수), world 연동(stepFriend·grabItem 공유·개별 피격), view drawFriend/drawFriendShot, numbers/colors friend, kind 'fmain'. 일반 모드 무영향. core 101 PASS + 캡처(등장 말풍선·만렙 부채·일반 모드 무친구).
- 2026-07-15: 친구 비행기 키위새 전면 개편 - 외형(갈색 키위새·긴 부리, drawFriend/colors), 무기(부채→부리 직선 발사체 drawFriendShot, 최대 4발, 개별 외형 고정·데미지만 강화, 속도 CFG.bullet.speed, 만렙 벽 도입→"변경 금지" 번복 제거, 어두운 회색), 이동 AI(autopilot.decideTarget 공유·actor/opts/tier 파라미터화·플레이어 회귀0, 친구 clearWhenSafe:false+aiSim 0.7+homeYRatio 0.80, 좌우 분담 opts.mate·보스전 해제), 대사 3종(맞음/부활/연속처치 칭찬)+빈도 완화(chatterEvery 18·praiseCooldown 12), 합체 발광(drawShotMerge), 시작 위치 화면 안(startXRatio). core 105 PASS. docs/09 동기화.
- 2026-07-15(후속2): 코드 런타임 최적화 3묶음(게임 동작 결과 100% 보존, 성능만 개선). A 렌더/계산 낭비 제거 - view.drawBackground 성운 gradient를 {stage,W,H} 키로 캐싱(프레임마다 재생성 제거)·drawStars 상수 fillStyle 루프 밖·stars 속도(40+z*140) initStars에서 spd 사전계산·main.syncHud 하트 노드 querySelectorAll을 모듈 1회 조회. B 에너지존 판정 - tickZone pulse.hit 배열(includes O(n))→Set(has O(1))·적별 플레이어 거리를 pulse 무관하게 프레임당 1회 계산. C 목록 제자리 압축 - world.js retain(arr,keep) 헬퍼 도입해 매 프레임 새 배열로 갈아치우던 filter 10곳(enemies/bullets/eBullets/powerups/particles) 전부 in-place로(프레임당 재할당 0)·updateBoss enrageMul filter().length→카운트 루프·main.setTailHud map/spread→루프. 결과 바꾸는 2건(유도탄 표적 캐싱·아군탄 충돌 broad-phase)은 보존 원칙 위배로 제외(사용자 결정 대기). core 105 PASS + 실플레이 2모드 캡처. 코드만 변경(docs 무변경).
- 2026-07-16: 홈 난이도 개편 + 캐릭터/표정/보스 강화 + 유도탄 버그. (1) 난이도 4단계(easy/normal/hard/insane = 적 총알·체력·목숨 동반 조절, `enemyHpMul` 신규) + 어린이 모드 폐지(배려는 '쉬움'에 흡수) + 친구 동행·자동 플레이 독립 토글 + 자동 하이브리드(손대면 내 조작·놓으면 0.5s 후 자동, `autoAssist`/`manualTimer`/`dragging`, `resumeDelay`). (2) 캐릭터 바푸리 개편(동그란 몸+붙은 손발+붉은 O입+작은 눈+얼굴 하단 시선) + 인게임 표정(`view.drawFace` 공용: 피격 울음·획득 웃음, 바푸리·키위 공통, `numbers.emote`) + 제목 "바푸리의 모험"(_registry 포함) + 홈 UI(난이도 세로·친구 키위 아이콘·자동 로봇 확대·색 3분리·선택 체크마크·조작법 환경설정 이관·자동 AI 기본 프로). (3) B 폭탄 시각화(도화선·불꽃·획득 섬광 `bombFlash`) + 죽는 연출(키위 3중 폭발, 플레이어 폭발 후 `dying` 1.1s→팝업, state 'dying' 신설). (4) 유도탄 소실 버그 수정(`capBullets` 미사일 보호 - 상한 초과 시 직진탄만 제거). (5) 보스 강화판(각 10구역 5+5, 후반 부위 추가+발사 단축, hp 정규화, `bossUpgradeFrom`, 30 최종 제외). core 105→108 PASS + 캡처. docs 본문 동기화 완료(후속 turn - 01·02·03·04·06·07·09).
- 2026-07-17(야간 자율): 세계 여행 확장 + 서울 배경 + 31~40 스테이지 신설. (1) 지도 다듬기 다건 - 필리핀·태국 등 표시 보강(worldmap)·목적지 30→50개·시작도시 몽골/대만 포함+이웃 다수 선택·국가명 수도 위+폰트 70%·대륙 하이라이트·싱가포르(우)/말레이시아(좌) 라벨 분리·근접 도시 오선택 버그·중간 저장/이어하기(저장 없으면 비활성)·아이패드 핀치줌·메인총알 속도 120%(키위 포함). (2) 1구역 서울 배경 신설(`src/data/scenes.js`·docs/11, 남산타워·기와·한강, 테마 없는 나라는 우주 배경 유지). (3) 31~40 스테이지 확장(에이전트 위임, docs/12) - stageCount 40·최종보스 40구역·빛/에너지 생명체 적 wisp/bloom/whale 순수 추가. core 123 PASS. 미커밋 산출물을 다음 세션 /jc로 봉합. 잔여: 대만 표시 정책·docs 01~09 동기화·배포.
- 2026-07-16(후속2): 세계 여행 스테이지(초4 교육) 신설. 30개 구역 = 한국 출발 지구 한 바퀴 나라·수도 여정(B안: 갈림길 이웃 선택+서진). 보스 격파(폭발 1.5초 `bossDeathTime`)→세계지도→이웃 목적지 선택→비행 연출→다음 구역. 실 국경 데이터 177개국 대륙별 색칠 + 드래그 스크롤·확대축소·홈버튼·전체 수도 2줄 라벨·방문 유지. 신규 `src/data/worldmap.js`(대륙별 path)·`countries.js`(30개국 이웃 그래프), `CFG.tour`·`COLORS.tour`·`COLORS.heart`, main.js `state='map'`+지도 오버레이, 치트 "지도 열기" 테스트 버튼. 부수: 홈·인게임 바푸리 얼굴 통일(정면·채운 세로타원 입), HUD 나라·수도(크게 밝게)+구역 숫자(작게 어둡게, 스테이지명 문자열 제거), 하트 고품질(그라데이션+광택), 조작법 텍스트 삭제, 국경선 강화. 버그: 목적지 터치 불가(포인터 캡처)·선택 시 라벨 소실 수정. core 108 PASS + 캡처. 미해결: 대만·필리핀 방향·docs/10 미작성·배포. (docs SSOT 역전 - 코드 우선 진행분은 확정 후 docs 반영 필요.)
- 2026-07-17(후속): 보스 격파 무한폭발 버그 수정(`defeatBoss` 재진입 가드 - 사망 연출 중 코어 hp<=0 유지로 매 프레임 재격파돼 폭발·드롭·점수 무한반복, 회귀 테스트 124 PASS·가드 무력화 시 1 FAIL 재현) + URL 파라미터 치트 전면 삭제(applyDevHook/autoStartHook, 규칙 "치트는 버튼으로") + 치트 버튼 신설(보스 소환·무기 강화).
- 2026-07-17(데이터 재편): 세계 여행 나라 구성 재편(ChatGPT 초안 반영). 54개 국가+2개 여행지=56스테이지로 정리(제외10: 가나·세네갈·알제리·오스트리아·포르투갈·쿠바·스위스·캄보디아·폴란드·스웨덴 / 추가10: 방글라데시·이라크·이스라엘·우즈베키스탄·핀란드·벨기에·콜롬비아·파나마·콩고민주공화국·파푸아뉴기니). 데이터 3파일 분리 - `countries.js`(라우팅: next 자동생성·범위초과 차단, type/parentCountry, 발리·하와이 travel), `countries.education.js`(교육 메타 6필드, 교과 개념·중복 회피·분쟁종교 중립), `backgroundPools.js`(공용 배경 풀 16종+56 오버레이 매핑). 배경은 국가별 완성본 대신 풀+오버레이 조합(docs/13 생성AI 프롬프트, docs/10 데이터구조·확장절차 신설). 콩고민주공화국 이름 통일(worldmap "콩고 민주 공화국"→"콩고민주공화국", 선택 하이라이트 매칭 복구). 러시아 cont Asia 유지. 검증: countries 정적 0 FAIL + backgroundPools 0 FAIL + 지도 실플레이(이웃 후보·라벨·회귀0). 배경 이미지는 placeholder(프롬프트만). 명칭 "56개국" 금지→"54국+2여행지".
- 2026-07-17~18(디오라마 전환): 실플레이 버그 3건 수정(보스 무한폭발 `defeatBoss` 재진입 가드+회귀테스트 124 PASS / URL 치트 전면 삭제+치트버튼 / 세계여행 56국 재편) push 완료. 이후 배경 방식을 공용 하늘(A안)→**프리렌더 2.5D 디오라마**(비스듬 항공시점·중앙 한강 이동축·좌우 랜드마크·인트로 줌인→플레이 줌아웃 같은 공간)로 전환 결정. 산출(로컬 커밋, 배포 보류): `docs/WORLD_DIORAMA_SPEC.md`·`prototype/diorama-proto.html`(청크 세로연결+오버랩+줌 기술 프로토타입, placeholder)·`docs/KOREA_DIORAMA_ART_SPEC.md`·`prototype/pitch-compare.html`·아트 SSOT 6문서(`docs/ChatGPT_World_Diorama_Art_MD_MASTER/`)·`prototype/image-review.html`(실제 이미지 검수용). 카메라 각도 숫자 폐기, 최신 승인 이미지 인상 우선. 미커밋 보류: A안 배경연결(view/backgroundPools/assets)·image-review. 다음: ChatGPT가 `KR-day-concept-v01.png` 제작→검수. (Claude Code 답변 표식 글로벌 규칙 buffer 인계.)
- 2026-07-18: KR 디오라마(`assets/diorama/KR/KR-day-concept-v01.png`)를 1스테이지(한국) 실게임 배경으로 연결 + 실플레이 검수. `view.js`에 디오라마 전용 로더·`drawDiorama` 추가 - 단일 이미지 1장에 담긴 스테이지 여정(하단 경복궁→상단 항구)을 화면보다 세로 1.35배로 그려 여백을 만들고 18초에 걸쳐 아래→위로 1회 통과(A안 무한반복과 달리 도착 후 항구서 정지). 한국일 때만 분기(나머지 스테이지 배경 무영향), 디오라마 뜨면 옛 서울 실루엣 생략. `DIORAMA_ZOOM`/`DIORAMA_JOURNEY`/`DIORAMA_SRC`는 view 지역 연출 상수(테스트 확정 후 numbers.js 이관 검토). browser-shot 4장(출발·중반·도착·자동플레이 생존)으로 여정·방향·전투 가독성 확인, 이미지 HTTP 200, core 124 PASS. 이전 세션 미커밋 배경 산출물(backgroundPools·assets·image-review) 함께 봉합. 배포(push)는 사용자 durable "검수 후 배포" 보류 유지 - 스크롤 속도·확대율 튜닝과 배포 여부 사용자 결정 대기.
- 2026-07-21: 홈·인게임 UI 대개편 + 무기 6발/6대 재조정. (1) 홈 전 비율(9:16·3:4·4:3·16:9) fit 재설계 - 스크롤 배제(게임은 스크롤 UI 안 씀), 간격·크기 화면높이 비례(clamp) + 가로모드 좌우 2열(`@media (orientation: landscape)`), 4비율 시작·환경설정 버튼 노출 PASS. (2) 화면 아이콘 문자 전부 SVG화 - 뒤로가기 화살표(메뉴·게임)·치트 렌치·보스 방패(CSS data-uri)·난이도 체크·치트 접기 chevron(classList 토글)·지도 확대축소, 모달 ★ 텍스트 제거. (3) 게임 HUD 진짜 투명 - `.game-screen .topbar`를 캔버스 위 `position:absolute` 오버레이 + `.game-screen position:relative`로 캔버스 전체높이 확장(뒤 게임 비침). 1차 배경만 `transparent`는 topbar가 세로공간 차지해 남색 띠 잔존 → 오버레이로 재수정. (4) HUD 정리 - 지역명(`#hud-loc`) 삭제 구역만, 아이템 배지(P/S/E/T) 아래 강화숫자 세로배치(`.mh.row` column) + 70% 축소·가변폭 자간압축(로마숫자 폭 절약). (5) 스피커·전체화면 홈 우상단 이동(인게임 HUD 제거)+홈 상단바 여백 축소로 fit 회수. (6) 메인총알 8→6발·사이드 옵션기 8→6대·발별진화 6스텝(`front.maxShots`/`option.maxPerSide 3` CFG화, `setFrontHud`/`setEvoHud` 티어계산 8→6 누락 수정 포함), core 124 PASS + 발사 캡처, docs 01·02·05·07 6발 동기화(에이전트 위임). (7) 월드맵 - 지도 풀사이즈 + 제목/힌트 알약 오버레이(세로 스택 해체), 도착카드 화면중앙→도시 위 표시(`placeCardOverCity` getScreenCTM, 상단 도시는 자동 아래로), 발리 표기 인도네시아(위)·발리(아래) 순서(travel 스왑), "골라라"→"골라주세요". (8) 인게임 배너 나라/도시 점→줄바꿈(`banner-country`/`banner-city` 분리) + 나라명 20%↓ 하늘색·검은 외곽선·도시 검은 외곽선. (9) 보스 격파 폭발 2초 통일(`bossDeath.dur`/`finalDur` 2). 미해결(사용자 대기): 배너 도시>나라 크기 조정 / 월드맵 카드 중앙 체감(캐시 의심, 강제 새로고침 안내) / HUD 글자 그림자 / 긴 로마자 티어 확인 / 배포 여부(durable "검수 후 배포" 보류 유지).
- 진행/완료/다음 작업은 `PROGRESS.md` 참조.
