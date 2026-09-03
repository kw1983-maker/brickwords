// ============================================================================
//  parts.js — everything the world is built out of, and what you can bump into.
// ============================================================================
//
// Roblox worlds are made of Parts, so this is a small library of them: bricks,
// lava, checkpoint pads, coins, signs. Nothing here knows any English — it just
// builds and registers geometry.
//
// Collision is deliberately simple. Every solid part contributes one axis-
// aligned box to `PartWorld.solids`, and the controller sweeps its hull against
// that list. An obby is a few dozen platforms, not a voxel world, so a linear
// scan is faster than any structure that would index it.

import * as THREE from 'three';
import { part, bc, studTexture } from './rbx.js';
import { buildWordItem } from './items.js';

// ---------------------------------------------------------------- canvases
// Drawing to a canvas is how a part gets a face: an emoji, a word, a question.
// Roblox would call these Decals and SurfaceGuis.

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Fit a line of text to a width by shrinking the font until it fits.
export function fitText(g, text, maxW, startPx, family, weight = '700') {
  let px = startPx;
  do {
    g.font = `${weight} ${px}px ${family}`;
    if (g.measureText(text).width <= maxW) break;
    px -= 2;
  } while (px > 10);
  return px;
}

export const UI_FONT = '"Nunito", system-ui, sans-serif';
export const DISPLAY_FONT = '"Fredoka", "Nunito", system-ui, sans-serif';
export const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

// Design-system colours for canvas-drawn faces (hex strings).
export const DS = {
  ink: '#0f1620',
  text: '#14202d',
  muted: '#5f7086',
  gold: '#f5b81d',
  grass: '#34b24a',
  sky: '#3a8ee0',
  purple: '#7d2fb8',
  brick: '#d43a2c',
};

// Wrap a sentence over as many lines as it needs, then draw it centred.
export function drawWrapped(g, text, cx, cy, maxW, px, lineH, font = UI_FONT, weight = '700') {
  g.font = `${weight} ${px}px ${font}`;
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const y0 = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => g.fillText(l, cx, y0 + i * lineH));
  return lines.length;
}

// Per-word LEGO item PNGs live here (slug matches js/words.js entries).
export const WORD_IMG_DIR = 'game/assets/words/';

export function wordSlug(w) {
  return String(w).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Emoji-only canvas shown until a PNG loads (or if the file is missing).
export function itemFallbackFace(emoji) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (!emoji) return;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `168px ${EMOJI_FONT}`;
    g.fillText(emoji, w / 2, h / 2);
  });
}

// The name strip under the floating item picture on a word stand.
export function nameplateFace(word) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = DS.purple;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const px = fitText(g, word, w - 24, 52, DISPLAY_FONT);
    g.font = `700 ${px}px ${DISPLAY_FONT}`;
    drawWrapped(g, word, w / 2, h / 2, w - 24, px, px * 1.12, DISPLAY_FONT, '700');
  });
}

// Try a transparent PNG for this word; leave the emoji fallback on error.
export function loadItemImage(word, meshes) {
  if (!meshes || !meshes.length) return;
  const slug = wordSlug(word);
  if (!slug) return;
  const url = new URL(`${WORD_IMG_DIR}${slug}.png`, document.baseURI).href;
  const img = new Image();
  img.onload = () => {
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    for (const mesh of meshes) {
      mesh.material.map = tex;
      mesh.material.transparent = true;
      mesh.material.needsUpdate = true;
    }
  };
  img.onerror = () => {
    console.warn('[BrickWords] missing word image:', url);
  };
  img.src = url;
}

// A brick-built 3D object for this word — same parts language as the minifig.
export function floatingItemProp(word, _emoji, _size = 3.4) {
  return buildWordItem(word);
}

// Floating item + nameplate above an obby answer brick (faces the launch platform).
export function obbyAnswerProp(x, y, z, word, emoji, group) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.rotation.y = Math.PI;
  group.add(holder);

  const pad = part(4.4, 0.3, 4.4, bc('Institutional white'), { repeat: [4, 4] });
  pad.position.y = 0.75;
  holder.add(pad);

  const itemProp = floatingItemProp(word, emoji, 3.2);
  itemProp.position.set(0, 0.95, 0);
  holder.add(itemProp);

  const tag = part(3.6, 0.7, 0.3, bc('Institutional white'), { studs: false, castShadow: false });
  tag.position.set(0, 0.82, 2.05);
  holder.add(tag);
  const nameDecal = decalPlane(nameplateFace(word), 3.3, 0.62);
  nameDecal.position.set(0, 0.82, 2.18);
  holder.add(nameDecal);

  return { group: holder, itemProp };
}

export function fadeMeshes(root, fade) {
  root.traverse((child) => {
    const mats = child.material
      ? (Array.isArray(child.material) ? child.material : [child.material])
      : [];
    for (const m of mats) {
      m.transparent = true;
      m.opacity = fade;
    }
  });
}

// The face of an answer brick: a big picture with the word under it. Year 1 gets
// the picture alone unless the word is wanted too, which is what `showWord` is.
export function answerFace(emoji, word, opts = {}) {
  const bg = opts.bg || '#ffffff';
  const fg = opts.fg || DS.purple;
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);

    const hasWord = opts.showWord !== false && word;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    if (emoji) {
      g.font = `${hasWord ? 112 : 168}px ${EMOJI_FONT}`;
      g.fillText(emoji, w / 2, hasWord ? h * 0.38 : h * 0.5);
    }
    if (hasWord) {
      g.fillStyle = fg;
      const px = fitText(g, word, w - 28, emoji ? 50 : 76, DISPLAY_FONT);
      g.font = `700 ${px}px ${DISPLAY_FONT}`;
      if (emoji) g.fillText(word, w / 2, h * 0.80);
      else drawWrapped(g, word, w / 2, h * 0.5, w - 28, px, px * 1.15);
    }
  });
}

// The question billboard hanging over a stage.
export function boardFace(title, subtitle, opts = {}) {
  return canvasTexture(1024, 340, (g, w, h) => {
    const r = 26;
    g.fillStyle = opts.bg || 'rgba(255,255,255,0.97)';
    g.beginPath();
    g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r);
    g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.closePath();
    g.fill();
    g.strokeStyle = opts.border || DS.sky;
    g.lineWidth = 12;
    g.stroke();

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = opts.fg || DS.gold;
    const px = fitText(g, title, w - 90, 104, DISPLAY_FONT, '700');
    drawWrapped(g, title, w / 2, subtitle ? h * 0.38 : h * 0.5, w - 90, px, px * 1.1, DISPLAY_FONT, '700');

    if (subtitle) {
      g.fillStyle = opts.subFg || DS.muted;
      const sp = fitText(g, subtitle, w - 110, 54, UI_FONT, '600');
      g.font = `600 ${sp}px ${UI_FONT}`;
      g.fillText(subtitle, w / 2, h * 0.78);
    }
  });
}

// A flat picture plane, used for decals on top of bricks and for signs.
export function decalPlane(texture, w, h, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.isDecal = true;
  return mesh;
}

// ---------------------------------------------------------------- the world
// One PartWorld holds the scene graph and the two lists the controller reads:
// `solids` (things you stand on and bump into) and `triggers` (things that
// happen when you touch them).

export class PartWorld {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.solids = [];
    this.triggers = [];
    this.animated = [];        // parts with a per-frame update (coins, lava)
  }

  // Add a mesh at a stud position, optionally registering it as solid.
  place(mesh, x, y, z, opts = {}) {
    mesh.position.set(x, y, z);
    (opts.parent || this.root).add(mesh);
    if (opts.solid !== false) this.registerSolid(mesh, opts);
    return mesh;
  }

  registerSolid(mesh, opts = {}) {
    const s = mesh.userData.size;
    if (!s) return null;
    // World position, so a part parented into a positioned group still lands
    // in the right place in the collision list.
    mesh.updateWorldMatrix(true, false);
    const p = new THREE.Vector3();
    mesh.getWorldPosition(p);
    const box = {
      mesh,
      kind: opts.kind || 'brick',
      data: opts.data || null,
      x0: p.x - s.x / 2, x1: p.x + s.x / 2,
      y0: p.y - s.y / 2, y1: p.y + s.y / 2,
      z0: p.z - s.z / 2, z1: p.z + s.z / 2,
      dead: false,
    };
    mesh.userData.box = box;
    this.solids.push(box);
    return box;
  }

  // A trigger is a box you pass through: lava, a coin, a checkpoint, the finish.
  addTrigger(kind, x, y, z, sx, sy, sz, data = null) {
    const t = {
      kind, data, mesh: null, done: false, group: null,
      x0: x - sx / 2, x1: x + sx / 2,
      y0: y - sy / 2, y1: y + sy / 2,
      z0: z - sz / 2, z1: z + sz / 2,
    };
    this.triggers.push(t);
    return t;
  }

  // Remove one solid — how an answer brick drops out from under a wrong jump.
  removeSolid(box) {
    if (!box) return;
    box.dead = true;
    const i = this.solids.indexOf(box);
    if (i >= 0) this.solids.splice(i, 1);
  }

  remove(mesh) {
    if (!mesh) return;
    if (mesh.userData.box) this.removeSolid(mesh.userData.box);
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  // Throw away a whole group of parts (one stage, the lobby, the finish).
  clearGroup(group) {
    if (!group) return;
    const boxes = [];
    group.traverse((o) => { if (o.userData.box) boxes.push(o.userData.box); });
    boxes.forEach((b) => this.removeSolid(b));
    this.triggers = this.triggers.filter((t) => t.group !== group);
    this.animated = this.animated.filter((a) => a.group !== group);
    if (group.parent) group.parent.remove(group);
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  group(name) {
    const g = new THREE.Group();
    g.name = name;
    this.root.add(g);
    return g;
  }

  update(dt, t) {
    for (const a of this.animated) a.update(dt, t);
  }
}

// ------------------------------------------------------------- the furniture

// The grey studded baseplate every Roblox place starts life on. `top` is where
// its surface sits: an obby floats high above its baseplate, so the course does
// not fight it for the same y — which is exactly what a shared y = 0 caused.
// 2600 studs wide, not 900. Now that the fog starts at 620 the old plate's far
// edge was a hard grey line against the sky in the middle of the screen; at this
// size the fog swallows the edge and it reads as the endless Roblox baseplate it
// is meant to be.
export function baseplate(world, size = 2600, top = -45) {
  const plate = part(size, 4, size, bc('Medium stone grey'), { repeat: [size / 4, size / 4] });
  plate.castShadow = false;
  plate.receiveShadow = false;
  // Deliberately NOT solid. It is the distant ground you see under an obby,
  // not something to land on — anything that falls past the lava should keep
  // going and hit the void, not come to rest out of reach on the plate.
  world.place(plate, 0, top - 2, 0, { solid: false });

  // Roblox's baseplate has the darker grid printed over the studs.
  const grid = new THREE.GridHelper(size, size / 8, 0x7c7b7e, 0x7c7b7e);
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  grid.position.y = top + 0.03;
  world.root.add(grid);
  return plate;
}

// A decal laid flat on the top of a part. Rotating a plane -90° about X points
// its normal up but leaves the artwork pointing away from the player, i.e.
// upside down from where they read it — hence the second turn in its own plane.
export function topDecal(texture, w, h) {
  const mesh = decalPlane(texture, w, h);
  mesh.rotateX(-Math.PI / 2);
  mesh.rotateZ(Math.PI);
  return mesh;
}

// A plain platform. This is 95% of an obby. `y` is the TOP surface, which is
// what the course builder actually thinks in.
export function platform(world, x, y, z, sx, sz, colour, opts = {}) {
  const h = opts.h || 1;
  const p = part(sx, h, sz, colour, Object.assign({ repeat: [sx, sz] }, opts));
  return world.place(p, x, y - h / 2, z, opts);
}

// Lava. Not solid — you fall into it, which is the point — but it triggers.
export function lavaPool(world, x, y, z, sx, sz, group) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff5722,
    emissive: 0xff3300,
    emissiveIntensity: 0.9,
    roughness: 0.65,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, 1, sz), mat);
  mesh.position.set(x, y, z);
  (group || world.root).add(mesh);

  const trig = world.addTrigger('lava', x, y + 2, z, sx, 8, sz);
  trig.group = group;

  const anim = {
    group,
    update: (dt, t) => {
      mesh.material.emissiveIntensity = 0.75 + Math.sin(t * 2.2) * 0.22;
      mesh.position.y = y + Math.sin(t * 1.3) * 0.12;
    },
  };
  world.animated.push(anim);
  return mesh;
}

