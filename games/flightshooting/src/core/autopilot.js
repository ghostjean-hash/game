// 자동 플레이 조작 (순수). DOM/입력 미의존 - game.player 위치를 스스로 조정한다.
//
// 전략: '여러 수 앞 계획'(2단계 빔서치). 예전엔 한 목표로 가서 sim초 사는지만 보고(한 걸음 앞) 골라,
// 지금은 안전하지만 곧 갇히는 막다른 구석으로 들어가는 게 근본 약점이었다. 이제는 각 후보로 가서
// 절반 지평(seg=sim/2)을 굴려 '도착 지점'을 구한 뒤, 그 도착 지점에서 다시 최선의 다음 수를 뒀을 때의
// 생존까지 이어 평가한다(총 sim초 = 두 수). 첫 수만 생존하고 두 번째에 갇히는 목표는 낮게 매겨져
// 스스로 피하게 된다. 연산을 아끼려 첫 수 상위 BEAM개만 두 번째 수까지 확장한다(빔서치).
// 실제 이동은 계획의 '첫 수'만 따른다(receding horizon). 조준·획득·여유공간 이득은 예전처럼 얹는다.
// 발사는 원래 자동이라 건드리지 않고, 조준은 표적과 같은 x로 정렬해 총알이 맞게 유도한다.
import { CFG } from '../data/numbers.js';

