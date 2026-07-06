// Sky Raider - 횡스크롤(좌→우 전진) 캐주얼 비행 슈팅.
// 조작: 화면 드래그(상대 이동) + 자동발사. 파워업 아이템으로 화력 성장.
// 진행: 3개 구역(스테이지) 각각 웨이브 후 보스. 보스 격파로 다음 구역.
//
// 좌표계는 CSS 픽셀(stage 영역 clientWidth/Height). 전진 방향 = +x(오른쪽).
// 아군 탄 vx>0, 적은 오른쪽에서 등장해 vx<0로 왼쪽 이동.

import { createLoop } from '../../shared/loop.js';
import { createStorage } from '../../shared/storage.js';
import { showModal, registerServiceWorker } from '../../shared/ui.js';
import * as sound from './sound.js';

// 서비스워커 등록(운영 환경에서만 활성, 개발 host는 ui.js가 자동 차단).
registerServiceWorker('/service-worker.js');

// ─────────────────────────────────────────────────────────────
// 튜닝 상수 (밸런스 조정 지점을 한곳에)
// ─────────────────────────────────────────────────────────────
const CFG = {
  player: { r: 14, speed: 320, fireEvery: 0.14, maxLives: 3, invAfterHit: 1.6 },
  bullet: { speed: 620, r: 4, dmg: 1 },
  enemyBullet: { speed: 220, r: 5 },
  // 화력 레벨별 발사 각도(도). 0 = 정면(오른쪽).
  fireAngles: {
    1: [0],
    2: [-4, 4],
    3: [-9, 0, 9],
    4: [-15, -5, 5, 15],
    5: [-22, -11, 0, 11, 22],
  },
  maxPower: 5,
  // 적 종류별 사양
  enemy: {
    drone:  { r: 15, hp: 1, speed: 150, score: 100, color: '#ff6b81' },
    weaver: { r: 16, hp: 2, speed: 120, score: 150, color: '#ffa05c', amp: 70, freq: 2.4 },
    gunner: { r: 18, hp: 3, speed: 70,  score: 250, color: '#b48cff', fireEvery: 1.6 },
  },
  drop: { chance: 0.28, powerWeight: 0.6, healWeight: 0.2, bombWeight: 0.2 },
  boss: { rx: 46, ry: 40, baseHp: 90, hpPerStage: 55, score: 3000, bobAmp: 0.34, bobFreq: 0.5 },
  stageCount: 3,
};

// ─────────────────────────────────────────────────────────────
// DOM 참조
// ─────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const menuScreen = $('#menu-screen');
const gameScreen = $('#game-screen');
const canvas = $('#board');
const ctx = canvas.getContext('2d');
const elScore = $('#score');
const elStage = $('#stage');
const elPower = $('#power');
const elLives = $('#lives');
const elMenuBest = $('#menu-best');
const elBossBar = $('#boss-bar');
const elBossName = $('#boss-name');
const elBossFill = $('#boss-hp-fill');
const elBanner = $('#banner');
const btnStart = $('#btn-start');
const btnHow = $('#btn-how');
const btnMute = $('#btn-mute');
const btnPause = $('#btn-pause');

const store = createStorage('flightshooting');

// ─────────────────────────────────────────────────────────────
// 게임 상태
// ─────────────────────────────────────────────────────────────
let W = 0, H = 0, dpr = 1;
let state = 'menu'; // menu | playing | paused | over | won
let best = store.get('best', 0);

const game = {
  player: null,
  bullets: [],
  enemies: [],
  eBullets: [],
  powerups: [],
  particles: [],
  stars: [],
  boss: null,
  score: 0,
  lives: CFG.player.maxLives,
  power: 1,
  stage: 1,
  fireTimer: 0,
  // 웨이브 스포너 상태
  waves: [],
  waveIdx: 0,
  elapsed: 0,
  bossPending: false,
  bannerTimer: 0,
};

