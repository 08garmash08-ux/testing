#!/usr/bin/env python3
"""Build chatgpt_cup.3mf from chatgpt_cup.scad.

Renders the cup body and the raised logo as two separate parts with
OpenSCAD, then packs them into one 3MF object with two named parts, the
cup on filament 1 and the logo on filament 2, so a two-colour printer uses
exactly two filaments. Needs only OpenSCAD and the Python standard library.

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

# (OpenSCAD part, name shown in the slicer, filament). Each part is 3MF
# object 1, 2, ... and the assembly that holds them comes after.
PARTS = [
    ("body", "Cup", 1),
    ("logo", "ChatGPT logo", 2),
]
ASSEMBLY_ID = len(PARTS) + 1

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
    """Each part as its own mesh object, grouped by one assembly object.

    Bambu Studio and OrcaSlicer load each <component> as a part of one
    object; PrusaSlicer loads them as separate objects and offers to merge
    them into one. No colours are stored on the triangles: Bambu Studio
    turns those into colour painting, which prints the inside of the cup
    in a third filament.
    """
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<model unit="millimeter" xml:lang="en-US" '
        'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">',
        '<metadata name="Title">ChatGPT cup</metadata>',
        "<resources>",
    ]
    for i, ((_, name, _), (vertices, triangles)) in enumerate(zip(PARTS, meshes), 1):
        out.append('<object id="%d" name="%s" type="model"><mesh><vertices>' % (i, name))
        out += ['<vertex x="%s" y="%s" z="%s"/>' % v for v in vertices]
        out.append("</vertices><triangles>")
        out += ['<triangle v1="%d" v2="%d" v3="%d"/>' % tuple(t) for t in triangles]
        out.append("</triangles></mesh></object>")
    out.append('<object id="%d" name="ChatGPT cup" type="model"><components>' % ASSEMBLY_ID)
    out += ['<component objectid="%d"/>' % i for i in range(1, len(PARTS) + 1)]
    out.append("</components></object>")
    out.append("</resources>")
    out.append('<build><item objectid="%d"/></build>' % ASSEMBLY_ID)
    out.append("</model>")
    return "\n".join(out)


def part_settings():
    """Bambu Studio / OrcaSlicer part list: names and filaments.

    They read Metadata/model_settings.config from any 3MF and match each
    <part id> to the component object with that id.
    """
    out = ['<?xml version="1.0" encoding="UTF-8"?>', "<config>",
           '  <object id="%d">' % ASSEMBLY_ID,
           '    <metadata key="name" value="ChatGPT cup"/>',
           '    <metadata key="extruder" value="1"/>']
    for i, (_, name, filament) in enumerate(PARTS, 1):
        out.append('    <part id="%d" subtype="normal_part">' % i)
        out.append('      <metadata key="name" value="%s"/>' % name)
        out.append('      <metadata key="extruder" value="%d"/>' % filament)
        out.append("    </part>")
    out += ["  </object>", "</config>"]
    return "\n".join(out)


def main():
    overrides = sys.argv[1:]
    with tempfile.TemporaryDirectory() as workdir:
        meshes = [read_stl(render(part, overrides, workdir)) for part, _, _ in PARTS]
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("3D/3dmodel.model", model_xml(meshes))
        z.writestr("Metadata/model_settings.config", part_settings())
    for (_, name, _), (v, t) in zip(PARTS, meshes):
        print("  %-13s %6d vertices %6d triangles" % (name, len(v), len(t)))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
