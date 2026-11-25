// 주식 뷰 · 시뮬레이터 시험. 실행: node apps/stock-lab/tests/run-node.js
import { simulate, alignDays, summarize, sliceDays } from '../src/core/simulate.js';
import { resample, unionDates, fillForward, indexAtOrBefore, baseValue } from '../src/core/resample.js';
import { SERIES } from '../src/data/series.js';

let pass = 0;
let fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; } else { fail++; console.log(`실패 ${name} ${detail}`); }
}
const eq = (a, b, name) => ok(Math.abs(a - b) < 1e-6, name, `기대 ${b} 실제 ${a}`);

// 가짜 시세: 코스피와 레버리지 가격을 같은 값으로 두어 손 계산을 쉽게 한다.
function days(kospi, lev = kospi) {
  return kospi.map((k, i) => [`2020-01-${String(i + 1).padStart(2, '0')}`, k, lev[i]]);
}
const OPT = { initial: 1000000, baseWeight: 0.8, step: 0.1, unit: 0.1, fee: 0 };

// 1. 낙폭 단계 전부 밟기: 100 → 90(-10%) → 80(-20%) → 70(-30%) → 60(-40%)
{
  const r = simulate(days([100, 90, 80, 70, 60]), OPT);
  const labels = r.trades.map((t) => t.label);
  ok(JSON.stringify(labels) === JSON.stringify(['시작', '급락 1', '급락 2', '급락 3', '급락 4']), '1 단계 순서', JSON.stringify(labels));
  // 시작: 80만원 / 100 = 8000주, 현금 20만
  eq(r.trades[0].qty, 8000, '1 시작 수량');
  // 90일 때 총 = 200000 + 8000*90 = 920000, 목표 0.9 → 828000 → 9200주, +1200주, 현금 92000
  eq(r.trades[1].qty, 1200, '1 급락1 수량');
  // 80일 때 총 = 92000 + 9200*80 = 828000, 목표 1.0 → 828000/80 = 10350주, +1150주, 현금 0
  eq(r.trades[2].qty, 1150, '1 급락2 수량');
  // 70일 때 총 = 10350*70 = 724500, 목표 0.9 → 652050 → 주식 가치 724500-652050=72450 매도 → 1035주
  eq(r.trades[3].qty, -1035, '1 급락3 손절 수량');
  // 현금 72450, 주식 9315주. 60일 때 총 = 72450 + 9315*60 = 631350, 목표 1.0 → 현금 72450/60 = 1207.5 → 1207주
  eq(r.trades[4].qty, 1207, '1 급락4 수량');
  eq(r.daily[4][1], 631350, '1 마지막 총자산');
  eq(r.summary.tradeCount, 5, '1 매매 횟수');
  eq(r.summary.mdd, 631350 / 1000000 - 1, '1 최대 낙폭');
}

// 2. 반등 매도: 100 → 90(급락1, 90%) → 99(저점 90 대비 +10%, 급등1 → 80%) → 98 → 99.5(고점 아래, 매매 없음)
{
  const r = simulate(days([100, 90, 99, 98, 99.5]), OPT);
  const labels = r.trades.map((t) => t.label);
  ok(JSON.stringify(labels) === JSON.stringify(['시작', '급락 1', '급등 1']), '2 단계 순서', JSON.stringify(labels));
  // 99일 때: 현금 92000, 9200주 → 총 92000 + 910800 = 1002800, 목표 0.8 → 802240, 주식 910800 → 108560 매도 → 1096주(floor 1096.56)
  eq(r.trades[2].qty, -1096, '2 급등1 수량');
  eq(r.trades[2].target, 0.8, '2 급등1 목표는 기본 비중');
}

