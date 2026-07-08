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

// 전방 화력 사양(정면 부채만). front 1~40. 측면·후방은 옵션기·꼬리기가 담당(docs/05).
//  - 1~8단계: 탄 수 1→8발, 개별 탄 균일(크기·색). 데미지 완만(1,1,2,2,3,3,4,4).
//  - 9~40단계: 8발 고정, 가운데 탄부터 한 발씩 진화(4티어). 진화 탄만 데미지·색 상승.
// 반환: { bullets: [{angle(도), tier(0~4), dmg}], r }.
export function frontSpec(front) {
  const F = CFG.parts.front;
  front = Math.max(1, Math.min(front, F.max));
  const shots = Math.min(front, 8);
  const baseDmg = 1 + Math.floor((shots - 1) / 2);       // 1,1,2,2,3,3,4,4
  const r = F.rBase + baseDmg * F.rGrow;                 // rGrow=0이라 개별 탄 크기 고정
  const evoSteps = Math.max(0, front - 8);               // 진화에 투입된 P 수
  const spread = shots === 1 ? 0 : Math.min((shots - 1) * 7, 84);
  const rankOf = centerRanks(shots);
  const bullets = [];
  for (let i = 0; i < shots; i++) {
    const angle = shots === 1 ? 0 : -spread / 2 + (spread * i) / (shots - 1);
    const rank = rankOf[i];
    // rank번째로 안쪽인 탄은 evoSteps가 rank+1 이상일 때부터 진화. 8스텝마다 티어 +1.
    const tier = evoSteps >= rank + 1 ? Math.min(Math.floor((evoSteps - (rank + 1)) / 8) + 1, F.tierMax) : 0;
    bullets.push({ angle, tier, dmg: baseDmg + tier * F.shapeDmg });
  }
  return { bullets, r };
}

// 플레이어 자동 발사(전방 화력). 정면 = 위쪽(-y), deg 부호는 좌우로 벌어짐.
export function playerFire(game) {
  const p = game.player;
  const spec = frontSpec(game.front);
  for (const b of spec.bullets) {
    const rad = (b.angle * Math.PI) / 180;
    game.bullets.push({
      x: p.x, y: p.y - p.r,
      vx: Math.sin(rad) * CFG.bullet.speed,
      vy: -Math.cos(rad) * CFG.bullet.speed,
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
