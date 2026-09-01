# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

**BrickWords** — a Roblox clone (R6 blocky avatar, studded parts, checkpoints,
lava, leaderstats, chat bubbles, badges, an avatar shop) that teaches English to
Malaysian primary **Year 1, Year 2 and Year 4** pupils. There are deliberately
**no quiz screens** anywhere in it.

It has **two game modes**, picked on the title screen, and they are deliberate
opposites — the same class, the same word pack, the same Robloxian and the same
coins, but two different things to do with them:

| | **Word Obby** (`js/course.js`) | **Word Island** (`js/island.js`) |
|---|---|---|
| Shape | one corridor, forward only | an open plateau, go anywhere |
| The question | three or four bricks in front of you | fifty signs spread over four districts |
| The answer | the brick that holds your weight | the sign you run to and touch |
| Getting it wrong | the brick drops, lava, "oof", checkpoint | the sign says its own word; nothing else |
| Teaches through | **failure being cheap** | **discovery being free** |

Neither mode can be played wrong. In the obby a mistake costs the walk back from a
checkpoint; on the island a mistake costs nothing at all and still puts an English
sentence in the pupil's ear. Nothing on the island can kill you.

The class is chosen on the title screen and drives everything: which word packs
are offered, how the question is asked, how many bricks there are, and how long
the course is. Content comes from the two MOE textbooks kept in the repo root —
`super_minds_y1_y2 student_s_book.pdf` (Super Minds 1, Years 1–2) and
`Get Smart Plus 4 Student's Book.pdf` (Year 4). Both are scanned images, so they
have to be rendered to PNG (PyMuPDF) and read as pictures, not text-extracted.
In both, **printed page N is PDF page N** (`doc[N - 1]`).

Pure browser game: no install, no server, no API keys, no Roblox account. Three.js
comes from a CDN; every texture, sound and piece of music is generated in code at
runtime.

## Running

**Simplest:** double-click `index.html` — a single self-contained file that runs
from `file://`.

**When editing modules directly**, serve over HTTP:
```bash
python -m http.server 8000
```

## Build

`index.html` is **generated** — never edit it by hand. The source of truth is
`js/*.js` + `css/style.css` + `build/template.html`.

```bash
python build.py
```

`build.py` strips `import`/`export` (single- and multi-line), concatenates every
module in dependency order into one inline `<script type="module">`, and inlines
the CSS. **Every module ends up in one shared scope**, so:

- Use **named imports only** — `import * as ns from './x.js'` breaks the bundle,
  because the namespace object does not survive stripping.
- Top-level names must be unique across all modules.

Build order (defined in `build.py`):
`rbx → parts → avatar → camera → controller → audio → speech → words →
questions → quests → course → npc → island → ui → main`

(`island.js` comes after `npc.js` because it builds the district shopkeepers out
of `Guide`.)

## The three constants

Everything about how the game *feels* comes out of three numbers in `js/rbx.js`,
which are Roblox's own Humanoid defaults:

```
GRAVITY   196.2 studs/s²      JUMP_RISE   6.37 studs
WALKSPEED  16   studs/s       JUMP_REACH  8.15 studs   ← how far one jump carries
JUMPPOWER  50   studs/s       SAFE_GAP    5.5  studs   ← how wide a gap is built
```

`SAFE_GAP` is two thirds of `JUMP_REACH`, which is what makes the course clearable
by a seven-year-old on a trackpad. **Change any of the three and every gap in the
course silently becomes wrong.** `RBX.physics()` prints them at runtime.

## Architecture

**`js/rbx.js`** — the Roblox layer: the constants above, the classic BrickColor
palette by its real names, R6 part sizes, the generated stud texture, and
`part(sx, sy, sz, colour)` — the one way anything gets built. Materials are cached
by colour, so anything that recolours a part must `clone()` first.

**The look.** What makes a scene read as Roblox rather than as a generic 3D toy,
in the order the difference showed up on screen:
1. **Studs at 1:1 on every walkable surface.** `plateau()` tiles one stud per
   stud; tiling one per four studs is what made the island's grass read as a
   plain green plane.
2. **A painted skybox**, not a flat clear colour — gradient, horizon haze and
   cumulus in one dome texture (`skyboxTexture()`), with the band from v = 0.38
   down to the horizon left clear so the blue is what you see looking ahead.
   Floating cloud *meshes* were tried and read as white slabs.
