#!/usr/bin/env python3
"""Build the red SUBSCRIBE push-button cube as a 3MF (plus STLs and previews).

Three parts, all printed without supports:

  body    70 mm red cube. A recess and a shallow pocket are cut into its top.
  button  Red cap with raised white SUBSCRIBE text. It sits on a flat spring
          plate: four folded flexure springs join the cap to an outer frame.
  lid     Red top plate. It clamps the spring frame into the recess, so only
          the cap shows through its opening.

Pressing the cap bends the flexure arms down into the pocket. The pocket
floor stops the cap after TRAVEL mm, and the arms spring it back up.

    pip install manifold3d numpy matplotlib
    python3 make_subscribe_cube.py
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
CUBE = 70.0            # body width and depth
BODY_R = 6.0           # radius of the vertical body edges
CAP_RISE = 5.0         # cap height above the lid at rest
BODY_H = CUBE - CAP_RISE
RIM = 2.5              # wall left around the top recess
FIT = 0.2              # clearance per side for the spring frame and the lid
FLEX_T = 1.6           # spring frame, stubs and U-turns
ARM_T = 1.2            # flexure arm thickness (sets the button force)
LID_T = 2.4
RECESS_D = FLEX_T + LID_T
POCKET = 59.0          # square pocket the arms bend into
POCKET_R = 2.0
TRAVEL = 3.5           # press depth; the pocket floor is the hard stop
CAP_W, CAP_D, CAP_R = 54.0, 28.0, 4.0
CAP_H = RECESS_D + CAP_RISE
CAP_CHAMFER = 1.0
HOLE_GAP = 0.4         # cap-to-lid clearance per side
TEXT = "SUBSCRIBE"
TEXT_W = 48.0          # lettering width on the 52 mm top face
TEXT_CAPS = 8.5        # letter height; the font is stretched to a condensed look
TEXT_BOLD = 0.1        # outline growth so the strokes print cleanly
TEXT_H = 1.0

RECESS = CUBE - 2 * RIM
PLATE = RECESS - 2 * FIT
PLATE_R = BODY_R - RIM - FIT

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


# ---------------------------------------------------------------- parts (assembled pose)
def make_body():
    body = chamfered_prism(CUBE, CUBE, BODY_R, BODY_H, top=1.0, bottom=0.6)
    recess = slab(rrect(RECESS, RECESS, BODY_R - RIM), BODY_H - RECESS_D, BODY_H + 1)
    pocket = slab(rrect(POCKET, POCKET, POCKET_R), BODY_H - RECESS_D - TRAVEL, BODY_H - RECESS_D + 0.5)
    return body - recess - pocket


def make_springs_back():
    """Two folded flexure springs between the cap's back edge and the frame.

    Spring A hangs off the cap's right corner and spring B off its left corner,
    so every cap corner has its own spring and the cap stays level. Each
    spring is two 30.5 mm arms joined by a U-turn: the cap end moves the full
    travel, the U-turn half of it, and the frame end not at all.
    """
    t, T = ARM_T, FLEX_T
    edge, frame = CAP_D / 2, POCKET / 2
    a1, a2, b1, b2 = (15.2, 17.2), (18.7, 20.7), (22.2, 24.2), (25.7, 27.7)
    parts = [
        # spring A: cap stub (right) -> arm -> U-turn (left) -> arm -> anchor (right)
        box(18, 23, edge - 0.5, a1[0] + 0.8, 0, T),
        box(-15, 23, *a1, 0, t),
        box(-15, -12.5, a1[0], a2[1], 0, T),
        box(-15, 23, *a2, 0, t),
        box(18, 23, a2[0] + 1.3, frame + 0.5, 0, T),
        # spring B: cap stub (left) -> arm -> U-turn (right) -> arm -> anchor (left)
        box(-23, -18, edge - 0.5, b1[0] + 0.8, 0, T),
        box(-23, 15, *b1, 0, t),
        box(12.5, 15, b1[0], b2[1], 0, T),
        box(-23, 15, *b2, 0, t),
        box(-23, -18, b2[0] + 1.3, frame + 0.5, 0, T),
    ]
    return Manifold.batch_boolean(parts, OpType.Add)


def make_button():
    """Cap, springs and frame; z = 0 is the spring plate's underside."""
    frame = slab(rrect(PLATE, PLATE, PLATE_R), 0, FLEX_T) - slab(rrect(POCKET, POCKET, POCKET_R), -1, FLEX_T + 1)
    cap = chamfered_prism(CAP_W, CAP_D, CAP_R, CAP_H, top=CAP_CHAMFER)
    back = make_springs_back()
    return Manifold.batch_boolean([frame, cap, back, back.mirror((0, 1, 0))], OpType.Add)