// ─────────────────────────────────────────────────────────────
// 캔버스 리사이즈 (DPR 대응)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 배경 별
// ─────────────────────────────────────────────────────────────
function initStars() {
  game.stars = [];
  const n = 70;
  for (let i = 0; i < n; i++) {
    game.stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      z: 0.3 + Math.random() * 0.9, // 깊이(속도·크기)
    });
  }
}
function updateStars(dt) {
  for (const s of game.stars) {
    s.x -= (40 + s.z * 140) * dt;
    if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
  }
}
function drawStars() {
  for (const s of game.stars) {
    ctx.globalAlpha = 0.2 + s.z * 0.5;
    ctx.fillStyle = '#9fd8ff';
    const sz = s.z * 2;
    ctx.fillRect(s.x, s.y, sz, sz);
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────
// 웨이브 생성 (스테이지별 스크립트)
// 각 wave: { t: 등장시각(초), enemies: [{type, yr}] }  yr = 화면높이 비율
// ─────────────────────────────────────────────────────────────
function buildWaves(stage) {
  const s = stage - 1; // 0-base 난이도 가중
  const rows = (n) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  const w = [];
  let t = 1.0;
  const add = (type, ys) => { w.push({ t, enemies: ys.map((yr) => ({ type, yr })) }); };

  add('drone', rows(3 + s));
  t += 2.2;
  add('weaver', rows(2 + s));
  t += 2.4;
  add('drone', rows(4 + s));
  t += 2.2;
  add('gunner', rows(2 + Math.min(s, 2)));
  t += 3.0;
  add('weaver', rows(3 + s));
  t += 2.6;
  add('drone', rows(4 + s));
  if (s >= 1) { t += 2.4; add('gunner', rows(2 + s)); }
  return w;
}

// ─────────────────────────────────────────────────────────────
// 엔티티 스폰
// ─────────────────────────────────────────────────────────────
function spawnEnemy(type, yr) {
  const spec = CFG.enemy[type];
  const y = Math.max(spec.r + 6, Math.min(H - spec.r - 6, yr * H));
  const e = {
    type, x: W + spec.r + 10, y, baseY: y,
    r: spec.r, hp: spec.hp, maxHp: spec.hp,
    speed: spec.speed, score: spec.score, color: spec.color,
    t: 0, fireTimer: (spec.fireEvery || 0) * Math.random(),
  };
  game.enemies.push(e);
}

function spawnBoss() {
  const hp = CFG.boss.baseHp + (game.stage - 1) * CFG.boss.hpPerStage;
  game.boss = {
    x: W + CFG.boss.rx + 20, targetX: W - CFG.boss.rx - 24,
    y: H / 2, rx: CFG.boss.rx, ry: CFG.boss.ry,
    hp, maxHp: hp, t: 0, entering: true,
    fireTimer: 1.2, patternTimer: 0, pattern: 0,
  };
  elBossName.textContent = `구역 ${game.stage} 보스`;
  elBossFill.style.width = '100%';
  elBossBar.hidden = false;
  sound.play('start');
}

function dropItem(x, y) {
  if (Math.random() > CFG.drop.chance) return;
  const r = Math.random();
  const { powerWeight, healWeight } = CFG.drop;
  let kind = 'P';
  if (r < powerWeight) kind = 'P';
  else if (r < powerWeight + healWeight) kind = 'H';
  else kind = 'B';
  game.powerups.push({ x, y, r: 12, vx: -60, kind, t: 0 });
}

function burst(x, y, color, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 180;
    game.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.3, age: 0, color,
      r: 1.5 + Math.random() * 2.5,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 발사
// ─────────────────────────────────────────────────────────────
function playerFire() {
  const p = game.player;
  const angles = CFG.fireAngles[Math.min(game.power, CFG.maxPower)];
  for (const deg of angles) {
    const rad = (deg * Math.PI) / 180;
    game.bullets.push({
      x: p.x + p.r, y: p.y,
      vx: Math.cos(rad) * CFG.bullet.speed,
      vy: Math.sin(rad) * CFG.bullet.speed,
      r: CFG.bullet.r,
    });
  }
  sound.play('shoot');
}

function enemyFireAt(e, tx, ty, speed = CFG.enemyBullet.speed) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  game.eBullets.push({
    x: e.x, y: e.y, vx: (dx / d) * speed, vy: (dy / d) * speed, r: CFG.enemyBullet.r,
  });
}

// ─────────────────────────────────────────────────────────────
// 입력 (드래그 상대 이동 + 키보드)
// ─────────────────────────────────────────────────────────────
const keys = new Set();
let dragging = false;
let lastPtr = null;

function canvasPos(ev) {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}
canvas.addEventListener('pointerdown', (ev) => {
  if (state !== 'playing') return;
  canvas.setPointerCapture?.(ev.pointerId);
  dragging = true;
  lastPtr = canvasPos(ev);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!dragging || state !== 'playing' || !game.player) return;
  const p = canvasPos(ev);
  game.player.x += p.x - lastPtr.x;
  game.player.y += p.y - lastPtr.y;
  lastPtr = p;
  clampPlayer();
});
function endDrag() { dragging = false; lastPtr = null; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (ev) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(ev.key)) ev.preventDefault();
  const k = ev.key.toLowerCase();
  keys.add(k);
  if (k === 'p') togglePause();
});
window.addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()));

