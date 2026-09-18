// 운동 템플릿 편집 S-10 (05_manage-screens.md 4.3).
//
// 시간 두 칸은 비울 수 있고, 비었을 때 무엇이 대신 쓰이는지를 칸 아래에 적는다.
// 값 사다리(01_spec.md 3.5)를 화면에서 읽을 수 있는 유일한 자리다.
//
// 이름을 비우는 것으로는 운동이 지워지지 않는다. 새로 만든 것만 버려지고,
// 이미 있던 운동의 이름을 비우면 오류를 보이고 이전 이름을 그대로 둔다(4.3.4).

import { TEXT, SAY } from '../data/phrases.js';
import { el, screenHead, body, textField, numberField, footNote } from './parts.js';

export function createExerciseEditView({ onBack, onCommitName, onCommitNumber }) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const heading = m.isNew ? TEXT.exerciseNewHeading : TEXT.exerciseEditHeading;
      const parts = [screenHead(heading, onBack)];
      const box = body();

      box.append(textField({
        label: TEXT.fieldExerciseName,
        value: m.name,
        placeholder: TEXT.fieldExerciseNamePlaceholder,
        note: m.isNew ? TEXT.newExerciseNote : undefined,
        maxLength: m.nameMaxLength,
        onCommit: (raw) => onCommitName?.(raw),
      }));

      box.append(numberField({
        label: TEXT.fieldSets,
        value: m.sets,
        unit: TEXT.unitSets,
        onCommit: (raw) => onCommitNumber?.('sets', raw),
      }));

      box.append(numberField({
        label: TEXT.fieldReps,
        value: m.reps,
        unit: TEXT.unitReps,
        onCommit: (raw) => onCommitNumber?.('reps', raw),
      }));

      box.append(numberField({
        label: TEXT.fieldWorkSeconds,
        value: m.workSeconds,
        unit: TEXT.unitSeconds,
        note: SAY.blankUsesAppDefault(m.defaultWorkSeconds),
        onCommit: (raw) => onCommitNumber?.('workSeconds', raw),
      }));

      box.append(numberField({
        label: TEXT.fieldRestSeconds,
        value: m.restSeconds,
        unit: TEXT.unitSeconds,
        note: SAY.blankUsesAppDefault(m.defaultRestSeconds),
        onCommit: (raw) => onCommitNumber?.('restSeconds', raw),
      }));

      box.append(footNote(TEXT.exerciseEditFoot));

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
