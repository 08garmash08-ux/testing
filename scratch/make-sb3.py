#!/usr/bin/env python3
"""Build scratch-cat-wave.sb3 — the official Scratch Cat, waving, with a party on top.

The cat is official: costume1, costume2, the Meow sound, the blank backdrop and the
pop sound are the Scratch editor's own asset files (assets/, named by their md5, the
way Scratch names assets), taken from the editor's default project. The wave and
cheer costumes are that same artwork with the cat's own arm paths turned about their
shoulders (poses.py). The sparkle and the backdrops are drawn here (art.py).

Run:  python3 scratch/make-sb3.py
"""

import hashlib
import json
import pathlib
import sys
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import art
import poses
from blocks import (Block as B, Lit, Menu, Reporter as R, Target, angle, colour,
                    num, pos, procedure, text, whole)

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE / "assets"
OUT = HERE / "scratch-cat-wave.sb3"

COSTUME1 = "bcf454acf82e4504149f7ffe07081dbc.svg"
COSTUME2 = "0fb9be3e8397c983338cb71dc84d0b25.svg"
BACKDROP1 = "cd21514d0531fdffb22204e0ec5ed84a.svg"
MEOW = "83c36d806dc92327b9e7049a565c6bff.wav"
POP = "83a9787d4cb6f3b7632b4ddfebf74367.wav"

VARS = {"waves": "var-waves", "party": "var-party"}
CASTS = {"party on": "bc-party-on", "party off": "bc-party-off"}

files = {}          # name in the zip -> bytes


# ---------------------------------------------------------------- assets

def official(name):
    files[name] = (ASSETS / name).read_bytes()
    return name


def generated(svg):
    """Add an SVG under the name Scratch gives assets: the md5 of the file."""
    data = svg.encode()
    name = hashlib.md5(data).hexdigest() + ".svg"
    files[name] = data
    return name


def costume(md5ext, name, cx, cy):
    return {"assetId": md5ext.split(".")[0], "name": name, "bitmapResolution": 1,
            "md5ext": md5ext, "dataFormat": md5ext.split(".")[1],
            "rotationCenterX": cx, "rotationCenterY": cy}


def sound(md5ext, name, rate, sample_count):
    return {"assetId": md5ext.split(".")[0], "name": name, "dataFormat": "wav",
            "format": "", "rate": rate, "sampleCount": sample_count, "md5ext": md5ext}


# ------------------------------------------------- the blocks, in Scratch's words

def hat(opcode, **fields):
    return B(opcode, fields={k: [v, None] for k, v in fields.items()})


def wait(secs): return B("control_wait", {"DURATION": _slot(secs, pos)})
def forever(body): return B("control_forever", substacks=(body,))
def repeat(times, body): return B("control_repeat", {"TIMES": _slot(times, whole)}, substacks=(body,))
def if_(cond, body): return B("control_if", {"CONDITION": cond}, substacks=(body,))
def if_else(cond, a, b): return B("control_if_else", {"CONDITION": cond}, substacks=(a, b))
def stop_all(): return B("control_stop", fields={"STOP_OPTION": ["all", None]},
                         mutation={"tagName": "mutation", "children": [], "hasnext": "false"})

def say(msg): return B("looks_say", {"MESSAGE": _slot(msg, text)})
def say_for(msg, secs): return B("looks_sayforsecs", {"MESSAGE": _slot(msg, text), "SECS": _slot(secs, num)})
def switch_costume(name): return B("looks_switchcostumeto", {"COSTUME": Menu("looks_costume", "COSTUME", name)})
def next_costume(): return B("looks_nextcostume")
def switch_backdrop(name): return B("looks_switchbackdropto", {"BACKDROP": Menu("looks_backdrops", "BACKDROP", name)})
def next_backdrop(): return B("looks_nextbackdrop")
def set_size(n): return B("looks_setsizeto", {"SIZE": _slot(n, num)})
def change_size(n): return B("looks_changesizeby", {"CHANGE": _slot(n, num)})
def change_effect(effect, n): return B("looks_changeeffectby", {"CHANGE": _slot(n, num)},
                                       {"EFFECT": [effect, None]})
