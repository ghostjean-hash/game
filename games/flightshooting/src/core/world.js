// 게임 월드 갱신 오케스트레이터 (순수). DOM/Canvas/오디오 미의존.
// 부수효과는 game.sfx(사운드 이름)와 game.events(화면 전환 신호)에만 담아 main이 소비한다.
// 화면 전환 지연은 setTimeout이 아니라 dt 기반 타이머라 일시정지에도 안전하다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { COUNTRIES } from '../data/countries.js';
import { playerFire, enemyFireAt } from './fire.js';
import { stepOptions, stepTail, homeMissiles, tickZone, gainFront, gainOption, gainZone, gainTail, loseLastPart } from './parts.js';
import { stepFriend, friendTakeHit, gainFriendLevel, reviveFriend, notifyFriendKill } from './friend.js';
import { updateStars } from './stars.js';
import { buildWaves, stageName } from './waves.js';
import { spawnEnemy, spawnBoss, spawnBonus, spawnShards, spawnWispChild, dropItems, dropMaybe, burst, fieldBounds, syncBossParts, scaledHp } from './spawn.js';
import { awardScore, isAutoControlling } from './score.js';

export function hit(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const rr = (a.r || a.rx) + (b.r || b.rx);
  return dx * dx + dy * dy <= rr * rr;
}

// 보통 난이도의 초반 연발 제한처럼, 난이도별로 지정된 구역까지만 조준 탄 수를 줄인다.
function enemyShotCap(game) {
  const early = game.earlyShots;
  return early && game.stage <= early.throughStage ? early.max : (game.enemyShotsMax || 99);
}

// 점 p와 선분 a-b 사이 최단 거리(코일 아크 선 피격 판정용).
export function distToSegment(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const len2 = abx * abx + aby * aby || 1;
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t, cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
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

function summonCityAlly(game, cityName, W, H) {
  if (game.cityAlly) return;
  const G = CFG.cityGuard;
  game.cityAlly = { cityName, x: W * 0.23, y: H * 0.77, r: G.r, hp: G.allyHp, maxHp: G.allyHp, inv: 0, beamTimer: 0.18, beamTarget: null, msg: `난 ${cityName} 도시의 수호자야! 널 도울게 친구!`, msgTimer: 3.2 };
}

function summonCityRival(game, cityName, W) {
  if (game.enemies.some((e) => e.cityRole === 'rival' && e.cityName === cityName)) return;
  const G = CFG.cityGuard;
  const left = Math.max(G.r + 24, W * 0.2), right = Math.min(W - G.r - 24, W * 0.8);
  const hp = scaledHp(G.hp, game.stage || 1, game.enemyHpMul || 1);
  game.enemies.push({ type: 'city-rival', cityRole: 'rival', cityName, x: left, rivalLeft: left, rivalRight: right, rivalDirection: 1, rivalLegs: 0, y: G.r + 24,
    r: G.r, hp, maxHp: hp, speed: G.speed, score: 0, color: '#ff6f76', t: 0, fireTimer: 1.1, msg: `난 ${cityName} 도시의 수호자야! 쉽게 못 지나가!`, msgTimer: 3.2 });
}

function nearestCityGuardTarget(game, x, y) {
  let target = null, best = Infinity;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < best) { best = d; target = e; }
  }
  if (game.boss && !game.boss.entering) {
    const d = (game.boss.x - x) ** 2 + (game.boss.y - y) ** 2;
    if (d < best) target = game.boss;
  }
  return target;
}

function stepCityAlly(game, dt, W, H) {
  const a = game.cityAlly;
  if (!a) return;
  const G = CFG.cityGuard;
  a.msgTimer = Math.max(0, a.msgTimer - dt);
  a.inv = Math.max(0, a.inv - dt);
  if (a.farewell) {
    // 격파 즉시 작별을 말하고, 지도 전환 전까지 북쪽으로 빠르게 퇴장한다.
    a.y -= G.farewellSpeed * dt;
    a.beamTarget = null;
    return;
  }
  const tx = Math.max(a.r, Math.min(W - a.r, game.player.x - 78));
  const ty = Math.max(H * 0.56, game.player.y + 15);
  a.x += (tx - a.x) * Math.min(1, dt * 3); a.y += (ty - a.y) * Math.min(1, dt * 3);
  a.beamTarget = nearestCityGuardTarget(game, a.x, a.y);
  a.beamTimer -= dt;
  while (a.beamTarget && a.beamTimer <= 0) {
    // 화면에서는 계속 이어지는 선이지만, 판정은 짧은 간격의 고정 타격으로 처리한다.
    game.bullets.push({ x: a.beamTarget.x, y: a.beamTarget.y, vx: 0, vy: 0, r: 6, dmg: G.guideDmg, kind: 'cityGuide' });
    a.beamTimer += G.guideTick;
  }
}

// 기뢰 자폭: 중심에서 사방으로 파편 탄막을 방사한다(정면 돌파를 벌한다).
function detonateMine(game, e) {
  const m = CFG.enemy.mine;
  burst(game, e.x, e.y, COLORS.enemy.mineCore, 16);
  const shards = Math.max(3, Math.round(m.shards * (game.radialMul || 1))); // 어린이 모드는 파편 수 감축(최소 3)
  for (let i = 0; i < shards; i++) {
    const a = (i / shards) * Math.PI * 2;
    game.eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * m.shardSpeed, vy: Math.sin(a) * m.shardSpeed, r: CFG.enemyBullet.r });
  }
  game.sfx.push('explode');
}

// 결정체 반사: 피격당할 때마다 사방으로 반사탄 몇 발을 튕긴다(함부로 못 쏘게).
function reflectPrism(game, e) {
  const pr = CFG.enemy.prism;
  const reflect = Math.max(1, Math.round(pr.reflect * (game.radialMul || 1))); // 어린이 모드는 반사탄 수 감축(최소 1)
  for (let i = 0; i < reflect; i++) {
    const a = Math.random() * Math.PI * 2;
    game.eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * pr.reflectSpeed, vy: Math.sin(a) * pr.reflectSpeed, r: CFG.enemyBullet.r });
  }
  game.sfx.push('hit');
}

