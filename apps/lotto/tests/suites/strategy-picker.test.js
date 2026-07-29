// strategyShort / strategyLabel 회귀. S74 (2026-05-16) - label[0] 정합 단언.
// 사용자 보고 "최신→추 / 별자리→점 / 보너스→별 / 적게→안 / 랜덤→축 불일치" 직접 대응.
import { suite, test, assertEqual } from '../core.js';
import { strategyShort, strategyLabel } from '../../src/render/strategy-picker.js';
import {
  STRATEGY_BLESSED, STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN,
  STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
  STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  DEFAULT_PRESETS,
} from '../../src/data/numbers.js';

suite('strategy-picker: short / label SSOT (S74)', () => {
  // S74: short 매핑이 label 머리글자(label[0])와 정합인지 전수 단언.
  // 향후 label 변경 시 short도 함께 갱신 강제 = 회귀 차단.
  const expectedShortPairs = [
    [STRATEGY_BLESSED, '랜덤', '랜'],
    [STRATEGY_TREND_FOLLOWER, '최신', '최'],
    [STRATEGY_STATISTICIAN, '많이', '많'],
    [STRATEGY_SECOND_STAR, '보너스', '보'],
    [STRATEGY_REGRESSIONIST, '적게', '적'],
    [STRATEGY_ASTROLOGER, '별자리', '별'],
    [STRATEGY_ZODIAC_ELEMENT, '4원소', '4'],
    [STRATEGY_FIVE_ELEMENTS, '사주', '사'],
    [STRATEGY_INTUITIVE, '직감', '직'],
    [STRATEGY_BALANCER, '균형', '균'],
  ];

  for (const [id, expectedLabel, expectedShort] of expectedShortPairs) {
    test(`${id} - label="${expectedLabel}" / short="${expectedShort}"`, () => {
      assertEqual(strategyLabel(id), expectedLabel);
      assertEqual(strategyShort(id), expectedShort);
    });
  }

  test('S74 - 모든 전략의 short는 label[0]과 정합 (자동 회귀 차단)', () => {
    for (const [id, label, short] of expectedShortPairs) {
      assertEqual(short, label[0], `${id}: short "${short}" !== label[0] "${label[0]}"`);
      assertEqual(strategyShort(id), strategyLabel(id)[0], `${id}: strategyShort !== strategyLabel[0]`);
    }
  });
});

// S75 (2026-05-16): DEFAULT_PRESETS 순서 / 라벨 / 묶음 회귀.
// 사용자 명시 "1.운세 / 2.균형 / 3.분산" + "분산: 균형+사주".
suite('DEFAULT_PRESETS 구성 (S75)', () => {
  test('S75 - 슬롯 3종 정확 구성', () => {
    assertEqual(DEFAULT_PRESETS.length, 3);
    // 슬롯 1: 운세 = 별자리 · 사주 · 4원소
    assertEqual(DEFAULT_PRESETS[0].id, 'preset-1');
    assertEqual(DEFAULT_PRESETS[0].label, '운세');
    assertEqual(DEFAULT_PRESETS[0].strategyIds.length, 3);
    assertEqual([...DEFAULT_PRESETS[0].strategyIds].sort().join('|'),
      [STRATEGY_ASTROLOGER, STRATEGY_FIVE_ELEMENTS, STRATEGY_ZODIAC_ELEMENT].sort().join('|'));
    // 슬롯 2: 균형 = 최신 · 별자리 · 직감
    assertEqual(DEFAULT_PRESETS[1].id, 'preset-2');
    assertEqual(DEFAULT_PRESETS[1].label, '균형');
    assertEqual([...DEFAULT_PRESETS[1].strategyIds].sort().join('|'),
      [STRATEGY_TREND_FOLLOWER, STRATEGY_ASTROLOGER, STRATEGY_INTUITIVE].sort().join('|'));
    // 슬롯 3: 분산 = 균형 · 사주 (2전략)
    assertEqual(DEFAULT_PRESETS[2].id, 'preset-3');
    assertEqual(DEFAULT_PRESETS[2].label, '분산');
    assertEqual(DEFAULT_PRESETS[2].strategyIds.length, 2);
    assertEqual([...DEFAULT_PRESETS[2].strategyIds].sort().join('|'),
      [STRATEGY_BALANCER, STRATEGY_FIVE_ELEMENTS].sort().join('|'));
  });
});
