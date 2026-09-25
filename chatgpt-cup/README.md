# ChatGPT cup

A 3D-printable cup with a raised six-link knot emblem and a **ChatGPT** label on the front.

![ChatGPT cup preview](preview.png)

| File | What it is |
| --- | --- |
| `chatgpt_cup.stl` | Ready to slice. |
| `chatgpt_cup.scad` | Parametric OpenSCAD source. Change the size, wall, label or emblem, then re-export. |

## Size

- 84 mm wide at the rim, 70 mm at the base, 101 mm tall
- Holds about **400 ml**
- About 69 cm³ of plastic, roughly 85 g of PLA or 88 g of PETG

## Printing

- Print it **upright, on its base, with no supports**. The emblem stands out 1.2 mm, and its undersides are short enough to print without support.
- Layer height: 0.2 mm
- Walls: the wall is 2.4 mm thick. Set **6 perimeters** for a 0.4 mm nozzle, or use 100% infill, so the wall prints fully solid and doesn't leak.
- Bottom: 15 solid bottom layers at 0.2 mm, so the whole 3 mm floor prints solid.
- Want the emblem in a contrasting colour? Paint the raised parts after printing. A filament change won't do it, because the emblem and the wall share the same layers.

## Drinking from it

Plain FDM prints aren't food-safe. Bacteria can grow in the layer lines, and PLA softens in hot water or a dishwasher. If you want to drink from the cup, print it in PETG and seal the inside with a food-safe epoxy, and only use it for cold drinks. Otherwise, use it as a pen, brush or tool holder.

## Customising

Open `chatgpt_cup.scad` in [OpenSCAD](https://openscad.org). The parameters at the top show up in the Customizer panel:

- `height`, `bottom_radius`, `top_radius`, `wall`, `floor_thick`: the cup's shape
- `logo_size`, `logo_z`: the emblem's size and height
- `label`, `label_size`, `label_z`, `label_font`: the text (set `label = ""` to remove it)
- `emboss`: how far the emblem and text stand out

Press **F6** to render, then **File → Export → STL**. A full render takes about 30 seconds.

From the command line:

```bash
openscad -o chatgpt_cup.stl chatgpt_cup.scad
openscad -o my_cup.stl -D 'label="Hello"' -D height=120 chatgpt_cup.scad
```

This is a fan-made design. It isn't an official OpenAI product, and the emblem is only a look-alike of the ChatGPT logo. Keep the prints for personal use.