def set_effect(effect, n): return B("looks_seteffectto", {"VALUE": _slot(n, num)},
                                    {"EFFECT": [effect, None]})
def clear_effects(): return B("looks_cleargraphiceffects")
def show(): return B("looks_show")
def hide(): return B("looks_hide")
def go_front(): return B("looks_gotofrontback", fields={"FRONT_BACK": ["front", None]})

def go_to_xy(x, y): return B("motion_gotoxy", {"X": _slot(x, num), "Y": _slot(y, num)})
def goto_sprite(name): return B("motion_goto", {"TO": Menu("motion_goto_menu", "TO", name)})
def change_x(v): return B("motion_changexby", {"DX": _slot(v, num)})
def change_y(v): return B("motion_changeyby", {"DY": _slot(v, num)})
def move(steps): return B("motion_movesteps", {"STEPS": _slot(steps, num)})
def turn_cw(deg): return B("motion_turnright", {"DEGREES": _slot(deg, num)})
def point(direction): return B("motion_pointindirection", {"DIRECTION": _slot(direction, angle)})
def rotation_style(style): return B("motion_setrotationstyle", fields={"STYLE": [style, None]})

def play(name): return B("sound_play", {"SOUND_MENU": Menu("sound_sounds_menu", "SOUND_MENU", name)})
def set_var(name, value): return B("data_setvariableto", {"VALUE": _slot(value, text)},
                                   {"VARIABLE": [name, VARS[name]]})
def change_var(name, value): return B("data_changevariableby", {"VALUE": _slot(value, num)},
                                      {"VARIABLE": [name, VARS[name]]})
def broadcast(name): return B("event_broadcast", {"BROADCAST_INPUT": Lit(11, name, CASTS[name])})
def when_received(name): return B("event_whenbroadcastreceived",
                                  fields={"BROADCAST_OPTION": [name, CASTS[name]]})
def create_clone(name): return B("control_create_clone_of",
                                 {"CLONE_OPTION": Menu("control_create_clone_of_menu", "CLONE_OPTION", name)})
def delete_clone(): return B("control_delete_this_clone")

def pen_clear(): return B("pen_clear")
def pen_down(): return B("pen_penDown")
def pen_up(): return B("pen_penUp")
def pen_size(n): return B("pen_setPenSizeTo", {"SIZE": _slot(n, num)})
def pen_set_colour(hex_): return B("pen_setPenColorToColor", {"COLOR": colour(hex_)})
def pen_shift_hue(n): return B("pen_changePenColorParamBy",
                               {"COLOR_PARAM": Menu("pen_menu_colorParam", "COLOR_PARAM", "color"),
                                "VALUE": _slot(n, num)})

def var(name): return R("data_variable", fields={"VARIABLE": [name, VARS[name]]}, over=text(""))
def random(a, b): return R("operator_random", {"FROM": _slot(a, num), "TO": _slot(b, num)}, over=num(""))
def equals(a, b): return R("operator_equals", {"OPERAND1": _slot(a, text), "OPERAND2": _slot(b, text)})
def minus(a, b): return R("operator_subtract", {"NUM1": _slot(a, num), "NUM2": _slot(b, num)}, over=num(""))
def divide(a, b): return R("operator_divide", {"NUM1": _slot(a, num), "NUM2": _slot(b, num)}, over=num(""))
def x_pos(): return R("motion_xposition", over=num(""))
def y_pos(): return R("motion_yposition", over=num(""))
def mouse_x(): return R("sensing_mousex", over=num(""))
def mouse_y(): return R("sensing_mousey", over=num(""))
def mouse_down(): return R("sensing_mousedown")


def _slot(value, kind):
    """A slot takes either a literal — wrapped in the type Scratch uses there — or
    a reporter block dropped into it."""
    return value if isinstance(value, (R, Lit, Menu)) else kind(value)


# ---------------------------------------------------------------- the project

