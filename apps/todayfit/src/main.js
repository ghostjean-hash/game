// 조립과 화면 전환 (03_architecture.md 2장).
//
// 규칙은 core/ 가 갖고, 저장은 store/ 가, 브라우저 사정은 platform/ 이 갖는다.
// 이 파일은 그 셋을 이어 붙이고 어느 화면을 보일지 정한다.

import { createRepo } from './store/repo.js';
import { now, createTicker } from './platform/ticker.js';
import { createWakeLock } from './platform/wakelock.js';
import { createSpeech } from './platform/speech.js';
import { createTodayView } from './render/todayView.js';
import { createRunView } from './render/runView.js';
import { createSummaryView } from './render/summaryView.js';
import { clock, clockUp, minutes, seconds, duration, dayLabel } from './render/format.js';
import {
  PHASE, CUE, SOUND, EXERCISE_RESULT, MS_PER_SECOND,
} from './data/constants.js';
import { TEXT, VOICE, PHASE_LABEL, RESULT_LABEL, WEEKDAY_LABEL } from './data/phrases.js';
import {
  startSession, resumeSession, recover, advance, view,
  pressNext, skipExercise, undoSkip, pause, unpause, endSession,
  toRecord, fromRecord, markAlive, remainingSets, hasResumeTarget, nextTargetIndex,
} from './core/session.js';
import { dateKeyOf, weekdayOf, monthDateKeys, shiftMonth } from './core/datekey.js';
import { estimatePlanSeconds, estimateRemainingSeconds } from './core/estimate.js';
import { nextPlannedDate } from './core/stats.js';
import { createAudio, tone } from '../../../shared/frame/audio.js';
import { showModal, registerServiceWorker } from '../../../shared/ui.js';

// --- 소리 ---------------------------------------------------------------------
// 비프는 짧은 한 음 하나뿐이다. 음색 값은 02_data.md 6장이 SSOT 다.
const SOUNDS = {
  beep: (c) => tone(c, {
    freq: SOUND.beepHz, dur: SOUND.beepMs / MS_PER_SECOND, gain: SOUND.beepGain, type: 'sine',
  }),
  beepLong: (c) => tone(c, {
    freq: SOUND.beepHz, dur: SOUND.beepLongMs / MS_PER_SECOND, gain: SOUND.beepGain, type: 'sine',
  }),
};

// 비프가 함께 울리는 알림 (01_spec.md 7.1)
const BEEP_CUES = new Set([CUE.OVERRUN, CUE.OVERRUN_AGAIN, CUE.SET_DONE, CUE.SKIP]);

const audio = createAudio({ sounds: SOUNDS });
const speech = createSpeech();
const wakeLock = createWakeLock();
const repo = createRepo();

const state = {
  screen: 'today',
  active: null,
  settings: repo.getSettings(),
  // 구간이 바뀔 때만 저장한다. 매 틱마다 쓰면 저장 장치를 계속 두드린다(01_spec.md 8.1)
  savedMark: '',
};

// --- 화면 껍데기 ---------------------------------------------------------------
const stage = document.getElementById('stage');
const topbar = document.getElementById('topbar');
const dock = document.getElementById('dock');

// 화면에 나가는 글자는 한 곳에서만 온다(04_conventions.md 1.2 / 1.2.1).
// index.html 의 상단 띠 제목과 이동 막대는 빈 채로 두고 여기서 채운다.
const DOCK_LABEL = {
  today: TEXT.navToday,
  calendar: TEXT.navCalendar,
  settings: TEXT.navSettings,
};

function paintChromeText() {
  document.title = TEXT.appTitle;
  topbar.querySelector('h1').textContent = TEXT.appTitle;
  for (const btn of dock.querySelectorAll('button[data-nav]')) {
    btn.textContent = DOCK_LABEL[btn.dataset.nav];
  }
}

function setChrome(visible) {
  topbar.hidden = !visible;
  dock.hidden = !visible;
}

