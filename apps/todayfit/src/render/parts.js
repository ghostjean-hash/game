// 관리 화면 공통 조각 (05_manage-screens.md 2.1).
//
// 화면 아홉이 같은 머리·같은 줄·같은 입력 칸을 쓴다. 그 모양을 여기 모아 두지 않으면
// 아홉 자리에 조금씩 다른 사본이 생기고, 한 자리를 고쳤을 때 나머지 여덟이 안 따라온다.
//
// 여기 있는 것은 전부 DOM 을 만들어 돌려주기만 한다. 상태를 읽지도 바꾸지도 않고,
// 사용자 조작은 받아 둔 함수로 그대로 넘긴다(03_architecture.md 2.3).

import { TEXT } from '../data/phrases.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(className, label, onClick) {
  const btn = el('button', className, label);
  btn.type = 'button';
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

/**
 * 관리 화면 머리 - 뒤로 버튼과 제목.
 *
 * 뒤로 가기를 브라우저 이력이 아니라 이 버튼으로 두는 이유는 05_manage-screens.md 3.3 에 있다.
 * onBack 이 없으면(주 화면) 버튼 자리를 비워 제목이 가운데로 밀리지 않게 한다.
 */
export function screenHead(title, onBack, note) {
  const head = el('header', 'mhead');
  if (onBack) {
    const back = button('mhead-back', '', onBack);
    back.setAttribute('aria-label', TEXT.backAction);
    back.append(backIcon());
    head.append(back);
  } else {
    head.append(el('span', 'mhead-back is-empty'));
  }
  const box = el('div', 'mhead-box');
  box.append(el('h2', 'mhead-title', title));
  if (note) box.append(el('p', 'mhead-note', note));
  head.append(box);
  return head;
}

function backIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M15 19 8 12l7-7');
  svg.append(path);
  return svg;
}

/** 화면 몸통. 스크롤이 여기서만 일어나게 머리와 아래 버튼을 밖에 둔다. */
export function body(className) {
  return el('div', `mbody${className ? ` ${className}` : ''}`);
}

/**
 * 누르면 다른 화면으로 가는 줄. 설정 화면과 목록 화면이 쓴다.
 * 오른쪽 꺾쇠는 누를 수 있다는 표시라 값 뒤에 늘 붙인다.
 */
export function navRow({ label, value, note, onClick }) {
  const row = button('mrow mrow-nav', '');
  const box = el('div', 'mrow-box');
  box.append(el('span', 'mrow-label', label));
  if (note) box.append(el('span', 'mrow-note', note));
  row.append(box);
  if (value !== undefined && value !== null && value !== '') {
    row.append(el('span', 'mrow-value', value));
  }
  row.append(el('span', 'mrow-chev', TEXT.markChevron));
  if (onClick) row.addEventListener('click', onClick);
  return row;
}

/** 값만 보이는 줄. 누를 수 없다. */
export function infoRow(label, value, className) {
  const row = el('div', `mrow${className ? ` ${className}` : ''}`);
  row.append(el('span', 'mrow-label', label), el('span', 'mrow-value', value));
  return row;
}

function fieldShell(label, note) {
  const wrap = el('label', 'mfield');
  wrap.append(el('span', 'mfield-label', label));
  const slot = el('div', 'mfield-slot');
  wrap.append(slot);
  if (note) wrap.append(el('span', 'mfield-note', note));
  return { wrap, slot };
}

/** 오류 글자는 안내 자리를 대신 쓴다 - 줄이 하나 늘었다 줄었다 하면 화면이 흔들린다. */
function setNote(wrap, text, isError) {
  let note = wrap.querySelector('.mfield-note');
  if (!note) {
    note = el('span', 'mfield-note');
    wrap.append(note);
  }
  note.textContent = text || '';
  note.classList.toggle('is-error', !!isError);
}

/**
 * 글자 입력 칸.
 * 저장은 칸을 떠날 때(change) 한 번만 한다 - 한 자 칠 때마다 저장하면 저장 장치를
 * 계속 두드린다(05_manage-screens.md 3.6).
 */
export function textField({ label, value, placeholder, note, maxLength, onCommit }) {
  const { wrap, slot } = fieldShell(label, note);
  const input = el('input', 'mfield-input');
  input.type = 'text';
  input.value = value ?? '';
  if (placeholder) input.placeholder = placeholder;
  if (maxLength) input.maxLength = maxLength;
  input.addEventListener('change', () => {
    const result = onCommit ? onCommit(input.value) : null;
    if (result && result.error) {
      input.value = result.value ?? '';
      setNote(wrap, result.error, true);
      return;
    }
    if (result && result.value !== undefined) input.value = result.value;
    setNote(wrap, note, false);
  });
  slot.append(input);
  return wrap;
}

/**
 * 수 입력 칸.
 * 비울 수 있는 칸은 빈 칸일 때 무엇이 대신 쓰이는지를 안내에 적는다 -
 * 값 사다리를 화면에서 읽을 수 있는 자리다(05_manage-screens.md 4.3.2).
 */
