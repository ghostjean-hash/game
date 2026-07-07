// 엔티티 스폰 (순수, game 상태 변이). 색은 colors.js에서만 가져온다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';

// 구역 스케일 반영 체력: 기본 hp × 구역 배수, 11구역부터 추가 배수(hardStage).
function scaledHp(base, stage) {
  let hp = Math.ceil((base || 1) * (1 + (stage - 1) * CFG.enemyHpScale));
  if (stage >= CFG.hardStage.from) hp = Math.ceil(hp * CFG.hardStage.hpMul);
  return hp;
}

export function spawnEnemy(game, type, xr, W) {
  const spec = CFG.enemy[type];
  const x = Math.max(spec.r + 6, Math.min(W - spec.r - 6, xr * W));
  const hp = scaledHp(spec.hp, game.stage);
  const e = {
    type, x, baseX: x, y: -spec.r - 10,
    r: spec.r, hp, maxHp: hp,
    speed: spec.speed || 0, score: spec.score, color: COLORS.enemy[type],
    t: 0, fireTimer: (spec.fireEvery || 0) * Math.random(),
  };
  if (type === 'rusher') { e.phase = 0; e.vx = 0; e.vy = spec.drift; e.speed = 0; } // 0=조준하며 천천히 하강
  if (type === 'shielder') e.shielded = true;
  game.enemies.push(e);
  return e;
}

// 분열체 격파 시 조각(shard) 여러 개를 좌우로 흩뿌린다. 조각은 재분열하지 않는다.
export function spawnShards(game, x, y) {
  const c = CFG.enemy.shard;
  const n = CFG.enemy.splitter.shardCount;
  const hp = scaledHp(c.hp, game.stage);
  for (let i = 0; i < n; i++) {
    const dir = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2; // -1..1
    game.enemies.push({
      type: 'shard', x, baseX: x, y,
      r: c.r, hp, maxHp: hp, speed: c.speed, score: c.score,
      color: COLORS.enemy.shard, t: 0, fireTimer: 0,
      vx: dir * CFG.enemy.splitter.shardSpread,
    });
  }
}

// 호위 비행체 소환(중보스 동반). 좌우로 drone/weaver를 흩뿌린다.
export function spawnEscort(game, n, W) {
  for (let i = 0; i < n; i++) {
    const xr = 0.15 + Math.random() * 0.7;
    spawnEnemy(game, Math.random() < 0.5 ? 'drone' : 'weaver', xr, W);
  }
}

// 보스 등장. 1~9구역 = 중보스(호위 동반), 10구역 = 최종보스. game.events로 등장 알림.
export function spawnBoss(game, W, H) {
  const isFinal = game.stage >= CFG.stageCount;
  if (isFinal) {
    const c = CFG.finalBoss;
    game.boss = {
      kind: 'final', x: W / 2, y: -c.ry - 20, targetY: CFG.boss.spawnTop + c.ry,
      rx: c.rx, ry: c.ry, color: COLORS.boss.final,
      hp: c.hp, maxHp: c.hp, score: c.score, t: 0, entering: true,
      fireTimer: 1.2, patternTimer: 0, pattern: 0,
    };
    game.events.push({ type: 'boss-appear', name: '최종 보스' });
  } else {
    const c = CFG.miniBoss;
    const hp = c.baseHp + (game.stage - 1) * c.hpPerStage;
    game.boss = {
      kind: 'mini', x: W / 2, y: -c.ry - 20, targetY: CFG.boss.spawnTop + c.ry,
      rx: c.rx, ry: c.ry, color: COLORS.boss.mini,
      hp, maxHp: hp, score: c.score, t: 0, entering: true,
      fireTimer: 1.4, escortTimer: c.escortEvery,
    };
    game.events.push({ type: 'boss-appear', name: `구역 ${game.stage} 중보스` });
    spawnEscort(game, c.escortInit, W);
  }
  game.sfx.push('start');
}

// 화면을 가로지르는 보너스 기체 등장(좌/우 랜덤). 잡으면 파워업을 확정 드롭한다.
export function spawnBonus(game, W, H) {
  const c = CFG.enemy.bonus;
  const fromLeft = Math.random() < 0.5;
  game.enemies.push({
    type: 'bonus',
    x: fromLeft ? -c.r : W + c.r, baseX: 0, y: H * CFG.bonusShip.yRatio,
    r: c.r, hp: c.hp, maxHp: c.hp,
    speed: 0, vx: (fromLeft ? 1 : -1) * c.speed,
    score: c.score, color: COLORS.enemy.bonus, t: 0, fireTimer: 0,
  });
  game.sfx.push('start');
}

function rollKind() {
  const w = CFG.drop.weights;
  let r = Math.random();
  for (const k of Object.keys(w)) { if (r < w[k]) return k; r -= w[k]; }
  return 'B';
}

// 파워업 n개 확정 드롭(보스·보너스 기체 전용). 여러 개면 좌우로 흩뿌린다.
export function dropItems(game, x, y, n) {
  for (let i = 0; i < n; i++) {
    const ox = n === 1 ? 0 : (i - (n - 1) / 2) * 26;
    game.powerups.push({ x: x + ox, y, r: 12, vy: 70, kind: rollKind(), t: 0 });
  }
}

// 일반 잡몹 처치 시 낮은 확률(CFG.drop.chance)로 1개 드롭 - 초반 화력 성장 숨통.
export function dropMaybe(game, x, y) {
  if (Math.random() >= CFG.drop.chance) return;
  game.powerups.push({ x, y, r: 12, vy: 70, kind: rollKind(), t: 0 });
}

export function burst(game, x, y, color, n = 12) {
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