def font_path():
    for family in ("Liberation Sans", "Arial", "DejaVu Sans"):
        path = findfont(FontProperties(family=family, weight="bold"), fallback_to_default=True)
        if path:
            return path
    raise RuntimeError("no bold font found")


def make_text():
    """Raised SUBSCRIBE lettering standing on the cap's top face."""
    # Build glyph outlines large so the curve flattening is fine, then scale down.
    tp = TextPath((0, 0), TEXT, size=200, prop=FontProperties(fname=font_path()))
    polys = [p for p in tp.to_polygons(closed_only=True) if len(p) >= 3]
    cs = CrossSection(polys, FillRule.NonZero)
    x0, y0, x1, y1 = cs.bounds()
    grow = 2 * TEXT_BOLD
    sx, sy = (TEXT_W - grow) / (x1 - x0), (TEXT_CAPS - grow) / (y1 - y0)
    cs = cs.translate((-(x0 + x1) / 2, -(y0 + y1) / 2)).scale((sx, sy)).offset(TEXT_BOLD).simplify(0.005)
    return slab(cs, CAP_H, CAP_H + TEXT_H)


def make_lid():
    lid = chamfered_prism(PLATE, PLATE, PLATE_R, LID_T, top=0.4)
    hw, hd, hr = CAP_W + 2 * HOLE_GAP, CAP_D + 2 * HOLE_GAP, CAP_R + HOLE_GAP
    # opening with a small flare on its top edge
    hole = Manifold.hull_points(np.array(
        [(x, y, -1.0) for x, y in rrect_pts(hw, hd, hr)]
        + [(x, y, LID_T - 0.4) for x, y in rrect_pts(hw, hd, hr)]
        + [(x, y, LID_T + 0.01) for x, y in rrect_pts(hw + 0.82, hd + 0.82, hr + 0.41)]
        + [(x, y, LID_T + 1.0) for x, y in rrect_pts(hw + 0.82, hd + 0.82, hr + 0.41)]
    ))
    return lid - hole


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