export function updateEnemies(game, dt, W, H) {
  const p = game.player;
  const early = CFG.earlyStageFireMul;
  const growthMul = game.stage === early.stage
    ? (game.front <= 1 ? early.front1 : game.front === 2 ? early.front2 : early.front3Plus)
    : 1;
  const mul = (game.enemyFireMul || 1) * growthMul; // 1구역은 아이템으로 성장하기 전 적탄을 크게 늦춘다.
  const shotsCap = enemyShotCap(game); // 난이도별 초반 조준 연발 상한
  const wispSpawns = []; // 도깨비불 분열은 루프 중 game.enemies를 늘리지 않도록 모았다가 루프 후 생성
  for (const e of game.enemies) {
    e.t += dt;
    if (e.cityRole === 'rival') {
      if (e.rivalLegs < CFG.cityGuard.rivalSweeps * 2) {
        e.x += e.rivalDirection * CFG.cityGuard.rivalSweepSpeed * dt;
        const reached = e.rivalDirection > 0 ? e.x >= e.rivalRight : e.x <= e.rivalLeft;
        if (reached) {
          e.x = e.rivalDirection > 0 ? e.rivalRight : e.rivalLeft;
          e.rivalDirection *= -1;
          e.rivalLegs++;
        }
      } else {
        e.y += e.speed * dt;
      }
      e.msgTimer = Math.max(0, e.msgTimer - dt);
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.rivalLegs >= CFG.cityGuard.rivalSweeps * 2) { e.fireTimer += CFG.cityGuard.rivalFireEvery; enemyFireAt(game, e, p.x, p.y, CFG.cityGuard.rivalShotSpeed); }
      continue;
    }
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
    if (e.type === 'mine') {
      e.y += e.speed * dt; // 느리게 표류
      const dx = p.x - e.x, dy = p.y - e.y, tr = CFG.enemy.mine.trigger;
      if (e.y > 0 && dx * dx + dy * dy <= tr * tr) { detonateMine(game, e); e.dead = true; } // 근접 자폭
      continue;
    }
    if (e.type === 'warper') {
      e.vuln = Math.max(0, e.vuln - dt); // 이동 직후 취약 시간 감소(시각 표시용)
      e.warpTimer -= dt;
      if (e.warpTimer <= 0) {
        const wp = CFG.enemy.warper;
        e.warpTimer = wp.warpEvery;
        e.y += wp.warpDown; // 아래로 순간이동
        const fb = fieldBounds(W); // 순간이동도 출현 영역(플레이필드) 안에 가둔다
        e.x = Math.max(fb.left + e.r + 6, Math.min(fb.right - e.r - 6, e.x + (Math.random() - 0.5) * 2 * wp.warpJitter));
        e.vuln = wp.vulnerable;
        burst(game, e.x, e.y, COLORS.enemy.warper, 5);
      }
      continue;
    }
    if (e.type === 'coil') {
      e.y += e.speed * dt; // 노드 쌍은 x 고정으로 나란히 하강(아크 선은 view/충돌이 판정)
      continue;
    }
    if (e.type === 'serpent') {
      const sp = CFG.enemy.serpent;
      if (e.seg === 'head') {
        e.y += e.speed * dt;
        e.x = e.baseX + Math.sin(e.t * sp.freq) * sp.amp; // 머리가 사인파로 구불거리며 하강
      } else {
        // 몸통 마디: 앞 개체(order 1=머리, 그 외=order-1 마디)를 지연 추종해 뱀처럼 이어진다.
        const lead = e.order === 1 ? e.head : e.head.body[e.order - 2];
        const k = Math.min(1, sp.segFollow * dt);
        e.x += (lead.x - e.x) * k;
        e.y += (lead.y + sp.segGap - e.y) * k;
      }
      continue;
    }
    if (e.type === 'wisp') {
      // 도깨비불: 지그재그(사인)로 부유 하강하며 splitEvery마다 작은 자식을 낳는다(splitMax까지).
      e.y += e.speed * dt;
      e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
      e.splitTimer -= dt;
      if (e.splitTimer <= 0 && e.splits < CFG.enemy.wisp.splitMax && e.y > 0 && e.y < H * 0.7) {
        e.splitTimer = CFG.enemy.wisp.splitEvery;
        e.splits++;
        wispSpawns.push({ x: e.x, y: e.y });
      }
      continue;
    }
    if (e.type === 'jelly') {
      // 빛해파리: 느리게 하강 + 좌우로 부드럽게 유영. 발사 없음(접촉 피해만).
      e.y += e.speed * dt;
      e.x = e.baseX + Math.sin(e.t * CFG.enemy.jelly.sway) * CFG.enemy.jelly.swayAmp;
      continue;
    }
    if (e.type === 'bloom') {
      // 빛꽃: 하강 → 멈춰 방사형 '개화' → 다시 하강을 반복. 꽃잎(탄) 수는 radialMul(쉬움 감축) 반영.
      const bl = CFG.enemy.bloom;
      e.bloomTimer -= dt;
      if (!e.blooming) {
        e.y += e.speed * dt;
        if (e.bloomTimer <= 0 && e.y > 20) {
          e.blooming = true;
          e.bloomTimer = bl.holdTime;
          const n = Math.max(3, Math.round(bl.petals * (game.radialMul || 1)));
          const off = Math.random() * Math.PI * 2;
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * Math.PI * 2;
            game.eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * bl.petalSpeed, vy: Math.sin(a) * bl.petalSpeed, r: CFG.enemyBullet.r });
          }
          game.sfx.push('hit');
        }
      } else if (e.bloomTimer <= 0) {
        e.blooming = false;
        e.bloomTimer = bl.bloomEvery * mul; // 재개화까지 하강(난이도 배수로 개화 빈도 조절)
      }
      continue;
    }
    if (e.type === 'whale') {
      // 빛고래: 크고 느린 유영체 - 좌우 곡선 유영 + 하강, 가끔 조준 3연발(어린이 모드는 정중앙 단발).
      const wh = CFG.enemy.whale;
      e.y += e.speed * dt;
      e.x = e.baseX + Math.sin(e.t * wh.driftFreq) * wh.driftAmp;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = wh.fireEvery * mul;
        const n = Math.min(wh.shots, shotsCap);
        for (let i = 0; i < n; i++) enemyFireAt(game, e, p.x + (i - (n - 1) / 2) * wh.spread, p.y);
      }
      continue;
    }
    e.y += e.speed * dt;
    if (e.type === 'weaver') {
      e.x = e.baseX + Math.sin(e.t * CFG.enemy.weaver.freq) * CFG.enemy.weaver.amp;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.weaver.fireEvery * mul;
        enemyFireAt(game, e, p.x, p.y); // weaver 단발 조준
      }
    } else if (e.type === 'gunner') {
      e.x += Math.sign(p.x - e.x) * 40 * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.gunner.fireEvery * mul;
        const g = CFG.enemy.gunner; // 3발 확산 조준(어린이 모드는 정중앙 단발)
        const n = Math.min(g.shots, shotsCap);
        for (let i = 0; i < n; i++) enemyFireAt(game, e, p.x + (i - (n - 1) / 2) * g.spread, p.y);
      }
    } else if (e.type === 'shielder') {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.shielder.fireEvery * mul;
        enemyFireAt(game, e, p.x, p.y); // 방패병 단발 조준
      }
    } else if (e.type === 'turret') {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 20) {
        e.fireTimer = CFG.enemy.turret.fireEvery * mul;
        const tr = CFG.enemy.turret; // 포대 3방향 조준 연사(어린이 모드는 정중앙 단발)
        const n = Math.min(tr.shots, shotsCap);
        for (let i = 0; i < n; i++) enemyFireAt(game, e, p.x + (i - (n - 1) / 2) * tr.spread, p.y);
      }
    }
  }
  for (const s of wispSpawns) { spawnWispChild(game, s.x, s.y); burst(game, s.x, s.y, COLORS.enemy.wispGlow, 5); game.sfx.push('hit'); }
  // 세로로 지나간 것 + 보너스 기체가 가로로 화면을 벗어난 것 제거.
  retain(game.enemies, (e) => e.y < H + e.r + 20 && e.x > -e.r - 40 && e.x < W + e.r + 40);
}

