// 날짜 상세 S-04 (05_manage-screens.md 4.8).
//
// 읽기 전용 화면이다. 상태에 따라 보이는 것이 갈리고, 고치는 길은 오늘 이후이면서
// 수행 기록이 없는 날짜에만 열린다(01_spec.md 3.9).
//
// 이 화면에서는 운동을 시작하지 않는다 - 실행 진입점은 오늘 화면 하나다(01_spec.md 2.5).

import { TEXT } from '../data/phrases.js';
import { DAY_STATUS } from '../data/constants.js';
import {
  el, screenHead, body, navRow, infoRow, emptyNote, addButton, footNote,
} from './parts.js';

function planRow(row, index) {
  const li = el('li', 'exrow');
  li.append(
    el('span', 'exrow-no', String(index + 1)),
    el('span', 'exrow-name', row.name),
    el('span', 'exrow-spec', row.specText),
  );
  if (row.resultLabel) {
    const mark = el('span', 'sumrow-result', row.resultLabel);
    li.dataset.result = row.result;
    li.append(mark);
  }
  return li;
}

export function createDayView(handlers) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(m.dateText, handlers.onBack, m.statusLabel)];
      const box = body();

      if (m.status === DAY_STATUS.NONE) {
        box.append(emptyNote(TEXT.dayNoPlan));
        if (m.canAdd) box.append(addButton(TEXT.planAddAction, () => handlers.onAddPlan?.()));
        parts.push(box);
        root.replaceChildren(...parts);
        return;
      }

      const card = el('div', 'card');
      if (m.routineName) card.append(el('p', 'card-lead', m.routineName));

      const facts = el('div', 'facts');
      for (const f of m.facts) {
        const cell = el('div', 'fact');
        cell.append(el('span', 'fact-label', f.label), el('b', 'fact-value', f.value));
        facts.append(cell);
      }
      card.append(facts);

      const list = el('ol', 'exlist');
      m.rows.forEach((row, i) => list.append(planRow(row, i)));
      card.append(list);
      box.append(card);

      if (m.missed) box.append(el('p', 'mwarn', TEXT.missedNote));

      if (m.canEdit) {
        box.append(navRow({ label: TEXT.editPlanAction, onClick: () => handlers.onEditPlan?.() }));
      } else if (m.lockReason) {
        box.append(footNote(m.lockReason));
      }

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
