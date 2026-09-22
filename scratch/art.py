"""SVG art for the parts of the project that are not the cat.

The Scratch Cat itself is official artwork (see assets/ and poses.py). Everything
here — the sparkle the cat throws off and the backdrops — is drawn from scratch,
in plain SVG shapes that the Scratch renderer handles: paths, circles, gradients.
No text, no filters.
"""

import math

W, H = 480, 360   # the Scratch stage, in stage units


def _svg(body, w, h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" version="1.1">{body}</svg>')


def sparkle():
    """A four-point sparkle. Saturated on purpose: Scratch's colour effect shifts
    hue, so a white sparkle would stay white on every clone."""
    p = ('M24 1 C26.5 15 33 21.5 47 24 C33 26.5 26.5 33 24 47 '
         'C21.5 33 15 26.5 1 24 C15 21.5 21.5 15 24 1 Z')
    return _svg(
        f'<path d="{p}" fill="#FFD83D" stroke="#FF8C1A" stroke-width="1.5" stroke-linejoin="round"/>'
        f'<circle cx="24" cy="24" r="4.5" fill="#FFFFFF" opacity=".95"/>', 48, 48)


def night():
    stars = ''
    # fixed, hand-placed so the sky is the same every build
    for x, y, r in [(38, 46, 2.2), (96, 28, 1.4), (150, 62, 1.8), (214, 34, 2.6), (268, 74, 1.5),
                    (322, 40, 2.0), (392, 66, 1.6), (440, 30, 2.3), (68, 104, 1.5), (176, 116, 1.9),
                    (286, 128, 1.4), (356, 100, 2.1), (430, 138, 1.7), (120, 160, 1.5), (246, 168, 1.3),
                    (404, 190, 1.6), (20, 132, 1.8), (330, 158, 1.4)]:
        stars += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" opacity=".9"/>'
    return _svg(
        '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#070A1F"/><stop offset=".55" stop-color="#1B1B4D"/>'
        '<stop offset="1" stop-color="#4B2B6B"/></linearGradient></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>{stars}'
        '<circle cx="404" cy="72" r="30" fill="#FFF3C4"/>'
        '<circle cx="392" cy="64" r="30" fill="#1B1B4D"/>'
        f'<path d="M0 300 C 90 258 150 306 232 288 C 320 268 392 306 {W} 280 L {W} {H} L 0 {H} Z" fill="#160F33"/>',
        W, H)


def sunrise():
    return _svg(
        '<defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#3D2A6B"/><stop offset=".45" stop-color="#FF8C6B"/>'
        '<stop offset="1" stop-color="#FFD98E"/></linearGradient></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#dawn)"/>'
        '<circle cx="240" cy="226" r="74" fill="#FFF0B8" opacity=".95"/>'
        '<circle cx="240" cy="226" r="98" fill="#FFF0B8" opacity=".25"/>'
        f'<path d="M0 268 C 80 232 140 276 208 264 C 300 248 360 286 {W} 258 L {W} {H} L 0 {H} Z" fill="#C4562F"/>'
        f'<path d="M0 306 C 96 282 168 318 260 304 C 350 290 412 320 {W} 302 L {W} {H} L 0 {H} Z" fill="#8C3A28"/>',
        W, H)


def rave():
    rays = ''
    cx, cy = W / 2, H / 2
    for i in range(16):
        a0 = math.radians(i * 22.5)
        a1 = math.radians(i * 22.5 + 11.25)
        r = 460
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        colour = '#FF3D9A' if i % 2 else '#22D3EE'
        rays += f'<path d="M{cx} {cy} L{x0:.1f} {y0:.1f} L{x1:.1f} {y1:.1f} Z" fill="{colour}" opacity=".85"/>'
    return _svg(
        '<defs><radialGradient id="core" cx=".5" cy=".5" r=".5">'
        '<stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#7C3AED"/>'
        '<stop offset="1" stop-color="#190B33"/></radialGradient></defs>'
        f'<rect width="{W}" height="{H}" fill="#190B33"/>{rays}'
        f'<rect width="{W}" height="{H}" fill="url(#core)" opacity=".45"/>'
        f'<circle cx="{cx}" cy="{cy}" r="46" fill="#FFFFFF" opacity=".9"/>', W, H)


def grid():
    horizon = 196
    lines = ''
    for i in range(-9, 10):                       # verticals, converging on the vanishing point
        x_bottom = W / 2 + i * 62
        lines += (f'<line x1="{W/2}" y1="{horizon}" x2="{x_bottom:.1f}" y2="{H}" '
                  'stroke="#22D3EE" stroke-width="2" opacity=".75"/>')
    y = horizon
    step = 5.0
    while y < H:                                  # horizontals, spaced out towards the viewer
        lines += f'<line x1="0" y1="{y:.1f}" x2="{W}" y2="{y:.1f}" stroke="#FF3D9A" stroke-width="2" opacity=".7"/>'
        y += step
        step *= 1.42
    return _svg(
        '<defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#0B0426"/><stop offset="1" stop-color="#5B1A66"/></linearGradient>'
        '<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#FFD83D"/><stop offset="1" stop-color="#FF3D9A"/></linearGradient></defs>'
        f'<rect width="{W}" height="{horizon}" fill="url(#dusk)"/>'
        f'<circle cx="{W/2}" cy="{horizon}" r="86" fill="url(#sun)"/>'
        # slits across the sun, the way that poster always has them: each one is
        # only as wide as the sun is at that height, so nothing overhangs the disc
        + ''.join(
            f'<rect x="{W/2 - (86**2 - (horizon-20+i*14 - horizon)**2) ** .5:.1f}" '
            f'y="{horizon-20+i*14}" '
            f'width="{2 * (86**2 - (horizon-20+i*14 - horizon)**2) ** .5:.1f}" '
            f'height="{4+i}" fill="#0B0426" opacity=".85"/>'
            for i in range(5))
        + f'<rect y="{horizon}" width="{W}" height="{H-horizon}" fill="#12052E"/>{lines}'
          f'<rect y="{horizon-3}" width="{W}" height="6" fill="#FF3D9A" opacity=".9"/>', W, H)


BACKDROPS = {"night": night, "sunrise": sunrise, "rave": rave, "grid": grid}
