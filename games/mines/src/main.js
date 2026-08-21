import { createGameFrame, createSave, SCREEN } from '../../../shared/frame/index.js';
import { DIFFICULTY, DIFFICULTY_ORDER, DEFAULT_DIFFICULTY, GAME, LABEL } from './data/constants.js';
import { CELL_COLOR, NUMBER_COLOR } from './data/colors.js';
import { createBoard, openCell, toggleFlag, chord, countFlags, serialize, restore } from './core/board.js';
import { fitCell } from './core/fit.js';
import { renderBoard } from './render/boardView.js';
import { bindBoardInput } from './input/boardInput.js';
import { SOUNDS } from './audio/sound.js';

const app = document.querySelector('#app');
const rootStyle = document.documentElement.style;
Object.entries(CELL_COLOR).forEach(([name, value]) => rootStyle.setProperty(`--cell-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value));
Object.entries(NUMBER_COLOR).forEach(([name, value]) => rootStyle.setProperty(`--num-${name}`, value));

// 시작 화면을 만들기 전에 읽어야, 보이는 선택값과 실제 시작 난이도가 어긋나지 않는다.
const initialSave = createSave('mines');
let selected = initialSave.get('lastDiff', DEFAULT_DIFFICULTY);
let board = null;
let mode = 'open';
let startedAt = 0;
let elapsedMs = 0;
let ticker = 0;
let unbind = null;
let cursor = { x: 0, y: 0 };

const formatTime = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const elapsed = () => elapsedMs + (board?.status === GAME.PLAYING ? Date.now() - startedAt : 0);
const bestText = (key) => { const value = frame.save.readBest(key); return value === null ? '기록 없음' : `최고 기록 ${formatTime(value)}`; };

function titleBackground() {
  const grid = document.createElement('div'); grid.className = 'title-grid'; grid.style.setProperty('--n', '8');
  for (let i = 0; i < 64; i += 1) { const cell = document.createElement('i'); if (i % 3) cell.className = 'alt'; if (i === 12 || i === 37) cell.className = 'flag'; grid.appendChild(cell); }
  return { className: 'title-deco', el: grid };
}

const frame = createGameFrame({
  root: app, gameId: 'mines', title: '지뢰찾기', tagline: '숫자를 믿고 지뢰를 피하세요', background: titleBackground(),
  buttons: ['sound', 'fullscreen'], sounds: SOUNDS, pauseOnHide: true,
  options: { items: DIFFICULTY_ORDER.map((key) => ({ id: key, name: DIFFICULTY[key].name })), selectedId: selected },
  resume: { enabled: false, detail: '' },
  onOption: (key) => { selected = key; frame.save.set('lastDiff', key); updateTitle(); },
  onStart: () => begin(selected), onResume: (saved) => resume(saved?.data),
  onScreenChange: (now, previous) => { if (now === SCREEN.PAUSE && previous === SCREEN.PLAY) saveProgress(); },
});

function updateTitle() {
  DIFFICULTY_ORDER.forEach((key) => frame.title.setChoiceRecord?.(key, bestText(key)));
  const saved = frame.save.readResume();
  frame.title.setResume({ enabled: !!saved, detail: saved?.detail || '' });
}

const play = document.createElement('section');
play.id = 'screen-play';
play.innerHTML = `
  <div class="pc-tl"><button class="icon-btn" data-action="back" aria-label="되돌아가기">←</button><div class="stat"><span class="stat-icon">🚩</span><b id="mines-left">0</b></div></div>
  <h1 class="play-title">지뢰찾기</h1>
  <div class="pc-tr"><div class="tool-group"><button id="sound-toggle" class="icon-btn" aria-label="소리 켜기/끄기">♪</button><button id="pause-btn" class="icon-btn" aria-label="잠깐 멈춤">Ⅱ</button></div></div>
  <div class="play-center"><div class="board-wrap"><div id="board" class="board"></div></div></div>
  <div class="pc-bottom"><div class="stat time"><span class="stat-icon">⏱</span><b id="time">0:00</b></div><div class="mode-group"><button id="mode-open" class="mode-btn active">열기</button><button id="mode-flag" class="mode-btn">깃발</button></div></div>`;
frame.screens.register(SCREEN.PLAY, play);
const boardEl = play.querySelector('#board');
const fullscreenButton = frame.topbar.button('fullscreen');
if (fullscreenButton) { fullscreenButton.id = 'fs-toggle'; fullscreenButton.classList.add('icon-btn'); play.querySelector('.tool-group').appendChild(fullscreenButton); }

function resize() {
  if (!board) return;
  const wrap = play.querySelector('.board-wrap').getBoundingClientRect();
  boardEl.style.setProperty('--cell', `${fitCell({ width: wrap.width, height: wrap.height, w: board.w, h: board.h })}px`);
}
function draw() {
  if (!board) return;
  resize(); renderBoard(boardEl, board, { cursor });
  play.querySelector('#mines-left').textContent = String(board.mines - countFlags(board));
  play.querySelector('#time').textContent = formatTime(elapsed());
}
function tick() { if (board?.status === GAME.PLAYING) { play.querySelector('#time').textContent = formatTime(elapsed()); } }
function setMode(next) { mode = next; play.querySelector('#mode-open').classList.toggle('active', mode === 'open'); play.querySelector('#mode-flag').classList.toggle('active', mode === 'flag'); }
function begin(key) {
  const diff = DIFFICULTY[key]; board = createBoard(diff); selected = key; mode = 'open'; elapsedMs = 0; startedAt = 0; cursor = { x: 0, y: 0 };
  clearInterval(ticker); ticker = setInterval(tick, 1000); setMode(mode); frame.toPlay(); draw();
}
function resume(data) {
  const restored = restore(data?.board); if (!restored) { frame.save.clearResume(); updateTitle(); return; }
  board = restored; selected = data.key; elapsedMs = data.elapsedMs || 0; startedAt = board.status === GAME.PLAYING ? Date.now() : 0; cursor = { x: 0, y: 0 };
  clearInterval(ticker); ticker = setInterval(tick, 1000); frame.toPlay(); draw();
}
function saveProgress() {
  if (!board || board.status !== GAME.PLAYING) return;
  elapsedMs = elapsed(); startedAt = 0;
  frame.save.saveResume({ board: serialize(board), key: selected, elapsedMs }, `${DIFFICULTY[selected].name} · ${formatTime(elapsedMs)} 진행`); updateTitle();
}
function finish(result) {
  elapsedMs = elapsed(); clearInterval(ticker); frame.save.clearResume(); updateTitle(); draw();
  if (result.won) {
    const isNew = frame.save.saveBest(selected, elapsedMs, { higherIsBetter: false }); updateTitle();
    frame.finish({ title: LABEL.win, lines: [`${DIFFICULTY[selected].name} · ${formatTime(elapsedMs)}`, isNew ? '최고 기록 경신' : bestText(selected)], newRecord: isNew });
  } else if (result.lost) frame.finish({ title: LABEL.lose, lines: [`남은 칸 ${board.cells.filter((cell) => !cell.mine && cell.state !== 'open').length}`] });
}
function actOpen(x, y) {
  if (!board) return;
  if (board.status === GAME.READY) startedAt = Date.now();
  const result = openCell(board, x, y); frame.audio.play(result.opened.length > 1 ? 'chain' : 'open'); draw(); if (result.won || result.lost) finish(result);
}
function actFlag(x, y) { if (toggleFlag(board, x, y)) { frame.audio.play('flag'); draw(); } }
function actChord(x, y) {
  if (!board || board.status !== GAME.PLAYING) return;
  const result = chord(board, x, y);
  if (!result.opened.length && !result.lost) return;
  frame.audio.play('chord'); draw(); if (result.won || result.lost) finish(result);
}

unbind = bindBoardInput(boardEl, { onOpen: actOpen, onFlag: actFlag, getMode: () => mode });
play.querySelector('#mode-open').addEventListener('click', () => setMode('open'));
play.querySelector('#mode-flag').addEventListener('click', () => setMode('flag'));
play.querySelector('[data-action="back"]').addEventListener('click', () => { saveProgress(); frame.screens.back(); });
play.querySelector('#pause-btn').addEventListener('click', () => frame.screens.go(SCREEN.PAUSE));
play.querySelector('#sound-toggle').addEventListener('click', () => frame.audio.setMuted(!frame.audio.isMuted()));
frame.pause.on('restart', () => begin(selected));
frame.result.on('retry', () => begin(selected));
window.addEventListener('keydown', (event) => {
  if (frame.screens.current() !== SCREEN.PLAY || !board || event.altKey || event.ctrlKey || event.metaKey) return;
  const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (move) { event.preventDefault(); cursor.x = Math.max(0, Math.min(board.w - 1, cursor.x + move[0])); cursor.y = Math.max(0, Math.min(board.h - 1, cursor.y + move[1])); draw(); return; }
  if (event.key === 'f' || event.key === 'F') { event.preventDefault(); actFlag(cursor.x, cursor.y); return; }
  if (event.key === ' ') { event.preventDefault(); actOpen(cursor.x, cursor.y); return; }
  if (event.key === 'Enter') { event.preventDefault(); actChord(cursor.x, cursor.y); }
});
window.addEventListener('resize', resize);
updateTitle();