// A Roblox SpawnLocation: the pad you claim as your checkpoint.
export function checkpointPad(world, x, y, z, stage, group) {
  const pad = part(6, 1, 6, bc('Medium stone grey'), { repeat: [6, 6] });
  world.place(pad, x, y - 0.5, z, { parent: group, kind: 'brick' });

  // The spawn decal: Roblox's is a circular arrow badge, with the stage number.
  const face = canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 16;
    g.beginPath(); g.arc(w / 2, h / 2, 88, 0.6, Math.PI * 1.72); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.moveTo(w / 2 + 104, h / 2 - 40); g.lineTo(w / 2 + 52, h / 2 - 12);
    g.lineTo(w / 2 + 106, h / 2 + 20); g.closePath(); g.fill();
    g.font = `800 76px ${UI_FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(stage), w / 2, h / 2 + 4);
  });
  const decal = topDecal(face, 5, 5);
  decal.position.set(x, y + 0.04, z);
  (group || world.root).add(decal);

  // The glowing ring that says "this one is yours now".
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3f6fd8, emissive: 0x3f6fd8, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.9,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.16, 8, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.14, z);
  (group || world.root).add(ring);

  const rec = {
    group, claimed: false, stage, x, y, z,
    claim() {
      if (this.claimed) return false;
      this.claimed = true;
      ringMat.color.setHex(0x2fbf5f);
      ringMat.emissive.setHex(0x2fbf5f);
      ringMat.emissiveIntensity = 1.1;
      pad.material.forEach((m) => m.color.setHex(0x3fa860));
      return true;
    },
    update: (dt, t) => { ring.position.y = y + 0.14 + Math.sin(t * 2) * 0.08; },
  };
  world.animated.push(rec);

  const trig = world.addTrigger('checkpoint', x, y + 2.5, z, 6, 7, 6, { stage, x, y, z, pad: rec });
  trig.group = group;
  return rec;
}

// A spinning coin. Roblox obbies are paved with them.
export function coin(world, x, y, z, group, data = null) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd24a, emissive: 0xffae00, emissiveIntensity: 0.45,
    metalness: 0.55, roughness: 0.35,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.18, 22), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  (group || world.root).add(mesh);

  const coinGlow = glowSprite(0xffd24a, 3.2, 0.7);
  mesh.add(coinGlow);
  const trig = world.addTrigger('coin', x, y, z, 3, 4, 3, data);
  trig.group = group;
  trig.mesh = mesh;

  world.animated.push({
    group,
    update: (dt, t) => {
      if (trig.done) { mesh.visible = false; return; }
      mesh.rotation.z = t * 2.4;
      mesh.position.y = y + Math.sin(t * 2.6) * 0.22;
    },
  });
  return mesh;
}

// A vertical sign on a post — how a word stays readable while you run at it.
export function signBoard(world, x, y, z, texture, w = 6, h = 3, group, opts = {}) {
  const g = group || world.root;
  if (opts.post !== false && y > 1) {
    const post = part(0.4, y, 0.4, bc('Dark stone grey'), { studs: false });
    post.position.set(x, y / 2, z);
    g.add(post);
  }
  const board = part(w + 0.5, h + 0.5, 0.35, opts.frame || bc('Institutional white'), { studs: false });
  board.position.set(x, y + h / 2, z);
  g.add(board);

  const front = decalPlane(texture, w, h);
  front.position.set(x, y + h / 2, z + 0.2);
  g.add(front);

  const back = decalPlane(texture, w, h);
  back.position.set(x, y + h / 2, z - 0.2);
  back.rotation.y = Math.PI;
  g.add(back);

  return board;
}

// A billboard that always faces the player, for the question over a stage.
export function billboard(world, x, y, z, texture, w, h, group) {
  const mesh = decalPlane(texture, w, h, { side: THREE.DoubleSide });
  mesh.position.set(x, y, z);
  mesh.userData.billboard = true;
  (group || world.root).add(mesh);
  return mesh;
}

// Floating item picture + nameplate, for obby answer tags.
export function wordBillboard(world, x, y, z, word, emoji, w, h, group) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.userData.billboard = true;
  (group || world.root).add(holder);
  const itemMeshes = [];
  const item = decalPlane(itemFallbackFace(emoji), w, h * 0.62, {
    side: THREE.DoubleSide, depthWrite: false,
  });
  item.position.y = h * 0.19;
  holder.add(item);
  itemMeshes.push(item);
  const name = decalPlane(nameplateFace(word), w, h * 0.28, { side: THREE.DoubleSide });
  name.position.y = -h * 0.36;
  holder.add(name);
  loadItemImage(word, itemMeshes);
  return holder;
}

// The classic obby start arch.
export function startArch(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const colour = opts.colour !== undefined ? opts.colour : bc('Bright yellow');
  [-7, 7].forEach((dx) => {
    const leg = part(2, 14, 2, colour);
    world.place(leg, x + dx, y + 7, z, { parent: g });
  });
  const top = part(18, 2, 2, colour);
  world.place(top, x, y + 15, z, { parent: g });
  return g;
}

// A Roblox truss ladder — climbable, and the fastest way up a level.
export function truss(world, x, y, z, height, group) {
  const g = group || world.root;
  const mat = new THREE.MeshStandardMaterial({ color: bc('Dark stone grey'), roughness: 0.5, metalness: 0.3 });
  const holder = new THREE.Group();
  [-0.9, 0.9].forEach((dx) => [-0.9, 0.9].forEach((dz) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, height, 0.22), mat);
    bar.position.set(dx, height / 2, dz);
    holder.add(bar);
  }));
  for (let h = 1; h < height; h += 2) {
    [-0.9, 0.9].forEach((dz) => {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2), mat);
      rung.position.set(0, h, dz);
      holder.add(rung);
    });
  }
  holder.position.set(x, y, z);
  g.add(holder);
  const t = world.addTrigger('truss', x, y + height / 2, z, 2.8, height, 2.8, { x, z, top: y + height });
  t.group = group;
  return holder;
}

// The winner's podium at the end of a course.
export function podium(world, x, y, z, group) {
  const g = group || world.root;
  const steps = [[0, 5, 'Bright yellow'], [-7, 3.2, 'Medium stone grey'], [7, 2, 'Reddish brown']];
  steps.forEach(([dx, hgt, colour]) => {
    const step = part(6, hgt, 6, bc(colour));
    world.place(step, x + dx, y + hgt / 2, z, { parent: g });
  });
  return g;
}

// ============================================================================
//  The island. Everything below is used only by the explore mode.
// ============================================================================
//
// The obby is a corridor of platforms over lava; the island is a flat plateau
// you run around. So it needs different furniture: ground you cannot fall off,
// a sea you cannot drown in, buildings, trees, and the word stands that are the
// whole point of the mode.

// The plateau. One solid slab with its top at y = 0 — a single box in the
// collision list, so the entire island costs the controller one AABB.
export function plateau(world, size, thickness, colour, group, opts = {}) {
  // One stud per stud. This is the single biggest thing that makes a surface
  // read as Roblox rather than as a green plane, and it is worth the moire in
  // the far distance — Roblox has that too, and mipmaps take most of it out.
  const slab = part(size, thickness, size, colour, { repeat: [size, size] });
  slab.castShadow = false;
  if (opts.tex) paintTop(slab, opts.tex, size, size, opts.texScale || 8);
  return world.place(slab, 0, -thickness / 2, 0, { parent: group, kind: 'ground' });
}

// The sea, and the reason there is no drowning in this game.
//
// The water's floor is SOLID with its top at `top` (−1.5), which is under the
// controller's STEP_HEIGHT of 2. A pupil can therefore wade off the edge of the
// island into the shallows and simply walk back up again — no swim state, no
// drowning, no rescue teleport, and not one line of new controller code. The
// 'water' trigger only slows them down while they are in it.
export function seaPlane(world, top, size, group, opts = {}) {
  const g = group || world.root;

  const floorColour = opts.floor !== undefined ? opts.floor : bc('Sand blue');
  const waterColour = opts.water !== undefined ? opts.water : 0x2ea6dd;
  const floor = part(size, 60, size, floorColour, { studs: false, castShadow: false });
  world.place(floor, 0, top - 30, 0, { parent: g, kind: 'ground' });

  const mat = new THREE.MeshStandardMaterial({
    color: waterColour, transparent: true, opacity: 0.7, roughness: 0.12, metalness: 0.2,
  });
  const surf = new THREE.Mesh(new THREE.BoxGeometry(size, 0.5, size), mat);
  surf.position.set(0, top + 0.2, 0);
  surf.receiveShadow = false;
  g.add(surf);

  // Waist-deep only: the trigger's top sits below the island's surface, so
  // standing on dry land never counts as being in the water.
  const trig = world.addTrigger('water', 0, top - 0.5, 0, size, 3, size);
  trig.group = group;

  world.animated.push({
    group,
    update: (dt, t) => { surf.position.y = top + 0.2 + Math.sin(t * 0.9) * 0.09; },
  });
  return surf;
}

// A painted path or a patch of sand. Decorative only: never solid, and floated a
// hair above the ground it lies on, because two surfaces at the same y z-fight.
export function pathStrip(world, x, y, z, sx, sz, colour, group, opts = {}) {
  const p = part(sx, 0.4, sz, colour, { repeat: [sx, sz], castShadow: false });
  p.receiveShadow = true;
  if (opts.tex) paintTop(p, opts.tex, sx, sz, opts.texScale || 4);
  // `lift` stacks one painted slab over another — a spawn pad on a plaza, say.
  // Without it the two top faces sit at the same y and flicker against each
  // other, which is the same z-fighting the obby hit with its baseplate.
  return world.place(p, x, y - 0.14 + (opts.lift || 0), z, { parent: group, solid: false });
}

// The plaza fountain — the thing you spawn beside and navigate home by.
export function fountainProp(world, x, y, z, group) {
  const g = group || world.root;
  const basin = part(10, 1.6, 10, bc('Medium stone grey'), { repeat: [10, 10] });
  world.place(basin, x, y + 0.8, z, { parent: g });

  const water = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.3, 8.4),
    new THREE.MeshStandardMaterial({ color: 0x39a9e0, transparent: true, opacity: 0.8, roughness: 0.15 }),
  );
  water.position.set(x, y + 1.62, z);
  g.add(water);

  const column = part(2, 5, 2, bc('Institutional white'), { studs: false });
  world.place(column, x, y + 4, z, { parent: g });

  const topBowl = part(4.4, 0.8, 4.4, bc('Institutional white'), { studs: false });
  world.place(topBowl, x, y + 6.6, z, { parent: g });

  // The spray: a few translucent boxes bobbing over the top bowl.
  const sprayMat = new THREE.MeshStandardMaterial({
    color: 0x9fdcff, transparent: true, opacity: 0.55, roughness: 0.1,
  });
  const drops = [];
  for (let i = 0; i < 6; i++) {
    const dm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), sprayMat);
    g.add(dm);
    drops.push({ mesh: dm, a: (i / 6) * Math.PI * 2 });
  }
  world.animated.push({
    group,
    update: (dt, t) => {
      water.position.y = y + 1.62 + Math.sin(t * 1.6) * 0.05;
      drops.forEach((dp, i) => {
        const ph = (t * 1.4 + i * 0.5) % 1;
        dp.mesh.position.set(
          x + Math.cos(dp.a) * ph * 2.4,
          y + 7 + Math.sin(ph * Math.PI) * 3.2,
          z + Math.sin(dp.a) * ph * 2.4,
        );
      });
    },
  });
  return g;
}

// A small brick building: four walls, a doorway you can walk through, a roof.
// Roblox's own starter houses are exactly this, and nothing more.
//
// `opts.door` is the unit vector of the wall the doorway goes in. It exists
// because the island puts a house at the end of each of four streets and the
// door has to face back down the street it belongs to; rotating the whole
// building instead would leave every wall's collision box lying the wrong way.
export function houseBlock(world, x, y, z, w, d, h, wall, roof, group, opts = {}) {
  const g = group || world.root;
  const door = opts.door || { x: 0, z: 1 };
  const doorW = 5;
  const lintelH = Math.max(0, h - 8);

  const sides = [
    { n: { x: 0, z: 1 },  len: w, cx: 0,      cz: d / 2,  sx: w, sz: 1, axis: 'x' },
    { n: { x: 0, z: -1 }, len: w, cx: 0,      cz: -d / 2, sx: w, sz: 1, axis: 'x' },
    { n: { x: 1, z: 0 },  len: d, cx: w / 2,  cz: 0,      sx: 1, sz: d, axis: 'z' },
    { n: { x: -1, z: 0 }, len: d, cx: -w / 2, cz: 0,      sx: 1, sz: d, axis: 'z' },
  ];

  const glass = bc('Pastel blue');

  // A window has to stand PROUD of the wall it is in. Set flush it is buried
  // inside a one-stud wall and you see nothing at all — which is exactly how
  // the first attempt at this produced four grey slabs.
  const windowAt = (s, off) => {
    const win = part(s.axis === 'x' ? 4 : 0.7, 3, s.axis === 'x' ? 0.7 : 4, glass,
      { studs: false, castShadow: false });
    win.position.set(
      x + (s.axis === 'x' ? s.cx + off : s.cx + s.n.x * 0.65),
      y + h * 0.62,
      z + (s.axis === 'x' ? s.cz + s.n.z * 0.65 : s.cz + off),
    );
    g.add(win);
  };

  sides.forEach((s) => {
    const isDoor = s.n.x === door.x && s.n.z === door.z;
    if (!isDoor) {
      const piece = part(s.sx, h, s.sz, wall, { repeat: [s.sx, s.sz] });
      world.place(piece, x + s.cx, y + h / 2, z + s.cz, { parent: g });
      // Two windows per blank wall. A Roblox house is read at a glance by its
      // windows and its door; without them it is a shipping container.
      [-1, 1].forEach((k) => windowAt(s, k * s.len * 0.24));
      return;
    }
    const side = (s.len - doorW) / 2;
    [-1, 1].forEach((k) => {
      const off = k * (doorW / 2 + side / 2);
      // The front of the building is the face a pupil runs at, so its two
      // pieces get a window each as well.
      windowAt(s, off);
      const px = s.axis === 'x' ? s.cx + off : s.cx;
      const pz = s.axis === 'x' ? s.cz : s.cz + off;
      const piece = part(s.axis === 'x' ? side : 1, h, s.axis === 'x' ? 1 : side, wall);
      world.place(piece, x + px, y + h / 2, z + pz, { parent: g });
    });
    if (lintelH > 0) {
      const lin = part(s.axis === 'x' ? doorW : 1, lintelH, s.axis === 'x' ? 1 : doorW, wall);
      world.place(lin, x + s.cx, y + h - lintelH / 2, z + s.cz, { parent: g });
    }
    // The door itself, standing open against the frame — the shape that says
    // "you can go in here" from the far end of the street.
    const swing = part(s.axis === 'x' ? 4 : 0.4, 7, s.axis === 'x' ? 0.4 : 4,
      bc('Reddish brown'), { studs: false, castShadow: false });
    swing.position.set(
      x + (s.axis === 'x' ? s.cx - doorW * 0.55 : s.cx + s.n.x * 1.8),
      y + 3.5,
      z + (s.axis === 'x' ? s.cz + s.n.z * 1.8 : s.cz - doorW * 0.55),
    );
    g.add(swing);
  });

  // A darker course along the bottom, the way a Roblox build separates a wall
  // from the ground it sits on.
  const skirt = part(w + 1.4, 1.2, d + 1.4, roof, { repeat: [w, d] });
  world.place(skirt, x, y + 0.6, z, { parent: g });

  // A stepped roof — two slabs, because a Roblox roof is bricks, not a mesh.
  const r1 = part(w + 2, 1.2, d + 2, roof, { repeat: [w, d] });
  world.place(r1, x, y + h + 0.6, z, { parent: g });
  const r2 = part(w - 4, 1.2, d - 4, roof, { repeat: [w, d] });
  world.place(r2, x, y + h + 1.8, z, { parent: g });

  return g;
}

// A studded horizontal roller — one rung of a climb tower. The curved face is
// visual only; a thin studded cap on the crown is what you stand on, because a
// full cylinder AABB blocks jumps into the rung above.
export function climbRung(world, x, y, z, len, radius, axis, colour, group) {
  const g = group || world.root;
  const tex = studTexture().clone();
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.repeat.set(Math.max(4, Math.round(2 * Math.PI * radius)), Math.max(2, Math.round(len)));
  const mat = new THREE.MeshStandardMaterial({
    color: colour, map: tex, roughness: 0.4, metalness: 0, envMapIntensity: 1.25,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 24), mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  else mesh.rotation.x = Math.PI / 2;
  world.place(mesh, x, y, z, { parent: g, solid: false });

  const d = radius * 2;
  const capH = 0.65;
  const capW = axis === 'x' ? len : d;
  const capD = axis === 'x' ? d : len;
  const cap = part(capW, capH, capD, colour, { repeat: [capW, capD] });
  world.place(cap, x, y + radius - capH / 2, z, { parent: g, kind: 'brick' });
  return mesh;
}

// A vertical climb like the reference: a pink pillar with thick studded rollers
// cantilevered off it, each rung a little higher and further out. Jump from the
// crown of one to the next — rise 3.0 and reach 1.6 are sized for JUMP_RISE.
export function climbTower(world, x, z, group, opts = {}) {
  const g = group || world.root;
  const rungs = opts.rungs || 10;
  const rise = opts.rise || 3.0;
  const reach = opts.reach || 1.6;
  const len = opts.len || 10;
  const radius = opts.radius || 1.35;
  const face = opts.face !== undefined ? opts.face : 1; // +1 = rungs extend in +x
  const cols = opts.colours || [0xe85fb0, 0x9a6fd6];
  const padTop = 2;
  const topY = padTop + rise * rungs;
  const spineH = topY + 5;
  const totalReach = reach * Math.max(0, rungs - 1);
  const padW = len + totalReach + 8;
  const padD = len + 4;
  const padCx = x + face * (totalReach / 2 + len / 2 + 1);

  const pad = part(padW, 2, padD, 0x8f6fd6, { repeat: [padW, padD] });
  world.place(pad, padCx, 1, z, { parent: g, kind: 'brick' });
  groundShadow(world, padCx, z, padW * 0.55, g, { opacity: 0.6 });

  const spine = part(1.6, spineH, 1.6, cols[0], { repeat: [2, spineH / 2] });
  world.place(spine, x, spineH / 2, z, { parent: g, kind: 'brick' });

  let lastCx = x;
  for (let i = 0; i < rungs; i++) {
    const top = padTop + rise * (i + 1);
    const cy = top - radius;
    const cx = x + face * (len / 2 + 1.1 + i * reach);
    lastCx = cx;
    climbRung(world, cx, cy, z, len, radius, 'x', cols[i % cols.length], g);
  }

  const deck = part(len, 1.4, len, 0xf5cd30, { repeat: [len, len] });
  world.place(deck, lastCx, topY + 0.7, z, { parent: g, kind: 'brick' });
  balloonBunch(world, lastCx, topY + 1.5, z, g, { count: 5 });
  return g;
}

// A blocky tree. No shadow: forty of these casting shadows is what turns a
// school laptop into a slideshow, and nobody looks at a tree's shadow.
export function treeProp(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const h = opts.height || 6;
  // The trunk is SOLID; the leaves are not. A Roblox tree is something you walk
  // round, and — the reason this changed — the orbit camera only pulls in for
  // solids, so a scenery-only trunk let the camera sit inside the wood and fill
  // the screen with brown.
  const trunk = part(1.4, h, 1.4, bc('Reddish brown'), { studs: false, castShadow: false });
  world.place(trunk, x, y + h / 2, z, { parent: g, kind: 'brick', solid: opts.solid !== false });
  groundShadow(world, x, z, (opts.palm ? 4.2 : 4.6), g, { opacity: 0.5 });

  const leaf = opts.leaf || bc('Bright green');
  const crown = new THREE.Group();
  // Three courses stepping in, in two tones, with the whole crown turned off
  // the axes. Two equal slabs — the version this replaced — read as a green
  // box on a stick from any distance at all.
  const sizes = opts.palm
    ? [[9, 1.1, 9], [6, 1.1, 6]]
    : [[7.5, 2.6, 7.5], [6, 2.4, 6], [3.8, 2.0, 3.8]];
  const light = bc('Br. yellowish green');
  sizes.forEach((sz, i) => {
    const b = part(sz[0], sz[1], sz[2], i === sizes.length - 1 ? light : leaf,
      { studs: false, castShadow: false });
    b.position.set(0, h + 0.6 + i * (sz[1] * 0.86), 0);
    crown.add(b);
  });
  crown.position.set(x, y, z);
  crown.rotation.y = opts.spin !== undefined ? opts.spin : 0.5;
  g.add(crown);
  return crown;
}

// A run of fence posts and rails along one axis. Scenery, never solid — a fence
// you can bump into in an open world is a fence you get stuck on.
export function fenceRun(world, x, y, z, length, axis, colour, group) {
  const g = group || world.root;
  const n = Math.max(2, Math.round(length / 5));
  const step = length / n;
  for (let i = 0; i <= n; i++) {
    const o = -length / 2 + i * step;
    const post = part(0.6, 3.2, 0.6, colour, { studs: false, castShadow: false });
    post.position.set(axis === 'x' ? x + o : x, y + 1.6, axis === 'x' ? z : z + o);
    g.add(post);
  }
  [1.1, 2.4].forEach((ry) => {
    const rail = part(
      axis === 'x' ? length : 0.4, 0.4, axis === 'x' ? 0.4 : length,
      colour, { studs: false, castShadow: false },
    );
    rail.position.set(x, y + ry, z);
    g.add(rail);
  });
  return g;
}

// ------------------------------------------------------------ painted ground
// The reference sheet's plaza is PAVED — warm stone laid in courses, with a
// joint you can see — and its grass is mown in bands. Flat colour plus studs
// reads as a grey car park next to it, and the plaza is the largest thing on
// screen in almost every frame, so it is the biggest single win available.
//
// Studs stay on the grass and the baseplate. Paving is what a Roblox town
// square is actually built out of, and the contrast between the two is what
// tells a pupil where the plaza stops.

let PAVE_TEX = null;
export function pavingTexture() {
  if (PAVE_TEX) return PAVE_TEX;
  // 4 studs to a tile, 4 tiles to the texture: one stone per stud.
  const S = 256, n = 4, cell = S / n;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#a3927a';
  g.fillRect(0, 0, S, S);

  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      // Half-lap the courses, the way paving is actually laid.
      const off = (r % 2) * (cell / 2);
      const x = (k * cell + off) % S;
      const y = r * cell;
      const tone = 200 + ((r * 7 + k * 13) % 5) * 5;
      const stone = `rgb(${tone + 8}, ${tone - 8}, ${tone - 40})`;
      g.fillStyle = stone;
      g.fillRect(x + 1.2, y + 1.2, cell - 2.4, cell - 2.4);
      // A lit top edge and a shadowed bottom one give the stone thickness.
      g.fillStyle = 'rgba(255,255,255,0.13)';
      g.fillRect(x + 1.2, y + 1.2, cell - 2.4, 2);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(x + 1.2, y + cell - 3.2, cell - 2.4, 2);
      if (x + cell > S) {
        g.fillStyle = stone;
        g.fillRect(x - S + 1.2, y + 1.2, cell - 2.4, cell - 2.4);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  PAVE_TEX = t;
  return t;
}

// Mown grass: bands of two greens, the way a park is cut.
let GRASS_TEX = null;
export function grassTexture() {
  if (GRASS_TEX) return GRASS_TEX;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#57a83f';
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, 0, S, S / 2);
  // A scatter of darker tufts, so the band edge is not a ruler-straight line.
  for (let i = 0; i < 90; i++) {
    g.fillStyle = i % 2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
    g.fillRect((i * 37) % S, (i * 61) % S, 4, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  GRASS_TEX = t;
  return t;
}

// Paint one texture onto a slab's top face. The material array that
// brickMaterials() hands back is SHARED between every part of that colour, so
// it has to be copied before the +Y slot is swapped — writing into it directly
// re-skins every brick in the world that happens to be the same colour.
export function paintTop(mesh, tex, sx, sz, studsPerTile = 4) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(
    Math.max(1, Math.round(sx / studsPerTile)),
    Math.max(1, Math.round(sz / studsPerTile)),
  );
  const mats = mesh.material.slice();
  mats[2] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.78, metalness: 0 });
  mesh.material = mats;
  return mesh;
}

// A ring of low green mounds far out in the sea. The reference sheet's
// background is hills; ours was an empty horizon, which is what made the island
// read as a table rather than as a place. Nothing here is solid or lit for
// shadow — they exist to fill the skyline and cost almost nothing.
export function distantIsles(world, group, opts = {}) {
  const g = group || world.root;
  const sand = opts.sand !== undefined ? opts.sand : bc('Cool yellow');
  const mid = opts.mid !== undefined ? opts.mid : bc('Bright green');
  const grass = opts.grass !== undefined ? opts.grass : bc('Br. yellowish green');
  const peak = opts.top !== undefined ? opts.top : bc('Institutional white');

  // Two rings of hills. The near ring is the low green landfall; the far ring
  // sits much further out and stands much taller, so the horizon has real depth
  // instead of one band of bumps. All stepped slabs, never solid, never lit for
  // shadow: it exists only to fill the skyline and costs almost nothing.
  const ring = (n, base, spread, minW, wVar, minH, hVar, phase) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.11 + phase;
      const dist = base + ((i * 67) % spread);
      const x = Math.cos(a) * dist;
      const z = Math.sin(a) * dist;
      const w = minW + ((i * 41) % wVar);
      const layers = minH + (i % hVar);
      const step = 6 + (i % 3) * 1.6;
      for (let k = 0; k < layers; k++) {
        const f = 1 - k / (layers + 0.7);
        const top = k === layers - 1;
        const colour = k === 0 ? sand
          : (top && layers >= 6) ? peak
            : top ? grass
              : mid;
        const slab = part(w * f, step + 3, w * f * 0.8, colour, { studs: false, castShadow: false });
        slab.receiveShadow = false;
        slab.position.set(x, -3 + k * step, z);
        slab.rotation.y = a;
        g.add(slab);
      }
    }
  };

  ring(opts.count || 18, 300, 190, 70, 90, 3, 3, 0);
  ring(14, 620, 320, 150, 180, 5, 4, 0.4);
  return g;
}

export function signLetters(text, height = 3.4, group) {
  const g = group || new THREE.Group();
  const chars = String(text).toUpperCase().slice(0, 9).split('');
  const w = height * 0.78;
  const gap = w * 0.16;
  const span = chars.length * w + (chars.length - 1) * gap;
  const hues = ['Bright red', 'Bright yellow', 'Bright blue', 'Bright green',
    'Bright orange', 'Bright violet'].map(bc);

  chars.forEach((ch, i) => {
    const x = -span / 2 + w / 2 + i * (w + gap);
    if (ch === ' ') return;
    const colour = hues[i % hues.length];
    const block = part(w, height, 0.9, colour, { studs: false });
    block.position.set(x, 0, 0);
    g.add(block);

    const tex = canvasTexture(128, 160, (c, cw, chh) => {
      c.clearRect(0, 0, cw, chh);
      c.fillStyle = '#ffffff';
      c.font = `700 ${Math.round(chh * 0.82)}px ${DISPLAY_FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(ch, cw / 2, chh * 0.54);
    });
    [0.47, -0.47].forEach((dz, k) => {
      const face = decalPlane(tex, w * 0.92, height * 0.92);
      face.position.set(x, 0, dz);
      if (k) face.rotation.y = Math.PI;
      g.add(face);
    });
  });
  return g;
}