def write_3mf(path, body, button, text, lid, thumbnail=None):
    """Core-spec 3MF: one plate with the three parts, the text as a second part of the button."""
    # 2 x 2 layout inside a 150 mm square centred on (110, 105); fits 220 x 220 beds.
    gap = 8.0
    left = 110 - (CUBE + gap + PLATE) / 2
    bottom = 105 - (PLATE + gap + CUBE) / 2
    body_xy = (left + CUBE / 2, bottom + PLATE + gap + CUBE / 2)
    lid_xy = (left + CUBE / 2, bottom + PLATE / 2)
    button_xy = (left + CUBE + gap + PLATE / 2, body_xy[1])

    model = f"""<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">Subscribe button cube</metadata>
<metadata name="Designer">make_subscribe_cube.py</metadata>
<metadata name="Description">70 mm red cube with a pressable SUBSCRIBE button. Print body, button and lid; no supports.</metadata>
<resources>
<basematerials id="1"><base name="Red" displaycolor="{RED}"/><base name="White" displaycolor="{WHITE}"/></basematerials>
<object id="2" type="model" name="Body" pid="1" pindex="0">{mesh_xml(body)}</object>
<object id="3" type="model" name="Lid" pid="1" pindex="0">{mesh_xml(lid)}</object>
<object id="4" type="model" name="Button cap and springs" pid="1" pindex="0">{mesh_xml(button)}</object>
<object id="5" type="model" name="SUBSCRIBE text" pid="1" pindex="1">{mesh_xml(text)}</object>
<object id="6" type="model" name="Button"><components><component objectid="4"/><component objectid="5"/></components></object>
</resources>
<build>
<item objectid="2" transform="{transform(*body_xy)}"/>
<item objectid="6" transform="{transform(*button_xy)}"/>
<item objectid="3" transform="{transform(*lid_xy)}"/>
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
def render(parts, path, elev=28, azim=-55, size=900, title=None):
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

    fig = plt.figure(figsize=(size / 100, size / 100), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.add_collection(PolyCollection(polys[order], facecolors=colors[order], edgecolors=colors[order],
                                 linewidths=0.5, antialiaseds=False))
    pts = polys.reshape(-1, 2)
    lo, hi = pts.min(0), pts.max(0)
    c, r = (lo + hi) / 2, (hi - lo).max() / 2 * 1.08
    ax.set_xlim(c[0] - r, c[0] + r)
    ax.set_ylim(c[1] - r, c[1] + r)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.patch.set_facecolor("#f4f4f4")
    if title:
        ax.text(0.5, 0.965, title, transform=ax.transAxes, ha="center", va="top", fontsize=15, color="#222")
    fig.savefig(path, facecolor=fig.get_facecolor())
    plt.close(fig)


# ---------------------------------------------------------------- main
def main():
    body, button, text, lid = make_body(), make_button(), make_text(), make_lid()
    for name, m in (("body", body), ("button", button), ("text", text), ("lid", lid)):
        assert m.status().name == "NoError" and not m.is_empty(), name

    # assembled pose: spring plate on the recess floor, lid on top of it
    z_plate = BODY_H - RECESS_D
    a_button = button.translate((0, 0, z_plate))
    a_text = text.translate((0, 0, z_plate))
    a_lid = lid.translate((0, 0, z_plate + FLEX_T))

    # print pose: lid flipped so its chamfered top face lies on the bed
    p_lid = lid.mirror((0, 0, 1)).translate((0, 0, LID_T))

    thumbnail = os.path.join(tempfile.mkdtemp(), "thumbnail.png")
    render([(body, RED_RGB), (a_button, RED_RGB), (a_text, WHITE_RGB), (a_lid, RED_RGB)], thumbnail, size=512)
    render([(body, RED_RGB), (a_button, RED_RGB), (a_text, WHITE_RGB), (a_lid, RED_RGB)],
           os.path.join(OUT, "preview.png"), title="Subscribe button cube (assembled)")
    lift = 30.0
    render([(body, RED_RGB), (a_button.translate((0, 0, lift)), RED_RGB),
            (a_text.translate((0, 0, lift)), WHITE_RGB), (a_lid.translate((0, 0, 2.2 * lift)), RED_RGB)],
           os.path.join(OUT, "preview_exploded.png"), elev=22, title="Body, button with spring plate, lid")
    # cut across the button at x = 0 and look at the cut face: cap in the middle,
    # the four spring arms on each side, the pocket underneath
    cut = lambda m: m.trim_by_plane((-1, 0, 0), 0.0).translate((0, 0, -BODY_H + 12)).trim_by_plane((0, 0, 1), 0.0)
    render([(cut(body), RED_RGB), (cut(a_button), (0.95, 0.55, 0.1)), (cut(a_lid), (0.6, 0.6, 0.6)),
            (cut(a_text), WHITE_RGB)],
           os.path.join(OUT, "preview_section.png"), elev=6, azim=88,
           title="Section (top 12 mm): body red, button orange, lid grey")

    write_3mf(os.path.join(OUT, "subscribe_cube.3mf"), body, button, text, p_lid,
              thumbnail=thumbnail)
    os.makedirs(os.path.join(OUT, "stl"), exist_ok=True)
    for name, m in (("body", body), ("button", button), ("button_text", text), ("lid", p_lid)):
        write_stl(os.path.join(OUT, "stl", f"{name}.stl"), m)
    print("wrote subscribe_cube.3mf, stl/*.stl and previews to", OUT)


if __name__ == "__main__":
    main()
