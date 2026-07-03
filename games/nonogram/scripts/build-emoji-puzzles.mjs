// 이모지 → 노노그램 퍼즐 변환 파이프라인 (빌드 타임 전용, 게임 런타임 아님).
//
// Twemoji(CC-BY 4.0, jdecked/twemoji) 72x72 PNG를 받아 N×N 격자로 다운샘플하고,
// 채운 칸의 색을 소수 팔레트로 양자화한 뒤 solver.verifyPuzzle을 통과한 것만 채택한다.
// 출력: 퍼즐 객체 배열(JSON). 사람이 확인 후 src/data/puzzles.js에 반영한다.
//
// 실행 (의존성 0 - node 내장 zlib로 PNG 직접 디코딩):
//   node F:/claude_code/game_ghost/games/nonogram/scripts/build-emoji-puzzles.mjs > out.json
//
// core 모듈은 스크립트 상대경로로 import한다. 외부 패키지 없음.

import zlib from 'node:zlib';
import { verifyPuzzle } from '../src/core/solver.js';

// ── PNG 디코더 (Twemoji: 8bit, colorType 2=RGB / 3=팔레트 / 6=RGBA, 비인터레이스) ──
// 반환: { width, height, data(RGBA 4byte/px) }. 그 외 포맷은 예외.
function decodePng(buf) {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) throw new Error('PNG 시그니처 아님');
  let pos = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  let plte = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4;
    const type = buf.toString('ascii', pos, pos + 4); pos += 4;
    const data = buf.subarray(pos, pos + len); pos += len; pos += 4; // +crc
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'PLTE') {
      plte = Buffer.from(data);
    } else if (type === 'tRNS') {
      trns = Buffer.from(data);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6 && colorType !== 3)) {
    throw new Error(`미지원 PNG (bitDepth=${bitDepth} colorType=${colorType})`);
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1; // 3=팔레트(인덱스 1byte)
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(w * h * 4);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);
  let rp = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const ft = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const cur = raw[rp++];
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let val;
      switch (ft) {
        case 0: val = cur; break;
        case 1: val = cur + a; break;
        case 2: val = cur + b; break;
        case 3: val = cur + ((a + b) >> 1); break;
        case 4: val = cur + paeth(a, b, c); break;
        default: throw new Error(`미지원 필터 ${ft}`);
      }
      line[x] = val & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * channels, d = (y * w + x) * 4;
      if (colorType === 3) {
        const idx = line[s];
        out[d] = plte[idx * 3]; out[d + 1] = plte[idx * 3 + 1]; out[d + 2] = plte[idx * 3 + 2];
        out[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else {
        out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2];
        out[d + 3] = channels === 4 ? line[s + 3] : 255;
      }
    }
    line.copy(prev);
  }
  return { width: w, height: h, data: out };
}

// ── 변환 파라미터 (매직 넘버 대신 여기 한 곳) ─────────────────────────────
const SRC = 72;              // Twemoji 원본 픽셀
const ALPHA_FILL = 128;      // 블록 평균 alpha가 이 이상이면 "채운 칸"
const MAX_COLORS = 6;        // 퍼즐당 최대 색 수(양자화 상한)
const MERGE_START = 40;      // 색 병합 시작 거리(RGB 유클리드)
const MERGE_STEP = 12;       // 색 수 초과 시 병합 거리 증가폭
const TWEMOJI_BASE =
  'https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72';

