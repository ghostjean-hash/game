// 메인 wire-up. 5개 탭 라우팅 (추첨/통계/전적/휠링/설정).
// 추첨 탭: 슬롯 → 번호(hero) → 운세 → 전략 1줄 → 캐릭터 카드(압축).
// SSOT: docs/01_spec.md 4장.
import { renderCharacterForm } from './character-form.js';
import { characterCardHtml } from './character-card.js';
import { drawCardHtml, fiveSetsExtraHtml } from './draw-card.js';
import { reverseSearch } from '../core/reverse.js';
import { characterSlotsHtml } from './character-slots.js';
import { strategyTabsHtml } from './strategy-tabs.js';
import { nextDrawCardHtml, startCountdown } from './next-draw-card.js';
import { nextDraw } from '../core/schedule.js';
import { renderStatsPage } from './stats-page.js';
import { renderHistoryPage } from './history-page.js';
import { renderReversePage } from './reverse-page.js';
import { renderWheelingPage, renderWheelingDisabled } from './wheeling-page.js';
import { renderSettingsPage } from './settings-page.js';
import { bottomTabsHtml, TABS } from './bottom-tabs.js';
import { showModal, showDisclaimer } from './modal.js';
import { ritualWidgetHtml, openRitualModal } from './ritual-widget.js';
import { spawnRitualBurst } from './ritual-particles.js';
import { recommend, recommendMulti, recommendFiveSets } from '../core/recommend.js';
import { fortuneFor } from '../core/fortune.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../core/stats.js';
import { recordRecommendation, matchHistory, backfillRecommendations } from '../core/history.js';
import { applyLuckGrowth } from '../core/luck.js';
import { ensureCurrentState, performRitual, applyRitualBonus } from '../core/ritual.js';
import {
  loadCharacters, saveCharacters,
  loadActiveCharacterId, saveActiveCharacterId,
  loadDraws,
  loadOptions, saveOptions,
  loadRitualState, saveRitualState,
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
  options: { applyFilters: false, advancedMode: false, multiStrategy: false, fiveSets: false },
  currentTab: 'home',
  ritual: null, // T4: 행운 의식 상태 (charId+drwNo 기준 격리, 회차 변경 시 자동 리셋)
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
  state.ritual = loadRitualState(); // T4: 회차/캐릭터 변경 시 ensureCurrentState로 갱신

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
  // T1: 추첨 탭 슬롯에서 호출 안 됨. 설정 탭의 캐릭터 삭제 핸들러는 deleteCharacterById.
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

function deleteCharacterById(id) {
  // T1: 설정 탭에서 임의 캐릭터 삭제. 마지막 1명일 때 비활성.
  if (state.characters.length <= 1) return;
  const target = state.characters.find((c) => c.id === id);
  if (!target) return;
  const ok = window.confirm(`'${target.name}' 캐릭터를 삭제할까요?`);
  if (!ok) return;
  state.characters = state.characters.filter((c) => c.id !== id);
  if (state.activeId === id) {
    state.activeId = state.characters[0].id;
    saveActiveCharacterId(state.activeId);
  }
  saveCharacters(state.characters);
  renderApp();
}

/**
 * T4: 행운 의식 모달 열기 + 행위 수행 콜백 wiring.
 * 행위 수행 후 만땅이면 Luck +5 보너스 적용. 모달 닫힐 때 메인 재렌더로 게이지 위젯 + 캐릭터 카드 갱신.
 */
function openRitualModalForActive() {
  const active = getActive();
  state.ritual = ensureCurrentState(state.ritual, active.id, state.drwNo);

  let currentClose = null;
  const onClose = () => renderApp();

  const onPerform = (ritualId) => {
    const result = performRitual(state.ritual, ritualId);
    if (!result.didApply) return;
    state.ritual = result.state;

    let burstNow = false;
    if (result.justFilled) {
      // 만땅 → Luck 보너스 적용 + 캐릭터 갱신
      const cur = state.characters.find((c) => c.id === state.ritual.charId) || active;
      const bonus = applyRitualBonus(cur, state.ritual);
      if (bonus.applied) {
        state.ritual = bonus.state;
        state.characters = state.characters.map((c) => (c.id === cur.id ? bonus.character : c));
        saveCharacters(state.characters);
        burstNow = true; // S4-T2: 만땅 진입 직후 파티클 트리거
      }
    }
    saveRitualState(state.ritual);

    // 모달 닫고 다시 열어 갱신된 state로 그림 (게이지 진행 시각화)
    if (currentClose) currentClose();
    currentClose = openRitualModal(state.ritual, onPerform, onClose);

    // S4-T2: 만땅 진입 trigger Canvas 파티클. 모달 재렌더 직후 (banner DOM 잡힘).
    if (burstNow) {
      // microtask 1단 늦춰 새 모달의 banner 노드가 DOM에 attach된 후 좌표 측정.
      window.requestAnimationFrame(() => {
        const banner = document.querySelector('.ritual-complete-banner')
          || document.querySelector('[data-role="ritual-modal"]')
          || document.body;
        spawnRitualBurst(banner);
      });
    }
  };

  currentClose = openRitualModal(state.ritual, onPerform, onClose);
}

function activateCharacterById(id) {
  // T1: 설정 탭에서 캐릭터 활성 전환.
  const target = state.characters.find((c) => c.id === id);
  if (!target) return;
  state.activeId = id;
  saveActiveCharacterId(id);
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
  const drawForFortune = state.draws.find((d) => d.drwNo === state.drwNo) || null;
  const fortune = fortuneFor(active.seed, state.drwNo, active.animalSign, drawForFortune, active.dayPillar);

  const ctxBase = {
    seed: active.seed,
    luck: active.luck,
    drwNo: state.drwNo,
    numberStats: state.numberStats,
    bonusStats: state.bonusStats,
    cooccur: state.cooccur,
    zodiac: active.zodiac,
    dayPillar: active.dayPillar,
  };

  // S3-T1: 다중 전략 모드 분기
  const isMulti = !!state.options.multiStrategy;
  const strategyIds = isMulti ? activeStrategyIds(active) : null;
  // S8 마이그레이션: lastUsedStrategy === 'mbti'였던 캐릭터는 STRATEGY_DEFAULT로 fallback.
  const rawSingleId = active.lastUsedStrategy || STRATEGY_DEFAULT;
  const strategyId = isMulti ? strategyIds[0] : (rawSingleId === 'mbti' ? STRATEGY_DEFAULT : rawSingleId);

  // S4-T1: 5세트 모드. ON이면 메인(rec) = sets[0], 추가 sets[1..4]를 함께 반환.
  if (state.options.fiveSets) {
    const ctx = isMulti ? { ...ctxBase, strategyIds } : { ...ctxBase, strategyId };
    const sets = recommendFiveSets(ctx, { multi: isMulti });
    return { strategyId, strategyIds: isMulti ? strategyIds : [strategyId], rec: sets[0], sets, fortune, drawForFortune };
  }

  // 5세트 OFF: 기존 동작
  if (isMulti) {
    const rec = recommendMulti({ ...ctxBase, strategyIds });
    return { strategyId, strategyIds, rec, sets: null, fortune, drawForFortune };
  }

  const rec = recommend({ ...ctxBase, strategyId });
  return { strategyId, strategyIds: [strategyId], rec, sets: null, fortune, drawForFortune };
}

/**
 * S3-T1: 캐릭터의 다중 전략 선택 목록 반환. 마이그레이션 fallback 포함.
 * S8: 'mbti' 잔존 ID는 필터링 (폐지됨).
 */
function activeStrategyIds(character) {
  let raw;
  if (Array.isArray(character.lastUsedStrategies) && character.lastUsedStrategies.length > 0) {
    raw = character.lastUsedStrategies;
  } else {
    raw = [character.lastUsedStrategy || STRATEGY_DEFAULT];
  }
  const filtered = raw.filter((id) => id !== 'mbti');
  return filtered.length > 0 ? filtered : [STRATEGY_DEFAULT];
}

/**
 * S5-T1: 5세트 #2~#5에 대해 reverseSearch로 과거 매칭 정보 산출.
 * sets와 동일 길이 배열. [0]은 hero가 처리하므로 null 자리.
 */
function computeFiveSetsMatchInfos(sets, draws) {
  if (!Array.isArray(sets) || sets.length === 0) return null;
  if (!Array.isArray(draws) || draws.length === 0) return sets.map(() => null);
  return sets.map((s, i) => {
    if (i === 0) return null; // 메인 #1은 hero에서 별도 처리
    const r = reverseSearch(s.numbers, draws);
    return { bestRank: r.bestRank, bestRankCount: r.bestRankCount };
  });
}

function homeTabHtml(active, strategyId, strategyIds, rec, fortune, drawForFortune, sets) {
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

  // T4: 행운 의식 게이지 위젯 (회차/캐릭터 변경 시 자동 리셋)
  state.ritual = ensureCurrentState(state.ritual, active.id, state.drwNo);
  saveRitualState(state.ritual);

  // S5-T2: 의식 만땅 시 추천 카드 #1 골드 글로우.
  const ritualFilled = !!(state.ritual && state.ritual.appliedBonus);

  return `
    <header class="app-header tab-header home-header">
      <h1 class="app-title">Blessed Lotto</h1>
    </header>

    <section class="home-hero${heroFortuneClass}" aria-label="다음 추첨 + 추천">
      ${nextDrawCardHtml(nextInfo)}
      ${drawCardHtml(state.drwNo, rec, fortune, { ritualFilled })}
      ${fiveSetsExtraHtml(sets, computeFiveSetsMatchInfos(sets, state.draws))}
    </section>

    ${characterSlotsHtml(state.characters, state.activeId)}

    ${ritualWidgetHtml(state.ritual)}

    ${state.options.multiStrategy
      ? strategyTabsHtml(strategyIds, { multi: true })
      : strategyTabsHtml(strategyId)}

    ${characterCardHtml(active, fortune, drawForFortune || state.drwNo)}

    ${banner}
  `;
}

function renderHome(content) {
  const active = getActive();
  const { strategyId, strategyIds, rec, sets, fortune, drawForFortune } = getRecAndFortune(active);

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

  content.innerHTML = homeTabHtml(updated, strategyId, strategyIds, rec, fortune, drawForFortune, sets);

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

  // T1: 슬롯의 +/× 버튼 폐기. 추가/삭제는 설정 탭에서.

  // S3-T3: 캐릭터 카드 행운 토글 (4종 중 1종 보기)
  const luckyCard = content.querySelector('.char-lucky');
  if (luckyCard) {
    const tabs = luckyCard.querySelectorAll('[data-lucky-tab-idx]');
    const panels = luckyCard.querySelectorAll('[data-lucky-panel-idx]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const idx = tab.dataset.luckyTabIdx;
        tabs.forEach((t) => {
          const isActive = t.dataset.luckyTabIdx === idx;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        panels.forEach((p) => {
          const isActive = p.dataset.luckyPanelIdx === idx;
          p.classList.toggle('is-active', isActive);
          if (isActive) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
      });
    });
  }

  // T4: 행운 의식 위젯 클릭 → 8행위 모달
  content.querySelector('[data-action="open-ritual"]')?.addEventListener('click', () => {
    openRitualModalForActive();
  });

  // 전략 탭 직접 클릭. 다중 모드면 토글, 단일 모드면 활성 변경. (S3-T1)
  content.querySelectorAll('.strategy-tab[data-strategy-id]').forEach((el) => {
    // mousedown에서 default 차단 → 클릭은 살리되 button focus 시 자동 scrollIntoView 차단.
    el.addEventListener('mousedown', (e) => e.preventDefault());
    el.addEventListener('click', () => {
      if (el.classList.contains('is-disabled')) return; // 다중 모드 만선 비활성

      const newStrategyId = el.dataset.strategyId;
      const cur = state.characters.find((c) => c.id === state.activeId);
      if (!cur) return;
      const tabsEl = content.querySelector('.strategy-tabs');
      if (tabsEl) strategyScrollLeft = tabsEl.scrollLeft;

      if (state.options.multiStrategy) {
        // 다중 모드: 토글
        const list = activeStrategyIds(cur);
        let next;
        if (list.includes(newStrategyId)) {
          // 제거. 단 마지막 1개는 보존 (최소 1개 필수).
          if (list.length === 1) return;
          next = list.filter((id) => id !== newStrategyId);
        } else {
          if (list.length >= 6) return; // MULTI_STRATEGY_MAX cap
          next = [...list, newStrategyId];
        }
        cur.lastUsedStrategies = next;
        cur.lastUsedStrategy = next[0]; // 단일 모드 호환 유지
      } else {
        if (cur.lastUsedStrategy === newStrategyId) return;
        cur.lastUsedStrategy = newStrategyId;
        cur.lastUsedStrategies = [newStrategyId]; // 다중 모드 진입 시 일관성
      }
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
  } else if (state.currentTab === 'reverse') {
    renderReversePage(content, state.draws);
  } else if (state.currentTab === 'wheeling') {
    const goBackToSettings = () => setTab('settings'); // S2-T2: 설정으로 돌아가기
    if (state.options.advancedMode) {
      const active = getActive();
      const { rec } = getRecAndFortune(active);
      renderWheelingPage(content, rec, goBackToSettings);
    } else {
      renderWheelingDisabled(content, () => activateAdvanced(() => setTab('wheeling')), goBackToSettings);
    }
  } else if (state.currentTab === 'settings') {
    renderSettingsPage(content, {
      onAdvancedToggle: toggleAdvancedFromSettings,
      onShowDisclaimer: () => showDisclaimer(),
      onResetAll: () => {
        state.characters = [];
        state.activeId = null;
        state.options = { applyFilters: false, advancedMode: false, multiStrategy: false, fiveSets: false };
        renderApp();
      },
      onAddCharacter: openAddCharacterModal,
      onDeleteCharacter: deleteCharacterById,
      onActivateCharacter: activateCharacterById,
      onOpenWheeling: () => setTab('wheeling'),
      onMultiStrategyToggle: () => {
        // S3-T1: 토글 후 state 갱신 + 추첨 탭으로 이동해 즉시 효과 확인
        state.options = loadOptions();
        renderApp();
      },
      onFiveSetsToggle: () => {
        // S4-T1: 5세트 토글 후 state 갱신
        state.options = loadOptions();
        renderApp();
      },
    });
  }

  // 하단 탭 바인딩
  appEl.querySelectorAll('.tab-item[data-tab-id]').forEach((el) => {
    el.addEventListener('click', () => setTab(el.dataset.tabId));
  });
}
