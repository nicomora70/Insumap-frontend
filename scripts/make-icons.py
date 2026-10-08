"""Generate Insumap PWA icons: iOS-blue squircle + white suggestion star."""
import math
from PIL import Image, ImageDraw

BLUE = (10, 132, 255, 255)
WHITE = (255, 255, 255, 255)


def star_points(cx, cy, outer, inner, rotation=-90.0):
    pts = []
    for i in range(10):
        r = outer if i % 2 == 0 else inner
        a = math.radians(rotation + i * 36)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(size * 0.225)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BLUE)
    cx = cy = size / 2
    outer = size * 0.30
    d.polygon(star_points(cx, cy - size * 0.02, outer, outer * 0.42), fill=WHITE)
    return img


for name, size in [("pwa-192x192.png", 192), ("pwa-512x512.png", 512), ("apple-touch-icon.png", 180)]:
    make_icon(size).save(f"public/{name}")
    print("wrote", name)
