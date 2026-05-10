// 설정 탭. SSOT: docs/01_spec.md 4장.
// 캐릭터 관리(T1) + 프리셋 관리(S61) + 옵션 + 다구좌 모드 + 휠링 진입(T2) + 면책 + 데이터 + 초기화.
import {
  loadOptions, saveOptions,
  loadDraws, loadCharacters, loadActiveCharacterId,
  loadPresets, savePresets,
  clearAll,
} from '../data/storage.js';
import { DEFAULT_PRESETS, PRESET_SLOT_COUNT } from '../data/numbers.js';
import { strategyLabel } from './strategy-picker.js';
import { openPresetEditor } from './preset-editor.js';
import { plus, close } from './icons.js';

/**
 * 설정 페이지 렌더 (탭 모델).
 * @param {HTMLElement} container
 * @param {{
 *   onAdvancedToggle: () => void,
 *   onShowDisclaimer: () => void,
 *   onResetAll: () => void,
 *   onAddCharacter: () => void,
 *   onDeleteCharacter: (id: string) => void,
 *   onActivateCharacter: (id: string) => void,
 *   onOpenWheeling: () => void,
 *   onMultiStrategyToggle: () => void,
 *   onFiveSetsToggle: () => void,
 *   onPresetsChanged?: () => void,
 * }} handlers
 */
