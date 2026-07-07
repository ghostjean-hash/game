// 게임 월드 갱신 오케스트레이터 (순수). DOM/Canvas/오디오 미의존.
// 부수효과는 game.sfx(사운드 이름)와 game.events(화면 전환 신호)에만 담아 main이 소비한다.
// 화면 전환 지연은 setTimeout이 아니라 dt 기반 타이머라 일시정지에도 안전하다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { playerFire, enemyFireAt } from './fire.js';
import { stepOptions, homeMissiles, tickZone, gainFront, gainOption, gainZone, loseLastPart } from './parts.js';
import { updateStars } from './stars.js';
import { buildWaves, stageName } from './waves.js';
import { spawnEnemy, spawnBoss, spawnBonus, spawnShards, dropItems, burst } from './spawn.js';

export function hit(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const rr = (a.r || a.rx) + (b.r || b.rx);
  return dx * dx + dy * dy <= rr * rr;
}

export function clampPlayer(game, W, H) {
  const p = game.player, r = p.r;
  p.x = Math.max(r, Math.min(W - r, p.x));
  p.y = Math.max(r, Math.min(H - r, p.y));
}

export function applyKeyboard(game, keys, dt, W, H) {
  const p = game.player;
  const sp = CFG.player.speed * dt;
  if (keys.has('arrowleft') || keys.has('a')) p.x -= sp;
  if (keys.has('arrowright') || keys.has('d')) p.x += sp;
  if (keys.has('arrowup') || keys.has('w')) p.y -= sp;
  if (keys.has('arrowdown') || keys.has('s')) p.y += sp;
  if (keys.size) clampPlayer(game, W, H);
}

function spawnWaves(game, W) {
  while (game.waveIdx < game.waves.length && game.elapsed >= game.waves[game.waveIdx].t) {
    for (const e of game.waves[game.waveIdx].enemies) spawnEnemy(game, e.type, e.xr, W);
    game.waveIdx++;
  }
}

function updateEnemies(game, dt, W, H) {
  const p = game.player;
  for (const e of game.enemies) {
    e.t += dt;
    if (e.type === 'bonus') {
      e.x += e.vx * dt; // 보너스 기체는 가로로만 지나간다(세로 고정)
      continue;
    }
    if (e.type === 'shard') {
      e.x += e.vx * dt; e.y += e.speed * dt; // 분열 조각: 좌우로 퍼지며 하강
      continue;
    }
    if (e.type === 'rusher') {
      if (e.phase === 0) {
        e.y += e.vy * dt; // 조준하며 천천히 하강
        if (e.t >= CFG.enemy.rusher.charge) { // 돌진 방향 확정
          const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
          e.vx = (dx / d) * CFG.enemy.rusher.rush;
          e.vy = (dy / d) * CFG.enemy.rusher.rush;
          e.phase = 1;
        }
      } else {
        e.x += e.vx * dt; e.y += e.vy * dt; // 급강하 돌진
      }
      continue;
    }
    e.y += e.speed * dt;
    if (e.type === 'weaver') {
      e.x = e.baseX + Math.sin(e.t * CFG.enemy.weaver.freq) * CFG.enemy.weaver.amp;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.weaver.fireEvery;
        enemyFireAt(game, e, p.x, p.y); // weaver 단발 조준
      }
    } else if (e.type === 'gunner') {
      e.x += Math.sign(p.x - e.x) * 40 * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.gunner.fireEvery;
        const g = CFG.enemy.gunner; // 3발 확산 조준
        for (let i = 0; i < g.shots; i++) enemyFireAt(game, e, p.x + (i - (g.shots - 1) / 2) * g.spread, p.y);
      }
    } else if (e.type === 'shielder') {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.shielder.fireEvery;
        enemyFireAt(game, e, p.x, p.y); // 방패병 단발 조준
      }
    }
  }
  // 세로로 지나간 것 + 보너스 기체가 가로로 화면을 벗어난 것 제거.
  game.enemies = game.enemies.filter((e) => e.y < H + e.r + 20 && e.x > -e.r - 40 && e.x < W + e.r + 40);
}