// A shop at the head of a street: facade, glass, an awning and its name in
// letters over the door. `face` is the unit vector the front looks along, so
// the door always faces back down the street it belongs to.
//
// Only the main block is registered solid, and the island's streets run along
// the axes, so that one box is a true axis-aligned hull for the whole building.
// Every scrap of detail hangs off a rotated group and collides with nothing.
export function shopFront(world, x, y, z, opts = {}) {
  const g = opts.group || world.root;
  const w = opts.w || 30;
  const d = opts.d || 18;
  const h = opts.h || 13;
  const face = opts.face || { x: 0, z: 1 };
  const wall = opts.wall !== undefined ? opts.wall : bc('Bright orange');
  const roof = opts.roof !== undefined ? opts.roof : bc('Bright red');
  const yaw = Math.atan2(face.x, face.z);

  // The block itself — the only solid thing here.
  const body = part(w, h, d, wall, { repeat: [w, d] });
  world.place(body, x, y + h / 2, z, { parent: g });

  groundShadow(world, x, z, Math.max(w, d) * 0.62, g, { opacity: 0.7 });

  // A darker course at the pavement, and a two-slab roof: Roblox roofs are
  // bricks stepped in, never a mesh.
  const skirt = part(w + 1.6, 1.4, d + 1.6, roof, { repeat: [w, d] });
  world.place(skirt, x, y + 0.7, z, { parent: g, solid: false });
  const r1 = part(w + 2.4, 1.3, d + 2.4, roof, { repeat: [w, d] });
  world.place(r1, x, y + h + 0.65, z, { parent: g, solid: false });
  const r2 = part(w - 5, 1.3, d - 5, roof, { repeat: [w, d] });
  world.place(r2, x, y + h + 1.95, z, { parent: g, solid: false });

  // The detail, in the front's own frame of reference.
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.y = yaw;
  g.add(f);

  const add = (mesh, px, py, pz) => { mesh.position.set(px, py, pz); f.add(mesh); return mesh; };
  const zf = d / 2;                       // the front plane, in local space

  // The doorway: a dark recess with two glass doors standing in it, which is
  // the shape that says "you can go in here" from the far end of the street.
  const doorW = 7, doorH = 8;
  add(part(doorW, doorH, 0.5, bc('Really black'), { studs: false, castShadow: false }), 0, doorH / 2, zf + 0.3);
  [-1, 1].forEach((k) => {
    const leaf = part(doorW / 2 - 0.3, doorH - 0.6, 0.35, bc('Pastel blue'),
      { studs: false, castShadow: false, opacity: 0.75 });
    add(leaf, k * doorW / 4, doorH / 2, zf + 0.62);
  });

  // Two shop windows either side of the door, each in a frame that stands proud
  // of the wall. Set flush they vanish into a one-stud wall — the mistake that
  // produced four blank slabs the first time this was built.
  const winW = (w - doorW) / 2 - 3.2;
  if (winW > 2) {
    [-1, 1].forEach((k) => {
      const cx = k * (doorW / 2 + 1.6 + winW / 2);
      add(part(winW + 1.2, 6.0, 0.55, bc('Institutional white'), { studs: false, castShadow: false }),
        cx, 5.6, zf + 0.35);
      add(part(winW, 4.8, 0.4, bc('Pastel blue'), { studs: false, castShadow: false, opacity: 0.85 }),
        cx, 5.6, zf + 0.68);
    });
  }

  // The awning: alternating stripes on a tilt, the single thing that makes a
  // box read as a shop rather than a shed.
  if (opts.awning !== false) {
    const stripes = Math.max(6, Math.round(w / 2.6));
    const sw = w / stripes;
    for (let i = 0; i < stripes; i++) {
      const c = i % 2 ? bc('Institutional white') : (opts.accent !== undefined ? opts.accent : roof);
      const s = part(sw + 0.05, 0.5, 5.4, c, { studs: false, castShadow: false });
      s.position.set(-w / 2 + sw / 2 + i * sw, doorH + 1.2, zf + 2.4);
      s.rotation.x = -0.32;
      // The roof overhangs the awning, so an awning that takes shadow comes out
      // olive instead of red-and-white. Nothing is ever cast onto it anyway.
      s.receiveShadow = false;
      f.add(s);
    }
    // The valance hanging off the front lip.
    const val = part(w, 1.1, 0.4, roof, { studs: false, castShadow: false });
    val.receiveShadow = false;
    add(val, 0, doorH - 0.4, zf + 5.0);
  }

  // The name, on a band of clear facade ABOVE the awning. Sat level with it the
  // letters are simply hidden behind the stripes, which is what the first pass
  // did — the sign was there and invisible from the street.
  if (opts.name) {
    const size = Math.min(3.4, 30 / Math.max(3, String(opts.name).length));
    const band = part(w - 2, size + 1.4, 0.5, bc('Institutional white'),
      { studs: false, castShadow: false });
    band.receiveShadow = false;
    add(band, 0, h - 2.2, zf + 0.3);
    const letters = signLetters(opts.name, size);
    letters.position.set(0, h - 2.2, zf + 0.9);
    letters.traverse((o) => { o.receiveShadow = false; });
    f.add(letters);
  }

  // A planter each side of the door.
  [-1, 1].forEach((k) => {
    const px = k * (doorW / 2 + 2.2);
    add(part(2.6, 2.2, 2.6, bc('Reddish brown'), { studs: false, castShadow: false }), px, 1.1, zf + 2.2);
    add(part(2.2, 1.6, 2.2, bc('Bright green'), { studs: false, castShadow: false }), px, 3.0, zf + 2.2);
  });

  return g;
}