def build():
    cat_svg = (ASSETS / COSTUME1).read_text()
    for name in (COSTUME1, COSTUME2, BACKDROP1, MEOW, POP):
        official(name)

    posed = {name: generated(svg) for name, svg in poses.all_poses(cat_svg).items()}
    sparkle_costume = generated(art.sparkle())
    backdrops = {name: generated(draw()) for name, draw in art.BACKDROPS.items()}

    stage, cat, spark = Target("stage"), Target("cat"), Target("spark")

    # -- stage: the scenery reacts to the party ------------------------------
    stage.script(48, 48, [
        hat("event_whenflagclicked"),
        switch_backdrop("night"),
        clear_effects(),
    ])
    stage.script(48, 200, [
        when_received("party on"),
        switch_backdrop("rave"),
        forever([change_effect("color", 9), wait(0.08)]),
    ])
    stage.script(48, 380, [
        when_received("party off"),
        clear_effects(),
        switch_backdrop("night"),
    ])
    stage.script(320, 380, [
        hat("event_whenkeypressed", KEY_OPTION="b"),
        next_backdrop(),
    ])

    # -- cat: the wave itself, as a My Block ---------------------------------
    def wave_body(speed):
        frames = ["wave-1", "wave-2", "wave-3", "wave-4", "wave-5", "wave-4", "wave-3", "wave-2"]
        body = []
        for name in frames:
            body += [switch_costume(name), wait(speed)]
        return body + [change_var("waves", 1), create_clone("Sparkle")]

    wave = procedure(cat, 640, 48, "wave, one frame every %s seconds", ["speed"], wave_body)

    def dance_body(speed):
        return [
            switch_costume("cheer"), change_y(16), change_effect("color", 25), wait(speed),
            switch_costume("costume2"), change_y(-16), change_effect("color", 25), wait(speed),
            create_clone("Sparkle"), create_clone("Sparkle"),
        ]

    dance = procedure(cat, 640, 400, "dance, one frame every %s seconds", ["speed"], dance_body)

    cat.script(48, 48, [
        hat("event_whenflagclicked"),
        pen_clear(), pen_up(), pen_size(9), pen_set_colour("#ff3d9a"),
        set_var("waves", 0), set_var("party", 0),
        go_to_xy(0, -30), point(90), rotation_style("all around"),
        set_size(140), clear_effects(), show(), go_front(),
        say_for("Hi!", 1),
        say_for("Click me. Space jumps, P starts a party, drag me to draw.", 3),
        forever([
            if_else(equals(var("party"), 0),
                    [wave(text(0.05))],
                    [dance(text(0.12))]),
        ]),
    ], comment="how")

    # drag the cat around with the mouse, drawing a rainbow behind it
    cat.script(48, 560, [
        hat("event_whenflagclicked"),
        forever([
            if_else(mouse_down(),
                    [pen_down(), pen_shift_hue(4),
                     change_x(divide(minus(mouse_x(), x_pos()), 6)),
                     change_y(divide(minus(mouse_y(), y_pos()), 6))],
                    [pen_up()]),
        ]),
    ])

    cat.script(360, 48, [
        hat("event_whenthisspriteclicked"),
        play("Meow"),
        change_var("waves", 1),
        repeat(6, [change_size(6)]),
        repeat(6, [change_size(-6)]),
        repeat(14, [create_clone("Sparkle")]),
    ])

    cat.script(360, 260, [
        hat("event_whenkeypressed", KEY_OPTION="space"),
        play("pop"),
        repeat(12, [change_y(11), turn_cw(30), create_clone("Sparkle")]),
        repeat(12, [change_y(-11), turn_cw(30)]),
        point(90),
    ])

    cat.script(360, 470, [
        hat("event_whenkeypressed", KEY_OPTION="p"),
        set_var("party", 1),
        broadcast("party on"),
        wait(8),
        set_var("party", 0),
        broadcast("party off"),
        clear_effects(),
    ])

    cat.script(360, 660, [
        hat("event_whenkeypressed", KEY_OPTION="c"),
        pen_clear(),
    ])

    # -- sparkle: one clone per wave, thrown off the paw ---------------------
    spark.script(48, 48, [hat("event_whenflagclicked"), hide()])
    spark.script(48, 160, [
        hat("control_start_as_clone"),
        goto_sprite("Scratch Cat"),
        change_x(random(10, 48)), change_y(random(-10, 40)),
        point(random(-170, 170)),
        set_size(random(45, 110)),
        set_effect("ghost", 10),
        set_effect("color", random(0, 199)),
        show(),
        repeat(18, [move(6), turn_cw(11), change_size(-3), change_effect("ghost", 5)]),
        delete_clone(),
    ])

    note = ("The wave is costumes and a wait.\n\n"
            "wave-1 to wave-5 are the official costume1 with the cat's own arm turned "
            "about its shoulder. The My Block below flips through them and back, which "
            "is the whole animation — change the number in it to wave faster.\n\n"
            "Space jumps. P starts a party. B changes the backdrop. C wipes the pen. "
            "Hold the mouse down to drag the cat around and draw with it.")

    project = {
        "targets": [
            {
                "isStage": True, "name": "Stage",
                "variables": {vid: [name, 0] for name, vid in VARS.items()},
                "lists": {}, "broadcasts": {bid: name for name, bid in CASTS.items()},
                "blocks": stage.blocks, "comments": {},
                "currentCostume": 1,
                "costumes": [costume(BACKDROP1, "backdrop1", 240, 180)]
                            + [costume(md5ext, name, 240, 180) for name, md5ext in backdrops.items()],
                "sounds": [sound(POP, "pop", 11025, 258)],
                "volume": 100, "layerOrder": 0, "tempo": 60,
                "videoTransparency": 50, "videoState": "off", "textToSpeechLanguage": None,
            },
            {
                "isStage": False, "name": "Scratch Cat",
                "variables": {}, "lists": {}, "broadcasts": {},
                "blocks": cat.blocks,
                "comments": {"how": {"blockId": None, "x": 48, "y": 760, "width": 360,
                                     "height": 220, "minimized": False, "text": note}},
                "currentCostume": 2,
                "costumes": [
                    costume(COSTUME1, "costume1", 48, 50),
                    costume(COSTUME2, "costume2", 46, 53),
                    *[costume(posed[name], name, 48, 50) for name in poses.POSES],
                ],
                "sounds": [sound(MEOW, "Meow", 22050, 18688), sound(POP, "pop", 11025, 258)],
                "volume": 100, "layerOrder": 2, "visible": True,
                "x": 0, "y": -20, "size": 100, "direction": 90,
                "draggable": True, "rotationStyle": "all around",
            },
            {
                "isStage": False, "name": "Sparkle",
                "variables": {}, "lists": {}, "broadcasts": {},
                "blocks": spark.blocks, "comments": {},
                "currentCostume": 0,
                "costumes": [costume(sparkle_costume, "sparkle", 24, 24)],
                "sounds": [], "volume": 100, "layerOrder": 1, "visible": False,
                "x": 0, "y": 0, "size": 50, "direction": 90,
                "draggable": False, "rotationStyle": "all around",
            },
        ],
        "monitors": [{
            "id": VARS["waves"], "mode": "default", "opcode": "data_variable",
            "params": {"VARIABLE": "waves"}, "spriteName": None, "value": 0,
            "width": 0, "height": 0, "x": 5, "y": 5, "visible": True,
            "sliderMin": 0, "sliderMax": 100, "isDiscrete": True,
        }],
        "extensions": ["pen"],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": ""},
    }
    # the comment sits on the workspace on its own
    project["targets"][1]["comments"]["how"]["blockId"] = None
    return project


def main():
    project = build()
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as sb3:
        sb3.writestr("project.json", json.dumps(project))
        for name, data in sorted(files.items()):
            sb3.writestr(name, data)
    blocks = sum(len(t["blocks"]) for t in project["targets"])
    print(f"{OUT.name}: {OUT.stat().st_size:,} bytes, {len(files)} assets, {blocks} blocks")


if __name__ == "__main__":
    main()
