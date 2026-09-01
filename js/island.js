// ============================================================================
//  island.js — the explore mode. Where the English becomes a run.
// ============================================================================
//
// The obby is a corridor: one way to walk, and the answer is the brick that holds
// your weight. The island is its opposite. It is a flat plateau with a plaza in
// the middle and four district streets running off it, and the answer is a sign
// somewhere out there that you have to go and find.
//
//                             home district
//                                   |
//                    pets ------- PLAZA ------- toys
//                                   |
//                                 lunch
//
// One district is the pack the teacher chose; the other three are neighbouring
// units of the same class, so a pupil meets words from other lessons in passing.
// Every word in all four stands on a two-sided sign you can walk up to and read.
//
// Two rules hold this mode together, and both are the opposite of the obby's:
//
//   * NOTHING CAN KILL YOU. There is no lava, no void and no drowning — see
//     seaPlane() in parts.js for the stud-and-a-half trick that makes the sea
//     safe without a swim state. Exploring has to be free of consequence, or a
//     seven-year-old stops exploring.
//   * A WRONG SIGN TEACHES. Touch the wrong stand and it says its own word, and
//     that is all that happens. In the obby a mistake costs a fall; here it buys
//     you another English sentence.
//
// The quest beam therefore stands over the DISTRICT GATE and never over the
// answer. It tells a pupil which way to run; the reading starts when they arrive.

import * as THREE from 'three';
import { part, bc, rand, randInt, shuffle } from './rbx.js';
import {
  plateau, seaPlane, pathStrip, fountainProp, houseBlock, treeProp, fenceRun,
  wordStand, questBeam, answerFlag, coin, signBoard, boardFace, topDecal,
  decalPlane, canvasTexture, UI_FONT, EMOJI_FONT,
  shopFront, lampPost, hedgeRow, flowerBed, benchProp, balloonBunch,
  ferrisWheel, trainRide, signLetters, pavingTexture, distantIsles, bushProp,
} from './parts.js';
import { QuestSet } from './quests.js';
import { Guide } from './npc.js';

// ------------------------------------------------------------- the geometry
// Sized against WalkSpeed 16, not the other way round: a district gate is about
// two and a half seconds' run from the fountain — far enough that going there
// feels like going somewhere, near enough that a Year 1 pupil does not give up
// halfway. The three Roblox constants are never touched to make this work.
const ISLE_SPAN = 220;          // the plateau, edge to edge
const ISLE_DEEP = 10;           // how thick the plateau slab is
const ISLE_SEA_Y = -1.5;        // the sea floor: UNDER the controller's 2-stud
                                // step-up, so you can always wade back ashore
// Far wider than the island, so the sea runs out into the fog instead of ending
// in a straight edge you can see from the plaza.
const ISLE_SEA_SPAN = 2400;
const ISLE_RING = 62;           // plaza centre to district centre
const ISLE_PLAZA = 46;          // the plaza square
const ISLE_LANE = 7;            // spacing of the signs down a district street
const ISLE_SIDE = 9.5;          // how far the inner rank of signs sits off the
                                // street's middle; the outer rank is ISLE_SIDE2
const ISLE_SIDE2 = 17;
const ISLE_GATE = 26;           // gate distance back from the district centre
export const ISLE_WADE = 9;     // WalkSpeed while you are in the shallows

// North first, because the camera starts at yaw PI looking down +Z — so the pack
// the teacher actually chose is the street straight ahead when the game loads.
const ISLE_DIRS = [
  { x: 0, z: 1 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: -1, z: 0 },
];

// The accent colour of a district: its gate, its stand bases and its beam.
const ISLE_ACCENT = ['Bright red', 'Bright blue', 'Bright violet', 'Bright orange'];

