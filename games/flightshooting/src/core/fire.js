// 발사 로직 (순수). DOM/Canvas 미의존. 사운드는 game.sfx 배열로만 알린다.
import { CFG } from '../data/numbers.js';

// 전방 화력 1~8단계 사양(정면 부채만). 측면·후방은 옵션기가 담당(docs/05).
// 단계당 탄 +1, 데미지는 완만 상승(1,1,2,2,3,3,4,4). 위력은 탄 굵기로도 보인다.
// shapeTier(0~4): 만렙(L8) 후 P를 더 먹어 오르는 모양 진화 단계. 티어당 데미지 +shapeDmg(docs/05 1.1.1).
export function frontSpec(L, shapeTier = 0) {
  L = Math.max(1, Math.min(L, CFG.parts.front.max));
  const shots = L;                              // 정면 갈래 수 1~8
  const baseDmg = 1 + Math.floor((L - 1) / 2);  // 1,1,2,2,3,3,4,4
  const dmg = baseDmg + shapeTier * CFG.parts.front.shapeDmg; // 모양 진화 시 위력 상승
  const r = CFG.parts.front.rBase + baseDmg * CFG.parts.front.rGrow; // 히트박스는 L 기준(모양 무관)
  const spread = shots === 1 ? 0 : Math.min((shots - 1) * 7, 84);
  const angles = [];
  for (let i = 0; i < shots; i++) {
    angles.push(shots === 1 ? 0 : -spread / 2 + (spread * i) / (shots - 1));
  }
  return { angles, dmg, r };
}

// 플레이어 자동 발사(전방 화력). 정면 = 위쪽(-y), deg 부호는 좌우로 벌어짐.
export function playerFire(game) {
  const p = game.player;
  const shape = game.shapeTier || 0;
  const spec = frontSpec(game.front, shape);
  for (const deg of spec.angles) {
    const rad = (deg * Math.PI) / 180;
    game.bullets.push({
      x: p.x, y: p.y - p.r,
      vx: Math.sin(rad) * CFG.bullet.speed,
      vy: -Math.cos(rad) * CFG.bullet.speed,
      r: spec.r, dmg: spec.dmg, kind: 'main', shape, // shape로 view가 모양 렌더 분기
    });
  }
  game.sfx.push('shoot');
}

// 적/보스 → 표적 조준 발사.
export function enemyFireAt(game, e, tx, ty, speed = CFG.enemyBullet.speed) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  game.eBullets.push({
    x: e.x, y: e.y, vx: (dx / d) * speed, vy: (dy / d) * speed, r: CFG.enemyBullet.r,
  });
}
