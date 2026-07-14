// 친구 비행기 로직 (순수, 어린이 모드 전용). DOM/Canvas/오디오 미의존. docs/09_friend.md.
// 사운드는 game.sfx 배열로만 알린다. 화면 전환 신호는 사용하지 않는다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { burst } from './spawn.js';

const F = CFG.friend;

// 어린이 모드 시작 시 친구 생성. 화면 왼쪽 밖에서 플레이어 옆으로 날아 들어온다(등장 연출).
export function spawnFriend(game, W, H) {
  const p = game.player;
  const px = p ? p.x : W / 2;
  const py = p ? p.y : H * 0.8;
  game.friend = {
    side: -1,                              // 왼쪽에 붙어 유영
    x: px - F.sideOffset - W * 0.7,        // 화면 밖 왼쪽에서 시작 → 날아 들어옴
    y: py,
    r: F.r, hp: F.maxHp, maxHp: F.maxHp,
    level: F.startLevel, fireTimer: F.fireEvery,
    inv: 0, down: false, bobPhase: 0, enterTimer: F.enterTime,
    speechIdx: 0, speechTimer: F.speechEach, reviveTimer: 0,
    msg: F.speech[0] || null,
  };
  return game.friend;
}

// 친구 메인 총알 강화 1단계(아이템 공유). 만렙이면 false. 기절 중에도 성장(부활 시 반영).
export function gainFriendLevel(game) {
  const f = game.friend;
  if (!f || f.level >= F.levelMax) return false;
  f.level++;
  return true;
}

// 친구 피격(총알·충돌). 무적/기절이면 무시. 플레이어 목숨과 무관하게 친구 hp만 깎는다.
export function friendTakeHit(game) {
  const f = game.friend;
  if (!f || f.down || f.inv > 0) return false;
  f.hp--;
  f.inv = F.inv;
  burst(game, f.x, f.y, COLORS.friend.body, 12);
  game.sfx.push('playerhit');
  if (f.hp <= 0) {
    f.down = true;
    f.msg = null;
    burst(game, f.x, f.y, COLORS.friend.glow, 22);
    game.sfx.push('explode');
  }
  return true;
}

// 기절한 친구 부활(회복 H로). hp 풀 회복 + 옆으로 재등장. 강화 level은 유지.
export function reviveFriend(game) {
  const f = game.friend;
  if (!f) return false;
  const p = game.player;
  f.down = false;
  f.hp = f.maxHp;
  f.inv = F.inv;
  f.x = (p ? p.x : f.x) + f.side * F.sideOffset;
  f.y = p ? p.y : f.y;
  f.enterTimer = F.reEnterTime;
  f.reviveTimer = F.reviveMsgTime;
  f.msg = F.reviveMsg;
  return true;
}

// 가장 가까운 적/보스의 x(친구 기준). 없으면 null. 조준 유영에 쓴다.
function nearestEnemyX(game, f) {
  let bx = null, bd = Infinity;
  for (const e of game.enemies) {
    if (e.type === 'serpent' && e.seg === 'body') continue; // 몸통(무적)은 겨냥 대상 아님
    const d = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
    if (d < bd) { bd = d; bx = e.x; }
  }
  if (game.boss && !game.boss.entering) {
    const d = (game.boss.x - f.x) ** 2 + (game.boss.y - f.y) ** 2;
    if (d < bd) bx = game.boss.x;
  }
  return bx;
}

// 친구 메인 총알 발사: 레벨↑ → 발 수↑·부채각↑(플레이어보다 넓게). kind 'fmain'(정면 화력 경로).
function fireFriend(game) {
  const f = game.friend;
  const shots = F.shotsBase + f.level * F.shotsPerLevel;
  const spread = ((F.spreadBase + f.level * F.spreadPer) * Math.PI) / 180;
  const dmg = F.dmgBase + f.level * F.dmgGrow;
  const r = F.bulletR + f.level * F.bulletRGrow;
  for (let i = 0; i < shots; i++) {
    const a = shots === 1 ? 0 : -spread / 2 + (spread * i) / (shots - 1);
    game.bullets.push({
      x: f.x, y: f.y - f.r, vx: Math.sin(a) * F.bulletSpeed, vy: -Math.cos(a) * F.bulletSpeed,
      r, dmg, kind: 'fmain', level: f.level,
    });
  }
  game.sfx.push('shoot');
}

// 친구 1스텝: 유영(옆+적 조준+흔들림) + 말풍선 + 발사. 기절 중엔 아무것도 안 함(부활 대기).
// canFire=false(전환·인트로)면 위치만 따라가고 발사는 쉰다.
export function stepFriend(game, dt, W, H, canFire = true) {
  const f = game.friend;
  if (!f) return;
  if (f.down) { f.msg = null; return; }
  const p = game.player;
  if (!p) return;
  f.inv = Math.max(0, f.inv - dt);

  // 유영 목표: 플레이어 옆(side) + 가까운 적 쪽으로 살짝 끌림, 플레이어 근처·화면 안으로 제한.
  const base = f.side * F.sideOffset;
  let tx = p.x + base;
  const ex = nearestEnemyX(game, f);
  if (ex != null) tx += (ex - tx) * F.aimBias;
  tx = Math.max(p.x - F.maxDist, Math.min(p.x + F.maxDist, tx));
  tx = Math.max(f.r, Math.min(W - f.r, tx));
  f.bobPhase += F.bobSpeed * dt;
  const ty = p.y - F.upOffset + Math.sin(f.bobPhase) * F.bobAmp;
  const k = Math.min(1, F.follow * dt);
  f.x += (tx - f.x) * k;
  f.y += (ty - f.y) * k;

  // 말풍선: 부활 메시지 우선, 그 다음 등장 인사 3개 순차, 끝나면 없음.
  if (f.reviveTimer > 0) { f.reviveTimer -= dt; f.msg = F.reviveMsg; }
  else if (f.speechIdx < F.speech.length) {
    f.msg = F.speech[f.speechIdx];
    f.speechTimer -= dt;
    if (f.speechTimer <= 0) { f.speechIdx++; f.speechTimer = F.speechEach; }
  } else f.msg = null;

  // 등장(enter) 동안은 발사 대기. 자리 잡으면 자동발사.
  if (f.enterTimer > 0) f.enterTimer -= dt;
  if (canFire && f.enterTimer <= 0) {
    f.fireTimer -= dt;
    if (f.fireTimer <= 0) { f.fireTimer = F.fireEvery; fireFriend(game); }
  }
}
