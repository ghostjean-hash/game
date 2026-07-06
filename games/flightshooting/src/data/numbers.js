// 게임 수치 정의 (매직넘버 SSOT). 밸런스 조정은 이 파일에서만.
// 색상은 colors.js, 발사 패턴 계산은 core/fire.js가 담당한다.

export const CFG = {
  player: { r: 14, speed: 340, fireEvery: 0.14, maxLives: 3, invAfterHit: 1.6, yRatio: 0.82 },
  bullet: { speed: 620 },
  enemyBullet: { speed: 220, r: 5 },
  maxPower: 20,
  // 적 종류별 수치 (speed = 세로 낙하 속도, amp = weaver 가로 흔들 폭). 색은 colors.js.
  enemy: {
    drone:  { r: 15, hp: 1, speed: 150, score: 100 },
    weaver: { r: 16, hp: 2, speed: 120, score: 150, amp: 70, freq: 2.4 },
    gunner: { r: 18, hp: 3, speed: 70,  score: 250, fireEvery: 1.6 },
  },
  drop: { chance: 0.28, powerWeight: 0.6, healWeight: 0.2, bombWeight: 0.2 },
  // 중보스(1~9구역): 작고 hp 낮음 + 호위 비행체 주기 소환. 최종보스(10구역): 크고 단단한 2패턴.
  miniBoss: { rx: 30, ry: 26, baseHp: 55, hpPerStage: 22, score: 900, escortEvery: 3.2, escortInit: 3 },
  finalBoss: { rx: 50, ry: 44, hp: 420, score: 6000 },
  boss: { bobAmp: 0.32, bobFreq: 0.5 },
  stageCount: 10,
  starCount: 70,
  // 발열/성능: 화면에 쌓이는 오브젝트 상한(초과분은 오래된 것부터 제거).
  limits: { bullets: 160, eBullets: 140, particles: 240 },
};

// 구역 이름 (1~10)
export const STAGE_NAMES = [
  '소행성 지대', '적 함대 전선', '폐허 정거장', '운석 회랑', '적 보급선',
  '전자 폭풍', '궤도 방어선', '침묵의 성역', '모함 외곽', '모함 최심부',
];
