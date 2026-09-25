# Quiet Hands

An ASMR browser game: nine trays of soft, crunchy and glassy things on a cutting mat. Best with headphones — the sound is binaural 3D and follows your hand around the mat.

Open `asmr/index.html` in a browser. It is a single file with no build step and no audio files; every sound is synthesised live with the Web Audio API. Sound starts on your first touch or click.

## The trays

- **Bubbles** — press a bubble to pop it, or drag along a row: a run of pops climbs up a pentatonic scale. A few stubborn bubbles squeak and hold on for a second press. Sheets rotate through classic, a rainbow silicone pop-it (which flips over for a second side), small bubble and jumbo.
- **Kinetic sand** — click or tap anywhere on the block and the blade drops in and slices it where you pointed, or drag it down yourself. Slices come off the left edge: thin ones tip over, land with a thud and crumble into a pile; wide ones slump into a heap where they stand. Each slice is measured in millimetres against the mat's centimetre grid. Press and drag on the crumbled pile to squish it. Slice the whole block for the next colour; some blocks are layered.
- **Slime** — press and drag to knead. The slime dents under your finger and bulges up around it, then slowly settles. Kneading traps air pockets; press on them to pop them. Knead to full gloss and the next batch arrives.
- **Foam** — floral foam. Press into it to crunch a hole, or drag to carve a line. Untouched foam crunches loudest; already-crushed foam just thuds. Crush the brick for the next one (wet green, dry, rose).
- **Tapping** — a maple block, glass jar, wide comb, ceramic mug, tin lid and sponge. Tap them (rim and centre sound different), drag a fingernail across them to scratch, or run along the comb to pluck its teeth. On a touch screen you can drum with several fingers. Tap all six and the table is rearranged.
- **Koi pond** — tap the water for a droplet (hold for a bigger one) or drag a finger through it. A real ripple simulation bends the view of the pebbles and focuses light into moving caustics. The koi swim over to see what made the ripples; each nibble earns trust, and full trust brings another koi (up to six: kohaku, yamabuki, showa, asagi, platinum ogon, tancho). Rain lands on the water when it's on.
- **Zen garden** — drag the rake to comb five grooves into the sand, lit by a low raking light. Tap a stone and the rake circles it. Rake most of the garden and the wind smooths it over for a new one (white gravel, rose granite, black sand, golden sand). A bamboo water fountain knocks now and then.
- **Keyboard** — a 60% mechanical keyboard you type on with your real keyboard (or tap). Keys light up in rippling colour, the paper strip shows what you type, Enter rings the bell. Boards rotate through creamy linears, clacky tactiles and clicky blues.
- **Ice** — tap to crack the ice; the cracks run out across the sheet in time with their crackle, and fresh ice sometimes rings with the laser-like zap of a frozen lake. Drag to scrape it like a skate blade. Crack enough and the sheet shatters into falling shards, then a new one freezes over.

## Everywhere

- **3D sound** — every sound is placed around your head with binaural HRTF panning, following where your hand is. Turn it off for plain stereo.
- **Autoplay** — a ghost hand plays the current tray for you, so you can just listen (it types phrases on the keyboard, rakes waves, feeds the koi…). Touching the tray pauses it for a moment.
- **Rain** and **Fire** ambience, a lamp that follows your hand with dust floating in its light, a small live sound meter next to the title, and a sparkle burst whenever you finish something.

## Controls

| Input | Does |
| --- | --- |
| Mouse / touch | Press, drag, slice, knead |
| `Space` / `Enter` (tray focused) | Plays one move in the current tray |
| `1` – `9` | Switch trays |
| `A` | Autoplay on/off |
| `R` | Rain ambience on/off |
| `F` | Fireplace ambience on/off |
| `M` | Sound on/off |

On the keyboard tray every key types, so the shortcuts are paused there; use the tray bar to leave.

Your totals (bubbles popped, thinnest slice, koi in the pond…) are kept in `localStorage`.

## How the sounds are made

- **Pop** — a band-passed noise crack, a short high-passed snap and a falling sine thump; bigger bubbles pop lower.
- **Sand** — a looping pink-noise hiss whose level follows the blade speed, plus hundreds of tiny noise clicks for grains; a brown-noise thud and a long crumble when a slice lands.
- **Slime** — a resonant low-passed brown-noise squelch driven by how fast you knead, random wet clicks for trapped air, and a rising "suction" blip when you let go.
- **Sand squish** — a soft low-passed press with a spray of grain ticks.
- **Foam** — a hollow low "pok" plus a dense burst of tiny cracks, scaled by how much fresh foam was under the finger.
- **Tapping** — a fingernail click plus each object's resonant modes (wood, glass, ceramic and tin each have their own partials and decay); scratching is a band-passed noise loop tuned per material; comb teeth are short plucks that rise in pitch along the comb.
- **Rain** — filtered pink noise with randomly placed droplet blips.
- **Fire** — a low brown-noise rumble with clustered crackles and the occasional snap.
- **Pop-it** — a soft rubbery bop; runs climb a scale.
- **Water** — each droplet is a sine that sweeps upward as its bubble closes, plus a soft splash; a brook plays quietly under the pond.
- **Zen garden** — gravel scrape and grain ticks that follow the rake's speed; the bamboo fountain is a filling trickle, a hollow knock and its echo.
- **Keyboard** — three switch models: thocky linears (low body resonance), clacky tactiles (bump then bright clack), clicky blues (two click-jacket snaps and a spring ping), each with a separate upstroke and stabiliser rattle on the big keys.
- **Ice** — a low thunk, crackles scheduled along each crack as it spreads, a descending "zap" chirp for frozen-lake rings, and a shatter of dozens of glassy pings.
- **3D** — voices are crossfaded between seven HRTF positions on an arc in front of your face.

A light compressor and a short generated room reverb sit on the master bus.
