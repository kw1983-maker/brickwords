// ============================================================================
//  course.js — the obby. Where the English becomes a jump.
// ============================================================================
//
// The course runs in a straight line along +Z, climbing gently, exactly like
// the obbies this is imitating. One stage is:
//
//     [ launch platform ] -- gap -- [ A ][ B ][ C ] -- gap -- [ next platform ]
//                                    the answer bricks
//
// You stand on the launch platform and read the board. The three bricks are
// the answers. Only one of them holds; the others drop away and you land in the
// lava, say "oof", and reappear at your last checkpoint.
//
// The two gaps are the whole reason the geometry is laid out this way: the next
// platform is 17 studs beyond the launch platform, and a Roblox jump carries
// 8.16 studs (see JUMP_REACH in rbx.js), so there is no way past a stage except
// by landing on one of the answers. The individual gaps are SAFE_GAP, which is
// a comfortable two-thirds of that reach.

import * as THREE from 'three';
import { part, bc, SAFE_GAP, shuffle, randInt } from './rbx.js';
import {
  platform, lavaPool, checkpointPad, coin, billboard, startArch, podium,
  baseplate, answerFace, boardFace, signBoard, decalPlane, topDecal, canvasTexture,
  UI_FONT, DISPLAY_FONT, EMOJI_FONT, DS, fitText, drawWrapped,
} from './parts.js';
import { QuestionSet } from './questions.js';

// ------------------------------------------------------------- the geometry
const BRICK_W = 6;          // an answer brick
const BRICK_D = 6;
const LANE = 7.5;           // centre-to-centre spacing of the answer bricks
const PLAT_D = 9;

// The launch platform has to be at least as wide as the row of answers, or the
// outer brick can only be reached on a diagonal — and for a Year 4 stage with
// four choices that diagonal is 7.96 studs against a jump that carries 8.15.
// That is not a hard jump, it is a coin flip. So the platform is built to fit.
const platformWidth = (choices) => (choices - 1) * LANE + BRICK_W + 5;
const GAP = SAFE_GAP;       // 5.5 studs — two thirds of a full Roblox jump
const STRIDE = PLAT_D / 2 + GAP + BRICK_D + GAP + PLAT_D / 2;   // 26 studs
const RISE = 1.5;           // each stage sits a little higher than the last
const LOBBY_Z = 0;
const FIRST_Z = 32;
const LAVA_Y = -17;
const FLOOR_Y = 1;          // the lobby's surface, and the height stage 1 starts at

// Roblox obbies cycle bright BrickColors stage by stage.
const STAGE_COLOURS = [
  'Bright red', 'Bright blue', 'Bright yellow', 'Bright green',
  'Bright violet', 'Bright orange', 'Bright bluish green', 'Hot pink',
];

export class Course {
  constructor(world, pack, year, hooks = {}) {
    this.world = world;
    this.pack = pack;
    this.year = year;
    this.hooks = hooks;               // { onCorrect, onWrong, onCheckpoint, onFinish, onCoin, onWordCoin }
    this.questions = new QuestionSet(pack, year);
    this.stages = [];
    this.checkpoints = [];
    this.billboards = [];        // turned toward the camera every frame
    this.current = 0;
    this.spawn = new THREE.Vector3(0, 1, LOBBY_Z);
    this.finished = false;
  }

  // --------------------------------------------------------------- building
  build() {
    baseplate(this.world);
    this.buildLobby();

    const plan = this.questions.buildCourse();
    plan.forEach((q, i) => this.buildStage(i, q));

    this.buildFinish(plan.length);
    this.buildLava(plan.length);
    this.setFocus(0);
    return this;
  }

