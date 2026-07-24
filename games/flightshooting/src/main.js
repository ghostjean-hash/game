// 엔트리. game 상태를 소유하고 루프·입력·렌더·플로우를 조립한다.
// core(순수 로직)가 game.sfx/game.events에 담은 신호를 여기서 소비(사운드 재생·화면 전환).
import { createLoop } from '../../../shared/loop.js';
import { createStorage } from '../../../shared/storage.js';
import { showModal, registerServiceWorker } from '../../../shared/ui.js';
import { CFG } from './data/numbers.js';
import { COLORS } from './data/colors.js';
import { COUNTRIES, START_COUNTRY } from './data/countries.js';
import { COUNTRY_PATHS, MAP_W, MAP_H, lonToX, latToY } from './data/worldmap.js';
import * as sound from './audio/sound.js';
import { initStars } from './core/stars.js';
import { stepWorld, startStage, applyKeyboard, updateParticles } from './core/world.js';
import { spawnBoss } from './core/spawn.js';
import { autopilotStep } from './core/autopilot.js';
import { gainFront, gainOption, gainZone, gainTail } from './core/parts.js';
import { spawnFriend } from './core/friend.js';
import { render, DIORAMA_READY } from './render/view.js';
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
const elTail = $('#tail');
const elLives = $('#lives');
const lifeEls = elLives.querySelectorAll('.life'); // 하트 노드는 고정 → 1회만 조회(매 프레임 재쿼리 제거)
const elMenuBest = $('#menu-best');
const elBossBar = $('#boss-bar');
const elBossName = $('#boss-name');
const elBossFill = $('#boss-hp-fill');
const elBanner = $('#banner');
const btnStart = $('#btn-start');
const btnMute = $('#btn-mute');
const btnPause = $('#btn-pause');
const btnAuto = $('#btn-auto');
const btnFs = $('#btn-fs');

