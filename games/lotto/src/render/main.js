// 메인 wire-up. 5개 탭 라우팅 (추첨/통계/전적/휠링/설정).
// 추첨 탭: 슬롯 → 번호(hero) → 운세 → 전략 1줄 → 캐릭터 카드(압축).
// SSOT: docs/01_spec.md 4장.
import { renderCharacterForm } from './character-form.js';
import { characterCardHtml } from './character-card.js';
import { drawCardHtml } from './draw-card.js';
import { characterSlotsHtml } from './character-slots.js';
import { strategyBarHtml, openStrategySheet } from './strategy-sheet.js';
import { renderStatsPage } from './stats-page.js';
import { renderHistoryPage } from './history-page.js';
import { renderWheelingPage, renderWheelingDisabled } from './wheeling-page.js';
import { renderSettingsPage } from './settings-page.js';
import { bottomTabsHtml, TABS } from './bottom-tabs.js';
import { showModal, showDisclaimer } from './modal.js';
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
  currentTab: 'home',
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

function setTab(tabId) {
  if (!TABS.find((t) => t.id === tabId)) return;
  state.currentTab = tabId;
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

function getActive() {
  let active = state.characters.find((c) => c.id === state.activeId);
  if (!active) {
    active = state.characters[0];
    state.activeId = active.id;
    saveActiveCharacterId(active.id);
  }
  return active;
}

function getRecAndFortune(active) {
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
  return { strategyId, rec, fortune };
}

function homeTabHtml(active, strategyId, rec, fortune) {
  const banner = state.draws.length === 0
    ? `<section class="data-banner">
        <strong>회차 데이터 없음.</strong> 통계 / 일진 / 일부 전략이 데이터 기반으로 동작하려면 페치 1회 필요.
        <br /><code>scripts\\fetch-lotto-draws.bat</code> 더블클릭. (1초 미만)
      </section>`
    : '';

  return `
    <header class="app-header tab-header home-header">
      <h1 class="app-title">Blessed Lotto</h1>
      <p class="app-subtitle">참고용 추천 - 매 회차 1/8,145,060</p>
    </header>

    ${characterSlotsHtml(state.characters, state.activeId)}

    ${drawCardHtml(state.drwNo, rec, fortune)}

    ${strategyBarHtml(strategyId)}

    ${characterCardHtml(active, fortune)}

    ${banner}
    <p class="legal">본 추천은 참고용입니다. 매 회차 모든 조합의 당첨 확률은 1/8,145,060로 동일합니다.</p>
  `;
}

function renderHome(content) {
  const active = getActive();
  const { strategyId, rec, fortune } = getRecAndFortune(active);

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
  state.characters = state.characters.map((c) => (c.id === updated.id ? updated : c));
  saveCharacters(state.characters);

  content.innerHTML = homeTabHtml(updated, strategyId, rec, fortune);

  // 슬롯 클릭
  content.querySelectorAll('[data-slot-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.slotId;
      if (id === state.activeId) return;
      state.activeId = id;
      saveActiveCharacterId(id);
      renderApp();
    });
  });

  // 슬롯 추가/삭제
  content.querySelector('[data-action="add-character"]')?.addEventListener('click', openAddCharacterModal);
  content.querySelector('[data-action="delete-active"]')?.addEventListener('click', deleteActive);

  // 회차 이동
  content.querySelector('[data-action="prev-draw"]').addEventListener('click', () => {
    if (state.drwNo > 1) {
      state.drwNo -= 1;
      renderApp();
    }
  });
  content.querySelector('[data-action="next-draw"]').addEventListener('click', () => {
    state.drwNo += 1;
    renderApp();
  });

  // 전략 시트
  content.querySelector('[data-action="open-strategy-sheet"]').addEventListener('click', () => {
    openStrategySheet(showModal, strategyId, (newStrategyId) => {
      const cur = state.characters.find((c) => c.id === state.activeId);
      if (!cur || cur.lastUsedStrategy === newStrategyId) return;
      cur.lastUsedStrategy = newStrategyId;
      saveCharacters(state.characters);
      renderApp();
    });
  });
}

function activateAdvanced(after) {
  if (state.options.advancedMode) {
    if (after) after();
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
      if (after) after();
      renderApp();
    },
  });
}

function toggleAdvancedFromSettings() {
  if (state.options.advancedMode) {
    state.options.advancedMode = false;
    saveOptions(state.options);
    renderApp();
    return;
  }
  activateAdvanced();
}

function renderApp() {
  if (state.characters.length === 0) {
    renderCharacterForm(appEl, (character) => {
      addAndActivate(character);
    });
    return;
  }

  // 탭 컨테이너 + 하단 탭 구조
  appEl.innerHTML = `
    <div id="tab-content"></div>
    ${bottomTabsHtml(state.currentTab)}
  `;
  const content = appEl.querySelector('#tab-content');

  // 본문 분기
  if (state.currentTab === 'home') {
    renderHome(content);
  } else if (state.currentTab === 'stats') {
    renderStatsPage(content);
  } else if (state.currentTab === 'history') {
    const active = getActive();
    renderHistoryPage(content, active);
  } else if (state.currentTab === 'wheeling') {
    if (state.options.advancedMode) {
      const active = getActive();
      const { rec } = getRecAndFortune(active);
      renderWheelingPage(content, rec);
    } else {
      renderWheelingDisabled(content, () => activateAdvanced(() => setTab('wheeling')));
    }
  } else if (state.currentTab === 'settings') {
    renderSettingsPage(content, {
      onAdvancedToggle: toggleAdvancedFromSettings,
      onShowDisclaimer: () => showDisclaimer(),
      onResetAll: () => {
        state.characters = [];
        state.activeId = null;
        state.options = { applyFilters: false, advancedMode: false };
        renderApp();
      },
    });
  }

  // 하단 탭 바인딩
  appEl.querySelectorAll('.tab-item[data-tab-id]').forEach((el) => {
    el.addEventListener('click', () => setTab(el.dataset.tabId));
  });
}
