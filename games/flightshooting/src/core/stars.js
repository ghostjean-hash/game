// 배경 별 (위→아래 스크롤, 순수). z = 깊이(속도·크기).
import { CFG } from '../data/numbers.js';

export function initStars(game, W, H) {
  game.stars = [];
  for (let i = 0; i < CFG.starCount; i++) {
    game.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.9 });
  }
}

export function updateStars(game, dt, W, H) {
  for (const s of game.stars) {
    s.y += (40 + s.z * 140) * dt;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  }
}
