#!/usr/bin/env python3
"""
Draws the home-screen widget's background scenes.

Run with `python3 scripts/generate-widget-art.py`. Output goes to
`assets/widget/`, one scene per file at 1x, 2x and 3x so Metro packs a
density-matched bitmap for each device instead of upscaling a small one.

Everything is drawn from primitives — gradients, discs, blurred glows and a
few silhouettes — so the set can be regenerated or extended without a design
tool, and so no third-party artwork with an unclear licence ends up in the
app. The scenes are deliberately quiet: the widget lays text over them, and a
busy picture would fight the words.

Pillow is the only dependency.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE_W, BASE_H = 400, 200
SCALES = (1, 2, 3)
OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "widget"

Color = tuple[int, int, int]


def lerp(a: Color, b: Color, t: float) -> Color:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def vertical_gradient(size: tuple[int, int], stops: list[tuple[float, Color]]) -> Image.Image:
    """A top-to-bottom gradient through the given (position, colour) stops."""
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if p0 <= t <= p1:
                local = 0 if p1 == p0 else (t - p0) / (p1 - p0)
                colour = lerp(c0, c1, local)
                break
        else:
            colour = stops[-1][1]
        for x in range(w):
            px[x, y] = colour
    return img


def glow(img: Image.Image, centre: tuple[float, float], radius: float, colour: Color, strength: float) -> None:
    """Soft radial light, composited additively-ish through a blurred disc."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = centre
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=colour + (int(255 * strength),))
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.6))
    img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"))


def disc(img: Image.Image, centre: tuple[float, float], radius: float, colour: Color) -> None:
    draw = ImageDraw.Draw(img)
    cx, cy = centre
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=colour)


def hills(img: Image.Image, s: float, colour: Color, baseline: float, amplitude: float, seed: int) -> None:
    """A rolling silhouette along the bottom edge."""
    w, h = img.size
    rnd = random.Random(seed)
    phase = rnd.random() * math.pi * 2
    points = [(0, h)]
    for x in range(0, w + 1, max(1, int(2 * s))):
        y = baseline * s + math.sin(x / (70 * s) + phase) * amplitude * s + math.sin(x / (23 * s)) * amplitude * 0.3 * s
        points.append((x, y))
    points.append((w, h))
    ImageDraw.Draw(img).polygon(points, fill=colour)


def stars(img: Image.Image, s: float, count: int, seed: int, max_y: float = 0.7) -> None:
    rnd = random.Random(seed)
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for _ in range(count):
        x = rnd.random() * w
        y = rnd.random() * h * max_y
        r = rnd.choice((0.6, 0.9, 1.3)) * s
        a = rnd.randint(150, 255)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 240, a))


def cloud(img: Image.Image, s: float, x: float, y: float, size: float, colour: Color) -> None:
    draw = ImageDraw.Draw(img)
    for dx, dy, r in ((0, 0, 1.0), (0.9, 0.1, 0.8), (-0.9, 0.15, 0.7), (0.35, -0.45, 0.75), (-0.35, -0.35, 0.65)):
        cx, cy, rr = (x + dx * size) * s, (y + dy * size) * s, r * size * s
        draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=colour)
    draw.rectangle(((x - 1.3 * size) * s, y * s, (x + 1.3 * size) * s, (y + 0.5 * size) * s), fill=colour)


