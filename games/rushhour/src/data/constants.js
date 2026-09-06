// 보드 / 게임 수치. 매직 넘버는 여기서만 정의한다(docs/02_data.md §1).

export const BOARD_SIZE = 6;        // 6x6 격자
export const EXIT_ROW = 2;          // 빨간 차가 탈출하는 행(0부터)
export const TARGET_ID = 'X';       // 빨간 차(target) 식별자
export const CAR_MIN_LEN = 2;       // 승용차 길이
export const CAR_MAX_LEN = 3;       // 트럭 길이

export const ORIENT = { H: 'h', V: 'v' };

// 저장 네임스페이스(shared/frame/save.js createSave 인자). 실제 키는 gg.rushhour.<칸>.
export const STORAGE_NS = 'rushhour';

// 드래그 변위가 셀의 이 비율을 넘으면 다음 칸으로 스냅한다.
export const DRAG_SNAP_RATIO = 0.5;

// 포인터 이동이 셀의 이 비율 미만이면 탭으로 보고 누른 쪽으로 한 칸 민다.
export const DRAG_TAP_RATIO = 0.2;

// 클리어 시 토끼가 출구 길로 빠져나가는 애니메이션 길이(ms).
export const CLEAR_EXIT_MS = 700;

// 클리어 축하 파티클(별·하트) 개수.
export const CONFETTI_COUNT = 16;

// 주인공 머리 장식(상점 액세서리) 앵커. 캐릭터(주인공 이미지)마다 정수리 위치가 다르므로
// id별로 둔다. 지금 주인공은 'target' 하나(오른쪽 보는 포니, 머리가 오른쪽 위)라 그 앵커만
// 있다. 캐릭터가 바뀌거나 늘면 여기에 추가한다.
//   top/right - 블록 대비 %(블록 밖으로 넘어가도 되므로 음수 허용).
//   size      - 한 칸(--cell-px) 대비 비율.
// 셋 다 블록·칸 기준이다. 2026-09-06 이전에는 top이 `calc(8% - 10px)`, size가 vmin이라
// **화면 기준과 블록 기준이 섞여 있었다** - 화면이 커질수록 장식이 정수리에서 어긋났다
// (01_spec 8.2.1 · 04 컨벤션 3.3).
export const ACCESSORY_ANCHORS = {
  target: { top: -11, right: 20, size: 0.18 }, // 포니 이마 위(뿔 아래).
};
export const DEFAULT_ACCESSORY_ANCHOR = { top: -11, right: 20, size: 0.18 };

// 제한시간: 퍼즐별 = 최소 수 × TIME_PER_OPTIMAL_S + TIME_BASE_S(초). 넉넉하게.
export const TIME_BASE_S = 60;
export const TIME_PER_OPTIMAL_S = 20;

// 주인공 토끼 표정 전환 임계(경과/제한시간 비율). 이 미만은 무표정.
export const FACE_WORRIED_RATIO = 0.5;  // 어두운 표정 시작
export const FACE_CRY_RATIO = 0.85;     // 울상 시작

// 별: 최소 수 이내 3, (최소 수 + STAR2_MARGIN) 이내 2, 그 외 1.
export const STAR2_MARGIN = 3;

// 골드: 기본 + 별 보너스(3별/2별) + 시간 내 클리어 보너스.
export const GOLD_BASE = 10;
export const GOLD_STAR3 = 20;
export const GOLD_STAR2 = 10;
export const GOLD_TIME_BONUS = 10;

// 힌트 1회 골드 비용(다음 한 수를 보여준다).
export const HINT_COST = 5;

// 힌트는 최적 다음 한 수를 실시간 BFS로 찾는다. 최소 수가 이 값을 넘는 고난도 퍼즐(Fogleman 모드
// 보통·어려움)은 계산이 무거워 힌트를 제공하지 않는다(브라우저 멈춤 방지).
export const HINT_MAX_OPTIMAL = 18;

// 연속 콤보(제한시간 내 연달아 클리어). 2연속부터 min(combo, COMBO_MAX)×STEP 보너스 골드.
export const COMBO_GOLD_STEP = 5;
export const COMBO_MAX = 5;

// 클리어 결과 팝업에서 별 반짝 효과음을 별 개수만큼 낼 때의 간격(ms).
export const STAR_SOUND_GAP_MS = 160;
