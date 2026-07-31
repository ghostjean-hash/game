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

// 단계 그림. 글만 있으면 일반 사용자가 어느 버튼인지 못 찾는다 - 눌러야 할 버튼 모양을 그대로 그린다.
// 외부 파일 없이 인라인 SVG라 오프라인에서도 뜬다.
const HINT_ICONS = {
  // iOS 공유 버튼(사각형에서 위로 나오는 화살표)
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11"/><path d="M8 7l4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  // 브라우저 메뉴(점 세 개)
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>',
  // 홈 화면에 추가(사각형 안 더하기)
  add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8.5v7"/><path d="M8.5 12h7"/></svg>',
  // 홈 화면의 앱 아이콘(폰 안에 놓인 아이콘 하나)
  app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="3"/><rect x="8.5" y="6.5" width="7" height="7" rx="2" fill="currentColor" stroke="none"/><path d="M9.5 17.5h5"/></svg>',
};

/**
 * 기기·브라우저에 맞는 3단계 안내. 눌러야 할 버튼 위치가 브라우저마다 달라 그림·문구·화살표 방향을 함께 바꾼다.
 * pointer: 'bottom' = 화면 아래 도구 모음을 가리킴, 'top' = 화면 위 주소창을 가리킴, null = 가리킬 위치를 특정할 수 없음.
 */
