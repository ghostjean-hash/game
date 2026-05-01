// 테스트 진입점. core.js를 먼저 평가하고, suite 파일들을 등록한 뒤 done() 호출.
// suite 파일은 ../core.js를 import해 함수 사용.

import { done } from './core.js';

// register suites here as core/ modules grow:
import './suites/seed.test.js';
import './suites/random.test.js';
import './suites/luck.test.js';
import './suites/stats.test.js';
import './suites/recommend.test.js';
import './suites/storage.test.js';
import './suites/fortune.test.js';
import './suites/match.test.js';
import './suites/zodiac.test.js';
import './suites/saju.test.js';
import './suites/wheeling.test.js';

done();
