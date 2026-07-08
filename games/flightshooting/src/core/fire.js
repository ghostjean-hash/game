// 발사 로직 (순수). DOM/Canvas 미의존. 사운드는 game.sfx 배열로만 알린다.
import { CFG } from '../data/numbers.js';

// 발마다 중앙 근접 순번(rank)을 매긴다: 중앙선에 가까운 탄부터, 거리가 같으면 왼쪽 먼저(docs/05 1.1.1).
// 반환 rankOf[i] = angle 인덱스 i의 순번(0=가장 안쪽).
function centerRanks(n) {
  const c = (n - 1) / 2;
  const order = [...Array(n).keys()].sort((a, b) => (Math.abs(a - c) - Math.abs(b - c)) || (a - b));
  const rankOf = new Array(n);
  order.forEach((idx, rank) => { rankOf[idx] = rank; });
  return rankOf;
}

// 메인 총알 사양(내 비행기가 쏜다, 직진). front 1~40. 사이드 총알·유도탄은 옵션기·꼬리기가 담당(docs/05).
//  - 1~8단계: 탄 수 1→8발, 개별 탄 균일(크기·색). 데미지 완만(1,1,2,2,3,3,4,4).
//  - 9~40단계: 8발 고정, 가운데 탄부터 한 발씩 진화(4티어). 진화 탄만 데미지·색 상승.
//  - 여러 발은 부채로 벌어지지 않고 laneGap 간격으로 가로로 나란히 곧게 직진한다(xOff = 중앙 기준 가로 위치).
// 반환: { bullets: [{xOff(가로 위치), tier(0~4), dmg}], r }.
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

// 메인 총알 자동 발사. 정면 = 위쪽(-y). 부채 없이 나란히 곧게 직진(vx=0).
export function playerFire(game) {
  const p = game.player;
  const spec = frontSpec(game.front);
  for (const b of spec.bullets) {
    game.bullets.push({
      x: p.x + b.xOff, y: p.y - p.r,
      vx: 0, vy: -CFG.bullet.speed,
      r: spec.r, dmg: b.dmg, kind: 'main', tier: b.tier, // tier로 view가 색·크기 분기
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
