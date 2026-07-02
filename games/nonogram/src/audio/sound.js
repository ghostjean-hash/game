// Web Audio 효과음 합성. 음원 파일 없이 oscillator/gain으로 짧은 소리를 만든다(vanilla, 자산 0).
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(docs/04 §3.5, 매직넘버 규칙 예외).
// DOM이 아닌 Web Audio API(window.AudioContext)만 쓰므로 core 모듈은 아니다(docs/03 §2).

let ctx = null;
let muted = false;
let unlocked = false;

// 음소거 중에는 오디오 스레드를 재워(suspend) 상시 가동을 막는다.
export function setMuted(m) {
  muted = !!m;
  if (!ctx) return;
  if (muted) ctx.suspend();
  else if (unlocked) ctx.resume();
}
export function isMuted() { return muted; }

// 탭이 백그라운드로 가면 오디오 렌더링을 재워 배터리·발열을 아낀다(main이 visibilitychange에서 호출).
export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function resumeAudio() {
  if (unlocked && !muted && ctx && ctx.state === 'suspended') ctx.resume();
}

// AudioContext는 첫 재생 시점에 만든다(브라우저 자동재생 정책: 사용자 제스처 후).
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC({ latencyHint: 'interactive' });
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 첫 사용자 제스처에서 오디오를 깨우고 무음 keep-alive를 시작한다(main이 첫 제스처에서 1회 호출).
let keepAlive = null;
export function unlockAudio() {
  if (unlocked) return;
  const c = audioCtx();
  if (!c) return;
  unlocked = true;
  try {
    keepAlive = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001; // 거의 무음(들리지 않음)
    keepAlive.connect(g).connect(c.destination);
    keepAlive.start(); // 게임 내내 무음을 흘려 출력 장치를 깨워 둔다
  } catch { /* 실패해도 게임 진행 무관 */ }
  if (muted) c.suspend();
}

// 오디오 시계가 막 깬 첫 재생에서 어택이 잘리는 것을 막는 예약 지연(인지 한계 이하).
const SCHEDULE_AHEAD = 0.015;

// 단음 하나: 주파수 freq(→ to로 글라이드), 길이 dur(초), 파형, 게인, 시작 지연.
function tone(c, { freq, to, dur, type = 'sine', gain = 0.15, delay = 0 }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003); // 빠른 어택(즉각 또렷하게)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 효과음별 합성 레시피. 초4 타깃 - 조용하고 귀엽게, 과하지 않게.
const SOUNDS = {
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

// 효과음 재생. 음소거거나 Web Audio 미지원이면 조용히 넘어간다(게임 진행 무관).
export function play(name) {
  if (muted) return;
  const c = audioCtx();
  if (!c) return;
  const fn = SOUNDS[name];
  if (!fn) return;
  const run = () => { try { fn(c); } catch { /* 오디오 실패는 게임에 영향 없음 */ } };
  if (c.state === 'running') run();
  else c.resume().then(run).catch(() => {});
}

// 별 개수만큼 star 사운드를 계단식 재생(클리어 뒤 결과 화면).
export function playStars(count) {
  if (muted) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => play('star'), i * 180);
  }
}