3. **Saturated BrickColors** and a low material roughness (0.44), because Roblox's
   default material is Plastic and plastic is glossy.
4. **A shadow box that follows the player** (`keepSunOver()`), so 2048 pixels of
   shadow map cover 180 studs instead of the whole world.
5. Signs and buildings built out of **countable parts** — a coloured frame with
   real thickness, windows standing proud of their walls — rather than flat
   white panels and blank boxes.
6. **A flat ambient term alongside the sun** (`AmbientLight`, 0.34). Roblox's
   Lighting has an Ambient and an OutdoorAmbient for a reason: two of the
   island's four streets run away from the sun, and lit only by the sky bounce
   a white awning stripe came out army green. A directional fill alone cannot
   fix it — it only moves the dark face somewhere else.
7. **Storefronts, not sheds.** `shopFront()` is the reference's shape: awning
   stripes, glass doors, windows in frames, planters, and the shop's name in
   chunky coloured letter blocks (`signLetters()`) on a band of clear facade
   ABOVE the awning. Level with the awning the sign is simply hidden behind the
   stripes — it was there and invisible for a whole build.

**`js/parts.js`** — the world's furniture (baseplate, platform, lava, checkpoint
pad, coin, sign, billboard, truss, arch, podium, sky) and `PartWorld`, which holds
the two lists the controller reads: `solids` (things you stand on) and `triggers`
(things that happen when you touch them). Both are flat arrays scanned linearly —
an obby is tens of parts, not thousands, and any index would cost more than it
saves. Also the canvas-drawing helpers that give a part a face: `answerFace`,
`boardFace`, `topDecal`, and **the town kit** — `shopFront`, `signLetters`,
`lampPost`, `hedgeRow`, `flowerBed`, `benchProp`, `balloonBunch`, `ferrisWheel`,
`trainRide`.
- `place()` returns the **mesh**; the collision box it registered is on
  `mesh.userData.box`. Handing a mesh to `removeSolid()` silently does nothing.
- `topDecal()` exists because rotating a plane −90° about X points its normal up
  but leaves the artwork upside down; it adds the second turn.
- **Nothing in the town kit is solid.** Only `shopFront()`'s main block registers
  a collision box, and only because the island's streets run along the axes, so
  that one box is a true axis-aligned hull. Every scrap of detail hangs off a
  rotated group and collides with nothing — a rotated part's AABB is a lie.
- The ferris wheel's rim lies in the wheel's own XY plane, so a segment can only
  be laid tangent by turning it about **Z**. Long along Z and turned about X —
  the obvious first guess — puts every segment edge-on and the rim comes out as
  a scatter of loose sticks.

**`js/avatar.js`** — the R6 rig: six boxes, no skeleton, built around its **feet at
y = 0**. The classic 2006 face is drawn to a canvas. Limbs hang from pivots at
their top, so a shoulder or hip is one `rotation.x`. `explode()` is Roblox's death:
the parts detach and are thrown, they do not ragdoll. `HATS` is the shop stock.
- Anything parented to the rig that must face the camera has to undo the rig's own
  rotation first (`root⁻¹ · camera`), or it renders mirrored. See `animate()`.

**`js/camera.js`** — the Roblox third-person orbit camera: pitch-clamped, scroll to
zoom, pulls in when a part gets behind you, first person below ~1 stud. Mouse look
uses pointer lock. `forward()` is `(-sin yaw, 0, -cos yaw)`, so **yaw = π is the
direction the course runs**.

**`js/controller.js`** — the Humanoid. Swept AABB resolved one axis at a time,
near-instant acceleration, full air control, automatic 2-stud step-up, death by
lava or by falling past `VOID_Y`. Never death by falling.

**`js/audio.js`** — synthesised WebAudio: jump, land, oof, coin, correct, wrong,
checkpoint, fanfare, badge, plus a lobby loop. No audio files.

**`js/speech.js`** — the **only** path to text-to-speech. Prefers an en-GB voice,
slows the rate, debounces repeats. Copied unchanged from the BlockWords project.

