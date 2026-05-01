import { suite, test, assertEqual } from '../core.js';
import { matchRank } from '../../src/core/match.js';

const draw = { numbers: [3, 7, 12, 25, 33, 41], bonus: 18 };

suite('core/match - matchRank', () => {
  test('1등: 본번호 6개 모두 일치', () => {
    assertEqual(matchRank({ numbers: [3, 7, 12, 25, 33, 41], bonus: 1 }, draw), 1);
  });

  test('2등: 본번호 5개 + 6번째가 발표 보너스', () => {
    assertEqual(matchRank({ numbers: [3, 7, 12, 25, 33, 18], bonus: 2 }, draw), 2);
  });

  test('3등: 본번호 5개 일치, 6번째는 일반 번호', () => {
    assertEqual(matchRank({ numbers: [3, 7, 12, 25, 33, 44], bonus: 2 }, draw), 3);
  });

  test('4등: 본번호 4개 일치', () => {
    assertEqual(matchRank({ numbers: [3, 7, 12, 25, 44, 45], bonus: 2 }, draw), 4);
  });

  test('5등: 본번호 3개 일치', () => {
    assertEqual(matchRank({ numbers: [3, 7, 12, 43, 44, 45], bonus: 2 }, draw), 5);
  });

  test('미적중: 본번호 2개 이하', () => {
    assertEqual(matchRank({ numbers: [3, 7, 40, 43, 44, 45], bonus: 2 }, draw), null);
  });

  test('추천 보너스는 매칭에 영향 없음', () => {
    // 추천 보너스 18(=발표 보너스)이지만 본번호 매칭만 카운트
    assertEqual(matchRank({ numbers: [40, 41, 42, 43, 44, 45], bonus: 18 }, draw), null);
  });

  test('5등 경계: 본번호 3개', () => {
    assertEqual(matchRank({ numbers: [3, 7, 12, 40, 41, 42], bonus: 1 }, draw), 5);
  });
});
