import { tone } from '../../../../shared/frame/audio.js';

export const SOUNDS = {
  open: (c) => tone(c, { freq: 520, to: 680, dur: 0.05, type: 'triangle', gain: 0.12 }),
  chain: (c) => tone(c, { freq: 430, to: 780, dur: 0.13, type: 'triangle', gain: 0.13 }),
  flag: (c) => tone(c, { freq: 710, to: 900, dur: 0.07, type: 'square', gain: 0.09 }),
  unflag: (c) => tone(c, { freq: 620, to: 480, dur: 0.06, type: 'square', gain: 0.08 }),
  chord: (c) => tone(c, { freq: 650, to: 900, dur: 0.1, type: 'triangle', gain: 0.12 }),
};
