// 러시아워 저장 모양 (설계 docs/plans/design-2026-09-06-platform-store.md 5장 · 6장).
//
// 두 가지를 담는다.
//   1. 옛 저장을 플랫폼 저장 칸으로 옮기는 규칙 (딱 한 번 돈다)
//   2. 플랫폼 저장 칸과 게임이 읽는 옛 모양 사이의 변환기 (매번 돈다)
//
// 걸음 B에서 변환기의 절반이 걷혔다 - 진행·별·최고 기록·마지막 위치·연속 클리어는 이제
// 공용 진행 부품(shared/frame/progress.js)이 갖는다. 여기 남은 것은 지갑·산 것·쓰는 것·
// 게임 칸뿐이고, 그것도 걸음 C에서 사라진다.
//
// 지금까지 러시아워는 'progress' 키 하나에 골드·산 것·쓰는 것·모드별 진행을 통째로 담았고,
// 그 큰 객체를 읽고 쓰는 코드가 main.js 700줄에 퍼져 있다. 저장 자리를 옮기면서 그 700줄까지
// 함께 고치면 무엇이 깨졌는지 가릴 수 없다. 그래서 변환기를 두어 나머지 코드가 옛 모양을
// 그대로 보게 한다. 변환기는 임시 구조물이다 - 진행이 플랫폼으로 가는 걸음에서 절반이,
// 지갑·상점이 가는 걸음에서 나머지가 사라진다.
//
// 셋 다 순수 함수다. 저장도 화면도 만지지 않아야 화면 없는 곳에서 검사할 수 있다
// (설계 4.3 / 7.1, tests/save.test.mjs). 그래서 모드 목록·기본값도 모듈에서 끌어오지 않고
// 인자로 받는다 - main.js를 불러오면 화면이 없는 곳에서 죽는다.

// 저장 판 번호. 판을 또 바꿀 일이 생기면 이 값을 올리고 그 판의 규칙을 아래에 더한다.
//
// 올릴 때 반드시 지킬 것: migrateToPlatform은 **어느 판에서 오는 저장이든 받아도 안전해야 한다.**
// 지금은 갈래마다 이미 새 모양인지 보고(stages가 있으면 새 모양) 그대로 이어받으며, 진행 밖
// 칸들(지갑·산 것·쓰는 것·게임 칸)도 옛 값이 없으면 지금 값을 받침으로 쓴다. 이 두 장치를
// 지우고 판 번호만 올리면 이미 옮긴 사람의 골드와 진행이 그 자리에서 0으로 초기화된다.
export const SAVE_SCHEMA = 2;

function asObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}

// 저장이 지금 판 모양인가. 판 번호가 맞아도 이것이 false면 다시 옮겨야 한다.
//
// 왜 필요한가: 계정 저장은 기기 사이를 오간다. 한 기기가 새 판으로 올라간 뒤에도 다른 기기가
// 아직 옛 빌드면(설치형 앱 캐시 때문에 며칠 남을 수 있다) 그 기기가 옛 모양 진행을 계정에
// 올린다. 그것이 내려오면 판 번호는 그대로인데 진행만 옛 모양이 되고, 그 상태로는 깬 판·별·
// 최고 기록이 화면에서 통째로 비어 보인다.
export function looksCurrent(cells) {
  const pg = asObject(asObject(cells)?.progress);
  if (!pg) return true; // 진행 칸이 아직 없으면 판정할 것이 없다
  const modes = asObject(pg.modes);
  if (!modes) return false; // 진행은 있는데 갈래가 없으면 갈래 이전의 옛 모양이다
  // 지금 모양은 갈래마다 반드시 stages를 갖는다. 없으면 옛 모양이다.
  return Object.values(modes).every((m) => !asObject(m) || asObject(m.stages) !== null);
}