// A street lamp: dark pole, an arm, and a lantern that actually glows. Roblox
// plazas are full of these and they cost four parts each.
export function lampPost(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const h = opts.height || 11;
  const pole = part(0.7, h, 0.7, bc('Dark stone grey'), { studs: false, castShadow: false });
  pole.position.set(x, y + h / 2, z);
  g.add(pole);

  const base = part(1.8, 0.8, 1.8, bc('Really black'), { studs: false, castShadow: false });
  base.position.set(x, y + 0.4, z);
  g.add(base);

  const cap = part(2.2, 0.5, 2.2, bc('Really black'), { studs: false, castShadow: false });
  cap.position.set(x, y + h + 0.9, z);
  g.add(cap);

  const lampGlow = glowSprite(0xffe08a, 6.5, 0.6);
  lampGlow.position.set(x, y + h + 0.1, z);
  g.add(lampGlow);
  const lamp = part(1.5, 1.5, 1.5, bc('Cool yellow'), { studs: false, castShadow: false, neon: true });
  lamp.position.set(x, y + h + 0.1, z);
  g.add(lamp);
  return g;
}

// A clipped hedge. Scenery only: a hedge you can get stuck on is a hedge that
// ends the lesson.
export function hedgeRow(world, x, y, z, length, axis, group, opts = {}) {
  const g = group || world.root;
  const t = opts.thick || 2.4;
  const h = opts.height || 2.6;
  const body = part(axis === 'x' ? length : t, h, axis === 'x' ? t : length,
    bc('Bright green'), { studs: false, castShadow: false });
  body.position.set(x, y + h / 2, z);
  g.add(body);
  // A lighter cap, so the hedge has a top rather than being one flat slab.
  const cap = part(axis === 'x' ? length - 0.6 : t - 0.6, 0.5, axis === 'x' ? t - 0.6 : length - 0.6,
    bc('Br. yellowish green'), { studs: false, castShadow: false });
  cap.position.set(x, y + h + 0.2, z);
  g.add(cap);
  return g;
}