  buildLobby() {
    const g = this.world.group('lobby');
    this.lobbyGroup = g;

    // The plaza. Roblox spawn areas are a big flat slab you cannot fall off.
    platform(this.world, 0, 1, LOBBY_Z, 46, 46, bc('Medium stone grey'), { parent: g, h: 2 });

    // A rim of colour, so the lobby reads as "safe" at a glance. The +Z side is
    // left open: that is the way out through the arch, and a lip there is a
    // step to trip over on the way to stage 1.
    [[0, -23], [-23, 0], [23, 0]].forEach(([dx, dz], i) => {
      const horiz = dx === 0;
      platform(this.world, dx, 2, LOBBY_Z + dz, horiz ? 46 : 2, horiz ? 2 : 46,
        bc(STAGE_COLOURS[i]), { parent: g });
    });

    // The spawn pad you appear on when the place loads.
    this.lobbyPad = checkpointPad(this.world, 0, 1, LOBBY_Z - 8, 0, g);
    this.lobbyPad.claim();
    this.spawn.set(0, 1, LOBBY_Z - 8);
    this.checkpoints.push({ stage: 0, x: 0, y: 1, z: LOBBY_Z - 8 });

    startArch(this.world, 0, 1, LOBBY_Z + 22, g);

    // The sign over the arch tells the class what they are about to play.
    const tex = boardFace(this.pack.name, `${this.year.label} · ${this.pack.blurb}`, { border: '#f5b81d' });
    signBoard(this.world, 0, 17.5, LOBBY_Z + 22, tex, 16, 5, g, { post: false });

    // A short bridge from the edge of the plaza to the edge of stage 1's
    // platform. The two must meet exactly: overlap them and their top faces
    // z-fight, leave a gap and a Year 1 pupil falls before the game has begun.
    const bridgeFrom = LOBBY_Z + 23;                 // the plaza's far edge
    const bridgeTo = FIRST_Z - PLAT_D / 2;           // stage 1's near edge
    platform(this.world, 0, FLOOR_Y, (bridgeFrom + bridgeTo) / 2,
      10, bridgeTo - bridgeFrom, bc('Medium stone grey'), { parent: g });
  }

  stageZ(i) { return FIRST_Z + i * STRIDE; }
  stageY(i) { return FLOOR_Y + i * RISE; }

  buildStage(i, question) {
    const g = this.world.group(`stage${i + 1}`);
    const z = this.stageZ(i);
    const y = this.stageY(i);
    const colour = bc(STAGE_COLOURS[i % STAGE_COLOURS.length]);
    const isCheckpoint = i > 0 && i % this.year.checkpointEvery === 0;

    // ---- the launch platform you read the question from, wide enough that
    //      every answer is a straight-ahead jump
    const platW = platformWidth(question.choices.length);
    platform(this.world, 0, y, z, platW, PLAT_D, isCheckpoint ? bc('Medium stone grey') : colour, { parent: g });

    let pad = null;
    if (isCheckpoint) {
      pad = checkpointPad(this.world, 0, y, z, i, g);
    }

    // ---- a word coin on the platform: touch it to hear a word again.
    //      Off to one side, because dead centre it floats between the camera
    //      and the answers and fills half the screen.
    if (i % 2 === 1) {
      const w = this.pack.words[randInt(0, this.pack.words.length - 1)];
      coin(this.world, (i % 4 === 1 ? -1 : 1) * 5, y + 2.5, z - 1, g, { kind: 'word', word: w, value: 1 });
    }

    // ---- the answer bricks
    const n = question.choices.length;
    const answerZ = z + PLAT_D / 2 + GAP + BRICK_D / 2;
    const answerY = y + 0.8;
    const startX = -((n - 1) * LANE) / 2;

    const bricks = question.choices.map((choice, k) => {
      const x = startX + k * LANE;
      const mesh = part(BRICK_W, 1, BRICK_D, choice.correct ? colour : colour, { repeat: [BRICK_W, BRICK_D] });
      // place() hands back the mesh; the collision box it registered is on
      // userData. Keeping the mesh here instead was why a wrong brick never
      // dropped: removeSolid() was being handed a mesh and silently doing
      // nothing, so the pupil stood safely on the wrong answer.
      this.world.place(mesh, x, answerY - 0.5, answerZ, {
        parent: g, kind: 'answer', data: { stage: i, choice: k, correct: choice.correct },
      });
      const box = mesh.userData.box;

      // The label goes on the brick's top face…
      const face = answerFace(choice.emoji, choice.label, { showWord: this.year.showWord });
      const decal = topDecal(face, BRICK_W - 0.6, BRICK_D - 0.6);
      decal.position.set(x, answerY + 0.04, answerZ);
      g.add(decal);

      // …and again on a floating billboard, so it is readable from the launch
      // platform, where you are looking at it edge-on.
      const tag = this.tagFace(choice.emoji, choice.label);
      const bb = billboard(this.world, x, answerY + 5.2, answerZ, tag, 6, 3.1, g);
      this.billboards.push(bb);

      return { mesh, box, choice, decal, billboard: bb, x, z: answerZ, y: answerY, fallen: false };
    });

    // ---- the question board, hanging over the gap, angled back at the player
    // Between the flat HUD copy at the top of the screen and the answer tags
    // below — high enough to read over the bricks, low enough not to sit behind
    // the HUD panel and read as a doubled, half-covered question.
    const boardTex = boardFace(question.board, question.subtitle);
    const board = billboard(this.world, 0, y + 10.5, z + PLAT_D / 2 + GAP / 2, boardTex, 13, 4.1, g);
    this.billboards.push(board);

    this.stages.push({
      index: i, question, group: g, bricks, board, pad, isCheckpoint,
      signage: [board, ...bricks.map((b) => b.billboard)],
      z, y, answerZ, answerY, answered: false, colour,
    });

    if (isCheckpoint) this.checkpoints.push({ stage: i, x: 0, y, z });
  }

