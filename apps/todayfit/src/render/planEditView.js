// 날짜별 계획 수정 S-05 (05_manage-screens.md 4.9).
//
// 루틴 편집과 닮았지만 다른 화면이다. 여기 네 수치는 전부 확정값이라 빈 칸이 없고
// 출처 표기도 없다 - 요일 규칙에서 날짜별 계획으로 넘어오며 값이 복사되고 참조가
// 끊겼기 때문이다(01_spec.md 3.3).
//
// 운동이 하나도 없는 계획은 만들지 않는다. 마지막 하나를 빼려 하면 그 날짜 계획
// 자체를 지울지 묻는다(사용자 결정 2026-09-18).

import { TEXT } from '../data/phrases.js';
import {
  el, screenHead, body, button, addButton, emptyNote,
  timeField, numberField, infoRow, dangerButton,
} from './parts.js';

function itemRow(item, handlers) {
  const li = el('li', 'mitem');
  li.dataset.open = item.isOpen ? 'yes' : 'no';

  const head = el('div', 'mitem-head');
  head.append(el('span', 'mitem-no', String(item.index + 1)));

  const box = el('div', 'mrow-box');
  box.append(el('span', 'mrow-label', item.name));
  box.append(el('span', 'mrow-note', item.specText));
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
  tools.append(button('mitem-toolbtn', item.isOpen ? TEXT.closeItemAction : TEXT.openItemAction,
    () => handlers.onToggleItem?.(item.index)));
  const del = button('mitem-toolbtn is-danger', TEXT.deleteAction,
    () => handlers.onRemoveItem?.(item.index));
  del.setAttribute('aria-label', `${item.name} ${TEXT.deleteAction}`);
  tools.append(del);
  li.append(tools);

  if (item.isOpen) {
    const fields = el('div', 'mitem-fields');
    const put = (field, label, unit) => fields.append(numberField({
      label,
      value: item.values[field],
      unit,
      onCommit: (raw) => handlers.onCommitItem?.(item.index, field, raw),
    }));
    put('sets', TEXT.fieldItemSets, TEXT.unitSets);
    put('reps', TEXT.fieldItemReps, TEXT.unitReps);
    put('workSeconds', TEXT.fieldWork, TEXT.unitSeconds);
    put('restSeconds', TEXT.fieldRest, TEXT.unitSeconds);
    li.append(fields);
  }

  return li;
}

export function createPlanEditView(handlers) {
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
      });
    },

    update(m) {
      const heading = m.isNew ? TEXT.planNewHeading : TEXT.planEditHeading;
      const parts = [screenHead(heading, handlers.onBack, m.dateText)];
      const box = body();

      box.append(timeField({
        label: TEXT.fieldPlanTime,
        value: m.time,
        note: m.isNew ? TEXT.planDraftNote : undefined,
        onCommit: (raw) => handlers.onCommitTime?.(raw),
      }));

      box.append(infoRow(TEXT.estimateLabel, m.estimateText, 'mestimate'));

      // 운동 담기가 이 화면의 주 조작이다. 루틴 불러오기는 지금 목록을 통째로 갈아
      // 끼우는 조작이라 같은 무게로 두지 않는다
      const group = el('section', 'mgroup');
      // 담을 운동이 없으면 추가 버튼을 세우지 않는다(routineEditView 와 같은 이유)
      if (!m.hasNoExercises) {
        group.append(addButton(TEXT.addExerciseAction, () => handlers.onAddItem?.()));
      }
      if (!m.hasNoRoutines && !m.hasNoExercises) {
        const sub = el('div', 'mitem-tools');
        sub.append(button('mitem-toolbtn', TEXT.fromRoutineAction, () => handlers.onFromRoutine?.()));
        group.append(sub);
      }

      // 담을 새 운동이 없다는 것과 이미 담긴 것이 없다는 것은 다르다.
      // 템플릿을 전부 지운 뒤에도 이 날짜에 담긴 운동은 그대로 보여야 한다
      if (m.hasNoExercises) {
        group.append(emptyNote(TEXT.planNeedExercise));
        group.append(button('madd', TEXT.goMakeExercise, () => handlers.onGoExercises?.()));
      }
      if (m.items.length === 0) {
        if (!m.hasNoExercises) group.append(emptyNote(TEXT.planEmptyNote));
      } else {
        const list = el('ol', 'mitems');
        m.items.forEach((item) => list.append(itemRow(item, handlers)));
        group.append(list);
      }
      box.append(group);

      if (m.items.length > 0) {
        box.append(dangerButton(TEXT.deletePlanAction, () => handlers.onDeletePlan?.()));
      }

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
