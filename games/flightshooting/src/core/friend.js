// 친구 비행기 로직 (순수, 어린이 모드 전용). DOM/Canvas/오디오 미의존. docs/09_friend.md.
// 키위새 모양 + 회색 직선 레이저. 이동은 플레이어 자동조종과 같은 빔서치 AI(autopilot.decideTarget 공유).
// 사운드는 game.sfx 배열로만 알린다. 화면 전환 신호는 사용하지 않는다.
import { CFG } from '../data/numbers.js';
import { COLORS } from '../data/colors.js';
import { burst } from './spawn.js';
import { decideTarget } from './autopilot.js';

const F = CFG.friend;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// 어린이 모드 시작 시 친구 생성. 화면 왼쪽 밖에서 자기 세로 밴드로 날아 들어온다(등장 연출).
export function spawnFriend(game, W, H) {
  game.friend = {
    x: W * F.startXRatio,   // 화면 안 왼쪽에서 시작(밖으로 나가지 않게 - 사용자 지시). AI가 자기 자리로 이동
    y: H * F.homeYRatio,    // 자기 세로 밴드(플레이어와 무관)
    r: F.r, hp: F.maxHp, maxHp: F.maxHp,
    level: F.startLevel, fireTimer: F.fireEvery,
    inv: 0, down: false, enterTimer: F.enterTime,
    speechIdx: 0, speechTimer: F.speechEach, reviveTimer: 0,
    chatterTimer: F.chatterEvery, chatterShow: 0, chatterMsg: null,
    hitShow: 0, hitMsg: null, reviveMsg: null,           // 맞았을 때 / 살려줬을 때 대사
    praiseShow: 0, praiseMsg: null, killCount: 0, killWindow: 0, praiseCd: 0, // 잘했을 때(연속 처치) 칭찬 + 쿨다운
    aiTimer: 0, aiTarget: null,                          // 빔서치 목표(decideEvery마다 갱신)
    msg: F.speech[0] || null,
  };
  return game.friend;
}

// 친구 레이저 강화 1단계(아이템 공유). 만렙이면 false. 기절 중에도 성장(부활 시 반영).
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
  } else {
    // 맞았을 때 대사(다양한 표현에서 랜덤). 기절이 아닐 때만.
    f.hitMsg = pick(F.hitMsgs);
    f.hitShow = F.hitMsgTime;
  }
  return true;
}

// 기절한 친구 부활(회복 H로). hp 풀 회복, 쓰러진 자리에서 다시 일어난다. 강화 level은 유지.
export function reviveFriend(game) {
  const f = game.friend;
  if (!f) return false;
  f.down = false;
  f.hp = f.maxHp;
  f.inv = F.inv;
  f.enterTimer = F.reEnterTime;
  f.reviveMsg = pick(F.reviveMsgs); // 살려줬을 때 대사(다양한 표현에서 랜덤)
  f.reviveTimer = F.reviveMsgTime;
  f.msg = f.reviveMsg;
  return true;
}

// 적 처치 신호(플레이어·친구 누구 총알이든). world.js 처치 지점에서 호출.
//   짧은 시간(praiseWindow) 안에 praiseKills마리 이상 잡으면 "잘했을 때" 칭찬을 한 줄 예약.
export function notifyFriendKill(game) {
  const f = game.friend;
  if (!f || f.down) return;
  f.killCount = (f.killCount || 0) + 1;
  f.killWindow = F.praiseWindow;
  // 마지막 칭찬 후 praiseCooldown초 지난 뒤에만 다시 칭찬(연달아 쏟아지지 않게).
  if (f.killCount >= F.praiseKills && (f.praiseCd || 0) <= 0) {
    f.killCount = 0;
    f.praiseCd = F.praiseCooldown;
    f.praiseMsg = pick(F.praiseMsgs);
    f.praiseShow = F.praiseShowTime;
  }
}

// 친구 레이저 발사: 회색 직선 평행 레이저(부채 확산 없음). 발 수 = min(shotsMax, shotsBase+level)(최대 8),
//   단계가 오를수록 길이만 길어진다. 만렙에서도 직선 레이저 유지(전면 레이저 벽으로 안 바꾼다 - 사용자 지시).
function fireFriend(game) {
  const f = game.friend;
  const dmg = F.dmgBase + f.level * F.dmgGrow;
  const shots = Math.min(F.shotsMax, F.shotsBase + f.level);
  const len = F.beamLen; // 길이 고정(강화해도 외형 불변 - 사용자 지시)
  const span = (shots - 1) * F.laneGap;
  const speed = CFG.bullet.speed; // 발사 속도는 플레이어 메인 총알과 동일(사용자 지시)
  for (let i = 0; i < shots; i++) {
    game.bullets.push({
      x: f.x - span / 2 + i * F.laneGap, y: f.y - f.r, vx: 0, vy: -speed,
      r: F.beamW, dmg, kind: 'fmain', level: f.level, len,
    });
  }
  game.sfx.push('shoot');
}

