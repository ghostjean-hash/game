// 노노그램 효과음 음색표.
//
// 소리를 내는 그릇(오디오 열기·음소거·절전·재생)은 공용 자산 shared/frame/audio.js가 맡는다.
// 네 게임에 거의 같은 그릇 코드가 복사돼 있어 한 곳을 고치면 나머지가 낡은 채 남던 것을
// 공용으로 옮겼다(html-game 표준 4.8-9). 이 파일에는 이 게임만의 소리 레시피만 남긴다.
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(docs/04 §3.5, 매직넘버 규칙 예외).

import { tone } from '../../../../shared/frame/audio.js';

// 효과음별 합성 레시피. 초4 타깃 - 조용하고 귀엽게, 과하지 않게.
export const SOUNDS = {
  // 칠하기: 짧고 밝은 톡.
  fill: (c) => tone(c, { freq: 620, to: 780, dur: 0.07, type: 'triangle', gain: 0.22 }),
  // 지우기: 살짝 낮은 톡.
  erase: (c) => tone(c, { freq: 420, to: 300, dur: 0.07, type: 'triangle', gain: 0.16 }),
  // X 표시: 부드러운 틱.
  mark: (c) => tone(c, { freq: 900, dur: 0.05, type: 'sine', gain: 0.12 }),
  // 실수: 짧은 하강음(부드럽게 알림).
  mistake: (c) => tone(c, { freq: 300, to: 180, dur: 0.16, type: 'sine', gain: 0.14 }),
  // 클리어: 도-미-솔-도 상승 팡파레.
  clear: (c) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.18, type: 'triangle', gain: 0.14, delay: i * 0.1 }));
  },
  // 별 반짝(결과에서 별 개수만큼 계단식 재생).
  star: (c) => {
    tone(c, { freq: 1319, dur: 0.14, type: 'triangle', gain: 0.1 });
    tone(c, { freq: 1976, dur: 0.16, type: 'sine', gain: 0.07, delay: 0.04 });
  },
};
