// ============================================================================
//  items.js — each vocabulary word as a brick-built 3D object.
// ============================================================================
//
// The player is a minifigure made of parts, not a picture of one. Word stands
// work the same way: a kite is a kite of bricks sitting on the plinth, a "five"
// is a digit stacked from coloured bricks, a colour is a 2×4 in that colour.
// No PNG, no emoji plane.

import * as THREE from 'three';
import { part, bc } from './rbx.js';

const C = {
  red: bc('Bright red'),
  blue: bc('Bright blue'),
  yellow: bc('Bright yellow'),
  green: bc('Bright green'),
  orange: bc('Bright orange'),
  violet: bc('Bright violet'),
  lime: bc('Br. yellowish green'),
  grey: bc('Medium stone grey'),
  dark: bc('Dark stone grey'),
  black: bc('Really black'),
  white: bc('Institutional white'),
  brown: bc('Reddish brown'),
  pink: bc('Hot pink'),
  skin: bc('Bright yellow'),
  sand: bc('Cool yellow'),
  teal: bc('Bright bluish green'),
};

export function itemSlug(w) {
  return String(w).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function brick(g, sx, sy, sz, colour, x, y, z, opts = {}) {
  const m = part(sx, sy, sz, colour, {
    studs: opts.studs !== false,
    castShadow: opts.cast !== false,
  });
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  g.add(m);
  return m;
}

function cyl(g, r, h, colour, x, y, z, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(opts.r2 !== undefined ? opts.r2 : r, r, h, opts.seg || 16),
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.42, metalness: opts.metal || 0 }),
  );
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = true;
  g.add(m);
  return m;
}

function cone(g, r, h, colour, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 16),
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.44 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

function sphere(g, r, colour, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 14, 12),
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

// A small minifigure, same parts language as the player, ~2.4 studs tall.
function fig(g, x, z, look = {}) {
  const skin = look.skin || C.skin;
  const shirt = look.shirt || C.red;
  const pants = look.pants || C.blue;
  const hair = look.hair || C.brown;
  const s = look.s || 0.48;
  const f = new THREE.Group();
  f.position.set(x, 0, z);
  g.add(f);

  brick(f, 0.9 * s * 2, 0.7 * s, 1.0 * s, pants, 0, 0.55 * s, 0, { studs: false });
  brick(f, 0.78 * s, 1.7 * s, 0.95 * s, pants, -0.42 * s, 0.95 * s, 0, { studs: false });
  brick(f, 0.78 * s, 1.7 * s, 0.95 * s, pants, 0.42 * s, 0.95 * s, 0, { studs: false });
  brick(f, 0.88 * s, 0.4 * s, 1.15 * s, C.black, -0.42 * s, 0.22 * s, 0.1 * s, { studs: false });
  brick(f, 0.88 * s, 0.4 * s, 1.15 * s, C.black, 0.42 * s, 0.22 * s, 0.1 * s, { studs: false });

  brick(f, 1.7 * s, 1.45 * s, 0.95 * s, shirt, 0, 2.55 * s, 0, { studs: false });
  brick(f, 0.62 * s, 1.3 * s, 0.68 * s, shirt, -1.05 * s, 2.45 * s, 0, { studs: false });
  brick(f, 0.62 * s, 1.3 * s, 0.68 * s, shirt, 1.05 * s, 2.45 * s, 0, { studs: false });
  cyl(f, 0.32 * s, 0.28 * s, skin, -1.05 * s, 1.7 * s, 0);
  cyl(f, 0.32 * s, 0.28 * s, skin, 1.05 * s, 1.7 * s, 0);

  cyl(f, 0.68 * s, 1.15 * s, skin, 0, 3.85 * s, 0, { seg: 20 });
  cyl(f, 0.26 * s, 0.16 * s, skin, 0, 4.5 * s, 0);
  brick(f, 0.14 * s, 0.2 * s, 0.06 * s, C.black, -0.2 * s, 3.95 * s, 0.66 * s, { studs: false });
  brick(f, 0.14 * s, 0.2 * s, 0.06 * s, C.black, 0.2 * s, 3.95 * s, 0.66 * s, { studs: false });
  if (!look.bald) {
    cyl(f, 0.72 * s, 0.4 * s, hair, 0, 4.42 * s, 0, { seg: 16 });
    if (look.bow) brick(f, 0.45 * s, 0.22 * s, 0.22 * s, C.pink, 0.55 * s, 4.55 * s, 0.1 * s, { studs: false });
  }
  if (look.hat === 'cap') {
    cyl(f, 0.78 * s, 0.28 * s, look.hatCol || C.red, 0, 4.58 * s, 0);
    brick(f, 0.7 * s, 0.1 * s, 0.55 * s, look.hatCol || C.red, 0, 4.42 * s, 0.55 * s, { studs: false });
  }
  if (look.arm === 'wave') {
    f.children[6].rotation.z = -0.9;
    f.children[6].position.y += 0.15 * s;
  }
  return f;
}

function plate2x4(g, colour, y = 0.2) {
  brick(g, 2.0, 0.4, 4.0, colour, 0, y, 0);
}

const DIGITS = {
  0: ['###', '# #', '# #', '# #', '###'],
  1: [' # ', '## ', ' # ', ' # ', '###'],
  2: ['###', '  #', '###', '#  ', '###'],
  3: ['###', '  #', '###', '  #', '###'],
  4: ['# #', '# #', '###', '  #', '  #'],
  5: ['###', '#  ', '###', '  #', '###'],
  6: ['###', '#  ', '###', '# #', '###'],
  7: ['###', '  #', '  #', ' # ', ' # '],
  8: ['###', '# #', '###', '# #', '###'],
  9: ['###', '# #', '###', '  #', '###'],
};
const DCOL = [C.red, C.yellow, C.blue, C.green, C.orange, C.violet];

function digit(g, n, ox = 0) {
  const rows = DIGITS[n];
  const cell = 0.42;
  rows.forEach((row, ri) => {
    [...row].forEach((ch, ci) => {
      if (ch === ' ') return;
      const col = DCOL[(ri + ci + n) % DCOL.length];
      brick(g, cell * 0.92, cell * 0.92, cell * 0.92, col,
        ox + (ci - 1) * cell, cell * 0.5 + (4 - ri) * cell, 0);
    });
  });
}

function numberN(n) {
  return (g) => {
    brick(g, 2.4, 0.24, 1.2, C.dark, 0, 0.12, 0);
    if (n === 10) { digit(g, 1, -0.7); digit(g, 0, 0.7); }
    else digit(g, n, 0);
  };
}

function animal(g, opts) {
  const body = opts.body || C.brown;
  const sx = opts.sx || 1.6, sy = opts.sy || 1.0, sz = opts.sz || 2.2;
  brick(g, sx, sy, sz, body, 0, sy / 2 + 0.55, 0, { studs: false });
  const legs = opts.legs !== false;
  if (legs) {
    const ly = 0.28;
    [[-sx * 0.32, sz * 0.32], [sx * 0.32, sz * 0.32], [-sx * 0.32, -sz * 0.32], [sx * 0.32, -sz * 0.32]]
      .forEach(([lx, lz]) => brick(g, 0.32, 0.55, 0.32, opts.leg || body, lx, ly, lz, { studs: false }));
  }
  const hx = opts.hx !== undefined ? opts.hx : 0;
  const hz = opts.hz !== undefined ? opts.hz : sz * 0.55;
  const hs = opts.hs || 0.9;
  brick(g, hs, hs, hs, opts.head || body, hx, sy + 0.55, hz, { studs: false });
  if (opts.ears) {
    brick(g, 0.28, 0.45, 0.18, opts.ear || body, hx - hs * 0.35, sy + 0.55 + hs * 0.55, hz, { studs: false });
    brick(g, 0.28, 0.45, 0.18, opts.ear || body, hx + hs * 0.35, sy + 0.55 + hs * 0.55, hz, { studs: false });
  }
  if (opts.snout) brick(g, 0.4, 0.3, 0.35, opts.snout, hx, sy + 0.4, hz + hs * 0.55, { studs: false });
  if (opts.tail) brick(g, 0.22, 0.22, opts.tail, body, 0, sy, -sz * 0.55, { studs: false });
  if (opts.horn) cone(g, 0.16, 0.5, opts.horn, hx, sy + 0.55 + hs * 0.7, hz);
}

