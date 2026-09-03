// ============================================================================
//  main.js — boot, the game loop, input, saving, and window.RBX.
// ============================================================================

import * as THREE from 'three';
import {
  DEFAULT_AVATAR, bc, clamp, GRAVITY, WALKSPEED, JUMPPOWER,
  JUMP_RISE, JUMP_REACH, SAFE_GAP,
} from './rbx.js';
import { PartWorld, makeSky, keepSunOver, makeEnvironment, applyWorldLook } from './parts.js';
import { Avatar, HATS } from './avatar.js';
import { OrbitCamera } from './camera.js';
import { Humanoid } from './controller.js';
import { initAudio, resumeAudio, startMusic, setMusicEnabled, setSfxEnabled, sfx } from './audio.js';
import { initSpeech, say, cancelSpeech, setSpeechEnabled } from './speech.js';
import {
  YEARS, PACKS, yearById, packsForYear, defaultPackForYear, packById,
  pickLine, fillLine, validateWords,
} from './words.js';
import { wordWall } from './questions.js';
import { Course } from './course.js';
import { Island, ISLE_WADE } from './island.js';
import { worldForPack } from './worlds.js';
import { missLine, hitLine } from './quests.js';
import { Guide } from './npc.js';
import { UI } from './ui.js';
import { initCloud, cloudPull, scheduleCloudSave, flushCloudSave, cloudEnabled } from './cloud.js';

const SAVE_KEY = 'brickwords.obby.v1';
const RESPAWN_SECONDS = 2;

// The two games. They share everything a pupil owns — their class, their word
// pack, their Robloxian, their coins and their hats — and differ only in what
// there is to do with them. The obby teaches through cheap failure; the island
// teaches through discovery.
const MODES = [
  {
    id: 'obby', emoji: '\u{1F9F1}', name: 'Word Obby',
    blurb: "Jump on the right answer. Get it wrong and it's the lava.",
    how: 'One course \u00b7 checkpoints \u00b7 lava',
  },
  {
    id: 'explore', emoji: '\u{1F3DD}\uFE0F', name: 'Word Island',
    blurb: 'Run around an island and go and find the words.',
    how: 'Four districts \u00b7 nothing can hurt you',
  },
];

// --------------------------------------------------------------- the state
const state = {
  mode: 'obby',
  yearId: 1,
  packId: null,
  look: Object.assign({}, DEFAULT_AVATAR),
  name: 'Player',
  coins: 0,
  owned: [],            // hat ids bought in the shop
  badges: [],
  best: {},             // packId -> furthest stage cleared
  found: {},            // packId -> words met on the island, kept for good
  // per-run
  stage: 0,
  deaths: 0,
  runCoins: 0,
  huntsDone: 0,
  spokenStage: -1,
  playing: false,
  paused: false,
  pendingWrongLine: null,   // shown on the respawn screen, not over the "oof"
};

// ------------------------------------------------------------ three.js core
let renderer, scene, camera, orbit;
let world, course, island, humanoid, avatar, guide;
let clock;
let respawnTimer = 0;
let pendingCheckpoint = null;
let frames = 0, fpsTime = 0, fps = 0;
let wadeFrames = 0;          // how long ago the shallows were last touched

const input = { f: 0, b: 0, l: 0, r: 0, jump: false, crouch: false };

// =============================================================== boot ======

function boot() {
  UI.showLoading('Starting the engine…');

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  document.getElementById('game').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1600);
  orbit = new OrbitCamera(camera, renderer.domElement);
  clock = new THREE.Clock();

  makeSky(scene);
  makeEnvironment(renderer, scene);
  initAudio();
  initSpeech();
  validateWords();

  UI.init(hooks);
  bindKeys();
  window.addEventListener('resize', onResize);

  load();
  UI.setLoad(0.92, 'Checking your save…');
  initCloud().then((ok) => {
    if (!ok) return;
    return cloudPull(state.name);
  }).then((remote) => {
    if (remote) applyCloudSave(remote);
  }).finally(() => {
    UI.setLoad(1, 'Ready.');
    setTimeout(openTitle, 350);
  });

  loop();
  window.RBX = debugApi();
  console.log('[BrickWords] ready. Try RBX.help() in this console.');
}

