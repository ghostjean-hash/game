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

// 에너지존 = 펄스파: 플레이어 중심에서 퍼지는 링을 그린다. 커질수록 옅어져 파동이 나가는 게 보인다.
//   링 두께(lineWidth) = 피해 판정 폭과 같아 "여기 맞으면 아프다"가 직관적으로 읽힌다.
function drawZone(ctx, game) {
  const z = game.zone, p = game.player;
  if (!z || z.level <= 0 || !p || !z.pulses || !z.pulses.length) return;
  const Z = CFG.parts.zone;
  const maxR = Z.maxRadius[z.level];
  const thick = Z.thick[z.level];
  const c = COLORS.zoneRgbByLevel[z.level - 1] || COLORS.zoneRgbByLevel[COLORS.zoneRgbByLevel.length - 1];
  ctx.save();
  for (const pulse of z.pulses) {
    if (pulse.r <= 0) continue;
    const fade = Math.max(0, 1 - pulse.r / maxR); // 멀리 갈수록 옅게
    ctx.strokeStyle = `rgba(${c},${0.14 + fade * 0.5})`;
    ctx.lineWidth = thick;
    ctx.beginPath(); ctx.arc(p.x, p.y, pulse.r, 0, Math.PI * 2); ctx.stroke();
  }
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

// 전격 코일 아크: 살아있는 두 노드 사이를 지그재그 번개로 잇는다(노드 몸체보다 먼저 = 아래에 깔림).
function drawCoilArcs(ctx, game) {
  ctx.save();
  ctx.strokeStyle = COLORS.enemy.coilArc;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = COLORS.enemy.coilArc;
  ctx.shadowBlur = 8;
  for (const e of game.enemies) {
    if (e.type !== 'coil' || !e.mate || e.mate.dead || e.x > e.mate.x) continue;
    const a = e, b = e.mate, segs = 7;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t + (i % 2 ? -1 : 1) * (5 + Math.sin((a.t || 0) * 20 + i) * 3);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// 적 = 요정·정령: 공통으로 둥근 몸 + 눈, 종류별 특징(꼬리불·날개·방패·균열·화살)을 얹는다.
function drawEnemies(ctx, game) {
  drawCoilArcs(ctx, game); // 코일 아크는 노드 몸체 아래에 먼저
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
    } else if (e.type === 'turret') {
      // 부유 포대: 육각 강철 몸체 + 아래 포신 + 발광 코어(눈 없음, 기계).
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); }
      ctx.closePath(); ctx.fill();
      ctx.fillRect(-r * 0.18, r * 0.5, r * 0.36, r * 0.85); // 포신(아래)
      ctx.fillStyle = COLORS.enemy.turretCore;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'prism') {
      // 결정체: 마름모 + 안쪽 흰 하이라이트(투명감).
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(r * 0.35, 0); ctx.lineTo(0, r * 0.5); ctx.lineTo(-r * 0.35, 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'mine') {
      // 기뢰: 팔각 몸체 + 스파이크 4개 + 붉은 코어(자폭 경고).
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = e.color; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); ctx.stroke(); }
      ctx.fillStyle = COLORS.enemy.mineCore;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'warper') {
      // 공간 왜곡체: 마름모 + 이동 직후(vuln) 잔상 반짝 + 흰 코어 십자.
      if (e.vuln > 0) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(0, -r * 1.35); ctx.lineTo(r * 0.9, 0); ctx.lineTo(0, r * 1.35); ctx.lineTo(-r * 0.9, 0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.65, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.65, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.32, 0); ctx.lineTo(r * 0.32, 0); ctx.moveTo(0, -r * 0.32); ctx.lineTo(0, r * 0.32); ctx.stroke();
    } else if (e.type === 'coil') {
      // 전격 코일 노드: 마름모 강철 몸체 + 밝은 전기 코어(눈 없음, 기계).
      ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.75, 0); ctx.lineTo(0, r * 0.9); ctx.lineTo(-r * 0.75, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COLORS.enemy.coilArc;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'serpent') {
      if (e.seg === 'head') {
        // 머리(약점): 큰 마름모 + 흰 눈 강조 + 발광.
        ctx.shadowColor = e.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff4ee';
        ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.08, r * 0.17, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.08, r * 0.17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a0f0f';
        ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.08, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.08, r * 0.08, 0, Math.PI * 2); ctx.fill();
      } else {
        // 몸통 마디(무적): 강철 육각 + 흰 테두리(단단함 표시).
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
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
  if (boss.style === 'machine') {
    // 기계 중보스(21~29): 각진 팔각 강철 몸체 + 포신 2문 + 붉은 발광 코어(눈 없음).
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * boss.rx, Math.sin(a) * boss.ry); }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.boss.machineCore;
    ctx.fillRect(-boss.rx * 0.55, boss.ry - 6, 8, 14);
    ctx.fillRect(boss.rx * 0.55 - 8, boss.ry - 6, 8, 14);
    ctx.beginPath(); ctx.arc(0, 0, boss.rx * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, boss.rx * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
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

// 유도탄 로켓 실루엣. 원점 중심, 진행 방향 = 위(-y). rotate는 호출부에서 적용.
//   뾰족한 노즈콘 + 원통 몸통 + 뒤 핀(양날개). tier(0~3, = 무기단계-1)↑일수록 뒷핀이 커져 강화를 보인다.
//   fillStyle(몸체색)은 호출부가 지정. 노즈 흰 하이라이트만 여기서 잠깐 흰색으로 칠하고 복원한다.
function drawRocket(ctx, r, tier) {
  const half = r * 1.7;          // 몸통 세로 반길이
  const w = r * 0.85;            // 몸통 반폭
  const fin = w * (0.9 + tier * 0.35); // 뒤 핀 크기(강화될수록 큼)
  // 뒤 핀(양쪽 삼각) - 몸통보다 먼저 그려 몸통이 위에 겹치게
  ctx.beginPath();
  ctx.moveTo(-w, half * 0.15); ctx.lineTo(-w - fin, half * 1.05); ctx.lineTo(-w, half * 0.8); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, half * 0.15); ctx.lineTo(w + fin, half * 1.05); ctx.lineTo(w, half * 0.8); ctx.closePath(); ctx.fill();
  // 몸통(뾰족 노즈 + 원통) - 위가 뾰족한 총알형
  ctx.beginPath();
  ctx.moveTo(0, -half * 1.35);                     // 노즈 끝
  ctx.quadraticCurveTo(w, -half * 0.5, w, 0);      // 오른 어깨 곡선
  ctx.lineTo(w, half);                             // 오른 몸통 아래
  ctx.lineTo(-w, half);                            // 왼 몸통 아래
  ctx.lineTo(-w, 0);
  ctx.quadraticCurveTo(-w, -half * 0.5, 0, -half * 1.35);
  ctx.closePath(); ctx.fill();
  // 노즈 흰 하이라이트(강화 표시, tier↑ 뚜렷)
  if (tier >= 1) {
    const prev = ctx.fillStyle;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + tier * 0.16})`;
    ctx.beginPath();
    ctx.moveTo(0, -half * 1.3);
    ctx.quadraticCurveTo(w * 0.5, -half * 0.6, 0, -half * 0.35);
    ctx.quadraticCurveTo(-w * 0.5, -half * 0.6, 0, -half * 1.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = prev;
  }
}

// 메인 총알 흰 코어 무늬 - 티어별로 다른 패턴을 빔을 따라(로컬 세로축) 반복해 '다른 종류의 레이저'로 구분한다.
// 호출 전에 translate+rotate로 진행 방향 좌표계가 잡혀 있어, 로컬 y축(위=진행방향)으로만 반복 배치하면 된다.
function drawMainCore(ctx, bm, w) {
  const cw = w * bm.core, coreLen = bm.len * 0.84, top = -bm.len * 0.42;
  ctx.fillStyle = COLORS.laserCore;
  ctx.strokeStyle = COLORS.laserCore;
  const pat = bm.pattern || 'beam';
  if (pat === 'beam') { ctx.fillRect(-cw, top, cw * 2, coreLen); return; }           // 실선 빔
  if (pat === 'seg') {                                                                // 마디진 빔
    const unit = coreLen / (bm.seg * 2 - 1);
    for (let i = 0; i < bm.seg; i++) ctx.fillRect(-cw, top + i * unit * 2, cw * 2, unit);
    return;
  }
  const n = bm.seg || 3, gap = coreLen / n, r = w * 0.85; // 빔 반폭 기준 - 무늬가 빔을 살짝 넘어 또렷하게 보인다
  ctx.lineWidth = Math.max(1.5, w * 0.55);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const y = top + gap * (i + 0.5);
    if (pat === 'o') {                                                                // ○ 반복
      ctx.beginPath(); ctx.arc(0, y, r, 0, Math.PI * 2); ctx.stroke();
    } else if (pat === 'x') {                                                         // ✕ 반복
      ctx.beginPath();
      ctx.moveTo(-r, y - r); ctx.lineTo(r, y + r);
      ctx.moveTo(r, y - r); ctx.lineTo(-r, y + r);
      ctx.stroke();
    } else if (pat === 'diamond') {                                                   // ◆ 반복
      ctx.beginPath();
      ctx.moveTo(0, y - r); ctx.lineTo(r, y); ctx.lineTo(0, y + r); ctx.lineTo(-r, y);
      ctx.closePath(); ctx.fill();
    }
  }
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
      // 꼬리 유도탄 = 로켓 실루엣(뾰족 노즈 + 몸통 + 뒤 핀). 무기 단계(1~4)로 핀·발광·색이 강해진다. 뒤 꼬리불 유지.
      const mv = Math.atan2(b.vy, b.vx);
      const ang = mv + Math.PI / 2;
      const tier = Math.max(0, Math.min((b.weapon || 1) - 1, COLORS.tailMissileByStage.length - 1));
      const col = COLORS.tailMissileByStage[tier];
      // 뒤 꼬리불(진행 반대쪽)
      ctx.fillStyle = COLORS.missileTrail;
      ctx.beginPath();
      ctx.arc(b.x - Math.cos(mv) * b.r * 1.7, b.y - Math.sin(mv) * b.r * 1.7, b.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      if (tier >= 2) { ctx.shadowColor = COLORS.bulletGlow; ctx.shadowBlur = 4 + tier * 3; }
      ctx.fillStyle = col;
      drawRocket(ctx, b.r, tier);
      ctx.restore();
      ctx.shadowBlur = 0;
    } else {
      // 메인 총알 = 레이저 빔(빛줄기). 발별 진화 tier↑이면 빔이 길고 굵고 밝아지며 흰 코어가 강해진다. 진행 방향 회전.
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      const tier = b.tier || 0;
      const bm = CFG.bullet.mainBeams[tier];
      const col = COLORS.mainTier[tier];
      const w = b.r * bm.w;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      if (bm.glow) { ctx.shadowColor = COLORS.bulletGlow; ctx.shadowBlur = bm.glow; }
      ctx.fillStyle = col;
      ctx.fillRect(-w, -bm.len / 2, w * 2, bm.len);                          // 빔 외곽(색)
      ctx.shadowBlur = 0;
      drawMainCore(ctx, bm, w);   // 티어별 코어 무늬(실선/마디/원/엑스/마름모) - '다른 종류의 레이저'로 구분
      ctx.restore();
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
      // 회복 = 하트 모양 그 자체(빨간 채움 + 흰 테두리 + 글로우). 좌우 대칭 정석 하트 곡선.
      const hs = it.r;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, hs * 0.9);                                        // 아래 뾰족점
      ctx.bezierCurveTo(-hs * 1.15, -hs * 0.1, -hs * 0.65, -hs * 1.05, 0, -hs * 0.32); // 왼쪽 잎 → 중앙 홈
      ctx.bezierCurveTo(hs * 0.65, -hs * 1.05, hs * 1.15, -hs * 0.1, 0, hs * 0.9);     // 오른쪽 잎 → 아래 점
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
