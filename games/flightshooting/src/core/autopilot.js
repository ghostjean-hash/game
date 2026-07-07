// 자동 플레이 조작 (순수). DOM/입력 미의존 - game.player 위치를 스스로 조정한다.
//
// 전략: '짧은 미래 시뮬레이션'. 갈 수 있는 여러 목표 지점마다, 그쪽으로 실제로 이동하면서
// 모든 적탄·적기·보스를 실제 궤적대로 SIM_T초 앞까지 굴려보고 '언제 죽는가(생존 시간)'를 잰다.
// 가장 오래 사는 목표를 고르되, 안 죽는 목표가 여럿이면 그중 적을 조준하거나 드랍을 줍는 쪽을
// 택한다. 회피·조준·획득이 하나의 점수로 통합돼, 눈앞 위험만 보던 방식보다 훨씬 사람처럼 논다.
// 발사는 원래 자동이라 건드리지 않고, 조준은 표적과 같은 x로 정렬해 총알이 맞게 유도한다.
import { CFG } from '../data/numbers.js';

const SIM_T = 1.2;       // 미래를 이 시간(초)까지 시뮬레이션해 생존을 평가
const SIM_DT = 0.04;     // 시뮬 시간 간격(초) - 작을수록 정밀, 클수록 빠름
const HIT_PAD = 9;       // 시뮬 충돌 반경에 더하는 여유(성긴 스텝의 빗나감 방어 + 안전 마진)
const AIM_BONUS = 0.30;  // 조준 정렬 목표의 이득(생존 동점 목표끼리 우선순위 가름)
const PICK_BONUS = 0.42; // 파워업 획득 목표의 이득(성장 우선이라 조준보다 약간 높다)
const AIM_MARGIN = 24;   // 표적이 이만큼 위에 있어야 조준 대상으로 삼는다
const PICK_RANGE = 340;  // 이 거리 안의 파워업만 획득을 시도한다
const TOP_LIM = 0.4;     // 세로 이동 상한(화면 높이 비율). 이 위(적 스폰 구역)로는 올라가지 않는다
// 이동 목표 후보 (dx, dy) offset. [0,0](정지)을 맨 앞에 둬 안전 시 흔들림을 막는다.
// 좌우가 주 회피 축이라 촘촘히, 세로·대각선도 넣어 틈새 회피·드랍 마중·적기 흘리기를 가능케 한다.
const OFFS = [
  [0, 0], [60, 0], [-60, 0], [130, 0], [-130, 0], [220, 0], [-220, 0], [320, 0], [-320, 0],
  [0, -120], [0, -60], [0, 90],
  [110, -90], [-110, -90], [110, 80], [-110, 80],
];

// 시뮬레이션에 넣을 위협 목록. 각 위협의 미래 위치를 posAt로 정확히 재현할 수 있게 형태를 담는다.
// k=0: 등속 직선(적탄·직하 적·보스). k=1: weaver(좌우 사인 흔들 + 낙하).
function collectThreats(game) {
  const out = [];
  const br = CFG.enemyBullet.r;
  for (const b of game.eBullets)
    out.push({ k: 0, x: b.x, y: b.y, vx: b.vx || 0, vy: b.vy || 0, r: (b.r || br) + HIT_PAD });
  for (const e of game.enemies) {
    const r = (e.r || 15) + HIT_PAD;
    if (e.type === 'weaver')
      out.push({ k: 1, baseX: e.baseX, amp: CFG.enemy.weaver.amp, freq: CFG.enemy.weaver.freq, t0: e.t || 0, y: e.y, vy: e.speed || CFG.enemy.weaver.speed, r });
    else
      // rusher(돌진)·shard는 vx/vy로, 나머지는 세로 speed로 움직인다. bonus는 가로(vx)만.
      out.push({ k: 0, x: e.x, y: e.y, vx: e.vx || 0, vy: e.vy != null ? e.vy : (e.speed || 0), r });
  }
  if (game.boss && !game.boss.entering) {
    const b = game.boss;
    out.push({ k: 0, x: b.x, y: b.y, vx: 0, vy: 0, r: (b.ry || b.rx || 30) + HIT_PAD });
  }
  return out;
}

