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

# SCHOOL SIMULATOR

A second browser game in this repo: [`school-simulator.html`](school-simulator.html). Six weeks of school,
one decision a day, and a report card at the end that is entirely your fault. It asks you to sign in first —
with an email address and a password, or with Google.

## Signing in

**Email and password.** *Create account* takes a name, an email address and a password of at least 8
characters. Nothing leaves the browser: the account lives in `localStorage`, and the password is salted and
run through PBKDF2-SHA256 (150,000 iterations) via WebCrypto before it is stored — the plaintext is never
written anywhere. Opened over `file://`, where WebCrypto is unavailable, it falls back to an iterated
SHA-256 implemented in the page and records which scheme it used. Make the password up. It is a game.

**Google.** Out of the box there is no OAuth client ID, so the Google button creates a clearly-labelled
*local profile*: it asks which address to use, ties a save file to it, and sends nothing to Google. An email
that already has a password on the device cannot be taken over this way.

To use the real thing, open **Use a real Google account** under the button and paste an OAuth *Web
application* client ID from the Google Cloud console, with the page's origin (for example
`http://localhost:8000`) in its authorised JavaScript origins. The page then loads Google Identity Services
and renders Google's own button; the returned ID token's email and name become the profile.
`?google_client_id=…` in the URL works too. There is no backend, so the token is only read for a display
name — a real app would verify it server-side.

*Stay signed in on this device* keeps the session in `localStorage`; unticked, it lives in `sessionStorage`
and ends with the tab. Each account gets its own save file, and the login screen shows a local honour roll of
the best year every account on the device has managed.

## Running it

```bash
python3 -m http.server 8000
# then open http://localhost:8000/school-simulator.html
```

It works from `file://` as well, with the hashing fallback above; Google Sign-In needs `http://localhost` or
`https`.

## The year

Five school days a week for six weeks, one activity per day, plus one plan for each weekend.

- **Study** maths, science or humanities — the gains shrink as a subject approaches mastered, so the last
  ten points cost far more days than the first ten.
- **Sit up front** nudges all three subjects along for almost no energy.
- **Lunch with friends, sports practice, a shift at the café, a nap, skipping fifth period** — social
  standing, fitness, money, energy and mood, each bought with something else. Skipping gets you caught about
  a third of the time.
- Roughly four days in ten bring an event: a friend wanting your homework, offered tutoring, a rumour with
  your name on it, a sick day. Most of them are a choice, not an announcement.

**Fridays** are quizzes, and the quiz average is coursework that counts towards the papers. **Week 3** is
midterms, and the midterm average feeds into the finals. **Week 6** is finals, and those decide the year.

Every action's real cost is printed on its card, adjusted for where your stats are right now. Energy comes
back overnight — faster the fitter you are — and mood drifts back towards the middle, slowly. Studying every
single day works, and it will cost you every point of mood you have.

## The endings

Ten of them, ranked at the final bell from your GPA, mood, social standing, fitness and savings:
*Valedictorian* (the only one that wants good grades **and** a life), *Burnt-out genius*, *Class president
energy*, *Quietly excellent*, *Most popular, least prepared*, *Small-time tycoon*, *The athlete*, *A
perfectly fine year*, *Scraped through*, *Held back*. Clicking at random lands around a 1.0 GPA and the
popular ending; grinding every day reaches a 3.8 and the burnout. Valedictorian is the hard one.

Your best year per account goes on the honour roll. **New year** resets the current run and keeps it.
