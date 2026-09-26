#!/usr/bin/env python3
"""Build the "CLICK FOR 1M MONEY" toy push button as a 3MF file.

The button really presses and springs back. It is three flat-printed parts,
none of which need supports:

  button   red cap on a thin plate. Three curved arms join the cap to an outer
           ring. The arms are the spring: press the cap and they bend, let go
           and they pull it back up. The raised white text sits on top.
  housing  the shell with a hole for the cap. It is printed upside down (top
           face on the bed) and traps the button's ring from above.
  cover    the bottom. It holds the ring up from below, stops the cap after
           4 mm of travel and has a centre pin that keeps the cap moving
           straight. Six small crush ribs give a press fit into the housing.

Assembly: drop the button into the housing (cap through the hole), then press
the cover into the housing from below.

Needs: pip install manifold3d fonttools matplotlib numpy
Run:   python3 make_button.py   -> click-for-1m-money-button.3mf
"""

import math
import os
import zipfile

import matplotlib
import numpy as np
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from manifold3d import CrossSection, FillRule, JoinType, Manifold, OpType

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_3MF = os.path.join(HERE, "click-for-1m-money-button.3mf")

# ---- Text -------------------------------------------------------------------
TOP_TEXT = "CLICK FOR"   # curved along the top edge
CENTER_TEXT = "1M"       # big, in the middle
BOTTOM_TEXT = "MONEY"    # curved along the bottom edge
FONT = os.path.join(matplotlib.get_data_path(), "fonts/ttf/DejaVuSans-Bold.ttf")

# ---- Button (millimetres, Z=0 is the bottom of the flexure plate) ------------
HUB_R = 26.0          # cap radius (52 mm button)
CAP_H = 16.0          # cap height above the plate bottom
CAP_CHAMFER = 1.0
TEXT_H = 0.8          # raised text / rim height
ARM_T = 1.6           # spring arm thickness (Z) - thinner = softer press
ARM_W = 3.0           # spring arm width
ARM_R = 31.5          # radius of the curved part of each arm
ARM_SPAN = 100.0      # degrees each arm wraps around
RING_RI, RING_RO = 37.0, 40.0
RING_T = 3.0
GUIDE_HOLE_R = 3.3
GUIDE_HOLE_DEPTH = 11.0

# ---- Housing / cover (assembled coordinates, Z=0 is the table) ---------------
TRAVEL = 4.0          # how far the button presses down
FLANGE_T = 2.0        # cover flange under the housing wall
FLOOR_TOP = 3.5       # top of the cover floor
RING_Z = 12.0         # the button ring sits on the cover spacer at this height
AXIAL_PLAY = 0.1
TOP_T = 3.0           # housing top thickness
HOUSING_RI = RING_RO + 0.35
HOUSING_R_BOTTOM, HOUSING_R_TOP = 46.0, 44.0
HOUSING_CHAMFER = 1.5
CAP_HOLE_R = HUB_R + 0.5
PLUG_R = HOUSING_RI - 0.25     # cover plug, crush ribs take up the gap
RIB_R, RIB_CENTER_R = 0.5, 40.0
SPACER_RI = 38.0
POST_R = 8.0
PIN_R = 3.0
PIN_TOP = RING_Z + 6.0

UNDER_TOP_Z = RING_Z + RING_T + AXIAL_PLAY
HOUSING_TOP_Z = UNDER_TOP_Z + TOP_T
POST_TOP = RING_Z - TRAVEL

SEG = 192


def revolve(profile):
    """Revolve an (r, z) outline around the Z axis."""
    return Manifold.revolve(CrossSection([np.array(profile, float)], FillRule.NonZero), SEG)


def arc_points(r, a0, a1, step_deg=1.0):
    n = max(2, int(abs(a1 - a0) / step_deg) + 1)
    return [(r * math.cos(math.radians(a)), r * math.sin(math.radians(a)))
            for a in np.linspace(a0, a1, n)]


def radial_bar(r0, r1, angle_deg, width):
    bar = CrossSection.square([r1 - r0, width]).translate([r0, -width / 2])
    return bar.rotate(angle_deg)


