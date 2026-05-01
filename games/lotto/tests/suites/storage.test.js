import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  loadCharacters, saveCharacters,
  loadOptions, saveOptions,
  hasSeenHelp, markSeenHelp,
  loadDraws, saveDraws,
  clearAll,
} from '../../src/data/storage.js';

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

// 테스트 후 정리
clearAll();
