// suite 를 순서대로 불러 돌린다. 새 suite 를 만들면 이 목록에 넣는다.

import { done } from './core.js';

import './suites/datekey.test.js';
import './suites/resolve.test.js';
import './suites/estimate.test.js';
import './suites/planner.test.js';
import './suites/session.test.js';
import './suites/dayStatus.test.js';
import './suites/stats.test.js';

export const ok = done();