function onResize() {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================ title flow ===

function openTitle() {
  state.playing = false;
  cancelSpeech();
  UI.showTitle();
  UI.hideCompass();
  orbit.releaseLock();
  refreshPickers();
  UI.setContinueVisible(Object.keys(state.best).length > 0);
  UI.playerName = state.name;
}

function refreshPickers() {
  UI.buildModeCards(MODES, state.mode, (id) => {
    state.mode = id;
    UI.setModeCopy(id);
    save();
  });
  UI.setModeCopy(state.mode);

  UI.buildYearCards(YEARS, state.yearId, (id) => {
    state.yearId = id;
    // A pack from another year is meaningless, so re-pick when the class changes.
    if (!packsForYear(id).some((p) => p.id === state.packId)) {
      state.packId = defaultPackForYear(id).id;
    }
    refreshPackCards();
    save();
  });
  refreshPackCards();
}

function refreshPackCards() {
  const packs = packsForYear(state.yearId);
  if (!packs.some((p) => p.id === state.packId)) state.packId = packs[0].id;
  UI.buildPackCards(packs, state.packId, (id) => { state.packId = id; save(); });
}

function openAvatarEditor() {
  resumeAudio();
  startMusic();
  UI.showAvatar();
  UI.playerName = state.name;
  UI.buildAvatarEditor(state.look, state.owned, state.coins, (look) => {
    state.look = look;
    state.name = UI.playerName;
    save();
  });
}

// ============================================================ the game =====

function startGame() {
  const year = yearById(state.yearId);
  const pack = packById(state.packId) || defaultPackForYear(state.yearId);
  state.packId = pack.id;
  state.name = UI.playerName;
  const isle = state.mode === 'explore';

  UI.showLoading(isle ? 'Building the island…' : 'Building the obby…');
  cancelSpeech();

  // Tear down anything from a previous run.
  if (world) {
    scene.remove(world.root);
    world.solids.length = 0;
    world.triggers.length = 0;
    world.animated.length = 0;
  }
  if (island) { island.dispose(); island = null; }
  if (guide) { guide.dispose(); guide = null; }
  if (avatar) scene.remove(avatar.root);
  course = null;

  world = new PartWorld(scene);
  applyWorldLook(scene, renderer, worldForPack(pack));

  if (isle) {
    island = new Island(world, scene, districtPacks(state.yearId, pack), pack, year, {
      onHunt: handleHunt,
      onHit: handleHit,
      onMiss: handleMiss,
      onDiscover: handleDiscover,
      onFinish: finishIsland,
      onChat: (who, line) => UI.chat(who, line),
    });
    island.build();
  } else {
    course = new Course(world, pack, year, {
      onCorrect: handleCorrect,
      onWrong: handleWrong,
    });
    course.build();
  }

  const arena = island || course;

  // No nametag on your own Robloxian. It floats exactly where the middle answer
  // tag is and covers it, and the leaderboard already says who you are — plenty
  // of Roblox obbies turn their own off for the same reason. NPCs keep theirs,
  // because there the name is the point.
  avatar = new Avatar(state.look, { name: state.name, nametag: false, backpack: true });
  scene.add(avatar.root);

  humanoid = new Humanoid(world, avatar);
  humanoid.onLand = handleLand;
  humanoid.onTouch = handleTouch;
  humanoid.onDeath = handleDeath;
  humanoid.onJump = () => sfx.jump();
  humanoid.teleport(arena.spawn.x, arena.spawn.y, arena.spawn.z);

  // Beside the path and a little ahead, so the pupil walks past the guide on
  // the way out rather than leaving it behind them at the spawn.
  guide = isle
    ? new Guide(scene, year, -11, 0, arena.spawn.z + 5)
    : new Guide(scene, year, -9, 1, arena.spawn.z + 6);

  state.stage = 0;
  state.deaths = 0;
  state.runCoins = 0;
  state.huntsDone = 0;
  state.spokenStage = -1;
  state.playing = true;
  state.paused = false;
  respawnTimer = 0;
  wadeFrames = 0;

  orbit.reset();
  // Both worlds are laid out along +Z, and OrbitCamera's forward is
  // (-sin yaw, 0, -cos yaw) — so yaw = PI is the direction of play. Starting at
  // 0 pointed the camera at the back wall of the lobby.
  orbit.yaw = Math.PI;
  humanoid.facing = 0;            // the rig's own +Z is its front
  UI.showGame();
  UI.hideRespawn();
  UI.setModeCopy(state.mode);
  UI.setModeFurniture(isle);
  UI.setTitleBar(isle
    ? `${pack.name} · ${year.label}`
    : `${pack.name} · ${year.label}`);
  UI.drawFace(state.look);
  UI.setStats({
    name: state.name,
    stage: 0,
    total: isle ? island.totalHunts : course.totalStages,
    coins: state.coins,
  });
  UI.setGems((state.badges || []).length);
  UI.setHealth(1);
  UI.setQuestion(null);
  UI.hideCompass();

  // The guide greets the class in the lobby, in that year's English.
  const greet = pickLine(year.lines, 'greet');
  setTimeout(() => {
    if (!state.playing) return;
    guide.chat(greet);
    UI.chat(year.guide.name, greet);
  }, 700);

  if (isle) {
    // The first hunt waits for the greeting to finish, or the two talk over
    // each other and a Year 1 pupil hears neither.
    setTimeout(() => {
      if (!state.playing || !island) return;
      island.startRun();
    }, 4400);
  } else {
    setTimeout(() => {
      if (!state.playing) return;
      const line = `Today's words: ${pack.name}. Walk through the arch to start!`;
      guide.chat(line);
      UI.chat(year.guide.name, line);
    }, 5200);
  }

  save();
}

// The island's four districts: this week's pack, then its neighbours in the
// book, wrapping round. Neighbours rather than random ones, so the words a
// pupil meets in passing are the units either side of the one being taught.
function districtPacks(yearId, home) {
  const all = packsForYear(yearId);
  const at = Math.max(0, all.findIndex((p) => p.id === home.id));
  const out = [home];
  for (let k = 1; out.length < 4 && k < all.length; k++) {
    out.push(all[(at + k) % all.length]);
  }
  return out;
}

// ------------------------------------------------------------- the events

function handleLand(box) {
  sfx.land();
  // Only the obby has anything to say about what you landed on. On the island
  // every surface is just a surface.
  if (course) course.land(box);   // fires handleCorrect / handleWrong via the hooks
}

function handleCorrect(stage) {
  const year = yearById(state.yearId);
  state.stage = Math.max(state.stage, stage.index + 1);
  state.runCoins += year.coinsPerStage;
  state.coins += year.coinsPerStage;

  sfx.correct();
  UI.markQuestion(true);
  UI.setStats({ stage: state.stage, total: course.totalStages, coins: state.coins });

  // The model sentence is the reward: the word is heard again, in context.
  const line = fillLine(pickLine(year.lines, 'right'), { sentence: stage.question.reward });
  UI.chat(year.guide.name, line, 'good');
  say(line, { force: true });

  UI.showBurst({
    emoji: (stage.question.answer && stage.question.answer.emoji) || '🧱',
    word: 'CLEARED!',
    count: state.stage,
    of: course.totalStages,
    rewards: [{ icon: '🪙', n: year.coinsPerStage }, { icon: '⭐', n: 1 }],
  });

  const best = state.best[state.packId] || 0;
  if (state.stage > best) state.best[state.packId] = state.stage;

  if (stage.index === 0) awardBadge('First Steps', 'You cleared your first stage.');
  if (stage.index + 1 === Math.ceil(course.totalStages / 2)) {
    awardBadge('Halfway There', `${stage.index + 1} stages down.`);
  }
  save();
}

function handleWrong(stage) {
  const year = yearById(state.yearId);
  sfx.wrong();
  UI.markQuestion(false);
  const line = pickLine(year.lines, 'wrong');
  UI.chat(year.guide.name, line, 'bad');
  // The falling and the "oof" are about to happen; the coaching line waits for
  // the respawn screen so it is not talked over.
  state.pendingWrongLine = line;
}

// ---------------------------------------------------------- island events
//
// The island's contract, and the one thing in this mode worth guarding: a wrong
// answer costs NOTHING. No death, no reset, no lost coin. The sign says what it
// is and the hunt carries on, so a pupil who guesses wrong still comes away with
// an English sentence they did not have before.

function handleHunt(hunt) {
  const year = yearById(state.yearId);
  UI.setQuestion({ board: hunt.board, subtitle: `${hunt.subtitle} · ${hunt.number} of ${hunt.of}` });
  if (UI.el['q-sub']) UI.el['q-sub'].style.color = '';
  UI.setStats({ stage: island.hits, total: island.totalHunts });
  // The very first hunt can speak at once; every later one has to wait for the
  // praise it just interrupted to finish, or the reward sentence is talked over.
  speakHunt(hunt, hunt.number === 1 ? 250 : 2800, year);
}

function speakHunt(hunt, delay, year) {
  setTimeout(() => {
    if (!state.playing || !island || island.hunt !== hunt) return;
    if (year.speakPrompt) say(hunt.speak, { force: true });
  }, delay);
}

function handleHit(hunt) {
  const year = yearById(state.yearId);
  state.huntsDone += 1;
  state.runCoins += year.coinsPerStage;
  state.coins += year.coinsPerStage;

  sfx.correct();
  UI.markQuestion(true);
  UI.setStats({ stage: island.hits, total: island.totalHunts, coins: state.coins });

  // The model sentence is the reward, exactly as it is in the obby.
  const line = hitLine(year, hunt);
  UI.chat(year.guide.name, line, 'good');
  say(line, { force: true });
  UI.showBurst({
    emoji: hunt.target.emoji || '⭐',
    word: 'FOUND!',
    count: island.hits,
    of: island.totalHunts,
    rewards: [{ icon: '🪙', n: year.coinsPerStage }, { icon: '⭐', n: 1 }],
  });

  if (state.huntsDone === 1) awardBadge('Explorer', 'You found your first word on the island.');
  if (state.huntsDone === Math.ceil(island.totalHunts / 2)) {
    awardBadge('Halfway There', `${state.huntsDone} words found.`);
  }
  save();
}

function handleMiss(hunt, thing) {
  const year = yearById(state.yearId);

  // A Year 4 answer flag has a label, not a word — there is no sentence to be
  // had from it, so the guide coaches instead.
  if (!thing.word) {
    sfx.wrong();
    const line = pickLine(year.lines, 'wrong');
    UI.chat(year.guide.name, line, 'bad');
    say(line, { force: true });
    return;
  }

  sfx.click();          // a blip, not the buzzer — nothing has actually gone wrong
  const line = missLine(thing.word, hunt);
  UI.chat(`${thing.word.emoji} ${thing.word.word}`, line);
  say(line, { force: true });
}

// Every sign touched for the first time pays a coin and is written into the
// save, so the island fills up across a term rather than a lesson.
function handleDiscover(stand) {
  const list = state.found[stand.packId] || (state.found[stand.packId] = []);
  if (!list.includes(stand.word.word)) list.push(stand.word.word);

  state.coins += 1;
  state.runCoins += 1;
  sfx.coin();
  UI.setStats({ coins: state.coins });
  UI.toast(`${stand.word.emoji} ${stand.word.word}`, stand.word.sentence);

  const total = totalFound();
  if (total >= 25) awardBadge('Word Collector', '25 different words found.');
  if (total >= 60) awardBadge('Island Scholar', '60 different words found.');
  save();
}

function totalFound() {
  return Object.keys(state.found).reduce((n, k) => n + state.found[k].length, 0);
}

function finishIsland() {
  if (!state.playing) return;
  state.playing = false;
  sfx.fanfare();
  orbit.releaseLock();
  UI.hideCompass();

  const year = yearById(state.yearId);
  const pack = packById(state.packId);
  const line = pickLine(year.lines, 'finish');
  say(line, { force: true });

  awardBadge('Island Explorer', `${pack.name} · ${year.label}`);
  if (island.foundWords >= island.totalWords) {
    awardBadge('Every Sign Read', 'You touched every word on the island.');
  }
  save();

  UI.showFinish({
    line,
    title: 'Island complete!',
    stats: [
      { n: island.hits, label: 'Hunts' },
      { n: island.foundWords, label: 'Words found' },
      { n: state.runCoins, label: 'Coins' },
    ],
    words: wordWall(pack),
  });
}

// Which way to run. The arrow points at the district gate the beam is standing
// on, so the two agree — and both stop short of the answer itself.
function updateCompass() {
  if (!island || !island.beacon || !state.playing) { UI.hideCompass(); return; }
  const b = island.beacon;
  const dx = b.x - humanoid.pos.x;
  const dz = b.z - humanoid.pos.z;
  const dist = Math.hypot(dx, dz);
  // atan2(x, z) is 0 along +Z; the camera's own forward is (-sin yaw, -cos yaw),
  // which is that same convention rotated by PI.
  const rel = Math.atan2(dx, dz) - orbit.yaw - Math.PI;
  UI.setCompass((rel * 180) / Math.PI, `${b.name} · ${Math.round(dist)} studs`);
}

// The map is redrawn at a fixed 8 a second, not every frame. It is 260 canvas
// pixels of flat colour; at 60fps it is the most expensive thing on screen for
// no gain a child could see.
let mapTime = 0;
function updateMinimap() {
  if (!island || !state.playing) return;
  mapTime += 1;
  if (mapTime % 8) return;
  UI.drawMinimap({
    span: island.span,
    districts: island.districts.map((d) => ({ x: d.x, z: d.z, colour: d.accent })),
    player: { x: humanoid.pos.x, z: humanoid.pos.z },
    yaw: orbit.yaw,
    beacon: island.beacon,
    label: island.beacon ? island.beacon.name : 'Island',
  });
}

function handleTouch(trigger) {
  if (trigger.kind === 'lava') {
    humanoid.kill('lava');
    return;
  }

  // The island's shallows. Not a hazard — you just wade, and walk back out.
  if (trigger.kind === 'water') {
    humanoid.walkSpeed = ISLE_WADE;
    wadeFrames = 3;
    return;
  }

  if (trigger.kind === 'stand') { if (island) island.touchStand(trigger); return; }
  if (trigger.kind === 'flag') { if (island) island.touchFlag(trigger); return; }

  if (trigger.kind === 'coin' && !trigger.done) {
    trigger.done = true;
    sfx.coin();
    const data = trigger.data || {};
    const value = data.value || 1;
    state.coins += value;
    state.runCoins += value;
    UI.setStats({ coins: state.coins });
    // A word coin is free revision: it says its word and its sentence.
    if (data.word) {
      say(`${data.word.word}. ${data.word.sentence}`, { force: true });
      UI.toast(`${data.word.emoji} ${data.word.word}`, data.word.sentence);
    }
    return;
  }

  if (trigger.kind === 'checkpoint') {
    const pad = trigger.data && trigger.data.pad;
    if (pad && pad.claim()) {
      sfx.checkpoint();
      const year = yearById(state.yearId);
      const praise = year.praise[Math.floor(Math.random() * year.praise.length)];
      UI.toast(`✔ Checkpoint ${trigger.data.stage}`, praise);
      UI.chat(year.guide.name, praise, 'good');
      say(praise, { force: true });
    }
    pendingCheckpoint = trigger.data;
    return;
  }

  if (trigger.kind === 'finish' && !trigger.done) {
    trigger.done = true;
    finishCourse();
  }
}

function handleDeath() {
  state.deaths += 1;
  sfx.oof();
  avatar.explode(scene);
  respawnTimer = RESPAWN_SECONDS;

  const msg = state.pendingWrongLine || 'You fell in the lava!';
  state.pendingWrongLine = null;
  UI.showRespawn(msg);
  UI.setRespawnCount(RESPAWN_SECONDS);
  UI.setHealth(0);
  say(msg, { force: true });
}

function respawn() {
  const cp = course.checkpointFor(state.stage);
  course.resetFrom(cp.stage);
  avatar.respawn(scene);
  humanoid.revive(cp.x, cp.y, cp.z);
  state.spokenStage = -1;           // ask the question again on arrival
  UI.hideRespawn();
  UI.setHealth(1);
  sfx.respawn();
  orbit.reset();
}

function finishCourse() {
  if (course.finished) return;
  course.finished = true;
  state.playing = false;
  sfx.fanfare();
  orbit.releaseLock();

  const year = yearById(state.yearId);
  const pack = packById(state.packId);
  const line = pickLine(year.lines, 'finish');
  say(line, { force: true });

  awardBadge('Course Complete', `${pack.name} · ${year.label}`);
  if (state.deaths === 0) awardBadge('No Oofs', 'You finished without falling once.');
  if (state.coins >= 100) awardBadge('Coin Collector', '100 coins earned.');

  state.best[state.packId] = course.totalStages;
  save();

  UI.showFinish({
    line,
    title: 'Course complete!',
    stats: [
      { n: course.totalStages, label: 'Stages' },
      { n: state.runCoins, label: 'Coins' },
      { n: state.deaths, label: 'Oofs' },
    ],
    words: wordWall(pack),
  });
}

function awardBadge(name, sub) {
  if (state.badges.includes(name)) return;
  state.badges.push(name);
  UI.badge(name, sub);
  save();
}

// ---------------------------------------------------------- the questions
// A question is presented when the pupil reaches the launch platform of a
// stage, not when the course is built — so it is heard at the moment it is
// needed, with the bricks already in view.

function updateQuestionForPosition() {
  if (!course || !humanoid) return;
  const i = course.stageAtZ(humanoid.pos.z);
  if (i < 0 || i >= course.stages.length) {
    if (i < 0) UI.setQuestion(null);
    return;
  }
  course.setFocus(i);

  const stage = course.stages[i];
  if (stage.answered) return;
  if (state.spokenStage === i) return;

  state.spokenStage = i;
  UI.setQuestion(stage.question);
  if (UI.el['q-sub']) UI.el['q-sub'].style.color = '';

  const year = yearById(state.yearId);
  if (year.speakPrompt) say(stage.question.speak, { force: true });
}

function repeatQuestion() {
  if (island && island.hunt) { say(island.hunt.speak, { force: true }); return; }
  if (!course || !humanoid) return;
  const i = course.stageAtZ(humanoid.pos.z);
  const stage = course.stages[i];
  if (!stage) return;
  say(stage.question.speak, { force: true });
}

// ================================================================ input ====

function bindKeys() {
  const dom = renderer.domElement;
  dom.addEventListener('click', () => {
    if (state.playing && !state.paused && !UI.menuOpen && !UI.shopOpen) {
      resumeAudio();
      orbit.requestLock();
    }
  });

  orbit.onLockChange = (locked) => {
    // Losing the pointer mid-course is how Esc reaches the menu.
    if (!locked && state.playing && !state.paused && !UI.shopOpen && !UI.panelOpen) pause();
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.f = 1; break;
      case 'KeyS': case 'ArrowDown': input.b = 1; break;
      case 'KeyA': case 'ArrowLeft': input.l = 1; break;
      case 'KeyD': case 'ArrowRight': input.r = 1; break;
      case 'Space': input.jump = true; e.preventDefault(); break;
      case 'ShiftLeft': case 'ShiftRight': input.crouch = true; break;
      case 'KeyR': if (state.playing) forceReset(); break;
      case 'KeyH': repeatQuestion(); break;
      case 'KeyM': UI.toggleMap(); break;
      case 'KeyQ': UI.togglePanel('quests'); if (UI.panelOpen) refreshQuests(); break;
      case 'Escape':
        if (UI.panelOpen) UI.closePanels();
        else if (UI.shopOpen) UI.hideShop();
        else if (UI.menuOpen) resume();
        else if (state.playing) pause();
        break;
      default: break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.f = 0; break;
      case 'KeyS': case 'ArrowDown': input.b = 0; break;
      case 'KeyA': case 'ArrowLeft': input.l = 0; break;
      case 'KeyD': case 'ArrowRight': input.r = 0; break;
      case 'Space': input.jump = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.crouch = false; break;
      default: break;
    }
  });

  window.addEventListener('blur', () => {
    input.f = input.b = input.l = input.r = 0;
    input.jump = false;
  });
}

