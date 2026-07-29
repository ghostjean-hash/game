// 캐릭터 생성 폼. 전략은 별도 (메인 화면 picker).
// 별자리는 생년월일에서 자동 계산 (별도 입력 없음). SSOT: docs/02_data.md 2.6.
import { DEFAULT_PRESETS } from '../data/numbers.js';
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
      // S85 (2026-05-17): birth 필드 보존. 편집 모달 prefill + 미래 재계산 입력 용.
      birth,
      animalSign,
      zodiac,
      dayPillar,
      // S089 (2026-05-17): Luck 자산 전면 폐기. luck 필드 제거.
      // S75 (2026-05-16): 신규 캐릭터 진입 시 슬롯 1(운세) 자동 활성. 사용자 명시 "프리셋 미선택 시 추천 차단".
      //   옛 [STRATEGY_DEFAULT] = [BLESSED] 단독은 어느 프리셋과도 일치 안 함 → "선택 안 됨" 상태로 추천되던 버그.
      lastUsedStrategy: DEFAULT_PRESETS[0].strategyIds[0],
      lastUsedStrategies: [...DEFAULT_PRESETS[0].strategyIds],
      createdAt: new Date().toISOString(),
      history: [],
    };
    onCreated(character);
  });
}

/**
 * S84 (2026-05-17): 캐릭터 편집 폼.
 *   편집 필드 = name + birth (생년월일). luckyWord 직접 수정 불가. (S089 Luck 자산 폐기.)
 *   seed는 보존 (캐릭터 정체성 + 옛 history / 추천 결과 일관성).
 *   birth 변경 시 zodiac/animalSign/dayPillar 재계산 (운세/사주 자동 갱신).
 * @param {HTMLElement} container
 * @param {object} character 편집 대상 캐릭터 (id/seed/...).
 * @param {(updated: object) => void} onUpdated 저장 시 호출. updated = 갱신된 캐릭터 객체.
 * @param {() => void} [onCancel] 취소 버튼 핸들러.
 */
export function renderCharacterEditForm(container, character, onUpdated, onCancel) {
  // S85 (2026-05-17): birth 필드 prefill. 신규 캐릭터(S85 이후)는 character.birth 보존,
  //   옛 캐릭터(S85 이전)는 birth 부재 → 빈값. 사용자가 옛 생년월일 다시 입력 필요.
  const safeName = String(character?.name || '').replace(/"/g, '&quot;');
  const birthValue = typeof character?.birth === 'string' ? character.birth : '';
  const safeBirth = birthValue.replace(/"/g, '&quot;');
  const hasOldBirth = !!birthValue;
  const helpText = hasOldBirth
    ? '이름과 생년월일을 편집합니다. 시드(추천 결정론)는 보존됩니다. 생년월일 변경 시 별자리/띠/일주 자동 재계산.'
    : '이름과 생년월일을 편집합니다. 옛 캐릭터(S85 이전 생성)는 생년월일 저장 데이터가 없어 다시 입력해주세요. 시드(추천 결정론)는 보존됩니다.';
  container.innerHTML = `
    <section class="character-form">
      <h2>캐릭터 편집</h2>
      <p class="form-help">${helpText}</p>
      <form id="character-edit-form">
        <label>이름 <input type="text" name="name" required maxlength="20" value="${safeName}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <label>생년월일 <input type="date" name="birth" required value="${safeBirth}" /></label>
        <p class="form-zodiac-preview" data-role="zodiac-preview" aria-live="polite">${hasOldBirth ? '' : '생년월일 입력 시 별자리 자동 계산'}</p>
        <div class="form-actions">
          <button type="submit" class="btn-primary">저장</button>
          <button type="button" class="btn-secondary" data-action="cancel-edit">취소</button>
        </div>
      </form>
    </section>
  `;

  const form = container.querySelector('#character-edit-form');
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
  // S85 (2026-05-17): prefill된 birth가 있으면 즉시 미리보기 호출.
  if (birthInput.value) refreshPreview();

  form.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => {
    if (typeof onCancel === 'function') onCancel();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name')).trim();
    const birth = String(fd.get('birth'));

    const zodiac = zodiacFromBirthDate(birth);
    if (!zodiac) {
      preview.textContent = '생년월일을 정확히 입력해주세요';
      return;
    }

    const birthYear = parseInt(birth.slice(0, 4), 10);
    const animalSign = Number.isInteger(birthYear) ? yearToAnimalSign(birthYear) : character.animalSign;
    const dayPillar = dateToDayPillar(birth);

    // seed / id / createdAt / history / savedSets / lastUsedStrategies 보존. (S089 luck 자산 폐기.)
    // S85: birth도 새 값으로 갱신 (다음 편집 시 prefill 보장).
    const updated = {
      ...character,
      name,
      birth,
      animalSign,
      zodiac,
      dayPillar,
    };
    onUpdated(updated);
  });
}