# ---- Font -> 2D outlines -----------------------------------------------------
class PolyPen(BasePen):
    def __init__(self, glyph_set, steps=8):
        super().__init__(glyph_set)
        self.steps, self.contours, self.cur = steps, [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            self.cur.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]))

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            u = 1 - t
            self.cur.append(tuple(u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d
                                  for a, b, c, d in zip(p0, p1, p2, p3)))

    def _closePath(self):
        if len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


class Font:
    def __init__(self, path):
        self.tt = TTFont(path)
        self.glyphs = self.tt.getGlyphSet()
        self.cmap = self.tt.getBestCmap()
        self.upm = self.tt["head"].unitsPerEm
        self.cap_height = self.tt["glyf"]["H"].yMax / self.upm   # in em

    def glyph(self, ch, scale):
        """Outline contours (in mm, baseline at y=0) and advance width."""
        name = self.cmap[ord(ch)]
        pen = PolyPen(self.glyphs)
        self.glyphs[name].draw(pen)
        k = scale / self.upm
        contours = [np.array(c, float) * k for c in pen.contours]
        return contours, self.tt["hmtx"][name][0] * k

    def line(self, text, cap_h, tracking=0.03):
        """Text centred on the origin, cap height `cap_h` mm."""
        scale = cap_h / self.cap_height
        contours, x = [], 0.0
        for ch in text:
            cs, adv = self.glyph(ch, scale)
            contours += [c + [x, 0] for c in cs]
            x += adv + tracking * scale
        cs = CrossSection(contours, FillRule.NonZero)
        (x0, y0, x1, y1) = cs.bounds()
        return cs.translate([-(x0 + x1) / 2, -(y0 + y1) / 2])

    def arc(self, text, cap_h, baseline_r, top, tracking=0.06):
        """Text bent around a circle. Top text reads clockwise with letters
        pointing out; bottom text reads counter-clockwise, letters pointing in."""
        scale = cap_h / self.cap_height
        mid_r = baseline_r + cap_h / 2 if top else baseline_r - cap_h / 2
        glyphs = [self.glyph(ch, scale) for ch in text]
        advs = [adv + tracking * scale for _, adv in glyphs]
        total = sum(advs) - tracking * scale
        out, pos = [], 0.0
        for (contours, adv), step in zip(glyphs, advs):
            offset = math.degrees((pos + adv / 2 - total / 2) / mid_r)
            theta = 90.0 - offset if top else 270.0 + offset
            rot = theta - 90.0 if top else theta + 90.0
            if contours:
                g = CrossSection([c - [adv / 2, 0] for c in contours], FillRule.NonZero)
                bx, by = baseline_r * math.cos(math.radians(theta)), baseline_r * math.sin(math.radians(theta))
                out.append(g.rotate(rot).translate([bx, by]))
            pos += step
        span = math.degrees(total / mid_r)
        return CrossSection.batch_boolean(out, OpType.Add), span


# ---- Parts -------------------------------------------------------------------
def flexure_plate_2d():
    """Hub + three curved spring arms + outer ring, as one flat outline.

    The hub and ring here sit 0.3 mm inside the real cap and ring, so the
    rounded outline never lies on top of their walls when the solids are
    joined (near-coincident walls leave slivers in the mesh)."""
    hub = CrossSection.circle(HUB_R - 0.3, SEG)
    ring = CrossSection.circle(RING_RO - 0.3, SEG) - CrossSection.circle(RING_RI + 0.3, SEG)
    half_w_deg = math.degrees(ARM_W / 2 / ARM_R)
    arms = []
    for k in range(3):
        a0 = k * 120.0
        a1 = a0 + ARM_SPAN
        band = CrossSection([np.array(arc_points(ARM_R + ARM_W / 2, a0, a1) +
                                      arc_points(ARM_R - ARM_W / 2, a1, a0))], FillRule.NonZero)
        spoke_in = radial_bar(HUB_R - 1.0, ARM_R, a0 + half_w_deg, ARM_W)
        spoke_out = radial_bar(ARM_R, RING_RI + 1.0, a1 - half_w_deg, ARM_W)
        arm = (band + spoke_in + spoke_out).offset(-0.8, JoinType.Round, circular_segments=48) \
                                           .offset(0.8, JoinType.Round, circular_segments=48)
        arms.append(arm)
    plate = hub + ring
    for a in arms:
        plate = plate + a
    # fillet the inside corners where the arms meet the hub and the ring
    return plate.offset(1.0, JoinType.Round, circular_segments=64) \
                .offset(-1.0, JoinType.Round, circular_segments=64)