// 말풍선 선택(우선순위): 맞았을 때 → 살려줬을 때 → 잘했을 때(칭찬) → 등장 인사 → 평상시 잡담.
function stepSpeech(f, dt) {
  if (f.hitShow > 0) { f.hitShow -= dt; f.msg = f.hitMsg; return; }
  if (f.reviveTimer > 0) { f.reviveTimer -= dt; f.msg = f.reviveMsg; return; }
  if (f.praiseShow > 0) { f.praiseShow -= dt; f.msg = f.praiseMsg; return; }
  if (f.speechIdx < F.speech.length) {
    f.msg = F.speech[f.speechIdx];
    f.speechTimer -= dt;
    if (f.speechTimer <= 0) { f.speechIdx++; f.speechTimer = F.speechEach; }
    return;
  }
  if (f.chatterShow > 0) { f.chatterShow -= dt; f.msg = f.chatterMsg; return; }
  f.msg = null;
  f.chatterTimer -= dt;
  if (f.chatterTimer <= 0) {
    f.chatterMsg = pick(F.chatter);
    f.chatterShow = F.chatterShowTime;
    f.msg = f.chatterMsg;
    f.chatterTimer = F.chatterEvery + Math.random() * F.chatterJitter;
  }
}

// 친구 1스텝: 빔서치 이동 + 말풍선 + 발사. 기절 중엔 아무것도 안 함(부활 대기).
// canFire=false(전환·인트로)면 위치만 따라가고 발사는 쉰다.
export function stepFriend(game, dt, W, H, canFire = true) {
  const f = game.friend;
  if (!f) return;
  if (f.down) { f.msg = null; return; }
  f.inv = Math.max(0, f.inv - dt);

  // 연속 처치 창(window) 감쇠: 시간이 지나면 누적 킬 초기화(연달아 잡아야 칭찬). 칭찬 쿨다운도 감쇠.
  if (f.killWindow > 0) { f.killWindow -= dt; if (f.killWindow <= 0) f.killCount = 0; }
  if (f.praiseCd > 0) f.praiseCd -= dt;

  // 이동: 플레이어 자동조종과 같은 빔서치(회피 + 조준). 자기 기체(f)를 넘겨 판단하고, 자기 세로 밴드로 복귀.
  //   decideEvery 주기마다 목표를 새로 계산하고 그 사이엔 정한 방향을 유지한다(사람처럼, 떨림 방지).
  const homeY = H * F.homeYRatio;
  if (f.aiTarget == null) f.aiTarget = { x: f.x, y: homeY, safe: true };
  f.aiTimer -= dt;
  if (f.aiTimer <= 0) {
    f.aiTimer += F.decideEvery;
    // 친구는 무기 발사가 목적 → 짧은 지평(aiSim)으로 코앞 위협만 회피하며 조준 유지 + clearWhenSafe:false
    //   (안전 시 빈 구석 도망 대신 적 조준). 위험(코앞 위협) 시 회피는 유지 = 회피 판단 구조는 플레이어와 동일.
    // mate: 플레이어와 좌우 분담(서로 다른 쪽 적·아이템). 보스전엔 null로 분담 해제(둘 다 보스 집중, 사용자 지시).
    const tier = { sim: F.aiSim, aimDeg: 0, threats: Infinity };
    const mate = game.boss ? null : game.player;
    f.aiTarget = decideTarget(game, W, H, f.r, homeY, tier, f, { clearWhenSafe: false, mate });
  }
  const move = CFG.player.speed * dt; // 이동 속도는 플레이어와 동일(빔서치 시뮬과 일치)
  const dxm = f.aiTarget.x - f.x, dym = f.aiTarget.y - f.y, safe = f.aiTarget.safe;
  if (!safe || Math.abs(dxm) > F.aiDeadzone) f.x += clamp(dxm, -move, move);
  if (!safe || Math.abs(dym) > F.aiDeadzone) f.y += clamp(dym, -move, move);
  f.x = clamp(f.x, f.r, W - f.r);
  f.y = clamp(f.y, f.r, H - f.r);

  stepSpeech(f, dt);

  // 등장(enter) 동안은 발사 대기. 자리 잡으면 자동발사(fireEvery 주기).
  if (f.enterTimer > 0) f.enterTimer -= dt;
  if (canFire && f.enterTimer <= 0) {
    f.fireTimer -= dt;
    if (f.fireTimer <= 0) { fireFriend(game); f.fireTimer = F.fireEvery; }
  }
}