// 부위/코어 위치(src {x,y})에서 패턴 발사. shotsCap = 어린이 모드 조준 연발 상한.
function bossFire(game, src, pattern, shotsCap, speedMul = 1) {
  const p = game.player;
  const speed = CFG.enemyBullet.speed * speedMul;
  if (pattern === 'fan') {                       // 아래 방향 부채 산탄
    const base = Math.PI / 2, spread = 1.0, n = 6;
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + (spread * i) / (n - 1);
      game.eBullets.push({ x: src.x, y: src.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: CFG.enemyBullet.r });
    }
  } else if (pattern === 'aim3') {               // 조준 3연발(어린이 모드는 정중앙 단발)
    const n = Math.min(3, shotsCap);
    for (let i = 0; i < n; i++) enemyFireAt(game, src, p.x + (i - (n - 1) / 2) * 18, p.y, speed);
  } else if (pattern === 'ring') {               // 사방 원형 방사
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      game.eBullets.push({ x: src.x, y: src.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: CFG.enemyBullet.r });
    }
  }
}

// 코어 피해(부위 뒤 본체). 0이면 격파.
function damageCore(game, dmg) {
  game.boss.core.hitFlash = CFG.boss.partHitFlash;
  game.boss.core.hp -= dmg;
  if (game.boss.core.hp <= 0) defeatBoss(game);
}

// 부위 파괴: 점수 + 잔해, shield가 다 없어지면 코어 노출.
function destroyPart(game, part) {
  const boss = game.boss;
  const st = CFG.bossStyles[boss.style];
  part.dead = true;
  part.destroyAge = 0;
  awardScore(game, st.partScore);
  burst(game, part.x, part.y, COLORS.boss.partDebris, 16);
  game.sfx.push('explode');
  if (!boss.core.exposed && boss.parts.every((p) => p.role !== 'shield' || p.dead)) {
    boss.core.exposed = true; // 방어구 전멸 → 코어 노출
    game.sfx.push('bossdown');
  }
}