// ── 대상 이모지 목록 (codepoint 소문자, 한글 이름) ─────────────────────────
// 초등 여아 안전·귀여움 위주. 각 이모지를 10×10·15×15로 시도(5×5는 손그림 유지).
// 다운로드 실패(없는 codepoint)나 solver 불통과는 자동 거절되니 넉넉히 넣는다.
const NAMES = {
  // 동물 얼굴·전신
  '1f431': '고양이', '1f436': '강아지', '1f42d': '생쥐', '1f439': '햄스터',
  '1f430': '토끼', '1f98a': '여우', '1f43b': '곰', '1f43c': '판다',
  '1f428': '코알라', '1f42f': '호랑이', '1f981': '사자', '1f42e': '소',
  '1f437': '돼지', '1f438': '개구리', '1f435': '원숭이', '1f424': '병아리',
  '1f425': '아기새', '1f423': '부화', '1f427': '펭귄', '1f426': '새',
  '1f986': '오리', '1f989': '부엉이', '1f43a': '늑대', '1f434': '말',
  '1f984': '유니콘', '1f41d': '꿀벌', '1f41b': '애벌레', '1f98b': '나비',
  '1f40c': '달팽이', '1f41e': '무당벌레', '1f422': '거북이', '1f98e': '도마뱀',
  '1f419': '문어', '1f991': '오징어', '1f990': '새우', '1f980': '게',
  '1f41f': '물고기', '1f420': '열대어', '1f421': '복어', '1f42c': '돌고래',
  '1f988': '상어', '1f433': '고래', '1f40b': '큰고래', '1f418': '코끼리',
  '1f992': '기린', '1f993': '얼룩말', '1f42a': '낙타', '1f998': '캥거루',
  '1f43f': '다람쥐', '1f994': '고슴도치', '1f9a6': '수달', '1f9a5': '나무늘보',
  '1f9a9': '홍학', '1f99a': '공작', '1f99c': '앵무새', '1f9a2': '백조',
  '1f414': '닭', '1f983': '칠면조', '1f407': '산토끼', '1f429': '푸들',
  '1f98d': '고릴라', '1f406': '표범', '1f408': '노랑고양이', '1f411': '양',
  '1f410': '염소', '1f99b': '하마', '1f98f': '코뿔소', '1f412': '갈색원숭이',
  '1f43d': '돼지코', '1f417': '멧돼지', '1f416': '아기돼지', '1f42b': '쌍봉낙타',
  // 음식
  '1f34e': '사과', '1f34f': '풋사과', '1f350': '배', '1f34a': '귤',
  '1f34b': '레몬', '1f34c': '바나나', '1f349': '수박', '1f347': '포도',
  '1f353': '딸기', '1f352': '체리', '1f351': '복숭아', '1f34d': '파인애플',
  '1f95d': '키위', '1f96d': '망고', '1f345': '토마토', '1f346': '가지',
  '1f33d': '옥수수', '1f955': '당근', '1f954': '감자', '1f966': '브로콜리',
  '1f344': '버섯', '1f330': '밤', '1f370': '케이크', '1f382': '생일케이크',
  '1f9c1': '컵케이크', '1f369': '도넛', '1f36a': '쿠키', '1f36b': '초콜릿',
  '1f36c': '사탕', '1f36d': '막대사탕', '1f36e': '푸딩', '1f368': '아이스크림',
  '1f366': '소프트콘', '1f367': '빙수', '1f967': '파이', '1f95e': '팬케이크',
  '1f9c7': '와플', '1f36f': '꿀', '1f95b': '우유', '1f9cb': '버블티',
  '1f375': '차', '1f34c': '바나나',
  // 꽃·자연·하늘
  '1f337': '튤립', '1f338': '벚꽃', '1f339': '장미', '1f33a': '무궁화',
  '1f33b': '해바라기', '1f33c': '데이지', '1f490': '꽃다발', '1f331': '새싹',
  '1f340': '네잎클로버', '1f341': '단풍', '1f342': '낙엽', '1f335': '선인장',
  '1f334': '야자수', '1f333': '나무', '1f332': '전나무', '1f344': '버섯',
  '1f308': '무지개', '2b50': '별', '1f31f': '반짝별', '1f320': '별똥별',
  '2600': '태양', '1f31e': '해님', '1f319': '초승달', '1f315': '보름달',
  '2601': '구름', '2603': '눈사람', '2744': '눈송이', '1f4a7': '물방울',
  '1f525': '불꽃', '26a1': '번개',
  // 사물·기호·탈것
  '2764': '하트', '1f9e1': '주황하트', '1f49b': '노랑하트', '1f49a': '초록하트',
  '1f499': '파랑하트', '1f49c': '보라하트', '1f90d': '흰하트', '1f90e': '갈색하트',
  '1f49d': '하트리본', '1f496': '반짝하트', '1f495': '두하트', '1f493': '콩닥하트',
  '1f451': '왕관', '1f48d': '반지', '1f48e': '보석', '1f381': '선물',
  '1f388': '풍선', '1f386': '불꽃놀이', '1f380': '리본', '1f514': '종',
  '1f3c0': '농구공', '26bd': '축구공', '26be': '야구공', '1f3be': '테니스공',
  '1f9f8': '곰인형', '1f9e9': '퍼즐조각', '1f3b2': '주사위', '1fa81': '연',
  '1f697': '자동차', '1f68c': '버스', '1f686': '기차', '2708': '비행기',
  '1f680': '로켓', '1f681': '헬리콥터', '1f6b2': '자전거', '26f5': '요트',
};
const EMOJIS = Object.entries(NAMES).map(([cp, name]) => ({ cp, name, sizes: [10, 15] }));

