// 운동 실행 화면 S-12 (01_spec.md 2.3 / 4장).
//
// 이 화면은 손에 들고 보는 화면이 아니다. 폰을 세워 두고 한두 걸음 떨어져 곁눈으로 본다.
// 그래서 글자 크기와 자리를 다른 화면과 다른 기준으로 잡았다 -
// 운동명·세트·시간 셋이 화면의 대부분을 차지하고, 나머지는 가장자리로 밀었다.
//
// 다음 버튼은 세트마다 누르는 유일한 조작이라 화면 아래 폭 전체를 쓴다. 땀 묻은 손으로
// 누르는 자리라 공용 최소 크기보다 훨씬 크게 잡았다(04_conventions.md 5.4).
//
// 1초에 네 번 갱신되므로 매번 다시 그리지 않는다. 만들 때 한 번 세우고, 갱신 때는
// 값이 달라진 자리만 손댄다(04_conventions.md 8.2).

import { TEXT } from '../data/phrases.js';
import { attachPress } from '../input/pressInput.js';

/** 값이 그대로면 DOM 을 건드리지 않는다 - 갱신이 잦은 화면이라 이 한 줄이 계속 일한다. */
function setText(el, value) {
  if (el.textContent !== value) el.textContent = value;
}

function setFlag(el, name, on) {
  el.classList.toggle(name, !!on);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createRunView({ onNext, onSkip, onPause, onEnd, onUndo }) {
  const root = el('section', 'run');

  // --- 위쪽 띠: 지금 무엇을 하는 중이고 몇 번째인가 ---
  const top = el('div', 'run-top');
  const phaseChip = el('span', 'run-phase', '');
  const position = el('span', 'run-pos', '');
  const elapsed = el('span', 'run-elapsed', '');
  top.append(phaseChip, position, elapsed);

  // --- 가운데: 운동명 · 세트 · 횟수 · 시간 ---
  const main = el('div', 'run-main');
  const lead = el('p', 'run-lead', '');
  const name = el('h2', 'run-name', '');

  const meta = el('div', 'run-meta');
  const setBox = el('div', 'run-metabox');
  const setValue = el('b', 'run-metavalue', '');
  const setUnit = el('span', 'run-metaunit', TEXT.unitSets);
  setBox.append(setValue, setUnit);
  const repsBox = el('div', 'run-metabox');
  const repsValue = el('b', 'run-metavalue', '');
  const repsUnit = el('span', 'run-metaunit', TEXT.unitReps);
  repsBox.append(repsValue, repsUnit);
  meta.append(setBox, repsBox);

  // 세트 진행은 점으로도 보인다 - 숫자를 읽지 않아도 남은 개수가 눈에 들어온다
  const dots = el('div', 'run-dots');

  const timer = el('div', 'run-timer', '');
  const timerNote = el('p', 'run-timernote', '');
  main.append(lead, name, meta, dots, timer, timerNote);

  // --- 아래: 다음 운동 예고 + 조작 ---
  const upNext = el('p', 'run-upnext', '');

  const undoBar = el('div', 'run-undo');
  const undoText = el('span', 'run-undotext', TEXT.skipped);
  const undoBtn = el('button', 'run-undobtn', TEXT.undoAction);
  undoBtn.type = 'button';
  undoBar.append(undoText, undoBtn);
  undoBar.hidden = true;

  const actions = el('div', 'run-actions');
  const nextBtn = el('button', 'run-next');
  nextBtn.type = 'button';
  const nextLabel = el('span', 'run-nextlabel', TEXT.nextAction);
  const nextHint = el('span', 'run-nexthint', TEXT.skipHint);
  nextBtn.append(nextLabel, nextHint);

  const sub = el('div', 'run-sub');
  const pauseBtn = el('button', 'run-subbtn', TEXT.pauseAction);
  pauseBtn.type = 'button';
  const endBtn = el('button', 'run-subbtn run-endbtn', TEXT.endAction);
  endBtn.type = 'button';
  sub.append(pauseBtn, endBtn);
  actions.append(nextBtn, sub);

  root.append(top, main, upNext, undoBar, actions);

  // 짧게는 이 구간 끝, 길게는 이 운동 통째로 건너뛰기 (01_spec.md 4.3)
  attachPress(nextBtn, { onShort: () => onNext?.(), onLong: () => onSkip?.() });
  pauseBtn.addEventListener('click', () => onPause?.());
  endBtn.addEventListener('click', () => onEnd?.());
  undoBtn.addEventListener('click', () => onUndo?.());

  let dotCount = -1;

  function paintDots(total, done, current) {
    if (dotCount !== total) {
      dots.replaceChildren(...Array.from({ length: total }, () => el('i', 'run-dot')));
      dotCount = total;
    }
    const nodes = dots.children;
    for (let i = 0; i < nodes.length; i += 1) {
      setFlag(nodes[i], 'is-done', i < done);
      setFlag(nodes[i], 'is-now', i === current);
    }
  }

  return {
    el: root,

    update(m) {
      setText(phaseChip, m.phaseLabel);
      setText(position, m.posText);
      setText(elapsed, m.elapsedText);

      setText(lead, m.lead);
      setText(name, m.title);
      setText(setValue, m.setText);
      setText(repsValue, m.repsText);
      paintDots(m.dotsTotal, m.dotsDone, m.dotsCurrent);

      setText(timer, m.timerText);
      setText(timerNote, m.timerNote);
      setFlag(timer, 'is-overrun', m.isOverrun);
      setFlag(timer, 'is-paused', m.paused);

      setText(upNext, m.upNextText);
      // 전환 구간은 가운데가 이미 다음 운동이라 예고할 것이 없다. 빈 줄을 남기지 않는다
      if (upNext.hidden !== !m.upNextText) upNext.hidden = !m.upNextText;
      setText(pauseBtn, m.paused ? TEXT.unpauseAction : TEXT.pauseAction);
      if (nextHint.hidden !== !m.canSkip) nextHint.hidden = !m.canSkip;

      // 되돌릴 수 있는 동안에는 다음 버튼 위에 되돌리기 줄이 끼어든다
      if (undoBar.hidden === m.undoPending) undoBar.hidden = !m.undoPending;

      if (root.dataset.phase !== m.phaseKey) root.dataset.phase = m.phaseKey;
      setFlag(root, 'is-paused', m.paused);
    },
  };
}
