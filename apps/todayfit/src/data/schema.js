// 저장 구조 판 번호와 올림 처리 (02_data.md 5.8).
//
// 지금은 첫 판이라 올릴 것이 없다. 그래도 자리를 비워 두지 않는 이유는,
// 판을 올릴 때 "어디에 적어야 하나"를 다시 찾지 않게 하기 위해서다.

import { SCHEMA_VERSION, STORAGE_KEYS } from './constants.js';

/** 판 번호별 올림 함수. 키가 n 이면 n 판을 n+1 판으로 올린다. */
const MIGRATIONS = Object.freeze({});

/**
 * 저장된 판 번호를 지금 판까지 끌어올린다.
 * 처음 여는 기기는 아무것도 없으므로 지금 판 번호만 찍는다.
 */
export function migrate(store) {
  const found = store.get(STORAGE_KEYS.SCHEMA, null);
  let version = Number.isInteger(found) ? found : SCHEMA_VERSION;

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break; // 올림 함수가 없으면 더 손대지 않는다 - 값을 망가뜨리지 않는 쪽으로 튼다
    step(store);
    version += 1;
  }

  if (found !== version) store.set(STORAGE_KEYS.SCHEMA, version);
  return version;
}
