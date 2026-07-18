# 실제 작업 흐름

## 0. 출제 요청 준비 (자비스)

자비스는 신규 출제를 요청하기 전에 공식 콘텐츠(`passages.json`)를 기준으로 최신 출제 패키지와 `CURRENT_CONTENT.json`을 갱신한다.

그 후 아래 현황을 출제 패키지 텍스트에 포함하여 ChatGPT에 전달한다.

- 공식 지문 수
- 공식 문장 수
- 마지막 공식 반영 지문
- 다음 출제 ID 또는 시작 위치
- 레벨별 분포
- topic별 분포
- 최근 사용 소재
- 최근 과다 사용 문법·표현
- 중복 주의 항목

이 전달을 마치기 전에는 ChatGPT에 신규 출제를 요청하지 않는다.

## 1. 출제

ChatGPT가 다음 파일을 기준으로 passage JSON을 생성한다.

- `PROJECT_INSTRUCTIONS.md`
- `AUTHORING_RULES.md`
- `PASSAGE_SCHEMA.json`
- `CURRENT_CONTENT.json`
- 최신 앱 출제 패키지

## 2. 코드 검증

자비스가 생성 JSON을 Node 검증기에 넣는다.

필수 검사:

- `validatePassage`
- `compareAgainstExisting`
- chunks 결합
- boundary
- words 원문 존재
- ID·제목·문장 중복

검증은 `passages.json`을 변경하지 않은 상태에서 먼저 수행한다.

## 3. 수정

검증 오류가 있으면 오류 결과를 ChatGPT에 전달한다.
ChatGPT는 오류와 직접 관련된 부분만 수정한다.

## 4. 승인

검증을 통과한 결과를 사용자에게 보여주고 승인을 받는다.

## 5. 반영

사용자 승인 후 자비스가 `passages.json`에 반영하고 다시 검증한다.

## 6. 완료

- 테스트 통과
- 공식 데이터 반영 확인
- 현재 전체 콘텐츠 파일 갱신
- 다음 출제를 위한 최신 앱 출제 패키지 재생성