// HUD 토글 아이콘(이모지 대신 인라인 SVG - 고퀄 라인 아이콘).
const SVG_A = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON = {
  play: `<svg ${SVG_A}><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg ${SVG_A}><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`,
  volumeOn: `<svg ${SVG_A}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volumeOff: `<svg ${SVG_A}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`,
};

const store = createStorage('flightshooting');

// ── 상태 ──
let W = 0, H = 0, dpr = 1;
let state = 'menu'; // menu | playing | paused | dying | over | won | map(세계 여행 지도)
let best = store.get('best', 0);
let bannerTimer = 0;
let deathTimer = 0; // 죽는 연출(dying) 남은 시간. 0이 되면 결과 팝업.
// 환경설정(localStorage 저장) + 치트 상태(세션).
let apSkill = store.get('apSkill', CFG.autopilot.default);
// 난이도(easy | normal | hard | insane). 구버전 저장값('kid' 등)이나 미지정은 보통으로 정규화.
let difficulty = store.get('difficulty', 'normal');
if (!CFG.difficulty[difficulty]) difficulty = 'normal';
// 친구 동행 / 자동 플레이는 난이도와 독립된 홈 토글(사용자 지시 2026-07-16). 선택을 기억한다.
let friendOn = store.get('friendOn', false);
let autoOn = store.get('autoOn', false);
let cheatEnabled = store.get('cheat', false);
// 치트 세부 설정도 localStorage 저장/복원(사용자 지시 2026-07-10). 켜기 여부(cheat)와 별도 키(cheatCfg).
const CHEAT_DEFAULT = { speed: 1, invincible: false, dropChance: null, dropKinds: { P: true, S: true, E: true, T: true, H: true, B: true } };
const cheatSaved = { ...CHEAT_DEFAULT, ...store.get('cheatCfg', {}) };
let cheatSpeed = cheatSaved.speed;
const cheatState = { invincible: cheatSaved.invincible, dropChance: cheatSaved.dropChance, dropKinds: { ...CHEAT_DEFAULT.dropKinds, ...cheatSaved.dropKinds } };
function saveCheat() { store.set('cheatCfg', { speed: cheatSpeed, invincible: cheatState.invincible, dropChance: cheatState.dropChance, dropKinds: cheatState.dropKinds }); }

function createGame() {
  return {
    player: null, bullets: [], enemies: [], eBullets: [], powerups: [], particles: [], stars: [], boss: null,
    score: 0, lives: CFG.player.maxLives, maxLives: CFG.player.maxLives, stage: 1, fireTimer: 0, // maxLives는 난이도로 재설정
    front: 1, options: [], optionEvo: 0, zone: { level: 0, spawnTimer: 0, pulses: [] }, tail: [], partHistory: [],
    friend: null, // 어린이 모드에서만 생성(docs/09). 일반 모드는 null 유지.
    waves: [], waveIdx: 0, elapsed: 0, introTimer: 0, apSkill: CFG.autopilot.default, cheat: null,
    // 자동 플레이(하이브리드): autoAssist 켜짐 + 손 안 댐(dragging=false) + 복귀 대기 끝(manualTimer<=0)일 때만 자동.
    autoAssist: false, dragging: false, manualTimer: 0,
    difficulty: 'normal', enemyFireMul: 1, enemyHpMul: 1, enemyShotsMax: 99, radialMul: 1, // 난이도(startGame에서 세팅)
    bonusTimer: CFG.bonusShip.every,
    bossPending: false, transitioning: false, pendingTimer: null, transitionTimer: null, winTimer: null, bossDeathTimer: null,
    shake: 0, // 화면 흔들림(보스 사망 연출 등, view/main render가 소비)
    tourIdx: START_COUNTRY, tourPath: [START_COUNTRY], // 세계 여행: 현재 나라 + 지나온 경로(docs/10)
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
    // 죽는 연출 중: 게임은 멈추고 폭발 파편만 계속 움직인다. 시간이 다 되면 결과 팝업.
    if (state === 'dying') {
      updateParticles(game, dt);
      if (game.bombFlash > 0) game.bombFlash -= dt;
      deathTimer -= dt;
      if (deathTimer <= 0) gameOver();
      return;
    }
    if (state !== 'playing') return;
    // 치트 플레이 속도: mul회 물리 서브스텝(dt 단위)으로 탄 관통 없이 배속(x1/2/4/8).
    const mul = cheatEnabled ? cheatSpeed : 1;
    // 하이브리드 자동: 자동 보조가 켜져 있고, 손을 대지 않았고, 손 뗀 뒤 복귀 대기가 끝났을 때만 AI가 몬다.
    //   조작 중이거나 손 뗀 직후 resumeDelay 동안은 내 조작(키보드/드래그) 우선.
    const autoNow = game.autoAssist && !game.dragging && game.manualTimer <= 0;
    if (autoNow) autopilotStep(game, dt * mul, W, H);
    else applyKeyboard(game, controls.keys, dt * mul, W, H);
    if (game.manualTimer > 0) game.manualTimer -= dt; // 복귀 대기 카운트다운(체감 시간이라 배속 무관)
    for (let i = 0; i < mul; i++) stepWorld(game, dt, W, H);
    // core가 남긴 사운드 신호 재생
    for (const s of game.sfx) sound.play(s);
    game.sfx.length = 0;
    // core가 남긴 화면 전환 신호 처리
    for (const ev of game.events) handleEvent(ev);
    game.events.length = 0;
    // 배너 표시 시간(main 소관)
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) elBanner.hidden = true; }
    // 보스 체력바 실시간 반영(코어 hp). 방어구가 남아 코어가 안 열렸으면 '보호 중'으로 흐리게 표시.
    if (game.boss && !game.boss.entering) {
      const bc = game.boss.core;
      elBossFill.style.width = `${Math.max(0, (bc.hp / bc.maxHp) * 100)}%`;
      elBossBar.classList.toggle('protected', !bc.exposed);
    }
    syncHud();
  },
  render: () => {
    const sh = game.shake || 0; // 보스 사망 등 화면 흔들림
    if (sh > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      render(ctx, game, W, H);
      ctx.restore();
    } else {
      render(ctx, game, W, H);
    }
  },
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
    case 'death': // 목숨 0: 죽는 연출 시작(폭발), deathTime 뒤 gameOver 팝업
      state = 'dying';
      deathTimer = CFG.emote.deathTime;
      sound.play('explode');
      break;
    case 'gameover': gameOver(); break;
    case 'win': gameWon(); break;
    case 'show-map': showMap(); break; // 구역 클리어 → 세계 여행 지도로 다음 목적지 선택(docs/10)
  }
}

// ── HUD / 배너 ──
// 강화 단계 표기(사용자 지시 2026-07-10): 별(★) 없이 로마숫자(메인 강화=티어) + 아라비아 숫자(서브 강화=티어 안 진행)만.
//   예) 3티어를 3발째 진행 중 = "III·3". 마스터(최대 강화) 도달 시 주황색(.mastered)으로 표시.
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n) => ROMAN[n] || String(n);
// 티어(로마) + 서브스텝(아라비아). 별 없음. tier 0이면 빈 문자열.
function tierText(tier, sub) {
  if (tier <= 0) return '';
  return roman(tier) + (sub > 0 ? '·' + sub : '');
}
// 카운트형(에너지존 레벨 등): 값 표시, 최대(마스터)면 주황.
function setPartHud(el, val, max) {
  el.textContent = val;
  el.classList.toggle('mastered', val >= max);
}
// 발별 진화 계통(메인·사이드): 카운트 채우는 중이거나 진화 전이면 카운트 숫자, 진화 시작하면 로마·아라비아.
//   완전 마스터(8발 전부 최고 티어 = evo가 tierMax*8)면 주황.
function setEvoHud(el, count, countMax, evo, tierMax) {
  // 진화 한 바퀴 스텝 = 발/대 수(countMax). 메인·사이드 모두 6.
  if (count < countMax || !evo) { el.textContent = count; el.classList.remove('mastered'); return; }
  const tier = Math.min(Math.floor((evo - 1) / countMax) + 1, tierMax);
  const sub = ((evo - 1) % countMax) + 1; // 1~countMax
  el.textContent = tierText(tier, sub);
  el.classList.toggle('mastered', evo >= tierMax * countMax);
}
function setFrontHud() {
  // 메인 총알: front 1~5 = 탄 수, 6 = 탄수 만렙, 7~66 = 발별 진화(evo = front-maxShots).
  const ms = CFG.parts.front.maxShots;
  setEvoHud(elFront, game.front, ms, Math.max(0, game.front - ms), CFG.parts.front.tierMax);
}
// 꼬리기: 4대 미만이면 대수, 4대 후엔 무기 티어(최저 무기 단계 = 로마) + 서브스텝(다음 단계로 오른 대수). 완전 마스터면 주황.
function setTailHud() {
  const T = CFG.parts.tail;
  const n = game.tail.length;
  if (n < T.maxCount) { elTail.textContent = n; elTail.classList.remove('mastered'); return; }
  let minW = Infinity;                                       // 최저 무기 단계(weapon 1=무강화) - 매 프레임 임시배열 없이 루프로
  for (const t of game.tail) if (t.weapon < minW) minW = t.weapon;
  const tier = minW - 1;                                     // 티어(로마) = weapon-1 (0~10)
  let raised = 0;                                            // 다음 단계로 오른 대수 = 서브스텝
  for (const t of game.tail) if (t.weapon > minW) raised++;
  if (tier <= 0) { elTail.textContent = n; elTail.classList.remove('mastered'); return; }
  elTail.textContent = tierText(tier, raised);
  elTail.classList.toggle('mastered', minW >= T.weaponMax);
}
function syncHud() {
  elScore.textContent = game.score;
  elStage.textContent = game.stage;
  setFrontHud();
  setEvoHud(elOption, game.options.length, CFG.parts.option.maxPerSide * 2, game.optionEvo || 0, COLORS.bulletShapeTier.length - 1);
  setPartHud(elZone, game.zone.level, CFG.parts.zone.levelMax);
  setTailHud();
  const cap = game.maxLives || CFG.player.maxLives;
  lifeEls.forEach((el, i) => {
    el.hidden = i >= cap;                          // 난이도 최대값 초과 하트는 숨김(일반3 / 어린이5)
    el.classList.toggle('spent', i >= game.lives); // 소진된 목숨은 흐리게
  });
}

function showBanner(big, sub, dur = 1.6) {
  // 나라\n도시 형태(여행 배너)면 나라(작게·하늘색)·도시 두 줄로 나눠 각각 외곽선 스타일을 준다. 그 외(구역 클리어 등)는 기본.
  const nl = big.indexOf('\n');
  const bigHtml = nl >= 0
    ? `<span class="banner-country">${big.slice(0, nl)}</span><span class="banner-city">${big.slice(nl + 1)}</span>`
    : `<span class="banner-big">${big}</span>`;
  elBanner.innerHTML = bigHtml + (sub ? `<span class="banner-sub">${sub}</span>` : '');
  elBanner.hidden = false;
  bannerTimer = dur;
}

// ── 게임 플로우 ──
function resetGame() {
  game.player = { x: W * 0.5, y: H * CFG.player.yRatio, r: CFG.player.r, inv: 0, dead: false, emo: null, emoT: 0 };
  game.bombFlash = 0;
  game.bullets = []; game.enemies = []; game.eBullets = [];
  game.powerups = []; game.particles = []; game.boss = null;
  game.score = 0; game.maxLives = CFG.player.maxLives; game.lives = game.maxLives; // 난이도별 maxLives는 startGame에서 재설정
  game.front = 1; game.options = []; game.optionEvo = 0; game.zone = { level: 0, timer: null }; game.tail = []; game.partHistory = [];
  game.friend = null; // 친구 동행 켜짐이면 startGame에서 다시 생성
  game.stage = 1; game.fireTimer = 0;
  game.tourIdx = START_COUNTRY; game.tourPath = [START_COUNTRY]; // 세계 여행 경로 초기화(한국 출발)
  game.dragging = false; game.manualTimer = 0; // 하이브리드 자동 상태 초기화
  game.bossPending = false; game.transitioning = false;
  game.pendingTimer = null; game.transitionTimer = null; game.winTimer = null; game.bossDeathTimer = null;
  game.shake = 0;
  game.sfx.length = 0; game.events.length = 0;
  elBossBar.hidden = true;
  initStars(game, W, H);
  startStage(game); // '구역 1' 배너 이벤트는 첫 프레임에 소비됨
}

// ── 중간 저장(이어서 하기) ──
// 진행 상황을 localStorage에 저장해 홈의 '이어서 하기'로 재개한다. 화력은 파워업 획득 순서(partHistory)를
// 처음부터 재생해 복원하므로 core 로직을 건드리지 않는다(gain 함수가 상태·이력을 그대로 재구성).
const SAVE_KEY = 'save';
const GAIN_BY_PART = { front: gainFront, option: gainOption, optionEvo: gainOption, zone: gainZone, tail: gainTail, tailWeapon: gainTail };
function saveProgress() {
  if (state !== 'playing') return; // 진행 중 상태만 저장(전환·연출 중 저장 방지)
  store.set(SAVE_KEY, {
    stage: game.stage, score: game.score, lives: game.lives, maxLives: game.maxLives,
    tourIdx: game.tourIdx, tourPath: game.tourPath.slice(),
    partHistory: game.partHistory.slice(),
    difficulty, friendOn, autoOn, apSkill,
    friendLevel: game.friend ? game.friend.level : null,
  });
}
function clearProgress() { store.remove(SAVE_KEY); }
function loadProgress() { return store.get(SAVE_KEY, null); }

function startGame(diff, saved) {
  if (diff) { difficulty = diff; store.set('difficulty', diff); } // 모드 버튼으로 시작하면 선택 기억
  sound.unlockAudio();
  // 뒤로가기(화면 ← / 폰 백버튼)로 게임 밖 이탈 대신 모드 선택으로 돌아가게 히스토리 지점을 하나 쌓는다.
  //   재시작(retry) 경로는 이미 game 지점이라 중복 push하지 않는다.
  if (!history.state || history.state.screen !== 'game') history.pushState({ screen: 'game' }, '');
  menuScreen.hidden = true;
  gameScreen.hidden = false;
  resize();
  resetGame();
  if (friendOn) spawnFriend(game, W, H); // 친구 동행 토글(난이도 무관, docs/09)
  setAutoAssist(autoOn); // 홈의 자동 플레이 토글 반영(하이브리드)
  game.apSkill = apSkill;                       // 자동 플레이 실력 티어 반영
  game.difficulty = difficulty;                 // 난이도
  const diffCfg = CFG.difficulty[difficulty] || CFG.difficulty.normal;
  game.enemyFireMul = diffCfg.enemyFireMul;
  game.enemyHpMul = diffCfg.enemyHpMul != null ? diffCfg.enemyHpMul : 1; // 난이도별 적 체력 배수
  game.enemyShotsMax = diffCfg.enemyShotsMax || 99;
  game.radialMul = diffCfg.radialMul != null ? diffCfg.radialMul : 1; // 방사·자폭 탄 개수 배수(쉬움 감축)
  game.maxLives = diffCfg.maxLives || CFG.player.maxLives; // 난이도별 목숨 최대값(쉬움 5 ~ 어려움/매우 어려움 3, 최소 3)
  game.lives = game.maxLives;                             // 시작 목숨 = 최대값(resetGame 기본3 위로 재설정)
  if (saved) {
    // 이어서 하기: 저장된 구역·점수·목숨·여행경로·화력을 되살린다.
    game.stage = saved.stage;
    game.score = saved.score;
    game.maxLives = saved.maxLives || game.maxLives;
    game.lives = saved.lives != null ? saved.lives : game.lives;
    game.tourIdx = saved.tourIdx != null ? saved.tourIdx : game.tourIdx;
    game.tourPath = Array.isArray(saved.tourPath) ? saved.tourPath.slice() : game.tourPath;
    // 파워업 획득 순서를 처음부터 재생해 화력 복원(gain 함수가 front/option/zone/tail·이력을 재구성)
    game.partHistory = [];
    for (const p of (saved.partHistory || [])) { const fn = GAIN_BY_PART[p]; if (fn) fn(game); }
    if (game.friend && saved.friendLevel != null) game.friend.level = saved.friendLevel;
    startStage(game); // 복원된 구역의 웨이브·배너 재생성
  } else {
    // 난이도 시작 보너스: '쉬움'은 메인 총알·꼬리 비행기를 조금 갖춘 채 출발(옛 어린이 배려 흡수)
    for (let i = 1; i < diffCfg.startFront; i++) gainFront(game);
    for (let i = 0; i < diffCfg.startTail; i++) gainTail(game);
  }
  game.cheat = cheatEnabled ? cheatState : null; // 치트 켜짐 시에만 core가 참조
  state = 'playing';
  updateCheatVisible();
  syncHud();
  sound.play('start');
  loop.start();
  saveProgress(); // 진행 저장(홈 '이어서 하기'가 이 상태로 재개)
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    loop.pause();
    showBanner('일시정지', '탭하여 계속', 999);
    btnPause.innerHTML = ICON.play;
  } else if (state === 'paused') {
    state = 'playing';
    elBanner.hidden = true;
    bannerTimer = 0;
    btnPause.innerHTML = ICON.pause;
    loop.resume();
  }
}

async function gameOver() {
  state = 'over';
  loop.pause();
  clearProgress(); // 격추 = 저장 무효화(이어하기 불가)
  sound.play('gameover');
  const isBest = commitBest();
  const choice = await showModal({
    title: '격추당했다',
    body: `점수 ${game.score}${isBest ? '\n최고 기록 갱신!' : `\n최고 ${best}`}`,
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
  clearProgress(); // 완주 = 저장 무효화
  sound.play('stageclear');
  const isBest = commitBest();
  const choice = await showModal({
    title: '전 구역 격파!',
    body: `${CFG.stageCount}개 구역의 모든 보스를 쓰러뜨렸다.\n최종 점수 ${game.score}${isBest ? '\n최고 기록 갱신!' : ''}`,
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

// ── 세계 여행 지도(docs/10) ──
// 보스 격파 → 세계지도가 떠 현재 나라의 이웃 중 다음 목적지를 고른다 → 비행 연출 → 다음 구역.
const mapOverlay = $('#map-overlay');
const mapViewport = $('#map-viewport');
const mapTitle = $('#map-title');
const mapHint = $('#map-hint');
const mapCard = $('#map-card');
let flyRaf = 0; // 비행 애니메이션 rAF 핸들(정리용)
let tourScale = 1; // 확대 배율 보정(핀·글자가 화면에서 일정 크기로 보이도록). renderMap이 갱신.
let tourVB = null; // 현재 지도 viewBox {x,y,w,h} - 드래그·확대축소로 갱신
let tourCands = []; // 클릭 가능한 후보 전체(안 간 나라 전부)
let tourFrame = []; // 초기 확대 프레이밍용(현재+가까운 frameNear개) - 클릭 후보와 별개
const cityX = (i) => lonToX(COUNTRIES[i].lon);
const cityY = (i) => latToY(COUNTRIES[i].lat);
const frameDist = (a, b) => { const dx = cityX(a) - cityX(b), dy = cityY(a) - cityY(b); return dx * dx + dy * dy; };

function showMap() {
  const cur = game.tourIdx;
  // 안 간 나라 전부를 후보로 연다(순번 제한을 두면 못 가는 나라가 생긴다는 사용자 지시).
  const cands = COUNTRIES.map((_, i) => i).filter((i) => i !== cur && !game.tourPath.includes(i));
  // 갈 수 있는 곳이 없으면(전부 방문) 지도를 생략하고 곧장 다음 구역으로.
  if (!cands.length) { advanceStage(); return; }
  state = 'map';
  loop.pause();
  mapCard.hidden = true;
  mapHint.hidden = false;
  mapTitle.textContent = '다음 목적지를 골라주세요';
  mapOverlay.hidden = false; // 먼저 표시해 map-viewport 실제 크기를 확보(화면 꽉 채우기)
  renderMap(cur, cands);
}

// 현재+후보를 감싸는 초기 확대 영역을 {x,y,w,h}로 계산. 화면 비율에 맞춰 여백 없이 채운다.
//   vpW/vpH = 지도 표시 영역 실제 픽셀 크기.
function computeViewBox(cur, cands, vpW, vpH) {
  const T = CFG.tour;
  const aspect = vpW / vpH;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const i of [cur, ...cands]) {
    const x = cityX(i), y = cityY(i);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  let x = minX - T.zoomPad, y = minY - T.zoomPad;
  let w = (maxX - minX) + T.zoomPad * 2, h = (maxY - minY) + T.zoomPad * 2;
  if (w < T.zoomMinW) { x -= (T.zoomMinW - w) / 2; w = T.zoomMinW; }
  if (w / h < aspect) { const nw = h * aspect; x -= (nw - w) / 2; w = nw; }
  else { const nh = w / aspect; y -= (nh - h) / 2; h = nh; }
  // 기본 확대를 한 단계 높인다(나라 이름 가독성, 사용자 지시). 중심 유지하며 뷰박스 축소.
  const zf = 1 / T.zoomStep;
  x += w * (1 - zf) / 2; y += h * (1 - zf) / 2; w *= zf; h *= zf;
  return { x, y, w, h };
}

// 도시 하나: 점 + 2줄 라벨(윗줄 나라이름 작게·다른 색, 아랫줄 수도 상태색). clickable이면 후보(맥동·클릭), faint면 흐리게.
function cityMark(i, mk, dotColor, s, clickable, faint, hasBg) {
  const C = COUNTRIES[i];
  const x = cityX(i), yv = cityY(i);
  const dot = mk.dot * s;
  const gap = CFG.tour.mark.labelGap * s;
  const nameFs = (mk.name * s).toFixed(1), capFs = (mk.cap * s).toFixed(1);
  const op = faint ? ' opacity="0.55"' : '';
  const open = clickable ? `<g class="map-pick" data-dest="${i}"${op}>` : `<g${op}>`;
  const dotEl = `<circle ${clickable ? 'class="pick-dot" ' : ''}cx="${x.toFixed(1)}" cy="${yv.toFixed(1)}" r="${dot.toFixed(1)}" fill="${dotColor}" stroke="#0b1020" stroke-width="${(1.5 * s).toFixed(2)}"/>`;
  // 배경(디오라마) 이미지가 준비된 도시는 점 우상단에 금색 별(★)을 붙여 '배경 있음'을 구분 표시(사용자 선택).
  //   색·모양이 후보 점(시안)과 완전히 달라 한눈에 구별된다. bgRing 값은 별을 점에서 띄우는 오프셋으로 재사용.
  const bgStar = hasBg ? `<text x="${(x + dot + CFG.tour.mark.bgRing * s).toFixed(1)}" y="${(yv - dot).toFixed(1)}" font-size="${(mk.cap * s * 1.05).toFixed(1)}" fill="${COLORS.tour.bgReady}" text-anchor="middle" dominant-baseline="central">★</text>` : '';
  let nameX, nameY, capX, capY, anchor;
  if (C.labelDir === 'right' || C.labelDir === 'left') {
    // 붙어 있는 나라(싱가포르·말레이시아) 겹침 방지: 라벨을 점 옆(우/좌)에 나라(위)·수도(아래) 2줄로.
    anchor = C.labelDir === 'right' ? 'start' : 'end';
    nameX = capX = (C.labelDir === 'right' ? x + dot + gap : x - dot - gap).toFixed(1);
    nameY = (yv - 1 * s).toFixed(1);            // 나라(윗줄)
    capY = (yv + mk.cap * s * 0.95).toFixed(1); // 수도(아랫줄)
  } else {
    // 기본: 점 위에 나라(윗줄)·수도(아랫줄)
    anchor = 'middle';
    nameX = capX = x.toFixed(1);
    const cy = yv - dot - gap;                   // 수도 - 점 바로 위
    capY = cy.toFixed(1);
    nameY = (cy - mk.cap * s * 0.92 - CFG.tour.mark.nameLift * s).toFixed(1); // 나라 - 수도 위 + 추가로 올림
  }
  // 여행지(발리·하와이)는 윗줄=소속국(cap)·아랫줄=여행지명(ko)으로 표기(사용자 지시: 인도네시아 → 발리 순).
  //   일반 나라는 윗줄=나라(ko)·아랫줄=수도(cap) 유지.
  const topLabel = C.type === 'travel' ? C.cap : C.ko;
  const botLabel = C.type === 'travel' ? C.ko : C.cap;
  const nameEl = `<text x="${nameX}" y="${nameY}" text-anchor="${anchor}" font-size="${nameFs}" font-weight="600" fill="${COLORS.tour.countryLabel}">${topLabel}</text>`;
  const capEl = `<text x="${capX}" y="${capY}" text-anchor="${anchor}" font-size="${capFs}" font-weight="700" fill="${dotColor}">${botLabel}</text>`;
  return open + bgStar + dotEl + nameEl + capEl + '</g>';
}

// 지도 SVG를 그린다. 모든 나라 수도 표시(현재/후보 크게, 방문 중간, 나머지 작고 흐리게) + 경로 점선 + 비행기.
function renderMap(cur, cands) {
  const fx = (i) => cityX(i).toFixed(1);
  const fy = (i) => cityY(i).toFixed(1);
  const vpW = mapViewport.clientWidth || CFG.tour.zoomRefW;
  const vpH = mapViewport.clientHeight || (vpW / CFG.tour.aspect);
  // 후보 전부를 감싸면 세계 전체라 이름이 안 보인다 → 초기 확대는 현재+가장 가까운 frameNear개만 감싼다.
  const frame = cands.length > CFG.tour.frameNear
    ? [...cands].sort((a, b) => frameDist(cur, a) - frameDist(cur, b)).slice(0, CFG.tour.frameNear)
    : cands;
  tourVB = computeViewBox(cur, frame, vpW, vpH);
  tourCands = cands;
  tourFrame = frame;
  tourScale = tourVB.w / vpW; // 화면 일정 픽셀 역보정
  const s = tourScale;
  const M = CFG.tour.mark;
  const path = game.tourPath;
  const candSet = new Set(cands);
  const visitedSet = new Set(path);
  let route = '';
  if (path.length > 1) {
    route = `<path d="${path.map((i, k) => (k ? 'L' : 'M') + fx(i) + ',' + fy(i)).join('')}" fill="none" stroke="${COLORS.tour.route}" stroke-width="${(2.5 * s).toFixed(2)}" stroke-dasharray="${(6 * s).toFixed(1)} ${(6 * s).toFixed(1)}" opacity="0.8"/>`;
  }
  let cities = '';
  for (let i = 0; i < COUNTRIES.length; i++) {
    const hasBg = DIORAMA_READY.has(COUNTRIES[i].ko);
    if (i === cur) cities += cityMark(i, M.cur, COLORS.tour.current, s, false, false, hasBg);
    else if (candSet.has(i)) cities += cityMark(i, M.cand, COLORS.tour.candidate, s, true, false, hasBg);
    else if (visitedSet.has(i)) cities += cityMark(i, M.visited, COLORS.tour.visited, s, false, false, hasBg);
    else cities += cityMark(i, M.other, COLORS.tour.dim, s, false, true, hasBg);
  }
  const plane = `<g id="tour-plane" transform="translate(${fx(cur)},${fy(cur)})"><circle r="${(7 * s).toFixed(1)}" fill="${COLORS.tour.current}" stroke="#0b1020" stroke-width="${(2 * s).toFixed(2)}"/></g>`;
  const vb = `${tourVB.x.toFixed(1)} ${tourVB.y.toFixed(1)} ${tourVB.w.toFixed(1)} ${tourVB.h.toFixed(1)}`;
  // 나라별 path를 대륙 색으로 칠한다(COUNTRY_PATHS). data-ko로 선택 나라 하나만 하이라이트 가능.
  const sw = (CFG.tour.borderW * s).toFixed(2);
  const land = COUNTRY_PATHS.map((cp) => `<path data-ko="${cp.ko}" data-cont="${cp.cont}" d="${cp.d}" fill="${COLORS.tour.continent[cp.cont] || COLORS.tour.land}" stroke="${COLORS.tour.border}" stroke-width="${sw}"/>`).join('');
  mapViewport.innerHTML = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${MAP_W}" height="${MAP_H}" fill="#0b1020"/>${land}${route}${cities}${plane}</svg>`;
  mapViewport.querySelectorAll('.map-pick').forEach((g) => {
    g.addEventListener('click', () => { if (!mapDragMoved) chooseDest(Number(g.dataset.dest)); });
  });
}

