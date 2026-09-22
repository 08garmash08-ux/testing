#!/usr/bin/env python3
"""Build scratch-cat-wave.sb3 — the official Scratch Cat, waving.

The cat, its two costumes, the Meow sound, the blank backdrop and the pop sound are
the official Scratch assets, taken from the Scratch editor's own default project
(scratchfoundation/scratch-gui, src/lib/default-project). They are in assets/ under
their Scratch asset names, which are the md5 of the file.

The two wave costumes are that same official artwork with the cat's own arm path
rotated about its shoulder — the paint-editor move, done in the file.

Run:  python3 scratch/make-sb3.py
"""

import hashlib
import json
import pathlib
import re
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE / "assets"
OUT = HERE / "scratch-cat-wave.sb3"

COSTUME1 = "bcf454acf82e4504149f7ffe07081dbc.svg"   # official costume1
COSTUME2 = "0fb9be3e8397c983338cb71dc84d0b25.svg"   # official costume2
BACKDROP = "cd21514d0531fdffb22204e0ec5ed84a.svg"   # official blank backdrop
MEOW = "83c36d806dc92327b9e7049a565c6bff.wav"       # official Meow
POP = "83a9787d4cb6f3b7632b4ddfebf74367.wav"        # official pop

SHOULDER = (51.5, 61.0)   # where the cat's arm meets its body, in costume1's own units
WAVE_POSES = {            # costume name -> (degrees about the shoulder, dx, dy)
    "wave-down": (-28, 4, -1),
    "wave-up": (-50, 4, -1),
}


def pose_arm(svg, angle, dx, dy):
    """Re-pose the cat's near arm: lift the official <path id="arm"> out of the
    stack, hinge it about the shoulder, and draw it back on top, the way a raised
    arm sits in front of the body."""
    arms = list(re.finditer(r'<path[^>]*id="arm"[^>]*/>', svg))
    if not arms:
        raise SystemExit("no arm path in the costume — did the official SVG change?")
    arm = arms[0].group(0)
    without_arm = svg[:arms[0].start()] + svg[arms[0].end():]
    posed = (f'<g transform="translate({dx},{dy}) '
             f'rotate({angle},{SHOULDER[0]},{SHOULDER[1]})">{arm}</g>')
    return without_arm.replace("</svg>", posed + "</svg>")


def costume(md5ext, name, cx, cy):
    return {
        "assetId": md5ext.split(".")[0],
        "name": name,
        "bitmapResolution": 1,
        "md5ext": md5ext,
        "dataFormat": md5ext.split(".")[1],
        "rotationCenterX": cx,
        "rotationCenterY": cy,
    }


def sound(md5ext, name, rate, sample_count):
    return {
        "assetId": md5ext.split(".")[0],
        "name": name,
        "dataFormat": "wav",
        "format": "",
        "rate": rate,
        "sampleCount": sample_count,
        "md5ext": md5ext,
    }


