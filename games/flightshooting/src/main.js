// 엔트리. game 상태를 소유하고 루프·입력·렌더·플로우를 조립한다.
// core(순수 로직)가 game.sfx/game.events에 담은 신호를 여기서 소비(사운드 재생·화면 전환).
import { createLoop } from '../../../shared/loop.js';
import { createStorage } from '../../../shared/storage.js';
import { showModal, registerServiceWorker } from '../../../shared/ui.js';
import { CFG } from './data/numbers.js';
import { COLORS } from './data/colors.js';
import * as sound from './audio/sound.js';
import { initStars } from './core/stars.js';
import { stepWorld, startStage, applyKeyboard, updateParticles } from './core/world.js';
import { spawnEnemy, spawnBoss } from './core/spawn.js';
import { autopilotStep } from './core/autopilot.js';
import { gainFront, gainOption, gainZone, gainTail } from './core/parts.js';
import { spawnFriend, gainFriendLevel } from './core/friend.js';
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
let state = 'menu'; // menu | playing | paused | dying | over | won
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
    case 'death': // 목숨 0: 죽는 연출 시작(폭발), deathTime 뒤 gameOver 팝업
      state = 'dying';
      deathTimer = CFG.emote.deathTime;
      sound.play('explode');
      break;
    case 'gameover': gameOver(); break;
    case 'win': gameWon(); break;
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
  if (count < countMax || !evo) { el.textContent = count; el.classList.remove('mastered'); return; }
  const tier = Math.min(Math.floor((evo - 1) / 8) + 1, tierMax);
  const sub = ((evo - 1) % 8) + 1; // 1~8
  el.textContent = tierText(tier, sub);
  el.classList.toggle('mastered', evo >= tierMax * 8);
}
function setFrontHud() {
  // 메인 총알: front 1~7 = 탄 수, 8 = 탄수 만렙, 9~88 = 발별 진화(evo = front-8).
  setEvoHud(elFront, game.front, 8, Math.max(0, game.front - 8), CFG.parts.front.tierMax);
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
  elBanner.innerHTML = `<span class="banner-big">${big}</span>` + (sub ? `<span class="banner-sub">${sub}</span>` : '');
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
  game.dragging = false; game.manualTimer = 0; // 하이브리드 자동 상태 초기화
  game.bossPending = false; game.transitioning = false;
  game.pendingTimer = null; game.transitionTimer = null; game.winTimer = null;
  game.sfx.length = 0; game.events.length = 0;
  elBossBar.hidden = true;
  initStars(game, W, H);
  startStage(game); // '구역 1' 배너 이벤트는 첫 프레임에 소비됨
}

