// 도시별 디오라마가 없는 나라·여행지용 공용 배경 테마(docs/15).
// DIORAMA_READY 도시가 우선이며, 이 표는 그 외 목적지에서만 사용한다.
export const FALLBACK_SCENE_SRC = {
  ocean: 'assets/backgrounds/fallback-ocean.png',
  desert: 'assets/backgrounds/fallback-desert.png',
  fields: 'assets/backgrounds/fallback-fields.png',
  mountain: 'assets/backgrounds/fallback-mountain.png',
  winter: 'assets/backgrounds/fallback-winter.png',
};

export const FALLBACK_SCENE_BY_COUNTRY = {
  '필리핀': 'ocean', '태국': 'ocean', '말레이시아': 'ocean', '싱가포르': 'ocean', '인도네시아': 'ocean',
  '파나마': 'ocean', '파푸아뉴기니': 'ocean', '제주도': 'ocean', '독도': 'ocean',

  '우즈베키스탄': 'desert', '이란': 'desert', '이라크': 'desert', '이스라엘': 'desert', '아랍에미리트': 'desert',
  '사우디아라비아': 'desert', '모로코': 'desert', '멕시코': 'desert',

  '방글라데시': 'fields', '케냐': 'fields', '탄자니아': 'fields', '남아프리카공화국': 'fields', '나이지리아': 'fields',
  '콩고민주공화국': 'fields', '이탈리아': 'fields', '독일': 'fields', '스페인': 'fields', '네덜란드': 'fields',
  '벨기에': 'fields', '미국': 'fields', '아르헨티나': 'fields',

  '인도': 'mountain', '파키스탄': 'mountain', '에티오피아': 'mountain', '카자흐스탄': 'mountain', '튀르키예': 'mountain',
  '그리스': 'mountain', '칠레': 'mountain', '페루': 'mountain', '콜롬비아': 'mountain',

  '노르웨이': 'winter', '핀란드': 'winter', '캐나다': 'winter',
};