function updateBoss(game, dt, W, H) {
  const boss = game.boss;
  if (!boss) return;
  boss.t += dt;
  if (boss.entering) {
    boss.y += 90 * dt;
    if (boss.y >= boss.targetY) { boss.y = boss.targetY; boss.entering = false; }
    return;
  }
  boss.x = W / 2 + Math.sin(boss.t * CFG.boss.bobFreq * Math.PI) * (W * CFG.boss.bobAmp * 0.5);

  if (boss.kind === 'mini') {
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      boss.fireTimer = 1.3;
      const p = game.player;
      for (let i = 0; i < 2; i++) enemyFireAt(game, boss, p.x + (i - 0.5) * 30, p.y);
    }
    boss.escortTimer -= dt;
    if (boss.escortTimer <= 0) {
      boss.escortTimer = CFG.miniBoss.escortEvery;
      spawnEnemy(game, Math.random() < 0.5 ? 'drone' : 'weaver', 0.15 + Math.random() * 0.7, W);
    }
    return;
  }

  // 최종 보스: 2패턴 번갈아
  boss.fireTimer -= dt;
  if (boss.fireTimer <= 0) {
    boss.patternTimer++;
    if (boss.pattern === 0) {
      boss.fireTimer = 1.0;
      const base = Math.PI / 2; // 아래(+y)
      const spread = 0.8, n = 9;
      for (let i = 0; i < n; i++) {
        const a = base - spread / 2 + (spread * i) / (n - 1);
        game.eBullets.push({
          x: boss.x, y: boss.y + boss.ry,
          vx: Math.cos(a) * CFG.enemyBullet.speed,
          vy: Math.sin(a) * CFG.enemyBullet.speed, r: CFG.enemyBullet.r,
        });
      }
    } else {
      boss.fireTimer = 1.3;
      const p = game.player;
      for (let i = 0; i < 3; i++) enemyFireAt(game, boss, p.x + (i - 1) * 14, p.y, CFG.enemyBullet.speed * 1.1);
    }
    if (boss.patternTimer % 3 === 0) boss.pattern = boss.pattern === 0 ? 1 : 0;
  }
}

// 배열이 상한을 넘으면 오래된 것부터 제거(발열/성능 방어).
function capArray(arr, lim) {
  if (arr.length > lim) arr.splice(0, arr.length - lim);
}

