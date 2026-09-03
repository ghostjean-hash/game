// 확대·이동(zoom & pan) 계산. 순수 함수만 - DOM/window 금지(03_architecture.md 2장).
// 화면에 격자를 어떻게 앉힐지(전체 맞춤 vs 확대·이동)와, 두 손가락 조작 중
// 셀 크기·스크롤 위치를 어떻게 바꿀지를 여기서 정한다. 근거는 docs/06_plan_zoom_pan.md.

/**
 * 격자 전체가 가용 공간에 들어가는 셀 크기(px)를 구한다.
 * 힌트 폭·높이는 글자 기반이라 셀 크기와 무관한 고정값으로 본다.
 * @param {object} p
 * @param {number} p.availW  격자에 쓸 수 있는 폭
 * @param {number} p.availH  격자에 쓸 수 있는 높이
 * @param {number} p.clueW   좌측 행 힌트 폭
 * @param {number} p.clueH   상단 열 힌트 높이
 * @param {number} p.marginRight 격자 오른쪽에 비워둘 여백(정중앙 정렬용)
 * @param {number} p.n       한 변의 칸 수
 * @param {number} p.gutter  격자 둘레 최소 여백
 * @param {number} p.minPx   바닥값(이보다 작게는 계산하지 않는다)
 * @param {number} [p.maxPx] 상한(없으면 무제한)
 * @returns {number} 셀 크기(px, 정수)
 */
export function fitCellSize({ availW, availH, clueW, clueH, marginRight, n, gutter, minPx, maxPx }) {
  if (!(n > 0)) return minPx;
  const byW = (availW - clueW - marginRight - gutter) / n;
  const byH = (availH - clueH - gutter) / n;
  const cap = maxPx == null ? Number.POSITIVE_INFINITY : maxPx;
  return Math.max(minPx, Math.floor(Math.min(byW, byH, cap)));
}

/**
 * 확대 배율(셀 크기)을 허용 범위로 자른다.
 * 하한은 "전체가 들어가는 크기"라 상한보다 커질 수 있다(작은 판을 큰 화면에서 볼 때).
 * 그 경우 하한을 이겨 상한 쪽으로 내리지 않고 하한을 그대로 쓴다(전체가 보이는 상태가 우선).
 */
export function clampCell(cell, minCell, maxCell) {
  if (minCell >= maxCell) return minCell;
  return Math.min(maxCell, Math.max(minCell, cell));
}

/**
 * 확대·축소 후에도 두 손가락 사이(초점)에 있던 칸이 제자리에 남도록 스크롤 위치를 보정한다.
 *
 * 좌표 관계: 화면상 위치 = 힌트 크기 + 칸번호 × 셀 크기 - 스크롤
 * 셀 크기만 바뀌고 힌트 크기는 그대로이므로, 초점이 가리키던 칸번호를 구해 역산한다.
 *
 * @param {object} p
 * @param {number} p.scroll   현재 스크롤 값(px)
 * @param {number} p.focus    스크롤 영역 왼쪽(위) 끝에서 잰 초점 위치(px)
 * @param {number} p.clueLen  힌트가 차지하는 고정 길이(폭 또는 높이)
 * @param {number} p.oldCell  바뀌기 전 셀 크기
 * @param {number} p.newCell  바뀐 뒤 셀 크기
 * @returns {number} 새 스크롤 값(px, 음수는 0으로 자름)
 */
export function zoomScroll({ scroll, focus, clueLen, oldCell, newCell }) {
  if (!(oldCell > 0)) return scroll;
  const cellIndex = (scroll + focus - clueLen) / oldCell;   // 초점이 가리키던 칸번호(소수)
  return Math.max(0, clueLen + cellIndex * newCell - focus);
}

/**
 * 보드 아래 가로 이동 영역을 끌었을 때의 스크롤 위치.
 * 왼쪽으로 민 만큼 오른쪽 열을 보도록 입력 방향을 뒤집는다.
 */
export function panScroll(scroll, startX, currentX) {
  return Math.max(0, scroll - (currentX - startX));
}

/**
 * 두 점 사이 거리. 핀치 배율 계산용.
 */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 두 점의 중점. 확대 초점 + 밀기 기준점.
 */
export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * 이번 화면·판에서 격자를 어떻게 앉힐지 정한다.
 *
 * 1. 우측 대칭 여백을 준 채로 전체 맞춤 크기를 구한다.
 * 2. 그 크기가 손가락 기준(fitMin) 미만이면 여백을 버리고 다시 구한다(폭 회수).
 * 3. 그래도 미만이면 확대·이동 모드 - 셀을 startPx로 키우고 격자를 스크롤에 맡긴다.
 *
 * @returns {{ pannable:boolean, cell:number, minCell:number, marginRight:number }}
 *   pannable  확대·이동 모드 여부(스크롤 영역으로 쓸지)
 *   cell      지금 적용할 셀 크기
 *   minCell   축소 하한(= 손가락으로 조작 가능한 최소 크기)
 *   marginRight 실제로 적용할 우측 여백
 */
export function planBoardFit({
  availW, availH, clueW, clueH, marginRight, n, gutter, minPx, maxPx, fitMin, startPx,
}) {
  const base = { availW, availH, clueW, clueH, n, gutter, minPx };
  let margin = marginRight;
  let fit = fitCellSize({ ...base, marginRight: margin, maxPx });

  if (fit < fitMin && margin > 0) {
    margin = 0;
    fit = fitCellSize({ ...base, marginRight: 0, maxPx });
  }
  if (fit >= fitMin) {
    return { pannable: false, cell: fit, minCell: fit, marginRight: margin };
  }
  // 전체를 넣으면 손가락으로 못 누르는 크기 - 확대·이동으로 넘긴다.
  // 큰 판의 전체 보기는 너무 작아 조작할 수 없으므로 축소도 손가락 기준 아래로 내리지 않는다.
  const minCell = Math.max(fitMin, fitCellSize({ ...base, marginRight: 0 }));
  return { pannable: true, cell: Math.max(startPx, minCell), minCell, marginRight: 0 };
}
