// 발사 로직 (순수). DOM/Canvas 미의존. 사운드는 game.sfx 배열로만 알린다.
import { CFG } from '../data/numbers.js';

// 화력 1~20단계 사양. 홀수 레벨 = 탄(갈래) 추가, 짝수 레벨 = 데미지 + 탄 굵기 상승(위력 교대).
// 매 단계 반드시 무언가 달라진다. 위력은 탄 굵기에 연동해 눈에도 보이게 한다.
export function fireSpec(L) {
  L = Math.max(1, Math.min(L, CFG.maxPower));
  const shots = Math.min(Math.ceil(L / 2), 10);   // 정면 갈래 수 1~10 (홀수 레벨에서 +1)
  const dmg = 1 + Math.floor(L / 2);              // 데미지 1~11 (짝수 레벨에서 +1)
  const r = 3 + dmg * 0.9;                        // 위력 오를수록 탄이 굵어짐
  const spread = shots === 1 ? 0 : Math.min((shots - 1) * 8, 96);
  const angles = [];
  for (let i = 0; i < shots; i++) {
    angles.push(shots === 1 ? 0 : -spread / 2 + (spread * i) / (shots - 1));
  }
  if (L >= 12) angles.push(-70, 72);        // 측면 지원탄
  if (L >= 17) angles.push(160, 180, 200);  // 후방 지원탄(정후방 180 포함 대칭)
  return { angles, dmg, r };
}

// 플레이어 자동 발사. 정면 = 위쪽(-y), deg 부호는 좌우로 벌어짐.
export function playerFire(game) {
  const p = game.player;
  const spec = fireSpec(game.power);
  for (const deg of spec.angles) {
    const rad = (deg * Math.PI) / 180;
    game.bullets.push({
      x: p.x, y: p.y - p.r,
      vx: Math.sin(rad) * CFG.bullet.speed,
      vy: -Math.cos(rad) * CFG.bullet.speed,
      r: spec.r, dmg: spec.dmg,
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