// A bed of flowers: soil, then a handful of coloured heads on stalks.
export function flowerBed(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const r = opts.size || 6;
  // A raised bed: a stone kerb, soil inside it, then grass. Laid flat on the
  // plaza without the kerb it reads as a green rug rather than as planting.
  const kerb = part(r + 1, 0.9, r + 1, bc('Medium stone grey'), { studs: false, castShadow: false });
  kerb.position.set(x, y + 0.45, z);
  g.add(kerb);
  const soil = part(r, 0.5, r, bc('Reddish brown'), { studs: false, castShadow: false });
  soil.position.set(x, y + 0.85, z);
  g.add(soil);
  const turf = part(r - 0.8, 0.35, r - 0.8, bc('Bright green'), { studs: false, castShadow: false });
  turf.position.set(x, y + 1.15, z);
  g.add(turf);

  const hues = ['Bright red', 'Bright yellow', 'Hot pink', 'Institutional white',
    'Bright violet'].map(bc);
  const n = opts.count || 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.4;
    const rad = r * (0.14 + 0.24 * ((i % 3) / 2));
    const fx = x + Math.cos(a) * rad;
    const fz = z + Math.sin(a) * rad;
    const stalk = part(0.16, 1.1, 0.16, bc('Bright green'), { studs: false, castShadow: false });
    stalk.position.set(fx, y + 1.8, fz);
    g.add(stalk);
    // Small on purpose. At 0.9 studs across these read from the plaza as
    // coloured paving slabs on sticks rather than as flowers.
    const head = part(0.5, 0.4, 0.5, hues[i % hues.length], { studs: false, castShadow: false });
    head.position.set(fx, y + 2.5, fz);
    g.add(head);
  }
  return g;
}

// A park bench. `yaw` turns it; nothing about it is solid, so the rotation
// costs nothing in collision terms.
export function benchProp(world, x, y, z, yaw, group) {
  const g = group || world.root;
  const b = new THREE.Group();
  b.position.set(x, y, z);
  b.rotation.y = yaw || 0;
  g.add(b);
  const wood = bc('Reddish brown');
  const seat = part(6, 0.5, 2.2, wood, { studs: false, castShadow: false });
  seat.position.set(0, 2.2, 0);
  b.add(seat);
  const back = part(6, 2, 0.4, wood, { studs: false, castShadow: false });
  back.position.set(0, 3.2, -0.9);
  b.add(back);
  [-2.4, 2.4].forEach((dx) => {
    const leg = part(0.5, 2.2, 2, bc('Dark stone grey'), { studs: false, castShadow: false });
    leg.position.set(dx, 1.1, 0);
    b.add(leg);
  });
  return b;
}

// A bunch of balloons on strings, bobbing. Panel 10 of the reference, and the
// cheapest movement on the island: five spheres and a sine.
export function balloonBunch(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const n = opts.count || 5;
  const hues = ['Bright red', 'Bright blue', 'Bright yellow', 'Bright green', 'Hot pink'].map(bc);
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  g.add(holder);

  const anchor = opts.height || 7;
  const balloons = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 1.9;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const mat = new THREE.MeshStandardMaterial({ color: hues[i % hues.length], roughness: 0.35 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 11), mat);
    ball.castShadow = true;
    holder.add(ball);
    // The string: one thin box, re-aimed each frame with the balloon.
    const str = part(0.12, anchor, 0.12, bc('Institutional white'),
      { studs: false, castShadow: false });
    holder.add(str);
    balloons.push({ ball, str, bx, bz, phase: i * 1.1 });
  }

  world.animated.push({
    group,
    update: (dt, t) => {
      balloons.forEach((b) => {
        const bob = Math.sin(t * 1.3 + b.phase) * 0.5;
        const sway = Math.sin(t * 0.7 + b.phase) * 0.35;
        b.ball.position.set(b.bx + sway, anchor + 2.6 + bob, b.bz);
        b.str.position.set((b.bx + sway) * 0.5, (anchor + 2.6 + bob) * 0.5, b.bz * 0.5);
        b.str.scale.y = (anchor + 2.6 + bob) / anchor;
      });
    },
  });
  return holder;
}

