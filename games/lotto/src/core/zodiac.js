// 12간지 계산. SSOT: docs/02_data.md 1.10.
// core/는 DOM 금지. 순수 함수.
// 기준: 1900년 = 0 (자/쥐). 인덱스 = (year - 4) mod 12.
//   1900 - 4 = 1896, 1896 % 12 = 0 = 자(쥐). 검증 OK.
//   2024 - 4 = 2020, 2020 % 12 = 4 = 진(용). 검증 OK.

const ANIMAL_SIGN_IDS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];

/**
 * 연도 → 12간지 ID.
 * @param {number} year
 * @returns {string}
 */
export function yearToAnimalSign(year) {
  const idx = ((year - 4) % 12 + 12) % 12;
  return ANIMAL_SIGN_IDS[idx];
}

/**
 * 12간지 ID → 인덱스 (0~11). 미존재 ID는 -1.
 */
export function animalSignIndex(id) {
  return ANIMAL_SIGN_IDS.indexOf(id);
}

/**
 * 회차 번호 → 회차 일진 12간지 (단순 mod 12 매핑).
 * 정확한 일진은 drawToAnimalSign 사용 (drwDate 활용).
 */
export function drwNoToAnimalSign(drwNo) {
  const idx = ((drwNo % 12) + 12) % 12;
  return ANIMAL_SIGN_IDS[idx];
}

// 60갑자 기준일: 1984-02-02 = 갑자일 (지지 = 자/rat).
const ANIMAL_BASE_DATE_MS = Date.UTC(1984, 1, 2);
const DAY_MS = 86400000;

/**
 * 날짜 문자열(YYYY-MM-DD) → 일진 12간지.
 * 기준일 1984-02-02 = rat. 일자 차이 mod 12.
 * @param {string} dateStr
 * @returns {string | null} 12간지 ID 또는 null (파싱 실패)
 */
export function dateToAnimalSign(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((t - ANIMAL_BASE_DATE_MS) / DAY_MS);
  const idx = ((days % 12) + 12) % 12;
  return ANIMAL_SIGN_IDS[idx];
}

/**
 * Draw(또는 drwNo) → 일진 12간지.
 * drwDate 있으면 정밀, 없으면 drwNo mod 12 fallback.
 * @param {{ drwNo: number, drwDate?: string } | number} drawOrDrwNo
 */
export function drawToAnimalSign(drawOrDrwNo) {
  if (typeof drawOrDrwNo === 'number') {
    return drwNoToAnimalSign(drawOrDrwNo);
  }
  if (drawOrDrwNo && drawOrDrwNo.drwDate) {
    const sign = dateToAnimalSign(drawOrDrwNo.drwDate);
    if (sign) return sign;
  }
  if (drawOrDrwNo && Number.isInteger(drawOrDrwNo.drwNo)) {
    return drwNoToAnimalSign(drawOrDrwNo.drwNo);
  }
  return null;
}

/**
 * 두 12간지 관계.
 *   same:   동일 띠 (대길 우세)
 *   sahap:  삼합 (4 / 8 떨어짐, 길조)
 *   chung:  충 (6 떨어짐, 정반대, 흉조)
 *   normal: 그 외 (평이)
 * @returns {'same' | 'sahap' | 'chung' | 'normal'}
 */
export function zodiacRelation(a, b) {
  const ai = animalSignIndex(a);
  const bi = animalSignIndex(b);
  if (ai < 0 || bi < 0) return 'normal';
  const diff = Math.abs(ai - bi);
  if (diff === 0) return 'same';
  if (diff === 6) return 'chung';
  if (diff === 4 || diff === 8) return 'sahap';
  return 'normal';
}
