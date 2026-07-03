// 게임 수치 상수의 SSOT. 매직 넘버 금지 - 모든 수치는 여기서.
// 정의 근거는 docs/02_data.md 1장.

// 지원 격자 크기(정사각).
export const SIZES = { SMALL: 5, MEDIUM: 10, LARGE: 15 };

// 플레이 중 셀 상태.
export const CELL = { EMPTY: 0, FILLED: 1, MARKED: 2 };

// 별점 경계: 실수 <= THREE → 별3, <= TWO → 별2, 그 외 별1.
export const STAR_THRESHOLDS = { THREE: 0, TWO: 2 };
export const MAX_STARS = 3;

// 튜토리얼 판 수.
export const TUTORIAL_COUNT = 3;

// 15x15(고급) 해금에 필요한 중급 이하 클리어 수.
export const LARGE_UNLOCK_CLEARS = 6;

// 입력 모드.
export const MODE = { FILL: 'fill', MARK: 'mark' };

// 연출 타이밍(ms). 값은 여기 한 곳에서.
export const ANIM = {
  REVEAL_STEP_MS: 45,   // 완성 변신 시 칸별 순차 지연
  PRAISE_MS: 1100,      // 연속 응원 문구 노출 시간
  RESULT_DELAY_MS: 900, // 변신 후 결과 화면 전환까지
};

// 연속 정답 응원 문구(칭찬). 저학년 즉각 격려.
export const PRAISE = ['좋아요', '잘한다', '척척!', '멋져요', '거의 다 왔어'];

// 연속 응원이 뜨기 시작하는 줄 완성 연속 횟수.
export const PRAISE_STREAK = 3;

