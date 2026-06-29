// 보드 / 게임 수치. 매직 넘버는 여기서만 정의한다(docs/02_data.md §1).

export const BOARD_SIZE = 6;        // 6x6 격자
export const EXIT_ROW = 2;          // 빨간 차가 탈출하는 행(0부터)
export const TARGET_ID = 'X';       // 빨간 차(target) 식별자
export const CAR_MIN_LEN = 2;       // 승용차 길이
export const CAR_MAX_LEN = 3;       // 트럭 길이

export const ORIENT = { H: 'h', V: 'v' };

// localStorage 네임스페이스(shared/storage.js createStorage 인자).
export const STORAGE_NS = 'rushhour';

// 드래그 변위가 셀의 이 비율을 넘으면 다음 칸으로 스냅한다.
export const DRAG_SNAP_RATIO = 0.5;

// 포인터 이동이 셀의 이 비율 미만이면 탭으로 보고 누른 쪽으로 한 칸 민다.
export const DRAG_TAP_RATIO = 0.2;

// 클리어 시 토끼가 출구 길로 빠져나가는 애니메이션 길이(ms).
export const CLEAR_EXIT_MS = 700;

// 클리어 축하 파티클(별·하트) 개수.
export const CONFETTI_COUNT = 16;

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
