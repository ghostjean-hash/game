// 시작 흐름 공용 프레임 - 진행 맵 화면 (기획서 Ⅲ권 4.3, 설계 design-2026-09-06-platform-progress.md 4장).
//
// 선택 화면(SCREEN.SELECT) 안에 진행을 그린다. 게임마다 넷으로 갈려 있던 화면을 하나로 모은다.
//
// 공용이 그리는 것 - 갈래 탭 · 출처 한 줄 · 요약 줄 · 묶음별 칩 격자 · 칩 하나(번호·별·
// 깬 표시·지금 위치·자물쇠). 게임은 칩 안에 무엇을 그릴지만 바꿀 수 있다.
//
// 갈래 고르기 규칙 - 탭은 **미리 보기만** 한다. 그 갈래의 판을 골랐을 때 전환이 확정되고,
// 보다가 그냥 나가면 갈래가 바뀌지 않는다(러시아워가 쓰던 방식을 규격으로 삼았다).
//
// 겉모습을 한 가지로 고정하지 않는다 - 게임이 직접 그리는 갈래는 자리만 있고 아직 없다(4.5).

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function mountMapScreen({
  parent,
  progress,
  onPick = null,
  onBack = null,
  title = '',
  renderChip = null,
  label = null,
  toast = null,
  lockedText = '아직 열리지 않았어요',
} = {}) {
  if (!parent) throw new Error('mountMapScreen: parent required');
  if (!progress) throw new Error('mountMapScreen: progress required');

  // 보고 있는 갈래. 지금 갈래와 다를 수 있다(탭은 미리 보기).
  let viewMode = progress.mode;

  const root = el('div', 'gg-map');

  // 한 칸 위로 돌아가는 문. 이 화면에 이것이 없으면 기기 뒤로가기 말고는 나갈 길이 없다.
  // (허브로 나가는 문은 게임 홈의 <- 하나뿐이라는 규칙 3과 다른 자리다 - 여기는 한 칸 위다.)
  const head = el('div', 'gg-map-head');
  const back = el('button', 'gg-ic gg-map-back', '<-');
  back.type = 'button';
  back.setAttribute('aria-label', '뒤로');
  back.addEventListener('click', () => { if (onBack) onBack(); });
  head.appendChild(back);
  if (title) {
    const h = el('h2', 'gg-map-title');
    // 글자만 넘겨도 되고, 그림을 곁들인 조각을 넘겨도 된다(게임 고유 장식은 게임 몫이라서).
    if (title instanceof Node) h.appendChild(title);
    else h.textContent = String(title);
    head.appendChild(h);
  }

  const tabs = el('div', 'gg-map-tabs');
  const credit = el('p', 'gg-map-credit');
  const summary = el('p', 'gg-map-summary');
  const scroll = el('div', 'gg-map-scroll');
  root.append(head, tabs, credit, summary, scroll);
  parent.appendChild(root);

  function pickStage(stage) {
    if (!progress.isUnlocked(stage.id, viewMode)) {
      root.classList.remove('gg-shake');
      void root.offsetWidth; // 연달아 눌러도 다시 흔들리게 한다
      root.classList.add('gg-shake');
      if (toast) toast(lockedText);
      return;
    }
    // 여기서 갈래 전환이 확정된다.
    progress.setMode(viewMode);
    if (onPick) onPick(stage);
  }

  function drawTabs() {
    tabs.replaceChildren();
    // 갈래가 하나뿐인 게임에는 탭을 만들지 않는다.
    if (progress.modes.length < 2) { tabs.hidden = true; return; }
    tabs.hidden = false;
    for (const m of progress.modes) {
      const b = el('button', `gg-map-tab${m.id === viewMode ? ' is-on' : ''}`, m.name || m.id);
      b.type = 'button';
      b.dataset.ggMode = m.id;
      b.addEventListener('click', () => { viewMode = m.id; refresh(); });
      tabs.appendChild(b);
    }
  }

  function drawChip(stage) {
    const rec = progress.of(stage.id, viewMode);
    const locked = !progress.isUnlocked(stage.id, viewMode);
    // 지금 위치 표시는 보고 있는 갈래가 실제 갈래일 때만 뜬다.
    const isCurrent = viewMode === progress.mode && progress.current(viewMode) === stage.id;

    const b = el('button', 'gg-map-chip');
    b.type = 'button';
    b.dataset.ggStage = String(stage.id);
    if (rec.cleared) b.classList.add('is-done');
    if (isCurrent) b.classList.add('is-current');
    if (locked) { b.classList.add('is-locked'); b.setAttribute('aria-disabled', 'true'); }

    if (typeof renderChip === 'function') {
      const custom = renderChip(stage, rec, { locked, isCurrent });
      if (custom instanceof Node) b.appendChild(custom);
      else if (custom != null) b.textContent = String(custom);
    } else {
      const name = typeof label === 'function' ? label(stage) : stage.id;
      b.appendChild(el('span', 'gg-map-num', locked ? '🔒' : String(name)));
      b.appendChild(el('span', 'gg-map-stars', rec.cleared ? '⭐'.repeat(rec.stars) : '·'));
    }

    b.addEventListener('click', () => pickStage(stage));
    return b;
  }

  function refresh() {
    drawTabs();

    const def = progress.modeDef(viewMode);
    credit.textContent = def && def.credit ? def.credit : '';
    credit.hidden = !credit.textContent;

    const t = progress.totals(viewMode);
    summary.textContent = `클리어 ${t.cleared} / ${t.total} · 모은 별 ${t.stars} ⭐`;

    scroll.replaceChildren();
    for (const g of progress.grouped(viewMode)) {
      const sec = el('div', 'gg-map-section');
      if (g.label) sec.appendChild(el('h3', null, `${g.label} (${g.stages.length})`));
      const chips = el('div', 'gg-map-chips');
      for (const s of g.stages) chips.appendChild(drawChip(s));
      sec.appendChild(chips);
      scroll.appendChild(sec);
    }
  }

  refresh();

  return {
    el: root,
    // 화면을 열 때마다 부른다. 보고 있는 갈래를 지금 갈래로 되돌린 뒤 다시 그린다.
    open() { viewMode = progress.mode; refresh(); },
    refresh,
    get viewMode() { return viewMode; },
    destroy() { root.remove(); },
  };
}