// 선택한 나라 하나만 살짝 밝게 강조(사용자 지시). 그 나라 대륙의 밝은 톤을 쓴다. 나머지는 원래 색.
function highlightCountry(ko) {
  const svg = mapViewport.querySelector('svg');
  if (!svg) return;
  svg.querySelectorAll('path[data-ko]').forEach((p) => {
    const cont = p.getAttribute('data-cont');
    const base = COLORS.tour.continent[cont] || COLORS.tour.land;
    p.setAttribute('fill', p.getAttribute('data-ko') === ko ? (COLORS.tour.continentHi[cont] || base) : base);
  });
}

// viewBox만 갱신(드래그·확대축소·홈 공용, 재렌더 없음).
function setViewBox() {
  const svg = mapViewport.querySelector('svg');
  if (svg && tourVB) svg.setAttribute('viewBox', `${tourVB.x.toFixed(1)} ${tourVB.y.toFixed(1)} ${tourVB.w.toFixed(1)} ${tourVB.h.toFixed(1)}`);
}

// 확대/축소(중심 유지). factor<1 확대, >1 축소.
function zoomMap(factor) {
  if (!tourVB) return;
  const T = CFG.tour;
  let nw = Math.max(T.zoomWMin, Math.min(T.zoomWMax, tourVB.w * factor));
  const nh = nw * (tourVB.h / tourVB.w);
  tourVB.x += (tourVB.w - nw) / 2; tourVB.y += (tourVB.h - nh) / 2;
  tourVB.w = nw; tourVB.h = nh;
  setViewBox();
}

