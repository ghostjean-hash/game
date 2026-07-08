// 캔버스 렌더링 (game 상태를 읽어 그리기만). 로직 없음. 색은 colors.js에서만.
import { COLORS } from '../data/colors.js';
import { CFG } from '../data/numbers.js';

export function render(ctx, game, W, H) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, game, W, H); // 구역별 색조 성운(깊이감)
  drawStars(ctx, game);
  drawZone(ctx, game);        // 플레이어 아래에 깔리는 에너지존 오라
  drawPowerups(ctx, game);
  drawEnemies(ctx, game);
  drawBoss(ctx, game);
  drawEnemyBullets(ctx, game);
  drawBullets(ctx, game);
  drawTail(ctx, game);        // 뒤쪽 꼬리 비행기(플레이어보다 먼저 = 뒤에 깔림)
  drawOptions(ctx, game);     // 좌우 부속 비행기
  drawPlayer(ctx, game);
  drawParticles(ctx, game);
}

// 구역별 색조의 은은한 성운 2개(radial gradient). 깊이감 + 구역마다 다른 분위기.
function drawBackground(ctx, game, W, H) {
  const arr = COLORS.stageNebula;
  const s = (game.stage || 1) - 1;
  const c1 = arr[s % arr.length];
  const c2 = arr[(s + 3) % arr.length];
  let g = ctx.createRadialGradient(W * 0.28, H * 0.22, 0, W * 0.28, H * 0.22, W * 0.75);
  g.addColorStop(0, c1); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * 0.74, H * 0.72, 0, W * 0.74, H * 0.72, W * 0.65);
  g.addColorStop(0, c2); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// 에너지존: 플레이어 중심 반투명 오라(글로우 대신 radial gradient - 단일 요소라 발열 부담 적음).
