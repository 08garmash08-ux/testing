#!/usr/bin/env python3
"""Build a pressable YouTube-style SUBSCRIBE button as a 3MF (plus STLs and previews).

The whole red face with the white SUBSCRIBE lettering is the button. Three
parts, all printed without supports:

  base    Red rounded-rectangle tray. A ledge runs round the inside, with a
          shallow pocket below it.
  spring  Flat spring plate. Its frame sits on the ledge; a carrier bar in the
          middle hangs on four folded flexure springs, and three posts on the
          carrier hold up the cap.
  cap     The red button face with raised white SUBSCRIBE text. Pegs on the
          posts go into holes in its underside.

Pressing the face pushes the carrier down into the pocket. The pocket floor
stops it after TRAVEL mm, and the springs push it back up.

    pip install manifold3d numpy matplotlib
    python3 make_subscribe_button.py
"""

import math
import os
import struct
import tempfile
import zipfile

import numpy as np
from manifold3d import CrossSection, FillRule, Manifold, OpType
from matplotlib.font_manager import FontProperties, findfont
from matplotlib.textpath import TextPath

OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- dimensions (mm)
CAVITY_W, CAVITY_D, CAVITY_R = 120.0, 40.0, 2.4   # opening in the base the cap sits in
WALL = 3.0
CAP_GAP = 0.4          # cap-to-wall clearance per side
FIT = 0.2              # spring frame-to-wall clearance per side
FLOOR = 2.0
TRAVEL = 3.5           # press depth; the pocket floor is the hard stop
LEDGE = 3.0            # ledge width the spring frame rests on
FLEX_T = 2.0           # frame, carrier, stubs and U-turns
ARM_T = 1.6            # flexure arm thickness (sets the button force)
ARM_B = 3.0            # flexure arm width
CARRIER_X = 53.0       # carrier bar runs from -53 to 53
STUB_X = (46.0, 52.0)  # where each spring joins the carrier, and the frame
UTURN_X = (4.0, 7.0)
ARM1_Y = (5.5, 8.5)    # inner arm, next to the carrier
ARM2_Y = (10.5, 13.5)  # outer arm, next to the frame
POST = 8.0             # square posts on the carrier
POST_X = (-48.0, 0.0, 48.0)
POST_H = TRAVEL + 0.7  # cap clears the frame by 0.7 mm at full press
PEG_D, PEG_H = 4.5, 2.5
HOLE_D, HOLE_H = 4.8, 3.0
CAP_T = 7.0
CAP_CHAMFER = 0.8
CAP_RISE = 4.5         # cap top above the base rim at rest
TEXT = "SUBSCRIBE"
TEXT_CAPS = 12.0       # letter height; the width follows the font
TEXT_H = 1.0

BASE_W, BASE_D, BASE_R = CAVITY_W + 2 * WALL, CAVITY_D + 2 * WALL, CAVITY_R + WALL
CAP_W, CAP_D, CAP_R = CAVITY_W - 2 * CAP_GAP, CAVITY_D - 2 * CAP_GAP, CAVITY_R - CAP_GAP
FRAME_W, FRAME_D, FRAME_R = CAVITY_W - 2 * FIT, CAVITY_D - 2 * FIT, CAVITY_R - FIT
POCKET_W, POCKET_D, POCKET_R = CAVITY_W - 2 * LEDGE, CAVITY_D - 2 * LEDGE, 1.0

Z_LEDGE = FLOOR + TRAVEL                  # underside of the spring plate
Z_CAP = Z_LEDGE + FLEX_T + POST_H         # underside of the cap
BASE_H = Z_CAP + CAP_T - CAP_RISE

RED = "#FF0000FF"
WHITE = "#FFFFFFFF"
RED_RGB = (0.93, 0.05, 0.05)
WHITE_RGB = (0.97, 0.97, 0.97)


# ---------------------------------------------------------------- 2D / 3D helpers
def rrect_pts(w, d, r, seg=16):
    """Counter-clockwise outline of a w x d rectangle with corner radius r."""
    cx, cy = w / 2 - r, d / 2 - r
    pts = []
    for sx, sy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((sx * cx + r * math.cos(a), sy * cy + r * math.sin(a)))
    return np.array(pts)


def rrect(w, d, r):
    return CrossSection([rrect_pts(w, d, r)])


