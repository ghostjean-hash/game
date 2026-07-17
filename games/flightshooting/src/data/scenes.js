// 세계 여행 구역 배경 테마(docs/11 기반). 현재 여행 중인 나라(game.tourIdx의 ko)로 조회한다.
// 테마가 있는 나라는 view.drawBackground/drawScenery가 나라 배경(하늘 그라데이션 + 지평선 실루엣)을 그리고,
// 없는 나라는 기존 우주 성운 배경을 유지한다(나라별 배경은 점진 확장).
//   sky        = 하늘 세로 그라데이션 색(위=우주 어두움 → 아래=지평선 나라색). docs/11 하늘 팔레트.
//   horizon    = 지평선 글로우 색(하단 은은한 발광).
//   accent     = 실루엣 위쪽 모서리 림라이트 색(나라 상징색). 밤하늘 위 가독성 위해 점·선으로만.
//   silhouette = view.drawScenery의 나라별 실루엣 분기 키(없으면 실루엣 없음).
export const SCENES = {
  // 1구역 한국(서울): 남색 밤하늘 아래 기와지붕 능선 + 남산타워 실루엣, 한강 반짝임(docs/11 §1).
  '한국': { sky: ['#0d1b3a', '#20315e', '#3f5a8a'], horizon: '#3f5a8a', accent: '#e84c5a', silhouette: 'seoul' },
};
