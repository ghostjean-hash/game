// 엔트리. game 상태를 소유하고 루프·입력·렌더·플로우를 조립한다.
// core(순수 로직)가 game.sfx/game.events에 담은 신호를 여기서 소비(사운드 재생·화면 전환).
import { createLoop } from '../../../shared/loop.js';
import { createStorage } from '../../../shared/storage.js';
import { registerServiceWorker } from '../../../shared/ui.js';

import { createGameFrame, SCREEN } from '../../../shared/frame/index.js';
import { CFG } from './data/numbers.js';
import { COLORS } from './data/colors.js';
import { COUNTRIES, START_COUNTRY } from './data/countries.js';
import { COUNTRY_PATHS, MAP_FEATURE_PATHS, MAP_W, MAP_H, lonToX, latToY } from './data/worldmap.js';
import { SOUNDS } from './audio/sound.js';
import { initStars } from './core/stars.js';
import { stepWorld, startStage, applyKeyboard, updateParticles } from './core/world.js';
import { spawnBoss } from './core/spawn.js';
import { autopilotStep } from './core/autopilot.js';
import { gainFront, gainOption, gainZone, gainTail } from './core/parts.js';
import { spawnFriend } from './core/friend.js';
import { render, DIORAMA_READY, preloadDiorama } from './render/view.js';
import { createControls } from './input/controls.js';

registerServiceWorker('/service-worker.js');

// ── DOM 참조 ──
const $ = (sel) => document.querySelector(sel);
const gameScreen = $('#game-screen');
const canvas = $('#board');
const ctx = canvas.getContext('2d');
const elScore = $('#score');
const elCityCountry = $('#city-country');
const elCitySlots = $('#city-slots');
const elStage = $('#stage');
const elFront = $('#front');
const elOption = $('#option');
const elZone = $('#zone');
const elTail = $('#tail');
const elLives = $('#lives');
const lifeEls = elLives.querySelectorAll('.life'); // 하트 노드는 고정 → 1회만 조회(매 프레임 재쿼리 제거)
const elBossBar = $('#boss-bar');
const elBossName = $('#boss-name');
const elBossFill = $('#boss-hp-fill');
const elBanner = $('#banner');
const btnPause = $('#btn-pause');
const btnAuto = $('#btn-auto');

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
let state = 'menu'; // menu | playing | paused | dying | over | won | map | map-loading(디오라마 로드 대기)
let best = store.get('best', 0);
let bannerTimer = 0;
const CITY_HUD_TRANSFER_TIME = 2.46;
let cityHudTransferTimer = 0; // 여행 시작 배너가 HUD로 흡수되기 전 대기 시간
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

// ── 공용 프레임(html-game 표준 4.8) ──
// 시작 화면·상단 띠·잠깐 멈춤·결과 카드·되돌아가기 계단·소리를 여기서 한 번에 받는다.
// 예전 전용 메뉴 화면의 항목이 규격이 정한 같은 자리로 그대로 옮겨졌다 -
// 난이도 넷은 한 줄 세그(options), 친구 동행·자동 플레이는 시작 바로 위 켜고 끄는 줄(toggles),
// 이어서 하기는 그 위 칸, 환경설정은 상단 띠의 톱니로 간다(기획서 Ⅰ권 6.2 시안).
const DIFF_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움', insane: '매우 어려움' };
const frame = createGameFrame({
  root: document.getElementById('app'),
  gameId: 'flightshooting',
  title: '바푸리의 모험',
  character: { src: 'assets/characters/bapuri-upward-v5.png', width: 138 },
  background: { image: 'assets/diorama/KR-seoul.png' },
  sounds: SOUNDS,
  resume: { enabled: false, detail: '' },
  options: {
    selectedId: difficulty,
    items: Object.entries(DIFF_NAMES).map(([id, name]) => ({ id, name })),
  },
  toggles: [
    { id: 'friend', label: '친구 동행', on: friendOn },
    { id: 'auto', label: '자동 플레이', on: autoOn },
  ],
  onStart: (sel) => {
    if (sel.optionId) difficulty = sel.optionId;
    startGame(difficulty);
  },
  onResume: () => resumeSaved(),
  onOption: (id) => { difficulty = id; store.set('difficulty', id); },
  onToggle: (id, on) => {
    if (id === 'friend') { friendOn = on; store.set('friendOn', on); }
    else if (id === 'auto') { autoOn = on; store.set('autoOn', on); }
  },
  extras: [{ id: 'settings', label: '환경설정' }],
  onExtra: (id) => { if (id === 'settings') settingsModal.hidden = false; },
  onExit: () => { saveProgress(); return true; },
  onMuted: (m) => syncMuteBtn(m),
});
const sound = frame.audio;   // 예전 sound.js와 같은 이름들을 그대로 쓴다

