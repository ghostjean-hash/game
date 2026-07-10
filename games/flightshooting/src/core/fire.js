// 발사 로직 (순수). DOM/Canvas 미의존. 사운드는 game.sfx 배열로만 알린다.
import { CFG } from '../data/numbers.js';

// 모든 총알 속도 배수: 강화 3단계마다 한 계단 빨라진다(사용자 지시 2026-07-10). tier = 그 무기의 진화 단계(0~10).
export function speedMul(tier) {
  return 1 + Math.floor((tier || 0) / 3) * CFG.bullet.speedPer3;
}

// 메인 총알 사양(내 비행기가 쏜다, 직진). front 1~18: 1~8 = 탄 수, 9~18 = 진화 단계 1~10.
//   진화 단계는 8발 전부 같은 tier(일괄, 사용자 확정 2026-07-10). 빔 형태가 단계마다 패턴으로 바뀐다(view).
//   여러 발은 부채로 벌어지지 않고 laneGap 간격으로 가로로 나란히 곧게 직진한다(xOff = 중앙 기준 가로 위치).
// 반환: { bullets: [{xOff, tier, dmg}], r, tier }.
export function frontSpec(front) {
  const F = CFG.parts.front;
  front = Math.max(1, Math.min(front, F.max));
  const shots = Math.min(front, 8);
  const tier = Math.max(0, front - 8);              // 0~10 일괄 진화 단계
  const baseDmg = 1 + Math.floor((shots - 1) / 2);  // 1,1,2,2,3,3,4,4
  const dmg = baseDmg + tier * F.tierDmg;
  const bullets = [];
  for (let i = 0; i < shots; i++) {
    const xOff = shots === 1 ? 0 : (-(shots - 1) / 2 + i) * F.laneGap; // 중앙 기준 나란히
    bullets.push({ xOff, tier, dmg });
  }
  return { bullets, r: F.rBase, tier };
}

// 메인 총알 자동 발사. 정면 = 위쪽(-y). 부채 없이 나란히 곧게 직진(vx=0). 속도는 진화 단계로 3단계마다 상승.
export function playerFire(game) {
  const p = game.player;
  const spec = frontSpec(game.front);
  const vStag = CFG.parts.front.vStagger || 0;
  const speed = CFG.bullet.speed * speedMul(spec.tier);
  for (const b of spec.bullets) {
    game.bullets.push({
      x: p.x + b.xOff, y: p.y - p.r + Math.abs(b.xOff) * vStag, // 바깥 탄일수록 살짝 뒤(아래) = V자 대형
      vx: 0, vy: -speed,
      r: spec.r, dmg: b.dmg, kind: 'main', tier: b.tier, // tier로 view가 형태·색 분기
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
