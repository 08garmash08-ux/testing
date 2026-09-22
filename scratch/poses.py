"""Re-pose the official Scratch Cat.

The cat's SVG has its two front limbs as named paths (`<path id="arm">`). Rotating
one of them about the shoulder is exactly what you would do by hand in the paint
editor; doing it here keeps every other line of the official artwork untouched.
"""

import re

SHOULDER_NEAR = (51.5, 61.0)   # where the near (viewer's right) arm meets the body
SHOULDER_FAR = (34.0, 58.0)    # the far arm's joint

# name -> (near arm (angle, dx, dy) or None, far arm or None)
POSES = {
    "wave-1": ((-12, 4, -1), None),      # paw just off the body
    "wave-2": ((-28, 4, -1), None),
    "wave-3": ((-40, 4, -1), None),
    "wave-4": ((-50, 4, -1), None),
    "wave-5": ((-60, 4, -1), None),      # paw up by the cheek
    "cheer": ((-55, 4, -1), (95, 0, -4)),  # both paws up
}


def repose(svg, near=None, far=None):
    arms = list(re.finditer(r'<path[^>]*id="arm"[^>]*/>', svg))
    if len(arms) < 2:
        raise SystemExit("expected two arm paths — has the official costume changed?")

    moves = []
    if near:
        moves.append((arms[0], near, SHOULDER_NEAR))
    if far:
        moves.append((arms[1], far, SHOULDER_FAR))

    out = svg
    for match, _, _ in sorted(moves, key=lambda m: -m[0].start()):   # cut from the back
        out = out[:match.start()] + out[match.end():]

    posed = ""
    for match, (deg, dx, dy), pivot in moves:
        posed += (f'<g transform="translate({dx},{dy}) rotate({deg},{pivot[0]},{pivot[1]})">'
                  f'{match.group(0)}</g>')
    # a raised arm belongs in front of the body, so it goes on at the end
    return out.replace("</svg>", posed + "</svg>")


def all_poses(costume1_svg):
    return {name: repose(costume1_svg, near, far) for name, (near, far) in POSES.items()}
