// 모달 / 면책 안내. render/는 DOM 사용 OK.
// SSOT: docs/01_spec.md 4.1 (첫 진입 면책).

const DISCLAIMER_HTML = `
  <h2>잠깐, 알림</h2>
  <p>본 추천은 <strong>참고용</strong>입니다.</p>
  <p>로또 6/45는 매 회차 독립 시행이며, 모든 조합의 당첨 확률은 <strong>1/8,145,060</strong>로 동일합니다.</p>
  <p>이 게임은 캐릭터 시드와 통계를 활용한 <em>선택의 서사화</em>를 목적으로 하며, 당첨 확률을 높이지 않습니다.</p>
  <p class="modal-note">책임 도박이 의심되면 <a href="https://www.kcgp.or.kr/" target="_blank" rel="noopener">한국도박문제예방치유원</a>의 도움을 받으세요.</p>
  <button type="button" class="modal-confirm" data-action="confirm">이해했습니다</button>
`;

function ensureContainer() {
  let el = document.getElementById('modal-root');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'modal-root';
  document.body.appendChild(el);
  return el;
}

/**
 * 모달 표시.
 * @param {string} html innerHTML 본문
 * @param {{ onConfirm?: () => void, dismissible?: boolean }} [opts]
 * @returns {() => void} close 함수. 외부에서 호출하여 모달 닫기 가능.
 */
export function showModal(html, opts = {}) {
  const root = ensureContainer();
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card" role="dialog" aria-modal="true" tabindex="-1">
        ${html}
      </div>
    </div>
  `;
  root.classList.add('is-open');

  // 모달 카드에 포커스 (스크린 리더 / 키보드 사용자)
  const card = root.querySelector('.modal-card');
  if (card) card.focus();

  function close() {
    root.classList.remove('is-open');
    root.innerHTML = '';
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Enter') {
      const confirmBtn = root.querySelector('[data-action="confirm"]');
      if (confirmBtn) confirmBtn.click();
    }
  }
  document.addEventListener('keydown', onKey);

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.action === 'confirm') {
      close();
      if (opts.onConfirm) opts.onConfirm();
    } else if (opts.dismissible && t.classList.contains('modal-backdrop')) {
      close();
    }
  });

  return close;
}

/**
 * 면책 모달.
 * @param {() => void} onConfirm 확인 클릭 시 호출
 */
export function showDisclaimer(onConfirm) {
  showModal(DISCLAIMER_HTML, { onConfirm });
}
