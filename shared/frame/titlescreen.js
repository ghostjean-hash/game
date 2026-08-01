// 시작 흐름 공용 프레임 - 시작 화면(기획서 Ⅰ권 5.1 / 5.4, A안).
//
// 규격 요약: 배경과 캐릭터가 화면 위쪽을 다 쓰고, 누르는 것은 전부 아래 조작단에 모인다.
// 칸의 순서와 강조는 고정이고 게임이 바꾸지 않는다. 게임마다 달라지는 것은 칸의 생김새뿐이다.
//
// 왜 부품으로 만드나: 갈래가 넷이든 여덟이든 첫 화면 높이가 변하지 않아야 하고(고르는 칸으로 접음),
// 아이폰처럼 브라우저 창이 화면을 먹는 기기에서 맨 아래 버튼이 도구모음에 붙지 않아야 한다.
// 이 두 가지는 게임마다 다시 지키기 어려워 공용 자산이 일괄로 맡는다(Ⅰ권 5.5 / 10장).
// 되돌리기: mountTitleScreen을 부르지 않으면 게임이 쓰던 자기 시작 화면이 그대로 남는다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 5장 / 6장.

import { TEXT } from './text.js';

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// 시작 화면을 만들어 붙인다.
//   background: { image } 또는 { el } 또는 { className }.
//               그림이 있으면 image, 게임 자체 요소로 대신하면 el이나 className을 준다(Ⅰ권 5.1).
//   character:  { src, width } - 없으면 제목만 크게 나온다.
//   record:     제목 아래 한 줄. 비우지 않는다. 기록이 없으면 '기록 없음'이 들어간다.
//   resume:     { enabled, detail } - 없으면 칸 자체를 만들지 않는다.
//               지원하는데 지금 저장이 없으면 enabled:false로 두어 누를 수 없는 상태로 보인다.
//   choices:    { label, items:[{id,name,note,record}], selectedId, openFirstVisit }
//   options:    { items:[{id,name}], selectedId } - 셋 이하일 때만 한 줄로 노출한다.
//   extras:     [{ id, label }] - 상점·도감처럼 그 게임에만 있는 화면. 맨 아래 한 줄에 나란히.
export function mountTitleScreen({
  parent,
  title,
  tagline = '',
  background = null,
  character = null,
  record = '',
  resume = null,
  choices = null,
  options = null,
  extras = [],
  onStart = null,
  onResume = null,
  onChoice = null,
  onOption = null,
  onExtra = null,
} = {}) {
  if (!parent) throw new Error('mountTitleScreen: parent required');

  const rootEl = el('div', 'gg-title');

  // 1. 배경 - 화면을 가득 채운다. 글자가 묻히지 않도록 아래쪽에 어두운 결을 까는 것은 CSS가 한다.
  const bg = el('div', 'gg-title-bg');
  if (background) {
    if (background.className) bg.classList.add(background.className);
    if (background.image) bg.style.backgroundImage = `url(${background.image})`;
    if (background.el) bg.appendChild(background.el);
  }
  rootEl.appendChild(bg);

  // 2. 표제 - 캐릭터, 게임 이름 하나, 기록 한 줄.
  const hero = el('div', 'gg-title-hero');
  if (character && character.src) {
    const img = document.createElement('img');
    img.src = character.src;
    img.alt = title || '';
    if (character.width) img.style.width = typeof character.width === 'number' ? `${character.width}px` : character.width;
    hero.appendChild(img);
  }
  hero.appendChild(el('h1', 'gg-title-name', title || ''));
  // 갈래마다 기록이 따로 있는 게임은 여기에 대표 기록을 적지 않는다(Ⅰ권 5.4).
  const recordLine = el('p', 'gg-title-record', record || (choices ? tagline : TEXT.noRecord));
  hero.appendChild(recordLine);
  rootEl.appendChild(hero);

  // 3. 조작단 - 누르는 것 전부가 여기 모인다. 순서는 고정이다.
  const dock = el('div', 'gg-dock');

  let resumeBtn = null;
  if (resume) {
    resumeBtn = el('button', 'gg-btn');
    resumeBtn.type = 'button';
    resumeBtn.appendChild(el('span', 'gg-btn-main', TEXT.resume));
    const detail = el('span', 'gg-btn-sub', resume.detail || '');
    resumeBtn.appendChild(detail);
    resumeBtn.disabled = resume.enabled === false;
    if (onResume) resumeBtn.addEventListener('click', () => { if (!resumeBtn.disabled) onResume(); });
    dock.appendChild(resumeBtn);
  }

  // 고르는 칸 - 갈래를 카드로 펼치지 않고 한 칸으로 접는다. 눌러야 목록이 위로 펼쳐진다.
  let pick = null;
  let list = null;
  let selectedId = choices ? (choices.selectedId || (choices.items[0] && choices.items[0].id)) : null;

  function findItem(id) { return (choices?.items || []).find((it) => it.id === id) || null; }

  function paintPick() {
    if (!pick) return;
    const it = findItem(selectedId);
    pick.querySelector('.gg-pick-value').textContent = it ? it.name : '';
    pick.querySelector('.gg-pick-record').textContent = it ? (it.record || TEXT.noRecord) : '';
  }

  function setListOpen(open) {
    if (!list) return;
    list.hidden = !open;
    if (pick) pick.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (choices && Array.isArray(choices.items) && choices.items.length) {
    pick = el('button', 'gg-pick');
    pick.type = 'button';
    pick.setAttribute('aria-expanded', 'false');
    pick.appendChild(el('span', 'gg-pick-label', choices.label || ''));
    pick.appendChild(el('span', 'gg-pick-value', ''));
    pick.appendChild(el('span', 'gg-pick-record', ''));
    const chev = el('span', 'gg-pick-chev');
    chev.innerHTML = CHEVRON;
    pick.appendChild(chev);

    list = el('div', 'gg-picklist');
    list.hidden = true;
    choices.items.forEach((it) => {
      const card = el('button', 'gg-card');
      card.type = 'button';
      card.dataset.ggChoice = it.id;
      const row = el('div', 'gg-card-row');
      row.appendChild(el('span', 'gg-card-name', it.name));
      row.appendChild(el('span', 'gg-card-record', it.record || TEXT.noRecord));
      card.appendChild(row);
      if (it.note) card.appendChild(el('div', 'gg-card-note', it.note));
      card.addEventListener('click', () => {
        selectedId = it.id;
        paintPick();
        list.querySelectorAll('.gg-card').forEach((c) => c.classList.toggle('is-on', c.dataset.ggChoice === selectedId));
        setListOpen(false);
        if (onChoice) onChoice(selectedId);
      });
      list.appendChild(card);
    });
    pick.addEventListener('click', () => setListOpen(list.hidden));
    paintPick();
    list.querySelectorAll('.gg-card').forEach((c) => c.classList.toggle('is-on', c.dataset.ggChoice === selectedId));
    dock.appendChild(list);      // 목록이 칸 위로 펼쳐지도록 칸보다 먼저 넣는다
    dock.appendChild(pick);
    // 처음 온 사람은 어떤 갈래가 있는지 모른 채 시작을 누를 수 있어, 첫 방문에는 펼쳐 둔다(Ⅰ권 5.4).
    if (choices.openFirstVisit) setListOpen(true);
  }

  // 고르는 옵션이 셋 이하면 환경설정에 숨기지 않고 시작 바로 위에 한 줄로 노출한다.
  let seg = null;
  let optionId = options ? (options.selectedId || (options.items[0] && options.items[0].id)) : null;
  if (options && Array.isArray(options.items) && options.items.length) {
    seg = el('div', 'gg-seg');
    options.items.forEach((it) => {
      const b = el('button', 'gg-seg-item', it.name);
      b.type = 'button';
      b.dataset.ggOption = it.id;
      b.addEventListener('click', () => {
        optionId = it.id;
        seg.querySelectorAll('.gg-seg-item').forEach((n) => n.classList.toggle('is-on', n.dataset.ggOption === optionId));
        if (onOption) onOption(optionId);
      });
      seg.appendChild(b);
    });
    seg.querySelectorAll('.gg-seg-item').forEach((n) => n.classList.toggle('is-on', n.dataset.ggOption === optionId));
    dock.appendChild(seg);
  }

  // 시작 - 가장 크고 강조된 하나.
  const startBtn = el('button', 'gg-btn gg-btn-primary', TEXT.start);
  startBtn.type = 'button';
  if (onStart) startBtn.addEventListener('click', () => onStart({ choiceId: selectedId, optionId }));
  dock.appendChild(startBtn);

  // 시작 다음 화면이 있는 게임(골라 들어가는 형)은 그 사실을 한 줄로 알린다.
  let hintLine = null;
  function setStartHint(text) {
    if (!text) { if (hintLine) { hintLine.remove(); hintLine = null; } return; }
    if (!hintLine) {
      hintLine = el('p', 'gg-title-hint', text);
      dock.insertBefore(hintLine, startBtn.nextSibling);
    } else hintLine.textContent = text;
  }

  // 게임 고유 화면은 새 칸을 만들지 않고 맨 아래 한 줄에 나란히 둔다.
  if (extras.length) {
    const row = el('div', 'gg-row');
    extras.forEach((ex) => {
      const b = el('button', 'gg-btn gg-btn-ghost', ex.label);
      b.type = 'button';
      b.dataset.ggExtra = ex.id || ex.label;
      b.addEventListener('click', () => { if (onExtra) onExtra(ex.id || ex.label); });
      row.appendChild(b);
    });
    dock.appendChild(row);
  }

  rootEl.appendChild(dock);
  parent.appendChild(rootEl);

  return {
    el: rootEl,
    background: bg,
    dock,
    setStartHint,
    setRecord(text) { recordLine.textContent = text || TEXT.noRecord; },
    // 저장이 생기거나 사라지면 이어서 하기 칸의 상태만 바꾼다. 칸을 없애지는 않는다(자리가 흔들리지 않게).
    setResume({ enabled, detail } = {}) {
      if (!resumeBtn) return;
      if (enabled !== undefined) resumeBtn.disabled = !enabled;
      if (detail !== undefined) resumeBtn.querySelector('.gg-btn-sub').textContent = detail || '';
    },
    setChoiceRecord(id, text) {
      const it = findItem(id);
      if (it) it.record = text;
      const card = list?.querySelector(`[data-gg-choice="${id}"] .gg-card-record`);
      if (card) card.textContent = text || TEXT.noRecord;
      if (id === selectedId) paintPick();
    },
    choiceId() { return selectedId; },
    optionId() { return optionId; },
    openChoices(open = true) { setListOpen(open); },
    destroy() { rootEl.remove(); },
  };
}