// Turn the key state into a world-space direction using the camera's yaw.
const moveVec = new THREE.Vector3();
const fwdVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();

function movementIntent() {
  orbit.forward(fwdVec);
  orbit.right(rightVec);
  moveVec.set(0, 0, 0);
  moveVec.addScaledVector(fwdVec, input.f - input.b);
  moveVec.addScaledVector(rightVec, input.r - input.l);
  return { x: moveVec.x, z: moveVec.z, jump: input.jump, crouch: input.crouch };
}

function pause() {
  if (!state.playing) return;
  state.paused = true;
  orbit.releaseLock();
  cancelSpeech();
  UI.showMenu();
}

function resume() {
  state.paused = false;
  UI.hideMenu();
  orbit.requestLock();
}

function forceReset() {
  if (!state.playing) return;
  // On the island there is nothing to die of, so R is a walk home rather than a
  // respawn: back to the plaza, still holding whatever you have found.
  if (island) {
    island.returnToPlaza(humanoid);
    orbit.reset();
    orbit.yaw = Math.PI;
    UI.toast('Back at the plaza', 'Everything you found is still yours.');
    return;
  }
  if (humanoid.dead) return;
  humanoid.kill('reset');
}

// ================================================================= loop ====

// One frame of simulation, separated from requestAnimationFrame so it can also
// be driven by hand. An automated browser throttles a background tab to about
// one animation frame a second, which makes any wall-clock test of falling,
// dying or respawning meaningless — RBX.tick() runs this directly instead.
function step(dt, t) {
  if (world) world.update(dt, t);
  if (!state.playing || !humanoid) return;

  if (respawnTimer > 0) {
    respawnTimer -= dt;
    UI.setRespawnCount(Math.max(0, Math.ceil(respawnTimer)));
    avatar.updatePieces(dt, scene);
    if (respawnTimer <= 0) respawn();
  } else if (!state.paused) {
    humanoid.update(dt, movementIntent());
    // The shallows slow you while you are in them and only while you are in
    // them; the trigger re-arms this every frame you are standing in the water.
    if (wadeFrames > 0 && --wadeFrames === 0) humanoid.walkSpeed = WALKSPEED;
    if (course) updateQuestionForPosition();
    if (island) island.update(dt, humanoid, camera);
  }

  humanoid.syncAvatar(dt, camera);
  // The shadow box travels with the player, which is what lets it be small
  // enough to give crisp shadows anywhere in either world.
  keepSunOver(scene, humanoid.pos);
  UI.setHealth(humanoid.health / 100);
  orbit.update(dt, humanoid.head, world.solids);
  if (course) course.faceCamera(camera);
  if (island) { island.faceCamera(camera); updateCompass(); updateMinimap(); }
  if (guide) guide.update(dt, camera, humanoid.pos);

  // The Robloxian is invisible in first person, as in the real client.
  avatar.root.visible = !orbit.firstPerson && !avatar.dead;
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());

  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) { fps = frames / fpsTime; frames = 0; fpsTime = 0; }

  // The avatar editor has its own little scene.
  if (UI.el['avatar-screen'] && !UI.el['avatar-screen'].classList.contains('hidden')) {
    UI.renderPreview(dt);
  }

  step(dt, clock.elapsedTime);

  if (renderer && scene) renderer.render(scene, camera);
}

