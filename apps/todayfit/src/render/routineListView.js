// 루틴 목록 S-07 (05_manage-screens.md 4.4).
//
// 한 줄에 루틴 이름·운동 수·예상 소요시간·걸린 요일을 보인다. 걸린 요일을 여기 두는
// 이유는 지우기 전에 어느 요일의 연결이 함께 풀리는지 알아야 하기 때문이다.

import { TEXT } from '../data/phrases.js';
import { el, screenHead, body, button, addButton, emptyNote } from './parts.js';

function row(m, handlers) {
  const li = el('li', 'mlist-row');

  const open = button('mlist-main', '', () => handlers.onOpen?.(m.id));
  const box = el('div', 'mrow-box');
  box.append(el('span', 'mrow-label', m.name));
  box.append(el('span', 'mrow-note', m.linkedText));
  open.append(box);
  open.append(el('span', 'mrow-value', m.specText));
  open.append(el('span', 'mrow-chev', TEXT.markChevron));

  const copy = button('mlist-sub', TEXT.duplicateAction, () => handlers.onDuplicate?.(m.id));
  copy.setAttribute('aria-label', `${m.name} ${TEXT.duplicateAction}`);

  const del = button('mlist-del', TEXT.deleteAction, () => handlers.onDelete?.(m.id));
  del.setAttribute('aria-label', `${m.name} ${TEXT.deleteAction}`);

  li.append(open, copy, del);
  return li;
}

export function createRoutineListView(handlers) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(TEXT.routineListHeading, handlers.onBack)];
      const box = body();

      box.append(addButton(TEXT.routineAddAction, () => handlers.onAdd?.()));

      if (m.needExercise) box.append(el('p', 'mhint', TEXT.routineNeedExercise));

      if (m.rows.length === 0) {
        box.append(emptyNote(TEXT.routineEmpty));
      } else {
        const list = el('ul', 'mlist');
        m.rows.forEach((r) => list.append(row(r, handlers)));
        box.append(list);
      }

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
