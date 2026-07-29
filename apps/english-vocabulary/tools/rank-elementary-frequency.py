r"""교육부 초등 800 대표형에 wordfreq 영어 빈도 근거를 붙인다.

사용: PYTHONPATH=C:\tmp\english-vocabulary-wordfreq python tools/rank-elementary-frequency.py
출력은 학습 세트 설계용 메타데이터이며 카드 원본을 바꾸지 않는다.
"""
import json
from datetime import date
from pathlib import Path

from wordfreq import zipf_frequency

APP = Path(__file__).resolve().parent.parent
SOURCE = APP / "docs" / "sources" / "moe-2022-english" / "elementary-800-cards.json"
OUTPUT = APP / "docs" / "sources" / "moe-2022-english" / "elementary-frequency-wordfreq-v3.1.1.json"

cards = json.loads(SOURCE.read_text(encoding="utf-8"))
rows = [
    {"id": f"ev-moe2022-e-{index:04d}", "sourceOrder": index, "word": card["word"],
     "zipfFrequency": zipf_frequency(card["word"], "en")}
    for index, card in enumerate(cards, start=1)
]
for rank, row in enumerate(sorted(rows, key=lambda row: (-row["zipfFrequency"], row["word"])), start=1):
    row["frequencyRank"] = rank
rows.sort(key=lambda row: row["sourceOrder"])

payload = {
    "source": {
        "name": "wordfreq",
        "version": "3.1.1",
        "language": "en",
        "measure": "zipf_frequency",
        "rankRule": "descending zipfFrequency; alphabetic word tiebreak",
        "license": "Apache-2.0 package; included data CC BY-SA 4.0",
        "retrievedOn": str(date.today()),
        "url": "https://github.com/rspeer/wordfreq",
    },
    "input": "elementary-800-cards.json (official source order 1~800)",
    "rows": rows,
}
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {len(rows)} rows: {OUTPUT}")
