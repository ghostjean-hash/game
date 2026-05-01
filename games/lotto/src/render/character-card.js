// 캐릭터 카드 HTML. SSOT: docs/01_spec.md 5.1.
// 클래스(전략)는 카드에 표시하지 않습니다. 전략은 추첨 시 선택.
import { FORTUNE_COLORS } from '../data/colors.js';
import {
  FORTUNE_GREAT, FORTUNE_GOOD, FORTUNE_NEUTRAL, FORTUNE_BAD,
  ANIMAL_SIGNS,
} from '../data/numbers.js';
import { dayPillarLabel } from '../core/saju.js';

const ANIMAL_LABELS = Object.fromEntries(ANIMAL_SIGNS.map((a) => [a.id, a.label]));

const ZODIAC_LABELS = {
  aries: '양자리',
  taurus: '황소자리',
  gemini: '쌍둥이자리',
  cancer: '게자리',
  leo: '사자자리',
  virgo: '처녀자리',
  libra: '천칭자리',
  scorpio: '전갈자리',
  sagittarius: '궁수자리',
  capricorn: '염소자리',
  aquarius: '물병자리',
  pisces: '물고기자리',
};

const FORTUNE_LABELS = {
  [FORTUNE_GREAT]: '대길',
  [FORTUNE_GOOD]: '길',
  [FORTUNE_NEUTRAL]: '평',
  [FORTUNE_BAD]: '흉',
};

const FORTUNE_ICON = {
  [FORTUNE_GREAT]: '★',
  [FORTUNE_GOOD]: '◆',
  [FORTUNE_NEUTRAL]: '●',
  [FORTUNE_BAD]: '▼',
};

export function characterCardHtml(character, fortune) {
  const fortuneLabel = FORTUNE_LABELS[fortune] || fortune;
  const fortuneColor = FORTUNE_COLORS[fortune] || FORTUNE_COLORS.neutral;
  const fortuneIcon = FORTUNE_ICON[fortune] || '●';
  const animalLabel = character.animalSign ? (ANIMAL_LABELS[character.animalSign] || '') : '';
  const zodiacLabel = character.zodiac ? (ZODIAC_LABELS[character.zodiac] || '') : '';
  const pillarLabel = character.dayPillar ? dayPillarLabel(character.dayPillar) : '';
  const mbtiLabel = character.mbti || '';

  const fortuneClass = fortune === FORTUNE_BAD ? ' is-bad'
    : fortune === FORTUNE_GREAT ? ' is-great'
    : '';

  return `
    <section class="character-card${fortuneClass}" aria-label="${escapeHtml(character.name)} 캐릭터 카드">
      <div class="char-meta">
        ${animalLabel ? `<span class="char-animal">${escapeHtml(animalLabel)}띠</span>` : ''}
        ${zodiacLabel ? `<span class="char-zodiac">${escapeHtml(zodiacLabel)}</span>` : ''}
        ${pillarLabel ? `<span class="char-pillar" title="일주 (사주)">${escapeHtml(pillarLabel)}일</span>` : ''}
        ${mbtiLabel ? `<span class="char-mbti" title="MBTI">${escapeHtml(mbtiLabel)}</span>` : ''}
      </div>
      <h2 class="char-name">${escapeHtml(character.name)}</h2>
      <div class="char-fortune" style="color: ${fortuneColor}" aria-label="운세 ${escapeHtml(fortuneLabel)}">
        <span class="fortune-icon" aria-hidden="true">${fortuneIcon}</span>
        <span>운세 · ${escapeHtml(fortuneLabel)}</span>
      </div>
      <div class="char-luck" aria-label="Luck 스탯 ${character.luck} / 100">
        <div class="luck-label">Luck <strong>${character.luck}</strong> / 100</div>
        <div class="luck-bar" role="progressbar" aria-valuenow="${character.luck}" aria-valuemin="0" aria-valuemax="100">
          <span style="width: ${character.luck}%; background: ${fortuneColor};"></span>
        </div>
      </div>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
