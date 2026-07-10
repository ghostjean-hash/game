// 자동 플레이 조작 (순수). DOM/입력 미의존 - game.player 위치를 스스로 조정한다.
//
// 전략: '짧은 미래 시뮬레이션'. 갈 수 있는 여러 목표 지점마다, 그쪽으로 실제로 이동하면서
// 모든 적탄·적기·보스를 실제 궤적대로 SIM_T초 앞까지 굴려보고 '언제 죽는가(생존 시간)'를 잰다.
// 가장 오래 사는 목표를 고르되, 안 죽는 목표가 여럿이면 그중 적을 조준하거나 드랍을 줍는 쪽을
// 택한다. 회피·조준·획득이 하나의 점수로 통합돼, 눈앞 위험만 보던 방식보다 훨씬 사람처럼 논다.
// 발사는 원래 자동이라 건드리지 않고, 조준은 표적과 같은 x로 정렬해 총알이 맞게 유도한다.
import { CFG } from '../data/numbers.js';

const SIM_T = 1.5;       // 미래를 이 시간(초)까지 시뮬레이션해 생존을 평가(회피 지평 확대)
const SIM_DT = 0.04;     // 시뮬 시간 간격(초) - 작을수록 정밀, 클수록 빠름
const HIT_PAD = 9;       // 시뮬 충돌 반경에 더하는 여유(성긴 스텝의 빗나감 방어 + 안전 마진)
const AIM_BONUS = 0.30;  // 조준 정렬 목표의 이득(생존 동점 목표끼리 우선순위 가름)
const PICK_BONUS = 0.42; // 파워업 획득 목표의 이득(성장 우선이라 조준보다 약간 높다)
const AIM_MARGIN = 24;   // 표적이 이만큼 위에 있어야 조준 대상으로 삼는다
const PICK_RANGE = 340;  // 이 거리 안의 파워업만 획득을 시도한다
const TOP_LIM = 0.28;    // 세로 이동 상한(화면 높이 비율). 위쪽 빈 공간까지 활용하되 적 스폰 최상단은 피한다
const DEADZONE = 12;     // 위협이 없을 때 이 픽셀 이내의 목표 편차는 무시(조준 표적 미세 이동에 따른 떨림 방지)
const RAND_N = 12;       // 몬테카를로: 매 결정마다 무작위 도피처를 이만큼 더 뿌려 시뮬(고정 후보로 못 찾는 틈새 발견)
const CLEAR_BONUS = 0.9; // 여유 공간 보너스 가중: 목표 주변에 위협이 없을수록(빈 공간·위쪽) 선호. 위협 많을 때만 강하게 작동
// 조작 갱신 주기(초). 사람은 초당 대여섯 번 정도만 방향을 바꾼다. '생각(목표 선택)'은 이 주기마다
// 정확히 하되 그 사이에는 정한 방향을 유지해, 매 프레임(초당 60번) 미세 조정하는 기계적 움직임을 없앤다.
// 이동 속도·관성은 그대로 두고 '방향을 바꾸는 빈도'만 사람 수준으로 낮춘다(사용자 지시 2026-07-09).
const DECIDE_EVERY = 0.15;
// 이동 목표 후보 (dx, dy) offset. [0,0](정지)을 맨 앞에 둬 안전 시 흔들림을 막는다.
// 좌우가 주 회피 축이라 촘촘히, 세로·대각선도 넣어 틈새 회피·드랍 마중·적기 흘리기를 가능케 한다.
const OFFS = [
  [0, 0], [60, 0], [-60, 0], [130, 0], [-130, 0], [220, 0], [-220, 0], [320, 0], [-320, 0],
  [0, -60], [0, 90],
  // 위쪽 빈 공간 활용: 세로·대각 상승 후보를 여러 높이로(아래에서만 싸우지 않게)
  [0, -140], [0, -240], [0, -340], [0, -440],
  [120, -90], [-120, -90], [120, 80], [-120, 80],
  [160, -220], [-160, -220], [200, -360], [-200, -360],
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

// 목표 tg로 최대 속도로 이동한다고 가정하고, simT초 안에 처음 충돌하는 시각을 돌려준다.
// 충돌이 없으면 simT(완전 생존). 값이 클수록 안전한 목표다. simT = 실력 티어의 예측 지평.
function simulate(threats, tg, sx, sy, step, W, H, pr, simT) {
  let x = sx, y = sy;
  const steps = Math.round(simT / SIM_DT);
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
  return simT; // 완전 생존
}

// 목표 지점 주변 '여유 공간': 가장 가까운 위협까지의 거리(현재 위치 기준). 넓을수록 위협 없는 빈 공간이다.
//   위협이 대부분 아래에 몰려 있으면 위쪽 지점의 여유가 커져, AI가 자연히 위쪽 빈 공간으로 올라간다.
function clearanceAt(threats, tx, ty) {
  let mind = Infinity;
  for (const th of threats) {
    const ox = th.k === 1 ? th.baseX : th.x;
    const dx = tx - ox, dy = ty - th.y;
    const d = dx * dx + dy * dy;
    if (d < mind) mind = d;
  }
  return mind === Infinity ? 1e6 : Math.sqrt(mind);
}

// 표준정규 난수(Box-Muller) - 조준 각오차 노이즈용. 사람은 프로도 완벽 조준 못 한다.
function gauss() {
  const u = Math.random() || 1e-9, v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 목표 지점 '결정'(무거운 시뮬레이션 포함). 실력 티어(tier)마다 주기마다만 호출한다.
// tier(있으면): sim=예측 지평, aimDeg=조준 각오차, threats=동시 고려 위협 수. 없으면 기존 완벽 동작(테스트용).
// 반환 { x, y, safe }: 갈 목표점 + 완전 생존(위협 없음) 여부.
function decideTarget(game, W, H, pr, homeY, tier) {
  const p = game.player;
  const simT = tier ? tier.sim : SIM_T;
  const aimDeg = tier ? tier.aimDeg : 0;
  const threatLim = tier ? tier.threats : Infinity;
  let threats = collectThreats(game);
  // 판 읽기 한계: 동시에 고려하는 위협을 가까운 것부터 threatLim개로 제한(사람 MOT 약 4~5개).
  if (Number.isFinite(threatLim) && threats.length > threatLim) {
    threats = threats
      .map((th) => { const tx = th.k === 1 ? th.baseX : th.x; const ddx = tx - p.x, ddy = th.y - p.y; return { th, d: ddx * ddx + ddy * ddy }; })
      .sort((a, b) => a.d - b.d).slice(0, threatLim).map((o) => o.th);
  }

  // 후보 목표: 회피 지점(bonus 0, 세로·대각 포함) + 조준 지점 + 파워업 지점.
  const topY = H * TOP_LIM, botY = H - pr;
  const targets = [];
  for (const [dx, dy] of OFFS)
    targets.push({ x: clamp(p.x + dx, pr, W - pr), y: clamp(homeY + dy, topY, botY), bonus: 0 });
  // 몬테카를로: 무작위 도피처를 화면 전체(위쪽 포함)에 뿌려, 고정 후보로 못 찾는 틈새·빈 공간을 발견한다.
  for (let i = 0; i < RAND_N; i++)
    targets.push({ x: clamp(pr + Math.random() * (W - 2 * pr), pr, W - pr), y: clamp(topY + Math.random() * (botY - topY), topY, botY), bonus: 0 });

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
    let leadX = tgt.x + evx * tof;
    // 조준 각오차: 사람은 완벽 조준 못 한다. 표적까지 세로거리 × tan(오차각)만큼 x를 무작위로 흔든다.
    if (aimDeg > 0) { const d = Math.max(1, p.y - tgt.y); leadX += gauss() * d * Math.tan((aimDeg * Math.PI) / 180); }
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

  // 각 목표를 시뮬레이션해 (생존 시간 + 안전 시 이득 + 여유 공간)이 가장 큰 목표를 고른다.
  // 여유 공간 보너스는 위협이 많을수록 강해진다: 위험하면 넓은 빈 공간(위쪽)으로 도피, 안전하면 조준/획득 우선.
  const step = CFG.player.speed * SIM_DT;
  const threatFactor = Math.min(1, threats.length / 6);
  // 제자리가 위험할 때만 여유 공간(빈 곳·위쪽) 도피 보너스를 켠다. 제자리가 안전하면 불필요한 이동을 막는다
  //   (안 맞을 탄에 괜히 움직이지 않게). 위험하면 넓은 빈 공간으로 도피 = 위쪽이 비면 위로 올라간다.
  const inDanger = simulate(threats, { x: p.x, y: p.y }, p.x, p.y, step, W, H, pr, simT) < simT;
  let best = -Infinity, bx = p.x, by = homeY;
  for (const tg of targets) {
    const surv = simulate(threats, tg, p.x, p.y, step, W, H, pr, simT);
    let s = surv;
    if (surv >= simT) { // 완전 생존한 목표에만 이득을 얹는다(자살 유도 방지)
      s += tg.bonus;
      if (inDanger) s += (clearanceAt(threats, tg.x, tg.y) / H) * CLEAR_BONUS * threatFactor;
    }
    if (s > best) { best = s; bx = tg.x; by = tg.y; }
  }
  return { x: bx, y: by, safe: best >= simT };
}

export function autopilotStep(game, dt, W, H) {
  const p = game.player;
  if (!p) return;
  const pr = p.r, homeY = H * CFG.player.yRatio;

  // 실력 티어 조회(game.apSkill). 없으면 기존 완벽 동작(테스트·기본 안전망).
  const tier = (game.apSkill && CFG.autopilot.tiers[game.apSkill]) || null;
  const react = tier ? tier.react : DECIDE_EVERY;

  // 조작 갱신은 사람 속도로: react(반응 지연) 주기마다만 목표를 새로 '결정'하고, 그 사이엔 유지한다.
  // 판단(시뮬레이션)은 그 순간 정확히 하되, 매 프레임 방향을 바꾸지 않아 사람처럼 움직인다.
  if (game.apTimer == null || game.apTarget == null) {
    game.apTimer = 0;
    game.apTarget = { x: p.x, y: homeY, safe: true };
  }
  game.apTimer -= dt;
  if (game.apTimer <= 0) {
    game.apTimer += react;
    game.apTarget = decideTarget(game, W, H, pr, homeY, tier);
  }

  // 이동: 정한 목표점으로 최고 속도로(관성 없음 - 사용자 지시). 목표 자체가 주기적으로만 바뀐다.
  // 안전(위협 없음)할 땐 작은 편차를 무시해 떨림을 막는다.
  const move = CFG.player.speed * dt;
  const bx = game.apTarget.x, by = game.apTarget.y, safe = game.apTarget.safe;
  const dxm = bx - p.x, dym = by - p.y;
  if (!safe || Math.abs(dxm) > DEADZONE) p.x += clamp(dxm, -move, move);
  if (!safe || Math.abs(dym) > DEADZONE) p.y += clamp(dym, -move, move);
  p.x = clamp(p.x, pr, W - pr);
  p.y = clamp(p.y, pr, H - pr);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
