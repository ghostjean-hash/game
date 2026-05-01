// 통계 시각화 페이지. SSOT: docs/01_spec.md 5.3, docs/02_data.md.
import { horizontalBarsHtml } from './charts.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../core/stats.js';
import { loadDraws } from '../data/storage.js';

/**
 * 통계 페이지 렌더.
 * @param {HTMLElement} container 메인 #app 엘리먼트
 * @param {() => void} onBack 뒤로 가기 (메인 복귀)
 */
export function renderStatsPage(container, onBack) {
  const draws = loadDraws();

  if (draws.length === 0) {
    container.innerHTML = `
      <header class="app-header stats-header">
        <button type="button" class="btn-secondary" data-action="back">‹ 메인</button>
        <h1 class="app-title">통계</h1>
      </header>
      <section class="empty-state">
        <p><strong>회차 데이터를 받아오는 중입니다.</strong></p>
        <p>처음 한 번만 1회차부터 최신 회차까지 받아오면 됩니다 (약 12분).</p>
        <p>가장 쉬운 방법:</p>
        <p><code>scripts\\fetch-lotto-draws.bat</code> 파일을 더블클릭</p>
        <p class="empty-note">또는 터미널에서 <code>node scripts/fetch-lotto-draws.mjs</code>.<br />
        완료되면 이 페이지를 새로고침하세요. 통계 / 전적 / 추천 모두 자동으로 실데이터로 동작합니다.</p>
      </section>
    `;
    container.querySelector('[data-action="back"]').addEventListener('click', onBack);
    return;
  }

  const numberStats = computeNumberStats(draws);
  const bonusStats = computeBonusStats(draws);
  const cooccur = computeCooccur(draws);

  // 본번호: 출현 횟수 내림차순
  const numberItems = numberStats
    .map((s) => ({ label: String(s.number), value: s.totalCount }))
    .sort((a, b) => b.value - a.value);

  // 보너스볼: 출현 횟수 내림차순
  const bonusItems = bonusStats
    .map((s) => ({ label: String(s.number), value: s.totalCount, color: '#c9a050' }))
    .sort((a, b) => b.value - a.value);

  // 동시출현 페어 top 20
  const topPairs = [...cooccur]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((p) => ({ label: `${p.a} - ${p.b}`, value: p.count, color: '#10b981' }));

  // Cold (장기 미출현) top 10
  const coldItems = numberStats
    .map((s) => ({ label: String(s.number), value: s.currentGap, color: '#ef4444' }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  container.innerHTML = `
    <header class="app-header stats-header">
      <button type="button" class="btn-secondary" data-action="back">‹ 메인</button>
      <h1 class="app-title">통계</h1>
      <p class="app-subtitle">${draws.length}회차 누적 (참고용)</p>
    </header>

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

  container.querySelector('[data-action="back"]').addEventListener('click', onBack);
}
