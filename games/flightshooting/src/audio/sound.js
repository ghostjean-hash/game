// Web Audio 효과음 합성. 음원 파일 없이 합성으로 "현대적" 사운드를 만든다(vanilla, 자산 0).
// 8비트 탈피 기법: (1) 유니즌 오실레이터(살짝 디튠해 겹침)로 두꺼운 음색,
// (2) lowpass 필터 스윕으로 부드러운 감쇠, (3) 합성 리버브(convolver)로 공간감,
// (4) 서브베이스 sine 임팩트로 묵직한 타격. 모든 파라미터는 이 모듈의 디자인 상수(매직넘버 규칙 예외).

let ctx = null;
let muted = false;
let unlocked = false;
let master = null;   // 마스터 게인(→ destination)
let reverb = null;   // 합성 리버브(convolver), 실패 시 null

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

// 짧은 합성 임펄스 응답(지수 감쇠 스테레오 노이즈) - 가벼운 리버브 공간감.
function makeReverbIR(c, seconds = 1.1, decay = 3.2) {
  const rate = c.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = c.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function setupGraph(c) {
  master = c.createGain();
  master.gain.value = 0.85;
  master.connect(c.destination);
  try {
    reverb = c.createConvolver();
    reverb.buffer = makeReverbIR(c);
    const rg = c.createGain();
    rg.gain.value = 0.9;
    reverb.connect(rg).connect(master);
  } catch {
    reverb = null; // convolver 미지원이면 dry만(게임 진행 무관)
  }
}

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { ctx = new AC({ latencyHint: 'interactive' }); setupGraph(ctx); }
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

// dry(master) + wet(reverb send) 동시 연결.
function output(node, wet = 0.2) {
  node.connect(master);
  if (reverb && wet > 0) {
    const s = ctx.createGain();
    s.gain.value = wet;
    node.connect(s);
    s.connect(reverb);
  }
}

// 음정 하나: 유니즌 디튠 + lowpass 필터 스윕 + 부드러운 게인 엔벨로프.
function voice(c, { freq, to, dur, type = 'sine', gain = 0.12, delay = 0, filter, filterTo, detune = 0, wet = 0.2, attack = 0.008 }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const g = c.createGain();
  let head = g;
  let filt = null;
  if (filter) {
    filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(filter, t0);
    if (filterTo) filt.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), t0 + dur);
    filt.connect(g);
    head = filt;
  }
  const dets = detune ? [-detune, 0, detune] : [0];
  for (const d of dets) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    o.detune.value = d;
    o.connect(head);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  output(g, wet);
}

// 노이즈 버스트 + lowpass 스윕(폭발·타격의 바람 성분).
function noiseHit(c, { dur, gain = 0.15, delay = 0, lpFrom = 2200, lpTo = 200, wet = 0.25 }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(lpFrom, t0);
  filt.frequency.exponentialRampToValueAtTime(Math.max(80, lpTo), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g);
  output(g, wet);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// 저역 sine 임팩트(폭발의 묵직한 몸통).
function subBoom(c, { freq = 120, to = 38, dur = 0.4, gain = 0.26, delay = 0 }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  output(g, 0.1);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const SEMI = (base, s) => base * Math.pow(2, s / 12); // 반음 계산

// 효과음별 합성 레시피. 우주 슈팅에 맞는 현대적 일렉트로닉 톤 - 부드럽고 공간감 있게.
const SOUNDS = {
  // 발사: 필터 스윕된 짧은 레이저 pew(자주 나므로 조용히).
  shoot: (c) => voice(c, { type: 'sawtooth', freq: 1300, to: 420, dur: 0.11, gain: 0.045, filter: 2600, filterTo: 500, detune: 10, wet: 0.12 }),
  // 적 피격(데미지만): 짧고 부드러운 틱.
  hit: (c) => voice(c, { type: 'triangle', freq: 520, to: 300, dur: 0.06, gain: 0.05, filter: 3200, wet: 0.1 }),
  // 적 파괴: 노이즈 바람 + 저역 임팩트.
  explode: (c) => {
    noiseHit(c, { dur: 0.32, gain: 0.16, lpFrom: 3000, lpTo: 220, wet: 0.3 });
    subBoom(c, { freq: 130, to: 42, dur: 0.28, gain: 0.2 });
  },
  // 파워업 획득: 밝은 메이저 아르페지오 + 리버브 반짝.
  power: (c) => {
    [0, 4, 7, 12].forEach((s, i) =>
      voice(c, { type: 'triangle', freq: SEMI(523, s), dur: 0.18, gain: 0.085, delay: i * 0.05, filter: 4200, detune: 6, wet: 0.4 }));
  },
  // 봄/화면 클리어: 큰 서브베이스 임팩트 + 긴 화이트아웃.
  bomb: (c) => {
    subBoom(c, { freq: 95, to: 26, dur: 0.7, gain: 0.3 });
    noiseHit(c, { dur: 0.8, gain: 0.2, lpFrom: 2400, lpTo: 120, wet: 0.5 });
  },
  // 피격(내 기체): 하강 saw + 노이즈(필터로 뭉갠 충격).
  playerhit: (c) => {
    voice(c, { type: 'sawtooth', freq: 320, to: 62, dur: 0.4, gain: 0.15, filter: 1500, filterTo: 200, detune: 8, wet: 0.3 });
    noiseHit(c, { dur: 0.3, gain: 0.13, lpFrom: 1300, lpTo: 200, wet: 0.2 });
  },
  // 보스 격파: 묵직한 서브베이스 + 큰 화이트아웃 + 하강 코드.
  bossdown: (c) => {
    subBoom(c, { freq: 120, to: 28, dur: 0.9, gain: 0.32 });
    noiseHit(c, { dur: 1.0, gain: 0.22, lpFrom: 2600, lpTo: 100, wet: 0.6 });
    [0, -3, -7].forEach((s, i) =>
      voice(c, { type: 'sawtooth', freq: SEMI(330, s), to: SEMI(330, s) * 0.5, dur: 0.4, gain: 0.12, delay: i * 0.14, filter: 1800, detune: 7, wet: 0.4 }));
  },
  // 구역 클리어: 밝은 상승 메이저 코드 아르페지오 + 리버브 여운.
  stageclear: (c) => {
    [0, 4, 7, 11, 12].forEach((s, i) =>
      voice(c, { type: 'triangle', freq: SEMI(523, s), dur: 0.3, gain: 0.11, delay: i * 0.08, filter: 5000, detune: 5, wet: 0.5 }));
  },
  // 게임 오버: 하강 마이너 + 긴 리버브 여운.
  gameover: (c) => {
    [0, -2, -5, -9].forEach((s, i) =>
      voice(c, { type: 'sine', freq: SEMI(440, s), dur: 0.5, gain: 0.13, delay: i * 0.16, filter: 2600, wet: 0.6 }));
  },
  // 게임 시작 / 보스 등장: 부드러운 상승 필터 스윕.
  start: (c) => voice(c, { type: 'sawtooth', freq: 200, to: 760, dur: 0.3, gain: 0.11, filter: 500, filterTo: 3200, detune: 12, wet: 0.35 }),
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
