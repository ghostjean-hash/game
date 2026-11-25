// 전략 실험실 시험(기획서 5.6.5). run-node.js 가 불러 돌린다. 손 계산은 각 사례 주석에.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prepare } from '../src/core/indicators.js';
import { runStrategy, summarizeRun } from '../src/core/engine.js';
import { FRAMES, signal } from '../src/core/frames.js';
import { yearTable, ranks, yearRanges } from '../src/core/stats.js';
import { simulate, alignDays, sliceDays } from '../src/core/simulate.js';
import { PRESETS, PARAM_META } from '../src/data/strategies.js';

export function runLab(ok, eq) {
  const P = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
  // 평일 날짜를 차례로 만든다
  function dates(n, start = '2020-01-06') {
    const out = [];
    const d = new Date(start + 'T00:00:00Z');
    while (out.length < n) {
      const w = d.getUTCDay();
      if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }
  const mk = (ks, ds = dates(ks.length), ps = ks) => prepare(ks.map((k, i) => [ds[i], k, ps[i]]));
  const run = (ind, id, params, opt = {}) => runStrategy(ind, 0, ind.n - 1, P[id], { ...P[id].params, ...params }, { initial: 1e6, fee: 0, nextDay: false, ...opt });
  const filled = (r) => r.trades.filter((t) => t.status === 'filled');
  const qtys = (r) => filled(r).map((t) => t.qty);
  const J = (v) => JSON.stringify(v);

  // L1. 지표 - 단순 평균 · 2일 RSI · 표준편차 · 월말
  {
    const ind = mk([10, 12, 11, 13, 14]);
    eq(ind.sma(3)[4], (11 + 13 + 14) / 3, 'L1 단순 평균');
    // i1 첫 값 ag=2 al=0, i2 변화 -1: ag=(2+0)/2=1, al=(0+1)/2=0.5 → 100*1/1.5
    eq(ind.rsi[2], 100 / 1.5, 'L1 2일 RSI');
    const s = mk([100, 110, 99]).kStd(2)[2];
    eq(s, Math.sqrt(((0.1 - 0) ** 2 + (-0.1 - 0) ** 2) / 1), 'L1 표준편차(표본)');
    const m = mk([1, 2, 3, 4], ['2020-01-30', '2020-01-31', '2020-02-03', '2020-02-04']);
    ok(J(m.monthEnd) === J([false, true, false, false]), 'L1 월말 - 마지막 날은 표시 안 함', J(m.monthEnd));
    ok(J(m.monthFirst) === J([false, false, true, false]), 'L1 월초');
  }

  // L2. 엔진 - 비용 · 다음 날 체결 · 마지막 날 주문 버림 · 매도 먼저 · 현금 부족
  {
    FRAMES.__t = {
      start() {},
      day(c, p) {
        if (c.i === p.at) { c.buyWon(p.won, '사기', 't'); if (p.alsoSell) c.sellQty(1, '팔기'); }
      },
    };
    const T = { frame: '__t' };
    const ind = mk([100, 100, 125, 125]);
    const same = runStrategy(ind, 0, 3, T, { at: 1, won: 500000 }, { initial: 1e6, fee: 0, nextDay: false });
    eq(same.trades[0].qty, 5000, 'L2 같은 날 100원에 5000주');
    const next = runStrategy(ind, 0, 3, T, { at: 1, won: 500000 }, { initial: 1e6, fee: 0, nextDay: true });
    eq(next.trades[0].qty, 4000, 'L2 다음 날 125원에 4000주');
    ok(next.trades[0].date === ind.date[2], 'L2 다음 날 날짜');
    const last = runStrategy(ind, 0, 3, T, { at: 3, won: 500000 }, { initial: 1e6, fee: 0, nextDay: true });
    eq(last.trades.length, 0, 'L2 마지막 날 낸 주문은 버림');
    const fee = runStrategy(ind, 0, 3, T, { at: 1, won: 1e6 }, { initial: 1e6, fee: 0.001, nextDay: false });
    eq(fee.trades[0].qty, 9990, 'L2 비용 0.1% → 1e6/(100*1.001)=9990.0 → 9990주');
    const order = runStrategy(ind, 0, 3, T, { at: 1, won: 50, alsoSell: true }, { initial: 1e6, fee: 0, nextDay: false });
    ok(order.trades[0].reason.startsWith('팔기') && order.trades[1].reason.startsWith('사기'), 'L2 매도 먼저', J(order.trades.map((t) => t.reason)));
    ok(order.trades[0].status === 'noshares' && order.trades[1].status === 'nocash', 'L2 팔 주식 없음 · 현금 부족(50원으로 1주 못 삼)');
    eq(order.summary.tradeCount, 0, 'L2 미체결은 매매 횟수에 안 넣음');
    delete FRAMES.__t;
  }

  // L3. 요약 - 회복 기간 · 미회복 일수 · 고점 이후 반납
  {
    const d = (vals) => vals.map((v, i) => [`2020-01-0${i + 1}`, v, 1]);
    const a = summarizeRun(d([100, 120, 90, 110, 125]), [], 100);
    eq(a.mdd, 90 / 120 - 1, 'L3 최대 낙폭');
    eq(a.recovery, 2, 'L3 바닥(3번째)에서 120 넘는 5번째까지 2일');
    eq(a.unrecovered, 0, 'L3 마지막이 고점이면 미회복 0');
    const b = summarizeRun(d([100, 120, 90, 110]), [], 100);
    ok(b.recovery === null, 'L3 미회복');
    eq(b.unrecovered, 2, 'L3 고점 뒤 2일');
    eq(b.giveBack, 10, 'L3 반납 금액');
    eq(b.giveBackPct, 110 / 120 - 1, 'L3 반납 비율');
  }

  // L4. 사용자 원안 - 다섯 상태 전이(손 계산)
  // 시작 100: 8000주, 현금 200000
  // 94(-6%) 평상→1차: 100000/94=1063주, 현금 100078
  // 88.3(-6.06%) 1차→2차: 100078/88.3=1133주, 현금 34.1, 기준 88.3
  // 87(-1.5%) 아무것도 없음. 83.8(-3.7%, 88.3*0.95=83.885 이하) 누적 하락 손절 10196*0.1=1019주
  // 78(-6.9%) 손절→재매수: 현금 85426.3*0.5/78=547주. 83(+6.4%) 재매수→손절: 547주 매도
  // 88(+6.0%) 손절→평상: 보유 9177*0.1=917주 매도
  {
    const ind = mk([100, 94, 88.3, 87, 83.8, 78, 83, 88]);
    const r = run(ind, 'user-A', {});
    ok(J(qtys(r)) === J([8000, 1063, 1133, -1019, 547, -547, -917]), 'L4 수량', J(qtys(r)));
    ok(J(filled(r).map((t) => t.reason)) === J(['시작', '급락 매수 1', '급락 매수 2', '누적 하락 손절', '손절 뒤 급락 - 재매수', '재매수분 매도', '손절 뒤 급등 - 더 매도']), 'L4 이유 순서', J(filled(r).map((t) => t.reason)));
    eq(r.trades[r.trades.length - 1].cash, 168857.3, 'L4 마지막 현금');
    // 1차 뒤 급등: 99.5(+5.85%) 추가로 산 1063주 매도 / 금액판: 99922/99.5=1004주
    const up = run(mk([100, 94, 99.5]), 'user-A', {});
    eq(qtys(up)[2], -1063, 'L4 급등 - 산 주식 수만큼');
    const won = run(mk([100, 94, 99.5]), 'user-A', { resell: 'won' });
    eq(qtys(won)[2], -1004, 'L4 급등 - 넣은 금액만큼');
    // 다음 날 체결: 94에서 판정, 95에 체결 → 100000/95=1052주
    const nx = run(mk([100, 94, 95]), 'user-A', {}, { nextDay: true });
    eq(qtys(nx)[1], 1052, 'L4 다음 날 체결 수량');
    // 같은 날 매수 · 매도 조건이 함께 맞는 상태(2차 매수)에서 급락 = 손절(매도)
    const both = run(mk([100, 94, 88.3, 83]), 'user-A', {});
    ok(filled(both)[3].reason === '급락 손절', 'L4 2차 매수 뒤 급락은 손절', filled(both)[3]?.reason);
  }

  // L5. 시장 상태 - 짧은 평균 2일 · 긴 평균 3일
  // 12: 11.5 > 11 → 상승장 90% → 1e6*0.9/12 = 75000주
  // 9: 짧은 11, 긴 11.33 → 하락장, 9 <= 11*0.9 → 강한 하락장 40%: 총 775000 → 310000 → (675000-310000)/9=40555주 매도
  {
    const r = run(mk([10, 11, 12, 13, 9]), 'regime', { maShort: 2, maLong: 3 });
    ok(J(qtys(r)) === J([75000, -40555]), 'L5 수량', J(qtys(r)));
    ok(filled(r)[1].reason.includes('강한 하락장'), 'L5 강한 하락장');
  }

  // L6. 반등 확인 후 매수
  // 94 급락 → 기다림, 최저 93. 94.9 >= 93*1.02 → 100000/94.9=1053주. 96.8 >= 93*1.04 → 100070.3/96.8=1033주
  // 99.7 >= 94.9*1.05=99.645 → 1차 묶음 1053주 매도
  {
    const r = run(mk([100, 94, 93, 94.9, 96.8, 99.7]), 'rebound', {});
    ok(J(qtys(r)) === J([8000, 1053, 1033, -1053]), 'L6 수량', J(qtys(r)));
  }

  // L7. 200일선 띠(3일 · ±1%): 10.2 > 10.067*1.01 → 매수 98039주, 9 < 9.8*0.99 → 매도
  {
    const r = run(mk([10, 10, 10, 10.2, 10.2, 9]), 'siegel', { maLen: 3 });
    ok(J(qtys(r)) === J([98039, -98039]), 'L7 수량', J(qtys(r)));
  }

  // L8. 10개월선(2개월) · 절대 모멘텀(1개월) - 월말에만 판정
  {
    const ds = ['2020-01-30', '2020-01-31', '2020-02-03', '2020-02-28', '2020-03-02', '2020-03-31', '2020-04-01'];
    const ks = [10, 10, 11, 12, 12, 9, 9];
    const f = run(mk(ks, ds), 'faber', { months: 2 });
    ok(J(filled(f).map((t) => t.date)) === J(['2020-02-28', '2020-03-31']), 'L8 10개월선 월말 매수 · 매도', J(filled(f).map((t) => t.date)));
    const a = run(mk(ks, ds), 'absmom', { lookback: 1 });
    ok(J(filled(a).map((t) => t.date)) === J(['2020-02-28', '2020-03-31']), 'L8 절대 모멘텀', J(filled(a).map((t) => t.date)));
  }

  // L9. 변동성 맞추기(2일): 월초 2020-02-03 에 비중 = 0.3 / (표준편차 × √252)
  {
    const ds = ['2020-01-30', '2020-01-31', '2020-02-03'];
    const r = run(mk([100, 110, 100], ds), 'voltarget', { volDays: 2 });
    const r1 = 0.1;
    const r2 = 100 / 110 - 1;
    const m = (r1 + r2) / 2;
    const vol = Math.sqrt(((r1 - m) ** 2 + (r2 - m) ** 2) / 1) * Math.sqrt(252);
    const w = 0.3 / vol;
    eq(qtys(r)[0], Math.floor((1e6 * w) / 100), 'L9 월초 비중 매수');
  }

  // L10. 리밸런싱: 150 에서 비중 85.7% > 80+5 → 매도 (1200000-1120000)/150=533주. 130 은 83.9% 라 그대로
  {
    eq(qtys(run(mk([100, 150]), 'rebal-band', {}))[1], -533, 'L10 밴드 넘음 매도');
    eq(qtys(run(mk([100, 130]), 'rebal-band', {})).length, 1, 'L10 밴드 안 그대로');
    const y = run(mk([100, 150, 150], ['2020-12-30', '2020-12-31', '2021-01-04']), 'rebal-year', {});
    ok(filled(y)[1]?.date === '2021-01-04', 'L10 연 1회는 해 첫 거래일에만', J(filled(y).map((t) => t.date)));
  }

  // L11. 트레일링: 110 고점에서 99(-10%) 매도, 최저 95 에서 104.5(+10%) 재매수
  {
    const r = run(mk([100, 110, 99, 95, 104.5]), 'trailing', {});
    ok(J(filled(r).map((t) => t.date)) === J([0, 2, 4].map((i) => dates(5)[i])), 'L11 매도 · 재매수 날짜', J(filled(r).map((t) => t.date)));
  }

  // L12. 6Sig: 50:50 시작 5000주. 3월 말 신호선 530000 > 500000 → 300주 매수
  // 6월 말 60(2년 분기 말 최고 100 대비 -40%) → 30 down 시작, 신호선 561800 - 318000 = 243800 → 4063주 매수
  // 9월 말 90: 주식 842670 > 신호선 595486.8 → 30 down 이라 매도 건너뜀
  {
    const ds = ['2020-03-30', '2020-03-31', '2020-06-30', '2020-09-30', '2020-10-01'];
    const r = run(mk([100, 100, 60, 90, 90], ds), 'sig6', {});
    ok(J(qtys(r)) === J([5000, 300, 4063]), 'L12 6Sig 수량', J(qtys(r)));
    ok(r.trades.some((t) => t.reason.startsWith('30 down 시작')) && r.trades.some((t) => t.reason.includes('건너뜀')), 'L12 30 down 시작 · 건너뜀');
    // 3Sig: 현금 30% 이상이면 80:20 으로 되돌림. 첫 분기 주식이 반토막 나 현금 비중이 오른다
    const s3 = run(mk([100, 50, 50, 50, 50], ds), 'sig3', {});
    ok(filled(s3).some((t) => t.reason.startsWith('현금')), 'L12 3Sig 현금 상한 되돌림', J(filled(s3).map((t) => t.reason)));
  }

  // L13. RSI(2): 8번 연속 하락 뒤 RSI 3.8 → 20% 몫 200000/132=1515주, 다음 날 5일 평균 위 → 매도
  {
    const ks = [100, 110, 120, 130, 140, 139, 138, 137, 136, 135, 134, 133, 132, 140];
    const r = run(mk(ks), 'rsi2', { maLen: 13 });
    ok(J(qtys(r)) === J([8000, 1515, -1515]), 'L13 수량', J(qtys(r)));
  }

  // L14. Double 7s(3일 · 평균 6일): 12 = 3일 최저이고 평균 11.75 위 → 매수, 12.6 = 3일 최고 → 매도
  {
    const r = run(mk([10, 11, 12, 13, 12.5, 12, 12.6]), 'double7', { maLen: 6, window: 3 });
    ok(J(qtys(r)) === J([80000, 16666, -16666]), 'L14 수량', J(qtys(r)));
  }

  // L15. R3: 첫 매수 날 = 규칙을 처음 만족하는 날(지표 표로 따로 찾아 맞댐)
  {
    const ks = [100, 110, 120, 130, 140, 150, 145, 141, 138, 136, 150];
    const ind = mk(ks);
    const r = run(ind, 'r3', { maLen: 3 });
    const rs = ind.rsi;
    let want = null;
    for (let i = 4; i < ks.length && want === null; i++) {
      if (rs[i] < rs[i - 1] && rs[i - 1] < rs[i - 2] && rs[i - 2] < rs[i - 3] && rs[i - 2] < 60 && rs[i] < 10 && ks[i] > ind.sma(3)[i]) want = i;
    }
    const got = filled(r).find((t) => t.reason.startsWith('R3'));
    ok((want === null && !got) || (got && got.date === ind.date[want]), 'L15 R3 매수 날', `기대 ${want} 실제 ${got?.date}`);
  }

  // L16. 그리드(5% · 2칸): 95 에서 1칸 100000/95=1052주, 90 에서 2칸 1111주,
  // 94.8 >= 90.25*1.05 → 2칸 매도, 99.8 >= 95*1.05 → 1칸 매도, 105 → 기준가 105 로, 99.75 → 새 1칸 매수
  {
    const r = run(mk([100, 95, 90, 94.8, 99.8, 105, 99.75]), 'grid', { levels: 2 });
    ok(J(qtys(r)) === J([8000, 1052, 1111, -1111, -1052, Math.floor(100000 / 99.75)]), 'L16 수량', J(qtys(r)));
  }

  // L17. 무한매수법(4분할 → 1회분 = 1e6 × 20% ÷ 4 = 50000)
  // 첫날 80% 와 1회분을 100 에 산다(500주). 다음 날 종가가 99 면 평단(100) 지정가 · 별% 지정가 둘 다 체결, 105 면 별% 지정가만 체결.
  // 주문 가격은 전날 평단으로 정해지므로 그날 종가를 바꿔도 지정가는 같다.
  {
    const a = run(mk([100, 99]), 'infinite', { splits: 4 });
    const b = run(mk([100, 105]), 'infinite', { splits: 4 });
    ok(J(qtys(a).slice(0, 2)) === J([8000, 500]), 'L17 첫날 80% 와 1회분', J(qtys(a)));
    const buysA = filled(a).filter((t) => t.qty > 0 && t.date === dates(2)[1]).length;
    const buysB = filled(b).filter((t) => t.qty > 0 && t.date === dates(2)[1]).length;
    ok(buysA === 2 && buysB === 1, 'L17 지정가는 전날 평단 기준', `A ${buysA} B ${buysB}`);
    // 평단 지정가 줄의 기준 가격이 그날 종가와 상관없이 전날 평단(100)인지: 100.0001 이면 못 사고 99.9999 면 산다
    const hi = run(mk([100, 100.0001]), 'infinite', { splits: 4 });
    const lo = run(mk([100, 99.9999]), 'infinite', { splits: 4 });
    const avgLine = (r) => r.trades.find((t) => t.date === dates(2)[1] && t.reason.startsWith('평단'));
    ok(avgLine(hi)?.status === 'nolimit' && avgLine(lo)?.status === 'filled', 'L17 평단 지정가 = 전날 평단 100');
    // 크게 오르면 1/4 · 3/4 모두 팔려 다음 날 처음부터 다시 1회분을 산다
    const c = run(mk([100, 111, 111]), 'infinite', { splits: 4 });
    const day1 = filled(c).filter((t) => t.date === dates(3)[1]);
    ok(day1.length === 2 && day1.every((t) => t.qty < 0), 'L17 전량 매도', J(day1.map((t) => t.reason)));
    ok(filled(c).some((t) => t.date === dates(3)[2] && t.reason.includes('새로 시작')), 'L17 전량 매도 뒤 다시 시작');
    // 계속 빠지면 T 가 분할 수 - 1 을 넘어 쿼터손절
    const d = run(mk([100, 98, 96, 94, 92, 90, 88]), 'infinite', { splits: 4 });
    ok(filled(d).some((t) => t.reason.includes('쿼터손절 1/4')), 'L17 쿼터손절 진입', J(filled(d).map((t) => t.reason)));
  }

  // L18. 장중 급락 판정: 저가가 전날 종가보다 5% 낮으면 급락, 고가 · 저가 둘 다 5% 넘으면 판정 안 함
  {
    const ds = dates(3);
    const kb = new Map([[ds[1], [100, 101, 94.9, 99]], [ds[2], [99, 105, 93, 99]]]);
    const ind = prepare([[ds[0], 100, 100], [ds[1], 99, 99], [ds[2], 99, 99]], { kospi: kb });
    const p = { def: 'I', width: 0.05 };
    ok(signal(ind, 1, p, {}).down === true, 'L18 장중 저가 -5.1% 급락');
    const s2 = signal(ind, 2, p, {});
    ok(!s2.down && !s2.up, 'L18 같은 날 둘 다면 판정 안 함');
    // 2일 정의는 신호 다음 날부터 2거래일 쉬기: 2번째 날 신호 → 3 · 4번째 날 쉼 → 5번째 날(85/93 = -8.6%) 다시 신호
    const ind2 = mk([100, 98, 94, 93, 88, 85]);
    const mem = {};
    const got = [1, 2, 3, 4, 5].map((i) => signal(ind2, i, { def: 'B', width: 0.05 }, mem).down);
    ok(J(got) === J([false, true, false, false, true]), 'L18 B 정의 쉬는 기간', J(got));
  }

  // L19. 낙폭 사다리 틀 = 옛 simulate(같은 날 체결) - 실제 2026 자료
  {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const rd = (f) => JSON.parse(fs.readFileSync(path.join(here, '..', 'data', f), 'utf8')).rows;
    const all = alignDays(rd('kospi.json'), rd('kodexlev.json'));
    const sl = sliceDays(all, '2026-01-02', '');
    const old = simulate(sl, { initial: 1e8, baseWeight: 0.8, step: 0.1, unit: 0.1, fee: 0.00015 });
    const ind = prepare(all);
    const a = ind.date.indexOf(sl[0][0]);
    const nw = runStrategy(ind, a, ind.n - 1, P.ladder, P.ladder.params, { initial: 1e8, fee: 0.00015, nextDay: false });
    ok(J(old.trades.filter((t) => t.qty !== 0).map((t) => [t.date, t.qty])) === J(filled(nw).map((t) => [t.date, t.qty])), 'L19 매매 기록 일치');
    ok(old.daily.every((d, i) => Math.abs(d[1] - nw.daily[i][1]) < 1e-6), 'L19 날짜별 자산 일치');
  }

  // L20. 통계 - 순위 · 이긴 해 · 평균 순위
  {
    const s = (ret) => ({ summary: { totalReturn: ret, mdd: -0.1 } });
    const byYear = { 2023: { hold100: s(0.1), hold80: s(0.05), x: s(0.2) }, 2024: { hold100: s(0.3), hold80: s(0.2), x: s(0.25) } };
    const rk = ranks(byYear[2023], ['hold100', 'hold80', 'x']);
    ok(rk.x === 1 && rk.hold100 === 2, 'L20 순위');
    const row = yearTable(byYear, {}, ['hold100', 'hold80', 'x']).find((r) => r.id === 'x');
    ok(row.win80 === 2 && row.win100 === 1, 'L20 이긴 해 수', J(row));
    eq(row.avgRank, 1.5, 'L20 평균 순위');
    eq(row.avgRet, 0.225, 'L20 평균 수익');
    // 연도 구간: 자료 안의 2023 · 2024 해만, 첫 · 마지막 거래일
    const yi = mk([1, 2, 3, 4], ['2023-12-28', '2023-12-29', '2024-01-02', '2024-01-03']);
    const yr = yearRanges(yi);
    ok(J(yr.map((x) => [x.key, x.range])) === J([['2023', [0, 1]], ['2024', [2, 3]]]), 'L20 연도 구간', J(yr));
  }

  // L21. 미체결 · 체결 기다리기 · 지정가 안 닿음
  {
    // 기본 비중 100% 라 현금 0: 급락 매수가 현금 부족으로 미체결 → 상태는 평상 그대로라 다음 급등에 팔지 않는다(1차 매수 상태면 '추가로 산 만큼 매도' 줄이 생김)
    const r = run(mk([100, 94, 99.5]), 'user-A', { base: 1 });
    ok(r.trades.some((t) => t.status === 'nocash') && !r.trades.some((t) => t.reason.startsWith('급등')), 'L21 현금 부족 뒤 상태 그대로', J(r.trades.map((t) => t.reason)));
    // 다음 날 체결: 이틀 연속 급락이면 첫 주문은 다음 날 체결되고, 그 뒤에야 2차 매수 주문이 나가 그다음 날 체결
    const nx = run(mk([100, 94, 88.3, 88]), 'user-A', {}, { nextDay: true });
    ok(J(filled(nx).map((t) => [t.date, t.reason])) === J([[dates(4)[0], '시작'], [dates(4)[2], '급락 매수 1'], [dates(4)[3], '급락 매수 2']]), 'L21 체결 기다리는 동안 새 주문 없음', J(filled(nx).map((t) => t.reason)));
    // 그리드 다음 날 체결: 95 에서 낸 1칸 매수가 다음 날 120 이면 칸 가격에 안 닿아 미체결
    const g = run(mk([100, 95, 120]), 'grid', {}, { nextDay: true });
    ok(g.trades.some((t) => t.status === 'nolimit' && t.reason.startsWith('그리드 1칸 매수')) && qtys(g).length === 1, 'L21 그리드 지정가 안 닿음', J(g.trades.map((t) => [t.reason, t.status])));
    // 비중 맞추기 주문이 현금이 없어 1주도 못 사면 미체결
    FRAMES.__w = { start(c) { c.buyWon(Infinity, '전액', 't'); }, day(c) { if (c.i === 1) c.setWeight(1.5, '더 사기'); } };
    const w = runStrategy(mk([100, 100]), 0, 1, { frame: '__w' }, {}, { initial: 1e6, fee: 0, nextDay: false });
    ok(w.trades[1]?.status === 'nocash', 'L21 비중 맞추기 현금 부족 미체결', J(w.trades.map((t) => t.status)));
    delete FRAMES.__w;
  }

  // L22. 보유 · 변동성 돌파 · 6Sig 분기 매도 · 4번 건너뛰고 풀림 · R3 실제 매수
  {
    const h = run(mk([100, 50, 200]), 'hold100', {});
    ok(qtys(h).length === 1 && h.daily[2][1] === 1e6 * 2, 'L22 100% 보유 매매 1번 · 최종 2배');
    // 변동성 돌파: 둘째 날 코스피 고가 106 >= 시가 100 + 0.5 × 전날 폭(110 - 90) = 110 아님 → 없음, 셋째 날 고가 112 >= 101 + 0.5 × (106 - 99) = 104.5 → 매수,
    // 산 가격 = 레버리지 시가 50 + 0.5 × (전날 폭 52 - 48) = 52, 넷째 날 시가 55 에 매도
    const ds = dates(4);
    const kb = new Map([[ds[0], [100, 110, 90, 100]], [ds[1], [100, 106, 99, 101]], [ds[2], [101, 112, 100, 110]], [ds[3], [111, 112, 108, 110]]]);
    const lb = new Map([[ds[0], [50, 55, 45, 50]], [ds[1], [50, 52, 48, 51]], [ds[2], [50, 56, 49, 55]], [ds[3], [55, 56, 54, 55]]]);
    const bi = prepare(ds.map((d, i) => [d, [100, 101, 110, 110][i], [50, 51, 55, 55][i]]), { kospi: kb, lev: lb });
    const br = runStrategy(bi, 0, 3, P.breakout, P.breakout.params, { initial: 1e6, fee: 0, nextDay: true });
    const bf = filled(br);
    ok(bf[1]?.date === ds[2] && bf[1].price === 52 && bf[2]?.date === ds[3] && bf[2].price === 55, 'L22 변동성 돌파 매수 · 다음 날 시가 매도', J(bf.map((t) => [t.date, t.qty, t.price])));
    // 6Sig: 분기 말 주식이 신호선을 넘으면 매도. 30 down 은 매도 4번 건너뛰면 풀린다
    const qd = ['2020-03-30', '2020-03-31', '2020-06-30', '2020-09-30', '2020-12-31', '2021-03-31', '2021-06-30', '2021-09-30', '2021-10-01'];
    const sell = run(mk([100, 120, 120, 120, 120, 120, 120, 120, 120], qd), 'sig6', {});
    ok(filled(sell)[1]?.qty < 0, 'L22 6Sig 분기 신호선 초과 매도', J(qtys(sell)));
    const cr = run(mk([100, 100, 60, 70, 80, 90, 100, 110, 110], qd), 'sig6', {});
    const skips = cr.trades.filter((t) => t.reason.includes('건너뜀')).length;
    ok(skips === 4 && cr.trades.some((t) => t.reason === '30 down 풀림'), 'L22 6Sig 4번 건너뛰고 풀림', J(cr.trades.map((t) => t.reason)));
    // R3: 코스피가 20일 평균 위에서 RSI(2) 66.9 → 28.8 → 10.6 → 4.0 → 1.5, 첫 하락 출발 28.8 < 60 → 마지막 날 매수
    const rk = [...Array(15).fill(50), 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 119, 117, 114, 110, 105];
    const r3 = run(mk(rk), 'r3', { maLen: 20 });
    const buy = filled(r3).find((t) => t.reason.startsWith('R3'));
    ok(buy && buy.date === dates(rk.length)[rk.length - 1], 'L22 R3 실제 매수', buy?.date);
  }

  // L23. 같은 날 매도 뒤 매수의 원가 · 돌파 가격 미도달 · 정수 칸
  {
    // 무한매수 4분할: 500주 @100 → 109.5 에서 1/4(125주) 매도 뒤 228주 매수 → 남은 603주 원가 = 37500 + 228 × 109.5 = 62466
    let cost = null;
    const orig = FRAMES.infinite.fill;
    FRAMES.infinite.fill = function (c, p, r) { orig.call(this, c, p, r); cost = c.mem.cost; };
    run(mk([100, 109.5]), 'infinite', { splits: 4 });
    FRAMES.infinite.fill = orig;
    eq(cost, 62466, 'L23 무한매수 같은 날 매도 · 매수 원가');
    // 변동성 돌파: 레버리지 돌파 가격 50 + 0.5 × (60 - 40) = 60 이 그날 고가 51 에 못 닿으면 미체결
    const d2 = dates(2);
    const bi = prepare([[d2[0], 100, 50], [d2[1], 120, 50]], {
      kospi: new Map([[d2[0], [100, 110, 90, 100]], [d2[1], [100, 130, 99, 120]]]),
      lev: new Map([[d2[0], [50, 60, 40, 50]], [d2[1], [50, 51, 49, 50]]]),
    });
    const br = runStrategy(bi, 0, 1, P.breakout, P.breakout.params, { initial: 1e6, fee: 0, nextDay: false });
    ok(br.trades.some((t) => t.status === 'nolimit' && t.reason.startsWith('변동성 돌파')) && qtys(br).length === 1, 'L23 돌파 가격 미도달 미체결', J(br.trades.map((t) => [t.status, t.price])));
    // 기간 · 횟수 · 칸 수 칸은 정수만
    ok(['maLen', 'months', 'splits', 'levels', 'volDays', 'window', 'skipMax'].every((k) => PARAM_META[k].int) && !PARAM_META.width.int, 'L23 정수 칸 표시');
  }
}
