// 엔티티 스폰 (순수, game 상태 변이). 색은 colors.js에서만 가져온다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';

// 구역 스케일 반영 체력: 기본 hp × 구역 배수, 11구역부터 추가 배수(hardStage) × 난이도 배수(diffMul).
//   diffMul = 난이도별 적 체력 배수(game.enemyHpMul, 쉬움 0.85 ~ 매우 어려움 1.6). 미지정 시 1(보통).
function scaledHp(base, stage, diffMul = 1) {
  let hp = Math.ceil((base || 1) * (1 + (stage - 1) * CFG.enemyHpScale));
  if (stage >= CFG.hardStage.from) hp = Math.ceil(hp * CFG.hardStage.hpMul);
  if (stage >= CFG.voidStage.from) hp = Math.ceil(hp * CFG.voidStage.hpMul); // 21~30 이질 적 구간 가속
  if (stage >= CFG.aeonStage.from) hp = Math.ceil(hp * CFG.aeonStage.hpMul); // 31~40 빛 생명체 구간 가속
  return Math.max(1, Math.ceil(hp * diffMul));
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
  const hp = scaledHp(spec.hp, game.stage, game.enemyHpMul || 1);
  const e = {
    type, x, baseX: x, y: -spec.r - 10,
    r: spec.r, hp, maxHp: hp,
    speed: spec.speed || 0, score: spec.score, color: COLORS.enemy[type],
    t: 0, fireTimer: (spec.fireEvery || 0) * Math.random(),
  };
  if (type === 'rusher') { e.phase = 0; e.vx = 0; e.vy = spec.drift; e.speed = 0; } // 0=조준하며 천천히 하강
  if (type === 'shielder') e.shielded = true;
  if (type === 'warper') { e.warpTimer = spec.warpEvery; e.vuln = 0; }              // 순간이동 타이머 + 취약 타이머
  // 빛 생명체(31~40): 이동·행동 파라미터를 개체에 실어 둔다(자식·재하강 등 개체별로 달라질 수 있어).
  if (type === 'wisp')  { e.amp = spec.amp; e.freq = spec.freq; e.splitTimer = spec.splitEvery; e.splits = 0; }
  if (type === 'bloom') { e.bloomTimer = spec.descendTime; e.blooming = false; }
  game.enemies.push(e);
  return e;
}

// 도깨비불(wisp) 분열: 부모 옆에 작은 자식 도깨비불을 낳는다. 자식은 재분열하지 않는다(splits 만렙).
//   기존 잡몹과 동일한 충돌·드롭 로직을 그대로 타도록 표준 적 객체로 만든다.
export function spawnWispChild(game, x, y) {
  const spec = CFG.enemy.wisp;
  const hp = scaledHp(1, game.stage, game.enemyHpMul || 1); // 자식은 base hp 1(약함)
  game.enemies.push({
    type: 'wisp', child: true, x, baseX: x, y,
    r: spec.r * spec.childScale, hp, maxHp: hp, speed: spec.speed * 1.18,
    score: Math.round(spec.score * 0.3), color: COLORS.enemy.wisp, t: 0, fireTimer: 0,
    amp: spec.amp * 0.6, freq: spec.freq * 1.35, splitTimer: Infinity, splits: spec.splitMax,
  });
}

