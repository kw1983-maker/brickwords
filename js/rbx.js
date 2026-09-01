// ============================================================================
//  rbx.js — the Roblox layer: its numbers, its colours, its studs.
// ============================================================================
//
// Everything in this game is measured in STUDS, exactly as Roblox measures it,
// because the whole feel of an obby comes out of three constants. Change them
// and every jump in the course silently becomes wrong.

import * as THREE from 'three';

// ------------------------------------------------------------- the constants
// Roblox's own Humanoid defaults. Do not "tidy" these into round numbers.
export const GRAVITY = 196.2;   // studs/s²  (Workspace.Gravity)
export const WALKSPEED = 16;    // studs/s   (Humanoid.WalkSpeed)
export const JUMPPOWER = 50;    // studs/s   (Humanoid.JumpPower)

// What those three imply, worked out once so the course builder can size gaps
// against them instead of guessing:
export const JUMP_RISE = (JUMPPOWER * JUMPPOWER) / (2 * GRAVITY);   // 6.37 studs up
export const JUMP_AIRTIME = (2 * JUMPPOWER) / GRAVITY;              // 0.51 s aloft
export const JUMP_REACH = WALKSPEED * JUMP_AIRTIME;                 // 8.16 studs across

// A running jump clears 8.1 studs, so a gap has to be meaningfully under that
// for a seven-year-old with a trackpad. Every gap in course.js uses this.
export const SAFE_GAP = 5.5;

// R6 body part sizes (Roblox's real ones). A character is 5 studs tall.
export const R6 = {
  head:  [2, 1, 1],
  torso: [2, 2, 1],
  arm:   [1, 2, 1],
  leg:   [1, 2, 1],
  height: 5,
  hipHeight: 3,     // ground → HumanoidRootPart centre
};

// The collision hull. Roblox's is 2 × 5 × 1; the extra depth here is deliberate
// slack so a child who lands half a stud short still catches the ledge.
export const HULL = { w: 2, h: 5, d: 1.6 };

// --------------------------------------------------------------- BrickColors
// The classic palette, with Roblox's own names kept so a teacher reading the
// code sees the same words they would see in Studio.
export const BrickColor = {
  'Bright red':            0xc4281c,
  'Bright blue':           0x0d69ac,
  'Bright yellow':         0xf5cd30,
  'Bright green':          0x4b974b,
  'Bright orange':         0xda8541,
  'Bright violet':         0x6b327c,
  'Bright bluish green':   0x008f9c,
  'Br. yellowish green':   0xa4bd47,
  'Medium stone grey':     0xa3a2a5,
  'Dark stone grey':       0x635f62,
  'Really black':          0x111111,
  'Institutional white':   0xf8f8f8,
  'Cool yellow':           0xfdea8d,
  'Reddish brown':         0x694028,
  'Lime green':            0x00ff00,
  'Hot pink':              0xff00bf,
  'Pastel blue':           0x80bbdb,
  'Deep orange':           0xf07f28,
  'Sand blue':             0x6c8ea2,
  'Neon orange':           0xd5733d,
};

export const bc = (name) => BrickColor[name] !== undefined ? BrickColor[name] : 0xa3a2a5;

// The classic default avatar: yellow skin, blue shirt, green legs. This is the
// look every Malaysian ten-year-old means when they say "Roblox".
export const DEFAULT_AVATAR = {
  skin: bc('Bright yellow'),
  shirt: bc('Bright blue'),
  pants: bc('Br. yellowish green'),
  hair: bc('Reddish brown'),
  hat: 'none',
};

// ------------------------------------------------------------- the studs
// A Roblox part is a plain box with studs on its top face. Rather than model
// thousands of little cylinders, the studs are one repeating canvas texture
// applied to the +Y face only, tiled once per stud of part size.

let STUD_TEX = null;

function makeStudTexture() {
  const S = 64;                       // one stud
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');

  // Base is white so the material colour shows through unchanged; the stud is
  // painted as light and shadow on top of it.
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);

  const cx = S / 2, cy = S / 2, r = S * 0.30;

  // Contact shadow under the stud, then the stud face, then its highlight.
  g.beginPath();
  g.arc(cx, cy + 2, r + 1.5, 0, Math.PI * 2);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fill();

  const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.14)');
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.fillStyle = grad;
  g.fill();

  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(0,0,0,0.20)';
  g.lineWidth = 1.5;
  g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;   // colour art, not linear data
  return t;
}

export function studTexture() {
  if (!STUD_TEX) STUD_TEX = makeStudTexture();
  return STUD_TEX;
}

// A brick's six materials: studs on top, plain everywhere else. Roblox order is
// +X, -X, +Y, -Y, +Z, -Z, which is also Three.js's BoxGeometry order.
const matCache = new Map();

export function brickMaterials(color, opts = {}) {
  const key = `${color}|${opts.studs === false}|${opts.neon ? 1 : 0}|${opts.opacity || 1}|${(opts.repeat || [1, 1]).join('x')}`;
  if (matCache.has(key)) return matCache.get(key);

  const base = {
    color,
    // Roblox's default material is Plastic, and plastic is glossier than this
    // used to be. The broad soft highlight a low roughness picks up off the sun
    // is a surprising amount of what makes a brick look like a Roblox brick
    // rather than a matte grey box.
    roughness: opts.neon ? 0.9 : 0.44,
    metalness: 0,
    transparent: opts.opacity !== undefined && opts.opacity < 1,
    opacity: opts.opacity === undefined ? 1 : opts.opacity,
  };
  if (opts.neon) {
    base.emissive = new THREE.Color(color);
    base.emissiveIntensity = 0.85;
  }

  const plain = new THREE.MeshStandardMaterial(base);
  let top = plain;

  if (opts.studs !== false) {
    const tex = studTexture().clone();
    tex.needsUpdate = true;
    const [rx, rz] = opts.repeat || [1, 1];
    tex.repeat.set(Math.max(1, Math.round(rx)), Math.max(1, Math.round(rz)));
    top = new THREE.MeshStandardMaterial(Object.assign({}, base, { map: tex }));
  }

  const mats = [plain, plain, top, plain, plain, plain];
  matCache.set(key, mats);
  return mats;
}

// ------------------------------------------------------------------ helpers
// `part()` is the one way anything gets built. Size and position are in studs,
// and — like Roblox — position is the CENTRE of the part, not a corner.
export function part(sx, sy, sz, color, opts = {}) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geo, brickMaterials(color, Object.assign({ repeat: [sx, sz] }, opts)));
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = true;
  mesh.userData.size = { x: sx, y: sy, z: sz };
  return mesh;
}

export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
