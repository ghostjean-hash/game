// 3계통 파워 파츠 로직 (순수). DOM/Canvas/오디오 미의존. docs/05_power-parts.md.
// 전방 화력(front)은 fire.js가, 옵션기·에너지존·파츠 손실은 이 모듈이 담당한다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { burst, dropItem } from './spawn.js';

const OPT = CFG.parts.option;
const ZONE = CFG.parts.zone;

// n번째(0-based) 옵션 슬롯 정의: 좌우 번갈아, 안(0)→밖(3). 슬롯 0·1 레이저, 2·3 미사일.
export function optionSlot(n) {
  const side = n % 2 === 0 ? -1 : 1;
  const slot = Math.floor(n / 2);
  return { side, slot, type: slot < 2 ? 'laser' : 'missile' };
}

function optionTarget(o, p) {
  return { x: p.x + o.side * (OPT.baseX + o.slot * OPT.stepX), y: p.y + OPT.baseY + o.slot * OPT.stepY };
}

// 옵션 1대 추가(최대 좌우 각 maxPerSide). 성공 시 true.
export function addOption(game) {
  if (game.options.length >= OPT.maxPerSide * 2) return false;
  const s = optionSlot(game.options.length);
  const p = game.player;
  const t = p ? optionTarget({ ...s }, p) : { x: 0, y: 0 };
  game.options.push({
    ...s, x: t.x, y: t.y,
    fireTimer: s.type === 'laser' ? OPT.laserEvery : OPT.missileEvery * Math.random(),
  });
  return true;
}

// ── 파츠 획득(P/S/E). 만렙이면 false(소리·history 없음) ──
export function gainFront(game) {
  if (game.front >= CFG.parts.front.max) return false;
  game.front++;
  game.partHistory.push('front');
  return true;
}
export function gainOption(game) {
  if (!addOption(game)) return false;
  game.partHistory.push('option');
  return true;
}
export function gainZone(game) {
  if (game.zone.level >= ZONE.radius.length - 1) return false;
  game.zone.level++;
  if (game.zone.timer == null) game.zone.timer = ZONE.tick;
  game.partHistory.push('zone');
  return true;
}

// 피격 시 마지막 얻은 파츠 1개 되돌림(역순 손실). 되돌린 계통 이름 반환.
export function loseLastPart(game) {
  const part = game.partHistory.pop();
  if (part === 'front') game.front = Math.max(1, game.front - 1);
  else if (part === 'option') game.options.pop();
  else if (part === 'zone') game.zone.level = Math.max(0, game.zone.level - 1);
  return part || null;
}

// 옵션 위치 추종 + 발사(레이저: 빠른 직진탄 / 미사일: 유도탄). 아군 탄은 game.bullets에 kind로 구분.
export function stepOptions(game, dt) {
  const p = game.player;
  if (!p) return;
  const k = Math.min(1, OPT.follow * dt);
  let firedMissile = false;
  for (const o of game.options) {
    const t = optionTarget(o, p);
    o.x += (t.x - o.x) * k;
    o.y += (t.y - o.y) * k;
    o.fireTimer -= dt;
    if (o.fireTimer > 0) continue;
    if (o.type === 'laser') {
      o.fireTimer = OPT.laserEvery;
      game.bullets.push({ x: o.x, y: o.y - 6, vx: 0, vy: -OPT.laserSpeed, r: 2.2, dmg: OPT.laserDmg, kind: 'laser' });
    } else {
      o.fireTimer = OPT.missileEvery;
      game.bullets.push({
        x: o.x, y: o.y - 6, vx: o.side * 60, vy: -OPT.missileSpeed * 0.4,
        r: 4, dmg: OPT.missileDmg, kind: 'missile',
      });
      firedMissile = true;
    }
  }
  if (firedMissile) game.sfx.push('missile');
}

function nearestTarget(game, x, y) {
  let best = null, bd = Infinity;
  for (const e of game.enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  if (game.boss && !game.boss.entering) {
    const d = (game.boss.x - x) ** 2 + (game.boss.y - y) ** 2;
    if (d < bd) best = game.boss;
  }
  return best;
}

// 미사일 유도: 가장 가까운 적/보스로 선회하며 가속. 표적 없으면 위로 가속.
export function homeMissiles(game, dt) {
  for (const b of game.bullets) {
    if (b.kind !== 'missile') continue;
    const cur = Math.hypot(b.vx, b.vy) || 1;
    let dvx = b.vx / cur, dvy = b.vy / cur; // 진행 단위벡터
    const tgt = nearestTarget(game, b.x, b.y);
    if (tgt) {
      const dx = tgt.x - b.x, dy = tgt.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const turn = Math.min(1, OPT.missileTurn * dt);
      dvx += (dx / d - dvx) * turn;
      dvy += (dy / d - dvy) * turn;
    } else {
      dvy += (-1 - dvy) * Math.min(1, OPT.missileTurn * dt); // 표적 없으면 위로
    }
    const nl = Math.hypot(dvx, dvy) || 1;
    const sp = Math.min(OPT.missileSpeed, cur + OPT.missileAccel * dt);
    b.vx = (dvx / nl) * sp;
    b.vy = (dvy / nl) * sp;
  }
}

export function zoneRadius(game) {
  return game.zone && game.zone.level > 0 ? ZONE.radius[game.zone.level] : 0;
}

// 에너지존: tick마다 존 반경 내 적·보스에 레벨만큼 피해. 죽은 적은 여기서 처리(보스는 hp만, world가 격파 판정).
export function tickZone(game, dt) {
  if (!game.zone || game.zone.level <= 0 || !game.player) return;
  game.zone.timer -= dt;
  if (game.zone.timer > 0) return;
  game.zone.timer += ZONE.tick;
  const R = ZONE.radius[game.zone.level];
  const dmg = game.zone.level;
  const p = game.player;
  let hitAny = false;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const rr = R + e.r;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
    e.hp -= dmg;
    hitAny = true;
    if (e.hp <= 0) {
      e.dead = true;
      game.score += e.score;
      burst(game, e.x, e.y, e.color, 14);
      dropItem(game, e.x, e.y);
      game.sfx.push('explode');
    }
  }
  if (game.boss && !game.boss.entering) {
    const b = game.boss;
    const rr = R + (b.rx || b.r);
    if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 <= rr * rr) { b.hp -= dmg; hitAny = true; }
  }
  if (hitAny) { burst(game, p.x, p.y, COLORS.zone, 3); game.sfx.push('zone'); }
}
