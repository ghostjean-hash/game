// 자동 플레이 조작 (순수). DOM/입력 미의존 - game.player 위치를 스스로 조정한다.
// 위협(적탄·적·보스)을 좌우로 피하고, 위협이 없으면 가장 가까운 파워업을 주우러 이동한다.
// 발사는 원래 자동이라 건드리지 않는다. 데모·밸런스 체감·검증용.
import { CFG } from '../data/numbers.js';

const SCAN_UP = 300;   // 위쪽 이 거리까지 접근 위협 감지
const SCAN_DOWN = 26;  // 이미 지나간(아래) 위협 무시 여유
const LANE = 100;      // 좌우 이 폭 안의 위협만 회피 대상

export function autopilotStep(game, dt, W, H) {
  const p = game.player;
  if (!p) return;
  const move = CFG.player.speed * dt;
  const homeY = H * CFG.player.yRatio;

  // 위협 조향: 위협이 왼쪽이면 오른쪽(+)으로, 오른쪽이면 왼쪽(-)으로 벗어난다.
  let steer = 0, danger = 0;
  const threat = (ox, oy, w) => {
    const dy = oy - p.y;
    if (dy > SCAN_DOWN || dy < -SCAN_UP) return;
    const dx = p.x - ox;
    if (Math.abs(dx) > LANE) return;
    const prox = (1 - Math.abs(dx) / LANE) * w;
    steer += (dx >= 0 ? 1 : -1) * prox;
    danger += prox;
  };
  for (const b of game.eBullets) threat(b.x, b.y, 1.4);
  for (const e of game.enemies) threat(e.x, e.y, 1.0);
  if (game.boss && !game.boss.entering) threat(game.boss.x, game.boss.y + (game.boss.ry || 0), 0.9);

  let tx;
  if (danger > 0.4) {
    // 위협 반대 방향으로 크게 벗어난다(벽이면 반대로 튕김은 clamp가 처리).
    let dir = steer >= 0 ? 1 : -1;
    if (p.x + dir * 60 < p.r || p.x + dir * 60 > W - p.r) dir = -dir;
    tx = p.x + dir * 220;
  } else {
    // 위협 없으면 가장 가까운(아직 안 지나간) 파워업으로.
    let best = null, bd = Infinity;
    for (const it of game.powerups) {
      if (it.y > p.y + 30) continue; // 이미 아래로 지나간 것 제외
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < bd) { bd = d; best = it; }
    }
    tx = best ? best.x : W / 2;
  }

  p.x += clamp(tx - p.x, -move, move);
  p.y += clamp(homeY - p.y, -move, move);
  p.x = Math.max(p.r, Math.min(W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(H - p.r, p.y));
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