export function homeScreenHintGuide() {
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && (window.navigator.maxTouchPoints || 0) > 1);
  const lastStep = { icon: 'app', label: '생긴 아이콘으로 열기', text: '주소창 없이 꽉 찬 화면이 됩니다' };

  if (isIOS && /CriOS|FxiOS|EdgiOS/.test(ua)) {
    // 아이폰의 크롬·파이어폭스·엣지는 겉모습만 다르고 엔진이 사파리라 제약이 같다. 다만 버튼 위치가 다르다.
    return {
      title: '전체화면으로 놀기',
      lead: '3단계만 하면 됩니다',
      steps: [
        { icon: 'dots', label: '주소창 오른쪽 메뉴', text: '점 세 개 버튼을 누릅니다' },
        { icon: 'add', label: '공유 → 홈 화면에 추가', text: '목록을 아래로 밀면 나옵니다' },
        lastStep,
      ],
      pointer: 'top',
      note: '사파리에서 열면 더 간단합니다',
    };
  }
  if (isIOS) {
    return {
      title: '전체화면으로 놀기',
      lead: '3단계만 하면 됩니다',
      steps: [
        { icon: 'share', label: '공유 버튼', text: '화면 맨 아래 가운데에 있습니다' },
        { icon: 'add', label: '홈 화면에 추가', text: '목록을 아래로 밀면 나옵니다' },
        lastStep,
      ],
      pointer: 'bottom',
      note: '',
    };
  }
  return {
    title: '전체화면으로 놀기',
    lead: '이 브라우저는 전체화면 버튼을 지원하지 않습니다',
    steps: [
      { icon: 'dots', label: '브라우저 메뉴', text: '점 세 개 또는 줄 세 개 버튼' },
      { icon: 'add', label: '홈 화면에 추가 · 앱 설치', text: '메뉴 목록에서 찾습니다' },
      lastStep,
    ],
    pointer: null,
    note: '',
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
  z-index: 9999; width: min(360px, calc(100vw - 24px));
  padding: 14px 16px 12px; border-radius: 18px;
  background: rgba(14, 16, 24, 0.96); color: #f2f4f8;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  font: 400 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  animation: gg-fs-hint-in 240ms ease;
}
/* 화살표가 카드 밖 여백에 놓이므로 그만큼(약 34px) 화면 끝에서 띄운다 - 붙이면 화살표가 화면 밖으로 나간다. */
#${HINT_ELEMENT_ID}.at-bottom { bottom: calc(48px + env(safe-area-inset-bottom, 0px)); }
#${HINT_ELEMENT_ID}.at-top { top: calc(48px + env(safe-area-inset-top, 0px)); }
#${HINT_ELEMENT_ID} .gg-fs-head { display: flex; align-items: flex-start; gap: 10px; }
#${HINT_ELEMENT_ID} .gg-fs-title { flex: 1; font-size: 15px; font-weight: 700; }
#${HINT_ELEMENT_ID} .gg-fs-lead { margin-top: 2px; font-size: 12px; font-weight: 400; color: rgba(242, 244, 248, 0.7); }
#${HINT_ELEMENT_ID} .gg-fs-close {
  flex: none; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  background: rgba(255, 255, 255, 0.1); color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.16); font-size: 16px; line-height: 1;
}
#${HINT_ELEMENT_ID} ol { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 9px; }
#${HINT_ELEMENT_ID} li { display: flex; align-items: center; gap: 10px; }
#${HINT_ELEMENT_ID} .gg-fs-num {
  flex: none; width: 20px; height: 20px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.14); font-size: 11px; font-weight: 700;
}
#${HINT_ELEMENT_ID} .gg-fs-icon {
  flex: none; width: 38px; height: 38px; border-radius: 11px;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.14);
}
#${HINT_ELEMENT_ID} .gg-fs-icon svg { width: 22px; height: 22px; }
#${HINT_ELEMENT_ID} .gg-fs-step-label { font-size: 13.5px; font-weight: 600; }
#${HINT_ELEMENT_ID} .gg-fs-step-text { font-size: 11.5px; color: rgba(242, 244, 248, 0.66); }
#${HINT_ELEMENT_ID} .gg-fs-note { margin-top: 10px; font-size: 11.5px; color: rgba(242, 244, 248, 0.6); }
#${HINT_ELEMENT_ID} .gg-fs-ok {
  margin-top: 12px; width: 100%; padding: 9px 0; border-radius: 11px; cursor: pointer;
  background: #f2f4f8; color: #14161c; border: 0; font-size: 13.5px; font-weight: 700;
}
/* 눌러야 할 도구 모음 쪽을 화살표로 직접 가리킨다(브라우저 UI는 페이지 밖이라 화면 끝을 향한다). */
#${HINT_ELEMENT_ID} .gg-fs-arrow {
  position: absolute; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 3px 9px 4px; border-radius: 999px;
  font-size: 11px; font-weight: 700; color: #f2f4f8;
  /* 밝은 화면(허브)에서도 보이도록 자체 배경을 깐다 - 글자에 그림자만 주면 흰 배경에서 묻힌다. */
  background: rgba(14, 16, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.16);
}
/* 사파리 공유 버튼은 아래 도구 모음 가운데, 아이폰 크롬 메뉴는 주소창 오른쪽 - 화살표도 그 자리를 가리킨다. */
#${HINT_ELEMENT_ID}.at-bottom .gg-fs-arrow { bottom: -34px; animation: gg-fs-arrow-down 1.4s ease-in-out infinite; }
#${HINT_ELEMENT_ID}.at-top .gg-fs-arrow {
  top: -34px; left: auto; right: 10px; transform: none;
  flex-direction: column-reverse; animation: gg-fs-arrow-up 1.4s ease-in-out infinite;
}
#${HINT_ELEMENT_ID} .gg-fs-arrow svg { width: 18px; height: 18px; }
@keyframes gg-fs-hint-in { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes gg-fs-arrow-down { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 5px); } }
/* 위쪽 화살표는 오른쪽 정렬이라 가로 보정 없이 세로로만 움직인다. */
@keyframes gg-fs-arrow-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@media (prefers-reduced-motion: reduce) {
  #${HINT_ELEMENT_ID}, #${HINT_ELEMENT_ID} .gg-fs-arrow { animation: none; }
}
`;
  document.head.appendChild(style);
}

function makeIcon(name) {
  const wrap = document.createElement('span');
  wrap.className = 'gg-fs-icon';
  wrap.innerHTML = HINT_ICONS[name] || HINT_ICONS.add; // 내부 상수만 넣는다(외부 입력 없음)
  return wrap;
}

/**
 * 홈 화면 추가 안내를 3단계 그림 카드로 띄운다.
 * 글만으로는 일반 사용자가 어느 버튼인지 찾지 못하므로, 버튼 모양을 그리고 그 도구 모음 방향을 화살표로 가리킨다.
 * @param {object} [options]
 * @param {boolean} [options.once] 이미 본 사용자에게는 띄우지 않는다(첫 방문 안내용).
 */
export function showHomeScreenHint(options = {}) {
  const { once = false } = options;
  if (once && seenHint()) return false;
  if (document.getElementById(HINT_ELEMENT_ID)) return false;
  if (!document.body) return false;

  injectHintStyle();
  const guide = homeScreenHintGuide();
  const box = document.createElement('div');
  box.id = HINT_ELEMENT_ID;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', guide.title);
  // 가리킬 곳이 없으면(위치를 특정 못 하는 브라우저) 아래에 둔다.
  box.className = guide.pointer === 'top' ? 'at-top' : 'at-bottom';

  const head = document.createElement('div');
  head.className = 'gg-fs-head';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'gg-fs-title';
  titleWrap.textContent = guide.title;
  if (guide.lead) {
    const lead = document.createElement('div');
    lead.className = 'gg-fs-lead';
    lead.textContent = guide.lead;
    titleWrap.appendChild(lead);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'gg-fs-close';
  close.setAttribute('aria-label', '안내 닫기');
  close.textContent = '×';
  head.appendChild(titleWrap);
  head.appendChild(close);

  const list = document.createElement('ol');
  guide.steps.forEach((step, i) => {
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'gg-fs-num';
    num.textContent = String(i + 1);
    const body = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'gg-fs-step-label';
    label.textContent = step.label;
    const text = document.createElement('div');
    text.className = 'gg-fs-step-text';
    text.textContent = step.text;
    body.appendChild(label);
    body.appendChild(text);
    li.appendChild(num);
    li.appendChild(makeIcon(step.icon));
    li.appendChild(body);
    list.appendChild(li);
  });

  box.appendChild(head);
  box.appendChild(list);

  if (guide.note) {
    const note = document.createElement('div');
    note.className = 'gg-fs-note';
    note.textContent = guide.note;
    box.appendChild(note);
  }

  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'gg-fs-ok';
  ok.textContent = '알겠습니다';
  box.appendChild(ok);

  if (guide.pointer) {
    const arrow = document.createElement('div');
    arrow.className = 'gg-fs-arrow';
    const dir = guide.pointer === 'top'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5"/><path d="M6 11l6-6 6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v15"/><path d="M6 13l6 6 6-6"/></svg>';
    const label = document.createElement('span');
    label.textContent = '여기';
    arrow.innerHTML = dir;
    arrow.appendChild(label);
    box.appendChild(arrow);
  }

  const dismiss = () => { markHintSeen(); box.remove(); };
  close.addEventListener('click', dismiss);
  ok.addEventListener('click', dismiss);

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