  // The small floating label above an answer brick.
  tagFace(emoji, label) {
    return canvasTexture(512, 264, (g, w, h) => {
      const r = 30;
      g.fillStyle = 'rgba(255,255,255,0.96)';
      g.beginPath();
      g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r);
      g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(15,22,32,0.20)';
      g.lineWidth = 9;
      g.stroke();

      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (emoji) {
        g.font = `92px ${EMOJI_FONT}`;
        g.fillText(emoji, w / 2, h * 0.36);
        g.fillStyle = DS.purple;
        const px = fitText(g, label, w - 40, 58, DISPLAY_FONT);
        g.font = `700 ${px}px ${DISPLAY_FONT}`;
        g.fillText(label, w / 2, h * 0.78);
      } else {
        g.fillStyle = DS.text;
        const px = fitText(g, label, w - 50, 96, DISPLAY_FONT, '700');
        drawWrapped(g, label, w / 2, h / 2, w - 50, px, px * 1.12, DISPLAY_FONT, '700');
      }
    });
  }

  buildFinish(stageCount) {
    const g = this.world.group('finish');
    this.finishGroup = g;
    const z = this.stageZ(stageCount);
    const y = this.stageY(stageCount);
    this.finishZ = z;
    this.finishY = y;

    platform(this.world, 0, y, z, 30, 26, bc('Bright yellow'), { parent: g });
    podium(this.world, 0, y, z + 4, g);

    const tex = boardFace('FINISH!', `${this.pack.name} · ${this.year.label}`, { border: '#34b24a' });
    signBoard(this.world, 0, y + 8, z - 10, tex, 18, 5.5, g, { post: true });

    // The word wall: every word in the pack, on boards around the podium, so a
    // pupil who has finished has something to read back over.
    const words = this.pack.words;
    const perSide = Math.ceil(words.length / 2);
    words.forEach((w, i) => {
      const side = i < perSide ? -1 : 1;
      const k = i < perSide ? i : i - perSide;
      const tx = side * 16;
      const tz = z - 9 + k * 3.4;

      // A backing brick, or the words read as paper hanging in mid-air.
      const backing = part(0.4, 3.4, 3.4, bc('Institutional white'), { studs: false });
      backing.position.set(tx, y + 4, tz);
      g.add(backing);

      const face = answerFace(w.emoji, w.word, { showWord: true });
      const plane = decalPlane(face, 3, 3, { side: THREE.DoubleSide });
      plane.position.set(tx - side * 0.25, y + 4, tz);
      plane.rotation.y = side * -Math.PI / 2;
      g.add(plane);
    });

    checkpointPad(this.world, 0, y, z - 8, stageCount, g);
    this.checkpoints.push({ stage: stageCount, x: 0, y, z: z - 8 });

    const trig = this.world.addTrigger('finish', 0, y + 3, z + 4, 24, 12, 14, { stage: stageCount });
    trig.group = g;
  }

  // One sea of lava under the whole place, lobby included. Anywhere you can
  // fall off, you fall into this — so there is no corner of the world where a
  // pupil ends up stranded on the baseplate with no way back.
  buildLava(stageCount) {
    const g = this.world.group('lava');
    const zStart = LOBBY_Z - 90;
    const zEnd = this.stageZ(stageCount) + 70;
    lavaPool(this.world, 0, LAVA_Y, (zStart + zEnd) / 2, 62, zEnd - zStart, g);
  }

  // ---------------------------------------------------------------- playing

  // Which stage the player is standing in the zone of. A stage's zone starts a
  // little before its launch platform and runs to the start of the next one, so
  // the question appears as the pupil arrives rather than as they leap.
  stageAtZ(z) {
    const zoneStart = FIRST_Z - PLAT_D / 2 - 3;
    if (z < zoneStart) return -1;
    const i = Math.floor((z - zoneStart) / STRIDE);
    return Math.min(i, this.stages.length - 1);
  }

  stageOf(box) {
    if (!box || box.kind !== 'answer') return null;
    return this.stages[box.data.stage] || null;
  }

  // Called when the Humanoid lands on something. Returns 'correct', 'wrong'
  // or null when the landing was on ordinary scenery.
  land(box) {
    const stage = this.stageOf(box);
    if (!stage || stage.answered) return null;

    const brick = stage.bricks[box.data.choice];
    stage.answered = true;

    if (box.data.correct) {
      this.markCorrect(stage, brick);
      this.current = Math.max(this.current, stage.index + 1);
      if (this.hooks.onCorrect) this.hooks.onCorrect(stage, brick);
      return 'correct';
    }

    stage.answered = false;      // they will land here again after respawning
    this.dropBrick(brick);
    if (this.hooks.onWrong) this.hooks.onWrong(stage, brick);
    return 'wrong';
  }

  markCorrect(stage, brick) {
    // The right brick turns Roblox's "Bright green" and keeps holding.
    brick.mesh.material = brick.mesh.material.map((m) => {
      const c = m.clone();
      c.color.setHex(0x2fbf5f);
      c.emissive = new THREE.Color(0x2fbf5f);
      c.emissiveIntensity = 0.35;
      return c;
    });
    // The others fall away, which shows the answer rather than just marking it.
    stage.bricks.forEach((b) => { if (b !== brick) this.dropBrick(b); });
    if (stage.board) {
      stage.board.material.map = boardFace(stage.question.reward, '✔ Correct!', { border: '#34b24a', fg: '#14202d' });
      stage.board.material.needsUpdate = true;
    }
  }

  // A brick gives way: it is unregistered immediately (so the player falls this
  // very frame) and then animated down for the look of the thing.
  dropBrick(brick) {
    if (brick.fallen) return;
    brick.fallen = true;
    this.world.removeSolid(brick.box);

    brick.mesh.material = brick.mesh.material.map((m) => {
      const c = m.clone();
      c.transparent = true;
      return c;
    });

    let t = 0;
    const anim = {
      group: brick.mesh.parent,
      update: (dt) => {
        t += dt;
        const drop = 40 * t * t;
        brick.mesh.position.y = brick.y - 0.5 - drop;
        brick.decal.position.y = brick.y + 0.04 - drop;
        brick.mesh.rotation.z += dt * 1.4;
        const fade = Math.max(0, 1 - t * 0.8);
        brick.mesh.material.forEach((m) => { m.opacity = fade; });
        brick.decal.material.opacity = fade;
        if (brick.billboard) brick.billboard.material.opacity = fade;
        if (t > 1.6) {
          brick.mesh.visible = false;
          brick.decal.visible = false;
          if (brick.billboard) brick.billboard.visible = false;
          const i = this.world.animated.indexOf(anim);
          if (i >= 0) this.world.animated.splice(i, 1);
        }
      },
    };
    this.world.animated.push(anim);
  }

  // Put a stage back the way it was, for the retry after a wrong answer.
  resetStage(index) {
    const stage = this.stages[index];
    if (!stage) return;
    stage.answered = false;
    stage.bricks.forEach((brick, k) => {
      if (!brick.fallen) return;
      brick.fallen = false;
      brick.mesh.visible = true;
      brick.decal.visible = true;
      if (brick.billboard) brick.billboard.visible = true;
      brick.mesh.position.set(brick.x, brick.y - 0.5, brick.z);
      brick.mesh.rotation.set(0, 0, 0);
      brick.decal.position.set(brick.x, brick.y + 0.04, brick.z);
      brick.mesh.material.forEach((m) => { m.opacity = 1; m.transparent = false; });
      brick.decal.material.opacity = 1;
      if (brick.billboard) brick.billboard.material.opacity = 1;
      brick.box = this.world.registerSolid(brick.mesh, {
        kind: 'answer',
        data: { stage: index, choice: k, correct: brick.choice.correct },
      });
    });
  }

  // Every stage from the given one onward goes back to unanswered — used when
  // a pupil respawns at a checkpoint behind where they died.
  resetFrom(index) {
    for (let i = index; i < this.stages.length; i++) {
      if (!this.stages[i].answered) this.resetStage(i);
    }
  }

  // The checkpoint at or before this stage.
  checkpointFor(stageIndex) {
    let best = this.checkpoints[0];
    for (const c of this.checkpoints) {
      if (c.stage <= stageIndex && c.stage >= best.stage) best = c;
    }
    return best;
  }

  // Fifteen question boards all facing the camera down one straight corridor is
  // a wall of white noise, and the next stage's answer tags show through the
  // gaps between this one's. Only the stage in play is labelled; the rest keep
  // their bricks and lose their signage until you get to them.
  setFocus(index) {
    if (this._focus === index) return;
    this._focus = index;
    for (const s of this.stages) {
      const on = s.index === index;
      for (const o of s.signage) if (o) o.visible = on;
    }
  }

  // Billboards have to be turned toward the camera every frame. They are kept
  // in a flat list rather than found by traversing the scene, which would walk
  // every brick in the course sixty times a second.
  faceCamera(camera) {
    for (let i = 0; i < this.billboards.length; i++) {
      const b = this.billboards[i];
      if (b.visible) b.quaternion.copy(camera.quaternion);
    }
  }

  get totalStages() { return this.stages.length; }

  // ---------------------------------------------------------- the HUD panels
  // The obby's answer to the island's checklist. A cleared stage names the word
  // it taught; the stage in play names itself; the rest stay dots.
  checklist() {
    let seenOpen = false;
    return this.stages.map((s) => {
      const a = s.question.answer || {};
      if (s.answered) return { word: a.word || `Stage ${s.index + 1}`, emoji: a.emoji || '', state: 'done' };
      if (!seenOpen) { seenOpen = true; return { word: `Stage ${s.index + 1}`, emoji: '🧱', state: 'now' }; }
      return { state: 'locked' };
    });
  }

  // Every word the course has actually taught so far — the answers to the
  // stages already cleared.
  metWords() {
    return this.stages.filter((s) => s.answered && s.question.answer).map((s) => s.question.answer);
  }
}