// --- 1. 옛 저장 → 플랫폼 저장 칸 (한 번만) ---
//
// 옛 저장 전부(키 이름 → 값)를 받아 저장 칸을 돌려준다.
// opts - modeIds: 갈래 이름 목록, defaultMode/Theme/Accessory/Style: 값이 없을 때 쓸 기본값.
// ctx.remigrate - 다시 옮기는 중인가(아래 설명).
export function migrateToPlatform(old, opts, ctx) {
  const src = asObject(old) || {};
  const { modeIds = [], defaultMode, defaultTheme, defaultAccessory, defaultStyle } = opts || {};
  const s = asObject(src.progress) || {};

  // 이미 새 모양으로 옮겨져 있는 칸들.
  const nowWallet = asObject(src.wallet) || {};
  const nowOwned = asObject(src.owned) || {};
  const nowEquipped = asObject(src.equipped) || {};
  const nowGame = asObject(src.game) || {};

  // 진행 밖 값(지갑·산 것·쓰는 것·게임 칸)은 어느 쪽이 이기는가 - 상황에 따라 반대다.
  //
  //   첫 옮기기   새 칸이 아직 비어 있다. 옛 값이 이긴다.
  //   다시 옮기기 다른 기기의 옛 빌드가 올린 진행이 내려온 상황이다(looksCurrent 설명 참고).
  //               그 옛 덩어리 안에도 골드·산 것이 함께 들어 있지만 그것은 옛 기기의 값이고,
  //               이 기기가 그 뒤에 벌고 산 것이 새 칸에 있다. **지금 값이 이긴다.**
  //               2회차 검사가 재현한 자리다 - 여기를 가르지 않으면 다시 옮길 때마다
  //               그 사이 번 골드와 산 물건이 되돌아가고, 백업은 이미 있어 덮지 않으므로
  //               되돌릴 곳도 없다.
  const remigrate = !!(ctx && ctx.remigrate);
  const pick = (oldVal, nowVal, ok, fallback) => {
    const first = remigrate ? nowVal : oldVal;
    const second = remigrate ? oldVal : nowVal;
    if (ok(first)) return first;
    if (ok(second)) return second;
    return fallback;
  };
  const isNum = (v) => typeof v === 'number';
  const isStr = (v) => typeof v === 'string' && v.length > 0;

  // 갈래가 없던 더 옛 구조는 최상위 값 + 별도 'current' 키를 오리지널 갈래로 본다.
  // 지금 코드가 이미 하고 있던 하위호환을 그대로 옮긴 것이다.
  const oldModes = asObject(s.modes) || {
    [defaultMode]: {
      cleared: s.cleared, best: s.best, stars: s.stars,
      combo: s.combo, bestCombo: s.bestCombo, current: src.current,
    },
  };

  const modes = {};
  for (const id of modeIds) {
    const o = asObject(oldModes[id]) || {};

    // 이 갈래가 이미 새 모양이면 그대로 이어받는다. 새 모양을 옛 모양으로 알고 읽으면
    // 깬 판·별·최고 기록이 통째로 빈다(판 번호를 올릴 때 특히 그렇다).
    if (asObject(o.stages)) {
      modes[id] = {
        stages: o.stages,
        current: o.current === undefined ? null : o.current,
        extra: asObject(o.extra) || { combo: 0, bestCombo: 0 },
      };
      continue;
    }

    const stages = {};
    const touch = (pid) => (stages[pid] = stages[pid] || {});

    // 깬 판 목록 → 판별 항목으로 편다.
    for (const pid of Array.isArray(o.cleared) ? o.cleared : []) touch(pid).cleared = true;
    const stars = asObject(o.stars) || {};
    for (const pid of Object.keys(stars)) touch(pid).stars = stars[pid];
    // 판별 최고 기록(최소 이동 수). 세운 시각은 옛 데이터에 없어 null이다.
    const best = asObject(o.best) || {};
    for (const pid of Object.keys(best)) touch(pid).best = { value: best[pid], at: null };

    modes[id] = {
      stages,
      current: o.current === undefined ? null : o.current,
      // 연속 클리어는 러시아워 고유 규칙이라 갈래별 게임 고유 값 자리에 둔다.
      extra: { combo: o.combo || 0, bestCombo: o.bestCombo || 0 },
    };
  }

  // 갈래 이름은 옛 저장에서 activeMode, 새 저장에서 active에 담긴다. 둘 다 본다.
  const activeRaw = s.active === undefined ? s.activeMode : s.active;

  const out = {
    progress: { active: modeIds.includes(activeRaw) ? activeRaw : defaultMode, modes },
    wallet: { gold: pick(s.gold, nowWallet.gold, isNum, 0) },
    owned: {
      theme: pick(s.ownedThemes, nowOwned.theme, Array.isArray, [defaultTheme]),
      accessory: pick(s.ownedAccessories, nowOwned.accessory, Array.isArray, [defaultAccessory]),
    },
    equipped: {
      theme: pick(s.equippedTheme, nowEquipped.theme, isStr, defaultTheme),
      accessory: pick(s.equippedAccessory, nowEquipped.accessory, isStr, defaultAccessory),
      style: pick(s.ponyStyle, nowEquipped.style, isStr, defaultStyle),
    },
    // 캐릭터별 배경·테두리는 켜고 끄는 값이라 상점의 보유·장착 모델에 맞지 않는다.
    // 규격이 뜻을 정하지 않는 게임 칸이 제자리다(기획서 Ⅲ권 4.1 마지막 칸).
    // 통째로 갈아치우지 않고 겹쳐 담는다 - 게임 칸에 다른 항목이 늘어도 잃지 않게.
    game: remigrate
      ? { ...(s.blockOpts ? { blockOpts: s.blockOpts } : {}), ...nowGame }
      : { ...nowGame, ...(s.blockOpts ? { blockOpts: s.blockOpts } : {}) },
  };

  // 소리는 두 곳에 저장돼 있었다. 실제로 동작하는 것은 공용 칸이라 게임 쪽 값을 버리되,
  // 공용 칸이 비어 있을 때만 옛 값을 옮겨 준다(설계 5.2).
  if ((src.muted === undefined || src.muted === null) && s.muted) out.muted = true;

  return out;
}