// 2-2. 반등 매도 하한: 100 → 82(급락1, 90%) → 90.2(저점 82 대비 +10%, 급등1 → 80%) → 98.4(+20%, 기본 비중 80% 아래로 안 가 매매 없음)
{
  const r = simulate(days([100, 82, 90.2, 98.4]), OPT);
  const labels = r.trades.map((t) => t.label);
  ok(JSON.stringify(labels) === JSON.stringify(['시작', '급락 1', '급등 1']), '2-2 하한에서 급등2 매매 없음', JSON.stringify(labels));
  eq(r.trades[r.trades.length - 1].target, 0.8, '2-2 목표 비중 80% 유지');
}

// 3. 반등 두 번: 100 → 80(급락1·2 같은 날, 100%) → 88(+10% 급등1 → 90%) → 96(+20% 급등2 → 80%)
{
  const r = simulate(days([100, 80, 88, 96]), OPT);
  const labels = r.trades.map((t) => t.label);
  ok(JSON.stringify(labels) === JSON.stringify(['시작', '급락 1 · 급락 2', '급등 1', '급등 2']), '3 단계 순서', JSON.stringify(labels));
  eq(r.trades[1].target, 1, '3 하루 두 단계 목표 100%');
  eq(r.trades[3].target, 0.8, '3 급등2 뒤 80%');
}

// 4. 새 고점 되돌림: 100 → 90(90%) → 101(새 고점 → 80%) → 102(새 고점, 이미 80%라 매매 없음)
{
  const r = simulate(days([100, 90, 101, 102]), OPT);
  const labels = r.trades.map((t) => t.label);
  ok(JSON.stringify(labels) === JSON.stringify(['시작', '급락 1', '새 고점']), '4 단계 순서', JSON.stringify(labels));
  eq(r.trades[2].target, 0.8, '4 새 고점 목표');
}

// 5. 한 구간에 단계는 한 번: 100 → 90(급락1) → 95 → 89 (다시 -10% 근처, 매매 없음)
{
  const r = simulate(days([100, 90, 95, 89]), OPT);
  eq(r.trades.length, 2, '5 다시 빠져도 매매 없음');
}

// 6. 단계 폭 5% · 매매 단위 5%
{
  const r = simulate(days([100, 95, 90, 85, 80]), { ...OPT, step: 0.05, unit: 0.05 });
  const t = r.trades.map((x) => Math.round(x.target * 100));
  ok(JSON.stringify(t) === JSON.stringify([80, 85, 90, 85, 90]), '6 5% 목표 비중', JSON.stringify(t));
}

// 7. 들고 있기(매매 없음)
{
  const r = simulate(days([100, 50, 200]), { ...OPT, ladder: false });
  eq(r.trades.length, 1, '7 들고 있기 매매 1회');
  eq(r.daily[2][1], 200000 + 8000 * 200, '7 들고 있기 최종');
}

// 8. 수수료: 0.1%면 시작 수량이 줄고 현금에서 수수료가 빠진다
{
  const r = simulate(days([100, 100]), { ...OPT, fee: 0.001 });
  // 800000 / (100*1.001) = 7992.0 → 7992주, 비용 799200 + 799.2
  eq(r.trades[0].qty, 7992, '8 수수료 반영 수량');
  eq(r.daily[1][1], 1000000 - 799.2, '8 수수료만큼 총자산 감소');
}

// 9. 코스피와 레버리지 날짜 맞추기
{
  const a = alignDays([['2020-01-01', 1], ['2020-01-02', 2], ['2020-01-03', 3]], [['2020-01-02', 20], ['2020-01-03', 30], ['2020-01-04', 40]]);
  ok(JSON.stringify(a) === JSON.stringify([['2020-01-02', 2, 20], ['2020-01-03', 3, 30]]), '9 날짜 교집합');
}

// 10. 연평균 수익률
{
  const s = summarize([['2020-01-01', 100], ['2022-01-01', 121]], [], 100);
  ok(Math.abs(s.cagr - 0.1) < 0.001, '10 연평균 2년 21% ≈ 10%', String(s.cagr));
}

