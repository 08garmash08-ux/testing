# Quiet Hands

An ASMR browser game: ten trays of soft, crunchy, glassy and whispery things on a cutting mat. Best with headphones — the sound is binaural 3D and follows your hand around the mat.

Open `asmr/index.html` in a browser. It is a single file with no build step and no audio files: every sound is rendered in the page when it loads (see below). Sound starts on your first touch or click.

## The trays

- **Bubbles** — press a bubble to pop it, or drag along a row: a run of pops climbs up a pentatonic scale. A few stubborn bubbles squeak and hold on for a second press. Sheets rotate through classic, a rainbow silicone pop-it (which flips over for a second side), small bubble and jumbo.
- **Kinetic sand** — click or tap anywhere on the block and the blade drops in and slices it where you pointed, or drag it down yourself. Slices come off the left edge: thin ones tip over, land with a thud and crumble into a pile; wide ones slump into a heap where they stand. Each slice is measured in millimetres against the mat's centimetre grid. Press and drag on the crumbled pile to squish it. Slice the whole block for the next colour; some blocks are layered.
- **Slime** — press and drag to knead. The slime dents under your finger and bulges up around it, then slowly settles. Kneading traps air pockets; press on them to pop them. Knead to full gloss and the next batch arrives.
- **Foam** — floral foam. Press into it to crunch a hole, or drag to carve a line. Untouched foam crunches loudest; already-crushed foam just thuds. Crush the brick for the next one (wet green, dry, rose).
- **Tapping** — a maple block, glass jar, wide comb, ceramic mug, tin lid and sponge. Tap them (rim and centre sound different), drag a fingernail across them to scratch, or run along the comb to pluck its teeth. On a touch screen you can drum with several fingers. Tap all six and the table is rearranged.
- **Koi pond** — tap the water for a droplet (hold for a bigger one) or drag a finger through it. A real ripple simulation bends the view of the pebbles and focuses light into moving caustics. The koi swim over to see what made the ripples; each nibble earns trust, and full trust brings another koi (up to six: kohaku, yamabuki, showa, asagi, platinum ogon, tancho). Rain lands on the water when it's on.
- **Zen garden** — drag the rake to comb five grooves into the sand, lit by a low raking light. Tap a stone and the rake circles it. Rake most of the garden and the wind smooths it over for a new one (white gravel, rose granite, black sand, golden sand). A bamboo water fountain knocks now and then.
- **Keyboard** — a 60% mechanical keyboard you type on with your real keyboard (or tap). Keys light up in rippling colour, the paper strip shows what you type, Enter rings the bell. Boards rotate through creamy linears, clacky tactiles and clicky blues.
- **Ear mic** — a binaural ASMR microphone with two silicone ears. Pick a tool — brush, fingertips, fluffy cover or whisper — and use it on an ear: the left ear plays in your left ear, the right in your right, and it gets closer and warmer toward the ear canal. Fill the tingle meter for a little celebration.
- **Ice** — tap to crack the ice; the cracks run out across the sheet in time with their crackle, and fresh ice sometimes rings with the laser-like zap of a frozen lake. Drag to scrape it like a skate blade. Crack enough and the sheet shatters into falling shards, then a new one freezes over.

## Everywhere

- **3D sound** — every sound is placed around your head with binaural HRTF panning, following where your hand is. Turn it off for plain stereo.
- **Autoplay** — a ghost hand plays the current tray for you, so you can just listen (it types phrases on the keyboard, rakes waves, feeds the koi…). Touching the tray pauses it for a moment.
- **Whispers** — soft, unintelligible whispering that drifts from ear to ear, with the odd "shhh" travelling across your head and a few "tk tk" tongue clicks.
- **Rain** and **Fire** ambience, a lamp that follows your hand with dust floating in its light, a small live sound meter next to the title, and a sparkle burst whenever you finish something.

## Controls

| Input | Does |
| --- | --- |
| Mouse / touch | Press, drag, slice, knead |
| `Space` / `Enter` (tray focused) | Plays one move in the current tray |
| `1` – `9`, `0` | Switch trays (`0` is the ear mic) |
| `A` | Autoplay on/off |
| `R` | Rain ambience on/off |
| `F` | Fireplace ambience on/off |
| `W` | Whispers on/off |
| `M` | Sound on/off |

On the keyboard tray every key types, so the shortcuts are paused there; use the tray bar to leave.

Your totals (bubbles popped, thinnest slice, koi in the pond…) are kept in `localStorage`.

## How the sounds are made

Real ASMR recordings are made of micro-detail: thousands of tiny clicks, crackles and short resonances, each a little different, picked up very close to a microphone. So instead of a few clean tones, every sound here is rendered once, when the page loads, into short "recordings" built that way (about 190 seconds of audio, in under a second), and then played back with small random changes of pitch and level so no two are identical.

- **Micro-events** — pools of tiny noise bursts, each coloured by its own resonance: plastic crinkles, sand grains, dry foam cells, gravel, ice, brush bristles, fire, raindrops. Textures scatter them in clusters, the way real crackles arrive in bursts.
- **Pops** — the pressure pulse of a tearing bubble, a crack, the air rushing out and the film ringing, sometimes a double pop, then the sheet settling with a crinkle or two.
- **Kinetic sand** — thousands of grain ticks a second over the dull push of the blade; a thud, then a cascade of grains when a slice lands; a soft crunchy squeeze for the pile.
- **Slime** — tiny bubbles bursting in something sticky (short clicks that ring and rise in pitch), over a wet, shifting squelch; bigger air pockets pop with a plip.
- **Foam** — dense bursts of crisp cell-wall cracks over a hollow "pok"; crushed foam only thuds.
- **Tapping** — a fingernail click and a finger-pad thump exciting each object's own resonances (maple, glass with a slow shimmer, ceramic, a tin lid with many metallic partials); scratching is the nail sticking and slipping across the surface.
- **Keyboard** — thocky linears, clacky tactiles (bump then clack) and clicky blues (two click-jacket snaps and a spring ping), with softer upstrokes and stabiliser rattle on the big keys.
- **Water** — each drop is a bubble whose tone rises as it closes, plus a small splash; the brook is hundreds of tiny bubbles over a low gurgle.
- **Zen garden** — gravel clicks under the rake; the bamboo fountain trickles, knocks and echoes.
- **Ice** — a low thunk, crackles timed to the crack spreading, the descending "zap" of a frozen lake, and a shatter of glassy pings.
- **Ear mic** — a brush's bristles and airy swish, skin squeaking on silicone, the dense crackle of a fluffy cover, muffled ear taps.
- **Whispers** — breath shaped by moving vowel formants and hushed consonants (s, sh, f, h, t, k, p), in no language at all.
- **Weather** — rain is thousands of droplets with the odd plink on something hard; the fire is crackles, bursts of snaps, a hiss and a low roar.

Everything is placed around your head with binaural HRTF panning (seven positions on an arc in front of your face, crossfaded as your hand moves), through a close-mic chain: a little proximity warmth, a little extra air, a very small dry room and a faint preamp hiss.
