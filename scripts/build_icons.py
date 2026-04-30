"""
PWA 아이콘 PNG 생성기.
디자인 토큰(tokens.css)과 시각적으로 일치하는 단순한 6-블록 모티프.

사용법: python scripts/build_icons.py
출력:
  icons/icon-180.png       (iOS apple-touch-icon)
  icons/icon-192.png       (Android manifest)
  icons/icon-512.png       (Android manifest)
  icons/icon-maskable.png  (Android maskable, safe area 고려)
"""
from PIL import Image, ImageDraw
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"
OUT.mkdir(exist_ok=True)

BG = (14, 15, 19)        # --bg
ACCENT = (124, 243, 196) # --accent

def hex_lerp(c, a):
    """alpha-blend over BG to simulate opacity in flat PNG."""
    return tuple(int(BG[i] + (c[i] - BG[i]) * a) for i in range(3))

def draw_blocks(img, size, padding, block_gap, maskable=False):
    """
    6-블록 구성 (2x2 메인 + 우측1 + 하단1).
    maskable=True면 safe area(중앙 80%)에만 그린다.
    """
    draw = ImageDraw.Draw(img)
    if maskable:
        # safe area: 중앙 80%
        inner = int(size * 0.10)
        area = size - inner * 2
        ox = oy = inner
    else:
        ox = oy = padding
        area = size - padding * 2

    # 4x3 격자 중 6칸 사용
    cell = (area - block_gap * 3) / 4
    # 위치: (col, row, alpha)
    spec = [
        (0, 0, 1.0),   (1, 0, 0.55),
        (0, 1, 0.55),  (1, 1, 1.0),
        (2, 1, 0.35),
        (1, 2, 0.35),
    ]
    radius = max(2, int(cell * 0.16))
    for col, row, a in spec:
        x0 = ox + int(col * (cell + block_gap))
        y0 = oy + int(row * (cell + block_gap))
        x1 = int(x0 + cell)
        y1 = int(y0 + cell)
        draw.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=hex_lerp(ACCENT, a))

def make_icon(size, *, maskable=False, rounded=True):
    img = Image.new("RGB", (size, size), BG)
    if not maskable and rounded:
        # iOS는 자체적으로 마스킹하지만 일관성 위해 약간 안쪽으로
        padding = int(size * 0.18)
    else:
        padding = int(size * 0.12)
    block_gap = max(2, int(size * 0.018))
    draw_blocks(img, size, padding, block_gap, maskable=maskable)
    return img

def save(img, name):
    p = OUT / name
    img.save(p, "PNG", optimize=True)
    print(f"wrote {p.name} ({img.size[0]}x{img.size[1]})")

def main():
    save(make_icon(180), "icon-180.png")
    save(make_icon(192), "icon-192.png")
    save(make_icon(512), "icon-512.png")
    save(make_icon(512, maskable=True), "icon-maskable.png")

if __name__ == "__main__":
    main()
