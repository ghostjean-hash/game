// 시작 흐름 공용 프레임 - 진행 (기획서 Ⅲ권 4.2 · 4.4, 설계 docs/plans/design-2026-09-06-platform-progress.md).
//
// 게임이 판 목록을 넘기면 이 부품이 그것을 진행으로 바꾼다 - 깬 표시·별·최고 기록·마지막
// 위치를 저장하고, 다음·이전을 세고, 잠금을 판정한다. 게임은 한 판이 끝났다는 사실과
// 결과만 알리면 된다(finish).
//
// **판 하나에서 이 부품이 요구하는 것은 id 하나뿐이다.** 격자든 난이도든 기준값이든 나머지는
// 들고만 있다가 그대로 돌려준다. 그래야 다음 게임이 어떤 모양의 판을 갖든 이것을 쓸 수 있다.
//
// 저장은 걸음 A가 세운 progress 칸 하나에 담긴다(shared/frame/save.js).
//   { active, modes: { <갈래>: { stages: { <판id>: {cleared,stars,best} }, current, extra } } }
//
// 넘기지 않은 게임에는 이 부품이 생기지 않는다(기획서 2.2 - 기본값은 항상 없음 쪽).

function asObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}

export function createProgress({
  save,
  modes = [],
  group = null,
  groups = null,
  stars = null,
  unlock = null,
  higherIsBetter = false,
} = {}) {
  if (!save) throw new Error('createProgress: save required');
  if (!modes.length) throw new Error('createProgress: modes required');

  const modeIds = modes.map((m) => m.id);
  const defaultMode = modeIds[0];

  // 저장을 매 호출마다 다시 읽지 않는다. 바꾼 것은 flush()가 한 번에 내려쓴다.
  let cache = null;

  function normalize(raw) {
    const p = asObject(raw) || {};
    const out = {
      active: modeIds.includes(p.active) ? p.active : defaultMode,
      modes: {},
    };
    const src = asObject(p.modes) || {};
    for (const id of modeIds) {
      const m = asObject(src[id]) || {};
      out.modes[id] = {
        stages: asObject(m.stages) || {},
        current: m.current === undefined ? null : m.current,
        extra: asObject(m.extra) || {},
      };
    }
    return out;
  }

  function data() {
    if (!cache) cache = normalize(save.readProgress());
    return cache;
  }
  function flush() { save.writeProgress(data()); }
  function modeData(modeId) { return data().modes[modeId || data().active] || data().modes[defaultMode]; }
  function modeDef(modeId) { return modes.find((m) => m.id === (modeId || data().active)) || modes[0]; }

  // --- 별 ---
  function computeStars(result) {
    if (!stars) return 0;
    const r = result || {};
    // 게임이 함수를 넘겼으면 판정은 통째로 게임 몫이다(깼는지도 게임이 본다).
    if (typeof stars === 'function') return Number(stars(r)) || 0;

    // 규격이 정한 두 갈래는 깬 판에만 별을 준다. 못 깬 판에 별이 박히면 모은 별 합계와
    // 별 모으기 잠금까지 함께 틀어진다.
    if (!r.cleared) return 0;

    if (stars.type === 'par') {
      // 기준값 이내면 셋, margin까지는 둘, 그 밖은 하나.
      // 기준값을 못 받았으면 매길 근거가 없다. 그래도 깬 판이므로 하나는 준다 -
      // 0을 주면 별에 걸린 보상까지 함께 0이 된다.
      if (typeof r.value !== 'number' || typeof r.par !== 'number') return 1;
      if (r.value <= r.par) return 3;
      if (r.value <= r.par + (stars.margin || 0)) return 2;
      return 1;
    }
    if (stars.type === 'mistakes') {
      // 틀린 적이 없으면 셋, two까지는 둘, 그 밖은 하나.
      const m = r.mistakes || 0;
      if (m <= 0) return 3;
      if (m <= (stars.two || 1)) return 2;
      return 1;
    }
    return 0;
  }

  // --- 묶음 ---
  // 게임이 group을 안 넘기면 묶음 없이 한 줄로 본다.
  function grouped(modeId) {
    const list = stagesOf(modeId);
    if (typeof group !== 'function') return [{ id: null, label: null, stages: list }];
    const bucket = new Map();
    for (const s of list) {
      const g = group(s);
      if (!bucket.has(g)) bucket.set(g, []);
      bucket.get(g).push(s);
    }
    const order = Array.isArray(groups) ? groups.map((g) => g.id) : [...bucket.keys()];
    const labels = new Map((Array.isArray(groups) ? groups : []).map((g) => [g.id, g.label]));
    return order
      .filter((id) => bucket.has(id))
      .map((id) => ({ id, label: labels.get(id) || String(id), stages: bucket.get(id) }));
  }

  function stagesOf(modeId) { return modeDef(modeId).stages || []; }

  // --- 잠금 ---
  function isUnlocked(id, modeId) {
    if (!unlock) return true;
    const list = stagesOf(modeId);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return true;
    if (typeof unlock === 'function') return !!unlock(list[idx], api, modeId);
    if (unlock === 'sequential') {
      if (idx === 0) return true;
      return !!of(list[idx - 1].id, modeId).cleared;
    }
    if (unlock && unlock.type === 'stars') {
      // 이 판이 속한 묶음보다 앞선 묶음에서 별을 per개씩 모아야 열린다.
      const gs = grouped(modeId);
      const gi = gs.findIndex((g) => g.stages.some((s) => s.id === id));
      if (gi <= 0) return true;
      let got = 0;
      for (let i = 0; i < gi; i++) for (const s of gs[i].stages) got += of(s.id, modeId).stars;
      return got >= (unlock.per || 0) * gi;
    }
    return true;
  }

  // --- 판 하나의 기록 ---
  function of(id, modeId) {
    const st = asObject(modeData(modeId).stages[String(id)]) || {};
    return {
      cleared: !!st.cleared,
      stars: st.stars || 0,
      best: st.best && st.best.value !== undefined ? st.best.value : null,
      bestAt: st.best && st.best.at !== undefined ? st.best.at : null,
    };
  }

  const api = {
    // --- 갈래 ---
    get mode() { return data().active; },
    get modes() { return modes; },
    modeDef,
    setMode(id) {
      if (!modeIds.includes(id) || data().active === id) return;
      data().active = id;
      flush();
    },

    // --- 판 ---
    stages: stagesOf,
    grouped,
    byId(id, modeId) { return stagesOf(modeId).find((s) => s.id === id) || null; },
    of,
    isUnlocked,

    next(id, modeId) {
      const list = stagesOf(modeId);
      const i = list.findIndex((s) => s.id === id);
      return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
    },
    prev(id, modeId) {
      const list = stagesOf(modeId);
      const i = list.findIndex((s) => s.id === id);
      return i > 0 ? list[i - 1] : null;
    },

    // --- 마지막 위치 ---
    current(modeId) { return modeData(modeId).current; },
    setCurrent(id, modeId) {
      const m = modeData(modeId);
      if (m.current === id) return;
      m.current = id;
      flush();
    },

    // --- 한 판이 끝났다 ---
    // 게임은 결과만 넘긴다. 저장·별·최고 기록은 여기서 한다.
    // 별은 더 많을 때만, 최고 기록은 더 좋을 때만 바뀐다 - 한 번 받은 별은 깎이지 않는다.
    // **별도 최고 기록도 깬 판에만 남긴다.** 못 깬 판의 성적은 기록이 아니고, 그것이 섞이면
    // 모은 별 합계와 별 모으기 잠금까지 함께 틀어진다.
    finish(id, result = {}) {
      const m = modeData();
      const key = String(id);
      const st = m.stages[key] || (m.stages[key] = {});

      const isFirstClear = !!result.cleared && !st.cleared;
      if (result.cleared) st.cleared = true;

      const s = computeStars(result);
      if (s > (st.stars || 0)) st.stars = s;

      const prevBest = st.best && st.best.value !== undefined ? st.best.value : null;
      let isNewBest = false;
      if (result.cleared && typeof result.value === 'number') {
        const better = prevBest === null
          || (higherIsBetter ? result.value > prevBest : result.value < prevBest);
        if (better) { st.best = { value: result.value, at: Date.now() }; isNewBest = true; }
      }

      flush();
      return { stars: st.stars || 0, isNewBest, isFirstClear, prevBest };
    },

    // --- 합계 ---
    totals(modeId) {
      const m = modeData(modeId);
      let cleared = 0;
      let starSum = 0;
      for (const st of Object.values(m.stages)) {
        if (!asObject(st)) continue;
        if (st.cleared) cleared += 1;
        starSum += st.stars || 0;
      }
      return { cleared, total: stagesOf(modeId).length, stars: starSum };
    },

    // --- 갈래별 게임 고유 값. 플랫폼은 안 본다 ---
    extra(modeId) { return { ...modeData(modeId).extra }; },
    setExtra(obj, modeId) {
      modeData(modeId).extra = asObject(obj) || {};
      flush();
    },

  };

  return api;
}
