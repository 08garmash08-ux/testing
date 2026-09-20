# Browser games

Two games live in this repo. Both are a single HTML file with no build step, no
dependencies and no network calls.

| Game | File | What it is |
| --- | --- | --- |
| **[Planet Breaker](planet-breaker.html)** | `planet-breaker.html` | A 3D space game. Strip Earth's shield, take the ordnance off the defence grid, break the planet apart. |
| **[Mog Your Face](index.html)** | `index.html` | Your camera, your real face, your best sigma face. |

---

# PLANET BREAKER

You fly a breaker-class fighter in Earth orbit, and the contract is the planet
itself. Your pulse laser cannot dent a crust, so the whole game is taking the
weapons off Earth's own defences and turning them on the planet.

## The run

1. **Drop the shield.** Earth sits inside a planetary shield; nothing you fire
   touches the crust while it holds. Six generator satellites hold it up — kill
   all six with the starting pulse laser and the shield collapses.
2. **Take the ordnance.** Every generator drops an ability in order: plasma
   cannon, missile pod, an ordnance crate, rail lance, another crate, and the
   antimatter charge. Rocks, satellites and turrets drop ammo, hull repairs and
   overdrive on top of that.
3. **Break it.** Every hit digs a real crater into the planet mesh — the surface
   caves in, the rim chars, magma opens up. Gut the three modules of the orbital
   station for the **singularity core**, drop it into the crust, and the planet
   comes apart into a debris field.

Earth shoots back the whole time: turret satellites lead their shots, and once
the shield is down the grid launches interceptor drones.

## Weapons

| # | Weapon | Against ships | Against the planet |
| --- | --- | --- | --- |
| 1 | Pulse laser | fast, unlimited | scratches it, nothing more |
| 2 | Plasma cannon | good | burns real holes |
| 3 | Missile pod | seeks the nearest target | heavy |
| 4 | Rail lance | instant hitscan lance | punches deep |
| 5 | Antimatter charge | area blast | takes a continent |
| 6 | Singularity core | — | eats the planet, then it is over |

## Controls

**Desktop** — mouse steers, `W`/`S` thrust, `A`/`D` strafe, `R`/`F` climb and
dive, `Q`/`E` roll, `shift` boost, click or `space` fires, `1`–`6` pick a
weapon, `C` swaps chase and cockpit camera, `M` mutes, `P` pauses.
Arrow keys work instead of the mouse.

**Touch** — drag anywhere on the left of the screen to steer, `THRUST` to
accelerate, `FIRE` to shoot, `WPN` to cycle weapons.

## Running it

Open `planet-breaker.html` — it works straight off the filesystem. To serve it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/planet-breaker.html
```

It needs WebGL2 and says so plainly if the browser cannot provide it.
`planet-breaker.html?dev=1` exposes the game state on `window.PB`, which is how
the scripted tests drive it.

## How it is built

No Three.js, no libraries, nothing fetched at runtime — the whole engine is in
the file:

- vector, quaternion and 4×4 matrix maths, and a value-noise generator;
- geometry built at load: a subdivided icosphere for Earth (no pole pinch, so
  craters stay round anywhere on the globe), flat-shaded noise-displaced rocks,
  boxes, cylinders, cones and tori for everything else;
- a planet shader that takes up to 28 craters as uniforms — the vertex stage
  digs each one into the mesh, the fragment stage paints continents, oceans,
  ice, night-side city lights, charred bowls, molten floors and fissures that
  widen as integrity drops;
- separate passes for clouds, atmosphere, the hex-weave shield with impact
  ripples, additive glows and a point-sprite particle system;
- a WebAudio synth for every sound — no audio files.

Projectiles are swept against their targets over each frame rather than tested
as points, and seekers are sub-stepped, so nothing tunnels through a target on
a slow frame.

Your fastest planet kill is kept in `localStorage`.

---

# MOG YOUR FACE

A browser game: your camera, your real face, your best **sigma face**.

## How to play

1. **Start camera** — allow camera access.
2. Hold your sigma face through the `3 · 2 · 1 · SIGMA` countdown, then the photo is taken.
3. Two buttons appear:
   - **See result** — scans the photo and shows your mog rating in %, plus every face shape (eyes, jawline, cheekbones, symmetry, face harmony, sigma aura) marked as *perfect* or *not perfect*.
   - **Restart photo** — throws the shot away so you can take it again if it came out wrong.

## When you get no mog

A score is not handed out for free:

- **No face in the photo** — nothing is scored. No face, no mog.
- **Face too far** — under 5% of the frame is too small to read any shape. Come closer and retake.
- **Normal face** — if you are smiling, the shapes are still listed but the verdict is **NO MOG**. A normal face never mogs anyone.

## Running it

Camera access needs a secure context, so open it over `localhost` or `https` (not `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

No camera? The start screen has a **use a photo file** link that scans an image instead.

## How the scoring works

Nothing is faked with a random number — every score comes from the pixels of your shot:

- a skin-tone mask (YCbCr) finds the face box,
- the box is resampled to a 64×64 grey patch,
- **symmetry** = left half vs. mirrored right half,
- **eye shape** = contrast and spread in the eye band,
- **jawline** / **cheekbones** = edge energy in the lower and middle bands,
- **face harmony** = how close the box height/width is to the golden ratio,
- **sigma aura** = overall contrast plus how much of the frame your face fills.

A face only counts when the skin blob actually fills its own box (density), has a face-like height/width ratio, and covers enough of the frame — that is what stops an empty room from scoring. The smile check looks for teeth (bright, unsaturated pixels) and movement in the mouth band; an open smile is caught reliably, a tight closed-lip smile can still slip through.

The six traits are weighted into one mog rating. Same photo, same score — so a retake is a real retake.

Your best score of the session is kept in `localStorage`.
