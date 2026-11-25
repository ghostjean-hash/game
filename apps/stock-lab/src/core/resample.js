// 일 → 주 · 월 묶기와 날짜 찾기. 화면과 분리된 순수 함수.
// rows: [["YYYY-MM-DD", 값], …] 날짜 오름차순.

// 그 날짜가 속한 주의 월요일(UTC 기준 문자열)
function weekKey(d) {
  const t = new Date(d + 'T00:00:00Z');
  const dow = (t.getUTCDay() + 6) % 7; // 월=0 … 일=6
  t.setUTCDate(t.getUTCDate() - dow);
  return t.toISOString().slice(0, 10);
}

// 묶음마다 마지막 거래일 값을 묶음 이름 날짜(keyFn 결과)에 찍는다.
// 날짜를 묶음 이름으로 맞춰야 쉬는 날이 다른 시세(주식 금요일 · 코인 일요일)가 같은 자리에 찍힌다.
function lastOfGroup(rows, keyFn) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const next = rows[i + 1];
    const k = keyFn(rows[i][0]);
    if (!next || keyFn(next[0]) !== k) out.push([k, rows[i][1]]);
  }
  return out;
}

// interval: 'day' | 'week' | 'month'. 주간은 그 주 마지막 거래일 값을 그 주 월요일에,
// 월간은 그 달 마지막 거래일 값을 그 달 1일에 찍는다.
export function resample(rows, interval) {
  if (interval === 'week') return lastOfGroup(rows, weekKey);
  if (interval === 'month') return lastOfGroup(rows, (d) => d.slice(0, 7) + '-01');
  return rows;
}

// 여러 시세의 날짜 합집합(오름차순)
export function unionDates(list) {
  const s = new Set();
  for (const rows of list) for (const [d] of rows) s.add(d);
  return [...s].sort();
}

// 쉬는 날 이어 그리기: 시세의 첫날 ~ 마지막 날 사이 합집합 날짜 중 값이 없는 날은 직전 거래일 값으로 채운다.
// dates 는 unionDates 결과(오름차순).
export function fillForward(rows, dates) {
  if (!rows.length) return [];
  const first = rows[0][0];
  const last = rows[rows.length - 1][0];
  const out = [];
  let j = 0;
  let v = rows[0][1];
  for (const d of dates) {
    if (d < first) continue;
    if (d > last) break;
    while (j < rows.length && rows[j][0] <= d) { v = rows[j][1]; j++; }
    out.push([d, v]);
  }
  return out;
}

// 그 날짜이거나 그 이전 가장 가까운 값의 위치. 없으면 -1.
export function indexAtOrBefore(rows, d) {
  let lo = 0;
  let hi = rows.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][0] <= d) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

// 보이는 구간 첫날 기준 등락률. 시세가 그 첫날보다 늦게 시작하면 자기 첫 값이 기준이다.
export function baseValue(rows, fromDate) {
  if (!rows.length) return null;
  const i = indexAtOrBefore(rows, fromDate);
  if (i >= 0 && rows[i][0] === fromDate) return rows[i][1];
  // 첫날 값이 없으면 그 뒤 첫 값(차트의 등락률 눈금과 같은 기준)
  const j = i + 1;
  return j < rows.length ? rows[j][1] : rows[rows.length - 1][1];
}
