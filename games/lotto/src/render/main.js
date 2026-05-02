// 메인 wire-up. 5개 탭 라우팅 (추첨/통계/전적/휠링/설정).
// 추첨 탭: 슬롯 → 번호(hero) → 운세 → 전략 1줄 → 캐릭터 카드(압축).
// SSOT: docs/01_spec.md 4장.
import { renderCharacterForm } from './character-form.js';
import { characterCardHtml } from './character-card.js';
import { drawCardHtml } from './draw-card.js';
import { characterSlotsHtml } from './character-slots.js';
import { strategyTabsHtml } from './strategy-tabs.js';
import { nextDrawCardHtml, startCountdown } from './next-draw-card.js';
import { nextDraw } from '../core/schedule.js';
import { renderStatsPage } from './stats-page.js';
import { renderHistoryPage } from './history-page.js';
import { renderWheelingPage, renderWheelingDisabled } from './wheeling-page.js';
import { renderSettingsPage } from './settings-page.js';
import { bottomTabsHtml, TABS } from './bottom-tabs.js';
import { showModal, showDisclaimer } from './modal.js';
import { recommend } from '../core/recommend.js';
import { fortuneFor } from '../core/fortune.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../core/stats.js';
import { recordRecommendation, matchHistory, backfillRecommendations } from '../core/history.js';
import { applyLuckGrowth } from '../core/luck.js';
import {
  loadCharacters, saveCharacters,
  loadActiveCharacterId, saveActiveCharacterId,
  loadDraws,
  loadOptions, saveOptions,
} from '../data/storage.js';
import { STRATEGY_DEFAULT, DEFAULT_DRWNO_FALLBACK } from '../data/numbers.js';

let appEl = null;
let stopCountdown = null; // 카운트다운 interval 정리 함수. 매 렌더 시작 전 정리.
let strategyScrollLeft = 0; // 전략 탭 가로 스크롤 위치 보존 (클릭 → 재렌더 시 리셋 방지).
const state = {
  characters: [],
  activeId: null,
  drwNo: DEFAULT_DRWNO_FALLBACK,
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
    dayPillar: active.dayPillar,
  });
  return { strategyId, rec, fortune, drawForFortune };
}

function homeTabHtml(active, strategyId, rec, fortune, drawForFortune) {
  const banner = state.draws.length === 0
    ? `<section class="data-banner">
        <strong>회차 데이터 없음.</strong> 통계 / 일진 / 일부 전략이 데이터 기반으로 동작하려면 페치 1회 필요.
        <br /><code>scripts\\fetch-lotto-draws.bat</code> 더블클릭. (1초 미만)
      </section>`
    : '';

  const nextInfo = nextDraw(state.draws);
  // 추천 회차 = 다음 추첨 회차로 항상 고정. nav 제거됨 (spec 5.4 결정론은 history에 보존).
  state.drwNo = nextInfo.drwNo || state.drwNo;
  const heroFortuneClass = fortune === 'bad' ? ' is-bad' : (fortune === 'great' ? ' is-great' : '');

  return `
    <header class="app-header tab-header home-header">
      <h1 class="app-title">Blessed Lotto</h1>
    </header>

    <section class="home-hero${heroFortuneClass}" aria-label="다음 추첨 + 추천">
      ${nextDrawCardHtml(nextInfo)}
      ${drawCardHtml(state.drwNo, rec, fortune)}
    </section>

    ${characterSlotsHtml(state.characters, state.activeId)}

    ${strategyTabsHtml(strategyId)}

    ${characterCardHtml(active, fortune, drawForFortune || state.drwNo)}

    ${banner}
  `;
}