// 실행 화면 둘(운동 실행 · 종료 요약)에서는 뒤로 가기를 막는다(01_spec.md 2.3 / 2.6).
// 브라우저에 '막기'는 없어서, 들어갈 때 이력 칸 하나를 얹어 두고 뒤로 가기가 오면
// 그 칸을 다시 얹어 제자리에 세운다. 나가려는 뜻은 화면마다 다르게 받는다 -
// 운동 중이면 종료 확인을 띄우고, 요약이면 닫기와 같게 오늘 화면으로 간다.
//
// 두 화면은 이력 칸 하나를 함께 쓴다. 운동에서 요약으로 넘어갈 때 다시 얹지 않는다.
const GUARD = { RUN: 'run', SUMMARY: 'summary' };
let backGuard = null;
// 지금 이력 칸을 쥐고 있는가. 어느 화면이 지키는가(backGuard)와 따로 센다 -
// 실행 중 새로고침하면 칸은 남았는데 지키는 화면이 없는 상태로 앱이 다시 서기 때문이다.
let ownsEntry = false;
let ignoreNextPop = false;

function guardBack(kind) {
  if (kind) {
    if (!ownsEntry) { history.pushState({ todayfit: true }, ''); ownsEntry = true; }
    backGuard = kind;
    return;
  }
  backGuard = null;
  if (!ownsEntry) return;
  // 얹어 둔 칸을 도로 뺀다. 그때 오는 뒤로 가기 신호는 한 번 흘린다
  ownsEntry = false;
  ignoreNextPop = true;
  history.back();
}

window.addEventListener('popstate', () => {
  if (ignoreNextPop) { ignoreNextPop = false; return; }
  // 뒤로 가기가 왔다는 것은 쥐고 있던 칸이 빠졌다는 뜻이다
  ownsEntry = false;
  if (!backGuard) return;
  if (backGuard === GUARD.SUMMARY) {
    // 다시 빼면 앱을 떠난다. 표식만 내리고 닫기와 같게 오늘 화면으로 간다
    backGuard = null;
    goToday();
    return;
  }
  history.pushState({ todayfit: true }, '');
  ownsEntry = true;
  handleEnd();
});

// --- 소리 내기 -----------------------------------------------------------------
function voiceArgs(key, s) {
  const ex = s.plan.exercises[s.exerciseIndex];
  const nextIdx = nextTargetIndex(s, s.exerciseIndex);
  const nextName = nextIdx >= 0 ? s.plan.exercises[nextIdx].name : null;
  switch (key) {
    case CUE.PREP_START: return { name: ex ? ex.name : '' };
    case CUE.SET_START: return { name: ex.name, setNumber: s.setNumber };
    case CUE.LAST_SET_START: return { name: ex.name };
    case CUE.REST_START: return { seconds: Math.round(ex.restSeconds) };
    case CUE.TRANSITION_START: return { nextName };
    case CUE.SKIP: return { nextName };
    default: return {};
  }
}

function playCues(cues, s) {
  for (const raw of cues) {
    const [key, arg] = String(raw).split(':');
    const isCountdown = key === CUE.COUNTDOWN;

    if (state.settings.beepOn) {
      if (key === CUE.FINISH) audio.play('beepLong');
      else if (isCountdown || BEEP_CUES.has(key)) audio.play('beep');
    }
    if (!state.settings.voiceOn) continue;

    const make = VOICE[key];
    if (!make) continue;
    speech.say(isCountdown ? make({ n: Number(arg) }) : make(voiceArgs(key, s)));
  }
}

// --- 오늘 화면 -----------------------------------------------------------------
function todayKey() {
  return dateKeyOf(now());
}

function labelOf(key) {
  return dayLabel(key, WEEKDAY_LABEL[weekdayOf(key)]);
}

/** 이번 달과 다음 달에서 오늘 뒤의 첫 계획일. 두 달이면 화면에 쓸 만큼 넉넉하다. */
function findNextPlanned(key, plans) {
  const [y, m] = key.split('-').map(Number);
  const after = shiftMonth(y, m, 1);
  const range = [...monthDateKeys(y, m), ...monthDateKeys(after.year, after.month)];
  return nextPlannedDate(range, key, plans);
}

