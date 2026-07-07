// 스테이지별 웨이브 스크립트 생성 (순수).
import { CFG, STAGE_NAMES } from '../data/numbers.js';

// 각 wave: { t: 등장시각(초), enemies: [{type, xr}] }  xr = 화면폭 비율(가로 위치)
// cols(n) = 화면 가로를 n등분한 위치 배열(적을 고르게 흩뿌린다).
const cols = (n) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));

export function buildWaves(stage) {
  if (stage >= CFG.hardStage.from) return buildHardWaves(stage); // 11구역~: 신규 적 구간
  const s = Math.min(stage - 1, 6); // 난이도 가중(상한으로 후반 과밀 방지)
  const w = [];
  let t = 1.0;
  const add = (type, xs) => { w.push({ t, enemies: xs.map((xr) => ({ type, xr })) }); };

  // 웨이브 수·마리 수를 늘려 일반 구간을 더 길고 빽빽하게(적 더 많이).
  add('drone', cols(4 + Math.min(s, 5)));
  t += 2.0; add('weaver', cols(3 + Math.min(s, 4)));
  t += 2.2; add('drone', cols(5 + Math.min(s, 5)));
  t += 2.0; add('gunner', cols(2 + Math.min(s, 3)));
  t += 2.4; add('weaver', cols(4 + Math.min(s, 4)));
  t += 2.2; add('drone', cols(5 + Math.min(s, 5)));
  t += 2.4; add('gunner', cols(3 + Math.min(s, 3)));
  t += 2.2; add('weaver', cols(4 + Math.min(s, 4)));
  if (s >= 1) { t += 2.4; add('drone', cols(6 + Math.min(s, 4))); }
  if (s >= 2) { t += 2.2; add('gunner', cols(3 + Math.min(s, 3))); }
  return w;
}

// 11~20 구역: 신규 적(rusher 돌격·splitter 분열·shielder 방패) 위주. 사이사이 기존 적으로 화력을 보급.
function buildHardWaves(stage) {
  const s = Math.min(stage - CFG.hardStage.from, 6);
  const w = [];
  let t = 1.0;
  const add = (type, xs) => { w.push({ t, enemies: xs.map((xr) => ({ type, xr })) }); };

  add('rusher', cols(2 + Math.min(s, 3)));
  t += 2.2; add('splitter', cols(2 + Math.min(s, 2)));
  t += 2.4; add('drone', cols(4 + Math.min(s, 4)));
  t += 2.2; add('shielder', cols(2 + Math.min(s, 2)));
  t += 2.4; add('rusher', cols(3 + Math.min(s, 3)));
  t += 2.2; add('gunner', cols(3 + Math.min(s, 3)));
  t += 2.4; add('splitter', cols(3 + Math.min(s, 2)));
  t += 2.2; add('shielder', cols(2 + Math.min(s, 2)));
  if (s >= 1) { t += 2.4; add('rusher', cols(3 + Math.min(s, 3))); }
  if (s >= 2) { t += 2.2; add('splitter', cols(3 + Math.min(s, 2))); }
  return w;
}

export function stageName(n) {
  return STAGE_NAMES[n - 1] || '';
}
