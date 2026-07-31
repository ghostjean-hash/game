/* 공용 전체화면 제어 (게임 공통).
 *
 * 배경: 브라우저는 전체화면을 "언제든 스스로 끝낼 수 있는 임시 상태"로 다룬다. 특히 아이패드에서는
 *   Safari·Chrome 모두 조작 중 화면 가장자리 스와이프·여러 손가락 제스처·회전만으로도 해제된다.
 *   기존 구현은 해제를 알아채지 못해 한 번 풀리면 사용자가 버튼을 다시 눌러야 했다.
 *
 * 처방 셋:
 *   1) 홈 화면 앱으로 실행 중이면 브라우저 껍데기가 애초에 없다 - 버튼을 감춘다(눌러봐야 의미 없음).
 *   2) 사용자가 켠 상태를 기억해 두고, 브라우저가 임의로 해제하면 다음 조작(손 뗌·키 입력) 때 조용히 되돌린다.
 *      전체화면 진입은 사용자 조작 안에서만 허용되는 브라우저 규격이라 조작 없는 즉시 복귀는 불가능하다.
 *      "한 번 더 만지면 알아서 돌아온다"가 규격상 상한이다.
 *   3) 전체화면 자체가 막힌 기기(아이폰 - 애플이 동영상 외 전체화면을 열지 않았고, 아이폰의 모든
 *      브라우저는 Safari 엔진을 쓰도록 강제돼 Chrome으로 바꿔도 같다)에서는 버튼을 조용히 감추지 않는다.
 *      감추면 사용자는 "왜 없지"로 끝난다 - 유일하게 통하는 길(홈 화면에 추가)을 화면에서 알려준다.
 *
 * 아이패드 Chrome은 내부 엔진이 Safari와 같아 동작·한계가 동일하다. 접두사(webkit) 계열 API도 함께 다룬다.
 */

// 복귀 시도가 계속 거절당하면 조작을 방해하지 않도록 포기한다. 한 번이라도 성공하면 예산을 되돌린다.
const RESTORE_ATTEMPT_LIMIT = 3;

// 안내를 본 사실은 기기에 남긴다(매 방문 반복 노출 금지). 버튼을 누르면 언제든 다시 볼 수 있다.
const HINT_SEEN_KEY = 'gg.fullscreen-hint-seen';
const HINT_ELEMENT_ID = 'gg-fullscreen-hint';

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

// ── 홈 화면 추가 안내 (전체화면이 막힌 기기용) ──

function seenHint() {
  try { return window.localStorage.getItem(HINT_SEEN_KEY) === '1'; } catch { return false; }
}
function markHintSeen() {
  try { window.localStorage.setItem(HINT_SEEN_KEY, '1'); } catch { /* 저장 거부 브라우저 - 매번 보여도 닫으면 된다 */ }
}

/** 기기·브라우저에 맞는 안내 문구. 경로가 브라우저마다 달라 그대로 읽고 따라할 수 있게 나눈다. */
export function homeScreenHintText() {
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && (window.navigator.maxTouchPoints || 0) > 1);
  if (isIOS) {
    // 아이폰의 Chrome·Firefox·Edge는 겉모습만 다르고 엔진이 Safari라 전체화면 제약도 같다.
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) {
      return {
        title: '전체화면으로 놀기',
        body: '아이폰에서는 브라우저가 전체화면을 막아둡니다. 주소창 옆 메뉴에서 공유 → "홈 화면에 추가"로 아이콘을 만들면, 그 아이콘으로 열 때는 주소창 없이 꽉 찬 화면이 됩니다. 사파리에서 열면 더 확실합니다.',
      };
    }
    return {
      title: '전체화면으로 놀기',
      body: '아이폰에서는 브라우저가 전체화면을 막아둡니다. 화면 아래 공유 버튼 → "홈 화면에 추가"로 아이콘을 만들면, 그 아이콘으로 열 때는 주소창 없이 꽉 찬 화면이 됩니다.',
    };
  }
  return {
    title: '전체화면으로 놀기',
    body: '이 브라우저는 전체화면 전환을 지원하지 않습니다. 브라우저 메뉴에서 "홈 화면에 추가"(또는 "앱 설치")를 하면 주소창 없이 꽉 찬 화면으로 실행됩니다.',
  };
}

function injectHintStyle() {
  if (document.getElementById(HINT_ELEMENT_ID + '-style')) return;
  const style = document.createElement('style');
  style.id = HINT_ELEMENT_ID + '-style';
  // 게임마다 테마가 달라(다크·파스텔) 공용 토큰에 기대지 않고 자체 색으로 어디서나 읽히게 한다.
  style.textContent = `
#${HINT_ELEMENT_ID} {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 9999; width: min(420px, calc(100vw - 24px));
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; border-radius: 14px;
  background: rgba(16, 18, 26, 0.94); color: #f2f4f8;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  font: 400 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  animation: gg-fs-hint-in 220ms ease;
}
#${HINT_ELEMENT_ID} .gg-fs-hint-text { flex: 1; }
#${HINT_ELEMENT_ID} strong { display: block; margin-bottom: 3px; font-size: 14px; font-weight: 700; }
#${HINT_ELEMENT_ID} button {
  flex: none; width: 28px; height: 28px; border-radius: 8px; cursor: pointer;
  background: rgba(255, 255, 255, 0.12); color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 15px; line-height: 1;
}
@keyframes gg-fs-hint-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;
  document.head.appendChild(style);
}

/**
 * 홈 화면 추가 안내를 화면 아래 띠로 띄운다. 조작을 가리지 않도록 작게, 닫을 때까지 유지한다.
 * @param {object} [options]
 * @param {boolean} [options.once] 이미 본 사용자에게는 띄우지 않는다(첫 방문 안내용).
 */
export function showHomeScreenHint(options = {}) {
  const { once = false } = options;
  if (once && seenHint()) return false;
  if (document.getElementById(HINT_ELEMENT_ID)) return false;
  if (!document.body) return false;

  injectHintStyle();
  const { title, body } = homeScreenHintText();
  const box = document.createElement('div');
  box.id = HINT_ELEMENT_ID;
  box.setAttribute('role', 'status');

  const text = document.createElement('div');
  text.className = 'gg-fs-hint-text';
  const strong = document.createElement('strong');
  strong.textContent = title;
  text.appendChild(strong);
  text.appendChild(document.createTextNode(body));

  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', '안내 닫기');
  close.textContent = '×';
  close.addEventListener('click', () => { markHintSeen(); box.remove(); });

  box.appendChild(text);
  box.appendChild(close);
  document.body.appendChild(box);
  markHintSeen();
  return true;
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

  // 홈 화면 앱은 껍데기가 없어 버튼이 의미 없다.
  if (standalone) {
    if (button) button.hidden = true;
    if (onChange) onChange(true);
    return { isActive: () => true, destroy() {} };
  }

  // 전체화면이 막힌 기기(아이폰 등). 버튼을 감추면 사용자는 이유를 알 수 없다 -
  // 버튼을 남겨 누르면 유일하게 통하는 길(홈 화면에 추가)을 안내한다.
  if (!supported) {
    const openHint = () => showHomeScreenHint();
    if (button) {
      button.hidden = false;
      button.setAttribute('aria-label', '전체화면으로 놀기');
      button.addEventListener('click', openHint);
    }
    if (onChange) onChange(false);
    return {
      isActive: () => false,
      destroy() { button?.removeEventListener('click', openHint); },
    };
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