// A ferris wheel that turns. Two rims of short chords, spokes, and gondolas
// that stay upright as the rim carries them round — which is the detail that
// makes it read as a ride rather than a spinning sign.
export function ferrisWheel(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const R = opts.radius || 13;
  const cars = opts.cars || 8;
  const hubY = y + R + 4;

  [-2.6, 2.6].forEach((dz) => {
    const leg = part(1.2, R + 4, 1.2, bc('Institutional white'), { studs: false, castShadow: false });
    leg.position.set(x, y + (R + 4) / 2, z + dz);
    leg.rotation.x = dz > 0 ? -0.22 : 0.22;
    g.add(leg);
  });

  const wheel = new THREE.Group();
  wheel.position.set(x, hubY, z);
  g.add(wheel);

  const hub = part(2, 2, 3.4, bc('Dark stone grey'), { studs: false, castShadow: false });
  wheel.add(hub);

  const segs = 18;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const chord = (2 * Math.PI * R) / segs + 0.4;
    // Long along X and turned about Z, so the segment lies tangent to the rim.
    // Long along Z and turned about X — the first attempt — put every segment
    // edge-on to the wheel and the rim came out as a scatter of loose sticks.
    const rim = part(chord, 0.7, 0.9, bc('Bright red'), { studs: false, castShadow: false });
    rim.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    rim.rotation.z = a + Math.PI / 2;
    wheel.add(rim);
  }
  for (let i = 0; i < cars; i++) {
    const a = (i / cars) * Math.PI * 2;
    const spoke = part(0.4, R, 0.4, bc('Institutional white'), { studs: false, castShadow: false });
    spoke.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0);
    spoke.rotation.z = -a + Math.PI / 2;
    wheel.add(spoke);
  }

  // The gondolas hang off the rim but are children of the wheel, so each frame
  // their own rotation is set to cancel the wheel's.
  const hues = ['Bright red', 'Bright blue', 'Bright yellow', 'Bright green'].map(bc);
  const gondolas = [];
  for (let i = 0; i < cars; i++) {
    const a = (i / cars) * Math.PI * 2;
    const car = new THREE.Group();
    car.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    wheel.add(car);
    const box = part(3, 2.4, 3, hues[i % hues.length], { studs: false, castShadow: false });
    box.position.y = -2.2;
    car.add(box);
    gondolas.push(car);
  }

  world.animated.push({
    group,
    update: (dt, t) => {
      wheel.rotation.z = t * 0.28;
      for (let i = 0; i < gondolas.length; i++) gondolas[i].rotation.z = -wheel.rotation.z;
    },
  });
  return wheel;
}

// A little train doing laps of a circular track. The track is painted on the
// ground and nothing about the train is solid — it runs THROUGH a pupil rather
// than knocking them over, because nothing on the island may punish anybody.
export function trainRide(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const R = opts.radius || 15;

  const segs = 30;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const chord = (2 * Math.PI * R) / segs + 0.5;
    const rail = part(2.6, 0.3, chord, bc('Dark stone grey'), { studs: false, castShadow: false });
    rail.position.set(x + Math.cos(a) * R, y + 0.16, z + Math.sin(a) * R);
    rail.rotation.y = -a;
    g.add(rail);
  }

  const train = new THREE.Group();
  g.add(train);
  const hues = ['Bright red', 'Bright blue', 'Bright yellow'].map(bc);
  const cars = [];
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    train.add(car);
    const body = part(3.4, 2.2, 2.4, hues[i % hues.length], { studs: false });
    body.position.y = 1.6;
    car.add(body);
    if (i === 0) {
      const cab = part(2, 1.8, 2.2, hues[0], { studs: false });
      cab.position.set(-0.5, 3.4, 0);
      car.add(cab);
      const funnel = part(0.9, 1.4, 0.9, bc('Really black'), { studs: false, castShadow: false });
      funnel.position.set(1.2, 3.6, 0);
      car.add(funnel);
    }
    [-1.1, 1.1].forEach((dx) => [-1.1, 1.1].forEach((dz) => {
      const wheel = part(0.9, 0.9, 0.4, bc('Really black'), { studs: false, castShadow: false });
      wheel.position.set(dx, 0.6, dz);
      car.add(wheel);
    }));
    cars.push(car);
  }

  world.animated.push({
    group,
    update: (dt, t) => {
      const speed = 0.22;
      cars.forEach((car, i) => {
        const a = t * speed - i * 0.28;
        car.position.set(x + Math.cos(a) * R, y, z + Math.sin(a) * R);
        car.rotation.y = -a + Math.PI / 2;
      });
    },
  });
  return train;
}

// A town building: two or three storeys of windows under a parapet. This is
// urban fabric rather than a shop — its job is to be TALL and to stand in a row,
// because the single biggest difference between this island and the reference
// sheet was never the props. It was that the reference is a street with walls
// and ours was an open field with signs in it. Nothing reads as a town until
// something taller than a lamp post encloses it.
export function townBlock(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const w = opts.w || 20;
  const d = opts.d || 16;
  const storeys = opts.storeys || 3;
  const h = storeys * 7;
  const wall = opts.wall !== undefined ? opts.wall : bc('Deep orange');
  const trim = opts.trim !== undefined ? opts.trim : bc('Institutional white');
  const face = opts.face || { x: 0, z: 1 };

  const body = part(w, h, d, wall, { repeat: [w, d] });
  world.place(body, x, y + h / 2, z, { parent: g });

  // A band at the pavement and a parapet at the top: the two courses that stop
  // a tall box from reading as a tall box.
  const skirt = part(w + 1.2, 1.6, d + 1.2, trim, { repeat: [w, d] });
  world.place(skirt, x, y + 0.8, z, { parent: g, solid: false });
  const cap = part(w + 1.8, 1.5, d + 1.8, trim, { repeat: [w, d] });
  world.place(cap, x, y + h + 0.75, z, { parent: g, solid: false });
  const para = part(w + 1.2, 1.6, d + 1.2, wall, { repeat: [w, d] });
  world.place(para, x, y + h + 2.3, z, { parent: g, solid: false });

  // Windows on the two long faces, in rows. They stand proud of the wall for
  // the same reason houseBlock's do: flush, they vanish into it.
  const glass = bc('Pastel blue');
  const cols = Math.max(2, Math.floor(w / 6));
  const put = (nx, nz, span, axis) => {
    for (let sIdx = 1; sIdx < storeys; sIdx++) {
      for (let c = 0; c < cols; c++) {
        const off = -span / 2 + span / (cols * 2) + c * (span / cols);
        const wy = y + sIdx * 7 + 2.4;
        const fx = x + nx * ((axis === 'x' ? d : w) / 2 + 0.35) + (axis === 'x' ? 0 : off);
        const fz = z + nz * ((axis === 'x' ? d : w) / 2 + 0.35) + (axis === 'x' ? off : 0);
        const frame = part(axis === 'x' ? 0.5 : 3.4, 3.6, axis === 'x' ? 3.4 : 0.5, trim,
          { studs: false, castShadow: false });
        frame.position.set(fx, wy, fz);
        g.add(frame);
        const pane = part(axis === 'x' ? 0.35 : 2.6, 2.8, axis === 'x' ? 2.6 : 0.35, glass,
          { studs: false, castShadow: false });
        pane.position.set(fx + nx * 0.16, wy, fz + nz * 0.16);
        g.add(pane);
      }
    }
  };
  put(0, 1, w, 'z'); put(0, -1, w, 'z');
  put(1, 0, d, 'x'); put(-1, 0, d, 'x');

  // A shopfront at street level on the side that faces the street.
  const yaw = Math.atan2(face.x, face.z);
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.y = yaw;
  g.add(f);
  const zf = d / 2;
  const put2 = (m, px, py, pz) => { m.position.set(px, py, pz); f.add(m); return m; };
  put2(part(5, 6, 0.5, bc('Really black'), { studs: false, castShadow: false }), 0, 3, zf + 0.3);
  put2(part(4.4, 5.4, 0.35, glass, { studs: false, castShadow: false, opacity: 0.8 }), 0, 3, zf + 0.6);
  [-1, 1].forEach((k) => {
    const cx = k * (w / 4 + 0.8);
    if (cx + 3 > w / 2) return;
    put2(part(5.2, 4.4, 0.5, trim, { studs: false, castShadow: false }), cx, 3.4, zf + 0.32);
    put2(part(4.4, 3.6, 0.35, glass, { studs: false, castShadow: false, opacity: 0.8 }), cx, 3.4, zf + 0.62);
  });
  const val = part(w - 1, 0.9, 1.8, opts.accent !== undefined ? opts.accent : trim,
    { studs: false, castShadow: false });
  val.receiveShadow = false;
  put2(val, 0, 6.6, zf + 0.9);

  return g;
}

// A round bush. Cheaper than a tree and the thing the reference sheet uses to
// fill every gap between path and building.
export function bushProp(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const r = opts.size || 3;
  const a = part(r, r * 0.7, r, bc('Bright green'), { studs: false, castShadow: false });
  a.position.set(x, y + r * 0.35, z);
  a.rotation.y = opts.spin || 0.4;
  g.add(a);
  const b = part(r * 0.66, r * 0.5, r * 0.66, bc('Br. yellowish green'),
    { studs: false, castShadow: false });
  b.position.set(x, y + r * 0.78, z);
  b.rotation.y = (opts.spin || 0.4) + 0.6;
  g.add(b);
  return g;
}

// ----------------------------------------------------------- biome landmarks
// Scenery only. Nothing here is solid — a landmark that shoves a pupil is a
// landmark that breaks the island's one rule.

export function flagPole(world, x, z, group, opts = {}) {
  const g = group || world.root;
  const y = opts.y || 0;
  const h = opts.height || 16;
  const pole = part(0.7, h, 0.7, bc('Institutional white'), { studs: false, castShadow: false });
  pole.position.set(x, y + h / 2, z);
  g.add(pole);
  const flag = part(6.5, 3.6, 0.25, opts.colour !== undefined ? opts.colour : bc('Bright red'),
    { studs: false });
  flag.position.set(x + 3.5, y + h - 2.2, z);
  g.add(flag);
  return g;
}

export function goalPosts(world, x, z, group, opts = {}) {
  const g = group || world.root;
  const yaw = opts.yaw || 0;
  const holder = new THREE.Group();
  holder.position.set(x, 0, z);
  holder.rotation.y = yaw;
  g.add(holder);
  const white = bc('Institutional white');
  [-6, 6].forEach((dx) => {
    const post = part(0.8, 9, 0.8, white, { studs: false, castShadow: false });
    post.position.set(dx, 4.5, 0);
    holder.add(post);
  });
  const bar = part(12.8, 0.8, 0.8, white, { studs: false, castShadow: false });
  bar.position.set(0, 9, 0);
  holder.add(bar);
  return holder;
}

export function picnicTable(world, x, z, group) {
  const g = group || world.root;
  const top = part(9, 0.8, 5, bc('Reddish brown'), { repeat: [9, 5], castShadow: false });
  top.position.set(x, 3.6, z);
  g.add(top);
  [-3.5, 3.5].forEach((dx) => {
    const leg = part(0.8, 3.2, 0.8, bc('Dark stone grey'), { studs: false, castShadow: false });
    leg.position.set(x + dx, 1.6, z);
    g.add(leg);
  });
  return g;
}

export function stoneColumn(world, x, z, group, opts = {}) {
  const g = group || world.root;
  const y = opts.y || 0;
  const h = opts.height || 14;
  const colour = opts.colour !== undefined ? opts.colour : bc('Cool yellow');
  const base = part(4.2, 1.6, 4.2, colour, { studs: false, castShadow: false });
  base.position.set(x, y + 0.8, z);
  g.add(base);
  const shaft = part(2.6, h, 2.6, colour, { studs: false, castShadow: false });
  shaft.position.set(x, y + 1.6 + h / 2, z);
  g.add(shaft);
  const cap = part(4.6, 1.2, 4.6, bc('Institutional white'), { studs: false, castShadow: false });
  cap.position.set(x, y + 1.6 + h + 0.6, z);
  g.add(cap);
  return g;
}

