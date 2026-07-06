// 엔티티 스폰 (순수, game 상태 변이). 색은 colors.js에서만 가져온다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';

export function spawnEnemy(game, type, xr, W) {
  const spec = CFG.enemy[type];
  const x = Math.max(spec.r + 6, Math.min(W - spec.r - 6, xr * W));
  const hp = Math.ceil(spec.hp * (1 + (game.stage - 1) * CFG.enemyHpScale)); // 구역↑ 체력↑
  game.enemies.push({
    type, x, baseX: x, y: -spec.r - 10,
    r: spec.r, hp, maxHp: hp,
    speed: spec.speed, score: spec.score, color: COLORS.enemy[type],
    t: 0, fireTimer: (spec.fireEvery || 0) * Math.random(),
  });
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
      kind: 'final', x: W / 2, y: -c.ry - 20, targetY: c.ry + 34,
      rx: c.rx, ry: c.ry, color: COLORS.boss.final,
      hp: c.hp, maxHp: c.hp, score: c.score, t: 0, entering: true,
      fireTimer: 1.2, patternTimer: 0, pattern: 0,
    };
    game.events.push({ type: 'boss-appear', name: '최종 보스' });
  } else {
    const c = CFG.miniBoss;
    const hp = c.baseHp + (game.stage - 1) * c.hpPerStage;
    game.boss = {
      kind: 'mini', x: W / 2, y: -c.ry - 20, targetY: c.ry + 30,
      rx: c.rx, ry: c.ry, color: COLORS.boss.mini,
      hp, maxHp: hp, score: c.score, t: 0, entering: true,
      fireTimer: 1.4, escortTimer: c.escortEvery,
    };
    game.events.push({ type: 'boss-appear', name: `구역 ${game.stage} 중보스` });
    spawnEscort(game, c.escortInit, W);
  }
  game.sfx.push('start');
}

export function dropItem(game, x, y) {
  if (Math.random() > CFG.drop.chance) return;
  const w = CFG.drop.weights;
  let r = Math.random(), kind = 'B';
  for (const k of Object.keys(w)) { if (r < w[k]) { kind = k; break; } r -= w[k]; }
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
