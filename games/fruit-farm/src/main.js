import { createSave, mountHubBack } from '../../../shared/frame/index.js';
import { BUILDING, BUILDINGS, ITEM, MENU, createFarmHarness } from './farmHarness.js';
import { createBoard, openCell, toggleFlag, countFlags } from '../../mines/src/core/board.js';
import { CELL_STATE, GAME, RULESET } from '../../mines/src/data/constants.js';
import { renderBoard } from '../../mines/src/render/boardView.js';
import { bindBoardInput } from '../../mines/src/input/boardInput.js';
import { CELL_COLOR, NUMBER_COLOR } from '../../mines/src/data/colors.js';

const save = createSave('fruit-farm');
Object.entries(CELL_COLOR).forEach(([name, value]) => document.documentElement.style.setProperty('--cell-' + name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()), value));
Object.entries(NUMBER_COLOR).forEach(([name, value]) => document.documentElement.style.setProperty('--num-' + name, value));
const harnessMode = new URLSearchParams(location.search).has('harness');
const farm = createFarmHarness({ saved: harnessMode ? null : save.get('farm', null) });
const labels = { [ITEM.APPLE]: '🍎 사과', [ITEM.BERRY]: '🫐 베리', [ITEM.WATER]: '💧 샘물', [ITEM.HONEY]: '🍯 꿀', [ITEM.FLOUR]: '🌾 밀가루' };
const detail = { [BUILDING.WELL]: '클리어마다 샘물 2개', [BUILDING.JUICER]: '주스 메뉴 해금', [BUILDING.HIVE]: '클리어마다 꿀 1개', [BUILDING.JAM]: '잼 메뉴 해금', [BUILDING.MILL]: '클리어마다 밀가루 1개', [BUILDING.OVEN]: '타르트 메뉴 해금' };
const finder = document.querySelector('#finder'); const boardEl = document.querySelector('#finder-board'); let board = null; let finderMode = 'open';
const persist = () => { if (!harnessMode) save.set('farm', farm.state()); };
mountHubBack({ parent: document.querySelector('.map-hud'), onExit: () => { persist(); return true; } });
function recipe(item) { return Object.entries(item.recipe).map(([id, count]) => labels[id] + ' ' + count).join(' · '); }
function render() {
  const state = farm.state(); const order = farm.order();
  document.querySelector('#coins').textContent = '🪙 ' + state.coins;
  document.querySelector('#message').textContent = state.message;
  document.querySelector('#shop-state').textContent = state.buildings[BUILDING.SHOP] ? (order ? '손님 주문' : '다음 손님 대기') : '잠겨 있음';
  document.querySelector('#well-state').textContent = state.buildings[BUILDING.WELL] ? '샘물 생산 중' : '40 코인';
  document.querySelector('#workshop-state').textContent = state.buildings[BUILDING.JUICER] ? '주스 만들기' : '잠겨 있음';
  document.querySelector('#shop-button').classList.toggle('ready', !!state.buildings[BUILDING.SHOP]);
  document.querySelector('#well-button').classList.toggle('ready', !!state.buildings[BUILDING.WELL]);
  document.querySelector('#workshop-button').classList.toggle('ready', !!state.buildings[BUILDING.JUICER]);
  document.querySelector('#shop-button').dataset.order = order?.id || '';
}
function showSheet(kind) {
  const sheet = document.querySelector('#map-sheet'); const content = document.querySelector('#sheet-content'); const state = farm.state(); const order = farm.order();
  sheet.hidden = false;
  if (kind === 'order') {
    document.querySelector('#sheet-kicker').textContent = '주문 목록 · 손님 1명';
    content.innerHTML = order ? '<div class="sheet-order"><div class="customer-order"><span aria-hidden="true">🧑‍🌾</span><div><small>가게 앞에서 기다리는 손님</small><h2>🧾 ' + order.name + '</h2></div></div><p>' + recipe(order) + '</p><p>🪙 ' + order.price + '</p><button id="fulfill" class="sheet-action" ' + (farm.canFulfill() ? '' : 'disabled') + '>판매하고 전달</button></div>' : '<div class="sheet-order empty-order"><span aria-hidden="true">🏪</span><p>다음 수확을 기다리고 있어요.</p></div>';
    content.querySelector('#fulfill')?.addEventListener('click', () => { farm.fulfill(); persist(); render(); showSheet('order'); });
  } else if (kind === 'inventory') {
    document.querySelector('#sheet-kicker').textContent = '창고';
    content.innerHTML = '<div class="stock-grid">' + Object.entries(state.inventory).map(([id, value]) => '<span>' + labels[id] + ' ' + value + '</span>').join('') + '</div>';
  } else {
    document.querySelector('#sheet-kicker').textContent = '건설';
    content.innerHTML = Object.entries(BUILDINGS).filter(([id]) => id !== BUILDING.SHOP).map(([id, building]) => '<div class="build-choice"><span><b>' + building.name + '</b><br><small>' + detail[id] + '</small></span><button data-building="' + id + '" ' + (state.buildings[id] || state.coins < building.cost ? 'disabled' : '') + '>' + (state.buildings[id] ? '완료' : building.cost + ' 코인') + '</button></div>').join('');
    content.querySelectorAll('[data-building]').forEach((button) => button.addEventListener('click', () => { farm.build(button.dataset.building); persist(); render(); showSheet('build'); }));
  }
}
function setFinderMode(mode) { finderMode = mode; document.querySelector('#finder-open').classList.toggle('active', mode === 'open'); document.querySelector('#finder-mark').classList.toggle('active', mode === 'mark'); }
function rewardFromBoard() {
  const fruitCells = board.cells.filter((cell) => cell.mine);
  return { apple: Math.min(6, fruitCells.length), berry: Math.max(0, fruitCells.length - 6) };
}
function fruitIcon(index) {
  const mineIndexes = board.cells.map((cell, next) => cell.mine ? next : -1).filter((next) => next >= 0);
  return mineIndexes.indexOf(index) < 6 ? '🍎' : '🫐';
}
function finishBoard() {
  if (board.status !== GAME.WON) return;
  const reward = rewardFromBoard();
  farm.harvest(reward); persist(); render(); finder.close();
  document.querySelector('#result-apple').textContent = String(reward.apple);
  document.querySelector('#result-berry').textContent = String(reward.berry);
  document.querySelector('#harvest-result').showModal();
}
function renderFinder() {
  const marked = countFlags(board);
  document.querySelector('#found').textContent = '🧺 ' + (board.mines - marked);
  document.querySelector('#fruit-left').textContent = String(board.mines - marked);
  renderBoard(boardEl, board);
}
function actFruitOpen(x, y) {
  openCell(board, x, y); renderFinder();
  if (board.status === GAME.LOST) {
    finder.close();
    document.querySelector('#harvest-fail').showModal();
    return;
  }
  finishBoard();
}
function actFruitFlag(x, y) { toggleFlag(board, x, y); renderFinder(); finishBoard(); }
bindBoardInput(boardEl, { onOpen: actFruitOpen, onFlag: actFruitFlag, getMode: () => finderMode, directInput: true });
function openFinder() { board = createBoard({ w: 9, h: 9, mines: 10, key: 'first-orchard', ruleset: RULESET.EXTENDED }); board.markerSymbol = '🧺'; if (harnessMode) window.__fruitBoard = board; finderMode = 'open'; setFinderMode('open'); document.querySelector('#finder-help').textContent = '탭 열기 · 길게 🧺'; renderFinder(); finder.showModal(); }
document.querySelector('#find-button').addEventListener('click', openFinder); document.querySelector('#close-finder').addEventListener('click', () => finder.close());
document.querySelector('#finder-open').addEventListener('click', () => setFinderMode('open')); document.querySelector('#finder-mark').addEventListener('click', () => setFinderMode('mark'));
document.querySelector('#shop-button').addEventListener('click', () => showSheet('order'));
document.querySelector('#well-button').addEventListener('click', () => showSheet('build'));
document.querySelector('#workshop-button').addEventListener('click', () => showSheet('build'));
document.querySelector('#locked-button').addEventListener('click', () => showSheet('build'));
document.querySelector('#dock-order').addEventListener('click', () => showSheet('order'));
document.querySelector('#dock-inventory').addEventListener('click', () => showSheet('inventory'));
document.querySelector('#dock-build').addEventListener('click', () => showSheet('build'));
document.querySelector('#sheet-close').addEventListener('click', () => { document.querySelector('#map-sheet').hidden = true; });
document.querySelector('#result-confirm').addEventListener('click', () => document.querySelector('#harvest-result').close());
document.querySelector('#result-continue').addEventListener('click', () => { document.querySelector('#harvest-result').close(); openFinder(); });
document.querySelector('#fail-village').addEventListener('click', () => document.querySelector('#harvest-fail').close());
document.querySelector('#fail-retry').addEventListener('click', () => { document.querySelector('#harvest-fail').close(); openFinder(); });
if (new URLSearchParams(location.search).get('harness') === 'harvest') farm.harvest();
render();
if (new URLSearchParams(location.search).get('harness') === 'board') openFinder();
