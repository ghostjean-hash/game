// 캔버스 렌더링 (game 상태를 읽어 그리기만). 로직 없음. 색은 colors.js에서만.
import { COLORS } from '../data/colors.js';
import { CFG } from '../data/numbers.js';

export function render(ctx, game, W, H) {
  ctx.clearRect(0, 0, W, H);
  drawStars(ctx, game);
  drawZone(ctx, game);        // 플레이어 아래에 깔리는 에너지존 오라
  drawPowerups(ctx, game);
  drawEnemies(ctx, game);
  drawBoss(ctx, game);
  drawEnemyBullets(ctx, game);
  drawBullets(ctx, game);
  drawOptions(ctx, game);     // 좌우 부속 비행기
  drawPlayer(ctx, game);
  drawParticles(ctx, game);
}

// 에너지존: 플레이어 중심 반투명 오라(글로우 대신 radial gradient - 단일 요소라 발열 부담 적음).
function drawZone(ctx, game) {
  const z = game.zone, p = game.player;
  if (!z || z.level <= 0 || !p) return;
  const R = CFG.parts.zone.radius[z.level] * (1 + Math.sin((game.elapsed || 0) * 3) * 0.04);
  ctx.save();
  ctx.translate(p.x, p.y);
  const grad = ctx.createRadialGradient(0, 0, R * 0.35, 0, 0, R);
  grad.addColorStop(0, 'rgba(169,139,255,0.03)');
  grad.addColorStop(0.7, 'rgba(169,139,255,0.10)');
  grad.addColorStop(1, 'rgba(169,139,255,0.24)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(169,139,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// 옵션기: 작은 삼각 기체(레이저=시안, 미사일=주황). 최대 8대라 글로우 생략(발열).
function drawOptions(ctx, game) {
  for (const o of game.options) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = o.type === 'laser' ? COLORS.option : COLORS.missile;
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(-5, 5); ctx.lineTo(0, 2); ctx.lineTo(5, 5); ctx.closePath();
    ctx.fill();
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

function drawPlayer(ctx, game) {
  const p = game.player;
  if (!p) return;
  if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return; // 무적 깜빡
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 14;
  // 엔진 불꽃(아래)
  ctx.fillStyle = COLORS.engine;
  ctx.beginPath();
  const fl = p.r * (1.1 + Math.random() * 0.5);
  ctx.moveTo(-5, p.r); ctx.lineTo(0, p.r + fl); ctx.lineTo(5, p.r); ctx.closePath();
  ctx.fill();
  // 기체(위쪽 향한 삼각형)
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(0, -p.r - 4); ctx.lineTo(-p.r, p.r); ctx.lineTo(0, p.r * 0.4); ctx.lineTo(p.r, p.r); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    // 적은 화면에 다수 존재 → 글로우 생략(발열/성능). 색 채움으로 형태 표현.
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.color;
    if (e.type === 'drone') {
      ctx.beginPath();
      ctx.moveTo(0, e.r); ctx.lineTo(-e.r, -e.r * 0.6); ctx.lineTo(0, -e.r * 0.3); ctx.lineTo(e.r, -e.r * 0.6);
      ctx.closePath(); ctx.fill();
    } else if (e.type === 'weaver') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rr = i % 2 === 0 ? e.r : e.r * 0.5;
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
      ctx.fillStyle = COLORS.enemy.gunnerEye;
      ctx.fillRect(-4, e.r * 0.9 - 6, 8, 6);
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
  // 포신부(아래)
  ctx.fillStyle = isFinal ? COLORS.boss.gunFinal : COLORS.boss.gunMini;
  ctx.fillRect(-10, boss.ry - 4, 20, 12);
  ctx.fillStyle = COLORS.boss.coreDark;
  ctx.beginPath(); ctx.arc(0, 6, boss.rx * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.boss.coreLight;
  ctx.beginPath(); ctx.arc(0, 6, boss.rx * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 총알/적탄은 수십 개가 매 프레임 그려지므로 글로우를 걸지 않는다(발열 핵심 요인).
// 밝은 색 자체로 네온 느낌을 낸다.
function drawBullets(ctx, game) {
  ctx.save();
  for (const b of game.bullets) {
    if (b.kind === 'laser') {
      // 레이저: 얇고 밝은 세로 막대
      ctx.fillStyle = COLORS.laser;
      ctx.fillRect(b.x - b.r * 0.5, b.y - 9, b.r, 13);
    } else if (b.kind === 'missile') {
      // 미사일: 진행 방향으로 회전한 캡슐 + 짧은 꼬리
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.fillStyle = COLORS.missileTrail;
      ctx.beginPath();
      ctx.arc(b.x - Math.cos(Math.atan2(b.vy, b.vx)) * 6, b.y - Math.sin(Math.atan2(b.vy, b.vx)) * 6, b.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.missile;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r * 0.7, b.r * 1.3, ang, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 전방 화력 기본탄
      ctx.fillStyle = COLORS.bullet;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawEnemyBullets(ctx, game) {
  ctx.save();
  ctx.fillStyle = COLORS.enemyBullet;
  for (const b of game.eBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerups(ctx, game) {
  const label = { P: 'P', S: 'S', E: 'E', H: '♥', B: 'B' };
  for (const it of game.powerups) {
    const col = COLORS.powerup[it.kind];
    ctx.save();
    ctx.translate(it.x, it.y);
    const pulse = 1 + Math.sin(it.t * 6) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(10,14,24,0.9)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, it.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = 'bold 13px ui-monospace, monospace';
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
