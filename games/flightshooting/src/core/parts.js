// 3계통 파워 파츠 로직 (순수). DOM/Canvas/오디오 미의존. docs/05_power-parts.md.
// 전방 화력(front)은 fire.js가, 옵션기·에너지존·파츠 손실은 이 모듈이 담당한다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { awardScore } from './score.js';
import { burst, dropItems, spawnShards } from './spawn.js';
import { speedMul } from './fire.js';

const OPT = CFG.parts.option;
const ZONE = CFG.parts.zone;
const TAIL = CFG.parts.tail;

// n번째(0-based) 옵션 슬롯 정의: 좌우 번갈아, 안(0)→밖(2). 6대 전부 레이저(미사일은 꼬리 비행기로 이관).
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
  // rank = 추가 순서(0~7) = 사이드 총알 진화 순번(안쪽부터). 진화 tier 계산에 쓴다.
  game.options.push({ ...s, rank: game.options.length, x: t.x, y: t.y, fireTimer: OPT.laserEvery });
  return true;
}

// 꼬리 비행기 idx의 추종 목표: 앞 개체(0번은 플레이어, 그 외는 idx-1번 꼬리기) 바로 뒤(아래).
// 앞 개체를 각자 개별 추종하므로 세로 일렬 체인이 뱀 꼬리처럼 출렁인다.
function tailTarget(idx, game, p) {
  const lead = idx === 0 ? p : game.tail[idx - 1];
  const leadR = idx === 0 ? (p.r || 14) : TAIL.r;
  return { x: lead.x, y: lead.y + leadR + TAIL.gap };
}

// 꼬리 비행기 성장 1스텝. 4대 먼저 채우고('count'), 그 뒤 1번→2번→…→4번 순서로 무기 한 단계씩 진화('weapon', 발별 순차). 만렙이면 null.
export function addTail(game) {
  if (game.tail.length < TAIL.maxCount) {
    const p = game.player;
    // 새 꼬리기는 맨 뒤(마지막 꼬리기 또는 플레이어 뒤)에서 시작.
    const lead = game.tail.length ? game.tail[game.tail.length - 1] : p;
    const t = lead ? { x: lead.x, y: lead.y + (game.tail.length ? TAIL.r : (p.r || 14)) + TAIL.gap } : { x: 0, y: 0 };
    game.tail.push({ x: t.x, y: t.y, fireTimer: TAIL.missileEvery * Math.random(), weapon: 1 });
    return 'count';
  }
  const min = Math.min(...game.tail.map((t) => t.weapon));
  if (min >= TAIL.weaponMax) return null;              // 무기까지 만렙
  const tgt = game.tail.find((t) => t.weapon === min); // 가장 낮은(앞) 꼬리기부터 순차
  tgt.weapon++;
  return 'weapon';
}

