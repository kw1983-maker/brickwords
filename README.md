# 🧱 BrickWords

Two Roblox-style games that teach English to Year 1, Year 2 and Year 4.

**🧱 Word Obby** — jump on the right answer. Get it wrong and it's the lava.
**🏝 Word Island** — run around an island and go and find the words.

Same class, same word pack, same Robloxian, same coins. Pick the game on the
title screen.

Open `index.html`. That's it — no install, no Roblox account, no login. It runs
from a double-click on any school PC with a browser. (The very first run needs
internet for a moment to fetch the 3D engine; after that it works offline.)

---

## How a lesson runs

1. The pupil picks the game — **Word Obby** or **Word Island**.
2. They pick their class — **Year 1**, **Year 2** or **Year 4**.
3. They pick this week's words — one card per unit of your textbook.
4. They build a Robloxian (skin, shirt, legs, a hat if they've earned one).
5. Play.

### 🧱 Word Obby

Each stage is a gap over lava with three or four bricks across it. A board shows
the question and a voice reads it out. **Only the right brick holds.** The wrong
one drops away, the pupil falls in the lava, says "oof", and reappears at their
last checkpoint to try the same word again — no score penalty, no lecture, no
quiz screen. Roblox's own loop, doing the teaching.

Getting it right pays coins, plays the model sentence back, and builds the next
stage. A checkpoint every few stages, a badge at the milestones, a podium and a
word wall at the finish.

### 🏝 Word Island

The pupil spawns in a plaza with four streets running off it. Each street is a
district built from one unit of the book — this week's words, plus the three
units next to it — and every word in all four stands on a signpost you can walk
up to and read. About fifty signs in all.

The guide calls out a word. A pillar of light marks the **district** it is in and
an arrow on screen points the way, but neither marks the sign, so when the pupil
gets there they still have to read. Touch the right one and it flashes green, pays
coins and reads the model sentence back.

**Touch the wrong one and it simply says what it is** — *"It's a rubber. Now find
the pencil!"* No falling, no oof, no penalty, no going back to the start. A wrong
guess on the island still teaches a word, which is the whole reason the mode
exists. Nothing on the island can hurt you: you can even wade into the sea and
walk back out.

Every sign a pupil touches for the first time is remembered between lessons, so
the island slowly fills in over a term.

Year 4 also gets **grammar hunts**: a sentence with a gap goes up on the board and
four answer flags are planted, one in each district. Read it, then run to the
right one.

---

## What each class gets

| | Question | Obby stages | Island hunts | From |
|---|---|---|---|---|
| **Year 1** 🐣 | the word, read aloud | 10 | 8 | Super Minds 1, Starter–Unit 4 |
| **Year 2** 🦉 | a spoken sentence with a word missing | 12 | 10 | Super Minds 1, Units 5–9 |
| **Year 4** 🚀 | a written sentence with a gap | 15 | 12 | Get Smart Plus 4, Modules 1–10 |

Year 1 and Year 2 are guided by Whisper and Misty from the Super Minds books;
Year 4 by a builder.

## What it covers

**Years 1 & 2 — Super Minds 1** (12 packs)
Friends · Numbers · Colours · At School · Toys · Pet Show · Lunchtime ·
Free Time · The Old House · Get Dressed · The Robot · At the Beach

**Year 4 — Get Smart Plus 4** (10 packs)
Where Are You From? · My Week · In the Past · Celebrations · Eating Right ·
Getting Around · Helping Out · Amazing Animals · Get Active! · What's the Matter?

228 words and 71 written grammar questions in all, taken from the two textbooks in
this folder. Year 4's questions drill what the book actually drills: *some/any*,
*has to*, the past simple, *going to*, comparatives and superlatives, *should*.

---

## Controls

| | |
|---|---|
| **W A S D** | walk |
| **Space** | jump |
| **Mouse** | look around (click the game first) |
| **Scroll** | zoom in and out |
| **R** | obby: back to your checkpoint · island: back to the plaza |
| **H** | hear the question again |
| **Esc** | menu |

On a tablet: one finger drags the camera, and there's a **JUMP** button.

---

## For the teacher

### Changing the words

Everything the game asks comes from one file: **`js/words.js`**. Add a word and
it appears in the course the next time you build. A word is just:

```js
{ word: 'pencil', emoji: '✏️', sentence: "It's a pencil." }
```

A Year 4 grammar question is:

```js
{ q: 'She ___ to school by bus.', a: 'goes', w: ['go', 'going', 'went'] }
```

Then run:

```bash
python build.py
```

That rebuilds `index.html`. **Do not edit `index.html` by hand** — it is generated
from `js/`, `css/` and `build/template.html`, and your changes would be lost on
the next build. Open the browser console afterwards: the game checks your packs at
startup and says what's wrong with them.

Keep the pictures in one pack visually different from each other. Three bricks
showing three near-identical emoji is a guessing game, not a reading test.

### Using it in class

- It works on a projector — the question is repeated flat and large at the top of
  the screen, so the back row can read it.
- Speech can be turned off (title screen or Esc menu) if the room is noisy.
- Coins and hats save in the browser, so a pupil on the same machine keeps their
  Robloxian between lessons.
- Nobody can lose. In the obby, falling in the lava costs nothing but the walk
  back from the last checkpoint. On the island there is no lava and no way to die
  at all — a wrong sign just tells you what it is.
- The two modes suit different lessons. The obby is tight and quick and drills one
  unit hard; the island is slower, covers four units at once, and rewards a class
  that will explore. Same words either way.

### The books

The two Student's Books this is built from sit in this folder:
`super_minds_y1_y2 student_s_book.pdf` and `Get Smart Plus 4 Student's Book.pdf`.
Every pack names the page it came from, and you'll see it on the card when you
pick it.

---

Built with Three.js. Every brick, texture, sound and note is generated in code —
there are no image or audio files, and nothing is taken from Roblox.