export function updateBoss(game, dt, W, H) {
  const boss = game.boss;
  if (!boss) return;
  if (boss.dying) { stepBossDeath(game, boss, dt); return; } // 사망 연출 중엔 보스 로직 정지
  const st = CFG.bossStyles[boss.style];
  const mul = game.enemyFireMul || 1;          // 어린이 모드 발사 간격 배수
  const shotsCap = enemyShotCap(game);         // 난이도별 초반 조준 연발 상한
  boss.t += dt;
  boss.core.hitFlash = Math.max(0, (boss.core.hitFlash || 0) - dt);
  // 부위 연출 타이머는 판정과 분리한다. dead 부위도 destroyAge를 유지해 파괴 흔적의 불꽃만 감쇠한다.
  for (const part of boss.parts) {
    part.hitFlash = Math.max(0, (part.hitFlash || 0) - dt);
    if (part.dead) part.destroyAge = (part.destroyAge || 0) + dt;
  }
  if (boss.entering) {
    boss.y += 90 * dt;
    // 등장 중엔 좌우 유영을 멈추고 중앙(W/2)에 고정한다. 등장 완료 순간 bob 시각을 0으로 리셋해야
    //   sin(0)=0 → 중앙에서 부드럽게 유영을 시작한다(리셋 없으면 x가 중앙에서 갑자기 튄다).
    boss.x = W / 2;
    if (boss.y >= boss.targetY) { boss.y = boss.targetY; boss.entering = false; boss.t = 0; boss.bobPhase = 0; }
    syncBossParts(boss);
    return;
  }
  // 좌우 유영: 등장 직후엔 매우 느리고 bobRamp초에 걸쳐 최대 속도(bobFreq)까지 빨라진다(사용자 지시).
  //   위상을 직접 누적해(속도를 시간에 따라 키워도) 매끄럽게 흔들리게 한다. 진폭(이동 폭)은 그대로.
  const rampK = Math.min(1, boss.t / CFG.boss.bobRamp);
  boss.bobPhase = (boss.bobPhase || 0) + CFG.boss.bobFreq * Math.PI * rampK * dt;
  boss.x = W / 2 + Math.sin(boss.bobPhase) * (W * CFG.boss.bobAmp * 0.5);
  if (st.orbitR) boss.orbitAngle += st.orbitSpeed * dt; // 위성형 실드 회전
  syncBossParts(boss);

  // 광폭화(sentinel): 부순 weapon 수만큼 남은 weapon 발사 주기를 단축한다.
  let deadWeapons = 0;
  if (st.enrage) for (const pt of boss.parts) if (pt.dead && pt.role === 'weapon') deadWeapons++;
  const enrageMul = st.enrage ? Math.pow(st.enrage, deadWeapons) : 1;

  // 살아있는 weapon 부위가 각자 패턴 발사.
  for (const part of boss.parts) {
    if (part.dead || part.role !== 'weapon') continue;
    part.fireTimer -= dt;
    if (part.fireTimer <= 0) {
      part.fireTimer = part.fireEvery * mul * enrageMul;
      bossFire(game, part, part.pattern, shotsCap);
    }
  }
  // 코어 자체 공격(노출 + corePattern 있을 때).
  if (boss.core.exposed && st.corePattern) {
    boss.coreTimer -= dt;
    if (boss.coreTimer <= 0) {
      boss.coreTimer = (boss.coreEvery || st.coreEvery) * mul; // 강화판은 spawnBoss가 단축해 저장
      bossFire(game, boss, st.corePattern, shotsCap);
    }
  }
  // 호위 소환(중보스만).
  if (boss.kind === 'mini') {
    boss.escortTimer -= dt;
    if (boss.escortTimer <= 0) {
      boss.escortTimer = CFG.miniBoss.escortEvery;
      const pool = boss.style === 'orbiter' ? ['turret', 'prism'] : ['drone', 'weaver'];
      spawnEnemy(game, pool[Math.floor(Math.random() * pool.length)], 0.15 + Math.random() * 0.7, W);
    }
  }
}

// 배열이 상한을 넘으면 오래된 것부터 제거(발열/성능 방어).
function capArray(arr, lim) {
  if (arr.length > lim) arr.splice(0, arr.length - lim);
}

// 총알 상한 적용(미사일 보호판). capArray는 오래된 것부터 자르는데, 유도탄(missile)은 유도하며 오래 생존해
//   상한 초과 시 1순위로 잘려 '가다가 중간에 사라지는' 버그가 있었다(사용자 보고 2026-07-16). 유도탄은 소수라
//   상한 계산에서 제외하고, 초과분은 일반 직진탄(오래된 순)에서만 제거한다.
export function capBullets(game, lim) {
  const arr = game.bullets;
  if (arr.length <= lim) return;
  let excess = arr.length - lim;
  retain(arr, (b) => {
    if (excess > 0 && b.kind !== 'missile') { excess--; return false; } // 오래된 직진탄부터 제거
    return true;                                                        // 유도탄은 항상 보존
  });
}

// keep이 참인 요소만 남기고 배열을 제자리 압축한다(filter의 새 배열 할당 없이 GC 압박 제거).
// 잔존 요소·순서는 filter와 동일하고 배열 참조도 유지된다(매 프레임 재할당 → 0).
function retain(arr, keep) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (keep(v)) arr[w++] = v;
  }
  arr.length = w;
}