// What each unit's district looks like, keyed by pack id — with a park as the
// fallback, so a pack a teacher adds later still gets a district without anybody
// having to come back and edit this file.
const DISTRICT_THEMES = {
  friends:      { ground: 'Br. yellowish green', wall: 'Hot pink',            roof: 'Bright violet', prop: 'tree' },
  numbers:      { ground: 'Pastel blue',         wall: 'Bright blue',         roof: 'Institutional white', prop: 'tree' },
  colours:      { ground: 'Cool yellow',         wall: 'Bright violet',       roof: 'Bright yellow', prop: 'tree' },
  school:       { ground: 'Br. yellowish green', wall: 'Cool yellow',         roof: 'Bright red', prop: 'flag' },
  toys:         { ground: 'Cool yellow',         wall: 'Bright yellow',       roof: 'Bright red', prop: 'tree' },
  pets:         { ground: 'Br. yellowish green', wall: 'Reddish brown',       roof: 'Bright green', prop: 'kennel' },
  lunch:        { ground: 'Cool yellow',         wall: 'Deep orange',         roof: 'Bright red', prop: 'table' },
  week:         { ground: 'Br. yellowish green', wall: 'Pastel blue',         roof: 'Bright blue', prop: 'tree' },
  house:        { ground: 'Br. yellowish green', wall: 'Reddish brown',       roof: 'Dark stone grey', prop: 'tree' },
  clothes:      { ground: 'Pastel blue',         wall: 'Hot pink',            roof: 'Bright violet', prop: 'tree' },
  body:         { ground: 'Br. yellowish green', wall: 'Bright bluish green', roof: 'Institutional white', prop: 'tree' },
  beach:        { ground: 'Cool yellow',         wall: 'Pastel blue',         roof: 'Bright bluish green', prop: 'palm' },
  countries:    { ground: 'Br. yellowish green', wall: 'Bright blue',         roof: 'Institutional white', prop: 'flag' },
  subjects:     { ground: 'Br. yellowish green', wall: 'Cool yellow',         roof: 'Bright red', prop: 'flag' },
  past:         { ground: 'Cool yellow',         wall: 'Cool yellow',         roof: 'Reddish brown', prop: 'tree' },
  celebrations: { ground: 'Br. yellowish green', wall: 'Hot pink',            roof: 'Bright yellow', prop: 'tree' },
  eating:       { ground: 'Cool yellow',         wall: 'Deep orange',         roof: 'Bright green', prop: 'table' },
  transport:    { ground: 'Medium stone grey',   wall: 'Bright yellow',       roof: 'Bright blue', prop: 'tree' },
  helping:      { ground: 'Br. yellowish green', wall: 'Bright green',        roof: 'Br. yellowish green', prop: 'tree' },
  wildlife:     { ground: 'Bright green',        wall: 'Reddish brown',       roof: 'Bright green', prop: 'palm' },
  sports:       { ground: 'Bright green',        wall: 'Bright bluish green', roof: 'Bright red', prop: 'goal' },
  health:       { ground: 'Institutional white', wall: 'Institutional white', roof: 'Bright red', prop: 'tree' },
};
const DEFAULT_THEME = { ground: 'Br. yellowish green', wall: 'Bright orange', roof: 'Bright blue', prop: 'tree' };

// The shopkeepers who greet you at each gate. Roblox towns are full of them and
// they cost almost nothing: an R6 rig and one line of English.
const GREETERS = [
  { name: 'Maple', shirt: 'Bright red', pants: 'Dark stone grey' },
  { name: 'Bo', shirt: 'Bright blue', pants: 'Reddish brown' },
  { name: 'Pixel', shirt: 'Bright violet', pants: 'Medium stone grey' },
  { name: 'Kaya', shirt: 'Bright orange', pants: 'Really black' },
];

export class Island {
  constructor(world, scene, packs, home, year, hooks = {}) {
    this.world = world;
    this.scene = scene;
    this.packs = packs.slice(0, 4);     // the four districts, home first
    this.home = home;
    this.year = year;
    this.hooks = hooks;   // { onHunt, onHit, onMiss, onDiscover, onFinish, onChat }
    this.quests = new QuestSet(this.packs, home, year);

    this.districts = [];
    this.standList = [];
    this.flags = [];
    this.greeters = [];
    this.billboards = [];               // the common contract with Course
    this.visited = new Set();
    this.spawn = new THREE.Vector3(0, 0, -17);
    this.beacon = null;                 // where the compass arrow points
    this.t = 0;
    this.lastHuntAt = -99;
    this.hits = 0;
    this.finished = false;
    this.beam = null;
    this.flagGroup = null;
    this.asked = [];      // one row per hunt handed out, for the checklist
  }

  // ================================================================ building

