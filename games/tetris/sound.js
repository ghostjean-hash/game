// 테트리스 효과음 음색표.
//
// 소리를 내는 그릇(오디오 열기·음소거·절전·재생)은 공용 자산 shared/frame/audio.js가 맡는다.
// 네 게임에 거의 같은 그릇 코드가 복사돼 있어 한 곳을 고치면 나머지가 낡은 채 남던 것을
// 공용으로 옮겼다(html-game 표준 4.8-9). 이 파일에는 이 게임만의 소리 레시피만 남긴다.
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(매직넘버 규칙 예외).

import { tone } from '../../shared/frame/audio.js';

// 효과음별 합성 레시피. 아이도 쓰는 게임 - 조용하고 또렷하게, 과하지 않게.
export const SOUNDS = {
  // 좌우 이동: 아주 짧고 낮은 틱(자주 나므로 조용히).
  move: (c) => tone(c, { freq: 220, dur: 0.03, type: 'square', gain: 0.05 }),
  // 회전: 살짝 높은 틱.
  rotate: (c) => tone(c, { freq: 520, to: 640, dur: 0.05, type: 'triangle', gain: 0.09 }),
  // 하드드롭: 낮게 떨어지는 쿵.
  drop: (c) => tone(c, { freq: 320, to: 120, dur: 0.12, type: 'sawtooth', gain: 0.14 }),
  // 블록 고정: 부드러운 톡.
  lock: (c) => tone(c, { freq: 180, dur: 0.06, type: 'sine', gain: 0.1 }),
  // 라인 클리어: 밝은 도-미-솔 상승음.
  line: (c) => {
    [523, 659, 784].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.14, type: 'triangle', gain: 0.14, delay: i * 0.06 }));
  },
  // 테트리스(4줄): 더 화려한 도-미-솔-도 팡파레.
  tetris: (c) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.18, type: 'triangle', gain: 0.16, delay: i * 0.07 }));
  },
  // 홀드: 중립 틱.
  hold: (c) => tone(c, { freq: 440, dur: 0.05, type: 'sine', gain: 0.08 }),
  // 레벨업: 짧은 상승 아르페지오.
  levelup: (c) => {
    [660, 880, 1175].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.12, type: 'triangle', gain: 0.13, delay: i * 0.05 }));
  },
  // 게임 오버: 부드러운 하강음.
  gameover: (c) => {
    [440, 349, 262].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.22, type: 'sine', gain: 0.14, delay: i * 0.14 }));
  },
};