def slab(cs, z0, z1):
    return Manifold.extrude(cs, z1 - z0).translate((0, 0, z0))


def box(x0, x1, y0, y1, z0, z1):
    return Manifold.cube((x1 - x0, y1 - y0, z1 - z0)).translate((x0, y0, z0))


def union(parts):
    return Manifold.batch_boolean(parts, OpType.Add)


def chamfered_prism(w, d, r, h, top=0.0, bottom=0.0):
    """Rounded-rectangle prism with 45 degree chamfers on the top/bottom edge."""
    pts = []

    def ring(inset, z):
        pts.extend((x, y, z) for x, y in rrect_pts(w - 2 * inset, d - 2 * inset, r - inset))

    ring(bottom, 0.0)
    if bottom:
        ring(0.0, bottom)
    if top:
        ring(0.0, h - top)
    ring(top, h)
    return Manifold.hull_points(np.array(pts))


def cylinder(d, z0, z1, x=0.0, y=0.0):
    return Manifold.cylinder(z1 - z0, d / 2, circular_segments=48).translate((x, y, z0))


# ---------------------------------------------------------------- parts (assembled pose)
def make_base():
    base = chamfered_prism(BASE_W, BASE_D, BASE_R, BASE_H, top=0.8, bottom=0.5)
    cavity = slab(rrect(CAVITY_W, CAVITY_D, CAVITY_R), Z_LEDGE, BASE_H + 1)
    pocket = slab(rrect(POCKET_W, POCKET_D, POCKET_R), FLOOR, Z_LEDGE + 0.5)
    return base - cavity - pocket


def make_spring_quarter():
    """One folded flexure spring, in the x > 0, y > 0 quarter.

    It leaves the carrier near the cap's end (STUB_X), runs an arm in
    towards the middle, turns, and runs a second arm back out to the frame.
    Both arms are 39 mm long: the carrier end moves the full travel, the
    U-turn half of it, the frame end not at all.
    """
    t, T = ARM_T, FLEX_T
    (s0, s1), (u0, u1) = STUB_X, UTURN_X
    return union([
        box(s0, s1, POST / 2 - 0.5, ARM1_Y[0] + 1.5, 0, T),         # stub from the carrier
        box(u0, s1, *ARM1_Y, 0, t),                                 # inner arm
        box(u0, u1, ARM1_Y[0], ARM2_Y[1], 0, T),                    # U-turn
        box(u0, s1, *ARM2_Y, 0, t),                                 # outer arm
        box(s0, s1, ARM2_Y[0] + 1.5, POCKET_D / 2 + 0.5, 0, T),     # anchor to the frame
    ])


def make_spring():
    """Spring plate; z = 0 is its underside."""
    frame = slab(rrect(FRAME_W, FRAME_D, FRAME_R), 0, FLEX_T) - \
        slab(rrect(POCKET_W, POCKET_D, POCKET_R), -1, FLEX_T + 1)
    carrier = box(-CARRIER_X, CARRIER_X, -POST / 2, POST / 2, 0, FLEX_T)
    q = make_spring_quarter()
    springs = [q, q.mirror((1, 0, 0)), q.mirror((0, 1, 0)), q.mirror((1, 0, 0)).mirror((0, 1, 0))]
    posts = []
    for x in POST_X:
        posts.append(box(x - POST / 2, x + POST / 2, -POST / 2, POST / 2, FLEX_T - 0.01, FLEX_T + POST_H))
        posts.append(cylinder(PEG_D, FLEX_T + POST_H - 0.01, FLEX_T + POST_H + PEG_H, x=x))
    return union([frame, carrier, *springs, *posts])


def font_path():
    for family in ("Liberation Sans", "Arial", "DejaVu Sans"):
        path = findfont(FontProperties(family=family, weight="bold"), fallback_to_default=True)
        if path:
            return path
    raise RuntimeError("no bold font found")


def make_cap():
    """Button face; z = 0 is its underside."""
    cap = chamfered_prism(CAP_W, CAP_D, CAP_R, CAP_T, top=CAP_CHAMFER)
    holes = [cylinder(HOLE_D, -1, HOLE_H, x=x) for x in POST_X]
    return cap - union(holes)


