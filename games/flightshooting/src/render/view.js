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
  drawShotMerge(ctx, game);   // 플레이어 메인 총알 + 친구 발사체 겹침 시 합체 발광(어린이 모드)
  drawTail(ctx, game);        // 뒤쪽 꼬리 비행기(플레이어보다 먼저 = 뒤에 깔림)
  drawOptions(ctx, game);     // 좌우 부속 비행기
  drawPlayer(ctx, game);
  drawFriend(ctx, game);      // 친구 비행기(어린이 모드) + hp 점 + 말풍선(맨 위)
  drawParticles(ctx, game);
}

// 친구 비행기(어린이 모드, docs/09): 갈색 키위새(통통한 몸 + 긴 부리 + 작은 날개 + 눈) + hp 점 + 말풍선.
//   기절 중엔 안 그린다. 위(-y)가 나아가는 방향이라 부리를 앞(위)으로 길게 뻗는다.
function drawFriend(ctx, game) {
  const f = game.friend;
  if (!f || f.down) return;
  const r = f.r;
  const c = COLORS.friend;
  if (f.inv > 0 && Math.floor(f.inv * 12) % 2 === 0) { drawFriendSpeech(ctx, f); return; } // 피격 깜빡(말풍선은 유지)
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = 10;
  // 작은 날개 2개(몸 양옆, 살짝 벌림)
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(-r * 0.82, r * 0.2, r * 0.42, r * 0.62, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.82, r * 0.2, r * 0.42, r * 0.62, 0.35, 0, Math.PI * 2); ctx.fill();
  // 통통한 몸통(키위새 - 아래로 볼록한 서양배꼴)
  ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.92, r * 1.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // 긴 부리(위로 뻗은 가느다란 삼각 - 키위새 특징)
  ctx.fillStyle = c.beak;
  ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.72); ctx.lineTo(0, -r * 1.95); ctx.lineTo(r * 0.16, -r * 0.72); ctx.closePath(); ctx.fill();
  // 눈 2개
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.28, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.28, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawFriendHp(ctx, f);
  drawFriendSpeech(ctx, f);
}

