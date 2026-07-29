// 다음 추첨 회차 / 추첨 일시 계산. 결정론(같은 입력 = 같은 출력).
// SSOT: docs/01_spec.md 5.2.2, docs/02_data.md 1.15.
// core/는 DOM/window 일체 사용 안 함.
import {
  DRAW_DAY_OF_WEEK,
  DRAW_HOUR_KST,
  DRAW_MIN_KST,
  DRAW_TZ_OFFSET_MIN,
} from '../data/numbers.js';

const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * 주어진 'YYYY-MM-DD' 추첨일을 KST 카운트다운 타깃 시각(Date)로 변환.
 * 카운트다운 타깃 = 판매 마감 = 20:00 KST (실제 추첨 방송은 20:35지만 사이트는 20:00에 0).
 * 예: '2026-04-25' → 2026-04-25T20:00:00+09:00.
 * @param {string} drwDate
 * @returns {number} epoch ms
 */
export function drawDateToEpochMs(drwDate) {
  // 'YYYY-MM-DDT20:00:00+09:00'을 직접 만들면 호스트 TZ 무관 결정론.
  const hh = String(DRAW_HOUR_KST).padStart(2, '0');
  const mm = String(DRAW_MIN_KST).padStart(2, '0');
  const offHrs = Math.trunc(DRAW_TZ_OFFSET_MIN / 60);
  const offMins = Math.abs(DRAW_TZ_OFFSET_MIN % 60);
  const sign = DRAW_TZ_OFFSET_MIN >= 0 ? '+' : '-';
  const off = `${sign}${String(Math.abs(offHrs)).padStart(2, '0')}:${String(offMins).padStart(2, '0')}`;
  return Date.parse(`${drwDate}T${hh}:${mm}:00${off}`);
}

/**
 * KST 기준 다음 토요일 카운트다운 타깃 시각(20:00)의 epoch ms 반환.
 * 입력 시각 자체가 토요일 타깃 시각 이전이면 그 토요일 타깃.
 * 이후거나 다른 요일이면 다음 토요일 타깃.
 * @param {number} nowMs epoch ms
 * @returns {number} epoch ms
 */
export function nextDrawTimeFromNow(nowMs) {
  // KST 기준 요일 / 시각 계산을 위해 UTC+9 보정 후 사용.
  const kstNow = new Date(nowMs + DRAW_TZ_OFFSET_MIN * 60 * 1000);
  const day = kstNow.getUTCDay(); // KST 환산 후이므로 UTC 메서드로 KST 요일을 얻음
  const targetH = DRAW_HOUR_KST;
  const targetM = DRAW_MIN_KST;
  const curH = kstNow.getUTCHours();
  const curM = kstNow.getUTCMinutes();
  const curS = kstNow.getUTCSeconds();
  const curMs = kstNow.getUTCMilliseconds();

  let daysAhead = (DRAW_DAY_OF_WEEK - day + 7) % 7;
  if (daysAhead === 0) {
    // 같은 토요일이면 추첨 시각 이전인지 확인.
    // 정각(20:00:00.000)은 "이미 시작" 처리 → 다음 주로 넘어감.
    // SSOT: docs/01_spec.md 5.2.2.6 (0에 도달하면 다음 토요일로 갱신).
    void curS; void curMs; // intentionally unused
    const isBeforeDraw =
      curH < targetH ||
      (curH === targetH && curM < targetM);
    if (!isBeforeDraw) daysAhead = 7;
  }

  // KST 기준 토요일 00:00:00.000 → epoch ms 변환
  const kstSat = new Date(Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() + daysAhead,
    targetH,
    targetM,
    0,
    0,
  ));
  // kstSat은 "KST 시간을 UTC로 잘못 새긴" 값이므로 다시 -9시간 보정해야 진짜 epoch.
  return kstSat.getTime() - DRAW_TZ_OFFSET_MIN * 60 * 1000;
}

/**
 * 다음 추첨 회차 정보 반환.
 * @param {Array<{drwNo:number,drwDate:string}>} draws 캐시된 회차 (정렬 무관)
 * @param {number} [nowMs] 기본 현재 시각
 * @returns {{ drwNo: number|null, drawAtMs: number, source: 'history'|'fallback' }}
 */
export function nextDraw(draws, nowMs = Date.now()) {
  if (!Array.isArray(draws) || draws.length === 0) {
    return { drwNo: null, drawAtMs: nextDrawTimeFromNow(nowMs), source: 'fallback' };
  }
  const last = draws.reduce((a, b) => (a.drwNo > b.drwNo ? a : b));
  const lastMs = drawDateToEpochMs(last.drwDate);
  let nextMs = lastMs + MS_PER_WEEK;
  let nextNo = last.drwNo + 1;
  // 캐시가 오래되어 추첨일이 이미 지났을 수 있음 - 미래 가장 가까운 토요일까지 진행
  while (nextMs <= nowMs) {
    nextMs += MS_PER_WEEK;
    nextNo += 1;
  }
  return { drwNo: nextNo, drawAtMs: nextMs, source: 'history' };
}

/**
 * 두 시각 차이를 일/시/분/초로 분해.
 * 음수는 0으로 절단(추첨 시각 경과 후 표시).
 * @param {number} targetMs
 * @param {number} nowMs
 * @returns {{ days:number, hours:number, mins:number, secs:number, totalSec:number }}
 */
export function diffParts(targetMs, nowMs) {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { days, hours, mins, secs, totalSec: total };
}

/**
 * 'YYYY-MM-DD' 문자열로 변환 (KST 날짜 기준).
 * @param {number} epochMs
 * @returns {string}
 */
export function formatKstDate(epochMs) {
  const kst = new Date(epochMs + DRAW_TZ_OFFSET_MIN * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
