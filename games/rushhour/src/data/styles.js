// 블록 이미지 스타일 세트. 설정 화면에서 전환한다(docs/02_data.md §2.3).
// 블록 그리는 방식이 tiled로 나뉜다:
//   - tiled:false(통 블록) - 크기별 단일 이미지 `${id}_${방향}${길이}.png`를 블록에 꽉 채운다.
//   - tiled:true(1칸 조립) - 1칸 정사각 캐릭터를 블록 길이만큼 반복 배치한다.
// 주인공(target)은 방식과 무관하게 항상 통(target.png) - 유일한 개체라 반복하지 않는다.
//
// 조립 스타일(tiled:true)의 1칸 캐릭터는 표정 그리드 방식(faceSheet): _a 한 장에 표정들을
//   faceGrid×faceGrid로 담고(faceCount개), 셀마다 표정 하나를 골라 단일 이미지로 그린다(몸 정지).
//   footLift는 발을 바닥에서 띄우는 양이고 **한 칸 대비 비율**이다(2026-09-06에 고정 px에서
//   바꿨다 - px이면 화면이 커질수록 띄움이 상대적으로 줄어 캐릭터가 바닥에 붙는다).
//   각 칸 발밑·좌우 중심을 재서 공통 기준으로 정렬하고, 타이머가 무작위 셀에서 눈 깜빡(blinkFace
//   컷)과 표정 변화를 일으킨다(faceCycleMs 간격).
//   - 시트가 없으면(로드 실패) 통 블록 이미지 → A타입 순으로 폴백해 깨지지 않는다.

export const PONY_STYLES = [
  { id: 'a', name: '포니', emoji: '🦄', tiled: false },
  // calmFaces: 평상시 배정 풀. 시트 16컷 전부에서 고르면 화난 컷·우는 컷이 아무 때나 나와
  //   "친구들이 그냥 서 있다"는 이야기와 반대로 읽힌다(01_spec 0.5). 화남(4·9·11)·울음
  //   (10·14)·슬픔(12)·시무룩(5)·어지러움(15)은 sadFaces 쪽에만 남기고 여기서 뺀다.
  //   눈감은 컷(blinkFace 6)도 평상 시작 컷으로 쓰지 않는다.
  // happyFaces/sadFaces: 클리어(신남)·시간 위기(울상)에 블록 전체가 지을 표정 컷 인덱스 묶음(시트 4x4).
  { id: 'c', name: '밥풀이', emoji: '🍥', tiled: true, faceSheet: 'c_cell_16', faceGrid: 4, faceCount: 16, blinkFace: 6, faceCycleMs: 700, footLift: 0.055, calmFaces: [0, 1, 2, 3, 7, 8, 13], happyFaces: [0, 7, 1, 8, 2], sadFaces: [14, 10, 5, 4, 12, 9] },
];

export const DEFAULT_STYLE = 'c'; // 기본 = 밥풀이(사용자 결정 2026-07-02). 저장된 선택은 유지.