// 홈: 현재 위치+후보가 보이도록 뷰 복귀.
function recenterMap() {
  const vpW = mapViewport.clientWidth || CFG.tour.zoomRefW;
  const vpH = mapViewport.clientHeight || (vpW / CFG.tour.aspect);
  tourVB = computeViewBox(game.tourIdx, tourFrame, vpW, vpH);
  setViewBox();
}

// 후보 클릭 → 비행기가 목적지로 날아가는 연출 → 도착 카드('나라-수도') → 다음 구역.
function chooseDest(dest) {
  if (state !== 'map' || flyRaf) return; // 연출 중 재클릭은 flyRaf 가드로 차단(핀·라벨을 지우지 않아 대상 이름이 유지됨)
  mapHint.hidden = true;
  mapTitle.textContent = `${COUNTRIES[dest].ko}(으)로!`;
  highlightCountry(COUNTRIES[dest].ko); // 선택한 나라 하나만 살짝 강조
  const from = game.tourIdx;
  flyTo(from, dest, () => {
    game.tourIdx = dest;
    game.tourPath.push(dest);
    mapCard.innerHTML = `${COUNTRIES[dest].ko} 도착!<br>수도는 <b>${COUNTRIES[dest].cap}</b>`;
    mapCard.hidden = false;
    placeCardOverCity(dest); // 화면 중앙 대신 도착한 도시 바로 위에 카드를 띄운다(사용자 지시)
    sound.play('start'); // 도착 효과음(기존 사운드 재사용)
    flyRaf = 0;
    setTimeout(closeMapAndAdvance, CFG.tour.cardTime * 1000);
  });
}

