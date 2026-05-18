// 캐릭터 전적 / 이력 페이지.
// S3-T2: 등수별 막대 차트 + 누적 통계 + 최근 30회 타임라인 추가.
// S096 (2026-05-19): 등수별 분포 차트 폐기. 사용자 결정 - 6/45 확률 + summary 중복 + 사행성 회피 룰.
import { characterStats } from '../core/history.js';
import { numberColor, RANK_GLOW_COLORS } from '../data/colors.js';
// S20: 보너스 표시 폐기로 plus 아이콘 미사용.
// S58 (2026-05-09): RANK 색상 / 미적중 hex 인라인 → colors.js SSOT 위탁.
// S096 (2026-05-19): horizontalBarsHtml import 폐기 (등수별 분포 폐기). stats-page.js에서는 잔존 사용.
// S096 (2026-05-19): RANK_MISS_COLOR import 폐기 (등수별 분포에서만 사용. colors.js 상수 자체는 dead 잔존).

const RANK_LABELS = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
const TIMELINE_RECENT = 30; // 최근 N회 타임라인 길이

function colorNum(n, extraClass = '') {
  const c = numberColor(n);
  const cls = extraClass ? `num ${extraClass}` : 'num';
  return `<span class="${cls}" style="background-color:${c.bg};">${n}</span>`;
}

/**
 * S097 (2026-05-19): 발표 대기 "?" ball.
 * 사용자 명시 - 본 6 + 보너스 1 = 7개 모두 물음표.
 * S097-후속 (2026-05-19): num 클래스 추가 = 다른 구슬과 동일 원형 / 크기.
 *   사용자 명시 "구슬과 동일한 형태, 물음표도 중앙에 숫자보다 살짝 크게".
 * @param {string} [extra] 추가 클래스 ('is-bonus' 등).
 */
function pendingBallHtml(extra = '') {
  const cls = extra ? `num history-num is-pending ${extra}` : 'num history-num is-pending';
  return `<span class="${cls}" aria-label="발표 대기">?</span>`;
}

/**
 * 전적 페이지 렌더. S3-T2 강화 4섹션 구조 + S090-후속 5섹션 (현재 회차 발표 대기 섹션 추가).
 * S092-정정 (2026-05-18): 옛 회차 이력 = 회차별 그룹핑. 그룹 헤더에 회차 + 발표일 + 당첨번호 노출,
 *   본문에 사용자 추천 row(번호공 + 등수 라벨).
 * @param {HTMLElement} container
 * @param {object} character 활성 캐릭터
 * @param {number} [currentDrwNo] 현재 추첨 회차 (미발표). 본 회차 확정 항목은 "발표 대기" 별도 섹션에 노출.
 * @param {Array<{drwNo:number,drwDate:string,numbers:number[],bonus:number}>} [draws] 회차 데이터 (그룹 헤더 발표번호 + 날짜 조회용).
 */