/**
 * 운동 한 줄의 오른쪽 글자.
 * 아직 시작 전이면 계획을(4세트 · 15회), 한 번이라도 손댔으면 수행분을(2 / 4세트) 보인다.
 * 한 화면 안에서 '수행 / 전체' 하나로 맞춘다 - 남은 세트와 수행 세트를 같은 자리에 섞으면
 * 같은 0 이 '다 했다'로도 '하나도 못 했다'로도 읽힌다.
 */
function planRows(plan, results) {
  return plan.exercises.map((ex, i) => {
    if (!results) {
      return { name: ex.name, specText: `${ex.sets}${TEXT.unitSets} · ${ex.reps}${TEXT.unitReps}` };
    }
    const r = results[i];
    const tail = r.result === EXERCISE_RESULT.SKIPPED
      ? ` · ${RESULT_LABEL[EXERCISE_RESULT.SKIPPED]}`
      : '';
    return { name: ex.name, specText: `${r.doneSets} / ${ex.sets}${TEXT.unitSets}${tail}` };
  });
}

function todayModel() {
  const key = todayKey();
  const plans = repo.getPlans();
  const plan = plans[key] || null;
  const record = repo.getSession(key);
  const found = findNextPlanned(key, plans);
  const base = { dateText: labelOf(key), nextPlanText: found ? labelOf(found) : null };

  // 1순위 - 진행 중 세션 (01_spec.md 2.7)
  if (state.active) {
    const s = state.active;
    const left = remainingSets(s);
    return {
      ...base,
      state: 'resume',
      headline: TEXT.resumeTitle,
      routineName: s.plan.routineName,
      timeText: '',
      estimateText: minutes(estimateRemainingSeconds(s.plan.exercises, left, state.settings)),
      countLabel: TEXT.remainLabel,
      countText: `${left.filter((n) => n > 0).length}${TEXT.unitCount}`,
      exercises: planRows(s.plan, s.results),
    };
  }

  // 2순위 - 같은 날 재개 대상이 남은 부분 완료 (2.8 - 남은 자리가 없으면 완료와 같게 보인다)
  if (record && record.status === 'partial' && hasResumeTarget(fromRecord(record))) {
    const left = remainingSets(fromRecord(record));
    return {
      ...base,
      state: 'continue',
      headline: TEXT.continueTitle,
      routineName: record.plan.routineName,
      timeText: '',
      estimateText: minutes(estimateRemainingSeconds(record.plan.exercises, left, state.settings)),
      countLabel: TEXT.remainLabel,
      countText: `${left.filter((n) => n > 0).length}${TEXT.unitCount}`,
      exercises: planRows(record.plan, record.results),
    };
  }

  // 3순위 - 오늘 기록이 끝난 상태
  if (record) {
    return {
      ...base,
      state: 'complete',
      headline: TEXT.doneToday,
      routineName: record.plan.routineName,
      timeText: '',
      estimateLabel: TEXT.totalTimeLabel,
      estimateText: duration(record.activeSeconds),
      countText: `${record.plan.exercises.length}${TEXT.unitCount}`,
      exercises: planRows(record.plan, record.results),
    };
  }

  // 4순위 - 시작 대기
  if (plan) {
    return {
      ...base,
      state: 'ready',
      headline: TEXT.todayHeading,
      routineName: plan.routineName,
      timeText: plan.time,
      estimateText: minutes(estimatePlanSeconds(plan.exercises, state.settings)),
      countText: `${plan.exercises.length}${TEXT.unitCount}`,
      exercises: planRows(plan, null),
    };
  }

  // 5순위 - 계획 없음
  return { ...base, state: 'none', headline: TEXT.todayNoPlan, exercises: [] };
}

// --- 운동 실행 화면 ------------------------------------------------------------
/**
 * 길게 눌러 건너뛸 수 있는 구간인가.
 *
 * 준비 구간에는 건너뛸 운동이 아직 없다.
 * 전환 구간은 더 나쁘다 - 화면 가운데는 다음 운동을 보이는데 건너뛰기가 집는 대상은
 * 방금 끝낸 운동이라, 다 마친 운동이 건너뜀으로 강등되고 그날 전체가 완료에서
 * 부분 완료로 떨어진다. 사양 4.2 전환표가 전환 구간을 길게 누름 대상에 넣어 두었으나
 * 그 자리의 '현재 운동'이 무엇인지는 비어 있다. 기록이 깨지는 쪽이라 막아 둔다
 * (기획 결정 대기, 01_spec.md 4.2).
 */