// 목표 tg로 최대 속도로 이동한다고 가정하고, SIM_T초 안에 처음 충돌하는 시각을 돌려준다.
// 충돌이 없으면 SIM_T(완전 생존). 값이 클수록 안전한 목표다.
function simulate(threats, tg, sx, sy, step, W, H, pr) {
  let x = sx, y = sy;
  const steps = Math.round(SIM_T / SIM_DT);
  for (let k = 1; k <= steps; k++) {
    const t = k * SIM_DT;
    const dx = tg.x - x, dy = tg.y - y, d = Math.hypot(dx, dy);
    if (d > 1e-3) { const m = Math.min(step, d); x += (dx / d) * m; y += (dy / d) * m; }
    if (x < pr) x = pr; else if (x > W - pr) x = W - pr;
    if (y < pr) y = pr; else if (y > H - pr) y = H - pr;
    for (const th of threats) {
      let ox, oy;
      if (th.k === 1) { ox = th.baseX + th.amp * Math.sin((th.t0 + t) * th.freq); oy = th.y + th.vy * t; }
      else { ox = th.x + th.vx * t; oy = th.y + th.vy * t; }
      const rr = pr + th.r, ex = x - ox, ey = y - oy;
      if (ex * ex + ey * ey < rr * rr) return t; // 이 시각에 죽는다
    }
  }
  return SIM_T; // 완전 생존
}

export function autopilotStep(game, dt, W, H) {
  const p = game.player;
  if (!p) return;
  const pr = p.r, homeY = H * CFG.player.yRatio;
  const threats = collectThreats(game);

  // 후보 목표: 회피 지점(bonus 0, 세로·대각 포함) + 조준 지점 + 파워업 지점.
  const topY = H * TOP_LIM, botY = H - pr;
  const targets = [];
  for (const [dx, dy] of OFFS)
    targets.push({ x: clamp(p.x + dx, pr, W - pr), y: clamp(homeY + dy, topY, botY), bonus: 0 });

  // 조준 표적 선정: 보너스 기체(파워업 원천, 놓치면 성장 불가)를 최우선, 없으면 가장 가까운 위쪽 적.
  let bonus = null;
  for (const e of game.enemies) { if (e.type === 'bonus') { bonus = e; break; } }
  let tgt = bonus, ty = -Infinity;
  if (!tgt) { for (const e of game.enemies) { if (e.y < p.y - AIM_MARGIN && e.y > ty) { ty = e.y; tgt = e; } } }
  if (!tgt && game.boss && !game.boss.entering) tgt = game.boss;
  if (tgt) {
    // 예측 조준(lead): 총알이 표적에 닿을 시간만큼 표적의 가로 이동을 미리 겨냥한다(빠른 보너스 기체 명중률↑).
    const evx = tgt.vx || 0;
    const tof = Math.max(0, (p.y - tgt.y) / CFG.bullet.speed);
    const leadX = tgt.x + evx * tof;
    targets.push({ x: clamp(leadX, pr, W - pr), y: homeY, bonus: tgt === bonus ? AIM_BONUS * 2 : AIM_BONUS });
  }

  // 파워업: 목숨이 이미 최대면 회복 하트(H)는 무시(먹으러 갈 이유가 없다). 이미 아래로 지나친 것도 제외.
  // 남은 것 중 가장 가까운 하나를 실제 위치(세로 포함)로 향해 마중 나간다.
  let pu = null, pd = Infinity;
  const full = game.lives >= CFG.player.maxLives;
  for (const it of game.powerups) {
    if (it.kind === 'H' && full) continue;
    if (it.y > p.y + 40) continue;
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    if (d < pd) { pd = d; pu = it; }
  }
  if (pu && pd < PICK_RANGE) targets.push({ x: clamp(pu.x, pr, W - pr), y: clamp(pu.y, topY, botY), bonus: PICK_BONUS });

  // 각 목표를 시뮬레이션해 (생존 시간 + 안전 시 이득)이 가장 큰 목표를 고른다.
  const step = CFG.player.speed * SIM_DT;
  let best = -Infinity, bx = p.x, by = homeY;
  for (const tg of targets) {
    const surv = simulate(threats, tg, p.x, p.y, step, W, H, pr);
    let s = surv;
    if (surv >= SIM_T) s += tg.bonus; // 완전 생존한 목표에만 조준/획득 이득을 얹는다(자살 유도 방지)
    if (s > best) { best = s; bx = tg.x; by = tg.y; }
  }

  const move = CFG.player.speed * dt;
  p.x += clamp(bx - p.x, -move, move);
  p.y += clamp(by - p.y, -move, move);
  p.x = clamp(p.x, pr, W - pr);
  p.y = clamp(p.y, pr, H - pr);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
