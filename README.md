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

---

# Drawing YouTube like a pro

`youtube-drawing.html` is a time-lapse animation: a hand draws the YouTube logo stroke by stroke, the way an illustrator works.

1. **Block in proportions**: light pencil box, centre lines and lettering guides, with the loose overshooting lines pros use.
2. **Refine the shapes**: rounded corners, the play triangle and the letter skeletons.
3. **Outline the icon**: one confident red fineliner line.
4. **Marker fill**: two zigzag passes crossing each other, then a clean-up pass along the edges.
5. **Letter the wordmark**: brush pen, one letter at a time.
6. **Erase the guides**: the eraser scrubs out every construction line and leaves crumbs behind.
7. **Sign it**, step back, done.

The hand lifts between strokes, and its shadow touches the paper only when the tip is down. Strokes slow down at the ends and wobble slightly, so every **Replay** comes out a little different. Controls: Replay, Pause (or Space), and 1× / 2× / 4× speed. On narrow screens the icon stacks above the wordmark. With reduced motion turned on, the page shows the finished drawing straight away.

Open the file directly in a browser. It needs no camera and no server. `?t=30` jumps to 30 s into the drawing, and `?seed=7` replays the same hand.