const SIM_T = 1.5;       // 미래를 이 시간(초)까지 시뮬레이션해 생존을 평가(tier 없을 때 fallback 지평)
const SIM_DT = 0.04;     // 시뮬 시간 간격(초) - 작을수록 정밀, 클수록 빠름
const DEPTH = 2;         // 몇 수 앞까지 계획하는가. 각 수는 seg=지평/DEPTH초를 굴린다(막다른 곳 회피의 핵심)
const BEAM = 10;         // 빔서치 폭: 첫 수에서 완전 생존한 상위 후보 이만큼 두 번째 수까지 확장(연산 절감 vs 시야)
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
export function collectThreats(game) {
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

// 목표 tg로 최대 속도로 이동한다고 가정하고, 한 수(segT초) 동안 굴린다. tOff = 이 수가 시작되는
// 절대 시각(두 번째 수는 tOff=seg로 넘겨 위협의 미래 위치를 이어서 계산). 반환:
//   { t: 이 수 안에서 산 시간(충돌 시 그 시각, 무사하면 segT), x·y: 수 끝(또는 충돌) 지점 }.
// t가 클수록 안전하고, 끝 지점(x,y)은 다음 수의 출발점이 된다.
export function simulate(threats, tg, sx, sy, step, W, H, pr, segT, tOff) {
  let x = sx, y = sy;
  const steps = Math.round(segT / SIM_DT);
  for (let k = 1; k <= steps; k++) {
    const t = k * SIM_DT, at = tOff + t; // t=이 수 안 경과, at=게임 절대 시각(위협 궤적용)
    const dx = tg.x - x, dy = tg.y - y, d = Math.hypot(dx, dy);
    if (d > 1e-3) { const m = Math.min(step, d); x += (dx / d) * m; y += (dy / d) * m; }
    if (x < pr) x = pr; else if (x > W - pr) x = W - pr;
    if (y < pr) y = pr; else if (y > H - pr) y = H - pr;
    for (const th of threats) {
      let ox, oy;
      if (th.k === 1) { ox = th.baseX + th.amp * Math.sin((th.t0 + at) * th.freq); oy = th.y + th.vy * at; }
      else { ox = th.x + th.vx * at; oy = th.y + th.vy * at; }
      const rr = pr + th.r, ex = x - ox, ey = y - oy;
      if (ex * ex + ey * ey < rr * rr) return { t, x, y }; // 이 시각에 죽는다(충돌 지점 반환)
    }
  }
  return { t: segT, x, y }; // 이 수는 완전 생존, 끝 지점 반환
}

// 목표 지점 주변 '여유 공간': 가장 가까운 위협까지의 거리(현재 위치 기준). 넓을수록 위협 없는 빈 공간이다.
//   위협이 대부분 아래에 몰려 있으면 위쪽 지점의 여유가 커져, AI가 자연히 위쪽 빈 공간으로 올라간다.
export function clearanceAt(threats, tx, ty) {
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
// actor: 판단 주체 기체({x,y,r}). 생략 시 game.player(플레이어 자동조종). 친구 비행기(어린이 모드)는
//   자기 기체를 넘겨 같은 빔서치로 회피·조준한다(docs/09). game 공유 자원(적·탄·파워업·목숨)은 그대로 참조.
// 반환 { x, y, safe }: 갈 목표점 + 완전 생존(위협 없음) 여부.
// opts.clearWhenSafe(기본 true): 안전할 때도 빈 공간(위협 없는 곳)을 선호할지. 플레이어는 true(불필요한
//   피격 회피). 친구(어린이 모드)는 false로 넘겨, 안전할 땐 빈 구석으로 도망가지 않고 적을 조준하러 간다
//   (무기 발사가 목적). 위험할 때(inDanger)의 회피는 옵션과 무관하게 항상 작동한다 = 회피 판단은 동일.
// opts.mate(있으면): 분담 상대 기체(친구의 경우 플레이어). 화면 좌우를 나눠 서로 다른 쪽 적을 맡고, 상대가
//   노리는 아이템은 양보한다(협력 분담, 사용자 지시). 친구는 보스전이 아닐 때만 넘긴다(보스전엔 둘 다 집중).
export function decideTarget(game, W, H, pr, homeY, tier, actor, opts) {
  const p = actor || game.player;
  const clearWhenSafe = opts ? opts.clearWhenSafe !== false : true;
  const mate = opts ? opts.mate : null;
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
  let tgt = bonus;
  if (!tgt) {
    let bestSc = -Infinity;
    for (const e of game.enemies) {
      if (e.y >= p.y - AIM_MARGIN) continue;
      let sc = e.y; // 아래일수록(친구에 가까울수록) 우선
      // 분담: 상대(플레이어)와 화면 같은 반쪽에 있는 적은 후순위 → 반대쪽 적을 맡는다(반대쪽이 없으면 결국 선택).
      if (mate && (e.x - W / 2) * (mate.x - W / 2) > 0) sc -= H;
      if (sc > bestSc) { bestSc = sc; tgt = e; }
    }
  }
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

  // 분담: 상대(플레이어)가 가장 가까이서 노리는 아이템 하나는 양보한다(내가 먹으러 가면 키위새는 다른 걸, 사용자 지시).
  let mateItem = null;
  if (mate && game.powerups.length > 1) {
    let md = Infinity;
    for (const it of game.powerups) { const d = Math.hypot(it.x - mate.x, it.y - mate.y); if (d < md) { md = d; mateItem = it; } }
  }
  // 파워업: 목숨이 이미 최대면 회복 하트(H)는 무시(먹으러 갈 이유가 없다). 이미 아래로 지나친 것도 제외.
  // 남은 것 중 가장 가까운 하나를 실제 위치(세로 포함)로 향해 마중 나간다.
  let pu = null, pd = Infinity;
  const full = game.lives >= (game.maxLives || CFG.player.maxLives);
  for (const it of game.powerups) {
    if (it === mateItem) continue; // 상대 몫 양보(분담) - 아이템이 하나뿐이면 양보 안 함(위 length>1 조건)
    if (it.kind === 'H' && full) continue;
    if (it.y > p.y + 40) continue;
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    if (d < pd) { pd = d; pu = it; }
  }
  if (pu && pd < PICK_RANGE) targets.push({ x: clamp(pu.x, pr, W - pr), y: clamp(pu.y, topY, botY), bonus: PICK_BONUS });

  // 여러 수 앞 계획(2단계 빔서치). 각 목표를 한 수(seg=simT/DEPTH초)만 굴려 '도착 지점'과 첫 수 생존을
  // 구하고, 첫 수를 완전히 산 상위 BEAM개만 그 도착 지점에서 두 번째 수까지 이어 굴려 미래 생존을 더한다.
  // 점수 = 두 수 총 생존 + 안전 시 이득(조준/획득) + 위험 시 여유 공간. 실제 이동은 계획의 첫 수만 따른다.
  const step = CFG.player.speed * SIM_DT;
  const seg = simT / DEPTH;
  const threatFactor = Math.min(1, threats.length / 6);
  // 제자리가 위험할 때만 여유 공간(빈 곳·위쪽) 도피 보너스를 켠다. 제자리가 안전하면 불필요한 이동을 막는다
  //   (안 맞을 탄에 괜히 움직이지 않게). 위험하면 넓은 빈 공간으로 도피 = 위쪽이 비면 위로 올라간다.
  const inDanger = simulate(threats, { x: p.x, y: p.y }, p.x, p.y, step, W, H, pr, simT, 0).t < simT;

  // 1수: 각 후보로 seg초 이동해 생존 시간(_s1)과 도착 지점(_ex,_ey)을 구한다.
  for (const tg of targets) {
    const r1 = simulate(threats, tg, p.x, p.y, step, W, H, pr, seg, 0);
    tg._s1 = r1.t; tg._ex = r1.x; tg._ey = r1.y; tg._s2 = null;
  }
  // 2수: 첫 수를 완전히 산 후보를 '순수 생존(_s1)' 순으로 정렬해 상위 BEAM개만 확장한다(이득을 섞으면
  //   조준·획득 목표만 미래 평가를 받아 적 근처로만 가는 편향이 생긴다 - 그 버그를 제거). 각 도착 지점에서
  //   다시 모든 후보로 seg초(tOff=seg) 굴려, 두 번째 수 최선 생존을 그 후보의 미래 점수로 둔다.
  const alive = targets.filter((t) => t._s1 >= seg).sort((a, b) => b._s1 - a._s1);
  for (const tg of alive.slice(0, BEAM)) {
    let best2 = 0;
    for (const t2 of targets) {
      const r2 = simulate(threats, t2, tg._ex, tg._ey, step, W, H, pr, seg, seg);
      if (r2.t > best2) best2 = r2.t;
    }
    tg._s2 = best2;
  }

  // 점수 합산: 첫 수에서 죽는 목표는 그 짧은 생존만(회피 실패). 첫 수를 산 목표는 두 수 총 생존 + 이득.
  //   확장 안 된(BEAM 밖) 안전 후보는 미래를 seg로 낙관한다(첫 수를 완전히 살았으니 최소한 그 자리 유지는
  //   가능 - 0으로 깎으면 순수 회피 목표가 부당히 저평가돼 조준 목표에 밀린다). 위험할 땐 조준·획득 이득을
  //   억제하고 빈 공간을 더해, 적(=탄 발생원) 근처 대신 넓은 곳으로 도피한다.
  let best = -Infinity, bx = p.x, by = homeY;
  for (const tg of targets) {
    let s;
    if (tg._s1 < seg) {
      s = tg._s1; // 첫 수 도중 사망 = 낮은 점수(막다른 진입 억제)
    } else {
      s = seg + (tg._s2 != null ? tg._s2 : seg); // 두 수 총 생존(미확장 안전 후보는 낙관)
      s += tg.bonus * (inDanger ? 0.25 : 1);      // 위험 시 조준·획득 억제(회피 우선), 안전 시 정상(진행)
      // 빈 공간 선호: 적·탄이 몰린 곳으로 조준하러 붙는 습성을 줄이고 넓은 공간에서 싸우게 한다. 위험할 땐
      //   강하게(도피 우선). 안전할 땐 약하게(×0.35) 반영하되 '위협이 여럿일 때만' - 탄 하나가 멀리
      //   있는 상황에서까지 미세 이동해 떨리지 않게 게이트를 둔다.
      const clr = (clearanceAt(threats, tg.x, tg.y) / H) * CLEAR_BONUS * threatFactor;
      if (inDanger) s += clr; else if (threats.length >= 3 && clearWhenSafe) s += clr * 0.35;
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