// ── 파츠 획득(P/S/E/T). 만렙이면 false(소리·history 없음) ──
// 전방화력은 front 정수 하나(1~66)로 탄 수(1~6)와 발별 진화(7~66)를 모두 표현한다(docs/05 1.1.1).
export function gainFront(game) {
  if (game.front < CFG.parts.front.max) {
    game.front++;
    game.partHistory.push('front');
    return true;
  }
  return false; // front 만렙 → 점수 보너스로 처리(world.grabItem)
}
export function gainOption(game) {
  if (addOption(game)) { game.partHistory.push('option'); return true; }
  // 사이드 6대를 다 채운 뒤 S를 더 먹으면 안쪽(rank 0)부터 한 발씩 진화(발별 순차). 6대×10티어 = 60단계.
  const evoMax = (COLORS.bulletShapeTier.length - 1) * OPT.maxPerSide * 2;
  if ((game.optionEvo || 0) < evoMax) {
    game.optionEvo = (game.optionEvo || 0) + 1;
    game.partHistory.push('optionEvo');
    return true;
  }
  return false;
}
export function gainZone(game) {
  if (game.zone.level >= ZONE.levelMax) return false;
  game.zone.level++;
  if (!game.zone.pulses) game.zone.pulses = [];
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
  else if (part === 'optionEvo') game.optionEvo = Math.max(0, (game.optionEvo || 0) - 1);
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

// 옵션 위치 추종 + 발사(6대 전부 레이저). 옵션 수↑ → 굵기·데미지 상승. 아군 탄은 game.bullets에 kind로 구분.
export function stepOptions(game, dt, canFire = true) {
  const p = game.player;
  if (!p) return;
  const k = Math.min(1, OPT.follow * dt);
  const n = game.options.length; // 옵션기가 많을수록 레이저가 굵고 세진다
  const laserR = OPT.laserR + n * OPT.laserRGrow;
  const laserDmg = OPT.laserDmg + Math.max(0, n - 1) * OPT.laserDmgGrow;
  const evo = game.optionEvo || 0;                       // 진화에 투입된 S 수
  const maxTier = COLORS.bulletShapeTier.length - 1;     // 티어 최대(10)
  for (const o of game.options) {
    const t = optionTarget(o, p);
    o.x += (t.x - o.x) * k;
    o.y += (t.y - o.y) * k;
    if (!canFire) continue; // 전환·인트로 중엔 위치만 따라가고 발사는 쉰다
    o.fireTimer -= dt;
    if (o.fireTimer > 0) continue;
    o.fireTimer = OPT.laserEvery;
    // 사이드 총알은 부채로 퍼진다: 안쪽(slot 0) 살짝, 바깥으로 갈수록 크게. side로 좌/우.
    const deg = OPT.laserDiagBase + o.slot * OPT.laserDiagStep;
    const rad = (o.side * deg * Math.PI) / 180;
    // 진화 tier: 사이드 전 대수(maxPerSide×2)를 채운 뒤 안쪽(rank 0)부터 한 발씩 진화(발별 순차). 그 대수 스텝마다 티어 +1.
    const tier = evo >= o.rank + 1 ? Math.min(Math.floor((evo - (o.rank + 1)) / (OPT.maxPerSide * 2)) + 1, maxTier) : 0;
    const speed = OPT.laserSpeed * speedMul(tier);       // 진화한 탄일수록 속도↑
    game.bullets.push({ x: o.x, y: o.y - 6, vx: Math.sin(rad) * speed, vy: -Math.cos(rad) * speed, r: laserR, dmg: laserDmg + tier, kind: 'laser', tier });
  }
}

// 꼬리 비행기 체인 추종 + 유도탄 발사. 각자 앞 개체를 개별 추종(세로 일렬, 뱀 꼬리처럼 출렁).
// 뒤 개체부터 갱신해 앞 개체의 '이전 프레임' 위치를 따르게 한다(즉시 전파 대신 지연 체인). 유도는 homeMissiles가 담당.
export function stepTail(game, dt, canFire = true) {
  const p = game.player;
  if (!p || !game.tail) return;
  const k = Math.min(1, TAIL.follow * dt);
  let fired = false;
  for (let idx = game.tail.length - 1; idx >= 0; idx--) {
    const o = game.tail[idx];
    const t = tailTarget(idx, game, p);
    o.x += (t.x - o.x) * k;
    o.y += (t.y - o.y) * k;
    if (!canFire) continue;
    o.fireTimer -= dt;
    if (o.fireTimer > 0) continue;
    o.fireTimer = TAIL.missileEvery;
    const w = o.weapon, tier = w - 1; // tier 0~10(형태 진화 + 3색 순환). 각 꼬리기 무기 단계는 개별(발별 순차).
    const sp0 = TAIL.missileSpeed * speedMul(tier);
    game.bullets.push({
      x: o.x, y: o.y + 4, vx: (idx % 2 === 0 ? -1 : 1) * 50, vy: -sp0 * 0.4,
      r: TAIL.missileR + (w - 1) * TAIL.missileRGrow,
      dmg: TAIL.missileDmgBase + (w - 1) * TAIL.missileDmgGrow,
      kind: 'missile', weapon: w,
    });
    fired = true;
  }
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
    const maxSp = TAIL.missileSpeed * speedMul((b.weapon || 1) - 1); // 진화 단계로 최고 속도 상승
    const sp = Math.min(maxSp, cur + TAIL.missileAccel * dt);
    b.vx = (dvx / nl) * sp;
    b.vy = (dvy / nl) * sp;
  }
}

