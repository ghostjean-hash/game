// 엔트리. game 상태를 소유하고 루프·입력·렌더·플로우를 조립한다.
// core(순수 로직)가 game.sfx/game.events에 담은 신호를 여기서 소비(사운드 재생·화면 전환).
import { createLoop } from '../../../shared/loop.js';
import { createStorage } from '../../../shared/storage.js';
import { showModal, registerServiceWorker } from '../../../shared/ui.js';
import { CFG } from './data/numbers.js';
import * as sound from './audio/sound.js';
import { initStars } from './core/stars.js';
import { stepWorld, startStage, applyKeyboard } from './core/world.js';
import { autopilotStep } from './core/autopilot.js';
import { gainFront, gainOption, gainZone } from './core/parts.js';
import { render } from './render/view.js';
import { createControls } from './input/controls.js';

registerServiceWorker('/service-worker.js');

// ── DOM 참조 ──
const $ = (sel) => document.querySelector(sel);
const menuScreen = $('#menu-screen');
const gameScreen = $('#game-screen');
const canvas = $('#board');
const ctx = canvas.getContext('2d');
const elScore = $('#score');
const elStage = $('#stage');
const elFront = $('#front');
const elOption = $('#option');
const elZone = $('#zone');
const elLives = $('#lives');
const elMenuBest = $('#menu-best');
const elBossBar = $('#boss-bar');
const elBossName = $('#boss-name');
const elBossFill = $('#boss-hp-fill');
const elBanner = $('#banner');
const btnStart = $('#btn-start');
const btnAutoStart = $('#btn-auto-start');
const btnHow = $('#btn-how');
const btnMute = $('#btn-mute');
const btnPause = $('#btn-pause');
const btnAuto = $('#btn-auto');
const btnFs = $('#btn-fs');

const store = createStorage('flightshooting');

// ── 상태 ──
let W = 0, H = 0, dpr = 1;
let state = 'menu'; // menu | playing | paused | over | won
let best = store.get('best', 0);
let bannerTimer = 0;

function createGame() {
  return {
    player: null, bullets: [], enemies: [], eBullets: [], powerups: [], particles: [], stars: [], boss: null,
    score: 0, lives: CFG.player.maxLives, stage: 1, fireTimer: 0,
    front: 1, options: [], zone: { level: 0, timer: null }, partHistory: [],
    waves: [], waveIdx: 0, elapsed: 0, introTimer: 0, autopilot: false, bonusTimer: CFG.bonusShip.every,
    bossPending: false, transitioning: false, pendingTimer: null, transitionTimer: null, winTimer: null,
    sfx: [], events: [],
  };
}
const game = createGame();

// ── 캔버스 리사이즈 (DPR 대응) ──
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  W = Math.max(1, Math.floor(rect.width));
  H = Math.max(1, Math.floor(rect.height));
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

// ── 입력 ──
const controls = createControls(canvas, game, {
  isPlaying: () => state === 'playing',
  onPause: togglePause,
  size: () => ({ W, H }),
});

// ── 루프 ──
const loop = createLoop({
  update: (dt) => {
    if (state !== 'playing') return;
    if (game.autopilot) autopilotStep(game, dt, W, H);
    else applyKeyboard(game, controls.keys, dt, W, H);
    stepWorld(game, dt, W, H);
    // core가 남긴 사운드 신호 재생
    for (const s of game.sfx) sound.play(s);
    game.sfx.length = 0;
    // core가 남긴 화면 전환 신호 처리
    for (const ev of game.events) handleEvent(ev);
    game.events.length = 0;
    // 배너 표시 시간(main 소관)
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) elBanner.hidden = true; }
    // 보스 체력바 실시간 반영
    if (game.boss && !game.boss.entering) {
      elBossFill.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
    }
    syncHud();
  },
  render: () => render(ctx, game, W, H),
});

function handleEvent(ev) {
  switch (ev.type) {
    case 'banner': showBanner(ev.big, ev.sub, ev.dur); break;
    case 'boss-appear':
      elBossName.textContent = ev.name;
      elBossFill.style.width = '100%';
      elBossBar.hidden = false;
      break;
    case 'boss-clear': elBossBar.hidden = true; break;
    case 'gameover': gameOver(); break;
    case 'win': gameWon(); break;
  }
}

// ── HUD / 배너 ──
// 계통이 최대치면 '마스터'(★ 금색)로 표시, 아니면 현재 값.
function setPartHud(el, val, max) {
  const mastered = val >= max;
  el.textContent = mastered ? '★' : val;
  el.classList.toggle('mastered', mastered);
}
function syncHud() {
  elScore.textContent = game.score;
  elStage.textContent = game.stage;
  setPartHud(elFront, game.front, CFG.parts.front.max);
  setPartHud(elOption, game.options.length, CFG.parts.option.maxPerSide * 2);
  setPartHud(elZone, game.zone.level, CFG.parts.zone.radius.length - 1);
  const lifeEls = elLives.querySelectorAll('.life');
  lifeEls.forEach((el, i) => el.classList.toggle('spent', i >= game.lives));
}

function showBanner(big, sub, dur = 1.6) {
  elBanner.innerHTML = `<span class="banner-big">${big}</span>` + (sub ? `<span class="banner-sub">${sub}</span>` : '');
  elBanner.hidden = false;
  bannerTimer = dur;
}

