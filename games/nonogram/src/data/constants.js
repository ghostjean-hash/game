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

// 격자를 화면(가용 폭·높이)에 맞출 때 쓰는 셀 크기 값(px). docs/02_data.md 1장.
// fitBoard가 헤더·힌트를 뺀 남은 공간에서 폭·높이 중 작은 쪽으로 셀을 정하되,
// MAX(크기별 상한) 이하 MIN 이상으로 제한한다. 상한이 없으면 큰 화면에서 격자가 과대해진다.
export const CELL_FIT = {
  MIN_PX: 18,                        // 이보다 작으면 터치가 어려워 하한(그 아래로만 스크롤 안전망 작동)
  GUTTER_PX: 8,                      // 격자 둘레 최소 여백
  MAX: { 5: 60, 10: 46, 15: 34 },   // 크기별 셀 상한(칸이 클수록 상한을 낮춰 총폭 균형)
  DEFAULT_MAX: 46,                   // MAX에 없는 크기의 기본 상한
};

// 연출 타이밍(ms). 값은 여기 한 곳에서.
export const ANIM = {
  REVEAL_STEP_MS: 45,   // 완성 변신 시 칸별 순차 지연
  PRAISE_MS: 1100,      // 연속 응원 문구 노출 시간
  RESULT_DELAY_MS: 900, // 변신 후 결과 화면 전환까지
  SPARKLE_STEP_MS: 60,  // 줄 완성 파도 반짝의 칸별 순차 지연
};

// 연속 정답 응원 문구(칭찬). 저학년 즉각 격려.
export const PRAISE = ['좋아요', '잘한다', '척척!', '멋져요', '거의 다 왔어'];

// 연속 응원이 뜨기 시작하는 줄 완성 연속 횟수.
export const PRAISE_STREAK = 3;

