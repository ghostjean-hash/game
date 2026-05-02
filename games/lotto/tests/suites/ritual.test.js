// T4: 행운 의식 (ritual.js) 결정론 / 룰 검증.
import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  emptyRitualState, ensureCurrentState, performRitual, applyRitualBonus,
  progressRatio, isRitualPerformed,
} from '../../src/core/ritual.js';
import { RITUAL_LIST, RITUAL_GAUGE_MAX, LUCK_BONUS_RITUAL } from '../../src/data/numbers.js';

suite('core/ritual - 빈 상태 + ensureCurrentState', () => {
  test('emptyRitualState 형태', () => {
    const s = emptyRitualState('c1', 1222);
    assertEqual(s.charId, 'c1');
    assertEqual(s.drwNo, 1222);
    assertEqual(s.performed.length, 0);
    assertEqual(s.gauge, 0);
    assertEqual(s.appliedBonus, false);
  });

  test('ensureCurrentState: null이면 새로 생성', () => {
    const s = ensureCurrentState(null, 'c1', 1222);
    assertEqual(s.charId, 'c1');
    assertEqual(s.gauge, 0);
  });

  test('ensureCurrentState: 같은 charId+drwNo면 보존', () => {
    const prev = { charId: 'c1', drwNo: 1222, performed: ['meditate'], gauge: 12.5, appliedBonus: false };
    const s = ensureCurrentState(prev, 'c1', 1222);
    assertEqual(s, prev);
  });

  test('ensureCurrentState: drwNo 변경 시 리셋', () => {
    const prev = { charId: 'c1', drwNo: 1222, performed: ['meditate'], gauge: 12.5, appliedBonus: false };
    const s = ensureCurrentState(prev, 'c1', 1223);
    assertEqual(s.gauge, 0);
    assertEqual(s.performed.length, 0);
  });

  test('ensureCurrentState: charId 변경 시 리셋', () => {
    const prev = { charId: 'c1', drwNo: 1222, performed: ['meditate'], gauge: 12.5, appliedBonus: false };
    const s = ensureCurrentState(prev, 'c2', 1222);
    assertEqual(s.charId, 'c2');
    assertEqual(s.gauge, 0);
  });
});

suite('core/ritual - performRitual', () => {
  test('1회 수행: 게이지 +12.5', () => {
    const s0 = emptyRitualState('c1', 1222);
    const r = performRitual(s0, 'meditate');
    assertEqual(r.didApply, true);
    assertEqual(r.state.gauge, 12.5);
    assertEqual(r.state.performed.length, 1);
    assertEqual(r.justFilled, false);
  });

  test('같은 행위 재호출은 무시', () => {
    const s0 = emptyRitualState('c1', 1222);
    const r1 = performRitual(s0, 'meditate');
    const r2 = performRitual(r1.state, 'meditate');
    assertEqual(r2.didApply, false);
    assertEqual(r2.state.gauge, 12.5);
  });

  test('알 수 없는 ritualId는 무시', () => {
    const s0 = emptyRitualState('c1', 1222);
    const r = performRitual(s0, 'unknown_ritual');
    assertEqual(r.didApply, false);
    assertEqual(r.state.gauge, 0);
  });

  test('8회 모두 수행 → 만땅 + justFilled true', () => {
    let s = emptyRitualState('c1', 1222);
    for (let i = 0; i < RITUAL_LIST.length; i += 1) {
      const r = performRitual(s, RITUAL_LIST[i].id);
      s = r.state;
      if (i === RITUAL_LIST.length - 1) {
        assertEqual(s.gauge, RITUAL_GAUGE_MAX);
        assertEqual(r.justFilled, true);
      } else {
        assertEqual(r.justFilled, false);
      }
    }
  });

  test('progressRatio 0~1', () => {
    const s0 = emptyRitualState('c1', 1222);
    assertEqual(progressRatio(s0), 0);
    const r4 = performRitual(performRitual(performRitual(performRitual(s0, 'meditate').state, 'training').state, 'water').state, 'qi');
    assertTrue(Math.abs(progressRatio(r4.state) - 0.5) < 0.001, 'expected 0.5 after 4 actions');
  });

  test('isRitualPerformed 동작', () => {
    const s0 = emptyRitualState('c1', 1222);
    const r = performRitual(s0, 'meditate');
    assertTrue(isRitualPerformed(r.state, 'meditate'));
    assertTrue(!isRitualPerformed(r.state, 'training'));
  });
});

suite('core/ritual - applyRitualBonus', () => {
  test('만땅 미달이면 적용 안 됨', () => {
    const s = { charId: 'c1', drwNo: 1222, performed: ['meditate'], gauge: 12.5, appliedBonus: false };
    const ch = { id: 'c1', luck: 50 };
    const r = applyRitualBonus(ch, s);
    assertEqual(r.applied, false);
    assertEqual(r.character.luck, 50);
  });

  test('만땅이면 Luck +5 + appliedBonus 잠금', () => {
    const s = { charId: 'c1', drwNo: 1222, performed: [], gauge: RITUAL_GAUGE_MAX, appliedBonus: false };
    const ch = { id: 'c1', luck: 50 };
    const r = applyRitualBonus(ch, s);
    assertEqual(r.applied, true);
    assertEqual(r.character.luck, 50 + LUCK_BONUS_RITUAL);
    assertEqual(r.state.appliedBonus, true);
  });

  test('이미 appliedBonus면 재적용 안 됨', () => {
    const s = { charId: 'c1', drwNo: 1222, performed: [], gauge: RITUAL_GAUGE_MAX, appliedBonus: true };
    const ch = { id: 'c1', luck: 50 };
    const r = applyRitualBonus(ch, s);
    assertEqual(r.applied, false);
    assertEqual(r.character.luck, 50);
  });

  test('Luck cap 100', () => {
    const s = { charId: 'c1', drwNo: 1222, performed: [], gauge: RITUAL_GAUGE_MAX, appliedBonus: false };
    const ch = { id: 'c1', luck: 98 };
    const r = applyRitualBonus(ch, s);
    assertEqual(r.character.luck, 100);
  });
});
