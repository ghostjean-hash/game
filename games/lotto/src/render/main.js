// 메인 화면 wire-up.
// 캐릭터(정체성) + 전략(추첨 도구)을 분리해서 표시.
import { renderCharacterForm } from './character-form.js';
import { characterCardHtml } from './character-card.js';
import { drawCardHtml } from './draw-card.js';
import { characterSlotsHtml } from './character-slots.js';
import { strategyPickerHtml } from './strategy-picker.js';
import { renderStatsPage } from './stats-page.js';
import { renderHistoryPage } from './history-page.js';
import { renderWheelingPage } from './wheeling-page.js';
import { showModal } from './modal.js';
import { recommend } from '../core/recommend.js';
import { fortuneFor } from '../core/fortune.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../core/stats.js';
import { recordRecommendation, matchHistory } from '../core/history.js';
import { applyLuckGrowth } from '../core/luck.js';
import {
  loadCharacters, saveCharacters,
  loadActiveCharacterId, saveActiveCharacterId,
  loadDraws,
  loadOptions, saveOptions,
} from '../data/storage.js';
import { STRATEGY_DEFAULT } from '../data/numbers.js';

// 페치 데이터 없을 때 기본값. 페치 후엔 자동으로 latest + 1로 갱신됨.
// 2026-05-01 기준 1222회차가 다음 추첨(2026-05-02 토)으로 확인됨.
const DEFAULT_DRWNO = 1222;

let appEl = null;
const state = {
  characters: [],
  activeId: null,
  drwNo: DEFAULT_DRWNO,
  draws: [],
  numberStats: [],
  bonusStats: [],
  cooccur: [],
  options: { applyFilters: false, advancedMode: false },
};

export function initRender(rootEl) {
  appEl = rootEl;
  state.characters = loadCharacters();
  state.activeId = loadActiveCharacterId();
  state.draws = loadDraws();
  state.numberStats = computeNumberStats(state.draws);
  state.bonusStats = computeBonusStats(state.draws);
  state.cooccur = computeCooccur(state.draws);
  state.options = loadOptions();

  if (state.draws.length > 0) {
    const sorted = [...state.draws].sort((a, b) => b.drwNo - a.drwNo);
    state.drwNo = sorted[0].drwNo + 1;
  }

  renderApp();
}

function addAndActivate(character) {
  state.characters.push(character);
  state.activeId = character.id;
  saveCharacters(state.characters);
  saveActiveCharacterId(character.id);
  renderApp();
}

function openAddCharacterModal() {
  const closeModal = showModal('<div id="char-form-host"></div>');
  const host = document.getElementById('char-form-host');
  renderCharacterForm(host, (character) => {
    closeModal();
    addAndActivate(character);
  });
}

function deleteActive() {
  if (state.characters.length <= 1) return;
  const active = state.characters.find((c) => c.id === state.activeId);
  const ok = window.confirm(`'${active ? active.name : '활성'}' 캐릭터를 삭제할까요?`);
  if (!ok) return;
  state.characters = state.characters.filter((c) => c.id !== state.activeId);
  state.activeId = state.characters[0].id;
  saveCharacters(state.characters);
  saveActiveCharacterId(state.activeId);
  renderApp();
}

