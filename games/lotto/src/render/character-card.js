// 캐릭터 카드 HTML. SSOT: docs/01_spec.md 5.1 / 5.1.2.
// 클래스(전략)는 카드에 표시하지 않습니다. 전략은 추첨 시 선택.
// T3: 사주(일주 오행) 행운 번호 영구 표시.
// S3-T3: 3종 행운 토글 (사주 / 별자리 / 4원소). MBTI는 S8(2026-05-02) 폐지.
import { FORTUNE_COLORS, numberColor } from '../data/colors.js';
import {
  FORTUNE_GREAT, FORTUNE_GOOD, FORTUNE_NEUTRAL, FORTUNE_BAD,
  ANIMAL_SIGNS,
  FIVE_ELEMENTS_LUCKY, STEM_TO_ELEMENT,
  ZODIAC_LUCKY, ZODIAC_ELEMENTS, ZODIAC_ELEMENT_LUCKY,
} from '../data/numbers.js';
import { dayPillarLabel } from '../core/saju.js';
import { fortuneRelation } from '../core/fortune.js';

const ELEMENT_LABELS = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const ZODIAC_ELEMENT_LABELS = { fire: '불', earth: '땅', air: '공기', water: '물' };
const ZODIAC_NAME = {
  aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리', cancer: '게자리',
  leo: '사자자리', virgo: '처녀자리', libra: '천칭자리', scorpio: '전갈자리',
  sagittarius: '궁수자리', capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리',
};

const ANIMAL_LABELS = Object.fromEntries(ANIMAL_SIGNS.map((a) => [a.id, a.label]));