function clampPlayer() {
  const p = game.player, r = p.r;
  p.x = Math.max(r, Math.min(W - r, p.x));
  p.y = Math.max(r, Math.min(H - r, p.y));
}

function applyKeyboard(dt) {
  const p = game.player;
  const sp = CFG.player.speed * dt;
  if (keys.has('arrowleft') || keys.has('a')) p.x -= sp;
  if (keys.has('arrowright') || keys.has('d')) p.x += sp;
  if (keys.has('arrowup') || keys.has('w')) p.y -= sp;
  if (keys.has('arrowdown') || keys.has('s')) p.y += sp;
  if (keys.size) clampPlayer();
}

// ─────────────────────────────────────────────────────────────
// 업데이트
// ─────────────────────────────────────────────────────────────
function update(dt) {
  if (state !== 'playing') return;
  game.elapsed += dt;
  if (game.bannerTimer > 0) game.bannerTimer -= dt;

  updateStars(dt);
  applyKeyboard(dt);

  const p = game.player;
  if (p.inv > 0) p.inv -= dt;

  // 자동 발사
  game.fireTimer -= dt;
  if (game.fireTimer <= 0) {
    game.fireTimer = CFG.player.fireEvery;
    playerFire();
  }

  spawnWaves();
  updateEnemies(dt);
  updateBoss(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updatePowerups(dt);
  updateParticles(dt);
  checkCollisions();
  checkProgress();
}

function spawnWaves() {
  while (game.waveIdx < game.waves.length && game.elapsed >= game.waves[game.waveIdx].t) {
    for (const e of game.waves[game.waveIdx].enemies) spawnEnemy(e.type, e.yr);
    game.waveIdx++;
  }
}

function updateEnemies(dt) {
  const p = game.player;
  for (const e of game.enemies) {
    e.t += dt;
    e.x -= e.speed * dt;
    if (e.type === 'weaver') {
      e.y = e.baseY + Math.sin(e.t * CFG.enemy.weaver.freq) * CFG.enemy.weaver.amp;
    } else if (e.type === 'gunner') {
      // 플레이어 y를 느슨히 추적
      e.y += Math.sign(p.y - e.y) * 40 * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x < W - 20) {
        e.fireTimer = CFG.enemy.gunner.fireEvery;
        enemyFireAt(e, p.x, p.y);
      }
    }
  }
  // 화면 왼쪽으로 완전히 벗어난 적 제거
  game.enemies = game.enemies.filter((e) => e.x > -e.r - 20);
}

