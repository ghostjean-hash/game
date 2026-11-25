/* planning-doc.js - 기획서 HTML 목차 4기능 (standards/planning-deliverable-standard.md §6.4)
   섹션 앵커 자동 생성 + 현재 위치 하이라이트(scroll-spy) + 폭 드래그 리사이즈 + 폭 저장·복원.
   리사이즈·저장은 skills/side-panel/side-panel.js의 initSidePanel을 재사용한다(손수 재구현 금지).
   임베드 모드(?embed=1): 통합 셸(§8)이 iframe으로 넣을 때 자체 목차를 숨긴다(§8.3). */
(function (global) {
  'use strict';

  function resolve(el) {
    if (!el) return null;
    if (typeof el === 'string') return document.querySelector(el);
    return el.nodeType ? el : null;
  }

  // 목차에 보일 글자. 승격 지면(#459)에서 절 번호는 제목(h2) 밖 형제 자리(.sechead > .n)에 있어
  // 제목 글자만 쓰면 목차에서 번호가 사라진다. 번호 자리가 있으면 앞에 붙여 준다.
  // h3는 번호(.sn)가 제목 안에 있어 그대로 읽으면 된다.
  function labelOf(h) {
    var text = (h.textContent || '').trim();
    var prev = h.previousElementSibling;
    if (prev && /(^|\s)n(\s|$)/.test(prev.className || '')) {
      var num = (prev.textContent || '').trim();
      if (num) return num + ' ' + text;
    }
    return text;
  }

  // opts:
  //   content   본문 컨테이너 (기본 '.pd-body')
  //   nav       목차 링크를 채울 컨테이너 (기본 '.pd-toc')
  //   sidebar   사이드바 요소 (기본 '.pd-side')
  //   handle    리사이즈 손잡이 (기본 '.pd-handle')
  //   headings  목차 대상 셀렉터 (기본 'h2, h3')
  //   storageKey 폭 저장 localStorage 키 (권장, 문서마다 고유)
  //   min/max   폭 클램프 (기본 220/480 - side-panel 기본과 동일)
  function initPlanningDoc(opts) {
    opts = opts || {};
    var content = resolve(opts.content || '.pd-body');
    var nav = resolve(opts.nav || '.pd-toc');
    var sidebar = resolve(opts.sidebar || '.pd-side');
    var handle = resolve(opts.handle || '.pd-handle');
    if (!content || !nav) {
      if (global.console) console.warn('[planning-doc] content/nav 요소를 찾지 못함 - 목차 생략');
      return null;
    }

    // 0. 임베드 모드 - 통합 셸이 iframe으로 품을 때 자체 목차 숨김 (§8.3)
    var embed = opts.embed === true || /[?&]embed=1\b/.test(global.location.search || '');
    if (embed) document.documentElement.classList.add('pd-embed');

    // 1. 섹션 앵커 + 목차 생성
    var heads = Array.prototype.slice.call(content.querySelectorAll(opts.headings || 'h2, h3'));
    var links = [];
    heads.forEach(function (h, i) {
      if (!h.id) {
        var base = (h.textContent || '').trim().toLowerCase()
          .replace(/\s+/g, '-').replace(/[^\w가-힣.-]/g, '') || 'sec';
        var id = base, n = 2;
        while (document.getElementById(id)) { id = base + '-' + n++; }
        h.id = id;
      }
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = labelOf(h);
      a.className = 'pd-toc-' + h.tagName.toLowerCase();
      nav.appendChild(a);
      links.push({ a: a, h: h });
    });

    // 2. 현재 위치 하이라이트 (scroll-spy) - 화면 상단 기준선을 지난 마지막 제목
    //    맨 위(기준선을 지난 제목 없음)는 첫 항목, 바닥에 닿으면 마지막 항목을 강조한다.
    //    마지막 절들이 짧으면 끝까지 내려도 기준선에 못 닿아 앞 절에 머물기 때문이다.
    //    목차를 눌러 이동했으면 바닥 규칙보다 누른 항목이 먼저다(휠·터치·키 입력이 오면 해제).
    var OFFSET = 90;
    var activeIdx = -1;
    var clickedIdx = -1;
    links.forEach(function (l, i) {
      l.a.addEventListener('click', function () { clickedIdx = i; });
    });
    function releaseClick() { clickedIdx = -1; }
    ['wheel', 'touchstart', 'keydown'].forEach(function (t) {
      global.addEventListener(t, releaseClick, { passive: true });
    });
    function spy() {
      var idx = -1;
      for (var i = 0; i < links.length; i++) {
        if (links[i].h.getBoundingClientRect().top <= OFFSET) idx = i;
        else break;
      }
      if (links.length) {
        var y = global.pageYOffset || document.documentElement.scrollTop || 0;
        var atBottom = y > 0 && global.innerHeight + y >= document.documentElement.scrollHeight - 2;
        if (atBottom) {
          var c = clickedIdx >= 0 ? links[clickedIdx].h.getBoundingClientRect() : null;
          idx = c && c.top >= 0 && c.top < global.innerHeight ? clickedIdx : links.length - 1;
        }
        if (idx < 0) idx = 0;
      }
      if (idx === activeIdx) return;
      if (activeIdx >= 0) links[activeIdx].a.classList.remove('active');
      if (idx >= 0) {
        links[idx].a.classList.add('active');
        // 목차가 길면 활성 항목이 보이게 따라 스크롤
        if (sidebar && links[idx].a.scrollIntoView) {
          var r = links[idx].a.getBoundingClientRect();
          var sr = sidebar.getBoundingClientRect();
          if (r.top < sr.top || r.bottom > sr.bottom) links[idx].a.scrollIntoView({ block: 'nearest' });
        }
      }
      activeIdx = idx;
    }
    global.addEventListener('scroll', spy, { passive: true });
    spy();

    // 3+4. 폭 드래그 리사이즈 + 저장·복원 - side-panel 스킬 재사용
    var panel = null;
    if (!embed && sidebar && handle && typeof global.initSidePanel === 'function') {
      panel = global.initSidePanel({
        panel: sidebar,
        handle: handle,
        storageKey: opts.storageKey,
        cssVar: '--nav-w',
        min: opts.min || 220,
        max: opts.max || 480,
        side: 'left'
      });
    } else if (!embed && (!global.initSidePanel) && global.console) {
      console.warn('[planning-doc] side-panel.js 미포함 - 폭 조절·저장 없이 동작(표준 §6.4는 4기능 요구)');
    }

    return { tocCount: links.length, embed: embed, panel: panel, refreshSpy: spy };
  }

  // 원 안 숫자 잉크 중심 맞추기 (결정 dec-38, 설계 plans/design-2026-11-14-batch-four.md 4.3)
  // CSS 가운데 맞춤은 글자 상자를 원 가운데 둘 뿐이라 숫자 모양(잉크)은 글꼴 기준선 · 글자 여백만큼 밀린다.
  // 게다가 HTML 글자는 세로 위치가 픽셀 단위로 끊겨 그려져, 원이 놓인 소수점 자리에 따라 1px 까지 더 어긋난다
  // (2026-11-14 견본 실측 - 여백으로 옮기는 방식은 14개 중 7개가 0.5px 초과). 그래서 숫자마다 캔버스 글자 측정으로
  // 잉크 상자를 구해, 원 위에 SVG 글자를 그 좌표로 얹고 원래 글자는 투명하게 둔다(card_game_rulebook centerDigits
  // 와 같은 식, SVG 글자는 소수점 위치에 그려진다). 문서 마크업은 그대로이고, 스크립트가 없으면 종전 모습 그대로다.
  // 확인: node skills/concentric-check/digit-center.mjs (0.5px 이내)
  var DIGIT_TARGETS = [
    { sel: '.pd-body .pin' },
    { sel: '.pd-body .legend .p' },
    { sel: '.pd-body .chain .cx', pseudo: '::before' }
  ];
  var digitCtx = null;

  // 측정은 큰 글자(MEASURE_PX)로 하고 실제 크기로 줄인다 - 브라우저가 잉크 상자를 정수 px 로 돌려줘서
  // 11px 글자를 그대로 재면 0.5px 까지 틀린다.
  var MEASURE_PX = 200;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // 원 가운데(cx, cy)에 잉크 가운데가 오도록 SVG 글자의 x · y(기준선 시작점)를 구한다.
  function inkOrigin(cs, text, cx, cy) {
    if (!digitCtx) digitCtx = document.createElement('canvas').getContext('2d');
    var size = parseFloat(cs.fontSize);
    if (!(size > 0)) return null;
    var k = size / MEASURE_PX;
    digitCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + MEASURE_PX + 'px ' + cs.fontFamily;
    digitCtx.textAlign = 'left';
    digitCtx.textBaseline = 'alphabetic';
    var m = digitCtx.measureText(text);
    if (!m || m.actualBoundingBoxAscent === undefined) return null;
    // 잉크는 x - 왼쪽 ~ x + 오른쪽, y - 위 ~ y + 아래에 놓인다
    return {
      x: cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) * k / 2,
      y: cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * k / 2
    };
  }

  // host 안에 SVG 글자 한 겹을 두고(있으면 다시 쓴다) box(host 기준 left · top · width · height) 가운데에 맞춘다.
  function placeDigit(host, cs, text, box) {
    var o = inkOrigin(cs, text, box.width / 2, box.height / 2);
    if (!o) return false;
    var svg = null;
    for (var i = 0; i < host.children.length; i++) {
      if (host.children[i].classList && host.children[i].classList.contains('dg-svg')) { svg = host.children[i]; break; }
    }
    if (!svg) {
      svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'dg-svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS(SVG_NS, 'text'));
      host.appendChild(svg);
    }
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    svg.style.left = box.left + 'px';
    svg.style.top = box.top + 'px';
    var t = svg.firstChild;
    t.textContent = text;
    t.setAttribute('x', o.x.toFixed(3));
    t.setAttribute('y', o.y.toFixed(3));
    t.setAttribute('fill', cs.color);
    t.style.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    t.style.letterSpacing = cs.letterSpacing;
    return true;
  }

  function centerCircleDigits(root) {
    root = root || document;
    DIGIT_TARGETS.forEach(function (t) {
      Array.prototype.forEach.call(root.querySelectorAll(t.sel), function (el) {
        // 다시 돌 때(글꼴 로드 뒤 · 인쇄 직전)는 원래 글자가 이미 투명이라, 표시를 잠시 떼고 원래 색을 읽는다
        var mark = t.pseudo ? 'dg-pseudo' : 'dg-on';
        el.classList.remove(mark);
        var cs = global.getComputedStyle(el, t.pseudo || null);
        var text, box;
        if (t.pseudo) {
          // 흐름 칸 번호는 CSS 가 센다(counter) - 같은 흐름 안 몇 번째 칸인지로 숫자를 얻는다.
          // 원(::before)은 칸의 첫 칸(왼쪽 위, 테두리 + 안쪽 여백 안)에 놓인다.
          var sibs = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('cx'); }) : [el];
          text = String(sibs.indexOf(el) + 1);
          var hs = global.getComputedStyle(el);
          box = { left: parseFloat(hs.paddingLeft), top: parseFloat(hs.paddingTop), width: parseFloat(cs.width), height: parseFloat(cs.height) };
        } else {
          var own = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : el.getAttribute('data-dg-text');
          text = (own || '').trim();
          // 안쪽(테두리 안) 상자 - SVG 는 절대 배치라 안쪽 여백 상자 기준으로 놓인다
          box = { left: 0, top: 0, width: el.clientWidth, height: el.clientHeight };
        }
        if (!text || !(box.width > 0) || !(box.height > 0)) return;
        if (!placeDigit(el, cs, text, box)) return;
        el.classList.add(t.pseudo ? 'dg-pseudo' : 'dg-on');
      });
    });
  }

  function runDigits() { try { centerCircleDigits(); } catch (e) { /* 표시를 막지 않는다 */ } }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runDigits);
    else runDigits();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(runDigits);
    global.addEventListener('beforeprint', runDigits);
  }

  global.initPlanningDoc = initPlanningDoc;
  global.centerCircleDigits = centerCircleDigits;
})(typeof window !== 'undefined' ? window : this);
