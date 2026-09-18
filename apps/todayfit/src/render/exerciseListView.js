// 운동 템플릿 목록 S-09 (05_manage-screens.md 4.2).
//
// 한 줄에 운동명과 기본값, 그리고 그 운동을 담은 루틴 수를 보인다. 루틴 수를 여기 두는
// 이유는 지우기 전에 무엇이 함께 빠지는지 알아야 하기 때문이다.

import { TEXT } from '../data/phrases.js';
import { el, screenHead, body, button, addButton, emptyNote } from './parts.js';

function row(m, onOpen, onDelete) {
  const li = el('li', 'mlist-row');

  const open = button('mlist-main', '', () => onOpen?.(m.id));
  const box = el('div', 'mrow-box');
  box.append(el('span', 'mrow-label', m.name));
  box.append(el('span', 'mrow-note', m.usedText));
  open.append(box);
  open.append(el('span', 'mrow-value', m.specText));
  open.append(el('span', 'mrow-chev', TEXT.markChevron));

  const del = button('mlist-del', TEXT.deleteAction, () => onDelete?.(m.id));
  del.setAttribute('aria-label', `${m.name} ${TEXT.deleteAction}`);

  li.append(open, del);
  return li;
}

export function createExerciseListView({ onBack, onOpen, onAdd, onDelete }) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(TEXT.exerciseListHeading, onBack)];
      const box = body();

      box.append(addButton(TEXT.exerciseAddAction, () => onAdd?.()));

      if (m.rows.length === 0) {
        box.append(emptyNote(TEXT.exerciseEmpty));
      } else {
        const list = el('ul', 'mlist');
        m.rows.forEach((r) => list.append(row(r, onOpen, onDelete)));
        box.append(list);
      }

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
