// 3계통 파워 파츠 로직 (순수). DOM/Canvas/오디오 미의존. docs/05_power-parts.md.
// 전방 화력(front)은 fire.js가, 옵션기·에너지존·파츠 손실은 이 모듈이 담당한다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { burst, dropItems, spawnShards } from './spawn.js';

const OPT = CFG.parts.option;
const ZONE = CFG.parts.zone;
const TAIL = CFG.parts.tail;

// n번째(0-based) 옵션 슬롯 정의: 좌우 번갈아, 안(0)→밖(3). 8대 전부 레이저(미사일은 꼬리 비행기로 이관).
export function optionSlot(n) {
  const side = n % 2 === 0 ? -1 : 1;
  const slot = Math.floor(n / 2);
  return { side, slot, type: 'laser' };
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
  game.options.push({ ...s, x: t.x, y: t.y, fireTimer: OPT.laserEvery });
  return true;
}

// 꼬리 비행기 n번째(0-based) 목표 위치: 플레이어 뒤(아래) 좌우 부채. count에 따라 매 프레임 재배치.
function tailTarget(idx, count, p) {
  const off = idx - (count - 1) / 2;                 // 중앙 기준 좌우 부호
  return { x: p.x + off * TAIL.stepX, y: p.y + TAIL.baseY + Math.abs(off) * TAIL.stepY };
}

// 꼬리 비행기 성장 1스텝. 4대 먼저 채우고('count'), 그 뒤 1~4번 순서로 무기 진화('weapon'). 만렙이면 null.
export function addTail(game) {
  if (game.tail.length < TAIL.maxCount) {
    const p = game.player;
    const t = p ? tailTarget(game.tail.length, game.tail.length + 1, p) : { x: 0, y: 0 };
    game.tail.push({ x: t.x, y: t.y, fireTimer: TAIL.missileEvery * Math.random(), weapon: 1 });
    return 'count';
  }
  const min = Math.min(...game.tail.map((t) => t.weapon));
  if (min >= TAIL.weaponMax) return null;      // 무기까지 만렙
  const tgt = game.tail.find((t) => t.weapon === min); // 앞(1번)에서부터 순차
  tgt.weapon++;
  return 'weapon';
}

// ── 파츠 획득(P/S/E/T). 만렙이면 false(소리·history 없음) ──
// 전방화력은 front 정수 하나(1~40)로 탄 수(1~8)와 발별 진화(9~40)를 모두 표현한다(docs/05 1.1.1).
export function gainFront(game) {
  if (game.front < CFG.parts.front.max) {
    game.front++;
    game.partHistory.push('front');
    return true;
  }
  return false; // front 만렙 → 점수 보너스로 처리(world.grabItem)
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
export function gainTail(game) {
  const r = addTail(game);
  if (r === 'count') game.partHistory.push('tail');
  else if (r === 'weapon') game.partHistory.push('tailWeapon');
  else return false;
  return true;
}

// 피격 시 마지막 얻은 파츠 1개 되돌림(역순 손실). 되돌린 계통 이름 반환.
export function loseLastPart(game) {
  const part = game.partHistory.pop();
  if (part === 'front') game.front = Math.max(1, game.front - 1);
  else if (part === 'option') game.options.pop();
  else if (part === 'zone') game.zone.level = Math.max(0, game.zone.level - 1);
  else if (part === 'tail') game.tail.pop();
  else if (part === 'tailWeapon') {
    // 가장 최근 오른 꼬리기 무기 후퇴 = 최대 weapon 중 가장 뒤(높은 index)를 -1.
    const max = Math.max(...game.tail.map((t) => t.weapon));
    for (let i = game.tail.length - 1; i >= 0; i--) {
      if (game.tail[i].weapon === max) { game.tail[i].weapon = Math.max(1, max - 1); break; }
    }
  }
  return part || null;
}

// 옵션 위치 추종 + 발사(8대 전부 레이저). 옵션 수↑ → 굵기·데미지 상승. 아군 탄은 game.bullets에 kind로 구분.
export function stepOptions(game, dt, canFire = true) {
  const p = game.player;
  if (!p) return;
  const k = Math.min(1, OPT.follow * dt);
  const n = game.options.length; // 옵션기가 많을수록 레이저가 굵고 세진다
  const laserR = OPT.laserR + n * OPT.laserRGrow;
  const laserDmg = OPT.laserDmg + Math.max(0, n - 1) * OPT.laserDmgGrow;
  for (const o of game.options) {
    const t = optionTarget(o, p);
    o.x += (t.x - o.x) * k;
    o.y += (t.y - o.y) * k;
    if (!canFire) continue; // 전환·인트로 중엔 위치만 따라가고 발사는 쉰다
    o.fireTimer -= dt;
    if (o.fireTimer > 0) continue;
    o.fireTimer = OPT.laserEvery;
    game.bullets.push({ x: o.x, y: o.y - 6, vx: 0, vy: -OPT.laserSpeed, r: laserR, dmg: laserDmg, kind: 'laser' });
  }
}

// 꼬리 비행기 위치 추종 + 유도탄 발사. 무기 단계↑ → 유도탄 크기·데미지 상승. 유도는 homeMissiles가 담당.
export function stepTail(game, dt, canFire = true) {
  const p = game.player;
  if (!p || !game.tail) return;
  const k = Math.min(1, TAIL.follow * dt);
  const n = game.tail.length;
  let fired = false;
  game.tail.forEach((o, idx) => {
    const t = tailTarget(idx, n, p);
    o.x += (t.x - o.x) * k;
    o.y += (t.y - o.y) * k;
    if (!canFire) return;
    o.fireTimer -= dt;
    if (o.fireTimer > 0) return;
    o.fireTimer = TAIL.missileEvery;
    const w = o.weapon;
    game.bullets.push({
      x: o.x, y: o.y + 4, vx: (idx % 2 === 0 ? -1 : 1) * 50, vy: -TAIL.missileSpeed * 0.4,
      r: TAIL.missileR + (w - 1) * TAIL.missileRGrow,
      dmg: TAIL.missileDmgBase + (w - 1) * TAIL.missileDmgGrow,
      kind: 'missile', weapon: w,
    });
    fired = true;
  });
  if (fired) game.sfx.push('missile');
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

// 미사일 유도(꼬리 비행기 유도탄): 가장 가까운 적/보스로 선회하며 가속. 표적 없으면 위로 가속.
export function homeMissiles(game, dt) {
  for (const b of game.bullets) {
    if (b.kind !== 'missile') continue;
    const cur = Math.hypot(b.vx, b.vy) || 1;
    let dvx = b.vx / cur, dvy = b.vy / cur; // 진행 단위벡터
    const tgt = nearestTarget(game, b.x, b.y);
    if (tgt) {
      const dx = tgt.x - b.x, dy = tgt.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const turn = Math.min(1, TAIL.missileTurn * dt);
      dvx += (dx / d - dvx) * turn;
      dvy += (dy / d - dvy) * turn;
    } else {
      dvy += (-1 - dvy) * Math.min(1, TAIL.missileTurn * dt); // 표적 없으면 위로
    }
    const nl = Math.hypot(dvx, dvy) || 1;
    const sp = Math.min(TAIL.missileSpeed, cur + TAIL.missileAccel * dt);
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
      if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount); // 보너스 기체만 드롭
      if (e.type === 'splitter') spawnShards(game, e.x, e.y); // 분열체는 조각으로 쪼개짐
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
