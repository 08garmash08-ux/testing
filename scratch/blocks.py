"""A small builder for sb3 block JSON.

An .sb3 stores a script as a flat dict of blocks wired together by id, which is
unreadable to write by hand. Here a script is a plain Python list, nesting where
Scratch nests, and `Target.script()` flattens it and wires up the ids.

    script(48, 48, [
        hat("event_whenflagclicked"),
        say("Hi!", 2),
        forever([
            switch_costume("wave-1"),
            wait(0.2),
        ]),
    ])
"""

import itertools


# ---------------------------------------------------------------- values

class Lit:
    """A literal typed into a block's slot. The type numbers are Scratch's:
    4 number, 5 positive number, 6 whole, 7 integer, 8 angle, 9 colour, 10 text,
    11 broadcast."""

    def __init__(self, type_, *value):
        self.type, self.value = type_, list(value)

    def serialize(self):
        return [self.type, *[str(v) for v in self.value]]


def num(v): return Lit(4, v)
def pos(v): return Lit(5, v)
def whole(v): return Lit(6, v)
def angle(v): return Lit(8, v)
def colour(v): return Lit(9, v)
def text(v): return Lit(10, v)


class Menu:
    """The little dropdown that lives inside a block, e.g. the costume name in
    `switch costume to ( )`. In the file it is a shadow block of its own."""

    def __init__(self, opcode, field, value):
        self.opcode, self.field, self.value = opcode, field, value


class Block:
    def __init__(self, opcode, inputs=None, fields=None, substacks=(), mutation=None):
        self.opcode = opcode
        self.inputs = inputs or {}
        self.fields = fields or {}
        self.substacks = substacks
        self.mutation = mutation


class Reporter(Block):
    """A block used in another block's slot — `(x position)`, `(pick random ( ) to ( ))`.
    `over` is the literal it covers up, which Scratch keeps so the slot still has a
    value if the reporter is pulled back out."""

    def __init__(self, opcode, inputs=None, fields=None, over=None):
        super().__init__(opcode, inputs, fields)
        self.over = over


# ---------------------------------------------------------------- target

class Target:
    """Collects the blocks of one sprite or the stage."""

    def __init__(self, prefix):
        self.prefix = prefix
        self.blocks = {}
        self._n = itertools.count()

    def _id(self):
        return f"{self.prefix}-{next(self._n)}"

    def script(self, x, y, stack, comment=None):
        """Add a top-level script at (x, y) on the workspace."""
        first = self._stack(stack, parent=None)
        top = self.blocks[first]
        top["topLevel"], top["x"], top["y"] = True, x, y
        if comment:
            top["comment"] = comment
        return first

    # -- internals -------------------------------------------------------

    def _stack(self, stack, parent):
        """Wire a list of blocks into a chain; returns the first block's id."""
        ids = [self._id() for _ in stack]
        for i, (block_id, block) in enumerate(zip(ids, stack)):
            prev = ids[i - 1] if i else parent
            nxt = ids[i + 1] if i + 1 < len(ids) else None
            self._emit(block_id, block, parent=prev, next_=nxt)
        return ids[0] if ids else None

    def _emit(self, block_id, block, parent, next_):
        entry = {
            "opcode": block.opcode,
            "next": next_,
            "parent": parent,
            "inputs": {},
            "fields": dict(block.fields),
            "shadow": False,
            "topLevel": False,
        }
        self.blocks[block_id] = entry
        for name, value in block.inputs.items():
            entry["inputs"][name] = self._input(value, owner=block_id)
        for i, body in enumerate(block.substacks):
            slot = "SUBSTACK" if i == 0 else f"SUBSTACK{i + 1}"
            first = self._stack(body, parent=block_id)
            if first:
                entry["inputs"][slot] = [2, first]
        if block.mutation:
            entry["mutation"] = block.mutation
        return block_id

    def _input(self, value, owner):
        if isinstance(value, Lit):
            return [1, value.serialize()]
        if isinstance(value, Menu):
            menu_id = self._id()
            self.blocks[menu_id] = {
                "opcode": value.opcode, "next": None, "parent": owner,
                "inputs": {}, "fields": {value.field: [value.value, None]},
                "shadow": True, "topLevel": False,
            }
            return [1, menu_id]
        if isinstance(value, Reporter):
            rep_id = self._id()
            self._emit(rep_id, value, parent=owner, next_=None)
            if value.over is not None:                 # covering a slot that had a value
                return [3, rep_id, value.over.serialize()]
            return [2, rep_id]                         # a boolean slot has no value to cover
        raise TypeError(f"cannot put {value!r} in a block slot")


def procedure(target, x, y, proccode, argnames, make_body, warp=False):
    """Define a My Block. `make_body(*args)` is called with an argument reporter
    per name and returns the body stack."""
    arg_ids = [f"{target.prefix}-arg-{name}" for name in argnames]
    mutation = {
        "tagName": "mutation", "children": [],
        "proccode": proccode,
        "argumentids": _json(arg_ids),
        "argumentnames": _json(list(argnames)),
        "argumentdefaults": _json([""] * len(argnames)),
        "warp": "true" if warp else "false",
    }
    def arg(name):
        return Reporter("argument_reporter_string_number", fields={"VALUE": [name, None]},
                        over=Lit(4, "1"))

    body = make_body(*[arg(n) for n in argnames])
    def_id, proto_id = target._id(), target._id()
    first = target._stack(body, parent=def_id)
    target.blocks[def_id] = {
        "opcode": "procedures_definition", "next": first, "parent": None,
        "inputs": {"custom_block": [1, proto_id]}, "fields": {},
        "shadow": False, "topLevel": True, "x": x, "y": y,
    }
    proto_inputs = {}
    for arg_id, name in zip(arg_ids, argnames):
        shadow_id = target._id()
        target.blocks[shadow_id] = {
            "opcode": "argument_reporter_string_number", "next": None, "parent": proto_id,
            "inputs": {}, "fields": {"VALUE": [name, None]}, "shadow": True, "topLevel": False,
        }
        proto_inputs[arg_id] = [1, shadow_id]
    target.blocks[proto_id] = {
        "opcode": "procedures_prototype", "next": None, "parent": def_id,
        "inputs": proto_inputs, "fields": {}, "shadow": True, "topLevel": False,
        "mutation": dict(mutation, argumentdefaults=mutation["argumentdefaults"]),
    }
    call_mutation = {k: v for k, v in mutation.items() if k != "argumentdefaults"}

    def call(*values):
        return Block("procedures_call",
                     inputs={arg_id: v for arg_id, v in zip(arg_ids, values)},
                     mutation=dict(call_mutation))
    return call


def _json(value):
    import json
    return json.dumps(value)