function createGame() {
  return {
    player: null, bullets: [], enemies: [], eBullets: [], powerups: [], particles: [], scoreFloats: [], stars: [], boss: null,
    score: 0, scoreRemainder: 0, lives: CFG.player.maxLives, maxLives: CFG.player.maxLives, stage: 1, fireTimer: 0, // maxLives는 난이도로 재설정
    front: 1, options: [], optionEvo: 0, zone: { level: 0, spawnTimer: 0, pulses: [] }, tail: [], partHistory: [],
    friend: null, // 어린이 모드에서만 생성(docs/09). 일반 모드는 null 유지.
    waves: [], waveIdx: 0, elapsed: 0, introTimer: 0, apSkill: CFG.autopilot.default, cheat: null,
    // 자동 플레이(하이브리드): autoAssist 켜짐 + 손 안 댐(dragging=false) + 복귀 대기 끝(manualTimer<=0)일 때만 자동.
    autoAssist: false, dragging: false, manualTimer: 0,
    difficulty: 'normal', enemyFireMul: 1, enemyHpMul: 1, enemyShotsMax: 99, earlyShots: null, waveMax: Infinity, radialMul: 1, // 난이도(startGame에서 세팅)
    bonusTimer: CFG.bonusShip.every,
    bossPending: false, transitioning: false, pendingTimer: null, transitionTimer: null, mapTransitionTimer: null, winTimer: null, bossDeathTimer: null,
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
    if (cityHudTransferTimer > 0) {
      cityHudTransferTimer -= dt;
      if (cityHudTransferTimer <= 0) {
        game.cityHudReady = true;
        elBanner.classList.add('is-travel-to-hud');
        elCityCountry.classList.remove('is-arriving'); elCitySlots.classList.remove('is-arriving');
        void elCityCountry.offsetWidth; // 같은 구역 재시작에도 HUD 착지 애니메이션을 다시 시작한다.
        elCityCountry.classList.add('is-arriving'); elCitySlots.classList.add('is-arriving');
      }
    }
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
  const nation = COUNTRIES[game.tourIdx];
  const cityHudReady = game.cityHudReady !== false;
  elCityCountry.textContent = cityHudReady && nation ? (nation.type === 'travel' ? nation.parentCountry : nation.ko) : '';
  // 실제 글자 칸: 빈 칸도 같은 크기의 회색 배경을 유지해 수도 글자 수를 즉시 읽을 수 있다.
  elCitySlots.replaceChildren(...(cityHudReady ? game.citySlots || [] : []).map((slot) => {
    const cell = document.createElement('span');
    cell.className = `city-slot${slot.filled ? ' is-filled' : ''}`;
    cell.textContent = slot.filled ? slot.letter : '';
    return cell;
  }));
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
  elBanner.classList.remove('is-travel-to-hud');
  if (nl >= 0) {
    game.cityHudReady = false;
    cityHudTransferTimer = Math.max(0.2, dur - CITY_HUD_TRANSFER_TIME);
  } else {
    cityHudTransferTimer = 0;
  }
  elBanner.hidden = false;
  bannerTimer = dur;
}

// ── 게임 플로우 ──
function resetGame() {
  game.player = { x: W * 0.5, y: H * CFG.player.yRatio, r: CFG.player.r, inv: 0, dead: false, emo: null, emoT: 0 };
  game.bombFlash = 0;
  game.bullets = []; game.enemies = []; game.eBullets = [];
  game.powerups = []; game.particles = []; game.scoreFloats = []; game.boss = null;
  game.score = 0; game.scoreRemainder = 0; game.maxLives = CFG.player.maxLives; game.lives = game.maxLives; // 난이도별 maxLives는 startGame에서 재설정
  game.front = 1; game.options = []; game.optionEvo = 0; game.zone = { level: 0, timer: null }; game.tail = []; game.partHistory = [];
  game.friend = null; // 친구 동행 켜짐이면 startGame에서 다시 생성
  game.stage = 1; game.fireTimer = 0;
  game.tourIdx = START_COUNTRY; game.tourPath = [START_COUNTRY]; // 세계 여행 경로 초기화(한국 출발)
  game.dragging = false; game.manualTimer = 0; // 하이브리드 자동 상태 초기화
  game.bossPending = false; game.transitioning = false;
  game.pendingTimer = null; game.transitionTimer = null; game.mapTransitionTimer = null; game.winTimer = null; game.bossDeathTimer = null;
  game.shake = 0;
  game.sfx.length = 0; game.events.length = 0;
  game.cityHudReady = false; // 시작 배너가 좌상단 HUD에 도착할 때까지 목적지 슬롯은 숨긴다.
  cityHudTransferTimer = 0;
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
    stage: game.stage, score: game.score, scoreRemainder: game.scoreRemainder, lives: game.lives, maxLives: game.maxLives,
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
  // 되돌아갈 자리를 쌓는 일과 기기 뒤로가기를 받는 일은 이제 공용 계단이 맡는다(규격 4.8-3/4.8-18).
  // 예전에는 이 게임이 직접 history를 쌓고 popstate를 가로챘는데, 그 상태로 공용 계단을 얹으면
  // 뒤로가기 한 번에 두 칸이 물러난다.
  frame.screens.go(SCREEN.PLAY);
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
  game.earlyShots = diffCfg.earlyShots || null;
  game.waveMax = diffCfg.waveMax || Infinity;
  game.radialMul = diffCfg.radialMul != null ? diffCfg.radialMul : 1; // 방사·자폭 탄 개수 배수(쉬움 감축)
  game.maxLives = diffCfg.maxLives || CFG.player.maxLives; // 난이도별 목숨 최대값(쉬움 5 ~ 어려움/매우 어려움 3, 최소 3)
  game.lives = game.maxLives;                             // 시작 목숨 = 최대값(resetGame 기본3 위로 재설정)
  if (saved) {
    // 이어서 하기: 저장된 구역·점수·목숨·여행경로·화력을 되살린다.
    game.stage = saved.stage;
    game.score = saved.score;
    game.scoreRemainder = saved.scoreRemainder || 0;
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

// 잠깐 멈춤. 카드는 공용 프레임이 갖고 있고 여기서는 화면만 옮긴다(규격 4.8-8).
// 예전에는 배너에 '일시정지'를 띄우고 화면을 탭해 풀었다.
function togglePause() {
  if (state === 'playing') frame.screens.go(SCREEN.PAUSE);
  else if (state === 'paused') frame.navigate.back();
}

// 화면이 잠깐 멈춤으로 갈 때·나올 때 게임 상태를 맞춘다. 버튼으로 멈춘 경우와
// 화면을 벗어나 자동으로 멈춤이 된 경우가 같은 자리를 지난다.
function applyPauseState(paused) {
  if (paused) {
    if (state !== 'playing') return;
    state = 'paused';
    loop.pause();
    btnPause.innerHTML = ICON.play;
  } else {
    if (state !== 'paused') return;
    state = 'playing';
    elBanner.hidden = true;
    bannerTimer = 0;
    btnPause.innerHTML = ICON.pause;
    loop.resume();
  }
}

function gameOver() {
  state = 'over';
  loop.pause();
  clearProgress(); // 격추 = 저장 무효화(이어하기 불가)
  sound.play('gameover');
  const isBest = commitBest();
  showResult('격추당했다', isBest);
}

function gameWon() {
  state = 'won';
  loop.pause();
  clearProgress(); // 완주 = 저장 무효화
  sound.play('stageclear');
  const isBest = commitBest();
  showResult('전 구역 격파!', isBest, `${CFG.stageCount}개 구역의 모든 보스를 쓰러뜨렸다`);
}

// 결과는 알림창이 아니라 플레이를 덮는 카드다(규격 4.8-8).
// 버튼은 다시 하기 / 그만하기 둘이고 허브로 곧장 나가는 문은 두지 않는다(4.8-3).
function showResult(title, isBest, note = '') {
  const lines = [];
  if (note) lines.push(note);
  lines.push({ label: '점수', value: game.score.toLocaleString(), highlight: isBest });
  lines.push({ label: '최고', value: best.toLocaleString() });
  lines.push({ label: '간 곳', value: `구역 ${game.stage}` });
  frame.result.show({ title, lines, newRecord: isBest });
  frame.screens.go(SCREEN.RESULT);
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
let tourScale = 1; // 현재 핀 렌더용 지도 단위 배율. 확대 시 터치 핀을 역보정한다.
let tourBaseScale = 1; // 최초 프레이밍의 핀 크기. 확대해도 이 화면상 크기를 넘지 않는다.
let tourVB = null; // 현재 지도 viewBox {x,y,w,h} - 드래그·확대축소로 갱신
let tourCands = []; // 클릭 가능한 후보 전체(안 간 나라 전부)
let tourFrame = []; // 초기 확대 프레이밍용(현재+가까운 frameNear개) - 클릭 후보와 별개
let tourSelected = null; // 핀을 한 번 눌러 정보 카드를 연 목적지. 플레이 버튼으로만 비행을 확정한다.
let tourSelectedPin = null; // 반복 지도에서 실제로 누른 핀. 카드가 같은 복제 지도 좌표를 따라가게 한다.
const PACIFIC_CENTER_X = MAP_W; // 반복된 지도에서 날짜변경선(태평양)을 화면 중앙으로 쓰는 기준 좌표.
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
  tourSelected = null;
  tourSelectedPin = null;
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

// SVG 별은 글꼴별 세로 기준점 차이 없이 실제 도형 중심이 도시 터치 원 중심에 오도록 만든다.
function mapStarPoints(x, y, outer, inner) {
  const M = CFG.tour.mark;
  const points = [];
  for (let i = 0; i < M.bgStarPoints * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (Math.PI * i) / M.bgStarPoints;
    points.push(`${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`);
  }
  return points.join(' ');
}

// 도시 하나: 후보는 핀만, 이미 클리어한 곳은 나라·목적지를 두 줄로 표시한다.
function cityMark(i, mk, dotColor, s, clickable, faint, hasBg, showLabel = false, selected = false, current = false) {
  const C = COUNTRIES[i];
  const x = cityX(i), yv = cityY(i);
  const dot = mk.dot * s;
  const gap = CFG.tour.mark.labelGap * s;
  const nameFs = (mk.name * s).toFixed(1), capFs = (Math.max(mk.cap, mk.name * 1.18) * s).toFixed(1);
  const op = faint ? ' opacity="0.55"' : '';
  const cls = `${clickable ? 'map-pick' : ''}${selected ? ' is-selected' : ''}${current ? ' map-current-mark' : ''}`.trim();
  const open = clickable ? `<g class="${cls}" data-dest="${i}"${op}>` : cls ? `<g class="${cls}"${op}>` : `<g${op}>`;
  // 선택 효과는 핀의 원래 색을 대체하지 않는다. 바깥 도넛 링만 별도 레이어로 얹는다.
  const selectedRing = selected ? `<circle class="pick-focus-ring" cx="${x.toFixed(1)}" cy="${yv.toFixed(1)}" r="${(dot * 1.82).toFixed(1)}" fill="none" stroke="#ffd24a" stroke-width="${Math.max(1.5, 2.1 * s).toFixed(2)}" pointer-events="none"/>` : '';
  const arrival = current ? `<circle class="map-current-arrival" cx="${x.toFixed(1)}" cy="${yv.toFixed(1)}" r="${(dot * 1.9).toFixed(1)}" fill="none" stroke="#a6ff4d" stroke-width="${Math.max(1.1, 1.7 * s).toFixed(2)}" pointer-events="none"/>` : '';
  const dotEl = `<circle ${clickable ? 'class="pick-dot" ' : ''}data-dot="${mk.dot}" cx="${x.toFixed(1)}" cy="${yv.toFixed(1)}" r="${dot.toFixed(1)}" fill="${dotColor}" stroke="#0b1020" stroke-width="${(1.5 * s).toFixed(2)}"/>`;
  // 배경(디오라마) 이미지가 준비된 미방문 도시는 도시 터치 원 안 중앙에 대비 높은 별 도형을 겹쳐 표시한다.
  const M = CFG.tour.mark;
  const bgStar = hasBg ? `<polygon points="${mapStarPoints(x, yv, dot * M.bgStarOuterScale, dot * M.bgStarInnerScale)}" fill="${COLORS.tour.bgReady}" stroke="${COLORS.tour.bgReadyStroke}" stroke-width="${(M.bgStarStroke * s).toFixed(1)}" stroke-linejoin="round" pointer-events="none"/>` : '';
  if (!showLabel) return open + arrival + selectedRing + dotEl + bgStar + '</g>';
  const anchor = C.labelDir === 'left' ? 'end' : C.labelDir === 'right' ? 'start' : 'middle';
  const labelX = (C.labelDir === 'left' ? x - dot - gap : C.labelDir === 'right' ? x + dot + gap : x).toFixed(1);
  const capSize = Math.max(mk.cap, mk.name * 1.18) * s;
  const nameY = current ? yv + dot + gap + mk.name * s : yv - dot - gap - mk.cap * s * 0.95 - CFG.tour.mark.nameLift * s;
  const capY = current ? nameY + capSize * 1.13 : yv - dot - gap;
  const top = C.type === 'travel' ? C.parentCountry : C.ko;
  const bottom = C.type === 'travel' ? `여행지 ${C.ko}` : C.cap;
  const labelClass = current ? 'map-current-label' : 'map-visited-label';
  const labels = `<text class="${labelClass}" x="${labelX}" y="${nameY.toFixed(1)}" text-anchor="${anchor}" font-size="${nameFs}" font-weight="600" fill="${COLORS.tour.countryLabel}">${top}</text><text class="${labelClass}" x="${labelX}" y="${capY.toFixed(1)}" text-anchor="${anchor}" font-size="${capFs}" font-weight="700" fill="${COLORS.tour.destinationLabel}">${bottom}</text>`;
  return open + arrival + selectedRing + dotEl + bgStar + labels + '</g>';
}

function geoLabels(s) {
  const fs = (45 * s).toFixed(1), small = (28 * s).toFixed(1);
  const text = (x, y, value, size = fs) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" letter-spacing="1.2" fill="${COLORS.tour.countryLabel}" opacity="0.6" pointer-events="none">${value}</text>`;
  const pole = (x, y, label, dy) => `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="${(5 * s).toFixed(1)}" fill="${COLORS.tour.current}" stroke="#fff" stroke-width="${(1.2 * s).toFixed(1)}"/>${text(x, y + dy, label, small)}</g>`;
  // x=55는 160°W(태평양 중앙), x=417은 30°W(대서양 중앙), y=250은 적도다.
  return `<path d="M0 250H${MAP_W}" stroke="${COLORS.tour.border}" stroke-width="${(0.9 * s).toFixed(2)}" stroke-dasharray="${(5 * s).toFixed(1)} ${(5 * s).toFixed(1)}" opacity="0.7" pointer-events="none"/>${text(500, 244, '적도', small)}${text(55, 210, '태평양')}${text(417, 202, '대서양')}${text(722, 310, '인도양')}${text(548, 150, '지중해', small)}${text(610, 190, '홍해', small)}${text(505, 76, '북극해', small)}${text(505, 438, '남극해', small)}${pole(500, 0, '북극', 14)}${pole(500, MAP_H, '남극', -10)}`;
}

function unwrapX(fromX, toX) {
  return toX + Math.round((fromX - toX) / MAP_W) * MAP_W;
}

function unwrappedRoute(path) {
  if (!path.length) return [];
  const points = [{ x: cityX(path[0]), y: cityY(path[0]) }];
  for (let i = 1; i < path.length; i++) {
    const prev = points[points.length - 1];
    points.push({ x: unwrapX(prev.x, cityX(path[i])), y: cityY(path[i]) });
  }
  return points;
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
  tourBaseScale = tourVB.w / vpW;
  tourScale = tourBaseScale;
  const s = tourScale;
  const M = CFG.tour.mark;
  const path = game.tourPath;
  const candSet = new Set(cands);
  const visitedSet = new Set(path);
  let route = '';
  if (path.length > 1) {
    const points = unwrappedRoute(path);
    route = `<path d="${points.map((p, k) => (k ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join('')}" fill="none" stroke="${COLORS.tour.route}" stroke-width="${(2.5 * s).toFixed(2)}" stroke-dasharray="${(6 * s).toFixed(1)} ${(6 * s).toFixed(1)}" opacity="0.8"/>`;
  }
  let cities = '';
  for (let i = 0; i < COUNTRIES.length; i++) {
    // 여행 경로에 있는 도시는 이미 클리어했다. 배경이 준비돼도 별은 미방문 도시에만 보인다.
    const hasBg = DIORAMA_READY.has(COUNTRIES[i].ko) && !visitedSet.has(i);
    if (i === cur) cities += cityMark(i, M.cur, COLORS.tour.current, s, false, false, hasBg, true, false, true);
    else if (candSet.has(i)) cities += cityMark(i, M.cand, COLORS.tour.candidate, s, true, false, hasBg, false, i === tourSelected);
    else if (visitedSet.has(i)) cities += cityMark(i, M.visited, COLORS.tour.visited, s, false, false, hasBg, true);
    else cities += cityMark(i, M.other, COLORS.tour.dim, s, false, true, hasBg);
  }
  // 현재 위치는 어떤 마스크·크롭도 씌우지 않은 원본 PNG 전체다. 노란 현재점보다 화면상 10px 위에 분리한다.
  const plane = `<g id="tour-plane" transform="translate(${fx(cur)},${fy(cur)})" pointer-events="none"><image href="assets/characters/bapuri-sprite-v2.png" x="${(-27 * s).toFixed(1)}" y="${(-49 * s).toFixed(1)}" width="${(54 * s).toFixed(1)}" height="${(54 * s).toFixed(1)}" preserveAspectRatio="xMidYMid meet"/></g>`;
  const vb = `${tourVB.x.toFixed(1)} ${tourVB.y.toFixed(1)} ${tourVB.w.toFixed(1)} ${tourVB.h.toFixed(1)}`;
  // 나라별 path를 대륙 색으로 칠한다(COUNTRY_PATHS). data-ko로 선택 나라 하나만 하이라이트 가능.
  const sw = (CFG.tour.borderW * s).toFixed(2);
  const land = [...COUNTRY_PATHS, ...MAP_FEATURE_PATHS].map((cp) => `<path data-ko="${cp.ko}" data-cont="${cp.cont}" d="${cp.d}" fill="${COLORS.tour.continent[cp.cont] || COLORS.tour.land}" stroke="${COLORS.tour.border}" stroke-width="${sw}"/>`).join('');
  // 반복된 각 세계의 대륙을 먼저 전부 그린 뒤, 지리명·경로·도시를 별도 최상위 레이어로 올린다.
  // 그래야 하와이↔뉴욕처럼 복제 경계에 걸친 점선이 다른 복제본 대륙 뒤로 숨지 않는다.
  const repeat = (content) => [-MAP_W, 0, MAP_W].map((dx) => `<g transform="translate(${dx},0)">${content}</g>`).join('');
  const repeatedLand = repeat(land);
  const repeatedGeo = repeat(geoLabels(s));
  const repeatedRoute = repeat(route);
  const repeatedCities = repeat(cities);
  const sidePlane = plane.replace('id="tour-plane"', '');
  const repeatedPlane = `<g transform="translate(${-MAP_W},0)">${sidePlane}</g>${plane}<g transform="translate(${MAP_W},0)">${sidePlane}</g>`;
  mapViewport.innerHTML = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><rect x="${-MAP_W}" y="-500" width="${MAP_W * 3}" height="${MAP_H + 1000}" fill="#0b1020"/>${repeatedLand}${repeatedGeo}${repeatedRoute}${repeatedCities}${repeatedPlane}</svg>`;
  mapViewport.querySelectorAll('.map-pick').forEach((g) => {
    g.addEventListener('click', () => { if (!mapDragMoved) selectDest(Number(g.dataset.dest), g); });
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
  if (!svg || !tourVB) return;
  // 수평만 순환: 드래그가 어느 쪽 끝을 지나도 같은 경도 좌표로 감겨 이어진다.
  tourVB.x = ((tourVB.x % MAP_W) + MAP_W) % MAP_W;
  const pad = CFG.tour.verticalPanPad;
  const maxY = MAP_H + pad - tourVB.h;
  tourVB.y = Math.max(-pad, Math.min(maxY, tourVB.y));
  svg.setAttribute('viewBox', `${tourVB.x.toFixed(1)} ${tourVB.y.toFixed(1)} ${tourVB.w.toFixed(1)} ${tourVB.h.toFixed(1)}`);
  const nowScale = Math.min(tourBaseScale, tourVB.w / (mapViewport.clientWidth || CFG.tour.zoomRefW));
  tourScale = nowScale;
  svg.querySelectorAll('circle[data-dot]').forEach((dot) => {
    const base = Number(dot.dataset.dot);
    dot.setAttribute('r', (base * nowScale).toFixed(1));
    dot.setAttribute('stroke-width', ((base === 7 ? 2 : 1.5) * nowScale).toFixed(2));
  });
  // 선택 카드도 지도 좌표에 붙어 있으므로 드래그·확대·축소 때 같은 핀을 계속 따라간다.
  if (state === 'map' && tourSelected != null && !mapCard.hidden) placeCardOverCity(tourSelected);
}

// 확대/축소(중심 유지). factor<1 확대, >1 축소.
function zoomMap(factor) {
  if (!tourVB) return;
  const T = CFG.tour;
  let nw = Math.max(T.zoomWMin, Math.min(T.zoomWMax, tourVB.w * factor));
  const nh = nw * (tourVB.h / tourVB.w);
  tourVB.x += (tourVB.w - nw) / 2; tourVB.y += (tourVB.h - nh) / 2;
  tourVB.w = nw; tourVB.h = nh;
  if (nw >= MAP_W) tourVB.x = PACIFIC_CENTER_X - nw / 2;
  setViewBox();
}

// 홈: 현재 위치+후보가 보이도록 뷰 복귀.
function recenterMap() {
  const vpW = mapViewport.clientWidth || CFG.tour.zoomRefW;
  const vpH = mapViewport.clientHeight || (vpW / CFG.tour.aspect);
  tourVB = computeViewBox(game.tourIdx, tourFrame, vpW, vpH);
  setViewBox();
}

// 후보 핀은 정보를 여는 동작만 한다. 작은 화면에서는 이름을 지도에 전부 뿌리지 않고,
// 선택 카드의 플레이 버튼으로 한 번 더 확정해 오터치 이동을 막는다.
function selectDest(dest, pin = null) {
  if (state !== 'map' || flyRaf) return;
  const target = COUNTRIES[dest];
  tourSelected = dest;
  tourSelectedPin = pin;
  mapViewport.querySelectorAll('.map-pick').forEach((pin) => pin.classList.toggle('is-selected', Number(pin.dataset.dest) === dest));
  mapTitle.textContent = `${target.ko} 선택`;
  mapHint.hidden = true;
  mapCard.innerHTML = target.type === 'travel'
    ? `<span class="map-country-label">${target.parentCountry}</span><br><span class="map-destination-label">여행지 ${target.ko}</span><br><button type="button" id="map-play">플레이</button>`
    : `<span class="map-country-label">${target.ko}</span><br><span class="map-destination-label">${target.cap}</span><br><button type="button" id="map-play">플레이</button>`;
  mapCard.hidden = false;
  placeCardOverCity(dest);
  $('#map-play').addEventListener('click', () => chooseDest(dest), { once: true });
}

function clearMapSelection() {
  if (tourSelected == null) return;
  tourSelected = null;
  tourSelectedPin = null;
  mapViewport.querySelectorAll('.map-pick.is-selected').forEach((pin) => pin.classList.remove('is-selected'));
  mapCard.hidden = true;
  mapHint.hidden = false;
  mapTitle.textContent = '다음 목적지를 골라주세요';
}

// 플레이 확정 → 비행기가 목적지로 날아가는 연출 → 도착 카드 → 다음 구역.
function chooseDest(dest) {
  if (state !== 'map' || flyRaf || tourSelected !== dest) return;
  mapHint.hidden = true;
  mapTitle.textContent = `${COUNTRIES[dest].ko} 나라로!`;
  mapCard.innerHTML = '<b>이동하여 진입</b>';
  mapCard.hidden = false;
  highlightCountry(COUNTRIES[dest].ko); // 선택한 나라 하나만 살짝 강조
  const from = game.tourIdx;
  flyTo(from, dest, () => {
    game.tourIdx = dest;
    game.tourPath.push(dest);
    const target = COUNTRIES[dest];
    mapCard.innerHTML = target.type === 'travel'
      ? `<span class="map-country-label">${target.parentCountry}</span><br><span class="map-destination-label">여행지 ${target.ko} 도착!</span>`
      : `<span class="map-country-label">${target.ko}</span><br><span class="map-destination-label">${target.cap} 도착!</span>`;
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
  // 반복된 세계 지도에서는 같은 국가 핀이 세 번 존재한다. 선택한 실제 핀의 화면 사각형을 쓰면
  // 어느 복제본을 눌렀어도 카드가 핀에 정확히 붙는다.
  const pin = tourSelectedPin && tourSelectedPin.isConnected
    ? tourSelectedPin
    : svg.querySelector(`.map-pick[data-dest="${dest}"]`);
  const dot = pin && pin.querySelector('circle[data-dot]');
  const rect = dot && dot.getBoundingClientRect();
  const m = svg.getScreenCTM();
  if (!m && !rect) return;
  const pt = svg.createSVGPoint(); pt.x = cityX(dest); pt.y = cityY(dest);
  const scr = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : pt.matrixTransform(m);
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
  const x0 = cityX(from), y0 = cityY(from), x1 = unwrapX(x0, cityX(dest)), y1 = cityY(dest);
  const svg = mapViewport.querySelector('svg');
  const plane = mapViewport.querySelector('#tour-plane');
  if (!svg || !plane) { done(); return; }
  const fly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fly.setAttribute('fill', 'none');
  fly.setAttribute('stroke', COLORS.tour.current);
  fly.setAttribute('stroke-width', (2.5 * tourScale).toFixed(2));
  fly.setAttribute('stroke-dasharray', `${(6 * tourScale).toFixed(1)} ${(6 * tourScale).toFixed(1)}`);
  svg.append(fly); // 대륙·도시 복제 레이어보다 앞: 이동 점선이 아메리카 뒤로 숨지 않는다.
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

async function closeMapAndAdvance() {
  // 도착 카드 다음에는 전투를 시작하지 않고 배경을 먼저 준비한다. map-loading 상태라 목적지를 다시
  // 고르는 클릭도 막히며, loop은 이미 pause 상태여서 자동 발사·적 스폰도 일어나지 않는다.
  if (state !== 'map') return;
  state = 'map-loading';
  mapCard.innerHTML = '배경을 불러오는 중…';
  mapCard.hidden = false;
  mapTitle.textContent = '잠시만 기다려주세요';
  await preloadDiorama(COUNTRIES[game.tourIdx].ko);
  if (state !== 'map-loading') return; // 화면 이탈 등으로 전환이 취소된 경우
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
  const tappedEmptyMap = state === 'map' && !mapDragMoved && !e?.target?.closest?.('.map-pick');
  if (e && e.pointerId != null) mapPointers.delete(e.pointerId);
  if (mapPointers.size < 2) mapPinch = null; // 손가락 하나라도 떼면 핀치 종료
  mapDrag = null;
  if (tappedEmptyMap) clearMapSelection();
};
mapViewport.addEventListener('pointerup', endDrag);
mapViewport.addEventListener('pointercancel', endDrag);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state === 'map' && tourSelected != null) { e.preventDefault(); clearMapSelection(); }
});
mapViewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomMap(e.deltaY > 0 ? CFG.tour.zoomStep : 1 / CFG.tour.zoomStep);
}, { passive: false });
$('#map-zoom-in').addEventListener('click', () => zoomMap(1 / CFG.tour.zoomStep));
$('#map-zoom-out').addEventListener('click', () => zoomMap(CFG.tour.zoomStep));
$('#map-home').addEventListener('click', recenterMap);
$('#map-exit').addEventListener('click', () => {
  if (flyRaf) cancelAnimationFrame(flyRaf);
  flyRaf = 0;
  mapOverlay.hidden = true;
  backToMenu();
});

// 시작 화면으로 돌아간다. 화면 이동과 되돌아갈 자리 정리는 공용 계단이 맡으므로
// 여기서는 게임 쪽 상태만 끝낸다(예전에는 history 지점을 직접 소비했다).
function backToMenu() {
  state = 'menu';
  loop.stop();
  updateCheatVisible();
  refreshTitle();  // 최고 점수·이어서 하기 칸을 지금 상태로
  if (frame.screens.current() !== SCREEN.TITLE) frame.screens.go(SCREEN.TITLE);
}

// 시작 화면의 기록 줄과 이어서 하기 칸을 지금 상태로 맞춘다.
// 기록 줄은 제목 아래 한 줄이 규격이라(4.8-5) 최고 점수와 가장 멀리 간 곳을 한 줄에 담는다.
function refreshTitle() {
  const s = loadProgress();
  const far = s && COUNTRIES[s.tourIdx] ? COUNTRIES[s.tourIdx].ko : null;
  frame.title.setRecord(best > 0
    ? `최고 점수 ${best.toLocaleString()}${far ? ` · 가장 멀리 간 곳 ${far}` : ''}`
    : '');
  frame.title.setResume({
    enabled: !!(s && s.stage),
    detail: s && s.stage ? `${far ? `${far} · ` : ''}구역 ${s.stage}` : '저장된 게임 없음',
  });
}

// 시작 화면 '이어서 하기': 저장된 진행을 그대로 재개한다.
function resumeSaved() {
  const s = loadProgress();
  if (!s) return;
  if (s.difficulty && CFG.difficulty[s.difficulty]) {
    difficulty = s.difficulty;
    store.set('difficulty', difficulty);
  }
  friendOn = !!s.friendOn;
  autoOn = !!s.autoOn;
  apSkill = s.apSkill || apSkill;
  frame.title.setToggle('friend', friendOn);
  frame.title.setToggle('auto', autoOn);
  startGame(difficulty, s);
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

// ── 버튼 / 초기화 ──
// 시작·이어서 하기·난이도·친구·자동·환경설정 버튼은 모두 공용 시작 화면이 갖고 있고,
// 눌렀을 때 할 일은 프레임을 만들 때 넘겼다. 여기 남은 것은 플레이 화면의 버튼들이다.

// 이 게임의 플레이 화면을 프레임에 등록한다. 등록하지 않으면 시작 화면 위에 겹쳐 보인다.
frame.screens.register(SCREEN.PLAY, gameScreen);

// 플레이 화면 왼쪽 위 화살표도 계단을 따른다 - 한 칸 위(시작 화면)로만 간다.
$('#game-home').addEventListener('click', () => frame.navigate.back());
btnPause.addEventListener('click', togglePause);

// 플레이 화면 HUD의 소리 버튼(캔버스 위 오버레이). 상태는 프레임이 알려주는 대로 따라간다.
// 프레임을 만드는 도중에도 불리므로 지난 음소거 값을 인자로 받는다.
function syncMuteBtn(muted) {
  const b = $('#btn-mute');
  if (!b) return;
  const m = muted === undefined ? frame.audio.isMuted() : muted;
  b.innerHTML = m ? ICON.volumeOff : ICON.volumeOn;
  b.setAttribute('aria-label', m ? '소리 켜기' : '소리 끄기');
}
$('#btn-mute')?.addEventListener('click', () => frame.audio.setMuted(!frame.audio.isMuted()));
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
// 환경설정은 시작 화면의 공용 추가 항목에서 연다.
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

// ── 첫 진입 ──
// 잠깐 멈춤·결과 카드 버튼과 화면 이동을 잇는다. 카드는 공용 프레임이 갖고 있다.
frame.pause.on('continue', () => frame.navigate.back());
frame.pause.on('restart', () => { frame.screens.go(SCREEN.PLAY); startGame(difficulty); });
frame.pause.on('quit', () => backToMenu());
frame.result.on('retry', () => { frame.screens.go(SCREEN.PLAY); startGame(difficulty); });
frame.result.on('quit', () => backToMenu());
frame.screens.onChange((now) => {
  if (now === SCREEN.PAUSE) applyPauseState(true);
  else if (now === SCREEN.PLAY) applyPauseState(false);
  if (now === SCREEN.TITLE && state !== 'menu') backToMenu();
  if (now === SCREEN.PLAY) requestAnimationFrame(() => resize());
});

refreshTitle();
syncMuteBtn();
resize();
