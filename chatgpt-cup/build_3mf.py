#!/usr/bin/env python3
"""Build chatgpt_cup.3mf from chatgpt_cup.scad.

Renders the cup body and the raised logo as two separate parts with
OpenSCAD, then packs them into one 3MF object with two named parts
(navy cup, white logo) so a slicer can print the logo in a second colour.
Needs only OpenSCAD and the Python standard library.

    python3 build_3mf.py                  # writes chatgpt_cup.3mf
    python3 build_3mf.py -D 'label=""'    # extra -D overrides go to OpenSCAD
"""

import os
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCAD = os.path.join(HERE, "chatgpt_cup.scad")
OUT = os.path.join(HERE, "chatgpt_cup.3mf")

OBJECT_ID = 2

# (OpenSCAD part, name shown in the slicer, colour)
PARTS = [
    ("body", "Cup", "#1E303DFF"),
    ("logo", "ChatGPT logo", "#FFFFFFFF"),
]

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
"""

RELS = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
"""


def render(part, overrides, workdir):
    """Render one part to an ASCII STL and return its path."""
    stl = os.path.join(workdir, part + ".stl")
    cmd = ["openscad", "-o", stl, "-D", 'part="%s"' % part] + overrides + [SCAD]
    print("rendering", part, "...", flush=True)
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return stl


def read_stl(path):
    """Read an ASCII STL into shared vertices and triangles."""
    index, vertices, triangles, facet = {}, [], [], []
    with open(path) as f:
        for line in f:
            words = line.split()
            if not words or words[0] != "vertex":
                continue
            key = tuple(words[1:4])
            if key not in index:
                index[key] = len(vertices)
                vertices.append(key)
            facet.append(index[key])
            if len(facet) == 3:
                if len(set(facet)) == 3:
                    triangles.append(facet)
                facet = []
    if not triangles:
        sys.exit("%s is empty or not an ASCII STL" % path)
    return vertices, triangles


def model_xml(meshes):
    """One object holding every part's triangles.

    Slicers read the parts from one object reliably; objects grouped with
    3MF <components> get split apart by PrusaSlicer, which then drops the
    logo onto the bed. Each part keeps its own vertices so the parts stay
    separate closed shells, and each triangle carries its part's colour.
    """
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<model unit="millimeter" xml:lang="en-US" '
        'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
        'xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">',
        '<metadata name="slic3rpe:Version3mf">1</metadata>',
        '<metadata name="Title">ChatGPT cup</metadata>',
        "<resources>",
        '<basematerials id="1">',
    ]
    out += ['<base name="%s" displaycolor="%s"/>' % (name, color) for _, name, color in PARTS]
    out.append("</basematerials>")
    out.append('<object id="%d" name="ChatGPT cup" type="model" pid="1" pindex="0">' % OBJECT_ID)
    out.append("<mesh><vertices>")
    for vertices, _ in meshes:
        out += ['<vertex x="%s" y="%s" z="%s"/>' % v for v in vertices]
    out.append("</vertices><triangles>")
    offset = 0
    for i, (vertices, triangles) in enumerate(meshes):
        out += ['<triangle v1="%d" v2="%d" v3="%d" pid="1" p1="%d"/>'
                % (a + offset, b + offset, c + offset, i) for a, b, c in triangles]
        offset += len(vertices)
    out.append("</triangles></mesh></object>")
    out.append("</resources>")
    out.append('<build><item objectid="%d"/></build>' % OBJECT_ID)
    out.append("</model>")
    return "\n".join(out)


def slicer_config(meshes):
    """PrusaSlicer's part list: triangle ranges, names and extruders.

    PrusaSlicer, and slicers that read its projects, load the object as the
    cup with the logo as a second part set to extruder 2.
    """
    out = ['<?xml version="1.0" encoding="UTF-8"?>', "<config>",
           '<object id="%d" instances_count="1">' % OBJECT_ID,
           '<metadata type="object" key="name" value="ChatGPT cup"/>']
    first = 0
    for extruder, ((_, name, _), (_, triangles)) in enumerate(zip(PARTS, meshes), 1):
        out.append('<volume firstid="%d" lastid="%d">' % (first, first + len(triangles) - 1))
        out.append('<metadata type="volume" key="name" value="%s"/>' % name)
        out.append('<metadata type="volume" key="volume_type" value="ModelPart"/>')
        out.append('<metadata type="volume" key="extruder" value="%d"/>' % extruder)
        out.append("</volume>")
        first += len(triangles)
    out += ["</object>", "</config>"]
    return "\n".join(out)


def main():
    overrides = sys.argv[1:]
    with tempfile.TemporaryDirectory() as workdir:
        meshes = [read_stl(render(part, overrides, workdir)) for part, _, _ in PARTS]
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("3D/3dmodel.model", model_xml(meshes))
        z.writestr("Metadata/Slic3r_PE_model.config", slicer_config(meshes))
    for (_, name, _), (v, t) in zip(PARTS, meshes):
        print("  %-13s %6d vertices %6d triangles" % (name, len(v), len(t)))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
