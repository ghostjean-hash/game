// localStorage 입출력. SSOT: docs/02_data.md 3장.
// data/만 localStorage 접근. core/에서는 직접 접근 금지.

const PREFIX = 'lotto_';

function key(name) {
  return `${PREFIX}${name}`;
}

function read(name, fallback = null) {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(name, value) {
  localStorage.setItem(key(name), JSON.stringify(value));
}

// 회차 데이터
export function loadDraws() { return read('draws', []); }
export function saveDraws(draws) { write('draws', draws); }

// 통계 캐시
export function loadNumberStats() { return read('stats_numbers', null); }
export function saveNumberStats(stats) { write('stats_numbers', stats); }
export function loadBonusStats() { return read('stats_bonus', null); }
export function saveBonusStats(stats) { write('stats_bonus', stats); }
export function loadCooccur() { return read('stats_cooccur', null); }
export function saveCooccur(cooccur) { write('stats_cooccur', cooccur); }

// 캐릭터
export function loadCharacters() { return read('characters', []); }
export function saveCharacters(characters) { write('characters', characters); }
export function loadActiveCharacterId() { return read('active_character', null); }
export function saveActiveCharacterId(id) { write('active_character', id); }

// 옵션
// fiveSets: 5세트 동시 추천 모드 (S4-T1). 기본 OFF.
// S19 (2026-05-02): multiStrategy 옵션 폐기. 항상 다중 모드. 기존 localStorage 잔존은 무시.
const OPTIONS_DEFAULT = { applyFilters: false, advancedMode: false, fiveSets: false };
export function loadOptions() {
  const opts = read('options', OPTIONS_DEFAULT);
  // 누락 키 채우기 + S19 폐기 키 제거
  const { multiStrategy: _drop, ...rest } = opts || {};
  return { ...OPTIONS_DEFAULT, ...rest };
}
export function saveOptions(options) { write('options', options); }

// 면책 안내
export function hasSeenHelp() { return read('seen_help', false) === true; }
export function markSeenHelp() { write('seen_help', true); }

// 행운 의식 상태 (T4). SSOT: docs/02_data.md 1.19.
// 회차 + 캐릭터 변경 시 자동 리셋 (core/ritual.js ensureCurrentState).
export function loadRitualState() { return read('rituals', null); }
export function saveRitualState(state) { write('rituals', state); }

// 전체 초기화 (테스트 / 사용자 reset)
export function clearAll() {
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
  }
}

// 정적 draws.json 동기화 (M6).
// 페이지 진입 시 호출. fetch 실패하면 기존 캐시 유지.

const DRAWS_JSON_URL = './src/data/draws.json';
// 미러 latest 단건 (가벼운 peek용). SSOT: docs/02_data.md 4.1.
const MIRROR_LATEST_URL = 'https://smok95.github.io/lotto/results/latest.json';

async function fetchDrawsJson() {
  try {
    const res = await fetch(DRAWS_JSON_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchMirrorLatest() {
  try {
    const res = await fetch(MIRROR_LATEST_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.draw_no !== 'number') return null;
    return {
      drwNo: data.draw_no,
      drwDate: typeof data.date === 'string' ? data.date.slice(0, 10) : '',
    };
  } catch {
    return null;
  }
}

/**
 * draws.json fetch + localStorage 갱신.
 * fetched가 cached보다 새(더 큰 drwNo)이면 캐시 갱신.
 * @returns {Promise<Array>} 사용 가능한 draws 배열 (없으면 빈 배열)
 */
export async function syncDraws() {
  const fetched = await fetchDrawsJson();
  const cached = loadDraws();
  if (!fetched || fetched.length === 0) return cached;
  const cachedMax = cached.length > 0 ? Math.max(...cached.map((d) => d.drwNo)) : 0;
  const fetchedMax = Math.max(...fetched.map((d) => d.drwNo));
  if (fetchedMax >= cachedMax) {
    saveDraws(fetched);
    return fetched;
  }
  return cached;
}

/**
 * 날짜 기준 새 정보가 있을 때만 갱신.
 * 1. 미러 latest.json만 가볍게 GET → cached max drwNo와 비교.
 * 2. 새 회차 없으면 무동작.
 * 3. 새 회차 있으면 정적 draws.json (자동 갱신된 번들) 다시 fetch + saveDraws.
 *
 * @returns {Promise<{updated: boolean, reason: string, draws: Array, latestDrwNo: number, latestDrwDate: string}>}
 *   - updated: 캐시가 갱신됐는지
 *   - reason: 'new-rounds' | 'already-latest' | 'mirror-unreachable' | 'sync-failed'
 *   - draws: 사용 가능한 draws 배열
 *   - latestDrwNo / latestDrwDate: 가장 최신 회차 정보 (미러 또는 캐시)
 */
export async function syncDrawsIfNewer() {
  const cached = loadDraws();
  const cachedMax = cached.length > 0 ? Math.max(...cached.map((d) => d.drwNo)) : 0;
  const cachedLast = cached.length > 0 ? cached[cached.length - 1] : null;

  const remote = await fetchMirrorLatest();
  if (!remote) {
    return {
      updated: false,
      reason: 'mirror-unreachable',
      draws: cached,
      latestDrwNo: cachedMax,
      latestDrwDate: cachedLast ? cachedLast.drwDate : '',
    };
  }

  if (remote.drwNo <= cachedMax) {
    return {
      updated: false,
      reason: 'already-latest',
      draws: cached,
      latestDrwNo: cachedMax,
      latestDrwDate: cachedLast ? cachedLast.drwDate : remote.drwDate,
    };
  }

  // 새 회차 있음 → 정적 draws.json (CI가 갱신한 번들) 다시 받기
  const fetched = await fetchDrawsJson();
  if (!fetched || fetched.length === 0) {
    return {
      updated: false,
      reason: 'sync-failed',
      draws: cached,
      latestDrwNo: cachedMax,
      latestDrwDate: cachedLast ? cachedLast.drwDate : '',
    };
  }
  const fetchedMax = Math.max(...fetched.map((d) => d.drwNo));
  if (fetchedMax > cachedMax) {
    saveDraws(fetched);
    const last = fetched[fetched.length - 1];
    return {
      updated: true,
      reason: 'new-rounds',
      draws: fetched,
      latestDrwNo: last.drwNo,
      latestDrwDate: last.drwDate,
    };
  }

  // 미러는 새거였는데 정적 draws.json은 아직 갱신 안 됨 (CI 지연 등)
  return {
    updated: false,
    reason: 'sync-failed',
    draws: cached,
    latestDrwNo: cachedMax,
    latestDrwDate: cachedLast ? cachedLast.drwDate : '',
  };
}
