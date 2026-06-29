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