function updateBullets(game, dt, W, H) {
  for (const b of game.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  game.bullets = game.bullets.filter((b) => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);
  capArray(game.bullets, CFG.limits.bullets);
}

function updateEnemyBullets(game, dt, W, H) {
  for (const b of game.eBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  game.eBullets = game.eBullets.filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
  capArray(game.eBullets, CFG.limits.eBullets);
}

function updatePowerups(game, dt, W, H) {
  for (const it of game.powerups) { it.y += it.vy * dt; it.t += dt; }
  game.powerups = game.powerups.filter((it) => it.y < H + it.r + 10);
}

function updateParticles(game, dt) {
  for (const pt of game.particles) {
    pt.age += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.94; pt.vy *= 0.94;
  }
  game.particles = game.particles.filter((pt) => pt.age < pt.life);
  capArray(game.particles, CFG.limits.particles);
}

function playerHit(game) {
  const p = game.player;
  game.lives--;
  loseLastPart(game); // 마지막 얻은 파츠 1개 손실(역순)
  p.inv = CFG.player.invAfterHit;
  burst(game, p.x, p.y, COLORS.playerHitSpark, 18);
  game.sfx.push('playerhit');
  if (game.lives <= 0) game.events.push({ type: 'gameover' });
}

function grabItem(game, kind) {
  if (kind === 'P') {
    if (gainFront(game)) game.sfx.push('power');
  } else if (kind === 'S') {
    if (gainOption(game)) game.sfx.push('power');
  } else if (kind === 'E') {
    if (gainZone(game)) game.sfx.push('power');
  } else if (kind === 'H') {
    game.lives = Math.min(CFG.player.maxLives, game.lives + 1);
    game.sfx.push('power');
  } else if (kind === 'B') {
    for (const e of game.enemies) { burst(game, e.x, e.y, e.color, 12); game.score += e.score; }
    game.enemies = [];
    game.eBullets = [];
    if (game.boss && !game.boss.entering) {
      game.boss.hp -= Math.ceil(game.boss.maxHp * 0.15);
      if (game.boss.hp <= 0) defeatBoss(game);
    }
    game.sfx.push('bomb');
  }
}

function checkCollisions(game, W, H) {
  const p = game.player;

  // 아군 탄 vs 적
  for (const b of game.bullets) {
    if (b.dead) continue;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (hit(b, e)) {
        // 방패병: 정면(아래에서 위로 오는) 기본탄·레이저는 막힌다. 유도 미사일만 관통한다.
        if (e.type === 'shielder' && e.shielded && b.kind !== 'missile' && b.y > e.y) {
          b.dead = true;
          burst(game, b.x, b.y, COLORS.enemy.shielderShield, 3);
          break;
        }
        b.dead = true;
        e.hp -= b.dmg;
        burst(game, b.x, b.y, e.color, 4);
        if (e.hp <= 0) {
          e.dead = true;
          game.score += e.score;
          burst(game, e.x, e.y, e.color, 14);
          if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount); // 보너스 기체만 드롭
          if (e.type === 'splitter') spawnShards(game, e.x, e.y); // 분열체는 조각으로 쪼개짐
          game.sfx.push('explode');
        } else {
          game.sfx.push('hit');
        }
        break;
      }
    }
    if (!b.dead && game.boss && !game.boss.entering && hit(b, game.boss)) {
      b.dead = true;
      game.boss.hp -= b.dmg;
      burst(game, b.x, b.y, COLORS.hitSpark, 4);
      if (game.boss.hp <= 0) defeatBoss(game);
    }
  }
  game.bullets = game.bullets.filter((b) => !b.dead);
  game.enemies = game.enemies.filter((e) => !e.dead);

  if (p.inv > 0) return; // 무적 중 피격 판정 생략

  for (const e of game.enemies) {
    if (hit(p, e)) { playerHit(game); return; }
  }
  if (game.boss && !game.boss.entering && hit(p, game.boss)) { playerHit(game); return; }
  for (const b of game.eBullets) {
    if (hit(p, b)) { b.dead = true; playerHit(game); break; }
  }
  game.eBullets = game.eBullets.filter((b) => !b.dead);

  for (const it of game.powerups) {
    if (it.dead) continue;
    if (hit(p, it)) { it.dead = true; grabItem(game, it.kind); }
  }
  game.powerups = game.powerups.filter((it) => !it.dead);
}

function defeatBoss(game) {
  const boss = game.boss;
  game.score += boss.score;
  burst(game, boss.x, boss.y, COLORS.hitSpark, 40);
  burst(game, boss.x - 20, boss.y - 10, COLORS.clearSpark, 30);
  const wasFinal = boss.kind === 'final';
  dropItems(game, boss.x, boss.y, wasFinal ? CFG.bossDrop.final : CFG.bossDrop.mini); // 보스 격파 확정 드롭
  game.boss = null;
  game.bossPending = false;
  game.transitioning = true; // 전환 대기(다음 구역 준비 전 재소환 차단)
  game.enemies = [];
  game.eBullets = [];
  game.events.push({ type: 'boss-clear' });
  game.sfx.push('bossdown');

  if (wasFinal) {
    game.winTimer = 0.9;
  } else {
    game.sfx.push('stageclear');
    game.events.push({ type: 'banner', big: '구역 클리어', sub: `구역 ${game.stage + 1}로`, dur: 2.0 });
    game.transitionTimer = 1.9;
  }
}