// 친구 hp 점(작은 하트 대신 점): 몸 아래 가로로. 채워진 = 남은 hp(핑크), 빈 = 잃음(흐림). HUD 아님(강화 정보 미표시).
function drawFriendHp(ctx, f) {
  const n = f.maxHp, gap = 6, y = f.y + f.r + 7;
  const x0 = f.x - ((n - 1) * gap) / 2;
  ctx.save();
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < f.hp ? COLORS.friend.hpPip : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(x0 + i * gap, y, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 친구 말풍선: 몸 위 둥근 사각형 + 꼬리 + 텍스트. f.msg 있을 때만.
function drawFriendSpeech(ctx, f) {
  if (!f.msg) return;
  ctx.save();
  ctx.font = 'bold 12px ui-monospace, monospace';
  const tw = ctx.measureText(f.msg).width;
  const padX = 8, h = 20, w = tw + padX * 2;
  const x = f.x - w / 2, y = f.y - f.r - 16 - h;
  ctx.fillStyle = 'rgba(18,22,32,0.92)';
  ctx.strokeStyle = COLORS.friend.glow;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(f.x - 5, y + h - 0.5); ctx.lineTo(f.x + 5, y + h - 0.5); ctx.lineTo(f.x, y + h + 7); ctx.closePath();
  ctx.fillStyle = 'rgba(18,22,32,0.92)'; ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(f.msg, f.x, y + h / 2);
  ctx.restore();
}

// 친구 발사체: 키위새 부리 모양(위로 뾰족한 가느다란 삼각, drawFriend 부리와 동일 실루엣). 어두운 회색 + 절제된 코어.
//   b.len = 길이(부리 높이), b.r = 폭(밑변 반)·충돌 반경.
function drawFriendShot(ctx, b) {
  const col = COLORS.friend.shot; // 단일 색(강화해도 외형 불변 - 사용자 지시)
  const w = b.r, len = b.len || w * 4;
  ctx.save();
  ctx.translate(b.x, b.y);
  // 부리 삼각(위로 뾰족)
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, -len); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
  // 안쪽 코어 삼각(가늘게, 어둡게 - 눈부심 억제)
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = COLORS.friend.shotCore;
  ctx.beginPath(); ctx.moveTo(-w * 0.42, -len * 0.12); ctx.lineTo(0, -len * 0.82); ctx.lineTo(w * 0.42, -len * 0.12); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// 합체 발광: 플레이어 메인 총알과 친구 발사체가 겹치면(가까우면) 두 총알 중간에 은은한 융합 발광을 얹는다
//   (사용자 "겹치면 살짝 합체된 모습"). 로직 없이 렌더만 - 총알은 각자 그대로 날아간다. drawBullets 뒤에 호출.
function drawShotMerge(ctx, game) {
  const isMain = (b) => !b.dead && b.kind !== 'laser' && b.kind !== 'missile' && b.kind !== 'fmain';
  const mains = game.bullets.filter(isMain);
  const friends = game.bullets.filter((b) => b.kind === 'fmain' && !b.dead);
  if (!mains.length || !friends.length) return;
  const R = CFG.friend.mergeDist;
  ctx.save();
  for (const f of friends) {
    for (const m of mains) {
      const dx = f.x - m.x, dy = f.y - m.y, d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      const t = 1 - Math.sqrt(d2) / R;                 // 가까울수록 강하게
      const mx = (f.x + m.x) / 2, my = (f.y + m.y) / 2; // 두 총알 사이
      const rad = CFG.friend.mergeRadius * (0.6 + 0.4 * t);
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, rad);
      g.addColorStop(0, `rgba(210,240,255,${0.55 * t})`); // 시안(플레이어)+흰 융합
      g.addColorStop(1, 'rgba(210,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, rad, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// 구역별 색조의 은은한 성운 2개(radial gradient). 깊이감 + 구역마다 다른 분위기.
// gradient는 구역·화면크기에만 의존해 매 프레임 동일하다 → 캐시해 재사용(프레임마다 재생성 제거).
let bgCache = null; // { stage, W, H, g1, g2 }
function drawBackground(ctx, game, W, H) {
  const stage = game.stage || 1;
  if (!bgCache || bgCache.stage !== stage || bgCache.W !== W || bgCache.H !== H) {
    const arr = COLORS.stageNebula;
    const s = stage - 1;
    const g1 = ctx.createRadialGradient(W * 0.28, H * 0.22, 0, W * 0.28, H * 0.22, W * 0.75);
    g1.addColorStop(0, arr[s % arr.length]); g1.addColorStop(1, 'rgba(0,0,0,0)');
    const g2 = ctx.createRadialGradient(W * 0.74, H * 0.72, 0, W * 0.74, H * 0.72, W * 0.65);
    g2.addColorStop(0, arr[(s + 3) % arr.length]); g2.addColorStop(1, 'rgba(0,0,0,0)');
    bgCache = { stage, W, H, g1, g2 };
  }
  ctx.fillStyle = bgCache.g1; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = bgCache.g2; ctx.fillRect(0, 0, W, H);
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
  ctx.fillStyle = COLORS.star; // 상수 색은 루프 밖 1회 설정(별마다 재설정 제거)
  for (const s of game.stars) {
    ctx.globalAlpha = 0.2 + s.z * 0.5;
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

// 부위 파괴형 보스(docs/06): 코어(본체) + 살아있는 부위(포탑/촉수/조각/방어판) + 부위 hp 게이지.
function drawBoss(ctx, game) {
  const boss = game.boss;
  if (!boss) return;
  const sc = boss.colors;
  // 코어(본체). 방어구로 가려져 있으면 어둡게, 노출되면 발광 코어.
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.shadowColor = sc.core;
  ctx.shadowBlur = boss.kind === 'final' ? 20 : 14;
  ctx.fillStyle = boss.core.exposed ? sc.core : COLORS.boss.coreDark;
  ctx.beginPath(); ctx.ellipse(0, 0, boss.rx, boss.ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  if (boss.core.exposed) {
    ctx.fillStyle = COLORS.boss.coreLight; // 노출 코어 = 약점 발광
    ctx.beginPath(); ctx.arc(0, 0, boss.rx * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, boss.rx * 0.13, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; // 가려진 코어(흐린 실루엣)
    ctx.beginPath(); ctx.arc(0, 0, boss.rx * 0.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // 살아있는 부위
  for (const part of boss.parts) { if (!part.dead) drawBossPart(ctx, part, sc); }
}

// 부위 하나 렌더 + 부위 위 작은 hp 게이지. shape = turret(포탑)/tentacle(촉수)/shard(조각)/plate(방어판).
function drawBossPart(ctx, part, sc) {
  const r = part.r, isShield = part.role === 'shield';
  ctx.save();
  ctx.translate(part.x, part.y);
  ctx.fillStyle = isShield ? sc.shield : sc.weapon;
  if (part.shape === 'turret') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.fillRect(-r * 0.2, r * 0.5, r * 0.4, r * 0.85); // 아래 포신
  } else if (part.shape === 'tentacle') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
  } else if (part.shape === 'shard') {
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.fill();
  } else if (part.shape === 'plate') {
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (part.hp < part.maxHp) { // 손상된 부위만 게이지 노출
    const bw = r * 1.7, bh = 3, by = -r - 7;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-bw / 2, by, bw, bh);
    ctx.fillStyle = isShield ? '#9fd8ff' : '#ffd36b';
    ctx.fillRect(-bw / 2, by, bw * Math.max(0, part.hp / part.maxHp), bh);
  }
  ctx.restore();
}

// 메인 총알 = 레이저 빔. 강화 단계(tier 0~10)마다 '서로 다른 무늬 패턴'이 나온다(사용자 지시 2026-07-12 - 다양한 패턴 유지).
//   0 가는 실선 / 1 마디 / 2 톱니 / 3 구슬 체인 / 4 마름모 체인 / 5 물결 / 6 이중 빔 / 7 나선 / 8 화살촉 체인 / 9 링 체인 / 10 플라즈마.
//   (사용자 지정: 새 0·1·2 = 예전 0·2·6 무늬 = 실선·마디·톱니. 3~10은 서로 다른 패턴.)
//   침범 방지: 모든 무늬의 가로 반경은 cap(HALF = laneGap/2)로 잘라 옆칸에 맞닿을 수는 있어도 넘어가지 않는다.
function drawMainBeam(ctx, b) {
  const t = b.tier || 0;
  const col = COLORS.mainTier[Math.min(t, COLORS.mainTier.length - 1)];
  const len = CFG.bullet.mainLenBase + t * CFG.bullet.mainLenPer;
  const bw = CFG.bullet.mainWBase + t * CFG.bullet.mainWPer;
  const top = -len / 2, h = len;
  const HALF = CFG.parts.front.laneGap / 2;      // 레인 반폭(가로 반경이 이걸 넘으면 옆칸 침범)
  const cap = (x) => Math.min(x, HALF);
  const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  ctx.fillStyle = col; ctx.strokeStyle = col;

  if (t === 0) {                         // 0: 마디(점 4개, 간격 넓게 - 사용자 지시)
    const n = 4, pd = h * 0.13, w = cap(bw);
    for (let i = 0; i < n; i++) { const yy = top + (h - pd) * i / (n - 1); ctx.fillRect(-w, yy, w * 2, pd); }
  } else if (t === 1) {                  // 1: 가는 실선
    ctx.fillRect(-1.5, top, 3, h);
  } else if (t === 2) {                  // 2: 톱니(좌우 지그재그, 예전 6)
    const n = 8, w1 = cap(bw * 1.9), w0 = -bw * 0.4;
    ctx.beginPath(); ctx.moveTo(w0, top);
    for (let i = 0; i <= n; i++) { const yy = top + h * i / n; ctx.lineTo(i % 2 ? w1 : w0, yy); }
    for (let i = n; i >= 0; i--) { const yy = top + h * i / n; ctx.lineTo(i % 2 ? -w0 : -w1, yy); }
    ctx.closePath(); ctx.fill();
  } else if (t === 3) {                  // 3: 구슬 체인(원을 세로로 꿴 줄)
    const n = 6, r = cap(bw * 1.5);
    for (let i = 0; i < n; i++) { const yy = top + h * (i + 0.5) / n; ctx.beginPath(); ctx.arc(0, yy, r, 0, Math.PI * 2); ctx.fill(); }
  } else if (t === 4) {                  // 4: 마름모 체인(더 크고 또렷하게 - 개수 줄여 간격 벌림)
    const n = 4, rx = cap(bw * 1.9), ry = bw * 2.7;
    for (let i = 0; i < n; i++) { const yy = top + h * (i + 0.5) / n; ctx.beginPath(); ctx.moveTo(0, yy - ry); ctx.lineTo(rx, yy); ctx.lineTo(0, yy + ry); ctx.lineTo(-rx, yy); ctx.closePath(); ctx.fill(); }
  } else if (t === 5) {                  // 5: 물결(굽이 하나 더 - 사용자 지시. 길이는 mainLenPer로 전체 증가)
    ctx.lineWidth = Math.min(bw * 1.5, HALF); ctx.lineCap = 'round';
    const amp = Math.max(0, cap(bw * 1.5) - ctx.lineWidth / 2);
    ctx.beginPath(); for (let i = 0; i <= 18; i++) { const yy = top + h * i / 18, xx = Math.sin(i / 18 * Math.PI * 4.5) * amp; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
  } else if (t === 6) {                  // 6: 이중 빔(좌우 완전 대칭 - 폭·길이 정확히 동일)
    const bar = bw * 0.9, g = Math.max(bw * 0.3, Math.min(cap(bw * 1.5) - bar, HALF - bar));
    ctx.fillRect(-g - bar, top, bar, h); // 좌
    ctx.fillRect(g, top, bar, h);         // 우
  } else if (t === 7) {                  // 7: 나선(두 가닥 꼬임 - 가닥이 또렷하게 보이도록 얇게)
    ctx.lineWidth = bw * 0.8; ctx.lineCap = 'round';
    const amp = cap(bw * 1.7) - ctx.lineWidth / 2;
    for (const ph of [0, Math.PI]) { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const yy = top + h * i / 16, xx = Math.sin(i / 16 * Math.PI * 4 + ph) * Math.max(0, amp); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
  } else if (t === 8) {                  // 8: 화살촉 체인
    const n = 5, rx = cap(bw * 1.6), ry = bw * 1.9;
    for (let i = 0; i < n; i++) { const yy = top + h * (i + 0.5) / n; ctx.beginPath(); ctx.moveTo(0, yy - ry); ctx.lineTo(rx, yy + ry * 0.35); ctx.lineTo(0, yy + ry * 0.05); ctx.lineTo(-rx, yy + ry * 0.35); ctx.closePath(); ctx.fill(); }
  } else if (t === 9) {                  // 9: 링 체인(굵은 고리 + 안쪽 코어 점 - 볼륨을 줘 7·8보다 강해 보이게)
    const n = 4; ctx.lineWidth = Math.max(1.8, bw * 0.72);
    const r = Math.max(1.8, Math.min(cap(bw * 1.6), (h / n) * 0.44) - ctx.lineWidth / 2);
    for (let i = 0; i < n; i++) {
      const yy = top + h * (i + 0.5) / n;
      ctx.beginPath(); ctx.arc(0, yy, r, 0, Math.PI * 2); ctx.stroke();      // 굵은 고리
      ctx.beginPath(); ctx.arc(0, yy, r * 0.42, 0, Math.PI * 2); ctx.fill(); // 안쪽 코어 점
    }
  } else {                               // 10: 플라즈마(오라 + 굵은 빔 + 흰 코어, 위아래 라운드)
    ctx.save(); ctx.globalAlpha = 0.24; ctx.beginPath(); ctx.ellipse(0, 0, cap(bw * 2.4), h * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const w = cap(bw * 1.6);
    ctx.beginPath(); ctx.roundRect(-w, top, w * 2, h, w); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-w * 0.35, top + h * 0.04, w * 0.7, h * 0.92, w * 0.35); ctx.fill();
  }
  ctx.restore();
}

// 별/스파클 헬퍼(사이드 총알 7~9단계용). 원점 기준, 위=진행방향.
function star(ctx, pts, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) { const a = Math.PI / pts * i - Math.PI / 2, r = i % 2 ? inner : outer; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}

// 사이드 총알. 둥근 형태(이슬→구슬→방울→섬광)에서 고리→별→태양으로 진화(tier 0~10). 진행 방향으로 회전.
function drawSideShape(ctx, b) {
  const t = b.tier || 0;
  const col = COLORS.bulletShapeTier[Math.min(t, COLORS.bulletShapeTier.length - 1)];
  // 크기: b.r*3.2 = tier0 기본(유지), t*계수 = 단계 증가분. 계수 0.7→0.22로 낮춰 tier10을 이전의 약 2/3로 축소(사용자 지시 2026-07-12).
  const R = b.r * 3.2 + t * 0.22;
  const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  ctx.fillStyle = col; ctx.strokeStyle = col; // 발열: 총알 글로우 제거
  if (t === 0) { ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.fill(); }
  else if (t === 1) { ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.fill(); }
  else if (t === 2) { ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, Math.PI * 2); ctx.fill(); }
  else if (t === 3) { ctx.beginPath(); ctx.ellipse(0, 0, R * 0.82, R * 1.42, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (t === 4) { ctx.beginPath(); ctx.ellipse(0, 0, R * 0.42, R * 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (t === 5) { ctx.lineWidth = R * 0.4; ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2); ctx.stroke(); }
  else if (t === 6) { ctx.lineWidth = R * 0.28; ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2); ctx.stroke(); }
  else if (t === 7) { star(ctx, 4, R * 1.35, R * 0.5); }
  else if (t === 8) { star(ctx, 6, R * 1.4, R * 0.55); }
  else if (t === 9) { ctx.lineWidth = R * 0.26; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 1.45, Math.sin(a) * R * 1.45); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2); ctx.fill(); }
  else { // 태양: 12방향 광선 + 흰 코어
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7); ctx.lineTo(Math.cos(a) * R * 1.6, Math.sin(a) * R * 1.6); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 유도탄. 형태가 진화하고 몸체 색은 단계마다 다르게(tailMissile 11색). tier = 무기단계(weapon 1~11) - 1. 진행 방향으로 회전.
//   0 작은 삼각형 / 1 큰 삼각형 / 2 화살표(삼각+꼬리) / 3 화살표+뒤 꼬리깃 / 4~5 삼각로켓 / 6~10 로켓·미사일(다탄두).
function drawMissile(ctx, b) {
  const t = Math.max(0, (b.weapon || 1) - 1);
  const col = COLORS.tailMissile[Math.min(t, COLORS.tailMissile.length - 1)];
  const r = b.r * 1.7, half = r * 1.85, bw = r * 0.82;
  const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  if (t >= 6) { ctx.fillStyle = 'rgba(150,255,220,0.5)'; ctx.beginPath(); ctx.ellipse(0, half * 0.98, r * 0.5, r * (0.8 + t * 0.12), 0, 0, Math.PI * 2); ctx.fill(); } // 로켓부터 꼬리불
  ctx.fillStyle = col; // 발열: 유도탄 글로우 제거
  if (t <= 3) {                                   // 삼각형 → 큰 삼각형 → 화살표 → 화살표+꼬리깃
    const s = t === 0 ? 0.8 : 1.2;                 // 0 작게 / 1~3 크게
    // 삼각 머리
    ctx.beginPath(); ctx.moveTo(0, -half * s); ctx.lineTo(bw * 1.45 * s, half * 0.6 * s); ctx.lineTo(-bw * 1.45 * s, half * 0.6 * s); ctx.closePath(); ctx.fill();
    if (t >= 2) { ctx.fillRect(-bw * 0.32, half * 0.4, bw * 0.64, half * 0.95); } // 2+: 꼬리 막대(→ 화살표)
    if (t >= 3) { // 3: 뒤 꼬리깃(양쪽 V)
      ctx.beginPath(); ctx.moveTo(-bw * 0.32, half * 0.9); ctx.lineTo(-bw * 1.15, half * 1.5); ctx.lineTo(-bw * 0.32, half * 1.25); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bw * 0.32, half * 0.9); ctx.lineTo(bw * 1.15, half * 1.5); ctx.lineTo(bw * 0.32, half * 1.25); ctx.closePath(); ctx.fill();
    }
  } else {                                        // 삼각로켓 → 로켓 → 미사일(몸통 + 핀)
    const fin = bw * (0.6 + (t - 5) * 0.12);
    ctx.beginPath(); ctx.moveTo(-bw, half * 0.2); ctx.lineTo(-bw - fin, half * 1.0); ctx.lineTo(-bw, half * 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bw, half * 0.2); ctx.lineTo(bw + fin, half * 1.0); ctx.lineTo(bw, half * 0.8); ctx.closePath(); ctx.fill();
    if (t >= 7) { ctx.beginPath(); ctx.moveTo(-bw * 0.4, half * 0.6); ctx.lineTo(0, half * 1.2); ctx.lineTo(bw * 0.4, half * 0.6); ctx.closePath(); ctx.fill(); } // 중앙핀
    if (t <= 5) { ctx.beginPath(); ctx.moveTo(0, -half * 1.3); ctx.lineTo(bw, half * 0.9); ctx.lineTo(-bw, half * 0.9); ctx.closePath(); ctx.fill(); } // 삼각로켓
    else { ctx.beginPath(); ctx.moveTo(0, -half * 1.3); ctx.quadraticCurveTo(bw, -half * 0.5, bw, 0); ctx.lineTo(bw, half); ctx.lineTo(-bw, half); ctx.lineTo(-bw, 0); ctx.quadraticCurveTo(-bw, -half * 0.5, 0, -half * 1.3); ctx.closePath(); ctx.fill(); }
    if (t >= 9) { for (const ox of [-bw * 1.7, bw * 1.7]) { ctx.beginPath(); ctx.moveTo(ox, -half * 0.1); ctx.quadraticCurveTo(ox + bw * 0.5, -half * 0.4, ox + bw * 0.5, half * 0.25); ctx.lineTo(ox - bw * 0.5, half * 0.25); ctx.quadraticCurveTo(ox - bw * 0.5, -half * 0.4, ox, -half * 0.1); ctx.closePath(); ctx.fill(); } } // 다탄두
  }
  ctx.shadowBlur = 0;
  if (t >= 6) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -half * 1.05, bw * 0.4, 0, Math.PI * 2); ctx.fill(); } // 노즈 발광
  ctx.restore();
}

// 총알/적탄은 수십 개가 매 프레임 그려지므로 최소 글로우로 유지한다(발열).
function drawBullets(ctx, game) {
  for (const b of game.bullets) {
    if (b.kind === 'laser') drawSideShape(ctx, b);
    else if (b.kind === 'missile') drawMissile(ctx, b);
    else if (b.kind === 'fmain') drawFriendShot(ctx, b); // 친구 메인 총알(어린이 모드)
    else drawMainBeam(ctx, b);
  }
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
