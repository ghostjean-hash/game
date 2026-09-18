// 루틴 편집 S-08 (05_manage-screens.md 4.5).
//
// 항목 한 줄은 접힌 채로 있다가 값 고치기를 누르면 덮어쓰기 칸 넷이 펼쳐진다.
// 네 칸을 늘 펼쳐 두면 운동 다섯 개짜리 루틴이 화면 넉 장이 된다.
//
// 펼친 자리는 화면이 아니라 부른 쪽이 들고 있다 - 화면은 상태를 갖지 않으므로
// (03_architecture.md 2.3) 다시 그릴 때마다 접혀 버리기 때문이다.

import { TEXT, SAY } from '../data/phrases.js';
import {
  el, screenHead, body, button, addButton, emptyNote,
  textField, numberField, infoRow,
} from './parts.js';

const SOURCE_LABEL = {
  routine: TEXT.sourceRoutine,
  exercise: TEXT.sourceExercise,
  settings: TEXT.sourceSettings,
};

/** 덮어쓰기 칸 하나. 비우면 아래 단 값을 쓰므로 그 사실을 안내에 적는다. */
function overrideField(item, field, label, unit, onCommitItem) {
  return numberField({
    label,
    value: item.override[field],
    unit,
    note: SOURCE_LABEL[item.source[field]],
    onCommit: (raw) => onCommitItem?.(item.index, field, raw),
  });
}

function itemRow(item, handlers) {
  const li = el('li', 'mitem');
  li.dataset.open = item.isOpen ? 'yes' : 'no';

  const head = el('div', 'mitem-head');
  head.append(el('span', 'mitem-no', String(item.index + 1)));

  const box = el('div', 'mrow-box');
  box.append(el('span', 'mrow-label', item.name));
  box.append(el('span', 'mrow-note', item.specText));
  // 펼치지 않아도 이 항목이 루틴에서 덮어쓴 값을 갖는지 알 수 있어야 한다(4.5.1).
  // 값을 고치면 이 표시가 붙었다 떨어지므로 자리는 늘 만들어 두고 감추기만 한다
  const mark = el('span', 'mitem-mark', TEXT.overriddenMark);
  mark.hidden = !item.hasOverride;
  box.append(mark);
  head.append(box);

  const moves = el('div', 'mitem-moves');
  const up = button('mitem-move', TEXT.markUp, () => handlers.onMove?.(item.index, -1));
  up.setAttribute('aria-label', `${item.name} ${TEXT.moveUpAction}`);
  up.disabled = item.isFirst;
  const down = button('mitem-move', TEXT.markDown, () => handlers.onMove?.(item.index, 1));
  down.setAttribute('aria-label', `${item.name} ${TEXT.moveDownAction}`);
  down.disabled = item.isLast;
  moves.append(up, down);
  head.append(moves);

  li.append(head);

  const tools = el('div', 'mitem-tools');
  const toggle = button('mitem-toolbtn', item.isOpen ? TEXT.closeItemAction : TEXT.openItemAction,
    () => handlers.onToggleItem?.(item.index));
  const del = button('mitem-toolbtn is-danger', TEXT.deleteAction,
    () => handlers.onRemoveItem?.(item.index));
  del.setAttribute('aria-label', `${item.name} ${TEXT.deleteAction}`);
  tools.append(toggle, del);
  li.append(tools);

  if (item.isOpen) {
    const fields = el('div', 'mitem-fields');
    fields.append(el('p', 'mitem-fieldshead', TEXT.overrideHeading));
    fields.append(overrideField(item, 'sets', TEXT.fieldItemSets, TEXT.unitSets, handlers.onCommitItem));
    fields.append(overrideField(item, 'reps', TEXT.fieldItemReps, TEXT.unitReps, handlers.onCommitItem));
    fields.append(overrideField(item, 'workSeconds', TEXT.fieldWork, TEXT.unitSeconds, handlers.onCommitItem));
    fields.append(overrideField(item, 'restSeconds', TEXT.fieldRest, TEXT.unitSeconds, handlers.onCommitItem));
    li.append(fields);
  }

  return li;
}

export function createRoutineEditView(handlers) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    /**
     * 값 하나를 고친 뒤 바뀌는 자리만 고쳐 쓴다.
     *
     * 화면을 통째로 다시 그리면 사용자가 지금 누르려던 칸이 DOM 에서 떨어져 나가
     * 그 한 번이 헛눌림이 된다 - 값 넷을 이어 고칠 때마다 걸린다.
     */
    patch(m) {
      const est = root.querySelector('.mestimate .mrow-value');
      if (est) est.textContent = m.estimateText;
      const rows = root.querySelectorAll('.mitem');
      m.items.forEach((item, i) => {
        const row = rows[i];
        if (!row) return;
        const note = row.querySelector('.mitem-head .mrow-note');
        if (note) note.textContent = item.specText;
        const mark = row.querySelector('.mitem-mark');
        if (mark) mark.hidden = !item.hasOverride;
      });
    },

    update(m) {
      const parts = [screenHead(TEXT.routineEditHeading, handlers.onBack)];
      const box = body();

      box.append(textField({
        label: TEXT.fieldRoutineName,
        value: m.name,
        placeholder: TEXT.fieldRoutineNamePlaceholder,
        maxLength: m.nameMaxLength,
        onCommit: (raw) => handlers.onCommitName?.(raw),
      }));

      box.append(infoRow(TEXT.estimateLabel, m.estimateText, 'mestimate'));

      const group = el('section', 'mgroup');
      group.append(el('h3', 'mgroup-title', TEXT.routineItemsHeading));
      // 담을 운동이 하나도 없으면 추가 버튼을 세우지 않는다 - 눌러도 고를 것이 없어
      // 아무 일도 일어나지 않고, 그 자리는 반응 없는 버튼으로 남는다
      if (!m.hasNoExercises) {
        group.append(addButton(TEXT.addExerciseAction, () => handlers.onAddItem?.()));
      }

      if (m.hasNoExercises) {
        group.append(emptyNote(TEXT.routineNeedExercise));
        group.append(button('madd', TEXT.goMakeExercise, () => handlers.onGoExercises?.()));
      } else if (m.items.length === 0) {
        group.append(emptyNote(TEXT.routineItemsEmpty));
      } else {
        const list = el('ol', 'mitems');
        m.items.forEach((item) => list.append(itemRow(item, handlers)));
        group.append(list);
      }

      box.append(group);
      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
