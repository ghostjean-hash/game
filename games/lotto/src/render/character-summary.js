// 캐릭터 카드 토글 헤더 (한 줄 row). SSOT: docs/01_spec.md 5.1.6 (S36, 2026-05-08).
// S36.2 (2026-05-08): 별도 "접기 bar" 폐기. 한 줄 row 자체가 토글 = 카드 헤더로 흡수.
//   접힘: 한 줄 row만. 펼침: 한 줄 row(▲) + character-card 본문.
//   카피: 운 이모지(좌) · 이름(강조) · 메타(별자리·띠·일주) · caret(우).
import {
  FORTUNE_GREAT, FORTUNE_GOOD, FORTUNE_NEUTRAL, FORTUNE_BAD,
  pickFortuneCopy,
} from '../data/numbers.js';

// S76 (2026-05-17): 흉 글리프 ▼ → ✕. caret(▼/▲)과 시각 충돌 정정.
const FORTUNE_GLYPH = {
  [FORTUNE_GREAT]: '★',
  [FORTUNE_GOOD]: '◆',
  [FORTUNE_NEUTRAL]: '●',
  [FORTUNE_BAD]: '✕',
};

// S2 후속 (2026-06-07): 운세 문구 풀 + 회차 변형은 numbers.js FORTUNE_COPY_POOL / pickFortuneCopy로 이전.

/**
 * 토글 row HTML. 접힘 / 펼침 공용.
 * @param {object} character 캐릭터.
 * @param {string} fortune FORTUNE_*.
 * @param {boolean} isExpanded true면 ▲ caret + aria-expanded=true.
 * @returns {string} HTML (한 줄 row).
 */
export function characterToggleRowHtml(character, fortune, isExpanded, drwNo = 0) {
  const name = character?.name || '캐릭터';
  const fortuneGlyph = FORTUNE_GLYPH[fortune] || FORTUNE_GLYPH[FORTUNE_NEUTRAL];
  const isBad = fortune === FORTUNE_BAD;

  // S2 후속 (2026-06-07): 유저명 제거(슬롯에 노출) + 회차마다 다른 운세 문구(등급+시드+회차 결정론).
  const meta = pickFortuneCopy(fortune, character?.seed || 0, drwNo);

  const caret = isExpanded ? '▲' : '▼';
  const expanded = isExpanded ? 'true' : 'false';
  const aria = isExpanded ? `${name} 운세 정보 접기` : `${name} 운세 정보 펼치기`;

  return `
    <button type="button"
            class="char-toggle${isBad ? ' is-bad' : ''}${isExpanded ? ' is-expanded' : ''}"
            data-action="char-card-toggle"
            aria-expanded="${expanded}"
            aria-label="${aria}">
      <span class="char-toggle-glyph" aria-hidden="true">${fortuneGlyph}</span>
      <span class="char-toggle-meta char-toggle-fortune">${escapeHtml(meta)}</span>
      <span class="char-toggle-caret" aria-hidden="true">${caret}</span>
    </button>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
