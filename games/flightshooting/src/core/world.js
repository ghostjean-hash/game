// 게임 월드 갱신 오케스트레이터 (순수). DOM/Canvas/오디오 미의존.
// 부수효과는 game.sfx(사운드 이름)와 game.events(화면 전환 신호)에만 담아 main이 소비한다.
// 화면 전환 지연은 setTimeout이 아니라 dt 기반 타이머라 일시정지에도 안전하다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { playerFire, enemyFireAt } from './fire.js';
import { stepOptions, stepTail, homeMissiles, tickZone, gainFront, gainOption, gainZone, gainTail, loseLastPart } from './parts.js';
import { stepFriend, friendTakeHit, gainFriendLevel, reviveFriend, notifyFriendKill } from './friend.js';
import { updateStars } from './stars.js';
import { buildWaves, stageName } from './waves.js';
import { spawnEnemy, spawnBoss, spawnBonus, spawnShards, dropItems, dropMaybe, burst, fieldBounds, syncBossParts } from './spawn.js';

export function hit(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const rr = (a.r || a.rx) + (b.r || b.rx);
  return dx * dx + dy * dy <= rr * rr;
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
  const mul = game.enemyFireMul || 1; // 난이도: 어린이 모드면 발사 간격을 늘려 덜 쏘게
  const shotsCap = game.enemyShotsMax || 99; // 난이도: 어린이 모드면 조준 연발을 정중앙 단발로 줄임
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
  game.boss.core.hp -= dmg;
  if (game.boss.core.hp <= 0) defeatBoss(game);
}

// 부위 파괴: 점수 + 잔해, shield가 다 없어지면 코어 노출.
function destroyPart(game, part) {
  const boss = game.boss;
  const st = CFG.bossStyles[boss.style];
  part.dead = true;
  game.score += st.partScore;
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
  const st = CFG.bossStyles[boss.style];
  const mul = game.enemyFireMul || 1;          // 어린이 모드 발사 간격 배수
  const shotsCap = game.enemyShotsMax || 99;   // 어린이 모드 조준 연발 상한
  boss.t += dt;
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
      boss.coreTimer = st.coreEvery * mul;
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
  capArray(game.bullets, CFG.limits.bullets);
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

function updateParticles(game, dt) {
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
  if (game.lives <= 0) game.events.push({ type: 'gameover' });
}

function grabItem(game, kind) {
  // 이미 최대치라 강화가 무의미하면 점수 보너스로 전환(수집 보람 유지).
  const maxed = () => { game.score += CFG.maxedBonus; game.sfx.push('power'); };
  const f = game.friend; // 어린이 모드 친구(있으면 아이템·회복 공유, docs/09)
  if (kind === 'H') {
    // 회복 공유: 친구가 기절했으면 부활, 아니면 나·친구 각각 hp 회복(상한 내).
    let healed = false;
    if (f && f.down) { reviveFriend(game); healed = true; }
    if (game.lives < (game.maxLives || CFG.player.maxLives)) { game.lives++; healed = true; }
    if (f && !f.down && f.hp < f.maxHp) { f.hp++; healed = true; }
    if (healed) game.sfx.push('power'); else maxed();
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
    if (gained) game.sfx.push('power'); else maxed();
    return;
  }
  if (kind === 'B') {
    for (const e of game.enemies) {
      burst(game, e.x, e.y, e.color, 12);
      game.score += e.score;
      notifyFriendKill(game); // 어린이 모드: 연속 처치 칭찬 신호(친구 없으면 무시)
      // 봄으로 죽어도 보너스 기체는 파워업 확정 드롭(잡몹은 드롭 없음 - 봄이 과해지지 않게).
      if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount);
    }
    game.enemies = [];
    game.eBullets = [];
    if (game.boss && !game.boss.entering) {
      damageCore(game, Math.ceil(game.boss.core.maxHp * 0.15)); // 봄은 코어 직격(가림 무시)
    }
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
          game.score += e.score;
          notifyFriendKill(game); // 어린이 모드: 연속 처치 칭찬 신호(친구 없으면 무시)
          burst(game, e.x, e.y, e.color, 14);
          if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount); // 보너스 기체 확정 드롭
          else dropMaybe(game, e.x, e.y); // 잡몹은 저확률 드롭(초반 성장 숨통)
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
  for (const it of game.powerups) {
    if (it.dead) continue;
    const fr = game.friend;
    if (hit(p, it) || (fr && !fr.down && hit(fr, it))) { it.dead = true; grabItem(game, it.kind); }
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
  // 구역 시작 인트로(다음 구역 배너 표시) 중에는 '적 스폰'과 '진행 판정'만 멈추고,
  // 나머지(발사·아이템 이동·획득·탄·존·충돌)는 평소처럼 진행한다(사용자 지시 2026-07-09).
  const intro = game.introTimer > 0;
  if (intro) game.introTimer -= dt; else game.elapsed += dt;
  if (game.player.inv > 0) game.player.inv -= dt;
  updateStars(game, dt, W, H);
  game.fireTimer -= dt;
  if (game.fireTimer <= 0) {
    game.fireTimer = CFG.player.fireEvery;
    playerFire(game);
  }
  stepOptions(game, dt, !game.transitioning); // 옵션기 추종 + 발사(보스 클리어 후 전환 대기 중엔 발사 쉼)
  stepTail(game, dt, !game.transitioning);    // 꼬리 비행기 추종 + 유도탄 발사
  stepFriend(game, dt, W, H, !game.transitioning); // 친구 비행기(어린이 모드) 유영 + 발사
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
  tickZone(game, dt);              // 에너지존 주기 피해(적 hp 선차감)
  checkCollisions(game, W, H);     // 아이템 획득 + 피격 - 인트로 중에도 진행
  // 존 등 총알 외 피해로 코어 hp<=0 되어도 일괄 격파 판정.
  if (game.boss && !game.boss.entering && game.boss.core.hp <= 0) defeatBoss(game);
  if (!intro) checkProgress(game, dt, W, H); // 인트로 중엔 다음 단계로 안 넘어감
}