  build() {
    const g = this.world.group('island');
    this.root = g;

    seaPlane(this.world, ISLE_SEA_Y, ISLE_SEA_SPAN, g);
    plateau(this.world, ISLE_SPAN, ISLE_DEEP, bc('Bright green'), g);

    // Hills out in the sea. Without them the horizon is an empty blue line and
    // the island reads as a model on a table rather than as somewhere.
    distantIsles(this.world, g);

    // A ring of sand around the whole plateau, so the edge reads as a shore you
    // are allowed to walk off rather than a cliff you are not.
    const bw = 13;
    const edge = ISLE_SPAN / 2 - bw / 2;
    pathStrip(this.world, 0, 0, edge, ISLE_SPAN, bw, bc('Cool yellow'), g);
    pathStrip(this.world, 0, 0, -edge, ISLE_SPAN, bw, bc('Cool yellow'), g);
    pathStrip(this.world, edge, 0, 0, bw, ISLE_SPAN - bw * 2, bc('Cool yellow'), g);
    pathStrip(this.world, -edge, 0, 0, bw, ISLE_SPAN - bw * 2, bc('Cool yellow'), g);

    // Districts first: the plaza's compass rose is painted with their names.
    this.packs.forEach((pack, i) => this.buildDistrict(i, pack, g));
    this.buildPlaza(g);
    this.scatterCoins(g);
    this.buildFairground(g);
    this.scatterTrees(g);

    this.flagGroup = null;
    this.beam = questBeam(this.world, 0, 0.1, ISLE_RING - ISLE_GATE, bc('Bright red'), g);
    this.beam.visible = false;

    return this;
  }

  buildPlaza(g) {
    // Paved, not a flat grey slab. The plaza is the largest surface in almost
    // every frame of this mode.
    const pave = pavingTexture();
    pathStrip(this.world, 0, 0, 0, ISLE_PLAZA, ISLE_PLAZA, bc('Medium stone grey'), g,
      { tex: pave });

    // The fountain is off the crossroads on purpose, and out of line with the
    // spawn pad as well. In the middle it looks right and plays wrong: all four
    // streets run through the plaza centre, so a pupil who spawns and holds W
    // climbs the basin and stops dead against the column before they have gone
    // anywhere. Level with the spawn pad it does the same thing sideways.
    fountainProp(this.world, 16, 0, 16, g);

    // What stands in the middle instead: a compass rose naming the four
    // districts. It is flat, so you run straight over it, and it does the job
    // the fountain could not — telling a seven-year-old which way is which.
    const rose = canvasTexture(640, 640, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 10;
      c.beginPath(); c.arc(w / 2, h / 2, 250, 0, Math.PI * 2); c.stroke();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      // North is +Z, which is the direction the camera starts facing.
      const at = [[0.5, 0.10], [0.90, 0.5], [0.5, 0.90], [0.10, 0.5]];
      const arrow = ['▲', '▶', '▼', '◀'];
      this.districts.forEach((d, i) => {
        const [fx, fy] = at[i % 4];
        c.fillStyle = '#ffffff';
        c.font = `700 46px ${UI_FONT}`;
        c.fillText(arrow[i % 4], w * fx, h * fy - 34);
        c.font = `800 40px ${UI_FONT}`;
        c.fillText(d.pack.name, w * fx, h * fy + 8);
      });
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.font = `800 44px ${UI_FONT}`;
      c.fillText('PLAZA', w / 2, h / 2);
    });
    const roseDecal = topDecal(rose, 24, 24);
    roseDecal.position.set(0, 0.12, 0);
    g.add(roseDecal);

