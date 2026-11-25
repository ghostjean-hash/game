// 전략 실험실 전략 목록 · 수치 기본값 · 수치 칸 범위(기획서 3.4 · 5.6). 전략 수치는 이 파일에만 둔다.
// 퍼센트 수치는 소수로 둔다(0.05 = 5%). 화면은 unit 이 '%' 인 칸을 100 배로 보인다.

export const GROUPS = [
  { key: 'base', name: '기준' },
  { key: 'user', name: '사용자 원안 · GPT 제안' },
  { key: 'pool', name: '20% 몫 전문가 기법' },
  { key: 'whole', name: '고점 방어 전문가 기법' },
  { key: 'custom', name: '내 전략' },
];

// 비교 묶음 단추(기획서 3.9). 기준 두 줄은 어느 묶음에서나 보인다.
export const COMPARE_GROUPS = [
  { key: 'all', name: '모두' },
  { key: 'whole', name: '전체 비중끼리' },
  { key: 'pool', name: '20% 몫끼리' },
  { key: 'user', name: '사용자 · GPT끼리' },
];
export const ALWAYS_SHOWN = ['hold100', 'hold80'];

export const CHIPS = {
  orig: { label: '원문', cls: 'c-orig' },
  simple: { label: '단순화', cls: 'c-simple' },
  variant: { label: '참고 변형', cls: 'c-variant' },
  exp: { label: '실험용 설정', cls: 'c-exp' },
  second: { label: '2차 출처', cls: 'c-second' },
};