function renderApp() {
  if (state.characters.length === 0) {
    renderCharacterForm(appEl, (character) => {
      addAndActivate(character);
    });
    return;
  }

  let active = state.characters.find((c) => c.id === state.activeId);
  if (!active) {
    active = state.characters[0];
    state.activeId = active.id;
    saveActiveCharacterId(active.id);
  }

  // 활성 캐릭터의 마지막 사용 전략 (없으면 기본)
  const strategyId = active.lastUsedStrategy || STRATEGY_DEFAULT;

  const drawForFortune = state.draws.find((d) => d.drwNo === state.drwNo) || null;
  const fortune = fortuneFor(active.seed, state.drwNo, active.animalSign, drawForFortune, active.dayPillar);
  const rec = recommend({
    seed: active.seed,
    strategyId,
    luck: active.luck,
    drwNo: state.drwNo,
    numberStats: state.numberStats,
    bonusStats: state.bonusStats,
    cooccur: state.cooccur,
    zodiac: active.zodiac,
    mbti: active.mbti,
  });

  // 이력 자동 기록 + 매칭 + Luck 성장
  let updated = recordRecommendation(active, {
    drwNo: state.drwNo,
    numbers: rec.numbers,
    bonus: rec.bonus,
    reasons: rec.reasons,
    createdAt: new Date().toISOString(),
  });
  updated = matchHistory(updated, state.draws);
  updated = applyLuckGrowth(updated);
  state.characters = state.characters.map((c) => (c.id === active.id ? updated : c));
  saveCharacters(state.characters);
  active = updated;

  appEl.innerHTML = `
    <header class="app-header">
      <h1 class="app-title">Blessed Lotto</h1>
      <p class="app-subtitle">캐릭터 시드 기반 6/45 추천 (참고용)</p>
    </header>
    ${characterSlotsHtml(state.characters, state.activeId)}
    ${strategyPickerHtml(strategyId)}
    ${characterCardHtml(active, fortune)}
    ${drawCardHtml(state.drwNo, rec, fortune)}
    <div class="actions">
      <button type="button" class="btn-secondary" data-action="prev-draw">‹ 이전 회차</button>
      <button type="button" class="btn-secondary" data-action="next-draw">다음 회차 ›</button>
    </div>
    <div class="actions">
      <button type="button" class="btn-secondary" data-action="stats">통계 보기</button>
      <button type="button" class="btn-secondary" data-action="history">전적 보기</button>
    </div>
    <div class="actions">
      <button type="button" class="btn-secondary" data-action="toggle-advanced">${state.options.advancedMode ? '다구좌 모드 ON' : '다구좌 모드 OFF'}</button>
      ${state.options.advancedMode ? '<button type="button" class="btn-secondary" data-action="wheeling">휠링 보기</button>' : ''}
    </div>
    ${state.draws.length === 0 ? `
      <section class="data-banner">
        <strong>회차 데이터 없음.</strong> 통계 / 일진 / 일부 전략이 데이터 기반으로 동작하려면 1회 페치가 필요합니다.
        <br /><code>scripts\\fetch-lotto-draws.bat</code> 더블클릭 또는 <code>node scripts/fetch-lotto-draws.mjs</code>. (약 12분)
      </section>
    ` : ''}
    <p class="legal">본 추천은 참고용입니다. 매 회차 모든 조합의 당첨 확률은 1/8,145,060로 동일합니다.</p>
  `;

  // 슬롯 클릭 (캐릭터 전환)
  appEl.querySelectorAll('[data-slot-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.slotId;
      if (id === state.activeId) return;
      state.activeId = id;
      saveActiveCharacterId(id);
      renderApp();
    });
  });

  // 전략 picker 클릭
  appEl.querySelectorAll('[data-strategy-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.strategyId;
      const cur = state.characters.find((c) => c.id === state.activeId);
      if (!cur || cur.lastUsedStrategy === id) return;
      cur.lastUsedStrategy = id;
      saveCharacters(state.characters);
      renderApp();
    });
  });

  // 추가 / 삭제
  appEl.querySelector('[data-action="add-character"]')?.addEventListener('click', openAddCharacterModal);
  appEl.querySelector('[data-action="delete-active"]')?.addEventListener('click', deleteActive);

  // 회차 이동
  appEl.querySelector('[data-action="prev-draw"]').addEventListener('click', () => {
    if (state.drwNo > 1) {
      state.drwNo -= 1;
      renderApp();
    }
  });
  appEl.querySelector('[data-action="next-draw"]').addEventListener('click', () => {
    state.drwNo += 1;
    renderApp();
  });
  appEl.querySelector('[data-action="stats"]').addEventListener('click', () => {
    renderStatsPage(appEl, () => renderApp());
  });
  appEl.querySelector('[data-action="history"]').addEventListener('click', () => {
    const cur = state.characters.find((c) => c.id === state.activeId);
    if (cur) renderHistoryPage(appEl, cur, () => renderApp());
  });

  // 다구좌 모드 토글 (첫 ON 시 윤리 안내 모달)
  appEl.querySelector('[data-action="toggle-advanced"]').addEventListener('click', () => {
    if (state.options.advancedMode) {
      state.options.advancedMode = false;
      saveOptions(state.options);
      renderApp();
      return;
    }
    showModal(`
      <h2>다구좌 모드 안내</h2>
      <p>휠링 같은 분산 구매 도구를 활성화합니다.</p>
      <p><strong>중요:</strong></p>
      <p>각 티켓의 1등 확률은 동일합니다 (1/8,145,060). 티켓 수만큼 비례 증가할 뿐입니다.</p>
      <p>휠링은 <strong>부분 당첨 보장</strong>이며, 1등 보장이 아닙니다.</p>
      <p>비용 증가에 비례한 가치 보장은 없습니다. 본 게임은 도박 권유가 아닙니다.</p>
      <button type="button" class="modal-confirm" data-action="confirm">이해했습니다</button>
    `, {
      onConfirm: () => {
        state.options.advancedMode = true;
        saveOptions(state.options);
        renderApp();
      },
    });
  });

  // 휠링 페이지
  appEl.querySelector('[data-action="wheeling"]')?.addEventListener('click', () => {
    renderWheelingPage(appEl, rec, () => renderApp());
  });
}