export function renderSettingsPage(container, handlers) {
  const options = loadOptions();
  const draws = loadDraws();
  const characters = loadCharacters();
  const activeId = loadActiveCharacterId();
  const presets = loadPresets();
  const lastDraw = draws.length > 0 ? draws[draws.length - 1] : null;

  const dataMeta = lastDraw
    ? `<strong>${lastDraw.drwNo}회</strong>까지 반영 · 최근 추첨 ${lastDraw.drwDate}`
    : '<strong>회차 데이터 없음</strong>';

  // S61 (2026-05-10): 프리셋 관리 섹션. 추첨 탭의 "편집" 텍스트 링크가 본 영역으로 이동.
  // S63 (2026-05-10): subtitle 필드 폐기. 묶인 전략 label list 자동 표시 (추첨 탭 슬롯과 일관).
  // SSOT: docs/01_spec.md 5.1.5.2.
  const presetRows = (presets || []).slice(0, PRESET_SLOT_COUNT).map((p, idx) => {
    const sids = Array.isArray(p?.strategyIds) ? p.strategyIds : [];
    const strategyLine = sids.map((sid) => strategyLabel(sid)).filter(Boolean).join(' · ');
    return `
      <li class="preset-manage-row">
        <button type="button" class="preset-manage-main" data-preset-id="${escapeAttr(p?.id || `preset-${idx + 1}`)}"
                data-preset-idx="${idx}"
                aria-label="슬롯 ${idx + 1} 편집">
          <span class="preset-manage-label">${escapeHtml(p?.label || `슬롯 ${idx + 1}`)}</span>
          <span class="preset-manage-strategies">${escapeHtml(strategyLine || '(전략 없음)')}</span>
        </button>
      </li>
    `;
  }).join('');

  const canDelete = characters.length > 1;
  const charRows = characters.map((c) => {
    const isActive = c.id === activeId;
    return `
      <li class="char-row${isActive ? ' is-active' : ''}">
        <button type="button" class="char-row-main" data-char-id="${escapeAttr(c.id)}"
                aria-pressed="${isActive ? 'true' : 'false'}"
                title="${escapeAttr(c.name)}로 활성">
          <span class="char-row-name">${escapeHtml(c.name)}</span>
          <span class="char-row-meta">${escapeHtml(animalLabel(c.animalSign))} · ${escapeHtml(zodiacLabelShort(c.zodiac))}</span>
          ${isActive ? '<span class="char-row-active-badge">활성</span>' : ''}
        </button>
        <button type="button" class="char-row-del" data-char-del-id="${escapeAttr(c.id)}"
                ${!canDelete ? 'disabled' : ''}
                aria-label="${escapeAttr(c.name)} 캐릭터 삭제">${close()}</button>
      </li>
    `;
  }).join('');

  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">설정</h1>
    </header>

    <section class="stats-section">
      <h2 class="stats-title">캐릭터 관리</h2>
      <p class="stats-note">캐릭터 추가 / 삭제는 본 영역에서 합니다. 추첨 탭의 슬롯은 빠른 전환 전용.</p>
      <ul class="char-list">${charRows}</ul>
      <button type="button" class="btn-primary char-add" data-action="add-character">
        ${plus()} 새 캐릭터 추가
      </button>
    </section>

    <section class="stats-section">
      <h2 class="stats-title">프리셋 관리</h2>
      <p class="stats-note">추첨 탭의 프리셋 ${PRESET_SLOT_COUNT}슬롯을 편집합니다. 슬롯 행을 누르면 라벨 / 부제 / 묶을 전략을 바꿀 수 있어요.</p>
      <ul class="preset-manage-list">${presetRows}</ul>
      <button type="button" class="btn-secondary" data-action="reset-presets">기본값 복원</button>
    </section>

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
      <label class="settings-row">
        <input type="checkbox" data-setting="fiveSets" ${options.fiveSets ? 'checked' : ''} />
        <span class="settings-label">
          <strong>5세트 동시 추천</strong>
          <span class="settings-hint">한 회차에 시드 변형으로 5장 결정론 추천 표시 (메인 1장 + 컴팩트 4장). 이력 기록 / Luck 매칭은 메인만. 5장 구매 권유 아님, 당첨 확률 변화 없음.</span>
        </span>
      </label>
    </section>

    <section class="stats-section">
      <h2 class="stats-title">다구좌 모드 (휠링)</h2>
      <p class="stats-note">여러 장 분산 구매로 부분 당첨 보장. 1등 확률 향상 도구가 아닙니다. 라이트 사용자에겐 권장하지 않습니다.</p>
      <div class="settings-row-actions">
        <button type="button" class="btn-primary" data-action="toggle-advanced">
          ${options.advancedMode ? '다구좌 모드 끄기' : '다구좌 모드 켜기'}
        </button>
        ${options.advancedMode ? '<button type="button" class="btn-secondary" data-action="open-wheeling">휠링 페이지 열기</button>' : ''}
      </div>
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

  container.querySelector('[data-setting="fiveSets"]').addEventListener('change', (e) => {
    const opts = loadOptions();
    opts.fiveSets = e.target.checked;
    saveOptions(opts);
    handlers.onFiveSetsToggle();
  });

  container.querySelector('[data-action="toggle-advanced"]').addEventListener('click', handlers.onAdvancedToggle);
  container.querySelector('[data-action="show-disclaimer"]').addEventListener('click', handlers.onShowDisclaimer);
  container.querySelector('[data-action="reset-all"]').addEventListener('click', () => {
    const ok = window.confirm('정말 모든 데이터를 초기화할까요? 캐릭터 / 옵션 / 이력이 모두 삭제됩니다.');
    if (!ok) return;
    clearAll();
    handlers.onResetAll();
  });
  container.querySelector('[data-action="add-character"]').addEventListener('click', handlers.onAddCharacter);

  // 휠링 페이지 진입 (T2)
  const openWheelBtn = container.querySelector('[data-action="open-wheeling"]');
  if (openWheelBtn) openWheelBtn.addEventListener('click', handlers.onOpenWheeling);

  // 캐릭터 행 활성 / 삭제
  container.querySelectorAll('[data-char-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.charId;
      if (id !== activeId) handlers.onActivateCharacter(id);
    });
  });
  container.querySelectorAll('[data-char-del-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.disabled) return;
      const id = el.dataset.charDelId;
      handlers.onDeleteCharacter(id);
    });
  });

  // S61 (2026-05-10): 프리셋 관리 - 슬롯 행 클릭 시 편집 모달, 기본값 복원 버튼.
  container.querySelectorAll('[data-preset-idx]').forEach((el) => {
    el.addEventListener('click', () => {
      openPresetEditor(loadPresets(), () => {
        // 모달 저장 후 설정 탭 자체 재렌더 + 추첨 탭 동기화 신호.
        renderSettingsPage(container, handlers);
        if (typeof handlers.onPresetsChanged === 'function') handlers.onPresetsChanged();
      });
    });
  });
  container.querySelector('[data-action="reset-presets"]')?.addEventListener('click', () => {
    const ok = window.confirm('기본 3종 (균형 / 분산파 / 운세파)으로 되돌릴까요?');
    if (!ok) return;
    savePresets(JSON.parse(JSON.stringify(DEFAULT_PRESETS)));
    renderSettingsPage(container, handlers);
    if (typeof handlers.onPresetsChanged === 'function') handlers.onPresetsChanged();
  });
}

const ANIMAL_LABELS = {
  rat: '쥐띠', ox: '소띠', tiger: '호랑이띠', rabbit: '토끼띠', dragon: '용띠', snake: '뱀띠',
  horse: '말띠', goat: '양띠', monkey: '원숭이띠', rooster: '닭띠', dog: '개띠', pig: '돼지띠',
};
function animalLabel(id) { return ANIMAL_LABELS[id] || ''; }

const ZODIAC_LABELS_SHORT = {
  aries: '양', taurus: '황소', gemini: '쌍둥이', cancer: '게', leo: '사자', virgo: '처녀',
  libra: '천칭', scorpio: '전갈', sagittarius: '궁수', capricorn: '염소', aquarius: '물병', pisces: '물고기',
};
function zodiacLabelShort(id) { return ZODIAC_LABELS_SHORT[id] || ''; }

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