// 수치 칸 정의. choice 는 선택지(값 · 이름).
export const PARAM_META = {
  weight: { label: '보유 비중', unit: '%', min: 0, max: 1, step: 0.05 },
  base: { label: '기본 비중', unit: '%', min: 0, max: 1, step: 0.05 },
  def: { label: '급락 · 급등 정의', unit: 'choice', choices: [['A', 'A 하루'], ['B', 'B 2일'], ['C', 'C 3일'], ['D', 'D 5일'], ['E', 'E 변동성'], ['I', '장중(저가 · 고가)']] },
  width: { label: '급락 · 급등 폭', unit: '%', min: 0.01, max: 0.3, step: 0.01 },
  mult: { label: '변동성 배수(E)', unit: '배', min: 0.5, max: 5, step: 0.1 },
  buy1: { label: '1차 매수(현금의)', unit: '%', min: 0.05, max: 1, step: 0.05 },
  buy2: { label: '2차 매수(남은 현금의)', unit: '%', min: 0.05, max: 1, step: 0.05 },
  rebuy: { label: '손절 뒤 재매수(현금의)', unit: '%', min: 0.05, max: 1, step: 0.05 },
  stopPct: { label: '손절 · 반등 매도(보유의)', unit: '%', min: 0.01, max: 1, step: 0.01 },
  cumDrop: { label: '누적 하락 손절', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  resell: { label: '급등 때 되파는 양', unit: 'choice', choices: [['qty', '추가로 산 주식 수만큼'], ['won', '추가로 넣은 금액만큼']] },
  normalSurge: { label: '평상 상태 급등', unit: 'choice', choices: [['none', '팔지 않음'], ['sell', '보유 주식 일부 매도(손절 비율만큼)']] },
  cumBase: { label: '누적 하락 기준', unit: 'choice', choices: [['lastBuy', '마지막으로 산 날 코스피'], ['stateHigh', '그 상태 들어온 뒤 최고 코스피']] },
  wUp: { label: '상승장 비중', unit: '%', min: 0, max: 1, step: 0.05 },
  wSide: { label: '횡보장 비중', unit: '%', min: 0, max: 1, step: 0.05 },
  wDown: { label: '하락장 비중', unit: '%', min: 0, max: 1, step: 0.05 },
  wStrong: { label: '강한 하락장 비중', unit: '%', min: 0, max: 1, step: 0.05 },
  fUp: { label: '상승장 급락 투입(현금의)', unit: '%', min: 0, max: 1, step: 0.05 },
  fSide: { label: '횡보장 급락 투입', unit: '%', min: 0, max: 1, step: 0.05 },
  fDown: { label: '하락장 급락 투입', unit: '%', min: 0, max: 1, step: 0.05 },
  fStrong: { label: '강한 하락장 급락 투입', unit: '%', min: 0, max: 1, step: 0.05 },
  maShort: { label: '짧은 이동평균', unit: '일', min: 5, max: 250, step: 1 },
  maLong: { label: '긴 이동평균', unit: '일', min: 20, max: 400, step: 1 },
  strongGap: { label: '강한 하락장 기준(짧은 평균 아래)', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  trade: { label: '급락 · 급등 매매', unit: 'choice', choices: [['on', '함'], ['off', '안 함']] },
  rb1: { label: '1차 매수 반등', unit: '%', min: 0.005, max: 0.2, step: 0.005 },
  rb2: { label: '2차 매수 반등', unit: '%', min: 0.005, max: 0.3, step: 0.005 },
  take: { label: '수익 실현(산 날 코스피 대비)', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  stop: { label: '손절(산 날 코스피 대비)', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  months: { label: '이동평균(개월)', unit: '개월', min: 2, max: 24, step: 1 },
  maLen: { label: '이동평균', unit: '일', min: 20, max: 400, step: 1 },
  upBand: { label: '매수 띠(평균 위)', unit: '%', min: 0, max: 0.2, step: 0.005 },
  dnBand: { label: '매도 띠(평균 아래)', unit: '%', min: 0, max: 0.2, step: 0.005 },
  lookback: { label: '모멘텀 기간(개월)', unit: '개월', min: 1, max: 24, step: 1 },
  targetVol: { label: '목표 변동성(연)', unit: '%', min: 0.05, max: 1, step: 0.01 },
  volDays: { label: '변동성 측정', unit: '일', min: 5, max: 120, step: 1 },
  cap: { label: '비중 상한', unit: '%', min: 0.1, max: 1, step: 0.05 },
  target: { label: '목표 비중', unit: '%', min: 0.05, max: 1, step: 0.05 },
  band: { label: '허용 폭', unit: '%', min: 0.01, max: 0.3, step: 0.01 },
  mode: { label: '점검', unit: 'choice', choices: [['band', '매일(허용 폭 넘으면)'], ['yearly', '매년 첫 거래일']] },
  drop: { label: '고점 대비 하락 매도', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  rebound: { label: '저점 대비 반등 재매수', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  growth: { label: '분기 목표', unit: '%', min: 0.005, max: 0.3, step: 0.005 },
  cashCap: { label: '현금 상한 되돌림(0 = 없음)', unit: '%', min: 0, max: 1, step: 0.05 },
  crash: { label: '30 down 하락 기준', unit: '%', min: 0.05, max: 0.9, step: 0.05 },
  skipMax: { label: '30 down 매도 건너뛰기', unit: '회', min: 0, max: 12, step: 1 },
  rsiBuy: { label: 'RSI(2) 매수 기준(이하)', unit: '', min: 1, max: 50, step: 1 },
  smaExit: { label: '매도 이동평균', unit: '일', min: 2, max: 50, step: 1 },
  window: { label: '최저 · 최고 종가 기간', unit: '일', min: 2, max: 50, step: 1 },
  rsiLow: { label: 'RSI(2) 매수 기준(미만)', unit: '', min: 1, max: 50, step: 1 },
  rsiStart: { label: '하락 첫날 RSI(2)(미만)', unit: '', min: 1, max: 100, step: 1 },
  rsiExit: { label: 'RSI(2) 매도 기준(초과)', unit: '', min: 30, max: 99, step: 1 },
  gridStep: { label: '칸 간격', unit: '%', min: 0.01, max: 0.3, step: 0.01 },
  levels: { label: '칸 수', unit: '칸', min: 1, max: 10, step: 1 },
  splits: { label: '분할 수', unit: '회', min: 5, max: 80, step: 1 },
  profit: { label: '3/4 지정가 익절', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  starBase: { label: '별% 시작값', unit: '', min: 0, max: 30, step: 0.5 },
  starSlope: { label: '별% 회차당 감소', unit: '', min: 0, max: 3, step: 0.05 },
  qSplits: { label: '쿼터손절 분할', unit: '회', min: 2, max: 40, step: 1 },
  qLoss: { label: '쿼터손절 매수 기준(평단 아래)', unit: '%', min: 0.01, max: 0.5, step: 0.01 },
  k: { label: '돌파 계수 k', unit: '', min: 0.1, max: 1.5, step: 0.05 },
};

// 사용자 원안 계열 공통 수치
const USER = {
  base: 0.8, def: 'A', width: 0.05, mult: 2, buy1: 0.5, buy2: 1, rebuy: 0.5, stopPct: 0.1, cumDrop: 0.05,
  resell: 'qty', normalSurge: 'none', cumBase: 'lastBuy',
};
const REGIME = {
  wUp: 0.9, wSide: 0.8, wDown: 0.6, wStrong: 0.4, fUp: 0.5, fSide: 0.5, fDown: 0.25, fStrong: 0,
  maShort: 60, maLong: 200, strongGap: 0.1, def: 'A', width: 0.05, mult: 2, trade: 'on',
};
const POOL_BASE = 0.8;

const CHECK_DAILY = '장 마감 뒤 하루 1번';
const USER_SRC = { who: '사용자 설명(2026-11-25)', url: '' };
const GPT_SRC = { who: 'GPT 제안(2026-11-25)', url: '' };
const USER_ORIG = '사용자가 설명한 규칙';
const USER_CHG = '정해지지 않은 곳은 실험용 설정(기획서 3.6)';

// phase: 만드는 순서(기획서 3.4.0). on: 처음 켜짐.
export const PRESETS = [
  // ---- 기준 ----
  { id: 'hold100', frame: 'hold', group: 'base', phase: 1, on: true, color: '#00b894', name: '100% 보유',
    desc: '첫날 전액 매수 뒤 아무것도 하지 않는다.', check: '없음', chips: [], src: null,
    params: { weight: 1 } },
  { id: 'hold80', frame: 'hold', group: 'base', phase: 1, on: true, color: '#f47230', name: '80:20 보유',
    desc: '첫날 보유 비중만큼 사고 아무것도 하지 않는다.', check: '없음', chips: [], src: null,
    params: { weight: 0.8 } },
  { id: 'ladder', frame: 'ladder', group: 'base', phase: 4, on: false, color: '#8d6e63', name: '고점 대비 낙폭 사다리',
    desc: '지금까지의 시뮬레이터 규칙. 코스피 고점 대비 낙폭 단계로 목표 비중을 바꾼다(기획서 3.5).', check: CHECK_DAILY, chips: [], src: null,
    params: { base: 0.8, step: 0.1, unit: 0.1 } },

  // ---- 사용자 원안 · GPT ----
  { id: 'user-A', frame: 'user', group: 'user', phase: 1, on: true, color: '#257de0', name: '사용자 원안',
    desc: '주식 80 : 현금 20. 하루 5% 급락이면 현금 절반 매수, 또 급락이면 나머지 매수. 5% 급등이면 추가로 산 만큼 판다. 현금을 다 쓴 뒤 급락 · 누적 5% 하락이면 10% 손절, 손절 뒤 급등이면 10% 더 팔고 처음으로.',
    check: CHECK_DAILY, chips: ['exp'], src: USER_SRC, orig: USER_ORIG, changed: USER_CHG, params: { ...USER } },
  { id: 'user-B', frame: 'user', group: 'user', phase: 1, on: false, color: '#5c9ded', name: '사용자 원안 · 급락 B(2일)',
    desc: '사용자 원안과 같고 급락 · 급등을 2거래일 누적 5%로 판정한다.', check: CHECK_DAILY, chips: ['exp'], src: USER_SRC, orig: USER_ORIG, changed: USER_CHG, params: { ...USER, def: 'B' } },
  { id: 'user-C', frame: 'user', group: 'user', phase: 1, on: false, color: '#7fb3f2', name: '사용자 원안 · 급락 C(3일)',
    desc: '사용자 원안과 같고 급락 · 급등을 3거래일 누적 5%로 판정한다.', check: CHECK_DAILY, chips: ['exp'], src: USER_SRC, orig: USER_ORIG, changed: USER_CHG, params: { ...USER, def: 'C' } },
  { id: 'user-D', frame: 'user', group: 'user', phase: 1, on: false, color: '#1a5fb4', name: '사용자 원안 · 급락 D(5일)',
    desc: '사용자 원안과 같고 급락 · 급등을 5거래일 누적 5%로 판정한다.', check: CHECK_DAILY, chips: ['exp'], src: USER_SRC, orig: USER_ORIG, changed: USER_CHG, params: { ...USER, def: 'D' } },
  { id: 'user-E', frame: 'user', group: 'user', phase: 1, on: false, color: '#3949ab', name: '사용자 원안 · 급락 E(변동성)',
    desc: '사용자 원안과 같고 급락 · 급등을 최근 20일 하루 등락 표준편차의 2배로 판정한다.', check: CHECK_DAILY, chips: ['exp'], src: USER_SRC, orig: USER_ORIG, changed: USER_CHG, params: { ...USER, def: 'E' } },
  { id: 'user-half', frame: 'user', group: 'user', phase: 1, on: true, color: '#6a1b9a', name: '남은 현금 50%',
    desc: '사용자 원안에서 매수 때마다 남은 현금의 50%만 산다. 현금이 0이 되지 않는다(GPT S03).', check: CHECK_DAILY, chips: ['exp'], src: GPT_SRC, orig: USER_ORIG, changed: '2차 매수를 남은 현금의 50%로', params: { ...USER, buy2: 0.5 } },
  { id: 'user-half-E', frame: 'user', group: 'user', phase: 1, on: false, color: '#9c4dcc', name: '남은 현금 50% · 급락 E',
    desc: '남은 현금 50%와 같고 급락 정의 E(GPT S06).', check: CHECK_DAILY, chips: ['exp'], src: GPT_SRC, orig: USER_ORIG, changed: '2차 매수 50%, 급락 정의 E', params: { ...USER, buy2: 0.5, def: 'E' } },
  { id: 'regime', frame: 'regime', group: 'user', phase: 1, on: true, color: '#c2185b', name: '시장 상태별 비중',
    desc: '60일 · 200일 평균으로 상승 · 횡보 · 하락 · 강한 하락을 가르고 상태마다 목표 비중(90 · 80 · 60 · 40%)을 둔다. 그 안에서 급락 매수 · 급등 매도(GPT S04).', check: CHECK_DAILY, chips: ['exp'], src: GPT_SRC, orig: 'GPT가 가설이라고 밝힌 규칙', changed: '수치 전부 실험용', params: { ...REGIME } },
  { id: 'regime-E', frame: 'regime', group: 'user', phase: 1, on: false, color: '#e35d8f', name: '시장 상태별 비중 · 급락 E',
    desc: '시장 상태별 비중과 같고 급락 정의 E(GPT S07).', check: CHECK_DAILY, chips: ['exp'], src: GPT_SRC, orig: 'GPT가 가설이라고 밝힌 규칙', changed: '수치 전부 실험용', params: { ...REGIME, def: 'E' } },
  { id: 'regime-only', frame: 'regime', group: 'user', phase: 1, on: false, color: '#880e4f', name: '시장 상태 비중만',
    desc: '시장 상태별 목표 비중만 따르고 급락 · 급등 매매는 하지 않는다(GPT S08).', check: CHECK_DAILY, chips: ['exp'], src: GPT_SRC, orig: 'GPT가 가설이라고 밝힌 규칙', changed: '수치 전부 실험용', params: { ...REGIME, trade: 'off' } },
  { id: 'rebound', frame: 'rebound', group: 'user', phase: 1, on: false, color: '#ad1457', name: '반등 확인 후 매수',
    desc: '급락이 나면 기다렸다가 급락 뒤 최저 종가보다 2% 오르면 현금 50%, 4% 오르면 나머지를 산다. 묶음마다 산 날 코스피보다 5% 오르면 팔고 4% 내리면 판다(GPT S05).', check: CHECK_DAILY, chips: ['exp'], src: GPT_SRC, orig: 'GPT가 가설이라고 밝힌 규칙', changed: '손절 4%는 GPT 범위 3~5%의 가운데',
    params: { base: 0.8, def: 'A', width: 0.05, mult: 2, rb1: 0.02, rb2: 0.04, take: 0.05, stop: 0.04 } },
  { id: 'user-intra', frame: 'user', group: 'user', phase: 4, on: false, color: '#0d47a1', name: '사용자 원안 · 장중 급락',
    desc: '사용자 원안과 같고 급락 = 코스피 그날 저가가 전날 종가보다 5% 이상 낮음, 급등 = 그날 고가가 5% 이상 높음. 그날 종가에 체결(장중 확인 뒤 마감 체결 가정).', check: '장중 확인 필요', chips: ['exp'], src: USER_SRC, orig: USER_ORIG, changed: '판정을 장중 저가 · 고가로', params: { ...USER, def: 'I' } },

  // ---- 20% 몫 전문가 기법 ----
  { id: 'rebal-band', frame: 'rebalance', group: 'pool', phase: 2, on: true, color: '#2e7d32', name: '고정 비율 리밸런싱 · 밴드',
    desc: '매일 보고 주식 비중이 80%에서 5%p 넘게 벗어나면 80%로 맞춘다. 오르면 저절로 일부를 판다.', check: CHECK_DAILY, chips: ['orig'],
    src: { who: 'Vanguard', url: 'https://investor.vanguard.com/investor-resources-education/portfolio-management/rebalancing-your-portfolio' },
    orig: '주식 · 채권 여러 자산, 5%p 허용 폭', changed: 'KODEX 레버리지 80 : 현금 20', params: { target: 0.8, band: 0.05, mode: 'band' } },
  { id: 'rebal-year', frame: 'rebalance', group: 'pool', phase: 2, on: false, color: '#66bb6a', name: '고정 비율 리밸런싱 · 연 1회',
    desc: '매년 첫 거래일에 주식 비중이 80%에서 5%p 넘게 벗어났으면 80%로 맞춘다.', check: '연 1번', chips: ['orig'],
    src: { who: 'Vanguard', url: 'https://investor.vanguard.com/investor-resources-education/portfolio-management/rebalancing-your-portfolio' },
    orig: '주식 · 채권 여러 자산, 연 1회 점검 + 5%p', changed: 'KODEX 레버리지 80 : 현금 20', params: { target: 0.8, band: 0.05, mode: 'yearly' } },
  { id: 'grid', frame: 'grid', group: 'pool', phase: 2, on: false, color: '#558b2f', name: '그리드 매매',
    desc: '시작 날 코스피를 기준가로 5% 간격 4칸을 아래로 깐다. 칸 아래로 내려가면 그 칸 몫(20% ÷ 4)을 사고, 그 칸보다 5% 오르면 판다.', check: CHECK_DAILY, chips: ['simple', 'exp'],
    src: { who: '표준 정의(Quantpedia)', url: 'https://quantpedia.com/a-primer-on-grid-trading-strategy/?a=6080' },
    orig: '기준가 위아래 일정 간격 지정가', changed: '종가가 칸에 닿으면 종가 체결, 칸 간격 · 칸 수는 실험용', params: { base: POOL_BASE, gridStep: 0.05, levels: 4 } },
  { id: 'rsi2', frame: 'rsi2', group: 'pool', phase: 2, on: true, color: '#00838f', name: 'RSI(2)',
    desc: '코스피가 200일 평균 위이고 2일 RSI가 5 이하면 20% 몫 전액 매수, 코스피가 5일 평균 위로 오면 판다. 손절 없음.', check: CHECK_DAILY, chips: ['orig', 'second'],
    src: { who: 'Larry Connors', url: 'https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/rsi-2' },
    orig: 'SPY(1배), 계좌 전체', changed: '코스피로 판단, KODEX 레버리지를 20% 몫으로만', params: { base: POOL_BASE, maLen: 200, rsiBuy: 5, smaExit: 5 } },
  { id: 'double7', frame: 'double7', group: 'pool', phase: 2, on: false, color: '#26a69a', name: 'Double 7s',
    desc: '코스피가 200일 평균 위이고 오늘 종가가 최근 7거래일 최저 종가면 20% 몫 매수, 최근 7거래일 최고 종가면 판다.', check: CHECK_DAILY, chips: ['orig', 'second'],
    src: { who: 'Larry Connors', url: 'https://strategyquant.com/blog/larry-connors-double-7-strategy-tested-on-spy-and-8-other-markets/' },
    orig: 'SPY(1배), 계좌 전체', changed: '코스피로 판단, KODEX 레버리지를 20% 몫으로만', params: { base: POOL_BASE, maLen: 200, window: 7 } },
  { id: 'r3', frame: 'r3', group: 'pool', phase: 2, on: false, color: '#00695c', name: 'R3',
    desc: '코스피가 200일 평균 위, 2일 RSI가 3일 연속 하락, 하락 첫날 값 60 미만, 오늘 값 10 미만이면 20% 몫 매수. 2일 RSI가 70을 넘으면 판다.', check: CHECK_DAILY, chips: ['orig', 'second'],
    src: { who: 'Larry Connors', url: 'https://www.tradingview.com/script/5CDSns2I-R3-ETF-Strategy/' },
    orig: 'ETF(1배), 계좌 전체', changed: '코스피로 판단, KODEX 레버리지를 20% 몫으로만', params: { base: POOL_BASE, maLen: 200, rsiLow: 10, rsiStart: 60, rsiExit: 70 } },
  { id: 'infinite', frame: 'infinite', group: 'pool', phase: 2, on: false, color: '#004d40', name: '무한매수법 V2.2',
    desc: '20% 몫을 40으로 나눠 매일 장 마감 주문으로 평단 근처에서 산다. 평단 위 별% · +10%에 나눠 판다. 40회를 다 쓰면 쿼터손절. 매일 주문을 새로 내야 해 부담이 크다.', check: '매일 장 마감 전 주문', chips: ['simple', 'second', 'exp'],
    src: { who: '라오어(quantstack 정리)', url: 'https://quantstack.app/infinite/v2-2/' },
    orig: 'TQQQ(3배), 원금 전체 40분할', changed: 'KODEX 레버리지 20% 몫만, +10% 지정가는 종가 체결', params: { base: POOL_BASE, splits: 40, profit: 0.1, starBase: 10, starSlope: 0.5, qSplits: 10, qLoss: 0.1 } },
  { id: 'breakout', frame: 'breakout', group: 'pool', phase: 4, on: false, color: '#827717', name: '변동성 돌파',
    desc: '코스피 그날 고가가 시가 + 0.5 × 전날 변동폭을 넘으면 20% 몫을 돌파 가격에 산 것으로 치고 다음 날 시가에 판다.', check: '장중 주문 필요', chips: ['simple', 'second'],
    src: { who: 'Larry Williams(LuxAlgo 정리)', url: 'https://www.luxalgo.com/library/concept/volatility-breakout/' },
    orig: '개별 종목 · 지수, 장중 돌파 매수', changed: '코스피로 판단, KODEX 레버리지 20% 몫, 돌파 가격 체결 가정', params: { base: POOL_BASE, k: 0.5 } },

  // ---- 고점 방어 전문가 기법 ----
  { id: 'faber', frame: 'faber', group: 'whole', phase: 3, on: true, color: '#e65100', name: '10개월선',
    desc: '매월 마지막 거래일에 코스피 월말 종가가 최근 10개 월말 평균보다 위면 보유, 아래면 전액 현금.', check: '월말 1번', chips: ['orig', 'second'],
    src: { who: 'Meb Faber(2007)', url: 'https://www.cxoadvisory.com/technical-trading/long-term-outperformance-from-trends-defined-by-moving-averages' },
    orig: '미국 주식 등 13개 자산, 1배', changed: '코스피로 판단, KODEX 레버리지, 현금 이자 0%', params: { weight: 1, months: 10 } },
  { id: 'siegel', frame: 'maBand', group: 'whole', phase: 3, on: false, color: '#ef6c00', name: '200일선 ±1%',
    desc: '매일 코스피 종가가 200일 평균보다 1% 이상 위면 보유, 1% 이상 아래면 현금.', check: CHECK_DAILY, chips: ['orig', 'second'],
    src: { who: 'Jeremy Siegel', url: 'https://blog.validea.com/the-moving-average-strategy-good-results-if-you-have-the-discipline/' },
    orig: '미국 주식 지수(1886~2012), 1배, 국채', changed: '코스피로 판단, KODEX 레버리지, 현금 0%', params: { weight: 1, maLen: 200, upBand: 0.01, dnBand: 0.01 } },
  { id: 'gayed', frame: 'maBand', group: 'whole', phase: 3, on: false, color: '#f57c00', name: '200일선 레버리지',
    desc: '매일 코스피 종가가 200일 평균 위면 보유, 아래면 현금(띠 없음).', check: CHECK_DAILY, chips: ['orig', 'second'],
    src: { who: 'Gayed · Bilello(2016)', url: 'https://www.cxoadvisory.com/volatility-effects/leveraging-the-u-s-stock-market-based-on-sma-rules/' },
    orig: 'S&P500 총수익지수, 1.25 · 2 · 3배, 단기국채', changed: '코스피(가격 지수), KODEX 레버리지, 현금 0%', params: { weight: 1, maLen: 200, upBand: 0, dnBand: 0 } },
  { id: 'tv43', frame: 'maBand', group: 'whole', phase: 3, on: false, color: '#ffa726', name: '200일선 +4% / -3%',
    desc: '200일 평균보다 4% 이상 위면 사고, 3% 이상 아래면 판다.', check: CHECK_DAILY, chips: ['orig', 'exp'],
    src: { who: 'TradingView 사용자 스크립트', url: 'https://de.tradingview.com/scripts/longterm/' },
    orig: 'SPY · QQQ 판단, TQQQ(3배)', changed: '코스피 판단, KODEX 레버리지(2배)', params: { weight: 1, maLen: 200, upBand: 0.04, dnBand: 0.03 } },
  { id: 'absmom', frame: 'absmom', group: 'whole', phase: 3, on: false, color: '#bf360c', name: '절대 모멘텀',
    desc: '매월 마지막 거래일에 코스피 12개월 수익률이 0%보다 높으면 보유, 아니면 현금.', check: '월말 1번', chips: ['simple', 'second'],
    src: { who: 'Gary Antonacci', url: 'https://alphaarchitect.com/7910/' },
    orig: '미국 주식 지수, 기준 미국 단기국채 금리', changed: '코스피, 기준 0%', params: { weight: 1, lookback: 12 } },
  { id: 'voltarget', frame: 'voltarget', group: 'whole', phase: 3, on: false, color: '#795548', name: '변동성 맞추기',
    desc: '매월 첫 거래일에 주식 비중 = min(목표 30% ÷ 최근 20일 KODEX 레버리지 연율 변동성, 100%). 많이 출렁이면 비중을 줄인다.', check: '월초 1번', chips: ['variant', 'exp'],
    src: { who: 'Moreira · Muir(2017), 알고랩 코스피200 시험', url: 'https://www.nber.org/papers/w22208.pdf' },
    orig: '논문: 직전 달 분산의 역수 / 블로그: 코스피200, 목표 15%', changed: 'KODEX 레버리지 변동성, 목표 30%, 상한 100%', params: { targetVol: 0.3, volDays: 20, cap: 1 } },
  { id: 'trailing', frame: 'trailing', group: 'whole', phase: 3, on: false, color: '#a1887f', name: '트레일링 스톱',
    desc: '보유 중 코스피가 매수 뒤 최고 종가보다 10% 빠지면 전액 현금, 현금 상태에서 최저 종가보다 10% 오르면 다시 산다.', check: CHECK_DAILY, chips: ['second', 'exp'],
    src: { who: 'Dai 외(2019)', url: 'https://acfr.aut.ac.nz/research/using-trailing-stop-loss-rules-to-reduce-risk' },
    orig: '확인한 요약에 시험 대상 없음, 재진입 규칙 없음', changed: '코스피 판단, 재진입 10%는 실험용', params: { weight: 1, drop: 0.1, rebound: 0.1 } },
  { id: 'sig6', frame: 'kelly', group: 'whole', phase: 3, on: false, color: '#5d4037', name: '6Sig',
    desc: '주식 50 : 현금 50. 분기 말마다 신호선 = 직전 분기 주식 평가액 × 1.06. 넘치면 팔고 모자라면 현금으로 채운다. 코스피가 2년 분기 말 최고보다 30% 낮으면 매도 4번 건너뛴다.', check: '분기 말 1번', chips: ['variant', 'second'],
    src: { who: 'Jason Kelly', url: 'https://jasonkelly.com/resources/strategies/' },
    orig: '2배 중형주 ETF(MVV) 50 : 채권 50, 분기 6%', changed: '현금(이자 0), 30 down은 3Sig 책 규칙, 현금 상한 되돌림 없음', params: { base: 0.5, growth: 0.06, cashCap: 0, crash: 0.3, skipMax: 4 } },
  { id: 'sig3', frame: 'kelly', group: 'whole', phase: 3, on: false, color: '#8d6e63', name: '3Sig 80:20판',
    desc: '주식 80 : 현금 20, 분기 목표 3%, 현금이 30%에 닿으면 80 : 20으로 되돌린다. 원래 1배 소형주용 수치.', check: '분기 말 1번', chips: ['variant', 'second'],
    src: { who: 'Jason Kelly', url: 'https://jasonkelly.com/3sig/' },
    orig: '미국 소형주 1배 80 : 채권 20', changed: 'KODEX 레버리지(2배) : 현금', params: { base: 0.8, growth: 0.03, cashCap: 0.3, crash: 0.3, skipMax: 4 } },
];

// 낙폭 사다리 수치 칸(옛 시뮬레이터와 같은 선택지)
PARAM_META.step = { label: '단계 폭', unit: '%', min: 0.05, max: 0.1, step: 0.05 };
PARAM_META.unit = { label: '매매 단위', unit: '%', min: 0.05, max: 0.1, step: 0.05 };
