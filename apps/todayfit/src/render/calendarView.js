// 달력 S-02 (05_manage-screens.md 4.7).
//
// 이 화면이 답해야 하는 것은 둘이다 - 이 달에 계획이 있는가, 얼마나 지켰는가.
// 계획이 없는 달에서는 만드는 조작이 먼저 눈에 들어와야 하고, 있는 달에서는
// 격자와 달성 현황이 먼저다.
//
// 이미 만든 계획은 덮어쓰지 않는다(사용자 결정 2026-09-18). 저장에 자동 생성분과
// 손으로 고친 계획을 가르는 표식이 없어서다. 그 결정을 지키는 자리는 만들기 조작을
// 감추는 것이 아니라 이미 있는 날짜를 건너뛰는 것이다(planner 의 existingDates).

import { TEXT, SAY } from '../data/phrases.js';
import { el, screenHead, body, button, addButton } from './parts.js';

/**
 * 월간 계획 생성 미리보기 (01_spec.md 3.7 5단계).
 *
 * 화면을 새로 쌓지 않고 달력 위에 덮는 판으로 낸다 - 기획서가 이 자리에 화면 번호를
 * 붙이지 않고 달력의 조작으로 적었기 때문이다(05_manage-screens.md 4.7.6).
 */
export function previewBox(preview) {
  const box = el('div', 'prev');
  box.append(el('p', 'prev-head', SAY.makeDays(preview.count)));

  const list = el('ul', 'prev-list');
  for (const d of preview.days) {
    const li = el('li', 'prev-row');
    li.append(el('span', 'prev-date', d.dateText), el('span', 'prev-name', d.detailText));
    list.append(li);
  }
  box.append(list);
  return box;
}

function monthBar(m, handlers) {
  const bar = el('div', 'cal-bar');

  const prev = button('cal-move', TEXT.markPrevMonth, () => handlers.onShiftMonth?.(-1));
  prev.setAttribute('aria-label', TEXT.prevMonthAction);

  const next = button('cal-move', TEXT.markChevron, () => handlers.onShiftMonth?.(1));
  next.setAttribute('aria-label', TEXT.nextMonthAction);

  bar.append(prev, el('b', 'cal-month', m.monthText), next);
  return bar;
}

/**
 * 달력 격자. 월요일에서 시작해 일요일에 끝난다(01_spec.md 6.8).
 *
 * 상태는 색만으로 가르지 않는다 - 네 상태가 모양으로도 갈린다(02_data.md 7.4).
 * 색을 못 가리는 눈에도, 빛 아래 흐려진 화면에서도 읽혀야 한다.
 */
function grid(m, handlers) {
  const box = el('div', 'cal-grid');

  for (const label of m.weekdayHeads) {
    box.append(el('span', 'cal-wd', label));
  }
  for (let i = 0; i < m.leading; i += 1) {
    box.append(el('span', 'cal-cell is-blank'));
  }

  for (const day of m.days) {
    const cell = el('button', 'cal-cell');
    cell.type = 'button';
    cell.dataset.status = day.status;
    if (day.isToday) cell.dataset.today = 'yes';
    cell.setAttribute('aria-label', day.ariaLabel);
    cell.append(el('span', 'cal-num', String(day.dayNumber)));
    cell.append(el('span', 'cal-mark'));
    if (day.running) cell.append(el('span', 'cal-run'));
    cell.addEventListener('click', () => handlers.onPickDate?.(day.date));
    box.append(cell);
  }
  return box;
}

/** 어느 모양이 무엇인지. 격자만으로는 빗금과 반칸이 무엇을 뜻하는지 알 수 없다. */
function legend(m) {
  const box = el('div', 'cal-legend');
  for (const row of m.legend) {
    const item = el('span', 'cal-legenditem');
    const mark = el('span', 'cal-mark');
    mark.dataset.status = row.status;
    item.append(mark, el('span', 'cal-legendlabel', row.label));
    box.append(item);
  }
  return box;
}

function statBox(m) {
  const box = el('div', 'cal-stats');
  for (const row of m.stats) {
    const cell = el('div', 'cal-stat');
    cell.append(el('span', 'cal-statlabel', row.label), el('b', 'cal-statvalue', row.value));
    box.append(cell);
  }
  return box;
}

export function createCalendarView(handlers) {
  const root = el('section', 'mscreen cal');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(TEXT.calendarHeading, null)];
      const box = body('cal-body');

      box.append(monthBar(m, handlers));

      const line = el('p', 'cal-count');
      line.append(
        el('span', 'mrow-label', TEXT.planCountLabel),
        el('b', 'mrow-value', SAY.planDays(m.planCount)),
      );
      box.append(line);

      // 만들기는 늘 열어 둔다. 이미 있는 날짜는 건너뛰므로(planner 의 existingDates)
      // 만들어 둔 계획이 덮이지 않는다 - 사용자 결정 3번이 막으려던 것은 덮어쓰기다.
      // 하루를 손수 넣었다고 그 달 나머지를 만들 길까지 닫으면 막다른 골목이 된다
      box.append(addButton(TEXT.makePlanAction, () => handlers.onMakePlan?.()));
      if (m.planCount > 0) box.append(el('p', 'mhint', TEXT.alreadyPlanned));

      box.append(grid(m, handlers));
      box.append(legend(m));
      box.append(statBox(m));

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