// 도착 카드를 dest 도시의 화면 위치 바로 위에 놓는다(SVG 좌표 → 화면 px는 getScreenCTM으로 정확 변환).
function placeCardOverCity(dest) {
  const svg = mapViewport.querySelector('svg');
  if (!svg || !svg.getScreenCTM) return;
  const m = svg.getScreenCTM();
  if (!m) return;
  const pt = svg.createSVGPoint();
  pt.x = cityX(dest); pt.y = cityY(dest);
  const scr = pt.matrixTransform(m);
  const parent = (mapCard.offsetParent || document.body).getBoundingClientRect();
  const cx = scr.x - parent.left, cyScr = scr.y - parent.top;
  const cardH = mapCard.offsetHeight || 60;
  const GAP = 38; // 핀·라벨을 가리지 않는 카드-도시 간격(화면 px)
  let top = cyScr - GAP - cardH;   // 기본: 도시 핀 바로 위(카드 상단 y)
  if (top < 8) top = cyScr + GAP;  // 위로 넘치면(상단 도시) 도시 아래에 표시
  mapCard.style.left = `${cx.toFixed(1)}px`;
  mapCard.style.top = `${Math.max(8, top).toFixed(1)}px`;
}

// 비행기 마커를 from→dest로 flyTime초에 걸쳐 이동시키고 노란 경로선을 그려나간다.
function flyTo(from, dest, done) {
  const x0 = cityX(from), y0 = cityY(from), x1 = cityX(dest), y1 = cityY(dest);
  const svg = mapViewport.querySelector('svg');
  const plane = mapViewport.querySelector('#tour-plane');
  if (!svg || !plane) { done(); return; }
  const fly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fly.setAttribute('fill', 'none');
  fly.setAttribute('stroke', COLORS.tour.current);
  fly.setAttribute('stroke-width', (2.5 * tourScale).toFixed(2));
  fly.setAttribute('stroke-dasharray', `${(6 * tourScale).toFixed(1)} ${(6 * tourScale).toFixed(1)}`);
  svg.insertBefore(fly, plane);
  const dur = Math.max(1, CFG.tour.flyTime * 1000);
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    plane.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    fly.setAttribute('d', `M${x0.toFixed(1)},${y0.toFixed(1)}L${x.toFixed(1)},${y.toFixed(1)}`);
    if (t < 1) flyRaf = requestAnimationFrame(step);
    else { flyRaf = 0; done(); }
  };
  flyRaf = requestAnimationFrame(step);
}