    // The spawn marker: painted on, not built up, so it is not a lip to trip
    // over on the way out of the plaza.
    pathStrip(this.world, 0, 0, -17, 9, 9, bc('Bright yellow'), g, { lift: 0.06 });
    const face = canvasTexture(256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(40,40,40,0.85)';
      c.font = `800 62px ${UI_FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('START', w / 2, h / 2);
    });
    const decal = topDecal(face, 7, 7);
    decal.position.set(0, 0.2, -17);
    g.add(decal);

    // Small, and off to one side. At eighteen studs over the spawn pad this was
    // the first thing every screenshot of the game had in it.
    const tex = boardFace('BrickWords Island', `${this.year.label} — run and find the words!`, { border: '#f5b81d' });
    signBoard(this.world, -20, 6.5, -20, tex, 11, 3.4, g, { post: true });

    // Four streets out of the plaza, one per district, stopping at the gates.
    ISLE_DIRS.forEach((d) => {
      const from = ISLE_PLAZA / 2;
      const to = ISLE_RING - ISLE_GATE;
      const mid = (from + to) / 2;
      const len = to - from;
      pathStrip(this.world, d.x * mid, 0, d.z * mid,
        d.x ? len : 14, d.x ? 14 : len, bc('Medium stone grey'), g, { tex: pave });
      // A lamp on each side of every street mouth. Eight lamps is what the
      // reference's plaza is mostly made of, and they cost four parts each.
      [-1, 1].forEach((k) => {
        const px = -d.z * k * 11, pz = d.x * k * 11;
        lampPost(this.world, d.x * (from + 5) + px, 0, d.z * (from + 5) + pz, g);
      });
    });

    // The plaza's own furniture: greenery in the corners the streets do not
    // cross, benches facing the middle, and a bunch of balloons by the fountain.
    const corner = ISLE_PLAZA / 2 - 7;
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz], i) => {
      // The fountain already owns the +x +z corner and the spawn pad the -z
      // edge, so those two get benches instead of planting.
      if (sx === 1 && sz === 1) {
        benchProp(this.world, corner - 4, 0, corner - 12, -Math.PI / 2, g);
        return;
      }
      // A raised bed per free corner, and nothing else. A hedge here as well
      // walled the plaza in and left a pupil running the long way round to a
      // street they could see.
      flowerBed(this.world, sx * corner, 0, sz * corner, g, { size: 6, count: 10 });
      if (i === 3) benchProp(this.world, sx * (corner - 2), 0, sz * (corner - 10), 0, g);
    });
    balloonBunch(this.world, 22, 0, 9, g, { count: 6 });
  }

  // ---------------------------------------------------------------- district

  buildDistrict(index, pack, parent) {
    const d = ISLE_DIRS[index];
    const p = { x: -d.z, z: d.x };                 // across the street
    const theme = DISTRICT_THEMES[pack.id] || DEFAULT_THEME;
    const accent = bc(ISLE_ACCENT[index]);
    const g = this.world.group(`district-${pack.id}`);

    const cx = d.x * ISLE_RING;
    const cz = d.z * ISLE_RING;

    // The ground it stands on: a rectangle running from the gate to the shore.
    // It stops short of the sand ring rather than lying over it — two painted
    // slabs sharing a top face flicker against each other.
    const along = 58, across = 42;
    pathStrip(this.world, cx + d.x * 3, 0, cz + d.z * 3,
      d.x ? along : across, d.x ? across : along, bc(theme.ground), g,
      { tex: pavingTexture(), texScale: 5 });

    // The gate, with the unit's name and the textbook page it came from. The
    // beam stands over this, which is as much help as a pupil gets.
    const gx = cx - d.x * ISLE_GATE;
    const gz = cz - d.z * ISLE_GATE;
    const yaw = Math.atan2(-d.x, -d.z);            // the sign faces the plaza
    this.gateAt(gx, gz, yaw, pack, accent, g);

    // The shop at the far end, its front facing back down the street and its
    // name spelled out over the awning. This is the reference sheet's TOYS
    // storefront: the thing that tells a pupil what street they are standing in
    // from the other end of it.
    shopFront(this.world, cx + d.x * 22, 0, cz + d.z * 22, {
      w: 30, d: 17, h: 13,
      face: { x: -d.x, z: -d.z },
      wall: bc(theme.wall), roof: bc(theme.roof), accent,
      name: pack.name, group: g,
    });

    // Two lamps at the shop's corners and a bench facing it, so the far end of
    // the street reads as a place rather than the end of the ground.
    [-1, 1].forEach((k) => {
      lampPost(this.world, cx + d.x * 10 + p.x * k * 13, 0, cz + d.z * 10 + p.z * k * 13, g);
    });
    benchProp(this.world, cx + d.x * 8 + p.x * 8, 0, cz + d.z * 8 + p.z * 8,
      Math.atan2(-p.x, -p.z), g);
    flowerBed(this.world, cx + d.x * 8 - p.x * 8, 0, cz + d.z * 8 - p.z * 8, g, { size: 5 });

    // A prop that says what kind of place this is at a glance.
    this.themeProp(theme.prop, cx + d.x * 16 + p.x * 17, cz + d.z * 16 + p.z * 17, theme, g);

    // The signs, in two rows down either side of the street.
    // Four to a slot — two ranks either side of the street — rather than two.
    // A sixteen-word unit laid out two at a time makes a street ninety studs
    // long that runs off the end of the island; this keeps every district the
    // same length whatever the pack size.
    const stands = [];
    pack.words.forEach((w, k) => {
      const side = (k % 2) ? 1 : -1;
      const rank = (k % 4) < 2 ? ISLE_SIDE : ISLE_SIDE2;
      const slot = Math.floor(k / 4);
      const off = -16 + slot * ISLE_LANE;
      const sx = cx + d.x * off + p.x * side * rank;
      const sz = cz + d.z * off + p.z * side * rank;
      // The sign's front normal points across the street at whoever is running
      // up it, so it is readable on the way past rather than only head-on.
      const facing = Math.atan2(-side * p.x, -side * p.z);
      const data = { word: w, packId: pack.id };
      const stand = wordStand(this.world, sx, 0, sz, w, accent, g, Object.assign(data, { facing }));
      stand.packId = pack.id;
      stand.cool = 0;
      stand.trigger.data.stand = stand;
      stands.push(stand);
      this.standList.push(stand);
    });

    // A fence along the back, to close the street off visually.
    fenceRun(this.world, cx + d.x * 30, 0, cz + d.z * 30, across,
      d.x ? 'z' : 'x', bc('Institutional white'), g);

    // Clipped hedges run down the outside of both ranks of signs, which is what
    // turns two rows of posts into a street with sides.
    [-1, 1].forEach((k) => {
      // Parallel to the street, so the axis follows d — not the fence's, which
      // runs across it.
      hedgeRow(this.world, cx + d.x * -2 + p.x * k * 23, 0, cz + d.z * -2 + p.z * k * 23,
        44, d.x ? 'x' : 'z', g);
    });

    // The shopkeeper, standing beside the gate.
    const greet = GREETERS[index % GREETERS.length];
    const guide = new Guide(this.scene, { guide: greet }, gx + p.x * 9, 0, gz + p.z * 9);
    this.greeters.push({
      guide, name: greet.name, x: gx + p.x * 9, z: gz + p.z * 9,
      line: `Welcome to ${pack.name}! ${pack.blurb}`,
      armed: true, spoken: false,
    });

    const dis = {
      index, pack, theme, accent, dir: d, across: p, group: g, stands,
      x: cx, z: cz, gate: { x: gx, z: gz },
    };
    this.districts.push(dis);
    return dis;
  }

  // A Roblox arch with the unit's name on it, turned to face the plaza.
  gateAt(x, z, yaw, pack, accent, g) {
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = yaw;
    g.add(holder);

    [-11, 11].forEach((dx) => {
      const leg = part(2.4, 13, 2.4, accent, { repeat: [2, 2] });
      leg.position.set(dx, 6.5, 0);
      holder.add(leg);
    });
    const top = part(24.4, 2.4, 2.4, accent, { repeat: [24, 2] });
    top.position.set(0, 14.2, 0);
    holder.add(top);

    // The district's name in chunky 3D letters across the arch, the way the
    // reference sheet signs its shops — NOT an eighteen-stud white billboard.
    // Four of those (one per gate, plus the welcome board) were three quarters
    // of every plaza screenshot, and they read as advertising hoardings rather
    // than as a town.
    // Sized to the arch, and sat ON its top beam. Floating free below the beam
    // at full size they simply replaced one giant white rectangle with a giant
    // coloured one — four gates are visible at once from the spawn pad.
    const size = Math.min(2.5, 17 / Math.max(3, pack.name.length));
    [0.8, -0.8].forEach((dz, k) => {
      const letters = signLetters(pack.name, size);
      letters.position.set(0, 15.4 + size * 0.3, dz);
      if (k) letters.rotation.y = Math.PI;
      holder.add(letters);
    });

    // The word list stays, small, under the arch — it is what tells a pupil
    // what this street is for, and it is read from a few studs away, not from
    // the plaza.
    const tex = boardFace(pack.name, pack.blurb);
    const backing = part(11, 3.3, 0.4, bc('Institutional white'), { studs: false });
    backing.position.set(0, 8.2, 0);
    holder.add(backing);
    [0.23, -0.23].forEach((dz, k) => {
      const face = decalPlane(tex, 10.3, 2.9);
      face.position.set(0, 8.2, dz);
      if (k) face.rotation.y = Math.PI;
      holder.add(face);
    });
    return holder;
  }

  // The one prop that says what sort of place this is.
  themeProp(kind, x, z, theme, g) {
    if (kind === 'flag') {
      const pole = part(0.8, 18, 0.8, bc('Institutional white'), { studs: false, castShadow: false });
      pole.position.set(x, 9, z);
      g.add(pole);
      const flag = part(7, 4, 0.3, bc('Bright red'), { studs: false });
      flag.position.set(x + 3.9, 15, z);
      g.add(flag);
      return;
    }
    if (kind === 'kennel') {
      const box = part(7, 6, 7, bc('Reddish brown'), { repeat: [7, 7] });
      this.world.place(box, x, 3, z, { parent: g });
      const roof = part(8, 1.2, 8, bc(theme.roof), { repeat: [8, 8] });
      this.world.place(roof, x, 6.6, z, { parent: g });
      return;
    }
    if (kind === 'table') {
      const top = part(9, 0.8, 5, bc('Reddish brown'), { repeat: [9, 5] });
      this.world.place(top, x, 3.6, z, { parent: g });
      [-3.5, 3.5].forEach((dx) => {
        const leg = part(0.8, 3.2, 0.8, bc('Dark stone grey'), { studs: false, castShadow: false });
        leg.position.set(x + dx, 1.6, z);
        g.add(leg);
      });
      return;
    }
    if (kind === 'goal') {
      [-6, 6].forEach((dx) => {
        const post = part(0.8, 9, 0.8, bc('Institutional white'), { studs: false, castShadow: false });
        post.position.set(x + dx, 4.5, z);
        g.add(post);
      });
      const bar = part(12.8, 0.8, 0.8, bc('Institutional white'), { studs: false, castShadow: false });
      bar.position.set(x, 9, z);
      g.add(bar);
      return;
    }
    treeProp(this.world, x, 0, z, g, { palm: kind === 'palm', height: kind === 'palm' ? 10 : 7 });
  }

  // ------------------------------------------------------------- decoration

  // Panel 10 of the reference: the things that move. Both sit on the open green
  // between two streets, far enough out that they are somewhere to go and never
  // in the way of a word. Neither is solid — a spinning wheel that could shove a
  // pupil off their feet would break the island's one rule.
  buildFairground(g) {
    pathStrip(this.world, -58, 0, 58, 40, 40, bc('Br. yellowish green'), g);
    ferrisWheel(this.world, -58, 0, 58, g, { radius: 13, cars: 8 });
    lampPost(this.world, -44, 0, 44, g);
    benchProp(this.world, -46, 0, 58, Math.PI / 2, g);
    balloonBunch(this.world, -70, 0, 46, g, { count: 5 });

    pathStrip(this.world, 58, 0, -58, 42, 42, bc('Br. yellowish green'), g);
    trainRide(this.world, 58, 0, -58, g, { radius: 15 });
    lampPost(this.world, 44, 0, -44, g);
    benchProp(this.world, 58, 0, -40, Math.PI, g);
    flowerBed(this.world, 74, 0, -44, g, { size: 6 });
  }

  scatterCoins(g) {
    // Along the streets, alternating sides, so running down one pays.
    ISLE_DIRS.forEach((d) => {
      const p = { x: -d.z, z: d.x };
      for (let i = 0; i < 5; i++) {
        const along = ISLE_PLAZA / 2 + 4 + i * 5.5;
        const side = (i % 2 ? 1 : -1) * 3.5;
        coin(this.world, d.x * along + p.x * side, 2.4, d.z * along + p.z * side, g, { value: 2 });
      }
    });
    // And a few out on the sand, for the pupils who wander.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const r = ISLE_SPAN / 2 - 9;
      coin(this.world, Math.cos(a) * r, 2.4, Math.sin(a) * r, g, { value: 3 });
    }
  }

  scatterTrees(g) {
    // The quiet corners between the streets. Anything near the plaza, a street
    // or a district would be something to run into, so those areas are skipped.
    let placed = 0;
    for (let tries = 0; tries < 520 && placed < 64; tries++) {
      const x = rand(-95, 95);
      const z = rand(-95, 95);
      if (Math.abs(x) < 12 || Math.abs(z) < 12) continue;              // the streets
      if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;              // the plaza
      // Measured ALONG and ACROSS each district's own street rather than in
      // world x/z. An axis-aligned box was the wrong shape for the east and
      // west districts and let trees grow in the middle of their streets.
      const near = this.districts.some((dd) => {
        const along = Math.abs((x - dd.x) * dd.dir.x + (z - dd.z) * dd.dir.z);
        const across = Math.abs((x - dd.x) * dd.across.x + (z - dd.z) * dd.across.z);
        return along < 40 && across < 27;
      });
      if (near) continue;
      // The two fairground plots, which are laid down before the trees are
      // scattered. Without this a copse grows inside the train's loop.
      if (Math.hypot(x + 58, z - 58) < 26) continue;
      if (Math.hypot(x - 58, z + 58) < 28) continue;
      treeProp(this.world, x, 0, z, g, {
        height: randInt(5, 9),
        spin: rand(0, Math.PI / 2),
        leaf: bc(Math.random() < 0.25 ? 'Br. yellowish green' : 'Bright green'),
      });
      placed++;
      // Undergrowth: a bush or two beside most trees, plus the odd wildflower
      // clump, so scattered trees read as a park with no bare ground between.
      for (let b = 0, clumps = randInt(1, 2); b < clumps; b++) {
        bushProp(this.world, x + rand(-4.5, 4.5), 0, z + rand(-4.5, 4.5), g, { size: rand(1.8, 3.2) });
      }
      if (Math.random() < 0.22) {
        flowerBed(this.world, x + rand(-6, 6), 0, z + rand(-6, 6), g, { size: rand(3, 4.5), count: randInt(6, 9) });
      }
    }
  }

  // ================================================================= playing

  // Start the run: the first hunt, once the pupil is on their feet. Guarded,
  // because it is fired from a timer — and starting twice would silently eat a
  // hunt and leave the pupil one word short of the finish.
  startRun() {
    if (this.started) return this.quests.current;
    this.started = true;
    return this.nextHunt();
  }

  nextHunt() {
    this.clearFlags();
    const hunt = this.quests.next();
    if (!hunt) { this.finish(); return null; }
    if (hunt.kind === 'grammar') this.plantFlags(hunt);
    this.asked.push({
      word: hunt.target.word,
      emoji: hunt.target.emoji || '',
      where: hunt.kind === 'grammar' ? 'grammar' : (this.districtById(hunt.packId) || {}).pack,
      done: false,
    });
    this.aimBeam(hunt);
    this.lastHuntAt = this.t;
    if (this.hooks.onHunt) this.hooks.onHunt(hunt);
    return hunt;
  }

  get hunt() { return this.quests.current; }

  // The beam marks the district, never the sign. That gap — knowing the street
  // but not the door — is where the reading happens.
  aimBeam(hunt) {
    if (!this.beam) return;
    if (hunt.kind === 'grammar') {
      this.beam.visible = false;
      this.beacon = null;
      return;
    }
    const dis = this.districts.find((d) => d.pack.id === hunt.packId) || this.districts[0];
    this.beam.moveTo(dis.gate.x, dis.gate.z);
    this.beam.setColour(dis.accent);
    this.beam.visible = true;
    this.beacon = { x: dis.gate.x, z: dis.gate.z, name: dis.pack.name };
  }

  // Year 4's grammar hunts: one flag per district, so reading the sentence is
  // what decides which way you run. These are the island's answer bricks.
  plantFlags(hunt) {
    this.flagGroup = this.world.group('flags');
    const spread = shuffle(this.districts.slice());
    (hunt.options || []).forEach((opt, i) => {
      const dis = spread[i % spread.length];
      const p = dis.across;
      const fx = dis.gate.x + p.x * 17;
      const fz = dis.gate.z + p.z * 17;
      const flag = answerFlag(this.world, fx, 0, fz, opt.label, dis.accent, this.flagGroup,
        { label: opt.label, correct: opt.correct });
      flag.cool = 0;
      flag.district = dis;
      this.flags.push(flag);
    });
  }

  clearFlags() {
    if (this.flagGroup) this.world.clearGroup(this.flagGroup);
    this.flagGroup = null;
    this.flags.length = 0;
  }

  // ------------------------------------------------------------- the touches
  // Both return 'hit', 'miss', 'new' or null. Nothing here can kill: the worst
  // that happens to a pupil who touches the wrong thing is that they are told
  // in English what they just touched.

  touchStand(trigger) {
    const stand = trigger.data && trigger.data.stand;
    if (!stand || stand.cool > 0) return null;
    stand.cool = 1.8;                     // or it fires sixty times a second

    const hunt = this.quests.current;
    const first = stand.markFound();
    this.visited.add(stand.packId);
    if (first && this.hooks.onDiscover) this.hooks.onDiscover(stand);

    // Matched on the word alone, not the word and its district: if the same word
    // happens to appear in two units, either sign is a fair answer.
    if (hunt && hunt.kind !== 'grammar' && stand.word.word === hunt.target.word) {
      stand.cheer();
      this.markAsked();
      this.hits += 1;
      if (this.hooks.onHit) this.hooks.onHit(hunt, stand);
      this.nextHunt();
      return 'hit';
    }

    if (this.hooks.onMiss) this.hooks.onMiss(hunt, stand, first);
    return first ? 'new' : 'miss';
  }

  touchFlag(trigger) {
    const flag = this.flags.find((f) => f.trigger === trigger);
    if (!flag || flag.cool > 0) return null;
    flag.cool = 1.8;

    const hunt = this.quests.current;
    if (!hunt || hunt.kind !== 'grammar') return null;

    if (trigger.data && trigger.data.correct) {
      this.markAsked();
      this.hits += 1;
      if (this.hooks.onHit) this.hooks.onHit(hunt, flag);
      this.nextHunt();
      return 'hit';
    }
    if (this.hooks.onMiss) this.hooks.onMiss(hunt, flag, false);
    return 'miss';
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    if (this.beam) this.beam.visible = false;
    this.beacon = null;
    this.clearFlags();
    if (this.hooks.onFinish) this.hooks.onFinish();
  }

  // ------------------------------------------------------------------ frame

  update(dt, humanoid, camera) {
    this.t += dt;

    for (let i = 0; i < this.standList.length; i++) {
      const s = this.standList[i];
      if (s.cool > 0) s.cool -= dt;
    }
    for (let i = 0; i < this.flags.length; i++) {
      if (this.flags[i].cool > 0) this.flags[i].cool -= dt;
    }

    for (const gr of this.greeters) {
      gr.guide.update(dt, camera, humanoid.pos);
      const dx = humanoid.pos.x - gr.x;
      const dz = humanoid.pos.z - gr.z;
      // 18 studs, not 26: the spawn pad is nineteen studs from the nearest gate,
      // and a shopkeeper who welcomes you to a district you are standing with
      // your back to is just noise over the guide's opening line.
      const near = dx * dx + dz * dz < 18 * 18;
      if (near && gr.armed) {
        gr.armed = false;
        // Spoken the first time you arrive; after that the bubble is silent, so
        // four shopkeepers cannot end up talking over the hunt.
        const aloud = !gr.spoken && (this.t - this.lastHuntAt) > 2;
        gr.spoken = true;
        gr.guide.chat(gr.line, { speak: aloud });
        if (this.hooks.onChat) this.hooks.onChat(gr.name, gr.line);
      } else if (!near && !gr.armed) {
        gr.armed = true;
      }
    }
  }

  // Kept so main.js can treat a Course and an Island the same way.
  faceCamera(camera) {
    for (let i = 0; i < this.billboards.length; i++) {
      const b = this.billboards[i];
      if (b.visible) b.quaternion.copy(camera.quaternion);
    }
  }

  returnToPlaza(humanoid) {
    humanoid.teleport(this.spawn.x, this.spawn.y, this.spawn.z);
  }

  // ---------------------------------------------------------- the HUD panels
  markAsked() {
    const row = this.asked[this.asked.length - 1];
    if (row) row.done = true;
  }

  // The checklist the QUESTS panel draws. Answered hunts are named, the current
  // one is named too — it is on the banner already — and everything still to
  // come stays a dot, because listing it would hand over the run.
  checklist() {
    const rows = this.asked.map((r, i) => ({
      word: r.word,
      emoji: r.emoji,
      where: r.where && r.where.name ? r.where.name : '',
      state: r.done ? 'done' : 'now',
    }));
    while (rows.length < this.totalHunts) rows.push({ state: 'locked' });
    return rows;
  }

  // Every word this run has actually put in front of the pupil — the hunted
  // ones and the wrong signs they touched on the way, which teach just as much.
  metWords() {
    return this.standList.filter((s) => s.found).map((s) => s.word);
  }

  // The plateau's span, for the minimap's scale.
  get span() { return ISLE_SPAN; }

  // ------------------------------------------------------------------ counts
  get totalHunts() { return this.quests.total; }
  get totalWords() { return this.standList.length; }
  get foundWords() { return this.standList.filter((s) => s.found).length; }
  get districtsVisited() { return this.visited.size; }

  // Used by the debug console to reach a stand without running to it.
  standForWord(word) {
    return this.standList.find((s) => s.word.word === word) || null;
  }
  wrongStand(hunt) {
    const want = hunt ? hunt.target.word : null;
    return this.standList.find((s) => s.word.word !== want && s.cool <= 0) || null;
  }
  districtById(id) { return this.districts.find((d) => d.pack.id === id) || null; }

  dispose() {
    this.greeters.forEach((g) => g.guide.dispose());
    this.greeters.length = 0;
  }
}