function updateBoss(dt) {
  const boss = game.boss;
  if (!boss) return;
  boss.t += dt;
  if (boss.entering) {
    boss.x -= 90 * dt;
    if (boss.x <= boss.targetX) { boss.x = boss.targetX; boss.entering = false; }
    return;
  }
  // 상하 유영
  boss.y = H / 2 + Math.sin(boss.t * CFG.boss.bobFreq * Math.PI) * (H * CFG.boss.bobAmp);
  // 패턴 발사
  boss.fireTimer -= dt;
  if (boss.fireTimer <= 0) {
    boss.patternTimer++;
    if (boss.pattern === 0) {
      // 부채 산탄(왼쪽 방향 중심)
      boss.fireTimer = 1.1;
      const base = Math.PI; // 왼쪽(+x 기준 180도)
      const spread = 0.7, n = 5 + game.stage;
      for (let i = 0; i < n; i++) {
        const a = base - spread / 2 + (spread * i) / (n - 1);
        game.eBullets.push({
          x: boss.x - boss.rx, y: boss.y,
          vx: Math.cos(a) * CFG.enemyBullet.speed,
          vy: Math.sin(a) * CFG.enemyBullet.speed, r: CFG.enemyBullet.r,
        });
      }
    } else {
      // 조준 3연발
      boss.fireTimer = 1.4;
      const p = game.player;
      for (let i = 0; i < 3; i++) {
        const jitter = (i - 1) * 12;
        enemyFireAt(boss, p.x, p.y + jitter, CFG.enemyBullet.speed * 1.1);
      }
    }
    if (boss.patternTimer % 3 === 0) boss.pattern = boss.pattern === 0 ? 1 : 0;
  }
}