function canSkip(s) {
  return s.phase === PHASE.WORK || s.phase === PHASE.REST;
}

/** '4개 중 2번째'. 세트 번호와 헷갈리지 않게 개수를 앞에 둔다. */
function positionText(index, total) {
  return `${total}${TEXT.unitCount} ${TEXT.positionOf} ${index + 1}${TEXT.positionLabel}`;
}

/**
 * 화면이 그대로 그릴 수 있는 모양으로 바꾼다.
 * 구간마다 무엇을 크게 보일지가 다르다 - 전환 구간에서는 지금 운동이 아니라
 * 다음 운동을 크게 보여야 사용자가 무엇을 준비할지 안다.
 */
function runModel(s, t) {
  const v = view(s, t);
  const idx = s.exerciseIndex;
  const ex = s.plan.exercises[idx];
  const total = s.plan.exercises.length;

  const m = {
    phaseKey: s.phase,
    phaseLabel: PHASE_LABEL[s.phase] || '',
    elapsedText: clock(v.elapsedSeconds),
    paused: v.paused,
    undoPending: v.undoPending,
    isOverrun: v.isOverrun,
    upNextText: '',
    timerNote: '',
    canSkip: canSkip(s),
  };

  if (s.phase === PHASE.TRANSITION) {
    const nextIdx = nextTargetIndex(s, idx);
    const nextEx = s.plan.exercises[nextIdx];
    const doneNext = s.results[nextIdx].doneSets;
    return {
      ...m,
      lead: TEXT.upNextLabel,
      title: nextEx.name,
      posText: positionText(nextIdx, total),
      setText: `${doneNext + 1} / ${nextEx.sets}`,
      repsText: String(nextEx.reps),
      dotsTotal: nextEx.sets,
      dotsDone: doneNext,
      dotsCurrent: doneNext,
      timerText: clockUp(v.remainSeconds),
      timerNote: v.paused ? TEXT.pausedNote : '',
    };
  }

  const done = s.results[idx].doneSets;
  const posText = positionText(idx, total);
  const upNextText = v.isLastExercise
    ? TEXT.lastExerciseNote
    : `${TEXT.upNextLabel} · ${v.nextExerciseName}`;

  if (s.phase === PHASE.PREP) {
    return {
      ...m,
      lead: TEXT.startsSoonLabel,
      title: ex.name,
      posText,
      setText: `1 / ${ex.sets}`,
      repsText: String(ex.reps),
      dotsTotal: ex.sets,
      dotsDone: 0,
      dotsCurrent: 0,
      timerText: clockUp(v.remainSeconds),
      timerNote: v.paused ? TEXT.pausedNote : '',
      upNextText,
    };
  }

  if (s.phase === PHASE.REST) {
    const nextSet = v.setNumber + 1;
    return {
      ...m,
      lead: TEXT.restLabel,
      title: ex.name,
      posText,
      setText: `${nextSet} / ${ex.sets}`,
      repsText: String(ex.reps),
      dotsTotal: ex.sets,
      dotsDone: done,
      dotsCurrent: done,
      timerText: clockUp(v.remainSeconds),
      timerNote: v.paused ? TEXT.pausedNote : `${TEXT.upNextLabel} ${nextSet}${TEXT.unitSets}`,
      upNextText,
    };
  }

  // 운동 구간 - 권장 시간이 지나면 남은 시간 대신 초과 시간을 센다(01_spec.md 4.1.2)
  let note = `${TEXT.recommendPrefix} ${seconds(ex.workSeconds)}`;
  if (v.isOverrun) note = TEXT.overrunNote;
  if (v.paused) note = TEXT.pausedNote;
  return {
    ...m,
    lead: v.isLastSet ? TEXT.lastSetNote : TEXT.nowLabel,
    title: ex.name,
    posText,
    setText: `${v.setNumber} / ${ex.sets}`,
    repsText: String(ex.reps),
    dotsTotal: ex.sets,
    dotsDone: done,
    dotsCurrent: v.setNumber - 1,
    timerText: v.isOverrun ? `+${clock(v.overrunSeconds)}` : clockUp(v.remainSeconds),
    timerNote: note,
    upNextText,
  };
}