export function marketStall(world, x, z, group, opts = {}) {
  const g = group || world.root;
  const yaw = opts.yaw || 0;
  const holder = new THREE.Group();
  holder.position.set(x, 0, z);
  holder.rotation.y = yaw;
  g.add(holder);
  const cloth = opts.cloth !== undefined ? opts.cloth : bc('Bright red');
  const counter = part(8, 3.2, 4, bc('Reddish brown'), { studs: false, castShadow: false });
  counter.position.set(0, 1.6, 0);
  holder.add(counter);
  [-3.6, 3.6].forEach((dx) => {
    const post = part(0.6, 8, 0.6, bc('Reddish brown'), { studs: false, castShadow: false });
    post.position.set(dx, 4, -1.4);
    holder.add(post);
  });
  const awning = part(9, 0.5, 6, cloth, { studs: false, castShadow: false });
  awning.position.set(0, 8.2, 0.4);
  awning.rotation.x = -0.18;
  holder.add(awning);
  return holder;
}

export function pierDeck(world, x, z, group) {
  const g = group || world.root;
  const wood = bc('Reddish brown');
  const deck = part(28, 1.1, 12, wood, { repeat: [28, 12], castShadow: false });
  deck.position.set(x, 0.55, z);
  g.add(deck);
  [-12, -4, 4, 12].forEach((dx) => {
    [-5, 5].forEach((dz) => {
      const post = part(0.8, 4.2, 0.8, wood, { studs: false, castShadow: false });
      post.position.set(x + dx, 2.7, z + dz);
      g.add(post);
    });
  });
  [-5, 5].forEach((dz) => {
    const rail = part(26, 0.4, 0.4, wood, { studs: false, castShadow: false });
    rail.position.set(x, 4.6, z + dz);
    g.add(rail);
  });
  const hut = part(8, 6, 8, bc('Cool yellow'), { studs: false, castShadow: false });
  hut.position.set(x + 6, 4.1, z);
  g.add(hut);
  const roof = part(10, 1.2, 10, bc('Bright bluish green'), { studs: false, castShadow: false });
  roof.position.set(x + 6, 7.7, z);
  g.add(roof);
  return g;
}

export function sidePost(world, x, y, z, group, opts = {}) {
  const g = group || world.root;
  const h = opts.height || 8;
  const colour = opts.colour !== undefined ? opts.colour : bc('Institutional white');
  const post = part(0.8, h, 0.8, colour, { studs: false, castShadow: false });
  post.position.set(x, y + h / 2, z);
  g.add(post);
  return post;
}

// ----------------------------------------------------------- the word stand
// A coloured plinth, a brick-built 3D item sitting on it, and a low nameplate.
export function wordStand(world, x, y, z, word, colour, group, data = {}) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.rotation.y = data.facing || 0;
  (group || world.root).add(holder);

  const plinth = part(4.4, 1.2, 4.4, colour, { repeat: [4, 4] });
  plinth.position.set(0, 0.1, 0);
  holder.add(plinth);
  world.registerSolid(plinth, { kind: 'stand' });

  const pad = part(3.6, 0.35, 3.6, bc('Institutional white'), { repeat: [3, 3] });
  pad.position.set(0, 0.92, 0);
  holder.add(pad);

  const itemProp = floatingItemProp(word.word, word.emoji, 3.5);
  itemProp.position.set(0, 1.16, 0);
  holder.add(itemProp);

  const tag = part(3.8, 0.85, 0.35, bc('Institutional white'), { studs: false, castShadow: false });
  tag.position.set(0, 0.62, 2.05);
  holder.add(tag);
  const nameDecal = decalPlane(nameplateFace(word.word), 3.5, 0.72);
  nameDecal.position.set(0, 0.62, 2.24);
  holder.add(nameDecal);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf5cd30, emissive: 0xf5cd30, emissiveIntensity: 0.35,
    transparent: true, opacity: 0.75,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.16, 8, 30), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.14, 0);
  holder.add(ring);

  const trig = world.addTrigger('stand', x, y + 2.2, z, 5.4, 6.5, 5.4, data);
  trig.group = group;

  const rec = {
    holder, plinth, itemProp, ring, ringMat, trigger: trig, word, x, y, z,
    found: false, pulse: 0, bob: Math.random() * Math.PI * 2,
    markFound() {
      if (this.found) return false;
      this.found = true;
      ringMat.color.setHex(0x2fbf5f);
      ringMat.emissive.setHex(0x2fbf5f);
      ringMat.emissiveIntensity = 0.9;
      ringMat.opacity = 0.95;
      return true;
    },
    cheer() { this.pulse = 1.2; },
    update: (dt, t) => {
      ring.position.y = 0.14 + Math.sin(t * 2 + x * 0.1) * 0.05;
      itemProp.position.y = 1.16 + Math.sin(t * 1.6 + rec.bob) * 0.08;
      if (rec.pulse > 0) {
        rec.pulse = Math.max(0, rec.pulse - dt);
        const sc = 1 + Math.sin(rec.pulse * 9) * 0.14;
        itemProp.scale.set(sc, sc, sc);
        if (rec.pulse === 0) itemProp.scale.set(1, 1, 1);
      }
    },
  };
  rec.group = group;
  world.animated.push(rec);
  return rec;
}

// ------------------------------------------------------------- the quest beam
// Roblox's own quest marker: a column of coloured light you can see from across
// the map. It stands over the DISTRICT GATE, never over the answer — the beam
// tells a pupil where to run, and the reading starts when they get there.
export function questBeam(world, x, y, z, colour, group) {
  const g = group || world.root;
  const mat = new THREE.MeshBasicMaterial({
    color: colour, transparent: true, opacity: 0.2, depthWrite: false, fog: false,
  });
  // The shaft starts ABOVE the arch it stands on. Run it down to the ground and
  // it lies over the gate's own board like a coloured filter, and the one thing
  // a pupil has to read on the way in goes pink.
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 70, 18, 1, true), mat);
  shaft.position.set(x, y + 17 + 35, z);
  g.add(shaft);

  const ringMat = new THREE.MeshBasicMaterial({
    color: colour, transparent: true, opacity: 0.55, depthWrite: false, fog: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.28, 8, 36), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.4, z);
  g.add(ring);

  const rec = {
    group, shaft, ring, mat, ringMat,
    moveTo(nx, nz) { shaft.position.x = nx; shaft.position.z = nz; ring.position.x = nx; ring.position.z = nz; },
    setColour(hex) { mat.color.setHex(hex); ringMat.color.setHex(hex); },
    set visible(v) { shaft.visible = v; ring.visible = v; },
    get visible() { return shaft.visible; },
    update: (dt, t) => {
      mat.opacity = 0.15 + Math.sin(t * 2.4) * 0.07;
      ring.rotation.z = t * 0.9;
      ring.position.y = 0.4 + Math.sin(t * 2.4) * 0.25;
    },
  };
  world.animated.push(rec);
  return rec;
}

// A Year 4 answer flag: a pole with one candidate word on a banner. These are
// the island's answer bricks — planted for one grammar question and pulled up
// again afterwards, which is why they carry their own group to clear.
export function answerFlag(world, x, y, z, label, colour, group, data = {}) {
  const g = group || world.root;
  const pole = part(0.7, 12, 0.7, bc('Institutional white'), { studs: false, castShadow: false });
  pole.position.set(x, y + 6, z);
  g.add(pole);

  const base = part(3.2, 1, 3.2, colour, { repeat: [3, 3] });
  world.place(base, x, y - 0.5, z, { parent: g, kind: 'brick' });

  const tex = canvasTexture(512, 220, (c, w, h) => {
    const r = 22;
    c.fillStyle = 'rgba(255,255,255,0.97)';
    c.beginPath();
    c.moveTo(r, 0); c.arcTo(w, 0, w, h, r); c.arcTo(w, h, 0, h, r);
    c.arcTo(0, h, 0, 0, r); c.arcTo(0, 0, w, 0, r); c.closePath();
    c.fill();
    c.strokeStyle = DS.sky;
    c.lineWidth = 10;
    c.stroke();
    c.fillStyle = DS.purple;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const px = fitText(c, label, w - 50, 110, DISPLAY_FONT, '700');
    c.font = `700 ${px}px ${DISPLAY_FONT}`;
    c.fillText(label, w / 2, h / 2);
  });
  const banner = part(7, 3, 0.3, bc('Institutional white'), { studs: false });
  banner.position.set(x + 3.4, y + 10, z);
  g.add(banner);
  const front = decalPlane(tex, 6.6, 2.8);
  front.position.set(x + 3.4, y + 10, z + 0.18);
  g.add(front);
  const rear = decalPlane(tex, 6.6, 2.8);
  rear.position.set(x + 3.4, y + 10, z - 0.18);
  rear.rotation.y = Math.PI;
  g.add(rear);

  const trig = world.addTrigger('flag', x, y + 3, z, 6, 9, 6, data);
  trig.group = group;
  return { pole, base, banner, trigger: trig, x, y, z, label };
}

// ----------------------------------------------------------------- the sky
// Roblox's default sky is one of the most recognisable things about it: a strong
// blue gradient overhead, a pale hazy horizon, big soft cumulus clouds, and a low
// sun with a halo. All of that is PAINTED INTO ONE DOME here rather than built
// out of geometry.
//
// The first version of this floated boxy cloud meshes around the world, and they
// read as white slabs hanging in mid-air, because that is what they were. A
// skybox does not parallax when you walk, which is exactly why real skyboxes are
// textures — and it means a pupil running the length of a course never catches
// the clouds sliding past the wrong way.