async function fetchPng(cp) {
  const res = await fetch(`${TWEMOJI_BASE}/${cp}.png`);
  if (!res.ok) throw new Error(`fetch ${cp} ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodePng(buf); // { width, height, data(RGBA) }
}

// 72×72 RGBA → N×N 블록 평균 { fill(bool), rgb:[r,g,b] }.
function downsample(png, n) {
  const cell = SRC / n;
  const out = [];
  for (let ry = 0; ry < n; ry++) {
    const row = [];
    for (let rx = 0; rx < n; rx++) {
      let ar = 0, ag = 0, ab = 0, aa = 0, wsum = 0, cnt = 0;
      const x0 = Math.floor(rx * cell), x1 = Math.floor((rx + 1) * cell);
      const y0 = Math.floor(ry * cell), y1 = Math.floor((ry + 1) * cell);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * SRC + x) * 4;
          const a = png.data[i + 3];
          ar += png.data[i] * a; ag += png.data[i + 1] * a; ab += png.data[i + 2] * a;
          aa += a; wsum += a; cnt++;
        }
      }
      const alpha = cnt ? aa / cnt : 0;
      const rgb = wsum
        ? [Math.round(ar / wsum), Math.round(ag / wsum), Math.round(ab / wsum)]
        : [0, 0, 0];
      row.push({ fill: alpha >= ALPHA_FILL, rgb });
    }
    out.push(row);
  }
  return out;
}

const dist2 = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

// 채운 칸 색들을 <=MAX_COLORS개 대표색으로 병합(거리 임계를 늘려가며).
function quantize(cells) {
  const filled = [];
  for (const row of cells) for (const c of row) if (c.fill) filled.push(c.rgb);
  if (!filled.length) return null;

  let thresh = MERGE_START;
  let reps;
  for (;;) {
    reps = [];
    const t2 = thresh * thresh;
    for (const rgb of filled) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < reps.length; i++) {
        const d = dist2(rgb, reps[i].c);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0 && bestD <= t2) {
        const g = reps[best];
        g.sum[0] += rgb[0]; g.sum[1] += rgb[1]; g.sum[2] += rgb[2]; g.n++;
        g.c = [g.sum[0] / g.n, g.sum[1] / g.n, g.sum[2] / g.n];
      } else {
        reps.push({ c: rgb.slice(), sum: rgb.slice(), n: 1 });
      }
    }
    if (reps.length <= MAX_COLORS) break;
    thresh += MERGE_STEP;
    if (thresh > 255) break; // 안전 한도(사실상 1색으로 수렴)
  }
  return reps.map((r) => r.c.map(Math.round));
}

const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// 다운샘플 결과 → { grid, palette } (grid: 0=빈칸, 1~=색인덱스).
function toPuzzleGrid(cells) {
  const reps = quantize(cells);
  if (!reps) return null;
  const n = cells.length;
  const grid = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const cell = cells[r][c];
      if (!cell.fill) { row.push(0); continue; }
      let best = 0, bestD = Infinity;
      for (let i = 0; i < reps.length; i++) {
        const d = dist2(cell.rgb, reps[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      row.push(best + 1);
    }
    grid.push(row);
  }
  const palette = {};
  reps.forEach((c, i) => { palette[i + 1] = toHex(c); });
  return { grid, palette };
}

// 그리드가 비었거나 꽉 찬(전부 채움) 경우는 노노그램으로 부적합.
function shapeOk(grid) {
  const n = grid.length;
  let filled = 0;
  for (const row of grid) for (const v of row) if (v !== 0) filled++;
  const total = n * n;
  return filled >= Math.max(3, total * 0.12) && filled <= total * 0.9;
}

const DIFF = { 10: 'medium', 15: 'hard' };

async function main() {
  const results = [];
  const rejects = [];
  // 이모지 PNG를 배치 병렬 다운로드(이모지당 1회).
  const BATCH = 16;
  const pngs = new Map();
  for (let i = 0; i < EMOJIS.length; i += BATCH) {
    const batch = EMOJIS.slice(i, i + BATCH);
    const got = await Promise.all(batch.map(async (e) => {
      try { return [e.cp, await fetchPng(e.cp)]; }
      catch (err) { rejects.push({ ...e, reason: `download: ${err.message}` }); return null; }
    }));
    for (const g of got) if (g) pngs.set(g[0], g[1]);
  }

  for (const e of EMOJIS) {
    const png = pngs.get(e.cp);
    if (!png) continue; // 다운로드 실패(이미 reject 기록됨)
    for (const size of e.sizes) {
      const cells = downsample(png, size);
      const pg = toPuzzleGrid(cells);
      if (!pg) { rejects.push({ cp: e.cp, name: e.name, size, reason: 'empty' }); continue; }
      if (!shapeOk(pg.grid)) {
        rejects.push({ cp: e.cp, name: e.name, size, reason: 'shape(빈/꽉참)' }); continue;
      }
      const v = verifyPuzzle(pg.grid);
      if (!v.ok) {
        rejects.push({ cp: e.cp, name: e.name, size, reason: `solver(line=${v.lineSolvable})` });
        continue;
      }
      results.push({
        id: `em${e.cp}s${size}`,
        title: e.name,
        size,
        difficulty: DIFF[size],
        colors: Object.keys(pg.palette).length,
        rounds: v.rounds,
        palette: pg.palette,
        grid: pg.grid,
      });
    }
  }
  process.stdout.write(JSON.stringify({ ok: results, rejects }, null, 2));
  process.stderr.write(
    `\n채택 ${results.length} / 거절 ${rejects.length}\n` +
    rejects.map((r) => `  ✗ ${r.name} ${r.size || ''} - ${r.reason}`).join('\n') + '\n',
  );
}

main();
