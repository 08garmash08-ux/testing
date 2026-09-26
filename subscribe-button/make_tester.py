#!/usr/bin/env python3
"""Build tester.html: a 3D page where you can press the SUBSCRIBE button.

It embeds the same meshes as subscribe_button.3mf. Each spring-plate vertex
also gets a weight saying how far it moves when the button goes down: 1 on
the carrier and posts, 0 on the frame, 1/2 at the U-turns, and a bent-beam
curve along the arms. The page moves the vertices by weight x travel.

    python3 make_tester.py                     # writes tester.html
    python3 make_tester.py --fragment out.html # also writes the page body alone
"""

import argparse
import base64
import json
import os

import numpy as np

import make_subscribe_button as sb

OUT = os.path.dirname(os.path.abspath(__file__))
E_PLA = 2500.0  # N/mm^2, a middle value for printed PLA


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def pack(m):
    v, t = sb.mesh_arrays(m)
    idx = t.astype(np.uint16 if len(v) < 65536 else np.uint32)
    return {"p": b64(v.astype(np.float32)), "i": b64(idx), "wide": idx.dtype == np.uint32}


def bend(s):
    """Guided-beam shape: 0 at s = 0, 1 at s = 1, flat at both ends."""
    return 3 * s * s - 2 * s ** 3


def spring_weights(v):
    """Fraction of the button's travel that each spring-plate vertex moves down."""
    x, y = np.abs(v[:, 0]), np.abs(v[:, 1])
    eps = 1e-3
    s0, u1 = sb.STUB_X[0], sb.UTURN_X[1]
    arm_len = s0 - u1
    w = np.full(len(v), 0.5)                                # U-turns
    arm1 = (y >= sb.ARM1_Y[0] - eps) & (y <= sb.ARM1_Y[1] + eps) & (x > u1)
    arm2 = (y >= sb.ARM2_Y[0] - eps) & (y <= sb.ARM2_Y[1] + eps) & (x > u1)
    w[arm1] = 1 - 0.5 * bend(np.clip((s0 - x[arm1]) / arm_len, 0, 1))
    w[arm2] = 0.5 * (1 - bend(np.clip((x[arm2] - u1) / arm_len, 0, 1)))
    w[(y < sb.ARM1_Y[0] - eps) & (x > u1)] = 1.0            # stubs off the carrier
    w[(y > sb.ARM2_Y[1] + eps) & (x > u1)] = 0.0            # anchors into the frame
    w[y <= sb.POST / 2 + eps] = 1.0                         # carrier, posts, pegs
    w[(x >= sb.POCKET_W / 2 - eps) | (y >= sb.POCKET_D / 2 - eps)] = 0.0  # frame
    return w


def main(fragment=None):
    spring = sb.make_spring().refine_to_length(2.5)
    sv, _ = sb.mesh_arrays(spring)
    arm_len = sb.STUB_X[0] - sb.UTURN_X[1]
    k_arm = E_PLA * sb.ARM_B * sb.ARM_T ** 3 / arm_len ** 3   # guided beam, 12EI/L^3
    model = {
        "travel": sb.TRAVEL,
        "zLedge": sb.Z_LEDGE,
        "zCap": sb.Z_CAP,
        "k": round(4 * k_arm / 2, 3),                          # 4 springs, 2 arms in series
        "size": [sb.BASE_W, sb.BASE_D, sb.Z_CAP + sb.CAP_T],
        "base": pack(sb.make_base()),
        "spring": {**pack(spring), "w": b64(spring_weights(sv).astype(np.float32))},
        "cap": pack(sb.make_cap()),
        "text": pack(sb.make_text()),
    }
    with open(os.path.join(OUT, "tester_template.html")) as f:
        page = f.read()
    page = page.replace("/*MODEL*/null", json.dumps(model, separators=(",", ":")))
    # still picture shown until the 3D view draws its first frame
    with open(os.path.join(OUT, "preview.png"), "rb") as f:
        page = page.replace("/*PREVIEW*/", "data:image/png;base64," + base64.b64encode(f.read()).decode())
    head, body = page.split("<main", 1)
    with open(os.path.join(OUT, "tester.html"), "w") as f:
        f.write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                f"{head}</head>\n<body>\n<main{body}</body>\n</html>\n")
    if fragment:
        with open(fragment, "w") as f:
            f.write(page)
    print(f"wrote tester.html ({len(page) / 1024:.0f} KB), k = {model['k']} N/mm, "
          f"full press {model['k'] * sb.TRAVEL:.1f} N")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fragment", help="also write the page without its html/head/body wrapper")
    main(ap.parse_args().fragment)