def mosque(img: Image.Image, s: float, colour: Color) -> None:
    """Dome, two minarets and a low wall, as a silhouette on the horizon."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    base = h - 22 * s
    cx = w * 0.62
    # Wall
    draw.rectangle((cx - 92 * s, base - 34 * s, cx + 92 * s, h), fill=colour)
    # Dome and its drum
    draw.rectangle((cx - 40 * s, base - 50 * s, cx + 40 * s, base), fill=colour)
    draw.ellipse((cx - 44 * s, base - 96 * s, cx + 44 * s, base - 8 * s), fill=colour)
    # Finial
    draw.line((cx, base - 96 * s, cx, base - 112 * s), fill=colour, width=max(1, int(2 * s)))
    draw.ellipse((cx - 3 * s, base - 116 * s, cx + 3 * s, base - 110 * s), fill=colour)
    # Minarets
    for mx in (cx - 120 * s, cx + 120 * s):
        draw.rectangle((mx - 6 * s, base - 120 * s, mx + 6 * s, h), fill=colour)
        draw.polygon(((mx - 9 * s, base - 120 * s), (mx + 9 * s, base - 120 * s), (mx, base - 140 * s)), fill=colour)
        draw.rectangle((mx - 9 * s, base - 78 * s, mx + 9 * s, base - 74 * s), fill=colour)


def crescent(img: Image.Image, s: float, centre: tuple[float, float], radius: float, sky: Color) -> None:
    cx, cy = centre
    glow(img, (cx * s, cy * s), radius * 2.4 * s, (255, 244, 200), 0.35)
    disc(img, (cx * s, cy * s), radius * s, (255, 246, 214))
    # Cut the inner disc back to the sky colour, offset to leave a crescent.
    disc(img, ((cx + radius * 0.45) * s, (cy - radius * 0.18) * s), radius * 0.86 * s, sky)


def rain_streaks(img: Image.Image, s: float, seed: int) -> None:
    rnd = random.Random(seed)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    w, h = img.size
    for _ in range(140):
        x = rnd.random() * w
        y = rnd.random() * h
        length = rnd.uniform(10, 22) * s
        draw.line((x, y, x - length * 0.25, y + length), fill=(220, 232, 245, rnd.randint(70, 150)), width=max(1, int(1.2 * s)))
    img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"))


def snow(img: Image.Image, s: float, seed: int) -> None:
    rnd = random.Random(seed)
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for _ in range(90):
        x, y = rnd.random() * w, rnd.random() * h
        r = rnd.uniform(1.0, 2.6) * s
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(250, 252, 255))


# --- Scenes ------------------------------------------------------------------

def scene_dawn(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (28, 34, 82)), (0.45, (128, 92, 140)), (0.75, (243, 165, 110)), (1, (252, 214, 140))])
    glow(img, (size[0] * 0.5, size[1] * 0.86), 70 * s, (255, 220, 150), 0.7)
    disc(img, (size[0] * 0.5, size[1] * 0.9), 22 * s, (255, 240, 200))
    hills(img, s, (52, 40, 78), 165, 10, seed=3)
    hills(img, s, (34, 26, 56), 178, 7, seed=8)
    return img


def scene_day(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (58, 132, 214)), (0.6, (128, 186, 236)), (1, (196, 226, 244))])
    glow(img, (size[0] * 0.8, size[1] * 0.25), 60 * s, (255, 250, 200), 0.75)
    disc(img, (size[0] * 0.8, size[1] * 0.25), 18 * s, (255, 252, 225))
    cloud(img, s, 95, 70, 22, (246, 250, 255))
    cloud(img, s, 250, 120, 16, (240, 246, 252))
    hills(img, s, (90, 160, 120), 170, 9, seed=5)
    hills(img, s, (60, 128, 96), 182, 6, seed=11)
    return img


def scene_sunset(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (50, 30, 90)), (0.45, (170, 70, 110)), (0.72, (240, 120, 70)), (1, (250, 190, 90))])
    glow(img, (size[0] * 0.3, size[1] * 0.84), 80 * s, (255, 200, 120), 0.75)
    disc(img, (size[0] * 0.3, size[1] * 0.86), 26 * s, (255, 226, 170))
    cloud(img, s, 300, 60, 14, (200, 100, 130))
    hills(img, s, (70, 30, 70), 168, 9, seed=21)
    hills(img, s, (40, 18, 46), 180, 6, seed=22)
    return img


def scene_night(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (8, 12, 40)), (0.6, (18, 30, 72)), (1, (30, 52, 96))])
    stars(img, s, 70, seed=7)
    cloud(img, s, 320, 130, 15, (34, 52, 98))
    hills(img, s, (12, 20, 46), 172, 8, seed=31)
    hills(img, s, (6, 12, 30), 184, 5, seed=32)
    return img


def scene_moon(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    sky_top, sky_mid = (10, 14, 44), (24, 36, 84)
    img = vertical_gradient(size, [(0, sky_top), (0.65, sky_mid), (1, (44, 66, 112))])
    stars(img, s, 55, seed=9)
    # Sky colour at the moon's height, so the cut-out reads as sky, not a hole.
    sky_at_moon = lerp(sky_top, sky_mid, (52 / BASE_H) / 0.65)
    crescent(img, s, (300, 52), 26, sky_at_moon)
    hills(img, s, (16, 24, 56), 174, 7, seed=41)
    hills(img, s, (8, 14, 36), 186, 5, seed=42)
    return img


def scene_rain(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (58, 70, 96)), (0.55, (92, 108, 134)), (1, (128, 146, 168))])
    cloud(img, s, 110, 52, 26, (150, 164, 184))
    cloud(img, s, 290, 70, 22, (132, 146, 168))
    cloud(img, s, 200, 40, 18, (166, 178, 196))
    rain_streaks(img, s, seed=13)
    hills(img, s, (60, 76, 96), 172, 7, seed=51)
    hills(img, s, (44, 56, 74), 184, 5, seed=52)
    return img


def scene_cold(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (120, 150, 190)), (0.6, (176, 200, 226)), (1, (222, 234, 244))])
    cloud(img, s, 120, 60, 20, (232, 240, 248))
    cloud(img, s, 300, 50, 16, (226, 236, 246))
    snow(img, s, seed=17)
    hills(img, s, (206, 222, 238), 170, 8, seed=61)
    hills(img, s, (236, 244, 250), 182, 5, seed=62)
    return img


def scene_mosque(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (12, 40, 60)), (0.5, (16, 96, 92)), (0.85, (60, 150, 120)), (1, (120, 190, 150))])
    stars(img, s, 35, seed=19, max_y=0.45)
    glow(img, (size[0] * 0.62, size[1] * 0.62), 90 * s, (200, 240, 210), 0.35)
    mosque(img, s, (8, 30, 40))
    return img


def scene_sunrise(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (70, 90, 160)), (0.5, (230, 150, 110)), (0.8, (252, 205, 120)), (1, (255, 236, 170))])
    glow(img, (size[0] * 0.5, size[1] * 0.8), 90 * s, (255, 230, 160), 0.8)
    disc(img, (size[0] * 0.5, size[1] * 0.82), 30 * s, (255, 248, 220))
    hills(img, s, (110, 80, 90), 168, 8, seed=71)
    hills(img, s, (70, 50, 66), 180, 6, seed=72)
    return img


def scene_noon(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (40, 120, 220)), (0.6, (110, 178, 238)), (1, (190, 224, 246))])
    glow(img, (size[0] * 0.5, size[1] * 0.12), 90 * s, (255, 255, 220), 0.9)
    disc(img, (size[0] * 0.5, size[1] * 0.12), 22 * s, (255, 255, 240))
    hills(img, s, (96, 170, 128), 172, 8, seed=81)
    hills(img, s, (64, 136, 100), 184, 5, seed=82)
    return img


def scene_afternoon(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (86, 140, 210)), (0.55, (196, 196, 200)), (1, (240, 214, 170))])
    glow(img, (size[0] * 0.2, size[1] * 0.45), 80 * s, (255, 240, 190), 0.7)
    disc(img, (size[0] * 0.2, size[1] * 0.45), 20 * s, (255, 250, 220))
    cloud(img, s, 280, 60, 18, (250, 246, 240))
    hills(img, s, (120, 140, 96), 170, 9, seed=91)
    hills(img, s, (84, 104, 70), 182, 6, seed=92)
    return img


def scene_midnight(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (2, 4, 20)), (0.7, (8, 14, 44)), (1, (16, 26, 64))])
    stars(img, s, 110, seed=27, max_y=0.8)
    glow(img, (size[0] * 0.78, size[1] * 0.3), 40 * s, (220, 228, 255), 0.35)
    disc(img, (size[0] * 0.78, size[1] * 0.3), 14 * s, (236, 240, 255))
    hills(img, s, (4, 8, 28), 176, 7, seed=101)
    return img


def scene_tahajjud(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (6, 8, 36)), (0.55, (26, 22, 76)), (0.85, (70, 44, 96)), (1, (110, 70, 100))])
    stars(img, s, 90, seed=33, max_y=0.75)
    glow(img, (size[0] * 0.5, size[1] * 0.95), 110 * s, (150, 100, 140), 0.45)
    hills(img, s, (20, 14, 44), 172, 8, seed=111)
    hills(img, s, (10, 8, 30), 184, 5, seed=112)
    return img


def scene_heat(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (250, 160, 70)), (0.5, (252, 200, 110)), (1, (255, 232, 170))])
    glow(img, (size[0] * 0.5, size[1] * 0.2), 120 * s, (255, 255, 200), 1.0)
    disc(img, (size[0] * 0.5, size[1] * 0.2), 30 * s, (255, 255, 235))
    hills(img, s, (214, 150, 80), 172, 6, seed=121)
    hills(img, s, (180, 120, 60), 184, 4, seed=122)
    return img


def scene_storm(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (24, 28, 44)), (0.6, (56, 62, 84)), (1, (90, 98, 118))])
    cloud(img, s, 120, 48, 30, (70, 76, 96))
    cloud(img, s, 300, 62, 24, (60, 66, 86))
    # A bolt: a jagged bright line from the cloud to the hills.
    draw = ImageDraw.Draw(img)
    pts = [(210 * s, 70 * s), (196 * s, 105 * s), (214 * s, 108 * s), (190 * s, 160 * s)]
    draw.line(pts, fill=(255, 250, 200), width=max(1, int(3 * s)))
    glow(img, (200 * s, 110 * s), 40 * s, (255, 250, 200), 0.5)
    rain_streaks(img, s, seed=131)
    hills(img, s, (30, 34, 50), 172, 7, seed=132)
    return img


def scene_wind(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (120, 150, 190)), (0.6, (170, 190, 210)), (1, (214, 220, 224))])
    draw = ImageDraw.Draw(img)
    for i, y in enumerate((50, 78, 104, 130)):
        x0 = (30 + i * 40) * s
        draw.arc((x0, y * s - 10 * s, x0 + 160 * s, y * s + 16 * s), start=190, end=350, fill=(240, 246, 250), width=max(1, int(2 * s)))
        draw.arc((x0 + 120 * s, y * s - 4 * s, x0 + 180 * s, y * s + 20 * s), start=180, end=300, fill=(240, 246, 250), width=max(1, int(2 * s)))
    hills(img, s, (96, 128, 110), 170, 12, seed=141)
    hills(img, s, (66, 96, 80), 182, 8, seed=142)
    return img


def scene_prayer(s: float) -> Image.Image:
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (18, 40, 70)), (0.55, (36, 96, 110)), (1, (96, 160, 140))])
    stars(img, s, 24, seed=151, max_y=0.4)
    glow(img, (size[0] * 0.62, size[1] * 0.6), 100 * s, (220, 240, 220), 0.4)
    mosque(img, s, (10, 26, 44))
    return img


def scene_quran(s: float) -> Image.Image:
    """An open book on a warm, quiet ground: the reading nudge."""
    size = (int(BASE_W * s), int(BASE_H * s))
    img = vertical_gradient(size, [(0, (14, 60, 56)), (0.6, (16, 96, 84)), (1, (40, 130, 108))])
    glow(img, (size[0] * 0.8, size[1] * 0.6), 80 * s, (200, 240, 220), 0.3)
    draw = ImageDraw.Draw(img)
    # Small and to the right, in muted tones, so the words on the left sit on
    # plain ground rather than on top of the book.
    cx, cy = size[0] * 0.8, size[1] * 0.64
    w, h = 62 * s, 38 * s
    page = (196, 216, 204)
    # Two pages, meeting at the spine, slightly angled.
    draw.polygon([(cx - w, cy - h * 0.35), (cx - 4 * s, cy - h * 0.55), (cx - 4 * s, cy + h * 0.55), (cx - w, cy + h * 0.35)], fill=page)
    draw.polygon([(cx + w, cy - h * 0.35), (cx + 4 * s, cy - h * 0.55), (cx + 4 * s, cy + h * 0.55), (cx + w, cy + h * 0.35)], fill=page)
    # Faint lines of text.
    for k in range(5):
        yy = cy - h * 0.3 + k * h * 0.15
        draw.line((cx - w * 0.85, yy + k * 1.5 * s, cx - 8 * s, yy - 4 * s), fill=(150, 176, 164), width=max(1, int(1.0 * s)))
        draw.line((cx + 8 * s, yy - 4 * s, cx + w * 0.85, yy + k * 1.5 * s), fill=(150, 176, 164), width=max(1, int(1.0 * s)))
    # Spine shadow.
    draw.rectangle((cx - 3 * s, cy - h * 0.55, cx + 3 * s, cy + h * 0.55), fill=(160, 186, 174))
    return img


SCENES = {
    "sunrise": scene_sunrise,
    "noon": scene_noon,
    "afternoon": scene_afternoon,
    "midnight": scene_midnight,
    "tahajjud": scene_tahajjud,
    "heat": scene_heat,
    "storm": scene_storm,
    "wind": scene_wind,
    "prayer": scene_prayer,
    "quran": scene_quran,
    "dawn": scene_dawn,
    "day": scene_day,
    "sunset": scene_sunset,
    "night": scene_night,
    "moon": scene_moon,
    "rain": scene_rain,
    "cold": scene_cold,
    "mosque": scene_mosque,
}


def preview() -> Image.Image:
    """
    What the widget picker shows: the sunset scene with sample words over it,
    at 2x so it looks crisp on most phones.
    """
    s = 2
    img = scene_sunset(s).convert("RGBA")
    # The same scrim the widget draws, so the preview does not over-promise.
    scrim = vertical_gradient(img.size, [(0, (0, 0, 0)), (1, (0, 0, 0))]).convert("RGBA")
    mask = vertical_gradient(img.size, [(0, (0, 0, 0)), (0.35, (40, 40, 40)), (1, (170, 170, 170))]).convert("L")
    scrim.putalpha(mask)
    img = Image.alpha_composite(img, scrim)

    draw = ImageDraw.Draw(img)
    bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15 * s)
    regular = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11 * s)
    big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30 * s)
    draw.text((16 * s, 14 * s), "EVENING REMEMBRANCE", font=regular, fill=(255, 235, 210))
    draw.text((16 * s, 30 * s), "The day is closing.", font=bold, fill=(255, 255, 255))
    draw.text((16 * s, 48 * s), "The evening words are waiting.", font=bold, fill=(255, 255, 255))
    draw.text((16 * s, 128 * s), "7", font=big, fill=(255, 255, 255))
    draw.text((40 * s, 148 * s), "day streak", font=regular, fill=(255, 240, 220))

    # Rounded corners, like the widget itself.
    radius = 24 * s
    corner_mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(corner_mask).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), corner_mask)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, painter in SCENES.items():
        for scale in SCALES:
            suffix = "" if scale == 1 else f"@{scale}x"
            path = OUT_DIR / f"{name}{suffix}.png"
            painter(float(scale)).save(path, optimize=True)
            print(f"wrote {path.relative_to(OUT_DIR.parent.parent)}")
    preview_path = OUT_DIR / "preview.png"
    preview().save(preview_path, optimize=True)
    print(f"wrote {preview_path.relative_to(OUT_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
