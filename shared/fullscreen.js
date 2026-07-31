/* 공용 전체화면 제어 (게임 공통).
 *
 * 배경: 브라우저는 전체화면을 "언제든 스스로 끝낼 수 있는 임시 상태"로 다룬다. 특히 아이패드에서는
 *   Safari·Chrome 모두 조작 중 화면 가장자리 스와이프·여러 손가락 제스처·회전만으로도 해제된다.
 *   기존 구현은 해제를 알아채지 못해 한 번 풀리면 사용자가 버튼을 다시 눌러야 했다.
 *
 * 처방 둘:
 *   1) 홈 화면 앱으로 실행 중이면 브라우저 껍데기가 애초에 없다 - 버튼을 감춘다(눌러봐야 의미 없음).
 *   2) 사용자가 켠 상태를 기억해 두고, 브라우저가 임의로 해제하면 다음 조작(손 뗌·키 입력) 때 조용히 되돌린다.
 *      전체화면 진입은 사용자 조작 안에서만 허용되는 브라우저 규격이라 조작 없는 즉시 복귀는 불가능하다.
 *      "한 번 더 만지면 알아서 돌아온다"가 규격상 상한이다.
 *
 * 아이패드 Chrome은 내부 엔진이 Safari와 같아 동작·한계가 동일하다. 접두사(webkit) 계열 API도 함께 다룬다.
 */

// 복귀 시도가 계속 거절당하면 조작을 방해하지 않도록 포기한다. 한 번이라도 성공하면 예산을 되돌린다.
const RESTORE_ATTEMPT_LIMIT = 3;

const root = document.documentElement;

/** 홈 화면 앱(브라우저 껍데기 없이 실행)인가. iOS는 navigator.standalone, 그 외는 display-mode로 판별. */
export function isStandaloneDisplay() {
  if (window.navigator.standalone === true) return true;
  const mm = window.matchMedia;
  if (!mm) return false;
  return ['fullscreen', 'standalone', 'minimal-ui'].some((mode) => mm.call(window, `(display-mode: ${mode})`).matches);
}

/** 이 브라우저가 전체화면 전환 자체를 지원하는가(아이폰 Safari 등은 미지원). */
export function isFullscreenSupported() {
  return !!(root.requestFullscreen || root.webkitRequestFullscreen);
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function enterFullscreen() {
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!req) return Promise.reject(new Error('fullscreen unsupported'));
  try {
    // 구형 webkit 계열은 Promise를 돌려주지 않는다 - resolve로 감싸 호출부를 하나로 맞춘다.
    return Promise.resolve(req.call(root));
  } catch (err) {
    return Promise.reject(err);
  }
}

function leaveFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!exit) return;
  try { exit.call(document); } catch { /* 이미 해제된 상태 */ }
}

/**
 * 전체화면 버튼을 배선하고 자동 복귀를 켠다.
 * @param {object} options
 * @param {HTMLElement|null} options.button 토글 버튼(없으면 자동 복귀만 동작)
 * @param {(active: boolean) => void} [options.onChange] 상태가 바뀔 때 호출(화면 재배치 등)
 */
export function setupFullscreen(options = {}) {
  const { button = null, onChange = null } = options;
  const standalone = isStandaloneDisplay();
  const supported = isFullscreenSupported();

  // 홈 화면 앱은 이미 껍데기가 없고, 미지원 브라우저는 눌러도 아무 일이 없다 - 둘 다 버튼을 감춘다.
  if (standalone || !supported) {
    if (button) button.hidden = true;
    if (onChange) onChange(standalone);
    return { isActive: () => standalone, destroy() {} };
  }

  let wanted = false;         // 사용자가 전체화면을 원하는 상태인가
  let restorePending = false; // 브라우저가 임의로 해제해 복귀를 기다리는 중인가
  let requesting = false;     // 요청 진행 중(손 뗌 이벤트가 겹쳐 이중 요청되는 것 방지)
  let attemptsLeft = RESTORE_ATTEMPT_LIMIT;

  const sync = () => {
    const active = !!fullscreenElement();
    if (button) {
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? '전체화면 끄기' : '전체화면');
    }
    if (onChange) onChange(active);
  };

  const onFullscreenChange = () => {
    if (fullscreenElement()) {
      restorePending = false;
      attemptsLeft = RESTORE_ATTEMPT_LIMIT;
    } else if (wanted) {
      restorePending = true; // 사용자가 끈 게 아니다 = 브라우저가 임의로 끝냈다
    }
    sync();
  };

  const tryRestore = () => {
    if (!restorePending || requesting || fullscreenElement()) return;
    if (attemptsLeft <= 0) { restorePending = false; return; }
    attemptsLeft -= 1;
    requesting = true;
    enterFullscreen()
      .then(() => { requesting = false; })
      .catch(() => {
        // 브라우저가 거절하면 조용히 넘긴다 - 게임 조작을 방해하지 않는 것이 우선.
        requesting = false;
        if (attemptsLeft <= 0) restorePending = false;
      });
  };

  const onKeyDown = (e) => {
    // ESC는 사용자가 직접 끈 것 - 되돌리면 안 된다.
    if (e.key === 'Escape' && fullscreenElement()) {
      wanted = false;
      restorePending = false;
      return;
    }
    tryRestore();
  };

  const toggle = () => {
    if (fullscreenElement()) {
      wanted = false;
      restorePending = false;
      leaveFullscreen();
      return;
    }
    wanted = true;
    attemptsLeft = RESTORE_ATTEMPT_LIMIT;
    requesting = true;
    enterFullscreen()
      .then(() => { requesting = false; })
      .catch(() => { requesting = false; wanted = false; });
  };

  button?.addEventListener('click', toggle);
  if (button) button.hidden = false;

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  // 손을 뗀 순간에 되돌린다(드래그 도중 화면이 바뀌면 조작이 튄다). capture+passive라 게임 입력을 가로채지 않는다.
  window.addEventListener('pointerup', tryRestore, { capture: true, passive: true });
  window.addEventListener('touchend', tryRestore, { capture: true, passive: true });
  window.addEventListener('keydown', onKeyDown, true);

  sync();

  return {
    isActive: () => !!fullscreenElement(),
    destroy() {
      button?.removeEventListener('click', toggle);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      window.removeEventListener('pointerup', tryRestore, { capture: true });
      window.removeEventListener('touchend', tryRestore, { capture: true });
      window.removeEventListener('keydown', onKeyDown, true);
    },
  };
}