// --- 진행 중 세션 저장 ----------------------------------------------------------
function markOf(s) {
  return `${s.phase}|${s.exerciseIndex}|${s.setNumber}|${s.paused}|${s.undo !== null}`;
}

/**
 * 진행 중 세션을 남긴다.
 * savedAt 은 저장한 그 시각이다(02_data.md 5.6) - 세션을 시작한 시각을 적어 두면
 * 나중에 이 값을 믿는 자리가 몇십 분 낡은 값으로 판단한다.
 */
function saveActive(s, force = false) {
  const mark = markOf(s);
  if (!force && mark === state.savedMark) return;
  state.savedMark = mark;
  state.active = { ...s, savedAt: now() };
  repo.setActive(state.active);
}

// --- 화면 전환 -----------------------------------------------------------------
const todayView = createTodayView({
  onStart: startToday,
  onResume: enterRun,
  onContinue: continueToday,
});

const runView = createRunView({
  onNext: handleNext,
  onSkip: handleSkip,
  onPause: handlePause,
  onEnd: handleEnd,
  onUndo: handleUndo,
});

const summaryView = createSummaryView({ onClose: goToday });

const ticker = createTicker(tick);

function setDockActive(name) {
  for (const btn of dock.querySelectorAll('button[data-nav]')) {
    btn.classList.toggle('is-active', btn.dataset.nav === name);
  }
}

function goToday() {
  state.screen = 'today';
  ticker.stop();
  guardBack(null);
  wakeLock.release();
  setChrome(true);
  todayView.update(todayModel());
  stage.replaceChildren(todayView.el);
  setDockActive('today');
}

function goPlaceholder(name) {
  state.screen = name;
  setChrome(true);
  const box = document.createElement('div');
  box.className = 'empty';
  box.textContent = TEXT.soonScreen;
  stage.replaceChildren(box);
  setDockActive(name);
}

function enterRun() {
  state.screen = 'run';
  setChrome(false);
  guardBack(GUARD.RUN);
  stage.replaceChildren(runView.el);
  runView.update(runModel(state.active, now()));
  wakeLock.request();
  ticker.start();
}

function summaryModel(record) {
  const found = findNextPlanned(record.date, repo.getPlans());
  const doneSets = record.results.reduce((sum, r) => sum + r.doneSets, 0);
  const planSets = record.results.reduce((sum, r) => sum + r.plannedSets, 0);
  return {
    dateText: labelOf(record.date),
    status: record.status,
    headline: record.status === 'complete' ? TEXT.summaryComplete : TEXT.summaryPartial,
    totalTimeText: duration(record.activeSeconds),
    doneText: `${doneSets} / ${planSets}${TEXT.unitSets}`,
    rows: record.results.map((r) => ({
      name: r.name,
      countText: `${r.doneSets} / ${r.plannedSets}${TEXT.unitSets}`,
      result: r.result,
      resultLabel: RESULT_LABEL[r.result] || '',
    })),
    nextPlanText: found ? labelOf(found) : null,
  };
}

function goSummary(record) {
  state.screen = 'summary';
  ticker.stop();
  guardBack(GUARD.SUMMARY);
  wakeLock.release();
  setChrome(false);
  summaryView.update(summaryModel(record));
  stage.replaceChildren(summaryView.el);
}

// --- 조작 ---------------------------------------------------------------------
function startToday() {
  const plan = repo.getPlan(todayKey());
  if (!plan) return;
  state.active = startSession({ plan, settings: state.settings, now: now() });
  saveActive(state.active, true);
  enterRun();
}

function continueToday() {
  const record = repo.getSession(todayKey());
  if (!record) return;
  const s = resumeSession({ session: fromRecord(record), settings: state.settings, now: now() });
  if (!s) return;
  state.active = s;
  saveActive(s, true);
  enterRun();
}