def build_blocks(wave_costumes):
    """when flag clicked → say Hi! → forever { swap costume, wait } , plus a meow on click."""
    down, up = wave_costumes

    def costume_menu(block_id, parent, value):
        return {
            "opcode": "looks_costume", "next": None, "parent": parent,
            "inputs": {}, "fields": {"COSTUME": [value, None]},
            "shadow": True, "topLevel": False,
        }

    def switch(block_id, parent, nxt, value):
        menu = block_id + "-menu"
        return {
            block_id: {
                "opcode": "looks_switchcostumeto", "next": nxt, "parent": parent,
                "inputs": {"COSTUME": [1, menu]}, "fields": {},
                "shadow": False, "topLevel": False,
            },
            menu: costume_menu(menu, block_id, value),
        }

    def wait(block_id, parent, nxt, secs):
        return {block_id: {
            "opcode": "control_wait", "next": nxt, "parent": parent,
            "inputs": {"DURATION": [1, [5, secs]]}, "fields": {},
            "shadow": False, "topLevel": False,
        }}

    blocks = {
        "hat": {
            "opcode": "event_whenflagclicked", "next": "start-pose", "parent": None,
            "inputs": {}, "fields": {}, "shadow": False, "topLevel": True,
            "x": 48, "y": 48, "comment": "note",
        },
        "say": {
            "opcode": "looks_sayforsecs", "next": "loop", "parent": "start-pose",
            "inputs": {"MESSAGE": [1, [10, "Hi!"]], "SECS": [1, [4, "1"]]},
            "fields": {}, "shadow": False, "topLevel": False,
        },
        "loop": {
            "opcode": "control_forever", "next": None, "parent": "say",
            "inputs": {"SUBSTACK": [2, "up"]}, "fields": {},
            "shadow": False, "topLevel": False,
        },
        "click-hat": {
            "opcode": "event_whenthisspriteclicked", "next": "meow", "parent": None,
            "inputs": {}, "fields": {}, "shadow": False, "topLevel": True,
            "x": 48, "y": 360,
        },
        "meow": {
            "opcode": "sound_play", "next": None, "parent": "click-hat",
            "inputs": {"SOUND_MENU": [1, "meow-menu"]}, "fields": {},
            "shadow": False, "topLevel": False,
        },
        "meow-menu": {
            "opcode": "sound_sounds_menu", "next": None, "parent": "meow",
            "inputs": {}, "fields": {"SOUND_MENU": ["Meow", None]},
            "shadow": True, "topLevel": False,
        },
    }
    blocks.update(switch("start-pose", "hat", "say", down))
    blocks.update(switch("up", "loop", "wait-up", up))          # first block inside the loop
    blocks.update(wait("wait-up", "up", "down", "0.2"))
    blocks.update(switch("down", "wait-up", "wait-down", down))
    blocks.update(wait("wait-down", "down", None, "0.2"))
    return blocks


def main():
    cat_svg = (ASSETS / COSTUME1).read_text()
    files = {name: (ASSETS / name).read_bytes()
             for name in (COSTUME1, COSTUME2, BACKDROP, MEOW, POP)}

    wave_costumes = []
    for name, (angle, dx, dy) in WAVE_POSES.items():
        svg = pose_arm(cat_svg, angle, dx, dy).encode()
        md5ext = hashlib.md5(svg).hexdigest() + ".svg"   # Scratch names assets by md5
        files[md5ext] = svg
        # same canvas as costume1, so costume1's rotation centre still holds and the
        # cat does not jump when the costume changes
        wave_costumes.append(costume(md5ext, name, 48, 50))

    project = {
        "targets": [
            {
                "isStage": True, "name": "Stage",
                "variables": {}, "lists": {}, "broadcasts": {}, "blocks": {}, "comments": {},
                "currentCostume": 0,
                "costumes": [costume(BACKDROP, "backdrop1", 240, 180)],
                "sounds": [sound(POP, "pop", 11025, 258)],
                "volume": 100, "layerOrder": 0,
                "tempo": 60, "videoTransparency": 50, "videoState": "off",
                "textToSpeechLanguage": None,
            },
            {
                "isStage": False, "name": "Scratch Cat",
                "variables": {}, "lists": {}, "broadcasts": {},
                "blocks": build_blocks([c["name"] for c in wave_costumes]),
                "comments": {
                    "note": {
                        "blockId": "hat", "x": 420, "y": 48, "width": 270, "height": 190,
                        "minimized": False,
                        "text": ("The wave is two costumes and a wait.\n\n"
                                 "wave-down and wave-up are costume1 with the cat's arm "
                                 "turned about its shoulder. Swapping them every 0.2 "
                                 "seconds is the whole animation.\n\n"
                                 "Change the waits to wave faster or slower.\n"
                                 "Click the cat to hear it meow."),
                    }
                },
                "currentCostume": 2,
                "costumes": [
                    costume(COSTUME1, "costume1", 48, 50),
                    costume(COSTUME2, "costume2", 46, 53),
                    *wave_costumes,
                ],
                "sounds": [sound(MEOW, "Meow", 22050, 18688)],
                "volume": 100, "layerOrder": 1,
                "visible": True, "x": 0, "y": 0, "size": 100, "direction": 90,
                "draggable": False, "rotationStyle": "all around",
            },
        ],
        "monitors": [],
        "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": ""},
    }

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as sb3:
        sb3.writestr("project.json", json.dumps(project))
        for name, data in sorted(files.items()):
            sb3.writestr(name, data)
    print(f"{OUT.relative_to(OUT.parents[1])}  ({OUT.stat().st_size:,} bytes)")
    for c in wave_costumes:
        print(f"  {c['name']:10} {c['md5ext']}")


if __name__ == "__main__":
    main()
