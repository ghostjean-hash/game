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
import { recommend, recommendMulti, recommendFiveSets, computePoolForStrategies } from '../core/recommend.js';
import { mixSeeds } from '../core/random.js';
import { fortuneFor } from '../core/fortune.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../core/stats.js';
import { recordRecommendation, matchHistory, backfillRecommendations } from '../core/history.js';
import { applyLuckGrowth } from '../core/luck.js';
import { ensureCurrentState, performRitual, applyRitualBonus } from '../core/ritual.js';
import {
  ensureSavedSetsForRound, addSavedSets, removeSavedSetAt, clearSavedSets,
} from '../core/saved-sets.js';
import { savedSetsSectionHtml, savedSetsAddBarHtml } from './saved-sets-section.js';
import {
  loadCharacters, saveCharacters,
  loadActiveCharacterId, saveActiveCharacterId,
  loadDraws,
  loadOptions, saveOptions,
  loadRitualState, saveRitualState,
} from '../data/storage.js';
import {
  STRATEGY_DEFAULT, DEFAULT_DRWNO_FALLBACK,
  SAVED_SETS_CAP, SAVED_SETS_BATCH_SMALL, SAVED_SETS_BATCH_LARGE, SAVED_SETS_SALT_BASE,
  OBJECTIVE_STRATEGIES, STRATEGY_CATEGORIES,
} from '../data/numbers.js';

