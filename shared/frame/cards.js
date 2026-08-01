// 시작 흐름 공용 프레임 - 잠깐 멈춤 카드와 결과 카드(기획서 Ⅰ권 3.4 / 3.5).
//
// 왜 만드나: 지금 결과 알림이 세 갈래로 갈려 있다(가운데 알림창, 전용 화면, 덮어쓰는 창).
// 규격은 플레이를 덮는 카드 하나로 통일한다. 카드는 플레이 위에 겹치는 층이라
// 뒤에 게임 화면이 그대로 보이며, 이 상태에서 되돌아가면 플레이로 내려간다(계단은 stack.js가 안다).
//
// 문구는 text.js가 단일 진실 source다. 여기서 문자열을 새로 만들지 않는다.
// 되돌리기: 게임이 showModal을 쓰던 상태로 돌아가려면 이 부품 호출만 지우면 된다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 3.4 / 3.5 / 5.3.

import { TEXT } from './text.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function buildCard(kind, { title, lines = [], actions = [] }) {
  const layer = el('div', `gg-layer gg-layer-${kind}`);
  const card = el('div', 'gg-card-panel');
  card.appendChild(el('h2', 'gg-card-title', title || ''));
  if (lines.length) {
    const body = el('div', 'gg-card-body');
    lines.forEach((ln) => {
      if (ln && typeof ln === 'object' && ln.label !== undefined) {
        const row = el('div', 'gg-kv');
        row.appendChild(el('span', 'gg-kv-label', ln.label));
        row.appendChild(el('span', 'gg-kv-value', String(ln.value ?? '')));
        if (ln.highlight) row.classList.add('is-highlight');
        body.appendChild(row);
      } else {
        body.appendChild(el('p', 'gg-card-line', String(ln)));
      }
    });
    card.appendChild(body);
  }
  const actionsEl = el('div', 'gg-card-actions');
  actions.forEach((a) => {
    const b = el('button', 'gg-btn' + (a.primary ? ' gg-btn-primary' : ''), a.label);
    b.type = 'button';
    b.dataset.ggAction = a.value;
    actionsEl.appendChild(b);
  });
  card.appendChild(actionsEl);
  layer.appendChild(card);
  return { layer, actionsEl };
}

// 잠깐 멈춤 카드. 계속하기 / 다시 시작 / 그만하기 셋만 둔다(Ⅰ권 3.4).
// 화면을 벗어났다 돌아오는 경우에도 이 상태가 되어, 돌아왔을 때 이미 죽어 있는 일을 막는다.
export function mountPauseCard({ parent, title = '잠깐 멈춤', lines = [] } = {}) {
  if (!parent) throw new Error('mountPauseCard: parent required');
  const { layer, actionsEl } = buildCard('pause', {
    title,
    lines,
    actions: [
      { label: TEXT.continue, value: 'continue', primary: true },
      { label: TEXT.restart, value: 'restart' },
      { label: TEXT.quit, value: 'quit' },
    ],
  });
  parent.appendChild(layer);
  const handlers = {};
  actionsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gg-action]');
    if (!b) return;
    const fn = handlers[b.dataset.ggAction];
    if (fn) fn();
  });
  return {
    el: layer,
    on(action, fn) { handlers[action] = fn; return this; },
    setLines(next) {
      const body = layer.querySelector('.gg-card-body');
      if (body) body.remove();
      if (!next || !next.length) return;
      const rebuilt = buildCard('pause', { title: '', lines: next, actions: [] });
      const newBody = rebuilt.layer.querySelector('.gg-card-body');
      if (newBody) layer.querySelector('.gg-card-panel').insertBefore(newBody, actionsEl);
    },
    destroy() { layer.remove(); },
  };
}

// 결과 카드. 이번 점수와 최고 기록 비교, 다시 하기, 그만하기를 담는다(Ⅰ권 3.5).
// 새 기록이면 그 사실을 눈에 띄게 알린다.
export function mountResultCard({ parent, title = '결과' } = {}) {
  if (!parent) throw new Error('mountResultCard: parent required');
  const { layer, actionsEl } = buildCard('result', {
    title,
    lines: [],
    actions: [
      { label: TEXT.retry, value: 'retry', primary: true },
      { label: TEXT.quit, value: 'quit' },
    ],
  });
  const panel = layer.querySelector('.gg-card-panel');
  const titleEl = layer.querySelector('.gg-card-title');
  const badge = el('div', 'gg-newrecord', '새 기록');
  badge.hidden = true;
  panel.insertBefore(badge, actionsEl);
  parent.appendChild(layer);

  const handlers = {};
  actionsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gg-action]');
    if (!b) return;
    const fn = handlers[b.dataset.ggAction];
    if (fn) fn();
  });

  return {
    el: layer,
    on(action, fn) { handlers[action] = fn; return this; },
    // 한 판이 끝났을 때 부른다. lines는 {label, value, highlight} 목록이다.
    show({ title: t, lines = [], newRecord = false } = {}) {
      if (t) titleEl.textContent = t;
      let body = panel.querySelector('.gg-card-body');
      if (body) body.remove();
      if (lines.length) {
        const rebuilt = buildCard('result', { title: '', lines, actions: [] });
        body = rebuilt.layer.querySelector('.gg-card-body');
        panel.insertBefore(body, badge);
      }
      badge.hidden = !newRecord;
    },
    destroy() { layer.remove(); },
  };
}
