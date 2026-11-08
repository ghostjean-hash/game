(function () {
  'use strict';
  const D = globalThis.MC_DATA;
  function createSession(names, minutes, quick, first = 0) {
    return { version: D.version, screen: 'setup', step: 0, names: names.map((s, i) => String(s).trim().slice(0, 16) || D.players[i]), minutes, quick, first, playerColors:[...D.defaultPlayerColors], chosenSet: 'orange', costs: { orange: D.sets.orange.cost, red: D.sets.red.cost }, elapsed: 0, runningSince: null, ending: false, targetTurns: null, turns: [0, 0], scores: [null, null], winner: null, finishReason: null };
  }
  function createPreset(names,id,first=0){const preset=D.presets.find(p=>p.id===id);if(!preset)throw Error('준비 방식을 확인하세요.');return createSession(names,preset.minutes,preset.quick,first);}
  function chooseColor(colors,player,id){
    if(![0,1].includes(player)||!Object.hasOwn(D.playerPalette,id))throw Error('색을 확인하세요.');
    const next=[...(colors??D.defaultPlayerColors)],other=1-player;
    if(next[other]===id)next[other]=next[player];next[player]=id;return next;
  }
  function elapsed(s, now) { return s.elapsed + (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince)); }
  function budget(s) { return s.minutes===null?Infinity:(s.minutes - D.reserveMinutes) * D.minute; }
  function remaining(s, now) { return Math.max(0, budget(s) - elapsed(s, now)); }
  function current(s) { return s.turns[0] === s.turns[1] ? s.first : 1 - s.first; }
  function equal(s) { return s.turns[0] === s.turns[1]; }
  function requestFinish(s) { return s.ending ? s : { ...s, ending: true, targetTurns: Math.max(...s.turns) + (equal(s) ? 1 : 0) }; }
  function shouldFinish(s) { return s.ending && s.targetTurns !== null && s.turns.every(n => n >= s.targetTurns); }
  function pause(s, now) { return { ...s, elapsed: elapsed(s, now), runningSince: null }; }
  function advance(s, now) {
    if (shouldFinish(s)) return { ...pause(s, now), screen: 'finish' };
    const endingState = remaining(s, now) === 0 ? requestFinish(s) : s;
    const turns = [...endingState.turns];
    turns[current(endingState)]++;
    const next = { ...endingState, turns };
    return shouldFinish(next) ? { ...pause(next, now), screen: 'finish' } : next;
  }
  function amount(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const str = String(value).trim();
    if (!/^\d+$/.test(str)) return null;
    const number = Number(str);
    return Number.isSafeInteger(number) && number <= D.maxAmount ? number : null;
  }
  function total(values) {
    if (!Array.isArray(values) || values.length !== 4) return null;
    const amounts = values.map(amount);
    return amounts.some(v => v === null) ? null : amounts.reduce((a, b) => a + b, 0);
  }
  function winner(scores) { return scores[0] === scores[1] ? 'tie' : scores[0] > scores[1] ? 0 : 1; }
  function valid(s) {
    return !!s && s.version === D.version && ['setup', 'play', 'finish', 'score', 'result'].includes(s.screen)
      && Array.isArray(s.names) && s.names.length === 2 && s.names.every(n => typeof n === 'string' && n.length > 0 && n.length <= 16)
      && (D.durations.includes(s.minutes)||s.minutes===null&&s.quick===false) && typeof s.quick === 'boolean' && [0, 1].includes(s.first)
      && (s.playerColors===undefined||Array.isArray(s.playerColors)&&s.playerColors.length===2&&s.playerColors[0]!==s.playerColors[1]&&s.playerColors.every(c=>Object.hasOwn(D.playerPalette,c)))
      && ['orange', 'red'].includes(s.chosenSet) && s.costs && ['orange', 'red'].every(k => amount(s.costs[k]) !== null && s.costs[k] <= D.startingCash)
      && Number.isInteger(s.step) && s.step >= 0 && s.step <= 2
      && Number.isFinite(s.elapsed) && s.elapsed >= 0 && (s.runningSince === null || (Number.isFinite(s.runningSince) && s.runningSince >= 0))
      && typeof s.ending === 'boolean' && (s.ending ? Number.isSafeInteger(s.targetTurns) && s.targetTurns >= 1 : s.targetTurns === null) && Array.isArray(s.turns) && s.turns.length === 2
      && s.turns.every(n => Number.isSafeInteger(n) && n >= 0) && s.turns[s.first] - s.turns[1 - s.first] >= 0 && s.turns[s.first] - s.turns[1 - s.first] <= 1
      && Array.isArray(s.scores) && s.scores.length === 2 && s.scores.every(row => row === null || (Array.isArray(row) && row.length === 4 && row.every(v => typeof v === 'string')))
      && [null, 0, 1, 'tie'].includes(s.winner) && [null, 'time', 'bankruptcy'].includes(s.finishReason)
      && (s.screen !== 'result' || (s.winner !== null && (s.finishReason === 'bankruptcy' || s.scores.every(row => total(row) !== null))));
  }
  globalThis.MC = Object.freeze({ createSession, createPreset, chooseColor, elapsed, budget, remaining, current, equal, requestFinish, shouldFinish, pause, advance, amount, total, winner, valid });
})();
