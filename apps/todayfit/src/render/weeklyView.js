// 요일 규칙 S-06 (05_manage-screens.md 4.6).
//
// 일곱 줄이 화면 하나에 들어간다. 끈 요일은 시간과 루틴 칸을 흐리게 두되 값은 지우지
// 않는다 - 다시 켤 때 그대로 돌아온다.
//
// 화면 아래 반영 시점 안내는 고정이다. 여기서 바꾼 것이 이미 만든 계획에 닿지 않는다는
// 사실을 사용자가 알 수 있는 유일한 자리다(01_spec.md 3.3).

import { TEXT } from '../data/phrases.js';
import {
  el, screenHead, body, button, emptyNote, footNote,
  toggleRow, selectRow, timeField, restoreFocus,
} from './parts.js';

function dayBlock(day, handlers) {
  const box = el('section', 'mday');
  box.dataset.on = day.enabled ? 'yes' : 'no';

  box.append(toggleRow({
    label: day.weekdayLabel,
    on: day.enabled,
    onChange: (next) => handlers.onToggle?.(day.weekday, next),
    focusKey: `weekday-${day.weekday}`,
  }));

  const detail = el('div', 'mday-detail');

  detail.append(timeField({
    label: TEXT.fieldPlanTime,
    value: day.time,
    onCommit: (raw) => handlers.onCommitTime?.(day.weekday, raw),
  }));

  detail.append(selectRow({
    label: TEXT.weeklyRoutine,
    value: day.routineId,
    options: day.routineOptions,
    emptyLabel: TEXT.weeklyNoRoutine,
    onChange: (next) => handlers.onPickRoutine?.(day.weekday, next),
    focusKey: `routine-${day.weekday}`,
  }));

  if (day.warnNoRoutine) detail.append(el('p', 'mwarn', TEXT.weeklyNeedRoutine));
  else if (day.warnEmptyRoutine) detail.append(el('p', 'mwarn', TEXT.weeklyEmptyRoutine));

  box.append(detail);
  return box;
}

export function createWeeklyView(handlers) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(TEXT.weeklyHeading, handlers.onBack)];
      const box = body();

      if (m.hasNoRoutines) {
        box.append(emptyNote(TEXT.weeklyNoRoutines));
        box.append(button('madd', TEXT.goMakeRoutine, () => handlers.onGoRoutines?.()));
      }

      m.days.forEach((day) => box.append(dayBlock(day, handlers)));
      box.append(footNote(TEXT.weeklyFoot));

      parts.push(box);
      root.replaceChildren(...parts);
      restoreFocus(root, m.focusKey);
    },
  };
}
