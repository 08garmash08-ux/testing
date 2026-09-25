# Quiet Hands

An ASMR browser game: three soft things on a cutting mat to press, slice and knead. Best with headphones — every sound is panned to where your hand is on the mat.

Open `asmr/index.html` in a browser. It is a single file with no build step and no audio files; every sound is synthesised live with the Web Audio API. Sound starts on your first touch or click.

## The trays

- **Bubble wrap** — press a bubble to pop it, or drag along a row to pop a whole run. A few stubborn bubbles squeak and hold on for a second press. Clear the sheet and the next one slides in (classic, small bubble, jumbo).
- **Kinetic sand** — start at the top of the block and drag the blade straight down. Slices come off the left edge, tip over, land with a thud and crumble into a pile. Each slice is measured in millimetres against the mat's centimetre grid. Slice the whole block for the next colour; some blocks are layered.
- **Slime** — press and drag to knead. The slime dents under your finger and bulges up around it, then slowly settles. Kneading traps air pockets; press on them to pop them. Knead to full gloss and the next batch arrives.

## Controls

| Input | Does |
| --- | --- |
| Mouse / touch | Press, drag, slice, knead |
| `Space` / `Enter` (tray focused) | Plays one move in the current tray |
| `1` `2` `3` | Switch trays |
| `R` | Rain ambience on/off |
| `M` | Sound on/off |

Your totals (bubbles popped, thinnest slice, batches kneaded…) are kept in `localStorage`.

## How the sounds are made

- **Pop** — a band-passed noise crack, a short high-passed snap and a falling sine thump; bigger bubbles pop lower.
- **Sand** — a looping pink-noise hiss whose level follows the blade speed, plus hundreds of tiny noise clicks for grains; a brown-noise thud and a long crumble when a slice lands.
- **Slime** — a resonant low-passed brown-noise squelch driven by how fast you knead, random wet clicks for trapped air, and a rising "suction" blip when you let go.
- **Rain** — filtered pink noise with randomly placed droplet blips.

A light compressor and a short generated room reverb sit on the master bus.