export function startStage(game) {
  game.waves = buildWaves(game.stage);
  game.waveIdx = 0;
  game.elapsed = 0;
  game.bossPending = false;
  game.transitioning = false; // 새 구역 웨이브 준비 완료 → 진행 판정 재개
  game.pendingTimer = null;
  game.introTimer = CFG.stageIntro; // 구역 시작 배너 표시 동안 적 스폰 정지
  game.events.push({ type: 'banner', big: `구역 ${game.stage}`, sub: stageName(game.stage), dur: CFG.stageIntro });
}

function nextStage(game) {
  game.stage++;
  startStage(game); // 화력·목숨·점수는 유지(초기화는 main의 resetGame에서만)
}

function checkProgress(game, dt, W, H) {
  if (game.transitioning) {
    if (game.transitionTimer != null) {
      game.transitionTimer -= dt;
      if (game.transitionTimer <= 0) { game.transitionTimer = null; nextStage(game); }
    }
    if (game.winTimer != null) {
      game.winTimer -= dt;
      if (game.winTimer <= 0) { game.winTimer = null; game.events.push({ type: 'win' }); }
    }
    return;
  }
  if (game.pendingTimer != null) {
    game.pendingTimer -= dt;
    if (game.pendingTimer <= 0) { game.pendingTimer = null; spawnBoss(game, W, H); }
    return;
  }
  if (!game.boss && !game.bossPending &&
      game.waveIdx >= game.waves.length && game.enemies.length === 0) {
    game.bossPending = true;
    const label = game.stage >= CFG.stageCount ? '최종 보스 접근' : '중보스 접근';
    game.events.push({ type: 'banner', big: '경고', sub: label, dur: 1.6 });
    game.pendingTimer = 1.4;
  }
}

export function stepWorld(game, dt, W, H) {
  // 구역 시작 인트로(다음 구역 배너 표시) 중: 적 스폰·웨이브 진행 정지, 화면 요소만 갱신.
  if (game.introTimer > 0) {
    game.introTimer -= dt;
    if (game.player.inv > 0) game.player.inv -= dt;
    updateStars(game, dt, W, H);
    stepOptions(game, dt, false); // 인트로 중 옵션기는 위치만 따라가고 발사는 쉼
    homeMissiles(game, dt);
    updateBullets(game, dt, W, H);
    updateParticles(game, dt);
    return;
  }
  game.elapsed += dt;
  if (game.player.inv > 0) game.player.inv -= dt;
  updateStars(game, dt, W, H);
  game.fireTimer -= dt;
  if (game.fireTimer <= 0) {
    game.fireTimer = CFG.player.fireEvery;
    playerFire(game);
  }
  stepOptions(game, dt, !game.transitioning); // 옵션기 추종 + 발사(보스 클리어 후 전환 대기 중엔 발사 쉼)
  spawnWaves(game, W);
  game.bonusTimer -= dt;           // 보너스 기체 주기 등장(파워업 공급원)
  if (game.bonusTimer <= 0) { game.bonusTimer = CFG.bonusShip.every; spawnBonus(game, W, H); }
  updateEnemies(game, dt, W, H);
  updateBoss(game, dt, W, H);
  homeMissiles(game, dt);          // 미사일 유도(표적 최신 위치 기준)
  updateBullets(game, dt, W, H);
  updateEnemyBullets(game, dt, W, H);
  updatePowerups(game, dt, W, H);
  updateParticles(game, dt);
  tickZone(game, dt);              // 에너지존 주기 피해(적 hp 선차감)
  checkCollisions(game, W, H);
  // 존/봄 등 총알 외 피해로 보스 hp<=0 되어도 일괄 격파 판정.
  if (game.boss && !game.boss.entering && game.boss.hp <= 0) defeatBoss(game);
  checkProgress(game, dt, W, H);
}