function closeMapAndAdvance() {
  mapOverlay.hidden = true;
  mapCard.hidden = true;
  advanceStage();
}

// world.js nextStage와 동일 효과: 다음 구역 웨이브 준비 후 루프 재개.
function advanceStage() {
  if (flyRaf) { cancelAnimationFrame(flyRaf); flyRaf = 0; }
  game.stage++;
  startStage(game); // 화력·목숨·점수 유지, '구역 N' 배너 이벤트 push(resume 후 소비)
  state = 'playing';
  loop.resume();
  saveProgress(); // 새 구역 진입마다 자동 저장
}

// ── 지도 인터랙션(드래그 스크롤 + 확대축소 + 홈) - 모듈 로드 시 1회 바인딩 ──
let mapDrag = null, mapDragMoved = false;
// 지도 조작: 한 손가락=드래그 이동, 두 손가락=핀치 확대/축소(아이패드 등 터치기기).
const mapPointers = new Map(); // 현재 눌린 포인터 pointerId → {x,y}
let mapPinch = null;           // 두 손가락 시작 상태 { d0=시작 손가락 간격, w0=시작 viewBox 폭 }
mapViewport.addEventListener('pointerdown', (e) => {
  if (!tourVB) return;
  mapPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (mapPointers.size >= 2) {
    // 두 손가락 감지: 핀치 확대 시작. 진행 중이던 한 손가락 드래그는 취소.
    const p = [...mapPointers.values()];
    mapPinch = { d0: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, w0: tourVB.w };
    mapDrag = null;
    return;
  }
  mapDrag = { px: e.clientX, py: e.clientY, ox: tourVB.x, oy: tourVB.y, id: e.pointerId };
  mapDragMoved = false;
  // 여기서 포인터를 캡처하지 않는다 - 캡처하면 도시 핀(자식)의 click이 삼켜져 목적지 터치가 안 된다.
  //   실제로 움직임이 임계를 넘은 순간에만(아래 pointermove) 캡처해 드래그를 이어받는다.
});
mapViewport.addEventListener('pointermove', (e) => {
  if (mapPointers.has(e.pointerId)) mapPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  // 두 손가락 핀치: 손가락 간격 비율로 확대(멀어지면 확대, 가까워지면 축소). 시작 폭(w0) 기준 절대 배율이라 안정적.
  if (mapPinch && mapPointers.size >= 2 && tourVB) {
    const p = [...mapPointers.values()];
    const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (d > 0) zoomMap((mapPinch.w0 * (mapPinch.d0 / d)) / tourVB.w);
    return;
  }
  if (!mapDrag || !tourVB) return;
  const k = tourVB.w / (mapViewport.clientWidth || 1); // 화면px → 지도 단위
  if (!mapDragMoved && Math.abs(e.clientX - mapDrag.px) + Math.abs(e.clientY - mapDrag.py) > 5) {
    mapDragMoved = true;
    mapViewport.setPointerCapture(mapDrag.id); // 드래그 확정 시에만 캡처(탭은 핀 클릭으로 남김)
  }
  if (!mapDragMoved) return;
  tourVB.x = mapDrag.ox - (e.clientX - mapDrag.px) * k;
  tourVB.y = mapDrag.oy - (e.clientY - mapDrag.py) * k;
  setViewBox();
});
const endDrag = (e) => {
  if (e && e.pointerId != null) mapPointers.delete(e.pointerId);
  if (mapPointers.size < 2) mapPinch = null; // 손가락 하나라도 떼면 핀치 종료
  mapDrag = null;
};
mapViewport.addEventListener('pointerup', endDrag);
mapViewport.addEventListener('pointercancel', endDrag);
mapViewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomMap(e.deltaY > 0 ? CFG.tour.zoomStep : 1 / CFG.tour.zoomStep);
}, { passive: false });
$('#map-zoom-in').addEventListener('click', () => zoomMap(1 / CFG.tour.zoomStep));
$('#map-zoom-out').addEventListener('click', () => zoomMap(CFG.tour.zoomStep));
$('#map-home').addEventListener('click', recenterMap);

