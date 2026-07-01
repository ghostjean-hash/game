// 블록 이미지 스타일 세트. 설정 화면에서 전환한다(docs/02_data.md §2.4).
// 블록 그리는 방식이 tiled로 나뉜다:
//   - tiled:false(통 블록) - 크기별 단일 이미지 `${id}_${방향}${길이}.png`를 블록에 꽉 채운다.
//   - tiled:true(1칸 조립) - 1칸 정사각 캐릭터를 블록 길이만큼 반복 배치한다.
// 주인공(target)은 방식과 무관하게 항상 통(target.png) - 유일한 개체라 반복하지 않는다.
//
// 조립 스타일(tiled:true)의 1칸 캐릭터는 표정 그리드 방식(faceSheet): _a 한 장에 표정들을
//   faceGrid×faceGrid로 담고(faceCount개), 셀마다 표정 하나를 골라 단일 이미지로 그린다(몸 정지).
//   각 칸 발밑·좌우 중심을 재서 공통 기준으로 정렬하고, 타이머가 무작위 셀에서 눈 깜빡(blinkFace
//   컷)과 표정 변화를 일으킨다(faceCycleMs 간격).
//   - 시트가 없으면(로드 실패) 통 블록 이미지 → A타입 순으로 폴백해 깨지지 않는다.

export const PONY_STYLES = [
  { id: 'a', name: '조랑말', emoji: '🦄', tiled: false },
  { id: 'b', name: '모찌', emoji: '🍡', tiled: false },
  { id: 'c', name: '말랑이', emoji: '🍥', tiled: true, faceSheet: 'c_cell_16', faceGrid: 4, faceCount: 16, blinkFace: 6, faceCycleMs: 700, footLiftPx: 3 },
];

export const DEFAULT_STYLE = 'a';