// ============================================================== saving =====

function savePayload() {
  return {
    mode: state.mode,
    yearId: state.yearId,
    packId: state.packId,
    look: state.look,
    name: state.name,
    coins: state.coins,
    owned: state.owned,
    badges: state.badges,
    best: state.best,
    found: state.found,
  };
}

function applyCloudSave(d) {
  if (!d || typeof d !== 'object') return;
  state.mode = d.mode === 'explore' ? 'explore' : 'obby';
  state.yearId = d.yearId || state.yearId;
  state.packId = d.packId || state.packId;
  state.look = Object.assign({}, DEFAULT_AVATAR, d.look || state.look);
  state.name = d.name || state.name;
  state.coins = d.coins ?? state.coins;
  state.owned = d.owned || state.owned;
  state.badges = d.badges || state.badges;
  state.best = d.best || state.best;
  state.found = d.found || state.found;
  if (!packById(state.packId)) state.packId = defaultPackForYear(state.yearId).id;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(savePayload())); } catch (e) { /* noop */ }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(savePayload()));
  } catch (e) { /* a locked-down school browser must not crash the game */ }
  scheduleCloudSave(state);
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { state.packId = defaultPackForYear(state.yearId).id; return; }
    const d = JSON.parse(raw);
    state.mode = d.mode === 'explore' ? 'explore' : 'obby';
    state.yearId = d.yearId || 1;
    state.packId = d.packId || defaultPackForYear(state.yearId).id;
    state.look = Object.assign({}, DEFAULT_AVATAR, d.look || {});
    state.name = d.name || 'Player';
    state.coins = d.coins || 0;
    state.owned = d.owned || [];
    state.badges = d.badges || [];
    state.best = d.best || {};
    state.found = d.found || {};
  } catch (e) {
    state.packId = defaultPackForYear(state.yearId).id;
  }
  if (!packById(state.packId)) state.packId = defaultPackForYear(state.yearId).id;
}

