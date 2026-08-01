// 시작 흐름 공용 프레임 - 소리(기획서 Ⅰ권 2.4 / 10장).
//
// 왜 만드나: 지금 네 게임에 거의 같은 소리 코드가 각각 들어가 있어, 한 곳을 고치면
// 나머지 셋이 낡은 채로 남는다. 실제로 유휴 절전 처리가 세 게임에만 있고 하나엔 빠져 있었다.
// 여기서 그릇을 한 번 만들고, 게임마다 다른 것은 음색표(SOUNDS)만 주입받는다.
//
// 밖으로 내는 이름은 기존 네 게임의 sound.js와 같게 뒀다
// (setMuted / isMuted / suspendAudio / resumeAudio / unlockAudio / play).
// 게임을 옮길 때 호출부를 고치지 않아도 되게 하기 위함이다.
// 되돌리기: 게임이 자기 sound.js를 그대로 두면 이 부품과 무관하게 동작한다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 2.4 / 10장.

// 오디오 시계가 막 깬 첫 재생에서 어택이 잘리는 것을 막는 예약 지연(사람이 못 느끼는 크기).
const SCHEDULE_AHEAD = 0.015;
// 유휴 절전: 마지막 소리 후 이만큼 조용하면 오디오 스레드를 재운다(발열·배터리).
const IDLE_MS = 4000;

// 단음 하나. 음색표에서 쓰는 기본 붓이다.
export function tone(c, { freq, to, dur, type = 'sine', gain = 0.15, delay = 0, out = null }) {
  const t0 = c.currentTime + SCHEDULE_AHEAD + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);  // 빠른 어택(즉각 또렷하게)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out || c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 어느 게임에나 있는 소리. 게임이 자기 음색표를 주면 같은 이름은 게임 것이 이긴다.
export const BASE_SOUNDS = {
  tap: (c) => tone(c, { freq: 620, to: 760, dur: 0.06, type: 'triangle', gain: 0.18 }),
  back: (c) => tone(c, { freq: 420, to: 300, dur: 0.08, type: 'triangle', gain: 0.14 }),
  start: (c) => {
    [523, 784].forEach((f, i) => tone(c, { freq: f, dur: 0.14, type: 'triangle', gain: 0.16, delay: i * 0.08 }));
  },
  clear: (c) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, dur: 0.18, type: 'triangle', gain: 0.14, delay: i * 0.1 }));
  },
  fail: (c) => tone(c, { freq: 300, to: 170, dur: 0.22, type: 'sine', gain: 0.14 }),
};

// 소리 그릇을 만든다.
//   sounds:     게임별 음색표. BASE_SOUNDS 위에 얹힌다.
//   autoUnlock: 첫 사용자 입력에서 오디오를 열지 여부.
//               지금까지 게임마다 듣는 대상(window/document)과 이벤트가 제각각이라 여기서 하나로 고정한다.
//   onMutedChange: 음소거가 바뀔 때 부른다(상단 띠 아이콘 갱신용).
export function createAudio({ sounds = {}, autoUnlock = true, onMutedChange = null } = {}) {
  const TABLE = { ...BASE_SOUNDS, ...sounds };

  let ctx = null;
  let muted = false;
  let unlocked = false;
  let keepAlive = null;
  let idleTimer = null;
  let destination = null;   // 게임이 컴프레서·리버브를 끼우면 그 입구가 여기로 들어온다

  function audioCtx() {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (AC) ctx = new AC({ latencyHint: 'interactive' });
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function scheduleIdleSuspend() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (ctx && ctx.state === 'running' && !muted) ctx.suspend();
    }, IDLE_MS);
  }

  function unlockAudio() {
    if (unlocked) return;
    const c = audioCtx();
    if (!c) return;
    unlocked = true;
    try {
      keepAlive = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0.0001;   // 거의 무음. 출력 장치를 깨워 둔다
      keepAlive.connect(g).connect(c.destination);
      keepAlive.start();
    } catch { /* 실패해도 게임 진행에는 영향 없음 */ }
    if (muted) c.suspend();
  }

  if (autoUnlock && typeof globalThis.addEventListener === 'function') {
    const once = { once: true };
    const open = () => unlockAudio();
    globalThis.addEventListener('pointerdown', open, once);
    globalThis.addEventListener('touchend', open, once);
    globalThis.addEventListener('keydown', open, once);
  }

  return {
    setMuted(m) {
      muted = !!m;
      if (ctx) {
        if (muted) ctx.suspend();
        else if (unlocked) ctx.resume();
      }
      if (onMutedChange) onMutedChange(muted);
    },
    isMuted() { return muted; },
    // 화면을 벗어나면 재우고 돌아오면 깨운다. 프레임이 visibilitychange에서 부른다.
    suspendAudio() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resumeAudio() { if (unlocked && !muted && ctx && ctx.state === 'suspended') ctx.resume(); },
    unlockAudio,
    play(name) {
      if (muted) return;
      const c = audioCtx();
      if (!c) return;
      const fn = TABLE[name];
      if (!fn) return;
      const run = () => { try { fn(c, destination); } catch { /* 소리 실패는 게임에 영향 없음 */ } };
      if (c.state === 'running') run();
      else c.resume().then(run).catch(() => {});
      scheduleIdleSuspend();
    },
    // 같은 소리를 간격을 두고 여러 번(별 개수만큼 등).
    playRepeat(name, count, gapMs = 180) {
      if (muted) return;
      for (let i = 0; i < count; i++) setTimeout(() => this.play(name), i * gapMs);
    },
    // 게임이 자기 음색을 나중에 더할 때.
    define(name, fn) { TABLE[name] = fn; },
    // 컴프레서·리버브 같은 후처리를 끼우는 자리. 넘긴 노드가 모든 소리의 출구가 된다.
    setDestination(node) { destination = node; },
    context() { return audioCtx(); },
  };
}
