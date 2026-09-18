// 기본값과 소리 S-11 (05_manage-screens.md 4.10).
//
// 여섯 값이 반영 시점으로 두 묶음으로 갈린다 - 하나는 다음에 만드는 달 계획부터,
// 하나는 다음 운동부터. 화면에서도 그 둘을 갈라 놓고 묶음마다 한 줄로 적는다.
// 항목마다 같은 말을 반복하면 여섯 줄이 되고 아무도 읽지 않는다.

import { TEXT } from '../data/phrases.js';
import {
  el, screenHead, body, numberField, toggleRow, footNote, restoreFocus,
} from './parts.js';

export function createPrefsView(handlers) {
  const root = el('section', 'mscreen');

  return {
    el: root,

    update(m) {
      const parts = [screenHead(TEXT.prefsHeading, handlers.onBack)];
      const box = body();

      const planGroup = el('section', 'mgroup');
      planGroup.append(el('h3', 'mgroup-title', TEXT.prefsPlanGroup));
      planGroup.append(numberField({
        label: TEXT.fieldDefaultWork,
        value: m.workSeconds,
        unit: TEXT.unitSeconds,
        onCommit: (raw) => handlers.onCommitNumber?.('workSeconds', raw),
      }));
      planGroup.append(numberField({
        label: TEXT.fieldDefaultRest,
        value: m.restSeconds,
        unit: TEXT.unitSeconds,
        onCommit: (raw) => handlers.onCommitNumber?.('restSeconds', raw),
      }));
      planGroup.append(footNote(TEXT.prefsPlanNote));
      box.append(planGroup);

      const runGroup = el('section', 'mgroup');
      runGroup.append(el('h3', 'mgroup-title', TEXT.prefsRunGroup));
      runGroup.append(numberField({
        label: TEXT.fieldPrepSeconds,
        value: m.prepSeconds,
        unit: TEXT.unitSeconds,
        onCommit: (raw) => handlers.onCommitNumber?.('prepSeconds', raw),
      }));
      runGroup.append(numberField({
        label: TEXT.fieldTransitionSeconds,
        value: m.transitionSeconds,
        unit: TEXT.unitSeconds,
        onCommit: (raw) => handlers.onCommitNumber?.('transitionSeconds', raw),
      }));
      runGroup.append(toggleRow({
        label: TEXT.fieldVoice,
        note: m.voiceUnavailable ? TEXT.voiceUnavailable : undefined,
        on: m.voiceOn,
        onChange: (next) => handlers.onToggle?.('voiceOn', next),
        focusKey: 'voiceOn',
      }));
      runGroup.append(toggleRow({
        label: TEXT.fieldBeep,
        on: m.beepOn,
        onChange: (next) => handlers.onToggle?.('beepOn', next),
        focusKey: 'beepOn',
      }));
      runGroup.append(footNote(TEXT.prefsRunNote));
      box.append(runGroup);

      parts.push(box);
      root.replaceChildren(...parts);
      restoreFocus(root, m.focusKey);
    },
  };
}
