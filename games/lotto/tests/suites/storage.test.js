import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import {
  loadCharacters, saveCharacters,
  loadOptions, saveOptions,
  hasSeenHelp, markSeenHelp,
  loadDraws, saveDraws,
  loadNumberStats, saveNumberStats,
  loadBonusStats, saveBonusStats,
  loadCooccur, saveCooccur,
  loadActiveCharacterId, saveActiveCharacterId,
  loadPresets, savePresets,
  loadCharCardCollapsed, saveCharCardCollapsed,
  loadRitualState, saveRitualState,
  clearAll,
} from '../../src/data/storage.js';
import { DEFAULT_PRESETS } from '../../src/data/numbers.js';

// 각 테스트 시작 전 깨끗한 상태로 두기 위해 외부에서 호출.
function reset() { clearAll(); }

suite('data/storage', () => {
  test('clearAll: prefix 키 모두 제거', () => {
    saveCharacters([{ id: 'x', seed: 1 }]);
    saveOptions({ applyFilters: true });
    markSeenHelp();
    clearAll();
    assertEqual(loadCharacters().length, 0);
    assertTrue(hasSeenHelp() === false);
  });

  test('characters round-trip', () => {
    reset();
    const c = [{ id: 'a', seed: 1234, className: 'blessed', luck: 10, createdAt: '2026-05-01', history: [] }];
    saveCharacters(c);
    const loaded = loadCharacters();
    assertEqual(loaded.length, 1);
    assertEqual(loaded[0].id, 'a');
    assertEqual(loaded[0].seed, 1234);
  });

  test('options 기본값', () => {
    reset();
    const opts = loadOptions();
    assertTrue(opts !== null);
    assertEqual(opts.applyFilters, false);
  });

  test('seen_help 기본 false → mark 후 true', () => {
    reset();
    assertTrue(hasSeenHelp() === false);
    markSeenHelp();
    assertTrue(hasSeenHelp() === true);
  });

  test('draws 기본 빈 배열', () => {
    reset();
    const d = loadDraws();
    assertTrue(Array.isArray(d));
    assertEqual(d.length, 0);
  });

  test('draws round-trip', () => {
    reset();
    saveDraws([{ drwNo: 1, drwDate: '2026-01-03', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 }]);
    const d = loadDraws();
    assertEqual(d.length, 1);
    assertEqual(d[0].drwNo, 1);
  });
});

// S64 (2026-05-10): 누락 export 14건 round-trip + 마이그레이션 회귀 보강.
// SSOT: docs/02_data.md 3장 (storage 키 / 마이그레이션 정책).

suite('data/storage - 통계 캐시 round-trip (S64)', () => {
  test('loadNumberStats: 기본 null', () => {
    reset();
    assertEqual(loadNumberStats(), null);
  });

  test('numberStats round-trip', () => {
    reset();
    const stats = { 1: 100, 2: 95, 3: 88 };
    saveNumberStats(stats);
    assertDeepEqual(loadNumberStats(), stats);
  });

  test('loadBonusStats: 기본 null', () => {
    reset();
    assertEqual(loadBonusStats(), null);
  });

  test('bonusStats round-trip', () => {
    reset();
    const stats = { 7: 30, 14: 28 };
    saveBonusStats(stats);
    assertDeepEqual(loadBonusStats(), stats);
  });

  test('loadCooccur: 기본 null', () => {
    reset();
    assertEqual(loadCooccur(), null);
  });

  test('cooccur round-trip', () => {
    reset();
    const co = { '1-2': 12, '3-7': 8 };
    saveCooccur(co);
    assertDeepEqual(loadCooccur(), co);
  });
});

suite('data/storage - 활성 캐릭터 ID round-trip (S64)', () => {
  test('loadActiveCharacterId: 기본 null', () => {
    reset();
    assertEqual(loadActiveCharacterId(), null);
  });

  test('activeCharacterId round-trip', () => {
    reset();
    saveActiveCharacterId('char-abc');
    assertEqual(loadActiveCharacterId(), 'char-abc');
  });
});

