/* 좌측 목차 단일 출처. 문서 단위 단일 링크.
   두 갈래로 나눈다 - 모든 게임이 함께 쓰는 규격 문서와, 게임 하나를 다루는 기획서.
   게임별 기획서는 그 게임 폴더 안(games/<id>/docs/)에 두고 여기서 불러온다. */
window.GDD_NAV = [
  { group:true, vol:'A', label:'공용 규격', children:[
    { id:'sf',  vol:'Ⅰ', label:'게임 시작 흐름 공용 프레임', file:'doc/screen-frame.html' },
    { id:'sfd', vol:'Ⅱ', label:'시작 화면 규격 대안 네 안', file:'doc/screen-frame-drafts.html' },
  ]},
  { group:true, vol:'B', label:'게임별 기획서', children:[
    { id:'mines', vol:'MIN', label:'지뢰찾기', file:'../../../games/mines/docs/planning-mines.html' },
  ]},
];