// fromPop = popstate(폰 백버튼/화면 ← 경유)로 불린 경우. 그 외(게임오버 모달 '홈' 등) 직접 호출 시엔
//   startGame에서 쌓은 game 히스토리 지점을 소비해, 다음 시작 때 push가 정상 동작하도록 정리한다.
function backToMenu(fromPop) {
  state = 'menu';
  loop.stop();
  gameScreen.hidden = true;
  menuScreen.hidden = false;
  elMenuBest.textContent = best;
  updateCheatVisible();
  syncResumeBtn(); // 저장이 있으면 '이어서 하기' 버튼 표시/갱신
  if (!fromPop && history.state && history.state.screen === 'game') history.back();
}

// 치트 박스 표시: 치트 켜짐 + 게임 진행/일시정지 중일 때만.
function updateCheatVisible() {
  const show = cheatEnabled && (state === 'playing' || state === 'paused');
  $('#cheat-box').hidden = !show;
  if (show) syncCheatUI(); // 저장된 치트 설정을 UI에 반영
}

// 저장/복원된 치트 값(속도·무적·드랍 확률·종류)을 치트 박스 UI에 그대로 반영.
function syncCheatUI() {
  $('#cheat-speed').querySelectorAll('button[data-mul]').forEach((x) => x.classList.toggle('on', Number(x.dataset.mul) === cheatSpeed));
  $('#cheat-inv').checked = cheatState.invincible;
  const pct = Math.round((cheatState.dropChance == null ? CFG.drop.chance : cheatState.dropChance) * 100);
  $('#cheat-drop').value = pct;
  $('#cheat-drop-val').textContent = pct + '%';
  $('#cheat-kinds').querySelectorAll('input[data-kind]').forEach((c) => { c.checked = cheatState.dropKinds[c.dataset.kind] !== false; });
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
btnStart.addEventListener('click', () => startGame(difficulty));

// '이어서 하기': 저장된 진행을 그대로 재개. 저장이 있을 때만 홈에 표시한다.
const btnResume = $('#btn-resume');
function syncResumeBtn() {
  const s = loadProgress();
  const has = !!(s && s.stage);
  btnResume.disabled = !has; // 저장 없으면 비활성(회색), 있을 때만 활성
  const sub = btnResume.querySelector('.resume-sub');
  if (sub) {
    const c = has ? COUNTRIES[s.tourIdx] : null;
    sub.textContent = has ? `${c ? c.ko : ''} · 구역 ${s.stage}` : '저장된 게임 없음';
  }
}
btnResume.addEventListener('click', () => {
  const s = loadProgress();
  if (!s) return;
  if (s.difficulty) { difficulty = s.difficulty; store.set('difficulty', difficulty); syncDiffSeg(); }
  friendOn = !!s.friendOn; autoOn = !!s.autoOn; apSkill = s.apSkill || apSkill;
  setOptIcon(optFriend, friendOn); setOptIcon(optAuto, autoOn);
  startGame(s.difficulty, s);
});
syncResumeBtn(); // 초기 홈 진입 시 저장 여부 반영
// 난이도 세그먼트: 버튼 하나를 켜고 나머지 끈다. 선택은 localStorage에 기억.
const diffSeg = $('#diff-seg');
function syncDiffSeg() {
  diffSeg.querySelectorAll('.seg-btn').forEach((b) => {
    const on = b.dataset.diff === difficulty;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
}
diffSeg.addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  difficulty = b.dataset.diff; store.set('difficulty', difficulty);
  syncDiffSeg();
});
// 친구 동행 / 자동 플레이 아이콘 토글(난이도 무관, 눌러서 on/off). 선택 기억.
const optFriend = $('#opt-friend');
const optAuto = $('#opt-auto');
function setOptIcon(btn, on) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on)); }
setOptIcon(optFriend, friendOn);
setOptIcon(optAuto, autoOn);
optFriend.addEventListener('click', () => { friendOn = !friendOn; store.set('friendOn', friendOn); setOptIcon(optFriend, friendOn); });
optAuto.addEventListener('click', () => { autoOn = !autoOn; store.set('autoOn', autoOn); setOptIcon(optAuto, autoOn); });
syncDiffSeg();
// 게임 화면 ← : 허브로 직행하지 않고 뒤로가기(→ popstate → backToMenu)로 모드 선택 화면에 돌아간다.
$('#game-home').addEventListener('click', (e) => { e.preventDefault(); history.back(); });
// 폰/브라우저 자체 뒤로가기: 플레이/일시정지 중이면 게임 밖 이탈 대신 모드 선택으로. 메뉴에선 그대로 허브로 나간다.
window.addEventListener('popstate', () => { if (state === 'playing' || state === 'paused') backToMenu(true); });
btnPause.addEventListener('click', togglePause);
btnMute.addEventListener('click', () => {
  const m = !sound.isMuted();
  sound.setMuted(m);
  btnMute.innerHTML = m ? ICON.volumeOff : ICON.volumeOn;
  btnMute.setAttribute('aria-label', m ? '소리 켜기' : '소리 끄기');
});
// 자동 보조(하이브리드) 켜기/끄기. 켜져 있으면 손 안 댈 때 AI가 몰고, 손대면 내 조작이 우선한다.
function setAutoAssist(on) {
  game.autoAssist = on;
  game.manualTimer = 0; // 토글 즉시 반영(대기 잔여 제거)
  btnAuto.classList.toggle('on', on);
  btnAuto.setAttribute('aria-pressed', String(on));
  btnAuto.setAttribute('aria-label', on ? '자동 플레이 끄기' : '자동 플레이 켜기');
}
btnAuto.addEventListener('click', () => setAutoAssist(!game.autoAssist));
canvas.addEventListener('click', () => { if (state === 'paused') togglePause(); });

