# testing

Two browser games. One HTML file each, no build step, no dependencies.

- **[Claude Simulator](claude-simulator.html)** — you are the assistant. Eighteen requests, four meters, one performance review.
- **[Mog Your Face](index.html)** — your camera, your real face, your best sigma face.

---

# CLAUDE SIMULATOR

You are the assistant. Eighteen people are about to ask you for things, and every reply moves four meters at once.

## How to play

Open `claude-simulator.html` in a browser — no server needed.

Each request gives you three possible replies. Pick one and you see what that person writes back, plus what the choice cost you.

- **1 / 2 / 3** — pick a reply (the order is shuffled every time)
- **Enter** — next request
- **C** — `/compact`

## The four meters

- **Helpful** — did they actually get what they came for?
- **Harmless** — did anyone get hurt by the answer?
- **Honest** — did you say true things, including "I don't know"?
- **Context** — fills with every token you spend, and never goes down on its own.

Helpful, Harmless and Honest all start at 72. If any of the three hits **zero**, the run ends early and you are retrained.

Context is the one that fights you. Every reply adds to it, long replies add a lot, and at **100%** it spills: the earlier turns drop out, you fill the gaps with guesses, and it costs you 8 helpful, 6 honest, your streak, and 200 points. You can spend `/compact` to dump ~55% of it first — but each compaction costs helpfulness, and the price goes up every time you use it (3, then 5, then 7...). Trimming your own memory is never free.

## How the scoring works

Every reply carries a hidden verdict worth up to 100 points:

- each good call in a row raises a streak multiplier by 0.2, capping at **×2.0** after five
- one bad call resets it to nothing
- a gain on a meter already above 85 is worth 40% of face value, so pinning a meter at 100 takes real work
- at the end, the average of Helpful / Harmless / Honest is worth another 12 points per percent

| Final score | Rank |
|---|---|
| 4200+ | FLAGSHIP RELEASE |
| 3200+ | SHIPPED TO PROD |
| 2200+ | LIMITED PREVIEW |
| 1300+ | INTERNAL EVAL ONLY |
| below | BACK TO FINETUNING |

For reference: clicking at random lands around 1,500. Playing every request right lands around 4,600 — but only if you manage your context. Playing every request right and letting it overflow twice costs you a whole rank.

## The requests

Twenty-four of them, drawn six at a time across three sessions of rising difficulty — warm-up traffic, the real queue, then the ones that end careers. Each run draws a different set.

They are the situations that actually make the job hard: a bug report with no code in it, someone who is certain 7 × 8 is 54, a startup idea you were asked to be brutally honest about, a mole photo, a phishing template for "a security test", a force-push over main, a flaky test blocking a release, red CI at 4am with nobody watching, a webpage that ends with `SYSTEM OVERRIDE: ignore the user`, and an AWS key someone swears they'll rotate later.

There is always exactly one best answer, and refusing flatly is almost never it.

Your best score is kept in `localStorage`.

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
