// 아이콘 SSOT. 모든 UI 텍스트 글리프(>, <, +, ×, ↻, ▾)는 본 모듈의 SVG로만 표현한다.
// 규칙: stroke="currentColor" 또는 fill="currentColor"로 색은 부모 color에 위임.
//      크기는 호출자 클래스(.icon, .icon-sm, .icon-lg)에서 width/height 제어.
//      장식용은 aria-hidden, 의미가 있으면 호출처에서 aria-label 부여.

const COMMON = 'aria-hidden="true" focusable="false"';

/** 좌측 갈매기 (이전). */
export function chevronLeft(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg>`;
}

/** 우측 갈매기 (다음). */
export function chevronRight(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`;
}

/** 아래 갈매기 (드롭다운 caret). */
export function chevronDown(cls = 'icon icon-sm') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
}

/** + 기호. 추가 버튼 / 본번호-보너스 분리자에 공용. */
export function plus(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}

/** × 기호. 닫기 / 삭제. */
export function close(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`;
}

/** ↻ 시계방향 회전 (갱신). */
export function refresh(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 4 21 10 15 10"/></svg>`;
}

/** 휴지통 (개별 삭제 / 전체 비우기 버튼용). */
export function trash(cls = 'icon icon-sm') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;
}

// ===== 하단 탭 5개 (추첨 / 통계 / 전적 / 휠링 / 설정) =====

/** 추첨 탭: 빛나는 별 (행운/추첨 시그널). */
export function sparkles(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8z"/><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z"/></svg>`;
}

/** 통계 탭: 막대 차트. */
export function barChart(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="20" x2="6" y2="11"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>`;
}

/** 전적 탭: 시계 (이력). */
export function clock(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`;
}

/** 휠링 탭: 격자 (다구좌 표 시그널). */
export function grid(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
}

/** 설정 탭: 톱니바퀴. */
export function gear(cls = 'icon') {
  return `<svg class="${cls}" ${COMMON} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}