def build_button(font):
    plate = Manifold.extrude(flexure_plate_2d(), ARM_T)
    ring = Manifold.extrude(CrossSection.circle(RING_RO, SEG) - CrossSection.circle(RING_RI, SEG), RING_T)
    cap = revolve([(0, 0), (HUB_R, 0), (HUB_R, CAP_H - CAP_CHAMFER),
                   (HUB_R - CAP_CHAMFER, CAP_H), (0, CAP_H)])
    hole = revolve([(0, -1), (GUIDE_HOLE_R + 0.6 + 1, -1), (GUIDE_HOLE_R, 0.6),
                    (GUIDE_HOLE_R, GUIDE_HOLE_DEPTH), (0, GUIDE_HOLE_DEPTH + GUIDE_HOLE_R)])
    body = (plate + ring + cap) - hole

    top_r = HUB_R - CAP_CHAMFER          # flat top radius (25)
    rim = CrossSection.circle(top_r - 0.6, SEG) - CrossSection.circle(top_r - 1.6, SEG)
    arc_cap_h = 4.6
    outer_text_r = top_r - 2.8           # letters stay inside this radius
    top, top_span = font.arc(TOP_TEXT, arc_cap_h, outer_text_r - arc_cap_h, top=True)
    bottom, bottom_span = font.arc(BOTTOM_TEXT, arc_cap_h, outer_text_r, top=False)
    centre = font.line(CENTER_TEXT, 12.0)
    inner_free_r = outer_text_r - arc_cap_h - 1.5
    x0, y0, x1, y1 = centre.bounds()
    corner = math.hypot(max(abs(x0), x1), max(abs(y0), y1))
    if corner > inner_free_r:
        centre = centre.scale([inner_free_r / corner] * 2)
    assert top_span < 170 and bottom_span < 170, (top_span, bottom_span)
    text2d = rim + top + bottom + centre
    text = Manifold.extrude(text2d, TEXT_H).translate([0, 0, CAP_H])
    return body, text, (top_span, bottom_span)


def build_housing():
    """Assembled position (upright)."""
    zb, zu, zt = FLANGE_T, UNDER_TOP_Z, HOUSING_TOP_Z
    c = HOUSING_CHAMFER
    r_top_edge = HOUSING_R_BOTTOM + (HOUSING_R_TOP - HOUSING_R_BOTTOM) * ((zt - c) - zb) / (zt - zb)
    return revolve([
        (HOUSING_RI + 0.6, zb), (HOUSING_R_BOTTOM, zb),
        (r_top_edge, zt - c), (r_top_edge - c, zt),
        (CAP_HOLE_R + 0.6, zt), (CAP_HOLE_R, zt - 0.6),
        (CAP_HOLE_R, zu), (HOUSING_RI, zu), (HOUSING_RI, zb + 0.6),
    ])


def build_cover():
    """Assembled position."""
    body = revolve([
        (0, 0), (HOUSING_R_BOTTOM - 0.5, 0), (HOUSING_R_BOTTOM, 0.5), (HOUSING_R_BOTTOM, FLANGE_T),
        (PLUG_R, FLANGE_T), (PLUG_R, RING_Z - 0.5), (PLUG_R - 0.5, RING_Z),
        (SPACER_RI, RING_Z), (SPACER_RI, FLOOR_TOP), (POST_R, FLOOR_TOP),
        (POST_R, POST_TOP), (PIN_R, POST_TOP), (PIN_R, PIN_TOP - 0.8), (PIN_R - 0.8, PIN_TOP), (0, PIN_TOP),
    ])
    rib_top = RING_Z - 2.0
    rib = Manifold.hull(
        Manifold.cylinder(rib_top - 1.2 - FLANGE_T, RIB_R, RIB_R, 24).translate([RIB_CENTER_R, 0, FLANGE_T])
        + Manifold.cylinder(0.01, 0.05, 0.05, 8).translate([RIB_CENTER_R - RIB_R + 0.1, 0, rib_top]))
    for k in range(6):
        body = body + rib.rotate([0, 0, 30 + k * 60])
    return body