export function renderHistoryPage(container, character, currentDrwNo = null, draws = []) {
  const drawMap = new Map((Array.isArray(draws) ? draws : []).map((d) => [d.drwNo, d]));
  const stats = characterStats(character);
  const sortedHistory = [...character.history].sort((a, b) => b.drwNo - a.drwNo);

  // S090-후속 (2026-05-17): 현재 회차 = 미래 회차(미발표) 확정 항목 별도 섹션.
  //   사용자 명시 "이번회차에 선택된것들은 실시간으로 등록되었으면 좋겠는데" 직접 대응.
  //   사용자가 "확정" 누른 직후 본 섹션에 즉시 노출 = 실시간 인지 보장. 발표 후 자동 매칭으로 옛 이력 섹션으로 이동.
  const pendingItems = currentDrwNo
    ? sortedHistory.filter((h) => h.drwNo === currentDrwNo && (h.matchedRank === null || h.matchedRank === undefined))
    : [];
  // S097 (2026-05-19): 발표 대기 섹션에 당첨번호 row 추가. 본 6 + 보너스 1 = "?" 7개.
  //   사용자 명시 "현재 회차에도 당첨번호 영역 표시, 7개 구슬 모두 물음표 처리".
  //   옛 회차 그룹과 동일 layout 유지 (그룹 헤더 = 당첨 row + 본문 = 추천 row).
  const pendingWinHtml = pendingItems.length === 0 ? '' : `
    <div class="history-group-winning is-pending" aria-label="${currentDrwNo}회 당첨번호 (발표 대기)">
      <span class="history-group-winning-label">당첨</span>
      <div class="history-group-winning-nums">
        ${pendingBallHtml().repeat(6)}
        <span class="history-num-plus" aria-hidden="true">+</span>
        ${pendingBallHtml('is-bonus')}
      </div>
    </div>
  `;
  // 발표 대기 추천 row = 옛 동일 (번호 노출, 라벨 "미발표").
  const pendingRowsHtml = pendingItems.map((h) => historyGroupRowHtml(h, null, false)).join('');
  const pendingHtml = pendingItems.length === 0 ? '' : `
    <section class="stats-section history-pending-section">
      <h2 class="stats-title">현재 회차 ${currentDrwNo}회 · 발표 대기 ${pendingItems.length}건</h2>
      <p class="stats-note">추첨 발표 후 자동 매칭됩니다. (등록 직후 본 섹션에 실시간 노출)</p>
      <article class="history-group">
        ${pendingWinHtml}
        <div class="history-group-rows">${pendingRowsHtml}</div>
      </article>
    </section>
  `;

  const hitRate = stats.settled > 0 ? Math.round((stats.hits / stats.settled) * 1000) / 10 : 0;

  // 누적 요약 (강화 + 적중률). S089 (2026-05-17): Luck 셀 폐기 (5셀 그리드).
  const summaryHtml = `
    <section class="stats-section">
      <h2 class="stats-title">${escapeHtml(character.name)} 전적</h2>
      <ul class="summary-grid">
        <li><span class="summary-label">총 추천</span><span class="summary-value">${stats.total}</span></li>
        <li><span class="summary-label">발표 완료</span><span class="summary-value">${stats.settled}</span></li>
        <li><span class="summary-label">적중 (3-5등)</span><span class="summary-value">${stats.hits}</span></li>
        <li><span class="summary-label">적중률</span><span class="summary-value">${stats.settled > 0 ? hitRate + '%' : '-'}</span></li>
        <li><span class="summary-label">최고 등수</span><span class="summary-value">${stats.bestRank ? RANK_LABELS[stats.bestRank] : '없음'}</span></li>
      </ul>
    </section>
  `;

  // S096 (2026-05-19): 등수별 분포 차트 폐기.
  //   사용자 결정 + 본질 진단:
  //     (1) 6/45 확률 = 1등 1/8.1M / 5등 1/45. 누적 N회로 의미 형성 어려움 (1년 260게임 = 5등 평균 5.8회).
  //     (2) summary에 "적중 N건 + 최고 등수"가 이미 같은 정보 = 중복.
  //     (3) 사행성 회피 룰 (CLAUDE.md 6.3) - 등수 분포 강조가 캐릭터 선택 사행성 자극 가능.
  //     (4) 데이터 부족 시 시각 노이즈 (모두 0인 빈 막대).
  //   폐기 후 잔존 정보 = summary + timeline + 옛 회차 그룹 이력 (충분).

  // 최근 30회 타임라인 (도트, S3-T2)
  const timelineSrc = sortedHistory.slice(0, TIMELINE_RECENT).reverse(); // 시간 순
  const timelineHtml = timelineSrc.length === 0 ? '' : `
    <section class="stats-section">
      <h2 class="stats-title">최근 ${TIMELINE_RECENT}회 타임라인</h2>
      <div class="timeline-dots" role="list">
        ${timelineSrc.map((h) => timelineDotHtml(h)).join('')}
      </div>
      <div class="timeline-legend">
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[1]}"></span>1등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[2]}"></span>2등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[3]}"></span>3등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[4]}"></span>4등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[5]}"></span>5등</span>
        <span class="legend-item"><span class="legend-dot legend-miss"></span>미적중</span>
      </div>
    </section>
  `;

  // S090-후속: 옛 이력 = 현재 회차 외 모든 항목 (발표 회차 + 매칭 완료).
  // S092-정정 (2026-05-18): 회차별 그룹핑. 사용자 명시 3건 통합 - "정확한 회차와 년월일을 표시" +
  //   "당첨번호와 등수 표시" + "같은 회차에 선택된 추천 번호를 그룹핑". 그룹 헤더 = 회차/날짜/당첨번호,
  //   본문 = 추천 row + 등수 라벨. SSOT: docs/01_spec.md 5.8.1-A + 5.8.4.
  const pastItems = currentDrwNo
    ? sortedHistory.filter((h) => h.drwNo !== currentDrwNo)
    : sortedHistory;
  // 회차별 그룹핑 (drwNo desc 정렬은 sortedHistory에서 이미 처리, Map insertion order 유지).
  const groupedByDrw = new Map();
  for (const h of pastItems) {
    if (!groupedByDrw.has(h.drwNo)) groupedByDrw.set(h.drwNo, []);
    groupedByDrw.get(h.drwNo).push(h);
  }
  // 같은 회차 안에서는 createdAt desc 정렬.
  for (const arr of groupedByDrw.values()) {
    arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  const historyItems = pastItems.length === 0
    ? (pendingItems.length === 0
        ? '<section class="empty-state"><p>기록이 비어있습니다.<br/>추천 탭에서 추천을 받고 <strong>"확정"</strong>을 누르면 본 회차에 등록됩니다.<br/>매주 토요일 발표 후 자동 매칭됩니다.</p></section>'
        : '')
    : `<section class="stats-section">
        <h2 class="stats-title">옛 회차 이력 (${groupedByDrw.size}개 회차 · ${pastItems.length}건)</h2>
        <div class="history-group-list">
          ${Array.from(groupedByDrw.entries()).map(([drwNo, items]) => historyGroupHtml(drwNo, items, drawMap.get(drwNo))).join('')}
        </div>
      </section>`;

  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">기록</h1>
    </header>
    ${summaryHtml}
    ${pendingHtml}
    ${timelineHtml}
    ${historyItems}
  `;
}

/**
 * S092-정정 (2026-05-18): 회차 그룹 헤더 + 본문 row들. 그룹 헤더 = 회차/날짜/당첨번호.
 * draw 없으면 "발표 데이터 미수신" 표기 (사용자 페치 1회 권장).
 * @param {number} drwNo
 * @param {Array} items 해당 회차의 history 항목들 (이미 createdAt desc 정렬)
 * @param {object} [draw] draws Map 조회 결과 ({ drwNo, drwDate, numbers, bonus })
 */
function historyGroupHtml(drwNo, items, draw) {
  const hasDraw = !!(draw && Array.isArray(draw.numbers) && draw.numbers.length === 6);
  const date = draw && draw.drwDate ? draw.drwDate : '';
  const dateLabel = date ? ` · ${date}` : '';
  let winHtml = '';
  if (hasDraw) {
    // S092-후속 7 (2026-05-18): 사용자 명시 "당첨 번호가 작은데 크기 동일하게".
    //   .history-num-mini(22x22) 폐기, .history-num(32x32)로 통일. 추천 row와 동일 크기.
    const winBalls = draw.numbers.map((n) => colorNum(n, 'history-num')).join('');
    // S092-후속 (2026-05-18): 사용자 명시 "당첨 번호에 보너스 번호가 표시되지 않음".
    //   본번호 6 + "+" 구분 + 보너스 1 ball. 보너스 ball에 is-bonus 클래스로 외곽선 강조.
    const bonusHtml = (typeof draw.bonus === 'number')
      ? `<span class="history-num-plus" aria-hidden="true">+</span>${colorNum(draw.bonus, 'history-num is-bonus')}`
      : '';
    winHtml = `<div class="history-group-winning" aria-label="${drwNo}회 당첨번호">
      <span class="history-group-winning-label">당첨</span>
      <div class="history-group-winning-nums">${winBalls}${bonusHtml}</div>
    </div>`;
  } else {
    winHtml = `<div class="history-group-winning is-missing">
      <span class="history-group-winning-label">발표 데이터 미수신</span>
    </div>`;
  }
  // S092-후속 (2026-05-18): 사용자 명시 2건.
  //   (1) "미적중/미발표" 모호 라벨 정정 - draws 가용 = 미적중, draws 없음 = 미발표 분기.
  //   (2) "결과와 번호를 한줄에 표시" - row 마크업 신규 (번호공 좌측 + 라벨 우측).
  // S092-후속 2 (2026-05-18): 사용자 명시 3건.
  //   (1) 맞은 번호 하이라이트 - is-matched 클래스로 일치 ball 강조.
  //   (2) 라벨 세분화 - 0개=미적중, 1개=1개 적중, 2개=2개 적중, 3+개=등수 라벨.
  //   (3) draw 객체 전달 (hasDraw만으로는 matched count 계산 불가).
  const rowsHtml = items.map((h) => historyGroupRowHtml(h, draw, hasDraw)).join('');
  return `
    <article class="history-group">
      <header class="history-group-header">
        <span class="history-group-drw">${drwNo}회${dateLabel}</span>
      </header>
      ${winHtml}
      <div class="history-group-rows">
        ${rowsHtml}
      </div>
    </article>
  `;
}

/**
 * S092-후속 2 (2026-05-18): 옛 회차 그룹 안 추천 row. 한 줄 layout = 번호공 좌측 + 등수 라벨 우측.
 *   라벨 분기:
 *   - matchedRank 1~5 → RANK_LABELS (1~5등).
 *   - matchedRank null + !hasDraw → "미발표".
 *   - matchedRank null + hasDraw + matched 0 → "미적중".
 *   - matchedRank null + hasDraw + matched 1 → "1개 적중".
 *   - matchedRank null + hasDraw + matched 2 → "2개 적중".
 *   일치 번호는 `.is-matched` 클래스로 ball 하이라이트.
 * @param {object} h history 항목
 * @param {object} [draw] draws Map 조회 결과 (당첨번호 비교용)
 * @param {boolean} hasDraw 해당 회차 draws 가용 여부
 */
function historyGroupRowHtml(h, draw, hasDraw) {
  const rank = h.matchedRank;
  const userNums = Array.isArray(h.numbers) ? h.numbers : [];
  const drawNumSet = hasDraw && draw && Array.isArray(draw.numbers)
    ? new Set(draw.numbers)
    : new Set();
  const matchedSet = new Set(userNums.filter((n) => drawNumSet.has(n)));
  const matchedCount = matchedSet.size;

  // S097 (2026-05-19): revealed 분기.
  //   - hasDraw && revealed=false && 추첨일 + 7일 안 → 마스킹 + 체크 버튼.
  //   - hasDraw && revealed=true 또는 !hasDraw → 옛 동작.
  //   - 발표 대기 (hasDraw=false) = revealed 무관 옛 동작 (자기 번호는 또렷이 노출).
  // S097-후속 (2026-05-19): 사용자 명시 "복권 추첨 후 1주일간 가려진 채로 유지, 1주일 지나면 자동 오픈".
  //   추첨일 + 7일이 지나면 revealed 무관 자동 노출 = 다음 회차 추첨 시점에 자연 정리.
  let isWithinSettleWindow = false;
  if (hasDraw && draw && draw.drwDate) {
    const drwTimeMs = new Date(draw.drwDate).getTime();
    if (!Number.isNaN(drwTimeMs)) {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      isWithinSettleWindow = (Date.now() - drwTimeMs) < SEVEN_DAYS_MS;
    }
  }
  const isMasked = hasDraw && h.revealed === false && isWithinSettleWindow;

  let rankLabel;
  if (isMasked) {
    rankLabel = ''; // 마스킹 상태에선 라벨 숨김 (체크 버튼만)
  } else if (rank) {
    rankLabel = RANK_LABELS[rank];
  } else if (!hasDraw) {
    rankLabel = '미발표';
  } else if (matchedCount === 0) {
    rankLabel = '미적중';
  } else {
    rankLabel = `${matchedCount}개 적중`;
  }
  const rankColor = rank ? RANK_GLOW_COLORS[rank] : 'var(--color-text-dim)';

  const numsHtml = userNums.map((n) => {
    if (isMasked) {
      // S097-후속 3 (2026-05-19): 사용자 명시 "모양은 구슬과 완전히 똑같고, 색도 자기 색이어야 하며, 숫자 영역이 물음표로 표시".
      //   num 본체 클래스 상속(원형 32x32) + 자기 색 배경 + 흰 ? 글자. 다른 ball과 완전 동일 형태, 숫자 자리만 ?.
      const c = numberColor(n);
      return `<span class="num history-num is-masked" style="background-color:${c.bg};" data-num="${n}" aria-label="?">?</span>`;
    }
    const extraCls = matchedSet.has(n) ? 'history-num is-matched' : 'history-num';
    return colorNum(n, extraCls);
  }).join('');

  // S097: 체크 버튼 (revealed=false + hasDraw만).
  const key = userNums.join(',');
  const rightHtml = isMasked
    ? `<button type="button" class="history-row-reveal" data-action="reveal-row" data-row-drw="${h.drwNo}" data-row-key="${key}" aria-label="추첨 결과 확인">확인</button>`
    : `<span class="history-group-row-rank" style="color: ${rankColor}">${rankLabel}</span>`;

  // S097-후속 (2026-05-19): 미발표 row(hasDraw=false)는 dim 적용 안 함.
  //   사용자 명시 "미발표의 구슬은 반투명 적용 안함". 발표 대기 = 자기 번호는 또렷이 노출.
  let rowCls = 'history-group-row';
  if (isMasked) rowCls += ' is-masked';
  if (!hasDraw) rowCls += ' is-unsettled';
  return `
    <article class="${rowCls}" data-row-drw="${h.drwNo}" data-row-key="${key}">
      <div class="history-group-row-nums">${numsHtml}</div>
      ${rightHtml}
    </article>
  `;
}

function timelineDotHtml(h) {
  const rank = h.matchedRank;
  const color = rank ? RANK_GLOW_COLORS[rank] : null;
  const cls = rank ? '' : ' is-miss';
  const style = color ? `style="background:${color}"` : '';
  const label = rank ? `${h.drwNo}회 ${RANK_LABELS[rank]}` : `${h.drwNo}회 미적중`;
  return `<span class="timeline-dot${cls}" ${style} role="listitem" title="${label}" aria-label="${label}"></span>`;
}

/**
 * history 항목 카드.
 * @param {object} h history 항목
 * @param {boolean} [showRound=true] 항목 헤더에 "NNNN회차" 표기 (S090-후속 3).
 * @param {boolean} [showRank=true] 항목 헤더에 rank 라벨 표기 (S090-후속 4, 2026-05-17). false면 헤더 자체 폐기 = 번호공만 노출.
 */
function historyItemHtml(h, showRound = true, showRank = true) {
  // S20(2026-05-02): 추천에서 보너스 폐기. 이력 카드도 본번호 6개만 표시.
  const rank = h.matchedRank;
  const rankLabel = rank ? RANK_LABELS[rank] : (rank === null ? '미적중 / 미발표' : '-');
  const rankColor = rank ? RANK_GLOW_COLORS[rank] : 'var(--color-text-dim)';
  const numsHtml = h.numbers.map((n) => colorNum(n, 'history-num')).join('');
  let headerHtml = '';
  if (showRound && showRank) {
    headerHtml = `<header class="history-header">
        <span class="history-drw">${h.drwNo}회차</span>
        <span class="history-rank" style="color: ${rankColor}">${rankLabel}</span>
      </header>`;
  } else if (showRound) {
    headerHtml = `<header class="history-header history-header-no-rank">
        <span class="history-drw">${h.drwNo}회차</span>
      </header>`;
  } else if (showRank) {
    headerHtml = `<header class="history-header history-header-no-round">
        <span class="history-rank" style="color: ${rankColor}">${rankLabel}</span>
      </header>`;
  }
  // S090-후속 4: showRound=false + showRank=false = 헤더 자체 폐기. 번호공만 노출 (발표 대기 섹션).
  return `
    <article class="history-item">
      ${headerHtml}
      <div class="history-numbers">${numsHtml}</div>
    </article>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
