/* side-panel.js - 사이드 패널 폭 조절 + 폭 저장 (재사용 표준)
 *
 * initSidePanel(opts)로 사이드 패널에 "경계 드래그로 폭 조절 + localStorage 폭 유지"를 붙인다.
 * 의존성 0(순수 vanilla). 검증된 원형: hm_alpha index.html / gdd 리사이저 로직을 좌/우 패널·
 * 레이아웃 방식(grid CSS 변수 / flex 직접 width)에 독립적으로 일반화한 것.
 */
(function (global) {
  'use strict';

  function resolve(el) {
    return typeof el === 'string' ? document.querySelector(el) : el;
  }

  /* opts:
   *   panel      (필수) 폭을 조절할 패널 요소 또는 CSS 셀렉터
   *   handle     (필수) 드래그하는 경계 손잡이 요소 또는 셀렉터
   *   storageKey (권장) 폭을 저장할 localStorage 키. 페이지마다 고유하게. 없으면 저장·복원 비활성.
   *   side       'left' | 'right'  기본 'left' - 패널이 화면 어느 쪽인가(= 어느 경계를 끄는가)
   *   min, max   폭 클램프(px)      기본 220, 480
   *   cssVar     지정 시 이 CSS 변수(:root)에 폭을 반영(예 '--nav-w', grid 레이아웃용).
   *              생략 시 panel.style.width에 직접 반영(flex 레이아웃 등).
   *   default    저장값이 없을 때 적용할 초기 폭(px). 생략 시 현재 CSS 폭 유지.
   *   onResize   (옵션) 폭(px)이 바뀔 때마다 호출되는 콜백
   * 반환: { destroy(), setWidth(px), getWidth() } - 초기화 실패 시 null
   */
  function initSidePanel(opts) {
    opts = opts || {};
    var panel = resolve(opts.panel);
    var handle = resolve(opts.handle);
    if (!panel || !handle) {
      console.warn('[side-panel] panel/handle 요소를 찾지 못해 초기화 중단');
      return null;
    }
    if (!opts.storageKey) {
      console.warn('[side-panel] storageKey가 없어 폭 저장이 비활성화됩니다');
    }

    var MIN = opts.min != null ? opts.min : 220;
    var MAX = opts.max != null ? opts.max : 480;
    var side = opts.side === 'right' ? 'right' : 'left';
    var cssVar = opts.cssVar || null;
    var root = document.documentElement;

    function clamp(w) { return w < MIN ? MIN : (w > MAX ? MAX : w); }

    function apply(w) {
      w = clamp(w);
      if (cssVar) root.style.setProperty(cssVar, w + 'px');
      else panel.style.width = w + 'px';
      if (typeof opts.onResize === 'function') opts.onResize(w);
    }

    // 1) 저장된 폭 복원 (범위 벗어난 저장값은 clamp가 흡수)
    var saved = opts.storageKey ? parseInt(localStorage.getItem(opts.storageKey), 10) : NaN;
    if (!isNaN(saved)) apply(saved);
    else if (opts.default != null) apply(opts.default);

    // 2) 경계 드래그로 폭 조절
    var dragging = false;

    function onDown(e) {
      dragging = true;
      document.body.classList.add('side-panel-resizing');
      handle.classList.add('drag');
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      // 패널 경계 기준 폭 계산 - 좌측 패널은 왼쪽 경계~커서, 우측 패널은 커서~오른쪽 경계
      var rect = panel.getBoundingClientRect();
      var w = side === 'right' ? (rect.right - e.clientX) : (e.clientX - rect.left);
      apply(w);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('side-panel-resizing');
      handle.classList.remove('drag');
      // 실제 렌더된 폭을 측정해 저장(clamp·레이아웃 반영 후의 정확한 값)
      var cur = parseInt(getComputedStyle(panel).width, 10);
      if (opts.storageKey && !isNaN(cur)) localStorage.setItem(opts.storageKey, cur);
    }

    handle.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return {
      destroy: function () {
        handle.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      },
      setWidth: function (px) {
        apply(px);
        var cur = parseInt(getComputedStyle(panel).width, 10);
        if (opts.storageKey && !isNaN(cur)) localStorage.setItem(opts.storageKey, cur);
      },
      getWidth: function () { return parseInt(getComputedStyle(panel).width, 10); }
    };
  }

  global.initSidePanel = initSidePanel;
  if (typeof module !== 'undefined' && module.exports) module.exports = initSidePanel;
})(typeof window !== 'undefined' ? window : this);