function updateBullets(game, dt, W, H) {
  for (const b of game.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  retain(game.bullets, (b) => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);
  capBullets(game, CFG.limits.bullets);
}

function updateEnemyBullets(game, dt, W, H) {
  for (const b of game.eBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  retain(game.eBullets, (b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
  capArray(game.eBullets, CFG.limits.eBullets);
}

function updatePowerups(game, dt, W, H) {
  for (const it of game.powerups) { it.y += it.vy * dt; it.t += dt; }
  retain(game.powerups, (it) => it.y < H + it.r + 10);
}

function addScoreFloat(game, x, y, value, good, big = false) {
  if (!game.scoreFloats) game.scoreFloats = [];
  game.scoreFloats.push({ x, y, value, good, big, age: 0, life: CFG.cityLetters.floatLife });
  capArray(game.scoreFloats, CFG.limits.scoreFloats);
}

function updateScoreFloats(game, dt) {
  if (!game.scoreFloats) return;
  for (const f of game.scoreFloats) { f.age += dt; f.y -= (f.good ? 34 : 20) * dt; }
  retain(game.scoreFloats, (f) => f.age < f.life);
}

function cityDisplayName(country) {
  return country.type === 'travel' ? country.ko : country.cap;
}

// 목표 도시와 지리적으로 가까운 다른 도시 넷을 골라, 클로버 도시 이름 묶음의 방해 요소로 쓴다.
function nearbyCityNames(game, targetName) {
  const here = COUNTRIES[game.tourIdx];
  if (!here) return [];
  const seen = new Set([targetName]);
  return COUNTRIES
    .map((country) => {
      const name = cityDisplayName(country);
      const lon = Math.min(Math.abs(country.lon - here.lon), 360 - Math.abs(country.lon - here.lon));
      const lat = country.lat - here.lat;
      return { name, distance: lon * lon * Math.max(0.2, Math.cos((here.lat * Math.PI) / 180)) + lat * lat };
    })
    .sort((a, b) => a.distance - b.distance)
    .filter(({ name }) => name && !seen.has(name) && (seen.add(name) || true))
    .slice(0, 4)
    .map(({ name }) => name);
}

// 목표 도시 1개와 주변 도시 4개를 대기열로 만든 뒤 하나씩 떨어뜨린다.
function dropCityLetters(game, W) {
  const targetName = game.cityWord || '';
  if (!targetName) return;
  if (!game.cityLetterQueue) game.cityLetterQueue = [];
  if (!game.cityLetterQueue.length && game.cityDropBursts < CFG.cityLetters.bursts) {
    const items = [{ cityName: targetName, answer: true }]
      .concat(nearbyCityNames(game, targetName).map((cityName) => ({ cityName, answer: false })));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]];
    }
    game.cityLetterQueue.push(...items);
    game.cityDropBursts++;
  }
  const collected = game.cityCollectedLetters || new Set();
  let item = null;
  while (game.cityLetterQueue.length && !item) {
    const next = game.cityLetterQueue.shift();
    if (!collected.has(next.cityName)) item = next;
  }
  if (!item) return;
  game.powerups.push({ x: Math.max(18, Math.min(W - 18, W * (0.18 + Math.random() * 0.64))), y: -22 - Math.random() * 90,
    vy: CFG.cityLetters.fallSpeed, r: 13, t: 0, kind: 'letter', ...item });
}

// 목표 단어 완성 뒤에는 남아 있던 정답·함정도 즉시 정리한다. 이미 완료한 글자로 점수를 더 얻거나
// 화면에 불필요한 선택지를 남기지 않으며, 다음 묶음 타이머도 함께 멈춘다.
function finishCityLetters(game) {
  for (const item of game.powerups) {
    if (item.kind === 'letter') item.dead = true;
  }
  game.cityDropBursts = CFG.cityLetters.bursts;
  game.cityLetterQueue = [];
  game.cityDropTimer = Infinity;
}

export function updateParticles(game, dt) {
  for (const pt of game.particles) {
    pt.age += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.94; pt.vy *= 0.94;
  }
  retain(game.particles, (pt) => pt.age < pt.life);
  capArray(game.particles, CFG.limits.particles);
}

function playerHit(game) {
  const p = game.player;
  game.lives--;
  loseLastPart(game); // 마지막 얻은 파츠 1개 손실(역순)
  p.inv = CFG.player.invAfterHit;
  burst(game, p.x, p.y, COLORS.playerHitSpark, 18);
  game.sfx.push('playerhit');
  if (game.lives <= 0) {
    // 죽음: 큰 폭발 연출을 남기고 'death' 신호만 보낸다. 팝업은 main이 연출(deathTime) 뒤에 띄운다.
    p.dead = true; p.emo = null;
    burst(game, p.x, p.y, COLORS.player, 30);
    burst(game, p.x, p.y, COLORS.playerCore, 22);
    game.events.push({ type: 'death' });
  } else {
    p.emo = 'cry'; p.emoT = CFG.emote.cry; // 맞았을 때 우는 표정(죽지 않았을 때만)
  }
}

// 아이템 획득 성공 시 나(+살아있는 친구)가 잠깐 웃는 표정.
function setHappy(game) {
  const p = game.player; if (p) { p.emo = 'happy'; p.emoT = CFG.emote.happy; }
  const f = game.friend; if (f && !f.down) { f.emo = 'happy'; f.emoT = CFG.emote.happy; }
}

function grabItem(game, kind, item) {
  // 이미 최대치라 강화가 무의미하면 점수 보너스로 전환(수집 보람 유지).
  const maxed = () => { awardScore(game, CFG.maxedBonus); game.sfx.push('power'); };
  const f = game.friend; // 어린이 모드 친구(있으면 아이템·회복 공유, docs/09)
  if (kind === 'letter') {
    const slots = game.citySlots || [];
    if (!game.cityCollectedLetters) game.cityCollectedLetters = new Set();
    const itemName = item.cityName || item.letter;
    const isWholeCityItem = !!item.cityName;
    // 아이템의 생성 플래그가 아니라 현재 목표 글자 자체로 판정한다. 따라서 같은 '도'는 언제나 정답이다.
    const isTargetLetter = isWholeCityItem ? item.cityName === game.cityWord : slots.some((slot) => slot.letter === item.letter);
    const idx = isTargetLetter ? slots.findIndex((slot) => slot.letter === item.letter && !slot.filled) : -1;
    if (isTargetLetter) {
      if (isWholeCityItem) for (const slot of slots) slot.filled = true;
      else if (idx >= 0) for (const slot of slots) if (slot.letter === item.letter) slot.filled = true;
      game.cityCollectedLetters.add(itemName);
      for (const other of game.powerups) if (other.kind === 'letter' && (other.cityName || other.letter) === itemName) other.dead = true;
      if (CFG.cityLetters.correctScore > 0) {
        awardScore(game, CFG.cityLetters.correctScore);
        addScoreFloat(game, item.x, item.y, `+${CFG.cityLetters.correctScore}`, true);
      }
      if (!game.cityComplete && slots.length && slots.every((slot) => slot.filled)) {
        game.cityComplete = true;
        summonCityAlly(game, item.cityName || game.cityWord || item.letter, game.fieldW || 500, game.fieldH || 900);
        finishCityLetters(game);
      }
      game.sfx.push('power'); setHappy(game);
    } else {
      game.cityCollectedLetters.add(itemName);
      for (const other of game.powerups) if (other.kind === 'letter' && (other.cityName || other.letter) === itemName) other.dead = true;
      summonCityRival(game, itemName, game.fieldW || 500);
      game.sfx.push('hit');
    }
    return;
  }
  if (kind === 'H') {
    // 회복 공유: 친구가 기절했으면 부활, 아니면 나·친구 각각 hp 회복(상한 내).
    let healed = false;
    if (f && f.down) { reviveFriend(game); healed = true; }
    if (game.lives < (game.maxLives || CFG.player.maxLives)) { game.lives++; healed = true; }
    if (f && !f.down && f.hp < f.maxHp) { f.hp++; healed = true; }
    if (healed) { game.sfx.push('power'); setHappy(game); } else maxed();
    return;
  }
  if (kind === 'P' || kind === 'S' || kind === 'E' || kind === 'T') {
    // 아이템 공유: 누가 먹든 내 계통 + 친구 메인이 함께 오른다(서로서로 강화).
    let gained = false;
    if (kind === 'P') gained = gainFront(game);
    else if (kind === 'S') gained = gainOption(game);
    else if (kind === 'E') gained = gainZone(game);
    else if (kind === 'T') gained = gainTail(game);
    if (f && gainFriendLevel(game)) gained = true; // 어린이 모드: 아무 파츠나 친구 메인도 성장
    if (gained) { game.sfx.push('power'); setHappy(game); } else maxed();
    return;
  }
  if (kind === 'B') {
    for (const e of game.enemies) {
      burst(game, e.x, e.y, e.color, 12);
      awardScore(game, e.score);
      notifyFriendKill(game); // 어린이 모드: 연속 처치 칭찬 신호(친구 없으면 무시)
      // 봄으로 죽어도 보너스 기체는 파워업 확정 드롭(잡몹은 드롭 없음 - 봄이 과해지지 않게).
      if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount);
    }
    game.enemies = [];
    game.eBullets = [];
    if (game.boss && !game.boss.entering) {
      damageCore(game, Math.ceil(game.boss.core.maxHp * 0.15)); // 봄은 코어 직격(가림 무시)
    }
    game.bombFlash = CFG.bombFlash; // 화면 전체 은은한 폭발 섬광(view가 소비)
    setHappy(game);
    game.sfx.push('bomb');
  }
}