function renderHome(content) {
  const active = getActive();
  const { strategyId, rec, fortune, drawForFortune } = getRecAndFortune(active);

  // 백캐스트: 캐릭터에 최근 30회 결정론적 추천이 history에 없으면 1회 백필.
  // Luck 부트스트랩 목적. SSOT: docs/01_spec.md 7.5.
  let updated = backfillRecommendations(active, state.draws, strategyId, {
    numberStats: state.numberStats,
    bonusStats: state.bonusStats,
    cooccur: state.cooccur,
  });

  // 이력 자동 기록 + 매칭 + Luck 성장
  updated = recordRecommendation(updated, {
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

  content.innerHTML = homeTabHtml(updated, strategyId, rec, fortune, drawForFortune);

  // 카운트다운 시작 (이전 interval은 renderApp 시작 시 정리됨).
  // 추첨 시각 도달 시 자동 재렌더 → 다음 회차 정보로 갱신.
  stopCountdown = startCountdown(content, state.draws, () => renderApp());

  // 전략 탭: 스크롤 위치 복원 + 활성 탭 잘림 보정 + fade 토글 + PC 휠 → 가로 변환.
  const stratScroll = content.querySelector('.strategy-tabs');
  if (stratScroll) {
    stratScroll.scrollLeft = strategyScrollLeft;

    // 활성 탭이 좌/우 가장자리에서 잘려있으면 안으로 들어오도록 보정.
    // 완전히 보이는 경우 변동 0. fade gradient(24px) 안쪽으로 padding 줘서 자연스럽게.
    const activeTab = stratScroll.querySelector('.strategy-tab.is-active');
    if (activeTab) {
      const cRect = stratScroll.getBoundingClientRect();
      const bRect = activeTab.getBoundingClientRect();
      const FADE_PAD = 24; // .strategy-tabs --fade-w와 동일
      if (bRect.left < cRect.left + FADE_PAD) {
        stratScroll.scrollLeft -= (cRect.left + FADE_PAD - bRect.left);
      } else if (bRect.right > cRect.right - FADE_PAD) {
        stratScroll.scrollLeft += (bRect.right - (cRect.right - FADE_PAD));
      }
      strategyScrollLeft = stratScroll.scrollLeft; // 보정된 위치를 기억
    }

    function updateFade() {
      const atStart = stratScroll.scrollLeft <= 1;
      const atEnd = stratScroll.scrollLeft + stratScroll.clientWidth >= stratScroll.scrollWidth - 1;
      stratScroll.classList.toggle('is-start', atStart);
      stratScroll.classList.toggle('is-end', atEnd);
    }
    stratScroll.addEventListener('scroll', updateFade, { passive: true });
    updateFade();

    // PC 마우스 휠 → 가로 스크롤 변환.
    // 트랙패드 가로 스와이프(deltaX 우세)는 OS 기본 동작 유지, 마우스 휠(deltaY 우세)만 변환.
    // 모바일 터치는 wheel 이벤트 발생 안 해서 영향 없음.
    stratScroll.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // 트랙패드 가로 그대로
      if (e.deltaY === 0) return;
      e.preventDefault();
      stratScroll.scrollBy({ left: e.deltaY, behavior: 'auto' });
    }, { passive: false });
  }

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

  // 전략 탭 직접 클릭 (시트 모달 폐기, 즉시 활성 변경)
  content.querySelectorAll('.strategy-tab[data-strategy-id]').forEach((el) => {
    // mousedown에서 default 차단 → 클릭은 살리되 button focus 시 자동 scrollIntoView 차단.
    // (일부 Chromium 빌드는 focus가 컨테이너 안쪽으로 이동 시 자동 scrollIntoViewIfNeeded 발동.)
    el.addEventListener('mousedown', (e) => e.preventDefault());
    el.addEventListener('click', () => {
      const newStrategyId = el.dataset.strategyId;
      const cur = state.characters.find((c) => c.id === state.activeId);
      if (!cur || cur.lastUsedStrategy === newStrategyId) return;
      // 클릭 직전 스크롤 위치 저장 → renderApp 후 복원에 사용
      const tabsEl = content.querySelector('.strategy-tabs');
      if (tabsEl) strategyScrollLeft = tabsEl.scrollLeft;
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
  // 이전 interval 정리 (탭 전환 / 재렌더 시 카운트다운 누수 방지)
  if (stopCountdown) { stopCountdown(); stopCountdown = null; }

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
