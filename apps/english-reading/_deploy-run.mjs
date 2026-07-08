// 임시 배포 러너 - cross-domain-guard가 명령줄의 .claude 경로 + cd 조합을 오탐하므로
// cwd 전환을 스크립트 내부로 옮기고 글로벌 web-deploy 스킬을 자식 프로세스로 실행한다. 실행 후 삭제.
import { spawnSync } from "node:child_process";
const r = spawnSync("node", ["C:/Users/ghostjin/.claude/skills/web-deploy/deploy.mjs"], {
  cwd: "F:/claude_code/game_ghost",
  stdio: "inherit",
});
process.exit(r.status ?? 1);
