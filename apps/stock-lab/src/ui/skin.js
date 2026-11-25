// 보이는 모양과 낱말을 보통 / 게임 모드 둘로 가른다(기획서 4.5.2). 계산은 건드리지 않는다.
import { load, daysBetween } from './common.js';
import { INDEX_BASE } from '../data/numbers.js';

// 게임 모드 지수: 기준값 대비 INDEX_BASE(=100) 배율
export const toIndex = (v, base) => (v / base) * INDEX_BASE;

export const GAME = !!load('ui', { gameMode: false }).gameMode;

const TEXT = {
  normal: {
    tabCompare: '비교 차트', tabSim: '시뮬레이터',
    grpPrice: '지수 · 종목 · 원자재 · 코인', grpRate: '금리',
    base: '대비',
    inInitial: '시작 금액', inInitialUnit: '만 원', inBase: '기본 비중', inStep: '단계 폭 (코스피)', inUnit: '매매 단위 (비중)', inRange: '기간',
    money: '원', manwon: '만 원',
    wayRule: '이 규칙', wayHold: (w) => `${w}% 들고 있기`, wayHold100: '100% 들고 있기',
    sumHead: ['방식', '최종 금액', '총수익률', '연평균', '최대 낙폭', '매매 횟수'],
    tradeHead: ['날짜', '단계', '코스피', '낙폭', '매매 금액', '매매 뒤 비중', '총자산'],
    buy: '매수', sell: '매도',
    period: (a, b, fee) => `${a} ~ ${b} · 매매는 KODEX 레버리지 종가 · 비용 ${fee}%`,
    stepLabel: (l) => l,
    secSummary: '', secChart: '', secTrades: '', secCompare: '',
  },
  game: {
    tabCompare: '곡선 비교', tabSim: '운용 시뮬레이션',
    grpPrice: '성장 곡선', grpRate: '이자 곡선',
    base: '기준',
    inInitial: '시작 골드', inInitialUnit: '만', inBase: '기본 투입 비중', inStep: '단계 폭 (기준 지수)', inUnit: '조정 단위 (비중)', inRange: '운용 구간',
    money: '골드', manwon: '만 골드',
    wayRule: '규칙 운용', wayHold: (w) => `${w}% 고정 투입`, wayHold100: '100% 고정 투입',
    sumHead: ['방식', '최종 골드', '총 성장률', '연평균 성장률', '최대 하락폭', '조정 횟수'],
    tradeHead: ['시점', '이벤트', '기준 지수', '하락폭', '조정 골드', '조정 뒤 비중', '총 골드'],
    buy: '투입', sell: '회수',
    period: (a, b, fee) => `${a} ~ ${b} · 조정은 2배 자원 기준 · 비용 ${fee}%`,
    stepLabel: (l) => l.replaceAll('급락', '하락 이벤트').replaceAll('급등', '상승 이벤트').replace('새 고점', '최고점 갱신'),
    secCompare: '1. 곡선 비교', secSummary: '1. 운용 결과 요약', secChart: '2. 골드 성장 곡선', secTrades: '3. 조정 기록',
  },
};
export const T = GAME ? TEXT.game : TEXT.normal;

// 게임 모드에서 날짜 대신 쓰는 경과 일수의 기준일(자료 첫날)
let origin = null;
export function setOrigin(d) { origin = d; }
export function dayLabel(d) {
  if (!GAME || !origin || !d) return d;
  return `D+${daysBetween(origin, d)}`;
}

// 시세 이름: 게임 모드는 지표 A ~ R (목록 순서)
export function seriesName(s, index) {
  return GAME ? `지표 ${String.fromCharCode('A'.charCodeAt(0) + index)}` : s.name;
}

// 차트에 덧붙이는 옵션
export function chartSkin(LWC, timeToStr) {
  if (!GAME) return {};
  const fmt = (t) => dayLabel(timeToStr(t));
  return {
    layout: { attributionLogo: false },
    grid: { vertLines: { color: '#e3e7ef', style: LWC.LineStyle.Dotted }, horzLines: { color: '#e3e7ef', style: LWC.LineStyle.Dotted } },
    crosshair: { mode: 0, horzLine: { labelVisible: false } },
    localization: { timeFormatter: fmt },
    timeScale: { tickMarkFormatter: (t) => fmt(t) },
  };
}
export const LINE_TYPE = (LWC) => (GAME ? LWC.LineType.Curved : LWC.LineType.Simple);

// 얕은 합치기(차트 옵션 두 단계까지)
export function merge(base, add) {
  const out = { ...base };
  for (const k of Object.keys(add)) {
    out[k] = add[k] && typeof add[k] === 'object' && !Array.isArray(add[k]) && typeof add[k] !== 'function'
      ? { ...(base[k] || {}), ...add[k] }
      : add[k];
  }
  return out;
}