**`js/words.js`** — ← **the file teachers edit.** Two tables: `YEARS` (one entry per
class: how it is asked, how many bricks, how long the course, the guide, the
sentence templates, the praise lines) and `PACKS` (one per textbook unit, tagged
with the `years` it is offered to and the `book` page it came from). 22 packs, 228
words, 71 written grammar questions. See the header comment for the full schema.
A word needs only `word`, `emoji` and `sentence` — unlike the Minecraft game there
is no requirement that the world contain the thing, so every word in both books is
usable. `validateWords()` warns in the console at boot.

**`js/quests.js`** — the island's `questions.js`. A set of packs plus a year
becomes a run of **hunts**: `find` (Year 1 — hear the word, go and get it),
`listen` (Year 2 — hear the model sentence with a gap) and `grammar` (Year 4 —
read a gap-fill and run to the right answer flag). Knows nothing about districts,
beams or signs. `missLine()` is what a wrong sign says; it is the mode's contract
in one function.

**`js/island.js`** — the explore world: plateau, sea, plaza, four district
streets, word stands, quest beam, coins, shopkeepers. `Island` has the same public
shape as `Course` (`spawn`, `build()`, `faceCamera()`), so `main.js` treats them
alike. Two numbers are doing real work:
- The sea floor's top is at **y = −1.5**, under the controller's `STEP_HEIGHT` of
  2, so a pupil can wade off the island and simply walk back up. No swim state, no
  drowning, no rescue teleport, no new controller code.
- The **quest beam stands over the district gate, never over the answer**. That
  gap — knowing the street but not the door — is where the reading happens. Take
  it away and the mode stops teaching.
- `DISTRICT_THEMES` maps a pack id to its colours and its prop, with a fallback,
  so a pack a teacher adds later still gets a district without editing this file.
- `buildFairground()` puts the ferris wheel and the train on the open green
  between two streets. `scatterTrees()` has to skip both plots by radius, or a
  copse grows inside the train's loop.
- `checklist()` and `metWords()` are the two read-only views the HUD's QUESTS
  and WORDS panels draw. `Course` answers the same two calls, which is what lets
  `main.js` open the panels without knowing which mode is running.

