// 진입점. 컨셉 확정 전 최소 셋업 - 화면이 뜨는지만 확인한다.

const status = document.getElementById('boot-status');
if (status) status.textContent = '셋업 확인 완료 (게임 컨셉 확정 대기)';