suite('data/storage - 프리셋 round-trip + 마이그레이션 (S64)', () => {
  test('loadPresets: 기본값 = DEFAULT_PRESETS deep clone', () => {
    reset();
    const p = loadPresets();
    assertEqual(p.length, DEFAULT_PRESETS.length);
    assertEqual(p[0].id, DEFAULT_PRESETS[0].id);
    // deep clone 확인 - 반환된 객체 변경이 DEFAULT_PRESETS에 영향 0.
    // S75 (2026-05-16): 디폴트 label 변경(균형 → 운세)에 따라 원본 보존만 단언.
    const originalLabel = DEFAULT_PRESETS[0].label;
    p[0].label = '변조';
    assertEqual(DEFAULT_PRESETS[0].label, originalLabel, 'deep clone 보장 - 원본 label 보존');
  });

  test('presets round-trip', () => {
    reset();
    const custom = [
      { id: 'preset-1', label: '내균형', strategyIds: ['blessed', 'astrologer'] },
      { id: 'preset-2', label: '내분산', strategyIds: ['regressionist'] },
      { id: 'preset-3', label: '내운세', strategyIds: ['fiveElements'] },
    ];
    savePresets(custom);
    const loaded = loadPresets();
    assertEqual(loaded.length, 3);
    assertEqual(loaded[0].label, '내균형');
    assertDeepEqual(loaded[1].strategyIds, ['regressionist']);
  });

  test('S43.7 마이그레이션 - 모든 슬롯 직감 단독이면 DEFAULT_PRESETS로 자동 reset', () => {
    reset();
    // Sprint 053(S43.3) 임시 단순화로 모든 슬롯이 ['intuitive']로 단순화된 옛 데이터 시뮬.
    savePresets([
      { id: 'preset-1', label: '균형', strategyIds: ['intuitive'] },
      { id: 'preset-2', label: '분산파', strategyIds: ['intuitive'] },
      { id: 'preset-3', label: '운세파', strategyIds: ['intuitive'] },
    ]);
    const loaded = loadPresets();
    // DEFAULT_PRESETS의 첫 슬롯 묶음과 일치해야 함 (직감 단독 아님).
    assertTrue(loaded[0].strategyIds.length > 1, 'DEFAULT_PRESETS는 첫 슬롯 묶음이 1개 초과');
    assertDeepEqual([...loaded[0].strategyIds], [...DEFAULT_PRESETS[0].strategyIds]);
  });

  test('S43.7 마이그레이션 - 사용자 편집 흔적 있으면 reset 안 함', () => {
    reset();
    // 사용자가 한 슬롯을 직접 편집해 묶음을 늘린 케이스. 모두-직감-단독 조건 미성립이라 그대로 보존.
    const custom = [
      { id: 'preset-1', label: '균형', strategyIds: ['intuitive'] },
      { id: 'preset-2', label: '분산파', strategyIds: ['intuitive', 'balancer'] }, // 편집 흔적
      { id: 'preset-3', label: '운세파', strategyIds: ['intuitive'] },
    ];
    savePresets(custom);
    const loaded = loadPresets();
    assertEqual(loaded[1].strategyIds.length, 2, '사용자 편집 슬롯 보존');
  });

  test('S63 subtitle 잔존 마이그레이션 - loadPresets는 throw 없이 반환', () => {
    reset();
    // S63 이전 사용자 storage. subtitle 키가 잔존해도 loadPresets는 그대로 반환.
    // 렌더 단계에서 미참조라 시각 영향 0. 다음 savePresets 호출 시 cleaning에서 자연 소실.
    savePresets([
      { id: 'preset-1', label: '균형', subtitle: '옛 부제', strategyIds: ['blessed', 'astrologer'] },
      { id: 'preset-2', label: '분산파', subtitle: '옛 부제 2', strategyIds: ['regressionist', 'intuitive'] },
      { id: 'preset-3', label: '운세파', subtitle: '옛 부제 3', strategyIds: ['fiveElements'] },
    ]);
    const loaded = loadPresets();
    assertEqual(loaded.length, 3);
    assertEqual(loaded[0].label, '균형');
    // subtitle은 storage에 그대로 남음 (storage 책임 아님). 자연 소실은 preset-editor 책임.
    assertEqual(loaded[0].subtitle, '옛 부제');
  });
});