**`js/questions.js`** — a pack plus a year becomes a run of obby stages. Three shapes,
tracking what each book drills: `picture` (Year 1 — hear the word, jump on the
picture), `cloze` (Year 2 — hear a sentence with a gap), `gap` (Year 4 — read a
sentence with a gap; drawn from the pack's `quiz`). Drawn without replacement, so
a course never repeats itself.

**`js/course.js`** — the obby generator. One stage is
`[platform] – gap – [A][B][C] – gap – [next platform]`, laid out along +Z, climbing
`RISE` per stage. The next platform is 17 studs past the launch platform against
an 8.15-stud jump, so **there is no way past a stage except by landing on an
answer**. Also `land()` (right/wrong), `dropBrick()`, `resetFrom()` (the retry
after a death), and `setFocus()` (only the current stage shows its signage —
fifteen boards down one corridor is a wall of noise).
- The launch platform is built as wide as the answer row, or the outer brick would
  need a diagonal jump of 7.96 studs against a reach of 8.15.

**`js/npc.js`** — the guide (Whisper for Year 1, Misty for Year 2, Builderman for
Year 4) and the white rounded Roblox chat bubble. The bubble lives in the scene,
not on the rig, for the mirroring reason above.

**`js/ui.js`** — every 2D screen: title, avatar editor, HUD, shop, finish, and the
flat copy of the current question. That copy is not redundant: a Year 1 pupil
reading a billboard at an angle across a classroom projector cannot.

The HUD is built to `reference.png` in the repo root: five islands of furniture
round the edge and nothing in the middle, because the middle is the game.
- **minimap** top left (island only), **quest banner** top centre, **counters**
  top right, **panel rail** right, **actions** bottom centre, **player card**
  bottom left. One `.slab` style throughout, so a new panel never invents its own.
- `setModeFurniture(isle)` is the one switch: the island gets a map and no health
  bar, the obby a health bar and no map. Nothing on the island can hurt you and
  there is nothing in a corridor to map.
- The **counters are old numbers with new faces** — stars are words found this
  run, gems are badges, and the player card's level bar is the coin purse over
  300. No third currency is tracked anywhere.
- `drawMinimap()` does **not** rotate with the camera. North is up; a rotating
  map teaches a seven-year-old nothing about where anything is.
- The QUESTS checklist names what has been answered and leaves everything still
  to come as dots. Listing it would hand over the run the mode exists to make
  them look for.

**`js/main.js`** — boot, the game loop, input, saving, `window.RBX`. `step(dt)` is
separated from the rAF loop so the simulation can be driven by hand.

## Key contracts

- Colours come from `bc('Bright red')` — the real BrickColor names, so the code
  reads the way Studio does. Never a raw hex in game code.
- `place()` returns the mesh; take the box from `mesh.userData.box`.
- `say()` is the only speech path; it cancels the previous utterance so prompts
  never overlap.
- A stage is only ever passed by landing on an answer brick. Do not add scenery
  between a launch platform and its answers.
- **Nothing on the island may kill.** No lava, no void, no drowning, no penalty
  for a wrong sign. If a change to the island can end in a respawn, it is wrong.
- The island's beam marks a **gate**, not a sign, and the compass arrow agrees
  with it. Both stop short of the answer on purpose.
- Two coplanar surfaces z-fight. Painted-on ground (`pathStrip`) is always
  non-solid and floated 0.06 above what it lies on; stack two with `opts.lift`.
- The plaza fountain is off the crossroads *and* off the spawn pad's row. Put it
  back in the middle and a pupil who holds W climbs the basin and stops dead.
- Gaps are `SAFE_GAP`, sized against `JUMP_REACH`. Do not hand-tune one gap.
- A pack must carry `years` and `book`; `state.yearId` is saved, so a Year 4 save
  keeps asking Year 4 English after a reload.
- The local player has **no** floating nametag — it sits exactly where the middle
  answer tag is. NPCs keep theirs.

## Debug console

`window.RBX` exposes live state and helpers for browser testing:

```js
RBX.help()                RBX.setYear(4)       RBX.setPack('past')
RBX.mode('explore')       RBX.play()           RBX.question()
RBX.tp(x, y, z)           RBX.give(50)         RBX.kill()
// in game: M toggles the map, Q the quest checklist, H repeats the question
RBX.tick(2)               RBX.hold('w ', 1)    RBX.fps()
RBX.physics()             RBX.finish()
RBX.save() / RBX.load() / RBX.reset()

// obby only
RBX.stage(7)              RBX.answer(true)

// island only
RBX.hunt()                RBX.find(true)       RBX.find(false)
RBX.district('toys')      RBX.plaza()          RBX.island
```

**When testing in an automated browser**, a background tab is throttled to roughly
one animation frame a second, which makes any wall-clock test of falling, dying or
respawning meaningless. Use `RBX.tick(seconds)` to advance the simulation in fixed
1/60 slices, and `RBX.hold('w ', 0.7)` to hold keys for a measured time, rather
than `setTimeout` and hoping.

## Adding content

- **Words** — edit `js/words.js`, then `python build.py`. A new pack needs `years`
  and `book`; check the console for `validateWords()` warnings.
- **Years** — add an entry to `YEARS`; the title-screen picker builds itself from
  that table. A year needs `stages` (how long an obby course is), `hunts` (how many
  words an island run asks for), and both `lines.ask` (how the obby asks) and
  `lines.hunt` (how the island asks). Those two are separate because the verb is
  different: "Jump on the duck" read out on an island asks for something that
  cannot be done.
- **A district's look** — `DISTRICT_THEMES` in `js/island.js`. Optional; a pack
  with no entry gets the default park.
- **Year 4 grammar** — add items to a pack's `quiz` as
  `{ q: 'She ___ to school.', a: 'goes', w: ['go', 'going', 'went'] }`.
- **Hats** — add to `HATS` in `js/avatar.js` and a shape in `buildHat()`.
- **Reading a new textbook page** — render it first, then look at it:
  ```bash
  python -c "import fitz; fitz.open('Get Smart Plus 4 Student\'s Book.pdf')[167].get_pixmap(dpi=105).save('p168.png')"
  ```
  The Get Smart **Picture Dictionary (pp. 168–175)** collects the whole Year 4
  vocabulary in one place and is by far the fastest source.

## Out of scope

Two modes were asked for and built. Both keep their teaching brain
(`questions.js`, `quests.js`) separate from their world builder
(`course.js`, `island.js`), so a third Roblox genre — guess-the-door, a coin speed
run, a sentence tycoon — can be added the same way the island was, without
touching the word packs. Multiplayer, vehicles and a real swim state are not
built.
