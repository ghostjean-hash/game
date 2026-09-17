// 음성 안내 (03_architecture.md 4.5).
//
// 문구는 src/data/phrases.js 가 갖는다. 이 파일은 읽어 주는 장치만 다룬다.
//
// 한국어 음성이 없는 기기가 있다. 그때는 음성을 끄고 비프음만 낸다 - 영어 음성으로
// 한국어 문장을 읽히면 알아들을 수 없는 소리가 나온다(4.5.3).
// 음성 실패가 진행을 막지 않는다. 전체를 감싸 삼키고 구간은 그대로 돈다(4.5.5).

import { SOUND } from '../data/constants.js';

const LANG_PREFIX = SOUND.voiceLang.split('-')[0];

export function createSpeech() {
  const api = typeof globalThis !== 'undefined' ? globalThis.speechSynthesis : null;
  let voice = null;
  let ready = false;

  function pickVoice() {
    if (!api) return null;
    const list = api.getVoices() || [];
    return list.find((v) => v.lang && v.lang.toLowerCase().startsWith(LANG_PREFIX)) || null;
  }

  function refresh() {
    voice = pickVoice();
    ready = true;
  }

  if (api) {
    refresh();
    // 목록은 늦게 채워지는 브라우저가 있다. 한 번 더 받아 둔다
    if (!voice) api.addEventListener?.('voiceschanged', refresh, { once: true });
  }

  return {
    // 한국어 음성이 없으면 쓸 수 없다고 알린다. 화면의 음성 설정이 이 값을 표시한다
    available() { return !!api && !!voice; },
    checked() { return ready; },

    /** 첫 손짓에서 한 번 깨운다. 빈 문장을 읽혀 두면 그 뒤의 안내가 막히지 않는다(4.4.2). */
    warmUp() {
      if (!api) return;
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        api.speak(u);
      } catch { /* 깨우기 실패가 진행을 막지 않는다 */ }
    },

    /** 새 안내를 내기 전에 앞 안내를 끊는다 - 세트가 빨리 지나가면 안내가 밀려 쌓인다(4.5.2). */
    say(text) {
      if (!api || !voice || !text) return;
      try {
        api.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = SOUND.voiceLang;
        u.rate = SOUND.voiceRate;
        api.speak(u);
      } catch { /* 음성 실패는 진행에 영향 없음 */ }
    },

    cancel() {
      if (!api) return;
      try { api.cancel(); } catch { /* 이미 비어 있는 경우 */ }
    },
  };
}
