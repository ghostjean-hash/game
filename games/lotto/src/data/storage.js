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
const OPTIONS_DEFAULT = { applyFilters: false, advancedMode: false };
export function loadOptions() {
  const opts = read('options', OPTIONS_DEFAULT);
  // 누락 키 채우기 (마이그레이션)
  return { ...OPTIONS_DEFAULT, ...opts };
}
export function saveOptions(options) { write('options', options); }

// 면책 안내
export function hasSeenHelp() { return read('seen_help', false) === true; }
export function markSeenHelp() { write('seen_help', true); }

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