const ZODIAC_LABELS = {
  aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리', cancer: '게자리',
  leo: '사자자리', virgo: '처녀자리', libra: '천칭자리', scorpio: '전갈자리',
  sagittarius: '궁수자리', capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리',
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

// 등급별 한 줄 카피. SSOT: 본 파일 (docs/01_spec.md 5.1.2).
const FORTUNE_COPY = {
  [FORTUNE_GREAT]: '캐릭터 운세 최상. 시드 영향 강화.',
  [FORTUNE_GOOD]: '안정적인 흐름. 평소대로 진행.',
  [FORTUNE_NEUTRAL]: '특별한 가산점 없음. 무난한 회차.',
  [FORTUNE_BAD]: '흐름 약함. 보수적 선택 권장.',
};

// 띠 관계 라벨 (spec 5.1.1 / 02_data.md 1.10).
const RELATION_LABEL = {
  same: '같은 띠 (비견) · 길조 우세',
  sahap: '삼합 · 길조 약간',
  chung: '충 · 흉조 우세',
  normal: '보통 관계',
};

/**
 * 캐릭터 카드.
 * @param {object} character
 * @param {string} fortune 등급
 * @param {{ drwNo: number, drwDate?: string } | number} [drawOrDrwNo] 회차 정보. 없으면 관계 표시 생략
 */
export function characterCardHtml(character, fortune, drawOrDrwNo) {
  const fortuneLabel = FORTUNE_LABELS[fortune] || fortune;
  const fortuneColor = FORTUNE_COLORS[fortune] || FORTUNE_COLORS.neutral;
  const fortuneIcon = FORTUNE_ICON[fortune] || '●';
  const fortuneCopy = FORTUNE_COPY[fortune] || '';
  const animalLabel = character.animalSign ? (ANIMAL_LABELS[character.animalSign] || '') : '';
  const zodiacLabel = character.zodiac ? (ZODIAC_LABELS[character.zodiac] || '') : '';
  const pillarLabel = character.dayPillar ? dayPillarLabel(character.dayPillar) : '';

  // 회차 일진 띠 관계 (spec 5.1.1)
  let relationLabel = '';
  if (drawOrDrwNo !== undefined && drawOrDrwNo !== null && character.animalSign) {
    const rel = fortuneRelation(character.animalSign, drawOrDrwNo);
    relationLabel = RELATION_LABEL[rel] || '';
  }

  const fortuneClass = fortune === FORTUNE_BAD ? ' is-bad'
    : fortune === FORTUNE_GREAT ? ' is-great'
    : '';

  return `
    <section class="character-card${fortuneClass}" aria-label="${escapeHtml(character.name)} 캐릭터 카드">
      <div class="char-meta">
        ${animalLabel ? `<span class="char-animal">${escapeHtml(animalLabel)}띠</span>` : ''}
        ${zodiacLabel ? `<span class="char-zodiac">${escapeHtml(zodiacLabel)}</span>` : ''}
        ${pillarLabel ? `<span class="char-pillar" title="일주 (사주)">${escapeHtml(pillarLabel)}일</span>` : ''}
      </div>
      <h2 class="char-name">${escapeHtml(character.name)}</h2>
      <div class="char-fortune" style="color: ${fortuneColor}" aria-label="운세 ${escapeHtml(fortuneLabel)}">
        <span class="fortune-icon" aria-hidden="true">${fortuneIcon}</span>
        <span class="fortune-label">운세 · ${escapeHtml(fortuneLabel)}</span>
      </div>
      ${fortuneCopy ? `<p class="fortune-copy">${escapeHtml(fortuneCopy)}</p>` : ''}
      ${relationLabel ? `<p class="fortune-relation">${escapeHtml(relationLabel)}</p>` : ''}
      <div class="char-luck" aria-label="Luck 스탯 ${character.luck} / 100">
        <div class="luck-label">Luck <strong>${character.luck}</strong> / 100</div>
        <div class="luck-bar" role="progressbar" aria-valuenow="${character.luck}" aria-valuemin="0" aria-valuemax="100">
          <span style="width: ${character.luck}%; background: ${fortuneColor};"></span>
        </div>
      </div>
      ${luckyNumbersHtml(character)}
    </section>
  `;
}

/**
 * S3-T3: 3종 행운 번호 토글 (사주 / 별자리 / 4원소). S8(2026-05-02) MBTI 폐지.
 * 1차 표시는 사주(가장 정체성 강한 매핑). 토글로 다른 종류 보기.
 * 추첨 결과의 큰 번호공과 시각 차별화 위해 작은 컬러볼.
 * 데이터 없는 종류는 탭에서도 비활성.
 */
function luckyNumbersHtml(character) {
  const sources = collectLuckySources(character);
  if (sources.length === 0) return '';

  // 4종 토글. 기본 활성 = 첫 (사주 우선)
  const activeIdx = 0;
  const tabs = sources.map((src, i) => `
    <button type="button"
            class="lucky-tab${i === activeIdx ? ' is-active' : ''} lucky-tab-${src.kind}"
            data-lucky-tab-idx="${i}"
            aria-pressed="${i === activeIdx ? 'true' : 'false'}"
            title="${escapeHtml(src.tabTitle)}">
      ${escapeHtml(src.tabLabel)}
    </button>
  `).join('');

  const panels = sources.map((src, i) => {
    const balls = src.numbers.map((n) => {
      const { bg } = numberColor(n);
      return `<span class="lucky-num" style="background-color:${bg};" aria-label="행운 번호 ${n}">${n}</span>`;
    }).join('');
    return `
      <div class="lucky-panel${i === activeIdx ? ' is-active' : ''}"
           data-lucky-panel-idx="${i}"
           ${i === activeIdx ? '' : 'hidden'}>
        <div class="lucky-label">
          <span class="lucky-element lucky-element-${src.kind}" title="${escapeHtml(src.tabTitle)}">${escapeHtml(src.elementLabel)}</span>
          ${src.variability ? `<span class="lucky-variability lucky-variability-${src.variability === '주간 변경' ? 'weekly' : 'lifetime'}" title="번호 변동성">${escapeHtml(src.variability)}</span>` : ''}
          <span class="lucky-caption">${escapeHtml(src.caption)}</span>
        </div>
        <div class="lucky-balls">${balls}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="char-lucky" aria-label="행운 번호 (${sources.length}종)">
      <div class="lucky-tabs" role="tablist">${tabs}</div>
      ${panels}
    </div>
  `;
}

/**
 * 캐릭터의 4종 행운 매핑 수집. 데이터 있는 종류만 반환.
 * 우선순위: 사주 → 별자리 → 별자리 4원소.
 */
function collectLuckySources(character) {
  const sources = [];

  // 사주
  if (character.dayPillar && character.dayPillar.stem) {
    const element = STEM_TO_ELEMENT[character.dayPillar.stem];
    if (element && FIVE_ELEMENTS_LUCKY[element]) {
      sources.push({
        kind: 'saju',
        tabLabel: '사주',
        tabTitle: '일주 천간 오행',
        elementLabel: `${ELEMENT_LABELS[element] || element} 오행`,
        variability: '주간 변경',
        caption: '전통 河圖數 출처 (易經) + 추첨일 일진 보너스 · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음',
        numbers: FIVE_ELEMENTS_LUCKY[element],
      });
    }
  }

  // 서양 12별자리
  if (character.zodiac && ZODIAC_LUCKY[character.zodiac]) {
    sources.push({
      kind: 'zodiac',
      tabLabel: '별자리',
      tabTitle: '서양 12별자리',
      elementLabel: ZODIAC_NAME[character.zodiac] || character.zodiac,
      variability: '평생 동일',
      caption: '전통 점성술 출처 (Sun Sign + Ruler Planet) · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음',
      numbers: ZODIAC_LUCKY[character.zodiac],
    });
  }

  // 서양 4원소
  if (character.zodiac) {
    let element = null;
    for (const [el, list] of Object.entries(ZODIAC_ELEMENTS)) {
      if (list.includes(character.zodiac)) { element = el; break; }
    }
    if (element && ZODIAC_ELEMENT_LUCKY[element]) {
      sources.push({
        kind: 'zelement',
        tabLabel: '4원소',
        tabTitle: '서양 4원소 (불/땅/공기/물)',
        elementLabel: `${ZODIAC_ELEMENT_LABELS[element] || element} 그룹`,
        variability: '평생 동일',
        caption: '전통 점성술 4원소 출처 (별자리 합집합) · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음',
        numbers: ZODIAC_ELEMENT_LUCKY[element],
      });
    }
  }

  return sources;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