function drawZone(ctx, game) {
  const z = game.zone, p = game.player;
  if (!z || z.level <= 0 || !p) return;
  const R = CFG.parts.zone.radius[z.level] * (1 + Math.sin((game.elapsed || 0) * 3) * 0.04);
  const c = COLORS.zoneRgbByLevel[z.level - 1] || COLORS.zoneRgbByLevel[COLORS.zoneRgbByLevel.length - 1];
  ctx.save();
  ctx.translate(p.x, p.y);
  const grad = ctx.createRadialGradient(0, 0, R * 0.35, 0, 0, R);
  grad.addColorStop(0, `rgba(${c},0.03)`);
  grad.addColorStop(0.7, `rgba(${c},0.10)`);
  grad.addColorStop(1, `rgba(${c},0.24)`);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(${c},0.5)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// 옵션기: 작은 삼각 기체(레이저=시안, 미사일=주황). 최대 8대라 글로우 생략(발열).
// 옵션기 = 토토로: 회색 통통한 몸 + 뾰족 귀 2개 + 흰 배 + 눈 2개. 레이저=밝은 회색, 미사일=진회색.
function drawOptions(ctx, game) {
  for (const o of game.options) {
    const body = o.type === 'laser' ? COLORS.totoro.laser : COLORS.totoro.missile;
    const s = 6;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = body;
    // 귀 2개(위 뾰족)
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.8, -s * 1.5); ctx.lineTo(-s * 0.12, -s * 0.9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.7); ctx.lineTo(s * 0.8, -s * 1.5); ctx.lineTo(s * 0.12, -s * 0.9); ctx.closePath(); ctx.fill();
    // 몸통(회색 타원)
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    // 흰 배
    ctx.fillStyle = COLORS.totoro.belly;
    ctx.beginPath(); ctx.ellipse(0, s * 0.25, s * 0.55, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    // 눈 2개
    ctx.fillStyle = COLORS.totoro.eye;
    ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.2, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.2, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// 꼬리 비행기: 작은 둥근 유도탄 발사기(옵션기 토토로와 구분되는 매끈한 캡슐 + 아래 노즐 불빛 + 눈).
// 무기 단계(weapon 1~4)가 높을수록 노즐 불빛이 밝고 커진다(성장 가시화).
function drawTail(ctx, game) {
  if (!game.tail) return;
  const col = COLORS.tail;
  for (const o of game.tail) {
    const s = 5.5;
    const w = o.weapon || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    // 아래 노즐 불빛(무기 단계별 밝기·크기)
    ctx.fillStyle = COLORS.missileTrail;
    ctx.beginPath(); ctx.ellipse(0, s * 0.9, s * 0.4, s * (0.5 + w * 0.18), 0, 0, Math.PI * 2); ctx.fill();
    // 몸통(둥근 캡슐)
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.85, s, 0, 0, Math.PI * 2); ctx.fill();
    // 눈 2개
    ctx.fillStyle = '#173a2a';
    ctx.beginPath(); ctx.arc(-s * 0.32, -s * 0.15, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.32, -s * 0.15, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawStars(ctx, game) {
  for (const s of game.stars) {
    ctx.globalAlpha = 0.2 + s.z * 0.5;
    ctx.fillStyle = COLORS.star;
    const sz = s.z * 2;
    ctx.fillRect(s.x, s.y, sz, sz);
  }
  ctx.globalAlpha = 1;
}

// 플레이어 = 와라와라: 위가 좁고 아래가 통통한 하얀 물방울 몸통 + 검은 점 눈 2개 + 부드러운 발광.
function drawPlayer(ctx, game) {
  const p = game.player;
  if (!p) return;
  if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return; // 무적 깜빡
  const r = p.r;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = COLORS.warawaraGlow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.warawara;
  ctx.beginPath();
  ctx.moveTo(0, -r - 2);
  ctx.bezierCurveTo(-r * 1.05, -r * 0.5, -r * 0.95, r, 0, r + 1);
  ctx.bezierCurveTo(r * 0.95, r, r * 1.05, -r * 0.5, 0, -r - 2);
  ctx.closePath();
  ctx.fill();
  // 아주 작은 손(좌우 하단) + 발(아래) - 몸통과 같은 흰색, 살짝 튀어나오게
  ctx.beginPath(); ctx.ellipse(-r * 0.82, r * 0.42, r * 0.17, r * 0.26, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.82, r * 0.42, r * 0.17, r * 0.26, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 1.02, r * 0.2, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.3, r * 1.02, r * 0.2, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.warawaraEye;
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.08, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.08, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 정령 눈(검은 점, 필요 시 흰 눈알 위에). 모든 적을 요정·정령 느낌으로 통일하는 공통 요소.
function spriteEyes(ctx, r, spread = 0.34, ey = -0.12, sz = 0.15, white = false) {
  if (white) {
    ctx.fillStyle = '#f4f4fa';
    ctx.beginPath(); ctx.arc(-r * spread, r * ey, r * sz * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * spread, r * ey, r * sz * 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#191420';
  ctx.beginPath(); ctx.arc(-r * spread, r * ey, r * sz, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * spread, r * ey, r * sz, 0, Math.PI * 2); ctx.fill();
}

// 적 = 요정·정령: 공통으로 둥근 몸 + 눈, 종류별 특징(꼬리불·날개·방패·균열·화살)을 얹는다.
function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.color;
    const r = e.r;
    if (e.type === 'drone') {
      // 도깨비불 정령: 아래 흔들리는 꼬리불 + 둥근 몸 + 눈
      ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.5); ctx.quadraticCurveTo(0, r * 1.5, r * 0.5, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.85, 0, Math.PI * 2); ctx.fill();
      spriteEyes(ctx, r);
    } else if (e.type === 'weaver') {
      // 나비 요정: 좌우 반투명 날개 + 둥근 몸 + 눈
      ctx.save(); ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.ellipse(-r * 0.85, 0, r * 0.6, r * 1.05, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.85, 0, r * 0.6, r * 1.05, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
      spriteEyes(ctx, r, 0.22, -0.1, 0.13);
    } else if (e.type === 'gunner') {
      // 먼지 정령(스스와타리): 둥근 몸 + 흰 큰 눈
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
      spriteEyes(ctx, r, 0.3, -0.05, 0.14, true);
    } else if (e.type === 'bonus') {
      // 빛 정령(코다마): 발광하는 둥근 몸 + 큰 눈
      ctx.shadowColor = e.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      spriteEyes(ctx, r, 0.32, -0.05, 0.16, true);
    } else if (e.type === 'splitter') {
      // 분열 정령: 둥근 몸 + 중앙 균열(곧 쪼개질 암시) + 눈
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COLORS.enemy.gunnerEye; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.8); ctx.stroke();
      spriteEyes(ctx, r, 0.36, -0.18, 0.12);
    } else if (e.type === 'shard') {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      spriteEyes(ctx, r, 0.35, 0, 0.2);
    } else if (e.type === 'shielder') {
      // 방패 정령: 둥근 몸 + 눈 + 아래(정면) 방패 호
      ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
      spriteEyes(ctx, r, 0.3, -0.18, 0.12);
      ctx.strokeStyle = COLORS.enemy.shielderShield; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r + 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else if (e.type === 'rusher') {
      // 돌진 정령: 뾰족한 몸(돌진 중이면 진행 방향 회전) + 눈
      if (e.phase === 1) ctx.rotate(Math.atan2(e.vy, e.vx) - Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, r * 1.3); ctx.lineTo(-r * 0.7, -r * 0.7); ctx.quadraticCurveTo(0, -r * 0.2, r * 0.7, -r * 0.7); ctx.closePath(); ctx.fill();
      spriteEyes(ctx, r, 0.26, -0.32, 0.11);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
      spriteEyes(ctx, r);
    }
    ctx.restore();
  }
}

function drawBoss(ctx, game) {
  const boss = game.boss;
  if (!boss) return;
  const isFinal = boss.kind === 'final';
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.shadowColor = boss.color;
  ctx.shadowBlur = isFinal ? 20 : 14;
  ctx.fillStyle = boss.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, boss.rx, boss.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 포신부(아래, 발사구)
  ctx.fillStyle = isFinal ? COLORS.boss.gunFinal : COLORS.boss.gunMini;
  ctx.fillRect(-10, boss.ry - 4, 20, 12);
  // 정령 얼굴(가오나시류): 흰 눈알 2개 + 검은 동공
  ctx.fillStyle = '#f0eef6';
  ctx.beginPath(); ctx.arc(-boss.rx * 0.34, -2, boss.rx * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(boss.rx * 0.34, -2, boss.rx * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.boss.coreDark;
  ctx.beginPath(); ctx.arc(-boss.rx * 0.34, 0, boss.rx * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(boss.rx * 0.34, 0, boss.rx * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 총알/적탄은 수십 개가 매 프레임 그려지므로 글로우를 걸지 않는다(발열 핵심 요인).
// 밝은 색 자체로 네온 느낌을 낸다.
function drawBullets(ctx, game) {
  ctx.save();
  for (const b of game.bullets) {
    if (b.kind === 'laser') {
      // 사이드 총알. tier 0 = 기본 흰-보라 빔, tier 1~4 = 진화 원→타원→빔→링(시안). 진행 방향으로 회전.
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      const tier = b.tier || 0;
      if (tier === 0) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = COLORS.laser;
        ctx.fillRect(-b.r * 0.5, -12, b.r, 20);         // 라벤더 외곽(길게)
        ctx.fillStyle = COLORS.laserCore;
        ctx.fillRect(-b.r * 0.24, -10, b.r * 0.48, 16); // 흰 코어(가늘게)
        ctx.restore();
      } else {
        const sh = CFG.bullet.shapes[tier];
        const col = COLORS.bulletShapeTier[tier];
        const rx = b.r * sh.rx, ry = b.r * sh.ry;
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        if (sh.glow) { ctx.shadowColor = COLORS.bulletGlow; ctx.shadowBlur = sh.glow; }
        if (sh.ring) {
          ctx.lineWidth = rx * (1 - sh.ring);
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, rx * (1 + sh.ring) / 2, ry * (1 + sh.ring) / 2, ang, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, rx, ry, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    } else if (b.kind === 'missile') {
      // 꼬리 비행기 유도탄: 진행 방향 캡슐 + 짧은 꼬리. 무기 단계(weapon 1~4)별 색·크기.
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      const stage = COLORS.tailMissileByStage;
      const col = stage[Math.max(0, Math.min((b.weapon || 1) - 1, stage.length - 1))];
      ctx.fillStyle = COLORS.missileTrail;
      ctx.beginPath();
      ctx.arc(b.x - Math.cos(Math.atan2(b.vy, b.vx)) * 6, b.y - Math.sin(Math.atan2(b.vy, b.vx)) * 6, b.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r * 0.7, b.r * 1.3, ang, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 메인 총알: beam(레이저 강화 레벨)만큼 길고 굵어진다(관통 없음). 시안 고정 + beam↑이면 발광 강화.
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      const F = CFG.parts.front;
      const beam = b.beam || 0;
      const rx = b.r * (1 + beam * F.beamWidGrow);        // 굵기
      const ry = b.r * 2.2 * (1 + beam * F.beamLenGrow);  // 길이(기본 세로 타원 2.2배에서 더 늘어남)
      ctx.fillStyle = COLORS.bullet;
      if (beam > 0) { ctx.shadowColor = COLORS.bulletGlow; ctx.shadowBlur = Math.min(3 + beam * 0.4, 16); }
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, rx, ry, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

// 적탄: 빨강 몸 + 노란 코어로 아군 시안탄과 확실히 구분한다(사용자 "헷갈림" 대응).
function drawEnemyBullets(ctx, game) {
  ctx.save();
  for (const b of game.eBullets) {
    ctx.fillStyle = COLORS.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.enemyBulletCore;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 파워업 = 각진 육각형 아이템(둥근 적 정령과 형태로 구분) + 밝은 색 채움 + 흰 테두리 + 글자.
// 예외: 회복(H)은 육각형 없이 하트 모양 자체로 그린다(사용자 지시 2026-07-09).
function drawPowerups(ctx, game) {
  const label = { P: 'P', S: 'S', E: 'E', T: 'T', B: 'B' };
  for (const it of game.powerups) {
    const col = COLORS.powerup[it.kind];
    ctx.save();
    ctx.translate(it.x, it.y);
    const pulse = 1 + Math.sin(it.t * 6) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.fillStyle = col;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    if (it.kind === 'H') {
      // 회복 = 하트 모양 그 자체(빨간 채움 + 흰 테두리 + 글로우).
      const hs = it.r * 0.92;
      ctx.beginPath();
      ctx.moveTo(0, hs * 0.75);
      ctx.bezierCurveTo(hs * 1.2, -hs * 0.3, hs * 0.55, -hs * 1.15, 0, -hs * 0.35);
      ctx.bezierCurveTo(-hs * 0.55, -hs * 1.15, -hs * 1.2, -hs * 0.3, 0, hs * 0.75);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const fn = i === 0 ? 'moveTo' : 'lineTo';
      ctx[fn](Math.cos(a) * it.r, Math.sin(a) * it.r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#101420';
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label[it.kind], 0, 1);
    ctx.restore();
  }
}

function drawParticles(ctx, game) {
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, 1 - pt.age / pt.life);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
