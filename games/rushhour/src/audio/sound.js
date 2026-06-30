// Web Audio 효과음 합성. 음원 파일 없이 oscillator/gain으로 짧은 소리를 만든다(vanilla, 자산 0).
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(docs/04 §3.5, 매직넘버 규칙 예외).
// DOM이 아닌 Web Audio API(window.AudioContext)만 쓰므로 core 모듈은 아니다(docs/03 §2).

let ctx = null;
let muted = false;
let unlocked = false;

export function setMuted(m) { muted = !!m; }
export function isMuted() { return muted; }

// AudioContext는 첫 재생 시점에 만든다(브라우저 자동재생 정책: 사용자 제스처 후).
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// iOS(아이폰/아이패드)는 사용자 제스처 핸들러 안에서 AudioContext를 깨우고 무음 버퍼를
// 한 번 재생해야 이후 소리가 난다. main이 첫 pointerdown/touchend에서 1회 호출한다.
// 이게 없으면 iOS 크롬/사파리에서 효과음이 통째로 안 들린다.
export function unlockAudio() {
  if (unlocked) return;
  const c = audioCtx();
  if (!c) return;
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050); // 1샘플 무음
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  } catch { /* 실패해도 게임 진행 무관 */ }
}

// 단음 하나: 주파수 freq(→ to로 글라이드), 길이 dur(초), 파형, 게인, 시작 지연.
function tone(c, { freq, to, dur, type = 'sine', gain = 0.15, delay = 0 }) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 효과음별 합성 레시피.
const SOUNDS = {
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
};

// 효과음 재생. 음소거거나 Web Audio 미지원이면 조용히 넘어간다(게임 진행 무관).
export function play(name) {
  if (muted) return;
  const c = audioCtx();
  if (!c) return;
  const fn = SOUNDS[name];
  if (!fn) return;
  try { fn(c); } catch { /* 오디오 실패는 게임에 영향 없음 */ }
}