export function checkCollisions(game, W, H) {
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
        // 기계 뱀 몸통은 무적: 아군탄을 막고 튕긴다(머리만 약점).
        if (e.type === 'serpent' && e.seg === 'body') {
          b.dead = true;
          burst(game, b.x, b.y, e.color, 3);
          break;
        }
        b.dead = true;
        e.hp -= b.dmg;
        burst(game, b.x, b.y, e.color, 4);
        if (e.hp <= 0) {
          e.dead = true;
          awardScore(game, e.score);
          notifyFriendKill(game); // 어린이 모드: 연속 처치 칭찬 신호(친구 없으면 무시)
          burst(game, e.x, e.y, e.color, 14);
          if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount); // 보너스 기체 확정 드롭
          else if (!e.cityRole) dropMaybe(game, e.x, e.y); // 도시 라이벌은 보상 드롭 없이 짧은 조우로 끝낸다.
          if (e.type === 'splitter') spawnShards(game, e.x, e.y); // 분열체는 조각으로 쪼개짐
          if (e.type === 'serpent') for (const s of e.body) s.dead = true; // 머리 격파 = 몸통 전멸
          game.sfx.push('explode');
        } else {
          if (e.type === 'prism') reflectPrism(game, e); // 결정체는 피격마다 반사탄
          else game.sfx.push('hit');
        }
        break;
      }
    }
    if (!b.dead && game.boss && !game.boss.entering) {
      const boss = game.boss;
      if (b.kind === 'missile') {
        // 유도탄: 부위 무시하고 코어 직격(가림 관통 - shielder 공략과 일관).
        if (hit(b, boss)) { b.dead = true; damageCore(game, b.dmg); burst(game, b.x, b.y, COLORS.hitSpark, 4); }
      } else {
        // 정면 화력(메인·사이드): 살아있는 부위 우선 → (노출된) 코어. 겹친 1개만 때린다.
        let hp = null;
        for (const part of boss.parts) { if (!part.dead && hit(b, part)) { hp = part; break; } }
        if (hp) {
          b.dead = true;
          hp.hp -= b.dmg;
          hp.hitFlash = CFG.boss.partHitFlash;
          burst(game, b.x, b.y, boss.color, 4);
          if (hp.hp <= 0) destroyPart(game, hp);
        } else if (boss.core.exposed && hit(b, boss)) {
          b.dead = true; damageCore(game, b.dmg); burst(game, b.x, b.y, COLORS.hitSpark, 4);
        }
      }
    }
  }
  retain(game.bullets, (b) => !b.dead);
  retain(game.enemies, (e) => !e.dead);

  // 파워업 획득은 피격 무적(깜박) 중에도 된다 - 피격 판정보다 먼저 처리한다.
  //   어린이 모드: 플레이어 또는 친구가 닿으면 1회 획득(grabItem이 양쪽 공유 강화 처리).
  //   단어는 직접 조작의 선택 요소다. 자동 조종과 키위새가 우연히 스쳐도 먹지 않는다.
  for (const it of game.powerups) {
    if (it.dead) continue;
    const fr = game.friend;
    const playerCanGrab = hit(p, it) && (it.kind !== 'letter' || !isAutoControlling(game));
    const friendCanGrab = it.kind !== 'letter' && fr && !fr.down && hit(fr, it);
    if (playerCanGrab || friendCanGrab) { it.dead = true; grabItem(game, it.kind, it); }
  }
  retain(game.powerups, (it) => !it.dead);

  // 친구 개별 피격(어린이 모드): 플레이어 무적과 독립. 친구가 맞으면 친구 hp만 깎는다(내 목숨 불변).
  //   플레이어 무적으로 아래 return 되기 전에 처리해야 한다. 치트 무적이면 친구도 보호.
  const fr = game.friend;
  if (fr && !fr.down && fr.inv <= 0 && !(game.cheat && game.cheat.invincible)) {
    let hitF = false;
    for (const e of game.enemies) { if (hit(fr, e)) { hitF = true; break; } }
    if (!hitF && game.boss && !game.boss.entering && hit(fr, game.boss)) hitF = true;
    if (!hitF) for (const b of game.eBullets) { if (!b.dead && hit(fr, b)) { b.dead = true; hitF = true; break; } }
    if (hitF) { friendTakeHit(game); retain(game.eBullets, (b) => !b.dead); }
  }

  // 도시 수호자는 키위새처럼 3하트로 버틴다. 맞은 직후 짧은 무적으로 한꺼번에 하트를 잃지 않는다.
  const ally = game.cityAlly;
  if (ally && ally.inv <= 0) {
    let hitAlly = false;
    for (const e of game.enemies) { if (!e.dead && hit(ally, e)) { hitAlly = true; break; } }
    if (!hitAlly) for (const b of game.eBullets) { if (!b.dead && hit(ally, b)) { b.dead = true; hitAlly = true; break; } }
    if (hitAlly) {
      ally.hp--;
      ally.inv = 0.7;
      burst(game, ally.x, ally.y, '#7afff1', 8);
      game.sfx.push(ally.hp > 0 ? 'hit' : 'explode');
      if (ally.hp <= 0) game.cityAlly = null;
      retain(game.eBullets, (b) => !b.dead);
    }
  }

  // 무적 중(피격 깜박) 또는 치트 무적이면 피격 판정 생략(아이템 획득은 위에서 이미 처리).
  if (p.inv > 0 || (game.cheat && game.cheat.invincible)) return;

  // 전격 코일 아크: 두 노드가 다 살아있으면 그 사이 선분에 닿을 때 피해(쌍당 1회, 왼쪽 노드 기준).
  for (const e of game.enemies) {
    if (e.type !== 'coil' || !e.mate || e.mate.dead || e.x > e.mate.x) continue;
    if (distToSegment(p, e, e.mate) <= CFG.enemy.coil.arcThick + p.r) { playerHit(game); return; }
  }
  for (const e of game.enemies) {
    if (hit(p, e)) { playerHit(game); return; }
  }
  if (game.boss && !game.boss.entering && hit(p, game.boss)) { playerHit(game); return; }
  for (const b of game.eBullets) {
    if (hit(p, b)) { b.dead = true; playerHit(game); break; }
  }
  retain(game.eBullets, (b) => !b.dead);
}