def make_text():
    """Raised SUBSCRIBE lettering standing on the cap's top face."""
    # Build glyph outlines large so the curve flattening is fine, then scale down.
    tp = TextPath((0, 0), TEXT, size=200, prop=FontProperties(fname=font_path()))
    polys = [p for p in tp.to_polygons(closed_only=True) if len(p) >= 3]
    cs = CrossSection(polys, FillRule.NonZero)
    x0, y0, x1, y1 = cs.bounds()
    s = TEXT_CAPS / (y1 - y0)
    cs = cs.translate((-(x0 + x1) / 2, -(y0 + y1) / 2)).scale((s, s)).simplify(0.005)
    return slab(cs, CAP_T, CAP_T + TEXT_H)


# ---------------------------------------------------------------- export
def mesh_arrays(m):
    mesh = m.to_mesh()
    return np.asarray(mesh.vert_properties, dtype=np.float64)[:, :3], np.asarray(mesh.tri_verts, dtype=np.int64)


def mesh_xml(m):
    v, t = mesh_arrays(m)
    verts = "".join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in v)
    tris = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in t)
    return f"<mesh><vertices>{verts}</vertices><triangles>{tris}</triangles></mesh>"


def transform(tx, ty, tz=0.0):
    return f"1 0 0 0 1 0 0 0 1 {tx:.3f} {ty:.3f} {tz:.3f}"


def write_3mf(path, base, spring, cap, text, thumbnail=None):
    """Core-spec 3MF: one plate with the three parts, the text as a second part of the cap."""
    # Stacked front to back around (110, 105), so it fits 220 x 220 beds.
    gap = 8.0
    total = BASE_D + gap + FRAME_D + gap + CAP_D
    y = 105 - total / 2
    cap_xy = (110.0, y + CAP_D / 2)
    spring_xy = (110.0, y + CAP_D + gap + FRAME_D / 2)
    base_xy = (110.0, y + CAP_D + gap + FRAME_D + gap + BASE_D / 2)

    model = f"""<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">Subscribe button</metadata>
<metadata name="Designer">make_subscribe_button.py</metadata>
<metadata name="Description">Pressable red SUBSCRIBE button, {BASE_W:.0f} x {BASE_D:.0f} mm. Print base, spring plate and cap; no supports.</metadata>
<resources>
<basematerials id="1"><base name="Red" displaycolor="{RED}"/><base name="White" displaycolor="{WHITE}"/></basematerials>
<object id="2" type="model" name="Base" pid="1" pindex="0">{mesh_xml(base)}</object>
<object id="3" type="model" name="Spring plate" pid="1" pindex="0">{mesh_xml(spring)}</object>
<object id="4" type="model" name="Button face" pid="1" pindex="0">{mesh_xml(cap)}</object>
<object id="5" type="model" name="SUBSCRIBE text" pid="1" pindex="1">{mesh_xml(text)}</object>
<object id="6" type="model" name="Button"><components><component objectid="4"/><component objectid="5"/></components></object>
</resources>
<build>
<item objectid="2" transform="{transform(*base_xy)}"/>
<item objectid="3" transform="{transform(*spring_xy)}"/>
<item objectid="6" transform="{transform(*cap_xy)}"/>
</build>
</model>
"""
    content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
