// 설정 S-03 (05_manage-screens.md 4.1).
//
// 관리 화면 넷으로 가는 통로다. 각 줄에 지금 상태를 함께 보여 들어가 보지 않아도
// 무엇이 비어 있는지 알 수 있게 한다.
//
// 아무것도 등록하지 않은 상태에서 이 화면이 앱의 출발점이 되므로,
// 그때는 맨 위에 무엇부터 하면 되는지 한 줄을 둔다.

import { TEXT } from '../data/phrases.js';
import { el, screenHead, body, navRow } from './parts.js';

export function createSettingsView({ onOpen }) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(TEXT.settingsHeading, null)];
      const box = body();

      if (m.isFirstRun) box.append(el('p', 'mhint', TEXT.settingsFirstHint));

      box.append(navRow({
        label: TEXT.navExercises,
        value: m.exerciseCountText,
        onClick: () => onOpen?.('exerciseList'),
      }));
      box.append(navRow({
        label: TEXT.navRoutines,
        value: m.routineCountText,
        onClick: () => onOpen?.('routineList'),
      }));
      box.append(navRow({
        label: TEXT.navWeekly,
        value: m.weeklyText,
        onClick: () => onOpen?.('weekly'),
      }));
      box.append(navRow({
        label: TEXT.navPrefs,
        value: m.prefsText,
        onClick: () => onOpen?.('prefs'),
      }));

      parts.push(box);
      root.replaceChildren(...parts);
    },
  };
}
