// 캐릭터 생성 폼. 전략은 별도 (메인 화면 picker).
import { LUCK_INITIAL, STRATEGY_DEFAULT, MBTI_TYPES } from '../data/numbers.js';
import { characterSeed } from '../core/seed.js';
import { yearToAnimalSign } from '../core/zodiac.js';
import { dateToDayPillar } from '../core/saju.js';

const ZODIACS = [
  { id: 'aries', label: '양자리' },
  { id: 'taurus', label: '황소자리' },
  { id: 'gemini', label: '쌍둥이자리' },
  { id: 'cancer', label: '게자리' },
  { id: 'leo', label: '사자자리' },
  { id: 'virgo', label: '처녀자리' },
  { id: 'libra', label: '천칭자리' },
  { id: 'scorpio', label: '전갈자리' },
  { id: 'sagittarius', label: '궁수자리' },
  { id: 'capricorn', label: '염소자리' },
  { id: 'aquarius', label: '물병자리' },
  { id: 'pisces', label: '물고기자리' },
];

/**
 * 폼 렌더 + submit.
 * @param {HTMLElement} container
 * @param {(character: object) => void} onCreated
 */
export function renderCharacterForm(container, onCreated) {
  container.innerHTML = `
    <section class="character-form">
      <h2>캐릭터 생성</h2>
      <p class="form-help">캐릭터는 정체성(이름/띠/별자리/시드)이고, 추첨 전략은 메인 화면에서 매 추첨마다 선택합니다.</p>
      <form id="character-form">
        <label>이름 <input type="text" name="name" required maxlength="20" placeholder="예: 검은바람" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <label>생년월일 <input type="date" name="birth" required /></label>
        <label>별자리
          <select name="zodiac" required>
            ${ZODIACS.map((z) => `<option value="${z.id}">${z.label}</option>`).join('')}
          </select>
        </label>
        <label>행운의 단어 <input type="text" name="luckyWord" required maxlength="20" placeholder="예: 바람" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <label>MBTI (선택)
          <select name="mbti">
            <option value="">미지정</option>
            ${MBTI_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <button type="submit" class="btn-primary">캐릭터 생성</button>
      </form>
    </section>
  `;

  const form = container.querySelector('#character-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name')).trim();
    const birth = String(fd.get('birth'));
    const zodiac = String(fd.get('zodiac'));
    const luckyWord = String(fd.get('luckyWord')).trim();
    const mbti = String(fd.get('mbti') || '').trim() || null;

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
      mbti,
      luck: LUCK_INITIAL,
      lastUsedStrategy: STRATEGY_DEFAULT,
      createdAt: new Date().toISOString(),
      history: [],
    };
    onCreated(character);
  });
}
