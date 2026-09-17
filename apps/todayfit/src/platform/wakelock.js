// 화면 꺼짐 방지 (03_architecture.md 4.2).
//
// 이 저장소에서 처음 쓰는 기능이라 참고할 기존 자리가 없다. 브라우저 사정을 여기 가둔다.
//
// 이 기능으로 화면 꺼짐을 완전히 막지는 못한다. 사용자가 전원 버튼을 누르면 풀리고,
// 화면이 잠기거나 다른 앱으로 넘어가도 저절로 풀린다. 돌아왔을 때 다시 요청한다(4.2.3).
// 지원하지 않는 브라우저에서는 조용히 넘어간다 - 화면이 꺼져도 앱은 멈추지 않고,
// 돌아오면 복구 규칙이 받는다(01_spec.md 4.5).

export function createWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  let sentinel = null;
  let wanted = false;

  async function acquire() {
    if (!supported || !wanted || sentinel) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } catch {
      sentinel = null; // 배터리 절약 모드 등에서 거절된다. 진행에는 영향이 없다
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') acquire();
  }

  return {
    supported,
    request() {
      if (wanted) return;
      wanted = true;
      document.addEventListener('visibilitychange', onVisible);
      acquire();
    },
    release() {
      wanted = false;
      document.removeEventListener('visibilitychange', onVisible);
      const held = sentinel;
      sentinel = null;
      if (held) { try { held.release(); } catch { /* 이미 풀린 경우 */ } }
    },
  };
}