// ================================================================ hooks ====

const hooks = {
  onPlay: () => openAvatarEditor(),
  onContinue: () => { openAvatarEditor(); },
  onSpawn: () => {
    state.name = UI.playerName;
    save();
    if (cloudEnabled()) flushCloudSave(savePayload(), state.name);
    startGame();
  },
  onMenu: () => pause(),
  onResume: () => resume(),
  onReset: () => { resume(); forceReset(); },
  onQuit: () => { UI.hideMenu(); state.playing = false; openTitle(); },
  onRepeat: () => repeatQuestion(),
  onPlayAgain: () => startGame(),
  onBackToTitle: () => openTitle(),
  onSpeechToggle: (v) => setSpeechEnabled(v),
  onMusicToggle: (v) => setMusicEnabled(v),
  onSensitivity: (v) => { orbit.sensitivity = 0.00065 * v; },
  onJumpDown: (down) => { input.jump = down; },

  onShopOpen: () => {
    if (state.playing) { state.paused = true; orbit.releaseLock(); }
    UI.buildShop(state.coins, state.owned, state.look.hat, buyHat, wearHat);
  },
  onShopClose: () => { if (state.playing) { state.paused = false; orbit.requestLock(); } },

  onHint: () => giveHint(),
  // The side panels are read, not played through, so they let the mouse go —
  // but they never pause the world, because pausing an open island to read a
  // checklist is how a pupil loses their place.
  onPanelOpen: (name) => {
    orbit.releaseLock();
    if (name === 'quests') refreshQuests();
    if (name === 'bag') refreshBag();
  },
};