function updateBullets(dt) {
  for (const b of game.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  game.bullets = game.bullets.filter((b) => b.x < W + 20 && b.x > -20 && b.y > -20 && b.y < H + 20);
}

function updateEnemyBullets(dt) {
  for (const b of game.eBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  game.eBullets = game.eBullets.filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
}

function updatePowerups(dt) {
  for (const it of game.powerups) { it.x += it.vx * dt; it.t += dt; }
  game.powerups = game.powerups.filter((it) => it.x > -it.r - 10);
}

function updateParticles(dt) {
  for (const pt of game.particles) {
    pt.age += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.94; pt.vy *= 0.94;
  }
  game.particles = game.particles.filter((pt) => pt.age < pt.life);
}

// ─────────────────────────────────────────────────────────────
// 충돌
// ─────────────────────────────────────────────────────────────
function hit(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const rr = (a.r || a.rx) + (b.r || b.rx);
  return dx * dx + dy * dy <= rr * rr;
}

function checkCollisions() {
  const p = game.player;

  // 아군 탄 vs 적
  for (const b of game.bullets) {
    if (b.dead) continue;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (hit(b, e)) {
        b.dead = true;
        e.hp -= CFG.bullet.dmg;
        burst(b.x, b.y, e.color, 4);
        if (e.hp <= 0) {
          e.dead = true;
          game.score += e.score;
          burst(e.x, e.y, e.color, 14);
          dropItem(e.x, e.y);
          sound.play('explode');
        } else {
          sound.play('hit');
        }
        break;
      }
    }
    // 아군 탄 vs 보스
    if (!b.dead && game.boss && !game.boss.entering && hit(b, game.boss)) {
      b.dead = true;
      game.boss.hp -= CFG.bullet.dmg;
      burst(b.x, b.y, '#ff9a4d', 4);
      elBossFill.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
      if (game.boss.hp <= 0) defeatBoss();
    }
  }
  game.bullets = game.bullets.filter((b) => !b.dead);
  game.enemies = game.enemies.filter((e) => !e.dead);

  if (p.inv > 0) { syncHud(); return; } // 무적 중 피격 판정 생략

  // 적/적탄 vs 플레이어
  for (const e of game.enemies) {
    if (hit(p, e)) { playerHit(); return; }
  }
  if (game.boss && !game.boss.entering && hit(p, game.boss)) { playerHit(); return; }
  for (const b of game.eBullets) {
    if (hit(p, b)) { b.dead = true; playerHit(); break; }
  }
  game.eBullets = game.eBullets.filter((b) => !b.dead);

  // 파워업 획득
  for (const it of game.powerups) {
    if (it.dead) continue;
    if (hit(p, it)) { it.dead = true; grabItem(it.kind); }
  }
  game.powerups = game.powerups.filter((it) => !it.dead);

  syncHud();
}

function playerHit() {
  const p = game.player;
  game.lives--;
  game.power = Math.max(1, game.power - 1);
  p.inv = CFG.player.invAfterHit;
  burst(p.x, p.y, '#22d3ee', 18);
  sound.play('playerhit');
  syncHud();
  if (game.lives <= 0) gameOver();
}

function grabItem(kind) {
  if (kind === 'P') {
    game.power = Math.min(CFG.maxPower, game.power + 1);
    sound.play('power');
  } else if (kind === 'H') {
    game.lives = Math.min(CFG.player.maxLives, game.lives + 1);
    sound.play('power');
  } else if (kind === 'B') {
    // 봄: 화면 적 전멸 + 적탄 제거
    for (const e of game.enemies) { burst(e.x, e.y, e.color, 12); game.score += e.score; }
    game.enemies = [];
    game.eBullets = [];
    if (game.boss && !game.boss.entering) {
      game.boss.hp -= 20;
      elBossFill.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
      if (game.boss.hp <= 0) defeatBoss();
    }
    sound.play('bomb');
  }
  syncHud();
}

// ─────────────────────────────────────────────────────────────
// 진행 (보스 등장 / 스테이지 클리어 / 게임오버)
// ─────────────────────────────────────────────────────────────
function checkProgress() {
  // 웨이브 모두 소진 + 화면 적 없음 + 보스 미등장 → 보스 등장
  if (!game.boss && !game.bossPending &&
      game.waveIdx >= game.waves.length && game.enemies.length === 0) {
    game.bossPending = true;
    showBanner('경고', '보스 접근 중', 1.6);
    setTimeout(() => { if (state === 'playing') spawnBoss(); }, 1400);
  }
}

function defeatBoss() {
  const boss = game.boss;
  game.score += CFG.boss.score;
  burst(boss.x, boss.y, '#ff9a4d', 40);
  burst(boss.x - 20, boss.y - 10, '#ffd36b', 30);
  game.boss = null;
  game.bossPending = false;
  game.eBullets = [];
  elBossBar.hidden = true;
  sound.play('bossdown');
  syncHud();

  if (game.stage >= CFG.stageCount) {
    setTimeout(() => gameWon(), 900);
  } else {
    sound.play('stageclear');
    showBanner('구역 클리어', `구역 ${game.stage + 1}로`, 2.0);
    setTimeout(() => { if (state === 'playing') nextStage(); }, 1900);
  }
}

function nextStage() {
  game.stage++;
  startStage();
}

function startStage() {
  game.waves = buildWaves(game.stage);
  game.waveIdx = 0;
  game.elapsed = 0;
  game.bossPending = false;
  showBanner(`구역 ${game.stage}`, stageName(game.stage), 1.8);
  syncHud();
}

function stageName(n) {
  return ['소행성 지대', '적 함대 전선', '모함 최심부'][n - 1] || '';
}

// ─────────────────────────────────────────────────────────────
// 렌더
// ─────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  drawStars();
  drawPowerups();
  drawEnemies();
  drawBoss();
  drawEnemyBullets();
  drawBullets();
  drawPlayer();
  drawParticles();
}

function drawPlayer() {
  const p = game.player;
  if (!p) return;
  if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return; // 무적 깜빡
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 14;
  // 엔진 불꽃
  ctx.fillStyle = 'rgba(255,180,90,0.85)';
  ctx.beginPath();
  const fl = p.r * (1.1 + Math.random() * 0.5);
  ctx.moveTo(-p.r, -5); ctx.lineTo(-p.r - fl, 0); ctx.lineTo(-p.r, 5); ctx.closePath();
  ctx.fill();
  // 기체(오른쪽 향한 삼각형)
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(p.r + 4, 0); ctx.lineTo(-p.r, -p.r); ctx.lineTo(-p.r * 0.4, 0); ctx.lineTo(-p.r, p.r); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8fbff';
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawEnemies() {
  for (const e of game.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = e.color;
    if (e.type === 'drone') {
      ctx.beginPath();
      ctx.moveTo(-e.r, 0); ctx.lineTo(e.r * 0.6, -e.r); ctx.lineTo(e.r * 0.3, 0); ctx.lineTo(e.r * 0.6, e.r);
      ctx.closePath(); ctx.fill();
    } else if (e.type === 'weaver') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rr = i % 2 === 0 ? e.r : e.r * 0.5;
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
      ctx.fillStyle = '#0a0e18';
      ctx.fillRect(-e.r * 0.9, -4, 6, 8);
    }
    ctx.restore();
  }
}

