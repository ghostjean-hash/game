// Web Audio 효과음 합성. 음원 파일 없이 oscillator/gain으로 짧은 소리를 만든다(vanilla, 자산 0).
// 합성 파라미터(주파수/길이/게인)는 이 모듈의 디자인 상수다(docs/04 §3.5, 매직넘버 규칙 예외).
// DOM이 아닌 Web Audio API(window.AudioContext)만 쓰므로 core 모듈은 아니다(docs/03 §2).

let ctx = null;
let muted = false;
let unlocked = false;

// 음소거 중에는 무음 keep-alive까지 재워(suspend) 오디오 스레드 상시 가동을 막는다(§01 spec 10.5).
export function setMuted(m) {
  muted = !!m;
  if (!ctx) return;
  if (muted) ctx.suspend();
  else if (unlocked) ctx.resume();
}
export function isMuted() { return muted; }

// 탭이 백그라운드로 가면 오디오 렌더링(무음 keep-alive 포함)을 재워 배터리·발열을 아낀다.
// main.js가 visibilitychange에서 호출한다. 복귀 resume이 실패해도 다음 play()가 다시 깨운다.
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
    if (AC) ctx = new AC({ latencyHint: 'interactive' }); // 입력 반응용 저지연 모드
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 첫 사용자 제스처에서 오디오를 깨우고(iOS 정책) 무음 keep-alive를 시작한다(main이 첫 제스처에서 1회 호출).
// 블루투스 등 출력 장치는 소리가 없으면 절전에 들어가, 재생 시 깨어나는 동안 첫 소리들을 씹어먹고
// 볼륨이 서서히 차오른다. 들리지 않는 무음(gain 0.0001)을 계속 흘려 장치를 깬 채로 유지하면
// 첫 이동음부터 바로 난다. 페이지를 닫을 때까지 유지한다(트레이드오프: 출력 장치 배터리 소모 약간 증가).
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
    keepAlive.start(); // stop 안 함 - 게임 내내 무음을 흘려 장치를 깨워 둔다
  } catch { /* 실패해도 게임 진행 무관 */ }
  if (muted) c.suspend(); // 음소거로 시작했으면 깨우기만 해 두고 바로 재운다
}

// 모든 재생을 currentTime 정각이 아니라 이만큼 뒤에 예약한다. 오디오 시계가 막 깬 첫 재생에서
// start(currentTime)이 첫 처리 구간과 어긋나 어택이 잘리던 것(첫 이동 무음)을 막는다. 15ms는 인지 한계 이하.
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
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003); // 빠른 어택(즉각 또렷하게, 지연 체감 제거)
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
  // 별 획득 반짝(결과 팝업에서 별 개수만큼 계단식 재생). 맑고 짧은 종소리.
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
  // 컨텍스트가 아직 안 깬 첫 재생은 깨어난 뒤 소리 낸다(첫 이동음 누락 방지).
  if (c.state === 'running') run();
  else c.resume().then(run).catch(() => {});
}
