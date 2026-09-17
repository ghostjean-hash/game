// 운동 종료 요약 S-13 (01_spec.md 2.3 / 2.6).
//
// 끝낸 직후에 알고 싶은 것은 둘이다 - 오늘 계획 대비 얼마나 했는가, 다음은 언제인가.
// 그 둘을 위아래로 세우고 운동별 결과를 가운데 둔다.
// 닫으면 오늘 화면으로 간다.

import { TEXT } from '../data/phrases.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function resultRow(row) {
  const li = el('li', 'sumrow');
  li.dataset.result = row.result;
  li.append(
    el('span', 'sumrow-name', row.name),
    el('span', 'sumrow-count', row.countText),
    el('span', 'sumrow-result', row.resultLabel),
  );
  return li;
}

export function createSummaryView({ onClose }) {
  const root = el('section', 'summary');

  return {
    el: root,

    update(m) {
      const head = el('header', 'summary-head');
      head.append(el('p', 'summary-date', m.dateText));
      head.append(el('h2', 'summary-title', m.headline));
      head.dataset.status = m.status;

      const facts = el('div', 'facts');
      const time = el('div', 'fact');
      time.append(el('span', 'fact-label', TEXT.totalTimeLabel), el('b', 'fact-value', m.totalTimeText));
      const done = el('div', 'fact');
      done.append(el('span', 'fact-label', TEXT.doneLabel), el('b', 'fact-value', m.doneText));
      facts.append(time, done);

      const list = el('ul', 'sumlist');
      m.rows.forEach((row) => list.append(resultRow(row)));

      const nextLine = el('p', 'summary-nextplan');
      nextLine.append(
        el('span', 'today-nextplan-label', TEXT.nextPlanLabel),
        el('b', 'today-nextplan-value', m.nextPlanText || TEXT.noNextPlan),
      );

      const close = el('button', 'big-btn', TEXT.closeAction);
      close.type = 'button';
      close.addEventListener('click', () => onClose?.());

      root.replaceChildren(head, facts, list, nextLine, close);
    },
  };
}