// ── 게임 플로우 ──
function resetGame() {
  game.player = { x: W * 0.5, y: H * CFG.player.yRatio, r: CFG.player.r, inv: 0 };
  game.bullets = []; game.enemies = []; game.eBullets = [];
  game.powerups = []; game.particles = []; game.boss = null;
  game.score = 0; game.lives = CFG.player.maxLives;
  game.front = 1; game.options = []; game.zone = { level: 0, timer: null }; game.partHistory = [];
  game.stage = 1; game.fireTimer = 0;
  game.bossPending = false; game.transitioning = false;
  game.pendingTimer = null; game.transitionTimer = null; game.winTimer = null;
  game.sfx.length = 0; game.events.length = 0;
  elBossBar.hidden = true;
  initStars(game, W, H);
  startStage(game); // '구역 1' 배너 이벤트는 첫 프레임에 소비됨
}

function startGame() {
  sound.unlockAudio();
  menuScreen.hidden = true;
  gameScreen.hidden = false;
  resize();
  resetGame();
  applyDevHook(); // 검증용: localhost에서 URL 파라미터로 시작 구역·파츠 지정
  setAutopilot(false); // 시작 시 기본은 수동(자동 시작 버튼이 이후 다시 켬)
  state = 'playing';
  syncHud();
  sound.play('start');
  loop.start();
}

// 검증 전용 dev 훅(localhost 한정): ?dev=1 + stage/front/option/zone/lives로 특정 상태 시작.
// 운영 배포(github.io)에선 hostname 게이트로 완전 무효 - 일반 플레이 영향 0.
function applyDevHook() {
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;
  const q = new URLSearchParams(location.search);
  if (q.get('dev') == null) return;
  const num = (k) => { const v = q.get(k); return v == null ? null : Number(v); };
  const stage = num('stage');
  if (stage != null) game.stage = Math.max(1, Math.min(stage, CFG.stageCount));
  const front = num('front'); if (front != null) for (let i = 1; i < front; i++) gainFront(game);
  const option = num('option'); if (option != null) for (let i = 0; i < option; i++) gainOption(game);
  const zone = num('zone'); if (zone != null) for (let i = 0; i < zone; i++) gainZone(game);
  const lives = num('lives'); if (lives != null) game.lives = Math.max(1, lives);
  if (stage != null) startStage(game); // 지정 구역 웨이브 재생성 + 배너
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    loop.pause();
    showBanner('일시정지', '탭하여 계속', 999);
    btnPause.textContent = '▶';
  } else if (state === 'paused') {
    state = 'playing';
    elBanner.hidden = true;
    bannerTimer = 0;
    btnPause.textContent = '⏸';
    loop.resume();
  }
}

async function gameOver() {
  state = 'over';
  loop.pause();
  sound.play('gameover');
  const isBest = commitBest();
  const choice = await showModal({
    title: '격추당했다',
    body: `점수 ${game.score}${isBest ? '\n★ 최고 기록 갱신!' : `\n최고 ${best}`}`,
    actions: [
      { label: '다시하기', primary: true, value: 'retry' },
      { label: '홈', value: 'home' },
    ],
  });
  if (choice === 'retry') startGame();
  else backToMenu();
}

async function gameWon() {
  state = 'won';
  loop.pause();
  sound.play('stageclear');
  const isBest = commitBest();
  const choice = await showModal({
    title: '전 구역 격파!',
    body: `10개 구역의 모든 보스를 쓰러뜨렸다.\n최종 점수 ${game.score}${isBest ? '\n★ 최고 기록 갱신!' : ''}`,
    actions: [
      { label: '다시하기', primary: true, value: 'retry' },
      { label: '홈', value: 'home' },
    ],
  });
  if (choice === 'retry') startGame();
  else backToMenu();
}

function commitBest() {
  if (game.score > best) { best = game.score; store.set('best', best); return true; }
  return false;
}

function backToMenu() {
  state = 'menu';
  loop.stop();
  gameScreen.hidden = true;
  menuScreen.hidden = false;
  elMenuBest.textContent = best;
}

// ── 전체화면 (4.7-6: 지원 기기만 버튼 노출) ──
function setupFullscreen() {
  if (!btnFs) return;
  if (!document.fullscreenEnabled) { btnFs.hidden = true; return; }
  btnFs.hidden = false;
  btnFs.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  });
}

// ── 버튼 / 초기화 ──
btnStart.addEventListener('click', startGame);
btnHow.addEventListener('click', () => {
  const tips = $('#menu-tips');
  tips.hidden = !tips.hidden;
});
btnPause.addEventListener('click', togglePause);
btnMute.addEventListener('click', () => {
  const m = !sound.isMuted();
  sound.setMuted(m);
  btnMute.textContent = m ? '🔇' : '🔊';
  btnMute.setAttribute('aria-label', m ? '소리 켜기' : '소리 끄기');
});
function setAutopilot(on) {
  game.autopilot = on;
  btnAuto.classList.toggle('on', on);
  btnAuto.setAttribute('aria-pressed', String(on));
  btnAuto.setAttribute('aria-label', on ? '자동 플레이 끄기' : '자동 플레이 켜기');
}
btnAuto.addEventListener('click', () => setAutopilot(!game.autopilot));
btnAutoStart.addEventListener('click', () => { startGame(); setAutopilot(true); });
canvas.addEventListener('click', () => { if (state === 'paused') togglePause(); });

elMenuBest.textContent = best;
$('#menu-tips').hidden = true;
setupFullscreen();
resize();
