// 영어 독해 사다리를 단일 HTML 한 장으로 합친다 (더블클릭 실행용, 오프라인 동작).
// 손 사본 없이 항상 원본(style·core·main·passages.json)에서 재조립 - 소스가 단일 진실.
// 사용: node apps/english-reading/tools/build-standalone.mjs  → standalone.html 생성
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");
const hub = join(app, "..", "..");
const read = (p) => readFileSync(p, "utf8");

// 변환 대상 패턴이 원본에서 사라지면(리팩토링 등) 조용히 깨진 파일을 내지 말고 즉시 실패한다.
function mustReplace(src, pattern, replacement, label) {
  if (!src.includes(pattern)) throw new Error(`build-standalone: 원본에서 패턴 미발견 - ${label}`);
  return src.replace(pattern, replacement);
}

const stripExports = (s) => s.replace(/^export /gm, "");
const stripImports = (s) => s.split("\n").filter((l) => !l.startsWith("import ")).join("\n");

// 1. CSS: 허브 공용 토큰/베이스 + 앱 스타일 (외부 url() 참조 없음 확인됨)
const css = [
  read(join(hub, "shared", "tokens.css")),
  read(join(hub, "shared", "base.css")),
  read(join(app, "style.css")),
].join("\n");

// 2. 데이터: passages.json을 스크립트에 내장 (fetch 제거용)
const dataRaw = read(join(app, "src", "data", "passages.json"));
JSON.parse(dataRaw); // 유효성 검사
const dataSafe = dataRaw.replace(/<\//g, "<\\/"); // </script> 조기 종료 방지

// 3. JS: 모듈들을 한 스크립트로 (import/export 제거 + 단일 파일에 안 맞는 부분 치환)
const storage = stripExports(read(join(hub, "shared", "storage.js")));
const tokenize = stripExports(read(join(app, "src", "core", "tokenize.js")));
const lesson = stripExports(read(join(app, "src", "core", "lesson.js")));
let main = stripImports(read(join(app, "src", "main.js")));

main = mustReplace(main, 'registerServiceWorker("/service-worker.js");', "", "SW 등록 제거");
main = mustReplace(
  main,
  `fetch("./src/data/passages.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    passages = data.passages;
    renderPicker();
  })
  .catch(() => {
    el.title.textContent = "오류";
    el.stage.textContent = "지문을 불러오지 못했습니다.";
  });`,
  "passages = EMBEDDED_PASSAGES.passages;\nrenderPicker();",
  "데이터 인라인"
);
main = mustReplace(
  main,
  `  const homeBtn = document.createElement("a");
  homeBtn.className = "btn btn-primary";
  homeBtn.href = "../../";
  homeBtn.textContent = "홈으로";
  el.controls.append(againBtn, homeBtn);`,
  `  againBtn.classList.add("btn-primary");
  el.controls.append(againBtn);`,
  "홈 버튼 제거(단일 파일엔 허브 홈 없음)"
);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
<meta name="theme-color" content="#f6f8fc" />
<title>영어 독해 사다리</title>
<style>
${css}
</style>
</head>
<body>
<div class="page lesson-page">
  <header class="topbar">
    <div class="lesson-info">
      <div class="lesson-title" id="lesson-title">불러오는 중…</div>
      <div class="lesson-progress" id="lesson-progress"></div>
    </div>
  </header>

  <div class="bar" aria-hidden="true"><div class="bar-fill" id="bar-fill"></div></div>

  <main class="stage" id="stage" aria-live="polite"></main>

  <footer class="controls" id="controls"></footer>
</div>
<script>
const EMBEDDED_PASSAGES = ${dataSafe};
${storage}
${tokenize}
${lesson}
${main}
</script>
</body>
</html>
`;

const out = join(app, "standalone.html");
writeFileSync(out, html, "utf8");
console.log(`standalone.html 생성 완료 (${Math.round(html.length / 1024)}KB)`);
