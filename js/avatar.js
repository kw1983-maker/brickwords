// ============================================================================
//  avatar.js — the Robloxian: an R6 rig, the classic face, and the death burst.
// ============================================================================
//
// Six parts, no skeleton, no skinning. R6 is a stack of boxes rotated about
// their shoulder and hip joints, which is exactly what Roblox does and exactly
// why the walk reads as Roblox at a glance.
//
// The rig is built around its FEET at y = 0, so the controller can position it
// by the ground it is standing on rather than by some interior origin.

import * as THREE from 'three';
import { part, bc, DEFAULT_AVATAR, R6, clamp, lerp } from './rbx.js';
import { canvasTexture, decalPlane, UI_FONT, attachGroundShadow } from './parts.js';

// ------------------------------------------------------------------ the face
// The classic 2006 smile: two black ovals and a wide grin. Every Roblox player
// alive knows this face, so it is worth getting the proportions right.
function faceTexture(mood = 'smile') {
  return canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#101010';

    // Eyes: tall rounded rectangles, set wide and high.
    const eye = (cx) => {
      g.beginPath();
      g.ellipse(cx, h * 0.38, w * 0.062, h * 0.105, 0, 0, Math.PI * 2);
      g.fill();
    };
    eye(w * 0.33);
    eye(w * 0.67);

    if (mood === 'oof') {
      // The surprised "oof" face used for the split second before a respawn.
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.70, w * 0.10, h * 0.115, 0, 0, Math.PI * 2);
      g.fill();
      return;
    }

    // Mouth: a thick arc with squared ends, the width of both eyes together.
    g.strokeStyle = '#101010';
    g.lineWidth = w * 0.05;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(w * 0.5, h * 0.53, w * 0.21, 0.22 * Math.PI, 0.78 * Math.PI);
    g.stroke();
  });
}

// ------------------------------------------------------------------ the hats
// Roblox is hats. These are the shop stock — all built from boxes and cylinders
// so nothing has to be downloaded.
export const HATS = [
  { id: 'none', name: 'No hat', emoji: '🚫', cost: 0 },
  { id: 'cap', name: 'Baseball Cap', emoji: '🧢', cost: 25 },
  { id: 'tophat', name: 'Top Hat', emoji: '🎩', cost: 60 },
  { id: 'crown', name: 'Golden Crown', emoji: '👑', cost: 120 },
  { id: 'wizard', name: 'Wizard Hat', emoji: '🧙', cost: 90 },
  { id: 'headphones', name: 'Headphones', emoji: '🎧', cost: 45 },
];

function buildHat(id) {
  const g = new THREE.Group();
  const solid = (w, h, d, colour, x, y, z, round) => {
    const geo = round
      ? new THREE.CylinderGeometry(w / 2, d / 2, h, 20)
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55 }));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  if (id === 'cap') {
    solid(1.5, 0.45, 1.5, bc('Bright red'), 0, 0.22, 0, true);
    solid(1.4, 0.12, 1.0, bc('Bright red'), 0, 0.06, 0.75, false);
  } else if (id === 'tophat') {
    solid(2.1, 0.12, 2.1, bc('Really black'), 0, 0.06, 0, true);
    solid(1.25, 1.1, 1.25, bc('Really black'), 0, 0.6, 0, true);
    solid(1.3, 0.18, 1.3, bc('Bright red'), 0, 0.22, 0, true);
  } else if (id === 'crown') {
    solid(1.5, 0.35, 1.5, 0xffd24a, 0, 0.18, 0, true);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      solid(0.22, 0.45, 0.22, 0xffd24a, Math.cos(a) * 0.62, 0.55, Math.sin(a) * 0.62, false);
    }
  } else if (id === 'wizard') {
    solid(1.9, 0.12, 1.9, bc('Bright violet'), 0, 0.06, 0, true);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 2.0, 18),
      new THREE.MeshStandardMaterial({ color: bc('Bright violet'), roughness: 0.6 }),
    );
    cone.position.y = 1.05;
    cone.castShadow = true;
    g.add(cone);
  } else if (id === 'headphones') {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.11, 8, 24, Math.PI),
      new THREE.MeshStandardMaterial({ color: bc('Really black'), roughness: 0.5 }),
    );
    band.position.y = 0.1;
    g.add(band);
    [-0.82, 0.82].forEach((x) => solid(0.42, 0.42, 0.3, bc('Bright blue'), x, 0.05, 0, true));
  }
  return g;
}

// ----------------------------------------------------------------- the rig

export class Avatar {
  constructor(look = {}, opts = {}) {
    this.look = Object.assign({}, DEFAULT_AVATAR, look);
    this.name = opts.name || 'Player';
    this.isNPC = !!opts.npc;
    this.wantsPack = !!opts.backpack;
    this.root = new THREE.Group();
    this.phase = 0;
    this.dead = false;
    this.pieces = [];

    this.build();
    if (opts.nametag !== false) this.buildNametag();
  }