function startGame(diff) {
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
  applyDevHook(); // 검증용: localhost에서 URL 파라미터로 시작 구역·파츠 지정
  setAutoAssist(autoOn); // 홈의 자동 플레이 토글 반영(하이브리드)
  game.apSkill = apSkill;                       // 자동 플레이 실력 티어 반영
  game.difficulty = difficulty;                 // 난이도
  const diffCfg = CFG.difficulty[difficulty] || CFG.difficulty.normal;
  game.enemyFireMul = diffCfg.enemyFireMul;
  game.enemyHpMul = diffCfg.enemyHpMul != null ? diffCfg.enemyHpMul : 1; // 난이도별 적 체력 배수
  game.enemyShotsMax = diffCfg.enemyShotsMax || 99;
  game.radialMul = diffCfg.radialMul != null ? diffCfg.radialMul : 1; // 방사·자폭 탄 개수 배수(쉬움 감축)
  game.maxLives = diffCfg.maxLives || CFG.player.maxLives; // 난이도별 목숨 최대값(쉬움 5 ~ 매우 어려움 1)
  game.lives = game.maxLives;                             // 시작 목숨 = 최대값(resetGame 기본3 위로 재설정)
  // 난이도 시작 보너스: '쉬움'은 메인 총알·꼬리 비행기를 조금 갖춘 채 출발(옛 어린이 배려 흡수)
  for (let i = 1; i < diffCfg.startFront; i++) gainFront(game);
  for (let i = 0; i < diffCfg.startTail; i++) gainTail(game);
  game.cheat = cheatEnabled ? cheatState : null; // 치트 켜짐 시에만 core가 참조
  state = 'playing';
  updateCheatVisible();
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
  // front: 1~88. 9 이상이면 발별 진화가 보인다(가운데 탄부터 8발마다 티어 +1).
  const front = num('front'); if (front != null) for (let i = 1; i < front; i++) gainFront(game);
  const option = num('option'); if (option != null) for (let i = 0; i < option; i++) gainOption(game);
  const zone = num('zone'); if (zone != null) for (let i = 0; i < zone; i++) gainZone(game);
  // tail: 1~44. 4까지 대수, 그 뒤 낮은 무기부터 발별 순차 진화(44=전원 무기11).
  const tail = num('tail'); if (tail != null) for (let i = 0; i < tail; i++) gainTail(game);
  // friendlv: 친구 메인 총알 레벨(0~10) 즉시 반영(어린이 모드에서 친구가 있을 때만). 부채 넓어짐 관찰용.
  const flv = num('friendlv'); if (flv != null && game.friend) for (let i = 0; i < flv; i++) gainFriendLevel(game);
  const lives = num('lives'); if (lives != null) game.lives = Math.max(1, lives);
  const ap = q.get('ap'); if (ap && CFG.autopilot.tiers[ap]) apSkill = ap; // 검증용: 자동 플레이 실력 티어 지정(이후 game.apSkill에 반영)
  if (q.get('cheat') != null) { cheatEnabled = true; setCheat.checked = true; } // 검증 편의: 치트 박스 자동 표시
  // pow=P|S|E|T|H|B: 해당 파워업 하나를 화면 위쪽에 스폰(내려오며 획득 확인용).
  const pow = q.get('pow'); if (pow) game.powerups.push({ x: W * 0.5, y: H * 0.3, r: 12, vy: 70, kind: pow, t: 0 });
  // emo=happy|cry: 표정 검증용. 바푸리(+친구) 표정을 강제 고정(캡처 동안 유지).
  const emo = q.get('emo');
  if (emo) { game.player.emo = emo; game.player.emoT = 999; if (game.friend) { game.friend.emo = emo; game.friend.emoT = 999; } }
  const pr = num('pr'); if (pr != null) { game.player.r = pr; if (game.friend) game.friend.r = pr; } // 표정·외형 확대 관찰용
  // spawn=<적종류>: 해당 적을 화면 상단에 즉시 스폰(신규 적 외형·행동 관찰용).
  const spawnType = q.get('spawn');
  if (spawnType) { game.introTimer = 0; for (const xr of [0.35, 0.65]) spawnEnemy(game, spawnType, xr, W); }
  // boss=1: 웨이브 건너뛰고 현재 구역 보스를 즉시 등장(부위 파괴형 스타일 관찰용).
  if (q.get('boss') != null) { game.introTimer = 0; game.waves = []; game.waveIdx = 0; spawnBoss(game, W, H); }
  if (stage != null) startStage(game); // 지정 구역 웨이브 재생성 + 배너
  if (q.get('nointro') != null) {
    game.introTimer = 0; // 검증 편의: 인트로 배너 건너뛰고 즉시 발사
    if (game.friend) { game.friend.enterTimer = 0; game.friend.speechIdx = CFG.friend.speech.length; game.friend.msg = null; } // 친구 등장·말풍선 건너뛰고 즉시 발사
  }
  // warm=N: 시작 시 N프레임 미리 굴려 탄·상태를 진행시킨 화면을 바로 캡처(검증 편의).
  const warm = num('warm');
  if (warm != null) { game.introTimer = 0; for (let i = 0; i < warm; i++) stepWorld(game, 0.016, W, H); }
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
    body: `${CFG.stageCount}개 구역의 모든 보스를 쓰러뜨렸다.\n최종 점수 ${game.score}${isBest ? '\n★ 최고 기록 갱신!' : ''}`,
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

// fromPop = popstate(폰 백버튼/화면 ← 경유)로 불린 경우. 그 외(게임오버 모달 '홈' 등) 직접 호출 시엔
//   startGame에서 쌓은 game 히스토리 지점을 소비해, 다음 시작 때 push가 정상 동작하도록 정리한다.
function backToMenu(fromPop) {
  state = 'menu';
  loop.stop();
  gameScreen.hidden = true;
  menuScreen.hidden = false;
  elMenuBest.textContent = best;
  updateCheatVisible();
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
  $('#cheat-fold').textContent = body.hidden ? '+' : '−';
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

// 검증 전용(localhost 한정): ?dev=1&auto=1 이면 로드 즉시 자동 플레이 시작.
//   ?diff=easy|normal|hard|insane 난이도 지정, ?friend=1(또는 옛 ?kid=1) 친구 동행 켬.
// 운영 배포(github.io)에선 hostname 게이트로 완전 무효 - 일반 플레이 영향 0.
(function autoStartHook() {
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;
  const q = new URLSearchParams(location.search);
  if (q.get('dev') == null) return;
  const d = q.get('diff');
  const diff = d && CFG.difficulty[d] ? d : (q.get('kid') != null ? 'easy' : 'normal');
  if (q.get('friend') != null || q.get('kid') != null) { friendOn = true; setOptIcon(optFriend, true); }
  if (q.get('auto') != null) { autoOn = true; setOptIcon(optAuto, true); startGame(diff); } // 자동 플레이(하이브리드)
  else if (q.get('kid') != null || q.get('friend') != null || d != null) startGame(diff); // 수동 관찰용 시작
})();