// 11. 주 · 월 묶기
{
  const rows = [['2026-11-02', 1], ['2026-11-03', 2], ['2026-11-06', 3], ['2026-11-09', 4], ['2026-11-30', 5], ['2026-12-01', 6]];
  // 주간: 11-02~11-06 주는 마지막 값 3을 월요일 11-02에, 11-30(월)~12-01(화) 주는 마지막 값 6을 11-30에
  const w = resample(rows, 'week');
  ok(JSON.stringify(w) === JSON.stringify([['2026-11-02', 3], ['2026-11-09', 4], ['2026-11-30', 6]]), '11 주간 마지막 거래일 값 · 월요일 자리', JSON.stringify(w));
  const m = resample(rows, 'month');
  ok(JSON.stringify(m) === JSON.stringify([['2026-11-01', 5], ['2026-12-01', 6]]), '11 월간 마지막 거래일 값 · 1일 자리', JSON.stringify(m));
  ok(resample(rows, 'day') === rows, '11 일간 그대로');
}

// 12. 날짜 찾기 · 기준 값
{
  const rows = [['2026-01-02', 10], ['2026-01-05', 20], ['2026-01-06', 30]];
  eq(indexAtOrBefore(rows, '2026-01-04'), 0, '12 이전 값 위치');
  eq(indexAtOrBefore(rows, '2026-01-01'), -1, '12 앞에 없음');
  eq(baseValue(rows, '2026-01-05'), 20, '12 같은 날 기준');
  eq(baseValue(rows, '2026-01-03'), 20, '12 첫날 값 없으면 그 뒤 첫 값');
  ok(JSON.stringify(unionDates([rows, [['2026-01-03', 1]]])) === JSON.stringify(['2026-01-02', '2026-01-03', '2026-01-05', '2026-01-06']), '12 날짜 합집합');
}

// 12-2. 쉬는 날 이어 그리기: 자기 첫날 앞과 마지막 날 뒤는 채우지 않는다
{
  const rows = [['2026-01-05', 10], ['2026-01-07', 30]];
  const dates = ['2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'];
  ok(JSON.stringify(fillForward(rows, dates)) === JSON.stringify([['2026-01-05', 10], ['2026-01-06', 10], ['2026-01-07', 30]]), '12-2 직전 값 채움', JSON.stringify(fillForward(rows, dates)));
}

// 13. 시세 목록 18개, 이름 · 색 중복 없음(같은 색은 선 모양으로 갈림)
{
  ok(SERIES.length === 18, '13 시세 18개');
  ok(new Set(SERIES.map((s) => s.id)).size === 18, '13 id 중복 없음');
  const keys = SERIES.filter((s) => s.kind === 'price').map((s) => s.color + s.dash);
  ok(new Set(keys).size === keys.length, '13 가격 시세 색·선 모양 겹침 없음');
}

// 14. 기간 자르기: 시작 · 끝 날짜 포함, 빈 값은 그쪽 끝을 자르지 않는다. 시작 날짜가 첫날(매수 · 고점 기준)
{
  const d = days([100, 90, 80, 70, 60]);
  ok(JSON.stringify(sliceDays(d, '2020-01-02', '2020-01-04').map((x) => x[0])) === JSON.stringify(['2020-01-02', '2020-01-03', '2020-01-04']), '14 양끝 포함');
  ok(sliceDays(d, '2020-01-04', '').length === 2, '14 끝 빈 값');
  ok(sliceDays(d, '', '').length === 5, '14 둘 다 빈 값');
  const r = simulate(sliceDays(d, '2020-01-03', ''), OPT);
  ok(r.trades[0].date === '2020-01-03' && r.trades[0].label === '시작', '14 시작 날짜가 첫 매수');
  ok(r.trades.length === 3, '14 고점 80 기준 급락 2번', JSON.stringify(r.trades.map((t) => t.label)));
}

console.log(`통과 ${pass} · 실패 ${fail}`);
if (fail) process.exit(1);
