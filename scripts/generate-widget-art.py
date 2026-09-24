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


SCENES = {
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
