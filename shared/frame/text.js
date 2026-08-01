// 시작 흐름 공용 프레임 - 고정 문구와 화면 이름.
//
// 왜 여기에 모으나: 같은 뜻을 게임마다 다르게 쓰던 것을 한 곳에 못박기 위함이다.
// 기획서 Ⅰ권 5.3(화면 문구 고정)이 이 파일의 단일 진실 source이며,
// 문구를 바꾸려면 그 문서를 먼저 고친다. tests/frame.test.mjs가 이 표와 문서의 일치를 지킨다.
// 되돌리기: 게임이 자기 문구를 쓰던 상태로 가려면 이 파일 대신 각 게임 문자열을 쓰면 된다.

// 다섯 화면 이름(기획서 Ⅰ권 3장). 순서가 곧 깊이 순서다.
// select는 판을 고르는 화면으로, 골라 들어가는 형 게임만 쓴다(Ⅰ권 6.1).
export const SCREEN = {
  INTRO: 'intro',
  TITLE: 'title',
  SELECT: 'select',
  PLAY: 'play',
  PAUSE: 'pause',
  RESULT: 'result',
};

// 화면 위에 겹쳐 뜨는 층. 플레이를 덮되 플레이를 벗어난 것은 아니다(Ⅰ권 4.1).
export const OVERLAY_SCREENS = [SCREEN.PAUSE, SCREEN.RESULT];

// 고정 문구(Ⅰ권 5.3). 왼쪽이 상황, 오른쪽이 화면에 그대로 나가는 말이다.
export const TEXT = {
  start: '시작',
  resume: '이어서 하기',
  continue: '계속하기',
  retry: '다시 하기',
  quit: '그만하기',
  settings: '환경설정',
  restart: '다시 시작',
  noRecord: '기록 없음',
};

// 쓰지 않기로 한 표현. 문구가 다시 갈라지는 것을 테스트가 잡도록 목록으로 남긴다(Ⅰ권 5.3 표 오른쪽 칸).
export const BANNED_TEXT = {
  start: ['게임 시작', '플레이', '새 게임'],
  resume: ['계속하기', '이어하기', '재개'],
  continue: ['재개', '돌아가기'],
  retry: ['재시작', '한 판 더', '다시'],
  quit: ['나가기', '종료', '홈으로'],
  settings: ['설정', '옵션'],
};

// 상단 띠 버튼의 화면 낭독용 이름. 아이콘만 있는 버튼이라 이 값이 유일한 설명이다.
export const LABEL = {
  back: '되돌아가기',
  sound: '소리',
  soundOn: '소리 끄기',
  soundOff: '소리 켜기',
  fullscreen: '전체화면',
  settings: '환경설정',
  pause: '잠깐 멈춤',
};
