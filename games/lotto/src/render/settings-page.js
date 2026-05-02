// 설정 탭. SSOT: docs/01_spec.md 4장.
// 옵션 / 다구좌 토글 / 면책 / 데이터 메타 / 캐릭터 초기화.
import {
  loadOptions, saveOptions,
  loadDraws,
  clearAll,
} from '../data/storage.js';

/**
 * 설정 페이지 렌더 (탭 모델).
 * @param {HTMLElement} container
 * @param {{ onAdvancedToggle: () => void, onShowDisclaimer: () => void, onResetAll: () => void }} handlers
 */
export function renderSettingsPage(container, handlers) {
  const options = loadOptions();
  const draws = loadDraws();
  const lastDraw = draws.length > 0 ? draws[draws.length - 1] : null;

  const dataMeta = lastDraw
    ? `<strong>${lastDraw.drwNo}회</strong>까지 반영 · 최근 추첨 ${lastDraw.drwDate}`
    : '<strong>회차 데이터 없음</strong>';

  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">설정</h1>
    </header>

    <section class="stats-section">
      <h2 class="stats-title">데이터</h2>
      <p class="stats-meta">${dataMeta}</p>
      <p class="stats-note">데이터 출처: smok95/lotto GitHub Pages 미러. 매주 토 추첨 후 자동 갱신. 직접 페치는 <code>scripts/fetch-lotto-draws.bat</code>.</p>
    </section>

    <section class="stats-section">
      <h2 class="stats-title">추첨 옵션</h2>
      <label class="settings-row">
        <input type="checkbox" data-setting="applyFilters" ${options.applyFilters ? 'checked' : ''} />
        <span class="settings-label">
          <strong>비율 필터 적용</strong>
          <span class="settings-hint">번호 합 / 홀짝 / AC값 등 통계 필터 통과 조합만 추천 (균형 조합 외 전략에도 영향).</span>
        </span>
      </label>
    </section>

    <section class="stats-section">
      <h2 class="stats-title">다구좌 모드</h2>
      <p class="stats-note">휠링 (Full / Abbreviated Wheel) 사용 가능. 1등 확률 향상 도구가 아닙니다.</p>
      <button type="button" class="btn-primary" data-action="toggle-advanced">
        ${options.advancedMode ? '다구좌 모드 끄기' : '다구좌 모드 켜기'}
      </button>
    </section>

    <section class="stats-section">
      <h2 class="stats-title">안내</h2>
      <button type="button" class="btn-secondary" data-action="show-disclaimer">면책 / 책임 안내 다시 보기</button>
    </section>

    <section class="stats-section danger-zone">
      <h2 class="stats-title">데이터 초기화</h2>
      <p class="stats-note">캐릭터 / 옵션 / 캐시 모두 삭제. 회차 데이터는 다음 진입 시 재동기화됩니다.</p>
      <button type="button" class="btn-secondary" data-action="reset-all">전체 초기화</button>
    </section>
  `;

  container.querySelector('[data-setting="applyFilters"]').addEventListener('change', (e) => {
    const opts = loadOptions();
    opts.applyFilters = e.target.checked;
    saveOptions(opts);
  });

  container.querySelector('[data-action="toggle-advanced"]').addEventListener('click', handlers.onAdvancedToggle);
  container.querySelector('[data-action="show-disclaimer"]').addEventListener('click', handlers.onShowDisclaimer);
  container.querySelector('[data-action="reset-all"]').addEventListener('click', () => {
    const ok = window.confirm('정말 모든 데이터를 초기화할까요? 캐릭터 / 옵션 / 이력이 모두 삭제됩니다.');
    if (!ok) return;
    clearAll();
    handlers.onResetAll();
  });
}