function finishRun(session) {
  const record = toRecord(session);
  repo.putSession(record);
  repo.clearActive();
  state.active = null;
  state.savedMark = '';
  goSummary(record);
}

function apply(result) {
  state.active = result.session;
  playCues(result.cues, result.session);
  if (result.session.phase === null) { finishRun(result.session); return; }
  saveActive(result.session);
  runView.update(runModel(result.session, now()));
}

function tick(t) {
  const s = state.active;
  if (!s || state.screen !== 'run') return;
  const stepped = advance(s, t);
  state.active = stepped.session;
  playCues(stepped.cues, stepped.session);
  if (stepped.session.phase === null) { finishRun(stepped.session); return; }
  saveActive(stepped.session);
  runView.update(runModel(stepped.session, t));
}

function handleNext() {
  if (!state.active) return;
  apply(pressNext(state.active, now()));
}

function handleSkip() {
  const s = state.active;
  if (!s || !canSkip(s)) return;
  apply(skipExercise(s, now()));
}

function handleUndo() {
  if (!state.active) return;
  apply(undoSkip(state.active, now()));
}

function handlePause() {
  const s = state.active;
  if (!s) return;
  const next = s.paused ? unpause(s, now()) : pause(s, now());
  if (next.paused) speech.cancel();
  state.active = next;
  saveActive(next, true);
  runView.update(runModel(next, now()));
}

let endAsking = false;

async function handleEnd() {
  if (!state.active || endAsking) return;
  endAsking = true;
  // 되돌릴 수 없는 조작이라 한 번 묻는다. 건너뛰기와 다른 점이다(01_spec.md 4.3.3)
  const answer = await showModal({
    title: TEXT.endConfirmTitle,
    body: TEXT.endConfirm,
    actions: [
      { label: TEXT.confirmNo, value: 'no' },
      { label: TEXT.confirmYes, value: 'yes', primary: true },
    ],
  });
  endAsking = false;
  if (answer !== 'yes' || !state.active) return;
  apply(endSession(state.active, now()));
}

dock.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-nav]');
  if (!btn) return;
  if (btn.dataset.nav === 'today') goToday();
  else goPlaceholder(btn.dataset.nav);
});

// --- 앱이 숨거나 내려갈 때 -------------------------------------------------------
// 휴식·전환의 남은 시간을 살리려면 마지막으로 살아 있던 시점을 적어 둬야 한다
// (01_spec.md 4.5.5). 이 두 자리가 실제 종료의 대부분을 잡는다.
function markAndSave() {
  const s = state.active;
  if (!s || s.phase === null) return;
  const marked = markAlive(s, now());
  state.active = marked;
  saveActive(marked, true);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    markAndSave();
    speech.cancel();
    audio.suspendAudio();
  } else {
    audio.resumeAudio();
  }
});
window.addEventListener('pagehide', markAndSave);

// 첫 손짓에서 음성을 한 번 깨운다. 소리 장치는 공용 부품이 같은 손짓에서 연다(4.4)
window.addEventListener('pointerdown', () => speech.warmUp(), { once: true });

// --- 시작 ---------------------------------------------------------------------
function boot() {
  // 실행 중 새로고침하면 위에서 얹은 이력 칸 위에서 앱이 다시 선다.
  // 그 칸을 이어받는다 - 버리면 다시 들어갈 때 새 칸을 얹어 새로고침 횟수만큼 쌓이고,
  // 그대로 두면 지키는 화면 없이 남아 뒤로 가기 한 번이 헛눌림이 된다.
  // 이어받아 두면 바로 아래 goToday() 가 정상 경로로 되돌려 준다.
  if (history.state && history.state.todayfit) ownsEntry = true;

  const saved = repo.getActive();
  if (saved) {
    // 닫혀 있던 동안 구간이 지나가지 않는다. 멈춘 상태로 되살아나 재개를 기다린다
    const restored = recover(saved);
    state.active = restored;
    saveActive(restored, true);
  }
  paintChromeText();
  goToday();
  registerServiceWorker();
}

boot();
