import { createGameFrame, createSave, SCREEN } from '../../../shared/frame/index.js';
import { BOARD, CELL, DIFFICULTY, DIFFICULTY_ORDER, DEFAULT_DIFFICULTY, GAME } from './data/constants.js';
import { CELL_COLOR, NUMBER_COLOR } from './data/colors.js';
import { createGameHarness } from './gameHarness.js';
import { countFlags } from './core/board.js';
import { fitCell } from './core/fit.js';
import { renderBoard } from './render/boardView.js';
import { bindBoardInput } from './input/boardInput.js';
import { SOUNDS } from './audio/sound.js';

const app = document.querySelector('#app');
const rootStyle = document.documentElement.style;
Object.entries(CELL_COLOR).forEach(([name, value]) => rootStyle.setProperty(`--cell-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value));
Object.entries(NUMBER_COLOR).forEach(([name, value]) => rootStyle.setProperty(`--num-${name}`, value));

// 시작 화면을 만들기 전에 읽어야, 보이는 선택값과 실제 시작 난이도가 어긋나지 않는다.
const harnessMode = new URLSearchParams(window.location.search).has('harness');
const storageGameId = harnessMode ? 'mines-harness' : 'mines';
const initialSave = createSave(storageGameId);
// 실제 난이도는 즉시 끝날 수 없으므로 0:00은 과거 UI 하네스가 남긴 오염값이다.
// 하네스는 별도 저장소로 옮기고, 사용자 기록에는 남기지 않는다.
if (!harnessMode) DIFFICULTY_ORDER.forEach((key) => { if (initialSave.readBest(key) === 0) initialSave.remove(`best.${key}`); });
let selected = initialSave.get('lastDiff', DEFAULT_DIFFICULTY);
let board = null;
let game = null;
let mode = 'open';
let startedAt = 0;
let elapsedMs = 0;
let ticker = 0;
let unbind = null;
let cursor = null;

const formatTime = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const elapsed = () => game ? game.elapsed() : elapsedMs;
const bestText = (key) => { const value = frame.save.readBest(key); return value === null ? '기록 없음' : `최고 기록 ${formatTime(value)}`; };

function titleBackground() {
  const grid = document.createElement('div'); grid.className = 'title-grid'; grid.style.setProperty('--n', '8');
  for (let i = 0; i < 64; i += 1) { const cell = document.createElement('i'); if (i % 3) cell.className = 'alt'; if (i === 12 || i === 37) cell.className = 'flag'; grid.appendChild(cell); }
  return { className: 'title-deco', el: grid };
}

const frame = createGameFrame({
  root: app, gameId: storageGameId, title: '지뢰찾기', tagline: '숫자를 믿고 지뢰를 피하세요', background: titleBackground(), light: true,
  buttons: ['sound', 'fullscreen'], sounds: SOUNDS, pauseOnHide: true,
  options: { items: DIFFICULTY_ORDER.map((key) => ({ id: key, name: DIFFICULTY[key].name })), selectedId: selected },
  resume: { enabled: false, detail: '' },
  onOption: (key) => { selected = key; frame.save.set('lastDiff', key); updateTitle(); },
  onStart: () => begin(selected), onResume: (saved) => resume(saved?.data),
  onScreenChange: (now, previous) => { if (now === SCREEN.PAUSE && previous === SCREEN.PLAY) saveProgress(); },
});

function applyGameText() {
  const title = '지뢰찾기';
  document.title = '지뢰찾기 - 숫자로 찾는 지뢰';
  document.querySelector('meta[name="apple-mobile-web-app-title"]').content = title;
  frame.title.el.querySelector('.gg-title-name').textContent = title;
  play.querySelector('.play-title').textContent = title;
  play.querySelector('#mines-stat').setAttribute('aria-label', '남은 지뢰 0');
}

function updateTitle() {
  frame.title.setRecord(bestText(selected));
  const saved = frame.save.readResume();
  frame.title.setResume({ enabled: !!saved, detail: saved?.detail || '' });
  const resumeButton = frame.title.el.querySelector('.gg-btn:not(.gg-btn-primary)');
  if (resumeButton) resumeButton.hidden = !saved;
}

const play = document.querySelector('#screen-play');
frame.screens.register(SCREEN.PLAY, play);
const boardEl = play.querySelector('#board');
const fullscreenButton = frame.topbar.button('fullscreen');
if (fullscreenButton) { fullscreenButton.id = 'fs-toggle'; fullscreenButton.classList.add('icon-btn'); play.querySelector('.tool-group').appendChild(fullscreenButton); }

function resize() {
  if (!board) return;
  const wrap = play.querySelector('.board-wrap').getBoundingClientRect();
  const compact = window.innerWidth > window.innerHeight && window.innerHeight <= BOARD.compactHeight;
  const min = compact ? CELL.compactMin : CELL.min;
  boardEl.style.setProperty('--cell', `${fitCell({ width: wrap.width, height: wrap.height, w: board.w, h: board.h, min })}px`);
}
function draw() {
  if (!board) return;
  renderBoard(boardEl, board, { cursor });
  resize();
  const boardWidth = boardEl.getBoundingClientRect().width;
  play.style.setProperty('--board-width', boardWidth ? `${boardWidth}px` : '100%');
  const minesLeft = board.mines - countFlags(board);
  const time = formatTime(elapsed());
  play.querySelector('#mines-left').textContent = String(minesLeft);
  play.querySelector('#mines-stat').setAttribute('aria-label', `남은 지뢰 ${minesLeft}`);
  play.querySelector('#time').textContent = time;
  play.querySelector('#time-stat').setAttribute('aria-label', `경과 시간 ${time}`);
}
function tick() { if (board?.status === GAME.PLAYING) { const time = formatTime(elapsed()); play.querySelector('#time').textContent = time; play.querySelector('#time-stat').setAttribute('aria-label', `경과 시간 ${time}`); } }
function setMode(next) { mode = next; play.querySelector('#mode-open').classList.toggle('active', mode === 'open'); play.querySelector('#mode-flag').classList.toggle('active', mode === 'flag'); }
function begin(key) {
  const diff = DIFFICULTY[key]; game = createGameHarness({ difficulty: diff }); board = game.start(diff); selected = key; mode = 'open'; elapsedMs = 0; startedAt = 0; cursor = null;
  clearInterval(ticker); ticker = setInterval(tick, 1000); setMode(mode); play.querySelector('#mode-group').hidden = false; play.querySelector('#outcome').hidden = true; play.querySelector('#end-action').hidden = true; frame.toPlay(); draw();
}
function resume(data) {
  game = createGameHarness({ difficulty: DIFFICULTY[data?.key] || DIFFICULTY[DEFAULT_DIFFICULTY] });
  const restored = game.resume(data); if (!restored) { frame.save.clearResume(); updateTitle(); return; }
  board = restored; selected = data.key; elapsedMs = data.elapsedMs || 0; startedAt = 0; cursor = null;
  clearInterval(ticker); ticker = setInterval(tick, 1000); play.querySelector('#mode-group').hidden = false; play.querySelector('#outcome').hidden = true; play.querySelector('#end-action').hidden = true; frame.toPlay(); draw();
}
function saveProgress() {
  if (!board || board.status !== GAME.PLAYING) return;
  const saved = game.snapshot(); elapsedMs = saved.elapsedMs;
  frame.save.saveResume(saved, `${DIFFICULTY[selected].name} · ${formatTime(elapsedMs)} 진행`); updateTitle();
}
function finish(result) {
  elapsedMs = elapsed(); clearInterval(ticker); frame.save.clearResume(); updateTitle(); draw();
  const modeGroup = play.querySelector('#mode-group'); const outcome = play.querySelector('#outcome'); const endAction = play.querySelector('#end-action');
  modeGroup.hidden = true; outcome.hidden = false; endAction.hidden = false;
  if (result.won) {
    const previousBest = frame.save.readBest(selected);
    const isNew = frame.save.saveBest(selected, elapsedMs, { higherIsBetter: false }); updateTitle();
    const record = formatTime(elapsedMs);
    const best = formatTime(frame.save.readBest(selected));
    outcome.textContent = `클리어 · 이번 ${record} · 최고 ${best}${isNew ? ' · 갱신' : ''}`;
    endAction.textContent = '새 게임';
  } else if (result.lost) { outcome.textContent = '지뢰를 밟았습니다'; endAction.textContent = '다시 시작'; }
}

function runHarnessScenario() {
  const scenario = new URLSearchParams(window.location.search).get('harness');
  if (scenario === 'pause') {
    begin(DEFAULT_DIFFICULTY);
    frame.screens.go(SCREEN.PAUSE);
    return;
  }
  if (scenario === 'play' || scenario === 'hard' || scenario === 'cursor') {
    const key = scenario === 'hard' ? 'hard' : DEFAULT_DIFFICULTY;
    begin(key);
    actOpen(DIFFICULTY[key].w >> 1, DIFFICULTY[key].h >> 1);
    if (scenario === 'cursor') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    return;
  }
  if (scenario !== 'win' && scenario !== 'idle' && scenario !== 'record') return;
  const tiny = { key: 'harness', w: 3, h: 3, mines: 1 };
  selected = DEFAULT_DIFFICULTY;
  game = createGameHarness({ difficulty: tiny, rng: () => 0.99 });
  board = game.start(tiny);
  mode = 'open'; elapsedMs = 0; cursor = null;
  clearInterval(ticker); setMode(mode);
  play.querySelector('#mode-group').hidden = false; play.querySelector('#outcome').hidden = true; play.querySelector('#end-action').hidden = true;
  frame.toPlay(); draw();
  if (scenario === 'idle') return;
  const result = game.open(2, 2); board = game.board(); draw();
  const mine = board.cells.findIndex((cell) => cell.mine);
  game.flag(mine % board.w, Math.floor(mine / board.w)); board = game.board(); draw(); finish({ ...result, won: true, lost: false });
  if (scenario === 'record') frame.screens.go(SCREEN.TITLE);
}
function actOpen(x, y) {
  if (!board) return;
  const result = game.open(x, y); board = game.board(); frame.audio.play(result.opened.length > 1 ? 'chain' : 'open'); draw();
  if (result.won || result.lost || board.status === GAME.WON || board.status === GAME.LOST) finish({ ...result, won: board.status === GAME.WON, lost: board.status === GAME.LOST });
}
function actFlag(x, y) {
  if (!game.flag(x, y)) return;
  board = game.board(); frame.audio.play('flag'); draw();
  if (board.status === GAME.WON) finish({ won: true, lost: false });
}
function actChord(x, y) {
  if (!board || board.status !== GAME.PLAYING) return;
  const result = game.chord(x, y); board = game.board();
  if (!result.opened.length && !result.lost) return;
  frame.audio.play('chord'); draw();
  if (result.won || result.lost || board.status === GAME.WON || board.status === GAME.LOST) finish({ ...result, won: board.status === GAME.WON, lost: board.status === GAME.LOST });
}

unbind = bindBoardInput(boardEl, { onOpen: (x, y) => { cursor = null; actOpen(x, y); }, onFlag: (x, y) => { cursor = null; actFlag(x, y); }, getMode: () => mode });
play.querySelector('#mode-open').addEventListener('click', () => setMode('open'));
play.querySelector('#mode-flag').addEventListener('click', () => setMode('flag'));
play.querySelector('[data-action="back"]').addEventListener('click', () => { saveProgress(); frame.screens.back(); });
play.querySelector('#pause-btn').addEventListener('click', () => frame.screens.go(SCREEN.PAUSE));
play.querySelector('#sound-toggle').addEventListener('click', () => frame.audio.setMuted(!frame.audio.isMuted()));
play.querySelector('#end-action').addEventListener('click', () => begin(selected));
frame.pause.on('restart', () => begin(selected));
frame.result.on('retry', () => begin(selected));
window.addEventListener('keydown', (event) => {
  if (frame.screens.current() !== SCREEN.PLAY || !board || event.altKey || event.ctrlKey || event.metaKey) return;
  const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  const activeCursor = () => cursor || { x: 0, y: 0 };
  if (move) { event.preventDefault(); const current = activeCursor(); cursor = { x: Math.max(0, Math.min(board.w - 1, current.x + move[0])), y: Math.max(0, Math.min(board.h - 1, current.y + move[1])) }; draw(); return; }
  if (event.key === 'f' || event.key === 'F') { event.preventDefault(); cursor = activeCursor(); actFlag(cursor.x, cursor.y); return; }
  if (event.key === ' ') { event.preventDefault(); cursor = activeCursor(); actOpen(cursor.x, cursor.y); return; }
  if (event.key === 'Enter') { event.preventDefault(); cursor = activeCursor(); actChord(cursor.x, cursor.y); }
});
window.addEventListener('resize', resize);
updateTitle();
applyGameText();
runHarnessScenario();
