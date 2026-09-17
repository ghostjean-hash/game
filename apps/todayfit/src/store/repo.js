// 저장 읽기·쓰기 (02_data.md 5장 / 04_conventions.md 4장).
//
// 저장에 손대는 자리는 이 파일 하나다. localStorage 를 직접 부르지 않는다 -
// 공용 저장기는 쓰기마다 슬롯 변경 시각을 찍고 클라우드에 알리는데, 직접 접근하면
// 그 신호가 끊겨 다른 기기와 어긋난다(03_architecture.md 3.2).
//
// 읽을 때 값이 없거나 깨져 있으면 기본값으로 시작한다. 깨진 값 하나 때문에
// 화면이 아예 뜨지 않는 상태를 만들지 않는다(04_conventions.md 4.3).

import { createStorage } from '../../../../shared/storage.js';
import {
  STORAGE_NAMESPACE,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DAYS_IN_WEEK,
} from '../data/constants.js';
import { migrate } from '../data/schema.js';

/** 요일 규칙 7행. 켠 요일이 하나도 없는 상태가 처음 모습이다(02_data.md 5.3). */
function blankWeekly() {
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => ({
    weekday: i + 1,
    enabled: false,
    time: '',
    routineId: null,
  }));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

export function createRepo(storage = createStorage(STORAGE_NAMESPACE)) {
  migrate(storage);

  const get = (key, fallback) => storage.get(key, fallback);
  const set = (key, value) => storage.set(key, value);

  return {
    // --- 앱 설정 ---
    // 저장된 설정에 빠진 항목이 있어도 기본값이 받친다 - 판을 올려 항목이 늘어난 경우다
    getSettings() {
      return { ...DEFAULT_SETTINGS, ...asMap(get(STORAGE_KEYS.SETTINGS, null)) };
    },
    setSettings(settings) {
      set(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...settings });
    },

    // --- 운동 템플릿 ---
    getExercises() { return asArray(get(STORAGE_KEYS.EXERCISES, null)); },
    setExercises(list) { set(STORAGE_KEYS.EXERCISES, asArray(list)); },

    // --- 루틴 ---
    getRoutines() { return asArray(get(STORAGE_KEYS.ROUTINES, null)); },
    setRoutines(list) { set(STORAGE_KEYS.ROUTINES, asArray(list)); },

    // --- 요일 규칙 ---
    getWeekly() {
      const found = asArray(get(STORAGE_KEYS.WEEKLY, null));
      return found.length === DAYS_IN_WEEK ? found : blankWeekly();
    },
    setWeekly(rules) { set(STORAGE_KEYS.WEEKLY, rules); },

    // --- 날짜별 계획 ---
    getPlans() { return asMap(get(STORAGE_KEYS.PLANS, null)); },
    getPlan(dateKey) { return this.getPlans()[dateKey] || null; },
    setPlan(plan) {
      const plans = this.getPlans();
      plans[plan.date] = plan;
      set(STORAGE_KEYS.PLANS, plans);
    },
    // 월간 생성은 날짜 수십 개를 한 번에 쓴다. 한 건씩 저장하면 그만큼 클라우드 신호가 울린다
    putPlans(list) {
      const plans = this.getPlans();
      for (const plan of list) plans[plan.date] = plan;
      set(STORAGE_KEYS.PLANS, plans);
    },
    removePlan(dateKey) {
      const plans = this.getPlans();
      delete plans[dateKey];
      set(STORAGE_KEYS.PLANS, plans);
    },

    // --- 수행 기록 ---
    getSessions() { return asMap(get(STORAGE_KEYS.SESSIONS, null)); },
    getSession(dateKey) { return this.getSessions()[dateKey] || null; },
    putSession(record) {
      const sessions = this.getSessions();
      sessions[record.date] = record;
      set(STORAGE_KEYS.SESSIONS, sessions);
    },

    // --- 진행 중 세션 ---
    // 이 키는 계정에 올리지 않는다. 어느 기기에서 운동 중인지는 그 기기의 상태이고,
    // 다른 기기로 넘기면 같은 세션이 둘로 갈린다(shared/cloud/policy.js)
    getActive() {
      const found = get(STORAGE_KEYS.ACTIVE, null);
      if (!found || typeof found !== 'object' || !found.plan) return null;
      return found;
    },
    setActive(session) { set(STORAGE_KEYS.ACTIVE, session); },
    clearActive() { storage.remove(STORAGE_KEYS.ACTIVE); },
  };
}
