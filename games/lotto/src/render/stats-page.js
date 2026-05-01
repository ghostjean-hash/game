// 통계 시각화 페이지. SSOT: docs/01_spec.md 5.3, docs/02_data.md.
import { horizontalBarsHtml } from './charts.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../core/stats.js';
import { loadDraws, syncDrawsIfNewer } from '../data/storage.js';

/**
 * 통계 페이지 렌더.
 * 진입 즉시 캐시 기반으로 렌더 후, 백그라운드에서 미러 latest와 비교해
 * 새 회차가 있을 때만 자동 갱신. "갱신" 버튼은 강제 체크.
 *
 * @param {HTMLElement} container 메인 #app 엘리먼트
 * @param {() => void} onBack 뒤로 가기 (메인 복귀)
 */
export function renderStatsPage(container, onBack) {
  let currentDraws = loadDraws();
  let busy = false;

  function emptyHtml() {
    return `
      <header class="app-header stats-header">
        <button type="button" class="btn-secondary" data-action="back">‹ 메인</button>
        <h1 class="app-title">통계</h1>
      </header>
      <section class="empty-state">
        <p><strong>회차 데이터를 받아오는 중입니다.</strong></p>
        <p>처음 한 번만 1회차부터 최신 회차까지 받아오면 됩니다 (1초 미만).</p>
        <p>가장 쉬운 방법:</p>
        <p><code>scripts\\fetch-lotto-draws.bat</code> 파일을 더블클릭</p>
        <p class="empty-note">또는 터미널에서 <code>node scripts/fetch-lotto-draws.mjs</code>.<br />
        완료되면 이 페이지를 새로고침하세요. 통계 / 전적 / 추천 모두 자동으로 실데이터로 동작합니다.</p>
      </section>
    `;
  }

  function fullHtml(draws) {
    const numberStats = computeNumberStats(draws);
    const bonusStats = computeBonusStats(draws);
    const cooccur = computeCooccur(draws);

    const numberItems = numberStats
      .map((s) => ({ label: String(s.number), value: s.totalCount }))
      .sort((a, b) => b.value - a.value);

    const bonusItems = bonusStats
      .map((s) => ({ label: String(s.number), value: s.totalCount, color: '#c9a050' }))
      .sort((a, b) => b.value - a.value);

    const topPairs = [...cooccur]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((p) => ({ label: `${p.a} - ${p.b}`, value: p.count, color: '#10b981' }));

    const coldItems = numberStats
      .map((s) => ({ label: String(s.number), value: s.currentGap, color: '#ef4444' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const last = draws[draws.length - 1];
    const metaLine = last
      ? `${last.drwNo}회까지 반영 · 최근 추첨 ${last.drwDate}`
      : `${draws.length}회차 누적`;

    return `
      <header class="app-header stats-header">
        <button type="button" class="btn-secondary" data-action="back">‹ 메인</button>
        <h1 class="app-title">통계</h1>
        <button type="button" class="btn-refresh" data-action="refresh" aria-label="최신 데이터 확인">↻ 갱신</button>
      </header>

      <p class="stats-meta" aria-live="polite">${metaLine}</p>
      <div class="stats-toast" data-role="toast" role="status" aria-live="polite" hidden></div>

      <section class="stats-section">
        <h2 class="stats-title">본번호 빈도</h2>
        <p class="stats-note">출현 횟수 내림차순. 색만으로 의미를 두지 않습니다.</p>
        ${horizontalBarsHtml(numberItems)}
      </section>

      <section class="stats-section">
        <h2 class="stats-title">보너스볼 빈도 (본번호와 분리)</h2>
        <p class="stats-note">2등 판정에만 영향. 본번호 누적과 다른 데이터셋입니다.</p>
        ${horizontalBarsHtml(bonusItems)}
      </section>

      <section class="stats-section">
        <h2 class="stats-title">동시출현 페어 top 20</h2>
        <p class="stats-note">두 번호가 같은 회차에 함께 나온 횟수.</p>
        ${horizontalBarsHtml(topPairs)}
      </section>

      <section class="stats-section">
        <h2 class="stats-title">장기 미출현(Cold) top 10</h2>
        <p class="stats-note">최근 출현 이후 경과 회차. 회귀를 보장하지 않습니다.</p>
        ${horizontalBarsHtml(coldItems)}
      </section>

      <p class="legal">통계는 과거 데이터의 사후 관찰입니다. 매 회차 모든 조합의 당첨 확률은 1/8,145,060로 동일합니다.</p>
    `;
  }

  function showToast(message) {
    const el = container.querySelector('[data-role="toast"]');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    setTimeout(() => {
      if (el.textContent === message) el.hidden = true;
    }, 3500);
  }

  function bindHandlers() {
    const backBtn = container.querySelector('[data-action="back"]');
    if (backBtn) backBtn.addEventListener('click', onBack);
    const refreshBtn = container.querySelector('[data-action="refresh"]');
    if (refreshBtn) refreshBtn.addEventListener('click', () => doSync(true));
  }

  function rerender() {
    if (currentDraws.length === 0) {
      container.innerHTML = emptyHtml();
    } else {
      container.innerHTML = fullHtml(currentDraws);
    }
    bindHandlers();
  }

  async function doSync(explicit) {
    if (busy) return;
    busy = true;
    const refreshBtn = container.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '확인 중…';
    }

    let result;
    try {
      result = await syncDrawsIfNewer();
    } catch {
      result = { updated: false, reason: 'mirror-unreachable', draws: currentDraws };
    }

    busy = false;
    if (result.updated) {
      currentDraws = result.draws;
      rerender();
      showToast(`새 회차 ${result.latestDrwNo}회 반영됨 (${result.latestDrwDate})`);
      return;
    }

    // 강제 갱신일 때만 결과 메시지 표시. 자동 진입 시는 조용히.
    if (explicit) {
      const btn = container.querySelector('[data-action="refresh"]');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '↻ 갱신';
      }
      if (result.reason === 'already-latest') {
        showToast('이미 최신 데이터입니다');
      } else if (result.reason === 'mirror-unreachable') {
        showToast('미러 연결 실패. 잠시 후 다시 시도하세요');
      } else if (result.reason === 'sync-failed') {
        showToast('미러는 새거지만 정적 데이터가 아직 갱신되지 않았습니다');
      }
    } else {
      // 자동 진입의 경우 버튼만 정상 복귀
      const btn = container.querySelector('[data-action="refresh"]');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '↻ 갱신';
      }
    }
  }

  rerender();

  // 진입 시 자동 sync (날짜 기준 새 정보 있을 때만 동작).
  // 캐시 비어있으면 자동 호출해도 의미 없음 (사용자가 페치 .bat 돌려야 함).
  if (currentDraws.length > 0) {
    doSync(false);
  }
}
