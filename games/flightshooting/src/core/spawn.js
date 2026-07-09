// 엔티티 스폰 (순수, game 상태 변이). 색은 colors.js에서만 가져온다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';

// 구역 스케일 반영 체력: 기본 hp × 구역 배수, 11구역부터 추가 배수(hardStage).
function scaledHp(base, stage) {
  let hp = Math.ceil((base || 1) * (1 + (stage - 1) * CFG.enemyHpScale));
  if (stage >= CFG.hardStage.from) hp = Math.ceil(hp * CFG.hardStage.hpMul);
  if (stage >= CFG.voidStage.from) hp = Math.ceil(hp * CFG.voidStage.hpMul); // 21~30 이질 적 구간 가속
  return hp;
}

// 적 출현 가로 영역(플레이필드): 화면폭 W가 넓어도 중앙 고정폭(CFG.field.width) 안으로 제한한다.
//   화면이 더 좁으면 화면폭을 그대로 쓴다. left = 왼쪽 여백, width = 실제 필드 폭. warper 이동 clamp도 공용.
export function fieldBounds(W) {
  const width = Math.min(W, CFG.field.width);
  const left = (W - width) / 2;
  return { left, width, right: left + width };
}

export function spawnEnemy(game, type, xr, W) {
  if (type === 'coil') return spawnCoil(game, xr, W);       // 노드 2개 쌍(아크 연결)
  if (type === 'serpent') return spawnSerpent(game, xr, W); // 머리 + 몸통 마디 체인
  const spec = CFG.enemy[type];
  const fb = fieldBounds(W); // 화면폭과 무관하게 중앙 고정폭 안에서만 출현
  const x = Math.max(fb.left + spec.r + 6, Math.min(fb.right - spec.r - 6, fb.left + xr * fb.width));
  const hp = scaledHp(spec.hp, game.stage);
  const e = {
    type, x, baseX: x, y: -spec.r - 10,
    r: spec.r, hp, maxHp: hp,
    speed: spec.speed || 0, score: spec.score, color: COLORS.enemy[type],
    t: 0, fireTimer: (spec.fireEvery || 0) * Math.random(),
  };
  if (type === 'rusher') { e.phase = 0; e.vx = 0; e.vy = spec.drift; e.speed = 0; } // 0=조준하며 천천히 하강
  if (type === 'shielder') e.shielded = true;
  if (type === 'warper') { e.warpTimer = spec.warpEvery; e.vuln = 0; }              // 순간이동 타이머 + 취약 타이머
  game.enemies.push(e);
  return e;
}

// 전격 코일: 노드 2개를 nodeGap 간격으로 나란히 스폰한다. 서로 mate로 연결(둘 다 살아야 아크 유지).
//   노드는 각자 독립 hp를 가진 개별 적이라 기존 충돌·드롭 로직을 그대로 탄다.
function spawnCoil(game, xr, W) {
  const spec = CFG.enemy.coil;
  const fb = fieldBounds(W);
  const half = spec.nodeGap / 2;
  const cx = Math.max(fb.left + half + spec.r, Math.min(fb.right - half - spec.r, fb.left + xr * fb.width));
  const hp = scaledHp(spec.hp, game.stage);
  const mk = (dx) => ({
    type: 'coil', x: cx + dx, baseX: cx + dx, y: -spec.r - 10,
    r: spec.r, hp, maxHp: hp, speed: spec.speed, score: spec.score,
    color: COLORS.enemy.coil, t: 0, fireTimer: 0,
  });
  const a = mk(-half), b = mk(half);
  a.mate = b; b.mate = a; // 상대가 살아있는 동안만 아크 선이 유지된다(world가 판정)
  game.enemies.push(a, b);
  return a;
}

// 기계 뱀: 머리 1 + 몸통 마디(segCount)를 세로로 이어 스폰한다. 머리만 약점(hp), 몸통은 무적(hp 큼).
//   몸통은 head 참조 + order로 앞 마디를 지연 추종한다(world.updateEnemies). 머리 격파 시 world가 전체 제거.
function spawnSerpent(game, xr, W) {
  const spec = CFG.enemy.serpent;
  const fb = fieldBounds(W);
  const cx = Math.max(fb.left + spec.r + 6, Math.min(fb.right - spec.r - 6, fb.left + xr * fb.width));
  const hp = scaledHp(spec.hp, game.stage);
  const head = {
    type: 'serpent', seg: 'head', x: cx, baseX: cx, y: -spec.r - 10,
    r: spec.r, hp, maxHp: hp, speed: spec.speed, score: spec.score,
    color: COLORS.enemy.serpentHead, t: 0, fireTimer: 0, body: [],
  };
  game.enemies.push(head);
  for (let i = 1; i <= spec.segCount; i++) {
    const s = {
      type: 'serpent', seg: 'body', head, order: i,
      x: cx, baseX: cx, y: -spec.r - 10 - i * spec.segGap,
      r: spec.r * 0.82, hp: Infinity, maxHp: Infinity, speed: spec.speed, score: 0,
      color: COLORS.enemy.serpent, t: 0, fireTimer: 0,
    };
    head.body.push(s);
    game.enemies.push(s);
  }
  return head;
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

// 보스 등장. 1~29구역 = 중보스(호위 동반), 30구역 = 최종보스. game.events로 등장 알림.
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
    const machine = game.stage >= CFG.voidStage.from; // 21~29 = 이질 기계 중보스(신규 외형·패턴)
    game.boss = {
      kind: 'mini', style: machine ? 'machine' : 'spirit',
      x: W / 2, y: -c.ry - 20, targetY: CFG.boss.spawnTop + c.ry,
      rx: c.rx, ry: c.ry, color: machine ? COLORS.boss.machine : COLORS.boss.mini,
      hp, maxHp: hp, score: c.score, t: 0, entering: true,
      fireTimer: 1.4, escortTimer: c.escortEvery, patternTimer: 0, pattern: 0,
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

// 드롭 종류 추첨. 치트로 특정 종류만 켜면(game.cheat.dropKinds) 켜진 것 중에서만 가중 추첨한다.
// 전부 꺼지면 null(드롭 없음).
function rollKind(game) {
  const w = CFG.drop.weights;
  const on = game && game.cheat && game.cheat.dropKinds;
  const keys = Object.keys(w).filter((k) => !on || on[k]);
  if (!keys.length) return null;
  let total = 0; for (const k of keys) total += w[k];
  let r = Math.random() * total;
  for (const k of keys) { if (r < w[k]) return k; r -= w[k]; }
  return keys[keys.length - 1];
}

// 파워업 n개 확정 드롭(보스·보너스 기체 전용). 여러 개면 좌우로 흩뿌린다.
export function dropItems(game, x, y, n) {
  for (let i = 0; i < n; i++) {
    const kind = rollKind(game);
    if (!kind) continue;
    const ox = n === 1 ? 0 : (i - (n - 1) / 2) * 26;
    game.powerups.push({ x: x + ox, y, r: 12, vy: 70, kind, t: 0 });
  }
}

// 일반 잡몹 처치 시 낮은 확률로 1개 드롭. 치트(game.cheat.dropChance 0~1)가 있으면 그 확률을 쓴다.
export function dropMaybe(game, x, y) {
  const chance = game && game.cheat && game.cheat.dropChance != null ? game.cheat.dropChance : CFG.drop.chance;
  if (Math.random() >= chance) return;
  const kind = rollKind(game);
  if (!kind) return;
  game.powerups.push({ x, y, r: 12, vy: 70, kind, t: 0 });
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
