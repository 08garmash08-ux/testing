# Quiet Hands

An ASMR browser game: five trays of soft things on a cutting mat to pop, slice, knead, crunch and tap. Best with headphones — every sound is panned to where your hand is on the mat.

Open `asmr/index.html` in a browser. It is a single file with no build step and no audio files; every sound is synthesised live with the Web Audio API. Sound starts on your first touch or click.

## The trays

- **Bubble wrap** — press a bubble to pop it, or drag along a row to pop a whole run. A few stubborn bubbles squeak and hold on for a second press. Clear the sheet and the next one slides in (classic, small bubble, jumbo).
- **Kinetic sand** — click or tap anywhere on the block and the blade drops in and slices it where you pointed, or drag it down yourself. Slices come off the left edge: thin ones tip over, land with a thud and crumble into a pile; wide ones slump into a heap where they stand. Each slice is measured in millimetres against the mat's centimetre grid. Press and drag on the crumbled pile to squish it. Slice the whole block for the next colour; some blocks are layered.
- **Slime** — press and drag to knead. The slime dents under your finger and bulges up around it, then slowly settles. Kneading traps air pockets; press on them to pop them. Knead to full gloss and the next batch arrives.
- **Foam** — floral foam. Press into it to crunch a hole, or drag to carve a line. Untouched foam crunches loudest; already-crushed foam just thuds. Crush the brick for the next one (wet green, dry, rose).
- **Tapping** — a maple block, glass jar, wide comb, ceramic mug, tin lid and sponge. Tap them (rim and centre sound different), drag a fingernail across them to scratch, or run along the comb to pluck its teeth. On a touch screen you can drum with several fingers. Tap all six and the table is rearranged.

## Controls

| Input | Does |
| --- | --- |
| Mouse / touch | Press, drag, slice, knead |
| `Space` / `Enter` (tray focused) | Plays one move in the current tray |
| `1` – `5` | Switch trays |
| `R` | Rain ambience on/off |
| `F` | Fireplace ambience on/off |
| `M` | Sound on/off |

Your totals (bubbles popped, thinnest slice, batches kneaded…) are kept in `localStorage`.

## How the sounds are made

- **Pop** — a band-passed noise crack, a short high-passed snap and a falling sine thump; bigger bubbles pop lower.
- **Sand** — a looping pink-noise hiss whose level follows the blade speed, plus hundreds of tiny noise clicks for grains; a brown-noise thud and a long crumble when a slice lands.
- **Slime** — a resonant low-passed brown-noise squelch driven by how fast you knead, random wet clicks for trapped air, and a rising "suction" blip when you let go.
- **Sand squish** — a soft low-passed press with a spray of grain ticks.
- **Foam** — a hollow low "pok" plus a dense burst of tiny cracks, scaled by how much fresh foam was under the finger.
- **Tapping** — a fingernail click plus each object's resonant modes (wood, glass, ceramic and tin each have their own partials and decay); scratching is a band-passed noise loop tuned per material; comb teeth are short plucks that rise in pitch along the comb.
- **Rain** — filtered pink noise with randomly placed droplet blips.
- **Fire** — a low brown-noise rumble with clustered crackles and the occasional snap.

A light compressor and a short generated room reverb sit on the master bus.