function drawBoss() {
  const boss = game.boss;
  if (!boss) return;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.shadowColor = '#ff6b81';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#c0455c';
  ctx.beginPath();
  ctx.ellipse(0, 0, boss.rx, boss.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 포신부
  ctx.fillStyle = '#ff6b81';
  ctx.fillRect(-boss.rx - 8, -10, 12, 20);
  ctx.fillStyle = '#2a0f16';
  ctx.beginPath(); ctx.arc(6, 0, boss.ry * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd36b';
  ctx.beginPath(); ctx.arc(6, 0, boss.ry * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBullets() {
  ctx.save();
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#c9fbff';
  for (const b of game.bullets) {
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r * 2.2, b.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemyBullets() {
  ctx.save();
  ctx.shadowColor = '#ff6b81';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffb0bd';
  for (const b of game.eBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerups() {
  const label = { P: 'P', H: '♥', B: 'B' };
  const col = { P: '#f7c948', H: '#ff6b81', B: '#7cf3c4' };
  for (const it of game.powerups) {
    ctx.save();
    ctx.translate(it.x, it.y);
    const pulse = 1 + Math.sin(it.t * 6) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = col[it.kind];
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(10,14,24,0.9)';
    ctx.strokeStyle = col[it.kind];
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, it.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col[it.kind];
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label[it.kind], 0, 1);
    ctx.restore();
  }
}

function drawParticles() {
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, 1 - pt.age / pt.life);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────
// HUD / 배너
// ─────────────────────────────────────────────────────────────
function syncHud() {
  elScore.textContent = game.score;
  elStage.textContent = game.stage;
  elPower.textContent = game.power;
  const lifeEls = elLives.querySelectorAll('.life');
  lifeEls.forEach((el, i) => el.classList.toggle('spent', i >= game.lives));
}

function showBanner(big, sub, dur = 1.6) {
  elBanner.innerHTML = `<span class="banner-big">${big}</span>` + (sub ? `<span class="banner-sub">${sub}</span>` : '');
  elBanner.hidden = false;
  game.bannerTimer = dur;
}

// ─────────────────────────────────────────────────────────────
// 게임 플로우
// ─────────────────────────────────────────────────────────────
const loop = createLoop({
  update: (dt) => {
    update(dt);
    if (game.bannerTimer <= 0 && !elBanner.hidden) elBanner.hidden = true;
  },
  render,
});

function resetGame() {
  game.player = { x: W * 0.18, y: H * 0.5, r: CFG.player.r, inv: 0 };
  game.bullets = []; game.enemies = []; game.eBullets = [];
  game.powerups = []; game.particles = []; game.boss = null;
  game.score = 0; game.lives = CFG.player.maxLives; game.power = 1;
  game.stage = 1; game.fireTimer = 0;
  game.bossPending = false; game.bannerTimer = 0;
  elBossBar.hidden = true;
  initStars();
  startStage();
}

function startGame() {
  sound.unlockAudio();
  menuScreen.hidden = true;
  gameScreen.hidden = false;
  resize();
  resetGame();
  state = 'playing';
  syncHud();
  sound.play('start');
  loop.start();
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
    game.bannerTimer = 0;
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
    body: `모든 보스를 쓰러뜨렸다.\n최종 점수 ${game.score}${isBest ? '\n★ 최고 기록 갱신!' : ''}`,
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

// ─────────────────────────────────────────────────────────────
// 버튼 / 초기화
// ─────────────────────────────────────────────────────────────
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
// 일시정지 상태에서 캔버스 탭하면 재개
canvas.addEventListener('click', () => { if (state === 'paused') togglePause(); });

// 초기 표시
elMenuBest.textContent = best;
$('#menu-tips').hidden = true;
resize();
