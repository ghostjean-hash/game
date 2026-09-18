// 오늘 화면 S-01 (01_spec.md 2.7).
//
// 이 화면이 답해야 하는 것은 넷이다 - 오늘 운동이 있는가, 몇 시인가, 얼마나 걸리는가,
// 지금 바로 시작할 수 있는가. 그 넷이 화면 위쪽에 먼저 오고 운동 목록은 그 아래다.
//
// 다섯 상태 가운데 하나만 표시한다. 위에서부터 먼저 맞는 것을 쓴다(01_spec.md 2.7).
// 갱신이 잦은 화면이 아니라 통째로 다시 그린다 - 잦은 자리는 운동 실행 화면 하나뿐이다.

import { TEXT } from '../data/phrases.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function factRow(label, value) {
  const row = el('div', 'fact');
  row.append(el('span', 'fact-label', label), el('b', 'fact-value', value));
  return row;
}

function exerciseRow(index, ex) {
  const row = el('li', 'exrow');
  row.append(
    el('span', 'exrow-no', String(index + 1)),
    el('span', 'exrow-name', ex.name),
    el('span', 'exrow-spec', ex.specText),
  );
  return row;
}

function primaryButton(label, onClick) {
  const btn = el('button', 'big-btn', label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

export function createTodayView({ onStart, onResume, onContinue }) {
  const root = el('section', 'today');

  function header(m) {
    const head = el('header', 'today-head');
    head.append(el('p', 'today-date', m.dateText));
    head.append(el('h2', 'today-title', m.headline));
    return head;
  }

  function planFacts(m) {
    const facts = el('div', 'facts');
    if (m.timeText) facts.append(factRow(TEXT.timeLabel, m.timeText));
    // 끝난 날은 앞으로 걸릴 시간이 아니라 실제로 걸린 시간을 보인다
    facts.append(factRow(m.estimateLabel || TEXT.estimateLabel, m.estimateText));
    facts.append(factRow(m.countLabel || TEXT.countLabel, m.countText));
    return facts;
  }

  function exerciseList(rows) {
    const list = el('ol', 'exlist');
    rows.forEach((ex, i) => list.append(exerciseRow(i, ex)));
    return list;
  }

  function nextPlanLine(m) {
    const line = el('p', 'today-nextplan');
    line.append(
      el('span', 'today-nextplan-label', TEXT.nextPlanLabel),
      el('b', 'today-nextplan-value', m.nextPlanText || TEXT.noNextPlan),
    );
    return line;
  }

  return {
    el: root,

    update(m) {
      const parts = [header(m)];

      if (m.state === 'none') {
        // 제목이 이미 '오늘 예정된 운동 없음' 이다. 같은 문장을 본문에 한 번 더 두지 않는다
        parts.push(el('div', 'empty', TEXT.noPlanHint));
        parts.push(nextPlanLine(m));
        root.replaceChildren(...parts);
        return;
      }

      const card = el('div', 'card');
      // 날짜 상세에서 손으로 만든 계획에는 루틴 이름이 없다. 빈 줄을 두지 않는다
      if (m.routineName) card.append(el('p', 'card-lead', m.routineName));
      card.append(planFacts(m));
      card.append(exerciseList(m.exercises));
      parts.push(card);

      if (m.state === 'resume') parts.push(primaryButton(TEXT.resumeAction, () => onResume?.()));
      else if (m.state === 'continue') parts.push(primaryButton(TEXT.continueAction, () => onContinue?.()));
      else if (m.state === 'ready') parts.push(primaryButton(TEXT.startAction, () => onStart?.()));
      else parts.push(nextPlanLine(m)); // 완료 - 더 할 것이 없으므로 다음 예정만 알린다

      root.replaceChildren(...parts);
    },
  };
}