// ── 환경설정 모달 ──
const settingsModal = $('#settings-modal');
const setSkill = $('#set-skill');
const setCheat = $('#set-cheat');
setSkill.value = apSkill;
setCheat.checked = cheatEnabled;
$('#btn-settings').addEventListener('click', () => { settingsModal.hidden = false; });
$('#set-close').addEventListener('click', () => { settingsModal.hidden = true; });
setSkill.addEventListener('change', () => { apSkill = setSkill.value; store.set('apSkill', apSkill); game.apSkill = apSkill; });
setCheat.addEventListener('change', () => {
  cheatEnabled = setCheat.checked; store.set('cheat', cheatEnabled);
  game.cheat = cheatEnabled ? cheatState : null;
  updateCheatVisible();
});

// ── 치트 박스 ──
const cheatBox = $('#cheat-box');
$('#cheat-speed').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-mul]'); if (!b) return;
  cheatSpeed = Number(b.dataset.mul);
  $('#cheat-speed').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  saveCheat();
});
$('#cheat-inv').addEventListener('change', (e) => { cheatState.invincible = e.target.checked; saveCheat(); });
$('#cheat-drop').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  $('#cheat-drop-val').textContent = v + '%';
  cheatState.dropChance = v / 100;
  saveCheat();
});
$('#cheat-kinds').addEventListener('change', (e) => {
  const c = e.target.closest('input[data-kind]'); if (!c) return;
  cheatState.dropKinds[c.dataset.kind] = c.checked;
  saveCheat();
});
$('#cheat-fold').addEventListener('click', () => {
  const body = $('#cheat-body');
  body.hidden = !body.hidden;
  $('#cheat-fold').classList.toggle('folded', body.hidden); // 접힘 시 chevron 회전(SVG 아이콘)
});
// 지도 테스트: 게임 중 언제든 세계 여행 지도를 띄운다(전투를 다 거치지 않고 여행·경로 확인). 치트 전용.
$('#cheat-map').addEventListener('click', () => { if (state === 'playing') showMap(); });
// 보스 소환: 진행 중인 구역의 웨이브를 건너뛰고 현재 구역 보스를 즉시 등장(부위 파괴·격파 연출 확인용).
$('#cheat-boss').addEventListener('click', () => {
  if (state !== 'playing' || game.boss || game.bossPending) return;
  game.introTimer = 0; game.waves = []; game.waveIdx = 0;
  spawnBoss(game, W, H);
});
// 무기 강화: 4계통(메인·사이드·존·꼬리)을 한 단계씩 올린다. 화력 성장 관찰용.
$('#cheat-weapon').addEventListener('click', () => {
  if (state !== 'playing') return;
  gainFront(game); gainOption(game); gainZone(game); gainTail(game);
  syncHud();
});
// 헤더를 잡고 드래그해 치트 박스를 옮긴다(fixed 좌표라 화면 어디든).
let cheatDrag = null;
const cheatHead = $('#cheat-head');
cheatHead.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.cheat-fold')) return;
  const r = cheatBox.getBoundingClientRect();
  cheatDrag = { x: e.clientX - r.left, y: e.clientY - r.top };
  cheatHead.setPointerCapture(e.pointerId);
});
cheatHead.addEventListener('pointermove', (e) => {
  if (!cheatDrag) return;
  cheatBox.style.left = Math.max(0, e.clientX - cheatDrag.x) + 'px';
  cheatBox.style.top = Math.max(0, e.clientY - cheatDrag.y) + 'px';
});
cheatHead.addEventListener('pointerup', () => { cheatDrag = null; });

elMenuBest.textContent = best;
setupFullscreen();
resize();
