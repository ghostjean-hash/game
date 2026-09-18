// 입력 범위 검사 (02_data.md 1.3 / 05_manage-screens.md 5.1).
//
// 범위 밖 값은 저장하지 않는다. 화면은 이 판정만 보고 막을지 받을지 정하고,
// 허용 범위를 사용자에게 보일 때도 여기가 돌려준 min·max 를 쓴다 -
// 화면이 숫자를 따로 적으면 02_data.md 를 고쳐도 그 자리가 안 따라온다.

import { LIMITS, NAME_MAX_LENGTH } from '../data/constants.js';

/** 칸에서 온 값은 늘 글자다. 빈 글자와 0 을 가르려고 직접 본다. */
function isBlank(raw) {
  return raw === null || raw === undefined || String(raw).trim() === '';
}

/**
 * 수 입력 칸 하나를 판정한다.
 *
 * @param field     LIMITS 의 키 (prepSeconds · workSeconds · sets · reps 등)
 * @param raw       칸에서 온 값
 * @param allowNull 비울 수 있는 칸인가 (운동 템플릿의 시간 둘, 05_manage-screens.md 4.3.1)
 * @returns { ok, value, min, max, reason }
 *          reason - 'blank' 빈 값 불가 / 'nan' 수가 아님 / 'range' 범위 밖
 */
export function checkNumber(field, raw, allowNull = false) {
  const limit = LIMITS[field];
  const min = limit ? limit.min : null;
  const max = limit ? limit.max : null;

  if (isBlank(raw)) {
    if (allowNull) return { ok: true, value: null, min, max, reason: null };
    return { ok: false, value: null, min, max, reason: 'blank' };
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, value: null, min, max, reason: 'nan' };
  }
  if (limit && (n < min || n > max)) {
    return { ok: false, value: null, min, max, reason: 'range' };
  }
  return { ok: true, value: n, min, max, reason: null };
}

/**
 * 이름 칸 판정. 앞뒤 공백을 떼고 길이만 본다.
 * 같은 이름을 두 번 쓰는 것은 막지 않는다 - 부위가 다른 같은 이름 운동이 있을 수 있고,
 * 이름은 사용자가 알아보려고 붙이는 것이지 열쇠가 아니다(열쇠는 id 다).
 */
export function checkName(raw) {
  const value = String(raw ?? '').trim();
  if (value === '') return { ok: false, value: '', max: NAME_MAX_LENGTH, reason: 'blank' };
  if (value.length > NAME_MAX_LENGTH) {
    return { ok: false, value, max: NAME_MAX_LENGTH, reason: 'long' };
  }
  return { ok: true, value, max: NAME_MAX_LENGTH, reason: null };
}

/** 'HH:MM' 인가. 빈 값은 허용한다 - 예정 시간을 안 정한 요일이 있다(02_data.md 5.3). */
export function checkTime(raw) {
  if (isBlank(raw)) return { ok: true, value: '', reason: null };
  const value = String(raw).trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return { ok: false, value: '', reason: 'format' };
  }
  return { ok: true, value, reason: null };
}