suite('data/storage - charCardCollapsed round-trip (S64)', () => {
  test('loadCharCardCollapsed: 기본 false', () => {
    reset();
    assertEqual(loadCharCardCollapsed(), false);
  });

  test('saveCharCardCollapsed(true) → 다음 load = true', () => {
    reset();
    saveCharCardCollapsed(true);
    assertEqual(loadCharCardCollapsed(), true);
  });

  test('saveCharCardCollapsed(false) → 다음 load = false', () => {
    reset();
    saveCharCardCollapsed(true);
    saveCharCardCollapsed(false);
    assertEqual(loadCharCardCollapsed(), false);
  });

  test('saveCharCardCollapsed 비-bool 입력은 false로 정규화', () => {
    reset();
    saveCharCardCollapsed('truthy-string');
    assertEqual(loadCharCardCollapsed(), false, '"=== true" 가드로 비-bool은 false');
  });
});

suite('data/storage - ritualState round-trip (S64)', () => {
  test('loadRitualState: 기본 null', () => {
    reset();
    assertEqual(loadRitualState(), null);
  });

  test('ritualState round-trip', () => {
    reset();
    const state = {
      drwNo: 1223,
      characterId: 'char-1',
      progress: 5,
      done: ['shower', 'meditate'],
    };
    saveRitualState(state);
    assertDeepEqual(loadRitualState(), state);
  });
});

suite('data/storage - options 마이그레이션 + clearAll PREFIX (S64 보너스)', () => {
  test('loadOptions - 누락 키 자동 채움', () => {
    reset();
    // 옛 사용자가 applyFilters만 저장한 케이스. 나머지 키는 기본값으로 채워야 함.
    saveOptions({ applyFilters: true });
    const opts = loadOptions();
    assertEqual(opts.applyFilters, true, '저장 값 보존');
    assertEqual(opts.advancedMode, false, '누락 키 = 기본값');
    assertEqual(opts.fiveSets, false, '누락 키 = 기본값');
    // S79 (2026-05-17): sourceDisplayMode 신규 옵션. 누락 시 기본값 'dot' 자동 채움.
    assertEqual(opts.sourceDisplayMode, 'dot', 'S79 누락 키 = dot 기본값');
  });

  test('S79 - sourceDisplayMode round-trip (dot / label)', () => {
    reset();
    saveOptions({ applyFilters: false, advancedMode: false, fiveSets: false, sourceDisplayMode: 'label' });
    assertEqual(loadOptions().sourceDisplayMode, 'label', 'label 값 보존');
    saveOptions({ applyFilters: false, advancedMode: false, fiveSets: false, sourceDisplayMode: 'dot' });
    assertEqual(loadOptions().sourceDisplayMode, 'dot', 'dot 값 보존');
  });

  test('S19 마이그레이션 - multiStrategy 폐기 키 자동 무시', () => {
    reset();
    // S19 이전 사용자 storage. multiStrategy 키가 잔존해도 loadOptions 결과에서 제거.
    saveOptions({ applyFilters: false, multiStrategy: true, advancedMode: false, fiveSets: false });
    const opts = loadOptions();
    assertTrue(!('multiStrategy' in opts), 'S19 폐기 키는 결과에서 제거');
  });

  test('clearAll - lotto_ 외부 키는 보존 (PREFIX 정확성)', () => {
    reset();
    // 다른 앱 / 다른 prefix 키를 직접 시뮬.
    localStorage.setItem('other_app_key', 'preserve-me');
    localStorage.setItem('lotto_options', JSON.stringify({ applyFilters: true }));
    clearAll();
    assertEqual(localStorage.getItem('lotto_options'), null, 'lotto_ prefix 키만 제거');
    assertEqual(localStorage.getItem('other_app_key'), 'preserve-me', '외부 키 보존');
    // 정리.
    localStorage.removeItem('other_app_key');
  });
});

// 테스트 후 정리
clearAll();
