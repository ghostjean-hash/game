# AUTHORING BATCH 02 재감사 기록

감사일: 2026-07-29. 대상: 공식 순번 201~400(`daughter`~`kind`) 카드 전수.

공식 표제어, 대표 품사·뜻, 예문에서 실제 쓰인 뜻, 한국어 번역의 일치 여부를 카드 단위로 다시 확인했다.

| 순번 | 단어 | 결함 | 수정 |
|---|---|---|---|
| 311 | glass | 예문은 용기 `glass`인데 뜻이 재료 `유리` | `유리잔`으로 교정 |
| 349 | here | 예문은 방향을 뜻하는 `here`인데 뜻이 위치 `여기에` | `여기로`로 교정 |

`node tools/assemble-batch.mjs 02` 후 `node tools/validate-batch.mjs 02` 결과: error 0 / warning 0.

이 감사는 사전 대조 근거를 대체하지 않으며, 해당 근거는 `lexical-crosscheck-batch-02.md`에 유지한다.
