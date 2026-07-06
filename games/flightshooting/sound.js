// Web Audio 효과음 합성. 음원 파일 없이 oscillator/gain으로 짧은 소리를 만든다(vanilla, 자산 0).
// tetris/sound.js 패턴 차용(자산 0 합성 + 유휴 절전 + 첫 제스처 unlock).
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

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function resumeAudio() {
  if (unlocked && !muted && ctx && ctx.state === 'suspended') ctx.resume();
}

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC({ latencyHint: 'interactive' });
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

let keepAlive = null;
export function unlockAudio() {
  if (unlocked) return;
  const c = audioCtx();
  if (!c) return;
  unlocked = true;
  try {
    keepAlive = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001;
    keepAlive.connect(g).connect(c.destination);
    keepAlive.start();
  } catch { /* 실패해도 게임 진행 무관 */ }
  if (muted) c.suspend();
}

const SCHEDULE_AHEAD = 0.015;
const IDLE_MS = 4000;
let idleTimer = null;
function scheduleIdleSuspend() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (ctx && ctx.state === 'running' && !muted) ctx.suspend();
  }, IDLE_MS);
}

function tone(c, { freq, to, dur, type = 'sine', gain = 0.15, delay = 0 }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 짧은 노이즈 버스트(폭발음용). 화이트노이즈 버퍼를 게인 엔벨로프로 감싼다.
function noise(c, { dur, gain = 0.15, delay = 0, lp = 1800 }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// 효과음별 합성 레시피. 캐주얼 톤 - 또렷하되 과하지 않게.
const SOUNDS = {
  // 발사: 아주 짧은 하강 틱(초당 여러 번이라 조용히).
  shoot: (c) => tone(c, { freq: 900, to: 520, dur: 0.05, type: 'square', gain: 0.035 }),
  // 적 피격(데미지만): 짧고 건조한 톡.
  hit: (c) => tone(c, { freq: 320, dur: 0.03, type: 'square', gain: 0.05 }),
  // 적 파괴: 노이즈 폭발.
  explode: (c) => noise(c, { dur: 0.18, gain: 0.16, lp: 1400 }),
  // 파워업 획득: 밝은 상승 아르페지오.
  power: (c) => {
    [660, 880, 1175].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.1, type: 'triangle', gain: 0.13, delay: i * 0.045 }));
  },
  // 봄/화면 클리어: 낮고 굵은 붐 + 노이즈.
  bomb: (c) => {
    tone(c, { freq: 160, to: 50, dur: 0.4, type: 'sawtooth', gain: 0.18 });
    noise(c, { dur: 0.5, gain: 0.16, lp: 900 });
  },
  // 피격(내 기체): 낮게 무너지는 소리.
  playerhit: (c) => {
    tone(c, { freq: 260, to: 90, dur: 0.3, type: 'sawtooth', gain: 0.16 });
    noise(c, { dur: 0.22, gain: 0.12, lp: 1000 });
  },
  // 보스 격파: 큰 폭발 연쇄.
  bossdown: (c) => {
    noise(c, { dur: 0.6, gain: 0.2, lp: 1200 });
    [523, 415, 330].forEach((f, i) =>
      tone(c, { freq: f, to: f * 0.6, dur: 0.3, type: 'sawtooth', gain: 0.14, delay: i * 0.12 }));
  },
  // 구역 클리어: 상승 팡파레.
  stageclear: (c) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.2, type: 'triangle', gain: 0.16, delay: i * 0.09 }));
  },
  // 게임 오버: 부드러운 하강음.
  gameover: (c) => {
    [440, 349, 262].forEach((f, i) =>
      tone(c, { freq: f, dur: 0.24, type: 'sine', gain: 0.14, delay: i * 0.15 }));
  },
  // 게임 시작: 짧은 이륙음.
  start: (c) => tone(c, { freq: 300, to: 760, dur: 0.24, type: 'triangle', gain: 0.13 }),
};

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
