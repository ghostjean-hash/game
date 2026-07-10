// 발사 로직 (순수). DOM/Canvas 미의존. 사운드는 game.sfx 배열로만 알린다.
import { CFG } from '../data/numbers.js';

// 모든 총알 속도 배수: 강화 3단계마다 한 계단 빨라진다(사용자 지시 2026-07-10). tier = 그 탄의 진화 단계(0~10).
export function speedMul(tier) {
  return 1 + Math.floor((tier || 0) / 3) * CFG.bullet.speedPer3;
}

// 발마다 중앙 근접 순번(rank)을 매긴다: 중앙선에 가까운 탄부터, 거리가 같으면 왼쪽 먼저.
// 반환 rankOf[i] = angle 인덱스 i의 순번(0=가장 안쪽).
function centerRanks(n) {
  const c = (n - 1) / 2;
  const order = [...Array(n).keys()].sort((a, b) => (Math.abs(a - c) - Math.abs(b - c)) || (a - b));
  const rankOf = new Array(n);
  order.forEach((idx, rank) => { rankOf[idx] = rank; });
  return rankOf;
}

// 메인 총알 사양(내 비행기가 쏜다, 직진). front 1~88 = 강화 단계.
//  - 1~8단계: 탄 수 1→8발(강화할 때마다 발 1개씩 추가), 개별 탄 균일. 데미지 완만(1,1,2,2,3,3,4,4).
//  - 9단계~: 8발 고정, **가운데 탄부터 한 발씩** 모양 진화(발별 순차, 사용자 지시). 8스텝마다 그 탄의 tier +1(최대 10).
//    진화한 탄만 형태·데미지·속도가 오르고, 아직 기본인 탄은 그대로다. 빔 형태 패턴은 view가 tier로 그린다.
//  - 여러 발은 부채 없이 laneGap 간격으로 가로로 나란히 곧게 직진(xOff = 중앙 기준 가로 위치).
// 반환: { bullets: [{xOff, tier(0~10), dmg}], r }.
export function frontSpec(front) {
  const F = CFG.parts.front;
  front = Math.max(1, Math.min(front, F.max));
  const shots = Math.min(front, 8);
  const baseDmg = 1 + Math.floor((shots - 1) / 2);       // 1,1,2,2,3,3,4,4
  const r = F.rBase + baseDmg * F.rGrow;                 // rGrow=0이라 개별 탄 크기 고정
  const evoSteps = Math.max(0, front - 8);               // 진화에 투입된 P 수
  const rankOf = centerRanks(shots);
  const bullets = [];
  for (let i = 0; i < shots; i++) {
    const xOff = shots === 1 ? 0 : (-(shots - 1) / 2 + i) * F.laneGap; // 중앙 기준 나란히
    const rank = rankOf[i];
    // rank번째로 안쪽인 탄은 evoSteps가 rank+1 이상일 때부터 진화. 8스텝마다 티어 +1.
    const tier = evoSteps >= rank + 1 ? Math.min(Math.floor((evoSteps - (rank + 1)) / 8) + 1, F.tierMax) : 0;
    bullets.push({ xOff, tier, dmg: baseDmg + tier * F.shapeDmg });
  }
  return { bullets, r };
}

// 메인 총알 자동 발사. 정면 = 위쪽(-y). 부채 없이 나란히 곧게 직진(vx=0). 진화한 탄일수록 속도↑(발별 tier).
export function playerFire(game) {
  const p = game.player;
  const spec = frontSpec(game.front);
  const vStag = CFG.parts.front.vStagger || 0;
  for (const b of spec.bullets) {
    const speed = CFG.bullet.speed * speedMul(b.tier);
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
