// 캐릭터 카드 토글 헤더 (한 줄 row). SSOT: docs/01_spec.md 5.1.6 (S36, 2026-05-08).
// S36.2 (2026-05-08): 별도 "접기 bar" 폐기. 한 줄 row 자체가 토글 = 카드 헤더로 흡수.
//   접힘: 한 줄 row만. 펼침: 한 줄 row(▲) + character-card 본문.
//   카피: 운 이모지(좌) · 이름(강조) · 메타(별자리·띠·일주) · caret(우).
import {
  FORTUNE_GREAT, FORTUNE_GOOD, FORTUNE_NEUTRAL, FORTUNE_BAD,
  ANIMAL_SIGNS,
} from '../data/numbers.js';
import { dayPillarLabel } from '../core/saju.js';

const ZODIAC_SHORT = {
  aries: '양', taurus: '황소', gemini: '쌍둥이', cancer: '게',
  leo: '사자', virgo: '처녀', libra: '천칭', scorpio: '전갈',
  sagittarius: '궁수', capricorn: '염소', aquarius: '물병', pisces: '물고기',
};

// S76 (2026-05-17): 흉 글리프 ▼ → ✕. caret(▼/▲)과 시각 충돌 정정. 사용자 보고 "고스트(흉) 유저만 화살표 중복".
const FORTUNE_GLYPH = {
  [FORTUNE_GREAT]: '★',
  [FORTUNE_GOOD]: '◆',
  [FORTUNE_NEUTRAL]: '●',
  [FORTUNE_BAD]: '✕',
};

const ANIMAL_LABELS = Object.fromEntries(ANIMAL_SIGNS.map((a) => [a.id, a.label]));

/**
 * 토글 row HTML. 접힘 / 펼침 공용.
 * @param {object} character 캐릭터.
 * @param {string} fortune FORTUNE_*.
 * @param {boolean} isExpanded true면 ▲ caret + aria-expanded=true.
 * @returns {string} HTML (한 줄 row).
 */
export function characterToggleRowHtml(character, fortune, isExpanded) {
  const name = character?.name || '캐릭터';
  const zodiac = ZODIAC_SHORT[character?.zodiac] || '';
  const animal = ANIMAL_LABELS[character?.animalSign] || '';
  const pillar = character?.dayPillar ? dayPillarLabel(character.dayPillar) : '';
  const fortuneGlyph = FORTUNE_GLYPH[fortune] || FORTUNE_GLYPH[FORTUNE_NEUTRAL];
  const isBad = fortune === FORTUNE_BAD;

  const metaParts = [zodiac, animal, pillar].filter(Boolean);
  const meta = metaParts.join(' · ');

  const caret = isExpanded ? '▲' : '▼';
  const expanded = isExpanded ? 'true' : 'false';
  const aria = isExpanded ? '캐릭터 정보 접기' : '캐릭터 정보 펼치기';

  return `
    <button type="button"
            class="char-toggle${isBad ? ' is-bad' : ''}${isExpanded ? ' is-expanded' : ''}"
            data-action="char-card-toggle"
            aria-expanded="${expanded}"
            aria-label="${aria}">
      <span class="char-toggle-glyph" aria-hidden="true">${fortuneGlyph}</span>
      <span class="char-toggle-name">${escapeHtml(name)}</span>
      ${meta ? `<span class="char-toggle-meta">${escapeHtml(meta)}</span>` : ''}
      <span class="char-toggle-caret" aria-hidden="true">${caret}</span>
    </button>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