function defeatBoss(game) {
  const boss = game.boss;
  // 재진입 가드: 이미 사망 연출 중이면 무시한다. 사망 연출 dur초 동안 보스는 화면에 남고 코어 hp<=0이 유지되어
  //   update의 일괄 격파 판정(존 등)·코어 피격이 매 프레임 이 함수를 다시 부른다. 가드가 없으면 deathT 리셋 +
  //   드롭·점수·폭발이 매 프레임 반복되어 연출이 영원히 끝나지 않는다(무한 폭발·아이템 반복 버그).
  if (boss.dying) return;
  awardScore(game, boss.score);
  const wasFinal = boss.kind === 'final';
  dropItems(game, boss.x, boss.y, wasFinal ? CFG.bossDrop.final : CFG.bossDrop.mini); // 보스 격파 확정 드롭
  game.bossPending = false;
  game.transitioning = true; // 전환 대기(다음 구역 준비 전 재소환 차단)
  game.enemies = [];
  game.eBullets = [];
  game.events.push({ type: 'boss-clear' });
  if (game.cityAlly) {
    game.cityAlly.msg = `또 보자, ${game.cityAlly.cityName} 친구!`;
    game.cityAlly.msgTimer = CFG.cityGuard.farewellDuration;
    game.cityAlly.farewell = true;
    game.cityAlly.beamTarget = null;
    if (!wasFinal && CFG.tour.enabled) game.mapTransitionTimer = CFG.cityGuard.farewellDuration;
  }
  game.sfx.push('bossdown');
  // 보스를 즉시 지우지 않고 '사망 연출' 상태로 둔다. updateBoss가 dur초 동안 몸 전체에서 연쇄 폭발 +
  //   화면 흔들림을 진행하고, 끝에 큰 폭발과 함께 boss=null로 제거하며 다음 흐름(승리/지도/다음 구역)을 튼다.
  boss.dying = true;
  boss.deathT = 0;
  boss.burstT = 0;
  boss.deathDur = wasFinal ? CFG.bossDeath.finalDur : CFG.bossDeath.dur;
  boss.deathFinalBurst = false;
  burst(game, boss.x, boss.y, COLORS.hitSpark, 24, 'bossDeath'); // 첫 폭발
}

// 보스 사망 연출: 주 연쇄 폭발(dur초) → 마지막 폭발 파티클이 전부 사라진 뒤에 다음 화면으로 넘긴다.
// 파티클이 비정상적으로 남으면 maxDur초에 bossDeath 태그만 정리해 전환이 멈추지 않게 한다.
function stepBossDeath(game, boss, dt) {
  const D = CFG.bossDeath;
  const rx = boss.rx || 40, ry = boss.ry || 34;
  boss.deathT += dt;
  if (!boss.deathFinalBurst) {
    game.shake = D.shake * Math.max(0, 1 - boss.deathT / boss.deathDur);
    boss.burstT -= dt;
    if (boss.burstT <= 0 && boss.deathT < boss.deathDur) {
      boss.burstT = D.burstEvery;
      const ex = boss.x + (Math.random() - 0.5) * rx * 2.2;
      const ey = boss.y + (Math.random() - 0.5) * ry * 2.2;
      burst(game, ex, ey, Math.random() < 0.5 ? COLORS.hitSpark : COLORS.clearSpark, D.burstN, 'bossDeath');
      game.bombFlash = Math.max(game.bombFlash || 0, CFG.bombFlash * 0.4);
      game.sfx.push('explode');
    }
    if (boss.deathT < boss.deathDur) return;
    boss.deathFinalBurst = true;
    burst(game, boss.x, boss.y, COLORS.hitSpark, D.finalBurstN, 'bossDeath');
    burst(game, boss.x, boss.y, COLORS.clearSpark, Math.floor(D.finalBurstN * 0.7), 'bossDeath');
    game.bombFlash = CFG.bombFlash;
  }

  game.shake = 0;
  const particlesDone = !game.particles.some((p) => p.tag === 'bossDeath');
  if (!particlesDone && boss.deathT < D.maxDur) return;
  // 보스 사망 직후 나온 어떤 잔상도 다음 화면으로 넘기지 않는다.
  game.particles = [];
  game.bombFlash = 0;
  game.shake = 0;
  // 종료: 폭발 파티클 소멸(또는 2초 안전 종료) 후 보스 제거 + 다음 흐름(승리 / 세계지도 / 다음 구역)
  const wasFinal = boss.kind === 'final';
  game.boss = null;
  if (wasFinal) { game.winTimer = 0.6; }
  else if (CFG.tour.enabled) {
    // 동행 알리콘의 5초 작별·상승 퇴장을 먼저 보장한다. 동행이 없으면 즉시 지도 이동.
    if (game.mapTransitionTimer == null) { game.sfx.push('stageclear'); game.events.push({ type: 'show-map' }); }
  }
  else { game.sfx.push('stageclear'); game.events.push({ type: 'banner', big: '구역 클리어', sub: `구역 ${game.stage + 1}로`, dur: 2.0 }); game.transitionTimer = 1.9; }
}

