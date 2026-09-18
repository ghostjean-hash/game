// 관리 화면 묶음 - 조립 · 전환 · 저장 (03_architecture.md 2.7 / 05_manage-screens.md 3장).
//
// 화면 아홉은 그리기만 하고 상태를 바꾸지 않는다. 사용자가 무엇을 눌렀는지만 알려 오고,
// 그것을 저장에 반영하는 일은 전부 여기서 한다 - 화면마다 저장에 손대면 render 가
// 상태를 바꾸지 않는다는 규칙이 아홉 자리에서 조금씩 무너진다.
//
// 화면은 계단으로 쌓는다. 설정에서 목록으로, 목록에서 편집으로 들어가고 머리의
// 뒤로 버튼으로 되돌아온다. 브라우저 뒤로 가기는 쓰지 않는다(05_manage-screens.md 3.3).

import { newId } from './platform/id.js';
import { checkName, checkNumber, checkTime } from './core/validate.js';
import {
  routinesUsingExercise, weekdaysUsingRoutine,
  removeExerciseFromRoutines, unlinkRoutineFromWeekly, moveItem,
} from './core/cascade.js';
import { resolveItem, sourceOfItem, expandRoutine, indexById } from './core/resolve.js';
import { estimatePlanSeconds } from './core/estimate.js';
import { buildMonthPlans, previewMonthPlans } from './core/planner.js';
import { monthDateKeys, weekDateKeys, weekdayOf, shiftMonth, compareDateKey } from './core/datekey.js';
import { dayStatus, dayStatusMap, canEditPlan } from './core/dayStatus.js';
import { weekStats, monthStats, toPercent } from './core/stats.js';
import { now } from './platform/ticker.js';
import { minutes, duration, dayLabel, clockOfDay } from './render/format.js';
import { TEXT, SAY, WEEKDAY_LABEL, DAY_STATUS_LABEL, RESULT_LABEL } from './data/phrases.js';
import { NAME_MAX_LENGTH, NEW_EXERCISE, DAY_STATUS, WEEK_START } from './data/constants.js';

import { createSettingsView } from './render/settingsView.js';
import { createExerciseListView } from './render/exerciseListView.js';
import { createExerciseEditView } from './render/exerciseEditView.js';
import { createRoutineListView } from './render/routineListView.js';
import { createRoutineEditView } from './render/routineEditView.js';
import { createWeeklyView } from './render/weeklyView.js';
import { createCalendarView, previewBox } from './render/calendarView.js';
import { createDayView } from './render/dayView.js';
import { createPlanEditView } from './render/planEditView.js';
import { createPrefsView } from './render/prefsView.js';
import { showModal } from '../../../shared/ui.js';

const SCREEN = {
  SETTINGS: 'settings',
  EXERCISE_LIST: 'exerciseList',
  EXERCISE_EDIT: 'exerciseEdit',
  ROUTINE_LIST: 'routineList',
  ROUTINE_EDIT: 'routineEdit',
  WEEKLY: 'weekly',
  PREFS: 'prefs',
  CALENDAR: 'calendar',
  DAY: 'day',
  PLAN_EDIT: 'planEdit',
};

/** 오류 글자. 판정이 돌려준 이유를 화면에 나갈 말로 바꾼다. */
function errorText(result, isName = false) {
  if (result.reason === 'blank') return isName ? TEXT.errNameBlank : TEXT.errNumberBlank;
  if (result.reason === 'long') return SAY.errNameLong(result.max);
  if (result.reason === 'nan') return TEXT.errNumber;
  if (result.reason === 'range') return SAY.errRange(result.min, result.max);
  return TEXT.errNumber;
}

/** 값의 출처를 사람 말로. 루틴 편집 화면과 같은 짝을 쓴다(05_manage-screens.md 4.5.3). */
const SOURCE_NOTE = {
  routine: TEXT.sourceRoutine,
  exercise: TEXT.sourceExercise,
  settings: TEXT.sourceSettings,
};

function weekdayListText(weekdays) {
  if (weekdays.length === 0) return '';
  return weekdays.slice().sort((a, b) => a - b).map((w) => WEEKDAY_LABEL[w]).join(' · ');
}

