// 시작 흐름 공용 프레임 - 상단 띠(기획서 Ⅰ권 5.2).
//
// 왜 만드나: 지금은 소리 버튼이 게임마다 위쪽 띠에 있거나 화면 구석에 있거나 아예 없다.
// 자리와 아이콘을 여기서 한 번 정해 두면 게임을 옮겨 다녀도 같은 자리에 같은 것이 있다.
// 세 구역 고정 - 왼쪽은 되돌아가기 하나만, 가운데는 플레이 중 점수, 오른쪽은 도구 아이콘.
//
// 아이콘은 인라인 SVG로 그린다. 이모지는 기기마다 모양이 달라 같은 화면이 아니게 된다.
// 되돌리기: mountTopbar를 부르지 않으면 게임이 쓰던 자기 띠가 그대로 남는다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 5.2.

import { LABEL } from './text.js';

const ICON = {
  back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  soundOn: '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M16 9a4 4 0 010 6"/>',
  soundOff: '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  fullscreen: '<path d="M8 3H5a2 2 0 00-2 2v3"/><path d="M16 3h3a2 2 0 012 2v3"/><path d="M8 21H5a2 2 0 01-2-2v-3"/><path d="M16 21h3a2 2 0 002-2v-3"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
};

function iconButton(name, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gg-ic';
  b.dataset.ggIcon = name;
  b.setAttribute('aria-label', label);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`;
  return b;
}

// 상단 띠를 만들어 붙인다.
//   parent:   띠를 넣을 요소
//   buttons:  오른쪽에 둘 도구. 'settings' | 'sound' | 'fullscreen' | 'pause'
//             순서는 지정과 무관하게 규격 순서로 고정된다(게임마다 순서가 달라지지 않게).
//   on...:    각 버튼을 눌렀을 때 부를 것. 넘기지 않은 버튼은 아예 만들지 않는다.
export function mountTopbar({
  parent,
  buttons = ['settings', 'sound', 'fullscreen'],
  onBack = null,
  onSound = null,
  onFullscreen = null,
  onSettings = null,
  onPause = null,
} = {}) {
  if (!parent) throw new Error('mountTopbar: parent required');

  const bar = document.createElement('div');
  bar.className = 'gg-topbar';

  // 왼쪽 - 되돌아가기 하나만. 다른 것을 두지 않는 것이 규격이다.
  const back = iconButton('back', LABEL.back);
  if (onBack) back.addEventListener('click', onBack);
  bar.appendChild(back);

  // 가운데 - 시작 화면에서는 비우고 플레이에서 점수·진행이 온다.
  const center = document.createElement('div');
  center.className = 'gg-topbar-center';
  bar.appendChild(center);

  // 오른쪽 - 규격 순서(환경설정 → 소리 → 전체화면 → 잠깐 멈춤)로 강제한다.
  const ORDER = ['settings', 'sound', 'fullscreen', 'pause'];
  const handlers = { settings: onSettings, sound: onSound, fullscreen: onFullscreen, pause: onPause };
  const made = {};
  ORDER.filter((k) => buttons.includes(k)).forEach((k) => {
    const iconName = k === 'sound' ? 'soundOn' : k;
    const btn = iconButton(iconName, LABEL[k] || k);
    btn.dataset.ggBtn = k;
    if (handlers[k]) btn.addEventListener('click', handlers[k]);
    bar.appendChild(btn);
    made[k] = btn;
  });

  parent.appendChild(bar);

  return {
    el: bar,
    center,
    button(name) { return made[name] || null; },
    // 가운데 칸 내용. 시작 화면에서는 비우는 것이 규격이라 게임이 직접 지운다.
    setCenter(node) {
      center.replaceChildren();
      if (typeof node === 'string') center.textContent = node;
      else if (node) center.appendChild(node);
    },
    // 소리 아이콘을 상태에 맞춰 바꾼다(모양과 낭독용 이름 둘 다).
    setMuted(muted) {
      const b = made.sound;
      if (!b) return;
      b.querySelector('svg').innerHTML = muted ? ICON.soundOff : ICON.soundOn;
      b.setAttribute('aria-label', muted ? LABEL.soundOff : LABEL.soundOn);
      b.dataset.ggMuted = muted ? '1' : '0';
    },
    // 전체화면이 막힌 기기에서는 자리를 비운다(Ⅰ권 5.2). 안내는 shared/fullscreen.js가 맡는다.
    setFullscreenAvailable(available) {
      const b = made.fullscreen;
      if (b) b.hidden = !available;
    },
    destroy() { bar.remove(); },
  };
}

export { ICON as TOPBAR_ICONS };