let appEl = null;
let stopCountdown = null; // 카운트다운 interval 정리 함수. 매 렌더 시작 전 정리.
// strategyScrollLeft: S9 카테고리 그룹화로 가로 스크롤 자체 폐기되어 모듈 변수 제거.
const state = {
  characters: [],
  activeId: null,
  drwNo: DEFAULT_DRWNO_FALLBACK,
  draws: [],
  numberStats: [],
  bonusStats: [],
  cooccur: [],
  options: { applyFilters: false, advancedMode: false, fiveSets: false },
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

  const onPerform = (ritualId, animStageEl) => {
    const result = performRitual(state.ritual, ritualId);
    if (!result.didApply) return;
    state.ritual = result.state;

    // S14: 매 행위 클릭마다 빈 애니메이션 영역에서 작은 burst (모달 재렌더 전 anchor 사용).
    if (animStageEl) spawnRitualBurst(animStageEl);

    let burstNow = false;
    if (result.justFilled) {
      // 만땅 → Luck 보너스 적용 + 캐릭터 갱신
      const cur = state.characters.find((c) => c.id === state.ritual.charId) || active;
      const bonus = applyRitualBonus(cur, state.ritual);
      if (bonus.applied) {
        state.ritual = bonus.state;
        state.characters = state.characters.map((c) => (c.id === cur.id ? bonus.character : c));
        saveCharacters(state.characters);
        burstNow = true; // S4-T2: 만땅 진입 직후 추가 파티클
      }
    }
    saveRitualState(state.ritual);

    // 모달 닫고 다시 열어 갱신된 state로 그림 (게이지 진행 시각화)
    if (currentClose) currentClose();
    currentClose = openRitualModal(state.ritual, onPerform, onClose);

    // S14: 만땅 진입 시 추가 burst. anchor를 새 모달의 .ritual-anim-stage로 (모달 가림 회피).
    if (burstNow) {
      window.requestAnimationFrame(() => {
        const stage = document.querySelector('[data-role="ritual-anim-stage"]')
          || document.querySelector('[data-role="ritual-modal"]')
          || document.body;
        spawnRitualBurst(stage);
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

  // S16: 추첨일 ISO 날짜 (사주 일진 보너스용). 발표된 회차면 drwDate 그대로,
  // 미래 회차면 nextDraw().drawAtMs를 KST 토요일 기준 YYYY-MM-DD로 변환.
  let drawDate = drawForFortune ? drawForFortune.drwDate : null;
  if (!drawDate) {
    const next = nextDraw(state.draws);
    if (next && next.drawAtMs) {
      const d = new Date(next.drawAtMs);
      // KST 변환: epoch ms는 UTC 기준이라 KST(+09:00)로 toISOString 후 자르기.
      const kst = new Date(d.getTime() + 9 * 3600 * 1000);
      drawDate = kst.toISOString().slice(0, 10);
    }
  }

  const ctxBase = {
    seed: active.seed,
    luck: active.luck,
    drwNo: state.drwNo,
    numberStats: state.numberStats,
    bonusStats: state.bonusStats,
    cooccur: state.cooccur,
    zodiac: active.zodiac,
    dayPillar: active.dayPillar,
    drawDate,
  };

  // S19 (2026-05-02): multiStrategy 옵션 폐기. 항상 다중 모드 = 1~6 전략 토글.
  // 단일 전략 = 1개 토글. 분배 cap 6 유지 ("어정쩡 금지" 정책).
  const strategyIds = activeStrategyIds(active);
  const strategyId = strategyIds[0]; // 호환용: 첫 전략 (활성 desc 표시 등)

  // S29.2 (2026-05-04): 사용 풀 표시. UI 메타 텍스트 자리.
  // S30.1 (2026-05-04): 합집합 → 포커스 전략 1개 풀로 변경. 랜덤 카테고리(blessed/intuitive/balancer)는
  //   풀이 1~45 균등 분포 = "전 풀"이라 풀 표시 의미 없음 → 랜덤 카테고리는 미표시 (pool=null).
  //   포커스 = strategyIds 마지막 원소 (S30 활성화 순서상 가장 최근 활성).
  const focusedId = strategyIds.length > 0 ? strategyIds[strategyIds.length - 1] : null;
  const focusedCat = focusedId ? STRATEGY_CATEGORIES[focusedId] : null;
  const pool = (focusedId && focusedCat !== 'random')
    ? computePoolForStrategies([focusedId], ctxBase)
    : null;
  // S30.3 (2026-05-04) → S30.4 (2026-05-04): 짝꿍 객관 승격으로 키번호 anchor 폐기. poolNote 제거.
  //   짝꿍 desc 자체가 "역대 동시출현 상위 페어 합집합"이라 추가 노트 불필요.
  const poolNote = null;

  // S4-T1: 5세트 모드. ON이면 메인(rec) = sets[0], 추가 sets[1..4]를 함께 반환.
  // S30.6 (2026-05-04): drawDate도 반환. character-card 사주 패널 일진 보너스 표시용.
  if (state.options.fiveSets) {
    const sets = recommendFiveSets({ ...ctxBase, strategyIds }, { multi: true });
    return { strategyId, strategyIds, rec: sets[0], sets, fortune, drawForFortune, pool, poolNote, drawDate };
  }

  const rec = recommendMulti({ ...ctxBase, strategyIds });
  return { strategyId, strategyIds, rec, sets: null, fortune, drawForFortune, pool, poolNote, drawDate };
}

/**
 * S3-T1: 캐릭터의 다중 전략 선택 목록 반환. 마이그레이션 fallback 포함.
 * S8: 'mbti' 잔존 ID는 필터링 (폐지됨).
 */
/**
 * S26: 같은 조립식으로 batchN세트 시드 변형 생성 후 누적 list에 push.
 * 시드 변형 룰:
 *   - 객관 strategy 포함이면 drwNo 변형 (recommendFiveSets 객관 분기 동일 패턴).
 *   - 그 외(시드 의존 strategy 포함)면 seed 변형.
 *   - 솔트 base는 SAVED_SETS_SALT_BASE + (현재 list 길이 + i)로 매번 다른 시드 → 결정론.
 *   - 같은 numbers 조합이 이미 있으면 saved-sets.js의 hasSameNumbers가 자동 skip.
 */
function addSavedSetsBatch(batchN) {
  const active = getActive();
  const { strategyIds } = getRecAndFortune(active);
  const ensured = ensureSavedSetsForRound(active, state.drwNo);
  let cur = ensured.character;
  const startIdx = cur.savedSets?.list?.length || 0;

  // 조립식이 객관 전략 1개 이상 포함 = drwNo 변형 / 아니면 seed 변형.
  const hasObjective = strategyIds.some((id) => OBJECTIVE_STRATEGIES.has(id));
  const baseSeed = (active.seed || 0) >>> 0;
  const baseDrwNo = (state.drwNo || 0) >>> 0;

  // S16: 추첨일 ISO 날짜 (사주 일진 보너스용) - getRecAndFortune과 동일 로직.
  const drawForFortune = state.draws.find((d) => d.drwNo === state.drwNo) || null;
  let drawDate = drawForFortune ? drawForFortune.drwDate : null;
  if (!drawDate) {
    const next = nextDraw(state.draws);
    if (next && next.drawAtMs) {
      const d = new Date(next.drawAtMs);
      const kst = new Date(d.getTime() + 9 * 3600 * 1000);
      drawDate = kst.toISOString().slice(0, 10);
    }
  }

  const newSets = [];
  for (let i = 0; i < batchN; i += 1) {
    const salt = SAVED_SETS_SALT_BASE + startIdx + i;
    const ctxBase = {
      seed: hasObjective ? baseSeed : mixSeeds(baseSeed, salt),
      drwNo: hasObjective ? mixSeeds(baseDrwNo, salt) : baseDrwNo,
      luck: active.luck,
      numberStats: state.numberStats,
      bonusStats: state.bonusStats,
      cooccur: state.cooccur,
      zodiac: active.zodiac,
      dayPillar: active.dayPillar,
      drawDate,
      strategyIds,
    };
    const r = recommendMulti(ctxBase);
    newSets.push({
      numbers: r.numbers,
      strategyIds,
      strategySources: r.strategySources,
    });
  }

  const result = addSavedSets(cur, newSets);
  cur = result.character;
  state.characters = state.characters.map((c) => (c.id === cur.id ? cur : c));
  saveCharacters(state.characters);
  renderApp();
}

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

function homeTabHtml(active, strategyId, strategyIds, rec, fortune, drawForFortune, sets, pool, poolNote, drawDate) {
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

  // S27 (2026-05-03): 메인 카드(미리보기) + 5세트 컴팩트 추첨 탭에서 노출 폐기.
  //   누적 리스트(추천1, 추천2, ...)만 표시. 라벨 시작 = 1 (메인이 없으니).
  // S28 (2026-05-04): 추천 리스트를 hero에서 분리. (S29에 의해 위치 재정정)
  // S29 (2026-05-04): 채팅 UX 패턴 적용. 결과(추천 리스트)는 위에 누적, 도구(+ 버튼 → 전략)는 아래.
  //   배치: 카운트다운 → 추천 리스트(결과) → + 버튼(실행) → 전략(조립) → 행운 → 캐릭터.
  //   결과 ↔ 실행 인접 (시선 0 왕복). 모바일 엄지 한 방향 동선. SSOT: docs/01_spec.md 5.2.5.2.
  // S26: 누적 추천 세트 섹션. active.savedSets는 renderHome에서 ensureSavedSetsForRound로 보장됨.
  const savedList = active.savedSets?.list || [];
  const savedSectionHtml = savedSetsSectionHtml(savedList, 1);
  const addBarHtml = savedSetsAddBarHtml(savedList.length, SAVED_SETS_CAP);

  return `
    <header class="app-header tab-header home-header">
      <h1 class="app-title">Blessed Lotto</h1>
    </header>

    <section class="home-hero${heroFortuneClass}" aria-label="다음 추첨">
      ${nextDrawCardHtml(nextInfo)}
    </section>

    ${/* S29(2026-05-04): 추천 리스트(결과)는 카운트다운 직하 - 위에 누적. */ ''}
    ${savedSectionHtml}

    ${/* S29(2026-05-04): + 1세트 / + 5세트 (실행) - 결과 바로 아래. 결과↔실행 인접. */ ''}
    ${addBarHtml}

    ${/* S29(2026-05-04): 전략(조립) - + 버튼 아래로 이동.
         S29.2 / S30.1 / S30.3: pool은 포커스 전략 1개 풀. poolNote는 동적 노트(짝꿍 키번호 등). */ ''}
    ${strategyTabsHtml(strategyIds, { multi: true, pool, poolNote })}

    ${/* S17(2026-05-02): 행운 쌓기를 전략 탭 하위로 이동 (이전 = 히어로 직하). */ ''}
    ${ritualWidgetHtml(state.ritual)}

    ${/* S13(2026-05-02): 슬롯 + 카드 묶음. 시각 인접으로 "캐릭터 세트" 인지. */ ''}
    ${characterSlotsHtml(state.characters, state.activeId)}

    ${characterCardHtml(active, fortune, drawForFortune || state.drwNo, drawDate)}

    ${banner}
  `;
}

function renderHome(content) {
  const active = getActive();
  const { strategyId, strategyIds, rec, sets, fortune, drawForFortune, pool, poolNote, drawDate } = getRecAndFortune(active);

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

  // S26: 누적 세트 회차 보장 (drwNo 변경 시 자동 비움).
  const ensured = ensureSavedSetsForRound(updated, state.drwNo);
  updated = ensured.character;

  state.characters = state.characters.map((c) => (c.id === updated.id ? updated : c));
  saveCharacters(state.characters);

  content.innerHTML = homeTabHtml(updated, strategyId, strategyIds, rec, fortune, drawForFortune, sets, pool, poolNote, drawDate);

  // 카운트다운 시작 (이전 interval은 renderApp 시작 시 정리됨).
  // 추첨 시각 도달 시 자동 재렌더 → 다음 회차 정보로 갱신.
  stopCountdown = startCountdown(content, state.draws, () => renderApp());

  // S9: 전략 탭이 카테고리별 wrap 그룹으로 변경되어 가로 스크롤 / fade / 휠 변환 / scrollLeft 보존 모두 폐기.
  // (SSOT: docs/01_spec.md 4.7.4)

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

  // S26: 누적 세트 - 추가 / 삭제 / 전체 비우기 핸들러.
  content.querySelector('[data-action="add-saved-1"]')?.addEventListener('click', () => {
    addSavedSetsBatch(SAVED_SETS_BATCH_SMALL);
  });
  content.querySelector('[data-action="add-saved-5"]')?.addEventListener('click', () => {
    addSavedSetsBatch(SAVED_SETS_BATCH_LARGE);
  });
  content.querySelectorAll('[data-action="remove-saved-set"]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.savedIdx, 10);
      if (Number.isNaN(idx)) return;
      const cur = getActive();
      const next = removeSavedSetAt(cur, idx);
      state.characters = state.characters.map((c) => (c.id === next.id ? next : c));
      saveCharacters(state.characters);
      renderApp();
    });
  });
  content.querySelector('[data-action="clear-saved-sets"]')?.addEventListener('click', () => {
    const cur = getActive();
    const count = cur.savedSets?.list?.length || 0;
    if (count === 0) return;
    const ok = window.confirm(`저장된 ${count}세트가 모두 삭제됩니다. 진행할까요?`);
    if (!ok) return;
    const next = clearSavedSets(cur);
    state.characters = state.characters.map((c) => (c.id === next.id ? next : c));
    saveCharacters(state.characters);
    renderApp();
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
      // S9: 가로 스크롤 폐기로 scrollLeft 캡처 불필요.

      // S19: 항상 다중 모드 토글. 분배 cap 6 ("어정쩡 금지" 정책).
      const list = activeStrategyIds(cur);
      let next;
      if (list.includes(newStrategyId)) {
        if (list.length === 1) return; // 마지막 1개 보존
        next = list.filter((id) => id !== newStrategyId);
      } else {
        if (list.length >= 6) return; // MULTI_STRATEGY_MAX cap (분배 0 발생 차단)
        next = [...list, newStrategyId];
      }
      cur.lastUsedStrategies = next;
      cur.lastUsedStrategy = next[0]; // 마이그레이션 호환 (deprecated)
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
        state.options = { applyFilters: false, advancedMode: false, fiveSets: false };
        renderApp();
      },
      onAddCharacter: openAddCharacterModal,
      onDeleteCharacter: deleteCharacterById,
      onActivateCharacter: activateCharacterById,
      onOpenWheeling: () => setTab('wheeling'),
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
