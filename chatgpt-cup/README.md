# ChatGPT cup

A 3D-printable cup with a handle, and the ChatGPT logo and a **ChatGPT** label standing out on the front. The body is navy and the logo white, and in the 3MF they're separate parts, so a multi-colour printer can print them in two filaments.

![ChatGPT cup preview](preview.png)

| File | What it is |
| --- | --- |
| `chatgpt_cup.3mf` | Ready to slice. One object with two parts: **Cup** with its handle (filament 1) and **ChatGPT logo** (filament 2). |
| `chatgpt_cup.scad` | Parametric OpenSCAD source. Change the size, wall, handle, label or logo. |
| `chatgpt_logo.svg` | The logo outline the model is built from. |
| `build_3mf.py` | Rebuilds `chatgpt_cup.3mf` from the source. |

## Size

- 84 mm wide at the rim, 70 mm at the base, 101 mm tall; 112 mm across including the handle
- Holds about **400 ml**
- About 79 cm³ of plastic, roughly 97 g of PLA. Under 2 g of that is the logo.

## Handle

The grab ring sits on the right when the logo faces you. Seen from the side, it's half a hexagon: two arms leave the wall at 45° and meet a straight grip bar. That way nothing on the handle overhangs more than 45°, so it prints upright without supports, where a round loop would sag at the top. There are 21 mm of finger room between the wall and the grip.

## Printing

- Print it **upright, on its base, with no supports**. The handle is built to print that way, and the logo stands out only 1.2 mm, so its undersides print fine too.
- Layer height: 0.2 mm
- Walls: the wall is 2.4 mm thick. Set **6 perimeters** for a 0.4 mm nozzle, or use 100% infill, so the wall prints fully solid and doesn't leak.
- Bottom: 15 solid bottom layers at 0.2 mm, so the whole 3 mm floor prints solid.

### Two colours (AMS, MMU, IDEX)

The cup uses exactly two filaments: navy (or black) as filament 1 and white as filament 2.

- **Bambu Studio, OrcaSlicer** and slicers built on them: the cup opens as one object with two parts, **Cup** on filament 1 and **ChatGPT logo** on filament 2. There's nothing to set.
- **PrusaSlicer**: it asks whether to load the file "as a single object having multiple parts". Answer **Yes**. The cup goes on extruder 1 and the logo on extruder 2.

If a third filament shows up, open the object list and check the filament number on each part. Only 1 and 2 should appear; the file stores no colour painting.

The colour changes only happen between 18 mm and 83 mm, where the logo is.

### One colour

Set the logo part to filament 1 as well, so the whole cup prints in one filament (PrusaSlicer does this by itself on a single-extruder printer). For contrast, paint the raised logo afterwards.

## Drinking from it

Plain FDM prints aren't food-safe. Bacteria can grow in the layer lines, and PLA softens in hot water or a dishwasher. If you want to drink from the cup, print it in PETG and seal the inside with a food-safe epoxy, and only use it for cold drinks. Otherwise, use it as a pen, brush or tool holder.

## Customising

Open `chatgpt_cup.scad` in [OpenSCAD](https://openscad.org). The parameters at the top show up in the Customizer panel:

- `height`, `bottom_radius`, `top_radius`, `wall`, `floor_thick`: the cup's shape
- `handle`, `handle_bottom`, `handle_top`, `handle_gap`, `handle_thick`, `handle_width`: the handle (set `handle = false` to remove it)
- `logo_size`, `logo_z`: the logo's width and height on the cup
- `label`, `label_size`, `label_z`, `label_font`: the text (set `label = ""` to remove it)
- `emboss`: how far the logo and text stand out
- `part`: `all`, `body` or `logo`, to export one part at a time

Then rebuild the 3MF (needs OpenSCAD and Python 3, takes about 30 seconds). Extra `-D` settings are passed on to OpenSCAD:

```bash
python3 build_3mf.py
python3 build_3mf.py -D 'label=""' -D height=120
```

The ChatGPT logo is a trademark of OpenAI. This is a fan-made design, not an official product, so keep the prints for personal use.