// -------------------------------------------------------------------- hint
// The hint never names the sign. It names the street, which is exactly what
// the beam and the compass already say — said again, in English, out loud.
function giveHint() {
  const year = yearById(state.yearId);
  if (island && island.hunt) {
    const b = island.beacon;
    const line = b
      ? `Look in ${b.name}. Follow the light!`
      : 'Read the sentence, then run to the right flag.';
    UI.chat(year.guide.name, line);
    say(line, { force: true });
    return;
  }
  if (course) {
    repeatQuestion();
    return;
  }
  repeatQuestion();
}

// ------------------------------------------------------------ the panels
// Both are built on demand rather than kept in step every frame: a pupil opens
// them a handful of times a run, and a per-frame rebuild of forty nodes is
// forty nodes of garbage a second on a school laptop.
function refreshQuests() {
  if (island) {
    const rows = island.checklist();
    const b = island.beacon;
    UI.setQuests(
      rows,
      `${island.hits} of ${island.totalHunts} found`,
      b ? `Hint: the light is over <b>${b.name}</b>. The sign is somewhere down that street.`
        : 'Hint: read the sentence, then run to the flag that finishes it.',
    );
    return;
  }
  if (course) {
    UI.setQuests(
      course.checklist(),
      `Stage ${Math.min(state.stage + 1, course.totalStages)} of ${course.totalStages}`,
      'Hint: the brick with the right answer is the one that holds you up.',
    );
  }
}