// --- 2. 저장 칸 → 게임이 읽는 모양 (매번) ---
//
// 진행은 여기 없다(걸음 B에서 공용 진행 부품으로 갔다). 지갑·산 것·쓰는 것·게임 칸만 남았다.
export function assembleShape(cells, opts) {
  const c = asObject(cells) || {};
  const { defaultTheme, defaultAccessory, defaultStyle } = opts || {};
  const wallet = asObject(c.wallet) || {};
  const owned = asObject(c.owned) || {};
  const eq = asObject(c.equipped) || {};
  const gm = asObject(c.game) || {};

  return {
    gold: wallet.gold || 0,
    ownedThemes: Array.isArray(owned.theme) ? owned.theme : [defaultTheme],
    equippedTheme: eq.theme || defaultTheme,
    ownedAccessories: Array.isArray(owned.accessory) ? owned.accessory : [defaultAccessory],
    equippedAccessory: eq.accessory || defaultAccessory,
    ponyStyle: eq.style || defaultStyle,
    blockOpts: gm.blockOpts,
  };
}

// --- 3. 게임이 읽는 모양 → 저장 칸 (매번) ---
//
// prev는 지금 저장돼 있는 칸들(`{ game }`)이다. 이 변환기는 blockOpts만 알므로, 게임 칸의
// 나머지 항목은 그대로 얹어 둔다. 통째로 갈아치우면 항목이 하나만 늘어도 다음 저장 한 번에
// 사라진다.
export function scatterShape(pr, prev) {
  const p = asObject(pr) || {};
  const prevGame = asObject(asObject(prev)?.game) || {};
  return {
    wallet: { gold: p.gold || 0 },
    owned: { theme: p.ownedThemes, accessory: p.ownedAccessories },
    equipped: { theme: p.equippedTheme, accessory: p.equippedAccessory, style: p.ponyStyle },
    game: p.blockOpts ? { ...prevGame, blockOpts: p.blockOpts } : { ...prevGame },
  };
}
