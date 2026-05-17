// 테스트 진입점. core.js를 먼저 평가하고, suite 파일들을 등록한 뒤 done() 호출.
// suite 파일은 ../core.js를 import해 함수 사용.

import { done } from './core.js';

// register suites here as core/ modules grow:
import './suites/seed.test.js';
import './suites/random.test.js';
// S089 (2026-05-17): luck.test.js 폐기 (Luck 자산 전면 폐기).
import './suites/stats.test.js';
import './suites/recommend.test.js';
import './suites/storage.test.js';
import './suites/fortune.test.js';
import './suites/match.test.js';
import './suites/zodiac.test.js';
import './suites/saju.test.js';
import './suites/wheeling.test.js';
import './suites/schedule.test.js';
import './suites/history.test.js';
import './suites/ritual.test.js';
import './suites/reverse.test.js';
import './suites/saved-sets.test.js';
// S74 (2026-05-16): strategyShort / strategyLabel label[0] 정합 회귀.
import './suites/strategy-picker.test.js';
// S64.1 (2026-05-10): 비동기 storage 테스트. ESM top-level await로 모든 asyncTest 직렬 평가.
import './suites/storage-async.test.js';

done();
