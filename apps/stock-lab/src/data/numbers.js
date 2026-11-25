// 시뮬레이터 기본값과 규칙 표. 기획서 3.1 · 3.2.
export const SIM_DEFAULTS = {
  initialManwon: 10000, // 시작 금액(만 원) = 1억 원
  baseWeightPct: 80,    // 기본 비중(%)
  stepPct: 10,          // 단계 폭: 코스피 낙폭 · 반등 기준(%)
  unitPct: 10,          // 매매 단위: 비중 변화(%p)
};

export const STEP_CHOICES = [10, 5];
export const UNIT_CHOICES = [10, 5];

// 급락 단계 n(1부터)에서 목표 비중에 더할 방향. +1 매수, -1 매도(손절).
export const DOWN_ACTIONS = [+1, +1, -1, +1];
// 급등(반등) 단계 수. 단계마다 매매 단위만큼 판다.
export const UP_STEPS = 2;

export const FEE_RATE = 0.00015; // 사고팔 때마다 0.015%
export const CASH_RATE = 0;      // 현금 이자 0%

export const WON_PER_MANWON = 10000;
export const DAYS_PER_YEAR = 365.25;

// 입력 칸 허용 범위
export const INITIAL_MIN_MANWON = 100;
export const INITIAL_MAX_MANWON = 10000000;
export const BASE_WEIGHT_MIN = 0;
export const BASE_WEIGHT_MAX = 100;

// 게임 모드 지수의 기준값(기준 날짜 = 100)
export const INDEX_BASE = 100;

// 비교 차트 목록 폭(px): 끌어서 조절하는 범위와 처음 폭
export const LIST_MIN_PX = 180;
export const LIST_MAX_PX = 480;
export const LIST_DEFAULT_PX = 340;

// 보이는 구간 오른쪽 끝이 마지막 날짜에서 이 칸 수 안이면 "맨 끝을 보는 중"으로 본다(끝 막대가 반만 보일 때 포함).
export const END_SNAP_BARS = 2.5;

// 비교 차트를 처음 열 때 보이는 구간(년)
export const COMPARE_INITIAL_YEARS = 1;

// 자료 갱신이 이 날수보다 오래되면 갱신 날짜를 경고색으로 보인다(기획서 5.2).
export const STALE_DAYS = 3;