export function createManage({
  repo, getSettings, onSettingsChange, todayKey, voiceAvailable, onExit,
}) {
  const root = document.createElement('div');
  root.className = 'manage';

  // 계단. 맨 끝이 지금 보이는 화면이다
  let stack = [];
  // 이 화면에서만 쓰는 보기 상태(펼친 항목 · 방금 누른 자리). 저장에 남기지 않는다
  let ui = {};
  // 달력이 보고 있는 달. 화면을 오가도 유지한다 - ui 에 두면 날짜 상세에 들렀다
  // 돌아올 때마다 이번 달로 튄다
  let shown = { year: 0, month: 0 };
  // 지금 무대에 올라 있는 화면. 값 하나를 고친 뒤 부분 갱신할 때 쓴다
  let live = null;

  const current = () => stack[stack.length - 1] || null;

  // --- 새로 만들다 그만둔 것 치우기 -------------------------------------------
  // 새 운동을 눌러 만든 빈 템플릿에 이름을 넣지 않고 나가면 그 항목을 버린다.
  // 이미 있던 운동은 여기서 건드리지 않는다 - 이름을 비우는 것으로는 지워지지 않는다
  // (05_manage-screens.md 4.3.4)
  function discardIfAbandoned(frame) {
    if (!frame || !frame.isNew) return;

    if (frame.name === SCREEN.EXERCISE_EDIT) {
      const found = repo.getExercises().find((e) => e.id === frame.id);
      if (!found || found.name.trim() !== '') return;
      repo.setExercises(repo.getExercises().filter((e) => e.id !== frame.id));
      return;
    }
    // 새 루틴을 눌렀다가 아무것도 담지 않고 나가면 그 빈 루틴을 버린다. 이름을
    // 고쳤거나 운동을 담았으면 사용자가 손댄 것이므로 남긴다
    if (frame.name === SCREEN.ROUTINE_EDIT) {
      const found = repo.getRoutines().find((r) => r.id === frame.id);
      if (!found || found.items.length > 0 || found.name !== TEXT.routineNewName) return;
      repo.setRoutines(repo.getRoutines().filter((r) => r.id !== frame.id));
    }
  }

  // --- 화면 전환 ---------------------------------------------------------------
  /**
   * 다시 그리기를 이번 틱 끝으로 미룬다.
   *
   * 입력 칸의 change 를 받아 그 자리에서 다시 그리면 지금 값을 돌려받고 있는 그 칸이
   * DOM 에서 떨어져 나간다. 브라우저가 change 를 마저 처리하는 중에 그 요소를 갈아
   * 끼우는 것이라, 이어지는 초점 이동과 되돌림 표시가 허공을 짚는다.
   */
  let renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    queueMicrotask(() => { renderQueued = false; render(); });
  }

  // 아직 만들지 않은 화면으로 들어가면 빈 자리에 갇힌다 - 그릴 것이 없으니 앞 화면이
  // 그대로 남고, 계단만 깊어져 뒤로 가기가 헛돈다. 아는 이름만 받는다
  const KNOWN = new Set(Object.values(SCREEN));

  function open(name, params = {}) {
    if (!KNOWN.has(name)) return;
    stack.push({ name, ...params });
    ui = {};
    render();
  }

  function back() {
    const leaving = stack.pop();
    discardIfAbandoned(leaving);
    ui = {};
    // 마지막 칸에서 더 물러나면 이 묶음 밖이다. 부른 쪽이 받는다(05_manage-screens.md 3.2)
    if (stack.length === 0) { onExit?.(); return; }
    render();
  }

  function reset(name) {
    discardIfAbandoned(current());
    stack = [{ name }];
    ui = {};
    render();
  }

  /** 계단을 접고 다른 주 화면으로 갈 때. 정리만 하고 그리지 않는다. */
  function leave() {
    discardIfAbandoned(current());
    stack = [];
    ui = {};
  }

  // --- 설정 S-03 ---------------------------------------------------------------
  function settingsModel() {
    const exercises = repo.getExercises();
    const routines = repo.getRoutines();
    const weekly = repo.getWeekly();
    const s = getSettings();
    const onDays = weekly.filter((d) => d.enabled).map((d) => d.weekday);

    return {
      isFirstRun: exercises.length === 0 && routines.length === 0,
      exerciseCountText: SAY.countItems(exercises.length),
      routineCountText: SAY.countItems(routines.length),
      weeklyText: onDays.length > 0 ? weekdayListText(onDays) : TEXT.weeklyNoneNote,
      prefsText: `${s.prepSeconds}${TEXT.unitSeconds} · ${s.restSeconds}${TEXT.unitSeconds}`,
    };
  }

  // --- 운동 템플릿 S-09 · S-10 --------------------------------------------------
  /**
   * 이름이 붙은 운동만. 새 운동을 만들다 앱을 닫으면 이름 빈 항목이 저장에 남는데
   * (만들자마자 저장하고 버리기는 나가는 조작에서만 돌기 때문이다), 그것이 목록과
   * 운동 고르기 창에 빈 줄로 뜨면 안 된다. 다음에 그 화면을 열면 정리된다
   */
  function namedExercises() {
    return repo.getExercises().filter((e) => e.name.trim() !== '');
  }

  /** 이름 없이 남은 항목을 치운다. 목록 화면에 들어올 때 한 번 훑는다 */
  function sweepNamelessExercises() {
    const all = repo.getExercises();
    const kept = all.filter((e) => e.name.trim() !== '');
    if (kept.length !== all.length) repo.setExercises(kept);
  }

  function exerciseListModel() {
    sweepNamelessExercises();
    const routines = repo.getRoutines();
    return {
      rows: repo.getExercises().map((e) => {
        const used = routinesUsingExercise(routines, e.id).length;
        return {
          id: e.id,
          name: e.name,
          specText: SAY.setsAndReps(e.sets, e.reps),
          usedText: used > 0 ? SAY.usedByRoutines(used) : TEXT.usedByNone,
        };
      }),
    };
  }

  function addExercise() {
    const row = { id: newId(), name: '', ...NEW_EXERCISE };
    repo.setExercises([...repo.getExercises(), row]);
    open(SCREEN.EXERCISE_EDIT, { id: row.id, isNew: true });
  }

  async function deleteExercise(id) {
    const exercises = repo.getExercises();
    const target = exercises.find((e) => e.id === id);
    if (!target) return;
    const used = routinesUsingExercise(repo.getRoutines(), id);

    const answer = await showModal({
      title: TEXT.exerciseDeleteTitle,
      body: SAY.deleteExerciseBody(target.name, used.length),
      actions: [
        { label: TEXT.cancelAction, value: 'no' },
        { label: TEXT.deleteAction, value: 'yes', primary: true },
      ],
    });
    if (answer !== 'yes') return;

    if (used.length > 0) {
      repo.setRoutines(removeExerciseFromRoutines(repo.getRoutines(), id));
    }
    repo.setExercises(exercises.filter((e) => e.id !== id));
    render();
  }

  function exerciseEditModel(frame) {
    const found = repo.getExercises().find((e) => e.id === frame.id);
    const s = getSettings();
    if (!found) return null;
    return {
      isNew: !!frame.isNew,
      nameMaxLength: NAME_MAX_LENGTH,
      name: found.name,
      sets: found.sets,
      reps: found.reps,
      workSeconds: found.workSeconds,
      restSeconds: found.restSeconds,
      defaultWorkSeconds: s.workSeconds,
      defaultRestSeconds: s.restSeconds,
    };
  }

  function patchExercise(id, patch) {
    repo.setExercises(repo.getExercises().map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  /**
   * 이름 저장. 새로 만든 것과 이미 있던 것을 가른다(05_manage-screens.md 4.3.4).
   * 새 것은 빈 이름을 조용히 받아 두고(나갈 때 버려진다), 이미 있던 것은
   * 저장하지 않고 이전 이름을 되돌린다 - 이름을 비우는 것으로 지워지면 안 된다.
   */
  function commitExerciseName(frame, raw) {
    const found = repo.getExercises().find((e) => e.id === frame.id);
    if (!found) return null;
    const result = checkName(raw);

    if (result.ok) {
      patchExercise(frame.id, { name: result.value });
      return { value: result.value };
    }
    if (result.reason === 'blank' && frame.isNew) {
      patchExercise(frame.id, { name: '' });
      return { value: '' };
    }
    return { error: errorText(result, true), value: found.name };
  }

  function commitExerciseNumber(frame, field, raw) {
    const found = repo.getExercises().find((e) => e.id === frame.id);
    if (!found) return null;
    const nullable = field === 'workSeconds' || field === 'restSeconds';
    const result = checkNumber(field, raw, nullable);
    if (!result.ok) return { error: errorText(result), value: found[field] };
    patchExercise(frame.id, { [field]: result.value });
    return { value: result.value };
  }

  // --- 루틴 S-07 · S-08 ---------------------------------------------------------
  function routineListModel() {
    const exercises = namedExercises();
    const exercisesById = indexById(exercises);
    const weekly = repo.getWeekly();
    const s = getSettings();

    return {
      needExercise: exercises.length === 0,
      rows: repo.getRoutines().map((r) => {
        const planned = expandRoutine(r, exercisesById, s);
        const days = weekdaysUsingRoutine(weekly, r.id);
        return {
          id: r.id,
          name: r.name,
          specText: `${SAY.countItems(planned.length)} · ${minutes(estimatePlanSeconds(planned, s))}`,
          linkedText: days.length > 0 ? weekdayListText(days) : TEXT.notLinked,
        };
      }),
    };
  }

  function addRoutine() {
    const row = { id: newId(), name: TEXT.routineNewName, items: [] };
    repo.setRoutines([...repo.getRoutines(), row]);
    open(SCREEN.ROUTINE_EDIT, { id: row.id, isNew: true });
  }

  /** 항목 배열을 깊게 복사한다. 얕게 두면 한쪽 루틴의 덮어쓰기가 다른 쪽에 같이 바뀐다. */
  function duplicateRoutine(id) {
    const found = repo.getRoutines().find((r) => r.id === id);
    if (!found) return;
    const copy = {
      id: newId(),
      name: found.name.slice(0, NAME_MAX_LENGTH - TEXT.copySuffix.length) + TEXT.copySuffix,
      items: found.items.map((it) => ({ ...it })),
    };
    repo.setRoutines([...repo.getRoutines(), copy]);
    render();
  }

  async function deleteRoutine(id) {
    const routines = repo.getRoutines();
    const target = routines.find((r) => r.id === id);
    if (!target) return;
    const days = weekdaysUsingRoutine(repo.getWeekly(), id);

    const answer = await showModal({
      title: TEXT.routineDeleteTitle,
      body: SAY.deleteRoutineBody(target.name, weekdayListText(days)),
      actions: [
        { label: TEXT.cancelAction, value: 'no' },
        { label: TEXT.deleteAction, value: 'yes', primary: true },
      ],
    });
    if (answer !== 'yes') return;

    if (days.length > 0) repo.setWeekly(unlinkRoutineFromWeekly(repo.getWeekly(), id));
    repo.setRoutines(routines.filter((r) => r.id !== id));
    render();
  }

  function routineEditModel(frame) {
    const found = repo.getRoutines().find((r) => r.id === frame.id);
    if (!found) return null;
    const exercises = namedExercises();
    const exercisesById = indexById(repo.getExercises());
    const s = getSettings();
    const planned = expandRoutine(found, exercisesById, s);

    const items = [];
    found.items.forEach((item, index) => {
      const ex = exercisesById[item.exerciseId];
      if (!ex) return; // 템플릿이 지워졌는데 남은 항목. 화면에 내지 않는다
      const value = resolveItem(item, ex, s);
      items.push({
        index,
        name: ex.name,
        specText: SAY.itemSpec(value),
        override: {
          sets: item.sets, reps: item.reps,
          workSeconds: item.workSeconds, restSeconds: item.restSeconds,
        },
        source: sourceOfItem(item, ex),
        hasOverride: [item.sets, item.reps, item.workSeconds, item.restSeconds]
          .some((v) => v !== null && v !== undefined),
        isOpen: ui.openItem === index,
        isFirst: index === 0,
        isLast: index === found.items.length - 1,
      });
    });

    return {
      name: found.name,
      nameMaxLength: NAME_MAX_LENGTH,
      estimateText: minutes(estimatePlanSeconds(planned, s)),
      items,
      hasNoExercises: exercises.length === 0,
    };
  }

  function patchRoutine(id, patch) {
    repo.setRoutines(repo.getRoutines().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function commitRoutineName(frame, raw) {
    const found = repo.getRoutines().find((r) => r.id === frame.id);
    if (!found) return null;
    const result = checkName(raw);
    if (!result.ok) return { error: errorText(result, true), value: found.name };
    patchRoutine(frame.id, { name: result.value });
    return { value: result.value };
  }

  function commitRoutineItem(frame, index, field, raw) {
    const found = repo.getRoutines().find((r) => r.id === frame.id);
    if (!found || !found.items[index]) return null;
    const result = checkNumber(field, raw, true); // 루틴 덮어쓰기는 넷 다 비울 수 있다
    if (!result.ok) return { error: errorText(result), value: found.items[index][field] };

    const items = found.items.map((it, i) => (i === index ? { ...it, [field]: result.value } : it));
    patchRoutine(frame.id, { items });

    // 화면을 다시 그리지 않는다 - 다시 그리면 사용자가 지금 누르려던 다음 칸이
    // DOM 에서 떨어져 나가 그 한 번이 헛눌림이 된다
    const next = routineEditModel(frame);
    live?.patch?.(next);
    const row = next.items.find((it) => it.index === index);
    return { value: result.value, note: row ? SOURCE_NOTE[row.source[field]] : undefined };
  }

  async function addRoutineItem(frame) {
    const exercises = namedExercises();
    if (exercises.length === 0) return;

    const picked = await showModal({
      title: TEXT.pickExerciseTitle,
      stack: true,
      actions: [
        ...exercises.map((e) => ({ label: e.name, value: e.id })),
        { label: TEXT.cancelAction, value: 'no' },
      ],
    });
    if (picked === 'no' || !picked) return;

    const found = repo.getRoutines().find((r) => r.id === frame.id);
    if (!found) return;
    const item = { exerciseId: picked, sets: null, reps: null, workSeconds: null, restSeconds: null };
    patchRoutine(frame.id, { items: [...found.items, item] });
    render();
  }

  function removeRoutineItem(frame, index) {
    const found = repo.getRoutines().find((r) => r.id === frame.id);
    if (!found) return;
    patchRoutine(frame.id, { items: found.items.filter((_, i) => i !== index) });
    if (ui.openItem === index) ui.openItem = null;
    else if (typeof ui.openItem === 'number' && ui.openItem > index) ui.openItem -= 1;
    render();
  }

  function moveRoutineItem(frame, index, delta) {
    const found = repo.getRoutines().find((r) => r.id === frame.id);
    if (!found) return;
    const items = moveItem(found.items, index, delta);
    if (items === found.items) return;
    patchRoutine(frame.id, { items });
    if (ui.openItem === index) ui.openItem = index + delta;
    render();
  }

  // --- 요일 규칙 S-06 -----------------------------------------------------------
  function weeklyModel() {
    const routines = repo.getRoutines();
    const options = routines.map((r) => ({ value: r.id, label: r.name }));
    // 루틴을 걸어 두었어도 그 루틴이 비었으면 그 요일은 계획을 만들지 못한다.
    // 운동 템플릿을 지우면 루틴 항목이 함께 빠지므로 저절로 이 상태가 된다
    const exercisesById = indexById(namedExercises());
    const s = getSettings();
    const emptyRoutines = new Set(routines
      .filter((r) => expandRoutine(r, exercisesById, s).length === 0)
      .map((r) => r.id));

    return {
      hasNoRoutines: routines.length === 0,
      focusKey: ui.focusKey,
      days: repo.getWeekly().map((d) => ({
        weekday: d.weekday,
        weekdayLabel: WEEKDAY_LABEL[d.weekday],
        enabled: d.enabled,
        time: d.time,
        routineId: d.routineId,
        routineOptions: options,
        warnNoRoutine: d.enabled && !d.routineId,
        warnEmptyRoutine: d.enabled && !!d.routineId && emptyRoutines.has(d.routineId),
      })),
    };
  }

  function patchWeekday(weekday, patch) {
    repo.setWeekly(repo.getWeekly().map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function toggleWeekday(weekday, next) {
    patchWeekday(weekday, { enabled: next });
    ui.focusKey = `weekday-${weekday}`;
    scheduleRender();
  }

  function commitWeekdayTime(weekday, raw) {
    const found = repo.getWeekly().find((d) => d.weekday === weekday);
    const result = checkTime(raw);
    if (!result.ok) return { error: TEXT.errNumber, value: found ? found.time : '' };
    patchWeekday(weekday, { time: result.value });
    return { value: result.value };
  }

  function pickWeekdayRoutine(weekday, routineId) {
    patchWeekday(weekday, { routineId });
    ui.focusKey = `routine-${weekday}`;
    scheduleRender();
  }

  // --- 달력 S-02 ---------------------------------------------------------------
  function calendarMonth() {
    if (!shown.year) {
      const [y, mo] = todayKey().split('-').map(Number);
      shown = { year: y, month: mo };
    }
    return shown;
  }

  function calendarModel() {
    const { year, month } = calendarMonth();
    const plans = repo.getPlans();
    const records = repo.getSessions();
    const today = todayKey();
    const active = repo.getActive();
    const activeDate = active ? active.date : null;

    const keys = monthDateKeys(year, month);
    const planCount = keys.filter((k) => plans[k]).length;

    // 주간 집계는 달을 넘을 수 있다 - 보고 있는 달 밖의 날짜도 함께 판정해 둔다
    const statusKeys = [...new Set([...keys, ...weekDateKeys(today)])];
    const statusMap = dayStatusMap({ dateKeys: statusKeys, todayKey: today, plans, records, activeDate });
    const statusOf = (k) => (statusMap[k] ? statusMap[k].status : DAY_STATUS.NONE);

    const week = weekStats(today, statusOf);
    const month_ = monthStats(year, month, statusOf);
    const rate = (s) => {
      const p = toPercent(s.rate);
      return p === null ? TEXT.rateNone : SAY.percent(p);
    };

    return {
      monthText: SAY.yearMonth(year, month),
      planCount,
      // 격자는 월요일에서 시작한다. 1일 앞의 빈칸 수가 그 달의 첫 요일에서 나온다
      weekdayHeads: WEEKDAY_LABEL.slice(1),
      leading: weekdayOf(keys[0]) - WEEK_START,
      days: keys.map((k) => {
        const found = statusMap[k];
        const status = found ? found.status : DAY_STATUS.NONE;
        return {
          date: k,
          dayNumber: Number(k.slice(-2)),
          status,
          running: !!(found && found.running),
          isToday: k === today,
          ariaLabel: [
            dayLabel(k, WEEKDAY_LABEL[weekdayOf(k)]),
            DAY_STATUS_LABEL[status],
            found && found.running ? TEXT.runningMark : '',
          ].filter(Boolean).join(' '),
        };
      }),
      legend: [DAY_STATUS.PLANNED, DAY_STATUS.COMPLETE, DAY_STATUS.PARTIAL, DAY_STATUS.MISSED]
        .map((s) => ({ status: s, label: DAY_STATUS_LABEL[s] })),
      stats: [
        { label: TEXT.weekRateLabel, value: rate(week) },
        { label: TEXT.weekProgressLabel, value: SAY.progressOf(week.progress.done, week.progress.total) },
        { label: TEXT.monthRateLabel, value: rate(month_) },
        { label: TEXT.monthProgressLabel, value: SAY.progressOf(month_.progress.done, month_.progress.total) },
        { label: TEXT.monthPartialLabel, value: SAY.planDays(month_.partial) },
      ],
    };
  }

  function shiftCalendar(delta) {
    const { year, month } = calendarMonth();
    shown = shiftMonth(year, month, delta);
    render();
  }

  /**
   * 미리보기에 실을 줄. 날짜 글자는 여기서 만든다 - 화면 층이 날짜 규칙을 직접 물면
   * 의존 방향이 거꾸로 선다(03_architecture.md 2장).
   */
  function previewDays(built) {
    const preview = previewMonthPlans(built);
    return {
      count: preview.count,
      days: preview.days.map((d) => ({
        dateText: dayLabel(d.date, WEEKDAY_LABEL[weekdayOf(d.date)]),
        detailText: SAY.dayLine(d.time, d.routineName, d.exerciseCount),
      })),
    };
  }

  /** 만들 것이 0일일 때 왜 0일인지 (05_manage-screens.md 4.7.5 4단계). */
  function whyNothing(existingDates) {
    // 켠 요일이 있는데 그 요일이 전부 이미 만들어진 경우가 가장 흔하다
    if (existingDates.length > 0) return TEXT.previewWhyAllMade;
    const on = repo.getWeekly().filter((d) => d.enabled);
    if (on.length === 0) return TEXT.previewWhyNoWeekday;

    const routinesById = indexById(repo.getRoutines());
    const linked = on.map((d) => routinesById[d.routineId]).filter(Boolean);
    // 루틴을 안 걸었거나, 건 루틴이 지워져 가리키는 곳이 없거나
    if (linked.length === 0) return TEXT.previewWhyNoRoutine;

    const exercisesById = indexById(namedExercises());
    const s = getSettings();
    const anyFilled = linked.some((r) => expandRoutine(r, exercisesById, s).length > 0);
    return anyFilled ? TEXT.previewWhyNoWeekday : TEXT.previewWhyEmptyRoutine;
  }

  async function makeMonthPlans() {
    const { year, month } = calendarMonth();
    const plans = repo.getPlans();
    const existingDates = monthDateKeys(year, month).filter((k) => plans[k]);

    const built = buildMonthPlans({
      year,
      month,
      weeklyRules: repo.getWeekly(),
      routines: repo.getRoutines(),
      exercises: repo.getExercises(),
      settings: getSettings(),
      createdAt: now(),
      existingDates,
    });

    if (built.length === 0) {
      await showModal({
        title: TEXT.previewNothing,
        body: whyNothing(existingDates),
        actions: [{ label: TEXT.okAction, primary: true }],
      });
      return;
    }

    const answer = await showModal({
      title: TEXT.previewTitle,
      bodyEl: previewBox(previewDays(built)),
      actions: [
        { label: TEXT.cancelAction, value: 'no' },
        { label: TEXT.previewConfirm, value: 'yes', primary: true },
      ],
    });
    if (answer !== 'yes') return;

    repo.putPlans(built);
    render();
  }

  // --- 날짜 상세 S-04 -----------------------------------------------------------
  function dayModel(frame) {
    const date = frame.date;
    const plan = repo.getPlan(date);
    const record = repo.getSession(date);
    const today = todayKey();
    const active = repo.getActive();
    const s = getSettings();

    const info = dayStatus({
      dateKey: date,
      todayKey: today,
      plan,
      record,
      activeDate: active ? active.date : null,
    });

    const base = {
      dateText: dayLabel(date, WEEKDAY_LABEL[weekdayOf(date)]),
      status: info.status,
      statusLabel: DAY_STATUS_LABEL[info.status],
    };

    if (info.status === DAY_STATUS.NONE) {
      // 지난 날짜에는 계획을 새로 만들지 않는다 - 만들어 봐야 곧바로 미실시가 된다
      return { ...base, canAdd: compareDateKey(date, today) >= 0, rows: [], facts: [] };
    }

    // 기록이 있으면 그 스냅샷이 진실이다. 계획을 나중에 고쳐도 지나간 날은 안 바뀐다
    const source = record ? record.plan : plan;
    const facts = [];
    if (source.time) facts.push({ label: TEXT.timeLabel, value: source.time });

    let rows;
    if (record) {
      facts.push({ label: TEXT.totalTimeLabel, value: duration(record.activeSeconds) });
      facts.push({ label: TEXT.startedAtLabel, value: clockOfDay(record.startedAt) });
      facts.push({ label: TEXT.endedAtLabel, value: clockOfDay(record.endedAt) });
      rows = record.results.map((r) => ({
        name: r.name,
        specText: `${r.doneSets} / ${r.plannedSets}${TEXT.unitSets}`,
        result: r.result,
        resultLabel: RESULT_LABEL[r.result] || '',
      }));
    } else {
      facts.push({ label: TEXT.estimateLabel, value: minutes(estimatePlanSeconds(source.exercises, s)) });
      facts.push({ label: TEXT.countLabel, value: SAY.countItems(source.exercises.length) });
      rows = source.exercises.map((ex) => ({
        name: ex.name,
        specText: SAY.setsAndReps(ex.sets, ex.reps),
      }));
    }

    const activeDate = active ? active.date : null;
    const canEdit = canEditPlan({ dateKey: date, todayKey: today, record, activeDate });
    return {
      ...base,
      routineName: source.routineName,
      facts,
      rows,
      missed: info.status === DAY_STATUS.MISSED,
      canEdit,
      lockReason: canEdit ? null : (record ? TEXT.lockedDone : TEXT.lockedPast),
    };
  }

  // --- 날짜별 계획 수정 S-05 ------------------------------------------------------
  /** 아직 계획이 없는 날짜에서 치는 예정 시간. 첫 운동을 담을 때 함께 저장된다. */
  function draftTime(date) {
    if (ui.draftTime !== undefined) return ui.draftTime;
    const rule = repo.getWeekly().find((d) => d.weekday === weekdayOf(date));
    return rule && rule.enabled ? rule.time : '';
  }

  function planEditModel(frame) {
    const plan = repo.getPlan(frame.date);
    const s = getSettings();
    const exercises = plan ? plan.exercises : [];

    return {
      isNew: !plan,
      dateText: dayLabel(frame.date, WEEKDAY_LABEL[weekdayOf(frame.date)]),
      hasNoRoutines: repo.getRoutines().length === 0,
      hasNoExercises: namedExercises().length === 0,
      time: plan ? plan.time : draftTime(frame.date),
      estimateText: minutes(estimatePlanSeconds(exercises, s)),
      items: exercises.map((ex, index) => ({
        index,
        name: ex.name,
        specText: SAY.itemSpec(ex),
        values: {
          sets: ex.sets, reps: ex.reps,
          workSeconds: ex.workSeconds, restSeconds: ex.restSeconds,
        },
        isOpen: ui.openItem === index,
        isFirst: index === 0,
        isLast: index === exercises.length - 1,
      })),
    };
  }

  /** 운동 목록을 갈아 끼운다. 목록이 비면 계획을 두지 않는다(05_manage-screens.md 4.9.7). */
  function writePlan(date, exercises, time) {
    if (exercises.length === 0) {
      repo.removePlan(date);
      return;
    }
    const before = repo.getPlan(date);
    repo.setPlan({
      date,
      time: time !== undefined ? time : (before ? before.time : draftTime(date)),
      routineName: before ? before.routineName : (ui.draftRoutineName || ''),
      createdAt: before ? before.createdAt : now(),
      exercises: exercises.map((ex, i) => ({ ...ex, order: i + 1 })),
    });
  }

  function commitPlanTime(frame, raw) {
    const result = checkTime(raw);
    const plan = repo.getPlan(frame.date);
    if (!result.ok) return { error: TEXT.errNumber, value: plan ? plan.time : draftTime(frame.date) };
    if (!plan) { ui.draftTime = result.value; return { value: result.value }; }
    repo.setPlan({ ...plan, time: result.value });
    return { value: result.value };
  }

  function commitPlanItem(frame, index, field, raw) {
    const plan = repo.getPlan(frame.date);
    if (!plan || !plan.exercises[index]) return null;
    // 날짜별 계획의 네 수치는 확정값이라 비울 수 없다(01_spec.md 3.3)
    const result = checkNumber(field, raw, false);
    if (!result.ok) return { error: errorText(result), value: plan.exercises[index][field] };
    const exercises = plan.exercises.map((ex, i) => (i === index ? { ...ex, [field]: result.value } : ex));
    writePlan(frame.date, exercises);
    live?.patch?.(planEditModel(frame));
    return { value: result.value };
  }

  async function addPlanItem(frame) {
    const exercises = namedExercises();
    if (exercises.length === 0) return;
    const picked = await showModal({
      title: TEXT.pickExerciseTitle,
      stack: true,
      actions: [
        ...exercises.map((e) => ({ label: e.name, value: e.id })),
        { label: TEXT.cancelAction, value: 'no' },
      ],
    });
    if (picked === 'no' || !picked) return;

    const template = exercises.find((e) => e.id === picked);
    if (!template) return;
    const s = getSettings();
    // 담는 순간 확정값으로 편다 - 날짜별 계획에는 빈 값이 없다
    const resolved = resolveItem(
      { sets: null, reps: null, workSeconds: null, restSeconds: null }, template, s,
    );
    const plan = repo.getPlan(frame.date);
    writePlan(frame.date, [...(plan ? plan.exercises : []), resolved]);
    render();
  }

  async function removePlanItem(frame, index) {
    const plan = repo.getPlan(frame.date);
    if (!plan) return;

    // 마지막 하나를 빼는 것은 이 날짜 계획을 지우는 것과 같다. 그렇게 묻는다
    if (plan.exercises.length === 1) {
      const answer = await showModal({
        title: TEXT.lastExerciseDeleteTitle,
        body: TEXT.lastExerciseDeleteBody,
        actions: [
          { label: TEXT.cancelAction, value: 'no' },
          { label: TEXT.deleteAction, value: 'yes', primary: true },
        ],
      });
      if (answer !== 'yes') return;
      repo.removePlan(frame.date);
      back();
      return;
    }

    writePlan(frame.date, plan.exercises.filter((_, i) => i !== index));
    if (ui.openItem === index) ui.openItem = null;
    else if (typeof ui.openItem === 'number' && ui.openItem > index) ui.openItem -= 1;
    render();
  }

  function movePlanItem(frame, index, delta) {
    const plan = repo.getPlan(frame.date);
    if (!plan) return;
    const exercises = moveItem(plan.exercises, index, delta);
    if (exercises === plan.exercises) return;
    writePlan(frame.date, exercises);
    if (ui.openItem === index) ui.openItem = index + delta;
    render();
  }

  async function fromRoutine(frame) {
    const routines = repo.getRoutines();
    if (routines.length === 0) return;

    const picked = await showModal({
      title: TEXT.fromRoutineTitle,
      stack: true,
      actions: [
        ...routines.map((r) => ({ label: r.name, value: r.id })),
        { label: TEXT.cancelAction, value: 'no' },
      ],
    });
    if (picked === 'no' || !picked) return;

    const plan = repo.getPlan(frame.date);
    // 지금 담긴 것이 사라지므로 한 번 더 묻는다. 비어 있으면 잃을 것이 없어 건너뛴다
    if (plan && plan.exercises.length > 0) {
      const ok = await showModal({
        title: TEXT.fromRoutineConfirmTitle,
        body: TEXT.fromRoutineConfirmBody,
        actions: [
          { label: TEXT.cancelAction, value: 'no' },
          { label: TEXT.okAction, value: 'yes', primary: true },
        ],
      });
      if (ok !== 'yes') return;
    }

    const routine = routines.find((r) => r.id === picked);
    const expanded = expandRoutine(routine, indexById(repo.getExercises()), getSettings());

    // 빈 루틴을 불러오면 목록이 0개가 되고, 그대로 두면 writePlan 이 이 날짜 계획을
    // 통째로 지운다 - 사용자는 목록을 바꾸겠다고 했지 계획을 지우겠다고 하지 않았다.
    // 계획 삭제는 전용 확인 창을 거치는 조작이다(05_manage-screens.md 4.9.6)
    if (expanded.length === 0) {
      await showModal({
        title: TEXT.fromRoutineEmptyTitle,
        body: TEXT.fromRoutineEmptyBody,
        actions: [{ label: TEXT.okAction, primary: true }],
      });
      return;
    }

    ui.draftRoutineName = routine.name;
    if (plan) repo.setPlan({ ...plan, routineName: routine.name });
    writePlan(frame.date, expanded);
    render();
  }

  async function deletePlan(frame) {
    const answer = await showModal({
      title: TEXT.planDeleteTitle,
      body: TEXT.planDeleteBody,
      actions: [
        { label: TEXT.cancelAction, value: 'no' },
        { label: TEXT.deleteAction, value: 'yes', primary: true },
      ],
    });
    if (answer !== 'yes') return;
    repo.removePlan(frame.date);
    back();
  }

  // --- 기본값과 소리 S-11 ---------------------------------------------------------
  function prefsModel() {
    const s = getSettings();
    return {
      ...s,
      voiceUnavailable: !voiceAvailable(),
      focusKey: ui.focusKey,
    };
  }

  function saveSettings(patch) {
    const next = { ...getSettings(), ...patch };
    repo.setSettings(next);
    // 저장만 고치면 앱을 다시 열기 전까지 오늘 화면의 예상 시간이 옛 값으로 남는다
    onSettingsChange?.(repo.getSettings());
  }

  function commitPref(field, raw) {
    const result = checkNumber(field, raw, false);
    if (!result.ok) return { error: errorText(result), value: getSettings()[field] };
    saveSettings({ [field]: result.value });
    return { value: result.value };
  }

  function togglePref(field, next) {
    saveSettings({ [field]: next });
    ui.focusKey = field;
    scheduleRender();
  }

  // --- 그리기 -------------------------------------------------------------------
  function mount(view, model) {
    if (model === null) { back(); return; }
    view.update(model);
    live = view;
    root.replaceChildren(view.el);
  }

  function render() {
    const frame = current();
    if (!frame) return;

    switch (frame.name) {
      case SCREEN.SETTINGS:
        mount(createSettingsView({ onOpen: (name) => open(name) }), settingsModel());
        break;

      case SCREEN.EXERCISE_LIST:
        mount(createExerciseListView({
          onBack: back,
          onOpen: (id) => open(SCREEN.EXERCISE_EDIT, { id }),
          onAdd: addExercise,
          onDelete: deleteExercise,
        }), exerciseListModel());
        break;

      case SCREEN.EXERCISE_EDIT:
        mount(createExerciseEditView({
          onBack: back,
          onCommitName: (raw) => commitExerciseName(frame, raw),
          onCommitNumber: (field, raw) => commitExerciseNumber(frame, field, raw),
        }), exerciseEditModel(frame));
        break;

      case SCREEN.ROUTINE_LIST:
        mount(createRoutineListView({
          onBack: back,
          onOpen: (id) => open(SCREEN.ROUTINE_EDIT, { id }),
          onAdd: addRoutine,
          onDuplicate: duplicateRoutine,
          onDelete: deleteRoutine,
        }), routineListModel());
        break;

      case SCREEN.ROUTINE_EDIT:
        mount(createRoutineEditView({
          onBack: back,
          onCommitName: (raw) => commitRoutineName(frame, raw),
          onAddItem: () => addRoutineItem(frame),
          onRemoveItem: (i) => removeRoutineItem(frame, i),
          onMove: (i, d) => moveRoutineItem(frame, i, d),
          onToggleItem: (i) => { ui.openItem = ui.openItem === i ? null : i; render(); },
          onCommitItem: (i, field, raw) => commitRoutineItem(frame, i, field, raw),
          onGoExercises: () => open(SCREEN.EXERCISE_LIST),
        }), routineEditModel(frame));
        break;

      case SCREEN.WEEKLY:
        mount(createWeeklyView({
          onBack: back,
          onToggle: toggleWeekday,
          onCommitTime: commitWeekdayTime,
          onPickRoutine: pickWeekdayRoutine,
          onGoRoutines: () => open(SCREEN.ROUTINE_LIST),
        }), weeklyModel());
        break;

      case SCREEN.CALENDAR:
        mount(createCalendarView({
          onShiftMonth: shiftCalendar,
          onMakePlan: makeMonthPlans,
          onPickDate: (date) => open(SCREEN.DAY, { date }),
        }), calendarModel());
        break;

      case SCREEN.DAY:
        mount(createDayView({
          onBack: back,
          onEditPlan: () => open(SCREEN.PLAN_EDIT, { date: frame.date }),
          onAddPlan: () => open(SCREEN.PLAN_EDIT, { date: frame.date }),
        }), dayModel(frame));
        break;

      case SCREEN.PLAN_EDIT:
        mount(createPlanEditView({
          onBack: back,
          onCommitTime: (raw) => commitPlanTime(frame, raw),
          onAddItem: () => addPlanItem(frame),
          onRemoveItem: (i) => removePlanItem(frame, i),
          onMove: (i, d) => movePlanItem(frame, i, d),
          onToggleItem: (i) => { ui.openItem = ui.openItem === i ? null : i; render(); },
          onCommitItem: (i, field, raw) => commitPlanItem(frame, i, field, raw),
          onFromRoutine: () => fromRoutine(frame),
          onDeletePlan: () => deletePlan(frame),
          onGoExercises: () => open(SCREEN.EXERCISE_LIST),
        }), planEditModel(frame));
        break;

      case SCREEN.PREFS:
        mount(createPrefsView({
          onBack: back,
          onCommitNumber: commitPref,
          onToggle: togglePref,
        }), prefsModel());
        break;

      default:
        break;
    }
  }

  return {
    el: root,
    showSettings: () => reset(SCREEN.SETTINGS),
    showCalendar: () => reset(SCREEN.CALENDAR),
    leave,
  };
}
