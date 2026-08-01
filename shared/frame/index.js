// 시작 흐름 공용 프레임 - 조립 진입점.
//
// 게임은 이 파일 하나만 부르면 다섯 화면 골격, 상단 띠, 시작 화면, 잠깐 멈춤, 결과 카드,
// 되돌아가기 계단, 소리, 진행 저장을 한 번에 갖는다. 부품을 따로 쓰고 싶으면 각 모듈을
// 직접 불러도 된다(screens.js / topbar.js / titlescreen.js / cards.js / audio.js / save.js).
//
// 이 단계에서는 게임 파일을 건드리지 않는다. 부품을 먼저 만들고 노노그램 하나로 검증한 뒤
// 나머지 넷에 순차 적용하는 것이 확정된 순서다(Ⅰ권 9장, 2026-08-01).
// SSOT: standards/html-game/plans/doc/screen-frame.html

import { SCREEN, TEXT, LABEL } from './text.js';
import { createScreens } from './screens.js';
import { mountTopbar } from './topbar.js';
import { mountTitleScreen } from './titlescreen.js';
import { mountPauseCard, mountResultCard } from './cards.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { setupFullscreen, isFullscreenSupported } from '../fullscreen.js';

// 프레임 하나를 만든다. 인자 대부분은 시작 화면 규격 그대로다(Ⅰ권 5장).
//   root:      프레임이 들어갈 요소(보통 페이지 본문 전체)
//   gameId:    저장 네임스페이스. shared/storage.js와 같은 값을 쓴다
//   hasSelect: 판 고르는 화면을 쓰는 게임인가(골라 들어가는 형)
//   light:     흰 바탕 게임인가. 배경 결과 그림자를 반대로 뒤집는다
//   sounds:    게임별 음색표(shared/frame/audio.js BASE_SOUNDS 위에 얹힘)
export function createGameFrame({
  root,
  gameId,
  title,
  tagline = '',
  background = null,
  character = null,
  hasSelect = false,
  light = false,
  hubHref = '../../',
  buttons = ['settings', 'sound', 'fullscreen'],
  sounds = {},
  resume = null,
  choices = null,
  options = null,
  extras = [],
  startHint = '',
  onStart = null,
  onResume = null,
  onChoice = null,
  onOption = null,
  onExtra = null,
  onSettings = null,
  onScreenChange = null,
} = {}) {
  if (!root) throw new Error('createGameFrame: root required');
  if (!gameId) throw new Error('createGameFrame: gameId required');

  if (light) root.classList.add('is-light');

  const save = createSave(gameId);
  const screens = createScreens({ root, hubHref, hasSelect, onChange: onScreenChange });

  // 화면 칸을 미리 만들어 둔다. 게임은 playEl 안에 자기 플레이 화면을 그리면 된다.
  const titleEl = document.createElement('section');
  const playEl = document.createElement('section');
  const selectEl = hasSelect ? document.createElement('section') : null;
  screens.register(SCREEN.TITLE, titleEl);
  if (selectEl) screens.register(SCREEN.SELECT, selectEl);
  screens.register(SCREEN.PLAY, playEl);

  const audio = createAudio({
    sounds,
    onMutedChange: (m) => {
      save.saveMuted(m);
      topbar.setMuted(m);
    },
  });

  const topbar = mountTopbar({
    parent: root,
    buttons,
    onBack: () => screens.back(),
    onSound: () => audio.setMuted(!audio.isMuted()),
    onFullscreen: null,        // setupFullscreen이 이 버튼을 직접 맡는다
    onSettings,
    onPause: () => screens.go(SCREEN.PAUSE),
  });

  // 지난번 음소거 상태를 되살린다. 게임마다 저장 위치가 달라 기억이 안 되던 것을 하나로 맞춘다.
  audio.setMuted(save.readMuted());

  // 전체화면은 이미 있는 공용 모듈이 맡는다. 막힌 기기에서는 자리를 비우고
  // 홈 화면 추가 안내를 그 모듈이 띄운다(Ⅰ권 5.5).
  const fsBtn = topbar.button('fullscreen');
  let fullscreen = null;
  if (fsBtn) {
    topbar.setFullscreenAvailable(true);
    fullscreen = setupFullscreen({ button: fsBtn });
  }

  const titleScreen = mountTitleScreen({
    parent: titleEl,
    title,
    tagline,
    background,
    character,
    record: '',
    resume,
    choices,
    options,
    extras,
    onStart: (sel) => {
      audio.play('start');
      if (onStart) onStart(sel);
    },
    onResume: () => {
      audio.play('start');
      if (onResume) onResume(save.readResume());
    },
    onChoice,
    onOption,
    onExtra,
  });
  if (startHint) titleScreen.setStartHint(startHint);

  const pause = mountPauseCard({ parent: root });
  const result = mountResultCard({ parent: root });
  pause.on('continue', () => screens.back());
  pause.on('quit', () => screens.go(SCREEN.TITLE));
  result.on('quit', () => screens.go(SCREEN.TITLE));

  // 화면을 벗어나면 소리를 재우고, 플레이 중이었다면 잠깐 멈춤 상태로 바꾼다.
  // 돌아왔을 때 이미 죽어 있는 일을 막는 것이 목적이다(Ⅰ권 3.4).
  function onVisibility() {
    if (document.hidden) {
      audio.suspendAudio();
      if (screens.current() === SCREEN.PLAY) screens.go(SCREEN.PAUSE);
    } else {
      audio.resumeAudio();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  // 상단 띠 가운데 칸은 시작 화면에서 비우고 플레이에서만 채운다(Ⅰ권 5.2).
  screens.onChange((now) => {
    if (now === SCREEN.TITLE) topbar.setCenter(null);
  });

  return {
    screens,
    topbar,
    title: titleScreen,
    pause,
    result,
    audio,
    save,
    fullscreen,
    // 게임이 자기 화면을 그릴 자리.
    playEl,
    selectEl,
    titleEl,
    // 자주 쓰는 이동을 짧게.
    start() { screens.go(hasSelect ? SCREEN.SELECT : SCREEN.PLAY); },
    toPlay() { screens.go(SCREEN.PLAY); },
    toTitle() { screens.go(SCREEN.TITLE); },
    // 판이 끝났을 때. 결과 카드를 채우고 겹치는 층으로 올린다.
    finish({ title: t, lines = [], newRecord = false } = {}) {
      result.show({ title: t, lines, newRecord });
      audio.play(newRecord ? 'clear' : 'fail');
      screens.go(SCREEN.RESULT);
    },
    destroy() {
      document.removeEventListener('visibilitychange', onVisibility);
      fullscreen?.destroy?.();
      screens.destroy();
      titleScreen.destroy();
      pause.destroy();
      result.destroy();
      topbar.destroy();
    },
  };
}

export { SCREEN, TEXT, LABEL, isFullscreenSupported };
export { createScreens } from './screens.js';
export { createStack } from './stack.js';
export { mountTopbar } from './topbar.js';
export { mountTitleScreen } from './titlescreen.js';
export { mountPauseCard, mountResultCard } from './cards.js';
export { createAudio, tone, BASE_SOUNDS } from './audio.js';
export { createSave } from './save.js';