function carLike(g, body, accent) {
  brick(g, 1.8, 0.55, 3.0, body, 0, 0.7, 0);
  brick(g, 1.5, 0.55, 1.4, accent, 0, 1.2, -0.2, { studs: false });
  brick(g, 1.2, 0.28, 1.1, C.white, 0, 1.28, 0.15, { studs: false });
  [[-0.85, 0.9], [0.85, 0.9], [-0.85, -0.9], [0.85, -0.9]].forEach(([x, z]) => {
    cyl(g, 0.32, 0.22, C.black, x, 0.32, z, { rx: Math.PI / 2, seg: 12 });
  });
}

function fallback(g) {
  brick(g, 1.6, 0.4, 1.6, C.yellow, 0, 0.2, 0);
  brick(g, 1.2, 0.4, 1.2, C.red, 0, 0.6, 0);
  brick(g, 0.8, 0.4, 0.8, C.blue, 0, 1.0, 0);
}

const BUILDERS = {
  // friends
  hello: (g) => fig(g, 0, 0, { shirt: C.red, pants: C.blue, arm: 'wave' }),
  goodbye: (g) => fig(g, 0, 0, { shirt: C.orange, pants: C.green, arm: 'wave', hat: 'cap' }),
  boy: (g) => fig(g, 0, 0, { shirt: C.blue, pants: C.dark, hat: 'cap', hatCol: C.blue }),
  girl: (g) => fig(g, 0, 0, { shirt: C.pink, pants: C.violet, hair: C.brown, bow: true }),
  friend: (g) => { fig(g, -0.7, 0.2, { shirt: C.green, pants: C.blue, s: 0.42 }); fig(g, 0.7, -0.15, { shirt: C.pink, pants: C.violet, bow: true, s: 0.42 }); },
  teacher: (g) => {
    fig(g, 0, 0, { shirt: C.brown, pants: C.dark, hair: C.brown });
    brick(g, 0.7, 0.12, 0.5, C.blue, 0.85, 1.15, 0.35, { studs: false, rz: 0.3 });
    brick(g, 0.7, 0.12, 0.5, C.red, 0.85, 1.05, 0.35, { studs: false, rz: 0.3 });
  },
  school: (g) => {
    brick(g, 2.6, 1.6, 1.8, C.sand, 0, 0.9, 0);
    brick(g, 2.8, 0.35, 2.0, C.blue, 0, 1.85, 0);
    brick(g, 0.7, 1.0, 0.2, C.yellow, 0, 0.7, 0.95, { studs: false });
    brick(g, 0.45, 0.45, 0.12, C.white, -0.7, 1.15, 0.95, { studs: false });
    brick(g, 0.45, 0.45, 0.12, C.white, 0.7, 1.15, 0.95, { studs: false });
    cyl(g, 0.22, 0.12, C.yellow, 0, 2.15, 0.2);
  },
  name: (g) => {
    brick(g, 2.2, 0.2, 1.4, C.blue, 0, 0.7, 0);
    brick(g, 1.8, 0.9, 0.2, C.white, 0, 1.15, 0.15, { studs: false });
    cyl(g, 0.2, 0.2, C.yellow, -0.55, 1.4, 0.28);
  },

  one: numberN(1), two: numberN(2), three: numberN(3), four: numberN(4),
  five: numberN(5), six: numberN(6), seven: numberN(7), eight: numberN(8),
  nine: numberN(9), ten: numberN(10),

  red: (g) => plate2x4(g, C.red),
  blue: (g) => plate2x4(g, C.blue),
  yellow: (g) => plate2x4(g, C.yellow),
  green: (g) => plate2x4(g, C.green),
  orange: (g) => plate2x4(g, C.orange),
  purple: (g) => plate2x4(g, C.violet),
  brown: (g) => plate2x4(g, C.brown),
  black: (g) => plate2x4(g, C.black),
  white: (g) => plate2x4(g, C.white),
  pink: (g) => plate2x4(g, C.pink),

  pen: (g) => { cyl(g, 0.12, 2.4, C.blue, 0, 1.2, 0); cone(g, 0.12, 0.35, C.grey, 0, 2.55, 0); brick(g, 0.22, 0.18, 0.22, C.black, 0, 0.12, 0, { studs: false }); },
  pencil: (g) => { cyl(g, 0.12, 2.3, C.yellow, 0, 1.2, 0); cone(g, 0.12, 0.4, C.sand, 0, 2.5, 0); brick(g, 0.08, 0.12, 0.08, C.black, 0, 2.72, 0, { studs: false }); },
  rubber: (g) => brick(g, 1.4, 0.55, 0.7, C.pink, 0, 0.35, 0),
  book: (g) => { brick(g, 1.6, 0.35, 2.0, C.red, 0, 0.3, 0); brick(g, 1.5, 0.08, 1.9, C.white, 0, 0.5, 0, { studs: false }); },
  notebook: (g) => { brick(g, 1.5, 0.3, 2.0, C.blue, 0, 0.28, 0); brick(g, 0.12, 0.32, 2.0, C.yellow, -0.7, 0.28, 0, { studs: false }); },
  bag: (g) => { brick(g, 1.5, 1.6, 0.7, C.red, 0, 0.9, 0); brick(g, 0.18, 0.7, 0.18, C.black, -0.4, 1.85, 0, { studs: false }); brick(g, 0.18, 0.7, 0.18, C.black, 0.4, 1.85, 0, { studs: false }); },
  desk: (g) => { brick(g, 2.4, 0.25, 1.4, C.brown, 0, 1.15, 0); [[-1, 0.5], [1, 0.5], [-1, -0.5], [1, -0.5]].forEach(([x, z]) => brick(g, 0.22, 1.05, 0.22, C.brown, x, 0.52, z, { studs: false })); },
  ruler: (g) => brick(g, 0.4, 0.12, 2.6, C.yellow, 0, 0.2, 0),
  'pencil-case': (g) => { brick(g, 2.2, 0.7, 0.9, C.red, 0, 0.4, 0); brick(g, 2.0, 0.12, 0.7, C.yellow, 0, 0.8, 0); },

  kite: (g) => {
    brick(g, 1.1, 0.18, 1.1, C.blue, -0.4, 2.3, 0, { rz: Math.PI / 4, studs: false });
    brick(g, 1.1, 0.18, 1.1, C.yellow, 0.4, 2.3, 0, { rz: -Math.PI / 4, studs: false });
    brick(g, 1.1, 0.18, 1.1, C.red, -0.4, 1.5, 0, { rz: -Math.PI / 4, studs: false });
    brick(g, 1.1, 0.18, 1.1, C.green, 0.4, 1.5, 0, { rz: Math.PI / 4, studs: false });
    brick(g, 0.1, 1.3, 0.1, C.black, 0, 0.7, 0, { studs: false });
    [0.9, 0.55, 0.25].forEach((y, i) => brick(g, 0.28, 0.12, 0.28, DCOL[i], 0.15, y, 0, { studs: false }));
  },
  doll: (g) => fig(g, 0, 0, { shirt: C.pink, pants: C.pink, hair: C.brown, bow: true, s: 0.5 }),
  monster: (g) => {
    brick(g, 1.8, 1.6, 1.4, C.blue, 0, 1.1, 0, { studs: false });
    sphere(g, 0.35, C.white, 0, 1.55, 0.7);
    sphere(g, 0.16, C.black, 0, 1.55, 0.95);
    cone(g, 0.18, 0.5, C.orange, -0.45, 2.1, 0.1);
    cone(g, 0.18, 0.5, C.orange, 0.45, 2.1, 0.1);
    brick(g, 0.5, 0.25, 0.2, C.red, 0, 0.85, 0.75, { studs: false });
  },
  plane: (g) => {
    brick(g, 0.7, 0.55, 2.4, C.blue, 0, 0.7, 0);
    brick(g, 2.6, 0.18, 0.7, C.white, 0, 0.75, 0);
    brick(g, 0.18, 0.7, 0.7, C.red, 0, 1.1, -1.0, { studs: false });
    cyl(g, 0.08, 1.0, C.black, 0, 0.7, 1.3, { rz: Math.PI / 2 });
    brick(g, 0.45, 0.35, 0.45, C.red, 0, 0.7, 1.15, { studs: false });
  },
  'computer-game': (g) => {
    brick(g, 2.2, 1.1, 0.35, C.black, 0, 0.85, 0, { studs: false });
    brick(g, 1.3, 0.85, 0.12, C.blue, 0, 0.85, 0.2, { studs: false });
    brick(g, 0.45, 0.9, 0.3, C.teal, -0.95, 0.85, 0, { studs: false });
    brick(g, 0.45, 0.9, 0.3, C.red, 0.95, 0.85, 0, { studs: false });
  },
  train: (g) => {
    brick(g, 1.2, 1.1, 1.6, C.red, 0, 0.9, 0.4);
    brick(g, 1.0, 0.9, 1.1, C.blue, 0, 0.8, -1.1);
    cyl(g, 0.22, 0.5, C.black, 0, 1.55, 1.0);
    [[-0.45, 0.5], [0.45, 0.5], [-0.45, -0.3], [0.45, -0.3], [-0.45, -1.2], [0.45, -1.2]]
      .forEach(([x, z]) => cyl(g, 0.28, 0.18, C.black, x, 0.28, z, { rx: Math.PI / 2 }));
  },
  car: (g) => carLike(g, C.red, C.white),
  ball: (g) => {
    sphere(g, 0.85, C.white, 0, 0.9, 0);
    brick(g, 0.5, 0.5, 0.5, C.black, 0, 0.9, 0.55, { studs: false });
    brick(g, 0.5, 0.5, 0.5, C.black, 0.4, 1.2, -0.2, { studs: false });
  },
  bike: (g) => {
    cyl(g, 0.55, 0.14, C.black, -0.85, 0.55, 0, { rx: Math.PI / 2 });
    cyl(g, 0.55, 0.14, C.black, 0.85, 0.55, 0, { rx: Math.PI / 2 });
    brick(g, 1.7, 0.12, 0.12, C.red, 0, 0.95, 0, { studs: false });
    brick(g, 0.12, 0.7, 0.12, C.red, 0.7, 1.2, 0, { studs: false });
    brick(g, 0.7, 0.1, 0.1, C.black, 0.7, 1.55, 0, { studs: false });
    brick(g, 0.35, 0.18, 0.35, C.blue, 0.1, 1.15, 0, { studs: false });
  },
  'go-kart': (g) => {
    carLike(g, C.red, C.yellow);
    fig(g, 0, -0.15, { shirt: C.blue, hat: 'cap', hatCol: C.red, s: 0.28 });
  },

  elephant: (g) => { animal(g, { body: C.grey, sx: 1.6, sy: 1.2, sz: 2.2, hs: 1.0, ears: true, ear: C.grey }); brick(g, 0.28, 1.0, 0.28, C.grey, 0, 1.0, 1.5, { studs: false }); },
  rat: (g) => animal(g, { body: C.grey, sx: 0.9, sy: 0.55, sz: 1.5, hs: 0.55, ears: true, tail: 1.1 }),
  lizard: (g) => { animal(g, { body: C.lime, sx: 0.7, sy: 0.4, sz: 2.0, hs: 0.5, legs: true, tail: 1.2 }); },
  frog: (g) => { brick(g, 1.4, 0.7, 1.4, C.green, 0, 0.55, 0, { studs: false }); sphere(g, 0.22, C.white, -0.35, 1.05, 0.4); sphere(g, 0.22, C.white, 0.35, 1.05, 0.4); },
  spider: (g) => {
    sphere(g, 0.45, C.black, 0, 0.7, 0);
    [-0.5, 0.5].forEach((x) => {
      [-0.4, 0, 0.4].forEach((z) => brick(g, 0.12, 0.12, 0.8, C.black, x, 0.45, z, { rz: x > 0 ? 0.4 : -0.4, studs: false }));
    });
  },
  duck: (g) => { brick(g, 1.2, 0.7, 1.6, C.white, 0, 0.55, 0, { studs: false }); brick(g, 0.7, 0.55, 0.7, C.white, 0, 1.1, 0.55, { studs: false }); brick(g, 0.35, 0.2, 0.45, C.orange, 0, 1.0, 1.0, { studs: false }); },
  dog: (g) => animal(g, { body: C.brown, sx: 1.1, sy: 0.8, sz: 1.8, ears: true, snout: C.sand, tail: 0.6 }),
  cat: (g) => animal(g, { body: C.orange, sx: 1.0, sy: 0.7, sz: 1.6, ears: true, tail: 0.9 }),

  banana: (g) => { cyl(g, 0.22, 2.0, C.yellow, 0, 1.0, 0, { rz: 0.5, r2: 0.16 }); },
  cake: (g) => { cyl(g, 1.0, 0.7, C.sand, 0, 0.5, 0); cyl(g, 1.0, 0.25, C.pink, 0, 0.95, 0); brick(g, 0.2, 0.35, 0.2, C.red, 0, 1.25, 0, { studs: false }); },
  'cheese-sandwich': (g) => { brick(g, 1.6, 0.2, 1.6, C.sand, 0, 0.25, 0); brick(g, 1.5, 0.18, 1.5, C.yellow, 0, 0.45, 0, { studs: false }); brick(g, 1.6, 0.2, 1.6, C.sand, 0, 0.65, 0); },
  apple: (g) => { sphere(g, 0.7, C.red, 0, 0.75, 0); brick(g, 0.12, 0.4, 0.12, C.brown, 0, 1.5, 0, { studs: false }); },
  pizza: (g) => { cyl(g, 1.2, 0.18, C.yellow, 0, 0.2, 0, { seg: 8 }); brick(g, 0.35, 0.1, 0.35, C.red, 0.3, 0.32, 0.2, { studs: false }); brick(g, 0.3, 0.1, 0.3, C.green, -0.4, 0.32, -0.1, { studs: false }); },
  sausage: (g) => cyl(g, 0.22, 2.0, C.brown, 0, 0.4, 0, { rz: Math.PI / 2 }),
  chicken: (g) => { brick(g, 1.1, 0.7, 1.8, C.orange, 0, 0.55, 0, { studs: false }); brick(g, 0.4, 0.4, 0.5, C.sand, 0, 0.9, 0.9, { studs: false }); },
  steak: (g) => brick(g, 1.8, 0.35, 1.3, C.brown, 0, 0.25, 0),
  peas: (g) => { cyl(g, 0.7, 0.25, C.white, 0, 0.2, 0); [0, 0.35, -0.35].forEach((x, i) => sphere(g, 0.22, C.green, x, 0.45, i === 0 ? 0 : (i - 1.5) * 0.2)); },
  carrots: (g) => { cone(g, 0.28, 1.6, C.orange, 0, 0.9, 0); brick(g, 0.4, 0.35, 0.4, C.green, 0, 1.8, 0, { studs: false }); },

  monday: (g) => { plate2x4(g, C.red, 0.2); fig(g, 0, 0, { shirt: C.blue, s: 0.32 }); },
  tuesday: (g) => { plate2x4(g, C.orange, 0.2); fig(g, 0, 0, { shirt: C.red, s: 0.32 }); },
  wednesday: (g) => { plate2x4(g, C.yellow, 0.2); brick(g, 0.5, 0.5, 0.5, C.red, 0.4, 0.7, 0.3); brick(g, 0.5, 0.5, 0.5, C.blue, -0.3, 0.7, -0.2); },
  thursday: (g) => { plate2x4(g, C.green, 0.2); brick(g, 0.9, 0.15, 0.7, C.red, 0, 0.7, 0, { rx: -0.4 }); },
  friday: (g) => { plate2x4(g, C.blue, 0.2); fig(g, 0, 0, { shirt: C.red, arm: 'wave', s: 0.32 }); },
  saturday: (g) => { plate2x4(g, C.violet, 0.2); BUILDERS.bike(g); },
  sunday: (g) => { plate2x4(g, C.pink, 0.2); animal(g, { body: C.sand, sx: 0.7, sy: 0.45, sz: 1.1, ears: true, s: 0.5 }); },
  'the-weekend': (g) => {
    brick(g, 2.2, 0.3, 2.2, C.sand, 0, 0.15, 0);
    cyl(g, 0.12, 1.8, C.brown, 0.6, 1.0, -0.4);
    brick(g, 1.2, 0.2, 1.2, C.green, 0.6, 1.9, -0.4, { studs: false });
    fig(g, -0.5, 0.3, { shirt: C.yellow, s: 0.28 });
  },

  bathroom: (g) => { brick(g, 1.6, 0.7, 0.9, C.white, 0, 0.45, 0); cyl(g, 0.18, 0.7, C.grey, 0.5, 0.9, 0.2); },
  bedroom: (g) => { brick(g, 2.0, 0.4, 1.2, C.brown, 0, 0.35, 0); brick(g, 0.7, 0.35, 1.1, C.white, -0.55, 0.7, 0, { studs: false }); },
  'living-room': (g) => { brick(g, 2.2, 0.7, 1.0, C.orange, 0, 0.45, 0); brick(g, 0.45, 0.7, 1.0, C.orange, -1.1, 0.45, 0, { studs: false }); brick(g, 0.45, 0.7, 1.0, C.orange, 1.1, 0.45, 0, { studs: false }); },
  hall: (g) => { brick(g, 1.4, 2.0, 0.35, C.brown, 0, 1.0, 0); brick(g, 0.35, 0.35, 0.2, C.yellow, 0.45, 1.0, 0.1, { studs: false }); },
  'dining-room': (g) => { cyl(g, 0.9, 0.2, C.brown, 0, 0.85, 0); cyl(g, 0.18, 0.85, C.brown, 0, 0.42, 0); },
  kitchen: (g) => { brick(g, 2.0, 1.1, 1.0, C.white, 0, 0.6, 0); brick(g, 0.7, 0.5, 0.2, C.black, 0, 0.7, 0.55, { studs: false }); },
  stairs: (g) => { [0, 1, 2, 3].forEach((i) => brick(g, 1.4, 0.28, 0.5, C.brown, 0, 0.2 + i * 0.28, -0.6 + i * 0.4)); },
  cellar: (g) => { brick(g, 1.6, 0.4, 1.6, C.dark, 0, 0.2, 0); cyl(g, 0.15, 1.0, C.grey, 0, 0.9, 0); sphere(g, 0.22, C.yellow, 0, 1.5, 0); },

  jeans: (g) => { brick(g, 0.7, 1.8, 0.55, C.blue, -0.4, 0.95, 0, { studs: false }); brick(g, 0.7, 1.8, 0.55, C.blue, 0.4, 0.95, 0, { studs: false }); brick(g, 1.5, 0.45, 0.6, C.blue, 0, 1.95, 0, { studs: false }); },
  sweater: (g) => { brick(g, 1.6, 1.5, 0.7, C.red, 0, 1.1, 0, { studs: false }); brick(g, 0.5, 1.2, 0.5, C.red, -1.05, 1.0, 0, { studs: false }); brick(g, 0.5, 1.2, 0.5, C.red, 1.05, 1.0, 0, { studs: false }); },
  jacket: (g) => BUILDERS.sweater(g),
  skirt: (g) => { brick(g, 1.4, 0.9, 0.7, C.pink, 0, 0.7, 0, { studs: false }); brick(g, 0.8, 0.5, 0.5, C.pink, 0, 1.4, 0, { studs: false }); },
  shorts: (g) => { brick(g, 0.7, 0.9, 0.55, C.green, -0.4, 0.5, 0, { studs: false }); brick(g, 0.7, 0.9, 0.55, C.green, 0.4, 0.5, 0, { studs: false }); brick(g, 1.5, 0.4, 0.6, C.green, 0, 1.05, 0, { studs: false }); },
  cap: (g) => { cyl(g, 0.85, 0.4, C.red, 0, 0.5, 0); brick(g, 0.9, 0.12, 0.7, C.red, 0, 0.35, 0.6, { studs: false }); },
  shoes: (g) => { brick(g, 0.7, 0.45, 1.2, C.black, -0.5, 0.25, 0); brick(g, 0.7, 0.45, 1.2, C.black, 0.5, 0.25, 0); },
  socks: (g) => { brick(g, 0.55, 0.9, 0.5, C.white, -0.45, 0.5, 0, { studs: false }); brick(g, 0.55, 0.9, 0.5, C.white, 0.45, 0.5, 0, { studs: false }); },
  't-shirt': (g) => { brick(g, 1.6, 1.2, 0.55, C.blue, 0, 0.9, 0, { studs: false }); brick(g, 0.45, 0.4, 0.5, C.blue, -1.0, 1.3, 0, { studs: false }); brick(g, 0.45, 0.4, 0.5, C.blue, 1.0, 1.3, 0, { studs: false }); },
  trousers: (g) => BUILDERS.jeans(g),

  head: (g) => { cyl(g, 0.75, 1.3, C.skin, 0, 0.9, 0, { seg: 20 }); cyl(g, 0.28, 0.18, C.skin, 0, 1.62, 0); brick(g, 0.16, 0.22, 0.06, C.black, -0.22, 1.05, 0.72, { studs: false }); brick(g, 0.16, 0.22, 0.06, C.black, 0.22, 1.05, 0.72, { studs: false }); },
  arm: (g) => { brick(g, 0.55, 2.2, 0.55, C.skin, 0, 1.15, 0, { studs: false }); },
  fingers: (g) => { [ -0.45, -0.15, 0.15, 0.45 ].forEach((x) => brick(g, 0.22, 1.1, 0.22, C.skin, x, 0.6, 0, { studs: false })); },
  hand: (g) => { brick(g, 0.9, 0.4, 1.1, C.skin, 0, 0.4, 0, { studs: false }); [ -0.3, 0, 0.3 ].forEach((x) => brick(g, 0.22, 0.55, 0.22, C.skin, x, 0.85, 0.4, { studs: false })); },
  knee: (g) => { brick(g, 0.7, 1.6, 0.7, C.skin, 0, 0.85, 0, { studs: false }); sphere(g, 0.28, C.skin, 0, 0.85, 0.35); },
  leg: (g) => { brick(g, 0.7, 2.2, 0.7, C.blue, 0, 1.15, 0, { studs: false }); brick(g, 0.75, 0.35, 1.0, C.black, 0, 0.2, 0.1); },
  toes: (g) => { brick(g, 1.3, 0.3, 0.7, C.skin, 0, 0.2, 0); [ -0.5, -0.25, 0, 0.25, 0.5 ].forEach((x) => brick(g, 0.18, 0.18, 0.28, C.skin, x, 0.28, 0.4, { studs: false })); },
  foot: (g) => brick(g, 0.85, 0.45, 1.5, C.skin, 0, 0.25, 0),

  'catch-a-fish': (g) => { brick(g, 0.15, 2.0, 0.15, C.brown, 0, 1.1, 0, { studs: false }); brick(g, 1.1, 0.4, 0.4, C.blue, 0.4, 0.4, 0.4, { studs: false }); },
  'paint-a-picture': (g) => { brick(g, 1.5, 1.6, 0.2, C.white, 0, 1.0, 0, { studs: false }); brick(g, 0.15, 1.5, 0.15, C.brown, 0.9, 0.9, 0, { studs: false }); brick(g, 0.3, 0.3, 0.12, C.red, -0.2, 1.1, 0.12, { studs: false }); brick(g, 0.3, 0.3, 0.12, C.blue, 0.3, 0.8, 0.12, { studs: false }); },
  'eat-ice-cream': (g) => { cone(g, 0.4, 0.9, C.sand, 0, 0.5, 0); sphere(g, 0.42, C.pink, 0, 1.15, 0); },
  'take-a-photo': (g) => { brick(g, 1.4, 0.9, 0.7, C.black, 0, 0.7, 0); cyl(g, 0.28, 0.35, C.grey, 0, 0.7, 0.45); },
  'listen-to-music': (g) => { cyl(g, 0.35, 0.3, C.black, -0.7, 1.2, 0, { rx: Math.PI / 2 }); cyl(g, 0.35, 0.3, C.black, 0.7, 1.2, 0, { rx: Math.PI / 2 }); brick(g, 1.4, 0.12, 0.12, C.black, 0, 1.55, 0, { studs: false }); },
  'look-for-shells': (g) => { cone(g, 0.55, 0.45, C.sand, 0, 0.35, 0); brick(g, 0.9, 0.2, 0.9, C.pink, 0, 0.55, 0, { studs: false }); },
  'read-a-book': (g) => { BUILDERS.book(g); fig(g, 0.9, 0.3, { shirt: C.green, s: 0.28 }); },
  'make-a-sandcastle': (g) => { brick(g, 1.6, 0.7, 1.6, C.sand, 0, 0.4, 0); brick(g, 1.0, 0.6, 1.0, C.sand, 0, 1.0, 0); brick(g, 0.45, 0.5, 0.45, C.sand, -0.5, 1.4, -0.5); brick(g, 0.45, 0.5, 0.45, C.sand, 0.5, 1.4, 0.5); },

  malaysia: (g) => { brick(g, 2.2, 1.4, 0.15, C.red, 0, 0.9, 0, { studs: false }); brick(g, 0.9, 1.4, 0.16, C.blue, -0.65, 0.9, 0.02, { studs: false }); brick(g, 2.2, 0.18, 0.16, C.white, 0, 0.4, 0.02, { studs: false }); brick(g, 2.2, 0.18, 0.16, C.white, 0, 1.4, 0.02, { studs: false }); },
  'the-us': (g) => { brick(g, 2.2, 1.4, 0.15, C.red, 0, 0.9, 0, { studs: false }); brick(g, 0.9, 0.7, 0.16, C.blue, -0.65, 1.25, 0.02, { studs: false }); },
  'the-uk': (g) => { brick(g, 2.2, 1.4, 0.15, C.blue, 0, 0.9, 0, { studs: false }); brick(g, 0.28, 1.4, 0.16, C.red, 0, 0.9, 0.02, { studs: false }); brick(g, 2.2, 0.28, 0.16, C.red, 0, 0.9, 0.02, { studs: false }); },
  mexico: (g) => { brick(g, 0.7, 1.4, 0.15, C.green, -0.75, 0.9, 0, { studs: false }); brick(g, 0.7, 1.4, 0.15, C.white, 0, 0.9, 0, { studs: false }); brick(g, 0.7, 1.4, 0.15, C.red, 0.75, 0.9, 0, { studs: false }); },
  brazil: (g) => { brick(g, 2.2, 1.4, 0.15, C.green, 0, 0.9, 0, { studs: false }); brick(g, 1.2, 0.7, 0.16, C.yellow, 0, 0.9, 0.02, { studs: false, rz: Math.PI / 4 }); },
  korea: (g) => { brick(g, 2.2, 1.4, 0.15, C.white, 0, 0.9, 0, { studs: false }); sphere(g, 0.28, C.red, -0.15, 0.95, 0.12); sphere(g, 0.28, C.blue, 0.15, 0.85, 0.12); },
  china: (g) => { brick(g, 2.2, 1.4, 0.15, C.red, 0, 0.9, 0, { studs: false }); brick(g, 0.35, 0.35, 0.08, C.yellow, -0.6, 1.3, 0.1, { studs: false }); },
  skate: (g) => { brick(g, 0.6, 0.18, 2.2, C.yellow, 0, 0.35, 0); cyl(g, 0.22, 0.16, C.black, 0, 0.18, 0.7, { rx: Math.PI / 2 }); cyl(g, 0.22, 0.16, C.black, 0, 0.18, -0.7, { rx: Math.PI / 2 }); },
  'play-chess': (g) => { brick(g, 1.6, 0.2, 1.6, C.white, 0, 0.15, 0); brick(g, 0.35, 0.7, 0.35, C.black, -0.3, 0.55, 0.2, { studs: false }); brick(g, 0.35, 0.55, 0.35, C.white, 0.35, 0.45, -0.2, { studs: false }); },
  'play-volleyball': (g) => sphere(g, 0.7, C.yellow, 0, 0.75, 0),
  'play-baseball': (g) => { sphere(g, 0.45, C.white, 0, 0.5, 0.4); brick(g, 0.18, 1.6, 0.18, C.brown, 0.6, 0.9, -0.2, { rz: 0.4, studs: false }); },

  art: (g) => BUILDERS['paint-a-picture'](g),
  music: (g) => { brick(g, 0.35, 1.4, 0.9, C.brown, 0, 0.9, 0); brick(g, 0.15, 0.15, 1.6, C.black, 0, 1.5, 0.4, { studs: false }); },
  maths: (g) => { brick(g, 1.8, 1.2, 0.2, C.white, 0, 0.8, 0, { studs: false }); brick(g, 0.9, 0.15, 0.12, C.blue, 0, 0.95, 0.12, { studs: false }); brick(g, 0.15, 0.9, 0.12, C.blue, 0, 0.95, 0.12, { studs: false }); },
  science: (g) => { cyl(g, 0.35, 1.2, C.white, 0, 0.8, 0, { r2: 0.2 }); sphere(g, 0.28, C.lime, 0, 0.35, 0); },
  'social-studies': (g) => sphere(g, 0.85, C.blue, 0, 0.9, 0),
  pe: (g) => sphere(g, 0.7, C.orange, 0, 0.75, 0),
  writing: (g) => { BUILDERS.notebook(g); BUILDERS.pen(g); },
  'set-the-table': (g) => { cyl(g, 0.7, 0.12, C.white, 0, 0.4, 0); brick(g, 0.12, 0.12, 1.0, C.grey, 0.5, 0.45, 0, { studs: false }); },
  'take-out-the-rubbish': (g) => { cyl(g, 0.7, 1.3, C.dark, 0, 0.7, 0, { r2: 0.55 }); brick(g, 0.8, 0.15, 0.8, C.grey, 0, 1.4, 0); },
  'go-shopping': (g) => { brick(g, 1.3, 1.1, 0.5, C.yellow, 0, 0.7, 0); brick(g, 0.12, 0.7, 0.12, C.black, -0.5, 1.4, 0, { studs: false }); brick(g, 0.12, 0.7, 0.12, C.black, 0.5, 1.4, 0, { studs: false }); },
  'rake-leaves': (g) => { brick(g, 0.15, 2.0, 0.15, C.brown, 0, 1.1, 0, { studs: false }); brick(g, 1.2, 0.12, 0.4, C.grey, 0, 2.1, 0, { studs: false }); brick(g, 0.5, 0.12, 0.5, C.orange, 0.6, 0.15, 0.4, { studs: false }); },
  'feed-the-fish': (g) => { brick(g, 1.4, 0.5, 0.4, C.orange, 0, 0.5, 0, { studs: false }); brick(g, 0.3, 0.4, 0.15, C.orange, 0.8, 0.55, 0, { studs: false }); },
  'wash-the-car': (g) => { carLike(g, C.blue, C.white); sphere(g, 0.2, C.white, 0.8, 1.4, 0.5); },

  mummy: (g) => { fig(g, 0, 0, { shirt: C.white, pants: C.white, bald: true, skin: C.sand }); },
  pyramid: (g) => { brick(g, 2.4, 0.4, 2.4, C.yellow, 0, 0.2, 0); brick(g, 1.6, 0.4, 1.6, C.yellow, 0, 0.6, 0); brick(g, 0.8, 0.4, 0.8, C.yellow, 0, 1.0, 0); },
  treasure: (g) => { brick(g, 1.6, 0.7, 1.1, C.brown, 0, 0.4, 0); brick(g, 0.4, 0.4, 0.4, C.yellow, -0.3, 0.95, 0.15); brick(g, 0.4, 0.4, 0.4, C.red, 0.35, 0.95, -0.1); },
  gold: (g) => { brick(g, 0.7, 0.4, 0.7, C.yellow, -0.4, 0.25, 0); brick(g, 0.7, 0.4, 0.7, C.yellow, 0.4, 0.25, 0.2); brick(g, 0.7, 0.4, 0.7, C.yellow, 0, 0.65, 0); },
  tomb: (g) => { brick(g, 1.8, 1.4, 2.2, C.sand, 0, 0.75, 0); brick(g, 0.7, 1.0, 0.2, C.black, 0, 0.6, 1.15, { studs: false }); },
  desert: (g) => { brick(g, 2.4, 0.35, 2.4, C.sand, 0, 0.18, 0); cone(g, 0.7, 0.8, C.sand, 0.5, 0.7, -0.3); },
  mosquito: (g) => { sphere(g, 0.25, C.grey, 0, 0.7, 0); brick(g, 1.4, 0.08, 0.08, C.grey, 0, 0.85, 0, { studs: false }); brick(g, 0.08, 0.7, 0.08, C.grey, 0, 0.4, 0, { studs: false }); },
  snail: (g) => { sphere(g, 0.55, C.brown, 0.2, 0.6, 0); brick(g, 1.2, 0.35, 0.45, C.lime, -0.3, 0.25, 0, { studs: false }); },
  brain: (g) => { sphere(g, 0.7, C.pink, 0, 0.75, 0); brick(g, 0.15, 0.5, 0.9, C.pink, 0, 0.85, 0, { studs: false }); },
  stomach: (g) => { cyl(g, 0.7, 1.1, C.sand, 0, 0.7, 0, { r2: 0.55 }); },
  face: (g) => BUILDERS.head(g),

  parade: (g) => { fig(g, -0.6, 0, { shirt: C.red, s: 0.32 }); fig(g, 0.6, 0.2, { shirt: C.blue, s: 0.32 }); },
  costume: (g) => fig(g, 0, 0, { shirt: C.violet, pants: C.black, hat: 'cap', hatCol: C.violet }),
  decorate: (g) => { brick(g, 0.3, 1.6, 0.3, C.brown, 0, 0.85, 0, { studs: false }); sphere(g, 0.22, C.red, 0, 1.6, 0); sphere(g, 0.18, C.yellow, 0.25, 1.2, 0.15); sphere(g, 0.18, C.blue, -0.25, 0.9, 0.1); },
  fireworks: (g) => { [0, 1, 2, 3, 4].forEach((i) => { const a = i * 1.26; brick(g, 0.15, 0.8, 0.15, DCOL[i], Math.cos(a) * 0.5, 1.3, Math.sin(a) * 0.5, { studs: false }); }); sphere(g, 0.2, C.yellow, 0, 1.7, 0); },
  barbecue: (g) => { cyl(g, 0.85, 0.3, C.black, 0, 0.7, 0); brick(g, 0.15, 0.7, 0.15, C.black, -0.5, 0.35, 0.4, { studs: false }); brick(g, 0.15, 0.7, 0.15, C.black, 0.5, 0.35, -0.3, { studs: false }); brick(g, 0.5, 0.12, 0.8, C.brown, 0, 0.9, 0, { studs: false }); },
  nurse: (g) => fig(g, 0, 0, { shirt: C.white, pants: C.white, hat: 'cap', hatCol: C.white }),
  soldier: (g) => fig(g, 0, 0, { shirt: C.green, pants: C.green, hat: 'cap', hatCol: C.green }),
  'police-officer': (g) => fig(g, 0, 0, { shirt: C.blue, pants: C.dark, hat: 'cap', hatCol: C.blue }),
  first: numberN(1), second: numberN(2), third: numberN(3),
  twentieth: numberN(10),

  pear: (g) => { sphere(g, 0.55, C.lime, 0, 0.55, 0); sphere(g, 0.4, C.lime, 0, 1.1, 0); brick(g, 0.1, 0.35, 0.1, C.brown, 0, 1.45, 0, { studs: false }); },
  peach: (g) => { sphere(g, 0.7, C.orange, 0, 0.75, 0); brick(g, 0.1, 0.3, 0.1, C.brown, 0, 1.45, 0, { studs: false }); },
  kiwi: (g) => { sphere(g, 0.65, C.brown, 0, 0.7, 0); cyl(g, 0.45, 0.12, C.lime, 0, 0.7, 0.5, { rx: Math.PI / 2 }); },
  butter: (g) => brick(g, 1.5, 0.5, 0.9, C.yellow, 0, 0.3, 0),
  'a-bottle-of-water': (g) => { cyl(g, 0.35, 1.4, C.blue, 0, 0.8, 0, { r2: 0.28 }); cyl(g, 0.14, 0.35, C.white, 0, 1.65, 0); },
  'a-carton-of-milk': (g) => { brick(g, 0.9, 1.5, 0.7, C.white, 0, 0.8, 0); brick(g, 0.9, 0.25, 0.7, C.blue, 0, 1.55, 0); },
  'a-bag-of-crisps': (g) => brick(g, 1.1, 1.5, 0.4, C.yellow, 0, 0.8, 0, { studs: false }),
  'a-box-of-cereal': (g) => { brick(g, 1.2, 1.6, 0.7, C.red, 0, 0.85, 0); brick(g, 1.0, 0.7, 0.12, C.yellow, 0, 1.0, 0.4, { studs: false }); },
  'a-bar-of-chocolate': (g) => { brick(g, 1.6, 0.3, 0.8, C.brown, 0, 0.2, 0); brick(g, 0.45, 0.08, 0.7, C.brown, -0.4, 0.38, 0, { studs: false }); brick(g, 0.45, 0.08, 0.7, C.brown, 0.4, 0.38, 0, { studs: false }); },
  'a-cup-of-tea': (g) => { cyl(g, 0.45, 0.7, C.white, 0, 0.45, 0); brick(g, 0.12, 0.35, 0.35, C.white, 0.55, 0.45, 0, { studs: false }); },
  bowl: (g) => cyl(g, 0.75, 0.45, C.white, 0, 0.3, 0, { r2: 0.4 }),
  fork: (g) => { brick(g, 0.18, 1.5, 0.12, C.grey, 0, 0.8, 0, { studs: false }); [-0.18, 0, 0.18].forEach((x) => brick(g, 0.08, 0.45, 0.08, C.grey, x, 1.7, 0, { studs: false })); },
  spoon: (g) => { brick(g, 0.16, 1.3, 0.12, C.grey, 0, 0.7, 0, { studs: false }); cyl(g, 0.28, 0.1, C.grey, 0, 1.5, 0); },
  knife: (g) => { brick(g, 0.12, 1.6, 0.28, C.grey, 0, 0.9, 0, { studs: false }); brick(g, 0.2, 0.5, 0.2, C.brown, 0, 0.25, 0, { studs: false }); },

  motorbike: (g) => { cyl(g, 0.5, 0.16, C.black, -0.9, 0.5, 0, { rx: Math.PI / 2 }); cyl(g, 0.5, 0.16, C.black, 0.9, 0.5, 0, { rx: Math.PI / 2 }); brick(g, 1.6, 0.35, 0.5, C.red, 0, 0.75, 0); },
  taxi: (g) => { carLike(g, C.yellow, C.black); brick(g, 0.5, 0.2, 0.4, C.yellow, 0, 1.5, 0, { studs: false }); },
  ticket: (g) => brick(g, 1.6, 0.12, 0.8, C.yellow, 0, 0.5, 0, { rz: 0.3 }),
  tourist: (g) => { fig(g, 0, 0, { shirt: C.yellow, hat: 'cap', hatCol: C.sand }); brick(g, 0.7, 0.9, 0.4, C.brown, 0.7, 0.7, -0.2, { studs: false }); },
  money: (g) => { brick(g, 1.4, 0.08, 0.7, C.green, 0, 0.25, 0); brick(g, 1.4, 0.08, 0.7, C.green, 0.1, 0.35, 0.05); },
  pavement: (g) => { brick(g, 2.2, 0.2, 1.2, C.grey, 0, 0.12, 0); brick(g, 2.2, 0.2, 1.2, C.dark, 0, 0.12, 1.2); },
  'zebra-crossing': (g) => { [0, 1, 2, 3].forEach((i) => brick(g, 1.8, 0.12, 0.35, i % 2 ? C.black : C.white, 0, 0.1, -0.7 + i * 0.45)); },
  'seat-belt': (g) => { brick(g, 0.35, 0.2, 2.0, C.grey, 0, 0.8, 0, { rz: 0.5, studs: false }); brick(g, 0.5, 0.35, 0.4, C.red, 0.3, 0.5, 0.4, { studs: false }); },
  wheel: (g) => cyl(g, 0.9, 0.28, C.black, 0, 0.95, 0, { rx: Math.PI / 2, seg: 18 }),
  'on-foot': (g) => BUILDERS.shoes(g),

  recycling: (g) => { fig(g, 0, 0, { shirt: C.green, s: 0.4 }); cyl(g, 0.45, 0.8, C.green, 0.85, 0.5, 0.2); },
  paper: (g) => { brick(g, 1.4, 0.08, 1.8, C.white, 0, 0.3, 0); brick(g, 1.4, 0.08, 1.8, C.white, 0.08, 0.4, 0.05); },
  metal: (g) => { cyl(g, 0.4, 1.0, C.grey, -0.45, 0.55, 0, { metal: 0.4 }); cyl(g, 0.35, 0.7, C.grey, 0.4, 0.4, 0.15, { metal: 0.4 }); },
  glass: (g) => { cyl(g, 0.22, 1.3, C.green, -0.35, 0.7, 0); cyl(g, 0.22, 1.1, C.white, 0.35, 0.6, 0.1); },
  plastic: (g) => BUILDERS['a-bottle-of-water'](g),
  tent: (g) => { brick(g, 2.0, 0.15, 2.2, C.orange, 0, 0.7, 0, { rx: 0.7, studs: false }); brick(g, 2.0, 0.15, 2.2, C.orange, 0, 0.7, 0, { rx: -0.7, studs: false }); },
  'sleeping-bag': (g) => { cyl(g, 0.45, 2.2, C.blue, 0, 0.45, 0, { rz: Math.PI / 2, r2: 0.4 }); },
  torch: (g) => { cyl(g, 0.22, 1.4, C.black, 0, 0.8, 0); cyl(g, 0.28, 0.35, C.yellow, 0, 1.6, 0); },
  jar: (g) => { cyl(g, 0.45, 1.1, C.white, 0, 0.65, 0); cyl(g, 0.4, 0.2, C.red, 0, 1.25, 0); },
  oven: (g) => { brick(g, 1.8, 1.6, 1.2, C.white, 0, 0.85, 0); brick(g, 1.2, 0.8, 0.12, C.black, 0, 0.7, 0.65, { studs: false }); brick(g, 0.3, 0.12, 0.3, C.grey, -0.4, 1.45, 0.55, { studs: false }); brick(g, 0.3, 0.12, 0.3, C.grey, 0.4, 1.45, 0.55, { studs: false }); },
  flowerpot: (g) => { cyl(g, 0.5, 0.7, C.orange, 0, 0.4, 0, { r2: 0.35 }); brick(g, 0.15, 0.7, 0.15, C.green, 0, 1.0, 0, { studs: false }); sphere(g, 0.2, C.red, 0, 1.4, 0); },
  rubbish: (g) => BUILDERS['take-out-the-rubbish'](g),

  camel: (g) => { animal(g, { body: C.sand, sx: 1.2, sy: 1.0, sz: 2.2, hs: 0.7, hz: 1.2 }); brick(g, 0.6, 0.55, 0.6, C.sand, 0, 1.7, 0.2, { studs: false }); },
  squirrel: (g) => animal(g, { body: C.brown, sx: 0.7, sy: 0.55, sz: 1.1, ears: true, tail: 0.9 }),
  panda: (g) => { animal(g, { body: C.white, sx: 1.3, sy: 1.0, sz: 1.6, hs: 0.9, ears: true, ear: C.black }); brick(g, 0.35, 0.25, 0.12, C.black, -0.25, 1.7, 0.85, { studs: false }); brick(g, 0.35, 0.25, 0.12, C.black, 0.25, 1.7, 0.85, { studs: false }); },
  ostrich: (g) => { brick(g, 1.0, 0.8, 1.4, C.sand, 0, 1.1, 0, { studs: false }); brick(g, 0.3, 1.2, 0.3, C.sand, 0, 2.0, 0.4, { studs: false }); brick(g, 0.55, 0.45, 0.55, C.sand, 0, 2.7, 0.5, { studs: false }); brick(g, 0.22, 1.0, 0.22, C.sand, -0.25, 0.5, 0, { studs: false }); brick(g, 0.22, 1.0, 0.22, C.sand, 0.25, 0.5, 0, { studs: false }); },
  rhino: (g) => { animal(g, { body: C.grey, sx: 1.5, sy: 1.1, sz: 2.2, hs: 0.85, horn: C.white }); },
  gorilla: (g) => { brick(g, 1.4, 1.3, 1.0, C.black, 0, 1.1, 0, { studs: false }); brick(g, 1.0, 0.8, 0.9, C.black, 0, 2.0, 0.15, { studs: false }); brick(g, 0.5, 1.1, 0.5, C.black, -0.9, 0.7, 0.3, { studs: false }); brick(g, 0.5, 1.1, 0.5, C.black, 0.9, 0.7, 0.3, { studs: false }); },
  jellyfish: (g) => { sphere(g, 0.7, C.pink, 0, 1.5, 0); [-0.3, 0, 0.3].forEach((x) => brick(g, 0.1, 1.2, 0.1, C.pink, x, 0.7, 0.1, { studs: false })); },
  dinosaur: (g) => { animal(g, { body: C.lime, sx: 1.2, sy: 0.9, sz: 2.0, hs: 0.7, hz: 1.1, tail: 1.3 }); },
  kitten: (g) => animal(g, { body: C.orange, sx: 0.7, sy: 0.5, sz: 1.1, ears: true, tail: 0.6 }),
  dangerous: (g) => { brick(g, 1.6, 1.4, 0.2, C.yellow, 0, 0.9, 0, { studs: false }); brick(g, 0.25, 0.7, 0.12, C.black, 0, 1.05, 0.12, { studs: false }); brick(g, 0.25, 0.2, 0.12, C.black, 0, 0.45, 0.12, { studs: false }); },
  intelligent: (g) => BUILDERS.brain(g),
  heavy: (g) => { cyl(g, 0.7, 0.4, C.dark, 0, 0.35, 0); brick(g, 0.25, 0.9, 0.25, C.dark, 0, 0.95, 0, { studs: false }); cyl(g, 0.7, 0.4, C.dark, 0, 1.5, 0); },

  badminton: (g) => { brick(g, 0.12, 1.8, 0.12, C.yellow, 0, 1.0, 0, { studs: false }); brick(g, 0.7, 0.08, 0.5, C.white, 0, 1.9, 0, { studs: false }); },
  cricket: (g) => { brick(g, 0.28, 1.8, 0.45, C.sand, 0, 1.0, 0, { studs: false }); sphere(g, 0.28, C.red, 0.7, 0.4, 0.3); },
  cycling: (g) => BUILDERS.bike(g),
  'ice-skate': (g) => { brick(g, 0.55, 0.4, 1.4, C.white, 0, 0.45, 0); brick(g, 0.12, 0.25, 1.5, C.grey, 0, 0.15, 0, { studs: false }); },
  'ice-hockey': (g) => { brick(g, 0.14, 1.8, 0.14, C.brown, 0, 1.0, 0, { studs: false }); brick(g, 0.7, 0.12, 0.3, C.black, 0, 0.15, 0.2, { studs: false }); },
  'high-jump': (g) => { brick(g, 0.15, 1.6, 0.15, C.orange, -0.8, 0.85, 0, { studs: false }); brick(g, 0.15, 1.6, 0.15, C.orange, 0.8, 0.85, 0, { studs: false }); brick(g, 1.8, 0.12, 0.12, C.white, 0, 1.5, 0, { studs: false }); },
  javelin: (g) => { brick(g, 0.12, 0.12, 2.6, C.yellow, 0, 0.8, 0, { rz: 0.4, studs: false }); cone(g, 0.12, 0.3, C.grey, 0.9, 1.15, 0); },
  football: (g) => BUILDERS.ball(g),
  'table-tennis': (g) => { brick(g, 0.12, 1.4, 0.12, C.red, 0, 0.8, 0, { studs: false }); brick(g, 0.7, 0.12, 0.5, C.red, 0, 1.55, 0, { studs: false }); sphere(g, 0.18, C.yellow, 0.6, 0.4, 0.3); },
  helmet: (g) => { cyl(g, 0.7, 0.7, C.red, 0, 0.55, 0, { r2: 0.55 }); brick(g, 0.9, 0.12, 0.5, C.black, 0, 0.35, 0.45, { studs: false }); },
  net: (g) => { brick(g, 0.12, 1.6, 0.12, C.white, -0.9, 0.85, 0, { studs: false }); brick(g, 0.12, 1.6, 0.12, C.white, 0.9, 0.85, 0, { studs: false }); brick(g, 1.9, 1.2, 0.08, C.white, 0, 1.0, 0, { studs: false }); },
  champion: (g) => { cyl(g, 0.45, 0.35, C.yellow, 0, 1.5, 0); brick(g, 0.15, 0.7, 0.15, C.yellow, -0.4, 1.1, 0, { studs: false }); brick(g, 0.15, 0.7, 0.15, C.yellow, 0.4, 1.1, 0, { studs: false }); brick(g, 0.5, 0.25, 0.5, C.yellow, 0, 0.7, 0); },

  headache: (g) => { BUILDERS.head(g); brick(g, 0.3, 0.3, 0.12, C.red, 0.55, 1.5, 0.3, { studs: false }); },
  'stomach-ache': (g) => { fig(g, 0, 0, { shirt: C.green, s: 0.45 }); },
  toothache: (g) => { brick(g, 0.55, 1.1, 0.5, C.white, 0, 0.7, 0); brick(g, 0.2, 0.2, 0.12, C.black, 0.15, 0.5, 0.28, { studs: false }); },
  'sore-throat': (g) => { BUILDERS.head(g); brick(g, 0.5, 0.25, 0.2, C.red, 0, 0.45, 0.5, { studs: false }); },
  cough: (g) => { BUILDERS.head(g); sphere(g, 0.15, C.white, 0.5, 0.9, 0.6); sphere(g, 0.12, C.white, 0.75, 1.1, 0.5); },
  fever: (g) => { brick(g, 0.15, 1.8, 0.15, C.white, 0, 1.0, 0, { studs: false }); cyl(g, 0.18, 0.5, C.red, 0, 0.3, 0); },
  medicine: (g) => { cyl(g, 0.28, 1.0, C.orange, 0, 0.6, 0); cyl(g, 0.18, 0.25, C.white, 0, 1.2, 0); },
  plaster: (g) => brick(g, 1.5, 0.18, 0.5, C.sand, 0, 0.4, 0),
  sunburn: (g) => { BUILDERS.head(g); },
  sunscreen: (g) => { cyl(g, 0.28, 1.2, C.white, 0, 0.7, 0); cyl(g, 0.14, 0.25, C.yellow, 0, 1.4, 0); },
  cut: (g) => { BUILDERS.hand(g); brick(g, 0.35, 0.08, 0.12, C.red, 0.2, 0.55, 0.5, { studs: false }); },
  burn: (g) => { BUILDERS.hand(g); brick(g, 0.4, 0.15, 0.15, C.red, 0, 0.7, 0.55, { studs: false }); },
};

BUILDERS.jacket = BUILDERS.sweater;
BUILDERS.plane = BUILDERS.plane;

export function buildWordItem(word) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const fn = BUILDERS[itemSlug(word)] || fallback;
  fn(inner);
  inner.rotation.y = -0.45;
  g.add(inner);
  return g;
}
