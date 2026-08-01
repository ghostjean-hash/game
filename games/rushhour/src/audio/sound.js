// 러시아워 효과음 음색표.
//
// 소리를 내는 그릇(오디오 열기·음소거·절전·재생)은 공용 자산 shared/frame/audio.js가 맡는다.
// 네 게임에 거의 같은 그릇 코드가 복사돼 있어 한 곳을 고치면 나머지가 낡은 채 남던 것을
// 공용으로 옮겼다(html-game 표준 4.8-9). 이 파일에는 이 게임만의 소리 레시피만 남긴다.
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(매직넘버 규칙 예외).

import { tone } from '../../../../shared/frame/audio.js';

export const SOUNDS = {
  move: (c) => tone(c, { freq: 500, to: 760, dur: 0.13, type: 'triangle', gain: 0.35 }),
  hint: (c) => {
    tone(c, { freq: 660, dur: 0.12, type: 'sine', gain: 0.12 });
    tone(c, { freq: 990, dur: 0.16, type: 'sine', gain: 0.1, delay: 0.08 });
  },
  buy: (c) => {
    tone(c, { freq: 880, dur: 0.1, type: 'square', gain: 0.07 });
    tone(c, { freq: 1320, dur: 0.14, type: 'square', gain: 0.06, delay: 0.07 });
  },
  deny: (c) => tone(c, { freq: 200, to: 110, dur: 0.18, type: 'sawtooth', gain: 0.09 }),
  clear: (c) => {
    [523, 659, 784, 1047].forEach((f, i) => // 도-미-솔-도 상승
      tone(c, { freq: f, dur: 0.18, type: 'triangle', gain: 0.13, delay: i * 0.1 }));
  },
  // 별 획득 반짝(결과 팝업에서 별 개수만큼 계단식 재생). 맑고 짧은 종소리.
  star: (c) => {
    tone(c, { freq: 1319, dur: 0.14, type: 'triangle', gain: 0.1 });
    tone(c, { freq: 1976, dur: 0.16, type: 'sine', gain: 0.07, delay: 0.04 });
  },
};

// 효과음 재생. 음소거거나 Web Audio 미지원이면 조용히 넘어간다(게임 진행 무관).
