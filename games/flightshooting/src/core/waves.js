// 스테이지별 웨이브 스크립트 생성 (순수).
import { CFG, STAGE_NAMES } from '../data/numbers.js';

// 각 wave: { t: 등장시각(초), enemies: [{type, xr}] }  xr = 화면폭 비율(가로 위치)
// cols(n) = 화면 가로를 n등분한 위치 배열(적을 고르게 흩뿌린다).
const cols = (n) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));

export function buildWaves(stage) {
  if (stage >= CFG.aeonStage.from) return buildAeonWaves(stage); // 31구역~: 빛 생명체 구간
  if (stage >= CFG.voidStage.from) return buildVoidWaves(stage); // 21구역~: 이질 기계 적 구간
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

// 21~30 구역: 이질 기계 적(turret 포대·prism 결정·mine 기뢰·warper 왜곡체) 위주. 완전 다른 형태 구간.
//   26구역~ 전격 코일(coil 쌍), 28구역~ 기계 뱀(serpent)이 합류해 후반 압박을 키운다(docs/08).
function buildVoidWaves(stage) {
  const s = Math.min(stage - CFG.voidStage.from, 6);
  const V = CFG.voidStage;
  const w = [];
  let t = 1.0;
  const add = (type, xs) => { w.push({ t, enemies: xs.map((xr) => ({ type, xr })) }); };

  add('turret', cols(2 + Math.min(s, 2)));
  t += 2.4; add('prism', cols(2 + Math.min(s, 3)));
  t += 2.2; add('mine', cols(2 + Math.min(s, 2)));
  if (stage >= V.coilFrom) { t += 2.2; add('coil', [0.3, 0.7]); } // 전격 코일 쌍 2조
  t += 2.4; add('warper', cols(2 + Math.min(s, 3)));
  t += 2.2; add('prism', cols(3 + Math.min(s, 3)));
  if (stage >= V.serpentFrom) { t += 2.6; add('serpent', [0.5]); } // 기계 뱀 1마리(길어서 하나)
  t += 2.4; add('turret', cols(2 + Math.min(s, 2)));
  t += 2.2; add('mine', cols(3 + Math.min(s, 2)));
  t += 2.4; add('warper', cols(3 + Math.min(s, 3)));
  if (stage >= V.coilFrom) { t += 2.2; add('coil', [0.25, 0.62]); }
  if (s >= 1) { t += 2.2; add('prism', cols(3 + Math.min(s, 3))); }
  if (s >= 2) { t += 2.4; add('turret', cols(3 + Math.min(s, 2))); }
  return w;
}

// 31~40 구역: 빛·에너지 생명체(wisp 도깨비불·jelly 빛해파리·bloom 빛꽃·whale 빛고래) 위주.
//   곡선·발광 계열로 앞 구간(기계)과 확 다르다. 구역이 오를수록 밀도↑, whale은 커서 한 번에 1마리만 배치.
function buildAeonWaves(stage) {
  const s = Math.min(stage - CFG.aeonStage.from, 6);
  const w = [];
  let t = 1.0;
  const add = (type, xs) => { w.push({ t, enemies: xs.map((xr) => ({ type, xr })) }); };

  add('wisp', cols(3 + Math.min(s, 3)));
  t += 2.2; add('jelly', cols(2 + Math.min(s, 2)));
  t += 2.4; add('bloom', cols(2 + Math.min(s, 3)));
  t += 2.2; add('wisp', cols(4 + Math.min(s, 3)));
  if (stage >= CFG.aeonStage.from + 1) { t += 2.6; add('whale', [0.5]); } // 32구역~ 빛고래 1마리
  t += 2.4; add('bloom', cols(3 + Math.min(s, 3)));
  t += 2.2; add('jelly', cols(2 + Math.min(s, 2)));
  t += 2.4; add('wisp', cols(4 + Math.min(s, 3)));
  if (s >= 1) { t += 2.2; add('bloom', cols(3 + Math.min(s, 3))); }
  if (s >= 2) { t += 2.6; add('whale', [0.35, 0.65]); } // 후반: 빛고래 2마리
  if (s >= 3) { t += 2.2; add('jelly', cols(3 + Math.min(s, 2))); }
  return w;
}

export function stageName(n) {
  return STAGE_NAMES[n - 1] || '';
}