export function numberField({ label, value, unit, note, onCommit }) {
  const { wrap, slot } = fieldShell(label, note);
  const input = el('input', 'mfield-input is-num');
  input.type = 'number';
  input.inputMode = 'numeric';
  input.value = value === null || value === undefined ? '' : String(value);
  input.addEventListener('change', () => {
    const result = onCommit ? onCommit(input.value) : null;
    if (result && result.error) {
      input.value = result.value === null || result.value === undefined ? '' : String(result.value);
      setNote(wrap, result.error, true);
      return;
    }
    if (result && result.value !== undefined) {
      input.value = result.value === null ? '' : String(result.value);
    }
    // 값이 바뀌면 그 값의 출처도 바뀐다. 화면을 다시 그리지 않고 이 칸만 고쳐 쓴다
    setNote(wrap, result && result.note !== undefined ? result.note : note, false);
  });
  slot.append(input);
  if (unit) slot.append(el('span', 'mfield-unit', unit));
  return wrap;
}

/** 시간 칸. 브라우저 시간 입력을 쓴다 - 손으로 치는 것보다 빠르고 형식이 어긋나지 않는다. */
export function timeField({ label, value, note, onCommit }) {
  const { wrap, slot } = fieldShell(label, note);
  const input = el('input', 'mfield-input is-time');
  input.type = 'time';
  input.value = value ?? '';
  input.addEventListener('change', () => {
    const result = onCommit ? onCommit(input.value) : null;
    if (result && result.error) {
      input.value = result.value ?? '';
      setNote(wrap, result.error, true);
      return;
    }
    setNote(wrap, note, false);
  });
  slot.append(input);
  return wrap;
}

/** 켜고 끄는 줄. 누르는 즉시 저장한다(05_manage-screens.md 3.6). */
export function toggleRow({ label, note, on, onChange, focusKey }) {
  const row = el('div', 'mrow mrow-toggle');
  const box = el('div', 'mrow-box');
  box.append(el('span', 'mrow-label', label));
  if (note) box.append(el('span', 'mrow-note', note));
  row.append(box);

  const sw = button('mswitch', '', () => onChange?.(!on));
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', on ? 'true' : 'false');
  sw.setAttribute('aria-label', label);
  sw.classList.toggle('is-on', !!on);
  if (focusKey) sw.dataset.focusKey = focusKey;
  sw.append(el('span', 'mswitch-knob'));
  row.append(sw);
  return row;
}

/** 고르는 줄. 빈 값을 고를 수 있으면 emptyLabel 을 맨 위에 둔다. */
export function selectRow({ label, value, options, emptyLabel, onChange, focusKey }) {
  const row = el('label', 'mrow mrow-select');
  row.append(el('span', 'mrow-label', label));
  const sel = el('select', 'mselect');
  if (emptyLabel !== undefined) {
    const opt = el('option', null, emptyLabel);
    opt.value = '';
    sel.append(opt);
  }
  for (const o of options) {
    const opt = el('option', null, o.label);
    opt.value = o.value;
    sel.append(opt);
  }
  sel.value = value ?? '';
  if (focusKey) sel.dataset.focusKey = focusKey;
  sel.addEventListener('change', () => onChange?.(sel.value || null));
  row.append(sel);
  return row;
}

/** 화면 아래 주 조작. 이 앱은 한 화면에 하나다. */
export function primaryButton(label, onClick) {
  return button('big-btn', label, onClick);
}

/** 목록 위에 두는 더하기 버튼. */
export function addButton(label, onClick) {
  return button('madd', label, onClick);
}

/** 되돌릴 수 없는 조작. 눌러도 곧바로 일어나지 않고 확인 창을 거친다. */
export function dangerButton(label, onClick) {
  return button('mdanger', label, onClick);
}

/** 아무것도 없을 때. 무엇을 하면 되는지까지 적는다 - 빈 화면에 안내가 없으면 막힌다. */
export function emptyNote(text) {
  return el('div', 'empty', text);
}

/** 화면 아래에 고정으로 붙는 설명. 반영 시점처럼 한 화면 전체에 걸리는 말을 담는다. */
export function footNote(text) {
  return el('p', 'mfoot', text);
}

/** 여러 줄을 묶는 상자. 제목은 없어도 된다. */
export function group(title) {
  const box = el('section', 'mgroup');
  if (title) box.append(el('h3', 'mgroup-title', title));
  return box;
}

/**
 * 다시 그린 뒤 같은 자리에 초점을 되돌린다.
 * 켜고 끄는 줄을 누르면 화면을 다시 그리는데, 그대로 두면 누른 자리의 초점이 사라져
 * 화면 낭독기가 어디를 읽던 중인지 잃는다.
 */
export function restoreFocus(root, focusKey) {
  if (!focusKey) return;
  const found = root.querySelector(`[data-focus-key="${focusKey}"]`);
  if (found) found.focus({ preventScroll: true });
}