export function startStage(game) {
  game.waves = buildWaves(game.stage, game.waveMax);
  game.waveIdx = 0;
  game.elapsed = 0;
  game.bossPending = false;
  game.transitioning = false; // 새 구역 웨이브 준비 완료 → 진행 판정 재개
  game.pendingTimer = null;
  game.mapTransitionTimer = null;
  game.introTimer = CFG.stageIntro; // 구역 시작 배너 표시 동안 적 스폰 정지
  // 모든 화면에서 나라 / 목적지 규칙을 고정한다. 여행지는 소속 나라 / 여행지명이다.
  const nation = COUNTRIES[game.tourIdx];
  const destination = nation && nation.type === 'travel' ? nation.ko : nation && nation.cap;
  game.cityWord = CFG.tour.enabled ? (destination || '') : '';
  game.citySlots = [...game.cityWord].filter((ch) => ch.trim()).map((letter) => ({ letter, filled: false }));
  game.cityDropBursts = 0;
  game.cityDropTimer = CFG.cityLetters.firstAfter;
  game.cityLetterQueue = [];
  game.cityCollectedLetters = new Set();
  game.cityComplete = false;
  game.cityAlly = null;
  if (!game.scoreFloats) game.scoreFloats = [];
  // 배너: 여행 중인 나라(윗줄)·목적지(아랫줄)를 점 없이 줄바꿈으로 크게(big), 구역 번호는 작게(sub) 보여준다.
  const place = CFG.tour.enabled ? `${nation.type === 'travel' ? nation.parentCountry : nation.ko}\n${nation.type === 'travel' ? `여행지 ${nation.ko}` : nation.cap}` : stageName(game.stage);
  game.events.push({ type: 'banner', big: place, sub: `구역 ${game.stage}`, dur: CFG.stageIntro });
}

function nextStage(game) {
  game.stage++;
  startStage(game); // 화력·목숨·점수는 유지(초기화는 main의 resetGame에서만)
}

function checkProgress(game, dt, W, H) {
  if (game.transitioning) {
    // 보스 사망 연출(연쇄 폭발·흔들림)과 show-map 트리거는 updateBoss/stepBossDeath가 담당한다.
    if (game.transitionTimer != null) {
      game.transitionTimer -= dt;
      if (game.transitionTimer <= 0) { game.transitionTimer = null; nextStage(game); }
    }
    if (game.winTimer != null) {
      game.winTimer -= dt;
      if (game.winTimer <= 0) { game.winTimer = null; game.events.push({ type: 'win' }); }
    }
    if (game.mapTransitionTimer != null) {
      game.mapTransitionTimer -= dt;
      if (game.mapTransitionTimer <= 0 && !game.boss) {
        game.mapTransitionTimer = null;
        game.sfx.push('stageclear');
        game.events.push({ type: 'show-map' });
      }
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
  game.fieldW = W; game.fieldH = H;
  // 구역 시작 인트로(다음 구역 배너 표시) 중에는 '적 스폰'과 '진행 판정'만 멈추고,
  // 나머지(발사·아이템 이동·획득·탄·존·충돌)는 평소처럼 진행한다(사용자 지시 2026-07-09).
  const intro = game.introTimer > 0;
  if (intro) game.introTimer -= dt; else game.elapsed += dt;
  if (game.player.inv > 0) game.player.inv -= dt;
  if (game.player.emoT > 0) { game.player.emoT -= dt; if (game.player.emoT <= 0) game.player.emo = null; } // 표정 원상복귀
  if (game.bombFlash > 0) game.bombFlash -= dt; // 봄 섬광 감쇠
  updateStars(game, dt, W, H);
  game.fireTimer -= dt;
  if (game.fireTimer <= 0) {
    game.fireTimer = CFG.player.fireEvery;
    playerFire(game);
  }
  stepOptions(game, dt, !game.transitioning); // 옵션기 추종 + 발사(보스 클리어 후 전환 대기 중엔 발사 쉼)
  stepTail(game, dt, !game.transitioning);    // 꼬리 비행기 추종 + 유도탄 발사
  stepFriend(game, dt, W, H, !game.transitioning); // 친구 비행기(어린이 모드) 유영 + 발사
  stepCityAlly(game, dt, W, H);
  if (!intro) {
    spawnWaves(game, W);
    game.bonusTimer -= dt;           // 보너스 기체 주기 등장(파워업 공급원)
    if (game.bonusTimer <= 0) { game.bonusTimer = CFG.bonusShip.every; spawnBonus(game, W, H); }
  }
  updateEnemies(game, dt, W, H);
  updateBoss(game, dt, W, H);
  homeMissiles(game, dt);          // 미사일 유도(표적 최신 위치 기준)
  updateBullets(game, dt, W, H);
  updateEnemyBullets(game, dt, W, H);
  updatePowerups(game, dt, W, H);  // 아이템 이동 - 인트로 중에도 진행
  updateParticles(game, dt);
  updateScoreFloats(game, dt);
  if (!game.cityComplete && (game.cityLetterQueue.length || game.cityDropBursts < CFG.cityLetters.bursts)) {
    game.cityDropTimer -= dt;
    if (game.cityDropTimer <= 0) {
      dropCityLetters(game, W);
      game.cityDropTimer += CFG.cityLetters.every;
    }
  }
  tickZone(game, dt);              // 에너지존 주기 피해(적 hp 선차감)
  checkCollisions(game, W, H);     // 아이템 획득 + 피격 - 인트로 중에도 진행
  // 존 등 총알 외 피해로 코어 hp<=0 되어도 일괄 격파 판정.
  if (game.boss && !game.boss.entering && game.boss.core.hp <= 0) defeatBoss(game);
  if (!intro) checkProgress(game, dt, W, H); // 인트로 중엔 다음 단계로 안 넘어감
}
