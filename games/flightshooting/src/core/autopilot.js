// 자동 플레이 조작 (순수). DOM/입력 미의존 - game.player 위치를 스스로 조정한다.
// 전략: 급박한 적탄은 좌우로 피하되, 안전할 때는 가장 가까운 적을 조준해 쏴 없애고(적이 쌓여
// 내려와 부딪히는 죽음을 막는다) 근처 파워업을 줍는다. 발사는 원래 자동이라 건드리지 않는다.
import { CFG } from '../data/numbers.js';

const SCAN_UP = 360;   // 위쪽 이 거리까지 접근 위협 감지
const SCAN_DOWN = 34;  // 이미 지나간(아래) 위협 무시 여유
const LANE = 140;      // 좌우 이 폭 안의 위협만 회피 대상

export function autopilotStep(game, dt, W, H) {
  const p = game.player;
  if (!p) return;
  const move = CFG.player.speed * dt;
  const homeY = H * CFG.player.yRatio;

  // 1) 급박 위협(적탄·근접 적·보스) 회피 조향. 가깝고 곧 닿을수록 가중이 크다.
  let steer = 0, danger = 0;
  const threat = (ox, oy, w) => {
    const dy = oy - p.y;
    if (dy > SCAN_DOWN || dy < -SCAN_UP) return;
    const dx = p.x - ox, adx = Math.abs(dx);
    if (adx > LANE) return;
    const near = 1 - adx / LANE;
    const imminent = 1 - Math.abs(dy) / SCAN_UP;
    const prox = near * (0.35 + 0.65 * imminent) * w;
    steer += (dx >= 0 ? 1 : -1) * prox;
    danger += prox;
  };
  for (const b of game.eBullets) threat(b.x, b.y, 2.6); // 적탄 최우선 회피
  for (const e of game.enemies) threat(e.x, e.y, 1.4);
  if (game.boss && !game.boss.entering) threat(game.boss.x, game.boss.y + (game.boss.ry || 0), 1.0);

  let tx;
  if (danger > 0.22) {
    // 위협 반대 방향으로 크게 벗어난다(벽이면 반대로 튕김은 clamp가 처리).
    let dir = steer >= 0 ? 1 : -1;
    if (p.x + dir * 70 < p.r || p.x + dir * 70 > W - p.r) dir = -dir;
    tx = p.x + dir * 280;
  } else {
    // 안전: 가까운 파워업을 줍거나, 없으면 가장 근접한 적을 조준해 쏴 없앤다.
    let pu = null, pd = Infinity;
    for (const it of game.powerups) {
      if (it.y > p.y + 30) continue; // 이미 아래로 지나간 것 제외
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < pd) { pd = d; pu = it; }
    }
    let aimX = null, aimY = -Infinity;
    for (const e of game.enemies) {
      if (e.y < p.y - 30 && e.y > aimY) { aimY = e.y; aimX = e.x; } // 플레이어 위쪽 중 가장 가까운 적
    }
    if (game.boss && !game.boss.entering && aimX == null) aimX = game.boss.x; // 웨이브 없으면 보스 조준
    if (pu && (danger < 0.1 || pd < 150)) tx = pu.x;
    else if (aimX != null) tx = aimX;
    else tx = W / 2;
  }

  p.x += clamp(tx - p.x, -move, move);
  p.y += clamp(homeY - p.y, -move, move);
  p.x = Math.max(p.r, Math.min(W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(H - p.r, p.y));
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
