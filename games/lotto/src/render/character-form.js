// 캐릭터 생성 폼. 전략은 별도 (메인 화면 picker).
// 별자리는 생년월일에서 자동 계산 (별도 입력 없음). SSOT: docs/02_data.md 2.6.
import { LUCK_INITIAL, STRATEGY_DEFAULT } from '../data/numbers.js';
import { characterSeed } from '../core/seed.js';
import { yearToAnimalSign, zodiacFromBirthDate } from '../core/zodiac.js';
import { dateToDayPillar } from '../core/saju.js';

const ZODIAC_LABELS = {
  aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리', cancer: '게자리',
  leo: '사자자리', virgo: '처녀자리', libra: '천칭자리', scorpio: '전갈자리',
  sagittarius: '궁수자리', capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리',
};

/**
 * 폼 렌더 + submit.
 * @param {HTMLElement} container
 * @param {(character: object) => void} onCreated
 */
export function renderCharacterForm(container, onCreated) {
  container.innerHTML = `
    <section class="character-form">
      <h2>캐릭터 생성</h2>
      <p class="form-help">캐릭터는 정체성(이름/띠/별자리/시드)이고, 추첨 전략은 메인 화면에서 매 추첨마다 선택합니다. 별자리는 생년월일에서 자동 계산됩니다.</p>
      <form id="character-form">
        <label>이름 <input type="text" name="name" required maxlength="20" placeholder="예: 검은바람" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <label>생년월일 <input type="date" name="birth" required /></label>
        <label>행운의 단어 <input type="text" name="luckyWord" required maxlength="20" placeholder="예: 바람" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <p class="form-zodiac-preview" data-role="zodiac-preview" aria-live="polite">생년월일 입력 시 별자리 자동 계산</p>
        <button type="submit" class="btn-primary">캐릭터 생성</button>
      </form>
    </section>
  `;

  const form = container.querySelector('#character-form');
  const birthInput = form.querySelector('input[name="birth"]');
  const preview = form.querySelector('[data-role="zodiac-preview"]');

  function refreshPreview() {
    const birth = birthInput.value;
    const z = zodiacFromBirthDate(birth);
    if (z && ZODIAC_LABELS[z]) {
      preview.textContent = `별자리: ${ZODIAC_LABELS[z]}`;
      preview.classList.add('is-valid');
    } else {
      preview.textContent = '생년월일 입력 시 별자리 자동 계산';
      preview.classList.remove('is-valid');
    }
  }
  birthInput.addEventListener('input', refreshPreview);
  birthInput.addEventListener('change', refreshPreview);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name')).trim();
    const birth = String(fd.get('birth'));
    const luckyWord = String(fd.get('luckyWord')).trim();

    const zodiac = zodiacFromBirthDate(birth);
    if (!zodiac) {
      preview.textContent = '생년월일을 정확히 입력해주세요';
      return;
    }

    const seed = characterSeed({ birthYMD: birth, name, zodiac, luckyWord });
    const birthYear = parseInt(birth.slice(0, 4), 10);
    const animalSign = Number.isInteger(birthYear) ? yearToAnimalSign(birthYear) : 'rat';
    const dayPillar = dateToDayPillar(birth);
    const character = {
      id: `c_${Date.now().toString(36)}_${seed.toString(36)}`,
      seed,
      name,
      animalSign,
      zodiac,
      dayPillar,
      luck: LUCK_INITIAL,
      lastUsedStrategy: STRATEGY_DEFAULT,
      lastUsedStrategies: [STRATEGY_DEFAULT], // S3-T1: 다중 전략 모드용 (단일 모드 시 무시)
      createdAt: new Date().toISOString(),
      history: [],
    };
    onCreated(character);
  });
}
