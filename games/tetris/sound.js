// Web Audio 효과음 합성. 음원 파일 없이 oscillator/gain으로 짧은 소리를 만든다(vanilla, 자산 0).
// nonogram/src/audio/sound.js 패턴 차용(자산 0 합성 + 유휴 절전 + 첫 제스처 unlock).
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(매직넘버 규칙 예외).

let ctx = null;
let muted = false;
let unlocked = false;

export function setMuted(m) {
  muted = !!m;
  if (!ctx) return;
  if (muted) ctx.suspend();
  else if (unlocked) ctx.resume();
}
export function isMuted() { return muted; }

// 탭이 백그라운드로 가면 오디오 렌더링을 재워 배터리·발열을 아낀다.
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

// 첫 사용자 제스처에서 오디오를 깨우고 무음 keep-alive를 시작한다(첫 제스처에서 1회 호출).
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
    keepAlive.start();
  } catch { /* 실패해도 게임 진행 무관 */ }
  if (muted) c.suspend();
}

// 오디오 시계가 막 깬 첫 재생에서 어택이 잘리는 것을 막는 예약 지연(인지 한계 이하).
const SCHEDULE_AHEAD = 0.015;

// 유휴 절전: 마지막 소리 후 이 시간 동안 재생이 없으면 오디오 스레드를 재운다.
const IDLE_MS = 4000;
let idleTimer = null;
function scheduleIdleSuspend() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (ctx && ctx.state === 'running' && !muted) ctx.suspend();
  }, IDLE_MS);
}

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

// 효과음별 합성 레시피. 아이도 쓰는 게임 - 조용하고 또렷하게, 과하지 않게.
const SOUNDS = {
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
  scheduleIdleSuspend();
}