function skyboxTexture(palette = {}) {
  const zenith = palette.zenith || '#125aa8';
  const mid = palette.mid || '#3d92d4';
  const haze = palette.haze || '#8ecaed';
  const horizon = palette.horizon || '#d8eefb';
  const belowHaze = palette.belowHaze || '#c6e2f0';
  const below = palette.below || '#a8c6d8';
  const cloudAmt = palette.clouds === undefined ? 1 : palette.clouds;

  return canvasTexture(2048, 1024, (g, w, h) => {
    // The dome's UVs are equirectangular: v = 0 straight up, v = 1 straight down.
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.00, zenith);
    grad.addColorStop(0.30, mid);
    grad.addColorStop(0.46, haze);
    grad.addColorStop(0.50, horizon);
    grad.addColorStop(0.54, belowHaze);
    grad.addColorStop(1.00, below);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // One cumulus: a cluster of soft blobs with a bright top and a grey base,
    // which is the whole reason a cloud reads as a cloud and not as a smudge.
    const puff = (cx, cy, r, alpha) => {
      const rad = g.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
      rad.addColorStop(0.0, `rgba(255,255,255,${alpha})`);
      rad.addColorStop(0.55, `rgba(250,253,255,${alpha * 0.78})`);
      rad.addColorStop(1.0, 'rgba(226,238,247,0)');
      g.fillStyle = rad;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    };

    const cloud = (cx, cy, scale, alpha) => {
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const dx = (Math.random() - 0.5) * 190 * scale;
        const dy = (Math.random() - 0.5) * 46 * scale;
        puff(cx + dx, cy + dy, (36 + Math.random() * 46) * scale, alpha);
      }
      // The flat bright underside a cumulus sits on.
      for (let i = 0; i < 4; i++) {
        puff(cx + (Math.random() - 0.5) * 150 * scale, cy + 26 * scale,
          (30 + Math.random() * 26) * scale, alpha * 0.85);
      }
    };

    // Well ABOVE the horizon, and not many of them. The first attempt banked
    // sixty clouds down to v = 0.48 and they merged into one white band exactly
    // where a player stands looking — the sky came out overcast white instead of
    // Roblox blue. The band from v = 0.38 down to the horizon is left clear on
    // purpose, so the blue is what you see when you look straight ahead.
    const nHigh = Math.round(15 * cloudAmt);
    const nLow = Math.round(11 * cloudAmt);
    for (let i = 0; i < nHigh; i++) cloud(Math.random() * w, h * (0.22 + Math.random() * 0.13), 1.1, 0.9);
    for (let i = 0; i < nLow; i++) cloud(Math.random() * w, h * (0.09 + Math.random() * 0.13), 0.8, 0.72);
  });
}

export function makeSky(scene) {
  scene.background = new THREE.Color(0x63aee2);
  // Roblox has essentially no fog. A little is still worth having so the far end
  // of a course fades rather than ending in a hard edge, but it starts well past
  // anything a pupil is looking at, and the world stays crisp.
  scene.fog = new THREE.Fog(0xbcdcf0, 900, 1600);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 40, 24),
    new THREE.MeshBasicMaterial({
      map: skyboxTexture(), side: THREE.BackSide, fog: false, depthWrite: false,
    }),
  );
  dome.renderOrder = -2;
  scene.add(dome);
  // Soft cloud puffs floating in 3D, out past the play area, so the sky has
  // parallax depth as the camera moves instead of one flat painted backdrop.
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 620 + Math.random() * 260;
    const puff = glowSprite(0xffffff, 150 + Math.random() * 120, 0.5);
    puff.scale.y *= 0.42;
    puff.position.set(Math.cos(ang) * dist, 230 + Math.random() * 160, Math.sin(ang) * dist);
    scene.add(puff);
    puffs.push(puff);
  }

  // The sun itself, with the soft halo Roblox draws around it.
  const sunTex = canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    grad.addColorStop(0.00, 'rgba(255,255,246,1)');
    grad.addColorStop(0.18, 'rgba(255,251,224,0.95)');
    grad.addColorStop(0.42, 'rgba(255,243,196,0.30)');
    grad.addColorStop(1.00, 'rgba(255,243,196,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false }),
  );
  disc.position.set(430, 760, 320);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -1;
  scene.add(disc);

  // Roblox's outdoor lighting is high-key with a cool fill: a bright warm sun
  // against a blue sky bounce, and shadows that stay blue rather than going grey.
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a4e, 0.42);
  scene.add(hemi);

  // A dim fill from behind the sun. Two of the island's four streets face away
  // from it, and with only the ground bounce to light them their shopfronts and
  // awnings came out olive — a white awning stripe read as army green. This is
  // the standard second light of a three-point rig, at a quarter strength and
  // casting nothing, so it costs one more dot product per fragment and no map.
  const fill = new THREE.DirectionalLight(0xd6e2ee, 0.42);
  fill.position.set(-150, 130, -120);
  scene.add(fill);
  // A cool rim from low and behind, opposite the sun. It catches the top edges
  // of anything standing up so the minifig separates from the sky. Casts nothing.
  const rim = new THREE.DirectionalLight(0xbfe3ff, 0.6);
  rim.position.set(-90, 70, -180);
  scene.add(rim);

  // Roblox's Lighting has an Ambient and an OutdoorAmbient — a flat term that
  // lifts every face whichever way it points. Without one, the two shopfronts
  // whose streets run away from the sun get no key light at all and a white
  // awning stripe reads as grey. A directional fill cannot fix that on its own;
  // it only moves the problem to whichever face is turned away from IT.
  const ambient = new THREE.AmbientLight(0xfff1dd, 0.20);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeec2, 2.9);
  sun.position.set(120, 220, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  // A tight shadow box, because it FOLLOWS THE PLAYER (see keepSunOver below).
  // Fixed at the origin it had to cover the whole world, which spent the same
  // 2048 pixels over six times the area and turned every shadow to mush — and
  // the far end of a Year 4 course fell outside it and had no shadows at all.
  const d = 90;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  scene.add(sun);
  scene.add(sun.target);

  const sunGlow = glowSprite(0xfff2c4, 150, 0.55);
  sunGlow.position.set(420, 640, 320);
  scene.add(sunGlow);

  scene.userData.sun = sun;
  scene.userData.sky = { dome, hemi, fill, rim, ambient, sun, disc, sunGlow, puffs };
  return { sun, hemi, dome };
}

// Retint the existing sky kit for a pack's biome. Lights are created once in
// makeSky — calling this on a second Play must not add another sun.
export function applyWorldLook(scene, renderer, look) {
  if (!look) return;
  const sky = look.sky || {};
  const lights = look.lights || {};
  if (sky.background !== undefined) scene.background = new THREE.Color(sky.background);
  if (scene.fog && sky.fog !== undefined) scene.fog.color.set(sky.fog);

  const kit = scene.userData.sky;
  if (kit && kit.dome) {
    const next = skyboxTexture(sky);
    const old = kit.dome.material.map;
    kit.dome.material.map = next;
    kit.dome.material.needsUpdate = true;
    if (old && old !== next) old.dispose();
  }
  if (kit && kit.hemi) {
    if (lights.hemiSky !== undefined) kit.hemi.color.set(lights.hemiSky);
    if (lights.hemiGround !== undefined) kit.hemi.groundColor.set(lights.hemiGround);
    if (lights.hemiInt !== undefined) kit.hemi.intensity = lights.hemiInt;
  }
  if (kit && kit.fill) {
    if (lights.fill !== undefined) kit.fill.color.set(lights.fill);
    if (lights.fillInt !== undefined) kit.fill.intensity = lights.fillInt;
  }
  if (kit && kit.rim) {
    if (lights.rim !== undefined) kit.rim.color.set(lights.rim);
    if (lights.rimInt !== undefined) kit.rim.intensity = lights.rimInt;
  }
  if (kit && kit.ambient) {
    if (lights.ambient !== undefined) kit.ambient.color.set(lights.ambient);
    if (lights.ambientInt !== undefined) kit.ambient.intensity = lights.ambientInt;
  }
  if (kit && kit.sun) {
    if (lights.sun !== undefined) kit.sun.color.set(lights.sun);
    if (lights.sunInt !== undefined) kit.sun.intensity = lights.sunInt;
  }
  if (renderer && look.env) makeEnvironment(renderer, scene, look.env);
}

// Move the sun's shadow box to wherever the player is. Called once a frame.
export function keepSunOver(scene, pos) {
  const sun = scene.userData.sun;
  if (!sun) return;
  sun.position.set(pos.x + 120, pos.y + 220, pos.z + 90);
  sun.target.position.set(pos.x, pos.y, pos.z);
  sun.target.updateMatrixWorld();
}


// Image-based environment lighting. A PMREM-filtered sky/ground gradient fed to
// scene.environment gives every MeshStandardMaterial soft, direction-aware
// ambient and a faint sheen on its rounded edges — the single biggest step
// from a flat-lit toy scene to an "HD" one. Uses only THREE core, so the build
// (which strips module imports) is unaffected.
export function makeEnvironment(renderer, scene, env = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const c = document.createElement('canvas');
  c.width = 32; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.00, env.zenith || '#eaf3ff');
  grad.addColorStop(0.42, env.sky || '#cfe6fb');
  grad.addColorStop(0.50, env.haze || '#c9d8b4');
  grad.addColorStop(0.62, env.near || '#9fae86');
  grad.addColorStop(1.00, env.bounce || '#7d6f52');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const rt = pmrem.fromEquirectangular(tex);
  if (scene.userData.envRT) {
    scene.environment = null;
    scene.userData.envRT.dispose();
  }
  scene.environment = rt.texture;
  scene.userData.envRT = rt;
  tex.dispose();
  pmrem.dispose();
}


// ---- HD polish: soft contact shadows + additive glows (THREE-core only) -----

let _SHADOW_TEX = null;
function shadowTexture() {
  if (_SHADOW_TEX) return _SHADOW_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 3, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.42)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.20)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  _SHADOW_TEX = t; return t;
}

// A soft radial blob laid flat on the ground under an object. This is the cheap
// "contact shadow" / ambient-occlusion cue that stops props reading as if they
// float; the real sun shadow still lands on top of it near the player.
export function groundShadow(world, x, z, radius, group, opts = {}) {
  const g = group || world.root;
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTexture(), transparent: true, depthWrite: false,
    opacity: opts.opacity !== undefined ? opts.opacity : 1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, (opts.y || 0) + 0.06, z);
  m.renderOrder = -1;
  m.receiveShadow = false; m.castShadow = false;
  g.add(m);
  return m;
}

// The same blob as a child of a moving object (parented at its local origin),
// so the player carries a contact shadow with them as they walk.
export function attachGroundShadow(target, radius, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTexture(), transparent: true, depthWrite: false,
    opacity: opts.opacity !== undefined ? opts.opacity : 0.85,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, (opts.y || 0) + 0.08, 0);
  m.renderOrder = -1;
  m.receiveShadow = false; m.castShadow = false;
  target.add(m);
  return m;
}

let _GLOW_TEX = null;
function glowTexture() {
  if (_GLOW_TEX) return _GLOW_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _GLOW_TEX = new THREE.CanvasTexture(c);
  return _GLOW_TEX;
}

// An additive glow sprite — the bloom cue for anything that should read as
// lit: coins, lanterns, the sun. Cheaper than a post-process bloom pass and,
// unlike one, safe through the import-stripping build.
export function glowSprite(colour, size, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(), color: colour, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}