export function zoneRadius(game) {
  return game.zone && game.zone.level > 0 ? ZONE.maxRadius[game.zone.level] : 0;
}

// 에너지존 = 펄스파: 주기(period)마다 플레이어 중심에서 링이 발생해 speed로 바깥 확장.
//   링이 적·보스를 '지나가는 순간'(반경 ±두께/2 안에 걸칠 때) 한 번만 dmg = level 피해.
//   한 파동이 같은 대상을 두 번 때리지 않게 pulse.hit에 맞은 대상을 기록한다. 죽은 적 처리는 여기서.
export function tickZone(game, dt) {
  const z = game.zone;
  if (!z || z.level <= 0 || !game.player) return;
  const p = game.player;
  const dmg = z.level;
  const maxR = ZONE.maxRadius[z.level];
  const half = ZONE.thick[z.level] / 2;
  if (!z.pulses) z.pulses = [];
  // 새 파동 발생(주기마다). 주기는 레벨↑이면 짧아진다.
  z.spawnTimer = (z.spawnTimer || 0) - dt;
  if (z.spawnTimer <= 0) {
    z.spawnTimer += ZONE.period[z.level];
    z.pulses.push({ r: 0, hit: new Set() }); // hit는 Set(맞은 대상 멤버십 O(1) 조회)
    game.sfx.push('zone');
  }
  let hitAny = false;
  // 적별 플레이어까지 거리는 pulse와 무관하다 → 프레임당 1회만 계산(펄스 여러 개일 때 중복 sqrt 제거).
  const enemies = game.enemies;
  const dists = [];
  for (let i = 0; i < enemies.length; i++) dists.push(Math.hypot(enemies[i].x - p.x, enemies[i].y - p.y));
  for (const pulse of z.pulses) {
    pulse.r += ZONE.speed * dt;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead || pulse.hit.has(e)) continue;
      if (e.type === 'serpent' && e.seg === 'body') continue; // 뱀 몸통은 무적(존도 못 뚫는다 - 머리만)
      const d = dists[i];
      if (Math.abs(d - pulse.r) > half + e.r) continue;
      e.hp -= dmg; pulse.hit.add(e); hitAny = true;
      if (e.hp <= 0) {
        e.dead = true;
        awardScore(game, e.score);
        burst(game, e.x, e.y, e.color, 14);
        if (e.type === 'bonus') dropItems(game, e.x, e.y, CFG.bonusShip.dropCount); // 보너스 기체만 드롭
        if (e.type === 'splitter') spawnShards(game, e.x, e.y); // 분열체는 조각으로 쪼개짐
        if (e.type === 'serpent') for (const s of e.body) s.dead = true; // 머리 격파 = 몸통 전멸
        game.sfx.push('explode');
      }
    }
    if (game.boss && !game.boss.entering && !pulse.hit.has(game.boss)) {
      const b = game.boss;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (Math.abs(d - pulse.r) <= half + (b.rx || b.r)) { b.core.hp -= dmg; pulse.hit.add(b); hitAny = true; } // 존은 부위 관통, 코어 직격
    }
  }
  z.pulses = z.pulses.filter((pulse) => pulse.r <= maxR); // 최대 반경 넘은 파동 소멸
  if (hitAny) burst(game, p.x, p.y, COLORS.zone, 2);
}