# ---- 3MF ---------------------------------------------------------------------
def mesh_xml(m):
    mesh = m.to_mesh()
    v = np.asarray(mesh.vert_properties)[:, :3]
    t = np.asarray(mesh.tri_verts)
    verts = "\n".join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in v)
    tris = "\n".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in t)
    return f"<mesh><vertices>\n{verts}\n</vertices><triangles>\n{tris}\n</triangles></mesh>"


def write_3mf(path, parts, build):
    """parts: list of (id, name, manifold, material_index); build: list of
    (object id, x, y) and component objects are given as (id, name, [ids])."""
    materials = [("Red", "#D7261EFF"), ("White", "#F5F5F5FF"), ("Black", "#232323FF")]
    res = ['<basematerials id="1">'] + [
        f'<base name="{n}" displaycolor="{c}"/>' for n, c in materials] + ["</basematerials>"]
    for obj in parts:
        if isinstance(obj[2], list):
            oid, name, children = obj
            comps = "".join(f'<component objectid="{c}"/>' for c in children)
            res.append(f'<object id="{oid}" name="{name}" type="model"><components>{comps}</components></object>')
        else:
            oid, name, m, mat = obj
            res.append(f'<object id="{oid}" name="{name}" type="model" pid="1" pindex="{mat}">'
                       f"{mesh_xml(m)}</object>")
    items = "".join(f'<item objectid="{oid}" transform="1 0 0 0 1 0 0 0 1 {x:.3f} {y:.3f} 0"/>'
                    for oid, x, y in build)
    model = f"""<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">CLICK FOR 1M MONEY - toy push button</metadata>
<metadata name="Description">Working spring push button, 3 parts, prints without supports. Print the housing upside down as placed. Drop the button into the housing, press the cover in from below.</metadata>
<metadata name="Application">make_button.py</metadata>
<resources>
{chr(10).join(res)}
</resources>
<build>{items}</build>
</model>
"""
    content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
"""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)


def print_orientation(m, flip=False):
    """Centre on XY origin and drop onto the bed."""
    if flip:
        m = m.rotate([180, 0, 0])
    x0, y0, z0, x1, y1, z1 = m.bounding_box()
    return m.translate([-(x0 + x1) / 2, -(y0 + y1) / 2, -z0])


def build_all():
    font = Font(FONT)
    body, text, spans = build_button(font)
    housing = build_housing()
    cover = build_cover()
    return {"body": body, "text": text, "housing": housing, "cover": cover, "spans": spans}


def main():
    p = build_all()
    housing_print = print_orientation(p["housing"], flip=True)
    cover_print = print_orientation(p["cover"])
    # button already sits on Z=0 and is centred on the origin
    bed_cx, bed_cy = 110.0, 110.0
    write_3mf(OUT_3MF, [
        (2, "Housing (printed upside down)", housing_print, 2),
        (3, "Cover", cover_print, 2),
        (4, "Button cap and spring", p["body"], 0),
        (5, "Button text", p["text"], 1),
        (6, "Button", [4, 5]),
    ], [
        (2, bed_cx - 50, bed_cy + 48),
        (3, bed_cx + 50, bed_cy + 48),
        (6, bed_cx, bed_cy - 55),
    ])
    print(f"wrote {OUT_3MF} ({os.path.getsize(OUT_3MF) / 1e6:.1f} MB); "
          f"text arcs span {p['spans'][0]:.0f} and {p['spans'][1]:.0f} degrees")


if __name__ == "__main__":
    main()