<Default Extension="png" ContentType="image/png"/>
</Types>
"""
    thumb_rel = ('<Relationship Target="/Metadata/thumbnail.png" Id="rel1" '
                 'Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>'
                 if thumbnail else "")
    rels = f"""<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
{thumb_rel}
</Relationships>
"""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)
        if thumbnail:
            z.write(thumbnail, "Metadata/thumbnail.png")


def write_stl(path, m):
    v, t = mesh_arrays(m)
    tri = v[t]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    rec = np.zeros(len(t), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    rec["n"], rec["v"] = n, tri
    with open(path, "wb") as f:
        f.write(os.path.basename(path).encode().ljust(80, b" ")[:80])
        f.write(struct.pack("<I", len(t)))
        f.write(rec.tobytes())


# ---------------------------------------------------------------- preview render
def render(parts, path, elev=28, azim=-55, size=(1000, 700), title=None):
    """Flat-shaded orthographic render (painter's algorithm on a refined mesh)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.collections import PolyCollection

    az, el = math.radians(azim), math.radians(elev)
    # camera basis: right, up, toward viewer
    fwd = np.array([math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)])
    right = np.array([math.cos(az), math.sin(az), 0.0])
    up = np.cross(fwd, right)
    light = fwd * 0.55 + up * 0.55 + right * 0.35
    light /= np.linalg.norm(light)

    polys, colors, depth = [], [], []
    for m, rgb in parts:
        v, t = mesh_arrays(m.refine_to_length(2.5))
        tri = v[t]
        n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        vis = n @ fwd > 1e-6
        tri, n = tri[vis], n[vis]
        shade = 0.35 + 0.65 * np.clip(n @ light, 0, 1)
        polys.append(np.stack([tri @ right, tri @ up], axis=-1))
        colors.append(np.clip(np.outer(shade, rgb), 0, 1))
        depth.append((tri @ fwd).mean(axis=1))
    polys, colors, depth = np.concatenate(polys), np.concatenate(colors), np.concatenate(depth)
    order = np.argsort(depth)

    w, h = size
    fig = plt.figure(figsize=(w / 100, h / 100), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.add_collection(PolyCollection(polys[order], facecolors=colors[order], edgecolors=colors[order],
                                     linewidths=0.5, antialiaseds=False))
    pts = polys.reshape(-1, 2)
    lo, hi = pts.min(0), pts.max(0)
    c = (lo + hi) / 2
    half = max((hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2 * w / h) * 1.1
    ax.set_xlim(c[0] - half, c[0] + half)
    ax.set_ylim(c[1] - half * h / w, c[1] + half * h / w)
    ax.axis("off")
    fig.patch.set_facecolor("#f4f4f4")
    if title:
        ax.text(0.5, 0.96, title, transform=ax.transAxes, ha="center", va="top", fontsize=15, color="#222")
    fig.savefig(path, facecolor=fig.get_facecolor())
    plt.close(fig)


# ---------------------------------------------------------------- main
def main():
    base, spring, cap, text = make_base(), make_spring(), make_cap(), make_text()
    for name, m in (("base", base), ("spring", spring), ("cap", cap), ("text", text)):
        assert m.status().name == "NoError" and not m.is_empty(), name

    # assembled pose
    a_spring = spring.translate((0, 0, Z_LEDGE))
    a_cap = cap.translate((0, 0, Z_CAP))
    a_text = text.translate((0, 0, Z_CAP))
    assembled = [(base, RED_RGB), (a_spring, RED_RGB), (a_cap, RED_RGB), (a_text, WHITE_RGB)]

    thumbnail = os.path.join(tempfile.mkdtemp(), "thumbnail.png")
    render(assembled, thumbnail, elev=38, azim=-20, size=(512, 512))
    render(assembled, os.path.join(OUT, "preview.png"), elev=38, azim=-20,
           title="Subscribe button (assembled)")
    render([(base, RED_RGB), (a_spring.translate((0, 0, 22)), (0.95, 0.55, 0.1)),
            (a_cap.translate((0, 0, 48)), RED_RGB), (a_text.translate((0, 0, 48)), WHITE_RGB)],
           os.path.join(OUT, "preview_exploded.png"), elev=30, azim=-25, size=(1000, 900),
           title="Base, spring plate (orange here), button face")
    # cut across the button at x = 30 and look at the cut face: cap on its
    # post, the spring arms either side of the carrier, the pocket underneath
    cut = lambda m: m.trim_by_plane((-1, 0, 0), -30.0)
    render([(cut(base), RED_RGB), (cut(a_spring), (0.95, 0.55, 0.1)), (cut(a_cap), (0.6, 0.6, 0.6)),
            (cut(a_text), WHITE_RGB)],
           os.path.join(OUT, "preview_section.png"), elev=10, azim=75,
           title="Section: base red, spring plate orange, button face grey")

    write_3mf(os.path.join(OUT, "subscribe_button.3mf"), base, spring, cap, text, thumbnail=thumbnail)
    os.makedirs(os.path.join(OUT, "stl"), exist_ok=True)
    for name, m in (("base", base), ("spring_plate", spring), ("button_face", cap), ("button_text", text)):
        write_stl(os.path.join(OUT, "stl", f"{name}.stl"), m)
    print("wrote subscribe_button.3mf, stl/*.stl and previews to", OUT)


if __name__ == "__main__":
    main()
