// 배경 별 (위→아래 스크롤, 순수). z = 깊이(속도·크기).
import { CFG } from '../data/numbers.js';

export function initStars(game, W, H) {
  game.stars = [];
  for (let i = 0; i < CFG.starCount; i++) {
    const z = 0.3 + Math.random() * 0.9;
    game.stars.push({ x: Math.random() * W, y: Math.random() * H, z, spd: 40 + z * 140 }); // spd는 z 불변이라 미리 계산
  }
}

export function updateStars(game, dt, W, H) {
  for (const s of game.stars) {
    s.y += s.spd * dt; // 속도는 z에만 의존해 불변 → initStars에서 계산한 값 재사용
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  }
}
