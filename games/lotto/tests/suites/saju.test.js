import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  dateToDayPillar, dayPillarLabel,
  pillarElement, elementRelation, elementLabel,
} from '../../src/core/saju.js';

suite('core/saju - dateToDayPillar', () => {
  test('1984-02-02 = 갑자일 (gap-rat)', () => {
    const p = dateToDayPillar('1984-02-02');
    assertEqual(p.stem, 'gap');
    assertEqual(p.branch, 'rat');
  });
  test('1984-02-03 = 을축일 (eul-ox)', () => {
    const p = dateToDayPillar('1984-02-03');
    assertEqual(p.stem, 'eul');
    assertEqual(p.branch, 'ox');
  });
  test('60일 후 다시 갑자', () => {
    const p = dateToDayPillar('1984-04-02');
    assertEqual(p.stem, 'gap');
    assertEqual(p.branch, 'rat');
  });
  test('잘못된 입력은 null', () => {
    assertEqual(dateToDayPillar('not-a-date'), null);
    assertEqual(dateToDayPillar(null), null);
  });
});

suite('core/saju - dayPillarLabel', () => {
  test('갑자', () => assertEqual(dayPillarLabel({ stem: 'gap', branch: 'rat' }), '갑자'));
  test('을축', () => assertEqual(dayPillarLabel({ stem: 'eul', branch: 'ox' }), '을축'));
  test('계해', () => assertEqual(dayPillarLabel({ stem: 'gye', branch: 'pig' }), '계해'));
  test('null은 빈 문자열', () => assertEqual(dayPillarLabel(null), ''));
});

suite('core/saju - pillarElement', () => {
  test('갑/을 → 목', () => {
    assertEqual(pillarElement({ stem: 'gap' }), 'wood');
    assertEqual(pillarElement({ stem: 'eul' }), 'wood');
  });
  test('병/정 → 화', () => {
    assertEqual(pillarElement({ stem: 'byeong' }), 'fire');
    assertEqual(pillarElement({ stem: 'jeong' }), 'fire');
  });
  test('임/계 → 수', () => {
    assertEqual(pillarElement({ stem: 'im' }), 'water');
    assertEqual(pillarElement({ stem: 'gye' }), 'water');
  });
});

suite('core/saju - elementRelation', () => {
  test('self: 같은 오행 (갑-을 모두 목)', () => {
    assertEqual(elementRelation({ stem: 'gap' }, { stem: 'eul' }), 'self');
  });
  test('generate: 목 → 화 (갑이 병을 생함)', () => {
    assertEqual(elementRelation({ stem: 'gap' }, { stem: 'byeong' }), 'generate');
  });
  test('beGenerated: 화는 목에서 생함 (병이 갑에서 생)', () => {
    assertEqual(elementRelation({ stem: 'byeong' }, { stem: 'gap' }), 'beGenerated');
  });
  test('overcome: 목이 토를 극함 (갑→무)', () => {
    assertEqual(elementRelation({ stem: 'gap' }, { stem: 'mu' }), 'overcome');
  });
  test('beOvercome: 토가 목에 극당함 (무→갑)', () => {
    assertEqual(elementRelation({ stem: 'mu' }, { stem: 'gap' }), 'beOvercome');
  });
  test('null 인자는 normal', () => {
    assertEqual(elementRelation(null, { stem: 'gap' }), 'normal');
    assertEqual(elementRelation({ stem: 'gap' }, null), 'normal');
  });
});

suite('core/saju - elementLabel', () => {
  test('한국어 라벨', () => {
    assertEqual(elementLabel('wood'), '목');
    assertEqual(elementLabel('fire'), '화');
    assertEqual(elementLabel('earth'), '토');
    assertEqual(elementLabel('metal'), '금');
    assertEqual(elementLabel('water'), '수');
  });
  test('미존재는 빈 문자열', () => assertEqual(elementLabel('alien'), ''));
});
