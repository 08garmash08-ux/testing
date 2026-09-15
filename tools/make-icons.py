#!/usr/bin/env python3
"""Generate the PWA icon set with no third-party dependencies.

The icon is drawn analytically (rounded square, mortarboard, tassel) and
supersampled, then written out as PNG with the standard library only.
Run it after changing COLOURS or the geometry:  python3 tools/make-icons.py
"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "icons")

BG_TOP = (43, 53, 80)
BG_BOTTOM = (18, 21, 28)
BOARD = (255, 210, 125)
BOARD_DARK = (214, 168, 88)
CAP = (224, 168, 79)
TASSEL = (224, 112, 92)
SS = 4  # supersampling factor


def rounded_rect(x, y, r):
    """Point-in-rounded-unit-square with corner radius r."""
    cx = min(max(x, r), 1 - r)
    cy = min(max(y, r), 1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def rhombus(x, y, cx, cy, a, b):
    return abs((x - cx) / a) + abs((y - cy) / b) <= 1.0


def trapezoid(x, y, y0, y1, half_top, half_bottom, cx):
    if y < y0 or y > y1:
        return False
    t = (y - y0) / (y1 - y0)
    half = half_top + (half_bottom - half_top) * t
    return abs(x - cx) <= half


def segment(x, y, x0, y0, x1, y1, w):
    dx, dy = x1 - x0, y1 - y0
    length2 = dx * dx + dy * dy
    if length2 == 0:
        return (x - x0) ** 2 + (y - y0) ** 2 <= w * w
    t = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / length2))
    px, py = x0 + t * dx, y0 + t * dy
    return (x - px) ** 2 + (y - py) ** 2 <= w * w


def disc(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def sample(x, y, inset, radius):
    """Return an RGBA tuple for a point in the unit square."""
    # map into the padded content box
    cx = (x - inset) / (1 - 2 * inset)
    cy = (y - inset) / (1 - 2 * inset)

    if not rounded_rect(x, y, radius):
        return (0, 0, 0, 0)

    blend = y
    bg = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * blend) for i in range(3))
    colour = bg

    if 0 <= cx <= 1 and 0 <= cy <= 1:
        if segment(cx, cy, 0.845, 0.46, 0.845, 0.70, 0.022) or disc(cx, cy, 0.845, 0.73, 0.055):
            colour = TASSEL
        if trapezoid(cx, cy, 0.47, 0.70, 0.235, 0.205, 0.5):
            colour = CAP
        if trapezoid(cx, cy, 0.64, 0.72, 0.215, 0.185, 0.5):
            colour = BOARD_DARK
        if rhombus(cx, cy, 0.5, 0.42, 0.44, 0.185):
            colour = BOARD
        if rhombus(cx, cy, 0.5, 0.42, 0.44, 0.185) and cy > 0.42:
            colour = BOARD_DARK if cy > 0.47 else BOARD
    return (colour[0], colour[1], colour[2], 255)


def render(size, inset=0.10, radius=0.22):
    n = size * SS
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px * SS + sx + 0.5) / n
                    y = (py * SS + sy + 0.5) / n
                    c = sample(x, y, inset, radius)
                    r += c[0] * c[3]
                    g += c[1] * c[3]
                    b += c[2] * c[3]
                    a += c[3]
            total = SS * SS
            if a == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((r // a, g // a, b // a, a // total))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)
    return len(png)


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, 0.06, 0.20),
        ("icon-512.png", 512, 0.06, 0.20),
        ("maskable-512.png", 512, 0.20, 0.5),   # full-bleed circle-safe version
        ("apple-touch-icon.png", 180, 0.08, 0.0),
        ("favicon.png", 64, 0.04, 0.16),
    ]
    for name, size, inset, radius in jobs:
        rows = render(size, inset, radius)
        n = write_png(os.path.join(OUT, name), size, rows)
        print("%-24s %4dpx  %6d bytes" % (name, size, n))


if __name__ == "__main__":
    main()