  build() {
    const L = this.look;
    // Materials are cloned per avatar. brickMaterials() caches by colour, and a
    // shared material would mean recolouring one Robloxian recoloured the whole
    // server — including the bricks of the course.
    const box = (w, h, d, colour) => {
      const m = part(w, h, d, colour, { studs: false });
      m.material = m.material.map((mat) => mat.clone());
      m.castShadow = true;
      m.receiveShadow = false;
      return m;
    };

    // Legs and arms hang from a pivot at their TOP, so rotating the pivot
    // swings the limb the way a shoulder or hip does.
    const limb = (mesh, px, py, pz) => {
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz);
      mesh.position.y = -R6.leg[1] / 2;
      pivot.add(mesh);
      this.root.add(pivot);
      return pivot;
    };

    // ---- A LEGO minifigure mapped onto the R6 joints. The six pivots keep
    // their positions (hips at y=2, shoulders up top, head above) so the walk
    // swing, the jump pose and the death burst are unchanged — only the shapes
    // hanging off them change from bare boxes into a minifig.
    const solid = (geo, colour, rough = 0.44) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: 0 }));
      m.castShadow = true; m.receiveShadow = false;
      return m;
    };
    // One shared skin material, so recolouring the head recolours the neck and
    // crown stud with it.
    this.headMat = new THREE.MeshStandardMaterial({ color: L.skin, roughness: 0.36, metalness: 0 });

    // HIPS + LEGS — legs hang from hip pivots at y=2 (feet at y=0), as R6.
    this.hips = box(1.9, 0.74, 1.06, L.pants);
    this.hips.position.y = 2.08;
    this.root.add(this.hips);
    // A soft contact shadow that travels with the figure.
    attachGroundShadow(this.root, 2.2, { opacity: 0.8 });

    this.legL = limb(box(0.82, 1.9, 1.0, L.pants), -0.46, 2.0, 0);
    this.legR = limb(box(0.82, 1.9, 1.0, L.pants), 0.46, 2.0, 0);

    // Boots — the minifig foot, a touch wider and reaching forward.
    this.shoes = [this.legL, this.legR].map((pivot) => {
      const leg = pivot.children[0];
      const shoe = box(0.92, 0.44, 1.24, bc('Really black'));
      shoe.position.set(0, -0.88, 0.12);
      leg.add(shoe);
      return shoe;
    });

    // TORSO — slightly trapezoidal: a body box with a narrower shoulder yoke.
    this.torso = box(1.74, 1.5, 1.0, L.shirt);
    this.torso.position.y = 3.05;
    this.root.add(this.torso);
    this.shoulders = box(1.9, 0.36, 1.04, L.shirt);
    this.shoulders.position.y = 0.76;
    this.torso.add(this.shoulders);
    // Printed torso detail: a V-collar, a centre zip and a chest pocket, so the
    // shirt reads as clothing instead of a plain coloured block. All hang off
    // the torso's front face and collide with nothing.
    const shade = (hex, f) => {
      const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex();
    };
    const zipCol = shade(L.shirt, 0.72);
    const collar = box(0.9, 0.28, 0.06, zipCol); collar.position.set(0, 0.58, 0.5); this.torso.add(collar);
    const zip = box(0.12, 1.1, 0.06, zipCol); zip.position.set(0, -0.05, 0.5); this.torso.add(zip);
    [-0.42, 0.42].forEach((dx) => {
      const pkt = box(0.42, 0.4, 0.06, zipCol); pkt.position.set(dx, -0.36, 0.5); this.torso.add(pkt);
    });

    // ARMS + C-HANDS — pivot at the shoulders and animate about x. The inward
    // tilt lives on the arm MESH (z), leaving the pivot's x free for the walk,
    // and each arm ends in the iconic LEGO C-hand.
    const buildArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.02, 3.66, 0);
      const arm = box(0.66, 1.42, 0.72, L.shirt);
      arm.position.y = -0.71;
      arm.rotation.z = -side * 0.14;
      const cuff = box(0.62, 0.36, 0.68, L.skin);
      cuff.position.y = -0.82;
      arm.add(cuff);
      const hand = solid(new THREE.TorusGeometry(0.3, 0.13, 10, 20, Math.PI * 1.5), L.skin);
      hand.rotation.x = Math.PI / 2;
      hand.rotation.z = -Math.PI * 0.25;
      hand.position.set(0, -1.12, 0.14);
      arm.add(hand);
      pivot.add(arm);
      this.root.add(pivot);
      pivot.userData = { hand, cuff };
      return pivot;
    };
    this.armL = buildArm(-1);
    this.armR = buildArm(1);
    this.sleeves = [this.armL.children[0], this.armR.children[0]];
    this.hands = [this.armL.userData.hand, this.armR.userData.hand];
    this.cuffs = [this.armL.userData.cuff, this.armR.userData.cuff];

    // HEAD — an upright cylinder with a neck, a crown stud and the classic face.
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.34, 16), this.headMat);
    neck.position.y = 3.92; neck.castShadow = true;
    this.root.add(neck);
    this.head = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.7, 1.24, 24), this.headMat);
    this.head.castShadow = true;
    this.head.position.y = 4.68;
    this.root.add(this.head);
    const crownStud = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 20), this.headMat);
    crownStud.position.y = 0.68;
    this.head.add(crownStud);

    this.faceMat = new THREE.MeshBasicMaterial({
      map: faceTexture('smile'), transparent: true, toneMapped: false,
    });
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.04), this.faceMat);
    this.face.position.set(0, 4.68, 0.74);
    this.root.add(this.face);

    // HAIR — a rounded cap with a few spiky tufts, parented to the head.
    this.hair = new THREE.Group();
    this.head.add(this.hair);
    const hairCol = L.hair !== undefined ? L.hair : bc('Reddish brown');
    const hairAt = (w, hh, d, hx, hy, hz, rx) => {
      const m = box(w, hh, d, hairCol);
      m.position.set(hx, hy, hz);
      if (rx) m.rotation.x = rx;
      this.hair.add(m);
      return m;
    };
    this.hairParts = [
      hairAt(1.5, 0.46, 1.5, 0, 0.66, 0),
      hairAt(1.52, 0.36, 0.5, 0, 0.44, 0.56),
      hairAt(0.52, 0.44, 0.52, -0.4, 0.92, -0.16, -0.3),
      hairAt(0.5, 0.5, 0.5, 0.34, 0.96, 0.02, -0.22),
      hairAt(0.44, 0.44, 0.44, 0.02, 1.0, -0.2, 0.2),
    ];

    if (this.wantsPack) this.buildBackpack(box);

    this.hatMount = new THREE.Group();
    this.hatMount.position.y = 5.42;
    this.root.add(this.hatMount);
    this.setHat(L.hat || 'none');
  }

  // The reference's schoolbag: a body, a flap and two shoulder straps, all
  // parented to the torso. Off by default — the island's shopkeepers are not
  // carrying one, and it is the player the sheet draws with it.
  buildBackpack(box) {
    const pack = box(1.32, 1.5, 0.6, bc('Sand blue'));
    pack.position.set(0, -0.05, -0.78);
    this.torso.add(pack);
    const flap = box(1.38, 0.42, 0.66, bc('Bright blue'));
    flap.position.set(0, 0.72, -0.79);
    this.torso.add(flap);
    // A pocket, so the bag has a front rather than being one blue block.
    const pocket = box(0.8, 0.55, 0.18, bc('Bright blue'));
    pocket.position.set(0, -0.32, -1.06);
    this.torso.add(pocket);
    [-0.42, 0.42].forEach((dx) => {
      const strap = box(0.17, 1.7, 0.16, bc('Dark stone grey'));
      strap.position.set(dx, 0.16, 0.5);
      this.torso.add(strap);
    });
    this.backpack = pack;
  }

  setHat(id) {
    this.look.hat = id;
    while (this.hatMount.children.length) this.hatMount.remove(this.hatMount.children[0]);
    if (id && id !== 'none') this.hatMount.add(buildHat(id));
  }

  setColours({ skin, shirt, pants }) {
    const setCol = (mesh, hex) => {
      if (!mesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.color.setHex(hex));
    };
    if (skin !== undefined) {
      this.look.skin = skin;
      setCol(this.head, skin);
      (this.hands || []).forEach((h) => setCol(h, skin));
      (this.cuffs || []).forEach((c) => setCol(c, skin));
    }
    if (shirt !== undefined) {
      this.look.shirt = shirt;
      setCol(this.torso, shirt);
      setCol(this.shoulders, shirt);
      (this.sleeves || []).forEach((s) => setCol(s, shirt));
    }
    if (pants !== undefined) {
      this.look.pants = pants;
      [this.legL, this.legR].forEach((p) => setCol(p.children[0], pants));
      setCol(this.hips, pants);
    }
  }

  setHair(colour) {
    if (colour === undefined) return;
    this.look.hair = colour;
    (this.hairParts || []).forEach((h) => h.material.forEach((m) => m.color.setHex(colour)));
  }

  setFace(mood) {
    this.faceMat.map = faceTexture(mood);
    this.faceMat.needsUpdate = true;
  }

  // --------------------------------------------------------------- nametag
  // Roblox floats your display name over your head with a health bar under it.
  buildNametag() {
    this.nametag = new THREE.Group();
    this.nametag.position.y = 7.1;
    this.root.add(this.nametag);

    const tex = canvasTexture(512, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.font = `800 62px ${UI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 10;
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.strokeText(this.name, w / 2, h / 2);
      g.fillStyle = '#ffffff';
      g.fillText(this.name, w / 2, h / 2);
    });
    const label = decalPlane(tex, 4.4, 1.1, { side: THREE.DoubleSide, depthWrite: false });
    label.material.depthTest = false;
    label.renderOrder = 20;
    this.nametag.add(label);

    if (!this.isNPC) {
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.22),
        new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.8, depthTest: false }),
      );
      back.position.y = -0.78;
      back.renderOrder = 20;
      this.nametag.add(back);

      this.healthBar = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.22),
        new THREE.MeshBasicMaterial({ color: 0x34b24a, depthTest: false }),
      );
      this.healthBar.position.set(0, -0.78, 0.01);
      this.healthBar.renderOrder = 21;
      this.nametag.add(this.healthBar);
    }
  }

  setHealth(frac) {
    if (!this.healthBar) return;
    const f = clamp(frac, 0, 1);
    this.healthBar.scale.x = Math.max(0.001, f);
    this.healthBar.position.x = -(3 * (1 - f)) / 2;
    this.healthBar.material.color.setHex(f > 0.5 ? 0x34b24a : f > 0.25 ? 0xf5b81d : 0xd43a2c);
  }

  // ------------------------------------------------------------- animation
  // R6 has three states worth animating and Roblox animates them with plain
  // sine waves, so that is what this does.
  animate(dt, speed, grounded, camera) {
    if (this.dead) return;

    if (!grounded) {
      // The Roblox jump pose: arms straight up, legs slightly apart.
      this.armL.rotation.x = lerp(this.armL.rotation.x, -2.7, 0.25);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -2.7, 0.25);
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.25, 0.2);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0.25, 0.2);
    } else if (speed > 0.6) {
      this.phase += dt * speed * 0.85;
      const swing = Math.sin(this.phase) * clamp(speed / 16, 0, 1) * 1.15;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing;
      this.armR.rotation.x = swing;
      // The little vertical bob of a Roblox run.
      this.torso.position.y = 3.05 + Math.abs(Math.sin(this.phase)) * 0.06;
    } else {
      this.phase = 0;
      ['armL', 'armR', 'legL', 'legR'].forEach((k) => {
        this[k].rotation.x = lerp(this[k].rotation.x, 0, 0.2);
      });
      this.torso.position.y = lerp(this.torso.position.y, 3.05, 0.2);
    }

    // The nametag hangs off the rig, and the rig turns. Copying the camera's
    // orientation straight into a child of a rotated parent leaves the label
    // mirrored, so undo the rig's rotation first: local = root⁻¹ · camera.
    if (this.nametag && camera) {
      this.nametag.quaternion.copy(this.root.quaternion).invert().multiply(camera.quaternion);
    }
  }

  // ------------------------------------------------------------- the death
  // Roblox does not ragdoll — it detaches the six parts and throws them. That
  // burst, and the "oof", is the single most recognisable thing in the game.
  explode(scene) {
    if (this.dead) return;
    this.dead = true;
    this.setFace('oof');

    const source = [this.head, this.torso, this.armL, this.armR, this.legL, this.legR, this.face];
    const world = new THREE.Vector3();
    this.pieces = [];

    source.forEach((obj) => {
      const mesh = obj.isGroup ? obj.children[0] : obj;
      if (!mesh) return;
      mesh.getWorldPosition(world);
      const clone = mesh.clone();
      clone.position.copy(world);
      clone.rotation.set(0, 0, 0);
      scene.add(clone);
      this.pieces.push({
        mesh: clone,
        vel: new THREE.Vector3((Math.random() - 0.5) * 24, 14 + Math.random() * 16, (Math.random() - 0.5) * 24),
        spin: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      });
    });

    this.hatMount.visible = false;
    this.root.visible = false;
  }

  updatePieces(dt, scene) {
    if (!this.pieces.length) return;
    for (const p of this.pieces) {
      p.vel.y -= 60 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
    }
    if (this.pieces[0].mesh.position.y < -60) this.clearPieces(scene);
  }

  clearPieces(scene) {
    this.pieces.forEach((p) => scene.remove(p.mesh));
    this.pieces = [];
  }

  respawn(scene) {
    this.clearPieces(scene);
    this.dead = false;
    this.setFace('smile');
    this.root.visible = true;
    this.hatMount.visible = true;
    ['armL', 'armR', 'legL', 'legR'].forEach((k) => { this[k].rotation.x = 0; });
  }
}