function refreshBag() {
  const arena = island || course;
  const words = arena && arena.metWords ? arena.metWords() : [];
  UI.setBag(words, words.length
    ? `${words.length} word${words.length === 1 ? '' : 's'} met so far`
    : '');
}

function buyHat(hat) {
  if (state.coins < hat.cost || state.owned.includes(hat.id)) return;
  state.coins -= hat.cost;
  state.owned.push(hat.id);
  sfx.badge();
  UI.toast(`Bought ${hat.name}`, `−${hat.cost} coins`);
  wearHat(hat.id);
}

function wearHat(id) {
  state.look.hat = id;
  if (avatar) avatar.setHat(id);
  UI.setStats({ coins: state.coins });
  UI.buildShop(state.coins, state.owned, state.look.hat, buyHat, wearHat);
  save();
}

// ============================================================== debug ======
// Mirrors window.MC in the Minecraft project, so the same testing habits work.

function debugApi() {
  return {
    get state() { return state; },
    get course() { return course; },
    get island() { return island; },
    get humanoid() { return humanoid; },
    get world() { return world; },
    YEARS, PACKS,

    help() {
      console.log([
        "RBX.mode('explore')     choose the game ('obby' or 'explore')",
        'RBX.setYear(4)          choose the class (1, 2 or 4)',
        "RBX.setPack('past')     choose the word pack, then RBX.play()",
        'RBX.biome()             the pack world (town, beach, stadium…)',
        'RBX.play()              build and start the chosen game',
        'RBX.stage(7)            teleport to the launch platform of stage 7',
        'RBX.answer(true)        jump onto the right (or wrong) brick',
        'RBX.tp(x, y, z)         teleport anywhere',
        'RBX.give(50)            add coins',
        'RBX.kill()              fall in the lava',
        'RBX.finish()            jump to the finish line',
        'RBX.question()          the current question object',
        '--- island only ---',
        'RBX.hunt()              the word being hunted for right now',
        'RBX.find(true)          touch the right (or a wrong) sign',
        "RBX.district('toys')    teleport to a district gate",
        'RBX.plaza()             teleport back to the fountain',
        'RBX.tick(2)             run 2 seconds of physics without waiting',
        "RBX.hold('w ', 1)       hold W and Space for a second",
        'RBX.fps()               frames per second',
        'RBX.physics()           the Roblox constants this build uses',
      ].join('\n'));
    },

    mode(id) {
      if (id === 'obby' || id === 'explore') { state.mode = id; refreshPickers(); }
      return state.mode;
    },
    setYear(id) { state.yearId = Number(id); refreshPickers(); return yearById(id).label; },
    setPack(id) { if (packById(id)) state.packId = id; return state.packId; },
    biome() {
      const look = (island && island.worldLook) || (course && course.worldLook);
      return look ? { id: look.id, name: look.name, landmark: look.landmark } : null;
    },
    play() { startGame(); },
    tp(x, y, z) { humanoid.teleport(x, y, z); },
    give(n) { state.coins += n; UI.setStats({ coins: state.coins }); save(); return state.coins; },
    kill() { humanoid.kill('debug'); },

    // ------------------------------------------------------------- island
    hunt() { return island ? island.hunt : null; },

    // Touch a sign without running to it. `false` picks any wrong sign, which is
    // how the mode's most important rule gets tested: nothing may happen to you.
    find(correct = true) {
      if (!island) return 'not on the island';
      const h = island.hunt;
      if (!h) return 'no hunt running';
      if (h.kind === 'grammar') {
        const flag = island.flags.find((f) => !!f.trigger.data.correct === !!correct);
        if (!flag) return 'no such flag';
        flag.cool = 0;
        humanoid.teleport(flag.x, flag.y + 0.2, flag.z + 2);
        return `flag "${flag.label}": ${island.touchFlag(flag.trigger)}`;
      }
      const stand = correct ? island.standForWord(h.target.word) : island.wrongStand(h);
      if (!stand) return 'no such sign';
      stand.cool = 0;
      humanoid.teleport(stand.x, stand.y + 1.2, stand.z);
      return `sign "${stand.word.word}": ${island.touchStand(stand.trigger)}`;
    },

    district(id) {
      if (!island) return 'not on the island';
      const d = island.districtById(id);
      if (!d) return `districts: ${island.districts.map((x) => x.pack.id).join(', ')}`;
      humanoid.teleport(d.gate.x, 1, d.gate.z);
      return `at the ${d.pack.name} gate`;
    },

    plaza() {
      if (!island) return 'not on the island';
      island.returnToPlaza(humanoid);
      return 'at the fountain';
    },

    stage(i) {
      if (!course) return 'not in the obby';
      const s = course.stages[i];
      if (!s) return 'no such stage';
      humanoid.teleport(0, s.y + 1, s.z);
      state.spokenStage = -1;
      return `stage ${i + 1}/${course.totalStages}`;
    },

    // Land on a brick of the current stage without having to make the jump.
    answer(correct = true) {
      if (!course) return 'not in the obby';
      const i = course.stageAtZ(humanoid.pos.z);
      const s = course.stages[i];
      if (!s) return 'not on a stage';
      const brick = s.bricks.find((b) => b.choice.correct === !!correct && !b.fallen);
      if (!brick) return 'no such brick left';
      humanoid.teleport(brick.x, brick.y + 0.1, brick.z);
      humanoid.grounded = true;
      const res = course.land(brick.box);
      return `stage ${i + 1}: ${res}`;
    },

    finish() {
      if (island) { island.finish(); return 'island finished'; }
      humanoid.teleport(0, course.finishY + 1, course.finishZ + 4);
      return 'at the finish';
    },

    question() {
      if (island) return island.hunt;
      const i = course.stageAtZ(humanoid.pos.z);
      return course.stages[i] ? course.stages[i].question : null;
    },

    // Advance the simulation `seconds` worth, in fixed 1/60 slices, without
    // waiting on requestAnimationFrame.
    tick(seconds = 1, dt = 1 / 60) {
      const n = Math.max(1, Math.round(seconds / dt));
      for (let i = 0; i < n; i++) step(dt, clock.elapsedTime + i * dt);
      return { pos: { ...humanoid.pos }, dead: humanoid.dead, grounded: humanoid.grounded };
    },

    // Hold a key down for a while, the way a pupil would.
    hold(keys, seconds = 1) {
      const set = (v) => String(keys).split('').forEach((k) => {
        if (k === 'w') input.f = v; else if (k === 's') input.b = v;
        else if (k === 'a') input.l = v; else if (k === 'd') input.r = v;
        else if (k === ' ') input.jump = !!v;
      });
      set(1);
      const r = this.tick(seconds);
      set(0);
      return r;
    },

    fps() { return Math.round(fps); },
    physics() {
      return {
        gravity: GRAVITY, walkSpeed: WALKSPEED, jumpPower: JUMPPOWER,
        jumpRise: +JUMP_RISE.toFixed(2), jumpReach: +JUMP_REACH.toFixed(2), gap: SAFE_GAP,
      };
    },
    save, load,
    reset() { localStorage.removeItem(SAVE_KEY); location.reload(); },
  };
}

// ============================================================== go ========
boot();