// 전격 코일: 노드 2개를 nodeGap 간격으로 나란히 스폰한다. 서로 mate로 연결(둘 다 살아야 아크 유지).
//   노드는 각자 독립 hp를 가진 개별 적이라 기존 충돌·드롭 로직을 그대로 탄다.
function spawnCoil(game, xr, W) {
  const spec = CFG.enemy.coil;
  const fb = fieldBounds(W);
  const half = spec.nodeGap / 2;
  const cx = Math.max(fb.left + half + spec.r, Math.min(fb.right - half - spec.r, fb.left + xr * fb.width));
  const hp = scaledHp(spec.hp, game.stage, game.enemyHpMul || 1);
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
  const hp = scaledHp(spec.hp, game.stage, game.enemyHpMul || 1);
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
  const hp = scaledHp(c.hp, game.stage, game.enemyHpMul || 1);
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

// 구역 → 보스 스타일(docs/06 §4). 40 = sentinel(최종), 31~39 = 세 스타일 순환 재활용,
//   21~30 = orbiter, 11~20 = bio, 1~10 = battleship.
export function bossStyleFor(stage) {
  if (stage >= CFG.stageCount) return 'sentinel';                 // 40 최종
  if (stage >= CFG.aeonStage.from) {                              // 31~39: battleship→bio→orbiter 순환
    return ['battleship', 'bio', 'orbiter'][(stage - CFG.aeonStage.from) % 3];
  }
  if (stage >= CFG.bossStyleFrom.orbiter) return 'orbiter';       // 21~30
  if (stage >= CFG.bossStyleFrom.bio) return 'bio';               // 11~20
  return 'battleship';                                            // 1~10
}

// 보스 등장(부위 파괴형). 1~39 = 중보스(호위 동반), 40 = 최종보스. 스타일별 코어 + 부위를 조립한다.
export function spawnBoss(game, W, H) {
  const isFinal = game.stage >= CFG.stageCount;
  const style = bossStyleFor(game.stage);
  const st = CFG.bossStyles[style];
  const sc = COLORS.boss.styles[style];
  const base = isFinal ? CFG.finalBoss : CFG.miniBoss;
  const totalHp = isFinal ? base.hp : base.baseHp + (game.stage - 1) * base.hpPerStage;
  // 강화판: 후반 5구역(6~10·16~20·26~30, 최종 제외). 추가 부위 + 발사 주기 단축(사용자 지시 2026-07-16).
  const upgraded = !isFinal && st.upgrade && ((game.stage - 1) % 10) >= CFG.bossUpgradeFrom;
  const up = upgraded ? st.upgrade : null;
  const fireMul = up ? up.fireMul : 1;
  const coreMul = up && up.coreMul ? up.coreMul : 1;
  const partDefs = up ? st.parts.concat(up.extraParts) : st.parts;
  // hp 정규화: 부위가 늘어도 (코어 + 전체 부위) 비율 합으로 나눠 총 hp가 일정하게 유지되도록.
  const ratioSum = st.coreRatio + partDefs.reduce((s, pp) => s + pp.hpRatio, 0);
  const coreHp = Math.max(1, Math.ceil((totalHp * st.coreRatio) / ratioSum));
  const parts = partDefs.map((pp) => {
    const php = Math.max(1, Math.ceil((totalHp * pp.hpRatio) / ratioSum));
    const fe = (pp.fireEvery || 0) * fireMul; // 강화판은 부위 발사 더 자주
    return { ...pp, fireEvery: fe, hp: php, maxHp: php, dead: false, fireTimer: fe * Math.random(), x: 0, y: 0 };
  });
  const hasShield = parts.some((p) => p.role === 'shield');
  const coreEvery = (st.coreEvery || 1.4) * coreMul; // 강화판은 코어 공격도 더 자주
  game.boss = {
    kind: isFinal ? 'final' : 'mini', style, upgraded,
    x: W / 2, y: -base.ry - 20, targetY: CFG.boss.spawnTop + base.ry,
    rx: base.rx, ry: base.ry, color: sc.core, colors: sc,
    core: { hp: coreHp, maxHp: coreHp, exposed: !hasShield }, // 방어구 없으면 처음부터 노출
    parts, orbitAngle: 0, coreEvery, coreTimer: coreEvery * Math.random(),
    score: base.score, t: 0, entering: true,
    escortTimer: isFinal ? Infinity : CFG.miniBoss.escortEvery,
  };
  syncBossParts(game.boss); // 등장 이동 중에도 부위가 코어에 붙어 보이게 초기 위치 계산
  game.events.push({ type: 'boss-appear', name: isFinal ? '최종 보스' : `구역 ${game.stage} 보스${upgraded ? ' (강화)' : ''}` });
  if (!isFinal) spawnEscort(game, CFG.miniBoss.escortInit, W);
  game.sfx.push('start');
}

// 부위 절대 위치 갱신: orbit 부위는 코어 주위 회전, 그 외는 코어 기준 고정 오프셋(ox/oy).
export function syncBossParts(boss) {
  const st = CFG.bossStyles[boss.style];
  for (const p of boss.parts) {
    if (p.dead) continue;
    if (p.orbit) {
      const a = p.angle + boss.orbitAngle;
      p.x = boss.x + Math.cos(a) * st.orbitR;
      p.y = boss.y + Math.sin(a) * st.orbitR;
    } else {
      p.x = boss.x + p.ox;
      p.y = boss.y + p.oy;
    }
  }
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

// tag는 특정 연출의 완료 대기·강제 정리에만 쓴다. 일반 파티클은 undefined로 기존 동작을 유지한다.
export function burst(game, x, y, color, n = 12, tag) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 180;
    game.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.3, age: 0, color,
      r: 1.5 + Math.random() * 2.5, tag,
    });
  }
}
