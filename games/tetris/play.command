#!/bin/zsh
# Tetris 더블클릭 실행 스크립트.
# 8000 포트에 dev-server를 띄우고 기본 브라우저로 게임 페이지를 연다.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT=8000
URL="http://127.0.0.1:${PORT}/games/tetris/"

cd "${REPO_ROOT}" || exit 1

SERVER_PID=""
if lsof -ti tcp:${PORT} >/dev/null 2>&1; then
  echo "[info] 포트 ${PORT} 이미 사용 중. 기존 서버를 사용합니다."
else
  echo "[info] dev-server 시작 (포트 ${PORT})..."
  node scripts/dev-server.mjs ${PORT} &
  SERVER_PID=$!
  sleep 1
fi

echo "[info] 브라우저 오픈: ${URL}"
open "${URL}"

if [ -n "${SERVER_PID}" ]; then
  echo ""
  echo "서버 실행 중입니다. 종료하려면 이 창을 닫거나 Ctrl+C 누르세요."
  echo "----------------------------------------------------------"
  wait ${SERVER_PID}
else
  echo ""
  echo "기존 서버를 사용했습니다. 이 창은 닫아도 됩니다."
fi
